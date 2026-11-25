# Mapmaker — build plan

A cartography tool for authoring new area maps in the same style as the Campus
Map, and a bake step that turns its output into a map that main can ship.

## Decisions (agreed)

| Question | Decision |
|---|---|
| Map shape | Same 3 levels as campus: **area outline → regions → A–F sub-areas**, plus POIs and an optional shield-style centrepiece (like the Citadel) |
| Tool form | A Next.js route, `/mapmaker`, that **exists only on the staging branch** and reuses the real React map components for its preview |
| Output | `maps/<area>.map.json` (the editable source of truth), plus a **bake script** that emits a typed TS module for main |
| Saving | **Download / upload** of the JSON (no dev-server write, no Supabase). Works locally and on a Vercel preview of the staging branch |
| Content | **Geometry and all text**: everything the dossier shows is authored in the tool |
| Campus | Import the current Campus Map as `campus.map.json`, a **round-trip test** that proves bake reproduces today's map exactly |
| Destination on main | **Decided per map** when one is finished. Bake output only has to be render-ready |
| Branch | **`staging/mapmaking`**, long-lived and **never merged into main** |

## Branch model

```
main ──●──────────●───────────────●──────────►
        \  (merge  \ main in       ↑ PR: baked module + route only
         \  often)  \              │
staging/mapmaking ●──●──●──●──●──●─┘
        tool, maps/*.map.json, bake script
```

- **Main → staging:** merge main into staging regularly so the tool always
  previews against the current renderer.
- **Staging → main:** never merged as a branch. A finished map goes to main as
  a small PR from a fresh branch off main. It carries the baked
  `src/sheet/data/map/areas/<area>.ts`, plus whatever route or switcher entry
  that map's destination needs. The tool, the JSON and the bake script never
  reach main.
- **Shared code goes to main first:** anything both sides need (the
  data-driven renderer, the `AtlasDefinition` type) lands on main by its own
  PR, then flows into staging with the next merge. This keeps the two branches
  from drifting apart.

## Current state (what the tool has to match)

- **World:** a 1600×1200 field. The smoothed `CAMPUS_OUTLINE` is cut into
  regions by **weighted Voronoi** (`CAMPUS_SEEDS`: x, y, weight, label dx/dy).
  `CAMPUS_POIS` sit on top and link to a region or zone. The Citadel shield
  (`CITADEL_PLACE`) floats over the field. (`src/sheet/data/map/hosts.ts`)
- **Region:** metadata (house, crest, colour, sector, coord, tagline, blurb,
  facts) and a `submap` (1000×760 view, outline, `subPos` A–F x/y/weight/on,
  `subLabel` offsets, `subs` names and blurbs). (`regions.ts`)
- **Citadel:** shield geometry and options, 21 seeded districts plus specials
  that link elsewhere, each district with its own A–F. (`regions.ts`,
  `citadelData.ts`)
- **One renderer (since v1.25.3):** the typed React port powers both the
  sheet's Map tab and the standalone `/map` page (`src/app/map/CampusMap.tsx`,
  which uses it without the whereabouts pin or party markers). The old
  vendored vanilla copy in `public/map/` has been deleted.
- **The renderer is hard-wired to campus.** `WorldTessellation.tsx`,
  `AtlasMap.tsx`, `PartyMarkers.tsx` and `CharacterSheet.tsx` import campus
  constants directly. Phase 0 fixes that.
- **The old Map Studio** (removed in v1.15.1) tweaked seeds live with sliders
  but had no export. The mapmaker replaces it, with drag-on-canvas editing and
  a real file output.

## The `.map.json` format (v1)

A single file per area. Every field maps one-to-one onto what the renderer
already uses, so the bake is a mechanical transform plus validation.

```jsonc
{
  "format": "starfall-map",
  "version": 1,
  "id": "hollowmere",               // slug, also the baked module name
  "name": "Hollowmere",
  "field": [1600, 1200],
  "outline": [[120,250], ...],     // world outline, smoothed at render time
  "regions": [
    {
      "id": "north-fen",
      "seed": { "x": 730, "y": 300, "w": 44, "ldx": 0, "ldy": -10 },
      "name": "North Fen", "house": "", "crest": "", "house_color": "forest",
      "sector": "SECTOR I", "coord": "61°N · 12°W",
      "tagline": "", "blurb": "", "facts": [["Terrain", "Marsh"]],
      "submap": {
        "view": [1000, 760],
        "outline": [[130,170], ...],
        "subs": [               // A–F, index = tag
          { "x": 474, "y": 521, "w": 0, "on": true, "lx": 2, "ly": 42,
            "name": "…", "blurb": "…", "generic": null }
        ]
      }
    }
  ],
  "pois": [
    { "id": "…", "name": "…", "x": 530, "y": 553,
      "link": { "region": "north-fen", "zone": "…" } }
  ],
  "centrepiece": null              // or a shield block: place, opts, districts[]
}
```

