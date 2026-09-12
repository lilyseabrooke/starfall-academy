import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Public read: backs the (unlinked) /stories page, and is available directly
// for the Discord bot or anything else that wants the current catalogue.
// RLS already scopes this to public rows, so the normal (anon-capable)
// server client is enough — no service role needed for reads.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, author, doc_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/stories", error);
    return NextResponse.json({ error: "could not load stories" }, { status: 500 });
  }

  return NextResponse.json({ stories: data });
}

// Submission endpoint for the Discord bot: a member runs a command in the
// server, the bot collects title/author/doc link, and posts it here. There's
// no per-user auth on this route (Discord users aren't Supabase users) — it's
// gated by a shared secret the bot holds, and writes via the service_role
// client since RLS grants no insert path to anon/authenticated.
export async function POST(request: Request) {
  const expected = process.env.STORIES_BOT_SECRET;
  if (!expected) {
    console.error("POST /api/stories: STORIES_BOT_SECRET is not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    // TEMPORARY — debugging a STORIES_BOT_SECRET mismatch with the bot.
    // Never logs either full secret: just enough (length, masked preview,
    // whitespace) to compare the two sides. Remove once the 401 is sorted.
    const received = auth?.replace(/^Bearer /, "") ?? "";
    const describe = (s: string) => ({
      length: s.length,
      preview: s.length >= 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : "(too short to preview safely)",
      hasLeadingWhitespace: /^\s/.test(s),
      hasTrailingWhitespace: /\s$/.test(s),
    });
    console.error(
      "POST /api/stories: secret mismatch",
      JSON.stringify({ expected: describe(expected), received: describe(received) })
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown; author?: unknown; docUrl?: unknown; discordUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const author = typeof body.author === "string" ? body.author.trim().slice(0, 120) : "";
  const docUrl = typeof body.docUrl === "string" ? body.docUrl.trim() : "";
  const discordUserId =
    typeof body.discordUserId === "string" ? body.discordUserId.trim().slice(0, 32) : null;

  if (!title || !author || !docUrl) {
    return NextResponse.json({ error: "title, author, and docUrl are required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(docUrl);
  } catch {
    return NextResponse.json({ error: "docUrl must be a valid URL" }, { status: 400 });
  }
  if (parsed.hostname !== "docs.google.com") {
    return NextResponse.json({ error: "docUrl must be a docs.google.com link" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({ title, author, doc_url: docUrl, discord_user_id: discordUserId })
    .select("id, title, author, doc_url, created_at")
    .single();

  if (error) {
    console.error("POST /api/stories", error);
    return NextResponse.json({ error: "could not save story" }, { status: 500 });
  }

  return NextResponse.json({ story: data }, { status: 201 });
}
