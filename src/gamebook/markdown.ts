/* ===========================================================================
   Starfall Academy — gamebook markdown
   ---------------------------------------------------------------------------
   A small, closed parser for exactly the Markdown the gamebook content files
   use. It is deliberately not a general Markdown implementation: the content
   is ours and the grammar is fixed, so this stays auditable and dependency-
   free rather than pulling a full CommonMark stack into the build.

   Grammar:
     ## .. #####          headings (each gets a stable slug for deep links)
     | a | b |            tables, with <br> for in-cell line breaks
     1. / -               ordered and unordered lists
     :::dialog … :::      an example-of-play transcript. Inside it:
                            **Name (Character):** spoken line
                            @roll  …           a die roll, as a roll card
                            @beat  …           a stage direction / table beat
     :::quote … :::       a pull-quote
     :::caption Text      a caption attached to the table that follows
     :::widget-name       an interactive block (stats-matrix, house-explorer)
     inline: **bold**, *italic*, [text](href)
   =========================================================================== */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] }
  | { kind: "cue"; text: string }
  | { kind: "break" };

export type Block =
  | { kind: "heading"; level: 2 | 3 | 4 | 5; text: string; slug: string }
  | { kind: "para"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "table"; caption: string | null; head: Inline[][]; rows: Inline[][][] }
  | { kind: "dialog"; entries: DialogEntry[] }
  | { kind: "quote"; children: Inline[] }
  | { kind: "widget"; name: string };

/* ------------------------- example-of-play transcripts -------------------- */

/** One labelled number added to a roll — a Stat, an Ability rank, a bonus. */
export interface RollMod {
  label: string;
  value: number;
}

/**
 * A single die roll as an example of play prints it.
 *
 * The examples are not uniform: some spell out both dice, some give only the
 * dice subtotal, some give nothing but the final number. Each of `dice`,
 * `pool` and `declaredTotal` records what the text actually said, and nothing
 * is inferred from the others — a roll card shows what is known and says so
 * where it isn't.
 */
export interface Roll {
  /** The player at the table who picks up the dice. */
  who: string;
  /** Who they are rolling for — their character, or an NPC the GM runs. */
  as: string | null;
  /** Individual die faces, when the example gives them. */
  dice: number[] | null;
  /** The dice subtotal, when the example gives only that. */
  pool: number | null;
  mods: RollMod[];
  /** A total stated outright, for examples that skip the arithmetic. */
  declaredTotal: number | null;
  /** A flat difficulty to beat. Ties count as a success. */
  dc: number | null;
  /** An opposing total to beat. Ties are ties. */
  vs: { total: number; label: string } | null;
  /** Overrides the computed verdict where a rule bends it (crits, forfeits). */
  result: string | null;
  /** The colour the example gave the roll, shown under the card. */
  note: string | null;
}

export type DialogEntry =
  /** Someone speaks. */
  | { kind: "line"; speaker: string; character: string | null; body: Inline[] }
  /** Something happens at the table that nobody says out loud. */
  | { kind: "beat"; children: Inline[] }
  /** One roll, or the two sides of a contest, resolved together. */
  | { kind: "rolls"; rolls: Roll[] };

export interface Heading {
  level: number;
  text: string;
  slug: string;
}

export interface ParsedPart {
  blocks: Block[];
  headings: Heading[];
}

/** Stable, human-readable anchor for a heading. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------- inline ---------------------------------- */

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|<br>)/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;

  while (rest) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index === undefined) {
      out.push({ kind: "text", text: rest });
      break;
    }
    if (m.index > 0) out.push({ kind: "text", text: rest.slice(0, m.index) });

    const tok = m[0];
    if (tok === "<br>") {
      out.push({ kind: "break" });
    } else if (tok.startsWith("**")) {
      out.push({ kind: "strong", children: parseInline(tok.slice(2, -2)) });
    } else if (tok.startsWith("*")) {
      out.push({ kind: "em", children: parseInline(tok.slice(1, -1)) });
    } else {
      const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      out.push({ kind: "link", href: link[2], children: parseInline(link[1]) });
    }
    rest = rest.slice(m.index + tok.length);
  }

  return out.filter((n) => n.kind !== "text" || n.text !== "");
}

/* --------------------------- dialog transcripts --------------------------- */

/**
 * A stage direction inside a spoken line: short, lower-case, unpunctuated —
 * "(rolls)", "(deep sigh)". Anything longer or sentence-shaped is left as the
 * prose it is; the run-on narration the Doc export produced was lifted out of
 * these lines into `@beat` and `@roll` instead.
 */
const CUE_RE = /\((?=[a-z])([^()]{1,34})\)/g;

function parseSpeech(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;

  for (const m of src.matchAll(CUE_RE)) {
    if (m.index === undefined || /[.!?]/.test(m[1])) continue;
    if (m.index > last) out.push(...parseInline(src.slice(last, m.index)));
    out.push({ kind: "cue", text: m[1].trim() });
    last = m.index + m[0].length;
  }

  if (last < src.length) out.push(...parseInline(src.slice(last)));
  return out;
}

/** "Logic 0, Analyze 0" → the numbers a roll adds, with what each one is. */
function parseMods(src: string): RollMod[] {
  return src
    .split(",")
    .map((chunk) => chunk.trim().match(/^(.+?)\s+([+-]?\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ label: m[1].trim(), value: Number(m[2]) }));
}

