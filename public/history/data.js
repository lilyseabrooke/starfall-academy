/* ===========================================================================
   Starfall Academy — Chronicle (campaign history): dataset
   Campaigns are loaded live from the same Google Sheet the Compendium and the
   Family Ledger read, from the Campaigns tab (gid 1939873344).

   Campaigns columns: NAME, BEGINNING, END, LOCATION, PLAYERS, DESCRIPTION

   BEGINNING / END are a semester *and* a year ("Fall 2011", "Spring 2012"), so
   they're parsed into a fractional year position — Fall 2011 sits at 2011.5 and
   Spring 2012 at 2012.0 — which is what puts them in the right order on the
   timeline. A bare year with no semester still works: it spans the whole year.

   PLAYERS holds both halves of the cast in a single field, as a semicolon-
   separated list of "Player, as Character" pairs. A player who ran two
   characters in one campaign appears twice in the sheet; here they're folded
   back into one player carrying both characters, so nobody is listed twice.
   =========================================================================== */
(function () {
  const SHEET_ID = "12pocjObSluK--b8ZdFnBljn01QVUbZsoSHF3KlnDb7I";
  const CAMPAIGNS_URL =
    "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv&gid=1939873344";

  // ---- CSV parser (RFC 4180) -----------------------------------------------
  function parseCSV(text) {
    const rows = [];
    let field = "", row = [], inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuote) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuote = false;
        } else {
          field += c;
        }
      } else {
        if (c === '"') { inQuote = true; }
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); rows.push(row); field = ""; row = []; }
        else { field += c; }
      }
    }
    if (row.length || field) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1)
      .filter(function (r) { return r.some(function (c) { return c.trim(); }); })
      .map(function (cols) {
        const obj = {};
        headers.forEach(function (h, i) { obj[h] = (cols[i] || "").trim(); });
        return obj;
      });
  }

  // Header names are read case-insensitively so a later tidy-up of the sheet
  // (NAME → Name) doesn't quietly empty the page.
  function cell(row, key) {
    const lk = key.toLowerCase();
    const k = Object.keys(row).find(function (h) { return h.toLowerCase() === lk; });
    const v = k ? row[k] : undefined;
    return (v === undefined || v === "") ? null : v;
  }

  // ---- semesters -----------------------------------------------------------
  // `start` is where the term opens within its year and `span` how much of the
  // year it occupies, both as a fraction. Two teaching semesters split the year
  // in half; the breaks are short and sit at the tail of the term they follow.
  const SEMESTERS = {
    spring: { name: "Spring", start: 0.00, span: 0.50 },
    summer: { name: "Summer", start: 0.40, span: 0.10 },
    fall:   { name: "Fall",   start: 0.50, span: 0.50 },
    autumn: { name: "Autumn", start: 0.50, span: 0.50 },
    winter: { name: "Winter", start: 0.90, span: 0.10 }
  };

  function parseTerm(s) {
    if (!s) return null;
    const yearM = String(s).match(/(\d{3,4})/);
    if (!yearM) return null;
    const year = parseInt(yearM[1], 10);
    const semM = String(s).toLowerCase().match(/spring|summer|fall|autumn|winter/);
    const sem = semM ? SEMESTERS[semM[0]] : null;
    return {
      label: sem ? sem.name + " " + year : String(year),
      semester: sem ? sem.name : null,
      year: year,
      pos: year + (sem ? sem.start : 0),
      span: sem ? sem.span : 1
    };
  }

  // ---- players & characters ------------------------------------------------
  // "Jacqueline, as Astra Baron-Cantor-Onomy; Z, as Lexi; Z, as Luca Heron"
  //   → players:  Jacqueline [Astra…], Z [Lexi, Luca Heron]   (Z listed once)
  //   → cast:     one row per character, each pointing back at its player
  function parsePlayers(s) {
    const entries = (s || "").split(";").map(function (x) { return x.trim(); }).filter(Boolean);
    const players = [], byKey = {}, cast = [];
    entries.forEach(function (entry) {
      const m = entry.match(/^(.*?)\s*,\s*as\s+(.+)$/i) || entry.match(/^(.*?)\s+as\s+(.+)$/i);
      const playerName = (m ? m[1] : entry).trim();
      const character = m ? m[2].trim() : null;
      if (!playerName) return;
      const key = playerName.toLowerCase();
      let p = byKey[key];
      if (!p) { p = byKey[key] = { key: key, name: playerName, characters: [] }; players.push(p); }
      if (character && p.characters.indexOf(character) === -1) p.characters.push(character);
      if (character) cast.push({ playerKey: key, player: p.name, character: character });
    });
    return { players: players, cast: cast };
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function rowToCampaign(row, i) {
    const name = cell(row, "NAME");
    if (!name) return null;
    const beginning = parseTerm(cell(row, "BEGINNING"));
    const end = parseTerm(cell(row, "END"));
    const roster = parsePlayers(cell(row, "PLAYERS"));
    return {
      id: slug(name) || "campaign-" + i,
      row: i,
      name: name,
      beginning: beginning,
      end: end,
      location: cell(row, "LOCATION"),
      description: cell(row, "DESCRIPTION"),
      players: roster.players,
      cast: roster.cast
    };
  }

  // ---- fetch & expose -------------------------------------------------------
  window.SFC_DATA_READY = fetch(CAMPAIGNS_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("Campaigns sheet fetch failed (" + r.status + ")");
      return r.text();
    })
    .then(function (text) {
      const CAMPAIGNS = parseCSV(text)
        .map(rowToCampaign)
        .filter(function (c) { return !!c; });
      window.SFC_DATA = { CAMPAIGNS: CAMPAIGNS };
    });

  window.SFC_PARSE = { parseCSV: parseCSV, parseTerm: parseTerm, parsePlayers: parsePlayers, SEMESTERS: SEMESTERS };
})();
