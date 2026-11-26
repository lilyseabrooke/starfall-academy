/* ===========================================================================
   Mapmaker — the `.map.json` format (staging branch only).

   One file per area map. It is the editable source of truth the /mapmaker
   tool reads and writes; `scripts/bake-map.ts` turns it into the typed
   AtlasDefinition module that ships on main (via jsonToAtlas in convert.ts).

   Every field maps onto something the renderer already uses. The differences
   from the runtime shapes are only for editing comfort:
     - points are [x, y] arrays, not "x,y x,y" strings;
     - a region's world seed lives on the region;
     - sub-areas (A–F) are one array of complete records instead of the
       sparse subPos / subLabel / subGen / subs side tables.
   =========================================================================== */

import { smoothClosed, voronoiCells } from "../sheet/data/map/geom";

export const MAP_FORMAT = "starfall-map";
export const MAP_FORMAT_VERSION = 1;

export type Pt = [number, number];

/** One A–F sub-area (a zone inside a region or a centrepiece district).
 *  Its tag is its index: 0 → A … 5 → F. */
export interface SubAreaJson {
  /** Voronoi seed, in the 1000×760 district-field space. */
  x: number;
  y: number;
  /** Additive Voronoi weight. */
  w: number;
  /** Shown on the map. Regions always show every zone they list. */
  on: boolean;
  /** Label nudge from the cell's pole of inaccessibility. */
  lx: number;
  ly: number;
  name: string | null;
  blurb: string | null;
  /** "Residential" | "Class Halls" | "Commercial" stand-in when unnamed. */
  generic: string | null;
}

export interface WorldSeedJson {
  x: number;
  y: number;
  w: number;
  ldx: number;
  ldy: number;
  splitLabel?: boolean;
}

/** Region (and centrepiece) lore shown in the dossier. */
export interface LoreJson {
  name: string;
  house: string;
  crest: string;
  house_color: string;
  sector: string;
  coord: string;
  tagline: string;
  blurb: string;
  facts: [string, string][];
}

export interface RegionJson extends LoreJson {
  id: string;
  seed: WorldSeedJson;
  submap: {
    view: [number, number];
    outline: Pt[];
    /** 1–6 zones, in tag order. */
    subs: SubAreaJson[];
  };
  /** Legacy static polygon and label anchor from regions.ts. The renderer
   *  only falls back on them; the bake derives both from the live Voronoi
   *  cell when absent. Kept so an imported map bakes back byte-for-byte. */
  legacy?: { points: Pt[]; label: Pt };
}

export interface DistrictJson {
  name: string;
  /** Ledger number, e.g. "07". */
  tag: string;
  x: number;
  y: number;
  w: number;
  color: string;
  labelDx: number;
  labelDy: number;
  blurb: string;
  /** Always 6 (A–F); switch unused ones off. */
  subs: SubAreaJson[];
}

/** A floating "special location" over the centrepiece: a gilded marker that
 *  jumps to one zone of one district. */
export interface SpecialJson {
  name: string;
  x: number;
  y: number;
  blurb: string;
  /** District slug (seedSlug of the district's name) and zone tag. */
  link: { district: string; zone: string };
}

export interface CentrepieceJson extends LoreJson {
  id: string;
  /** Small shield glyph on the world field. */
  place: { cx: number; top: number; hw: number; h: number };
  label: string[];
  eyebrow: string;
  districtHouse: string;
  /** Full-size shield view and its geometry. */
  view: [number, number];
  shield: { cx: number; top: number; hw: number; h: number };
  opts: { spike: number; shoulder: number; side: number };
  districts: DistrictJson[];
  specials: SpecialJson[];
  legacy?: { points: Pt[]; label: Pt };
}

export interface PoiJson {
  id: string;
  name: string;
  x: number;
  y: number;
  /** A named zone in a region, or in a centrepiece district (by slug). */
  link: { region?: string; district?: string; zone?: string };
}

export interface MapJson {
  format: typeof MAP_FORMAT;
  version: number;
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  field: [number, number];
  fit: { w: number; h: number; tx: number; ty: number };
  outline: Pt[];
  watermark: string;
  /** World regions, in draw (seed) order. */
  regions: RegionJson[];
  /** Legend order by id (regions and the centrepiece). Defaults to the
   *  regions in order, then the centrepiece. */
  legendOrder?: string[];
  pois: PoiJson[];
  centrepiece: CentrepieceJson | null;
  /** "About <map>" in the legend: a blurb for the whole map (paragraphs
   *  separated by a blank line) and optional facts. Absent or null = none. */
  about?: { blurb: string; facts: [string, string][] } | null;
}

