"use client";

import { useEffect, useRef } from "react";

type Props = {
  id: string;
  initialSheet: unknown;
};

/**
 * Mounts the vendored character-sheet prototype (a standalone React 18 + Babel
 * bundle in /public/character-sheet) inside an iframe, and bridges persistence
 * over postMessage:
 *
 *   iframe → host : { type: "sf-sheet-request" }      (on load)
 *   host → iframe : { type: "sf-sheet-init", sheet }  (seed from the DB)
 *   iframe → host : { type: "sf-sheet-save", sheet }  (debounced edits)
 *
 * The iframe sandboxes the prototype's React 18 / Babel runtime away from the
 * app's React 19. Saves are persisted to characters.sheet via the API route.
 */
export default function CharacterSheetFrame({ id, initialSheet }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Latest known sheet — seeded from the DB, updated on each save.
  const sheetRef = useRef<unknown>(initialSheet ?? null);

  useEffect(() => {
    function sendInit() {
      frameRef.current?.contentWindow?.postMessage(
        { type: "sf-sheet-init", sheet: sheetRef.current ?? null },
        window.location.origin
      );
    }

    function onMessage(e: MessageEvent) {
      // Only trust messages from our own iframe document.
      if (e.origin !== window.location.origin) return;
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;

      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "sf-sheet-request") {
        sendInit();
      } else if (msg.type === "sf-sheet-save") {
        sheetRef.current = msg.sheet;
        // Fire-and-forget; the bridge already debounces.
        fetch(`/api/characters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheet: msg.sheet }),
          keepalive: true,
        }).catch(() => {});
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

  return (
    <iframe
      ref={frameRef}
      src="/character-sheet/index.html"
      title="Character sheet"
      // Also push the seed on load, in case our request handler missed the
      // iframe's initial request (covers either ordering of the handshake).
      onLoad={() =>
        frameRef.current?.contentWindow?.postMessage(
          { type: "sf-sheet-init", sheet: sheetRef.current ?? null },
          window.location.origin
        )
      }
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
      }}
    />
  );
}
