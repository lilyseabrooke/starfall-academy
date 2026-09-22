/* ===========================================================================
   Starfall Academy — Chronicle: app shell & wiring (React, Babel)
   =========================================================================== */
(function () {
  const { useState, useRef, useMemo, useEffect, useCallback } = React;
  const Timeline = window.SFC_Timeline;
  const { TopBar, Places, ZoomControls, CampaignModal } = window.SFC_UI;
  const matches = window.SFC_matches;

  // How many pixels a year is worth. Wider spreads the semesters apart and
  // unstacks campaigns that were sharing a lane; narrower packs them in.
  const SCALES = [80, 110, 150, 200, 265];
  const DEFAULT_SCALE = 2;

  // Wide enough for the roll panel to sit beside the timeline rather than on
  // top of it. Below this the panel is hidden, so the lead-in shrinks too.
  const WIDE = "(min-width: 880px)";

  function App() {
    const data = window.SFC_DATA;
    const [scale, setScale] = useState(DEFAULT_SCALE);
    const [wide, setWide] = useState(function () {
      return typeof window.matchMedia === "function" ? window.matchMedia(WIDE).matches : true;
    });

    useEffect(function () {
      if (typeof window.matchMedia !== "function") return;
      const mq = window.matchMedia(WIDE);
      const onChange = function (e) { setWide(e.matches); };
      mq.addEventListener("change", onChange);
      return function () { mq.removeEventListener("change", onChange); };
    }, []);

    // Enough lead-in before the first campaign that the roll panel never sits
    // on top of it at the timeline's start.
    const sidePad = wide ? 380 : 44;
    const [query, setQuery] = useState("");
    const [filterPlayer, setFilterPlayer] = useState(null);
    const [filterLocation, setFilterLocation] = useState(null);
    const [openId, setOpenId] = useState(null);
    const timelineRef = useRef(null);

    const L = useMemo(function () {
      return window.SFC_LAYOUT.compute(data.CAMPAIGNS, { pxPerYear: SCALES[scale], sidePad: sidePad });
    }, [data, scale, sidePad]);

    const q = query.trim().toLowerCase();
    const dimSet = useMemo(function () {
      if (!q && !filterPlayer && !filterLocation) return null;
      const keep = new Set();
      L.items.forEach(function (c) {
        const byText = matches(c, q);
        const byPlayer = !filterPlayer || c.players.some(function (p) { return p.key === filterPlayer; });
        const byPlace = !filterLocation || (c.location || "").toLowerCase() === filterLocation;
        if (byText && byPlayer && byPlace) keep.add(c.id);
      });
      return keep;
    }, [L, q, filterPlayer, filterLocation]);

    const shown = dimSet ? dimSet.size : L.items.length;
    const filtering = !!(q || filterPlayer || filterLocation);

    const clearAll = useCallback(function () {
      setQuery(""); setFilterPlayer(null); setFilterLocation(null);
    }, []);

    const jumpTo = useCallback(function (id) {
      setOpenId(null);
      if (timelineRef.current) timelineRef.current.focusCampaign(id);
    }, []);

    const followPlayer = useCallback(function (key) {
      setOpenId(null);
      setFilterPlayer(function (prev) { return prev === key ? null : key; });
    }, []);

    const followLocation = useCallback(function (key) {
      setOpenId(null);
      setFilterLocation(function (prev) { return prev === key ? null : key; });
    }, []);

    const onHome = useCallback(function () {
      if (timelineRef.current) timelineRef.current.home();
    }, []);

    const onZoom = useCallback(function (dir) {
      setScale(function (s) { return Math.min(SCALES.length - 1, Math.max(0, s + dir)); });
    }, []);

    // Fit picks the widest scale whose whole world still fits the viewport,
    // falling back to the narrowest when even that won't.
    const onFit = useCallback(function () {
      const vp = timelineRef.current && timelineRef.current.viewport();
      if (!vp) return;
      const avail = vp.clientWidth;
      let best = 0;
      for (let i = 0; i < SCALES.length; i++) {
        const w = window.SFC_LAYOUT.compute(data.CAMPAIGNS, { pxPerYear: SCALES[i], sidePad: sidePad }).worldW;
        if (w <= avail) best = i;
      }
      setScale(best);
      requestAnimationFrame(onHome);
    }, [data, sidePad, onHome]);

    useEffect(function () { if (window.lucide) window.lucide.createIcons(); });

    useEffect(function () {
      const onKey = function (e) {
        if (e.key !== "Escape") return;
        if (openId) setOpenId(null);
        else if (filterPlayer || filterLocation) { setFilterPlayer(null); setFilterLocation(null); }
        else if (query) setQuery("");
      };
      window.addEventListener("keydown", onKey);
      return function () { window.removeEventListener("keydown", onKey); };
    }, [openId, filterPlayer, filterLocation, query]);

    if (!L.items.length) {
      return React.createElement("div", { className: "hst-app" },
        React.createElement("div", { className: "hst-empty" },
          "No campaigns are recorded in the chronicle yet."));
    }

    return React.createElement("div", { className: "hst-app" },
      React.createElement(TopBar, {
        L: L, query: query, onQuery: setQuery, onJump: jumpTo,
        filterPlayer: filterPlayer, onFilter: setFilterPlayer,
        onHome: onHome, shown: shown, total: L.items.length
      }),
      React.createElement("div", { className: "hst-stage" },
        React.createElement(Timeline, {
          ref: timelineRef, L: L, dimSet: dimSet, openId: openId, onOpen: setOpenId
        }),
        React.createElement(Places, { L: L, filterLocation: filterLocation, onFilter: setFilterLocation }),
        React.createElement(ZoomControls, {
          onZoom: onZoom, onFit: onFit,
          canIn: scale < SCALES.length - 1, canOut: scale > 0
        }),
        filtering && shown === 0 && React.createElement("div", { className: "hst-nomatch" },
          React.createElement("div", { className: "hst-nomatch-title" }, "Nothing in the chronicle matches"),
          React.createElement("div", { className: "hst-nomatch-why" },
            [
              q ? "\u201c" + query.trim() + "\u201d" : null,
              filterPlayer ? "played by " + ((L.players.find(function (p) { return p.key === filterPlayer; }) || {}).name || filterPlayer) : null,
              filterLocation ? "in " + ((L.locations.find(function (l) { return l.key === filterLocation; }) || {}).name || filterLocation) : null
            ].filter(Boolean).join(" \u00b7 ")),
          React.createElement("button", { className: "hst-nomatch-clear", onClick: clearAll }, "Clear filters")),
        L.undated.length > 0 && React.createElement("div", { className: "hst-undated" },
          L.undated.length + " campaign" + (L.undated.length === 1 ? "" : "s") + " with no recorded dates " +
          (L.undated.length === 1 ? "is" : "are") + " missing from the timeline.")),
      openId && React.createElement(CampaignModal, {
        c: L.byId[openId], onClose: function () { setOpenId(null); },
        onPlayer: followPlayer, onLocation: followLocation
      }));
  }

  window.SFC_DATA_READY
    .then(function () {
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(React.createElement(App));
    })
    .catch(function (err) {
      document.getElementById("root").innerHTML =
        '<div style="display:grid;place-items:center;height:100vh;color:#b09060;font-family:sans-serif;background:#0d0b12;font-size:14px">' +
        'Failed to load the chronicle — ' + err.message + '</div>';
    });
})();
