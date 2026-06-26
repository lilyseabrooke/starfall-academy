import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toGMPartyMember, type CharacterRow } from "../../characters/roster";
import GMViewFrame from "./GMViewFrame";

export const metadata = {
  title: "GM Tools — Starfall Academy",
};

export default async function GMToolsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS guarantees this only returns a campaign the signed-in user GMs.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, code")
    .eq("id", id)
    .single();

  if (error || !campaign) notFound();

  // The campaign's player characters (cross-user — RLS lets the GM read members'
  // characters). NPCs (type='npc') are managed in the GM view, not the party board.
  const { data: partyRows } = await supabase
    .from("characters")
    .select("id, name, sheet")
    .eq("campaign_id", campaign.id)
    .eq("type", "pc");
  const party = (partyRows ?? []).map((r) => toGMPartyMember(r as CharacterRow));

  return <GMViewFrame campaign={campaign} party={party} />;
}
