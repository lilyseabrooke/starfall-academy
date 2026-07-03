"use client";

/* ===========================================================================
   Starfall Academy — The Admission: wizard shell
   Ported from public/character-sheet/forge.jsx. Full-screen takeover:
   step-rail + the Identity / Wand / Review steps + the footer (budget HUD,
   Back / Next / Begin). Heavy steps come from forge-steps.tsx.
   =========================================================================== */
import * as React from "react";
import { Button, Crest, Input } from "@/ds";
import { Icon } from "../components/Icon";
import { TONE_500, TONE_FG } from "../data/shared";
import type { ClassDef } from "../data/classes";
import * as F from "./forge-state";
import type { Draft, ForgeData } from "./forge-state";
import {
  AdmissionAllocation,
  AdmissionClasses,
  AdmissionInventory,
  AdmissionSpells,
} from "./forge-steps";

type SetFn = (patch: Partial<Draft>) => void;

interface ClassData {
  classes: ClassDef[];
}

const STEPS = [
  { id: "identity", label: "Identity", icon: "user-round" },
  { id: "classes", label: "Classes", icon: "graduation-cap" },
  { id: "wand", label: "Starting Wand", icon: "wand-sparkles" },
  { id: "allocation", label: "Stats & Abilities", icon: "sliders-horizontal" },
  { id: "inventory", label: "Inventory", icon: "backpack" },
  { id: "spells", label: "Spells", icon: "sparkles" },
  { id: "review", label: "Review", icon: "scroll-text" },
];
// A respec only ever touches identity fields and stat/ability allocation
// (see commitForge) — starting wand/inventory/spells are one-time admission
// choices, and classes/moves/bonuses are live play state, not something to
// revisit from the "edit character" respec. There's nothing to review either
// once those are the only two editable sections.
const RESPEC_STEPS = STEPS.filter((s) => ["identity", "allocation"].includes(s.id));
const DRAFT_KEY = "sf-admission-draft";

