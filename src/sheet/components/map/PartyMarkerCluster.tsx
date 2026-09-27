"use client";

/* ===========================================================================
   Starfall Atlas — one cluster of party-location avatars at a single point.
   Shared by PartyMarkers (world view), CitadelPartyMarkers (Citadel view),
   and DistrictField's own zone-level markers — same visual language at
   whatever scale the view calls for.
   =========================================================================== */
import * as React from "react";
import type { MapRosterMember } from "./MapPage";

export interface PartyMarkerClusterProps {
  x: number;
  y: number;
  members: MapRosterMember[];
  selfId: string;
  /** Horizontal pitch between avatars. */
  spacing?: number;
  /** How far above the anchor dot the avatar row floats. */
  rowY?: number;
  ringR?: number;
  fillR?: number;
  fontSize?: number;
}

export function PartyMarkerCluster({
  x, y, members, selfId, spacing = 44, rowY = -40, ringR = 20, fillR = 17, fontSize,
}: PartyMarkerClusterProps) {
  const n = members.length;
  return (
    <g className="pm" transform={`translate(${x},${y})`}>
      <g className="pm-scale">
        <line className="pm-stem" x1={0} y1={0} x2={0} y2={rowY + 16} />
        <circle className="pm-dot" cx={0} cy={0} r={4} />
        {members.map((mem, i) => {
          const dx = (i - (n - 1) / 2) * spacing;
          const isSelf = mem.id === selfId;
          return (
            <g key={mem.id} className={"pm-av t-" + (mem.tone || "gold") + (isSelf ? " is-self" : "")} transform={`translate(${dx},${rowY})`}>
              <circle className="pm-ring" cx={0} cy={0} r={ringR} />
              <circle className="pm-fill" cx={0} cy={0} r={fillR} />
              <text className="pm-initials" x={0} y={1} textAnchor="middle" dominantBaseline="central" fontSize={fontSize}>
                {mem.initials || (mem.name || "?").slice(0, 1)}
              </text>
              <title>{mem.name + (isSelf ? " (you)" : "")}</title>
            </g>
          );
        })}
      </g>
    </g>
  );
}
