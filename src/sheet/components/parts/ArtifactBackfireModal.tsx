"use client";

import * as React from "react";
import { Button, IconButton, Input } from "@/ds";
import { Icon } from "../Icon";
import { artifactBackfireDC } from "../../data/roll-engine";
import type { Roll } from "../../types";

export interface ArtifactBackfireModalProps {
  open: boolean;
  roll: Roll | null;
  effFacRank?: (name: string) => number;
  subRank?: (key: string) => number;
  onRoll: (situational: number) => void;
  onClose: () => void;
}

export function ArtifactBackfireModal({ open, roll, effFacRank, subRank, onRoll, onClose }: ArtifactBackfireModalProps) {
  const [sit, setSit] = React.useState("");
  // Start every new save at +0: reset during render when the roll changes (or clears).
  const rollId = roll ? roll.id : null;
  const [sitFor, setSitFor] = React.useState(rollId);
  if (sitFor !== rollId) { setSitFor(rollId); setSit(""); }
  if (!roll) return null;
  const level = roll.artifactLevel || "Basic";
  const cost = roll.artifactCost || 0;
  const curCond = roll.artifactCondition || "stable";
  const dc = artifactBackfireDC(level, cost);
  const mod = (effFacRank ? effFacRank("Creativity") : 0) + (subRank ? subRank("artificy") : 0);
  const sitNum = Math.max(-20, Math.min(20, parseInt(sit, 10) || 0));
  const total = mod + sitNum;
  const nextCond = curCond === "stable" ? "Damaged" : "Broken";
  const moveLanded = roll.pass === true;
  const moveFailed = roll.pass === false;
  const artName = (roll.label || "").replace(/^the\s+/i, "");
  return (
    <React.Fragment>
      <div className={"sf-scrim sf-scrim--bf" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal sf-modal--bf" + (open ? " open" : "")} role="dialog" aria-label="Artifact backfire — Artificy save">
        <div className="sf-modal__head">
          <span className="sf-bf-modal__glyph"><Icon name="cog" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">{roll.label} · Artifact Backfire</span>
            <h2>Overload</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <p className={"sf-bf-modal__verdict" + (moveFailed ? " is-failed" : moveLanded ? " is-cast" : "")}>
            <Icon name="flame" />
            <span>
              {moveLanded
                ? "Sparked it—but the " + artName + " overloads. Roll Artificy, DC" + dc + " to keep it from becoming " + nextCond + "."
                : "Sparked out! The " + artName + " overloads and blows your magic out. Roll Artificy, DC" + dc + " to keep it from becoming " + nextCond + "."}
            </span>
          </p>
          <dl className="sf-bf-stats">
            <div className="sf-bf-stats__cell"><dt>Save</dt><dd>Creativity <span>· Artificy</span></dd></div>
            <div className="sf-bf-stats__cell"><dt>DC</dt><dd>{dc} <span>· {level}</span></dd></div>
            <div className="sf-bf-stats__cell sf-bf-stats__cell--mod"><dt>Modifier</dt><dd>{total >= 0 ? "+" : "−"}{Math.abs(total)}{sitNum ? <span> · base {mod >= 0 ? "+" : "−"}{Math.abs(mod)}</span> : null}</dd></div>
          </dl>
          <div className="sf-bf-cond">
            <Icon name={curCond === "stable" ? "shield" : "shield-alert"} />
            <span className="sf-bf-cond__label">Artifact condition</span>
            <span className="sf-bf-cond__flow"><b>{curCond.charAt(0).toUpperCase() + curCond.slice(1)}</b><Icon name="arrow-right" /><b className="is-next">{nextCond}</b></span>
            <span className="sf-bf-cond__note">on a failed save</span>
          </div>
          <Input className="sf-no-spin" label="Situational modifier" type="number" inputMode="numeric" placeholder="0" hint="Applied to this roll only" value={sit} onChange={(e) => setSit(e.target.value)} />
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Shrug it off</Button>
          <Button variant="primary" iconLeft={<Icon name="dices" />} onClick={() => onRoll(sitNum)}>
            Overload · 2d10 {total >= 0 ? "+ " + total : "− " + Math.abs(total)} vs DC {dc}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
}
