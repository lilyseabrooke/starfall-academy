"use client";

import * as React from "react";
import { Badge, Banner, Button, IconButton, Select } from "@/ds";
import { Icon } from "../Icon";
import { DualRange, type RangeValue } from "./DualRange";
import { PLANT_ROLL_LABEL, TONE_500, levelTone, parsePlantRoll } from "../../data/shared";
import {
  COMP_FILTERS, COMP_SORT_FIELDS, compLevelRank, field,
  type FilterValue, type Filters,
} from "../../data/entry-query";
import type { CompendiumCat, CompendiumEntry, Tone } from "../../types";

const learnDaysFor = (level: string | undefined) => {
  const l = (level || "").toLowerCase();
  if (l.startsWith("basic")) return 1;
  if (l.startsWith("standard")) return 2;
  if (l.startsWith("advanced")) return 5;
  return 10;
};

export interface CompendiumProps {
  open: boolean;
  onClose: () => void;
  data: { compendiumCats: CompendiumCat[]; compendium: CompendiumEntry[] };
  addedIds: string[];
  onAdd: (id: string) => void;
  onAddAttuned: (id: string) => void;
  onAddLearning: (id: string) => void;
  onAddPotionSheaf: (id: string) => void;
  onAddPotionRecipe: (id: string) => void;
  onAddWandCraft: (id: string) => void;
  potionSheafCount: number;
  potionCap: number;
  potionRecipes?: { name: string }[];
  lastAdded?: string | null;
  cultivationCap?: number;
  plantSum?: number;
  attuneFull?: boolean;
  cat: string;
  setCat: (id: string) => void;
  width?: number;
}

