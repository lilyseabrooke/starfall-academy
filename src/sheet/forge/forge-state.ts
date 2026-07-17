/* ===========================================================================
   Starfall Academy — The Admission (Forge): character-creation logic
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/forge-state.js (window.SF_ADMISSION). The
   pure cost engine + draft helpers + payload builders. The wizard UI owns the
   draft React state; this module is the math. Parameterised by a ForgeData `D`
   (seed creation rules/houses/stats/schools + the live compendium).
   =========================================================================== */
import type {
  Bonus,
  CharacterVitals,
  CompendiumEntry,
  MagicSchool,
  Stat,
  Tone,
} from "../types";
import type { CreationRules, House } from "../data/seed";
import type { SerializedSheet } from "../types";

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface ForgeData {
  creation: CreationRules;
  houses: House[];
  stats: Stat[];
  magicSchools: MagicSchool[];
  compendium: CompendiumEntry[];
}

export interface WandAbilityTarget {
  type: string;
  key: string;
  label: string;
}

export interface Draft {
  mode: "new" | "edit";
  name: string;
  pronouns: string;
  yearId: string;
  houseId: string;
  title: string;
  bio: string;
  buildType: "quick" | "custom";
  classMode: "single" | "double";
  classes: Record<string, { rank: number; choices: Record<string, number> }>;
  wandId: string;
  wandTargets: Array<WandAbilityTarget | string | null>;
  stats: Record<string, number>;
  skills: Record<string, number>;
  subjects: Record<string, number>;
  major: string[];
  potions: string[];
  plants: string[];
  glyphs: string[];
  craftWands: string[];
  extraWands: string[];
  artifacts: string[];
  spells: string[];
}

export const yearById = (D: ForgeData, id: string) => D.creation.years.find((y) => y.id === id) || D.creation.years[0];
export const houseById = (D: ForgeData, id: string) => D.houses.find((h) => h.id === id) || D.houses[0];
export const wandById = (D: ForgeData, id: string) => D.creation.startingWands.find((w) => w.id === id) || D.creation.startingWands[0];

export const majorBonus = (draft: Draft) => (draft.major.length === 1 ? 3 : draft.major.length === 2 ? 1 : 0);
export const rankCap = (draft: Draft, D: ForgeData, mapName: string, key: string) => {
  const lim = yearById(D, draft.yearId).limit;
  return mapName === "subjects" && draft.major.includes(key) ? lim + majorBonus(draft) : lim;
};

export interface FlatSubject {
  key: string;
  name: string;
  stat: string;
  school: MagicSchool;
}
export const flatSubjects = (D: ForgeData): FlatSubject[] => {
  const out: FlatSubject[] = [];
  D.magicSchools.forEach((sc) => sc.subjects.forEach((s) => out.push({ key: s.key, name: s.name, stat: s.stat, school: sc })));
  return out;
};
export interface FlatSkill {
  id: string;
  name: string;
  fac: Stat;
}
export const flatSkills = (D: ForgeData): FlatSkill[] => {
  const out: FlatSkill[] = [];
  D.stats.forEach((f) => f.skills.forEach((s) => out.push({ id: s.id, name: s.name, fac: f })));
  return out;
};

export const sumVals = (o: Record<string, number> | undefined) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
export const compById = (D: ForgeData): Record<string, CompendiumEntry> => {
  const m: Record<string, CompendiumEntry> = {};
  D.compendium.forEach((e) => (m[e.id] = e));
  return m;
};

export function blankDraft(): Draft {
  return {
    mode: "new",
    name: "", pronouns: "", yearId: "first", houseId: "dragon", title: "", bio: "",
    buildType: "quick",
    classMode: "single",
    classes: {},
    wandId: "sylene",
    wandTargets: [],
    stats: {}, skills: {}, subjects: {},
    major: [],
    potions: [], plants: [], glyphs: [], craftWands: [],
    extraWands: [], artifacts: [],
    spells: [],
  };
}

/* ---- Cost engine ---- */
export const classPoints = (draft: Draft) => Object.values(draft.classes).reduce((s, c) => s + 2 * (c.rank || 0), 0);
const matPoints = (D: ForgeData, ids: string[], per: number) => {
  const m = compById(D);
  return ids.reduce((s, id) => s + Math.ceil(((m[id] && m[id].mat) || 0) / per), 0);
};

export type Budgets =
  | {
      mode: "quick";
      limit: number;
      stat: { spent: number; pool: number };
      subject: { spent: number; pool: number };
      skill: { spent: number; pool: number };
    }
  | {
      mode: "custom";
      limit: number;
      pool: number;
      spent: number;
      remaining: number;
      breakdown: { stats: number; abilities: number; classes: number; wands: number; artifacts: number };
    };

