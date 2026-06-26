"use client";

/* ===========================================================================
   Starfall Academy — Map tab
   Ported from public/character-sheet/map-tab.jsx (window.SF_MapPage). Embeds the
   standalone campus atlas (still a vendored asset under /public) and brokers
   party whereabouts. The atlas itself is out of scope for F1.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";

interface Zone {
  id: string;
  name: string;
  house_color: string;
}

const FALLBACK_ZONES: Zone[] = [
  { id: "amber-woods", name: "Amber Woods", house_color: "forest" },
  { id: "jewelstone-hollow", name: "Jewelstone Hollow", house_color: "plum" },
  { id: "ryker-cliffs", name: "Ryker Cliffs", house_color: "crimson" },
  { id: "glimmerdeep-lake", name: "Glimmerdeep Lake", house_color: "teal" },
  { id: "the-grounds", name: "The Grounds", house_color: "gold" },
  { id: "starfall-citadel", name: "Starfall Citadel", house_color: "gold" },
];

const TONE_VAR: Record<string, string> = {
  plum: "var(--plum-500)", forest: "var(--forest-500)", teal: "var(--teal-500)",
  crimson: "var(--crimson-500)", gold: "var(--gold-500)",
};
const toneDot = (tone: string | null | undefined) => (tone && TONE_VAR[tone]) || "var(--gold-500)";

export interface MapRosterMember {
  id: string;
  name: string;
  initials: string;
  tone: string;
}

export interface MapPageProps {
  roster: MapRosterMember[];
  activeChar: string;
  locations: Record<string, string | null | undefined>;
  onSetLocation: (id: string, regionId: string | null) => void;
  focusLocation?: unknown;
}

export function MapPage({ roster, activeChar, locations, onSetLocation, focusLocation }: MapPageProps) {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = React.useState(false);
  const [zones, setZones] = React.useState<Zone[]>(FALLBACK_ZONES);
  const [pickTarget, setPickTarget] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const zoneById = React.useMemo(() => {
    const m: Record<string, Zone> = {};
    zones.forEach((z) => (m[z.id] = z));
    return m;
  }, [zones]);

  const pickRef = React.useRef<string | null>(null);
  pickRef.current = pickTarget;

  const post = React.useCallback((msg: unknown) => {
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

  React.useEffect(() => {
    if (ready) pushState();
  }, [ready, pushState]);

  React.useEffect(() => {
    if (!focusLocation || !ready) return;
    post(focusLocation);
  }, [focusLocation, ready, post]);

  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
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

  const startPick = (id: string) => setPickTarget((cur) => (cur === id ? null : id));

  const ordered = React.useMemo(() => {
    const me = roster.filter((r) => r.id === activeChar);
    const rest = roster.filter((r) => r.id !== activeChar);
    return me.concat(rest);
  }, [roster, activeChar]);

  const placedCount = roster.filter((r) => locations[r.id]).length;
  const closePanel = () => {
    setPickTarget(null);
    setPanelOpen(false);
  };

  return (
    <div className={"sf-map" + (panelOpen ? " is-open" : "")}>
      <div className="sf-map__stage">
        <iframe ref={frameRef} className="sf-map__frame" src="/character-sheet/map/index.html" title="Starfall campus map" />
        {!panelOpen && (
          <button type="button" className="sf-map__peek" onClick={() => setPanelOpen(true)} title="Show party whereabouts">
            <Icon name="chevrons-left" />
            <span className="sf-map__peek-label">Whereabouts</span>
            <span className="sf-map__peek-n">{placedCount}/{roster.length}</span>
          </button>
        )}
      </div>

      <aside className="sf-map__panel">
        <div className="sf-map__head">
          <span className="sf-eyebrow">The Party</span>
          <h2>Whereabouts</h2>
          <p>Set where each initiate stands on campus. Everyone&apos;s marker shows on the map so you can read the room at a glance.</p>
          <button type="button" className="sf-map__close" title="Collapse panel" onClick={closePanel}>
            <Icon name="chevrons-right" />
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
                    <select className="sf-map-select" value={loc || ""} onChange={(e) => onSetLocation(r.id, e.target.value || null)}>
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
                      <Icon name={picking ? "x" : "map-pin"} />
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
