# Gamebook

The rulebook, at `/gamebook`. Four parts, one route each, plus a hub.

## Where the text comes from

`content/*.md` **is the source of truth.** The text was ported once from the
Google Doc the site used to link out to; that document is retired and is no
longer consulted, synced from, or linked to. Rules changes are edits to these
files.

The port fixed up what the Doc export mangled: escaped formatting, table cells
whose line breaks had been flattened into run-together strings
(`AlchemyArtificyEnchantment…`), example-of-play boxes that arrived as
single-cell tables with the speakers concatenated, and ~30 cross-references
that pointed back at the Doc's own URL.

It also left the examples of play describing their dice in prose, run onto the
end of whoever spoke last — `You got it.(Ahmed rolls 2d10 and gets a 2 and a
4…)`. Those are now `@roll` and `@beat` lines, which is a content change, not
a rules change: every total and every verdict still matches what the transcript
says out loud.

## The content grammar

`markdown.ts` is a small closed parser — not general Markdown. It handles
exactly what these files use:

| Syntax | Renders as |
| --- | --- |
| `## … #####` | headings, each with a stable slug for deep links |
| `\| a \| b \|` | a table; `<br>` inside a cell is a line break |
| `1.` / `-` | ordered and unordered lists |
| `:::dialog … :::` | an example-of-play transcript (see below) |
| `:::quote … :::` | a pull-quote |
| `:::caption Text` | a caption bound to the table that follows |
| `:::stats-matrix` | the Stats explorer |
| `:::house-explorer` | the Houses explorer |
| `**bold**`, `*italic*`, `[text](href)` | inline |

Cross-references are written as bare `#anchor`. `buildAnchorIndex()` resolves
each one to whichever part actually contains that heading, so a link from Part
II to `#stats` becomes `/gamebook/character-creation#stats` on render. Add a
heading anywhere and links to it keep working.

To add an interactive block: register it in `WIDGETS` in `Blocks.tsx`, then
drop `:::your-widget-name` into the content.

## Examples of play

A `:::dialog` fence renders as a transcript panel — a feed of messages, one
colour per voice, with a cast strip in the header that follows a single voice
through the scene on hover (click to pin). Colours are assigned once per page
in `cast.ts`, in order of first appearance, so a player keeps the same colour
from the first example on a page to the last. The GM is always gold.

Three kinds of line go inside the fence:

| Syntax | Renders as |
| --- | --- |
| `**Kayla (Maya):** …` | Kayla speaking, playing Maya. `(GM)` marks the GM. |
| `@roll …` | a roll card — dice, modifiers, total, verdict |
| `@beat …` | something that happened at the table without being said |

A short lower-case parenthetical inside a spoken line — `(rolls)`, `(deep
sigh)` — becomes a stage-direction chip. Anything longer stays prose.

### `@roll`

    @roll Ahmed as Carlos | dice 2, 4 | add Logic 0, Analyze 0 | dc 14 | note …

The first segment is who rolled and who for; every later segment is a keyword
and its value, all optional and order-free:

| Keyword | Meaning |
| --- | --- |
| `dice 2, 4` | the individual faces |
| `pool 14` | the dice subtotal, where the example never split the faces |
| `total 24` | a total stated outright, where it never showed the working |
| `add Logic 0, Body 5` | the labelled numbers added on |
| `dc 14` | a flat DC. Ties clear it |
| `vs 19 Maya's Barrier` | an opposing total. Ties are ties |
| `result …` | overrides the computed verdict, where a rule bends it |
| `note …` | the colour the example gave the roll, printed under the card |

Two consecutive `@roll` lines are the two sides of one contest: each resolves
against the other, and the card stack draws the comparison between them.

**Nothing is inferred across those fields.** `dice`, `pool` and `total` each
record only what the text actually said, and a card that doesn't know the dice
says so rather than inventing faces that add up. The verdict — degrees,
criticals, Inflection Points — is computed by `rolls.ts` from the same rules
the character sheet uses (`degreesFor` and `classify` in
`sheet/data/roll-engine.ts`), so the book and the sheet can never disagree
about what a 6 against DC14 means.

Where a card knows the whole sum, it offers to roll the same check for the
reader — a fresh 2d10 under the same modifiers, against the same number,
shown beside the example rather than replacing it.

## Data lifted out of the prose

Two tables were too cross-referential to read as tables and became structured
data with an explorer on top:

- `stats.ts` — the six Stats, their Subjects and Skills, and what each resists.
  Because it also carries the four fields of magic, the explorer can answer the
  question the Doc's merged-cell grid couldn't: *which Stat does this Ability
  roll with?*
- `houses.ts` — the five Houses, each carrying the anchor of its own chapter
  and of the region of campus it stands in.

Editing those two is a code change, not a content change. Everything else is
prose.

## Compendium cross-links

`widgets/CompendiumContext.tsx` scans the prose in the browser against the live
Compendium and turns entry names into hover cards. Nothing is annotated by
hand.

Two things keep it honest, and both matter if you tune it:

1. **Matching is case-insensitive.** The live workbook stores names in caps
   (`SYLENE'S CRYSTAL`); the prose writes them in title case.
2. **An occurrence only counts if it's capitalised** (`isReference`). There are
   spells called Light, Sleep, Barrier, Flight and Slow, and the rulebook uses
   those words constantly in their ordinary sense. Capitalisation is what
   separates "cast Levitate" from "a pale light". Against the current workbook
   this yields ~75 links across ~36 names, essentially all genuine.

The known false positive is an ordinary word that happens to start a sentence.
`LINKABLE_CATS` and `STOPLIST` are the other two dials.
