/* ===========================================================================
   Starfall Academy — who is speaking in an example of play
   ---------------------------------------------------------------------------
   The examples run on a small standing cast: Helena behind the screen, and
   Kayla, Ava and Ahmed playing Maya, Finn and Carlos. Colour is what tells
   them apart, so it has to hold still — a reader who learns that Kayla is the
   teal one in the first example should find her teal in the ninth.

   So the assignment is made once per page, in order of first appearance
   across every transcript on it, rather than per transcript. The GM is always
   gold, and keeps that gold in the scenes where she is playing an NPC.
   =========================================================================== */
import type { Block } from "./markdown";

export type Tone = "gm" | "teal" | "plum" | "crimson" | "forest";

/** The colours the players draw from, in the order they are handed out. */
const PLAYER_TONES: Tone[] = ["teal", "plum", "forest", "crimson"];

export interface Cast {
  tone: Record<string, Tone>;
  gm: Record<string, boolean>;
}

const isGM = (character: string | null) => !!character && /\bGM\b|Game Master/i.test(character);

/** Initials for the speaker's token — one letter is plenty for this cast. */
export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export function buildCast(blocks: Block[]): Cast {
  const order: string[] = [];
  const gm: Record<string, boolean> = {};

  for (const block of blocks) {
    if (block.kind !== "dialog") continue;
    for (const entry of block.entries) {
      if (entry.kind !== "line" || !entry.speaker) continue;
      if (isGM(entry.character)) gm[entry.speaker] = true;
      if (!order.includes(entry.speaker)) order.push(entry.speaker);
    }
  }

  // Hand out colours in first-appearance order, skipping whoever runs the game.
  const tone: Record<string, Tone> = {};
  let i = 0;
  for (const speaker of order) {
    tone[speaker] = gm[speaker] ? "gm" : PLAYER_TONES[i++ % PLAYER_TONES.length];
  }

  return { tone, gm };
}
