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

// Strip quoted nicknames/titles (e.g. Aspen 'Rogue' Whitley) before taking initials.
const QUOTED_SEGMENT = /['"`‘’“”][^'"`‘’“”]*['"`‘’“”]/g;

function initialsOf(name: string): string {
  return (
    name
      .replace(QUOTED_SEGMENT, " ")
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
// The GM dashboard (gm.jsx) lists each party member with display vitals
// (resolve / AP / materials / conditions). It no longer needs the character's
// stats: GM-initiated player rolls (Force-Resist, Action) are *prompted* and
// rolled on the player's own sheet, so the authoritative stats never leave it.

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
};

type SheetCondition = { id?: string; value?: number };
type SheetFull = {
  c?: SheetCharacter & {
    title?: string;
    actionPoints?: number;
    actionPointsMax?: number;
    resolve?: number;
    materials?: number;
  };
  conditions?: SheetCondition[];
};

const COND_IDS = ["fear", "despair", "wound", "loss", "doubt"];

export function toGMPartyMember(row: CharacterRow): GMPartyMember {
  const sheet = ((row.sheet as SheetFull) ?? {}) as SheetFull;
  const c = sheet.c ?? {};
  const name = (c.name || row.name || "Unnamed").toString();
  const houseFull = (c.house || "").toString().replace(/\s+House$/i, "").trim();
  const tone = c.houseTone || (houseFull ? HOUSE_TONE[houseFull] : "") || "gold";

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
    // Resolve isn't its own stored stat — it's 5 minus the character's total
    // condition severity, same formula as the player's own TopBar computes
    // (roster.ts previously read the raw, disconnected c.resolve field here).
    resolve: Math.max(0, 5 - Object.values(conds).reduce((s, v) => s + v, 0)),
    ap: Number(c.actionPoints) || 0,
    apMax: Number(c.actionPointsMax) || 6,
    materials: Number(c.materials) || 0,
    conds,
  };
}
