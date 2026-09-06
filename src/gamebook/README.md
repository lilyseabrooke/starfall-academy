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

## The content grammar

`markdown.ts` is a small closed parser — not general Markdown. It handles
exactly what these files use:

| Syntax | Renders as |
| --- | --- |
| `## … #####` | headings, each with a stable slug for deep links |
| `\| a \| b \|` | a table; `<br>` inside a cell is a line break |
| `1.` / `-` | ordered and unordered lists |
| `:::dialog … :::` | an example-of-play transcript |
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
