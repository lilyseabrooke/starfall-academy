/* ===========================================================================
   Mapmaker — `.map.json` ⇄ AtlasDefinition.

   jsonToAtlas is the bake: the same function the /mapmaker preview renders
   through and `scripts/bake-map.ts` writes out, so what you preview is what
   ships. atlasToJson goes the other way (used to import the campus).

   Neither function mutates its input. The renderer materialises sub-areas
   lazily onto the objects it is given (seed.sub, submap._zones), so both
   directions build fresh objects.
   =========================================================================== */
import type { AtlasDefinition, DistrictSeed, Point, Region, SubArea, SubAreaSeed, WorldSeed } from "../sheet/data/map/types";
import { polylabel, ptsToStr, shieldOutline, smoothClosed, toPts, voronoiCells } from "../sheet/data/map/geom";
import {
  MAP_FORMAT, MAP_FORMAT_VERSION, SUB_TAG_LETTERS, slugOf,
  type CentrepieceJson, type DistrictJson, type LoreJson, type MapJson, type Pt, type RegionJson, type SpecialJson, type SubAreaJson,
} from "./format";

const TAGS = SUB_TAG_LETTERS as readonly string[];
const SUB_DEFAULTS: Pt[] = [[330, 250], [500, 232], [670, 250], [345, 470], [500, 492], [655, 470]];
const round1 = (n: number) => Math.round(n * 10) / 10;

/* ---- sub-area materialisation (pure copies of the renderer's rules) ------- */

/** A region's zones exactly as hosts.ensureRegionZones builds them. */
export function regionZones(sm: Region["submap"]): SubArea[] {
  const pos = sm.subPos || {}, authored = sm.subs || [], lbl = sm.subLabel || {};
  return authored.map((a, i): SubArea => {
    const t = TAGS[i], p = pos[t];
    return {
      tag: t, name: a.name ?? null, blurb: a.blurb ?? null,
      x: p ? p[0] : 500, y: p ? p[1] : 380, w: p ? (p[2] || 0) : 0, on: true, generic: null,
      lx: lbl[t] ? lbl[t][0] : 0, ly: lbl[t] ? lbl[t][1] : 0,
    };
  });
}

/** A centrepiece district's six zones exactly as citadelData.ensureSubAreas builds them. */
export function districtZones(seed: DistrictSeed): SubArea[] {
  const authored = seed.subs || [], pos = seed.subPos || {}, gen = seed.subGen || {}, lbl = seed.subLabel || {};
  return TAGS.map((t, i): SubArea => {
    const a: SubAreaSeed = authored[i] || {}, p = pos[t];
    return {
      tag: t, x: p ? p[0] : SUB_DEFAULTS[i][0], y: p ? p[1] : SUB_DEFAULTS[i][1], w: p ? (p[2] || 0) : 0, on: p ? !!p[3] : true,
      generic: a.generic || gen[t] || null,
      lx: lbl[t] ? (lbl[t][0] || 0) : 0, ly: lbl[t] ? (lbl[t][1] || 0) : 0,
      name: a.name ?? null, blurb: a.blurb ?? null,
    };
  });
}

const subToJson = (a: SubArea): SubAreaJson => ({ x: a.x, y: a.y, w: a.w, on: a.on, lx: a.lx, ly: a.ly, name: a.name, blurb: a.blurb, generic: a.generic });

/* ---- AtlasDefinition → JSON ------------------------------------------------ */

const loreOf = (r: Region): LoreJson => ({
  name: r.name, house: r.house, crest: r.crest, house_color: r.house_color, sector: r.sector,
  coord: r.coord, tagline: r.tagline, blurb: r.blurb, facts: r.facts.map((f) => [f[0], f[1]]),
});

