import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Create a character from a committed sheet (the Forge's "Begin"), or — with
// npcCampaignId — a GM-only NPC in that campaign. Returns the
// new id so the client can navigate to /characters/[id].
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { sheet?: unknown; npcCampaignId?: unknown };
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

  // An NPC is a character row the GM owns inside a campaign they run — never
  // a player's. RLS only checks the row's own shape, so GM ownership of the
  // target campaign is verified here.
  let npc: { type: "npc"; campaign_id: string } | null = null;
  if (body.npcCampaignId != null) {
    if (typeof body.npcCampaignId !== "string") {
      return NextResponse.json({ error: "invalid npcCampaignId" }, { status: 400 });
    }
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", body.npcCampaignId)
      .eq("gm_id", user.id)
      .maybeSingle();
    if (!campaign) {
      return NextResponse.json({ error: "not the GM of this campaign" }, { status: 403 });
    }
    npc = { type: "npc", campaign_id: campaign.id };
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({ owner_id: user.id, name, sheet, ...npc })
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
