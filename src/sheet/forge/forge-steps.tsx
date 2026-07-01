"use client";

/* ===========================================================================
   Starfall Academy — Admission steps (Forge)
   Ported from public/character-sheet/forge-steps.jsx. The heavy wizard steps:
   Classes, Allocation (the codex + astrolabes), Inventory, Spells.
   =========================================================================== */
import * as React from "react";
import { Badge, Button, Select } from "@/ds";
import { Icon } from "../components/Icon";
import { TONE_500, TONE_FG, levelTone } from "../data/shared";
import type { CompendiumEntry, MagicSchool, Stat } from "../types";
import type { ClassDef } from "../data/classes";
import * as F from "./forge-state";
import type { Draft, ForgeData } from "./forge-state";

const ROMAN = F.ROMAN;
type SetFn = (patch: Partial<Draft>) => void;
type MapKey = "stats" | "subjects" | "skills";

/* ----------------------------- shared atoms --------------------------- */
const FAC_COLOR: Record<string, string> = {
  focus: TONE_500.crimson, creativity: TONE_500.plum, logic: TONE_500.teal,
  insight: TONE_500.forest, body: TONE_500.silver, charm: TONE_500.gold,
};
const facColor = (f: Stat) => FAC_COLOR[f.id] || TONE_500[f.tone];

interface CodexGroup {
  kind: MapKey;
  id: string;
  label: string;
  icon: string;
  tone: string;
  school?: MagicSchool;
  fac?: Stat;
}
const groupColor = (g: CodexGroup) => (g.fac ? facColor(g.fac) : g.kind === "stats" ? TONE_500.gold : TONE_500[g.tone]);

const codexGroups = (D: ForgeData): CodexGroup[] => {
  const groups: CodexGroup[] = [{ kind: "stats", id: "g-stats", label: "Stats", icon: "hexagon", tone: "gold" }];
  D.magicSchools.forEach((sc) => groups.push({ kind: "subjects", id: "g-" + sc.id, label: sc.name, icon: sc.icon, tone: sc.tone, school: sc }));
  D.stats.forEach((f) => groups.push({ kind: "skills", id: "g-skill-" + f.id, label: f.name, icon: f.icon, tone: f.tone, fac: f }));
  return groups;
};

interface CodexItem {
  key: string;
  map: MapKey;
  name: string;
  sub: string | null;
  star: boolean;
}
const groupItems = (D: ForgeData, g: CodexGroup): CodexItem[] => {
  if (g.kind === "stats") return D.stats.map((f) => ({ key: f.id, map: "stats" as MapKey, name: f.name, sub: null, star: false }));
  if (g.kind === "subjects") return (g.school as MagicSchool).subjects.map((s) => ({ key: s.key, map: "subjects" as MapKey, name: s.name, sub: s.stat, star: true }));
  return (g.fac as Stat).skills.map((s) => ({ key: s.id, map: "skills" as MapKey, name: s.name, sub: null, star: false }));
};

interface AllocApi {
  limit: number;
  majorBonus: number;
  itemLimit: (map: MapKey, key: string) => number;
  val: (map: MapKey, key: string) => number;
  pool: (map: MapKey) => number | null;
  canInc: (map: MapKey, key: string) => boolean;
  inc: (map: MapKey, key: string) => void;
  dec: (map: MapKey, key: string) => void;
  isMajor: (key: string) => boolean;
  toggleMajor: (key: string) => void;
}

const groupSpent = (D: ForgeData, A: AllocApi, g: CodexGroup) => groupItems(D, g).reduce((s, it) => s + A.val(it.map, it.key), 0);
const facTrain = (D: ForgeData, A: AllocApi, f: Stat) => {
  let s = 0;
  D.magicSchools.forEach((sc) => sc.subjects.forEach((su) => { if (su.stat.toLowerCase() === f.id) s += A.val("subjects", su.key); }));
  f.skills.forEach((sk) => { s += A.val("skills", sk.id); });
  return s;
};
const majorSubjects = (D: ForgeData, A: AllocApi) => {
  const out: { key: string; name: string; rank: number; tone: string }[] = [];
  D.magicSchools.forEach((sc) => sc.subjects.forEach((s) => { if (A.isMajor(s.key)) out.push({ key: s.key, name: s.name, rank: A.val("subjects", s.key), tone: TONE_FG[sc.tone] }); }));
  return out;
};

const AllocStepper = ({ value, canDec, canInc, onDec, onInc }: { value: number; canDec: boolean; canInc: boolean; onDec: () => void; onInc: () => void }) => (
  <span className="opt-stepper">
    <button className="opt-step-btn" type="button" disabled={!canDec} onClick={onDec} aria-label="decrease">−</button>
    <span className="opt-stepper__num">{value}</span>
    <button className="opt-step-btn" type="button" disabled={!canInc} onClick={onInc} aria-label="increase">+</button>
  </span>
);
const Pips = ({ value, limit, base, accent }: { value: number; limit: number; base?: number; accent: string }) => {
  const b = base == null ? limit : base;
  return (
    <span className="opt-pips" style={{ "--p": accent } as React.CSSProperties}>
      {Array.from({ length: limit }).map((_, i) => <span key={i} className={"opt-pip" + (i < value ? " on" : "") + (i >= b ? " bonus" : "")} />)}
    </span>
  );
};
const StarBtn = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button type="button" className={"opt-star" + (on ? " on" : "")} onClick={onClick} title={on ? "Major field" : "Mark as a major field"}><Icon name="star" /></button>
);
const Donut = ({ value, limit, accent, icon }: { value: number; limit: number; accent: string; icon: string }) => {
  const r = 40, c = 2 * Math.PI * r, frac = Math.min(value, limit) / limit;
  return (
    <div className="atlas-ring">
      <svg viewBox="0 0 92 92">
        <circle className="atlas-ring__bg" cx="46" cy="46" r={r} strokeWidth="7" />
        <circle className="atlas-ring__fg" cx="46" cy="46" r={r} strokeWidth="7" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ stroke: accent }} />
      </svg>
      <div className="atlas-ring__c">
        <span className="atlas-ring__glyph" style={{ color: accent }}><Icon name={icon} /></span>
        <span className="atlas-ring__n">{value}</span>
      </div>
    </div>
  );
};