export function atlasToJson(atlas: AtlasDefinition): MapJson {
  const cId = atlas.centrepiece?.regionId ?? null;
  const regions: RegionJson[] = atlas.seeds.map((s) => {
    const r = atlas.regions.find((q) => q.id === s.id);
    if (!r) throw new Error(`Seed "${s.id}" has no region.`);
    const seed = { x: s.x, y: s.y, w: s.w, ldx: s.ldx, ldy: s.ldy, ...(s.splitLabel ? { splitLabel: true } : {}) };
    return {
      id: r.id, ...loreOf(r), seed,
      submap: {
        view: [r.submap.view[0], r.submap.view[1]],
        outline: toPts(r.submap.outline || "") as Pt[],
        subs: regionZones(r.submap).map(subToJson),
      },
      legacy: { points: toPts(r.points) as Pt[], label: [r.label[0], r.label[1]] },
    };
  });
  const orphans = atlas.regions.filter((r) => r.id !== cId && !atlas.seeds.some((s) => s.id === r.id));
  if (orphans.length) throw new Error(`Regions without a world seed: ${orphans.map((r) => r.id).join(", ")}.`);

  let centrepiece: CentrepieceJson | null = null;
  if (atlas.centrepiece) {
    const ac = atlas.centrepiece;
    const r = atlas.regions.find((q) => q.id === ac.regionId);
    if (!r) throw new Error(`Centrepiece region "${ac.regionId}" not found.`);
    const sm = r.submap, g = sm.shieldGeom!, o = sm.shieldOpts || {};
    const all = sm.seeds || [];
    const districts: DistrictJson[] = all.filter((d) => !d.special).map((d) => ({
      name: d.name, tag: d.tag, x: d.x, y: d.y, w: d.w || 0, color: d.color || "",
      labelDx: d.labelDx || 0, labelDy: d.labelDy || 0, blurb: d.blurb || "",
      subs: districtZones(d).map(subToJson),
    }));
    const specials: SpecialJson[] = all.filter((d) => d.special).map((d) => ({
      name: d.name, x: d.x, y: d.y, blurb: d.blurb || "",
      link: { district: d.link ? d.link[0] : "", zone: d.link ? d.link[1] : "" },
    }));
    centrepiece = {
      id: r.id, ...loreOf(r),
      place: { ...ac.place }, label: [...ac.label], eyebrow: ac.eyebrow, districtHouse: ac.districtHouse,
      view: [sm.view[0], sm.view[1]],
      shield: { cx: g.cx, top: g.top, hw: g.hw, h: g.h },
      opts: { spike: o.spike ?? 0.095, shoulder: o.shoulder ?? -0.02, side: o.side ?? 0.40 },
      districts, specials,
      legacy: { points: toPts(r.points) as Pt[], label: [r.label[0], r.label[1]] },
    };
  }

  const legend = atlas.regions.map((r) => r.id);
  const defaultLegend = [...regions.map((r) => r.id), ...(centrepiece ? [centrepiece.id] : [])];
  return {
    format: MAP_FORMAT, version: MAP_FORMAT_VERSION,
    id: atlas.id, name: atlas.name, eyebrow: atlas.eyebrow, title: atlas.title,
    field: [atlas.field[0], atlas.field[1]], fit: { ...atlas.fit },
    outline: toPts(atlas.outline) as Pt[], watermark: atlas.watermark,
    ...(atlas.crest ? { crest: atlas.crest } : {}),
    regions,
    ...(legend.join() !== defaultLegend.join() ? { legendOrder: legend } : {}),
    pois: atlas.pois.map((p) => ({ id: p.id, name: p.name, x: p.x, y: p.y, link: { ...p.link } })),
    centrepiece,
    ...(atlas.about ? { about: { blurb: atlas.about.blurb, facts: (atlas.about.facts ?? []).map((f) => [f[0], f[1]] as [string, string]) } } : {}),
  };
}

/* ---- JSON → AtlasDefinition (the bake) ------------------------------------- */

const toStr = (pts: Pt[]) => pts.map((q) => q[0] + "," + q[1]).join(" ");

