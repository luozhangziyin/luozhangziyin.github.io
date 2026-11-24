// store.js — localStorage persistence for sessions, events, baseline, settings.
window.App = window.App || {};

App.store = (function () {
  var KEY = "neurosync.v1";

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  function defaultState() {
    return {
      // each session = one completed typing test or mouse test
      sessions: [],
      // wristband events: {t, type, intensity, source}
      wristEvents: [],
      baseline: null,
      settings: {
        lang: "zh",
        serviceUUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
        charUUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
        cueUUID: "beb5483e-36e1-4688-b7f5-ea07361b26a9",
        caregiver: "",
        emergency: "120"
      }
    };
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  var state = load();

  function commit() { save(state); }

  function addSession(s) {
    s.t = Date.now();
    state.sessions.push(s);
    // keep last 200 sessions
    if (state.sessions.length > 200) state.sessions = state.sessions.slice(-200);
    commit();
  }

  function addWristEvent(ev) {
    state.wristEvents.push(ev);
    if (state.wristEvents.length > 500) state.wristEvents = state.wristEvents.slice(-500);
    commit();
  }

  function getSessions() { return state.sessions; }

  function getWristEvents() { return state.wristEvents; }

  function getBaseline() { return state.baseline; }

  function setBaseline(b) { state.baseline = b; commit(); }

  function getSettings() { var d = defaultState().settings; for (var k in d) if (state.settings[k] == null) state.settings[k] = d[k]; return state.settings; }

  function setSettings(s) { state.settings = s; commit(); }

  function reset() {
    state = defaultState();
    commit();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  return {
    addSession: addSession,
    addWristEvent: addWristEvent,
    getSessions: getSessions,
    getWristEvents: getWristEvents,
    getBaseline: getBaseline,
    setBaseline: setBaseline,
    getSettings: getSettings,
    setSettings: setSettings,
    reset: reset,
    exportJSON: exportJSON
  };
})();
