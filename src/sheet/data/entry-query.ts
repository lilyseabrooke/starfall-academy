/* ===========================================================================
   Starfall Academy — shared entry query config + logic
   ---------------------------------------------------------------------------
   The search / filter / sort machinery behind the Compendium drawer, the
   character-creator Spells step, and the Inventory picks. Kept framework-free
   (pure config + functions) so the Compendium and the Forge share one source
   of truth for how each category is filtered and ordered.
   =========================================================================== */
import type { CompendiumEntry } from "../types";

export type RangeValue = [number | null, number | null];

export const COMP_LEVEL_ORDER: Record<string, number> = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4, twisted: 4 };
export const compLevelRank = (v: string | null | undefined) => {
  if (!v) return 99;
  const f = String(v).trim().toLowerCase().split(/\s+/)[0];
  return COMP_LEVEL_ORDER[f] != null ? COMP_LEVEL_ORDER[f] : 50;
};

export const COMP_SORT_FIELDS: Record<string, Array<[string, string, string]>> = {
  spell: [["name", "Name", "text"], ["subject", "Subject", "text"], ["stat", "Stat", "text"], ["level", "Level", "level"], ["dc", "DC", "num"]],
  move: [["name", "Name", "text"], ["level", "Tier", "text"]],
  artifact: [["name", "Name", "text"], ["subject", "Subject", "text"], ["level", "Level", "level"], ["intensity", "Intensity", "num"]],
  potion: [["name", "Name", "text"], ["cost", "Cost", "num"], ["intensity", "Intensity", "num"]],
  wand: [["name", "Name", "text"]],
  glyph: [["name", "Name", "text"], ["value", "Cost", "num"], ["intensity", "Intensity", "num"]],
  item: [["name", "Name", "text"]],
  plant: [["name", "Name", "text"], ["value", "Value", "num"], ["intensity", "Intensity", "num"]],
};

export type FilterCfg =
  | { kind: "select"; key: string; label: string }
  | { kind: "level"; levels: string[] }
  | { kind: "range"; key: string; label: string }
  | { kind: "radio"; key: string; label: string };

export const COMP_FILTERS: Record<string, FilterCfg[]> = {
  spell: [{ kind: "select", key: "subject", label: "Subject" }, { kind: "select", key: "stat", label: "Stat" }, { kind: "level", levels: ["Basic", "Standard", "Advanced", "Legendary", "Hex"] }, { kind: "range", key: "dc", label: "DC" }, { kind: "radio", key: "ritual", label: "Ritual" }],
  artifact: [{ kind: "select", key: "subject", label: "Subject" }, { kind: "level", levels: ["Basic", "Standard", "Advanced", "Legendary", "Twisted"] }, { kind: "range", key: "intensity", label: "Intensity" }],
  potion: [{ kind: "range", key: "cost", label: "Cost" }, { kind: "range", key: "intensity", label: "Intensity" }],
  glyph: [{ kind: "range", key: "value", label: "Cost" }, { kind: "range", key: "intensity", label: "Intensity" }],
  plant: [{ kind: "range", key: "value", label: "Value" }, { kind: "range", key: "intensity", label: "Intensity" }, { kind: "radio", key: "removeOnUse", label: "Single-use" }],
  move: [],
  wand: [],
  item: [],
};

export type FilterValue = string | RangeValue;
export type Filters = Record<string, FilterValue>;
export type SortState = { field: string; dir: "asc" | "desc" };

export const field = (e: CompendiumEntry, k: string) => (e as unknown as Record<string, unknown>)[k];

/** Initial (unset) filter values for a category's filter config. */
export function buildInitFilters(cat: string): Filters {
  const o: Filters = {};
  (COMP_FILTERS[cat] || []).forEach((f) => {
    if (f.kind === "range") o[f.key] = [null, null];
    else if (f.kind === "level") o.level = "any";
    else o[f.key] = "any";
  });
  return o;
}

const uniq = (arr: unknown[]) => [...new Set(arr.filter((v) => v != null && v !== ""))] as string[];

/** Distinct values present for a select facet. */
export const selectOptions = (items: CompendiumEntry[], key: string) => uniq(items.map((e) => field(e, key)));

/** Slider bounds/step for a range facet, derived from the data on hand. */
export function rangeMeta(items: CompendiumEntry[], key: string) {
  let m = 0;
  items.forEach((e) => {
    const v = parseFloat(String(field(e, key)));
    if (!isNaN(v) && v > m) m = v;
  });
  const step = key === "cost" ? 10 : 1;
  const max = key === "cost" ? Math.max(step, Math.ceil(m / step) * step) : Math.max(1, Math.ceil(m));
  return { max, step };
}

/** Number of active (non-default) facets. */
export function countFacets(cfg: FilterCfg[], filters: Filters) {
  return cfg.reduce((n, f) => {
    if (f.kind === "range") {
      const r = (filters[f.key] as RangeValue) || [null, null];
      return n + (r[0] != null || r[1] != null ? 1 : 0);
    }
    const k = f.kind === "level" ? "level" : f.key;
    return n + (filters[k] && filters[k] !== "any" ? 1 : 0);
  }, 0);
}

/** Apply a category's facet config + free-text query to a list of entries. */
export function applyFilters(items: CompendiumEntry[], cfg: FilterCfg[], filters: Filters, q: string) {
  const query = q.trim().toLowerCase();
  return items.filter((e) => {
    for (const f of cfg) {
      if (f.kind === "select") {
        const v = filters[f.key] as string;
        if (v && v !== "any" && field(e, f.key) !== v) return false;
      } else if (f.kind === "level") {
        const v = filters.level as string;
        if (v && v !== "any" && e.level !== v) return false;
      } else if (f.kind === "radio") {
        const v = filters[f.key] as string;
        if (v && v !== "any") {
          const want = v === "yes";
          if (!!field(e, f.key) !== want) return false;
        }
      } else if (f.kind === "range") {
        const r = (filters[f.key] as RangeValue) || [null, null];
        const val = parseFloat(String(field(e, f.key)));
        if (r[0] != null && (isNaN(val) || val < r[0])) return false;
        if (r[1] != null && (isNaN(val) || val > r[1])) return false;
      }
    }
    if (query) {
      const hay = (e.name + " " + (e.meta || []).join(" ") + " " + e.desc + " " + (e.ability || "") + " " + (e.subject || "") + " " + (e.stat || "")).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

/** Sort a list of entries by a category's sort fields + current order. */
export function applySort(items: CompendiumEntry[], sortFields: Array<[string, string, string]>, sort: SortState) {
  const sign = sort.dir === "asc" ? 1 : -1;
  const type = (sortFields.find((f) => f[0] === sort.field) || [])[2] || "text";
  return items.slice().sort((a, b) => {
    let r: number;
    if (type === "num") {
      const av = parseFloat(String(field(a, sort.field)));
      const bv = parseFloat(String(field(b, sort.field)));
      const am = isNaN(av);
      const bm = isNaN(bv);
      if (am || bm) r = am && bm ? 0 : am ? 1 : -1;
      else r = av - bv;
    } else if (type === "level") {
      r = compLevelRank(field(a, sort.field) as string) - compLevelRank(field(b, sort.field) as string);
    } else {
      r = String(field(a, sort.field) || "").toLowerCase().localeCompare(String(field(b, sort.field) || "").toLowerCase());
    }
    if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    return r * sign;
  });
}
