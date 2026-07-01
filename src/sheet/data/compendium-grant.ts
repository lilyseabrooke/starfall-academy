/* ===========================================================================
   Starfall Academy — compendium → inventory grant transform
   ---------------------------------------------------------------------------
   The generic "Add from the Archive" mapping (compendium entry → inventory
   record), extracted from CharacterSheet.tsx's onAdd so it can also run
   GM-side (GmView.tsx) when persisting a durable grant to an offline player.
   Pure: no React state, no side effects. Covers only the categories the GM
   grant UI offers (artifact/potion/plant/wand/glyph/item) — spell/move stay
   inline in onAdd, and the specialized flows (onAddAttuned, onAddLearning,
   onAddPotionSheaf, onAddPotionRecipe, onAddWandCraft) are untouched.
   =========================================================================== */
import type { Artifact, Recipe, Plant, Wand, Glyph, Item, CompendiumEntry } from "../types";

export type CompendiumGrantResult =
  | { field: "artifacts"; value: Artifact[] }
  | { field: "recipes"; value: Recipe[] }
  | { field: "plants"; value: Plant[] }
  | { field: "wands"; value: Wand[] }
  | { field: "glyphs"; value: Glyph[] }
  | { field: "items"; value: Item[] };

export function computeCompendiumGrant(
  e: CompendiumEntry,
  currentField: Artifact[] | Recipe[] | Plant[] | Wand[] | Glyph[] | Item[]
): CompendiumGrantResult | null {
  switch (e.cat) {
    case "artifact": {
      const prev = currentField as Artifact[];
      return { field: "artifacts", value: [...prev, { id: "art-comp-" + e.id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "—", intensity: e.intensity != null ? e.intensity : 3, attuned: false, condition: "stable", skills: [], dc: 0, desc: e.desc, move: { name: e.name + " — Boon", stat: "Insight", skill: "—", bonus: 0, dc: null, desc: e.desc } }] };
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
