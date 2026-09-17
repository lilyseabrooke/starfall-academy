/* ===========================================================================
   Starfall Atlas — geometry & SVG-path engine (typed port of atlas-geom.js)
   ---------------------------------------------------------------------------
   Pure, stateless helpers shared by every layer of the atlas. No DOM, no app
   state — all math and path/point-string construction.
   =========================================================================== */
import type { Point } from "./types";

export function centroid(pointStr: string): Point {
  const pts = pointStr.trim().split(/\s+/).map((p) => p.split(",").map(Number) as Point);
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross; x += (x0 + x1) * cross; y += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    const avg = pts.reduce((m, p) => [m[0] + p[0], m[1] + p[1]] as Point, [0, 0] as Point);
    return [avg[0] / pts.length, avg[1] / pts.length];
  }
  a *= 0.5;
  return [x / (6 * a), y / (6 * a)];
}

export function toPts(str: string): Point[] {
  return str.trim().split(/\s+/).map((p) => p.split(",").map(Number) as Point);
}

export function ptsToStr(pts: Point[]): string {
  return pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
}

/* Uniform inward offset: every edge is pushed in by the SAME perpendicular
   distance d, so the gap between two adjacent tiles is a constant 2·d
   everywhere — no angle-dependent unevenness or overlaps. */
export function insetPoints(pts: Point[], d: number): Point[] {
  const n = pts.length;
  if (n < 3) return pts.slice();
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const s = area >= 0 ? 1 : -1;
  const lines: { x: number; y: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy * s, ny = dx * s;
    lines.push({ x: a[0] + nx * d, y: a[1] + ny * d, dx, dy });
  }
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
    const den = l1.dx * l2.dy - l1.dy * l2.dx;
    const o = pts[i];
    if (Math.abs(den) < 1e-6) { out.push([l2.x, l2.y]); continue; }
    const t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / den;
    let vx = l1.x + t * l1.dx, vy = l1.y + t * l1.dy;
    const md = Math.hypot(vx - o[0], vy - o[1]), max = d * 3.5;
    if (md > max) { vx = o[0] + (vx - o[0]) / md * max; vy = o[1] + (vy - o[1]) / md * max; }
    out.push([vx, vy]);
  }
  return out;
}

export function roundedPath(pts: Point[], r: number): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
    const v1: Point = [prev[0] - cur[0], prev[1] - cur[1]], v2: Point = [next[0] - cur[0], next[1] - cur[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a: Point = [cur[0] + (v1[0] / l1) * rr, cur[1] + (v1[1] / l1) * rr];
    const b: Point = [cur[0] + (v2[0] / l2) * rr, cur[1] + (v2[1] / l2) * rr];
    d += (i === 0 ? "M" : "L") + a[0].toFixed(1) + "," + a[1].toFixed(1) + " ";
    d += "Q" + cur[0].toFixed(1) + "," + cur[1].toFixed(1) + " " + b[0].toFixed(1) + "," + b[1].toFixed(1) + " ";
  }
  return d + "Z";
}

export function tilePath(points: string, inset: number, radius: number): string {
  return roundedPath(insetPoints(toPts(points), inset), radius);
}

export interface BBox { minX: number; minY: number; maxX: number; maxY: number; }

export function bbox(points: string): BBox {
  const p = toPts(points);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  p.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
  return { minX, minY, maxX, maxY };
}

export interface ShieldOpts { spike?: number; shoulder?: number; side?: number; }

/* Heraldic heater shield path (the Citadel crest shape). */
export function shieldPath(cx: number, top: number, hw: number, h: number, o: ShieldOpts = {}): string {
  const peak = h * (o.spike != null ? o.spike : 0.075);
  const cornerY = top + h * 0.03;
  const sideY = top + h * (o.side != null ? o.side : 0.46);
  const bot = top + h;
  const bulge = h * (o.shoulder != null ? o.shoulder : 0.06);
  const L = cx - hw, R = cx + hw, tp = top - peak, cr = hw * 0.16;
  const lcx = L + cr * 0.5, lcy = cornerY - cr * 0.5;
  const rcx = R - cr * 0.5, rcy = cornerY - cr * 0.5;
  const lmx = (cx + lcx) / 2, lmy = (tp + lcy) / 2 - bulge;
  const rmx = (cx + rcx) / 2, rmy = (tp + rcy) / 2 - bulge;
  return [
    `M${cx},${tp}`,
    `Q${lmx.toFixed(1)},${lmy.toFixed(1)} ${lcx.toFixed(1)},${lcy.toFixed(1)}`,
    `Q${L},${cornerY} ${L},${cornerY + cr}`,
    `L${L},${sideY}`,
    `C${L},${bot - h * 0.16} ${cx - hw * 0.22},${bot - h * 0.05} ${cx},${bot}`,
    `C${cx + hw * 0.22},${bot - h * 0.05} ${R},${bot - h * 0.16} ${R},${sideY}`,
    `L${R},${cornerY + cr}`,
    `Q${R},${cornerY} ${rcx.toFixed(1)},${rcy.toFixed(1)}`,
    `Q${rmx.toFixed(1)},${rmy.toFixed(1)} ${cx},${tp}`,
    "Z",
  ].join(" ");
}

