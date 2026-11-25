"use client";

/* ===========================================================================
   Mapmaker — the editing canvas. Draws one level of the map with the SAME
   geometry functions the renderer uses (smoothed outline, weighted Voronoi,
   pole-of-inaccessibility labels, district-field box normalisation), plus
   drag handles:
     ●  seed (drag to move)          ○  weight ring (drag its knob to grow/shrink)
     ◆  label position (drag)        ▪  POI / special (drag)
     •  outline vertex (drag; Alt-click deletes; click an edge to add one)
   Exactly-as-players-see-it rendering is the Preview toggle (the real
   AtlasMap), not this canvas.
   =========================================================================== */
import * as React from "react";
import {
  DISTRICT_FIELD_BOX, fitPointsToBox, polylabel, shieldOutline, shieldPath, smoothClosed, toBoxSpace, toPts, voronoiCells,
} from "../../sheet/data/map/geom";
import type { Point } from "../../sheet/data/map/types";
import { SUB_TAG_LETTERS, type MapJson, type Pt, type SubAreaJson } from "../format";
import { clamp, sameSel, type Sel, type View } from "./model";

export type DragApply = (d: MapJson, p: Pt, p0: Pt) => void;

export interface EditCanvasProps {
  doc: MapJson;
  view: View;
  sel: Sel;
  snap: boolean;
  onSelect: (s: Sel) => void;
  onDrill: (v: View) => void;
  /** Start a drag: `apply` runs against a fresh copy of the doc on each move. */
  onDrag: (apply: DragApply, p: Pt, p0: Pt, first: boolean) => void;
  onEdit: (fn: (d: MapJson) => void) => void;
}

const WORLD_RING = 120, ZONE_RING = 70, DISTRICT_RING = 90;
const fmtPts = (pts: Point[]) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
const okCell = (c: string | undefined) => !!c && c.split(" ").length >= 3;

