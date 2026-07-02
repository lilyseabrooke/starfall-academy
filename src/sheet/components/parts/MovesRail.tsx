"use client";

import * as React from "react";
import { Badge, IconButton } from "@/ds";
import { Icon } from "../Icon";
import type { Move } from "../../types";

export type MoveRollHandler = (m: Move, e: React.MouseEvent, optIdx: number) => void;
export type MoveModFor = (m: Move, optIdx: number) => number;

function MoveCard({ m, onRoll, modFor, open, onToggle, onEdit, onRemove }: { m: Move; onRoll: MoveRollHandler; modFor: MoveModFor; open: boolean; onToggle: () => void; onEdit?: (m: Move) => void; onRemove?: (m: Move) => void }) {
  const broken = m.artifactCondition === "broken";
  const damaged = m.artifactCondition === "damaged";
  const opts = m.rollOptions && m.rollOptions.length ? m.rollOptions : null;
  const [sel, setSel] = React.useState(0);
  const i = opts ? Math.min(sel, opts.length - 1) : 0;
  const cur = opts ? opts[i] : { stat: m.stat, skill: m.skill, label: m.skill, kind: "skill" as const };
  const abilLabel = cur.kind === "subject" ? cur.label : cur.skill || cur.label;
  const showAbil = abilLabel && abilLabel !== "—";
  const editable = !m.fromArtifact && !m.fromWand && !m.fromPlant;
  const removable = editable && !m.fromClass;
  return (
    <div className={"sf-move" + (open ? " is-open" : " is-collapsed") + (m.fromArtifact ? " is-linked" : "") + (m.fromClass ? " is-classmove" : "") + (broken ? " is-broken" : "")}>
      <div className="sf-move__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-move__name">{m.name}</span>
        {showAbil ? <span className="sf-chip sf-chip--field sf-chip--head"><Icon name={cur.kind === "subject" ? "sparkles" : "zap"} /> {abilLabel}</span> : null}
        {m.dc != null ? <span className="sf-spell__head-dc">DC {m.dc}</span> : null}
        <Badge tone={broken ? "crimson" : damaged ? "neutral" : "gold"} square>{m.fromArtifact ? (broken ? "Broken" : damaged ? "Damaged" : "Artifact") : m.tag}</Badge>
        {broken ? null : (
          <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onRoll(m, e, i); }}><Icon name="dices" /> Roll</button>
        )}
        {editable && onEdit && <button className="sf-spell__edit" title="Edit move" onClick={(e) => { e.stopPropagation(); onEdit(m); }}><Icon name="pencil" /></button>}
        {removable && onRemove && <button className="sf-spell__remove" title="Remove move" onClick={(e) => { e.stopPropagation(); onRemove(m); }}><Icon name="x" /></button>}
        <span className="sf-spell__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
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
            {m.backfire ? <span className="sf-chip sf-chip--backfire"><Icon name="flame" /> Backfire</span> : null}
          </div>

          <p className="sf-move__desc">{m.desc}</p>
          {m.fromClass && m.rankConditional ? (
            <p className="sf-move__cond"><Icon name="info" /> Adds your {m.classLabel} rank when: {m.rankConditional}</p>
          ) : null}
          <div className="sf-move__foot">
            <span className="sf-move__formula">2d10 + {modFor(m, i)}{m.dc != null ? <span className="sf-move__dc"> · DC {m.dc}</span> : null}</span>
            {broken ? (
              <span className="sf-move__locked"><Icon name="ban" /> Artifact broken</span>
            ) : (
              <button className="sf-roll-btn" onClick={(e) => onRoll(m, e, i)}><Icon name="dices" /> Roll</button>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

export interface MovesRailProps {
  moves: Move[];
  onRoll: MoveRollHandler;
  modFor: MoveModFor;
  onAddManually: () => void;
  onEdit?: (m: Move) => void;
  onRemove?: (m: Move) => void;
}

export function MovesRail({ moves, onRoll, modFor, onAddManually, onEdit, onRemove }: MovesRailProps) {
  const [openIds, setOpenIds] = React.useState<Set<string>>(() => new Set());
  const allOpen = moves.length > 0 && openIds.size === moves.length;
  const toggleAll = () => {
    if (allOpen) setOpenIds(new Set());
    else setOpenIds(new Set(moves.map((m) => m.id)));
  };
  const toggleOne = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="sf-col" style={{ gap: "var(--space-3)" }}>
      <div className="sf-rail-head">
        <h3>Moves</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {moves.length > 0 && (
            <button className="sf-ghost-btn" onClick={toggleAll}>
              <Icon name={allOpen ? "chevrons-up" : "chevrons-down"} />
              {allOpen ? "Collapse" : "Expand"}
            </button>
          )}
          <IconButton label="Add move" variant="ghost" size="sm" onClick={onAddManually}><Icon name="plus" /></IconButton>
        </div>
      </div>
      {moves.map((m) => (
        <MoveCard key={m.id} m={m} onRoll={onRoll} modFor={modFor} open={openIds.has(m.id)} onToggle={() => toggleOne(m.id)} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </div>
  );
}
