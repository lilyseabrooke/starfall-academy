/* ===========================================================================
   Starfall Academy — Classes (assembled from the database)
   ---------------------------------------------------------------------------
   THE 12 CLASSES. Each ranks I → X. Every rank offers TWO options; the player
   chooses one on ranking up (and may re-choose later — choices are editable).

   This file no longer hard-codes the class content. It reads the database
   snapshot in classes-db.js (window.SF_CLASSES_DB), parses the CSV, and builds
   the class objects the Classes wing renders. The presentation fields the
   database does not yet carry (tone / icon / tagline) are merged in from
   SF_CLASSES_DB.meta. To go live, point the DB file at the Sheet (see its
   header) — nothing here changes.

   ── Output shape (unchanged, plus per-option move specs) ────────────────────
       { id, name, tone, icon, tagline, paths:[p1,p2], dbId,
         ranks: [ { options: [ {title, desc, tag, move?}, {…} ] }, … ×10 ] }
     A rank option carries a parsed `move` spec whenever its TAG is a move(…):
       move: { abilities:[…], addRank, rankConditional, dc, backfire }

   ── Rank-point economy (mirrors the Roll20 sheet workers) ──────────────────
     · Purchasing a class (rank 0 → I) costs 5 RP.
     · Each rank after that costs RP equal to the rank being bought.
   =========================================================================== */
(function () {
  /* ----------------------------- CSV parser ----------------------------- */
  // RFC-4180-ish: handles quoted fields, embedded commas/newlines, "" escapes.
  function parseCSV(text) {
    const rows = []; let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* --------------------------- move() tag parser ------------------------ */
  // Grammar (after CSV un-escaping):
  //   move("ability"[, "ability"]* [, +rank | +rankConditional:"text"]
  //                                 [, DC=NN] [, backfire] …)
  // Argument order is not fixed, so we tokenise and classify each token.
  // Returns null when the tag is not a move().
  function parseMoveTag(raw) {
    const s = String(raw || "").trim();
    if (!/^move\s*\(/i.test(s)) return null;
    // Inner text between the outermost parens.
    const open = s.indexOf("(");
    const close = s.lastIndexOf(")");
    if (open < 0 || close < 0) return null;
    const inner = s.slice(open + 1, close);

    // Split on commas that are NOT inside double quotes.
    const tokens = []; let buf = "", q = false;
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (c === '"') { q = !q; buf += c; }
      else if (c === "," && !q) { tokens.push(buf.trim()); buf = ""; }
      else buf += c;
    }
    if (buf.trim()) tokens.push(buf.trim());

    const spec = { abilities: [], addRank: false, rankConditional: null, dc: null, backfire: false };
    for (const tk of tokens) {
      if (!tk) continue;
      let m;
      if ((m = /^\+rankConditional\s*:\s*"([\s\S]*)"$/i.exec(tk))) { spec.rankConditional = m[1]; }
      else if (/^\+rank$/i.test(tk)) { spec.addRank = true; }
      else if ((m = /^DC\s*=\s*(\d+)$/i.exec(tk))) { spec.dc = parseInt(m[1], 10); }
      else if (/^backfire$/i.test(tk)) { spec.backfire = true; }
      else if ((m = /^"([\s\S]*)"$/.exec(tk))) { spec.abilities.push(m[1].trim()); }
      // Unrecognised tokens are ignored (forward-compatible with new args).
    }
    return spec;
  }

  /* ----------------------- Build classes from the DB -------------------- */
  const slug = (name) => String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function buildClasses(db) {
    const rows = parseCSV(db.csv).filter((r) => r.length > 1 && (r[0] || "").trim());
    const header = rows.shift(); // discard header row
    const meta = db.meta || {};

    // ── Column layout (v2, with COLOR / ICON / DESCRIPTION) ──────────────────
    // [0] NAME  [1] COLOR  [2] ICON  [3] DESCRIPTION  [4] PATH 1  [5] PATH 2
    // [6..65]   RANK r-o NAME, RANK r-o DESCRIPTION, RANK r-o TAG  (×20 options)
    // [66]      ID

    return rows.map((r) => {
      const name        = (r[0] || "").trim();
      const id          = slug(name);
      const m           = meta[id] || {};
      // Fields now live in the database:
      const tone        = (r[1] || "").trim() || "gold";
      const icon        = (r[2] || "").trim() || "graduation-cap";
      const description = (r[3] || "").trim();
      const paths       = [(r[4] || "").trim(), (r[5] || "").trim()];
      const dbId        = (r[r.length - 1] || "").trim();

      // 10 ranks × 2 options. Columns from index 6: [name, desc, tag] × 20.
      const ranks = [];
      for (let L = 1; L <= 10; L++) {
        const opts = [0, 1].map((side) => {
          const k    = (L - 1) * 2 + side;   // 0..19 option index
          const base = 6 + k * 3;            // first of this option's 3 cols
          const title = (r[base]     || "").trim();
          const desc  = (r[base + 1] || "").trim();
          const tag   = (r[base + 2] || "").trim();
          const move  = parseMoveTag(tag);
          return move ? { title, desc, tag, move } : { title, desc, tag };
        });
        ranks.push({ options: opts });
      }

      // Title-case the display name (DB stores it ALL CAPS).
      const display = name.charAt(0) + name.slice(1).toLowerCase();
      return {
        id, dbId, name: display, paths,
        tone,                       // from DB
        icon,                       // from DB
        description,                // from DB
        tagline: m.tagline || "",   // still baked-in (DB field pending)
        ranks,
      };
    });
  }

  const classes = buildClasses(window.SF_CLASSES_DB);

  window.SF_CLASSES = {
    classes,
    // Parsers exposed so other modules / a live loader can reuse them.
    parseCSV, parseMoveTag, buildClasses,

    // Cost in RP to acquire `targetRank` (1 = purchase the class).
    cost: (targetRank) => (targetRank <= 1 ? 5 : targetRank),

    // Starting class state — Pupil III + Socialite I (matches the Roll20 sheet).
    // choices: { rankLevel: optionIndex }  (0 = left option, 1 = right option)
    start: {
      pupil: { rank: 3, choices: { 1: 0, 2: 1, 3: 0 } },
      socialite: { rank: 1, choices: { 1: 0 } },
    },

    startingRp: 12,
  };
})();