export const SUB_TAG_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
export const HOUSE_COLORS = ["forest", "crimson", "plum", "teal", "meadow", "gold"] as const;
export const GENERIC_TYPES = ["Residential", "Class Halls", "Commercial"] as const;

/** Same slug rule as citadelData.seedSlug (pick ids depend on it). */
export const slugOf = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/* ---- validation ------------------------------------------------------------ */

export interface Problem {
  level: "error" | "warning";
  /** JSON-ish path to the offending value, e.g. "regions[2].submap.subs[1]". */
  path: string;
  message: string;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isPt = (v: unknown): v is Pt => Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);

/** Point-in-polygon (even-odd), for "seed sits outside its outline" checks. */
export function insidePoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Validate a parsed `.map.json`. Structural errors stop the walk for that
 *  branch (later checks would only repeat them); soft issues are warnings.
 *  `shipped` lists ids from a baked module already on main: removing one
 *  would orphan saved player whereabouts, so that is flagged. */
export function validateMap(input: unknown, shipped?: { regionIds: string[]; districtSlugs: string[] }): Problem[] {
  const out: Problem[] = [];
  const err = (path: string, message: string) => out.push({ level: "error", path, message });
  const warn = (path: string, message: string) => out.push({ level: "warning", path, message });

  if (!isObj(input)) { err("", "The file is not a JSON object."); return out; }
  const m = input;
  if (m.format !== MAP_FORMAT) err("format", `Expected "${MAP_FORMAT}", got ${JSON.stringify(m.format)}.`);
  if (m.version !== MAP_FORMAT_VERSION) err("version", `Unsupported version ${JSON.stringify(m.version)} (this tool reads ${MAP_FORMAT_VERSION}).`);
  if (!isStr(m.id) || !/^[a-z][a-z0-9-]*$/.test(m.id)) err("id", "Map id must be a lowercase slug (letters, digits, hyphens), starting with a letter.");
  for (const k of ["name", "eyebrow", "title", "watermark"] as const) if (!isStr(m[k])) err(k, `"${k}" must be text.`);
  const ab = m.about;
  if (ab !== undefined && ab !== null) {
    if (!isObj(ab) || !isStr(ab.blurb)) err("about", "about must be { blurb, facts } or null.");
    else {
      if (!Array.isArray(ab.facts) || !ab.facts.every((f) => Array.isArray(f) && f.length === 2 && isStr(f[0]) && isStr(f[1]))) err("about.facts", "facts must be a list of [label, value] pairs.");
      if (!ab.blurb.trim()) warn("about.blurb", "The map's About section is empty, so the legend won't show it.");
    }
  } else if (m.id !== "campus") warn("about", "This map has no About blurb for its legend.");
  if (isStr(m.name) && !m.name.trim()) err("name", "The map needs a name.");
  if (!isPt(m.field) || m.field[0] <= 0 || m.field[1] <= 0) err("field", "Field must be [width, height] with positive numbers.");
  const fit = m.fit;
  if (!isObj(fit) || !["w", "h", "tx", "ty"].every((k) => isNum(fit[k]))) err("fit", "Fit must have numeric w, h, tx and ty.");

  const outlineOk = checkOutline(m.outline, "outline", err);
  // Regions are cut from the smoothed outline, so test against that.
  const shape = outlineOk ? (smoothClosed(m.outline as Pt[]) as Pt[]) : [];
  const field = isPt(m.field) ? m.field : null;
  if (outlineOk && field) {
    (m.outline as Pt[]).forEach((p, i) => {
      if (p[0] < 0 || p[1] < 0 || p[0] > field[0] || p[1] > field[1]) warn(`outline[${i}]`, "Outline point lies outside the field.");
    });
  }

  const ids = new Set<string>();
  const regionZones = new Map<string, SubAreaJson[]>();
  if (!Array.isArray(m.regions)) err("regions", "Regions must be a list.");
  else {
    if (m.regions.length === 0) err("regions", "A map needs at least one region.");
    m.regions.forEach((r, i) => {
      const p = `regions[${i}]`;
      if (!isObj(r)) { err(p, "Region must be an object."); return; }
      if (!isStr(r.id) || !/^[a-z][a-z0-9-]*$/.test(r.id)) { err(`${p}.id`, "Region id must be a lowercase slug (letters, digits, hyphens)."); return; }
      if (ids.has(r.id)) err(`${p}.id`, `Duplicate id "${r.id}".`);
      ids.add(r.id);
      checkLore(r, p, err, warn);
      const s = r.seed;
      if (!isObj(s) || !["x", "y", "w", "ldx", "ldy"].every((k) => isNum(s[k]))) err(`${p}.seed`, "Seed must have numeric x, y, w, ldx and ldy.");
      const sm = r.submap;
      if (!isObj(sm)) { err(`${p}.submap`, "Region needs a submap."); return; }
      if (!isPt(sm.view)) err(`${p}.submap.view`, "Submap view must be [width, height].");
      checkOutline(sm.outline, `${p}.submap.outline`, err);
      if (!Array.isArray(sm.subs) || sm.subs.length < 1 || sm.subs.length > 6) err(`${p}.submap.subs`, "A region needs 1–6 zones.");
      else {
        sm.subs.forEach((a, k) => checkSub(a, `${p}.submap.subs[${k}]`, err, warn, true));
        regionZones.set(r.id, sm.subs as SubAreaJson[]);
      }
      if (r.legacy !== undefined) checkLegacy(r.legacy, `${p}.legacy`, err);
    });
  }

  // Every region needs a non-empty cell, or it cannot be seen or clicked.
  if (outlineOk && Array.isArray(m.regions)) {
    const rs = m.regions as Record<string, unknown>[];
    const seeds = rs.map((r) => (isObj(r) && isObj(r.seed) ? r.seed : null));
    if (seeds.every((s) => s && isNum(s.x) && isNum(s.y) && isNum(s.w))) {
      const cells = voronoiCells(seeds.map((s) => ({ x: s!.x as number, y: s!.y as number, w: s!.w as number })), shape);
      cells.forEach((c, i) => {
        if (!c || c.split(" ").length < 3) err(`regions[${i}].seed`, `${rs[i].name || rs[i].id} has no area left: its seed is swallowed by its neighbours. Move it or raise its weight.`);
      });
    }
  }

  const districtZones = new Map<string, SubAreaJson[]>();
  const c = m.centrepiece;
  if (c !== null && c !== undefined) {
    const p = "centrepiece";
    if (!isObj(c)) err(p, "Centrepiece must be an object or null.");
    else {
      if (!isStr(c.id) || !/^[a-z][a-z0-9-]*$/.test(c.id)) err(`${p}.id`, "Centrepiece id must be a lowercase slug.");
      else if (ids.has(c.id)) err(`${p}.id`, `Duplicate id "${c.id}" (a region already uses it).`);
      else ids.add(c.id);
      checkLore(c, p, err, warn);
      for (const k of ["place", "shield"] as const) {
        const g = c[k];
        if (!isObj(g) || !["cx", "top", "hw", "h"].every((q) => isNum(g[q]))) err(`${p}.${k}`, `${k} must have numeric cx, top, hw and h.`);
      }
      const o = c.opts;
      if (!isObj(o) || !["spike", "shoulder", "side"].every((q) => isNum(o[q]))) err(`${p}.opts`, "opts must have numeric spike, shoulder and side.");
      if (!isPt(c.view)) err(`${p}.view`, "view must be [width, height].");
      if (!Array.isArray(c.label) || !c.label.every(isStr)) err(`${p}.label`, "label must be a list of lines.");
      for (const k of ["eyebrow", "districtHouse"] as const) if (!isStr(c[k])) err(`${p}.${k}`, `"${k}" must be text.`);
      if (!Array.isArray(c.districts) || c.districts.length === 0) err(`${p}.districts`, "A centrepiece needs at least one district.");
      else {
        const tags = new Set<string>();
        c.districts.forEach((d, i) => {
          const dp = `${p}.districts[${i}]`;
          if (!isObj(d)) { err(dp, "District must be an object."); return; }
          if (!isStr(d.name) || !slugOf(d.name)) { err(`${dp}.name`, "District needs a name with at least one letter or digit."); return; }
          const slug = slugOf(d.name);
          if (districtZones.has(slug)) err(`${dp}.name`, `Two districts share the slug "${slug}" (pick ids would collide); rename one.`);
          for (const k of ["x", "y", "w", "labelDx", "labelDy"]) if (!isNum(d[k])) err(`${dp}.${k}`, `"${k}" must be a number.`);
          for (const k of ["tag", "color", "blurb"]) if (!isStr(d[k])) err(`${dp}.${k}`, `"${k}" must be text.`);
          if (isStr(d.tag)) { if (tags.has(d.tag)) warn(`${dp}.tag`, `Ledger number "${d.tag}" is used twice.`); tags.add(d.tag); }
          if (isStr(d.blurb) && !d.blurb.trim()) warn(`${dp}.blurb`, `${d.name} has no blurb.`);
          if (!Array.isArray(d.subs) || d.subs.length !== 6) err(`${dp}.subs`, "A district needs exactly 6 zones (A–F); switch unused ones off.");
          else {
            d.subs.forEach((a, k) => checkSub(a, `${dp}.subs[${k}]`, err, warn));
            if (!d.subs.some((a) => isObj(a) && a.on)) warn(`${dp}.subs`, `${d.name} has every zone switched off.`);
            districtZones.set(slug, d.subs as SubAreaJson[]);
          }
        });
      }
      if (!Array.isArray(c.specials)) err(`${p}.specials`, "specials must be a list (possibly empty).");
      else c.specials.forEach((s, i) => {
        const sp = `${p}.specials[${i}]`;
        if (!isObj(s)) { err(sp, "Special location must be an object."); return; }
        if (!isStr(s.name) || !s.name.trim()) err(`${sp}.name`, "Special location needs a name.");
        if (!isNum(s.x) || !isNum(s.y)) err(sp, "Special location needs numeric x and y.");
        if (!isStr(s.blurb)) err(`${sp}.blurb`, "blurb must be text.");
        const l = s.link;
        if (!isObj(l) || !isStr(l.district) || !isStr(l.zone)) { err(`${sp}.link`, "link must name a district slug and a zone tag."); return; }
        const zones = districtZones.get(l.district);
        if (!zones) err(`${sp}.link.district`, `No district with slug "${l.district}".`);
        else {
          const k = SUB_TAG_LETTERS.indexOf(l.zone as (typeof SUB_TAG_LETTERS)[number]);
          if (k < 0) err(`${sp}.link.zone`, `Zone must be a tag A–F, got "${l.zone}".`);
          else if (!zones[k]?.on) warn(`${sp}.link.zone`, `Zone ${l.zone} of "${l.district}" is switched off.`);
        }
      });
      if (c.legacy !== undefined) checkLegacy(c.legacy, `${p}.legacy`, err);
    }
  }

  if (m.legendOrder !== undefined) {
    if (!Array.isArray(m.legendOrder) || !m.legendOrder.every(isStr)) err("legendOrder", "legendOrder must be a list of ids.");
    else {
      const lo = m.legendOrder as string[];
      lo.forEach((id, i) => { if (!ids.has(id)) err(`legendOrder[${i}]`, `Unknown id "${id}".`); });
      ids.forEach((id) => { if (!lo.includes(id)) err("legendOrder", `"${id}" is missing from legendOrder.`); });
      if (new Set(lo).size !== lo.length) err("legendOrder", "legendOrder lists an id twice.");
    }
  }

  if (!Array.isArray(m.pois)) err("pois", "pois must be a list (possibly empty).");
  else {
    const poiIds = new Set<string>();
    m.pois.forEach((q, i) => {
      const p = `pois[${i}]`;
      if (!isObj(q)) { err(p, "POI must be an object."); return; }
      if (!isStr(q.id) || !q.id) err(`${p}.id`, "POI needs an id.");
      else { if (poiIds.has(q.id)) err(`${p}.id`, `Duplicate POI id "${q.id}".`); poiIds.add(q.id); }
      if (!isStr(q.name) || !q.name.trim()) err(`${p}.name`, "POI needs a name.");
      if (!isNum(q.x) || !isNum(q.y)) err(p, "POI needs numeric x and y.");
      else if (outlineOk && !insidePoly([q.x, q.y], shape)) warn(p, `${q.name || q.id} sits outside the map outline.`);
      const l = q.link;
      if (!isObj(l)) { err(`${p}.link`, "POI needs a link."); return; }
      if (!!l.region === !!l.district) { err(`${p}.link`, "Link to exactly one of a region or a district."); return; }
      const zones = l.region ? regionZones.get(l.region as string) : districtZones.get(l.district as string);
      if (!zones) err(`${p}.link`, l.region ? `No region "${l.region}".` : `No centrepiece district "${l.district}".`);
      else if (l.zone !== undefined) {
        if (!isStr(l.zone)) err(`${p}.link.zone`, "zone must be a zone name.");
        else if (!zones.some((a) => a.name === l.zone)) err(`${p}.link.zone`, `No zone named "${l.zone}" there; the plaque would open the area without its zone.`);
      }
    });
  }

  if (shipped) {
    shipped.regionIds.forEach((id) => { if (!ids.has(id)) warn("regions", `"${id}" is in the shipped map but not here: renaming or removing it orphans saved player whereabouts.`); });
    shipped.districtSlugs.forEach((s) => { if (!districtZones.has(s)) warn("centrepiece.districts", `District "${s}" is in the shipped map but not here: renaming or removing it orphans saved player whereabouts.`); });
  }
  return out;
}

