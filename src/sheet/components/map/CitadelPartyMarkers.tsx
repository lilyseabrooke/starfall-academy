"use client";

/* ===========================================================================
   Starfall Atlas — party-location markers for the Citadel tessellation view.
   Whereabouts inside the Citadel resolve to a nested path
   ("starfall-citadel/<district-slug>[/<zone-tag>]"); at this zoom level we
   only have room to show which DISTRICT someone's in, anchored at that
   district seed's own (x,y) — the same coordinate its label/tile use.
   =========================================================================== */
import * as React from "react";
import { seedSlug } from "../../data/map/citadelData";
import type { Region } from "../../data/map/types";
import type { MapRosterMember } from "./MapPage";

export interface CitadelPartyMarkersProps {
  citadel: Region;
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function CitadelPartyMarkers({ citadel, roster, locations, selfId }: CitadelPartyMarkersProps) {
  const seeds = citadel.submap.seeds || [];

  const byDistrict = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc || !loc.startsWith("starfall-citadel/")) return;
      const slug = loc.split("/")[1];
      if (!slug) return;
      (map[slug] = map[slug] || []).push(mem);
    });
    return map;
  }, [roster, locations]);

  return (
    <g id="citadel-party-layer" className="party-layer">
      {Object.entries(byDistrict).map(([slug, members]) => {
        const seed = seeds.find((s) => !s.special && seedSlug(s) === slug);
        if (!seed) return null;
        const D = 36;
        const n = members.length;
        const rowY = -32;
        return (
          <g key={slug} className="pm" transform={`translate(${seed.x},${seed.y})`}>
            <g className="pm-scale">
              <line className="pm-stem" x1={0} y1={0} x2={0} y2={rowY + 14} />
              <circle className="pm-dot" cx={0} cy={0} r={3.5} />
              {members.map((mem, i) => {
                const x = (i - (n - 1) / 2) * D;
                const isSelf = mem.id === selfId;
                return (
                  <g key={mem.id} className={"pm-av t-" + (mem.tone || "gold") + (isSelf ? " is-self" : "")} transform={`translate(${x},${rowY})`}>
                    <circle className="pm-ring" cx={0} cy={0} r={17} />
                    <circle className="pm-fill" cx={0} cy={0} r={14} />
                    <text className="pm-initials" x={0} y={1} textAnchor="middle" dominantBaseline="central" fontSize={12}>
                      {mem.initials || (mem.name || "?").slice(0, 1)}
                    </text>
                    <title>{mem.name + (isSelf ? " (you)" : "")}</title>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
    </g>
  );
}
