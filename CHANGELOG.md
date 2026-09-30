# Changelog

All notable changes to Starfall Academy, by version. See `VERSIONING.md` for
what MAJOR/MINOR/PATCH mean here.

Versions below **v1.0.0** predate version tracking and aren't reconstructed
commit-by-commit; v1.0.0 onward is rebuilt from git + Vercel deployment
history, since the practice of bumping a version number didn't exist yet
when these shipped.

## v1.23.4 — 2026-09-30
- Finishing a new character or NPC no longer flashes the demo party (Arianna
  Valey and co.) in the side rail while it saves: the loading screen, or the
  "Conjuring…" screen for a random NPC, now stays up until the new sheet
  opens. If the save fails, the cover comes down with the error.

## v1.23.3 — 2026-09-30
- The **random-NPC form** has a new look. Year is a row of roman numerals;
  House, major and classes each sit on one compact row showing your picks as
  coloured tokens (or "Random" when left open), and clicking a row opens a
  panel underneath: House crests, majors grouped by school, and class cards
  with their icons. The form also fits on a phone screen now.
- The built-in backup of the Classes table (used when the Google Sheet can't
  be reached) is refreshed: it now includes the **Technician** and the
  reworked Alchemist abilities.

## v1.23.2 — 2026-09-30
- **Unlimited build** now ignores the year's rank cap (ranks up to 12) and is
  no longer the default for NPCs. A random Unlimited build rolls its point
  total first, then takes its rank cap from the year whose point pool is
  closest to that total.
- NPCs can be **Unaffiliated** — "Not everyone who lives and works at Starfall
  is tied to a House." — with gray as the sheet's theme colour. It's offered in
  the NPC creator, and the random-NPC form can now pick a House (or Unaffiliated),
  leaving it to chance if you don't.
- The random-NPC form builds on the default (Quick) build, so the year you pick
  decides the NPC's power level.
- Backing out of the character creator now shows the loading screen instead of
  flashing the demo sheet underneath.
- The "Conjuring…" screen for a new random NPC picks from sixteen lines.

## v1.23.1 — 2026-09-30
- GM tools: the basic-NPC tab is now **Extras**, so it no longer shares a name
  with the full NPC sheets in the side rail.
- An NPC's sheet has **Delete character** under Edit character, behind a
  confirmation.
- Random NPC builds now build *around* a major you name: the random build's
  archetype is centred on it (its subject, governing stat, or school), the same
  way a randomly drawn major already shaped the build. Before, an archetype
  focused elsewhere could zero the named major out entirely, leaving e.g. an
  Evocation major with no Evocation or Focus. A major's governing stat also
  can no longer be folded away by the "tidy the stray 1s" pass.
- Random class choices are a fair 50/50 between a rank's two options (they
  used to lean 85% toward one path).

## v1.23.0 — 2026-09-30
- **NPC character sheets.** A GM can now give an NPC a full character sheet,
  stored inside the campaign and visible only to them. The side rail (on the
  GM tools and on every character sheet the GM opens) has a new **NPCs**
  category under the party: click an NPC to open their sheet, **+** to build a
  new one in the character creator, or the **dice** to conjure a random one.
