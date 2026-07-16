/* ===========================================================================
   Starfall Academy — character-sheet domain types
   ---------------------------------------------------------------------------
   The single source of truth for the sheet's data model, ported from the
   vendored prototype (public/character-sheet/*). The `SerializedSheet` type at
   the bottom is the DURABLE CONTRACT: it mirrors app.jsx's serializeSheet() /
   applySheet() exactly and is what persists to `characters.sheet` (JSONB) and
   round-trips through /api/characters. Do not change its shape without a
   migration — existing rows depend on it.
   =========================================================================== */

/** House / accent tones. The five houses map onto the design-system tones;
 *  the sheet also uses `silver` (Body) and `neutral`. */
export type Tone = "gold" | "plum" | "forest" | "teal" | "crimson" | "silver" | "neutral";

/* ---------------------------------------------------------------- vitals -- */

/** The character "header" block (app.jsx `c` state). */
export interface CharacterVitals {
  name: string;
  pronouns: string;
  year: string;
  house: string;
  houseTone: Tone;
  title: string;
  actionPoints: number;
  actionPointsMax: number;
  resolve: number;
  resolveMax: number;
  trouble: number;
  materials: number;
  bio: string;
  /** Subject keys the character "majors" in. */
  major: string[];
}

/* ------------------------------------------------------------ conditions -- */

export type ConditionId = "fear" | "despair" | "wound" | "loss" | "doubt";

export interface Condition {
  id: ConditionId;
  name: string;
  value: number;
  max: number;
  /** Display name of the resisting stat (e.g. "Logic"). */
  resist: string;
  /** Id of the resisting stat (e.g. "logic"). */
  resistId: string;
}

/* ----------------------------------------------------------- stats/skills - */

export interface Skill {
  id: string;
  name: string;
  rank: number;
}

export interface Stat {
  id: string;
  name: string;
  rank: number;
  tone: Tone;
  icon: string;
  skills: Skill[];
}

/* --------------------------------------------------------- magic schools -- */

export interface Subject {
  key: string;
  name: string;
  /** Display name of the base stat this subject rolls off (e.g. "Creativity"). */
  stat: string;
  rank: number;
}

export interface MagicSchool {
  id: string;
  name: string;
  tone: Tone;
  icon: string;
  blurb: string;
  subjects: Subject[];
}

/* ---------------------------------------------------------------- spells -- */

export interface Spell {
  id: string;
  name: string;
  /** e.g. "Basic" | "Standard" | "Advanced" | "Legendary" | "HEX (4AP)" — open-ended. */
  level: string;
  subjectKey: string;
  subject: string;
  school: string;
  stat: string;
  ap?: number;
  dc: number | null;
  ritual: boolean;
  volatile: boolean;
  /** Days remaining to learn; 0 = known. */
  days: number;
  desc: string;
  higherLevel?: string;
  success?: string;
  fail?: string;
  /** Set when the spell was granted by an equipped wand. */
  fromWand?: string;
}

/* ----------------------------------------------------------------- moves -- */

/** One ability a (class-linked) move can be rolled with, resolved to a source. */
export interface MoveRollOption {
  ability?: string;
  kind: "skill" | "subject";
  stat: string;
  skill?: string;
  subjectKey?: string;
  label: string;
}

/** A move on the Overview rail — manual, class-granted, wand/plant/artifact-granted. */
export interface Move {
  id: string;
  name: string;
  tag?: string;
  stat?: string;
  skill?: string;
  bonus?: number;
  dc?: number | null;
  desc?: string;
  success?: string;
  fail?: string;
  // Manual-move extras:
  ap?: number;
  kind?: string;
  subjectKey?: string;
  // Class-linked move extras (parsed from the move() tag):
  rollOptions?: MoveRollOption[];
  addRank?: boolean;
  rankConditional?: string | null;
  backfire?: boolean;
  fromClass?: string;
  classLabel?: string;
  rankLevel?: number;
  // Provenance for auto-managed grants:
  fromWand?: string;
  fromPlant?: string;
  fromArtifact?: string;
  artifactCondition?: ArtifactCondition;
  artifactLevel?: string;
  artifactCost?: number;
}

/* --------------------------------------------------------------- bonuses -- */

