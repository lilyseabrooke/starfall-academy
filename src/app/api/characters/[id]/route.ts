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

  let body: { sheet?: unknown; campaign_code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const update: { sheet?: unknown; name?: string; campaign_code?: string | null } = {};

  if ("sheet" in body) {
    const sheet = body.sheet;
    if (sheet == null || typeof sheet !== "object") {
      return NextResponse.json({ error: "invalid sheet" }, { status: 400 });
    }
    update.sheet = sheet;
    // Keep the roster's `name` column in sync with the sheet's character name.
    const character = (sheet as { c?: { name?: unknown } }).c;
    const name =
      character && typeof character.name === "string" ? character.name.trim() : "";
    if (name) update.name = name;
  }

  // Campaign code: a non-empty string joins/creates a party; "" or null leaves.
  if ("campaign_code" in body) {
    const code = body.campaign_code;
    if (code === null || code === "") {
      update.campaign_code = null;
    } else if (typeof code === "string" && code.trim()) {
      update.campaign_code = code.trim().toUpperCase();
    } else {
      return NextResponse.json({ error: "invalid campaign_code" }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("characters").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// Remove a character (RLS scopes to the owner).
export async function DELETE(
  _request: Request,
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

  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
