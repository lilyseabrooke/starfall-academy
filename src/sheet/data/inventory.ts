/* ===========================================================================
   Starfall Academy — satchel / inventory seed data + rules constants
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/inventory.js (window.SF_INV). The owned
   inventory seed plus the limit/repair rule tables. Linked Moves (on artifacts)
   and Bonuses (on wands) are defined inline; attuning/equipping surfaces them
   on the Overview.
   =========================================================================== */
import type { Artifact, Glyph, Item, Plant, Potion, Recipe, Wand } from "../types";

export interface RepairSpec {
  label: string;
  time: { damaged: string; broken: string };
  dc: { damaged: number; broken: number };
}

export interface InventoryRules {
  /** Attunement cap: 3 baseline + 1 per 5 ranks of Artificy. */
  attuneCap: (artificyRank: number) => number;
  /** Plants: total Material value must not exceed 50 × Herbalism ranks. */
  plantCap: (herbalismRank: number) => number;
  potionCap: number;
  /** Degrees-of-failure (negative key) → how much intensity eases next attempt. */
  attuneEase: Record<string, number>;
  repair: Record<"fast" | "medium" | "slow", RepairSpec>;
  repairOrder: Array<"fast" | "medium" | "slow">;
  artifacts: Artifact[];
  potions: Potion[];
  recipes: Recipe[];
  plants: Plant[];
  wands: Wand[];
  glyphs: Glyph[];
  items: Item[];
}

