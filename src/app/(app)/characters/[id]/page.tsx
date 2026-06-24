import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toRosterMember, type CharacterRow, type RosterMember } from "../roster";
import CharacterSheetFrame from "./CharacterSheetFrame";

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
  if (!user) redirect("/login");

  // RLS guarantees this only returns a row the user owns.
  const { data: character, error } = await supabase
    .from("characters")
    .select("id, name, sheet, campaign_code")
    .eq("id", id)
    .single();

  if (error || !character) notFound();

  // Party = the user's characters that share this one's campaign code.
  let roster: RosterMember[];
  if (character.campaign_code) {
    const { data: party } = await supabase
      .from("characters")
      .select("id, name, sheet")
      .eq("campaign_code", character.campaign_code);
    roster = (party ?? []).map((p) => toRosterMember(p as CharacterRow, character.id));
  } else {
    roster = [toRosterMember(character as CharacterRow, character.id)];
  }

  return (
    <CharacterSheetFrame
      mode="edit"
      id={character.id}
      initialSheet={character.sheet}
      roster={roster}
      me={character.id}
    />
  );
}
