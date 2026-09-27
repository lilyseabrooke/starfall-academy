import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Short, human-typeable campaign code (matches the player join-code format in
// RosterList / POST /api/campaigns).
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
}

// Rename a campaign and/or roll it a new join code (RLS scopes to the GM).
// Regenerating the code only changes the row players look up when joining —
// characters already seated link via campaign_id/campaign_members, so
// existing members are unaffected and only the old code stops working.
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

  let body: { name?: unknown; regenerate_code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const update: { name?: string; code?: string } = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "invalid name" }, { status: 400 });
    }
    update.name = body.name.trim().slice(0, 120);
  }

  if (body.regenerate_code) {
    // Retry on the (vanishingly rare) unique-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { error } = await supabase
        .from("campaigns")
        .update({ ...update, code })
        .eq("id", id)
        .select("id")
        .single();
      if (!error) {
        return NextResponse.json({ ok: true, code });
      }
      if (error.code !== "23505") {
        console.error("PATCH /api/campaigns/[id]", error);
        return NextResponse.json(
          { error: "could not change join code" },
          { status: 400 }
        );
      }
    }
    return NextResponse.json({ error: "could not change join code" }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("campaigns").update(update).eq("id", id);

  if (error) {
    console.error("PATCH /api/campaigns/[id]", error);
    return NextResponse.json({ error: "could not rename campaign" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// Remove a campaign (RLS scopes to the GM).
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

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) {
    console.error("DELETE /api/campaigns/[id]", error);
    return NextResponse.json({ error: "could not delete campaign" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
