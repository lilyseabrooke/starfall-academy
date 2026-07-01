"use client";

/* ===========================================================================
   Starfall Academy — Classes wing
   Ported from public/character-sheet/classes.jsx (window.SF_ClassesPage).
   RP ledger + stacked class cards with an inline rank ladder. All state is
   owned by the root and passed in.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import { ROMAN, TONE_500, TONE_FG } from "../../data/shared";
import type { ClassDef, ClassOption } from "../../data/classes";
import type { ClassState } from "../../types";

/* ------------------------------- RP ledger ---------------------------- */
function RankPointsBar({ rp, onGrant, ownedCount, totalRanks }: { rp: number; onGrant: (d: number) => void; ownedCount: number; totalRanks: number }) {
  return (
    <section className="sf-rp">
      <span className="sf-rp__glyph"><Icon name="gem" /></span>
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
        <span className="sf-rp__statsep" />
        <div className="sf-rp__stat"><span className="sf-rp__statnum">{totalRanks}</span><span className="sf-rp__statcap">Ranks held</span></div>
      </div>
    </section>
  );
}

/* ------------------------------ One option ---------------------------- */
type OptionState = "chosen" | "alt" | "open" | "open-locked" | "preview";

function OptionTile({ side, option, state, cost, onClick }: { side: 0 | 1; option: ClassOption; state: OptionState; cost: number; onClick?: () => void }) {
  const cls = "sf-opt sf-opt--" + (side === 0 ? "left" : "right") + " is-" + state;
  const clickable = state === "chosen" || state === "alt" || state === "open";
  return (
    <button className={cls} disabled={!clickable && state !== "open-locked"} onClick={clickable ? onClick : undefined} type="button">
      <span className="sf-opt__title">{option.title}</span>
      <span className="sf-opt__desc">{option.desc}</span>
      <span className="sf-opt__flag">
        {state === "chosen" ? <React.Fragment><Icon name="check" /> Chosen</React.Fragment>
          : state === "alt" ? <React.Fragment><Icon name="repeat" /> Switch to this</React.Fragment>
          : state === "open" ? <React.Fragment><Icon name="plus" /> Choose · {cost} RP</React.Fragment>
          : state === "open-locked" ? <React.Fragment><Icon name="lock" /> Need {cost} RP</React.Fragment>
          : null}
      </span>
    </button>
  );
}

