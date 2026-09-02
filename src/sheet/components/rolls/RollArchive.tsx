"use client";

/* ===========================================================================
   Starfall Academy — the full roll log ("The Chronicle")
   ---------------------------------------------------------------------------
   The dock shows the party's recent rolls; this is the whole history. It pages
   the campaign's `rolls` table backwards through useRollArchive and layers the
   utilities a long log needs: search, scope/roller/type/outcome filters, a
   newest-or-oldest sort, day grouping with sticky headers, and a tally of what
   the current view holds.
   =========================================================================== */
import * as React from "react";
import { createPortal } from "react-dom";
import { Button, IconButton } from "@/ds";
import { Icon } from "../Icon";
import { headline } from "../../data/roll-engine";
import { RollEntry, subLabel } from "./RollEntry";
import { useRollArchive } from "../../integration/useRollArchive";
import type { Roll } from "../../types";

export interface RollArchiveProps {
  open: boolean;
  onClose: () => void;
  /** The dock's in-memory log (newest first) — the archive's recent slice. */
  log: Roll[];
  meId?: string | null;
  /** Campaign whose history to page through; null for a solo character. */
  campaignId?: string | null;
}

type Scope = "all" | "mine" | "party" | "gm";

const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "party", label: "Party" },
  { id: "gm", label: "Game Master" },
];

const OUTCOMES = [
  { value: "any", label: "Any outcome" },
  { value: "inflection", label: "Inflections" },
  { value: "crit", label: "Criticals" },
  { value: "success", label: "Successes" },
  { value: "failure", label: "Failures" },
];

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
};

const dayLabel = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (dayKey(ts) === dayKey(today.getTime())) return "Today";
  if (dayKey(ts) === dayKey(yesterday.getTime())) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const clockOf = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const rollerKey = (r: Roll) => (r.who.gm ? "gm:" + r.who.name : "pc:" + (r.who.id || r.who.name));

