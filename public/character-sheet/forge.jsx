/* ===========================================================================
   Starfall Academy — The Admission: wizard shell
   Full-screen takeover: step-rail + the Identity / Wand / Review steps + the
   footer (budget HUD, Back / Next / Begin). Heavy steps come from admission-steps.jsx.
   Exported as window.SF_Forge; mounted by app.jsx when the Admission is open.
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, IconButton, Badge, Input, Crest } = SA;
  const Ic = window.SF_Ic;
  const F = window.SF_ADMISSION;
  const TONE_500 = window.SF_SHARED.TONE_500;
  const TONE_FG  = window.SF_SHARED.TONE_FG;

  const STEPS = [
    { id: "identity",   label: "Identity",        icon: "user-round" },
    { id: "classes",    label: "Classes",         icon: "graduation-cap" },
    { id: "wand",       label: "Starting Wand",   icon: "wand-2" },
    { id: "allocation", label: "Stats & Abilities", icon: "sliders-horizontal" },
    { id: "inventory",  label: "Inventory",       icon: "backpack" },
    { id: "spells",     label: "Spells",          icon: "sparkles" },
    { id: "review",     label: "Review",          icon: "scroll-text" },
  ];
  const DRAFT_KEY = "sf-admission-draft";

  /* ------------------------------- Identity ----------------------------- */
  function IdentityStep({ D, draft, set }) {
    return (
      <div className="sf-fstep-body">
        <div className="sf-fhead">
          <h3>Student Profile</h3>
          <p className="sf-fhint">Define who you are and what you do here at Starfall. Pick your year, your House, and write a bio to describe who you are.</p>
        </div>

        <div className="sf-frow sf-frow--2">
          <Input label="Name" placeholder="e.g. Arianna Valey" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label="Pronouns" placeholder="e.g. she / her" value={draft.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
        </div>

        <div className="sf-ffield">
          <span className="sf-flabel">Year</span>
          <div className="sf-seg">
            {D.creation.years.map((y) => (
              <button key={y.id} type="button" className={"sf-seg__opt" + (draft.yearId === y.id ? " is-active" : "")} onClick={() => set({ yearId: y.id })}>{y.label}</button>
            ))}
          </div>
        </div>

        <div className="sf-ffield">
          <span className="sf-flabel">Build</span>
          <div className="sf-seg">
            {(() => { const yr = D.creation.years.find(y => y.id === draft.yearId) || D.creation.years[0]; const q = yr.quick; return [["quick", "Quick build", `Three tidy pools — ${q.stat} stats · ${q.subject} subjects · ${q.skill} skills.`], ["custom", "Custom build", `One pool · ${yr.custom} pts — fine-tune, and buy class ranks, wands, artifacts.`]]; })().map(([v, l, d]) => (
              <button key={v} type="button" className={"sf-seg__opt sf-seg__opt--tall" + (draft.buildType === v ? " is-active" : "")} onClick={() => set({ buildType: v })}>
                <span className="sf-seg__t">{l}</span><span className="sf-seg__d">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sf-ffield">
          <span className="sf-flabel">House <span className="sf-flabel__opt">· flavor, and your sheet's color</span></span>
          <div className="sf-fhouses">
            {D.houses.map((h) => (
              <button key={h.id} type="button" onClick={() => set({ houseId: h.id })}
                className={"sf-fhouse" + (draft.houseId === h.id ? " is-active" : "")} style={{ "--h-accent": TONE_500[h.tone], "--h-accent-fg": TONE_FG[h.tone] }}>
                <span className="sf-fhouse__dot"></span>
                <span className="sf-fhouse__name">{h.name}</span>
                <span className="sf-fhouse__blurb">{h.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <Input label="Title" placeholder="e.g. Child of the Darkness" value={draft.title} onChange={(e) => set({ title: e.target.value })} hint="Leave blank to derive one from your major." />

        <label className="sf-ffield">
          <span className="sf-flabel">Background <span className="sf-flabel__opt">· optional</span></span>
          <textarea className="sf-ftextarea" rows={3} placeholder="Who are you, and where did you come from?" value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
        </label>
      </div>
    );
  }

  /* --------------------------------- Wand ------------------------------- */
  function WandStep({ D, draft, set }) {
    const wand = F.wandById(D, draft.wandId);
    const count = wand.count;
    const chosen = draft.wandTargets || [];

    const pickWand = (id) => { if (id !== draft.wandId) set({ wandId: id, wandTargets: [] }); };

    // Stat target (Sylene): single stat.
    const setStat = (statName) => set({ wandTargets: [statName] });
    // Ability targets (Champion/Whispered): subjects + skills, capped at count.
    const abilities = [].concat(
      F.flatSubjects(D).map((s) => ({ type: "subject", key: s.key, label: s.name, group: s.school.name })),
      F.flatSkills(D).map((s) => ({ type: "skill", key: s.id, label: s.name, group: s.fac.name })),
    );
    const hasAbility = (key) => chosen.some((t) => t && t.key === key);
    const toggleAbility = (a) => {
      if (hasAbility(a.key)) set({ wandTargets: chosen.filter((t) => t.key !== a.key) });
      else if (chosen.length < count) set({ wandTargets: [...chosen, { type: a.type, key: a.key, label: a.label }] });
    };

    return (
      <div className="sf-fstep-body">
        <div className="sf-fhead">
          <h3>Choose Your Wand</h3>
          <p className="sf-fhint">A good caster swears by their wand. You'll collect more on your journey, but choose your starter wand.</p>
        </div>

        <div className="sf-fwands">
          {D.creation.startingWands.map((w) => (
            <button key={w.id} type="button" onClick={() => pickWand(w.id)} className={"sf-fwand" + (draft.wandId === w.id ? " is-active" : "")}>
              <span className="sf-fwand__glyph"><Ic name="wand-2" /></span>
              <span className="sf-fwand__name">{w.name}</span>
              <span className="sf-fwand__grant">{w.grant}</span>
              <span className="sf-fwand__desc">{w.desc}</span>
            </button>
          ))}
        </div>

        <div className="sf-ftargets">
          <div className="sf-ftargets__head">
            <span className="sf-flabel">{wand.kind === "stat" ? "Choose one Stat" : `Choose ${count} Abilit${count > 1 ? "ies" : "y"}`}</span>
            <span className="sf-ftargets__count">{(wand.kind === "stat" ? chosen.length : chosen.length)}/{count}</span>
          </div>

          {wand.kind === "stat" ? (
            <div className="sf-fchips">
              {D.stats.map((f) => (
                <button key={f.id} type="button" className={"sf-fchip" + (chosen[0] === f.name ? " is-on" : "")} onClick={() => setStat(f.name)}>
                  {f.name} <span className="sf-fchip__v">+{wand.value}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sf-ftargets__list">
              {["Subjects", "Skills"].map((grpKind) => {
                const list = abilities.filter((a) => (grpKind === "Subjects" ? a.type === "subject" : a.type === "skill"));
                return (
                  <div key={grpKind} className="sf-ftargets__grp">
                    <div className="sf-ftargets__glabel">{grpKind}</div>
                    <div className="sf-fchips">
                      {list.map((a) => {
                        const on = hasAbility(a.key);
                        const full = !on && chosen.length >= count;
                        return (
                          <button key={a.type + a.key} type="button" disabled={full} onClick={() => toggleAbility(a)} className={"sf-fchip" + (on ? " is-on" : "") + (full ? " is-dim" : "")}>
                            {a.label}{on ? <span className="sf-fchip__v">+{wand.value}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* -------------------------------- Review ------------------------------ */
  function ReviewStep({ D, classData, draft, missing }) {
    const year = F.yearById(D, draft.yearId), house = F.houseById(D, draft.houseId), wand = F.wandById(D, draft.wandId);
    const b = F.budgets(draft, D);
    const subjName = (k) => { const s = F.flatSubjects(D).find((x) => x.key === k); return s ? s.name : k; };
    const majors = draft.major.map(subjName);
    const owned = F.ownedClasses(draft).map((id) => { const k = classData.classes.find((c) => c.id === id); return k ? `${k.name} ${F.ROMAN[draft.classes[id].rank]}` : id; });
    const topStats = D.stats.map((f) => ({ n: f.name, v: draft.stats[f.id] || 0 })).filter((x) => x.v > 0).sort((a, b2) => b2.v - a.v);
    const topSubs = F.flatSubjects(D).map((s) => ({ n: s.name, v: draft.subjects[s.key] || 0 })).filter((x) => x.v > 0).sort((a, b2) => b2.v - a.v);

    const Line = ({ k, children }) => <div className="sf-rev__line"><span className="sf-rev__k">{k}</span><span className="sf-rev__v">{children}</span></div>;

    return (
      <div className="sf-fstep-body">
        <div className="sf-fhead">
          <h3>Review &amp; begin</h3>
          <p className="sf-fhint">A last look before {draft.mode === "edit" ? "saving your changes" : "your arcanist steps onto the Grounds"}.</p>
        </div>

        {missing.length ? (
          <div className="sf-rev__warn">
            <Ic name="triangle-alert" />
            <div><b>Not quite ready.</b> <span>{missing.join(" · ")}</span></div>
          </div>
        ) : null}

        <div className="sf-rev">
          <div className="sf-rev__hero" style={{ "--h-accent": TONE_500[house.tone], "--h-accent-fg": TONE_FG[house.tone] }}>
            <span className="sf-rev__dot"></span>
            <div>
              <div className="sf-rev__name">{draft.name || "Unnamed arcanist"}</div>
              <div className="sf-rev__sub">{year.label} · {house.name}{majors.length ? " · " + majors.join(" & ") : ""}</div>
            </div>
            <span className="sf-rev__build">{b.mode === "custom" ? `Custom · ${b.remaining} pts left` : "Quick build"}</span>
          </div>

          <Line k="Classes">{owned.length ? owned.join(" · ") : <em className="sf-rev__none">none chosen</em>}</Line>
          <Line k="Starting wand">{wand.name} — {wand.grant}{draft.wandTargets.length ? " (" + draft.wandTargets.map((t) => typeof t === "string" ? t : t.label).join(", ") + ")" : ""}</Line>
          <Line k="Top stats">{topStats.length ? topStats.slice(0, 4).map((x) => `${x.n} ${x.v}`).join(" · ") : <em className="sf-rev__none">none</em>}</Line>
          <Line k="Top subjects">{topSubs.length ? topSubs.slice(0, 4).map((x) => `${x.n} ${x.v}`).join(" · ") : <em className="sf-rev__none">none</em>}</Line>
          <Line k="Spells">{draft.spells.length ? draft.spells.length + " chosen" : <em className="sf-rev__none">none</em>}</Line>
          <Line k="Loadout">{D.creation.startingMaterials} mat · {draft.potions.length} potion(s) · {draft.glyphs.length} glyph(s) · {draft.craftWands.length + draft.extraWands.length} extra wand(s) · {draft.artifacts.length} artifact(s)</Line>
        </div>
      </div>
    );
  }

  /* ------------------------------ Budget HUD ---------------------------- */
  const HUD_META = {
    Stats:    { icon: "hexagon",     tone: "var(--gold-400)" },
    Subjects: { icon: "sparkles",    tone: TONE_500.plum },
    Skills:   { icon: "list-checks", tone: TONE_500.teal },
    Points:   { icon: "gem",         tone: "var(--gold-400)" },
  };
  function BudgetHUD({ D, draft }) {
    const b = F.budgets(draft, D);
    const Meter = ({ label, spent, pool }) => {
      const over = spent > pool, full = spent === pool && !over;
      const m = HUD_META[label] || {};
      return (
        <div className={"sf-hud__meter" + (over ? " is-over" : "") + (full ? " is-full" : "")} style={{ "--m": m.tone }}>
          <span className="sf-hud__l">{m.icon ? <Ic name={m.icon} /> : null} {label}</span>
          <span className="sf-hud__bar"><span className="sf-hud__fill" style={{ width: Math.min(100, pool ? (spent / pool) * 100 : 0) + "%" }}></span></span>
          <span className="sf-hud__n">{spent}<small>/{pool}</small></span>
        </div>
      );
    };
    const cap = <span className="sf-hud__cap">Year cap <b>{b.limit}</b></span>;
    if (b.mode === "quick") {
      return <div className="sf-hud">{cap}<Meter label="Stats" spent={b.stat.spent} pool={b.stat.pool} /><Meter label="Subjects" spent={b.subject.spent} pool={b.subject.pool} /><Meter label="Skills" spent={b.skill.spent} pool={b.skill.pool} /></div>;
    }
    return <div className="sf-hud">{cap}<Meter label="Points" spent={b.spent} pool={b.pool} /><span className={"sf-hud__rem" + (b.remaining < 0 ? " is-over" : "")}>{b.remaining} left</span></div>;
  }

  /* ------------------------------- The shell ---------------------------- */
  function Admission({ mode, initial, data, classData, onCommit, onClose }) {
    const D = data;
    const [draft, setDraft] = React.useState(initial);
    const [idx, setIdx] = React.useState(0);
    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const step = STEPS[idx];

    // Persist new-character drafts so a refresh mid-build is safe.
    React.useEffect(() => {
      if (draft.mode === "new") { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (_) {} }
    }, [draft]);

    const validOf = (id) => F.stepValid(id, draft, D);
    const missing = [];
    if (!draft.name.trim()) missing.push("name your arcanist");
    if (draft.mode !== "edit") {
      if (!F.classValid(draft)) missing.push(draft.classMode === "single" ? "one class at rank IV" : "two classes at rank II");
      if (!F.wandValid(draft, D)) missing.push("finish your wand's targets");
      if (!F.majorValid(draft)) missing.push("star a major field");
      if (F.overCap(draft, D)) missing.push("a rank exceeds the year cap");
      if (F.overBudget(draft, D)) missing.push("you're over budget");
      if (!F.spellsOk(draft, D)) missing.push("too many spells for your year");
    }
    const ready = missing.length === 0;

    const begin = () => { if (ready) { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} onCommit(draft); } };
    const cancel = () => { if (draft.mode === "new") { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} } onClose(); };

    const showHUD = draft.mode !== "edit" && ["classes", "allocation", "inventory"].includes(step.id);

    return (
      <div className="sf-admission" role="dialog" aria-label="The Admission — character creation">
        <div className="sf-admission__scrim" onClick={cancel}></div>
        <div className="sf-admission__shell">
          {/* rail */}
          <aside className="sf-admission__rail">
            <div className="sf-admission__brand">
              <Crest form="lines" size={34} tint="gold" basePath="assets" />
              <div className="sf-admission__brandwm">
                <span className="sf-eyebrow">{mode === "edit" ? "Records" : "Admission"}</span>
                <span className="sf-admission__brandt">{mode === "edit" ? "Edit character" : "New arcanist"}</span>
              </div>
            </div>
            <nav className="sf-admission__steps">
              {STEPS.map((s, i) => {
                const done = validOf(s.id) && i !== idx;
                return (
                  <button key={s.id} type="button" className={"sf-admission__step" + (i === idx ? " is-active" : "") + (done ? " is-done" : "")} onClick={() => setIdx(i)}>
                    <span className="sf-admission__stepnum">{done ? <Ic name="check" /> : <Ic name={s.icon} />}</span>
                    <span className="sf-admission__steplabel">{s.label}</span>
                  </button>
                );
              })}
            </nav>
            <button className="sf-admission__cancel" onClick={cancel} type="button"><Ic name="x" /> {mode === "edit" ? "Discard changes" : "Cancel"}</button>
          </aside>

          {/* content */}
          <div className="sf-admission__main">
            <div className="sf-admission__scroll">
              {step.id === "identity"   && <IdentityStep   D={D} draft={draft} set={set} />}
              {step.id === "classes"    && <window.SF_AdmissionClasses    D={D} classData={classData} draft={draft} set={set} />}
              {step.id === "wand"       && <WandStep       D={D} draft={draft} set={set} />}
              {step.id === "allocation" && <window.SF_AdmissionAllocation D={D} draft={draft} set={set} />}
              {step.id === "inventory"  && <window.SF_AdmissionInventory  D={D} draft={draft} set={set} />}
              {step.id === "spells"     && <window.SF_AdmissionSpells     D={D} draft={draft} set={set} />}
              {step.id === "review"     && <ReviewStep     D={D} classData={classData} draft={draft} missing={missing} />}
            </div>

            <footer className="sf-admission__foot">
              <Button variant="ghost" disabled={idx === 0} iconLeft={<Ic name="arrow-left" />} onClick={() => setIdx((i) => Math.max(0, i - 1))}>Back</Button>
              {showHUD ? <BudgetHUD D={D} draft={draft} /> : <div className="sf-admission__footspace"></div>}
              {idx < STEPS.length - 1 ? (
                <Button variant="primary" iconLeft={<Ic name="arrow-right" />} onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}>Next</Button>
              ) : (
                <Button variant="primary" iconLeft={<Ic name="check" />} disabled={!ready} onClick={begin}>{mode === "edit" ? "Save character" : "Begin"}</Button>
              )}
            </footer>
          </div>
        </div>
      </div>
    );
  }

  window.SF_Admission = Admission;
})();
