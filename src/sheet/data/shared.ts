/* ===========================================================================
   Starfall Academy — shared constants & utilities
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/shared.js (window.SF_SHARED). Icons, tone
   maps, degree-scaling ("higher-level behaviour") parsing, roman numerals, and
   ability resolution.

   Change from the prototype: the ability index used to read window.SF_DATA
   (which the live compendium mutated in place). Here it is fed explicitly via
   setAbilityData(stats, schools) — the sheet root calls it whenever the
   stat/school structure changes (e.g. after the Forge commits).
   =========================================================================== */
import type { MagicSchool, Stat, Tone } from "../types";

/* ----------------------------- Icon SVG defaults ----------------------- */
export const ICON_SVG_DEFAULTS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.85,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ----------------------- Tone color variables ----------------------- */
export type ToneColorKey = "gold" | "plum" | "forest" | "teal" | "crimson" | "silver";

interface ToneColor {
  fg: string;
  main: string;
  mix: string;
}

export const TONE_COLORS: Record<ToneColorKey, ToneColor> = {
  gold: { fg: "var(--gold-300)", main: "var(--gold-500)", mix: "var(--grad-gold)" },
  plum: { fg: "var(--plum-300)", main: "var(--plum-500)", mix: "color-mix(in oklab, var(--plum-500) 60%, var(--ink-900))" },
  forest: { fg: "var(--forest-300)", main: "var(--forest-500)", mix: "color-mix(in oklab, var(--forest-500) 60%, var(--ink-900))" },
  teal: { fg: "var(--teal-300)", main: "var(--teal-500)", mix: "color-mix(in oklab, var(--teal-500) 60%, var(--ink-900))" },
  crimson: { fg: "var(--crimson-300)", main: "var(--crimson-500)", mix: "color-mix(in oklab, var(--crimson-500) 62%, var(--ink-900))" },
  // Silver: used for the Body stat — a cool steel-gray, no house mapping.
  silver: { fg: "oklch(82% 0.012 222)", main: "oklch(62% 0.016 222)", mix: "color-mix(in oklab, oklch(62% 0.016 222) 60%, var(--ink-900))" },
};

const toneEntries = Object.entries(TONE_COLORS) as [ToneColorKey, ToneColor][];
export const TONE_FG: Record<string, string> = Object.fromEntries(toneEntries.map(([k, v]) => [k, v.fg]));
export const TONE_500: Record<string, string> = Object.fromEntries(toneEntries.map(([k, v]) => [k, v.main]));
export const TONE_MIX: Record<string, string> = Object.fromEntries(toneEntries.map(([k, v]) => [k, v.mix]));

/* ----------------------- Level → tone mapping ----------------------- */
export const LEVEL_TONE_MAP: Record<string, Tone> = {
  basic: "forest",
  standard: "teal",
  advanced: "plum",
  legendary: "gold",
  hex: "crimson",
  twisted: "crimson",
};

/** Extract a level's family key and map to a tone. */
export function levelTone(level: string | null | undefined): Tone | null {
  if (!level) return null;
  const f = String(level).trim().toLowerCase().split(/\s+/)[0];
  return LEVEL_TONE_MAP[f] || null;
}

export interface Accent {
  style: Record<string, string> | undefined;
  flat: boolean;
  tone: Tone | null;
}

/** Accent style object + flat flag for any card driven by level. */
export function accentOf(level: string | null | undefined): Accent {
  const t = levelTone(level);
  return {
    style: t ? { "--ent-accent": TONE_500[t] } : undefined,
    flat: !t,
    tone: t,
  };
}

/* ----------------- Higher-level behaviour: degree-scaling -------------- */
// Spells resolve by DEGREES OF SUCCESS. The database writes scaling inline as
// compact notation: (a/b/c) ladder, (a/b/c+) extend by last step, (a/b*) double,
// x/degree linear, (txt/txt2) non-numeric ladder. See shared.js for the spec.

/** Compute one parenthesised ladder's value at degree d (1-indexed). */
function hlbComputeList(inner: string, d: number): string {
  const parts = inner.split(/[/,]/).map((s) => s.trim());
  let suffix: string | null = null;
  const lastRaw = parts[parts.length - 1];
  if (/[+*]$/.test(lastRaw)) {
    suffix = lastRaw.slice(-1);
    parts[parts.length - 1] = lastRaw.slice(0, -1).trim();
  }
  const n = parts.length;
  const allNum = parts.every((p) => p !== "" && !isNaN(Number(p)));
  if (!allNum) return parts[Math.min(d, n) - 1]; // text ladder
  const nums = parts.map(Number);
  if (d <= n) return String(nums[d - 1]); // within the list
  if (suffix === "+") {
    const incr = n >= 2 ? nums[n - 1] - nums[n - 2] : nums[n - 1];
    return String(nums[n - 1] + incr * (d - n));
  }
  if (suffix === "*") return String(nums[n - 1] * Math.pow(2, d - n));
  return String(nums[n - 1]); // hold last
}

export const hlbIsNA = (t: unknown): boolean => !t || /^n\/?a\.?$/i.test(String(t).trim());

export interface HlbSegment {
  t: "text" | "val";
  v: string;
}