/* -------------------------------- Ladder ------------------------------ */
function Ladder({ klass, rank, choices, rp, cost, onChoose, onRankUp }: {
  klass: ClassDef;
  rank: number;
  choices: Record<string, number>;
  rp: number;
  cost: (n: number) => number;
  onChoose: (level: number, side: number) => void;
  onRankUp: (level: number, side: number) => void;
}) {
  return (
    <div className="sf-ladder">
      {klass.ranks.map((rung, i) => {
        const L = i + 1;
        const reached = L <= rank;
        const isNext = L === rank + 1;
        const c = cost(L);
        const affordable = rp >= c;
        const chosen = choices[L];

        const stateFor = (s: number): OptionState => {
          if (reached) return chosen === s ? "chosen" : "alt";
          if (isNext) return affordable ? "open" : "open-locked";
          return "preview";
        };
        const clickFor = (s: number): (() => void) | undefined => {
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
function ClassCard({ klass, rank, choices, rp, cost, expanded, onToggle, onChoose, onRankUp, onRefund }: {
  klass: ClassDef;
  rank: number;
  choices: Record<string, number>;
  rp: number;
  cost: (n: number) => number;
  expanded: boolean;
  onToggle: (force?: boolean) => void;
  onChoose: (level: number, side: number) => void;
  onRankUp: (level: number, side: number) => void;
  onRefund: () => void;
}) {
  const owned = rank > 0;
  const maxed = rank >= 10;
  const nextCost = maxed ? null : cost(rank + 1);
  const canAdvance = !maxed && rp >= (nextCost ?? Infinity);
  const style = { "--cc-accent": TONE_500[klass.tone], "--cc-accent-fg": TONE_FG[klass.tone] } as React.CSSProperties;
  const sectionRef = React.useRef<HTMLElement>(null);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!sectionRef.current) return;
        const nextRung = sectionRef.current.querySelector(".sf-rung.is-next");
        if (!nextRung) return;
        const canvas = sectionRef.current.closest(".sf-canvas");
        if (!canvas) return;
        const rungTop = nextRung.getBoundingClientRect().top;
        const canvasTop = canvas.getBoundingClientRect().top;
        const target = canvas.scrollTop + rungTop - canvasTop - 80;
        canvas.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      });
    });
  };

  return (
    <section ref={sectionRef} className={"sf-cc" + (owned ? " is-owned" : "") + (expanded ? " is-open" : "")} style={style}>
      <header className="sf-cc__head" onClick={() => onToggle()}>
        <span className="sf-cc__glyph"><Icon name={klass.icon} /></span>
        <div className="sf-cc__id">
          <span className="sf-cc__name">{klass.name}</span>
          <span className="sf-cc__tag">{klass.description || klass.tagline}</span>
        </div>

        <div className="sf-cc__meter" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={"sf-tick" + (i < rank ? " on" : i === rank && !maxed ? " next" : "")} />
          ))}
        </div>

        <div className="sf-cc__cta">
          {maxed ? (
            <span className="sf-cc__cost is-maxed"><Icon name="crown" /> Mastered</span>
          ) : (
            <button className={"sf-cc__cost" + (canAdvance ? " can" : " cant")} title={canAdvance ? "Open to choose your next rank" : `Need ${nextCost} RP to advance`} onClick={handleCtaClick}>
              <Icon name={owned ? "chevron-down" : "sparkles"} />
              {owned ? `Next Rank: ${ROMAN[rank + 1]}` : "Enroll"}
            </button>
          )}
        </div>

        <div className="sf-cc__rank-row">
          <div className="sf-cc__rank">
            {owned ? (
              <React.Fragment>
                <button className="sf-cc__refund" title={`Refund Rank ${ROMAN[rank]} · +${cost(rank)} RP`} onClick={stop(onRefund)}><Icon name="minus" /></button>
                <span className="sf-cc__rankbox"><span className="sf-cc__ranklabel">Rank</span><span className="sf-cc__ranknum">{ROMAN[rank]}</span></span>
              </React.Fragment>
            ) : (
              <span className="sf-cc__unenrolled">Not enrolled</span>
            )}
          </div>
          <span className="sf-cc__chev"><Icon name="chevron-down" /></span>
        </div>
      </header>

      {expanded ? <Ladder klass={klass} rank={rank} choices={choices} rp={rp} cost={cost} onChoose={onChoose} onRankUp={onRankUp} /> : null}
    </section>
  );
}

/* ------------------------------- The wing ----------------------------- */
export interface ClassesPageProps {
  data: { classes: ClassDef[]; cost: (n: number) => number };
  state: ClassState;
  rp: number;
  density?: string;
  onGrantRp: (delta: number) => void;
  onChoose: (id: string, level: number, side: number) => void;
  onRankUp: (id: string, level: number, side: number) => void;
  onRefund: (id: string) => void;
}

export function ClassesPage({ data, state, rp, density, onGrantRp, onChoose, onRankUp, onRefund }: ClassesPageProps) {
  const classes = data.classes;
  const cost = data.cost;

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    classes.forEach((k) => {
      if ((state[k.id] && state[k.id].rank) > 0) s[k.id] = true;
    });
    return s;
  });
  const toggle = (id: string, force?: boolean) => setExpanded((m) => ({ ...m, [id]: force === true ? true : !m[id] }));

  const [ownedOnly, setOwnedOnly] = React.useState(true);

  const owned = classes.filter((k) => (state[k.id] && state[k.id].rank) > 0);
  const ownedCount = owned.length;
  const totalRanks = owned.reduce((n, k) => n + state[k.id].rank, 0);
  const shown = ownedOnly ? owned : classes;

  return (
    <div className={"sf-canvas sf-classes density-" + (density || "roomy")}>
      <RankPointsBar rp={rp} onGrant={onGrantRp} ownedCount={ownedCount} totalRanks={totalRanks} />

      <div className="sf-sec-head sf-sec-head--actions">
        <h2>Classes</h2>
        <hr className="sf-rule" />
        <span className="sf-sec-head__count">{ownedCount} of {classes.length} enrolled</span>
        <button type="button" className={"sf-ghost-btn" + (ownedOnly ? " is-on" : "")} aria-pressed={ownedOnly} onClick={() => setOwnedOnly((v) => !v)}>
          <Icon name={ownedOnly ? "filter" : "filter-x"} /> {ownedOnly ? "Enrolled only" : "All classes"}
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
              <Icon name="filter-x" /> Show all classes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
