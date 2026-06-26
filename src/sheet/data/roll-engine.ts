/* ===========================================================================
   Starfall Academy — dice roll engine
   ---------------------------------------------------------------------------
   The pure roll mechanics, extracted from public/character-sheet/rolls.jsx
   (window.SF_ROLL). No UI — makeRoll() produces the durable Roll payload
   (see types.ts); the toasts/dock components (Phase D) render it.
   =========================================================================== */
import type { Roll, RollCrit, RollResist, RollResult, RollWho } from "../types";

let _seq = 0;
export const d10 = (): number => 1 + Math.floor(Math.random() * 10);

/** Dice flair: a split 1 & 10 is an inflection, any 10 a crit success, etc. */
export function classify(dice: number[]): Roll["outcome"] {
  const has10 = dice.includes(10);
  const has1 = dice.includes(1);
  if (has1 && has10) return "inflection";
  if (has10) return "crit-success";
  if (has1) return "crit-fail";
  return "normal";
}

/** A crit "spec": special outcomes tied to the dice, independent of the total. */
export interface CritSide {
  on: "one" | "ten" | "always";
  forces?: boolean;
  label?: string;
  text?: string;
  backfire?: boolean;
}
export interface CritSpec {
  fail?: CritSide;
  success?: CritSide;
}

const CRIT_PROFILES: Record<string, CritSpec> = {
  // Every Resist save auto-fails on a 1 and auto-succeeds on a 10.
  resist: {
    fail: { on: "one", forces: true, label: "Critical fail", text: "A natural 1 — the save fails outright, whatever the total." },
    success: { on: "ten", forces: true, label: "Critical success", text: "A natural 10 — the save holds outright, whatever the total." },
  },
};

/** The level family of a spell (first word of its level, lower-cased). */
export function spellLevelKey(level: string | null | undefined): string {
  return String(level || "").trim().toLowerCase().split(/\s+/)[0];
}

/** Spell backfire expressed as a crit spec (does NOT force the result). */
export function spellCrit(level: string, asRitual: boolean, volatile: boolean): CritSpec | null {
  const f = spellLevelKey(level);
  const onAlways: CritSpec = { fail: { on: "always", forces: false, backfire: true, label: "Backfire" } };
  const onOne: CritSpec = { fail: { on: "one", forces: false, backfire: true, label: "Backfire" } };
  if (volatile) return onAlways;
  if (f === "hex" || f === "twisted") return asRitual ? onOne : onAlways;
  if (f === "standard") return asRitual ? null : onOne;
  if (f === "advanced" || f === "legendary") return onOne;
  return null;
}

/** The Material cost to cast a spell (Ritual softens Advanced/Legendary; Hex = 200×AP). */
export function spellMaterialCost(level: string, ap: number | undefined, asRitual: boolean): number {
  const f = spellLevelKey(level);
  if (f === "advanced") return asRitual ? 0 : 500;
  if (f === "legendary") return asRitual ? 500 : 2000;
  if (f === "hex" || f === "twisted") return 200 * (ap || 0);
  return 0;
}

/** Artificy save DC when an artifact move critically fails (natural 1). */
export function artifactBackfireDC(level: string | null | undefined, cost: number | undefined): number {
  const l = String(level || "").toLowerCase().trim();
  if (l === "basic") return 10;
  if (l === "standard") return 15;
  if (l === "advanced") return 20;
  if (l === "legendary") return 25;
  if (l === "twisted") return Math.floor((cost || 0) / 200);
  return 10;
}

function resolveCrit(spec: CritSpec | null | undefined, dice: number[]): RollCrit | null {
  if (!spec) return null;
  const has1 = dice.includes(1), has10 = dice.includes(10);
  const f = spec.fail, s = spec.success;
  if (f && f.on === "always") return { kind: "fail", ...f };
  if (has1 && has10) return null; // a split 1 & 10 is an inflection — no auto-crit
  if (f && f.on === "one" && has1) return { kind: "fail", ...f };
  if (s && s.on === "ten" && has10) return { kind: "success", ...s };
  return null;
}

