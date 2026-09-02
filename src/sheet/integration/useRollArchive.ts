"use client";

/* ===========================================================================
   Starfall Academy — full roll archive
   ---------------------------------------------------------------------------
   The live dock log only ever holds what useRollSync replayed on join (the most
   recent 200 rolls) plus everything rolled since. This hook backs the Full Log
   view: it pages *backwards* through the campaign's whole `rolls` table, older
   than what is already in memory, so a party can read its entire history.

     · rolls      — live log ∪ fetched pages, deduped by roll id, newest first
     · loadMore() — fetch the next older page (keyset on created_at)
     · total      — exact row count for the campaign (null until known)

   Solo characters have no campaign row to page through, so the hook simply
   mirrors the in-memory log and reports nothing more to load.

   Every piece of fetched state carries the campaign it belongs to, so a change
   of campaign reads as an empty archive on the very next render — no reset
   effect, and no page from the old campaign can land in the new one.
   =========================================================================== */
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { Roll } from "../types";

export interface RollArchiveOptions {
  campaignId: string | null;
  /** The in-memory log (newest first) — the archive's most recent slice. */
  live: Roll[];
  /** Only fetch while the archive is on screen. */
  active: boolean;
  /** Rows per page. */
  pageSize?: number;
}

export interface RollArchive {
  rolls: Roll[];
  loading: boolean;
  /** True once a page came back short — the whole history is in hand. */
  exhausted: boolean;
  hasMore: boolean;
  /** Exact roll count for the campaign, or null while unknown / solo. */
  total: number | null;
  error: string | null;
  loadMore: () => void;
  retry: () => void;
}

interface FetchRow {
  created_at: string;
  payload: Roll;
}

interface ArchiveState {
  campaign: string | null;
  fetched: Roll[];
  loading: boolean;
  exhausted: boolean;
  total: number | null;
  error: string | null;
}

const emptyState = (campaign: string | null): ArchiveState => ({
  campaign,
  fetched: [],
  loading: false,
  exhausted: false,
  total: null,
  error: null,
});

export function useRollArchive({ campaignId, live, active, pageSize = 100 }: RollArchiveOptions): RollArchive {
  const [raw, setRaw] = React.useState<ArchiveState>(() => emptyState(campaignId));
  // Anything held for a different campaign is stale the moment the prop changes.
  const state = raw.campaign === campaignId ? raw : emptyState(campaignId);

  // Keyset cursor: the created_at of the oldest row fetched for this campaign.
  const cursorRef = React.useRef<{ campaign: string | null; value: string | null }>({ campaign: campaignId, value: null });
  const inFlight = React.useRef(false);
  const seededFor = React.useRef<string | null>(null);

  const liveRef = React.useRef(live);
  React.useEffect(() => {
    liveRef.current = live;
  }, [live]);

  /** Apply an update only if the campaign it was computed for is still current. */
  const patch = React.useCallback((campaign: string | null, fn: (p: ArchiveState) => ArchiveState) => {
    setRaw((prev) => {
      const base = prev.campaign === campaign ? prev : emptyState(campaign);
      return fn(base);
    });
  }, []);

  const fetchPage = React.useCallback(async () => {
    if (!campaignId || inFlight.current) return;
    inFlight.current = true;
    patch(campaignId, (p) => ({ ...p, loading: true, error: null }));
    try {
      if (cursorRef.current.campaign !== campaignId) cursorRef.current = { campaign: campaignId, value: null };
      // The first page starts just older than the oldest roll already in the
      // live log, so the two never overlap by more than a row or two.
      if (cursorRef.current.value == null) {
        const oldestLive = liveRef.current[liveRef.current.length - 1];
        cursorRef.current = {
          campaign: campaignId,
          value: new Date(oldestLive ? oldestLive.ts : Date.now()).toISOString(),
        };
      }
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("rolls")
        .select("created_at,payload")
        .eq("campaign_id", campaignId)
        .lt("created_at", cursorRef.current.value)
        .order("created_at", { ascending: false })
        .limit(pageSize);
      if (err) throw new Error(err.message);
      const rows = (data ?? []) as FetchRow[];
      if (rows.length) cursorRef.current = { campaign: campaignId, value: rows[rows.length - 1].created_at };
      patch(campaignId, (p) => {
        const seen = new Set(p.fetched.map((r) => r.id));
        const add = rows.map((r) => r.payload).filter((r) => r && r.id && !seen.has(r.id));
        return {
          ...p,
          loading: false,
          exhausted: p.exhausted || rows.length < pageSize,
          fetched: add.length ? p.fetched.concat(add) : p.fetched,
        };
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "The archive could not be read.";
      patch(campaignId, (p) => ({ ...p, loading: false, error: message }));
    } finally {
      inFlight.current = false;
    }
  }, [campaignId, pageSize, patch]);

  // First activation for a campaign: count its rolls and pull one page of history.
  React.useEffect(() => {
    if (!active || !campaignId || seededFor.current === campaignId) return;
    seededFor.current = campaignId;
    let cancelled = false;
    createClient()
      .from("rolls")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .then(({ count }) => {
        if (!cancelled && typeof count === "number") patch(campaignId, (p) => ({ ...p, total: count }));
      });
    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [active, campaignId, fetchPage, patch]);

  const rolls = React.useMemo(() => {
    const seen = new Set<string>();
    const out: Roll[] = [];
    for (const r of live.concat(state.fetched)) {
      if (!r || !r.id || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    out.sort((a, b) => b.ts - a.ts);
    return out;
  }, [live, state.fetched]);

  return {
    rolls,
    loading: state.loading,
    exhausted: state.exhausted,
    hasMore: !!campaignId && !state.exhausted,
    total: state.total,
    error: state.error,
    loadMore: fetchPage,
    retry: fetchPage,
  };
}
