/* ===========================================================================
   Starfall Atlas — "zone host" adapters (typed port of the region/district
   dossier + Voronoi glue in app.js: regionHost, districtPlace,
   ensureRegionZones, computeCampusCells, computeCitadelCells).

   A ZoneHost is whatever a district-field/dossier pair needs, whether the
   underlying thing is one of an atlas's outer regions or one of its
   centrepiece's districts — same shape, same renderer (DistrictField +
   Dossier). Everything here takes the AtlasDefinition being drawn, so any
   area map works, not just the campus.
   =========================================================================== */
import type { AtlasDefinition, DistrictSeed, Point, Region, SubArea, ZoneLink } from "./types";
import { ensureSubAreas, seedSlug } from "./citadelData";
import { DISTRICT_FIELD_BOX, fitPointsToBox, fromBoxSpace, polylabel, shieldOutline, smoothClosed, toBoxSpace, toPts, voronoiCells } from "./geom";

/** The Region an atlas's centrepiece draws (the campus's Citadel), if it has one. */
export function centrepieceRegion(atlas: AtlasDefinition): Region | null {
  const c = atlas.centrepiece;
  return (c && atlas.regions.find((r) => r.id === c.regionId)) || null;
}

/** Compute every world region's live Voronoi cell (point-string), keyed by region id. */
export function computeWorldCells(atlas: AtlasDefinition): Record<string, string> {
  const outline = smoothClosed(toPts(atlas.outline));
  const cells = voronoiCells(atlas.seeds.map((s) => ({ x: s.x, y: s.y, w: s.w })), outline);
  const map: Record<string, string> = {};
  atlas.seeds.forEach((s, i) => { map[s.id] = cells[i]; });
  return map;
}

/** Compute every centrepiece district's Voronoi cell (point-string), keyed by seed index. */
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
  /** Stable id used to build whereabouts pick ids — the region's own id, or
   *  the centrepiece district's slug (joined under `parentId/` by
   *  pickPrefixForHost). */
  slug: string;
  /** The centrepiece region's id for a district host; null for a region. */
  parentId: string | null;
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

export function regionHost(region: Region, atlas: AtlasDefinition, cells: Record<string, string>): ZoneHost {
  return {
    name: region.name, house: region.house, house_color: region.house_color, hcOverride: null,
    sector: region.sector, coord: region.coord, blurb: region.blurb, facts: region.facts,
    sub: ensureRegionZones(region), cell: cells[region.id] || region.submap.outline,
    isRegion: true, backLabel: atlas.name, slug: region.id, parentId: null,
  };
}

/** A centrepiece district's host. Only meaningful for an atlas with a centrepiece. */
export function districtHost(seed: DistrictSeed, atlas: AtlasDefinition): ZoneHost {
  ensureSubAreas(seed);
  const citadel = centrepieceRegion(atlas)!;
  return {
    name: seed.name, house: atlas.centrepiece!.districtHouse, house_color: citadel.house_color, hcOverride: seed.color || null,
    sector: "District " + seed.tag, coord: citadel.name, blurb: seed.blurb || "",
    facts: [["Ledger no.", seed.tag], ["Within", citadel.name]],
    sub: seed.sub || [], cell: seed._cell, isRegion: false, backLabel: citadel.name, slug: seedSlug(seed),
    parentId: citadel.id,
  };
}

/* ---- whereabouts pick ids --------------------------------------------------
   A stable, host-facing identifier for "the exact thing that was clicked".
   Top-level regions/the centrepiece use their bare id; anything nested
   joins ancestor slugs with "/", e.g. "starfall-citadel/dragon_s_walk/C"
   for La Avenida. These ids are saved as player whereabouts, so they must
   stay stable once a map ships. */
export function pickPrefixForHost(host: ZoneHost): string {
  return host.parentId ? host.parentId + "/" + host.slug : host.slug;
}

export function zoneTagByName(zones: SubArea[], name: string): string | null {
  const found = zones.find((a) => a.name === name);
  return found ? found.tag : null;
}

/** Resolve a POI's link (a named zone inside a region or centrepiece
 *  district) to a pick id, for when the POI plaque is clicked in pick mode. */
export function pickIdForZoneLink(link: ZoneLink, atlas: AtlasDefinition): string | null {
  if (link.district) {
    const citadel = centrepieceRegion(atlas);
    const seed = citadel && (citadel.submap.seeds || []).find((s) => seedSlug(s) === link.district);
    if (!citadel || !seed) return null;
    ensureSubAreas(seed);
    const tag = link.zone ? zoneTagByName(seed.sub || [], link.zone) : null;
    return citadel.id + "/" + link.district + (tag ? "/" + tag : "");
  }
  if (link.region) {
    const region = atlas.regions.find((r) => r.id === link.region);
    const zones = region ? ensureRegionZones(region) : [];
    const tag = link.zone ? zoneTagByName(zones, link.zone) : null;
    return link.region + (tag ? "/" + tag : "");
  }
  return null;
}

