"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type { Glyph } from "../../types";
import type { InvHandlers } from "./handlers";
import { CardMenu } from "./shared";

export interface GlyphForgeProps {
  glyphs: Glyph[];
  runeStack: Glyph[];
  h: InvHandlers;
  glyphOpenIds?: Set<string>;
  toggleGlyph?: (id: string) => void;
  toggleAllGlyphs?: () => void;
  allGlyphsOpen?: boolean;
}

export function GlyphForge({ glyphs, runeStack, h, glyphOpenIds, toggleGlyph, toggleAllGlyphs, allGlyphsOpen }: GlyphForgeProps) {
  const cost = runeStack.reduce((s, g) => s + (g.cost || 0), 0);
  const intensity = runeStack.reduce((s, g) => s + (g.intensity || 0), 0);
  return (
    <div className="sf-glyph-forge">
      <div className="sf-rune">
        <div className="sf-rune__head">
          <span className="sf-rune__glyph"><Icon name="hexagon" /></span>
          <div className="sf-rune__titles">
            <span className="sf-eyebrow">Inscription</span>
            <h3>Active rune</h3>
          </div>
          {runeStack.length ? <button className="sf-rune__clear" onClick={h.clearRune}><Icon name="x" /> Clear</button> : null}
        </div>
        {runeStack.length === 0 ? (
          <p className="sf-rune__empty">Stack glyphs below to compose a rune, then roll <b>Runology</b> to inscribe it.</p>
        ) : (
          <div className="sf-rune__stack">
            {runeStack.map((g, i) => (
              <span key={i} className="sf-rune__chip sf-rune__chip--flat">
                {g.name}
                <button onClick={() => h.removeFromRune(i)} aria-label={"Remove " + g.name}><Icon name="x" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="sf-rune__foot">
          <div className="sf-rune__stats">
            <span><b>{intensity}</b> intensity</span>
            <span className="sf-rune__sep" />
            <span><b>{cost}</b> mats to inscribe</span>
          </div>
          <button className="sf-roll-btn sf-rune__create" disabled={!runeStack.length} onClick={(e) => runeStack.length && h.createRune(e.currentTarget as HTMLElement)}>
            <Icon name="dices" /> Create rune
          </button>
        </div>
      </div>

      <div className="sf-glyphs">
        {glyphs.length > 0 && (
          <div className="sf-sub__head">
            <span className="sf-sub__title"><Icon name="hexagon" /> Glyph Library</span>
            <span className="sf-sub__count">{glyphs.length} glyph{glyphs.length !== 1 ? "s" : ""}</span>
            <div className="sf-sub__actions">
              <button className="sf-ghost-btn" onClick={toggleAllGlyphs}>
                <Icon name={allGlyphsOpen ? "chevrons-up" : "chevrons-down"} />
                {allGlyphsOpen ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>
        )}
        {glyphs.map((g) => {
          const open = glyphOpenIds ? glyphOpenIds.has(g.id) : false;
          return (
            <div key={g.id} className={"sf-glyph is-flat" + (open ? " is-open" : " is-collapsed")}>
              <div className="sf-glyph__top" onClick={() => toggleGlyph && toggleGlyph(g.id)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleGlyph && toggleGlyph(g.id)}>
                <span className="sf-glyph__name">{g.name}</span>
                <button className="sf-itm__edit" title="Edit glyph" onClick={(e) => { e.stopPropagation(); h.editGlyph(g); }}><Icon name="pencil" /></button>
                <CardMenu onGive={() => h.give("glyph", g)} onRemove={() => h.removeGlyph(g)} />
                <span className="sf-itm__chev"><Icon name={open ? "chevron-up" : "chevron-down"} /></span>
              </div>
              <div className="sf-glyph__meta">
                <span className="sf-chip"><b>Cost</b> {g.cost}</span>
                <span className="sf-chip"><b>Int</b> {g.intensity}</span>
              </div>
              {open && <p className="sf-glyph__desc">{g.desc}</p>}
              <button className="sf-glyph__add" onClick={() => h.addToRune(g)}><Icon name="plus" /> Add to rune</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
