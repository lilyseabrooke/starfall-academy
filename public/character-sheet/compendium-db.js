/* ===========================================================================
   Starfall Academy — live Compendium loader
   ---------------------------------------------------------------------------
   The Compendium (and the Classes wing) used to render off the baked seed
   arrays in data.js / classes-db.js. This module points them at the live
   Google-Sheets database instead, so the drawer, the character creator, and
   the Classes list all read the same source of truth the GM edits.

   ── How it works ────────────────────────────────────────────────────────────
   Each tab of the workbook is fetched as CSV through the workbook's
   "Publish to web" endpoint (/d/e/<pub-id>/pub?…&output=csv). That snapshot is
   world-readable and CORS-friendly independent of the document's own share
   setting, so there is no "anyone with the link" dependency (it's the same
   endpoint the standalone starfall-compendium reader uses). Each CSV is parsed
   by header name and shaped into the compendium-entry / class-row forms the
   rest of the sheet already consumes. Nothing downstream changes: we mutate
   `SF_DATA.compendium` in place and rebuild `SF_CLASSES.classes` via the parser
   classes.js exposes.

   The boot is gated on `SF_COMPENDIUM_DB.ready` (see app.jsx's mount tail), so
   the sheet renders from live data on first paint. If a tab can't be reached,
   that single category quietly falls back to its seed rows — the sheet still
   works offline / standalone.

   ── Workbook ────────────────────────────────────────────────────────────────
   https://docs.google.com/spreadsheets/d/1DUyigWDvmE2DnQ7eJucjP6BqthEMVf61rAGrF8f-N2M
   =========================================================================== */
