/* Round-trip test: maps/campus.map.json, baked, must render exactly like the
   shipped CAMPUS_ATLAS. Compares the two in normal form (what the renderer
   reads, with sub-area side tables materialised) and also re-exports the
   baked atlas to JSON, which must match the file.
   Usage: npm run roundtrip-campus */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAMPUS_ATLAS } from "../src/sheet/data/map/areas/campus";
import { atlasToJson, deepDiff, jsonToAtlas, normaliseAtlas } from "../src/mapmaker/convert";
import { validateMap, type MapJson } from "../src/mapmaker/format";
import { stringifyMap } from "../src/mapmaker/stringify";
import { computeCitadelCells, computeWorldCells, centrepieceRegion } from "../src/sheet/data/map/hosts";

let failed = false;
const check = (label: string, diffs: string[]) => {
  if (diffs.length) { failed = true; console.log(`✗ ${label}: ${diffs.length} difference(s)`); diffs.slice(0, 20).forEach((d) => console.log("    " + d)); }
  else console.log(`✓ ${label}`);
};

const file = readFileSync(resolve(__dirname, "../maps/campus.map.json"), "utf8");
const json = JSON.parse(file) as MapJson;
check("campus.map.json validates", validateMap(json).filter((p) => p.level === "error").map((p) => `${p.path}: ${p.message}`));

const baked = jsonToAtlas(json);
check("baked atlas ≡ CAMPUS_ATLAS (normal form)", deepDiff(normaliseAtlas(baked), normaliseAtlas(CAMPUS_ATLAS)));

// Geometry the renderer derives must match too.
check("world Voronoi cells", deepDiff(computeWorldCells(baked), computeWorldCells(CAMPUS_ATLAS)));
const cb = centrepieceRegion(baked), cc = centrepieceRegion(CAMPUS_ATLAS);
check("centrepiece district cells", deepDiff(cb && computeCitadelCells(cb), cc && computeCitadelCells(cc)));

// JSON → atlas → JSON is the identity on the file.
check("JSON → atlas → JSON is stable", file === stringifyMap(atlasToJson(baked)) ? [] : ["re-exported JSON differs from maps/campus.map.json"]);

if (failed) { console.log("\nRound-trip FAILED."); process.exit(1); }
console.log("\nRound-trip OK: the campus bakes back to the shipped map.");
