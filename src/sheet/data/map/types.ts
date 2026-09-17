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
