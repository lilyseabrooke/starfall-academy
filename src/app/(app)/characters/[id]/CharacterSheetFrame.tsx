"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RosterMember } from "../roster";

type Props = {
  /** "edit" persists to an existing row; "create" persists on the Forge's Begin. */
  mode: "edit" | "create";
  id?: string | null;
  initialSheet?: unknown;
  roster?: RosterMember[];
  me?: string | null;
};

/**
 * Hosts the vendored character-sheet prototype (a standalone React 18 + Babel
 * bundle in /public/character-sheet) in an iframe and bridges it to the app
 * over postMessage:
 *
 *   iframe → host : sf-sheet-request                 on load
 *   host → iframe : sf-sheet-init { sheet, roster, me }
 *   host → iframe : sf-open-forge                    (create mode only)
 *   iframe → host : sf-committed                     Forge "Begin" fired
 *   iframe → host : sf-sheet-save { sheet }          debounced edits
 *   iframe → host : sf-switch-character { id }        party member picked
 *
 * Edit mode PATCHes saves to the existing row. Create mode waits for the Forge
 * to commit, then the first save POST-creates the row and navigates to it.
 */
export default function CharacterSheetFrame({
  mode,
  id,
  initialSheet,
  roster,
  me,
}: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);

  const idRef = useRef<string | null>(id ?? null);
  const sheetRef = useRef<unknown>(initialSheet ?? null);
  const committedRef = useRef(mode !== "create"); // edit mode is "armed" immediately
  const creatingRef = useRef(false);

  useEffect(() => {
    function sendInit() {
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        {
          type: "sf-sheet-init",
          sheet: sheetRef.current ?? null,
          roster: roster ?? null,
          me: me ?? null,
          // In create mode, the sheet opens straight into the Forge.
          openForge: mode === "create",
        },
        window.location.origin
      );
    }

    async function persist(sheet: unknown) {
      sheetRef.current = sheet;

      if (idRef.current) {
        try {
          const res = await fetch(`/api/characters/${idRef.current}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sheet }),
            keepalive: true,
          });
          if (!res.ok) {
            console.error("Character save failed", res.status, await res.text().catch(() => ""));
          }
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
          // Creation is the critical path — don't let it fail silently.
          alert("Couldn't save the new character. Please try again.\n\n" + detail);
        }
      } catch (err) {
        console.error("Character create request failed", err);
        creatingRef.current = false;
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;

      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      switch (msg.type) {
        case "sf-sheet-request":
          sendInit();
          break;
        case "sf-committed":
          committedRef.current = true;
          break;
        case "sf-sheet-save":
          persist(msg.sheet);
          break;
        case "sf-switch-character":
          if (typeof msg.id === "string" && msg.id) router.push(`/characters/${msg.id}`);
          break;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode, roster, me, router]);

  return (
    <iframe
      ref={frameRef}
      src="/character-sheet/index.html"
      title="Character sheet"
      onLoad={() => {
        const win = frameRef.current?.contentWindow;
        if (!win) return;
        win.postMessage(
          {
            type: "sf-sheet-init",
            sheet: sheetRef.current ?? null,
            roster: roster ?? null,
            me: me ?? null,
            openForge: mode === "create",
          },
          window.location.origin
        );
      }}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
