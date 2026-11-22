/* ===========================================================================
   By Hook or By Crook — narrated cold open
   - lines fade up out of the dark as they're scrolled to; beats arrive word
     by word
   - drifting gold motes (a slow starfall) behind everything, with the odd
     falling star
   - the light dims as the narration nears the Shepherd's Crook (per-line
     data-dim values), and the motes slow with it
   - a letterbox that slides in on open and closes around the end card
   =========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /* ------------------------------------------------------------ beats → words */
  Array.prototype.forEach.call(document.querySelectorAll(".beat"), function (beat) {
    var words = beat.textContent.split(" ");
    beat.textContent = "";
    words.forEach(function (w, i) {
      if (i > 0) beat.appendChild(document.createTextNode(" "));
      var span = document.createElement("span");
      span.className = "word";
      span.style.setProperty("--w", i);
      span.textContent = w;
      beat.appendChild(span);
    });
  });

  /* ------------------------------------------------------------ reveals */
  var firstLine = document.querySelector(".line--first");
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  Array.prototype.forEach.call(document.querySelectorAll(".line, .break, .endcard"), function (el) {
    if (el !== firstLine) io.observe(el);
  });

  /* ------------------------------------------------------------ open */
  var barBase = 0;
  var barTarget = vw < 640 ? 4.5 : 7;
  var openStart = null;

  function open() {
    body.classList.add("opened");
    firstLine.classList.add("is-in");
    if (reduceMotion) {
      barBase = barTarget;
      update();
      return;
    }
    requestAnimationFrame(function step(ts) {
      if (openStart === null) openStart = ts;
      var t = clamp((ts - openStart) / 1800, 0, 1);
      barBase = barTarget * (1 - Math.pow(1 - t, 3));
      update();
      if (t < 1) requestAnimationFrame(step);
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      setTimeout(open, 250);
    });
  } else {
    setTimeout(open, 250);
  }

  /* ------------------------------------------------------------ light + letterbox */
  var dimEls = Array.prototype.slice.call(document.querySelectorAll(".line, .break"));
  var endcard = document.getElementById("endcard");
  var dimTarget = 0;
  var dim = 0;

  function update() {
    // Which line is the narrator on? The one nearest the middle of the screen.
    var mid = vh / 2;
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < dimEls.length; i++) {
      var r = dimEls[i].getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      var d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = dimEls[i];
      }
    }
    dimTarget = best ? parseFloat(best.getAttribute("data-dim") || "0") : 0;
    if (reduceMotion) {
      dim = dimTarget;
      root.style.setProperty("--dim", dim.toFixed(3));
    }

    // The letterbox closes to a slit as the end card comes up.
    var e = endcard.getBoundingClientRect();
    var t = clamp(1 - e.top / vh, 0, 1);
    var slit = vw < 640 ? 34 : 37;
    var bar = barBase + (slit - barBase) * t * t * (3 - 2 * t);
    root.style.setProperty("--bar", bar.toFixed(2));
  }

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    },
    { passive: true }
  );

  /* ------------------------------------------------------------ motes */
  var canvas = document.getElementById("motes");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var motes = [];
  var star = null;
  var nextStar = 4000 + Math.random() * 5000;
  var last = null;

  function seed() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(150, Math.round((vw * vh) / 12000));
    motes = [];
    for (var i = 0; i < n; i++) {
      var depth = Math.random();
      motes.push({
        x: Math.random() * vw,
        y: Math.random() * vh,
        r: 0.35 + depth * 1.5,
        depth: depth,
        vy: 0.004 + depth * 0.012,      // px per ms, downward: a slow starfall
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.0002 + Math.random() * 0.0004,
        a: 0.15 + depth * 0.55,
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.0008 + Math.random() * 0.0016,
      });
    }
  }

  function draw(now, dt) {
    ctx.clearRect(0, 0, vw, vh);
    var speed = 1 - dim * 0.85;
    var light = 1 - dim * 0.55;
    var scroll = window.scrollY;

    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y += m.vy * dt * speed;
      m.sway += m.swaySpeed * dt * speed;
      m.tw += m.twSpeed * dt;
      if (m.y > vh + 10) {
        m.y = -10;
        m.x = Math.random() * vw;
      }
      // a little parallax against the scroll, deeper motes move more
      var py = (m.y - scroll * 0.04 * m.depth) % (vh + 20);
      if (py < -10) py += vh + 20;
      var px = m.x + Math.sin(m.sway) * 14 * m.depth;
      var alpha = m.a * light * (0.65 + 0.35 * Math.sin(m.tw));
      // ember-warm as the light dims
      var g = Math.round(201 - dim * 70);
      var b = Math.round(131 - dim * 50);
      ctx.beginPath();
      ctx.fillStyle = "rgba(236," + g + "," + b + "," + alpha.toFixed(3) + ")";
      ctx.arc(px, py, m.r, 0, Math.PI * 2);
      ctx.fill();
      if (m.r > 1.3) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(236," + g + "," + b + "," + (alpha * 0.12).toFixed(3) + ")";
        ctx.arc(px, py, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // the odd falling star, only while the room is lit
    if (dt) {
      nextStar -= dt;
      if (!star && nextStar <= 0 && dim < 0.25) {
        star = {
          x: vw * (0.15 + Math.random() * 0.7),
          y: vh * (0.05 + Math.random() * 0.3),
          vx: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2),
          vy: 0.35 + Math.random() * 0.15,
          life: 0,
          span: 1100,
        };
        nextStar = 9000 + Math.random() * 9000;
      }
    }
    if (star) {
      star.life += dt;
      var p = star.life / star.span;
      if (p >= 1) {
        star = null;
      } else {
        var hx = star.x + star.vx * star.life;
        var hy = star.y + star.vy * star.life;
        var tx = hx - star.vx * 260;
        var ty = hy - star.vy * 260;
        var fade = Math.sin(p * Math.PI);
        var grad = ctx.createLinearGradient(hx, hy, tx, ty);
        grad.addColorStop(0, "rgba(244,236,210," + (0.85 * fade).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(244,236,210,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
  }

  function loop(now) {
    var dt = last === null ? 16 : Math.min(now - last, 50);
    last = now;
    // ease the light toward wherever the narration is
    dim += (dimTarget - dim) * Math.min(1, dt / 900);
    root.style.setProperty("--dim", dim.toFixed(3));
    draw(now, dt);
    requestAnimationFrame(loop);
  }

  seed();
  update();
  if (reduceMotion) {
    draw(0, 0);
  } else {
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", function () {
    seed();
    barTarget = vw < 640 ? 4.5 : 7;
    if (body.classList.contains("opened")) barBase = barTarget;
    update();
    if (reduceMotion) draw(0, 0);
  });
})();
