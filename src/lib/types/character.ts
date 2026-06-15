// ── Enumerations ────────────────────────────────────────────────────────────

export type House = string;
export type Year = '1' | '2' | '3' | '4' | '5' | '6' | '7';

export type ConditionLevel = 0 | 1 | 2 | 3;

export type SpellLevel = 'basic' | 'standard' | 'advanced' | 'legendary' | 'hex';
export type ArtifactLevel = 'basic' | 'standard' | 'advanced' | 'legendary' | 'twisted';
export type ArtifactCondition = 'stable' | 'damaged' | 'broken';
export type RollStat = 'focus' | 'creativity' | 'logic' | 'insight' | 'body' | 'charm';
export type RollType = 'stat' | 'subject' | 'skill';
export type BonusType = 'stat' | 'subject' | 'skill';

// ── Stat / Skill / Subject keys ─────────────────────────────────────────────

export type StatKey = 'focus' | 'creativity' | 'logic' | 'insight' | 'body' | 'charm';

export type SkillKey =
  | 'concentration' | 'recall_information' | 'search' | 'willpower'
  | 'art' | 'hide_object' | 'improvise' | 'sleight_of_hand'
  | 'analyze' | 'comprehend' | 'research' | 'tracking'
  | 'creature' | 'investigate' | 'perception' | 'read_person'
  | 'agility' | 'athletics' | 'endurance' | 'stealth'
  | 'deception' | 'tact' | 'persuasion' | 'win_over';

export type MagicSubjectKey =
  // Creation
  | 'wandcrafting' | 'alchemy' | 'enchantment' | 'runology' | 'herbalism' | 'artificy'
  // Natural
  | 'evocation' | 'transmutation' | 'illusion' | 'telekinesis' | 'warding' | 'restoration'
  // Spectral
  | 'chronomancy' | 'teleportation' | 'necromancy' | 'summoning' | 'divination' | 'hypnomancy'
  // Wisdom
  | 'demonology' | 'draconology' | 'bestiology' | 'crystallomancy' | 'counterhexology' | 'arcane_history';

export type ClassKey =
  | 'pupil' | 'socialite' | 'rascal' | 'heir' | 'renegade' | 'naturalist'
  | 'alchemist' | 'professor' | 'enforcer' | 'artificer' | 'wandjock' | 'mastermind';

// ── Repeating section item types ─────────────────────────────────────────────

export interface Spell {
  id: string;
  name: string;
  level: SpellLevel;
  field: MagicSubjectKey;
  stat: 'default' | RollStat;
  class_rank: 'none' | ClassKey;
  misc_bonus: number;
  volatile: boolean;
  ritual: boolean;
  dc: number;
  ap_cost: number;
  days_to_learn: number; // 0 = learned
  description: string;
  dos_behavior: string;
}

export interface Move {
  id: string;
  name: string;
  field: MagicSubjectKey | string;
  roll_type: RollType;
  roll_stat: RollStat | '';
  roll_subject: MagicSubjectKey | '';
  roll_skill: SkillKey | '';
  class_rank: 'none' | ClassKey;
  misc_bonus: number;
  dc: number;
  ap_cost: number;
  backfire: boolean;
  description: string;
  linked_artifact_id: string | null;
}

export interface Wand {
  id: string;
  name: string;
  equipped: boolean;
  condition: number;
  max_condition: number;
  description: string;
}

export interface Potion {
  id: string;
  name: string;
  quantity: number;
  cost: number;
  intensity: number;
  has_recipe: boolean;
  description: string;
}

export interface Artifact {
  id: string;
  name: string;
  level: ArtifactLevel;
  subject: MagicSubjectKey | '';
  intensity: number;
  attuned: boolean;
  condition: ArtifactCondition;
  description: string;
  linked_move_ids: string[];
}

export interface Glyph {
  id: string;
  name: string;
  cost: number;
  intensity: number;
  description: string;
}

export interface Plant {
  id: string;
  name: string;
  value: number;
  intensity: number;
  description: string;
  ability: string;
  used: boolean;
  remove_on_use: boolean;
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  description: string;
}

