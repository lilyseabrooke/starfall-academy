/* ===========================================================================
   Starfall Academy — presentational components
   Composes design-system components from window.StarfallAcademyDesignSystem_61fef2.
   All exported to window for the mount script.
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, IconButton, Badge, Switch, Crest, Input, Select } = SA;
  const SHARED = window.SF_SHARED;

  // Render Lucide icons as real inline SVG (React owns the DOM — no <i>→<svg> swap).
  const Ic = ({ name, className, style, size }) => {
    const reg = window.lucide || {};
    const pascal = String(name).split(/[-_]/).map((s) => (s ? s[0].toUpperCase() + s.slice(1) : "")).join("");
    const map = reg.icons || reg;
    const def = map[pascal];
    // Lucide changed its UMD icon format between versions:
    //   ≤0.469  ["svg", defaultAttrs, [[childTag, childAttrs], …]]  → children at [2]
    //   ≥0.562  [[childTag, childAttrs], …]                         → IS the children array
    // Some entries may be 3-element [tag, attrs, innerChildren] — we render the outer
    // element only (inner children omitted) since most icons are flat SVG paths.
    // Skip any entry whose tag is not a plain string so React never receives undefined.
    const children = (Array.isArray(def) && Array.isArray(def[0]) ? def : (def && def[2]) || [])
      .filter((ch) => ch && typeof ch[0] === "string");
    return (
      <svg className={className} style={style} width={size || "1em"} height={size || "1em"} {...SHARED.ICON_SVG_DEFAULTS}>
        {children.map((ch, i) => React.createElement(ch[0], { key: i, ...ch[1] }))}
      </svg>
    );
  };

  const TONE_FG = SHARED.TONE_FG;
  const TONE_500 = SHARED.TONE_500;

  /* ----------------------------- Sidebar -------------------------------- */
  function Sidebar({ data, active, onNavigate, roster, activeChar, onPickChar, compCount, onAddCharacter, onEditCharacter, collapsed, onToggleSidebar, mobileOpen, onMobileClose, gm }) {
    // GM variant — same chrome (slide-in, collapse, nav styling) as the player
    // sheet, with the GM's "The Table" tabs and "The Party" links out to sheets.
    // Reuses the shared sf-side / sf-nav / sf-roster classes so any styling or
    // mobile slide-in change made for the sheet shows up here too.
    if (gm) {
      return (
        <aside className={"sf-side sf-side--gm" + (collapsed ? " is-collapsed" : "") + (mobileOpen ? " is-mobile-open" : "")}>
          <div className="sf-brand">
            <Crest form="simple" size={38} basePath="assets" />
            <div className="sf-brand__wm">
              <span className="sf-brand__name">Starfall</span>
              <span className="sf-brand__sub">{gm.brandSub || "Faculty View"}</span>
            </div>
            <button className="sf-side__close" onClick={onMobileClose} aria-label="Close menu"><Ic name="x" /></button>
          </div>

          <nav className="sf-nav">
            <div className="sf-nav__label sf-eyebrow">{gm.tableLabel || "The Table"}</div>
            {(gm.tabs || []).map((n) => (
              <button key={n.id} className={"sf-nav__item" + (n.active ? " is-active" : "")} onClick={() => { n.onClick && n.onClick(); if (onMobileClose) onMobileClose(); }} title={collapsed ? n.label : undefined}>
                <Ic name={n.icon} />
                <span className="sf-side__label">{n.label}</span>
                {n.count != null && n.count !== "" ? <span className="sf-nav__count">{n.count}</span> : null}
              </button>
            ))}
          </nav>

          <nav className="sf-nav sf-nav--party">
            <div className="sf-nav__label sf-eyebrow">{gm.partyLabel || "The Party"}</div>
            <div className="sf-roster">
              {(gm.party || []).map((p) => (
                <button key={p.id} className="sf-roster__item sf-roster__item--link" onClick={() => { p.onOpen && p.onOpen(p.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? p.name + " · " + p.house : ("Open " + p.name + "’s character sheet")}>
                  <span className={"sf-avatar t-" + p.tone}>{p.initials}</span>
                  <span className="sf-roster__meta">
                    <span className="sf-roster__name">{p.name}</span>
                    <span className="sf-roster__house">{p.house}</span>
                  </span>
                  <Ic name="arrow-up-right" className="sf-roster__go" />
                </button>
              ))}
            </div>
          </nav>

          <button className="sf-side__toggle-btn" onClick={onToggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Ic name={collapsed ? "chevrons-right" : "chevrons-left"} />
            <span className="sf-side__label">{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        </aside>
      );
    }

    const nav = [
      { id: "overview", label: "Overview", icon: "shield-half" },
      { id: "classes", label: "Classes", icon: "graduation-cap" },
      { id: "magic", label: "Magic", icon: "sparkles" },
      { id: "inventory", label: "Inventory", icon: "backpack" },
      { id: "map", label: "Map", icon: "map" },
    ];
    return (
      <aside className={"sf-side" + (collapsed ? " is-collapsed" : "") + (mobileOpen ? " is-mobile-open" : "")}>
        <div className="sf-brand">
          <Crest form="simple" size={38} basePath="assets" />
          <div className="sf-brand__wm">
            <span className="sf-brand__name">Starfall</span>
            <span className="sf-brand__sub">Academy</span>
          </div>
          <button className="sf-side__close" onClick={onMobileClose} aria-label="Close menu"><Ic name="x" /></button>
        </div>

        <div className="sf-switcher">
          <div className="sf-switch-head">
            <span className="sf-eyebrow">Arcanists</span>
            <span className="sf-nav__count" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{roster.length}</span>
          </div>
          <div className="sf-roster">
            {roster.map((r) => (
              <button key={r.id} className={"sf-roster__item" + (r.id === activeChar ? " is-active" : "")} onClick={() => { onPickChar(r.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? r.name + " \u00b7 " + r.house + " House" : undefined}>
                <span className={"sf-avatar t-" + r.tone}>{r.initials}</span>
                <span className="sf-roster__meta">
                  <span className="sf-roster__name">{r.name}</span>
                  <span className="sf-roster__house">{r.house}</span>
                </span>
              </button>
            ))}
            <button className="sf-roster__add" onClick={onAddCharacter} title={collapsed ? "Add a character" : undefined}>
              <Ic name="user-plus" /><span className="sf-side__label">Add a character</span>
            </button>
          </div>
        </div>

        <nav className="sf-nav">
          <div className="sf-nav__label sf-eyebrow">The Sheet</div>
          {nav.map((n) => (
            <button key={n.id} className={"sf-nav__item" + (active === n.id ? " is-active" : "")} onClick={() => { onNavigate(n.id); if (onMobileClose) onMobileClose(); }} title={collapsed ? n.label : undefined}>
              <Ic name={n.icon} />
              <span className="sf-side__label">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sf-side__foot">
          <button className="sf-nav__item" onClick={() => { onNavigate("compendium"); if (onMobileClose) onMobileClose(); }} title={collapsed ? "Compendium" : undefined}>
            <Ic name="library-big" /><span className="sf-side__label">Compendium</span>
            <span className="sf-nav__count">{compCount}</span>
          </button>
          <button className="sf-nav__item" onClick={onEditCharacter} title={collapsed ? "Edit character" : undefined}>
            <Ic name="pencil-line" /><span className="sf-side__label">Edit character</span>
          </button>
        </div>
        <button className="sf-side__toggle-btn" onClick={onToggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Ic name={collapsed ? "chevrons-right" : "chevrons-left"} />
          <span className="sf-side__label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </aside>
    );
  }

  /* ----------------------------- Top bar -------------------------------- */
  function Stars({ value, max }) {
    return (
      <span className="sf-stars">
        {Array.from({ length: max }).map((_, i) => (
          <Ic key={i} name="star" className={i < value ? "on" : ""} />
        ))}
      </span>
    );
  }

  function TopBar({ title, eyebrow, c, onStep, onRollAction, onOpenCompendium, onToggleMobileMenu, hideVitals, searchQuery, onSearchQueryChange, searchResults, onSearchSelect, onSearchRoll, onSearchRepair, onSearchUse, searchMenuOpen, onSearchMenuOpen, onSearchMenuClose, onSearchMobileOpen }) {
    const headerRef    = React.useRef(null);
    const eyebrowRef   = React.useRef(null);
    const namePartRef  = React.useRef(null);
    const housePartRef = React.useRef(null);

    // Split "Lyra · Drake House" into name and house segments
    const dotIdx   = eyebrow ? eyebrow.indexOf(" \u00b7 ") : -1;
    const charName  = dotIdx >= 0 ? eyebrow.slice(0, dotIdx) : (eyebrow || "");
    const houseName = dotIdx >= 0 ? eyebrow.slice(dotIdx + 3) : "";

    // Synchronous DOM-manipulation check — runs before paint so there's no flash.
    // Priority: always keep the h1 title. Drop house first, then name.
    const checkFit = React.useCallback(() => {
      const eb = eyebrowRef.current;
      if (!eb) return;
      // Reset everything to visible
      if (namePartRef.current)  namePartRef.current.style.display  = "";
      if (housePartRef.current) housePartRef.current.style.display = "";
      // Only hide when there's an actual overflow (1px tolerance for subpixels)
      if (eb.scrollWidth > eb.clientWidth + 1) {
        if (housePartRef.current) housePartRef.current.style.display = "none";
        if (eb.scrollWidth > eb.clientWidth + 1) {
          if (namePartRef.current) namePartRef.current.style.display = "none";
        }
      }
    }, []);

    // Run after every render (catches name/title text changes)
    React.useLayoutEffect(checkFit);

    // Also re-check whenever the header is resized (viewport changes, sidebar toggle, etc.)
    React.useEffect(() => {
      const ro = new ResizeObserver(checkFit);
      if (headerRef.current) ro.observe(headerRef.current);
      return () => ro.disconnect();
    }, [checkFit]);

    // Handle keyboard shortcut for search
    React.useEffect(() => {
      const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          onSearchMenuOpen();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onSearchMenuOpen]);

    return (
      <header className={"sf-top" + (hideVitals ? " sf-top--hide-vitals" : "")} ref={headerRef}>
        <button className="sf-hamburger" onClick={onToggleMobileMenu} aria-label="Open navigation"><Ic name="menu" /></button>
        <div className="sf-top__titles">
          <span className="sf-eyebrow sf-top__eyebrow" ref={eyebrowRef}>
            <span ref={namePartRef}>{charName}</span>
            {houseName && <span ref={housePartRef}>{" \u00b7 "}{houseName}</span>}
          </span>
          <h1 className="sf-top__h1">{title}</h1>
        </div>
        <div className="sf-top__spacer"></div>

        <div className="sf-vitals">
          <div className="sf-vital is-ap">
            <span className="sf-vital__label">Action<br />Points</span>
            <div className="sf-stepper">
              <button className="sf-step" onClick={() => onStep("actionPoints", -1)} disabled={c.actionPoints <= 0}>−</button>
              <span className="sf-vital__num">{c.actionPoints}<small>/{c.actionPointsMax}</small></span>
              <button className="sf-step" onClick={() => onStep("actionPoints", 1)} disabled={c.actionPoints >= c.actionPointsMax}>+</button>
            </div>
            {onRollAction && (
              <button className="sf-ap-roll-btn" onClick={onRollAction} title="Action roll — DC 10 Insight">
                <Ic name="dices" />
              </button>
            )}
          </div>
          <div className="sf-vital">
            <span className="sf-vital__label">Resolve</span>
            <Stars value={c.resolve} max={c.resolveMax} />
          </div>
          <div className="sf-vital is-trouble">
            <span className="sf-vital__label">Trouble</span>
            <div className="sf-stepper">
              <button className="sf-step" onClick={() => onStep("trouble", -1)} disabled={c.trouble <= 0}>−</button>
              <span className="sf-vital__num">{c.trouble}</span>
              <button className="sf-step" onClick={() => onStep("trouble", 1)} disabled={c.trouble >= 10}>+</button>
            </div>
          </div>
        </div>

        <button
          className="srch-mobile-toggle"
          aria-label="Search"
          onClick={() => { onSearchMobileOpen && onSearchMobileOpen(); }}
        >
          <Ic name="search" />
        </button>

        <SF_SearchMenu
          query={searchQuery}
          results={searchResults}
          onQueryChange={onSearchQueryChange}
          onSelect={onSearchSelect}
          onRoll={onSearchRoll}
          onRepair={onSearchRepair}
          onUse={onSearchUse}
          isOpen={searchMenuOpen}
          onClose={onSearchMenuClose}
        />
      </header>
    );
  }

  /* --------------------------- Identity hero ---------------------------- */
  function IdentityHero({ c, onEdit }) {
    return (
      <section className="sf-hero">
        <img className="sf-hero__crest" src="assets/crest-lines.png" alt="" />
        <div className="sf-hero__main">
          <span className="sf-eyebrow">{c.title}</span>
          <h1 className="sf-hero__name">{c.name}</h1>
          <div className="sf-hero__meta">
            <Badge tone={c.houseTone} dot>{c.house}</Badge>
            <span className="sf-meta-dot"></span>
            <span className="sf-hero__metaitem"><b>Year</b> {c.year}</span>
            {c.pronouns ? <React.Fragment><span className="sf-meta-dot"></span><span className="sf-hero__metaitem">{c.pronouns}</span></React.Fragment> : null}
          </div>
          {c.bio ? <p className="sf-hero__bio">{c.bio}</p> : null}
        </div>
        <div className="sf-hero__side">
          <div className="sf-materials">
            <Ic name="gem" />
            <span className="sf-materials__num">{c.materials.toLocaleString()}</span>
          </div>
          <span className="sf-materials__cap">Materials</span>
        </div>
      </section>
    );
  }

  /* --------------------------- Conditions rail -------------------------- */
  function ConditionsRail({ conditions, onStep, onRoll }) {
    return (
      <div className="sf-conditions">
        {conditions.map((cd) => (
          <div key={cd.id} className={"sf-cond" + (cd.value >= 2 ? " is-active" : "")}>
            <div className="sf-cond__top">
              <span className="sf-cond__name">{cd.name}</span>
              <span className="sf-cond__pips">
                {Array.from({ length: cd.max }).map((_, i) => (
                  <span key={i} className={"sf-pip" + (i < cd.value ? " on" : "")}></span>
                ))}
              </span>
            </div>
            <div className="sf-cond__foot">
              <button className="sf-cond__resist sf-cond__roll" title={`Roll Resist ${cd.name} · 2d10 + ${cd.resist}`} onClick={(e) => onRoll(cd, e)}>
                <Ic name="dices" /> Resist <b>{cd.resist}</b>
              </button>
              <div className="sf-stepper">
                <button className="sf-step" onClick={() => onStep(cd.id, -1)}>−</button>
                <button className="sf-step" onClick={() => onStep(cd.id, 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ----------------------------- Stats ---------------------------------- */
  function StatCard({ fac, bonusFor, statBonusFor, onRoll, onImprove, collapsed, onToggleCollapse }) {
    const sbf = statBonusFor ? statBonusFor(fac.name) : 0;
    const effRank = fac.rank + sbf;
    const style = { "--fac-accent": TONE_500[fac.tone], "--fac-accent-fg": TONE_FG[fac.tone] };
    return (
      <div className={"sf-fac" + (collapsed ? " is-collapsed" : "")} style={style}>
        <div className="sf-fac__head" onClick={onToggleCollapse} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleCollapse && onToggleCollapse()} style={{ cursor: "pointer" }}>
          <span className="sf-fac__glyph"><Ic name={fac.icon} /></span>
          <span className="sf-fac__id">
            <span className="sf-fac__name">{fac.name}</span>
            <span className="sf-fac__formula">2d10 + {effRank}</span>
          </span>
          <span className="sf-fac__rank">
            <span className={"sf-fac__num" + (sbf ? " boosted" : "")}>{effRank}</span>
            <span className="sf-fac__rankcap">Rank</span>
          </span>
          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <Ic name={collapsed ? "chevron-down" : "chevron-up"} />
          </span>
        </div>
        {!collapsed && <div className="sf-fac__skills">
          {fac.skills.map((sk) => {
            const bonus = bonusFor(sk.id);
            const total = effRank + sk.rank + bonus;
            return (
              <div key={sk.id} className="sf-skill">
                <span className="sf-skill__name">
                  <span>{sk.name}</span>
                  <span className="sf-skill__sub">
                    <span className="sf-skill__stat"><b>{fac.name}</b> {effRank}</span>
                    {bonus ? <span className={"sf-skill__bonus " + (bonus > 0 ? "pos" : "neg")}>{bonus > 0 ? "+" : "\u2212"}{Math.abs(bonus)}</span> : null}
                  </span>
                </span>
                <span className="sf-skill__rank" title={`Trained rank: ${sk.rank}`}>
                  <span className="sf-skill__rankn">{sk.rank}</span>
                  <span className="sf-skill__caplbl">Rank</span>
                </span>
                <span className={"sf-skill__total" + (bonus > 0 ? " boosted" : "")} title={`Roll modifier: 2d10 + ${total}`}>
                  <span className="sf-skill__totaln">+{total}</span>
                  <span className="sf-skill__caplbl">Roll</span>
                </span>
                <button className="sf-skill__roll" title={`Roll ${sk.name} · 2d10 + ${total}`} onClick={(e) => onRoll(fac, sk, total, e)}><Ic name="dices" /></button>
                <button className="sf-skill__improve" title={`Improvement roll · 2d10 + ${fac.name} ${fac.rank} vs DC ${10 + sk.rank}`} onClick={(e) => onImprove(fac, sk, e)}><Ic name="trending-up" /></button>
              </div>
            );
          })}
        </div>}
      </div>
    );
  }

  /* --------------------------- Side rail -------------------------------- */
  function MoveCard({ m, onRoll, modFor, open, onToggle }) {
    const broken = m.artifactCondition === "broken";
    const damaged = m.artifactCondition === "damaged";
    const opts = (m.rollOptions && m.rollOptions.length) ? m.rollOptions : null;
    const [sel, setSel] = React.useState(0);
    const i = opts ? Math.min(sel, opts.length - 1) : 0;
    const cur = opts ? opts[i] : { stat: m.stat, skill: m.skill, label: m.skill, kind: "skill" };
    const abilLabel = cur.kind === "subject" ? cur.label : (cur.skill || cur.label);
    const showAbil = abilLabel && abilLabel !== "\u2014";
    return (
      <div className={"sf-move" + (open ? " is-open" : " is-collapsed") + (m.fromArtifact ? " is-linked" : "") + (m.fromClass ? " is-classmove" : "") + (broken ? " is-broken" : "")}>
        <div className="sf-move__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-move__name">{m.name}</span>
          {showAbil ? <span className="sf-chip sf-chip--field sf-chip--head"><Ic name={cur.kind === "subject" ? "sparkles" : "zap"} /> {abilLabel}</span> : null}
          {m.dc != null ? <span className="sf-spell__head-dc">DC {m.dc}</span> : null}
          <Badge tone={broken ? "crimson" : damaged ? "neutral" : "gold"} square>{m.fromArtifact ? (broken ? "Broken" : damaged ? "Damaged" : "Artifact") : m.tag}</Badge>
          {broken ? null : (
            <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onRoll(m, e, i); }}><Ic name="dices" /> Roll</button>
          )}
          <span className="sf-spell__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>

        {open && (
          <React.Fragment>
            {opts && opts.length > 1 ? (
              <div className="sf-move__rollas">
                <span className="sf-move__rollas-lbl">Roll with</span>
                <div className="sf-move__opts">
                  {opts.map((o, idx) => (
                    <button key={idx} type="button" className={"sf-move__opt" + (idx === i ? " is-on" : "")} onClick={() => setSel(idx)}>{o.label}</button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="sf-move__chips">
              <span className="sf-chip"><b>Stat</b> {cur.stat}</span>
              <span className="sf-chip"><b>{cur.kind === "subject" ? "Subject" : "Skill"}</b> {abilLabel}</span>
              {m.fromClass && m.addRank ? <span className="sf-chip sf-chip--rank"><b>+ {m.classLabel}</b> rank</span>
                : m.fromClass && m.rankConditional ? <span className="sf-chip sf-chip--rank"><b>+ {m.classLabel}</b> rank · if…</span>
                : <span className="sf-chip"><b>Bonus</b> +{m.bonus || 0}</span>}
              {m.backfire ? <span className="sf-chip sf-chip--backfire"><Ic name="flame" /> Backfire</span> : null}
            </div>

            <p className="sf-move__desc">{m.desc}</p>
            {m.fromClass && m.rankConditional ? (
              <p className="sf-move__cond"><Ic name="info" /> Adds your {m.classLabel} rank when: {m.rankConditional}</p>
            ) : null}
            <div className="sf-move__foot">
              <span className="sf-move__formula">2d10 + {modFor(m, i)}{m.dc != null ? <span className="sf-move__dc"> · DC {m.dc}</span> : null}</span>
              {broken ? (
                <span className="sf-move__locked"><Ic name="ban" /> Artifact broken</span>
              ) : (
                <button className="sf-roll-btn" onClick={(e) => onRoll(m, e, i)}><Ic name="dices" /> Roll</button>
              )}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  function MovesRail({ moves, onRoll, modFor, onAddManually }) {
    const [openIds, setOpenIds] = React.useState(() => new Set());
    const allOpen = moves.length > 0 && openIds.size === moves.length;
    const toggleAll = () => {
      if (allOpen) setOpenIds(new Set());
      else setOpenIds(new Set(moves.map((m) => m.id)));
    };
    const toggleOne = (id) => setOpenIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
    return (
      <div className="sf-col" style={{ gap: "var(--space-3)" }}>
        <div className="sf-rail-head">
          <h3>Moves</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {moves.length > 0 && (
              <button className="sf-ghost-btn" onClick={toggleAll}>
                <Ic name={allOpen ? "chevrons-up" : "chevrons-down"} />
                {allOpen ? "Collapse" : "Expand"}
              </button>
            )}
            <IconButton label="Add move" variant="ghost" size="sm" onClick={onAddManually}><Ic name="plus" /></IconButton>
          </div>
        </div>
        {moves.map((m) => <MoveCard key={m.id} m={m} onRoll={onRoll} modFor={modFor} open={openIds.has(m.id)} onToggle={() => toggleOne(m.id)} />)}
      </div>
    );
  }

  function BonusLedger({ bonuses, resolveValue, onToggle, onToggleConditional, onCondNote, onAdd, onEdit }) {
    const B = window.SF_BONUS;
    return (
      <div className="sf-col" style={{ gap: "var(--space-3)" }}>
        <div className="sf-rail-head">
          <h3>Bonuses</h3>
          <IconButton label="Add bonus" variant="ghost" size="sm" onClick={onAdd}><Ic name="plus" /></IconButton>
        </div>
        <div className="sf-ledger" style={{ padding: 0, gap: "var(--space-2)" }}>
          {bonuses.map((b) => {
            const v = resolveValue ? resolveValue(b) : (b.value || 0);
            const isClass = b.valueMode === "class";
            const isDos   = b.valueMode === "dos";
            const typeName = B ? B.typeLabel(b.type) : b.type;
            return (
            <div key={b.id} className={"sf-bonus" + (b.active ? "" : " off") + (b.conditional ? " cond" : "")}>
              <span className="sf-bonus__src">{b.source || "Untitled bonus"}</span>
              <span className={"sf-bonus__val " + (v >= 0 ? "pos" : "neg") + (isClass ? " is-class" : "") + (isDos ? " is-dos" : "")}>
                <span>{v >= 0 ? "+" : "\u2212"}{Math.abs(v)}</span>
                {isClass ? <span className="sf-bonus__valtag">{b.classLabel || "Class"} rank</span> : null}
                {isDos    ? <span className="sf-bonus__valtag">tier</span> : null}
              </span>
              <div className="sf-bonus__target">
                <span className="sf-bonus__type">{typeName}</span>
                {b.targetLabel ? <span className="sf-bonus__chip">{b.targetLabel}</span> : null}
                <button
                  type="button"
                  className={"sf-bonus__cond" + (b.conditional ? " is-on" : "")}
                  onClick={() => onToggleConditional && onToggleConditional(b.id)}
                  aria-pressed={!!b.conditional}
                  title={b.conditional ? "Conditional — offered as a choice on matching rolls" : "Mark conditional — offer this bonus per roll instead of applying it live"}
                >
                  <span className="sf-bonus__condbox"><Ic name="check" /></span>
                  Conditional
                </button>
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <button type="button" className="sf-bonus__edit" title="Edit bonus" onClick={() => onEdit && onEdit(b)}><Ic name="pencil" /></button>
                  <Switch checked={b.active} onChange={() => onToggle(b.id)} />
                </span>
              </div>
              {b.conditional && (
                <input
                  className="sf-bonus__note"
                  type="text"
                  value={b.condNote || ""}
                  placeholder="Describe the condition — e.g. when you take 10 minutes…"
                  onChange={(e) => onCondNote && onCondNote(b.id, e.target.value)}
                />
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* --------------------------- Compendium ------------------------------- */
  // Level → house colour (use shared constant)
  const levelTone = SHARED.levelTone;
  const COMP_LEVEL_ORDER = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4, twisted: 4 };
  const compLevelRank = (v) => {
    if (!v) return 99;
    const f = String(v).trim().toLowerCase().split(/\s+/)[0];
    return COMP_LEVEL_ORDER[f] != null ? COMP_LEVEL_ORDER[f] : 50;
  };
  // Sort fields available per category — key · label · comparator type.
  const COMP_SORT_FIELDS = {
    spell:    [["name", "Name", "text"], ["subject", "Subject", "text"], ["stat", "Stat", "text"], ["level", "Level", "level"], ["dc", "DC", "num"]],
    move:     [["name", "Name", "text"], ["level", "Tier", "text"]],
    artifact: [["name", "Name", "text"], ["subject", "Subject", "text"], ["level", "Level", "level"], ["intensity", "Intensity", "num"]],
    potion:   [["name", "Name", "text"], ["cost", "Cost", "num"], ["intensity", "Intensity", "num"]],
    wand:     [["name", "Name", "text"]],
    glyph:    [["name", "Name", "text"], ["value", "Cost", "num"], ["intensity", "Intensity", "num"]],
    item:     [["name", "Name", "text"]],
    plant:    [["name", "Name", "text"], ["value", "Value", "num"], ["intensity", "Intensity", "num"]],
  };
  // Filter controls per category — mirrors the standalone archive's per-volume forms.
  //   select : dropdown over the distinct values of `key`
  //   level  : the fixed magic-level dropdown (`levels` sets the top end Hex/Twisted)
  //   range  : dual-thumb min/max slider over numeric `key`
  //   radio  : Any / Yes / No pills over a boolean `key`
  const COMP_FILTERS = {
    spell:    [{ kind: "select", key: "subject", label: "Subject" }, { kind: "select", key: "stat", label: "Stat" }, { kind: "level", levels: ["Basic", "Standard", "Advanced", "Legendary", "Hex"] }, { kind: "range", key: "dc", label: "DC" }, { kind: "radio", key: "ritual", label: "Ritual" }],
    artifact: [{ kind: "select", key: "subject", label: "Subject" }, { kind: "level", levels: ["Basic", "Standard", "Advanced", "Legendary", "Twisted"] }, { kind: "range", key: "intensity", label: "Intensity" }],
    potion:   [{ kind: "range", key: "cost", label: "Cost" }, { kind: "range", key: "intensity", label: "Intensity" }],
    glyph:    [{ kind: "range", key: "value", label: "Cost" }, { kind: "range", key: "intensity", label: "Intensity" }],
    plant:    [{ kind: "range", key: "value", label: "Value" }, { kind: "range", key: "intensity", label: "Intensity" }, { kind: "radio", key: "removeOnUse", label: "Single-use" }],
    move:     [],
    wand:     [],
    item:     [],
  };
  const compClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Dual-thumb min/max slider (null bound = unconstrained), ported from the archive.
  function DualRange({ label, max, step, value, onChange }) {
    const a = value[0], b = value[1];
    const lo = a == null ? 0 : a;
    const hi = b == null ? max : b;
    return (
      <div className="sf-filter-group">
        <label>{label}</label>
        <div className="sf-range-nums">
          <input type="number" className="sf-range-num" placeholder="MIN" min="0" max={max} step={step}
            value={a == null ? "" : a}
            onChange={(e) => { const raw = e.target.value; const v = raw === "" ? null : compClamp(parseFloat(raw) || 0, 0, max); onChange([v == null ? null : Math.min(v, hi), b]); }} />
          <span>–</span>
          <input type="number" className="sf-range-num" placeholder="MAX" min="0" max={max} step={step}
            value={b == null ? "" : b}
            onChange={(e) => { const raw = e.target.value; const v = raw === "" ? null : compClamp(parseFloat(raw) || 0, 0, max); onChange([a, v == null ? null : Math.max(v, lo)]); }} />
        </div>
        <div className="sf-dual">
          <div className="sf-dual__rail"></div>
          <div className="sf-dual__fill" style={{ left: (lo / max * 100) + "%", right: (100 - hi / max * 100) + "%" }}></div>
          <input type="range" className="sf-dual__thumb sf-dual__thumb--min" min="0" max={max} step={step} value={lo} aria-label={label + " minimum"}
            onChange={(e) => { const v = Math.min(parseFloat(e.target.value), hi); onChange([v <= 0 ? null : v, b]); }} />
          <input type="range" className="sf-dual__thumb sf-dual__thumb--max" min="0" max={max} step={step} value={hi} aria-label={label + " maximum"}
            onChange={(e) => { const v = Math.max(parseFloat(e.target.value), lo); onChange([a, v >= max ? null : v]); }} />
        </div>
      </div>
    );
  }

  const learnDaysFor = (level) => {
    const l = (level || "").toLowerCase();
    if (l.startsWith("basic")) return 1;
    if (l.startsWith("standard")) return 2;
    if (l.startsWith("advanced")) return 5;
    return 10;
  };

  function Compendium({ open, onClose, data, addedIds, onAdd, onAddAttuned, onAddLearning, onAddPotionSheaf, onAddPotionRecipe, onAddWandCraft, potionSheafCount, potionCap, potionRecipes, lastAdded, cultivationCap = 0, plantSum = 0, attuneFull, cat, setCat, width }) {
    const buildInitFilters = (catId) => {
      const o = {};
      (COMP_FILTERS[catId] || []).forEach((f) => {
        if (f.kind === "range") o[f.key] = [null, null];
        else if (f.kind === "level") o.level = "any";
        else o[f.key] = "any";
      });
      return o;
    };
    const [q, setQ] = React.useState("");
    const [sortOpen, setSortOpen] = React.useState(false);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const [sort, setSort] = React.useState({ field: "name", dir: "asc" });
    const [filters, setFilters] = React.useState(() => buildInitFilters(cat));
    const [openIds, setOpenIds] = React.useState({});
    const sortRef = React.useRef(null);
    const filterRef = React.useRef(null);

    const catLabel = (id) => (data.compendiumCats.find((c) => c.id === id) || {}).label || id;
    const sortFields = COMP_SORT_FIELDS[cat] || COMP_SORT_FIELDS.spell;
    const filterCfg = COMP_FILTERS[cat] || [];

    // Reset sort/filters whenever the category changes — each volume filters differently.
    React.useEffect(() => {
      setSort({ field: "name", dir: "asc" });
      setFilters(buildInitFilters(cat));
      setSortOpen(false); setFilterOpen(false);
    }, [cat]);

    // Close popovers on outside-click.
    React.useEffect(() => {
      if (!sortOpen && !filterOpen) return;
      const onDoc = (e) => {
        if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
        if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [sortOpen, filterOpen]);

    const inCat = data.compendium.filter((e) => e.cat === cat);
    const uniq = (arr) => [...new Set(arr.filter((v) => v != null && v !== ""))];
    const selectOptions = (key) => uniq(inCat.map((e) => e[key]));
    const rangeMeta = (key) => {
      let m = 0;
      inCat.forEach((e) => { const v = parseFloat(e[key]); if (!isNaN(v) && v > m) m = v; });
      const step = key === "cost" ? 10 : 1;
      const max = key === "cost" ? Math.max(step, Math.ceil(m / step) * step) : Math.max(1, Math.ceil(m));
      return { max, step };
    };
    const facetCount = filterCfg.reduce((n, f) => {
      if (f.kind === "range") { const r = filters[f.key] || [null, null]; return n + (r[0] != null || r[1] != null ? 1 : 0); }
      const k = f.kind === "level" ? "level" : f.key;
      return n + (filters[k] && filters[k] !== "any" ? 1 : 0);
    }, 0);

    // Filter → search → sort.
    let items = inCat.filter((e) => {
      for (const f of filterCfg) {
        if (f.kind === "select") { const v = filters[f.key]; if (v && v !== "any" && e[f.key] !== v) return false; }
        else if (f.kind === "level") { const v = filters.level; if (v && v !== "any" && e.level !== v) return false; }
        else if (f.kind === "radio") { const v = filters[f.key]; if (v && v !== "any") { const want = v === "yes"; if (!!e[f.key] !== want) return false; } }
        else if (f.kind === "range") { const r = filters[f.key] || [null, null]; const val = parseFloat(e[f.key]); if (r[0] != null && (isNaN(val) || val < r[0])) return false; if (r[1] != null && (isNaN(val) || val > r[1])) return false; }
      }
      if (q) { const hay = (e.name + " " + e.meta.join(" ") + " " + e.desc + " " + (e.ability || "")).toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
      return true;
    });
    const sign = sort.dir === "asc" ? 1 : -1;
    const type = (sortFields.find((f) => f[0] === sort.field) || [])[2] || "text";
    items = items.slice().sort((a, b) => {
      let r;
      if (type === "num") { const av = parseFloat(a[sort.field]), bv = parseFloat(b[sort.field]); const am = isNaN(av), bm = isNaN(bv); if (am || bm) r = am && bm ? 0 : am ? 1 : -1; else r = av - bv; }
      else if (type === "level") r = compLevelRank(a[sort.field]) - compLevelRank(b[sort.field]);
      else r = String(a[sort.field] || "").toLowerCase().localeCompare(String(b[sort.field] || "").toLowerCase());
      if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
      return r * sign;
    });

    const pickSort = (field) => setSort((s) => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
    const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
    const resetFilters = () => setFilters(buildInitFilters(cat));
    const toggleEntry = (id) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));
    const sortLabel = (sortFields.find((f) => f[0] === sort.field) || sortFields[0])[1];

    // Facts shown in an expanded entry.
    const factsFor = (e) => {
      const f = [];
      if (e.subject) f.push(["Field", e.subject]);
      if (e.bonusLabel) f.push(["Grants", e.bonusLabel]);
      if (e.condition) f.push(["Condition", e.condition]);
      if (e.stat) f.push(["Base", e.stat]);
      if (e.ap != null) f.push(["AP", e.ap]);
      if (e.dc != null) f.push(["DC", e.dc]);
      if (e.intensity != null) f.push(["Intensity", e.intensity]);
      if (e.value != null) f.push(["Value", e.value]);
      if (e.cost) f.push(["Cost", e.cost]);
      if (e.cat === "plant" && e.removeOnUse != null) f.push(["Single-use", e.removeOnUse ? "Yes" : "No"]);
      if (e.cat === "plant" && e.requiresRoll) f.push(["On use", SHARED.PLANT_ROLL_LABEL[SHARED.parsePlantRoll(e.requiresRoll).mode]]);
      if (e.ritual) f.push(["Ritual", "Yes"]);
      return f;
    };

    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-drawer" + (open ? " open" : "")} role="dialog" aria-label="Compendium" style={width ? { "--drawer-w": width + "px" } : null}>
          <div className="sf-drawer__head">
            <span className="sf-fac__glyph" style={{ "--fac-accent": "var(--gold-500)", "--fac-accent-fg": "var(--gold-300)", background: "var(--brand-subtle)", color: "var(--gold-200)" }}>
              <Ic name="library-big" />
            </span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">The Archive</span>
              <h2>Compendium</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>

          <div className="sf-drawer__search">
            <Ic name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the archive…" />
            {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Ic name="x" /></button> : null}
          </div>

          <div className="sf-cats" role="tablist">
            {data.compendiumCats.map((c) => (
              <button key={c.id} role="tab" aria-selected={cat === c.id} className={"sf-cat" + (cat === c.id ? " is-active" : "")} onClick={() => setCat(c.id)}>
                <Ic name={c.icon} /> {c.label}
              </button>
            ))}
          </div>

          <div className="sf-comp-toolbar">
            <span className="sf-comp-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
            <div className="sf-comp-controls">
              <div className="sf-pop" ref={filterRef}>
                <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} disabled={!filterCfg.length} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filters">
                  <Ic name="sliders-horizontal" /><span>Filters</span>{facetCount ? <span className="sf-tool-dot"></span> : null}
                </button>
                <div className={"sf-menu sf-filter-menu" + (filterOpen ? " show" : "")} role="dialog" aria-label="Filter options">
                  <div className="sf-menu__head">Refine {catLabel(cat)}</div>
                  {filterCfg.map((f, i) => {
                    if (f.kind === "select") {
                      const opts = selectOptions(f.key);
                      if (!opts.length) return null;
                      return (
                        <div key={i} className="sf-filter-group">
                          <label>{f.label}</label>
                          <Select options={[{ value: "any", label: "Any" }].concat(opts.map((s) => ({ value: s, label: s })))} value={filters[f.key] || "any"} onChange={(e) => setF(f.key, e.target.value)} />
                        </div>
                      );
                    }
                    if (f.kind === "level") {
                      return (
                        <div key={i} className="sf-filter-group">
                          <label>Level</label>
                          <Select options={[{ value: "any", label: "Any" }].concat(f.levels.map((s) => ({ value: s, label: s })))} value={filters.level || "any"} onChange={(e) => setF("level", e.target.value)} />
                        </div>
                      );
                    }
                    if (f.kind === "range") {
                      const { max, step } = rangeMeta(f.key);
                      return <DualRange key={i} label={f.label} max={max} step={step} value={filters[f.key] || [null, null]} onChange={(v) => setF(f.key, v)} />;
                    }
                    if (f.kind === "radio") {
                      return (
                        <div key={i} className="sf-filter-group">
                          <label>{f.label}</label>
                          <div className="sf-filter-radios">
                            {[["any", "Any"], ["yes", "Yes"], ["no", "No"]].map(([v, l]) => (
                              <label key={v} className={"sf-filter-radio" + ((filters[f.key] || "any") === v ? " on" : "")}>
                                <input type="radio" name={"f-" + f.key} checked={(filters[f.key] || "any") === v} onChange={() => setF(f.key, v)} />{l}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                  <button className="sf-filter-reset" onClick={resetFilters} disabled={!facetCount}>Clear filters</button>
                </div>
              </div>

              <div className="sf-pop" ref={sortRef}>
                <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort entries">
                  <Ic name="arrow-up-down" /><span className="sf-tool-btn__label">Sort</span><span className="sf-tool-sep">·</span><span className="sf-tool-cur">{sortLabel}</span>
                </button>
                <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
                  <div className="sf-menu__head">Order by</div>
                  {sortFields.map(([key, label]) => (
                    <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => pickSort(key)}>
                      <span>{label}</span>
                      <span className="sf-sort-opt__dir">{sort.field === key ? <Ic name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} /> : null}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="sf-comp-list">
            {items.length === 0 ? (
              <div className="sf-comp-empty">
                <Ic name="search-x" />
                <p>No entries match — try another wing of the archive.</p>
                {(facetCount || q) ? <button className="sf-filter-reset" onClick={() => { resetFilters(); setQ(""); }}>Clear filters</button> : null}
              </div>
            ) : items.map((e) => {
              const added = e.cat !== "plant" && addedIds.includes(e.id);
              const isOpen = !!openIds[e.id];
              const facts = factsFor(e);
              const tone = levelTone(e.level);
              const inRecipes = e.cat === "potion" && !!(potionRecipes || []).find((r) => r.name === e.name);
              const sheafFull = potionSheafCount >= potionCap;
              return (
                <div key={e.id} className={"sf-entry" + (isOpen ? " is-open" : "") + (tone ? "" : " is-neutral")} style={{ "--ent-accent": tone ? TONE_500[tone] : "var(--ink-500)" }}>
                  <div className="sf-entry__head" onClick={() => toggleEntry(e.id)}>
                    <div className="sf-entry__headline">
                      <span className="sf-entry__name">{e.name}</span>
                      <div className="sf-entry__meta">
                        <Badge tone={tone || "neutral"} dot>{e.level}</Badge>
                        {e.meta.length ? <span className="sf-entry__metatxt">{e.meta.join(" · ")}</span> : null}
                      </div>
                    </div>
                    <div className="sf-entry__actions">
                      {cat === "potion" ? (
                        <>
                          <button className="sf-entry__add" disabled={inRecipes} onClick={(ev) => { ev.stopPropagation(); onAddPotionRecipe(e.id); }} title={inRecipes ? "Already in recipes" : "Add to Recipes"} aria-label="Add to Recipes"><Ic name="scroll" /></button>
                          <button className="sf-entry__add" disabled={sheafFull} onClick={(ev) => { ev.stopPropagation(); onAddPotionSheaf(e.id); }} title={sheafFull ? "Sheaf is full" : "Add to Potion Sheaf"} aria-label="Add to Potion Sheaf"><Ic name="flask-conical" /></button>
                        </>
                      ) : cat === "wand" ? (
                        <>
                          <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddWandCraft(e.id); }} title="Begin crafting" aria-label="Begin crafting"><Ic name="hammer" /></button>
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Ic name="check" /></button>
                          ) : (
                            <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={"Add " + e.name + " to sheet"} title="Add to sheet"><Ic name="plus" /></button>
                          )}
                        </>
                      ) : cat === "artifact" ? (
                        <>
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Ic name="check" /></button>
                          ) : (
                            <>
                              <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddAttuned(e.id); }} disabled={attuneFull} aria-label={"Add " + e.name + " attuned"} title="Add attuned"><Ic name="heart-plus" /></button>
                              <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={"Add " + e.name + " to sheet"} title="Add to sheet"><Ic name="plus" /></button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {cat === "spell" && !added && (
                            <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddLearning(e.id); }} aria-label={"Add learning materials for " + e.name} title={"Add learning materials (" + learnDaysFor(e.level) + " days)"}><Ic name="book-open" /></button>
                          )}
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Ic name="check" /></button>
                          ) : (() => { const overCap = e.cat === "plant" && cultivationCap > 0 && (plantSum + (e.value || 0)) > cultivationCap; return <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={overCap ? "Exceeds cultivation capacity" : "Add " + e.name + " to sheet"} title={overCap ? "Exceeds cultivation capacity (" + plantSum + "/" + cultivationCap + ")" : "Add to sheet"} disabled={overCap}><Ic name="plus" /></button>; })()}
                        </>
                      )}
                      <span className="sf-entry__chev"><Ic name="chevron-down" /></span>
                    </div>
                  </div>
                  <div className="sf-entry__body" hidden={!isOpen}>
                    <div className="sf-entry__rule"></div>
                    {facts.length ? (
                      <div className="sf-entry__facts">
                        {facts.map(([k, v]) => <div key={k} className="sf-fact"><span className="sf-fact__k">{k}</span><span className="sf-fact__v">{v}</span></div>)}
                      </div>
                    ) : null}
                    <p className="sf-entry__desc">{e.desc}</p>
                    {e.ability ? (
                      <div className="sf-entry__ability">
                        <span className="sf-entry__ability-lbl"><Ic name="sparkles" /> Ability</span>
                        <p className="sf-entry__ability-text">{e.ability}</p>
                      </div>
                    ) : null}
                    <div className="sf-entry__foot">
                      <span className="sf-entry__cost">{e.cat === "spell" ? "" : (e.cost || "")}</span>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        {e.cat === "potion" ? (
                          <>
                            <Button variant="secondary" size="sm" iconLeft={<Ic name="scroll" />} disabled={inRecipes} onClick={() => onAddPotionRecipe(e.id)}>{inRecipes ? "In recipes" : "Add to Recipes"}</Button>
                            <Button variant="primary" size="sm" iconLeft={<Ic name="flask-conical" />} disabled={sheafFull} onClick={() => onAddPotionSheaf(e.id)}>{sheafFull ? "Sheaf full" : "Add to Sheaf"}</Button>
                          </>
                        ) : e.cat === "wand" ? (
                          <>
                            <Button variant="secondary" size="sm" iconLeft={<Ic name="hammer" />} onClick={() => onAddWandCraft(e.id)}>Begin crafting</Button>
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Ic name="check" />} disabled>Added</Button>
                            ) : (
                              <Button variant="primary" size="sm" iconLeft={<Ic name="plus" />} onClick={() => onAdd(e.id)}>Add to sheet</Button>
                            )}
                          </>
                        ) : e.cat === "artifact" ? (
                          <>
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Ic name="check" />} disabled>Added</Button>
                            ) : (
                              <>
                                <Button variant="secondary" size="sm" iconLeft={<Ic name="heart-plus" />} disabled={attuneFull} onClick={() => onAddAttuned(e.id)}>Add attuned</Button>
                                <Button variant="primary" size="sm" iconLeft={<Ic name="plus" />} onClick={() => onAdd(e.id)}>Add to sheet</Button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {e.cat === "spell" && !added && (
                              <Button variant="secondary" size="sm" iconLeft={<Ic name="book-open" />} onClick={() => onAddLearning(e.id)}>Add learning materials</Button>
                            )}
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Ic name="check" />} disabled>Added</Button>
                            ) : (() => { const overCap = e.cat === "plant" && cultivationCap > 0 && (plantSum + (e.value || 0)) > cultivationCap; return <Button variant="primary" size="sm" iconLeft={<Ic name="plus" />} disabled={overCap} onClick={() => onAdd(e.id)} title={overCap ? "Exceeds cultivation capacity (" + plantSum + "/" + cultivationCap + ")" : undefined}>{overCap ? "Over capacity" : "Add to sheet"}</Button>; })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={"sf-toast" + (lastAdded ? " show" : "")}>
            {lastAdded && (
              <SA.Banner tone="success" icon={<Ic name="check-circle" />} title="Added to your sheet">
                {lastAdded} now appears under its section.
              </SA.Banner>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ----------------------------- Magic: schools ------------------------- */
  function SchoolCard({ school, facByName, subjectBonusFor, statBonusFor, onRoll, onImprove, collapsed, onToggleCollapse }) {
    const style = { "--fac-accent": TONE_500[school.tone], "--fac-accent-fg": TONE_FG[school.tone] };
    const best = Math.max(...school.subjects.map((s) => (facByName(s.stat) ? facByName(s.stat).rank : 0) + s.rank));
    return (
      <div className={"sf-fac sf-school" + (collapsed ? " is-collapsed" : "")} style={style}>
        <div className="sf-fac__head" onClick={onToggleCollapse} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleCollapse && onToggleCollapse()} style={{ cursor: "pointer" }}>
          <span className="sf-fac__glyph"><Ic name={school.icon} /></span>
          <span className="sf-fac__id">
            <span className="sf-fac__name">{school.name}</span>
            <span className="sf-school__blurb">{school.blurb}</span>
          </span>
          <span className="sf-fac__rank">
            <span className="sf-fac__num">{best}</span>
            <span className="sf-fac__rankcap">Best</span>
          </span>
          <span style={{ marginLeft: "var(--space-2)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <Ic name={collapsed ? "chevron-down" : "chevron-up"} />
          </span>
        </div>
        {!collapsed && <div className="sf-fac__skills">
          {school.subjects.map((sub) => {
            const statFac = facByName(sub.stat);
            const facRank = (statFac ? statFac.rank : 0) + (statBonusFor ? statBonusFor(sub.stat) : 0);
            const statFg = statFac && TONE_FG[statFac.tone] ? TONE_FG[statFac.tone] : "var(--gold-200)";
            const bonus = subjectBonusFor(sub.key);
            const total = facRank + sub.rank + bonus;
            const untrained = sub.rank === 0 && bonus === 0;
            return (
              <div key={sub.key} className={"sf-skill sf-subject" + (untrained ? " is-untrained" : "")}>
                <span className="sf-skill__name">
                  <span>{sub.name}</span>
                  <span className="sf-skill__sub">
                    <span className="sf-skill__stat"><b style={{ color: statFg }}>{sub.stat}</b> {facRank}</span>
                    {bonus ? <span className={"sf-skill__bonus " + (bonus > 0 ? "pos" : "neg")}>{bonus > 0 ? "+" : "\u2212"}{Math.abs(bonus)}</span> : null}
                  </span>
                </span>
                <span className="sf-skill__rank" title={`Trained rank: ${sub.rank}`}>
                  <span className="sf-skill__rankn">{sub.rank}</span>
                  <span className="sf-skill__caplbl">Rank</span>
                </span>
                <span className={"sf-skill__total" + (bonus > 0 ? " boosted" : "")} title={`Roll modifier: 2d10 + ${total}`}>
                  <span className="sf-skill__totaln">+{total}</span>
                  <span className="sf-skill__caplbl">Roll</span>
                </span>
                <button className="sf-skill__roll" title={`Roll ${sub.name} · 2d10 + ${total}`} onClick={(e) => onRoll(school, sub, total, e)}><Ic name="dices" /></button>
                <button className="sf-skill__improve" title={`Improvement roll · 2d10 + ${sub.stat} ${facRank} vs DC ${10 + sub.rank}`} onClick={(e) => onImprove(school, sub, e)}><Ic name="trending-up" /></button>
              </div>
            );
          })}
        </div>}
      </div>
    );
  }
  // Replaces the old binary on-hit/on-miss line. Spells resolve by DEGREES OF
  // SUCCESS; the strip dials the degree (1–5) and reads the computed outcome,
  // with a trailing "…" that reveals the raw scaling rule for any degree beyond.
  function SpellHLB({ text }) {
    const valid = !SHARED.hlbIsNA(text);
    const [sel, setSel] = React.useState(1);   // a degree number, or "raw"
    if (!valid) return null;
    const DEGS = 5;
    const raw = sel === "raw";
    const segs = raw ? null : (SHARED.hlbSegments(text, sel) || []);
    return (
      <div className="sf-hlb">
        <div className="sf-hlb__head">
          <span className="sf-hlb__label"><Ic name="trending-up" /> Higher-level behavior</span>
          <div className="sf-hlb__deg" role="group" aria-label="Degrees of success">
            {Array.from({ length: DEGS }).map((_, i) => (
              <button key={i} type="button" className={"sf-hlb__pip" + (sel === i + 1 ? " is-on" : "")}
                onClick={() => setSel(i + 1)}
                title={(i + 1) + " degree" + (i + 1 > 1 ? "s" : "") + " of success"}>
                {i + 1}
              </button>
            ))}
            <button type="button" className={"sf-hlb__pip sf-hlb__pip--raw" + (raw ? " is-on" : "")}
              onClick={() => setSel("raw")} title="Raw scaling rule (per degree of success)">…</button>
          </div>
        </div>
        <p className={"sf-hlb__body" + (raw ? " is-raw" : "")}>
          {raw ? text : segs.map((s, i) => s.t === "val"
            ? <b key={i} className="sf-hlb__v">{s.v}</b>
            : <React.Fragment key={i}>{s.v}</React.Fragment>)}
        </p>
      </div>
    );
  }

  /* ----------------------------- Magic: spells -------------------------- */
  function SpellCard({ spell, mod, schoolTone, onRoll, onRemove, onLearn, onSetDays, open, onToggle, onEdit }) {
    const learned = !spell.days || spell.days <= 0;
    const lf = String(spell.level || "").trim().toLowerCase();
    const isHex = lf.startsWith("hex") || lf === "twisted";
    const backfire = isHex ? "always" : (lf === "standard" || lf === "advanced" || lf === "legendary") ? "one" : null;
    // AP is only surfaced for a Hex (where it is explicit); for ordinary spells
    // it follows the level and is left off the card.
    const apHex = isHex ? (spell.ap != null ? spell.ap : (String(spell.level).match(/(\d+)\s*ap/i) || [])[1]) : null;
    const style = { "--ent-accent": TONE_500[schoolTone || "plum"] };
    return (
      <div className={"sf-spell" + (open ? " is-open" : " is-collapsed") + (learned ? "" : " is-unlearned") + (backfire === "always" ? " is-hex" : "")} style={style}>
        <div className="sf-spell__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-spell__name">{spell.name}</span>
          <span className="sf-chip sf-chip--field sf-chip--head"><Ic name="sparkles" /> {spell.subject}</span>
          <Badge tone={levelTone(spell.level) || "gold"} square>{String(spell.level).replace(/\s*\(.*?\)\s*/g, "").trim()}</Badge>
          {spell.dc != null ? <span className="sf-spell__head-dc">DC {spell.dc}</span> : null}
          {learned ? (
            <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onRoll(spell, e); }}><Ic name="dices" /> Cast</button>
          ) : (
            <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onLearn(spell, e); }}><Ic name="book-open" /> Learn</button>
          )}
          {onEdit && <button className="sf-spell__edit" title="Edit spell" onClick={(e) => { e.stopPropagation(); onEdit(spell); }}><Ic name="pencil" /></button>}
          <button className="sf-spell__remove" title="Remove spell" onClick={(e) => { e.stopPropagation(); onRemove(spell); }}><Ic name="x" /></button>
          <span className="sf-spell__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        {open && (
          <React.Fragment>
            <div className="sf-spell__meta">
              <span className="sf-chip"><b>Base</b> {spell.stat}</span>
              {apHex != null ? <span className="sf-chip sf-chip--ap"><b>AP</b> {apHex}</span> : null}
              {spell.ritual ? <span className="sf-chip sf-chip--ritual"><Ic name="scroll-text" /> Ritual</span> : null}
              {spell.volatile ? <span className="sf-chip sf-chip--volatile"><Ic name="flame" /> Volatile</span> : null}
            </div>
            <p className="sf-spell__desc">{spell.desc}</p>
            <SpellHLB text={spell.higherLevel} />
            <div className="sf-spell__foot">
              {learned ? (
                <React.Fragment>
                  <span className="sf-spell__formula">2d10 + {mod}{spell.dc != null ? <span className="sf-move__dc"> · DC {spell.dc}</span> : null}</span>
                  <button className="sf-roll-btn" onClick={(e) => onRoll(spell, e)}><Ic name="dices" /> Cast</button>
                </React.Fragment>
              ) : (
                <div className="sf-spell__learn-row">
                  <div className="sf-spell__stepper">
                    <button className="sf-spell__step-btn" onClick={() => onSetDays(spell, spell.days - 1)} title="Reduce days remaining"><Ic name="minus" /></button>
                    <span className="sf-spell__learning"><Ic name="hourglass" /> {spell.days} day{spell.days !== 1 ? "s" : ""} left</span>
                    <button className="sf-spell__step-btn" onClick={() => onSetDays(spell, spell.days + 1)} title="Increase days remaining"><Ic name="plus" /></button>
                  </div>
                  <button className="sf-roll-btn" onClick={(e) => onLearn(spell, e)}><Ic name="book-open" /> Learn</button>
                </div>
              )}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  /* -------------------- Magic: spell section (sort/filter) -------------- */
  const SPELL_SORT_FIELDS = [
    ["auto",    "Auto",    "auto"],
    ["name",    "Name",    "text"],
    ["subject", "Subject", "text"],
    ["stat",    "Stat",    "text"],
    ["level",   "Level",   "level"],
    ["dc",      "DC",      "num"],
  ];
  const SPELL_LEVEL_ORDER = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4, twisted: 4 };
  const spellLevelRank = (v) => {
    if (!v) return 99;
    const f = String(v).trim().toLowerCase().split(/\s+/)[0];
    return SPELL_LEVEL_ORDER[f] != null ? SPELL_LEVEL_ORDER[f] : 50;
  };
  const SPELL_LEVELS = ["Basic", "Standard", "Advanced", "Legendary", "Hex"];

  function SpellSection({ spells, spellMod, schoolToneOf, subjectModFor, onRoll, onRemove, onLearn, onSetDays, onAddManually, onBrowseCompendium, onEdit }) {
    const [openSpells, setOpenSpells] = React.useState(() => new Set());
    const [q, setQ]                   = React.useState("");
    const [sort, setSort]             = React.useState({ field: "auto", dir: "asc" });
    const [filters, setFilters]       = React.useState({ subject: "any", stat: "any", level: "any", dc: [null, null], ritual: "any", learned: "any" });
    const [sortOpen, setSortOpen]     = React.useState(false);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const sortRef   = React.useRef(null);
    const filterRef = React.useRef(null);

    const allOpen = spells.length > 0 && openSpells.size === spells.length;
    const toggleAll = () => {
      if (allOpen) setOpenSpells(new Set());
      else setOpenSpells(new Set(spells.map((sp) => sp.id)));
    };
    const toggleOne = (id) => setOpenSpells((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });

    // Close popovers on outside-click
    React.useEffect(() => {
      if (!sortOpen && !filterOpen) return;
      const onDoc = (e) => {
        if (sortRef.current   && !sortRef.current.contains(e.target))   setSortOpen(false);
        if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [sortOpen, filterOpen]);

    const uniq = (arr) => [...new Set(arr.filter((v) => v != null && v !== ""))].sort();
    const subjectOpts = uniq(spells.map((sp) => sp.subject));
    const statOpts    = uniq(spells.map((sp) => sp.stat));
    const dcVals      = spells.map((sp) => sp.dc).filter((v) => v != null && !isNaN(v));
    const dcMax       = dcVals.length ? Math.max(...dcVals) : 0;

    const facetCount = [
      filters.subject !== "any",
      filters.stat    !== "any",
      filters.level   !== "any",
      filters.dc[0] != null || filters.dc[1] != null,
      filters.ritual  !== "any",
      filters.learned !== "any",
    ].filter(Boolean).length;

    const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
    const resetFilters = () => setFilters({ subject: "any", stat: "any", level: "any", dc: [null, null], ritual: "any", learned: "any" });

    // Filter → search → sort
    let visible = spells.filter((sp) => {
      if (filters.subject !== "any" && sp.subject !== filters.subject) return false;
      if (filters.stat    !== "any" && sp.stat    !== filters.stat)    return false;
      if (filters.level   !== "any" && sp.level   !== filters.level)   return false;
      if (filters.ritual !== "any") { const want = filters.ritual === "yes"; if (!!sp.ritual !== want) return false; }
      if (filters.learned !== "any") {
        const isLearned = !sp.days || sp.days <= 0;
        if (isLearned !== (filters.learned === "yes")) return false;
      }
      if (filters.dc[0] != null || filters.dc[1] != null) {
        if (sp.dc == null) return false;
        if (filters.dc[0] != null && sp.dc < filters.dc[0]) return false;
        if (filters.dc[1] != null && sp.dc > filters.dc[1]) return false;
      }
      if (q) {
        const hay = (sp.name + " " + sp.subject + " " + sp.stat + " " + (sp.desc || "")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    const sign     = sort.dir === "asc" ? 1 : -1;
    const sortType = (SPELL_SORT_FIELDS.find((f) => f[0] === sort.field) || [])[2] || "text";
    visible = visible.slice().sort((a, b) => {
      // AUTO: best subject first → level → dc → name
      if (sortType === "auto") {
        const am = subjectModFor ? subjectModFor(a.subjectKey) : 0;
        const bm = subjectModFor ? subjectModFor(b.subjectKey) : 0;
        let r = bm - am; // descending: highest roll total first
        if (r === 0) r = spellLevelRank(a.level) - spellLevelRank(b.level);
        if (r === 0) { const ad = a.dc == null ? Infinity : a.dc, bd = b.dc == null ? Infinity : b.dc; r = ad - bd; }
        if (r === 0) r = String(a.name || "").toLowerCase().localeCompare(String(b.name || "").toLowerCase());
        return r;
      }
      let r;
      if (sortType === "num") {
        const av = parseFloat(a[sort.field]), bv = parseFloat(b[sort.field]);
        const am = isNaN(av) || a[sort.field] == null, bm = isNaN(bv) || b[sort.field] == null;
        if (am || bm) r = am && bm ? 0 : am ? 1 : -1; else r = av - bv;
      } else if (sortType === "level") {
        r = spellLevelRank(a[sort.field]) - spellLevelRank(b[sort.field]);
      } else {
        r = String(a[sort.field] || "").toLowerCase().localeCompare(String(b[sort.field] || "").toLowerCase());
      }
      if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
      return r * sign;
    });

    // AUTO is always a fixed direction — clicking it again doesn't flip to desc.
    const pickSort  = (field) => setSort((s) => (s.field === field && field !== "auto") ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
    const sortLabel = (SPELL_SORT_FIELDS.find((f) => f[0] === sort.field) || SPELL_SORT_FIELDS[0])[1];
    const hasFilters = facetCount > 0 || !!q;

    return (
      <React.Fragment>
        <div className="sf-sec-head sf-sec-head--actions sf-sec-head--wrap">
          <h2>Spells</h2><hr className="sf-rule" />
          <span className="sf-sec-head__count">{spells.length} known</span>
          {spells.length > 0 && (
            <button className="sf-ghost-btn" onClick={toggleAll}>
              <Ic name={allOpen ? "chevrons-up" : "chevrons-down"} />
              {allOpen ? "Collapse" : "Expand"}
            </button>
          )}
          <div className="sf-sec-actions">
            <button className="sf-ghost-btn" onClick={onAddManually}><Ic name="pencil-line" /> Add manually</button>
            <Button variant="primary" size="sm" iconLeft={<Ic name="book-open-text" />} onClick={onBrowseCompendium}>Browse Compendium</Button>
          </div>
        </div>

        {spells.length === 0 ? (
          <div className="sf-spells-empty"><Ic name="sparkles" /><p>No spells learned yet. Inscribe one by hand, or summon the Compendium.</p></div>
        ) : (
          <React.Fragment>
            {/* ---- Toolbar: search + filter + sort ---- */}
            <div className="sf-comp-toolbar sf-spell-toolbar">
              <span className="sf-comp-count">
                {visible.length === spells.length
                  ? spells.length + " spell" + (spells.length !== 1 ? "s" : "")
                  : visible.length + " of " + spells.length}
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

                    {subjectOpts.length > 1 && (
                      <div className="sf-filter-group">
                        <label>Subject</label>
                        <Select options={[{ value: "any", label: "Any" }].concat(subjectOpts.map((s) => ({ value: s, label: s })))} value={filters.subject} onChange={(e) => setF("subject", e.target.value)} />
                      </div>
                    )}

                    {statOpts.length > 1 && (
                      <div className="sf-filter-group">
                        <label>Stat</label>
                        <Select options={[{ value: "any", label: "Any" }].concat(statOpts.map((s) => ({ value: s, label: s })))} value={filters.stat} onChange={(e) => setF("stat", e.target.value)} />
                      </div>
                    )}

                    <div className="sf-filter-group">
                      <label>Level</label>
                      <Select options={[{ value: "any", label: "Any" }].concat(SPELL_LEVELS.map((s) => ({ value: s, label: s })))} value={filters.level} onChange={(e) => setF("level", e.target.value)} />
                    </div>

                    {dcMax > 0 && (
                      <DualRange label="DC" max={dcMax} step={1} value={filters.dc} onChange={(v) => setF("dc", v)} />
                    )}

                    <div className="sf-filter-group">
                      <label>Ritual</label>
                      <div className="sf-filter-radios">
                        {[["any", "Any"], ["yes", "Yes"], ["no", "No"]].map(([v, l]) => (
                          <label key={v} className={"sf-filter-radio" + (filters.ritual === v ? " on" : "")}>
                            <input type="radio" name="sf-spell-ritual" checked={filters.ritual === v} onChange={() => setF("ritual", v)} />{l}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="sf-filter-group">
                      <label>Status</label>
                      <div className="sf-filter-radios">
                        {[["any", "Any"], ["yes", "Learned"], ["no", "Learning"]].map(([v, l]) => (
                          <label key={v} className={"sf-filter-radio" + (filters.learned === v ? " on" : "")}>
                            <input type="radio" name="sf-spell-learned" checked={filters.learned === v} onChange={() => setF("learned", v)} />{l}
                          </label>
                        ))}
                      </div>
                    </div>

                    <button className="sf-filter-reset" onClick={resetFilters} disabled={!facetCount}>Clear filters</button>
                  </div>
                </div>

                {/* Sort popover */}
                <div className="sf-pop" ref={sortRef}>
                  <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort spells">
                    <Ic name="arrow-up-down" /><span className="sf-tool-btn__label">Sort</span><span className="sf-tool-sep">·</span><span className="sf-tool-cur">{sortLabel}</span>
                  </button>
                  <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
                    <div className="sf-menu__head">Order by</div>
                    {SPELL_SORT_FIELDS.map(([key, label]) => (
                      <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => pickSort(key)}>
                        <span>{label}</span>
                        <span className="sf-sort-opt__dir">{sort.field === key && key !== "auto" ? <Ic name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} /> : null}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="sf-comp-empty">
                <Ic name="search-x" />
                <p>No spells match — try adjusting your filters.</p>
                {hasFilters ? <button className="sf-filter-reset" onClick={() => { resetFilters(); setQ(""); }}>Clear filters</button> : null}
              </div>
            ) : (
              <div className="sf-spells">
                {visible.map((sp) => (
                  <SpellCard key={sp.id} spell={sp} mod={spellMod(sp)} schoolTone={schoolToneOf(sp.school)} onRoll={onRoll} onRemove={onRemove} onLearn={onLearn} onSetDays={onSetDays} open={openSpells.has(sp.id)} onToggle={() => toggleOne(sp.id)} onEdit={onEdit} />
                ))}
              </div>
            )}
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  /* -------------------- Magic: manual move modal ----------------------- */
  function ManualMove({ open, onClose, onSave, schools, stats, classesList }) {
    const blank = { name: "", rollType: "stat", stat: "", subjectKey: "", skill: "", ap: 0, addRank: false, classKey: "", dc: "", desc: "" };
    const [f, setF] = React.useState(blank);
    React.useEffect(() => { if (open) setF(blank); }, [open]);
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    const subjectOpts = [{ value: "", label: "Choose a field\u2026" }];
    const allSubs = [];
    schools.forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
    allSubs.sort((a, b) => a.label.localeCompare(b.label));
    subjectOpts.push(...allSubs);

    const statOpts = [{ value: "", label: "Choose a stat\u2026" }].concat(stats.map((s) => ({ value: s.name, label: s.name })));

    const skillOpts = [{ value: "", label: "Choose a skill\u2026" }];
    const allSkills = [];
    stats.forEach((s) => s.skills.forEach((sk) => allSkills.push({ value: sk.name, label: sk.name, stat: s.name })));
    allSkills.sort((a, b) => a.label.localeCompare(b.label));
    skillOpts.push(...allSkills);

    const hasClasses = classesList.some((c) => c.rank > 0);
    const classOpts = [{ value: "", label: "Choose a class\u2026" }].concat(
      classesList.filter((c) => c.rank > 0).map((c) => ({ value: c.id, label: c.name }))
    );

    const canSave = f.name.trim() && (
      f.rollType === "stat" ? !!f.stat :
      f.rollType === "subject" ? !!f.subjectKey :
      !!f.skill
    );

    const save = () => {
      if (!canSave) return;
      let stat = f.stat, skill = "\u2014", subjectKey = null, kind = "skill";
      if (f.rollType === "subject") {
        let sub = null;
        schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === f.subjectKey) { sub = x; } }));
        if (sub) { stat = sub.stat; skill = sub.name; subjectKey = sub.key; kind = "subject"; }
      } else if (f.rollType === "skill") {
        const found = allSkills.find((sk) => sk.value === f.skill);
        skill = f.skill;
        if (found) stat = found.stat;
      }
      let classLabel = null;
      if (f.addRank && f.classKey) {
        const cls = classesList.find((c) => c.id === f.classKey);
        classLabel = cls ? cls.name : f.classKey;
      }
      onSave({
        id: "mv-" + Date.now(),
        name: f.name.trim(),
        stat, skill, subjectKey, kind,
        ap: parseInt(f.ap, 10) || 0,
        dc: f.dc === "" ? null : parseInt(f.dc, 10),
        desc: f.desc.trim(),
        addRank: f.addRank && !!f.classKey,
        fromClass: f.addRank && f.classKey ? f.classKey : null,
        classLabel,
      });
      onClose();
    };

    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label="Add a move">
          <div className="sf-modal__head">
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">Technique trainer</span>
              <h2>New move</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <Input label="Name" placeholder="e.g. Internal Compass" value={f.name} onChange={(e) => set("name", e.target.value)} />
            <div className="sf-modal__field">
              <span className="sf-modal__label">Rolls with</span>
              <div className="sf-move-type-row">
                {[["stat", "Stat"], ["subject", "Subject"], ["skill", "Skill"]].map(([val, lbl]) => (
                  <button key={val} type="button"
                    className={"sf-move-type-btn" + (f.rollType === val ? " is-on" : "")}
                    onClick={() => { set("rollType", val); set("stat", ""); set("subjectKey", ""); set("skill", ""); }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            {f.rollType === "subject" ? (
              <Select label="Subject" options={subjectOpts} value={f.subjectKey} onChange={(e) => set("subjectKey", e.target.value)} />
            ) : f.rollType === "skill" ? (
              <Select label="Skill" options={skillOpts} value={f.skill} onChange={(e) => set("skill", e.target.value)} />
            ) : (
              <Select label="Stat" options={statOpts} value={f.stat} onChange={(e) => set("stat", e.target.value)} />
            )}
            <div className="sf-modal__row">
              <div className="sf-no-spin"><Input label="AP" type="number" value={f.ap} onChange={(e) => set("ap", e.target.value)} /></div>
              <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.dc} onChange={(e) => set("dc", e.target.value)} /></div>
            </div>
            {hasClasses && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)" }}>
                <div className="sf-modal__switch" style={{ flex: "none" }}>
                  <span className="sf-modal__switch-label">Add class rank</span>
                  <Switch checked={f.addRank} onChange={(e) => { set("addRank", e.target.checked); if (!e.target.checked) set("classKey", ""); }} />
                </div>
                {f.addRank && (
                  <div style={{ flex: 1 }}>
                    <Select label="Class" options={classOpts} value={f.classKey} onChange={(e) => set("classKey", e.target.value)} />
                  </div>
                )}
              </div>
            )}
            <label className="sf-modal__field">
              <span className="sf-modal__label">Description</span>
              <textarea className="sf-modal__textarea" rows={3} placeholder="How does the move work?" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </label>
          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" iconLeft={<Ic name="plus" />} disabled={!canSave} onClick={save}>Add move</Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* -------------------- Magic: manual spell modal ----------------------- */
  function ManualSpell({ open, onClose, onSave, schools, editSpell }) {
    const blank = { name: "", level: "Basic", subjectKey: "", ap: 1, dc: "", ritual: false, volatile: false, stat: "", desc: "", higherLevel: "" };
    const [f, setF] = React.useState(blank);
    React.useEffect(() => {
      if (!open) return;
      if (editSpell) {
        setF({
          name: editSpell.name || "",
          level: editSpell.level || "Basic",
          subjectKey: editSpell.subjectKey || "",
          ap: editSpell.ap != null ? editSpell.ap : 1,
          dc: editSpell.dc != null ? String(editSpell.dc) : "",
          ritual: !!editSpell.ritual,
          volatile: !!editSpell.volatile,
          stat: editSpell.stat || "",
          desc: editSpell.desc || "",
          higherLevel: editSpell.higherLevel || "",
        });
      } else {
        setF(blank);
      }
    }, [open, editSpell]);
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    // flat subject options, grouped label
    const subjectOpts = [{ value: "", label: "Choose a field…" }];
    const allSubs = [];
    schools.forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
    allSubs.sort((a, b) => a.label.localeCompare(b.label));
    subjectOpts.push(...allSubs);
    const canSave = f.name.trim() && f.subjectKey;

    const save = () => {
      if (!canSave) return;
      let sub = null, school = null;
      schools.forEach((s) => s.subjects.forEach((x) => { if (x.key === f.subjectKey) { sub = x; school = s; } }));
      onSave({
        id: editSpell ? editSpell.id : "sp-" + Date.now(),
        name: f.name.trim(), level: f.level,
        subjectKey: sub.key, subject: sub.name, school: school.id, stat: f.stat || sub.stat,
        ap: parseInt(f.ap, 10) || 0, dc: f.dc === "" ? null : parseInt(f.dc, 10),
        ritual: f.ritual, volatile: f.volatile, days: editSpell ? (editSpell.days || 0) : 0, desc: f.desc.trim(),
        higherLevel: f.higherLevel.trim(),
      });
      onClose();
    };

    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label="Add a spell">
          <div className="sf-modal__head">
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">Spell designer</span>
              <h2>{editSpell ? "Edit spell" : "New spell"}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <Input label="Name" placeholder="e.g. Spectral Strike" value={f.name} onChange={(e) => set("name", e.target.value)} />
            <div className="sf-modal__row">
              <Select label="Field of magic" options={subjectOpts} value={f.subjectKey} onChange={(e) => set("subjectKey", e.target.value)} />
              <Select label="Level" options={["Basic", "Standard", "Advanced", "Legendary", "Hex"]} value={f.level} onChange={(e) => set("level", e.target.value)} />
            </div>
            {f.level === "Hex" && (
              <div className="sf-modal__row">
                <div className="sf-no-spin"><Input label="AP cost" type="number" min="0" max="9" value={f.ap} onChange={(e) => set("ap", e.target.value)} /></div>
              </div>
            )}
            <div className="sf-modal__row">
              <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.dc} onChange={(e) => set("dc", e.target.value)} /></div>
              <Select label="Base stat" options={[{ value: "", label: "Follows field" }, { value: "Focus", label: "Focus" }, { value: "Creativity", label: "Creativity" }, { value: "Logic", label: "Logic" }, { value: "Insight", label: "Insight" }, { value: "Body", label: "Body" }, { value: "Charm", label: "Charm" }]} value={f.stat} onChange={(e) => set("stat", e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-6)" }}>
              <div className="sf-modal__switch">
                <span className="sf-modal__switch-label">Ritual</span>
                <Switch checked={f.ritual} onChange={(e) => set("ritual", e.target.checked)} />
              </div>
              <div className="sf-modal__switch">
                <span className="sf-modal__switch-label">Volatile</span>
                <Switch checked={f.volatile} onChange={(e) => set("volatile", e.target.checked)} />
              </div>
            </div>
            <label className="sf-modal__field">
              <span className="sf-modal__label">Description</span>
              <textarea className="sf-modal__textarea" rows={3} placeholder="What does the spell do, and how?" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </label>
            <label className="sf-modal__field">
              <span className="sf-modal__label">Higher-level behavior</span>
              <textarea className="sf-modal__textarea" rows={2} placeholder="How it scales with degrees of success — e.g. You affect (1/2/4+) target(s)." value={f.higherLevel} onChange={(e) => set("higherLevel", e.target.value)} />
            </label>
            {f.subjectKey ? (
              <p className="sf-modal__hint"><Ic name="info" /> Rolls 2d10 + your base stat + this field's rank. The base stat follows the field.</p>
            ) : null}
          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" iconLeft={<Ic name={editSpell ? "check" : "plus"} />} disabled={!canSave} onClick={save}>{editSpell ? "Save changes" : "Add spell"}</Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ----------------------- Backfire: resist prompt ---------------------- */
  function BackfireResist({ open, roll, conditions, facRank, onResist, onClose }) {
    const [cond, setCond] = React.useState("wound");
    const [dc, setDc] = React.useState("");
    const rcfg = (roll && roll.resist) || null;
    React.useEffect(() => {
      if (open && roll) {
        // GM-forced save: the condition + DC are set by the Game Master.
        if (roll.forced) {
          const fc = roll.forced.condition;
          setCond(conditions.find((c) => c.id === fc) ? fc : conditions[0].id);
          setDc(roll.forced.dc != null ? String(roll.forced.dc) : "");
          return;
        }
        const want = (rcfg && rcfg.condition) || "wound";
        setCond(conditions.find((c) => c.id === want) ? want : conditions[0].id);
        if (rcfg && rcfg.dcPerDegree) setDc(String(Math.max(1, rcfg.dcPerDegree * (roll.degrees || 1))));
        else setDc(roll.dc != null ? String(Math.max(1, roll.dc - 4)) : "");
      }
    }, [open, roll && roll.id]);
    if (!roll) return null;
    const condObj = conditions.find((c) => c.id === cond) || conditions[0];
    const mod = facRank(condObj.resist);
    const cast = roll.pass;
    const resist = () => { onResist({ condition: condObj, dc: dc === "" ? null : parseInt(dc, 10), mod }); onClose(); };
    return (
      <React.Fragment>
        <div className={"sf-scrim sf-scrim--bf" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal sf-modal--bf" + (open ? " open" : "")} role="dialog" aria-label={rcfg ? "Resist" : "Backfire — resist"}>
          <div className="sf-modal__head">
            <span className="sf-bf-modal__glyph"><Ic name="flame" /></span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">{roll.label} · {rcfg ? (rcfg.eyebrow || "Resist") : "Backfire"}</span>
              <h2>{rcfg ? (rcfg.heading || "Resist the recoil") : "Resist the recoil"}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <p className={"sf-bf-modal__verdict" + (cast ? " is-cast" : cast === false ? " is-failed" : "")}>
              {rcfg ? (
                <React.Fragment><Ic name="flame" /><span>{rcfg.verdict || "The magic recoils. Choose what it costs you to resist."}</span></React.Fragment>
              ) : cast ? (
                <React.Fragment><Ic name="circle-check" /><span>The spell <b>still takes hold</b> — {roll.degrees} {roll.degrees === 1 ? "degree" : "degrees"} of success — but the recoil demands a save.</span></React.Fragment>
              ) : cast === false ? (
                <React.Fragment><Ic name="circle-x" /><span>The casting <b>fails</b>, and the loosed magic turns back on you.</span></React.Fragment>
              ) : (
                <React.Fragment><Ic name="flame" /><span>The magic recoils. Choose what it costs you to resist.</span></React.Fragment>
              )}
            </p>
            <div className="sf-modal__row">
              <Select label="Condition to resist" options={conditions.map((c) => ({ value: c.id, label: c.name }))} value={cond} onChange={(e) => setCond(e.target.value)} />
              <Input label="Save DC" type="number" placeholder="—" value={dc} onChange={(e) => setDc(e.target.value)} />
            </div>
            <p className="sf-modal__hint"><Ic name="info" /> This save rolls {condObj.resist} ({mod >= 0 ? "+" : "−"}{Math.abs(mod)}).</p>
          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Shrug it off</Button>
            <Button variant="primary" iconLeft={<Ic name="dices" />} onClick={resist}>Roll {condObj.resist} save{dc !== "" ? " · DC " + dc : ""}</Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* -------------- Artifact backfire: Artificy save prompt -------------- */
  function ArtifactBackfireModal({ open, roll, effFacRank, subRank, onRoll, onClose }) {
    if (!roll) return null;
    const level   = roll.artifactLevel   || "Basic";
    const cost    = roll.artifactCost    || 0;
    const curCond = roll.artifactCondition || "stable";
    const dc  = window.SF_ROLL.artifactBackfireDC(level, cost);
    const mod = ((effFacRank ? effFacRank("Creativity") : 0) + (subRank ? subRank("artificy") : 0));
    const nextCond   = curCond === "stable" ? "Damaged" : "Broken";
    const moveLanded = roll.pass === true;
    const moveFailed = roll.pass === false;
    const artName    = (roll.label || "").replace(/^the\s+/i, "");
    return (
      <React.Fragment>
        <div className={"sf-scrim sf-scrim--bf" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal sf-modal--bf" + (open ? " open" : "")} role="dialog" aria-label="Artifact backfire — Artificy save">
          <div className="sf-modal__head">
            <span className="sf-bf-modal__glyph"><Ic name="cog" /></span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">{roll.label} · Artifact Backfire</span>
              <h2>Overload</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <p className={"sf-bf-modal__verdict" + (moveFailed ? " is-failed" : moveLanded ? " is-cast" : "")}>
              <Ic name="flame" />
              <span>
                {moveLanded
                  ? "Sparked it—but the " + artName + " overloads. Roll Artificy, DC" + dc + " to keep it from becoming " + nextCond + "."
                  : "Sparked out! The " + artName + " overloads and blows your magic out. Roll Artificy, DC" + dc + " to keep it from becoming " + nextCond + "."}
              </span>
            </p>
            <div className="sf-re__chips" style={{ marginBottom: "var(--space-3)" }}>
              <span className="sf-chip"><b>Stat</b> Creativity · Artificy</span>
              <span className="sf-chip"><b>DC</b> {dc} · {level}</span>
              <span className="sf-chip"><b>Modifier</b> {mod >= 0 ? "+" : "−"}{Math.abs(mod)}</span>
              <span className="sf-chip"><Ic name={curCond === "stable" ? "shield" : "shield-alert"} /> {curCond.charAt(0).toUpperCase() + curCond.slice(1)} → {nextCond}</span>
            </div>

          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Shrug it off</Button>
            <Button variant="primary" iconLeft={<Ic name="dices" />} onClick={onRoll}>
              Overload · 2d10 {mod >= 0 ? "+ " + mod : "− " + Math.abs(mod)} vs DC {dc}
            </Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ------------------------ Draft placeholder --------------------------- */
  function DraftPlaceholder({ wing }) {
    return (
      <div className="sf-draft">
        <div className="sf-draft__card">
          <Crest form="lines" size={84} tint="gold" basePath="assets" className="crest" />
          <span className="sf-eyebrow">Coming to the app</span>
          <h2>{wing}</h2>
          <p>We're exploring the Overview first. The {wing} wing carries over from the existing sheet and will be redrawn in this new layout next.</p>
          <Button variant="secondary" iconLeft={<Ic name="arrow-left" />} onClick={() => window.__sfGoOverview && window.__sfGoOverview()}>Back to Overview</Button>
        </div>
      </div>
    );
  }

  Object.assign(window, {
    SF_Sidebar: Sidebar,
    SF_TopBar: TopBar,
    SF_IdentityHero: IdentityHero,
    SF_ConditionsRail: ConditionsRail,
    SF_StatCard: StatCard,
    SF_MovesRail: MovesRail,
    SF_BonusLedger: BonusLedger,
    SF_Compendium: Compendium,
    SF_Ic: Ic,
    SF_SchoolCard: SchoolCard,
    SF_SpellCard: SpellCard,
    SF_SpellSection: SpellSection,
    SF_ManualMove: ManualMove,
    SF_ManualSpell: ManualSpell,
    SF_BackfireResist: BackfireResist,
    SF_ArtifactBackfire: ArtifactBackfireModal,
    SF_DraftPlaceholder: DraftPlaceholder,
  });
})();
