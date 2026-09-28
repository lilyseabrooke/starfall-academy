# Map tab — native React port

The character sheet's Map tab (`src/sheet/components/map/MapPage.tsx`) is the
one piece of the sheet F1 left un-ported (see `design/ROADMAP.md`'s F1
entry: *"The atlas itself is out of scope for F1"*). Everything else in the
sheet runs on plain React state and hooks; the Map tab still embeds the old
vendored vanilla-JS atlas in an `<iframe>` and talks to it over
`postMessage`. This document is the porting plan for closing that gap.

As of this writing (v1.15.1), the Map Studio dev-authoring tooling that used
to live inside these files has been removed (see CHANGELOG) — the files
below are already smaller and cleaner than when the original scoping
decision was made, but the port itself hasn't started.

## What's being ported

`MapPage.tsx` (native, owns `locations` state, renders the whereabouts
panel) embeds `public/character-sheet/map/index.html` in an `<iframe>` and
talks to it via `postMessage` (`sf-map-state`, `sf-map-ready`,
`sf-map-pick`, `sf-map-pick-cancel`, `sf-map-focus`). Everything inside that
iframe is still vanilla JS/DOM:

| File | Lines | Role |
|---|---|---|
| `atlas-geom.js` | 327 | Pure geometry/SVG-builder engine (Voronoi, shield path, tile insets, label layout) — no DOM state, no app logic |
| `atlas-citadel-data.js` | 64 | Pure data model for Citadel sub-areas (A–F) |
| `regions.js` | 473 | Static region/district data + `pinwheel()` hull-splitting geometry |
| `app.js` | 1058 | World/citadel/submap/zone rendering, pan/zoom, breadcrumbs, dossiers, legend |
| `party.js` | 194 | Party-marker overlay + the `sf-map-*` postMessage bridge `MapPage.tsx` already speaks |
| `styles.css` / `party.css` | 491 / 58 | Unscoped, atlas-only CSS — not part of the already-ported `src/sheet/styles/map.css` (which only covers the whereabouts panel shell) |

Total ≈2,100 lines of DOM-manipulating JS plus ~550 lines of CSS, none of it
typed, none of it React. (`public/map/` carries an identical copy of
`app.js`/`atlas-geom.js`/`atlas-citadel-data.js`/`regions.js` behind the
standalone `/map` page — keep both in sync, or better, have the ported code
serve both call sites once it exists.)

## Non-goal

The Map Studio edit-mode tweak panel that used to live in these files has
already been removed entirely (it was dev-only authoring tooling, never
meant to ship — see v1.15.1 in `CHANGELOG.md`). Nothing about it needs to be
carried into the native port; the values it used to let you tune (shield
shape, district/sub-area positions) are now plain baked-in constants in the
data files.

## Target shape

Mirror the pattern the rest of the sheet already uses (`useInventoryState` +
`InventoryPage.tsx`/`Cards.tsx`/etc.): a typed state/data layer under
`src/sheet/data/`, a state hook if any local UI state needs to persist
across renders, and presentational components under
`src/sheet/components/map/`. No new `SerializedSheet` fields —
`locations` already round-trips through persistence and Realtime; the atlas
itself is read-only map furniture, not character data.

## Phased breakdown (leaf-first, same order F1 used)

**Phase 0 — Data & geometry layer (mechanical, low risk)**
Port `atlas-geom.js`, `atlas-citadel-data.js`, `regions.js` to typed `.ts`
modules under `src/sheet/data/map/`. These are pure functions/data (no
DOM), so this is close to a straight copy-and-type pass — same category of
work as `data.js`/`shared.js` in F1 step 1. Establish types for `Region`,
`DistrictSeed`, `SubArea`, `Cell` up front since everything downstream
depends on them.

**Phase 1 — World map as React/SVG**
`renderWorld()`, `renderLegend()`, pan/zoom (`stage`/`canvas`/`panner`,
pointer handlers, wheel zoom, `fitWorld()`), compass rose, zoom controls.
Becomes an `<AtlasStage>` component owning `scale/tx/ty` as state (or a
ref-driven imperative transform, like the original, to avoid re-render cost
on every drag pixel) and a `<WorldMap>` that renders regions/POIs/labels
from Phase 0 data via `voronoiCells()`.

