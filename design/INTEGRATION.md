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

## GM view (Faculty View) — the GM dashboard handoff

The Claude Design "Starfall Academy GM tools" handoff is landed as a **seed-data
prototype** alongside the character sheet, deliberately reusing the sheet's
shared systems so a single source change to the fundamental mechanics shows up
in both views. (Strategy agreed: land it working now; real campaign membership,
cross-user party, GM role and persistence come with the roadmap's campaigns + GM
milestone — see `design/ROADMAP.md`.)

### Where it lives
All under `public/character-sheet/`, next to the sheet so they share modules:

- `gm.html` — entry. Same boot order and CSS as `index.html`, but mounts
  `gm.jsx` instead of `app.jsx` and loads `gm-host-bridge.js` + `gm-data.js`.
  Runs standalone at `/character-sheet/gm.html`, and is mounted in the app at
  `/gm/[id]` (see "Mounted in the app" below).
- `gm.jsx` — the GM app root (`GMApp`). Tabs: **Party board, NPCs, Notes,
  Action scene**. Modals: **Force-Resist, Add/Edit NPC, Time tracker, Grant
  drawer**.
- `gm-data.js` (`window.SF_GM_DATA`) — seed party / basic NPCs / notes / time /
  roll-ledger seed. The analogue of the sheet's `data.js` roster.
- `gm.css` — GM-only surfaces only (party/NPC/action/notes/modals). The shell is
  styled by the shared `app.css` / `rolls.css` / `inventory.css`.
- `gm-host-bridge.js` — gates the mount like `host-bridge.js`, with GM-flavoured
  message names (`sf-gm-request` / `sf-gm-init`) reserved for the future live
  mount. Standalone mounts immediately on seed data.

### What is shared vs. authored fresh (the placeholders that were replaced)
The handoff prototype re-implemented several things the sheet already owns; those
were dropped in favour of the sheet's definitive versions:

- **Roll engine + ledger + dock + toasts** → `window.useRollState`,
  `SF_RollDock`, `SF_RollToasts` (roll-state.js / rolls.jsx). GM dice (Force
  Resist, NPC Strong/Weak, Action rolls, the GM quick-roll) go through
  `pushRoll`, so styling/mechanics match the sheet. **GM narration / grants are
  status toasts** (the sheet's `sf-inv-toast`), not ledger rows — the shared
  ledger renders rolls, so non-roll "events" map onto the status toast instead
  of extending the roll engine.
- **Left nav bar** → `SF_Sidebar` was generalised with a `gm` config (in
  `parts.jsx`) so both views share one component, its CSS and the mobile
  slide-in. Player rendering is unchanged when `gm` is absent.
- **Compendium** → the Grant drawer reuses the shared `sf-drawer` / `sf-scrim`
  chrome and reads the real `SF_DATA.compendium`. It adds the GM-only bits the
  sheet doesn't have: a **Materials** granting tab and a per-entry **Grant to
  &lt;member&gt;** action.
- **Mechanics derived from the sheet, not invented:** Force-Resist rolls the
  targeted player's resist stat vs a GM-set DC through the shared resist roll
  (auto-fail on a natural 1, auto-succeed on a 10). "Begin Action" rolls each
  combatant's real **Action Roll** (2d10 + Insight vs DC 10; starting AP =
  degrees of success, capped at AP max) — the same formula already in `app.jsx`,
  replacing the prototype's `// filler` AP placeholder.

### Mounted in the app
The GM view is reachable from the signed-in app:

- **`campaigns` table** (migration `20260626000000_create_campaigns.sql`): the
  first slice of roadmap F2. A campaign is GM-owned (`gm_id`) with a join `code`
  and a `name`; RLS is `gm_id = auth.uid()` (member reads arrive with
  multiplayer). The `code` reuses the player join-code format so it ties to the
  existing `characters.campaign_code` grouping later. **Remember table grants** —
  done in the migration.
- **`/api/campaigns`** (POST create with a generated unique code) and
  **`/api/campaigns/[id]`** (PATCH rename / DELETE), mirroring the characters API.
- **`/characters`** gained a "Campaigns you run" section (`CampaignsList.tsx`)
  below the roster, mirroring the page's card styling. It lists the user's GM
  campaigns and links each to `/gm/[id]`; a "New campaign" action creates one.
- **`/gm/[id]`** (auth-gated, RLS-scoped fetch) renders `GMViewFrame`, an iframe
  host for `gm.html` that passes the campaign `{name, code}` through the
  `sf-gm-init` bridge so the GM top bar shows the real campaign name.

### Deferred (next milestones, not built here)
- Live data: party from real campaign membership, cross-user reads (RLS),
  persistence of GM-owned NPCs / notes / time. Today the GM tools still run on
  seed data — only the campaign identity (name/code) is wired through.
