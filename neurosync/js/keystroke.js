// keystroke.js — keystroke dynamics: hold (dwell) time, flight time, WPM, accuracy.
window.App = window.App || {};

App.keystroke = (function () {
  var SENTENCES = [
    "The quick brown fox jumps over the lazy dog.",
    "Early detection of tremor can improve patient outcomes.",
    "A steady typing rhythm is a useful biomarker for motor control.",
    "A sudden drop in accuracy may indicate a neurological event."
  ];

  var input, sentenceEl, liveEl;
  var started = false, finished = false;
  var target = "";
  var samples = [];   // {hold, flight}
  var holdTimes = [], flightTimes = [];
  var lastUp = null;
  var startTime = 0;
  var keysPressed = 0;
  var lastResult = null;   // last completed summary, for the interpretation panel

  function $(id) { return document.getElementById(id); }

  function t(key) { return App.i18n.t(key); }

  function pickSentence() { return SENTENCES[Math.floor(Math.random() * SENTENCES.length)]; }

  function reset() {
    started = false; finished = false;
    samples = []; holdTimes = []; flightTimes = [];
    lastUp = null; startTime = 0; keysPressed = 0;
    input.value = "";
    input.disabled = true;
    sentenceEl.textContent = t("typing.idleHint");
    $("mHold").textContent = "--";
    $("mFlight").textContent = "--";
    $("mWpm").textContent = "--";
    $("mAcc").textContent = "--";
    liveEl.textContent = t("typing.idle");
    liveEl.className = "pill";
    App.charts.line($("chartKeystroke"), [{ label: "hold", color: "#3ddc97", points: [] }]);
    clearInterpret();
  }

  function start() {
    reset();
    started = true;
    target = pickSentence();
    sentenceEl.textContent = target;
    input.disabled = false;
    input.focus();
    startTime = performance.now();
    liveEl.textContent = t("typing.running");
    liveEl.className = "pill on";
  }

  function mean(arr) {
    if (!arr.length) return null;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function std(arr) {
    if (!arr.length) return null;
    var m = mean(arr), s = 0;
    for (var i = 0; i < arr.length; i++) s += (arr[i] - m) * (arr[i] - m);
    return Math.sqrt(s / arr.length);
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    if (m === 0) return n; if (n === 0) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      for (var j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }

  function liveAccuracy() {
    var typed = input.value;
    if (!typed.length) return 100;
    var dist = levenshtein(typed, target.substring(0, Math.max(typed.length, 1)));
    var acc = Math.max(0, 100 * (1 - dist / Math.max(typed.length, target.length)));
    return acc;
  }

  function drawChart() {
    var holdPts = holdTimes.slice(-60).map(function (v) { return { y: v }; });
    App.charts.line($("chartKeystroke"), [
      { label: "hold", color: "#3ddc97", points: holdPts }
    ]);
  }

  function renderInterpret(s) {
    lastResult = s;
    var acc = s.acc == null ? 100 : s.acc;
    var flight = s.flight == null ? 0 : s.flight;
    var g1 = App.gauge.build({
      title: t("interpret.acc"), value: acc, min: 0, max: 100,
      valueText: acc.toFixed(1) + "%",
      zones: [
        { to: 85, color: "#ff5d6c", label: t("interpret.drop") },
        { to: 95, color: "#f5b942", label: t("interpret.low") },
        { to: 100, color: "#3ddc97", label: t("interpret.normal") }
      ]
    });
    var g2 = App.gauge.build({
      title: t("interpret.flight"), value: flight, min: 0, max: 800,
      valueText: Math.round(flight) + " ms",
      zones: [
        { to: 350, color: "#3ddc97", label: t("interpret.normal") },
        { to: 600, color: "#f5b942", label: t("interpret.slower") },
        { to: 800, color: "#ff5d6c", label: t("interpret.slow") }
      ]
    });
    $("typingGauges").innerHTML = g1 + g2;
    var v = $("typingVerdict");
    if (acc < 85) { v.textContent = t("interpret.typingSudden"); v.className = "verdict bad"; }
    else if (flight > 600) { v.textContent = t("interpret.typingSlow"); v.className = "verdict warn"; }
    else if (acc < 95 || flight > 350) { v.textContent = t("interpret.typingMild"); v.className = "verdict warn"; }
    else { v.textContent = t("interpret.typingNormal"); v.className = "verdict good"; }
    v.style.display = "";
  }

  function clearInterpret() {
    lastResult = null;
    $("typingGauges").innerHTML = '<p class="interpret-empty">' + t("interpret.empty") + "</p>";
    var v = $("typingVerdict");
    v.textContent = ""; v.className = "verdict"; v.style.display = "none";
  }

  function refreshLive() {
    if (!started) return;
    var h = mean(holdTimes), f = mean(flightTimes);
    $("mHold").textContent = h == null ? "--" : Math.round(h);
    $("mFlight").textContent = f == null ? "--" : Math.round(f);
    var elapsedMin = (performance.now() - startTime) / 60000;
    var correct = Math.max(0, input.value.length - levenshtein(input.value, target.substring(0, Math.max(input.value.length, 1))));
    var wpm = elapsedMin > 0 ? Math.round((correct / 5) / elapsedMin) : 0;
    $("mWpm").textContent = wpm;
    $("mAcc").textContent = liveAccuracy().toFixed(1);

    drawChart();

    // auto-finish
    if (input.value.length >= target.length && !finished) finish();
  }

  function onKeyDown(e) {
    if (!started || finished) return;
    var now = performance.now();
    if (lastUp != null) {
      var flight = now - lastUp;
      flightTimes.push(flight);
      samples.push({ hold: null, flight: flight });
    }
    e.currentTarget._downTime = now;
  }

  function onKeyUp(e) {
    if (!started || finished) return;
    var now = performance.now();
    var down = e.currentTarget._downTime;
    if (down != null) {
      var hold = now - down;
      holdTimes.push(hold);
      samples.push({ hold: hold, flight: null });
    }
    lastUp = now;
    keysPressed++;
    refreshLive();
  }

  function finish() {
    if (finished) return;
    finished = true;
    input.disabled = true;
    liveEl.textContent = t("typing.done");
    liveEl.className = "pill on";

    var h = mean(holdTimes), f = mean(flightTimes);
    var acc = liveAccuracy();
    var summary = {
      kind: "typing",
      hold: h, flight: f, acc: acc,
      holdStd: std(holdTimes), flightStd: std(flightTimes),
      wpm: (function () {
        var elapsedMin = (performance.now() - startTime) / 60000;
        var correct = Math.max(0, target.length - levenshtein(input.value, target));
        return elapsedMin > 0 ? Math.round((correct / 5) / elapsedMin) : 0;
      })()
    };
    var prevBaseline = App.store.getBaseline();
    var flag = detectAnomaly(summary, prevBaseline);
    summary.flag = flag || "ok";
    App.store.addSession(summary);
    updateBaseline();
    if (App.health) App.health.render();
    renderInterpret(summary);
  }

  // ---- baseline & anomaly detection ----
  function updateBaseline() {
    // only clean (non-anomalous) sessions shape the baseline, so anomalies
    // never pollute the "normal" reference.
    var sessions = App.store.getSessions().filter(function (s) {
      return s.kind === "typing" && s.flag !== "sudden" && s.flag !== "slow";
    });
    if (sessions.length < 2) return;
    var flight = sessions.map(function (s) { return s.flight; });
    var acc = sessions.map(function (s) { return s.acc; });
    App.store.setBaseline({
      flightMean: mean(flight), flightStd: std(flight) || 1,
      accMean: mean(acc), accStd: std(acc) || 1,
      n: sessions.length
    });
  }

  function detectAnomaly(s, b) {
    if (!b || b.n < 2) return null;
    // sudden accuracy drop → potential stroke
    if (s.acc < b.accMean - Math.max(20, 2 * b.accStd)) {
      if (App.alerts) App.alerts.trigger("sudden", { drop: b.accMean - s.acc });
      return "sudden";
    }
    if (s.flight > b.flightMean + 3 * b.flightStd) {
      // gradual slowdown
      if (App.alerts) App.alerts.trigger("slow", {});
      return "slow";
    }
    return null;
  }

  // re-apply dynamic labels after a language switch
  function refresh() {
    if (!started) sentenceEl.textContent = t("typing.idleHint");
    if (finished) { liveEl.textContent = t("typing.done"); liveEl.className = "pill on"; }
    else if (started) { liveEl.textContent = t("typing.running"); liveEl.className = "pill on"; }
    else { liveEl.textContent = t("typing.idle"); liveEl.className = "pill"; }
    drawChart();
    if (lastResult) renderInterpret(lastResult); else clearInterpret();
  }

  function init() {
    input = $("typingInput");
    sentenceEl = $("testSentence");
    liveEl = $("typingLive");
    $("btnStartTyping").addEventListener("click", start);
    $("btnResetTyping").addEventListener("click", reset);
    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("keyup", onKeyUp);
    input.addEventListener("input", refreshLive);
    reset();
  }

  return { init: init, reset: reset, start: start, refresh: refresh };
})();
