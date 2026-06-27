/* ===========================================================================
   Starfall Academy — GM view seed data
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/gm-data.js (window.SF_GM_DATA). The GM
   dashboard's standalone seed: the party board, NPCs, notes, time tracker, and
   the shared-ledger seed. In the app the live campaign party replaces `party`;
   the rest stays seed until the GM-data milestone.
   =========================================================================== */
import type { Tone } from "../types";
import type { PoolRoll } from "./seed";

export interface GmCondDef {
  id: string;
  name: string;
  resist: string;
  resistId: string;
  color: string;
}

export type GmConds = Record<string, number>;

/** A party member on the GM board (seed shape; the live roster supplies the
 *  same fields minus `facs`, which the GM view no longer reads). */
export interface GmPartyMember {
  id: string;
  sheetId: string | null;
  name: string;
  initials: string;
  tone: Tone | string;
  house: string;
  className: string;
  resolve: number;
  ap: number;
  apMax: number;
  materials: number;
  conds: GmConds;
  facs?: Record<string, number>;
}

export interface GmNpc {
  id: string;
  name: string;
  kind: string;
  icon: string | null;
  maxResolve: number;
  strong: number;
  weak: number;
  conds: GmConds;
}

export interface GmNote {
  id: string;
  title: string;
  tags: string;
  body: string;
}

export interface GmTime {
  day: number;
  block: number;
  enabled: boolean;
}

export interface GmSeedData {
  campaign: { name: string };
  CONDS: GmCondDef[];
  party: GmPartyMember[];
  npcsBasic: GmNpc[];
  notes: GmNote[];
  matChips: number[];
  matStep: number;
  ledgerSeed: PoolRoll[];
  time: GmTime;
}

const conds = (o?: GmConds): GmConds => ({ fear: 0, despair: 0, wound: 0, loss: 0, doubt: 0, ...o });
const facs = (o?: Record<string, number>): Record<string, number> => ({ focus: 10, creativity: 10, logic: 10, insight: 10, body: 10, charm: 10, ...o });

const CONDS: GmCondDef[] = [
  { id: "fear", name: "Fear", resist: "Logic", resistId: "logic", color: "var(--crimson-300)" },
  { id: "despair", name: "Despair", resist: "Insight", resistId: "insight", color: "var(--plum-300)" },
  { id: "wound", name: "Wound", resist: "Body", resistId: "body", color: "var(--crimson-300)" },
  { id: "loss", name: "Loss", resist: "Creativity", resistId: "creativity", color: "var(--teal-300)" },
  { id: "doubt", name: "Doubt", resist: "Focus", resistId: "focus", color: "var(--gold-300)" },
];

const party: GmPartyMember[] = [
  { id: "lyra", sheetId: null, name: "Lyra Vane", initials: "LV", tone: "plum", house: "Dragon House", className: "Spectral Adept · Pupil IV", resolve: 5, ap: 4, apMax: 6, materials: 150, conds: conds({ fear: 1, wound: 1 }), facs: facs({ focus: 14, creativity: 11, logic: 13, insight: 16, body: 9, charm: 12 }) },
  { id: "cassius", sheetId: null, name: "Cassius Roe", initials: "CR", tone: "forest", house: "Boar House", className: "Hedge-Warden · Heir IV", resolve: 5, ap: 3, apMax: 6, materials: 50, conds: conds({ despair: 2 }), facs: facs({ focus: 9, creativity: 10, logic: 8, insight: 12, body: 15, charm: 11 }) },
  { id: "isolde", sheetId: null, name: "Isolde Marsh", initials: "IM", tone: "teal", house: "Dolphin House", className: "Tideglass Scholar · Socialite II", resolve: 5, ap: 5, apMax: 6, materials: 250, conds: conds({}), facs: facs({ focus: 13, creativity: 14, logic: 15, insight: 11, body: 8, charm: 13 }) },
  { id: "tomas", sheetId: null, name: "Tomas Ardent", initials: "TA", tone: "crimson", house: "Eagle House", className: "Duelling Prefect · Wandjock IV", resolve: 5, ap: 2, apMax: 6, materials: 100, conds: conds({ wound: 2, loss: 1 }), facs: facs({ focus: 11, creativity: 9, logic: 10, insight: 10, body: 14, charm: 10 }) },
];

const npcsBasic: GmNpc[] = [
  { id: "proctor", name: "Proctor Hale", kind: "Examiner", icon: "user-round", maxResolve: 3, strong: 9, weak: 3, conds: conds({}) },
  { id: "familiar", name: "Hollow-Eyed Familiar", kind: "Beast", icon: "cat", maxResolve: 2, strong: 7, weak: 1, conds: conds({ fear: 1 }) },
  { id: "revenant", name: "Marsh Revenant", kind: "Undead", icon: "skull", maxResolve: 4, strong: 12, weak: 4, conds: conds({ wound: 1 }) },
  { id: "page", name: "Gilded Page", kind: "Servant", icon: "scroll", maxResolve: 1, strong: 5, weak: 2, conds: conds({}) },
];

const notes: GmNote[] = [
  { id: "n1", title: "Session XIV — The Drowned Archive", tags: "session, archive", body: "The Archive floods on the new moon. The players have until Matins to recover the Tidewater Codex before the lower stacks are lost.\n\nIf they free the bound spirit in the Hollow Lantern, it will name the Tallow Man — but the naming costs one of them a memory (Loss 1).\n\nKey beats:\n· The water rises one stack of Despair each scene anyone lingers below.\n· Coricant knows the safe stair but will only trade it for the Codex." },
  { id: "n2", title: "The Tallow Man — what he wants", tags: "antagonist", body: "He is not after the Codex. He is after the index card tucked inside it — the one bearing a true name. Let the players think they have won when they take the book." },
  { id: "n3", title: "Faction — The Gilded Hand", tags: "faction", body: "Smugglers of attuned artifacts. Owe Isolde a favour. Will appear if the party needs an exit they have not earned." },
  { id: "n4", title: "Hooks & loose threads", tags: "hooks", body: "· Tomas's missing wand\n· The seventh observatory mirror\n· Why Cassius will not enter the greenhouse" },
];

const ledgerSeed: PoolRoll[] = [
  { whoId: "isolde", kind: "resist", label: "Resist Despair", stat: "Insight", mod: 11, dc: 12, dice: [8, 3], meta: ["Despair", "Insight"] },
  { whoId: "cassius", kind: "skill", label: "Body check · brace the door", stat: "Body", mod: 14, dice: [5, 5], dc: 12 },
  { whoId: "tomas", kind: "skill", label: "Athletics · scale the stacks", stat: "Body", mod: 9, dice: [6, 7] },
  { gm: true, actor: "Game Master", kind: "roll", label: "Quick roll · 2d10", stat: "", mod: 0, dice: [7, 4] },
];

export const GM_SEED: GmSeedData = {
  campaign: { name: "The Drowned Archive" },
  CONDS,
  party,
  npcsBasic,
  notes,
  matChips: [50, 100, 250, 500],
  matStep: 50,
  ledgerSeed,
  time: { day: 0, block: 0, enabled: true },
};