/* Heater-shield OUTLINE as a polygon (samples the same curves shieldPath
   draws) — used as the clip region for the Citadel's Voronoi tessellation. */
export function shieldOutline(cx: number, top: number, hw: number, h: number, o: ShieldOpts = {}, steps = 12): Point[] {
  const peak = h * (o.spike != null ? o.spike : 0.095);
  const cornerY = top + h * 0.03;
  const sideY = top + h * (o.side != null ? o.side : 0.40);
  const bot = top + h;
  const bulge = h * (o.shoulder != null ? o.shoulder : -0.02);
  const L = cx - hw, R = cx + hw, tp = top - peak, cr = hw * 0.16;
  const cap = hw * 0.022;
  const apexL: Point = [cx - cap, tp], apexR: Point = [cx + cap, tp];
  const lcx = L + cr * 0.5, lcy = cornerY - cr * 0.5;
  const rcx = R - cr * 0.5, rcy = cornerY - cr * 0.5;
  const lmx = (apexL[0] + lcx) / 2, lmy = (tp + lcy) / 2 - bulge;
  const rmx = (apexR[0] + rcx) / 2, rmy = (tp + rcy) / 2 - bulge;
  const pts: Point[] = [];
  const quad = (p0: Point, p1: Point, p2: Point, n: number) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
    }
  };
  const cubic = (p0: Point, p1: Point, p2: Point, p3: Point, n: number) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
  };
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
   optionally power-weighted: dw shifts the dividing line toward the
   lower-weighted seed (Laguerre/power diagram). */
export function clipHalfPlane(poly: Point[], a: Point, b: Point, dw = 0): Point[] {
  const nx = 2 * (b[0] - a[0]), ny = 2 * (b[1] - a[1]);
  const c = (b[0] * b[0] + b[1] * b[1]) - (a[0] * a[0] + a[1] * a[1]) + dw;
  const inside = (p: Point) => nx * p[0] + ny * p[1] <= c;
  const cut = (p: Point, q: Point): Point => {
    const dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c;
    const t = dp / (dp - dq);
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
  };
  const out: Point[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const cur = poly[i], prev = poly[(i - 1 + n) % n];
    const ci = inside(cur), pi = inside(prev);
    if (ci) { if (!pi) out.push(cut(prev, cur)); out.push(cur); }
    else if (pi) { out.push(cut(prev, cur)); }
  }
  return out;
}

export interface VoronoiSeed { x: number; y: number; w?: number; }

const WEIGHT_SCALE = 190; // px² per unit of friendly weight

/* Voronoi cells (clipped to `outline`) for an array of {x,y,w?} seeds.
   Returns a point-string per seed for tilePath(). */
export function voronoiCells(seeds: VoronoiSeed[], outline: Point[]): string[] {
  return seeds.map((s, i) => {
    let poly = outline.slice();
    for (let j = 0; j < seeds.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const dw = ((s.w || 0) - (seeds[j].w || 0)) * WEIGHT_SCALE;
      poly = clipHalfPlane(poly, [s.x, s.y], [seeds[j].x, seeds[j].y], dw);
    }
    return ptsToStr(poly);
  });
}

/* Pole of inaccessibility: the point INSIDE a polygon farthest from any edge
   — the visually "fattest" open spot for placing a label. Grid-subdivision
   search (after Mapbox's polylabel). */
export function polylabel(points: string, precision = 4): Point {
  const poly = toPts(points);
  if (poly.length < 3) return centroid(points);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); }
  const width = maxX - minX, height = maxY - minY;
  const cellSize = Math.max(1e-6, Math.min(width, height));
  let hh = cellSize / 2;

  function segDistSq(px: number, py: number, a: Point, b: Point) {
    let x = a[0], y = a[1], dx = b[0] - x, dy = b[1] - y;
    if (dx || dy) {
      const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = px - x; dy = py - y; return dx * dx + dy * dy;
  }
  function pointToPolyDist(x: number, y: number) {
    let inside = false, minSq = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      minSq = Math.min(minSq, segDistSq(x, y, a, b));
    }
    return (inside ? 1 : -1) * Math.sqrt(minSq);
  }
  const mkCell = (x: number, y: number, hc: number) => { const d = pointToPolyDist(x, y); return { x, y, h: hc, d, max: d + hc * Math.SQRT2 }; };

  const queue: ReturnType<typeof mkCell>[] = [];
  for (let x = minX; x < maxX; x += cellSize)
    for (let y = minY; y < maxY; y += cellSize)
      queue.push(mkCell(x + hh, y + hh, hh));
  const c = centroid(points);
  let best = mkCell(c[0], c[1], 0);
  const bbCell = mkCell(minX + width / 2, minY + height / 2, 0);
  if (bbCell.d > best.d) best = bbCell;

  let guard = 0;
  while (queue.length && guard++ < 8000) {
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

/** Balance a long label onto two lines. */
export function splitLabel(name: string, force = false): string[] {
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

/* Closed Catmull-Rom spline through `pts`, sampled `per` points per segment —
   turns an angular control polygon into a smooth rounded outline. */
export function smoothClosed(pts: Point[], per = 14): Point[] {
  const n = pts.length, out: Point[] = [];
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
