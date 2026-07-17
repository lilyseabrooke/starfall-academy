/* ===========================================================================
   Starfall Academy — compendium → inventory grant transform
   ---------------------------------------------------------------------------
   The compendium-entry → inventory-record mappings, extracted from
   CharacterSheet.tsx's onAdd/onAddAttuned/onAddLearning/onAddPotionSheaf/
   onAddPotionRecipe/onAddWandCraft so the SAME transform can run GM-side
   (GmView.tsx) when persisting a durable grant to an offline player. Pure:
   no React state, no side effects.
   =========================================================================== */
import type { Artifact, ArtifactMove, Recipe, Plant, Wand, Glyph, Item, Potion, Spell, Move, MoveRollOption, CompendiumEntry } from "../types";

/** Builds an artifact's boon-move stat/skill/rollOptions from its (possibly multi-skill) compendium entry. */
function artifactMoveFrom(e: CompendiumEntry): ArtifactMove {
  const rollOptions: MoveRollOption[] | undefined =
    e.skillOptions && e.skillOptions.length > 1
      ? e.skillOptions.map((o) => ({ kind: "skill", stat: o.stat, skill: o.skill, label: o.skill }))
      : undefined;
  const prim = (e.skillOptions && e.skillOptions[0]) || { stat: e.stat || "Insight", skill: (e.skills && e.skills[0]) || "—" };
  return { name: e.name + " — Boon", stat: prim.stat || "Insight", skill: prim.skill || "—", bonus: 0, dc: e.dc ?? null, desc: e.desc, rollOptions };
}

export type CompendiumGrantResult =
  | { field: "artifacts"; value: Artifact[] }
  | { field: "recipes"; value: Recipe[] }
  | { field: "plants"; value: Plant[] }
  | { field: "wands"; value: Wand[] }
  | { field: "glyphs"; value: Glyph[] }
  | { field: "items"; value: Item[] }
  | { field: "potions"; value: Potion[] }
  | { field: "spells"; value: Spell[] };

/** Days-to-learn a spell, keyed by level tier — shared by onAddLearning and its GM equivalent. */
export function learnDaysFor(level: string): number {
  const l = (level || "").toLowerCase();
  if (l.startsWith("basic")) return 1;
  if (l.startsWith("standard")) return 2;
  if (l.startsWith("advanced")) return 5;
  return 10;
}

/** The generic "Add to sheet" mapping (onAdd): fully-learned spells, one-off
 * grants for artifact/plant/wand/glyph, a recipe for potion, qty-merge for item. */
