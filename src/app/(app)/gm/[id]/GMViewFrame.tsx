"use client";

import { useEffect, useRef, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";

type Campaign = { id: string; name: string | null; code: string | null };

/**
 * Hosts the vendored GM dashboard prototype (a standalone React 18 + Babel
 * bundle in /public/character-sheet/gm.html) in an iframe and seeds it with the
 * campaign identity over postMessage:
 *
 *   iframe → host : sf-gm-request                 on load
 *   host → iframe : sf-gm-init { data: { campaign } }
 *
 * The GM tools themselves still run on seed data (party / NPCs / notes); only
 * the campaign name/code is wired through today. Real campaign-backed data lands
 * with the multiplayer + GM data milestone (see design/INTEGRATION.md).
 */
export default function GMViewFrame({ campaign }: { campaign: Campaign }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sendInit() {
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        {
          type: "sf-gm-init",
          data: { campaign: { id: campaign.id, name: campaign.name, code: campaign.code } },
        },
        window.location.origin
      );
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "sf-gm-request") {
        sendInit();
        // The app has mounted and is requesting data — safe to reveal it.
        setReady(true);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [campaign]);

  // Safety net: never trap the user behind the loading screen.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <>
      <iframe
        ref={frameRef}
        src="/character-sheet/gm.html"
        title="GM tools"
        onLoad={() => {
          const win = frameRef.current?.contentWindow;
          if (!win) return;
          win.postMessage(
            {
              type: "sf-gm-init",
              data: { campaign: { id: campaign.id, name: campaign.name, code: campaign.code } },
            },
            window.location.origin
          );
        }}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
      <LoadingScreen overlay done={ready} />
    </>
  );
}
