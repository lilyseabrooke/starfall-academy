import { createClient } from "@/lib/supabase/server";
import CharactersView, { type CharacterCard } from "./CharactersView";

export const metadata = {
  title: "Characters — Starfall Academy",
};

type SheetCharacter = {
  name?: string;
  pronouns?: string;
  year?: string;
  house?: string;
  houseTone?: string;
};

// House → design-system tone, for rows whose sheet predates houseTone.
const HOUSE_TONE: Record<string, string> = {
  Dragon: "plum",
  Boar: "forest",
  Dolphin: "teal",
  Eagle: "crimson",
  Scorpion: "gold",
};

function initialsOf(name: string) {
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

function toCard(row: {
  id: string;
  name: string | null;
  sheet: unknown;
  campaign_code: string | null;
}): CharacterCard {
  const c = ((row.sheet as { c?: SheetCharacter })?.c ?? {}) as SheetCharacter;
  const name = (c.name || row.name || "Unnamed").toString();
  // Sheets store the long house name ("Dragon House"); the card shows "Dragon".
  const houseFull = (c.house || "").replace(/\s+House$/i, "").trim();
  const tone = c.houseTone || (houseFull ? HOUSE_TONE[houseFull] : "") || "gold";
  return {
    id: row.id,
    name,
    monogram: initialsOf(name),
    pronouns: c.pronouns?.trim() || "",
    year: c.year?.toString().trim() || "",
    house: houseFull || "Unsorted",
    tone,
    campaign: row.campaign_code,
  };
}

export default async function CharactersPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner.
  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, sheet, campaign_code, updated_at")
    .order("updated_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cards = (characters ?? []).map(toCard);

  return <CharactersView characters={cards} userEmail={user?.email ?? null} />;
}
