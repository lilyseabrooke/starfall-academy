/* ===========================================================================
   Starfall Family Tree — interactive canvas (React, Babel)
   Exposes window.SFT_TreeCanvas (forwardRef): focusNode(id), fitView(), zoomBy().
   Transform is applied imperatively to the world layer so nodes/edges never
   re-render while panning; only the year ruler tracks the view.
   =========================================================================== */
(function () {
  const { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback, memo } = React;

  const COLORS = {
    plum:    { base: "var(--plum-500)",    light: "var(--plum-300)",    soft: "rgba(179,115,155,0.16)" },
    forest:  { base: "var(--forest-500)",  light: "var(--forest-300)",  soft: "rgba(127,161,131,0.16)" },
    teal:    { base: "var(--teal-500)",    light: "var(--teal-300)",    soft: "rgba(98,180,212,0.15)" },
    crimson: { base: "var(--crimson-500)", light: "var(--crimson-300)", soft: "rgba(194,113,111,0.16)" },
    gold:    { base: "var(--gold-600)",    light: "var(--gold-400)",    soft: "rgba(185,157,83,0.14)" },
    azure:   { base: "oklch(0.50 0.09 245)", light: "oklch(0.75 0.11 245)", soft: "oklch(0.75 0.11 245 / 0.15)" },
    rust:    { base: "oklch(0.53 0.12 52)",  light: "oklch(0.74 0.13 56)",  soft: "oklch(0.74 0.13 56 / 0.15)" },
    slate:   { base: "oklch(0.53 0.03 250)", light: "oklch(0.73 0.035 250)", soft: "oklch(0.73 0.035 250 / 0.14)" }
  };
  const colorOf = (c) => COLORS[c] || COLORS.gold;

  function initials(name) {
    // Strip quoted/parenthesized nicknames/titles (e.g. Aspen 'Rogue' Whitley,
    // Kyndra (Kyn) Faulkner) before taking initials.
    const parts = name.replace(/['"`‘’“”][^'"`‘’“”]*['"`‘’“”]|\([^)]*\)/g, " ").trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function displayName(n) { return n.prefix ? n.prefix + " " + n.name : n.name; }

  const REL_QUAL = { "creature-bond": "bond", partnership: "partner", widowed: "widowed", marriage: "" };

  // render a bio string with inline ${text:'..',link:'id'} cross-links
  function renderBio(L, bio, onJump) {
    if (!bio) return null;
    const re = /\$\{\s*text:\s*'([^']*)'\s*,\s*link:\s*'([^']*)'\s*\}/g;
    const out = []; let last = 0, m, i = 0;
    while ((m = re.exec(bio)) !== null) {
      if (m.index > last) out.push(bio.slice(last, m.index));
      const label = m[1], id = m[2], ok = !!L.nodes[id];
      out.push(React.createElement(ok ? "button" : "span", {
        key: "bl" + (i++), className: "sft-bio-link" + (ok ? "" : " is-dead"),
        title: ok ? undefined : "Not yet recorded in the ledger",
        onClick: ok ? (e) => { e.stopPropagation(); onJump(id); } : undefined
      }, label));
      last = re.lastIndex;
    }
    if (last < bio.length) out.push(bio.slice(last));
    return out;
  }

  // ---------- edge path helpers -------------------------------------------
  function descentPath(ax, ay, cx, cy, style) {
    if (style === "orthogonal") {
      const my = ay + (cy - ay) * 0.5;
      return `M ${ax} ${ay} L ${ax} ${my} L ${cx} ${my} L ${cx} ${cy}`;
    }
    // curved / ribbon — smooth S with vertical tangents
    const k = Math.max(28, (cy - ay) * 0.42);
    return `M ${ax} ${ay} C ${ax} ${ay + k}, ${cx} ${cy - k}, ${cx} ${cy}`;
  }
  function unionPath(x1, y1, x2, y2) {
    const my = (y1 + y2) / 2;
    const dx = (x2 - x1) * 0.18;
    return `M ${x1} ${y1} C ${x1 + dx} ${my}, ${x2 - dx} ${my}, ${x2} ${y2}`;
  }

  // ---------- Edges layer (memoised; independent of pan/zoom) --------------
  const Edges = memo(function Edges({ L, lineStyle, show, dimSet, accentSet }) {
    const N = L.nodes;
    const isDim = (id) => dimSet && !dimSet.has(id);
    const edgeOpacity = (a, b) => {
      if (!dimSet) return 1;
      return (dimSet.has(a) && dimSet.has(b)) ? 1 : 0.12;
    };
    const isAccent = (a, b) => accentSet && accentSet.has(a) && accentSet.has(b);

    return (
      React.createElement("svg", { className: "sft-edges", width: L.worldW, height: L.worldH },
        // descent
        show.descent && L.descents.map((d, i) => {
          const c = N[d.childId];
          const op = edgeOpacity(d.parents[0], d.childId);
          const acc = d.parents.some((p) => isAccent(p, d.childId));
          return React.createElement("path", {
            key: "d" + i, d: descentPath(d.ax, d.ay, c.x, c.y, lineStyle),
            className: "sft-edge sft-edge--descent" + (lineStyle === "ribbon" ? " is-ribbon" : "") + (acc ? " is-accent" : ""),
            style: { opacity: op }
          });
        }),
        // siblings
        show.sibling && L.siblings.map((s, i) => {
          const a = N[s.a], b = N[s.b];
          const op = edgeOpacity(s.a, s.b);
          return React.createElement("path", {
            key: "s" + i, d: unionPath(a.x, a.y, b.x, b.y),
            className: "sft-edge sft-edge--sibling", style: { opacity: op * 0.9 }
          });
        }),
        // marriages / creature bonds (drawn last → on top of descent origins)
        L.marriages.map((m, i) => {
          const isBond = m.type === "creature-bond";
          if (isBond ? !show.bond : !show.marriage) return null;
          const a = N[m.a], b = N[m.b];
          const op = edgeOpacity(m.a, m.b);
          const acc = isAccent(m.a, m.b);
          const cls = "sft-edge sft-edge--union"
            + (m.type === "partnership" ? " is-partnership" : "")
            + (isBond ? " is-bond" : "")
            + (m.type === "widowed" ? " is-widowed" : "")
            + (acc ? " is-accent" : "");
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          return React.createElement(React.Fragment, { key: "m" + i },
            React.createElement("path", { d: unionPath(a.x, a.y, b.x, b.y), className: cls, style: { opacity: op } }),
            React.createElement("path", { d: `M ${mx - 6} ${my} L ${mx} ${my - 7} L ${mx + 6} ${my} L ${mx} ${my + 7} Z`,
              className: "sft-union-knot", style: { opacity: op } })
          );
        })
      )
    );
  });

  // ---------- Node ---------------------------------------------------------
  const Node = memo(function Node({ n, dim, selected, onPick, onHover }) {
    const h = colorOf(n._color);
    const deceased = n.death != null;
    const beast = n.creature_type != null && n.creature_type !== "human";
    return (
      React.createElement("button", {
        className: "sft-node" + (selected ? " is-selected" : "") + (dim ? " is-dim" : "") + (deceased ? " is-deceased" : "") + (beast ? " is-beast" : ""),
        style: { left: n.x, top: n.y, "--house": h.base, "--house-l": h.light },
        onClick: (e) => { e.stopPropagation(); onPick(n.id, e); },
        onMouseEnter: () => onHover(n.id),
        onMouseLeave: () => onHover(null),
        "data-id": n.id
      },
        React.createElement("span", { className: "sft-medallion" },
          n.portrait
            ? React.createElement("img", { src: n.portrait, alt: n.name })
            : React.createElement("span", { className: "sft-monogram" }, initials(n.name)),
          deceased && React.createElement("span", { className: "sft-memoriam", title: "In memoriam" })
        ),
        React.createElement("span", { className: "sft-namechip" }, n.name)
      )
    );
  });

  // ---------- main canvas --------------------------------------------------
  function lifeLabel(n) {
    const b = n.birthKnown ? n.birth : "unknown";
    if (n.death == null) return "b.\u00a0" + b;
    const d = typeof n.death === "number" ? n.death : "?";
    return b + "\u2013" + d;
  }

  const TreeCanvas = forwardRef(function TreeCanvas(props, ref) {
    const { L, tweaks, show, filterFamily, query, onPick, onFamily, onExpand, selectedId } = props;
    const viewportRef = useRef(null);
    const worldRef = useRef(null);
    const view = useRef({ x: 0, y: 0, s: 1 });
    const [hoverId, setHoverId] = useState(null);
    const rulerRef = useRef(null);
    const popoverRef = useRef(null);
    const selRef = useRef(selectedId);
    selRef.current = selectedId;
    const draggedRef = useRef(false);

    const applyTransform = useCallback((animate) => {
      const w = worldRef.current; if (!w) return;
      const { x, y, s } = view.current;
      w.style.transition = animate ? "transform 620ms cubic-bezier(0.16,1,0.3,1)" : "none";
      w.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      // ruler update
      const rail = rulerRef.current;
      if (rail) {
        rail.querySelectorAll("[data-y]").forEach((el) => {
          const ty = parseFloat(el.getAttribute("data-y"));
          el.style.transform = `translateY(${y + ty * s}px)`;
        });
        const pres = rail.querySelector("[data-present]");
        if (pres) pres.style.transform = `translateY(${y + L.presentY * s}px)`;
      }
      const pop = popoverRef.current;
      if (pop && selRef.current && L.nodes[selRef.current]) {
        const n = L.nodes[selRef.current];
        const vp = viewportRef.current;
        const vpW = vp ? vp.clientWidth : 1200, vpH = vp ? vp.clientHeight : 800;
        const sx = x + n.x * s, sy = y + n.y * s;
        const card = pop.firstChild;
        const cw = card ? card.offsetWidth : 312;
        const ch = card ? card.offsetHeight : 360;
        let left = sx + 42;
        if (left + cw > vpW - 12) left = sx - 42 - cw;
        if (left < 12) left = 12;
        let top = sy - ch / 2;
        if (top < 12) top = 12;
        if (top + ch > vpH - 12) top = vpH - ch - 12;
        pop.style.transform = `translate(${left}px, ${top}px)`;
      }
    }, [L]);

    const clamp = (s) => Math.min(2.4, Math.max(0.18, s));

    const centerOn = useCallback((wx, wy, scale, animate) => {
      const vp = viewportRef.current; if (!vp) return;
      const r = vp.getBoundingClientRect();
      const s = clamp(scale != null ? scale : view.current.s);
      view.current = { s, x: r.width / 2 - wx * s, y: r.height / 2 - wy * s };
      applyTransform(animate);
    }, [applyTransform]);

    const fitView = useCallback((animate = true) => {
      const vp = viewportRef.current; if (!vp) return;
      const r = vp.getBoundingClientRect();
      const pad = 80;
      const s = clamp(Math.min((r.width - pad * 2) / L.worldW, (r.height - pad * 2) / L.worldH));
      view.current = { s, x: (r.width - L.worldW * s) / 2, y: (r.height - L.worldH * s) / 2 };
      applyTransform(animate);
    }, [L, applyTransform]);

    // initial view: frame fromYear → the present line (2034 sits just above the bottom)
    const frameFrom = useCallback((fromYear, animate) => {
      const vp = viewportRef.current; if (!vp) return;
      const r = vp.getBoundingClientRect();
      const padX = 64, padTop = 60, padBottom = 54;
      const topY = L.yearToY(fromYear);
      const botY = L.presentY;
      const spanY = Math.max(botY - topY, 1);
      const s = clamp((r.height - padTop - padBottom) / spanY);
      view.current = { s, x: (r.width - L.worldW * s) / 2, y: (r.height - padBottom) - botY * s };
      applyTransform(animate);
    }, [L, applyTransform]);

    const focusNode = useCallback((id) => {
      const n = L.nodes[id]; if (!n) return;
      centerOn(n.x, n.y, Math.max(view.current.s, 0.92), true);
    }, [L, centerOn]);

    useImperativeHandle(ref, () => ({
      fitView,
      focusNode,
      home: () => frameFrom(1950, true),
      zoomBy: (f) => {
        const vp = viewportRef.current; const r = vp.getBoundingClientRect();
        const cx = r.width / 2, cy = r.height / 2;
        zoomAt(cx, cy, f, true);
      }
    }));

    function zoomAt(px, py, factor, animate) {
      const v = view.current;
      const ns = clamp(v.s * factor);
      const k = ns / v.s;
      view.current = { s: ns, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      applyTransform(animate);
    }

    // zoom to fit the active family filter
    useEffect(() => {
      if (!filterFamily) return;
      const vp = viewportRef.current; if (!vp) return;
      const members = L.order.map((id) => L.nodes[id]).filter((n) => n._famKey === filterFamily);
      if (!members.length) return;
      const xs = members.map((n) => n.x);
      const ys = members.map((n) => n.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const r = vp.getBoundingClientRect();
      const pad = 140;
      const spanX = Math.max(maxX - minX, 900);
      const spanY = Math.max(maxY - minY, 600);
      const s = clamp(Math.min(
        (r.width - pad * 2) / spanX,
        (r.height - pad * 2) / spanY
      ));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      view.current = { s, x: r.width / 2 - cx * s, y: r.height / 2 - cy * s };
      applyTransform(true);
    }, [filterFamily, L, applyTransform]); // eslint-disable-line

    // initial view: frame ~1950 → present rather than fitting all of history
    useEffect(() => { frameFrom(1950, false); /* eslint-disable-next-line */ }, [L]);
    // reposition popover when selection changes & refresh icons
    useEffect(() => {
      applyTransform(false);
      if (window.lucide) window.lucide.createIcons();
    }, [selectedId, applyTransform]);
    useEffect(() => {
      const onResize = () => applyTransform(false);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [applyTransform]);

    // wheel zoom / pan
    useEffect(() => {
      const vp = viewportRef.current; if (!vp) return;
      const onWheel = (e) => {
        e.preventDefault();
        const r = vp.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) {
          zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 0.89, false);
        } else {
          view.current.x -= e.deltaX;
          view.current.y -= e.deltaY;
          applyTransform(false);
        }
      };
      vp.addEventListener("wheel", onWheel, { passive: false });
      return () => vp.removeEventListener("wheel", onWheel);
    }, [applyTransform]);

    // drag to pan
    useEffect(() => {
      const vp = viewportRef.current; if (!vp) return;
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
      const down = (e) => {
        if (e.button !== 0) return;
        if (e.target.closest(".sft-node")) return;
        dragging = true; moved = false; draggedRef.current = false;
        sx = e.clientX; sy = e.clientY; ox = view.current.x; oy = view.current.y;
        vp.classList.add("is-grabbing");
      };
      const move = (e) => {
        if (!dragging) return;
        view.current.x = ox + (e.clientX - sx);
        view.current.y = oy + (e.clientY - sy);
        if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) { moved = true; draggedRef.current = true; }
        applyTransform(false);
      };
      const up = () => { dragging = false; vp.classList.remove("is-grabbing"); };
      vp.addEventListener("mousedown", down);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => { vp.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    }, [applyTransform]);

    // touch: swipe to pan, pinch to zoom
    useEffect(() => {
      const vp = viewportRef.current; if (!vp) return;
      let last = null;

      const dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const mid = (a, b, r) => ({ x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top });

      const onStart = (e) => { last = Array.from(e.touches); };

      const onMove = (e) => {
        if (!last) return;
        e.preventDefault();
        const cur = Array.from(e.touches);
        const r = vp.getBoundingClientRect();

        if (cur.length === 1 && last.length === 1) {
          view.current.x += cur[0].clientX - last[0].clientX;
          view.current.y += cur[0].clientY - last[0].clientY;
          applyTransform(false);
        } else if (cur.length >= 2) {
          const prev2 = last.length >= 2 ? last : [last[0], cur[1]];
          const factor = dist(cur[0], cur[1]) / Math.max(dist(prev2[0], prev2[1]), 1);
          const pm = mid(prev2[0], prev2[1], r);
          const cm = mid(cur[0], cur[1], r);
          const v = view.current;
          const ns = clamp(v.s * factor);
          const k = ns / v.s;
          view.current = { s: ns, x: cm.x - (pm.x - v.x) * k, y: cm.y - (pm.y - v.y) * k };
          applyTransform(false);
        }

        last = cur;
      };

      const onEnd = (e) => { last = e.touches.length ? Array.from(e.touches) : null; };

      vp.addEventListener("touchstart", onStart, { passive: true });
      vp.addEventListener("touchmove", onMove, { passive: false });
      vp.addEventListener("touchend", onEnd, { passive: true });
      vp.addEventListener("touchcancel", onEnd, { passive: true });
      return () => {
        vp.removeEventListener("touchstart", onStart);
        vp.removeEventListener("touchmove", onMove);
        vp.removeEventListener("touchend", onEnd);
        vp.removeEventListener("touchcancel", onEnd);
      };
    }, [applyTransform]);

    // ---- derive dim / accent sets from filter + query + hover/selection ----
    const q = (query || "").trim().toLowerCase();
    let dimSet = null;     // ids that are "active" (rest dimmed)
    if (filterFamily) {
      dimSet = new Set();
      L.order.forEach((id) => { if (L.nodes[id]._famKey === filterFamily) dimSet.add(id); });
    }
    if (q) {
      const match = new Set();
      L.order.forEach((id) => { if (L.nodes[id].name.toLowerCase().includes(q)) match.add(id); });
      dimSet = dimSet ? new Set([...dimSet].filter((x) => match.has(x))) : match;
    }
    // accent (relationship highlight) from hover or selection
    const focusId = hoverId || selectedId;
    let accentSet = null;
    if (focusId && L.neighbors[focusId]) {
      accentSet = new Set([focusId, ...L.neighbors[focusId]]);
    } else if (focusId) {
      accentSet = new Set([focusId]);
    }

    const N = L.nodes;
    return (
      React.createElement("div", { className: "sft-viewport", ref: viewportRef, onClick: () => { if (!draggedRef.current) onPick(null); } },
        React.createElement("div", { className: "sft-world", ref: worldRef },
          // decade gridlines
          React.createElement("div", { className: "sft-grid" },
            L.ticks.map((t) => React.createElement("div", { key: t.year, className: "sft-gridline", style: { top: t.y } })),
            React.createElement("div", { className: "sft-gridline is-present", style: { top: L.presentY } })
          ),
          React.createElement(Edges, { L, lineStyle: tweaks.lineStyle, show, dimSet, accentSet }),
          React.createElement("div", { className: "sft-nodes" },
            L.order.map((id) => {
              const n = N[id];
              const dim = (dimSet && !dimSet.has(id)) || (accentSet && !accentSet.has(id) && (hoverId != null));
              return React.createElement(Node, {
                key: id, n, dim: !!dim, selected: selectedId === id,
                onPick, onHover: setHoverId
              });
            })
          )
        ),
        // anchored popover (screen-space, positioned imperatively)
        selectedId && L.nodes[selectedId] && (function () {
          const n = L.nodes[selectedId];
          const rel = window.SFT_LAYOUT.buildRelations(L, selectedId);
          const h = colorOf(n._color);
          const fam = L.families.find((f) => f.id === n._famKey);
          const jump = (id) => onPick(id, null, true);
          const chip = (r) => React.createElement("button", {
            key: r.id, className: "sft-rel-chip", onClick: (e) => { e.stopPropagation(); jump(r.id); }
          }, r.name);
          const pchip = (r) => React.createElement("button", {
            key: r.id, className: "sft-rel-chip", onClick: (e) => { e.stopPropagation(); jump(r.id); }
          }, r.name, r.type && r.type !== "marriage" && React.createElement("span", { className: "sft-rel-qual" }, REL_QUAL[r.type] || r.type));
          const group = (label, list, render) => list.length ? React.createElement("div", { className: "sft-rel-row" },
            React.createElement("span", { className: "sft-rel-label" }, label),
            React.createElement("div", { className: "sft-rel-chips" }, list.map(render || chip))) : null;
          return React.createElement("div", { className: "sft-popover", ref: popoverRef, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { className: "sft-pop-card", style: { "--house": h.base, "--house-l": h.light } },
              React.createElement("button", { className: "sft-pop-close", "aria-label": "Close", onClick: (e) => { e.stopPropagation(); onPick(null); } },
                React.createElement("i", { "data-lucide": "x" })),
              React.createElement("div", { className: "sft-pop-head" },
                React.createElement("span", { className: "sft-pop-medallion" }, n.portrait
                  ? React.createElement("img", { src: n.portrait, alt: n.name })
                  : React.createElement("span", { className: "sft-monogram" }, initials(n.name))),
                React.createElement("div", { className: "sft-pop-id" },
                  React.createElement("div", { className: "sft-pop-name" }, displayName(n)),
                  React.createElement("div", { className: "sft-pop-meta" },
                    React.createElement("span", { className: "sft-pop-life" }, lifeLabel(n)),
                    n.pronouns && React.createElement("span", { className: "sft-pop-pronouns" }, "\u00b7 " + n.pronouns)),
                  n.title && React.createElement("div", { className: "sft-pop-title" }, n.title),
                  fam && React.createElement("button", { className: "sft-pop-fam", style: { "--fam": colorOf(fam.color).light }, onClick: (e) => { e.stopPropagation(); onFamily(fam.id); } },
                    React.createElement("span", { className: "sft-pop-fam-dot" }), fam.name))),
              n.bio && React.createElement("p", { className: "sft-pop-bio" }, renderBio(L, n.bio, jump)),
              React.createElement("div", { className: "sft-rel" },
                group("Parents", rel.parents),
                group("Partner", rel.partners, pchip),
                group("Children", rel.children),
                group("Siblings", rel.siblings)),
              React.createElement("div", { className: "sft-pop-actions" },
                React.createElement("button", { className: "sft-pop-expand", onClick: (e) => { e.stopPropagation(); onExpand(selectedId); } },
                  React.createElement("i", { "data-lucide": "maximize-2" }), "Open full record"))));
        })(),
        // year ruler (screen-space overlay)
        React.createElement("div", { className: "sft-ruler", ref: rulerRef },
          L.ticks.map((t) => React.createElement("div", { key: t.year, className: "sft-tick", "data-y": t.y },
            React.createElement("span", { className: "sft-tick-year" }, t.year))),
          React.createElement("div", { className: "sft-tick is-present", "data-present": "1" },
            React.createElement("span", { className: "sft-tick-year" }, L.presentYear),
            React.createElement("span", { className: "sft-tick-now" }, "now"))
        )
      )
    );
  });

  window.SFT_TreeCanvas = TreeCanvas;
  window.SFT_COLORS = COLORS;
  window.SFT_initials = initials;
  window.SFT_renderBio = renderBio;
  window.SFT_displayName = displayName;
  window.SFT_REL_QUAL = REL_QUAL;
})();
