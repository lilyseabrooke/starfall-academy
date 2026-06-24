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

## Live Compendium / Classes (Google Sheets)

`public/character-sheet/compendium-db.js` fetches each tab of the Compendium
workbook as CSV via the workbook's **Publish to web** endpoint
(`/d/e/<pub-id>/pub?gid=…&single=true&output=csv` — the same snapshot the
standalone `starfall-compendium` reader uses). That published snapshot is
world-readable and CORS-friendly regardless of the document's own share setting,
so there's no link-sharing dependency. Each CSV is parsed by header name and
shaped into the entry/class forms the sheet already consumes — then mutates `SF_DATA.compendium` in place and rebuilds
`SF_CLASSES.classes` through the parser `classes.js` exposes. This feeds the
Compendium drawer, the character creator (the Forge), and the Classes list off
the live database instead of the baked seed arrays. Boot is gated on
`SF_COMPENDIUM_DB.ready` (app.jsx mount tail); any unreachable tab falls back to
its seed rows, so the prototype still runs standalone / offline. Tabs and GIDs
live at the top of `compendium-db.js`.

## How it's mounted

- Route group `src/app/(app)/` — auth-gated layout (signed-in players only).
- `src/app/(app)/characters/page.tsx` — roster list + "New character" action.
- `src/app/(app)/characters/[id]/page.tsx` — loads the owner-scoped row (RLS)
  and renders `CharacterSheetFrame`, a client component that hosts the prototype
  in an `<iframe>`. The iframe sandboxes the prototype's React 18 / Babel runtime
  away from the app's React 19 (same pattern the embedded map already uses).

## Persistence bridge (host ⇄ iframe, postMessage)

```
iframe → host : sf-sheet-request                          on load
host → iframe : sf-sheet-init { sheet, roster, me, openForge }
iframe → host : sf-sheet-save { sheet }                   debounced edits
iframe → host : sf-committed                              Forge "Begin" fired
iframe → host : sf-switch-character { id }                party member picked
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

## Milestone 2 — real characters & campaign party (single-player)

Closes the phase-1 critical journey: sign in → see your characters (or the
creator if none) → open one → party selector shows same-campaign characters →
edits persist across visits.

- **Creation via the Forge, create-on-commit.** `/characters/new` mounts the
  sheet in create mode (`openForge`), and the DB row is only created when the
  Forge commits (`sf-committed` arms the host; the first `sf-sheet-save`
  POSTs `/api/characters` and navigates to `/characters/[newId]`). Cancel
  creates nothing. Empty account → the creator entry on `/characters`.
- **De-seeded roster.** `app.jsx` reads an injected `window.SF_ROSTER` / `SF_ME`
  instead of the seed `D.roster`; the host builds the party from the owner's
  characters sharing this one's `campaign_code`. Picking a party member posts
  `sf-switch-character` → the host navigates to that sheet.
- **Campaigns by code.** Migration adds `characters.campaign_code text` (the
  `campaign_id uuid` column stays reserved for a real campaigns FK later). The
  roster page assigns codes (new / join); party = your characters with the
  same code. `PATCH /api/characters/[id]` accepts `campaign_code`; `DELETE`
  removes a character; `POST /api/characters` creates one.

## Known limitations

- The prototype loads React / Babel / Lucide from unpkg at runtime (fine in the
  user's browser; a later port replaces this with bundled deps). Needs network
  in local dev.
- Party is currently the owner's *own* characters sharing a code (RLS scopes to
  owner). Cross-user campaign membership arrives with multiplayer.
- Party + dice are local-only in the prototype; real multiplayer is a later
  milestone (Supabase Realtime).

## Pre-existing, unrelated

`next build` warns that `middleware.ts` should be renamed to `proxy.ts`
(Next 16 deprecation). Predates this work; left for a separate change.