- The creator has a new **Unlimited** build type for NPCs — a custom build
  with no point limit (the year's rank cap still applies). Random Character on
  an Unlimited build first rolls a point total between a first-year's and a
  graduate's, then builds as usual.
- The dice opens a form — name, pronouns, year, and optionally major(s),
  class(es) and a bio — and builds and saves a random NPC from those answers.
- An NPC's sheet works like a PC's. The GM rolls for them and the whole table
  sees it, unless they choose **Secret** — offered on every NPC roll.
- The Party Board now ends with **The NPC Board**: every NPC in the campaign,
  laid out like the party cards above it.
- Players can no longer read NPC rows at all (database policy), and the GM's
  own character list no longer shows their NPCs.
- The creator's "Begin" no longer navigates to the character list while the
  new character saves.

## v1.22.1 — 2026-09-28
- Fixed Sort by ID in the Compendium (drawer and standalone page both): it
  matched digits at the *end* of each ID rather than the row number right
  after the prefix, so any ID with extra trailing characters sorted into a
  near-arbitrary position instead of numeric order.
- Regenerated the Compendium's offline/seed data from the live sheet. The
  bundled snapshot had gone stale — from before the sheet's current
  `spell_144`-style IDs — so a category whose live fetch failed would
  silently fall back to entries with old, differently-ordered IDs, which is
  what made Sort by ID look broken in the sheet's Compendium drawer but not
  the standalone Compendium page.

## v1.22.0 — 2026-09-28
- The character sheet has a new **Journal** tab (between Inventory and Map)
  with two sections. "Shared by the Game Master" holds the pages the GM
  marked to show the table, read-only; "Your notes" is the character's own
  journal — new page, title, tags, body, delete — the same writing surface
  as the GM's Notes tab, minus anything about sharing. A player's notes live
  on their sheet, so a party-mate or the GM reads them by opening that
  sheet; only the owner gets the editor.
- The GM's Notes tab gained a "Share with players" toggle per page, and a
  Shared chip on shared pages in the list. Sharing broadcasts on the
  campaign channel: every sheet at the table toasts and refreshes on the
  spot. Editing a shared page re-broadcasts silently, and un-sharing drops
  it from open Journals rather than leaving a stale copy.
- `campaigns.notes` is no longer readable by the whole table. Every campaign
  member can select the campaign row and RLS can't hide a column, so the
  GM's private prep was readable from any player's browser. The column now
  comes off the `authenticated` grant list, and both sides read the journal
  through definer functions — `gm_campaign_notes()` for the GM's own pages,
  `shared_campaign_notes()` for the members' shared subset.

## v1.21.3 — 2026-09-28
- A forced Resist from a spell backfire or a failed attunement no longer
  defaults to Wound: the condition starts unselected ("Select condition…")
  and the roll button stays disabled until you actually pick one.
- Updated the spell backfire modal's success/failure taglines.

## v1.21.2 — 2026-09-28
- Fixed the spell list's Auto sort: subjects tied on bonus (e.g. equal
  Chronomancy and Divination ranks) were interleaved by level/DC instead of
  staying grouped. Tied subjects now group together, in alphabetical order,
  before falling back to level/DC/name within each group.

## v1.21.1 — 2026-09-28
- The character sheet's side rail now has an "Overview" button (between
  Compendium and Edit character) that opens the Character Sheet Overview
  card directly, instead of only being reachable via Edit Character's
  Identity step.

## v1.21.0 — 2026-09-27
- The character sheet's Map tab no longer embeds the vendored vanilla-JS
  atlas in an iframe: the whole campus map — world tessellation, pan/zoom,
  the Citadel's 21-district shield tessellation, region/district/zone
  drill-down with dossiers, and party-location markers — is now native
  React/SVG (`src/sheet/components/map/`, typed geometry/data under
  `src/sheet/data/map/`). The search menu's "Map Location" results now
  actually jump the map to that region or Citadel district (previously a
  no-op stub). The standalone `/map` route keeps serving its own separate
  vendored copy under `public/map/`, untouched by this port.
- The Map tab's Whereabouts panel is gone, replaced by a pin button docked
  bottom-right of the map: click it, then click any location on the atlas —
  a region, a Citadel district, or a nested zone within either — to set that
  as your position; click empty space or the pin again to cancel. A clear
  button appears next to the pin once a location is set.
- Party-location markers now resolve nested Citadel picks correctly at every
  zoom level (previously a location like Dragon's Walk's La Avenida never
  rendered a marker anywhere), and a marker at a coarser zoom level now
  inherits its precise position from wherever it was actually placed —
  e.g. a pin in South Gate shows up at South Gate's own spot within Dragon's
  Walk when viewing the Citadel, and at Dragon's Walk's spot within the
  Citadel shield when viewing the campus — instead of always sitting at that
  region/district's generic centre. Marker size is now consistent at every
  zoom level instead of shrinking away from the campus view's size.
- The map's +/-/fit zoom buttons now ease into their target zoom instead of
  snapping instantly, and zoom a bit further per click.
- The campaign clock badge no longer forces its own second bar under the
  title on the Map tab — it stays inline with the title/search row and
  simply disappears once the bar is too narrow to fit it, instead of
  wrapping onto a redundant row (the Map tab hides vitals, so that row had
  nothing else in it).

## v1.20.0 — 2026-09-27
- Added "Change Join Code" to a campaign's Manage menu on the Characters
  page. Rolls a fresh join code for the campaign and immediately invalidates
  the old one; players already seated keep their membership since that's
  tracked separately from the code. Confirms in a second Manage-modal view
  before applying.

