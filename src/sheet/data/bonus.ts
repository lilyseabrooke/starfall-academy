/* ===========================================================================
   Starfall Academy — bonus taxonomy & value resolution
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/bonus.js (window.SF_BONUS). The single
   source of truth for what a Bonus can target and how its value is computed;
   read by the ledger, the editor modal, and every roll handler.
   =========================================================================== */
import type { Bonus, Condition, MagicSchool, Move, Spell, Stat } from "../types";

export type BonusTargetReq = "req" | "opt" | "none";
export type BonusTargetKind = "stat" | "subject" | "skill" | "move" | "spell" | "ability" | "field" | "resist";

export interface BonusTypeMeta {
  id: string;
  label: string;
  group: "Totals" | "Rolls";
  target: BonusTargetReq;
  kind?: BonusTargetKind;
  icon: string;
  hint: string;
  allLabel?: string;
}

// target: "req" mandatory · "opt" optional (blank = whole category) · "none".
export const TYPES: BonusTypeMeta[] = [
  { id: "stat", label: "Stat", group: "Totals", target: "req", kind: "stat", icon: "gauge", hint: "Raises the stat everywhere it is rolled." },
  { id: "subject", label: "Subject", group: "Totals", target: "req", kind: "subject", icon: "sparkles", hint: "Adds to one field of magic." },
  { id: "skill", label: "Skill", group: "Totals", target: "req", kind: "skill", icon: "target", hint: "Adds to one skill." },
  { id: "move", label: "A specific move", group: "Totals", target: "req", kind: "move", icon: "swords", hint: "Adds to one move's roll." },
  { id: "spell", label: "A specific spell", group: "Totals", target: "req", kind: "spell", icon: "sparkles", hint: "Adds to one spell's casting roll." },
  { id: "metabolize", label: "Metabolize rolls", group: "Rolls", target: "none", icon: "flask-round", hint: "Every Metabolize roll." },
  { id: "attune", label: "Attunement rolls", group: "Rolls", target: "none", icon: "gem", hint: "Every Attunement roll." },
  { id: "artifact-repair", label: "Artifact repair rolls", group: "Rolls", target: "none", icon: "hammer", hint: "Every artifact repair roll." },
  { id: "plantuse", label: "Plant-use rolls", group: "Rolls", target: "none", icon: "leaf", hint: "Every plant-use roll." },
  { id: "rune", label: "Rune-creating rolls", group: "Rolls", target: "none", icon: "pen-tool", hint: "Every rune-creating roll." },
  { id: "improve", label: "Improvement rolls", group: "Rolls", target: "opt", kind: "ability", allLabel: "All abilities", icon: "trending-up", hint: "Improvement rolls — all, or one ability." },
  { id: "learn", label: "Spell-learning rolls", group: "Rolls", target: "opt", kind: "field", allLabel: "All fields", icon: "book-open", hint: "Spell-learning rolls — all, or one field." },
  { id: "brew", label: "Potion-brewing rolls", group: "Rolls", target: "none", icon: "flask-conical", hint: "Every potion-brewing roll." },
  { id: "resist", label: "Resist rolls", group: "Rolls", target: "opt", kind: "resist", allLabel: "All resist types", icon: "shield", hint: "Resist rolls — all, or one type." },
  { id: "spellroll", label: "Spell rolls", group: "Rolls", target: "opt", kind: "field", allLabel: "All subjects", icon: "zap", hint: "Spell casting rolls — all, or one subject." },
  { id: "spellbackfire", label: "Spell backfire rolls", group: "Rolls", target: "opt", kind: "field", allLabel: "All subjects", icon: "flame", hint: "Spell backfire rolls — all, or one subject." },
  { id: "artificybackfire", label: "Artificy backfire rolls", group: "Rolls", target: "none", icon: "wrench", hint: "Every artificy backfire roll." },
  { id: "wandcraft", label: "Wandcraft rolls", group: "Rolls", target: "none", icon: "wand-sparkles", hint: "Every wandcraft roll." },
  { id: "enchant", label: "Enchanting rolls", group: "Rolls", target: "none", icon: "sparkles", hint: "Every Enchanting roll." },
  { id: "action", label: "Action rolls", group: "Rolls", target: "none", icon: "zap", hint: "The Action roll (DC 10 Insight) that sets your Action Points." },
];