function checkOutline(v: unknown, path: string, err: (p: string, m: string) => void): boolean {
  if (!Array.isArray(v) || !v.every(isPt)) { err(path, "Outline must be a list of [x, y] points."); return false; }
  if (v.length < 3) { err(path, "An outline needs at least 3 points."); return false; }
  return true;
}

function checkLore(r: Record<string, unknown>, p: string, err: (p: string, m: string) => void, warn: (p: string, m: string) => void) {
  for (const k of ["name", "house", "crest", "house_color", "sector", "coord", "tagline", "blurb"]) if (!isStr(r[k])) err(`${p}.${k}`, `"${k}" must be text.`);
  if (isStr(r.name) && !r.name.trim()) err(`${p}.name`, "Needs a name.");
  if (isStr(r.blurb) && !r.blurb.trim()) warn(`${p}.blurb`, `${r.name || p} has no blurb.`);
  if (isStr(r.house_color) && !(HOUSE_COLORS as readonly string[]).includes(r.house_color)) warn(`${p}.house_color`, `"${r.house_color}" is not a house palette colour (${HOUSE_COLORS.join(", ")}).`);
  if (!Array.isArray(r.facts) || !r.facts.every((f) => Array.isArray(f) && f.length === 2 && isStr(f[0]) && isStr(f[1]))) err(`${p}.facts`, "facts must be a list of [label, value] pairs.");
}

