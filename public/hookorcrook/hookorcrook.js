/* ===========================================================================
   By Hook or By Crook — briefing behaviour
   - the wax seal that has to be broken before the file opens
   - scroll reveals, redaction wipes, HUD chapter + progress
   - Riot's transmissions unscrambling into plain text
   - the dread that builds around the Shepherd's Crook
   =========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var vh = window.innerHeight;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /* ------------------------------------------------------------ the seal */
  var sealScreen = document.getElementById("seal-screen");
  var sealButton = document.getElementById("seal-button");
  var opened = false;

  function breakSeal() {
    if (opened) return;
    opened = true;
    window.scrollTo(0, 0);
    body.classList.remove("sealed");
    body.classList.add("breaking", "unsealed");
    var settle = reduceMotion ? 250 : 2100;
    setTimeout(startBriefing, reduceMotion ? 0 : 650);
    setTimeout(function () {
      body.classList.remove("breaking");
      var title = document.getElementById("title");
      if (title) title.focus({ preventScroll: true });
    }, settle);
  }

  sealButton.addEventListener("click", breakSeal);
  sealScreen.addEventListener("wheel", breakSeal, { passive: true });
  sealScreen.addEventListener("touchmove", breakSeal, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (opened) return;
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Enter") {
      if (e.target !== sealButton) e.preventDefault();
      breakSeal();
    }
  });
  window.addEventListener("load", function () {
    if (!opened) sealButton.focus({ preventScroll: true });
  });

  document.getElementById("reseal").addEventListener("click", function () {
    window.scrollTo(0, 0);
    window.location.reload();
  });

  /* ------------------------------------------------------------ decode setup */
  var GLYPHS = "†‡§¶∴∵◊※✦✧⁂#%&*/\\<>=+~^";
  var decodeQueue = [];

  Array.prototype.forEach.call(document.querySelectorAll(".decode"), function (p) {
    var text = p.textContent;
    if (reduceMotion) return;
    p.textContent = "";
    var wrap = document.createElement("span");
    wrap.className = "decode-wrap";
    wrap.setAttribute("aria-hidden", "true");
    var ghost = document.createElement("span");
    ghost.className = "decode-ghost";
    ghost.textContent = text;
    var live = document.createElement("span");
    live.className = "decode-live";
    wrap.appendChild(ghost);
    wrap.appendChild(live);
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    p.appendChild(wrap);
    p.appendChild(sr);
    decodeQueue.push({ p: p, text: text, live: live, done: false });
  });

  function runDecode(item, delay) {
    if (item.done) return;
    item.done = true;
    var text = item.text;
    var len = text.length;
    var duration = clamp(700 + len * 11, 900, 3200);
    var tail = 14;
    var start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / duration, 0, 1);
      var shown = Math.floor(t * len);
      var html = escapeHtml(text.slice(0, shown));
      var noise = "";
      for (var i = shown; i < Math.min(len, shown + tail); i++) {
        var ch = text[i];
        noise += ch === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      if (noise) html += '<span class="glyph">' + escapeHtml(noise) + "</span>";
      item.live.innerHTML = html;
      if (t < 1) requestAnimationFrame(frame);
      else item.live.textContent = text;
    }
    setTimeout(function () {
      requestAnimationFrame(frame);
    }, delay);
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ------------------------------------------------------------ hazard tape */
  // Repeat the tape text so it always overruns the widest screen; the marquee
  // scrolls by half its length, so an even number of copies loops seamlessly.
  Array.prototype.forEach.call(document.querySelectorAll(".tape span"), function (span) {
    span.textContent = new Array(5).join(span.textContent);
  });

  /* ------------------------------------------------------------ redaction order */
  Array.prototype.forEach.call(document.querySelectorAll("p"), function (p) {
    var bars = p.querySelectorAll(".redact");
    for (var i = 0; i < bars.length; i++) bars[i].style.setProperty("--i", i);
  });

  /* ------------------------------------------------------------ the briefing */
  function startBriefing() {
    // Scroll reveals
    var revealIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealIO.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) {
      revealIO.observe(el);
    });

    // Riot's transmissions decode once the channel is on screen
    var channelIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          channelIO.unobserve(entry.target);
          var delay = 650;
          decodeQueue.forEach(function (item) {
            if (!entry.target.contains(item.p)) return;
            runDecode(item, delay);
            delay += clamp(700 + item.text.length * 11, 900, 3200) * 0.7;
          });
        });
      },
      { rootMargin: "0px 0px -25% 0px", threshold: 0.2 }
    );
    Array.prototype.forEach.call(document.querySelectorAll(".channel"), function (el) {
      channelIO.observe(el);
    });

    // HUD chapter label
    var hudChapter = document.getElementById("hud-chapter");
    var chapterIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) hudChapter.textContent = entry.target.getAttribute("data-chapter");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    Array.prototype.forEach.call(document.querySelectorAll("[data-chapter]"), function (el) {
      chapterIO.observe(el);
    });

    // "...bring a lesser caster to their knees."
    var knees = document.querySelector(".knees");
    if (knees) {
      var kneesIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            kneesIO.disconnect();
            setTimeout(function () {
              knees.classList.add("is-hit");
              if (reduceMotion) return;
              body.classList.add("kneel");
              setTimeout(function () {
                body.classList.remove("kneel");
              }, 1250);
            }, 900);
          });
        },
        { rootMargin: "0px 0px -35% 0px", threshold: 1 }
      );
      kneesIO.observe(knees);
    }

    onScroll();
  }

  /* ------------------------------------------------------------ scroll-driven bits */
  var progress = document.getElementById("hud-progress");
  var vault = document.getElementById("vault");
  var prizeProse = document.querySelector(".prose--prize");
  var ticking = false;

  function onScroll() {
    ticking = false;
    var max = root.scrollHeight - vh;
    progress.style.setProperty("--progress", max > 0 ? clamp(window.scrollY / max, 0, 1) : 0);

    // Focus: the Crook's name sharpens out of a blur as you close in on it.
    var r = vault.getBoundingClientRect();
    var t = (vh - r.top) / r.height;
    var focus = reduceMotion ? (t > 0.2 ? 1 : 0) : clamp((t - 0.15) / 0.6, 0, 1);
    vault.style.setProperty("--focus", focus.toFixed(3));
    vault.classList.toggle("is-gazing", focus > 0.95 && !reduceMotion);

    // Dread: the vignette closes in on the approach, holds while you read about
    // the thing, then lets go.
    var dread;
    var p = prizeProse.getBoundingClientRect();
    if (r.top > vh) dread = 0;
    else if (r.top > 0) dread = 1 - r.top / vh;
    else if (r.bottom > vh) dread = 1;
    else if (p.bottom > vh * 0.45) dread = 0.72 + 0.28 * clamp((r.bottom - vh * 0.3) / (vh * 0.7), 0, 1);
    else dread = 0.72 * clamp(1 - (vh * 0.45 - p.bottom) / (vh * 0.55), 0, 1);
    root.style.setProperty("--dread", (dread * (reduceMotion ? 0.6 : 1)).toFixed(3));
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", function () {
    vh = window.innerHeight;
    onScroll();
  });
})();
