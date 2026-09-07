import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { PARTS } from "@/gamebook/parts";

/* ===========================================================================
   TEMPORARY — gamebook live-edit utility
   ---------------------------------------------------------------------------
   Lets /gamebook/edit read and write the raw content/*.md files straight
   from the browser, so book text can be tweaked and reloaded without an
   editor. Dev-only (refuses to run once NODE_ENV is "production"), and only
   ever touches the exact files PARTS already points at — never an arbitrary
   path off the request.

   Delete this route and src/app/gamebook/edit/ once the utility is no
   longer needed.
   =========================================================================== */

const CONTENT_DIR = path.join(process.cwd(), "src", "gamebook", "content");

function fileForSlug(slug: string | null): string | null {
  if (!slug) return null;
  const part = PARTS.find((p) => p.slug === slug);
  return part ? part.file : null;
}

function guardDev(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "gamebook-edit is a dev-only utility" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: Request) {
  const blocked = guardDev();
  if (blocked) return blocked;

  const slug = new URL(request.url).searchParams.get("part");

  // No ?part — hand back the part list, so the client editor never has to
  // import parts.ts (which pulls in node:fs) into a browser bundle.
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

export async function POST(request: Request) {
  const blocked = guardDev();
  if (blocked) return blocked;

  let body: { part?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const file = fileForSlug(typeof body.part === "string" ? body.part : null);
  if (!file) {
    return NextResponse.json({ error: "unknown part" }, { status: 400 });
  }
  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "text must be a string" }, { status: 400 });
  }

  fs.writeFileSync(path.join(CONTENT_DIR, file), body.text, "utf8");
  return NextResponse.json({ ok: true });
}
