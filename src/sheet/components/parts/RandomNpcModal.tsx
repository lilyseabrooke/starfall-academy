"use client";

/* ===========================================================================
   Starfall Academy — quick random NPC
   ---------------------------------------------------------------------------
   The dice next to the side rail's NPC "+": ask for a name (and optionally a
   year, House, major(s), class(es) and bio), then hand off to the character
   creator in "random" mode, which builds the rest of the NPC and saves it.
   Shared by the GM tools and the character sheet, so both rails behave the
   same.

   House, major and classes each sit on one compact row of "slots": what's
   been chosen shows as tinted tokens, and an open slot reads "left to
   chance". Clicking a row opens its drawer of options underneath — Houses as
   crests, majors grouped by school, classes as cards — one drawer at a time.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import { TONE_500, TONE_FG } from "../../data/shared";
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
  years: { id: string; label: string; roman: string }[];
  houses: { id: string; name: string; tone: string; color: string; blurb: string }[];
  schools: { id: string; name: string; tone: string; icon: string; subjects: { key: string; name: string }[] }[];
  classes: { id: string; name: string; tone: string; icon: string; tagline: string }[];
}

const MAX_PICKS = 2;
const NO_HOUSE_ID = "none";

/** Shapes the creator's data (years, Houses, schools, classes) into the
 *  modal's options, trimming "House" / "Magics" off the display names. */
export function randomNpcOptions(src: RandomNpcOptions): RandomNpcOptions {
  return {
    years: src.years.map((y) => ({ id: y.id, label: y.label, roman: y.roman })),
    houses: src.houses.map((h) => ({ id: h.id, name: h.name.replace(/ House$/, ""), tone: h.tone, color: h.color, blurb: h.blurb })),
    schools: src.schools.map((sc) => ({ id: sc.id, name: sc.name.replace(/ Magics?$/, ""), tone: sc.tone, icon: sc.icon, subjects: sc.subjects.map((sb) => ({ key: sb.key, name: sb.name })) })),
    classes: src.classes.map((k) => ({ id: k.id, name: k.name, tone: k.tone, icon: k.icon, tagline: k.tagline })),
  };
}

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

type Drawer = "house" | "major" | "classes";
interface Pick { id: string; name: string; tone: string; icon?: string }

const toneVars = (tone: string) => ({ "--t": TONE_500[tone] || TONE_500.gold, "--t-fg": TONE_FG[tone] || TONE_FG.gold }) as React.CSSProperties;

/** One labelled row: the picks as tinted tokens (× to drop one), then an open
 *  slot while there's room. Clicking any of it toggles the drawer below. */
function SlotRow({ label, hint, picks, max, open, onOpen, onClear, children }: { label: string; hint: string; picks: Pick[]; max: number; open: boolean; onOpen: () => void; onClear: (id: string) => void; children: React.ReactNode }) {
  return (
    <div className={"sf-npcrow" + (open ? " is-open" : "")}>
      <div className="sf-npcrow__head">
        <div className="gm-field-label">{label} <span className="gm-opt">{hint}</span></div>
        <div className="sf-npcslots">
          {picks.map((p) => (
            <span key={p.id} className="sf-npctoken" style={toneVars(p.tone)}>
              <button type="button" className="sf-npctoken__main" onClick={onOpen} aria-expanded={open}>
                {p.icon ? <Icon name={p.icon} /> : <span className="sf-npctoken__dot" />}
                {p.name}
              </button>
              <button type="button" className="sf-npctoken__x" onClick={() => onClear(p.id)} aria-label={"Remove " + p.name}><Icon name="x" /></button>
            </span>
          ))}
          {picks.length < max ? (
            <button type="button" className={"sf-npcslot" + (picks.length ? " is-add" : "")} onClick={onOpen} aria-expanded={open}>
              <Icon name={picks.length ? "plus" : "dices"} />
              {picks.length ? "Add another" : "Left to chance"}
              <Icon name="chevron-down" className="sf-npcslot__chev" />
            </button>
          ) : null}
        </div>
      </div>
      {open ? <div className="sf-npcdrawer">{children}</div> : null}
    </div>
  );
}

function DrawerFoot({ count, onDone }: { count: number; onDone: () => void }) {
  const note = count >= MAX_PICKS ? "Two chosen — remove one to swap" : count ? "One chosen · add a second, or leave it at one" : "Pick one or two, or leave it to chance";
  return (
    <div className="sf-npcdrawer__foot">
      <span>{note}</span>
      <button type="button" className="gm-btn-sm" onClick={onDone}>Done</button>
    </div>
  );
}

