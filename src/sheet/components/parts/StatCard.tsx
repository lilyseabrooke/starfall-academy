"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { TONE_500, TONE_FG } from "../../data/shared";
import type { Skill, Stat } from "../../types";

export interface StatCardProps {
  fac: Stat;
  bonusFor: (skillId: string) => number;
  statBonusFor?: (name: string) => number;
  universalBonusFor?: () => number;
  onRoll: (fac: Stat, sk: Skill, total: number, e: React.MouseEvent) => void;
  onImprove: (fac: Stat, sk: Skill, e: React.MouseEvent) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StatCard({ fac, bonusFor, statBonusFor, universalBonusFor, onRoll, onImprove, collapsed, onToggleCollapse }: StatCardProps) {
  const sbf = statBonusFor ? statBonusFor(fac.name) : 0;
  const ubf = universalBonusFor ? universalBonusFor() : 0;
  const effRank = fac.rank + sbf + ubf;
  const style = { "--fac-accent": TONE_500[fac.tone], "--fac-accent-fg": TONE_FG[fac.tone] } as React.CSSProperties;
  return (
    <div className={"sf-fac" + (collapsed ? " is-collapsed" : "")} style={style}>
      <div
        className="sf-fac__head"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggleCollapse && onToggleCollapse()}
        style={{ cursor: "pointer" }}
      >
        <span className="sf-fac__glyph"><Icon name={fac.icon} /></span>
        <span className="sf-fac__id">
          <span className="sf-fac__name">{fac.name}</span>
          <span className="sf-fac__formula">2d10 + {effRank}</span>
        </span>
        <span className="sf-fac__rank">
          <span className={"sf-fac__num" + (sbf ? " boosted" : "")}>{effRank}</span>
          <span className="sf-fac__rankcap">Rank</span>
        </span>
        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          <Icon name={collapsed ? "chevron-down" : "chevron-up"} />
        </span>
      </div>
      {!collapsed && (
        <div className="sf-fac__skills">
          {fac.skills.map((sk) => {
            const bonus = bonusFor(sk.id);
            const total = effRank + sk.rank + bonus;
            return (
              <div key={sk.id} className="sf-skill">
                <span className="sf-skill__name">
                  <span>{sk.name}</span>
                  <span className="sf-skill__sub">
                    <span className="sf-skill__stat"><b>{fac.name}</b> {effRank}</span>
                    {bonus ? <span className={"sf-skill__bonus " + (bonus > 0 ? "pos" : "neg")}>{bonus > 0 ? "+" : "−"}{Math.abs(bonus)}</span> : null}
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
                <button className="sf-skill__roll" title={`Roll ${sk.name} · 2d10 + ${total}`} onClick={(e) => onRoll(fac, sk, total, e)}><Icon name="dices" /></button>
                <button className="sf-skill__improve" title={`Improvement roll · 2d10 + ${fac.name} ${fac.rank} vs DC ${10 + sk.rank}`} onClick={(e) => onImprove(fac, sk, e)}><Icon name="trending-up" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
