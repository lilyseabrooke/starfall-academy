/* Write maps/campus.map.json from the shipped CAMPUS_ATLAS (staging only).
   Usage: npm run import-campus */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CAMPUS_ATLAS } from "../src/sheet/data/map/areas/campus";
import { atlasToJson } from "../src/mapmaker/convert";
import { validateMap } from "../src/mapmaker/format";
import { stringifyMap } from "../src/mapmaker/stringify";

const json = atlasToJson(CAMPUS_ATLAS);
const problems = validateMap(json);
for (const p of problems) console.log(`${p.level === "error" ? "✗" : "!"} ${p.path}: ${p.message}`);
if (problems.some((p) => p.level === "error")) process.exit(1);
const out = resolve(__dirname, "../maps/campus.map.json");
writeFileSync(out, stringifyMap(json));
console.log(`Wrote ${out}`);
