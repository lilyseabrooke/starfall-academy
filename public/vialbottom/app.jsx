/* ===========================================================================
   The Vialbottom Board — bonus investigation corkboard (React, Babel)
   A drag-and-drop corkboard: pin the twelve suspects, run red string between
   them (tokens or free anchor points pinned in empty space), ring groups,
   point arrows, pin notes. Everything persists locally and can be exported
   as a PNG.
   =========================================================================== */
(function () {
  /* Geometry is stored as 0–1 fractions of the board, so any resize rescales
     the arrangement instead of collapsing items onto the clamped edge. */
  const ROSTER = [
    ["Vex", 0.06, 0.04], ["Sasha", 0.31, 0.00], ["Kyn", 0.56, 0.05], ["Aspen", 0.86, 0.02],
    ["Helen", 0.02, 0.46], ["Emily", 0.27, 0.42], ["Echo", 0.52, 0.48], ["Aster", 0.79, 0.44],
    ["Cath", 0.09, 0.96], ["BK", 0.35, 0.90], ["Soojin", 0.61, 0.98], ["Popcorn", 0.88, 0.92]
  ];
  // v3: string endpoints became {type, ...} refs (token or free node) instead
  // of bare token indices, and a "nodes" list of free anchor points was
  // added — bump the storage key so an old v2 blob is never misread.
  const KEY = "vialbottom-board-v3";
  const TOKEN_SIZE = 84;
  const STRING_COLOR = "#a8322b";
  const NW = 186, NH = 140;
  const cl = (v) => Math.max(0, Math.min(1, v));

  const HINTS = {
    select: "Drag a token, note, shape or anchor point. Click a string to drop an anchor and bend its path — drag anchors to steer, double-click or press Delete to remove one.",
    string: "Click a token, or an empty spot on the board, to start a string — then click another token or spot to finish it. Clicking an existing anchor point continues a string from there.",
    note: "Click anywhere on the board to pin a note.",
    ellipse: "Drag to ring a group of suspects.",
    arrow: "Drag to point one thing at another."
  };

  class Board extends React.Component {
    constructor(props) {
      super(props);
      this.boardEl = null;
      this.ro = null;
      this._polling = false;
      this._dead = false;

      this.state = Object.assign({
        tool: "select", bw: 0, bh: 0, showNames: false,
        tokens: ROSTER.map(([name, fx, fy]) => ({ name, fx, fy })),
        links: [], shapes: [], notes: [], nodes: [],
        sel: null, pending: null, hover: null, draft: null, drag: null, seq: 1
      }, this.load());

      // Callback ref: measure + observe the moment the node attaches.
      this.setBoard = (el) => {
        if (this.ro) { this.ro.disconnect(); this.ro = null; }
        this.boardEl = el || null;
        if (!el) return;
        if (window.ResizeObserver) {
          this.ro = new ResizeObserver(() => this.measure());
          this.ro.observe(el);
        }
        this.poll();
      };
    }

    load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY) || "null");
        if (!d || !Array.isArray(d.tokens) || !d.tokens.length || d.tokens[0].fx === undefined) return {};
        const fix = (o) => Object.assign({}, o, { fx: cl(o.fx), fy: cl(o.fy) });
        return {
          tokens: d.tokens.map(fix), links: d.links || [],
          shapes: d.shapes || [], notes: (d.notes || []).map(fix),
          nodes: (d.nodes || []).map(fix), seq: d.seq || 1
        };
      } catch (e) { return {}; }
    }
    save() {
      const s = this.state;
      try {
        localStorage.setItem(KEY, JSON.stringify({
          tokens: s.tokens, links: s.links, shapes: s.shapes,
          notes: s.notes, nodes: s.nodes, seq: s.seq
        }));
      } catch (e) {}
    }
    componentDidUpdate() { this.save(); }

    componentDidMount() {
      this.poll();
      this.onResize = () => { this.measure(); this.poll(); };
      window.addEventListener("resize", this.onResize);
      this.onKey = (e) => {
        const tag = (e.target && e.target.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.key === "Escape") { this.setState({ sel: null, pending: null, draft: null }); return; }
        if (e.key === "Delete" || e.key === "Backspace") this.removeSel();
      };
      window.addEventListener("keydown", this.onKey);
    }
    componentWillUnmount() {
      this._dead = true;
      window.removeEventListener("keydown", this.onKey);
      window.removeEventListener("resize", this.onResize);
      if (this.ro) this.ro.disconnect();
    }

    measure() {
      const el = this.boardEl;
      const w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0;
      if (w && h && (w !== this.state.bw || h !== this.state.bh)) this.setState({ bw: w, bh: h });
    }

    // Unconditional poll until the board has a real size — cannot stall.
    poll() {
      if (this._polling) return;
      this._polling = true;
      const tick = () => {
        if (this._dead) return;
        this.measure();
        if (!this.state.bw || !this.state.bh) requestAnimationFrame(tick);
        else this._polling = false;
      };
      requestAnimationFrame(tick);
    }

    d() { return TOKEN_SIZE; }
    stringColor() { return STRING_COLOR; }

    // Auto-grow a note or string-label textarea to fit its content instead of
    // clipping or scrolling it.
    autosize(el) {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    pt(e) {
      const r = this.boardEl.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    // fraction → px for an item of the given span
    fx2px(f, span, total) { return cl(f) * Math.max(0, total - span); }
    px2fx(px, span, total) { return cl(px / Math.max(1, total - span)); }
    tokenCenter(t) {
      const s = this.state, d = this.d();
      return { x: this.fx2px(t.fx, d, s.bw) + d / 2, y: this.fx2px(t.fy, d, s.bh) + d / 2 };
    }
    // nearest point on segment PQ to p: {dist, t}
    proj(p, P, Q) {
      const vx = Q.x - P.x, vy = Q.y - P.y, len2 = vx * vx + vy * vy || 1;
      let t = ((p.x - P.x) * vx + (p.y - P.y) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      return { t, dist: Math.hypot(p.x - (P.x + vx * t), p.y - (P.y + vy * t)) };
    }
    nextId(pfx) { const n = this.state.seq; this.setState({ seq: n + 1 }); return pfx + n; }

    // A string endpoint is either a token ({type:"token", i}) or a free
    // anchor point pinned in empty space ({type:"node", id}).
    endpointCenter(ref) {
      if (!ref) return null;
      const s = this.state;
      if (ref.type === "node") {
        const n = s.nodes.find((x) => x.id === ref.id);
        return n ? { x: cl(n.fx) * s.bw, y: cl(n.fy) * s.bh } : null;
      }
      const t = s.tokens[ref.i];
      return t ? this.tokenCenter(t) : null;
    }
    endpointsEqual(a, b) {
      if (!a || !b || a.type !== b.type) return false;
      return a.type === "token" ? a.i === b.i : a.id === b.id;
    }
    refIsNode(ref, id) { return !!ref && ref.type === "node" && ref.id === id; }

    // Shared by tokens and free anchor points: first click starts a pending
    // string from this endpoint, a second click on a different endpoint
    // finishes it, and clicking the same endpoint again cancels it.
    pickEndpoint(ref, e) {
      e.stopPropagation();
      const s = this.state;
      if (s.pending == null) { this.setState({ pending: ref, hover: this.pt(e) }); return; }
      if (this.endpointsEqual(s.pending, ref)) { this.setState({ pending: null }); return; }
      const id = this.nextId("l"), a = s.pending;
      this.setState((st) => ({ links: st.links.concat([{ id, a, b: ref, label: "", anchors: [], labelSeg: 0 }]), pending: null, sel: null, tool: "select" }));
    }

    // Removes one bend anchor from a string (keeping the string itself).
    removeAnchor(linkId, i) {
      this.setState((st) => ({
        links: st.links.map((x) => {
          if (x.id !== linkId) return x;
          const seg = Math.max(0, Math.min(x.labelSeg || 0, (x.anchors || []).length));
          return Object.assign({}, x, {
            anchors: (x.anchors || []).filter((_, k) => k !== i),
            labelSeg: seg > i ? seg - 1 : seg
          });
        }),
        sel: null
      }));
    }

    onBoardDown(e) {
      if (e.button !== 0 || !this.boardEl || !this.state.bw || !this.state.bh) return;
      const p = this.pt(e), s = this.state;
      if (s.tool === "string") {
        // Clicking empty space with the String tool pins a free anchor point
        // right there, and uses it as a string endpoint like a token.
        const id = this.nextId("v");
        this.setState((st) => ({ nodes: st.nodes.concat([{ id, fx: cl(p.x / st.bw), fy: cl(p.y / st.bh) }]) }));
        this.pickEndpoint({ type: "node", id }, e);
        return;
      }
      if (s.tool === "note") {
        const id = this.nextId("n");
        this.setState((st) => ({
          notes: st.notes.concat([{ id, fx: this.px2fx(p.x - NW / 2, NW, st.bw), fy: this.px2fx(p.y - 40, NH, st.bh), text: "" }]),
          sel: { kind: "note", id }, tool: "select"
        }));
        return;
      }
      if (s.tool === "ellipse" || s.tool === "arrow") {
        this.setState({ draft: { kind: s.tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y }, sel: null });
        return;
      }
      this.setState({ sel: null, pending: null });
    }

    onBoardMove(e) {
      const s = this.state, p = this.pt(e);
      if (s.drag) {
        const g = s.drag;
        if (g.kind === "token") {
          const fx = this.px2fx(p.x - g.dx, this.d(), s.bw), fy = this.px2fx(p.y - g.dy, this.d(), s.bh);
          this.setState((st) => ({ tokens: st.tokens.map((t, i) => i === g.i ? { name: t.name, fx, fy } : t) }));
        } else if (g.kind === "note") {
          const fx = this.px2fx(p.x - g.dx, NW, s.bw), fy = this.px2fx(p.y - g.dy, NH, s.bh);
          this.setState((st) => ({ notes: st.notes.map((n) => n.id === g.id ? Object.assign({}, n, { fx, fy }) : n) }));
        } else if (g.kind === "node") {
          const fx = cl((p.x - g.dx) / s.bw), fy = cl((p.y - g.dy) / s.bh);
          this.setState((st) => ({ nodes: st.nodes.map((n) => n.id === g.id ? Object.assign({}, n, { fx, fy }) : n) }));
        } else if (g.kind === "anchor") {
          const fx = cl(p.x / s.bw), fy = cl(p.y / s.bh);
          this.setState((st) => ({ links: st.links.map((l) => l.id === g.id ? Object.assign({}, l, { anchors: (l.anchors || []).map((a, i) => i === g.i ? { fx, fy } : a) }) : l) }));
        } else if (g.kind === "shape") {
          const fx1 = cl((p.x - g.dx) / s.bw), fy1 = cl((p.y - g.dy) / s.bh);
          this.setState((st) => ({ shapes: st.shapes.map((sh) => sh.id === g.id ? Object.assign({}, sh, { fx1, fy1, fx2: fx1 + g.w, fy2: fy1 + g.h }) : sh) }));
        }
        return;
      }
      if (s.draft) {
        this.setState((st) => ({ draft: Object.assign({}, st.draft, { x2: p.x, y2: p.y }) }));
      } else if (s.pending != null) {
        this.setState({ hover: p });
      }
    }

    onBoardUp() {
      const s = this.state;
      if (s.drag) { this.setState({ drag: null }); return; }
      if (!s.draft) return;
      const d = s.draft;
      const big = Math.abs(d.x2 - d.x1) > 12 || Math.abs(d.y2 - d.y1) > 12;
      const id = this.nextId("s");
      this.setState((st) => ({
        draft: null, tool: "select",
        shapes: big ? st.shapes.concat([{ id, kind: d.kind, fx1: d.x1 / st.bw, fy1: d.y1 / st.bh, fx2: d.x2 / st.bw, fy2: d.y2 / st.bh }]) : st.shapes,
        sel: big ? { kind: "shape", id } : null
      }));
    }

    removeSel() {
      const sel = this.state.sel;
      if (!sel) return;
      if (sel.kind === "note") { this.setState((s) => ({ notes: s.notes.filter((n) => n.id !== sel.id), sel: null })); return; }
      if (sel.kind === "shape") { this.setState((s) => ({ shapes: s.shapes.filter((x) => x.id !== sel.id), sel: null })); return; }
      if (sel.kind === "node") {
        this.setState((s) => ({
          nodes: s.nodes.filter((n) => n.id !== sel.id),
          links: s.links.filter((l) => !this.refIsNode(l.a, sel.id) && !this.refIsNode(l.b, sel.id)),
          sel: null
        }));
        return;
      }
      if (sel.kind === "link") {
        // A specific anchor was focused (clicked, or just dropped): remove
        // just that anchor. Otherwise remove the whole string.
        if (sel.anchorIndex != null) { this.removeAnchor(sel.id, sel.anchorIndex); return; }
        this.setState((s) => ({ links: s.links.filter((l) => l.id !== sel.id), sel: null }));
      }
    }

    tapToken(i, e) {
      e.stopPropagation();
      if (!this.state.bw) this.measure();
      const s = this.state;
      if (s.tool === "string") { this.pickEndpoint({ type: "token", i }, e); return; }
      const p = this.pt(e), t = s.tokens[i], d = this.d();
      this.setState({
        sel: { kind: "token", i },
        drag: { kind: "token", i, dx: p.x - this.fx2px(t.fx, d, s.bw), dy: p.y - this.fx2px(t.fy, d, s.bh) }
      });
    }

    tapNode(id, e) {
      e.stopPropagation();
      if (!this.state.bw) this.measure();
      const s = this.state;
      if (s.tool === "string") { this.pickEndpoint({ type: "node", id }, e); return; }
      const node = s.nodes.find((n) => n.id === id);
      if (!node) return;
      const p = this.pt(e);
      this.setState({
        sel: { kind: "node", id },
        drag: { kind: "node", id, dx: p.x - cl(node.fx) * s.bw, dy: p.y - cl(node.fy) * s.bh }
      });
    }

    exportPng() {
      const el = this.boardEl;
      if (!el || !window.html2canvas) return;
      this.setState({ sel: null, pending: null });
      setTimeout(() => {
        window.html2canvas(el, {
          backgroundColor: "#0b0c11", scale: 2, useCORS: true,
          // html2canvas can't render a <textarea>'s wrapped, multi-line
          // value — it flattens it to one line. Swap each one for a plain
          // div with the same text and styling in the cloned document that's
          // actually rasterized, so notes and string labels export correctly.
          onclone: (doc) => {
            doc.querySelectorAll("textarea").forEach((ta) => {
              const view = ta.ownerDocument.defaultView || window;
              const cs = view.getComputedStyle(ta);
              const div = doc.createElement("div");
              div.className = ta.className;
              div.textContent = ta.value;
              div.style.cssText = ta.style.cssText;
              div.style.whiteSpace = "pre-wrap";
              div.style.wordBreak = "break-word";
              div.style.overflow = "hidden";
              div.style.font = cs.font;
              div.style.color = cs.color;
              div.style.textAlign = cs.textAlign;
              div.style.padding = cs.padding;
              div.style.lineHeight = cs.lineHeight;
              div.style.width = cs.width;
              div.style.minHeight = cs.minHeight;
              ta.replaceWith(div);
            });
          }
        }).then((cv) => {
          const a = document.createElement("a");
          a.download = "vialbottom-board.png";
          a.href = cv.toDataURL("image/png");
          a.click();
        });
      }, 60);
    }

    resetBoard() {
      this.setState({
        links: [], shapes: [], notes: [], nodes: [], sel: null, pending: null, draft: null,
        tokens: ROSTER.map(([name, fx, fy]) => ({ name, fx, fy }))
      });
    }

    render() {
      const s = this.state, d = this.d(), sc = this.stringColor(), sel = s.sel || {};
      const ready = s.bw > 0 && s.bh > 0;

      const tokens = s.tokens.map((t, i) => {
        // Label sits below the token, but flips above near the board's bottom edge
        // (the board clips overflow). Z-order favours the side the label points to.
        const flip = cl(t.fy) > 0.82;
        const lift = s.showNames ? Math.round((flip ? cl(t.fy) : 1 - cl(t.fy)) * 20) : 0;
        const ringed = (sel.kind === "token" && sel.i === i) || (s.pending && s.pending.type === "token" && s.pending.i === i);
        return (
          <div
            key={t.name}
            className="vb-token"
            title={t.name}
            onPointerDown={(e) => this.tapToken(i, e)}
            style={{
              left: "calc(" + cl(t.fx) + " * (100% - " + d + "px))",
              top: "calc(" + cl(t.fy) + " * (100% - " + d + "px))",
              width: d + "px", height: d + "px", zIndex: 9 + lift,
              backgroundImage: 'url("tokens/' + t.name + '.png")'
            }}
          >
            {ringed && <span className="vb-token-ring" />}
            {s.showNames && (
              <span
                className="vb-token-label"
                style={{
                  top: flip ? "auto" : "100%", bottom: flip ? "100%" : "auto",
                  marginTop: flip ? 0 : "7px", marginBottom: flip ? "7px" : 0
                }}
              >
                {t.name}
              </span>
            )}
          </div>
        );
      });

      const nodeEls = s.nodes.map((n) => {
        const pending = !!(s.pending && s.pending.type === "node" && s.pending.id === n.id);
        const selected = sel.kind === "node" && sel.id === n.id;
        return (
          <div
            key={n.id}
            className="vb-node"
            title="Anchor point"
            onPointerDown={(e) => this.tapNode(n.id, e)}
            style={{ left: cl(n.fx) * 100 + "%", top: cl(n.fy) * 100 + "%", zIndex: 8 }}
          >
            {(selected || pending) && <span className="vb-node-ring" />}
          </div>
        );
      });

      const anchorDots = [];
      const anchorChips = [];
      const strings = !ready ? [] : s.links.filter((l) => this.endpointCenter(l.a) && this.endpointCenter(l.b)).map((l) => {
        const A = this.endpointCenter(l.a), B = this.endpointCenter(l.b);
        const anchors = (l.anchors || []);
        const pts = [A].concat(anchors.map((a) => ({ x: cl(a.fx) * s.bw, y: cl(a.fy) * s.bh }))).concat([B]);
        const isSel = sel.kind === "link" && sel.id === l.id;

        let dStr = "M " + A.x + " " + A.y;
        const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const P = pts[i], Q = pts[i + 1];
          const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
          const sag = Math.min(46, Math.hypot(Q.x - P.x, Q.y - P.y) * 0.09) / Math.max(1, pts.length - 1);
          dStr += " Q " + mx + " " + (my + sag * 2) + " " + Q.x + " " + Q.y;
          segs.push({ x: mx, y: my + sag });
        }
        // The label lives on one segment of the string and stays there as anchors are added.
        const li = Math.max(0, Math.min(l.labelSeg || 0, segs.length - 1));
        const lp = segs[li];

        anchors.forEach((a, i) => {
          const anchorSel = isSel && sel.anchorIndex === i;
          anchorDots.push({
            id: l.id + ":" + i,
            cx: cl(a.fx) * s.bw, cy: cl(a.fy) * s.bh, r: isSel ? 6 : 4.5,
            fill: isSel ? "#f4ecd2" : sc,
            down: (e) => {
              e.stopPropagation();
              this.setState({ sel: { kind: "link", id: l.id, anchorIndex: i }, drag: { kind: "anchor", id: l.id, i } });
            },
            remove: (e) => { e.stopPropagation(); this.removeAnchor(l.id, i); }
          });
          // A focused anchor gets its own × chip, so it can be deleted
          // without cutting the whole string (Delete/Backspace does the same).
          if (anchorSel) {
            anchorChips.push({
              id: l.id + ":" + i,
              chipPos: { left: (cl(a.fx) * s.bw + 9) + "px", top: (cl(a.fy) * s.bh - 20) + "px" },
              stop: (e) => e.stopPropagation(),
              remove: (e) => { e.stopPropagation(); this.removeAnchor(l.id, i); }
            });
          }
        });

        const addAnchor = (e) => {
          e.stopPropagation();
          const p = this.pt(e);
          let best = 0, bd = Infinity, bt = 0.5;
          for (let i = 0; i < pts.length - 1; i++) {
            const r = this.proj(p, pts[i], pts[i + 1]);
            if (r.dist < bd) { bd = r.dist; best = i; bt = r.t; }
          }
          // Label keeps its side of the new anchor.
          let newSeg = li;
          if (best < li) newSeg = li + 1;
          else if (best === li && bt <= 0.5) newSeg = li + 1;
          const fx = cl(p.x / s.bw), fy = cl(p.y / s.bh);
          this.setState((st) => ({
            links: st.links.map((x) => x.id === l.id
              ? Object.assign({}, x, { anchors: (x.anchors || []).slice(0, best).concat([{ fx, fy }], (x.anchors || []).slice(best)), labelSeg: newSeg })
              : x),
            sel: { kind: "link", id: l.id, anchorIndex: best },
            drag: { kind: "anchor", id: l.id, i: best }
          }));
        };

        return {
          id: l.id,
          d: dStr,
          stroke: sc, w: isSel ? 4.5 : 3, label: l.label, sel: isSel,
          labelPos: { left: lp.x + "px", top: lp.y + "px" },
          stop: (e) => e.stopPropagation(),
          down: addAnchor,
          setLabel: (e) => { const v = e.target.value; this.setState((st) => ({ links: st.links.map((x) => x.id === l.id ? Object.assign({}, x, { label: v }) : x) })); },
          remove: (e) => { e.stopPropagation(); this.setState((st) => ({ links: st.links.filter((x) => x.id !== l.id), sel: null })); }
        };
      });

      const abs = (sh) => ({ x1: sh.fx1 * s.bw, y1: sh.fy1 * s.bh, x2: sh.fx2 * s.bw, y2: sh.fy2 * s.bh });
      const shapeDown = (sh) => (e) => {
        e.stopPropagation();
        const p = this.pt(e), a = abs(sh);
        this.setState({ sel: { kind: "shape", id: sh.id }, drag: { kind: "shape", id: sh.id, dx: p.x - a.x1, dy: p.y - a.y1, w: sh.fx2 - sh.fx1, h: sh.fy2 - sh.fy1 } });
      };

      const ellipses = !ready ? [] : s.shapes.filter((x) => x.kind === "ellipse").map((sh) => {
        const a = abs(sh);
        return {
          id: sh.id,
          cx: (a.x1 + a.x2) / 2, cy: (a.y1 + a.y2) / 2,
          rx: Math.abs(a.x2 - a.x1) / 2, ry: Math.abs(a.y2 - a.y1) / 2,
          sel: sel.kind === "shape" && sel.id === sh.id, down: shapeDown(sh)
        };
      });

      const arrows = !ready ? [] : s.shapes.filter((x) => x.kind === "arrow").map((sh) => {
        const a = abs(sh);
        return { id: sh.id, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: sel.kind === "shape" && sel.id === sh.id ? "#ecddae" : "#c9ae63", down: shapeDown(sh) };
      });

      const shapeChips = !ready ? [] : s.shapes.filter((sh) => sel.kind === "shape" && sel.id === sh.id).map((sh) => {
        const a = abs(sh);
        return {
          id: sh.id,
          chipPos: { left: (Math.max(a.x1, a.x2) - 8) + "px", top: (Math.min(a.y1, a.y2) - 10) + "px" },
          stop: (e) => e.stopPropagation(),
          remove: (e) => { e.stopPropagation(); this.setState((st) => ({ shapes: st.shapes.filter((x) => x.id !== sh.id), sel: null })); }
        };
      });

      const notes = s.notes.map((n) => ({
        id: n.id,
        text: n.text,
        pos: {
          left: "calc(" + cl(n.fx) + " * (100% - " + NW + "px))",
          top: "calc(" + cl(n.fy) + " * (100% - " + NH + "px))",
          width: NW + "px"
        },
        sel: sel.kind === "note" && sel.id === n.id,
        stop: (e) => { e.stopPropagation(); this.setState({ sel: { kind: "note", id: n.id } }); },
        down: (e) => {
          e.stopPropagation();
          const p = this.pt(e);
          this.setState({ sel: { kind: "note", id: n.id }, drag: { kind: "note", id: n.id, dx: p.x - this.fx2px(n.fx, NW, s.bw), dy: p.y - this.fx2px(n.fy, NH, s.bh) } });
        },
        setText: (e) => { const v = e.target.value; this.setState((st) => ({ notes: st.notes.map((x) => x.id === n.id ? Object.assign({}, x, { text: v }) : x) })); },
        remove: (e) => { e.stopPropagation(); this.setState((st) => ({ notes: st.notes.filter((x) => x.id !== n.id), sel: null })); }
      }));

      let draft = null, draftIsEllipse = false, draftIsArrow = false, draftIsString = false;
      if (s.draft) {
        const dr = s.draft;
        draftIsEllipse = dr.kind === "ellipse"; draftIsArrow = dr.kind === "arrow";
        draft = { x1: dr.x1, y1: dr.y1, x2: dr.x2, y2: dr.y2, cx: (dr.x1 + dr.x2) / 2, cy: (dr.y1 + dr.y2) / 2, rx: Math.abs(dr.x2 - dr.x1) / 2, ry: Math.abs(dr.y2 - dr.y1) / 2 };
      } else if (s.pending && s.hover && ready) {
        const A = this.endpointCenter(s.pending);
        if (A) { draftIsString = true; draft = { x1: A.x, y1: A.y, x2: s.hover.x, y2: s.hover.y, stroke: sc }; }
      }

      const hint = s.pending != null ? "Now click a second token or empty spot — or press Escape to drop the string." : HINTS[s.tool];

      return (
        <div className="vb-page">
          <header className="vb-header">
            <div className="vb-header-titles">
              <span className="vb-eyebrow">Starfall Academy · Bonus Dossier</span>
              <h1 className="vb-title">The Vialbottom Board</h1>
              <p className="vb-subtitle">There's a case to solve. Enough red string will get to the bottom of this.</p>
            </div>

            <div className="vb-header-controls">
              <div className="vb-toggle-group">
                <button
                  type="button"
                  className="vb-toggle-btn"
                  onClick={() => this.setState((st) => ({ showNames: !st.showNames }))}
                  title="Show name labels on tokens"
                >
                  <span className="vb-toggle-track">
                    <span
                      className="vb-toggle-knob"
                      style={{
                        left: s.showNames ? "14px" : "1px",
                        background: s.showNames ? "linear-gradient(150deg, #e8d49a, #b99d53)" : "#5a5a66"
                      }}
                    />
                  </span>
                  <span>Names</span>
                </button>
              </div>

              <div className="vb-tool-group">
                <button type="button" className="vb-tool-btn" onClick={() => this.setState({ tool: "select", pending: null, draft: null })} title="Select and move">
                  <span>Move</span>
                  {s.tool === "select" && <span className="vb-tool-underline" />}
                </button>
                <button type="button" className="vb-tool-btn" onClick={() => this.setState({ tool: "string", pending: null, draft: null, sel: null })} title="Draw red string between two tokens or anchor points">
                  <span>String</span>
                  {s.tool === "string" && <span className="vb-tool-underline vb-tool-underline--string" />}
                </button>
                <button type="button" className="vb-tool-btn" onClick={() => this.setState({ tool: "note", pending: null, draft: null, sel: null })} title="Pin a note">
                  <span>Note</span>
                  {s.tool === "note" && <span className="vb-tool-underline" />}
                </button>
                <button type="button" className="vb-tool-btn" onClick={() => this.setState({ tool: "ellipse", pending: null, draft: null, sel: null })} title="Drag to draw a ring">
                  <span>Ring</span>
                  {s.tool === "ellipse" && <span className="vb-tool-underline" />}
                </button>
                <button type="button" className="vb-tool-btn" onClick={() => this.setState({ tool: "arrow", pending: null, draft: null, sel: null })} title="Drag to draw an arrow">
                  <span>Arrow</span>
                  {s.tool === "arrow" && <span className="vb-tool-underline" />}
                </button>
              </div>

              <button type="button" className="vb-btn-export" onClick={() => this.exportPng()}>Export</button>
              <button type="button" className="vb-btn-reset" onClick={() => this.resetBoard()}>Reset</button>
            </div>
          </header>

          <div className="vb-board-area">
            <div
              ref={this.setBoard}
              className="vb-board"
              onPointerDown={(e) => this.onBoardDown(e)}
              onPointerMove={(e) => this.onBoardMove(e)}
              onPointerUp={() => this.onBoardUp()}
            >
              <div className="vb-board-grid" />
              <img className="vb-board-crest" src="assets/crest-lines.png" alt="" draggable="false" />
              <div className="vb-board-vignette" />

              <svg className="vb-board-svg">
                <defs>
                  <marker id="vb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#c9ae63" />
                  </marker>
                </defs>

                {ellipses.map((e) => (
                  <g key={e.id}>
                    <ellipse className="vb-shape-ellipse" cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="rgba(185,157,83,0.05)" stroke="#b99d53" strokeWidth="2" strokeDasharray="7 6" onPointerDown={e.down} />
                    {e.sel && <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="none" stroke="#ecddae" strokeWidth="1" pointerEvents="none" />}
                  </g>
                ))}

                {arrows.map((a) => (
                  <g key={a.id}>
                    <line className="vb-shape-arrow-hit" x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="transparent" strokeWidth="16" onPointerDown={a.down} />
                    <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.stroke} strokeWidth="2.5" markerEnd="url(#vb-arrow)" pointerEvents="none" />
                  </g>
                ))}

                {strings.map((l) => (
                  <g key={l.id}>
                    <path d={l.d} fill="none" stroke="transparent" strokeWidth="18" onPointerDown={l.down} style={{ cursor: "copy" }} />
                    <path d={l.d} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="4" transform="translate(1.5,2.5)" pointerEvents="none" />
                    <path d={l.d} fill="none" stroke={l.stroke} strokeWidth={l.w} strokeLinecap="round" pointerEvents="none" />
                    <path d={l.d} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.9" pointerEvents="none" />
                  </g>
                ))}

                {anchorDots.map((p) => (
                  <g key={p.id}>
                    <circle cx={p.cx} cy={p.cy} r="11" fill="transparent" onPointerDown={p.down} onDoubleClick={p.remove} style={{ cursor: "move" }} />
                    <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} stroke="#0b0c11" strokeWidth="1.5" pointerEvents="none" />
                  </g>
                ))}

                {draft && (
                  <g pointerEvents="none">
                    {draftIsEllipse && <ellipse cx={draft.cx} cy={draft.cy} rx={draft.rx} ry={draft.ry} fill="rgba(185,157,83,0.05)" stroke="#c9ae63" strokeWidth="2" strokeDasharray="7 6" />}
                    {draftIsArrow && <line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke="#c9ae63" strokeWidth="2.5" markerEnd="url(#vb-arrow)" />}
                    {draftIsString && <line x1={draft.x1} y1={draft.y1} x2={draft.x2} y2={draft.y2} stroke={draft.stroke} strokeWidth="2" strokeDasharray="6 6" />}
                  </g>
                )}
              </svg>

              {shapeChips.map((sc_) => (
                <div key={sc_.id} style={{ position: "absolute", zIndex: 6, ...sc_.chipPos }} onPointerDown={sc_.stop}>
                  <button type="button" className="vb-remove-btn" onClick={sc_.remove} onPointerDown={sc_.stop} title="Remove">×</button>
                </div>
              ))}

              {anchorChips.map((c) => (
                <div key={c.id} style={{ position: "absolute", zIndex: 6, ...c.chipPos }} onPointerDown={c.stop}>
                  <button type="button" className="vb-remove-btn" onClick={c.remove} onPointerDown={c.stop} title="Remove this anchor">×</button>
                </div>
              ))}

              {strings.map((l) => (
                <div key={l.id} className="vb-string-label" style={l.labelPos} onPointerDown={l.stop}>
                  <textarea
                    ref={(el) => this.autosize(el)}
                    className="vb-string-label-input"
                    value={l.label}
                    onChange={l.setLabel}
                    onPointerDown={l.stop}
                    placeholder="label"
                    rows={1}
                  />
                  {l.sel && <button type="button" className="vb-remove-btn" onClick={l.remove} onPointerDown={l.stop} title="Cut the string">×</button>}
                </div>
              ))}

              {notes.map((n) => (
                <div key={n.id} className="vb-note" onPointerDown={n.down} style={n.pos}>
                  <span className="vb-note-pin" />
                  <textarea
                    ref={(el) => this.autosize(el)}
                    className="vb-note-text"
                    value={n.text}
                    onChange={n.setText}
                    onPointerDown={n.stop}
                    placeholder="Note…"
                    rows={1}
                  />
                  {n.sel && <button type="button" className="vb-remove-btn vb-note-remove" onClick={n.remove} onPointerDown={n.stop} title="Remove note">×</button>}
                </div>
              ))}

              {tokens}
              {nodeEls}
            </div>

            <div className="vb-hint-row">
              <span className="vb-hint-label">Hint</span>
              <span className="vb-hint-text">{hint}</span>
            </div>
          </div>
        </div>
      );
    }
  }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<Board />);
})();
