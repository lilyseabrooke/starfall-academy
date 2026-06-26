import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Short, human-typeable campaign code (matches the player join-code format in
// RosterList). Players join a campaign by entering this on a character.
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
}

// Create a campaign the signed-in user runs as GM. Returns the new id so the
// client can navigate to /gm/[id].
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : "New campaign";

  // Retry on the (vanishingly rare) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ gm_id: user.id, name, code: makeCode() })
      .select("id")
      .single();

    if (!error && data) return NextResponse.json({ id: data.id });
    // 23505 = unique_violation (code already taken) — try a fresh code.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "could not create" }, { status: 400 });
}
