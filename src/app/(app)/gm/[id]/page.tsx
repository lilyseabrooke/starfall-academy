import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toGMPartyMember, type GMRosterRow } from "../../characters/roster";
import { GmView } from "@/sheet/GmView";
import type { GmNote, GmNpc } from "@/sheet/data/gm-seed";

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
  if (!user) redirect("/");

  // RLS lets any campaign member (players included) read this row, so GM
  // ownership has to be checked explicitly here rather than assumed from the
  // query succeeding.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, code, gm_id, npcs")
    .eq("id", id)
    .single();

  if (error || !campaign || campaign.gm_id !== user.id) notFound();

  // The journal is not part of the campaign row's readable columns — players
  // can select that row too, and RLS can't hide a column — so it comes back
  // through a definer function that checks GM ownership itself. (Players read
  // the shared subset through shared_campaign_notes; see the migration.)
  const { data: notes, error: notesError } = await supabase.rpc("gm_campaign_notes", { p_campaign: campaign.id });
  if (notesError) console.error("GM journal load failed", notesError.message);

  // The campaign's player characters (cross-user — RLS lets the GM read members'
  // characters). NPCs (type='npc') are managed in the GM view, not the party board.
  const { data: partyRows } = await supabase
    .from("characters")
    .select("id, name, c:sheet->c, conditions:sheet->conditions")
    .eq("campaign_id", campaign.id)
    .eq("type", "pc");
  const party = (partyRows ?? [])
    .map((r) => toGMPartyMember(r as GMRosterRow))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <GmView
      campaign={campaign}
      party={party}
      npcs={(campaign.npcs as GmNpc[] | null) ?? []}
      notes={(notes as GmNote[] | null) ?? []}
    />
  );
}