export function EditCanvas({ doc, view, sel, snap, onSelect, onDrill, onDrag, onEdit }: EditCanvasProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const readoutRef = React.useRef<HTMLSpanElement>(null);
  const dragRef = React.useRef<{ apply: DragApply; p0: Pt; moved: boolean } | null>(null);

  const toSvg = React.useCallback((e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const g = snap ? 10 : 1;
    return [Math.round(pt.x / g) * g, Math.round(pt.y / g) * g];
  }, [snap]);

  const startDrag = (apply: DragApply, s: Sel) => (e: React.PointerEvent) => {
    if (e.button !== 0 || e.altKey) return;
    e.stopPropagation();
    onSelect(s);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { apply, p0: toSvg(e), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = toSvg(e);
    if (readoutRef.current) readoutRef.current.textContent = `${p[0]}, ${p[1]}`;
    const d = dragRef.current;
    if (!d) return;
    const first = !d.moved;
    d.moved = true;
    onDrag(d.apply, p, d.p0, first);
  };
  const endDrag = () => { dragRef.current = null; };

  /* ---- geometry for the current level ------------------------------------ */
  const worldOutline = React.useMemo(() => smoothClosed(doc.outline as Point[]), [doc.outline]);
  const worldCells = React.useMemo(
    () => voronoiCells(doc.regions.map((r) => ({ x: r.seed.x, y: r.seed.y, w: r.seed.w })), worldOutline),
    [doc.regions, worldOutline],
  );
  const c = doc.centrepiece;
  const shieldPts = React.useMemo(() => (c ? shieldOutline(c.shield.cx, c.shield.top, c.shield.hw, c.shield.h, c.opts) : []), [c]);
  const districtCells = React.useMemo(
    () => (c ? voronoiCells(c.districts.map((d) => ({ x: d.x, y: d.y, w: d.w })), shieldPts) : []),
    [c, shieldPts],
  );

  let viewBox: [number, number] = doc.field;
  let body: React.ReactNode = null;
  let crumbs: { label: string; view?: View }[] = [{ label: doc.name || "Map", view: { level: "world" } }];

  if (view.level === "world") {
    body = (
      <>
        <path d={"M" + fmtPts(worldOutline).replace(/ /g, " L") + " Z"} className="mm-outline" />
        {doc.regions.map((r, i) => (
          <polygon key={r.id + i} points={worldCells[i]} data-house={r.house_color}
            className={"mm-cell" + (sel.kind === "region" && sel.i === i ? " is-sel" : "")}
            onPointerDown={(e) => { if (e.button === 0) { e.stopPropagation(); onSelect({ kind: "region", i }); } }}
            onDoubleClick={() => onDrill({ level: "region", i })} />
        ))}
        {/* raw outline + vertex handles */}
        <polygon points={fmtPts(doc.outline as Point[])} className="mm-raw" />
        {doc.outline.map((p, v) => {
          const q = doc.outline[(v + 1) % doc.outline.length];
          return (
            <line key={"e" + v} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className="mm-edge"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                const at = toSvg(e);
                onEdit((d) => { d.outline.splice(v + 1, 0, at); });
                onSelect({ kind: "outline", v: v + 1 });
              }}><title>Click to add a vertex</title></line>
          );
        })}
        {doc.outline.map((p, v) => (
          <circle key={"v" + v} cx={p[0]} cy={p[1]} r={8}
            className={"mm-vertex" + (sameSel(sel, { kind: "outline", v }) ? " is-sel" : "")}
            onPointerDown={(e) => {
              if (e.altKey) {
                e.stopPropagation();
                if (doc.outline.length > 3) { onEdit((d) => { d.outline.splice(v, 1); }); onSelect({ kind: "map" }); }
                return;
              }
              startDrag((d, pt) => { d.outline[v] = pt; }, { kind: "outline", v })(e);
            }}><title>Drag to move · Alt-click to delete</title></circle>
        ))}
        {doc.regions.map((r, i) => (
          <SeedHandles key={"h" + r.id + i} name={r.name} cell={worldCells[i]} seed={r.seed} ring={WORLD_RING} font={28}
            split={!!r.seed.splitLabel} selected={(sel.kind === "region" && sel.i === i)}
            onSeed={startDrag((d, p) => { d.regions[i].seed.x = p[0]; d.regions[i].seed.y = p[1]; }, { kind: "region", i })}
            onRing={startDrag((d, p) => {
              const s = d.regions[i].seed;
              s.w = Math.round(clamp(Math.hypot(p[0] - s.x, p[1] - s.y) - WORLD_RING, -WORLD_RING + 4, 400));
            }, { kind: "region", i })}
            onLabel={(base) => startDrag((d, p) => { d.regions[i].seed.ldx = Math.round(p[0] - base[0]); d.regions[i].seed.ldy = Math.round(p[1] - base[1]); }, { kind: "region", i })}
            labelOffset={[r.seed.ldx, r.seed.ldy]} />
        ))}
        {c && (() => {
          const pl = c.place;
          const isSel = sel.kind === "centrepiece";
          return (
            <g className={"mm-centre" + (isSel ? " is-sel" : "")}>
              <path d={shieldPath(pl.cx, pl.top, pl.hw, pl.h, c.opts)} className="mm-shield"
                onPointerDown={startDrag((d, p, p0) => {
                  d.centrepiece!.place.cx = pl.cx + p[0] - p0[0];
                  d.centrepiece!.place.top = pl.top + p[1] - p0[1];
                }, { kind: "centrepiece" })}
                onDoubleClick={() => onDrill({ level: "centrepiece" })}><title>Drag to move · double-click to open</title></path>
              {c.label.map((ln, k) => (
                <text key={k} x={pl.cx} y={pl.top + pl.h * 0.42 + (k - (c.label.length - 1) / 2) * 26} className="mm-label mm-label--centre">{ln}</text>
              ))}
              <rect x={pl.cx + pl.hw - 7} y={pl.top + pl.h - 7} width={14} height={14} className="mm-knob"
                onPointerDown={startDrag((d, p) => {
                  d.centrepiece!.place.hw = Math.max(20, p[0] - pl.cx);
                  d.centrepiece!.place.h = Math.max(40, p[1] - pl.top);
                }, { kind: "centrepiece" })}><title>Drag to resize</title></rect>
            </g>
          );
        })()}
        {doc.pois.map((q, i) => (
          <g key={"p" + q.id + i} className={"mm-poi" + (sel.kind === "poi" && sel.i === i ? " is-sel" : "")}
            onPointerDown={startDrag((d, p) => { d.pois[i].x = p[0]; d.pois[i].y = p[1]; }, { kind: "poi", i })}>
            <rect x={q.x - 9} y={q.y - 9} width={18} height={18} transform={`rotate(45 ${q.x} ${q.y})`} />
            <text x={q.x} y={q.y - 18} className="mm-label mm-label--poi">{q.name}</text>
          </g>
        ))}
      </>
    );
  } else if (view.level === "region" || view.level === "district") {
    const isRegion = view.level === "region";
    const host = isRegion ? doc.regions[view.i] : c?.districts[view.i];
    if (host) {
      const cell = isRegion ? worldCells[view.i] : districtCells[view.i];
      viewBox = isRegion ? doc.regions[view.i].submap.view : [1000, 760];
      crumbs = isRegion
        ? [...crumbs, { label: host.name }]
        : [...crumbs, { label: c!.name, view: { level: "centrepiece" } }, { label: host.name }];
      body = okCell(cell)
        ? <ZoneField cell={cell} subs={"submap" in host ? host.submap.subs : host.subs} owner={isRegion ? "region" : "district"} i={view.i} sel={sel}
            onSelect={onSelect} startDrag={startDrag} color={isRegion ? undefined : (host as { color: string }).color}
            house={isRegion ? (host as { house_color: string }).house_color : c!.house_color} />
        : <text x={500} y={380} className="mm-empty">This area has no cell: its seed is swallowed by its neighbours.</text>;
    }
  } else if (view.level === "centrepiece" && c) {
    viewBox = c.view;
    crumbs = [...crumbs, { label: c.name }];
    body = (
      <>
        <polygon points={fmtPts(shieldPts)} className="mm-outline" />
        {c.districts.map((d, i) => (
          <polygon key={"d" + i} points={districtCells[i]} style={{ fill: d.color }}
            className={"mm-cell mm-cell--district" + (sel.kind === "district" && sel.i === i ? " is-sel" : "")}
            onPointerDown={(e) => { if (e.button === 0) { e.stopPropagation(); onSelect({ kind: "district", i }); } }}
            onDoubleClick={() => onDrill({ level: "district", i })} />
        ))}
        {c.districts.map((d, i) => (
          <SeedHandles key={"h" + i} name={d.name} cell={districtCells[i]} seed={d} ring={DISTRICT_RING} font={20}
            selected={sel.kind === "district" && sel.i === i} split={false}
            onSeed={startDrag((m, p) => { const t = m.centrepiece!.districts[i]; t.x = p[0]; t.y = p[1]; }, { kind: "district", i })}
            onRing={startDrag((m, p) => {
              const t = m.centrepiece!.districts[i];
              t.w = Math.round(clamp(Math.hypot(p[0] - t.x, p[1] - t.y) - DISTRICT_RING, -DISTRICT_RING + 4, 300));
            }, { kind: "district", i })}
            onLabel={(base) => startDrag((m, p) => { const t = m.centrepiece!.districts[i]; t.labelDx = Math.round(p[0] - base[0]); t.labelDy = Math.round(p[1] - base[1]); }, { kind: "district", i })}
            labelOffset={[d.labelDx, d.labelDy]} />
        ))}
        {c.specials.map((s, i) => (
          <g key={"s" + i} className={"mm-special" + (sel.kind === "special" && sel.i === i ? " is-sel" : "")}
            onPointerDown={startDrag((m, p) => { m.centrepiece!.specials[i].x = p[0]; m.centrepiece!.specials[i].y = p[1]; }, { kind: "special", i })}>
            <path d={starPath(s.x, s.y, 13, 6)} />
            <text x={s.x} y={s.y - 18} className="mm-label mm-label--poi">{s.name}</text>
          </g>
        ))}
      </>
    );
  }

  const grid = snap ? (
    <g className="mm-grid">
      {Array.from({ length: Math.floor(viewBox[0] / 50) + 1 }, (_, k) => <line key={"x" + k} x1={k * 50} y1={0} x2={k * 50} y2={viewBox[1]} />)}
      {Array.from({ length: Math.floor(viewBox[1] / 50) + 1 }, (_, k) => <line key={"y" + k} x1={0} y1={k * 50} x2={viewBox[0]} y2={k * 50} />)}
    </g>
  ) : null;

  return (
    <div className="mm-canvas">
      <div className="mm-canvas__bar">
        <nav className="mm-crumbs">
          {crumbs.map((cr, k) => (
            <React.Fragment key={k}>
              {k > 0 && <span className="mm-crumbs__sep">›</span>}
              {cr.view && k < crumbs.length - 1
                ? <button type="button" onClick={() => onDrill(cr.view!)}>{cr.label}</button>
                : <span>{cr.label}</span>}
            </React.Fragment>
          ))}
        </nav>
        <span className="mm-readout"><span ref={readoutRef}>–</span></span>
      </div>
      <svg ref={svgRef} className="mm-svg" viewBox={`-40 -60 ${viewBox[0] + 80} ${viewBox[1] + 100}`}
        onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        onPointerDown={(e) => { if (e.button === 0 && e.target === svgRef.current) onSelect(view.level === "world" ? { kind: "map" } : view.level === "centrepiece" ? { kind: "centrepiece" } : view.level === "region" ? { kind: "region", i: view.i } : { kind: "district", i: view.i }); }}>
        <rect x={0} y={0} width={viewBox[0]} height={viewBox[1]} className="mm-fieldrect" pointerEvents="none" />
        {grid}
        {body}
      </svg>
    </div>
  );
}

