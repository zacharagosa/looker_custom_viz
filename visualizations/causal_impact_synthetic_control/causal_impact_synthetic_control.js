/**
 * Causal Impact & Synthetic Control Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Looker Cloud Blocker b/328491042: "Pre/Post Synthetic Control & Causal Impact Counterfactual Chart"
 * - Looker Cloud Blocker b/419203847: "Synchronized Multi-Panel Triptych with Vertical Intervention Gate"
 * - Internal YAQS: "Evaluating Geo-Lift & Non-Randomized Rollouts via CausalImpact in Looker"
 *
 * 4 Multi-Modal Visual Paradigms:
 * 1. "stacked_triptych": 3-Panel Synchronized Causal Impact Triptych (Observed vs Counterfactual + 95% CI,
 *    Pointwise Causal Lift Delta, Cumulative Incremental Impact) with synchronized crosshair.
 * 2. "counterfactual_overlay": Focused Pre/Post Counterfactual Envelope with Pre-Period Fit & Donor Weights.
 * 3. "placebo_permutation": In-Space Placebo Permutation Spaghetti + Post/Pre RMSPE Ratio Rank Bars.
 * 4. "intervention_scorecard": Multi-Cohort Causal Impact & Synthetic Donor Matrix with Drill-Down.
 *
 * Configuration Options: Strictly 2 clean tabs (Display and Style).
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.select === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector("script[src*='d3.v7']");
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function") {
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
      primary: "#1a73e8",
      counterfactual: "#5f6368",
      positive: "#137333",
      positiveFill: "rgba(19, 115, 51, 0.22)",
      negative: "#c5221f",
      negativeFill: "rgba(197, 34, 31, 0.22)",
      ciFill: "rgba(26, 115, 232, 0.16)",
      gate: "#ea4335",
      target: "#f9ab00",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      hudBg: "rgba(255, 255, 255, 0.97)",
      placebo: "#9aa0a6",
      dark: false
    },
    modern_slate: {
      name: "Modern Slate",
      primary: "#2563eb",
      counterfactual: "#64748b",
      positive: "#059669",
      positiveFill: "rgba(5, 150, 105, 0.20)",
      negative: "#e11d48",
      negativeFill: "rgba(225, 29, 72, 0.20)",
      ciFill: "rgba(37, 99, 235, 0.15)",
      gate: "#dc2626",
      target: "#d97706",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      hudBg: "rgba(255, 255, 255, 0.97)",
      placebo: "#94a3b8",
      dark: false
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      primary: "#38bdf8",
      counterfactual: "#94a3b8",
      positive: "#4ade80",
      positiveFill: "rgba(74, 222, 128, 0.22)",
      negative: "#fb7185",
      negativeFill: "rgba(251, 113, 133, 0.22)",
      ciFill: "rgba(56, 189, 248, 0.18)",
      gate: "#f43f5e",
      target: "#fbbf24",
      bg: "#0b1120",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      cardBg: "#111827",
      cardBorder: "#1e293b",
      hudBg: "rgba(17, 24, 39, 0.97)",
      placebo: "#475569",
      dark: true
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#047857",
      counterfactual: "#6b7280",
      positive: "#10b981",
      positiveFill: "rgba(16, 185, 129, 0.22)",
      negative: "#dc2626",
      negativeFill: "rgba(220, 38, 38, 0.20)",
      ciFill: "rgba(4, 120, 87, 0.15)",
      gate: "#b91c1c",
      target: "#0d9488",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#d1fae5",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      hudBg: "rgba(255, 255, 255, 0.97)",
      placebo: "#9ca3af",
      dark: false
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      primary: "#ea580c",
      counterfactual: "#78716c",
      positive: "#16a34a",
      positiveFill: "rgba(22, 163, 74, 0.20)",
      negative: "#be123c",
      negativeFill: "rgba(190, 18, 60, 0.22)",
      ciFill: "rgba(234, 88, 12, 0.16)",
      gate: "#e11d48",
      target: "#f59e0b",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#7c2d12",
      grid: "#fed7aa",
      cardBg: "#fffbeb",
      cardBorder: "#fed7aa",
      hudBg: "rgba(255, 255, 255, 0.97)",
      placebo: "#a8a29e",
      dark: false
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      primary: "#143359",
      counterfactual: "#64748b",
      positive: "#00AF68",
      positiveFill: "rgba(0, 175, 104, 0.20)",
      negative: "#E5484D",
      negativeFill: "rgba(229, 72, 77, 0.20)",
      ciFill: "rgba(46, 124, 246, 0.15)",
      gate: "#E5484D",
      target: "#FFB500",
      bg: "#ffffff",
      text: "#143359",
      subtext: "#64748B",
      grid: "#EEF2F7",
      cardBg: "#F8FAFC",
      cardBorder: "#CBD5E1",
      hudBg: "rgba(255, 255, 255, 0.97)",
      placebo: "#94A3B8",
      dark: false
    }
  };

  function escHtml(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && String(idx) === trimmed && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    return defaultIdx >= 0 ? (list[defaultIdx] || null) : null;
  }

  function findFieldByHints(list, hints, fallbackIdx) {
    if (!list || list.length === 0) return null;
    for (var h = 0; h < hints.length; h++) {
      var hint = hints[h];
      for (var i = 0; i < list.length; i++) {
        var shortName = (list[i].name || "").split(".").pop().toLowerCase();
        var lbl = (list[i].label_short || list[i].label || "").toLowerCase();
        if (shortName.indexOf(hint) !== -1 || lbl.indexOf(hint) !== -1) {
          return list[i];
        }
      }
    }
    return fallbackIdx >= 0 && fallbackIdx < list.length ? list[fallbackIdx] : null;
  }

  function formatVal(val, valueFormat) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    var fmt = valueFormat || "auto";
    var abs = Math.abs(n);
    var sign = n < 0 ? "-" : "";

    if (fmt === "percentage") {
      return (abs <= 2 ? n * 100 : n).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === "raw") {
      return String(Math.round(n * 100) / 100);
    }
    if (fmt === "compact_currency" || fmt === "auto") {
      var prefix = fmt === "compact_currency" ? "$" : "";
      if (abs >= 1e9) return sign + prefix + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + prefix + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + prefix + (abs / 1e3).toFixed(1) + "K";
      return sign + prefix + abs.toFixed(0);
    }
    // compact_number
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
    return sign + abs.toFixed(1);
  }

  function formatSignedVal(val, valueFormat) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    var s = formatVal(Math.abs(n), valueFormat);
    return (n > 0 ? "+" : n < 0 ? "-" : "") + s;
  }

  function parseDateVal(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    var d = new Date(s.length === 10 ? s + "T00:00:00Z" : s);
    return isNaN(d.getTime()) ? null : d;
  }

  looker.plugins.visualizations.add({
    id: "causal_impact_synthetic_control",
    label: "Causal Impact & Synthetic Control Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs total)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Causal Visual Paradigm",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "3-Panel Synchronized Causal Triptych": "stacked_triptych" },
          { "Pre/Post Counterfactual & Donor Fit": "counterfactual_overlay" },
          { "In-Space Placebo Permutation Diagnostic": "placebo_permutation" },
          { "Multi-Cohort Causal Scorecard Matrix": "intervention_scorecard" }
        ],
        default: "stacked_triptych"
      },
      dateDimOverride: {
        type: "string",
        label: "Time / Observation Date Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      cohortDimOverride: {
        type: "string",
        label: "Cohort / Market Segment Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      phaseDimOverride: {
        type: "string",
        label: "Intervention Phase Dimension",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      treatedDimOverride: {
        type: "string",
        label: "Is-Treated Flag Dimension",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      observedMeasureOverride: {
        type: "string",
        label: "Observed Actual Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      counterfactualMeasureOverride: {
        type: "string",
        label: "Synthetic Counterfactual Measure",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      ciLowerMeasureOverride: {
        type: "string",
        label: "Credible Interval Lower Measure",
        section: "Display",
        order: 8,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      ciUpperMeasureOverride: {
        type: "string",
        label: "Credible Interval Upper Measure",
        section: "Display",
        order: 9,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / Lift Goal Measure Column",
        section: "Display",
        order: 10,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Daily Lift Goal / Benchmark Mode",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Fixed Lift Goal Value": "fixed_value" },
          { "Measure Column": "measure_column" },
          { "Dataset Mean Post Lift": "dataset_mean" },
          { "Dataset Median Post Lift": "dataset_median" },
          { "Percentile P75 Post Lift": "percentile_p75" },
          { "Percentile P90 Post Lift": "percentile_p90" },
          { "None (Zero-Effect Line Only)": "none" }
        ],
        default: "fixed_value"
      },
      fixedTargetValue: {
        type: "number",
        label: "Custom Daily Lift Target Value",
        section: "Display",
        order: 12,
        default: 15000
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 13,
        default: "Daily Lift Goal ($15K)"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Causal Significance Alpha (%) / Lift Alert",
        section: "Display",
        order: 14,
        default: 5
      },
      sortBy: {
        type: "string",
        label: "Cohort / Table Sort Order",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Chronological / Treated First": "chronological" },
          { "Cumulative Lift (Descending)": "lift_desc" },
          { "Cumulative Lift (Ascending)": "lift_asc" },
          { "Alphabetical (A to Z)": "alpha_asc" }
        ],
        default: "chronological"
      },
      topNLimit: {
        type: "string",
        label: "Top-N Donor / Cohort Limit",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Top 3 Cohorts": "3" },
          { "Top 5 Cohorts": "5" },
          { "Top 8 Cohorts": "8" },
          { "Top 12 Cohorts": "12" },
          { "All Cohorts": "all" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Remaining Cohorts into 'Other'",
        section: "Display",
        order: 17,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Observations",
        section: "Display",
        order: 18,
        default: false
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Density",
        section: "Display",
        order: 19,
        display: "select",
        values: [
          { "Full Scorecard (4 KPIs)": "scorecard" },
          { "Compact Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard"
      },
      labelDensity: {
        type: "string",
        label: "Data Callout Label Density",
        section: "Display",
        order: 20,
        display: "select",
        values: [
          { "All Callouts & Gate Annotations": "all" },
          { "Peak & Final Cumulative Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only"
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 21,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        section: "Display",
        order: 22,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Cohort Selector & Search Bar",
        section: "Display",
        order: 23,
        default: true
      },
      showLegend: {
        type: "boolean",
        label: "Show Legend & Fit Diagnostics",
        section: "Display",
        order: 24,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs total)
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
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Observed Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive Lift Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Negative Lift / Gate Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Revenue / Conversions)": "higher_is_better" },
          { "Lower is Better (Latency / Churn / Cost)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (Dense Dashboard)": "compact" },
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
          { "Auto": "auto" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "compact_currency"
      },
      ciOpacity: {
        type: "number",
        label: "Credible Interval Cone Opacity (0.05 - 0.5)",
        section: "Style",
        order: 8,
        default: 0.18
      },
      showGridLines: {
        type: "boolean",
        label: "Show Chart Gridlines",
        section: "Style",
        order: 9,
        default: true
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dateDimOverride: { role: "dimension", defaultIdx: 0 },
        cohortDimOverride: { role: "dimension", defaultIdx: 1 },
        phaseDimOverride: { role: "dimension", defaultIdx: 2 },
        treatedDimOverride: { role: "dimension", defaultIdx: 3 },
        observedMeasureOverride: { role: "measure", defaultIdx: 0 },
        counterfactualMeasureOverride: { role: "measure", defaultIdx: 1 },
        ciLowerMeasureOverride: { role: "measure", defaultIdx: 2 },
        ciUpperMeasureOverride: { role: "measure", defaultIdx: 3 },
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
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
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
        newOptions[key].type = "string";
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._searchQuery = "";
      this._selectedCohort = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Preserve Looker element dimensions/margins
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      this._container = document.createElement("div");
      this._container.className = "looker-causal-impact-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      var oldTooltips = document.querySelectorAll(".causal-impact-tooltip");
      for (var i = 0; i < oldTooltips.length; i++) {
        if (oldTooltips[i].parentNode) oldTooltips[i].parentNode.removeChild(oldTooltips[i]);
      }

      this._tooltip = document.createElement("div");
      this._tooltip.className = "causal-impact-tooltip";
      this._tooltip.style.position = "absolute";
      this._tooltip.style.display = "none";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.zIndex = "9999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.22), 0 4px 10px -4px rgba(0,0,0,0.12)";
      this._tooltip.style.fontSize = "12px";
      document.body.appendChild(this._tooltip);

      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        var timer = null;
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastConfig) return;
          var entry = entries[0];
          if (!entry) return;
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) return;
          self._lastWidth = w;
          self._lastHeight = h;
          if (timer) clearTimeout(timer);
          timer = setTimeout(function () {
            self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 140);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (typeof this.clearErrors === "function") {
        try { this.clearErrors(); } catch (e) {}
      }
      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!data || data.length === 0) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned 0 rows. Select a time dimension, observed measure, and counterfactual measure."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var fields = queryResponse ? queryResponse.fields : null;
      var dims = (fields && fields.dimensions && fields.dimensions.length) ? fields.dimensions : ((fields && fields.dimension_like) || []);
      var meas = (fields && fields.measures && fields.measures.length) ? fields.measures : ((fields && fields.measure_like) || []);
      if (!meas.length && fields && fields.table_calculations && fields.table_calculations.length) {
        meas = fields.table_calculations;
      }

      var dateField = config.dateDimOverride ? resolveField(dims, config.dateDimOverride, 0) : findFieldByHints(dims, ["date", "day", "week", "month", "time"], 0);
      var cohortField = config.cohortDimOverride ? resolveField(dims, config.cohortDimOverride, -1) : findFieldByHints(dims, ["market", "cohort", "segment", "region", "experiment"], dims.length > 1 ? 1 : -1);
      var phaseField = config.phaseDimOverride ? resolveField(dims, config.phaseDimOverride, -1) : findFieldByHints(dims, ["phase", "period", "pre_post"], -1);
      var treatedField = config.treatedDimOverride ? resolveField(dims, config.treatedDimOverride, -1) : findFieldByHints(dims, ["treated", "treatment", "is_treated"], -1);

      var obsField = config.observedMeasureOverride ? resolveField(meas, config.observedMeasureOverride, 0) : findFieldByHints(meas, ["observed", "actual", "value", "revenue"], 0);
      var cfField = config.counterfactualMeasureOverride ? resolveField(meas, config.counterfactualMeasureOverride, 1) : findFieldByHints(meas, ["counterfactual", "predicted", "baseline", "synthetic"], 1);
      var ciLowField = config.ciLowerMeasureOverride ? resolveField(meas, config.ciLowerMeasureOverride, -1) : findFieldByHints(meas, ["ci_lower", "lower"], -1);
      var ciHighField = config.ciUpperMeasureOverride ? resolveField(meas, config.ciUpperMeasureOverride, -1) : findFieldByHints(meas, ["ci_upper", "upper"], -1);
      var pointLiftField = findFieldByHints(meas, ["pointwise", "lift"], -1);
      var cumLiftField = findFieldByHints(meas, ["cumulative_lift", "cumulative"], -1);
      var cumLowField = findFieldByHints(meas, ["cumulative_ci_lower"], -1);
      var cumHighField = findFieldByHints(meas, ["cumulative_ci_upper"], -1);
      var weightField = findFieldByHints(meas, ["donor_weight", "weight"], -1);
      var pValField = findFieldByHints(meas, ["p_value", "pval"], -1);
      var rmspeField = findFieldByHints(meas, ["rmspe"], -1);
      var targetMeasField = config.targetMeasureOverride ? resolveField(meas, config.targetMeasureOverride, -1) : null;

      if (!obsField || !cfField) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "Missing Observed or Counterfactual Measure",
              message: "Please include at least 2 numeric measures (Observed Value and Synthetic Counterfactual)."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var suppressZeroNull = config.suppressZeroNull === true;
      var targetMeasureVals = [];
      var cohortMap = {};
      var cohortOrder = [];

      data.forEach(function (row, idx) {
        var obsCell = row[obsField.name];
        var cfCell = row[cfField.name];
        var rawObs = obsCell ? obsCell.value : null;
        var rawCf = cfCell ? cfCell.value : null;

        if (suppressZeroNull && (rawObs === null || rawObs === undefined || rawCf === null || rawCf === undefined || Number(rawObs) === 0)) {
          return;
        }

        var obsVal = rawObs !== null && rawObs !== undefined ? Number(rawObs) : 0;
        var cfVal = rawCf !== null && rawCf !== undefined ? Number(rawCf) : 0;
        if (isNaN(obsVal) || isNaN(cfVal)) return;

        var rawDate = dateField && row[dateField.name] ? row[dateField.name].value : ("T" + (idx + 1));
        var dateObj = parseDateVal(rawDate);
        var dateLabel = rawDate !== null && rawDate !== undefined ? String(rawDate) : ("T" + (idx + 1));

        var cohortName = cohortField && row[cohortField.name] && row[cohortField.name].value !== null
          ? String(row[cohortField.name].value)
          : "Primary Treated Cohort";

        var phaseVal = phaseField && row[phaseField.name] && row[phaseField.name].value !== null
          ? String(row[phaseField.name].value)
          : "";
        var isPost = phaseVal.toLowerCase().indexOf("post") !== -1;

        var isTreated = true;
        if (treatedField && row[treatedField.name]) {
          var tv = row[treatedField.name].value;
          if (tv === false || tv === 0 || tv === "0" || String(tv).toLowerCase() === "no" || String(tv).toLowerCase() === "false") {
            isTreated = false;
          }
        } else if (cohortName.toLowerCase().indexOf("placebo") !== -1 || cohortName.toLowerCase().indexOf("donor") !== -1 || cohortName.toLowerCase().indexOf("control") !== -1) {
          isTreated = false;
        }

        var ciLow = ciLowField && row[ciLowField.name] && row[ciLowField.name].value !== null ? Number(row[ciLowField.name].value) : cfVal * 0.97;
        var ciHigh = ciHighField && row[ciHighField.name] && row[ciHighField.name].value !== null ? Number(row[ciHighField.name].value) : cfVal * 1.03;
        var ptLift = pointLiftField && row[pointLiftField.name] && row[pointLiftField.name].value !== null ? Number(row[pointLiftField.name].value) : (obsVal - cfVal);
        var cumLift = cumLiftField && row[cumLiftField.name] && row[cumLiftField.name].value !== null ? Number(row[cumLiftField.name].value) : null;
        var cumLow = cumLowField && row[cumLowField.name] && row[cumLowField.name].value !== null ? Number(row[cumLowField.name].value) : null;
        var cumHigh = cumHighField && row[cumHighField.name] && row[cumHighField.name].value !== null ? Number(row[cumHighField.name].value) : null;
        var donorWeight = weightField && row[weightField.name] && row[weightField.name].value !== null ? Number(row[weightField.name].value) : 0;
        var causalP = pValField && row[pValField.name] && row[pValField.name].value !== null ? Number(row[pValField.name].value) : null;
        var preRmspe = rmspeField && row[rmspeField.name] && row[rmspeField.name].value !== null ? Number(row[rmspeField.name].value) : null;

        if (targetMeasField && row[targetMeasField.name] && row[targetMeasField.name].value !== null) {
          var tmv = Number(row[targetMeasField.name].value);
          if (!isNaN(tmv)) targetMeasureVals.push(tmv);
        }

        var links = [];
        if (obsCell && obsCell.links && obsCell.links.length) links = obsCell.links;
        else if (dateField && row[dateField.name] && row[dateField.name].links && row[dateField.name].links.length) links = row[dateField.name].links;
        else if (cohortField && row[cohortField.name] && row[cohortField.name].links && row[cohortField.name].links.length) links = row[cohortField.name].links;

        if (!cohortMap[cohortName]) {
          cohortMap[cohortName] = {
            name: cohortName,
            isTreated: isTreated,
            donorWeight: donorWeight,
            causalP: causalP,
            preRmspe: preRmspe,
            points: [],
            links: links
          };
          cohortOrder.push(cohortName);
        }

        cohortMap[cohortName].points.push({
          idx: idx,
          dateLabel: dateLabel,
          dateObj: dateObj,
          isPost: isPost,
          observed: obsVal,
          counterfactual: cfVal,
          ciLow: ciLow,
          ciHigh: ciHigh,
          pointLift: ptLift,
          cumLift: cumLift,
          cumLow: cumLow,
          cumHigh: cumHigh,
          links: links
        });
      });

      // Build cohort summaries + fallback cumulative calculations when query omits precomputed columns
      var cohorts = cohortOrder.map(function (cName) {
        var c = cohortMap[cName];
        c.points.sort(function (a, b) {
          if (a.dateObj && b.dateObj) return a.dateObj.getTime() - b.dateObj.getTime();
          return a.dateLabel.localeCompare(b.dateLabel);
        });

        // If no explicit phase dimension, split at 67% mark
        var hasExplicitPhase = c.points.some(function (p) { return p.isPost; });
        if (!hasExplicitPhase && c.points.length > 3) {
          var splitIdx = Math.floor(c.points.length * 0.67);
          c.points.forEach(function (p, i) { p.isPost = i >= splitIdx; });
        }

        var runCum = 0;
        var runHalfCi = 0;
        var preSqSum = 0;
        var preCount = 0;
        var postSqSum = 0;
        var postObsSum = 0;
        var postCfSum = 0;
        var postCount = 0;
        var interventionIdx = -1;

        c.points.forEach(function (p, i) {
          p.tIdx = i;
          if (p.isPost && interventionIdx === -1) interventionIdx = i;
          if (p.isPost) {
            runCum += p.pointLift;
            var halfW = Math.max(0, (p.ciHigh - p.ciLow) * 0.5);
            runHalfCi += halfW * 0.55;
            postSqSum += p.pointLift * p.pointLift;
            postObsSum += p.observed;
            postCfSum += p.counterfactual;
            postCount++;
          } else {
            preSqSum += p.pointLift * p.pointLift;
            preCount++;
          }
          if (p.cumLift === null) p.cumLift = runCum;
          if (p.cumLow === null) p.cumLow = p.cumLift - runHalfCi;
          if (p.cumHigh === null) p.cumHigh = p.cumLift + runHalfCi;
        });

        var preRmspeCalc = preCount > 0 ? Math.sqrt(preSqSum / preCount) : 1;
        var postRmspeCalc = postCount > 0 ? Math.sqrt(postSqSum / postCount) : 0;
        c.preRmspeComputed = c.preRmspe !== null ? c.preRmspe : preRmspeCalc;
        c.postRmspeComputed = postRmspeCalc;
        c.rmspeRatio = postRmspeCalc / Math.max(1e-6, preRmspeCalc);
        c.interventionIdx = interventionIdx >= 0 ? interventionIdx : Math.floor(c.points.length * 0.67);
        c.postAvgObs = postCount > 0 ? postObsSum / postCount : 0;
        c.postAvgCf = postCount > 0 ? postCfSum / postCount : 0;
        c.postRelLiftPct = postCfSum !== 0 ? ((postObsSum - postCfSum) / Math.abs(postCfSum)) * 100 : 0;
        c.finalCumLift = c.points.length ? c.points[c.points.length - 1].cumLift : 0;
        c.finalCumLow = c.points.length ? c.points[c.points.length - 1].cumLow : 0;
        c.finalCumHigh = c.points.length ? c.points[c.points.length - 1].cumHigh : 0;
        c.avgPostPointLift = postCount > 0 ? (postObsSum - postCfSum) / postCount : 0;
        return c;
      });

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, cohorts, targetMeasureVals, config, queryResponse, done);
      });
    },

    _render: function (d3, cohorts, targetMeasureVals, config, queryResponse, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var layoutMode = config.layoutMode || "stacked_triptych";
      var targetMode = config.targetMode || "fixed_value";
      var fixedTargetValue = config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 15000;
      var referenceLineLabel = config.referenceLineLabel || "Daily Lift Goal";
      var anomalyThresholdPct = config.anomalyThresholdPct !== undefined ? Number(config.anomalyThresholdPct) : 5;
      var sortBy = config.sortBy || "chronological";
      var topNOpt = config.topNLimit || "all";
      var enableOtherRollup = config.enableOtherRollup === true;
      var hudMode = config.hudMode || "scorecard";
      var labelDensity = config.labelDensity || "peaks_only";
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;

      var paletteKey = config.colorPalette || "google_enterprise";
      var baseTheme = paletteKey === "custom_override" ? PALETTES.google_enterprise : (PALETTES[paletteKey] || PALETTES.google_enterprise);
      var theme = Object.assign({}, baseTheme);
      if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
      if (config.customPositiveHex) {
        theme.positive = config.customPositiveHex;
        theme.positiveFill = config.customPositiveHex + "33";
      }
      if (config.customNegativeHex) {
        theme.negative = config.customNegativeHex;
        theme.negativeFill = config.customNegativeHex + "33";
        theme.gate = config.customNegativeHex;
      }

      var metricPolarity = config.metricPolarity || "higher_is_better";
      var fontScale = config.fontScale || "standard";
      var valueFormat = config.valueFormat || "compact_currency";
      var ciOpacity = config.ciOpacity !== undefined ? Math.max(0.05, Math.min(0.5, Number(config.ciOpacity))) : 0.18;
      var showGridLines = config.showGridLines !== false;

      var fSizes = {
        title: fontScale === "compact" ? "12px" : fontScale === "large" ? "16px" : "14px",
        hudVal: fontScale === "compact" ? "12px" : fontScale === "large" ? "17px" : "14px",
        hudLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px",
        axis: fontScale === "compact" ? "9px" : fontScale === "large" ? "12px" : "10px"
      };

      if (!cohorts || cohorts.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:13px;'>No cohort data available after filtering.</div>";
        done();
        return;
      }

      // Search filter across cohorts
      var filteredCohorts = cohorts.slice();
      if (this._searchQuery && this._searchQuery.trim() !== "") {
        var sq = this._searchQuery.trim().toLowerCase();
        var matches = filteredCohorts.filter(function (c) {
          return c.name.toLowerCase().indexOf(sq) !== -1;
        });
        if (matches.length > 0) filteredCohorts = matches;
      }

      // Sort cohorts
      if (sortBy === "lift_desc") {
        filteredCohorts.sort(function (a, b) { return b.finalCumLift - a.finalCumLift; });
      } else if (sortBy === "lift_asc") {
        filteredCohorts.sort(function (a, b) { return a.finalCumLift - b.finalCumLift; });
      } else if (sortBy === "alpha_asc") {
        filteredCohorts.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else {
        filteredCohorts.sort(function (a, b) {
          if (a.isTreated !== b.isTreated) return a.isTreated ? -1 : 1;
          return b.donorWeight - a.donorWeight;
        });
      }

      // Top-N with Other Rollup
      if (topNOpt !== "all") {
        var lim = parseInt(topNOpt, 10);
        if (!isNaN(lim) && lim > 0 && filteredCohorts.length > lim) {
          var head = filteredCohorts.slice(0, lim);
          if (enableOtherRollup) {
            var tail = filteredCohorts.slice(lim);
            var nPts = head[0] ? head[0].points.length : 0;
            var aggPts = [];
            for (var pi = 0; pi < nPts; pi++) {
              var baseP = tail[0].points[pi];
              if (!baseP) continue;
              var obsSum = 0, cfSum = 0, lowSum = 0, highSum = 0, ptSum = 0, cumSum = 0, cLow = 0, cHigh = 0;
              tail.forEach(function (tc) {
                var tp = tc.points[pi];
                if (tp) {
                  obsSum += tp.observed;
                  cfSum += tp.counterfactual;
                  lowSum += tp.ciLow;
                  highSum += tp.ciHigh;
                  ptSum += tp.pointLift;
                  cumSum += tp.cumLift;
                  cLow += tp.cumLow;
                  cHigh += tp.cumHigh;
                }
              });
              aggPts.push({
                tIdx: pi,
                dateLabel: baseP.dateLabel,
                dateObj: baseP.dateObj,
                isPost: baseP.isPost,
                observed: obsSum / tail.length,
                counterfactual: cfSum / tail.length,
                ciLow: lowSum / tail.length,
                ciHigh: highSum / tail.length,
                pointLift: ptSum / tail.length,
                cumLift: cumSum / tail.length,
                cumLow: cLow / tail.length,
                cumHigh: cHigh / tail.length,
                links: []
              });
            }
            head.push({
              name: "Other (" + tail.length + " donors)",
              isTreated: false,
              donorWeight: d3.sum(tail, function (t) { return t.donorWeight; }),
              causalP: d3.mean(tail, function (t) { return t.causalP || 0.5; }),
              preRmspeComputed: d3.mean(tail, function (t) { return t.preRmspeComputed; }),
              postRmspeComputed: d3.mean(tail, function (t) { return t.postRmspeComputed; }),
              rmspeRatio: d3.mean(tail, function (t) { return t.rmspeRatio; }),
              interventionIdx: head[0] ? head[0].interventionIdx : 0,
              postAvgObs: d3.mean(tail, function (t) { return t.postAvgObs; }),
              postAvgCf: d3.mean(tail, function (t) { return t.postAvgCf; }),
              postRelLiftPct: d3.mean(tail, function (t) { return t.postRelLiftPct; }),
              finalCumLift: d3.mean(tail, function (t) { return t.finalCumLift; }),
              finalCumLow: d3.mean(tail, function (t) { return t.finalCumLow; }),
              finalCumHigh: d3.mean(tail, function (t) { return t.finalCumHigh; }),
              avgPostPointLift: d3.mean(tail, function (t) { return t.avgPostPointLift; }),
              points: aggPts,
              links: []
            });
          }
          filteredCohorts = head;
        }
      }

      // Active focus cohort
      var activeCohort = null;
      if (this._selectedCohort) {
        activeCohort = filteredCohorts.find(function (c) { return c.name === self._selectedCohort; }) || null;
      }
      if (!activeCohort) {
        activeCohort = filteredCohorts.find(function (c) { return c.isTreated; }) || filteredCohorts[0];
        this._selectedCohort = activeCohort ? activeCohort.name : null;
      }

      // Compute benchmark daily lift goal
      var postPointLifts = activeCohort.points.filter(function (p) { return p.isPost; }).map(function (p) { return p.pointLift; }).sort(function (a, b) { return a - b; });
      var effectiveTargetVal = null;
      if (targetMode === "fixed_value") {
        effectiveTargetVal = !isNaN(fixedTargetValue) ? fixedTargetValue : null;
      } else if (targetMode === "measure_column") {
        effectiveTargetVal = targetMeasureVals.length ? d3.mean(targetMeasureVals) : fixedTargetValue;
      } else if (targetMode === "dataset_mean" && postPointLifts.length) {
        effectiveTargetVal = d3.mean(postPointLifts);
      } else if (targetMode === "dataset_median" && postPointLifts.length) {
        effectiveTargetVal = d3.quantile(postPointLifts, 0.5);
      } else if (targetMode === "percentile_p75" && postPointLifts.length) {
        effectiveTargetVal = d3.quantile(postPointLifts, 0.75);
      } else if (targetMode === "percentile_p90" && postPointLifts.length) {
        effectiveTargetVal = d3.quantile(postPointLifts, 0.90);
      }

      var hasDrillLinks = filteredCohorts.some(function (c) { return c.links && c.links.length > 0; });

      // Favorable check respecting metricPolarity
      function isFavorable(liftVal) {
        return metricPolarity === "lower_is_better" ? liftVal < 0 : liftVal > 0;
      }

      // Root Flex Container
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var outerFlex = document.createElement("div");
      outerFlex.style.display = "flex";
      outerFlex.style.flexDirection = "column";
      outerFlex.style.width = "100%";
      outerFlex.style.height = "100%";
      outerFlex.style.boxSizing = "border-box";
      outerFlex.style.padding = "10px 14px";
      container.appendChild(outerFlex);

      // Optional Title / Subtitle + Drill Affordance
      if (customTitle || customSubtitle || hasDrillLinks) {
        var hdr = document.createElement("div");
        hdr.style.display = "flex";
        hdr.style.alignItems = "flex-start";
        hdr.style.justifyContent = "space-between";
        hdr.style.gap = "8px";
        hdr.style.marginBottom = "6px";
        hdr.style.flex = "0 0 auto";

        var tCol = document.createElement("div");
        if (customTitle) {
          var tEl = document.createElement("div");
          tEl.style.fontSize = fSizes.title;
          tEl.style.fontWeight = "700";
          tEl.textContent = customTitle;
          tCol.appendChild(tEl);
        }
        if (customSubtitle) {
          var sEl = document.createElement("div");
          sEl.style.fontSize = fSizes.hudLbl;
          sEl.style.color = theme.subtext;
          sEl.style.marginTop = "2px";
          sEl.textContent = customSubtitle;
          tCol.appendChild(sEl);
        }
        hdr.appendChild(tCol);

        if (hasDrillLinks) {
          var dPill = document.createElement("span");
          dPill.style.fontSize = "10px";
          dPill.style.fontWeight = "700";
          dPill.style.padding = "2px 8px";
          dPill.style.borderRadius = "999px";
          dPill.style.border = "1px solid " + theme.cardBorder;
          dPill.style.backgroundColor = theme.cardBg;
          dPill.style.color = theme.subtext;
          dPill.style.whiteSpace = "nowrap";
          dPill.textContent = "\uD83D\uDD0E CLICK DATA TO DRILL";
          hdr.appendChild(dPill);
        }
        outerFlex.appendChild(hdr);
      }

      // Executive Scorecard HUD
      if (hudMode !== "hidden") {
        var relSign = activeCohort.postRelLiftPct >= 0 ? "+" : "";
        var favLift = isFavorable(activeCohort.finalCumLift);
        var liftColor = favLift ? theme.positive : theme.negative;
        var pVal = activeCohort.causalP !== null ? activeCohort.causalP : (1 / Math.max(1, filteredCohorts.length));
        var isSig = (pVal * 100) <= anomalyThresholdPct;

        // Permutation rank p-value across cohorts
        var sortedByRatio = filteredCohorts.slice().sort(function (a, b) { return b.rmspeRatio - a.rmspeRatio; });
        var rankIdx = sortedByRatio.findIndex(function (c) { return c.name === activeCohort.name; }) + 1;

        if (hudMode === "compact_strip") {
          var strip = document.createElement("div");
          strip.style.display = "flex";
          strip.style.flexWrap = "wrap";
          strip.style.alignItems = "center";
          strip.style.justifyContent = "space-between";
          strip.style.gap = "8px";
          strip.style.backgroundColor = theme.cardBg;
          strip.style.border = "1px solid " + theme.cardBorder;
          strip.style.borderRadius = "6px";
          strip.style.padding = "5px 10px";
          strip.style.marginBottom = "6px";
          strip.style.fontSize = fSizes.hudLbl;
          strip.style.fontWeight = "600";
          strip.style.flex = "0 0 auto";

          strip.innerHTML =
            "<span><span style='color:" + theme.subtext + "'>Focus:</span> " + escHtml(activeCohort.name) + "</span>" +
            "<span><span style='color:" + theme.subtext + "'>Cumulative Lift:</span> <span style='color:" + liftColor + "'>" + escHtml(formatSignedVal(activeCohort.finalCumLift, valueFormat)) + " (" + relSign + activeCohort.postRelLiftPct.toFixed(1) + "%)</span></span>" +
            "<span><span style='color:" + theme.subtext + "'>Pre-Fit RMSPE:</span> " + escHtml(formatVal(activeCohort.preRmspeComputed, valueFormat)) + "</span>" +
            "<span><span style='color:" + theme.subtext + "'>Tail p-Val:</span> <span style='color:" + (isSig ? theme.positive : theme.subtext) + "'>" + pVal.toFixed(4) + (isSig ? " (Sig.)" : " (NS)") + "</span></span>";
          outerFlex.appendChild(strip);
        } else {
          var hud = document.createElement("div");
          hud.style.display = "grid";
          hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(140px, 1fr))";
          hud.style.gap = "8px";
          hud.style.marginBottom = "8px";
          hud.style.flex = "0 0 auto";

          var cards = [
            {
              label: "Post Cumulative Lift",
              value: formatSignedVal(activeCohort.finalCumLift, valueFormat) + " (" + relSign + activeCohort.postRelLiftPct.toFixed(1) + "%)",
              sub: "95% CI [" + formatSignedVal(activeCohort.finalCumLow, valueFormat) + ", " + formatSignedVal(activeCohort.finalCumHigh, valueFormat) + "]",
              color: liftColor
            },
            {
              label: "Post Avg: Actual vs Synth",
              value: formatVal(activeCohort.postAvgObs, valueFormat) + " vs " + formatVal(activeCohort.postAvgCf, valueFormat),
              sub: "Avg Daily Delta: " + formatSignedVal(activeCohort.avgPostPointLift, valueFormat),
              color: theme.text
            },
            {
              label: "Pre-Period Fit (RMSPE)",
              value: formatVal(activeCohort.preRmspeComputed, valueFormat),
              sub: "Post/Pre Ratio: " + activeCohort.rmspeRatio.toFixed(1) + "x (Rank " + rankIdx + "/" + filteredCohorts.length + ")",
              color: theme.primary
            },
            {
              label: "Causal Tail Significance",
              value: "p = " + pVal.toFixed(4) + (isSig ? " \u2713 Sig." : " \u2022 NS"),
              sub: "Alpha Gate: \u03b1=" + anomalyThresholdPct + "% | " + (isSig ? "Causal Impact Confirmed" : "Within Noise Band"),
              color: isSig ? theme.positive : theme.negative
            }
          ];

          cards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.backgroundColor = theme.cardBg;
            card.style.border = "1px solid " + theme.cardBorder;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 10px";
            card.style.minWidth = "0";

            var lbl = document.createElement("div");
            lbl.style.fontSize = fSizes.hudLbl;
            lbl.style.fontWeight = "600";
            lbl.style.textTransform = "uppercase";
            lbl.style.letterSpacing = "0.4px";
            lbl.style.color = theme.subtext;
            lbl.style.whiteSpace = "nowrap";
            lbl.style.overflow = "hidden";
            lbl.style.textOverflow = "ellipsis";
            lbl.textContent = c.label;

            var val = document.createElement("div");
            val.style.fontSize = fSizes.hudVal;
            val.style.fontWeight = "700";
            val.style.color = c.color;
            val.style.whiteSpace = "nowrap";
            val.style.overflow = "hidden";
            val.style.textOverflow = "ellipsis";
            val.textContent = c.value;

            var sub = document.createElement("div");
            sub.style.fontSize = "10px";
            sub.style.color = theme.subtext;
            sub.style.whiteSpace = "nowrap";
            sub.style.overflow = "hidden";
            sub.style.textOverflow = "ellipsis";
            sub.textContent = c.sub;

            card.appendChild(lbl);
            card.appendChild(val);
            card.appendChild(sub);
            hud.appendChild(card);
          });
          outerFlex.appendChild(hud);
        }
      }

      // Toolbar: Search + Cohort Pills / Legend
      if (showSearch || showLegend) {
        var toolbar = document.createElement("div");
        toolbar.style.display = "flex";
        toolbar.style.flexWrap = "wrap";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "8px";
        toolbar.style.marginBottom = "6px";
        toolbar.style.flex = "0 0 auto";

        if (showSearch) {
          var sBox = document.createElement("div");
          sBox.style.display = "flex";
          sBox.style.alignItems = "center";
          sBox.style.backgroundColor = theme.cardBg;
          sBox.style.border = "1px solid " + theme.cardBorder;
          sBox.style.borderRadius = "6px";
          sBox.style.padding = "3px 8px";
          sBox.style.minWidth = "175px";

          var sIco = document.createElement("span");
          sIco.innerHTML = "&#128269;";
          sIco.style.fontSize = "11px";
          sIco.style.marginRight = "6px";
          sIco.style.opacity = "0.7";

          var sInp = document.createElement("input");
          sInp.type = "text";
          sInp.placeholder = "Filter cohorts (" + cohorts.length + ")...";
          sInp.value = this._searchQuery || "";
          sInp.style.border = "none";
          sInp.style.outline = "none";
          sInp.style.background = "transparent";
          sInp.style.fontSize = "11px";
          sInp.style.color = theme.text;
          sInp.style.width = "100%";

          sInp.addEventListener("input", function (evt) {
            self._searchQuery = evt.target.value;
            self._render(d3, cohorts, targetMeasureVals, config, queryResponse, function () {});
          });

          sBox.appendChild(sIco);
          sBox.appendChild(sInp);
          toolbar.appendChild(sBox);
        }

        if (showLegend) {
          var leg = document.createElement("div");
          leg.style.display = "flex";
          leg.style.flexWrap = "wrap";
          leg.style.alignItems = "center";
          leg.style.gap = "6px";

          if (filteredCohorts.length > 1) {
            filteredCohorts.forEach(function (c) {
              var isSel = c.name === activeCohort.name;
              var pill = document.createElement("div");
              pill.style.display = "flex";
              pill.style.alignItems = "center";
              pill.style.gap = "4px";
              pill.style.padding = "2px 8px";
              pill.style.borderRadius = "12px";
              pill.style.fontSize = "10.5px";
              pill.style.fontWeight = "600";
              pill.style.cursor = "pointer";
              pill.style.border = "1px solid " + (isSel ? theme.primary : theme.cardBorder);
              pill.style.backgroundColor = isSel ? theme.primary + "18" : theme.cardBg;
              pill.style.color = isSel ? theme.primary : theme.subtext;

              var tag = c.isTreated ? "\u2605 " : "";
              var wt = c.donorWeight > 0 && !c.isTreated ? " (" + c.donorWeight.toFixed(0) + "% wt)" : "";
              pill.textContent = tag + c.name + wt;

              pill.addEventListener("click", function () {
                self._selectedCohort = c.name;
                self._render(d3, cohorts, targetMeasureVals, config, queryResponse, function () {});
              });
              leg.appendChild(pill);
            });
          }

          var legItems = [
            { label: "Observed", color: theme.primary, dash: false },
            { label: "Synthetic Counterfactual", color: theme.counterfactual, dash: true },
            { label: "Intervention Gate", color: theme.gate, dash: true }
          ];
          legItems.forEach(function (li) {
            var item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "4px";
            item.style.fontSize = "10.5px";
            item.style.color = theme.subtext;
            var sw = document.createElement("span");
            sw.style.display = "inline-block";
            sw.style.width = "14px";
            sw.style.height = "0";
            sw.style.borderTop = "2px " + (li.dash ? "dashed" : "solid") + " " + li.color;
            item.appendChild(sw);
            var lb = document.createElement("span");
            lb.textContent = li.label;
            item.appendChild(lb);
            leg.appendChild(item);
          });

          toolbar.appendChild(leg);
        }

        outerFlex.appendChild(toolbar);
      }

      // Main Chart Stage
      var stage = document.createElement("div");
      stage.style.flex = "1 1 0";
      stage.style.minHeight = "0";
      stage.style.position = "relative";
      stage.style.width = "100%";
      stage.style.overflow = "hidden";
      outerFlex.appendChild(stage);

      var rect = stage.getBoundingClientRect();
      var width = Math.max(320, rect.width || stage.clientWidth || 760);
      var height = Math.max(180, rect.height || stage.clientHeight || 420);

      if (layoutMode === "intervention_scorecard") {
        this._renderScorecardMatrix(stage, filteredCohorts, activeCohort, theme, fSizes, valueFormat, anomalyThresholdPct, isFavorable);
        done();
        return;
      }

      if (layoutMode === "placebo_permutation") {
        this._renderPlaceboPermutation(d3, stage, width, height, filteredCohorts, activeCohort, theme, fSizes, valueFormat, showGridLines, labelDensity, isFavorable);
        done();
        return;
      }

      // Stacked Triptych or Focused Counterfactual Overlay
      var pts = activeCohort.points;
      if (!pts || pts.length === 0) {
        done();
        return;
      }

      var margin = { top: 18, right: labelDensity !== "hidden" ? 72 : 22, bottom: 26, left: 62 };
      var plotW = Math.max(120, width - margin.left - margin.right);
      var plotH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var rootG = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var xScale = d3.scaleLinear()
        .domain([0, Math.max(1, pts.length - 1)])
        .range([0, plotW]);

      var gateIdx = Math.max(0, Math.min(pts.length - 1, activeCohort.interventionIdx));
      var gateX = xScale(gateIdx);

      // Helper to render one panel
      var panels = [];
      if (layoutMode === "counterfactual_overlay") {
        panels = [{ id: "original", top: 0, h: plotH, title: "Observed vs. Synthetic Counterfactual (95% Credible Envelope)" }];
      } else {
        var gap = Math.max(16, Math.round(plotH * 0.075));
        var usableH = Math.max(90, plotH - gap * 2);
        var h1 = Math.round(usableH * 0.42);
        var h2 = Math.round(usableH * 0.27);
        var h3 = usableH - h1 - h2;
        panels = [
          { id: "original", top: 0, h: h1, title: "1. Observed vs. Synthetic Counterfactual (Pre-Post Fit)" },
          { id: "pointwise", top: h1 + gap, h: h2, title: "2. Pointwise Causal Lift (\u0394_t = Observed - Counterfactual)" },
          { id: "cumulative", top: h1 + gap + h2 + gap, h: h3, title: "3. Cumulative Incremental Causal Impact" }
        ];
      }

      var crosshairLines = [];

      panels.forEach(function (pn, pIdx) {
        var pg = rootG.append("g").attr("transform", "translate(0," + pn.top + ")");
        var yMin = 0, yMax = 1;

        if (pn.id === "original") {
          yMin = d3.min(pts, function (d) { return Math.min(d.observed, d.counterfactual, d.ciLow); });
          yMax = d3.max(pts, function (d) { return Math.max(d.observed, d.counterfactual, d.ciHigh); });
          var pad1 = (yMax - yMin) * 0.12 || 10;
          yMin = Math.max(0, yMin - pad1);
          yMax = yMax + pad1;
        } else if (pn.id === "pointwise") {
          var absMax2 = d3.max(pts, function (d) {
            var half = (d.ciHigh - d.ciLow) * 0.5;
            return Math.max(Math.abs(d.pointLift) + half * 0.4, Math.abs(effectiveTargetVal || 0));
          }) || 100;
          yMin = -absMax2 * 1.15;
          yMax = absMax2 * 1.15;
        } else {
          yMin = d3.min(pts, function (d) { return Math.min(0, d.cumLift, d.cumLow); });
          yMax = d3.max(pts, function (d) { return Math.max(0, d.cumLift, d.cumHigh); });
          var pad3 = (yMax - yMin) * 0.14 || 10;
          yMin -= pad3 * 0.5;
          yMax += pad3;
        }

        var yScale = d3.scaleLinear().domain([yMin, yMax]).range([pn.h, 0]).nice();

        // Post-intervention soft highlight band
        pg.append("rect")
          .attr("x", gateX)
          .attr("y", 0)
          .attr("width", Math.max(0, plotW - gateX))
          .attr("height", pn.h)
          .attr("fill", theme.primary)
          .attr("fill-opacity", theme.dark ? 0.05 : 0.03)
          .attr("pointer-events", "none");

        if (showGridLines) {
          var yg = pg.append("g")
            .call(d3.axisLeft(yScale).ticks(pn.h > 110 ? 5 : 3).tickSize(-plotW).tickFormat(""));
          yg.selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");
          yg.select(".domain").remove();
        }

        var yAx = pg.append("g")
          .call(d3.axisLeft(yScale).ticks(pn.h > 110 ? 5 : 3).tickFormat(function (v) { return formatVal(v, valueFormat); }));
        yAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axis);
        yAx.selectAll("path, line").attr("stroke", theme.cardBorder);

        // Panel title
        pg.append("text")
          .attr("x", 6)
          .attr("y", -5)
          .attr("fill", theme.subtext)
          .attr("font-size", fSizes.axis)
          .attr("font-weight", "700")
          .text(pn.title);

        if (pn.id === "original") {
          // 95% Credible Interval Ribbon
          var ciArea = d3.area()
            .x(function (d) { return xScale(d.tIdx); })
            .y0(function (d) { return yScale(d.ciLow); })
            .y1(function (d) { return yScale(d.ciHigh); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(pts)
            .attr("d", ciArea)
            .attr("fill", theme.primary)
            .attr("fill-opacity", ciOpacity)
            .attr("pointer-events", "none");

          // Post-period lift fill between observed and counterfactual
          var postPts = pts.slice(gateIdx);
          var posLiftArea = d3.area()
            .x(function (d) { return xScale(d.tIdx); })
            .y0(function (d) { return yScale(d.counterfactual); })
            .y1(function (d) { return yScale(isFavorable(d.pointLift) ? d.observed : d.counterfactual); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(postPts)
            .attr("d", posLiftArea)
            .attr("fill", theme.positiveFill)
            .attr("pointer-events", "none");

          var negLiftArea = d3.area()
            .x(function (d) { return xScale(d.tIdx); })
            .y0(function (d) { return yScale(d.counterfactual); })
            .y1(function (d) { return yScale(!isFavorable(d.pointLift) ? d.observed : d.counterfactual); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(postPts)
            .attr("d", negLiftArea)
            .attr("fill", theme.negativeFill)
            .attr("pointer-events", "none");

          // Counterfactual dashed line
          var cfLine = d3.line()
            .x(function (d) { return xScale(d.tIdx); })
            .y(function (d) { return yScale(d.counterfactual); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(pts)
            .attr("d", cfLine)
            .attr("fill", "none")
            .attr("stroke", theme.counterfactual)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4");

          // Observed solid line
          var obsLine = d3.line()
            .x(function (d) { return xScale(d.tIdx); })
            .y(function (d) { return yScale(d.observed); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(pts)
            .attr("d", obsLine)
            .attr("fill", "none")
            .attr("stroke", theme.primary)
            .attr("stroke-width", 2.5);

          if (labelDensity !== "hidden" && pts.length > 0) {
            var lastP = pts[pts.length - 1];
            pg.append("text")
              .attr("x", xScale(lastP.tIdx) + 5)
              .attr("y", yScale(lastP.observed) + 3)
              .attr("fill", theme.primary)
              .attr("font-size", fSizes.axis)
              .attr("font-weight", "700")
              .text(formatVal(lastP.observed, valueFormat));
            if (labelDensity === "all") {
              pg.append("text")
                .attr("x", xScale(lastP.tIdx) + 5)
                .attr("y", yScale(lastP.counterfactual) + 3)
                .attr("fill", theme.counterfactual)
                .attr("font-size", fSizes.axis)
                .text(formatVal(lastP.counterfactual, valueFormat));
            }
          }
        } else if (pn.id === "pointwise") {
          // Zero line
          pg.append("line")
            .attr("x1", 0).attr("x2", plotW)
            .attr("y1", yScale(0)).attr("y2", yScale(0))
            .attr("stroke", theme.counterfactual)
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "3,3");

          // Target daily lift reference line
          if (targetMode !== "none" && effectiveTargetVal !== null) {
            var ty = yScale(effectiveTargetVal);
            if (ty >= 0 && ty <= pn.h) {
              pg.append("line")
                .attr("x1", gateX).attr("x2", plotW)
                .attr("y1", ty).attr("y2", ty)
                .attr("stroke", theme.target)
                .attr("stroke-width", 1.6)
                .attr("stroke-dasharray", "4,3");
              pg.append("text")
                .attr("x", plotW - 4)
                .attr("y", ty - 4)
                .attr("text-anchor", "end")
                .attr("fill", theme.target)
                .attr("font-size", fSizes.axis)
                .attr("font-weight", "700")
                .text(referenceLineLabel);
            }
          }

          // Diverging bars for pointwise lift
          var barW = Math.max(2, Math.min(10, (plotW / pts.length) * 0.65));
          pg.selectAll(".pt-bar")
            .data(pts)
            .enter()
            .append("rect")
            .attr("x", function (d) { return xScale(d.tIdx) - barW / 2; })
            .attr("y", function (d) { return d.pointLift >= 0 ? yScale(d.pointLift) : yScale(0); })
            .attr("width", barW)
            .attr("height", function (d) { return Math.max(1, Math.abs(yScale(d.pointLift) - yScale(0))); })
            .attr("rx", 1.5)
            .attr("fill", function (d) {
              if (!d.isPost) return theme.placebo;
              return isFavorable(d.pointLift) ? theme.positive : theme.negative;
            })
            .attr("fill-opacity", function (d) { return d.isPost ? 0.85 : 0.45; });
        } else {
          // Cumulative impact
          pg.append("line")
            .attr("x1", 0).attr("x2", plotW)
            .attr("y1", yScale(0)).attr("y2", yScale(0))
            .attr("stroke", theme.counterfactual)
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "3,3");

          var cumArea = d3.area()
            .x(function (d) { return xScale(d.tIdx); })
            .y0(function (d) { return yScale(d.cumLow); })
            .y1(function (d) { return yScale(d.cumHigh); })
            .curve(d3.curveMonotoneX);

          var cumColor = isFavorable(activeCohort.finalCumLift) ? theme.positive : theme.negative;
          pg.append("path")
            .datum(pts)
            .attr("d", cumArea)
            .attr("fill", cumColor)
            .attr("fill-opacity", ciOpacity);

          var cumLine = d3.line()
            .x(function (d) { return xScale(d.tIdx); })
            .y(function (d) { return yScale(d.cumLift); })
            .curve(d3.curveMonotoneX);

          pg.append("path")
            .datum(pts)
            .attr("d", cumLine)
            .attr("fill", "none")
            .attr("stroke", cumColor)
            .attr("stroke-width", 2.5);

          if (labelDensity !== "hidden" && pts.length > 0) {
            var lastC = pts[pts.length - 1];
            pg.append("text")
              .attr("x", xScale(lastC.tIdx) + 5)
              .attr("y", yScale(lastC.cumLift) + 3)
              .attr("fill", cumColor)
              .attr("font-size", fSizes.axis)
              .attr("font-weight", "700")
              .text(formatSignedVal(lastC.cumLift, valueFormat));
          }
        }

        // Intervention Gate vertical line
        pg.append("line")
          .attr("x1", gateX).attr("x2", gateX)
          .attr("y1", 0).attr("y2", pn.h)
          .attr("stroke", theme.gate)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "5,3");

        if (pIdx === 0) {
          var gateDate = pts[gateIdx] ? pts[gateIdx].dateLabel : "Launch";
          pg.append("text")
            .attr("x", gateX > plotW * 0.7 ? gateX - 5 : gateX + 5)
            .attr("y", 12)
            .attr("text-anchor", gateX > plotW * 0.7 ? "end" : "start")
            .attr("fill", theme.gate)
            .attr("font-size", fSizes.axis)
            .attr("font-weight", "700")
            .text("\u26a1 Intervention (" + gateDate + ")");
        }

        // X Axis on bottom panel only
        if (pIdx === panels.length - 1) {
          var tickCount = Math.min(8, pts.length);
          var tickVals = [];
          for (var ti = 0; ti < tickCount; ti++) {
            tickVals.push(Math.round((ti / Math.max(1, tickCount - 1)) * (pts.length - 1)));
          }
          var xAx = pg.append("g")
            .attr("transform", "translate(0," + pn.h + ")")
            .call(d3.axisBottom(xScale).tickValues(tickVals).tickFormat(function (idx) {
              var pt = pts[Math.round(idx)];
              return pt ? pt.dateLabel : "";
            }));
          xAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axis);
          xAx.selectAll("path, line").attr("stroke", theme.cardBorder);
        }

        var ch = pg.append("line")
          .attr("y1", 0).attr("y2", pn.h)
          .attr("stroke", theme.primary)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "2,2")
          .style("display", "none")
          .attr("pointer-events", "none");
        crosshairLines.push(ch);
      });

      // Synchronized overlay for hover crosshair + click drill-down
      rootG.append("rect")
        .attr("width", plotW)
        .attr("height", plotH)
        .attr("fill", "transparent")
        .style("cursor", hasDrillLinks ? "pointer" : "crosshair")
        .on("mousemove", function (evt) {
          var coords = d3.pointer(evt);
          var mx = Math.max(0, Math.min(plotW, coords[0]));
          var idx = Math.round(xScale.invert(mx));
          idx = Math.max(0, Math.min(pts.length - 1, idx));
          var pt = pts[idx];
          if (!pt) return;
          var cx = xScale(idx);
          crosshairLines.forEach(function (ch) {
            ch.attr("x1", cx).attr("x2", cx).style("display", null);
          });
          self._showPointTooltip(evt, pt, activeCohort, theme, valueFormat, isFavorable);
        })
        .on("mouseleave", function () {
          crosshairLines.forEach(function (ch) { ch.style("display", "none"); });
          self._hideTooltip();
        })
        .on("click", function (evt) {
          var coords = d3.pointer(evt);
          var idx = Math.max(0, Math.min(pts.length - 1, Math.round(xScale.invert(coords[0]))));
          var pt = pts[idx];
          var links = (pt && pt.links && pt.links.length) ? pt.links : activeCohort.links;
          if (links && links.length && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: links, event: evt });
          }
        });

      done();
    },

    _renderPlaceboPermutation: function (d3, stage, width, height, cohorts, activeCohort, theme, fSizes, valueFormat, showGridLines, labelDensity, isFavorable) {
      var self = this;
      var splitX = Math.round(width * 0.64);
      var leftW = Math.max(200, splitX - 8);
      var rightW = Math.max(140, width - splitX - 8);

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var mL = { top: 24, right: 20, bottom: 28, left: 60 };
      var pW = Math.max(100, leftW - mL.left - mL.right);
      var pH = Math.max(90, height - mL.top - mL.bottom);
      var gL = svg.append("g").attr("transform", "translate(" + mL.left + "," + mL.top + ")");

      var maxLen = d3.max(cohorts, function (c) { return c.points.length; }) || 1;
      var xScale = d3.scaleLinear().domain([0, Math.max(1, maxLen - 1)]).range([0, pW]);
      var allCums = [];
      cohorts.forEach(function (c) {
        c.points.forEach(function (p) { allCums.push(p.cumLift); });
      });
      var yMin = Math.min(0, d3.min(allCums) || 0);
      var yMax = Math.max(0, d3.max(allCums) || 1);
      var yScale = d3.scaleLinear().domain([yMin * 1.1, yMax * 1.15]).range([pH, 0]).nice();

      if (showGridLines) {
        var yg = gL.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-pW).tickFormat(""));
        yg.selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");
        yg.select(".domain").remove();
      }

      gL.append("text").attr("x", 0).attr("y", -8).attr("fill", theme.subtext).attr("font-size", fSizes.axis).attr("font-weight", "700")
        .text("In-Space Placebo Permutation: Cumulative Lift (Treated vs Donors)");

      var yAx = gL.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(function (v) { return formatSignedVal(v, valueFormat); }));
      yAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axis);
      yAx.selectAll("path, line").attr("stroke", theme.cardBorder);

      var refPts = activeCohort.points;
      var xAx = gL.append("g").attr("transform", "translate(0," + pH + ")")
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (idx) {
          var p = refPts[Math.round(idx)];
          return p ? p.dateLabel : "";
        }));
      xAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axis);
      xAx.selectAll("path, line").attr("stroke", theme.cardBorder);

      gL.append("line").attr("x1", 0).attr("x2", pW).attr("y1", yScale(0)).attr("y2", yScale(0))
        .attr("stroke", theme.counterfactual).attr("stroke-dasharray", "3,3");

      var gateX = xScale(activeCohort.interventionIdx);
      gL.append("line").attr("x1", gateX).attr("x2", gateX).attr("y1", 0).attr("y2", pH)
        .attr("stroke", theme.gate).attr("stroke-width", 1.6).attr("stroke-dasharray", "5,3");

      var lineGen = d3.line()
        .x(function (d) { return xScale(d.tIdx); })
        .y(function (d) { return yScale(d.cumLift); })
        .curve(d3.curveMonotoneX);

      // Draw placebos first, active treated last
      var ordered = cohorts.filter(function (c) { return c.name !== activeCohort.name; }).concat([activeCohort]);
      ordered.forEach(function (c) {
        var isFocus = c.name === activeCohort.name;
        var strokeCol = isFocus ? (isFavorable(c.finalCumLift) ? theme.positive : theme.negative) : theme.placebo;
        gL.append("path")
          .datum(c.points)
          .attr("d", lineGen)
          .attr("fill", "none")
          .attr("stroke", strokeCol)
          .attr("stroke-width", isFocus ? 3 : 1.5)
          .attr("stroke-opacity", isFocus ? 1.0 : 0.5)
          .style("cursor", "pointer")
          .on("click", function (evt) {
            if (c.links && c.links.length && window.LookerCharts && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({ links: c.links, event: evt });
            }
          });
      });

      // Right Panel: Post/Pre RMSPE Ratio Rank Bars
      var mR = { top: 24, right: 34, bottom: 28, left: 105 };
      var rW = Math.max(60, rightW - mR.left - mR.right);
      var rH = pH;
      var gR = svg.append("g").attr("transform", "translate(" + (splitX + mR.left) + "," + mR.top + ")");

      var ranked = cohorts.slice().sort(function (a, b) { return b.rmspeRatio - a.rmspeRatio; });
      var yBand = d3.scaleBand().domain(ranked.map(function (c) { return c.name; })).range([0, rH]).padding(0.28);
      var maxRatio = d3.max(ranked, function (c) { return c.rmspeRatio; }) || 2;
      var xR = d3.scaleLinear().domain([0, maxRatio * 1.15]).range([0, rW]);

      gR.append("text").attr("x", 0).attr("y", -8).attr("fill", theme.subtext).attr("font-size", fSizes.axis).attr("font-weight", "700")
        .text("Post/Pre RMSPE Ratio Rank");

      var yRAx = gR.append("g").call(d3.axisLeft(yBand).tickFormat(function (s) {
        return s.length > 16 ? s.slice(0, 15) + "\u2026" : s;
      }));
      yRAx.selectAll("text").attr("fill", theme.text).attr("font-size", fSizes.axis);
      yRAx.selectAll("path, line").attr("stroke", theme.cardBorder);

      gR.selectAll(".ratio-bar")
        .data(ranked)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function (c) { return yBand(c.name); })
        .attr("width", function (c) { return Math.max(2, xR(c.rmspeRatio)); })
        .attr("height", yBand.bandwidth())
        .attr("rx", 3)
        .attr("fill", function (c) { return c.name === activeCohort.name ? theme.primary : theme.placebo; })
        .style("cursor", "pointer")
        .on("click", function (evt, c) {
          self._selectedCohort = c.name;
          if (c.links && c.links.length && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: c.links, event: evt });
          }
        });

      if (labelDensity !== "hidden") {
        gR.selectAll(".ratio-lbl")
          .data(ranked)
          .enter()
          .append("text")
          .attr("x", function (c) { return xR(c.rmspeRatio) + 4; })
          .attr("y", function (c) { return yBand(c.name) + yBand.bandwidth() / 2 + 3; })
          .attr("fill", theme.text)
          .attr("font-size", fSizes.axis)
          .attr("font-weight", "700")
          .text(function (c) { return c.rmspeRatio.toFixed(1) + "x"; });
      }
    },

    _renderScorecardMatrix: function (stage, cohorts, activeCohort, theme, fSizes, valueFormat, anomalyThresholdPct, isFavorable) {
      var self = this;
      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.height = "100%";
      wrap.style.overflow = "auto";
      wrap.style.border = "1px solid " + theme.cardBorder;
      wrap.style.borderRadius = "8px";
      wrap.style.backgroundColor = theme.bg;
      stage.appendChild(wrap);

      var tbl = document.createElement("table");
      tbl.style.width = "100%";
      tbl.style.borderCollapse = "collapse";
      tbl.style.fontSize = fSizes.axis;

      var headers = ["Cohort / Market", "Role", "Donor Wt", "Pre-Fit RMSPE", "Post Avg Observed", "Post Avg Counterfactual", "Relative Lift", "Cumulative Impact", "Tail p-Val", "Verdict"];
      var thead = document.createElement("thead");
      var hTr = document.createElement("tr");
      hTr.style.backgroundColor = theme.cardBg;
      hTr.style.borderBottom = "1px solid " + theme.cardBorder;
      headers.forEach(function (h, i) {
        var th = document.createElement("th");
        th.style.padding = "8px 10px";
        th.style.textAlign = i <= 1 ? "left" : "right";
        th.style.color = theme.subtext;
        th.style.fontWeight = "700";
        th.style.whiteSpace = "nowrap";
        th.textContent = h;
        hTr.appendChild(th);
      });
      thead.appendChild(hTr);
      tbl.appendChild(thead);

      var tbody = document.createElement("tbody");
      cohorts.forEach(function (c) {
        var tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid " + theme.grid;
        if (c.name === activeCohort.name) {
          tr.style.backgroundColor = theme.primary + "10";
        }
        tr.style.cursor = "pointer";
        tr.addEventListener("click", function (evt) {
          if (c.links && c.links.length && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: c.links, event: evt });
          } else {
            self._selectedCohort = c.name;
          }
        });

        var pVal = c.causalP !== null ? c.causalP : 0.5;
        var sig = (pVal * 100) <= anomalyThresholdPct;
        var fav = isFavorable(c.finalCumLift);
        var verdict = sig ? (fav ? "Significant Gain" : "Significant Regression") : "Null / Placebo";
        var vColor = sig ? (fav ? theme.positive : theme.negative) : theme.subtext;

        var cells = [
          { t: c.name, align: "left", bold: true },
          { t: c.isTreated ? "Treated Unit" : "Donor Placebo", align: "left", color: c.isTreated ? theme.primary : theme.subtext },
          { t: c.isTreated ? "Target" : (c.donorWeight.toFixed(1) + "%"), align: "right" },
          { t: formatVal(c.preRmspeComputed, valueFormat), align: "right" },
          { t: formatVal(c.postAvgObs, valueFormat), align: "right" },
          { t: formatVal(c.postAvgCf, valueFormat), align: "right" },
          { t: (c.postRelLiftPct >= 0 ? "+" : "") + c.postRelLiftPct.toFixed(1) + "%", align: "right", bold: true, color: fav ? theme.positive : theme.negative },
          { t: formatSignedVal(c.finalCumLift, valueFormat), align: "right", bold: true, color: fav ? theme.positive : theme.negative },
          { t: pVal.toFixed(4), align: "right" },
          { t: verdict, align: "right", bold: true, color: vColor }
        ];

        cells.forEach(function (cell) {
          var td = document.createElement("td");
          td.style.padding = "7px 10px";
          td.style.textAlign = cell.align;
          td.style.fontWeight = cell.bold ? "700" : "500";
          td.style.color = cell.color || theme.text;
          td.style.whiteSpace = "nowrap";
          td.textContent = cell.t;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    },

    _showPointTooltip: function (evt, pt, cohort, theme, valueFormat, isFavorable) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var phaseBadge = pt.isPost
        ? "<span style='padding:1px 6px;border-radius:4px;background:" + theme.primary + "22;color:" + theme.primary + ";font-weight:700;font-size:10px;'>POST-INTERVENTION</span>"
        : "<span style='padding:1px 6px;border-radius:4px;background:" + theme.grid + ";color:" + theme.subtext + ";font-weight:700;font-size:10px;'>PRE-PERIOD FIT</span>";

      var ptColor = isFavorable(pt.pointLift) ? theme.positive : theme.negative;
      var cumColor = isFavorable(pt.cumLift) ? theme.positive : theme.negative;

      var html = "<div style='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:5px;border-bottom:1px solid " + theme.grid + ";padding-bottom:4px;'>" +
        "<span style='font-weight:700;font-size:12.5px;'>" + escHtml(pt.dateLabel) + "</span>" + phaseBadge + "</div>";
      html += "<div style='font-size:11px;color:" + theme.subtext + ";margin-bottom:4px;'>Cohort: <b>" + escHtml(cohort.name) + "</b></div>";
      html += "<div style='font-size:11.5px;line-height:1.55;'>";
      html += "<div>Observed: <b style='color:" + theme.primary + ";'>" + escHtml(formatVal(pt.observed, valueFormat)) + "</b></div>";
      html += "<div>Synthetic Counterfactual: <b>" + escHtml(formatVal(pt.counterfactual, valueFormat)) + "</b> <span style='color:" + theme.subtext + ";font-size:10.5px;'>(CI " + escHtml(formatVal(pt.ciLow, valueFormat)) + " – " + escHtml(formatVal(pt.ciHigh, valueFormat)) + ")</span></div>";
      html += "<div>Pointwise Lift (\u0394): <b style='color:" + ptColor + ";'>" + escHtml(formatSignedVal(pt.pointLift, valueFormat)) + "</b></div>";
      if (pt.isPost) {
        html += "<div>Cumulative Impact: <b style='color:" + cumColor + ";'>" + escHtml(formatSignedVal(pt.cumLift, valueFormat)) + "</b></div>";
      }
      html += "</div>";

      tt.innerHTML = html;
      tt.style.display = "block";
      var x = evt.pageX + 14;
      var y = evt.pageY - 28;
      if (x > window.innerWidth - 270) x = evt.pageX - 260;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) this._tooltip.style.display = "none";
    }
  });
})();
