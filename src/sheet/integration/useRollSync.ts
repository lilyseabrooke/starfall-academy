"use client";

/* ===========================================================================
   Starfall Academy — shared roll sync (native)
   ---------------------------------------------------------------------------
   Replaces the iframe useRollChannel: instead of postMessaging an iframe, this
   wires the campaign's shared roll log directly to useRollState. Same Supabase
   Realtime contract as before — durable rolls via the `rolls` table +
   postgres_changes, transient GM prompts via broadcast.

     · onRemoteRoll(roll)  ← backlog replay + live INSERTs (incl. own echo;
                              useRollState dedups by id)
     · shareRoll(roll)     → persist a local roll (its echo returns via INSERT)
     · onPrompt(prompt)    ← a GM roll prompt (only the target sheet acts on it)
     · requestRoll(prompt) → broadcast a GM prompt to the party

   No-op when campaignId is null (solo character / legacy code-only group).
   =========================================================================== */
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Roll } from "../types";

export interface RollSyncOptions {
  campaignId: string | null;
  characterId: string | null;
  /** Inject a roll from the party into the local log (deduped by id upstream). */
  onRemoteRoll: (roll: Roll) => void;
  /** Deliver a GM roll prompt; the sheet decides if it is the target. */
  onPrompt?: (prompt: unknown) => void;
}

export interface RollSync {
  /** Persist + share a locally-made roll. No-op when not in a campaign. */
  shareRoll: (roll: Roll) => void;
  /** Broadcast a GM roll prompt to the party. No-op when not in a campaign. */
  requestRoll: (prompt: unknown) => void;
}

export function useRollSync({ campaignId, characterId, onRemoteRoll, onPrompt }: RollSyncOptions): RollSync {
  // Stable refs so the effect doesn't resubscribe when callbacks change.
  const onRemoteRef = React.useRef(onRemoteRoll);
  const onPromptRef = React.useRef(onPrompt);
  React.useEffect(() => {
    onRemoteRef.current = onRemoteRoll;
  }, [onRemoteRoll]);
  React.useEffect(() => {
    onPromptRef.current = onPrompt;
  }, [onPrompt]);

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const persistRef = React.useRef<(roll: Roll) => void>(() => {});

  React.useEffect(() => {
    channelRef.current = null;
    if (!campaignId) return;
    const supabase = createClient();
    let cancelled = false;
    let userId: string | null = null;

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
      for (const row of data) onRemoteRef.current?.((row as { payload: Roll }).payload);
    }

    persistRef.current = async (roll: Roll) => {
      if (!roll || typeof roll !== "object") return;
      channelRef.current?.send({ type: "broadcast", event: "roll", payload: roll });
      const actor = await ensureUserId();
      if (cancelled || !actor) return;
      const { error } = await supabase.from("rolls").insert({
        campaign_id: campaignId,
        actor_id: actor,
        character_id: characterId,
        payload: roll,
      });
      if (error) console.error("Shared roll insert failed", error.message);
    };

    const channel = supabase
      .channel(`rolls:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rolls", filter: `campaign_id=eq.${campaignId}` },
        (payload) => onRemoteRef.current?.((payload.new as { payload: Roll }).payload)
      )
      .on("broadcast", { event: "roll" }, ({ payload }) => onRemoteRef.current?.(payload as Roll))
      .on("broadcast", { event: "prompt" }, ({ payload }) => onPromptRef.current?.(payload))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") sendBacklog();
      });
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      persistRef.current = () => {};
      supabase.removeChannel(channel);
    };
  }, [campaignId, characterId]);

  const shareRoll = React.useCallback((roll: Roll) => {
    persistRef.current(roll);
  }, []);

  const requestRoll = React.useCallback((prompt: unknown) => {
    channelRef.current?.send({ type: "broadcast", event: "prompt", payload: prompt });
  }, []);

  return { shareRoll, requestRoll };
}
