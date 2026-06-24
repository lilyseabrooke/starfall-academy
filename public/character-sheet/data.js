/* ===========================================================================
   Starfall Academy — character + compendium seed data
   Plain JS, attached to window. Read by parts.jsx / the mount script.
   =========================================================================== */
(function () {
  // Stat tone → house accent (decorative, per-stat)
  window.SF_DATA = {
    character: {
      name: "Arianna Valey",
      pronouns: "she / her",
      year: "I",
      house: "Dragon",
      houseTone: "plum",
      title: "Child of the Darkness",
      actionPoints: 2,
      actionPointsMax: 6,
      resolve: 2,
      resolveMax: 3,
      trouble: 0,
      materials: 350,
      bio: "Raised far from civilization as heiress to a hexological legacy, Arianna has had to adapt to polite society\u2014with the help of the fey who are fascinated with her, and her gift for Invisibility.",
      major: ["illusion"],
    },

    // ---- The five Houses --------------------------------------------------
    // House is flavor, chosen freely — but it sets the sheet's accent `tone`.
    // The five houses map 1:1 onto the design-system house tones.
    houses: [
      { id: "dragon",   name: "Dragon House",   tone: "plum",    color: "Violet", animal: "dragon", blurb: "Great leaders, Dragons are known for their ambition and their domineering streaks." },
      { id: "boar",     name: "Boar House",     tone: "forest",  color: "Green",  animal: "boar",   blurb: "Practical and convivial, Boars are uncomplicated and down to earth, perhaps naively so." },
      { id: "dolphin",  name: "Dolphin House",  tone: "teal",    color: "Blue",   animal: "dolphin", blurb: "With quick wit and flowing grace, Dolphins are at the center of every party\u2014and every scheme." },
      { id: "eagle",    name: "Eagle House",    tone: "crimson", color: "Red",    animal: "eagle",  blurb: "Ruthlessly competent, Eagles are often solitary, intense, and reliable." },
      { id: "scorpion", name: "Scorpion House", tone: "gold",    color: "Gold",   animal: "scorpion", blurb: "Artful and loving, Scorpions can gather anyone to work together and look good doing it." },
    ],

    // ---- Character-creation rules (the Admission) -----------------------------
    // Year is the master dial: it scales every budget and the per-rank cap.
    // Two build paths share one cost engine — Quick (three rank pools) and
    // Custom (one point pool: Stat rank = 3 pts, Ability rank = 1 pt).
    creation: {
      years: [
        { id: "first",    label: "First Year",  roman: "I",   quick: { stat: 10, subject: 15, skill: 15 }, custom: 60,  limit: 5, spells: { Basic: 5,  Standard: 10, Advanced: 1 } },
        { id: "second",   label: "Second Year", roman: "II",  quick: { stat: 15, subject: 25, skill: 25 }, custom: 90,  limit: 6, spells: { Basic: 7,  Standard: 12, Advanced: 1 } },
        { id: "third",    label: "Third Year",  roman: "III", quick: { stat: 20, subject: 35, skill: 35 }, custom: 120, limit: 7, spells: { Basic: 10, Standard: 15, Advanced: 2 } },
        { id: "fourth",   label: "Fourth Year", roman: "IV",  quick: { stat: 25, subject: 45, skill: 45 }, custom: 150, limit: 8, spells: { Basic: 12, Standard: 18, Advanced: 2 } },
        { id: "graduate", label: "Graduate",    roman: "—",   quick: { stat: 30, subject: 55, skill: 55 }, custom: 180, limit: 9, spells: { Basic: 15, Standard: 20, Advanced: 3 } },
      ],
      // Custom-build cost engine.
      custom: {
        statCost: 3,          // points per Stat rank
        abilityCost: 1,       // points per Subject/Skill rank
        classRankCost: 2,     // points per class rank level (a rank-N class totals 2×N)
        freeClassPoints: 8,   // default allotment: one class @4, or two @2 (2×2 each)
        wandPer: 400,         // 1 point buys 400 materials of wand
        artifactPer: 400,     // 1 point buys 400 materials of artifact (auto-attuned)
      },
      // Default class allotment, either path.
      classDefault: { single: 4, double: 2, maxClasses: 2 },
      // Inventory at creation.
      startingMaterials: 500,
      yields: {
        alchemyPotionMax: 6,        // 1 potion per Alchemy rank, capped at 6
        runologyGlyphsPerRank: 2,   // 2 glyphs per Runology rank
        wandcraftMatPerRank: 200,   // 200 materials of bonus wand per Wandcrafting rank
        herbalismPlantMat: 50,       // 50 materials of plants per Herbalism rank
      },
      // The three starting wands — pick one.
      //   kind "stat"   → target one Stat
      //   kind "ability"→ target Subjects/Skills; `count` targets of `value` each
      startingWands: [
        { id: "sylene",    name: "Sylene's Crystal",  kind: "stat",    value: 2, count: 1, grant: "+2 to one Stat",      desc: "A faceted prism that sharpens a single innate talent until it sings." },
        { id: "champion",  name: "Champion's Wand",   kind: "ability", value: 2, count: 3, grant: "+2 to three Abilities", desc: "A duellist's favorite — broadly capable, generous to the well-rounded." },
        { id: "whispered", name: "Whispered Secrets", kind: "ability", value: 4, count: 1, grant: "+4 to one Ability",    desc: "Blackened yew that hums with half-heard answers; pours itself into one art." },
      ],
    },

    // Other characters — hints at the party / multi-character future
    roster: [
      { id: "arianna", name: "Arianna Valey", house: "Dragon", tone: "plum", initials: "AV", active: true },
      { id: "lys", name: "Lys Ellington", house: "Dragon", tone: "plum", initials: "LE" },
      { id: "claire", name: "Claire Martin", house: "Dragon", tone: "plum", initials: "CM" },
      { id: "suri", name: "Suri Chandra", house: "Dragon", tone: "plum", initials: "SC" },
      { id: "trinity", name: "Trinity Vargas", house: "Dragon", tone: "plum", initials: "TV" },
    ],

    stats: [
      { id: "focus", name: "Focus", rank: 3, tone: "crimson", icon: "target", skills: [
        { id: "concentration", name: "Concentration", rank: 1 },
        { id: "recall", name: "Recall Info", rank: 1 },
        { id: "search", name: "Search", rank: 2 },
        { id: "willpower", name: "Willpower", rank: 3 },
      ]},
      { id: "creativity", name: "Creativity", rank: 7, tone: "plum", icon: "palette", skills: [
        { id: "art", name: "Art", rank: 3 },
        { id: "hide", name: "Hide Object", rank: 5 },
        { id: "improvise", name: "Improvise", rank: 4 },
        { id: "sleight", name: "Sleight of Hand", rank: 2 },
      ]},
      { id: "logic", name: "Logic", rank: 2, tone: "teal", icon: "scale", skills: [
        { id: "analyze", name: "Analyze", rank: 1 },
        { id: "comprehend", name: "Comprehend", rank: 2 },
        { id: "research", name: "Research", rank: 0 },
        { id: "tracking", name: "Tracking", rank: 3 },
      ]},
      { id: "insight", name: "Insight", rank: 5, tone: "forest", icon: "eye", skills: [
        { id: "creature", name: "Creature", rank: 3 },
        { id: "investigate", name: "Investigate", rank: 2 },
        { id: "perception", name: "Perception", rank: 4 },
        { id: "read", name: "Read Person", rank: 2 },
      ]},
      { id: "body", name: "Body", rank: 4, tone: "silver", icon: "shield", skills: [
        { id: "agility", name: "Agility", rank: 3 },
        { id: "athletics", name: "Athletics", rank: 2 },
        { id: "endurance", name: "Endurance", rank: 2 },
        { id: "stealth", name: "Stealth", rank: 5 },
      ]},
      { id: "charm", name: "Charm", rank: 4, tone: "gold", icon: "sparkles", skills: [
        { id: "deception", name: "Deception", rank: 4 },
        { id: "tact", name: "Tact", rank: 1 },
        { id: "persuasion", name: "Persuasion", rank: 2 },
        { id: "winover", name: "Win Over", rank: 3 },
      ]},
    ],

    // ---- The 24 fields of magic, in four schools ------------------------
    // Each subject rolls off a base stat (per the rules' field→stat table).
    // A subject roll is 2d10 + that stat's rank + the subject rank.
    magicSchools: [
      { id: "creation", name: "Creation Magics", tone: "forest", icon: "flask-conical",
        blurb: "Magic based in creating, building, and rendering magical things into the world.", subjects: [
        { key: "alchemy", name: "Alchemy", stat: "Creativity", rank: 1 },
        { key: "artificy", name: "Artificy", stat: "Creativity", rank: 0 },
        { key: "enchantment", name: "Enchantment", stat: "Creativity", rank: 2 },
        { key: "herbalism", name: "Herbalism", stat: "Insight", rank: 3 },
        { key: "runology", name: "Runology", stat: "Logic", rank: 0 },
        { key: "wandcrafting", name: "Wandcrafting", stat: "Focus", rank: 0 },
      ]},
      { id: "natural", name: "Natural Magics", tone: "teal", icon: "leaf",
        blurb: "Magic that directly and physically interacts with the world.", subjects: [
        { key: "evocation", name: "Evocation", stat: "Focus", rank: 0 },
        { key: "illusion", name: "Illusion", stat: "Creativity", rank: 6 },
        { key: "restoration", name: "Restoration", stat: "Insight", rank: 1 },
        { key: "telekinesis", name: "Telekinesis", stat: "Focus", rank: 0 },
        { key: "transmutation", name: "Transmutation", stat: "Creativity", rank: 1 },
        { key: "warding", name: "Warding", stat: "Logic", rank: 0 },
      ]},
      { id: "spectral", name: "Spectral Magics", tone: "plum", icon: "moon-star",
        blurb: "Magic that impacts the intangible, the immeasurable, and the invisible.", subjects: [
        { key: "chronomancy", name: "Chronomancy", stat: "Insight", rank: 0 },
        { key: "divination", name: "Divination", stat: "Insight", rank: 0 },
        { key: "hypnomancy", name: "Hypnomancy", stat: "Focus", rank: 3 },
        { key: "necromancy", name: "Necromancy", stat: "Logic", rank: 1 },
        { key: "summoning", name: "Summoning", stat: "Creativity", rank: 0 },
        { key: "teleportation", name: "Teleportation", stat: "Focus", rank: 0 },
      ]},
      { id: "wisdom", name: "Wisdom Magics", tone: "crimson", icon: "book-open-text",
        blurb: "Magic based in knowledge, wisdom, and understanding.", subjects: [
        { key: "arcane-history", name: "Arcane History", stat: "Focus", rank: 1 },
        { key: "bestiology", name: "Bestiology", stat: "Insight", rank: 2 },
        { key: "counterhexology", name: "Counterhexology", stat: "Logic", rank: 2 },
        { key: "crystallomancy", name: "Crystallomancy", stat: "Logic", rank: 0 },
        { key: "demonology", name: "Demonology", stat: "Logic", rank: 0 },
        { key: "draconology", name: "Draconology", stat: "Insight", rank: 0 },
      ]},
    ],

    // ---- Lyra's known (and one half-learned) spells ----------------------
    // mod is computed live = stat rank + subject rank; these carry the
    // descriptive fields. `days` > 0 means "not yet learned".
    spells: [
      { id: "spell_429y5rA0DfUG2", name: "Identifying Light", level: "Basic", subjectKey: "alchemy", subject: "Alchemy", school: "creation", stat: "Creativity", dc: 8, ritual: false, volatile: false, days: 0,
        desc: "Casts a pale light on a potion that reflects its composition. On success, you can ask the GM a question about the potion. You can only use this on a given potion once.",
        higherLevel: "You may ask 1/degree question(s) about the potion." },
      { id: "spell_7XtmGfgmIOvWz", name: "Augment Receptivity", level: "Standard", subjectKey: "alchemy", subject: "Alchemy", school: "creation", stat: "Creativity", dc: 18, ritual: false, volatile: false, days: 0,
        desc: "A sparkling golden enchantment that boosts someone\u2019s receptivity to potions. On a success, the target can add 1 to a Stat or Ability bonus received from the next potion they take. For potions that don\u2019t give a numerical bonus, the GM will rule a bonus that makes sense or decide that it cannot apply to the potion.",
        higherLevel: "The target adds (1/2/4/7/10) to the next potion bonus they receive. They can also take a +(0/0/1+) bonus to their Metabolize roll." },
      { id: "sp-mending", name: "Mending Cantrip", level: "Basic", subjectKey: "restoration", subject: "Restoration", school: "natural", stat: "Insight", ap: 1, dc: 12, ritual: false, volatile: false, days: 0,
        desc: "Knit a torn page, a cracked phial, or a frayed nerve back to whole. The Academy's most-cast and least-credited spell.",
        higherLevel: "You knit (1/2/4+) break(s) whole in a single casting." },
      { id: "sp-kindle", name: "Kindle the Hearth-Ward", level: "Standard", subjectKey: "evocation", subject: "Evocation", school: "natural", stat: "Focus", ap: 2, dc: 16, ritual: false, volatile: false, days: 0,
        desc: "Raise a ring of warding flame the size of a classroom. It will not burn the welcome, but the unwelcome learn quickly.",
        higherLevel: "The ward stands for (1 scene/1 hour/until dawn) and turns aside 1/degree intrusion(s) unscathed." },
      { id: "sp-lantern", name: "Hollow Lantern", level: "Advanced", subjectKey: "necromancy", subject: "Necromancy", school: "spectral", stat: "Logic", ap: 3, dc: 22, ritual: true, volatile: false, days: 0,
        desc: "Bind a fading spirit to a lantern flame for one night. It will answer truthfully, then gutter out at dawn.",
        higherLevel: "The bound spirit answers (1/2/3+) question(s) truthfully before it gutters out." },
      { id: "sp-glass", name: "Glass of Hours", level: "Legendary", subjectKey: "chronomancy", subject: "Chronomancy", school: "spectral", stat: "Insight", ap: 5, dc: 26, ritual: false, volatile: true, days: 4,
        desc: "Turn the last minute back upon itself, once. Reality remembers what you would rather it forgot \u2014 and so will you.",
        higherLevel: "You rewind the last (1/2/4+) minute(s); on 3 or more degrees, you alone keep the memory of what was undone." },
      { id: "spell_148LWVV1BsTqw2", name: "Eternal Hunger", level: "HEX (4AP)", subjectKey: "alchemy", subject: "Alchemy", school: "creation", stat: "Creativity", dc: 30, ritual: false, volatile: false, days: 0,
        desc: "Creates a dark miasma that drifts like a dense cloud, choking a target and seeping into their body. On success, a target must roll as if metabolizing a potion with a DC equal to your spell check. If they fail, they become afflicted with Eternal Hunger, a noxious malaise that eats at them from the inside out. If they go 24 hours without taking an Angel\u2019s Balm potion, they must Resist, DC20. This condition lasts indefinitely. If you cast this on someone and they steal your Angel\u2019s Balm potions, though, you don\u2019t really get to complain.",
        higherLevel: "You can affect (1/2*) target(s)." },
      { id: "sp-invisibility", name: "Invisibility", level: "Standard", subjectKey: "illusion", subject: "Illusion", school: "natural", stat: "Creativity", ap: 2, dc: 20, ritual: false, volatile: false, days: 0,
        desc: "A cloak of magic settles around you, rendering you invisible to the naked eye. On success, you become invisible for 10 minutes. The spell is impossible to see through without a counterspell, but you are only invisible\u2014you can still be heard, felt, or if you haven\u2019t bathed lately, smelled.",
        higherLevel: "The invisibility lasts for (10 minutes/20 minutes/30 minutes/1 hour/2 hours/3 hours/8 hours). You can render (0/1+) other willing target(s) invisible with you." },
    ],

    conditions: [
      { id: "fear", name: "Fear", value: 0, max: 3, resist: "Logic", resistId: "logic" },
      { id: "despair", name: "Despair", value: 0, max: 3, resist: "Insight", resistId: "insight" },
      { id: "wound", name: "Wound", value: 0, max: 3, resist: "Body", resistId: "body" },
      { id: "loss", name: "Loss", value: 0, max: 3, resist: "Creativity", resistId: "creativity" },
      { id: "doubt", name: "Doubt", value: 0, max: 3, resist: "Focus", resistId: "focus" },
    ],

    moves: [],

    // Live bonus ledger — toggling 'active' recomputes affected totals
    bonuses: [
      { id: "b1", source: "Ring of Sure Footing", type: "skill", target: "stealth", targetLabel: "Stealth", value: 2, active: true },
      { id: "b2", source: "Lingering Hex", type: "resist", target: "doubt", targetLabel: "Doubt", value: -2, active: true },
      { id: "b3", source: "Phoenix-Feather Charm", type: "spell", target: "augurs-glimpse", targetLabel: "Augur's Glimpse", value: 3, active: false },
      // Conditional bonuses do not apply to your totals live — they are offered
      // as an opt-in choice in the roll window whenever a matching check is made.
      { id: "b4", source: "Marwyn's Steady Hand", type: "subject", target: "artificy", targetLabel: "Artificy", value: 4, active: true, conditional: true, condNote: "You take 10 minutes on the check." },
      // A stat bonus — raises Focus everywhere it is rolled.
      { id: "b5", source: "Sylene's Crystal", type: "stat", target: "Focus", targetLabel: "Focus", valueMode: "flat", value: 2, active: true },
      // A class-rank bonus — adds your Pupil rank to improvement rolls in Alchemy,
      // and rises on its own whenever Pupil does.
      { id: "b6", source: "Pupil · Specialist", type: "improve", target: "alchemy", targetLabel: "Alchemy", valueMode: "class", classKey: "pupil", classLabel: "Pupil", active: true },
    ],

    // ---- The Compendium / Archive -----------------------------------------
    compendiumCats: [
      { id: "spell", label: "Spells", icon: "sparkles" },
      { id: "artifact", label: "Artifacts", icon: "gem" },
      { id: "potion", label: "Potions", icon: "flask-conical" },
      { id: "wand", label: "Wands", icon: "wand-2" },
      { id: "glyph", label: "Glyphs", icon: "pen-tool" },
      { id: "item", label: "Items", icon: "package" },
      { id: "plant", label: "Plants", icon: "leaf" },
    ],

    compendium: [
      { id: "augurs-glimpse", cat: "spell", name: "Augur's Glimpse", tone: "plum", level: "Standard",
        meta: ["Divination", "Base Insight", "Ritual"], cost: "50 mat.",
        subjectKey: "divination", subject: "Divination", school: "spectral", stat: "Insight", ap: 2, dc: 18, ritual: true,
        desc: "Glimpse one likely outcome of a course of action within the next hour. The vision is true but seldom complete — read the omens carefully." },
      { id: "hollow-lantern", cat: "spell", name: "Hollow Lantern", tone: "plum", level: "Advanced",
        meta: ["Necromancy", "Base Logic"], cost: "200 mat.",
        subjectKey: "necromancy", subject: "Necromancy", school: "spectral", stat: "Logic", ap: 3, dc: 22, ritual: true,
        desc: "Bind a fading spirit to a lantern flame for one night. It will answer three questions truthfully, then gutter out at dawn." },
      { id: "kindle-ward", cat: "spell", name: "Kindle the Hearth-Ward", tone: "crimson", level: "Standard",
        meta: ["Evocation", "Base Focus"], cost: "30 mat.",
        subjectKey: "evocation", subject: "Evocation", school: "natural", stat: "Focus", ap: 2, dc: 16, ritual: false,
        desc: "Raise a ring of warding flame the size of a classroom. It will not burn the welcome, but the unwelcome learn quickly." },
      { id: "whispering-step", cat: "spell", name: "Whispering Step", tone: "teal", level: "Advanced",
        meta: ["Teleportation", "Base Focus"], cost: "120 mat.",
        subjectKey: "teleportation", subject: "Teleportation", school: "spectral", stat: "Focus", ap: 3, dc: 20, ritual: false,
        desc: "Step from one shadow into another within sight. Arrive in silence — the only sound is the one you left behind." },
      { id: "mending-cantrip", cat: "spell", name: "Mending Cantrip", tone: "forest", level: "Basic",
        meta: ["Restoration", "Base Insight"], cost: "10 mat.",
        subjectKey: "restoration", subject: "Restoration", school: "natural", stat: "Insight", ap: 1, dc: 12, ritual: false,
        desc: "Knit a torn page, a cracked phial, or a frayed nerve back to whole. The Academy's most-cast and least-credited spell." },

      { id: "quick-study", cat: "move", name: "Quick Study", tone: "teal", level: "Pupil II",
        meta: ["Logic", "Research", "+2"], cost: null,
        desc: "Spend ten minutes with a text and roll Research. On a success, recall one relevant fact the Academy archives would hold." },
      { id: "silver-tongue", cat: "move", name: "Silver Tongue", tone: "gold", level: "Socialite I",
        meta: ["Charm", "Win Over", "+1"], cost: null,
        desc: "Once per scene, when you address someone of higher standing, add your Socialite rank to a Win Over roll." },
      { id: "cold-read", cat: "move", name: "Cold Read", tone: "forest", level: "Rascal I",
        meta: ["Insight", "Read Person", "+2"], cost: null,
        desc: "Name a stranger's tell before they speak. On a success, learn one true thing they would rather you did not." },

      { id: "mirror-hollow-hours", cat: "artifact", name: "Mirror of Hollow Hours", tone: "plum", level: "Legendary",
        meta: ["Chronomancy", "Attunable"], cost: null, mat: 5000, subject: "Chronomancy",
        desc: "Once per day, gaze into the glass to relive the last minute. Re-roll a recent roll — the mirror keeps the worse omen for itself." },
      { id: "boar-bone-charm", cat: "artifact", name: "Boar-Bone Charm", tone: "forest", level: "Standard",
        meta: ["Restoration", "Intensity 3"], cost: null, mat: 1500, subject: "Restoration", intensity: 3,
        desc: "Grants its bearer the stubborn endurance of Boar House — but it has gone dim, and must be attuned before it will answer." },

      { id: "steady-hands", cat: "potion", name: "Draught of Steady Hands", tone: "teal", level: "Brewable",
        meta: ["Intensity 4"], cost: "40 mat.", intensity: 4,
        desc: "For one scene, add +2 to Agility and Sleight of Hand rolls. The examiners frown on it during practicals." },
      { id: "moonpetal-tonic", cat: "potion", name: "Moonpetal Tonic", tone: "plum", level: "Recipe",
        meta: ["Intensity 6"], cost: "120 mat.", intensity: 6,
        desc: "Restores one point of Resolve when taken under open sky. A recipe you have learned but not yet brewed." },

      { id: "first-scribe-quill", cat: "item", name: "Quill of the First Scribe", tone: "gold", level: "Curio",
        meta: ["Stationery"], cost: null,
        desc: "Writes in any language you have read aloud. Runs dry the moment you try to admission a signature." },
      { id: "dragon-signet", cat: "item", name: "Dragon House Signet", tone: "plum", level: "Token",
        meta: ["Dragon House"], cost: null,
        desc: "Opens the plum-quarter dormitories after curfew. Best not flashed in front of a proctor." },

      // ---- Real items (from the items database snapshot) ----
      { id: "item_6fAT7U83nuZK0", cat: "item", name: "Songwon's Baton", tone: "gold", level: "Item",
        meta: ["100 mat.", "Reusable", "Athletics +4", "Lost on backfire"],
        cost: 100, singleUse: false, check: "ATHLETICS + 4", tags: ["LOST_ON_BACKFIRE"],
        desc: "A baton like a stage magician's wand, the center gleaming with magic that flows like a slow liquid when activated. You can roll Athletics to strike someone or something with the Baton, taking a +4 bonus to the roll as it flashes with force on impact. On a critical failure, the Baton shatters." },

      { id: "item_7HYUPQk5KW09A", cat: "item", name: "Brighton's Strange Ear", tone: "teal", level: "Item",
        meta: ["100 mat.", "Single-use", "Perception +8"],
        cost: 100, singleUse: true, check: "PERCEPTION + 8", tags: [],
        desc: "A small, peculiar device that looks like yellow rubber and twists around in odd shapes. You can put one end of it up to your ear and roll Perception + 8 to hear things in perfect clarity in your surroundings. With a rubbery squeaking sound, the Ear disappears once used." },

      { id: "item_8EAzAv0dDasdM", cat: "item", name: "Boring Box", tone: "plum", level: "Item",
        meta: ["100 mat.", "Reusable", "Comprehend DC 12", "Lost on backfire or failure"],
        cost: 100, singleUse: false, check: "COMPREHEND, DC=12", tags: ["LOST_ON_BACKFIRE", "LOST_ON_FAILURE"],
        desc: "A simple black box with a tiny red crystal set in the top, touched with demonic mind-altering magic. People will completely disregard the box and anything in it as so banal as to not even remember seeing it, unless they succeed on a DC20 Comprehend check. Once you close the box with something inside of it, it seals on it, preventing anyone from noticing magic traces from inside, and when you open the box, you must make a DC12 Comprehend roll. If you fail or backfire, the box's magic flickers out, and it becomes an actual boring box." },

      { id: "item_10EJyLvPFaIAkl", cat: "item", name: "Grinbear", tone: "forest", level: "Item",
        meta: ["100 mat.", "Single-use"],
        cost: 100, singleUse: true, check: null, tags: [],
        desc: "Famously formed out of a misunderstanding of the phrase \"grin and bear it,\" the Grinbear is a small magic charm in the shape of a scowling bear that grins when it's activated. After activation, you automatically succeed on the next Resist Wound roll within the next 10 minutes, after which the bear scowls again and the magic has run out, making it just a strange decorative piece." },

      { id: "item_18JRmXKlb2VX2d", cat: "item", name: "Potion-Popper Pill", tone: "teal", level: "Item",
        meta: ["100 mat.", "Single-use"],
        cost: 100, singleUse: true, check: null, tags: [],
        desc: "A sphere that looks like a twinkling starry night sky, slightly squishy to the touch. You can eat it to gain a +4 to your next Metabolize roll in the next 15 minutes. It tastes like fabric softener." },

      { id: "item_17FpEgurOytNHb", cat: "item", name: "Snake Siphon", tone: "plum", level: "Item",
        meta: ["300 mat.", "Reusable", "Sleight of Hand", "Lost on backfire"],
        cost: 300, singleUse: false, check: "SLEIGHT OF HAND", tags: ["LOST_ON_BACKFIRE"],
        desc: "A tube in snakeskin patterns that seems to shift subtly with telekinetic magics. You can make a Sleight of Hand roll against a target's Perception to send one end of the Snake Siphon into a potion they have, swapping the contents of their vial for one of yours. On success, exchange a potion you have with the target's without them knowing. On a backfire, the Snake Siphon breaks, although it still successfully transfers a potion if the backfire roll was a success." },

      { id: "item_27eb0s9EtsvKGn", cat: "item", name: "Elery's Hook", tone: "gold", level: "Item",
        meta: ["150 mat.", "Reusable", "Sleight of Hand", "Lost on backfire"],
        cost: 150, singleUse: false, check: "SLEIGHT OF HAND", tags: ["LOST_ON_BACKFIRE"],
        desc: "A small hook on a rope that you can throw towards a target. Make a Sleight of Hand roll with a DC equal to the number of meters between you and the target, or half the DC if you're aiming for an area instead of a specific target, max 30 meters. On success, you either pull the object towards you or, if you are lighter than the target object, you pull yourself towards the object. On a backfire, the hook breaks, but you still complete the pull if you succeeded on the roll. If you and the target are of equal mass, you are more likely to meet in the middle and maybe kiss." },

      { id: "item_28uY6ilsCBcLzx", cat: "item", name: "Gara's Chain", tone: "crimson", level: "Item",
        meta: ["200 mat.", "Reusable", "Athletics", "Lost on backfire or failure"],
        cost: 200, singleUse: false, check: "ATHLETICS", tags: ["LOST_ON_BACKFIRE", "LOST_ON_FAILURE"],
        desc: "A heavy golden chain with a single large shackle at the end. You can throw the shackle towards a creature native to a plane other than the one you're currently on, and it will flash bright white light as it attempts to ensnare it. Roll Athletics against the target's Strong roll. On a success, it is restrained, and all of its rolls have a -6 penalty. On a backfire or a failure, the chain is destroyed." },

      { id: "item_32KKUS2FDLVqLW", cat: "item", name: "Visexpanders", tone: "teal", level: "Item",
        meta: ["350 mat.", "Reusable", "Perception +8", "Lost on backfire"],
        cost: 350, singleUse: false, check: "PERCEPTION + 8", tags: ["LOST_ON_BACKFIRE"],
        desc: "A visor that gleams with fey magic. You can equip it to search the area, rolling Perception + 8, and you can see anything that was rendered invisible or illusorily disguised by any magic check up to your move check. On a backfire, the magic flickers out, and the visor becomes unusable. Fey magic is unreliable." },

      { id: "item_29eThvrJH2azAP", cat: "item", name: "Artificer's Golden Glove", tone: "gold", level: "Item",
        meta: ["200 mat.", "Single-use"],
        cost: 200, singleUse: true, check: null, tags: [],
        desc: "A heavy, solid glove that is, against all logic and reason, more of a burgundy red than golden. You can use this item to perform an Attunement attempt without being forced to Resist on failure. Still, though, what's with the color thing?" },

      { id: "item_30hCyzxAjR1TZN", cat: "item", name: "Panic Button", tone: "crimson", level: "Item",
        meta: ["250 mat.", "Single-use"],
        cost: 250, singleUse: true, check: null, tags: [],
        desc: "A small, solid piece of brassy metal with a button on each side. You can press the blue button to plant a small teleportative enchantment at your current location, and you can press the red button to teleport back to that location with up to 20 kilograms of inorganic material with you. Once you teleport with it, the Panic Button disappears — it's said that somewhere out there, there's a pile of spent Panic Buttons." },

      { id: "item_22JVDseXPJ001Q", cat: "item", name: "Mind Shield", tone: "plum", level: "Item",
        meta: ["150 mat.", "Single-use"],
        cost: 150, singleUse: true, check: null, tags: [],
        desc: "A brassy plate that forms itself over the back of your head when activated. For the next 30 minutes after activation, you are immune to effects to manipulate your thoughts and feelings, and the DC to detect you with Divination increases by 6. Essentially it's a tinfoil hat that works." },

      { id: "item_33NzM4538l6Oxi", cat: "item", name: "Mental Fog", tone: "plum", level: "Item",
        meta: ["250 mat.", "Single-use"],
        cost: 250, singleUse: true, check: null, tags: [],
        desc: "A jar of shimmering pink liquid rich with hypnomantic energy. You can empty its contents into the air, creating a pink cloud over a 10-meter radius where everyone inside is dizzy and disoriented and must make a DC18 Recall Information check or forget where they are or how they got there. Anyone inside the cloud has a -4 to all Focus and Logic checks." },

      { id: "item_313OZSFroc26QD", cat: "item", name: "Cubicle", tone: "teal", level: "Item",
        meta: ["250 mat.", "Single-use"],
        cost: 250, singleUse: true, check: null, tags: [],
        desc: "A small charm about the size of a fingertip that looks like a walled cubicle. You can open the tiny door on it to activate it, and the cubicle expands to full size, leading into an interplanar subspace that looks like a simple but cozy room where no magic can track you. You can stay there for up to one hour; the only way back is the room door that leads you to the exact place you used it. The room always looks different, but it's always cozy." },

      { id: "whispered-secrets", cat: "wand", name: "Whispered Secrets", tone: "plum", level: "Wand",
        meta: ["+4 Divination", "Equippable"], cost: null, mat: 800, bonusLabel: "+4 Divination", condition: "8 / 10",
        desc: "A wand of blackened yew that hums with half-heard answers. While equipped, divinations come a great deal easier." },
      { id: "emberglass-rod", cat: "wand", name: "Emberglass Rod", tone: "crimson", level: "Wand",
        meta: ["+3 Evocation", "Equippable"], cost: null, mat: 500, bonusLabel: "+3 Evocation", condition: "5 / 6",
        desc: "Spun from red desert glass, warm to the touch. While equipped, your evocations burn a shade hotter." },
      { id: "gale-caller", cat: "wand", name: "Gale-Caller", tone: "teal", level: "Wand",
        meta: ["+2 Telekinesis", "Equippable"], cost: null, mat: 400, bonusLabel: "+2 Telekinesis", condition: "6 / 6",
        desc: "A reed of storm-glass that answers with wind. While equipped, what you push pushes back less." },

      { id: "glyph-ash", cat: "glyph", name: "Ash", tone: "crimson", level: "Glyph",
        meta: ["Cost 10", "Intensity 3"], cost: "10 mat.", value: 10, intensity: 3,
        desc: "The ending-glyph. Lends a rune the power to unmake and to close." },
      { id: "glyph-ward", cat: "glyph", name: "Ward", tone: "teal", level: "Glyph",
        meta: ["Cost 15", "Intensity 4"], cost: "15 mat.", value: 15, intensity: 4,
        desc: "The keeping-glyph. Turns a rune toward protection and binding." },
      { id: "glyph-sight", cat: "glyph", name: "Sight", tone: "plum", level: "Glyph",
        meta: ["Cost 20", "Intensity 5"], cost: "20 mat.", value: 20, intensity: 5,
        desc: "The seeing-glyph. Opens a rune to omens, scrying, and hidden things." },
      { id: "glyph-flux", cat: "glyph", name: "Flux", tone: "gold", level: "Glyph",
        meta: ["Cost 30", "Intensity 7"], cost: "30 mat.", value: 30, intensity: 7,
        desc: "The changing-glyph. Bends a rune toward transformation \u2014 volatile, and dear to inscribe." },

      { id: "plant_2SPm9YCQTT96Y", cat: "plant", name: "GLOOMLEAF", tone: "plum", level: "Plant",
        meta: ["Value 100", "Intensity 15"], cost: null, value: 100, intensity: 15, removeOnUse: false, requiresRoll: "YES",
        desc: "A plant with long, drooping, faded green leaves that have striking white lines along them, giving the appearance of a skeleton. The plant grows around a center bud that blossoms a brilliant violet flower, but the flower releases a burst of poison gas when touched.",
        ability: "Once per day, you can harvest the plant\u2019s natural poisons to obtain a Blackblood Brew poison." },
      { id: "plant_35deYRO5eY6O3", cat: "plant", name: "STARBLOOM CLOVER", tone: "gold", level: "Plant",
        meta: ["Value 200", "Intensity 18"], cost: null, value: 200, intensity: 18, removeOnUse: false, requiresRoll: "YES",
        desc: "A small bundled plant that grows in places that only get indirect sunlight, with distinctive golden lines radiating up the thin stalks. They have strong inherent divination magic, and are easiest to identify by touching them and seeing if you get visions.",
        ability: "Once per day, you can use the plant to get a vision of something to come, as in the spell Lilibel\u2019s Little Promise." },
      { id: "plant_4mv4zIsJ3KXiJ", cat: "plant", name: "GALYR\u2019S TOOTH", tone: "teal", level: "Plant",
        meta: ["Value 100", "Intensity 11"], cost: null, value: 100, intensity: 11, removeOnUse: true, requiresRoll: "NO",
        desc: "A ghostly-white plant that hangs along the tops of rocky walls, with long fanglike leaves that droop down. The favorite snack of cave beaks, they have gentle restorative properties, but only if crushed.",
        ability: "You can consume this plant to restore a stack of any condition you choose. This does not require a roll." },
      { id: "plant_8rJnct5LyH11Z", cat: "plant", name: "WOLF WEED", tone: "forest", level: "Plant",
        meta: ["Value 50", "Intensity 7"], cost: null, value: 50, intensity: 7, removeOnUse: false, requiresRoll: "YES",
        desc: "A thick bundled plant with long, jagged-edged leaves. The leaves, if broken down, can be ground into a valuable powder. They can also be smoked, which will make you see God and give you a headache that can kill God.",
        ability: "Once per day, you can either collect 50 materials or spend an hour to collect 150 materials." },
      { id: "plant_13Y3PHi9cA2NkB", cat: "plant", name: "NARA\u2019S DEATH ROSE", tone: "crimson", level: "Plant",
        meta: ["Value 150", "Intensity 13"], cost: null, value: 150, intensity: 13, removeOnUse: false, requiresRoll: "CHOOSE",
        desc: "A black-and-white rose-like flower with drooping petals and striking coloration. You can pluck a petal, which will make it spill a red fluid like blood. Despite how deeply gothic this flower is, it actually has restorative powers and the fluid is a sweet sap that tastes like marshmallow.",
        ability: "Once per day, you can draw out the fluid and take it to gain the effects of the Sate spell. You can choose to either take one degree of success without rolling or roll to get as many degrees of success on the Sate effect as you get on the roll, but if you fail the roll, the plant is destroyed." },
      { id: "plant_27lBCa0xcwg1Vi", cat: "plant", name: "EIRLYS\u2019 SILVER BLOOM", tone: "teal", level: "Plant",
        meta: ["Value 150", "Intensity 10"], cost: null, value: 150, intensity: 10, removeOnUse: false, requiresRoll: "MOVE",
        desc: "A beautiful shimmering silvery flower that\u2019s icy-cold to the touch, with an aura of wintry silence close to it. It carries natural evocation magics that tap into frost and ice magic, which means really, really fancy bars will drop an Eirlys petal into your drink to keep it cool, which is probably doing too much, but power to them.",
        ability: "You can bring this plant with you. When you do, you can use the Silver Bloom move at will: roll Herbalism, DC10, and on success, you can drop the temperature in a one-meter radius of a point at the tip of your finger to freezing." },
      { id: "plant_6v55cbTBqFqth", cat: "plant", name: "WHISPERING WORMWOOD", tone: "gold", level: "Plant",
        meta: ["Value 750", "Intensity 15"], cost: null, value: 750, intensity: 15, removeOnUse: false, requiresRoll: "YES",
        desc: "A deep, charcoal-colored tree that grows in every direction with spindly branches covered in thick, sage-green bundles like wormwood rich with deep enchantments. Thin swirls of golden magic stream around the tree from one flowering bundle to the next, and if you stand close enough, you can hear the faint shimmering sound of it like distant bells. Rich with tychomantic energy, the golden magics bring good luck.",
        ability: "Once per day, you can harvest a tychomantic enchantment from the tree, which you can redeem at any point over the day to replace any die with a 10 on any roll. Backfires and improvement rolls are still processed with the original rolls." },
      { id: "plant_9P8WUPBFQJOMf", cat: "plant", name: "PASSIONOAK", tone: "crimson", level: "Plant",
        meta: ["Value 10000", "Intensity 8"], cost: null, value: 10000, intensity: 8, removeOnUse: false, requiresRoll: "YES",
        desc: "A precious, legendary tree that feeds on love, joy, hope, and other beautiful things, which means, you know, they\u2019re pretty rare. It\u2019s extremely difficult for a passionoak to make it to adulthood, but if it does, it\u2019s nearly impossible to kill. They\u2019re emblematic of love, peace, and hope, with beautiful red bark and shimmering golden leaves.",
        ability: "Once per week, you can draw on the tree\u2019s magic to either make an improvement roll at DC10 in any subject or instantly learn any Basic or Standard spell." },
      { id: "plant_19nKYnh6aAMIvR", cat: "plant", name: "BURSTBLOSSOM", tone: "plum", level: "Plant",
        meta: ["Value 50", "Intensity 7"], cost: null, value: 50, intensity: 7, removeOnUse: false, requiresRoll: "YES",
        desc: "An oddly proportioned flower with a massive purple and white bloom far too big for its stem, it turns slowly like a pinwheel through the day, empowered by its latent evocation magic. They\u2019re popular for harvesting materials as long as they don\u2019t explode. They\u2019re less popular when they explode.",
        ability: "Once per day, you can harvest 100 materials from the plant. If you backfire on the roll, the plant explodes, and you must Resist, DC14. The plant is destroyed when it explodes, but if you succeeded on the roll, you still get the 100 materials." },
      { id: "plant_24VD7XgqQgCxIF", cat: "plant", name: "PERFECT PRINCESS", tone: "gold", level: "Plant",
        meta: ["Value 200", "Intensity 12"], cost: null, value: 200, intensity: 12, removeOnUse: false, requiresRoll: "BONUS (Win Over; +2)",
        desc: "A pretty peach-pink blossoming flower that shimmers with fey magic that makes them irresistibly charming. So named because they\u2019re just so magically charming, how can you not think it\u2019s a perfect princess? I mean, look at it. I kind of want to take one with me now. I probably have room for one.",
        ability: "You can bring this plant with you. When you do, you can take a +2 to Win Over checks." },
      { id: "plant_28UpTw9XFbdQtd", cat: "plant", name: "WALL WALKER", tone: "forest", level: "Plant",
        meta: ["Value 150", "Intensity 16"], cost: null, value: 150, intensity: 16, removeOnUse: false, requiresRoll: "ABILITY",
        desc: "A black, spindly plant that covers a wall and slowly creeps along it. It\u2019s actually very friendly and loves people, but it doesn\u2019t understand how to be friendly with people, so it typically ensnares them and crushes them trying to give them hugs.",
        ability: "You can bring this plant with you. While you have it with you, you can climb along walls and ceilings as easily as if you\u2019re walking normally." },
    ],

    // ---- The shared Roll Log ----------------------------------------------
    // Every party member's and the GM's rolls land here (secret rolls excepted).
    // `who` is resolved against `roster`; GM actors carry their own label.

    // Pool the "conjure a party roll" demo draws from — the rolls you'd see
    // your tablemates make. Some carry rules text (the Surface Detective case),
    // some are bare (the Resist Wound case).
    partyPool: [
      { whoId: "suri", label: "Surface Detective", kind: "spell", stat: "Insight", mod: 17, dc: 20,
        meta: ["Divination", "Base Insight"],
        detail: "Lay a palm to any worked surface and read the last hand that touched it. You learn who they were, what they did there, and one thing they were trying to hide.",
        success: "Name the last person to touch it and one secret of their visit.",
        fail: "The surface keeps its counsel — and you've shown your hand to anyone watching.",
        hl: (deg, s) => s
          ? `Name the last ${deg > 1 ? deg + " people" : "person"} to touch it, and one secret each was keeping.`
          : `The surface keeps its counsel — and you've shown your hand to anyone watching.` },
      { whoId: "lys", label: "Resist Wound", kind: "resist", stat: "Body", mod: 16, dc: 15,
        detail: null, success: null, fail: null },
      { whoId: "trinity", label: "Kindle the Hearth-Ward", kind: "spell", stat: "Focus", mod: 19, dc: 22,
        meta: ["Evocation", "Base Focus"],
        detail: "Raise a ring of warding flame the size of a classroom. It will not burn the welcome, but the unwelcome learn quickly.",
        success: "The ward holds for the scene; nothing unwelcome crosses it unscathed.",
        fail: "The flame guts at once, and the casting leaves you winded.",
        hl: (deg, s) => s
          ? `The ward holds for ${deg} scene${deg > 1 ? "s" : ""}; nothing unwelcome crosses it unscathed.`
          : `The flame guts at once, and the casting leaves you winded.` },
      { whoId: "lys", label: "Athletics", kind: "skill", stat: "Body", mod: 14, dc: 18,
        detail: null, success: null, fail: null },
      { whoId: "suri", label: "Whispering Step", kind: "spell", stat: "Body", mod: 15, dc: null,
        meta: ["Teleportation", "Base Body"],
        detail: "Step from one shadow into another within sight. Arrive in silence — the only sound is the one you left behind.",
        success: "Cross to any shadow you can see, unheard.",
        fail: "You arrive half a step wrong, and loudly.",
        hl: (deg, s) => s
          ? `Step to any shadow you can see, up to ${deg * 3} metres away — the only sound is the one you left behind.`
          : `You arrive ${deg} pace${deg > 1 ? "s" : ""} wrong, and loudly.` },
      { whoId: "trinity", label: "Read Person", kind: "skill", stat: "Insight", mod: 13, dc: 16,
        detail: null, success: null, fail: null },
    ],

    // The GM's rolls — NPCs and forces of the world. `actor` names the creature.
    gmPool: [
      { actor: "Warden Mourncrow", label: "Pin the Truant", kind: "move", stat: "Focus", mod: 18, dc: 17,
        detail: "The Warden's gaze finds you across any crowd. While he holds it, you cannot slip away unseen — only outface him.",
        success: "You are marked; escape this scene unnoticed is off the table.",
        fail: "His attention snags elsewhere. Go — quickly.",
        hl: (deg, s) => s
          ? `You are marked for ${deg} round${deg > 1 ? "s" : ""}; slipping away unseen is off the table.`
          : `His attention snags elsewhere. Go — quickly.` },
      { actor: "A Hollow Choir", label: "Dirge of Small Hours", kind: "spell", stat: "Insight", mod: 14, dc: 19,
        meta: ["Necromancy"],
        detail: "A song with no singers fills the corridor. All who hear it must resist Despair or sit down where they stand and weep for a thing they cannot name.",
        success: "The dirge takes root; resist Despair or be unmade by sorrow.",
        fail: "The song falters against the dawn and scatters.",
        hl: (deg, s) => s
          ? `All who hear must resist Despair at +${deg * 2}, or weep where they stand for a thing they cannot name.`
          : `The song falters against the dawn and scatters.` },
    ],

    // The marquee GM roll the demo can force into an Inflection (one 1 + one 10).
    gmInflection: {
      actor: "The Unfinished King", label: "Ascension of the Mortal Gods", kind: "spell", stat: "Insight", mod: 22, dc: 25,
      meta: ["Apotheosis", "Forbidden"],
      detail: "The air curdles to gold and ruin. The King unmakes the ceiling of the world and reaches through it — and for one breath, every creature present glimpses the small, true shape of their own ending. An Inflection: the story will not continue as it was.",
      success: "Reality bends to the King's design. The term, as written, is over.",
      fail: "The reaching hand closes on nothing — but the sky has a seam in it now.",
      hl: (deg, s) => s
        ? `Reality bends ${deg} step${deg > 1 ? "s" : ""} toward the King's design. The term, as written, is over.`
        : `The reaching hand closes on nothing — but the sky has a seam in it now.` },

    // Past rolls already in the log when the session opens (newest last).
    // dice are pre-rolled; the engine re-classifies outcome on load.
    ledgerSeed: [
      { whoId: "arianna", label: "Perception", kind: "skill", stat: "Insight", mod: 9, dc: 14, dice: [7, 4], detail: null },
      { whoId: "trinity", label: "Silver Tongue", kind: "move", stat: "Charm", mod: 19, dice: [10, 6],
        detail: "Once per scene, when you address someone of higher standing, add your Socialite rank to a Win Over roll.",
        success: "They grant your small request and think well of you for asking.",
        fail: "They mark you as someone who reaches above their station." },
      { actor: "Warden Mourncrow", gm: true, label: "Pin the Truant", kind: "move", stat: "Focus", mod: 18, dc: 24, dice: [1, 5],
        detail: "The Warden's gaze finds you across any crowd. While he holds it, you cannot slip away unseen — only outface him.",
        fail: "His attention snags elsewhere. Go — quickly.",
        hl: (deg, s) => s
          ? `You are marked for ${deg} round${deg > 1 ? "s" : ""}; slipping away unseen is off the table.`
          : `His attention snags elsewhere. Go — quickly.` },
      { whoId: "suri", label: "Whispering Step", kind: "spell", stat: "Body", mod: 15, dc: 18, dice: [9, 7],
        meta: ["Teleportation", "Base Body"],
        detail: "Step from one shadow into another within sight. Arrive in silence — the only sound is the one you left behind.",
        hl: (deg, s) => s
          ? `Step to any shadow you can see, up to ${deg * 3} metres away — the only sound is the one you left behind.`
          : `You arrive ${deg} pace${deg > 1 ? "s" : ""} wrong, and loudly.` },
      { whoId: "claire", label: "Resist Fear", kind: "resist", stat: "Logic", mod: 13, dc: 15, sit: 4, sitReason: "Phoenix-Feather Charm", dice: [8, 9], detail: null },
    ],
  };
})();
