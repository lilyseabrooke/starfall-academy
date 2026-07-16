import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toRosterMember, type CharacterRow, type RosterMember } from "../roster";
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
    .select("id, name, sheet, campaign_code, campaign_id, updated_at")
    .eq("id", id)
    .single();

  if (error || !character) notFound();

  // Party + realtime channel:
  // - Joined a real campaign (campaign_id) → the whole party, cross-user (RLS
  //   lets campaign-mates read each other) + a shared roll channel.
  // - Legacy code-only group (campaign_code, no campaign) → the user's own
  //   characters sharing that code, no realtime.
  // - Unaffiliated → just this character.
  let roster: RosterMember[];
  let campaignId: string | null = null;
  if (character.campaign_id) {
    campaignId = character.campaign_id;
    const { data: party } = await supabase
      .from("characters")
      .select("id, name, sheet")
      .eq("campaign_id", character.campaign_id);
    roster = (party ?? [])
      .map((p) => toRosterMember(p as CharacterRow, character.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else if (character.campaign_code) {
    const { data: party } = await supabase
      .from("characters")
      .select("id, name, sheet")
      .eq("campaign_code", character.campaign_code);
    roster = (party ?? [])
      .map((p) => toRosterMember(p as CharacterRow, character.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    roster = [toRosterMember(character as CharacterRow, character.id)];
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
    />
  );
}