export const INV: InventoryRules = {
  attuneCap: (artificyRank) => 3 + Math.floor((artificyRank || 0) / 5),
  plantCap: (herbalismRank) => 50 * (herbalismRank || 0),
  potionCap: 6,

  attuneEase: { "-1": -5, "-2": -3, "-3": -3, "-4": -2, "-5": -2, "-6": -1, "-7": -1, "-8": -1, "-9": -1, "-10": 0, "-11": 1 },

  repair: {
    fast: { label: "Fast", time: { damaged: "1 hour", broken: "12 hours" }, dc: { damaged: 23, broken: 28 } },
    medium: { label: "Medium", time: { damaged: "4 hours", broken: "24 hours" }, dc: { damaged: 18, broken: 23 } },
    slow: { label: "Slow", time: { damaged: "8 hours", broken: "48 hours" }, dc: { damaged: 12, broken: 18 } },
  },
  repairOrder: ["fast", "medium", "slow"],

  artifacts: [
    { id: "art-golem-crown", name: "Golem's Crown", level: "Basic", tone: "forest",
      subject: "Runology", intensity: 0, attuned: true, condition: "stable",
      skills: ["Endurance"], dc: 5,
      desc: "A thin, brassy diadem lined with intricate runes, and a clear band running through the middle that lights up with a liquid gold glow when activated. Touch the Crown and roll Endurance, DC5, after which time it activates for 30 seconds per degree of success, flooding your body with the resolute force of a stone golem. While active, you are immune to Doubt, and you can move at twice your normal speed, and if you are moving at top speed, you become encased with a spectral golden barrier covered with runes that protect you from anything in front of you. Any physical object will not harm you, and any spell must beat your artifact check + 10 in order to get through the barrier, ending the artifact effect early if it does. The artifact becomes inert for an hour afterwards, unable to be activated again.",
      move: { stat: "Body", skill: "Endurance", bonus: 3, dc: 5,
        success: "The Crown answers — 30 seconds of golem-force per degree, warded against all that comes at you head-on.",
        fail: "The runes stay dark; the Crown sleeps a while longer." } },
    { id: "art-creeping-shadow", name: "Creeping Shadow", level: "Basic", tone: "forest",
      subject: "Illusion", intensity: 0, attuned: true, condition: "stable",
      skills: ["Concentration"], dc: 10,
      desc: "A pair of stylish black lace gloves with tiny runes woven into the fingertips. If you stand still in one place for 5 minutes, then at the end of that time, you can roll Concentration, DC10 and become invisible for one minute per degree of success, as long as you continue holding still. You can repeat the roll at the end of the time period to remain invisible, but if you backfire, you become briefly visible.",
      move: { stat: "Focus", skill: "Concentration", bonus: 2, dc: 10,
        success: "You melt from sight; stay still and the shadow holds.",
        fail: "The gloves flicker, and for a moment anyone might see you." } },
    { id: "art-wandmaster-eye", name: "Wandmaster's Eye", level: "Basic", tone: "forest",
      subject: "Wandcrafting", intensity: 29, attuned: false, condition: "stable",
      skills: ["Read Person"], dc: 15,
      desc: "An intricate, finely designed frame worn along one ear and over one eye, with a ring of solid lunar platinum in it. While this artifact is equipped, you can take a +2 to Wandcrafting, and you can roll Read Person, DC15 to glean one piece of information per degree of success about a person whose wand you can see. You can't choose what kind of information it is you get, so sometimes you will get information that you don't want to know.",
      move: { stat: "Insight", skill: "Read Person", bonus: 2, dc: 15,
        success: "The lens reads true: a fact per degree about the wand's bearer.",
        fail: "The frame clouds; you glean nothing but your own reflection." } },
    { id: "art-silver-mirror", name: "Silver Water Mirror", level: "Advanced", tone: "plum",
      subject: "Illusion", intensity: 64, attuned: false, condition: "damaged",
      skills: ["Analyze", "Read Person"], dc: 23,
      desc: "A ring of lunar silver with a spectral mirror in the middle that seems to ripple like water. While this artifact is active, you can cast the spell Second Self as a Basic spell, whether you know it or not. You can hold the ring up to capture somebody's reflection, lighting up stars and galaxies along the outer ring, and roll Analyze or Read Person, DC23. On success, you store a likeness of the target person in the Mirror, and any time you use the artifact's ability to cast Second Self, you can expend one captured likeness to summon a spectral copy of that person. You can choose for the copy to follow your directions or to behave with the original target's personality and mannerisms, to help it potentially pass as the target. Depending on how guarded the target is and how many degrees of success you got on your artifact activation roll, the GM may decide the spectral copy has information the target has, as well. Good to let you hang out with your unattainable K-Pop idol crush.",
      move: { stat: "Logic", skill: "Analyze", bonus: 3, dc: 23,
        success: "The mirror keeps the likeness — call up a convincing double at will.",
        fail: "The water ripples and forgets; the reflection slips away." } },
    { id: "art-dragon-nail", name: "Nail of the Great Dragon", level: "Advanced", tone: "plum",
      subject: "Draconology", intensity: 60, attuned: false, condition: "broken",
      skills: ["Willpower", "Win Over"], dc: 20,
      desc: "An ornate, twisted bolt from the same metal as the great magic vault that once sealed away the Great Dragon of Starfall Academy, the seal whose shattering represents the truce between humans and dragons. While this artifact is equipped, draconic creatures will not be hostile to you without some particular grievance against you specifically, and you can make Charm checks on any draconic creature as on a person. You can activate it in the presence of a draconic creature and roll Willpower or Win Over, DC20, and if the creature is hostile to you, it will become neutral, and if the creature is not hostile, you can forge a telepathic bond between you and the draconic creature that persists over any distance on the same plane, although it can be broken at any point either you or the creature desires to break it. When you have a link to a draconic creature, take a +6 to Charm checks against it.",
      move: { stat: "Focus", skill: "Willpower", bonus: 4, dc: 20,
        success: "The Nail holds: a hostile dragon turns neutral, or a willing one bonds to your mind.",
        fail: "The bolt stays cold, and the creature takes your measure." } },
  ],

  potions: [
    { id: "pot-steady-1", name: "Draught of Steady Hands", tone: "teal", intensity: 4, qty: 2, recipeId: "rec-steady",
      desc: "For one scene, add +2 to Agility and Sleight of Hand rolls. The examiners frown on it during practicals." },
    { id: "pot-moon-1", name: "Moonpetal Tonic", tone: "plum", intensity: 6, qty: 1, recipeId: "rec-moon",
      desc: "Restores one point of Resolve when taken under open sky." },
  ],

  recipes: [
    { id: "rec-steady", name: "Draught of Steady Hands", tone: "teal", intensity: 4, cost: 40,
      desc: "For one scene, add +2 to Agility and Sleight of Hand rolls. The examiners frown on it during practicals." },
    { id: "rec-moon", name: "Moonpetal Tonic", tone: "plum", intensity: 6, cost: 120,
      desc: "Restores one point of Resolve when taken under open sky." },
    { id: "rec-nightcap", name: "Nightcap Elixir", tone: "forest", intensity: 3, cost: 30,
      desc: "A dreamless hour of true rest in a single swallow. Favoured before examinations and after them." },
  ],

  plants: [
    { id: "plant_2SPm9YCQTT96Y", name: "GLOOMLEAF", tone: "plum", value: 100, intensity: 15, used: false, removeOnUse: false, requiresRoll: "YES",
      desc: "A plant with long, drooping, faded green leaves that have striking white lines along them, giving the appearance of a skeleton. The plant grows around a center bud that blossoms a brilliant violet flower, but the flower releases a burst of poison gas when touched.",
      ability: "Once per day, you can harvest the plant’s natural poisons to obtain a Blackblood Brew poison." },
    { id: "plant_24VD7XgqQgCxIF", name: "PERFECT PRINCESS", tone: "gold", value: 200, intensity: 12, used: false, removeOnUse: false, requiresRoll: "BONUS (Win Over; +2)",
      desc: "A pretty peach-pink blossoming flower that shimmers with fey magic that makes them irresistibly charming. So named because they’re just so magically charming, how can you not think it’s a perfect princess? I mean, look at it. I kind of want to take one with me now. I probably have room for one.",
      ability: "You can bring this plant with you. When you do, you can take a +2 to Win Over checks." },
    { id: "plant_4mv4zIsJ3KXiJ", name: "GALYR’S TOOTH", tone: "teal", value: 100, intensity: 11, used: false, removeOnUse: true, requiresRoll: "NO",
      desc: "A ghostly-white plant that hangs along the tops of rocky walls, with long fanglike leaves that droop down. The favorite snack of cave beaks, they have gentle restorative properties, but only if crushed.",
      ability: "You can consume this plant to restore a stack of any condition you choose. This does not require a roll." },
    { id: "plant_28UpTw9XFbdQtd", name: "WALL WALKER", tone: "forest", value: 150, intensity: 16, used: false, removeOnUse: false, requiresRoll: "ABILITY",
      desc: "A black, spindly plant that covers a wall and slowly creeps along it. It’s actually very friendly and loves people, but it doesn’t understand how to be friendly with people, so it typically ensnares them and crushes them trying to give them hugs.",
      ability: "You can bring this plant with you. While you have it with you, you can climb along walls and ceilings as easily as if you’re walking normally." },
    { id: "plant_13Y3PHi9cA2NkB", name: "NARA’S DEATH ROSE", tone: "crimson", value: 150, intensity: 13, used: false, removeOnUse: false, requiresRoll: "CHOOSE",
      desc: "A black-and-white rose-like flower with drooping petals and striking coloration. You can pluck a petal, which will make it spill a red fluid like blood. Despite how deeply gothic this flower is, it actually has restorative powers and the fluid is a sweet sap that tastes like marshmallow.",
      ability: "Once per day, you can draw out the fluid and take it to gain the effects of the Sate spell. You can choose to either take one degree of success without rolling or roll to get as many degrees of success on the Sate effect as you get on the roll, but if you fail the roll, the plant is destroyed." },
    { id: "plant_27lBCa0xcwg1Vi", name: "EIRLYS’ SILVER BLOOM", tone: "teal", value: 150, intensity: 10, used: false, removeOnUse: false, requiresRoll: "MOVE",
      desc: "A beautiful shimmering silvery flower that’s icy-cold to the touch, with an aura of wintry silence close to it. It carries natural evocation magics that tap into frost and ice magic, which means really, really fancy bars will drop an Eirlys petal into your drink to keep it cool, which is probably doing too much, but power to them.",
      ability: "You can bring this plant with you. When you do, you can use the Silver Bloom move at will: roll Herbalism, DC10, and on success, you can drop the temperature in a one-meter radius of a point at the tip of your finger to freezing." },
  ],

  wands: [
    { id: "wnd-whisper", dbId: "wand_4DpI7oLQLoHGK", name: "Whispered Secrets", equipped: true, condition: 500, maxCondition: 500,
      desc: "An untrimmed yew wand brushed with hellclaw sap and smoked over an enchanted flame, giving it a mysterious enchanted blackness that curls the bark in places, but is still smooth to the touch. It has an aura of ancient secrets. Gives +4 to a given Ability, chosen at creation.",
      effect: { kind: "bonus", label: "+4 Divination", type: "subject", target: "divination", targetLabel: "Divination", value: 4 } },
    { id: "wnd-misty", dbId: "wand_7yEGj1sIy28K2", name: "Misty Vision", equipped: false, condition: 200, maxCondition: 200,
      desc: "A wand made from wisteria wood, with enchanted wisteria flowers at the tip that never wither. While this wand is active, you can use it to cast Minor Phantasm with a roll of 12. Once you do, the flowers close and take 3 hours to blossom again, at which point this ability refreshes.",
      effect: { kind: "spell", label: "Minor Phantasm",
        spell: { id: "sp-wnd-misty", name: "Minor Phantasm", level: "Basic", subjectKey: "illusion", subject: "Illusion", school: "natural", stat: "Creativity", ap: 1, dc: 12, ritual: false, volatile: false, days: 0,
          desc: "Conjure a small, fleeting illusion — a sound, a flicker of light, a passing shape. Granted only while Misty Vision is active; the flowers then close for three hours.",
          success: "The phantasm holds long enough to do its work.",
          fail: "The illusion wavers and gives itself away." } } },
    { id: "wnd-celestial", dbId: "wand_11Z8kwsamLiIoj", name: "Celestial Harmony", equipped: false, condition: 500, maxCondition: 500,
      desc: "A wand made of ivory—ethically sourced, of course—with a silver tip that emits a soothing hum when used. Gives a +4 to Tact checks and can be used as an action (2AP) to calm down a creature. Roll Creature against its Concentration, and on success, you calm it down, although it will likely still be wary and ready to become aggressive again at a provocation.",
      effect: { kind: "bonus", label: "+4 Tact", type: "skill", target: "tact", targetLabel: "Tact", value: 4 } },
    { id: "wnd-scholar", dbId: "wand_26nPcVWGFVsAvR", name: "Scholar's Scepter", equipped: false, condition: 600, maxCondition: 600,
      desc: "An oversized ash wand with a dragon's head carved into the end, wreathed with rare magical components. While active, this wand gives a +4 bonus to improvement and spell-learning rolls.",
      effect: { kind: "ability", label: "+4 improvement & spell-learning",
        note: "Adds +4 to improvement and spell-learning rolls. There's nothing to wire to the sheet — it simply holds at the table." } },
    { id: "wnd-spark", dbId: "wand_132wvnqaD67s0NQ", name: "Irresistible Spark", equipped: false, twisted: true, condition: 6000, maxCondition: 6000,
      desc: "A long, thin wand in pure ivory white, steeped for three days and three nights in the dreamscape of a person locked in a hexological nightmare. While this wand is active, you can take a +8 to any Charm skill, an ability which must be declared before rolling. If the roll still fails, the target knows you tried to manipulate their mind, and if it fails with two or more degrees of failure, they know it was with hexological magic. Whenever you use this ability, you must Resist, DC10.",
      effect: { kind: "ability", label: "+8 to a Charm skill",
        note: "Declared before the roll. On a failure the mark knows you tried to bend their will; on two or more degrees of failure, they know it was hexcraft. Whenever you use it, you must Resist, DC 10." } },
  ],

  glyphs: [
    { id: "gly-ash", name: "Ash", tone: "crimson", cost: 10, intensity: 3, desc: "The ending-glyph. Lends a rune the power to unmake and to close." },
    { id: "gly-ward", name: "Ward", tone: "teal", cost: 15, intensity: 4, desc: "The keeping-glyph. Turns a rune toward protection and binding." },
    { id: "gly-sight", name: "Sight", tone: "plum", cost: 20, intensity: 5, desc: "The seeing-glyph. Opens a rune to omens, scrying, and hidden things." },
    { id: "gly-bind", name: "Bind", tone: "gold", cost: 25, intensity: 6, desc: "The binding-glyph. Ties a rune's effect to a place, a person, or an hour." },
  ],

  items: [
    { id: "itm-quill", name: "Quill of the First Scribe", qty: 1, desc: "Writes in any language you have read aloud. Runs dry the moment you try to forge a signature." },
    { id: "itm-signet", name: "Dragon House Signet", qty: 1, desc: "Opens the plum-quarter dormitories after curfew. Best not flashed in front of a proctor." },
    { id: "itm-chalk", name: "Astral Chalk", qty: 3, desc: "Draws lines that hold for an hour, even on air. A box of three nubs." },
  ],
};
