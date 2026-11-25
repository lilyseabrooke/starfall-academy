"use client";

/* ===========================================================================
   Starfall Atlas — top-level nav orchestration (typed port of the view-state
   half of app.js: openSubmap/openDistrict/openLocationZone/zonePick/
   selectZone/deselectZone/closeSubmap/goCampus/enterCitadel/exitCitadel).
   Owns which of {world map, centrepiece map, region dossier, district
   dossier, zone dossier} is showing and renders AtlasStage + the submap
   dossier pane. Draws whichever AtlasDefinition it is given (the campus's
   centrepiece is the Starfall Citadel, hence the "citadel" naming).
   =========================================================================== */
import * as React from "react";
import { Dossier } from "./Dossier";
import { DistrictField } from "./DistrictField";
import { AtlasStage, type Crumb } from "./AtlasStage";
import { centrepieceRegion, computeCitadelCells, computeWorldCells, districtHost, pickPrefixForHost, regionHost, type ZoneHost } from "../../data/map/hosts";
import { seedSlug } from "../../data/map/citadelData";
import type { AtlasDefinition, DistrictSeed, SubArea } from "../../data/map/types";
import type { MapRosterMember } from "./MapPage";

type Nav =
  | { view: "world" }
  | { view: "citadel" }
  | { view: "region"; regionId: string; zoneIdx: number | null }
  | { view: "district"; districtIdx: number; zoneIdx: number | null };

export interface AtlasMapProps {
  atlas: AtlasDefinition;
  roster: MapRosterMember[];
  activeChar: string;
  locations: Record<string, string | null | undefined>;
  picking: boolean;
  onPick: (regionId: string) => void;
  onCancelPick: () => void;
  focusSignal: { regionId?: string; isCitadel?: boolean; districtName?: string } | null;
}

