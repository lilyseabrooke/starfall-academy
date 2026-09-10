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
import type { ClassDef } from "../data/classes";
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
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
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
/** Bump `map[key]` up by `ranks` — ignoring weights entirely — stopping early
 *  if the cap or budget won't allow it. Used to *guarantee* a floor (e.g. "a
 *  class move that rolls with Agility means at least 1 rank in Agility"),
 *  as opposed to the weighted bias the rest of this module runs on. */
function guaranteeFloor(nd: Draft, D: ForgeData, map: MapKey, key: string, ranks: number) {
  for (let i = 0; i < ranks; i++) {
    if (!canIncPoint(nd, D, map, key)) break;
    nd[map] = { ...nd[map], [key]: (nd[map][key] || 0) + 1 };
  }
}

/* ------------------------- stat/subject/skill graph ---------------------- */
// Every subject and skill rolls with exactly one governing stat (subject.stat
// / skill.fac); this is the reverse index, stat -> the subjects/skills it
// governs, used to let investment flow both directions (a subject pulls its
// stat up; a stat pulls its subjects/skills up) instead of just one.
interface StatGraph {
  subjectsByStat: Map<string, F.FlatSubject[]>;
  skillsByStat: Map<string, F.FlatSkill[]>;
}
function buildStatGraph(D: ForgeData): StatGraph {
  const subjectsByStat = new Map<string, F.FlatSubject[]>();
  F.flatSubjects(D).forEach((s) => {
    const id = s.stat.toLowerCase();
    (subjectsByStat.get(id) || subjectsByStat.set(id, []).get(id)!).push(s);
  });
  const skillsByStat = new Map<string, F.FlatSkill[]>();
  F.flatSkills(D).forEach((s) => {
    const id = s.fac.id;
    (skillsByStat.get(id) || skillsByStat.set(id, []).get(id)!).push(s);
  });
  return { subjectsByStat, skillsByStat };
}

/** How much an item's own current fill discourages *more* of the same, on
 *  top of everything else — pulls down toward 0 as it nears its own rank
 *  cap. Without this, cross-correlation is a runaway feedback loop: the
 *  first point into item A nudges A's own governing stat up, which nudges A
 *  itself back up, which keeps A winning every future draw until it's fully
 *  capped before a second, equally-eligible item in the same slot ever gets
 *  a look in — a step function (max, then max, then whatever's left),
 *  not a T. This tempers that so a build's few chosen things fill out at
 *  different, overlapping levels instead of each in turn slamming to cap.
 *  `softness` lets a caller weaken the taper for something that's supposed
 *  to race ahead of its slot-mates on purpose — a major subject is the
 *  build's actual declared specialty, so it should be freer to run all the
 *  way to its (raised) cap than an ordinary secondary pick. */
function selfTaper(nd: Draft, D: ForgeData, map: MapKey, key: string, softness = 0.6): number {
  const cap = F.rankCap(nd, D, map, key);
  if (cap <= 0) return 1;
  const rank = nd[map][key] || 0;
  return Math.pow(Math.max(0, 1 - rank / cap), softness);
}

/** Recompute one map's weights fresh from `cfg`'s static base weights plus
 *  the character's *current* ranks — the actual bidirectional correlation:
 *  a stat's weight rises with however much is already invested in the
 *  subjects/skills it governs, and a subject/skill's weight rises with
 *  however much is already invested in its governing stat. An archetype
 *  that deliberately zeroed a slot (e.g. the One-Stat Devotee's other five
 *  stats) stays zero — correlation only amplifies an existing interest, it
 *  never resurrects one the archetype ruled out. `selfTaper` softens the
 *  item's own runaway growth so correlation doesn't just crown one winner
 *  per slot. */
/** How many of a stat's other skills are already sitting at *their* rank
 *  cap — two capped together within a stat reads as a genuine specialty,
 *  but three or four all maxed reads as flat rather than like someone
 *  with actual preferences, so this is the basis for discouraging a
 *  skill from becoming a 3rd or 4th tie under the same stat. */
function atCapSiblingCount(nd: Draft, D: ForgeData, graph: StatGraph, s: F.FlatSkill): number {
  const siblings = graph.skillsByStat.get(s.fac.id) || [];
  return siblings.filter((sib) => sib.id !== s.id && (nd.skills[sib.id] || 0) >= F.rankCap(nd, D, "skills", sib.id)).length;
}
/** Soft version for the forced-fill passes (forceFillQuickPools, custom's
 *  leftover mop): those exist specifically to guarantee every last point
 *  lands *somewhere*, so a 3rd/4th tie must stay possible there — just
 *  heavily disfavored — rather than a hard zero that could strand points
 *  with nowhere else legal to go. */
function skillCrowdMult(nd: Draft, D: ForgeData, graph: StatGraph, s: F.FlatSkill): number {
  const n = atCapSiblingCount(nd, D, graph, s);
  return n >= 3 ? 0.004 : n >= 2 ? 0.2 : 1;
}

function dynamicWeights(nd: Draft, D: ForgeData, cfg: ArchetypeConfig, map: MapKey, graph: StatGraph): Weights {
  if (map === "stats") {
    const w: Weights = {};
    D.stats.forEach((f) => {
      const base = cfg.statWeights[f.id] || 0;
      if (base <= 0) { w[f.id] = 0; return; }
      const subjRanks = (graph.subjectsByStat.get(f.id) || []).reduce((s, su) => s + (nd.subjects[su.key] || 0), 0);
      const skillRanks = (graph.skillsByStat.get(f.id) || []).reduce((s, sk) => s + (nd.skills[sk.id] || 0), 0);
      w[f.id] = base * (1 + 0.25 * subjRanks + 0.15 * skillRanks) * selfTaper(nd, D, map, f.id) * (cfg.statJitter[f.id] ?? 1);
    });
    return w;
  }
  if (map === "subjects") {
    const w: Weights = {};
    // A declared major should be freer to run ahead of an ordinary secondary
    // pick — and freer still when it's the *only* major (one deep specialty)
    // than when there are two splitting the spotlight.
    const majorSoftness = nd.major.length >= 2 ? 0.4 : 0.2;
    F.flatSubjects(D).forEach((s) => {
      const base = cfg.subjectWeights[s.key] || 0;
      const softness = nd.major.includes(s.key) ? majorSoftness : 0.6;
      w[s.key] = base <= 0 ? 0 : base * (1 + 0.3 * (nd.stats[s.stat.toLowerCase()] || 0)) * selfTaper(nd, D, map, s.key, softness) * (cfg.subjectJitter[s.key] ?? 1);
    });
    return w;
  }
  const w: Weights = {};
  F.flatSkills(D).forEach((s) => {
    const base = cfg.skillWeights[s.id] || 0;
    if (base <= 0) { w[s.id] = 0; return; }
    // A stat's skills sharing one governing stat (and often one archetype
    // weight) have nothing else to tell them apart — jitter and selfTaper
    // only affect fill *order*, so given enough budget (a high year, a
    // dedicated specialist) they still all eventually reach the same cap.
    // Two skills capped together within a stat reads fine (a genuine
    // specialty), but three or four all maxed reads as flat rather than
    // like someone with actual preferences — so once other skills under
    // this same stat are already sitting at *their* cap, further growth
    // here is discouraged, harder the more of them there already are (see
    // skillCrowdMult). This is a steep multiplier rather than a hard stop
    // so a class move or artifact guarantee (a single floor(1) call,
    // nowhere near a rank cap) never collides with it, and so a 3rd or
    // 4th tie stays a rare possibility instead of an impossibility.
    w[s.id] = base * (1 + 0.3 * (nd.stats[s.fac.id] || 0)) * selfTaper(nd, D, map, s.id) * (cfg.skillJitter[s.id] ?? 1) * skillCrowdMult(nd, D, graph, s);
  });
  return w;
}

