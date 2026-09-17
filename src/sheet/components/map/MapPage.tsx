"use client";

/* ===========================================================================
   Starfall Academy — Map tab
   Native React/SVG port of the vendored vanilla-JS atlas (see
   design/MAP_PORT_ROADMAP.md). Owns the whereabouts panel; the atlas itself
   is AtlasMap — no iframe/postMessage bridge.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import { AtlasMap } from "./AtlasMap";
import { REGIONS } from "../../data/map/regions";

interface Zone {
  id: string;
  name: string;
  house_color: string;
}

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

export interface MapFocusSignal {
  regionId?: string;
  isCitadel?: boolean;
  districtName?: string;
}

export interface MapPageProps {
  roster: MapRosterMember[];
  activeChar: string;
  locations: Record<string, string | null | undefined>;
  onSetLocation: (id: string, regionId: string | null) => void;
  focusLocation?: MapFocusSignal | null;
}

export function MapPage({ roster, activeChar, locations, onSetLocation, focusLocation }: MapPageProps) {
  const zones: Zone[] = React.useMemo(
    () => REGIONS.map((r) => ({ id: r.id, name: r.name, house_color: r.house_color })),
    [],
  );
  const zoneById = React.useMemo(() => {
    const m: Record<string, Zone> = {};
    zones.forEach((z) => (m[z.id] = z));
    return m;
  }, [zones]);

  const [pickTarget, setPickTarget] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const startPick = (id: string) => setPickTarget((cur) => (cur === id ? null : id));

  const handlePick = React.useCallback((regionId: string) => {
    if (!pickTarget) return;
    onSetLocation(pickTarget, regionId);
    setPickTarget(null);
  }, [pickTarget, onSetLocation]);

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
      <div className={"sf-map__stage" + (pickTarget ? " is-picking" : "")}>
        <AtlasMap
          roster={roster}
          activeChar={activeChar}
          locations={locations}
          picking={!!pickTarget}
          onPick={handlePick}
          focusSignal={focusLocation || null}
        />
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
