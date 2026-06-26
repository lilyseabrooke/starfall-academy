"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { TONE_500, TONE_FG } from "../../data/shared";
import type { MagicSchool, Stat, Subject } from "../../types";

export interface SchoolCardProps {
  school: MagicSchool;
  facByName: (name: string) => Stat | undefined;
  subjectBonusFor: (key: string) => number;
  statBonusFor?: (name: string) => number;
  onRoll: (school: MagicSchool, sub: Subject, total: number, e: React.MouseEvent) => void;
  onImprove: (school: MagicSchool, sub: Subject, e: React.MouseEvent) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SchoolCard({ school, facByName, subjectBonusFor, statBonusFor, onRoll, onImprove, collapsed, onToggleCollapse }: SchoolCardProps) {
  const style = { "--fac-accent": TONE_500[school.tone], "--fac-accent-fg": TONE_FG[school.tone] } as React.CSSProperties;
  const best = Math.max(...school.subjects.map((s) => (facByName(s.stat) ? facByName(s.stat)!.rank : 0) + s.rank));
  return (
    <div className={"sf-fac sf-school" + (collapsed ? " is-collapsed" : "")} style={style}>
      <div
        className="sf-fac__head"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleCollapse && onToggleCollapse()}
        style={{ cursor: "pointer" }}
      >
        <span className="sf-fac__glyph"><Icon name={school.icon} /></span>
        <span className="sf-fac__id">
          <span className="sf-fac__name">{school.name}</span>
          <span className="sf-school__blurb">{school.blurb}</span>
        </span>
        <span className="sf-fac__rank">
          <span className="sf-fac__num">{best}</span>
          <span className="sf-fac__rankcap">Best</span>
        </span>
        <span style={{ marginLeft: "var(--space-2)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          <Icon name={collapsed ? "chevron-down" : "chevron-up"} />
        </span>
      </div>
      {!collapsed && (
        <div className="sf-fac__skills">
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
                    {bonus ? <span className={"sf-skill__bonus " + (bonus > 0 ? "pos" : "neg")}>{bonus > 0 ? "+" : "−"}{Math.abs(bonus)}</span> : null}
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
                <button className="sf-skill__roll" title={`Roll ${sub.name} · 2d10 + ${total}`} onClick={(e) => onRoll(school, sub, total, e)}><Icon name="dices" /></button>
                <button className="sf-skill__improve" title={`Improvement roll · 2d10 + ${sub.stat} ${facRank} vs DC ${10 + sub.rank}`} onClick={(e) => onImprove(school, sub, e)}><Icon name="trending-up" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
