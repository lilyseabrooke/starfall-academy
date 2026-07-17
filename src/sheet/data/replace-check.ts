/* ===========================================================================
   Starfall Academy — check-replacement matching
   ---------------------------------------------------------------------------
   Some spells can be rolled IN PLACE OF an ordinary check. Spectral Evasion
   (Teleportation), for instance, can stand in for an Agility or Athletics
   check; Timeskipper can stand in for an Athletics check. The database carries
   a "REPLACE CHECK" entry per spell as a raw, comma-separated list, e.g.
   "agility, athletics" or a roll-type token like "enchanting" or
   "artifact-backfire".

   This module is pure: it normalises those author-written tokens and matches
   them against the "check tags" each roll site emits (see CharacterSheet's
   replaceOptionsFor). It knows nothing about React or the roll engine.
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

/** Synonyms folded onto a single canonical token, so an author can write the
 *  natural word ("enchanting") and still match the check's own label
 *  ("Enchantment"). Extend as new roll-types gain replaceable spells. */
const SYNONYMS: Record<string, string> = {
  enchant: "enchant",
  enchanting: "enchant",
  enchantment: "enchant",
};

/** Normalise, then fold through the synonym table. */
function canon(raw: string): string {
  const n = normalize(raw);
  return SYNONYMS[n] || n;
}

/** Parse a spell's raw "REPLACE CHECK" string into canonical tokens. */
export function parseReplaceCheck(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((t) => canon(t))
    .filter(Boolean);
}

/** True when `spell` may stand in for a check carrying any of `checkTags`
 *  (raw identifiers — skill id, stat name, subject key, roll-type, …). */
export function spellReplacesCheck(spell: Spell, checkTags: string[]): boolean {
  const tokens = parseReplaceCheck(spell.replaceCheck);
  if (!tokens.length) return false;
  const tags = new Set(checkTags.map((t) => canon(t)).filter(Boolean));
  return tokens.some((tok) => tags.has(tok));
}

/** The KNOWN spells (days-to-learn cleared) that can replace this check. */
export function matchReplacementSpells(spells: Spell[], checkTags: string[]): Spell[] {
  if (!checkTags.length) return [];
  return spells.filter((sp) => (sp.days || 0) <= 0 && spellReplacesCheck(sp, checkTags));
}

/** A spell's AP cost — from its `ap` field, or parsed out of a "HEX (4AP)"
 *  style level string. Shared with the cast flow so the badge matches the roll. */
export function spellApOf(sp: Spell): number {
  if (sp.ap != null) return sp.ap;
  const m = String(sp.level || "").match(/(\d+)\s*ap/i);
  return m ? parseInt(m[1], 10) || 0 : 0;
}
