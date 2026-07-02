/* ===========================================================================
   Starfall Family Tree — chrome & overlays (React, Babel)
   window.SFT_UI = { TopBar, Legend, ZoomControls, DetailModal, FamilyModal }
   =========================================================================== */
(function () {
  const { useState, useRef, useEffect } = React;
  const DS = window.StarfallAcademyDesignSystem_61fef2;
  const { Button, Crest, Switch, Badge } = DS;
  const COLORS = window.SFT_COLORS;
  const initials = window.SFT_initials;
  const renderBio = window.SFT_renderBio;
  const displayName = window.SFT_displayName;
  const REL_QUAL = window.SFT_REL_QUAL;
  const colorOf = (c) => COLORS[c] || COLORS.gold;
  const Icon = (name, props) => React.createElement("i", Object.assign({ "data-lucide": name }, props || {}));

  function lifeLabel(n) {
    const b = n.birthKnown ? n.birth : "unknown";
    if (n.death == null) return "b.\u00a0" + b;
    const d = typeof n.death === "number" ? n.death : "?";
    return b + "\u2013" + d;
  }
  function ageLabel(n, present) {
    if (!n.birthKnown) return null;
    if (n.death != null && typeof n.death !== "number") return null;
    const end = typeof n.death === "number" ? n.death : present;
    return (end - n.birth) + (typeof n.death === "number" ? " years \u00b7 of blessed memory" : " years \u00b7 living");
  }
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const magicList = (n) => Array.isArray(n.magic) ? n.magic : (n.magic ? [n.magic] : []);
  const famName = (L, key) => { const f = L.families.find((x) => x.id === key); return f ? f.name : "Unaffiliated"; };

  // -------------------------------------------------------------- TopBar ---
  function TopBar({ L, query, onQuery, onJump, families, filterFamily, onFilter, onFit, onHome }) {
    const [openFam, setOpenFam] = useState(false);
    const [focusSearch, setFocusSearch] = useState(false);
    const q = query.trim().toLowerCase();
    const matches = q ? L.order.map((id) => L.nodes[id]).filter((n) => n.name.toLowerCase().includes(q)).slice(0, 7) : [];
    const famRef = useRef(null);
    useEffect(() => {
      const h = (e) => { if (famRef.current && !famRef.current.contains(e.target)) setOpenFam(false); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);
    const activeFam = families.find((f) => f.id === filterFamily);

    return React.createElement("header", { className: "sft-topbar" },
      React.createElement("div", { className: "sft-search" + (focusSearch ? " is-focus" : "") },
        React.createElement("span", { className: "sft-search-icon" }, Icon("search")),
        React.createElement("input", {
          className: "sft-search-input", value: query, placeholder: "Search the rolls by name\u2026",
          onChange: (e) => onQuery(e.target.value),
          onFocus: () => setFocusSearch(true),
          onBlur: () => setTimeout(() => setFocusSearch(false), 140),
          onKeyDown: (e) => { if (e.key === "Enter" && matches[0]) { onJump(matches[0].id); e.target.blur(); } }
        }),
        query && React.createElement("button", { className: "sft-search-clear", onClick: () => onQuery(""), "aria-label": "Clear" }, Icon("x")),
        focusSearch && matches.length > 0 && React.createElement("div", { className: "sft-typeahead" },
          matches.map((n) => {
            const h = colorOf(n._color);
            return React.createElement("button", {
              key: n.id, className: "sft-ta-row", onMouseDown: (e) => { e.preventDefault(); onJump(n.id); }
            },
              React.createElement("span", { className: "sft-ta-dot", style: { background: h.light } }),
              React.createElement("span", { className: "sft-ta-name" }, n.name),
              React.createElement("span", { className: "sft-ta-fam" }, famName(L, n._famKey) + " \u00b7 " + lifeLabel(n)));
          }))),

      React.createElement("div", { className: "sft-topbar-right" },
        React.createElement("div", { className: "sft-famfilter", ref: famRef },
          React.createElement("button", { key: filterFamily ? "fam" : "all", className: "sft-famfilter-btn" + (filterFamily ? " is-active" : ""), onClick: () => setOpenFam((v) => !v) },
            activeFam ? React.createElement("span", { className: "sft-ff-dot", style: { background: colorOf(activeFam.color).light } }) : Icon("filter"),
            React.createElement("span", null, activeFam ? activeFam.name : "All families"),
            Icon("chevron-down", { className: "sft-ff-chev" })),
          openFam && React.createElement("div", { className: "sft-famfilter-menu" },
            React.createElement("button", { className: "sft-ff-item" + (!filterFamily ? " is-on" : ""), onClick: () => { onFilter(null); setOpenFam(false); } },
              React.createElement("span", { className: "sft-ff-dot", style: { background: "var(--text-faint)" } }), "All families"),
            families.map((f) => React.createElement("button", {
              key: f.id, className: "sft-ff-item" + (filterFamily === f.id ? " is-on" : ""), onClick: () => { onFilter(f.id); setOpenFam(false); }
            },
              React.createElement("span", { className: "sft-ff-dot", style: { background: colorOf(f.color).light } }),
              f.name,
              React.createElement("span", { className: "sft-ff-count" }, f.members.length))))),
        React.createElement(Button, { variant: "secondary", size: "md", iconLeft: Icon("locate-fixed"), onClick: onHome }, "Default"),
        React.createElement(Button, { variant: "secondary", size: "md", iconLeft: Icon("maximize"), onClick: onFit }, "Fit")));
  }

  // -------------------------------------------------------------- Legend ---
  function Legend({ show, onToggle, families, onFamilyKey, filterFamily }) {
    const [open, setOpen] = useState(true);
    const rows = [
      { key: "descent", label: "Descent", swatch: "descent" },
      { key: "marriage", label: "Partnerships", swatch: "union" },
      { key: "bond", label: "Creature Bonds", swatch: "bond" },
      { key: "sibling", label: "Siblings", swatch: "sibling" }
    ];
    if (!open) {
      return React.createElement("button", { className: "sft-legend-chip", onClick: () => setOpen(true) },
        Icon("panel-left-open"), "Legend");
    }
    return React.createElement("div", { className: "sft-legend" },
      React.createElement("button", { className: "sft-legend-collapse", onClick: () => setOpen(false), "aria-label": "Collapse legend" }, Icon("chevrons-left")),
      React.createElement("div", { className: "sft-legend-sec" },
        React.createElement("div", { className: "sft-legend-title" }, "Relations"),
        rows.map((r) => React.createElement("label", { key: r.key, className: "sft-legend-row" },
          React.createElement("span", { className: "sft-legend-swatch sw-" + r.swatch }),
          React.createElement("span", { className: "sft-legend-label" }, r.label),
          React.createElement(Switch, { checked: show[r.key], onChange: (e) => onToggle(r.key, e.target.checked) })))),
      React.createElement("div", { className: "sft-legend-sec" },
        React.createElement("div", { className: "sft-legend-title" }, "Families"),
        React.createElement("div", { className: "sft-legend-houses" },
          families.map((f) => React.createElement("button", {
            key: f.id, className: "sft-house-key" + (filterFamily === f.id ? " is-on" : ""), onClick: () => onFamilyKey(f.id)
          },
            React.createElement("span", { className: "sft-house-dot", style: { background: colorOf(f.color).light } }),
            React.createElement("span", { className: "sft-house-name" }, f.name),
            React.createElement("span", { className: "sft-house-count" }, f.members.length)))),
        React.createElement("div", { className: "sft-legend-hint" }, "Tap a family to focus · tap again to clear")));
  }

  // ---------------------------------------------------------- ZoomControls -
  function ZoomControls({ onZoom, onFit }) {
    return React.createElement("div", { className: "sft-zoom" },
      React.createElement("button", { className: "sft-zoom-btn", onClick: () => onZoom(1.22), "aria-label": "Zoom in" }, Icon("plus")),
      React.createElement("button", { className: "sft-zoom-btn", onClick: () => onZoom(0.82), "aria-label": "Zoom out" }, Icon("minus")),
      React.createElement("button", { className: "sft-zoom-btn", onClick: onFit, "aria-label": "Fit to view" }, Icon("scan")));
  }

  // ----------------------------------------------------- relationship list -
  function RelList({ rel, onJump }) {
    const chip = (r) => React.createElement("button", { key: r.id, className: "sft-rel-chip", onClick: () => onJump(r.id) }, r.name);
    const pchip = (r) => React.createElement("button", { key: r.id, className: "sft-rel-chip", onClick: () => onJump(r.id) },
      r.name, r.type && r.type !== "marriage" && React.createElement("span", { className: "sft-rel-qual" }, REL_QUAL[r.type] || r.type));
    const group = (label, list, render) => list.length ? React.createElement("div", { className: "sft-rel-row" },
      React.createElement("span", { className: "sft-rel-label" }, label),
      React.createElement("div", { className: "sft-rel-chips" }, list.map(render || chip))) : null;
    const any = rel.parents.length || rel.partners.length || rel.children.length || rel.siblings.length;
    if (!any) return React.createElement("div", { className: "sft-rel-none" }, "No recorded kin.");
    return React.createElement("div", { className: "sft-rel sft-rel--modal" },
      group("Parents", rel.parents),
      group("Partner", rel.partners, pchip),
      group("Children", rel.children),
      group("Siblings", rel.siblings));
  }

  function Details({ n }) {
    const magic = magicList(n);
    const rows = [];
    if (n.academy) rows.push(React.createElement("div", { key: "a", className: "sft-det" },
      React.createElement("span", { className: "sft-det-label" }, "Academy"),
      React.createElement("span", { className: "sft-det-val" }, n.academy)));
    if (magic.length) rows.push(React.createElement("div", { key: "m", className: "sft-det" },
      React.createElement("span", { className: "sft-det-label" }, magic.length > 1 ? "Disciplines" : "Discipline"),
      React.createElement("div", { className: "sft-tags" }, magic.map((mg, i) => React.createElement("span", { key: i, className: "sft-tag" }, mg)))));
    if (n.region) rows.push(React.createElement("div", { key: "r", className: "sft-det" },
      React.createElement("span", { className: "sft-det-label" }, "Region"),
      React.createElement("span", { className: "sft-det-val" }, n.region)));
    if (n.creature_type && n.creature_type !== "human") rows.push(React.createElement("div", { key: "c", className: "sft-det" },
      React.createElement("span", { className: "sft-det-label" }, "Nature"),
      React.createElement("span", { className: "sft-det-val" }, cap(n.creature_type))));
    if (!rows.length) return null;
    return React.createElement("div", { className: "sft-detgrid" }, rows);
  }

  // ----------------------------------------------------------- DetailModal -
  function DetailModal({ L, id, onClose, onJump, onFamily, present }) {
    const n = L.nodes[id];
    if (!n) return null;
    const rel = window.SFT_LAYOUT.buildRelations(L, id);
    const fam = L.families.find((f) => f.id === n._famKey);
    const h = colorOf(n._color);
    const age = ageLabel(n, present);
    useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
    return React.createElement("div", { className: "sft-modal-scrim", onClick: onClose },
      React.createElement("div", { className: "sft-modal", style: { "--house": h.base, "--house-l": h.light }, onClick: (e) => e.stopPropagation() },
        React.createElement("button", { className: "sft-modal-close", onClick: onClose, "aria-label": "Close" }, Icon("x")),
        React.createElement("div", { className: "sft-modal-watermark" }, React.createElement(Crest, { form: "lines", size: 360, basePath: "assets", tint: "gold" })),
        React.createElement("div", { className: "sft-modal-head" },
          React.createElement("span", { className: "sft-modal-medallion" }, n.portrait
            ? React.createElement("img", { src: n.portrait, alt: n.name })
            : React.createElement("span", { className: "sft-monogram" }, initials(n.name))),
          React.createElement("div", { className: "sft-modal-id" },
            React.createElement("button", { className: "sft-modal-eyebrow", onClick: () => onFamily(n._famKey) },
              React.createElement("span", { className: "sft-eyebrow-dot", style: { background: h.light } }),
              fam ? fam.name : "Unaffiliated"),
            React.createElement("h2", { className: "sft-modal-name" }, displayName(n)),
            React.createElement("div", { className: "sft-modal-meta" },
              React.createElement("span", null, lifeLabel(n)),
              n.pronouns && React.createElement("span", { className: "sft-dot-sep" }, "\u00b7"),
              n.pronouns && React.createElement("span", null, n.pronouns),
              age && React.createElement("span", { className: "sft-dot-sep" }, "\u00b7"),
              age && React.createElement("span", null, age)),
            n.title && React.createElement("div", { className: "sft-modal-honor" }, Icon("award"), n.title))),
        React.createElement("hr", { className: "sa-rule sft-modal-rule" }),
        n.bio && React.createElement("p", { className: "sft-modal-bio" }, renderBio(L, n.bio, onJump)),
        React.createElement(Details, { n }),
        React.createElement(RelList, { rel, onJump })));
  }

  // ----------------------------------------------------------- FamilyModal -
  function FamilyModal({ L, id, onClose, onJump }) {
    const fam = L.families.find((f) => f.id === id);
    if (!fam) return null;
    const h = colorOf(fam.color);
    const members = fam.members.map((mid) => L.nodes[mid]);
    const living = members.filter((m) => typeof m.death !== "number").length;
    useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
    return React.createElement("div", { className: "sft-modal-scrim", onClick: onClose },
      React.createElement("div", { className: "sft-modal sft-modal--family", style: { "--house": h.base, "--house-l": h.light }, onClick: (e) => e.stopPropagation() },
        React.createElement("button", { className: "sft-modal-close", onClick: onClose, "aria-label": "Close" }, Icon("x")),
        React.createElement("div", { className: "sft-modal-watermark" }, React.createElement(Crest, { form: "lines", size: 360, basePath: "assets", tint: "gold" })),
        React.createElement("div", { className: "sft-fam-head" },
          React.createElement("span", { className: "sft-fam-crest", style: { "--house-l": h.light } }, React.createElement(Crest, { form: "simple", size: 56, basePath: "assets" })),
          React.createElement("div", null,
            React.createElement("div", { className: "sft-modal-eyebrow sft-modal-eyebrow--static" },
              React.createElement("span", { className: "sft-eyebrow-dot", style: { background: h.light } }), "Family record"),
            React.createElement("h2", { className: "sft-modal-name" }, fam.name),
            React.createElement("div", { className: "sft-fam-stat" },
              React.createElement(Badge, { tone: "gold" }, fam.members.length + " recorded"),
              React.createElement("span", { className: "sft-fam-span" }, living + " living \u00b7 earliest " + (fam.minBirth || "—"))))),
        fam.knownFor && React.createElement("p", { className: "sft-fam-tagline" }, fam.knownFor),
        fam.bio && React.createElement("p", { className: "sft-modal-bio sft-fam-blurb" }, fam.bio),
        React.createElement("hr", { className: "sa-rule sft-modal-rule" }),
        React.createElement("div", { className: "sft-fam-members-title" }, "The roll, eldest first"),
        React.createElement("div", { className: "sft-fam-members" },
          members.map((m) => React.createElement("button", { key: m.id, className: "sft-fam-member", onClick: () => onJump(m.id) },
            React.createElement("span", { className: "sft-fam-mono", style: { "--house-l": colorOf(m._color).light } }, initials(m.name)),
            React.createElement("span", { className: "sft-fam-mname" }, m.name),
            React.createElement("span", { className: "sft-fam-mlife" }, lifeLabel(m)))))));
  }

  window.SFT_UI = { TopBar, Legend, ZoomControls, DetailModal, FamilyModal };
})();
