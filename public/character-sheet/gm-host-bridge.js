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

   Shared dice log (when data.campaignId is present): symmetric to the player
   bridge — sf-roll-ready / sf-roll out, sf-roll-remote in — so GM rolls reach
   the party and the party's rolls land in the GM ledger.

   Run standalone (no parent frame), it mounts immediately with the seed data
   in gm-data.js. The live campaign party / persistence is supplied by the host
   through data.party (see design/INTEGRATION.md).
   =========================================================================== */
window.SF_HOST = (function () {
  "use strict";
  const host = (window.parent && window.parent !== window) ? window.parent : null;

  let inited = false;
  let mountFn = null;
  let mounted = false;

  // Shared roll wiring (see host-bridge.js for the mirror on the player side).
  let rollSink = null;
  const rollQueue = [];

  function tryMount() {
    if (mounted || !mountFn || !inited) return;
    mounted = true;
    mountFn();
  }

  function init(data) {
    if (inited) return;
    inited = true;
    // Exposed for gm.jsx to hydrate the campaign identity + live party from.
    window.SF_GM_INIT = (data && typeof data === "object") ? data : null;
    var campaignId = (data && typeof data.campaignId === "string" && data.campaignId) ? data.campaignId : null;
    window.SF_CAMPAIGN_ID = campaignId;
    window.SF_MULTIPLAYER = !!campaignId;
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
      if (m.type === "sf-gm-init") init(m.data || null);
      else if (m.type === "sf-roll-remote") injectRoll(m.roll);
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
  };
})();