function checkSub(a: unknown, p: string, err: (p: string, m: string) => void, warn: (p: string, m: string) => void, inRegion = false) {
  if (!isObj(a)) { err(p, "Zone must be an object."); return; }
  for (const k of ["x", "y", "w", "lx", "ly"]) if (!isNum(a[k])) err(`${p}.${k}`, `"${k}" must be a number.`);
  if (typeof a.on !== "boolean") err(`${p}.on`, '"on" must be true or false.');
  for (const k of ["name", "blurb", "generic"]) if (a[k] !== null && !isStr(a[k])) err(`${p}.${k}`, `"${k}" must be text or null.`);
  if (isStr(a.generic) && !(GENERIC_TYPES as readonly string[]).includes(a.generic)) warn(`${p}.generic`, `Unknown generic type "${a.generic}" (no stock blurb).`);
  if (inRegion && a.on === false) warn(`${p}.on`, "Region zones are always shown; remove the zone instead of switching it off.");
  if (inRegion && a.generic) warn(`${p}.generic`, "Region zones ignore generic types; give the zone a name.");
  if (a.on && !a.name && !a.generic) warn(p, "Zone is on but has neither a name nor a generic type; it shows as \"Sub-area X\".");
}

function checkLegacy(v: unknown, p: string, err: (p: string, m: string) => void) {
  if (!isObj(v) || !Array.isArray(v.points) || !v.points.every(isPt) || !isPt(v.label)) err(p, "legacy must be { points: [[x,y]…], label: [x,y] }.");
}
