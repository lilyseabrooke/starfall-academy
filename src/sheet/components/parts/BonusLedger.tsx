"use client";

import * as React from "react";
import { IconButton, Switch } from "@/ds";
import { Icon } from "../Icon";
import { typeLabel } from "../../data/bonus";
import type { Bonus } from "../../types";

export interface BonusLedgerProps {
  bonuses: Bonus[];
  resolveValue?: (b: Bonus) => number;
  onToggle: (id: string) => void;
  onToggleConditional?: (id: string) => void;
  onCondNote?: (id: string, note: string) => void;
  onAdd: () => void;
  onEdit?: (b: Bonus) => void;
}

export function BonusLedger({ bonuses, resolveValue, onToggle, onToggleConditional, onCondNote, onAdd, onEdit }: BonusLedgerProps) {
  return (
    <div className="sf-col" style={{ gap: "var(--space-3)" }}>
      <div className="sf-rail-head">
        <h3>Bonuses</h3>
        <IconButton label="Add bonus" variant="ghost" size="sm" onClick={onAdd}><Icon name="plus" /></IconButton>
      </div>
      <div className="sf-ledger" style={{ padding: 0, gap: "var(--space-2)" }}>
        {bonuses.map((b) => {
          const v = resolveValue ? resolveValue(b) : b.value || 0;
          const isClass = b.valueMode === "class";
          const isDos = b.valueMode === "dos";
          const typeName = typeLabel(b.type);
          return (
            <div key={b.id} className={"sf-bonus" + (b.active ? "" : " off") + (b.conditional ? " cond" : "")}>
              <span className="sf-bonus__src">{b.source || "Untitled bonus"}</span>
              <span className={"sf-bonus__val " + (v >= 0 ? "pos" : "neg") + (isClass ? " is-class" : "") + (isDos ? " is-dos" : "")}>
                <span>{v >= 0 ? "+" : "−"}{Math.abs(v)}</span>
                {isClass ? <span className="sf-bonus__valtag">{b.classLabel || "Class"} rank</span> : null}
                {isDos ? <span className="sf-bonus__valtag">tier</span> : null}
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
                  <span className="sf-bonus__condbox"><Icon name="check" /></span>
                  Conditional
                </button>
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <button type="button" className="sf-bonus__edit" title="Edit bonus" onClick={() => onEdit && onEdit(b)}><Icon name="pencil" /></button>
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