function nonZeroCount(o: Record<string, number>): number {
  return Object.values(o).filter((v) => (v || 0) > 0).length;
}
function allKeysFor(map: MapKey, D: ForgeData): string[] {
  if (map === "stats") return D.stats.map((s) => s.id);
  if (map === "subjects") return F.flatSubjects(D).map((s) => s.key);
  return F.flatSkills(D).map((s) => s.id);
}
/** Real people are messy — an otherwise-focused build still often picks up
 *  a stray point or two somewhere that has nothing to do with its theme
 *  (a passing elective, a hobby). Called once per pool with its own
 *  independent chance, and picks something *not* already touched — this
 *  runs after the main slot-limited spend, so it's a genuine bonus outside
 *  the archetype's usual picks, not one more thing competing for a slot. */
function sprinkleStray(nd: Draft, D: ForgeData, chance: number) {
  const maps: MapKey[] = ["stats", "subjects", "skills"];
  maps.forEach((map) => {
    if (Math.random() >= chance) return;
    const untouched = shuffle(allKeysFor(map, D).filter((k) => (nd[map][k] || 0) <= 0));
    for (const key of untouched) {
      if (!canIncPoint(nd, D, map, key)) continue;
      guaranteeFloor(nd, D, map, key, Math.random() < 0.3 ? 2 : 1);
      break;
    }
  });
}

/** How many of a group of same-rank-1 items get merged together in one
 *  consolidation step — with the group capped at how many "1"s are still
 *  left to place, so it naturally varies with the count on hand. Roughly:
 *  a fifth of the time leave it alone, just over half of the time pair two
 *  into a 2, and the rest agglutinate three into a 3. */
function pickConsolidationGroupSize(remaining: number): number {
  if (remaining <= 1) return 1;
  if (remaining === 2) return Math.random() < 0.7 ? 2 : 1;
  const r = Math.random();
  if (r < 0.2) return 1;
  if (r < 0.75) return 2;
  return 3;
}

/** Real allocation tends not to leave a pile of untied-together +1s lying
 *  around — someone who ends up with 1 rank each in Analyze, Divination,
 *  Chronomancy, and Persuasion more plausibly has 0/0/2/2 or 0/2/3/0, not
 *  four disconnected fields dabbled in equally. This is a pure
 *  redistribution *within* one map's current 1-ranked items (never changes
 *  the total spent, so it can run after everything else without touching
 *  budgets): group them at random (mostly pairs, sometimes trios, sometimes
 *  left alone — see pickConsolidationGroupSize), then in each group of 2+
 *  hand the whole group's points to one winner and zero the rest.
 *
 *  `protected` — majors and anything a class move or class-granted artifact
 *  guaranteed — is left out entirely: those 1s are a deliberate promise,
 *  not diffuse noise, and consolidation must never be the thing that quietly
 *  breaks it back down to 0. */
function consolidateOnes(nd: Draft, D: ForgeData, map: MapKey, protectedKeys: Set<string>) {
  const ones = shuffle(allKeysFor(map, D).filter((k) => (nd[map][k] || 0) === 1 && !protectedKeys.has(k)));
  let i = 0;
  while (i < ones.length) {
    const remaining = ones.length - i;
    const size = Math.min(remaining, pickConsolidationGroupSize(remaining));
    const group = ones.slice(i, i + size);
    i += size;
    if (group.length < 2) continue; // stays at 1, untouched

    // Distribute the group's points (1 each, so `group.length` total) onto
    // as few members as it takes, respecting each one's own rank cap —
    // almost always just the first, since 1-ranked items are nowhere near
    // capped, but this keeps the total exactly conserved even on the rare
    // item whose cap is unusually low.
    let pointsLeft = group.length;
    const order = shuffle([...group]);
    const next: Record<string, number> = {};
    order.forEach((key) => {
      if (pointsLeft <= 0) { next[key] = 0; return; }
      const cap = F.rankCap(nd, D, map, key);
      const give = Math.min(pointsLeft, cap);
      next[key] = give;
      pointsLeft -= give;
    });
    order.forEach((key) => { nd[map] = { ...nd[map], [key]: next[key] }; });
  }
}
/** Quick build has nowhere else to put unspent points — unlike custom, which
 *  can always sink leftovers into a wand or artifact, a quick pool that
 *  isn't fully spent is just wasted. The thematic passes above land within a
 *  point or two of full most of the time, but "close" isn't the bar here:
 *  force whatever's left into anything still under its rank cap, picked
 *  uniformly and ignoring archetype weighting entirely, until each pool
 *  reads exactly 100% spent. (Every quick pool is small enough, and the
 *  rank caps loose enough, that this always has somewhere legal to land.) */