export interface Bonus {
  id: string;
  type: BonusType;
  category: StatKey | SkillKey | MagicSubjectKey;
  value: number;
  source: string;
  active: boolean;
}

export interface ClassEntry {
  rank: number;
  // 10-element array; index 0 = rank-1 choice, null = not yet reached
  choices: Array<'left' | 'right' | null>;
}

export interface GlyphStack {
  name: string;
  cost: number;
  intensity: number;
}

// ── Root sheet type ──────────────────────────────────────────────────────────

export interface CharacterSheet {
  // Bio
  pronouns: string;
  house: string;
  year: Year | '';

  // Core resources
  action_points: number;   // 0-6
  rank_points: number;
  resolve: number;         // 0-5
  trouble: number;
  materials: number;

  // Conditions (0-3 each)
  fear: ConditionLevel;
  despair: ConditionLevel;
  wound: ConditionLevel;
  loss: ConditionLevel;
  doubt: ConditionLevel;

  // Core stats (0-20)
  focus: number;
  creativity: number;
  logic: number;
  insight: number;
  body: number;
  charm: number;

  // Skills & magic (base values only; bonuses are in bonuses[])
  skills: Record<SkillKey, number>;
  magic_subjects: Record<MagicSubjectKey, number>;

  // Classes
  classes: Partial<Record<ClassKey, ClassEntry>>;

  // Repeating sections
  spells: Spell[];
  moves: Move[];
  wands: Wand[];
  potions: Potion[];
  artifacts: Artifact[];
  glyphs: Glyph[];
  plants: Plant[];
  items: Item[];

  // Active modifiers
  bonuses: Bonus[];

  // Composed rune loaded from glyphs
  glyph_stack: GlyphStack | null;
}

// ── Row type (what Supabase returns) ────────────────────────────────────────

export interface CharacterRow {
  id: string;
  owner_id: string;
  campaign_id: string | null;
  type: 'pc' | 'npc';
  name: string;
  sheet: CharacterSheet;
  created_at: string;
  updated_at: string;
}

// ── Default sheet ────────────────────────────────────────────────────────────

const DEFAULT_SKILLS: Record<SkillKey, number> = {
  concentration: 0, recall_information: 0, search: 0, willpower: 0,
  art: 0, hide_object: 0, improvise: 0, sleight_of_hand: 0,
  analyze: 0, comprehend: 0, research: 0, tracking: 0,
  creature: 0, investigate: 0, perception: 0, read_person: 0,
  agility: 0, athletics: 0, endurance: 0, stealth: 0,
  deception: 0, tact: 0, persuasion: 0, win_over: 0,
};

const DEFAULT_MAGIC_SUBJECTS: Record<MagicSubjectKey, number> = {
  wandcrafting: 0, alchemy: 0, enchantment: 0, runology: 0, herbalism: 0, artificy: 0,
  evocation: 0, transmutation: 0, illusion: 0, telekinesis: 0, warding: 0, restoration: 0,
  chronomancy: 0, teleportation: 0, necromancy: 0, summoning: 0, divination: 0, hypnomancy: 0,
  demonology: 0, draconology: 0, bestiology: 0, crystallomancy: 0, counterhexology: 0, arcane_history: 0,
};

export function defaultSheet(): CharacterSheet {
  return {
    pronouns: '',
    house: '',
    year: '',

    action_points: 0,
    rank_points: 0,
    resolve: 5,
    trouble: 0,
    materials: 0,

    fear: 0,
    despair: 0,
    wound: 0,
    loss: 0,
    doubt: 0,

    focus: 0,
    creativity: 0,
    logic: 0,
    insight: 0,
    body: 0,
    charm: 0,

    skills: { ...DEFAULT_SKILLS },
    magic_subjects: { ...DEFAULT_MAGIC_SUBJECTS },
    classes: {},

    spells: [],
    moves: [],
    wands: [],
    potions: [],
    artifacts: [],
    glyphs: [],
    plants: [],
    items: [],

    bonuses: [],
    glyph_stack: null,
  };
}
