"use client";

/* ===========================================================================
   Starfall Academy — colour theme preference
   ---------------------------------------------------------------------------
   The preference ("dark" | "light" | "system") lives in localStorage. What the
   CSS sees is the *resolved* theme on <html data-theme="dark|light">. The
   inline THEME_INIT_SCRIPT (in the root layout) applies it before first paint;
   the hook below keeps it in sync afterwards, including live OS changes while
   "system" is selected and changes made in another tab.
   =========================================================================== */
import * as React from "react";

import { DEFAULT_THEME_PREF as DEFAULT_PREF, THEME_STORAGE_KEY, type ThemePref } from "./theme-init";

export type { ThemePref } from "./theme-init";
export type ResolvedTheme = "dark" | "light";

const PREFS: ThemePref[] = ["dark", "light", "system"];
const CHANGE_EVENT = "sf-themechange";

const isPref = (v: unknown): v is ThemePref => PREFS.includes(v as ThemePref);

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isPref(v) ? v : DEFAULT_PREF;
  } catch {
    return DEFAULT_PREF;
  }
}

const systemLight = () => window.matchMedia("(prefers-color-scheme: light)").matches;

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? (systemLight() ? "light" : "dark") : pref;
}

function apply(pref: ThemePref) {
  document.documentElement.setAttribute("data-theme", resolve(pref));
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onStorage = (e: StorageEvent) => { if (e.key === THEME_STORAGE_KEY) { apply(readPref()); cb(); } };
  const onSystem = () => { if (readPref() === "system") apply("system"); cb(); };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  mq.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", onSystem);
  };
}

export function setThemePref(pref: ThemePref) {
  try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch { /* private mode: still apply for this page */ }
  apply(pref);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Current preference; renders the default on the server, then the stored value. */
export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = React.useSyncExternalStore(subscribe, readPref, () => DEFAULT_PREF);
  return [pref, setThemePref];
}

export const nextThemePref = (p: ThemePref): ThemePref => PREFS[(PREFS.indexOf(p) + 1) % PREFS.length];
export const THEME_LABEL: Record<ThemePref, string> = { dark: "Dark", light: "Light", system: "System" };
