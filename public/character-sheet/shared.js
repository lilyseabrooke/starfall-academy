/* ===========================================================================
   Starfall Academy — Shared constants & utilities
   Icons, colors, tone mappings used across multiple components.
   Exported to window.SF_SHARED for all files to consume.
   =========================================================================== */
(function () {
  /* ----------------------------- Icon SVG defaults ----------------------- */
  const ICON_SVG_DEFAULTS = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  /* ----------------------- Tone color variables ----------------------- */
  // Single source of truth for stat/house accent colors
  const TONE_COLORS = {
    gold: {
      fg: "var(--gold-300)",
      main: "var(--gold-500)",
      mix: "var(--grad-gold)",
    },
    plum: {
      fg: "var(--plum-300)",
      main: "var(--plum-500)",
      mix: "color-mix(in oklab, var(--plum-500) 60%, var(--ink-900))",
    },
    forest: {
      fg: "var(--forest-300)",
      main: "var(--forest-500)",
      mix: "color-mix(in oklab, var(--forest-500) 60%, var(--ink-900))",
    },
    teal: {
      fg: "var(--teal-300)",
      main: "var(--teal-500)",
      mix: "color-mix(in oklab, var(--teal-500) 60%, var(--ink-900))",
    },
    crimson: {
      fg: "var(--crimson-300)",
      main: "var(--crimson-500)",
      mix: "color-mix(in oklab, var(--crimson-500) 62%, var(--ink-900))",
    },
    // Silver: used for the Body stat — a cool steel-gray, no house mapping.
    silver: {
      fg: "oklch(82% 0.012 222)",
      main: "oklch(62% 0.016 222)",
      mix: "color-mix(in oklab, oklch(62% 0.016 222) 60%, var(--ink-900))",
    },
  };

  // Shortcuts for backward compat: direct tone → CSS variable
  const TONE_FG = Object.fromEntries(
    Object.entries(TONE_COLORS).map(([k, v]) => [k, v.fg])
  );
  const TONE_500 = Object.fromEntries(
    Object.entries(TONE_COLORS).map(([k, v]) => [k, v.main])
  );
  const TONE_MIX = Object.fromEntries(
    Object.entries(TONE_COLORS).map(([k, v]) => [k, v.mix])
  );

  /* ----------------------- Level → tone mapping ----------------------- */
  const LEVEL_TONE_MAP = {
    basic: "forest",
    standard: "teal",
    advanced: "plum",
    legendary: "gold",
    hex: "crimson",
    twisted: "crimson",
  };

  // Extract level key and map to tone
  function levelTone(level) {
    if (!level) return null;
    const f = String(level).trim().toLowerCase().split(/\s+/)[0];
    return LEVEL_TONE_MAP[f] || null;
  }

  // Combined: accent style object + flat flag for any card driven by level
  function accentOf(level) {
    const t = levelTone(level);
    return {
      style: t ? { "--ent-accent": TONE_500[t] } : undefined,
      flat: !t,
      tone: t,
    };
  }

  /* ----------------- Higher-level behaviour: degree-scaling -------------- */
  // Spells resolve by DEGREES OF SUCCESS, not a binary hit/miss. The database
  // writes the scaling inline as compact notation embedded in prose:
  //   (a/b/c)    explicit ladder — holds the last value past the list
  //   (a/b/c+)   continues past the list by the final increment (… +d, +d …)
  //   (a/b*)     continues past the list by doubling (… ×2, ×2 …)
  //   x/degree   linear — x per degree of success
  //   (txt/txt2) non-numeric ladders pick the entry for that degree
  // Pluralisers like "question(s)" carry no separator and are left untouched.

  // Compute one parenthesised ladder's value at degree d (1-indexed).
  function hlbComputeList(inner, d) {
    let parts = inner.split(/[\/,]/).map((s) => s.trim());
    let suffix = null;
    const lastRaw = parts[parts.length - 1];
    if (/[+*]$/.test(lastRaw)) {
      suffix = lastRaw.slice(-1);
      parts[parts.length - 1] = lastRaw.slice(0, -1).trim();
    }
    const n = parts.length;
    const allNum = parts.every((p) => p !== "" && !isNaN(Number(p)));
    if (!allNum) return parts[Math.min(d, n) - 1];          // text ladder
    const nums = parts.map(Number);
    if (d <= n) return String(nums[d - 1]);                 // within the list
    if (suffix === "+") {                                   // extend by last step
      const incr = n >= 2 ? nums[n - 1] - nums[n - 2] : nums[n - 1];
      return String(nums[n - 1] + incr * (d - n));
    }
    if (suffix === "*") return String(nums[n - 1] * Math.pow(2, d - n)); // double
    return String(nums[n - 1]);                             // hold last
  }

  const HLB_NA = (t) => !t || /^n\/?a\.?$/i.test(String(t).trim());

  // Resolve prose at a degree into segments: [{ t:"text"|"val", v }]
  function hlbSegments(text, degree) {
    if (HLB_NA(text)) return null;
    const d = Math.max(1, degree | 0);
    const re = /([+\-]?)\(([^()]*[\/,][^()]*)\)(%?)|([+\-]?\d+)\s*\/\s*degree/g;
    const out = [];
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
      if (m[2] != null) {
        out.push({ t: "val", v: (m[1] || "") + hlbComputeList(m[2], d) + (m[3] || "") });
      } else {
        const mult = parseInt(m[4], 10);
        const val = mult * d;
        out.push({ t: "val", v: (m[4][0] === "+" && val >= 0 ? "+" : "") + val });
      }
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: "text", v: text.slice(last) });
    return out;
  }

  // Flatten to a plain string (used by the roll log at the rolled degree).
  function hlbResolveText(text, degree) {
    const segs = hlbSegments(text, degree);
    return segs ? segs.map((s) => s.v).join("") : null;
  }

  // Highest meaningful degree to expose (longest explicit ladder, clamped 5–8).
  function hlbMaxDegree(text) {
    if (HLB_NA(text)) return 5;
    const re = /\(([^()]*[\/,][^()]*)\)/g;
    let m, max = 0;
    while ((m = re.exec(text)) !== null) {
      const len = m[1].split(/[\/,]/).length;
      if (len > max) max = len;
    }
    return Math.min(8, Math.max(5, max));
  }

  /* ----------------------- Roman numerals -------------------------------- */
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  /* ----------------------- Ability resolution ---------------------------- */
  // A class-move TAG names the ability/abilities it rolls with as lowercase
  // strings (e.g. "recall information", "win over", "alchemy"). Resolve each to
  // the live sheet's roll source: a Stat's skill, or a magic subject. The DB
  // spelling sometimes differs from the sheet's display name, so a small alias
  // table bridges the gaps. Built lazily off SF_DATA (loaded before this file).
  const _norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  let _abilityIndex = null;
  function buildAbilityIndex() {
    const D = window.SF_DATA || {};
    const idx = {};
    (D.stats || []).forEach((fac) => {
      (fac.skills || []).forEach((sk) => {
        idx[_norm(sk.name)] = { kind: "skill", stat: fac.name, skill: sk.name, label: sk.name };
      });
    });
    (D.magicSchools || []).forEach((sc) => {
      (sc.subjects || []).forEach((sub) => {
        idx[_norm(sub.name)] = { kind: "subject", stat: sub.stat, subjectKey: sub.key, label: sub.name };
      });
    });
    // DB-spelling → sheet-display aliases (where the two don't match verbatim).
    const alias = {
      "recall information": "recall info",
      "investigation": "investigate",
      "win over": "win over",          // matches "Win Over" already, kept for clarity
      "sleight of hand": "sleight of hand",
      "read person": "read person",
    };
    for (const [from, to] of Object.entries(alias)) {
      if (!idx[from] && idx[_norm(to)]) idx[from] = idx[_norm(to)];
    }
    return idx;
  }
  // Resolve one ability name → { ability, kind, stat, skill?, subjectKey?, label } or null.
  function resolveAbility(name) {
    if (!_abilityIndex) _abilityIndex = buildAbilityIndex();
    const hit = _abilityIndex[_norm(name)];
    if (!hit) return null;
    return { ability: name, ...hit };
  }
  // Allow a rebuild if the school/stat structure is swapped wholesale (Forge).
  function resetAbilityIndex() { _abilityIndex = null; }

  /* ----------------------- Plant "Requires roll" behaviour --------------- */
  // The DB stores a "REQUIRES ROLL" column whose value drives how a plant's
  // Use action behaves. Values: YES | NO | MOVE | BONUS (Target; +n) | ABILITY |
  // CHOOSE. We keep the raw string in the data and interpret it here so the
  // sheet reads straight from the database.
  function parsePlantRoll(raw) {
    const s = String(raw == null ? "yes" : raw).trim();
    const upper = s.toUpperCase();
    if (upper.startsWith("BONUS")) {
      const m = /\(\s*(.+?)\s*[;,]\s*([+-]?\d+)\s*\)/.exec(s);
      return { mode: "bonus", bonusTarget: m ? m[1].trim() : "", bonusValue: m ? parseInt(m[2], 10) : 0 };
    }
    if (upper === "NO")      return { mode: "no" };
    if (upper === "MOVE")    return { mode: "move" };
    if (upper === "ABILITY") return { mode: "ability" };
    if (upper === "CHOOSE")  return { mode: "choose" };
    return { mode: "yes" };
  }

  // For MOVE plants, the linked Move drops the lead-in "You can bring this
  // plant with you." but otherwise keeps the ability text verbatim.
  function stripPlantCarry(text) {
    return String(text || "").replace(/^\s*You can bring this plant with you\.\s*/i, "");
  }

  // Short human label for a plant's use behaviour (compendium fact, etc.)
  const PLANT_ROLL_LABEL = { yes: "Roll to use", no: "No roll", move: "Grants a Move", bonus: "Grants a Bonus", ability: "Passive ability", choose: "Roll optional" };

  /* ----------------------- Export ----------------------- */
  window.SF_SHARED = {
    ICON_SVG_DEFAULTS,
    TONE_COLORS,
    TONE_FG,
    TONE_500,
    TONE_MIX,
    LEVEL_TONE_MAP,
    ROMAN,
    resolveAbility,
    resetAbilityIndex,
    levelTone,
    accentOf,
    hlbSegments,
    hlbResolveText,
    hlbMaxDegree,
    hlbIsNA: HLB_NA,
    parsePlantRoll,
    stripPlantCarry,
    PLANT_ROLL_LABEL,
  };
})();
