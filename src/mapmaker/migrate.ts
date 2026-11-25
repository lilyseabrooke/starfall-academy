/* Upgrade older `.map.json` files to the current format version. Version 1
   is the first, so this only rejects files from a newer tool; add a step
   here (v → v+1) whenever the format changes. */
import { MAP_FORMAT_VERSION } from "./format";

type Step = (m: Record<string, unknown>) => Record<string, unknown>;
const STEPS: Record<number, Step> = {
  // 1: (m) => ({ ...m, version: 2, /* … */ }),
};

export function migrateMap(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  let m = input as Record<string, unknown>;
  while (typeof m.version === "number" && m.version < MAP_FORMAT_VERSION && STEPS[m.version]) m = STEPS[m.version](m);
  return m;
}
