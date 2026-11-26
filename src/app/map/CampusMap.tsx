"use client";

/* ===========================================================================
   Standalone map page (/map) — the same React atlas as the character
   sheet's Map tab, as a plain browsing map: no whereabouts pin, no party
   markers. Shows the campus by default; other area maps open only from a
   direct link (?area=<id>, read on the server by page.tsx). There is no
   on-page selector yet.
   The atlas styles (src/sheet/styles/map.css) are scoped under .sf-sheet,
   so the root carries that class too.
   =========================================================================== */
import { AtlasMap } from "@/sheet/components/map/AtlasMap";
import { CAMPUS_ATLAS } from "@/sheet/data/map/areas/campus";
import { SANTA_LUCENCIA_ATLAS } from "@/sheet/data/map/areas/santa-lucencia";
import type { AtlasDefinition } from "@/sheet/data/map/types";
import "@/sheet/styles/map.css";
import "./campus-map.css";

/** Every area map /map can show. The first is the default. */
const AREAS: AtlasDefinition[] = [CAMPUS_ATLAS, SANTA_LUCENCIA_ATLAS];

export default function CampusMap({ initialArea }: { initialArea?: string }) {
  const atlas = AREAS.find((a) => a.id === initialArea) ?? AREAS[0];
  return (
    <div className="sf-sheet campus-map">
      <AtlasMap key={atlas.id} atlas={atlas} closeOnEscape />
    </div>
  );
}
