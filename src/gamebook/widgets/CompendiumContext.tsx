"use client";

import * as React from "react";
import { useCompendium, type UseCompendium } from "@/sheet/data/compendium";
import type { CompendiumEntry } from "@/sheet/types";

/* ===========================================================================
   Compendium cross-linking
   ---------------------------------------------------------------------------
   The gamebook names hundreds of spells, wands, potions and artifacts that the
   Compendium already holds live data for. Rather than annotate 61,000 words by
   hand, the prose is scanned in the browser against the loaded Compendium and
   matching names become cards.

   Matching is deliberately conservative — see LINKABLE_CATS and STOPLIST. The
   rules vocabulary collides with ordinary English ("Search", "Art", "Focus"),
   and a wrong link in a rulebook is worse than a missing one.
   =========================================================================== */

/** Only these categories are real "things" a reader would want to look up. */
const LINKABLE_CATS = new Set(["spell", "potion", "wand", "artifact", "glyph", "plant", "item"]);

/**
 * Names that also occur as ordinary words or as rules vocabulary (Stats,
 * Skills, Subjects). Linking these would pepper the rules text with cards
 * pointing at the wrong thing.
 */
const STOPLIST = new Set(
  [
    // Stats
    "Focus", "Creativity", "Logic", "Insight", "Body", "Charm",
    // Skills
    "Concentration", "Recall Information", "Recall Info", "Search", "Willpower",
    "Art", "Hide Object", "Improvise", "Sleight of Hand", "Analyze", "Comprehend",
    "Research", "Tracking", "Creature", "Investigate", "Perception", "Read Person",
    "Agility", "Athletics", "Endurance", "Stealth", "Deception", "Persuasion",
    "Tact", "Win Over",
    // Subjects
    "Alchemy", "Artificy", "Enchantment", "Herbalism", "Runology", "Wandcrafting",
    "Evocation", "Illusion", "Restoration", "Telekinesis", "Transmutation", "Warding",
    "Divination", "Chronomancy", "Hypnomancy", "Necromancy", "Summoning",
    "Teleportation", "Arcane History", "Bestiology", "Counterhexology",
    "Crystallomancy", "Demonology", "Draconology",
    // Common nouns that appear as entry names
    "Wand", "Potion", "Materials", "Rune", "Glyph", "Spell", "Ritual", "Hex",
  ].map((s) => s.toLowerCase())
);

export interface CompendiumIndex {
  /** Lower-cased name → entry. */
  byName: Map<string, CompendiumEntry>;
  /** One alternation matching every linkable name, longest first. */
  matcher: RegExp | null;
  ready: boolean;
  live: boolean;
}

const Ctx = React.createContext<CompendiumIndex>({
  byName: new Map(),
  matcher: null,
  ready: false,
  live: false,
});

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIndex(data: UseCompendium): CompendiumIndex {
  const byName = new Map<string, CompendiumEntry>();

  for (const entry of data.compendium) {
    if (!LINKABLE_CATS.has(entry.cat)) continue;
    const name = entry.name?.trim();
    if (!name || name.length < 4) continue;
    if (STOPLIST.has(name.toLowerCase())) continue;
    // Prefer the first entry for a name; the sheet can carry near-duplicates.
    if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), entry);
  }

  const names = [...byName.values()]
    .map((e) => e.name.trim())
    .sort((a, b) => b.length - a.length);

  // Case-insensitive because the live workbook stores names in caps
  // ("SYLENE'S CRYSTAL") while the prose writes them in title case. The
  // capitalisation test that keeps this honest is in isReference() below.
  const matcher = names.length
    ? new RegExp(`\\b(${names.map(escapeRe).join("|")})\\b`, "gi")
    : null;

  return { byName, matcher, ready: data.ready, live: data.live };
}

export function CompendiumProvider({ children }: { children: React.ReactNode }) {
  const data = useCompendium();
  const index = React.useMemo(() => buildIndex(data), [data]);
  return <Ctx.Provider value={index}>{children}</Ctx.Provider>;
}

export function useCompendiumIndex(): CompendiumIndex {
  return React.useContext(Ctx);
}

/**
 * Whether an occurrence in the prose is really naming the entry.
 *
 * Many entry names are also ordinary words — there are spells called Light,
 * Sleep, Barrier, Flight and Slow. The rulebook consistently capitalises a
 * name when it means the thing ("cast Levitate", "Elery's Cannon") and leaves
 * it lower-case when it means the word ("a pale light", "you fall asleep"), so
 * requiring a capital is what separates the two.
 *
 * The known false positive is a common word that happens to open a sentence.
 */
export function isReference(match: string): boolean {
  const first = match[0];
  return first === first.toUpperCase() && first !== first.toLowerCase();
}
