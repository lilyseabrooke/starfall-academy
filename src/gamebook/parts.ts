import fs from "node:fs";
import path from "node:path";
import { parseMarkdown, type Block, type Heading } from "./markdown";

/* ===========================================================================
   Starfall Academy — gamebook parts
   ---------------------------------------------------------------------------
   The gamebook is four parts, mirroring the four tabs of the document it
   replaces. The Markdown in ./content is the source of truth — the Google Doc
   it was ported from is retired.

   Content is read synchronously at render time. Per the Next.js caching guide
   ("Working with deterministic operations"), synchronous I/O completes during
   prerendering and its output is baked into the static shell.
   =========================================================================== */

export interface PartMeta {
  slug: string;
  title: string;
  /** Roman numeral shown on the hub and in the rail. */
  numeral: string;
  file: string;
  blurb: string;
}

export const PARTS: PartMeta[] = [
  {
    slug: "character-creation",
    title: "Character Creation",
    numeral: "I",
    file: "01-character-creation.md",
    blurb:
      "Pick a Subject, a Class, and a wand, then spend your starting ranks. Everything you need to bring a student through the gates.",
  },
  {
    slug: "how-to-play",
    title: "How to Play",
    numeral: "II",
    file: "02-how-to-play.md",
    blurb:
      "Rolling and DCs, Action, Conditions, magic, crafting, duels, and the business of getting into — and out of — trouble.",
  },
  {
    slug: "running-your-game",
    title: "Running your Game",
    numeral: "III",
    file: "03-running-your-game.md",
    blurb:
      "For the GM: running roleplay, battle, mystery, dungeons and heists, calling for the right rolls, and setting expectations at your table.",
  },
  {
    slug: "world",
    title: "Deeper into Starfall",
    numeral: "IV",
    file: "04-world.md",
    blurb:
      "The Citadel and its grounds, the five Houses, the Enforcers, the wider magical world, and the subcultures students fall into.",
  },
];

const CONTENT_DIR = path.join(process.cwd(), "src", "gamebook", "content");

function read(file: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
}

export function getPart(slug: string): PartMeta | undefined {
  return PARTS.find((p) => p.slug === slug);
}

export interface LoadedPart {
  meta: PartMeta;
  blocks: Block[];
  headings: Heading[];
}

export function loadPart(slug: string): LoadedPart | null {
  const meta = getPart(slug);
  if (!meta) return null;
  const { blocks, headings } = parseMarkdown(read(meta.file));
  return { meta, blocks, headings };
}

/** The book's opening welcome, shown on the hub. */
export function loadIntro(): Block[] {
  return parseMarkdown(read("00-intro.md")).blocks;
}

/**
 * Every heading in the book, keyed by anchor → the part it lives in.
 * The ported cross-references are bare "#anchor" links, because in the
 * document they all pointed within one file. This is what lets the renderer
 * turn them into real cross-part links.
 */
export function buildAnchorIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const part of PARTS) {
    for (const h of parseMarkdown(read(part.file)).headings) {
      if (!index.has(h.slug)) index.set(h.slug, part.slug);
    }
  }
  return index;
}

/** Headings per part, for the hub's chapter listing. */
export function partChapters(slug: string): Heading[] {
  const meta = getPart(slug);
  if (!meta) return [];
  return parseMarkdown(read(meta.file)).headings.filter((h) => h.level === 2);
}