function StatRadar({ D, A, kind }: { D: ForgeData; A: AllocApi; kind: "stat" | "ability" }) {
  const facs = D.stats, n = facs.length, lim = A.limit;
  const ability = kind === "ability";
  const sums = facs.map((f) => (ability ? facTrain(D, A, f) : A.val("stats", f.id)));
  const total = sums.reduce((a, b) => a + b, 0);
  const maxV = ability ? Math.max(1, ...sums) : lim;
  const RINGS = ability ? 4 : lim;
  const W = 300, H = 300, cx = W / 2, cy = H * 0.46, Rmax = 86, labelR = 122;
  const ang = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
  const ringPath = (rr: number) => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = ang(i);
      d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1) + " ";
    }
    return d + "Z";
  };
  const valR = (v: number) => (Math.min(v, maxV) / maxV) * Rmax;
  const pts = facs.map((f, i) => {
    const a = ang(i), rr = valR(sums[i]);
    return { f, a, x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), vx: cx + Rmax * Math.cos(a), vy: cy + Rmax * Math.sin(a), v: sums[i] };
  });
  const polyStr = pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const top = pts.reduce((b, p) => (p.v > b.v ? p : b), pts[0]);
  return (
    <div className="ast2">
      <div className="ast2__chart" style={{ aspectRatio: W + " / " + H }}>
        <svg className="ast2__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {Array.from({ length: RINGS }).map((_, k) => (
            <path key={k} className={"astro-ring" + (!ability && k === RINGS - 1 ? " astro-ring--cap" : "")} d={ringPath(((k + 1) / RINGS) * Rmax)} style={{ opacity: !ability && k === RINGS - 1 ? 1 : 0.28 }} />
          ))}
          {pts.map((p) => <line key={"ax" + p.f.id} className="astro-axis" x1={cx} y1={cy} x2={p.vx} y2={p.vy} />)}
          {total > 0 ? <polygon className={"ast2__poly" + (ability ? " ast2__poly--ability" : "")} points={polyStr} /> : null}
          {pts.map((p) => <line key={"sp" + p.f.id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={facColor(p.f)} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "all .25s ease" }} />)}
          {pts.map((p) => <circle key={"dot" + p.f.id} cx={p.x} cy={p.y} r="4" fill={facColor(p.f)} stroke="var(--ink-950)" strokeWidth="1.5" style={{ transition: "all .25s ease" }} />)}
          <circle cx={cx} cy={cy} r="2.5" fill="var(--text-faint)" />
        </svg>
        {pts.map((p) => (
          <div key={"lb" + p.f.id} className="ast2__lbl" style={{ left: ((cx + labelR * Math.cos(p.a)) / W) * 100 + "%", top: ((cy + labelR * Math.sin(p.a)) / H) * 100 + "%", color: facColor(p.f) }}>
            <span className="ast2__lbl-n">{p.f.name}</span>
            <span className="ast2__lbl-v">{p.v}</span>
          </div>
        ))}
      </div>
      <div className="ast2__foot">
        <span className="ast2__total">{total}<small>{ability ? " ranks" : A.pool("stats") != null ? " /" + A.pool("stats") + " pts" : " pts"}</small></span>
        {total > 0 ? <span className="ast2__top">{ability ? "Leans " : "Strongest · "}<b style={{ color: facColor(top.f) }}>{top.f.name}</b></span> : <span className="ast2__top ast2__top--mut">{ability ? "Train to fill this" : "Spend points to shape it"}</span>}
      </div>
    </div>
  );
}

function CodexTab({ D, A, g, sel, onSel }: { D: ForgeData; A: AllocApi; g: CodexGroup; sel: string; onSel: (id: string) => void }) {
  const spent = groupSpent(D, A, g);
  return (
    <button type="button" className={"codex-tab" + (sel === g.id ? " is-active" : "")} style={{ "--ct": groupColor(g) } as React.CSSProperties} onClick={() => onSel(g.id)}>
      <span className="codex-tab__glyph"><Icon name={g.icon} /></span>
      <span className="codex-tab__name">{g.label}</span>
      <span className="codex-tab__meta">{spent || "·"}</span>
    </button>
  );
}