/* ---- whereabouts marker placement ------------------------------------------
   A pin should show up "where that place visually is" at ANY zoom level, not
   just in the field view it was set from. Each level already computes a
   label anchor (polylabel's pole-of-inaccessibility + that entity's authored
   nudge) for its own text — these functions reproject that same anchor
   across the coordinate spaces the map uses: a district-field's normalised
   display box, the centrepiece's full-size shield, and the centrepiece's
   small fixed placement on the world field. */

/** A zone's own label anchor, reprojected out of DistrictField's normalised
 *  display box into the host's real coordinate space — Citadel-shield space
 *  for a district, campus space for a region (the space `host.cell` is
 *  already expressed in). Mirrors DistrictField's own cell computation
 *  exactly, so it lands on the same spot the zone's label does. */
export function zoneAnchorInHostSpace(host: ZoneHost, tag: string): Point | null {
  if (!host.cell) return null;
  const subsOn = host.sub.filter((a) => a.on);
  const idx = subsOn.findIndex((a) => a.tag === tag);
  if (idx < 0) return null;
  const realPts = toPts(host.cell);
  const t = fitPointsToBox(realPts, DISTRICT_FIELD_BOX.w, DISTRICT_FIELD_BOX.h, DISTRICT_FIELD_BOX.bx, DISTRICT_FIELD_BOX.by);
  const normPts = realPts.map((p) => toBoxSpace(p, t));
  const cells = voronoiCells(subsOn.map((a) => ({ x: a.x, y: a.y, w: a.w })), normPts);
  const cellStr = cells[idx];
  if (!cellStr || cellStr.split(" ").length < 3) return null;
  const a = subsOn[idx];
  const base = polylabel(cellStr);
  return fromBoxSpace([base[0] + (a.lx || 0), base[1] + (a.ly || 0)], t);
}

/** A Citadel district's own label anchor, already in Citadel-shield space —
 *  no reprojection needed, since CitadelTessellation computes its cells
 *  directly in that space. */
function districtAnchor(seed: DistrictSeed, cellStr: string | undefined): Point {
  if (!cellStr) return [seed.x, seed.y];
  const base = polylabel(cellStr);
  return [base[0] + (seed.labelDx || 0), base[1] + (seed.labelDy || 0)];
}

/** Resolve any "<centrepiece id>/…" location to a point in centrepiece-shield
 *  space: the district's own anchor for a bare district pick, or that
 *  district's zone anchor for a nested one. Null for anything outside the
 *  centrepiece. */
export function resolveCitadelPoint(locId: string, atlas: AtlasDefinition, citadelCells: Record<number, string>): Point | null {
  const citadel = centrepieceRegion(atlas);
  if (!citadel || !locId.startsWith(citadel.id + "/")) return null;
  const parts = locId.split("/");
  const slug = parts[1];
  const seeds = citadel.submap.seeds || [];
  const idx = seeds.findIndex((s) => !s.special && seedSlug(s) === slug);
  if (idx < 0) return null;
  const seed = seeds[idx];
  const cellStr = seed._cell || citadelCells[idx];
  const anchor = districtAnchor(seed, cellStr);
  const tag = parts[2];
  if (!tag || !cellStr) return anchor;
  const host = districtHost(seed, atlas);
  host.cell = cellStr;
  return zoneAnchorInHostSpace(host, tag) || anchor;
}

/** The centrepiece is drawn full-size in its own view but as a small, fixed
 *  shield glyph on the world field — proportionally remap a point from one
 *  shield's coordinate space to the other's. */
export function citadelPointToWorld(pt: Point, citadel: Region, atlas: AtlasDefinition): Point {
  const g = citadel.submap.shieldGeom!;
  const place = atlas.centrepiece!.place;
  const sx = place.hw / g.hw, sy = place.h / g.h;
  return [place.cx + (pt[0] - g.cx) * sx, place.top + (pt[1] - g.top) * sy];
}

/** Resolve any location id to a point in world-field space — the finest
 *  anchor available at each level: a zone's own position if the location
 *  names one, else that region/district's own label anchor. */
export function resolveWorldPoint(
  locId: string,
  atlas: AtlasDefinition,
  worldCells: Record<string, string>,
  citadelCells: Record<number, string>,
): Point {
  const topId = locId.split("/")[0];
  const citadel = centrepieceRegion(atlas);
  if (citadel && topId === citadel.id) {
    const g = citadel.submap.shieldGeom!;
    const fallback: Point = [g.cx, g.top + g.h * 0.42];
    const citPt = resolveCitadelPoint(locId, atlas, citadelCells) || fallback;
    return citadelPointToWorld(citPt, citadel, atlas);
  }
  const region = atlas.regions.find((r) => r.id === topId);
  if (!region) return [atlas.field[0] / 2, atlas.field[1] / 2];
  const tag = locId.split("/")[1];
  if (tag) {
    const host = regionHost(region, atlas, worldCells);
    const pt = zoneAnchorInHostSpace(host, tag);
    if (pt) return pt;
  }
  const cellStr = worldCells[region.id];
  const seed = atlas.seeds.find((s) => s.id === region.id);
  if (cellStr && seed) {
    const base = polylabel(cellStr);
    return [base[0] + (seed.ldx || 0), base[1] + (seed.ldy || 0)];
  }
  return region.label;
}