/** Everything a free-text query should be able to reach in one roll. */
const haystack = (r: Roll) =>
  [r.label, r.who.name, r.stat, subLabel(r), r.detail, r.success, r.fail, r.hlText, r.sitReason, r.crit?.label, r.crit?.text, ...(r.meta || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export function RollArchive({ open, onClose, log, meId, campaignId }: RollArchiveProps) {
  const { rolls, loading, hasMore, total, error, loadMore, retry } = useRollArchive({
    campaignId: campaignId ?? null,
    live: log,
    active: open,
  });

  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("all");
  const [roller, setRoller] = React.useState("any");
  const [kind, setKind] = React.useState("any");
  const [outcome, setOutcome] = React.useState("any");
  const [oldestFirst, setOldestFirst] = React.useState(false);
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = React.useState(false);

  // The dock is a low z-index fixed layer, so the archive is portalled up to
  // the sheet root it lives in — still inside `.sf-sheet`, so the scoped CSS
  // applies. The anchor below finds that root once it is in the document.
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const anchor = React.useCallback((node: HTMLSpanElement | null) => {
    const root = node ? node.closest<HTMLElement>(".sf-sheet") : null;
    if (root) setHost(root);
  }, []);

  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Escape closes; the search takes focus when the archive opens.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // Pull the next older page as the reader nears the bottom.
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!open || !node || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) loadMore();
      },
      { root: listRef.current, rootMargin: "300px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [open, hasMore, loading, loadMore, rolls.length]);

  const rollers = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rolls) if (!m.has(rollerKey(r))) m.set(rollerKey(r), r.who.name);
    return Array.from(m, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rolls]);

  const kinds = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of rolls) if (r.kind) s.add(String(r.kind));
    return Array.from(s).sort();
  }, [rolls]);

  const items = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rolls.filter((r) => {
      if (scope === "mine" && r.who.id !== meId) return false;
      if (scope === "gm" && !r.who.gm) return false;
      if (scope === "party" && (r.who.gm || r.who.id === meId)) return false;
      if (roller !== "any" && rollerKey(r) !== roller) return false;
      if (kind !== "any" && String(r.kind) !== kind) return false;
      if (outcome !== "any") {
        const key = headline(r).key;
        if (outcome === "crit" ? key !== "crit-success" && key !== "crit-fail" : key !== outcome) return false;
      }
      if (needle && !haystack(r).includes(needle)) return false;
      return true;
    });
    return oldestFirst ? out.slice().reverse() : out;
  }, [rolls, scope, roller, kind, outcome, q, meId, oldestFirst]);

  const tally = React.useMemo(() => {
    let success = 0, failure = 0, crit = 0, inflection = 0;
    for (const r of items) {
      const key = headline(r).key;
      if (key === "inflection") inflection++;
      else if (key === "crit-success") { crit++; success++; }
      else if (key === "crit-fail") { crit++; failure++; }
      else if (r.result === "success") success++;
      else if (r.result === "failure") failure++;
    }
    return { success, failure, crit, inflection };
  }, [items]);

  // Day groups, in the order the sort produced.
  const groups = React.useMemo(() => {
    const out: Array<{ key: string; label: string; rolls: Roll[] }> = [];
    for (const r of items) {
      const k = dayKey(r.ts);
      const last = out[out.length - 1];
      if (last && last.key === k) last.rolls.push(r);
      else out.push({ key: k, label: dayLabel(r.ts), rolls: [r] });
    }
    return out;
  }, [items]);

  const filtered = q.trim() !== "" || scope !== "all" || roller !== "any" || kind !== "any" || outcome !== "any";
  const resetFilters = () => {
    setQ("");
    setScope("all");
    setRoller("any");
    setKind("any");
    setOutcome("any");
  };
  const toggleRow = (id: string) => setOpenRows((p) => ({ ...p, [id]: !p[id] }));

  const view = (
    <React.Fragment>
      <div className={"sf-scrim sf-scrim--arch" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-arch" + (open ? " open" : "")} role="dialog" aria-modal="true" aria-label="Full roll log">
        <div className="sf-arch__head">
          <span className="sf-arch__glyph"><Icon name="scroll-text" /></span>
          <div className="sf-drawer__title">
            <span className="sf-eyebrow">The Roll Log</span>
            <h2>Every roll, from the first</h2>
          </div>
          <span className="sf-arch__count">
            {items.length.toLocaleString()} shown
            {filtered ? <span className="sf-arch__count-of"> of {rolls.length.toLocaleString()} loaded</span> : null}
            {total != null && total > rolls.length ? <span className="sf-arch__count-of"> · {total.toLocaleString()} in the archive</span> : null}
          </span>
          <IconButton label="Close the full log" variant="ghost" onClick={onClose}><Icon name="x" /></IconButton>
        </div>

        <div className="sf-arch__tools">
          <div className="sf-drawer__search sf-arch__search">
            <Icon name="search" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search rolls — a name, a spell, a skill, an outcome…"
              aria-label="Search the roll log"
            />
            {q ? <button className="sf-search-clear" onClick={() => setQ("")} aria-label="Clear search"><Icon name="x" /></button> : null}
          </div>

          <div className="sf-arch__row">
            <div className="sf-dock__filters" role="group" aria-label="Whose rolls">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  className={"sf-dock__filt" + (scope === s.id ? " is-active" : "")}
                  aria-pressed={scope === s.id}
                  onClick={() => setScope(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="sf-arch__selects">
              <select className="sf-arch__select" value={roller} onChange={(e) => setRoller(e.target.value)} aria-label="Filter by who rolled">
                <option value="any">Anyone</option>
                {rollers.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <select className="sf-arch__select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by roll type">
                <option value="any">Any type</option>
                {kinds.map((k) => <option key={k} value={k}>{cap(k)}</option>)}
              </select>
              <select className="sf-arch__select" value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Filter by outcome">
                {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button
                className="sf-arch__toggle"
                onClick={() => setOldestFirst((v) => !v)}
                aria-label={oldestFirst ? "Sorted oldest first" : "Sorted newest first"}
              >
                <Icon name={oldestFirst ? "arrow-up-narrow-wide" : "arrow-down-wide-narrow"} />
                {oldestFirst ? "Oldest first" : "Newest first"}
              </button>
              <button
                className={"sf-arch__toggle" + (expandAll ? " is-on" : "")}
                onClick={() => { setExpandAll((v) => !v); setOpenRows({}); }}
              >
                <Icon name={expandAll ? "chevrons-down-up" : "chevrons-up-down"} />
                {expandAll ? "Collapse all" : "Expand all"}
              </button>
              {filtered ? (
                <button className="sf-arch__toggle is-reset" onClick={resetFilters}>
                  <Icon name="rotate-ccw" /> Reset
                </button>
              ) : null}
            </div>
          </div>

          <div className="sf-arch__tally">
            <span className="sf-arch__stat"><b>{items.length.toLocaleString()}</b> rolls</span>
            <span className="sf-arch__stat out-success"><b>{tally.success.toLocaleString()}</b> successes</span>
            <span className="sf-arch__stat out-fail"><b>{tally.failure.toLocaleString()}</b> failures</span>
            <span className="sf-arch__stat out-crit"><b>{tally.crit.toLocaleString()}</b> criticals</span>
            <span className="sf-arch__stat out-inflection"><b>{tally.inflection.toLocaleString()}</b> inflections</span>
          </div>
        </div>

        <div className="sf-arch__list" ref={listRef}>
          {error ? (
            <div className="sf-arch__error">
              <Icon name="triangle-alert" />
              <p>The older pages of the archive could not be read. {error}</p>
              <Button variant="secondary" size="sm" onClick={retry}>Try again</Button>
            </div>
          ) : null}

          {items.length === 0 && !loading ? (
            <div className="sf-log-empty">
              <Icon name="dices" />
              <p>{filtered ? "No rolls match this view." : "No rolls have been made yet."}</p>
              {filtered ? <Button variant="ghost" size="sm" onClick={resetFilters}>Clear the filters</Button> : null}
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="sf-arch__day">
                <header className="sf-arch__dayhead">
                  <span className="sf-arch__daylabel">{g.label}</span>
                  <span className="sf-arch__dayrule" />
                  <span className="sf-arch__daycount">{g.rolls.length} {g.rolls.length === 1 ? "roll" : "rolls"}</span>
                </header>
                {g.rolls.map((r) => {
                  const hasDetail = !!(r.detail || r.success || r.fail || r.sitReason || r.hlText || r.hl || (r.meta && r.meta.length));
                  const isOpen = expandAll ? !openRows[r.id] : !!openRows[r.id];
                  return (
                    <div
                      key={r.id}
                      className={"sf-log-row sf-arch__row-entry out-" + headline(r).key + (hasDetail ? " has-detail" : "")}
                      onClick={hasDetail ? () => toggleRow(r.id) : undefined}
                    >
                      <RollEntry roll={r} expanded={isOpen} compact affordance />
                      <span className="sf-log-time">{clockOf(r.ts)}</span>
                    </div>
                  );
                })}
              </section>
            ))
          )}

          <div ref={sentinelRef} className="sf-arch__sentinel" />

          <div className="sf-arch__foot">
            {loading ? (
              <span className="sf-arch__loading"><Icon name="loader-circle" className="sf-arch__spin" /> Reading the archive…</span>
            ) : hasMore ? (
              <Button variant="secondary" size="sm" onClick={loadMore} iconLeft={<Icon name="chevrons-down" />}>Load older rolls</Button>
            ) : rolls.length ? (
              <span className="sf-arch__end">
                <span className="sf-arch__endrule" />
                {campaignId ? "The beginning of the log" : "Every roll from this session"}
                <span className="sf-arch__endrule" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <span ref={anchor} hidden aria-hidden="true" />
      {host ? createPortal(view, host) : null}
    </React.Fragment>
  );
}
