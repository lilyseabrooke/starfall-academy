/* Stable, diff-friendly JSON for `.map.json` files: anything whose one-line
   form fits in the line width stays on one line (points, seeds, zone
   records, fact pairs); larger values expand with two-space indent. */
import type { MapJson } from "./format";

const WIDTH = 110;

export function formatValue(v: unknown, indent = ""): string {
  return fmt(v, indent);
}

function fmt(v: unknown, indent: string): string {
  const flat = JSON.stringify(v, null, 1).replace(/\s*\n\s*/g, " ").replace(/([[{]) /g, "$1").replace(/ ([\]}])/g, "$1");
  if (v === null || typeof v !== "object" || indent.length + flat.length <= WIDTH) return flat;
  const inner = indent + "  ";
  if (Array.isArray(v)) return "[\n" + v.map((x) => inner + fmt(x, inner)).join(",\n") + "\n" + indent + "]";
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
  return "{\n" + entries.map(([k, x]) => inner + JSON.stringify(k) + ": " + fmt(x, inner)).join(",\n") + "\n" + indent + "}";
}

export function stringifyMap(m: MapJson): string {
  return fmt(m, "") + "\n";
}
