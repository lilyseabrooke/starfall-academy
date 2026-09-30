/* ===========================================================================
   Starfall Academy — "conjuring" lines
   ---------------------------------------------------------------------------
   Shown on the cover screen while a quick random NPC is built and saved. One
   is picked per NPC; {name} is replaced with the NPC's name.
   =========================================================================== */
export const NPC_CONJURE_PHRASES = [
  "Conjuring {name}",
  "Summoning {name}",
  "Casting ‘Summon {name}’",
  "Dragging {name} out of the demonic realm",
  "Hauling {name} out of a classroom",
  "Wyvern cars are transporting {name}",
  "Constructing {name}",
  "Fishing {name} out of a scrap heap",
  "Searching the Underbelly for {name}",
  "{name} is riding in on a wyvern",
  "Hoping {name} isn’t under Nondetection",
  "Sending black-clawed walkers to find {name}",
  "Combing the ley lines for {name}",
  "Ordering gyros for {name}",
  "Dreamcreeping on {name}",
  "Forcibly teleporting {name}",
];

export const pickConjurePhrase = (): string => NPC_CONJURE_PHRASES[Math.floor(Math.random() * NPC_CONJURE_PHRASES.length)];
