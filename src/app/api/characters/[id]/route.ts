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

  let body: { sheet?: unknown; campaign_code?: unknown; expectedUpdatedAt?: unknown };
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
    // Optimistic concurrency: a whole-sheet PATCH from a client only reflects
    // that client's in-memory state, which can be stale relative to a GM grant
    // (grant_sheet_field) or another tab's save that landed since this client
    // last synced. Guard the write with the updated_at the client last saw —
    // if the row moved on, reject instead of silently clobbering whatever the
    // other writer just added (see the "characters occasionally lose their
    // spell list" bug).
    const expected = body.expectedUpdatedAt;
    let query = supabase.from("characters").update(update).eq("id", id);
    if (typeof expected === "string" && expected) {
      query = query.eq("updated_at", expected);
    }
    const { data, error } = await query.select("sheet, updated_at");
    if (error) {
      console.error("PATCH /api/characters/[id]", error);
      return NextResponse.json({ error: "could not save character" }, { status: 400 });
    }
    if (typeof expected === "string" && expected && (!data || data.length === 0)) {
      const { data: current, error: fetchError } = await supabase
        .from("characters")
        .select("sheet, updated_at")
        .eq("id", id)
        .single();
      if (fetchError || !current) {
        return NextResponse.json({ error: "could not save character" }, { status: 400 });
      }
      return NextResponse.json(
        { error: "conflict", sheet: current.sheet, updatedAt: current.updated_at },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, updatedAt: data?.[0]?.updated_at });
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
