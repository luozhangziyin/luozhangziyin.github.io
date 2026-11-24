// mouse.js — mouse micro-tremor capture & analysis (hold-still + line-trace).
window.App = window.App || {};

App.mouse = (function () {
  var stage, canvas, ctx, target, hint, liveEl;
  var mode = null;             // 'hold' | 'line'
  var samples = [];            // {x, y, t}
  var running = false;
  var phase = "idle";          // 'idle' | 'running' | 'done' | 'insufficient'
  var deadline = 0;
  var recordFrom = 0;          // timestamp when sample recording actually begins
  var countdownId = null;
  var HOLD_MS = 5000, LINE_MS = 6000, GRACE_MS = 2000;
  var lastResult = null;       // last completed analysis, for the interpretation panel

  function $(id) { return document.getElementById(id); }
  function t(key) { return App.i18n.t(key); }

  function resize() {
    clearCanvas();
  }

  function clearCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var w = stage.clientWidth, h = stage.clientHeight;
    // (re)size the backing buffer when the view becomes visible (a hidden
    // view reports 0x0, so drawing into it would otherwise be invisible).
    if (w && h && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
  }

  function showTarget(show) {
    if (show) {
      target.classList.remove("hidden");
      target.style.left = (stage.clientWidth / 2) + "px";
      target.style.top = (stage.clientHeight / 2) + "px";
    } else {
      target.classList.add("hidden");
    }
  }

  function drawGuideLine() {
    var y = stage.clientHeight / 2;
    ctx.strokeStyle = "rgba(61,220,151,0.4)";
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(stage.clientWidth - 20, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawTrace() {
    clearCanvas();
    if (mode === "line") drawGuideLine();
    if (samples.length < 2) return;
    ctx.strokeStyle = "#4da3ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  function onMove(e) {
    if (!running) return;
    // ignore the travel from the button to the target during the warm-up
    if (performance.now() < recordFrom) return;
    var rect = stage.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    samples.push({ x: x, y: y, t: performance.now() });
    drawTrace();
  }

  function rms(arr) {
    if (!arr.length) return 0;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i] * arr[i];
    return Math.sqrt(s / arr.length);
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function detrend(arr) {
    var win = 7, out = [];
    for (var i = 0; i < arr.length; i++) {
      var s = 0, c = 0;
      for (var j = Math.max(0, i - win); j <= Math.min(arr.length - 1, i + win); j++) { s += arr[j]; c++; }
      out.push(arr[i] - s / c);
    }
    return out;
  }

  function zeroCrossFreq(arr, dt) {
    var cross = 0;
    for (var i = 1; i < arr.length; i++) if (arr[i - 1] * arr[i] < 0) cross++;
    var sec = arr.length * dt;
    return sec > 0 ? cross / (2 * sec) : 0;
  }

  function analyze() {
    if (samples.length < 10) return null;
    var xs = samples.map(function (p) { return p.x; });
    var ys = samples.map(function (p) { return p.y; });
    var dt = (samples[samples.length - 1].t - samples[0].t) / Math.max(1, samples.length - 1) / 1000;

    var dx = detrend(xs), dy = detrend(ys);
    var jitter = rms(dx) + rms(dy); // px, high-frequency component
    var freq = (zeroCrossFreq(dx, dt) + zeroCrossFreq(dy, dt)) / 2;

    var dev;
    if (mode === "line") {
      var lineY = mean(ys);
      dev = rms(ys.map(function (v) { return v - lineY; }));
    } else {
      var cx = mean(xs), cy = mean(ys);
      dev = Math.sqrt(mean(xs.map(function (v) { return (v - cx) * (v - cx); })) +
                      mean(ys.map(function (v) { return (v - cy) * (v - cy); })));
    }
    return { jitter: jitter, freq: freq, dev: dev, n: samples.length, mode: mode };
  }

  function renderInterpret(r) {
    lastResult = r;
    var g1 = App.gauge.build({
      title: t("interpret.jitter"), value: r.jitter, min: 0, max: 30,
      valueText: r.jitter.toFixed(1) + " px",
      zones: [
        { to: 8, color: "#3ddc97", label: t("interpret.steady") },
        { to: 20, color: "#f5b942", label: t("interpret.mild") },
        { to: 30, color: "#ff5d6c", label: t("interpret.noticeable") }
      ]
    });
    var g2 = App.gauge.build({
      title: t("interpret.freq"), value: r.freq, min: 0, max: 13,
      valueText: r.freq.toFixed(1) + " Hz",
      zones: [
        { to: 3, color: "#3ddc97", label: t("interpret.noRhythm") },
        { to: 6, color: "#ff9f43", label: t("interpret.lowBand") },
        { to: 13, color: "#f5b942", label: t("interpret.highBand") }
      ]
    });
    $("mouseGauges").innerHTML = g1 + g2;
    var v = $("mouseVerdict");
    var jz = r.jitter < 8 ? "steady" : (r.jitter < 20 ? "mild" : "noticeable");
    var fz = r.freq < 3 ? "steady" : (r.freq < 6 ? "low" : "high");
    if (jz === "noticeable" || fz === "low") { v.textContent = t("interpret.verdictNoticeable"); v.className = "verdict bad"; }
    else if (jz === "mild" || fz === "high") { v.textContent = t("interpret.verdictMild"); v.className = "verdict warn"; }
    else { v.textContent = t("interpret.verdictSteady"); v.className = "verdict good"; }
    v.style.display = "";
  }

  function clearInterpret() {
    lastResult = null;
    $("mouseGauges").innerHTML = '<p class="interpret-empty">' + t("interpret.empty") + "</p>";
    var v = $("mouseVerdict");
    v.textContent = ""; v.className = "verdict"; v.style.display = "none";
  }

  function refresh() {
    if (phase === "running") {
      hint.textContent = mode === "hold" ? t("mouse.hintHold") : t("mouse.hintLine");
      var now = performance.now();
      var label = mode === "hold" ? t("mouse.holdLabel") : t("mouse.lineLabel");
      if (now < recordFrom) {
        liveEl.textContent = t("mouse.getReady") + " " + Math.ceil((recordFrom - now) / 1000) + "s";
      } else {
        var remain = Math.max(0, deadline - now);
        liveEl.textContent = label + " " + Math.ceil(remain / 1000) + "s";
      }
      liveEl.className = "pill on";
    } else {
      hint.textContent = t("mouse.hintIdle");
      if (phase === "done") { liveEl.textContent = t("mouse.done"); liveEl.className = "pill on"; }
      else if (phase === "insufficient") { liveEl.textContent = t("mouse.insufficient"); liveEl.className = "pill warn"; }
      else { liveEl.textContent = t("mouse.idle"); liveEl.className = "pill"; }
    }
    drawTrace();
    if (phase !== "running") {
      if (lastResult) renderInterpret(lastResult); else clearInterpret();
    }
  }

  function finish() {
    running = false;
    document.removeEventListener("mousemove", onMove);
    var r = analyze();
    if (r) {
      $("mJitter").textContent = r.jitter.toFixed(1);
      $("mFreq").textContent = r.freq.toFixed(1);
      $("mDev").textContent = r.dev.toFixed(1);
      $("mSamples").textContent = r.n;
      phase = "done";
      App.store.addSession({ kind: "mouse", jitter: r.jitter, freq: r.freq, dev: r.dev, mode: r.mode, n: r.n });
      if (App.health) App.health.render();
      lastResult = r;
    } else {
      phase = "insufficient";
      lastResult = null;
    }
    mode = null;
    showTarget(false);
    refresh();
  }

  function beginTest(ms) {
    var now = performance.now();
    recordFrom = now + GRACE_MS;   // warm-up: ignore travel from the button
    deadline = recordFrom + ms;
    countdownId = setInterval(function () {
      if (performance.now() >= deadline) {
        clearInterval(countdownId);
        finish();
      } else {
        refresh();
      }
    }, 100);
  }

  function startHold() {
    if (running) return;
    stop();
    mode = "hold";
    samples = [];
    running = true;
    phase = "running";
    clearInterpret();
    showTarget(true);
    drawTrace();
    document.addEventListener("mousemove", onMove);
    beginTest(HOLD_MS);
    refresh();
  }

  function startLine() {
    if (running) return;
    stop();
    mode = "line";
    samples = [];
    running = true;
    phase = "running";
    clearInterpret();
    showTarget(false);
    drawTrace();
    document.addEventListener("mousemove", onMove);
    beginTest(LINE_MS);
    refresh();
  }

  function stop() {
    running = false;
    mode = null;
    if (countdownId) { clearInterval(countdownId); countdownId = null; }
    document.removeEventListener("mousemove", onMove);
    showTarget(false);
  }

  function reset() {
    stop();
    samples = [];
    clearCanvas();
    phase = "idle";
    $("mJitter").textContent = "--";
    $("mFreq").textContent = "--";
    $("mDev").textContent = "--";
    $("mSamples").textContent = "--";
    clearInterpret();
    refresh();
  }

  function init() {
    stage = $("mouseStage");
    canvas = $("mouseTrace");
    ctx = canvas.getContext("2d");
    target = $("mouseTarget");
    hint = $("mouseStageHint");
    liveEl = $("mouseLive");
    $("btnHoldTest").addEventListener("click", startHold);
    $("btnLineTest").addEventListener("click", startLine);
    $("btnMouseReset").addEventListener("click", reset);
    window.addEventListener("resize", resize);
    resize();
    reset();
  }

  return { init: init, reset: reset, refresh: refresh };
})();
