# Character sheet — integration notes

This tracks how the Claude Design "Starfall App / Character Sheet" handoff is
being brought into the app. Strategy (agreed): **hybrid — land it working,
then port.** Milestone 1 lands the prototype at a route with Supabase-backed
persistence; later milestones port modules to native React 19 and build real
multiplayer (party + dice) on Supabase Realtime.

## What was vendored

The whole prototype lives, unmodified except for the persistence hooks below,
at **`public/character-sheet/`** (entry: `index.html`). It is a self-contained
**React 18 + @babel/standalone** bundle whose modules attach to `window.SF_*`.
It links the design system already in this repo at `public/_ds/…61fef24c…`
(byte-identical to the copy in the handoff), so no design assets were
duplicated.

Source data from the handoff (rulebook + asset CSVs + design plans) is stashed,
**not web-served**, under `design/handoff/` for the eventual real data layer.

## How it's mounted

- Route group `src/app/(app)/` — auth-gated layout (signed-in players only).
- `src/app/(app)/characters/page.tsx` — roster list + "New character" action.
- `src/app/(app)/characters/[id]/page.tsx` — loads the owner-scoped row (RLS)
  and renders `CharacterSheetFrame`, a client component that hosts the prototype
  in an `<iframe>`. The iframe sandboxes the prototype's React 18 / Babel runtime
  away from the app's React 19 (same pattern the embedded map already uses).

## Persistence bridge (host ⇄ iframe, postMessage)

```
iframe → host : { type: "sf-sheet-request" }       on load
host → iframe : { type: "sf-sheet-init", sheet }    seed from characters.sheet
iframe → host : { type: "sf-sheet-save", sheet }    debounced edits
```

- Iframe side: `public/character-sheet/host-bridge.js` defers the app mount
  until the host sends initial data (or falls back to seed data when opened
  standalone). `app.jsx` gained a small marked block: `serializeSheet()` /
  `applySheet()` plus a hydrate-on-mount effect and a debounced save effect.
- Host side: `CharacterSheetFrame.tsx` answers the request / pushes init on
  load and `PATCH`es snapshots to `/api/characters/[id]`, which writes
  `characters.sheet` (and keeps the roster `name` in sync). RLS enforces owner.

The `sheet` payload is the durable character state: `c`, `conditions`, `stats`,
`schools`, `classes {rp, classState}`, `magic {bonuses, spells, moves}`,
`inventory {…}`, and party `locations`.

## Known limitations (milestone 1)

- The prototype loads React / Babel / Lucide from unpkg at runtime (fine in the
  user's browser; a later port replaces this with bundled deps). Needs network
  in local dev.
- A brand-new character starts from the prototype's seed (Lyra) until the Forge
  creation wizard is wired — genuinely blank starts are a later milestone.
- Party + dice are local-only in the prototype; real multiplayer is a later
  milestone (Supabase Realtime).

## Pre-existing, unrelated

`next build` warns that `middleware.ts` should be renamed to `proxy.ts`
(Next 16 deprecation). Predates this work; left for a separate change.
