"use client";

import * as React from "react";
import { Badge } from "@/ds";
import { Icon } from "../Icon";
import { TONE_MIX } from "../../data/shared";
import { headline } from "../../data/roll-engine";
import type { Roll } from "../../types";

export const initialsOf = (name: string) =>
  String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function subLabel(roll: Pick<Roll, "kind" | "stat" | "dc">) {
  const base =
    roll.kind === "skill" ? roll.stat + " check"
    : roll.kind === "resist" ? roll.stat + " save"
    : roll.kind === "metabolize" ? roll.stat + " · Metabolize roll"
    : roll.kind === "attune" ? roll.stat + " · Attunement roll"
    : roll.kind === "improve" ? roll.stat + " · Improvement roll"
    : roll.kind === "learn" ? roll.stat + " · Learning roll"
    : roll.kind === "repair" ? roll.stat + " · Artifact repair roll"
    : roll.kind === "wandcraft" ? roll.stat + " · Wandcraft roll"
    : roll.stat + " · " + cap(String(roll.kind));
  return roll.dc != null ? base + " · DC " + roll.dc : base;
}

const sitText = (v: number) => (v > 0 ? "+" : "−") + Math.abs(v);

export function relTime(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 8) return "just now";
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  return h + "h ago";
}

type BadgeTone = "gold" | "neutral" | "plum" | "forest" | "teal" | "crimson";

export interface RollEntryProps {
  roll: Roll;
  expanded?: boolean;
  compact?: boolean;
  affordance?: boolean;
  hint?: boolean;
}

export function RollEntry({ roll, expanded, compact, affordance, hint }: RollEntryProps) {
  const h = headline(roll);
  const hasDetail = !!(roll.detail || roll.success || roll.fail || roll.sitReason || roll.hl || (roll.meta && roll.meta.length));
  const avStyle = { background: TONE_MIX[roll.who.tone] || "var(--ink-600)" };
  const degrees = roll.degrees ?? 0;
  return (
    <div className={"sf-re out-" + h.key + (roll.crit ? " is-crit-" + roll.crit.kind : "")}>
      <div className="sf-re__head">
        <span className={"sf-re-av" + (roll.who.gm ? " is-gm" : "")} style={avStyle}>
          {roll.who.initials || initialsOf(roll.who.name)}
        </span>
        <span className="sf-re__who">
          <span className="sf-re__name">
            {roll.who.name}
            {roll.who.gm && <span className="sf-re__gm">Game Master</span>}
          </span>
          <span className="sf-re__stat">{subLabel(roll)}</span>
        </span>
        {h.label && <Badge tone={h.tone as BadgeTone} dot>{h.label}</Badge>}
        {affordance && hasDetail && <Icon name="chevron-down" className={"sf-re__chev" + (expanded ? " is-open" : "")} />}
      </div>

      <div className="sf-re__roll">
        <span className="sf-re__label">{roll.label}</span>
        <span className="sf-re__dice">
          {roll.dice.map((d, i) => (
            <span key={i} className={"sf-die" + (d === 10 ? " is-ten" : d === 1 ? " is-one" : "")}>{d}</span>
          ))}
          <span className="sf-re__mod">{roll.mod >= 0 ? "+" : "−"}{Math.abs(roll.mod)}</span>
          {roll.sit ? <span className="sf-re__sit">{sitText(roll.sit)}</span> : null}
          <span className="sf-re__eq">=</span>
          <span className="sf-re__total">{roll.total}</span>
        </span>
      </div>

      {roll.dc != null && (
        <div className={"sf-re__deg out-" + roll.result}>
          <span className="sf-re__deg-pips">
            {Array.from({ length: Math.min(degrees, 6) }).map((_, i) => <i key={i} />)}
            {degrees > 6 ? <span className="sf-re__deg-plus">+</span> : null}
          </span>
          <span className="sf-re__deg-label">{degrees} {degrees === 1 ? "degree" : "degrees"} of {roll.result}</span>
        </div>
      )}

      {roll.crit && (
        <div className={"sf-re__crit is-" + roll.crit.kind + (roll.crit.backfire ? " is-backfire" : "")}>
          <span className="sf-re__crit-glyph"><Icon name={roll.crit.kind === "success" ? "sparkles" : "flame"} /></span>
          <span className="sf-re__crit-txt">
            <b>{roll.crit.label}</b>
            {roll.crit.backfire
              ? roll.crit.artifactBackfire
                ? roll.pass === true ? "The move lands — but the artifact strains against you. Roll Artificy."
                  : roll.pass === false ? "The move fails, and the artifact strains against you. Roll Artificy."
                  : "A natural 1 — the artifact strains against you. Roll Artificy."
                : roll.pass ? "It casts — but the magic turns on you. Resist."
                  : roll.pass === false ? "The casting fails and turns on you. Resist."
                  : "The magic turns on you. Resist."
              : roll.crit.text || ""}
          </span>
        </div>
      )}

      {expanded && hasDetail && (
        <div className="sf-re__detail">
          {roll.sit && roll.sitReason ? (
            <p className="sf-re__sitline"><b>{sitText(roll.sit)} situational</b>{roll.sitReason}</p>
          ) : null}
          {roll.meta && roll.meta.length > 0 && (
            <div className="sf-re__chips">{roll.meta.map((m, i) => <span key={i} className="sf-chip">{m}</span>)}</div>
          )}
          {roll.detail && <p className="sf-re__desc">{roll.detail}</p>}
          {roll.dc != null && roll.hl ? (
            <p className={"sf-re__hl out-" + roll.result}>
              <b>{roll.result === "success" ? "At " + degrees + (degrees === 1 ? " degree" : " degrees") : degrees + (degrees === 1 ? " degree" : " degrees") + " of failure"}</b>
              {roll.hl(degrees, roll.result === "success")}
            </p>
          ) : roll.dc != null && (roll.success || roll.fail) ? (
            <div className="sf-re__io">
              {roll.result === "success" && roll.success && <p className="io-hit"><b>On a hit</b>{roll.success}</p>}
              {roll.result === "failure" && roll.fail && <p className="io-miss"><b>On a miss</b>{roll.fail}</p>}
            </div>
          ) : roll.success || roll.fail ? (
            <div className="sf-re__io">
              {roll.success && <p className="io-hit"><b>On a hit</b>{roll.success}</p>}
              {roll.fail && <p className="io-miss"><b>On a miss</b>{roll.fail}</p>}
            </div>
          ) : null}
        </div>
      )}

      {hint && compact && hasDetail && !expanded && (
        <div className="sf-rtoast__foot">
          <span className="sf-re__hint"><Icon name="scroll-text" /> Hover to read · click to keep</span>
        </div>
      )}
    </div>
  );
}