export function budgets(draft: Draft, D: ForgeData): Budgets {
  const year = yearById(D, draft.yearId);
  const cc = D.creation.custom;
  const statSpent = sumVals(draft.stats), subjSpent = sumVals(draft.subjects), skillSpent = sumVals(draft.skills);
  const classExtra = Math.max(0, classPoints(draft) - cc.freeClassPoints);
  const wandPts = matPoints(D, draft.extraWands, cc.wandPer);
  const artiPts = matPoints(D, draft.artifacts, cc.artifactPer);

  if (draft.buildType === "quick") {
    return {
      mode: "quick", limit: year.limit,
      stat: { spent: statSpent, pool: year.quick.stat },
      subject: { spent: subjSpent, pool: year.quick.subject },
      skill: { spent: skillSpent, pool: year.quick.skill },
    };
  }
  const spent = statSpent * cc.statCost + (subjSpent + skillSpent) * cc.abilityCost + classExtra + wandPts + artiPts;
  return {
    mode: "custom", limit: year.limit, pool: year.custom, spent, remaining: year.custom - spent,
    breakdown: { stats: statSpent * cc.statCost, abilities: (subjSpent + skillSpent) * cc.abilityCost, classes: classExtra, wands: wandPts, artifacts: artiPts },
  };
}

/* ---- Validation ---- */
export const overCap = (draft: Draft, D: ForgeData) => {
  if (draft.mode === "edit") return false;
  const lim = yearById(D, draft.yearId).limit;
  const any = (o: Record<string, number>) => Object.values(o).some((v) => (v || 0) > lim);
  const subjOver = Object.entries(draft.subjects).some(([k, v]) => (v || 0) > rankCap(draft, D, "subjects", k));
  return any(draft.stats) || subjOver || any(draft.skills);
};
export const overBudget = (draft: Draft, D: ForgeData) => {
  if (draft.mode === "edit") return false;
  const b = budgets(draft, D);
  if (b.mode === "quick") return b.stat.spent > b.stat.pool || b.subject.spent > b.subject.pool || b.skill.spent > b.skill.pool;
  return b.spent > b.pool;
};
export const ownedClasses = (draft: Draft) => Object.keys(draft.classes).filter((id) => (draft.classes[id].rank || 0) > 0);
export function classValid(draft: Draft) {
  const owned = ownedClasses(draft);
  if (draft.classMode === "single") return owned.length === 1 && draft.classes[owned[0]].rank >= 4;
  return owned.length === 2 && owned.every((id) => draft.classes[id].rank >= 2);
}
export const wandTargetCount = (draft: Draft, D: ForgeData) => wandById(D, draft.wandId).count;
export const wandValid = (draft: Draft, D: ForgeData) => (draft.wandTargets || []).filter(Boolean).length === wandTargetCount(draft, D);
export const majorValid = (draft: Draft) => draft.major.length >= 1 && draft.major.length <= 2;
export function spellsOk(draft: Draft, D: ForgeData) {
  const q = yearById(D, draft.yearId).spells;
  const m = compById(D);
  const c: Record<string, number> = { Basic: 0, Standard: 0, Advanced: 0 };
  draft.spells.forEach((id) => {
    const e = m[id];
    if (e) {
      const L = e.level;
      if (c[L] != null) c[L]++;
    }
  });
  return c.Basic <= q.Basic && c.Standard <= q.Standard && c.Advanced <= q.Advanced;
}

export function stepValid(id: string, draft: Draft, D: ForgeData) {
  switch (id) {
    case "identity": return draft.name.trim().length > 0;
    case "classes": return classValid(draft) && !overBudget(draft, D);
    case "wand": return wandValid(draft, D);
    case "allocation": return draft.mode === "edit" || (majorValid(draft) && !overCap(draft, D) && !overBudget(draft, D));
    case "inventory": return true;
    case "spells": return spellsOk(draft, D);
    case "review": return true;
    default: return true;
  }
}
export const canBegin = (draft: Draft, D: ForgeData) =>
  !!draft.name.trim() && classValid(draft) && wandValid(draft, D) && majorValid(draft) &&
  (draft.mode === "edit" || (!overCap(draft, D) && !overBudget(draft, D))) && spellsOk(draft, D);

export function spellTally(draft: Draft, D: ForgeData) {
  const m = compById(D);
  const c: Record<string, number> = { Basic: 0, Standard: 0, Advanced: 0 };
  draft.spells.forEach((id) => {
    const e = m[id];
    if (e && c[e.level] != null) c[e.level]++;
  });
  return c;
}

