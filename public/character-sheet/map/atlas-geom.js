/* ===========================================================================
   Starfall Atlas — geometry & SVG-builder engine
   ---------------------------------------------------------------------------
   Pure, stateless helpers shared by every layer of the atlas. Nothing here
   touches app state, the DOM tree, or event handlers — it's all math and
   element construction. Exposed on `window.AtlasGeom`; app.js destructures the
   names it needs at the top, so call sites read identically (`el(...)`,
   `tilePath(...)`, etc.).

     el / h            – SVG + HTML element builders
     centroid          – area-weighted polygon centroid (point-string in)
     toPts             – "x,y x,y" → [[x,y],…]
     insetPoints       – uniform inward edge offset (constant-width seams)
     roundedPath       – rounded-corner SVG path from points
     tilePath          – toPts → insetPoints → roundedPath (the inlaid look)
     bbox              – bounding box of a point-string
     shieldPath        – heraldic heater-shield path (the Citadel crest shape)
     shieldOutline     – same shield sampled as a polygon (Voronoi clip region)
     clipHalfPlane     – Sutherland–Hodgman half-plane clip (power-weighted)
     voronoiCells      – clipped (Laguerre) Voronoi cells for weighted seeds
     splitLabel        – balance a name onto two lines
   =========================================================================== */
