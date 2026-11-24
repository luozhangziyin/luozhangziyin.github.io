// charts.js — dependency-free canvas chart helpers.
window.App = window.App || {};

App.charts = (function () {
  // Draw a simple line chart onto a canvas. `series` is an array of {label, color, points:[]}.
  function line(canvas, series, opts) {
    opts = opts || {};
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || canvas.width;
    var h = canvas.clientHeight || canvas.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var padL = 44, padR = 12, padT = 14, padB = 26;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;

    // gather values
    var all = [];
    series.forEach(function (s) { all = all.concat(s.points.map(function (p) { return p.y; })); });
    if (!all.length) {
      ctx.fillStyle = "#8ea0b8";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      var noDataLabel = (window.App && App.i18n && App.i18n.t) ? App.i18n.t("chart.noData") : "No data";
      ctx.fillText(noDataLabel, w / 2, h / 2);
      return;
    }
    var minY = opts.min != null ? opts.min : Math.min.apply(null, all);
    var maxY = opts.max != null ? opts.max : Math.max.apply(null, all);
    if (maxY - minY < 1e-6) { maxY = minY + 1; }
    var range = maxY - minY;
    minY -= range * 0.1; maxY += range * 0.1; range = maxY - minY;

    var maxN = 0;
    series.forEach(function (s) { maxN = Math.max(maxN, s.points.length); });

    function xAt(i) { return padL + (maxN <= 1 ? 0 : (i / (maxN - 1)) * plotW); }
    function yAt(v) { return padT + plotH - ((v - minY) / range) * plotH; }

    // grid + y labels
    ctx.strokeStyle = "rgba(142,160,184,0.15)";
    ctx.fillStyle = "#8ea0b8";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.lineWidth = 1;
    var ticks = 5;
    for (var t = 0; t <= ticks; t++) {
      var val = minY + (range * t) / ticks;
      var yy = yAt(val);
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.fillText(Number(val).toFixed(val >= 10 ? 0 : 1), padL - 6, yy + 4);
    }

    // series lines
    series.forEach(function (s) {
      if (s.points.length < 1) return;
      ctx.strokeStyle = s.color || "#3ddc97";
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.points.forEach(function (p, i) {
        var x = xAt(i), y = yAt(p.y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // fill area
      if (s.fill) {
        ctx.globalAlpha = 0.12;
        ctx.lineTo(xAt(s.points.length - 1), padT + plotH);
        ctx.lineTo(xAt(0), padT + plotH);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // x label (last index)
    if (maxN > 1) {
      ctx.fillStyle = "#8ea0b8";
      ctx.textAlign = "center";
      ctx.fillText(String(maxN), w - padR, h - 6);
    }
    return { minY: minY, maxY: maxY };
  }

  return { line: line };
})();

// gauge.js — horizontal reference-range gauge (HTML) for "what does my result mean".
window.App = window.App || {};

App.gauge = (function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // opts: { title, valueText, min, max, zones: [{to, color, label}] }
  function build(opts) {
    var pct = clamp(((opts.value - opts.min) / (opts.max - opts.min)) * 100, 0, 100);
    var stops = [];
    var prev = 0;
    opts.zones.forEach(function (z) {
      var toPct = clamp(((z.to - opts.min) / (opts.max - opts.min)) * 100, 0, 100);
      stops.push(z.color + " " + prev + "%");
      stops.push(z.color + " " + toPct + "%");
      prev = toPct;
    });
    var legend = opts.zones.map(function (z) {
      return '<span class="gauge-legend-item"><i style="background:' + z.color + '"></i>' + z.label + "</span>";
    }).join("");
    return '<div class="gauge">' +
      '<div class="gauge-head"><span>' + opts.title + '</span><span class="gauge-value">' + opts.valueText + "</span></div>" +
      '<div class="gauge-track" style="background:linear-gradient(to right,' + stops.join(",") + ')">' +
        '<div class="gauge-marker" style="left:' + pct + '%"></div>' +
      "</div>" +
      '<div class="gauge-legend">' + legend + "</div>" +
    "</div>";
  }

  return { build: build };
})();