export function computeCompendiumGrant(
  e: CompendiumEntry,
  currentField: Artifact[] | Recipe[] | Plant[] | Wand[] | Glyph[] | Item[] | Spell[]
): CompendiumGrantResult | null {
  switch (e.cat) {
    case "spell": {
      const prev = currentField as Spell[];
      const id = "sp-comp-" + e.id;
      if (prev.find((s) => s.id === id)) return { field: "spells", value: prev };
      return { field: "spells", value: [...prev, { id, name: e.name, level: e.level, subjectKey: e.subjectKey || "", subject: e.subject || "", school: e.school || "", stat: e.stat || "", ap: e.ap || 0, dc: e.dc ?? null, ritual: !!e.ritual, volatile: false, days: 0, desc: e.desc, replaceCheck: e.replaceCheck }] };
    }
    case "artifact": {
      const prev = currentField as Artifact[];
      return { field: "artifacts", value: [...prev, { id: "art-comp-" + e.id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "—", intensity: e.intensity != null ? e.intensity : 3, attuned: false, condition: "stable", skills: e.skills || [], dc: e.dc ?? 0, desc: e.desc, move: artifactMoveFrom(e) }] };
    }
    case "potion": {
      const prev = currentField as Recipe[];
      const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0;
      return { field: "recipes", value: [...prev, { id: "rec-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, cost, desc: e.desc }] };
    }
    case "plant": {
      const prev = currentField as Plant[];
      return { field: "plants", value: [...prev, { id: "plt-comp-" + e.id, name: e.name, tone: e.tone, value: e.value || 0, intensity: e.intensity || 1, used: false, removeOnUse: !!e.removeOnUse, requiresRoll: e.requiresRoll || "YES", desc: e.desc, ability: e.ability || e.desc }] };
    }
    case "wand": {
      const prev = currentField as Wand[];
      const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || "");
      const val = bm ? parseInt(bm[1], 10) : 0;
      const lbl = bm ? bm[2] : "Bonus";
      return { field: "wands", value: [...prev, { id: "wnd-comp-" + e.id, name: e.name, equipped: false, condition: 6, maxCondition: 6, desc: e.desc, effect: { kind: "bonus", label: lbl, type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } }] };
    }
    case "glyph": {
      const prev = currentField as Glyph[];
      return { field: "glyphs", value: [...prev, { id: "gly-comp-" + e.id, name: e.name, tone: e.tone, cost: e.value || 0, intensity: e.intensity || 1, desc: e.desc }] };
    }
    case "item": {
      const prev = currentField as Item[];
      const ex = prev.find((x) => x.name === e.name);
      const value = ex
        ? prev.map((x) => (x.id === ex.id ? { ...x, qty: (x.qty || 1) + 1 } : x))
        : [...prev, { id: "itm-comp-" + e.id, name: e.name, qty: 1, cost: e.cost == null ? undefined : Number(e.cost), singleUse: e.singleUse ?? false, check: e.check ?? null, tags: e.tags ?? [], desc: e.desc }];
      return { field: "items", value };
    }
    default:
      return null;
  }
}

/** The derived "Boon" move an attuned artifact grants (mirrors useMagicState's artMove()). */
export function artifactBoonMove(a: Artifact): Move {
  return {
    id: "mv-" + a.id, name: a.name, tag: "Artifact",
    stat: a.move.stat, skill: a.move.skill, bonus: a.move.bonus,
    dc: a.move.dc, desc: a.desc, success: a.move.success, fail: a.move.fail,
    rollOptions: a.move.rollOptions,
    fromArtifact: a.id, artifactCondition: a.condition,
    artifactLevel: a.level || "Basic",
    artifactCost: a.cost || 0,
  };
}

/** onAddAttuned: artifact granted pre-attuned, plus its derived Boon move. */
export function computeAttunedArtifactGrant(
  e: CompendiumEntry,
  currentArtifacts: Artifact[],
  currentMoves: Move[]
): { artifacts: Artifact[]; moves: Move[] } | null {
  if (e.cat !== "artifact") return null;
  const art: Artifact = { id: "art-comp-" + e.id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "—", intensity: 0, attuned: true, condition: "stable", skills: e.skills || [], dc: e.dc ?? 0, desc: e.desc, move: artifactMoveFrom(e) };
  return { artifacts: [...currentArtifacts, art], moves: [...currentMoves, artifactBoonMove(art)] };
}

/** onAddLearning: spell granted with days-to-learn set by level tier. */
export function computeLearningSpellGrant(e: CompendiumEntry, currentSpells: Spell[]): { field: "spells"; value: Spell[] } | null {
  if (e.cat !== "spell") return null;
  return { field: "spells", value: [...currentSpells, { id: "sp-comp-" + e.id, name: e.name, level: e.level, subjectKey: e.subjectKey || "", subject: e.subject || "", school: e.school || "", stat: e.stat || "", ap: e.ap || 0, dc: e.dc ?? null, ritual: !!e.ritual, volatile: false, days: learnDaysFor(e.level), desc: e.desc, replaceCheck: e.replaceCheck }] };
}

/** onAddPotionSheaf: a physical potion instance (qty-merge by name), capped. */
export function computePotionSheafGrant(e: CompendiumEntry, currentPotions: Potion[], sheafCap: number): { field: "potions"; value: Potion[] } | null {
  if (e.cat !== "potion") return null;
  if (currentPotions.reduce((s, p) => s + p.qty, 0) >= sheafCap) return null;
  const ex = currentPotions.find((p) => p.name === e.name);
  const value = ex
    ? currentPotions.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p))
    : [...currentPotions, { id: "pot-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, qty: 1, desc: e.desc }];
  return { field: "potions", value };
}

/** onAddPotionRecipe: the recipe to brew a potion (no duplicate by name). */
export function computePotionRecipeGrant(e: CompendiumEntry, currentRecipes: Recipe[]): { field: "recipes"; value: Recipe[] } | null {
  if (e.cat !== "potion") return null;
  if (currentRecipes.find((r) => r.name === e.name)) return null;
  const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0;
  return { field: "recipes", value: [...currentRecipes, { id: "rec-comp-" + e.id, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, cost, desc: e.desc }] };
}

/** onAddWandCraft: a wand crafting project (condition starts at 0, unique per grant). */
export function computeWandCraftGrant(e: CompendiumEntry, currentWands: Wand[]): { field: "wands"; value: Wand[] } | null {
  if (e.cat !== "wand") return null;
  const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || "");
  const val = bm ? parseInt(bm[1], 10) : 0;
  const lbl = bm ? bm[2] : "Bonus";
  const matMax = e.mat || 6;
  return { field: "wands", value: [...currentWands, { id: "wnd-craft-" + e.id + "-" + Date.now(), name: e.name, equipped: false, condition: 0, maxCondition: matMax, crafting: true, desc: e.desc, effect: { kind: "bonus", label: lbl, type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } }] };
}
