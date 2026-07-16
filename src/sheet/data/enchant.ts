/* ===========================================================================
   Starfall Academy — Enchanting rolls
   ---------------------------------------------------------------------------
   How long an enchantment holds, keyed to degrees of success on the
   Enchanting roll. Tweak the tiers here to rebalance — anything past the
   highest listed degree holds at that tier's duration.
   =========================================================================== */

/** The flat material cost offered by default on an Enchanting roll. */
export const ENCHANT_MATERIAL_COST = 100;

export interface EnchantDurationTier {
  degrees: number;
  label: string;
}

export const ENCHANT_DURATIONS: EnchantDurationTier[] = [
  { degrees: 1, label: "1 hour" },
  { degrees: 2, label: "4 hours" },
  { degrees: 3, label: "1 day" },
  { degrees: 4, label: "permanently" },
];

/** The duration label for a given degrees-of-success count (clamped to the top tier). */
export function enchantDurationLabel(degrees: number): string {
  let tier = ENCHANT_DURATIONS[0];
  for (const t of ENCHANT_DURATIONS) {
    if (degrees >= t.degrees) tier = t;
  }
  return tier.label;
}

/** The `hl` text shown under an Enchanting roll's result. */
export function enchantHL(degrees: number, ok: boolean): string {
  return ok
    ? "The enchantment takes hold, lasting " + enchantDurationLabel(degrees) + "."
    : "The enchantment sparks out, burning the materials in the process.";
}
