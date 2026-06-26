/* ===========================================================================
   Starfall Academy — host ⇄ sheet persistence bridge
   ---------------------------------------------------------------------------
   The character sheet is vendored as a standalone prototype and mounted inside
   the Next.js app through an <iframe>. This bridge lets the host page seed the
   sheet from the database and persist edits back, over postMessage:

     OUT  { type: "sf-sheet-request" }                 sheet → host, on load
     IN   { type: "sf-sheet-init", sheet, campaignId } host → sheet, initial data
     OUT  { type: "sf-sheet-save", sheet }             sheet → host, debounced edits

   Shared dice log (only when the host supplies a campaignId):
     OUT  { type: "sf-roll-ready" }                    roll engine mounted
     OUT  { type: "sf-roll", roll }                    a local roll to share
     IN   { type: "sf-roll-remote", roll }             a roll to inject into the log

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

  // Shared roll wiring: the roll engine registers a sink via onRoll(); remote
  // rolls that arrive before then are buffered so none are dropped.
  let rollSink = null;
  const rollQueue = [];

  function tryMount() {
    if (mounted || !mountFn || !inited) return;
    mounted = true;
    mountFn();
  }

  function init(sheet, roster, me, openForge, campaignId) {
    if (inited) return;
    inited = true;
    // Exposed for app.jsx's lazy state initializers to hydrate from.
    window.SF_SHEET = (sheet && typeof sheet === "object") ? sheet : null;
    window.SF_ROSTER = Array.isArray(roster) && roster.length ? roster : null;
    window.SF_ME = (typeof me === "string" && me) ? me : null;
    window.SF_OPEN_FORGE = !!openForge;
    window.SF_CAMPAIGN_ID = (typeof campaignId === "string" && campaignId) ? campaignId : null;
    window.SF_MULTIPLAYER = !!window.SF_CAMPAIGN_ID;
    tryMount();
  }

  function injectRoll(roll) {
    if (!roll || typeof roll !== "object") return;
    if (rollSink) rollSink(roll);
    else rollQueue.push(roll);
  }

  if (host) {
    window.addEventListener("message", function (e) {
      const m = e.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "sf-sheet-init") init(m.sheet || null, m.roster, m.me, m.openForge, m.campaignId);
      else if (m.type === "sf-roll-remote") injectRoll(m.roll);
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
    /** roll-state.js registers a sink for shared rolls; we flush any backlog. */
    onRoll: function (fn) {
      rollSink = fn;
      if (host) host.postMessage({ type: "sf-roll-ready" }, "*");
      while (rollQueue.length) fn(rollQueue.shift());
    },
    /** Share a locally-made roll with the campaign. No-op when not multiplayer. */
    shareRoll: function (roll) {
      if (host && window.SF_MULTIPLAYER && roll) host.postMessage({ type: "sf-roll", roll: roll }, "*");
    },
    /** Debounced persistence of a serialized sheet snapshot up to the host. */
    save: function (snapshot) {
      if (!host) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        host.postMessage({ type: "sf-sheet-save", sheet: snapshot }, "*");
      }, 600);
    },
    /** Ask the host to navigate to another party member's sheet. */
    switchCharacter: function (id) {
      if (host && id) host.postMessage({ type: "sf-switch-character", id: id }, "*");
    },
    /** Tell the host the Forge committed (so create-mode knows to persist). */
    notifyCommitted: function () {
      if (host) host.postMessage({ type: "sf-committed" }, "*");
    },
    get sheet() { return window.SF_SHEET; },
  };
})();
