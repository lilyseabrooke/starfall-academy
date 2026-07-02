import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toGMPartyMember, type CharacterRow } from "../../characters/roster";
import { GmView } from "@/sheet/GmView";

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

  // RLS lets any campaign member (players included) read this row, so GM
  // ownership has to be checked explicitly here rather than assumed from the
  // query succeeding.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, code, gm_id")
    .eq("id", id)
    .single();

  if (error || !campaign || campaign.gm_id !== user.id) notFound();

  // The campaign's player characters (cross-user — RLS lets the GM read members'
  // characters). NPCs (type='npc') are managed in the GM view, not the party board.
  const { data: partyRows } = await supabase
    .from("characters")
    .select("id, name, sheet")
    .eq("campaign_id", campaign.id)
    .eq("type", "pc");
  const party = (partyRows ?? []).map((r) => toGMPartyMember(r as CharacterRow));

  return <GmView campaign={campaign} party={party} />;
}
