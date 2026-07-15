"use client";

import * as React from "react";
import { Button, IconButton, Input, Select, Switch } from "@/ds";
import { Icon } from "../Icon";
import type { MagicSchool, Move, Stat } from "../../types";

export interface ClassListItem {
  id: string;
  name: string;
  rank: number;
}

export interface ManualMoveProps {
  open: boolean;
  onClose: () => void;
  onSave: (move: Move) => void;
  schools: MagicSchool[];
  stats: Stat[];
  classesList: ClassListItem[];
  editMove?: Move | null;
}

interface MoveForm {
  name: string;
  rollType: "stat" | "subject" | "skill";
  stat: string;
  subjectKey: string;
  skill: string;
  ap: number | string;
  addRank: boolean;
  classKey: string;
  dc: string;
  desc: string;
}

const BLANK: MoveForm = { name: "", rollType: "stat", stat: "", subjectKey: "", skill: "", ap: 0, addRank: false, classKey: "", dc: "", desc: "" };

export function ManualMove({ open, onClose, onSave, schools, stats, classesList, editMove }: ManualMoveProps) {
  const [f, setF] = React.useState<MoveForm>(BLANK);
  const isClassMove = !!editMove?.fromClass;
  React.useEffect(() => {
    if (!open) return;
    if (editMove) {
      const rollType: MoveForm["rollType"] = editMove.kind === "subject" ? "subject" : editMove.subjectKey ? "subject" : editMove.skill && editMove.skill !== "—" ? "skill" : "stat";
      setF({
        name: editMove.name || "",
        rollType,
        stat: editMove.stat || "",
        subjectKey: editMove.subjectKey || "",
        skill: rollType === "skill" ? editMove.skill || "" : "",
        ap: editMove.ap != null ? editMove.ap : 0,
        addRank: !!editMove.addRank,
        classKey: editMove.fromClass || "",
        dc: editMove.dc != null ? String(editMove.dc) : "",
        desc: editMove.desc || "",
      });
    } else {
      setF(BLANK);
    }
  }, [open, editMove]);
  const set = <K extends keyof MoveForm>(k: K, v: MoveForm[K]) => setF((p) => ({ ...p, [k]: v }));

  const allSubs: { value: string; label: string }[] = [];
  schools.forEach((s) => s.subjects.forEach((sub) => allSubs.push({ value: sub.key, label: sub.name })));
  allSubs.sort((a, b) => a.label.localeCompare(b.label));
  const subjectOpts = [{ value: "", label: "Choose a field…" }, ...allSubs];

  const statOpts = [{ value: "", label: "Choose a stat…" }].concat(stats.map((s) => ({ value: s.name, label: s.name })));

  const allSkills: { value: string; label: string; stat: string }[] = [];
  stats.forEach((s) => s.skills.forEach((sk) => allSkills.push({ value: sk.name, label: sk.name, stat: s.name })));
  allSkills.sort((a, b) => a.label.localeCompare(b.label));
  const skillOpts = [{ value: "", label: "Choose a skill…" }, ...allSkills];

  const hasClasses = classesList.some((c) => c.rank > 0);
  const classOpts = [{ value: "", label: "Choose a class…" }].concat(
    classesList.filter((c) => c.rank > 0).map((c) => ({ value: c.id, label: c.name }))
  );

  const canSave = !!f.name.trim() && (isClassMove || (f.rollType === "stat" ? !!f.stat : f.rollType === "subject" ? !!f.subjectKey : !!f.skill));

  const save = () => {
    if (!canSave) return;
    if (isClassMove && editMove) {
      onSave({ ...editMove, name: f.name.trim(), dc: f.dc === "" ? null : parseInt(f.dc, 10), desc: f.desc.trim() });
      onClose();
      return;
    }
    let stat = f.stat;
    let skill = "—";
    let subjectKey: string | undefined;
    let kind = "skill";
    if (f.rollType === "subject") {
      const sub = schools.flatMap((s) => s.subjects).find((x) => x.key === f.subjectKey);
      if (sub) {
        stat = sub.stat;
        skill = sub.name;
        subjectKey = sub.key;
        kind = "subject";
      }
    } else if (f.rollType === "skill") {
      const found = allSkills.find((sk) => sk.value === f.skill);
      skill = f.skill;
      if (found) stat = found.stat;
    }
    let classLabel: string | undefined;
    if (f.addRank && f.classKey) {
      const cls = classesList.find((c) => c.id === f.classKey);
      classLabel = cls ? cls.name : f.classKey;
    }
    onSave({
      id: editMove ? editMove.id : "mv-" + Date.now(),
      name: f.name.trim(),
      stat,
      skill,
      subjectKey,
      kind,
      ap: parseInt(String(f.ap), 10) || 0,
      dc: f.dc === "" ? null : parseInt(f.dc, 10),
      desc: f.desc.trim(),
      addRank: f.addRank && !!f.classKey,
      fromClass: f.addRank && f.classKey ? f.classKey : undefined,
      classLabel,
    });
    onClose();
  };

  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-modal" + (open ? " open" : "")} role="dialog" aria-label={editMove ? "Edit move" : "Add a move"}>
        <div className="sf-modal__head">
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">Technique trainer</span>
            <h2>{editMove ? "Edit move" : "New move"}</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>
        <div className="sf-modal__body">
          <Input label="Name" placeholder="e.g. Internal Compass" value={f.name} onChange={(e) => set("name", e.target.value)} />
          {isClassMove ? (
            <p className="sf-modal__hint"><Icon name="info" /> This move&apos;s linked ability is set by its class rank and can&apos;t be changed here.</p>
          ) : (
            <React.Fragment>
              <div className="sf-modal__field">
                <span className="sf-modal__label">Rolls with</span>
                <div className="sf-move-type-row">
                  {([["stat", "Stat"], ["subject", "Subject"], ["skill", "Skill"]] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      className={"sf-move-type-btn" + (f.rollType === val ? " is-on" : "")}
                      onClick={() => { set("rollType", val); set("stat", ""); set("subjectKey", ""); set("skill", ""); }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              {f.rollType === "subject" ? (
                <Select label="Subject" options={subjectOpts} value={f.subjectKey} onChange={(e) => set("subjectKey", e.target.value)} />
              ) : f.rollType === "skill" ? (
                <Select label="Skill" options={skillOpts} value={f.skill} onChange={(e) => set("skill", e.target.value)} />
              ) : (
                <Select label="Stat" options={statOpts} value={f.stat} onChange={(e) => set("stat", e.target.value)} />
              )}
            </React.Fragment>
          )}
          <div className="sf-modal__row">
            {isClassMove ? null : <div className="sf-no-spin"><Input label="AP" type="number" value={f.ap} onChange={(e) => set("ap", e.target.value)} /></div>}
            <div className="sf-no-spin"><Input label="DC" type="number" placeholder="—" value={f.dc} onChange={(e) => set("dc", e.target.value)} /></div>
          </div>
          {!isClassMove && hasClasses && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)" }}>
              <div className="sf-modal__switch" style={{ flex: "none" }}>
                <span className="sf-modal__switch-label">Add class rank</span>
                <Switch checked={f.addRank} onChange={(e) => { set("addRank", e.target.checked); if (!e.target.checked) set("classKey", ""); }} />
              </div>
              {f.addRank && (
                <div style={{ flex: 1 }}>
                  <Select label="Class" options={classOpts} value={f.classKey} onChange={(e) => set("classKey", e.target.value)} />
                </div>
              )}
            </div>
          )}
          <label className="sf-modal__field">
            <span className="sf-modal__label">Description</span>
            <textarea className="sf-modal__textarea" rows={3} placeholder="How does the move work?" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
          </label>
        </div>
        <div className="sf-modal__foot">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconLeft={<Icon name={editMove ? "check" : "plus"} />} disabled={!canSave} onClick={save}>{editMove ? "Save changes" : "Add move"}</Button>
        </div>
      </div>
    </React.Fragment>
  );
}
