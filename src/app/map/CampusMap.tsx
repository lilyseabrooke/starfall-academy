"use client";

/* ===========================================================================
   Standalone map page (/map) — the same React atlas as the character
   sheet's Map tab, as a plain browsing map: no whereabouts pin, no party
   markers. A selector at the top switches between the area maps; the
   choice is kept in the URL (?area=<id>) so a map can be linked directly.
   The atlas styles (src/sheet/styles/map.css) are scoped under .sf-sheet,
   so the root carries that class too.
   =========================================================================== */
import * as React from "react";
import { AtlasMap } from "@/sheet/components/map/AtlasMap";
import { Icon } from "@/sheet/components/Icon";
import { CAMPUS_ATLAS } from "@/sheet/data/map/areas/campus";
import { SANTA_LUCENCIA_ATLAS } from "@/sheet/data/map/areas/santa-lucencia";
import type { AtlasDefinition } from "@/sheet/data/map/types";
import "@/sheet/styles/map.css";
import "./campus-map.css";

/** Every area map /map offers, in selector order. The first is the default. */
const AREAS: { atlas: AtlasDefinition; label: string }[] = [
  { atlas: CAMPUS_ATLAS, label: "Starfall Academy" },
  { atlas: SANTA_LUCENCIA_ATLAS, label: "Santa Lucencia" },
];

export default function CampusMap({ initialArea }: { initialArea?: string }) {
  const [areaId, setAreaId] = React.useState(
    initialArea && AREAS.some((a) => a.atlas.id === initialArea) ? initialArea : AREAS[0].atlas.id,
  );
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close the menu on an outside click or Escape.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);

  const choose = (id: string) => {
    setOpen(false);
    setAreaId(id);
    const url = new URL(window.location.href);
    if (id === AREAS[0].atlas.id) url.searchParams.delete("area"); else url.searchParams.set("area", id);
    window.history.replaceState(null, "", url);
  };

  const current = AREAS.find((a) => a.atlas.id === areaId) ?? AREAS[0];

  return (
    <div className="sf-sheet campus-map">
      <AtlasMap key={current.atlas.id} atlas={current.atlas} closeOnEscape />
      <div className="area-switch" ref={menuRef}>
        <button type="button" className="area-switch__btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Icon name="map" />
          <span>{current.label}</span>
          <Icon name="chevron-down" />
        </button>
        {open && (
          <ul className="area-switch__menu" role="listbox" aria-label="Choose a map">
            {AREAS.map((a) => (
              <li key={a.atlas.id}>
                <button type="button" role="option" aria-selected={a.atlas.id === current.atlas.id}
                        className={a.atlas.id === current.atlas.id ? "is-on" : ""} onClick={() => choose(a.atlas.id)}>
                  <span className="area-switch__eyebrow">{a.atlas.eyebrow}</span>
                  <span className="area-switch__name">{a.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
