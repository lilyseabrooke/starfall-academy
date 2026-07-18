"use client";

/* ===========================================================================
   Starfall Academy — character persistence
   ---------------------------------------------------------------------------
   Replaces the host-bridge save() + CharacterSheetFrame.persist path. Debounced
   (600ms) diff-patch of the serialized sheet, applied directly against
   Supabase (patch_character_sheet RPC) rather than through a Next.js API
   route — full sheets are large (every spell's full text, all inventory),
   and round-tripping that through the Vercel origin on every edit is billed
   as Fast Origin Transfer. Only the top-level sheet keys that changed since
   the last known-good snapshot are sent, and the RPC shallow-merges them in.
   In create mode the first save after the Forge commits still POSTs through
   /api/characters (there's no row to diff against yet), and navigates to it.

   Requests are serialized: at most one save is ever in flight, and any save
   requested while one is already running is coalesced into a single trailing
   run with the latest sheet once it finishes (rather than firing a second,
   overlapping request). This closes a livelock that shipped with the
   original PATCH-based version and carried over here unnoticed: a 409
   conflict's retry fired immediately with no in-flight guard, so an
   overlapping save (started before the previous one's response landed —
   routine under real network latency, since round-trips regularly exceed
   the 600ms debounce during active play) would itself conflict, retry
   immediately, conflict again, and so on for as long as the tab stayed
   open. Production logs showed two characters stuck in exactly this: 9,231
   and 4,695 requests in 7 days, ~99.9% of them HTTP 409, the overwhelming
   majority in the final 24h alone — a live, ongoing bug, not a one-off race.
   Serializing requests removes the overlap that starts the loop; capping
   consecutive conflict retries (CONFLICT_RETRY_LIMIT) is the backstop for
   the case that isn't self-inflicted — two tabs/devices genuinely racing
   each other — so a real, unresolvable disagreement stops instead of
   spinning forever.

   Every save attempt also logs a row to character_save_events (saved /
   conflict / gave_up) — durable, queryable telemetry for the autosave path
   specifically, since that's where the livelock lived and Vercel's runtime
   logs alone only showed *that* something was hammering a route, not *why*.
   =========================================================================== */
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SerializedSheet } from "../types";

export interface PersistenceOptions {
  /** "edit" persists to an existing row; "create" waits for the Forge to commit. */
  mode: "edit" | "create";
  id?: string | null;
  /** Debounce window in ms (matches the prototype's 600ms). */
  debounceMs?: number;
  /** The sheet as server-rendered on load — the diff baseline for the first save. */
  initialSheet?: SerializedSheet | null;
  /** The row's updated_at as of the last known-good sheet (server-rendered on load). */
  initialUpdatedAt?: string | null;
  /**
   * The row changed since we last synced (a GM grant, or another tab/device
   * saved) — our patch was rejected rather than clobbering it. `retry` sends
   * a fresh sheet once the caller has reconciled its local state against
   * `serverSheet`.
   */
  onConflict?: (serverSheet: SerializedSheet, retry: (sheet: SerializedSheet) => void) => void;
  /** A sheet we sent was accepted and is now the server's state of record. */
  onSaved?: (sheet: SerializedSheet) => void;
}

export interface Persistence {
  /** Debounced persist of a serialized sheet snapshot. */
  save: (sheet: SerializedSheet) => void;
  /** Tell create-mode the Forge committed, so the next save creates the row. */
  notifyCommitted: () => void;
}

// Top-level SerializedSheet keys, diffed shallowly against the last synced
// snapshot: unchanged keys are omitted from the patch entirely rather than
// re-sent. `magic` (spells/moves/bonuses) and `inventory` (its eight arrays)
// are each diffed as one unit — coarser than a full recursive diff, but it
// keeps the patch a plain shallow-mergeable object (`sheet || patch` in SQL)
// and already skips the common case: an HP/AP/condition tweak touches only
// `c`/`conditions`, not the far larger magic/inventory blobs.
const SHEET_KEYS = [
  "c", "conditions", "stats", "schools", "classes", "magic", "inventory", "locations",
] as const;

function diffSheet(next: SerializedSheet, base: SerializedSheet | null): Partial<SerializedSheet> {
  const patch: Partial<SerializedSheet> = {};
  for (const key of SHEET_KEYS) {
    if (!base || JSON.stringify(next[key]) !== JSON.stringify(base[key])) {
      (patch as Record<string, unknown>)[key] = next[key];
    }
  }
  return patch;
}

// After this many consecutive conflicts with no intervening success, stop
// auto-retrying and wait for the next real edit (or reload) instead of
// spinning forever against a writer we can't converge with.
const CONFLICT_RETRY_LIMIT = 3;

// Fire-and-forget telemetry: a durable, queryable record of what the
// autosave path actually did (saved / conflict / gave_up), so a post-session
// query can answer what happened without hand-sampling Vercel runtime logs.
// Never awaited by the caller and never lets a logging failure affect the
// save itself.
function logSaveEvent(
  supabase: ReturnType<typeof createClient>,
  characterId: string,
  event: "saved" | "conflict" | "gave_up",
  extra?: { patchBytes?: number; conflictStreak?: number }
) {
  void supabase
    .from("character_save_events")
    .insert({
      character_id: characterId,
      event,
      patch_bytes: extra?.patchBytes ?? null,
      conflict_streak: extra?.conflictStreak ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("Save-event logging failed", error.message);
    });
}

