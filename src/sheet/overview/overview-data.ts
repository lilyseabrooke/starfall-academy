/* ===========================================================================
   Starfall Academy — character sheet overview: the data model
   ---------------------------------------------------------------------------
   Compiles a character down to the one-page summary the Overview card renders:
   who they are, what they're ranked in, and the names of everything they know
   or carry. Deliberately NOT tied to character creation — `overviewFromSource`
   reads the same shapes the durable SerializedSheet stores, so a character
   pulled back out of gameplay summarises exactly like one still in the Forge.
   `overviewFromDraft` is the Forge's adapter: it runs the draft through the
   existing payload builders (forge-state) and hands the result to the same
   compiler.
   =========================================================================== */
import type { CharacterVitals, ClassState, MagicSchool, Stat, Tone } from "../types";
import type { ClassDef } from "../data/classes";
import { ROMAN, levelTone } from "../data/shared";
import * as F from "../forge/forge-state";
import type { Draft, ForgeData } from "../forge/forge-state";

/* ------------------------------------------------------------- source --- */

/** What the compiler needs, structurally — a superset of both the live sheet
 *  state and what the Forge's payload builders produce. Kept loose (names and
 *  ranks only) so neither side has to be cast into the other's shape. */
export interface OverviewSource {
  c: Pick<CharacterVitals, "name" | "pronouns" | "title" | "house" | "houseTone" | "year" | "major">;
  stats: Stat[];
  schools: MagicSchool[];
  classState: ClassState;
  spells: { name: string; level?: string; days?: number }[];
  inventory: {
    wands?: { name: string; equipped?: boolean }[];
    artifacts?: { name: string }[];
    potions?: { name: string; qty?: number }[];
    plants?: { name: string }[];
    glyphs?: { name: string }[];
    items?: { name: string; qty?: number }[];
  };
}

/* -------------------------------------------------------------- model --- */

/** One named thing — a spell, a wand, a potion. Names only, by design: the
 *  card is a one-page summary, not a second sheet. */
export interface OverviewEntry {
  name: string;
  /** A count ("×3") or a one-word qualifier ("learning"). */
  note?: string;
  tone?: Tone;
  /** Held but not yet usable (a spell still being learned). */
  dim?: boolean;
}

export interface OverviewGroup {
  id: string;
  label: string;
  icon: string;
  entries: OverviewEntry[];
}

export interface OverviewStat {
  id: string;
  name: string;
  rank: number;
  tone: Tone;
  icon: string;
  skills: { id: string; name: string; rank: number }[];
}

export interface OverviewSchool {
  id: string;
  name: string;
  tone: Tone;
  icon: string;
  subjects: { key: string; name: string; rank: number; major: boolean }[];
}

export interface OverviewClass {
  id: string;
  name: string;
  rank: number;
  /** The rank as a numeral, e.g. "IV". */
  rankLabel: string;
  tone: Tone;
  icon: string;
  /** Titles of the option chosen at each rank reached — names only. */
  abilities: string[];
}

export interface OverviewModel {
  name: string;
  pronouns: string;
  title: string;
  house: string;
  houseTone: Tone;
  year: string;
  majors: string[];
  stats: OverviewStat[];
  schools: OverviewSchool[];
  classes: OverviewClass[];
  spells: OverviewEntry[];
  inventory: OverviewGroup[];
  /** Nothing invested and nothing carried — a card with only a name on it. */
  empty: boolean;
}

/* ----------------------------------------------------------- compiler --- */

const countNote = (qty?: number) => (qty != null && qty > 1 ? "×" + qty : undefined);

/** Every rank ability the character has actually chosen, in rank order. A rank
 *  with no recorded choice (or a class the current class data no longer knows)
 *  is skipped rather than guessed at. */
function abilitiesOf(def: ClassDef, entry: { rank: number; choices: Record<string, number> }): string[] {
  const out: string[] = [];
  for (let level = 1; level <= (entry.rank || 0); level++) {
    const rung = def.ranks[level - 1];
    const side = entry.choices ? entry.choices[level] : undefined;
    const opt = rung && side != null ? rung.options[side] : null;
    if (opt && opt.title) out.push(opt.title);
  }
  return out;
}

