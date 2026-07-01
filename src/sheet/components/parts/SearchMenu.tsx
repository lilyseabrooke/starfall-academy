"use client";

/* ===========================================================================
   Starfall Academy — search menu
   Ported from public/character-sheet/search-menu.jsx (window.SF_SearchMenu).
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import type { SearchResult as SearchResultData } from "../../data/search";

const CATEGORY_TONE: Record<string, string> = {
  Stat: "var(--plum-400)",
  Skill: "var(--plum-300)",
  Subject: "var(--teal-400)",
  Spell: "var(--teal-300)",
  Move: "var(--forest-400)",
  Artifact: "var(--gold-400)",
  Wand: "var(--gold-300)",
  Potion: "var(--teal-400)",
  Recipe: "var(--teal-300)",
  Plant: "var(--forest-300)",
  Item: "var(--crimson-300)",
  Glyph: "var(--plum-300)",
  Condition: "var(--crimson-400)",
  "Resist Roll": "var(--crimson-300)",
  Class: "var(--plum-400)",
  "Class Ability": "var(--plum-300)",
  "Map Location": "var(--teal-300)",
  Bonus: "var(--gold-300)",
};

const ACTION_ICON = { roll: "dices", repair: "hammer", wandcraft: "hammer", use: "check-check" };

export interface SearchMenuProps {
  query: string;
  results: SearchResultData[];
  onQueryChange: (q: string) => void;
  onSelect: (r: SearchResultData) => void;
  onRoll: (r: SearchResultData) => void;
  onRepair: (r: SearchResultData) => void;
  onUse: (r: SearchResultData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchMenu({ query, results, onQueryChange, onSelect, onRoll, onRepair, onUse, isOpen, onClose }: SearchMenuProps) {
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const [dropStyle, setDropStyle] = React.useState<React.CSSProperties>({});
  const [, setMobileExpanded] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent));
  }, []);

  React.useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen && !query) setMobileExpanded(false);
  }, [isOpen, query]);

  React.useEffect(() => {
    setHighlightIdx(-1);
  }, [results]);

  React.useEffect(() => {
    if (!menuRef.current) return;
    const update = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      setDropStyle((prev) => {
        const next: React.CSSProperties = {
          position: "fixed",
          top: rect.bottom + 8,
          right: Math.max(8, window.innerWidth - rect.right),
          maxWidth: Math.min(420, window.innerWidth - 16),
        };
        if (prev.top === next.top && prev.right === next.right) return prev;
        return next;
      });
    };
    const t = setTimeout(update, 50);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((p) => Math.min(p + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((p) => Math.max(p - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIdx >= 0 && results[highlightIdx]) onSelect(results[highlightIdx]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, results, highlightIdx, onSelect, onClose]);

  React.useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen, onClose]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className={"srch" + (isOpen ? " srch--mobile-open" : "")} ref={menuRef}>
      <button className="srch__mobile-toggle" aria-label="Search" onClick={() => setMobileExpanded(true)}>
        <Icon name="search" />
      </button>
      <div className="srch__field">
        <Icon name="search" className="srch__icon" />
        <input
          ref={inputRef}
          type="text"
          className="srch__input"
          placeholder="Search sheet…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search sheet"
          aria-haspopup="listbox"
          aria-expanded={hasQuery}
        />
        {query ? (
          <button
            className="srch__clear"
            onClick={() => { onQueryChange(""); setMobileExpanded(false); inputRef.current && inputRef.current.focus(); }}
            aria-label="Clear"
          >
            <Icon name="x" />
          </button>
        ) : (
          <kbd className="srch__hint">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        )}
      </div>

      {hasQuery && (
        <div className="srch__dropdown" role="listbox" style={dropStyle}>
          {results.length === 0 ? (
            <div className="srch__empty">
              <Icon name="search-x" className="srch__empty-icon" />
              <span>Nothing found for <em>{query}</em></span>
            </div>
          ) : (
            <ul className="srch__list" ref={listRef}>
              {results.map((r, idx) => (
                <SearchResult
                  key={r.id}
                  result={r}
                  highlighted={idx === highlightIdx}
                  onSelect={() => onSelect(r)}
                  onRoll={() => onRoll(r)}
                  onRepair={() => onRepair(r)}
                  onUse={() => onUse(r)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface ResultAction {
  key: string;
  icon: string;
  label: string;
  tone: string;
  onClick: (e: React.MouseEvent) => void;
}

function SearchResult({
  result,
  highlighted,
  onSelect,
  onRoll,
  onRepair,
  onUse,
}: {
  result: SearchResultData;
  highlighted: boolean;
  onSelect: () => void;
  onRoll: () => void;
  onRepair: () => void;
  onUse: () => void;
}) {
  const tone = CATEGORY_TONE[result.category] || "var(--text-muted)";
  const data = result.data as { attuned?: boolean; value?: number; max?: number };

  const actions: ResultAction[] = [];
  if (result.type === "artifact") {
    if (!data.attuned) actions.push({ key: "attune", icon: "gem", label: "Attune", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
  } else if (result.wandcraftButton) {
    actions.push({ key: "wandcraft", icon: ACTION_ICON.repair, label: "Wandcraft", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
  } else if (result.rollable) {
    actions.push({ key: "roll", icon: ACTION_ICON.roll, label: "Roll", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
  }
  if (result.repairButton) {
    actions.push({ key: "repair", icon: ACTION_ICON.repair, label: "Repair", tone: "crimson", onClick: (e) => { e.stopPropagation(); onRepair(); } });
  }
  if (result.useButton && !result.rollable) {
    actions.push({ key: "use", icon: ACTION_ICON.use, label: "Use", tone: "forest", onClick: (e) => { e.stopPropagation(); onUse(); } });
  }

  return (
    <li className={"srch__item" + (highlighted ? " is-hi" : "")} role="option" aria-selected={highlighted} onClick={onSelect}>
      <div className="srch__item-body">
        <span className="srch__cat" style={{ color: tone }}>
          <span className="srch__cat-dot" style={{ background: tone }} />
          {result.category}
        </span>
        <span className="srch__name">{result.name}</span>
        {result.parent && <span className="srch__parent">in {result.parent}</span>}
      </div>

      <div className="srch__item-end">
        {result.showStacks ? (
          <span className="srch__meta-pill">
            {data.value}<span className="srch__meta-max">/{data.max}</span>
          </span>
        ) : null}
        {result.showRank ? <span className="srch__meta-pill">Rank {result.showRank}</span> : null}
        {actions.map((a) => (
          <button key={a.key} className={"srch__btn srch__btn--" + a.tone} title={a.label} onClick={a.onClick}>
            <Icon name={a.icon} />
          </button>
        ))}
      </div>
    </li>
  );
}
