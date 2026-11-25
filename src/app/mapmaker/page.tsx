/* /mapmaker — the area-map authoring tool. Lives on the staging/mapmaking
   branch only; it never ships to main. The committed maps in maps/ are read
   at build time for the "Open from repo" list. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MapJson } from "@/mapmaker/format";
import MapmakerClient from "./MapmakerClient";

export const metadata = {
  title: "Mapmaker — Starfall Academy (staging)",
  robots: { index: false, follow: false },
};

function repoMaps(): { file: string; json: MapJson }[] {
  const dir = join(process.cwd(), "maps");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".map.json"))
      .sort()
      .map((file) => ({ file, json: JSON.parse(readFileSync(join(dir, file), "utf8")) as MapJson }));
  } catch {
    return [];
  }
}

export default function MapmakerPage() {
  return <MapmakerClient repoMaps={repoMaps()} />;
}
