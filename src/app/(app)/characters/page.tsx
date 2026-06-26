import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RosterList from "./RosterList";
import CampaignsList from "./CampaignsList";

export const metadata = {
  title: "Characters — Starfall Academy",
};

export default async function CharactersPage() {
  const supabase = await createClient();
  // RLS scopes both queries to the signed-in user (owner of characters, GM of
  // campaigns).
  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, type, campaign_code, updated_at")
    .order("updated_at", { ascending: false });
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, code, updated_at")
    .order("updated_at", { ascending: false });

  const hasCharacters = !!characters && characters.length > 0;
  const hasCampaigns = !!campaigns && campaigns.length > 0;

  // Nothing yet → straight to the creator.
  if (!hasCharacters && !hasCampaigns) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-2xl font-semibold">Forge your first character</h1>
        <p className="text-gray-500">
          You don&apos;t have any characters yet. Begin the rite to create one.
        </p>
        <Link
          href="/characters/new"
          className="rounded bg-black px-5 py-2.5 text-white hover:bg-gray-800"
        >
          Create a character
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your characters</h1>
        <Link
          href="/characters/new"
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          New character
        </Link>
      </div>

      {hasCharacters ? (
        <RosterList characters={characters} />
      ) : (
        <p className="text-gray-500">
          You don&apos;t have any characters yet.{" "}
          <Link href="/characters/new" className="text-blue-600 hover:underline">
            Create one
          </Link>
          .
        </p>
      )}

      <CampaignsList campaigns={campaigns ?? []} />
    </main>
  );
}
