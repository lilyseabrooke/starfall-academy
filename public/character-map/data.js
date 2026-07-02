/* ===========================================================================
   Starfall Family Tree — dataset
   Both characters and families are loaded live from Google Sheets (CSV export).

   Characters sheet columns: ID, Name, Prefix, Pronouns, Title, Family, Birth,
   Death, Portrait, Bio, Parents, Partners, Academy, Magic, Region, Creature Type
   Multi-value fields (Parents, Partners, Magic) use semicolon separators.
   Partners format: "id (type)" e.g. "emily-argon (marriage)".

   Families sheet columns: id, name, color, known for, bio
   All fields except id are optional — missing fields are left null.
   Families referenced by characters but absent from the Families sheet are
   silently hidden (they won't appear in the legend or filter).
   =========================================================================== */
(function () {
  const SHEET_ID = "12pocjObSluK--b8ZdFnBljn01QVUbZsoSHF3KlnDb7I";
  const CSV_URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv";
  const FAMILIES_URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/export?format=csv&gid=899700562";

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

  // ---- field helpers -------------------------------------------------------
  function cell(obj, key) {
    const v = obj[key];
    return (v === undefined || v === "") ? null : v;
  }

  function parseList(s) {
    return s ? s.split(";").map(function (x) { return x.trim(); }).filter(Boolean) : [];
  }

  function parseBirth(s) {
    if (!s) return null;
    if (s.toLowerCase() === "unknown") return "unknown";
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }

  function parseDeath(s) {
    if (!s) return null;
    if (s === "Unknown") return "Unknown";
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }

  function parsePartners(s) {
    if (!s) return null;
    if (s === "Unknown") return "Unknown";
    const parts = parseList(s);
    if (!parts.length) return null;
    return parts.map(function (entry) {
      const m = entry.match(/^(.+?)\s*\((.+?)\)$/);
      return m ? { id: m[1].trim(), type: m[2].trim() } : { id: entry.trim(), type: "marriage" };
    });
  }

  function parseMagic(s) {
    if (!s) return null;
    const parts = parseList(s);
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : parts;
  }

  function parseParents(s) {
    if (!s) return null;
    const parts = parseList(s);
    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : parts;
  }

  function rowToFamily(row) {
    const find = function (key) {
      const lk = key.toLowerCase();
      const k = Object.keys(row).find(function (k) { return k.toLowerCase() === lk; });
      return k ? cell(row, k) : null;
    };
    return {
      id:       find("id"),
      name:     find("name"),
      color:    find("color"),
      knownFor: find("known for"),
      bio:      find("bio")
    };
  }

  function rowToCharacter(row) {
    return {
      id:            cell(row, "ID"),
      name:          cell(row, "Name"),
      prefix:        cell(row, "Prefix"),
      pronouns:      cell(row, "Pronouns"),
      title:         cell(row, "Title"),
      family:        cell(row, "Family"),
      birth:         parseBirth(cell(row, "Birth")),
      death:         parseDeath(cell(row, "Death")),
      portrait:      cell(row, "Portrait"),
      bio:           cell(row, "Bio"),
      parents:       parseParents(cell(row, "Parents")),
      partners:      parsePartners(cell(row, "Partners")),
      academy:       cell(row, "Academy"),
      magic:         parseMagic(cell(row, "Magic")),
      region:        cell(row, "Region"),
      creature_type: cell(row, "Creature Type") || "human"
    };
  }

  // ---- fetch & expose -------------------------------------------------------
  window.SFT_DATA_READY = Promise.all([
    fetch(CSV_URL).then(function (r) {
      if (!r.ok) throw new Error("Characters sheet fetch failed (" + r.status + ")");
      return r.text();
    }),
    fetch(FAMILIES_URL).then(function (r) {
      if (!r.ok) throw new Error("Families sheet fetch failed (" + r.status + ")");
      return r.text();
    })
  ]).then(function (results) {
    const CHARACTERS = parseCSV(results[0]).map(rowToCharacter).filter(function (c) { return !!c.id; });
    const FAMILIES = parseCSV(results[1]).map(rowToFamily).filter(function (f) { return !!f.id; });
    window.SFT_DATA = { FAMILIES, CHARACTERS };
  });
})();
