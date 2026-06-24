/* ===========================================================================
   Starfall Academy — Inventory wing (the Satchel, redrawn)
   Materials banner + six gilded shelves: Artifacts, Potions (held + recipes),
   Plants, Wands, Glyphs (with the rune forge) and miscellany.

   Reads window.SF_INV for rules; all item state is owned by the App and passed
   in. Rollable actions (attune, brew, create rune, use, repair) fire through
   the App's roll prompt; this file owns only the small local modals
   (gain/spend, give-to-party, manual add).
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, IconButton, Badge, Switch, Input, Select } = SA;
  const SHARED = window.SF_SHARED;
  const Ic = window.SF_Ic;

  const TONE_FG = SHARED.TONE_FG;
  const TONE_500 = SHARED.TONE_500;

  // ---- Level colour-coding -------------------------------------------------
  // Use shared levelTone function; accentOf wraps it with style object
  const levelTone = SHARED.levelTone;
  const accentOf = SHARED.accentOf;

  /* ============================ small parts ============================= */

  // A live limit meter — segments when the cap is small & countable, a bar when large.
  function LimitMeter({ n, cap, unit, over, segMax = 8 }) {
    const ratio = cap > 0 ? Math.min(1, n / cap) : 0;
    const segments = cap <= segMax && Number.isInteger(cap);
    return (
      <div className={"sf-meter" + (over ? " is-over" : "")}>
        <span className="sf-meter__read">
          <b>{n}</b><span className="sf-meter__slash">/</span>{cap}{unit ? <span className="sf-meter__unit"> {unit}</span> : null}
        </span>
        {segments ? (
          <span className="sf-meter__segs">
            {Array.from({ length: cap }).map((_, i) => <i key={i} className={i < n ? "on" : ""}></i>)}
          </span>
        ) : (
          <span className="sf-meter__bar"><i style={{ width: (ratio * 100) + "%" }}></i></span>
        )}
      </div>
    );
  }

  function ShelfHead({ icon, title, eyebrow, meter, onManual, onCompendium, onTake, onRefreshAll, onToggleAll, allOpen, disabledAdd }) {
    return (
      <div className="sf-shelf__head">
        <span className="sf-shelf__glyph"><Ic name={icon} /></span>
        <div className="sf-shelf__titles">
          <span className="sf-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {meter ? <div className="sf-shelf__meter">{meter}</div> : null}
        <div className="sf-shelf__actions">
          {onTake ? <button className="sf-slot__take" onClick={onTake}><Ic name="dices" /> Take New Potion</button> : null}
          {onRefreshAll ? <button className="sf-ghost-btn" onClick={onRefreshAll}><Ic name="rotate-ccw" /> Refresh all</button> : null}
          {onToggleAll ? <button className="sf-ghost-btn" onClick={onToggleAll}><Ic name={allOpen ? "chevrons-up" : "chevrons-down"} /> {allOpen ? "Collapse" : "Expand"}</button> : null}
          {onManual ? <button className="sf-ghost-btn" onClick={disabledAdd ? undefined : onManual} disabled={!!disabledAdd}><Ic name="pencil-line" /> Add manually</button> : null}
          {onCompendium ? <Button variant="primary" size="sm" iconLeft={<Ic name="book-open-text" />} onClick={disabledAdd ? undefined : onCompendium} disabled={!!disabledAdd}>Compendium</Button> : null}
        </div>
      </div>
    );
  }

  // A compact action button used on item cards.
  function ItemAct({ icon, label, tone, onClick, disabled, title }) {
    return (
      <button className={"sf-ia" + (tone ? " t-" + tone : "") + (disabled ? " is-disabled" : "")} onClick={disabled ? undefined : onClick} disabled={disabled} title={title || label}>
        <Ic name={icon} /> {label}
      </button>
    );
  }

  // The little overflow menu (Give / Remove) shared by every card.
  function CardMenu({ onGive, onRemove, onEdit, giveLabel = "Give to a party-mate" }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    return (
      <div className="sf-cardmenu" ref={ref}>
        <button className="sf-cardmenu__btn" onClick={() => setOpen((v) => !v)} aria-label="More"><Ic name="ellipsis" /></button>
        {open ? (
          <div className="sf-cardmenu__pop">
            {onEdit ? <button onClick={() => { setOpen(false); onEdit(); }}><Ic name="pencil" /> Edit</button> : null}
            {onGive ? <button onClick={() => { setOpen(false); onGive(); }}><Ic name="gift" /> {giveLabel}</button> : null}
            {onRemove ? <button className="is-danger" onClick={() => { setOpen(false); onRemove(); }}><Ic name="trash-2" /> Remove</button> : null}
          </div>
        ) : null}
      </div>
    );
  }

  const condTone = (c) => (c === "broken" ? "crimson" : c === "damaged" ? "gold" : "forest");

  // Fast / Medium / Slow repair chooser. Faster = higher DC; worse status = higher DC.
  function RepairMenu({ art, h }) {
    const [open, setOpen] = React.useState(false);
    const btnRef = React.useRef(null);
    const popRef = React.useRef(null);
    const [popStyle, setPopStyle] = React.useState({});
    const INV = window.SF_INV;

    const measure = React.useCallback(() => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const estH = 168;
      const spaceAbove = r.top - 8;
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const goAbove = spaceAbove >= estH || spaceAbove >= spaceBelow;
      setPopStyle(goAbove ? {
        position: "fixed",
        bottom: window.innerHeight - r.top + 6,
        right: window.innerWidth - r.right,
        width: 250,
        zIndex: 9999,
        maxHeight: spaceAbove,
        overflowY: "auto",
      } : {
        position: "fixed",
        top: r.bottom + 6,
        right: window.innerWidth - r.right,
        width: 250,
        zIndex: 9999,
        maxHeight: spaceBelow,
        overflowY: "auto",
      });
    }, []);

    React.useLayoutEffect(() => { if (open) measure(); }, [open]);

    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e) => {
        if (
          btnRef.current && btnRef.current.contains(e.target) ||
          popRef.current && popRef.current.contains(e.target)
        ) return;
        setOpen(false);
      };
      const onScroll = () => measure();
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("scroll", onScroll, true);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        window.removeEventListener("scroll", onScroll, true);
      };
    }, [open]);

    const popup = open ? ReactDOM.createPortal(
      <div ref={popRef} className="sf-repair__pop" style={popStyle}>
        <div className="sf-repair__head"><Ic name="shield-alert" /><span>Mend a <b>{art.condition}</b> artifact · Artificy roll</span></div>
        {INV.repairOrder.map((speed) => {
          const cfg = INV.repair[speed];
          const dc = cfg.dc[art.condition];
          return (
            <button key={speed} className="sf-repair__opt" onClick={() => { setOpen(false); h.repairArtifact(art, speed, btnRef.current); }}>
              <span className="sf-repair__pace">{cfg.label}</span>
              <span className="sf-repair__time"><Ic name="clock" /> {typeof cfg.time === "object" ? cfg.time[art.condition] : cfg.time}</span>
              <span className="sf-repair__dc">DC {dc}</span>
            </button>
          );
        })}
      </div>,
      document.body
    ) : null;

    return (
      <div className="sf-repair">
        <button ref={btnRef} className="sf-ia t-gold" onClick={() => setOpen((v) => !v)}>
          <Ic name="hammer" /> Repair <Ic name={open ? "chevron-up" : "chevron-down"} />
        </button>
        {popup}
      </div>
    );
  }

  /* ============================ Artifacts ============================== */
  function ArtifactCard({ art, attuneFull, h, open, onToggle }) {
    const acc = accentOf(art.level);
    const blocked = !art.attuned && attuneFull;
    const needsRepair = art.condition !== "stable";
    const skills = (art.skills && art.skills.length)
      ? art.skills
      : (art.move && art.move.skill && art.move.skill !== "\u2014" ? [art.move.skill] : []);
    const dc = art.dc != null ? art.dc : (art.move ? art.move.dc : null);
    const hasRoll = skills.length > 0;
    return (
      <div className={"sf-itm sf-art" + (acc.flat ? " is-flat" : "") + (art.attuned ? " is-attuned" : "") + (art.condition !== "stable" ? " is-" + art.condition : "") + (open ? " is-open" : " is-collapsed")} style={acc.style}>
        <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-itm__name">{art.name}</span>
          <Badge tone={acc.tone || "neutral"} square>{art.level}</Badge>
          <button className="sf-itm__edit" title="Edit artifact" onClick={(e) => { e.stopPropagation(); h.editArtifact(art); }}><Ic name="pencil" /></button>
          <CardMenu onGive={() => h.give("artifact", art)} onRemove={() => h.removeArtifact(art)} />
          <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        <div className="sf-itm__chips">
          <span className="sf-chip sf-chip--field"><Ic name="sparkles" /> {art.subject}</span>
          {art.attuned
            ? <span className="sf-chip sf-chip--ok"><Ic name="link" /> Attuned</span>
            : <span className="sf-chip"><b>Intensity</b> {art.intensity}</span>}
          <span className={"sf-chip sf-chip--cond t-" + condTone(art.condition)}><Ic name={art.condition === "broken" ? "shield-x" : art.condition === "damaged" ? "shield-alert" : "shield-check"} /> {art.condition}</span>
        </div>
        {open && (
          <React.Fragment>
            <p className="sf-itm__desc">{art.desc}</p>
            {hasRoll ? (
              <div className="sf-art__wire">
                <div className="sf-art__roll">
                  <Ic name="dices" />
                  <span className="sf-art__roll-skill">{skills.join(" / ")}</span>
                  <span className="sf-art__roll-dc">{dc != null ? "DC " + dc : "Opposed"}</span>
                </div>
                <Ic name="arrow-right" className="sf-art__wire-arrow" />
                <div className="sf-art__move">
                  <Ic name="swords" />
                  {art.attuned
                    ? <span className="sf-art__move-state is-on">Move on your Overview <Ic name="check" /></span>
                    : <span className="sf-art__move-state">attune to grant its Move</span>}
                </div>
              </div>
            ) : (
              <div className="sf-itm__link"><Ic name="swords" /> {art.attuned ? <React.Fragment>Move <span className="sf-itm__link-on">on your Overview</span></React.Fragment> : <React.Fragment>Attune to grant its <b>Move</b></React.Fragment>}</div>
            )}
          </React.Fragment>
        )}
        <div className="sf-itm__foot sf-itm__foot--split">
          {art.attuned ? (
            <span className="sf-itm__note"><Ic name="check-circle" /> Attuned &amp; answering</span>
          ) : (
            blocked ? <span className="sf-itm__warn"><Ic name="lock" /> Attunement slots full</span>
              : <ItemAct icon="dices" label="Attune" tone="gold" onClick={(e) => h.attune(art, e.currentTarget)} />
          )}
          {needsRepair ? <RepairMenu art={art} h={h} /> : null}
        </div>
      </div>
    );
  }

  /* ============================ Materials =============================== */
  function MaterialsBanner({ materials, onAdjust, onGive }) {
    const [mode, setMode] = React.useState(null); // 'gain' | 'spend'
    const [amt, setAmt] = React.useState("");
    const inputRef = React.useRef(null);
    React.useEffect(() => { if (mode && inputRef.current) inputRef.current.focus(); }, [mode]);
    const commit = () => {
      const v = parseInt(amt, 10);
      if (!v || v <= 0) { setMode(null); setAmt(""); return; }
      onAdjust(mode === "gain" ? v : -v);
      setMode(null); setAmt("");
    };
    return (
      <section className="sf-mats">
        <img className="sf-mats__wm" src="assets/crest-lines.png" alt="" />
        <div className="sf-mats__left">
          <span className="sf-eyebrow">Materials</span>
          <div className="sf-mats__figure">
            <Ic name="gem" />
            <span className="sf-mats__num">{materials.toLocaleString()}</span>

          </div>
        </div>
        <div className="sf-mats__right">
          {mode ? (
            <div className="sf-mats__form">
              <span className="sf-mats__formlabel">{mode === "gain" ? "Gain" : "Spend"} materials</span>
              <div className="sf-mats__formrow">
                <input ref={inputRef} type="number" min="1" value={amt} placeholder="0"
                  onChange={(e) => setAmt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setMode(null); setAmt(""); } }} />
                <button className="sf-mats__go" onClick={commit}><Ic name="check" /></button>
                <button className="sf-mats__cancel" onClick={() => { setMode(null); setAmt(""); }}><Ic name="x" /></button>
              </div>
            </div>
          ) : (
            <div className="sf-mats__btns">
              <button className="sf-mats__btn t-gain" onClick={() => setMode("gain")}><Ic name="plus" /> Gain</button>
              <button className="sf-mats__btn t-spend" onClick={() => setMode("spend")}><Ic name="minus" /> Spend</button>
              <button className="sf-mats__btn t-give" onClick={onGive}><Ic name="gift" /> Transfer</button>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ============================ Potions ================================ */
  // The held tray is a fixed 6-slot loadout: one square per vial held (so a
  // potion held twice fills two squares), the rest shown empty. Makes the
  // hard cap of 6 read at a glance.
  function PotionLoadout({ potions, cap, knownNames, h }) {
    const units = [];
    potions.forEach((p) => { for (let i = 0; i < p.qty; i++) units.push(p); });
    const cells = Array.from({ length: cap }, (_, i) => units[i] || null);
    return (
      <div className="sf-loadout">
        {cells.map((p, i) => p
          ? <PotionSlot key={i} p={p} recipeKnown={knownNames.has(p.name)} h={h} />
          : (
            <div key={i} className="sf-slot is-empty">
              <span className="sf-slot__ring"><Ic name="flask-conical" /></span>
              <span className="sf-slot__empty">Empty</span>
            </div>
          ))}
      </div>
    );
  }

  function PotionSlot({ p, recipeKnown, h }) {
    const [menu, setMenu] = React.useState(false);
    const [info, setInfo] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!menu && !info) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setMenu(false); setInfo(false); } };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [menu, info]);
    const stop = (fn) => (e) => { e.stopPropagation(); fn && fn(e); };
    return (
      <div className={"sf-slot is-filled" + (info ? " is-open" : "")} ref={ref} role="button" tabIndex={0}
        onClick={() => { setInfo((v) => !v); setMenu(false); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setInfo((v) => !v); setMenu(false); } }}>
        <div className="sf-slot__top">
          <span className="sf-slot__ring"><Ic name="flask-conical" /></span>
          <div className="sf-slot__tools">
            <button className={"sf-slot__peek" + (info ? " is-on" : "")} onClick={stop(() => { setInfo((v) => !v); setMenu(false); })} aria-label="Preview" title="Preview"><Ic name="eye" /></button>
            <div className="sf-cardmenu">
              <button className="sf-cardmenu__btn" onClick={stop(() => { setMenu((v) => !v); setInfo(false); })} aria-label="More"><Ic name="ellipsis" /></button>
              {menu ? (
                <div className="sf-cardmenu__pop">
                  <button onClick={stop(() => { setMenu(false); h.give("potion", p); })}><Ic name="gift" /> Give one to a party-mate</button>
                  <button className="is-danger" onClick={stop(() => { setMenu(false); h.discardPotion(p); })}><Ic name="trash-2" /> Discard one</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <span className="sf-slot__name">{p.name}</span>
        <div className="sf-slot__meta">
          <span className="sf-chip"><b>Int</b> {p.intensity}</span>
          {recipeKnown ? <span className="sf-slot__known" title="Recipe known"><Ic name="scroll-text" /></span> : null}
        </div>
        <button className="sf-slot__take" onClick={stop((e) => h.takePotion(p, e.currentTarget))}><Ic name="dices" /> Take</button>
        {info ? (
          <div className="sf-slot__pop" onClick={stop()}>
            <div className="sf-slot__pop-head">
              <span className="sf-slot__pop-name">{p.name}</span>
              <button className="sf-slot__pop-close" onClick={stop(() => setInfo(false))} aria-label="Close"><Ic name="x" /></button>
            </div>
            <div className="sf-slot__pop-chips">
              <span className="sf-chip"><b>Intensity</b> {p.intensity}</span>
              {recipeKnown ? <span className="sf-chip sf-chip--ok"><Ic name="scroll-text" /> Recipe known</span> : null}
            </div>
            <p className="sf-slot__pop-desc">{p.desc}</p>
          </div>
        ) : null}
      </div>
    );
  }

  function RecipeCard({ r, heldFull, h, open, onToggle }) {
    return (
      <div className={"sf-itm sf-recipe is-flat" + (open ? " is-open" : " is-collapsed")}>
        <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-itm__name">{r.name}</span>
          <Badge tone="neutral" square>Recipe</Badge>
          <button className="sf-itm__edit" title="Edit recipe" onClick={(e) => { e.stopPropagation(); h.editRecipe(r); }}><Ic name="pencil" /></button>
          <CardMenu onGive={() => h.give("recipe", r)} onRemove={() => h.removeRecipe(r)} giveLabel="Share recipe" />
          <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        <div className="sf-itm__chips">
          <span className="sf-chip"><b>Intensity</b> {r.intensity}</span>
          <span className="sf-chip"><b>Cost</b> {r.cost} mat.</span>
        </div>
        {open && <p className="sf-itm__desc">{r.desc}</p>}
        <div className="sf-itm__foot">
          {heldFull
            ? <span className="sf-itm__warn"><Ic name="lock" /> Potion sheaf full</span>
            : <ItemAct icon="flame" label="Brew" tone="gold" onClick={(e) => h.brew(r, e.currentTarget)} />}
        </div>
      </div>
    );
  }

  /* ============================ Plants ================================= */
  // A plant's "Requires roll" value (from the database) drives its Use action:
  //   yes    → roll Herbalism to use (the classic behaviour)
  //   no     → Use just marks it used / consumes it, no roll
  //   move   → no Use button; projects a linked Move onto the Overview
  //   bonus  → no Use button; projects a linked Bonus onto the Overview
  //   ability→ no Use button; a passive ability, always in effect
  //   choose → Use asks whether to roll, then behaves as yes or no
  function PlantCard({ pl, h, open, onToggle }) {
    const info = SHARED.parsePlantRoll(pl.requiresRoll);
    const hasUse = info.mode === "yes" || info.mode === "no" || info.mode === "choose";
    const useIcon = info.mode === "no" ? "check-check" : "dices";
    const bonusVal = (info.bonusValue >= 0 ? "+" : "") + (info.bonusValue || 0);
    return (
      <div className={"sf-itm sf-plant is-flat" + (pl.used ? " is-used" : "") + (open ? " is-open" : " is-collapsed")}>
        <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-itm__name">{pl.name}</span>
          <span className="sf-plant__val"><Ic name="gem" /> {pl.value}</span>
          <button className="sf-itm__edit" title="Edit plant" onClick={(e) => { e.stopPropagation(); h.editPlant(pl); }}><Ic name="pencil" /></button>
          <CardMenu onGive={() => h.give("plant", pl)} onRemove={() => h.removePlant(pl)} />
          <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        <div className="sf-itm__chips">
          <span className="sf-chip"><b>Intensity</b> {pl.intensity}</span>
          {info.mode === "ability" ? <span className="sf-chip sf-chip--field"><Ic name="infinity" /> Passive</span> : null}
          {info.mode === "choose" ? <span className="sf-chip"><Ic name="dices" /> Roll optional</span> : null}
          {info.mode === "no" ? <span className="sf-chip"><Ic name="check-check" /> No roll</span> : null}
          {pl.used ? <span className="sf-chip sf-chip--spent"><Ic name="check" /> Used</span> : null}
          {pl.removeOnUse ? <span className="sf-chip sf-chip--warn"><Ic name="flame" /> Consumed on use</span> : null}
        </div>
        {open && (
          <React.Fragment>
            <p className="sf-itm__desc">{pl.desc}</p>
            {pl.ability ?
              <div className="sf-plant__ability">
                <span className="sf-plant__ability-lbl"><Ic name="sparkles" /> Ability</span>
                <p className="sf-plant__ability-text">{pl.ability}</p>
              </div> : null}
            {info.mode === "move" ?
              <div className="sf-itm__link"><Ic name="swords" /> Move <span className="sf-itm__link-on">on your Overview</span></div> : null}
            {info.mode === "bonus" ?
              <div className="sf-itm__link"><Ic name="zap" /> Bonus <b>{info.bonusTarget}, {bonusVal}</b> <span className="sf-itm__link-on">on your Overview</span></div> : null}
          </React.Fragment>
        )}
        <div className="sf-itm__foot sf-itm__foot--split">
          {hasUse ?
            (pl.used ?
              <ItemAct icon="rotate-ccw" label="Refresh" onClick={() => h.refreshPlant(pl)} /> :
              <ItemAct icon={useIcon} label="Use" tone="gold" onClick={(e) => h.usePlant(pl, e.currentTarget)} />) :
            <span className="sf-itm__note">
              <Ic name={info.mode === "move" ? "swords" : info.mode === "bonus" ? "zap" : "infinity"} />
              {info.mode === "move" ? "Active as a Move" : info.mode === "bonus" ? "Active as a Bonus" : "Always in effect"}
            </span>}
          <ItemAct icon="scissors" label={"Harvest · +" + pl.value} onClick={() => h.harvestPlant(pl)} title={"Harvest for " + pl.value + " materials"} />
        </div>
      </div>
    );
  }

  /* ============================ Wands ================================= */
  // A wand carries one linked `effect`. What it grants is clear from the
  // description; equipping wires it up silently, so the card stays uncluttered.
  function WandCard({ w, h, open, onToggle }) {
    const acc = accentOf(w.level);
    const pct = w.maxCondition ? Math.round((w.condition / w.maxCondition) * 100) : 0;
    const tone = w.condition <= 0 ? "crimson" : pct <= 33 ? "gold" : "forest";
    const setCond = (v) => h.setWandCondition(w, v);
    const step = Math.max(1, Math.round(w.maxCondition / 10));
    return (
      <div className={"sf-itm sf-wand" + (acc.flat ? " is-flat" : "") + (w.equipped ? " is-equipped" : "") + (w.twisted ? " is-twisted" : "") + (open ? " is-open" : " is-collapsed")} style={acc.style}>
        <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-itm__name">{w.name}</span>
          {w.twisted ? <span className="sf-chip sf-chip--warn"><Ic name="flame" /> Twisted</span> : null}
          <button className="sf-itm__edit" title="Edit wand" onClick={(e) => { e.stopPropagation(); h.editWand(w); }}><Ic name="pencil" /></button>
          <CardMenu onGive={() => h.give("wand", w)} onRemove={() => h.removeWand(w)} />
          <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        <div className="sf-itm__chips">
          <span className={"sf-chip t-" + tone}><Ic name={w.condition >= w.maxCondition ? "heart" : "heart-crack"} /> {w.condition}/{w.maxCondition}</span>
          {w.crafting ? <span className="sf-chip sf-chip--warn"><Ic name="hammer" /> Crafting</span> : null}
          {!w.crafting && w.equipped ? <span className="sf-chip sf-chip--ok"><Ic name="check-circle" /> Equipped</span> : null}
        </div>
        {open && (
          <React.Fragment>
            <p className="sf-itm__desc">{w.desc}</p>
            <div className="sf-wand__cond">
              <span className="sf-wand__cond-lbl"><Ic name={w.condition >= w.maxCondition ? "heart" : "heart-crack"} /> Condition</span>
              <div className="sf-wand__cond-edit">
                <button type="button" className="sf-wand__cond-step" aria-label="Lower condition" disabled={w.condition <= 0} onClick={() => setCond(w.condition - step)}><Ic name="minus" /></button>
                <input className="sf-wand__cond-input" type="number" min="0" max={w.maxCondition} value={w.condition}
                  onChange={(e) => setCond(parseInt(e.target.value, 10) || 0)} aria-label="Condition in materials" />
                <span className="sf-wand__cond-max">/ {w.maxCondition.toLocaleString()} mat.</span>
                <button type="button" className="sf-wand__cond-step" aria-label="Raise condition" disabled={w.condition >= w.maxCondition} onClick={() => setCond(w.condition + step)}><Ic name="plus" /></button>
              </div>
              <span className={"sf-wand__cond-bar t-" + tone}><span style={{ width: pct + "%" }}></span></span>
            </div>
          </React.Fragment>
        )}
        <div className="sf-itm__foot sf-itm__foot--split">
          <label className={"sf-equip" + (w.crafting ? " is-disabled" : "")} title={w.crafting ? "Cannot equip — still being crafted" : undefined}>
            <Switch checked={w.equipped} disabled={!!w.crafting} onChange={() => !w.crafting && h.equipWand(w)} />
            <span>{w.crafting ? "Crafting" : w.equipped ? "Equipped" : "Equip"}</span>
          </label>
          {w.condition < w.maxCondition ? <ItemAct icon="hammer" label="Repair" onClick={(e) => h.repairWand(w, e.currentTarget)} /> : null}
        </div>
      </div>
    );
  }

  /* ====================== Glyphs + the rune forge ====================== */
  function GlyphForge({ glyphs, runeStack, h, glyphOpenIds, toggleGlyph, toggleAllGlyphs, allGlyphsOpen }) {
    const cost = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
    const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
    return (
      <div className="sf-glyph-forge">
        <div className="sf-rune">
          <div className="sf-rune__head">
            <span className="sf-rune__glyph"><Ic name="hexagon" /></span>
            <div className="sf-rune__titles">
              <span className="sf-eyebrow">Inscription</span>
              <h3>Active rune</h3>
            </div>
            {runeStack.length ? <button className="sf-rune__clear" onClick={h.clearRune}><Ic name="x" /> Clear</button> : null}
          </div>
          {runeStack.length === 0 ? (
            <p className="sf-rune__empty">Stack glyphs below to compose a rune, then roll <b>Runology</b> to inscribe it.</p>
          ) : (
            <div className="sf-rune__stack">
              {runeStack.map((g, i) => (
                <span key={i} className="sf-rune__chip sf-rune__chip--flat">
                  {g.name}
                  <button onClick={() => h.removeFromRune(i)} aria-label={"Remove " + g.name}><Ic name="x" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="sf-rune__foot">
            <div className="sf-rune__stats">
              <span><b>{intensity}</b> intensity</span>
              <span className="sf-rune__sep"></span>
              <span><b>{cost}</b> mats to inscribe</span>
            </div>
            <button className="sf-roll-btn sf-rune__create" disabled={!runeStack.length} onClick={(e) => runeStack.length && h.createRune(e.currentTarget)}>
              <Ic name="dices" /> Create rune
            </button>
          </div>
        </div>

        <div className="sf-glyphs">
          {glyphs.length > 0 && (
            <div className="sf-sub__head">
              <span className="sf-sub__title"><Ic name="hexagon" /> Glyph Library</span>
              <span className="sf-sub__count">{glyphs.length} glyph{glyphs.length !== 1 ? "s" : ""}</span>
              <div className="sf-sub__actions">
                <button className="sf-ghost-btn" onClick={toggleAllGlyphs}>
                  <Ic name={allGlyphsOpen ? "chevrons-up" : "chevrons-down"} />
                  {allGlyphsOpen ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
          )}
          {glyphs.map((g) => {
            const open = glyphOpenIds ? glyphOpenIds.has(g.id) : false;
            return (
              <div key={g.id} className={"sf-glyph is-flat" + (open ? " is-open" : " is-collapsed")}>
                <div className="sf-glyph__top" onClick={() => toggleGlyph && toggleGlyph(g.id)} role="button" tabIndex={0}
                     onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleGlyph && toggleGlyph(g.id)}>
                  <span className="sf-glyph__name">{g.name}</span>
                  <button className="sf-itm__edit" title="Edit glyph" onClick={(e) => { e.stopPropagation(); h.editGlyph(g); }}><Ic name="pencil" /></button>
                  <CardMenu onGive={() => h.give("glyph", g)} onRemove={() => h.removeGlyph(g)} />
                  <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
                </div>
                <div className="sf-glyph__meta">
                  <span className="sf-chip"><b>Cost</b> {g.cost}</span>
                  <span className="sf-chip"><b>Int</b> {g.intensity}</span>
                </div>
                {open && <p className="sf-glyph__desc">{g.desc}</p>}
                <button className="sf-glyph__add" onClick={() => h.addToRune(g)}><Ic name="plus" /> Add to rune</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============================ Items ================================= */
  // General-purpose item card. Designed to accept all fields from the Items
  // database (cost, singleUse, check, tags, dbId) — fields that are absent
  // degrade silently so existing seed data keeps working. When the database
  // is plugged in, the Use action fires h.useItem with the full item payload.
  function ItemCard({ it, h, open, onToggle }) {
    const rawCheck = (it.check || "").trim().toUpperCase();
    const hasCheck = rawCheck && rawCheck !== "NONE";
    const isSingleUse = it.singleUse === true || String(it.singleUse || "").toUpperCase() === "YES";
    const tags = it.tags
      ? (Array.isArray(it.tags) ? it.tags : it.tags.split(",").map((t) => t.trim()).filter(Boolean))
      : [];
    const showFoot = hasCheck || isSingleUse;
    return (
      <div className={"sf-itm sf-item is-flat" + (open ? " is-open" : " is-collapsed")}>
        <div className="sf-itm__head" onClick={onToggle} role="button" tabIndex={0}
             onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
          <span className="sf-itm__name">{it.name}</span>
          {it.qty != null && it.qty > 1 ? <span className="sf-item__qty">×{it.qty}</span> : null}
          <CardMenu onGive={() => h.give("item", it)} onRemove={() => h.removeItem(it)} />
          <span className="sf-itm__chev"><Ic name={open ? "chevron-up" : "chevron-down"} /></span>
        </div>
        <div className="sf-itm__chips">
          {it.cost != null ? <span className="sf-chip"><Ic name="coins" /> {it.cost}</span> : null}
          {isSingleUse ? <span className="sf-chip sf-chip--warn"><Ic name="flame" /> Single-use</span> : null}
          {hasCheck ? <span className="sf-chip sf-chip--field"><Ic name="dices" /> {it.check}</span> : null}
          {tags.map((tag) => (
            <span key={tag} className={"sf-chip sf-chip--tag" + (tag.toUpperCase().includes("BACKFIRE") || tag.toUpperCase().includes("FAILURE") ? " is-loss" : "")}>
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        {open && <p className="sf-itm__desc">{it.desc}</p>}
        {showFoot && (
          <div className="sf-itm__foot">
            <ItemAct
              icon={hasCheck ? "dices" : "check-check"}
              label="Use"
              tone={hasCheck ? "gold" : undefined}
              onClick={(e) => h.useItem(it, hasCheck ? e.currentTarget : null)}
            />
          </div>
        )}
      </div>
    );
  }

  /* ===================== Use-plant choice modal (CHOOSE) =============== */
  function ChoosePlantModal({ open, plant, onRoll, onJustUse, onClose }) {
    if (!plant) return null;
    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal sf-modal--sm" + (open ? " open" : "")} role="dialog" aria-label="Use plant">
          <div className="sf-modal__head">
            <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Ic name="leaf" /></span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">How will you use it?</span>
              <h2>Use {plant.name}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <p className="sf-modal__hint"><Ic name="sparkles" /> {plant.ability || plant.desc}</p>
            <p className="sf-modal__hint"><Ic name="dices" /> You can roll Herbalism to use this plant, or simply use it without a roll.</p>
          </div>
          <div className="sf-modal__foot">
            <Button variant="secondary" iconLeft={<Ic name="check-check" />} onClick={onJustUse}>Use without rolling</Button>
            <Button variant="primary" iconLeft={<Ic name="dices" />} onClick={onRoll}>Roll to use</Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ===================== Give-to-a-party-mate modal ==================== */
  function GiveModal({ open, payload, roster, activeChar, onConfirm, onClose }) {
    const mates = roster.filter((r) => r.id !== activeChar);
    const [target, setTarget] = React.useState(mates[0] ? mates[0].id : "");
    const [amt, setAmt] = React.useState("");
    const isMat = payload && payload.kind === "materials";
    React.useEffect(() => { if (open) { setTarget(mates[0] ? mates[0].id : ""); setAmt(""); } }, [open]);
    if (!payload) return null;
    const label = isMat ? "Materials" : (payload.subject ? payload.subject.name : "");
    const canGo = target && (!isMat || (parseInt(amt, 10) > 0));
    const confirm = () => { if (canGo) onConfirm({ ...payload, target, amount: isMat ? parseInt(amt, 10) : 1 }); };
    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal sf-modal--sm" + (open ? " open" : "")} role="dialog" aria-label="Give">
          <div className="sf-modal__head">
            <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Ic name="gift" /></span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">Hand it across the table</span>
              <h2>Give {label}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            <div className="sf-give__roster">
              {mates.map((r) => (
                <button key={r.id} className={"sf-give__mate" + (target === r.id ? " is-active" : "")} onClick={() => setTarget(r.id)}>
                  <span className={"sf-avatar t-" + r.tone}>{r.initials}</span>
                  <span className="sf-give__mate-meta">
                    <span className="sf-give__mate-name">{r.name}</span>
                    <span className="sf-give__mate-house">{r.house} House</span>
                  </span>
                  {target === r.id ? <Ic name="check" className="sf-give__check" /> : null}
                </button>
              ))}
            </div>
            {isMat ? (
              <Input label="Amount" type="number" min="1" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
            ) : (
              <p className="sf-modal__hint"><Ic name="info" /> {label} will leave your sheet. The recipient adds it to theirs at the table.</p>
            )}
          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" iconLeft={<Ic name="gift" />} disabled={!canGo} onClick={confirm}>Give{isMat && amt ? " " + amt : ""}</Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ===================== Manual add (adaptive form) =================== */
  const MANUAL_CFG = {
    artifact: { title: "New artifact", eyebrow: "The Reliquary", icon: "gem",
      fields: [["name", "Name", "text"], ["subject", "Field", "subject"], ["level", "Level", "select:Basic,Standard,Advanced,Legendary,Twisted"], ["intensity", "Intensity", "spinless"], ["skill", "Skill", "skillselect"], ["dc", "DC", "spinless"], ["desc", "Description", "area"]],
      placeholders: { name: "e.g. Skysplitter", desc: "What does the artifact do?" } },
    recipe: { title: "New Potion Recipe", eyebrow: "ON THE BURNER", icon: "scroll-text",
      fields: [["name", "Name", "text"], ["intensity", "Intensity", "spinless"], ["cost", "Cost", "spinless"], ["twisted", "Twisted", "switch"], ["desc", "Description", "area"]],
      placeholders: { name: "e.g. Angel's Balm", desc: "What does the potion do?" } },
    potion: { title: "New Potion", eyebrow: "TRICK VIAL", icon: "flask-conical",
      fields: [["name", "Name", "text"], ["intensity", "Intensity", "spinless"], ["twisted", "Twisted", "switch"], ["desc", "Description", "area"]],
      placeholders: { name: "e.g. Angel's Balm", desc: "What does the potion do?" } },
    plant: { title: "New plant", eyebrow: "THE GARDEN", icon: "leaf", fields: [], placeholders: { name: "e.g. Passionoak", desc: "What kind of plant is this?", ability: "What benefit does the plant provide?" } },
    wand: { title: "New wand", eyebrow: "THE WAND STUDIO", icon: "wand-2", fields: [] },
    glyph: { title: "New glyph", eyebrow: "RUNIC LIBRARY", icon: "pen-tool",
      fields: [["name", "Name", "text"], ["cost", "Cost", "number"], ["intensity", "Intensity", "number"], ["desc", "Description", "area"]],
      placeholders: { name: "e.g. Sight", desc: "What domain does this glyph represent?" } },
    item: { title: "New item", eyebrow: "The Stockpile", icon: "package",
      fields: [["name", "Name", "text"], ["qty", "Quantity", "number"], ["desc", "Description", "area"]],
      itemSwitches: [["singleUse", "Single-use"], ["hasMove", "Associated move"]],
      placeholders: { name: "e.g. Dragon Diver", desc: "What does the item do?" } },
  };

  /* ---- Wand › Grants spell helpers ---- */
  function WandSpellCompendium({ f, set, compendiumSpells }) {
    const q = (f.spellSearch || "").toLowerCase();
    const matches = q.length >= 3 ? (compendiumSpells || []).filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8) : [];
    const rowStyle = (selected) => ({
      display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%",
      padding: "var(--space-2) var(--space-3)",
      background: selected ? "var(--ink-700)" : "var(--ink-800)",
      border: "1px solid " + (selected ? "var(--border-default)" : "var(--border-subtle)"),
      borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--ink-100)",
      textAlign: "left", fontSize: "0.875rem",
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Input label="Search spells" placeholder="e.g. Spectral Strike" value={f.spellSearch || ""} onChange={(e) => set("spellSearch", e.target.value)} />
        {matches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxHeight: "188px", overflowY: "auto" }}>
            {matches.map((sp) => {
              const sel = f.spellCompId === sp.id;
              return (
                <button key={sp.id} type="button" style={rowStyle(sel)}
                  onClick={() => { set("spellCompId", sp.id); set("grantedSpell", { id: sp.id, name: sp.name, level: sp.level, subjectKey: sp.subjectKey, subject: sp.subject, school: sp.school, stat: sp.stat, ap: sp.ap, dc: sp.dc, ritual: !!sp.ritual, volatile: !!sp.volatile, days: 0, desc: sp.desc || "" }); }}>
                  <span style={{ flex: 1, fontWeight: sel ? 600 : 400 }}>{sp.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-400)", whiteSpace: "nowrap" }}>{sp.subject}</span>
                  <span style={{ fontSize: "0.7rem", padding: "1px 6px", background: "var(--ink-600)", borderRadius: "var(--radius-pill)", color: "var(--gold-300)", whiteSpace: "nowrap" }}>{sp.level}</span>
                  {sel && <Ic name="check" style={{ color: "var(--forest-400)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
        {!matches.length && q.length >= 3 && <p className="sf-modal__hint"><Ic name="search" /> No spells match “{f.spellSearch}”</p>}
        {q.length > 0 && q.length < 3 && <p className="sf-modal__hint"><Ic name="search" /> Type at least 3 letters to search.</p>}
      </div>
    );
  }

  function WandSpellManual({ f, set, schools }) {
    const subjectOpts = [{ value: "", label: "Choose a field…" }];
    const allSubs = [];
    (schools || []).forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
    allSubs.sort((a, b) => a.label.localeCompare(b.label));
    subjectOpts.push(...allSubs);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Input label="Name" placeholder="e.g. Spectral Strike" value={f.spellName || ""} onChange={(e) => set("spellName", e.target.value)} />
        <div className="sf-modal__row">
          <Select label="Field of magic" options={subjectOpts} value={f.spellSubjectKey || ""} onChange={(e) => set("spellSubjectKey", e.target.value)} />
          <Select label="Level" options={["Basic", "Standard", "Advanced", "Legendary", "Hex"]} value={f.spellLevel || "Basic"} onChange={(e) => set("spellLevel", e.target.value)} />
        </div>
        <div className="sf-modal__row">
          <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.spellDC || ""} onChange={(e) => set("spellDC", e.target.value)} /></div>
          <Select label="Base stat" options={[{ value: "", label: "Follows field" }, { value: "Focus", label: "Focus" }, { value: "Creativity", label: "Creativity" }, { value: "Logic", label: "Logic" }, { value: "Insight", label: "Insight" }, { value: "Body", label: "Body" }, { value: "Charm", label: "Charm" }]} value={f.spellStat || ""} onChange={(e) => set("spellStat", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-6)" }}>
          <div className="sf-modal__switch"><span className="sf-modal__switch-label">Ritual</span><Switch checked={!!f.spellRitual} onChange={(e) => set("spellRitual", e.target.checked)} /></div>
          <div className="sf-modal__switch"><span className="sf-modal__switch-label">Volatile</span><Switch checked={!!f.spellVolatile} onChange={(e) => set("spellVolatile", e.target.checked)} /></div>
        </div>
        <label className="sf-modal__field">
          <span className="sf-modal__label">Description</span>
          <textarea className="sf-modal__textarea" rows={2} value={f.spellDesc || ""} onChange={(e) => set("spellDesc", e.target.value)} />
        </label>
      </div>
    );
  }

  function PlantManualForm({ f, set, subjects, skills, cultivationCap, cultivationUsed }) {
    const tab = f.abilityTab || "active";
    const bonusType = f.bonusType || "none";
    const STATS = ["Focus", "Creativity", "Logic", "Insight", "Body", "Charm"];
    const statOpts = [{ value: "", label: "Choose a stat\u2026" }].concat(STATS.map((s) => ({ value: s, label: s })));
    const subjectOpts = [{ value: "", label: "Choose a subject\u2026" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
    const skillOpts = [{ value: "", label: "Choose a skill\u2026" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
    const newVal = parseInt(f.value, 10) || 0;
    const wouldExceed = cultivationCap > 0 && (cultivationUsed + newVal) > cultivationCap;
    const targetOpts = bonusType === "stat" ? statOpts : bonusType === "skill" ? skillOpts : subjectOpts;
    return (
      <div className="sf-manual__grid">
        <div className="sf-manual__full"><Input label="Name" placeholder="e.g. Passionoak" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div>
          <div className="sf-no-spin"><Input label="Value" type="number" min="0" placeholder="0" value={f.value || ""} onChange={(e) => set("value", e.target.value)} /></div>
          {wouldExceed ? <span className="sf-plant-cap-warn"><Ic name="alert-triangle" /> Exceeds cultivation capacity</span> : null}
        </div>
        <div className="sf-no-spin"><Input label="Intensity" type="number" min="1" placeholder="1" value={f.intensity || ""} onChange={(e) => set("intensity", e.target.value)} /></div>
        <label className="sf-modal__field sf-manual__full">
          <span className="sf-modal__label">Description</span>
          <textarea className="sf-modal__textarea" rows={2} placeholder="What kind of plant is this?" value={f.desc || ""} onChange={(e) => set("desc", e.target.value)} />
        </label>
        <label className="sf-modal__field sf-manual__full">
          <span className="sf-modal__label">Ability</span>
          <textarea className="sf-modal__textarea" rows={2} placeholder="What benefit does the plant provide?" value={f.ability || ""} onChange={(e) => set("ability", e.target.value)} />
        </label>
        <div className="sf-manual__full">
          <div className="sf-modal__field">
            <span className="sf-modal__label">Ability type</span>
            <div className="sf-move-type-row">
              <button type="button" className={"sf-move-type-btn" + (tab === "active" ? " is-on" : "")} onClick={() => set("abilityTab", "active")}>Active</button>
              <button type="button" className={"sf-move-type-btn" + (tab === "passive" ? " is-on" : "")} onClick={() => set("abilityTab", "passive")}>Passive</button>
            </div>
          </div>
          {tab === "active" ? (
            <div className="sf-plant-tabpane">
              <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}><Select label="Requires roll" options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "choose", label: "Choose" }]} value={f.requiresRoll || "no"} onChange={(e) => set("requiresRoll", e.target.value)} /></div>
                <div className="sf-modal__switch" style={{ paddingBottom: "9px", flexShrink: 0 }}><span className="sf-modal__switch-label">Single-use</span><Switch checked={!!f.singleUse} onChange={(e) => set("singleUse", e.target.checked)} /></div>
              </div>
            </div>
          ) : (
            <div className="sf-plant-tabpane">
              <Select label="Bonus type" options={[{ value: "none", label: "None" }, { value: "stat", label: "Stat" }, { value: "subject", label: "Subject" }, { value: "skill", label: "Skill" }]} value={bonusType} onChange={(e) => { set("bonusType", e.target.value); set("bonusTarget", ""); }} />
              {bonusType !== "none" ? (
                <React.Fragment>
                  <Select label="Bonus target" options={targetOpts} value={f.bonusTarget || ""} onChange={(e) => set("bonusTarget", e.target.value)} />
                  <div className="sf-no-spin"><Input label="Bonus value" type="number" placeholder="+0" value={f.bonusValue || ""} onChange={(e) => set("bonusValue", e.target.value)} /></div>
                  <button type="button" className={"sf-bcond" + (f.bonusConditional ? " is-on" : "")} onClick={() => set("bonusConditional", !f.bonusConditional)} aria-pressed={!!f.bonusConditional}>
                    <span className="sf-bcond__box"><Ic name="check" /></span>
                    Conditional — offer it as a per-roll choice instead of applying it live
                  </button>
                  {f.bonusConditional ? (
                    <input className="sf-bonus__note" type="text" value={f.bonusCondNote || ""} placeholder="Describe the condition — e.g. while the plant is held…" onChange={(e) => set("bonusCondNote", e.target.value)} />
                  ) : null}
                </React.Fragment>
              ) : null}
            </div>
          )}
        </div>
      </div>);
  }

  function ManualModal({ open, kind, subjects, skills, stats, schools, compendiumSpells, attuneFull, sheafFull, editSubject, onSave, onClose, cultivationCap = 0, cultivationUsed = 0 }) {
    const cfg = kind ? MANUAL_CFG[kind] : null;
    const [f, setF] = React.useState({});
    React.useEffect(() => {
      if (open) {
        let pre = {};
        if (editSubject) {
          if (kind === "artifact") pre = { name: editSubject.name, subject: editSubject.subjectKey || (subjects.find((s) => s.name === editSubject.subject) || {}).key || "", level: editSubject.level || "Basic", intensity: editSubject.intensity != null ? String(editSubject.intensity) : "", skill: (editSubject.move && editSubject.move.skill && editSubject.move.skill !== "\u2014") ? editSubject.move.skill : "", dc: editSubject.move && editSubject.move.dc != null ? String(editSubject.move.dc) : "", desc: editSubject.desc || "" };
          else if (kind === "wand") pre = { name: editSubject.name, cost: editSubject.maxCondition != null ? String(editSubject.maxCondition) : "", twisted: !!editSubject.twisted, desc: editSubject.desc || "" };
          else if (kind === "plant") pre = { name: editSubject.name, value: editSubject.value != null ? String(editSubject.value) : "", intensity: editSubject.intensity != null ? String(editSubject.intensity) : "", desc: editSubject.desc || "", ability: editSubject.ability || "", singleUse: !!editSubject.removeOnUse, requiresRoll: (editSubject.requiresRoll || "NO").toLowerCase(), abilityTab: editSubject.passive ? "passive" : "active", bonusType: editSubject.passive ? editSubject.passive.type : "none", bonusTarget: editSubject.passive ? editSubject.passive.target : "", bonusValue: editSubject.passive ? String(editSubject.passive.value || "") : "", bonusConditional: editSubject.passive ? !!editSubject.passive.conditional : false, bonusCondNote: editSubject.passive ? (editSubject.passive.condNote || "") : "" };
          else pre = { name: editSubject.name, intensity: editSubject.intensity != null ? String(editSubject.intensity) : "", cost: editSubject.cost != null ? String(editSubject.cost) : "", twisted: !!editSubject.twisted, desc: editSubject.desc || "" };
        }
        setF(pre);
        setTimeout(() => { const el = document.querySelector('.sf-modal.open input'); if (el) el.focus(); }, 80);
      }
    }, [open, kind]);
    if (!cfg) return null;
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const newPlantVal = kind === "plant" ? (parseInt(f.value, 10) || 0) : 0;
    const overCap = kind === "plant" && cultivationCap > 0 && (cultivationUsed + newPlantVal) > cultivationCap;
    const canSave = kind === "artifact"
      ? (f.name || "").trim() && (f.skill || "").trim() && (f.dc || "").toString().trim()
      : (f.name || "").trim() && !overCap;
    const wandStatOpts = [{ value: "", label: "Choose a stat…" }].concat((stats || []).map((s) => ({ value: s.name, label: s.name })));
    const wandSubjectOpts = [{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
    const wandSkillOpts = [{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
    const saveCraft = () => { if (canSave) { onSave(kind, { ...f, _crafting: true }); onClose(); } };
    const subjectOpts = [{ value: "", label: "Choose a field…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
    const save = () => { if (canSave) { onSave(kind, f); onClose(); } };
    const saveAttuned = () => { if (canSave) { onSave(kind, { ...f, attuned: true }); onClose(); } };
    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label={cfg.title}>
          <div className="sf-modal__head">
            <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Ic name={cfg.icon} /></span>
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">{cfg.eyebrow}</span>
              <h2>{cfg.title}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>
          <div className="sf-modal__body">
            {kind === "wand" ? (
              <div className="sf-manual__grid">
                <div className="sf-manual__full"><Input label="Name" placeholder="e.g. Sylene’s Crystal" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="sf-no-spin"><Input label="Cost" type="number" min="0" value={f.cost || ""} onChange={(e) => set("cost", e.target.value)} /></div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                  <div className="sf-modal__switch">
                    <span className="sf-modal__switch-label">Twisted</span>
                    <Switch checked={!!f.twisted} onChange={(e) => set("twisted", e.target.checked)} />
                  </div>
                </div>
                <div className="sf-manual__full">
                  <div className="sf-modal__switch">
                    <span className="sf-modal__switch-label">Grants move</span>
                    <Switch checked={!!f.grantsMove} onChange={(e) => set("grantsMove", e.target.checked)} />
                  </div>
                  {f.grantsMove && (
                    <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                      <div className="sf-modal__field">
                        <span className="sf-modal__label">Rolls with</span>
                        <div className="sf-move-type-row">
                          {[["stat","Stat"],["subject","Subject"],["skill","Skill"]].map(([val, lbl]) => (
                            <button key={val} type="button"
                              className={"sf-move-type-btn" + ((f.moveRollType || "stat") === val ? " is-on" : "")}
                              onClick={() => { set("moveRollType", val); set("moveStat",""); set("moveSubjectKey",""); set("moveSkill",""); }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(f.moveRollType || "stat") === "subject" ? (
                        <Select label="Subject" options={wandSubjectOpts} value={f.moveSubjectKey || ""} onChange={(e) => set("moveSubjectKey", e.target.value)} />
                      ) : (f.moveRollType || "stat") === "skill" ? (
                        <Select label="Skill" options={wandSkillOpts} value={f.moveSkill || ""} onChange={(e) => set("moveSkill", e.target.value)} />
                      ) : (
                        <Select label="Stat" options={wandStatOpts} value={f.moveStat || ""} onChange={(e) => set("moveStat", e.target.value)} />
                      )}
                      <div className="sf-modal__row">
                        <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.moveDC || ""} onChange={(e) => set("moveDC", e.target.value)} /></div>
                      </div>
                      <div className="sf-modal__switch">
                        <span className="sf-modal__switch-label">Can backfire on 1</span>
                        <Switch checked={!!f.moveBackfire} onChange={(e) => set("moveBackfire", e.target.checked)} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="sf-manual__full">
                  <div className="sf-modal__switch">
                    <span className="sf-modal__switch-label">Grants spell</span>
                    <Switch checked={!!f.grantsSpell} onChange={(e) => set("grantsSpell", e.target.checked)} />
                  </div>
                  {f.grantsSpell && (
                    <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                      <div className="sf-modal__field">
                        <div className="sf-move-type-row">
                          {[["compendium","Compendium"],["manual","Manual"]].map(([val, lbl]) => (
                            <button key={val} type="button"
                              className={"sf-move-type-btn" + ((f.spellTab || "compendium") === val ? " is-on" : "")}
                              onClick={() => set("spellTab", val)}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                      {(f.spellTab || "compendium") === "compendium"
                        ? <WandSpellCompendium f={f} set={set} compendiumSpells={compendiumSpells} />
                        : <WandSpellManual f={f} set={set} schools={schools} />}
                    </div>
                  )}
                </div>
                <label className="sf-modal__field sf-manual__full">
                  <span className="sf-modal__label">Description</span>
                  <textarea className="sf-modal__textarea" rows={3} placeholder="What does the wand do, and what benefits does it grant?" value={f.desc || ""} onChange={(e) => set("desc", e.target.value)} />
                </label>
              </div>
            ) : kind === "plant" ? (
              <PlantManualForm f={f} set={set} subjects={subjects} skills={skills} cultivationCap={cultivationCap} cultivationUsed={cultivationUsed} />
            ) : (
            <div className="sf-manual__grid">
              {kind === "item" ? (
                <React.Fragment>
                  {cfg.fields.slice(0, 2).map(([key, label, type]) => (
                    <Input key={key} label={label} type={type} placeholder={(cfg.placeholders && cfg.placeholders[key]) || undefined} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />
                  ))}
                  <div style={{ display: "flex", gap: "var(--space-6)", gridColumn: "1 / -1" }}>
                    {cfg.itemSwitches.map(([key, label]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center" }}>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">{label}</span><Switch checked={!!f[key]} onChange={(e) => set(key, e.target.checked)} /></div>
                      </div>
                    ))}
                  </div>
                  {f.hasMove && (
                    <div className="sf-manual__full" style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                      <div className="sf-modal__field">
                        <span className="sf-modal__label">Rolls with</span>
                        <div className="sf-move-type-row">
                          {[["stat","Stat"],["subject","Subject"],["skill","Skill"]].map(([val, lbl]) => (
                            <button key={val} type="button"
                              className={"sf-move-type-btn" + ((f.moveRollType || "stat") === val ? " is-on" : "")}
                              onClick={() => { set("moveRollType", val); set("moveStat",""); set("moveSubjectKey",""); set("moveSkill",""); }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(f.moveRollType || "stat") === "subject" ? (
                        <Select label="Subject" options={[{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })))} value={f.moveSubjectKey || ""} onChange={(e) => set("moveSubjectKey", e.target.value)} />
                      ) : (f.moveRollType || "stat") === "skill" ? (
                        <Select label="Skill" options={[{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })))} value={f.moveSkill || ""} onChange={(e) => set("moveSkill", e.target.value)} />
                      ) : (
                        <Select label="Stat" options={[{ value: "", label: "Choose a stat…" }].concat((stats || []).map((s) => ({ value: s.name, label: s.name })))} value={f.moveStat || ""} onChange={(e) => set("moveStat", e.target.value)} />
                      )}
                      <div className="sf-modal__row">
                        <div className="sf-no-spin"><Input label="DC (optional)" type="number" placeholder="—" value={f.moveDC || ""} onChange={(e) => set("moveDC", e.target.value)} /></div>
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-6)" }}>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Lost on failure</span><Switch checked={!!f.lostOnFailure} onChange={(e) => set("lostOnFailure", e.target.checked)} /></div>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Lost on backfire</span><Switch checked={!!f.lostOnBackfire} onChange={(e) => set("lostOnBackfire", e.target.checked)} /></div>
                      </div>
                    </div>
                  )}
                  {cfg.fields.slice(2).map(([key, label, type]) => {
                    if (type === "area") {
                      return (
                        <label key={key} className="sf-modal__field sf-manual__full">
                          <span className="sf-modal__label">{label}</span>
                          <textarea className="sf-modal__textarea" rows={3} placeholder={(cfg.placeholders && cfg.placeholders[key]) || ""} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />
                        </label>
                      );
                    }
                    return <Input key={key} label={label} type={type} placeholder={(cfg.placeholders && cfg.placeholders[key]) || undefined} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />;
                  })}
                </React.Fragment>
              ) : (
              <>{cfg.fields.map(([key, label, type]) => {
                if (type === "switch") {
                  return (
                    <React.Fragment key={key}>
                      <div className="sf-manual__full" style={{ display: "flex", alignItems: "center" }}>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">{label}</span><Switch checked={!!f[key]} onChange={(e) => set(key, e.target.checked)} /></div>
                      </div>
                      {kind === "item" && key === "hasMove" && f.hasMove && (
                        <div className="sf-manual__full" style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                          <div className="sf-modal__field">
                            <span className="sf-modal__label">Rolls with</span>
                            <div className="sf-move-type-row">
                              {[["stat","Stat"],["subject","Subject"],["skill","Skill"]].map(([val, lbl]) => (
                                <button key={val} type="button"
                                  className={"sf-move-type-btn" + ((f.moveRollType || "stat") === val ? " is-on" : "")}
                                  onClick={() => { set("moveRollType", val); set("moveStat",""); set("moveSubjectKey",""); set("moveSkill",""); }}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                          {(f.moveRollType || "stat") === "subject" ? (
                            <Select label="Subject" options={[{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })))} value={f.moveSubjectKey || ""} onChange={(e) => set("moveSubjectKey", e.target.value)} />
                          ) : (f.moveRollType || "stat") === "skill" ? (
                            <Select label="Skill" options={[{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })))} value={f.moveSkill || ""} onChange={(e) => set("moveSkill", e.target.value)} />
                          ) : (
                            <Select label="Stat" options={[{ value: "", label: "Choose a stat…" }].concat((stats || []).map((s) => ({ value: s.name, label: s.name })))} value={f.moveStat || ""} onChange={(e) => set("moveStat", e.target.value)} />
                          )}
                          <div className="sf-modal__row">
                            <div className="sf-no-spin"><Input label="DC (optional)" type="number" placeholder="—" value={f.moveDC || ""} onChange={(e) => set("moveDC", e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }
                if (type === "area") {
                  return (
                    <label key={key} className="sf-modal__field sf-manual__full">
                      <span className="sf-modal__label">{label}</span>
                      <textarea className="sf-modal__textarea" rows={3} placeholder={(cfg.placeholders && cfg.placeholders[key]) || ""} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />
                    </label>
                  );
                }
                if (type === "spinless") {
                  return <div key={key} className="sf-no-spin"><Input label={label} type="number" inputMode="numeric" min="0" placeholder={(cfg.placeholders && cfg.placeholders[key]) || undefined} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} /></div>;
                }
                if (type === "skillselect") {
                  const skillOpts = [{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
                  return <Select key={key} label={label} options={skillOpts} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />;
                }
                if (type === "subject") {
                  return <div key={key} className="sf-manual__full"><Select label={label} options={subjectOpts} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} /></div>;
                }
                if (type && type.startsWith("select:")) {
                  const opts = type.slice(7).split(",");
                  return <Select key={key} label={label} options={opts} value={f[key] || opts[0]} onChange={(e) => set(key, e.target.value)} />;
                }
                return <Input key={key} label={label} type={type} placeholder={(cfg.placeholders && cfg.placeholders[key]) || undefined} value={f[key] || ""} onChange={(e) => set(key, e.target.value)} />;
              })}</>
              )}
            </div>
            )}
          </div>
          <div className="sf-modal__foot">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {kind === "artifact" ? (
              <React.Fragment>
                {!editSubject && <Button variant="secondary" iconLeft={<Ic name="heart-plus" />} disabled={!canSave || attuneFull} onClick={saveAttuned}>Add attuned</Button>}
                <Button variant="primary" iconLeft={<Ic name={editSubject ? "check" : "plus"} />} disabled={!canSave} onClick={save}>{editSubject ? "Save changes" : "Add"}</Button>
              </React.Fragment>
            ) : kind === "wand" ? (
              <React.Fragment>
                <Button variant="secondary" iconLeft={<Ic name="hammer" />} disabled={!canSave} onClick={saveCraft}>Begin crafting</Button>
                <Button variant="primary" iconLeft={<Ic name="plus" />} disabled={!canSave} onClick={save}>Add</Button>
              </React.Fragment>
            ) : (
              <Button variant="primary" iconLeft={<Ic name={editSubject ? "check" : "plus"} />} disabled={!canSave || (kind === "potion" && sheafFull)} onClick={save}>{editSubject ? "Save changes" : kind === "potion" ? "Add to sheaf" : kind === "recipe" ? "Add to Recipes" : kind === "plant" ? "Add to cultivation" : kind === "glyph" ? "Add to library" : kind === "item" ? "Add to Inventory" : "Add to satchel"}</Button>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ============================ The page =============================== */
  function InventoryPage({ materials, caps, artifacts, potions, recipes, plants, wands, glyphs, items, runeStack, roster, activeChar, h }) {
    const heldCount = potions.reduce((s, p) => s + p.qty, 0);
    const heldFull = heldCount >= caps.potionCap;
    const knownRecipeNames = new Set(recipes.map((r) => r.name));
    const plantSum = plants.reduce((s, p) => s + (p.value || 0), 0);
    const attunedCount = artifacts.filter((a) => a.attuned).length;
    const attuneFull = attunedCount >= caps.attuneCap;
    const equippedWand = wands.find((w) => w.equipped);

    // --- collapsible card state ------------------------------------------------
    const [artifactOpenIds, setArtifactOpenIds] = React.useState(() => new Set());
    const allArtifactsOpen = artifacts.length > 0 && artifactOpenIds.size === artifacts.length;
    const toggleAllArtifacts = () => setArtifactOpenIds(allArtifactsOpen ? new Set() : new Set(artifacts.map((a) => a.id)));
    const toggleArtifact = (id) => setArtifactOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const [recipeOpenIds, setRecipeOpenIds] = React.useState(() => new Set());
    const allRecipesOpen = recipes.length > 0 && recipeOpenIds.size === recipes.length;
    const toggleAllRecipes = () => setRecipeOpenIds(allRecipesOpen ? new Set() : new Set(recipes.map((r) => r.id)));
    const toggleRecipe = (id) => setRecipeOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const [wandOpenIds, setWandOpenIds] = React.useState(() => new Set());
    const allWandsOpen = wands.length > 0 && wandOpenIds.size === wands.length;
    const toggleAllWands = () => setWandOpenIds(allWandsOpen ? new Set() : new Set(wands.map((w) => w.id)));
    const toggleWand = (id) => setWandOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const [plantOpenIds, setPlantOpenIds] = React.useState(() => new Set());
    const allPlantsOpen = plants.length > 0 && plantOpenIds.size === plants.length;
    const toggleAllPlants = () => setPlantOpenIds(allPlantsOpen ? new Set() : new Set(plants.map((pl) => pl.id)));
    const togglePlant = (id) => setPlantOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const [glyphOpenIds, setGlyphOpenIds] = React.useState(() => new Set());
    const allGlyphsOpen = glyphs.length > 0 && glyphOpenIds.size === glyphs.length;
    const toggleAllGlyphs = () => setGlyphOpenIds(allGlyphsOpen ? new Set() : new Set(glyphs.map((g) => g.id)));
    const toggleGlyph = (id) => setGlyphOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const [itemOpenIds, setItemOpenIds] = React.useState(() => new Set());
    const allItemsOpen = items.length > 0 && itemOpenIds.size === items.length;
    const toggleAllItems = () => setItemOpenIds(allItemsOpen ? new Set() : new Set(items.map((it) => it.id)));
    const toggleItem = (id) => setItemOpenIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const shelf = (id) => () => document.getElementById("shelf-" + id) && document.getElementById("shelf-" + id).scrollIntoView({ behavior: "smooth", block: "start" });
    const jump = [
      { id: "potions", label: "Potions", icon: "flask-conical", n: heldCount },
      { id: "artifacts", label: "Artifacts", icon: "gem", n: artifacts.length },
      { id: "wands", label: "Wands", icon: "wand-2", n: wands.length },
      { id: "plants", label: "Plants", icon: "leaf", n: plants.length },
      { id: "glyphs", label: "Glyphs", icon: "pen-tool", n: glyphs.length },
      { id: "items", label: "Items", icon: "package", n: items.length },
    ];

    return (
      <div className="sf-canvas sf-inv">
        <MaterialsBanner materials={materials} onAdjust={h.adjustMaterials} onGive={() => h.give("materials", null)} />

        <div className="sf-jump">
          {jump.map((j) => (
            <button key={j.id} className="sf-jump__btn" onClick={shelf(j.id)}>
              <Ic name={j.icon} /> {j.label}<span className="sf-jump__n">{j.n}</span>
            </button>
          ))}
        </div>

        {/* ---- Potions (held loadout sits up top, below Materials) ---- */}
        <section className="sf-shelf" id="shelf-potions">
          <ShelfHead icon="flask-conical" eyebrow="Held vials &amp; recipes" title="Potions"
            meter={<LimitMeter n={heldCount} cap={caps.potionCap} unit="held" over={false} />}
            onTake={(e) => h.takePotion({ name: "New Potion", desc: "Metabolize a potion to work it through your system and be prepared sooner to pop the next one." }, e.currentTarget)}
            onManual={() => h.openManual("potion")} onCompendium={() => h.openCompendium("potion")} disabledAdd={heldFull} />
          <div className="sf-sub">
            <div className="sf-sub__head"><span className="sf-sub__title"><Ic name="flask-conical" /> Potion Sheaf</span></div>
            <PotionLoadout potions={potions} cap={caps.potionCap} knownNames={knownRecipeNames} h={h} />
          </div>
          <div className="sf-sub">
            <div className="sf-sub__head"><span className="sf-sub__title"><Ic name="scroll-text" /> Potion Recipes</span><span className="sf-sub__count">{recipes.length} known</span>
              <div className="sf-sub__actions">
                {recipes.length > 0 && <button className="sf-ghost-btn" onClick={toggleAllRecipes}><Ic name={allRecipesOpen ? "chevrons-up" : "chevrons-down"} /> {allRecipesOpen ? "Collapse" : "Expand"}</button>}
                <button className="sf-ghost-btn" onClick={() => h.openManual("recipe")}><Ic name="pencil-line" /> Add recipe</button>
                <Button variant="primary" size="sm" iconLeft={<Ic name="book-open-text" />} onClick={() => h.openCompendium("potion")}>Compendium</Button>
              </div>
            </div>
            {recipes.length ? (
              <div className="sf-itemgrid">
                {recipes.map((r) => <RecipeCard key={r.id} r={r} heldFull={heldFull} h={h} open={recipeOpenIds.has(r.id)} onToggle={() => toggleRecipe(r.id)} />)}
              </div>
            ) : <EmptyShelf icon="scroll-text" text="No recipes learned yet." small />}
          </div>
        </section>

        {/* ---- Artifacts ---- */}
        <section className="sf-shelf" id="shelf-artifacts">
          <ShelfHead icon="gem" eyebrow="Concentrated power" title="Artifacts"
            meter={<LimitMeter n={attunedCount} cap={caps.attuneCap} unit="attuned" over={false} />}
            onToggleAll={artifacts.length ? toggleAllArtifacts : undefined} allOpen={allArtifactsOpen}
            onManual={() => h.openManual("artifact")} onCompendium={() => h.openCompendium("artifact")} />
          <p className="sf-shelf__rule-note"><Ic name="info" /> Any number may be carried; you can attune to <b>{caps.attuneCap}</b> at once (3 + 1 per 5 ranks of Artificy). Use Attune to attempt an attunement, and Repair to fix a damaged artifact.</p>
          {artifacts.length ? (
            <div className="sf-itemgrid">
              {artifacts.map((a) => <ArtifactCard key={a.id} art={a} attuneFull={attuneFull} h={h} open={artifactOpenIds.has(a.id)} onToggle={() => toggleArtifact(a.id)} />)}
            </div>
          ) : <EmptyShelf icon="gem" text="No artifacts yet." />}
        </section>

        {/* ---- Wands ---- */}
        <section className="sf-shelf" id="shelf-wands">
          <ShelfHead icon="wand-2" eyebrow="Casting channel" title="Wands"
            meter={<span className="sf-equipread">{equippedWand ? <React.Fragment><Ic name="check-circle" /> {equippedWand.name}</React.Fragment> : <React.Fragment><Ic name="circle-dashed" /> none equipped</React.Fragment>}</span>}
            onToggleAll={wands.length ? toggleAllWands : undefined} allOpen={allWandsOpen}
            onManual={() => h.openManual("wand")} onCompendium={() => h.openCompendium("wand")} />
          <p className="sf-shelf__rule-note"><Ic name="info" /> Carry any number, but only <b>one</b> can be equipped at a time.</p>
          {wands.length ? (
            <div className="sf-itemgrid">
              {wands.map((w) => <WandCard key={w.id} w={w} h={h} open={wandOpenIds.has(w.id)} onToggle={() => toggleWand(w.id)} />)}
            </div>
          ) : <EmptyShelf icon="wand-2" text="No wands in the satchel yet." />}
        </section>

        {/* ---- Plants ---- */}
        <section className="sf-shelf" id="shelf-plants">
          <ShelfHead icon="leaf" eyebrow="Cultivation" title="Plants"
            meter={<LimitMeter n={plantSum} cap={caps.plantCap} unit="value" over={plantSum > caps.plantCap} />}
            onRefreshAll={h.refreshAllPlants}
            onToggleAll={plants.length ? toggleAllPlants : undefined} allOpen={allPlantsOpen}
            onManual={() => h.openManual("plant")} onCompendium={() => h.openCompendium("plant")} />
          <p className="sf-shelf__rule-note"><Ic name="info" /> Total Material value may not exceed <b>{caps.plantCap}</b> (50 × your Herbalism rank) materials' worth of plants. Use a plant's ability, or harvest it to collect materials.</p>
          {plants.length ? (
            <div className="sf-itemgrid">
              {plants.map((pl) => <PlantCard key={pl.id} pl={pl} h={h} open={plantOpenIds.has(pl.id)} onToggle={() => togglePlant(pl.id)} />)}
            </div>
          ) : <EmptyShelf icon="leaf" text="No plants yet." />}
        </section>

        {/* ---- Glyphs + forge ---- */}
        <section className="sf-shelf" id="shelf-glyphs">
          <ShelfHead icon="pen-tool" eyebrow="Compose a rune" title="Glyphs"
            onManual={() => h.openManual("glyph")} onCompendium={() => h.openCompendium("glyph")} />
          <p className="sf-shelf__rule-note"><Ic name="info" /> Stack glyphs into the forge to build a rune, then roll <b>Runology</b> and then roll to inscribe it.</p>
          {glyphs.length ? (
            <GlyphForge glyphs={glyphs} runeStack={runeStack} h={h} glyphOpenIds={glyphOpenIds} toggleGlyph={toggleGlyph} toggleAllGlyphs={toggleAllGlyphs} allGlyphsOpen={allGlyphsOpen} />
          ) : <EmptyShelf icon="pen-tool" text="No glyphs yet." />}
        </section>

        {/* ---- Misc ---- */}
        <section className="sf-shelf" id="shelf-items">
          <ShelfHead icon="package" eyebrow="Everything else" title="Items"
            onToggleAll={items.length ? toggleAllItems : undefined} allOpen={allItemsOpen}
            onManual={() => h.openManual("item")} onCompendium={() => h.openCompendium("item")} />
          {items.length ? (
            <div className="sf-itemgrid">
              {items.map((it) => <ItemCard key={it.id} it={it} h={h} open={itemOpenIds.has(it.id)} onToggle={() => toggleItem(it.id)} />)}
            </div>
          ) : <EmptyShelf icon="package" text="No items yet." small />}
        </section>
      </div>
    );
  }

  function EmptyShelf({ icon, text, small }) {
    return (
      <div className={"sf-empty-shelf" + (small ? " is-small" : "")}>
        <Ic name={icon} />
        <p>{text}</p>
      </div>
    );
  }

  Object.assign(window, {
    SF_InventoryPage: InventoryPage,
    SF_GiveModal: GiveModal,
    SF_ChoosePlantModal: ChoosePlantModal,
    SF_ManualInv: ManualModal,
  });
})();
