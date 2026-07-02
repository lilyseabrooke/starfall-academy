/* ===========================================================================
   Starfall Family Tree — app shell & wiring (React, Babel)
   =========================================================================== */
(function () {
  const { useState, useRef, useMemo, useEffect, useCallback } = React;
  const TreeCanvas = window.SFT_TreeCanvas;
  const { TopBar, Legend, ZoomControls, DetailModal, FamilyModal } = window.SFT_UI;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "lineStyle": "curved",
    "density": "cosy",
    "canvasBg": "watermark",
    "watermark": 50,
    "nodeStyle": "medallion"
  }/*EDITMODE-END*/;

  const DENSITY = {
    compact: { pxPerYear: 9.5, colGap: 128 },
    cosy:    { pxPerYear: 13,  colGap: 150 },
    airy:    { pxPerYear: 18,  colGap: 186 }
  };

  function App() {
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const data = window.SFT_DATA;
    const L = useMemo(() => window.SFT_LAYOUT.compute(data, DENSITY[t.density] || DENSITY.cosy), [data, t.density]);

    const [selectedId, setSelectedId] = useState(null);
    const [modalId, setModalId] = useState(null);
    const [familyId, setFamilyId] = useState(null);
    const [query, setQuery] = useState("");
    const [filterFamily, setFilterFamily] = useState(null);
    const [show, setShow] = useState({ descent: true, marriage: true, bond: true, sibling: false });
    const canvasRef = useRef(null);

    const onPick = useCallback((id, e, jump) => {
      if (id == null) { setSelectedId(null); setFilterFamily(null); return; }
      setSelectedId(id);
      if (filterFamily && L.nodes[id] && L.nodes[id]._famKey !== filterFamily) setFilterFamily(null);
      if (jump && canvasRef.current) canvasRef.current.focusNode(id);
    }, [filterFamily, L]);

    const jumpTo = useCallback((id) => {
      setModalId(null); setFamilyId(null); setSelectedId(id);
      requestAnimationFrame(() => canvasRef.current && canvasRef.current.focusNode(id));
    }, []);

    const openFamily = useCallback((id) => { setModalId(null); setFamilyId(id); }, []);

    const filterByFamily = useCallback((id) => {
      setFilterFamily((prev) => (prev === id ? null : id));
    }, []);
    const onExpand = useCallback((id) => setModalId(id), []);
    const onFit = useCallback(() => canvasRef.current && canvasRef.current.fitView(true), []);
    const onHome = useCallback(() => canvasRef.current && canvasRef.current.home(), []);
    const onZoom = useCallback((f) => canvasRef.current && canvasRef.current.zoomBy(f), []);

    useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

    useEffect(() => {
      const onKey = (e) => {
        if (e.key !== "Escape") return;
        if (modalId) setModalId(null);
        else if (familyId) setFamilyId(null);
        else if (selectedId) setSelectedId(null);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [modalId, familyId, selectedId]);

    return React.createElement("div", {
      className: "sft-app", "data-bg": t.canvasBg, "data-node": t.nodeStyle,
      style: { "--sft-wm": (t.watermark / 100) }
    },
      React.createElement(TopBar, {
        L, query, onQuery: setQuery, onJump: jumpTo,
        families: L.families, filterFamily, onFilter: setFilterFamily, onFit, onHome
      }),
      React.createElement("div", { className: "sft-stage" },
        React.createElement(TreeCanvas, {
          ref: canvasRef, L, tweaks: { lineStyle: t.lineStyle }, show,
          filterFamily, query, selectedId,
          onPick, onFamily: openFamily, onExpand
        }),
        React.createElement(Legend, {
          show, onToggle: (k, v) => setShow((s) => Object.assign({}, s, { [k]: v })),
          families: L.families, onFamilyKey: filterByFamily, filterFamily
        }),
        React.createElement(ZoomControls, { onZoom, onFit })),

      modalId && React.createElement(DetailModal, { L, id: modalId, onClose: () => setModalId(null), onJump: jumpTo, onFamily: openFamily, present: L.presentYear }),
      familyId && React.createElement(FamilyModal, { L, id: familyId, onClose: () => setFamilyId(null), onJump: jumpTo }),

      React.createElement(window.TweaksPanel, null,
        React.createElement(window.TweakSection, { label: "Connections" }),
        React.createElement(window.TweakRadio, {
          label: "Line style", value: t.lineStyle, options: ["curved", "orthogonal", "ribbon"],
          onChange: (v) => setTweak("lineStyle", v)
        }),
        React.createElement(window.TweakSection, { label: "Canvas" }),
        React.createElement(window.TweakRadio, {
          label: "Density", value: t.density, options: ["compact", "cosy", "airy"],
          onChange: (v) => setTweak("density", v)
        }),
        React.createElement(window.TweakRadio, {
          label: "Backdrop", value: t.canvasBg, options: ["midnight", "watermark", "constellation"],
          onChange: (v) => setTweak("canvasBg", v)
        }),
        React.createElement(window.TweakSlider, {
          label: "Watermark", value: t.watermark, min: 0, max: 100, step: 5, unit: "%",
          onChange: (v) => setTweak("watermark", v)
        }),
        React.createElement(window.TweakSection, { label: "Nodes" }),
        React.createElement(window.TweakRadio, {
          label: "Portrait shape", value: t.nodeStyle, options: ["medallion", "plate"],
          onChange: (v) => setTweak("nodeStyle", v)
        })));
  }

  window.SFT_DATA_READY
    .then(function () {
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(React.createElement(App));
    })
    .catch(function (err) {
      document.getElementById("root").innerHTML =
        '<div style="display:grid;place-items:center;height:100vh;color:#b09060;font-family:sans-serif;background:#0d0b12;font-size:14px">' +
        'Failed to load ledger data — ' + err.message + '</div>';
    });
})();