Notes:
- Arrays of points instead of `"x,y x,y"` strings, which makes them easier to
  edit and diff. The bake converts back to the strings the renderer expects.
- Region `points` (the legacy static polygon in `regions.ts`) is **not
  authored**. Cells come from Voronoi. Confirm during Phase 2 that nothing
  live still reads `points`; if something does, the bake derives it from the
  computed cell.
- `centrepiece` mirrors today's Citadel: `place {cx, top, hw, h}`,
  `opts {spike, shoulder, side}`, and `districts[]` (seed and text like a
  region, plus `special` / `link` for the floating locations).
- `version` lets the bake script migrate old files if the format changes.

## Phases

### Phase 0 — Data-driven renderer (PR to **main**)

> **Status: done (v1.25.2).** `AtlasDefinition` lives in
> `src/sheet/data/map/types.ts`; the campus is `CAMPUS_ATLAS` in
> `src/sheet/data/map/areas/campus.ts`; `MapPage` takes an optional `atlas`
> prop (default campus). Verified against 26 captured map states (world,
> hover, region/zone, POI jumps, Citadel, districts, special locations,
> legends, every pick path, search focus): DOM and pixels identical before
> and after. Campus-specific bits that became data: legend text, fit
> framing, the forced two-line label (`splitLabel`), the centrepiece label
> and eyebrow, the district "house" line, and the field watermark. POI links
> now use `district` instead of `citadelDistrict`.

Make the React map components render any map, not just campus. This is a
behaviour-neutral refactor that ships on main, as a patch bump.

1. Add an `AtlasDefinition` type (`src/sheet/data/map/types.ts`) that holds the
   outline, seeds, POIs, regions and centrepiece in the shapes the renderer
   uses today.
2. Wrap the current campus constants as `CAMPUS_ATLAS: AtlasDefinition`.
3. Thread the definition through `AtlasMap` → `AtlasStage` →
   `WorldTessellation` / `CitadelTessellation` / `PartyMarkers` /
   `DistrictField` / `Dossier`, via a prop or an `AtlasContext`. Make
   `computeCampusCells` / `computeCitadelCells` take the definition as an
   argument.
4. Generalise the hard-coded "Citadel" assumptions (`REGIONS.find(r =>
   r.isCitadel)`) to "the centrepiece, if any".
5. **Done when:** the sheet's Map tab looks and behaves identically, verified
   with before/after screenshots at each zoom level and drill-down.

### Phase 1 — Staging branch and format

> **Status: built (on the staging work branch, awaiting the
> `staging/mapmaking` push).** Differences from the sketch above, all to keep
> the bake exact: sub-areas are complete records (`x, y, w, on, lx, ly, name,
> blurb, generic`), the centrepiece is one block holding its lore, world
> placement, shield and `districts[]` / `specials[]`, an optional
> `legendOrder` keeps the legend order separate from draw order, and an
> optional `legacy { points, label }` carries the old static polygon so the
> campus bakes back unchanged (new maps derive both from the live cell).
> Files: `src/mapmaker/{format,convert,stringify,migrate,bake}.ts`,
> `scripts/import-campus.ts`, `maps/campus.map.json`.
1. Create `staging/mapmaking` from main once Phase 0 has merged.
2. `src/mapmaker/format.ts`: the JSON types, plus a **validator** with readable
   errors (unknown region link, sub-area out of the outline, duplicate ids, and
   so on).
3. `src/mapmaker/convert.ts`: `jsonToAtlas()` (the same function the bake uses)
   and `atlasToJson()`.
4. `scripts/import-campus.ts` writes `maps/campus.map.json` from
   `CAMPUS_ATLAS`.

### Phase 2 — Bake script and campus round-trip

> **Status: built.** `npm run bake-map -- <area> [--out file]` (refuses to
> overwrite a hand-written module, so it never clobbers `campus.ts`);
> `npm run roundtrip-campus` checks the normal form, the world and district
> Voronoi cells, and that JSON → atlas → JSON is byte-stable. Also checked in
> the browser: the baked campus gives identical DOM to the shipped one in all
> 26 captured map states. Finding: nothing live reads a region's `points`;
> `label` is only a last-resort fallback for a pin.
1. `scripts/bake-map.ts <area>` validates the JSON, runs `jsonToAtlas`, and
   writes `src/sheet/data/map/areas/<area>.ts`: a generated, typed
   `export const <AREA>_ATLAS: AtlasDefinition = …` with a "generated, do not
   edit" header. Add it as `npm run bake-map` on staging only.
