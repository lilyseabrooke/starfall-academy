/* ===========================================================================
   Starfall Academy — Map tab
   Embeds the campus atlas (map/index.html) and brokers party whereabouts:
   each character's location is a sheet variable (one of the predefined zones).
   The active player sets their own location; markers for the whole party
   render on the embedded map. (The Storyteller gets a separate viewport.)
   =========================================================================== */
(function () {
  const Ic = window.SF_Ic;

  // Canonical zones (mirrors map/regions.js); the iframe confirms/overrides
  // this list once it reports ready, so house tones stay in sync.
  const FALLBACK_ZONES = [
    { id: "amber-woods",      name: "Amber Woods",       house_color: "forest" },
    { id: "jewelstone-hollow",name: "Jewelstone Hollow", house_color: "plum" },
    { id: "ryker-cliffs",     name: "Ryker Cliffs",      house_color: "crimson" },
    { id: "glimmerdeep-lake", name: "Glimmerdeep Lake",  house_color: "teal" },
    { id: "the-grounds",      name: "The Grounds",       house_color: "gold" },
    { id: "starfall-citadel", name: "Starfall Citadel",  house_color: "gold" },
  ];

  const TONE_VAR = {
    plum: "var(--plum-500)", forest: "var(--forest-500)", teal: "var(--teal-500)",
    crimson: "var(--crimson-500)", gold: "var(--gold-500)",
  };
  const toneDot = (tone) => TONE_VAR[tone] || "var(--gold-500)";

  function MapPage({ roster, activeChar, locations, onSetLocation, focusLocation }) {
    const frameRef = React.useRef(null);
    const [ready, setReady] = React.useState(false);
    const [zones, setZones] = React.useState(FALLBACK_ZONES);
    const [pickTarget, setPickTarget] = React.useState(null);
    const [panelOpen, setPanelOpen] = React.useState(false);

    const zoneById = React.useMemo(() => {
      const m = {}; zones.forEach((z) => (m[z.id] = z)); return m;
    }, [zones]);

    // keep a live ref for the message handler (avoids stale closures)
    const pickRef = React.useRef(null);
    pickRef.current = pickTarget;

    const post = React.useCallback((msg) => {
      const w = frameRef.current && frameRef.current.contentWindow;
      if (w) w.postMessage(msg, "*");
    }, []);

    const pushState = React.useCallback(() => {
      post({
        type: "sf-map-state",
        selfId: activeChar,
        pickId: pickTarget,
        roster: roster.map((r) => ({ id: r.id, name: r.name, initials: r.initials, tone: r.tone })),
        locations,
        pick: !!pickTarget,
      });
    }, [post, activeChar, pickTarget, roster, locations]);

    // re-push whenever inputs change (once the iframe is live)
    React.useEffect(() => { if (ready) pushState(); }, [ready, pushState]);

    // Forward search-menu focus requests to the iframe
    React.useEffect(() => {
      if (!focusLocation || !ready) return;
      post(focusLocation);
    }, [focusLocation, ready, post]);

    // listen to the embedded map
    React.useEffect(() => {
      const onMsg = (e) => {
        const d = e && e.data;
        if (!d || !d.type) return;
        if (d.type === "sf-map-ready") {
          if (Array.isArray(d.zones) && d.zones.length) setZones(d.zones);
          setReady(true);
        } else if (d.type === "sf-map-pick") {
          const tgt = pickRef.current;
          if (tgt && d.regionId) onSetLocation(tgt, d.regionId);
          setPickTarget(null);
        } else if (d.type === "sf-map-pick-cancel") {
          setPickTarget(null);
        }
      };
      window.addEventListener("message", onMsg);
      return () => window.removeEventListener("message", onMsg);
    }, [onSetLocation]);

    const startPick = (id) => setPickTarget((cur) => (cur === id ? null : id));

    // sort: the active character first, then the rest in roster order
    const ordered = React.useMemo(() => {
      const me = roster.filter((r) => r.id === activeChar);
      const rest = roster.filter((r) => r.id !== activeChar);
      return me.concat(rest);
    }, [roster, activeChar]);

    const placedCount = roster.filter((r) => locations[r.id]).length;
    const closePanel = () => { setPickTarget(null); setPanelOpen(false); };

    return (
      <div className={"sf-map" + (panelOpen ? " is-open" : "")}>
        <div className="sf-map__stage">
          <iframe ref={frameRef} className="sf-map__frame" src="map/index.html" title="Starfall campus map" />
          {!panelOpen && (
            <button type="button" className="sf-map__peek" onClick={() => setPanelOpen(true)} title="Show party whereabouts">
              <Ic name="chevrons-left" />
              <span className="sf-map__peek-label">Whereabouts</span>
              <span className="sf-map__peek-n">{placedCount}/{roster.length}</span>
            </button>
          )}
        </div>

        <aside className="sf-map__panel">
          <div className="sf-map__head">
            <span className="sf-eyebrow">The Party</span>
            <h2>Whereabouts</h2>
            <p>Set where each initiate stands on campus. Everyone's marker shows on the map so you can read the room at a glance.</p>
            <button type="button" className="sf-map__close" title="Collapse panel" onClick={closePanel}>
              <Ic name="chevrons-right" />
            </button>
          </div>

          <div className="sf-map__list">
            {ordered.map((r) => {
              const isSelf = r.id === activeChar;
              const loc = locations[r.id];
              const zone = loc ? zoneById[loc] : null;
              const picking = pickTarget === r.id;
              return (
                <div key={r.id} className={"sf-loc" + (isSelf ? " is-self" : "")}>
                  <div className="sf-loc__top">
                    <span className={"sf-loc__av t-" + (r.tone || "gold")}>{r.initials}</span>
                    <span className="sf-loc__id">
                      <span className="sf-loc__name">{r.name}</span>
                      {isSelf && <span className="sf-loc__you">You</span>}
                    </span>
                    <span className="sf-loc__where">
                      <span className="sf-loc__dot" style={{ background: toneDot(zone && zone.house_color) }} />
                      {zone ? zone.name : "Unplaced"}
                    </span>
                  </div>

                  {isSelf && (
                    <div className="sf-loc__edit">
                      <select
                        className="sf-map-select"
                        value={loc || ""}
                        onChange={(e) => onSetLocation(r.id, e.target.value || null)}
                      >
                        <option value="">— Unplaced —</option>
                        {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className={"sf-loc__pin" + (picking ? " is-active" : "")}
                        title={picking ? "Click a region on the map…" : "Place on the map"}
                        aria-pressed={picking}
                        onClick={() => startPick(r.id)}
                      >
                        <Ic name={picking ? "x" : "map-pin"} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    );
  }

  window.SF_MapPage = MapPage;
})();
