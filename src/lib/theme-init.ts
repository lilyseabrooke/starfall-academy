/* Shared (server + client) theme constants. No "use client": the root layout
   (a Server Component) inlines THEME_INIT_SCRIPT into <head> as a string. */

export type ThemePref = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "sf-theme";
export const DEFAULT_THEME_PREF: ThemePref = "dark";

/** Runs synchronously in <head> before first paint; keep in sync with resolve() in theme.ts. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="system")p="${DEFAULT_THEME_PREF}";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
