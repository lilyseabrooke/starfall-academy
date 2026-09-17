"use client";

/* ===========================================================================
   Starfall Atlas — Citadel tessellation (typed port of app.js's
   drawTessellation, seeded/shield branch only — the plain cells+districts
   branch was dead code upstream, never reached for the 3 special locations).
   =========================================================================== */
import * as React from "react";
import { bbox, polylabel, shieldOutline, splitLabel, tilePath, voronoiCells } from "../../data/map/geom";
import type { DistrictSeed, Region } from "../../data/map/types";

export interface CitadelTessellationProps {
  citadel: Region;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
  onPick: (idx: number) => void;
}

export function CitadelTessellation({ citadel, hoveredIdx, onHover, onPick }: CitadelTessellationProps) {
  const sm = citadel.submap;
  const g0 = sm.shieldGeom!;
  const outline = React.useMemo(() => shieldOutline(g0.cx, g0.top, g0.hw, g0.h, sm.shieldOpts), [g0, sm.shieldOpts]);

  const districtSeeds: DistrictSeed[] = [];
  const districtIdx: number[] = [];
  const locations: { idx: number; d: DistrictSeed }[] = [];
  (sm.seeds || []).forEach((s, i) => {
    if (s.special) locations.push({ idx: i, d: s });
    else { districtSeeds.push(s); districtIdx.push(i); }
  });

  const cells = React.useMemo(
    () => voronoiCells(districtSeeds, outline),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outline, sm.seeds],
  );

  return (
    <>
      {districtIdx.map((idx, k) => {
        const cell = cells[k];
        const d = districtSeeds[k];
        if (!cell || cell.split(" ").length < 3) return null;
        d._cell = cell;
        const dp = tilePath(cell, 5, 11);
        const active = hoveredIdx === idx;
        return (
          <g
            key={idx}
            className={"subdistrict" + (active ? " is-active" : "")}
            data-idx={idx}
            style={d.color ? ({ "--cell": d.color } as React.CSSProperties) : undefined}
            tabIndex={0} role="button"
            onMouseEnter={() => onHover(idx)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPick(idx)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(idx); } }}
          >
            <path className="subdistrict__shape" d={dp} />
            <path className="subdistrict__sheen" d={dp} />
          </g>
        );
      })}
      <g className="subdistrict-labels">
        {districtIdx.map((idx, k) => {
          const cell = cells[k];
          const d = districtSeeds[k];
          if (!cell || cell.split(" ").length < 3) return null;
          const anchor = polylabel(cell);
          const cx = anchor[0] + (d.labelDx || 0), cy = anchor[1] + (d.labelDy || 0);
          const bb = bbox(cell);
          const dim = Math.min(bb.maxX - bb.minX, bb.maxY - bb.minY);
          const fs = Math.max(11, Math.min(20, dim * 0.155));
          const gap = fs * 1.12, showTag = dim > 82;
          const lines = splitLabel(d.name, false);
          const startY = cy - (lines.length - 1) * (gap / 2) - (showTag ? fs * 0.34 : 0);
          const active = hoveredIdx === idx;
          return (
            <g key={idx} className={"subdistrict__label" + (active ? " is-active" : "")} data-idx={idx}>
              {lines.map((ln, i) => (
                <text key={i} className="subdistrict__name" x={cx} y={startY + i * gap} fontSize={fs.toFixed(1)}>{ln}</text>
              ))}
              {showTag && (
                <text className="subdistrict__tag" x={cx} y={startY + (lines.length - 1) * gap + fs * 0.92} fontSize={Math.max(9, fs * 0.52).toFixed(1)}>{d.tag}</text>
              )}
            </g>
          );
        })}
      </g>
      {locations.map(({ idx, d }) => {
        const fs = 17;
        const lines = splitLabel(d.name, false);
        const longest = lines.reduce((m, s) => Math.max(m, s.length), 0);
        const w = Math.max(92, longest * fs * 0.64 + 28);
        const hgt = lines.length * fs * 1.2 + 20;
        const x = d.x - w / 2, y = d.y - hgt / 2;
        const topY = d.y - (lines.length - 1) * (fs * 0.6);
        const active = hoveredIdx === idx;
        return (
          <g key={idx} className={"location" + (active ? " is-active" : "")} data-idx={idx}
             tabIndex={0} role="button"
             onMouseEnter={() => onHover(idx)} onMouseLeave={() => onHover(null)}
             onClick={() => onPick(idx)}
             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(idx); } }}>
            <rect className="location__plate" x={x} y={y} width={w} height={hgt} rx={12} ry={12} />
            <rect className="location__sheen" x={x} y={y} width={w} height={hgt} rx={12} ry={12} />
            <g className="location__label">
              {lines.map((ln, k) => (
                <text key={k} className="location__name" x={d.x} y={topY + k * fs * 1.2} fontSize={fs} dominantBaseline="middle">{ln}</text>
              ))}
            </g>
          </g>
        );
      })}
    </>
  );
}
