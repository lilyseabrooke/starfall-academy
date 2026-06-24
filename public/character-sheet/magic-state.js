/* ===========================================================================
   Starfall Academy — Magic state management
   Owns bonuses, spells, and moves state. Handles wand grant sync,
   artifact move linking, and all subject/school/spell computation helpers.
   Export: window.useMagicState(D, INV, facByName)
   =========================================================================== */
(function () {
  function useMagicState(D, INV, facByName, getSchools, getClassRank) {
    // Live school tree (stats/subjects can change via the Admission); fall back to seed.
    const schools = () => (getSchools && getSchools()) || D.magicSchools;
    // Current rank in a class — lets a class-mode bonus scale live with it.
    const classRankOf = (key) => (getClassRank ? getClassRank(key) : 0) || 0;
    // Resolve a bonus to a number: a flat value, or the tracked class rank.
    const resolveVal = (b) => (b && b.valueMode === "class") ? classRankOf(b.classKey) : ((b && b.value) || 0);

    // ---- Internal skill rank helper ----
    const skillRankIn = (facName, skName) => {
      const f = facByName(facName);
      const s = f && f.skills.find((k) => k.name === skName);
      return s ? s.rank : 0;
    };

    // ---- Wand grant builders ----
    // Pure functions: wand object → a bonus/move/spell ledger entry.
    const wandBonus  = (w) => ({ id: "bn-" + w.id, source: w.name, type: w.effect.type || "subject", target: w.effect.target, targetLabel: w.effect.targetLabel, value: w.effect.value, active: true, fromWand: w.id });
    const wandMove   = (w) => ({ id: "mv-" + w.id, name: w.effect.move.name, tag: "Wand", stat: w.effect.move.stat, skill: w.effect.move.skill, bonus: w.effect.move.bonus || 0, dc: w.effect.move.dc, desc: w.effect.move.desc, success: w.effect.move.success, fail: w.effect.move.fail, fromWand: w.id });
    const wandSpell  = (w) => ({ ...w.effect.spell, fromWand: w.id });
    const wandHasBonus = (w) => w.effect && w.effect.kind === "bonus" && w.effect.target;
    const wandHasMove  = (w) => w.effect && w.effect.kind === "move"  && w.effect.move;
    const wandHasSpell = (w) => w.effect && w.effect.kind === "spell" && w.effect.spell;

    // ---- Artifact move builder ----
    // A Move is not its own entity — it is auto-generated from the artifact
    // that grants it, so it carries the artifact's own name and description.
    const artMove = (a) => ({
      id: "mv-" + a.id, name: a.name, tag: "Artifact",
      stat: a.move.stat, skill: a.move.skill, bonus: a.move.bonus,
      dc: a.move.dc, desc: a.desc, success: a.move.success, fail: a.move.fail,
      fromArtifact: a.id, artifactCondition: a.condition,
      artifactLevel: a.level || "Basic",
      artifactCost: a.cost || 0,
    });

    // ---- State: seed from character data + any initially-equipped wands ----
    const [bonuses, setBonuses] = React.useState(() => {
      const base = D.bonuses.map((x) => ({ ...x }));
      INV.wands.filter((w) => w.equipped && wandHasBonus(w)).forEach((w) => base.push(wandBonus(w)));
      return base;
    });
    const [spells, setSpells] = React.useState(() => {
      const base = D.spells.map((x) => ({ ...x }));
      INV.wands.filter((w) => w.equipped && wandHasSpell(w)).forEach((w) => base.push(wandSpell(w)));
      return base;
    });
    const [moves, setMoves] = React.useState(() => {
      const base = D.moves.map((m) => ({ ...m }));
      INV.artifacts.filter((a) => a.attuned).forEach((a) => base.push(artMove(a)));
      INV.wands.filter((w) => w.equipped && wandHasMove(w)).forEach((w) => base.push(wandMove(w)));
      return base;
    });

    // ---- Subject / school lookups ----
    const subjectByKey = (key) => {
      for (const sc of schools()) {
        const f = sc.subjects.find((s) => s.key === key);
        if (f) return { sub: f, school: sc };
      }
      return null;
    };
    const schoolToneOf = (id) => (schools().find((s) => s.id === id) || {}).tone;

    // ---- Bonus helpers ----
    // Live totals exclude conditional bonuses — those are offered per-roll instead.
    // Every sum runs values through resolveVal so class-rank bonuses track live.
    const liveSum = (pred) =>
      bonuses.filter((b) => b.active && !b.conditional && b.valueMode !== "dos" && pred(b))
             .reduce((s, b) => s + resolveVal(b), 0);

    // Active DoS-shift bonuses — same predicate logic as liveSum but only
    // valueMode:"dos" entries. They shift outcome tiers, not the roll total.
    const dosShiftFor = (pred) =>
      bonuses.filter((b) => b.active && !b.conditional && b.valueMode === "dos" && pred(b))
             .reduce((s, b) => s + resolveVal(b), 0);

    // "Add to a total" kinds — each carries a required target.
    const statBonusFor    = (name)    => liveSum((b) => b.type === "stat"    && b.target === name);
    const subjectBonusFor = (key)     => liveSum((b) => b.type === "subject" && b.target === key);
    const skillBonusFor   = (skillId) => liveSum((b) => b.type === "skill"   && b.target === skillId);
    const bonusFor        = skillBonusFor; // legacy alias used by the stat cards
    const moveBonusFor    = (id)      => liveSum((b) => b.type === "move"    && b.target === id);
    const spellBonusFor   = (id)      => liveSum((b) => b.type === "spell"   && b.target === id);

    // "Add to a roll" kinds — an empty target means the whole category; a set
    // target narrows it (one ability / one field / one resist type).
    const rollBonusFor = (type, targetKey) =>
      liveSum((b) => b.type === type && (!b.target || b.target === targetKey));

    // Conditional bonuses applicable to a roll, matched by a predicate. Returns
    // lean option objects for the roll window's opt-in checkboxes (value resolved).
    // DoS-mode conditional bonuses are excluded here so they never accidentally
    // add to the flat roll total when checked in the prompt.
    const condBonusesFor = (pred) =>
      bonuses.filter((b) => b.active && b.conditional && b.valueMode !== "dos" && pred(b))
             .map((b) => ({ id: b.id, source: b.source, value: resolveVal(b), targetLabel: b.targetLabel, condNote: b.condNote || null }));

    // ---- Spell modifier ----
    const spellMod = (sp) => {
      const fr = facByName(sp.stat) ? facByName(sp.stat).rank : 0;
      const sk = subjectByKey(sp.subjectKey);
      return fr + statBonusFor(sp.stat) + (sk ? sk.sub.rank : 0) + spellBonusFor(sp.id);
    };

    // ---- Move modifier ----
    // Legacy moves carry a single { stat, skill } and a flat bonus. Class-linked
    // moves may instead carry `rollOptions` (one per ability they can roll with)
    // and `addRank` (the class rank folds into the roll live). `optIdx` selects
    // which roll option to total. A `rankConditional` rank is NOT added here —
    // it is offered per-roll as a conditional bonus (see app's onRollMove).
    const moveMod = (m, optIdx) => {
      const i = optIdx || 0;
      const opt = (m.rollOptions && m.rollOptions[i]) || { stat: m.stat, skill: m.skill, kind: "skill" };
      const facR = facByName(opt.stat) ? facByName(opt.stat).rank : 0;
      let abilityRank;
      if (opt.kind === "subject") { const s = subjectByKey(opt.subjectKey); abilityRank = s ? s.sub.rank : 0; }
      else abilityRank = skillRankIn(opt.stat, opt.skill);
      const rankAdd = (m.addRank && m.fromClass) ? classRankOf(m.fromClass) : 0;
      return facR + statBonusFor(opt.stat) + abilityRank + (m.bonus || 0) + rankAdd + moveBonusFor(m.id);
    };

    // ---- Spell handlers ----
    const addMove  = (m) => setMoves((prev) => [...prev, m]);
    const addSpell    = (sp) => setSpells((prev) => (prev.find((x) => x.id === sp.id) ? prev : [...prev, sp]));
    const updateSpell = (sp) => setSpells((prev) => prev.map((x) => x.id === sp.id ? { ...x, ...sp } : x));
    const removeSpell = (sp) => setSpells((prev) => prev.filter((x) => x.id !== sp.id));
    const setSpellDays = (spId, days) =>
      setSpells((prev) => prev.map((s) => s.id === spId ? { ...s, days: Math.max(0, days) } : s));

    // ---- Bonus handlers ----
    // Add / expand / edit / remove — the editor's write path into the ledger.
    const addBonus    = (b)        => setBonuses((prev) => [...prev, b]);
    const updateBonus = (id, patch) => setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    const removeBonus = (id)       => setBonuses((prev) => prev.filter((b) => b.id !== id));
    const toggleBonus = (id) =>
      setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
    // Flip whether a bonus is conditional (offered per-roll) vs. applied live.
    const toggleBonusConditional = (id) =>
      setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, conditional: !b.conditional } : b)));
    // The condition under which a conditional bonus applies (free text, per row).
    const setBonusCondNote = (id, condNote) =>
      setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, condNote } : b)));

    // ---- Artifact move handlers ----
    const addArtMove = (a) =>
      setMoves((prev) => prev.find((m) => m.fromArtifact === a.id) ? prev : [...prev, artMove(a)]);
    const removeArtMove = (artId) =>
      setMoves((prev) => prev.filter((m) => m.fromArtifact !== artId));
    const setMoveCond = (artId, condition) =>
      setMoves((prev) => prev.map((m) => (m.fromArtifact === artId ? { ...m, artifactCondition: condition } : m)));

    // ---- Class-rank linked moves -----------------------------------------
    // A class-rank ability whose TAG is a move(…) auto-grants a Move while that
    // ability is the player's chosen option at a reached rank. The Move is
    // assembled from the parsed tag spec (see classes.js). It carries:
    //   · rollOptions — each ability it may be rolled with, resolved to a
    //     Stat + Skill (or magic subject) so moveMod can total any of them
    //   · addRank      — fold the live class rank into the roll
    //   · rankConditional — instead offer the rank as a per-roll conditional bonus
    //   · dc / backfire — default difficulty, and Standard-spell-style recoil
    const SH0 = window.SF_SHARED;
    const classMove = (link) => {
      const spec = link.move || {};
      const rollOptions = (spec.abilities || []).map((a) => {
        const r = SH0.resolveAbility(a);
        if (r) return r;
        // Unknown ability — keep it visible but inert (no rank to read).
        return { ability: a, kind: "skill", stat: "\u2014", skill: "\u2014", label: a };
      });
      const prim = rollOptions[0] || { stat: "\u2014", skill: "\u2014", label: "\u2014" };
      return {
        id: link.id,
        name: link.title,
        tag: link.classLabel + " " + (SH0.ROMAN[link.rankLevel] || link.rankLevel),
        stat: prim.stat,
        skill: prim.kind === "subject" ? prim.label : (prim.skill || prim.label),
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
    // Reconcile linked class Moves against the active ability links. Adds any
    // newly-chosen move abilities and drops ones no longer chosen (rank refunded
    // or the other option picked) — the move id encodes class+rank+side, so a
    // re-choice swaps one link id for another.
    const syncClassMoves = (links) => {
      setMoves((prev) => {
        const keep = new Set(links.map((l) => l.id));
        let next = prev.filter((m) => !m.fromClass || keep.has(m.id));
        links.forEach((l) => { if (!next.find((m) => m.id === l.id)) next = [...next, classMove(l)]; });
        return next;
      });
    };

    // ---- Wand sync ----
    // Called by the App's invH.equipWand / removeWand after updating wand state.
    // Clears ALL wand grants first, then re-applies the equipping wand's grant.
    const syncWandEquip = (w, equipping) => {
      setBonuses((prev) => prev.filter((b) => !b.fromWand));
      setMoves((prev) => prev.filter((m) => !m.fromWand));
      setSpells((prev) => prev.filter((s) => !s.fromWand));
      if (equipping) {
        if      (wandHasBonus(w)) setBonuses((prev) => [...prev, wandBonus(w)]);
        else if (wandHasMove(w))  setMoves((prev) => [...prev, wandMove(w)]);
        else if (wandHasSpell(w)) setSpells((prev) => prev.find((s) => s.id === w.effect.spell.id) ? prev : [...prev, wandSpell(w)]);
        // "ability" effect is untracked — nothing to wire.
      }
    };
    const syncWandRemove = (wandId) => {
      setBonuses((prev) => prev.filter((b) => b.fromWand !== wandId));
      setMoves((prev) => prev.filter((m) => m.fromWand !== wandId));
      setSpells((prev) => prev.filter((s) => s.fromWand !== wandId));
    };

    // ---- Plant-linked grants (MOVE / BONUS plants) ----------------------
    // A plant whose "Requires roll" is MOVE auto-grants a Move on the Overview;
    // BONUS auto-grants a ledger Bonus. Both are linked via `fromPlant` so they
    // vanish the instant the plant leaves the satchel.
    const SH = window.SF_SHARED;
    const plantMove = (pl) => ({
      id: "mv-plt-" + pl.id, name: pl.name, tag: "Plant",
      stat: "Insight", skill: "Herbalism", bonus: 0, dc: null,
      desc: SH.stripPlantCarry(pl.ability || pl.desc), fromPlant: pl.id,
    });
    const plantBonus = (pl) => {
      const info = SH.parsePlantRoll(pl.requiresRoll);
      const label = info.bonusTarget || "Bonus";
      let type = "skill", target = label.toLowerCase().replace(/\s+/g, "-");
      for (const sc of schools()) {
        const sub = sc.subjects.find((s) => s.name.toLowerCase() === label.toLowerCase());
        if (sub) { type = "subject"; target = sub.key; break; }
      }
      return { id: "bn-plt-" + pl.id, source: pl.name, type, target, targetLabel: label, value: info.bonusValue || 0, active: true, fromPlant: pl.id };
    };

    // Reconcile linked Moves/Bonuses against the current plant list. Adds any
    // missing links and drops orphaned ones — called from an effect in the App.
    const syncPlantLinks = (plants) => {
      const movePlants  = plants.filter((p) => SH.parsePlantRoll(p.requiresRoll).mode === "move");
      const bonusPlants = plants.filter((p) => SH.parsePlantRoll(p.requiresRoll).mode === "bonus");
      setMoves((prev) => {
        const keep = new Set(movePlants.map((p) => "mv-plt-" + p.id));
        let next = prev.filter((m) => !m.fromPlant || keep.has(m.id));
        movePlants.forEach((p) => { if (!next.find((m) => m.id === "mv-plt-" + p.id)) next = [...next, plantMove(p)]; });
        return next;
      });
      setBonuses((prev) => {
        const keep = new Set(bonusPlants.map((p) => "bn-plt-" + p.id));
        let next = prev.filter((b) => !b.fromPlant || keep.has(b.id));
        bonusPlants.forEach((p) => { if (!next.find((b) => b.id === "bn-plt-" + p.id)) next = [...next, plantBonus(p)]; });
        return next;
      });
    };

    // ---- Compendium: add a move entry from a compendium entry ----
    const addMoveFromCompendium = (e) => {
      const m = e.meta || [];
      setMoves((prev) => [...prev, {
        id: "mv-comp-" + e.id, name: e.name, tag: e.level,
        stat: m[0] || "Logic", skill: m[1] || "\u2014",
        bonus: parseInt(m[2], 10) || 0, dc: null, desc: e.desc,
      }]);
    };

    return {
      state:    { bonuses, spells, moves },
      setState: { setBonuses, setSpells, setMoves },
      handlers: {
        addSpell, updateSpell, removeSpell, setSpellDays,
        addMove,
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

  window.useMagicState = useMagicState;
})();