/** Resolve prose at a degree into text/value segments. */
export function hlbSegments(text: string | null | undefined, degree: number): HlbSegment[] | null {
  if (hlbIsNA(text)) return null;
  const src = String(text);
  const d = Math.max(1, degree | 0);
  const re = /([+-]?)\(([^()]*[/,][^()]*)\)(%?)|([+-]?\d+)\s*\/\s*degree/g;
  const out: HlbSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ t: "text", v: src.slice(last, m.index) });
    if (m[2] != null) {
      out.push({ t: "val", v: (m[1] || "") + hlbComputeList(m[2], d) + (m[3] || "") });
    } else {
      const mult = parseInt(m[4], 10);
      const val = mult * d;
      out.push({ t: "val", v: (m[4][0] === "+" && val >= 0 ? "+" : "") + val });
    }
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

/** Flatten higher-level prose to a plain string at a rolled degree. */
export function hlbResolveText(text: string | null | undefined, degree: number): string | null {
  const segs = hlbSegments(text, degree);
  return segs ? segs.map((s) => s.v).join("") : null;
}

/** Highest meaningful degree to expose (longest explicit ladder, clamped 5–8). */
export function hlbMaxDegree(text: string | null | undefined): number {
  if (hlbIsNA(text)) return 5;
  const re = /\(([^()]*[/,][^()]*)\)/g;
  let m: RegExpExecArray | null;
  let max = 0;
  const src = String(text);
  while ((m = re.exec(src)) !== null) {
    const len = m[1].split(/[/,]/).length;
    if (len > max) max = len;
  }
  return Math.min(8, Math.max(5, max));
}

/* ----------------------- Roman numerals -------------------------------- */
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/* ----------------------- Ability resolution ---------------------------- */
const _norm = (s: unknown) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

export interface ResolvedAbility {
  ability: string;
  kind: "skill" | "subject";
  stat: string;
  skill?: string;
  subjectKey?: string;
  label: string;
}

type AbilityIndex = Record<string, Omit<ResolvedAbility, "ability">>;

let _abilityIndex: AbilityIndex | null = null;
let _stats: Stat[] = [];
let _schools: MagicSchool[] = [];

/** Feed the resolver the current stat/school structure (call from the root
 *  whenever they change — replaces the prototype's read of window.SF_DATA). */
export function setAbilityData(stats: Stat[], schools: MagicSchool[]): void {
  _stats = stats || [];
  _schools = schools || [];
  _abilityIndex = null;
}

function buildAbilityIndex(): AbilityIndex {
  const idx: AbilityIndex = {};
  _stats.forEach((fac) => {
    (fac.skills || []).forEach((sk) => {
      idx[_norm(sk.name)] = { kind: "skill", stat: fac.name, skill: sk.name, label: sk.name };
    });
  });
  _schools.forEach((sc) => {
    (sc.subjects || []).forEach((sub) => {
      idx[_norm(sub.name)] = { kind: "subject", stat: sub.stat, subjectKey: sub.key, label: sub.name };
    });
  });
  const alias: Record<string, string> = {
    "recall information": "recall info",
    investigation: "investigate",
    "win over": "win over",
    "sleight of hand": "sleight of hand",
    "read person": "read person",
  };
  for (const [from, to] of Object.entries(alias)) {
    if (!idx[from] && idx[_norm(to)]) idx[from] = idx[_norm(to)];
  }
  return idx;
}

/** Resolve one ability name → its roll source, or null. */
export function resolveAbility(name: string): ResolvedAbility | null {
  if (!_abilityIndex) _abilityIndex = buildAbilityIndex();
  const hit = _abilityIndex[_norm(name)];
  if (!hit) return null;
  return { ability: name, ...hit };
}

/** Allow a rebuild if the school/stat structure is swapped wholesale (Forge). */
export function resetAbilityIndex(): void {
  _abilityIndex = null;
}

/* ----------------------- Plant "Requires roll" behaviour --------------- */
export type PlantRollMode = "yes" | "no" | "move" | "bonus" | "ability" | "choose";

export interface PlantRoll {
  mode: PlantRollMode;
  bonusTarget?: string;
  bonusValue?: number;
}

export function parsePlantRoll(raw: string | null | undefined): PlantRoll {
  const s = String(raw == null ? "yes" : raw).trim();
  const upper = s.toUpperCase();
  if (upper.startsWith("BONUS")) {
    const m = /\(\s*(.+?)\s*[;,]\s*([+-]?\d+)\s*\)/.exec(s);
    return { mode: "bonus", bonusTarget: m ? m[1].trim() : "", bonusValue: m ? parseInt(m[2], 10) : 0 };
  }
  if (upper === "NO") return { mode: "no" };
  if (upper === "MOVE") return { mode: "move" };
  if (upper === "ABILITY") return { mode: "ability" };
  if (upper === "CHOOSE") return { mode: "choose" };
  return { mode: "yes" };
}

/** For MOVE plants, drop the "You can bring this plant with you." lead-in. */
export function stripPlantCarry(text: string | null | undefined): string {
  return String(text || "").replace(/^\s*You can bring this plant with you\.\s*/i, "");
}

export const PLANT_ROLL_LABEL: Record<PlantRollMode, string> = {
  yes: "Roll to use",
  no: "No roll",
  move: "Grants a Move",
  bonus: "Grants a Bonus",
  ability: "Passive ability",
  choose: "Roll optional",
};
