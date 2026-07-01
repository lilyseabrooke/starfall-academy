# Starfall Academy — Build-out Roadmap

> **Temporary document.** This is a guide for the initial build-out phase, meant
> to orient future chats that start without this conversation's context. **Delete
> it once the roadmap below is complete** (i.e. the build-out phase closes:
> the sheet is ported to native React, and multiplayer, GM, the live Compendium,
> and the account dashboard have all shipped). It is scaffolding, not permanent
> project documentation.

## How to use this doc

- Read this together with **`design/INTEGRATION.md`**, which has the concrete
  architecture and the host⇄sheet bridge contract. This file is the *where
  we're going*; that file is the *how the current thing is wired*.
- The handoff source data (rulebook + asset CSVs) lives in **`design/handoff/`**
  — that's the raw material for the live Compendium.
- Decisions already made are recorded here so they don't get re-litigated. If
  you're going to overturn one, do it deliberately.

---

## Where we are now (snapshot)

**Phase 1 — single-player prototype — essentially done.** The critical journey
works end to end: sign in → see your characters (or the creator if none) →
build a character in the Forge → it persists across sessions → party selector
shows same-campaign characters.

Delivered:
- The Claude Design character-sheet prototype is **vendored** at
  `public/character-sheet/` and **mounted in an iframe** at `/characters/[id]`
  (route group `src/app/(app)/`, auth-gated). It reuses the design system in
  `public/_ds/`.
- **Persistence** to Supabase `characters.sheet` (JSONB) via a postMessage
  bridge (`host-bridge.js` + a small marked block in `app.jsx`).
- **Creation via the Forge**, create-on-commit (no junk rows); `/characters/new`.
- **De-seeded roster**: the sheet's party/roll-dock/give read an injected roster
  built from the owner's characters sharing a `campaign_code`.
- **Campaigns by code** (stopgap; see below) + a roster page with new/join/leave.
- Account entry point on the teaser; auth redirect lands on `/characters`.

**Phase 2 — F2 + multiplayer + GM tools — shipped this cycle** (see
`design/INTEGRATION.md` for the architecture; all on Supabase Realtime, still
bridge-first / pre-F1):
- **F2 done.** Real `campaign_members` (player/gm roles), the `characters.campaign_id`
  FK wired, join/leave via `SECURITY DEFINER` RPCs, and RLS opened to
  campaign-scoped reads (a `campaigns_for_user()` helper avoids recursion).
- **Multiplayer (dice + party).** Durable shared roll log (`rolls` table +
  postgres_changes), cross-user party roster (player selector + the GM board now
  show real members, not seed).
- **GM tools as prompts, not GM-side rolls.** Force-Resist and Begin Action
  *prompt* the targeted player, whose own sheet rolls with its own stats (offline
  target = silent no-op). The GM never needs player stats — `facs` was removed.
- **Decided, do not re-litigate:** GM **write-sync** (grants/conditions/vitals
  writing to player sheets) is the next big goal, and we chose to **do F1 first**
  so the clean shared-state model falls out of the port rather than fighting the
  monolithic blob through the bridge. See the F1 section for the kickoff plan.

Operational fixes already applied (don't re-debug these):
- Supabase **table grants** on `public.characters` (the table was missing
  `select/insert/update/delete` for `authenticated` — every read/write was
  "permission denied" before RLS even ran). **Every new table needs grants.**
- Supabase Auth **redirect-URL allowlist** must include each origin you test
  from (preview/prod) or magic links bounce to the Site URL.

---

## Architecture & conventions (the load-bearing decisions)

- **Hybrid "land it, then port."** The prototype runs as-is (React 18 +
  in-browser Babel, `window.SF_*` globals) inside an iframe, sandboxed from the
  app's React 19. Integration happens at the bridge boundary until we port.
- **Persistence model.** The whole character is one `sheet` JSONB blob; the app
  shell (Next.js) owns identity, roster, campaigns, auth. `characters` columns:
  `id, owner_id, campaign_id (uuid, reserved), campaign_code (text, stopgap),
  type (pc/npc), name, sheet, timestamps`. RLS = owner-only (`owner_id =
  auth.uid()`), all-commands policy.
- **`campaign_code` is a deliberate stopgap.** No campaigns table yet; party =
  *your own* characters with the same code. `campaign_id uuid` is reserved for
  the real campaigns FK. This gets replaced — see Foundational F2.
- **Seed data.** The sheet still ships its own `data.js` seed (the Compendium,
  default character, etc.). The live Compendium replaces the reference parts.
- **The bridge is the integration seam.** New cross-boundary features (realtime,
  GM, compendium lookups) either go through `host-bridge.js` messages now, or
  become direct React/data calls after the port. Prefer extending the bridge
  protocol with explicit, validated message types.

---

## Roadmap

Ordered roughly by dependency. Foundational items unblock multiple features.

### F1 — Port the sheet to native React 19 (the "then-port" half) — NEXT UP
- **Goal:** replace the iframe + in-browser Babel + `window.SF_*` globals with
  bundled ES modules and the app's React 19, under the App Router.
- **Why now:** it's the prerequisite we chose for clean GM **write-sync** (extract
  session-mutable vitals from the monolithic `sheet` blob into atomic storage —
  hard to do safely against the vendored prototype, natural during the port). It
  also kills the unpkg-CDN / in-browser-Babel runtime (a production non-starter)
  and turns the realtime/GM/prompt wiring from postMessage into plain hooks.