function forceFillQuickPools(nd: Draft, D: ForgeData, graph: StatGraph) {
  const maps: MapKey[] = ["stats", "subjects", "skills"];
  const allKeys: Record<MapKey, string[]> = { stats: allKeysFor("stats", D), subjects: allKeysFor("subjects", D), skills: allKeysFor("skills", D) };
  const flatSkillsById = new Map(F.flatSkills(D).map((s) => [s.id, s]));
  let iter = 0;
  while (iter++ < 6000) {
    const b = F.budgets(nd, D);
    if (b.mode !== "quick") break;
    let anyRoom = false;
    for (const map of maps) {
      const pool = b[poolKeyFor(map)];
      if (pool.spent >= pool.pool) continue;
      const keys = allKeys[map].filter((k) => canIncPoint(nd, D, map, k));
      if (!keys.length) continue;
      anyRoom = true;
      let key: string;
      if (map === "skills") {
        // Uniform-random here would routinely pick the 3rd or 4th skill
        // to cap out under the same stat just because it's still legal —
        // weight the choice by the same crowd discouragement the weighted
        // spend pass uses instead.
        const weighted = keys.map((k) => ({ key: k, weight: skillCrowdMult(nd, D, graph, flatSkillsById.get(k)!) }));
        const total = weighted.reduce((s, o) => s + o.weight, 0);
        let r = Math.random() * total;
        key = weighted[weighted.length - 1].key;
        for (const o of weighted) { r -= o.weight; if (r <= 0) { key = o.key; break; } }
      } else {
        key = keys[Math.floor(Math.random() * keys.length)];
      }
      nd[map] = { ...nd[map], [key]: (nd[map][key] || 0) + 1 };
    }
    if (!anyRoom) break;
  }
}

/** Spend weighted-random points across stats/subjects/skills *together* —
 *  one point at a time, re-weighted after every point — until each map hits
 *  its own `targets[map]` (in budget-cost units) or nothing eligible is left
 *  (cap hit / out of budget). Interleaving the three, instead of draining
 *  them one at a time, is what makes the correlation in `dynamicWeights`
 *  actually bidirectional within a single pass.
 *
 *  `slots[map]` caps how many *distinct* keys in that map may ever hold a
 *  point: once that many are non-zero, spending only continues on keys
 *  already touched (a class-move floor, a major, or a prior point from this
 *  same call all count as "touched"). Weighting alone tends to spread thin —
 *  with enough eligible keys, a modest per-point bias still gets sampled
 *  onto many of them over dozens of points, which reads as generically
 *  diffuse rather than built on purpose. A hard slot cap is what actually
 *  produces a T-shape: strong at the couple of things that got in, plain
 *  zero at everything that didn't, instead of a faint +1 smeared everywhere
 *  eligible. */
