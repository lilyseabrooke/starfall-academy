"use client";

/* The adaptive "Add manually" modal for every inventory kind, ported from
   inventory.jsx. The form state `f` is a dynamic record keyed by field name. */
import * as React from "react";
import { Button, IconButton, Input, Select, Switch } from "@/ds";
import { Icon } from "../Icon";
import type { CompendiumEntry, MagicSchool, Skill, Stat, Subject } from "../../types";

type ManualForm = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v));

interface ManualCfg {
  title: string;
  eyebrow: string;
  icon: string;
  fields: Array<[string, string, string]>;
  placeholders?: Record<string, string>;
  itemSwitches?: Array<[string, string]>;
}

const MANUAL_CFG: Record<string, ManualCfg> = {
  artifact: { title: "New artifact", eyebrow: "The Reliquary", icon: "gem",
    fields: [["name", "Name", "text"], ["subject", "Field", "subject"], ["level", "Level", "select:Basic,Standard,Advanced,Legendary,Twisted"], ["intensity", "Intensity", "spinless"], ["skill", "Skill", "skillselect"], ["dc", "DC", "spinless"], ["desc", "Description", "area"]],
    placeholders: { name: "e.g. Skysplitter", desc: "What does the artifact do?" } },
  recipe: { title: "New Potion Recipe", eyebrow: "ON THE BURNER", icon: "scroll-text",
    fields: [["name", "Name", "text"], ["intensity", "Intensity", "spinless"], ["cost", "Cost", "spinless"], ["twisted", "Twisted", "switch"], ["desc", "Description", "area"]],
    placeholders: { name: "e.g. Angel's Balm", desc: "What does the potion do?" } },
  potion: { title: "New Potion", eyebrow: "TRICK VIAL", icon: "flask-conical",
    fields: [["name", "Name", "text"], ["intensity", "Intensity", "spinless"], ["twisted", "Twisted", "switch"], ["desc", "Description", "area"]],
    placeholders: { name: "e.g. Angel's Balm", desc: "What does the potion do?" } },
  plant: { title: "New plant", eyebrow: "THE GARDEN", icon: "leaf", fields: [], placeholders: { name: "e.g. Passionoak", desc: "What kind of plant is this?", ability: "What benefit does the plant provide?" } },
  wand: { title: "New wand", eyebrow: "THE WAND STUDIO", icon: "wand-sparkles", fields: [] },
  glyph: { title: "New glyph", eyebrow: "RUNIC LIBRARY", icon: "pen-tool",
    fields: [["name", "Name", "text"], ["cost", "Cost", "number"], ["intensity", "Intensity", "number"], ["desc", "Description", "area"]],
    placeholders: { name: "e.g. Sight", desc: "What domain does this glyph represent?" } },
  item: { title: "New item", eyebrow: "The Stockpile", icon: "package",
    fields: [["name", "Name", "text"], ["qty", "Quantity", "number"], ["desc", "Description", "area"]],
    itemSwitches: [["singleUse", "Single-use"], ["hasMove", "Associated move"]],
    placeholders: { name: "e.g. Dragon Diver", desc: "What does the item do?" } },
};

type SetFn = (k: string, v: unknown) => void;