const byId: Record<string, BonusTypeMeta> = {};
TYPES.forEach((t) => {
  byId[t.id] = t;
});

export const typeMeta = (id: string): BonusTypeMeta | null => byId[id] || null;
export const typeLabel = (id: string): string => (byId[id] ? byId[id].label : id);
export const typeIcon = (id: string): string => (byId[id] ? byId[id].icon : "circle");
export const needsTarget = (id: string): BonusTargetReq => (byId[id] ? byId[id].target : "none");

export interface TargetOption {
  value: string;
  label: string;
  note?: string;
}

export interface TargetContext {
  stats?: Stat[];
  schools?: MagicSchool[];
  moves?: Move[];
  spells?: Spell[];
  conditions?: Condition[];
}

export const trimSchool = (name: string | null | undefined): string =>
  String(name || "").replace(" Magics", "");

export function targetOptions(kind: BonusTargetKind | undefined, ctx?: TargetContext): TargetOption[] {
  const c = ctx || {};
  const stats = (c.stats || []).filter(Boolean);
  const schools = (c.schools || []).filter(Boolean);
  const moves = (c.moves || []).filter(Boolean);
  const spells = (c.spells || []).filter(Boolean);
  const conds = (c.conditions || []).filter(Boolean);
  switch (kind) {
    case "stat":
      return stats.map((f) => ({ value: f.name, label: f.name }));
    case "subject":
    case "field":
      return schools.flatMap((sc) =>
        (sc.subjects || []).filter(Boolean).map((s) => ({ value: s.key, label: s.name, note: trimSchool(sc.name) }))
      );
    case "skill":
      return stats.flatMap((f) =>
        (f.skills || []).filter(Boolean).map((s) => ({ value: s.id, label: s.name, note: f.name }))
      );
    case "ability": {
      const subs = schools.flatMap((sc) =>
        (sc.subjects || []).filter(Boolean).map((s) => ({ value: s.key, label: s.name, note: trimSchool(sc.name) }))
      );
      const skills = stats.flatMap((f) =>
        (f.skills || []).filter(Boolean).map((s) => ({ value: s.id, label: s.name, note: f.name }))
      );
      return [...subs, ...skills];
    }
    case "move":
      return moves.map((m) => ({ value: m.id, label: m.name }));
    case "spell":
      return spells.map((s) => ({ value: s.id, label: s.name, note: s.subject }));
    case "resist":
      return conds.map((cd) => ({ value: cd.id, label: cd.name }));
    default:
      return [];
  }
}

export type ClassRankOf = (classKey: string | undefined) => number;

/** A class-mode bonus tracks a class rank live; flat bonuses use their value. */
export function resolveValue(b: Bonus | null | undefined, classRankOf?: ClassRankOf): number {
  if (!b) return 0;
  if (b.valueMode === "class") return (classRankOf ? classRankOf(b.classKey) : 0) || 0;
  return b.value || 0;
}

export type ValueLabel =
  | { kind: "class"; text: string; n: number }
  | { kind: "flat"; text: string; n: number };

export function valueLabel(b: Bonus | null | undefined, classRankOf?: ClassRankOf): ValueLabel {
  if (b && b.valueMode === "class") {
    const r = (classRankOf ? classRankOf(b.classKey) : 0) || 0;
    return { kind: "class", text: (b.classLabel || "Class") + " rank", n: r };
  }
  const v = (b && b.value) || 0;
  return { kind: "flat", text: (v >= 0 ? "+" : "−") + Math.abs(v), n: v };
}

/** A blank record for the editor's "Add" mode. */
export function blank(): Bonus {
  return {
    id: "bn-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    source: "",
    type: "skill",
    target: "",
    targetLabel: "",
    valueMode: "flat",
    value: 1,
    classKey: "",
    classLabel: "",
    active: true,
    conditional: false,
    condNote: "",
  };
}