## v1.19.3 — 2026-09-26
- Fixed Sylene's Crystal (the starting stat wand): choosing it in the Admission
  used to permanently bump the chosen Stat's base rank by +2 instead of
  granting a wand bonus, so respeccing or unequipping it could never remove
  the +2. It now grants a proper wand bonus, same as the ability wands
  already did.

## v1.19.2 — 2026-09-25
- Added a "Sort by ID" option to the Compendium, in both the sheet's
  Compendium drawer and the standalone Compendium page. IDs (e.g.
  `spell_144`) sort by their numeric suffix rather than as text, so
  `spell_25` now correctly sorts before `spell_144`.

## v1.19.1 — 2026-09-24
- Fixed the Admission's custom-build point pools, which fell short of what
  quick build offers for 2nd year onward (2nd: 90 → 95, 3rd: 120 → 130, 4th:
  150 → 165, Graduate: 180 → 200). 1st year was already correct at 60.

## v1.19.0 — 2026-09-22
- New Chronicle page at `/chronicle`: a horizontal timeline of every past
  campaign, read live from the Campaigns tab of the same workbook the
  Compendium pulls spells, artifacts and wands from. Campaigns are placed by
  semester as well as year (Fall 2011 sits half a year after Spring 2011), a
  campaign that ran across two semesters draws as a bar that long, and
  campaigns running at the same time stack above and below the rail instead of
  overlapping. Each card carries the campaign's name, term, location and a
  monogram per player; clicking one opens the full record — description,
  dates, location and the party — in the same modal treatment as a character
  on the Ledger.
- The Chronicle parses the sheet's single PLAYERS field into players,
  characters, and who played whom, so a player who ran two characters in one
  campaign is listed once carrying both, rather than twice.
- Two ways to narrow the timeline, and they stack: search, which covers
  campaign, player and character names, and the Locations panel bottom-left,
  which doubles as the legend for the accent colour on each card. A campaign's
  own record filters too — its location heading follows that place. If the two
  between them rule everything out, the timeline says so and offers to clear
  them.
- Fix: the crest watermark behind a character's record on the Family Ledger
  laid out inline instead of sitting in the background, so every character and
  family modal opened on a tall empty block and pushed the name out of sight.
  Its rule and the one setting every other child of the modal to
  `position: relative` have equal CSS specificity, so source order was handing
  the watermark the wrong one.
- The crest behind a record — on the Ledger and the Chronicle alike — is now
  centred on the card and holds still while the record scrolls over it, the
  way the crest behind a page does. The close button holds still with it, so
  it stays reachable in a long record.

## v1.18.0 — 2026-09-21
- Fix: the artifact Repair popup rendered as unstyled, unusable overlapping
  text — its CSS was scoped to a container the popup no longer lived inside
  once it opened, since it's positioned via a portal to stay on-screen.
- The artifact edit panel now has a Condition field, so a GM/player can set
  an artifact to Stable/Damaged/Broken directly instead of only through a
  repair roll.

## v1.17.1 — 2026-09-21
- Fix: an Artifact bought directly with points in the Forge's custom build
  (rather than granted by a class) always got its move's Boon roll stat/skill
  hardcoded to Insight/none, ignoring the artifact's own skill(s). It now
  gets the same stat/skill (and multiple roll options, for a multi-skill
  artifact) the sheet already uses when an artifact is granted during play.

## v1.17.0 — 2026-09-21
- Fix: custom-build class ranks bought past the free base rank cost a flat
  2 points per level instead of scaling with the level bought (rank 5 now
  costs 10 points, rank 3 costs 6, etc).
- Custom build can now buy Items with points, the same way it already buys
  Wands and Artifacts, at the same 400-mat-per-point ratio — and unlike
  Wands/Artifacts, the same Item can be bought in any quantity.
- Fix: custom-build Wand/Artifact/Item purchases each rounded their own mat
  cost up to the next point individually, so several cheap purchases could
  cost far more than their combined mat value. The whole basket's mat total
  is now rounded up once instead.

## v1.16.1 — 2026-09-20
- The standalone Compendium's category tab bar now has small nudge
  buttons and eases a vertical scroll-wheel gesture into a smooth
  horizontal scroll while the bar is hovered, so every tab stays reachable
  on devices without horizontal scroll input.

