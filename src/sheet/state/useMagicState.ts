"use client";

/* ===========================================================================
   Starfall Academy — magic state
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/magic-state.js (window.useMagicState).
   Owns bonuses, spells, and moves; wand-grant sync, artifact/plant/class-move
   linking, and all subject/spell/move computation helpers.

   Change from the prototype: shared helpers come from ../data/shared (was
   window.SF_SHARED). Live school tree / class ranks are passed as getters.
   =========================================================================== */
import * as React from "react";
import type {
  Bonus,
  CompendiumEntry,
  MagicSchool,
  Move,
  MoveRollOption,
  Spell,
  Stat,
  Subject,
  Wand,
} from "../types";
import type { MoveSpec } from "../data/classes";
import { ROMAN, parsePlantRoll, resolveAbility, stripPlantCarry } from "../data/shared";

export interface MagicStateData {
  bonuses: Bonus[];
  spells: Spell[];
  moves: Move[];
  magicSchools: MagicSchool[];
}

export interface MagicStateInv {
  wands: Wand[];
  artifacts: import("../types").Artifact[];
}

/** A chosen class-rank ability whose tag is a move() — assembled into a Move. */
export interface ClassMoveLink {
  id: string;
  move?: MoveSpec;
  title: string;
  classLabel: string;
  rankLevel: number;
  classKey: string;
  desc: string;
}

type FacByName = (name: string) => Stat | undefined;

