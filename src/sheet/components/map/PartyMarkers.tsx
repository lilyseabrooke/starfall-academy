"use client";

/* ===========================================================================
   Starfall Atlas — party-location marker overlay (typed port of party.js's
   buildCluster). Renders directly into the world-svg (the atlas's
   world-field user-space) so markers pan & zoom with the map. AtlasStage counter-scales
   every ".pm-scale" group on each pan/zoom tick so avatars stay a constant
   on-screen size — no postMessage bridge needed once this isn't an iframe.
   =========================================================================== */
import * as React from "react";
import { centrepieceRegion, computeCitadelCells, computeWorldCells, resolveWorldPoint } from "../../data/map/hosts";
import type { AtlasDefinition } from "../../data/map/types";
import { PartyMarkerCluster } from "./PartyMarkerCluster";
import type { MapRosterMember } from "./MapPage";

export interface PartyMarkersProps {
  atlas: AtlasDefinition;
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function PartyMarkers({ atlas, roster, locations, selfId }: PartyMarkersProps) {
  const { regions } = atlas;
  const worldCells = React.useMemo(() => computeWorldCells(atlas), [atlas]);
  const citadelCells = React.useMemo(() => {
    const citadel = centrepieceRegion(atlas);
    return citadel ? computeCitadelCells(citadel) : {};
  }, [atlas]);

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
        const [ax, ay] = resolveWorldPoint(loc, atlas, worldCells, citadelCells);
        return <PartyMarkerCluster key={loc} x={ax} y={ay} members={members} selfId={selfId} />;
      })}
    </g>
  );
}
