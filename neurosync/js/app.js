// app.js — main entry: language, tab navigation, settings, demo trigger, wiring.
window.App = window.App || {};

(function () {
  function $(id) { return document.getElementById(id); }

  function initTabs() {
    // re-render a view when it becomes visible, so canvases sized while hidden
    // (0x0) get redrawn at their real size.
    var rerender = {
      overview: function () { if (App.health) App.health.render(); },
      typing: function () { if (App.keystroke) App.keystroke.refresh(); },
      mouse: function () { if (App.mouse) App.mouse.refresh(); },
      wristband: function () { if (App.wristband) App.wristband.refresh(); },
      settings: function () {},
      about: function () {}
    };
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
        $("view-" + tab.dataset.tab).classList.add("active");
        var fn = rerender[tab.dataset.tab];
        if (fn) fn();
      });
    });
  }

  function initLangToggle() {
    var btn = $("langToggle");
    btn.addEventListener("click", function () {
      var next = App.i18n.getLang() === "zh" ? "en" : "zh";
      var s = App.store.getSettings();
      s.lang = next;
      App.store.setSettings(s);
      App.i18n.apply(next);
    });
  }

  function initSettings() {
    var s = App.store.getSettings();
    $("cfgServiceUUID").value = s.serviceUUID;
    $("cfgCharUUID").value = s.charUUID;
    $("cfgCueUUID").value = s.cueUUID;
    $("cfgCaregiver").value = s.caregiver;
    $("cfgEmergency").value = s.emergency;

    function persist() {
      var cur = App.store.getSettings();
      cur.serviceUUID = $("cfgServiceUUID").value.trim() || cur.serviceUUID;
      cur.charUUID = $("cfgCharUUID").value.trim() || cur.charUUID;
      cur.cueUUID = $("cfgCueUUID").value.trim() || cur.cueUUID;
      cur.caregiver = $("cfgCaregiver").value.trim();
      cur.emergency = $("cfgEmergency").value.trim() || "120";
      App.store.setSettings(cur);
    }
    $("cfgServiceUUID").addEventListener("change", persist);
    $("cfgCharUUID").addEventListener("change", persist);
    ["cfgCueUUID", "cfgCaregiver", "cfgEmergency"].forEach(function (id) { $(id).addEventListener("change", persist); });

    $("btnRebuildBaseline").addEventListener("click", function () {
      App.store.setBaseline(null);
      App.health.render();
    });

    $("btnClearAll").addEventListener("click", function () {
      if (confirm(App.i18n.t("settings.confirmClear"))) {
        var lang = App.store.getSettings().lang;
        App.store.reset();
        var s2 = App.store.getSettings();
        s2.lang = lang;
        App.store.setSettings(s2);
        App.keystroke.reset();
        App.mouse.reset();
        App.wristband.refresh();
        App.health.render();
      }
    });

    $("btnExport").addEventListener("click", function () {
      var blob = new Blob([App.store.exportJSON()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "neurosync-data-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    $("btnDemoAlert").addEventListener("click", function () {
      App.alerts.trigger("demo");
    });
  }

  // keyboard shortcut for reliable on-stage demo: Ctrl+Alt+T
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.altKey && (e.key === "t" || e.key === "T")) {
      e.preventDefault();
      App.alerts.trigger("demo");
    }
  });

  function init() {
    App.keystroke.init();
    App.mouse.init();
    App.wristband.init();
    App.health.init();
    App.alerts.init();
    App.i18n.apply(App.store.getSettings().lang || "zh");
    initTabs();
    initSettings();
    initLangToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