export type BonusType = "stat" | "subject" | "skill" | "resist" | "spell" | "improve" | string;
/** "flat" = fixed value · "class" = tracks a class rank · "dos" = shifts outcome tiers. */
export type BonusValueMode = "flat" | "class" | "dos";

/** A ledger entry that adjusts a total. Conditional bonuses are offered as an
 *  opt-in in the roll window rather than applied live. */
export interface Bonus {
  id: string;
  source: string;
  type: BonusType;
  target: string;
  targetLabel: string;
  value?: number;
  active: boolean;
  valueMode?: BonusValueMode;
  /** For valueMode "class": which class rank drives the value. */
  classKey?: string;
  classLabel?: string;
  conditional?: boolean;
  condNote?: string | null;
  // Provenance for auto-managed grants:
  fromWand?: string;
  fromPlant?: string;
  fromArtifact?: string;
}

/* --------------------------------------------------------------- classes -- */

/** Per-class progression: current rank + the option chosen at each reached level. */
export interface ClassRankState {
  rank: number;
  /** level → chosen option index (0 = left option, 1 = right option). */
  choices: Record<string, number>;
}

/** classState: class id → its rank/choices. */
export type ClassState = Record<string, ClassRankState>;

/* ----------------------------------------------------------------- rolls -- */

export type RollKind =
  | "skill"
  | "move"
  | "spell"
  | "resist"
  | "attune"
  | "repair"
  | "enchant"
  | string;

export type RollOutcome = "inflection" | "crit-success" | "crit-fail" | "normal";
export type RollResult = "success" | "failure";
export type ArtifactCondition = "stable" | "damaged" | "broken";

/** Who made a roll. GM actors carry their own label; players resolve against the roster. */
export interface RollWho {
  id?: string;
  name: string;
  initials?: string;
  tone: Tone;
  gm?: boolean;
}

export interface RollCrit {
  kind: "fail" | "success";
  forces?: boolean;
  label?: string;
  text?: string;
  backfire?: boolean;
  artifactBackfire?: boolean;
  on?: "one" | "ten" | "always";
}

/** Optional resist-on-fail config attached to a roll (e.g. a failed attunement). */
export interface RollResist {
  condition?: string;
  eyebrow?: string;
  heading?: string;
  verdict?: string;
  /** DC added per degree of failure on a forced backfire save. */
  dcPerDegree?: number;
}

/** The output of makeRoll() — also the shared/durable roll payload (the `hl`
 *  function is dropped when JSON-cloned for sharing, hence optional). */
export interface Roll {
  id: string;
  ts: number;
  who: RollWho;
  label: string;
  kind: RollKind;
  stat: string;
  meta: string[] | null;
  detail: string | null;
  success: string | null;
  fail: string | null;
  hl?: ((degrees: number, isSuccess: boolean) => string) | null;
  dice: number[];
  mod: number;
  sit: number;
  sitReason: string | null;
  dc: number | null;
  total: number;
  outcome: RollOutcome;
  pass: boolean | null;
  result: RollResult | null;
  degrees: number | null;
  dosMod: number;
  crit: RollCrit | null;
  resist: RollResist | null;
  hours: number | null;
  artifactId: string | null;
  artifactLevel: string | null;
  artifactCost: number;
  artifactCondition: ArtifactCondition | null;
  /** Rolled secretly by the GM — kept out of the shared log/broadcast. */
  secret: boolean;
}

/* ------------------------------------------------------------- inventory -- */

export interface ArtifactMove {
  stat: string;
  skill: string;
  bonus: number;
  /** Null when the boon rolls without a fixed DC (manual / compendium artifacts). */
  dc: number | null;
  success?: string;
  fail?: string;
  /** Carried on manual/compendium-built boons; unused by the roll engine. */
  name?: string;
  desc?: string;
  /** Set when the artifact lists more than one skill it can be rolled with. */
  rollOptions?: MoveRollOption[];
}

export interface Artifact {
  id: string;
  name: string;
  level: string;
  tone: Tone;
  subject: string;
  /** Attunement difficulty; drops toward 0 as attunement attempts ease it. */
  intensity: number;
  attuned: boolean;
  condition: ArtifactCondition;
  skills: string[];
  dc: number;
  desc: string;
  move: ArtifactMove;
  /** Build cost (carried on compendium-granted artifacts; absent on seed). */
  cost?: number;
}

