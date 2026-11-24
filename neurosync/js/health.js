// health.js — the unified Health dashboard (overview) that aggregates all signals.
window.App = window.App || {};

App.health = (function () {
  function $(id) { return document.getElementById(id); }
  function t(key) { return App.i18n.t(key); }
  function fmt(key, vars) { return App.i18n.fmt(key, vars); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setRing(el, value, color) {
    var v = clamp(value, 0, 100);
    el.style.background = "conic-gradient(" + color + " " + v + "%, #26354d 0%)";
    el.querySelector("span").textContent = Math.round(value);
  }

  function computeScores() {
    var sessions = App.store.getSessions();
    var typing = sessions.filter(function (s) { return s.kind === "typing"; });
    var mouse = sessions.filter(function (s) { return s.kind === "mouse"; });

    var rhythm = null, rhythmLabel = t("health.noData");
    if (typing.length) {
      var last = typing[typing.length - 1];
      var flightPenalty = Math.max(0, (last.flight - 280) / 8);
      var speedPenalty = Math.max(0, (90 - last.flight) / 12); // erratic ultra-fast
      rhythm = clamp(last.acc - flightPenalty - speedPenalty, 0, 100);
      rhythmLabel = t("health.acc") + " " + last.acc.toFixed(1) + "% · " + t("health.flightMs") + " " + Math.round(last.flight) + "ms";
    }

    var tremor = null, tremorLabel = t("health.noData");
    if (mouse.length) {
      var lastM = mouse[mouse.length - 1];
      tremor = clamp(100 - lastM.jitter * 3, 0, 100);
      tremorLabel = t("health.jitterPx") + " " + lastM.jitter.toFixed(1) + "px · " + lastM.freq.toFixed(1) + "Hz";
    }

    var events = App.store.getWristEvents();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayN = events.filter(function (e) { return e.t >= today.getTime(); }).length;
    var wristLabel = todayN === 0 ? t("health.wristNone") : fmt("health.wristCount", { n: todayN });

    return { rhythm: rhythm, rhythmLabel: rhythmLabel, tremor: tremor, tremorLabel: tremorLabel, wrist: todayN, wristLabel: wristLabel, typing: typing, mouse: mouse };
  }

  function render() {
    var sc = computeScores();

    if (sc.rhythm == null) {
      $("scoreRhythm").textContent = "--";
      $("ringRhythm").style.background = "conic-gradient(#3ddc97 0%, #26354d 0%)";
      $("scoreRhythmLabel").textContent = sc.rhythmLabel;
    } else {
      setRing($("ringRhythm"), sc.rhythm, "#3ddc97");
      $("scoreRhythmLabel").textContent = sc.rhythmLabel;
    }
    if (sc.tremor == null) {
      $("scoreTremor").textContent = "--";
      $("ringTremor").style.background = "conic-gradient(#4da3ff 0%, #26354d 0%)";
      $("scoreTremorLabel").textContent = sc.tremorLabel;
    } else {
      setRing($("ringTremor"), sc.tremor, "#4da3ff");
      $("scoreTremorLabel").textContent = sc.tremorLabel;
    }
    var wristPct = clamp(sc.wrist * 15, 0, 100);
    $("ringWrist").style.background = "conic-gradient(#f5b942 " + wristPct + "%, #26354d 0%)";
    $("scoreWrist").textContent = sc.wrist;
    $("scoreWristLabel").textContent = sc.wristLabel;

    // trend charts
    App.charts.line($("chartFlight"), [{
      label: "flight", color: "#3ddc97",
      points: sc.typing.map(function (s) { return { y: s.flight }; }),
      fill: true
    }]);
    App.charts.line($("chartTremorTrend"), [{
      label: "jitter", color: "#4da3ff",
      points: sc.mouse.map(function (s) { return { y: s.jitter }; }),
      fill: true
    }]);

    renderTimeline();
    renderRisk(sc);
  }

  function renderTimeline() {
    var items = [];
    App.store.getSessions().forEach(function (s) {
      items.push({
        t: s.t,
        tag: s.kind === "typing" ? t("health.tagTyping") : t("health.tagTremorTest"),
        cls: "",
        text: s.kind === "typing" ? (t("health.acc") + " " + s.acc.toFixed(0) + "%") : (t("health.jitterPx") + " " + s.jitter.toFixed(1) + "px")
      });
    });
    App.store.getWristEvents().forEach(function (e) {
      var cls = e.type === "tremor" ? "" : ((e.type === "fog" || e.type === "warn") ? "warn" : "bad");
      var label = e.type === "tremor" ? t("health.tagTremor") : (e.type === "fog" ? t("health.tagFog") : (e.type === "warn" ? t("health.tagWarn") : t("health.tagStress")));
      items.push({ t: e.t, tag: label, cls: cls, text: t("health.intensity") + " " + Math.round(e.intensity) });
    });
    items.sort(function (a, b) { return b.t - a.t; });
    items = items.slice(0, 25);

    var el = $("eventTimeline");
    if (!items.length) { el.innerHTML = '<p class="muted">' + t("wrist.noEvents") + "</p>"; return; }
    el.innerHTML = items.map(function (it) {
      var d = new Date(it.t);
      var ts = (d.getMonth() + 1) + "/" + d.getDate() + " " +
        d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
      return '<div class="tl-item"><span class="tl-time">' + ts + "</span>" +
        '<span class="tl-tag ' + it.cls + '">' + it.tag + "</span>" +
        "<span>" + it.text + "</span></div>";
    }).join("");
  }

  function renderRisk(sc) {
    var b = App.store.getBaseline();
    var el = $("riskBanner");
    var textEl = $("riskText");
    if (!sc.typing.length && !sc.mouse.length) {
      el.style.borderLeftColor = "#3ddc97";
      textEl.textContent = t("risk.needBaseline");
    } else if (!b || b.n < 2) {
      el.style.borderLeftColor = "#f5b942";
      textEl.textContent = t("risk.building");
    } else {
      var last = sc.typing[sc.typing.length - 1];
      if (last && last.acc < b.accMean - 20) {
        el.style.borderLeftColor = "#ff5d6c";
        textEl.textContent = fmt("risk.sudden", { from: b.accMean.toFixed(0), to: last.acc.toFixed(0) });
      } else if (last && last.flight > b.flightMean + 2 * b.flightStd) {
        el.style.borderLeftColor = "#f5b942";
        textEl.textContent = t("risk.slow");
      } else {
        el.style.borderLeftColor = "#3ddc97";
        textEl.textContent = t("risk.ok");
      }
    }
  }

  function init() {
    render();
  }

  return { init: init, render: render };
})();