/* ---- seed + weight ring + label handle -------------------------------------- */

function SeedHandles({ name, cell, seed, ring, font, split, selected, onSeed, onRing, onLabel, labelOffset }: {
  name: string; cell: string | undefined; seed: { x: number; y: number; w: number }; ring: number; font: number;
  split: boolean; selected: boolean;
  onSeed: (e: React.PointerEvent) => void; onRing: (e: React.PointerEvent) => void;
  onLabel: (base: Pt) => (e: React.PointerEvent) => void; labelOffset: Pt;
}) {
  const base = okCell(cell) ? (polylabel(cell!) as Pt) : null;
  const r = Math.max(4, ring + seed.w);
  const lines = split || name.length > 14 ? splitName(name) : [name];
  return (
    <g className={"mm-handles" + (selected ? " is-sel" : "")}>
      {base && (
        <g className="mm-labelgrp">
          {lines.map((ln, k) => (
            <text key={k} x={base[0] + labelOffset[0]} y={base[1] + labelOffset[1] + (k - (lines.length - 1) / 2) * font * 1.1}
              className="mm-label" style={{ fontSize: font }}>{ln}</text>
          ))}
          <path d={diamond(base[0] + labelOffset[0], base[1] + labelOffset[1] + (lines.length * font * 0.55) + 8, 7)} className="mm-lhandle"
            onPointerDown={onLabel(base)}><title>Drag to move the label</title></path>
        </g>
      )}
      <circle cx={seed.x} cy={seed.y} r={r} className={"mm-ring" + (seed.w < 0 ? " is-neg" : "")} pointerEvents="none" />
      <circle cx={seed.x + r} cy={seed.y} r={6} className="mm-knob" onPointerDown={onRing}><title>Weight {seed.w}: drag to grow or shrink</title></circle>
      <circle cx={seed.x} cy={seed.y} r={9} className="mm-seed" onPointerDown={onSeed}><title>{name}: drag to move</title></circle>
    </g>
  );
}

