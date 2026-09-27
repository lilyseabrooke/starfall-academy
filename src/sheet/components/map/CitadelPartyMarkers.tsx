"use client";

/* ===========================================================================
   Starfall Atlas — party-location markers for the Citadel tessellation view.
   Whereabouts inside the Citadel resolve to a nested path
   ("starfall-citadel/<district-slug>[/<zone-tag>]"); resolveCitadelPoint
   reprojects a zone's own label anchor into Citadel-shield space so a pin
   shows up at that zone's actual spot within its district, not just at the
   district's generic centre. Uses PartyMarkerCluster's default sizing (same
   as the world/campus view) rather than shrinking for this "middle" zoom
   level — markers should read the same size everywhere, not just once
   zoomed all the way out.
   =========================================================================== */
import * as React from "react";
import { computeCitadelCells, resolveCitadelPoint } from "../../data/map/hosts";
import type { Region } from "../../data/map/types";
import { PartyMarkerCluster } from "./PartyMarkerCluster";
import type { MapRosterMember } from "./MapPage";

export interface CitadelPartyMarkersProps {
  citadel: Region;
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function CitadelPartyMarkers({ citadel, roster, locations, selfId }: CitadelPartyMarkersProps) {
  const citadelCells = React.useMemo(() => computeCitadelCells(citadel), [citadel]);

  const byLoc = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc || !loc.startsWith("starfall-citadel/")) return;
      (map[loc] = map[loc] || []).push(mem);
    });
    return map;
  }, [roster, locations]);

  return (
    <g id="citadel-party-layer" className="party-layer">
      {Object.entries(byLoc).map(([loc, members]) => {
        const pt = resolveCitadelPoint(loc, citadel, citadelCells);
        if (!pt) return null;
        return <PartyMarkerCluster key={loc} x={pt[0]} y={pt[1]} members={members} selfId={selfId} />;
      })}
    </g>
  );
}
