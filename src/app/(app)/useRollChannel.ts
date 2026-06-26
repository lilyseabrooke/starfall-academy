"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type FrameRef = { current: HTMLIFrameElement | null };

/**
 * Bridges a vendored prototype's local roll engine to a campaign-wide shared
 * log over Supabase Realtime. The host owns the channel; the iframe talks to it
 * through the roll messages added to host-bridge.js / gm-host-bridge.js:
 *
 *   iframe → host : sf-roll-ready                 roll engine mounted
 *   iframe → host : sf-roll        { roll }       a local roll to persist+share
 *   host → iframe : sf-roll-remote { roll }       backlog item / another player's
 *                                                 roll / this client's own echo
 *
 * Durability: rolls are written to the `rolls` table and streamed back via
 * postgres_changes; on `sf-roll-ready` the host replays recent history so
 * reloads and late joiners see the log. The iframe dedups by the roll's id, so
 * a client's own echo (and any backlog/live overlap) collapses to one entry.
 *
 * No-op when `campaignId` is null (solo character / legacy code-only group).
 */
export function useRollChannel(
  campaignId: string | null,
  frameRef: FrameRef,
  characterId: string | null
) {
  useEffect(() => {
    if (!campaignId) return;
    const supabase = createClient();
    let cancelled = false;
    let userId: string | null = null;

    function postToFrame(roll: unknown) {
      const win = frameRef.current?.contentWindow;
      if (win) win.postMessage({ type: "sf-roll-remote", roll }, window.location.origin);
    }

    async function ensureUserId() {
      if (userId) return userId;
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      return userId;
    }

    async function sendBacklog() {
      const { data } = await supabase
        .from("rolls")
        .select("payload")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled || !data) return;
      for (const row of data) postToFrame((row as { payload: unknown }).payload);
    }

    async function persistRoll(roll: unknown) {
      if (!roll || typeof roll !== "object") return;
      const actor = await ensureUserId();
      if (cancelled || !actor) return;
      const { error } = await supabase.from("rolls").insert({
        campaign_id: campaignId,
        actor_id: actor,
        character_id: characterId,
        payload: roll,
      });
      if (error) console.error("Shared roll insert failed", error.message);
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const frame = frameRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "sf-roll-ready") sendBacklog();
      else if (msg.type === "sf-roll") persistRoll(msg.roll);
    }
    window.addEventListener("message", onMessage);

    // Live inserts (including this client's own) → forward to the iframe, which
    // dedups by roll id.
    const channel = supabase
      .channel(`rolls:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rolls",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => postToFrame((payload.new as { payload: unknown }).payload)
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      supabase.removeChannel(channel);
    };
  }, [campaignId, frameRef, characterId]);
}
