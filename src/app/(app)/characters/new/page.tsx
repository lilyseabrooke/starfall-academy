import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterSheet, type NpcCreate } from "@/sheet/CharacterSheet";

export const metadata = {
  title: "New character — Starfall Academy",
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").map((x) => x.trim()).filter(Boolean);

// Opens the sheet in create mode: the Forge auto-opens, and the character row
// is only created when the build is committed (Begin).
//
// With ?npc=<campaign id> it creates a GM-only NPC in that campaign instead
// (the caller must run it); adding ?random=1 skips the wizard and builds a
// random NPC from the form's answers (name, pronouns, year, major, classes,
// bio), each optional one left to chance.
export default async function NewCharacterPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const npcCampaign = one(sp.npc);

  let npc: NpcCreate | null = null;
  if (npcCampaign) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, gm_id")
      .eq("id", npcCampaign)
      .maybeSingle();
    // Only the campaign's GM may add NPCs to it.
    if (!campaign || campaign.gm_id !== user.id) redirect("/characters");
    npc = {
      campaignId: campaign.id,
      random: one(sp.random)
        ? {
            name: one(sp.name),
            pronouns: one(sp.pronouns),
            yearId: one(sp.year),
            major: list(sp.major),
            classIds: list(sp.classes),
            bio: one(sp.bio),
          }
        : null,
    };
  }

  return <CharacterSheet mode="create" id={null} npc={npc} />;
}