function spendCorrelated(nd: Draft, D: ForgeData, cfg: ArchetypeConfig, graph: StatGraph, targets: Record<MapKey, number>, slots: Record<MapKey, number>, maxIter = 8000) {
  const maps: MapKey[] = ["stats", "subjects", "skills"];
  const touched: Record<MapKey, number> = { stats: nonZeroCount(nd.stats), subjects: nonZeroCount(nd.subjects), skills: nonZeroCount(nd.skills) };
  let iter = 0;
  while (iter++ < maxIter) {
    const options: { map: MapKey; key: string; weight: number }[] = [];
    for (const map of maps) {
      if (currentSpend(nd, D, map) >= targets[map]) continue;
      const weights = dynamicWeights(nd, D, cfg, map, graph);
      const full = touched[map] >= slots[map];
      Object.keys(weights).forEach((k) => {
        if (weights[k] <= 0) return;
        if (full && (nd[map][k] || 0) <= 0) return; // T-shape: no new keys once slots are full
        if (canIncPoint(nd, D, map, k)) options.push({ map, key: k, weight: weights[k] });
      });
    }
    if (!options.length) break;
    const total = options.reduce((s, o) => s + o.weight, 0);
    let r = Math.random() * total, chosen = options[0];
    for (const o of options) { r -= o.weight; if (r <= 0) { chosen = o; break; } }
    const wasUntouched = (nd[chosen.map][chosen.key] || 0) <= 0;
    nd[chosen.map] = { ...nd[chosen.map], [chosen.key]: (nd[chosen.map][chosen.key] || 0) + 1 };
    if (wasUntouched) touched[chosen.map]++;
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
  /** How many distinct stats/subjects/skills the build is allowed to ever put
   *  a point into — the T-shape's width. Kept small by default (strong at a
   *  couple of things, decent at a handful, everything else untrained);
   *  broader archetypes (Broad Magic Spread) get more room on purpose. Drawn
   *  once per character from each archetype's range (see SLOT_RANGES) so the
   *  cap itself varies — one One-Stat Devotee might stay a true specialist,
   *  another might quietly cover a second stat too. */
  statSlots: number;
  subjectSlots: number;
  skillSlots: number;
  /** A fixed, per-character random multiplier for every stat/subject/skill,
   *  drawn once and reused on every re-weigh. Several skills under the same
   *  stat (or several subjects in the same school) often carry the exact
   *  same base weight and the exact same correlation term — with nothing
   *  else to tell them apart, they trend toward filling out identically
   *  once there's enough budget to go around, which reads as flat rather
   *  than like a person with actual preferences. Jitter gives each one a
   *  standing, persistent edge or disadvantage, so ties resolve the same
   *  way every time instead of averaging out into a uniform result. */
  statJitter: Weights;
  subjectJitter: Weights;
  skillJitter: Weights;
  majorCount: number;
  preferStatWand?: boolean;
}

const ARCHETYPE_IDS = [
  "stat-titan", "single-stat-focus", "skill-specialist", "broad-caster",
  "subject-specialist", "school-specialist", "generalist", "battle-skirmisher",
  "arcane-scholar",
];

type ArchetypeCore = Omit<ArchetypeConfig, "statJitter" | "subjectJitter" | "skillJitter">;

function jitterFor(keys: string[], min = 0.65, max = 1.35): Weights {
  const w: Weights = {};
  keys.forEach((k) => { w[k] = min + Math.random() * (max - min); });
  return w;
}

/** Wraps buildArchetypeCore with fresh random jitter maps per character —
 *  kept separate so the archetype-selection logic above stays free of the
 *  bookkeeping. */
function buildArchetypeConfig(id: string, D: ForgeData): ArchetypeConfig {
  return {
    ...buildArchetypeCore(id, D),
    statJitter: jitterFor(D.stats.map((s) => s.id)),
    subjectJitter: jitterFor(F.flatSubjects(D).map((s) => s.key)),
    skillJitter: jitterFor(F.flatSkills(D).map((s) => s.id)),
  };
}

function buildArchetypeCore(id: string, D: ForgeData): ArchetypeCore {
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
        shareStat: 0.55, shareSubject: 0.2, shareSkill: 0.25, statSlots: randInt(2, 4), subjectSlots: randInt(2, 4), skillSlots: randInt(3, 5),
        majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: true };

    case "single-stat-focus": {
      const focus = stats[Math.floor(Math.random() * stats.length)];
      const sw = zeroStats(); sw[focus.id] = 1;
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === focus.id ? 4 : 0.3; });
      const subw = zeroSubjects(); subjects.forEach((s) => { subw[s.key] = s.stat.toLowerCase() === focus.id ? 1.5 : 0.4; });
      // "One-stat" is the pitch, but some devotees are quietly all-in on a
      // second stat too — statSlots occasionally comes up 2, not always 1.
      return { id, label: `One-Stat Devotee (${focus.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.3, shareSubject: 0.15, shareSkill: 0.55, statSlots: randInt(1, 2), subjectSlots: randInt(1, 3), skillSlots: randInt(3, 5), majorCount: 1, preferStatWand: true };
    }
    case "skill-specialist": {
      const focus = stats[Math.floor(Math.random() * stats.length)];
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === focus.id ? 4 : 1; });
      const sw = evenStats(); sw[focus.id] = 2;
      return { id, label: `Skill Specialist (${focus.name})`, statWeights: sw, subjectWeights: evenSubjects(), skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.15, shareSkill: 0.6, statSlots: randInt(1, 3), subjectSlots: randInt(1, 3), skillSlots: randInt(4, 6),
        majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: false };
    }
    case "broad-caster":
      // The one archetype meant to genuinely spread wide — still capped well
      // short of all 24 subjects, just noticeably broader than the rest.
      return { id, label: "Broad Magic Spread", statWeights: evenStats(), subjectWeights: evenSubjects(), skillWeights: evenSkills(),
        shareStat: 0.25, shareSubject: 0.55, shareSkill: 0.2, statSlots: randInt(3, 5), subjectSlots: randInt(6, 10), skillSlots: randInt(5, 7), majorCount: 2, preferStatWand: false };

    case "subject-specialist": {
      const focus = subjects[Math.floor(Math.random() * subjects.length)];
      const subw = zeroSubjects(); subw[focus.key] = 1;
      const statId = focus.stat.toLowerCase();
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = s.id === statId ? 3 : 0.5; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = s.fac.id === statId ? 2 : 0.4; });
      return { id, label: `Single-Subject Specialist (${focus.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.5, shareSkill: 0.25, statSlots: randInt(1, 3), subjectSlots: randInt(1, 2), skillSlots: randInt(2, 4), majorCount: 1, preferStatWand: false };
    }
    case "school-specialist": {
      const school = D.magicSchools[Math.floor(Math.random() * D.magicSchools.length)];
      const schoolKeys = new Set(school.subjects.map((s) => s.key));
      const subw = zeroSubjects(); subjects.forEach((s) => { subw[s.key] = schoolKeys.has(s.key) ? 1 : 0; });
      const relevantStats = new Set(school.subjects.map((s) => s.stat.toLowerCase()));
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = relevantStats.has(s.id) ? 2 : 0.5; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = relevantStats.has(s.fac.id) ? 1.5 : 0.5; });
      return { id, label: `Magic School Specialist (${school.name})`, statWeights: sw, subjectWeights: subw, skillWeights: skw,
        shareStat: 0.25, shareSubject: 0.55, shareSkill: 0.2, statSlots: randInt(1, 3), subjectSlots: randInt(3, 5), skillSlots: randInt(2, 4),
        majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: false };
    }
    case "battle-skirmisher": {
      const sw = zeroStats(); stats.forEach((s) => { sw[s.id] = (s.id === "body" || s.id === "focus") ? 3 : 0.6; });
      const skw = zeroSkills(); skills.forEach((s) => { skw[s.id] = (s.fac.id === "body" || s.fac.id === "focus") ? 3 : 0.5; });
      return { id, label: "Battle Skirmisher", statWeights: sw, subjectWeights: evenSubjects(), skillWeights: skw,
        shareStat: 0.4, shareSubject: 0.1, shareSkill: 0.5, statSlots: randInt(1, 3), subjectSlots: randInt(1, 3), skillSlots: randInt(3, 5),
        majorCount: 1, preferStatWand: true };
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
        shareStat: 0.3, shareSubject: 0.45, shareSkill: 0.25, statSlots: randInt(1, 3), subjectSlots: randInt(3, 5), skillSlots: randInt(3, 5),
        majorCount: Math.random() < 0.5 ? 1 : 2, preferStatWand: false };
    }
    case "generalist":
    default:
      return { id: "generalist", label: "Well-Rounded Generalist", statWeights: evenStats(), subjectWeights: evenSubjects(), skillWeights: evenSkills(),
        shareStat: 0.34, shareSubject: 0.33, shareSkill: 0.33, statSlots: randInt(2, 4), subjectSlots: randInt(3, 5), skillSlots: randInt(3, 5), majorCount: Math.random() < 0.5 ? 1 : 2 };
  }
}

/* --------------------------------- classes ------------------------------ */
/** What pickClassesAndChoices found among the *chosen* options: certain
 *  mentions (a move or artifact that names exactly one ability) plus a list
 *  of ambiguous groups — each the several candidate abilities one move or
 *  artifact grant *could* roll with (e.g. Technician's Wandcracker: Improvise
 *  or Wandcrafting), still undecided. */
interface ClassMentionResult {
  mentions: Map<string, number>;
  ambiguousGroups: string[][];
}

/** Pick class(es), rank, and — for every rank — which of the two options to
 *  take, *before* anything else is decided. The option side is picked from a
 *  per-class "lean" (mostly one path, occasionally the other) since there's
 *  no investment yet to weigh it against; what matters is that this runs
 *  first, so the character's stats/subjects/skills get built to support
 *  whatever the class actually rolls with, not the other way around. */
