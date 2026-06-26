import { createClient } from "@/lib/supabase/server";
import CharactersView, {
  type CharacterCard,
  type CampaignCard,
} from "./CharactersView";

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
  // RLS scopes both queries to the signed-in user (owner of characters, GM of
  // campaigns).
  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, sheet, campaign_code, updated_at")
    .order("updated_at", { ascending: false });
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, code, updated_at")
    .order("updated_at", { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const characterCards = (characters ?? []).map(toCard);
  const campaignCards: CampaignCard[] = (campaigns ?? []).map((cm) => {
    const name = (cm.name || "Untitled campaign").toString();
    return {
      id: cm.id,
      name,
      monogram: initialsOf(name),
      code: cm.code ?? "",
    };
  });

  return (
    <CharactersView
      characters={characterCards}
      campaigns={campaignCards}
      userEmail={user?.email ?? null}
    />
  );
}
