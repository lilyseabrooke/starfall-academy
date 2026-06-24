/* ===========================================================================
   Starfall Academy — Bonus taxonomy & value resolution
   ---------------------------------------------------------------------------
   A single source of truth for what a Bonus can target and how its value is
   computed. The Bonus ledger, the editor modal, and every roll handler read
   from here, so adding a new bonus kind is a one-line change to TYPES.

   A bonus record:
     {
       id, source,                 // identity + display label
       type,                       // a TYPES[].id (what it modifies)
       target, targetLabel,        // optional sub-target (subject key, skill id,
                                   //   stat name, move/spell id, ability, field,
                                   //   resist condition id) + its display label
       valueMode: "flat"|"class",  // a fixed number, or a class rank that scales
       value,                      // the flat number (valueMode === "flat")
       classKey, classLabel,       // the class to read a rank from (valueMode === "class")
       active, conditional, condNote,
       fromWand, fromPlant, fromArtifact,   // provenance (auto-managed grants)
     }
   Export: window.SF_BONUS
   =========================================================================== */
(function () {
  // target: "req" target is mandatory · "opt" optional (blank = whole category)
  //         "none" no target · kind drives which option list the editor shows.
  const TYPES = [
    // ── Add to a value total (shows on a card) ─────────────────────────────
    { id: "stat",    label: "Stat",             group: "Totals", target: "req", kind: "stat",    icon: "gauge",        hint: "Raises the stat everywhere it is rolled." },
    { id: "subject", label: "Subject",          group: "Totals", target: "req", kind: "subject", icon: "sparkles",     hint: "Adds to one field of magic." },
    { id: "skill",   label: "Skill",            group: "Totals", target: "req", kind: "skill",   icon: "target",       hint: "Adds to one skill." },
    { id: "move",    label: "A specific move",   group: "Totals", target: "req", kind: "move",    icon: "swords",       hint: "Adds to one move's roll." },
    { id: "spell",   label: "A specific spell",  group: "Totals", target: "req", kind: "spell",   icon: "sparkles",    hint: "Adds to one spell's casting roll." },
    // ── Add to a category of roll ──────────────────────────────────────────
    { id: "metabolize", label: "Metabolize rolls",       group: "Rolls", target: "none", icon: "flask-round",   hint: "Every Metabolize roll." },
    { id: "attune",     label: "Attunement rolls",       group: "Rolls", target: "none", icon: "gem",           hint: "Every Attunement roll." },
    { id: "artifact-repair", label: "Artifact repair rolls", group: "Rolls", target: "none", icon: "hammer",   hint: "Every artifact repair roll." },
    { id: "plantuse",   label: "Plant-use rolls",        group: "Rolls", target: "none", icon: "leaf",          hint: "Every plant-use roll." },
    { id: "rune",       label: "Rune-creating rolls",    group: "Rolls", target: "none", icon: "pen-tool",      hint: "Every rune-creating roll." },
    { id: "improve",    label: "Improvement rolls",      group: "Rolls", target: "opt", kind: "ability", allLabel: "All abilities", icon: "trending-up", hint: "Improvement rolls — all, or one ability." },
    { id: "learn",      label: "Spell-learning rolls",   group: "Rolls", target: "opt", kind: "field",   allLabel: "All fields",    icon: "book-open",   hint: "Spell-learning rolls — all, or one field." },
    { id: "brew",       label: "Potion-brewing rolls",   group: "Rolls", target: "none", icon: "flask-conical", hint: "Every potion-brewing roll." },
    { id: "resist",          label: "Resist rolls",             group: "Rolls", target: "opt", kind: "resist",  allLabel: "All resist types", icon: "shield",      hint: "Resist rolls — all, or one type." },
    { id: "spellroll",       label: "Spell rolls",              group: "Rolls", target: "opt", kind: "field", allLabel: "All subjects", icon: "zap",    hint: "Spell casting rolls — all, or one subject." },
    { id: "spellbackfire",   label: "Spell backfire rolls",     group: "Rolls", target: "opt", kind: "field", allLabel: "All subjects", icon: "flame",  hint: "Spell backfire rolls — all, or one subject." },
    { id: "artificybackfire",label: "Artificy backfire rolls",  group: "Rolls", target: "none", icon: "wrench",       hint: "Every artificy backfire roll." },
    { id: "wandcraft",       label: "Wandcraft rolls",          group: "Rolls", target: "none", icon: "wand-2",       hint: "Every wandcraft roll." },
    { id: "action",          label: "Action rolls",             group: "Rolls", target: "none", icon: "zap",           hint: "The Action roll (DC 10 Insight) that sets your Action Points." },
  ];

  const byId = {};
  TYPES.forEach((t) => { byId[t.id] = t; });
  const typeMeta  = (id) => byId[id] || null;
  const typeLabel = (id) => (byId[id] ? byId[id].label : id);
  const typeIcon  = (id) => (byId[id] ? byId[id].icon : "circle");
  const needsTarget = (id) => (byId[id] ? byId[id].target : "none");

  // ── Target option builders ───────────────────────────────────────────────
  // ctx: { stats, schools, moves, spells, conditions }
  const trimSchool = (name) => String(name || "").replace(" Magics", "");
  function targetOptions(kind, ctx) {
    const c = ctx || {};
    const stats   = (c.stats || []).filter(Boolean);
    const schools = (c.schools || []).filter(Boolean);
    const moves   = (c.moves || []).filter(Boolean);
    const spells  = (c.spells || []).filter(Boolean);
    const conds   = (c.conditions || []).filter(Boolean);
    switch (kind) {
      case "stat":
        return stats.map((f) => ({ value: f.name, label: f.name }));
      case "subject":
      case "field":
        return schools.flatMap((sc) =>
          (sc.subjects || []).filter(Boolean).map((s) => ({ value: s.key, label: s.name, note: trimSchool(sc.name) })));
      case "skill":
        return stats.flatMap((f) =>
          (f.skills || []).filter(Boolean).map((s) => ({ value: s.id, label: s.name, note: f.name })));
      case "ability": {
        const subs   = schools.flatMap((sc) => (sc.subjects || []).filter(Boolean).map((s) => ({ value: s.key, label: s.name, note: trimSchool(sc.name) })));
        const skills = stats.flatMap((f) => (f.skills || []).filter(Boolean).map((s) => ({ value: s.id, label: s.name, note: f.name })));
        return [...subs, ...skills];
      }
      case "move":
        return moves.map((m) => ({ value: m.id, label: m.name }));
      case "spell":
        return spells.map((s) => ({ value: s.id, label: s.name, note: s.subject }));
      case "resist":
        return conds.map((cd) => ({ value: cd.id, label: cd.name }));
      default:
        return [];
    }
  }

  // ── Value resolution ──────────────────────────────────────────────────────
  // classRankOf(classKey) → current rank (number). A class-mode bonus tracks
  // that rank live, so ranking the class up raises the bonus automatically.
  function resolveValue(b, classRankOf) {
    if (!b) return 0;
    if (b.valueMode === "class") return (classRankOf ? classRankOf(b.classKey) : 0) || 0;
    return b.value || 0;
  }
  // Short label for the ledger: "+3", "−2", or "Pupil rank · 4".
  function valueLabel(b, classRankOf) {
    if (b && b.valueMode === "class") {
      const r = (classRankOf ? classRankOf(b.classKey) : 0) || 0;
      return { kind: "class", text: (b.classLabel || "Class") + " rank", n: r };
    }
    const v = (b && b.value) || 0;
    return { kind: "flat", text: (v >= 0 ? "+" : "\u2212") + Math.abs(v), n: v };
  }

  // A blank record for the editor's "Add" mode.
  function blank() {
    return {
      id: "bn-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      source: "", type: "skill", target: "", targetLabel: "",
      valueMode: "flat", value: 1, classKey: "", classLabel: "",
      active: true, conditional: false, condNote: "",
    };
  }

  window.SF_BONUS = {
    TYPES, typeMeta, typeLabel, typeIcon, needsTarget,
    targetOptions, resolveValue, valueLabel, blank, trimSchool,
  };
})();