/** The input partial passed to makeRoll(). */
export interface RollInput {
  dice?: number[];
  mod?: number;
  situational?: number;
  sit?: number;
  dc?: number | null;
  crit?: string | CritSpec | null;
  kind?: string;
  dosMod?: number;
  ts?: number;
  who: RollWho;
  label: string;
  stat?: string;
  meta?: string[] | null;
  detail?: string | null;
  success?: string | null;
  fail?: string | null;
  hl?: ((degrees: number, isSuccess: boolean) => string) | null;
  sitReason?: string | null;
  resist?: RollResist | null;
  hours?: number | null;
  artifactId?: string | null;
  artifactLevel?: string | null;
  artifactCost?: number;
  artifactCondition?: Roll["artifactCondition"];
}

/** Roll 2d10 (or use provided dice), classify, and resolve degrees + crits. */
export function makeRoll(p: RollInput): Roll {
  const dice = p.dice ? p.dice.slice() : [d10(), d10()];
  const mod = p.mod || 0;
  const sit = p.situational != null ? p.situational : p.sit || 0;
  const dc = p.dc === 0 || p.dc ? p.dc : null; // null = rolled without a DC
  const total = dice[0] + dice[1] + mod + sit;

  let critSpec = typeof p.crit === "string" ? CRIT_PROFILES[p.crit] : p.crit;
  if (critSpec == null && p.kind === "resist") critSpec = CRIT_PROFILES.resist;
  let crit = resolveCrit(critSpec, dice);

  let result: RollResult | null = null;
  let degrees: number | null = null;
  let pass: boolean | null = null;
  if (dc != null) {
    if (crit && crit.forces) {
      pass = crit.kind === "success";
      result = pass ? "success" : "failure";
      degrees = 1;
    } else {
      const diff = total - dc;
      pass = total >= dc;
      result = diff >= 0 ? "success" : "failure";
      degrees = Math.floor(Math.abs(diff) / 5) + 1;
    }
  }

  // Degrees-of-success modifier: shifts outcome tiers without changing the total.
  const dosMod = p.dosMod || 0;
  if (dc != null && dosMod !== 0 && !(crit && crit.forces) && degrees != null) {
    const pos = pass ? degrees : -degrees;
    let newPos = pos + dosMod;
    if (pos < 0 && newPos >= 0) newPos += 1;
    else if (pos > 0 && newPos <= 0) newPos -= 1;
    if (newPos === 0) newPos = 1;
    pass = newPos > 0;
    result = newPos > 0 ? "success" : "failure";
    degrees = Math.max(1, Math.abs(newPos));
  }

  // Attunement: a landed attunement always flares like a critical success.
  if (p.kind === "attune" && dc != null) {
    if (pass) {
      const artName = String(p.label || "").replace(/^Attune to /, "");
      const article = /^the\s/i.test(artName) ? "" : "the ";
      crit = { kind: "success", label: "Attuned", text: " — You and " + article + artName + " are now linked." };
    } else {
      crit = null;
    }
  }

  return {
    id: "r" + ++_seq + "-" + Date.now(),
    ts: p.ts || Date.now(),
    who: p.who,
    label: p.label,
    kind: p.kind || "skill",
    stat: p.stat || "",
    meta: p.meta || null,
    detail: p.detail || null,
    success: p.success || null,
    fail: p.fail || null,
    hl: p.hl || null,
    dice,
    mod,
    sit,
    sitReason: p.sitReason || null,
    dc,
    total,
    outcome: classify(dice),
    pass,
    result,
    degrees,
    dosMod: dosMod || 0,
    crit,
    resist: p.resist || null,
    hours: p.hours || null,
    artifactId: p.artifactId || null,
    artifactLevel: p.artifactLevel || null,
    artifactCost: p.artifactCost || 0,
    artifactCondition: p.artifactCondition || null,
  };
}

export interface Headline {
  key: string;
  tone?: string;
  label?: string;
}

/** The headline a roll wears (inflection trumps; with a DC the result colours the total). */
export function headline(roll: Roll): Headline {
  if (roll.dc != null) {
    if (roll.outcome === "inflection") return { key: "inflection", tone: "gold", label: "Inflection" };
    return { key: roll.result || "" };
  }
  if (roll.outcome === "inflection") return { key: "inflection", tone: "gold", label: "Inflection" };
  if (roll.outcome === "crit-success") return { key: "crit-success", tone: "forest", label: "Critical" };
  if (roll.outcome === "crit-fail") return { key: "crit-fail", tone: "crimson", label: "Crit fail" };
  return { key: "normal" };
}
