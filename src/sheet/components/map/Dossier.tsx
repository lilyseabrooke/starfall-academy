"use client";

/* ===========================================================================
   Starfall Atlas — dossier panels (typed port of app.js's
   buildCitadelDistrictPanel / buildRegionDossierPanel / buildCitadelZonePanel).
   The generic multi-district dossier (buildGenericDossier) was dead code
   upstream — every region and Citadel district in regions.ts resolves to a
   ZoneHost, never the plain districts-list shape.
   =========================================================================== */
import * as React from "react";
import { GENERIC_BLURBS } from "../../data/map/citadelData";
import type { ZoneHost } from "../../data/map/hosts";
import type { SubArea } from "../../data/map/types";

function zoneLabel(sub: SubArea): string {
  const GENERIC_ZONE_LABEL: Record<string, string> = { "Residential": "Residential Zone", "Class Halls": "Class Hall Zone", "Commercial": "Commercial Zone" };
  return sub.name || (sub.generic && GENERIC_ZONE_LABEL[sub.generic]) || sub.generic || ("Sub-area " + sub.tag);
}

export interface DossierProps {
  host: ZoneHost;
  onBack: () => void;
  zone: SubArea | null;
  onZonePick: (idx: number) => void;
  onZoneBack: () => void;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
}

export function Dossier({ host, onBack, zone, onZonePick, onZoneBack, hoveredIdx, onHover }: DossierProps) {
  // idx must match DistrictField's tile index: position within the enabled
  // (on) subset, not the full A–F array and not the named-only subset.
  const enabledSub = React.useMemo(() => host.sub.filter((a) => a.on), [host.sub]);
  const hasNamedZones = enabledSub.some((a) => a.name);

  if (zone) {
    const nm = zoneLabel(zone);
    return (
      <aside className="dossier">
        <button type="button" className="dossier__back" onClick={onZoneBack}>‹ &nbsp;{host.name}</button>
        <div>
          <div className="dossier__sector">{host.name}</div>
          <h1 className="dossier__name dossier__name--zone">{nm}</h1>
          <div className="dossier__house"><span className="dot" />{host.isRegion ? host.house : "Starfall Citadel"}</div>
        </div>
        <div className="dossier__rule" />
        {zone.blurb ? (
          <p className="dossier__blurb">{zone.blurb}</p>
        ) : zone.generic && GENERIC_BLURBS[zone.generic] ? (
          <p className="dossier__blurb">{GENERIC_BLURBS[zone.generic]}</p>
        ) : (
          <p className="dossier__blurb dossier__blurb--empty">No record yet for this zone.</p>
        )}
        <div className="dossier__facts">
          <div className="fact"><span className="fact__k">{host.isRegion ? "Region" : "District"}</span><span className="fact__v">{host.name}</span></div>
        </div>
        <div className="dossier__decree">Semper ad astra</div>
      </aside>
    );
  }

  return (
    <aside className="dossier">
      <button type="button" className="dossier__back" onClick={onBack}>‹ &nbsp;{host.backLabel}</button>
      <div>
        <div className="dossier__sector">{host.isRegion ? host.sector + " · " + host.coord : host.sector + " · " + host.coord}</div>
        <h1 className="dossier__name">{host.name}</h1>
        <div className="dossier__house"><span className="dot" />{host.house}</div>
      </div>
      <div className="dossier__rule" />
      <p className="dossier__blurb">{host.blurb}</p>
      <div className="dossier__facts">
        {host.facts.map(([k, v]) => (
          <div className="fact" key={k}><span className="fact__k">{k}</span><span className="fact__v">{v}</span></div>
        ))}
      </div>
      {hasNamedZones && (
        <>
          <div className="dossier__districtsHead">Zones</div>
          <div className="dossier__zoneList">
            {enabledSub.map((a, idx) => {
              if (!a.name) return null;
              const active = hoveredIdx === idx;
              return (
                <button
                  key={a.tag} type="button" className={"zoneRow" + (active ? " is-active" : "")}
                  onClick={() => onZonePick(idx)} onMouseEnter={() => onHover(idx)} onMouseLeave={() => onHover(null)}
                >
                  <span className="zoneRow__name">{a.name}</span>
                  <span className="zoneRow__chev">›</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="dossier__decree">Semper ad astra</div>
    </aside>
  );
}