export function useMagicState(
  data: MagicStateData,
  inv: MagicStateInv,
  facByName: FacByName,
  getSchools?: () => MagicSchool[],
  getClassRank?: (key: string) => number
) {
  const schools = (): MagicSchool[] => (getSchools && getSchools()) || data.magicSchools;
  const classRankOf = (key: string | undefined) => (getClassRank ? getClassRank(key || "") : 0) || 0;
  const resolveVal = (b: Bonus) => (b && b.valueMode === "class" ? classRankOf(b.classKey) : (b && b.value) || 0);

  const skillRankIn = (facName: string, skName?: string) => {
    const f = facByName(facName);
    const s = f && skName ? f.skills.find((k) => k.name === skName) : undefined;
    return s ? s.rank : 0;
  };

  // ---- Wand grant builders ----
  const wandBonus = (w: Wand): Bonus => ({ id: "bn-" + w.id, source: w.name, type: w.effect.type || "subject", target: w.effect.target || "", targetLabel: w.effect.targetLabel || "", value: w.effect.value, active: true, fromWand: w.id });
  const wandMove = (w: Wand): Move => ({ id: "mv-" + w.id, name: w.effect.move!.name, tag: "Wand", stat: w.effect.move!.stat, skill: w.effect.move!.skill, bonus: w.effect.move!.bonus || 0, dc: w.effect.move!.dc, desc: w.effect.move!.desc, success: w.effect.move!.success, fail: w.effect.move!.fail, fromWand: w.id });
  const wandSpell = (w: Wand): Spell => ({ ...(w.effect.spell as Spell), fromWand: w.id });
  const wandHasBonus = (w: Wand) => !!(w.effect && w.effect.kind === "bonus" && w.effect.target);
  const wandHasMove = (w: Wand) => !!(w.effect && w.effect.kind === "move" && w.effect.move);
  const wandHasSpell = (w: Wand) => !!(w.effect && w.effect.kind === "spell" && w.effect.spell);

  // ---- Artifact move builder ----
  const artMove = (a: MagicStateInv["artifacts"][number]): Move => ({
    id: "mv-" + a.id, name: a.name, tag: "Artifact",
    stat: a.move.stat, skill: a.move.skill, bonus: a.move.bonus,
    dc: a.move.dc, desc: a.desc, success: a.move.success, fail: a.move.fail,
    fromArtifact: a.id, artifactCondition: a.condition,
    artifactLevel: a.level || "Basic",
    artifactCost: a.cost || 0,
  });

  // ---- State ----
  const [bonuses, setBonuses] = React.useState<Bonus[]>(() => {
    const base = data.bonuses.map((x) => ({ ...x }));
    inv.wands.filter((w) => w.equipped && wandHasBonus(w)).forEach((w) => base.push(wandBonus(w)));
    return base;
  });
  const [spells, setSpells] = React.useState<Spell[]>(() => {
    const base = data.spells.map((x) => ({ ...x }));
    inv.wands.filter((w) => w.equipped && wandHasSpell(w)).forEach((w) => base.push(wandSpell(w)));
    return base;
  });
  const [moves, setMoves] = React.useState<Move[]>(() => {
    const base = data.moves.map((m) => ({ ...m }));
    inv.artifacts.filter((a) => a.attuned).forEach((a) => base.push(artMove(a)));
    inv.wands.filter((w) => w.equipped && wandHasMove(w)).forEach((w) => base.push(wandMove(w)));
    return base;
  });

  // ---- Subject / school lookups ----
  const subjectByKey = (key: string): { sub: Subject; school: MagicSchool } | null => {
    for (const sc of schools()) {
      const f = sc.subjects.find((s) => s.key === key);
      if (f) return { sub: f, school: sc };
    }
    return null;
  };
  const schoolToneOf = (id: string) => (schools().find((s) => s.id === id) || ({} as Partial<MagicSchool>)).tone;

  // ---- Bonus sums (exclude conditional; class-rank values resolved live) ----
  const liveSum = (pred: (b: Bonus) => boolean) =>
    bonuses.filter((b) => b.active && !b.conditional && b.valueMode !== "dos" && pred(b)).reduce((s, b) => s + resolveVal(b), 0);
  const dosShiftFor = (pred: (b: Bonus) => boolean) =>
    bonuses.filter((b) => b.active && !b.conditional && b.valueMode === "dos" && pred(b)).reduce((s, b) => s + resolveVal(b), 0);

  const statBonusFor = (name: string) => liveSum((b) => b.type === "stat" && b.target === name);
  const subjectBonusFor = (key: string) => liveSum((b) => b.type === "subject" && b.target === key);
  const skillBonusFor = (skillId: string) => liveSum((b) => b.type === "skill" && b.target === skillId);
  const bonusFor = skillBonusFor;
  const moveBonusFor = (id: string) => liveSum((b) => b.type === "move" && b.target === id);
  const spellBonusFor = (id: string) => liveSum((b) => b.type === "spell" && b.target === id);
  const rollBonusFor = (type: string, targetKey?: string) => liveSum((b) => b.type === type && (!b.target || b.target === targetKey));

  const condBonusesFor = (pred: (b: Bonus) => boolean) =>
    bonuses
      .filter((b) => b.active && b.conditional && b.valueMode !== "dos" && pred(b))
      .map((b) => ({ id: b.id, source: b.source, value: resolveVal(b), targetLabel: b.targetLabel, condNote: b.condNote || null }));

  // ---- Modifiers ----
  const spellMod = (sp: Spell) => {
    const fr = facByName(sp.stat) ? facByName(sp.stat)!.rank : 0;
    const sk = subjectByKey(sp.subjectKey);
    return fr + statBonusFor(sp.stat) + (sk ? sk.sub.rank : 0) + subjectBonusFor(sp.subjectKey) + spellBonusFor(sp.id) + rollBonusFor("spellroll", sp.subjectKey);
  };

  const moveMod = (m: Move, optIdx?: number) => {
    const i = optIdx || 0;
    const opt: MoveRollOption = (m.rollOptions && m.rollOptions[i]) || { stat: m.stat || "", skill: m.skill, kind: "skill", label: m.skill || "" };
    const facR = facByName(opt.stat) ? facByName(opt.stat)!.rank : 0;
    let abilityRank: number;
    if (opt.kind === "subject") {
      const s = subjectByKey(opt.subjectKey || "");
      abilityRank = s ? s.sub.rank : 0;
    } else abilityRank = skillRankIn(opt.stat, opt.skill);
    const rankAdd = m.addRank && m.fromClass ? classRankOf(m.fromClass) : 0;
    return facR + statBonusFor(opt.stat) + abilityRank + (m.bonus || 0) + rankAdd + moveBonusFor(m.id);
  };

  // ---- Spell handlers ----
  const addMove = (m: Move) => setMoves((prev) => [...prev, m]);
  const updateMove = (m: Partial<Move> & { id: string }) => setMoves((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
  const removeMove = (id: string) => setMoves((prev) => prev.filter((x) => x.id !== id));
  const addSpell = (sp: Spell) => setSpells((prev) => (prev.find((x) => x.id === sp.id) ? prev : [...prev, sp]));
  const updateSpell = (sp: Partial<Spell> & { id: string }) => setSpells((prev) => prev.map((x) => (x.id === sp.id ? { ...x, ...sp } : x)));
  const removeSpell = (sp: { id: string }) => setSpells((prev) => prev.filter((x) => x.id !== sp.id));
  const setSpellDays = (spId: string, days: number) => setSpells((prev) => prev.map((s) => (s.id === spId ? { ...s, days: Math.max(0, days) } : s)));

  // ---- Bonus handlers ----
  const addBonus = (b: Bonus) => setBonuses((prev) => [...prev, b]);
  const updateBonus = (id: string, patch: Partial<Bonus>) => setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBonus = (id: string) => setBonuses((prev) => prev.filter((b) => b.id !== id));
  const toggleBonus = (id: string) => setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  const toggleBonusConditional = (id: string) => setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, conditional: !b.conditional } : b)));
  const setBonusCondNote = (id: string, condNote: string) => setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, condNote } : b)));

  // ---- Artifact move handlers ----
  const addArtMove = (a: MagicStateInv["artifacts"][number]) => setMoves((prev) => (prev.find((m) => m.fromArtifact === a.id) ? prev : [...prev, artMove(a)]));
  const removeArtMove = (artId: string) => setMoves((prev) => prev.filter((m) => m.fromArtifact !== artId));
  const setMoveCond = (artId: string, condition: import("../types").ArtifactCondition) =>
    setMoves((prev) => prev.map((m) => (m.fromArtifact === artId ? { ...m, artifactCondition: condition } : m)));

  // ---- Class-rank linked moves ----
  const classMove = (link: ClassMoveLink): Move => {
    const spec = link.move || ({} as MoveSpec);
    const rollOptions: MoveRollOption[] = (spec.abilities || []).map((a) => {
      const r = resolveAbility(a);
      if (r) return r as MoveRollOption;
      return { ability: a, kind: "skill", stat: "—", skill: "—", label: a };
    });
    const prim = rollOptions[0] || { stat: "—", skill: "—", label: "—", kind: "skill" as const };
    return {
      id: link.id,
      name: link.title,
      tag: link.classLabel + " " + (ROMAN[link.rankLevel] || link.rankLevel),
      stat: prim.stat,
      skill: prim.kind === "subject" ? prim.label : prim.skill || prim.label,
      bonus: 0,
      dc: spec.dc != null ? spec.dc : null,
      desc: link.desc,
      rollOptions,
      addRank: !!spec.addRank,
      rankConditional: spec.rankConditional || null,
      backfire: !!spec.backfire,
      fromClass: link.classKey,
      classLabel: link.classLabel,
      rankLevel: link.rankLevel,
    };
  };

  const syncClassMoves = (links: ClassMoveLink[]) => {
    setMoves((prev) => {
      const keep = new Set(links.map((l) => l.id));
      let next = prev.filter((m) => !m.fromClass || keep.has(m.id));
      links.forEach((l) => {
        if (!next.find((m) => m.id === l.id)) next = [...next, classMove(l)];
      });
      return next;
    });
  };

  // ---- Wand sync ----
  const syncWandEquip = (w: Wand, equipping: boolean) => {
    setBonuses((prev) => prev.filter((b) => !b.fromWand));
    setMoves((prev) => prev.filter((m) => !m.fromWand));
    setSpells((prev) => prev.filter((s) => !s.fromWand));
    if (equipping) {
      if (wandHasBonus(w)) setBonuses((prev) => [...prev, wandBonus(w)]);
      else if (wandHasMove(w)) setMoves((prev) => [...prev, wandMove(w)]);
      else if (wandHasSpell(w)) setSpells((prev) => (prev.find((s) => s.id === w.effect.spell!.id) ? prev : [...prev, wandSpell(w)]));
    }
  };
  const syncWandRemove = (wandId: string) => {
    setBonuses((prev) => prev.filter((b) => b.fromWand !== wandId));
    setMoves((prev) => prev.filter((m) => m.fromWand !== wandId));
    setSpells((prev) => prev.filter((s) => s.fromWand !== wandId));
  };

  // ---- Plant-linked grants ----
  const plantMove = (pl: import("../types").Plant): Move => ({
    id: "mv-plt-" + pl.id, name: pl.name, tag: "Plant",
    stat: "Insight", skill: "Herbalism", bonus: 0, dc: null,
    desc: stripPlantCarry(pl.ability || pl.desc), fromPlant: pl.id,
  });
  const plantBonus = (pl: import("../types").Plant): Bonus => {
    const info = parsePlantRoll(pl.requiresRoll);
    const label = info.bonusTarget || "Bonus";
    let type = "skill";
    let target = label.toLowerCase().replace(/\s+/g, "-");
    for (const sc of schools()) {
      const sub = sc.subjects.find((s) => s.name.toLowerCase() === label.toLowerCase());
      if (sub) {
        type = "subject";
        target = sub.key;
        break;
      }
    }
    return { id: "bn-plt-" + pl.id, source: pl.name, type, target, targetLabel: label, value: info.bonusValue || 0, active: true, fromPlant: pl.id };
  };

  const syncPlantLinks = (plants: import("../types").Plant[]) => {
    const movePlants = plants.filter((p) => parsePlantRoll(p.requiresRoll).mode === "move");
    const bonusPlants = plants.filter((p) => parsePlantRoll(p.requiresRoll).mode === "bonus");
    setMoves((prev) => {
      const keep = new Set(movePlants.map((p) => "mv-plt-" + p.id));
      let next = prev.filter((m) => !m.fromPlant || keep.has(m.id));
      movePlants.forEach((p) => {
        if (!next.find((m) => m.id === "mv-plt-" + p.id)) next = [...next, plantMove(p)];
      });
      return next;
    });
    setBonuses((prev) => {
      const keep = new Set(bonusPlants.map((p) => "bn-plt-" + p.id));
      let next = prev.filter((b) => !b.fromPlant || keep.has(b.id));
      bonusPlants.forEach((p) => {
        if (!next.find((b) => b.id === "bn-plt-" + p.id)) next = [...next, plantBonus(p)];
      });
      return next;
    });
  };

  // ---- Compendium: add a move entry from a compendium entry ----
  const addMoveFromCompendium = (e: CompendiumEntry) => {
    const m = e.meta || [];
    setMoves((prev) => [
      ...prev,
      { id: "mv-comp-" + e.id, name: e.name, tag: e.level, stat: m[0] || "Logic", skill: m[1] || "—", bonus: parseInt(m[2], 10) || 0, dc: null, desc: e.desc },
    ]);
  };

  return {
    state: { bonuses, spells, moves },
    setState: { setBonuses, setSpells, setMoves },
    handlers: {
      addSpell, updateSpell, removeSpell, setSpellDays,
      addMove, updateMove, removeMove,
      addBonus, updateBonus, removeBonus,
      toggleBonus, toggleBonusConditional, setBonusCondNote,
      addArtMove, removeArtMove, setMoveCond,
      syncClassMoves,
      syncWandEquip, syncWandRemove,
      syncPlantLinks,
      addMoveFromCompendium,
    },
    helpers: {
      subjectByKey, schoolToneOf,
      subjectBonusFor, spellBonusFor, bonusFor, skillBonusFor,
      statBonusFor, moveBonusFor, rollBonusFor, resolveVal,
      condBonusesFor, dosShiftFor,
      spellMod, moveMod,
      artMove,
      wandHasBonus, wandHasMove, wandHasSpell,
      wandBonus, wandMove, wandSpell,
    },
  };
}
