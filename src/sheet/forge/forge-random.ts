/* ===========================================================================
   Starfall Academy — The Admission: Random Character
   ---------------------------------------------------------------------------
   Generates a full character from just the year + build type the player has
   already chosen (plus whatever bio fields — name, house, pronouns, title,
   bio — they've filled in, which are left untouched). Everything else is
   built by leaning into one randomly-picked "archetype": a rough character
   concept (a skill specialist, a one-stat devotee, a broad-spectrum caster,
   etc.) that steers a weighted, budget-aware allocation pass rather than
   picking uniformly at random. The result always satisfies the same budget/
   cap/quota rules the manual wizard enforces (it re-uses forge-state's own
   budget + cap math to decide what's still affordable), so it always lands
   on a legal, "Begin"-ready character — just pre-filled, and still fully
   editable from the Review step onward.
   =========================================================================== */
import type { ClassDef, ClassOption } from "../data/classes";
import * as F from "./forge-state";
import type { Draft, ForgeData } from "./forge-state";

type MapKey = "stats" | "subjects" | "skills";
type Weights = Record<string, number>;

/* ------------------------------- utilities ----------------------------- */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function weightedPick(keys: string[], weights: Weights): string {
  const total = keys.reduce((s, k) => s + (weights[k] || 0), 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= weights[k] || 0;
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}
function weightedPickN(weights: Weights, n: number): string[] {
  const pool = Object.entries(weights).filter(([, w]) => w > 0);
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx][1]; if (r <= 0) break; }
    if (idx >= pool.length) idx = pool.length - 1;
    out.push(pool[idx][0]);
    pool.splice(idx, 1);
  }
  return out;
}

/* --------------------------- budget-aware spend ------------------------- */
// Mirrors AdmissionAllocation's own canInc/pool math (forge-steps.tsx) so a
// random build can never come out over-budget or over the year's rank cap.
function poolKeyFor(map: MapKey): "stat" | "subject" | "skill" {
  return map === "stats" ? "stat" : map === "subjects" ? "subject" : "skill";
}
function currentSpend(nd: Draft, D: ForgeData, map: MapKey): number {
  const b = F.budgets(nd, D);
  if (b.mode === "quick") return b[poolKeyFor(map)].spent;
  const cost = map === "stats" ? D.creation.custom.statCost : D.creation.custom.abilityCost;
  return F.sumVals(nd[map]) * cost;
}
function canIncPoint(nd: Draft, D: ForgeData, map: MapKey, key: string): boolean {
  const cur = nd[map][key] || 0;
  if (cur >= F.rankCap(nd, D, map, key)) return false;
  const b = F.budgets(nd, D);
  if (b.mode === "custom") {
    const cost = map === "stats" ? D.creation.custom.statCost : D.creation.custom.abilityCost;
    return b.remaining >= cost;
  }
  const p = b[poolKeyFor(map)];
  return p.spent < p.pool;
}
/** Spend weighted-random points into `map` until `target` (in budget-cost
 *  units) is reached, or nothing eligible remains (cap hit / out of budget). */
function spendToward(nd: Draft, D: ForgeData, map: MapKey, weights: Weights, target: number, maxIter = 4000) {
  let iter = 0;
  while (iter++ < maxIter) {
    if (currentSpend(nd, D, map) >= target) break;
    const keys = Object.keys(weights).filter((k) => (weights[k] || 0) > 0 && canIncPoint(nd, D, map, k));
    if (!keys.length) break;
    const chosen = weightedPick(keys, weights);
    nd[map] = { ...nd[map], [chosen]: (nd[map][chosen] || 0) + 1 };
  }
}

/* -------------------------------- archetypes ---------------------------- */
interface ArchetypeConfig {
  id: string;
  label: string;
  statWeights: Weights;
  subjectWeights: Weights;
  skillWeights: Weights;
  shareStat: number;
  shareSubject: number;
  shareSkill: number;
  majorCount: number;
  classModeBias?: "single" | "double";
  preferStatWand?: boolean;
}

