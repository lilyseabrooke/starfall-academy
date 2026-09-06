/* ===========================================================================
   Starfall Academy — the Stats matrix
   ---------------------------------------------------------------------------
   Ported from the gamebook's Stats table, which the Doc had to print as a
   merged-cell grid. Here it's structured data, so the Stats explorer can also
   answer the question the Doc's layout couldn't: which Stat does a given
   Subject or Skill roll with, and which field of magic does it belong to.
   =========================================================================== */

/** The four groups the 24 Subjects are taught in (the "Fields of Magic" table). */
export const FIELD_GROUPS = {
  "Creation Magics": ["Alchemy", "Artificy", "Enchantment", "Herbalism", "Runology", "Wandcrafting"],
  "Natural Magics": ["Evocation", "Illusion", "Restoration", "Telekinesis", "Transmutation", "Warding"],
  "Spectral Magics": ["Divination", "Chronomancy", "Hypnomancy", "Necromancy", "Summoning", "Teleportation"],
  "Wisdom Magics": ["Arcane History", "Bestiology", "Counterhexology", "Crystallomancy", "Demonology", "Draconology"],
} as const;

export type FieldGroup = keyof typeof FIELD_GROUPS;

export interface StatDef {
  name: string;
  /** Subjects that roll with this Stat. Body and Charm have none. */
  subjects: string[];
  /** Skills that roll with this Stat. */
  skills: string[];
  /** The Condition this Stat resists, or null for Charm. */
  resists: string | null;
  /** One-line gloss — what the Stat is for. */
  blurb: string;
}

export const STATS: StatDef[] = [
  {
    name: "Focus",
    subjects: ["Wandcrafting", "Evocation", "Telekinesis", "Hypnomancy", "Teleportation", "Arcane History"],
    skills: ["Concentration", "Recall Information", "Search", "Willpower"],
    resists: "Doubt",
    blurb: "Precision, attention, and the will to hold a spell steady.",
  },
  {
    name: "Creativity",
    subjects: ["Alchemy", "Artificy", "Enchantment", "Illusion", "Transmutation", "Summoning"],
    skills: ["Art", "Hide Object", "Improvise", "Sleight of Hand"],
    resists: "Loss",
    blurb: "Invention and craft — making something that wasn't there before.",
  },
  {
    name: "Logic",
    subjects: ["Runology", "Warding", "Necromancy", "Counterhexology", "Crystallomancy", "Demonology"],
    skills: ["Analyze", "Comprehend", "Research", "Tracking"],
    resists: "Fear",
    blurb: "Structure and deduction — magic that obeys rules you can read.",
  },
  {
    name: "Insight",
    subjects: ["Herbalism", "Restoration", "Chronomancy", "Divination", "Bestiology", "Draconology"],
    skills: ["Creature", "Investigate", "Perception", "Read Person"],
    resists: "Despair",
    blurb: "Perception and intuition — reading people, creatures, and omens.",
  },
  {
    name: "Body",
    subjects: [],
    skills: ["Agility", "Athletics", "Endurance", "Stealth"],
    resists: "Wound",
    blurb: "Physical capability. No Subject rolls with Body.",
  },
  {
    name: "Charm",
    subjects: [],
    skills: ["Deception", "Persuasion", "Tact", "Win Over"],
    resists: null,
    blurb: "Social force. No Subject rolls with Charm, and it resists no Condition.",
  },
];

/** Subject → the field of magic it's taught under. */
export const SUBJECT_FIELD: Record<string, FieldGroup> = Object.fromEntries(
  (Object.entries(FIELD_GROUPS) as [FieldGroup, readonly string[]][]).flatMap(
    ([group, subjects]) => subjects.map((s) => [s, group] as const)
  )
);

/** Ability (Subject or Skill) → the Stat it rolls with. */
export const ABILITY_STAT: Record<string, string> = Object.fromEntries(
  STATS.flatMap((s) => [...s.subjects, ...s.skills].map((a) => [a, s.name] as const))
);
