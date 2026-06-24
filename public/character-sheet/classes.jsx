/* ===========================================================================
   Starfall Academy — Classes wing
   The rank-point ledger + 12 stacked class cards, each with an inline rank
   ladder. Ranking up and re-choosing both happen by clicking an option tile.
   Reads window.SF_CLASSES; all state is owned by the App and passed in.
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button } = SA;
  const Ic = window.SF_Ic;

  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const TONE_FG  = window.SF_SHARED.TONE_FG;
  const TONE_500 = window.SF_SHARED.TONE_500;

  /* ------------------------------- RP ledger ---------------------------- */
  function RankPointsBar({ rp, onGrant, ownedCount, totalRanks }) {
    return (
      <section className="sf-rp">
        <span className="sf-rp__glyph"><Ic name="gem" /></span>
        <div className="sf-rp__id">
          <span className="sf-eyebrow">The Ledger</span>
          <span className="sf-rp__cap">Rank Points · spend to advance or purchase a class</span>
        </div>
        <div className="sf-rp__dial">
          <button className="sf-step" title="Spend a rank point" onClick={() => onGrant(-1)}>−</button>
          <span className="sf-rp__num">{rp}</span>
          <button className="sf-step" title="Grant a rank point" onClick={() => onGrant(1)}>+</button>
        </div>
        <div className="sf-rp__summary">
          <div className="sf-rp__stat"><span className="sf-rp__statnum">{ownedCount}</span><span className="sf-rp__statcap">Classes</span></div>
          <span className="sf-rp__statsep"></span>
          <div className="sf-rp__stat"><span className="sf-rp__statnum">{totalRanks}</span><span className="sf-rp__statcap">Ranks held</span></div>
        </div>
      </section>
    );
  }

  /* ------------------------------ One option ---------------------------- */
  function OptionTile({ side, option, state, cost, onClick }) {
    // state: chosen | alt | open | open-locked | preview
    const cls = "sf-opt sf-opt--" + (side === 0 ? "left" : "right") + " is-" + state;
    const clickable = state === "chosen" || state === "alt" || state === "open";
    return (
      <button className={cls} disabled={!clickable && state !== "open-locked"} onClick={clickable ? onClick : undefined} type="button">
        <span className="sf-opt__title">{option.title}</span>
        <span className="sf-opt__desc">{option.desc}</span>
        <span className="sf-opt__flag">
          {state === "chosen" ? <React.Fragment><Ic name="check" /> Chosen</React.Fragment>
            : state === "alt" ? <React.Fragment><Ic name="repeat" /> Switch to this</React.Fragment>
            : state === "open" ? <React.Fragment><Ic name="plus" /> Choose · {cost} RP</React.Fragment>
            : state === "open-locked" ? <React.Fragment><Ic name="lock" /> Need {cost} RP</React.Fragment>
            : null}
        </span>
      </button>
    );
  }

  /* -------------------------------- Ladder ------------------------------ */
  function Ladder({ klass, rank, choices, rp, cost, onChoose, onRankUp }) {
    return (
      <div className="sf-ladder">
        {klass.ranks.map((rung, i) => {
          const L = i + 1;
          const reached = L <= rank;
          const isNext = L === rank + 1;
          const locked = L > rank + 1;
          const c = cost(L);
          const affordable = rp >= c;
          const chosen = choices[L];

          const stateFor = (s) => {
            if (reached) return chosen === s ? "chosen" : "alt";
            if (isNext) return affordable ? "open" : "open-locked";
            return "preview";
          };
          const clickFor = (s) => {
            if (reached) return () => onChoose(L, s);
            if (isNext && affordable) return () => onRankUp(L, s);
            return undefined;
          };

          return (
            <div key={L} className={"sf-rung is-" + (reached ? "reached" : isNext ? "next" : "locked")}>
              <OptionTile side={0} option={rung.options[0]} state={stateFor(0)} cost={c} onClick={clickFor(0)} />
              <div className="sf-rung__spine">
                <span className="sf-rung__num">{ROMAN[L]}</span>
                {isNext ? <span className="sf-rung__cost">{c} RP</span> : null}
              </div>
              <OptionTile side={1} option={rung.options[1]} state={stateFor(1)} cost={c} onClick={clickFor(1)} />
            </div>
          );
        })}
      </div>
    );
  }

  /* ------------------------------ Class card ---------------------------- */
  function ClassCard({ klass, rank, choices, rp, cost, expanded, onToggle, onChoose, onRankUp, onRefund }) {
    const owned = rank > 0;
    const maxed = rank >= 10;
    const nextCost = maxed ? null : cost(rank + 1);
    const canAdvance = !maxed && rp >= nextCost;
    const style = { "--cc-accent": TONE_500[klass.tone], "--cc-accent-fg": TONE_FG[klass.tone] };
    const sectionRef = React.useRef(null);

    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

    // Expand the card AND scroll the canvas so the is-next rung is visible.
    // Using double rAF so React has a chance to render the ladder first.
    const handleCtaClick = (e) => {
      e.stopPropagation();
      onToggle(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!sectionRef.current) return;
          const nextRung = sectionRef.current.querySelector('.sf-rung.is-next');
          if (!nextRung) return;
          const canvas = sectionRef.current.closest('.sf-canvas');
          if (!canvas) return;
          const rungTop = nextRung.getBoundingClientRect().top;
          const canvasTop = canvas.getBoundingClientRect().top;
          const target = canvas.scrollTop + rungTop - canvasTop - 80;
          canvas.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
        });
      });
    };

    return (
      <section ref={sectionRef} className={"sf-cc" + (owned ? " is-owned" : "") + (expanded ? " is-open" : "")} style={style}>
        <header className="sf-cc__head" onClick={onToggle}>
          <span className="sf-cc__glyph"><Ic name={klass.icon} /></span>
          <div className="sf-cc__id">
            <span className="sf-cc__name">{klass.name}</span>
            <span className="sf-cc__tag">{klass.description || klass.tagline}</span>
          </div>

          <div className="sf-cc__meter" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={"sf-tick" + (i < rank ? " on" : (i === rank && !maxed) ? " next" : "")}></span>
            ))}
          </div>

          <div className="sf-cc__cta">
            {maxed ? (
              <span className="sf-cc__cost is-maxed"><Ic name="crown" /> Mastered</span>
            ) : (
              <React.Fragment>
                <button
                  className={"sf-cc__cost" + (canAdvance ? " can" : " cant")}
                  title={canAdvance ? "Open to choose your next rank" : `Need ${nextCost} RP to advance`}
                  onClick={handleCtaClick}>
                  <Ic name={owned ? "chevron-down" : "sparkles"} />
                  {owned ? `Next Rank: ${ROMAN[rank + 1]}` : "Enroll"}
                </button>
              </React.Fragment>
            )}
          </div>

          <div className="sf-cc__rank-row">
            <div className="sf-cc__rank">
              {owned ? (
                <React.Fragment>
                  <button className="sf-cc__refund" title={`Refund Rank ${ROMAN[rank]} · +${cost(rank)} RP`} onClick={stop(onRefund)}><Ic name="minus" /></button>
                  <span className="sf-cc__rankbox"><span className="sf-cc__ranklabel">Rank</span><span className="sf-cc__ranknum">{ROMAN[rank]}</span></span>
                </React.Fragment>
              ) : (
                <span className="sf-cc__unenrolled">Not enrolled</span>
              )}
            </div>
            <span className="sf-cc__chev"><Ic name="chevron-down" /></span>
          </div>
        </header>

        {expanded ? (
          <Ladder klass={klass} rank={rank} choices={choices} rp={rp} cost={cost} onChoose={onChoose} onRankUp={onRankUp} />
        ) : null}
      </section>
    );
  }

  /* ------------------------------- The wing ----------------------------- */
  function ClassesPage({ data, state, rp, density, onGrantRp, onChoose, onRankUp, onRefund }) {
    const classes = data.classes;
    const cost = data.cost;

    // Which cards are expanded. Default: open the owned ones.
    const [expanded, setExpanded] = React.useState(() => {
      const s = {};
      classes.forEach((k) => { if ((state[k.id] && state[k.id].rank) > 0) s[k.id] = true; });
      return s;
    });
    const toggle = (id, force) => setExpanded((m) => ({ ...m, [id]: force === true ? true : !m[id] }));

    // Show only enrolled classes by default.
    const [ownedOnly, setOwnedOnly] = React.useState(true);

    const owned = classes.filter((k) => (state[k.id] && state[k.id].rank) > 0);
    const ownedCount = owned.length;
    const totalRanks = owned.reduce((n, k) => n + state[k.id].rank, 0);
    const shown = ownedOnly ? owned : classes;

    return (
      <div className={"sf-canvas sf-classes density-" + (density || "roomy")}>
        <RankPointsBar rp={rp} onGrant={onGrantRp} ownedCount={ownedCount} totalRanks={totalRanks} />

        <div className="sf-sec-head sf-sec-head--actions">
          <h2>Classes</h2><hr className="sf-rule" />
          <span className="sf-sec-head__count">{ownedCount} of {classes.length} enrolled</span>
          <button
            type="button"
            className={"sf-ghost-btn" + (ownedOnly ? " is-on" : "")}
            aria-pressed={ownedOnly}
            onClick={() => setOwnedOnly((v) => !v)}
          >
            <Ic name={ownedOnly ? "filter" : "filter-x"} /> {ownedOnly ? "Enrolled only" : "All classes"}
          </button>
        </div>

        <div className="sf-classlist">
          {shown.map((k) => {
            const st = state[k.id] || { rank: 0, choices: {} };
            return (
              <ClassCard
                key={k.id}
                klass={k}
                rank={st.rank}
                choices={st.choices}
                rp={rp}
                cost={cost}
                expanded={!!expanded[k.id]}
                onToggle={(force) => toggle(k.id, force)}
                onChoose={(level, side) => onChoose(k.id, level, side)}
                onRankUp={(level, side) => onRankUp(k.id, level, side)}
                onRefund={() => onRefund(k.id)}
              />
            );
          })}
          {shown.length === 0 && (
            <div className="sf-classlist__empty">
              <p>Not enrolled in any classes yet.</p>
              <button type="button" className="sf-ghost-btn" onClick={() => setOwnedOnly(false)}>
                <Ic name="filter-x" /> Show all classes
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.SF_ClassesPage = ClassesPage;
})();