export interface Potion {
  id: string;
  name: string;
  tone: Tone;
  intensity: number;
  qty: number;
  recipeId?: string;
  desc: string;
}

export interface Recipe {
  id: string;
  name: string;
  tone: Tone;
  intensity: number;
  cost: number;
  desc: string;
}

export interface Plant {
  id: string;
  name: string;
  tone: Tone;
  value: number;
  intensity: number;
  used: boolean;
  removeOnUse: boolean;
  /** Open-ended harvest descriptor, e.g. "YES" | "NO" | "BONUS (Win Over; +2)". */
  requiresRoll: string;
  desc: string;
  ability: string;
}

export type WandEffectKind = "bonus" | "move" | "spell" | "ability";

export interface WandEffectMove {
  name: string;
  stat: string;
  skill: string;
  bonus?: number;
  dc?: number | null;
  desc?: string;
  success?: string;
  fail?: string;
}

export interface WandEffect {
  kind: WandEffectKind;
  label: string;
  /** bonus effects */
  type?: BonusType;
  target?: string;
  targetLabel?: string;
  value?: number;
  /** move effects */
  move?: WandEffectMove;
  /** spell effects */
  spell?: Spell;
  /** ability effects */
  note?: string;
}

export interface Wand {
  id: string;
  dbId?: string;
  name: string;
  /** Display level/tier (drives card accent); absent on seed wands. */
  level?: string;
  equipped: boolean;
  /** Condition tracked in materials, 0..maxCondition. */
  condition: number;
  maxCondition: number;
  twisted?: boolean;
  /** Transient flag while the wand is being crafted (can't equip yet). */
  crafting?: boolean;
  desc: string;
  effect: WandEffect;
}

export interface Glyph {
  id: string;
  name: string;
  tone: Tone;
  cost: number;
  intensity: number;
  desc: string;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  desc: string;
  // Optional fields carried on compendium-sourced items (absent on seed items):
  cost?: number;
  singleUse?: boolean | string;
  check?: string | null;
  tags?: string[] | string;
  dbId?: string;
}

/** The inventory slice (app.jsx inventory state). `runeStack` is the in-progress
 *  rune being assembled from glyphs. */
export interface InventoryState {
  artifacts: Artifact[];
  potions: Potion[];
  recipes: Recipe[];
  plants: Plant[];
  wands: Wand[];
  glyphs: Glyph[];
  items: Item[];
  runeStack: Glyph[];
}

/* ----------------------------------------------------------- compendium -- */

export interface CompendiumCat {
  id: string;
  label: string;
  icon: string;
}

/** A Compendium / Archive reference entry. Heterogeneous across categories
 *  (`cat`); the optional fields cover the per-category extras. */
export interface CompendiumEntry {
  id: string;
  cat: string;
  name: string;
  tone: Tone;
  level: string;
  meta?: string[];
  cost?: string | number | null;
  desc: string;
  // spell / move fields
  subjectKey?: string;
  subject?: string;
  school?: string;
  stat?: string;
  ap?: number;
  dc?: number;
  ritual?: boolean;
  volatile?: boolean;
  higherLevel?: string;
  // artifact / potion / plant / glyph fields
  skills?: string[];
  /** Per-skill {stat, skill} pairs aligned with `skills`, for artifacts with multiple skill options. */
  skillOptions?: { stat: string; skill: string }[];
  mat?: number;
  intensity?: number;
  value?: number;
  removeOnUse?: boolean;
  requiresRoll?: string;
  ability?: string;
  // wand fields
  bonusLabel?: string;
  condition?: string;
  // item fields
  singleUse?: boolean;
  check?: string | null;
  tags?: string[];
}

/* ----------------------------------------------------- the durable sheet -- */

/** The serialized character — the durable contract persisted to
 *  `characters.sheet`. Mirrors app.jsx serializeSheet() exactly. */
export interface SerializedSheet {
  /** Schema version. */
  v: 1;
  c: CharacterVitals;
  conditions: Condition[];
  stats: Stat[];
  schools: MagicSchool[];
  classes: {
    rp: number;
    classState: ClassState;
  };
  magic: {
    bonuses: Bonus[];
    spells: Spell[];
    moves: Move[];
  };
  inventory: InventoryState;
  /** Party map locations, keyed by character id. */
  locations: Record<string, unknown>;
}
