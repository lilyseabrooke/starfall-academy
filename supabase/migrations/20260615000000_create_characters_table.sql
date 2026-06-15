-- ============================================================
-- CHARACTERS TABLE
-- ============================================================
CREATE TABLE characters (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- ── Bio ────────────────────────────────────────────────────
  name      text NOT NULL DEFAULT '',
  pronouns  text NOT NULL DEFAULT '',
  house     text NOT NULL DEFAULT '',
  year      text NOT NULL DEFAULT '',

  -- ── Core resources ─────────────────────────────────────────
  -- action_points: 0-6 (CSS hides +/- at limits)
  action_points  smallint NOT NULL DEFAULT 0 CHECK (action_points  BETWEEN 0 AND 6),
  rank_points    smallint NOT NULL DEFAULT 0,
  -- resolve: 0-5 (one pip per condition slot)
  resolve        smallint NOT NULL DEFAULT 5 CHECK (resolve        BETWEEN 0 AND 5),
  trouble        smallint NOT NULL DEFAULT 0 CHECK (trouble        >= 0),
  materials      integer  NOT NULL DEFAULT 0 CHECK (materials      >= 0),
  improvement_mode boolean NOT NULL DEFAULT false,

  -- ── Conditions (each 0-3) ──────────────────────────────────
  fear    smallint NOT NULL DEFAULT 0 CHECK (fear    BETWEEN 0 AND 3),
  despair smallint NOT NULL DEFAULT 0 CHECK (despair BETWEEN 0 AND 3),
  wound   smallint NOT NULL DEFAULT 0 CHECK (wound   BETWEEN 0 AND 3),
  loss    smallint NOT NULL DEFAULT 0 CHECK (loss    BETWEEN 0 AND 3),
  doubt   smallint NOT NULL DEFAULT 0 CHECK (doubt   BETWEEN 0 AND 3),

  -- ── Core stats (0-20) ──────────────────────────────────────
  -- Bonuses from items/abilities are stored in bonuses[] and computed in-app.
  focus      smallint NOT NULL DEFAULT 0 CHECK (focus      BETWEEN 0 AND 20),
  creativity smallint NOT NULL DEFAULT 0 CHECK (creativity BETWEEN 0 AND 20),
  logic      smallint NOT NULL DEFAULT 0 CHECK (logic      BETWEEN 0 AND 20),
  insight    smallint NOT NULL DEFAULT 0 CHECK (insight    BETWEEN 0 AND 20),
  body       smallint NOT NULL DEFAULT 0 CHECK (body       BETWEEN 0 AND 20),
  charm      smallint NOT NULL DEFAULT 0 CHECK (charm      BETWEEN 0 AND 20),

  -- ── Skills (24 skills, base values only) ───────────────────
  -- Keys: concentration, recall_information, search, willpower,
  --       art, hide_object, improvise, sleight_of_hand,
  --       analyze, comprehend, research, tracking,
  --       creature, investigate, perception, read_person,
  --       agility, athletics, endurance, stealth,
  --       deception, tact, persuasion, win_over
  -- Shape: { "concentration": 3, "search": 0, ... }
  skills jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- ── Magic subjects (24 subjects, base values only) ─────────
  -- Creation:  wandcrafting, alchemy, enchantment, runology, herbalism, artificy
  -- Natural:   evocation, transmutation, illusion, telekinesis, warding, restoration
  -- Spectral:  chronomancy, teleportation, necromancy, summoning, divination, hypnomancy
  -- Wisdom:    demonology, draconology, bestiology, crystallomancy, counterhexology, arcane_history
  -- Shape: { "evocation": 5, "alchemy": 0, ... }
  magic_subjects jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- ── Classes (12 classes) ───────────────────────────────────
  -- Classes: pupil, socialite, rascal, heir, renegade, naturalist,
  --          alchemist, professor, enforcer, artificer, wandjock, mastermind
  -- Shape: { "pupil": { "rank": 3, "choices": ["left","right",null,...] }, ... }
  --   choices is a 10-element array; index 0 = rank 1 choice, null = not yet reached
  classes jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- ── Spells ─────────────────────────────────────────────────
  -- Each item: { name, level, field, stat, class_rank, misc_bonus,
  --              volatile, ritual, dc, ap_cost, days_to_learn,
  --              description, dos_behavior }
  --   level: "basic"|"standard"|"advanced"|"legendary"|"hex"
  --   field: any magic subject key
  --   stat: "default"|"focus"|"creativity"|"logic"|"insight"|"body"|"charm"
  --   class_rank: "none"|any class key
  spells jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Moves ──────────────────────────────────────────────────
  -- Each item: { name, field, roll_type, roll_stat, roll_subject, roll_skill,
  --              class_rank, misc_bonus, dc, ap_cost, backfire,
  --              description, linked_artifact_id }
  --   roll_type: "stat"|"subject"|"skill"
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Wands ──────────────────────────────────────────────────
  -- Each item: { name, equipped, condition, max_condition, description }
  --   condition/max_condition: integers (material capacity)
  wands jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Potions ────────────────────────────────────────────────
  -- Each item: { name, quantity, cost, intensity, has_recipe, description }
  potions jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Artifacts ──────────────────────────────────────────────
  -- Each item: { name, level, subject, intensity, attuned,
  --              condition, description, linked_move_ids[] }
  --   level: "basic"|"standard"|"advanced"|"legendary"|"twisted"
  --   condition: "stable"|"damaged"|"broken"
  artifacts jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Glyphs ─────────────────────────────────────────────────
  -- Each item: { name, cost, intensity, description }
  glyphs jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Plants ─────────────────────────────────────────────────
  -- Each item: { name, value, intensity, description, ability, used, remove_on_use }
  plants jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── General items ──────────────────────────────────────────
  -- Each item: { name, quantity, description }
  items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Active bonuses ─────────────────────────────────────────
  -- Replaces the per-field *bonus attributes from Roll20.
  -- Each item: { type, category, value, source, active }
  --   type: "stat"|"subject"|"skill"
  --   category: the specific stat/subject/skill key
  --   value: integer
  --   source: text description of where the bonus comes from
  --   active: boolean
  bonuses jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- ── Active rune (glyph stack) ──────────────────────────────
  -- The composed rune currently loaded from glyphs.
  -- Shape: { "name": "...", "cost": 100, "intensity": 3 }
  glyph_stack jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX characters_user_id_idx ON characters (user_id);

-- ── Row-level security ─────────────────────────────────────────
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_characters"
  ON characters
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
