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

### F1 — Port the sheet to native React 19 (the "then-port" half)
- **Goal:** replace the iframe + in-browser Babel + `window.SF_*` globals with
  bundled ES modules and the app's React 19, under the App Router.
- **Why:** unlocks server-side data access, real bundling/perf, and lets
  realtime/GM/compendium features be plain React instead of postMessage.
- **Notes:** can be incremental — port module-by-module (the prototype is
  already split: `*-state.js`, `parts.jsx`, `rolls.jsx`, `inventory.jsx`, the
  Forge, the map). The bridge's `serialize/hydrate` shape is the contract to
  preserve. This is large; sequence it against feature pressure — some features
  (basic realtime dice) can ship through the bridge first if needed.

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

### Multiplayer (real-time, single-campaign)
- **Goal:** a live shared session for a campaign's party.
- **Scope:**
  - **Shared dice log** across the party (the roll engine already tags rolls
    with an actor/`meId` and renders a shared `log`/toasts/dock — wire it to a
    server channel).
  - **Party presence + locations** (the embedded map already has a postMessage
    party bridge in `map/party.js`; back it with realtime).
  - **Cross-user visibility:** RLS policies so campaign-mates can read each
    other's characters (currently owner-only).
  - Decide what's shared vs private (rolls/presence/locations/visible vitals)
    and what stays owner-only.
- **Depends on:** F2 (membership + roles + RLS). **Tech:** Supabase Realtime
  (broadcast + presence for ephemeral; Postgres-changes for durable).

### GM access & GM view
- **Goal:** a GM role within a campaign with tools distinct from the player view.
- **Scope:**
  - Role from `campaign_members.role = 'gm'`.
  - GM can **view all party sheets** (read; scoped write where it makes sense),
    **adjudicate/trigger rolls** (the roll-prompt system already has GM/"Game
    Master" actor concepts in `rolls.jsx`), and **manage NPCs** (`type='npc'`
    already exists in schema).
  - A dedicated **GM screen/view** (party overview, NPC roster, map control,
    prompt-pushing) rather than a single player sheet.
- **Depends on:** F2, Multiplayer (shared channel). Likely smoother after F1.

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
