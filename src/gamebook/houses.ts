/* ===========================================================================
   Starfall Academy — the five Houses
   ---------------------------------------------------------------------------
   Ported from the gamebook's House comparison table. Each House also carries
   the anchors for its own chapter and for the region of campus it stands in,
   so the explorer can send a reader straight there instead of making them
   scroll a 20,000-word chapter looking for it.
   =========================================================================== */

export interface HouseDef {
  name: string;
  beast: string;
  founder: string;
  /** Shown under the founder when the full name is a mouthful. */
  founderAka?: string;
  building: string;
  /** The region of campus the House stands in. */
  location: string;
  /** Anchor for that region under The Grounds. */
  locationAnchor: string;
  /** Anchor for the House's own chapter. */
  anchor: string;
  virtues: string[];
  flaws: string[];
  /** Design-system colour family this House reads in. */
  tone: "gold" | "forest" | "crimson" | "plum" | "teal";
}

export const HOUSES: HouseDef[] = [
  {
    name: "Eagle House",
    beast: "The Great Eagle",
    founder: "Silence",
    building: "An imposing castlesque stone building nestled in the heights of Ryker Cliffs",
    location: "Ryker Cliffs",
    locationAnchor: "ryker-cliffs",
    anchor: "eagle-house",
    virtues: ["cunning", "knowledge", "instinct", "scholarship", "sharp senses"],
    flaws: ["standoffish", "calculating"],
    tone: "gold",
  },
  {
    name: "Boar House",
    beast: "The Great Boar",
    founder: "Reginaeus",
    building: "A Tudor-style complex built in among the rich foliage of Amber Woods",
    location: "Amber Woods",
    locationAnchor: "amber-woods",
    anchor: "boar-house",
    virtues: ["bravery", "camaraderie", "honor", "honesty", "trustworthiness", "practicality"],
    flaws: ["resistant to change"],
    tone: "forest",
  },
  {
    name: "Dragon House",
    beast: "The Great Dragon",
    founder: "Isvaldarhyxvynn",
    founderAka: "or just V, for short",
    building: "A great Gothic building set in the stone outcroppings of Jewelstone Hollow",
    location: "Jewelstone Hollow",
    locationAnchor: "jewelstone-hollow",
    anchor: "dragon-house",
    virtues: ["leadership", "ambition", "mental fortitude", "responsibility"],
    flaws: ["domineering"],
    tone: "crimson",
  },
  {
    name: "Scorpion House",
    beast: "The Great Scorpion",
    founder: "Ariin",
    building: "A rich, detailed Art Nouveau complex worked into the beating heart of Starfall Citadel",
    location: "Starfall Citadel",
    locationAnchor: "starfall-citadel",
    anchor: "scorpion-house",
    virtues: ["kindness", "egalitarianism", "trust", "love", "art", "alliance"],
    flaws: ["naive", "overly passive"],
    tone: "plum",
  },
  {
    name: "Dolphin House",
    beast: "The Great Dolphin",
    founder: "Isadora",
    building: "A sleek modern complex overlooking the sapphire blue of Glimmerdeep Lake",
    location: "Glimmerdeep Lake",
    locationAnchor: "glimmerdeep-lake",
    anchor: "dolphin-house",
    virtues: ["cleverness", "social grace", "charm", "wit", "graceful skill"],
    flaws: ["deceptive", "scheming"],
    tone: "teal",
  },
];
