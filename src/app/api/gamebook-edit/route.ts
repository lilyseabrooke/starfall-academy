import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PARTS } from "@/gamebook/parts";

/* ===========================================================================
   TEMPORARY — gamebook live-edit utility
   ---------------------------------------------------------------------------
   Read-only support for /gamebook/edit: hands back the part list, and the
   *original* content/*.md text for one part so the editor has a starting
   point before any override exists. This is the same fs read parts.ts
   already does to render the live pages — nothing here is gated, because
   none of it is more sensitive than the book text every visitor already
   reads.

   The actual edits are written to the gamebook_overrides Supabase table
   (see migration gamebook_overrides), not to these files — a deployed
   serverless function can't durably write to its own source. Delete this
   route, src/app/gamebook/edit/, src/gamebook/LiveBlocks.tsx, and the
   gamebook_overrides table once the utility is no longer needed.
   =========================================================================== */

const CONTENT_DIR = path.join(process.cwd(), "src", "gamebook", "content");

function fileForSlug(slug: string | null): string | null {
  if (!slug) return null;
  const part = PARTS.find((p) => p.slug === slug);
  return part ? part.file : null;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("part");

  if (!slug) {
    return NextResponse.json({
      parts: PARTS.map(({ slug, title, numeral }) => ({ slug, title, numeral })),
    });
  }

  const file = fileForSlug(slug);
  if (!file) {
    return NextResponse.json({ error: "unknown part" }, { status: 400 });
  }

  const text = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
  return NextResponse.json({ text });
}
