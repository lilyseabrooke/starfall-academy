/* ===========================================================================
   Starfall Academy — sheet search
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/search.js (window.SF_SEARCH). Builds a
   searchable index over all sheet content and ranks matches for the search
   menu. `data` carries the matched entity (heterogeneous by `type`).
   =========================================================================== */
import type {
  Artifact,
  Bonus,
  ClassState,
  Condition,
  Glyph,
  Item,
  MagicSchool,
  Move,
  Plant,
  Potion,
  Recipe,
  Spell,
  Stat,
  Wand,
} from "../types";
import type { ClassDef } from "./classes";

/** Map region shapes the index reads (full map types live with the map tab). */
export interface MapPlace {
  name: string;
  [k: string]: unknown;
}
export interface MapSeed {
  name?: string;
  subs?: MapPlace[];
}
export interface MapRegion {
  id: string;
  name: string;
  submap?: { seeds?: MapSeed[]; subs?: MapPlace[] };
}

export interface SearchContext {
  stats?: Stat[];
  schools?: MagicSchool[];
  spells?: Spell[];
  moves?: Move[];
  artifacts?: Artifact[];
  potions?: Potion[];
  recipes?: Recipe[];
  plants?: Plant[];
  items?: Item[];
  glyphs?: Glyph[];
  wands?: Wand[];
  conditions?: Condition[];
  classState?: ClassState;
  classes?: ClassDef[];
  locations?: MapRegion[];
  bonuses?: Bonus[];
}

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  category: string;
  data: unknown;
  section: string;
  rollable?: boolean;
  parent?: string;
  repairButton?: boolean;
  useButton?: boolean;
  wandcraftButton?: boolean;
  showStacks?: boolean;
  showRank?: number;
  relevance?: number;
}

