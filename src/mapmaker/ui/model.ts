/* ===========================================================================
   Mapmaker UI — selection/view model, templates and doc edit helpers.
   =========================================================================== */
import { MAP_FORMAT, MAP_FORMAT_VERSION, slugOf, type CentrepieceJson, type DistrictJson, type MapJson, type Pt, type RegionJson, type SubAreaJson } from "../format";

/** Which level the canvas shows. */
export type View =
  | { level: "world" }
  | { level: "region"; i: number }
  | { level: "centrepiece" }
  | { level: "district"; i: number };

/** What the inspector edits. */
export type Sel =
  | { kind: "map" }
  | { kind: "region"; i: number }
  | { kind: "zone"; owner: "region" | "district"; i: number; k: number }
  | { kind: "poi"; i: number }
  | { kind: "centrepiece" }
  | { kind: "district"; i: number }
  | { kind: "special"; i: number }
  | { kind: "outline"; v: number };

export const sameSel = (a: Sel, b: Sel) => JSON.stringify(a) === JSON.stringify(b);

/** The canvas level that best shows a selection. */
export function viewForSel(s: Sel, current: View): View {
  switch (s.kind) {
    case "zone": return s.owner === "region" ? { level: "region", i: s.i } : { level: "district", i: s.i };
    case "region": case "poi": case "outline": return { level: "world" };
    case "district": case "special": return { level: "centrepiece" };
    case "centrepiece": return current.level === "world" ? current : { level: "centrepiece" };
    default: return current;
  }
}

/** Map a validator path (e.g. "centrepiece.districts[3].subs[1].name") to the
 *  selection that edits it. */
export function selFromPath(path: string): Sel {
  let m = path.match(/^regions\[(\d+)\]\.submap\.subs\[(\d+)\]/);
  if (m) return { kind: "zone", owner: "region", i: +m[1], k: +m[2] };
  m = path.match(/^regions\[(\d+)\]/);
  if (m) return { kind: "region", i: +m[1] };
  m = path.match(/^centrepiece\.districts\[(\d+)\]\.subs\[(\d+)\]/);
  if (m) return { kind: "zone", owner: "district", i: +m[1], k: +m[2] };
  m = path.match(/^centrepiece\.districts\[(\d+)\]/);
  if (m) return { kind: "district", i: +m[1] };
  m = path.match(/^centrepiece\.specials\[(\d+)\]/);
  if (m) return { kind: "special", i: +m[1] };
  if (path.startsWith("centrepiece")) return { kind: "centrepiece" };
  m = path.match(/^pois\[(\d+)\]/);
  if (m) return { kind: "poi", i: +m[1] };
  m = path.match(/^outline\[(\d+)\]/);
  if (m) return { kind: "outline", v: +m[1] };
  return { kind: "map" };
}

/* ---- templates -------------------------------------------------------------- */

export const blankZone = (x: number, y: number, name: string | null = null): SubAreaJson =>
  ({ x, y, w: 0, on: true, lx: 0, ly: 0, name, blurb: null, generic: null });

const ZONE_SPOTS: Pt[] = [[330, 250], [500, 232], [670, 250], [345, 470], [500, 492], [655, 470]];

export function newRegion(id: string, name: string, x: number, y: number, color = "forest"): RegionJson {
  return {
    id, name, house: "", crest: "", house_color: color, sector: "", coord: "", tagline: "", blurb: "",
    facts: [["Terrain", ""]],
    seed: { x, y, w: 0, ldx: 0, ldy: 0 },
    submap: {
      view: [1000, 760],
      outline: [[130, 170], [380, 95], [660, 110], [880, 200], [925, 420], [840, 620], [560, 690], [280, 665], [120, 500], [75, 330]],
      subs: ZONE_SPOTS.slice(0, 3).map((p, k) => blankZone(p[0], p[1], `Zone ${"ABC"[k]}`)),
    },
  };
}

export function newDistrict(name: string, tag: string, x: number, y: number): DistrictJson {
  return {
    name, tag, x, y, w: 0, color: `oklch(0.55 0.07 ${(Number(tag) * 67) % 360 || 90})`, labelDx: 0, labelDy: 0, blurb: "",
    subs: ZONE_SPOTS.map((p, k) => ({ ...blankZone(p[0], p[1], k < 3 ? `Zone ${"ABC"[k]}` : null), on: k < 3 })),
  };
}

