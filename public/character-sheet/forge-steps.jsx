/* ===========================================================================
   Starfall Academy — The Admission: heavy step components
   AdmissionClasses · AdmissionAllocation · AdmissionInventory · AdmissionSpells, plus a few
   shared controls. All read SF_ADMISSION for the cost engine. Exported to window
   for admission.jsx to compose. (Babel scopes per-file, so we export explicitly.)
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, Badge, Input, Select } = SA;
  const Ic = window.SF_Ic;
  const F = window.SF_ADMISSION;
  const TONE_500 = window.SF_SHARED.TONE_500;
  const TONE_FG  = window.SF_SHARED.TONE_FG;
  const ROMAN = F.ROMAN;

  /* ----------------------------- shared controls ------------------------ */
  const Stepper = ({ value, min, max, onDec, onInc }) => (
    <div className="sf-fstep">
      <button className="sf-step" disabled={value <= (min || 0)} onClick={onDec} type="button">−</button>
      <span className="sf-fstep__num">{value}</span>
      <button className="sf-step" disabled={max != null && value >= max} onClick={onInc} type="button">+</button>
    </div>
  );

  /* --- Refined allocation: shared atoms + charts (module-level so they are
     never re-created mid-render — that was the old scroll-to-top culprit) --- */
  const FAC_COLOR = {
    focus: TONE_500.crimson, creativity: TONE_500.plum, logic: TONE_500.teal,
    insight: TONE_500.forest, body: TONE_500.silver, charm: TONE_500.gold,
  };
  const facColor = (f) => FAC_COLOR[f.id] || TONE_500[f.tone];
  const groupColor = (g) => (g && g.fac ? facColor(g.fac) : g && g.kind === "stats" ? TONE_500.gold : TONE_500[g.tone]);

  const codexGroups = (D) => {
    const groups = [{ kind: "stats", id: "g-stats", label: "Stats", icon: "hexagon", tone: "gold" }];
    D.magicSchools.forEach((sc) => groups.push({ kind: "subjects", id: "g-" + sc.id, label: sc.name, icon: sc.icon, tone: sc.tone, school: sc }));
    D.stats.forEach((f) => groups.push({ kind: "skills", id: "g-skill-" + f.id, label: f.name, icon: f.icon, tone: f.tone, fac: f }));
    return groups;
  };
  const groupItems = (D, g) => {
    if (g.kind === "stats") return D.stats.map((f) => ({ key: f.id, map: "stats", name: f.name, sub: null, star: false }));
    if (g.kind === "subjects") return g.school.subjects.map((s) => ({ key: s.key, map: "subjects", name: s.name, sub: s.stat, star: true }));
    return g.fac.skills.map((s) => ({ key: s.id, map: "skills", name: s.name, sub: null, star: false }));
  };
  const groupSpent = (D, A, g) => groupItems(D, g).reduce((s, it) => s + A.val(it.map, it.key), 0);
  const facTrain = (D, A, f) => {
    let s = 0;
    D.magicSchools.forEach((sc) => sc.subjects.forEach((su) => { if (su.stat.toLowerCase() === f.id) s += A.val("subjects", su.key); }));
    f.skills.forEach((sk) => { s += A.val("skills", sk.id); });
    return s;
  };
  const majorSubjects = (D, A) => {
    const out = [];
    D.magicSchools.forEach((sc) => sc.subjects.forEach((s) => { if (A.isMajor(s.key)) out.push({ key: s.key, name: s.name, rank: A.val("subjects", s.key), tone: TONE_FG[sc.tone] }); }));
    return out;
  };

  const AllocStepper = ({ value, canDec, canInc, onDec, onInc }) => (
    <span className="opt-stepper">
      <button className="opt-step-btn" type="button" disabled={!canDec} onClick={onDec} aria-label="decrease">−</button>
      <span className="opt-stepper__num">{value}</span>
      <button className="opt-step-btn" type="button" disabled={!canInc} onClick={onInc} aria-label="increase">+</button>
    </span>
  );
  const Pips = ({ value, limit, base, accent }) => {
    const b = base == null ? limit : base;
    return (
      <span className="opt-pips" style={{ "--p": accent }}>
        {Array.from({ length: limit }).map((_, i) => (
          <span key={i} className={"opt-pip" + (i < value ? " on" : "") + (i >= b ? " bonus" : "")} />
        ))}
      </span>
    );
  };
  const StarBtn = ({ on, onClick }) => (
    <button type="button" className={"opt-star" + (on ? " on" : "")} onClick={onClick} title={on ? "Major field" : "Mark as a major field"}><Ic name="star" /></button>
  );
  const Donut = ({ value, limit, accent, icon }) => {
    const r = 40, c = 2 * Math.PI * r, frac = Math.min(value, limit) / limit;
    return (
      <div className="atlas-ring">
        <svg viewBox="0 0 92 92">
          <circle className="atlas-ring__bg" cx="46" cy="46" r={r} strokeWidth="7" />
          <circle className="atlas-ring__fg" cx="46" cy="46" r={r} strokeWidth="7" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ stroke: accent }} />
        </svg>
        <div className="atlas-ring__c">
          <span className="atlas-ring__glyph" style={{ color: accent }}><Ic name={icon} /></span>
          <span className="atlas-ring__n">{value}</span>
        </div>
      </div>
    );
  };

  function StatRadar({ D, A, kind }) {
    const facs = D.stats, n = facs.length, lim = A.limit;
    const ability = kind === "ability";
    const sums = facs.map((f) => (ability ? facTrain(D, A, f) : A.val("stats", f.id)));
    const total = sums.reduce((a, b) => a + b, 0);
    const maxV = ability ? Math.max(1, ...sums) : lim;
    const RINGS = ability ? 4 : lim;
    const W = 300, H = 300, cx = W / 2, cy = H * 0.46, Rmax = 86, labelR = 122;
    const ang = (i) => (-90 + i * (360 / n)) * Math.PI / 180;
    const ringPath = (rr) => { let d = ""; for (let i = 0; i < n; i++) { const a = ang(i); d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1) + " "; } return d + "Z"; };
    const valR = (v) => (Math.min(v, maxV) / maxV) * Rmax;
    const pts = facs.map((f, i) => { const a = ang(i), rr = valR(sums[i]); return { f, a, x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), vx: cx + Rmax * Math.cos(a), vy: cy + Rmax * Math.sin(a), v: sums[i] }; });
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
            <div key={"lb" + p.f.id} className="ast2__lbl" style={{ left: (cx + labelR * Math.cos(p.a)) / W * 100 + "%", top: (cy + labelR * Math.sin(p.a)) / H * 100 + "%", color: facColor(p.f) }}>
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

  function CodexTab({ D, A, g, sel, onSel }) {
    const spent = groupSpent(D, A, g);
    return (
      <button type="button" className={"codex-tab" + (sel === g.id ? " is-active" : "")} style={{ "--ct": groupColor(g) }} onClick={() => onSel(g.id)}>
        <span className="codex-tab__glyph"><Ic name={g.icon} /></span>
        <span className="codex-tab__name">{g.label}</span>
        <span className="codex-tab__meta">{spent || "·"}</span>
      </button>
    );
  }

  /* ================================ CLASSES ============================== */
  function AdmissionClasses({ D, classData, draft, set }) {
    const classes = classData.classes;
    const owned = F.ownedClasses(draft);
    const mode = draft.classMode;
    const defaultRank = mode === "single" ? 4 : 2;
    const maxClasses = mode === "single" ? 1 : 2;
    const b = F.budgets(draft, D);
    const custom = draft.buildType === "custom";

    const switchMode = (m) => { if (m !== mode) set({ classMode: m, classes: {} }); };

    const pickClass = (id) => {
      const cur = draft.classes[id];
      if (cur && cur.rank > 0) { const nc = { ...draft.classes }; delete nc[id]; set({ classes: nc }); return; }
      if (owned.length >= maxClasses) return;
      const choices = {}; for (let L = 1; L <= defaultRank; L++) choices[L] = 0;
      set({ classes: { ...draft.classes, [id]: { rank: defaultRank, choices } } });
    };
    const setChoice = (id, L, side) => set({ classes: { ...draft.classes, [id]: { ...draft.classes[id], choices: { ...draft.classes[id].choices, [L]: side } } } });
    const setRank = (id, rank) => {
      const cur = draft.classes[id]; if (!cur) return;
      rank = Math.max(defaultRank, Math.min(10, rank));
      const choices = { ...cur.choices };
      for (let L = cur.rank + 1; L <= rank; L++) if (choices[L] == null) choices[L] = 0;
      Object.keys(choices).forEach((L) => { if (+L > rank) delete choices[L]; });
      set({ classes: { ...draft.classes, [id]: { rank, choices } } });
    };
    const canRaise = (id) => custom && draft.classes[id].rank < 10 && (b.remaining || 0) >= 2;

    return (
      <div className="sf-fstep-body">
        <div className="sf-fhead">
          <h3>Choose Your Class</h3>
          <p className="sf-fhint">Your class defines your abilities and how you engage with the world of Starfall. You can pick 1 class at rank 4 or two classes at rank 2. For each rank you take, choose between the two rank options. {custom ? "Custom build may rank a class higher (2 pts / level)." : "Switch to a Custom build to rank higher at creation."}</p>
        </div>

        <div className="sf-seg" role="tablist">
          {[["single", "One class · rank IV"], ["double", "Two classes · rank II"]].map(([m, l]) => (
            <button key={m} role="tab" aria-selected={mode === m} className={"sf-seg__opt" + (mode === m ? " is-active" : "")} onClick={() => switchMode(m)} type="button">{l}</button>
          ))}
        </div>

        <div className="sf-fclass-grid">
          {classes.map((k) => {
            const cur = draft.classes[k.id];
            const isOwned = cur && cur.rank > 0;
            const dim = !isOwned && owned.length >= maxClasses;
            const style = { "--cc-accent": TONE_500[k.tone], "--cc-accent-fg": TONE_FG[k.tone] };
            return (
              <button key={k.id} type="button" style={style} disabled={dim} onClick={() => pickClass(k.id)}
                className={"sf-fclass" + (isOwned ? " is-owned" : "") + (dim ? " is-dim" : "")}>
                <span className="sf-fclass__glyph"><Ic name={k.icon} /></span>
                <span className="sf-fclass__id">
                  <span className="sf-fclass__name">{k.name}</span>
                  <span className="sf-fclass__tag">{k.description || k.tagline}</span>
                </span>
                {isOwned ? <span className="sf-fclass__rank">{ROMAN[cur.rank]}</span> : <span className="sf-fclass__pick"><Ic name="plus" /></span>}
              </button>
            );
          })}
        </div>

        {owned.map((id) => {
          const k = classes.find((x) => x.id === id);
          const cur = draft.classes[id];
          const style = { "--cc-accent": TONE_500[k.tone], "--cc-accent-fg": TONE_FG[k.tone] };
          return (
            <div key={id} className="sf-fladder" style={style}>
              <div className="sf-fladder__head">
                <span className="sf-fclass__glyph"><Ic name={k.icon} /></span>
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
                          <button key={s} type="button" onClick={() => setChoice(id, L, s)}
                            className={"sf-fopt" + (cur.choices[L] === s ? " is-chosen" : "")}>
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
  function AdmissionAllocation({ D, draft, set }) {
    const b = F.budgets(draft, D);
    const limit = b.limit;
    const custom = b.mode === "custom";
    const [sel, setSel] = React.useState("g-stats");

    const poolMap = { stats: "stat", subjects: "subject", skills: "skill" };
    const costPer = (map) => (map === "stats" ? D.creation.custom.statCost : D.creation.custom.abilityCost);

    const A = {
      limit,
      majorBonus: F.majorBonus(draft),
      itemLimit: (map, key) => F.rankCap(draft, D, map, key),
      val: (map, key) => draft[map][key] || 0,
      pool: (map) => (draft.mode === "edit" ? null : custom ? null : b[poolMap[map]].pool),
      canInc: (map, key) => {
        if (draft.mode === "edit") return true;
        const cur = draft[map][key] || 0;
        if (cur >= F.rankCap(draft, D, map, key)) return false;
        if (custom) return (b.remaining || 0) >= costPer(map);
        const p = b[poolMap[map]]; return p.spent < p.pool;
      },
      inc: (map, key) => { set({ [map]: { ...draft[map], [key]: (draft[map][key] || 0) + 1 } }); },
      dec: (map, key) => { const cur = draft[map][key] || 0; if (cur > 0) set({ [map]: { ...draft[map], [key]: cur - 1 } }); },
      isMajor: (key) => draft.major.includes(key),
      toggleMajor: (key) => {
        const has = draft.major.includes(key);
        let next;
        if (has) next = draft.major.filter((k) => k !== key);
        else if (draft.major.length < 2) next = [...draft.major, key];
        else return;
        const nb = next.length === 1 ? 3 : next.length === 2 ? 1 : 0;
        const cap = (k) => (next.includes(k) ? limit + nb : limit);
        const ns = {};
        Object.keys(draft.subjects).forEach((k) => { ns[k] = Math.min(draft.subjects[k] || 0, cap(k)); });
        set({ major: next, subjects: ns });
      },
    };

    const groups = codexGroups(D);
    const cur = groups.find((g) => g.id === sel) || groups[0];
    const tone = groupColor(cur);

    // Two-tier mobile nav: kind → sub-tabs
    const KINDS = [
      { id: "stats",    label: "Stats" },
      { id: "subjects", label: "Subjects" },
      { id: "skills",   label: "Skills" },
    ];
    const [kindSel, setKindSel] = React.useState(() => cur.kind || "stats");
    const switchKind = (k) => {
      setKindSel(k);
      const first = groups.find((g) => g.kind === k);
      if (first) setSel(first.id);
    };
    // Keep kindSel in sync if sel changes via desktop sidebar
    React.useEffect(() => { if (cur.kind !== kindSel) setKindSel(cur.kind); }, [sel]);

    return (
      <div className="sf-fstep-body sf-alloc">
        <div className="sf-fhead">
          <h3>Stats &amp; Abilities</h3>
          <p className="sf-fhint">Put your points into base Stats that empower different Abilities, and then rank in individual Abilities: your magic Subjects and your practical Skills. Choose one major Subject to take a +3 cap, or two major Subjects to take a +1 cap.</p>
        </div>

        <div className="codex">
          {/* Desktop sidebar — unchanged */}
          <nav className="codex__index codex__index--desktop">
            <div className="codex__group-label">Stats</div>
            {groups.filter((g) => g.kind === "stats").map((g) => <CodexTab key={g.id} {...{ D, A, g, sel, onSel: setSel }} />)}
            <div className="codex__group-label">Subjects · the four schools</div>
            {groups.filter((g) => g.kind === "subjects").map((g) => <CodexTab key={g.id} {...{ D, A, g, sel, onSel: setSel }} />)}
            <div className="codex__group-label">Skills · by stat</div>
            {groups.filter((g) => g.kind === "skills").map((g) => <CodexTab key={g.id} {...{ D, A, g, sel, onSel: setSel }} />)}
          </nav>

          {/* Mobile two-tier nav */}
          <nav className="codex__index codex__index--mobile">
            <div className="codex-kind-row">
              {KINDS.map(({ id, label }) => (
                <button key={id} type="button"
                  className={"codex-kind-btn" + (kindSel === id ? " is-active" : "")}
                  onClick={() => switchKind(id)}>{label}</button>
              ))}
            </div>
            <div className="codex-sub-row">
              {groups.filter((g) => g.kind === kindSel).length > 1 && groups.filter((g) => g.kind === kindSel).map((g) => (
                <CodexTab key={g.id} {...{ D, A, g, sel, onSel: setSel }} />
              ))}
            </div>
          </nav>

          <div className="codex__panel">
            <div className="codex__panel-head" style={{ "--cp": tone }}>
              <span className="codex__panel-glyph"><Ic name={cur.icon} /></span>
              <div className="codex__panel-tt">
                <h3>{cur.label}</h3>
                <span>{cur.kind === "stats" ? "Six stats — the base of every roll" : cur.kind === "subjects" ? cur.school.blurb : "Four skills under " + cur.fac.name}</span>
              </div>
              <div className="codex__panel-prog"><b>{groupSpent(D, A, cur)}</b><small>points here</small></div>
            </div>

            {cur.kind === "stats" ? (
              <div className="atlas-statgrid">
                {D.stats.map((f) => {
                  const v = A.val("stats", f.id), ft = facColor(f);
                  return (
                    <div key={f.id} className="atlas-statcard" style={{ "--ac": ft }}>
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
                    <div key={it.key} className={"codex-row" + (v > 0 ? " is-set" : "")} style={{ "--cp": tone }}>
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

        {/* running reference — two astrolabes, majors, and a faculty key */}
        <aside className="refined__ref">
          <div className="refined__ref-head"><Ic name="hexagon" /> <span>Overview</span><em>a running reference as you build — your strengths at a glance</em></div>
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
                      <span key={m.key} className="refined__major" style={{ "--mc": m.tone }}>
                        <Ic name="star" /><span className="refined__major-nm">{m.name}</span><span className="refined__major-rk">{m.rank}</span>
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
  // A pick-from-compendium list with a running budget cap.
  function PickList({ D, cat, selected, onToggle, can, costOf, emptyHint }) {
    const items = D.compendium.filter((e) => e.cat === cat);
    return (
      <div className="sf-pick">
        {items.length === 0 ? <p className="sf-fhint">{emptyHint}</p> : items.map((e) => {
          const on = selected.includes(e.id);
          const blocked = !on && !can(e);
          return (
            <button key={e.id} type="button" disabled={blocked} onClick={() => onToggle(e.id)}
              className={"sf-pick__item" + (on ? " is-on" : "") + (blocked ? " is-blocked" : "")}>
              <span className="sf-pick__check"><Ic name={on ? "check" : "plus"} /></span>
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

  function AdmissionInventory({ D, draft, set }) {
    const y = F.yields(draft, D);
    const b = F.budgets(draft, D);
    const custom = b.mode === "custom";
    const compMat = (id) => { const e = D.compendium.find((x) => x.id === id); return (e && e.mat) || 0; };

    const toggleIn = (key, id, capCheck) => {
      const arr = draft[key];
      if (arr.includes(id)) set({ [key]: arr.filter((x) => x !== id) });
      else if (capCheck()) set({ [key]: [...arr, id] });
    };
    // Wandcrafting bonus wands: pooled by material budget.
    const craftSpent = draft.craftWands.reduce((s, id) => s + compMat(id), 0);
    const buySpentPts = F.budgets(draft, D).mode === "custom" ? (b.breakdown.wands + b.breakdown.artifacts) : 0;

    const SubHead = ({ icon, title, note }) => (
      <div className="sf-isub"><span className="sf-isub__glyph"><Ic name={icon} /></span><span className="sf-isub__t">{title}</span><span className="sf-isub__n">{note}</span></div>
    );

    return (
      <div className="sf-fstep-body">
        <div className="sf-fhead">
          <h3>Arsenal</h3>
          <p className="sf-fhint">Take {D.creation.startingMaterials} Materials as your starting balance. Depending on your Ability spread, you may be able to take extra potions, plants, glyphs, or wands.</p>
        </div>

        <SubHead icon="flask-conical" title="Potions" note={`Alchemy grants ${y.potions} · ${draft.potions.length} chosen`} />
        {y.potions === 0
          ? <p className="sf-fhint sf-fhint--mut">Put points into <b>Alchemy</b> to start with potions (you'll know each recipe).</p>
          : <PickList D={D} cat="potion" selected={draft.potions} onToggle={(id) => toggleIn("potions", id, () => draft.potions.length < y.potions)} can={() => draft.potions.length < y.potions} costOf={(e) => e.level} emptyHint="No potions in the archive yet." />}

        <SubHead icon="leaf" title="Plants" note={`Herbalism grants ${y.plantMat} mats · ${(draft.plants||[]).reduce((s,id) => { const e = D.compendium.find(x=>x.id===id); return s + (e&&e.value||0); }, 0)} mats chosen`} />
        {y.plantMat === 0
          ? <p className="sf-fhint sf-fhint--mut">Put points into <b>Herbalism</b> to start with plants (50 mats of plant per rank).</p>
          : <PickList D={D} cat="plant" selected={draft.plants||[]} onToggle={(id) => { const e = D.compendium.find(x=>x.id===id); const val = e&&e.value||0; const spent = (draft.plants||[]).reduce((s,pid) => { const pe = D.compendium.find(x=>x.id===pid); return s+(pe&&pe.value||0); }, 0); toggleIn("plants", id, () => !draft.plants?.includes(id) && spent + val <= y.plantMat); }} can={(e) => { const spent = (draft.plants||[]).reduce((s,pid) => { const pe = D.compendium.find(x=>x.id===pid); return s+(pe&&pe.value||0); }, 0); return (draft.plants||[]).includes(e.id) || spent + (e.value||0) <= y.plantMat; }} costOf={(e) => (e.value||0) + " mats"} emptyHint="No plants in the archive yet." />}

        <SubHead icon="pen-tool" title="Glyphs" note={`Runology grants ${y.glyphs} · ${draft.glyphs.length} chosen`} />
        {y.glyphs === 0
          ? <p className="sf-fhint sf-fhint--mut">Put points into <b>Runology</b> to learn glyphs (two per rank).</p>
          : <PickList D={D} cat="glyph" selected={draft.glyphs} onToggle={(id) => toggleIn("glyphs", id, () => draft.glyphs.length < y.glyphs)} can={() => draft.glyphs.length < y.glyphs} costOf={(e) => e.meta && e.meta[1]} emptyHint="No glyphs in the archive yet." />}

        <SubHead icon="wand-2" title="Wands" note={`Wandcrafting grants ${y.craftMat} mats · ${craftSpent} mats chosen`} />
        {y.craftMat === 0
          ? <p className="sf-fhint sf-fhint--mut">Put points into <b>Wandcrafting</b> to take more wands (200 mats of wand per rank).</p>
          : <PickList D={D} cat="wand" selected={draft.craftWands} onToggle={(id) => toggleIn("craftWands", id, () => craftSpent + compMat(id) <= y.craftMat)} can={(e) => craftSpent + e.mat <= y.craftMat} costOf={(e) => e.mat + " mat"} emptyHint="No wands in the archive yet." />}

        {custom ? (
          <React.Fragment>
            <div className="sf-idiv"><span>Custom-build purchases</span><span className="sf-idiv__pts">{b.remaining} pts left</span></div>

            <SubHead icon="wand-sparkles" title="Buy wands" note="1 pt / 400 mat" />
            <PickList D={D} cat="wand" selected={draft.extraWands} onToggle={(id) => toggleIn("extraWands", id, () => (b.remaining || 0) >= Math.ceil(compMat(id) / D.creation.custom.wandPer))} can={(e) => (b.remaining || 0) >= Math.ceil(e.mat / D.creation.custom.wandPer)} costOf={(e) => Math.ceil(e.mat / D.creation.custom.wandPer) + " pt"} emptyHint="No wands in the archive yet." />

            <SubHead icon="gem" title="Buy artifacts" note="1 pt / 400 mat · auto-attuned" />
            <PickList D={D} cat="artifact" selected={draft.artifacts} onToggle={(id) => toggleIn("artifacts", id, () => (b.remaining || 0) >= Math.ceil(compMat(id) / D.creation.custom.artifactPer))} can={(e) => (b.remaining || 0) >= Math.ceil(e.mat / D.creation.custom.artifactPer)} costOf={(e) => Math.ceil(e.mat / D.creation.custom.artifactPer) + " pt"} emptyHint="No artifacts in the archive yet." />
          </React.Fragment>
        ) : null}
      </div>
    );
  }

  /* ================================ SPELLS ============================== */
  const FORGE_SPELL_SORT = [
    ["name",    "Name",    "text"],
    ["subject", "Subject", "text"],
    ["stat",    "Stat",    "text"],
    ["level",   "Level",   "level"],
    ["dc",      "DC",      "num"],
  ];
  const FORGE_SPELL_LEVEL_ORDER = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4 };
  const forgeSpellRank = (v) => { if (!v) return 99; const f = String(v).trim().toLowerCase().split(/\s+/)[0]; return FORGE_SPELL_LEVEL_ORDER[f] != null ? FORGE_SPELL_LEVEL_ORDER[f] : 50; };

  function AdmissionSpells({ D, draft, set }) {
    const quota    = F.yearById(D, draft.yearId).spells;
    const tally    = F.spellTally(draft, D);
    const allSpells = D.compendium.filter((e) => e.cat === "spell");

    const [q,          setQ]          = React.useState("");
    const [sort,       setSort]       = React.useState({ field: "level", dir: "asc" });
    const [filters,    setFilters]    = React.useState({ subject: "any", stat: "any", level: "any", ritual: "any" });
    const [sortOpen,   setSortOpen]   = React.useState(false);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const sortRef   = React.useRef(null);
    const filterRef = React.useRef(null);

    React.useEffect(() => {
      if (!sortOpen && !filterOpen) return;
      const fn = (e) => {
        if (sortRef.current   && !sortRef.current.contains(e.target))   setSortOpen(false);
        if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, [sortOpen, filterOpen]);

    const uniq = (arr) => [...new Set(arr.filter((v) => v != null && v !== ""))].sort();
    const subjectOpts = uniq(allSpells.map((s) => s.subject));
    const statOpts    = uniq(allSpells.map((s) => s.stat));

    const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
    const resetFilters = () => setFilters({ subject: "any", stat: "any", level: "any", ritual: "any" });
    const facetCount = [filters.subject !== "any", filters.stat !== "any", filters.level !== "any", filters.ritual !== "any"].filter(Boolean).length;

    let visible = allSpells.filter((sp) => {
      if (filters.subject !== "any" && sp.subject !== filters.subject) return false;
      if (filters.stat    !== "any" && sp.stat    !== filters.stat)    return false;
      if (filters.level   !== "any" && sp.level   !== filters.level)   return false;
      if (filters.ritual  !== "any") { const want = filters.ritual === "yes"; if (!!sp.ritual !== want) return false; }
      if (q) { const hay = (sp.name + " " + sp.subject + " " + sp.stat + " " + (sp.desc || "")).toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
      return true;
    });

    const sign     = sort.dir === "asc" ? 1 : -1;
    const sortType = (FORGE_SPELL_SORT.find((f) => f[0] === sort.field) || [])[2] || "text";
    visible = visible.slice().sort((a, b) => {
      let r;
      if (sortType === "num") { const av = parseFloat(a[sort.field]), bv = parseFloat(b[sort.field]); const am = isNaN(av)||a[sort.field]==null, bm = isNaN(bv)||b[sort.field]==null; if (am||bm) r=am&&bm?0:am?1:-1; else r=av-bv; }
      else if (sortType === "level") r = forgeSpellRank(a[sort.field]) - forgeSpellRank(b[sort.field]);
      else r = String(a[sort.field]||"").toLowerCase().localeCompare(String(b[sort.field]||"").toLowerCase());
      if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
      return r * sign;
    });

    const pickSort  = (field) => setSort((s) => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
    const sortLabel = (FORGE_SPELL_SORT.find((f) => f[0] === sort.field) || FORGE_SPELL_SORT[0])[1];

    const toggle = (e) => {
      const on = draft.spells.includes(e.id);
      if (on) { set({ spells: draft.spells.filter((x) => x !== e.id) }); return; }
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

        {/* Toolbar — matches SpellSection/Compendium exactly */}
        <div className="sf-comp-toolbar sf-spell-toolbar">
          <span className="sf-comp-count">
            {visible.length === allSpells.length ? allSpells.length + " spells" : visible.length + " of " + allSpells.length}
          </span>

          <div className="sf-spell-search">
            <Ic name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spells…" />
            {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Ic name="x" /></button> : null}
          </div>

          <div className="sf-comp-controls">
            {/* Filter popover */}
            <div className="sf-pop" ref={filterRef}>
              <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filter spells">
                <Ic name="sliders-horizontal" /><span>Filter</span>{facetCount ? <span className="sf-tool-dot"></span> : null}
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
                  <Select options={[{ value: "any", label: "Any" }, ...["Basic","Standard","Advanced","Legendary","Hex"].map((l) => ({ value: l, label: l }))]} value={filters.level} onChange={(e) => setF("level", e.target.value)} />
                </div>
                <div className="sf-filter-group">
                  <label>Ritual</label>
                  <Select options={[{ value: "any", label: "Any" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]} value={filters.ritual} onChange={(e) => setF("ritual", e.target.value)} />
                </div>
                {facetCount > 0 && <button className="sf-filter-reset" onClick={resetFilters}>Reset filters</button>}
              </div>
            </div>

            {/* Sort popover */}
            <div className="sf-pop" ref={sortRef}>
              <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort spells">
                <Ic name="arrow-up-down" /><span>{sortLabel}</span>
              </button>
              <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
                <div className="sf-menu__head">Order by</div>
                {FORGE_SPELL_SORT.map(([key, label]) => (
                  <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => { pickSort(key); setSortOpen(false); }}>
                    <span>{label}</span>
                    {sort.field === key && <Ic name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="sf-fhint sf-fhint--mut">No spells match — try adjusting your filters.</p>
        ) : (
          <div className="sf-pick">
            {visible.map((e) => {
              const on   = draft.spells.includes(e.id);
              const full = !on && (tally[e.level] || 0) >= (quota[e.level] || 0);
              return (
                <button key={e.id} type="button" disabled={full} onClick={() => toggle(e)} className={"sf-pick__item" + (on ? " is-on" : "") + (full ? " is-blocked" : "")}>
                  <span className="sf-pick__check"><Ic name={on ? "check" : "plus"} /></span>
                  <span className="sf-pick__body">
                    <span className="sf-pick__name">{e.name}<span className="sf-pick__cost"><Badge tone={window.SF_SHARED.levelTone(e.level) || "neutral"} dot>{e.level}</Badge></span></span>
                    <span className="sf-pick__desc">{e.meta ? e.meta.join(" · ") + " — " : ""}{e.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  Object.assign(window, {
    SF_AdmissionClasses: AdmissionClasses,
    SF_AdmissionAllocation: AdmissionAllocation,
    SF_AdmissionInventory: AdmissionInventory,
    SF_AdmissionSpells: AdmissionSpells,
    SF_AdmissionStepper: Stepper,
  });
})();
