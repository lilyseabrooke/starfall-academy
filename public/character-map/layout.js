/* ===========================================================================
   Starfall Family Tree — layout engine v2  (pure, no React)
   Families are categories, NOT columns. Everyone shares one canvas:
     • Y  = a calendar timeline (earlier = higher); unknown births are estimated.
     • X  = derived from the relationship graph — connected webs are laid out
            tidily (couples adjacent, children centred under parents), packed
            left→right oldest-first, then relaxed to remove node overlaps.
   Families surface only as node colour + a filterable record.
   =========================================================================== */
(function () {
  const DEFAULTS = {
    pxPerYear: 13, colGap: 150,
    compGap: 150,           // gap between separate relationship webs
    topPad: 120, bottomPad: 120, sidePad: 90,
    presentYear: 2034
  };
  const MIN_DX = 132, MIN_DY = 64;   // overlap-relaxation thresholds (world px)

  // -- normalise messy authoring into clean arrays ------------------------
  function arr(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }

  function compute(data, cfg) {
    const C = Object.assign({}, DEFAULTS, cfg || {});
    const { FAMILIES, CHARACTERS } = data;

    const colorByFam = {};
    FAMILIES.forEach((f) => (colorByFam[f.id.toLowerCase()] = f.color));

    // ---- clone + normalise ------------------------------------------------
    const byId = {};
    CHARACTERS.forEach((c) => {
      const n = Object.assign({}, c);
      n.parents = arr(c.parents);
      n.partners = arr(c.partners).map((p) => (typeof p === "string" ? { id: p, type: "marriage" } : p))
        .filter((p) => p && p.id && p.id !== c.id);
      n._famKey = c.family || "_free";
      n._color = c.family && colorByFam[c.family.toLowerCase()] ? colorByFam[c.family.toLowerCase()] : "gold";
      n.birthKnown = typeof c.birth === "number";
      n._birthNum = n.birthKnown ? c.birth : null;
      byId[n.id] = n;
    });
    const ids = CHARACTERS.map((c) => c.id).filter((id) => byId[id]);
    const exists = (id) => !!byId[id];

    // ---- adjacency (only between existing nodes) --------------------------
    const childrenOf = {}, parentsOf = {}, partnersOf = {};
    ids.forEach((id) => { childrenOf[id] = []; parentsOf[id] = []; partnersOf[id] = []; });
    ids.forEach((id) => {
      byId[id].parents.forEach((p) => { if (exists(p)) { parentsOf[id].push(p); childrenOf[p].push(id); } });
    });
    const seenPair = new Set();
    ids.forEach((id) => byId[id].partners.forEach((p) => {
      if (!exists(p.id)) return;
      const key = [id, p.id].sort().join("|");
      if (seenPair.has(key)) return;
      seenPair.add(key);
      partnersOf[id].push(p.id); partnersOf[p.id].push(id);
    }));

    // ---- estimate unknown births -----------------------------------------
    const known = ids.filter((id) => byId[id].birthKnown).map((id) => byId[id]._birthNum);
    const median = known.length ? known.slice().sort((a, b) => a - b)[Math.floor(known.length / 2)] : C.presentYear - 40;
    for (let pass = 0; pass < 4; pass++) {
      ids.forEach((id) => {
        const n = byId[id];
        if (n._birthNum != null) return;
        const kidYears = childrenOf[id].map((c) => byId[c]._birthNum).filter((y) => y != null);
        const parYears = parentsOf[id].map((p) => byId[p]._birthNum).filter((y) => y != null);
        const partYears = partnersOf[id].map((p) => byId[p]._birthNum).filter((y) => y != null);
        if (kidYears.length) n._birthNum = Math.min(...kidYears) - 28;
        else if (partYears.length) n._birthNum = Math.round(partYears.reduce((a, b) => a + b, 0) / partYears.length);
        else if (parYears.length) n._birthNum = Math.max(...parYears) + 28;
      });
    }
    ids.forEach((id) => { if (byId[id]._birthNum == null) byId[id]._birthNum = median; });

    // ---- timeline ---------------------------------------------------------
    let minB = Infinity, maxY = C.presentYear;
    ids.forEach((id) => {
      const n = byId[id];
      if (n._birthNum < minB) minB = n._birthNum;
      if (typeof n.death === "number" && n.death > maxY) maxY = n.death;
    });
    const yearTop = Math.floor((minB - 8) / 10) * 10;
    const yearBot = Math.ceil((maxY + 4) / 10) * 10;
    const yearToY = (yr) => C.topPad + (yr - yearTop) * C.pxPerYear;

    // ---- connected components (partner + parent-child) --------------------
    const comp = {}; let nc = 0;
    function flood(start) {
      const stack = [start]; comp[start] = nc;
      while (stack.length) {
        const v = stack.pop();
        [].concat(parentsOf[v], childrenOf[v], partnersOf[v]).forEach((w) => {
          if (comp[w] === undefined) { comp[w] = nc; stack.push(w); }
        });
      }
    }
    ids.forEach((id) => { if (comp[id] === undefined) { flood(id); nc++; } });
    const comps = [];
    for (let i = 0; i < nc; i++) comps.push(ids.filter((id) => comp[id] === i));

    // ---- tidy sub-layout for one component → localX -----------------------
    function tidy(members) {
      const inC = new Set(members);
      const assigned = {}; const placing = new Set(); let leaf = 0;
      const pIn = (id) => partnersOf[id].filter((p) => inC.has(p));
      const cIn = (id) => childrenOf[id].filter((c) => inC.has(c));
      const parIn = (id) => parentsOf[id].filter((p) => inC.has(p));
      function place(id) {
        if (id in assigned) return assigned[id];
        if (placing.has(id)) return null;
        placing.add(id);
        const unit = [id];
        pIn(id).forEach((p) => { if (!(p in assigned) && !placing.has(p)) { unit.push(p); placing.add(p); } });
        const kids = []; const seen = new Set();
        unit.forEach((u) => cIn(u).forEach((c) => { if (!seen.has(c)) { seen.add(c); kids.push(c); } }));
        if (!kids.length) {
          const base = leaf; leaf += unit.length;
          unit.forEach((u, i) => (assigned[u] = base + i));
        } else {
          const xs = kids.map(place).filter((v) => v != null);
          if (xs.length) {
            const center = (Math.min(...xs) + Math.max(...xs)) / 2;
            const start = center - (unit.length - 1) / 2;
            unit.forEach((u, i) => { if (!(u in assigned)) assigned[u] = start + i; });
          } else {
            const base = leaf; leaf += unit.length;
            unit.forEach((u, i) => { if (!(u in assigned)) assigned[u] = base + i; });
          }
        }
        unit.forEach((u) => placing.delete(u));
        return assigned[id];
      }
      members.filter((id) => parIn(id).length === 0)
        .sort((a, b) => byId[a]._birthNum - byId[b]._birthNum)
        .forEach(place);
      members.forEach((id) => { if (!(id in assigned)) place(id); });
      const xs = members.map((id) => assigned[id]);
      const mn = Math.min(...xs);
      members.forEach((id) => (assigned[id] -= mn));
      return { x: assigned, span: Math.max(...xs) - mn };
    }

    // ---- pack components oldest-first ------------------------------------
    const compMeta = comps.map((members, i) => {
      const t = tidy(members);
      const minBirth = Math.min(...members.map((id) => byId[id]._birthNum));
      return { members, x: t.x, span: t.span, minBirth, i };
    }).sort((a, b) => a.minBirth - b.minBirth);

    let cursor = C.sidePad;
    compMeta.forEach((cm) => {
      cm.members.forEach((id) => {
        byId[id].x = cursor + cm.x[id] * C.colGap;
        byId[id].y = yearToY(byId[id]._birthNum);
      });
      cursor += (cm.span + 1) * C.colGap + C.compGap;
    });

    // ---- relax node overlaps (x only; timeline Y is sacred) ---------------
    const list = ids.map((id) => byId[id]);
    for (let t = 0; t < 60; t++) {
      let moved = false;
      for (let a = 0; a < list.length; a++) {
        for (let b = a + 1; b < list.length; b++) {
          const A = list[a], B = list[b];
          const dx = B.x - A.x, dy = B.y - A.y;
          if (Math.abs(dy) < MIN_DY && Math.abs(dx) < MIN_DX) {
            const push = (MIN_DX - Math.abs(dx)) / 2 + 0.5;
            const dir = dx === 0 ? (a % 2 ? 1 : -1) : Math.sign(dx);
            A.x -= dir * push; B.x += dir * push; moved = true;
          }
        }
      }
      if (!moved) break;
    }

    // ---- normalise bounds -------------------------------------------------
    const xsAll = list.map((n) => n.x);
    const minX = Math.min(...xsAll);
    list.forEach((n) => (n.x = n.x - minX + C.sidePad));
    const worldW = Math.max(...list.map((n) => n.x)) + C.sidePad;
    const worldH = yearToY(yearBot) + C.bottomPad;

    // ---- edges (from final coords) ---------------------------------------
    const marriages = [];
    const mSeen = new Set();
    ids.forEach((id) => partnersOf[id].forEach((pid) => {
      const key = [id, pid].sort().join("|");
      if (mSeen.has(key)) return; mSeen.add(key);
      const t = (byId[id].partners.find((p) => p.id === pid) || {}).type
        || (byId[pid].partners.find((p) => p.id === id) || {}).type || "marriage";
      marriages.push({ a: id, b: pid, type: t });
    }));

    const descents = [];
    ids.forEach((id) => {
      const ps = parentsOf[id];
      if (!ps.length) return;
      let ax, ay;
      if (ps.length >= 2) { const p0 = byId[ps[0]], p1 = byId[ps[1]]; ax = (p0.x + p1.x) / 2; ay = Math.max(p0.y, p1.y); }
      else { ax = byId[ps[0]].x; ay = byId[ps[0]].y; }
      descents.push({ childId: id, parents: ps, ax, ay });
    });

    const siblings = [];
    const sibSeen = new Set();
    ids.forEach((id) => {
      const ps = parentsOf[id];
      if (!ps.length) return;
      const sibs = ids.filter((o) => o !== id && parentsOf[o].some((p) => ps.includes(p)));
      sibs.forEach((s) => {
        const key = [id, s].sort().join("|");
        if (sibSeen.has(key)) return; sibSeen.add(key);
        siblings.push({ a: id, b: s });
      });
    });

    const neighbors = {};
    const link = (a, b) => { (neighbors[a] = neighbors[a] || new Set()).add(b); (neighbors[b] = neighbors[b] || new Set()).add(a); };
    marriages.forEach((m) => link(m.a, m.b));
    descents.forEach((d) => d.parents.forEach((p) => link(p, d.childId)));
    siblings.forEach((s) => link(s.a, s.b));

    // ---- families (categories) -------------------------------------------
    const families = FAMILIES.map((f) => {
      const fIdL = f.id.toLowerCase();
      const members = ids.filter((id) => byId[id].family && byId[id].family.toLowerCase() === fIdL).sort((a, b) => byId[a]._birthNum - byId[b]._birthNum);
      return Object.assign({}, f, { members, minBirth: members.length ? byId[members[0]]._birthNum : null });
    }).filter((f) => f.members.length);
    if (ids.some((id) => !byId[id].family)) {
      const members = ids.filter((id) => !byId[id].family).sort((a, b) => byId[a]._birthNum - byId[b]._birthNum);
      families.push({ id: "_free", name: "Unaffiliated", color: "gold",
        bio: "Figures who belong to no family line — by choice, by chance, or because no one ever wrote it down.",
        members, minBirth: byId[members[0]]._birthNum });
    }

    const ticks = [];
    for (let y = yearTop; y <= yearBot; y += 10) ticks.push({ year: y, y: yearToY(y) });

    return {
      nodes: byId, order: ids,
      families, marriages, descents, siblings, neighbors,
      ticks, yearTop, yearBot, yearToY,
      presentY: yearToY(C.presentYear), presentYear: C.presentYear,
      worldW, worldH, cfg: C
    };
  }

  // ---- relationship resolver (popover + modal) ---------------------------
  function buildRelations(L, id) {
    const N = L.nodes, me = N[id];
    if (!me) return null;
    const ref = (cid) => ({ id: cid, name: N[cid] ? N[cid].name : cid, missing: !N[cid] });
    const parents = (me.parents || []).filter((p) => N[p]).map(ref);
    const partners = (me.partners || []).filter((p) => N[p.id]).map((p) => Object.assign(ref(p.id), { type: p.type || "marriage" }));
    const children = L.order.filter((cid) => (N[cid].parents || []).includes(id)).map(ref);
    const myPar = new Set((me.parents || []).filter((p) => N[p]));
    const siblings = L.order.filter((cid) => cid !== id && (N[cid].parents || []).some((p) => myPar.has(p))).map(ref);
    return { parents, partners, children, siblings };
  }

  window.SFT_LAYOUT = { compute, DEFAULTS, buildRelations };
})();
