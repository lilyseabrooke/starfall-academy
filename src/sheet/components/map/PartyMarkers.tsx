"use client";

/* ===========================================================================
   Starfall Atlas — party-location marker overlay (typed port of party.js's
   buildCluster). Renders directly into the world-svg (campus user-space,
   1600×1200) so markers pan & zoom with the map. AtlasStage counter-scales
   every ".pm-scale" group on each pan/zoom tick so avatars stay a constant
   on-screen size — no postMessage bridge needed once this isn't an iframe.
   =========================================================================== */
import * as React from "react";
import { computeCampusCells, computeCitadelCells, resolveWorldPoint } from "../../data/map/hosts";
import type { Region } from "../../data/map/types";
import { PartyMarkerCluster } from "./PartyMarkerCluster";
import type { MapRosterMember } from "./MapPage";

export interface PartyMarkersProps {
  regions: Region[];
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function PartyMarkers({ regions, roster, locations, selfId }: PartyMarkersProps) {
  const citadel = React.useMemo(() => regions.find((r) => r.isCitadel)!, [regions]);
  const campusCells = React.useMemo(() => computeCampusCells(), []);
  const citadelCells = React.useMemo(() => computeCitadelCells(citadel), [citadel]);

  // Group by the exact location string (not just the top-level region) so
  // people in different districts/zones of the same region don't collapse
  // onto one shared point.
  const byLoc = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc) return;
      const topId = loc.split("/")[0];
      if (!regions.find((r) => r.id === topId)) return;
      (map[loc] = map[loc] || []).push(mem);
    });
    return map;
  }, [roster, locations, regions]);

  return (
    <g id="party-layer" className="party-layer">
      {Object.entries(byLoc).map(([loc, members]) => {
        const [ax, ay] = resolveWorldPoint(loc, regions, campusCells, citadel, citadelCells);
        return <PartyMarkerCluster key={loc} x={ax} y={ay} members={members} selfId={selfId} />;
      })}
    </g>
  );
}
