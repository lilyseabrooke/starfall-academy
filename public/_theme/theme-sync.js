/* Starfall Academy — theme sync for the embedded static apps.
   Load synchronously in <head> (before any stylesheet paints). Mirrors
   THEME_INIT_SCRIPT in src/lib/theme-init.ts: reads the same localStorage key
   (the iframes are same-origin with the site), applies <html data-theme>, and
   follows later changes — the switch in the parent page writes localStorage,
   which fires a `storage` event here, and OS changes while on "System". */
(function () {
  var KEY = "sf-theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  function apply() {
    var p = "dark";
    try { p = localStorage.getItem(KEY) || "dark"; } catch (e) {}
    if (p !== "light" && p !== "system") p = "dark";
    var t = p === "system" ? (mq && mq.matches ? "light" : "dark") : p;
    document.documentElement.setAttribute("data-theme", t);
  }
  apply();
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(); });
  if (mq && mq.addEventListener) mq.addEventListener("change", apply);
})();
