/* ===========================================================================
   Starfall Academy — classes (assembled from the database)
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/classes.js (window.SF_CLASSES). Reads the
   baked CSV snapshot (classes-db.ts), parses it, and builds the class objects
   the Classes wing renders. The CSV parser + builder are exported so the live
   loader (compendium.ts) can rebuild against a fetched CSV.

   Rank-point economy: purchasing a class (0 → I) costs 5 RP; each rank after
   that costs RP equal to the rank being bought.
   =========================================================================== */
import { CLASSES_DB, type ClassesDb } from "./classes-db";

/** A move() tag parsed into its spec. */
export interface MoveSpec {
  abilities: string[];
  addRank: boolean;
  rankConditional: string | null;
  dc: number | null;
  backfire: boolean;
}

export interface ClassOption {
  title: string;
  desc: string;
  tag: string;
  move?: MoveSpec;
}

export interface ClassRank {
  options: ClassOption[];
}

export interface ClassDef {
  id: string;
  dbId: string;
  name: string;
  paths: [string, string];
  tone: string;
  icon: string;
  description: string;
  tagline: string;
  ranks: ClassRank[];
}

/* ----------------------------- CSV parser ----------------------------- */
// RFC-4180-ish: handles quoted fields, embedded commas/newlines, "" escapes.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        /* skip */
      } else field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* --------------------------- move() tag parser ------------------------ */
// move("ability"[, "ability"]* [, +rank | +rankConditional:"text"] [, DC=NN] [, backfire])
export function parseMoveTag(raw: string): MoveSpec | null {
  const s = String(raw || "").trim();
  if (!/^move\s*\(/i.test(s)) return null;
  const open = s.indexOf("(");
  const close = s.lastIndexOf(")");
  if (open < 0 || close < 0) return null;
  const inner = s.slice(open + 1, close);

  const tokens: string[] = [];
  let buf = "";
  let q = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '"') {
      q = !q;
      buf += c;
    } else if (c === "," && !q) {
      tokens.push(buf.trim());
      buf = "";
    } else buf += c;
  }
  if (buf.trim()) tokens.push(buf.trim());

  const spec: MoveSpec = { abilities: [], addRank: false, rankConditional: null, dc: null, backfire: false };
  for (const tk of tokens) {
    if (!tk) continue;
    let m: RegExpExecArray | null;
    if ((m = /^\+rankConditional\s*:\s*"([\s\S]*)"$/i.exec(tk))) spec.rankConditional = m[1];
    else if (/^\+rank$/i.test(tk)) spec.addRank = true;
    else if ((m = /^DC\s*=\s*(\d+)$/i.exec(tk))) spec.dc = parseInt(m[1], 10);
    else if (/^backfire$/i.test(tk)) spec.backfire = true;
    else if ((m = /^"([\s\S]*)"$/.exec(tk))) spec.abilities.push(m[1].trim());
    // Unrecognised tokens ignored (forward-compatible).
  }
  return spec;
}

/* ----------------------- Build classes from the DB -------------------- */
const slug = (name: string) =>
  String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildClasses(db: ClassesDb): ClassDef[] {
  const rows = parseCSV(db.csv).filter((r) => r.length > 1 && (r[0] || "").trim());
  rows.shift(); // discard header row
  const meta = db.meta || {};

  // Columns: [0] NAME [1] COLOR [2] ICON [3] DESCRIPTION [4] PATH 1 [5] PATH 2
  //          [6..65] RANK r-o NAME/DESCRIPTION/TAG (×20 options)  [66] ID
  return rows.map((r) => {
    const name = (r[0] || "").trim();
    const id = slug(name);
    const m = meta[id] || {};
    const tone = (r[1] || "").trim() || "gold";
    const icon = (r[2] || "").trim() || "graduation-cap";
    const description = (r[3] || "").trim();
    const paths: [string, string] = [(r[4] || "").trim(), (r[5] || "").trim()];
    const dbId = (r[r.length - 1] || "").trim();

    const ranks: ClassRank[] = [];
    for (let L = 1; L <= 10; L++) {
      const opts: ClassOption[] = [0, 1].map((side) => {
        const k = (L - 1) * 2 + side;
        const base = 6 + k * 3;
        const title = (r[base] || "").trim();
        const desc = (r[base + 1] || "").trim();
        const tag = (r[base + 2] || "").trim();
        const move = parseMoveTag(tag);
        return move ? { title, desc, tag, move } : { title, desc, tag };
      });
      ranks.push({ options: opts });
    }

    const display = name.charAt(0) + name.slice(1).toLowerCase();
    return { id, dbId, name: display, paths, tone, icon, description, tagline: m.tagline || "", ranks };
  });
}

export interface ClassesModule {
  classes: ClassDef[];
  parseCSV: typeof parseCSV;
  parseMoveTag: typeof parseMoveTag;
  buildClasses: typeof buildClasses;
  /** Cost in RP to acquire `targetRank` (1 = purchase the class). */
  cost: (targetRank: number) => number;
  /** Starting class state — Pupil III + Socialite I (matches the Roll20 sheet).
   *  choices: { rankLevel: optionIndex } (0 = left option, 1 = right). */
  start: Record<string, { rank: number; choices: Record<string, number> }>;
  startingRp: number;
}

/** The default (seed) classes module, built from the baked snapshot. The live
 *  loader rebuilds `classes` from a fetched CSV via buildClasses(). */
export const CLASSES: ClassesModule = {
  classes: buildClasses(CLASSES_DB),
  parseCSV,
  parseMoveTag,
  buildClasses,
  cost: (targetRank) => (targetRank <= 1 ? 5 : targetRank),
  start: {
    pupil: { rank: 3, choices: { 1: 0, 2: 1, 3: 0 } },
    socialite: { rank: 1, choices: { 1: 0 } },
  },
  startingRp: 12,
};
