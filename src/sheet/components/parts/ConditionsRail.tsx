"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type { Condition } from "../../types";

export interface ConditionsRailProps {
  conditions: Condition[];
  onStep: (id: string, delta: number) => void;
  onRoll: (cd: Condition, e: React.MouseEvent) => void;
}

export function ConditionsRail({ conditions, onStep, onRoll }: ConditionsRailProps) {
  return (
    <div className="sf-conditions">
      {conditions.map((cd) => (
        <div key={cd.id} className={"sf-cond" + (cd.value >= 2 ? " is-active" : "")}>
          <div className="sf-cond__top">
            <span className="sf-cond__name">{cd.name}</span>
            <span className="sf-cond__pips">
              {Array.from({ length: cd.max }).map((_, i) => (
                <span key={i} className={"sf-pip" + (i < cd.value ? " on" : "")} />
              ))}
            </span>
          </div>
          <div className="sf-cond__foot">
            <button
              className="sf-cond__resist sf-cond__roll"
              title={`Roll Resist ${cd.name} · 2d10 + ${cd.resist}`}
              onClick={(e) => onRoll(cd, e)}
            >
              <Icon name="dices" /> Resist <b>{cd.resist}</b>
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