function WandSpellCompendium({ f, set, compendiumSpells }: { f: ManualForm; set: SetFn; compendiumSpells: CompendiumEntry[] }) {
  const q = str(f.spellSearch).toLowerCase();
  const matches = q.length >= 3 ? (compendiumSpells || []).filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8) : [];
  const rowStyle = (selected: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%",
    padding: "var(--space-2) var(--space-3)",
    background: selected ? "var(--ink-700)" : "var(--ink-800)",
    border: "1px solid " + (selected ? "var(--border-default)" : "var(--border-subtle)"),
    borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--ink-100)",
    textAlign: "left", fontSize: "0.875rem",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Input label="Search spells" placeholder="e.g. Spectral Strike" value={str(f.spellSearch)} onChange={(e) => set("spellSearch", e.target.value)} />
      {matches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", maxHeight: "188px", overflowY: "auto" }}>
          {matches.map((sp) => {
            const sel = f.spellCompId === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                style={rowStyle(sel)}
                onClick={() => {
                  set("spellCompId", sp.id);
                  set("grantedSpell", { id: sp.id, name: sp.name, level: sp.level, subjectKey: sp.subjectKey, subject: sp.subject, school: sp.school, stat: sp.stat, ap: sp.ap, dc: sp.dc, ritual: !!sp.ritual, volatile: !!sp.volatile, days: 0, desc: sp.desc || "" });
                }}
              >
                <span style={{ flex: 1, fontWeight: sel ? 600 : 400 }}>{sp.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--ink-400)", whiteSpace: "nowrap" }}>{sp.subject}</span>
                <span style={{ fontSize: "0.7rem", padding: "1px 6px", background: "var(--ink-600)", borderRadius: "var(--radius-pill)", color: "var(--gold-300)", whiteSpace: "nowrap" }}>{sp.level}</span>
                {sel && <Icon name="check" style={{ color: "var(--forest-400)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
      {!matches.length && q.length >= 3 && <p className="sf-modal__hint"><Icon name="search" /> No spells match “{str(f.spellSearch)}”</p>}
      {q.length > 0 && q.length < 3 && <p className="sf-modal__hint"><Icon name="search" /> Type at least 3 letters to search.</p>}
    </div>
  );
}

function WandSpellManual({ f, set, schools }: { f: ManualForm; set: SetFn; schools: MagicSchool[] }) {
  const allSubs: { value: string; label: string }[] = [];
  (schools || []).forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
  allSubs.sort((a, b) => a.label.localeCompare(b.label));
  const subjectOpts = [{ value: "", label: "Choose a field…" }, ...allSubs];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Input label="Name" placeholder="e.g. Spectral Strike" value={str(f.spellName)} onChange={(e) => set("spellName", e.target.value)} />
      <div className="sf-modal__row">
        <Select label="Field of magic" options={subjectOpts} value={str(f.spellSubjectKey)} onChange={(e) => set("spellSubjectKey", e.target.value)} />
        <Select label="Level" options={["Basic", "Standard", "Advanced", "Legendary", "Hex"]} value={str(f.spellLevel) || "Basic"} onChange={(e) => set("spellLevel", e.target.value)} />
      </div>
      <div className="sf-modal__row">
        <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={str(f.spellDC)} onChange={(e) => set("spellDC", e.target.value)} /></div>
        <Select label="Base stat" options={[{ value: "", label: "Follows field" }, { value: "Focus", label: "Focus" }, { value: "Creativity", label: "Creativity" }, { value: "Logic", label: "Logic" }, { value: "Insight", label: "Insight" }, { value: "Body", label: "Body" }, { value: "Charm", label: "Charm" }]} value={str(f.spellStat)} onChange={(e) => set("spellStat", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "var(--space-6)" }}>
        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Ritual</span><Switch checked={!!f.spellRitual} onChange={(e) => set("spellRitual", e.target.checked)} /></div>
        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Volatile</span><Switch checked={!!f.spellVolatile} onChange={(e) => set("spellVolatile", e.target.checked)} /></div>
      </div>
      <label className="sf-modal__field">
        <span className="sf-modal__label">Description</span>
        <textarea className="sf-modal__textarea" rows={2} value={str(f.spellDesc)} onChange={(e) => set("spellDesc", e.target.value)} />
      </label>
    </div>
  );
}

function PlantManualForm({ f, set, subjects, skills, cultivationCap, cultivationUsed }: { f: ManualForm; set: SetFn; subjects: Subject[]; skills: Skill[]; cultivationCap: number; cultivationUsed: number }) {
  const tab = str(f.abilityTab) || "active";
  const bonusType = str(f.bonusType) || "none";
  const STATS = ["Focus", "Creativity", "Logic", "Insight", "Body", "Charm"];
  const statOpts = [{ value: "", label: "Choose a stat…" }].concat(STATS.map((s) => ({ value: s, label: s })));
  const subjectOpts = [{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
  const skillOpts = [{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
  const newVal = parseInt(str(f.value), 10) || 0;
  const wouldExceed = cultivationCap > 0 && cultivationUsed + newVal > cultivationCap;
  const targetOpts = bonusType === "stat" ? statOpts : bonusType === "skill" ? skillOpts : subjectOpts;
  return (
    <div className="sf-manual__grid">
      <div className="sf-manual__full"><Input label="Name" placeholder="e.g. Passionoak" value={str(f.name)} onChange={(e) => set("name", e.target.value)} /></div>
      <div>
        <div className="sf-no-spin"><Input label="Value" type="number" min="0" placeholder="0" value={str(f.value)} onChange={(e) => set("value", e.target.value)} /></div>
        {wouldExceed ? <span className="sf-plant-cap-warn"><Icon name="alert-triangle" /> Exceeds cultivation capacity</span> : null}
      </div>
      <div className="sf-no-spin"><Input label="Intensity" type="number" min="1" placeholder="1" value={str(f.intensity)} onChange={(e) => set("intensity", e.target.value)} /></div>
      <label className="sf-modal__field sf-manual__full">
        <span className="sf-modal__label">Description</span>
        <textarea className="sf-modal__textarea" rows={2} placeholder="What kind of plant is this?" value={str(f.desc)} onChange={(e) => set("desc", e.target.value)} />
      </label>
      <label className="sf-modal__field sf-manual__full">
        <span className="sf-modal__label">Ability</span>
        <textarea className="sf-modal__textarea" rows={2} placeholder="What benefit does the plant provide?" value={str(f.ability)} onChange={(e) => set("ability", e.target.value)} />
      </label>
      <div className="sf-manual__full">
        <div className="sf-modal__field">
          <span className="sf-modal__label">Ability type</span>
          <div className="sf-move-type-row">
            <button type="button" className={"sf-move-type-btn" + (tab === "active" ? " is-on" : "")} onClick={() => set("abilityTab", "active")}>Active</button>
            <button type="button" className={"sf-move-type-btn" + (tab === "passive" ? " is-on" : "")} onClick={() => set("abilityTab", "passive")}>Passive</button>
          </div>
        </div>
        {tab === "active" ? (
          <div className="sf-plant-tabpane">
            <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><Select label="Requires roll" options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }, { value: "choose", label: "Choose" }]} value={str(f.requiresRoll) || "no"} onChange={(e) => set("requiresRoll", e.target.value)} /></div>
              <div className="sf-modal__switch" style={{ paddingBottom: "9px", flexShrink: 0 }}><span className="sf-modal__switch-label">Single-use</span><Switch checked={!!f.singleUse} onChange={(e) => set("singleUse", e.target.checked)} /></div>
            </div>
          </div>
        ) : (
          <div className="sf-plant-tabpane">
            <Select label="Bonus type" options={[{ value: "none", label: "None" }, { value: "stat", label: "Stat" }, { value: "subject", label: "Subject" }, { value: "skill", label: "Skill" }]} value={bonusType} onChange={(e) => { set("bonusType", e.target.value); set("bonusTarget", ""); }} />
            {bonusType !== "none" ? (
              <React.Fragment>
                <Select label="Bonus target" options={targetOpts} value={str(f.bonusTarget)} onChange={(e) => set("bonusTarget", e.target.value)} />
                <div className="sf-no-spin"><Input label="Bonus value" type="number" placeholder="+0" value={str(f.bonusValue)} onChange={(e) => set("bonusValue", e.target.value)} /></div>
                <button type="button" className={"sf-bcond" + (f.bonusConditional ? " is-on" : "")} onClick={() => set("bonusConditional", !f.bonusConditional)} aria-pressed={!!f.bonusConditional}>
                  <span className="sf-bcond__box"><Icon name="check" /></span>
                  Conditional — offer it as a per-roll choice instead of applying it live
                </button>
                {f.bonusConditional ? (
                  <input className="sf-bonus__note" type="text" value={str(f.bonusCondNote)} placeholder="Describe the condition — e.g. while the plant is held…" onChange={(e) => set("bonusCondNote", e.target.value)} />
                ) : null}
              </React.Fragment>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export interface EditSubject {
  name?: string;
  subjectKey?: string;
  subject?: string;
  level?: string;
  intensity?: number;
  move?: { skill?: string; dc?: number | null };
  maxCondition?: number;
  twisted?: boolean;
  desc?: string;
  value?: number;
  removeOnUse?: boolean;
  requiresRoll?: string;
  cost?: number;
  ability?: string;
  passive?: { type?: string; target?: string; value?: number; conditional?: boolean; condNote?: string };
}

export interface ManualModalProps {
  open: boolean;
  kind: string | null;
  subjects: Subject[];
  skills: Skill[];
  stats: Stat[];
  schools: MagicSchool[];
  compendiumSpells: CompendiumEntry[];
  attuneFull?: boolean;
  sheafFull?: boolean;
  editSubject?: EditSubject | null;
  onSave: (kind: string, record: ManualForm) => void;
  onClose: () => void;
  cultivationCap?: number;
  cultivationUsed?: number;
}

export function ManualModal({ open, kind, subjects, skills, stats, schools, compendiumSpells, attuneFull, sheafFull, editSubject, onSave, onClose, cultivationCap = 0, cultivationUsed = 0 }: ManualModalProps) {
  const cfg = kind ? MANUAL_CFG[kind] : null;
  const [f, setF] = React.useState<ManualForm>({});
  React.useEffect(() => {
    if (!open) return;
    let pre: ManualForm = {};
    const es = editSubject;
    if (es) {
      if (kind === "artifact") pre = { name: es.name, subject: es.subjectKey || (subjects.find((s) => s.name === es.subject) || ({} as Subject)).key || "", level: es.level || "Basic", intensity: es.intensity != null ? String(es.intensity) : "", skill: es.move && es.move.skill && es.move.skill !== "—" ? es.move.skill : "", dc: es.move && es.move.dc != null ? String(es.move.dc) : "", desc: es.desc || "" };
      else if (kind === "wand") pre = { name: es.name, cost: es.maxCondition != null ? String(es.maxCondition) : "", twisted: !!es.twisted, desc: es.desc || "" };
      else if (kind === "plant") pre = { name: es.name, value: es.value != null ? String(es.value) : "", intensity: es.intensity != null ? String(es.intensity) : "", desc: es.desc || "", ability: es.ability || "", singleUse: !!es.removeOnUse, requiresRoll: (es.requiresRoll || "NO").toLowerCase(), abilityTab: es.passive ? "passive" : "active", bonusType: es.passive ? es.passive.type : "none", bonusTarget: es.passive ? es.passive.target : "", bonusValue: es.passive ? String(es.passive.value || "") : "", bonusConditional: es.passive ? !!es.passive.conditional : false, bonusCondNote: es.passive ? es.passive.condNote || "" : "" };
      else pre = { name: es.name, intensity: es.intensity != null ? String(es.intensity) : "", cost: es.cost != null ? String(es.cost) : "", twisted: !!es.twisted, desc: es.desc || "" };
    }
    setF(pre);
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(".sf-modal.open input");
      if (el) el.focus();
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);
  if (!cfg) return null;
  const set: SetFn = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const newPlantVal = kind === "plant" ? parseInt(str(f.value), 10) || 0 : 0;
  const overCap = kind === "plant" && cultivationCap > 0 && cultivationUsed + newPlantVal > cultivationCap;
  const canSave = kind === "artifact" ? !!str(f.name).trim() && !!str(f.skill).trim() && !!str(f.dc).trim() : !!str(f.name).trim() && !overCap;
  const wandStatOpts = [{ value: "", label: "Choose a stat…" }].concat((stats || []).map((s) => ({ value: s.name, label: s.name })));
  const wandSubjectOpts = [{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
  const wandSkillOpts = [{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
  const subjectOpts = [{ value: "", label: "Choose a field…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })));
  const saveCraft = () => { if (canSave) { onSave(kind!, { ...f, _crafting: true }); onClose(); } };
  const save = () => { if (canSave) { onSave(kind!, f); onClose(); } };
  const saveAttuned = () => { if (canSave) { onSave(kind!, { ...f, attuned: true }); onClose(); } };
  const moveRollType = str(f.moveRollType) || "stat";

  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label={cfg.title}>
        <div className="sf-modal__head">
          <span className="sf-bf-modal__glyph" style={{ color: "var(--gold-200)", background: "var(--brand-subtle)", borderColor: "var(--border-default)" }}><Icon name={cfg.icon} /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">{cfg.eyebrow}</span>
            <h2>{cfg.title}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          {kind === "wand" ? (
            <div className="sf-manual__grid">
              <div className="sf-manual__full"><Input label="Name" placeholder="e.g. Sylene’s Crystal" value={str(f.name)} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="sf-no-spin"><Input label="Cost" type="number" min="0" value={str(f.cost)} onChange={(e) => set("cost", e.target.value)} /></div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                <div className="sf-modal__switch"><span className="sf-modal__switch-label">Twisted</span><Switch checked={!!f.twisted} onChange={(e) => set("twisted", e.target.checked)} /></div>
              </div>
              <div className="sf-manual__full">
                <div className="sf-modal__switch"><span className="sf-modal__switch-label">Grants move</span><Switch checked={!!f.grantsMove} onChange={(e) => set("grantsMove", e.target.checked)} /></div>
                {!!f.grantsMove && (
                  <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                    <div className="sf-modal__field">
                      <span className="sf-modal__label">Rolls with</span>
                      <div className="sf-move-type-row">
                        {([["stat", "Stat"], ["subject", "Subject"], ["skill", "Skill"]] as const).map(([val, lbl]) => (
                          <button key={val} type="button" className={"sf-move-type-btn" + (moveRollType === val ? " is-on" : "")} onClick={() => { set("moveRollType", val); set("moveStat", ""); set("moveSubjectKey", ""); set("moveSkill", ""); }}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    {moveRollType === "subject" ? (
                      <Select label="Subject" options={wandSubjectOpts} value={str(f.moveSubjectKey)} onChange={(e) => set("moveSubjectKey", e.target.value)} />
                    ) : moveRollType === "skill" ? (
                      <Select label="Skill" options={wandSkillOpts} value={str(f.moveSkill)} onChange={(e) => set("moveSkill", e.target.value)} />
                    ) : (
                      <Select label="Stat" options={wandStatOpts} value={str(f.moveStat)} onChange={(e) => set("moveStat", e.target.value)} />
                    )}
                    <div className="sf-modal__row"><div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={str(f.moveDC)} onChange={(e) => set("moveDC", e.target.value)} /></div></div>
                    <div className="sf-modal__switch"><span className="sf-modal__switch-label">Can backfire on 1</span><Switch checked={!!f.moveBackfire} onChange={(e) => set("moveBackfire", e.target.checked)} /></div>
                  </div>
                )}
              </div>
              <div className="sf-manual__full">
                <div className="sf-modal__switch"><span className="sf-modal__switch-label">Grants spell</span><Switch checked={!!f.grantsSpell} onChange={(e) => set("grantsSpell", e.target.checked)} /></div>
                {!!f.grantsSpell && (
                  <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                    <div className="sf-modal__field">
                      <div className="sf-move-type-row">
                        {([["compendium", "Compendium"], ["manual", "Manual"]] as const).map(([val, lbl]) => (
                          <button key={val} type="button" className={"sf-move-type-btn" + ((str(f.spellTab) || "compendium") === val ? " is-on" : "")} onClick={() => set("spellTab", val)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    {(str(f.spellTab) || "compendium") === "compendium" ? <WandSpellCompendium f={f} set={set} compendiumSpells={compendiumSpells} /> : <WandSpellManual f={f} set={set} schools={schools} />}
                  </div>
                )}
              </div>
              <label className="sf-modal__field sf-manual__full">
                <span className="sf-modal__label">Description</span>
                <textarea className="sf-modal__textarea" rows={3} placeholder="What does the wand do, and what benefits does it grant?" value={str(f.desc)} onChange={(e) => set("desc", e.target.value)} />
              </label>
            </div>
          ) : kind === "plant" ? (
            <PlantManualForm f={f} set={set} subjects={subjects} skills={skills} cultivationCap={cultivationCap} cultivationUsed={cultivationUsed} />
          ) : (
            <div className="sf-manual__grid">
              {kind === "item" ? (
                <React.Fragment>
                  {cfg.fields.slice(0, 2).map(([key, label, type]) => (
                    <Input key={key} label={label} type={type} placeholder={cfg.placeholders?.[key]} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />
                  ))}
                  <div style={{ display: "flex", gap: "var(--space-6)", gridColumn: "1 / -1" }}>
                    {(cfg.itemSwitches || []).map(([key, label]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center" }}>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">{label}</span><Switch checked={!!f[key]} onChange={(e) => set(key, e.target.checked)} /></div>
                      </div>
                    ))}
                  </div>
                  {!!f.hasMove && (
                    <div className="sf-manual__full" style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: "var(--space-5)", borderLeft: "2px solid var(--border-subtle)" }}>
                      <div className="sf-modal__field">
                        <span className="sf-modal__label">Rolls with</span>
                        <div className="sf-move-type-row">
                          {([["stat", "Stat"], ["subject", "Subject"], ["skill", "Skill"]] as const).map(([val, lbl]) => (
                            <button key={val} type="button" className={"sf-move-type-btn" + (moveRollType === val ? " is-on" : "")} onClick={() => { set("moveRollType", val); set("moveStat", ""); set("moveSubjectKey", ""); set("moveSkill", ""); }}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                      {moveRollType === "subject" ? (
                        <Select label="Subject" options={[{ value: "", label: "Choose a subject…" }].concat(subjects.map((s) => ({ value: s.key, label: s.name })))} value={str(f.moveSubjectKey)} onChange={(e) => set("moveSubjectKey", e.target.value)} />
                      ) : moveRollType === "skill" ? (
                        <Select label="Skill" options={[{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })))} value={str(f.moveSkill)} onChange={(e) => set("moveSkill", e.target.value)} />
                      ) : (
                        <Select label="Stat" options={[{ value: "", label: "Choose a stat…" }].concat((stats || []).map((s) => ({ value: s.name, label: s.name })))} value={str(f.moveStat)} onChange={(e) => set("moveStat", e.target.value)} />
                      )}
                      <div className="sf-modal__row"><div className="sf-no-spin"><Input label="DC (optional)" type="number" placeholder="—" value={str(f.moveDC)} onChange={(e) => set("moveDC", e.target.value)} /></div></div>
                      <div style={{ display: "flex", gap: "var(--space-6)" }}>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Lost on failure</span><Switch checked={!!f.lostOnFailure} onChange={(e) => set("lostOnFailure", e.target.checked)} /></div>
                        <div className="sf-modal__switch"><span className="sf-modal__switch-label">Lost on backfire</span><Switch checked={!!f.lostOnBackfire} onChange={(e) => set("lostOnBackfire", e.target.checked)} /></div>
                      </div>
                    </div>
                  )}
                  {cfg.fields.slice(2).map(([key, label, type]) => {
                    if (type === "area") {
                      return (
                        <label key={key} className="sf-modal__field sf-manual__full">
                          <span className="sf-modal__label">{label}</span>
                          <textarea className="sf-modal__textarea" rows={3} placeholder={cfg.placeholders?.[key] || ""} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />
                        </label>
                      );
                    }
                    return <Input key={key} label={label} type={type} placeholder={cfg.placeholders?.[key]} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />;
                  })}
                </React.Fragment>
              ) : (
                <>
                  {cfg.fields.map(([key, label, type]) => {
                    if (type === "switch") {
                      return (
                        <div key={key} className="sf-manual__full" style={{ display: "flex", alignItems: "center" }}>
                          <div className="sf-modal__switch"><span className="sf-modal__switch-label">{label}</span><Switch checked={!!f[key]} onChange={(e) => set(key, e.target.checked)} /></div>
                        </div>
                      );
                    }
                    if (type === "area") {
                      return (
                        <label key={key} className="sf-modal__field sf-manual__full">
                          <span className="sf-modal__label">{label}</span>
                          <textarea className="sf-modal__textarea" rows={3} placeholder={cfg.placeholders?.[key] || ""} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />
                        </label>
                      );
                    }
                    if (type === "spinless") {
                      return <div key={key} className="sf-no-spin"><Input label={label} type="number" inputMode="numeric" min="0" placeholder={cfg.placeholders?.[key]} value={str(f[key])} onChange={(e) => set(key, e.target.value)} /></div>;
                    }
                    if (type === "skillselect") {
                      const skillOpts = [{ value: "", label: "Choose a skill…" }].concat((skills || []).map((s) => ({ value: s.name, label: s.name })));
                      return <Select key={key} label={label} options={skillOpts} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />;
                    }
                    if (type === "subject") {
                      return <div key={key} className="sf-manual__full"><Select label={label} options={subjectOpts} value={str(f[key])} onChange={(e) => set(key, e.target.value)} /></div>;
                    }
                    if (type && type.startsWith("select:")) {
                      const opts = type.slice(7).split(",");
                      return <Select key={key} label={label} options={opts} value={str(f[key]) || opts[0]} onChange={(e) => set(key, e.target.value)} />;
                    }
                    return <Input key={key} label={label} type={type} placeholder={cfg.placeholders?.[key]} value={str(f[key])} onChange={(e) => set(key, e.target.value)} />;
                  })}
                </>
              )}
            </div>
          )}
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {kind === "artifact" ? (
            <React.Fragment>
              {!editSubject && <Button variant="secondary" iconLeft={<Icon name="heart-plus" />} disabled={!canSave || !!attuneFull} onClick={saveAttuned}>Add attuned</Button>}
              <Button variant="primary" iconLeft={<Icon name={editSubject ? "check" : "plus"} />} disabled={!canSave} onClick={save}>{editSubject ? "Save changes" : "Add"}</Button>
            </React.Fragment>
          ) : kind === "wand" ? (
            <React.Fragment>
              <Button variant="secondary" iconLeft={<Icon name="hammer" />} disabled={!canSave} onClick={saveCraft}>Begin crafting</Button>
              <Button variant="primary" iconLeft={<Icon name="plus" />} disabled={!canSave} onClick={save}>Add</Button>
            </React.Fragment>
          ) : (
            <Button variant="primary" iconLeft={<Icon name={editSubject ? "check" : "plus"} />} disabled={!canSave || (kind === "potion" && !!sheafFull)} onClick={save}>
              {editSubject ? "Save changes" : kind === "potion" ? "Add to sheaf" : kind === "recipe" ? "Add to Recipes" : kind === "plant" ? "Add to cultivation" : kind === "glyph" ? "Add to library" : kind === "item" ? "Add to Inventory" : "Add to satchel"}
            </Button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