**Phase 2 — Submap / dossier drill-down**
`openSubmap`, `buildSubmap`, `buildGenericDossier`/`buildRegionDossierPanel`,
breadcrumbs (`setCrumbs`), view transitions (`goToSub`/`closeSubmap`).
Becomes route-free local state (`nav: {view: "world"|"submap"|"citadel", ...}`)
driving conditional rendering instead of `hidden` attribute toggles + CSS
transition classes.

**Phase 3 — Citadel + zone drill-down**
`showCitadelMap`, `drawTessellation`, `renderDistrictField`, level-4 zone
selection (`zonePick`/`selectZone`/`deselectZone`), Citadel legend. This is
the deepest nesting (region → district → sub-area zone) and the most fiddly
geometry (`normalizeCellToBox`, per-tile hover wiring) — budget the most
time here.

**Phase 4 — Party markers**
Port `party.js`'s marker-cluster rendering (`buildCluster`, counter-scale)
into a component that reads `roster`/`locations`/`activeChar` as props
straight from `CharacterSheet.tsx` state — no postMessage needed once it's
not in an iframe. Pick-mode (`sf-map-pick`) becomes a normal callback prop
instead of an event round-trip.

**Phase 5 — Wire into `MapPage.tsx`, drop the iframe**
Replace the `<iframe>` + `pushState`/`onMsg` bridge in `MapPage.tsx` with
the native components from Phases 1–4, taking `roster`/`activeChar`/
`locations`/`onSetLocation` directly as props (already the shape `MapPage`
exposes today — the external contract to `CharacterSheet.tsx` shouldn't
need to change). Retire `public/character-sheet/map/{app,party}.js` and
fold the relevant slice of `styles.css`/`party.css` into
`src/sheet/styles/map.css` via `scripts/scope-css.js`, the same way the
rest of the sheet's CSS was scoped. Decide what happens to the standalone
`/map` page (`public/map/`) at this point too — either point it at the same
ported components or leave it on the (now-duplicated) vendored copy.

**Phase 6 — Multiplayer location sync (separate follow-up, per `ROADMAP.md`)**
Once native, back `locations` with Supabase Realtime broadcast/presence
instead of (or in addition to) the `localStorage` fallback in
`CharacterSheet.tsx`, per the roadmap's explicitly "still open" item under
Multiplayer. This is a natural next step after the port but is its own
scoped piece of work, not required to land the port itself.

## Hard parts, not the mechanical bulk

- **Pan/zoom performance**: the original does raw `style.transform` writes
  on every pointer-move outside React's render cycle on purpose (60fps
  drag). A naive `useState` re-render per pixel will jank; keep the
  transform imperative (ref + direct DOM write) and only sync React state
  on gesture end.
- **Voronoi/tessellation math**: rendering reads seed data (region/district/
  sub-area positions) that's now just plain authored constants (no more
  runtime override layer to worry about, since Map Studio is gone) — but
  the Voronoi/tessellation computation itself (`voronoiCells`,
  `clipHalfPlane`, `polylabel`) needs to stay pure and be memoized
  (`useMemo`) rather than mutate-then-redraw like the original.
- **Search-menu focus bridge** (`sf-map-focus` message, wired from
  `SearchMenu.tsx`/`CharacterSheet.tsx`'s `mapFocus` state) needs a native
  equivalent — currently `focusLocation` prop → `post()` into the iframe;
  becomes a direct call into the Phase 2/3 view-state setter.
- **No test suite** for any of this — every phase is a manual regression
  pass in the browser (pan/zoom, all drill-down paths, party markers,
  search-jump), same caveat F1 called out.

## Sizing

Roughly on par with one mid-size F1 feature slice (rolls/inventory/classes
were each described as a "session" each in `ROADMAP.md`); this one's bigger
than any single one of those given the geometry math, but smaller than all
of F1 combined. Realistic estimate: several sessions across Phases 0–5, with
Phase 3 (Citadel zones) the biggest single chunk.

## Suggested first PR

Phase 0 alone: typed `.ts` ports of `atlas-geom.js`/`atlas-citadel-data.js`/
`regions.js` with no consumer yet, proving the types and geometry functions
produce identical output to the JS originals (worth a throwaway script
comparing a few known Voronoi cells/shield paths numerically) before
building any React on top.