export function yields(draft: Draft, D: ForgeData) {
  const y = D.creation.yields;
  return {
    potions: Math.min(y.alchemyPotionMax, draft.subjects["alchemy"] || 0),
    plantMat: (draft.subjects["herbalism"] || 0) * y.herbalismPlantMat,
    glyphs: (draft.subjects["runology"] || 0) * y.runologyGlyphsPerRank,
    craftMat: (draft.subjects["wandcrafting"] || 0) * y.wandcraftMatPerRank,
  };
}

/* ---- Payload builders ---- */
export function statWandBonus(draft: Draft, D: ForgeData): { statName: string; value: number } | null {
  const w = wandById(D, draft.wandId);
  if (w.kind !== "stat") return null;
  const statName = (draft.wandTargets || [])[0];
  return typeof statName === "string" && statName ? { statName, value: w.value } : null;
}

export function buildStats(draft: Draft, D: ForgeData): Stat[] {
  const sb = statWandBonus(draft, D);
  return D.stats.map((f) => ({
    ...f,
    rank: (draft.stats[f.id] || 0) + (sb && sb.statName === f.name ? sb.value : 0),
    skills: f.skills.map((s) => ({ ...s, rank: draft.skills[s.id] || 0 })),
  }));
}
export function buildSchools(draft: Draft, D: ForgeData): MagicSchool[] {
  return D.magicSchools.map((sc) => ({
    ...sc,
    subjects: sc.subjects.map((s) => ({ ...s, rank: draft.subjects[s.key] || 0 })),
  }));
}

export function buildWandBonuses(draft: Draft, D: ForgeData): Bonus[] {
  const w = wandById(D, draft.wandId);
  if (w.kind !== "ability") return [];
  return (draft.wandTargets || [])
    .filter((t): t is WandAbilityTarget => !!t && typeof t === "object")
    .map((t, i) => ({ id: "bn-startwand-" + i, source: w.name, type: t.type, target: t.key, targetLabel: t.label, value: w.value, active: true }));
}

export interface ForgeStartWand {
  id: string;
  name: string;
  tone: Tone;
  equipped: boolean;
  condition: number;
  maxCondition: number;
  desc: string;
  effect: { kind: "ability"; label: string };
}
export function buildStartingWand(draft: Draft, D: ForgeData): ForgeStartWand {
  const w = wandById(D, draft.wandId);
  return { id: "wnd-start", name: w.name, tone: "gold", equipped: true, condition: 6, maxCondition: 6, desc: w.desc + " · " + w.grant, effect: { kind: "ability", label: w.grant } };
}

export interface ForgeExtraWand {
  id: string;
  name: string;
  tone: Tone;
  equipped: boolean;
  condition: number;
  maxCondition: number;
  desc: string;
  bonus: { type: string; target: string; targetLabel: string; value: number };
}
export function buildExtraWands(draft: Draft, D: ForgeData): ForgeExtraWand[] {
  const m = compById(D);
  const mk = (id: string, idx: number, pfx: string): ForgeExtraWand | null => {
    const e = m[id];
    if (!e) return null;
    const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || "");
    const val = bm ? parseInt(bm[1], 10) : 0;
    const lbl = bm ? bm[2] : "Bonus";
    return { id: pfx + idx + "-" + id, name: e.name, tone: e.tone, equipped: false, condition: 6, maxCondition: 6, desc: e.desc, bonus: { type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } };
  };
  return [
    ...draft.craftWands.map((id, i) => mk(id, i, "wnd-craft")),
    ...draft.extraWands.map((id, i) => mk(id, i, "wnd-buy")),
  ].filter((x): x is ForgeExtraWand => !!x);
}

export interface ForgeArtifact {
  id: string;
  name: string;
  level: string;
  tone: Tone;
  subject: string;
  intensity: number;
  attuned: boolean;
  condition: "stable";
  desc: string;
  move: { name: string; stat: string; skill: string; bonus: number; dc: number | null; desc: string };
}
export function buildArtifacts(draft: Draft, D: ForgeData): ForgeArtifact[] {
  const m = compById(D);
  return draft.artifacts
    .map((id): ForgeArtifact | null => {
      const e = m[id];
      if (!e) return null;
      return { id: "art-start-" + id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "—", intensity: 0, attuned: true, condition: "stable", desc: e.desc, move: { name: e.name + " — Boon", stat: "Insight", skill: "—", bonus: 0, dc: null, desc: e.desc } };
    })
    .filter((x): x is ForgeArtifact => !!x);
}

