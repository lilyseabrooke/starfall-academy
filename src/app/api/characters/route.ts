import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Create a character from a committed sheet (the Forge's "Begin"). Returns the
// new id so the client can navigate to /characters/[id].
export async function POST(request: Request) {
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

  const character = (sheet as { c?: { name?: unknown } }).c;
  const name =
    character && typeof character.name === "string" && character.name.trim()
      ? character.name.trim()
      : "New character";

  const { data, error } = await supabase
    .from("characters")
    .insert({ owner_id: user.id, name, sheet })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "could not create" },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: data.id });
}
