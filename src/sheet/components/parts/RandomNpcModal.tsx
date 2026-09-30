"use client";

/* ===========================================================================
   Starfall Academy — quick random NPC
   ---------------------------------------------------------------------------
   The dice next to the side rail's NPC "+": ask for a name (and optionally a
   year, major(s), class(es) and bio), then hand off to the character creator
   in "random" mode, which builds the rest of the NPC and saves it. Shared by
   the GM tools and the character sheet, so both rails behave the same.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import "../../styles/gm.css";

export interface RandomNpcValues {
  name: string;
  pronouns: string;
  yearId: string;
  /** A House id, "none" for Unaffiliated, or "" to leave it to chance. */
  houseId: string;
  major: string[];
  classIds: string[];
  bio: string;
}

export interface RandomNpcOptions {
  years: { id: string; label: string }[];
  houses: { id: string; name: string }[];
  subjects: { key: string; name: string }[];
  classes: { id: string; name: string }[];
}

const MAX_PICKS = 2;

/** Where the creator lives for a new NPC: `random` values build one straight
 *  away, no values open the wizard. */
export function npcCreateHref(campaignId: string, values?: RandomNpcValues): string {
  const q = new URLSearchParams({ npc: campaignId });
  if (values) {
    q.set("random", "1");
    q.set("name", values.name);
    if (values.pronouns) q.set("pronouns", values.pronouns);
    q.set("year", values.yearId);
    if (values.houseId) q.set("house", values.houseId);
    if (values.major.length) q.set("major", values.major.join(","));
    if (values.classIds.length) q.set("classes", values.classIds.join(","));
    if (values.bio) q.set("bio", values.bio);
  }
  return "/characters/new?" + q.toString();
}

function ChipPicker({ label, hint, options, picked, onToggle }: { label: string; hint: string; options: { id: string; name: string }[]; picked: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <div className="gm-field-label">{label} <span className="gm-opt">{hint}</span></div>
      <div className="sf-npcchips">
        {options.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button key={o.id} type="button" className={"sf-npcchip" + (on ? " is-on" : "")} disabled={!on && picked.length >= MAX_PICKS} aria-pressed={on} onClick={() => onToggle(o.id)}>{o.name}</button>
          );
        })}
      </div>
    </div>
  );
}

export function RandomNpcModal({ options, onSubmit, onClose }: { options: RandomNpcOptions; onSubmit: (v: RandomNpcValues) => void; onClose: () => void }) {
  const [v, setV] = React.useState<RandomNpcValues>({ name: "", pronouns: "", yearId: options.years[0]?.id ?? "first", houseId: "", major: [], classIds: [], bio: "" });
  const patch = (p: Partial<RandomNpcValues>) => setV((s) => ({ ...s, ...p }));
  const toggle = (key: "major" | "classIds", id: string) => setV((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : s[key].length < MAX_PICKS ? [...s[key], id] : s[key] }));
  const ready = v.name.trim().length > 0;
  const submit = () => { if (ready) onSubmit({ ...v, name: v.name.trim(), pronouns: v.pronouns.trim(), bio: v.bio.trim() }); };

  return (
    <div className="gm-scrim" onClick={onClose}>
      <div className="gm-modal gm-modal--wide" role="dialog" aria-label="Random NPC" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal__head">
          <span className="gm-modal__glyph"><Icon name="dices" /></span>
          <div className="gm-modal__titles"><span className="gm-modal__eyebrow">Conjure an NPC</span><span className="gm-modal__title">Random NPC</span></div>
          <button className="gm-modal__x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="gm-modal__body">
          <p className="gm-modal__info">Tell us who they are — everything else, from stats and classes to spells and gear, is rolled for you.</p>
          <div className="gm-npc-form__row2">
            <label className="gm-input-field"><span className="gm-field-label">Name <span className="gm-req">*</span></span><input autoFocus value={v.name} onChange={(e) => patch({ name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="e.g. Florence Walker" /></label>
            <label className="gm-input-field"><span className="gm-field-label">Pronouns</span><input value={v.pronouns} onChange={(e) => patch({ pronouns: e.target.value })} placeholder="e.g. she / her" /></label>
          </div>
          <div>
            <div className="gm-field-label">Year</div>
            <div className="sf-npcchips">
              {options.years.map((y) => (
                <button key={y.id} type="button" className={"sf-npcchip" + (v.yearId === y.id ? " is-on" : "")} aria-pressed={v.yearId === y.id} onClick={() => patch({ yearId: y.id })}>{y.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="gm-field-label">House <span className="gm-opt">optional · left to chance if unchosen</span></div>
            <div className="sf-npcchips">
              {options.houses.map((h) => (
                <button key={h.id} type="button" className={"sf-npcchip" + (v.houseId === h.id ? " is-on" : "")} aria-pressed={v.houseId === h.id} onClick={() => patch({ houseId: v.houseId === h.id ? "" : h.id })}>{h.name}</button>
              ))}
            </div>
          </div>
          <ChipPicker label="Major" hint="optional · up to two" options={options.subjects.map((s) => ({ id: s.key, name: s.name }))} picked={v.major} onToggle={(id) => toggle("major", id)} />
          <ChipPicker label="Classes" hint="optional · one, or two" options={options.classes} picked={v.classIds} onToggle={(id) => toggle("classIds", id)} />
          <label className="gm-input-field"><span className="gm-field-label">Bio <span className="gm-opt">(optional)</span></span><textarea className="sf-npcbio" rows={3} value={v.bio} onChange={(e) => patch({ bio: e.target.value })} placeholder="Who are they, and where did they come from?" /></label>
        </div>
        <div className="gm-modal__foot">
          <div className="gm-modal__footbtns">
            <button className="gm-btn" onClick={onClose}>Cancel</button>
            <button className="gm-btn-gold" disabled={!ready} onClick={submit}><Icon name="dices" />Create NPC</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Confirm before permanently deleting an NPC's sheet. */
export function DeleteNpcModal({ name, busy, error, onConfirm, onClose }: { name: string; busy: boolean; error: string | null; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="gm-scrim" onClick={busy ? undefined : onClose}>
      <div className="gm-modal gm-modal--time" role="alertdialog" aria-label="Delete character" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal__head">
          <span className="gm-modal__glyph"><Icon name="trash-2" /></span>
          <div className="gm-modal__titles"><span className="gm-modal__eyebrow">This cannot be undone</span><span className="gm-modal__title">Delete character</span></div>
          <button className="gm-modal__x" onClick={onClose} disabled={busy} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="gm-modal__body">
          <p className="gm-modal__info">Permanently delete <b>{name}</b> and their whole sheet — stats, spells, inventory, journal? Rolls they made stay in the campaign log.</p>
          {error ? <p className="gm-modal__info" style={{ color: "var(--crimson-300)" }}>{error}</p> : null}
        </div>
        <div className="gm-modal__foot gm-modal__foot--danger">
          <div className="gm-modal__footbtns">
            <button className="gm-btn" onClick={onClose} disabled={busy}>Keep</button>
            <button className="gm-btn-sm gm-btn-danger" onClick={onConfirm} disabled={busy}><Icon name="trash-2" />{busy ? "Deleting…" : "Delete character"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