## v1.16.0 — 2026-09-19
- The Vialbottom Board: added a new suspect token, The Blue-Eyed Man.
- The Vialbottom Board now supports multiple boards via tabs — start a
  fresh board without losing or resetting an existing one. Each tab is a
  fully independent board (its own tokens, strings, notes, and shapes),
  and boards can be added, renamed, switched between, and closed.

## v1.15.2 — 2026-09-17
- Fix: an artifact picked in the Forge during character creation (from a
  class grant or bought directly in the Inventory step) was attuned but its
  linked Boon move never showed up on the sheet. Picking an artifact there
  now adds its move alongside it, same as attuning one after character
  creation already did.

## v1.15.1 — 2026-09-17
- Removed the "Map Studio" dev-authoring tooling (the edit-mode tweak
  panels and their postMessage protocol) from the shipped campus map,
  character-sheet map, family ledger, and compendium — those were
  build-time tools for tuning layout, never meant to reach players.

## v1.15.0 — 2026-09-13
- `/api/stories` gains a `PATCH` endpoint: re-submitting a doc link that's
  already in the Stories catalogue under a different title or author now
  updates that existing row instead of leaving it untouched, so the Discord
  bot can fix a listing without creating a duplicate entry for the same doc.

## v1.14.1 — 2026-09-12
- The Vialbottom Board: notes and string labels now grow to fit whatever's
  typed into them instead of clipping it, and "Export" renders their full,
  wrapped text instead of squashing it onto one line.
- String anchors (the bend points you drop by clicking a string) are now
  individually removable — double-click one, select it and press
  Delete/Backspace, or use its × chip — without cutting the whole string.
- Strings can now start and end in empty space, not just on a suspect
  token: the String tool pins a free anchor point wherever you click, and
  clicking an existing anchor point continues a string from it, so
  multiple strings can meet at a shared joint off to the side of the board.

## v1.14.0 — 2026-09-12
- Add The Vialbottom Board, a hidden bonus dossier page at `/vialbottom` —
  deliberately unlinked from the nav, reachable by URL only. A drag-and-drop
  investigation corkboard: pin the twelve suspect tokens anywhere on the
  board, run red string between two of them (click a string to drop an
  anchor and bend its path), ring a group of suspects, point an arrow, or
  pin a note. Names can be toggled on as labels, the whole board resets to
  its starting layout, and "Export" saves it as a PNG. Layout persists to
  the browser's local storage. Built in the site's dark-academia palette and
  type, vendored as a standalone React app the same way `/character-map` and
  `/map` are — but without the top bar the rest of the site carries.

## v1.13.0 — 2026-09-10
- Add Stories, a catalogue of stories written by the Starfall community, each
  one a link out to the writer's own Google Doc. The page lives at `/stories`
  and is deliberately unlinked from the nav — it's reachable by URL only.
  Stories are submitted through the Discord bot, which posts them to a new
  `POST /api/stories` endpoint gated by a shared secret; the page itself is
  public and read-only, backed by a new `stories` table whose RLS grants
  read to everyone and writes to nobody but the service role.
- The catalogue is laid out as a shelf of cards in the house style: an
  illuminated capital tinted to its author, an accession number that stays
  put as the archive grows, the title, the author, the date it was filed,
  and a Read link out to the doc. Readers can search by title or author and
  sort by newest, oldest, title, or author.

## v1.12.0 — 2026-09-10
- Add a character sheet overview: a one-page summary card of a character —
  name, pronouns, title, House and year, major(s), every stat, subject and
  skill with points in it, each class rank with the abilities chosen along the
  way, and the names of every spell known and everything carried. It opens
  from a button on the Forge's Review step, and — for a character that's
  already built, where there is no Review step — from the bottom of the
  Identity page, in the slot Random Character occupies for a new one. Editing
  an existing character, the card reads classes, spells and gear off the live
  character rather than the respec draft. "Copy card" puts the whole thing on
  the clipboard as an image, ready to paste and share, and the card scales
  itself down to stay one page on a short window.

## v1.11.1 — 2026-09-10
- Fix Random Character forcing a multiclass build for two archetypes
  (Skill Specialist, Battle Skirmisher) instead of leaving them to the
  normal single/double coin flip — was pushing the overall multiclass
  rate to ~62% instead of the intended 50%.

## v1.11.0 — 2026-09-10
- Add a "View Character" button to campaign-less characters on the
  character dashboard, opening the same standalone sheet view shown when
  finishing character creation.

