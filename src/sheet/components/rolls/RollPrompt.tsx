"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { subLabel } from "./RollEntry";
import { spellCrit, spellMaterialCost } from "../../data/roll-engine";
import type { ConfirmPromptOpts, PendingPrompt } from "../../state/useRollState";

export interface RollPromptProps {
  pending: PendingPrompt | null;
  onConfirm: (opts: ConfirmPromptOpts) => void;
  onCancel: () => void;
}

export function RollPrompt({ pending, onConfirm, onCancel }: RollPromptProps) {
  const [dc, setDc] = React.useState("");
  const [sit, setSit] = React.useState("");
  const [asRitual, setAsRitual] = React.useState(false);
  const [matCost, setMatCost] = React.useState("0");
  const [spellMatCost, setSpellMatCost] = React.useState("0");
  const [hours, setHours] = React.useState("1");
  const [secret, setSecret] = React.useState(false);
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});
  const [stage, setStage] = React.useState<"form" | "warn">("form");
  const dcRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const p = pending ? pending.partial : null;
  const isSpell = !!p && p.kind === "spell";
  const isEnchant = !!p && p.kind === "enchant";
  const isWandcraft = !!p && p.kind === "wandcraft";
  const baseCost = isSpell ? spellMaterialCost(p!.spellLevel || "", p!.spellAp, false) : 0;
  const ritualCost = isSpell ? spellMaterialCost(p!.spellLevel || "", p!.spellAp, true) : 0;
  const canRitual = !!(p && p.canRitual);
  const condBonuses = (p && p.condBonuses) || [];
  const showCost = isSpell && (baseCost > 0 || ritualCost > 0);
  const hasSpellField = isEnchant && p != null && p.spellMatCost != null;
  const hasCost = showCost || isEnchant;
  const materials = p && p.materials != null ? p.materials : Infinity;
  const hasMatLimit = materials !== Infinity;
  const canSecret = !!(p && p.canSecret);
  const replacements = (p && p.replacements) || [];
  const dcLocked = !!(p && p.dcLocked);
  const replacingLabel = (p && p.replacingLabel) || null;
  const actionWord = isSpell ? "Cast" : isEnchant ? "Enchant" : "Roll";

  React.useEffect(() => {
    if (!pending) return;
    const pp = pending.partial;
    setDc(pp.dc != null ? String(pp.dc) : "");
    setSit("");
    setAsRitual(false);
    setPicked({});
    setSecret(false);
    setStage("form");
    setMatCost(pp.kind === "spell" ? String(spellMaterialCost(pp.spellLevel || "", pp.spellAp, false)) : pp.kind === "enchant" ? String(pp.baseMatCost ?? 0) : "0");
    setSpellMatCost(pp.kind === "enchant" && pp.spellMatCost != null ? String(pp.spellMatCost) : "0");
    setHours("1");
    const id = setTimeout(() => dcRef.current && dcRef.current.select(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending && pending.id]);

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const M = 12;
    const h = el.offsetHeight;
    const maxTop = window.innerHeight - M - h;
    const cur = parseFloat(el.style.top) || 0;
    if (cur > maxTop) el.style.top = Math.max(M, maxTop) + "px";
  });

  if (!pending || !p) return null;

  const base = p.mod || 0;
  const sitNum = parseInt(sit, 10) || 0;
  const condSum = condBonuses.reduce((s, b) => s + (picked[b.id] ? b.value : 0), 0);
  const combined = base + sitNum + condSum;
  const spellCostNum = hasSpellField ? parseInt(spellMatCost, 10) || 0 : 0;
  const costNum = hasCost ? (parseInt(matCost, 10) || 0) + spellCostNum : 0;

  const toggleRitual = (val: boolean) => {
    setAsRitual(val);
    if (showCost) setMatCost(String(spellMaterialCost(p.spellLevel || "", p.spellAp, val)));
  };

  const buildOpts = (ritual: boolean, cost: number): ConfirmPromptOpts => {
    const pickedList = condBonuses.filter((b) => picked[b.id]);
    const condMeta = pickedList.map((b) => b.source + " " + (b.value >= 0 ? "+" : "−") + Math.abs(b.value));
    const baseOpts: ConfirmPromptOpts = { dc: dc === "" ? null : parseInt(dc, 10), situational: sitNum, condBonus: condSum, condMeta, secret: canSecret && secret };
    if (isEnchant) return { ...baseOpts, matCost: cost, spellMatCost: hasSpellField ? spellCostNum : undefined, meta: (p.meta || []).concat([cost + " materials"]) };
    if (!isSpell) return { ...baseOpts, ...(isWandcraft ? { hours: Math.max(1, parseInt(hours, 10) || 1) } : {}) };
    const metaAdd: string[] = [];
    if (canRitual) metaAdd.push(ritual ? "Ritual · 1 Hour" : "Instant");
    if (showCost) metaAdd.push(cost + " materials");
    return {
      ...baseOpts,
      crit: spellCrit(p.spellLevel || "", ritual, !!p.spellVolatile),
      matCost: showCost ? cost : 0,
      asRitual: ritual,
      meta: (p.meta || []).concat(metaAdd),
    };
  };
  const commit = (over?: { asRitual?: boolean; matCost?: number }) => {
    over = over || {};
    const ritual = over.asRitual != null ? over.asRitual : asRitual;
    const cost = over.matCost != null ? over.matCost : costNum;
    onConfirm(buildOpts(ritual, cost));
  };
  const attempt = () => {
    if (hasCost && hasMatLimit && costNum > materials) {
      setStage("warn");
      return;
    }
    commit();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && stage === "form") {
      e.preventDefault();
      attempt();
    }
  };
  const bumpDc = (d: number) => setDc((v) => String(Math.max(1, (parseInt(v || "0", 10) || 0) + d)));
  const bumpSit = (d: number) => setSit((v) => String(Math.max(-20, Math.min(20, (parseInt(v || "0", 10) || 0) + d))));
  const bumpCost = (d: number) => setMatCost((v) => String(Math.max(0, (parseInt(v || "0", 10) || 0) + d)));
  const bumpSpellCost = (d: number) => setSpellMatCost((v) => String(Math.max(0, (parseInt(v || "0", 10) || 0) + d)));
  const bumpHours = (d: number) => setHours((v) => String(Math.max(1, (parseInt(v || "1", 10) || 1) + d)));
  const pickReplace = (opt: { onPick: (dc: number | null) => void }) => opt.onPick(dc === "" ? null : parseInt(dc, 10) || 0);

  const offerRitual = canRitual && !asRitual && hasMatLimit && ritualCost <= materials && ritualCost < costNum;

  const r = pending.rect;
  const W = 304;
  const M = 12;
  let estH = 280;
  if (isSpell && (canRitual || showCost)) {
    estH += 12 + 52;
    if (canRitual) estH += 40;
    if (showCost) estH += 40;
  }
  if (isEnchant) estH += 12 + 52 + (hasSpellField ? 52 : 0);
  if (isWandcraft) estH += 76;
  if (canSecret) estH += 52;
  if (replacingLabel) estH += 34;
  if (replacements.length) estH += 30 + replacements.length * 48;
  if (condBonuses.length) estH += 30 + condBonuses.length * 44;
  if (stage === "warn") estH = 270 + (offerRitual ? 56 : 0);
  const maxH = window.innerHeight - 2 * M;
  const boxH = Math.min(estH, maxH);
  const left = Math.min(Math.max(M, r.left), window.innerWidth - M - W);
  let top: number;
  if (r.bottom + 8 + boxH <= window.innerHeight - M) top = r.bottom + 8;
  else if (r.top - 8 - boxH >= M) top = r.top - 8 - boxH;
  else top = window.innerHeight - M - boxH;
  top = Math.max(M, Math.min(top, window.innerHeight - M - boxH));

  return (
    <React.Fragment>
      <div className="sf-prompt-catch" onClick={onCancel} />
      <div ref={boxRef} className="sf-prompt" style={{ left, top, width: W, maxHeight: maxH }} onKeyDown={onKeyDown} role="dialog" aria-label="Set difficulty">
        <div className="sf-prompt__head">
          <span className="sf-prompt__sub">{subLabel({ kind: p.kind || "skill", stat: p.stat || "", dc: null })} · 2d10 + {base}</span>
          <span className="sf-prompt__label">{p.label}</span>
        </div>

        {stage === "warn" ? (
          <div className="sf-prompt__warn">
            <span className="sf-prompt__warn-head"><Icon name="triangle-alert" /> Sparked out</span>
            <p className="sf-prompt__warn-txt">
              You need <b>{costNum.toLocaleString()}</b> materials, but you only have <b>{materials.toLocaleString()}</b>. {isSpell ? "Burn your magic and cast anyway?" : "Spend them anyway?"}
            </p>
            <div className="sf-prompt__warn-acts">
              {offerRitual && (
                <button className="sf-prompt__warn-btn is-primary" onClick={() => commit({ asRitual: true, matCost: ritualCost })}>
                  <Icon name="scroll-text" /> Cast as Ritual (1 Hour)
                </button>
              )}
              <button className="sf-prompt__warn-btn" onClick={() => commit({ matCost: materials })}>
                <Icon name="dices" /> Spend all {materials.toLocaleString()} &amp; {actionWord.toLowerCase()} anyway
              </button>
              <div className="sf-prompt__warn-row">
                <button className="sf-prompt__warn-btn is-ghost" onClick={() => setStage("form")}>
                  <Icon name="arrow-left" /> Back
                </button>
                <button className="sf-prompt__warn-btn is-ghost" onClick={onCancel}>
                  <Icon name="x" /> Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <React.Fragment>
            {replacingLabel && (
              <p className="sf-prompt__castnote">
                <Icon name="repeat" /> Casting in place of your {replacingLabel} check — same DC.
              </p>
            )}

            {replacements.length > 0 && (
              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Cast instead</span>
                <div className="sf-replace">
                  {replacements.map((opt) => (
                    <button key={opt.id} type="button" className="sf-replace__opt" onClick={() => pickReplace(opt)}>
                      <span className="sf-replace__body">
                        <span className="sf-replace__name">{opt.name}</span>
                        <span className="sf-replace__meta">{opt.subject} · 2d10 {opt.mod >= 0 ? "+ " + opt.mod : "− " + Math.abs(opt.mod)}</span>
                      </span>
                      {opt.ap ? <span className="sf-replace__ap">{opt.ap} AP</span> : null}
                      <Icon name="chevron-right" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSpell && (canRitual || showCost) && (
              <div className="sf-prompt__cast">
                <span className="sf-prompt__flabel">Casting
                  <span className="sf-prompt__casttime"><Icon name="clock" /> {canRitual ? (asRitual ? "1 Hour" : "Instant") : "Instant"}</span>
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

            {isEnchant && (
              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Enchanting materials</span>
                <div className="sf-prompt__row">
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpCost(-50)}>−</button>
                  <input className="sf-prompt__num sf-prompt__num--cost" type="number" inputMode="numeric" value={matCost} placeholder="0" onChange={(e) => setMatCost(e.target.value)} />
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpCost(50)}>+</button>
                  <span className={"sf-prompt__sithint" + (hasMatLimit && costNum > materials ? " is-short" : "")}>
                    Materials{hasMatLimit ? " · you have " + materials.toLocaleString() : ""}
                  </span>
                </div>
              </div>
            )}

            {hasSpellField && (
              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Spell materials</span>
                <div className="sf-prompt__row">
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpSpellCost(-50)}>−</button>
                  <input className="sf-prompt__num sf-prompt__num--cost" type="number" inputMode="numeric" value={spellMatCost} placeholder="0" onChange={(e) => setSpellMatCost(e.target.value)} />
                  <button className="sf-step" tabIndex={-1} onClick={() => bumpSpellCost(50)}>+</button>
                  <span className={"sf-prompt__sithint" + (hasMatLimit && costNum > materials ? " is-short" : "")}>
                    Materials{hasMatLimit ? " · you have " + materials.toLocaleString() : ""}
                  </span>
                </div>
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
            {canSecret && (
              <div className="sf-prompt__field">
                <span className="sf-prompt__flabel">Visibility</span>
                <div className="sf-prompt__seg">
                  <button className={"sf-prompt__segbtn" + (!secret ? " is-active" : "")} onClick={() => setSecret(false)}><Icon name="eye" /> Public</button>
                  <button className={"sf-prompt__segbtn" + (secret ? " is-active" : "")} onClick={() => setSecret(true)}><Icon name="eye-off" /> Secret</button>
                </div>
              </div>
            )}

            <div className="sf-prompt__field">
              <span className="sf-prompt__flabel">Difficulty
                {dcLocked
                  ? <span className="sf-prompt__lockhint"><Icon name="lock" /> {replacingLabel ? "from your " + replacingLabel + " check" : "carried over"}</span>
                  : <button className="sf-prompt__none" tabIndex={-1} onClick={() => setDc("")}>{dc === "" ? "No DC" : "Clear"}</button>}
              </span>
              {dcLocked ? (
                <div className="sf-prompt__row">
                  <span className="sf-prompt__dclock">{dc === "" ? "No DC" : "DC " + dc}</span>
                </div>
              ) : (
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
              )}
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
                      <span className="sf-condopt__box"><Icon name="check" /></span>
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
              <Icon name={canSecret && secret ? "eye-off" : isEnchant ? "sparkles" : "dices"} /> {canSecret && secret ? "Secretly " : ""}{actionWord} 2d10 {combined >= 0 ? "+ " + combined : "− " + Math.abs(combined)}{dc !== "" ? "  vs DC " + dc : ""}
            </button>
            <span className="sf-prompt__hint">Enter to {actionWord.toLowerCase()} · Esc to cancel</span>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
}