function pickClassesAndChoices(nd: Draft, D: ForgeData, classData: { classes: ClassDef[] }): ClassMentionResult {
  const mode = Math.random() < 0.5 ? "single" : "double";
  nd.classMode = mode;
  const pool = shuffle([...classData.classes]);
  const n = mode === "single" ? 1 : Math.min(2, pool.length);
  const rank = mode === "single" ? 4 : 2;
  const mentions = new Map<string, number>();
  const ambiguousGroups: string[][] = [];
  const classes: Draft["classes"] = {};
  const classArtifacts: Record<string, string[]> = {};
  const mention = (name: string) => {
    const key = name.trim().toLowerCase();
    if (key) mentions.set(key, (mentions.get(key) || 0) + 1);
  };
  // A move or artifact naming several candidate abilities (Technician's
  // Wandcracker: "Improvise" or "Wandcrafting") is offering a *choice* of
  // what it rolls with, not asking for training in all of them — recording
  // every candidate as a hit would be redundant and defeat the point of the
  // flexibility. A single candidate is certain and recorded right away;
  // anything with more than one is queued to resolve later, once the major
  // is known and can help decide (see resolveAmbiguousAbilityGroups).
  const recordCandidates = (names: string[]) => {
    const clean = names.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 1) mention(clean[0]);
    else if (clean.length > 1) ambiguousGroups.push(clean);
  };
  pool.slice(0, n).forEach((k) => {
    const baseSide = Math.random() < 0.5 ? 0 : 1;
    const choices: Record<string, number> = {};
    for (let L = 1; L <= rank; L++) {
      const side = Math.random() < 0.85 ? baseSide : 1 - baseSide;
      const rung = k.ranks[L - 1];
      const opt = rung && rung.options[side];
      choices[L] = side;
      if (opt && opt.move) recordCandidates(opt.move.abilities);
      if (opt && opt.item && opt.item.kind === "artifact") {
        const levelSet = new Set(opt.item.levels.map((l) => l.toLowerCase()));
        const eligible = D.compendium.filter((e) => e.cat === "artifact" && levelSet.has(e.level.toLowerCase()) && (!opt.item!.matCap || (e.mat || 0) <= opt.item!.matCap));
        const picked = shuffle([...eligible]).slice(0, opt.item.count);
        if (picked.length) {
          classArtifacts[`${k.id}:${L}`] = picked.map((e) => e.id);
          // Treat the skill(s) the granted artifact rolls with exactly like
          // a class move's abilities — a build should train what its own
          // gear actually uses. A multi-skill artifact is the same kind of
          // choice as a multi-ability move.
          picked.forEach((e) => {
            const skillNames = ((e.skillOptions && e.skillOptions.length ? e.skillOptions.map((o) => o.skill) : e.skills) || []).filter((s) => s && s !== "—");
            recordCandidates(skillNames);
          });
        }
      }
    }
    classes[k.id] = { rank, choices };
  });
  nd.classes = classes;
  nd.classArtifacts = classArtifacts;
  return { mentions, ambiguousGroups };
}

/** A move() tag's ability text doesn't always match the canonical
 *  stat/subject/skill name exactly (the data has "recall information" for
 *  the skill "Recall Info", "investigation" for "Investigate") — an exact
 *  match wins first, but if none exists, fall back to either name being a
 *  prefix of the other. The length floor keeps that fallback from matching
 *  on a handful of shared leading letters between two unrelated names. */
function fuzzyNameKey<T>(map: Map<string, T>, name: string): string | null {
  const key = name.trim().toLowerCase();
  if (map.has(key)) return key;
  for (const k of map.keys()) {
    if (k.length >= 5 && key.length >= 5 && (k.startsWith(key) || key.startsWith(k))) return k;
  }
  return null;
}

/** Resolve move() ability names (e.g. "Agility", "Alchemy") against the
 *  actual stat/subject/skill lists, case-insensitively (and tolerant of the
 *  odd phrasing mismatch — see fuzzyNameKey), so a class's chosen moves can
 *  be turned into training targets. */
function resolveAbilityMentions(mentions: Map<string, number>, D: ForgeData) {
  const statByName = new Map(D.stats.map((f) => [f.name.toLowerCase(), f.id]));
  const subjByName = new Map(F.flatSubjects(D).map((s) => [s.name.toLowerCase(), s.key]));
  const skillByName = new Map(F.flatSkills(D).map((s) => [s.name.toLowerCase(), s.id]));
  const statHits: Weights = {}, subjectHits: Weights = {}, skillHits: Weights = {};
  mentions.forEach((count, name) => {
    const sKey = fuzzyNameKey(statByName, name);
    const subKey = fuzzyNameKey(subjByName, name);
    const skKey = fuzzyNameKey(skillByName, name);
    if (sKey) { const id = statByName.get(sKey)!; statHits[id] = (statHits[id] || 0) + count; }
    else if (subKey) { const key = subjByName.get(subKey)!; subjectHits[key] = (subjectHits[key] || 0) + count; }
    else if (skKey) { const id = skillByName.get(skKey)!; skillHits[id] = (skillHits[id] || 0) + count; }
  });
  return { statHits, subjectHits, skillHits };
}

/** Pick one ability out of each ambiguous "rolls with A or B" group — real
 *  pressure toward a sensible choice, never a certainty. Every candidate
 *  starts with a baseline weight (so a coin-flip choice really can go
 *  either way), then gets a boost if it shares a stat/subject/skill another
 *  chosen move or artifact already committed to (Technician picking up two
 *  separate Improvise-adjacent moves should lean into Improvise together),
 *  a further boost if its governing stat matches a declared major's
 *  (Wandcrafting shares Focus with an Evocation major), and the strongest
 *  boost if the candidate *is* a declared major outright. Resolved one
 *  group at a time (in random order) so earlier winners can also feed later
 *  ones — returns only the newly-decided mentions (the caller applies the
 *  same floor+bias treatment as any other class-move hit). */