const ARCHETYPE_IDS = [
  "stat-titan", "single-stat-focus", "skill-specialist", "broad-caster",
  "subject-specialist", "school-specialist", "generalist", "battle-skirmisher",
  "arcane-scholar",
];

function buildArchetypeConfig(id: string, D: ForgeData): ArchetypeConfig {
  const stats = D.stats;
  const subjects = F.flatSubjects(D);
  const skills = F.flatSkills(D);
  const zeroStats = (): Weights => Object.fromEntries(stats.map((s) => [s.id, 0]));
  const zeroSubjects = (): Weights => Object.fromEntries(subjects.map((s) => [s.key, 0]));
  const zeroSkills = (): Weights => Object.fromEntries(skills.map((s) => [s.id, 0]));
  const evenStats = (): Weights => Object.fromEntries(stats.map((s) => [s.id, 1]));
  const evenSubjects = (): Weights => Object.fromEntries(subjects.map((s) => [s.key, 1]));
  const evenSkills = (): Weights => Object.fromEntries(skills.map((s) => [s.id, 1]));

  switch (id) {
    case "stat-titan":
      return { id, label: "Stat-heavy Powerhouse", statWeights: evenStats(), subjectWeights: evenSubjects(), skillWeights: evenSkills(),
        shareStat: 0.55, shareSubject: 0.2, shareSkill: 0.25, majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: true };

    case "single-stat-focus": {
      const focus = stats[Math.floor(Math.random() * stats.length)];
      const sw = zeroStats(); sw[focus.id] = 1;
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === focus.id ? 4 : 0.3; });
      const subw = zeroSubjects(); subjects.forEach((s) => { subw[s.key] = s.stat.toLowerCase() === focus.id ? 1.5 : 0.4; });
      return { id, label: `One-Stat Devotee (${focus.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.3, shareSubject: 0.15, shareSkill: 0.55, majorCount: 1, preferStatWand: true };
    }
    case "skill-specialist": {
      const focus = stats[Math.floor(Math.random() * stats.length)];
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === focus.id ? 4 : 1; });
      const sw = evenStats(); sw[focus.id] = 2;
      return { id, label: `Skill Specialist (${focus.name})`, statWeights: sw, subjectWeights: evenSubjects(), skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.15, shareSkill: 0.6, majorCount: Math.random() < 0.5 ? 1 : 2, classModeBias: "double", preferStatWand: false };
    }
    case "broad-caster":
      return { id, label: "Broad Magic Spread", statWeights: evenStats(), subjectWeights: evenSubjects(), skillWeights: evenSkills(),
        shareStat: 0.25, shareSubject: 0.55, shareSkill: 0.2, majorCount: 2, preferStatWand: false };

    case "subject-specialist": {
      const focus = subjects[Math.floor(Math.random() * subjects.length)];
      const subw = zeroSubjects(); subw[focus.key] = 1;
      const statId = focus.stat.toLowerCase();
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = s.id === statId ? 3 : 0.5; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === statId ? 2 : 0.4; });
      return { id, label: `Single-Subject Specialist (${focus.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.5, shareSkill: 0.25, majorCount: 1, preferStatWand: false };
    }
    case "school-specialist": {
      const school = D.magicSchools[Math.floor(Math.random() * D.magicSchools.length)];
      const schoolKeys = new Set(school.subjects.map((s) => s.key));
      const subw = zeroSubjects(); subjects.forEach((s) => { subw[s.key] = schoolKeys.has(s.key) ? 1 : 0; });
      const relevantStats = new Set(school.subjects.map((s) => s.stat.toLowerCase()));
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = relevantStats.has(s.id) ? 2 : 0.5; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = relevantStats.has(s.fac.id) ? 1.5 : 0.5; });
      return { id, label: `Magic School Specialist (${school.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.55, shareSkill: 0.2, majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: false };
    }
    case "battle-skirmisher": {
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = (s.id === "body" || s.id === "focus") ? 3 : 0.6; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = (s.fac.id === "body" || s.fac.id === "focus") ? 3 : 0.5; });
      return { id, label: "Battle Skirmisher", statWeights: sw, subjectWeights: evenSubjects(), skillWeights: skw,
        shareStat: 0.4, shareSubject: 0.1, shareSkill: 0.5, majorCount: 1, classModeBias: "double", preferStatWand: true };
    }
    case "arcane-scholar": {
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = (s.id === "logic" || s.id === "insight") ? 3 : 0.6; });
      const subw = zeroSubjects(); subjects.forEach((s) => {
        const school = D.magicSchools.find((sc) => sc.subjects.some((x) => x.key === s.key));
        const heavy = !!school && (school.id === "wisdom" || school.id === "spectral");
        subw[s.key] = heavy ? 2 : 1;
      });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = (s.fac.id === "logic" || s.fac.id === "insight") ? 2 : 0.6; });
      return { id, label: "Arcane Scholar", statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.3, shareSubject: 0.45, shareSkill: 0.25, majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: false };
    }
    case "generalist":
    default:
      return { id: "generalist", label: "Well-Rounded Generalist", statWeights: evenStats(), subjectWeights: evenSubjects(), skillWeights: evenSkills(),
        shareStat: 0.34, shareSubject: 0.33, shareSkill: 0.33, majorCount: Math.random() < 0.5 ? 1 : 2 };
  }
}

/* --------------------------------- classes ------------------------------ */
function pickClasses(nd: Draft, classData: { classes: ClassDef[] }, cfg: ArchetypeConfig) {
  const mode = cfg.classModeBias ?? (Math.random() < 0.5 ? "single" : "double");
  nd.classMode = mode;
  const pool = shuffle([...classData.classes]);
  const n = mode === "single" ? 1 : Math.min(2, pool.length);
  const rank = mode === "single" ? 4 : 2;
  const classes: Draft["classes"] = {};
  pool.slice(0, n).forEach((c) => {
    const choices: Record<string, number> = {};
    for (let L = 1; L <= rank; L++) choices[L] = 0;
    classes[c.id] = { rank, choices };
  });
  nd.classes = classes;
}

/** Names (lowercase) of every stat/subject/skill the build actually invested
 *  in — used so class rank choices lean toward options that roll with
 *  something the character trained, instead of e.g. an Agility-keyed move
 *  on a character with zero ranks in Agility. */
function investedNames(nd: Draft, D: ForgeData): Set<string> {
  const set = new Set<string>();
  D.stats.forEach((f) => {
    if ((nd.stats[f.id] || 0) > 0) set.add(f.name.toLowerCase());
    f.skills.forEach((s) => { if ((nd.skills[s.id] || 0) > 0) set.add(s.name.toLowerCase()); });
  });
  F.flatSubjects(D).forEach((s) => { if ((nd.subjects[s.key] || 0) > 0) set.add(s.name.toLowerCase()); });
  return set;
}
function assignClassChoices(nd: Draft, classData: { classes: ClassDef[] }, invested: Set<string>) {
  Object.keys(nd.classes).forEach((id) => {
    const k = classData.classes.find((c) => c.id === id);
    const cur = nd.classes[id];
    if (!k || !cur) return;
    const baseSide = Math.random() < 0.5 ? 0 : 1;
    const choices: Record<string, number> = {};
    const scoreOf = (opt: ClassOption) => (opt.move ? opt.move.abilities.reduce((s, a) => s + (invested.has(a.toLowerCase()) ? 1 : 0), 0) : 0);
    for (let L = 1; L <= cur.rank; L++) {
      const rung = k.ranks[L - 1];
      if (!rung) { choices[L] = baseSide; continue; }
      const sA = scoreOf(rung.options[0]), sB = scoreOf(rung.options[1]);
      choices[L] = sA !== sB ? (sA > sB ? 0 : 1) : (Math.random() < 0.85 ? baseSide : 1 - baseSide);
    }
    nd.classes[id] = { ...cur, choices };
  });
}

/* ---------------------------------- wand --------------------------------- */
function pickStartWand(nd: Draft, D: ForgeData, cfg: ArchetypeConfig) {
  const wands = D.creation.startingWands;
  let candidates = wands;
  if (cfg.preferStatWand === true && Math.random() < 0.7) candidates = wands.filter((w) => w.kind === "stat");
  else if (cfg.preferStatWand === false && Math.random() < 0.7) candidates = wands.filter((w) => w.kind === "ability");
  if (!candidates.length) candidates = wands;
  const w = candidates[Math.floor(Math.random() * candidates.length)];
  nd.wandId = w.id;
  if (w.kind === "stat") {
    const top = [...D.stats].sort((a, b) => (nd.stats[b.id] || 0) - (nd.stats[a.id] || 0))[0];
    nd.wandTargets = [top.name];
    return;
  }
  const abilities: { type: string; key: string; label: string; rank: number }[] = [];
  F.flatSubjects(D).forEach((s) => abilities.push({ type: "subject", key: s.key, label: s.name, rank: nd.subjects[s.key] || 0 }));
  F.flatSkills(D).forEach((s) => abilities.push({ type: "skill", key: s.id, label: s.name, rank: nd.skills[s.id] || 0 }));
  shuffle(abilities).sort((a, b) => b.rank - a.rank);
  nd.wandTargets = abilities.slice(0, w.count).map((a) => ({ type: a.type, key: a.key, label: a.label }));
}

/* --------------------------------- spells -------------------------------- */
function pickSpells(nd: Draft, D: ForgeData) {
  const quota = F.yearById(D, nd.yearId).spells as Record<string, number>;
  const levels: Array<"Basic" | "Standard" | "Advanced"> = ["Basic", "Standard", "Advanced"];
  const minRank: Record<string, number> = { Basic: 0, Standard: 1, Advanced: 3 };
  levels.forEach((level) => {
    const need = quota[level] || 0;
    if (!need) return;
    let pool = D.compendium.filter((e) => e.cat === "spell" && e.level === level);
    // Don't hand out a spell in a field you haven't actually studied — Basic
    // spells are common-knowledge cantrips, but Standard+ need at least a
    // rank in the governing subject, and Advanced needs real depth in it.
    pool = pool.filter((e) => !e.subjectKey || (nd.subjects[e.subjectKey] || 0) >= minRank[level]);
    const chosen: string[] = [];
    let guard = 0;
    while (chosen.length < need && pool.length && guard++ < 500) {
      const weights = pool.map((e) => 1 + (e.subjectKey ? (nd.subjects[e.subjectKey] || 0) : 0));
      let r = Math.random() * weights.reduce((s, w) => s + w, 0), idx = 0;
      for (; idx < weights.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
      if (idx >= pool.length) idx = pool.length - 1;
      chosen.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    nd.spells.push(...chosen);
  });
}

/* -------------------------------- inventory ------------------------------ */
function pickInventory(nd: Draft, D: ForgeData) {
  const y = F.yields(nd, D);
  if (y.potions > 0) {
    const pool = shuffle(D.compendium.filter((e) => e.cat === "potion"));
    nd.potions = pool.slice(0, y.potions).map((e) => e.id);
  }
  if (y.glyphs > 0) {
    const pool = shuffle(D.compendium.filter((e) => e.cat === "glyph"));
    nd.glyphs = pool.slice(0, y.glyphs).map((e) => e.id);
  }
  if (y.plantMat > 0) {
    let remaining = y.plantMat;
    const chosen: string[] = [];
    shuffle(D.compendium.filter((e) => e.cat === "plant")).forEach((e) => {
      const cost = e.value || 0;
      if (cost > 0 && cost <= remaining) { chosen.push(e.id); remaining -= cost; }
    });
    nd.plants = chosen;
  }
  if (y.craftMat > 0) {
    let remaining = y.craftMat;
    const chosen: string[] = [];
    shuffle(D.compendium.filter((e) => e.cat === "wand")).forEach((e) => {
      const cost = e.mat || 0;
      if (cost > 0 && cost <= remaining) { chosen.push(e.id); remaining -= cost; }
    });
    nd.craftWands = chosen;
  }
  // Custom-build leftovers: rather than let hard-won points go to waste,
  // spend down to (near) zero on whatever wands/artifacts still fit.
  if (nd.buildType === "custom") {
    let guard = 0;
    while (guard++ < 12) {
      const b = F.budgets(nd, D);
      if (b.mode !== "custom" || b.remaining < 1) break;
      const wandPool = D.compendium.filter((e) => e.cat === "wand" && !nd.craftWands.includes(e.id) && !nd.extraWands.includes(e.id) && Math.ceil((e.mat || 0) / D.creation.custom.wandPer) <= b.remaining);
      const artiPool = D.compendium.filter((e) => e.cat === "artifact" && !nd.artifacts.includes(e.id) && Math.ceil((e.mat || 0) / D.creation.custom.artifactPer) <= b.remaining);
      const combined: Array<{ id: string; key: "extraWands" | "artifacts" }> = [
        ...wandPool.map((e) => ({ id: e.id, key: "extraWands" as const })),
        ...artiPool.map((e) => ({ id: e.id, key: "artifacts" as const })),
      ];
      if (!combined.length) break;
      const pick = combined[Math.floor(Math.random() * combined.length)];
      nd[pick.key] = [...nd[pick.key], pick.id];
    }
  }
}

/* ---------------------------------- main --------------------------------- */
/** Build a full character from `draft`'s year + build type (and bio fields —
 *  name, pronouns, houseId, title, bio — all left exactly as the player set
 *  them). Everything else — classes, wand, stats, subjects, skills, majors,
 *  spells, and starting loadout — is generated by leaning into one randomly
 *  chosen archetype, spent through the same budget/cap rules the manual
 *  wizard enforces, so the result is always a legal, ready-to-begin build. */
export function randomizeDraft(draft: Draft, D: ForgeData, classData: { classes: ClassDef[] }): Draft {
  const nd: Draft = {
    ...F.blankDraft(),
    mode: "new",
    name: draft.name, pronouns: draft.pronouns, title: draft.title, bio: draft.bio,
    yearId: draft.yearId, houseId: draft.houseId, buildType: draft.buildType,
  };

  const cfg = buildArchetypeConfig(ARCHETYPE_IDS[Math.floor(Math.random() * ARCHETYPE_IDS.length)], D);

  pickClasses(nd, classData, cfg);

  nd.major = weightedPickN(cfg.subjectWeights, cfg.majorCount);
  if (!nd.major.length) {
    const subjects = F.flatSubjects(D);
    nd.major = subjects.length ? [subjects[Math.floor(Math.random() * subjects.length)].key] : [];
  }

  const year = F.yearById(D, nd.yearId);
  if (nd.buildType === "quick") {
    spendToward(nd, D, "stats", cfg.statWeights, Math.round(cfg.shareStat * year.quick.stat));
    spendToward(nd, D, "subjects", cfg.subjectWeights, Math.round(cfg.shareSubject * year.quick.subject));
    spendToward(nd, D, "skills", cfg.skillWeights, Math.round(cfg.shareSkill * year.quick.skill));
  } else {
    const total = year.custom;
    spendToward(nd, D, "stats", cfg.statWeights, Math.round(cfg.shareStat * total));
    spendToward(nd, D, "subjects", cfg.subjectWeights, Math.round(cfg.shareSubject * total));
    spendToward(nd, D, "skills", cfg.skillWeights, Math.round(cfg.shareSkill * total));
    // Mop up leftover budget so a build doesn't end up wastefully unspent —
    // cheap abilities first, stats last (they cost 3x as much per point).
    spendToward(nd, D, "subjects", cfg.subjectWeights, Infinity);
    spendToward(nd, D, "skills", cfg.skillWeights, Infinity);
    spendToward(nd, D, "stats", cfg.statWeights, Infinity);
  }

  pickStartWand(nd, D, cfg);
  assignClassChoices(nd, classData, investedNames(nd, D));
  pickSpells(nd, D);
  pickInventory(nd, D);

  return nd;
}
