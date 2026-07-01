"use client";

/* ===========================================================================
   Starfall Academy — character persistence
   ---------------------------------------------------------------------------
   Replaces the host-bridge save() + CharacterSheetFrame.persist path. Debounced
   (600ms) PATCH of the serialized sheet to /api/characters/[id]; in create mode
   the first save after the Forge commits POST-creates the row and navigates to
   it. Emits the exact SerializedSheet shape — the durable contract — so existing
   rows and the API are unchanged.
   =========================================================================== */
import * as React from "react";
import { useRouter } from "next/navigation";
import type { SerializedSheet } from "../types";

export interface PersistenceOptions {
  /** "edit" persists to an existing row; "create" waits for the Forge to commit. */
  mode: "edit" | "create";
  id?: string | null;
  /** Debounce window in ms (matches the prototype's 600ms). */
  debounceMs?: number;
}

export interface Persistence {
  /** Debounced persist of a serialized sheet snapshot. */
  save: (sheet: SerializedSheet) => void;
  /** Tell create-mode the Forge committed, so the next save creates the row. */
  notifyCommitted: () => void;
}

export function useCharacterPersistence({ mode, id, debounceMs = 600 }: PersistenceOptions): Persistence {
  const router = useRouter();
  const idRef = React.useRef<string | null>(id ?? null);
  const committedRef = React.useRef(mode !== "create"); // edit mode is armed immediately
  const creatingRef = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    idRef.current = id ?? null;
  }, [id]);

  const persist = React.useCallback(
    async (sheet: SerializedSheet) => {
      if (idRef.current) {
        try {
          const res = await fetch(`/api/characters/${idRef.current}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sheet }),
            keepalive: true,
          });
          if (!res.ok) console.error("Character save failed", res.status, await res.text().catch(() => ""));
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
