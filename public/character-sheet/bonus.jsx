/* ===========================================================================
   Starfall Academy — Bonus editor modal
   Add a new bonus, or expand / edit / delete an existing one. Every target
   kind in SF_BONUS.TYPES is reachable here, and the value can be a flat number
   or a class rank that scales live with that class.
   Export: window.SF_BonusEditor
   =========================================================================== */
(function () {
  const SA = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, IconButton, Switch, Input, Select } = SA;
  const B  = window.SF_BONUS;
  const Ic = window.SF_Ic;

  function BonusEditor({ open, bonus, mode, ctx, classes, onSave, onDelete, onClose }) {
    const PRIMARY_IDS = ["stat", "subject", "skill"];
    const [f, setF] = React.useState(() => bonus || B.blank());
    const [moreOpen, setMoreOpen] = React.useState(false);
    React.useEffect(() => {
      if (open) {
        const b = bonus || B.blank();
        setF(b);
        setMoreOpen(!PRIMARY_IDS.includes(b.type));
      }
    }, [open, bonus && bonus.id]);
    const set = (patch) => setF((p) => ({ ...p, ...patch }));

    const meta   = B.typeMeta(f.type) || {};
    const tneed  = B.needsTarget(f.type);                 // "req" | "opt" | "none"
    const opts   = tneed === "none" ? [] : B.targetOptions(meta.kind, ctx);
    const eligible = classes || [];                       // classes with rank ≥ 1
    const classRank = (k) => { const c = eligible.find((x) => x.id === k); return c ? c.rank : 0; };

    // When the type changes, clear a target that no longer fits.
    const pickType = (id) => {
      const m = B.typeMeta(id) || {};
      const nd = B.needsTarget(id);
      if (nd === "none") set({ type: id, target: "", targetLabel: "" });
      else {
        const list = B.targetOptions(m.kind, ctx);
        const still = list.find((o) => o.value === f.target);
        set({ type: id, target: still ? f.target : "", targetLabel: still ? f.targetLabel : "" });
      }
    };
    const pickTarget = (val) => {
      if (val === "__all") return set({ target: "", targetLabel: "" });
      const o = opts.find((x) => x.value === val);
      set({ target: val, targetLabel: o ? o.label : "" });
    };
    const pickClass = (id) => { const c = eligible.find((x) => x.id === id); set({ classKey: id, classLabel: c ? c.name : "" }); };

    const targetMissing = tneed === "req" && !f.target;
    const classMissing  = f.valueMode === "class" && !f.classKey;
    const canSave = f.source.trim() && !targetMissing && !classMissing;

    const save = () => {
      if (!canSave) return;
      const rec = {
        ...f,
        source: f.source.trim(),
        value: f.valueMode === "class" ? (f.value || 0) : (parseInt(f.value, 10) || 0),
        condNote: f.conditional ? (f.condNote || "") : "",
      };
      onSave(rec);
      onClose();
    };

    // Build the target dropdown's option list (+ optional "all" row).
    const targetSelectOpts = [];
    if (tneed === "opt") targetSelectOpts.push({ value: "__all", label: meta.allLabel || "All" });
    else if (tneed === "req") targetSelectOpts.push({ value: "", label: "Choose\u2026" });
    opts.forEach((o) => { if (o && o.value != null) targetSelectOpts.push({ value: o.value, label: o.label }); });
    const targetSelectValue = (tneed === "opt" && !f.target) ? "__all" : f.target;

    const liveClassRank = classRank(f.classKey);

    return (
      <React.Fragment>
        <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose}></div>
        <div className={"sf-modal sf-bonus-modal" + (open ? " open" : "")} role="dialog" aria-label={mode === "edit" ? "Edit bonus" : "Add bonus"}>
          <div className="sf-modal__head">
            <div className="sf-drawer__title">
              <span className="sf-eyebrow">{mode === "edit" ? "Expand or edit" : "Power channel"}</span>
              <h2>{mode === "edit" ? "Edit bonus" : "New bonus"}</h2>
            </div>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Ic name="x" /></IconButton>
          </div>

          <div className="sf-modal__body">
            <Input label="Source" placeholder="e.g. Champion's Wand" value={f.source} onChange={(e) => set({ source: e.target.value })} />

            {/* What does it modify? */}
            <div className="sf-modal__field">
              <span className="sf-modal__label">What it applies to</span>
              <div className="sf-move-type-row">
                {B.TYPES.filter((t) => PRIMARY_IDS.includes(t.id)).map((t) => (
                  <button key={t.id} type="button"
                    className={"sf-move-type-btn" + (f.type === t.id ? " is-on" : "")}
                    onClick={() => { pickType(t.id); setMoreOpen(false); }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button type="button"
                className={"sf-bmore-toggle" + (moreOpen ? " is-open" : "") + (!PRIMARY_IDS.includes(f.type) ? " has-sel" : "")}
                onClick={() => setMoreOpen((v) => !v)}>
                <Ic name={moreOpen ? "chevron-up" : "chevron-down"} />
                {!PRIMARY_IDS.includes(f.type) ? (B.typeMeta(f.type) ? B.typeMeta(f.type).label : "More options") : "More options"}
              </button>
              {moreOpen && (
                <div className="sf-bmore">
                  <div className="sf-bmore__chips">
                    {B.TYPES.filter((t) => !PRIMARY_IDS.includes(t.id)).map((t) => (
                      <button key={t.id} type="button"
                        className={"sf-bchip" + (f.type === t.id ? " is-on" : "")}
                        onClick={() => pickType(t.id)}>
                        <Ic name={t.icon} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Target — only when the type takes one */}
            {tneed !== "none" && (
              <div className="sf-modal__field">
                <Select
                  label={tneed === "opt" ? "Scope (optional)" : "Target"}
                  options={targetSelectOpts}
                  value={targetSelectValue}
                  onChange={(e) => pickTarget(e.target.value)}
                />
              </div>
            )}

            {/* Value: flat number OR a class rank that scales live */}
            <div className="sf-modal__field">
              <span className="sf-modal__label">Bonus value</span>
              <div className="sf-bseg">
                <button type="button" className={"sf-bseg__opt" + (f.valueMode === "flat" ? " is-on" : "")} onClick={() => set({ valueMode: "flat" })}>
                  <Ic name="hash" /> Flat number
                </button>
                <button type="button" className={"sf-bseg__opt" + (f.valueMode === "class" ? " is-on" : "")} onClick={() => set({ valueMode: "class" })}>
                  <Ic name="graduation-cap" /> Rank in a class
                </button>
                <button type="button" className={"sf-bseg__opt" + (f.valueMode === "dos" ? " is-on" : "")} onClick={() => set({ valueMode: "dos" })}>
                  <Ic name="layers" /> Degrees of success
                </button>
              </div>

              {(f.valueMode === "flat" || f.valueMode === "dos") ? (
                <div className="sf-bval-flat">
                  <div className="sf-bstep">
                    <button type="button" className="sf-bstep__btn" onClick={() => set({ value: (parseInt(f.value, 10) || 0) - 1 })} aria-label="Decrease"><Ic name="minus" /></button>
                    <input
                      className="sf-bstep__num" type="number" inputMode="numeric"
                      value={f.value}
                      onChange={(e) => set({ value: e.target.value === "" ? "" : (parseInt(e.target.value, 10) || 0) })}
                    />
                    <button type="button" className="sf-bstep__btn" onClick={() => set({ value: (parseInt(f.value, 10) || 0) + 1 })} aria-label="Increase"><Ic name="plus" /></button>
                  </div>
                  <span className="sf-bval-flat__hint">
                    {f.valueMode === "dos"
                      ? "Shifts the outcome tier up or down — does not add to the roll."
                      : "A fixed modifier. Use a negative number for a penalty."}
                  </span>
                </div>
              ) : eligible.length === 0 ? (
                <p className="sf-modal__hint sf-modal__hint--warn"><Ic name="alert-triangle" /> You hold no class at rank 1 or higher yet — earn a class rank to tie a bonus to it.</p>
              ) : (
                <div className="sf-bval-class">
                  <Select
                    label={null}
                    options={[{ value: "", label: "Choose a class\u2026" }, ...eligible.map((c) => ({ value: c.id, label: `${c.name} \u00b7 rank ${c.rank}` }))]}
                    value={f.classKey}
                    onChange={(e) => pickClass(e.target.value)}
                  />
                  {f.classKey ? (
                    <p className="sf-modal__hint"><Ic name="trending-up" /> Currently <b>+{liveClassRank}</b> — rises on its own whenever your {f.classLabel} rank does.</p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Live vs conditional */}
            <div className="sf-modal__field">
              <div className="sf-brow">
                <span className="sf-modal__label" style={{ margin: 0 }}>Apply live</span>
                <Switch checked={f.active} onChange={(e) => set({ active: e.target.checked })} />
              </div>
              <button
                type="button"
                className={"sf-bcond" + (f.conditional ? " is-on" : "")}
                onClick={() => set({ conditional: !f.conditional })}
                aria-pressed={f.conditional}
              >
                <span className="sf-bcond__box"><Ic name="check" /></span>
                Conditional — offer it as a per-roll choice instead of applying it live
              </button>
              {f.conditional && (
                <input
                  className="sf-bonus__note" type="text"
                  value={f.condNote || ""}
                  placeholder="Describe the condition — e.g. when you take 10 minutes…"
                  onChange={(e) => set({ condNote: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="sf-modal__foot">
            {mode === "edit" ? (
              <Button variant="ghost" iconLeft={<Ic name="trash-2" />} onClick={() => { onDelete && onDelete(f.id); onClose(); }}>Delete</Button>
            ) : (
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            )}
            <Button variant="primary" iconLeft={<Ic name={mode === "edit" ? "check" : "plus"} />} disabled={!canSave} onClick={save}>
              {mode === "edit" ? "Save bonus" : "Add bonus"}
            </Button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  window.SF_BonusEditor = BonusEditor;
})();
