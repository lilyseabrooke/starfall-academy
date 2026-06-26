"use client";

import * as React from "react";
import { Badge } from "@/ds";
import { Icon } from "../Icon";
import { TONE_500, hlbIsNA, hlbSegments, levelTone } from "../../data/shared";
import type { Spell, Tone } from "../../types";

/** Higher-level behaviour strip: dial the degree (1–5) or read the raw rule. */
export function SpellHLB({ text }: { text?: string }) {
  const valid = !hlbIsNA(text);
  const [sel, setSel] = React.useState<number | "raw">(1);
  if (!valid) return null;
  const DEGS = 5;
  const raw = sel === "raw";
  const segs = raw ? null : hlbSegments(text, sel as number) || [];
  return (
    <div className="sf-hlb">
      <div className="sf-hlb__head">
        <span className="sf-hlb__label"><Icon name="trending-up" /> Higher-level behavior</span>
        <div className="sf-hlb__deg" role="group" aria-label="Degrees of success">
          {Array.from({ length: DEGS }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={"sf-hlb__pip" + (sel === i + 1 ? " is-on" : "")}
              onClick={() => setSel(i + 1)}
              title={i + 1 + " degree" + (i + 1 > 1 ? "s" : "") + " of success"}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className={"sf-hlb__pip sf-hlb__pip--raw" + (raw ? " is-on" : "")}
            onClick={() => setSel("raw")}
            title="Raw scaling rule (per degree of success)"
          >
            …
          </button>
        </div>
      </div>
      <p className={"sf-hlb__body" + (raw ? " is-raw" : "")}>
        {raw
          ? text
          : (segs || []).map((s, i) =>
              s.t === "val" ? <b key={i} className="sf-hlb__v">{s.v}</b> : <React.Fragment key={i}>{s.v}</React.Fragment>
            )}
      </p>
    </div>
  );
}

export interface SpellCardProps {
  spell: Spell;
  mod: number;
  schoolTone?: Tone | string;
  onRoll: (spell: Spell, e: React.MouseEvent) => void;
  onRemove: (spell: Spell) => void;
  onLearn: (spell: Spell, e: React.MouseEvent) => void;
  onSetDays: (spell: Spell, days: number) => void;
  open: boolean;
  onToggle: () => void;
  onEdit?: (spell: Spell) => void;
}

export function SpellCard({ spell, mod, schoolTone, onRoll, onRemove, onLearn, onSetDays, open, onToggle, onEdit }: SpellCardProps) {
  const learned = !spell.days || spell.days <= 0;
  const lf = String(spell.level || "").trim().toLowerCase();
  const isHex = lf.startsWith("hex") || lf === "twisted";
  const backfire = isHex ? "always" : lf === "standard" || lf === "advanced" || lf === "legendary" ? "one" : null;
  const apHex = isHex ? (spell.ap != null ? spell.ap : (String(spell.level).match(/(\d+)\s*ap/i) || [])[1]) : null;
  const accent = TONE_500[(schoolTone as string) || "plum"] || TONE_500.plum;
  const style = { "--ent-accent": accent } as React.CSSProperties;
  const lvlTone = levelTone(spell.level) ?? "gold";
  const badgeTone = lvlTone === "silver" ? "neutral" : lvlTone;
  return (
    <div className={"sf-spell" + (open ? " is-open" : " is-collapsed") + (learned ? "" : " is-unlearned") + (backfire === "always" ? " is-hex" : "")} style={style}>
      <div className="sf-spell__head" onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle && onToggle()}>
        <span className="sf-spell__name">{spell.name}</span>
        <span className="sf-chip sf-chip--field sf-chip--head"><Icon name="sparkles" /> {spell.subject}</span>
        <Badge tone={badgeTone} square>{String(spell.level).replace(/\s*\(.*?\)\s*/g, "").trim()}</Badge>
        {spell.dc != null ? <span className="sf-spell__head-dc">DC {spell.dc}</span> : null}
        {learned ? (
          <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onRoll(spell, e); }}><Icon name="dices" /> Cast</button>
        ) : (
          <button className="sf-roll-btn" onClick={(e) => { e.stopPropagation(); onLearn(spell, e); }}><Icon name="book-open" /> Learn</button>
        )}
        {onEdit && <button className="sf-spell__edit" title="Edit spell" onClick={(e) => { e.stopPropagation(); onEdit(spell); }}><Icon name="pencil" /></button>}
        <button className="sf-spell__remove" title="Remove spell" onClick={(e) => { e.stopPropagation(); onRemove(spell); }}><Icon name="x" /></button>
        <span className="sf-spell__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
      </div>
      {open && (
        <React.Fragment>
          <div className="sf-spell__meta">
            <span className="sf-chip"><b>Base</b> {spell.stat}</span>
            {apHex != null ? <span className="sf-chip sf-chip--ap"><b>AP</b> {apHex}</span> : null}
            {spell.ritual ? <span className="sf-chip sf-chip--ritual"><Icon name="scroll-text" /> Ritual</span> : null}
            {spell.volatile ? <span className="sf-chip sf-chip--volatile"><Icon name="flame" /> Volatile</span> : null}
          </div>
          <p className="sf-spell__desc">{spell.desc}</p>
          <SpellHLB text={spell.higherLevel} />
          <div className="sf-spell__foot">
            {learned ? (
              <React.Fragment>
                <span className="sf-spell__formula">2d10 + {mod}{spell.dc != null ? <span className="sf-move__dc"> · DC {spell.dc}</span> : null}</span>
                <button className="sf-roll-btn" onClick={(e) => onRoll(spell, e)}><Icon name="dices" /> Cast</button>
              </React.Fragment>
            ) : (
              <div className="sf-spell__learn-row">
                <div className="sf-spell__stepper">
                  <button className="sf-spell__step-btn" onClick={() => onSetDays(spell, spell.days - 1)} title="Reduce days remaining"><Icon name="minus" /></button>
                  <span className="sf-spell__learning"><Icon name="hourglass" /> {spell.days} day{spell.days !== 1 ? "s" : ""} left</span>
                  <button className="sf-spell__step-btn" onClick={() => onSetDays(spell, spell.days + 1)} title="Increase days remaining"><Icon name="plus" /></button>
                </div>
                <button className="sf-roll-btn" onClick={(e) => onLearn(spell, e)}><Icon name="book-open" /> Learn</button>
              </div>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
