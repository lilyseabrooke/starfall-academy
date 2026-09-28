/* ===========================================================================
   Starfall Atlas — Citadel sub-area data model (typed port of
   atlas-citadel-data.js). Given a district seed (from regions.ts, carrying
   subs/subPos/subGen), materialises seed.sub — the 6 A–F sub-area records
   with position, weight, enabled flag, generic type, and any authored
   name/blurb. No app state, no DOM.
   =========================================================================== */
import type { DistrictSeed, SubArea } from "./types";

export const seedSlug = (s: { name: string }) =>
  s.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const SUB_TAGS = ["A", "B", "C", "D", "E", "F"];
export const SUB_DEFAULTS: [number, number][] = [[330, 250], [500, 232], [670, 250], [345, 470], [500, 492], [655, 470]];

/** Short descriptions for the three generic zone types (used where a zone has
 *  a `generic` but no bespoke blurb). */
export const GENERIC_BLURBS: Record<string, string> = {
  "Residential": "This zone houses some of the many staff and faculty who keep Starfall Academy running, in townhouses and apartments alongside small parks, grocery stores, and other small services.",
  "Class Halls": "The heart of the Academy, class hall zones like this one are designed around magic study and practice, training grounds, professors' offices, and magical resources.",
  "Commercial": "With shops and restaurants, small cafes, magic sundries and arcane services, this zone makes sure everyone has what they need, including mixed-use residential, often some office space, and often some students causing trouble.",
};

/** Materialise a district seed's 6 sub-areas (A–F) from its authored data.
 *  Idempotent — bails if already built or if the seed is a special location. */
export function ensureSubAreas(seed: DistrictSeed): void {
  if (seed.sub || seed.special) return;
  const authored = seed.subs || [];
  const pos = seed.subPos || {};
  const gen = seed.subGen || {};
  const lbl = seed.subLabel || {};
  seed.sub = SUB_TAGS.map((t, i): SubArea => {
    const a = authored[i] || {};
    const p = pos[t];
    const x = p ? p[0] : SUB_DEFAULTS[i][0];
    const y = p ? p[1] : SUB_DEFAULTS[i][1];
    const w = p ? (p[2] || 0) : 0;
    const on = p ? !!p[3] : true;
    const generic = a.generic || gen[t] || null;
    const lx = lbl[t] ? (lbl[t][0] || 0) : 0;
    const ly = lbl[t] ? (lbl[t][1] || 0) : 0;
    return {
      tag: t, x, y, w, on, generic, lx, ly,
      name: a.name ?? null, blurb: a.blurb ?? null,
    };
  });
}

/** Enabled sub-areas as a dossier-list payload (drives "Within these walls"). */
export function subAreaList(seed: DistrictSeed): { name: string; tag: string; blurb: string }[] {
  ensureSubAreas(seed);
  return (seed.sub || []).filter((a) => a.on).map((a) => ({
    name: a.name || a.generic || ("Sub-area " + a.tag),
    tag: a.tag,
    blurb: a.blurb || (a.generic ? GENERIC_BLURBS[a.generic] : "") || "",
  }));
}
