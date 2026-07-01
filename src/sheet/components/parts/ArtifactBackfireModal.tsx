"use client";

import * as React from "react";
import { Button, IconButton } from "@/ds";
import { Icon } from "../Icon";
import { artifactBackfireDC } from "../../data/roll-engine";
import type { Roll } from "../../types";

export interface ArtifactBackfireModalProps {
  open: boolean;
  roll: Roll | null;
  effFacRank?: (name: string) => number;
  subRank?: (key: string) => number;
  onRoll: () => void;
  onClose: () => void;
}

export function ArtifactBackfireModal({ open, roll, effFacRank, subRank, onRoll, onClose }: ArtifactBackfireModalProps) {
  if (!roll) return null;
  const level = roll.artifactLevel || "Basic";
  const cost = roll.artifactCost || 0;
  const curCond = roll.artifactCondition || "stable";
  const dc = artifactBackfireDC(level, cost);
  const mod = (effFacRank ? effFacRank("Creativity") : 0) + (subRank ? subRank("artificy") : 0);
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
          <div className="sf-re__chips" style={{ marginBottom: "var(--space-3)" }}>
            <span className="sf-chip"><b>Stat</b> Creativity · Artificy</span>
            <span className="sf-chip"><b>DC</b> {dc} · {level}</span>
            <span className="sf-chip"><b>Modifier</b> {mod >= 0 ? "+" : "−"}{Math.abs(mod)}</span>
            <span className="sf-chip"><Icon name={curCond === "stable" ? "shield" : "shield-alert"} /> {curCond.charAt(0).toUpperCase() + curCond.slice(1)} → {nextCond}</span>
          </div>
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Shrug it off</Button>
          <Button variant="primary" iconLeft={<Icon name="dices" />} onClick={onRoll}>
            Overload · 2d10 {mod >= 0 ? "+ " + mod : "− " + Math.abs(mod)} vs DC {dc}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
}
