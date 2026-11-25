/* ===========================================================================
   Starfall Atlas — the Campus Map as an AtlasDefinition.
   World-field layout (outline, region seeds, House plaques, Citadel shield
   placement) plus the region/Citadel data in regions.ts. The map components
   render whatever AtlasDefinition they are given; this is the default.
   =========================================================================== */
import type { AtlasDefinition } from "../types";
import { REGIONS } from "../regions";

export const CAMPUS_ATLAS: AtlasDefinition = {
  id: "campus",
  name: "Campus",
  eyebrow: "ARCANE CAMPUS",
  title: "STARFALL ACADEMY",
  field: [1600, 1200],
  fit: { w: 1480, h: 1120, tx: 78, ty: -14 },
  outline:
    "120,250 440,150 820,112 1190,150 1466,345 1500,716 1330,1052 905,1132 470,1086 180,892 94,556",
  seeds: [
    { id: "amber-woods", x: 730, y: 300, w: 44, ldx: 0, ldy: -10 },
    { id: "jewelstone-hollow", x: 909, y: 512, w: -100, ldx: 0, ldy: 0, splitLabel: true },
    { id: "ryker-cliffs", x: 1287, y: 508, w: 4, ldx: 0, ldy: -51 },
    { id: "glimmerdeep-lake", x: 243, y: 989, w: 6, ldx: -4, ldy: 29 },
    { id: "the-grounds", x: 770, y: 896, w: -4, ldx: 291, ldy: 120 },
  ],
  regions: REGIONS,
  pois: [
    { id: "boar-house", name: "Boar House", link: { region: "amber-woods", zone: "Boar House" }, x: 530, y: 553 },
    { id: "dragon-house", name: "Dragon House", link: { region: "jewelstone-hollow", zone: "Dragon House" }, x: 968, y: 634 },
    { id: "eagle-house", name: "Eagle House", link: { region: "ryker-cliffs", zone: "Eagle House" }, x: 1181, y: 709 },
    { id: "dolphin-house", name: "Dolphin House", link: { region: "glimmerdeep-lake", zone: "Dolphin House" }, x: 380, y: 855 },
    { id: "scorpion-house", name: "Scorpion House", link: { district: "crescent_district", zone: "Scorpion House" }, x: 747, y: 799 },
  ],
  centrepiece: {
    regionId: "starfall-citadel",
    place: { cx: 722, top: 736, hw: 118, h: 296 },
    label: ["STARFALL", "CITADEL"],
    eyebrow: "HEART OF THE ACADEMY",
    districtHouse: "Citadel district",
  },
  watermark: "/character-sheet/map/assets/crest-lines.png",
};