## v1.10.1 — 2026-09-08
- The Forge Inventory step's Artifacts section (class-granted artifacts)
  now always shows, alongside Potions/Plants/Glyphs/Wands, instead of
  disappearing when the character's class choices don't currently grant
  one.
- Support a combined `move(); item()` tag on a single class rank option,
  for options that both name a skill and grant an artifact outright.

## v1.10.0 — 2026-09-08
- Add a Random Character generator to the Forge: builds a full character
  (classes, stats, subjects, skills, wand, spells, and gear) for the Year
  and Build type chosen on the Identity page, in one of nine archetypes,
  then drops you at Review to tweak anything you like. Confirms before
  overwriting an already-started character's progress.

## v1.9.3 — 2026-09-05
- Fix the Compendium drawer briefly showing baked-in seed spells (like
  "Kindle the Hearth-Ward") while the live data was still loading; it now
  shows a crest loading placeholder instead.

## v1.9.2 — 2026-09-05
- Fix the DC-tie improvement roll never surfacing — it opened anchored to
  the bottom-left corner of the screen instead of as a centered modal, and
  was silently discarded by the next click. (#76)

## v1.9.1 — 2026-09-03
- Fix long prose blocks stranding empty space next to short ones on Lore/Asset cards.

## v1.9.0 — 2026-09-03
- Add the Subcultures Lore page to the Compendium.

## v1.8.0 — 2026-09-02
- Add a full roll log archive to the roll dock, with search, filters, and
  infinite scroll through a campaign's entire roll history. (#75)

## v1.7.1 — 2026-09-02
- Fix the roll log backlog permanently sticking at the 200th-ever roll once
  a campaign passed that count. (#74)

## v1.7.0 — 2026-08-27
- Add the Archetypes Lore page, with a Class sort and a double-draw Random option.

## v1.6.0 — 2026-08-26
- Award a Rank Point on successful improvement rolls. (#73)

## v1.5.2 — 2026-08-23
- Fix higher-level spell behavior not showing on rolls shared with the party. (#72)

## v1.5.1 — 2026-08-20
- Keep the Filters button open-able on mobile for sort-only tabs (Classes, Events). (#71)

## v1.5.0 — 2026-08-20
- Add Assets/Lore views to the Compendium, plus an Events timing sort and badge. (#70)

## v1.4.0 — 2026-08-15
- Add a Random option to Compendium sort. (#69)

## v1.3.1 — 2026-08-14
- Fix Resist rolls not incrementing Conditions on failure. (#68)

## v1.3.0 — 2026-08-08
- Persist GM NPCs and campaign journal on the campaign row instead of resetting
  on every reload; reconcile Supabase migration drift. (#67)

## v1.2.2 — 2026-08-08
- Add a close (X) button to the roll modal. (#66)

## v1.2.1 — 2026-08-08
- Roll Log ledger cleanup and a higher-level-behavior placeholder fix. (#65)

## v1.2.0 — 2026-08-08
- Add the Volatile spell tag end-to-end (backfire rules, filters, Compendium display). (#64)

## v1.1.2 — 2026-08-08
- Extend the DC-tie improvement trigger to cover a critical override on the same roll. (#63)

## v1.1.1 — 2026-08-08
- Include the Artificy backfire save in the DC-tie improvement trigger. (#62)

## v1.1.0 — 2026-08-08
- Extend the DC-tie improvement-roll trigger to every trained skill/subject
  roll (moves, spells, enchanting, wandcraft, and more), not just plain checks. (#61)

## v1.0.1 — 2026-07-18
**Hotfix**, shipped hours after the first game. Confirmed via production
logs: two characters logged 9,241 and 4,700 requests in 7 days, ~99.9% HTTP
409, most in the final 24 hours — the game session itself.
- Stop the party roster and GM board from over-fetching full sheet JSON per member.
- Diff-patch character sheet autosave directly to Supabase instead of
  round-tripping the entire sheet through a Vercel API route.
- Fix a production livelock in the autosave conflict-retry path that had no
  in-flight guard or retry cap.
- Add autosave telemetry (`character_save_events`) so a future session like
  this one can be diagnosed with a query instead of hand-sampling logs.

## v1.0.0 — 2026-07-17
**The build that ran the first game.** Includes the DC-tie improvement-roll
trigger (#60) and everything merged before it. This is the version the
massive usage spike above hit.