/** Build a searchable index from all sheet data. */
export function buildIndex(ctx: SearchContext): SearchResult[] {
  const results: SearchResult[] = [];
  const {
    stats, schools, spells, moves, artifacts, potions, recipes, plants,
    items, glyphs, wands, conditions, classState, classes, locations, bonuses,
  } = ctx;

  (stats || []).forEach((stat) => {
    results.push({ id: `stat-${stat.id}`, type: "stat", name: stat.name, category: "Stat", data: stat, section: "stats", rollable: true });
    (stat.skills || []).forEach((skill) => {
      results.push({ id: `skill-${stat.id}-${skill.id}`, type: "skill", name: skill.name, category: "Skill", data: { stat, skill }, section: "stats", rollable: true, parent: stat.name });
    });
  });

  (schools || []).forEach((school) => {
    (school.subjects || []).forEach((subject) => {
      results.push({ id: `subject-${subject.key}`, type: "subject", name: subject.name, category: "Subject", data: { school, subject }, section: "magic", rollable: true });
    });
  });

  (spells || []).forEach((spell) => {
    results.push({ id: `spell-${spell.id}`, type: "spell", name: spell.name, category: "Spell", data: spell, section: "magic", rollable: true });
  });

  (moves || []).forEach((move) => {
    results.push({ id: `move-${move.id}`, type: "move", name: move.name, category: "Move", data: move, section: "overview", rollable: true });
  });

  (artifacts || []).forEach((artifact) => {
    results.push({ id: `artifact-${artifact.id}`, type: "artifact", name: artifact.name, category: "Artifact", data: artifact, section: "inventory", rollable: !artifact.attuned, repairButton: artifact.condition !== "stable" });
  });

  (potions || []).forEach((potion) => {
    results.push({ id: `potion-${potion.id}`, type: "potion", name: potion.name, category: "Potion", data: potion, section: "inventory", rollable: true });
  });

  (recipes || []).forEach((recipe) => {
    results.push({ id: `recipe-${recipe.id}`, type: "recipe", name: recipe.name, category: "Recipe", data: recipe, section: "inventory", rollable: true });
  });

  (plants || []).forEach((plant) => {
    const isNoRoll = (plant.requiresRoll || "").toUpperCase() === "NO";
    results.push({ id: `plant-${plant.id}`, type: "plant", name: plant.name, category: "Plant", data: plant, section: "inventory", rollable: !isNoRoll, useButton: isNoRoll });
  });

  (items || []).forEach((item) => {
    // Items may carry a `check` field (from the compendium) that makes them rollable.
    const check = (item as Item & { check?: string | null }).check;
    results.push({ id: `item-${item.id}`, type: "item", name: item.name, category: "Item", data: item, section: "inventory", rollable: !!check, useButton: !check });
  });

  (glyphs || []).forEach((glyph) => {
    results.push({ id: `glyph-${glyph.id}`, type: "glyph", name: glyph.name, category: "Glyph", data: glyph, section: "inventory", rollable: false });
  });

  (wands || []).forEach((wand) => {
    const crafting = (wand as Wand & { crafting?: unknown }).crafting;
    results.push({ id: `wand-${wand.id}`, type: "wand", name: wand.name, category: "Wand", data: wand, section: "inventory", wandcraftButton: wand.condition < wand.maxCondition || !!crafting });
  });

  (conditions || []).forEach((condition) => {
    results.push({ id: `condition-${condition.id}`, type: "condition", name: condition.name, category: "Condition", data: condition, section: "overview", rollable: false, showStacks: true });
  });

  (classes || []).forEach((classEntry) => {
    const rank = classState && classState[classEntry.id] ? classState[classEntry.id].rank : 0;
    if (rank > 0) {
      results.push({ id: `class-${classEntry.id}`, type: "class", name: classEntry.name, category: "Class", data: { classEntry, rank }, section: "classes", rollable: false, showRank: rank });
      for (let L = 1; L <= rank; L++) {
        const rung = classEntry.ranks[L - 1];
        if (rung && rung.options) {
          const choices = classState ? classState[classEntry.id].choices : undefined;
          const chosenSide = choices ? choices[L] : null;
          if (chosenSide != null && rung.options[chosenSide]) {
            const opt = rung.options[chosenSide];
            results.push({
              id: `class-ability-${classEntry.id}-${L}-${chosenSide}`,
              type: "class-ability",
              name: opt.title || "",
              category: "Class Ability",
              data: { classEntry, rung, opt, rankLevel: L, side: chosenSide },
              section: "classes",
              rollable: false,
              parent: classEntry.name,
            });
          }
        }
      }
    }
  });

  (bonuses || []).forEach((b) => {
    if (!b || !b.source) return;
    results.push({ id: `bonus-${b.id}`, type: "bonus", name: b.source, category: "Bonus", data: b, section: "overview", rollable: false });
  });

  if (locations && Array.isArray(locations)) {
    locations.forEach((region) => {
      results.push({ id: `location-region-${region.id}`, type: "location", name: region.name, category: "Map Location", data: region, section: "map", rollable: false });
      const submap = region.submap;
      if (!submap) return;
      if (submap.seeds && Array.isArray(submap.seeds)) {
        submap.seeds.forEach((seed) => {
          if (!seed.name) return;
          results.push({ id: `location-seed-${region.id}-${seed.name}`, type: "location", name: seed.name, category: "Map Location", data: { ...seed, parentRegion: region.name }, section: "map", rollable: false, parent: region.name });
          if (seed.subs && Array.isArray(seed.subs)) {
            seed.subs.forEach((place) => {
              results.push({ id: `location-place-${region.id}-${seed.name}-${place.name}`, type: "location", name: place.name, category: "Map Location", data: { ...place, parentRegion: region.name, parentDistrict: seed.name }, section: "map", rollable: false, parent: seed.name });
            });
          }
        });
      } else if (submap.subs && Array.isArray(submap.subs)) {
        submap.subs.forEach((sub) => {
          results.push({ id: `location-sub-${region.id}-${sub.name}`, type: "location", name: sub.name, category: "Map Location", data: { ...sub, parentRegion: region.name, parentRegionId: region.id }, section: "map", rollable: false, parent: region.name });
        });
      }
    });
  }

  (conditions || []).forEach((condition) => {
    results.push({ id: `resist-${condition.id}`, type: "resist", name: `Resist ${condition.name}`, category: "Resist Roll", data: condition, section: "overview", rollable: true });
  });

  return results;
}

const TYPE_ORDER: Record<string, number> = {
  stat: 1, skill: 2, subject: 3, spell: 4, move: 5, artifact: 6, potion: 7,
  recipe: 8, plant: 9, item: 10, glyph: 11, wand: 12, condition: 13,
  resist: 14, class: 15, "class-ability": 16, location: 17,
};

/** Search the index for a query string; returns the top matches by relevance. */
export function search(query: string, index: SearchResult[]): SearchResult[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  const matches: SearchResult[] = [];

  index.forEach((entry) => {
    const name = entry.name.toLowerCase();
    const parent = (entry.parent || "").toLowerCase();
    if (name === q) matches.push({ ...entry, relevance: 100 });
    else if (name.startsWith(q)) matches.push({ ...entry, relevance: 50 });
    else if (name.includes(q)) matches.push({ ...entry, relevance: 25 });
    else if (entry.parent && parent.includes(q)) matches.push({ ...entry, relevance: 10 });
  });

  matches.sort((a, b) => {
    if (a.relevance !== b.relevance) return (b.relevance || 0) - (a.relevance || 0);
    const typeA = TYPE_ORDER[a.type] || 999;
    const typeB = TYPE_ORDER[b.type] || 999;
    if (typeA !== typeB) return typeA - typeB;
    return a.name.localeCompare(b.name);
  });

  return matches.slice(0, 20);
}
