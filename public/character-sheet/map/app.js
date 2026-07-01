/* ===========================================================================
   Starfall Atlas — application logic
   - Renders the world tessellation + legend from STARFALL_REGIONS
   - Pan (drag) / zoom (wheel + buttons, zoom-to-cursor) on the world view
   - Region (or legend row) click -> transition into a dedicated submap screen
     with a dossier panel + interlocking districts + back navigation
   This is a working mockup; geometry & data live in regions.js for easy handoff.
   =========================================================================== */
(function () {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";
  const REGIONS = window.STARFALL_REGIONS || [];
  const byId = (id) => document.getElementById(id);

  // Pure geometry/SVG engine (atlas-geom.js) and Citadel data model
  // (atlas-citadel-data.js) live in their own modules — imported here so call
  // sites read identically (el(...), tilePath(...), ensureSubAreas(...)).
  const {
    el, h, centroid, toPts, insetPoints, roundedPath, tilePath, bbox,
    shieldPath, shieldOutline, clipHalfPlane, voronoiCells, polylabel, splitLabel, smoothClosed,
  } = window.AtlasGeom;
  const {
    seedSlug, SUB_TAGS, SUB_DEFAULTS, GENERIC_BLURBS, ensureSubAreas, subAreaList,
  } = window.AtlasCitadelData;

  /* ---- Tweakable shield parameters --------------------------------------
     The host persists these by rewriting the block between the EDITMODE
     markers on disk, so edits survive a reload. Sliders map 1:1 to the
     fractions shieldPath() expects. */
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "shieldSpike": 0.095,
    "shieldShoulder": -0.02,
    "shieldSide": 0.4
  }/*EDITMODE-END*/;
  const TWEAKS = Object.assign({}, TWEAK_DEFAULTS);
  function shieldOpts() {
    return { spike: TWEAKS.shieldSpike, shoulder: TWEAKS.shieldShoulder, side: TWEAKS.shieldSide };
  }
  let citadel = null; // { shape, sheen, hatch, cx, top, hw, h } — set when drawn

  /* ---- Citadel district position overrides ------------------------------
     The edit panel exposes each district's x / y / weight live. Overrides are
     persisted as flat keys (px_/py_/pw_ + slug) in the EDITMODE block, applied
     over the authored regions.js values on load. Originals (_x0/_y0/_w0) are
     captured so "reset" can restore the authored layout. */
  const CIT = REGIONS.find((r) => r.isCitadel);
  const CIT_SEEDS = CIT && CIT.submap ? CIT.submap.seeds : [];
  CIT_SEEDS.forEach((s) => { s._slug = seedSlug(s); s._x0 = s.x; s._y0 = s.y; s._w0 = s.w || 0; s._ldx0 = s.labelDx || 0; s._ldy0 = s.labelDy || 0; });

  /* ---- Sub-areas (level-4) ----------------------------------------------
     Each Citadel DISTRICT is sub-divided by its own Voronoi of up to 6 seeds
     (A–F). The data model (tags, defaults, generic blurbs, ensureSubAreas,
     subAreaList) lives in atlas-citadel-data.js; tweaks persist as
     sx_/sy_/sw_/son_/gen_ + slug + tag and are layered on by
     applyCitadelOverrides() below. `_d0` keeps the authored default for reset. */
  CIT_SEEDS.forEach(ensureSubAreas);

  function applyCitadelOverrides() {
    CIT_SEEDS.forEach((s) => {
      const kx = "px_" + s._slug, ky = "py_" + s._slug, kw = "pw_" + s._slug;
      s.x = (kx in TWEAKS) ? TWEAKS[kx] : s._x0;
      s.y = (ky in TWEAKS) ? TWEAKS[ky] : s._y0;
      if (!s.special) s.w = (kw in TWEAKS) ? TWEAKS[kw] : s._w0;
      // label nudge (text only, doesn't move the cell)
      s.labelDx = ("ldx_" + s._slug in TWEAKS) ? TWEAKS["ldx_" + s._slug] : s._ldx0;
      s.labelDy = ("ldy_" + s._slug in TWEAKS) ? TWEAKS["ldy_" + s._slug] : s._ldy0;
      if (s.sub) s.sub.forEach((a) => {
        const base = "_" + s._slug + "_" + a.tag.toLowerCase();
        a.x = ("sx" + base in TWEAKS) ? TWEAKS["sx" + base] : a._d0.x;
        a.y = ("sy" + base in TWEAKS) ? TWEAKS["sy" + base] : a._d0.y;
        a.w = ("sw" + base in TWEAKS) ? TWEAKS["sw" + base] : a._d0.w;
        a.on = ("son" + base in TWEAKS) ? !!TWEAKS["son" + base] : a._d0.on;
        a.generic = TWEAKS["gen" + base] || a._d0.generic || null;
        a.lx = ("slx" + base in TWEAKS) ? TWEAKS["slx" + base] : (a._d0.lx || 0);
        a.ly = ("sly" + base in TWEAKS) ? TWEAKS["sly" + base] : (a._d0.ly || 0);
      });
    });
  }
  let citSel = null; // index of the district currently selected in the edit panel

  /* ---- small helpers ----------------------------------------------------- */
  const LABEL_SIZE = {
    "amber-woods": 42, "ryker-cliffs": 30, "jewelstone-hollow": 21,
    "glimmerdeep-lake": 32, "the-grounds": 31, "starfall-citadel": 20,
  };

  /* =======================================================================
     WORLD MAP
     ======================================================================= */
  const gWorld = byId("world-regions");

  /* ---- Campus Voronoi layout --------------------------------------------
     The five outer regions tessellate (Laguerre/power Voronoi) inside the
     campus outline — the same engine the Citadel districts use — and the
     Starfall Citadel rides on top as its tweakable heater-shield. Seeds carry
     x/y, a friendly weight w (grow/shrink), and label nudges ldx/ldy. Tune
     these freely; the layout is data, not hand-drawn polygons. */
  const CAMPUS_OUTLINE =
    "120,250 440,150 820,112 1190,150 1466,345 1500,716 1330,1052 905,1132 470,1086 180,892 94,556";
  const CAMPUS_SEEDS = [
    { id: "amber-woods",       x: 730, y: 300, w: 44, ldx: 0, ldy: -10 },
    { id: "jewelstone-hollow", x: 909, y: 512, w: -100, ldx: 0, ldy: 0 },
    { id: "ryker-cliffs",      x: 1287, y: 508, w: 4, ldx: 0, ldy: -51 },
    { id: "glimmerdeep-lake",  x: 243, y: 989, w: 6, ldx: -4, ldy: 29 },
    { id: "the-grounds",       x: 770, y: 896, w: -4, ldx: 291, ldy: 120 },
  ];
  const CITADEL_PLACE = { cx: 722, top: 736, hw: 118, h: 296 };

  /* House points-of-interest on the campus map — gold plaques (like the Citadel
     POIs) marking the five Houses. Click jumps to that House's zone record;
     positions are tweakable via Map Studio (hx_/hy_ keys). */
  const CAMPUS_POIS = [
    { id: "boar-house",     name: "Boar House",     link: { region: "amber-woods",       zone: "Boar House" },    x: 530, y: 553 },
    { id: "dragon-house",   name: "Dragon House",   link: { region: "jewelstone-hollow", zone: "Dragon House" },  x: 968, y: 634 },
    { id: "eagle-house",    name: "Eagle House",    link: { region: "ryker-cliffs",      zone: "Eagle House" },   x: 1181, y: 709 },
    { id: "dolphin-house",  name: "Dolphin House",  link: { region: "glimmerdeep-lake",  zone: "Dolphin House" }, x: 380, y: 855 },
    { id: "scorpion-house", name: "Scorpion House", link: { citadelDistrict: "crescent_district", zone: "Scorpion House" }, x: 747, y: 799 },
  ];
  CAMPUS_POIS.forEach((p) => { p._d0 = { x: p.x, y: p.y }; });
  function applyCampusPoiOverrides() {
    CAMPUS_POIS.forEach((p) => {
      p.x = ("hx_" + p.id in TWEAKS) ? TWEAKS["hx_" + p.id] : p._d0.x;
      p.y = ("hy_" + p.id in TWEAKS) ? TWEAKS["hy_" + p.id] : p._d0.y;
    });
  }

  // capture authored defaults + layer any persisted Region-editor overrides
  CAMPUS_SEEDS.forEach((s) => { s._d0 = { x: s.x, y: s.y, w: s.w, ldx: s.ldx || 0, ldy: s.ldy || 0 }; });
  CITADEL_PLACE._d0 = { cx: CITADEL_PLACE.cx, top: CITADEL_PLACE.top, hw: CITADEL_PLACE.hw, h: CITADEL_PLACE.h };
  function applyCampusOverrides() {
    CAMPUS_SEEDS.forEach((s) => {
      s.x = ("rx_" + s.id in TWEAKS) ? TWEAKS["rx_" + s.id] : s._d0.x;
      s.y = ("ry_" + s.id in TWEAKS) ? TWEAKS["ry_" + s.id] : s._d0.y;
      s.w = ("rw_" + s.id in TWEAKS) ? TWEAKS["rw_" + s.id] : s._d0.w;
      s.ldx = ("rlx_" + s.id in TWEAKS) ? TWEAKS["rlx_" + s.id] : s._d0.ldx;
      s.ldy = ("rly_" + s.id in TWEAKS) ? TWEAKS["rly_" + s.id] : s._d0.ldy;
    });
    const c = CITADEL_PLACE;
    c.cx = ("ccx" in TWEAKS) ? TWEAKS.ccx : c._d0.cx;
    c.top = ("ctop" in TWEAKS) ? TWEAKS.ctop : c._d0.top;
    c.hw = ("chw" in TWEAKS) ? TWEAKS.chw : c._d0.hw;
    c.h = ("ch" in TWEAKS) ? TWEAKS.ch : c._d0.h;
  }

  function regionLabel(parent, r, cx, cy, fs) {
    const lines = splitLabel(r.name, r.id === "jewelstone-hollow");
    const g = el("g", { class: "region__label" });
    const startY = cy - (lines.length - 1) * fs * 0.55 - fs * 0.28;
    lines.forEach((ln, i) => g.appendChild(el("text", {
      class: "region__name", x: cx, y: startY + i * fs * 1.02,
      "font-size": fs, "dominant-baseline": "middle",
    }, document.createTextNode(ln))));
    parent.appendChild(g);
  }

  function renderWorld() {
    gWorld.innerHTML = "";
    const outline = smoothClosed(toPts(CAMPUS_OUTLINE));
    const seeds = CAMPUS_SEEDS.map((s) => ({ x: s.x, y: s.y, w: s.w }));
    const cells = voronoiCells(seeds, outline);
    const labelLayer = el("g", { class: "region-labels" });

    CAMPUS_SEEDS.forEach((s, i) => {
      const r = REGIONS.find((R) => R.id === s.id);
      const cell = cells[i];
      if (!r || !cell || cell.split(" ").length < 3) return;
      const g = el("g", {
        class: "region region--tile", "data-house": r.house_color, "data-id": r.id,
        tabindex: "0", role: "button", "aria-label": r.name + " — " + r.house,
      });
      const dp = tilePath(cell, 8, 22);
      g.appendChild(el("path", { class: "region__shape", d: dp }));
      g.appendChild(el("path", { class: "region__sheen", d: dp }));
      g.appendChild(el("path", { class: "region__hatch", d: dp }));

      const enter = () => { if (!dragMoved) openSubmap(r.id); };
      g.addEventListener("click", enter);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSubmap(r.id); } });
      g.addEventListener("mouseenter", () => highlightLegend(r.id, true));
      g.addEventListener("mouseleave", () => highlightLegend(r.id, false));
      gWorld.appendChild(g);

      // label at the cell's pole of inaccessibility, with optional nudge
      const a = polylabel(cell);
      const bb = bbox(cell);
      const dim = Math.min(bb.maxX - bb.minX, bb.maxY - bb.minY);
      const fs = Math.max(22, Math.min(46, dim * 0.2));
      regionLabel(labelLayer, r, a[0] + (s.ldx || 0), a[1] + (s.ldy || 0), fs);
    });
    gWorld.appendChild(labelLayer);

    // Starfall Citadel — floating heater-shield on top (over The Grounds)
    const cr = REGIONS.find((R) => R.isCitadel);
    const gp = CITADEL_PLACE;
    const g = el("g", {
      class: "region region--citadel", "data-house": "gold", "data-id": cr.id,
      tabindex: "0", role: "button", "aria-label": cr.name + " — " + cr.house,
    });
    const d = shieldPath(gp.cx, gp.top, gp.hw, gp.h, shieldOpts());
    const shape = el("path", { class: "region__shape", d: d });
    const sheen = el("path", { class: "region__sheen", d: d });
    const hatch = el("path", { class: "region__hatch", d: d });
    g.appendChild(shape); g.appendChild(sheen); g.appendChild(hatch);
    citadel = Object.assign({ shape, sheen, hatch }, gp);
    const clbl = el("g", { class: "region__label" });
    const cy = gp.top + gp.h * 0.42;
    ["STARFALL", "CITADEL"].forEach((ln, i) => clbl.appendChild(el("text", {
      class: "region__name", x: gp.cx, y: cy + i * 26, "font-size": 22, "dominant-baseline": "middle",
    }, document.createTextNode(ln))));
    g.appendChild(clbl);
    g.addEventListener("click", () => { if (!dragMoved) enterCitadel(); });
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enterCitadel(); } });
    g.addEventListener("mouseenter", () => highlightLegend(cr.id, true));
    g.addEventListener("mouseleave", () => highlightLegend(cr.id, false));
    gWorld.appendChild(g);

    // House POIs — gold plaques floating on top, jumping to each House's record
    CAMPUS_POIS.forEach((p) => {
      const fs = 18;
      const lines = splitLabel(p.name, true); // always two lines so plaques match
      const longest = lines.reduce((m, s) => Math.max(m, s.length), 0);
      const w = Math.max(96, longest * fs * 0.62 + 30);
      const hgt = lines.length * fs * 1.2 + 22;
      const x = p.x - w / 2, y = p.y - hgt / 2;
      const pg = el("g", { class: "location campus-poi", "data-poi": p.id, tabindex: "0", role: "button", "aria-label": p.name });
      pg.appendChild(el("rect", { class: "location__plate", x: x, y: y, width: w, height: hgt, rx: 12, ry: 12 }));
      pg.appendChild(el("rect", { class: "location__sheen", x: x, y: y, width: w, height: hgt, rx: 12, ry: 12 }));
      const lbl = el("g", { class: "location__label" });
      const topY = p.y - (lines.length - 1) * (fs * 0.6);
      lines.forEach((ln, k) => lbl.appendChild(el("text", { class: "location__name", x: p.x, y: topY + k * fs * 1.2, "font-size": fs, "dominant-baseline": "middle" }, document.createTextNode(ln))));
      pg.appendChild(lbl);
      const go = () => { if (dragMoved) return; if (p.link.citadelDistrict) openCitadelZone(p.link.citadelDistrict, p.link.zone); else if (p.link.citadel) enterCitadel(); else jumpToRegionZone(p.link.region, p.link.zone); };
      pg.addEventListener("click", go);
      pg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      gWorld.appendChild(pg);
    });
  }

  // Open a region submap and immediately drill into one of its named zones.
  function jumpToRegionZone(regionId, zoneName) {
    openSubmap(regionId);
    if (!curDistrictField) return;
    const on = curDistrictField.subsOn || [];
    const k = on.findIndex((a) => a.name === zoneName);
    if (k >= 0) zonePick(k);
  }
  // Enter the Citadel map context and drill straight into a district's zone
  // (used by the campus Scorpion House plaque). Keeps back-nav landing on the
  // Citadel map, so the breadcrumb's “Starfall Citadel” step is consistent.
  function openCitadelZone(slug, zoneName) {
    const cit = REGIONS.find((r) => r.isCitadel);
    const di = cit.submap.seeds.findIndex((s) => s._slug === slug);
    if (di < 0) return;
    showCitadelMap();
    openDistrict(cit, di);
    const on = (curDistrictField && curDistrictField.subsOn) || [];
    const k = on.findIndex((a) => a.name === zoneName);
    if (k >= 0) selectZone(on[k], k);
  }

  /* ---- legend ------------------------------------------------------------ */
  const legendList = byId("legend-list");
  function renderLegend() {
    REGIONS.forEach((r) => {
      const row = h("button", "legend__item");
      row.type = "button";
      row.dataset.id = r.id;
      row.setAttribute("data-house", r.house_color);
      row.innerHTML =
        `<span class="legend__swatch ${r.house_color === "gold" ? "legend__swatch--gold" : ""}"></span>` +
        `<span class="legend__labels"><span class="legend__name">${r.name}</span>` +
        `<span class="legend__sub">${r.house}</span></span>` +
        `<span class="legend__sector">${r.sector.replace("SECTOR ", "S·").replace("SEAT OF THE REALM", "CENTER")}</span>`;
      row.addEventListener("click", () => (r.isCitadel ? enterCitadel() : openSubmap(r.id)));
      row.addEventListener("mouseenter", () => hoverRegionFromLegend(r.id, true));
      row.addEventListener("mouseleave", () => hoverRegionFromLegend(r.id, false));
      legendList.appendChild(row);
    });
  }
  function highlightLegend(id, on) {
    const row = legendList.querySelector(`[data-id="${id}"]`);
    if (row) row.classList.toggle("is-active", on);
  }
  function hoverRegionFromLegend(id, on) {
    const reg = gWorld.querySelector(`[data-id="${id}"]`);
    if (reg) reg.classList.toggle("is-active", on);
  }

  /* =======================================================================
     PAN / ZOOM  (world view)
     ======================================================================= */
  const stage = byId("stage");
  const canvas = byId("canvas");
  const panner = byId("panner");
  const MIN = 0.3, MAX = 3;
  let scale = 1, tx = 0, ty = 0;
  let dragging = false, dragMoved = false, sx = 0, sy = 0, stx = 0, sty = 0, pid = null;

  function apply() {
    panner.style.transform =
      `translate(-50%,-50%) translate(${tx}px,${ty}px) scale(${scale})`;
    byId("ro-scale") && (byId("ro-scale").textContent = "1:" + (1 / scale).toFixed(2).replace(/\.?0+$/, ""));
  }
  function clampScale(s) { return Math.max(MIN, Math.min(MAX, s)); }

  // Default view. World map = bare fit zoomed two "+" ticks, panned clear of the
  // legend. Citadel map = the whole shield fit to the stage, centred.
  function fitWorld() {
    const r = stage.getBoundingClientRect();
    const pad = 90;
    if (mapMode === "citadel") {
      const base = Math.min((r.width - pad) / 1000, (r.height - pad) / 1200);
      scale = clampScale(base);
      tx = 0; ty = -6; apply();
      return;
    }
    // World map = fit the whole campus tessellation, centred (the Voronoi fills
    // the field, so no zoom boost — show it all with a small margin).
    const base = Math.min((r.width - pad) / 1480, (r.height - pad) / 1120);
    scale = clampScale(base);
    tx = 78; ty = -14 * scale; apply();
  }

  function zoomAt(mx, my, factor) {
    const ns = clampScale(scale * factor);
    if (ns === scale) return;
    // keep the point under (mx,my) fixed; coords are relative to stage centre
    tx = mx - (ns / scale) * (mx - tx);
    ty = my - (ns / scale) * (my - ty);
    scale = ns; apply();
  }
  function centreMouse(e) {
    const r = stage.getBoundingClientRect();
    return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
  }

  // Active pointers (mouse/touch unified). 1 = pan, 2 = pinch-zoom + pan.
  const pointers = new Map();
  let pinch = null; // { dist, mx, my } from the previous move
  function centreXY(cx, cy) {
    const r = stage.getBoundingClientRect();
    return [cx - r.left - r.width / 2, cy - r.top - r.height / 2];
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      // begin a potential pan/tap — don't capture yet (would swallow the click)
      dragging = true; dragMoved = false; pid = e.pointerId;
      sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
    } else if (pointers.size === 2) {
      // second finger down → pinch; cancel the single-finger pan
      dragging = false; dragMoved = true; canvas.classList.add("dragging");
      const p = [...pointers.values()];
      pinch = {
        dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2,
      };
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2 && pinch) {
      const p = [...pointers.values()];
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2;
      const [rx, ry] = centreXY(mx, my);
      if (pinch.dist > 0) zoomAt(rx, ry, dist / pinch.dist); // pinch to zoom
      const [pmx, pmy] = centreXY(pinch.mx, pinch.my);
      tx += rx - pmx; ty += ry - pmy; apply();                // two-finger pan
      pinch = { dist, mx, my };
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!dragMoved && Math.abs(dx) + Math.abs(dy) > 4) {
      dragMoved = true;
      canvas.classList.add("dragging");
      try { canvas.setPointerCapture(pid); } catch (_) {}
    }
    if (dragMoved) { tx = stx + dx; ty = sty + dy; apply(); }
  });
  function endDrag(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      // dropped from pinch to one finger — re-anchor the pan to avoid a jump
      const [id, p] = [...pointers.entries()][0];
      dragging = true; pid = id; sx = p.x; sy = p.y; stx = tx; sty = ty;
      return;
    }
    if (pointers.size > 0) return;
    if (!dragging && !dragMoved) return;
    dragging = false; canvas.classList.remove("dragging");
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    setTimeout(() => { dragMoved = false; }, 0);
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const [mx, my] = centreMouse(e);
    zoomAt(mx, my, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  byId("zoom-in").addEventListener("click", () => zoomAt(0, 0, 1.2));
  byId("zoom-out").addEventListener("click", () => zoomAt(0, 0, 1 / 1.2));
  byId("zoom-reset").addEventListener("click", fitWorld);
  var fitBtn = byId("fit-btn"); if (fitBtn) fitBtn.addEventListener("click", fitWorld);
  let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(fitWorld, 120); });

  // fade the hint after first interaction
  let hinted = false;
  function dropHint() { if (!hinted) { hinted = true; const el2 = byId("hint"); if (el2) el2.style.opacity = "0"; } }
  canvas.addEventListener("pointerdown", dropHint);
  canvas.addEventListener("wheel", dropHint, { passive: true });

  /* =======================================================================
     SUBMAP VIEW
     ======================================================================= */
  const vWorld = byId("view-world");
  const vSub = byId("view-submap");
  const submap = byId("submap");
  const worldSvg = byId("world-svg");
  let mapMode = "world";       // 'world' | 'citadel' — what the pan/zoom view shows
  let dossierBackTo = "world"; // where the open dossier returns to

  /* A small interlocking pinwheel for the level-3 district fields (4 wards). */
  const DISTRICT_CELLS = (function () {
    const j = (p) => p.map((q) => q.join(",")).join(" ");
    const TL = [140, 110], TR = [860, 110], BR = [860, 650], BL = [140, 650],
      C = [520, 360], mt = [470, 110], mr = [860, 400], mb = [520, 650], ml = [140, 360];
    return [j([TL, mt, C, ml]), j([mt, TR, mr, C]), j([C, mr, BR, mb]), j([ml, C, mb, BL])];
  })();
  function makeWardField(names) {
    return { view: [1000, 760], districts: names.map((n) => ({ name: n, tag: "·", blurb: "" })), cells: DISTRICT_CELLS };
  }
  // Synthesize a region-like object for a Citadel district/location so the
  // existing dossier (buildSubmap) can present it like any other submap.
  function districtPlace(seed) {
    const special = !!seed.special;
    ensureSubAreas(seed);
    return {
      name: seed.name,
      house: special ? "Special location" : "Citadel district",
      house_color: "gold",
      _hc: seed.color || null,
      sector: special ? "✦ Location" : "District " + seed.tag,
      coord: "Starfall Citadel",
      blurb: seed.blurb,
      facts: special
        ? [["Class", "Special location"], ["Within", "Starfall Citadel"]]
        : [["Ledger no.", seed.tag], ["Within", "Starfall Citadel"]],
      submap: special
        ? makeWardField(["The Entry Hall", "The Inner Rooms", "The Undercroft", "The Terrace"])
        : { view: [1000, 760], _districtField: true, _seed: seed, districts: subAreaList(seed) },
    };
  }

  /* Draw a tessellation (district tiles + any floating locations) into `svg`.
     opts.onHover(idx,on) syncs a dossier list; opts.onPick(idx) makes tiles clickable. */
  function drawTessellation(svg, sm, opts) {
    opts = opts || {};
    const seeded = !!sm.seeds;
    let renderCells, locations = [];
    if (seeded) {
      const g0 = sm.shieldGeom;
      const outline = shieldOutline(g0.cx, g0.top, g0.hw, g0.h, sm.shieldOpts);
      const dseeds = [], didx = [];
      sm.seeds.forEach((s, i) => {
        if (s.special) locations.push({ idx: i, d: s });
        else { dseeds.push(s); didx.push(i); }
      });
      renderCells = voronoiCells(dseeds, outline).map((cell, k) => ({ cell, idx: didx[k], d: dseeds[k] }));
    } else {
      renderCells = sm.cells.map((cell, i) => ({ cell, idx: i, d: sm.districts[i] || { name: "", tag: "" } }));
    }
    const wire = (g, idx) => {
      if (opts.onHover) { g.addEventListener("mouseenter", () => opts.onHover(idx, true)); g.addEventListener("mouseleave", () => opts.onHover(idx, false)); }
      if (opts.onPick) {
        g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
        g.addEventListener("click", () => opts.onPick(idx));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); opts.onPick(idx); } });
      }
    };
    // district tiles — shapes first, then ALL labels in a layer on top so no
    // neighbouring tile can clip a name (esp. on the small districts).
    const labelLayer = el("g", { class: "subdistrict-labels" });
    renderCells.forEach(({ cell, idx, d }) => {
      if (!cell || cell.split(" ").length < 3) return;
      const g = el("g", { class: "subdistrict", "data-idx": idx });
      if (d.color) g.style.setProperty("--cell", d.color);
      if (seeded && d) d._cell = cell; // stash the real cell for the district field
      const dp = seeded ? tilePath(cell, 5, 11) : tilePath(cell, 6, 16);
      g.appendChild(el("path", { class: "subdistrict__shape", d: dp }));
      g.appendChild(el("path", { class: "subdistrict__sheen", d: dp }));
      wire(g, idx);
      svg.appendChild(g);

      // Label sits at the cell's pole of inaccessibility (its roomiest spot),
      // not the seed point — keeps names centred in irregular/edge cells.
      // d.labelDx/labelDy nudge the text only (Map Studio label controls).
      const anchor = polylabel(cell);
      const cx = anchor[0] + (d.labelDx || 0), cy = anchor[1] + (d.labelDy || 0);
      let fs = 19, gap = 22, showTag = true;
      if (seeded) {
        const bb = bbox(cell);
        const dim = Math.min(bb.maxX - bb.minX, bb.maxY - bb.minY);
        fs = Math.max(11, Math.min(20, dim * 0.155));
        gap = fs * 1.12; showTag = dim > 82;
      }
      const lines = splitLabel(d.name, false);
      const lbl = el("g", { class: "subdistrict__label", "data-idx": idx });
      const startY = cy - (lines.length - 1) * (gap / 2) - (showTag ? fs * 0.34 : 0);
      lines.forEach((ln, k) => lbl.appendChild(el("text", { class: "subdistrict__name", x: cx, y: startY + k * gap, "font-size": fs.toFixed(1) }, document.createTextNode(ln))));
      if (showTag) lbl.appendChild(el("text", { class: "subdistrict__tag", x: cx, y: startY + (lines.length - 1) * gap + fs * 0.92, "font-size": Math.max(9, fs * 0.52).toFixed(1) }, document.createTextNode(d.tag)));
      labelLayer.appendChild(lbl);
    });
    svg.appendChild(labelLayer);
    // floating special locations
    locations.forEach(({ idx, d }) => {
      const fs = 17;
      const lines = splitLabel(d.name, false);
      const longest = lines.reduce((m, s) => Math.max(m, s.length), 0);
      const w = Math.max(92, longest * fs * 0.64 + 28);
      const hgt = lines.length * fs * 1.2 + 20;
      const x = d.x - w / 2, y = d.y - hgt / 2;
      const g = el("g", { class: "location", "data-idx": idx });
      g.appendChild(el("rect", { class: "location__plate", x: x, y: y, width: w, height: hgt, rx: 12, ry: 12 }));
      g.appendChild(el("rect", { class: "location__sheen", x: x, y: y, width: w, height: hgt, rx: 12, ry: 12 }));
      const lbl = el("g", { class: "location__label" });
      const topY = d.y - (lines.length - 1) * (fs * 0.6);
      lines.forEach((ln, k) => lbl.appendChild(el("text", { class: "location__name", x: d.x, y: topY + k * fs * 1.2, "font-size": fs, "dominant-baseline": "middle" }, document.createTextNode(ln))));
      g.appendChild(lbl);
      wire(g, idx);
      svg.appendChild(g);
    });
  }

  /* Compute every Citadel district's Voronoi cell (point-string), keyed by seed
     index — a fallback for when the map hasn't been drawn yet. */
  function computeCitadelCells() {
    const sm = CIT.submap, g0 = sm.shieldGeom;
    const outline = shieldOutline(g0.cx, g0.top, g0.hw, g0.h, sm.shieldOpts);
    const dseeds = [], didx = [];
    sm.seeds.forEach((s, i) => { if (!s.special) { dseeds.push(s); didx.push(i); } });
    const cells = voronoiCells(dseeds, outline);
    const map = {};
    cells.forEach((c, k) => { map[didx[k]] = c; });
    return map;
  }
  // Normalize a district cell (Citadel coords) to fill the district-field box.
  function normalizeCellToBox(pts) {
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    pts.forEach((p) => { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
    const cw = maxX - minX || 1, ch = maxY - minY || 1;
    const boxW = 740, boxH = 580, BX = 500, BY = 380;
    const s = Math.min(boxW / cw, boxH / ch);
    const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    return pts.map((p) => [BX + (p[0] - mx) * s, BY + (p[1] - my) * s]);
  }
  /* Render a district's level-3 field: the district's own cell shape, sub-divided
     by a Voronoi of its enabled sub-area seeds (A–F). */
  const SUB_MIX = [46, 54, 62, 48, 56, 64];

  /* ---- Region zones: the 5 outer regions get the same zone treatment as a
     Citadel district — a Voronoi of named sub-areas inside the region outline,
     each clickable for its description, all wired to Map Studio. ----------- */
  function ensureRegionZones(region) {
    const sm = region.submap;
    if (sm._zones) return sm._zones;
    const tags = ["A", "B", "C", "D", "E", "F"];
    const pos = sm.subPos || {}, authored = sm.subs || [], lbl = sm.subLabel || {};
    sm._zones = authored.map((a, i) => {
      const t = tags[i], p = pos[t];
      const x = p ? p[0] : 500, y = p ? p[1] : 380, w = p ? (p[2] || 0) : 0;
      const lx = lbl[t] ? lbl[t][0] : 0, ly = lbl[t] ? lbl[t][1] : 0;
      return { tag: t, name: a.name, blurb: a.blurb, x, y, w, on: true, generic: null, lx, ly,
        _d0: { x, y, w, on: true, lx, ly, generic: null } };
    });
    return sm._zones;
  }
  // Each region's live campus Voronoi cell (point-string), keyed by region id —
  // so a region submap is clipped to the region's actual generated shape.
  function computeCampusCells() {
    const outline = smoothClosed(toPts(CAMPUS_OUTLINE));
    const cells = voronoiCells(CAMPUS_SEEDS.map((s) => ({ x: s.x, y: s.y, w: s.w })), outline);
    const map = {};
    CAMPUS_SEEDS.forEach((s, i) => { map[s.id] = cells[i]; });
    return map;
  }
  function regionHost(region) {
    const cell = computeCampusCells()[region.id];
    return {
      name: region.name, house: region.house, house_color: region.house_color,
      _slug: region.id, _isRegion: true, _cell: cell || region.submap.outline,
      color: "var(--hc-500)", sub: ensureRegionZones(region), region,
    };
  }
  function applyRegionZoneOverrides() {
    REGIONS.forEach((region) => {
      if (region.isCitadel || !region.submap || !region.submap.outline) return;
      ensureRegionZones(region).forEach((a) => {
        const base = "_" + region.id + "_" + a.tag.toLowerCase();
        a.x = ("sx" + base in TWEAKS) ? TWEAKS["sx" + base] : a._d0.x;
        a.y = ("sy" + base in TWEAKS) ? TWEAKS["sy" + base] : a._d0.y;
        a.w = ("sw" + base in TWEAKS) ? TWEAKS["sw" + base] : a._d0.w;
        a.lx = ("slx" + base in TWEAKS) ? TWEAKS["slx" + base] : (a._d0.lx || 0);
        a.ly = ("sly" + base in TWEAKS) ? TWEAKS["sly" + base] : (a._d0.ly || 0);
      });
    });
  }
  function renderDistrictField(svg, seed, interactive) {
    ensureSubAreas(seed);
    let cellStr = seed._cell;
    if (!cellStr) { const m = computeCitadelCells(); cellStr = m[CIT_SEEDS.indexOf(seed)]; }
    if (!cellStr) return [];
    const norm = normalizeCellToBox(toPts(cellStr));
    const normStr = norm.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const color = seed.color || "var(--gold-500)";
    // faint district boundary
    svg.appendChild(el("path", { class: "districtfield__outline", d: roundedPath(norm, 16) }));

    const subsOn = seed.sub.filter((a) => a.on);
    const labelLayer = el("g", { class: "subdistrict-labels" });
    if (!subsOn.length) {
      const g = el("g", { class: "subdistrict subarea", "data-idx": 0 });
      g.style.setProperty("--cell", color); g.style.setProperty("--mix", "52%");
      const dp = tilePath(normStr, 4, 14);
      g.appendChild(el("path", { class: "subdistrict__shape", d: dp }));
      g.appendChild(el("path", { class: "subdistrict__sheen", d: dp }));
      svg.appendChild(g);
    } else {
      const cells = voronoiCells(subsOn.map((a) => ({ x: a.x, y: a.y, w: a.w })), norm);
      cells.forEach((cell, k) => {
        if (!cell || cell.split(" ").length < 3) return;
        const a = subsOn[k];
        const g = el("g", { class: "subdistrict subarea", "data-idx": k });
        g.style.setProperty("--cell", color);
        g.style.setProperty("--mix", SUB_MIX[k % SUB_MIX.length] + "%");
        const dp = tilePath(cell, 5, 12);
        g.appendChild(el("path", { class: "subdistrict__shape", d: dp }));
        g.appendChild(el("path", { class: "subdistrict__sheen", d: dp }));
        if (interactive) g.style.cursor = "pointer";
        g.addEventListener("mouseenter", () => toggleDistrict(k, true));
        g.addEventListener("mouseleave", () => toggleDistrict(k, false));
        svg.appendChild(g);

        const cc = polylabel(cell);
        const lcx = cc[0] + (a.lx || 0), lcy = cc[1] + (a.ly || 0);
        const nm = a.name || a.generic || a.tag;
        const lines = splitLabel(nm, false);
        const fs = (a.name || a.generic) ? 26 : 40;
        const lbl = el("g", { class: "subdistrict__label", "data-idx": k });
        const startY = lcy - (lines.length - 1) * fs * 0.55;
        lines.forEach((ln, j) => lbl.appendChild(el("text", { class: "subdistrict__name", x: lcx, y: startY + j * fs * 1.05, "font-size": fs, "dominant-baseline": "middle" }, document.createTextNode(ln))));
        labelLayer.appendChild(lbl);
      });
    }
    svg.appendChild(labelLayer);
    if (interactive) {
      svg.addEventListener("click", (e) => {
        const tile = e.target.closest(".subarea");
        if (tile) zonePick(+tile.getAttribute("data-idx"));
        else deselectZone();
      });
    }
    return subsOn;
  }
  // Enabled sub-areas as a dossier-list payload (subAreaList) lives in
  // atlas-citadel-data.js.

  /* ---- the pan/zoom view can show either the world or the Citadel ---- */
  let curDistrictField = null;   // { seed, field, svg, subsOn } when a district dossier is open
  let curZone = null;            // selected sub-area object when in level-4 zone view
  let tweaksOnDistrict = null;   // hook the editor registers to track the open district
  function refreshDistrictField() {
    if (!curDistrictField) return;
    const { seed, field } = curDistrictField;
    const old = field.querySelector("svg.world-svg");
    if (!old) return;
    const svg = el("svg", {
      class: "world-svg", viewBox: "0 0 1000 760", preserveAspectRatio: "xMidYMid meet",
      width: "100%", height: "100%", style: "position:relative;z-index:1;padding:2.5%",
    });
    const subsOn = renderDistrictField(svg, seed, true);
    field.replaceChild(svg, old);
    curDistrictField.svg = svg;
    curDistrictField.subsOn = subsOn;
    if (curZone) { const k = subsOn.indexOf(curZone); if (k >= 0) markZone(k); else deselectZone(); }
  }

  /* ---- level-4 zone selection (stays on the district field; fades all but one) ---- */
  function zonePick(k) {
    if (!curDistrictField) return;
    const sub = (curDistrictField.subsOn || [])[k];
    if (!sub || sub === curZone) return;
    selectZone(sub, k);
  }
  function zoneCrumbs(seed, leaf) {
    const base = seed._isRegion
      ? [{ label: "Campus", go: goCampus }]
      : [{ label: "Campus", go: goCampus }, { label: "Starfall Citadel", go: closeSubmap }];
    base.push(leaf ? { label: seed.name, go: deselectZone } : { label: seed.name });
    return base;
  }
  // Display label for a zone: bespoke name, else a "<Type> Zone" for generics,
  // else fall back. Keeps the A–F tags out of user-facing text.
  const GENERIC_ZONE_LABEL = { "Residential": "Residential Zone", "Class Halls": "Class Hall Zone", "Commercial": "Commercial Zone" };
  function zoneLabel(sub) {
    return sub.name || (sub.generic && GENERIC_ZONE_LABEL[sub.generic]) || sub.generic || ("Sub-area " + sub.tag);
  }
  function selectZone(sub, k) {
    curZone = sub;
    const seed = curDistrictField.seed;
    const oldPanel = submap.querySelector(".dossier");
    const panel = buildCitadelZonePanel(seed, sub);
    if (oldPanel) submap.replaceChild(panel, oldPanel); else submap.insertBefore(panel, submap.firstChild);
    submap.classList.add("is-zoneview");
    markZone(k);
    setCrumbs(zoneCrumbs(seed, true).concat([{ label: zoneLabel(sub) }]));
  }
  function deselectZone() {
    if (!curDistrictField || !curZone) return;
    curZone = null;
    const seed = curDistrictField.seed;
    const oldPanel = submap.querySelector(".dossier");
    const panel = buildCitadelDistrictPanel(seed);
    if (oldPanel) submap.replaceChild(panel, oldPanel);
    submap.classList.remove("is-zoneview");
    submap.querySelectorAll(".is-zonesel").forEach((n) => n.classList.remove("is-zonesel"));
    setCrumbs(zoneCrumbs(seed, false));
  }
  function markZone(k) {
    submap.querySelectorAll(".is-zonesel").forEach((n) => n.classList.remove("is-zonesel"));
    const tile = submap.querySelector(`.subarea[data-idx="${k}"]`);
    const lbl = submap.querySelector(`.subdistrict__label[data-idx="${k}"]`);
    if (tile) tile.classList.add("is-zonesel");
    if (lbl) lbl.classList.add("is-zonesel");
  }

  /* ---- dossier panels ---- */
  /* Clickable + hoverable list of a host's named zones. Row click drills into
     the zone's record; row hover highlights the matching tile on the field.
     idx is the zone's position in the enabled set (matches the tile data-idx
     and what zonePick expects). */
  function buildZoneList(seed) {
    const wrap = h("div", "dossier__zoneList");
    const on = seed.sub ? seed.sub.filter((a) => a.on) : [];
    on.forEach((a, idx) => {
      if (!a.name) return; // list only named zones
      const row = h("button", "zoneRow");
      row.type = "button"; row.dataset.idx = idx;
      row.innerHTML = `<span class="zoneRow__name">${a.name}</span><span class="zoneRow__chev">›</span>`;
      row.addEventListener("click", () => zonePick(idx));
      row.addEventListener("mouseenter", () => toggleDistrict(idx, true));
      row.addEventListener("mouseleave", () => toggleDistrict(idx, false));
      wrap.appendChild(row);
    });
    return wrap;
  }
  function buildCitadelDistrictPanel(seed) {
    if (seed._isRegion) return buildRegionDossierPanel(seed);
    const r = districtPlace(seed);
    const dossier = h("aside", "dossier");
    const back = h("button", "dossier__back", "‹ &nbsp;Starfall Citadel");
    back.type = "button";
    back.addEventListener("click", closeSubmap);
    dossier.appendChild(back);
    const head = h("div");
    head.appendChild(h("div", "dossier__sector", r.sector + " · " + r.coord));
    head.appendChild(h("h1", "dossier__name", r.name));
    head.appendChild(h("div", "dossier__house", `<span class="dot"></span>${r.house}`));
    dossier.appendChild(head);
    dossier.appendChild(h("div", "dossier__rule"));
    dossier.appendChild(h("p", "dossier__blurb", r.blurb));
    const facts = h("div", "dossier__facts");
    r.facts.forEach(([k, v]) => facts.appendChild(h("div", "fact", `<span class="fact__k">${k}</span><span class="fact__v">${v}</span>`)));
    dossier.appendChild(facts);
    const zonesOn = seed.sub ? seed.sub.filter((a) => a.on && a.name) : [];
    if (zonesOn.length) {
      dossier.appendChild(h("div", "dossier__districtsHead", "Zones"));
      dossier.appendChild(buildZoneList(seed));
    }
    dossier.appendChild(h("div", "dossier__decree", "Semper ad astra"));
    return dossier;
  }
  // Region dossier (parallel to a Citadel district panel): blurb + facts + a
  // clickable list of the region's named zones (also the Voronoi tiles).
  function buildRegionDossierPanel(host) {
    const r = host.region;
    const dossier = h("aside", "dossier");
    const back = h("button", "dossier__back", "‹ &nbsp;Campus");
    back.type = "button";
    back.addEventListener("click", closeSubmap);
    dossier.appendChild(back);
    const head = h("div");
    head.appendChild(h("div", "dossier__sector", r.sector));
    head.appendChild(h("h1", "dossier__name", r.name));
    head.appendChild(h("div", "dossier__house", `<span class="dot"></span>${r.house}`));
    dossier.appendChild(head);
    dossier.appendChild(h("div", "dossier__rule"));
    dossier.appendChild(h("p", "dossier__blurb", r.blurb));
    const facts = h("div", "dossier__facts");
    r.facts.forEach(([k, v]) => facts.appendChild(h("div", "fact", `<span class="fact__k">${k}</span><span class="fact__v">${v}</span>`)));
    dossier.appendChild(facts);
    dossier.appendChild(h("div", "dossier__districtsHead", "Zones"));
    dossier.appendChild(buildZoneList(host));
    dossier.appendChild(h("div", "dossier__decree", "Semper ad astra"));
    return dossier;
  }
  function buildCitadelZonePanel(seed, sub) {
    const region = seed._isRegion;
    const dossier = h("aside", "dossier");
    const back = h("button", "dossier__back", "‹ &nbsp;" + seed.name);
    back.type = "button";
    back.addEventListener("click", deselectZone);
    dossier.appendChild(back);
    const nm = sub.name || sub.generic || ("Sub-area " + sub.tag);
    const head = h("div");
    head.appendChild(h("div", "dossier__sector", seed.name));
    head.appendChild(h("h1", "dossier__name dossier__name--zone", nm));
    head.appendChild(h("div", "dossier__house", `<span class="dot"></span>${region ? seed.house : "Starfall Citadel"}`));
    dossier.appendChild(head);
    dossier.appendChild(h("div", "dossier__rule"));
    if (sub.blurb) dossier.appendChild(h("p", "dossier__blurb", sub.blurb));
    else if (sub.generic && GENERIC_BLURBS[sub.generic]) dossier.appendChild(h("p", "dossier__blurb", GENERIC_BLURBS[sub.generic]));
    else dossier.appendChild(h("p", "dossier__blurb dossier__blurb--empty", "No record yet for this zone."));
    const facts = h("div", "dossier__facts");
    facts.appendChild(h("div", "fact", `<span class="fact__k">${region ? "Region" : "District"}</span><span class="fact__v">${seed.name}</span>`));
    dossier.appendChild(facts);
    dossier.appendChild(h("div", "dossier__decree", "Semper ad astra"));
    return dossier;
  }
  // Generic dossier for regions & special locations (unchanged behaviour).
  function buildGenericDossier(r, seeded, districts) {
    const dossier = h("aside", "dossier");
    const back = h("button", "dossier__back", dossierBackTo === "citadel" ? "‹ &nbsp;Starfall Citadel" : "‹ &nbsp;Campus");
    back.type = "button";
    back.addEventListener("click", closeSubmap);
    dossier.appendChild(back);
    const head = h("div");
    head.appendChild(h("div", "dossier__sector", r.sector + " · " + r.coord));
    head.appendChild(h("h1", "dossier__name", r.name));
    head.appendChild(h("div", "dossier__house", `<span class="dot"></span>${r.house}`));
    dossier.appendChild(head);
    dossier.appendChild(h("div", "dossier__rule"));
    dossier.appendChild(h("p", "dossier__blurb", r.blurb));
    const facts = h("div", "dossier__facts");
    r.facts.forEach(([k, v]) => facts.appendChild(h("div", "fact", `<span class="fact__k">${k}</span><span class="fact__v">${v}</span>`)));
    dossier.appendChild(facts);
    dossier.appendChild(h("div", "dossier__districtsHead", seeded ? "Districts & locations" : "Districts of the region"));
    const dlist = h("div", "dossier__districtList" + (districts.length > 6 ? " dossier__districtList--full" : ""));
    districts.forEach((d, i) => {
      const row = h("button", "distRow" + (d.special ? " distRow--special" : ""));
      row.type = "button"; row.dataset.idx = i;
      row.innerHTML =
        `<span class="distRow__tag">${d.tag}</span>` +
        `<span class="distRow__name">${d.name}</span>` +
        `<span class="distRow__blurb">${d.blurb}</span>`;
      row.addEventListener("mouseenter", () => toggleDistrict(i, true));
      row.addEventListener("mouseleave", () => toggleDistrict(i, false));
      dlist.appendChild(row);
    });
    dossier.appendChild(dlist);
    dossier.appendChild(h("div", "dossier__decree", "Semper ad astra"));
    return dossier;
  }

  function renderCitadelLegend() {
    const cit = REGIONS.find((r) => r.isCitadel);
    const list = byId("citadel-legend-list");
    if (!list || !cit) return;
    list.innerHTML = "";
    const row = (s, i) => {
      const b = h("button", "legend__item legend__item--compact" + (s.special ? " legend__item--loc" : ""));
      b.type = "button"; b.dataset.idx = i;
      const sw = s.special
        ? `<span class="legend__swatch legend__swatch--gold"></span>`
        : `<span class="legend__swatch" style="background:${s.color};box-shadow:0 0 5px ${s.color}"></span>`;
      b.innerHTML = sw +
        `<span class="legend__name">${s.name}</span>` +
        `<span class="legend__sector">${s.tag}</span>`;
      b.addEventListener("click", () => openDistrict(cit, i));
      b.addEventListener("mouseenter", () => highlightCitadelTile(i, true));
      b.addEventListener("mouseleave", () => highlightCitadelTile(i, false));
      return b;
    };
    cit.submap.seeds.forEach((s, i) => { if (!s.special) list.appendChild(row(s, i)); });
    const poi = cit.submap.seeds.filter((s) => s.special);
    if (poi.length) {
      list.appendChild(h("div", "legend__subhead", "Points of Interest"));
      cit.submap.seeds.forEach((s, i) => { if (s.special) list.appendChild(row(s, i)); });
    }
  }
  function highlightCitadelTile(i, on) {
    const n = gWorld.querySelector(`.subdistrict[data-idx="${i}"], .location[data-idx="${i}"]`);
    if (n) n.classList.toggle("is-active", on);
    const list = byId("citadel-legend-list");
    const row = list && list.querySelector(`[data-idx="${i}"]`);
    if (row) row.classList.toggle("is-active", on);
  }
  function showWorldMap() {
    mapMode = "world";
    worldSvg.setAttribute("viewBox", "0 0 1600 1200");
    worldSvg.setAttribute("width", "1600"); worldSvg.setAttribute("height", "1200");
    renderWorld();
    const lg = byId("legend"); if (lg) lg.hidden = false;
    const cl = byId("citadel-legend"); if (cl) cl.hidden = true;
    const mb = byId("mobile-citadel-back"); if (mb) mb.hidden = true;
    fitWorld();
    setCrumbs([{ label: "Campus" }]);
  }
  function showCitadelMap() {
    mapMode = "citadel";
    const cit = REGIONS.find((r) => r.isCitadel);
    worldSvg.setAttribute("viewBox", "0 0 1000 1200");
    worldSvg.setAttribute("width", "1000"); worldSvg.setAttribute("height", "1200");
    gWorld.innerHTML = "";
    drawTessellation(gWorld, cit.submap, {
      onPick: (idx) => { if (!dragMoved) openDistrict(cit, idx); },
      onHover: highlightCitadelTile,
    });
    const lg = byId("legend"); if (lg) lg.hidden = true;
    const cl = byId("citadel-legend"); if (cl) cl.hidden = false;
    const mb = byId("mobile-citadel-back"); if (mb) mb.hidden = false;
    fitWorld();
    setCrumbs([{ label: "Campus", go: exitCitadel }, { label: "Starfall Citadel" }]);
  }
  function swapMap(fn) {
    const cv = byId("canvas");
    cv.style.transition = "opacity .24s var(--ease-out)"; cv.style.opacity = "0";
    setTimeout(() => { fn(); requestAnimationFrame(() => { cv.style.opacity = "1"; }); }, 230);
  }
  // Rebuild the Citadel tessellation in place (used by the edit panel while the
  // user drags a district) — no view reset, keeps the current pan/zoom.
  function redrawCitadelTiles() {
    if (mapMode !== "citadel") return;
    gWorld.innerHTML = "";
    drawTessellation(gWorld, CIT.submap, {
      onPick: (idx) => { if (!dragMoved) openDistrict(CIT, idx); },
      onHover: highlightCitadelTile,
    });
    markSelectedTile();
  }
  function markSelectedTile() {
    gWorld.querySelectorAll(".subdistrict.is-sel, .location.is-sel").forEach((n) => n.classList.remove("is-sel"));
    if (citSel == null) return;
    const n = gWorld.querySelector(`.subdistrict[data-idx="${citSel}"], .location[data-idx="${citSel}"]`);
    if (n) n.classList.add("is-sel");
  }
  function enterCitadel() { swapMap(showCitadelMap); }
  function exitCitadel() { swapMap(showWorldMap); }
  function openDistrict(cit, idx) {
    dossierBackTo = "citadel";
    const seed0 = cit.submap.seeds[idx];
    // A point-of-interest with a `link` is the same place as a district zone:
    // jump straight to that district's dossier and select the linked zone.
    if (seed0.special && seed0.link) { openLocationZone(cit, seed0); return; }
    dossierBackTo = "citadel";
    const seed = cit.submap.seeds[idx];
    buildSubmap(districtPlace(seed));
    goToSub();
    setCrumbs([
      { label: "Campus", go: goCampus },
      { label: "Starfall Citadel", go: closeSubmap },
      { label: seed.name },
    ]);
  }

  /* A POI (Cloudless Tower, Scorpion House, …) resolves to a named zone inside a
     district. Open that district's dossier, then select the zone so the user
     lands on Campus › Starfall Citadel › <District> › <Zone>. */
  function openLocationZone(cit, seed) {
    const slug = seed.link[0], tag = seed.link[1];
    const di = cit.submap.seeds.findIndex((s) => s._slug === slug);
    if (di < 0) return;
    openDistrict(cit, di);
    const subsOn = (curDistrictField && curDistrictField.subsOn) || [];
    const k = subsOn.findIndex((a) => a.tag === tag);
    if (k >= 0) selectZone(subsOn[k], k);
  }

  function buildSubmap(r) {
    submap.innerHTML = "";
    curDistrictField = null;
    curZone = null;
    submap.classList.remove("is-zoneview");
    submap.setAttribute("data-house", r.house_color);

    // District tint for accents (Citadel districts carry their own colour).
    if (r._hc) { submap.style.setProperty("--hc-500", r._hc); submap.style.setProperty("--hc-300", r._hc); }
    else { submap.style.removeProperty("--hc-500"); submap.style.removeProperty("--hc-300"); }

    const sm = r.submap;
    const seeded = !!sm.seeds;
    const districts = seeded ? sm.seeds : sm.districts; // full list (drives the dossier)
    const padPct = (seeded || sm.outline) ? "2.5%" : "6%";
    // Citadel district OR an outer region — both render as a zone field/host.
    const zoneHost = sm._districtField ? sm._seed : (sm.outline ? regionHost(r) : null);

    /* ---- dossier ---- */
    if (zoneHost) {
      submap.appendChild(buildCitadelDistrictPanel(zoneHost));
    } else {
      submap.appendChild(buildGenericDossier(r, seeded, districts));
    }

    /* ---- field ---- */
    const field = h("div", "submap__field");
    const wm = h("div", "watermark");
    wm.innerHTML = `<img src="assets/crest-lines.png" alt="" />`;
    field.appendChild(wm);

    const [vw, vh] = sm.view;
    const svg = el("svg", {
      class: "world-svg", viewBox: `0 0 ${vw} ${vh}`,
      preserveAspectRatio: "xMidYMid meet",
      width: "100%", height: "100%", style: "position:relative;z-index:1;padding:" + padPct,
    });
    if (zoneHost) {
      const subsOn = renderDistrictField(svg, zoneHost, true);
      curDistrictField = { seed: zoneHost, field, svg, subsOn, isRegion: !!zoneHost._isRegion };
    } else {
      drawTessellation(svg, sm, { onHover: highlightDistrictRow });
    }
    field.appendChild(svg);
    submap.appendChild(field);
    if (tweaksOnDistrict) tweaksOnDistrict(zoneHost);
  }

  function toggleDistrict(i, on) {
    const node = submap.querySelector(`.subdistrict[data-idx="${i}"], .location[data-idx="${i}"]`);
    if (node) node.classList.toggle("is-active", on);
  }
  function highlightDistrictRow(i, on) {
    const row = submap.querySelector(`.distRow[data-idx="${i}"]`);
    if (row) row.classList.toggle("is-active", on);
    toggleDistrict(i, on);
  }

  /* ---- view transitions ---- */
  function openSubmap(id) {
    const r = REGIONS.find((x) => x.id === id);
    if (!r) return;
    dossierBackTo = "world";
    buildSubmap(r);
    goToSub();
    setCrumbs([{ label: "Campus", go: closeSubmap }, { label: r.name }]);
  }

  /* ---- breadcrumb ---- */
  function setCrumbs(parts) {
    const nav = byId("crumbs");
    if (!nav) return;
    nav.innerHTML = "";
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      if (i) nav.appendChild(h("span", "crumbs__sep", "›"));
      if (last || !p.go) {
        nav.appendChild(h("span", "crumbs__here", p.label));
      } else {
        const b = h("button", "crumbs__link", p.label);
        b.type = "button";
        b.addEventListener("click", p.go);
        nav.appendChild(b);
      }
    });
  }
  // Jump straight back to the world (Campus) map from anywhere.
  function goCampus() {
    var fb = byId("fit-btn"); if (fb) fb.hidden = false;
    if (!vSub.hidden) {
      vSub.classList.add("view--leave");
      setTimeout(() => {
        vSub.hidden = true; vSub.classList.remove("view--leave");
        showWorldMap();
        vWorld.hidden = false; vWorld.classList.add("view--enter");
        setTimeout(() => vWorld.classList.remove("view--enter"), 520);
      }, 220);
    } else if (mapMode === "citadel") {
      exitCitadel();
    }
  }

  function goToSub() {
    var fb = byId("fit-btn"); if (fb) fb.hidden = true; // dossiers have no zoom
    vWorld.classList.add("view--leave");
    setTimeout(() => {
      vWorld.hidden = true; vWorld.classList.remove("view--leave");
      vSub.hidden = false; vSub.classList.add("view--enter");
      setTimeout(() => vSub.classList.remove("view--enter"), 520);
    }, 220);
  }

  function closeSubmap() {
    var fb = byId("fit-btn"); if (fb) fb.hidden = false;
    vSub.classList.add("view--leave");
    setTimeout(() => {
      vSub.hidden = true; vSub.classList.remove("view--leave");
      vWorld.hidden = false; vWorld.classList.add("view--enter");
      setTimeout(() => vWorld.classList.remove("view--enter"), 520);
    }, 220);
    if (dossierBackTo === "citadel") setCrumbs([{ label: "Campus", go: exitCitadel }, { label: "Starfall Citadel" }]);
    else setCrumbs([{ label: "Campus" }]);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!vSub.hidden) closeSubmap();
    else if (mapMode === "citadel") exitCitadel();
  });

  /* =======================================================================
     TWEAKS  — host-protocol panel for the Citadel shield shape
     ======================================================================= */
  function updateShield() {
    if (!citadel) return;
    const d = shieldPath(citadel.cx, citadel.top, citadel.hw, citadel.h, shieldOpts());
    citadel.shape.setAttribute("d", d);
    citadel.sheen.setAttribute("d", d);
    citadel.hatch.setAttribute("d", d);
  }

  function initTweaks() {
    let editActive = false;
    const SPECS = [
      { key: "shieldSpike", label: "Top spike", min: 0, max: 0.18, step: 0.005 },
      { key: "shieldShoulder", label: "Shoulder convexity", min: -0.02, max: 0.16, step: 0.005 },
      { key: "shieldSide", label: "Side sweep height", min: 0.30, max: 0.62, step: 0.01, invert: true },
    ];
    // higher slider = higher sweep point feels natural, so invert that one
    const toSlider = (s, v) => (s.invert ? s.min + s.max - v : v);
    const fromSlider = (s, v) => (s.invert ? s.min + s.max - v : v);

    const panel = h("div", "tweaks");
    panel.hidden = true;
    panel.innerHTML =
      '<div class="tweaks__head">' +
        '<div class="tweaks__titles"><span class="tweaks__eyebrow">Cartographer\u2019s Tools</span>' +
        '<span class="tweaks__title">Map Studio</span></div>' +
        '<button type="button" class="tweaks__close" aria-label="Close">\u2715</button>' +
      '</div>' +
      '<div class="tweaks__body">' +
        '<div class="tweaks__section">' +
          '<div class="tweaks__legend">Citadel shield</div>' +
          '<div class="tweaks__rows" id="tw-shield"></div>' +
          '<button type="button" class="tweaks__reset" id="tw-shield-reset">Reset shield</button>' +
        '</div>' +
        '<div class="tweaks__section">' +
          '<div class="tweaks__legend">Region position</div>' +
          '<select class="tweaks__select" id="tw-reg-sel" aria-label="Region"></select>' +
          '<div class="tweaks__rows" id="tw-reg"></div>' +
          '<button type="button" class="tweaks__reset" id="tw-reg-reset">Reset this region</button>' +
        '</div>' +
        '<div class="tweaks__section">' +
          '<div class="tweaks__legend">District position</div>' +
          '<select class="tweaks__select" id="tw-dist-sel" aria-label="District"></select>' +
          '<div class="tweaks__rows" id="tw-dist"></div>' +
          '<button type="button" class="tweaks__reset" id="tw-dist-reset">Reset this district</button>' +
        '</div>' +
        '<div class="tweaks__section">' +
          '<div class="tweaks__legend">Sub-areas</div>' +
          '<div class="tweaks__hint2" id="tw-suba-hint">Open a district to edit its sub-areas.</div>' +
          '<div id="tw-suba-body" hidden>' +
            '<div class="tweaks__subname" id="tw-suba-name"></div>' +
            '<div class="tweaks__chips" id="tw-suba-chips"></div>' +
            '<label class="tweaks__check"><input type="checkbox" id="tw-suba-on" /> <span>Enabled</span></label>' +
            '<div class="tweaks__genwrap">' +
              '<div class="tweaks__sublabel">Assign generic type</div>' +
              '<div class="tweaks__genbtns" id="tw-suba-gen">' +
                '<button type="button" class="tweaks__gen" data-gen="Residential">Residential</button>' +
                '<button type="button" class="tweaks__gen" data-gen="Class Halls">Class Halls</button>' +
                '<button type="button" class="tweaks__gen" data-gen="Commercial">Commercial</button>' +
              '</div>' +
            '</div>' +
            '<div class="tweaks__rows" id="tw-suba-rows"></div>' +
            '<button type="button" class="tweaks__reset" id="tw-suba-reset">Reset this sub-area</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* ---- shield sliders ---- */
    const shieldBody = panel.querySelector("#tw-shield");
    SPECS.forEach((s) => {
      const row = h("label", "tweaks__row");
      row.innerHTML =
        `<span class="tweaks__label">${s.label}</span>` +
        `<input type="range" class="tweaks__slider" min="${s.min}" max="${s.max}" step="${s.step}" />` +
        `<span class="tweaks__val mono"></span>`;
      const input = row.querySelector("input");
      const val = row.querySelector(".tweaks__val");
      const sync = () => { input.value = toSlider(s, TWEAKS[s.key]); val.textContent = Math.round(TWEAKS[s.key] * 100); };
      input.addEventListener("input", () => {
        TWEAKS[s.key] = +fromSlider(s, +input.value).toFixed(3);
        val.textContent = Math.round(TWEAKS[s.key] * 100);
        updateShield();
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [s.key]: TWEAKS[s.key] } }, "*");
      });
      s._sync = sync; sync();
      shieldBody.appendChild(row);
    });
    panel.querySelector("#tw-shield-reset").addEventListener("click", () => {
      const edits = {};
      SPECS.forEach((s) => { TWEAKS[s.key] = TWEAK_DEFAULTS[s.key]; edits[s.key] = TWEAKS[s.key]; s._sync(); });
      updateShield();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    });

    /* ---- region position editor (campus Voronoi seeds + Citadel shield) ---- */
    const regSel = panel.querySelector("#tw-reg-sel");
    CAMPUS_SEEDS.forEach((s) => {
      const r = REGIONS.find((R) => R.id === s.id);
      const o = document.createElement("option"); o.value = s.id; o.textContent = r ? r.name : s.id;
      regSel.appendChild(o);
    });
    const citOpt = document.createElement("option"); citOpt.value = "__citadel"; citOpt.textContent = "Starfall Citadel (shield)";
    regSel.appendChild(citOpt);
    const gHouses = document.createElement("optgroup"); gHouses.label = "House plaques";
    CAMPUS_POIS.forEach((p) => {
      const o = document.createElement("option"); o.value = "house:" + p.id; o.textContent = p.name;
      gHouses.appendChild(o);
    });
    regSel.appendChild(gHouses);

    // Build the per-selection control spec: each row reads/writes live data and
    // persists under its key; renderWorld() redraws (and rebuilds the shield).
    function regionSpec(id) {
      if (id.indexOf("house:") === 0) {
        const p = CAMPUS_POIS.find((x) => x.id === id.slice(6));
        return [
          { label: "X", min: 60, max: 1540, get: () => p.x, set: (v) => (p.x = v), key: "hx_" + p.id },
          { label: "Y", min: 80, max: 1160, get: () => p.y, set: (v) => (p.y = v), key: "hy_" + p.id },
        ];
      }
      if (id === "__citadel") {
        const c = CITADEL_PLACE;
        return [
          { label: "X", min: 200, max: 1400, get: () => c.cx, set: (v) => (c.cx = v), key: "ccx" },
          { label: "Y (top)", min: 380, max: 1080, get: () => c.top, set: (v) => (c.top = v), key: "ctop" },
          { label: "Width", min: 50, max: 280, get: () => c.hw, set: (v) => (c.hw = v), key: "chw" },
          { label: "Height", min: 90, max: 420, get: () => c.h, set: (v) => (c.h = v), key: "ch" },
        ];
      }
      const s = CAMPUS_SEEDS.find((x) => x.id === id);
      return [
        { label: "X", min: 60, max: 1540, get: () => s.x, set: (v) => (s.x = v), key: "rx_" + id },
        { label: "Y", min: 80, max: 1160, get: () => s.y, set: (v) => (s.y = v), key: "ry_" + id },
        { label: "Weight", min: -100, max: 100, get: () => s.w, set: (v) => (s.w = v), key: "rw_" + id },
        { label: "Label X", min: -420, max: 420, get: () => s.ldx, set: (v) => (s.ldx = v), key: "rlx_" + id },
        { label: "Label Y", min: -420, max: 420, get: () => s.ldy, set: (v) => (s.ldy = v), key: "rly_" + id },
      ];
    }
    const regBody = panel.querySelector("#tw-reg");
    let regSelId = CAMPUS_SEEDS[0].id;
    function markSelectedRegion() {
      gWorld.querySelectorAll(".region.is-sel, .campus-poi.is-sel").forEach((n) => n.classList.remove("is-sel"));
      if (regSelId.indexOf("house:") === 0) {
        const n = gWorld.querySelector(`.campus-poi[data-poi="${regSelId.slice(6)}"]`);
        if (n) n.classList.add("is-sel");
        return;
      }
      const id = regSelId === "__citadel" ? REGIONS.find((R) => R.isCitadel).id : regSelId;
      const n = gWorld.querySelector(`.region[data-id="${id}"]`);
      if (n) n.classList.add("is-sel");
    }
    function buildRegionRows() {
      regBody.innerHTML = "";
      const spec = regionSpec(regSelId);
      spec.forEach((p) => {
        const row = h("label", "tweaks__row");
        row.innerHTML =
          `<span class="tweaks__label">${p.label}</span>` +
          `<input type="range" class="tweaks__slider" min="${p.min}" max="${p.max}" step="1" />` +
          `<span class="tweaks__val mono"></span>`;
        const input = row.querySelector("input");
        const val = row.querySelector(".tweaks__val");
        input.value = p.get(); val.textContent = Math.round(p.get());
        input.addEventListener("input", () => {
          const v = +input.value; val.textContent = v; p.set(v);
          TWEAKS[p.key] = v;
          renderWorld(); markSelectedRegion();
          window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [p.key]: v } }, "*");
        });
        regBody.appendChild(row);
      });
    }
    function selectRegion(id) {
      regSelId = id; regSel.value = id;
      if (mapMode !== "world") exitCitadel();
      buildRegionRows(); markSelectedRegion();
    }
    regSel.addEventListener("change", () => selectRegion(regSel.value));
    panel.querySelector("#tw-reg-reset").addEventListener("click", () => {
      const edits = {};
      if (regSelId.indexOf("house:") === 0) {
        const p = CAMPUS_POIS.find((x) => x.id === regSelId.slice(6)), d = p._d0;
        p.x = d.x; p.y = d.y;
        [["hx_", d.x], ["hy_", d.y]].forEach(([k, v]) => { delete TWEAKS[k + p.id]; edits[k + p.id] = v; });
      } else if (regSelId === "__citadel") {
        const c = CITADEL_PLACE, d = c._d0;
        c.cx = d.cx; c.top = d.top; c.hw = d.hw; c.h = d.h;
        ["ccx", "ctop", "chw", "ch"].forEach((k, i) => { delete TWEAKS[k]; edits[k] = [d.cx, d.top, d.hw, d.h][i]; });
      } else {
        const s = CAMPUS_SEEDS.find((x) => x.id === regSelId), d = s._d0;
        s.x = d.x; s.y = d.y; s.w = d.w; s.ldx = d.ldx; s.ldy = d.ldy;
        [["rx_", d.x], ["ry_", d.y], ["rw_", d.w], ["rlx_", d.ldx], ["rly_", d.ldy]].forEach(([p, v]) => { delete TWEAKS[p + regSelId]; edits[p + regSelId] = v; });
      }
      renderWorld(); buildRegionRows(); markSelectedRegion();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    });
    buildRegionRows();

    /* ---- district position editor ---- */
    const sel = panel.querySelector("#tw-dist-sel");
    const gD = document.createElement("optgroup"); gD.label = "Districts";
    const gP = document.createElement("optgroup"); gP.label = "Points of Interest";
    let firstDistrict = null;
    CIT_SEEDS.forEach((s, i) => {
      const o = document.createElement("option"); o.value = String(i); o.textContent = s.name;
      (s.special ? gP : gD).appendChild(o);
      if (!s.special && firstDistrict == null) firstDistrict = i;
    });
    sel.appendChild(gD); sel.appendChild(gP);

    const POS = [
      { axis: "x", label: "X", min: 0, max: 1000, step: 1, prop: "x", key: (s) => "px_" + s._slug },
      { axis: "y", label: "Y", min: 0, max: 1200, step: 1, prop: "y", key: (s) => "py_" + s._slug },
      { axis: "w", label: "Weight", min: -100, max: 100, step: 1, prop: "w", key: (s) => "pw_" + s._slug },
      { axis: "ldx", label: "Label X", min: -260, max: 260, step: 1, prop: "labelDx", key: (s) => "ldx_" + s._slug, labelOnly: true },
      { axis: "ldy", label: "Label Y", min: -260, max: 260, step: 1, prop: "labelDy", key: (s) => "ldy_" + s._slug, labelOnly: true },
    ];
    const distBody = panel.querySelector("#tw-dist");
    const ctrls = POS.map((p) => {
      const row = h("label", "tweaks__row");
      row.innerHTML =
        `<span class="tweaks__label">${p.label}</span>` +
        `<input type="range" class="tweaks__slider" min="${p.min}" max="${p.max}" step="${p.step}" />` +
        `<span class="tweaks__val mono"></span>`;
      const input = row.querySelector("input");
      const val = row.querySelector(".tweaks__val");
      input.addEventListener("input", () => {
        const seed = CIT_SEEDS[citSel]; if (!seed) return;
        const v = +input.value; val.textContent = v;
        seed[p.prop] = v;
        const k = p.key(seed); TWEAKS[k] = v;
        redrawCitadelTiles();
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
      });
      distBody.appendChild(row);
      return { p, input, val };
    });

    function syncDistControls() {
      const seed = CIT_SEEDS[citSel]; if (!seed) return;
      ctrls.forEach((c) => {
        // weight and label-nudge don't apply to floating POIs
        const na = (c.p.axis === "w" || c.p.labelOnly) && seed.special;
        if (na) { c.input.disabled = true; c.input.value = 0; c.val.textContent = "—"; c.input.closest(".tweaks__row").style.opacity = ".4"; }
        else { c.input.disabled = false; c.input.value = seed[c.p.prop] || 0; c.val.textContent = Math.round(seed[c.p.prop] || 0); c.input.closest(".tweaks__row").style.opacity = "1"; }
      });
    }
    function focusTile(seed) {
      if (!seed) return;
      scale = clampScale(1.3);
      tx = -(seed.x - 500) * scale - 150;
      ty = -(seed.y - 600) * scale;
      apply();
    }
    function selectDistrict(i, doFocus) {
      citSel = i; sel.value = String(i);
      if (mapMode !== "citadel") showCitadelMap();
      syncDistControls(); markSelectedTile();
      if (doFocus) focusTile(CIT_SEEDS[i]);
    }
    sel.addEventListener("change", () => selectDistrict(+sel.value, true));
    panel.querySelector("#tw-dist-reset").addEventListener("click", () => {
      const seed = CIT_SEEDS[citSel]; if (!seed) return;
      const edits = {};
      ["x", "y", "w"].forEach((a) => {
        if (a === "w" && seed.special) return;
        seed[a] = seed["_" + a + "0"];
        const k = "p" + a + "_" + seed._slug; delete TWEAKS[k]; edits[k] = seed["_" + a + "0"];
      });
      if (!seed.special) {
        seed.labelDx = seed._ldx0; seed.labelDy = seed._ldy0;
        delete TWEAKS["ldx_" + seed._slug]; edits["ldx_" + seed._slug] = seed._ldx0;
        delete TWEAKS["ldy_" + seed._slug]; edits["ldy_" + seed._slug] = seed._ldy0;
      }
      redrawCitadelTiles(); syncDistControls();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    });
    if (firstDistrict != null) { citSel = firstDistrict; sel.value = String(firstDistrict); syncDistControls(); }

    /* ---- sub-area editor (operates on the open district dossier) ---- */
    const subBody = panel.querySelector("#tw-suba-body");
    const subHint = panel.querySelector("#tw-suba-hint");
    const subNameEl = panel.querySelector("#tw-suba-name");
    const subChips = panel.querySelector("#tw-suba-chips");
    const subOn = panel.querySelector("#tw-suba-on");
    const subRowsEl = panel.querySelector("#tw-suba-rows");
    let subSeed = null, subSel = 0;
    const SUBPOS = [
      { axis: "x", label: "X", min: 0, max: 1000, step: 1 },
      { axis: "y", label: "Y", min: 0, max: 760, step: 1 },
      { axis: "w", label: "Weight", min: -100, max: 100, step: 1 },
      { axis: "lx", label: "Label X", min: -240, max: 240, step: 1 },
      { axis: "ly", label: "Label Y", min: -240, max: 240, step: 1 },
    ];
    const subCtrls = SUBPOS.map((p) => {
      const row = h("label", "tweaks__row");
      row.innerHTML =
        `<span class="tweaks__label">${p.label}</span>` +
        `<input type="range" class="tweaks__slider" min="${p.min}" max="${p.max}" step="${p.step}" />` +
        `<span class="tweaks__val mono"></span>`;
      const input = row.querySelector("input");
      const val = row.querySelector(".tweaks__val");
      input.addEventListener("input", () => {
        if (!subSeed) return;
        const a = subSeed.sub[subSel]; if (!a) return;
        const v = +input.value; val.textContent = v; a[p.axis] = v;
        const k = "s" + p.axis + "_" + subSeed._slug + "_" + a.tag.toLowerCase();
        TWEAKS[k] = v;
        refreshDistrictField();
        window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
      });
      subRowsEl.appendChild(row);
      return { p, input, val };
    });
    function syncSubControls() {
      if (!subSeed) return;
      const a = subSeed.sub[subSel]; if (!a) return;
      subOn.checked = !!a.on;
      subCtrls.forEach((c) => {
        const off = !a.on;
        c.input.disabled = off; c.input.value = a[c.p.axis] || 0;
        c.val.textContent = Math.round(a[c.p.axis] || 0);
        c.input.closest(".tweaks__row").style.opacity = off ? ".4" : "1";
      });
      genBtns.forEach((b) => b.classList.toggle("is-active", a.generic === b.getAttribute("data-gen")));
    }
    function renderSubChips() {
      subChips.innerHTML = "";
      if (!subSeed) return;
      subSeed.sub.forEach((a, i) => {
        const c = h("button", "tweaks__chip" + (i === subSel ? " is-sel" : "") + (a.on ? "" : " is-off"));
        c.type = "button"; c.textContent = a.tag;
        c.addEventListener("click", () => { subSel = i; renderSubChips(); syncSubControls(); });
        subChips.appendChild(c);
      });
    }
    const genBtns = [...panel.querySelectorAll("#tw-suba-gen .tweaks__gen")];
    genBtns.forEach((btn) => btn.addEventListener("click", () => {
      if (!subSeed) return;
      const a = subSeed.sub[subSel]; if (!a) return;
      const type = btn.getAttribute("data-gen");
      const base = "_" + subSeed._slug + "_" + a.tag.toLowerCase();
      if (a.generic === type) { a.generic = null; TWEAKS["gen" + base] = ""; }
      else { a.generic = type; TWEAKS["gen" + base] = type; }
      refreshDistrictField();
      syncSubControls();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { ["gen" + base]: TWEAKS["gen" + base] } }, "*");
    }));
    subOn.addEventListener("change", () => {
      if (!subSeed) return;
      const a = subSeed.sub[subSel]; if (!a) return;
      a.on = subOn.checked;
      const k = "son_" + subSeed._slug + "_" + a.tag.toLowerCase();
      TWEAKS[k] = a.on ? 1 : 0;
      // toggling changes the enabled set → re-render the field in place
      refreshDistrictField();
      renderSubChips(); syncSubControls();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: TWEAKS[k] } }, "*");
    });
    panel.querySelector("#tw-suba-reset").addEventListener("click", () => {
      if (!subSeed) return;
      const a = subSeed.sub[subSel]; if (!a) return;
      const edits = {};
      ["x", "y", "w", "lx", "ly"].forEach((ax) => { a[ax] = a._d0[ax]; const k = "s" + ax + "_" + subSeed._slug + "_" + a.tag.toLowerCase(); delete TWEAKS[k]; edits[k] = a._d0[ax]; });
      a.on = a._d0.on; const ko = "son_" + subSeed._slug + "_" + a.tag.toLowerCase(); delete TWEAKS[ko]; edits[ko] = a._d0.on ? 1 : 0;
      a.generic = a._d0.generic || null; const kg = "gen_" + subSeed._slug + "_" + a.tag.toLowerCase(); delete TWEAKS[kg]; edits[kg] = a._d0.generic || "";
      refreshDistrictField();
      renderSubChips(); syncSubControls();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    });
    // hook called by buildSubmap whenever a district dossier opens/closes
    tweaksOnDistrict = function (seed) {
      subSeed = seed; subSel = 0;
      if (seed) {
        subHint.hidden = true; subBody.hidden = false;
        subNameEl.textContent = seed.name;
        // Regions have no generics / enable toggle — hide those controls for them.
        const isReg = !!seed._isRegion;
        const gw = panel.querySelector(".tweaks__genwrap"); if (gw) gw.style.display = isReg ? "none" : "";
        const ck = subOn.closest(".tweaks__check"); if (ck) ck.style.display = isReg ? "none" : "";
        renderSubChips(); syncSubControls();
        if (editActive) submap.classList.add("is-subediting");
      } else {
        subBody.hidden = true; subHint.hidden = false;
        submap.classList.remove("is-subediting");
      }
    };

    // drift the world-map citadel into view (left of the panel) on first open
    function focusCitadel() {
      if (!citadel || mapMode !== "world") return;
      scale = clampScale(1.15);
      const cy = citadel.top + citadel.h / 2;
      tx = -(citadel.cx - 800) * scale - 160;
      ty = -(cy - 600) * scale;
      apply();
    }

    const clearRegionSel = () => gWorld.querySelectorAll(".region.is-sel").forEach((n) => n.classList.remove("is-sel"));
    const dismiss = () => { panel.hidden = true; editActive = false; submap.classList.remove("is-subediting"); clearRegionSel(); window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); };
    panel.querySelector(".tweaks__close").addEventListener("click", dismiss);
    window.addEventListener("message", (e) => {
      const t = e && e.data && e.data.type;
      if (t === "__activate_edit_mode") { editActive = true; SPECS.forEach((s) => s._sync()); syncDistControls(); panel.hidden = false; if (curDistrictField) submap.classList.add("is-subediting"); else focusCitadel(); }
      else if (t === "__deactivate_edit_mode") { editActive = false; panel.hidden = true; submap.classList.remove("is-subediting"); clearRegionSel(); }
    });
    byId("atlas").appendChild(panel);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
  }

  /* ---- boot ---- */
  applyCitadelOverrides();
  applyCampusOverrides();
  applyCampusPoiOverrides();
  applyRegionZoneOverrides();
  renderWorld();
  renderLegend();
  renderCitadelLegend();
  fitWorld();
  setCrumbs([{ label: "Campus" }]);
  initTweaks();
  var cBack = byId("citadel-back"); if (cBack) cBack.addEventListener("click", exitCitadel);
  var mBack = byId("mobile-citadel-back"); if (mBack) mBack.addEventListener("click", exitCitadel);
  if (window.lucide) lucide.createIcons();

  /* ---- search-menu focus bridge ---- */
  window.addEventListener("message", (e) => {
    const d = e && e.data;
    if (!d || d.type !== "sf-map-focus") return;
    if (d.isCitadel) {
      enterCitadel();
      if (d.districtName) {
        const cit = REGIONS.find((r) => r.isCitadel);
        if (cit) {
          const idx = cit.submap.seeds.findIndex((s) => s.name === d.districtName);
          if (idx >= 0) setTimeout(() => openDistrict(cit, idx), 350);
        }
      }
    } else if (d.regionId) {
      openSubmap(d.regionId);
    }
  });
})();
