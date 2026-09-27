"use client";

/* ===========================================================================
   Starfall Atlas — district/region zone field (typed port of app.js's
   renderDistrictField). Renders a host's own cell shape, sub-divided by a
   Voronoi of its enabled zone seeds (A–F) — used for both a Citadel
   district's level-4 zones and an outer region's zones, normalised into a
   fixed 1000×760 box regardless of the host's native coordinate space.
   =========================================================================== */
import * as React from "react";
import { DISTRICT_FIELD_BOX, fitPointsToBox, polylabel, roundedPath, splitLabel, tilePath, toBoxSpace, toPts, voronoiCells } from "../../data/map/geom";
import { pickPrefixForHost, type ZoneHost } from "../../data/map/hosts";
import { PartyMarkerCluster } from "./PartyMarkerCluster";
import type { MapRosterMember } from "./MapPage";

const SUB_MIX = [46, 54, 62, 48, 56, 64];

function normalizeCellToBox(pts: [number, number][]): [number, number][] {
  const t = fitPointsToBox(pts, DISTRICT_FIELD_BOX.w, DISTRICT_FIELD_BOX.h, DISTRICT_FIELD_BOX.bx, DISTRICT_FIELD_BOX.by);
  return pts.map((p) => toBoxSpace(p, t));
}

export interface DistrictFieldProps {
  host: ZoneHost;
  interactive?: boolean;
  hoveredIdx: number | null;
  selectedIdx: number | null;
  onHover: (idx: number | null) => void;
  onPick?: (idx: number) => void;
  onBackgroundClick?: () => void;
  /** Whereabouts pinned to one of this host's zones show a marker on that
   *  tile — the same feedback the world/Citadel views give, at whatever
   *  depth the player is currently browsing. */
  party?: { roster: MapRosterMember[]; locations: Record<string, string | null | undefined>; selfId: string };
}

export function DistrictField({ host, interactive, hoveredIdx, selectedIdx, onHover, onPick, onBackgroundClick, party }: DistrictFieldProps) {
  const norm = React.useMemo(() => (host.cell ? normalizeCellToBox(toPts(host.cell)) : []), [host.cell]);
  const normStr = React.useMemo(() => norm.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "), [norm]);
  const color = host.hcOverride || "var(--gold-500)";
  const subsOn = React.useMemo(() => host.sub.filter((a) => a.on), [host.sub]);

  const cells = React.useMemo(() => {
    if (!subsOn.length || !norm.length) return [];
    return voronoiCells(subsOn.map((a) => ({ x: a.x, y: a.y, w: a.w })), norm);
  }, [subsOn, norm]);

  const membersByTag = React.useMemo(() => {
    const map: Record<string, MapRosterMember[]> = {};
    if (!party) return map;
    const prefix = pickPrefixForHost(host);
    party.roster.forEach((mem) => {
      const loc = party.locations[mem.id];
      if (!loc || !loc.startsWith(prefix + "/")) return;
      const tag = loc.slice(prefix.length + 1);
      (map[tag] = map[tag] || []).push(mem);
    });
    return map;
  }, [party, host]);

  if (!norm.length) return null;

  return (
    <svg
      className="world-svg" viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid meet"
      width="100%" height="100%" style={{ position: "relative", zIndex: 1, padding: "2.5%" }}
      onClick={(e) => {
        if (!interactive) return;
        const t = e.target as HTMLElement;
        if (!t.closest(".subarea")) onBackgroundClick?.();
      }}
    >
      <path className="districtfield__outline" d={roundedPath(norm, 16)} />
      {!subsOn.length ? (
        <g className="subdistrict subarea" data-idx={0} style={{ "--cell": color, "--mix": "52%" } as React.CSSProperties}>
          <path className="subdistrict__shape" d={tilePath(normStr, 4, 14)} />
          <path className="subdistrict__sheen" d={tilePath(normStr, 4, 14)} />
        </g>
      ) : (
        cells.map((cell, k) => {
          if (!cell || cell.split(" ").length < 3) return null;
          const a = subsOn[k];
          const dp = tilePath(cell, 5, 12);
          const active = hoveredIdx === k || selectedIdx === k;
          return (
            <g
              key={a.tag}
              className={"subdistrict subarea" + (active ? " is-active" : "") + (selectedIdx === k ? " is-zonesel" : "")}
              data-idx={k}
              style={{ "--cell": color, "--mix": SUB_MIX[k % SUB_MIX.length] + "%", cursor: interactive ? "pointer" : undefined } as React.CSSProperties}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? "button" : undefined}
              onMouseEnter={() => onHover(k)}
              onMouseLeave={() => onHover(null)}
              onClick={() => interactive && onPick?.(k)}
              onKeyDown={(e) => { if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick?.(k); } }}
            >
              <path className="subdistrict__shape" d={dp} />
              <path className="subdistrict__sheen" d={dp} />
            </g>
          );
        })
      )}
      <g className="subdistrict-labels">
        {subsOn.length > 0 && cells.map((cell, k) => {
          if (!cell || cell.split(" ").length < 3) return null;
          const a = subsOn[k];
          const cc = polylabel(cell);
          const lcx = cc[0] + (a.lx || 0), lcy = cc[1] + (a.ly || 0);
          const nm = a.name || a.generic || a.tag;
          const lines = splitLabel(nm, false);
          const fs = (a.name || a.generic) ? 26 : 40;
          const startY = lcy - (lines.length - 1) * fs * 0.55;
          const active = hoveredIdx === k || selectedIdx === k;
          return (
            <g key={a.tag} className={"subdistrict__label" + (active ? " is-zonesel" : "")} data-idx={k}>
              {lines.map((ln, j) => (
                <text key={j} className="subdistrict__name" x={lcx} y={startY + j * fs * 1.05} fontSize={fs} dominantBaseline="middle">{ln}</text>
              ))}
            </g>
          );
        })}
      </g>
      {Object.keys(membersByTag).length > 0 && (
        <g className="party-layer">
          {subsOn.length > 0 && cells.map((cell, k) => {
            if (!cell || cell.split(" ").length < 3) return null;
            const a = subsOn[k];
            const members = membersByTag[a.tag];
            if (!members || !members.length) return null;
            const cc = polylabel(cell);
            return <PartyMarkerCluster key={a.tag} x={cc[0]} y={cc[1]} members={members} selfId={party!.selfId} spacing={40} rowY={-12} />;
          })}
        </g>
      )}
    </svg>
  );
}