(function () {
  "use strict";

  // The live edit document (for reference) and its "Publish to web" id. The
  // pub id is per-document and stable; it is what makes the snapshot readable
  // without link-sharing the doc itself.
  var SHEET_ID = "1DUyigWDvmE2DnQ7eJucjP6BqthEMVf61rAGrF8f-N2M";
  var PUB_ID   = "2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd";

  // Tab → GID (the default tab, gid 0, is Spells).
  var GID = {
    spell:    "0",
    potion:   "646516393",
    glyph:    "1319626806",
    wand:     "1233793945",
    artifact: "697341861",
    plant:    "699108983",
    item:     "1377072119",
    classes:  "1631797228",
  };

  var csvUrl = function (gid) {
    return "https://docs.google.com/spreadsheets/d/e/" + PUB_ID +
           "/pub?gid=" + gid + "&single=true&output=csv";
  };

  var D = window.SF_DATA;

  /* ----------------------------- CSV parser ----------------------------- */
  // Reuse classes.js's parser when present; otherwise a local RFC-4180-ish one.
  var parseCSV = (window.SF_CLASSES && window.SF_CLASSES.parseCSV) || function (text) {
    var rows = [], row = [], field = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
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
  };

  // Parse into an array of header-keyed objects (header UPPERCASED + trimmed).
  function parseRows(text) {
    var rows = parseCSV(text).filter(function (r) { return r.length > 1 && (r[0] || "").trim(); });
    if (!rows.length) return [];
    var header = rows.shift().map(function (h) { return String(h || "").trim().toUpperCase(); });
    return rows.map(function (r) {
      var o = {};
      header.forEach(function (h, i) { if (h) o[h] = (r[i] == null ? "" : String(r[i])); });
      return o;
    });
  }

  /* ------------------------------- helpers ------------------------------ */
  function titleCase(s) {
    s = String(s || "").trim();
    if (!s) return "";
    return s.split(/\s+/).map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w;
    }).join(" ");
  }
  function num(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? null : n;
  }
  function slug(s) {
    return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function yes(v) { return String(v || "").trim().toUpperCase() === "YES"; }
  function rid(row, prefix) { var id = (row.ID || "").trim(); return id || (prefix + "-" + slug(row.NAME)); }

  // Subject → { key, school, stat, tone } from the in-app field map.
  var SUBJ = {};
  (D.magicSchools || []).forEach(function (sc) {
    (sc.subjects || []).forEach(function (su) {
      SUBJ[String(su.name).toUpperCase()] = { key: su.key, school: sc.id, stat: su.stat, tone: sc.tone };
    });
  });
  function subjInfo(name) { return SUBJ[String(name || "").trim().toUpperCase()] || {}; }

  // Stable decorative tone for entries with no field to key off of.
  var PALETTE = ["plum", "teal", "forest", "crimson", "gold"];
  function toneFromName(name) {
    var s = String(name || ""), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  // Canonical spell tier (badge / filter value) from the raw LEVEL string.
  // Hex rows carry the AP in the tag, e.g. "HEX (4AP)" — strip it for the tier.
  function spellTier(level) {
    var l = String(level || "").trim().toLowerCase();
    if (l.indexOf("hex") !== -1)       return "Hex";
    if (l.indexOf("legendary") !== -1) return "Legendary";
    if (l.indexOf("advanced") !== -1)  return "Advanced";
    if (l.indexOf("standard") !== -1)  return "Standard";
    if (l.indexOf("basic") !== -1)     return "Basic";
    return titleCase(level);
  }
  // AP from spell level: Basic 1, Standard 2, Advanced 3, Legendary 4. Hex AP is
  // read out of its level tag (e.g. "(4AP)"), falling back to 0 for variable.
  function spellAp(level) {
    var l = String(level || "").trim().toLowerCase();
    if (l.indexOf("hex") !== -1) {
      var m = /(\d+)\s*ap/.exec(l) || /\(\s*(\d+)/.exec(l);
      return m ? parseInt(m[1], 10) : 0;
    }
    if (l.indexOf("legendary") !== -1) return 4;
    if (l.indexOf("advanced") !== -1)  return 3;
    if (l.indexOf("standard") !== -1)  return 2;
    if (l.indexOf("basic") !== -1)     return 1;
    return 0;
  }

  /* ----------------------- per-category transforms ---------------------- */
  // Columns: NAME, LEVEL, DC, SUBJECT, STAT, RITUAL, VOLATILE, DESCRIPTION,
  //          HIGHER-LEVEL BEHAVIOR, ID
  function spell(row) {
    var info = subjInfo(row.SUBJECT);
    var subject = titleCase(row.SUBJECT);
    var stat = titleCase(row.STAT) || info.stat || "";
    var ritual = yes(row.RITUAL);
    var dc = num(row.DC);
    var meta = [subject];
    if (stat) meta.push("Base " + stat);
    if (ritual) meta.push("Ritual");
    return {
      id: rid(row, "spell"), cat: "spell", name: (row.NAME || "").trim(),
      tone: info.tone || "plum", level: spellTier(row.LEVEL), meta: meta, cost: "",
      subjectKey: info.key || slug(row.SUBJECT), subject: subject,
      school: info.school || "", stat: stat, ap: spellAp(row.LEVEL),
      dc: dc, ritual: ritual, volatile: yes(row.VOLATILE),
      desc: (row.DESCRIPTION || "").trim(),
      higherLevel: (row["HIGHER-LEVEL BEHAVIOR"] || "").trim(),
    };
  }

  // Columns: NAME, COST, INTENSITY, TWISTED, DESCRIPTION, ID
  function potion(row) {
    var cost = num(row.COST), intensity = num(row.INTENSITY), twisted = yes(row.TWISTED);
    return {
      id: rid(row, "potion"), cat: "potion", name: (row.NAME || "").trim(),
      tone: twisted ? "plum" : "teal", level: twisted ? "Twisted" : "Brewable",
      meta: intensity != null ? ["Intensity " + intensity] : [],
      cost: cost != null ? cost + " mat." : "",
      intensity: intensity != null ? intensity : 1,
      desc: (row.DESCRIPTION || "").trim(),
    };
  }

  // Columns: NAME, COST, INTENSITY, DESCRIPTION, ID
  function glyph(row) {
    var value = num(row.COST), intensity = num(row.INTENSITY);
    return {
      id: rid(row, "glyph"), cat: "glyph", name: (row.NAME || "").trim(),
      tone: toneFromName(row.NAME), level: "Glyph",
      meta: [value != null ? "Cost " + value : null, intensity != null ? "Intensity " + intensity : null].filter(Boolean),
      cost: value != null ? value + " mat." : "",
      value: value != null ? value : 0, intensity: intensity != null ? intensity : 1,
      desc: (row.DESCRIPTION || "").trim(),
    };
  }

  // Columns: NAME, COST, TWISTED, DESCRIPTION, ID
  function wand(row) {
    var mat = num(row.COST), desc = (row.DESCRIPTION || "").trim();
    // Best-effort: pull a leading "+N <field>" out of the prose, if present.
    var bm = /([+-]\d+)\s+([A-Za-z][A-Za-z]+)/.exec(desc);
    var bonusLabel = bm ? (bm[1] + " " + titleCase(bm[2])) : "";
    var meta = [];
    if (bonusLabel) meta.push(bonusLabel);
    meta.push("Equippable");
    return {
      id: rid(row, "wand"), cat: "wand", name: (row.NAME || "").trim(),
      tone: yes(row.TWISTED) ? "plum" : toneFromName(row.NAME), level: "Wand",
      meta: meta, cost: "", mat: mat != null ? mat : 400,
      bonusLabel: bonusLabel, condition: "", desc: desc,
    };
  }

  // Columns: NAME, LEVEL, SUBJECT, COST, INTENSITY, SKILL, DC, DESCRIPTION, ID
  function artifact(row) {
    var info = subjInfo(row.SUBJECT);
    var subject = titleCase(row.SUBJECT);
    var mat = num(row.COST), intensity = num(row.INTENSITY);
    var meta = [];
    if (subject) meta.push(subject);
    if (intensity != null) meta.push("Intensity " + intensity);
    return {
      id: rid(row, "artifact"), cat: "artifact", name: (row.NAME || "").trim(),
      tone: info.tone || toneFromName(row.NAME), level: titleCase(row.LEVEL),
      meta: meta, cost: "", mat: mat != null ? mat : 0,
      subject: subject, intensity: intensity != null ? intensity : 3,
      desc: (row.DESCRIPTION || "").trim(),
    };
  }

  // Columns: NAME, VALUE, INTENSITY, SINGLE-USE, REQUIRES ROLL, DESCRIPTION,
  //          ABILITY, ID
  function plant(row) {
    var value = num(row.VALUE), intensity = num(row.INTENSITY);
    return {
      id: rid(row, "plant"), cat: "plant", name: (row.NAME || "").trim(),
      tone: toneFromName(row.NAME), level: "Plant",
      meta: [value != null ? "Value " + value : null, intensity != null ? "Intensity " + intensity : null].filter(Boolean),
      cost: null, value: value != null ? value : 0, intensity: intensity != null ? intensity : 1,
      removeOnUse: yes(row["SINGLE-USE"]),
      requiresRoll: (row["REQUIRES ROLL"] || "YES").trim(),
      desc: (row.DESCRIPTION || "").trim(),
      ability: (row.ABILITY || "").trim(),
    };
  }

  // Columns: NAME, COST, SINGLE-USE, CHECK, TAGS, DESCRIPTION, ID
  function item(row) {
    var cost = num(row.COST), single = yes(row["SINGLE-USE"]);
    var checkRaw = (row.CHECK || "").trim();
    var check = (!checkRaw || checkRaw.toUpperCase() === "NONE") ? null : checkRaw;
    var tags = (row.TAGS || "").split(/[,;]/).map(function (t) { return t.trim(); }).filter(Boolean);
    var meta = [];
    if (cost != null) meta.push(cost + " mat.");
    meta.push(single ? "Single-use" : "Reusable");
    if (check) meta.push(check);
    return {
      id: rid(row, "item"), cat: "item", name: (row.NAME || "").trim(),
      tone: toneFromName(row.NAME), level: "Item",
      meta: meta, cost: cost != null ? cost : null, singleUse: single,
      check: check, tags: tags, desc: (row.DESCRIPTION || "").trim(),
    };
  }

  /* ------------------------------- loader ------------------------------- */
  function fetchCsv(gid) {
    return fetch(csvUrl(gid), { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  var CATS = [
    ["spell", GID.spell, spell],
    ["potion", GID.potion, potion],
    ["glyph", GID.glyph, glyph],
    ["wand", GID.wand, wand],
    ["artifact", GID.artifact, artifact],
    ["plant", GID.plant, plant],
    ["item", GID.item, item],
  ];

  var seed = (D.compendium || []).slice();

  function loadCompendium() {
    return Promise.all(CATS.map(function (c) {
      return fetchCsv(c[1]).then(
        function (text) {
          return { cat: c[0], list: parseRows(text).map(c[2]).filter(function (e) { return e && e.name; }) };
        },
        function () { return { cat: c[0], list: null }; }
      );
    })).then(function (results) {
      var all = [], anyLive = false;
      results.forEach(function (res) {
        if (res.list && res.list.length) { all = all.concat(res.list); anyLive = true; }
        else { all = all.concat(seed.filter(function (e) { return e.cat === res.cat; })); } // seed fallback for this tab
      });
      // Keep any seed categories the DB doesn't supply (e.g. "move").
      var covered = {};
      CATS.forEach(function (c) { covered[c[0]] = true; });
      seed.forEach(function (e) { if (!covered[e.cat]) all.push(e); });
      if (anyLive) D.compendium = all;
    });
  }

  function loadClasses() {
    if (!(window.SF_CLASSES && window.SF_CLASSES.buildClasses && window.SF_CLASSES_DB)) return Promise.resolve();
    return fetchCsv(GID.classes).then(function (text) {
      if (!text) return;
      window.SF_CLASSES_DB.sourceUrl = csvUrl(GID.classes);
      window.SF_CLASSES_DB.csv = text;
      var built = window.SF_CLASSES.buildClasses(window.SF_CLASSES_DB);
      if (built && built.length) window.SF_CLASSES.classes = built;
    }, function () { /* keep the baked classes snapshot */ });
  }

  var ready = Promise.all([
    loadCompendium().catch(function () {}),
    loadClasses().catch(function () {}),
  ]).then(function () { return true; });

  window.SF_COMPENDIUM_DB = {
    sheetId: SHEET_ID,
    gids: GID,
    csvUrl: csvUrl,
    ready: ready,
  };
})();
