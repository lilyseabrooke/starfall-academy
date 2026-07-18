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

  React.useEffect(() => {
    idRef.current = id ?? null;
  }, [id]);
  React.useEffect(() => { onConflictRef.current = onConflict; }, [onConflict]);
  React.useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

  const persistRef = React.useRef<(sheet: SerializedSheet) => Promise<void>>(async () => {});

  const persist = React.useCallback(
    async (sheet: SerializedSheet) => {
      if (idRef.current) {
        const patch = diffSheet(sheet, baselineRef.current);
        if (Object.keys(patch).length === 0) return; // nothing changed since last sync

        try {
          const supabase = createClient();
          const { data, error } = await supabase.rpc("patch_character_sheet", {
            p_character: idRef.current,
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
            const { data: current, error: fetchError } = await supabase
              .from("characters")
              .select("sheet, updated_at")
              .eq("id", idRef.current)
              .single();
            if (fetchError || !current) return;
            baselineRef.current = current.sheet as SerializedSheet;
            updatedAtRef.current = current.updated_at;
            onConflictRef.current?.(current.sheet as SerializedSheet, (retrySheet) => void persistRef.current(retrySheet));
            return;
          }
          baselineRef.current = sheet;
          updatedAtRef.current = row.updated_at;
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
  React.useEffect(() => { persistRef.current = persist; }, [persist]);

  const save = React.useCallback(
    (sheet: SerializedSheet) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(sheet), debounceMs);
    },
    [persist, debounceMs]
  );

  const notifyCommitted = React.useCallback(() => {
    committedRef.current = true;
  }, []);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return { save, notifyCommitted };
}
