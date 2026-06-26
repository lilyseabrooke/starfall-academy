"use client";

/* ===========================================================================
   Starfall Academy — live Compendium loader
   ---------------------------------------------------------------------------
   Ported from public/character-sheet/compendium-db.js. Each workbook tab is
   fetched as CSV via the "Publish to web" endpoint, parsed by header name, and
   shaped into the entry/class forms the sheet consumes.

   Change from the prototype: instead of mutating SF_DATA.compendium and
   SF_CLASSES.classes IN PLACE, this returns the merged data. Components read it
   via the useCompendium() hook (or call loadCompendiumData() directly). Any tab
   that can't be reached falls back to its seed rows, so the sheet still works
   offline. Seed categories the DB doesn't supply (e.g. "move") are preserved.

   Workbook: https://docs.google.com/spreadsheets/d/1DUyigWDvmE2DnQ7eJucjP6BqthEMVf61rAGrF8f-N2M
   =========================================================================== */
import * as React from "react";
import type { CompendiumEntry, Tone } from "../types";
import { SEED } from "./seed";
import { buildClasses, parseCSV, type ClassDef } from "./classes";
import { CLASSES_DB } from "./classes-db";

const PUB_ID =
  "2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd";
const SHEET_ID = "1DUyigWDvmE2DnQ7eJucjP6BqthEMVf61rAGrF8f-N2M";

/** Tab → GID (the default tab, gid 0, is Spells). */
const GID = {
  spell: "0",
  potion: "646516393",
  glyph: "1319626806",
  wand: "1233793945",
  artifact: "697341861",
  plant: "699108983",
  item: "1377072119",
  classes: "1631797228",
} as const;

const csvUrl = (gid: string) =>
  `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/pub?gid=${gid}&single=true&output=csv`;

type Row = Record<string, string>;

/** Parse CSV into header-keyed objects (header UPPERCASED + trimmed). */
function parseRows(text: string): Row[] {
  const rows = parseCSV(text).filter((r) => r.length > 1 && (r[0] || "").trim());
  if (!rows.length) return [];
  const header = rows.shift()!.map((h) => String(h || "").trim().toUpperCase());
  return rows.map((r) => {
    const o: Row = {};
    header.forEach((h, i) => {
      if (h) o[h] = r[i] == null ? "" : String(r[i]);
    });
    return o;
  });
}

/* ------------------------------- helpers ------------------------------ */
function titleCase(s: string): string {
  const str = String(s || "").trim();
  if (!str) return "";
  return str.split(/\s+/).map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}
function num(v: unknown): number | null {
  const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}