export function Compendium({
  open, onClose, data, addedIds, onAdd, onAddAttuned, onAddLearning, onAddPotionSheaf,
  onAddPotionRecipe, onAddWandCraft, potionSheafCount, potionCap, potionRecipes, lastAdded,
  cultivationCap = 0, plantSum = 0, attuneFull, cat, setCat, width,
}: CompendiumProps) {
  const buildInitFilters = (catId: string): Filters => {
    const o: Filters = {};
    (COMP_FILTERS[catId] || []).forEach((f) => {
      if (f.kind === "range") o[f.key] = [null, null];
      else if (f.kind === "level") o.level = "any";
      else o[f.key] = "any";
    });
    return o;
  };
  const [q, setQ] = React.useState("");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sort, setSort] = React.useState<{ field: string; dir: "asc" | "desc" }>({ field: "name", dir: "asc" });
  const [filters, setFilters] = React.useState<Filters>(() => buildInitFilters(cat));
  const [openIds, setOpenIds] = React.useState<Record<string, boolean>>({});
  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);

  const catLabel = (id: string) => (data.compendiumCats.find((c) => c.id === id) || ({} as Partial<CompendiumCat>)).label || id;
  const sortFields = COMP_SORT_FIELDS[cat] || COMP_SORT_FIELDS.spell;
  const filterCfg = COMP_FILTERS[cat] || [];

  React.useEffect(() => {
    setSort({ field: "name", dir: "asc" });
    setFilters(buildInitFilters(cat));
    setSortOpen(false);
    setFilterOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  React.useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen, filterOpen]);

  const inCat = data.compendium.filter((e) => e.cat === cat);
  const uniq = (arr: unknown[]) => [...new Set(arr.filter((v) => v != null && v !== ""))] as string[];
  const selectOptions = (key: string) => uniq(inCat.map((e) => field(e, key)));
  const rangeMeta = (key: string) => {
    let m = 0;
    inCat.forEach((e) => {
      const v = parseFloat(String(field(e, key)));
      if (!isNaN(v) && v > m) m = v;
    });
    const step = key === "cost" ? 10 : 1;
    const max = key === "cost" ? Math.max(step, Math.ceil(m / step) * step) : Math.max(1, Math.ceil(m));
    return { max, step };
  };
  const facetCount = filterCfg.reduce((n, f) => {
    if (f.kind === "range") {
      const r = (filters[f.key] as RangeValue) || [null, null];
      return n + (r[0] != null || r[1] != null ? 1 : 0);
    }
    const k = f.kind === "level" ? "level" : f.key;
    return n + (filters[k] && filters[k] !== "any" ? 1 : 0);
  }, 0);

  let items = inCat.filter((e) => {
    for (const f of filterCfg) {
      if (f.kind === "select") {
        const v = filters[f.key] as string;
        if (v && v !== "any" && field(e, f.key) !== v) return false;
      } else if (f.kind === "level") {
        const v = filters.level as string;
        if (v && v !== "any" && e.level !== v) return false;
      } else if (f.kind === "radio") {
        const v = filters[f.key] as string;
        if (v && v !== "any") {
          const want = v === "yes";
          if (!!field(e, f.key) !== want) return false;
        }
      } else if (f.kind === "range") {
        const r = (filters[f.key] as RangeValue) || [null, null];
        const val = parseFloat(String(field(e, f.key)));
        if (r[0] != null && (isNaN(val) || val < r[0])) return false;
        if (r[1] != null && (isNaN(val) || val > r[1])) return false;
      }
    }
    if (q) {
      const hay = (e.name + " " + (e.meta || []).join(" ") + " " + e.desc + " " + (e.ability || "")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const sign = sort.dir === "asc" ? 1 : -1;
  const type = (sortFields.find((f) => f[0] === sort.field) || [])[2] || "text";
  items = items.slice().sort((a, b) => {
    let r: number;
    if (type === "num") {
      const av = parseFloat(String(field(a, sort.field)));
      const bv = parseFloat(String(field(b, sort.field)));
      const am = isNaN(av);
      const bm = isNaN(bv);
      if (am || bm) r = am && bm ? 0 : am ? 1 : -1;
      else r = av - bv;
    } else if (type === "level") {
      r = compLevelRank(field(a, sort.field) as string) - compLevelRank(field(b, sort.field) as string);
    } else {
      r = String(field(a, sort.field) || "").toLowerCase().localeCompare(String(field(b, sort.field) || "").toLowerCase());
    }
    if (r === 0) r = String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
    return r * sign;
  });

  const pickSort = (f: string) => setSort((s) => (s.field === f ? { field: f, dir: s.dir === "asc" ? "desc" : "asc" } : { field: f, dir: "asc" }));
  const setF = (k: string, v: FilterValue) => setFilters((p) => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters(buildInitFilters(cat));
  const toggleEntry = (id: string) => setOpenIds((m) => ({ ...m, [id]: !m[id] }));
  const sortLabel = (sortFields.find((f) => f[0] === sort.field) || sortFields[0])[1];

  const factsFor = (e: CompendiumEntry): Array<[string, string | number]> => {
    const f: Array<[string, string | number]> = [];
    if (e.subject) f.push(["Field", e.subject]);
    if (e.bonusLabel) f.push(["Grants", e.bonusLabel]);
    if (e.condition) f.push(["Condition", e.condition]);
    if (e.stat) f.push(["Base", e.stat]);
    if (e.ap != null) f.push(["AP", e.ap]);
    if (e.dc != null) f.push(["DC", e.dc]);
    if (e.intensity != null) f.push(["Intensity", e.intensity]);
    if (e.value != null) f.push(["Value", e.value]);
    if (e.cost) f.push(["Cost", e.cost]);
    if (e.cat === "plant" && e.removeOnUse != null) f.push(["Single-use", e.removeOnUse ? "Yes" : "No"]);
    if (e.cat === "plant" && e.requiresRoll) f.push(["On use", PLANT_ROLL_LABEL[parsePlantRoll(e.requiresRoll).mode]]);
    if (e.ritual) f.push(["Ritual", "Yes"]);
    return f;
  };

  return (
    <React.Fragment>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-drawer" + (open ? " open" : "")} role="dialog" aria-label="Compendium" style={width ? ({ "--drawer-w": width + "px" } as React.CSSProperties) : undefined}>
        <div className="sf-drawer__head">
          <span className="sf-fac__glyph" style={{ "--fac-accent": "var(--gold-500)", "--fac-accent-fg": "var(--gold-300)", background: "var(--brand-subtle)", color: "var(--gold-200)" } as React.CSSProperties}>
            <Icon name="library-big" />
          </span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">The Archive</span>
            <h2>Compendium</h2>
          </div>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>

        <div className="sf-drawer__search">
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the archive…" />
          {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" /></button> : null}
        </div>

        <div className="sf-cats" role="tablist">
          {data.compendiumCats.map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} className={"sf-cat" + (cat === c.id ? " is-active" : "")} onClick={() => setCat(c.id)}>
              <Icon name={c.icon} /> {c.label}
            </button>
          ))}
        </div>

        <div className="sf-comp-toolbar">
          <span className="sf-comp-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
          <div className="sf-comp-controls">
            <div className="sf-pop" ref={filterRef}>
              <button className={"sf-tool-btn" + (filterOpen ? " is-open" : "")} disabled={!filterCfg.length} onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }} aria-label="Filters">
                <Icon name="sliders-horizontal" /><span>Filters</span>{facetCount ? <span className="sf-tool-dot" /> : null}
              </button>
              <div className={"sf-menu sf-filter-menu" + (filterOpen ? " show" : "")} role="dialog" aria-label="Filter options">
                <div className="sf-menu__head">Refine {catLabel(cat)}</div>
                {filterCfg.map((f, i) => {
                  if (f.kind === "select") {
                    const opts = selectOptions(f.key);
                    if (!opts.length) return null;
                    return (
                      <div key={i} className="sf-filter-group">
                        <label>{f.label}</label>
                        <Select options={[{ value: "any", label: "Any" }].concat(opts.map((s) => ({ value: s, label: s })))} value={(filters[f.key] as string) || "any"} onChange={(e) => setF(f.key, e.target.value)} />
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
                    const { max, step } = rangeMeta(f.key);
                    return <DualRange key={i} label={f.label} max={max} step={step} value={(filters[f.key] as RangeValue) || [null, null]} onChange={(v) => setF(f.key, v)} />;
                  }
                  if (f.kind === "radio") {
                    return (
                      <div key={i} className="sf-filter-group">
                        <label>{f.label}</label>
                        <div className="sf-filter-radios">
                          {([["any", "Any"], ["yes", "Yes"], ["no", "No"]] as const).map(([v, l]) => (
                            <label key={v} className={"sf-filter-radio" + (((filters[f.key] as string) || "any") === v ? " on" : "")}>
                              <input type="radio" name={"f-" + f.key} checked={((filters[f.key] as string) || "any") === v} onChange={() => setF(f.key, v)} />{l}
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

            <div className="sf-pop" ref={sortRef}>
              <button className={"sf-tool-btn" + (sortOpen ? " is-open" : "")} onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }} aria-label="Sort entries">
                <Icon name="arrow-up-down" /><span className="sf-tool-btn__label">Sort</span><span className="sf-tool-sep">·</span><span className="sf-tool-cur">{sortLabel}</span>
              </button>
              <div className={"sf-menu sf-sort-menu" + (sortOpen ? " show" : "")} role="dialog" aria-label="Sort options">
                <div className="sf-menu__head">Order by</div>
                {sortFields.map(([key, label]) => (
                  <button key={key} className={"sf-sort-opt" + (sort.field === key ? " is-active" : "")} onClick={() => pickSort(key)}>
                    <span>{label}</span>
                    <span className="sf-sort-opt__dir">{sort.field === key ? <Icon name={sort.dir === "asc" ? "arrow-up" : "arrow-down"} /> : null}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="sf-comp-list">
          {items.length === 0 ? (
            <div className="sf-comp-empty">
              <Icon name="search-x" />
              <p>No entries match — try another wing of the archive.</p>
              {facetCount || q ? <button className="sf-filter-reset" onClick={() => { resetFilters(); setQ(""); }}>Clear filters</button> : null}
            </div>
          ) : (
            items.map((e) => {
              const added = e.cat === "spell" && addedIds.includes(e.id);
              const isOpen = !!openIds[e.id];
              const facts = factsFor(e);
              const tone = levelTone(e.level);
              const inRecipes = e.cat === "potion" && !!(potionRecipes || []).find((r) => r.name === e.name);
              const sheafFull = potionSheafCount >= potionCap;
              return (
                <div key={e.id} className={"sf-entry" + (isOpen ? " is-open" : "") + (tone ? "" : " is-neutral")} style={{ "--ent-accent": tone ? TONE_500[tone] : "var(--ink-500)" } as React.CSSProperties}>
                  <div className="sf-entry__head" onClick={() => toggleEntry(e.id)}>
                    <div className="sf-entry__headline">
                      <span className="sf-entry__name">{e.name}</span>
                      <div className="sf-entry__meta">
                        <Badge tone={tone && tone !== "silver" ? tone : "neutral"} dot>{e.level}</Badge>
                        {(e.meta || []).length ? <span className="sf-entry__metatxt">{(e.meta || []).join(" · ")}</span> : null}
                      </div>
                    </div>
                    <div className="sf-entry__actions">
                      {cat === "potion" ? (
                        <>
                          <button className="sf-entry__add" disabled={inRecipes} onClick={(ev) => { ev.stopPropagation(); onAddPotionRecipe(e.id); }} title={inRecipes ? "Already in recipes" : "Add to Recipes"} aria-label="Add to Recipes"><Icon name="scroll" /></button>
                          <button className="sf-entry__add" disabled={sheafFull} onClick={(ev) => { ev.stopPropagation(); onAddPotionSheaf(e.id); }} title={sheafFull ? "Sheaf is full" : "Add to Potion Sheaf"} aria-label="Add to Potion Sheaf"><Icon name="flask-conical" /></button>
                        </>
                      ) : cat === "wand" ? (
                        <>
                          <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddWandCraft(e.id); }} title="Begin crafting" aria-label="Begin crafting"><Icon name="hammer" /></button>
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Icon name="check" /></button>
                          ) : (
                            <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={"Add " + e.name + " to sheet"} title="Add to sheet"><Icon name="plus" /></button>
                          )}
                        </>
                      ) : cat === "artifact" ? (
                        <>
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Icon name="check" /></button>
                          ) : (
                            <>
                              <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddAttuned(e.id); }} disabled={attuneFull} aria-label={"Add " + e.name + " attuned"} title="Add attuned"><Icon name="heart-plus" /></button>
                              <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={"Add " + e.name + " to sheet"} title="Add to sheet"><Icon name="plus" /></button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {cat === "spell" && !added && (
                            <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAddLearning(e.id); }} aria-label={"Add learning materials for " + e.name} title={"Add learning materials (" + learnDaysFor(e.level) + " days)"}><Icon name="book-open" /></button>
                          )}
                          {added ? (
                            <button className="sf-entry__add is-added" disabled aria-label="Already added"><Icon name="check" /></button>
                          ) : (() => {
                            const overCap = e.cat === "plant" && cultivationCap > 0 && plantSum + (e.value || 0) > cultivationCap;
                            return <button className="sf-entry__add" onClick={(ev) => { ev.stopPropagation(); onAdd(e.id); }} aria-label={overCap ? "Exceeds cultivation capacity" : "Add " + e.name + " to sheet"} title={overCap ? "Exceeds cultivation capacity (" + plantSum + "/" + cultivationCap + ")" : "Add to sheet"} disabled={overCap}><Icon name="plus" /></button>;
                          })()}
                        </>
                      )}
                      <span className="sf-entry__chev"><Icon name="chevron-down" /></span>
                    </div>
                  </div>
                  <div className="sf-entry__body" hidden={!isOpen}>
                    <div className="sf-entry__rule" />
                    {facts.length ? (
                      <div className="sf-entry__facts">
                        {facts.map(([k, v]) => <div key={k} className="sf-fact"><span className="sf-fact__k">{k}</span><span className="sf-fact__v">{v}</span></div>)}
                      </div>
                    ) : null}
                    <p className="sf-entry__desc">{e.desc}</p>
                    {e.ability ? (
                      <div className="sf-entry__ability">
                        <span className="sf-entry__ability-lbl"><Icon name="sparkles" /> Ability</span>
                        <p className="sf-entry__ability-text">{e.ability}</p>
                      </div>
                    ) : null}
                    <div className="sf-entry__foot">
                      <span className="sf-entry__cost">{e.cat === "spell" ? "" : e.cost || ""}</span>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        {e.cat === "potion" ? (
                          <>
                            <Button variant="secondary" size="sm" iconLeft={<Icon name="scroll" />} disabled={inRecipes} onClick={() => onAddPotionRecipe(e.id)}>{inRecipes ? "In recipes" : "Add to Recipes"}</Button>
                            <Button variant="primary" size="sm" iconLeft={<Icon name="flask-conical" />} disabled={sheafFull} onClick={() => onAddPotionSheaf(e.id)}>{sheafFull ? "Sheaf full" : "Add to Sheaf"}</Button>
                          </>
                        ) : e.cat === "wand" ? (
                          <>
                            <Button variant="secondary" size="sm" iconLeft={<Icon name="hammer" />} onClick={() => onAddWandCraft(e.id)}>Begin crafting</Button>
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Icon name="check" />} disabled>Added</Button>
                            ) : (
                              <Button variant="primary" size="sm" iconLeft={<Icon name="plus" />} onClick={() => onAdd(e.id)}>Add to sheet</Button>
                            )}
                          </>
                        ) : e.cat === "artifact" ? (
                          <>
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Icon name="check" />} disabled>Added</Button>
                            ) : (
                              <>
                                <Button variant="secondary" size="sm" iconLeft={<Icon name="heart-plus" />} disabled={attuneFull} onClick={() => onAddAttuned(e.id)}>Add attuned</Button>
                                <Button variant="primary" size="sm" iconLeft={<Icon name="plus" />} onClick={() => onAdd(e.id)}>Add to sheet</Button>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {e.cat === "spell" && !added && (
                              <Button variant="secondary" size="sm" iconLeft={<Icon name="book-open" />} onClick={() => onAddLearning(e.id)}>Add learning materials</Button>
                            )}
                            {added ? (
                              <Button variant="secondary" size="sm" iconLeft={<Icon name="check" />} disabled>Added</Button>
                            ) : (() => {
                              const overCap = e.cat === "plant" && cultivationCap > 0 && plantSum + (e.value || 0) > cultivationCap;
                              return <Button variant="primary" size="sm" iconLeft={<Icon name="plus" />} disabled={overCap} onClick={() => onAdd(e.id)} title={overCap ? "Exceeds cultivation capacity (" + plantSum + "/" + cultivationCap + ")" : undefined}>{overCap ? "Over capacity" : "Add to sheet"}</Button>;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={"sf-toast" + (lastAdded ? " show" : "")}>
          {lastAdded && (
            <Banner tone="success" icon={<Icon name="check-circle" />} title="Added to your sheet">
              {lastAdded} now appears under its section.
            </Banner>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