export function RandomNpcModal({ options, onSubmit, onClose }: { options: RandomNpcOptions; onSubmit: (v: RandomNpcValues) => void; onClose: () => void }) {
  const [v, setV] = React.useState<RandomNpcValues>({ name: "", pronouns: "", yearId: options.years[0]?.id ?? "first", houseId: "", major: [], classIds: [], bio: "" });
  const [drawer, setDrawer] = React.useState<Drawer | null>(null);
  const patch = (p: Partial<RandomNpcValues>) => setV((s) => ({ ...s, ...p }));
  const toggle = (key: "major" | "classIds", id: string) => setV((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : s[key].length < MAX_PICKS ? [...s[key], id] : s[key] }));
  const flip = (d: Drawer) => setDrawer((cur) => (cur === d ? null : d));
  const ready = v.name.trim().length > 0;
  const submit = () => { if (ready) onSubmit({ ...v, name: v.name.trim(), pronouns: v.pronouns.trim(), bio: v.bio.trim() }); };

  const house = options.houses.find((h) => h.id === v.houseId);
  const subjects = options.schools.flatMap((sc) => sc.subjects.map((sb) => ({ id: sb.key, name: sb.name, tone: sc.tone, icon: sc.icon })));
  const majorPicks = v.major.flatMap((k) => subjects.filter((s) => s.id === k));
  const classPicks = v.classIds.flatMap((id) => options.classes.filter((k) => k.id === id));

  return (
    <div className="gm-scrim" onClick={onClose}>
      <div className="gm-modal gm-modal--wide sf-npcmodal" role="dialog" aria-label="Random NPC" onClick={(e) => e.stopPropagation()}>
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
            <div className="sf-npcyears" role="radiogroup" aria-label="Year">
              {options.years.map((y) => {
                const on = v.yearId === y.id;
                return (
                  <button key={y.id} type="button" role="radio" aria-checked={on} className={"sf-npcyear" + (on ? " is-on" : "")} onClick={() => patch({ yearId: y.id })}>
                    <span className="sf-npcyear__num">{y.roman && y.roman !== "—" ? y.roman : <Icon name="graduation-cap" />}</span>
                    <span className="sf-npcyear__label">{y.label.replace(/ Year$/, "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sf-npcrows">
            <SlotRow label="House" hint="optional" picks={house ? [{ id: house.id, name: house.name, tone: house.tone }] : []} max={1} open={drawer === "house"} onOpen={() => flip("house")} onClear={() => patch({ houseId: "" })}>
              <div className="sf-npchouses">
                {options.houses.map((h) => {
                  const on = v.houseId === h.id;
                  return (
                    <button key={h.id} type="button" className={"sf-npchouse" + (on ? " is-on" : "")} style={toneVars(h.tone)} aria-pressed={on} title={h.blurb} onClick={() => { patch({ houseId: on ? "" : h.id }); setDrawer(null); }}>
                      <span className="sf-npchouse__crest"><Icon name={h.id === NO_HOUSE_ID ? "circle-dashed" : "shield"} /></span>
                      <span className="sf-npchouse__name">{h.name}</span>
                      <span className="sf-npchouse__color">{h.id === NO_HOUSE_ID ? "No House" : h.color}</span>
                    </button>
                  );
                })}
              </div>
            </SlotRow>

            <SlotRow label="Major" hint="optional · up to two" picks={majorPicks} max={MAX_PICKS} open={drawer === "major"} onOpen={() => flip("major")} onClear={(id) => toggle("major", id)}>
              <div className="sf-npcschools">
                {options.schools.map((sc) => (
                  <div key={sc.id} className="sf-npcschool" style={toneVars(sc.tone)}>
                    <div className="sf-npcschool__head"><Icon name={sc.icon} />{sc.name}</div>
                    {sc.subjects.map((sb) => {
                      const on = v.major.includes(sb.key);
                      return (
                        <button key={sb.key} type="button" className={"sf-npcsubj" + (on ? " is-on" : "")} aria-pressed={on} disabled={!on && v.major.length >= MAX_PICKS} onClick={() => toggle("major", sb.key)}>
                          <span className="sf-npccheck">{on ? <Icon name="check" /> : null}</span>{sb.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <DrawerFoot count={v.major.length} onDone={() => setDrawer(null)} />
            </SlotRow>

            <SlotRow label="Classes" hint="optional · one, or two" picks={classPicks} max={MAX_PICKS} open={drawer === "classes"} onOpen={() => flip("classes")} onClear={(id) => toggle("classIds", id)}>
              <div className="sf-npcclasses">
                {options.classes.map((k) => {
                  const on = v.classIds.includes(k.id);
                  return (
                    <button key={k.id} type="button" className={"sf-npcclass" + (on ? " is-on" : "")} style={toneVars(k.tone)} aria-pressed={on} disabled={!on && v.classIds.length >= MAX_PICKS} title={k.tagline || undefined} onClick={() => toggle("classIds", k.id)}>
                      <span className="sf-npcclass__icon"><Icon name={k.icon} /></span>
                      <span className="sf-npcclass__text">
                        <span className="sf-npcclass__name">{k.name}</span>
                        {k.tagline ? <span className="sf-npcclass__tag">{k.tagline}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <DrawerFoot count={v.classIds.length} onDone={() => setDrawer(null)} />
            </SlotRow>
          </div>

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
