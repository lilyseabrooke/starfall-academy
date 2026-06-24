# Build-Character Mode — Approach

*Starfall Academy character sheet · planning doc (no code yet) · revised against the official Light-Version ruleset*

## 1. The core idea

**One wizard, two doors.** A single guided **Forge** wizard, reached two ways:

- **New character** — from the *"Add a character"* button already in the sidebar roster. Starts blank, **budgets enforced**.
- **Edit / respec existing** — the *same wizard*, pre-filled with current values. Everything editable (see §7 for how budgets behave when editing an already-advanced character).

The wizard outputs exactly the data shapes the app already consumes (`character`, `faculties`, `magicSchools`, `classState`, inventory, `spells`), so **play mode needs no rewiring**.

## 2. Terminology bridge (rulebook ⇄ this app)

The rulebook and the codebase use different words for the same things. The whole builder hinges on this mapping:

| Rulebook term | App term / data | Notes |
|---|---|---|
| **Stat** | `faculties[].rank` | The six: Focus, Creativity, Logic, Insight, Body, Charm |
| **Subject** (field of magic) | `magicSchools[].subjects[].rank` | 24 fields. Each rolls off a governing Stat (already in `data.js` as `sub.stat`) |
| **Skill** | `faculties[].skills[].rank` | 24 skills, 4 per Stat |
| **Ability** | Subject **or** Skill | Combined term used by build costs & wands |
| **Rank Points (RP)** | `classState` + RP ledger | Already implemented as the Classes economy |

Governance is already correct in the data: Focus/Creativity/Logic/Insight each govern **6 subjects + 4 skills**; **Body & Charm govern 0 subjects, 4 skills each** (Body resists Wound, Charm resists nothing). The builder just needs to *expose* these ranks for allocation — it doesn't need to change the mapping.

## 3. Year — the master dial

Year is chosen up front and **rescales every budget and the per-rank cap**. All later steps read from it.

| Year | Quick: Stat / Subject / Skill ranks | Custom: points | Per-rank limit | Spells (B / S / A) |
|---|---|---|---|---|
| First | 10 / 15 / 15 | 60 | 5 | 5 / 10 / 1 |
| Second | 15 / 25 / 25 | 90 | 6 | 7 / 12 / 1 |
| Third | 20 / 35 / 35 | 120 | 7 | 10 / 15 / 2 |
| Fourth | 25 / 45 / 45 | 150 | 8 | 12 / 18 / 2 |
| Graduate | 30 / 55 / 55 | 180 | 9 | 15 / 20 / 3 |

> Note: the app's seed character (Lyra, Stats 10–14) is an *advanced/in-play* character far past first-year creation caps — that's expected. Fresh first-years sit at Stats 0–5.

## 4. The wizard steps

Full-screen takeover: a vertical step-rail on the left (sidebar aesthetic — crest watermark, Spectral all-caps), step content on the right, and a footer with **Back / Next plus a live budget HUD** (the relevant pool/quota counters for the current step). Steps follow the rulebook order:

| # | Step | What happens | Reuses |
|---|------|--------------|--------|
| 1 | **Identity & Year** | Name, pronouns, **year**, **build type (Quick/Custom)**, house, title, bio | new UI |
| 2 | **Classes** | Pick **one class @ rank 4** *or* **two classes @ rank 2 each**; choose each rank's option. Custom build may buy higher ranks from the pool | **existing Classes ladder** |
| 3 | **Wand** | Pick **one of three** starting wands and set its bonus target(s) | new UI + bonus system |
| 4 | **Allocation** | Three sub-panels — **Stats · Subjects · Skills** — with +/− steppers, live budget, per-rank cap. Declare 1–2 **major** subjects here | new allocator |
| 5 | **Inventory** | 500 base materials + magic-driven yields (below); pick the resulting potions / glyphs / bonus wands | **existing Compendium** |
| 6 | **Spells** | Pick Basic / Standard / Advanced up to the year's quota (no field restriction) | **existing Compendium (spell volume)** |
| 7 | **Review & Begin** | Summary of every choice + leftover points, flavor finish, then **Begin** | new summary |

### Step 2 — Classes
Default allotment is **8 "class-points" free**: one class at rank 4, or two at rank 2 each. The existing `SF_ClassesPage` ladder handles enroll / rank-up / option-choosing. In **Custom build**, ranks beyond the free 8 cost **2 points per rank level** from the shared pool (a rank-N class totals 2×N; the first 8 are free). Max **2 classes** at creation either way.

### Step 3 — Wand (pick one)
| Wand | Grants | Targets to choose |
|---|---|---|
| **Sylene's Crystal** | +2 to one **Stat** | 1 stat |
| **Champion's Wand** | +2 to **three Abilities** | 3 subjects/skills |
| **Whispered Secrets** | +4 to one **Ability** | 1 subject/skill |
These become an **equipped starting wand whose bonuses flow through the existing bonus ledger** (`bonuses` / wand `bonus` objects), so totals update live exactly as in play.