export function newCentrepiece(field: [number, number]): CentrepieceJson {
  return {
    id: "centre", name: "The Centre", house: "", crest: "", house_color: "gold", sector: "", coord: "",
    tagline: "", blurb: "", facts: [],
    place: { cx: Math.round(field[0] / 2), top: Math.round(field[1] / 2 - 150), hw: 110, h: 280 },
    label: ["THE", "CENTRE"], eyebrow: "HEART OF THE MAP", districtHouse: "Centre district",
    view: [1000, 1200],
    shield: { cx: 500, top: 80, hw: 430, h: 1040 },
    opts: { spike: 0.095, shoulder: -0.02, side: 0.4 },
    districts: [
      newDistrict("North Ward", "01", 500, 300),
      newDistrict("West Ward", "02", 330, 700),
      newDistrict("East Ward", "03", 670, 700),
    ],
    specials: [],
  };
}

export function blankMap(): MapJson {
  return {
    format: MAP_FORMAT, version: MAP_FORMAT_VERSION,
    id: "new-area", name: "New Area", eyebrow: "UNCHARTED", title: "NEW AREA",
    field: [1600, 1200], fit: { w: 1480, h: 1120, tx: 0, ty: 0 },
    outline: [[200, 260], [560, 150], [1000, 140], [1380, 280], [1480, 640], [1320, 1000], [880, 1100], [420, 1040], [160, 820], [110, 500]],
    watermark: "/character-sheet/map/assets/crest-lines.png",
    regions: [
      newRegion("north", "North Reach", 800, 360, "forest"),
      newRegion("west", "West Vale", 520, 800, "teal"),
      newRegion("east", "East March", 1100, 800, "crimson"),
    ],
    pois: [],
    centrepiece: null,
    about: { blurb: "", facts: [] },
  };
}

/* ---- id-aware edits ---------------------------------------------------------- */

/** All region/centrepiece ids in legend order. */
export function legendIds(m: MapJson): string[] {
  const all = [...m.regions.map((r) => r.id), ...(m.centrepiece ? [m.centrepiece.id] : [])];
  if (!m.legendOrder) return all;
  const at = new Map(m.legendOrder.map((id, i) => [id, i]));
  return [...all].sort((a, b) => (at.get(a) ?? 1e9) - (at.get(b) ?? 1e9));
}

/** Rename a region/centrepiece id and every reference to it. */
export function renameAreaId(m: MapJson, from: string, to: string) {
  const r = m.regions.find((q) => q.id === from);
  if (r) r.id = to;
  else if (m.centrepiece?.id === from) m.centrepiece.id = to;
  m.pois.forEach((p) => { if (p.link.region === from) p.link.region = to; });
  if (m.legendOrder) m.legendOrder = m.legendOrder.map((id) => (id === from ? to : id));
}

/** Rename a district and every reference to its slug. */
export function renameDistrict(m: MapJson, i: number, name: string) {
  const c = m.centrepiece!;
  const from = slugOf(c.districts[i].name), to = slugOf(name);
  c.districts[i].name = name;
  if (from === to || !to) return;
  c.specials.forEach((s) => { if (s.link.district === from) s.link.district = to; });
  m.pois.forEach((p) => { if (p.link.district === from) p.link.district = to; });
}

/** Rename a zone and the POI links that name it. */
export function renameZone(m: MapJson, owner: "region" | "district", i: number, k: number, name: string | null) {
  const zones = owner === "region" ? m.regions[i].submap.subs : m.centrepiece!.districts[i].subs;
  const from = zones[k].name;
  zones[k].name = name;
  if (!from || !name) return;
  const key = owner === "region" ? m.regions[i].id : slugOf(m.centrepiece!.districts[i].name);
  m.pois.forEach((p) => {
    if (p.link.zone === from && (owner === "region" ? p.link.region === key : p.link.district === key)) p.link.zone = name;
  });
}

export function uniqueId(base: string, taken: string[]): string {
  let id = base, n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
