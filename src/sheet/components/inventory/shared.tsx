"use client";

/* Shared inventory-shelf controls, ported from inventory.jsx. */
import * as React from "react";
import { Button } from "@/ds";
import { Icon } from "../Icon";
import type { ArtifactCondition } from "../../types";

export function LimitMeter({ n, cap, unit, over, segMax = 8 }: { n: number; cap: number; unit?: string; over?: boolean; segMax?: number }) {
  const ratio = cap > 0 ? Math.min(1, n / cap) : 0;
  const segments = cap <= segMax && Number.isInteger(cap);
  return (
    <div className={"sf-meter" + (over ? " is-over" : "")}>
      <span className="sf-meter__read">
        <b>{n}</b><span className="sf-meter__slash">/</span>{cap}{unit ? <span className="sf-meter__unit"> {unit}</span> : null}
      </span>
      {segments ? (
        <span className="sf-meter__segs">
          {Array.from({ length: cap }).map((_, i) => <i key={i} className={i < n ? "on" : ""} />)}
        </span>
      ) : (
        <span className="sf-meter__bar"><i style={{ width: ratio * 100 + "%" }} /></span>
      )}
    </div>
  );
}

export interface ShelfHeadProps {
  icon: string;
  title: string;
  eyebrow: string;
  meter?: React.ReactNode;
  onManual?: () => void;
  onCompendium?: () => void;
  onTake?: () => void;
  onRefreshAll?: () => void;
  onToggleAll?: () => void;
  allOpen?: boolean;
  disabledAdd?: boolean;
}

export function ShelfHead({ icon, title, eyebrow, meter, onManual, onCompendium, onTake, onRefreshAll, onToggleAll, allOpen, disabledAdd }: ShelfHeadProps) {
  return (
    <div className="sf-shelf__head">
      <span className="sf-shelf__glyph"><Icon name={icon} /></span>
      <div className="sf-shelf__titles">
        <span className="sf-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {meter ? <div className="sf-shelf__meter">{meter}</div> : null}
      <div className="sf-shelf__actions">
        {onTake ? <button className="sf-slot__take" onClick={onTake}><Icon name="dices" /> Take New Potion</button> : null}
        {onRefreshAll ? <button className="sf-ghost-btn" onClick={onRefreshAll}><Icon name="rotate-ccw" /> Refresh all</button> : null}
        {onToggleAll ? <button className="sf-ghost-btn" onClick={onToggleAll}><Icon name={allOpen ? "chevrons-up" : "chevrons-down"} /> {allOpen ? "Collapse" : "Expand"}</button> : null}
        {onManual ? <button className="sf-ghost-btn" onClick={disabledAdd ? undefined : onManual} disabled={!!disabledAdd}><Icon name="pencil-line" /> Add manually</button> : null}
        {onCompendium ? <Button variant="primary" size="sm" iconLeft={<Icon name="book-open-text" />} onClick={disabledAdd ? undefined : onCompendium} disabled={!!disabledAdd}>Compendium</Button> : null}
      </div>
    </div>
  );
}

export function ItemAct({ icon, label, tone, onClick, disabled, title }: { icon: string; label: string; tone?: string; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; title?: string }) {
  return (
    <button className={"sf-ia" + (tone ? " t-" + tone : "") + (disabled ? " is-disabled" : "")} onClick={disabled ? undefined : onClick} disabled={disabled} title={title || label}>
      <Icon name={icon} /> {label}
    </button>
  );
}

export function CardMenu({ onGive, onRemove, onEdit, giveLabel = "Give to a party-mate" }: { onGive?: () => void; onRemove?: () => void; onEdit?: () => void; giveLabel?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="sf-cardmenu" ref={ref}>
      <button className="sf-cardmenu__btn" onClick={() => setOpen((v) => !v)} aria-label="More"><Icon name="ellipsis" /></button>
      {open ? (
        <div className="sf-cardmenu__pop">
          {onEdit ? <button onClick={() => { setOpen(false); onEdit(); }}><Icon name="pencil" /> Edit</button> : null}
          {onGive ? <button onClick={() => { setOpen(false); onGive(); }}><Icon name="gift" /> {giveLabel}</button> : null}
          {onRemove ? <button className="is-danger" onClick={() => { setOpen(false); onRemove(); }}><Icon name="trash-2" /> Remove</button> : null}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyShelf({ icon, text, small }: { icon: string; text: string; small?: boolean }) {
  return (
    <div className={"sf-empty-shelf" + (small ? " is-small" : "")}>
      <Icon name={icon} />
      <p>{text}</p>
    </div>
  );
}

export const condTone = (c: ArtifactCondition | string) => (c === "broken" ? "crimson" : c === "damaged" ? "gold" : "forest");
