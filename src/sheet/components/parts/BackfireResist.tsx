"use client";

import * as React from "react";
import { Button, IconButton, Input, Select } from "@/ds";
import { Icon } from "../Icon";
import { enchantDurationLabel } from "../../data/enchant";
import type { Condition, RollResist } from "../../types";

/** The roll awaiting a resist save — a real Roll or a GM-forced stub. */
export interface ResistRoll {
  id: string;
  label?: string;
  kind?: string;
  resist?: (RollResist & { dcPerDegree?: number }) | null;
  forced?: { condition: string; dc: number | null };
  dc?: number | null;
  degrees?: number | null;
  pass?: boolean | null;
}

export interface BackfireResistProps {
  open: boolean;
  roll: ResistRoll | null;
  conditions: Condition[];
  facRank: (name: string) => number;
  onResist: (opts: { condition: Condition; dc: number | null; mod: number }) => void;
  onClose: () => void;
}

export function BackfireResist({ open, roll, conditions, facRank, onResist, onClose }: BackfireResistProps) {
  const [cond, setCond] = React.useState("wound");
  const [dc, setDc] = React.useState("");
  const rcfg = (roll && roll.resist) || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (open && roll) {
      if (roll.forced) {
        const fc = roll.forced.condition;
        setCond(conditions.find((c) => c.id === fc) ? fc : conditions[0].id);
        setDc(roll.forced.dc != null ? String(roll.forced.dc) : "");
        return;
      }
      const want = (rcfg && rcfg.condition) || "wound";
      setCond(conditions.find((c) => c.id === want) ? want : conditions[0].id);
      if (rcfg && rcfg.dcPerDegree) setDc(String(Math.max(1, rcfg.dcPerDegree * (roll.degrees || 1))));
      else setDc(roll.dc != null ? String(Math.max(1, roll.dc - 4)) : "");
    }
  }, [open, roll && roll.id]);
  if (!roll) return null;
  const condObj = conditions.find((c) => c.id === cond) || conditions[0];
  const mod = facRank(condObj.resist);
  const cast = roll.pass;
  const isEnchant = roll.kind === "enchant";
  const resist = () => {
    onResist({ condition: condObj, dc: dc === "" ? null : parseInt(dc, 10), mod });
    onClose();
  };
  return (
    <React.Fragment>
      <div className={"sf-scrim sf-scrim--bf" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal sf-modal--bf" + (open ? " open" : "")} role="dialog" aria-label={rcfg ? "Resist" : "Backfire — resist"}>
        <div className="sf-modal__head">
          <span className="sf-bf-modal__glyph"><Icon name="flame" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">{roll.label} · {rcfg ? rcfg.eyebrow || "Resist" : "Backfire"}</span>
            <h2>{rcfg ? rcfg.heading || "Resist the recoil" : "Resist the recoil"}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <p className={"sf-bf-modal__verdict" + (cast ? " is-cast" : cast === false ? " is-failed" : "")}>
            {rcfg ? (
              <React.Fragment><Icon name="flame" /><span>{rcfg.verdict || "The magic recoils. Choose what it costs you to resist."}</span></React.Fragment>
            ) : cast ? (
              isEnchant ? (
                <React.Fragment><Icon name="circle-check" /><span>You place an enchantment lasting <b>{enchantDurationLabel(roll.degrees || 1)}</b>, and you burn your magic in the process.</span></React.Fragment>
              ) : (
                <React.Fragment><Icon name="circle-check" /><span>The spell <b>still takes hold</b> — {roll.degrees} {roll.degrees === 1 ? "degree" : "degrees"} of success — but the recoil demands a save.</span></React.Fragment>
              )
            ) : cast === false ? (
              <React.Fragment><Icon name="circle-x" /><span>{isEnchant ? "The enchantment sparks out, and your magic burns." : "The casting fails, and the loosed magic turns back on you."}</span></React.Fragment>
            ) : (
              <React.Fragment><Icon name="flame" /><span>The magic recoils. Choose what it costs you to resist.</span></React.Fragment>
            )}
          </p>
          <div className="sf-modal__row">
            <Select label="Condition to resist" options={conditions.map((c) => ({ value: c.id, label: c.name }))} value={cond} onChange={(e) => setCond(e.target.value)} />
            <Input label="Save DC" type="number" placeholder="—" value={dc} onChange={(e) => setDc(e.target.value)} />
          </div>
          <p className="sf-modal__hint"><Icon name="info" /> This save rolls {condObj.resist} ({mod >= 0 ? "+" : "−"}{Math.abs(mod)}).</p>
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Shrug it off</Button>
          <Button variant="primary" iconLeft={<Icon name="dices" />} onClick={resist}>Roll {condObj.resist} save{dc !== "" ? " · DC " + dc : ""}</Button>
        </div>
      </div>
    </React.Fragment>
  );
}
