"use client";

/* ===========================================================================
   Starfall Atlas — party-location marker overlay (typed port of party.js's
   buildCluster). Renders directly into the world-svg (campus user-space,
   1600×1200) so markers pan & zoom with the map. AtlasStage counter-scales
   every ".pm-scale" group on each pan/zoom tick so avatars stay a constant
   on-screen size — no postMessage bridge needed once this isn't an iframe.
   =========================================================================== */
import * as React from "react";
import type { Region } from "../../data/map/types";
import type { MapRosterMember } from "./MapPage";

export interface PartyMarkersProps {
  regions: Region[];
  roster: MapRosterMember[];
  locations: Record<string, string | null | undefined>;
  selfId: string;
}

export function PartyMarkers({ regions, roster, locations, selfId }: PartyMarkersProps) {
  const byRegion = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc || !regions.find((r) => r.id === loc)) return;
      (map[loc] = map[loc] || []).push(mem);
    });
    return map;
  }, [roster, locations, regions]);

  return (
    <g id="party-layer" className="party-layer">
      {Object.entries(byRegion).map(([regionId, members]) => {
        const region = regions.find((r) => r.id === regionId);
        const [ax, ay] = region && Array.isArray(region.label) ? region.label : [800, 600];
        const D = 44;
        const n = members.length;
        const rowY = -40;
        return (
          <g key={regionId} className="pm" transform={`translate(${ax},${ay})`}>
            <g className="pm-scale">
              <line className="pm-stem" x1={0} y1={0} x2={0} y2={rowY + 16} />
              <circle className="pm-dot" cx={0} cy={0} r={4} />
              {members.map((mem, i) => {
                const x = (i - (n - 1) / 2) * D;
                const isSelf = mem.id === selfId;
                return (
                  <g key={mem.id} className={"pm-av t-" + (mem.tone || "gold") + (isSelf ? " is-self" : "")} transform={`translate(${x},${rowY})`}>
                    <circle className="pm-ring" cx={0} cy={0} r={20} />
                    <circle className="pm-fill" cx={0} cy={0} r={17} />
                    <text className="pm-initials" x={0} y={1} textAnchor="middle" dominantBaseline="central">
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
