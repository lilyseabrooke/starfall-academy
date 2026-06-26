/* ===========================================================================
   Starfall Academy — GM view seed data
   ---------------------------------------------------------------------------
   Standalone seed for the GM dashboard prototype, the analogue of the player
   sheet's data.js. The GM view is currently a seed-data prototype that reuses
   the character sheet's shared roll / compendium / nav systems; real campaign
   membership, cross-user party reads and persistence land with the roadmap's
   campaigns + GM milestone (see design/INTEGRATION.md).

   Export: window.SF_GM_DATA
   ========================================================================== */
(function () {
  "use strict";

  // Condition → resisting stat, mirroring data.js `conditions`. The GM forces
  // resists against these; the roll uses the targeted player's stat rank.
  const CONDS = [
    { id: "fear",    name: "Fear",    resist: "Logic",      resistId: "logic",      color: "var(--crimson-300)" },
    { id: "despair", name: "Despair", resist: "Insight",    resistId: "insight",    color: "var(--plum-300)" },
    { id: "wound",   name: "Wound",   resist: "Body",       resistId: "body",       color: "var(--crimson-300)" },
    { id: "loss",    name: "Loss",    resist: "Creativity", resistId: "creativity", color: "var(--teal-300)" },
    { id: "doubt",   name: "Doubt",   resist: "Focus",      resistId: "focus",      color: "var(--gold-300)" },
  ];

  const conds = (o) => ({ fear: 0, despair: 0, wound: 0, loss: 0, doubt: 0, ...o });
  const facs  = (o) => ({ focus: 10, creativity: 10, logic: 10, insight: 10, body: 10, charm: 10, ...o });

  // The campaign's player characters. In the live build this is the campaign
  // party; here it is seed. `sheetId` is where the nav-rail party link will
  // point once the GM view is mounted in the app (dead in standalone).
  const party = [
    { id: "lyra",    sheetId: null, name: "Lyra Vane",    initials: "LV", tone: "plum",    house: "Dragon House",  className: "Spectral Adept · Pupil IV", resolve: 5, ap: 4, apMax: 6, materials: 150,
      conds: conds({ fear: 1, wound: 1 }), facs: facs({ focus: 14, creativity: 11, logic: 13, insight: 16, body: 9, charm: 12 }) },
    { id: "cassius", sheetId: null, name: "Cassius Roe",  initials: "CR", tone: "forest",  house: "Boar House",    className: "Hedge-Warden · Heir IV", resolve: 5, ap: 3, apMax: 6, materials: 50,
      conds: conds({ despair: 2 }), facs: facs({ focus: 9, creativity: 10, logic: 8, insight: 12, body: 15, charm: 11 }) },
    { id: "isolde",  sheetId: null, name: "Isolde Marsh", initials: "IM", tone: "teal",    house: "Dolphin House", className: "Tideglass Scholar · Socialite II", resolve: 5, ap: 5, apMax: 6, materials: 250,
      conds: conds({}), facs: facs({ focus: 13, creativity: 14, logic: 15, insight: 11, body: 8, charm: 13 }) },
    { id: "tomas",   sheetId: null, name: "Tomas Ardent", initials: "TA", tone: "crimson", house: "Eagle House",   className: "Duelling Prefect · Wandjock IV", resolve: 5, ap: 2, apMax: 6, materials: 100,
      conds: conds({ wound: 2, loss: 1 }), facs: facs({ focus: 11, creativity: 9, logic: 10, insight: 10, body: 14, charm: 10 }) },
  ];

  // Basic NPCs — a basic NPC uses their Strong roll for checks they're good at
  // and their Weak roll for checks they aren't. Full NPC sheets (stored the same
  // way as characters) are a later update.
  const npcsBasic = [
    { id: "proctor",  name: "Proctor Hale",         kind: "Examiner", icon: "user-round", maxResolve: 3, strong: 9,  weak: 3, conds: conds({}) },
    { id: "familiar", name: "Hollow-Eyed Familiar", kind: "Beast",    icon: "cat",        maxResolve: 2, strong: 7,  weak: 1, conds: conds({ fear: 1 }) },
    { id: "revenant", name: "Marsh Revenant",       kind: "Undead",   icon: "skull",      maxResolve: 4, strong: 12, weak: 4, conds: conds({ wound: 1 }) },
    { id: "page",     name: "Gilded Page",          kind: "Servant",  icon: "scroll",     maxResolve: 1, strong: 5,  weak: 2, conds: conds({}) },
  ];

  const notes = [
    { id: "n1", title: "Session XIV — The Drowned Archive", tags: "session, archive",
      body: "The Archive floods on the new moon. The players have until Matins to recover the Tidewater Codex before the lower stacks are lost.\n\nIf they free the bound spirit in the Hollow Lantern, it will name the Tallow Man — but the naming costs one of them a memory (Loss 1).\n\nKey beats:\n· The water rises one stack of Despair each scene anyone lingers below.\n· Coricant knows the safe stair but will only trade it for the Codex." },
    { id: "n2", title: "The Tallow Man — what he wants", tags: "antagonist",
      body: "He is not after the Codex. He is after the index card tucked inside it — the one bearing a true name. Let the players think they have won when they take the book." },
    { id: "n3", title: "Faction — The Gilded Hand", tags: "faction",
      body: "Smugglers of attuned artifacts. Owe Isolde a favour. Will appear if the party needs an exit they have not earned." },
    { id: "n4", title: "Hooks & loose threads", tags: "hooks",
      body: "· Tomas's missing wand\n· The seventh observatory mirror\n· Why Cassius will not enter the greenhouse" },
  ];

  // Materials grant chip presets + the per-step amount.
  const matChips = [50, 100, 250, 500];
  const matStep  = 50;

  // Seed for the shared roll ledger (rolls only — GM narration / grants surface
  // as status toasts, not log rows, mirroring the sheet's inv-toast pattern).
  // `whoId` references a party member; `gm:true` marks a Game-Master roll.
  // Seed entries resolve through roll-state.js `whoOf`, which only understands
  // `gm:true` (a Game-Master roll) or `whoId` (a party member). Keep to those
  // two shapes; live NPC rolls are pushed with an explicit `who` at click time.
  const ledgerSeed = [
    { whoId: "isolde", kind: "resist", label: "Resist Despair", stat: "Insight", mod: 11, dc: 12, dice: [8, 3], meta: ["Despair", "Insight"] },
    { whoId: "cassius", kind: "skill", label: "Body check · brace the door", stat: "Body", mod: 14, dice: [5, 5], dc: 12 },
    { whoId: "tomas",  kind: "skill", label: "Athletics · scale the stacks", stat: "Body", mod: 9, dice: [6, 7] },
    { gm: true, actor: "Game Master", kind: "roll", label: "Quick roll · 2d10", stat: "", mod: 0, dice: [7, 4] },
  ];

  window.SF_GM_DATA = {
    campaign: { name: "The Drowned Archive" },
    CONDS,
    party,
    npcsBasic,
    notes,
    matChips,
    matStep,
    ledgerSeed,
    // Time tracker defaults
    time: { day: 0, block: 0, enabled: true }, // day 0=Monday … block 0=Morning
  };
})();
