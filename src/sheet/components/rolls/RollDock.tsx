"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { TONE_MIX } from "../../data/shared";
import { headline } from "../../data/roll-engine";
import { RollEntry, initialsOf, relTime } from "./RollEntry";
import type { Roll } from "../../types";

export interface RollDockProps {
  log: Roll[];
  open: boolean;
  onToggle: () => void;
  meId?: string | null;
}

export function RollDock({ log, open, onToggle, meId }: RollDockProps) {
  const [filter, setFilter] = React.useState("all");
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});
  const latest = log[0];

  const filters = [
    { id: "all", label: "All" },
    { id: "mine", label: "Mine" },
    { id: "party", label: "Party" },
    { id: "gm", label: "Game Master" },
  ];
  const match = (r: Roll) =>
    filter === "all" ? true
    : filter === "mine" ? r.who.id === meId
    : filter === "gm" ? !!r.who.gm
    : !r.who.gm && r.who.id !== meId;
  const items = log.filter(match);
  const toggleRow = (id: string) => setOpenRows((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className={"sf-dock" + (open ? " is-open" : "")}>
      <div className="sf-dock__panel">
        <div className="sf-dock__phead">
          <span className="sf-eyebrow">The Roll Log</span>
          <div className="sf-dock__filters">
            {filters.map((f) => (
              <button key={f.id} className={"sf-dock__filt" + (filter === f.id ? " is-active" : "")} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="sf-log-list">
          {items.length === 0 ? (
            <div className="sf-log-empty">
              <Icon name="dices" />
              <p>No rolls in this view yet.</p>
            </div>
          ) : (
            items.map((r) => {
              const hasDetail = !!(r.detail || r.success || r.fail || r.sitReason || (r.meta && r.meta.length));
              return (
                <div
                  key={r.id}
                  className={"sf-log-row out-" + headline(r).key + (hasDetail ? " has-detail" : "")}
                  onClick={hasDetail ? () => toggleRow(r.id) : undefined}
                >
                  <RollEntry roll={r} expanded={!!openRows[r.id]} compact affordance />
                  <span className="sf-log-time">{relTime(r.ts)}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="sf-dock__foot">
          <Icon name="eye-off" /> Secret rolls are kept by the Game Master and never appear here.
        </div>
      </div>

      <button className="sf-dock__bar" onClick={onToggle}>
        <span className="sf-dock__brand"><Icon name="dices" /> Roll Log</span>
        <span className="sf-dock__sep" />
        {latest ? (
          <span className={"sf-dock__latest out-" + headline(latest).key}>
            <span className={"sf-re-av" + (latest.who.gm ? " is-gm" : "")} style={{ background: TONE_MIX[latest.who.tone] || "var(--ink-600)" }}>
              {latest.who.initials || initialsOf(latest.who.name)}
            </span>
            <span className="sf-dock__lname">{latest.label}</span>
            <span className="sf-dock__lwho">· {latest.who.name}</span>
            <span style={{ flex: 1 }} />
            <span className="sf-dock__ltotal">{latest.total}</span>
          </span>
        ) : (
          <span className="sf-dock__empty">No rolls yet — roll a skill or move to begin.</span>
        )}
        <span className="sf-dock__count">{log.length}</span>
        <Icon name={open ? "chevron-down" : "chevron-up"} className="sf-dock__chev" />
      </button>
    </div>
  );
}
