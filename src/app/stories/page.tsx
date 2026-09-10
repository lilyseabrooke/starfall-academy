import { createClient } from "@/lib/supabase/server";

// Not linked from anywhere yet — reachable only by going straight to
// /stories. Lists user-submitted stories (title + author) as buttons out to
// their Google Doc. Rows come from the Discord bot via POST /api/stories;
// this page just reads what's there. UI is a placeholder pending a real pass.
export const dynamic = "force-dynamic";

type Story = {
  id: string;
  title: string;
  author: string;
  doc_url: string;
};

export default async function StoriesPage() {
  const supabase = await createClient();
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, title, author, doc_url")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Stories</h1>

      {error && <p className="text-red-600">Couldn&apos;t load stories.</p>}

      {!error && stories?.length === 0 && (
        <p className="text-gray-500">No stories submitted yet.</p>
      )}

      <ul className="flex flex-col gap-2">
        {stories?.map((story: Story) => (
          <li key={story.id}>
            <a
              href={story.doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded border border-gray-300 px-4 py-3 hover:bg-gray-50"
            >
              <div className="font-medium">{story.title}</div>
              <div className="text-sm text-gray-500">by {story.author}</div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
