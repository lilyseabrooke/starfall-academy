// Shapes the prototype's party roster expects ({ id, name, initials, tone }),
// derived from a DB character row + its sheet JSONB.

export type RosterMember = {
  id: string;
  name: string;
  initials: string;
  tone: string;
  house: string;
  active?: boolean;
};

type SheetCharacter = { name?: string; house?: string; houseTone?: string };

// House → design-system tone (per the build plan).
const HOUSE_TONE: Record<string, string> = {
  Dragon: "plum",
  Boar: "forest",
  Dolphin: "teal",
  Eagle: "crimson",
  Scorpion: "gold",
};

export type CharacterRow = {
  id: string;
  name: string | null;
  sheet: unknown;
};

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "??"
  );
}

export function toRosterMember(row: CharacterRow, activeId: string): RosterMember {
  const c = ((row.sheet as { c?: SheetCharacter })?.c ?? {}) as SheetCharacter;
  const name = (c.name || row.name || "Unnamed").toString();
  const tone = c.houseTone || (c.house ? HOUSE_TONE[c.house] : undefined) || "gold";
  return { id: row.id, name, initials: initialsOf(name), tone, house: c.house || "", active: row.id === activeId };
}

// ---- GM party board projection -------------------------------------------
// The GM dashboard (gm.jsx) renders each party member with live vitals and runs
// real mechanics off them (Force-Resist uses `facs[resistId]`, Action uses
// `facs.insight` + `apMax`). This shapes a DB character row + its sheet JSONB
// into that member form. `facs` are base stat ranks (live magic bonuses aren't
// reconstructed server-side yet); `conds` are the sheet's condition counts.

export type GMPartyMember = {
  id: string;
  sheetId: string;
  name: string;
  initials: string;
  tone: string;
  house: string;
  className: string;
  resolve: number;
  ap: number;
  apMax: number;
  materials: number;
  conds: Record<string, number>;
  facs: Record<string, number>;
};

type SheetStat = { id?: string; rank?: number };
type SheetCondition = { id?: string; value?: number };
type SheetFull = {
  c?: SheetCharacter & {
    title?: string;
    actionPoints?: number;
    actionPointsMax?: number;
    resolve?: number;
    materials?: number;
  };
  stats?: SheetStat[];
  conditions?: SheetCondition[];
};

const CORE_STATS = ["focus", "creativity", "logic", "insight", "body", "charm"];
const COND_IDS = ["fear", "despair", "wound", "loss", "doubt"];

export function toGMPartyMember(row: CharacterRow): GMPartyMember {
  const sheet = ((row.sheet as SheetFull) ?? {}) as SheetFull;
  const c = sheet.c ?? {};
  const name = (c.name || row.name || "Unnamed").toString();
  const houseFull = (c.house || "").toString().replace(/\s+House$/i, "").trim();
  const tone = c.houseTone || (houseFull ? HOUSE_TONE[houseFull] : "") || "gold";

  const facs: Record<string, number> = {};
  for (const id of CORE_STATS) facs[id] = 10; // matches the sheet's facs() default
  if (Array.isArray(sheet.stats)) {
    for (const s of sheet.stats) {
      const key = (s?.id || "").toString();
      if (CORE_STATS.includes(key) && typeof s.rank === "number") facs[key] = s.rank;
    }
  }

  const conds: Record<string, number> = {};
  for (const id of COND_IDS) conds[id] = 0;
  if (Array.isArray(sheet.conditions)) {
    for (const cn of sheet.conditions) {
      const key = (cn?.id || "").toString();
      if (COND_IDS.includes(key)) conds[key] = Number(cn.value) || 0;
    }
  }

  return {
    id: row.id,
    sheetId: row.id,
    name,
    initials: initialsOf(name),
    tone,
    house: houseFull ? `${houseFull} House` : "Unsorted",
    className: (c.title || "").toString(),
    resolve: Number(c.resolve) || 0,
    ap: Number(c.actionPoints) || 0,
    apMax: Number(c.actionPointsMax) || 6,
    materials: Number(c.materials) || 0,
    conds,
    facs,
  };
}
