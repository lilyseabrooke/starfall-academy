/* ===========================================================================
   Starfall Academy — shared dice rolls
   Roll engine + toast stack + bottom-dock ledger.
   Exports: window.SF_ROLL (engine), SF_RollToasts, SF_RollDock.
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Badge } = SA;
  const SHARED = window.SF_SHARED;

  const Ic = ({ name, className, style, size }) => {
    const reg = window.lucide || {};
    const pascal = String(name).split(/[-_]/).map((s) => (s ? s[0].toUpperCase() + s.slice(1) : "")).join("");
    const map = reg.icons || reg;
    const def = map[pascal];
    const children = (Array.isArray(def) && Array.isArray(def[0]) ? def : (def && def[2]) || [])
      .filter((ch) => ch && typeof ch[0] === "string");
    return (
      <svg className={className} style={style} width={size || "1em"} height={size || "1em"} {...SHARED.ICON_SVG_DEFAULTS}>
        {children.map((ch, i) => React.createElement(ch[0], { key: i, ...ch[1] }))}
      </svg>
    );
  };

  /* ----------------------------- engine --------------------------------- */
  let _seq = 0;
  const d10 = () => 1 + Math.floor(Math.random() * 10);

  function classify(dice) {
    const has10 = dice.includes(10);
    const has1 = dice.includes(1);
    if (has1 && has10) return "inflection";      // one 1 + one 10 → plot twist
    if (has10) return "crit-success";            // any 10
    if (has1) return "crit-fail";                // any 1
    return "normal";
  }

  // ---- Critical effects ---------------------------------------------------
  // A roll may carry a crit "spec" describing special outcomes tied to the dice,
  // independent of the total. Pass `crit` as a profile NAME (string) or an inline
  // spec object: { fail?: {on,forces,label,text,backfire}, success?: {on,forces,label,text} }.
  //   on: "one" (a natural 1) · "ten" (a natural 10) · "always"
  //   forces: the crit overrides the totalled pass/fail (e.g. a Resist that
  //           auto-fails on a 1 or auto-succeeds on a 10).
  const CRIT_PROFILES = {
    // Every Resist save auto-fails on a 1 and auto-succeeds on a 10, whatever the total.
    resist: {
      fail:    { on: "one", forces: true, label: "Critical fail", text: "A natural 1 \u2014 the save fails outright, whatever the total." },
      success: { on: "ten", forces: true, label: "Critical success", text: "A natural 10 \u2014 the save holds outright, whatever the total." },
    },
  };
  // The level family of a spell (first word of its level, lower-cased).
  function spellLevelKey(level) {
    return String(level || "").trim().toLowerCase().split(/\s+/)[0];
  }
  // Spell backfire expressed as a crit spec (fail-flavoured; does NOT force the result).
  // Casting as a Ritual softens the recoil: a Standard ritual no longer backfires
  // at all, and a Hex ritual backfires only on a natural 1 (like a Standard) instead
  // of always. Advanced & Legendary keep their backfire-on-1 either way.
  function spellCrit(level, asRitual, volatile) {
    const f = spellLevelKey(level);
    const onAlways = { fail: { on: "always", forces: false, backfire: true, label: "Backfire" } };
    const onOne    = { fail: { on: "one",    forces: false, backfire: true, label: "Backfire" } };
    if (volatile) return onAlways;
    if (f === "hex" || f === "twisted")
      return asRitual ? onOne : onAlways;
    if (f === "standard") return asRitual ? null : onOne;
    if (f === "advanced" || f === "legendary") return onOne;
    return null;
  }
  // The Material cost to cast a spell. Casting as a Ritual waives an Advanced
  // spell's cost entirely and caps a Legendary at 500; a Hex costs 200 × its AP
  // regardless. Standard & Basic spells cost no Materials.
  function spellMaterialCost(level, ap, asRitual) {
    const f = spellLevelKey(level);
    if (f === "advanced")  return asRitual ? 0 : 500;
    if (f === "legendary") return asRitual ? 500 : 2000;
    if (f === "hex" || f === "twisted") return 200 * (ap || 0);
    return 0;
  }
  // Artificy save DC when an artifact move gets a critical failure (natural 1).
  // Basic 10 · Standard 15 · Advanced 20 · Legendary 25 · Twisted floor(cost/200).
  function artifactBackfireDC(level, cost) {
    const l = String(level || "").toLowerCase().trim();
    if (l === "basic")     return 10;
    if (l === "standard")  return 15;
    if (l === "advanced")  return 20;
    if (l === "legendary") return 25;
    if (l === "twisted")   return Math.floor((cost || 0) / 200);
    return 10;
  }
  // Resolve a crit spec against the rolled dice → a crit object or null.
  function resolveCrit(spec, dice) {
    if (!spec) return null;
    const has1 = dice.includes(1), has10 = dice.includes(10);
    const f = spec.fail, s = spec.success;
    if (f && f.on === "always") return { kind: "fail", ...f };
    if (has1 && has10) return null;                 // a split 1 & 10 is an inflection — no auto-crit
    if (f && f.on === "one" && has1) return { kind: "fail", ...f };
    if (s && s.on === "ten" && has10) return { kind: "success", ...s };
    return null;
  }

  function makeRoll(p) {
    const dice = p.dice ? p.dice.slice() : [d10(), d10()];
    const mod = p.mod || 0;
    const sit = p.situational != null ? p.situational : (p.sit || 0);
    const dc = (p.dc === 0 || p.dc) ? p.dc : null;   // null = rolled without a DC
    const total = dice[0] + dice[1] + mod + sit;

    // Crit: explicit `crit` (profile name or spec); resist rolls default to the
    // resist profile so every save carries the auto-fail / auto-succeed behaviour.
    let critSpec = typeof p.crit === "string" ? CRIT_PROFILES[p.crit] : p.crit;
    if (critSpec == null && (p.kind === "resist")) critSpec = CRIT_PROFILES.resist;
    let crit = resolveCrit(critSpec, dice);

    // Degrees of success/failure — blocks of five past the DC (a meet = 1 degree).
    // A forcing crit overrides the totalled outcome (a bare 1 degree either way).
    let result = null, degrees = null, pass = null;
    if (dc != null) {
      if (crit && crit.forces) {
        pass = crit.kind === "success";
        result = pass ? "success" : "failure";
        degrees = 1;
      } else {
        const diff = total - dc;
        pass = total >= dc;
        result = diff >= 0 ? "success" : "failure";
        degrees = Math.floor(Math.abs(diff) / 5) + 1;
      }
    }

    // Apply DoS modifier: shifts outcome tiers without changing the roll total.
    // Scale has no 0th tier (DoF 1 … DoS 1 …), so crossing zero skips one step.
    //   e.g. roll 9 DC 12 = DoF 1; +1 DoS → DoS 1. Total stays 9.
    //        roll 15 DC 13 = DoS 1; +1 DoS → DoS 2. Total stays 15.
    const dosMod = p.dosMod || 0;
    if (dc != null && dosMod !== 0 && !(crit && crit.forces)) {
      const pos = pass ? degrees : -degrees;  // signed tier: positive = success
      let newPos = pos + dosMod;
      // Skip the missing zero: crossing from negative to positive (or vice versa)
      // takes one extra step to account for the gap between DoF 1 and DoS 1.
      if (pos < 0 && newPos >= 0) newPos += 1;
      else if (pos > 0 && newPos <= 0) newPos -= 1;
      if (newPos === 0) newPos = 1;             // safety: 0 can't occur post-skip
      pass    = newPos > 0;
      result  = newPos > 0 ? "success" : "failure";
      degrees = Math.max(1, Math.abs(newPos));
    }

    // Attunement: a landed attunement always flares like a critical success —
    // the artifact waking to its bearer. A failed attunement carries no dice
    // crit (its consequence is the Resist prompt fired by the roll state).
    if (p.kind === "attune" && dc != null) {
      if (pass) {
        const artName = String(p.label || "").replace(/^Attune to /, "");
        const article = /^the\s/i.test(artName) ? "" : "the ";
        crit = { kind: "success", label: "Attuned", text: " — You and " + article + artName + " are now linked." };
      } else {
        crit = null;
      }
    }
    return {
      id: "r" + (++_seq) + "-" + Date.now(),
      ts: p.ts || Date.now(),
      who: p.who,                    // { id?, name, initials?, tone, gm? }
      label: p.label,
      kind: p.kind || "skill",       // skill | move | spell | resist
      stat: p.stat || "",
      meta: p.meta || null,
      detail: p.detail || null,
      success: p.success || null,
      fail: p.fail || null,
      hl: p.hl || null,              // (degrees, isSuccess) => string — higher-level behaviour
      dice, mod,
      sit, sitReason: p.sitReason || null,
      dc,
      total,
      outcome: classify(dice),                 // dice flair (per-die 1s/10s)
      pass,
      result, degrees,
      dosMod: dosMod || 0,                     // outcome-tier shift applied (0 = none)
      crit,                                    // { kind:"fail"|"success", forces, label, text, backfire? } | null
      resist: p.resist || null,                // optional resist-on-fail config (e.g. failed attunement)
      hours: p.hours || null,                  // wandcraft: hours of work intended
      artifactId: p.artifactId || null,        // artifact backfire: which artifact to degrade
      artifactLevel: p.artifactLevel || null,  // artifact backfire: level (determines DC)
      artifactCost: p.artifactCost || 0,       // artifact backfire: cost (Twisted DC calc)
      artifactCondition: p.artifactCondition || null, // artifact backfire: current condition
    };
  }

  // The headline a roll wears. With a DC, an Inflection still trumps; otherwise
  // the degrees strip carries the result, so no pass/fail chip is needed (the
  // dice flair lives on the die tiles). Without a DC, dice flair leads.
  function headline(roll) {
    if (roll.dc != null) {
      if (roll.outcome === "inflection") return { key: "inflection", tone: "gold", label: "Inflection" };
      return { key: roll.result };   // success | failure — colours the total, no chip
    }
    if (roll.outcome === "inflection") return { key: "inflection", tone: "gold", label: "Inflection" };
    if (roll.outcome === "crit-success") return { key: "crit-success", tone: "forest", label: "Critical" };
    if (roll.outcome === "crit-fail") return { key: "crit-fail", tone: "crimson", label: "Crit fail" };
    return { key: "normal" };
  }

  window.SF_ROLL = { makeRoll, classify, d10, headline, spellCrit, spellMaterialCost, spellLevelKey, artifactBackfireDC };

  /* ----------------------------- helpers -------------------------------- */
  const TONE_MIX = SHARED.TONE_MIX;
  const OUTCOME = {
    normal: { chip: false },
    "crit-success": { chip: true, tone: "forest", label: "Critical" },
    "crit-fail": { chip: true, tone: "crimson", label: "Crit fail" },
    inflection: { chip: true, tone: "gold", label: "Inflection" },
  };
  const initialsOf = (name) => String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  function subLabel(roll) {
    const base = roll.kind === "skill" ? roll.stat + " check"
      : roll.kind === "resist" ? roll.stat + " save"
      : roll.kind === "metabolize" ? roll.stat + " · Metabolize roll"
      : roll.kind === "attune" ? roll.stat + " · Attunement roll"
      : roll.kind === "improve" ? roll.stat + " · Improvement roll"
      : roll.kind === "learn" ? roll.stat + " · Learning roll"
      : roll.kind === "repair" ? roll.stat + " · Artifact repair roll"
      : roll.kind === "wandcraft" ? roll.stat + " · Wandcraft roll"
      : roll.stat + " · " + cap(roll.kind);
    return roll.dc != null ? base + " · DC " + roll.dc : base;
  }
  const sitText = (v) => (v > 0 ? "+" : "−") + Math.abs(v);
  function relTime(ts) {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 8) return "just now";
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    return h + "h ago";
  }

  /* --------------------------- RollEntry -------------------------------- */
  /* The shared atom. `affordance` shows a chevron (ledger); `hint` shows a
     "hover to read" cue (toast). `expanded` reveals the rules-text payload. */
  function RollEntry({ roll, expanded, compact, affordance, hint }) {
    const h = headline(roll);
    const hasDetail = !!(roll.detail || roll.success || roll.fail || roll.sitReason || roll.hl || (roll.meta && roll.meta.length));
    const avStyle = { background: TONE_MIX[roll.who.tone] || "var(--ink-600)" };
    return (
      <div className={"sf-re out-" + h.key + (roll.crit ? " is-crit-" + roll.crit.kind : "")}>
        <div className="sf-re__head">
          <span className={"sf-re-av" + (roll.who.gm ? " is-gm" : "")} style={avStyle}>
            {roll.who.initials || initialsOf(roll.who.name)}
          </span>
          <span className="sf-re__who">
            <span className="sf-re__name">
              {roll.who.name}
              {roll.who.gm && <span className="sf-re__gm">Game Master</span>}
            </span>
            <span className="sf-re__stat">{subLabel(roll)}</span>
          </span>
          {h.label && <Badge tone={h.tone} dot>{h.label}</Badge>}
          {affordance && hasDetail && <Ic name="chevron-down" className={"sf-re__chev" + (expanded ? " is-open" : "")} />}
        </div>

        <div className="sf-re__roll">
          <span className="sf-re__label">{roll.label}</span>
          <span className="sf-re__dice">
            {roll.dice.map((d, i) => (
              <span key={i} className={"sf-die" + (d === 10 ? " is-ten" : d === 1 ? " is-one" : "")}>{d}</span>
            ))}
            <span className="sf-re__mod">{roll.mod >= 0 ? "+" : "−"}{Math.abs(roll.mod)}</span>
            {roll.sit ? <span className="sf-re__sit">{sitText(roll.sit)}</span> : null}
            <span className="sf-re__eq">=</span>
            <span className="sf-re__total">{roll.total}</span>
          </span>
        </div>

        {roll.dc != null && (
          <div className={"sf-re__deg out-" + roll.result}>
            <span className="sf-re__deg-pips">
              {Array.from({ length: Math.min(roll.degrees, 6) }).map((_, i) => <i key={i}></i>)}
              {roll.degrees > 6 ? <span className="sf-re__deg-plus">+</span> : null}
            </span>
            <span className="sf-re__deg-label">{roll.degrees} {roll.degrees === 1 ? "degree" : "degrees"} of {roll.result}</span>
          </div>
        )}

        {roll.crit && (
          <div className={"sf-re__crit is-" + roll.crit.kind + (roll.crit.backfire ? " is-backfire" : "")}>
            <span className="sf-re__crit-glyph"><Ic name={roll.crit.kind === "success" ? "sparkles" : "flame"} /></span>
            <span className="sf-re__crit-txt">
              <b>{roll.crit.label}</b>
              {roll.crit.backfire
                ? roll.crit.artifactBackfire
                    ? (roll.pass === true  ? "The move lands — but the artifact strains against you. Roll Artificy."
                       : roll.pass === false ? "The move fails, and the artifact strains against you. Roll Artificy."
                       : "A natural 1 — the artifact strains against you. Roll Artificy.")
                    : (roll.pass ? "It casts — but the magic turns on you. Resist."
                       : roll.pass === false ? "The casting fails and turns on you. Resist."
                       : "The magic turns on you. Resist.")
                : (roll.crit.text || "")}
            </span>
          </div>
        )}

        {expanded && hasDetail && (
          <div className="sf-re__detail">
            {roll.sit && roll.sitReason ? (
              <p className="sf-re__sitline"><b>{sitText(roll.sit)} situational</b>{roll.sitReason}</p>
            ) : null}
            {roll.meta && roll.meta.length > 0 && (
              <div className="sf-re__chips">{roll.meta.map((m, i) => <span key={i} className="sf-chip">{m}</span>)}</div>
            )}
            {roll.detail && <p className="sf-re__desc">{roll.detail}</p>}
            {roll.dc != null && roll.hl ? (
              <p className={"sf-re__hl out-" + roll.result}>
                <b>{roll.result === "success" ? "At " + roll.degrees + (roll.degrees === 1 ? " degree" : " degrees") : roll.degrees + (roll.degrees === 1 ? " degree" : " degrees") + " of failure"}</b>
                {roll.hl(roll.degrees, roll.result === "success")}
              </p>
            ) : roll.dc != null && (roll.success || roll.fail) ? (
              <div className="sf-re__io">
                {roll.result === "success" && roll.success && <p className="io-hit"><b>On a hit</b>{roll.success}</p>}
                {roll.result === "failure" && roll.fail && <p className="io-miss"><b>On a miss</b>{roll.fail}</p>}
              </div>
            ) : (roll.success || roll.fail) ? (
              <div className="sf-re__io">
                {roll.success && <p className="io-hit"><b>On a hit</b>{roll.success}</p>}
                {roll.fail && <p className="io-miss"><b>On a miss</b>{roll.fail}</p>}
              </div>
            ) : null}
          </div>
        )}

        {hint && compact && hasDetail && !expanded && (
          <div className="sf-rtoast__foot">
            <span className="sf-re__hint"><Ic name="scroll-text" /> Hover to read · click to keep</span>
          </div>
        )}
      </div>
    );
  }

  /* --------------------------- RollPrompt ------------------------------- */
  /* Asks for a difficulty + situational modifier before a roll. Opens anchored
     to the trigger; DC empty = roll without a DC (the current behaviour).
     Enter rolls · Esc cancels. */
  function RollPrompt({ pending, onConfirm, onCancel }) {
    const [dc, setDc] = React.useState("");
    const [sit, setSit] = React.useState("");
    const [asRitual, setAsRitual] = React.useState(false);
    const [matCost, setMatCost] = React.useState("0");
    const [hours, setHours] = React.useState("1");
    const [picked, setPicked] = React.useState({});   // conditional-bonus id → opted in?
    const [stage, setStage] = React.useState("form");   // form | warn
    const dcRef = React.useRef(null);
    const boxRef = React.useRef(null);

    // ---- Spell-casting context (derived from the pending partial) ----
    const p = pending ? pending.partial : null;
    const isSpell = !!p && p.kind === "spell";
    const isWandcraft = !!p && p.kind === "wandcraft";
    const lvlKey = isSpell ? window.SF_ROLL.spellLevelKey(p.spellLevel) : "";
    const baseCost   = isSpell ? window.SF_ROLL.spellMaterialCost(p.spellLevel, p.spellAp, false) : 0;
    const ritualCost = isSpell ? window.SF_ROLL.spellMaterialCost(p.spellLevel, p.spellAp, true) : 0;
    const canRitual  = !!(p && p.canRitual);
    const condBonuses = (p && p.condBonuses) || [];
    const showCost   = isSpell && (baseCost > 0 || ritualCost > 0);
    const materials  = p && p.materials != null ? p.materials : Infinity;
    const hasMatLimit = materials !== Infinity;

    React.useEffect(() => {
      if (!pending) return;
      const pp = pending.partial;
      setDc(pp.dc != null ? String(pp.dc) : ""); setSit("");
      setAsRitual(false);
      setPicked({});
      setStage("form");
      setMatCost(pp.kind === "spell" ? String(window.SF_ROLL.spellMaterialCost(pp.spellLevel, pp.spellAp, false)) : "0");
      setHours("1");
      const id = setTimeout(() => dcRef.current && dcRef.current.select(), 30);
      const onKey = (e) => { if (e.key === "Escape") onCancel(); };
      document.addEventListener("keydown", onKey);
      return () => { clearTimeout(id); document.removeEventListener("keydown", onKey); };
    }, [pending && pending.id]);
    // The estH estimate can undercount (variable-height conditional notes, wrapped
    // text). After paint, measure the real box and nudge it up so it never spills
    // off the bottom; if it's taller than the viewport it scrolls internally.
    React.useLayoutEffect(() => {
      const el = boxRef.current;
      if (!el) return;
      const M = 12, h = el.offsetHeight;
      const maxTop = window.innerHeight - M - h;
      const cur = parseFloat(el.style.top) || 0;
      if (cur > maxTop) el.style.top = Math.max(M, maxTop) + "px";
    });

    if (!pending) return null;

    const base = p.mod || 0;
    const sitNum = parseInt(sit, 10) || 0;
    const condSum = condBonuses.reduce((s, b) => s + (picked[b.id] ? b.value : 0), 0);
    const combined = base + sitNum + condSum;
    const costNum = showCost ? (parseInt(matCost, 10) || 0) : 0;

    // Toggling Ritual re-fills the standard Material cost for that casting mode.
    const toggleRitual = (val) => {
      setAsRitual(val);
      if (showCost) setMatCost(String(window.SF_ROLL.spellMaterialCost(p.spellLevel, p.spellAp, val)));
    };

    // Build the confirm payload, optionally overriding ritual / cost (used by the warning options).
    const buildOpts = (ritual, cost) => {
      const pickedList = condBonuses.filter((b) => picked[b.id]);
      const condMeta = pickedList.map((b) => b.source + " " + (b.value >= 0 ? "+" : "\u2212") + Math.abs(b.value));
      const baseOpts = { dc: dc === "" ? null : parseInt(dc, 10), situational: sitNum, condBonus: condSum, condMeta };
      if (!isSpell) return { ...baseOpts, ...(isWandcraft ? { hours: Math.max(1, parseInt(hours, 10) || 1) } : {}) };
      const metaAdd = [];
      if (canRitual) metaAdd.push(ritual ? "Ritual · 1 Hour" : "Instant");
      if (showCost) metaAdd.push(cost + " materials");
      return {
        ...baseOpts,
        crit: window.SF_ROLL.spellCrit(p.spellLevel, ritual, p.spellVolatile),
        matCost: showCost ? cost : 0,
        asRitual: ritual,
        meta: (p.meta || []).concat(metaAdd),
      };
    };
    const commit = (over) => {
      over = over || {};
      const ritual = over.asRitual != null ? over.asRitual : asRitual;
      const cost = over.matCost != null ? over.matCost : costNum;
      onConfirm(buildOpts(ritual, cost));
    };
    // Casting a spell you can't afford raises the warning instead of rolling.
    const attempt = () => {
      if (showCost && hasMatLimit && costNum > materials) { setStage("warn"); return; }
      commit();
    };
    const onKeyDown = (e) => { if (e.key === "Enter" && stage === "form") { e.preventDefault(); attempt(); } };
    const bumpDc = (d) => setDc((v) => String(Math.max(1, (parseInt(v || "0", 10) || 0) + d)));
    const bumpSit = (d) => setSit((v) => String(Math.max(-20, Math.min(20, (parseInt(v || "0", 10) || 0) + d))));
    const bumpCost = (d) => setMatCost((v) => String(Math.max(0, (parseInt(v || "0", 10) || 0) + d)));
    const bumpHours = (d) => setHours((v) => String(Math.max(1, (parseInt(v || "1", 10) || 1) + d)));

    const offerRitual = canRitual && !asRitual && hasMatLimit && ritualCost <= materials && ritualCost < costNum;

    const r = pending.rect, W = 304, M = 12;
    let estH = 280;
    if (isSpell && (canRitual || showCost)) {
      estH += 12 + 52;                         // cast block: gap + padding + "Casting" label
      if (canRitual) estH += 40;               // Standard / Ritual segmented toggle
      if (showCost) estH += 40;                // Material cost number row
    }
    if (isWandcraft) estH += 76;               // hours input field
    if (condBonuses.length) estH += 30 + condBonuses.length * 44;   // conditional-bonus options block
    if (stage === "warn") estH = 270 + (offerRitual ? 56 : 0);
    // Never let the prompt exceed the viewport — it scrolls internally instead.
    const maxH = window.innerHeight - 2 * M;
    const boxH = Math.min(estH, maxH);
    const left = Math.min(Math.max(M, r.left), window.innerWidth - M - W);
    let top;
    if (r.bottom + 8 + boxH <= window.innerHeight - M) top = r.bottom + 8;
    else if (r.top - 8 - boxH >= M) top = r.top - 8 - boxH;
    else top = window.innerHeight - M - boxH;
    top = Math.max(M, Math.min(top, window.innerHeight - M - boxH));

    return (
      <React.Fragment>
        <div className="sf-prompt-catch" onClick={onCancel}></div>
        <div ref={boxRef} className="sf-prompt" style={{ left, top, width: W, maxHeight: maxH }} onKeyDown={onKeyDown} role="dialog" aria-label="Set difficulty">
          <div className="sf-prompt__head">
            <span className="sf-prompt__sub">{subLabel({ ...p, dc: null })} · 2d10 + {base}</span>
            <span className="sf-prompt__label">{p.label}</span>
          </div>

          {stage === "warn" ? (
            <div className="sf-prompt__warn">
              <span className="sf-prompt__warn-head"><Ic name="triangle-alert" /> Sparked out</span>
              <p className="sf-prompt__warn-txt">
                You need <b>{costNum.toLocaleString()}</b> materials, but you only have <b>{materials.toLocaleString()}</b>. Burn your magic and cast anyway?
              </p>
              <div className="sf-prompt__warn-acts">
                {offerRitual && (
                  <button className="sf-prompt__warn-btn is-primary" onClick={() => commit({ asRitual: true, matCost: ritualCost })}>
                    <Ic name="scroll-text" /> Cast as Ritual (1 Hour)
                  </button>
                )}
                <button className="sf-prompt__warn-btn" onClick={() => commit({ matCost: materials })}>
                  <Ic name="dices" /> Spend all {materials.toLocaleString()} &amp; cast anyway
                </button>
                <div className="sf-prompt__warn-row">
                  <button className="sf-prompt__warn-btn is-ghost" onClick={() => setStage("form")}>
                    <Ic name="arrow-left" /> Back
                  </button>
                  <button className="sf-prompt__warn-btn is-ghost" onClick={onCancel}>
                    <Ic name="x" /> Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <React.Fragment>
              {isSpell && (canRitual || showCost) && (
                <div className="sf-prompt__cast">
                  <span className="sf-prompt__flabel">Casting
                    <span className="sf-prompt__casttime"><Ic name="clock" /> {canRitual ? (asRitual ? "1 Hour" : "Instant") : "Instant"}</span>
                  </span>
                  {canRitual && (
                    <div className="sf-prompt__seg">
                      <button className={"sf-prompt__segbtn" + (!asRitual ? " is-active" : "")} onClick={() => toggleRitual(false)}>Standard</button>
                      <button className={"sf-prompt__segbtn" + (asRitual ? " is-active" : "")} onClick={() => toggleRitual(true)}>Ritual</button>
                    </div>
                  )}
                  {showCost && (
                    <div className="sf-prompt__row">
                      <button className="sf-step" tabIndex={-1} onClick={() => bumpCost(-50)}>−</button>
                      <input className="sf-prompt__num sf-prompt__num--cost" type="number" inputMode="numeric" value={matCost} placeholder="0" onChange={(e) => setMatCost(e.target.value)} />
                      <button className="sf-step" tabIndex={-1} onClick={() => bumpCost(50)}>+</button>
                      <span className={"sf-prompt__sithint" + (hasMatLimit && costNum > materials ? " is-short" : "")}>
                        Materials{hasMatLimit ? " · you have " + materials.toLocaleString() : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {isWandcraft && (
                <div className="sf-prompt__field">
                  <span className="sf-prompt__flabel">Hours of work</span>
                  <div className="sf-prompt__row">
                    <button className="sf-step" tabIndex={-1} onClick={() => bumpHours(-1)}>−</button>
                    <input className="sf-prompt__num" type="number" inputMode="numeric" min="1" value={hours} placeholder="1" onChange={(e) => setHours(e.target.value)} />
                    <button className="sf-step" tabIndex={-1} onClick={() => bumpHours(1)}>+</button>
                    <span className="sf-prompt__sithint">hours intended</span>
                  </div>
                </div>
              )}
              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Difficulty
                  <button className="sf-prompt__none" tabIndex={-1} onClick={() => setDc("")}>{dc === "" ? "No DC" : "Clear"}</button>
                </span>
                <div className="sf-prompt__row">
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpDc(-1)}>−</button>
                  <input ref={dcRef} className="sf-prompt__num" type="number" inputMode="numeric" value={dc} placeholder="—" onChange={(e) => setDc(e.target.value)} />
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpDc(1)}>+</button>
                  <div className="sf-prompt__chips">
                    {[10, 15, 20, 25, 30].map((n) => (
                      <button key={n} tabIndex={-1} className={"sf-prompt__chip" + (String(n) === dc ? " is-active" : "")} onClick={() => setDc(String(n))}>{n}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Situational modifier</span>
                <div className="sf-prompt__row">
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpSit(-1)}>−</button>
                  <input className="sf-prompt__num" type="number" inputMode="numeric" value={sit} placeholder="0" onChange={(e) => setSit(e.target.value)} />
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpSit(1)}>+</button>
                  <span className="sf-prompt__sithint">applied to this roll only</span>
                </div>
              </div>

              {condBonuses.length > 0 && (
                <div className="sf-prompt__field">
                  <span className="sf-prompt__flabel">Conditional bonuses</span>
                  <div className="sf-prompt__cond">
                    {condBonuses.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={"sf-condopt" + (picked[b.id] ? " is-on" : "")}
                        onClick={() => setPicked((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                        aria-pressed={!!picked[b.id]}
                      >
                        <span className="sf-condopt__box"><Ic name="check" /></span>
                        <span className="sf-condopt__body">
                          <span className="sf-condopt__src">{b.source}</span>
                          {b.condNote ? <span className="sf-condopt__note">{b.condNote}</span> : null}
                        </span>
                        <span className={"sf-condopt__val " + (b.value >= 0 ? "pos" : "neg")}>{b.value >= 0 ? "+" : "−"}{Math.abs(b.value)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className="sf-prompt__roll" onClick={attempt}>
                <Ic name="dices" /> {isSpell ? "Cast" : "Roll"} 2d10 {combined >= 0 ? "+ " + combined : "− " + Math.abs(combined)}{dc !== "" ? "  vs DC " + dc : ""}
              </button>
              <span className="sf-prompt__hint">Enter to {isSpell ? "cast" : "roll"} · Esc to cancel</span>
            </React.Fragment>
          )}
        </div>
      </React.Fragment>
    );
  }

  /* --------------------------- RollToasts ------------------------------- */
  // A crit burst that lives inside the toast — embers, flare and glow emanating
  // from the card itself, tinted crimson for a fail or gold for a success.
  const CRIT_EMBERS = [
    { left: 12, delay: 0, dur: 1.0, drift: -26, size: 6 },
    { left: 20, delay: 0.12, dur: 1.3, drift: 16, size: 4 },
    { left: 28, delay: 0.05, dur: 1.15, drift: -14, size: 7 },
    { left: 35, delay: 0.2, dur: 1.4, drift: 22, size: 5 },
    { left: 42, delay: 0.02, dur: 1.05, drift: -20, size: 5 },
    { left: 48, delay: 0.16, dur: 1.35, drift: 12, size: 8 },
    { left: 54, delay: 0.08, dur: 1.1, drift: -10, size: 4 },
    { left: 60, delay: 0.24, dur: 1.45, drift: 26, size: 6 },
    { left: 66, delay: 0.04, dur: 1.0, drift: -24, size: 5 },
    { left: 72, delay: 0.18, dur: 1.3, drift: 18, size: 7 },
    { left: 78, delay: 0.1, dur: 1.15, drift: -16, size: 4 },
    { left: 84, delay: 0.28, dur: 1.4, drift: 24, size: 6 },
    { left: 16, delay: 0.32, dur: 1.25, drift: 30, size: 3 },
    { left: 38, delay: 0.36, dur: 1.5, drift: -30, size: 4 },
    { left: 58, delay: 0.3, dur: 1.2, drift: 14, size: 3 },
    { left: 76, delay: 0.4, dur: 1.45, drift: -22, size: 5 },
    { left: 90, delay: 0.14, dur: 1.1, drift: -12, size: 5 },
    { left: 8, delay: 0.22, dur: 1.35, drift: 20, size: 4 },
  ];
  function CritBurst({ kind }) {
    return (
      <span className={"sf-crit-burst is-" + kind} aria-hidden="true">
        <span className="sf-crit-burst__flare"></span>
        <span className="sf-crit-burst__embers">
          {CRIT_EMBERS.map((e, i) => (
            <span key={i} className="sf-crit-burst__ember" style={{ left: e.left + "%", width: e.size + "px", height: e.size + "px", "--delay": e.delay + "s", "--dur": e.dur + "s", "--drift": e.drift + "px" }}></span>
          ))}
        </span>
      </span>
    );
  }

  /* Watches the shared log; surfaces new rolls as transient toasts.
       · hover  → expand + pause retirement
       · click  → pin (stays until dismissed or pushed out by the stack cap)
       · idle   → after `lifetime`, fades over `graceMs`; hovering mid-fade restores it
       · cap    → only N visible; the oldest non-pinned slides into the ledger early */
  function RollToasts({ log, cap: capN, lifetime, graceMs, expandDefault, position }) {
    const [toasts, setToasts] = React.useState([]); // { roll, pinned, leaving, hover }
    const seen = React.useRef(new Set());
    const mounted = React.useRef(false);
    const timers = React.useRef({});
    const cfg = React.useRef({ capN, lifetime, graceMs });
    cfg.current = { capN, lifetime, graceMs };

    const clearTimers = (id) => {
      const t = timers.current[id];
      if (t) { clearTimeout(t.life); clearTimeout(t.leave); }
      delete timers.current[id];
    };
    const remove = (id) => { clearTimers(id); setToasts((p) => p.filter((t) => t.roll.id !== id)); };
    const beginLeave = (id) => {
      setToasts((p) => p.map((t) => (t.roll.id === id ? { ...t, leaving: true } : t)));
      const t = timers.current[id] || (timers.current[id] = {});
      clearTimeout(t.life);
      t.leave = setTimeout(() => remove(id), cfg.current.graceMs);
    };
    const scheduleLife = (id) => {
      clearTimers(id);
      timers.current[id] = { life: setTimeout(() => beginLeave(id), cfg.current.lifetime), leave: null };
    };

    const add = (roll) => {
      setToasts((prev) => {
        const next = [{ roll, pinned: false, leaving: false, hover: false }, ...prev];
        const active = next.filter((t) => !t.leaving);
        if (active.length > cfg.current.capN) {
          const overflow = active.length - cfg.current.capN;
          const unpinned = active.filter((t) => !t.pinned);
          const pool = unpinned.length >= overflow ? unpinned : active;
          pool.slice(pool.length - overflow).forEach((v) => setTimeout(() => beginLeave(v.roll.id), 0));
        }
        return next;
      });
      scheduleLife(roll.id);
    };

    React.useEffect(() => {
      if (!mounted.current) { mounted.current = true; log.forEach((r) => seen.current.add(r.id)); return; }
      const fresh = log.filter((r) => !seen.current.has(r.id));
      fresh.reverse().forEach((r) => { seen.current.add(r.id); add(r); });
    }, [log]);

    React.useEffect(() => () => { Object.keys(timers.current).forEach(clearTimers); }, []);

    const onEnter = (id) => { clearTimers(id); setToasts((p) => p.map((t) => (t.roll.id === id ? { ...t, leaving: false, hover: true } : t))); };
    const onLeave = (id) => setToasts((p) => {
      const t = p.find((x) => x.roll.id === id);
      if (t && !t.pinned) scheduleLife(id);
      return p.map((x) => (x.roll.id === id ? { ...x, hover: false } : x));
    });
    const togglePin = (id) => {
      let willPin = false;
      setToasts((p) => p.map((t) => {
        if (t.roll.id !== id) return t;
        willPin = !t.pinned;
        return { ...t, pinned: willPin, leaving: false };
      }));
      clearTimers(id);
      setTimeout(() => { if (!willPin) scheduleLife(id); }, 0);
    };

    return (
      <div className={"sf-toasts pos-" + position} aria-live="polite">
        {toasts.map((t) => {
          const expanded = t.hover || t.pinned || expandDefault;
          return (
            <div
              key={t.roll.id}
              className={"sf-rtoast out-" + window.SF_ROLL.headline(t.roll).key + (t.roll.crit ? " is-crit is-crit-" + t.roll.crit.kind : "") + (t.leaving ? " is-leaving" : "") + (t.pinned ? " is-pinned" : "")}
              style={{ "--grace": cfg.current.graceMs + "ms" }}
              onMouseEnter={() => onEnter(t.roll.id)}
              onMouseLeave={() => onLeave(t.roll.id)}
              onClick={() => togglePin(t.roll.id)}
            >
              {t.pinned && <span className="sf-rtoast__pin"><Ic name="pin" /></span>}
              <button className="sf-rtoast__x" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); remove(t.roll.id); }}><Ic name="x" /></button>
              {t.roll.crit ? <CritBurst kind={t.roll.crit.kind} />
                : t.roll.outcome === "inflection" ? <CritBurst kind="inflect" />
                : null}
              <RollEntry roll={t.roll} expanded={expanded} compact hint />
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------------------- RollDock -------------------------------- */
  /* Always-visible bar showing the latest roll; expands into the full shared
     ledger with per-entry progressive disclosure and party / GM filters. */
  function RollDock({ log, open, onToggle, meId }) {
    const [filter, setFilter] = React.useState("all");
    const [openRows, setOpenRows] = React.useState({});
    const latest = log[0];

    const filters = [
      { id: "all", label: "All" },
      { id: "mine", label: "Mine" },
      { id: "party", label: "Party" },
      { id: "gm", label: "Game Master" },
    ];
    const match = (r) => filter === "all" ? true
      : filter === "mine" ? r.who.id === meId
      : filter === "gm" ? !!r.who.gm
      : (!r.who.gm && r.who.id !== meId);
    const items = log.filter(match);
    const toggleRow = (id) => setOpenRows((p) => ({ ...p, [id]: !p[id] }));

    return (
      <div className={"sf-dock" + (open ? " is-open" : "")}>
        <div className="sf-dock__panel">
          <div className="sf-dock__phead">
            <span className="sf-eyebrow">The Roll Log</span>
            <div className="sf-dock__filters">
              {filters.map((f) => (
                <button key={f.id} className={"sf-dock__filt" + (filter === f.id ? " is-active" : "")} onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="sf-log-list">
            {items.length === 0 ? (
              <div className="sf-log-empty">
                <Ic name="dices" />
                <p>No rolls in this view yet.</p>
              </div>
            ) : items.map((r) => {
              const hasDetail = !!(r.detail || r.success || r.fail || r.sitReason || (r.meta && r.meta.length));
              return (
                <div
                  key={r.id}
                  className={"sf-log-row out-" + window.SF_ROLL.headline(r).key + (hasDetail ? " has-detail" : "")}
                  onClick={hasDetail ? () => toggleRow(r.id) : undefined}
                >
                  <RollEntry roll={r} expanded={!!openRows[r.id]} compact affordance />
                  <span className="sf-log-time">{relTime(r.ts)}</span>
                </div>
              );
            })}
          </div>
          <div className="sf-dock__foot">
            <Ic name="eye-off" /> Secret rolls are kept by the Game Master and never appear here.
          </div>
        </div>

        <button className="sf-dock__bar" onClick={onToggle}>
          <span className="sf-dock__brand"><Ic name="dices" /> Roll Log</span>
          <span className="sf-dock__sep"></span>
          {latest ? (
            <span className={"sf-dock__latest out-" + window.SF_ROLL.headline(latest).key}>
              <span className={"sf-re-av" + (latest.who.gm ? " is-gm" : "")} style={{ background: TONE_MIX[latest.who.tone] || "var(--ink-600)" }}>
                {latest.who.initials || initialsOf(latest.who.name)}
              </span>
              <span className="sf-dock__lname">{latest.label}</span>
              <span className="sf-dock__lwho">· {latest.who.name}</span>
              <span style={{ flex: 1 }}></span>
              <span className="sf-dock__ltotal">{latest.total}</span>
            </span>
          ) : (
            <span className="sf-dock__empty">No rolls yet — roll a skill or move to begin.</span>
          )}
          <span className="sf-dock__count">{log.length}</span>
          <Ic name={open ? "chevron-down" : "chevron-up"} className="sf-dock__chev" />
        </button>
      </div>
    );
  }

  Object.assign(window, {
    SF_RollEntry: RollEntry,
    SF_RollToasts: RollToasts,
    SF_RollDock: RollDock,
    SF_RollPrompt: RollPrompt,
  });
})();