### Step 4 — Allocation (the new engine)
- **Quick build:** three independent rank pools (Stat / Subject / Skill) — 1 rank = 1 point within its pool.
- **Custom build:** one shared pool — **Stat rank = 3 pts, Ability rank = 1 pt** — and the same pool also funds extra class ranks (§Step 2), extra wands, and artifacts (§below).
- **Cap:** no single Stat/Subject/Skill may exceed the year's limit at creation.
- Quick build is just a pre-portioned Custom build (first-year 10×3 + 15 + 15 = 60 ✓) — both run on one internal cost engine.

**Custom-only extra spends** (from the shared pool):
- **Wands:** 1 pt per 400 materials of wand cost.
- **Artifacts:** 1 pt per 400 materials; **auto-attuned** at creation.

### Step 5 — Inventory (yields from magic allocation)
Base **500 materials**, plus:
- **Alchemy** rank → that many **potions** (max 6), recipes known.
- **Runology** rank → **2 glyphs** each.
- **Wandcrafting** rank → **200 materials of bonus wand** each (poolable into bigger wands); also unlocks the wandcrafting-studio flavor note.

### Step 6 — Spells
Pick to the year's **Basic / Standard / Advanced** quota; no field restriction. *(Drawn from the app's Compendium spell volume — see data gaps, §8.)*

### Step 7 — Review & Begin
Summary + flavor (house already chosen drives tone; personality/backstory/familiar are free text). **Begin** commits the draft into live state and — for a new character — adds them to the roster. Per the rulebook's explicit note to automated sheets, **Rank Points are reset to 0 on commit** (creation points don't carry into the in-play RP ledger).

## 5. House → tone (identity)

The five houses map 1:1 onto the design-system tones, so house selection drives every accent automatically:

| House | Tone | Color | House | Tone | Color |
|---|---|---|---|---|---|
| Dragon | `plum` | violet | Eagle | `crimson` | red |
| Boar | `forest` | green | Scorpion | `gold` | gold |
| Dolphin | `teal` | blue | | | |

House is **flavor**, chosen freely (not mechanically tied to anything), but it sets `house` + `houseTone` in one move. New character field **`bio`** (background blurb) is also added here and surfaced on the Identity hero.

## 6. What changes in the code

| File | Change |
|------|--------|
| `data.js` | Add the **5-house table**, the **`creation` rules block** (year table, costs, caps, spell quotas, starting wands), `bio`, and a `major` field. Add **material-cost values** to wands/artifacts so Custom purchase math works (§8). |
| `app.jsx` | **Lift faculties, skills, and subjects into React state** (read-only constants today). Add wizard open/close + new/edit entry points; on **Begin**, write the draft into state and reset RP to 0. |
| `parts.jsx` | Identity hero gains `bio` + major; wire "Add a character" and a new "Edit / Respec" control to open the wizard. |
| **`forge.jsx`** *(new)* | Wizard shell: step-rail, footer budget HUD, and the Identity / Wand / Allocation / Inventory / Spells / Review steps. |
| **`forge-state.js`** *(new)* | Draft state + the Quick/Custom cost engine (mirrors `classes-state.js`); persists the in-progress draft to `localStorage`. |
| **`forge.css`** *(new)* | Wizard styling against the DS tokens. |

Lifting faculties/subjects into state is the one non-trivial refactor — contained, and it's what makes the values editable without touching how cards render or roll.

## 7. New vs. Edit — how budgets behave

**Budgets and caps are hard-enforced in both modes.** New characters start blank; editing pre-fills the wizard with current values — but in either case you can't **Begin** while over-spent or over-cap for the chosen year. *(The seed character Lyra is a placeholder whose Stats wildly exceed any legal creation budget; she's not a case to design around.)*

## 8. Data decisions (resolved)

- **Wand & artifact material costs** — the Compendium is placeholder data, so I'll assign sensible costs: **artifacts 1,000–5,000 materials**, **wands 200–1,000**. This feeds Custom-build purchasing (1 pt / 400 mat) and the Wandcrafting yield (200 mat of bonus wand per rank).
- **Spell pool** — the Spells step works from **whatever's currently in the Compendium**; the full rulebook list will be routed in via the eventual database, not now. The by-year quotas still apply (capped to what's available).
- **Familiar / studiomates / personality** are captured as flavor text only (no mechanics), per the rulebook.
- Multi-character: the wizard targets the active character / adds to roster; full per-member sheet persistence is a larger lift — flag if wanted.

## 9. Out of scope (per your answers)

- No portrait-image upload (identity = fields + bio + initials/crest).
- One cohesive design matching the existing sheet — no alternate builder layouts.
