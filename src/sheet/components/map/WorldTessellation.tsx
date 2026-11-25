"use client";

/* ===========================================================================
   Starfall Atlas — world tessellation (typed port of app.js's renderWorld).
   The atlas's outer regions as a clipped Voronoi tessellation, its
   centrepiece (the campus's Citadel) riding on top as a heater-shield, and
   gilded POI plaques (the campus's five Houses).
   =========================================================================== */
import * as React from "react";
import { bbox, polylabel, shieldPath, smoothClosed, splitLabel, tilePath, toPts, voronoiCells } from "../../data/map/geom";
import { centrepieceRegion, pickIdForZoneLink } from "../../data/map/hosts";
import type { AtlasDefinition } from "../../data/map/types";

export interface WorldTessellationProps {
  atlas: AtlasDefinition;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onEnterRegion: (id: string) => void;
  onEnterCitadel: () => void;
  onJumpToZone: (regionId: string, zoneName: string) => void;
  onJumpToCitadelZone: (districtSlug: string, zoneName: string) => void;
  picking: boolean;
  onPick: (id: string) => void;
}

export function WorldTessellation({
  atlas, hoveredId, onHover, onEnterRegion, onEnterCitadel, onJumpToZone, onJumpToCitadelZone, picking, onPick,
}: WorldTessellationProps) {
  const { regions } = atlas;
  const outline = React.useMemo(() => smoothClosed(toPts(atlas.outline)), [atlas.outline]);
  const cells = React.useMemo(
    () => voronoiCells(atlas.seeds.map((s) => ({ x: s.x, y: s.y, w: s.w })), outline),
    [atlas.seeds, outline],
  );
  const citadel = centrepieceRegion(atlas);
  const place = atlas.centrepiece?.place;
  const shieldD = citadel && place
    ? shieldPath(place.cx, place.top, place.hw, place.h, citadel.submap.shieldOpts)
    : null;

  const enter = (id: string) => (picking ? onPick(id) : onEnterRegion(id));
  const enterCitadel = () => {
    if (!citadel) return;
    if (picking) onPick(citadel.id);
    else onEnterCitadel();
  };

  return (
    <>
      <g id="world-regions">
        {atlas.seeds.map((s, i) => {
          const r = regions.find((R) => R.id === s.id);
          const cell = cells[i];
          if (!r || !cell || cell.split(" ").length < 3) return null;
          const dp = tilePath(cell, 8, 22);
          const active = hoveredId === r.id;
          const a = polylabel(cell);
          const bb = bbox(cell);
          const dim = Math.min(bb.maxX - bb.minX, bb.maxY - bb.minY);
          const fs = Math.max(22, Math.min(46, dim * 0.2));
          const lx = a[0] + (s.ldx || 0), ly = a[1] + (s.ldy || 0);
          const lines = splitLabel(r.name, !!s.splitLabel);
          const startY = ly - (lines.length - 1) * fs * 0.55 - fs * 0.28;
          return (
            <g
              key={r.id}
              className={"region region--tile" + (active ? " is-active" : "")}
              data-house={r.house_color} data-id={r.id}
              tabIndex={0} role="button" aria-label={r.name + " — " + r.house}
              onClick={() => enter(r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(r.id); } }}
              onMouseEnter={() => onHover(r.id)}
              onMouseLeave={() => onHover(null)}
            >
              <path className="region__shape" d={dp} />
              <path className="region__sheen" d={dp} />
              <path className="region__hatch" d={dp} />
              <g className="region__label">
                {lines.map((ln, k) => (
                  <text key={k} className="region__name" x={lx} y={startY + k * fs * 1.02} fontSize={fs} dominantBaseline="middle">{ln}</text>
                ))}
              </g>
            </g>
          );
        })}

        {/* Centrepiece (the campus's Starfall Citadel) — floating heater-shield on top */}
        {citadel && place && shieldD && <g
          className={"region region--citadel" + (hoveredId === citadel.id ? " is-active" : "")}
          data-house={citadel.house_color} data-id={citadel.id}
          tabIndex={0} role="button" aria-label={citadel.name + " — " + citadel.house}
          onClick={enterCitadel}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enterCitadel(); } }}
          onMouseEnter={() => onHover(citadel.id)}
          onMouseLeave={() => onHover(null)}
        >
          <path className="region__shape" d={shieldD} />
          <path className="region__sheen" d={shieldD} />
          <path className="region__hatch" d={shieldD} />
          <g className="region__label">
            {atlas.centrepiece!.label.map((ln, i) => (
              <text key={ln} className="region__name" x={place.cx} y={place.top + place.h * 0.42 + i * 26} fontSize={22} dominantBaseline="middle">{ln}</text>
            ))}
          </g>
        </g>}

        {/* POIs — gold plaques floating on top, jumping to a named zone */}
        {atlas.pois.map((p) => {
          const fs = 18;
          const lines = splitLabel(p.name, true);
          const longest = lines.reduce((m, s) => Math.max(m, s.length), 0);
          const w = Math.max(96, longest * fs * 0.62 + 30);
          const hgt = lines.length * fs * 1.2 + 22;
          const x = p.x - w / 2, y = p.y - hgt / 2;
          const topY = p.y - (lines.length - 1) * (fs * 0.6);
          const go = () => {
            if (picking) {
              const id = pickIdForZoneLink(p.link, atlas);
              if (id) onPick(id);
              return;
            }
            if (p.link.district) onJumpToCitadelZone(p.link.district, p.link.zone || "");
            else if (p.link.region) onJumpToZone(p.link.region, p.link.zone || "");
          };
          return (
            <g key={p.id} className="location campus-poi" data-poi={p.id} tabIndex={0} role="button" aria-label={p.name}
               onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}>
              <rect className="location__plate" x={x} y={y} width={w} height={hgt} rx={12} ry={12} />
              <rect className="location__sheen" x={x} y={y} width={w} height={hgt} rx={12} ry={12} />
              <g className="location__label">
                {lines.map((ln, k) => (
                  <text key={k} className="location__name" x={p.x} y={topY + k * fs * 1.2} fontSize={fs} dominantBaseline="middle">{ln}</text>
                ))}
              </g>
            </g>
          );
        })}
      </g>
    </>
  );
}
