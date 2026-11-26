/* ===========================================================================
   Starfall Atlas — shared types for the native map port.
   Mirrors the shapes authored in regions.js / atlas-citadel-data.js.
   =========================================================================== */

export type Point = [number, number];

export interface SubAreaSeed {
  name?: string | null;
  blurb?: string | null;
  generic?: string | null;
}

/** Materialised A–F sub-area (level-4 zone) for a district/region. */
export interface SubArea {
  tag: string;
  x: number;
  y: number;
  w: number;
  on: boolean;
  generic: string | null;
  lx: number;
  ly: number;
  name: string | null;
  blurb: string | null;
}

export interface SubMap {
  view: [number, number];
  outline?: string;
  subPos?: Record<string, [number, number, number?, number?]>;
  subLabel?: Record<string, [number, number]>;
  subs?: SubAreaSeed[];
  // Citadel-only (shield tessellation)
  shield?: boolean;
  shieldGeom?: { cx: number; top: number; hw: number; h: number };
  shieldOpts?: { spike?: number; shoulder?: number; side?: number };
  seeds?: DistrictSeed[];
}

export interface DistrictSeed {
  name: string;
  tag: string;
  special?: boolean;
  link?: [string, string];
  x: number;
  y: number;
  color?: string;
  w?: number;
  labelDx?: number;
  labelDy?: number;
  blurb?: string;
  subPos?: Record<string, [number, number, number?, number?]>;
  subGen?: Record<string, string>;
  subLabel?: Record<string, [number, number]>;
  subs?: SubAreaSeed[];
  // materialised lazily
  sub?: SubArea[];
  _slug?: string;
  _cell?: string;
}

export interface Region {
  id: string;
  name: string;
  house: string;
  crest: string;
  house_color: string;
  sector: string;
  coord: string;
  tagline: string;
  blurb: string;
  facts: [string, string][];
  points: string;
  label: Point;
  isCitadel?: boolean;
  submap: SubMap;
}

/* ---- Atlas definition ------------------------------------------------------
   Everything the renderer needs to draw one area map: the world field and
   outline, the weighted Voronoi seeds that cut it into regions, the regions
   themselves (lore + submaps), POI plaques, and an optional shield-shaped
   centrepiece with its own district tessellation (the campus's Citadel).
   The map components take one of these instead of importing campus data, so
   any area authored in the same shape renders through the same code. */

/** A world-level Voronoi seed for one region (cell = that region's tile). */
export interface WorldSeed {
  /** The Region this seed's cell belongs to. */
  id: string;
  x: number;
  y: number;
  /** Additive Voronoi weight: higher grows the cell. */
  w: number;
  /** Label nudge from the cell's pole of inaccessibility. */
  ldx: number;
  ldy: number;
  /** Force the region name onto two lines even when short. */
  splitLabel?: boolean;
}

/** Where a POI plaque jumps to: a named zone in a region, or in a centrepiece district. */
export interface ZoneLink {
  region?: string;
  /** Centrepiece district slug (seedSlug of the district's name). */
  district?: string;
  zone?: string;
}

export interface AtlasPoi {
  id: string;
  name: string;
  x: number;
  y: number;
  link: ZoneLink;
}

export interface AtlasCentrepiece {
  /** Id of the Region (in `regions`, flagged isCitadel) this centrepiece draws. */
  regionId: string;
  /** Placement of the small shield glyph on the world field. */
  place: { cx: number; top: number; hw: number; h: number };
  /** Lines of the label drawn on the world-field shield. */
  label: string[];
  /** Eyebrow over the centrepiece legend's title. */
  eyebrow: string;
  /** The "house" line on a centrepiece district's dossier. */
  districtHouse: string;
}

/** Optional "About this map" text, shown as an expandable section of the
 *  world legend. Maps without it (the campus) show no section at all. */
export interface AtlasAbout {
  /** Paragraphs separated by a blank line. */
  blurb: string;
  facts?: [string, string][];
}

export interface AtlasDefinition {
  id: string;
  /** Top-level name: the root breadcrumb and region dossiers' back label. */
  name: string;
  /** World legend header. */
  eyebrow: string;
  title: string;
  /** World field size in map units. */
  field: [number, number];
  /** Fit-to-view framing for the world field: the box that must fit on
   *  screen, a horizontal offset in screen px, and a vertical offset in map
   *  units (scaled with the zoom). */
  fit: { w: number; h: number; tx: number; ty: number };
  /** World outline as an "x,y x,y …" string, smoothed at render time. */
  outline: string;
  seeds: WorldSeed[];
  /** Every region, in legend order, including the centrepiece's Region. */
  regions: Region[];
  pois: AtlasPoi[];
  centrepiece: AtlasCentrepiece | null;
  /** Line-art crest: drawn faintly behind the world field and as the
   *  watermark behind a region/district field. */
  watermark: string;
  /** Full-colour crest, shown at the top of the legend and the phone About
   *  sheet. Maps without one (the campus) show none. */
  crest?: string | null;
  about?: AtlasAbout | null;
}
