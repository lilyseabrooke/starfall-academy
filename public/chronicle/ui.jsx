/* ===========================================================================
   Starfall Academy — Chronicle: chrome & overlays (React, Babel)
   window.SFC_UI = { TopBar, Places, ZoomControls, CampaignModal }
   =========================================================================== */
(function () {
  const { useState, useEffect } = React;
  const DS = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, Crest } = DS;
  const colorOf = window.SFC_colorOf;
  const initials = window.SFC_initials;
  const campaignInitials = window.SFC_campaignInitials;
  const toneFor = window.SFC_toneFor;
  const plainText = window.SFC_plainText;
  const castLine = window.SFC_castLine;
  const Monograms = window.SFC_Monograms;
  const Icon = window.SFC_Icon;

  // -------------------------------------------------------------- TopBar ---
  function TopBar({ L, query, onQuery, onJump, onHome, shown, total }) {
    const [focusSearch, setFocusSearch] = useState(false);
    const q = query.trim().toLowerCase();
    const hits = q ? L.items.filter(function (c) { return window.SFC_matches(c, q); }).slice(0, 7) : [];

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
        React.createElement(Button, {
          variant: "secondary", size: "md", iconLeft: Icon("locate-fixed"), onClick: onHome
        }, "Start")));
  }

  // ---------------------------------------------------- the places panel ---
  // The legend for the accent colours on the cards, and the filter for them:
  // the same job the Ledger's families panel does for its houses.
  function Places({ L, filterLocation, onFilter }) {
    const [open, setOpen] = useState(true);
    if (!open) {
      return React.createElement("button", {
        className: "hst-legend-chip", onClick: function () { setOpen(true); }
      }, Icon("panel-left-open"), "Locations");
    }
    return React.createElement("div", { className: "hst-legend" },
      React.createElement("button", {
        className: "hst-legend-collapse", onClick: function () { setOpen(false); }, "aria-label": "Collapse"
      }, Icon("chevrons-left")),
      React.createElement("div", { className: "hst-legend-title" }, "Locations"),
      React.createElement("div", { className: "hst-legend-list" },
        L.locations.map(function (l) {
          const h = colorOf(l.tone);
          return React.createElement("button", {
            key: l.key,
            className: "hst-legend-row" + (filterLocation === l.key ? " is-on" : ""),
            onClick: function () { onFilter(filterLocation === l.key ? null : l.key); }
          },
            React.createElement("span", { className: "hst-legend-dot", style: { background: h.light } }),
            React.createElement("span", { className: "hst-legend-name" }, l.name),
            React.createElement("span", { className: "hst-legend-count" }, l.count));
        })),
      React.createElement("div", { className: "hst-legend-hint" }, "Tap a place to follow its campaigns \u00b7 tap again to clear"));
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
  function CampaignModal({ c, onClose, onLocation }) {
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
        React.createElement("div", { className: "hst-modal-watermark" },
          React.createElement(Crest, { form: "lines", size: 360, basePath: "assets", tint: "gold" })),
        React.createElement("button", { className: "hst-modal-close", onClick: onClose, "aria-label": "Close" }, Icon("x")),

        React.createElement("div", { className: "hst-modal-scroll" },
        React.createElement("div", { className: "hst-modal-head" },
          React.createElement("span", { className: "hst-modal-medallion" },
            React.createElement("span", { className: "hst-modal-mono" }, campaignInitials(c.name))),
          React.createElement("div", { className: "hst-modal-id" },
            c.location
              ? React.createElement("button", {
                  className: "hst-modal-eyebrow",
                  onClick: function () { onLocation(c.location.toLowerCase()); },
                  title: "Follow " + c.location + " through the chronicle"
                },
                  React.createElement("span", { className: "hst-eyebrow-dot", style: { background: h.light } }),
                  c.location)
              : React.createElement("div", { className: "hst-modal-eyebrow hst-modal-eyebrow--static" },
                  React.createElement("span", { className: "hst-eyebrow-dot", style: { background: h.light } }),
                  "Somewhere unrecorded"),
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
            return React.createElement("div", { key: p.key, className: "hst-cast-row" },
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
              );
          })))));
  }

  window.SFC_UI = { TopBar: TopBar, Places: Places, ZoomControls: ZoomControls, CampaignModal: CampaignModal };
})();