function slug(s: string): string {
  return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const yes = (v: unknown) => String(v || "").trim().toUpperCase() === "YES";
const rid = (row: Row, prefix: string) => (row.ID || "").trim() || `${prefix}-${slug(row.NAME)}`;

interface SubjInfo {
  key?: string;
  school?: string;
  stat?: string;
  tone?: Tone;
}
const SUBJ: Record<string, SubjInfo> = {};
SEED.magicSchools.forEach((sc) => {
  sc.subjects.forEach((su) => {
    SUBJ[String(su.name).toUpperCase()] = { key: su.key, school: sc.id, stat: su.stat, tone: sc.tone };
  });
});
const subjInfo = (name: string): SubjInfo => SUBJ[String(name || "").trim().toUpperCase()] || {};

const PALETTE: Tone[] = ["plum", "teal", "forest", "crimson", "gold"];
function toneFromName(name: string): Tone {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function spellTier(level: string): string {
  const l = String(level || "").trim().toLowerCase();
  if (l.includes("hex")) return "Hex";
  if (l.includes("legendary")) return "Legendary";
  if (l.includes("advanced")) return "Advanced";
  if (l.includes("standard")) return "Standard";
  if (l.includes("basic")) return "Basic";
  return titleCase(level);
}
function spellAp(level: string): number {
  const l = String(level || "").trim().toLowerCase();
  if (l.includes("hex")) {
    const m = /(\d+)\s*ap/.exec(l) || /\(\s*(\d+)/.exec(l);
    return m ? parseInt(m[1], 10) : 0;
  }
  if (l.includes("legendary")) return 4;
  if (l.includes("advanced")) return 3;
  if (l.includes("standard")) return 2;
  if (l.includes("basic")) return 1;
  return 0;
}

/* ----------------------- per-category transforms ---------------------- */
function spell(row: Row): CompendiumEntry {
  const info = subjInfo(row.SUBJECT);
  const subject = titleCase(row.SUBJECT);
  const stat = titleCase(row.STAT) || info.stat || "";
  const ritual = yes(row.RITUAL);
  const dc = num(row.DC);
  const meta = [subject];
  if (stat) meta.push("Base " + stat);
  if (ritual) meta.push("Ritual");
  return {
    id: rid(row, "spell"), cat: "spell", name: (row.NAME || "").trim(),
    tone: info.tone || "plum", level: spellTier(row.LEVEL), meta, cost: "",
    subjectKey: info.key || slug(row.SUBJECT), subject,
    school: info.school || "", stat, ap: spellAp(row.LEVEL),
    dc: dc ?? undefined, ritual, volatile: yes(row.VOLATILE),
    desc: (row.DESCRIPTION || "").trim(),
    higherLevel: (row["HIGHER-LEVEL BEHAVIOR"] || "").trim(),
  };
}
function potion(row: Row): CompendiumEntry {
  const cost = num(row.COST), intensity = num(row.INTENSITY), twisted = yes(row.TWISTED);
  return {
    id: rid(row, "potion"), cat: "potion", name: (row.NAME || "").trim(),
    tone: twisted ? "plum" : "teal", level: twisted ? "Twisted" : "Brewable",
    meta: intensity != null ? ["Intensity " + intensity] : [],
    cost: cost != null ? cost + " mat." : "",
    intensity: intensity != null ? intensity : 1,
    desc: (row.DESCRIPTION || "").trim(),
  };
}
function glyph(row: Row): CompendiumEntry {
  const value = num(row.COST), intensity = num(row.INTENSITY);
  return {
    id: rid(row, "glyph"), cat: "glyph", name: (row.NAME || "").trim(),
    tone: toneFromName(row.NAME), level: "Glyph",
    meta: [value != null ? "Cost " + value : null, intensity != null ? "Intensity " + intensity : null].filter(Boolean) as string[],
    cost: value != null ? value + " mat." : "",
    value: value != null ? value : 0, intensity: intensity != null ? intensity : 1,
    desc: (row.DESCRIPTION || "").trim(),
  };
}
function wand(row: Row): CompendiumEntry {
  const mat = num(row.COST), desc = (row.DESCRIPTION || "").trim();
  const bm = /([+-]\d+)\s+([A-Za-z][A-Za-z]+)/.exec(desc);
  const bonusLabel = bm ? bm[1] + " " + titleCase(bm[2]) : "";
  const meta: string[] = [];
  if (bonusLabel) meta.push(bonusLabel);
  meta.push("Equippable");
  return {
    id: rid(row, "wand"), cat: "wand", name: (row.NAME || "").trim(),
    tone: yes(row.TWISTED) ? "plum" : toneFromName(row.NAME), level: "Wand",
    meta, cost: "", mat: mat != null ? mat : 400,
    bonusLabel, condition: "", desc,
  };
}
function artifact(row: Row): CompendiumEntry {
  const info = subjInfo(row.SUBJECT);
  const subject = titleCase(row.SUBJECT);
  const mat = num(row.COST), intensity = num(row.INTENSITY);
  const meta: string[] = [];
  if (subject) meta.push(subject);
  if (intensity != null) meta.push("Intensity " + intensity);
  return {
    id: rid(row, "artifact"), cat: "artifact", name: (row.NAME || "").trim(),
    tone: info.tone || toneFromName(row.NAME), level: titleCase(row.LEVEL),
    meta, cost: "", mat: mat != null ? mat : 0,
    subject, intensity: intensity != null ? intensity : 3,
    desc: (row.DESCRIPTION || "").trim(),
  };
}
function plant(row: Row): CompendiumEntry {
  const value = num(row.VALUE), intensity = num(row.INTENSITY);
  return {
    id: rid(row, "plant"), cat: "plant", name: (row.NAME || "").trim(),
    tone: toneFromName(row.NAME), level: "Plant",
    meta: [value != null ? "Value " + value : null, intensity != null ? "Intensity " + intensity : null].filter(Boolean) as string[],
    cost: null, value: value != null ? value : 0, intensity: intensity != null ? intensity : 1,
    removeOnUse: yes(row["SINGLE-USE"]),
    requiresRoll: (row["REQUIRES ROLL"] || "YES").trim(),
    desc: (row.DESCRIPTION || "").trim(),
    ability: (row.ABILITY || "").trim(),
  };
}
function item(row: Row): CompendiumEntry {
  const cost = num(row.COST), single = yes(row["SINGLE-USE"]);
  const checkRaw = (row.CHECK || "").trim();
  const check = !checkRaw || checkRaw.toUpperCase() === "NONE" ? null : checkRaw;
  const tags = (row.TAGS || "").split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  const meta: string[] = [];
  if (cost != null) meta.push(cost + " mat.");
  meta.push(single ? "Single-use" : "Reusable");
  if (check) meta.push(check);
  return {
    id: rid(row, "item"), cat: "item", name: (row.NAME || "").trim(),
    tone: toneFromName(row.NAME), level: "Item",
    meta, cost: cost != null ? cost : null, singleUse: single,
    check, tags, desc: (row.DESCRIPTION || "").trim(),
  };
}

/* ------------------------------- loader ------------------------------- */
function fetchCsv(gid: string): Promise<string> {
  return fetch(csvUrl(gid), { credentials: "omit" }).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  });
}

const CATS: Array<[string, string, (row: Row) => CompendiumEntry]> = [
  ["spell", GID.spell, spell],
  ["potion", GID.potion, potion],
  ["glyph", GID.glyph, glyph],
  ["wand", GID.wand, wand],
  ["artifact", GID.artifact, artifact],
  ["plant", GID.plant, plant],
  ["item", GID.item, item],
];

export interface CompendiumData {
  compendium: CompendiumEntry[];
  classes: ClassDef[];
  /** True when at least one live tab loaded; false = pure seed fallback. */
  live: boolean;
}

/** The seed snapshot, used as the initial value and the offline fallback. */
export const SEED_COMPENDIUM: CompendiumData = {
  compendium: SEED.compendium,
  classes: buildClasses(CLASSES_DB),
  live: false,
};

async function loadCompendiumOnly(): Promise<{ compendium: CompendiumEntry[]; live: boolean }> {
  const seed = SEED.compendium.slice();
  const results = await Promise.all(
    CATS.map(async ([cat, gid, transform]) => {
      try {
        const text = await fetchCsv(gid);
        return { cat, list: parseRows(text).map(transform).filter((e) => e && e.name) };
      } catch {
        return { cat, list: null as CompendiumEntry[] | null };
      }
    })
  );
  let all: CompendiumEntry[] = [];
  let anyLive = false;
  results.forEach((res) => {
    if (res.list && res.list.length) {
      all = all.concat(res.list);
      anyLive = true;
    } else {
      all = all.concat(seed.filter((e) => e.cat === res.cat));
    }
  });
  // Keep seed categories the DB doesn't supply (e.g. "move").
  const covered: Record<string, boolean> = {};
  CATS.forEach(([cat]) => {
    covered[cat] = true;
  });
  seed.forEach((e) => {
    if (!covered[e.cat]) all.push(e);
  });
  return { compendium: anyLive ? all : seed, live: anyLive };
}

async function loadClassesOnly(): Promise<ClassDef[]> {
  try {
    const text = await fetchCsv(GID.classes);
    if (!text) return SEED_COMPENDIUM.classes;
    const built = buildClasses({ ...CLASSES_DB, sourceUrl: csvUrl(GID.classes), csv: text });
    return built && built.length ? built : SEED_COMPENDIUM.classes;
  } catch {
    return SEED_COMPENDIUM.classes; // keep the baked snapshot
  }
}

/** Fetch the live compendium + classes, falling back to seed per-tab. */
export async function loadCompendiumData(): Promise<CompendiumData> {
  const [comp, classes] = await Promise.all([
    loadCompendiumOnly().catch(() => ({ compendium: SEED.compendium, live: false })),
    loadClassesOnly().catch(() => SEED_COMPENDIUM.classes),
  ]);
  return { compendium: comp.compendium, classes, live: comp.live };
}

export interface UseCompendium extends CompendiumData {
  /** False until the first load attempt resolves. */
  ready: boolean;
}

/** Load the live compendium once on mount; seed data until it resolves. */
export function useCompendium(): UseCompendium {
  const [data, setData] = React.useState<CompendiumData>(SEED_COMPENDIUM);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    loadCompendiumData()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { ...data, ready };
}

export const COMPENDIUM_META = { sheetId: SHEET_ID, gids: GID, csvUrl };
