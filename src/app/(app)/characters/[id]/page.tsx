import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, sheet")
    .eq("id", id)
    .single();

  if (error || !character) notFound();

  return <CharacterSheetFrame id={character.id} initialSheet={character.sheet} />;
}
