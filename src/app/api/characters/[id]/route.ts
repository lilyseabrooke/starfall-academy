import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Persist a character sheet snapshot. RLS scopes writes to the character's
// owner or the GM of the campaign it's in (sheet/name only — GMs cannot
// delete a PC; see the "gm updates campaign pc sheets" policy).
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

  // Campaign membership goes through the RPCs so a join links the character to
  // the real campaign + a player membership row (and a code with no matching
  // campaign still records as a legacy code-only group). "" / null leaves.
  if ("campaign_code" in body) {
    const code = body.campaign_code;
    if (code === null || code === "") {
      const { error } = await supabase.rpc("leave_campaign", { p_character: id });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (typeof code === "string" && code.trim()) {
      const { error } = await supabase.rpc("join_campaign", {
        p_code: code.trim(),
        p_character: id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      return NextResponse.json({ error: "invalid campaign_code" }, { status: 400 });
    }
  }

  const update: { sheet?: unknown; name?: string } = {};

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

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("characters").update(update).eq("id", id);
    if (error) {
      console.error("PATCH /api/characters/[id]", error);
      return NextResponse.json({ error: "could not save character" }, { status: 400 });
    }
  } else if (!("campaign_code" in body)) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
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
    console.error("DELETE /api/characters/[id]", error);
    return NextResponse.json({ error: "could not delete character" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