(function () {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, children) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (children) [].concat(children).forEach((c) => c && n.appendChild(c));
    return n;
  }
  function h(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function centroid(pointStr) {
    const pts = pointStr.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    let x = 0, y = 0, a = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const cross = x0 * y1 - x1 * y0;
      a += cross; x += (x0 + x1) * cross; y += (y0 + y1) * cross;
    }
    if (Math.abs(a) < 1e-6) { // degenerate -> average
      const avg = pts.reduce((m, p) => [m[0] + p[0], m[1] + p[1]], [0, 0]);
      return [avg[0] / pts.length, avg[1] / pts.length];
    }
    a *= 0.5; return [x / (6 * a), y / (6 * a)];
  }

  /* ---- tile geometry: inset + rounded corners ---------------------------
     Turns a raw polygon point-string into a softened, slightly inset path so
     each region reads as an inlaid gilded tile rather than a flat polygon. */
  function toPts(str) { return str.trim().split(/\s+/).map((p) => p.split(",").map(Number)); }
  /* Uniform inward offset: every edge is pushed in by the SAME perpendicular
     distance d, so the gap between two adjacent tiles is a constant 2·d
     everywhere — no angle-dependent unevenness or overlaps. */
  function insetPoints(pts, d) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    // signed area → winding, so we know which way "inward" is
    let area = 0;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      area += x0 * y1 - x1 * y0;
    }
    const s = area >= 0 ? 1 : -1;
    // each edge becomes a line offset inward by d: point + unit direction
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const nx = -dy * s, ny = dx * s; // inward normal
      lines.push({ x: a[0] + nx * d, y: a[1] + ny * d, dx, dy });
    }
    // new vertex i = intersection of offset edges (i-1) and (i)
    const out = [];
    for (let i = 0; i < n; i++) {
      const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
      const den = l1.dx * l2.dy - l1.dy * l2.dx;
      const o = pts[i];
      if (Math.abs(den) < 1e-6) { out.push([l2.x, l2.y]); continue; } // parallel
      const t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / den;
      let vx = l1.x + t * l1.dx, vy = l1.y + t * l1.dy;
      // miter clamp so sharp concave corners don't spike out
      const md = Math.hypot(vx - o[0], vy - o[1]), max = d * 3.5;
      if (md > max) { vx = o[0] + (vx - o[0]) / md * max; vy = o[1] + (vy - o[1]) / md * max; }
      out.push([vx, vy]);
    }
    return out;
  }
  function roundedPath(pts, r) {
    const n = pts.length; let d = "";
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
      const v1 = [prev[0] - cur[0], prev[1] - cur[1]], v2 = [next[0] - cur[0], next[1] - cur[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const a = [cur[0] + (v1[0] / l1) * rr, cur[1] + (v1[1] / l1) * rr];
      const b = [cur[0] + (v2[0] / l2) * rr, cur[1] + (v2[1] / l2) * rr];
      d += (i === 0 ? "M" : "L") + a[0].toFixed(1) + "," + a[1].toFixed(1) + " ";
      d += "Q" + cur[0].toFixed(1) + "," + cur[1].toFixed(1) + " " + b[0].toFixed(1) + "," + b[1].toFixed(1) + " ";
    }
    return d + "Z";
  }
  // raw points -> inlaid tile path
  function tilePath(points, inset, radius) {
    return roundedPath(insetPoints(toPts(points), inset), radius);
  }

  function bbox(points) {
    const p = toPts(points);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    p.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
    return { minX, minY, maxX, maxY };
  }

  /* Heraldic heater shield (matches the crest): a small point at top-centre,
     convex shoulders curving up to rounded top corners, straight sides, then a
     smooth sweep down to a soft point at the bottom. cx = centre x, top = top
     edge y, hw = half-width, h = full height to the bottom point. The three
     `o` factors are user-tweakable (see TWEAK_DEFAULTS):
       o.spike    – top-point height as a fraction of h
       o.shoulder – convex bow of the shoulder sweeps (fraction of h)
       o.side     – how far down the sides run before sweeping in (fraction) */
  function shieldPath(cx, top, hw, h, o) {
    o = o || {};
    const peak = h * (o.spike != null ? o.spike : 0.075);
    const cornerY = top + h * 0.03;
    const sideY = top + h * (o.side != null ? o.side : 0.46);
    const bot = top + h;
    const bulge = h * (o.shoulder != null ? o.shoulder : 0.06); // convex rise of the shoulders
    const L = cx - hw, R = cx + hw, tp = top - peak, cr = hw * 0.16;
    // shoulder chord endpoints (just shy of the rounded corners)
    const lcx = L + cr * 0.5, lcy = cornerY - cr * 0.5;
    const rcx = R - cr * 0.5, rcy = cornerY - cr * 0.5;
    // control points = chord midpoints raised by `bulge` for a clean convex bow
    const lmx = (cx + lcx) / 2, lmy = (tp + lcy) / 2 - bulge;
    const rmx = (cx + rcx) / 2, rmy = (tp + rcy) / 2 - bulge;
    return [
      `M${cx},${tp}`,
      `Q${lmx.toFixed(1)},${lmy.toFixed(1)} ${lcx.toFixed(1)},${lcy.toFixed(1)}`,    // convex shoulder ↘
      `Q${L},${cornerY} ${L},${cornerY + cr}`,                                        // round left corner
      `L${L},${sideY}`,                                                               // left side
      `C${L},${bot - h * 0.16} ${cx - hw * 0.22},${bot - h * 0.05} ${cx},${bot}`,     // sweep to bottom point
      `C${cx + hw * 0.22},${bot - h * 0.05} ${R},${bot - h * 0.16} ${R},${sideY}`,    // sweep up right
      `L${R},${cornerY + cr}`,                                                        // right side
      `Q${R},${cornerY} ${rcx.toFixed(1)},${rcy.toFixed(1)}`,                          // round right corner
      `Q${rmx.toFixed(1)},${rmy.toFixed(1)} ${cx},${tp}`,                              // convex shoulder ↗
      "Z",
    ].join(" ");
  }

  /* Heater-shield OUTLINE as a polygon (samples the same curves shieldPath
     draws) — used as the clip region for the Citadel's Voronoi tessellation. */
  function shieldOutline(cx, top, hw, h, o, steps) {
    o = o || {}; steps = steps || 12;
    const peak = h * (o.spike != null ? o.spike : 0.095);
    const cornerY = top + h * 0.03;
    const sideY = top + h * (o.side != null ? o.side : 0.40);
    const bot = top + h;
    const bulge = h * (o.shoulder != null ? o.shoulder : -0.02);
    const L = cx - hw, R = cx + hw, tp = top - peak, cr = hw * 0.16;
    // Tiny flat cap at the apex: the union of the rounded Voronoi cells would
    // otherwise lean the needle-sharp tip (its two edges aren't symmetric).
    // A short horizontal top edge makes the top district round cleanly & evenly.
    const cap = hw * 0.022;
    const apexL = [cx - cap, tp], apexR = [cx + cap, tp];
    const lcx = L + cr * 0.5, lcy = cornerY - cr * 0.5;
    const rcx = R - cr * 0.5, rcy = cornerY - cr * 0.5;
    const lmx = (apexL[0] + lcx) / 2, lmy = (tp + lcy) / 2 - bulge;
    const rmx = (apexR[0] + rcx) / 2, rmy = (tp + rcy) / 2 - bulge;
    const pts = [];
    const quad = (p0, p1, p2, n) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } };
    const cubic = (p0, p1, p2, p3, n) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } };
    pts.push(apexL);
    quad(apexL, [lmx, lmy], [lcx, lcy], steps);
    quad([lcx, lcy], [L, cornerY], [L, cornerY + cr], 4);
    pts.push([L, sideY]);
    cubic([L, sideY], [L, bot - h * 0.16], [cx - hw * 0.22, bot - h * 0.05], [cx, bot], steps);
    cubic([cx, bot], [cx + hw * 0.22, bot - h * 0.05], [R, bot - h * 0.16], [R, sideY], steps);
    pts.push([R, cornerY + cr]);
    quad([R, cornerY + cr], [R, cornerY], [rcx, rcy], 4);
    quad([rcx, rcy], [rmx, rmy], apexR, steps);
    return pts;
  }

  /* Clip a polygon to the half-plane of points nearer to seed `a` than `b`,
     optionally power-weighted: `dw` = w_a − w_b shifts the dividing line toward
     the lower-weighted seed, so a higher-weighted cell grows (Laguerre/power
     diagram). dw is in squared-pixel units; cells stay convex and gapless. */
  function clipHalfPlane(poly, a, b, dw) {
    const nx = 2 * (b[0] - a[0]), ny = 2 * (b[1] - a[1]);
    const c = (b[0] * b[0] + b[1] * b[1]) - (a[0] * a[0] + a[1] * a[1]) + (dw || 0);
    const inside = (p) => nx * p[0] + ny * p[1] <= c;
    const cut = (p, q) => {
      const dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c;
      const t = dp / (dp - dq);
      return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    };
    const out = []; const n = poly.length;
    for (let i = 0; i < n; i++) {
      const cur = poly[i], prev = poly[(i - 1 + n) % n];
      const ci = inside(cur), pi = inside(prev);
      if (ci) { if (!pi) out.push(cut(prev, cur)); out.push(cur); }
      else if (pi) { out.push(cut(prev, cur)); }
    }
    return out;
  }

  /* Voronoi cells (clipped to `outline`) for an array of {x,y,w?} seeds. An
     optional per-seed weight `w` (friendly ~±60 scale) grows/shrinks the cell
     without moving its seed. Returns a point-string per seed for tilePath(). */
  const WEIGHT_SCALE = 190; // px² per unit of friendly weight
  function voronoiCells(seeds, outline) {
    return seeds.map((s, i) => {
      let poly = outline.slice();
      for (let j = 0; j < seeds.length && poly.length >= 3; j++) {
        if (j === i) continue;
        const dw = ((s.w || 0) - (seeds[j].w || 0)) * WEIGHT_SCALE;
        poly = clipHalfPlane(poly, [s.x, s.y], [seeds[j].x, seeds[j].y], dw);
      }
      return poly.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    });
  }

  /* Pole of inaccessibility: the point INSIDE a polygon farthest from any edge
     — the visually "fattest" open spot, i.e. where a label sits most centred.
     Grid-subdivision search (after Mapbox's polylabel). `points` is a polygon
     point-string; returns [x, y]. Far better than the seed point or the area
     centroid for placing labels in irregular Voronoi cells. */
  function polylabel(points, precision) {
    const poly = toPts(points);
    if (poly.length < 3) return centroid(points);
    precision = precision || 4;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of poly) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }
    const width = maxX - minX, height = maxY - minY;
    const cellSize = Math.max(1e-6, Math.min(width, height));
    let hh = cellSize / 2;

    function segDistSq(px, py, a, b) {
      let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
      if (dx || dy) {
        const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
      }
      dx = px - x; dy = py - y; return dx * dx + dy * dy;
    }
    function pointToPolyDist(x, y) {
      let inside = false, minSq = Infinity;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        minSq = Math.min(minSq, segDistSq(x, y, a, b));
      }
      return (inside ? 1 : -1) * Math.sqrt(minSq);
    }
    const mkCell = (x, y, hc) => { const d = pointToPolyDist(x, y); return { x, y, h: hc, d, max: d + hc * Math.SQRT2 }; };

    const queue = [];
    for (let x = minX; x < maxX; x += cellSize)
      for (let y = minY; y < maxY; y += cellSize)
        queue.push(mkCell(x + hh, y + hh, hh));
    const c = centroid(points);
    let best = mkCell(c[0], c[1], 0);
    const bbCell = mkCell(minX + width / 2, minY + height / 2, 0);
    if (bbCell.d > best.d) best = bbCell;

    let guard = 0;
    while (queue.length && guard++ < 8000) {
      // pop the most promising cell
      let bi = 0;
      for (let i = 1; i < queue.length; i++) if (queue[i].max > queue[bi].max) bi = i;
      const cell = queue.splice(bi, 1)[0];
      if (cell.d > best.d) best = cell;
      if (cell.max - best.d <= precision) continue;
      hh = cell.h / 2;
      queue.push(mkCell(cell.x - hh, cell.y - hh, hh));
      queue.push(mkCell(cell.x + hh, cell.y - hh, hh));
      queue.push(mkCell(cell.x - hh, cell.y + hh, hh));
      queue.push(mkCell(cell.x + hh, cell.y + hh, hh));
    }
    return [best.x, best.y];
  }

  // split a long label into two balanced lines
  function splitLabel(name, force) {
    if (!force && name.length <= 11) return [name];
    const words = name.split(" ");
    if (words.length === 1) return [name];
    let best = 1, bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ").length;
      const b = words.slice(i).join(" ").length;
      if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }

  // Closed Catmull-Rom spline through `pts`, sampled `per` points per segment —
  // turns an angular control polygon into a smooth rounded outline.
  function smoothClosed(pts, per) {
    per = per || 14;
    const n = pts.length, out = [];
    if (n < 3) return pts.slice();
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let t = 0; t < per; t++) {
        const s = t / per, s2 = s * s, s3 = s2 * s;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
        out.push([x, y]);
      }
    }
    return out;
  }

  window.AtlasGeom = {
    el, h, centroid, toPts, insetPoints, roundedPath, tilePath, bbox,
    shieldPath, shieldOutline, clipHalfPlane, voronoiCells, polylabel, splitLabel, smoothClosed,
  };
})();
