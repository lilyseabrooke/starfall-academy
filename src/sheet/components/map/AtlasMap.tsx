"use client";

/* ===========================================================================
   Starfall Atlas — top-level nav orchestration (typed port of the view-state
   half of app.js: openSubmap/openDistrict/openLocationZone/zonePick/
   selectZone/deselectZone/closeSubmap/goCampus/enterCitadel/exitCitadel).
   Owns which of {world map, citadel map, region dossier, district dossier,
   zone dossier} is showing and renders AtlasStage + the submap dossier pane.
   =========================================================================== */
import * as React from "react";
import { Dossier } from "./Dossier";
import { DistrictField } from "./DistrictField";
import { AtlasStage, type Crumb } from "./AtlasStage";
import { REGIONS } from "../../data/map/regions";
import { computeCampusCells, computeCitadelCells, districtHost, regionHost, type ZoneHost } from "../../data/map/hosts";
import type { SubArea } from "../../data/map/types";
import type { MapRosterMember } from "./MapPage";

const CITADEL = REGIONS.find((r) => r.isCitadel)!;

type Nav =
  | { view: "world" }
  | { view: "citadel" }
  | { view: "region"; regionId: string; zoneIdx: number | null }
  | { view: "district"; districtIdx: number; zoneIdx: number | null };

export interface AtlasMapProps {
  roster: MapRosterMember[];
  activeChar: string;
  locations: Record<string, string | null | undefined>;
  picking: boolean;
  onPick: (regionId: string) => void;
  focusSignal: { regionId?: string; isCitadel?: boolean; districtName?: string } | null;
}

