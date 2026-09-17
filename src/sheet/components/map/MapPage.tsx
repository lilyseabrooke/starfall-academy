"use client";

/* ===========================================================================
   Starfall Academy — Map tab
   Native React/SVG port of the vendored vanilla-JS atlas (see
   design/MAP_PORT_ROADMAP.md). The atlas itself is AtlasMap — no
   iframe/postMessage bridge.

   Whereabouts are set directly on the map: press the pin button, then click
   any location on the atlas (a top-level region, a Citadel district, or a
   nested zone within either) to place yourself there. Pressing the pin
   button again, or clicking empty space, cancels pinning without changing
   your location.
   =========================================================================== */
import * as React from "react";
import { Icon } from "../Icon";
import { AtlasMap } from "./AtlasMap";

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
  const [picking, setPicking] = React.useState(false);

  const handlePick = React.useCallback((regionId: string) => {
    onSetLocation(activeChar, regionId);
    setPicking(false);
  }, [activeChar, onSetLocation]);

  const togglePicking = () => setPicking((cur) => !cur);
  const cancelPicking = () => setPicking(false);
  const clearLocation = () => onSetLocation(activeChar, null);
  const hasLocation = !!locations[activeChar];

  return (
    <div className="sf-map">
      <div className={"sf-map__stage" + (picking ? " is-picking" : "")}>
        <AtlasMap
          roster={roster}
          activeChar={activeChar}
          locations={locations}
          picking={picking}
          onPick={handlePick}
          onCancelPick={cancelPicking}
          focusSignal={focusLocation || null}
        />
        <div className="sf-map__dock">
          {hasLocation && (
            <button type="button" className="sf-map__dock-btn" title="Clear your location" onClick={clearLocation}>
              <Icon name="x" />
            </button>
          )}
          <button
            type="button"
            className={"sf-map__dock-btn sf-map__dock-btn--pin" + (picking ? " is-active" : "")}
            title={picking ? "Click a location on the map…" : "Set your location"}
            aria-pressed={picking}
            onClick={togglePicking}
          >
            <Icon name={picking ? "x" : "map-pin"} />
          </button>
        </div>
      </div>
    </div>
  );
}
