"use client";

import * as React from "react";
import { Button, Select } from "@/ds";
import { Icon } from "../Icon";
import { SpellCard } from "./SpellCard";
import { DualRange, type RangeValue } from "./DualRange";
import type { Spell, Tone } from "../../types";

const SPELL_SORT_FIELDS: Array<[string, string, string]> = [
  ["auto", "Auto", "auto"],
  ["name", "Name", "text"],
  ["subject", "Subject", "text"],
  ["stat", "Stat", "text"],
  ["level", "Level", "level"],
  ["dc", "DC", "num"],
];
const SPELL_LEVEL_ORDER: Record<string, number> = { basic: 0, standard: 1, advanced: 2, legendary: 3, hex: 4, twisted: 4 };
const spellLevelRank = (v: string | null | undefined) => {
  if (!v) return 99;
  const f = String(v).trim().toLowerCase().split(/\s+/)[0];
  return SPELL_LEVEL_ORDER[f] != null ? SPELL_LEVEL_ORDER[f] : 50;
};
const SPELL_LEVELS = ["Basic", "Standard", "Advanced", "Legendary", "Hex"];

interface SpellFilters {
  subject: string;
  stat: string;
  level: string;
  dc: RangeValue;
  ritual: string;
  learned: string;
}

export interface SpellSectionProps {
  spells: Spell[];
  spellMod: (sp: Spell) => number;
  schoolToneOf: (schoolId: string) => Tone | undefined;
  subjectModFor?: (subjectKey: string) => number;
  onRoll: (spell: Spell, e: React.MouseEvent) => void;
  onEnchant?: (spell: Spell, e: React.MouseEvent) => void;
  onRemove: (spell: Spell) => void;
  onLearn: (spell: Spell, e: React.MouseEvent) => void;
  onSetDays: (spell: Spell, days: number) => void;
  onAddManually: () => void;
  onBrowseCompendium: () => void;
  onEdit?: (spell: Spell) => void;
}

const field = (sp: Spell, key: string) => (sp as unknown as Record<string, unknown>)[key];