/* ================================ CLASSES ============================== */
export function AdmissionClasses({ D, classData, draft, set }: { D: ForgeData; classData: { classes: ClassDef[] }; draft: Draft; set: SetFn }) {
  const classes = classData.classes;
  const owned = F.ownedClasses(draft);
  const mode = draft.classMode;
  const defaultRank = mode === "single" ? 4 : 2;
  const maxClasses = mode === "single" ? 1 : 2;
  const b = F.budgets(draft, D);
  const custom = draft.buildType === "custom";

  const switchMode = (m: "single" | "double") => { if (m !== mode) set({ classMode: m, classes: {} }); };

  const pickClass = (id: string) => {
    const cur = draft.classes[id];
    if (cur && cur.rank > 0) { const nc = { ...draft.classes }; delete nc[id]; set({ classes: nc }); return; }
    if (owned.length >= maxClasses) return;
    const choices: Record<string, number> = {};
    for (let L = 1; L <= defaultRank; L++) choices[L] = 0;
    set({ classes: { ...draft.classes, [id]: { rank: defaultRank, choices } } });
  };
  const setChoice = (id: string, L: number, side: number) => set({ classes: { ...draft.classes, [id]: { ...draft.classes[id], choices: { ...draft.classes[id].choices, [L]: side } } } });
  const setRank = (id: string, rank: number) => {
    const cur = draft.classes[id];
    if (!cur) return;
    rank = Math.max(defaultRank, Math.min(10, rank));
    const choices = { ...cur.choices };
    for (let L = cur.rank + 1; L <= rank; L++) if (choices[L] == null) choices[L] = 0;
    Object.keys(choices).forEach((L) => { if (+L > rank) delete choices[L]; });
    set({ classes: { ...draft.classes, [id]: { rank, choices } } });
  };
  const remaining = b.mode === "custom" ? b.remaining : 0;
  const canRaise = (id: string) => custom && draft.classes[id].rank < 10 && remaining >= 2;

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Choose Your Class</h3>
        <p className="sf-fhint">Your class defines your abilities and how you engage with the world of Starfall. You can pick 1 class at rank 4 or two classes at rank 2. For each rank you take, choose between the two rank options. {custom ? "Custom build may rank a class higher (2 pts / level)." : "Switch to a Custom build to rank higher at creation."}</p>
      </div>

      <div className="sf-seg" role="tablist">
        {([["single", "One class · rank IV"], ["double", "Two classes · rank II"]] as const).map(([m, l]) => (
          <button key={m} role="tab" aria-selected={mode === m} className={"sf-seg__opt" + (mode === m ? " is-active" : "")} onClick={() => switchMode(m)} type="button">{l}</button>
        ))}
      </div>

      <div className="sf-fclass-grid">
        {classes.map((k) => {
          const cur = draft.classes[k.id];
          const isOwned = cur && cur.rank > 0;
          const dim = !isOwned && owned.length >= maxClasses;
          const style = { "--cc-accent": TONE_500[k.tone], "--cc-accent-fg": TONE_FG[k.tone] } as React.CSSProperties;
          return (
            <button key={k.id} type="button" style={style} disabled={dim} onClick={() => pickClass(k.id)} className={"sf-fclass" + (isOwned ? " is-owned" : "") + (dim ? " is-dim" : "")}>
              <span className="sf-fclass__glyph"><Icon name={k.icon} /></span>
              <span className="sf-fclass__id">
                <span className="sf-fclass__name">{k.name}</span>
                <span className="sf-fclass__tag">{k.description || k.tagline}</span>
              </span>
              {isOwned ? <span className="sf-fclass__rank">{ROMAN[cur.rank]}</span> : <span className="sf-fclass__pick"><Icon name="plus" /></span>}
            </button>
          );
        })}
      </div>

      {owned.map((id) => {
        const k = classes.find((x) => x.id === id);
        if (!k) return null;
        const cur = draft.classes[id];
        const style = { "--cc-accent": TONE_500[k.tone], "--cc-accent-fg": TONE_FG[k.tone] } as React.CSSProperties;
        return (
          <div key={id} className="sf-fladder" style={style}>
            <div className="sf-fladder__head">
              <span className="sf-fclass__glyph"><Icon name={k.icon} /></span>
              <span className="sf-fladder__name">{k.name}</span>
              <span className="sf-fladder__rankcap">Rank {ROMAN[cur.rank]}</span>
              {custom ? (
                <span className="sf-fladder__rankctl">
                  <button className="sf-step" disabled={cur.rank <= defaultRank} onClick={() => setRank(id, cur.rank - 1)} type="button">−</button>
                  <button className="sf-step" disabled={!canRaise(id)} onClick={() => setRank(id, cur.rank + 1)} type="button" title="Rank up · 2 pts">+</button>
                </span>
              ) : null}
            </div>
            <div className="sf-fladder__rungs">
              {Array.from({ length: cur.rank }).map((_, i) => {
                const L = i + 1, rung = k.ranks[i];
                return (
                  <div key={L} className="sf-frung">
                    <span className="sf-frung__num">{ROMAN[L]}</span>
                    <div className="sf-frung__opts">
                      {rung.options.map((opt, s) => (
                        <button key={s} type="button" onClick={() => setChoice(id, L, s)} className={"sf-fopt" + (cur.choices[L] === s ? " is-chosen" : "")}>
                          <span className="sf-fopt__title">{opt.title}</span>
                          <span className="sf-fopt__desc">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================== ALLOCATION ============================= */
export function AdmissionAllocation({ D, draft, set }: { D: ForgeData; draft: Draft; set: SetFn }) {
  const b = F.budgets(draft, D);
  const limit = b.limit;
  const custom = b.mode === "custom";
  const [sel, setSel] = React.useState("g-stats");

  const poolMap: Record<MapKey, "stat" | "subject" | "skill"> = { stats: "stat", subjects: "subject", skills: "skill" };
  const costPer = (map: MapKey) => (map === "stats" ? D.creation.custom.statCost : D.creation.custom.abilityCost);
  const dval = (map: MapKey, key: string) => draft[map][key] || 0;

  const A: AllocApi = {
    limit,
    majorBonus: F.majorBonus(draft),
    itemLimit: (map, key) => F.rankCap(draft, D, map, key),
    val: dval,
    pool: (map) => {
      if (draft.mode === "edit" || b.mode !== "quick") return null;
      return b[poolMap[map]].pool;
    },
    canInc: (map, key) => {
      if (draft.mode === "edit") return true;
      const cur = dval(map, key);
      if (cur >= F.rankCap(draft, D, map, key)) return false;
      if (b.mode === "custom") return b.remaining >= costPer(map);
      const p = b[poolMap[map]];
      return p.spent < p.pool;
    },
    inc: (map, key) => set({ [map]: { ...draft[map], [key]: dval(map, key) + 1 } } as Partial<Draft>),
    dec: (map, key) => {
      const cur = dval(map, key);
      if (cur > 0) set({ [map]: { ...draft[map], [key]: cur - 1 } } as Partial<Draft>);
    },
    isMajor: (key) => draft.major.includes(key),
    toggleMajor: (key) => {
      const has = draft.major.includes(key);
      let next: string[];
      if (has) next = draft.major.filter((k) => k !== key);
      else if (draft.major.length < 2) next = [...draft.major, key];
      else return;
      const nb = next.length === 1 ? 3 : next.length === 2 ? 1 : 0;
      const cap = (k: string) => (next.includes(k) ? limit + nb : limit);
      const ns: Record<string, number> = {};
      Object.keys(draft.subjects).forEach((k) => { ns[k] = Math.min(draft.subjects[k] || 0, cap(k)); });
      set({ major: next, subjects: ns });
    },
  };

  const groups = codexGroups(D);
  const cur = groups.find((g) => g.id === sel) || groups[0];
  const tone = groupColor(cur);

  const KINDS: { id: MapKey; label: string }[] = [
    { id: "stats", label: "Stats" },
    { id: "subjects", label: "Subjects" },
    { id: "skills", label: "Skills" },
  ];
  const [kindSel, setKindSel] = React.useState<MapKey>(() => cur.kind || "stats");
  const switchKind = (k: MapKey) => {
    setKindSel(k);
    const first = groups.find((g) => g.kind === k);
    if (first) setSel(first.id);
  };
  React.useEffect(() => {
    if (cur.kind !== kindSel) setKindSel(cur.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  return (
    <div className="sf-fstep-body sf-alloc">
      <div className="sf-fhead">
        <h3>Stats &amp; Abilities</h3>
        <p className="sf-fhint">Put your points into base Stats that empower different Abilities, and then rank in individual Abilities: your magic Subjects and your practical Skills. Choose one major Subject to take a +3 cap, or two major Subjects to take a +1 cap.</p>
      </div>

      <div className="codex">
        <nav className="codex__index codex__index--desktop">
          <div className="codex__group-label">Stats</div>
          {groups.filter((g) => g.kind === "stats").map((g) => <CodexTab key={g.id} D={D} A={A} g={g} sel={sel} onSel={setSel} />)}
          <div className="codex__group-label">Subjects · the four schools</div>
          {groups.filter((g) => g.kind === "subjects").map((g) => <CodexTab key={g.id} D={D} A={A} g={g} sel={sel} onSel={setSel} />)}
          <div className="codex__group-label">Skills · by stat</div>
          {groups.filter((g) => g.kind === "skills").map((g) => <CodexTab key={g.id} D={D} A={A} g={g} sel={sel} onSel={setSel} />)}
        </nav>

        <nav className="codex__index codex__index--mobile">
          <div className="codex-kind-row">
            {KINDS.map(({ id, label }) => (
              <button key={id} type="button" className={"codex-kind-btn" + (kindSel === id ? " is-active" : "")} onClick={() => switchKind(id)}>{label}</button>
            ))}
          </div>
          <div className="codex-sub-row">
            {groups.filter((g) => g.kind === kindSel).length > 1 && groups.filter((g) => g.kind === kindSel).map((g) => <CodexTab key={g.id} D={D} A={A} g={g} sel={sel} onSel={setSel} />)}
          </div>
        </nav>

        <div className="codex__panel">
          <div className="codex__panel-head" style={{ "--cp": tone } as React.CSSProperties}>
            <span className="codex__panel-glyph"><Icon name={cur.icon} /></span>
            <div className="codex__panel-tt">
              <h3>{cur.label}</h3>
              <span>{cur.kind === "stats" ? "Six stats — the base of every roll" : cur.kind === "subjects" ? (cur.school as MagicSchool).blurb : "Four skills under " + (cur.fac as Stat).name}</span>
            </div>
            <div className="codex__panel-prog"><b>{groupSpent(D, A, cur)}</b><small>points here</small></div>
          </div>

          {cur.kind === "stats" ? (
            <div className="atlas-statgrid">
              {D.stats.map((f) => {
                const v = A.val("stats", f.id), ft = facColor(f);
                return (
                  <div key={f.id} className="atlas-statcard" style={{ "--ac": ft } as React.CSSProperties}>
                    <Donut value={v} limit={A.limit} accent={ft} icon={f.icon} />
                    <span className="atlas-statcard__name">{f.name}</span>
                    <AllocStepper value={v} canDec={v > 0} canInc={A.canInc("stats", f.id)} onDec={() => A.dec("stats", f.id)} onInc={() => A.inc("stats", f.id)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="codex__list">
              {groupItems(D, cur).map((it) => {
                const v = A.val(it.map, it.key);
                return (
                  <div key={it.key} className={"codex-row" + (v > 0 ? " is-set" : "")} style={{ "--cp": tone } as React.CSSProperties}>
                    <Pips value={v} limit={A.itemLimit(it.map, it.key)} base={A.limit} accent={tone} />
                    <div className="codex-row__lbl">
                      <div className="codex-row__nm">
                        <span className="codex-row__name">{it.name}</span>
                        {it.sub ? <span className="codex-row__sub">{it.sub}</span> : null}
                        {it.map === "subjects" && A.isMajor(it.key) && A.majorBonus > 0 ? <span className="codex-row__cap">cap +{A.majorBonus}</span> : null}
                      </div>
                    </div>
                    <div className="codex-row__right">
                      {it.star ? <StarBtn on={A.isMajor(it.key)} onClick={() => A.toggleMajor(it.key)} /> : null}
                      <AllocStepper value={v} canDec={v > 0} canInc={A.canInc(it.map, it.key)} onDec={() => A.dec(it.map, it.key)} onInc={() => A.inc(it.map, it.key)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="refined__ref">
        <div className="refined__ref-head"><Icon name="hexagon" /> <span>Overview</span><em>a running reference as you build — your strengths at a glance</em></div>
        <div className="refined__ref-grid">
          <figure className="refined__chart">
            <figcaption className="refined__chart-cap">Stat profile<span>rank allocated to each stat</span></figcaption>
            <StatRadar D={D} A={A} kind="stat" />
          </figure>
          <figure className="refined__chart">
            <figcaption className="refined__chart-cap">Training focus<span>where your ability ranks point</span></figcaption>
            <StatRadar D={D} A={A} kind="ability" />
          </figure>
          <div className="refined__side">
            <div className="refined__majors">
              <div className="refined__side-label">Main subject{majorSubjects(D, A).length === 1 ? "" : "s"}</div>
              {majorSubjects(D, A).length ? (
                <div className="refined__major-list">
                  {majorSubjects(D, A).map((m) => (
                    <span key={m.key} className="refined__major" style={{ "--mc": m.tone } as React.CSSProperties}>
                      <Icon name="star" /><span className="refined__major-nm">{m.name}</span><span className="refined__major-rk">{m.rank}</span>
                    </span>
                  ))}
                  <span className="refined__major-note">+{A.majorBonus} rank cap {A.majorBonus === 3 ? "(single major)" : "(two majors)"}</span>
                </div>
              ) : (
                <p className="refined__major-empty">Star one or two subjects as your major — a single major may rank +3 over the cap, or two may each rank +1.</p>
              )}
            </div>
            <div className="refined__key">
              <div className="refined__key-head"><span>Stat</span><span>Stat</span><span>Train</span></div>
              {D.stats.map((f) => (
                <div key={f.id} className="refined__key-row">
                  <span className="refined__key-fac"><span className="refined__key-dot" style={{ background: facColor(f) }} />{f.name}</span>
                  <span className="refined__key-n">{A.val("stats", f.id)}</span>
                  <span className="refined__key-n">{facTrain(D, A, f)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================== INVENTORY ============================= */
function PickList({ D, cat, selected, onToggle, can, costOf, emptyHint }: {
  D: ForgeData;
  cat: string;
  selected: string[];
  onToggle: (id: string) => void;
  can: (e: CompendiumEntry) => boolean;
  costOf?: (e: CompendiumEntry) => React.ReactNode;
  emptyHint: string;
}) {
  const items = D.compendium.filter((e) => e.cat === cat);
  return (
    <div className="sf-pick">
      {items.length === 0 ? <p className="sf-fhint">{emptyHint}</p> : items.map((e) => {
        const on = selected.includes(e.id);
        const blocked = !on && !can(e);
        return (
          <button key={e.id} type="button" disabled={blocked} onClick={() => onToggle(e.id)} className={"sf-pick__item" + (on ? " is-on" : "") + (blocked ? " is-blocked" : "")}>
            <span className="sf-pick__check"><Icon name={on ? "check" : "plus"} /></span>
            <span className="sf-pick__body">
              <span className="sf-pick__name">{e.name}{costOf ? <span className="sf-pick__cost">{costOf(e)}</span> : null}</span>
              <span className="sf-pick__desc">{e.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AdmissionInventory({ D, draft, set }: { D: ForgeData; draft: Draft; set: SetFn }) {
  const y = F.yields(draft, D);
  const b = F.budgets(draft, D);
  const custom = b.mode === "custom";
  const remaining = b.mode === "custom" ? b.remaining : 0;
  const compMat = (id: string) => { const e = D.compendium.find((x) => x.id === id); return (e && e.mat) || 0; };
  const compVal = (id: string) => { const e = D.compendium.find((x) => x.id === id); return (e && e.value) || 0; };

  const toggleIn = (key: "potions" | "plants" | "glyphs" | "craftWands" | "extraWands" | "artifacts", id: string, capCheck: () => boolean) => {
    const arr = draft[key];
    if (arr.includes(id)) set({ [key]: arr.filter((x) => x !== id) } as Partial<Draft>);
    else if (capCheck()) set({ [key]: [...arr, id] } as Partial<Draft>);
  };
  const craftSpent = draft.craftWands.reduce((s, id) => s + compMat(id), 0);
  const plantSpent = (draft.plants || []).reduce((s, id) => s + compVal(id), 0);

  const SubHead = ({ icon, title, note }: { icon: string; title: string; note: string }) => (
    <div className="sf-isub"><span className="sf-isub__glyph"><Icon name={icon} /></span><span className="sf-isub__t">{title}</span><span className="sf-isub__n">{note}</span></div>
  );

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Arsenal</h3>
        <p className="sf-fhint">Take {D.creation.startingMaterials} Materials as your starting balance. Depending on your Ability spread, you may be able to take extra potions, plants, glyphs, or wands.</p>
      </div>

      <SubHead icon="flask-conical" title="Potions" note={`Alchemy grants ${y.potions} · ${draft.potions.length} chosen`} />
      {y.potions === 0 ? (
        <p className="sf-fhint sf-fhint--mut">Put points into <b>Alchemy</b> to start with potions (you&apos;ll know each recipe).</p>
      ) : (
        <PickList D={D} cat="potion" selected={draft.potions} onToggle={(id) => toggleIn("potions", id, () => draft.potions.length < y.potions)} can={() => draft.potions.length < y.potions} costOf={(e) => e.level} emptyHint="No potions in the archive yet." />
      )}

      <SubHead icon="leaf" title="Plants" note={`Herbalism grants ${y.plantMat} mats · ${plantSpent} mats chosen`} />
      {y.plantMat === 0 ? (
        <p className="sf-fhint sf-fhint--mut">Put points into <b>Herbalism</b> to start with plants (50 mats of plant per rank).</p>
      ) : (
        <PickList D={D} cat="plant" selected={draft.plants || []} onToggle={(id) => toggleIn("plants", id, () => !(draft.plants || []).includes(id) && plantSpent + compVal(id) <= y.plantMat)} can={(e) => (draft.plants || []).includes(e.id) || plantSpent + (e.value || 0) <= y.plantMat} costOf={(e) => (e.value || 0) + " mats"} emptyHint="No plants in the archive yet." />
      )}

      <SubHead icon="pen-tool" title="Glyphs" note={`Runology grants ${y.glyphs} · ${draft.glyphs.length} chosen`} />
      {y.glyphs === 0 ? (
        <p className="sf-fhint sf-fhint--mut">Put points into <b>Runology</b> to learn glyphs (two per rank).</p>
      ) : (
        <PickList D={D} cat="glyph" selected={draft.glyphs} onToggle={(id) => toggleIn("glyphs", id, () => draft.glyphs.length < y.glyphs)} can={() => draft.glyphs.length < y.glyphs} costOf={(e) => e.meta && e.meta[1]} emptyHint="No glyphs in the archive yet." />
      )}

      <SubHead icon="wand-2" title="Wands" note={`Wandcrafting grants ${y.craftMat} mats · ${craftSpent} mats chosen`} />
      {y.craftMat === 0 ? (
        <p className="sf-fhint sf-fhint--mut">Put points into <b>Wandcrafting</b> to take more wands (200 mats of wand per rank).</p>
      ) : (
        <PickList D={D} cat="wand" selected={draft.craftWands} onToggle={(id) => toggleIn("craftWands", id, () => craftSpent + compMat(id) <= y.craftMat)} can={(e) => craftSpent + (e.mat || 0) <= y.craftMat} costOf={(e) => (e.mat || 0) + " mat"} emptyHint="No wands in the archive yet." />
      )}

      {custom ? (
        <React.Fragment>
          <div className="sf-idiv"><span>Custom-build purchases</span><span className="sf-idiv__pts">{remaining} pts left</span></div>

          <SubHead icon="wand-sparkles" title="Buy wands" note="1 pt / 400 mat" />
          <PickList D={D} cat="wand" selected={draft.extraWands} onToggle={(id) => toggleIn("extraWands", id, () => remaining >= Math.ceil(compMat(id) / D.creation.custom.wandPer))} can={(e) => remaining >= Math.ceil((e.mat || 0) / D.creation.custom.wandPer)} costOf={(e) => Math.ceil((e.mat || 0) / D.creation.custom.wandPer) + " pt"} emptyHint="No wands in the archive yet." />

          <SubHead icon="gem" title="Buy artifacts" note="1 pt / 400 mat · auto-attuned" />
          <PickList D={D} cat="artifact" selected={draft.artifacts} onToggle={(id) => toggleIn("artifacts", id, () => remaining >= Math.ceil(compMat(id) / D.creation.custom.artifactPer))} can={(e) => remaining >= Math.ceil((e.mat || 0) / D.creation.custom.artifactPer)} costOf={(e) => Math.ceil((e.mat || 0) / D.creation.custom.artifactPer) + " pt"} emptyHint="No artifacts in the archive yet." />
        </React.Fragment>
      ) : null}
    </div>
  );
}

/* ================================ SPELLS ============================== */
const FORGE_SPELL_SORT: Array<[string, string, string]> = [
  ["name", "Name", "text"],
  ["subject", "Subject", "text"],
  ["stat", "Stat", "text"],
  ["level", "Level", "level"],
  ["dc", "DC", "num"],
];
const FORGE_SPELL_LEVEL_ORDER: Record<string, number> = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4 };
const forgeSpellRank = (v: unknown) => {
  if (!v) return 99;
  const f = String(v).trim().toLowerCase().split(/\s+/)[0];
  return FORGE_SPELL_LEVEL_ORDER[f] != null ? FORGE_SPELL_LEVEL_ORDER[f] : 50;
};
const sfield = (e: CompendiumEntry, k: string) => (e as unknown as Record<string, unknown>)[k];

/** Compendium-style fact rows for a spell — the readable at-a-glance stats. */
const spellFacts = (e: CompendiumEntry): Array<[string, string | number]> => {
  const f: Array<[string, string | number]> = [];
  if (e.subject) f.push(["Field", e.subject]);
  if (e.stat) f.push(["Base", e.stat]);
  if (e.ap != null) f.push(["AP", e.ap]);
  if (e.dc != null) f.push(["DC", e.dc]);
  if (e.ritual) f.push(["Ritual", "Yes"]);
  return f;
};

export function AdmissionSpells({ D, draft, set }: { D: ForgeData; draft: Draft; set: SetFn }) {
  const quota = F.yearById(D, draft.yearId).spells as Record<string, number>;
  const tally = F.spellTally(draft, D);
  const allSpells = D.compendium.filter((e) => e.cat === "spell");

  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ field: string; dir: "asc" | "desc" }>({ field: "level", dir: "asc" });
  const [filters, setFilters] = React.useState({ subject: "any", stat: "any", level: "any", ritual: "any" });
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});
  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);
  const toggleOpen = (id: string) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));

  React.useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const fn = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [sortOpen, filterOpen]);

  const uniq = (arr: (string | undefined)[]) => [...new Set(arr.filter((v): v is string => v != null && v !== ""))].sort();
  const subjectOpts = uniq(allSpells.map((s) => s.subject));
  const statOpts = uniq(allSpells.map((s) => s.stat));

  const setF = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters({ subject: "any", stat: "any", level: "any", ritual: "any" });
  const facetCount = [filters.subject !== "any", filters.stat !== "any", filters.level !== "any", filters.ritual !== "any"].filter(Boolean).length;

  let visible = allSpells.filter((sp) => {
    if (filters.subject !== "any" && sp.subject !== filters.subject) return false;
    if (filters.stat !== "any" && sp.stat !== filters.stat) return false;
    if (filters.level !== "any" && sp.level !== filters.level) return false;
    if (filters.ritual !== "any") {
      const want = filters.ritual === "yes";
      if (!!sp.ritual !== want) return false;
    }
    if (q) {
      const hay = (sp.name + " " + sp.subject + " " + sp.stat + " " + (sp.desc || "")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const sign = sort.dir === "asc" ? 1 : -1;
  const sortType = (FORGE_SPELL_SORT.find((f) => f[0] === sort.field) || [])[2] || "text";
  visible = visible.slice().sort((a, b) => {
    let r: number;
    if (sortType === "num") {
      const av = parseFloat(String(sfield(a, sort.field)));
      const bv = parseFloat(String(sfield(b, sort.field)));
      const am = isNaN(av) || sfield(a, sort.field) == null;
      const bm = isNaN(bv) || sfield(b, sort.field) == null;
      if (am || bm) r = am && bm ? 0 : am ? 1 : -1;
      else r = av - bv;
    } else if (sortType === "level") {
      r = forgeSpellRank(sfield(a, sort.field)) - forgeSpellRank(sfield(b, sort.field));
    } else {
      r = String(sfield(a, sort.field) || "").toLowerCase().localeCompare(String(sfield(b, sort.field) || "").toLowerCase());
    }
    if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    return r * sign;
  });

  const pickSort = (field: string) => setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" }));
  const sortLabel = (FORGE_SPELL_SORT.find((f) => f[0] === sort.field) || FORGE_SPELL_SORT[0])[1];

  // Quick reference of what's been taken so far — level-ordered, removable.
  const chosen = draft.spells
    .map((id) => allSpells.find((s) => s.id === id))
    .filter((e): e is CompendiumEntry => !!e)
    .sort((a, b) => forgeSpellRank(a.level) - forgeSpellRank(b.level) || a.name.localeCompare(b.name));

  const toggle = (e: CompendiumEntry) => {
    const on = draft.spells.includes(e.id);
    if (on) {
      set({ spells: draft.spells.filter((x) => x !== e.id) });
      return;
    }
    if ((tally[e.level] || 0) >= (quota[e.level] || 0)) return;
    set({ spells: [...draft.spells, e.id] });
  };

  const levels = ["Basic", "Standard", "Advanced"];

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Spell Loadout</h3>
        <p className="sf-fhint">Choose your starting spells. Basic spells are easily cast in any field, but for higher level spells, keep in mind which fields you have ranks in.</p>
      </div>

      <div className="sf-squota">
        {levels.map((L) => (
          <div key={L} className={"sf-squota__cell" + ((tally[L] || 0) >= (quota[L] || 0) ? " is-full" : "")}>
            <span className="sf-squota__n">{tally[L] || 0}<small>/{quota[L] || 0}</small></span>
            <span className="sf-squota__l">{L}</span>
          </div>
        ))}
      </div>

      {chosen.length > 0 ? (
        <div className="sf-staken">
          <div className="sf-staken__head">
            <Icon name="sparkles" />
            <span className="sf-staken__t">Your loadout</span>
            <span className="sf-staken__n">{chosen.length} spell{chosen.length === 1 ? "" : "s"}</span>
          </div>
          <div className="sf-staken__chips">
            {chosen.map((e) => {
              const lt = levelTone(e.level);
              return (
                <button
                  key={e.id}
                  type="button"
                  className="sf-staken__chip"
                  style={{ "--ent-accent": lt ? TONE_500[lt] : "var(--ink-500)" } as React.CSSProperties}
                  onClick={() => toggle(e)}
                  title={"Remove " + e.name}
                  aria-label={"Remove " + e.name + " from your loadout"}
                >
                  <span className="sf-staken__dot" />
                  <span className="sf-staken__nm">{e.name}</span>
                  <Icon name="x" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="sf-comp-toolbar sf-spell-toolbar">
        <span className="sf-comp-count">{visible.length === allSpells.length ? allSpells.length + " spells" : visible.length + " of " + allSpells.length}</span>

        <div className="sf-spell-search">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spells…" />
          {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" /></button> : null}
        </div>

        <div className="sf-comp-controls">
          <div className="sf-pop" ref={filterRef}>
            <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filter spells">
              <Icon name="sliders-horizontal" /><span>Filter</span>{facetCount ? <span className="sf-tool-dot" /> : null}
            </button>
            <div className={"sf-menu sf-filter-menu" + (filterOpen ? " show" : "")} role="dialog" aria-label="Filter options">
              <div className="sf-menu__head">Refine spells</div>
              <div className="sf-filter-group">
                <label>Subject</label>
                <Select options={[{ value: "any", label: "Any" }].concat(subjectOpts.map((s) => ({ value: s, label: s })))} value={filters.subject} onChange={(e) => setF("subject", e.target.value)} />
              </div>
              <div className="sf-filter-group">
                <label>Stat</label>
                <Select options={[{ value: "any", label: "Any" }].concat(statOpts.map((s) => ({ value: s, label: s })))} value={filters.stat} onChange={(e) => setF("stat", e.target.value)} />
              </div>
              <div className="sf-filter-group">
                <label>Level</label>
                <Select options={[{ value: "any", label: "Any" }, ...["Basic", "Standard", "Advanced", "Legendary", "Hex"].map((l) => ({ value: l, label: l }))]} value={filters.level} onChange={(e) => setF("level", e.target.value)} />
              </div>
              <div className="sf-filter-group">
                <label>Ritual</label>
                <Select options={[{ value: "any", label: "Any" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={filters.ritual} onChange={(e) => setF("ritual", e.target.value)} />
              </div>
              {facetCount > 0 && <button className="sf-filter-reset" onClick={resetFilters}>Reset filters</button>}
            </div>
          </div>

          <div className="sf-pop" ref={sortRef}>
            <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort spells">
              <Icon name="arrow-up-down" /><span>{sortLabel}</span>
            </button>
            <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
              <div className="sf-menu__head">Order by</div>
              {FORGE_SPELL_SORT.map(([key, label]) => (
                <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => { pickSort(key); setSortOpen(false); }}>
                  <span>{label}</span>
                  {sort.field === key && <Icon name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="sf-comp-empty">
          <Icon name="search-x" />
          <p>No spells match — try adjusting your search or filters.</p>
          {facetCount || q ? <button className="sf-filter-reset" onClick={() => { resetFilters(); setQ(""); }}>Clear filters</button> : null}
        </div>
      ) : (
        <div className="sf-spell-list">
          {visible.map((e) => {
            const on = draft.spells.includes(e.id);
            const full = !on && (tally[e.level] || 0) >= (quota[e.level] || 0);
            const isOpen = !!openIds[e.id];
            const lt = levelTone(e.level);
            const facts = spellFacts(e);
            return (
              <div
                key={e.id}
                className={"sf-entry" + (isOpen ? " is-open" : "") + (on ? " is-picked" : "") + (full ? " is-blocked" : "") + (lt ? "" : " is-neutral")}
                style={{ "--ent-accent": lt ? TONE_500[lt] : "var(--ink-500)" } as React.CSSProperties}
              >
                <div className="sf-entry__head" onClick={() => toggleOpen(e.id)}>
                  <div className="sf-entry__headline">
                    <span className="sf-entry__name">{e.name}</span>
                    <div className="sf-entry__meta">
                      <Badge tone={lt && lt !== "silver" ? lt : "neutral"} dot>{e.level}</Badge>
                      {(e.meta || []).length ? <span className="sf-entry__metatxt">{(e.meta || []).join(" · ")}</span> : null}
                    </div>
                  </div>
                  <div className="sf-entry__actions">
                    <button
                      className={"sf-entry__add" + (on ? " is-picked" : "")}
                      disabled={full}
                      onClick={(ev) => { ev.stopPropagation(); toggle(e); }}
                      title={on ? "Remove from loadout" : full ? "You've taken every " + e.level + " spell for your year" : "Add to loadout"}
                      aria-label={on ? "Remove " + e.name + " from loadout" : "Add " + e.name + " to loadout"}
                    >
                      <Icon name={on ? "check" : "plus"} />
                    </button>
                    <span className="sf-entry__chev"><Icon name="chevron-down" /></span>
                  </div>
                </div>
                <div className="sf-entry__body" hidden={!isOpen}>
                  <div className="sf-entry__rule" />
                  {facts.length ? (
                    <div className="sf-entry__facts">
                      {facts.map(([k, v]) => <div key={k} className="sf-fact"><span className="sf-fact__k">{k}</span><span className="sf-fact__v">{v}</span></div>)}
                    </div>
                  ) : null}
                  <p className="sf-entry__desc">{e.desc}</p>
                  {e.higherLevel ? (
                    <div className="sf-entry__ability">
                      <span className="sf-entry__ability-lbl"><Icon name="trending-up" /> Higher-level behavior</span>
                      <p className="sf-entry__ability-text">{e.higherLevel}</p>
                    </div>
                  ) : null}
                  <div className="sf-entry__foot">
                    <span className="sf-entry__cost" />
                    <Button variant={on ? "secondary" : "primary"} size="sm" iconLeft={<Icon name={on ? "check" : "plus"} />} disabled={full} onClick={() => toggle(e)}>
                      {on ? "Remove from loadout" : full ? "Year is full" : "Add to loadout"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
