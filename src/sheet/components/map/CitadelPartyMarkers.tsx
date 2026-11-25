"use client";

/* ===========================================================================
   Starfall Atlas — party-location markers for the centrepiece (Citadel)
   tessellation view. Whereabouts inside it resolve to a nested path
   ("<centrepiece id>/<district-slug>[/<zone-tag>]", e.g.
   "starfall-citadel/…"); resolveCitadelPoint reprojects a zone's own label
   anchor into the centrepiece's shield space so a pin
   shows up at that zone's actual spot within its district, not just at the
   district's generic centre. Uses PartyMarkerCluster's default sizing (same
   as the world/campus view) rather than shrinking for this "middle" zoom
   level — markers should read the same size everywhere, not just once
   zoomed all the way out.
   =========================================================================== */
import * as React from "react";
import { computeCitadelCells, resolveCitadelPoint } from "../../data/map/hosts";
import type { AtlasDefinition, Region } from "../../data/map/types";
import { PartyMarkerCluster } from "./PartyMarkerCluster";
import type { MapRosterMember } from "./MapPage";

export interface CitadelPartyMarkersProps {
  atlas: AtlasDefinition;
  citadel: Region;
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function CitadelPartyMarkers({ atlas, citadel, roster, locations, selfId }: CitadelPartyMarkersProps) {
  const citadelCells = React.useMemo(() => computeCitadelCells(citadel), [citadel]);

  const byLoc = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc || !loc.startsWith(citadel.id + "/")) return;
      (map[loc] = map[loc] || []).push(mem);
    });
    return map;
  }, [roster, locations, citadel.id]);

  return (
    <g id="citadel-party-layer" className="party-layer">
      {Object.entries(byLoc).map(([loc, members]) => {
        const pt = resolveCitadelPoint(loc, atlas, citadelCells);
        if (!pt) return null;
        return <PartyMarkerCluster key={loc} x={pt[0]} y={pt[1]} members={members} selfId={selfId} />;
      })}
    </g>
  );
}