export function SpellSection({
  spells, spellMod, schoolToneOf, subjectModFor,
  onRoll, onEnchant, onRemove, onLearn, onSetDays, onAddManually, onBrowseCompendium, onEdit,
}: SpellSectionProps) {
  const [openSpells, setOpenSpells] = React.useState<Set<string>>(() => new Set());
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ field: string; dir: "asc" | "desc" }>({ field: "auto", dir: "asc" });
  const [filters, setFilters] = React.useState<SpellFilters>({ subject: "any", stat: "any", level: "any", dc: [null, null], ritual: "any", learned: "any" });
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);

  const allOpen = spells.length > 0 && openSpells.size === spells.length;
  const toggleAll = () => {
    if (allOpen) setOpenSpells(new Set());
    else setOpenSpells(new Set(spells.map((sp) => sp.id)));
  };
  const toggleOne = (id: string) =>
    setOpenSpells((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  React.useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen, filterOpen]);

  const uniq = (arr: (string | undefined)[]) => [...new Set(arr.filter((v): v is string => v != null && v !== ""))].sort();
  const subjectOpts = uniq(spells.map((sp) => sp.subject));
  const statOpts = uniq(spells.map((sp) => sp.stat));
  const dcVals = spells.map((sp) => sp.dc).filter((v): v is number => v != null && !isNaN(v));
  const dcMax = dcVals.length ? Math.max(...dcVals) : 0;

  const facetCount = [
    filters.subject !== "any",
    filters.stat !== "any",
    filters.level !== "any",
    filters.dc[0] != null || filters.dc[1] != null,
    filters.ritual !== "any",
    filters.learned !== "any",
  ].filter(Boolean).length;

  const setF = <K extends keyof SpellFilters>(k: K, v: SpellFilters[K]) => setFilters((p) => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters({ subject: "any", stat: "any", level: "any", dc: [null, null], ritual: "any", learned: "any" });

  let visible = spells.filter((sp) => {
    if (filters.subject !== "any" && sp.subject !== filters.subject) return false;
    if (filters.stat !== "any" && sp.stat !== filters.stat) return false;
    if (filters.level !== "any" && sp.level !== filters.level) return false;
    if (filters.ritual !== "any") {
      const want = filters.ritual === "yes";
      if (!!sp.ritual !== want) return false;
    }
    if (filters.learned !== "any") {
      const isLearned = !sp.days || sp.days <= 0;
      if (isLearned !== (filters.learned === "yes")) return false;
    }
    if (filters.dc[0] != null || filters.dc[1] != null) {
      if (sp.dc == null) return false;
      if (filters.dc[0] != null && sp.dc < filters.dc[0]) return false;
      if (filters.dc[1] != null && sp.dc > filters.dc[1]) return false;
    }
    if (q) {
      const hay = (sp.name + " " + sp.subject + " " + sp.stat + " " + (sp.desc || "")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const sign = sort.dir === "asc" ? 1 : -1;
  const sortType = (SPELL_SORT_FIELDS.find((f) => f[0] === sort.field) || [])[2] || "text";
  visible = visible.slice().sort((a, b) => {
    if (sortType === "auto") {
      const am = subjectModFor ? subjectModFor(a.subjectKey) : 0;
      const bm = subjectModFor ? subjectModFor(b.subjectKey) : 0;
      let r = bm - am;
      if (r === 0) r = spellLevelRank(a.level) - spellLevelRank(b.level);
      if (r === 0) {
        const ad = a.dc == null ? Infinity : a.dc;
        const bd = b.dc == null ? Infinity : b.dc;
        r = ad - bd;
      }
      if (r === 0) r = String(a.name || "").toLowerCase().localeCompare(String(b.name || "").toLowerCase());
      return r;
    }
    let r: number;
    if (sortType === "num") {
      const av = parseFloat(String(field(a, sort.field)));
      const bv = parseFloat(String(field(b, sort.field)));
      const am = isNaN(av) || field(a, sort.field) == null;
      const bm = isNaN(bv) || field(b, sort.field) == null;
      if (am || bm) r = am && bm ? 0 : am ? 1 : -1;
      else r = av - bv;
    } else if (sortType === "level") {
      r = spellLevelRank(field(a, sort.field) as string) - spellLevelRank(field(b, sort.field) as string);
    } else {
      r = String(field(a, sort.field) || "").toLowerCase().localeCompare(String(field(b, sort.field) || "").toLowerCase());
    }
    if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    return r * sign;
  });

  const pickSort = (f: string) =>
    setSort((s) => (s.field === f && f !== "auto" ? { field: f, dir: s.dir === "asc" ? "desc" : "asc" } : { field: f, dir: "asc" }));
  const sortLabel = (SPELL_SORT_FIELDS.find((f) => f[0] === sort.field) || SPELL_SORT_FIELDS[0])[1];
  const hasFilters = facetCount > 0 || !!q;

  return (
    <React.Fragment>
      <div className="sf-sec-head sf-sec-head--actions sf-sec-head--wrap">
        <h2>Spells</h2>
        <hr className="sf-rule" />
        <span className="sf-sec-head__count">{spells.length} known</span>
        {spells.length > 0 && (
          <button className="sf-ghost-btn" onClick={toggleAll}>
            <Icon name={allOpen ? "chevrons-up" : "chevrons-down"} />
            {allOpen ? "Collapse" : "Expand"}
          </button>
        )}
        <div className="sf-sec-actions">
          <button className="sf-ghost-btn" onClick={onAddManually}><Icon name="pencil-line" /> Add manually</button>
          <Button variant="primary" size="sm" iconLeft={<Icon name="book-open-text" />} onClick={onBrowseCompendium}>Browse Compendium</Button>
        </div>
      </div>

      {spells.length === 0 ? (
        <div className="sf-spells-empty"><Icon name="sparkles" /><p>No spells learned yet. Inscribe one by hand, or summon the Compendium.</p></div>
      ) : (
        <React.Fragment>
          <div className="sf-comp-toolbar sf-spell-toolbar">
            <span className="sf-comp-count">
              {visible.length === spells.length ? spells.length + " spell" + (spells.length !== 1 ? "s" : "") : visible.length + " of " + spells.length}
            </span>

            <div className="sf-spell-search">
              <Icon name="search" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search spells…" />
              {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" /></button> : null}
            </div>

            <div className="sf-comp-controls">
              <div className="sf-pop" ref={filterRef}>
                <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filter spells">
                  <Icon name="sliders-horizontal" /><span>Filter</span>{facetCount ? <span className="sf-tool-dot" /> : null}
                </button>
                <div className={"sf-menu sf-filter-menu" + (filterOpen ? " show" : "")} role="dialog" aria-label="Filter options">
                  <div className="sf-menu__head">Refine spells</div>
                  {subjectOpts.length > 1 && (
                    <div className="sf-filter-group">
                      <label>Subject</label>
                      <Select options={[{ value: "any", label: "Any" }].concat(subjectOpts.map((s) => ({ value: s, label: s })))} value={filters.subject} onChange={(e) => setF("subject", e.target.value)} />
                    </div>
                  )}
                  {statOpts.length > 1 && (
                    <div className="sf-filter-group">
                      <label>Stat</label>
                      <Select options={[{ value: "any", label: "Any" }].concat(statOpts.map((s) => ({ value: s, label: s })))} value={filters.stat} onChange={(e) => setF("stat", e.target.value)} />
                    </div>
                  )}
                  <div className="sf-filter-group">
                    <label>Level</label>
                    <Select options={[{ value: "any", label: "Any" }].concat(SPELL_LEVELS.map((s) => ({ value: s, label: s })))} value={filters.level} onChange={(e) => setF("level", e.target.value)} />
                  </div>
                  {dcMax > 0 && <DualRange label="DC" max={dcMax} step={1} value={filters.dc} onChange={(v) => setF("dc", v)} />}
                  <div className="sf-filter-group">
                    <label>Ritual</label>
                    <div className="sf-filter-radios">
                      {([["any", "Any"], ["yes", "Yes"], ["no", "No"]] as const).map(([v, l]) => (
                        <label key={v} className={"sf-filter-radio" + (filters.ritual === v ? " on" : "")}>
                          <input type="radio" name="sf-spell-ritual" checked={filters.ritual === v} onChange={() => setF("ritual", v)} />{l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="sf-filter-group">
                    <label>Status</label>
                    <div className="sf-filter-radios">
                      {([["any", "Any"], ["yes", "Learned"], ["no", "Learning"]] as const).map(([v, l]) => (
                        <label key={v} className={"sf-filter-radio" + (filters.learned === v ? " on" : "")}>
                          <input type="radio" name="sf-spell-learned" checked={filters.learned === v} onChange={() => setF("learned", v)} />{l}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button className="sf-filter-reset" onClick={resetFilters} disabled={!facetCount}>Clear filters</button>
                </div>
              </div>

              <div className="sf-pop" ref={sortRef}>
                <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort spells">
                  <Icon name="arrow-up-down" /><span className="sf-tool-btn__label">Sort</span><span className="sf-tool-sep">·</span><span className="sf-tool-cur">{sortLabel}</span>
                </button>
                <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
                  <div className="sf-menu__head">Order by</div>
                  {SPELL_SORT_FIELDS.map(([key, label]) => (
                    <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => pickSort(key)}>
                      <span>{label}</span>
                      <span className="sf-sort-opt__dir">{sort.field === key && key !== "auto" ? <Icon name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} /> : null}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="sf-comp-empty">
              <Icon name="search-x" />
              <p>No spells match — try adjusting your filters.</p>
              {hasFilters ? <button className="sf-filter-reset" onClick={() => { resetFilters(); setQ(""); }}>Clear filters</button> : null}
            </div>
          ) : (
            <div className="sf-spells">
              {visible.map((sp) => (
                <SpellCard key={sp.id} spell={sp} mod={spellMod(sp)} schoolTone={schoolToneOf(sp.school)} onRoll={onRoll} onEnchant={onEnchant} onRemove={onRemove} onLearn={onLearn} onSetDays={onSetDays} open={openSpells.has(sp.id)} onToggle={() => toggleOne(sp.id)} onEdit={onEdit} />
              ))}
            </div>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}
