/* ===========================================================================
   Starfall Academy — GM view host bridge
   ---------------------------------------------------------------------------
   The GM dashboard is the analogue of the player character sheet: a standalone
   prototype that can run on its own (seed data) or, in the future, be mounted
   in the Next.js app inside an <iframe> and seeded by the host. This bridge
   gates the GM app's mount until initial data arrives (or a short fallback),
   mirroring host-bridge.js so the eventual app mount works the same way:

     OUT  { type: "sf-gm-request" }            gm → host, on load
     IN   { type: "sf-gm-init", data }         host → gm, initial campaign data

   Run standalone (no parent frame), it mounts immediately with the seed data
   in gm-data.js. Real campaign membership / persistence lands with the
   roadmap's campaigns + GM milestone (see design/INTEGRATION.md).
   =========================================================================== */
window.SF_HOST = (function () {
  "use strict";
  const host = (window.parent && window.parent !== window) ? window.parent : null;

  let inited = false;
  let mountFn = null;
  let mounted = false;

  function tryMount() {
    if (mounted || !mountFn || !inited) return;
    mounted = true;
    mountFn();
  }

  function init(data) {
    if (inited) return;
    inited = true;
    // Exposed for a future live build to hydrate the GM view from. The seed
    // prototype ignores it and reads gm-data.js.
    window.SF_GM_INIT = (data && typeof data === "object") ? data : null;
    tryMount();
  }

  if (host) {
    window.addEventListener("message", function (e) {
      const m = e.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "sf-gm-init") init(m.data || null);
    });
    host.postMessage({ type: "sf-gm-request" }, "*");
    // Fallback: if the host never answers, mount with seed data anyway.
    setTimeout(function () { init(null); }, 2500);
  } else {
    init(null);
  }

  return {
    /** gm.jsx registers its mount function; we call it once init data is ready. */
    onMount: function (fn) { mountFn = fn; tryMount(); },
  };
})();