export function AtlasMap({ atlas, roster, activeChar, locations, picking, onPick, onCancelPick, focusSignal }: AtlasMapProps) {
  const [nav, setNav] = React.useState<Nav>({ view: "world" });
  const citadel = centrepieceRegion(atlas);
  const districtSeeds: DistrictSeed[] = citadel?.submap.seeds || [];

  // Syncs nav to an external signal (the search menu's "jump to this
  // location" action) firing again each time, even to the same target —
  // an external-event subscription, not state derived from props.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!focusSignal) return;
    if (focusSignal.isCitadel) {
      if (!citadel) return;
      if (focusSignal.districtName) {
        const idx = (citadel.submap.seeds || []).findIndex((s) => s.name === focusSignal.districtName);
        setNav(idx >= 0 ? { view: "district", districtIdx: idx, zoneIdx: null } : { view: "citadel" });
      } else {
        setNav({ view: "citadel" });
      }
    } else if (focusSignal.regionId && atlas.regions.some((r) => r.id === focusSignal.regionId)) {
      setNav({ view: "region", regionId: focusSignal.regionId, zoneIdx: null });
    }
    // Only a new signal should navigate; atlas/citadel changing alone must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const worldCells = React.useMemo(() => computeWorldCells(atlas), [atlas]);
  const citadelCells = React.useMemo(() => {
    const c = centrepieceRegion(atlas);
    return c ? computeCitadelCells(c) : {};
  }, [atlas]);

  const goCampus = () => setNav({ view: "world" });
  const enterCitadel = () => setNav({ view: "citadel" });
  const exitCitadel = () => setNav({ view: "world" });
  const openRegion = (id: string) => setNav({ view: "region", regionId: id, zoneIdx: null });
  const openDistrict = (idx: number) => {
    const seed = districtSeeds[idx];
    if (seed?.special && seed.link) { openLocationZone(seed); return; }
    setNav({ view: "district", districtIdx: idx, zoneIdx: null });
  };
  const openLocationZone = (seed: DistrictSeed) => {
    const slug = seed.link![0], tag = seed.link![1];
    const di = districtSeeds.findIndex((s) => seedSlug(s) === slug);
    if (di < 0) return;
    const target = districtSeeds[di];
    const host = districtHost(target, atlas);
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.tag === tag);
    setNav({ view: "district", districtIdx: di, zoneIdx: k >= 0 ? k : null });
  };
  const jumpToRegionZone = (regionId: string, zoneName: string) => {
    const region = atlas.regions.find((r) => r.id === regionId);
    if (!region) return;
    const host = regionHost(region, atlas, worldCells);
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.name === zoneName);
    setNav({ view: "region", regionId, zoneIdx: k >= 0 ? k : null });
  };
  const jumpToCitadelDistrictZone = (slug: string, zoneName: string) => {
    const di = districtSeeds.findIndex((s) => seedSlug(s) === slug);
    if (di < 0) return;
    const target = districtSeeds[di];
    const host = districtHost(target, atlas);
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.name === zoneName);
    setNav({ view: "district", districtIdx: di, zoneIdx: k >= 0 ? k : null });
  };

  // ---- resolve the current host + zone (if any) ----
  let host: ZoneHost | null = null;
  let zone: SubArea | null = null;
  if (nav.view === "region") {
    const region = atlas.regions.find((r) => r.id === nav.regionId)!;
    host = regionHost(region, atlas, worldCells);
    if (nav.zoneIdx != null) zone = host.sub.filter((a) => a.on)[nav.zoneIdx] || null;
  } else if (nav.view === "district") {
    const seed = districtSeeds[nav.districtIdx];
    seed._cell = seed._cell || citadelCells[nav.districtIdx];
    host = districtHost(seed, atlas);
    if (nav.zoneIdx != null) zone = host.sub.filter((a) => a.on)[nav.zoneIdx] || null;
  }

  const [fieldHoverIdx, setFieldHoverIdx] = React.useState<number | null>(null);

  // Clicking a level-4 zone tile/list row either sets your location (pick
  // mode) or drills into that zone's own dossier (normal browsing).
  const pickOrSelectZone = (idx: number) => {
    if (picking && host) {
      const sub = host.sub.filter((a) => a.on)[idx];
      if (sub) onPick(pickPrefixForHost(host) + "/" + sub.tag);
      return;
    }
    setNav((n) => (n.view === "region" ? { ...n, zoneIdx: idx } : n.view === "district" ? { ...n, zoneIdx: idx } : n));
  };
  const backgroundOrCancel = () => {
    if (picking) { onCancelPick(); return; }
    setNav((n) => (n.view === "region" ? { ...n, zoneIdx: null } : n.view === "district" ? { ...n, zoneIdx: null } : n));
  };

  const crumbs: Crumb[] = React.useMemo(() => {
    const root = atlas.name, centre = citadel?.name || "";
    if (nav.view === "world") return [{ label: root }];
    if (nav.view === "citadel") return [{ label: root, onClick: goCampus }, { label: centre }];
    if (nav.view === "region") {
      const parts: Crumb[] = [{ label: root, onClick: goCampus }, { label: host!.name }];
      if (zone) parts.splice(1, 1, { label: host!.name, onClick: () => setNav({ view: "region", regionId: nav.regionId, zoneIdx: null }) }, { label: zone.name || zone.tag });
      return parts;
    }
    // district
    const base: Crumb[] = [{ label: root, onClick: goCampus }, { label: centre, onClick: exitCitadelToCitadel }];
    if (zone) { base.push({ label: host!.name, onClick: () => setNav({ view: "district", districtIdx: nav.districtIdx, zoneIdx: null }) }, { label: zone.name || zone.tag }); }
    else base.push({ label: host!.name });
    return base;
    function exitCitadelToCitadel() { setNav({ view: "citadel" }); }
  }, [nav, host, zone, atlas.name, citadel]);

  const inSubmap = nav.view === "region" || nav.view === "district";

  return (
    <div className={"atlas-shell" + (inSubmap ? " is-submap" : "")}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(244,236,210,.5)" strokeWidth={1} />
          </pattern>
          <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="0.42" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.30)" />
          </linearGradient>
        </defs>
      </svg>

      {/* In the submap view the dossier's own back button (labelled with its
          parent) already gives one level of "breadcrumb" — a floating crumbs
          pill there would sit right on top of it and steal its clicks. */}
      {!inSubmap && (
        <div className="float crumbs-bar">
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="crumbs__sep">›</span>}
                {i === crumbs.length - 1 || !c.onClick
                  ? <span className="crumbs__here">{c.label}</span>
                  : <button type="button" className="crumbs__link" onClick={c.onClick}>{c.label}</button>}
              </React.Fragment>
            ))}
          </nav>
        </div>
      )}

      {!inSubmap ? (
        <AtlasStage
          atlas={atlas}
          mode={nav.view === "citadel" ? "citadel" : "world"}
          onEnterRegion={openRegion}
          onEnterCitadel={enterCitadel}
          onExitCitadel={exitCitadel}
          onSelectDistrict={openDistrict}
          onJumpToZone={jumpToRegionZone}
          onJumpToCitadelZone={jumpToCitadelDistrictZone}
          picking={picking}
          onPick={onPick}
          onCancelPick={onCancelPick}
          party={nav.view === "world" || nav.view === "citadel" ? { roster, locations, selfId: activeChar } : null}
        />
      ) : (
        <div className="submap" data-house={host!.house_color}
             style={host!.hcOverride ? ({ "--hc-500": host!.hcOverride, "--hc-300": host!.hcOverride } as React.CSSProperties) : undefined}>
          <Dossier
            host={host!}
            zone={zone}
            onBack={nav.view === "district" ? enterCitadel : goCampus}
            onZonePick={pickOrSelectZone}
            onZoneBack={backgroundOrCancel}
            hoveredIdx={fieldHoverIdx}
            onHover={setFieldHoverIdx}
          />
          <div className="submap__field">
            <div className="watermark"><img src={atlas.watermark} alt="" /></div>
            <DistrictField
              host={host!}
              interactive
              hoveredIdx={fieldHoverIdx}
              selectedIdx={nav.view === "region" || nav.view === "district" ? nav.zoneIdx : null}
              onHover={setFieldHoverIdx}
              onPick={pickOrSelectZone}
              onBackgroundClick={backgroundOrCancel}
              party={{ roster, locations, selfId: activeChar }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
