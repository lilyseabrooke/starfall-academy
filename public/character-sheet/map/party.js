/* ===========================================================================
   Starfall Atlas — party-location overlay bridge
   ---------------------------------------------------------------------------
   Runs inside the embedded campus map. Talks to the host character sheet over
   postMessage:

     IN   { type: "sf-map-state", selfId, roster:[{id,name,initials,tone}],
            locations:{ charId: regionId|null }, pick: bool }
     OUT  { type: "sf-map-ready", zones:[{ id, name, house, house_color }] }
     OUT  { type: "sf-map-pick", regionId }      (a region was clicked in pick mode)
     OUT  { type: "sf-map-pick-cancel" }

   Markers live inside #world-svg (campus user-space, 1600x1200) so they pan &
   zoom with the map; an inner group is counter-scaled to keep avatars a
   constant on-screen size. Pins only show on the campus world view.
   =========================================================================== */
(function () {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";
  const byId = (id) => document.getElementById(id);
  const REGIONS = window.STARFALL_REGIONS || [];

  // ---- state pushed from the host -----------------------------------------
  let selfId = null;
  let pickId = null;
  let roster = [];
  let locations = {};
  let picking = false;

  const worldSvg = byId("world-svg");
  const panner = byId("panner");
  const canvas = byId("canvas");
  const vWorld = byId("view-world");
  const legend = byId("legend");

  // ---- marker layer (re-created if a citadel render ever clears the svg) ---
  function ensureLayer() {
    let layer = byId("party-layer");
    if (!layer || layer.ownerSVGElement !== worldSvg) {
      layer = document.createElementNS(SVGNS, "g");
      layer.setAttribute("id", "party-layer");
      layer.setAttribute("class", "party-layer");
      worldSvg.appendChild(layer);
    } else if (layer.parentNode !== worldSvg) {
      worldSvg.appendChild(layer);
    }
    return layer;
  }

  function regionById(id) { return REGIONS.find((r) => r.id === id) || null; }
  function anchorFor(r) {
    // label is the cleanest "centre of the zone" we have on the campus field
    if (r && Array.isArray(r.label)) return r.label;
    return [800, 600];
  }

  // current panner scale, for counter-scaling marker size
  function currentScale() {
    const t = panner && panner.style.transform || "";
    const m = /scale\(([-\d.]+)\)/.exec(t);
    return m ? parseFloat(m[1]) || 1 : 1;
  }

  function svgEl(name, attrs, kids) {
    const n = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (kids) kids.forEach((c) => n.appendChild(c));
    return n;
  }

  // Build the cluster of avatars sitting at one region.
  function buildCluster(regionId, members) {
    const r = regionById(regionId);
    const [ax, ay] = anchorFor(r);
    const g = svgEl("g", { class: "pm", transform: `translate(${ax},${ay})` });
    const scaleG = svgEl("g", { class: "pm-scale" });

    const D = 44;                       // avatar pitch (nominal px)
    const n = members.length;
    const rowY = -40;                   // avatars float above the anchor dot

    // connector + anchor dot at the true location
    scaleG.appendChild(svgEl("line", { class: "pm-stem", x1: 0, y1: 0, x2: 0, y2: rowY + 16 }));
    scaleG.appendChild(svgEl("circle", { class: "pm-dot", cx: 0, cy: 0, r: 4 }));

    members.forEach((mem, i) => {
      const x = (i - (n - 1) / 2) * D;
      const isSelf = mem.id === selfId;
      const av = svgEl("g", {
        class: "pm-av t-" + (mem.tone || "gold") + (isSelf ? " is-self" : ""),
        transform: `translate(${x},${rowY})`,
      });
      av.appendChild(svgEl("circle", { class: "pm-ring", cx: 0, cy: 0, r: 20 }));
      av.appendChild(svgEl("circle", { class: "pm-fill", cx: 0, cy: 0, r: 17 }));
      const tx = svgEl("text", { class: "pm-initials", x: 0, y: 1, "text-anchor": "middle", "dominant-baseline": "central" });
      tx.textContent = mem.initials || (mem.name || "?").slice(0, 1);
      av.appendChild(tx);
      const title = svgEl("title");
      title.textContent = mem.name + (isSelf ? " (you)" : "");
      av.appendChild(title);
      scaleG.appendChild(av);
    });

    g.appendChild(scaleG);
    return g;
  }

  function applyCounterScale() {
    const inv = 1 / (currentScale() || 1);
    const layer = byId("party-layer");
    if (!layer) return;
    layer.querySelectorAll(".pm-scale").forEach((s) => {
      s.setAttribute("transform", `scale(${inv})`);
    });
  }

  function onWorldView() {
    return vWorld && !vWorld.hidden && legend && !legend.hidden;
  }

  function render() {
    const layer = ensureLayer();
    layer.innerHTML = "";

    if (!onWorldView()) { layer.style.display = "none"; return; }
    layer.style.display = "";

    // group located members by region (only the 6 top-level zones)
    const byRegion = {};
    roster.forEach((mem) => {
      const loc = locations[mem.id];
      if (!loc || !regionById(loc)) return;
      (byRegion[loc] = byRegion[loc] || []).push(mem);
    });

    Object.keys(byRegion).forEach((rid) => {
      layer.appendChild(buildCluster(rid, byRegion[rid]));
    });
    applyCounterScale();
  }

  // ---- pick mode -----------------------------------------------------------
  function setPicking(on) {
    picking = !!on;
    document.body.classList.toggle("is-picking", picking);
  }

  // Capture-phase click: in pick mode, a region click sets a location instead
  // of drilling into the submap.
  canvas.addEventListener("click", (e) => {
    if (!picking) return;
    const reg = e.target.closest && e.target.closest(".region[data-id]");
    if (!reg) return;
    const id = reg.getAttribute("data-id");
    e.preventDefault();
    e.stopImmediatePropagation();
    post({ type: "sf-map-pick", regionId: id });
  }, true);

  // ---- host messaging ------------------------------------------------------
  function post(msg) { try { window.parent.postMessage(msg, "*"); } catch (_) {} }

  window.addEventListener("message", (e) => {
    const d = e && e.data;
    if (!d || d.type !== "sf-map-state") return;
    selfId = d.selfId != null ? d.selfId : selfId;
    pickId = d.pickId != null ? d.pickId : null;
    if (Array.isArray(d.roster)) roster = d.roster;
    if (d.locations) locations = d.locations;
    setPicking(!!d.pick);
    render();
  });

  // ---- observers: keep markers in sync with pan/zoom and view changes ------
  new MutationObserver(applyCounterScale)
    .observe(panner, { attributes: true, attributeFilter: ["style"] });

  const viewObs = new MutationObserver(() => render());
  [vWorld, byId("view-submap"), legend, byId("citadel-legend")].forEach((n) => {
    if (n) viewObs.observe(n, { attributes: true, attributeFilter: ["hidden", "class"] });
  });
  window.addEventListener("resize", () => setTimeout(applyCounterScale, 160));

  // ---- announce ready: hand the host the canonical zone list ---------------
  function announce() {
    post({
      type: "sf-map-ready",
      zones: REGIONS.map((r) => ({ id: r.id, name: r.name, house: r.house, house_color: r.house_color })),
    });
    render();
  }
  // app.js renders synchronously on load; we run right after it.
  announce();
})();
