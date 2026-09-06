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
     :::dialog … :::      an example-of-play transcript
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
  | { kind: "break" };

export type Block =
  | { kind: "heading"; level: 2 | 3 | 4 | 5; text: string; slug: string }
  | { kind: "para"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "table"; caption: string | null; head: Inline[][]; rows: Inline[][][] }
  | { kind: "dialog"; lines: { speaker: string; body: Inline[] }[] }
  | { kind: "quote"; children: Inline[] }
  | { kind: "widget"; name: string };

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
          const dialogLines = body
            .filter((l) => l.trim())
            .map((l) => {
              const m = l.match(/^\*\*([^:*]+):\*\*\s*(.*)$/);
              return m
                ? { speaker: m[1].trim(), body: parseInline(m[2].trim()) }
                : { speaker: "", body: parseInline(l.trim()) };
            });
          blocks.push({ kind: "dialog", lines: dialogLines });
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
