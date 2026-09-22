/* ===========================================================================
   Starfall Academy — Chronicle: timeline layout engine (pure, no React)

     • X  = a continuous calendar axis measured in fractional years, so a
            semester is half a year wide and "Fall 2011 → Spring 2012" reads as
            a bar two semesters long. Earlier is further left.
     • Y  = lane packing. Campaigns that run at the same time can't share a
            row, so each one takes the first lane whose last card it clears;
            lanes then alternate above and below the rail, which is what puts
            two campaigns from the same semester directly above/below each
            other on the same stretch of the timeline.
   =========================================================================== */
(function () {
  const DEFAULTS = {
    pxPerYear: 150,
    cardW: 268, cardH: 182,
    railGap: 40,      // rail → nearest card edge
    laneGap: 20,      // between two rings on the same side
    colGap: 26,       // horizontal breathing room between cards in a lane
    sidePad: 150, topPad: 44, bottomPad: 44,

    minBar: 30,       // shortest a campaign's rail bar is allowed to draw
    edgePad: 10       // keeps the first card inside the world's left edge
  };

  // Locations become the accent colour, the way families do on the Ledger.
  const TONES = ["gold", "plum", "teal", "forest", "crimson", "azure", "rust", "slate"];

  function compute(campaigns, cfg) {
    const C = Object.assign({}, DEFAULTS, cfg || {});

    // ---- resolve each campaign's span --------------------------------------
    const items = [];
    const undated = [];
    campaigns.forEach(function (c) {
      const s = c.beginning || c.end;
      const e = c.end || c.beginning;
      if (!s || !e) { undated.push(c); return; }
      // A sheet that lists the two ends the wrong way round still draws.
      const a = s.pos <= e.pos ? s : e;
      const b = s.pos <= e.pos ? e : s;
      items.push(Object.assign({}, c, {
        start: a, finish: b,
        startPos: a.pos, endPos: b.pos + b.span,
        termLabel: a.label === b.label ? a.label : a.label + " – " + b.label
      }));
    });

    if (!items.length) {
      return {
        items: [], undated: undated, players: [], locations: [], ticks: [],
        railY: C.topPad, worldW: C.sidePad * 2, worldH: C.topPad + C.bottomPad,
        minPos: 0, maxPos: 0, cfg: C
      };
    }

    const minPos = Math.min.apply(null, items.map(function (i) { return i.startPos; }));
    const maxPos = Math.max.apply(null, items.map(function (i) { return i.endPos; }));
    const xOf = function (pos) { return C.sidePad + (pos - minPos) * C.pxPerYear; };

    // ---- location tones ------------------------------------------------------
    const locations = [];
    items.forEach(function (i) {
      const key = (i.location || "").toLowerCase();
      if (!key) { i._tone = "gold"; return; }
      let l = locations.find(function (x) { return x.key === key; });
      if (!l) {
        l = { key: key, name: i.location, tone: TONES[locations.length % TONES.length], count: 0 };
        locations.push(l);
      }
      l.count++;
      i._tone = l.tone;
    });

    // ---- bars, then lanes ----------------------------------------------------
    items.forEach(function (i) {
      i.barStart = xOf(i.startPos);
      i.barEnd = Math.max(xOf(i.endPos), i.barStart + C.minBar);
      i.anchorX = (i.barStart + i.barEnd) / 2;
      // Centred over its own span, except at the very start of the timeline,
      // where a card wider than the lead-in would hang off the left edge.
      i.cardX = Math.max(C.edgePad, i.anchorX - C.cardW / 2);
    });

    // Packed left→right by where the card sits, so the greedy "first lane that
    // clears" pass only ever has to look at each lane's last card.
    const order = items.slice().sort(function (a, b) {
      return (a.anchorX - b.anchorX) || (a.startPos - b.startPos) || (a.row - b.row);
    });
    const laneEnds = [];
    order.forEach(function (i) {
      let lane = 0;
      while (lane < laneEnds.length && i.cardX < laneEnds[lane] + C.colGap) lane++;
      laneEnds[lane] = i.cardX + C.cardW;
      i.lane = lane;
      i.side = lane % 2 === 0 ? -1 : 1;   // even lanes above the rail, odd below
      i.ring = Math.floor(lane / 2);
    });

    const rings = { "-1": 0, "1": 0 };
    order.forEach(function (i) {
      const k = String(i.side);
      if (i.ring + 1 > rings[k]) rings[k] = i.ring + 1;
    });
    const stackH = function (n) { return n ? n * C.cardH + (n - 1) * C.laneGap + C.railGap : 0; };
    const aboveH = stackH(rings["-1"]);
    const belowH = stackH(rings["1"]);
    const railY = C.topPad + aboveH;

    order.forEach(function (i) {
      i.cardY = i.side < 0
        ? railY - C.railGap - (i.ring + 1) * C.cardH - i.ring * C.laneGap
        : railY + C.railGap + i.ring * (C.cardH + C.laneGap);
      i.stemY = i.side < 0 ? i.cardY + C.cardH : i.cardY;
    });

    // ---- the roll of players (deduped across every campaign) ----------------
    const players = [];
    const pByKey = {};
    items.forEach(function (i) {
      i.players.forEach(function (p) {
        let g = pByKey[p.key];
        if (!g) { g = pByKey[p.key] = { key: p.key, name: p.name, campaigns: [], characters: [] }; players.push(g); }
        g.campaigns.push(i.id);
        p.characters.forEach(function (ch) { if (g.characters.indexOf(ch) === -1) g.characters.push(ch); });
      });
    });
    players.sort(function (a, b) {
      return (b.campaigns.length - a.campaigns.length) || a.name.localeCompare(b.name);
    });

    // ---- the axis ------------------------------------------------------------
    const ticks = [];
    const y0 = Math.floor(minPos), y1 = Math.ceil(maxPos);
    for (let y = y0; y <= y1; y++) {
      ticks.push({ key: "y" + y, year: y, x: xOf(y), major: true });
      if (y < y1) ticks.push({ key: "h" + y, year: y, x: xOf(y + 0.5), major: false });
    }

    return {
      items: order,
      byId: order.reduce(function (m, i) { m[i.id] = i; return m; }, {}),
      undated: undated,
      players: players,
      locations: locations,
      ticks: ticks,
      railY: railY,
      worldW: Math.max(
        xOf(maxPos),
        Math.max.apply(null, order.map(function (i) { return i.cardX + C.cardW; }))
      ) + C.sidePad,
      worldH: railY + belowH + C.bottomPad,
      minPos: minPos, maxPos: maxPos,
      xOf: xOf,
      cfg: C
    };
  }

  window.SFC_LAYOUT = { compute: compute, DEFAULTS: DEFAULTS, TONES: TONES };
})();
