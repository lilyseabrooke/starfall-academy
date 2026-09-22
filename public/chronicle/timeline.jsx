/* ===========================================================================
   Starfall Academy — Chronicle: the timeline itself (React, Babel)
   Exposes window.SFC_Timeline (forwardRef): focusCampaign(id), home().
   Also publishes the small helpers the chrome + modal share.
   =========================================================================== */
(function () {
  const { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, memo } = React;

  // Same palette the Family Ledger paints its houses with, so a campaign's
  // location reads as an accent from the same box of inks.
  const COLORS = {
    gold:    { base: "var(--gold-600)",    light: "var(--gold-400)",    soft: "rgba(185,157,83,0.14)" },
    plum:    { base: "var(--plum-500)",    light: "var(--plum-300)",    soft: "rgba(179,115,155,0.16)" },
    teal:    { base: "var(--teal-500)",    light: "var(--teal-300)",    soft: "rgba(98,180,212,0.15)" },
    forest:  { base: "var(--forest-500)",  light: "var(--forest-300)",  soft: "rgba(127,161,131,0.16)" },
    crimson: { base: "var(--crimson-500)", light: "var(--crimson-300)", soft: "rgba(194,113,111,0.16)" },
    azure:   { base: "oklch(0.50 0.09 245)", light: "oklch(0.75 0.11 245)", soft: "oklch(0.75 0.11 245 / 0.15)" },
    rust:    { base: "oklch(0.53 0.12 52)",  light: "oklch(0.74 0.13 56)",  soft: "oklch(0.74 0.13 56 / 0.15)" },
    slate:   { base: "oklch(0.53 0.03 250)", light: "oklch(0.73 0.035 250)", soft: "oklch(0.73 0.035 250 / 0.14)" }
  };
  const colorOf = function (c) { return COLORS[c] || COLORS.gold; };

  // Strip quoted/parenthesised nicknames before taking initials, so
  // "Persephone 'Effie' Spencer-Vale" monograms as PS, not PE.
  function initials(name) {
    const parts = String(name || "")
      .replace(/['"`‘’“”][^'"`‘’“”]*['"`‘’“”]|\([^)]*\)/g, " ")
      .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
      .trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].replace(/\./g, "").slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // "The Basilisk Incident" should monogram as BI, not TI, so a leading
  // article is dropped before the initials are taken.
  function campaignInitials(name) {
    return initials(String(name || "").replace(/^\s*(the|a|an)\s+/i, ""));
  }

  // Deterministic tone per player, so the same person keeps the same monogram
  // colour from one campaign card to the next.
  const TONES = window.SFC_LAYOUT.TONES;
  function toneFor(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return TONES[h % TONES.length];
  }

  // The Ledger's bios carry ${text:'..',link:'..'} cross-links. Campaign
  // descriptions don't today, but if one ever picks one up it should read as
  // its label rather than as raw markup.
  function plainText(s) {
    return String(s || "").replace(/\$\{\s*text:\s*'([^']*)'\s*,\s*link:\s*'[^']*'\s*\}/g, "$1");
  }

  function castLine(c) {
    const p = c.players.length, ch = c.cast.length;
    return p + (p === 1 ? " player" : " players") + " · " + ch + (ch === 1 ? " character" : " characters");
  }

  function matches(c, q) {
    if (!q) return true;
    const hay = [c.name, c.location, c.termLabel, c.description]
      .concat(c.players.map(function (p) { return p.name; }))
      .concat(c.cast.map(function (x) { return x.character; }))
      .join(" \u0000 ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  const Icon = function (name, props) {
    return React.createElement("i", Object.assign({ "data-lucide": name }, props || {}));
  };

  // ---------------------------------------------------------- monogram row --
  function Monograms({ players, max }) {
    const cap = max || 6;
    const shown = players.slice(0, cap);
    const rest = players.length - shown.length;
    return React.createElement("div", { className: "hst-monos" },
      shown.map(function (p) {
        const h = colorOf(toneFor(p.key));
        const roles = p.characters.length ? p.name + " as " + p.characters.join(" & ") : p.name;
        return React.createElement("span", {
          key: p.key, className: "hst-mono", style: { "--tone-l": h.light }, title: roles
        },
          React.createElement("span", { className: "hst-mono-text" }, initials(p.name)),
          p.characters.length > 1 && React.createElement("span", { className: "hst-mono-dual", "aria-hidden": "true" }, p.characters.length));
      }),
      rest > 0 && React.createElement("span", { className: "hst-mono hst-mono--more", title: players.slice(cap).map(function (p) { return p.name; }).join(", ") }, "+" + rest));
  }

  // ------------------------------------------------------------- axis layer --
  const Axis = memo(function Axis({ L, dimSet }) {
    const C = L.cfg;
    return React.createElement("svg", {
      className: "hst-axis", width: L.worldW, height: L.worldH, "aria-hidden": "true"
    },
      React.createElement("line", {
        className: "hst-rail", x1: 0, y1: L.railY, x2: L.worldW, y2: L.railY
      }),
      L.ticks.map(function (t) {
        return React.createElement("line", {
          key: t.key, className: "hst-tick" + (t.major ? " is-major" : ""),
          x1: t.x, y1: L.railY - (t.major ? 9 : 4), x2: t.x, y2: L.railY + (t.major ? 9 : 4)
        });
      }),
      L.ticks.filter(function (t) { return t.major; }).map(function (t) {
        return React.createElement("text", {
          key: "l" + t.key, className: "hst-tick-year", x: t.x, y: L.railY + 26, textAnchor: "middle"
        }, t.year);
      }),
      L.items.map(function (i) {
        const h = colorOf(i._tone);
        const dim = dimSet && !dimSet.has(i.id);
        const y = i.stemY;
        return React.createElement("g", {
          key: i.id, className: "hst-span" + (dim ? " is-dim" : ""), style: { "--tone-l": h.light }
        },
          React.createElement("path", {
            className: "hst-stem",
            d: "M " + i.anchorX + " " + L.railY + " L " + i.anchorX + " " + y
          }),
          React.createElement("rect", {
            className: "hst-bar", x: i.barStart, y: L.railY - 4,
            width: Math.max(4, i.barEnd - i.barStart), height: 8, rx: 4
          }),
          React.createElement("circle", { className: "hst-knot", cx: i.anchorX, cy: L.railY, r: 4.5 }));
      }));
  });

  // ------------------------------------------------------------------ card ---
  function CampaignCard({ c, dim, active, onOpen }) {
    const h = colorOf(c._tone);
    return React.createElement("button", {
      className: "hst-card" + (dim ? " is-dim" : "") + (active ? " is-active" : ""),
      style: {
        left: c.cardX, top: c.cardY,
        "--tone": h.base, "--tone-l": h.light, "--tone-soft": h.soft
      },
      onClick: function () { onOpen(c.id); },
      "aria-label": c.name + ", " + c.termLabel
    },
      React.createElement("span", { className: "hst-card-eyebrow" },
        React.createElement("span", { className: "hst-card-dot" }),
        c.location || "Somewhere unrecorded"),
      React.createElement("span", { className: "hst-card-name" }, c.name),
      React.createElement("span", { className: "hst-card-term" }, c.termLabel),
      React.createElement(Monograms, { players: c.players }),
      React.createElement("span", { className: "hst-card-foot" }, castLine(c)));
  }

  // -------------------------------------------------------------- timeline ---
  const Timeline = forwardRef(function Timeline({ L, dimSet, openId, onOpen }, ref) {
    const viewRef = useRef(null);
    const drag = useRef(null);
    const centred = useRef(false);

    // Open on the rail rather than on the top of the world, so the first thing
    // you see is the axis with cards on both sides of it.
    useEffect(function () {
      const el = viewRef.current;
      if (!el || centred.current || !L.items.length) return;
      centred.current = true;
      el.scrollTop = Math.max(0, L.railY - el.clientHeight / 2);
    }, [L]);

    const focusCampaign = useCallback(function (id) {
      const el = viewRef.current, c = L.byId[id];
      if (!el || !c) return;
      el.scrollTo({
        left: Math.max(0, c.anchorX - el.clientWidth / 2),
        top: Math.max(0, c.cardY + L.cfg.cardH / 2 - el.clientHeight / 2),
        behavior: "smooth"
      });
    }, [L]);

    const home = useCallback(function () {
      const el = viewRef.current;
      if (!el) return;
      el.scrollTo({ left: 0, top: Math.max(0, L.railY - el.clientHeight / 2), behavior: "smooth" });
    }, [L]);

    useImperativeHandle(ref, function () {
      return { focusCampaign: focusCampaign, home: home, viewport: function () { return viewRef.current; } };
    }, [focusCampaign, home]);

    // Drag-to-pan, on top of the container's own scrolling.
    const onDown = function (e) {
      if (e.button !== 0 || e.target.closest(".hst-card")) return;
      const el = viewRef.current;
      drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
      el.classList.add("is-grabbing");
    };
    useEffect(function () {
      const onMove = function (e) {
        const d = drag.current, el = viewRef.current;
        if (!d || !el) return;
        d.moved = true;
        el.scrollLeft = d.sl - (e.clientX - d.x);
        el.scrollTop = d.st - (e.clientY - d.y);
      };
      const onUp = function () {
        const el = viewRef.current;
        if (el) el.classList.remove("is-grabbing");
        drag.current = null;
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return function () {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }, []);

    // A plain vertical wheel reads as "along the timeline" here, since the
    // timeline is the long axis; shift/trackpad gestures still work as usual.
    const onWheel = function (e) {
      const el = viewRef.current;
      if (!el || e.ctrlKey) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollHeight <= el.clientHeight + 1) {
        el.scrollLeft += e.deltaY;
      }
    };

    useEffect(function () { if (window.lucide) window.lucide.createIcons(); });

    return React.createElement("div", {
      className: "hst-viewport", ref: viewRef, onMouseDown: onDown, onWheel: onWheel
    },
      React.createElement("div", {
        className: "hst-world", style: { width: L.worldW, height: L.worldH }
      },
        React.createElement(Axis, { L: L, dimSet: dimSet }),
        React.createElement("div", { className: "hst-cards" },
          L.items.map(function (c) {
            return React.createElement(CampaignCard, {
              key: c.id, c: c, dim: dimSet && !dimSet.has(c.id),
              active: openId === c.id, onOpen: onOpen
            });
          }))));
  });

  window.SFC_Timeline = Timeline;
  window.SFC_COLORS = COLORS;
  window.SFC_colorOf = colorOf;
  window.SFC_initials = initials;
  window.SFC_campaignInitials = campaignInitials;
  window.SFC_toneFor = toneFor;
  window.SFC_plainText = plainText;
  window.SFC_castLine = castLine;
  window.SFC_matches = matches;
  window.SFC_Monograms = Monograms;
  window.SFC_Icon = Icon;
})();
