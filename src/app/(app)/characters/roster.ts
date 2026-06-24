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

export function toRosterMember(row: CharacterRow, activeId: string): RosterMember {
  const c = ((row.sheet as { c?: SheetCharacter })?.c ?? {}) as SheetCharacter;
  const name = (c.name || row.name || "Unnamed").toString();
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase() || "??";
  const tone = c.houseTone || (c.house ? HOUSE_TONE[c.house] : undefined) || "gold";
  return { id: row.id, name, initials, tone, house: c.house || "", active: row.id === activeId };
}
