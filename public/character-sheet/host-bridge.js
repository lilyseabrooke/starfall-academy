/* ===========================================================================
   Starfall Academy — host ⇄ sheet persistence bridge
   ---------------------------------------------------------------------------
   The character sheet is vendored as a standalone prototype and mounted inside
   the Next.js app through an <iframe>. This bridge lets the host page seed the
   sheet from the database and persist edits back, over postMessage:

     OUT  { type: "sf-sheet-request" }                 sheet → host, on load
     IN   { type: "sf-sheet-init", sheet }             host → sheet, initial data
     OUT  { type: "sf-sheet-save", sheet }             sheet → host, debounced edits

   `sheet` is the serialized character state (see app.jsx serializeSheet()).
   When opened standalone (no parent frame), the bridge mounts with the
   prototype's own seed data after a short wait, so the file still works alone.
   =========================================================================== */
window.SF_HOST = (function () {
  "use strict";
  const host = (window.parent && window.parent !== window) ? window.parent : null;

  let inited = false;     // initial sheet has been received (or fallen back)
  let mountFn = null;     // app.jsx hands us its mount function
  let mounted = false;
  let saveTimer = null;

  function tryMount() {
    if (mounted || !mountFn || !inited) return;
    mounted = true;
    mountFn();
  }

  function init(sheet) {
    if (inited) return;
    inited = true;
    // Exposed for app.jsx's lazy state initializers to hydrate from.
    window.SF_SHEET = (sheet && typeof sheet === "object") ? sheet : null;
    tryMount();
  }

  if (host) {
    window.addEventListener("message", function (e) {
      const m = e.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "sf-sheet-init") init(m.sheet || null);
    });
    host.postMessage({ type: "sf-sheet-request" }, "*");
    // Fallback: if the host never answers, mount with seed data anyway.
    setTimeout(function () { init(null); }, 2500);
  } else {
    // Standalone (opened directly): no host, just use seed data.
    init(null);
  }

  return {
    /** app.jsx registers its mount function; we call it once init data is ready. */
    onMount: function (fn) { mountFn = fn; tryMount(); },
    /** Debounced persistence of a serialized sheet snapshot up to the host. */
    save: function (snapshot) {
      if (!host) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        host.postMessage({ type: "sf-sheet-save", sheet: snapshot }, "*");
      }, 600);
    },
    get sheet() { return window.SF_SHEET; },
  };
})();