/** Sparse runtime side tables from complete sub-area records. */
function subTables(subs: SubAreaJson[]) {
  const subPos: Record<string, [number, number, number, number]> = {};
  const subLabel: Record<string, [number, number]> = {};
  const subGen: Record<string, string> = {};
  subs.forEach((a, i) => {
    const t = TAGS[i];
    subPos[t] = [a.x, a.y, a.w, a.on ? 1 : 0];
    if (a.lx || a.ly) subLabel[t] = [a.lx, a.ly];
    if (a.generic) subGen[t] = a.generic;
  });
  // Authored text, trimmed of trailing entries that carry nothing.
  const text: SubAreaSeed[] = subs.map((a) => ({
    ...(a.name != null ? { name: a.name } : {}),
    ...(a.blurb != null ? { blurb: a.blurb } : {}),
  }));
  while (text.length && !Object.keys(text[text.length - 1]).length) text.pop();
  return { subPos, subLabel, subGen, subs: text };
}

const loreToRegion = (l: LoreJson) => ({
  name: l.name, house: l.house, crest: l.crest, house_color: l.house_color, sector: l.sector,
  coord: l.coord, tagline: l.tagline, blurb: l.blurb, facts: l.facts.map((f) => [f[0], f[1]] as [string, string]),
});

/** Build the renderer's AtlasDefinition from a (validated) `.map.json`. */
export function jsonToAtlas(m: MapJson): AtlasDefinition {
  const seeds: WorldSeed[] = m.regions.map((r) => ({
    id: r.id, x: r.seed.x, y: r.seed.y, w: r.seed.w, ldx: r.seed.ldx, ldy: r.seed.ldy,
    ...(r.seed.splitLabel ? { splitLabel: true } : {}),
  }));
  // Live cells, only to derive the legacy polygon/anchor for new regions.
  const cells = voronoiCells(seeds, smoothClosed(m.outline as Point[]));

  const regions: Region[] = m.regions.map((r, i) => {
    const t = subTables(r.submap.subs);
    const cell = cells[i] || "";
    const points = r.legacy ? toStr(r.legacy.points) : roundStr(cell);
    const label: Point = r.legacy ? [r.legacy.label[0], r.legacy.label[1]] : roundPt(cell ? polylabel(cell) : [r.seed.x, r.seed.y]);
    return {
      id: r.id, ...loreToRegion(r), points, label,
      submap: {
        view: [r.submap.view[0], r.submap.view[1]],
        outline: toStr(r.submap.outline),
        subPos: t.subPos,
        ...(Object.keys(t.subLabel).length ? { subLabel: t.subLabel } : {}),
        subs: t.subs,
      },
    };
  });

  const c = m.centrepiece;
  if (c) {
    const districtSeeds: DistrictSeed[] = c.districts.map((d) => {
      const t = subTables(d.subs);
      return {
        name: d.name, tag: d.tag, x: d.x, y: d.y,
        ...(d.color ? { color: d.color } : {}),
        ...(d.w ? { w: d.w } : {}),
        ...(d.labelDx ? { labelDx: d.labelDx } : {}),
        ...(d.labelDy ? { labelDy: d.labelDy } : {}),
        blurb: d.blurb,
        subPos: t.subPos,
        ...(Object.keys(t.subGen).length ? { subGen: t.subGen } : {}),
        ...(Object.keys(t.subLabel).length ? { subLabel: t.subLabel } : {}),
        subs: t.subs,
      };
    });
    const specialSeeds: DistrictSeed[] = c.specials.map((s) => ({
      name: s.name, tag: "✦", special: true, link: [s.link.district, s.link.zone], x: s.x, y: s.y, blurb: s.blurb,
    }));
    const p = c.place;
    const points = c.legacy ? toStr(c.legacy.points) : roundStr(ptsToStr(shieldOutline(p.cx, p.top, p.hw, p.h, c.opts, 4)));
    const label: Point = c.legacy ? [c.legacy.label[0], c.legacy.label[1]] : [p.cx, round1(p.top + p.h * 0.42)];
    regions.push({
      id: c.id, ...loreToRegion(c), isCitadel: true, points, label,
      submap: {
        view: [c.view[0], c.view[1]],
        shield: true,
        shieldGeom: { ...c.shield },
        shieldOpts: { ...c.opts },
        seeds: [...districtSeeds, ...specialSeeds],
      },
    });
  }

  if (m.legendOrder) {
    const at = new Map(m.legendOrder.map((id, i) => [id, i]));
    regions.sort((a, b) => (at.get(a.id) ?? 1e9) - (at.get(b.id) ?? 1e9));
  }

  return {
    id: m.id, name: m.name, eyebrow: m.eyebrow, title: m.title,
    field: [m.field[0], m.field[1]], fit: { ...m.fit },
    outline: toStr(m.outline),
    seeds, regions,
    pois: m.pois.map((q) => ({ id: q.id, name: q.name, link: { ...q.link }, x: q.x, y: q.y })),
    centrepiece: c ? { regionId: c.id, place: { ...c.place }, label: [...c.label], eyebrow: c.eyebrow, districtHouse: c.districtHouse } : null,
    watermark: m.watermark,
    ...(m.crest ? { crest: m.crest } : {}),
    ...(m.about?.blurb.trim()
      ? { about: { blurb: m.about.blurb, ...(m.about.facts.length ? { facts: m.about.facts.map((f) => [f[0], f[1]] as [string, string]) } : {}) } }
      : {}),
  };
}

