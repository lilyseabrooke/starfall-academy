import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Characters — Starfall Academy",
};

// Server action: create a blank character and open its sheet.
async function createCharacter() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("characters")
    .insert({ owner_id: user.id, name: "New character" })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create character");
  redirect(`/characters/${data.id}`);
}

export default async function CharactersPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in owner.
  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, type, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your characters</h1>
        <form action={createCharacter}>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            New character
          </button>
        </form>
      </div>

      {characters && characters.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {characters.map((ch) => (
            <li key={ch.id}>
              <Link
                href={`/characters/${ch.id}`}
                className="flex items-center justify-between rounded border px-4 py-3 hover:bg-gray-50"
              >
                <span className="font-medium">{ch.name || "Unnamed"}</span>
                <span className="text-sm text-gray-500">{ch.type}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">
          No characters yet. Create one to open the sheet.
        </p>
      )}
    </main>
  );
}
