import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Persist a character sheet snapshot. RLS ensures only the owner can write.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { sheet?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const sheet = body?.sheet;
  if (sheet == null || typeof sheet !== "object") {
    return NextResponse.json({ error: "missing sheet" }, { status: 400 });
  }

  // Keep the roster's `name` column in sync with the sheet's character name.
  const character = (sheet as { c?: { name?: unknown } }).c;
  const name =
    character && typeof character.name === "string" ? character.name.trim() : "";

  const update: { sheet: unknown; name?: string } = { sheet };
  if (name) update.name = name;

  const { error } = await supabase
    .from("characters")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