export function overviewFromSource(src: OverviewSource, classes: ClassDef[]): OverviewModel {
  const c = src.c;
  const majorKeys = Array.isArray(c.major) ? c.major : [];
  const subjectName = (key: string) => {
    for (const sc of src.schools) {
      const s = sc.subjects.find((x) => x.key === key);
      if (s) return s.name;
    }
    return key;
  };

  // Only what has points in it: a stat earns its place through its own rank or
  // through a trained skill under it.
  const stats: OverviewStat[] = src.stats
    .map((f) => ({
      id: f.id,
      name: f.name,
      rank: f.rank || 0,
      tone: f.tone,
      icon: f.icon,
      skills: (f.skills || []).filter((s) => (s.rank || 0) > 0).map((s) => ({ id: s.id, name: s.name, rank: s.rank })),
    }))
    .filter((f) => f.rank > 0 || f.skills.length > 0);

  const schools: OverviewSchool[] = src.schools
    .map((sc) => ({
      id: sc.id,
      name: sc.name,
      tone: sc.tone,
      icon: sc.icon,
      subjects: (sc.subjects || [])
        .filter((s) => (s.rank || 0) > 0)
        .map((s) => ({ key: s.key, name: s.name, rank: s.rank, major: majorKeys.includes(s.key) })),
    }))
    .filter((sc) => sc.subjects.length > 0);

  const owned: OverviewClass[] = Object.keys(src.classState || {})
    .filter((id) => (src.classState[id].rank || 0) > 0)
    .map((id) => {
      const def = classes.find((k) => k.id === id);
      const entry = src.classState[id];
      return {
        id,
        name: def ? def.name : id,
        rank: entry.rank,
        rankLabel: ROMAN[entry.rank] || String(entry.rank),
        tone: (def ? def.tone : "gold") as Tone,
        icon: def ? def.icon : "graduation-cap",
        abilities: def ? abilitiesOf(def, entry) : [],
      };
    })
    .sort((a, b) => b.rank - a.rank);

  // Known spells first, still-being-learned ones after and dimmed.
  const spells: OverviewEntry[] = (src.spells || [])
    .map((sp) => {
      const learning = (sp.days || 0) > 0;
      return {
        name: sp.name,
        tone: levelTone(sp.level) || undefined,
        dim: learning,
        note: learning ? "learning" : undefined,
      };
    })
    .sort((a, b) => Number(!!a.dim) - Number(!!b.dim));

  const inv = src.inventory || {};
  const inventory: OverviewGroup[] = [
    { id: "wand", label: "Wands", icon: "wand-sparkles", entries: (inv.wands || []).map((w) => ({ name: w.name, note: w.equipped ? "equipped" : undefined })) },
    { id: "artifact", label: "Artifacts", icon: "gem", entries: (inv.artifacts || []).map((a) => ({ name: a.name })) },
    { id: "potion", label: "Potions", icon: "flask-conical", entries: (inv.potions || []).map((p) => ({ name: p.name, note: countNote(p.qty) })) },
    { id: "plant", label: "Plants", icon: "leaf", entries: (inv.plants || []).map((p) => ({ name: p.name })) },
    { id: "glyph", label: "Glyphs", icon: "pen-tool", entries: (inv.glyphs || []).map((g) => ({ name: g.name })) },
    { id: "item", label: "Items", icon: "package", entries: (inv.items || []).map((i) => ({ name: i.name, note: countNote(i.qty) })) },
  ].filter((g) => g.entries.length > 0);

  return {
    name: (c.name || "").trim() || "Unnamed arcanist",
    pronouns: (c.pronouns || "").trim(),
    title: (c.title || "").trim(),
    house: c.house || "",
    houseTone: c.houseTone || "gold",
    year: c.year || "",
    majors: majorKeys.map(subjectName),
    stats,
    schools,
    classes: owned,
    spells,
    inventory,
    empty: !stats.length && !schools.length && !owned.length && !spells.length && !inventory.length,
  };
}

/* ------------------------------------------------------ Forge adapter --- */

/** The live half of an edit-mode ("respec") overview. A respec only ever edits
 *  identity + stat/ability allocation (see commitForge), so everything else on
 *  the card has to come off the character the player walked in with. */
export type OverviewLive = Pick<OverviewSource, "classState" | "spells" | "inventory">;

/** A draft, compiled through the Forge's own payload builders — the same
 *  objects "Begin" would commit, so the card previews the real character. */
export function sourceFromDraft(draft: Draft, D: ForgeData, classData: { classes: ClassDef[] }, live?: OverviewLive | null): OverviewSource {
  const built = F.buildCharacter(draft, D);
  const respec = draft.mode === "edit" && !!live;
  return {
    c: {
      name: built.name, pronouns: built.pronouns, title: built.title,
      house: built.house, houseTone: built.houseTone, year: built.year, major: built.major,
    },
    stats: F.buildStats(draft, D),
    schools: F.buildSchools(draft, D),
    classState: respec ? live!.classState : F.buildClassState(draft),
    spells: respec ? live!.spells : F.buildSpells(draft, D),
    inventory: respec
      ? live!.inventory
      : {
          wands: [F.buildStartingWand(draft, D), ...F.buildExtraWands(draft, D)],
          artifacts: F.buildArtifacts(draft, D, classData),
          potions: F.buildPotions(draft, D).map((p) => p.vial),
          plants: F.buildPlants(draft, D),
          glyphs: F.buildGlyphs(draft, D),
        },
  };
}

export function overviewFromDraft(draft: Draft, D: ForgeData, classData: { classes: ClassDef[] }, live?: OverviewLive | null): OverviewModel {
  return overviewFromSource(sourceFromDraft(draft, D, classData, live), classData.classes);
}
