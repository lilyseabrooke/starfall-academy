"use client";

/* ===========================================================================
   Standalone Campus Map (/map) — the same React atlas as the character
   sheet's Map tab, as a plain browsing map: no whereabouts pin, no party
   markers. The atlas styles (src/sheet/styles/map.css) are scoped under
   .sf-sheet, so the root carries that class too.
   =========================================================================== */
import { AtlasMap } from "@/sheet/components/map/AtlasMap";
import { CAMPUS_ATLAS } from "@/sheet/data/map/areas/campus";
import "@/sheet/styles/map.css";
import "./campus-map.css";

export default function CampusMap() {
  return (
    <div className="sf-sheet campus-map">
      <AtlasMap atlas={CAMPUS_ATLAS} closeOnEscape />
    </div>
  );
}
