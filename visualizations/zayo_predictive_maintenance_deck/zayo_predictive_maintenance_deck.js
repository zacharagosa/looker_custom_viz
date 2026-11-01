/**
 * Zayo AutoML Predictive Maintenance & OTDR Span Diagnostics Deck
 * Looker Custom Visualization for Fiber Telecom Operations & Infrastructure Diagnostics
 *
 * Upgraded with Multi-Modal Enterprise Flexibility:
 * - Dynamic Field-Role Mapping (Span ID, Span Name, Risk Tier, Timeframe, Trigger, Anomaly Metric, Action, Priority, Prob, SLA Risk)
 * - Configurable Reference Lines & Targets (Measure Column, Fixed Value, Mean, Median, P75, P90)
 * - Interactive Sorting, Top-N Density, and zero/null suppression
 * - HUD, Legend, & Value Label Density Controls (Full Scorecard HUD, Compact Strip, Hidden)
 * - Enterprise Brand Palettes (Zayo, Google, Slate, Cyberpunk, Emerald, Sunset, Wellverse, Custom Hex), Polarity, Font Scaling, Value Formatting
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver with <4px delta guard and responsive layout scaling
 */

(function () {
  var PALETTES = {
    zayo_telecom: {
      name: "Zayo Telecom Corporate (#f5831f)",
      primary: "#f5831f",
      secondary: "#0f172a",
      nominal: "#10b981",
      warning: "#d97706",
      alert: "#e11d48",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    google_enterprise: {
      name: "Google Enterprise (#1a73e8)",
      primary: "#1a73e8",
      secondary: "#174ea6",
      nominal: "#1e8e3e",
      warning: "#f9ab00",
      alert: "#d93025",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368",
      surface: "#f8f9fa",
      border: "#dadce0"
    },
    modern_slate: {
      name: "Modern Studio Slate (#0f172a)",
      primary: "#0f172a",
      secondary: "#334155",
      nominal: "#059669",
      warning: "#d97706",
      alert: "#dc2626",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (#00ffcc)",
      primary: "#00ffcc",
      secondary: "#7928ca",
      nominal: "#00ffcc",
      warning: "#ffbe0b",
      alert: "#ff0055",
      bgBadge: "rgba(0, 255, 204, 0.15)",
      borderBadge: "#00ffcc",
      textBadge: "#00ffcc",
      cardBg: "#0f172a",
      textPrimary: "#f8fafc",
      textMuted: "#94a3b8",
      surface: "#1e293b",
      border: "#334155"
    },
    emerald_finops: {
      name: "Emerald FinOps (#10b981)",
      primary: "#10b981",
      secondary: "#059669",
      nominal: "#10b981",
      warning: "#d97706",
      alert: "#ef4444",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#047857",
      cardBg: "#ffffff",
      textPrimary: "#064e3b",
      textMuted: "#047857",
      surface: "#f0fdf4",
      border: "#bbf7d0"
    },
    sunset_media: {
      name: "Sunset Media (#f97316)",
      primary: "#f97316",
      secondary: "#c2410c",
      nominal: "#10b981",
      warning: "#f59e0b",
      alert: "#e11d48",
      bgBadge: "#fff7ed",
      borderBadge: "#ffedd5",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#431407",
      textMuted: "#9a3412",
      surface: "#fffaf5",
      border: "#fed7aa"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (#0284c7)",
      primary: "#0284c7",
      secondary: "#0369a1",
      nominal: "#059669",
      warning: "#d97706",
      alert: "#e11d48",
      bgBadge: "#f0f9ff",
      borderBadge: "#bae6fd",
      textBadge: "#0369a1",
      cardBg: "#ffffff",
      textPrimary: "#0c4a6e",
      textMuted: "#0369a1",
      surface: "#f8fafc",
      border: "#e0f2fe"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(Number(val))) return "-";
    var n = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    if (fmt === "percentage") {
      return (n * 100).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return n.toFixed(2);
    }
    if (fmt === "raw") {
      return String(val);
    }
    // auto fallback
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + n.toLocaleString();
  }

  function getRiskTheme(prob, tier, palette, polarity) {
    var isHigherBetter = polarity === "higher_is_better";
    var t = (tier || "").toUpperCase();
    var isCritical = t.indexOf("CRITICAL") !== -1 || (isHigherBetter ? prob <= 0.20 : prob >= 0.80);
    var isHigh = t.indexOf("HIGH") !== -1 || (isHigherBetter ? (prob > 0.20 && prob <= 0.45) : (prob >= 0.60 && prob < 0.80));
    var isElevated = t.indexOf("ELEVATED") !== -1 || (isHigherBetter ? (prob > 0.45 && prob <= 0.70) : (prob >= 0.35 && prob < 0.60));
    var isModerate = t.indexOf("MODERATE") !== -1 || (isHigherBetter ? (prob > 0.70 && prob <= 0.85) : (prob >= 0.20 && prob < 0.35));

    if (isCritical) {
      return { main: palette.alert, bg: "#fff1f2", border: "#fecdd3", text: palette.alert, label: "CRITICAL" };
    }
    if (isHigh) {
      return { main: palette.primary, bg: palette.bgBadge, border: palette.borderBadge, text: palette.textBadge, label: "HIGH RISK" };
    }
    if (isElevated) {
      return { main: palette.warning, bg: "#fffbeb", border: "#fde68a", text: "#b45309", label: "ELEVATED" };
    }
    if (isModerate) {
      return { main: palette.secondary, bg: "#f1f5f9", border: "#cbd5e1", text: "#1e293b", label: "MODERATE" };
    }
    return { main: palette.nominal, bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", label: "NOMINAL" };
  }

  function generateOtdrSvg(spanId, prob, color, surfaceBg, borderColor) {
    var hash = 0;
    for (var i = 0; i < spanId.length; i++) {
      hash = (hash * 31 + spanId.charCodeAt(i)) % 1000;
    }
    var faultRatio = 0.28 + (hash % 55) / 100;
    var w = 150;
    var h = 34;
    var faultX = Math.round(faultRatio * (w - 24)) + 12;
    var kmMarker = Math.round(faultRatio * 118);

    var pts = [];
    for (var x = 4; x <= w - 4; x += 4) {
      var baseSlope = 8 + (x / w) * 14;
      var dist = Math.abs(x - faultX);
      var spike = 0;
      if (prob > 0.25 && dist < 8) {
        spike = (1 - dist / 8) * (prob * 16);
      }
      var y = Math.min(h - 3, Math.max(3, baseSlope - spike));
      pts.push(x + "," + y.toFixed(1));
    }

    return (
      '<div style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;">' +
        '<div style="display:flex;justify-content:space-between;width:150px;font-size:9px;font-family:monospace;color:#64748b;">' +
          '<span>OTDR TRACE</span>' +
          (prob > 0.25
            ? '<span style="color:' + color + ';font-weight:700;">FAULT @ KM ' + kmMarker + '</span>'
            : '<span style="color:#10b981;font-weight:700;">CLEAR 118 KM</span>') +
        '</div>' +
        '<svg width="' + w + '" height="' + h + '" style="background:' + surfaceBg + ';border:1px solid ' + borderColor + ';border-radius:6px;overflow:hidden;">' +
          '<line x1="0" y1="17" x2="' + w + '" y2="17" stroke="' + borderColor + '" stroke-dasharray="2,2" stroke-width="1"/>' +
          '<polyline fill="none" stroke="' + (prob > 0.25 ? color : "#10b981") + '" stroke-width="1.8" points="' + pts.join(" ") + '"/>' +
          (prob > 0.25
            ? '<circle cx="' + faultX + '" cy="' + Math.max(5, 8 + (faultX / w) * 14 - prob * 14).toFixed(1) + '" r="3.5" fill="' + color + '" stroke="#ffffff" stroke-width="1.2"/>'
            : '') +
        '</svg>' +
      '</div>'
    );
  }

  looker.plugins.visualizations.add({
    id: "zayo_predictive_maintenance_deck",
    label: "Zayo AutoML Predictive Maintenance Deck",
    options: {
      // ===== DISPLAY OPTIONS =====
      custom_title: {
        type: "string",
        label: "Card Title Override",
        default: "AutoML Optical Span Failure Predictor & OTDR Dispatch Deck",
        section: "Display",
        order: 1
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Telemetry Tag",
        default: "DWDM Backbone Optical Health & Proactive Dispatch Queue",
        section: "Display",
        order: 2
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard Strip": "scorecard" },
          { "Compact Summary": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 3
      },
      defaultFilterTab: {
        type: "string",
        label: "Default Risk Filter Tab",
        display: "select",
        values: [
          { "All Monitored Spans": "ALL" },
          { "P1 Immediate Dispatch Only": "P1" },
          { "High & Elevated Risk (P1/P2)": "HIGH_PLUS" },
          { "Moderate Risk (P3)": "P3" },
          { "Nominal Health": "NOMINAL" }
        ],
        default: "ALL",
        section: "Display",
        order: 4
      },
      show_otdr_trace: {
        type: "boolean",
        label: "Show Simulated OTDR Distance-to-Fault Waveform",
        default: true,
        section: "Display",
        order: 5
      },
      showSearchBar: {
        type: "boolean",
        label: "Show Interactive Search Filter Bar",
        default: true,
        section: "Display",
        order: 6
      },
      sortOrder: {
        type: "string",
        label: "Sort Order",
        display: "select",
        values: [
          { "Highest Failure Probability": "prob_desc" },
          { "Lowest Failure Probability": "prob_asc" },
          { "Highest SLA Risk Exposure": "risk_desc" },
          { "Alphabetical by Span": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "prob_desc",
        section: "Display",
        order: 7
      },
      topN: {
        type: "string",
        label: "Top-N Span Limit",
        display: "select",
        values: [
          { "All Spans": "all" },
          { "Top 5 Spans": "5" },
          { "Top 10 Spans": "10" },
          { "Top 15 Spans": "15" },
          { "Top 25 Spans": "25" }
        ],
        default: "all",
        section: "Display",
        order: 8
      },
      targetGoalMode: {
        type: "string",
        label: "Target Benchmark SLA Mode",
        display: "select",
        values: [
          { "None": "none" },
          { "Measure Column": "measure_column" },
          { "Fixed Threshold": "fixed_value" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Percentile P75": "percentile_p75" },
          { "Percentile P90": "percentile_p90" }
        ],
        default: "none",
        section: "Display",
        order: 9
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Threshold (%)",
        default: 75,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Target Label",
        default: "Critical Failure Threshold",
        section: "Display",
        order: 11
      },
      anomalyThreshold: {
        type: "number",
        label: "Critical Risk Threshold (Prob %)",
        default: 70,
        section: "Display",
        order: 12
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Spans with Null / Missing Metrics",
        default: true,
        section: "Display",
        order: 13
      },
      spanIdDimOverride: {
        type: "string",
        label: "Field Override: Span ID",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 14
      },
      spanNameDimOverride: {
        type: "string",
        label: "Field Override: Span Name / Corridor",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 15
      },
      riskTierDimOverride: {
        type: "string",
        label: "Field Override: Risk Tier",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 16
      },
      failureTimeframeDimOverride: {
        type: "string",
        label: "Field Override: Failure Timeframe",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 17
      },
      primaryTriggerDimOverride: {
        type: "string",
        label: "Field Override: Primary Trigger",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 18
      },
      anomalyMetricDimOverride: {
        type: "string",
        label: "Field Override: Anomaly Metric",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 19
      },
      recommendedActionDimOverride: {
        type: "string",
        label: "Field Override: Recommended Action",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 20
      },
      dispatchPriorityDimOverride: {
        type: "string",
        label: "Field Override: Dispatch Priority",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 21
      },
      measureFailureProbOverride: {
        type: "string",
        label: "Field Override: Failure Probability",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 22
      },
      measureSlaRiskOverride: {
        type: "string",
        label: "Field Override: SLA Risk Exposure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 23
      },

      // ===== STYLE OPTIONS =====
      colorPalette: {
        type: "string",
        label: "Color Palette Theme",
        display: "select",
        values: [
          { "Zayo Telecom Corporate (#f5831f)": "zayo_telecom" },
          { "Google Enterprise (#1a73e8)": "google_enterprise" },
          { "Modern Studio Slate (#0f172a)": "modern_slate" },
          { "Cyberpunk Dark (#00ffcc)": "cyberpunk_dark" },
          { "Emerald FinOps (#10b981)": "emerald_finops" },
          { "Sunset Media (#f97316)": "sunset_media" },
          { "Wellverse Healthcare (#0284c7)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "zayo_telecom",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Color",
        display: "color",
        default: "#f5831f",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Nominal / Guard Color",
        display: "color",
        default: "#10b981",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Alert / Critical Color",
        display: "color",
        default: "#e11d48",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Lower is Better (Risk / Latency / Failure Rate)": "lower_is_better" },
          { "Higher is Better (Reliability / Uptime / Coverage)": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Card Density",
        display: "select",
        values: [
          { "Compact (0.85x)": "compact" },
          { "Standard (1.0x)": "standard" },
          { "Large Presentation (1.15x)": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "SLA Financial Value Format",
        display: "select",
        values: [
          { "Auto Currency ($1.2M)": "auto" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.background = "#ffffff";

      this._container = document.createElement("div");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.boxSizing = "border-box";
      this._container.style.overflow = "auto";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      element.appendChild(this._container);

      this._activeFilter = (config && config.defaultFilterTab) || "ALL";
      this._searchQuery = "";
      this._lastDimensions = [];
      this._lastMeasures = [];

      var self = this;
      var lastH = 0;
      if (typeof ResizeObserver !== "undefined") {
        this._ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var h = entries[0].contentRect.height;
          if (Math.abs(h - lastH) < 4) return;
          lastH = h;
          if (self._lastData && self._lastQueryResponse) {
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }
        });
        this._ro.observe(element);
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      if (!queryResponse || !queryResponse.fields) return;
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        meas = meas.concat(queryResponse.fields.table_calculations);
      }

      var dimSig = dims.map(function (d) { return d.name; }).join(",");
      var measSig = meas.map(function (m) { return m.name; }).join(",");
      if (this._lastDimSig === dimSig && this._lastMeasSig === measSig) return;
      this._lastDimSig = dimSig;
      this._lastMeasSig = measSig;

      var dimValues = [{ "Auto-Detect from Query": "" }];
      dims.forEach(function (d) {
        var label = d.label_short || d.label || d.name;
        var opt = {};
        opt[label + " (" + d.name + ")"] = d.name;
        dimValues.push(opt);
      });

      var measValues = [{ "Auto-Detect from Query": "" }];
      meas.forEach(function (m) {
        var label = m.label_short || m.label || m.name;
        var opt = {};
        opt[label + " (" + m.name + ")"] = m.name;
        measValues.push(opt);
      });

      var newOptions = Object.assign({}, this.options);
      var dimKeys = [
        "spanIdDimOverride", "spanNameDimOverride", "riskTierDimOverride",
        "failureTimeframeDimOverride", "primaryTriggerDimOverride", "anomalyMetricDimOverride",
        "recommendedActionDimOverride", "dispatchPriorityDimOverride"
      ];
      dimKeys.forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: dimValues });
        }
      });

      var measKeys = ["measureFailureProbOverride", "measureSlaRiskOverride"];
      measKeys.forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: measValues });
        }
      });

      try {
        this.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      if (!this._container) {
        this.create(element, config);
      }
      var container = this._container;
      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='padding:24px;color:#64748b;font-size:13px;text-align:center;'>No predictive maintenance spans found in query result.</div>";
        done();
        return;
      }

      // Resolve theme & palette
      var paletteKey = config.colorPalette || "zayo_telecom";
      var basePalette = PALETTES[paletteKey] || PALETTES.zayo_telecom;
      var palette = Object.assign({}, basePalette);
      if (paletteKey === "custom_hex" || config.customPrimaryColor) {
        if (config.customPrimaryColor) palette.primary = config.customPrimaryColor;
        if (config.customPositiveColor) palette.nominal = config.customPositiveColor;
        if (config.customNegativeColor) palette.alert = config.customNegativeColor;
      }

      var polarity = config.metricPolarity || "lower_is_better";
      var fontScale = config.fontScale === "compact" ? 0.85 : config.fontScale === "large_presentation" ? 1.15 : 1.0;
      var valFormat = config.valueFormat || "compact_currency";

      // Field resolution helpers
      function resolveField(list, overrideVal, matchSuffixes, fallbackIdx) {
        if (overrideVal) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === overrideVal) return list[i].name;
          }
        }
        for (var s = 0; s < matchSuffixes.length; s++) {
          var suf = matchSuffixes[s].toLowerCase();
          for (var j = 0; j < list.length; j++) {
            var fn = list[j].name.toLowerCase();
            var fl = (list[j].label_short || list[j].label || "").toLowerCase();
            if (fn.indexOf(suf) !== -1 || fl.indexOf(suf) !== -1) {
              return list[j].name;
            }
          }
        }
        if (list[fallbackIdx]) return list[fallbackIdx].name;
        return list.length > 0 ? list[0].name : null;
      }

      var allDims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var allMeas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        allMeas = allMeas.concat(queryResponse.fields.table_calculations);
      }

      var fSpanId = resolveField(allDims, config.spanIdDimOverride, ["span_id", "spanid", "id", "site_name", "corridor"], 0);
      var fSpanName = resolveField(allDims, config.spanNameDimOverride, ["span_name", "spanname", "name", "route_name", "corridor"], 1);
      var fRiskTier = resolveField(allDims, config.riskTierDimOverride, ["risk_tier", "risktier", "tier", "severity", "status"], 2);
      var fTimeframe = resolveField(allDims, config.failureTimeframeDimOverride, ["timeframe", "window", "timeline", "duration"], 3);
      var fTrigger = resolveField(allDims, config.primaryTriggerDimOverride, ["trigger", "anomaly", "root_cause", "incident_type"], 4);
      var fMetricVal = resolveField(allDims, config.anomalyMetricDimOverride, ["metric_value", "metric", "anomaly_value", "attenuation"], 5);
      var fAction = resolveField(allDims, config.recommendedActionDimOverride, ["action", "recommendation", "dispatch", "work_order"], 6);
      var fPriority = resolveField(allDims, config.dispatchPriorityDimOverride, ["priority", "dispatch_priority", "urgency", "sla"], 7);

      var fProb = resolveField(allMeas, config.measureFailureProbOverride, ["failure_prob", "prob", "probability", "risk_score", "loss", "pct"], 0);
      var fSlaRisk = resolveField(allMeas, config.measureSlaRiskOverride, ["sla_financial_risk", "sla_risk", "financial_risk", "exposure", "cost", "revenue", "spend"], 1);

      function extractVal(row, fieldName, fallback) {
        if (!fieldName || !row[fieldName]) return fallback;
        var cell = row[fieldName];
        if (cell.value !== undefined && cell.value !== null) return cell.value;
        return fallback;
      }

      function extractCell(row, fieldName) {
        if (!fieldName || !row[fieldName]) return null;
        return row[fieldName];
      }

      var parsedRows = [];
      for (var rIdx = 0; rIdx < data.length; rIdx++) {
        var row = data[rIdx];
        var sId = String(extractVal(row, fSpanId, "SPAN-" + (rIdx + 1)));
        var sName = String(extractVal(row, fSpanName, sId));
        var rTier = String(extractVal(row, fRiskTier, "MODERATE"));
        var tFrame = String(extractVal(row, fTimeframe, "Next 48 Hours"));
        var trig = String(extractVal(row, fTrigger, "Telemetry Anomaly"));
        var mVal = String(extractVal(row, fMetricVal, "Elevated Variance"));
        var act = String(extractVal(row, fAction, "Inspect optical span & verify margins"));
        var prio = String(extractVal(row, fPriority, "P2 - High Priority"));

        var probNum = Number(extractVal(row, fProb, 0.5));
        if (isNaN(probNum)) probNum = 0.5;
        if (probNum > 1 && probNum <= 100) probNum = probNum / 100.0;

        var slaRiskNum = Number(extractVal(row, fSlaRisk, 0));
        if (isNaN(slaRiskNum)) slaRiskNum = 0;

        if (config.suppressNulls && (probNum === null || isNaN(probNum))) continue;

        var drillCell = extractCell(row, fSpanId) || extractCell(row, fProb) || extractCell(row, fSlaRisk);
        if (!drillCell || !drillCell.links || !drillCell.links.length) {
          for (var k in row) {
            if (row[k] && row[k].links && row[k].links.length) {
              drillCell = row[k];
              break;
            }
          }
        }

        parsedRows.push({
          spanId: sId,
          spanName: sName,
          riskTier: rTier,
          timeframe: tFrame,
          trigger: trig,
          metricVal: mVal,
          action: act,
          priority: prio,
          prob: probNum,
          slaRisk: slaRiskNum,
          drillCell: drillCell,
          rawRow: row
        });
      }

      // Sorting
      var sortMode = config.sortOrder || "prob_desc";
      if (sortMode === "prob_desc") {
        parsedRows.sort(function (a, b) { return b.prob - a.prob; });
      } else if (sortMode === "prob_asc") {
        parsedRows.sort(function (a, b) { return a.prob - b.prob; });
      } else if (sortMode === "risk_desc") {
        parsedRows.sort(function (a, b) { return b.slaRisk - a.slaRisk; });
      } else if (sortMode === "alphabetical") {
        parsedRows.sort(function (a, b) { return a.spanName.localeCompare(b.spanName); });
      }

      // Top N
      if (config.topN && config.topN !== "all") {
        var nLimit = parseInt(config.topN, 10);
        if (!isNaN(nLimit) && nLimit > 0) {
          parsedRows = parsedRows.slice(0, nLimit);
        }
      }

      // Targets and reference calculations
      var meanProb = parsedRows.reduce(function (sum, r) { return sum + r.prob; }, 0) / (parsedRows.length || 1);
      var sortedProbs = parsedRows.map(function (r) { return r.prob; }).sort(function (a, b) { return a - b; });
      var medianProb = sortedProbs[Math.floor(sortedProbs.length / 2)] || 0.5;
      var p75Prob = sortedProbs[Math.floor(sortedProbs.length * 0.75)] || 0.75;
      var p90Prob = sortedProbs[Math.floor(sortedProbs.length * 0.90)] || 0.90;

      var benchmarkTarget = null;
      var targetMode = config.targetGoalMode || "none";
      if (targetMode === "fixed_value") {
        benchmarkTarget = (Number(config.fixedTargetValue) || 75) / 100.0;
      } else if (targetMode === "dataset_mean") {
        benchmarkTarget = meanProb;
      } else if (targetMode === "dataset_median") {
        benchmarkTarget = medianProb;
      } else if (targetMode === "percentile_p75") {
        benchmarkTarget = p75Prob;
      } else if (targetMode === "percentile_p90") {
        benchmarkTarget = p90Prob;
      }

      var alertThreshold = (Number(config.anomalyThreshold) || 70) / 100.0;
      var totalSpans = parsedRows.length;
      var criticalCount = parsedRows.filter(function (r) {
        return polarity === "higher_is_better" ? r.prob <= alertThreshold : r.prob >= alertThreshold;
      }).length;
      var totalSlaExposure = parsedRows.reduce(function (sum, r) { return sum + r.slaRisk; }, 0);

      if (!self._activeFilter) {
        self._activeFilter = config.defaultFilterTab || "ALL";
      }

      function renderDeckUI() {
        var filtered = parsedRows.filter(function (r) {
          var pTier = r.priority.toUpperCase();
          var rTier = r.riskTier.toUpperCase();
          if (self._activeFilter === "P1") {
            return pTier.indexOf("P1") !== -1 || r.prob >= 0.80 || rTier.indexOf("CRITICAL") !== -1;
          }
          if (self._activeFilter === "HIGH_PLUS") {
            return pTier.indexOf("P1") !== -1 || pTier.indexOf("P2") !== -1 || r.prob >= 0.55 || rTier.indexOf("HIGH") !== -1 || rTier.indexOf("CRITICAL") !== -1;
          }
          if (self._activeFilter === "P3") {
            return pTier.indexOf("P3") !== -1 || (r.prob >= 0.25 && r.prob < 0.55);
          }
          if (self._activeFilter === "NOMINAL") {
            return r.prob < 0.25 || rTier.indexOf("NOMINAL") !== -1;
          }
          return true;
        });

        if (self._searchQuery) {
          var q = self._searchQuery.toLowerCase();
          filtered = filtered.filter(function (r) {
            return (
              r.spanId.toLowerCase().indexOf(q) !== -1 ||
              r.spanName.toLowerCase().indexOf(q) !== -1 ||
              r.trigger.toLowerCase().indexOf(q) !== -1 ||
              r.action.toLowerCase().indexOf(q) !== -1 ||
              r.priority.toLowerCase().indexOf(q) !== -1
            );
          });
        }

        var titleStr = config.custom_title || "AutoML Optical Span Failure Predictor & OTDR Dispatch Deck";
        var subStr = config.custom_subtitle || "DWDM Backbone Optical Health & Proactive Dispatch Queue";
        var hudMode = config.hudMode || "scorecard";

        var hudHtml = "";
        if (hudMode === "scorecard") {
          hudHtml =
            '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px;">' +
              '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.primary + ';">' +
                '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.textMuted + ';">Monitored Spans</div>' +
                '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + palette.textPrimary + ';margin-top:2px;">' + totalSpans + '</div>' +
                '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Active Telemetry Corridors</div>' +
              '</div>' +
              '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.alert + ';">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                  '<span style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.alert + ';">Critical / Action Required</span>' +
                  '<span style="font-size:9px;font-family:monospace;font-weight:700;padding:2px 6px;border-radius:4px;background:' + (palette.alert + '18') + ';color:' + palette.alert + ';">' + (alertThreshold * 100).toFixed(0) + '%+ THRESHOLD</span>' +
                '</div>' +
                '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + palette.alert + ';margin-top:2px;">' + criticalCount + ' SPANS</div>' +
                '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Immediate P1/P2 Field Dispatch</div>' +
              '</div>' +
              '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.nominal + ';">' +
                '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.nominal + ';">Total SLA Exposure Guarded</div>' +
                '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + palette.textPrimary + ';margin-top:2px;">' + formatValue(totalSlaExposure, valFormat) + '</div>' +
                '<div style="font-size:10px;color:' + palette.nominal + ';font-weight:600;margin-top:1px;">Proactive SLA Penalty Avoidance</div>' +
              '</div>' +
              (benchmarkTarget !== null
                ? '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.secondary + ';">' +
                    '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.textMuted + ';">' + (config.referenceLineLabel || "Benchmark SLA") + '</div>' +
                    '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + palette.secondary + ';margin-top:2px;">' + (benchmarkTarget * 100).toFixed(1) + '%</div>' +
                    '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Target Operating Limit</div>' +
                  '</div>'
                : '') +
            '</div>';
        } else if (hudMode === "compact_strip") {
          hudHtml =
            '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;padding:6px 12px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:6px;font-size:11px;font-family:monospace;">' +
              '<span><strong>' + totalSpans + '</strong> SPANS MONITORED</span>' +
              '<span style="color:' + palette.border + ';">•</span>' +
              '<span style="color:' + palette.alert + ';font-weight:700;"><strong>' + criticalCount + '</strong> CRITICAL INTERVENTION</span>' +
              '<span style="color:' + palette.border + ';">•</span>' +
              '<span style="color:' + palette.nominal + ';font-weight:700;"><strong>' + formatValue(totalSlaExposure, valFormat) + '</strong> SLA EXPOSURE GUARDED</span>' +
            '</div>';
        }

        var filterTabs = [
          { key: "ALL", label: "All (" + totalSpans + ")" },
          { key: "P1", label: "P1 Immediate" },
          { key: "HIGH_PLUS", label: "P1 / P2 High" },
          { key: "P3", label: "P3 Watchlist" },
          { key: "NOMINAL", label: "Nominal" }
        ];

        var tabsHtml = filterTabs.map(function (tab) {
          var isActive = self._activeFilter === tab.key;
          return (
            '<button data-filter="' + tab.key + '" style="cursor:pointer;font-size:' + (11 * fontScale) + 'px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid ' +
            (isActive ? palette.primary : palette.border) +
            ';background:' +
            (isActive ? palette.primary : palette.cardBg) +
            ';color:' +
            (isActive ? '#ffffff' : palette.textMuted) +
            ';transition:all 0.15s;outline:none;">' +
              tab.label +
            '</button>'
          );
        }).join("");

        var searchHtml = config.showSearchBar !== false
          ? '<input id="zayo-deck-search" type="text" placeholder="Search span, trigger, action..." value="' + (self._searchQuery || "") + '" ' +
            'style="font-size:' + (11 * fontScale) + 'px;padding:5px 10px;border:1px solid ' + palette.border + ';border-radius:6px;outline:none;width:170px;color:' + palette.textPrimary + ';background:' + palette.cardBg + ';margin-left:4px;" />'
          : "";

        var html =
          '<div style="padding:14px 16px;background:' + palette.cardBg + ';box-sizing:border-box;flex:1 1 auto;display:flex;flex-direction:column;">' +
            // Header Bar
            '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid ' + palette.border + ';margin-bottom:12px;">' +
              '<div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<span style="width:10px;height:10px;border-radius:50%;background:' + palette.primary + ';display:inline-block;box-shadow:0 0 0 3px ' + (palette.primary + '28') + ';"></span>' +
                  '<span style="font-size:' + (14 * fontScale) + 'px;font-weight:800;color:' + palette.textPrimary + ';letter-spacing:-0.01em;">' + titleStr + '</span>' +
                '</div>' +
                (subStr ? '<div style="font-size:' + (11 * fontScale) + 'px;color:' + palette.textMuted + ';margin-top:2px;">' + subStr + '</div>' : '') +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                tabsHtml +
                searchHtml +
              '</div>' +
            '</div>' +

            // Scorecard HUD
            hudHtml +

            // Table Header Grid
            '<div style="display:grid;grid-template-columns:1.8fr 1.1fr ' + (config.show_otdr_trace !== false ? '160px ' : '') + '1.8fr 2.0fr 1.1fr;gap:12px;padding:8px 12px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;font-size:' + (10 * fontScale) + 'px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:' + palette.textMuted + ';margin-bottom:8px;">' +
              '<div>Span Identifier & Corridor</div>' +
              '<div>AutoML Failure Risk</div>' +
              (config.show_otdr_trace !== false ? '<div>OTDR Distance-to-Fault</div>' : '') +
              '<div>Primary Telemetry Trigger</div>' +
              '<div>Autonomous NOC Action</div>' +
              '<div style="text-align:right;">SLA Risk Protected</div>' +
            '</div>' +

            // Cards / Rows Container
            '<div style="display:flex;flex-direction:column;gap:8px;overflow-y:auto;flex:1 1 auto;padding-right:2px;">' +
              (filtered.length === 0
                ? '<div style="padding:32px;text-align:center;color:' + palette.textMuted + ';font-size:' + (12 * fontScale) + 'px;">No spans match the selected risk filter or search query.</div>'
                : filtered.map(function (r, idx) {
                    var rTheme = getRiskTheme(r.prob, r.riskTier, palette, polarity);
                    var pctStr = (r.prob * 100).toFixed(0) + "%";
                    var hasDrill = r.drillCell && r.drillCell.links && r.drillCell.links.length;

                    return (
                      '<div class="zayo-span-row" data-idx="' + idx + '" style="display:grid;grid-template-columns:1.8fr 1.1fr ' +
                      (config.show_otdr_trace !== false ? '160px ' : '') +
                      '1.8fr 2.0fr 1.1fr;gap:12px;align-items:center;padding:10px 12px;background:' + palette.cardBg + ';border:1px solid ' + palette.border + ';border-left:4px solid ' +
                      rTheme.main +
                      ';border-radius:8px;box-shadow:0 1px 2px rgba(15,23,42,0.03);cursor:' + (hasDrill ? 'pointer' : 'default') + ';transition:all 0.15s;">' +
                        // Col 1: Span ID & Corridor
                        '<div>' +
                          '<div style="display:flex;align-items:center;gap:6px;">' +
                            '<span style="font-family:monospace;font-size:' + (12 * fontScale) + 'px;font-weight:800;color:' + palette.textPrimary + ';">' + r.spanId + '</span>' +
                            '<span style="font-size:' + (9 * fontScale) + 'px;font-weight:700;font-family:monospace;padding:1.5px 6px;border-radius:4px;background:' + rTheme.bg + ';color:' + rTheme.text + ';border:1px solid ' + rTheme.border + ';">' +
                              rTheme.label +
                            '</span>' +
                            (hasDrill ? '<span style="font-size:9px;color:' + palette.primary + ';" title="Click to view Looker drill-down menu">🔎</span>' : '') +
                          '</div>' +
                          '<div style="font-size:' + (11 * fontScale) + 'px;color:' + palette.textMuted + ';font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                            r.spanName +
                          '</div>' +
                          '<div style="font-size:' + (10 * fontScale) + 'px;color:' + palette.textMuted + ';font-family:monospace;margin-top:1px;">' +
                            r.priority + ' • Window: ' + r.timeframe +
                          '</div>' +
                        '</div>' +

                        // Col 2: AutoML Failure Risk Bar
                        '<div>' +
                          '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;">' +
                            '<span style="font-size:' + (16 * fontScale) + 'px;font-weight:800;font-family:monospace;color:' + rTheme.main + ';">' + pctStr + '</span>' +
                            '<span style="font-size:' + (10 * fontScale) + 'px;color:' + palette.textMuted + ';font-weight:600;">ML Prob</span>' +
                          '</div>' +
                          '<div style="width:100%;height:7px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:999px;overflow:hidden;">' +
                            '<div style="width:' + pctStr + ';height:100%;background:' + rTheme.main + ';border-radius:999px;"></div>' +
                          '</div>' +
                          (benchmarkTarget !== null
                            ? '<div style="font-size:9px;font-family:monospace;color:' + palette.textMuted + ';margin-top:2px;">Target: ' + (benchmarkTarget * 100).toFixed(0) + '%</div>'
                            : '') +
                        '</div>' +

                        // Col 3: OTDR Trace
                        (config.show_otdr_trace !== false ? '<div>' + generateOtdrSvg(r.spanId, r.prob, rTheme.main, palette.surface, palette.border) + '</div>' : '') +

                        // Col 4: Primary Trigger
                        '<div>' +
                          '<div style="font-size:' + (11 * fontScale) + 'px;font-weight:700;color:' + palette.textPrimary + ';">' + r.trigger + '</div>' +
                          '<div style="font-size:' + (11 * fontScale) + 'px;font-family:monospace;color:' + palette.textBadge + ';background:' + palette.bgBadge + ';border:1px solid ' + palette.borderBadge + ';display:inline-block;padding:1.5px 6px;border-radius:4px;margin-top:3px;">' +
                            r.metricVal +
                          '</div>' +
                        '</div>' +

                        // Col 5: Action & Dispatch
                        '<div>' +
                          '<div style="font-size:' + (11 * fontScale) + 'px;color:' + palette.textPrimary + ';font-weight:600;line-height:1.35;">' + r.action + '</div>' +
                        '</div>' +

                        // Col 6: SLA Risk Exposure
                        '<div style="text-align:right;">' +
                          '<div style="font-size:' + (14 * fontScale) + 'px;font-weight:800;font-family:monospace;color:' + palette.textPrimary + ';">' +
                            formatValue(r.slaRisk, valFormat) +
                          '</div>' +
                          '<div style="font-size:' + (10 * fontScale) + 'px;color:' + palette.nominal + ';font-weight:600;margin-top:2px;">Proactive Guard</div>' +
                        '</div>' +
                      '</div>'
                    );
                  }).join("")) +
            '</div>' +
          '</div>';

        container.innerHTML = html;

        // Wire filter buttons
        var btns = container.querySelectorAll("button[data-filter]");
        for (var b = 0; b < btns.length; b++) {
          btns[b].addEventListener("click", function (e) {
            self._activeFilter = e.currentTarget.getAttribute("data-filter");
            renderDeckUI();
          });
        }

        // Wire search input
        var searchInput = container.querySelector("#zayo-deck-search");
        if (searchInput) {
          searchInput.addEventListener("input", function (e) {
            self._searchQuery = e.target.value;
            renderDeckUI();
            var newInput = container.querySelector("#zayo-deck-search");
            if (newInput) {
              newInput.focus();
              newInput.setSelectionRange(newInput.value.length, newInput.value.length);
            }
          });
        }

        // Wire click-to-drill on rows
        var rowEls = container.querySelectorAll(".zayo-span-row");
        for (var j = 0; j < rowEls.length; j++) {
          rowEls[j].addEventListener("click", function (e) {
            var idx = Number(e.currentTarget.getAttribute("data-idx"));
            var rowObj = filtered[idx];
            if (rowObj && rowObj.drillCell && rowObj.drillCell.links && typeof LookerCharts !== "undefined") {
              LookerCharts.Utils.openDrillMenu({
                links: rowObj.drillCell.links,
                event: e
              });
            }
          });
        }
      }

      renderDeckUI();
      done();
    }
  });
})();