export function useCharacterPersistence({
  mode, id, debounceMs = 600, initialSheet, initialUpdatedAt, onConflict, onSaved,
}: PersistenceOptions): Persistence {
  const router = useRouter();
  const idRef = React.useRef<string | null>(id ?? null);
  const committedRef = React.useRef(mode !== "create"); // edit mode is armed immediately
  const creatingRef = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const updatedAtRef = React.useRef<string | null>(initialUpdatedAt ?? null);
  // Last sheet we know the server has (server-rendered, or confirmed by a
  // save/conflict since) — the diff baseline. Kept in lockstep with
  // CharacterSheet's own syncedSheetRef via the same onSaved/onConflict calls.
  const baselineRef = React.useRef<SerializedSheet | null>(initialSheet ?? null);
  const onConflictRef = React.useRef(onConflict);
  const onSavedRef = React.useRef(onSaved);

  // Request serialization: at most one save in flight; a save requested
  // mid-flight is coalesced into a single trailing run with the latest sheet.
  const inFlightRef = React.useRef(false);
  const pendingRef = React.useRef<SerializedSheet | null>(null);
  const conflictStreakRef = React.useRef(0);

  React.useEffect(() => {
    idRef.current = id ?? null;
  }, [id]);
  React.useEffect(() => { onConflictRef.current = onConflict; }, [onConflict]);
  React.useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

  const runRef = React.useRef<(sheet: SerializedSheet) => void>(() => {});

  const sendPersist = React.useCallback(
    async (sheet: SerializedSheet) => {
      if (idRef.current) {
        const patch = diffSheet(sheet, baselineRef.current);
        if (Object.keys(patch).length === 0) return; // nothing changed since last sync

        const supabase = createClient();
        const characterId = idRef.current;
        try {
          const { data, error } = await supabase.rpc("patch_character_sheet", {
            p_character: characterId,
            p_patch: patch,
            p_expected_updated_at: updatedAtRef.current,
          });
          if (error) {
            console.error("Character save failed", error.message);
            return;
          }
          const row = Array.isArray(data) ? data[0] : data;
          if (!row) {
            // Optimistic-concurrency miss: the row moved on since we last
            // synced. Fetch the current sheet so the caller can reconcile.
            conflictStreakRef.current += 1;
            logSaveEvent(supabase, characterId, "conflict", { conflictStreak: conflictStreakRef.current });
            const { data: current, error: fetchError } = await supabase
              .from("characters")
              .select("sheet, updated_at")
              .eq("id", characterId)
              .single();
            if (fetchError || !current) return;
            baselineRef.current = current.sheet as SerializedSheet;
            updatedAtRef.current = current.updated_at;
            if (conflictStreakRef.current > CONFLICT_RETRY_LIMIT) {
              console.error("Character save: too many conflicts in a row, giving up until the next edit");
              logSaveEvent(supabase, characterId, "gave_up", { conflictStreak: conflictStreakRef.current });
              onConflictRef.current?.(current.sheet as SerializedSheet, () => {});
              return;
            }
            onConflictRef.current?.(current.sheet as SerializedSheet, (retrySheet) => runRef.current(retrySheet));
            return;
          }
          conflictStreakRef.current = 0;
          baselineRef.current = sheet;
          updatedAtRef.current = row.updated_at;
          logSaveEvent(supabase, characterId, "saved", { patchBytes: JSON.stringify(patch).length });
          onSavedRef.current?.(sheet);
        } catch (err) {
          console.error("Character save request failed", err);
        }
        return;
      }

      // Create mode: only persist once the Forge has committed.
      if (!committedRef.current || creatingRef.current) return;
      creatingRef.current = true;
      try {
        const res = await fetch(`/api/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheet }),
        });
        if (res.ok) {
          const { id: newId } = await res.json();
          idRef.current = newId;
          baselineRef.current = sheet;
          router.replace(`/characters/${newId}`);
        } else {
          const detail = await res.text().catch(() => "");
          console.error("Character create failed", res.status, detail);
          creatingRef.current = false;
          alert("Couldn't save the new character. Please try again.\n\n" + detail);
        }
      } catch (err) {
        console.error("Character create request failed", err);
        creatingRef.current = false;
      }
    },
    [router]
  );

  // Runs a save if none is in flight; otherwise coalesces it as the one
  // trailing save to run once the current one finishes.
  const run = React.useCallback(
    (sheet: SerializedSheet) => {
      if (inFlightRef.current) {
        pendingRef.current = sheet;
        return;
      }
      inFlightRef.current = true;
      void sendPersist(sheet).finally(() => {
        inFlightRef.current = false;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) runRef.current(next);
      });
    },
    [sendPersist]
  );
  React.useEffect(() => { runRef.current = run; }, [run]);

  const save = React.useCallback(
    (sheet: SerializedSheet) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => run(sheet), debounceMs);
    },
    [run, debounceMs]
  );

  const notifyCommitted = React.useCallback(() => {
    committedRef.current = true;
  }, []);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return { save, notifyCommitted };
}