function resolveAmbiguousAbilityGroups(nd: Draft, D: ForgeData, groups: string[][], mentionsSoFar: Map<string, number>): Map<string, number> {
  const statByName = new Map(D.stats.map((f) => [f.name.toLowerCase(), f.id]));
  const subjByName = new Map(F.flatSubjects(D).map((s) => [s.name.toLowerCase(), s.key]));
  const skillByName = new Map(F.flatSkills(D).map((s) => [s.name.toLowerCase(), s.id]));
  const subjStatOf = (key: string) => F.flatSubjects(D).find((s) => s.key === key)?.stat.toLowerCase();
  const skillStatOf = (id: string) => F.flatSkills(D).find((s) => s.id === id)?.fac.id;
  const governingStatOf = (name: string): string | null => {
    const sKey = fuzzyNameKey(statByName, name);
    if (sKey) return statByName.get(sKey)!;
    const subKey = fuzzyNameKey(subjByName, name);
    if (subKey) return subjStatOf(subjByName.get(subKey)!) || null;
    const skKey = fuzzyNameKey(skillByName, name);
    if (skKey) return skillStatOf(skillByName.get(skKey)!) || null;
    return null;
  };
  const majorStatIds = new Set(nd.major.map((key) => subjStatOf(key)).filter((x): x is string => !!x));

  const lookup = new Map(mentionsSoFar); // for synergy checks; grows as groups resolve
  const winners = new Map<string, number>(); // only the newly-decided picks
  shuffle([...groups]).forEach((group) => {
    const weights = group.map((name) => {
      const key = name.trim().toLowerCase();
      let w = 1; // baseline — a real coin flip is still possible
      w += (lookup.get(key) || 0) * 2; // another chosen move/artifact already leans this way
      const statId = governingStatOf(name);
      if (statId && majorStatIds.has(statId)) w += 2; // shares a stat with a major
      const subKey = fuzzyNameKey(subjByName, name);
      if (subKey && nd.major.includes(subjByName.get(subKey)!)) w += 4; // *is* a major
      return w;
    });
    let r = Math.random() * weights.reduce((s, w) => s + w, 0), idx = 0;
    for (; idx < weights.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
    if (idx >= group.length) idx = group.length - 1;
    const winner = group[idx].trim().toLowerCase();
    lookup.set(winner, (lookup.get(winner) || 0) + 1);
    winners.set(winner, (winners.get(winner) || 0) + 1);
  });
  return winners;
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
// A spell check is 2d10 + statRank + subjectRank vs DC (see spellMod in
// useMagicState.ts). Precompute P(2d10 >= n) for every possible "roll
// needed" (2d10 sums 2-20 with a triangular distribution, 100 equally
// likely (die1,die2) pairs) once, so picking spells can weigh a spell by
// how realistic it actually is to land, not just its DC's position within
// the level's range.
const CUM_2D10: number[] = (() => {
  const ways = (s: number) => (s <= 11 ? s - 1 : 21 - s); // # of (d1,d2) pairs summing to s
  const table: number[] = [];
  for (let n = 0; n <= 22; n++) {
    let sum = 0;
    for (let s = Math.max(2, n); s <= 20; s++) sum += ways(s);
    table[n] = sum / 100;
  }
  return table;
})();
/** Chance of clearing `dc` with a flat `mod` on 2d10. */
function spellSuccessChance(dc: number, mod: number): number {
  const needed = Math.round(dc - mod);
  return CUM_2D10[Math.max(0, Math.min(22, needed))];
}
/** How much a spell's real success odds should discourage picking it — 1
 *  (no penalty) at 75%+, falling off sharply below that. A needed roll of
 *  17 is exactly a 10% shot; by then this is down near 1% of full weight,
 *  matching "probably shouldn't be taken" rather than "never" (a
 *  character occasionally does reach for something out of their depth). */
function spellFeasibility(dc: number | undefined, mod: number): number {
  if (dc == null) return 1;
  const chance = spellSuccessChance(dc, mod);
  if (chance >= 0.75) return 1;
  return Math.pow(chance / 0.75, 2.2);
}

/** Pick the year's spell quota so it reads like it came from the character's
 *  actual training, not a flat random draw across every field they dabble
 *  in: a subject with real rank should pull noticeably more of the quota
 *  (not just a mild edge) *and* pull toward the harder end of that level's
 *  DCs, while a subject the character barely touched stays confined to a
 *  couple of the level's easiest spells — and the declared major(s) get a
 *  strong extra edge on top of that.
 *
 *  This draws from one pool (not "exhaust the major first, then look
 *  elsewhere") because a real compendium has plenty of supply per subject —
 *  a hard priority order would mean the major *never* runs dry, so it would
 *  swallow the entire quota including Basic, crowding out every other
 *  subject the character actually trained. Instead each subject's weight
 *  decays a little every time the quota draw picks from it again: the
 *  major(s) still win most draws (highest rank + a flat bonus + best DC
 *  fit), but as their share of an already-filled quota adds up, other
 *  well-trained subjects get a growing chance to contribute too. For a
 *  quota of 1-3 (Advanced) the decay barely has room to matter, so it stays
 *  almost entirely the major(s); for a quota of 15-20 (Basic) it settles
 *  into a real, rank-proportional spread instead of one subject taking
 *  everything. */
function pickSpells(nd: Draft, D: ForgeData) {
  const quota = F.yearById(D, nd.yearId).spells as Record<string, number>;
  const levels: Array<"Basic" | "Standard" | "Advanced"> = ["Basic", "Standard", "Advanced"];
  // Advanced's depth requirement is deliberately steep: with the T-shape's
  // secondary picks often reaching rank 3-5 just from correlation, a low bar
  // here would let plenty of non-major subjects compete for spells that are
  // supposed to read as real specialization.
  const minRank: Record<string, number> = { Basic: 0, Standard: 1, Advanced: 5 };
  // How much extra pull a declared major gets, on top of its rank — scaled
  // by level. Basic is common-knowledge cantrips, plausibly picked up from
  // anywhere you've dabbled, so majors barely need the help; Advanced is
  // real specialization, and should belong to the major(s) specifically,
  // not just whichever other subject happens to have caught up in rank.
  const majorBiasByLevel: Record<string, number> = { Basic: 1.2, Standard: 2, Advanced: 8 };
  const majorSet = new Set(nd.major);
  // Normalize "how ambitious a DC this subject can reach" against the
  // character's own best-trained subject — their strongest field should
  // reach for the hardest spells in a level, relative to their own range.
  const maxRank = Math.max(1, ...Object.values(nd.subjects), 0);
  const statIdByName = new Map(D.stats.map((f) => [f.name.toLowerCase(), f.id]));
  levels.forEach((level) => {
    const need = quota[level] || 0;
    if (!need) return;
    // Don't hand out a spell in a field you haven't actually studied — Basic
    // spells are common-knowledge cantrips, but Standard+ need at least a
    // rank in the governing subject, and Advanced needs real depth in it.
    const pool = D.compendium.filter((e) => e.cat === "spell" && e.level === level && (!e.subjectKey || (nd.subjects[e.subjectKey] || 0) >= minRank[level]));
    if (!pool.length) return;
    const dcs = pool.map((e) => e.dc).filter((d): d is number => d != null);
    const dcMin = dcs.length ? Math.min(...dcs) : 0;
    const dcSpan = dcs.length ? Math.max(1, Math.max(...dcs) - dcMin) : 1;

    const chosen: string[] = [];
    const drawnFromSubject: Record<string, number> = {};
    let guard = 0;
    while (chosen.length < need && pool.length && guard++ < 500) {
      const weights = pool.map((e) => {
        const rank = e.subjectKey ? (nd.subjects[e.subjectKey] || 0) : 0;
        // Sharper than a flat "1 + rank": a well-trained subject should
        // dominate the draw, not just edge out an untrained one.
        const subjectBias = Math.pow(1 + rank, 1.6);
        const majorBias = e.subjectKey && majorSet.has(e.subjectKey) ? majorBiasByLevel[level] : 1;
        let dcBias = 1;
        if (e.dc != null) {
          const appetite = Math.min(1, rank / maxRank); // 0 = barely trained, 1 = this build's best
          const dcPosition = (e.dc - dcMin) / dcSpan; // 0 = easiest in this level, 1 = hardest
          // Reward a close match; never fully rule anything out, so a modest
          // subject occasionally still reaches a touch high (and vice versa).
          dcBias = 0.25 + Math.pow(1 - Math.abs(appetite - dcPosition), 2);
        }
        // The more this quota draw has already leaned on this subject, the
        // less it dominates the *next* pick — lets other trained subjects
        // in once a level's quota is bigger than one subject reasonably
        // needs, without capping anything outright.
        const already = drawnFromSubject[e.subjectKey || ""] || 0;
        const diminish = 1 / Math.pow(1 + already, 0.85);
        // A spell nobody could realistically land shouldn't get taken just
        // because it's technically eligible — weigh by the character's
        // actual odds on the roll (2d10 + stat + subject vs DC).
        const statRank = e.stat ? (nd.stats[statIdByName.get(e.stat.toLowerCase()) || ""] || 0) : 0;
        const feasibility = spellFeasibility(e.dc, statRank + rank);
        return subjectBias * majorBias * dcBias * diminish * feasibility;
      });
      let r = Math.random() * weights.reduce((s, w) => s + w, 0), idx = 0;
      for (; idx < weights.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
      if (idx >= pool.length) idx = pool.length - 1;
      const picked = pool[idx];
      chosen.push(picked.id);
      drawnFromSubject[picked.subjectKey || ""] = (drawnFromSubject[picked.subjectKey || ""] || 0) + 1;
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
 *  them). One archetype is picked, then, in order: classes and their rank
 *  choices, majors, and finally stats/subjects/skills — biased so the class
 *  moves taken and the major(s) starred both actually get trained, and so
 *  the stat/subject/skill triangle reinforces itself (a subject pulls its
 *  governing stat up, a stat pulls its subjects and skills up), same as a
 *  player building a character on purpose would. Every point is spent
 *  through the same budget/cap rules the manual wizard enforces, so the
 *  result is always a legal, ready-to-begin build. */
export function randomizeDraft(draft: Draft, D: ForgeData, classData: { classes: ClassDef[] }): Draft {
  const nd: Draft = {
    ...F.blankDraft(),
    mode: "new",
    name: draft.name, pronouns: draft.pronouns, title: draft.title, bio: draft.bio,
    yearId: draft.yearId, houseId: draft.houseId, buildType: draft.buildType,
  };

  const cfg = buildArchetypeConfig(ARCHETYPE_IDS[Math.floor(Math.random() * ARCHETYPE_IDS.length)], D);
  const graph = buildStatGraph(D);

  // Classes and their rank choices first — nothing to weigh them against
  // yet, so the option side comes from the class's own per-rank lean.
  const { mentions, ambiguousGroups } = pickClassesAndChoices(nd, D, classData);
  const { statHits, subjectHits, skillHits } = resolveAbilityMentions(mentions, D);

  // Guarantee actual training in whatever the chosen moves roll with — a
  // move keyed to Agility means at least 1 rank in Agility, not a coin flip.
  Object.keys(statHits).forEach((id) => guaranteeFloor(nd, D, "stats", id, 1));
  Object.keys(subjectHits).forEach((key) => guaranteeFloor(nd, D, "subjects", key, 1));
  Object.keys(skillHits).forEach((id) => guaranteeFloor(nd, D, "skills", id, 1));
  // And bias further spending toward the same — but only where the archetype
  // hadn't already ruled the slot out entirely (base weight of exactly 0).
  Object.entries(statHits).forEach(([id, n]) => { if (cfg.statWeights[id] > 0) cfg.statWeights[id] *= 1 + 1.5 * n; });
  Object.entries(subjectHits).forEach(([key, n]) => { if (cfg.subjectWeights[key] > 0) cfg.subjectWeights[key] *= 1 + 2 * n; });
  Object.entries(skillHits).forEach(([id, n]) => { if (cfg.skillWeights[id] > 0) cfg.skillWeights[id] *= 1 + 2.5 * n; });

  // Majors next, from those (now class-informed) subject weights.
  nd.major = weightedPickN(cfg.subjectWeights, cfg.majorCount);
  if (!nd.major.length) {
    const subjects = F.flatSubjects(D);
    nd.major = subjects.length ? [subjects[Math.floor(Math.random() * subjects.length)].key] : [];
  }
  // A major is a strong statement of intent — guarantee it's actually
  // trained, and heavily bias spending toward it and its governing stat (an
  // Evocation major should mean an Evocation-heavy build *and* a Focus-heavy
  // one). The stat floor is unconditional — unlike the ongoing weight boost
  // below, which still respects a slot the archetype deliberately zeroed
  // out, a major's own governing stat should never end up at literal zero;
  // a demonologist with no Logic at all reads as a mistake, not a build.
  nd.major.forEach((key) => {
    guaranteeFloor(nd, D, "subjects", key, 1);
    cfg.subjectWeights[key] *= 4;
    const subj = F.flatSubjects(D).find((s) => s.key === key);
    if (subj) {
      const statId = subj.stat.toLowerCase();
      guaranteeFloor(nd, D, "stats", statId, 1);
      if (cfg.statWeights[statId] > 0) cfg.statWeights[statId] *= 1.8;
    }
  });

  // Now that the major is settled, resolve every "rolls with A or B" move
  // or artifact choice — some pressure toward whatever the rest of the
  // build already supports, never a certainty — and give the winners the
  // same floor+bias treatment as any other class-move hit.
  const ambiguousWinners = resolveAmbiguousAbilityGroups(nd, D, ambiguousGroups, mentions);
  const { statHits: ambStatHits, subjectHits: ambSubjectHits, skillHits: ambSkillHits } = resolveAbilityMentions(ambiguousWinners, D);
  Object.keys(ambStatHits).forEach((id) => guaranteeFloor(nd, D, "stats", id, 1));
  Object.keys(ambSubjectHits).forEach((key) => guaranteeFloor(nd, D, "subjects", key, 1));
  Object.keys(ambSkillHits).forEach((id) => guaranteeFloor(nd, D, "skills", id, 1));
  Object.entries(ambStatHits).forEach(([id, n]) => { if (cfg.statWeights[id] > 0) cfg.statWeights[id] *= 1 + 1.5 * n; });
  Object.entries(ambSubjectHits).forEach(([key, n]) => { if (cfg.subjectWeights[key] > 0) cfg.subjectWeights[key] *= 1 + 2 * n; });
  Object.entries(ambSkillHits).forEach(([id, n]) => { if (cfg.skillWeights[id] > 0) cfg.skillWeights[id] *= 1 + 2.5 * n; });

  // Some stats (Charm, Body — whichever ones no magic subject ever rolls
  // with, going by the live data rather than a hardcoded list) can only ever
  // be reinforced by skills, never by a subject pulling them up. Give them a
  // small flat nudge so they aren't structurally starved next to stats that
  // get reinforced from both sides.
  D.stats.forEach((f) => {
    if (!(graph.subjectsByStat.get(f.id) || []).length && cfg.statWeights[f.id] > 0) cfg.statWeights[f.id] *= 1.5;
  });

  // Now spend — stats, subjects, and skills together, re-weighted after
  // every single point so the correlation above compounds as it goes. The
  // slot caps are what keep it a T-shape instead of a thin smear: the same
  // budget concentrates into fewer things because there's nowhere else for
  // it to go. But a higher year has a bigger budget and a higher rank cap —
  // a graduate should end up competent at more things than a first-year, not
  // just push the same couple of things harder — so the slot counts widen
  // with year, and by more than the budget alone would need (budget roughly
  // 3x's from first year to graduate; slots grow faster than that so the
  // extra budget spreads out rather than just piling higher on the same few
  // things).
  const year = F.yearById(D, nd.yearId);
  const yearIdx = Math.max(0, D.creation.years.findIndex((y) => y.id === year.id));
  const extraAbilitySlots = Math.round(yearIdx * 1.5); // 0, 2, 3, 5, 6
  const extraStatSlots = Math.round(yearIdx * 0.75); // 0, 1, 2, 2, 3
  const slots: Record<MapKey, number> = {
    stats: Math.min(D.stats.length, cfg.statSlots + extraStatSlots),
    subjects: Math.min(F.flatSubjects(D).length, cfg.subjectSlots + extraAbilitySlots),
    skills: Math.min(F.flatSkills(D).length, cfg.skillSlots + extraAbilitySlots),
  };
  if (nd.buildType === "quick") {
    // Quick's three pools are independent budgets, not three-way splits of
    // one — shareStat/shareSubject/shareSkill only mean something as a split
    // of a single shared pool (custom's), so applying them here would just
    // cap each pool at a fraction of itself for no reason. Aim to use each
    // pool up to what slots + rank caps allow (a target of Infinity is
    // naturally bounded by canIncPoint's own pool-size check).
    spendCorrelated(nd, D, cfg, graph, { stats: Infinity, subjects: Infinity, skills: Infinity }, slots);
    // A little texture outside the build's usual picks, before the
    // safety-net passes below tidy up whatever's left.
    sprinkleStray(nd, D, 0.4);
    // If everything touched is already at its rank cap and a pool still has
    // real budget sitting unspent, open a couple more slots for just that
    // pool rather than leave it stranded.
    const b = F.budgets(nd, D);
    if (b.mode === "quick") {
      const leftoverStat = b.stat.pool - b.stat.spent;
      const leftoverSubject = b.subject.pool - b.subject.spent;
      const leftoverSkill = b.skill.pool - b.skill.spent;
      const threshold = 2;
      if (leftoverStat > threshold || leftoverSubject > threshold || leftoverSkill > threshold) {
        const openSlots: Record<MapKey, number> = {
          stats: leftoverStat > threshold ? slots.stats + 1 : slots.stats,
          subjects: leftoverSubject > threshold ? slots.subjects + 2 : slots.subjects,
          skills: leftoverSkill > threshold ? slots.skills + 2 : slots.skills,
        };
        spendCorrelated(nd, D, cfg, graph, { stats: Infinity, subjects: Infinity, skills: Infinity }, openSlots);
      }
    }
    // Guarantee: whatever's still unspent after the thematic passes above
    // (there's rarely more than a point or two left) gets forced in — a
    // quick build should read 100% spent every time, not "close enough".
    forceFillQuickPools(nd, D, graph);
  } else {
    const total = year.custom;
    spendCorrelated(nd, D, cfg, graph, {
      stats: Math.round(cfg.shareStat * total),
      subjects: Math.round(cfg.shareSubject * total),
      skills: Math.round(cfg.shareSkill * total),
    }, slots);
    sprinkleStray(nd, D, 0.4);
    // Mopping up leftover budget *within the original slots* was the bug
    // behind flat, texture-less skill groups: a target of Infinity only
    // stops once every eligible key is either capped or unaffordable, so if
    // the leftover happens to cover the original slots' full capacity, it
    // saturates every one of them identically — jitter/taper only affect
    // draw *order*, not the end state, once nothing stops the loop short of
    // full. So size the slots generously *before* mopping up: give leftover
    // budget roughly double the room it needs, so weighted/jittered
    // competition runs out of budget partway through and leaves an actual
    // gradient instead of maxing everything it touches.
    const leftover = F.budgets(nd, D);
    if (leftover.mode === "custom" && leftover.remaining > 0) {
      const cap = Math.max(1, year.limit);
      const extra = Math.max(2, Math.ceil((leftover.remaining * 2) / cap));
      const openSlots: Record<MapKey, number> = {
        stats: slots.stats,
        subjects: Math.min(F.flatSubjects(D).length, slots.subjects + Math.ceil(extra / 2)),
        skills: Math.min(F.flatSkills(D).length, slots.skills + Math.ceil(extra / 2)),
      };
      spendCorrelated(nd, D, cfg, graph, { stats: Infinity, subjects: Infinity, skills: Infinity }, openSlots);
    }
  }

  // Clean up the "everything's a stray +1" look: fold together same-map 1s
  // that have no reason to stay separate, at random, leaving the rest as
  // clean 0s or 2s/3s instead of a smear of disconnected single ranks.
  // Majors and anything a class move/artifact grant guaranteed are exempt —
  // those 1s are a promise, not noise.
  consolidateOnes(nd, D, "stats", new Set([...Object.keys(statHits), ...Object.keys(ambStatHits)]));
  consolidateOnes(nd, D, "subjects", new Set([...Object.keys(subjectHits), ...Object.keys(ambSubjectHits), ...nd.major]));
  consolidateOnes(nd, D, "skills", new Set([...Object.keys(skillHits), ...Object.keys(ambSkillHits)]));

  pickStartWand(nd, D, cfg);
  pickSpells(nd, D);
  pickInventory(nd, D);

  return nd;
}
