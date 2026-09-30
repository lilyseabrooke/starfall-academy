import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toRosterMember, type RosterRow, type RosterMember } from "../roster";
import { CharacterSheet } from "@/sheet/CharacterSheet";
import type { SerializedSheet } from "@/sheet/types";

export default async function CharacterSheetPage({
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

  // RLS returns this row if the user owns it, or is a campaign-mate/GM of the
  // campaign it's in (party-wide read access); writes stay owner/GM-scoped.
  const { data: character, error } = await supabase
    .from("characters")
    .select("id, name, sheet, type, campaign_code, campaign_id, owner_id, updated_at")
    .eq("id", id)
    .single();

  if (error || !character) notFound();

  // Party + realtime channel:
  // - Joined a real campaign (campaign_id) → the whole party, cross-user (RLS
  //   lets campaign-mates read each other) + a shared roll channel.
  // - Legacy code-only group (campaign_code, no campaign) → the user's own
  //   characters sharing that code, no realtime.
  // - Unaffiliated → just this character.
  // - An NPC (type='npc', GM-only by RLS) shows the party as its roster.
  // - The campaign's GM also gets its NPCs, for the side rail's NPC category.
  const isNpc = character.type === "npc";
  let roster: RosterMember[];
  let campaignId: string | null = null;
  let gmNpc: { campaignId: string; npcs: RosterMember[] } | null = null;
  if (character.campaign_id) {
    campaignId = character.campaign_id;
    // Only player characters make up the party — the GM can read NPC rows too.
    const { data: party } = await supabase
      .from("characters")
      .select("id, name, c:sheet->c")
      .eq("campaign_id", character.campaign_id)
      .eq("type", "pc");
    roster = (party ?? [])
      .map((p) => toRosterMember(p as RosterRow, character.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("gm_id")
      .eq("id", character.campaign_id)
      .maybeSingle();
    if (campaign?.gm_id === user.id) {
      const { data: npcRows } = await supabase
        .from("characters")
        .select("id, name, c:sheet->c")
        .eq("campaign_id", character.campaign_id)
        .eq("type", "npc");
      gmNpc = {
        campaignId: character.campaign_id,
        npcs: (npcRows ?? [])
          .map((p) => toRosterMember(p as RosterRow, character.id))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    }
  } else if (character.campaign_code) {
    const { data: party } = await supabase
      .from("characters")
      .select("id, name, c:sheet->c")
      .eq("campaign_code", character.campaign_code);
    roster = (party ?? [])
      .map((p) => toRosterMember(p as RosterRow, character.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const c = (character.sheet as { c?: unknown } | null)?.c;
    roster = [toRosterMember({ id: character.id, name: character.name, c }, character.id)];
  }

  return (
    <CharacterSheet
      mode="edit"
      id={character.id}
      initialSheet={character.sheet as SerializedSheet | null}
      initialUpdatedAt={character.updated_at as string}
      roster={roster}
      me={character.id}
      campaignId={campaignId}
      ownsSheet={character.owner_id === user.id}
      isNpc={isNpc}
      gmNpc={gmNpc}
    />
  );
}
