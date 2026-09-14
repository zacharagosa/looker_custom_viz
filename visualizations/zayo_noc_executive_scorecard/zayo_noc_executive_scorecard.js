/**
 * Zayo Autonomous NOC Executive KPI Scorecard - Looker Custom Visualization
 * Replaces plain single-value tiles with a Zayo-branded light-mode telecom KPI card
 * featuring Zayo Orange (#f5831f) / Slate (#0f172a) / Crimson (#e11d48) accents,
 * optical status indicator pills, and embedded D3 trend micro-sparklines.
 */

(function () {
  var ACCENT_PALETTES = {
    zayo_orange: {
      primary: "#f5831f",
      secondary: "#ea580c",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      sparkFill: "rgba(245, 131, 31, 0.14)",
      icon: "⚡"
    },
    zayo_slate: {
      primary: "#0f172a",
      secondary: "#334155",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      sparkFill: "rgba(15, 23, 42, 0.10)",
      icon: "🌐"
    },
    zayo_crimson: {
      primary: "#e11d48",
      secondary: "#be123c",
      bgBadge: "#fff1f2",
      borderBadge: "#fecdd3",
      textBadge: "#be123c",
      sparkFill: "rgba(225, 29, 72, 0.14)",
      icon: "🚨"
    },
    zayo_emerald: {
      primary: "#10b981",
      secondary: "#059669",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#047857",
      sparkFill: "rgba(16, 185, 129, 0.14)",
      icon: "🛡️"
    }
  };

  function formatNumber(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    if (fmt === "currency") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
      return "$" + n.toLocaleString();
    }
    if (fmt === "tbps") {
      return n.toFixed(1) + " Tbps";
    }
    if (fmt === "miles") {
      return n.toLocaleString() + " mi";
    }
    if (fmt === "percent") {
      return (n * 100).toFixed(1) + "%";
    }
    return n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "zayo_noc_executive_scorecard",
    label: "Zayo NOC Executive KPI Card",
    options: {
      accent_theme: {
        type: "string",
        label: "Zayo Accent Theme",
        display: "select",
        values: [
          { "Zayo Orange (#f5831f)": "zayo_orange" },
          { "Zayo Deep Slate (#0f172a)": "zayo_slate" },
          { "Zayo Alert Crimson (#e11d48)": "zayo_crimson" },
          { "Zayo Emerald Nominal (#10b981)": "zayo_emerald" }
        ],
        default: "zayo_orange",
        section: "Style",
        order: 1
      },
      custom_title: {
        type: "string",
        label: "Card Title Override",
        default: "",
        placeholder: "e.g., SLA Exposure",
        section: "Display",
        order: 0
      },
      value_format_type: {
        type: "string",
        label: "Value Format",
        display: "select",
        values: [
          { "Auto / Standard Number": "auto" },
          { "Currency ($ USD)": "currency" },
          { "Backbone Capacity (Tbps)": "tbps" },
          { "Fiber Route Miles (mi)": "miles" },
          { "Percentage (%)": "percent" }
        ],
        default: "auto",
        section: "Display",
        order: 1
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Telemetry Tag",
        default: "",
        placeholder: "e.g., 8 Core Corridors • DWDM C-Band",
        section: "Display",
        order: 2
      },
      badge_label: {
        type: "string",
        label: "Status Pill Label",
        default: "LIVE TELEMETRY",
        section: "Display",
        order: 3
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      // Looker already gives this element an explicit size inside its tile slot
      // (e.g. 283x136 within a 303x156 parent, via 10px element margins). Forcing
      // width/height to 100% resolves against the *parent*, so the card ends up
      // 20px wider and taller than its slot: it paints offset to the right and its
      // right/bottom borders are clipped by the tile. Never override the size here.
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.background = "transparent";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      if (!data || data.length === 0) {
        element.innerHTML = "<div style='padding:16px;color:#64748b;font-size:12px;'>No telemetry data</div>";
        done();
        return;
      }

      // ZAYO_FIELD_RESOLVER_V2 — Looker's queryResponse.fields exposes `measures` /
      // `dimensions` (NOT measure_like / dimension_like) in many API contexts, so we
      // probe both and then hard-verify the chosen field actually holds a number.
      var qf = queryResponse.fields || {};
      var measures = qf.measures || qf.measure_like || [];
      var dimensions = qf.dimensions || qf.dimension_like || [];
      var tableCalcs = qf.table_calculations || [];
      var candidates = [].concat(measures, tableCalcs, dimensions);

      var firstRow = data[0];

      function isNumeric(v) {
        if (v === null || v === undefined || v === "") return false;
        return typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)));
      }

      // Count numeric cells for a field across EVERY row. Checking only row 0 is unsafe:
      // a dashboard date filter routinely returns a leading partial period whose measure
      // is null, which would otherwise disqualify the real measure.
      function numericCount(name) {
        var n = 0;
        for (var r = 0; r < data.length; r++) {
          var c = data[r][name];
          if (c && isNumeric(c.value)) n++;
        }
        return n;
      }

      var primaryField = null;
      for (var ci = 0; ci < candidates.length; ci++) {
        var candName = candidates[ci].name;
        if (candName && numericCount(candName) > 0) {
          primaryField = candidates[ci];
          break;
        }
      }

      var fieldName = primaryField ? primaryField.name : null;

      // Last resort: scan the raw row keys for one that carries numbers. Never blindly
      // take Object.keys(data[0])[0] — that is usually a date dimension and yields NaN.
      if (!fieldName) {
        var rowKeys = Object.keys(firstRow);
        for (var ki = 0; ki < rowKeys.length; ki++) {
          if (numericCount(rowKeys[ki]) > 0) {
            fieldName = rowKeys[ki];
            break;
          }
        }
        if (!fieldName) fieldName = rowKeys[0];
      }

      var fieldLabel = (primaryField && (primaryField.label_short || primaryField.label)) || "Network Metric";
      if (!primaryField) {
        for (var li = 0; li < candidates.length; li++) {
          if (candidates[li].name === fieldName) {
            fieldLabel = candidates[li].label_short || candidates[li].label || fieldLabel;
            break;
          }
        }
      }
      if (config.custom_title) fieldLabel = config.custom_title;

      // Collect the full numeric series across every returned row (nulls skipped).
      var seriesVals = [];
      for (var i = 0; i < data.length; i++) {
        var c = data[i][fieldName];
        if (c && isNumeric(c.value)) {
          seriesVals.push(Number(c.value));
        }
      }

      var cell = firstRow[fieldName];
      var renderedVal = cell && cell.rendered ? cell.rendered : null;
      var rawVal = cell && cell.value !== undefined ? cell.value : null;

      // Multi-row queries on these tiles are weekly/daily trend series; the headline
      // number should be the period total, not just the most recent bucket.
      if (seriesVals.length > 1) {
        rawVal = seriesVals.reduce(function (a, b) { return a + b; }, 0);
        renderedVal = null;
      } else if (seriesVals.length === 1) {
        rawVal = seriesVals[0];
      }

      // Resolution diagnostics go to the console only — never into the rendered tile.
      if (rawVal === null || rawVal === undefined || isNaN(Number(rawVal))) {
        try {
          var names = [];
          for (var di = 0; di < candidates.length; di++) names.push(candidates[di].name);
          console.warn("[zayo_noc_executive_scorecard] could not resolve a numeric KPI field.",
            { qfKeys: Object.keys(qf), candidates: names, picked: fieldName, row0: firstRow });
        } catch (e) { /* no-op */ }
      }

      var fmtType = config.value_format_type || "auto";
      if (fmtType === "auto") {
        if (fieldName.indexOf("miles") !== -1) fmtType = "miles";
        else if (fieldName.indexOf("capacity") !== -1 || fieldName.indexOf("tbps") !== -1) fmtType = "tbps";
        else if (fieldName.indexOf("sla") !== -1 || fieldName.indexOf("usd") !== -1 || fieldName.indexOf("penalty") !== -1) fmtType = "currency";
      }

      var displayVal = fmtType !== "auto" ? formatNumber(rawVal, fmtType) : (renderedVal || formatNumber(rawVal, "auto"));

      var themeKey = config.accent_theme || "zayo_orange";
      if (fieldName.indexOf("sla") !== -1 || fieldName.indexOf("anomaly") !== -1 || fieldName.indexOf("degradation") !== -1) {
        if (!config.accent_theme) themeKey = "zayo_crimson";
      } else if (fieldName.indexOf("capacity") !== -1) {
        if (!config.accent_theme) themeKey = "zayo_emerald";
      }
      var palette = ACCENT_PALETTES[themeKey] || ACCENT_PALETTES.zayo_orange;

      var subtitle = config.custom_subtitle || "";
      if (!subtitle) {
        if (fieldName.indexOf("miles") !== -1) subtitle = "8 Core US Fiber Corridors • ITU G.652.D";
        else if (fieldName.indexOf("capacity") !== -1) subtitle = "400G / 800G Coherent DWDM Waves";
        else if (fieldName.indexOf("traffic_anomalies") !== -1) subtitle = "ARIMA_PLUS 95% Confidence Bounds";
        else if (fieldName.indexOf("optical_anomaly") !== -1) subtitle = "OTDR & EDFA Amplifier Telemetry";
        else if (fieldName.indexOf("sla") !== -1) subtitle = "AutoML Proactive Dispatch Queue";
        else subtitle = "Zayo Autonomous Network Intelligence";
      }

      var badgeText = config.badge_label || "ZAYO AI";

      // Sparkline uses the series resolved above (Looker returns newest-first).
      if (seriesVals.length > 1) {
        seriesVals.reverse();
      }

      // Scale the card to the tile so the border always reaches the bottom edge and
      // the footer label is never pushed outside the rounded box.
      // Some hosts (certain Explore / embed contexts) leave the element unsized; only
      // in that case do we stretch it, and we subtract the element's own margins so
      // the card never grows past its slot.
      if (!element.clientHeight) {
        var cs = window.getComputedStyle(element);
        var mY = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        element.style.height = mY ? "calc(100% - " + mY + "px)" : "100%";
      }
      var elH = element.clientHeight || 0;
      var elW = element.clientWidth || 0;
      var tight = elH > 0 && elH < 118;
      var snug = elH > 0 && elH < 150;
      var narrow = elW > 0 && elW < 290;

      var padV = tight ? 7 : (snug ? 9 : 12);
      var padH = tight ? 10 : (snug ? 12 : 14);
      var labelFs = (tight ? 9.5 : (snug ? 10 : 11)) - (narrow ? 0.5 : 0);
      var badgeFs = narrow ? 7.5 : (tight ? 8 : 9);
      var badgePad = narrow ? "1px 4px" : "2px 6px";
      var valueFs = tight ? 19 : (snug ? 22 : 26);
      var subFs = tight ? 9.5 : (snug ? 10 : 11);
      var footPad = tight ? 4 : 6;

      var sparkSvg = "";
      if (seriesVals.length > 2) {
        var minV = Math.min.apply(null, seriesVals);
        var maxV = Math.max.apply(null, seriesVals);
        var range = maxV - minV || 1;
        var w = tight ? 76 : (snug ? 92 : 110);
        var h = tight ? 20 : (snug ? 24 : 28);
        var pts = seriesVals.map(function (v, idx) {
          var x = (idx / (seriesVals.length - 1)) * w;
          var y = h - 3 - ((v - minV) / range) * (h - 6);
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
        var areaPts = "0," + h + " " + pts + " " + w + "," + h;
        sparkSvg =
          '<svg width="' + w + '" height="' + h + '" style="display:block;flex-shrink:0;overflow:visible;">' +
          '<polygon points="' + areaPts + '" fill="' + palette.sparkFill + '" />' +
          '<polyline fill="none" stroke="' + palette.primary + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '" />' +
          '</svg>';
      }

      element.innerHTML =
        '<div style="height:100%;width:100%;box-sizing:border-box;background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ' + palette.primary + ';border-radius:10px;padding:' + padV + 'px ' + padH + 'px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,0.04);">' +
          '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;">' +
            '<span style="font-size:' + labelFs + 'px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' +
              fieldLabel +
            '</span>' +
            '<span style="font-size:' + badgeFs + 'px;font-weight:700;font-family:monospace;padding:' + badgePad + ';border-radius:4px;background:' + palette.bgBadge + ';color:' + palette.textBadge + ';border:1px solid ' + palette.borderBadge + ';white-space:nowrap;flex-shrink:0;">' +
              badgeText +
            '</span>' +
          '</div>' +
          '<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:space-between;gap:10px;overflow:hidden;">' +
            '<div style="font-size:' + valueFs + 'px;font-weight:800;color:#0f172a;font-family:\'JetBrains Mono\',monospace;letter-spacing:-0.02em;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' +
              displayVal +
            '</div>' +
            sparkSvg +
          '</div>' +
          '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #f1f5f9;padding-top:' + footPad + 'px;min-width:0;">' +
            '<span style="font-size:' + subFs + 'px;color:#64748b;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' +
              subtitle +
            '</span>' +
            '<span style="width:7px;height:7px;border-radius:50%;background:' + palette.primary + ';display:inline-block;flex-shrink:0;box-shadow:0 0 0 3px ' + palette.bgBadge + ';"></span>' +
          '</div>' +
        '</div>';

      // The layout is height-dependent, so re-render when Looker resizes the tile
      // (dashboard edit/resize, Explore accordions) — neither fires updateAsync.
      this._last = { data: data, config: config, queryResponse: queryResponse };
      this._lastH = elH;
      if (!this._ro && typeof ResizeObserver !== "undefined") {
        var self = this;
        var timer = null;
        this._ro = new ResizeObserver(function () {
          if (timer) clearTimeout(timer);
          timer = setTimeout(function () {
            var L = self._last;
            // Guard against a render -> resize -> render feedback loop.
            if (!L || Math.abs((element.clientHeight || 0) - (self._lastH || 0)) < 4) return;
            self.updateAsync(L.data, element, L.config, L.queryResponse, null, function () {});
          }, 120);
        });
        this._ro.observe(element);
      }

      done();
    }
  });
})();