export interface ForgePotionPair {
  recipe: { id: string; name: string; tone: Tone; intensity: number; cost: number; desc: string };
  vial: { id: string; name: string; tone: Tone; intensity: number; qty: number; recipeId: string; desc: string };
}
export function buildPotions(draft: Draft, D: ForgeData): ForgePotionPair[] {
  const m = compById(D);
  return draft.potions
    .map((id, i): ForgePotionPair | null => {
      const e = m[id];
      if (!e) return null;
      const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0;
      const intensity = e.intensity != null ? e.intensity : 1;
      return {
        recipe: { id: "rec-start-" + i, name: e.name, tone: e.tone, intensity, cost, desc: e.desc },
        vial: { id: "pot-start-" + i, name: e.name, tone: e.tone, intensity, qty: 1, recipeId: "rec-start-" + i, desc: e.desc },
      };
    })
    .filter((x): x is ForgePotionPair => !!x);
}

export function buildPlants(draft: Draft, D: ForgeData): SerializedSheet["inventory"]["plants"] {
  const m = compById(D);
  return (draft.plants || [])
    .map((id, i) => {
      const e = m[id];
      if (!e) return null;
      return { id: "plt-start-" + i + "-" + id, name: e.name, tone: e.tone, value: e.value || 0, intensity: e.intensity || 1, used: false, removeOnUse: !!e.removeOnUse, requiresRoll: e.requiresRoll || "NO", desc: e.desc, ability: e.ability || "" };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

export function buildGlyphs(draft: Draft, D: ForgeData): SerializedSheet["inventory"]["glyphs"] {
  const m = compById(D);
  return draft.glyphs
    .map((id, i) => {
      const e = m[id];
      if (!e) return null;
      return { id: "gly-start-" + i + "-" + id, name: e.name, tone: e.tone, cost: e.value || 0, intensity: e.intensity || 1, desc: e.desc };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

export function buildSpells(draft: Draft, D: ForgeData): SerializedSheet["magic"]["spells"] {
  const m = compById(D);
  return draft.spells
    .map((id) => {
      const e = m[id];
      if (!e || e.cat !== "spell") return null;
      return { id: "sp-start-" + e.id, name: e.name, level: e.level, subjectKey: e.subjectKey || "", subject: e.subject || "", school: e.school || "", stat: e.stat || "", ap: e.ap, dc: e.dc ?? null, ritual: !!e.ritual, volatile: false, days: 0, desc: e.desc, higherLevel: e.higherLevel };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

export function buildClassState(draft: Draft): SerializedSheet["classes"]["classState"] {
  const o: SerializedSheet["classes"]["classState"] = {};
  ownedClasses(draft).forEach((id) => {
    o[id] = { rank: draft.classes[id].rank, choices: { ...draft.classes[id].choices } };
  });
  return o;
}

export function buildCharacter(draft: Draft, D: ForgeData): CharacterVitals & { yearId: string } {
  const house = houseById(D, draft.houseId);
  const year = yearById(D, draft.yearId);
  const majorName = draft.major
    .map((k) => {
      const s = flatSubjects(D).find((x) => x.key === k);
      return s ? s.name : null;
    })
    .filter(Boolean)[0];
  return {
    name: draft.name.trim() || "New Arcanist",
    pronouns: draft.pronouns.trim(),
    year: year.roman, yearId: year.id,
    house: house.name, houseTone: house.tone,
    title: draft.title.trim() || "Arcanist" + (majorName ? " · " + majorName : ""),
    bio: draft.bio.trim(),
    major: [...draft.major],
    actionPoints: 0, actionPointsMax: 6,
    resolve: 3, resolveMax: 5,
    trouble: 0,
    materials: D.creation.startingMaterials,
  };
}

/** Edit prefill: derive a draft from a live character + state. */
export function draftFromLive(D: ForgeData, live: { c?: Partial<CharacterVitals> & { yearId?: string }; stats?: Stat[]; schools?: MagicSchool[]; classState?: Record<string, { rank: number; choices: Record<string, number> }> }): Draft {
  const d = blankDraft();
  d.mode = "edit";
  const c = live.c || {};
  const house = D.houses.find((h) => h.name === c.house) || D.houses[0];
  d.name = c.name || "";
  d.pronouns = c.pronouns || "";
  d.title = c.title || "";
  d.bio = c.bio || "";
  d.yearId = c.yearId || (D.creation.years.find((y) => y.roman === c.year) || { id: "third" }).id || "third";
  d.houseId = house.id;
  d.major = Array.isArray(c.major) ? [...c.major] : [];
  d.buildType = "custom";
  (live.stats || D.stats).forEach((f) => {
    d.stats[f.id] = f.rank;
    f.skills.forEach((s) => (d.skills[s.id] = s.rank));
  });
  (live.schools || D.magicSchools).forEach((sc) => sc.subjects.forEach((s) => (d.subjects[s.key] = s.rank)));
  const cs = live.classState || {};
  d.classes = {};
  Object.keys(cs).forEach((id) => (d.classes[id] = { rank: cs[id].rank, choices: { ...cs[id].choices } }));
  d.classMode = ownedClasses(d).length >= 2 ? "double" : "single";
  return d;
}
