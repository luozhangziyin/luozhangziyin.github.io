// wristband.js — ESP32 wristband data: simulated stream + Web Bluetooth (BLE) link.
window.App = window.App || {};

App.wristband = (function () {
  var device = null, characteristic = null, cueChar = null, actx = null;
  var simTimer = null, simStarted = false;
  var accelBuf = [];      // rolling magnitude samples
  var bleInfoEl;

  function $(id) { return document.getElementById(id); }
  function t(key) { return App.i18n.t(key); }

  function addEvent(type, intensity, source) {
    if (type === "fog" && $("chkBeat") && $("chkBeat").checked) beat(10);
    var ev = { t: Date.now(), type: type, intensity: intensity, source: source || "sim" };
    App.store.addWristEvent(ev);
    renderLog();
    if (App.health) App.health.render();
  }

  function eventLabel(type) {
    if (type === "tremor") return t("event.tremor");
    if (type === "fog") return t("event.fog");
    if (type === "stress") return t("event.stress");
    if (type === "warn") return t("event.warn");
    return type;
  }

  function sourceLabel(source) {
    if (source === "ble") return t("wrist.srcBle");
    if (source === "manual") return t("wrist.srcManual");
    return t("wrist.srcSim");
  }

  function renderLog() {
    var events = App.store.getWristEvents().slice(-30).reverse();
    var el = $("wristbandLog");
    if (!events.length) { el.innerHTML = '<p class="muted">' + t("wrist.noEvents") + "</p>"; }
    else {
      el.innerHTML = events.map(function (e) {
        var cls = e.type === "tremor" ? "" : ((e.type === "fog" || e.type === "warn") ? "warn" : "bad");
        var d = new Date(e.t);
        var ts = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
        return '<div class="tl-item"><span class="tl-time">' + ts + "</span>" +
          '<span class="tl-tag ' + cls + '">' + eventLabel(e.type) + "</span>" +
          "<span>" + t("health.intensity") + " " + Math.round(e.intensity) + " · " + sourceLabel(e.source) + "</span></div>";
      }).join("");
    }
    updateCounts();
  }

  function updateCounts() {
    var events = App.store.getWristEvents();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todays = events.filter(function (e) { return e.t >= today.getTime(); });
    $("wTremor").textContent = todays.filter(function (e) { return e.type === "tremor"; }).length;
    $("wFog").textContent = todays.filter(function (e) { return e.type === "fog"; }).length;
    $("wStress").textContent = todays.filter(function (e) { return e.type === "stress"; }).length;
    $("wWarn").textContent = todays.filter(function (e) { return e.type === "warn"; }).length;
  }

  function drawAccel() {
    App.charts.line($("chartAccel"), [
      { label: "accel", color: "#4da3ff", points: accelBuf, fill: true }
    ]);
  }

  function pushAccel(mag) {
    accelBuf.push({ y: mag });
    if (accelBuf.length > 120) accelBuf = accelBuf.slice(-120);
    drawAccel();
  }

  // ---- simulated stream ----
  function startSim() {
    if (simStarted) return;
    simStarted = true;
    $("monitorStatus").textContent = t("wrist.monitorSim");
    $("monitorStatus").className = "pill on";
    var burstUntil = 0;
    simTimer = setInterval(function () {
      // acceleration magnitude: baseline noise + occasional tremor burst
      var now = Date.now() / 1000;
      var tremor = (now > burstUntil) ? 0 : Math.sin(now * 2 * Math.PI * 6) * 2; // 6 Hz burst
      var mag = 9.8 + Math.sin(now * 1.3) * 0.4 + (Math.random() - 0.5) * 0.6 + tremor;
      pushAccel(mag);
      $("wHR").textContent = Math.round(72 + Math.random() * 6); $("wEDA").textContent = (2 + Math.random()).toFixed(1);

      // randomly emit events
      if (Math.random() < 0.05) {
        var r = Math.random();
        if (r < 0.45) { addEvent("tremor", 40 + Math.random() * 60); burstUntil = now + 3; }
        else if (r < 0.62) addEvent("warn", 30 + Math.random() * 40);
        else if (r < 0.78) addEvent("fog", 30 + Math.random() * 50);
        else addEvent("stress", 50 + Math.random() * 50);
      }
    }, 400);
    refresh();
  }

  function stopSim() {
    simStarted = false;
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
    refresh();
  }

  function injectEvent() {
    var types = ["tremor", "fog", "stress"];
    var t0 = types[Math.floor(Math.random() * types.length)];
    addEvent(t0, 40 + Math.random() * 60, "manual");
  }

  // ---- Web Bluetooth ----
  function parseValue(view) {
    var text = "";
    for (var i = 0; i < view.byteLength; i++) text += String.fromCharCode(view.getUint8(i));
    text = text.trim();
    if (!text) return;
    var parts = text.split(",");
    var code = parts[0].toUpperCase();
    if (code === "A" && parts.length >= 4) {
      var x = parseFloat(parts[1]), y = parseFloat(parts[2]), z = parseFloat(parts[3]);
      if (!isNaN(x)) pushAccel(Math.sqrt(x * x + y * y + z * z));
    } else if (code === "T") addEvent("tremor", parseFloat(parts[1]) || 60, "ble");
    else if (code === "F") addEvent("fog", parseFloat(parts[1]) || 50, "ble");
    else if (code === "S") addEvent("stress", parseFloat(parts[1]) || 50, "ble");
    else if (code === "W") addEvent("warn", parseFloat(parts[1]) || 50, "ble");
    else if (code === "H") $("wHR").textContent = Math.round(parseFloat(parts[1]));
    else if (code === "G") $("wEDA").textContent = parseFloat(parts[1]).toFixed(1);
  }

  async function connectBle() {
    if (!navigator.bluetooth) {
      bleInfoEl.textContent = t("ble.unsupported");
      return;
    }
    var s = App.store.getSettings();
    try {
      bleInfoEl.textContent = t("ble.searching");
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [s.serviceUUID] }],
        optionalServices: [s.serviceUUID]
      });
      var server = await device.gatt.connect();
      var service = await server.getPrimaryService(s.serviceUUID);
      characteristic = await service.getCharacteristic(s.charUUID);
      try { cueChar = await service.getCharacteristic(s.cueUUID); } catch (e) { cueChar = null; }
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", function (e) {
        parseValue(e.target.value);
      });
      device.addEventListener("gattserverdisconnected", onDisconnect);
      bleInfoEl.textContent = t("ble.connected");
      refresh();
    } catch (err) {
      bleInfoEl.textContent = t("ble.failed") + (err && err.message ? err.message : err);
      device = null;
      refresh();
    }
  }

  function onDisconnect() {
    disconnectBle();
    bleInfoEl.textContent = t("ble.disconnected");
  }

  function disconnectBle() {
    if (device && device.gatt && device.gatt.connected) { try { device.gatt.disconnect(); } catch (e) {} }
    device = null; characteristic = null; cueChar = null;
    refresh();
  }

  function beat(sec) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var n = Math.round(sec * 110 / 60);
      for (var i = 0; i < n; i++) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 60 / 110;
        o.frequency.value = i % 4 === 0 ? 1000 : 800;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.1);
      }
    } catch (e) {}
  }

  function sendCue(cmd) {
    if (!cueChar) { bleInfoEl.textContent = t("wrist.cmdNoLink"); return; }
    cueChar.writeValueWithoutResponse(new TextEncoder().encode(cmd + "\n")).then(function () {
      bleInfoEl.textContent = App.i18n.fmt("wrist.cmdSent", { c: cmd });
    }).catch(function (e) { bleInfoEl.textContent = String(e && e.message || e); });
  }

  // re-apply dynamic labels after a language switch
  function refresh() {
    $("bleStatus").textContent = device ? (t("wrist.bleConnected") + (device.name ? " " + device.name : "")) : t("wrist.bleDisconnected");
    $("bleStatus").className = device ? "pill on" : "pill";
    $("monitorStatus").textContent = simStarted ? t("wrist.monitorSim") : t("wrist.monitorIdle");
    $("monitorStatus").className = simStarted ? "pill on" : "pill";
    $("btnSimulate").textContent = simStarted ? t("wrist.simStop") : t("wrist.simStart");
    $("btnConnectBle").disabled = !!device;
    $("btnDisconnectBle").disabled = !device;
    if (!device && bleInfoEl) bleInfoEl.textContent = t("ble.hint");
    renderLog();
    drawAccel();
  }

  function init() {
    bleInfoEl = $("bleInfo");
    $("btnSimulate").addEventListener("click", function () { simStarted ? stopSim() : startSim(); });
    $("btnSimEvent").addEventListener("click", injectEvent);
    $("btnCueTest").addEventListener("click", function () { sendCue("C,1," + $("cueLevel").value); });
    $("btnCueStop").addEventListener("click", function () { sendCue("C,0,0"); });
    $("cueLevel").addEventListener("input", function () { $("cueLevelVal").textContent = $("cueLevel").value; });
    $("cueLevel").addEventListener("change", function () { sendCue("L," + $("cueLevel").value); });
    $("btnConnectBle").addEventListener("click", connectBle);
    $("btnDisconnectBle").addEventListener("click", disconnectBle);
    pushAccel(9.8);
    refresh();
  }

  return { init: init, addEvent: addEvent, renderLog: renderLog, refresh: refresh };
})();