**What the port replaces** (the current boot is all in
`public/character-sheet/index.html`):
- in-browser `@babel/standalone` → Turbopack compiles `.tsx` at build time
- React 18 UMD (unpkg) → the app's bundled **React 19**
- `window.SF_*` singletons + ordered `<script>`s → ES module imports/exports
- `_ds_bundle.js` UMD global (`window.StarfallAcademyDesignSystem_61fef2`) →
  an importable design-system module (wrap the bundle or port its components)
- Lucide UMD → **`lucide-react`** (already a dependency)
- iframe + `host-bridge.js`/`sf-*` postMessage → inline React; props + hooks +
  direct persistence. The bridge's `serializeSheet`/`applySheet` **shape is the
  contract to preserve** across the port.

**Suggested porting order (leaf-first, incremental):**
1. Foundations: make the design system importable; map icons to `lucide-react`;
   import the CSS; convert pure data/util (`data.js`, `shared.js`,
   `compendium-db.js`) to ES modules.
2. State hooks → typed modules: `roll-state`, `magic-state`, `inventory-state`,
   `classes-state`, `forge-state` (already `useState` hooks — mostly mechanical).
3. Shared UI `parts.jsx` (~97 KB), then features (`rolls`, `inventory`,
   `classes`, `bonus`, `search-menu`, `map-tab`, `tweaks-panel`).
4. The Forge (`forge-steps`, `forge`).
5. Roots: `app.jsx` / `gm.jsx` become native components rendered by the App
   Router pages; retire the iframes and the bridge.

**The hard parts (not the mechanical bulk):** ~600 KB of loose Babel JSX →
typed TSX; consuming the opaque design-system UMD as a module; the live
Compendium's *mutate-`SF_DATA`-in-place* pattern (doesn't fit React — restructure
into data loading); de-isolating ~300 KB of global CSS without collisions;
React 18→19 diffs with **no test suite** (every step is a manual regression).

**Sizing / sequencing:** this is the single largest roadmap item — weeks, not a
session. For write-sync specifically, start with steps **2 + 5** (state layer +
player-sheet root, where vitals live), then extract shared state, then GM
write-sync as native hooks. **Read `node_modules/next/dist/docs/` before writing
App Router code** (per AGENTS.md — this Next.js differs from training).
**Suggested first PR:** foundations (step 1) + one ported state hook (e.g.
`roll-state`) rendered natively behind a flag, proving the build/design-system/CSS
path end to end before fanning out.

### F2 — Campaigns as a first-class entity
- **Goal:** real `campaigns` table (id, name, owner/GM, created_at) + a
  `campaign_members` table (campaign_id, user_id, role: `player`|`gm`,
  character_id?). Migrate `campaign_code` → real campaign membership; populate
  the reserved `characters.campaign_id` FK.
- **Why:** prerequisite for multiplayer, GM, and the dashboard. The current
  code-based grouping can't express cross-user membership or roles.
- **Notes:** add RLS so campaign members can read each other's
  *campaign-relevant* data (see Multiplayer). Keep join-by-code as the UX for
  *joining* a campaign, but back it with the table. Remember table grants.

