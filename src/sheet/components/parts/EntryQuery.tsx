"use client";

/* ===========================================================================
   Starfall Academy — useEntryQuery
   ---------------------------------------------------------------------------
   The shared search / filter / sort toolbar used by the character-creator
   Spells step and Inventory picks. Returns the filtered+sorted `visible`
   list plus a ready-to-render `toolbar` node, driven by the per-category
   config in data/entry-query.
   =========================================================================== */
import * as React from "react";
import { Select } from "@/ds";
import { Icon } from "../Icon";
import { DualRange } from "./DualRange";
import {
  COMP_FILTERS, COMP_SORT_FIELDS,
  applyFilters, applySort, buildInitFilters, countFacets, rangeMeta, selectOptions,
  type FilterValue, type Filters, type RangeValue, type SortState,
} from "../../data/entry-query";
import type { CompendiumEntry } from "../../types";

export interface EntryQueryOpts {
  /** Singular / plural noun for the count chip. @default "entry" / "entries" */
  noun?: string;
  nounPlural?: string;
  /** Heading shown atop the filter menu, e.g. "Refine potions". */
  label?: string;
  searchPlaceholder?: string;
  defaultSort?: SortState;
}

export function useEntryQuery(cat: string, items: CompendiumEntry[], opts: EntryQueryOpts = {}) {
  const sortFields = COMP_SORT_FIELDS[cat] || COMP_SORT_FIELDS.spell;
  const filterCfg = COMP_FILTERS[cat] || [];
  const noun = opts.noun || "entry";
  const nounPlural = opts.nounPlural || "entries";

  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(opts.defaultSort || { field: sortFields[0][0], dir: "asc" });
  const [filters, setFilters] = React.useState<Filters>(() => buildInitFilters(cat));
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen, filterOpen]);

  const setF = (k: string, v: FilterValue) => setFilters((p) => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters(buildInitFilters(cat));
  const pickSort = (f: string) => setSort((s) => (s.field === f ? { field: f, dir: s.dir === "asc" ? "desc" : "asc" } : { field: f, dir: "asc" }));

  const facetCount = countFacets(filterCfg, filters);
  const visible = applySort(applyFilters(items, filterCfg, filters, q), sortFields, sort);
  const sortLabel = (sortFields.find((f) => f[0] === sort.field) || sortFields[0])[1];

  const clearAll = () => { resetFilters(); setQ(""); };

  const toolbar = (
    <div className="sf-comp-toolbar sf-spell-toolbar">
      <span className="sf-comp-count">{visible.length === items.length ? items.length + " " + (items.length === 1 ? noun : nounPlural) : visible.length + " of " + items.length}</span>

      <div className="sf-spell-search">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={opts.searchPlaceholder || "Search…"} />
        {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" /></button> : null}
      </div>

      <div className="sf-comp-controls">
        <div className="sf-pop" ref={filterRef}>
          <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} disabled={!filterCfg.length} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filter">
            <Icon name="sliders-horizontal" /><span>Filter</span>{facetCount ? <span className="sf-tool-dot" /> : null}
          </button>
          <div className={"sf-menu sf-filter-menu" + (filterOpen ? " show" : "")} role="dialog" aria-label="Filter options">
            {opts.label ? <div className="sf-menu__head">{opts.label}</div> : null}
            {filterCfg.map((f, i) => {
              if (f.kind === "select") {
                const optsList = selectOptions(items, f.key);
                if (!optsList.length) return null;
                return (
                  <div key={i} className="sf-filter-group">
                    <label>{f.label}</label>
                    <Select options={[{ value: "any", label: "Any" }].concat(optsList.map((s) => ({ value: s, label: s })))} value={(filters[f.key] as string) || "any"} onChange={(e) => setF(f.key, e.target.value)} />
                  </div>
                );
              }
              if (f.kind === "level") {
                return (
                  <div key={i} className="sf-filter-group">
                    <label>Level</label>
                    <Select options={[{ value: "any", label: "Any" }].concat(f.levels.map((s) => ({ value: s, label: s })))} value={(filters.level as string) || "any"} onChange={(e) => setF("level", e.target.value)} />
                  </div>
                );
              }
              if (f.kind === "range") {
                const { max, step } = rangeMeta(items, f.key);
                return <DualRange key={i} label={f.label} max={max} step={step} value={(filters[f.key] as RangeValue) || [null, null]} onChange={(v) => setF(f.key, v)} />;
              }
              if (f.kind === "radio") {
                return (
                  <div key={i} className="sf-filter-group">
                    <label>{f.label}</label>
                    <div className="sf-filter-radios">
                      {([["any", "Any"], ["yes", "Yes"], ["no", "No"]] as const).map(([v, l]) => (
                        <label key={v} className={"sf-filter-radio" + (((filters[f.key] as string) || "any") === v ? " on" : "")}>
                          <input type="radio" name={"f-" + cat + "-" + f.key} checked={((filters[f.key] as string) || "any") === v} onChange={() => setF(f.key, v)} />{l}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <button className="sf-filter-reset" onClick={resetFilters} disabled={!facetCount}>Clear filters</button>
          </div>
        </div>

        {sortFields.length > 1 ? (
          <div className="sf-pop" ref={sortRef}>
            <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort">
              <Icon name="arrow-up-down" /><span>{sortLabel}</span>
            </button>
            <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
              <div className="sf-menu__head">Order by</div>
              {sortFields.map(([key, label]) => (
                <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => { pickSort(key); }}>
                  <span>{label}</span>
                  <span className="sf-sort-opt__dir">{sort.field === key ? <Icon name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} /> : null}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return { visible, toolbar, q, facetCount, clearAll };
}
