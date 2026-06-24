/* ===========================================================================
   Starfall Academy — Search Menu
   Full-sheet search: indexes all content, jump-to + contextual action buttons.
   =========================================================================== */

(function () {
  const Ic = window.SF_Ic;

  // Tone → CSS custom property
  const CATEGORY_TONE = {
    "Stat":          "var(--plum-400)",
    "Skill":         "var(--plum-300)",
    "Subject":       "var(--teal-400)",
    "Spell":         "var(--teal-300)",
    "Move":          "var(--forest-400)",
    "Artifact":      "var(--gold-400)",
    "Wand":          "var(--gold-300)",
    "Potion":        "var(--teal-400)",
    "Recipe":        "var(--teal-300)",
    "Plant":         "var(--forest-300)",
    "Item":          "var(--crimson-300)",
    "Glyph":         "var(--plum-300)",
    "Condition":     "var(--crimson-400)",
    "Resist Roll":   "var(--crimson-300)",
    "Class":         "var(--plum-400)",
    "Class Ability": "var(--plum-300)",
    "Map Location":  "var(--teal-300)",
    "Bonus":         "var(--gold-300)",
  };

  // Icon for each action button type
  const ACTION_ICON = {
    roll:      "dices",
    repair:    "hammer",
    wandcraft: "hammer",
    use:       "check-check",
  };

  function SearchMenu({
    query,
    results,
    onQueryChange,
    onSelect,
    onRoll,
    onRepair,
    onUse,
    isOpen,
    onClose,
  }) {
    const [highlightIdx, setHighlightIdx] = React.useState(-1);
    const [dropStyle, setDropStyle] = React.useState({});
    const [mobileExpanded, setMobileExpanded] = React.useState(false);
    const inputRef  = React.useRef(null);
    const menuRef   = React.useRef(null);
    const listRef   = React.useRef(null);

    // Focus input when opened or mobile-expanded
    React.useEffect(() => {
      if ((isOpen || mobileExpanded) && inputRef.current) inputRef.current.focus();
    }, [isOpen, mobileExpanded]);

    // Collapse mobile on close
    React.useEffect(() => {
      if (!isOpen && !query) setMobileExpanded(false);
    }, [isOpen, query]);

    // Reset highlight when results change
    React.useEffect(() => { setHighlightIdx(-1); }, [results]);

    // Position dropdown — recalculate on mount, resize, and when isOpen changes
    React.useEffect(() => {
      if (!menuRef.current) return;
      const update = () => {
        // Use the toggle button rect on mobile if .srch is hidden
        const el = menuRef.current;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return; // element not visible yet, skip
        setDropStyle((prev) => {
          const next = {
            position: 'fixed',
            top: rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right),
            maxWidth: Math.min(420, window.innerWidth - 16),
          };
          if (prev.top === next.top && prev.right === next.right) return prev;
          return next;
        });
      };
      // Small delay so the element is visible before measuring
      const t = setTimeout(update, 50);
      window.addEventListener('resize', update);
      return () => { clearTimeout(t); window.removeEventListener('resize', update); };
    }, [isOpen]);

    // Keyboard navigation
    React.useEffect(() => {
      if (!isOpen) return;
      const onKey = (e) => {
        if (e.key === "Escape") { onClose(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((p) => Math.min(p + 1, results.length - 1)); }
        else if (e.key === "ArrowUp")   { e.preventDefault(); setHighlightIdx((p) => Math.max(p - 1, -1)); }
        else if (e.key === "Enter") {
          e.preventDefault();
          if (highlightIdx >= 0 && results[highlightIdx]) { onSelect(results[highlightIdx]); }
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, results, highlightIdx, onSelect, onClose]);

    // Scroll highlighted item into view
    React.useEffect(() => {
      if (highlightIdx < 0 || !listRef.current) return;
      const item = listRef.current.children[highlightIdx];
      if (item) item.scrollIntoView({ block: "nearest" });
    }, [highlightIdx]);

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return;
      const onClick = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
      };
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, [isOpen, onClose]);

    const hasQuery = query.trim().length > 0;

    return (
      <div className={"srch" + (isOpen ? " srch--mobile-open" : "")} ref={menuRef}>
        {/* ── Mobile icon-only toggle ─────────────────────────────── */}
        <button
          className="srch__mobile-toggle"
          aria-label="Search"
          onClick={() => { setMobileExpanded(true); }}
        >
          <Ic name="search" />
        </button>
        {/* ── Input ─────────────────────────────────────────────────── */}
        <div className="srch__field">
          <Ic name="search" className="srch__icon" />
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
              <Ic name="x" />
            </button>
          ) : (
            <kbd className="srch__hint">{window._isMac ? "⌘K" : "Ctrl K"}</kbd>
          )}
        </div>

        {/* ── Dropdown ──────────────────────────────────────────────── */}
        {hasQuery && (
          <div className="srch__dropdown" role="listbox" style={dropStyle}>
            {results.length === 0 ? (
              <div className="srch__empty">
                <Ic name="search-x" className="srch__empty-icon" />
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

  function SearchResult({ result, highlighted, onSelect, onRoll, onRepair, onUse }) {
    const tone = CATEGORY_TONE[result.category] || "var(--text-muted)";

    // Decide which action buttons to show
    const actions = [];
    if (result.type === "artifact") {
      // Attune button for unattuned artifacts
      if (!result.data.attuned) {
        actions.push({ key: "attune", icon: "gem", label: "Attune", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
      }
    } else if (result.wandcraftButton) {
      actions.push({ key: "wandcraft", icon: ACTION_ICON.repair, label: "Wandcraft", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
    } else if (result.rollable) {
      actions.push({ key: "roll", icon: ACTION_ICON.roll, label: "Roll", tone: "gold", onClick: (e) => { e.stopPropagation(); onRoll(); } });
    }
    if (result.repairButton) {
      actions.push({ key: "repair", icon: ACTION_ICON.repair, label: "Repair", tone: "crimson", onClick: (e) => { e.stopPropagation(); onRepair(); } });
    }
    // useButton only shows when NOT rollable (no-roll use only)
    if (result.useButton && !result.rollable) {
      actions.push({ key: "use", icon: ACTION_ICON.use, label: "Use", tone: "forest", onClick: (e) => { e.stopPropagation(); onUse(); } });
    }

    return (
      <li
        className={"srch__item" + (highlighted ? " is-hi" : "")}
        role="option"
        aria-selected={highlighted}
        onClick={onSelect}
      >
        {/* Left: category + name */}
        <div className="srch__item-body">
          <span className="srch__cat" style={{ color: tone }}>
            <span className="srch__cat-dot" style={{ background: tone }}></span>
            {result.category}
          </span>
          <span className="srch__name">{result.name}</span>
          {result.parent && <span className="srch__parent">in {result.parent}</span>}
        </div>

        {/* Right: inline metadata + action buttons */}
        <div className="srch__item-end">
          {result.showStacks != null && result.showStacks && (
            <span className="srch__meta-pill">
              {result.data.value}<span className="srch__meta-max">/{result.data.max}</span>
            </span>
          )}
          {result.showRank && (
            <span className="srch__meta-pill">Rank {result.showRank}</span>
          )}
          {actions.map((a) => (
            <button
              key={a.key}
              className={"srch__btn srch__btn--" + a.tone}
              title={a.label}
              onClick={a.onClick}
            >
              <Ic name={a.icon} />
            </button>
          ))}
        </div>
      </li>
    );
  }

  window.SF_SearchMenu = SearchMenu;
})();
