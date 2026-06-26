"use client";

/* ===========================================================================
   Starfall Academy — inventory state
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/inventory-state.js (window.useInventoryState).
   Owns artifacts, potions, recipes, plants, wands, glyphs, items, and the rune
   stack, plus their handlers. Cross-module setters (materials / moves / bonuses
   / spells) are passed in at call time, exactly as in the prototype.
   =========================================================================== */
import * as React from "react";
import type {
  Artifact,
  ArtifactCondition,
  Bonus,
  CharacterVitals,
  Glyph,
  Item,
  Move,
  Plant,
  Potion,
  Recipe,
  Spell,
  Stat,
  Wand,
} from "../types";
import { INV } from "../data/inventory";
import type { PendingPrompt } from "./useRollState";
import type { RollInput } from "../data/roll-engine";

type SetMaterials = React.Dispatch<React.SetStateAction<CharacterVitals>>;
type SetMoves = React.Dispatch<React.SetStateAction<Move[]>>;
type SetBonuses = React.Dispatch<React.SetStateAction<Bonus[]>>;
type SetSpells = React.Dispatch<React.SetStateAction<Spell[]>>;

export interface RollSystem {
  openPrompt: (partial: PendingPrompt["partial"], anchorEl: HTMLElement) => void;
  pushRoll: (input: RollInput) => unknown;
}

export interface InventoryCaps {
  attuneCap: number;
}

type FacByName = (name: string) => Stat | undefined;
type SubRank = (key: string) => number;