/**
 * One `@roll` line.
 *
 *   @roll Ahmed as Carlos | dice 2, 4 | add Logic 0, Analyze 0 | dc 14 | note …
 *
 * The first segment is who rolled; every later segment is a keyword and its
 * value. Segments are optional and order-free, because the examples differ in
 * how much of the arithmetic they bother to show.
 */
function parseRoll(src: string): Roll {
  const [first, ...segments] = src.split("|").map((s) => s.trim());
  const asSplit = first.split(/\s+as\s+/);

  const roll: Roll = {
    who: asSplit[0].trim(),
    as: asSplit.length > 1 ? asSplit.slice(1).join(" as ").trim() : null,
    dice: null,
    pool: null,
    mods: [],
    declaredTotal: null,
    dc: null,
    vs: null,
    result: null,
    note: null,
  };

  for (const seg of segments) {
    const m = seg.match(/^([a-z]+)\s+([\s\S]+)$/);
    if (!m) continue;
    const [, key, value] = m;

    switch (key) {
      case "dice":
        roll.dice = value.split(",").map((n) => Number(n.trim()));
        break;
      case "pool":
        roll.pool = Number(value.trim());
        break;
      case "total":
        roll.declaredTotal = Number(value.trim());
        break;
      case "add":
        roll.mods = parseMods(value);
        break;
      case "dc":
        roll.dc = Number(value.trim());
        break;
      case "vs": {
        const vs = value.match(/^(-?\d+)\s*([\s\S]*)$/);
        if (vs) roll.vs = { total: Number(vs[1]), label: vs[2].trim() };
        break;
      }
      case "result":
        roll.result = value.trim();
        break;
      case "note":
        roll.note = value.trim();
        break;
    }
  }

  return roll;
}

/** The body of a `:::dialog` fence: speech, rolls and table beats, in order. */
export function parseDialog(body: string[]): DialogEntry[] {
  const entries: DialogEntry[] = [];

  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;

    const roll = line.match(/^@roll\s+(.+)$/);
    if (roll) {
      // Consecutive @roll lines are the two sides of one contest, and resolve
      // against each other rather than against a DC.
      const last = entries[entries.length - 1];
      if (last && last.kind === "rolls") last.rolls.push(parseRoll(roll[1]));
      else entries.push({ kind: "rolls", rolls: [parseRoll(roll[1])] });
      continue;
    }

    const beat = line.match(/^@beat\s+(.+)$/);
    if (beat) {
      entries.push({ kind: "beat", children: parseInline(beat[1].trim()) });
      continue;
    }

    const said = line.match(/^\*\*([^:*]+):\*\*\s*(.*)$/);
    if (said) {
      // "Helena (GM)" — the player, then who they are speaking as.
      const who = said[1].trim().match(/^([^(]+?)\s*(?:\(([^)]*)\))?$/);
      entries.push({
        kind: "line",
        speaker: who ? who[1].trim() : said[1].trim(),
        character: who && who[2] ? who[2].trim() : null,
        body: parseSpeech(said[2].trim()),
      });
      continue;
    }

    entries.push({ kind: "line", speaker: "", character: null, body: parseSpeech(line) });
  }

  return entries;
}

/* -------------------------------- blocks --------------------------------- */

function splitRow(row: string): string[] {
  return row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

export function parseMarkdown(src: string): ParsedPart {
  const lines = src.split("\n");
  const blocks: Block[] = [];
  const headings: Heading[] = [];
  // A :::caption line binds to the next table it precedes.
  let pendingCaption: string | null = null;
  let i = 0;

  const flushPara = (buf: string[]) => {
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "para", children: parseInline(text) });
    buf.length = 0;
  };

  const para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      flushPara(para);
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{2,5})\s+(.+)$/);
    if (h) {
      flushPara(para);
      const level = h[1].length as 2 | 3 | 4 | 5;
      const text = h[2].trim();
      const slug = slugify(text);
      headings.push({ level, text, slug });
      blocks.push({ kind: "heading", level, text, slug });
      i++;
      continue;
    }

    // Fenced directive
    if (line.startsWith(":::")) {
      flushPara(para);
      const name = line.slice(3).trim();

      if (name.startsWith("caption ")) {
        pendingCaption = name.slice(8).trim();
        i++;
        continue;
      }

      if (name === "dialog" || name === "quote") {
        const body: string[] = [];
        i++;
        while (i < lines.length && lines[i].trim() !== ":::") {
          body.push(lines[i]);
          i++;
        }
        i++; // closing :::
        if (name === "quote") {
          blocks.push({ kind: "quote", children: parseInline(body.join(" ").trim()) });
        } else {
          blocks.push({ kind: "dialog", entries: parseDialog(body) });
        }
        continue;
      }

      // Standalone interactive block
      blocks.push({ kind: "widget", name });
      i++;
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      flushPara(para);
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const head = splitRow(rows[0]).map(parseInline);
      const body = rows
        .slice(2) // skip the |---| separator
        .map((r) => splitRow(r).map(parseInline));
      blocks.push({ kind: "table", caption: pendingCaption, head, rows: body });
      pendingCaption = null;
      continue;
    }

    // Lists
    const li = line.match(/^(\d+)\.\s+(.*)$/) || line.match(/^-\s+(.*)$/);
    if (li) {
      flushPara(para);
      const ordered = /^\d/.test(line);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = ordered ? lines[i].match(/^\d+\.\s+(.*)$/) : lines[i].match(/^-\s+(.*)$/);
        if (!m) break;
        items.push(parseInline(m[m.length - 1].trim()));
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flushPara(para);
  return { blocks, headings };
}
