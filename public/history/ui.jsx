/* ===========================================================================
   Starfall Academy — Chronicle: chrome & overlays (React, Babel)
   window.SFC_UI = { TopBar, Roll, ZoomControls, CampaignModal }
   =========================================================================== */
(function () {
  const { useState, useRef, useEffect } = React;
  const DS = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, Crest, Badge } = DS;
  const colorOf = window.SFC_colorOf;
  const initials = window.SFC_initials;
  const campaignInitials = window.SFC_campaignInitials;
  const toneFor = window.SFC_toneFor;
  const plainText = window.SFC_plainText;
  const castLine = window.SFC_castLine;
  const Monograms = window.SFC_Monograms;
  const Icon = window.SFC_Icon;

  // -------------------------------------------------------------- TopBar ---
  function TopBar({ L, query, onQuery, onJump, filterPlayer, onFilter, onHome, shown, total }) {
    const [openPl, setOpenPl] = useState(false);
    const [focusSearch, setFocusSearch] = useState(false);
    const plRef = useRef(null);
    const q = query.trim().toLowerCase();
    const hits = q ? L.items.filter(function (c) { return window.SFC_matches(c, q); }).slice(0, 7) : [];

    useEffect(function () {
      const h = function (e) { if (plRef.current && !plRef.current.contains(e.target)) setOpenPl(false); };
      document.addEventListener("mousedown", h);
      return function () { document.removeEventListener("mousedown", h); };
    }, []);

    const activePl = L.players.find(function (p) { return p.key === filterPlayer; });

    return React.createElement("header", { className: "hst-topbar" },
      React.createElement("div", { className: "hst-search" + (focusSearch ? " is-focus" : "") },
        React.createElement("span", { className: "hst-search-icon" }, Icon("search")),
        React.createElement("input", {
          className: "hst-search-input", value: query,
          placeholder: "Search the chronicle by campaign, player, or character…",
          onChange: function (e) { onQuery(e.target.value); },
          onFocus: function () { setFocusSearch(true); },
          onBlur: function () { setTimeout(function () { setFocusSearch(false); }, 140); },
          onKeyDown: function (e) { if (e.key === "Enter" && hits[0]) { onJump(hits[0].id); e.target.blur(); } }
        }),
        query && React.createElement("button", {
          className: "hst-search-clear", onClick: function () { onQuery(""); }, "aria-label": "Clear"
        }, Icon("x")),
        focusSearch && hits.length > 0 && React.createElement("div", { className: "hst-typeahead" },
          hits.map(function (c) {
            const h = colorOf(c._tone);
            return React.createElement("button", {
              key: c.id, className: "hst-ta-row",
              onMouseDown: function (e) { e.preventDefault(); onJump(c.id); }
            },
              React.createElement("span", { className: "hst-ta-dot", style: { background: h.light } }),
              React.createElement("span", { className: "hst-ta-name" }, c.name),
              React.createElement("span", { className: "hst-ta-meta" }, c.termLabel));
          }))),

      React.createElement("div", { className: "hst-topbar-right" },
        React.createElement("span", { className: "hst-count" },
          shown === total ? total + " campaigns" : shown + " of " + total),
        React.createElement("div", { className: "hst-plfilter", ref: plRef },
          React.createElement("button", {
            // Lucide rewrites <i data-lucide> into <svg> in place, so React and
            // the DOM disagree the moment the leading icon swaps for a player's
            // dot. Re-keying remounts the button instead of patching it.
            key: filterPlayer ? "player" : "all",
            className: "hst-plfilter-btn" + (filterPlayer ? " is-active" : ""),
            onClick: function () { setOpenPl(function (v) { return !v; }); }
          },
            activePl
              ? React.createElement("span", { className: "hst-pl-dot", style: { background: colorOf(toneFor(activePl.key)).light } })
              : Icon("filter"),
            React.createElement("span", null, activePl ? activePl.name : "All players"),
            Icon("chevron-down", { className: "hst-pl-chev" })),
          openPl && React.createElement("div", { className: "hst-plfilter-menu" },
            React.createElement("button", {
              className: "hst-pl-item" + (!filterPlayer ? " is-on" : ""),
              onClick: function () { onFilter(null); setOpenPl(false); }
            },
              React.createElement("span", { className: "hst-pl-dot", style: { background: "var(--text-faint)" } }),
              "All players"),
            L.players.map(function (p) {
              return React.createElement("button", {
                key: p.key, className: "hst-pl-item" + (filterPlayer === p.key ? " is-on" : ""),
                onClick: function () { onFilter(p.key); setOpenPl(false); }
              },
                React.createElement("span", { className: "hst-pl-dot", style: { background: colorOf(toneFor(p.key)).light } }),
                React.createElement("span", { className: "hst-pl-name" }, p.name),
                React.createElement("span", { className: "hst-pl-count" }, p.campaigns.length));
            }))),
        React.createElement("span", { className: "hst-topbar-start" },
          React.createElement(Button, {
            variant: "secondary", size: "md", iconLeft: Icon("locate-fixed"), onClick: onHome
          }, "Start"))));
  }

  // ------------------------------------------------------- the roll panel ---
  function Roll({ L, filterPlayer, onFilter }) {
    const [open, setOpen] = useState(true);
    if (!open) {
      return React.createElement("button", {
        className: "hst-roll-chip", onClick: function () { setOpen(true); }
      }, Icon("panel-left-open"), "The Table");
    }
    return React.createElement("div", { className: "hst-roll" },
      React.createElement("button", {
        className: "hst-roll-collapse", onClick: function () { setOpen(false); }, "aria-label": "Collapse"
      }, Icon("chevrons-left")),
      React.createElement("div", { className: "hst-roll-title" }, "The Table"),
      React.createElement("div", { className: "hst-roll-list" },
        L.players.map(function (p) {
          const h = colorOf(toneFor(p.key));
          return React.createElement("button", {
            key: p.key,
            className: "hst-roll-row" + (filterPlayer === p.key ? " is-on" : ""),
            onClick: function () { onFilter(filterPlayer === p.key ? null : p.key); },
            title: p.characters.join(", ")
          },
            React.createElement("span", { className: "hst-mono hst-mono--sm", style: { "--tone-l": h.light } },
              React.createElement("span", { className: "hst-mono-text" }, initials(p.name))),
            React.createElement("span", { className: "hst-roll-name" }, p.name),
            React.createElement("span", { className: "hst-roll-count" }, p.campaigns.length));
        })),
      React.createElement("div", { className: "hst-roll-hint" }, "Tap a player to follow their thread · tap again to clear"));
  }

  // ---------------------------------------------------------- ZoomControls --
  function ZoomControls({ onZoom, canIn, canOut, onFit }) {
    return React.createElement("div", { className: "hst-zoom" },
      React.createElement("button", {
        className: "hst-zoom-btn", onClick: function () { onZoom(1); }, disabled: !canIn, "aria-label": "Spread the years out"
      }, Icon("plus")),
      React.createElement("button", {
        className: "hst-zoom-btn", onClick: function () { onZoom(-1); }, disabled: !canOut, "aria-label": "Draw the years together"
      }, Icon("minus")),
      React.createElement("button", { className: "hst-zoom-btn", onClick: onFit, "aria-label": "Fit the whole chronicle" }, Icon("scan")));
  }

  // ----------------------------------------------------------- the modal ----
  function CampaignModal({ c, onClose, onPlayer }) {
    useEffect(function () { if (window.lucide) window.lucide.createIcons(); });
    if (!c) return null;
    const h = colorOf(c._tone);
    const sameTerm = c.start.label === c.finish.label;
    const semesters = Math.max(1, Math.round((c.endPos - c.startPos) / 0.5));

    return React.createElement("div", { className: "hst-modal-scrim", onClick: onClose },
      React.createElement("div", {
        className: "hst-modal", style: { "--tone": h.base, "--tone-l": h.light },
        onClick: function (e) { e.stopPropagation(); },
        role: "dialog", "aria-modal": "true", "aria-label": c.name
      },
        React.createElement("button", { className: "hst-modal-close", onClick: onClose, "aria-label": "Close" }, Icon("x")),
        React.createElement("div", { className: "hst-modal-watermark" },
          React.createElement(Crest, { form: "lines", size: 360, basePath: "assets", tint: "gold" })),

        React.createElement("div", { className: "hst-modal-head" },
          React.createElement("span", { className: "hst-modal-medallion" },
            React.createElement("span", { className: "hst-modal-mono" }, campaignInitials(c.name))),
          React.createElement("div", { className: "hst-modal-id" },
            React.createElement("div", { className: "hst-modal-eyebrow" },
              React.createElement("span", { className: "hst-eyebrow-dot", style: { background: h.light } }),
              c.location || "Somewhere unrecorded"),
            React.createElement("h2", { className: "hst-modal-name" }, c.name),
            React.createElement("div", { className: "hst-modal-meta" },
              React.createElement("span", null, c.termLabel),
              React.createElement("span", { className: "hst-dot-sep" }, "·"),
              React.createElement("span", null, sameTerm ? "one semester" : semesters + " semesters")),
            React.createElement("div", { className: "hst-modal-honor" }, Icon("users"), castLine(c)))),

        React.createElement("hr", { className: "sa-rule hst-modal-rule" }),

        c.description
          ? React.createElement("p", { className: "hst-modal-bio" }, plainText(c.description))
          : React.createElement("p", { className: "hst-modal-bio hst-modal-bio--none" }, "No account of this campaign was ever written down."),

        React.createElement("div", { className: "hst-detgrid" },
          React.createElement("div", { className: "hst-det" },
            React.createElement("span", { className: "hst-det-label" }, "Began"),
            React.createElement("span", { className: "hst-det-val" }, c.start.label)),
          React.createElement("div", { className: "hst-det" },
            React.createElement("span", { className: "hst-det-label" }, "Ended"),
            React.createElement("span", { className: "hst-det-val" }, c.finish.label)),
          c.location && React.createElement("div", { className: "hst-det" },
            React.createElement("span", { className: "hst-det-label" }, "Location"),
            React.createElement("span", { className: "hst-det-val" }, c.location))),

        React.createElement("div", { className: "hst-cast-title" },
          "The party — ", c.players.length, c.players.length === 1 ? " player" : " players",
          ", ", c.cast.length, c.cast.length === 1 ? " character" : " characters"),
        React.createElement("div", { className: "hst-cast" },
          c.players.map(function (p) {
            const ph = colorOf(toneFor(p.key));
            return React.createElement("button", {
              key: p.key, className: "hst-cast-row",
              onClick: function () { onPlayer(p.key); },
              title: "Follow " + p.name + " through the chronicle"
            },
              React.createElement("span", { className: "hst-mono hst-mono--md", style: { "--tone-l": ph.light } },
                React.createElement("span", { className: "hst-mono-text" }, initials(p.name))),
              React.createElement("span", { className: "hst-cast-id" },
                React.createElement("span", { className: "hst-cast-player" }, p.name),
                React.createElement("span", { className: "hst-cast-as" },
                  p.characters.length
                    ? React.createElement(React.Fragment, null,
                        React.createElement("span", { className: "hst-cast-word" }, "as "),
                        p.characters.map(function (ch, i) {
                          return React.createElement(React.Fragment, { key: ch },
                            i > 0 && React.createElement("span", { className: "hst-cast-amp" }, " & "),
                            React.createElement("span", { className: "hst-cast-char" }, ch));
                        }))
                    : React.createElement("span", { className: "hst-cast-word" }, "no character recorded"))),
              p.characters.length > 1 && React.createElement(Badge, { tone: "gold" }, "double duty"));
          }))));
  }

  window.SFC_UI = { TopBar: TopBar, Roll: Roll, ZoomControls: ZoomControls, CampaignModal: CampaignModal };
})();