### Multiplayer (real-time, single-campaign) — DICE + PARTY SHIPPED
- **Done:** durable **shared dice log** (`rolls` + postgres_changes) and
  **cross-user visibility** (RLS campaign-scoped reads). See `INTEGRATION.md`.
- **Still open:** **presence** ("who's at the table") and live **map locations**
  (`map/party.js` exists; back it with realtime broadcast/presence). Decide the
  shared-vs-private surface as more vitals go live.
- **Tech:** Supabase Realtime (postgres_changes for durable; broadcast for
  ephemeral — already used for GM prompts).

### GM access & GM view — ROLE + PROMPT TOOLS SHIPPED; WRITE-SYNC NEXT
- **Done:** GM role from `campaign_members.role = 'gm'`; GM **reads** all party
  sheets (RLS); the GM board shows real members; **Force-Resist + Begin Action
  are prompts** the player's own sheet rolls (no GM-side stats). See
  `INTEGRATION.md`.
- **Still open (the write-sync milestone — gated on F1 by our decision):**
  - GM **writes** to player sheets — grant materials/items/spells, apply
    conditions, adjust resolve/AP — without clobbering the player's own edits.
    The clean fix is to extract session-mutable vitals out of the `sheet` blob
    (do it during F1); GM writes then go through scoped `SECURITY DEFINER` RPCs
    (not a blanket write policy) + bidirectional realtime apply.
  - **Persist GM-owned state:** NPCs as real `type='npc'` rows, campaign notes,
    and the time tracker (these have no player-concurrency, so they can land as
    smaller pieces once the substrate exists).
- **Depends on:** F1 (chosen first), then the write-sync substrate above.

### Live Compendium (DB-backed, replaces seed data)
- **Goal:** the Compendium reads from a real shared database instead of the
  prototype's `data.js` seed.
- **Scope:**
  - Supabase tables for the reference data: spells, items, classes, wands,
    artifacts, plants (source CSVs are in `design/handoff/`).
  - The sheet's **search/compendium drawer** and the **Forge** spell/item
    pickers read from the DB (via the bridge now, or direct queries post-port).
  - Later: admin editing/versioning of the Compendium.
- **Depends on:** mostly independent of F2/multiplayer — can proceed in
  parallel. Cleanest after F1 (so the sheet can query directly), but a
  bridge-fed read path is possible before that. Keep a seed fallback during
  migration. The "Build Character Mode" plan in `design/handoff/` already
  anticipates routing the real spell list in via the database.

### Account dashboard
- **Goal:** a signed-in home that surfaces the user's **campaigns** and
  **characters**, and is built to expand to other resources.
- **Scope:**
  - Replace the bare `/characters` roster as the post-login landing
    (e.g. `/dashboard` or `/home`): campaigns (with role), characters, quick
    actions (new character, create/join campaign, enter a session).
  - Designed for growth: future panels for the Compendium browser, GM tools,
    settings, and other resources.
- **Depends on:** F2 (campaigns must be real to list them meaningfully).

---

## Cross-cutting / data-model evolution

- `campaign_id uuid` (reserved) → real FK to `campaigns`; `campaign_code` →
  superseded by `campaign_members` (keep code as join UX only).
- Roles: `player` | `gm` on membership. NPCs via `characters.type = 'npc'`,
  owned/managed by the campaign GM.
- RLS expands from owner-only to **campaign-scoped read** policies for shared
  data, while keeping private fields owner-only.

## Known debts & operational notes (remember these)

- **Every new table needs grants** (`grant ... to authenticated` + RLS). The
  default Supabase grants did not apply here; missing grants read as silent
  empty results / 400s, not obvious auth errors.
- **Supabase Auth → URL Configuration:** add each new preview/prod origin (or a
  wildcard) to the redirect allowlist, or magic-link sign-in bounces to the
  Site URL.
- **Migration-history drift:** the live DB's migration history differs from the
  repo's migration files (the schema matches, but a fresh `supabase db reset`
  won't reproduce the live history exactly). Tidy before relying on reset.
- **Teaser entry link** (`Enter` on `/`) is public — hide it behind a flag
  before the public launch so the app entrance isn't world-visible.
- **`middleware.ts` → `proxy.ts`:** Next 16 deprecation warning at build; rename
  when convenient.
- The sheet still loads React/Babel/Lucide from a CDN at runtime (fine for now;
  F1 removes it). Save errors now surface (logged + alert on create), but full
  validation/UX for failures is still thin.
