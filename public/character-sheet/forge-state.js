/* ===========================================================================
   Starfall Academy — The Admission: character-creation logic
   Pure cost engine + draft helpers + payload builders, exported on window.SF_ADMISSION.
   The wizard UI (admission.jsx) owns the draft React state; this file is the math.

   Two build paths share one engine:
     · Quick  — three independent rank pools (Stat / Subject / Skill), 1 rank = 1.
     · Custom — one point pool: Stat rank = 3 pts, Ability rank = 1 pt,
                plus optional spend on class ranks (2/level over the free 8),
                wands (1 pt / 400 mat) and artifacts (1 pt / 400 mat).
   =========================================================================== */
(function () {
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  const yearById = (D, id) => D.creation.years.find((y) => y.id === id) || D.creation.years[0];
  const houseById = (D, id) => D.houses.find((h) => h.id === id) || D.houses[0];
  const wandById  = (D, id) => D.creation.startingWands.find((w) => w.id === id) || D.creation.startingWands[0];

  // Major-subject rank bonus: one major may rank +3 over the year cap; two
  // majors may each rank +1 over it. Centralized so UI + validation agree.
  const majorBonus = (draft) => (draft.major.length === 1 ? 3 : draft.major.length === 2 ? 1 : 0);
  const rankCap = (draft, D, mapName, key) => {
    const lim = yearById(D, draft.yearId).limit;
    return mapName === "subjects" && draft.major.includes(key) ? lim + majorBonus(draft) : lim;
  };

  // Flatten the school/stat trees into addressable ability rows.
  const flatSubjects = (D) => {
    const out = [];
    D.magicSchools.forEach((sc) => sc.subjects.forEach((s) => out.push({ key: s.key, name: s.name, stat: s.stat, school: sc })));
    return out;
  };
  const flatSkills = (D) => {
    const out = [];
    D.stats.forEach((f) => f.skills.forEach((s) => out.push({ id: s.id, name: s.name, fac: f })));
    return out;
  };

  const sumVals = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);
  const compById = (D) => { const m = {}; D.compendium.forEach((e) => (m[e.id] = e)); return m; };

  // ---- A blank draft ------------------------------------------------------
  function blankDraft(D) {
    return {
      mode: "new",                       // "new" | "edit"
      // identity
      name: "", pronouns: "", yearId: "first", houseId: "dragon", title: "", bio: "",
      buildType: "quick",                // "quick" | "custom"
      // classes
      classMode: "single",               // "single" (1@4) | "double" (2@2)
      classes: {},                       // { [id]: { rank, choices } }
      // starting wand
      wandId: "sylene",
      wandTargets: [],                   // stat: [statName]; ability: [{type,key,label}]
      // allocation
      stats: {}, skills: {}, subjects: {},
      major: [],                         // 1–2 subject keys
      // inventory yields / purchases
      potions: [], plants: [], glyphs: [], craftWands: [],   // from Alchemy / Herbalism / Runology / Wandcrafting
      extraWands: [], artifacts: [],             // custom-build purchases
      // spells
      spells: [],                        // compendium ids
    };
  }

  // ---- Cost engine --------------------------------------------------------
  const classPoints = (draft) => Object.values(draft.classes).reduce((s, c) => s + 2 * (c.rank || 0), 0);
  const matPoints = (D, ids, per) => { const m = compById(D); return ids.reduce((s, id) => s + Math.ceil(((m[id] && m[id].mat) || 0) / per), 0); };

  function budgets(draft, D) {
    const year = yearById(D, draft.yearId), cc = D.creation.custom;
    const statSpent = sumVals(draft.stats), subjSpent = sumVals(draft.subjects), skillSpent = sumVals(draft.skills);
    const classExtra = Math.max(0, classPoints(draft) - cc.freeClassPoints);
    const wandPts = matPoints(D, draft.extraWands, cc.wandPer);
    const artiPts = matPoints(D, draft.artifacts, cc.artifactPer);

    if (draft.buildType === "quick") {
      return {
        mode: "quick", limit: year.limit,
        stat:    { spent: statSpent,  pool: year.quick.stat },
        subject: { spent: subjSpent,  pool: year.quick.subject },
        skill:   { spent: skillSpent, pool: year.quick.skill },
      };
    }
    const spent = statSpent * cc.statCost + (subjSpent + skillSpent) * cc.abilityCost + classExtra + wandPts + artiPts;
    return {
      mode: "custom", limit: year.limit, pool: year.custom, spent, remaining: year.custom - spent,
      breakdown: { stats: statSpent * cc.statCost, abilities: (subjSpent + skillSpent) * cc.abilityCost, classes: classExtra, wands: wandPts, artifacts: artiPts },
    };
  }

  // ---- Validation ---------------------------------------------------------
  const overCap = (draft, D) => {
    if (draft.mode === "edit") return false;
    const lim = yearById(D, draft.yearId).limit;
    const any = (o) => Object.values(o).some((v) => (v || 0) > lim);
    // Major subjects are allowed above the base cap (see rankCap).
    const subjOver = Object.entries(draft.subjects).some(([k, v]) => (v || 0) > rankCap(draft, D, "subjects", k));
    return any(draft.stats) || subjOver || any(draft.skills);
  };
  const overBudget = (draft, D) => {
    if (draft.mode === "edit") return false;
    const b = budgets(draft, D);
    if (b.mode === "quick") return b.stat.spent > b.stat.pool || b.subject.spent > b.subject.pool || b.skill.spent > b.skill.pool;
    return b.spent > b.pool;
  };
  const ownedClasses = (draft) => Object.keys(draft.classes).filter((id) => (draft.classes[id].rank || 0) > 0);
  function classValid(draft) {
    const owned = ownedClasses(draft);
    if (draft.classMode === "single") return owned.length === 1 && draft.classes[owned[0]].rank >= 4;
    return owned.length === 2 && owned.every((id) => draft.classes[id].rank >= 2);
  }
  const wandTargetCount = (draft, D) => wandById(D, draft.wandId).count;
  const wandValid = (draft, D) => (draft.wandTargets || []).filter(Boolean).length === wandTargetCount(draft, D);
  const majorValid = (draft) => draft.major.length >= 1 && draft.major.length <= 2;
  function spellsOk(draft, D) {
    const q = yearById(D, draft.yearId).spells, m = compById(D);
    const c = { Basic: 0, Standard: 0, Advanced: 0 };
    draft.spells.forEach((id) => { const e = m[id]; if (e) { const L = e.level; if (c[L] != null) c[L]++; } });
    return c.Basic <= q.Basic && c.Standard <= q.Standard && c.Advanced <= q.Advanced;
  }

  // Per-step completion (drives the rail + Next gating).
  function stepValid(id, draft, D) {
    switch (id) {
      case "identity":   return draft.name.trim().length > 0;
      case "classes":    return classValid(draft) && !overBudget(draft, D);
      case "wand":       return wandValid(draft, D);
      case "allocation": return draft.mode === "edit" || (majorValid(draft) && !overCap(draft, D) && !overBudget(draft, D));
      case "inventory":  return true;
      case "spells":     return spellsOk(draft, D);
      case "review":     return true;
      default: return true;
    }
  }
  const canBegin = (draft, D) =>
    draft.name.trim() && classValid(draft) && wandValid(draft, D) && majorValid(draft) &&
    (draft.mode === "edit" || (!overCap(draft, D) && !overBudget(draft, D))) && spellsOk(draft, D);

  // ---- Spell quota tally (for the Spells step) ----------------------------
  function spellTally(draft, D) {
    const m = compById(D), c = { Basic: 0, Standard: 0, Advanced: 0 };
    draft.spells.forEach((id) => { const e = m[id]; if (e && c[e.level] != null) c[e.level]++; });
    return c;
  }

  // ---- Inventory yields (from magic allocation) ---------------------------
  function yields(draft, D) {
    const y = D.creation.yields;
    return {
      potions: Math.min(y.alchemyPotionMax, draft.subjects["alchemy"] || 0),
      plantMat: (draft.subjects["herbalism"] || 0) * y.herbalismPlantMat,
      glyphs: (draft.subjects["runology"] || 0) * y.runologyGlyphsPerRank,
      craftMat: (draft.subjects["wandcrafting"] || 0) * y.wandcraftMatPerRank,
    };
  }

  /* =========================================================================
     PAYLOAD BUILDERS — translate a finished draft into the app's live shapes.
     App.commitAdmission() calls these and feeds the results to its state setters.
     ========================================================================= */

  // Sylene's Crystal bakes +value into one Stat — the faithful
  // way to model "+2 to a Stat", since stat rank feeds skills, subjects, resists.
  function statWandBonus(draft, D) {
    const w = wandById(D, draft.wandId);
    if (w.kind !== "stat") return null;
    const statName = (draft.wandTargets || [])[0];
    return statName ? { statName, value: w.value } : null;
  }

  function buildStats(draft, D) {
    const sb = statWandBonus(draft, D);
    return D.stats.map((f) => ({
      ...f,
      rank: (draft.stats[f.id] || 0) + (sb && sb.statName === f.name ? sb.value : 0),
      skills: f.skills.map((s) => ({ ...s, rank: draft.skills[s.id] || 0 })),
    }));
  }
  function buildSchools(draft, D) {
    return D.magicSchools.map((sc) => ({
      ...sc,
      subjects: sc.subjects.map((s) => ({ ...s, rank: draft.subjects[s.key] || 0 })),
    }));
  }

  // Champion's Wand / Whispered Secrets grant ability bonuses → ledger entries.
  function buildWandBonuses(draft, D) {
    const w = wandById(D, draft.wandId);
    if (w.kind !== "ability") return [];
    return (draft.wandTargets || []).filter(Boolean).map((t, i) => ({
      id: "bn-startwand-" + i, source: w.name, type: t.type, target: t.key, targetLabel: t.label, value: w.value, active: true,
    }));
  }

  // The starting wand as an inventory item (effect is descriptive — its bonus is
  // already applied above, so kind:"ability" keeps the equip-sync from re-wiring it).
  function buildStartingWand(draft, D) {
    const w = wandById(D, draft.wandId);
    return { id: "wnd-start", name: w.name, tone: "gold", equipped: true, condition: 6, maxCondition: 6, desc: w.desc + " · " + w.grant, effect: { kind: "ability", label: w.grant } };
  }

  // Bonus wands from Wandcrafting + purchased wands → plain inventory wands.
  function buildExtraWands(draft, D) {
    const m = compById(D);
    const mk = (id, idx, pfx) => { const e = m[id]; if (!e) return null;
      const bm = /([+-]?\d+)\s+(.+)/.exec(e.bonusLabel || ""); const val = bm ? parseInt(bm[1], 10) : 0; const lbl = bm ? bm[2] : "Bonus";
      return { id: pfx + idx + "-" + id, name: e.name, tone: e.tone, equipped: false, condition: 6, maxCondition: 6, desc: e.desc, bonus: { type: "subject", target: lbl.toLowerCase(), targetLabel: lbl, value: val } };
    };
    return [].concat(draft.craftWands.map((id, i) => mk(id, i, "wnd-craft")), draft.extraWands.map((id, i) => mk(id, i, "wnd-buy"))).filter(Boolean);
  }

  // Artifacts purchased in custom build — auto-attuned at creation.
  function buildArtifacts(draft, D) {
    const m = compById(D);
    return draft.artifacts.map((id) => { const e = m[id]; if (!e) return null;
      return { id: "art-start-" + id, name: e.name, level: e.level, tone: e.tone, subject: e.subject || "\u2014", intensity: 0, attuned: true, condition: "stable", desc: e.desc, move: { name: e.name + " \u2014 Boon", stat: "Insight", skill: "\u2014", bonus: 0, dc: null, desc: e.desc } };
    }).filter(Boolean);
  }

  // Potions (from Alchemy): the chosen recipes become known recipes + a vial each.
  function buildPotions(draft, D) {
    const m = compById(D);
    return draft.potions.map((id, i) => { const e = m[id]; if (!e) return null;
      const cost = parseInt(String(e.cost || "0").replace(/[^0-9]/g, ""), 10) || 0;
      return { recipe: { id: "rec-start-" + i, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, cost, desc: e.desc },
               vial:   { id: "pot-start-" + i, name: e.name, tone: e.tone, intensity: e.intensity != null ? e.intensity : 1, qty: 1, recipeId: "rec-start-" + i, desc: e.desc } };
    }).filter(Boolean);
  }

  function buildPlants(draft, D) {
    const m = compById(D);
    return (draft.plants || []).map((id, i) => { const e = m[id]; if (!e) return null;
      return { id: "plt-start-" + i + "-" + id, name: e.name, tone: e.tone, value: e.value || 0, intensity: e.intensity || 1, used: false, removeOnUse: !!e.removeOnUse, requiresRoll: e.requiresRoll || "NO", desc: e.desc, ability: e.ability || "" };
    }).filter(Boolean);
  }

  function buildGlyphs(draft, D) {
    const m = compById(D);
    return draft.glyphs.map((id, i) => { const e = m[id]; if (!e) return null;
      return { id: "gly-start-" + i + "-" + id, name: e.name, tone: e.tone, cost: e.value || 0, intensity: e.intensity || 1, desc: e.desc };
    }).filter(Boolean);
  }

  function buildSpells(draft, D) {
    const m = compById(D);
    return draft.spells.map((id) => { const e = m[id]; if (!e || e.cat !== "spell") return null;
      return { id: "sp-start-" + e.id, name: e.name, level: e.level, subjectKey: e.subjectKey, subject: e.subject, school: e.school, stat: e.stat, ap: e.ap, dc: e.dc, ritual: !!e.ritual, volatile: false, days: 0, desc: e.desc };
    }).filter(Boolean);
  }

  function buildClassState(draft) {
    const o = {};
    ownedClasses(draft).forEach((id) => { o[id] = { rank: draft.classes[id].rank, choices: { ...draft.classes[id].choices } }; });
    return o;
  }

  // The character vitals block.
  function buildCharacter(draft, D) {
    const house = houseById(D, draft.houseId), year = yearById(D, draft.yearId);
    const majorName = (draft.major.map((k) => { const s = flatSubjects(D).find((x) => x.key === k); return s ? s.name : null; }).filter(Boolean))[0];
    return {
      name: draft.name.trim() || "New Arcanist",
      pronouns: draft.pronouns.trim(),
      year: year.roman, yearId: year.id,
      house: house.name, houseTone: house.tone,
      title: draft.title.trim() || ("Arcanist" + (majorName ? " \u00b7 " + majorName : "")),
      bio: draft.bio.trim(),
      major: [...draft.major],
      actionPoints: 4, actionPointsMax: 6,
      resolve: 3, resolveMax: 5,
      trouble: 0,
      materials: D.creation.startingMaterials,
    };
  }

  // ---- Edit prefill: derive a draft from a live character + state ---------
  function draftFromLive(D, live) {
    const d = blankDraft(D);
    d.mode = "edit";
    const c = live.c || {};
    const house = D.houses.find((h) => h.name === c.house) || D.houses[0];
    d.name = c.name || ""; d.pronouns = c.pronouns || ""; d.title = c.title || ""; d.bio = c.bio || "";
    d.yearId = c.yearId || (D.creation.years.find((y) => y.roman === c.year) || {}).id || "third";
    d.houseId = house.id;
    d.major = Array.isArray(c.major) ? [...c.major] : [];
    d.buildType = "custom"; // editing an advanced sheet → custom is the honest lens
    (live.stats || D.stats).forEach((f) => { d.stats[f.id] = f.rank; f.skills.forEach((s) => (d.skills[s.id] = s.rank)); });
    (live.schools || D.magicSchools).forEach((sc) => sc.subjects.forEach((s) => (d.subjects[s.key] = s.rank)));
    const cs = live.classState || {};
    d.classes = {}; Object.keys(cs).forEach((id) => (d.classes[id] = { rank: cs[id].rank, choices: { ...cs[id].choices } }));
    d.classMode = ownedClasses(d).length >= 2 ? "double" : "single";
    return d;
  }

  window.SF_ADMISSION = {
    ROMAN, yearById, houseById, wandById, flatSubjects, flatSkills, sumVals, compById,
    majorBonus, rankCap,
    blankDraft, classPoints, budgets, yields, spellTally,
    overCap, overBudget, ownedClasses, classValid, wandValid, wandTargetCount, majorValid, spellsOk, stepValid, canBegin,
    statWandBonus, buildStats, buildSchools, buildWandBonuses, buildStartingWand, buildExtraWands,
    buildArtifacts, buildPotions, buildPlants, buildGlyphs, buildSpells, buildClassState, buildCharacter, draftFromLive,
  };
})();
