/* ===========================================================================
   Starfall Atlas — "zone host" adapters (typed port of the region/district
   dossier + Voronoi glue in app.js: regionHost, districtPlace,
   ensureRegionZones, computeCampusCells, computeCitadelCells).

   A ZoneHost is whatever a district-field/dossier pair needs, whether the
   underlying thing is one of the 5 outer regions or one of the Citadel's 21
   districts — same shape, same renderer (DistrictField + Dossier).
   =========================================================================== */
import type { DistrictSeed, Region, SubArea } from "./types";
import { ensureSubAreas } from "./citadelData";
import { shieldOutline, smoothClosed, toPts, voronoiCells } from "./geom";

export const CAMPUS_OUTLINE =
  "120,250 440,150 820,112 1190,150 1466,345 1500,716 1330,1052 905,1132 470,1086 180,892 94,556";

export interface CampusSeed { id: string; x: number; y: number; w: number; ldx: number; ldy: number; }

export const CAMPUS_SEEDS: CampusSeed[] = [
  { id: "amber-woods", x: 730, y: 300, w: 44, ldx: 0, ldy: -10 },
  { id: "jewelstone-hollow", x: 909, y: 512, w: -100, ldx: 0, ldy: 0 },
  { id: "ryker-cliffs", x: 1287, y: 508, w: 4, ldx: 0, ldy: -51 },
  { id: "glimmerdeep-lake", x: 243, y: 989, w: 6, ldx: -4, ldy: 29 },
  { id: "the-grounds", x: 770, y: 896, w: -4, ldx: 291, ldy: 120 },
];

export const CITADEL_PLACE = { cx: 722, top: 736, hw: 118, h: 296 };

export interface CampusPoi {
  id: string;
  name: string;
  x: number;
  y: number;
  link: { region?: string; zone?: string; citadelDistrict?: string };
}

export const CAMPUS_POIS: CampusPoi[] = [
  { id: "boar-house", name: "Boar House", link: { region: "amber-woods", zone: "Boar House" }, x: 530, y: 553 },
  { id: "dragon-house", name: "Dragon House", link: { region: "jewelstone-hollow", zone: "Dragon House" }, x: 968, y: 634 },
  { id: "eagle-house", name: "Eagle House", link: { region: "ryker-cliffs", zone: "Eagle House" }, x: 1181, y: 709 },
  { id: "dolphin-house", name: "Dolphin House", link: { region: "glimmerdeep-lake", zone: "Dolphin House" }, x: 380, y: 855 },
  { id: "scorpion-house", name: "Scorpion House", link: { citadelDistrict: "crescent_district", zone: "Scorpion House" }, x: 747, y: 799 },
];

/** Compute every campus region's live Voronoi cell (point-string), keyed by region id. */
export function computeCampusCells(): Record<string, string> {
  const outline = smoothClosed(toPts(CAMPUS_OUTLINE));
  const cells = voronoiCells(CAMPUS_SEEDS.map((s) => ({ x: s.x, y: s.y, w: s.w })), outline);
  const map: Record<string, string> = {};
  CAMPUS_SEEDS.forEach((s, i) => { map[s.id] = cells[i]; });
  return map;
}

/** Compute every Citadel district's Voronoi cell (point-string), keyed by seed index. */
export function computeCitadelCells(citadel: Region): Record<number, string> {
  const sm = citadel.submap, g0 = sm.shieldGeom!;
  const outline = shieldOutline(g0.cx, g0.top, g0.hw, g0.h, sm.shieldOpts);
  const dseeds: DistrictSeed[] = [], didx: number[] = [];
  (sm.seeds || []).forEach((s, i) => { if (!s.special) { dseeds.push(s); didx.push(i); } });
  const cells = voronoiCells(dseeds, outline);
  const map: Record<number, string> = {};
  cells.forEach((c, k) => { map[didx[k]] = c; });
  return map;
}

export interface ZoneHost {
  name: string;
  house: string;
  house_color: string;
  hcOverride: string | null;
  sector: string;
  coord: string;
  blurb: string;
  facts: [string, string][];
  sub: SubArea[];
  cell: string | undefined;
  isRegion: boolean;
  backLabel: string;
}

/** Materialise a region's A–E zones from its authored submap.subs (parallel
 *  to ensureSubAreas, but for the simpler outer-region shape). */
export function ensureRegionZones(region: Region): SubArea[] {
  const sm = region.submap as Region["submap"] & { _zones?: SubArea[] };
  if (sm._zones) return sm._zones;
  const tags = ["A", "B", "C", "D", "E", "F"];
  const pos = sm.subPos || {}, authored = sm.subs || [], lbl = sm.subLabel || {};
  sm._zones = authored.map((a, i): SubArea => {
    const t = tags[i], p = pos[t];
    const x = p ? p[0] : 500, y = p ? p[1] : 380, w = p ? (p[2] || 0) : 0;
    const lx = lbl[t] ? lbl[t][0] : 0, ly = lbl[t] ? lbl[t][1] : 0;
    return { tag: t, name: a.name ?? null, blurb: a.blurb ?? null, x, y, w, on: true, generic: null, lx, ly };
  });
  return sm._zones;
}

export function regionHost(region: Region, cells: Record<string, string>): ZoneHost {
  return {
    name: region.name, house: region.house, house_color: region.house_color, hcOverride: null,
    sector: region.sector, coord: region.coord, blurb: region.blurb, facts: region.facts,
    sub: ensureRegionZones(region), cell: cells[region.id] || region.submap.outline,
    isRegion: true, backLabel: "Campus",
  };
}

export function districtHost(seed: DistrictSeed, backLabel: string): ZoneHost {
  ensureSubAreas(seed);
  return {
    name: seed.name, house: "Citadel district", house_color: "gold", hcOverride: seed.color || null,
    sector: "District " + seed.tag, coord: "Starfall Citadel", blurb: seed.blurb || "",
    facts: [["Ledger no.", seed.tag], ["Within", "Starfall Citadel"]],
    sub: seed.sub || [], cell: seed._cell, isRegion: false, backLabel,
  };
}
