/* ===========================================================================
   Starfall Academy — check-replacement matching
   ---------------------------------------------------------------------------
   Some spells can be rolled IN PLACE OF another check. Spectral Evasion
   (Teleportation) can stand in for an Agility or Athletics check; a spell
   might instead replace a whole roll-TYPE — an Action roll, a Resist, an
   Artificy backfire save, and so on. The roll-types are exactly the ones the
   New Bonus modal lists (see data/bonus.ts `TYPES`), minus the three that
   can't be replacement targets: "a specific spell" / "a specific move" (those
   are bonus references, not roll-types) and "spell rolls" (a spell replacing
   any spell roll would loop forever). Those simply have no wired check site.

   The database carries a "REPLACE CHECK" entry per spell — a comma-separated
   list of tokens. A token is a base name, optionally narrowed by a
   parenthesised qualifier:

     "agility, athletics"                     — two skill checks
     "action"                                 — the Action roll
     "spell-backfire (evocation)"             — backfires on Evocation spells
     "artificy-backfire (twisted)"            — backfires on twisted artifacts

   This module is pure: it normalises those author-written tokens and matches
   them against the "check tags" (and optional "qualifiers") each roll site
   emits. It knows nothing about React or the roll engine.
   =========================================================================== */
import type { Spell } from "../types";

/** Lower-case, trim, and collapse any run of non-alphanumerics to a single
 *  hyphen so "Artifact Backfire", "artifact_backfire" and "artifact-backfire"
 *  all land on the same key. */
function normalize(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Roll-type spellings folded onto one canonical key, so an author can write
 *  the natural word ("enchanting", "artifact backfire") and still match the
 *  check's own roll-type tag. Words with no entry (skill ids, subject keys,
 *  qualifiers like "evocation") pass through normalized. Canonical keys line
 *  up with the bonus type ids in data/bonus.ts. */
const ROLL_TYPE_ALIASES: Record<string, string> = {
  // Backfire saves
  "spell-backfire": "spellbackfire",
  "spellbackfire": "spellbackfire",
  "artifact-backfire": "artificybackfire",
  "artificy-backfire": "artificybackfire",
  "artificybackfire": "artificybackfire",
  // Enchanting is its own roll-type — NOT a synonym of the Enchantment field.
  "enchanting": "enchant",
  "enchant": "enchant",
  // Other roll-types with natural-language variants
  "attunement": "attune",
  "attune": "attune",
  "improvement": "improve",
  "improve": "improve",
  "spell-learning": "learn",
  "learning": "learn",
  "learn": "learn",
  "metabolise": "metabolize",
  "metabolize": "metabolize",
  "potion-brewing": "brew",
  "brewing": "brew",
  "brew": "brew",
  "wandcrafting": "wandcraft",
  "wandcraft": "wandcraft",
  "rune-creating": "rune",
  "runecraft": "rune",
  "rune": "rune",
  "plant-use": "plantuse",
  "plantuse": "plantuse",
  "artifact-repair": "artifact-repair",
  "repair": "artifact-repair",
  "action": "action",
  "resist": "resist",
};

/** Normalise, then fold roll-type synonyms onto their canonical key. */
export function canon(raw: string): string {
  const n = normalize(raw);
  return ROLL_TYPE_ALIASES[n] || n;
}

/** One parsed "REPLACE CHECK" token: a canonical base, optionally narrowed to
 *  one or more canonical qualifiers ("evocation", "twisted", …). */
export interface ReplaceToken {
  base: string;
  qualifiers: string[];
}

/** Split on commas that are NOT inside parentheses, so a qualifier list like
 *  "spell-backfire (evocation, illusion)" stays a single token. */
function splitTokens(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of raw) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Parse a spell's raw "REPLACE CHECK" string into canonical tokens. */
export function parseReplaceCheck(raw: string | null | undefined): ReplaceToken[] {
  if (!raw) return [];
  const tokens: ReplaceToken[] = [];
  for (const part of splitTokens(String(raw))) {
    const m = part.match(/^([^(]*)(?:\(([^)]*)\))?\s*$/);
    if (!m) continue;
    const base = canon(m[1] || "");
    if (!base) continue;
    const qualifiers = (m[2] || "")
      .split(/[,/]/)
      .map((q) => canon(q))
      .filter(Boolean);
    tokens.push({ base, qualifiers });
  }
  return tokens;
}

/** True when `spell` may stand in for a check carrying any of `tags` (raw
 *  identifiers — skill id, subject key, roll-type, …). A qualified token also
 *  needs one of its qualifiers present in the check's `qualifiers`. */
export function spellReplacesCheck(spell: Spell, tags: string[], qualifiers: string[] = []): boolean {
  const tokens = parseReplaceCheck(spell.replaceCheck);
  if (!tokens.length) return false;
  const tagSet = new Set(tags.map((t) => canon(t)).filter(Boolean));
  const qualSet = new Set(qualifiers.map((q) => canon(q)).filter(Boolean));
  return tokens.some(
    (tok) => tagSet.has(tok.base) && (tok.qualifiers.length === 0 || tok.qualifiers.some((q) => qualSet.has(q)))
  );
}

/** The KNOWN spells (days-to-learn cleared) that can replace this check. */
export function matchReplacementSpells(spells: Spell[], tags: string[], qualifiers: string[] = []): Spell[] {
  if (!tags.length) return [];
  return spells.filter((sp) => (sp.days || 0) <= 0 && spellReplacesCheck(sp, tags, qualifiers));
}

/** A spell's AP cost — from its `ap` field, or parsed out of a "HEX (4AP)"
 *  style level string. Shared with the cast flow so the badge matches the roll. */
export function spellApOf(sp: Spell): number {
  if (sp.ap != null) return sp.ap;
  const m = String(sp.level || "").match(/(\d+)\s*ap/i);
  return m ? parseInt(m[1], 10) || 0 : 0;
}