function roundStr(pointStr: string): string {
  return pointStr ? toPts(pointStr).map(([x, y]) => round1(x) + "," + round1(y)).join(" ") : "";
}
const roundPt = (p: Point): Point => [round1(p[0]), round1(p[1])];

/* ---- semantic comparison (round-trip test) -------------------------------- */

/** An atlas reduced to what the renderer actually reads: sub-area side tables
 *  replaced by their materialised zones, optional zero/empty fields filled.
 *  Two atlases with equal normal forms render identically. */
export function normaliseAtlas(a: AtlasDefinition): unknown {
  return {
    ...a,
    seeds: a.seeds.map((s) => ({ ...s, splitLabel: !!s.splitLabel })),
    regions: a.regions.map((r) => {
      const sm = r.submap;
      const base = { ...r, isCitadel: !!r.isCitadel, submap: { view: sm.view } as Record<string, unknown> };
      if (sm.shield) {
        Object.assign(base.submap, {
          shield: true, shieldGeom: sm.shieldGeom, shieldOpts: sm.shieldOpts,
          seeds: (sm.seeds || []).map((d) => d.special
            ? { name: d.name, tag: d.tag, special: true, link: d.link, x: d.x, y: d.y, blurb: d.blurb || "" }
            : {
                name: d.name, tag: d.tag, special: false, x: d.x, y: d.y, color: d.color || "", w: d.w || 0,
                labelDx: d.labelDx || 0, labelDy: d.labelDy || 0, blurb: d.blurb || "", zones: districtZones(d),
              }),
        });
      } else {
        Object.assign(base.submap, { outline: sm.outline, zones: regionZones(sm) });
      }
      return base;
    }),
  };
}

/** Deep diff with a float tolerance. Returns human-readable paths that differ. */
export function deepDiff(a: unknown, b: unknown, path = "", eps = 1e-6, out: string[] = []): string[] {
  if (typeof a === "number" && typeof b === "number") {
    if (Math.abs(a - b) > eps) out.push(`${path}: ${a} ≠ ${b}`);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path}: length ${a.length} ≠ ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) deepDiff(a[i], b[i], `${path}[${i}]`, eps, out);
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    for (const k of new Set([...ka, ...kb])) {
      if (k.startsWith("_")) continue; // renderer caches (_zones, _cell, _slug)
      deepDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k, eps, out);
    }
  } else if (a !== b) out.push(`${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
  return out;
}

export { slugOf };