2. **Round-trip test:** bake `campus.map.json` and deep-compare the result with
   `CAMPUS_ATLAS`, allowing a float tolerance for coordinates. This runs as a
   script, since the repo has no test runner yet.

### Phase 3 — The `/mapmaker` route (geometry)

> **Status: built.** One deliberate change: the edit canvas draws its own SVG
> with the renderer's geometry functions (same smoothing, weighted Voronoi,
> label poles and district-field box), rather than overlaying handles on
> `AtlasStage`, whose pan/zoom transform is internal. "Exactly what players
> see" is the Preview toggle, which renders the real `AtlasMap` from
> `jsonToAtlas(doc)`. Finding: a region's `submap.outline` is only a fallback;
> its zones are laid out inside the region's live world cell, so the editor
> shows that cell and does not offer outline editing for submaps.
Route: `src/app/mapmaker/` (staging only). A three-column layout: a map list
and outline tree on the left, the live canvas in the centre, an inspector on
the right.

- **Canvas** renders through the real `AtlasStage`, with an SVG editing layer
  on top:
  - drag region **seeds**, drag the **weight** handle (a ring radius), and drag
    **label** offsets;
  - **outline editing**: drag vertices, click an edge to add one, Alt-click a
    vertex to delete it; shown both raw and smoothed;
  - drag **POIs**, and set their links from a dropdown;
  - **centrepiece**: drag the shield and its size handles, adjust the opts
    sliders, edit district seeds;
  - live Voronoi recompute as you drag. The computation is already fast
    enough: it runs on every render today.
- Drill into a region to edit its **submap** outline and A–F sub-areas the same
  way.
- Undo/redo, snap-to-grid toggle, and a grid/coordinate readout.
- **Preview** toggle that hides all handles and shows exactly what players
  would see, including drill-down and dossiers.

### Phase 4 — Text and metadata authoring

> **Status: built.** Renaming a region id, district or zone rewrites the POI,
> special-location and legend references that use it. Ids are committed on
> blur/Enter so a half-typed id never rewrites references.
Inspector forms for everything the dossier shows: area name; region name,
house, crest, colour (from the design-system house palette), sector, coord,
tagline, blurb and facts (add/remove rows); sub-area name, blurb, generic
type and on/off; POI name and link; and centrepiece district text. Validation
errors show inline and on a "Problems" list.

### Phase 5 — Save / load

> **Status: built.** Also a "Baked module…" dialog that shows (and downloads)
> exactly what `bake-map` writes. Uploads that are not usable maps are
> refused with the reason; ones with fixable problems open and list them.
- **New map:** start from a blank template (outline and three starter seeds),
  or "Duplicate campus" as a starting point.
- **Download** the `.map.json`, using the area id as the filename.
- **Upload / open** a `.map.json`; it is validated, and old versions are
  migrated, before loading.
- **Autosave** a draft to `localStorage` so a refresh doesn't lose work. This
  is a convenience only; the downloaded file is the real save.
- Committed maps in `maps/` show up in an "Open from repo" list, bundled at
  build time.
- **Workflow:** edit → Download → put the file in `maps/` → commit on staging
  → `npm run bake-map <area>` when ready to ship.

### Phase 6 — Shipping a map (per map, later)

> **Status: waiting on a finished map and a destination decision.**
1. On staging: bake, and check the result in the `/mapmaker` preview.
2. Branch off **main**, copy in `src/sheet/data/map/areas/<area>.ts`, and wire
   the chosen destination: its own `/map/<area>` route, a switcher on `/map`,
   or the sheet's Map tab with whereabouts and party markers.
3. Minor bump plus a CHANGELOG entry, per VERSIONING.md.

## Out of scope / open for later
- ~~Moving `/map` onto the React renderer~~ — done in v1.25.3. A baked map
  can ship the same way: a route rendering `<AtlasMap atlas={…} />`.
- Re-baking campus from its JSON (making the tool the way the Campus Map is
  maintained) was declined for now. The round-trip test keeps that option open.
- Deeper nesting than 3 levels, multi-user editing, and storing drafts in
  Supabase.
- Whereabouts pick ids are derived from region ids and district slugs, so
  **renaming a region id after a map ships would orphan saved player
  locations**. The validator should warn when an id changes in a map that
  has a baked module.

## Rough size
| Phase | Size |
|---|---|
| 0 Data-driven renderer | Medium: touches ~8 files, needs careful visual verification |
| 1–2 Format, import, bake, round-trip | Small–medium |
| 3 Geometry editor | Largest piece |
| 4 Text authoring | Medium |
| 5 Save/load | Small |
