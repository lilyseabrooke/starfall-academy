"use client";

/* ===========================================================================
   Starfall Atlas — pan/zoom stage (typed port of app.js's pan/zoom block +
   renderLegend/renderCitadelLegend/showWorldMap/showCitadelMap/fitWorld).
   Keeps the transform writes imperative (ref + direct style, no React state
   per pointer-move) to stay smooth at 60fps while dragging — React state only
   changes on discrete actions (enter/exit citadel, hover, pick).
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import { CitadelTessellation } from "./CitadelTessellation";
import { PartyMarkers, type PartyMarkersProps } from "./PartyMarkers";
import { WorldTessellation } from "./WorldTessellation";
import type { Region } from "../../data/map/types";

export interface Crumb { label: string; onClick?: () => void; }

export interface AtlasStageProps {
  regions: Region[];
  mode: "world" | "citadel";
  onEnterRegion: (id: string) => void;
  onEnterCitadel: () => void;
  onExitCitadel: () => void;
  onSelectDistrict: (idx: number) => void;
  onJumpToZone: (regionId: string, zoneName: string) => void;
  onJumpToCitadelZone: (districtSlug: string, zoneName: string) => void;
  picking: boolean;
  onPick: (id: string) => void;
  party: Omit<PartyMarkersProps, "regions"> | null;
}

const MIN = 0.3, MAX = 3;

export function AtlasStage({
  regions, mode, onEnterRegion, onEnterCitadel, onExitCitadel, onSelectDistrict,
  onJumpToZone, onJumpToCitadelZone, picking, onPick, party,
}: AtlasStageProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const pannerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const hintRef = React.useRef<HTMLDivElement>(null);

  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = React.useState<number | null>(null);

  const view = mode === "citadel" ? ([1000, 1200] as const) : ([1600, 1200] as const);
  const citadel = regions.find((r) => r.isCitadel)!;

  // ---- pan/zoom state kept in refs; DOM transform written imperatively ----
  const scaleRef = React.useRef(1), txRef = React.useRef(0), tyRef = React.useRef(0);
  const dragRef = React.useRef({ dragging: false, moved: false, sx: 0, sy: 0, stx: 0, sty: 0 });
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = React.useRef<{ dist: number; mx: number; my: number } | null>(null);

  const apply = React.useCallback(() => {
    const panner = pannerRef.current;
    if (!panner) return;
    panner.style.transform = `translate(-50%,-50%) translate(${txRef.current}px,${tyRef.current}px) scale(${scaleRef.current})`;
    const inv = 1 / (scaleRef.current || 1);
    svgRef.current?.querySelectorAll<SVGGElement>(".pm-scale").forEach((g) => { g.setAttribute("transform", `scale(${inv})`); });
  }, []);

  const clampScale = (s: number) => Math.max(MIN, Math.min(MAX, s));

  const fit = React.useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const pad = 90;
    if (mode === "citadel") {
      scaleRef.current = clampScale(Math.min((r.width - pad) / 1000, (r.height - pad) / 1200));
      txRef.current = 0; tyRef.current = -6;
    } else {
      scaleRef.current = clampScale(Math.min((r.width - pad) / 1480, (r.height - pad) / 1120));
      txRef.current = 78; tyRef.current = -14 * scaleRef.current;
    }
    apply();
  }, [mode, apply]);

  React.useEffect(() => { fit(); }, [fit]);
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(fit, 120); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, [fit]);

  const zoomAt = React.useCallback((mx: number, my: number, factor: number) => {
    const ns = clampScale(scaleRef.current * factor);
    if (ns === scaleRef.current) return;
    txRef.current = mx - (ns / scaleRef.current) * (mx - txRef.current);
    tyRef.current = my - (ns / scaleRef.current) * (my - tyRef.current);
    scaleRef.current = ns;
    apply();
  }, [apply]);

  const centreXY = (cx: number, cy: number): [number, number] => {
    const r = stageRef.current!.getBoundingClientRect();
    return [cx - r.left - r.width / 2, cy - r.top - r.height / 2];
  };

  const [hinted, setHinted] = React.useState(false);
  const dropHint = () => { if (!hinted) setHinted(true); };

  const onPointerDown = (e: React.PointerEvent) => {
    dropHint();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragRef.current = { dragging: true, moved: false, sx: e.clientX, sy: e.clientY, stx: txRef.current, sty: tyRef.current };
    } else if (pointers.current.size === 2) {
      dragRef.current.dragging = false; dragRef.current.moved = true;
      canvasRef.current?.classList.add("dragging");
      const p = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2 };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinchRef.current) {
      const p = [...pointers.current.values()];
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2;
      const [rx, ry] = centreXY(mx, my);
      if (pinchRef.current.dist > 0) zoomAt(rx, ry, dist / pinchRef.current.dist);
      const [pmx, pmy] = centreXY(pinchRef.current.mx, pinchRef.current.my);
      txRef.current += rx - pmx; tyRef.current += ry - pmy; apply();
      pinchRef.current = { dist, mx, my };
      return;
    }
    const d = dragRef.current;
    if (!d.dragging) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      d.moved = true;
      canvasRef.current?.classList.add("dragging");
      try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (d.moved) { txRef.current = d.stx + dx; tyRef.current = d.sty + dy; apply(); }
  };
  const endDrag = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 1) {
      const [, p] = [...pointers.current.entries()][0];
      dragRef.current = { dragging: true, moved: dragRef.current.moved, sx: p.x, sy: p.y, stx: txRef.current, sty: tyRef.current };
      return;
    }
    if (pointers.current.size > 0) return;
    const d = dragRef.current;
    if (!d.dragging && !d.moved) return;
    canvasRef.current?.classList.remove("dragging");
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    d.dragging = false;
    setTimeout(() => { dragRef.current.moved = false; }, 0);
  };
  const onWheel = (e: React.WheelEvent) => {
    dropHint();
    const [mx, my] = centreXY(e.clientX, e.clientY);
    zoomAt(mx, my, Math.exp(-e.deltaY * 0.0015));
  };

  const dragMoved = () => dragRef.current.moved;

  const enterRegion = (id: string) => { if (!dragMoved()) onEnterRegion(id); };
  const enterCitadel = () => { if (!dragMoved()) onEnterCitadel(); };
  const pickDistrict = (idx: number) => { if (!dragMoved()) onSelectDistrict(idx); };

  return (
    <div className="stage" ref={stageRef}>
      <div
        className="canvas" id="canvas" ref={canvasRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <div className="panner" ref={pannerRef}>
          <svg
            ref={svgRef} className="world-svg" width={view[0]} height={view[1]} viewBox={`0 0 ${view[0]} ${view[1]}`}
            xmlns="http://www.w3.org/2000/svg" aria-label={mode === "citadel" ? "Starfall Citadel map" : "World map"}
          >
            {mode === "world" ? (
              <WorldTessellation
                regions={regions} hoveredId={hoveredId} onHover={setHoveredId}
                onEnterRegion={enterRegion} onEnterCitadel={enterCitadel}
                onJumpToZone={onJumpToZone} onJumpToCitadelZone={onJumpToCitadelZone}
                picking={picking} onPick={onPick}
              />
            ) : (
              <CitadelTessellation citadel={citadel} hoveredIdx={hoveredDistrict} onHover={setHoveredDistrict} onPick={pickDistrict} />
            )}
            {mode === "world" && party && <PartyMarkers regions={regions} {...party} />}
          </svg>
        </div>
      </div>

      {mode === "citadel" ? (
        <aside className="float legend legend--citadel" id="citadel-legend">
          <div className="legend__head legend__head--citadel">
            <button type="button" className="citadel-back" onClick={onExitCitadel}>‹ CAMPUS</button>
            <div className="legend__titles">
              <span className="legend__eyebrow">HEART OF THE ACADEMY</span>
              <span className="legend__title">Starfall Citadel</span>
            </div>
          </div>
          <div className="legend__list">
            {(citadel.submap.seeds || []).filter((s) => !s.special).map((s) => {
              const idx = (citadel.submap.seeds || []).indexOf(s);
              return (
                <button key={s.tag} type="button" className={"legend__item legend__item--compact" + (hoveredDistrict === idx ? " is-active" : "")}
                        onClick={() => onSelectDistrict(idx)} onMouseEnter={() => setHoveredDistrict(idx)} onMouseLeave={() => setHoveredDistrict(null)}>
                  <span className="legend__swatch" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}` }} />
                  <span className="legend__name">{s.name}</span>
                  <span className="legend__sector">{s.tag}</span>
                </button>
              );
            })}
            {(citadel.submap.seeds || []).some((s) => s.special) && (
              <>
                <div className="legend__subhead">Points of Interest</div>
                {(citadel.submap.seeds || []).filter((s) => s.special).map((s) => {
                  const idx = (citadel.submap.seeds || []).indexOf(s);
                  return (
                    <button key={s.name} type="button" className={"legend__item legend__item--compact legend__item--loc" + (hoveredDistrict === idx ? " is-active" : "")}
                            onClick={() => onSelectDistrict(idx)} onMouseEnter={() => setHoveredDistrict(idx)} onMouseLeave={() => setHoveredDistrict(null)}>
                      <span className="legend__swatch legend__swatch--gold" />
                      <span className="legend__name">{s.name}</span>
                      <span className="legend__sector">{s.tag}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>
      ) : (
        <aside className="float legend" id="legend">
          <div className="legend__head">
            <div className="legend__eyebrow">ARCANE CAMPUS</div>
            <div className="legend__title">STARFALL ACADEMY</div>
          </div>
          <div className="legend__list">
            {regions.map((r) => (
              <button
                key={r.id} type="button" className={"legend__item" + (hoveredId === r.id ? " is-active" : "")}
                data-house={r.house_color}
                onClick={() => (r.isCitadel ? enterCitadel() : enterRegion(r.id))}
                onMouseEnter={() => setHoveredId(r.id)} onMouseLeave={() => setHoveredId(null)}
              >
                <span className={"legend__swatch" + (r.house_color === "gold" ? " legend__swatch--gold" : "")} />
                <span className="legend__labels">
                  <span className="legend__name">{r.name}</span>
                  <span className="legend__sub">{r.house}</span>
                </span>
                <span className="legend__sector">{r.sector.replace("SECTOR ", "S·").replace("SEAT OF THE REALM", "CENTER")}</span>
              </button>
            ))}
          </div>
          <div className="legend__hint">Select a region to explore.</div>
        </aside>
      )}

      <svg className="float compass" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border-default)" strokeWidth={1} />
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-subtle)" strokeWidth={1} />
        <g stroke="var(--gold-600)" strokeWidth={1}>
          <line x1="50" y1="12" x2="50" y2="20" /><line x1="50" y1="80" x2="50" y2="88" />
          <line x1="12" y1="50" x2="20" y2="50" /><line x1="80" y1="50" x2="88" y2="50" />
        </g>
        <polygon points="50,16 56,50 50,84 44,50" fill="var(--gold-500)" />
        <polygon points="16,50 50,44 84,50 50,56" fill="var(--gold-700)" />
        <polygon points="50,16 54,46 50,50 46,46" fill="var(--gold-300)" />
        <circle cx="50" cy="50" r="3" fill="var(--gold-300)" />
        <text x="50" y="9" textAnchor="middle" fontSize="9" fill="var(--gold-300)">N</text>
        <text x="50" y="97" textAnchor="middle" fontSize="7" fill="var(--gold-700)">S</text>
        <text x="6" y="53" textAnchor="middle" fontSize="7" fill="var(--gold-700)">W</text>
        <text x="94" y="53" textAnchor="middle" fontSize="7" fill="var(--gold-700)">E</text>
      </svg>

      <div className="float zoom" role="group" aria-label="Zoom">
        <button type="button" className="zoom-btn" aria-label="Zoom in" onClick={() => zoomAt(0, 0, 1.2)}><Icon name="plus" /></button>
        <button type="button" className="zoom-btn" aria-label="Zoom out" onClick={() => zoomAt(0, 0, 1 / 1.2)}><Icon name="minus" /></button>
        <button type="button" className="zoom-btn" aria-label="Fit to view" onClick={fit}><Icon name="maximize" /></button>
      </div>

      <div className="float hint" ref={hintRef} style={hinted ? { opacity: 0 } : undefined}>
        <b>Drag</b> to pan · <b>Scroll</b> to zoom · <b>Click</b> a region to enter
      </div>
    </div>
  );
}