/* ------------------------------- Identity ----------------------------- */
function IdentityStep({ D, draft, set }: { D: ForgeData; draft: Draft; set: SetFn }) {
  const builds: ["quick" | "custom", string, string][] = (() => {
    const yr = D.creation.years.find((y) => y.id === draft.yearId) || D.creation.years[0];
    const q = yr.quick;
    return [
      ["quick", "Quick build", `Three tidy pools — ${q.stat} stats · ${q.subject} subjects · ${q.skill} skills.`],
      ["custom", "Custom build", `One pool · ${yr.custom} pts — fine-tune, and buy class ranks, wands, artifacts.`],
    ];
  })();

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Student Profile</h3>
        <p className="sf-fhint">Define who you are and what you do here at Starfall. Pick your year, your House, and write a bio to describe who you are.</p>
      </div>

      <div className="sf-frow sf-frow--2">
        <Input label="Name" placeholder="e.g. Arianna Valey" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        <Input label="Pronouns" placeholder="e.g. she / her" value={draft.pronouns} onChange={(e) => set({ pronouns: e.target.value })} />
      </div>

      <div className="sf-ffield">
        <span className="sf-flabel">Year</span>
        <div className="sf-seg">
          {D.creation.years.map((y) => (
            <button key={y.id} type="button" className={"sf-seg__opt" + (draft.yearId === y.id ? " is-active" : "")} onClick={() => set({ yearId: y.id })}>{y.label}</button>
          ))}
        </div>
      </div>

      <div className="sf-ffield">
        <span className="sf-flabel">Build</span>
        <div className="sf-seg">
          {builds.map(([v, l, d]) => (
            <button key={v} type="button" className={"sf-seg__opt sf-seg__opt--tall" + (draft.buildType === v ? " is-active" : "")} onClick={() => set({ buildType: v })}>
              <span className="sf-seg__t">{l}</span><span className="sf-seg__d">{d}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sf-ffield">
        <span className="sf-flabel">House <span className="sf-flabel__opt">· flavor, and your sheet&apos;s color</span></span>
        <div className="sf-fhouses">
          {D.houses.map((h) => (
            <button key={h.id} type="button" onClick={() => set({ houseId: h.id })}
              className={"sf-fhouse" + (draft.houseId === h.id ? " is-active" : "")} style={{ "--h-accent": TONE_500[h.tone], "--h-accent-fg": TONE_FG[h.tone] } as React.CSSProperties}>
              <span className="sf-fhouse__dot"></span>
              <span className="sf-fhouse__name">{h.name}</span>
              <span className="sf-fhouse__blurb">{h.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <Input label="Title" placeholder="e.g. Child of the Darkness" value={draft.title} onChange={(e) => set({ title: e.target.value })} hint="Leave blank to derive one from your major." />

      <label className="sf-ffield">
        <span className="sf-flabel">Background <span className="sf-flabel__opt">· optional</span></span>
        <textarea className="sf-ftextarea" rows={3} placeholder="Who are you, and where did you come from?" value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
      </label>
    </div>
  );
}

/* --------------------------------- Wand ------------------------------- */
function WandStep({ D, draft, set }: { D: ForgeData; draft: Draft; set: SetFn }) {
  const wand = F.wandById(D, draft.wandId);
  const count = wand.count;
  const chosen = draft.wandTargets || [];

  const pickWand = (id: string) => { if (id !== draft.wandId) set({ wandId: id, wandTargets: [] }); };

  // Stat target (Sylene): single stat.
  const setStat = (statName: string) => set({ wandTargets: [statName] });
  // Ability targets (Champion/Whispered): subjects + skills, capped at count.
  const abilities: F.WandAbilityTarget[] = ([] as F.WandAbilityTarget[]).concat(
    F.flatSubjects(D).map((s) => ({ type: "subject", key: s.key, label: s.name })),
    F.flatSkills(D).map((s) => ({ type: "skill", key: s.id, label: s.name })),
  );
  const hasAbility = (key: string) => chosen.some((t) => t && typeof t !== "string" && t.key === key);
  const toggleAbility = (a: F.WandAbilityTarget) => {
    if (hasAbility(a.key)) set({ wandTargets: chosen.filter((t) => t == null || typeof t === "string" || t.key !== a.key) });
    else if (chosen.length < count) set({ wandTargets: [...chosen, { type: a.type, key: a.key, label: a.label }] });
  };

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Choose Your Wand</h3>
        <p className="sf-fhint">A good caster swears by their wand. You&apos;ll collect more on your journey, but choose your starter wand.</p>
      </div>

      <div className="sf-fwands">
        {D.creation.startingWands.map((w) => (
          <button key={w.id} type="button" onClick={() => pickWand(w.id)} className={"sf-fwand" + (draft.wandId === w.id ? " is-active" : "")}>
            <span className="sf-fwand__glyph"><Icon name="wand-sparkles" /></span>
            <span className="sf-fwand__name">{w.name}</span>
            <span className="sf-fwand__grant">{w.grant}</span>
            <span className="sf-fwand__desc">{w.desc}</span>
          </button>
        ))}
      </div>

      <div className="sf-ftargets">
        <div className="sf-ftargets__head">
          <span className="sf-flabel">{wand.kind === "stat" ? "Choose one Stat" : `Choose ${count} Abilit${count > 1 ? "ies" : "y"}`}</span>
          <span className="sf-ftargets__count">{chosen.length}/{count}</span>
        </div>

        {wand.kind === "stat" ? (
          <div className="sf-fchips">
            {D.stats.map((f) => (
              <button key={f.id} type="button" className={"sf-fchip" + (chosen[0] === f.name ? " is-on" : "")} onClick={() => setStat(f.name)}>
                {f.name} <span className="sf-fchip__v">+{wand.value}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="sf-ftargets__list">
            {(["Subjects", "Skills"] as const).map((grpKind) => {
              const list = abilities.filter((a) => (grpKind === "Subjects" ? a.type === "subject" : a.type === "skill"));
              return (
                <div key={grpKind} className="sf-ftargets__grp">
                  <div className="sf-ftargets__glabel">{grpKind}</div>
                  <div className="sf-fchips">
                    {list.map((a) => {
                      const on = hasAbility(a.key);
                      const full = !on && chosen.length >= count;
                      return (
                        <button key={a.type + a.key} type="button" disabled={full} onClick={() => toggleAbility(a)} className={"sf-fchip" + (on ? " is-on" : "") + (full ? " is-dim" : "")}>
                          {a.label}{on ? <span className="sf-fchip__v">+{wand.value}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Review ------------------------------ */
function ReviewStep({ D, classData, draft, missing }: { D: ForgeData; classData: ClassData; draft: Draft; missing: string[] }) {
  const year = F.yearById(D, draft.yearId), house = F.houseById(D, draft.houseId), wand = F.wandById(D, draft.wandId);
  const b = F.budgets(draft, D);
  const subjName = (k: string) => { const s = F.flatSubjects(D).find((x) => x.key === k); return s ? s.name : k; };
  const majors = draft.major.map(subjName);
  const owned = F.ownedClasses(draft).map((id) => { const k = classData.classes.find((c) => c.id === id); return k ? `${k.name} ${F.ROMAN[draft.classes[id].rank]}` : id; });
  const topStats = D.stats.map((f) => ({ n: f.name, v: draft.stats[f.id] || 0 })).filter((x) => x.v > 0).sort((a, b2) => b2.v - a.v);
  const topSubs = F.flatSubjects(D).map((s) => ({ n: s.name, v: draft.subjects[s.key] || 0 })).filter((x) => x.v > 0).sort((a, b2) => b2.v - a.v);

  const Line = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="sf-rev__line"><span className="sf-rev__k">{k}</span><span className="sf-rev__v">{children}</span></div>;

  return (
    <div className="sf-fstep-body">
      <div className="sf-fhead">
        <h3>Review &amp; begin</h3>
        <p className="sf-fhint">A last look before {draft.mode === "edit" ? "saving your changes" : "your arcanist steps onto the Grounds"}.</p>
      </div>

      {missing.length ? (
        <div className="sf-rev__warn">
          <Icon name="triangle-alert" />
          <div><b>Not quite ready.</b> <span>{missing.join(" · ")}</span></div>
        </div>
      ) : null}

      <div className="sf-rev">
        <div className="sf-rev__hero" style={{ "--h-accent": TONE_500[house.tone], "--h-accent-fg": TONE_FG[house.tone] } as React.CSSProperties}>
          <span className="sf-rev__dot"></span>
          <div>
            <div className="sf-rev__name">{draft.name || "Unnamed arcanist"}</div>
            <div className="sf-rev__sub">{year.label} · {house.name}{majors.length ? " · " + majors.join(" & ") : ""}</div>
          </div>
          <span className="sf-rev__build">{b.mode === "custom" ? `Custom · ${b.remaining} pts left` : "Quick build"}</span>
        </div>

        <Line k="Classes">{owned.length ? owned.join(" · ") : <em className="sf-rev__none">none chosen</em>}</Line>
        <Line k="Starting wand">{wand.name} — {wand.grant}{draft.wandTargets.length ? " (" + draft.wandTargets.map((t) => (typeof t === "string" ? t : t ? t.label : "")).join(", ") + ")" : ""}</Line>
        <Line k="Top stats">{topStats.length ? topStats.slice(0, 4).map((x) => `${x.n} ${x.v}`).join(" · ") : <em className="sf-rev__none">none</em>}</Line>
        <Line k="Top subjects">{topSubs.length ? topSubs.slice(0, 4).map((x) => `${x.n} ${x.v}`).join(" · ") : <em className="sf-rev__none">none</em>}</Line>
        <Line k="Spells">{draft.spells.length ? draft.spells.length + " chosen" : <em className="sf-rev__none">none</em>}</Line>
        <Line k="Loadout">{D.creation.startingMaterials} mat · {draft.potions.length} potion(s) · {draft.glyphs.length} glyph(s) · {draft.craftWands.length + draft.extraWands.length} extra wand(s) · {draft.artifacts.length} artifact(s)</Line>
      </div>
    </div>
  );
}

/* ------------------------------ Budget HUD ---------------------------- */
const HUD_META: Record<string, { icon: string; tone: string }> = {
  Stats: { icon: "hexagon", tone: "var(--gold-400)" },
  Subjects: { icon: "sparkles", tone: TONE_500.plum },
  Skills: { icon: "list-checks", tone: TONE_500.teal },
  Points: { icon: "gem", tone: "var(--gold-400)" },
};

function Meter({ label, spent, pool }: { label: string; spent: number; pool: number }) {
  const over = spent > pool, full = spent === pool && !over;
  const m = HUD_META[label] || { icon: "", tone: "" };
  return (
    <div className={"sf-hud__meter" + (over ? " is-over" : "") + (full ? " is-full" : "")} style={{ "--m": m.tone } as React.CSSProperties}>
      <span className="sf-hud__l">{m.icon ? <Icon name={m.icon} /> : null} {label}</span>
      <span className="sf-hud__bar"><span className="sf-hud__fill" style={{ width: Math.min(100, pool ? (spent / pool) * 100 : 0) + "%" }}></span></span>
      <span className="sf-hud__n">{spent}<small>/{pool}</small></span>
    </div>
  );
}

function BudgetHUD({ D, draft }: { D: ForgeData; draft: Draft }) {
  const b = F.budgets(draft, D);
  const cap = <span className="sf-hud__cap">Year cap <b>{b.limit}</b></span>;
  if (b.mode === "quick") {
    return <div className="sf-hud">{cap}<Meter label="Stats" spent={b.stat.spent} pool={b.stat.pool} /><Meter label="Subjects" spent={b.subject.spent} pool={b.subject.pool} /><Meter label="Skills" spent={b.skill.spent} pool={b.skill.pool} /></div>;
  }
  return <div className="sf-hud">{cap}<Meter label="Points" spent={b.spent} pool={b.pool} /><span className={"sf-hud__rem" + (b.remaining < 0 ? " is-over" : "")}>{b.remaining} left</span></div>;
}

/* ------------------------------- The shell ---------------------------- */
export interface AdmissionProps {
  mode: "new" | "edit";
  initial: Draft;
  data: ForgeData;
  classData: ClassData;
  onCommit: (draft: Draft) => void;
  onClose: () => void;
}

export function Admission({ mode, initial, data, classData, onCommit, onClose }: AdmissionProps) {
  const D = data;
  const [draft, setDraft] = React.useState<Draft>(initial);
  const [idx, setIdx] = React.useState(0);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const steps = mode === "edit" ? RESPEC_STEPS : STEPS;
  const step = steps[idx];

  // Persist new-character drafts so a refresh mid-build is safe.
  React.useEffect(() => {
    if (draft.mode === "new") { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ } }
  }, [draft]);

  const validOf = (id: string) => F.stepValid(id, draft, D);
  const missing: string[] = [];
  if (!draft.name.trim()) missing.push("name your arcanist");
  if (draft.mode !== "edit") {
    if (!F.classValid(draft)) missing.push(draft.classMode === "single" ? "one class at rank IV" : "two classes at rank II");
    if (!F.wandValid(draft, D)) missing.push("finish your wand's targets");
    if (!F.majorValid(draft)) missing.push("star a major field");
    if (F.overCap(draft, D)) missing.push("a rank exceeds the year cap");
    if (F.overBudget(draft, D)) missing.push("you're over budget");
    if (!F.spellsOk(draft, D)) missing.push("too many spells for your year");
  }
  const ready = missing.length === 0;

  const begin = () => { if (ready) { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } onCommit(draft); } };
  const cancel = () => { if (draft.mode === "new") { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } } onClose(); };

  const showHUD = draft.mode !== "edit" && ["classes", "allocation", "inventory"].includes(step.id);

  return (
    <div className="sf-admission" role="dialog" aria-label="The Admission — character creation">
      <div className="sf-admission__scrim" onClick={cancel}></div>
      <div className="sf-admission__shell">
        {/* rail */}
        <aside className="sf-admission__rail">
          <div className="sf-admission__brand">
            <Crest form="lines" size={34} tint="gold" />
            <div className="sf-admission__brandwm">
              <span className="sf-eyebrow">{mode === "edit" ? "Records" : "Admission"}</span>
              <span className="sf-admission__brandt">{mode === "edit" ? "Edit character" : "New arcanist"}</span>
            </div>
          </div>
          <nav className="sf-admission__steps">
            {steps.map((s, i) => (
              <button key={s.id} type="button" className={"sf-admission__step" + (i === idx ? " is-active" : "") + (validOf(s.id) && i !== idx ? " is-done" : "")} onClick={() => setIdx(i)}>
                <span className="sf-admission__stepnum">{validOf(s.id) && i !== idx ? <Icon name="check" /> : <Icon name={s.icon} />}</span>
                <span className="sf-admission__steplabel">{s.label}</span>
              </button>
            ))}
          </nav>
          <button className="sf-admission__cancel" onClick={cancel} type="button"><Icon name="x" /> {mode === "edit" ? "Discard changes" : "Cancel"}</button>
        </aside>

        {/* content */}
        <div className="sf-admission__main">
          <div className="sf-admission__scroll">
            {step.id === "identity" && <IdentityStep D={D} draft={draft} set={set} />}
            {step.id === "classes" && <AdmissionClasses D={D} classData={classData} draft={draft} set={set} />}
            {step.id === "wand" && <WandStep D={D} draft={draft} set={set} />}
            {step.id === "allocation" && <AdmissionAllocation D={D} draft={draft} set={set} />}
            {step.id === "inventory" && <AdmissionInventory D={D} draft={draft} set={set} />}
            {step.id === "spells" && <AdmissionSpells D={D} draft={draft} set={set} />}
            {step.id === "review" && <ReviewStep D={D} classData={classData} draft={draft} missing={missing} />}
          </div>

          <footer className="sf-admission__foot">
            <Button variant="ghost" disabled={idx === 0} iconLeft={<Icon name="arrow-left" />} onClick={() => setIdx((i) => Math.max(0, i - 1))}>Back</Button>
            {showHUD ? <BudgetHUD D={D} draft={draft} /> : <div className="sf-admission__footspace"></div>}
            {/* Respec has just two short pages — put Save on both instead of
                making the player click through to the last one to commit. */}
            {mode === "edit" && (
              <Button variant={idx < steps.length - 1 ? "ghost" : "primary"} iconLeft={<Icon name="check" />} disabled={!ready} onClick={begin}>Save</Button>
            )}
            {idx < steps.length - 1 ? (
              <Button variant="primary" iconLeft={<Icon name="arrow-right" />} onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}>Next</Button>
            ) : (
              mode !== "edit" && <Button variant="primary" iconLeft={<Icon name="check" />} disabled={!ready} onClick={begin}>Begin</Button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
