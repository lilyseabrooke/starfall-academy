/* Bake maps/<area>.map.json → src/sheet/data/map/areas/<area>.ts (staging only).
   Usage: npm run bake-map -- <area> [--out <file>]
   Refuses to overwrite a hand-written module (one without the generated mark). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateMap, type MapJson } from "../src/mapmaker/format";
import { migrateMap } from "../src/mapmaker/migrate";
import { bakeModule, GENERATED_MARK } from "../src/mapmaker/bake";

const args = process.argv.slice(2);
const area = args.find((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
if (!area) { console.error("Usage: npm run bake-map -- <area> [--out <file>]"); process.exit(2); }

const root = resolve(__dirname, "..");
const src = resolve(root, "maps", `${area}.map.json`);
if (!existsSync(src)) { console.error(`No such map: ${src}`); process.exit(2); }
const parsed = migrateMap(JSON.parse(readFileSync(src, "utf8")));
const problems = validateMap(parsed);
for (const p of problems) console.log(`${p.level === "error" ? "✗ error  " : "! warning"} ${p.path}: ${p.message}`);
if (problems.some((p) => p.level === "error")) { console.error("Not baked: fix the errors above."); process.exit(1); }
const map = parsed as MapJson;
if (map.id !== area) { console.error(`The file's id is "${map.id}", not "${area}". Rename one to match.`); process.exit(1); }

const out = outIdx >= 0 ? resolve(args[outIdx + 1]) : resolve(root, "src/sheet/data/map/areas", `${area}.ts`);
if (existsSync(out) && !readFileSync(out, "utf8").includes(GENERATED_MARK)) {
  console.error(`${out} is hand-written (no "${GENERATED_MARK}" mark); not overwriting it. Pass --out to bake elsewhere.`);
  process.exit(1);
}
writeFileSync(out, bakeModule(map));
console.log(`Baked ${out}`);
