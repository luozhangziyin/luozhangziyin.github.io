// alerts.js — 紧急检查流程：确认 → 30 秒倒计时 → 升级（拨号链接 + 警报音）。
// 浏览器无法自动拨号，升级后给出 tel: 链接，由人点击拨打。
window.App = window.App || {};
App.alerts = (function () {
  var overlay, titleEl, textEl, sosBtn, dismissBtn, linksEl, lastTrigger = null, timer = null, left = 30, escalated = false, actx = null;
  function $(id) { return document.getElementById(id); }
  function t(key) { return App.i18n.t(key); }
  function fmt(key, vars) { return App.i18n.fmt(key, vars); }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function hide() { stop(); escalated = false; linksEl.innerHTML = ""; overlay.classList.add("hidden"); }

  function beep() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      for (var i = 0; i < 6; i++) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.4;
        o.frequency.value = 880; g.gain.setValueAtTime(0.3, t0); g.gain.setValueAtTime(0.0001, t0 + 0.25);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.3);
      }
    } catch (e) {}
  }

  function buildText() {
    if (!lastTrigger) return { title: "", text: "" };
    if (lastTrigger.kind === "sudden") {
      var drop = (lastTrigger.opts && lastTrigger.opts.drop != null) ? lastTrigger.opts.drop : 0;
      return { title: t("alert.suddenTitle"), text: fmt("alert.suddenText", { drop: drop.toFixed(1) }) };
    }
    if (lastTrigger.kind === "slow") return { title: t("alert.slowTitle"), text: t("alert.slowText") };
    return { title: t("alert.demoTitle"), text: t("alert.demoText") };
  }

  function render() {
    if (escalated) {
      titleEl.textContent = t("alert.escTitle");
      textEl.textContent = t("alert.escText");
      var s = App.store.getSettings();
      var html = '<a class="btn btn-primary" href="tel:' + s.emergency + '">' + fmt("alert.callEm", { n: s.emergency }) + "</a> ";
      if (s.caregiver) html += '<a class="btn btn-ghost" href="tel:' + s.caregiver + '">' + fmt("alert.callCare", { n: s.caregiver }) + "</a>";
      linksEl.innerHTML = html;
    } else {
      var b = buildText();
      titleEl.textContent = b.title;
      textEl.textContent = b.text + (timer ? "  " + fmt("alert.countdown", { s: left }) : "");
    }
    sosBtn.textContent = t("alert.sosLabel");
    dismissBtn.textContent = t("alert.dismissLabel");
  }

  function escalate() { stop(); escalated = true; render(); beep(); }

  // kind: 'sudden' | 'slow' | 'demo'
  function trigger(kind, opts) {
    lastTrigger = { kind: kind, opts: opts || {} };
    escalated = false; linksEl.innerHTML = ""; stop();
    if (kind !== "slow") {
      left = 30;
      timer = setInterval(function () { left--; if (left <= 0) escalate(); else render(); }, 1000);
    }
    render();
    overlay.classList.remove("hidden");
    var n = 0, id = setInterval(function () {
      document.body.classList.toggle("home-flash");
      if (++n >= 8) { clearInterval(id); document.body.classList.remove("home-flash"); }
    }, 250);
  }

  function init() {
    overlay = $("alertOverlay"); titleEl = $("alertTitle"); textEl = $("alertText");
    sosBtn = $("alertSOS"); dismissBtn = $("alertDismiss");
    linksEl = document.createElement("div"); linksEl.style.marginTop = "12px";
    textEl.parentNode.insertBefore(linksEl, sosBtn.parentNode === textEl.parentNode ? sosBtn : null);
    sosBtn.addEventListener("click", escalate);
    dismissBtn.addEventListener("click", hide);
    sosBtn.textContent = t("alert.sosLabel"); dismissBtn.textContent = t("alert.dismissLabel");
  }

  return { init: init, trigger: trigger, hide: hide, refresh: render };
})();
