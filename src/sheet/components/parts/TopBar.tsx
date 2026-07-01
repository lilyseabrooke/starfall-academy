"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { Stars } from "./Stars";
import { SearchMenu } from "./SearchMenu";
import { TimeBadge } from "./TimeBadge";
import type { CharacterVitals } from "../../types";
import type { GmTime } from "../../data/gm-seed";
import type { SearchResult as SearchResultData } from "../../data/search";

export interface TopBarProps {
  title: string;
  eyebrow: string;
  c: CharacterVitals;
  onStep: (key: string, delta: number) => void;
  onRollAction?: () => void;
  onToggleMobileMenu: () => void;
  hideVitals?: boolean;
  /** The campaign clock, read-only — same look as the GM's, no interaction. */
  time?: GmTime;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  searchResults: SearchResultData[];
  onSearchSelect: (r: SearchResultData) => void;
  onSearchRoll: (r: SearchResultData) => void;
  onSearchRepair: (r: SearchResultData) => void;
  onSearchUse: (r: SearchResultData) => void;
  searchMenuOpen: boolean;
  onSearchMenuOpen: () => void;
  onSearchMenuClose: () => void;
  onSearchMobileOpen?: () => void;
}

export function TopBar({
  title, eyebrow, c, onStep, onRollAction, onToggleMobileMenu, hideVitals, time,
  searchQuery, onSearchQueryChange, searchResults, onSearchSelect, onSearchRoll,
  onSearchRepair, onSearchUse, searchMenuOpen, onSearchMenuOpen, onSearchMenuClose, onSearchMobileOpen,
}: TopBarProps) {
  const headerRef = React.useRef<HTMLElement>(null);
  const eyebrowRef = React.useRef<HTMLSpanElement>(null);
  const namePartRef = React.useRef<HTMLSpanElement>(null);
  const housePartRef = React.useRef<HTMLSpanElement>(null);

  const dotIdx = eyebrow ? eyebrow.indexOf(" · ") : -1;
  const charName = dotIdx >= 0 ? eyebrow.slice(0, dotIdx) : eyebrow || "";
  const houseName = dotIdx >= 0 ? eyebrow.slice(dotIdx + 3) : "";

  const checkFit = React.useCallback(() => {
    const eb = eyebrowRef.current;
    if (!eb) return;
    if (namePartRef.current) namePartRef.current.style.display = "";
    if (housePartRef.current) housePartRef.current.style.display = "";
    if (eb.scrollWidth > eb.clientWidth + 1) {
      if (housePartRef.current) housePartRef.current.style.display = "none";
      if (eb.scrollWidth > eb.clientWidth + 1) {
        if (namePartRef.current) namePartRef.current.style.display = "none";
      }
    }
  }, []);

  React.useLayoutEffect(checkFit);

  React.useEffect(() => {
    const ro = new ResizeObserver(checkFit);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [checkFit]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearchMenuOpen();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSearchMenuOpen]);

  return (
    <header className={"sf-top" + (hideVitals ? " sf-top--hide-vitals" : "")} ref={headerRef}>
      <button className="sf-hamburger" onClick={onToggleMobileMenu} aria-label="Open navigation"><Icon name="menu" /></button>
      <div className="sf-top__titles">
        <span className="sf-eyebrow sf-top__eyebrow" ref={eyebrowRef}>
          <span ref={namePartRef}>{charName}</span>
          {houseName && <span ref={housePartRef}>{" · "}{houseName}</span>}
        </span>
        <h1 className="sf-top__h1">{title}</h1>
      </div>
      <div className="sf-top__spacer" />

      <div className="sf-top__status">
        {time && <TimeBadge time={time} />}

        <div className="sf-vitals">
          <div className="sf-vital is-ap">
            <span className="sf-vital__label">Action<br />Points</span>
            <div className="sf-stepper">
              <button className="sf-step" onClick={() => onStep("actionPoints", -1)} disabled={c.actionPoints <= 0}>−</button>
              <span className="sf-vital__num">{c.actionPoints}<small>/{c.actionPointsMax}</small></span>
              <button className="sf-step" onClick={() => onStep("actionPoints", 1)} disabled={c.actionPoints >= c.actionPointsMax}>+</button>
            </div>
            {onRollAction && (
              <button className="sf-ap-roll-btn" onClick={onRollAction} title="Action roll — DC 10 Insight">
                <Icon name="dices" />
              </button>
            )}
          </div>
          <div className="sf-vital">
            <span className="sf-vital__label">Resolve</span>
            <Stars value={c.resolve} max={c.resolveMax} />
          </div>
          <div className="sf-vital is-trouble">
            <span className="sf-vital__label">Trouble</span>
            <div className="sf-stepper">
              <button className="sf-step" onClick={() => onStep("trouble", -1)} disabled={c.trouble <= 0}>−</button>
              <span className="sf-vital__num">{c.trouble}</span>
              <button className="sf-step" onClick={() => onStep("trouble", 1)} disabled={c.trouble >= 10}>+</button>
            </div>
          </div>
        </div>
      </div>

      <button className="srch-mobile-toggle" aria-label="Search" onClick={() => onSearchMobileOpen && onSearchMobileOpen()}>
        <Icon name="search" />
      </button>

      <SearchMenu
        query={searchQuery}
        results={searchResults}
        onQueryChange={onSearchQueryChange}
        onSelect={onSearchSelect}
        onRoll={onSearchRoll}
        onRepair={onSearchRepair}
        onUse={onSearchUse}
        isOpen={searchMenuOpen}
        onClose={onSearchMenuClose}
      />
    </header>
  );
}