- Party nav links open character sheets (currently a status toast); wiring lands
  with cross-user campaign reads.
- Players' `campaign_code` ↔ `campaigns.code` are not yet reconciled into shared
  membership (the GM's party is still resolved per the phase-1 stopgap).
- **Full** NPC sheets stored like characters (`type='npc'`). Only **basic** NPCs
  (Strong/Weak) exist now, matching the handoff.

## Multiplayer — shared dice log + cross-user party

Closes roadmap **F2 + the Multiplayer (shared dice / party) slice**: a campaign's
members can now see each other. Built **bridge-first** (no F1 port required).

### Membership (F2) — `campaign_members`
Migration `20260626000001_multiplayer_membership_and_rolls.sql`:
- **`campaign_members`** (`campaign_id`, `user_id`, `role` `player|gm`,
  `character_id`, unique `(campaign_id, user_id)`) is the real membership model.
  The reserved **`characters.campaign_id`** FK is now wired (→ `campaigns`,
  `on delete set null`).
- **Join-by-code stays the UX, backed by the table.** `join_campaign(code,
  character)` / `leave_campaign(character)` are `SECURITY DEFINER` RPCs (called
  from `PATCH /api/characters/[id]`): they verify the character is yours,
  resolve code→campaign, and upsert membership + set `campaign_id` atomically. A
  code with **no** matching campaign still records `campaign_code` (legacy
  code-only grouping) with `campaign_id` left null. Creating a campaign inserts a
  `gm` membership.
- **RLS opens to campaign-scoped reads.** A `SECURITY DEFINER` helper
  `campaigns_for_user()` (GM-owned ∪ member-of) avoids the self-referential
  recursion trap; policies read `… in (select campaigns_for_user())`. Added:
  members read each other's **characters** (full sheet; writes stay owner-only),
  the **campaign** row, and **member** rows. RPCs/`campaigns_for_user` are
  revoked from `anon`.

### Shared, durable dice log — `rolls` + Realtime
- **`rolls`** (`campaign_id`, `actor_id`, `character_id`, `payload jsonb`,
  `created_at`) is an immutable, campaign-scoped log on the `supabase_realtime`
  publication. RLS: members read/insert (insert checks `actor_id = auth.uid()`).
- The iframe **host** owns the channel (`src/app/(app)/useRollChannel.ts`, used
  by both `CharacterSheetFrame` and `GMViewFrame`): replays recent backlog on
  the iframe's `sf-roll-ready`, subscribes to `postgres_changes` INSERTs, and
  persists the iframe's local rolls. **Durable** → reloads + late joiners get
  history.

### Bridge protocol additions
```
iframe → host : sf-roll-ready                roll engine mounted (ask for backlog)
iframe → host : sf-roll        { roll }       a local roll to persist + share
host → iframe : sf-roll-remote { roll }       backlog / another player's roll / own echo
```
- `host-bridge.js` / `gm-host-bridge.js` gained `shareRoll()` / `onRoll()` (with
  a buffer so no roll predates the sink) and set `window.SF_MULTIPLAYER` /
  `SF_CAMPAIGN_ID` from the init payload's `campaignId`.
- `roll-state.js` (marked block) shares every locally-made roll and injects
  remote ones, **deduped by `makeRoll` id** (a client's own echo collapses to
  one). Shared rolls are JSON-cloned so a function field (`hl`) can't break
  postMessage/storage. In multiplayer the log starts empty (the demo seed is
  skipped) and fills from the backlog.
- **GM party board is real** now: `gm/[id]` projects each member's sheet into the
  GM party shape (`toGMPartyMember` in `roster.ts`) and passes it through
  `sf-gm-init`; `gm.jsx` reads `SF_GM_INIT.party` (seed only when standalone).

### Deferred / known edges (next slices)
- **Cross-user sheet view is read-ish.** The party selector can now switch to a
  campaign-mate's sheet (RLS allows the read), but writes are owner-only, so
  edits there won't persist (logged). A proper read-only/spectator sheet mode is
  a follow-up.
- **GM `facs` are base stat ranks** — live magic bonuses aren't reconstructed
  server-side yet, so Force-Resist/Action use base ranks for real members.
- Presence ("who's at the table") and live **map locations** weren't in this
  slice. Party-nav links opening a member's sheet from the GM rail still toast.

## Known limitations

- The prototype loads React / Babel / Lucide from unpkg at runtime (fine in the
  user's browser; a later port replaces this with bundled deps). Needs network
  in local dev.

## Pre-existing, unrelated

`next build` warns that `middleware.ts` should be renamed to `proxy.ts`
(Next 16 deprecation). Predates this work; left for a separate change.