export function AtlasMap({ roster, activeChar, locations, picking, onPick, focusSignal }: AtlasMapProps) {
  const [nav, setNav] = React.useState<Nav>({ view: "world" });

  React.useEffect(() => {
    if (!focusSignal) return;
    if (focusSignal.isCitadel) {
      setNav({ view: "citadel" });
      if (focusSignal.districtName) {
        const idx = (CITADEL.submap.seeds || []).findIndex((s) => s.name === focusSignal.districtName);
        if (idx >= 0) setNav({ view: "district", districtIdx: idx, zoneIdx: null });
      }
    } else if (focusSignal.regionId) {
      setNav({ view: "region", regionId: focusSignal.regionId, zoneIdx: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  const campusCells = React.useMemo(computeCampusCells, []);
  const citadelCells = React.useMemo(() => computeCitadelCells(CITADEL), []);

  const goCampus = () => setNav({ view: "world" });
  const enterCitadel = () => setNav({ view: "citadel" });
  const exitCitadel = () => setNav({ view: "world" });
  const openRegion = (id: string) => setNav({ view: "region", regionId: id, zoneIdx: null });
  const openDistrict = (idx: number) => {
    const seed = (CITADEL.submap.seeds || [])[idx];
    if (seed?.special && seed.link) { openLocationZone(seed); return; }
    setNav({ view: "district", districtIdx: idx, zoneIdx: null });
  };
  const openLocationZone = (seed: NonNullable<typeof CITADEL.submap.seeds>[number]) => {
    const slug = seed.link![0], tag = seed.link![1];
    const di = (CITADEL.submap.seeds || []).findIndex((s) => slugOf(s.name) === slug);
    if (di < 0) return;
    const target = (CITADEL.submap.seeds || [])[di];
    const host = districtHost(target, "Starfall Citadel");
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.tag === tag);
    setNav({ view: "district", districtIdx: di, zoneIdx: k >= 0 ? k : null });
  };
  const jumpToRegionZone = (regionId: string, zoneName: string) => {
    const region = REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    const host = regionHost(region, campusCells);
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.name === zoneName);
    setNav({ view: "region", regionId, zoneIdx: k >= 0 ? k : null });
  };
  const jumpToCitadelDistrictZone = (slug: string, zoneName: string) => {
    const di = (CITADEL.submap.seeds || []).findIndex((s) => slugOf(s.name) === slug);
    if (di < 0) return;
    const target = (CITADEL.submap.seeds || [])[di];
    const host = districtHost(target, "Starfall Citadel");
    const k = host.sub.filter((a) => a.on).findIndex((a) => a.name === zoneName);
    setNav({ view: "district", districtIdx: di, zoneIdx: k >= 0 ? k : null });
  };

  // ---- resolve the current host + zone (if any) ----
  let host: ZoneHost | null = null;
  let zone: SubArea | null = null;
  if (nav.view === "region") {
    const region = REGIONS.find((r) => r.id === nav.regionId)!;
    host = regionHost(region, campusCells);
    if (nav.zoneIdx != null) zone = host.sub.filter((a) => a.on)[nav.zoneIdx] || null;
  } else if (nav.view === "district") {
    const seed = (CITADEL.submap.seeds || [])[nav.districtIdx];
    seed._cell = seed._cell || citadelCells[nav.districtIdx];
    host = districtHost(seed, "Starfall Citadel");
    if (nav.zoneIdx != null) zone = host.sub.filter((a) => a.on)[nav.zoneIdx] || null;
  }

  const [fieldHoverIdx, setFieldHoverIdx] = React.useState<number | null>(null);

  const crumbs: Crumb[] = React.useMemo(() => {
    if (nav.view === "world") return [{ label: "Campus" }];
    if (nav.view === "citadel") return [{ label: "Campus", onClick: goCampus }, { label: "Starfall Citadel" }];
    if (nav.view === "region") {
      const parts: Crumb[] = [{ label: "Campus", onClick: goCampus }, { label: host!.name }];
      if (zone) parts.splice(1, 1, { label: host!.name, onClick: () => setNav({ view: "region", regionId: nav.regionId, zoneIdx: null }) }, { label: zone.name || zone.tag });
      return parts;
    }
    // district
    const base: Crumb[] = [{ label: "Campus", onClick: goCampus }, { label: "Starfall Citadel", onClick: exitCitadelToCitadel }];
    if (zone) { base.push({ label: host!.name, onClick: () => setNav({ view: "district", districtIdx: nav.districtIdx, zoneIdx: null }) }, { label: zone.name || zone.tag }); }
    else base.push({ label: host!.name });
    return base;
    function exitCitadelToCitadel() { setNav({ view: "citadel" }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, host, zone]);

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

      {!inSubmap ? (
        <AtlasStage
          regions={REGIONS}
          mode={nav.view === "citadel" ? "citadel" : "world"}
          onEnterRegion={openRegion}
          onEnterCitadel={enterCitadel}
          onExitCitadel={exitCitadel}
          onSelectDistrict={openDistrict}
          onJumpToZone={jumpToRegionZone}
          onJumpToCitadelZone={jumpToCitadelDistrictZone}
          picking={picking}
          onPick={onPick}
          party={nav.view === "world" ? { roster, locations, selfId: activeChar } : null}
        />
      ) : (
        <div className="submap" data-house={host!.house_color}
             style={host!.hcOverride ? ({ "--hc-500": host!.hcOverride, "--hc-300": host!.hcOverride } as React.CSSProperties) : undefined}>
          <Dossier
            host={host!}
            zone={zone}
            onBack={nav.view === "district" ? enterCitadel : goCampus}
            onZonePick={(idx) => setNav((n) => (n.view === "region" ? { ...n, zoneIdx: idx } : n.view === "district" ? { ...n, zoneIdx: idx } : n))}
            onZoneBack={() => setNav((n) => (n.view === "region" ? { ...n, zoneIdx: null } : n.view === "district" ? { ...n, zoneIdx: null } : n))}
            hoveredIdx={fieldHoverIdx}
            onHover={setFieldHoverIdx}
          />
          <div className="submap__field">
            <div className="watermark"><img src="/character-sheet/map/assets/crest-lines.png" alt="" /></div>
            <DistrictField
              host={host!}
              interactive
              hoveredIdx={fieldHoverIdx}
              selectedIdx={nav.view === "region" || nav.view === "district" ? nav.zoneIdx : null}
              onHover={setFieldHoverIdx}
              onPick={(idx) => setNav((n) => (n.view === "region" ? { ...n, zoneIdx: idx } : n.view === "district" ? { ...n, zoneIdx: idx } : n))}
              onBackgroundClick={() => setNav((n) => (n.view === "region" ? { ...n, zoneIdx: null } : n.view === "district" ? { ...n, zoneIdx: null } : n))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