export function useInventoryState(
  facByName: FacByName,
  subRank: SubRank,
  caps: InventoryCaps,
  rollSystem: RollSystem
) {
  const [artifacts, setArtifacts] = React.useState<Artifact[]>(() => (INV.artifacts || []).map((x) => ({ ...x })));
  const [potions, setPotions] = React.useState<Potion[]>(() => (INV.potions || []).map((x) => ({ ...x })));
  const [recipes, setRecipes] = React.useState<Recipe[]>(() => (INV.recipes || []).map((x) => ({ ...x })));
  const [plants, setPlants] = React.useState<Plant[]>(() => (INV.plants || []).map((x) => ({ ...x })));
  const [wands, setWands] = React.useState<Wand[]>(() => (INV.wands || []).map((x) => ({ ...x })));
  const [glyphs, setGlyphs] = React.useState<Glyph[]>(() => (INV.glyphs || []).map((x) => ({ ...x })));
  const [items, setItems] = React.useState<Item[]>(() => (INV.items || []).map((x) => ({ ...x })));
  const [runeStack, setRuneStack] = React.useState<Glyph[]>([]);
  const [invToast, setInvToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = (msg: string) => {
    setInvToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setInvToast(null), 2800);
  };

  const adjustMaterials = (delta: number, cb?: SetMaterials) => {
    if (cb) cb((prev) => ({ ...prev, materials: Math.max(0, (prev.materials || 0) + delta) }));
  };

  const facRank = (n: string) => (facByName(n) ? facByName(n)!.rank : 0);
  const heldCount = potions.reduce((s, p) => s + p.qty, 0);
  const attunedCount = artifacts.filter((a) => a.attuned).length;
  const plantSum = plants.reduce((s, p) => s + (p.value || 0), 0);

  // ---- Artifact handlers ----
  const attune = (a: Artifact, anchor: HTMLElement, setMoves?: SetMoves) => {
    if (a.attuned || attunedCount >= caps.attuneCap) return;
    const mod = facRank("Creativity") + subRank("artificy");
    rollSystem.openPrompt(
      {
        label: "Attune to " + a.name,
        kind: "skill",
        stat: "Creativity",
        mod,
        dc: a.intensity,
        meta: ["Artificy", "Attunement"],
        detail: a.desc,
        onResult: (roll) => {
          if (roll.pass) {
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, attuned: true, intensity: 0 } : x)));
            if (setMoves) {
              setMoves((prev) =>
                prev.find((m) => m.fromArtifact === a.id)
                  ? prev
                  : [...prev, { id: "mv-" + a.id, name: a.name, tag: "Artifact", stat: a.move.stat, skill: a.move.skill, bonus: a.move.bonus, dc: a.move.dc, desc: a.desc, success: a.move.success, fail: a.move.fail, fromArtifact: a.id, artifactCondition: "stable" }]
              );
            }
          } else {
            const key = String(Math.max(-11, Math.min(-1, -(roll.degrees || 0))));
            const ease = INV.attuneEase[key] || 0;
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, intensity: Math.max(0, x.intensity + ease) } : x)));
          }
        },
      },
      anchor
    );
  };

  const repairArtifact = (a: Artifact, speed: "fast" | "medium" | "slow", anchor: HTMLElement, setMoves?: SetMoves) => {
    const cfg = INV.repair[speed] || INV.repair.medium;
    const dc = (cfg.dc as Record<string, number>)[a.condition] || 18;
    const time = (cfg.time as Record<string, string>)[a.condition] || "";
    const mod = facRank("Creativity") + subRank("artificy");
    rollSystem.openPrompt(
      {
        label: cfg.label + " repair · " + a.name,
        kind: "repair",
        stat: "Creativity",
        mod,
        dc,
        meta: ["Artificy", "Repair", cfg.label],
        detail: "Mend the " + a.condition + " " + a.name + " — " + time + " of work.",
        onResult: (roll) => {
          if (roll.pass) {
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "stable" } : x)));
            if (setMoves) setMoves((prev) => prev.map((m) => (m.fromArtifact === a.id ? { ...m, artifactCondition: "stable" } : m)));
          } else if (a.condition === "broken") {
            setArtifacts((prev) => prev.map((x) => (x.id === a.id ? { ...x, condition: "damaged" } : x)));
            if (setMoves) setMoves((prev) => prev.map((m) => (m.fromArtifact === a.id ? { ...m, artifactCondition: "damaged" } : m)));
          }
        },
      },
      anchor
    );
  };

  const removeArtifact = (a: Artifact, setMoves?: SetMoves) => {
    setArtifacts((prev) => prev.filter((x) => x.id !== a.id));
    if (setMoves) setMoves((prev) => prev.filter((m) => m.fromArtifact !== a.id));
  };

  // ---- Potion handlers ----
  const mintVial = (recipe: Recipe) => {
    setPotions((prev) => {
      if (prev.reduce((s, p) => s + p.qty, 0) >= INV.potionCap) return prev;
      const ex = prev.find((p) => p.name === recipe.name);
      if (ex) return prev.map((p) => (p.id === ex.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id: "pot-" + Date.now(), name: recipe.name, tone: recipe.tone, intensity: recipe.intensity, qty: 1, recipeId: recipe.id, desc: recipe.desc }];
    });
  };

  const brew = (r: Recipe, anchor: HTMLElement, setC?: SetMaterials) => {
    const mod = facRank("Creativity") + subRank("alchemy");
    rollSystem.openPrompt(
      {
        label: "Brew " + r.name, kind: "skill", stat: "Creativity", mod, dc: r.intensity,
        meta: ["Alchemy", "Brew"], detail: r.desc,
        onResult: (roll) => {
          adjustMaterials(-r.cost, setC);
          if (roll.pass) mintVial(r);
        },
      },
      anchor
    );
  };

  const takePotion = (p: Potion, anchor: HTMLElement) => {
    const mod = facRank("Creativity") + subRank("alchemy");
    rollSystem.openPrompt(
      {
        label: "Take " + p.name, kind: "skill", stat: "Creativity", mod, dc: p.intensity,
        meta: ["Potion"], detail: p.desc,
        onResult: () => {
          setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
        },
      },
      anchor
    );
  };

  const discardPotion = (p: Potion) => setPotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0));
  const removePotion = (p: Potion) => setPotions((prev) => prev.filter((x) => x.id !== p.id));
  const removeRecipe = (r: Recipe) => setRecipes((prev) => prev.filter((x) => x.id !== r.id));

  // ---- Plant handlers ----
  const usePlant = (pl: Plant, anchor: HTMLElement) => {
    const mod = facRank("Insight") + subRank("herbalism");
    rollSystem.openPrompt(
      {
        label: "Use " + pl.name, kind: "skill", stat: "Insight", mod, dc: pl.intensity,
        meta: ["Herbalism"], detail: pl.ability || pl.desc,
        onResult: () => {
          if (pl.removeOnUse) setPlants((prev) => prev.filter((x) => x.id !== pl.id));
          else setPlants((prev) => prev.map((x) => (x.id === pl.id ? { ...x, used: true } : x)));
        },
      },
      anchor
    );
  };

  const harvestPlant = (pl: Plant, setC?: SetMaterials) => {
    adjustMaterials(pl.value, setC);
    setPlants((prev) => prev.filter((x) => x.id !== pl.id));
    toast(pl.name + " harvested · +" + pl.value + " materials");
  };

  const removePlant = (pl: Plant) => setPlants((prev) => prev.filter((x) => x.id !== pl.id));

  // ---- Wand handlers ----
  const equipWand = (w: Wand, setBonuses: SetBonuses, setMoves: SetMoves, setSpells: SetSpells) => {
    const equipping = !w.equipped;
    setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, equipped: equipping } : { ...x, equipped: false })));
    setBonuses((prev) => prev.filter((b) => !b.fromWand));
    setMoves((prev) => prev.filter((m) => !m.fromWand));
    setSpells((prev) => prev.filter((s) => !s.fromWand));
    // Re-applying the equipping wand's grant is handled by the App (magic state).
  };

  const repairWand = (w: Wand, anchor: HTMLElement) => {
    const mod = facRank("Focus") + subRank("wandcrafting");
    rollSystem.openPrompt(
      {
        label: "Repair " + w.name, kind: "skill", stat: "Focus", mod, dc: 18,
        meta: ["Wandcrafting", "Repair"], detail: w.desc,
        onResult: (roll) => {
          if (roll.pass) setWands((prev) => prev.map((x) => (x.id === w.id ? { ...x, condition: x.maxCondition } : x)));
        },
      },
      anchor
    );
  };

  const removeWand = (w: Wand, setBonuses: SetBonuses, setMoves: SetMoves, setSpells: SetSpells) => {
    setWands((prev) => prev.filter((x) => x.id !== w.id));
    setBonuses((prev) => prev.filter((b) => b.fromWand !== w.id));
    setMoves((prev) => prev.filter((m) => m.fromWand !== w.id));
    setSpells((prev) => prev.filter((s) => s.fromWand !== w.id));
  };

  // ---- Rune handlers ----
  const addToRune = (g: Glyph) => setRuneStack((prev) => [...prev, g]);
  const removeFromRune = (i: number) => setRuneStack((prev) => prev.filter((_, idx) => idx !== i));
  const clearRune = () => setRuneStack([]);
  const createRune = (anchor: HTMLElement, setC?: SetMaterials) => {
    const cost = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
    const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
    const name = runeStack.map((g) => g.name).join(" + ");
    const mod = facRank("Logic") + subRank("runology");
    rollSystem.openPrompt(
      {
        label: "Rune · " + name, kind: "skill", stat: "Logic", mod, dc: intensity,
        meta: ["Runology", "Rune"], detail: "Inscribe a rune combining " + name + ".",
        onResult: () => {
          adjustMaterials(-cost, setC);
          setRuneStack([]);
        },
      },
      anchor
    );
  };

  const removeGlyph = (g: Glyph) => setGlyphs((prev) => prev.filter((x) => x.id !== g.id));
  const removeItem = (it: Item) => setItems((prev) => prev.filter((x) => x.id !== it.id));

  const useItem = (it: Item, _anchor?: HTMLElement) => {
    void _anchor;
    const singleUse = (it as Item & { singleUse?: boolean | string }).singleUse;
    const isSingleUse = singleUse === true || String(singleUse || "").toUpperCase() === "YES";
    if (isSingleUse) {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, qty: Math.max(0, (x.qty || 1) - 1) } : x)).filter((x) => (x.qty || 0) > 0));
    }
    toast(it.name + " · used");
  };

  return {
    state: { artifacts, potions, recipes, plants, wands, glyphs, items, runeStack, invToast, heldCount, attunedCount, plantSum },
    handlers: {
      adjustMaterials, attune, repairArtifact, removeArtifact,
      mintVial, brew, takePotion, discardPotion, removePotion, removeRecipe,
      usePlant, harvestPlant, removePlant,
      equipWand, repairWand, removeWand,
      addToRune, removeFromRune, clearRune, createRune,
      removeGlyph, removeItem, useItem, toast,
    },
    setState: { setArtifacts, setPotions, setRecipes, setPlants, setWands, setGlyphs, setItems, setRuneStack },
  };
}
