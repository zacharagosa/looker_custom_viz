/**
 * Policy Drift & Security SLA Shewhart SPC Control Chart
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Looker Cloud Blockers & Community Gaps:
 * - Native Statistical Process Control (SPC) Shewhart XmR (Individuals & Moving Range) charts
 *   with dynamic 3-Sigma Upper/Lower Control Limits (UCL/LCL) from Moving Range (sigma = mR_bar / 1.128)
 * - Western Electric / Nelson Run-Rule Anomaly Detection (R1 >3σ, R2 9+ same-side shift, R3 6+ trend, R4 2-of-3 >2σ)
 * - Tabular CUSUM Cumulative Drift Detector & Multi-Rule SPC Small Multiples Grid
 * - Process Capability (Cp / Cpk) Gaussian Distribution Histogram
 *
 * Strictly 2 configuration sections ("Display" and "Style"):
 * - Dynamic Field-Role Dropdowns via _registerDynamicFieldOptions
 * - 5,000+ Row Client-Side O(N) Aggregation by Date & Policy Group
 * - Debounced ResizeObserver (<4px guard) & Looker Drill-Down Menus
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.area === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.area === "function") {
          clearInterval(interval);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#f1f3f4",
      hudBg: "#f8f9fa",
      primary: "#1a73e8",
      secondary: "#174ea6",
      positive: "#137333",
      negative: "#d93025",
      warning: "#f29900",
      zoneC: "rgba(19, 115, 51, 0.06)",
      zoneB: "rgba(242, 153, 0, 0.07)",
      zoneA: "rgba(217, 48, 37, 0.08)",
      isDark: false
    },
    modern_slate: {
      name: "Modern Slate",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      hudBg: "#f8fafc",
      primary: "#2563eb",
      secondary: "#1e40af",
      positive: "#059669",
      negative: "#e11d48",
      warning: "#d97706",
      zoneC: "rgba(5, 150, 105, 0.06)",
      zoneB: "rgba(217, 119, 6, 0.07)",
      zoneA: "rgba(225, 29, 72, 0.08)",
      isDark: false
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      bg: "#0b0f19",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#162032",
      hudBg: "#111827",
      primary: "#38bdf8",
      secondary: "#a855f7",
      positive: "#10b981",
      negative: "#f43f5e",
      warning: "#f59e0b",
      zoneC: "rgba(16, 185, 129, 0.09)",
      zoneB: "rgba(245, 158, 11, 0.10)",
      zoneA: "rgba(244, 63, 94, 0.12)",
      isDark: true
    },
    emerald_finops: {
      name: "Emerald FinOps",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#ecfdf5",
      hudBg: "#f0fdf4",
      primary: "#059669",
      secondary: "#047857",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      zoneC: "rgba(5, 150, 105, 0.07)",
      zoneB: "rgba(217, 119, 6, 0.08)",
      zoneA: "rgba(220, 38, 38, 0.09)",
      isDark: false
    },
    sunset_media: {
      name: "Sunset Media",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#fff7ed",
      hudBg: "#fffbeb",
      primary: "#ea580c",
      secondary: "#c2410c",
      positive: "#059669",
      negative: "#e11d48",
      warning: "#f59e0b",
      zoneC: "rgba(5, 150, 105, 0.06)",
      zoneB: "rgba(245, 158, 11, 0.08)",
      zoneA: "rgba(225, 29, 72, 0.09)",
      isDark: false
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#475569",
      border: "#cbd5e1",
      grid: "#f0f9ff",
      hudBg: "#f8fafc",
      primary: "#0284c7",
      secondary: "#143359",
      positive: "#00af68",
      negative: "#b42318",
      warning: "#ea580c",
      zoneC: "rgba(0, 175, 104, 0.07)",
      zoneB: "rgba(234, 88, 12, 0.08)",
      zoneA: "rgba(180, 35, 24, 0.09)",
      isDark: false
    }
  };
  PALETTES.custom_hex = PALETTES.google_enterprise;

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string") return "rgba(26, 115, 232, " + alpha + ")";
    var h = hex.replace("#", "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return hex;
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal) {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    if (defaultIdx < 0 || defaultIdx >= list.length) return null;
    return list[defaultIdx] || null;
  }

  function computePercentile(sortedArr, p) {
    if (!sortedArr || sortedArr.length === 0) return null;
    if (sortedArr.length === 1) return sortedArr[0];
    var idx = (sortedArr.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(abs < 10 ? 2 : 0);
    }
    if (fmt === "compact_number") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + (abs >= 100 ? Math.round(abs).toLocaleString() : abs.toFixed(abs % 1 === 0 ? 0 : 1));
    }
    if (fmt === "percentage") {
      var p = abs <= 1.5 ? num * 100 : num;
      return p.toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return sign + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === "raw") {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
    if (abs > 0 && abs < 1.5) return (num * 100).toFixed(1) + "%";
    return sign + (abs % 1 === 0 ? Math.round(abs).toLocaleString() : abs.toFixed(2));
  }

  /**
   * Compute Shewhart XmR (Individuals & Moving Range), Western Electric / Nelson Run Rules (R1-R4),
   * and Tabular CUSUM statistics on a chronological series [{dateStr, value, secondary, drills}].
   */
  function computeSPCStats(points, sigmaMult, enableNelson) {
    var n = points.length;
    if (n === 0) return null;
    var vals = points.map(function (p) { return p.value; });
    var sum = 0;
    for (var i = 0; i < n; i++) sum += vals[i];
    var xbar = sum / n;

    var mrList = [0];
    var mrSum = 0;
    for (var j = 1; j < n; j++) {
      var mr = Math.abs(vals[j] - vals[j - 1]);
      mrList.push(mr);
      mrSum += mr;
    }
    var mrBar = n > 1 ? mrSum / (n - 1) : 0;
    var sigma = mrBar > 0 ? (mrBar / 1.128) : (Math.abs(xbar) * 0.05 || 1);
    var ucl = xbar + sigmaMult * sigma;
    var lcl = Math.max(0, xbar - sigmaMult * sigma);
    var uclMr = 3.267 * mrBar;

    // Tabular CUSUM (k = 0.5*sigma, H = 5*sigma)
    var kSlack = 0.5 * sigma;
    var hLimit = 5.0 * sigma;
    var cPlus = 0;
    var cMinus = 0;

    // Nelson / Western Electric Run Rules tracking
    var sideRun = 0;
    var lastSide = 0;
    var trendRun = 0;
    var lastTrendDir = 0;

    var enriched = [];
    var violationCount = 0;
    var r1Count = 0;

    for (var t = 0; t < n; t++) {
      var v = vals[t];
      var z = sigma > 0 ? (v - xbar) / sigma : 0;

      cPlus = Math.max(0, cPlus + (v - (xbar + kSlack)));
      cMinus = Math.max(0, cMinus + ((xbar - kSlack) - v));

      var rules = [];
      if (enableNelson) {
        // R1: Beyond +/- sigmaMult (3 sigma)
        if (v > ucl || v < lcl) {
          rules.push("R1 (>3\u03C3)");
          r1Count++;
        }
        // R2: 9+ consecutive points on same side of center line
        var side = v >= xbar ? 1 : -1;
        if (side === lastSide) sideRun++;
        else { sideRun = 1; lastSide = side; }
        if (sideRun >= 9) rules.push("R2 (9+ Shift)");

        // R3: 6+ consecutive points monotonically increasing or decreasing
        if (t > 0) {
          var dir = v > vals[t - 1] ? 1 : (v < vals[t - 1] ? -1 : 0);
          if (dir !== 0 && dir === lastTrendDir) trendRun++;
          else { trendRun = dir !== 0 ? 1 : 0; lastTrendDir = dir; }
          if (trendRun >= 5) rules.push("R3 (6+ Trend)");
        }

        // R4: 2 of 3 consecutive points beyond +/- 2*sigma on same side
        if (t >= 2) {
          var win = [vals[t - 2] - xbar, vals[t - 1] - xbar, v - xbar];
          var hi2 = win.filter(function (d) { return d > 2 * sigma; }).length;
          var lo2 = win.filter(function (d) { return d < -2 * sigma; }).length;
          if ((hi2 >= 2 && (v - xbar) > 2 * sigma) || (lo2 >= 2 && (v - xbar) < -2 * sigma)) {
            if (rules.indexOf("R1 (>3\u03C3)") === -1) rules.push("R4 (2/3 >2\u03C3)");
          }
        }
      }

      if (rules.length > 0) violationCount++;

      enriched.push(Object.assign({}, points[t], {
        idx: t,
        mr: mrList[t],
        zScore: z,
        cPlus: cPlus,
        cMinus: -cMinus,
        cusumBreach: cPlus > hLimit || cMinus > hLimit,
        rules: rules,
        isViolation: rules.length > 0,
        isR1: rules.indexOf("R1 (>3\u03C3)") !== -1
      }));
    }

    var sortedVals = vals.slice().sort(function (a, b) { return a - b; });
    var cp = (6 * sigma) > 0 ? ((ucl - lcl) / (6 * sigma)) : 1;
    var cpk = (3 * sigma) > 0 ? Math.min((ucl - xbar) / (3 * sigma), (xbar - lcl) / (3 * sigma)) : 1;

    return {
      points: enriched,
      n: n,
      xbar: xbar,
      mrBar: mrBar,
      sigma: sigma,
      ucl: ucl,
      lcl: lcl,
      uclMr: uclMr,
      hLimit: hLimit,
      cp: cp,
      cpk: cpk,
      sortedVals: sortedVals,
      violationCount: violationCount,
      r1Count: r1Count,
      violationPct: n > 0 ? (violationCount / n) * 100 : 0
    };
  }

  looker.plugins.visualizations.add({
    id: "policy_drift_spc_control_chart",
    label: "Policy Drift & Security SLA Shewhart SPC Control Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & SPC Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Shewhart XmR & Moving Range (I-MR) Control Chart": "xmr_control" },
          { "CUSUM Cumulative Policy Drift Detector": "cusum_drift" },
          { "Multi-Policy SPC Small Multiples Grid": "rule_small_multiples" },
          { "Process Capability & Sigma Distribution (Cp/Cpk)": "capability_histogram" }
        ],
        default: "xmr_control"
      },
      dateDimOverride: {
        type: "string",
        label: "Chronological Date / Period Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      groupDimOverride: {
        type: "string",
        label: "Policy / Group Series Dimension (Optional)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      primaryMeasOverride: {
        type: "string",
        label: "Primary SPC Monitored Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      secondaryMeasOverride: {
        type: "string",
        label: "Secondary Context Measure (Optional)",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / SLA Benchmark Measure (Optional)",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      sigmaMultiplier: {
        type: "string",
        label: "Control Limit Width (Sigma Multiplier)",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "2.0 Sigma (Tight 95.4% Early Warning)": "2.0" },
          { "2.5 Sigma (98.8% Guardrail)": "2.5" },
          { "3.0 Sigma (Standard Shewhart 99.7%)": "3.0" },
          { "3.5 Sigma (Wide Noise-Tolerant)": "3.5" }
        ],
        default: "3.0"
      },
      showSigmaZones: {
        type: "boolean",
        label: "Shade Zone C (\u00B11\u03C3), Zone B (\u00B12\u03C3) & Zone A (\u00B13\u03C3) Bands",
        section: "Display",
        order: 8,
        default: true
      },
      showNelsonRules: {
        type: "boolean",
        label: "Detect Western Electric / Nelson Run-Rule Breaches",
        section: "Display",
        order: 9,
        default: true
      },
      showMovingRange: {
        type: "boolean",
        label: "Show Moving Range (mR) Volatility Sub-Panel",
        section: "Display",
        order: 10,
        default: true
      },
      targetMode: {
        type: "string",
        label: "SLA / Benchmark Reference Line Mode",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Percentile P90 (Tail SLA Ceiling)": "percentile_p90" },
          { "Percentile P75 (Upper Quartile)": "percentile_p75" },
          { "Dataset Mean (Center Line)": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Target Measure Column": "measure_column" },
          { "Custom Fixed SLA Value": "fixed_value" },
          { "None / Hide SLA Line": "none" }
        ],
        default: "percentile_p90"
      },
      targetValue: {
        type: "number",
        label: "Custom Fixed SLA Value (when Mode is Fixed)",
        section: "Display",
        order: 12,
        default: 0
      },
      referenceLineLabel: {
        type: "string",
        label: "SLA Reference Line Label",
        section: "Display",
        order: 13,
        default: "P90 SLA Threshold"
      },
      anomalyAlertThreshold: {
        type: "number",
        label: "Out-of-Control Drift Alert Threshold (% Points)",
        section: "Display",
        order: 14,
        default: 5
      },
      sortBy: {
        type: "string",
        label: "Sort Timeline / Small Multiples By",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Chronological Ascending (Natural SPC Order)": "chronological_asc" },
          { "Chronological Descending (Latest First)": "chronological_desc" },
          { "Metric Descending": "metric_desc" },
          { "Metric Ascending": "metric_asc" },
          { "Alphabetical": "alpha_asc" }
        ],
        default: "chronological_asc"
      },
      topNLimit: {
        type: "number",
        label: "Top-N Policy Groups / Periods Limit (0 = All)",
        section: "Display",
        order: 16,
        default: 0
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Excluded Policies into 'Other Policies'",
        section: "Display",
        order: 17,
        default: true
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero & Null Metric Observations",
        section: "Display",
        order: 18,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        section: "Display",
        order: 19,
        display: "select",
        values: [
          { "Full Scorecard": "full" },
          { "Compact Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Data Value Callouts Density",
        section: "Display",
        order: 20,
        display: "select",
        values: [
          { "All Violation & Limit Callouts": "all" },
          { "Min/Max Peaks & Breaches Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only"
      },
      showLegend: {
        type: "boolean",
        label: "Show SPC Zone & Rule Legend Strip",
        section: "Display",
        order: 21,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Policy Filter & Search Bar",
        section: "Display",
        order: 22,
        default: true
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 23,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 24,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Color Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "google_enterprise"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Series Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      customPositiveColor: {
        type: "string",
        label: "Custom In-Control / Positive Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Violation / Breach Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Lower is Better (Threats / Latency / Drift)": "lower_is_better" },
          { "Higher is Better (Block Rate / Compliance / SLA)": "higher_is_better" }
        ],
        default: "lower_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact": "compact" },
          { "Standard": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "compact_number"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dateDimOverride: { role: "dimension", defaultIdx: 0 },
        groupDimOverride: { role: "dimension", defaultIdx: 1 },
        primaryMeasOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasOverride: { role: "measure", defaultIdx: 1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
      };

      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + " (" + fld.name + ")";
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].values = values;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (err) {}
    },

    create: function (element, config) {
      this._element = element;
      this._selectedGroup = "ALL";
      this._searchText = "";
      element.innerHTML = "";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";

      var container = document.createElement("div");
      container.className = "spc-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}
      this._registerDynamicFieldOptions(queryResponse);
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!data || data.length === 0) {
        if (this.addError) this.addError({ title: "No Data", message: "The query returned no data to render." });
        done();
        return;
      }

      var fields = (queryResponse && queryResponse.fields) || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (dims.length === 0 || meas.length === 0) {
        if (this.addError) this.addError({ title: "Fields Required", message: "SPC Control Chart requires at least 1 Date/Period dimension and 1 numeric measure." });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          var container = element.querySelector(".spc-root-container");
          if (!container) {
            element.innerHTML = "";
            container = document.createElement("div");
            container.className = "spc-root-container";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.boxSizing = "border-box";
            container.style.overflow = "hidden";
            element.appendChild(container);
          }
          container.innerHTML = "";

          // Theme & Typography
          var pKey = config.colorPalette || "google_enterprise";
          var theme = Object.assign({}, PALETTES[pKey] || PALETTES.google_enterprise);
          if (config.customPrimaryColor) theme.primary = config.customPrimaryColor;
          if (config.customPositiveColor) theme.positive = config.customPositiveColor;
          if (config.customNegativeColor) theme.negative = config.customNegativeColor;

          var fKey = config.fontScale || "standard";
          var fMult = fKey === "compact" ? 0.88 : (fKey === "large" ? 1.18 : 1.0);
          var valFormat = config.valueFormat || "compact_number";
          var polarity = config.metricPolarity || "lower_is_better";
          var layoutMode = config.layoutMode || "xmr_control";
          var sigmaMult = parseFloat(config.sigmaMultiplier || "3.0") || 3.0;
          var showSigmaZones = config.showSigmaZones !== false;
          var enableNelson = config.showNelsonRules !== false;
          var showMR = config.showMovingRange !== false;
          var suppressNulls = config.suppressNulls !== false;
          var hudMode = config.hudMode || "full";
          var labelDensity = config.labelDensity || "peaks_only";
          var showLegend = config.showLegend !== false;
          var showSearch = config.showSearch !== false;

          // Resolve Fields
          var dateDim = resolveField(dims, config.dateDimOverride, 0);
          var groupDim = config.groupDimOverride ? resolveField(dims, config.groupDimOverride, -1) : (dims.length > 1 ? dims[1] : null);
          var primaryMeas = resolveField(meas, config.primaryMeasOverride, 0);
          var secondaryMeas = config.secondaryMeasOverride ? resolveField(meas, config.secondaryMeasOverride, -1) : (meas.length > 1 ? meas[1] : null);
          var targetMeas = config.targetMeasureOverride ? resolveField(meas, config.targetMeasureOverride, -1) : null;

          // O(N) Client-side aggregation across 5,000+ rows by (date, group)
          var byDateAll = Object.create(null);
          var byGroupDate = Object.create(null);
          var groupTotals = Object.create(null);

          for (var rIdx = 0; rIdx < data.length; rIdx++) {
            var row = data[rIdx];
            var dCell = row[dateDim.name];
            var pCell = row[primaryMeas.name];
            if (!dCell || dCell.value === null || dCell.value === undefined) continue;
            if (suppressNulls && (!pCell || pCell.value === null || pCell.value === undefined)) continue;

            var dStr = String(dCell.rendered || dCell.value);
            var pVal = (pCell && pCell.value !== null) ? Number(pCell.value) : 0;
            if (isNaN(pVal)) continue;
            if (suppressNulls && pVal === 0) continue;

            var sVal = (secondaryMeas && row[secondaryMeas.name] && row[secondaryMeas.name].value !== null) ? Number(row[secondaryMeas.name].value) : null;
            var tVal = (targetMeas && row[targetMeas.name] && row[targetMeas.name].value !== null) ? Number(row[targetMeas.name].value) : null;
            var drills = (pCell && pCell.links && pCell.links.length) ? pCell.links : (dCell.links && dCell.links.length ? dCell.links : null);

            if (!byDateAll[dStr]) {
              byDateAll[dStr] = { dateStr: dStr, value: 0, count: 0, secondarySum: 0, secondaryCnt: 0, targetSum: 0, targetCnt: 0, drills: drills };
            }
            byDateAll[dStr].value += pVal;
            byDateAll[dStr].count += 1;
            if (sVal !== null && !isNaN(sVal)) { byDateAll[dStr].secondarySum += sVal; byDateAll[dStr].secondaryCnt++; }
            if (tVal !== null && !isNaN(tVal)) { byDateAll[dStr].targetSum += tVal; byDateAll[dStr].targetCnt++; }
            if (!byDateAll[dStr].drills && drills) byDateAll[dStr].drills = drills;

            if (groupDim) {
              var gCell = row[groupDim.name];
              var gName = (gCell && gCell.value !== null && gCell.value !== undefined) ? String(gCell.rendered || gCell.value) : "Unassigned";
              if (!byGroupDate[gName]) byGroupDate[gName] = Object.create(null);
              if (!byGroupDate[gName][dStr]) {
                byGroupDate[gName][dStr] = { dateStr: dStr, value: 0, count: 0, secondarySum: 0, secondaryCnt: 0, targetSum: 0, targetCnt: 0, drills: drills };
              }
              byGroupDate[gName][dStr].value += pVal;
              byGroupDate[gName][dStr].count += 1;
              if (sVal !== null && !isNaN(sVal)) { byGroupDate[gName][dStr].secondarySum += sVal; byGroupDate[gName][dStr].secondaryCnt++; }
              if (tVal !== null && !isNaN(tVal)) { byGroupDate[gName][dStr].targetSum += tVal; byGroupDate[gName][dStr].targetCnt++; }
              groupTotals[gName] = (groupTotals[gName] || 0) + pVal;
            }
          }

          var isRateMetric = /rate|pct|percent|ratio|score/i.test(primaryMeas.name + " " + (primaryMeas.label || ""));
          function finalizeDateMap(dMap) {
            var arr = Object.keys(dMap).map(function (k) {
              var o = dMap[k];
              return {
                dateStr: o.dateStr,
                dateObj: new Date(o.dateStr),
                value: isRateMetric && o.count > 0 ? (o.value / o.count) : o.value,
                secondary: o.secondaryCnt > 0 ? (o.secondarySum / o.secondaryCnt) : null,
                targetCol: o.targetCnt > 0 ? (o.targetSum / o.targetCnt) : null,
                drills: o.drills
              };
            });
            arr.sort(function (a, b) {
              var ta = a.dateObj.getTime();
              var tb = b.dateObj.getTime();
              if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta - tb;
              return a.dateStr.localeCompare(b.dateStr);
            });
            return arr;
          }

          // Group List + Top-N with Other Rollup
          var allGroups = Object.keys(groupTotals).sort(function (a, b) { return groupTotals[b] - groupTotals[a]; });
          var topN = parseInt(config.topNLimit || "0", 10) || 0;
          var activeGroups = allGroups.slice();
          if (topN > 0 && allGroups.length > topN && groupDim) {
            var kept = allGroups.slice(0, topN);
            var dropped = allGroups.slice(topN);
            if (config.enableOtherRollup !== false && dropped.length > 0) {
              var otherMap = Object.create(null);
              dropped.forEach(function (gName) {
                Object.keys(byGroupDate[gName]).forEach(function (dStr) {
                  var item = byGroupDate[gName][dStr];
                  if (!otherMap[dStr]) otherMap[dStr] = { dateStr: dStr, value: 0, count: 0, secondarySum: 0, secondaryCnt: 0, targetSum: 0, targetCnt: 0, drills: item.drills };
                  otherMap[dStr].value += item.value;
                  otherMap[dStr].count += item.count;
                  otherMap[dStr].secondarySum += item.secondarySum;
                  otherMap[dStr].secondaryCnt += item.secondaryCnt;
                  otherMap[dStr].targetSum += item.targetSum;
                  otherMap[dStr].targetCnt += item.targetCnt;
                });
              });
              byGroupDate["Other Policies"] = otherMap;
              kept.push("Other Policies");
            }
            activeGroups = kept;
          }

          // Validate active selected group
          if (self._selectedGroup !== "ALL" && activeGroups.indexOf(self._selectedGroup) === -1) {
            self._selectedGroup = "ALL";
          }

          var baseSeries = (self._selectedGroup !== "ALL" && byGroupDate[self._selectedGroup])
            ? finalizeDateMap(byGroupDate[self._selectedGroup])
            : finalizeDateMap(byDateAll);

          if (baseSeries.length === 0) {
            if (self.addError) self.addError({ title: "No Valid Observations", message: "No numeric points remained after filtering." });
            done();
            return;
          }

          // Compute SPC mathematically in chronological order first
          var spc = computeSPCStats(baseSeries, sigmaMult, enableNelson);

          // Apply Search & Sort on displayed points (note: XmR/CUSUM require chronological flow unless capability/sort requested)
          var searchQ = (self._searchText || "").trim().toLowerCase();
          var displayPoints = spc.points.filter(function (pt) {
            if (!searchQ) return true;
            return pt.dateStr.toLowerCase().indexOf(searchQ) !== -1 ||
              pt.rules.join(" ").toLowerCase().indexOf(searchQ) !== -1;
          });
          if (displayPoints.length === 0) displayPoints = spc.points.slice(0, 1);

          var sortBy = config.sortBy || "chronological_asc";
          if (sortBy === "chronological_desc") displayPoints = displayPoints.slice().reverse();
          else if (sortBy === "metric_desc") displayPoints = displayPoints.slice().sort(function (a, b) { return b.value - a.value; });
          else if (sortBy === "metric_asc") displayPoints = displayPoints.slice().sort(function (a, b) { return a.value - b.value; });
          else if (sortBy === "alpha_asc") displayPoints = displayPoints.slice().sort(function (a, b) { return a.dateStr.localeCompare(b.dateStr); });

          // Target SLA Benchmark Resolution
          var targetMode = config.targetMode || "percentile_p90";
          var targetVal = null;
          if (targetMode === "dataset_mean") targetVal = spc.xbar;
          else if (targetMode === "dataset_median") targetVal = computePercentile(spc.sortedVals, 0.50);
          else if (targetMode === "percentile_p75") targetVal = computePercentile(spc.sortedVals, 0.75);
          else if (targetMode === "percentile_p90") targetVal = computePercentile(spc.sortedVals, 0.90);
          else if (targetMode === "measure_column") {
            var tVals = spc.points.map(function (pt) { return pt.targetCol; }).filter(function (v) { return v !== null && !isNaN(v); });
            if (tVals.length > 0) targetVal = d3.mean(tVals);
          } else if (targetMode === "fixed_value") {
            targetVal = Number(config.targetValue) || 0;
          }

          var hasDrills = spc.points.some(function (pt) { return pt.drills && pt.drills.length > 0; });
          var alertThreshPct = Number(config.anomalyAlertThreshold) || 5;
          var isDriftAlert = spc.violationPct >= alertThreshPct;

          // Build Root Layout
          var rootBox = document.createElement("div");
          rootBox.style.display = "flex";
          rootBox.style.flexDirection = "column";
          rootBox.style.width = "100%";
          rootBox.style.height = "100%";
          rootBox.style.background = theme.bg;
          rootBox.style.color = theme.text;
          rootBox.style.boxSizing = "border-box";
          rootBox.style.overflow = "hidden";

          // Header Title
          var titleStr = config.customTitle || "";
          var subStr = config.customSubtitle || "";
          if (titleStr || hasDrills) {
            var titleBox = document.createElement("div");
            titleBox.style.flex = "0 0 auto";
            titleBox.style.padding = "8px 16px 6px 16px";
            titleBox.style.background = theme.hudBg;
            titleBox.style.borderBottom = "1px solid " + theme.border;
            titleBox.style.display = "flex";
            titleBox.style.alignItems = "center";
            titleBox.style.justifyContent = "space-between";
            titleBox.style.flexWrap = "wrap";
            titleBox.style.gap = "8px";

            var tLeft = document.createElement("div");
            if (titleStr) {
              var tEl = document.createElement("div");
              tEl.style.fontSize = Math.round(14.5 * fMult) + "px";
              tEl.style.fontWeight = "700";
              tEl.style.color = theme.text;
              tEl.textContent = titleStr;
              tLeft.appendChild(tEl);
            }
            if (subStr) {
              var sEl = document.createElement("div");
              sEl.style.fontSize = Math.round(11 * fMult) + "px";
              sEl.style.color = theme.subtext;
              sEl.style.marginTop = "2px";
              sEl.textContent = subStr;
              tLeft.appendChild(sEl);
            }
            titleBox.appendChild(tLeft);

            if (hasDrills) {
              var drillPill = document.createElement("span");
              drillPill.style.fontSize = Math.round(10 * fMult) + "px";
              drillPill.style.fontWeight = "700";
              drillPill.style.padding = "2px 8px";
              drillPill.style.borderRadius = "999px";
              drillPill.style.background = hexToRgba(theme.primary, 0.12);
              drillPill.style.color = theme.primary;
              drillPill.textContent = "\uD83D\uDD0E CLICK POINT TO DRILL";
              titleBox.appendChild(drillPill);
            }
            rootBox.appendChild(titleBox);
          }

          // Executive HUD Scorecard
          if (hudMode !== "hidden") {
            var hudStrip = document.createElement("div");
            hudStrip.style.flex = "0 0 auto";
            hudStrip.style.display = "flex";
            hudStrip.style.alignItems = "center";
            hudStrip.style.justifyContent = "space-between";
            hudStrip.style.padding = "8px 16px";
            hudStrip.style.background = theme.hudBg;
            hudStrip.style.borderBottom = "1px solid " + theme.border;
            hudStrip.style.flexWrap = "wrap";
            hudStrip.style.gap = "12px";

            if (hudMode === "full") {
              var hudLeft = document.createElement("div");
              hudLeft.style.display = "flex";
              hudLeft.style.alignItems = "center";
              hudLeft.style.gap = "16px";
              hudLeft.style.flexWrap = "wrap";

              function addKpi(lbl, valTxt, col, border) {
                var box = document.createElement("div");
                if (border) {
                  box.style.borderLeft = "1px solid " + theme.border;
                  box.style.paddingLeft = "14px";
                }
                var l = document.createElement("div");
                l.style.fontSize = Math.round(9.5 * fMult) + "px";
                l.style.fontWeight = "700";
                l.style.textTransform = "uppercase";
                l.style.letterSpacing = "0.5px";
                l.style.color = theme.subtext;
                l.textContent = lbl;
                var v = document.createElement("div");
                v.style.fontSize = Math.round(14.5 * fMult) + "px";
                v.style.fontWeight = "800";
                v.style.color = col || theme.text;
                v.textContent = valTxt;
                box.appendChild(l);
                box.appendChild(v);
                hudLeft.appendChild(box);
              }

              addKpi("Center Line (X\u0304)", formatValue(spc.xbar, valFormat), theme.primary, false);
              addKpi("Control Envelope (LCL \u2013 UCL)", formatValue(spc.lcl, valFormat) + " \u2013 " + formatValue(spc.ucl, valFormat), theme.text, true);
              addKpi("Process Sigma (\u03C3 = mR\u0304/1.128)", formatValue(spc.sigma, valFormat) + " (Cp " + spc.cp.toFixed(2) + ")", theme.text, true);
              addKpi("Nelson Rule Breaches", spc.violationCount + " / " + spc.n + " (" + spc.violationPct.toFixed(1) + "%)", isDriftAlert ? theme.negative : theme.positive, true);
              if (targetMode !== "none" && targetVal !== null) {
                addKpi(config.referenceLineLabel || "SLA Benchmark", formatValue(targetVal, valFormat), theme.warning, true);
              }
              hudStrip.appendChild(hudLeft);

              var statusBadge = document.createElement("span");
              statusBadge.style.fontSize = Math.round(10.5 * fMult) + "px";
              statusBadge.style.fontWeight = "700";
              statusBadge.style.padding = "4px 10px";
              statusBadge.style.borderRadius = "999px";
              statusBadge.style.background = isDriftAlert ? hexToRgba(theme.negative, 0.14) : hexToRgba(theme.positive, 0.14);
              statusBadge.style.color = isDriftAlert ? theme.negative : theme.positive;
              statusBadge.textContent = isDriftAlert ? ("\u26A0\uFE0F OUT OF CONTROL (" + spc.r1Count + " >3\u03C3)") : "\u2705 IN STATISTICAL CONTROL";
              hudStrip.appendChild(statusBadge);
            } else {
              hudStrip.innerHTML =
                "<div style=\"font-size:" + Math.round(11.5 * fMult) + "px;font-weight:600;color:" + theme.subtext + ";\">" +
                "CL: <strong style=\"color:" + theme.primary + ";\">" + formatValue(spc.xbar, valFormat) + "</strong> &bull; " +
                "UCL/LCL: <strong>" + formatValue(spc.ucl, valFormat) + " / " + formatValue(spc.lcl, valFormat) + "</strong> &bull; " +
                "Breaches: <strong style=\"color:" + (isDriftAlert ? theme.negative : theme.positive) + ";\">" + spc.violationCount + " (" + spc.violationPct.toFixed(1) + "%)</strong>" +
                "</div>";
            }
            rootBox.appendChild(hudStrip);
          }

          // Interactive Group Filter + Search + Legend Bar (Normal Flow)
          if (showSearch || showLegend || activeGroups.length > 0) {
            var ctrlBar = document.createElement("div");
            ctrlBar.style.flex = "0 0 auto";
            ctrlBar.style.display = "flex";
            ctrlBar.style.alignItems = "center";
            ctrlBar.style.justifyContent = "space-between";
            ctrlBar.style.flexWrap = "wrap";
            ctrlBar.style.gap = "8px";
            ctrlBar.style.padding = "6px 16px";
            ctrlBar.style.background = theme.bg;
            ctrlBar.style.borderBottom = "1px solid " + theme.border;

            if (showSearch || activeGroups.length > 0) {
              var fLeft = document.createElement("div");
              fLeft.style.display = "flex";
              fLeft.style.alignItems = "center";
              fLeft.style.gap = "6px";
              fLeft.style.flexWrap = "wrap";

              if (showSearch) {
                var sInput = document.createElement("input");
                sInput.type = "text";
                sInput.placeholder = "Filter date or rule (e.g. R1)...";
                sInput.value = self._searchText || "";
                sInput.style.fontSize = Math.round(11 * fMult) + "px";
                sInput.style.padding = "3px 8px";
                sInput.style.borderRadius = "6px";
                sInput.style.border = "1px solid " + theme.border;
                sInput.style.background = theme.hudBg;
                sInput.style.color = theme.text;
                sInput.style.width = "165px";
                sInput.addEventListener("input", function (ev) {
                  self._searchText = ev.target.value;
                  self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, {}, function () {});
                });
                fLeft.appendChild(sInput);
              }

              if (activeGroups.length > 0 && layoutMode !== "rule_small_multiples") {
                var sel = document.createElement("select");
                sel.style.fontSize = Math.round(11 * fMult) + "px";
                sel.style.padding = "3px 8px";
                sel.style.borderRadius = "6px";
                sel.style.border = "1px solid " + theme.border;
                sel.style.background = theme.hudBg;
                sel.style.color = theme.text;
                var optAll = document.createElement("option");
                optAll.value = "ALL";
                optAll.textContent = "All Policies (" + activeGroups.length + " aggregated)";
                sel.appendChild(optAll);
                activeGroups.forEach(function (g) {
                  var op = document.createElement("option");
                  op.value = g;
                  op.textContent = g;
                  if (self._selectedGroup === g) op.selected = true;
                  sel.appendChild(op);
                });
                sel.addEventListener("change", function (ev) {
                  self._selectedGroup = ev.target.value;
                  self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, {}, function () {});
                });
                fLeft.appendChild(sel);
              }
              ctrlBar.appendChild(fLeft);
            }

            if (showLegend) {
              var legWrap = document.createElement("div");
              legWrap.style.display = "flex";
              legWrap.style.alignItems = "center";
              legWrap.style.gap = "12px";
              legWrap.style.flexWrap = "wrap";
              legWrap.style.fontSize = Math.round(10.5 * fMult) + "px";
              legWrap.style.color = theme.subtext;

              function addLeg(col, lbl, shape) {
                var sp = document.createElement("span");
                sp.style.display = "inline-flex";
                sp.style.alignItems = "center";
                sp.style.gap = "5px";
                var sw = document.createElement("span");
                sw.style.display = "inline-block";
                sw.style.width = "10px";
                sw.style.height = shape === "line" ? "0px" : "10px";
                if (shape === "line") sw.style.borderTop = "2px dashed " + col;
                else {
                  sw.style.background = col;
                  sw.style.borderRadius = shape === "dot" ? "50%" : "2px";
                }
                sp.appendChild(sw);
                sp.appendChild(document.createTextNode(lbl));
                legWrap.appendChild(sp);
              }
              addLeg(theme.primary, "Observed Series", "dot");
              addLeg(theme.negative, "Nelson Breach (R1\u2013R4)", "dot");
              addLeg(theme.subtext, "UCL / LCL (\u00B1" + sigmaMult + "\u03C3)", "line");
              if (targetMode !== "none" && targetVal !== null) addLeg(theme.warning, config.referenceLineLabel || "SLA Target", "line");
              ctrlBar.appendChild(legWrap);
            }

            rootBox.appendChild(ctrlBar);
          }

          // Chart Canvas Container
          var chartContainer = document.createElement("div");
          chartContainer.style.flex = "1 1 0";
          chartContainer.style.minHeight = "0";
          chartContainer.style.width = "100%";
          chartContainer.style.position = "relative";
          chartContainer.style.overflow = "hidden";
          rootBox.appendChild(chartContainer);
          container.appendChild(rootBox);

          function drawChart() {
            var width = chartContainer.clientWidth || element.clientWidth || 800;
            var height = chartContainer.clientHeight || 420;
            if (width < 50 || height < 50) return;

            chartContainer.innerHTML = "";

            // Shared Tooltip
            var tooltip = d3.select(chartContainer).append("div")
              .style("position", "absolute")
              .style("background", "rgba(15, 23, 42, 0.95)")
              .style("color", "#f8fafc")
              .style("padding", "10px 14px")
              .style("border-radius", "8px")
              .style("border", "1px solid rgba(255, 255, 255, 0.16)")
              .style("box-shadow", "0 4px 14px rgba(0,0,0,0.28)")
              .style("font-size", "11.5px")
              .style("line-height", "1.4")
              .style("pointer-events", "none")
              .style("opacity", 0)
              .style("z-index", 100);

            function placeTip(event, html) {
              tooltip.html(html).style("opacity", 1);
              var rect = chartContainer.getBoundingClientRect();
              var mx = event.clientX - rect.left;
              var my = event.clientY - rect.top;
              var tipW = 225;
              var left = mx + 14;
              if (left + tipW > width) left = mx - tipW - 14;
              tooltip.style("left", Math.max(8, left) + "px").style("top", Math.max(8, Math.min(height - 130, my - 12)) + "px");
            }

            // ==========================================================
            // MODE 3: MULTI-POLICY SPC SMALL MULTIPLES GRID
            // ==========================================================
            if (layoutMode === "rule_small_multiples" && activeGroups.length > 0) {
              chartContainer.style.overflowY = "auto";
              var grid = document.createElement("div");
              grid.style.display = "grid";
              grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
              grid.style.gap = "12px";
              grid.style.padding = "12px 16px";
              grid.style.boxSizing = "border-box";
              chartContainer.appendChild(grid);

              activeGroups.forEach(function (gName) {
                var gPts = finalizeDateMap(byGroupDate[gName]);
                var gSpc = computeSPCStats(gPts, sigmaMult, enableNelson);
                var gAlert = gSpc.violationPct >= alertThreshPct;

                var card = document.createElement("div");
                card.style.background = theme.hudBg;
                card.style.border = "1px solid " + (gAlert ? hexToRgba(theme.negative, 0.45) : theme.border);
                card.style.borderRadius = "8px";
                card.style.padding = "10px 12px";
                card.style.display = "flex";
                card.style.flexDirection = "column";
                card.style.gap = "6px";
                card.style.cursor = "pointer";
                card.addEventListener("click", function () {
                  self._selectedGroup = gName;
                  if (self._lastConfig) self._lastConfig.layoutMode = "xmr_control";
                  self.updateAsync(self._lastData, self._element, Object.assign({}, self._lastConfig, { layoutMode: "xmr_control" }), self._lastQueryResponse, {}, function () {});
                });

                var head = document.createElement("div");
                head.style.display = "flex";
                head.style.justifyContent = "space-between";
                head.style.alignItems = "center";
                head.innerHTML =
                  "<div style=\"font-size:" + Math.round(12 * fMult) + "px;font-weight:700;color:" + theme.text + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">" + gName + "</div>" +
                  "<span style=\"font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:" + (gAlert ? hexToRgba(theme.negative, 0.14) : hexToRgba(theme.positive, 0.14)) + ";color:" + (gAlert ? theme.negative : theme.positive) + ";\">" + gSpc.violationCount + " breaches</span>";
                card.appendChild(head);

                var sub = document.createElement("div");
                sub.style.fontSize = "10.5px";
                sub.style.color = theme.subtext;
                sub.textContent = "CL " + formatValue(gSpc.xbar, valFormat) + " | UCL " + formatValue(gSpc.ucl, valFormat) + " | Cp " + gSpc.cp.toFixed(2);
                card.appendChild(sub);

                var miniWrap = document.createElement("div");
                miniWrap.style.height = "110px";
                miniWrap.style.width = "100%";
                card.appendChild(miniWrap);
                grid.appendChild(card);

                var mw = miniWrap.clientWidth || 250;
                var mh = 110;
                var mm = { top: 8, right: 8, bottom: 16, left: 36 };
                var miw = Math.max(30, mw - mm.left - mm.right);
                var mih = Math.max(20, mh - mm.top - mm.bottom);

                var mSvg = d3.select(miniWrap).append("svg").attr("width", mw).attr("height", mh);
                var mG = mSvg.append("g").attr("transform", "translate(" + mm.left + "," + mm.top + ")");
                var mxS = d3.scalePoint().domain(gSpc.points.map(function (p) { return p.dateStr; })).range([0, miw]);
                var myMin = Math.min(gSpc.lcl, d3.min(gSpc.points, function (p) { return p.value; }));
                var myMax = Math.max(gSpc.ucl, d3.max(gSpc.points, function (p) { return p.value; }));
                var myPad = (myMax - myMin) * 0.1 || 1;
                var myS = d3.scaleLinear().domain([Math.max(0, myMin - myPad), myMax + myPad]).range([mih, 0]);

                mG.append("rect").attr("x", 0).attr("width", miw).attr("y", myS(gSpc.ucl)).attr("height", Math.max(0, myS(gSpc.lcl) - myS(gSpc.ucl))).attr("fill", theme.zoneC);
                mG.append("line").attr("x1", 0).attr("x2", miw).attr("y1", myS(gSpc.ucl)).attr("y2", myS(gSpc.ucl)).attr("stroke", theme.negative).attr("stroke-dasharray", "3,2").attr("stroke-width", 1);
                mG.append("line").attr("x1", 0).attr("x2", miw).attr("y1", myS(gSpc.xbar)).attr("y2", myS(gSpc.xbar)).attr("stroke", theme.subtext).attr("stroke-width", 1);
                mG.append("line").attr("x1", 0).attr("x2", miw).attr("y1", myS(gSpc.lcl)).attr("y2", myS(gSpc.lcl)).attr("stroke", theme.negative).attr("stroke-dasharray", "3,2").attr("stroke-width", 1);
                mG.append("path").datum(gSpc.points).attr("fill", "none").attr("stroke", theme.primary).attr("stroke-width", 1.5)
                  .attr("d", d3.line().x(function (p) { return mxS(p.dateStr); }).y(function (p) { return myS(p.value); }));
                mG.selectAll(".mpt").data(gSpc.points.filter(function (p) { return p.isViolation; })).enter().append("circle")
                  .attr("cx", function (p) { return mxS(p.dateStr); }).attr("cy", function (p) { return myS(p.value); })
                  .attr("r", 3.5).attr("fill", theme.negative);
                var myAx = mG.append("g").call(d3.axisLeft(myS).ticks(3).tickFormat(function (d) { return formatValue(d, valFormat); }));
                myAx.select(".domain").attr("stroke", theme.border);
                myAx.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", "9px");
              });
              return;
            }

            chartContainer.style.overflowY = "hidden";
            var margin = { top: 20, right: 28, bottom: 28, left: 64 };
            var innerWidth = Math.max(40, width - margin.left - margin.right);
            var innerHeight = Math.max(40, height - margin.top - margin.bottom);

            var svg = d3.select(chartContainer).append("svg").attr("width", width).attr("height", height).style("display", "block");
            var mainG = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // ==========================================================
            // MODE 4: PROCESS CAPABILITY & SIGMA DISTRIBUTION (Cp / Cpk)
            // ==========================================================
            if (layoutMode === "capability_histogram") {
              var vals = spc.points.map(function (p) { return p.value; });
              var vMin = Math.min(spc.lcl, d3.min(vals)) - spc.sigma * 0.6;
              var vMax = Math.max(spc.ucl, d3.max(vals)) + spc.sigma * 0.6;
              var xCap = d3.scaleLinear().domain([vMin, vMax]).range([0, innerWidth]);
              var bins = d3.bin().domain(xCap.domain()).thresholds(Math.min(18, Math.max(8, Math.round(Math.sqrt(vals.length)))))(vals);
              var maxCount = d3.max(bins, function (b) { return b.length; }) || 1;
              var yCap = d3.scaleLinear().domain([0, maxCount * 1.18]).range([innerHeight, 0]);

              mainG.append("g").call(d3.axisLeft(yCap).ticks(5).tickSize(-innerWidth).tickFormat(""))
                .selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");

              mainG.selectAll(".cap-bar").data(bins).enter().append("rect")
                .attr("x", function (b) { return xCap(b.x0) + 1; })
                .attr("width", function (b) { return Math.max(2, xCap(b.x1) - xCap(b.x0) - 2); })
                .attr("y", function (b) { return yCap(b.length); })
                .attr("height", function (b) { return Math.max(0, innerHeight - yCap(b.length)); })
                .attr("fill", function (b) {
                  var mid = (b.x0 + b.x1) / 2;
                  return (mid > spc.ucl || mid < spc.lcl) ? hexToRgba(theme.negative, 0.72) : hexToRgba(theme.primary, 0.65);
                })
                .attr("rx", 2);

              // Fitted Normal Curve scaled to histogram peak
              var binW = bins.length > 0 ? (bins[0].x1 - bins[0].x0) : spc.sigma;
              var curvePts = [];
              for (var s = 0; s <= 60; s++) {
                var xv = vMin + (vMax - vMin) * (s / 60);
                var pdf = (1 / (spc.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((xv - spc.xbar) / spc.sigma, 2));
                curvePts.push({ x: xv, y: pdf * vals.length * binW });
              }
              mainG.append("path").datum(curvePts).attr("fill", "none").attr("stroke", theme.secondary).attr("stroke-width", 2.2)
                .attr("d", d3.line().x(function (d) { return xCap(d.x); }).y(function (d) { return yCap(d.y); }).curve(d3.curveMonotoneX));

              [
                { v: spc.lcl, lbl: "LCL " + formatValue(spc.lcl, valFormat), col: theme.negative },
                { v: spc.xbar, lbl: "CL " + formatValue(spc.xbar, valFormat), col: theme.primary },
                { v: spc.ucl, lbl: "UCL " + formatValue(spc.ucl, valFormat), col: theme.negative }
              ].forEach(function (ref) {
                mainG.append("line").attr("x1", xCap(ref.v)).attr("x2", xCap(ref.v)).attr("y1", 0).attr("y2", innerHeight)
                  .attr("stroke", ref.col).attr("stroke-width", 1.6).attr("stroke-dasharray", "5,4");
                mainG.append("text").attr("x", xCap(ref.v) + 4).attr("y", 14).attr("fill", ref.col)
                  .style("font-size", Math.round(10 * fMult) + "px").style("font-weight", "700").text(ref.lbl);
              });

              var xAxC = mainG.append("g").attr("transform", "translate(0," + innerHeight + ")").call(d3.axisBottom(xCap).ticks(7).tickFormat(function (d) { return formatValue(d, valFormat); }));
              xAxC.select(".domain").attr("stroke", theme.border);
              xAxC.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10 * fMult) + "px");
              var yAxC = mainG.append("g").call(d3.axisLeft(yCap).ticks(5));
              yAxC.select(".domain").attr("stroke", theme.border);
              yAxC.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10 * fMult) + "px");
              return;
            }

            // ==========================================================
            // MODE 2: CUSUM CUMULATIVE DRIFT DETECTOR
            // ==========================================================
            if (layoutMode === "cusum_drift") {
              var xCus = d3.scalePoint().domain(displayPoints.map(function (p) { return p.dateStr; })).range([0, innerWidth]).padding(0.4);
              var cMax = Math.max(spc.hLimit * 1.25, d3.max(displayPoints, function (p) { return Math.max(p.cPlus, Math.abs(p.cMinus)); }) || spc.hLimit);
              var yCus = d3.scaleLinear().domain([-cMax, cMax]).range([innerHeight, 0]);

              mainG.append("rect").attr("x", 0).attr("width", innerWidth).attr("y", yCus(spc.hLimit)).attr("height", Math.max(0, yCus(-spc.hLimit) - yCus(spc.hLimit))).attr("fill", theme.zoneC);
              mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yCus(spc.hLimit)).attr("y2", yCus(spc.hLimit)).attr("stroke", theme.negative).attr("stroke-dasharray", "5,4").attr("stroke-width", 1.5);
              mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yCus(0)).attr("y2", yCus(0)).attr("stroke", theme.subtext).attr("stroke-width", 1);
              mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yCus(-spc.hLimit)).attr("y2", yCus(-spc.hLimit)).attr("stroke", theme.negative).attr("stroke-dasharray", "5,4").attr("stroke-width", 1.5);

              mainG.append("text").attr("x", 6).attr("y", yCus(spc.hLimit) - 5).attr("fill", theme.negative).style("font-size", "10px").style("font-weight", "700").text("+H Decision Interval (+5\u03C3)");
              mainG.append("text").attr("x", 6).attr("y", yCus(-spc.hLimit) + 12).attr("fill", theme.negative).style("font-size", "10px").style("font-weight", "700").text("-H Decision Interval (-5\u03C3)");

              mainG.append("path").datum(displayPoints).attr("fill", "none").attr("stroke", theme.negative).attr("stroke-width", 2)
                .attr("d", d3.line().x(function (p) { return xCus(p.dateStr); }).y(function (p) { return yCus(p.cPlus); }));
              mainG.append("path").datum(displayPoints).attr("fill", "none").attr("stroke", theme.primary).attr("stroke-width", 2)
                .attr("d", d3.line().x(function (p) { return xCus(p.dateStr); }).y(function (p) { return yCus(p.cMinus); }));

              mainG.selectAll(".cus-pt").data(displayPoints).enter().append("circle")
                .attr("cx", function (p) { return xCus(p.dateStr); })
                .attr("cy", function (p) { return yCus(Math.abs(p.cPlus) >= Math.abs(p.cMinus) ? p.cPlus : p.cMinus); })
                .attr("r", function (p) { return p.cusumBreach ? 4.8 : 2.8; })
                .attr("fill", function (p) { return p.cusumBreach ? theme.negative : theme.primary; })
                .style("cursor", "pointer")
                .on("mousemove", function (event, p) {
                  placeTip(event, "<div style=\"font-weight:800;margin-bottom:4px;\">\uD83D\uDCC5 " + p.dateStr + "</div>" +
                    "<div>Value: <strong>" + formatValue(p.value, valFormat) + "</strong></div>" +
                    "<div>C+ Drift: <strong style=\"color:#f87171;\">+" + formatValue(p.cPlus, valFormat) + "</strong></div>" +
                    "<div>C- Drift: <strong style=\"color:#38bdf8;\">" + formatValue(p.cMinus, valFormat) + "</strong></div>");
                })
                .on("mouseleave", function () { tooltip.style("opacity", 0); })
                .on("click", function (event, p) {
                  if (p.drills && p.drills.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils) LookerCharts.Utils.openDrillMenu({ links: p.drills, event: event });
                });

              var cStep = Math.max(1, Math.floor(displayPoints.length / 8));
              var cxAx = mainG.append("g").attr("transform", "translate(0," + innerHeight + ")").call(d3.axisBottom(xCus).tickValues(displayPoints.filter(function (_, i) { return i % cStep === 0; }).map(function (p) { return p.dateStr; })));
              cxAx.select(".domain").attr("stroke", theme.border);
              cxAx.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10 * fMult) + "px");
              var cyAx = mainG.append("g").call(d3.axisLeft(yCus).ticks(6).tickFormat(function (d) { return formatValue(d, valFormat); }));
              cyAx.select(".domain").attr("stroke", theme.border);
              cyAx.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10 * fMult) + "px");
              return;
            }

            // ==========================================================
            // MODE 1: SHEWHART XmR & MOVING RANGE (I-MR) CONTROL CHART
            // ==========================================================
            var mrHeight = showMR ? Math.max(58, Math.floor(innerHeight * 0.25)) : 0;
            var gapH = showMR ? 22 : 0;
            var topH = Math.max(50, innerHeight - mrHeight - gapH);

            var xS = d3.scalePoint()
              .domain(displayPoints.map(function (p) { return p.dateStr; }))
              .range([0, innerWidth])
              .padding(0.4);

            var yMin = Math.min(spc.lcl, d3.min(displayPoints, function (p) { return p.value; }));
            var yMax = Math.max(spc.ucl, d3.max(displayPoints, function (p) { return p.value; }));
            if (targetMode !== "none" && targetVal !== null && !isNaN(targetVal)) {
              yMin = Math.min(yMin, targetVal);
              yMax = Math.max(yMax, targetVal);
            }
            var yPad = (yMax - yMin) * 0.1 || 1;
            var yS = d3.scaleLinear().domain([Math.max(0, yMin - yPad), yMax + yPad]).range([topH, 0]);

            // Shaded Sigma Zones (Zone C ±1σ, Zone B ±2σ, Zone A ±3σ)
            if (showSigmaZones) {
              function drawZoneBand(lo, hi, col) {
                var cLo = Math.max(yS.domain()[0], lo);
                var cHi = Math.min(yS.domain()[1], hi);
                if (cHi <= cLo) return;
                mainG.append("rect").attr("x", 0).attr("width", innerWidth)
                  .attr("y", yS(cHi)).attr("height", Math.max(0, yS(cLo) - yS(cHi)))
                  .attr("fill", col);
              }
              drawZoneBand(spc.xbar - 3 * spc.sigma, spc.xbar - 2 * spc.sigma, theme.zoneA);
              drawZoneBand(spc.xbar + 2 * spc.sigma, spc.xbar + 3 * spc.sigma, theme.zoneA);
              drawZoneBand(spc.xbar - 2 * spc.sigma, spc.xbar - spc.sigma, theme.zoneB);
              drawZoneBand(spc.xbar + spc.sigma, spc.xbar + 2 * spc.sigma, theme.zoneB);
              drawZoneBand(spc.xbar - spc.sigma, spc.xbar + spc.sigma, theme.zoneC);
            }

            mainG.append("g").call(d3.axisLeft(yS).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");

            // Control Limits (UCL / CL / LCL)
            mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yS(spc.ucl)).attr("y2", yS(spc.ucl))
              .attr("stroke", theme.negative).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,4");
            mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yS(spc.xbar)).attr("y2", yS(spc.xbar))
              .attr("stroke", theme.primary).attr("stroke-width", 1.5);
            mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yS(spc.lcl)).attr("y2", yS(spc.lcl))
              .attr("stroke", theme.negative).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,4");

            mainG.append("text").attr("x", innerWidth - 4).attr("y", Math.max(11, yS(spc.ucl) - 4)).attr("text-anchor", "end")
              .attr("fill", theme.negative).style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700")
              .text("UCL (+" + sigmaMult + "\u03C3): " + formatValue(spc.ucl, valFormat));
            mainG.append("text").attr("x", innerWidth - 4).attr("y", Math.max(11, yS(spc.lcl) + 12)).attr("text-anchor", "end")
              .attr("fill", theme.negative).style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700")
              .text("LCL (-" + sigmaMult + "\u03C3): " + formatValue(spc.lcl, valFormat));

            // Optional SLA Benchmark Reference Line
            if (targetMode !== "none" && targetVal !== null && !isNaN(targetVal)) {
              mainG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yS(targetVal)).attr("y2", yS(targetVal))
                .attr("stroke", theme.warning).attr("stroke-width", 1.4).attr("stroke-dasharray", "3,3");
              mainG.append("text").attr("x", 6).attr("y", Math.max(11, yS(targetVal) - 4)).attr("text-anchor", "start")
                .attr("fill", theme.warning).style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700")
                .text((config.referenceLineLabel || "SLA") + ": " + formatValue(targetVal, valFormat));
            }

            // Individuals Line
            mainG.append("path").datum(displayPoints)
              .attr("fill", "none")
              .attr("stroke", theme.primary)
              .attr("stroke-width", 2)
              .attr("d", d3.line().x(function (p) { return xS(p.dateStr); }).y(function (p) { return yS(p.value); }));

            // Data Points + Nelson Breach Halos
            var ptsG = mainG.selectAll(".spc-pt").data(displayPoints).enter().append("g")
              .attr("transform", function (p) { return "translate(" + xS(p.dateStr) + "," + yS(p.value) + ")"; })
              .style("cursor", "pointer");

            ptsG.filter(function (p) { return p.isViolation; }).append("circle")
              .attr("r", 8)
              .attr("fill", hexToRgba(theme.negative, 0.18))
              .attr("stroke", theme.negative)
              .attr("stroke-width", 1.2);

            ptsG.append("circle")
              .attr("r", function (p) { return p.isR1 ? 4.8 : (p.isViolation ? 4.2 : 3); })
              .attr("fill", function (p) { return p.isViolation ? theme.negative : theme.primary; })
              .attr("stroke", theme.bg)
              .attr("stroke-width", 1);

            if (labelDensity !== "hidden") {
              var maxPt = displayPoints.reduce(function (a, b) { return b.value > a.value ? b : a; }, displayPoints[0]);
              var minPt = displayPoints.reduce(function (a, b) { return b.value < a.value ? b : a; }, displayPoints[0]);
              ptsG.filter(function (p) {
                if (labelDensity === "all") return p.isViolation || p === maxPt || p === minPt;
                return p.isR1 || p === maxPt || p === minPt;
              }).append("text")
                .attr("x", function (p) {
                  if (p === displayPoints[0]) return 6;
                  if (p === displayPoints[displayPoints.length - 1]) return -6;
                  return 0;
                })
                .attr("y", function (p) {
                  var rawY = p.value >= spc.xbar ? -9 : 14;
                  var absY = yS(p.value) + rawY;
                  if (absY < 12) return 14;
                  if (absY > topH - 6) return -9;
                  return rawY;
                })
                .attr("text-anchor", function (p) {
                  if (p === displayPoints[0]) return "start";
                  if (p === displayPoints[displayPoints.length - 1]) return "end";
                  return "middle";
                })
                .attr("fill", function (p) { return p.isViolation ? theme.negative : theme.text; })
                .style("font-size", Math.round(9.5 * fMult) + "px")
                .style("font-weight", "700")
                .text(function (p) { return formatValue(p.value, valFormat); });
            }

            ptsG.on("mousemove", function (event, p) {
              var ruleTxt = p.rules.length ? p.rules.join(", ") : "In Control";
              var ruleCol = p.isViolation ? "#f87171" : "#34d399";
              var html =
                "<div style=\"font-size:12px;font-weight:800;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;margin-bottom:5px;\">\uD83D\uDCC5 " + p.dateStr + "</div>" +
                "<div style=\"display:grid;grid-template-columns:auto auto;gap:3px 14px;\">" +
                "  <span style=\"color:#94a3b8;\">Observed:</span><span style=\"font-weight:700;text-align:right;\">" + formatValue(p.value, valFormat) + "</span>" +
                "  <span style=\"color:#94a3b8;\">Moving Range (mR):</span><span style=\"font-weight:700;text-align:right;\">" + formatValue(p.mr, valFormat) + "</span>" +
                "  <span style=\"color:#94a3b8;\">Z-Score:</span><span style=\"font-weight:700;text-align:right;\">" + (p.zScore >= 0 ? "+" : "") + p.zScore.toFixed(2) + "\u03C3</span>" +
                (p.secondary !== null ? "  <span style=\"color:#94a3b8;\">" + (secondaryMeas.label_short || "Secondary") + ":</span><span style=\"font-weight:700;text-align:right;\">" + formatValue(p.secondary, valFormat) + "</span>" : "") +
                "  <span style=\"color:#94a3b8;\">SPC Status:</span><span style=\"font-weight:800;text-align:right;color:" + ruleCol + ";\">" + ruleTxt + "</span>" +
                "</div>";
              placeTip(event, html);
            })
              .on("mouseleave", function () { tooltip.style("opacity", 0); })
              .on("click", function (event, p) {
                if (p.drills && p.drills.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils) {
                  LookerCharts.Utils.openDrillMenu({ links: p.drills, event: event });
                }
              });

            // Axes for XmR Top Panel
            var yAx = mainG.append("g").call(d3.axisLeft(yS).ticks(5).tickFormat(function (d) { return formatValue(d, valFormat); }));
            yAx.select(".domain").attr("stroke", theme.border);
            yAx.selectAll(".tick text").attr("fill", theme.text).style("font-size", Math.round(10 * fMult) + "px").style("font-weight", "600");

            var xStep = Math.max(1, Math.floor(displayPoints.length / 8));
            var xTickVals = displayPoints.filter(function (_, i) { return i % xStep === 0; }).map(function (p) { return p.dateStr; });
            var xAx = mainG.append("g").attr("transform", "translate(0," + (showMR ? topH + gapH + mrHeight : topH) + ")").call(d3.axisBottom(xS).tickValues(xTickVals));
            xAx.select(".domain").attr("stroke", theme.border);
            xAx.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10 * fMult) + "px");

            // Moving Range (mR) Volatility Sub-Panel
            if (showMR) {
              var mrG = mainG.append("g").attr("transform", "translate(0," + (topH + gapH) + ")");
              mrG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", 0).attr("y2", 0).attr("stroke", theme.border);
              mrG.append("text").attr("x", 0).attr("y", -5).attr("fill", theme.subtext)
                .style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700").style("text-transform", "uppercase")
                .text("Moving Range (mR = |X\u1D62 - X\u1D62\u208B\u2081|) \u2022 UCL_mR " + formatValue(spc.uclMr, valFormat));

              var maxMr = Math.max(spc.uclMr * 1.1, d3.max(displayPoints, function (p) { return p.mr; }) || 1);
              var yMr = d3.scaleLinear().domain([0, maxMr]).range([mrHeight, 4]);

              var mrAx = mrG.append("g").call(d3.axisLeft(yMr).ticks(3).tickFormat(function (d) { return formatValue(d, valFormat); }));
              mrAx.select(".domain").attr("stroke", theme.border);
              mrAx.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", "9.5px");

              mrG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yMr(spc.uclMr)).attr("y2", yMr(spc.uclMr))
                .attr("stroke", theme.negative).attr("stroke-dasharray", "4,3").attr("stroke-width", 1.2);
              mrG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", yMr(spc.mrBar)).attr("y2", yMr(spc.mrBar))
                .attr("stroke", theme.subtext).attr("stroke-dasharray", "2,2").attr("stroke-width", 1);

              var barW = Math.max(2, Math.min(10, (innerWidth / displayPoints.length) * 0.55));
              mrG.selectAll(".mr-bar").data(displayPoints).enter().append("rect")
                .attr("x", function (p) { return xS(p.dateStr) - barW / 2; })
                .attr("width", barW)
                .attr("y", function (p) { return yMr(p.mr); })
                .attr("height", function (p) { return Math.max(0, mrHeight - yMr(p.mr)); })
                .attr("fill", function (p) { return p.mr > spc.uclMr ? theme.negative : hexToRgba(theme.primary, 0.45); })
                .attr("rx", 1);
            }
          }

          drawChart();

          if (self._resizeObserver) {
            try { self._resizeObserver.disconnect(); } catch (e) {}
          }
          var lastW = chartContainer.clientWidth;
          var lastH = chartContainer.clientHeight;
          self._resizeObserver = new ResizeObserver(function (entries) {
            if (!entries || !entries.length) return;
            var newW = chartContainer.clientWidth;
            var newH = chartContainer.clientHeight;
            if (Math.abs(newW - lastW) > 4 || Math.abs(newH - lastH) > 4) {
              lastW = newW;
              lastH = newH;
              drawChart();
            }
          });
          self._resizeObserver.observe(chartContainer);

          done();
        } catch (err) {
          if (self.addError) self.addError({ title: "Render Error", message: err.message });
          done();
        }
      });
    }
  });
})();
