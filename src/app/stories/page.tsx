import { createClient } from "@/lib/supabase/server";
import StoriesView, { type StoryCard } from "./StoriesView";

// Not linked from anywhere — reachable only by going straight to /stories.
// Lists user-submitted stories (title + author) as links out to their Google
// Doc. Rows come from the Discord bot via POST /api/stories; this page just
// reads what's there and hands it to the client view for search / sort.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stories — Starfall Academy",
};

type StoryRow = {
  id: string;
  title: string;
  author: string;
  doc_url: string;
  created_at: string;
};

// "Filed 10 Sep 2026" — fixed to UTC so the server render matches the client.
const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// The illuminated capital on each card: the title's first letter, ignoring
// leading quotes / brackets ("The Basilisk Incident" → T).
function initialOf(title: string) {
  const letter = title.trim().replace(/^[^\p{L}\p{N}]+/u, "")[0];
  return (letter || "?").toUpperCase();
}

export default async function StoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("stories")
    .select("id, title, author, doc_url, created_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as StoryRow[];

  // Accession numbers are assigned oldest-first, so a tale keeps the same
  // number as the archive grows — however the reader sorts the shelf.
  const accessions = new Map(
    [...rows]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((row, i) => [row.id, String(i + 1).padStart(3, "0")])
  );

  const stories: StoryCard[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    docUrl: row.doc_url,
    createdAt: row.created_at,
    dateLabel: DATE_FMT.format(new Date(row.created_at)),
    accession: accessions.get(row.id) ?? "000",
    initial: initialOf(row.title),
  }));

  return (
    <StoriesView stories={stories} failed={!!error} signedIn={!!user} />
  );
}