function splitName(name: string): string[] {
  const words = name.split(" ");
  if (words.length < 2) return [name];
  let best = 1, bestDiff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(words.slice(0, k).join(" ").length - words.slice(k).join(" ").length);
    if (d < bestDiff) { bestDiff = d; best = k; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

const diamond = (x: number, y: number, r: number) => `M${x},${y - r} L${x + r},${y} L${x},${y + r} L${x - r},${y} Z`;
function starPath(x: number, y: number, R: number, r: number) {
  let d = "";
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI / 4) * k - Math.PI / 2, rr = k % 2 ? r : R;
    d += (k ? "L" : "M") + (x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1);
  }
  return d + "Z";
}

/* ---- a region's / district's A–F zones ------------------------------------ */

function ZoneField({ cell, subs, owner, i, sel, onSelect, startDrag, color, house }: {
  cell: string; subs: SubAreaJson[]; owner: "region" | "district"; i: number; sel: Sel; color?: string; house: string;
  onSelect: (s: Sel) => void;
  startDrag: (apply: DragApply, s: Sel) => (e: React.PointerEvent) => void;
}) {
  const norm = React.useMemo(() => {
    const pts = toPts(cell);
    const t = fitPointsToBox(pts, DISTRICT_FIELD_BOX.w, DISTRICT_FIELD_BOX.h, DISTRICT_FIELD_BOX.bx, DISTRICT_FIELD_BOX.by);
    return pts.map((p) => toBoxSpace(p, t));
  }, [cell]);
  const onIdx = subs.map((a, k) => (a.on || owner === "region" ? k : -1)).filter((k) => k >= 0);
  const cells = voronoiCells(onIdx.map((k) => ({ x: subs[k].x, y: subs[k].y, w: subs[k].w })), norm);
  const zoneOf = (d: MapJson, k: number) => (owner === "region" ? d.regions[i].submap.subs[k] : d.centrepiece!.districts[i].subs[k]);
  return (
    <g data-house={house} style={color ? ({ "--hc": color } as React.CSSProperties) : undefined}>
      <polygon points={fmtPts(norm)} className="mm-outline mm-outline--host" />
      {onIdx.map((k, j) => (
        <polygon key={"z" + k} points={cells[j]} className={"mm-zone" + (sel.kind === "zone" && sel.k === k ? " is-sel" : "")}
          style={{ fillOpacity: 0.18 + (k % 3) * 0.08 }}
          onPointerDown={(e) => { if (e.button === 0) { e.stopPropagation(); onSelect({ kind: "zone", owner, i, k }); } }} />
      ))}
      {subs.map((a, k) => {
        const j = onIdx.indexOf(k);
        const s: Sel = { kind: "zone", owner, i, k };
        const isSel = sameSel(sel, s);
        const label = a.name || a.generic || "Sub-area " + SUB_TAG_LETTERS[k];
        if (j < 0) {
          return (
            <g key={"h" + k} className={"mm-handles is-off" + (isSel ? " is-sel" : "")}>
              <circle cx={a.x} cy={a.y} r={9} className="mm-seed" onPointerDown={startDrag((d, p) => { const z = zoneOf(d, k); z.x = p[0]; z.y = p[1]; }, s)}>
                <title>{SUB_TAG_LETTERS[k]} (off): {label}</title>
              </circle>
              <text x={a.x} y={a.y - 16} className="mm-label mm-label--off">{SUB_TAG_LETTERS[k]} · off</text>
            </g>
          );
        }
        return (
          <SeedHandles key={"h" + k} name={`${SUB_TAG_LETTERS[k]} · ${label}`} cell={cells[j]} seed={a} ring={ZONE_RING} font={17} split={false}
            selected={isSel}
            onSeed={startDrag((d, p) => { const z = zoneOf(d, k); z.x = p[0]; z.y = p[1]; }, s)}
            onRing={startDrag((d, p) => { const z = zoneOf(d, k); z.w = Math.round(clamp(Math.hypot(p[0] - z.x, p[1] - z.y) - ZONE_RING, -ZONE_RING + 4, 300)); }, s)}
            onLabel={(base) => startDrag((d, p) => { const z = zoneOf(d, k); z.lx = Math.round(p[0] - base[0]); z.ly = Math.round(p[1] - base[1]); }, s)}
            labelOffset={[a.lx, a.ly]} />
        );
      })}
    </g>
  );
}
