"use client";

import * as React from "react";
import { Button, IconButton, Input, Select, Switch } from "@/ds";
import { Icon } from "../Icon";
import type { MagicSchool, Spell } from "../../types";

export interface ManualSpellProps {
  open: boolean;
  onClose: () => void;
  onSave: (spell: Spell) => void;
  schools: MagicSchool[];
  editSpell?: Spell | null;
}

interface SpellForm {
  name: string;
  level: string;
  subjectKey: string;
  ap: number | string;
  dc: string;
  ritual: boolean;
  volatile: boolean;
  stat: string;
  desc: string;
  higherLevel: string;
  replaceCheck: string;
}

const BLANK: SpellForm = { name: "", level: "Basic", subjectKey: "", ap: 1, dc: "", ritual: false, volatile: false, stat: "", desc: "", higherLevel: "", replaceCheck: "" };

export function ManualSpell({ open, onClose, onSave, schools, editSpell }: ManualSpellProps) {
  const [f, setF] = React.useState<SpellForm>(BLANK);
  React.useEffect(() => {
    if (!open) return;
    if (editSpell) {
      setF({
        name: editSpell.name || "",
        level: editSpell.level || "Basic",
        subjectKey: editSpell.subjectKey || "",
        ap: editSpell.ap != null ? editSpell.ap : 1,
        dc: editSpell.dc != null ? String(editSpell.dc) : "",
        ritual: !!editSpell.ritual,
        volatile: !!editSpell.volatile,
        stat: editSpell.stat || "",
        desc: editSpell.desc || "",
        higherLevel: editSpell.higherLevel || "",
        replaceCheck: editSpell.replaceCheck || "",
      });
    } else {
      setF(BLANK);
    }
  }, [open, editSpell]);
  const set = <K extends keyof SpellForm>(k: K, v: SpellForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const allSubs: { value: string; label: string }[] = [];
  schools.forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
  allSubs.sort((a, b) => a.label.localeCompare(b.label));
  const subjectOpts = [{ value: "", label: "Choose a field…" }, ...allSubs];
  const canSave = !!f.name.trim() && !!f.subjectKey;

  const save = () => {
    if (!canSave) return;
    let school: MagicSchool | undefined;
    let sub: MagicSchool["subjects"][number] | undefined;
    for (const s of schools) {
      const x = s.subjects.find((su) => su.key === f.subjectKey);
      if (x) {
        sub = x;
        school = s;
        break;
      }
    }
    if (!sub || !school) return;
    onSave({
      id: editSpell ? editSpell.id : "sp-" + Date.now(),
      name: f.name.trim(),
      level: f.level,
      subjectKey: sub.key,
      subject: sub.name,
      school: school.id,
      stat: f.stat || sub.stat,
      ap: parseInt(String(f.ap), 10) || 0,
      dc: f.dc === "" ? null : parseInt(f.dc, 10),
      ritual: f.ritual,
      volatile: f.volatile,
      days: editSpell ? editSpell.days || 0 : 0,
      desc: f.desc.trim(),
      higherLevel: f.higherLevel.trim(),
      replaceCheck: f.replaceCheck.trim() || undefined,
    });
    onClose();
  };

  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label="Add a spell">
        <div className="sf-modal__head">
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">Spell designer</span>
            <h2>{editSpell ? "Edit spell" : "New spell"}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <Input label="Name" placeholder="e.g. Spectral Strike" value={f.name} onChange={(e) => set("name", e.target.value)} />
          <div className="sf-modal__row">
            <Select label="Field of magic" options={subjectOpts} value={f.subjectKey} onChange={(e) => set("subjectKey", e.target.value)} />
            <Select label="Level" options={["Basic", "Standard", "Advanced", "Legendary", "Hex"]} value={f.level} onChange={(e) => set("level", e.target.value)} />
          </div>
          {f.level === "Hex" && (
            <div className="sf-modal__row">
              <div className="sf-no-spin"><Input label="AP cost" type="number" min="0" max="9" value={f.ap} onChange={(e) => set("ap", e.target.value)} /></div>
            </div>
          )}
          <div className="sf-modal__row">
            <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.dc} onChange={(e) => set("dc", e.target.value)} /></div>
            <Select
              label="Base stat"
              options={[
                { value: "", label: "Follows field" },
                { value: "Focus", label: "Focus" },
                { value: "Creativity", label: "Creativity" },
                { value: "Logic", label: "Logic" },
                { value: "Insight", label: "Insight" },
                { value: "Body", label: "Body" },
                { value: "Charm", label: "Charm" },
              ]}
              value={f.stat}
              onChange={(e) => set("stat", e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "var(--space-6)" }}>
            <div className="sf-modal__switch">
              <span className="sf-modal__switch-label">Ritual</span>
              <Switch checked={f.ritual} onChange={(e) => set("ritual", e.target.checked)} />
            </div>
            <div className="sf-modal__switch">
              <span className="sf-modal__switch-label">Volatile</span>
              <Switch checked={f.volatile} onChange={(e) => set("volatile", e.target.checked)} />
            </div>
          </div>
          <label className="sf-modal__field">
            <span className="sf-modal__label">Description</span>
            <textarea className="sf-modal__textarea" rows={3} placeholder="What does the spell do, and how?" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          </label>
          <label className="sf-modal__field">
            <span className="sf-modal__label">Higher-level behavior</span>
            <textarea className="sf-modal__textarea" rows={2} placeholder="How it scales with degrees of success — e.g. You affect (1/2/4+) target(s)." value={f.higherLevel} onChange={(e) => set("higherLevel", e.target.value)} />
          </label>
          <Input
            label="Replaces check"
            placeholder="e.g. agility, athletics, spell-backfire (evocation)"
            value={f.replaceCheck}
            onChange={(e) => set("replaceCheck", e.target.value)}
            hint="Checks this spell can be rolled instead of — skills, subjects, or a roll type (action, resist, enchanting, artificy-backfire…). Narrow a roll type with a qualifier in parentheses."
          />
          {f.subjectKey ? (
            <p className="sf-modal__hint"><Icon name="info" /> Rolls 2d10 + your base stat + this field&apos;s rank. The base stat follows the field.</p>
          ) : null}
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Icon name={editSpell ? "check" : "plus"} />} disabled={!canSave} onClick={save}>{editSpell ? "Save changes" : "Add spell"}</Button>
        </div>
      </div>
    </React.Fragment>
  );
}
