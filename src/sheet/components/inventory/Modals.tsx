"use client";

import * as React from "react";
import { Button, IconButton, Input } from "@/ds";
import { Icon } from "../Icon";
import type { Plant } from "../../types";

export function ChoosePlantModal({ open, plant, onRoll, onJustUse, onClose }: { open: boolean; plant: Plant | null; onRoll: () => void; onJustUse: () => void; onClose: () => void }) {
  if (!plant) return null;
  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal sf-modal--sm" + (open ? " open" : "")} role="dialog" aria-label="Use plant">
        <div className="sf-modal__head">
          <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Icon name="leaf" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">How will you use it?</span>
            <h2>Use {plant.name}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <p className="sf-modal__hint"><Icon name="sparkles" /> {plant.ability || plant.desc}</p>
          <p className="sf-modal__hint"><Icon name="dices" /> You can roll Herbalism to use this plant, or simply use it without a roll.</p>
        </div>
        <div className="sf-modal__foot">
          <Button variant="secondary" iconLeft={<Icon name="check-check" />} onClick={onJustUse}>Use without rolling</Button>
          <Button variant="primary" iconLeft={<Icon name="dices" />} onClick={onRoll}>Roll to use</Button>
        </div>
      </div>
    </React.Fragment>
  );
}

export interface GivePayload {
  kind: string;
  subject?: { name: string };
  [k: string]: unknown;
}

export interface GiveRosterMember {
  id: string;
  name: string;
  house: string;
  tone: string;
  initials: string;
}

export function GiveModal({ open, payload, roster, activeChar, onConfirm, onClose }: {
  open: boolean;
  payload: GivePayload | null;
  roster: GiveRosterMember[];
  activeChar: string;
  onConfirm: (result: GivePayload & { target: string; amount: number }) => void;
  onClose: () => void;
}) {
  const mates = roster.filter((r) => r.id !== activeChar);
  const [target, setTarget] = React.useState(mates[0] ? mates[0].id : "");
  const [amt, setAmt] = React.useState("");
  const isMat = payload && payload.kind === "materials";
  React.useEffect(() => {
    if (open) {
      setTarget(mates[0] ? mates[0].id : "");
      setAmt("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!payload) return null;
  const label = isMat ? "Materials" : payload.subject ? payload.subject.name : "";
  const canGo = !!target && (!isMat || parseInt(amt, 10) > 0);
  const confirm = () => {
    if (canGo) onConfirm({ ...payload, target, amount: isMat ? parseInt(amt, 10) : 1 });
  };
  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal sf-modal--sm" + (open ? " open" : "")} role="dialog" aria-label="Give">
        <div className="sf-modal__head">
          <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Icon name="gift" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">Hand it across the table</span>
            <h2>Give {label}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <div className="sf-give__roster">
            {mates.map((r) => (
              <button key={r.id} className={"sf-give__mate" + (target === r.id ? " is-active" : "")} onClick={() => setTarget(r.id)}>
                <span className={"sf-avatar t-" + r.tone}>{r.initials}</span>
                <span className="sf-give__mate-meta">
                  <span className="sf-give__mate-name">{r.name}</span>
                  <span className="sf-give__mate-house">{r.house} House</span>
                </span>
                {target === r.id ? <Icon name="check" className="sf-give__check" /> : null}
              </button>
            ))}
          </div>
          {isMat ? (
            <Input label="Amount" type="number" min="1" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
          ) : (
            <p className="sf-modal__hint"><Icon name="info" /> {label} will leave your sheet. The recipient adds it to theirs at the table.</p>
          )}
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Icon name="gift" />} disabled={!canGo} onClick={confirm}>Give{isMat && amt ? " " + amt : ""}</Button>
        </div>
      </div>
    </React.Fragment>
  );
}
