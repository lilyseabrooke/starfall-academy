"use client";

/* The editor reads its autosaved draft from localStorage on first render, so
   it is client-only (no server prerender to mismatch against). */
import dynamic from "next/dynamic";
import type { RepoMap } from "@/mapmaker/ui/Mapmaker";
import "@/sheet/styles/map.css";
import "@/mapmaker/ui/mapmaker.css";

const Mapmaker = dynamic(() => import("@/mapmaker/ui/Mapmaker"), {
  ssr: false,
  loading: () => <div className="mm-loading">Loading the mapmaker…</div>,
});

export default function MapmakerClient({ repoMaps }: { repoMaps: RepoMap[] }) {
  return <Mapmaker repoMaps={repoMaps} />;
}
