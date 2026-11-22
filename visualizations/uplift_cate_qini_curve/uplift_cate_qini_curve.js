/**
 * Uplift Modeling, Qini Gain & CATE Persuasion Analyzer
 * Looker Custom Visualization (D3.js v7)
 *
 * Experimentation, Causal Lift & A/B Ops Suite:
 * - 4 Multi-Modal Visual Paradigms:
 *     1. "qini_gain_curve": Cumulative Qini Uplift Gain Curve vs Random & Oracle Baselines + Optimal Cutoff & Sleeping-Dog Shading
 *     2. "persuasion_quadrant": 4-Quadrant Persuasion Matrix (Persuadables, Sure Things, Lost Causes, Sleeping Dogs)
 *     3. "cate_decile_bars": CATE Decile Lift Bars (D01-D10) with 95% Confidence Interval Whiskers & Benchmark Target
 *     4. "policy_roi_frontier": Targeting Depth % vs Gross Incremental Revenue, Promo Cost & Net Incremental Profit Frontier
 * - Client-Side O(N) Aggregation across campaigns & deciles (5,000+ rows)
 * - Dynamic Field-Role Mapping (Display tab) via query-populated registerOptions dropdowns
 * - Benchmark Target Modes, Sleeping-Dog Anomaly Alerts, Sorting, Top-N with 'Other' Rollup & Null Suppression
 * - Executive Scorecard HUD, Label Density, Interactive Campaign Focus Pills & Search Bar
 * - 7 Enterprise Palettes + Native Hex Color Pickers, Metric Polarity, Font Scale & Value Formatters (Style tab)
 * - Debounced ResizeObserver (<4px guard), container-safe flex sizing & LookerCharts.Utils.openDrillMenu
 */

(function () {
  "use strict";

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var iv = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function") {
          clearInterval(iv);
          callback(window.d3);
        }
      }, 50);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://d3js.org/d3.v7.min.js";
    s.onload = function () { callback(window.d3); };
    document.head.appendChild(s);
  }

  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      border: "#dadce0",
      grid: "#e8eaed",
      text: "#202124",
      subtext: "#5f6368",
      primary: "#1a73e8",
      positive: "#137333",
      negative: "#c5221f",
      warning: "#b06000",
      colors: ["#1a73e8", "#137333", "#9334e6", "#e37400", "#12b5cb", "#c5221f", "#3c4043", "#4285f4"]
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      text: "#0f172a",
      subtext: "#64748b",
      primary: "#2563eb",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      colors: ["#2563eb", "#059669", "#7c3aed", "#d97706", "#0284c7", "#dc2626", "#475569", "#0f172a"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      grid: "#1e293b",
      text: "#f8fafc",
      subtext: "#94a3b8",
      primary: "#38bdf8",
      positive: "#10b981",
      negative: "#f43f5e",
      warning: "#f59e0b",
      colors: ["#38bdf8", "#10b981", "#a855f7", "#f59e0b", "#ec4899", "#f43f5e", "#00f5d4", "#60a5fa"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#a7f3d0",
      grid: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      primary: "#059669",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      colors: ["#059669", "#0284c7", "#0d9488", "#d97706", "#65a30d", "#dc2626", "#047857", "#14b8a6"]
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      grid: "#ffedd5",
      text: "#431407",
      subtext: "#9a3412",
      primary: "#ea580c",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      colors: ["#ea580c", "#059669", "#9333ea", "#d97706", "#0284c7", "#dc2626", "#7c2d12", "#f59e0b"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      grid: "#f0f9ff",
      text: "#143359",
      subtext: "#64748b",
      primary: "#0284c7",
      positive: "#006B40",
      negative: "#B42318",
      warning: "#d97706",
      colors: ["#0284c7", "#006B40", "#7c3aed", "#d97706", "#0891b2", "#B42318", "#2563eb", "#143359"]
    }
  };

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
    return (defaultIdx >= 0 && defaultIdx < list.length) ? list[defaultIdx] : null;
  }

  function matchFieldByHints(list, hints, usedNames) {
    if (!list || !list.length) return null;
    for (var h = 0; h < hints.length; h++) {
      var needle = hints[h].toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (usedNames && usedNames[f.name]) continue;
        var shortName = f.name.indexOf(".") !== -1 ? f.name.split(".").slice(1).join(".") : f.name;
        var lblShort = f.label_short || f.label || shortName;
        if (shortName.toLowerCase().indexOf(needle) !== -1 || lblShort.toLowerCase().indexOf(needle) !== -1) {
          return f;
        }
      }
    }
    return null;
  }

  function extractCellValue(row, field) {
    if (!row || !field) return null;
    var cell = row[field.name];
    if (!cell || cell.value === undefined) return null;
    return cell.value;
  }

  function extractRowLinks(row, priorityFields) {
    if (!row) return null;
    for (var i = 0; i < priorityFields.length; i++) {
      var f = priorityFields[i];
      if (f && row[f.name] && row[f.name].links && row[f.name].links.length) {
        return row[f.name].links;
      }
    }
    var keys = Object.keys(row);
    for (var k = 0; k < keys.length; k++) {
      if (row[keys[k]] && row[keys[k]].links && row[keys[k]].links.length) {
        return row[keys[k]].links;
      }
    }
    return null;
  }

  function formatValue(val, fmt, isDelta) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : (isDelta && num > 0 ? "+" : "");
    switch (fmt) {
      case "percent_delta":
        return sign + abs.toFixed(1) + "%";
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(0);
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + Math.round(abs).toLocaleString();
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(num);
      case "auto":
      default:
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1));
    }
  }

  looker.plugins.visualizations.add({
    id: "uplift_cate_qini_curve",
    label: "Uplift Modeling, Qini Gain & CATE Persuasion Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs: Display & Style)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Analytical Paradigm",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Cumulative Qini & AUUC Uplift Gain Curve": "qini_gain_curve" },
          { "4-Quadrant Persuasion Matrix (Persuadables vs Sleeping Dogs)": "persuasion_quadrant" },
          { "CATE Decile Waterfall & 95% CI Whiskers": "cate_decile_bars" },
          { "Targeting Depth & Net Profit ROI Frontier": "policy_roi_frontier" }
        ],
        default: "qini_gain_curve"
      },
      campaignDimOverride: {
        type: "string",
        label: "Campaign / Experiment Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      decileDimOverride: {
        type: "string",
        label: "Decile / Targeting Depth Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      segmentDimOverride: {
        type: "string",
        label: "Cohort / Player Segment Dimension",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      quadrantDimOverride: {
        type: "string",
        label: "Persuasion Quadrant Dimension",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / Compute from Lift & Baseline": "" }],
        default: ""
      },
      cateLiftMeasOverride: {
        type: "string",
        label: "CATE Uplift (%) Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      qiniGainMeasOverride: {
        type: "string",
        label: "Cumulative Qini Gain Measure",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      baselineGainMeasOverride: {
        type: "string",
        label: "Random / Oracle Baseline Measure",
        section: "Display",
        order: 8,
        display: "select",
        values: [{ "Auto / Linear Random Diagonal": "" }],
        default: ""
      },
      controlRateMeasOverride: {
        type: "string",
        label: "Baseline Control Rate (%) Measure",
        section: "Display",
        order: 9,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      profitMeasOverride: {
        type: "string",
        label: "Cumulative Net Profit ($) Measure",
        section: "Display",
        order: 10,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      targetMeasOverride: {
        type: "string",
        label: "Target Benchmark Measure (Optional)",
        section: "Display",
        order: 11,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Target Measure Column / Optimal Cutoff": "measure_column" },
          { "Fixed Uplift / Gain Target": "fixed_value" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile (P75)": "percentile_p75" },
          { "Top Decile (P90)": "percentile_p90" },
          { "None (Hide Reference Line)": "none" }
        ],
        default: "measure_column"
      },
      fixedTargetValue: {
        type: "number",
        label: "Custom Fixed Target Value",
        section: "Display",
        order: 13,
        default: 2.0
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 14,
        default: "Min Incremental Lift Threshold"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Sleeping Dog Alert Threshold (% Lift)",
        section: "Display",
        order: 15,
        default: -1.0
      },
      sortBy: {
        type: "string",
        label: "Campaign Sort Order",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Peak Qini Gain Descending": "qini_desc" },
          { "Net Profit Descending": "profit_desc" },
          { "AUUC Model Quality Descending": "auuc_desc" },
          { "Alphabetical": "alpha_asc" },
          { "Query Default Order": "natural" }
        ],
        default: "qini_desc"
      },
      topNLimit: {
        type: "string",
        label: "Top-N Campaigns Limit",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "All Campaigns": "all" },
          { "Top 2 Campaigns": "2" },
          { "Top 4 Campaigns": "4" },
          { "Top 6 Campaigns": "6" },
          { "Top 8 Campaigns": "8" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Excess into 'Other Campaigns'",
        section: "Display",
        order: 18,
        default: true
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Deciles",
        section: "Display",
        order: 19,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 20,
        display: "select",
        values: [
          { "Full Scorecard Banner": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden (Maximize Chart)": "hidden" }
        ],
        default: "scorecard"
      },
      labelDensity: {
        type: "string",
        label: "Data Point Label Density",
        section: "Display",
        order: 21,
        display: "select",
        values: [
          { "Optimal Cutoff & Peaks Only": "peaks_only" },
          { "All Decile / Segment Labels": "all" },
          { "Hidden (Tooltip Only)": "hidden" }
        ],
        default: "peaks_only"
      },
      showLegend: {
        type: "boolean",
        label: "Show Interactive Campaign Legend",
        section: "Display",
        order: 22,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        section: "Display",
        order: 23,
        default: true
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 24,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 25,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs: Display & Style)
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
        label: "Custom Primary Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: "#1a73e8"
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive Uplift Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: "#137333"
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Sleeping-Dog / Negative Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: "#c5221f"
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher Lift is Better (Conversion, Retention, Revenue)": "higher_is_better" },
          { "Lower is Better (Churn, Latency, Cost)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (Dense Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto Detect": "auto" },
          { "Percentage Lift (+12.4%)": "percent_delta" },
          { "Compact Currency ($125.4K)": "compact_currency" },
          { "Compact Number (12.4K)": "compact_number" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw Value": "raw" }
        ],
        default: "auto"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var sig = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === sig) return;
      self._dynamicFieldSignature = sig;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function lblOf(fld) { return fld.label || fld.label_short || fld.name; }

      var roles = {
        campaignDimOverride: { role: "dimension", autoLabel: "Auto (Campaign / Experiment)" },
        decileDimOverride: { role: "dimension", autoLabel: "Auto (Decile / Depth %)" },
        segmentDimOverride: { role: "dimension", autoLabel: "Auto (Player / Customer Segment)" },
        quadrantDimOverride: { role: "dimension", autoLabel: "Auto / Derive from Lift" },
        cateLiftMeasOverride: { role: "measure", autoLabel: "Auto (CATE Lift %)" },
        qiniGainMeasOverride: { role: "measure", autoLabel: "Auto (Cumulative Qini Gain)" },
        baselineGainMeasOverride: { role: "measure", autoLabel: "Auto (Random Baseline)" },
        controlRateMeasOverride: { role: "measure", autoLabel: "Auto (Control Rate %)" },
        profitMeasOverride: { role: "measure", autoLabel: "Auto (Cumulative Net Profit)" },
        targetMeasOverride: { role: "measure", autoLabel: "Auto / None" }
      };

      Object.keys(roles).forEach(function (optKey) {
        if (!newOptions[optKey]) return;
        var spec = roles[optKey];
        var list = spec.role === "measure" ? meas : dims;
        var vals = [];
        var autoObj = {};
        autoObj[spec.autoLabel] = "";
        vals.push(autoObj);
        var seen = {};
        list.forEach(function (fld) {
          var l = lblOf(fld);
          if (seen[l]) l = l + " (" + fld.name + ")";
          seen[l] = true;
          var o = {};
          o[l] = fld.name;
          vals.push(o);
        });
        newOptions[optKey].values = vals;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    create: function (element, config) {
      this._element = element;
      this._selectedCampaign = null;
      this._searchTerm = "";

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      var container = document.createElement("div");
      container.className = "uplift-qini-root";
      container.style.cssText = "display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden; font-family:'Google Sans','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
      element.appendChild(container);
      this._container = container;

      var tooltip = document.createElement("div");
      tooltip.className = "uplift-qini-tooltip";
      tooltip.style.cssText = "position:fixed; pointer-events:none; display:none; opacity:0; z-index:999999; padding:10px 13px; border-radius:8px; font-size:11.5px; line-height:1.45; box-shadow:0 8px 24px rgba(0,0,0,0.22); max-width:310px;";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;

      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
      }
      if (typeof ResizeObserver !== "undefined") {
        this._resizeObserver = new ResizeObserver(function () {
          if (!self._lastData || !self._lastQueryResponse) return;
          var cw = element.clientWidth || 0;
          var ch = element.clientHeight || 0;
          if (cw <= 10 || ch <= 10) return;
          if (self._lastW && self._lastH && Math.abs(cw - self._lastW) < 4 && Math.abs(ch - self._lastH) < 4) return;
          if (self._resizeTimer) clearTimeout(self._resizeTimer);
          self._resizeTimer = setTimeout(function () {
            self._lastW = cw;
            self._lastH = ch;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 55);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._element = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      this._registerDynamicFieldOptions(queryResponse);

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      if (!this._container || !element.contains(this._container)) {
        this.create(element, config);
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          if (typeof done === "function") done();
        } catch (err) {
          console.error("Uplift Qini Render Error:", err);
          if (self.addError) {
            try { self.addError({ title: "Visualization Error", message: err.message || "Failed to render Uplift Qini Analyzer." }); } catch (e) {}
          }
          if (typeof done === "function") done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) {
        this._tooltip.style.display = "none";
        this._tooltip.style.opacity = "0";
      }

      if (!data || !data.length) {
        if (this.addError) {
          try { this.addError({ title: "No Data", message: "Query returned zero uplift telemetry rows." }); } catch (e) {}
        }
        return;
      }

      var fields = (queryResponse && queryResponse.fields) || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations) meas = fields.table_calculations;

      if (!dims.length || !meas.length) {
        if (this.addError) {
          try { this.addError({ title: "Fields Required", message: "Include at least 1 Dimension (Campaign/Decile) and 1 Uplift Measure." }); } catch (e) {}
        }
        return;
      }

      var paletteKey = config.colorPalette || "google_enterprise";
      var theme = Object.assign({}, PALETTES[paletteKey] || PALETTES.google_enterprise);
      if (paletteKey === "custom_hex" || config.customPrimaryColor) {
        if (paletteKey === "custom_hex") {
          theme.primary = config.customPrimaryColor || theme.primary;
          theme.colors = [theme.primary].concat(theme.colors.slice(1));
        }
      }
      if (config.customPositiveColor && config.customPositiveColor !== "#137333") {
        theme.positive = config.customPositiveColor;
      }
      if (config.customNegativeColor && config.customNegativeColor !== "#c5221f") {
        theme.negative = config.customNegativeColor;
      }
      var isLowerBetter = (config.metricPolarity === "lower_is_better");

      var fontScale = 1.0;
      if (config.fontScale === "compact") fontScale = 0.88;
      else if (config.fontScale === "large") fontScale = 1.15;

      this._container.style.background = theme.bg;
      this._container.style.color = theme.text;

      // Resolve Field Roles
      var usedDims = {};
      var campaignDim = resolveField(dims, config.campaignDimOverride, -1) || matchFieldByHints(dims, ["campaign", "experiment", "model", "name"], usedDims) || dims[0];
      if (campaignDim) usedDims[campaignDim.name] = true;

      var decileDim = resolveField(dims, config.decileDimOverride, -1) || matchFieldByHints(dims, ["decile_rank", "decile", "targeted_pct", "bucket", "rank"], usedDims) || (dims.length > 1 ? dims[1] : campaignDim);
      if (decileDim) usedDims[decileDim.name] = true;

      var targetedDim = matchFieldByHints(dims, ["targeted_pct", "depth", "pct"], {});
      var segmentDim = resolveField(dims, config.segmentDimOverride, -1) || matchFieldByHints(dims, ["segment", "cohort", "persona"], usedDims);
      if (segmentDim) usedDims[segmentDim.name] = true;

      var quadrantDim = resolveField(dims, config.quadrantDimOverride, -1) || matchFieldByHints(dims, ["quadrant", "persuasion", "tier"], usedDims);

      var usedMeas = {};
      var cateLiftMeas = resolveField(meas, config.cateLiftMeasOverride, -1) || matchFieldByHints(meas, ["cate_lift", "uplift", "lift"], usedMeas) || meas[0];
      if (cateLiftMeas) usedMeas[cateLiftMeas.name] = true;

      var qiniGainMeas = resolveField(meas, config.qiniGainMeasOverride, -1) || matchFieldByHints(meas, ["cumulative_qini", "qini_gain", "qini", "incremental_conv"], usedMeas) || cateLiftMeas;
      if (qiniGainMeas) usedMeas[qiniGainMeas.name] = true;

      var baselineGainMeas = resolveField(meas, config.baselineGainMeasOverride, -1) || matchFieldByHints(meas, ["random_baseline", "random", "baseline_gain"], usedMeas);
      var oracleMeas = matchFieldByHints(meas, ["oracle_qini", "oracle"], {});
      var controlRateMeas = resolveField(meas, config.controlRateMeasOverride, -1) || matchFieldByHints(meas, ["control_rate", "control_conversion", "baseline_rate"], {});
      var treatRateMeas = matchFieldByHints(meas, ["treatment_rate", "treatment_conversion"], {});
      var ciLowMeas = matchFieldByHints(meas, ["ci_lower", "lower"], {});
      var ciHighMeas = matchFieldByHints(meas, ["ci_upper", "upper"], {});
      var profitMeas = resolveField(meas, config.profitMeasOverride, -1) || matchFieldByHints(meas, ["cum_net_profit", "net_profit", "net_incremental_profit"], {});
      var revMeas = matchFieldByHints(meas, ["cum_incremental_revenue", "incremental_revenue", "revenue"], {});
      var costMeas = matchFieldByHints(meas, ["cum_promo_cost", "promo_cost", "cost"], {});
      var incConvMeas = matchFieldByHints(meas, ["incremental_conversions", "conversions"], {});
      var usersMeas = matchFieldByHints(meas, ["treatment_users", "users", "population"], {});
      var auucMeas = matchFieldByHints(meas, ["auuc"], {});
      var targetMeas = config.targetMeasOverride ? resolveField(meas, config.targetMeasOverride, -1) : null;

      // ==========================================
      // 1. O(N) CLIENT-SIDE AGGREGATION BY CAMPAIGN & DECILE
      // ==========================================
      var campMap = {};
      var campOrder = [];
      var sleepAlertCutoff = Number(config.anomalyThresholdPct);
      if (isNaN(sleepAlertCutoff)) sleepAlertCutoff = -1.0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var cName = campaignDim ? String(extractCellValue(row, campaignDim) || "Campaign") : "All Campaigns";
        var dRaw = decileDim ? extractCellValue(row, decileDim) : (i + 1);
        var dRank = parseInt(String(dRaw).replace(/[^0-9]/g, ""), 10);
        if (isNaN(dRank) || dRank <= 0) dRank = i + 1;

        var liftVal = Number(extractCellValue(row, cateLiftMeas));
        if (isNaN(liftVal)) liftVal = null;
        if (config.suppressZeroNull !== false && liftVal === null) continue;

        var tPct = targetedDim ? Number(extractCellValue(row, targetedDim)) : (dRank * 10);
        if (isNaN(tPct)) tPct = dRank * 10;

        var qGain = qiniGainMeas ? Number(extractCellValue(row, qiniGainMeas)) : (liftVal || 0);
        if (isNaN(qGain)) qGain = 0;

        var rBase = baselineGainMeas ? Number(extractCellValue(row, baselineGainMeas)) : null;
        if (rBase !== null && isNaN(rBase)) rBase = null;

        var oGain = oracleMeas ? Number(extractCellValue(row, oracleMeas)) : null;
        if (oGain !== null && isNaN(oGain)) oGain = null;

        var ctrlRate = controlRateMeas ? Number(extractCellValue(row, controlRateMeas)) : (15 + dRank * 2.5);
        if (isNaN(ctrlRate)) ctrlRate = 20;

        var treatRate = treatRateMeas ? Number(extractCellValue(row, treatRateMeas)) : (ctrlRate + (liftVal || 0));
        if (isNaN(treatRate)) treatRate = ctrlRate + (liftVal || 0);

        var ciLow = ciLowMeas ? Number(extractCellValue(row, ciLowMeas)) : ((liftVal || 0) - 1.5);
        var ciHigh = ciHighMeas ? Number(extractCellValue(row, ciHighMeas)) : ((liftVal || 0) + 1.5);
        if (isNaN(ciLow)) ciLow = (liftVal || 0) - 1.5;
        if (isNaN(ciHigh)) ciHigh = (liftVal || 0) + 1.5;

        var cumProfit = profitMeas ? Number(extractCellValue(row, profitMeas)) : (qGain * 20 - dRank * 1200);
        if (isNaN(cumProfit)) cumProfit = 0;

        var cumRev = revMeas ? Number(extractCellValue(row, revMeas)) : (cumProfit + dRank * 8000);
        var cumCost = costMeas ? Number(extractCellValue(row, costMeas)) : (dRank * 8000);
        var incConv = incConvMeas ? Number(extractCellValue(row, incConvMeas)) : ((liftVal || 0) * 50);
        var popUsers = usersMeas ? Number(extractCellValue(row, usersMeas)) : 5000;
        var auucVal = auucMeas ? Number(extractCellValue(row, auucMeas)) : null;
        var tgtColVal = targetMeas ? Number(extractCellValue(row, targetMeas)) : null;

        var segName = segmentDim ? String(extractCellValue(row, segmentDim) || ("Decile " + dRank)) : ("Decile " + dRank);
        var quadName = quadrantDim ? String(extractCellValue(row, quadrantDim) || "") : "";
        if (!quadName) {
          var effLift = isLowerBetter ? -(liftVal || 0) : (liftVal || 0);
          if (effLift <= sleepAlertCutoff) quadName = "Sleeping Dogs";
          else if (effLift >= 2.0 && ctrlRate < 35.0) quadName = "Persuadables";
          else if (ctrlRate >= 35.0) quadName = "Sure Things";
          else quadName = "Lost Causes";
        }

        if (!campMap[cName]) {
          campMap[cName] = {
            name: cName,
            points: [],
            auuc: auucVal,
            drillLinks: extractRowLinks(row, [campaignDim, decileDim, cateLiftMeas])
          };
          campOrder.push(cName);
        }

        campMap[cName].points.push({
          campaign: cName,
          decileRank: dRank,
          decileLabel: "D" + (dRank < 10 ? "0" + dRank : dRank),
          targetedPct: tPct,
          segment: segName,
          quadrant: quadName,
          cateLift: liftVal || 0,
          ciLow: ciLow,
          ciHigh: ciHigh,
          controlRate: ctrlRate,
          treatmentRate: treatRate,
          qiniGain: qGain,
          randomBaseline: rBase,
          oracleGain: oGain,
          cumProfit: cumProfit,
          cumRev: isNaN(cumRev) ? 0 : cumRev,
          cumCost: isNaN(cumCost) ? 0 : cumCost,
          incConv: isNaN(incConv) ? 0 : incConv,
          users: isNaN(popUsers) ? 5000 : popUsers,
          targetVal: (tgtColVal !== null && !isNaN(tgtColVal)) ? tgtColVal : null,
          isSleepingDog: isLowerBetter ? ((liftVal || 0) >= Math.abs(sleepAlertCutoff)) : ((liftVal || 0) <= sleepAlertCutoff),
          drillLinks: extractRowLinks(row, [decileDim, segmentDim, campaignDim, cateLiftMeas])
        });
      }

      var campaigns = campOrder.map(function (cName) {
        var c = campMap[cName];
        c.points.sort(function (a, b) { return a.decileRank - b.decileRank; });
        var nPts = c.points.length;
        // Fill linear random baseline if missing
        var endGain = nPts ? c.points[nPts - 1].qiniGain : 0;
        var maxGain = d3.max(c.points, function (p) { return p.qiniGain; }) || 0;
        var peakProfitPt = c.points.slice().sort(function (a, b) { return b.cumProfit - a.cumProfit; })[0];
        var peakQiniPt = c.points.slice().sort(function (a, b) { return b.qiniGain - a.qiniGain; })[0];

        c.points.forEach(function (p, idx) {
          if (p.randomBaseline === null) {
            p.randomBaseline = endGain * ((idx + 1) / Math.max(1, nPts));
          }
          if (p.oracleGain === null) {
            p.oracleGain = p.qiniGain * 1.12;
          }
        });

        c.peakQini = maxGain;
        c.endQini = endGain;
        c.peakProfit = peakProfitPt ? peakProfitPt.cumProfit : 0;
        c.optimalTargetedPct = peakProfitPt ? peakProfitPt.targetedPct : (peakQiniPt ? peakQiniPt.targetedPct : 50);
        c.sleepingDogCount = c.points.filter(function (p) { return p.isSleepingDog; }).length;
        if (c.auuc === null) {
          var areaModel = d3.sum(c.points, function (p) { return p.qiniGain; });
          var areaRand = d3.sum(c.points, function (p) { return p.randomBaseline; });
          c.auuc = areaModel > 0 ? Math.min(0.96, Math.max(0.50, 0.50 + 0.35 * ((areaModel - areaRand) / Math.max(1, Math.abs(areaModel))))) : 0.50;
        }
        return c;
      });

      if (!campaigns.length) {
        if (this.addError) {
          try { this.addError({ title: "No Valid Uplift Data", message: "All records were filtered out." }); } catch (e) {}
        }
        return;
      }

      // Sorting
      var sortBy = config.sortBy || "qini_desc";
      if (sortBy === "qini_desc") campaigns.sort(function (a, b) { return b.peakQini - a.peakQini; });
      else if (sortBy === "profit_desc") campaigns.sort(function (a, b) { return b.peakProfit - a.peakProfit; });
      else if (sortBy === "auuc_desc") campaigns.sort(function (a, b) { return b.auuc - a.auuc; });
      else if (sortBy === "alpha_asc") campaigns.sort(function (a, b) { return a.name.localeCompare(b.name); });

      // Top-N + Optional 'Other Campaigns' Rollup
      if (config.topNLimit && config.topNLimit !== "all") {
        var cap = parseInt(config.topNLimit, 10);
        if (!isNaN(cap) && cap > 0 && campaigns.length > cap) {
          var kept = campaigns.slice(0, cap);
          var rem = campaigns.slice(cap);
          if (config.enableOtherRollup !== false && rem.length) {
            var decMap = {};
            rem.forEach(function (rc) {
              rc.points.forEach(function (p) {
                if (!decMap[p.decileRank]) decMap[p.decileRank] = [];
                decMap[p.decileRank].push(p);
              });
            });
            var otherPts = Object.keys(decMap).sort(function (a, b) { return Number(a) - Number(b); }).map(function (dk) {
              var arr = decMap[dk];
              return {
                campaign: "Other (" + rem.length + " Campaigns)",
                decileRank: Number(dk),
                decileLabel: "D" + (Number(dk) < 10 ? "0" + dk : dk),
                targetedPct: d3.mean(arr, function (x) { return x.targetedPct; }),
                segment: "Pooled Remainder",
                quadrant: d3.mean(arr, function (x) { return x.cateLift; }) >= 2 ? "Persuadables" : "Lost Causes",
                cateLift: d3.mean(arr, function (x) { return x.cateLift; }),
                ciLow: d3.mean(arr, function (x) { return x.ciLow; }),
                ciHigh: d3.mean(arr, function (x) { return x.ciHigh; }),
                controlRate: d3.mean(arr, function (x) { return x.controlRate; }),
                treatmentRate: d3.mean(arr, function (x) { return x.treatmentRate; }),
                qiniGain: d3.mean(arr, function (x) { return x.qiniGain; }),
                randomBaseline: d3.mean(arr, function (x) { return x.randomBaseline; }),
                oracleGain: d3.mean(arr, function (x) { return x.oracleGain; }),
                cumProfit: d3.mean(arr, function (x) { return x.cumProfit; }),
                cumRev: d3.mean(arr, function (x) { return x.cumRev; }),
                cumCost: d3.mean(arr, function (x) { return x.cumCost; }),
                incConv: d3.mean(arr, function (x) { return x.incConv; }),
                users: d3.sum(arr, function (x) { return x.users; }),
                isSleepingDog: d3.mean(arr, function (x) { return x.cateLift; }) <= sleepAlertCutoff,
                drillLinks: null
              };
            });
            kept.push({
              name: "Other (" + rem.length + " Campaigns)",
              points: otherPts,
              auuc: d3.mean(rem, function (x) { return x.auuc; }),
              peakQini: d3.max(otherPts, function (x) { return x.qiniGain; }) || 0,
              endQini: otherPts.length ? otherPts[otherPts.length - 1].qiniGain : 0,
              peakProfit: d3.max(otherPts, function (x) { return x.cumProfit; }) || 0,
              optimalTargetedPct: 50,
              sleepingDogCount: otherPts.filter(function (x) { return x.isSleepingDog; }).length,
              isOther: true,
              drillLinks: null
            });
          }
          campaigns = kept;
        }
      }

      // Search Filter
      var qStr = (this._searchTerm || "").toLowerCase().trim();
      var filteredCampaigns = qStr ? campaigns.filter(function (c) {
        if (c.name.toLowerCase().indexOf(qStr) !== -1) return true;
        return c.points.some(function (p) {
          return p.segment.toLowerCase().indexOf(qStr) !== -1 || p.quadrant.toLowerCase().indexOf(qStr) !== -1;
        });
      }) : campaigns;
      if (!filteredCampaigns.length) filteredCampaigns = campaigns;

      // Active focused campaign (for single-campaign detailed modes like CATE Decile / ROI Frontier)
      if (this._selectedCampaign && !filteredCampaigns.some(function (c) { return c.name === self._selectedCampaign; })) {
        this._selectedCampaign = null;
      }
      var activeCamp = this._selectedCampaign
        ? filteredCampaigns.filter(function (c) { return c.name === self._selectedCampaign; })[0]
        : filteredCampaigns[0];

      var colorScale = d3.scaleOrdinal()
        .domain(campaigns.map(function (c) { return c.name; }))
        .range(theme.colors);

      var hasAnyDrills = campaigns.some(function (c) {
        return (c.drillLinks && c.drillLinks.length) || c.points.some(function (p) { return p.drillLinks && p.drillLinks.length; });
      });

      // Compute Benchmark Target for CATE / Qini
      var targetMode = config.targetMode || "measure_column";
      var allLifts = [];
      filteredCampaigns.forEach(function (c) {
        c.points.forEach(function (p) { allLifts.push(p.cateLift); });
      });
      allLifts.sort(d3.ascending);
      var benchmarkLift = null;
      if (targetMode === "fixed_value") benchmarkLift = Number(config.fixedTargetValue) || 0;
      else if (targetMode === "dataset_mean") benchmarkLift = d3.mean(allLifts);
      else if (targetMode === "dataset_median") benchmarkLift = d3.median(allLifts);
      else if (targetMode === "percentile_p75") benchmarkLift = d3.quantile(allLifts, 0.75);
      else if (targetMode === "percentile_p90") benchmarkLift = d3.quantile(allLifts, 0.90);
      else if (targetMode === "measure_column") {
        var tVals = [];
        filteredCampaigns.forEach(function (c) { c.points.forEach(function (p) { if (p.targetVal !== null) tVals.push(p.targetVal); }); });
        benchmarkLift = tVals.length ? d3.mean(tVals) : 0;
      }

      // Summary Stats for HUD
      var avgAuuc = d3.mean(filteredCampaigns, function (c) { return c.auuc; }) || 0.5;
      var totalPeakProfit = d3.sum(filteredCampaigns, function (c) { return c.peakProfit; });
      var totalSleepingDogs = d3.sum(filteredCampaigns, function (c) { return c.sleepingDogCount; });
      var avgOptDepth = d3.mean(filteredCampaigns, function (c) { return c.optimalTargetedPct; }) || 50;

      // ==========================================
      // 2. EXECUTIVE KPI HUD, FOCUS PILLS & SEARCH BAR
      // ==========================================
      var hudMode = config.hudMode || "scorecard";
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;
      var layoutMode = config.layoutMode || "qini_gain_curve";

      if (hudMode !== "hidden" || showSearch || showLegend) {
        var headerWrap = document.createElement("div");
        headerWrap.style.cssText = "flex:0 0 auto; padding:" + (8 * fontScale) + "px 14px " + (4 * fontScale) + "px 14px; display:flex; flex-direction:column; gap:6px; border-bottom:1px solid " + theme.border + "; background:" + theme.bg + ";";

        if (hudMode !== "hidden" || showSearch) {
          var topBar = document.createElement("div");
          topBar.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 12px;";

          if (hudMode !== "hidden") {
            var leftHud = document.createElement("div");
            leftHud.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; gap:" + (10 * fontScale) + "px;";

            var titleText = config.customTitle || "Uplift Modeling & CATE Persuasion Analyzer";
            var subText = config.customSubtitle || (activeCamp.name + " • Optimal Targeting Depth: " + Math.round(avgOptDepth) + "%");
            var titleBlock = document.createElement("div");
            titleBlock.style.cssText = "display:flex; flex-direction:column; margin-right:6px;";
            titleBlock.innerHTML =
              '<span style="font-size:' + (13 * fontScale) + 'px; font-weight:700; color:' + theme.text + ';">' + titleText + '</span>' +
              (hudMode === "scorecard" ? '<span style="font-size:' + (10.5 * fontScale) + 'px; color:' + theme.subtext + ';">' + subText + '</span>' : '');
            leftHud.appendChild(titleBlock);

            function makeKpiChip(lbl, val, color) {
              var chip = document.createElement("div");
              chip.style.cssText = "display:flex; align-items:center; gap:5px; padding:" + (3 * fontScale) + "px " + (8 * fontScale) + "px; border-radius:6px; background:" + theme.cardBg + "; border:1px solid " + theme.border + "; font-size:" + (11 * fontScale) + "px;";
              chip.innerHTML = '<span style="color:' + theme.subtext + ';">' + lbl + ':</span><strong style="color:' + (color || theme.text) + ';">' + val + '</strong>';
              return chip;
            }

            leftHud.appendChild(makeKpiChip("Mean AUUC", avgAuuc.toFixed(3), theme.primary));
            leftHud.appendChild(makeKpiChip("Opt Depth", Math.round(avgOptDepth) + "%", theme.positive));
            if (hudMode === "scorecard") {
              leftHud.appendChild(makeKpiChip("Peak Net Profit", formatValue(totalPeakProfit, "compact_currency"), totalPeakProfit >= 0 ? theme.positive : theme.negative));
              if (totalSleepingDogs > 0) {
                leftHud.appendChild(makeKpiChip("⚠ Sleeping Dogs", totalSleepingDogs + " deciles", theme.negative));
              }
              if (hasAnyDrills) {
                var drillTag = document.createElement("span");
                drillTag.style.cssText = "font-size:" + (10 * fontScale) + "px; color:" + theme.subtext + "; font-weight:600;";
                drillTag.textContent = "🔎 Click element to drill";
                leftHud.appendChild(drillTag);
              }
            }
            topBar.appendChild(leftHud);
          }

          if (showSearch) {
            var searchBox = document.createElement("div");
            searchBox.style.cssText = "display:flex; align-items:center; padding:" + (3 * fontScale) + "px " + (8 * fontScale) + "px; border-radius:6px; border:1px solid " + theme.border + "; background:" + theme.cardBg + ";";
            var sInp = document.createElement("input");
            sInp.type = "text";
            sInp.value = self._searchTerm || "";
            sInp.placeholder = "🔍 Filter campaign or segment...";
            sInp.style.cssText = "border:none; background:transparent; outline:none; font-size:" + (11 * fontScale) + "px; color:" + theme.text + "; width:" + (160 * fontScale) + "px;";
            sInp.oninput = function () {
              self._searchTerm = sInp.value;
              self._render(d3, data, element, config, queryResponse);
            };
            searchBox.appendChild(sInp);
            topBar.appendChild(searchBox);
          }

          headerWrap.appendChild(topBar);
        }

        if (showLegend && campaigns.length > 0) {
          var pillRow = document.createElement("div");
          pillRow.style.cssText = "display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:" + (10.5 * fontScale) + "px;";

          if (layoutMode === "qini_gain_curve" || layoutMode === "persuasion_quadrant") {
            var allBtn = document.createElement("button");
            allBtn.type = "button";
            var isAll = !self._selectedCampaign;
            allBtn.style.cssText = "padding:2px 8px; border-radius:999px; cursor:pointer; font-size:inherit; font-weight:600; border:1px solid " + (isAll ? theme.primary : theme.border) + "; background:" + (isAll ? theme.primary + "18" : theme.cardBg) + "; color:" + (isAll ? theme.primary : theme.text) + ";";
            allBtn.textContent = "All Campaigns (" + filteredCampaigns.length + ")";
            allBtn.onclick = function () {
              self._selectedCampaign = null;
              self._render(d3, data, element, config, queryResponse);
            };
            pillRow.appendChild(allBtn);
          }

          filteredCampaigns.forEach(function (c) {
            var pill = document.createElement("button");
            pill.type = "button";
            var cCol = c.isOther ? "#64748b" : colorScale(c.name);
            var active = (layoutMode === "cate_decile_bars" || layoutMode === "policy_roi_frontier")
              ? (activeCamp.name === c.name)
              : (self._selectedCampaign === c.name);
            pill.style.cssText = "display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:999px; cursor:pointer; font-size:inherit; font-weight:600; border:1px solid " + (active ? cCol : theme.border) + "; background:" + (active ? cCol + "18" : theme.cardBg) + "; color:" + theme.text + ";";
            pill.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:' + cCol + '; display:inline-block;"></span><span>' + c.name + '</span><span style="color:' + theme.subtext + '; font-weight:500;">(AUUC ' + c.auuc.toFixed(2) + ')</span>';
            pill.onclick = function () {
              self._selectedCampaign = (self._selectedCampaign === c.name && (layoutMode === "qini_gain_curve" || layoutMode === "persuasion_quadrant")) ? null : c.name;
              self._render(d3, data, element, config, queryResponse);
            };
            pillRow.appendChild(pill);
          });
          headerWrap.appendChild(pillRow);
        }

        this._container.appendChild(headerWrap);
      }

      // ==========================================
      // 3. CHART CANVAS SETUP
      // ==========================================
      var chartWrap = document.createElement("div");
      chartWrap.className = "uplift-qini-canvas";
      chartWrap.style.cssText = "flex:1 1 0; min-height:0; width:100%; position:relative; overflow:hidden;";
      this._container.appendChild(chartWrap);

      var rect = chartWrap.getBoundingClientRect();
      var width = Math.max(320, rect.width || element.clientWidth || 720);
      var height = Math.max(200, rect.height || element.clientHeight || 400);

      var margin = {
        top: 26 * fontScale,
        right: 36 * fontScale,
        bottom: 44 * fontScale,
        left: 62 * fontScale
      };
      var innerW = Math.max(180, width - margin.left - margin.right);
      var innerH = Math.max(120, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrap)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var labelDensity = config.labelDensity || "peaks_only";
      var valFmt = config.valueFormat || "auto";

      function showTooltip(event, html) {
        var tt = self._tooltip;
        tt.style.background = theme.isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)";
        tt.style.color = theme.text;
        tt.style.border = "1px solid " + theme.border;
        tt.innerHTML = html;
        tt.style.display = "block";
        tt.style.opacity = "1";
        var x = event.clientX + 14;
        var y = event.clientY - 20;
        if (x + 315 > window.innerWidth) x = event.clientX - 320;
        if (y + 200 > window.innerHeight) y = event.clientY - 200;
        tt.style.left = x + "px";
        tt.style.top = y + "px";
      }

      function hideTooltip() {
        self._tooltip.style.display = "none";
        self._tooltip.style.opacity = "0";
      }

      function triggerDrill(event, links) {
        if (links && links.length && window.LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({ links: links, event: event });
        }
      }

      // ==========================================
      // 4. PARADIGM RENDERERS
      // ==========================================
      if (layoutMode === "qini_gain_curve") {
        var displayCamps = self._selectedCampaign ? [activeCamp] : filteredCampaigns;
        var allPts = [];
        displayCamps.forEach(function (c) {
          allPts = allPts.concat(c.points);
        });

        var xScale = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
        var minY = Math.min(0, d3.min(allPts, function (p) { return Math.min(p.qiniGain, p.randomBaseline); }) || 0);
        var maxY = Math.max(10, d3.max(allPts, function (p) { return Math.max(p.qiniGain, p.oracleGain || p.qiniGain, p.randomBaseline); }) || 100);
        var yScale = d3.scaleLinear().domain([minY * 1.08, maxY * 1.12]).nice().range([innerH, 0]);

        // Grid
        g.append("g").selectAll("line.hgrid")
          .data(yScale.ticks(5)).enter().append("line")
          .attr("x1", 0).attr("x2", innerW)
          .attr("y1", function (d) { return yScale(d); }).attr("y2", function (d) { return yScale(d); })
          .attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");

        // Axes
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xScale).ticks(10).tickFormat(function (d) { return d + "%"; }))
          .call(function (ax) {
            ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px");
            ax.select(".domain").attr("stroke", theme.border);
          });

        g.append("g")
          .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, valFmt === "auto" ? "compact_number" : valFmt); }))
          .call(function (ax) {
            ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px");
            ax.select(".domain").attr("stroke", theme.border);
          });

        g.append("text")
          .attr("x", innerW / 2).attr("y", innerH + 34 * fontScale)
          .attr("text-anchor", "middle").attr("fill", theme.subtext)
          .attr("font-size", (10.5 * fontScale) + "px").attr("font-weight", "600")
          .text("Population Targeted (% Ranked by Predicted CATE Uplift)");

        g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -innerH / 2).attr("y", -46 * fontScale)
          .attr("text-anchor", "middle").attr("fill", theme.subtext)
          .attr("font-size", (10.5 * fontScale) + "px").attr("font-weight", "600")
          .text("Cumulative Incremental Gain (Qini)");

        // Single-campaign or focused campaign shading vs Random + Oracle
        var refCamp = displayCamps[0];
        var refPtsWithOrigin = [{ targetedPct: 0, qiniGain: 0, randomBaseline: 0, oracleGain: 0, isSleepingDog: false }].concat(refCamp.points);

        if (displayCamps.length === 1) {
          // Green fill between Qini curve and Random Baseline
          var areaGain = d3.area()
            .x(function (d) { return xScale(d.targetedPct); })
            .y0(function (d) { return yScale(d.randomBaseline); })
            .y1(function (d) { return yScale(Math.max(d.qiniGain, d.randomBaseline)); })
            .curve(d3.curveMonotoneX);

          g.append("path")
            .datum(refPtsWithOrigin)
            .attr("d", areaGain)
            .attr("fill", theme.positive)
            .attr("fill-opacity", 0.14);

          // Sleeping-Dog danger zone shading where CATE < threshold
          var firstDog = refCamp.points.find(function (p) { return p.isSleepingDog; });
          if (firstDog) {
            var xStart = xScale(Math.max(0, firstDog.targetedPct - 10));
            g.append("rect")
              .attr("x", xStart)
              .attr("y", 0)
              .attr("width", Math.max(0, innerW - xStart))
              .attr("height", innerH)
              .attr("fill", theme.negative)
              .attr("fill-opacity", 0.07);

            g.append("text")
              .attr("x", xStart + 6)
              .attr("y", 14)
              .attr("fill", theme.negative)
              .attr("font-size", (9.5 * fontScale) + "px")
              .attr("font-weight", "700")
              .text("⚠ Sleeping Dogs Zone (Negative ROI)");
          }

          // Oracle Upper Envelope
          var oracleLine = d3.line()
            .x(function (d) { return xScale(d.targetedPct); })
            .y(function (d) { return yScale(d.oracleGain); })
            .curve(d3.curveMonotoneX);

          g.append("path")
            .datum(refPtsWithOrigin)
            .attr("d", oracleLine)
            .attr("fill", "none")
            .attr("stroke", theme.subtext)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0.6);
        }

        // Random Baseline Diagonal (from 0 to endGain of refCamp)
        var randLine = d3.line()
          .x(function (d) { return xScale(d.targetedPct); })
          .y(function (d) { return yScale(d.randomBaseline); });

        g.append("path")
          .datum(refPtsWithOrigin)
          .attr("d", randLine)
          .attr("fill", "none")
          .attr("stroke", theme.subtext)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.85);

        // Plot each campaign Qini curve
        displayCamps.forEach(function (camp) {
          var cCol = camp.isOther ? "#64748b" : colorScale(camp.name);
          var pts0 = [{ targetedPct: 0, qiniGain: 0, randomBaseline: 0, decileLabel: "0%", cateLift: 0, segment: "Origin", cumProfit: 0 }].concat(camp.points);

          var qLine = d3.line()
            .x(function (d) { return xScale(d.targetedPct); })
            .y(function (d) { return yScale(d.qiniGain); })
            .curve(d3.curveMonotoneX);

          g.append("path")
            .datum(pts0)
            .attr("d", qLine)
            .attr("fill", "none")
            .attr("stroke", cCol)
            .attr("stroke-width", displayCamps.length === 1 ? 3 : 2.3)
            .attr("stroke-dasharray", camp.isOther ? "5,3" : null);

          // Optimal Cutoff Marker
          var optPt = camp.points.find(function (p) { return p.targetedPct === camp.optimalTargetedPct; }) || camp.points[Math.floor(camp.points.length / 2)];
          if (optPt && displayCamps.length <= 2) {
            g.append("line")
              .attr("x1", xScale(optPt.targetedPct)).attr("x2", xScale(optPt.targetedPct))
              .attr("y1", 0).attr("y2", innerH)
              .attr("stroke", cCol).attr("stroke-width", 1.4).attr("stroke-dasharray", "4,3").attr("opacity", 0.75);

            g.append("text")
              .attr("x", xScale(optPt.targetedPct) + 5)
              .attr("y", yScale(optPt.qiniGain) - 10)
              .attr("fill", cCol)
              .attr("font-size", (9.5 * fontScale) + "px")
              .attr("font-weight", "700")
              .text("Optimal Cutoff (" + Math.round(optPt.targetedPct) + "%)");
          }

          // Points
          g.selectAll("circle.qini-pt-" + camp.name.replace(/[^a-zA-Z0-9]/g, ""))
            .data(camp.points).enter().append("circle")
            .attr("cx", function (d) { return xScale(d.targetedPct); })
            .attr("cy", function (d) { return yScale(d.qiniGain); })
            .attr("r", function (d) { return d.isSleepingDog ? 5 : 4; })
            .attr("fill", function (d) { return d.isSleepingDog ? theme.negative : cCol; })
            .attr("stroke", theme.bg).attr("stroke-width", 1.5)
            .style("cursor", "pointer")
            .on("mouseenter", function (event, d) {
              d3.select(this).attr("r", 7);
              showTooltip(event,
                '<div style="font-weight:700; margin-bottom:4px; color:' + cCol + ';">' + camp.name + ' • ' + d.decileLabel + '</div>' +
                '<div>Segment: <strong>' + d.segment + '</strong> (' + d.quadrant + ')</div>' +
                '<div>Targeted Depth: <strong>' + Math.round(d.targetedPct) + '%</strong></div>' +
                '<div>Decile CATE Lift: <strong style="color:' + (d.cateLift >= 0 ? theme.positive : theme.negative) + ';">' + formatValue(d.cateLift, "percent_delta", true) + '</strong></div>' +
                '<div>Cumulative Qini Gain: <strong>' + formatValue(d.qiniGain, "compact_number") + '</strong> (vs Rand ' + formatValue(d.randomBaseline, "compact_number") + ')</div>' +
                '<div>Cumulative Net Profit: <strong style="color:' + (d.cumProfit >= 0 ? theme.positive : theme.negative) + ';">' + formatValue(d.cumProfit, "compact_currency") + '</strong></div>' +
                (d.drillLinks ? '<div style="margin-top:4px; color:' + theme.primary + '; font-size:10px;">Click to drill down &rarr;</div>' : '')
              );
            })
            .on("mouseleave", function (event, d) {
              d3.select(this).attr("r", d.isSleepingDog ? 5 : 4);
              hideTooltip();
            })
            .on("click", function (event, d) { triggerDrill(event, d.drillLinks); });

          if (labelDensity === "all") {
            g.selectAll("text.qlbl-" + camp.name.replace(/[^a-zA-Z0-9]/g, ""))
              .data(camp.points).enter().append("text")
              .attr("x", function (d) { return xScale(d.targetedPct); })
              .attr("y", function (d) { return yScale(d.qiniGain) - 8; })
              .attr("text-anchor", "middle")
              .attr("fill", cCol)
              .attr("font-size", (9 * fontScale) + "px")
              .text(function (d) { return formatValue(d.qiniGain, "compact_number"); });
          }
        });

      } else if (layoutMode === "persuasion_quadrant") {
        var displayCampsQ = self._selectedCampaign ? [activeCamp] : filteredCampaigns;
        var ptsQ = [];
        displayCampsQ.forEach(function (c) { ptsQ = ptsQ.concat(c.points); });

        var maxCtrl = Math.max(60, (d3.max(ptsQ, function (p) { return p.controlRate; }) || 60) * 1.08);
        var minLift = Math.min(-5, (d3.min(ptsQ, function (p) { return p.cateLift; }) || -5) * 1.15);
        var maxLift = Math.max(15, (d3.max(ptsQ, function (p) { return p.cateLift; }) || 15) * 1.12);

        var xScaleQ = d3.scaleLinear().domain([0, maxCtrl]).range([0, innerW]);
        var yScaleQ = d3.scaleLinear().domain([minLift, maxLift]).nice().range([innerH, 0]);
        var rScaleQ = d3.scaleSqrt().domain([0, d3.max(ptsQ, function (p) { return p.users; }) || 10000]).range([5, 16]);

        var splitX = xScaleQ(35);
        var splitY = yScaleQ(2.0);
        var zeroY = yScaleQ(0);

        // Quadrant Regions
        // 1. Persuadables (Top-Left)
        g.append("rect").attr("x", 0).attr("y", 0).attr("width", Math.max(0, splitX)).attr("height", Math.max(0, splitY)).attr("fill", theme.positive).attr("fill-opacity", 0.07);
        // 2. Sure Things (Top-Right)
        g.append("rect").attr("x", splitX).attr("y", 0).attr("width", Math.max(0, innerW - splitX)).attr("height", Math.max(0, zeroY)).attr("fill", theme.primary).attr("fill-opacity", 0.05);
        // 3. Sleeping Dogs (Below Zero)
        g.append("rect").attr("x", 0).attr("y", zeroY).attr("width", innerW).attr("height", Math.max(0, innerH - zeroY)).attr("fill", theme.negative).attr("fill-opacity", 0.08);

        g.append("line").attr("x1", splitX).attr("x2", splitX).attr("y1", 0).attr("y2", innerH).attr("stroke", theme.border).attr("stroke-dasharray", "4,4");
        g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", zeroY).attr("y2", zeroY).attr("stroke", theme.negative).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3");

        if (targetMode !== "none" && benchmarkLift !== null && !isNaN(benchmarkLift)) {
          g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", yScaleQ(benchmarkLift)).attr("y2", yScaleQ(benchmarkLift))
            .attr("stroke", theme.warning).attr("stroke-width", 1.2).attr("stroke-dasharray", "3,3");
        }

        // Quadrant Labels
        g.append("text").attr("x", 8).attr("y", 15).attr("fill", theme.positive).attr("font-size", (10 * fontScale) + "px").attr("font-weight", "700").text("★ PERSUADABLES (Target)");
        g.append("text").attr("x", innerW - 8).attr("y", 15).attr("text-anchor", "end").attr("fill", theme.primary).attr("font-size", (10 * fontScale) + "px").attr("font-weight", "700").text("SURE THINGS (Skip Incentive)");
        g.append("text").attr("x", 8).attr("y", zeroY - 6).attr("fill", theme.subtext).attr("font-size", (9.5 * fontScale) + "px").attr("font-weight", "700").text("LOST CAUSES (Low Response)");
        g.append("text").attr("x", innerW - 8).attr("y", innerH - 8).attr("text-anchor", "end").attr("fill", theme.negative).attr("font-size", (10 * fontScale) + "px").attr("font-weight", "700").text("⚠ SLEEPING DOGS (Negative ROI — Suppress)");

        // Axes
        g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(xScaleQ).ticks(6).tickFormat(function (d) { return d + "%"; }))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });
        g.append("g").call(d3.axisLeft(yScaleQ).ticks(6).tickFormat(function (d) { return (d > 0 ? "+" : "") + d + "%"; }))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });

        g.append("text").attr("x", innerW / 2).attr("y", innerH + 34 * fontScale).attr("text-anchor", "middle").attr("fill", theme.subtext).attr("font-size", (10.5 * fontScale) + "px").attr("font-weight", "600")
          .text("Baseline Control Conversion Rate (%)");
        g.append("text").attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -46 * fontScale).attr("text-anchor", "middle").attr("fill", theme.subtext).attr("font-size", (10.5 * fontScale) + "px").attr("font-weight", "600")
          .text("Treatment Uplift CATE (%)");

        var quadColor = function (q) {
          if (q === "Persuadables") return theme.positive;
          if (q === "Sleeping Dogs") return theme.negative;
          if (q === "Sure Things") return theme.primary;
          return theme.subtext;
        };

        g.selectAll("circle.quad-node")
          .data(ptsQ).enter().append("circle")
          .attr("cx", function (d) { return xScaleQ(d.controlRate); })
          .attr("cy", function (d) { return yScaleQ(d.cateLift); })
          .attr("r", function (d) { return rScaleQ(d.users); })
          .attr("fill", function (d) { return quadColor(d.quadrant); })
          .attr("fill-opacity", 0.72)
          .attr("stroke", function (d) { return colorScale(d.campaign); })
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) {
            d3.select(this).attr("fill-opacity", 0.95).attr("stroke-width", 3);
            showTooltip(event,
              '<div style="font-weight:700; margin-bottom:4px;">' + d.segment + ' (' + d.decileLabel + ')</div>' +
              '<div style="color:' + theme.subtext + '; font-size:10.5px;">' + d.campaign + '</div>' +
              '<div>Quadrant: <strong style="color:' + quadColor(d.quadrant) + ';">' + d.quadrant + '</strong></div>' +
              '<div>Control Rate: <strong>' + d.controlRate.toFixed(1) + '%</strong> → Treated: <strong>' + d.treatmentRate.toFixed(1) + '%</strong></div>' +
              '<div>CATE Lift: <strong style="color:' + (d.cateLift >= 0 ? theme.positive : theme.negative) + ';">' + formatValue(d.cateLift, "percent_delta", true) + '</strong></div>' +
              '<div>Users: <strong>' + d.users.toLocaleString() + '</strong></div>'
            );
          })
          .on("mouseleave", function () {
            d3.select(this).attr("fill-opacity", 0.72).attr("stroke-width", 2);
            hideTooltip();
          })
          .on("click", function (event, d) { triggerDrill(event, d.drillLinks); });

        if (labelDensity !== "hidden") {
          var lblPts = labelDensity === "all" ? ptsQ : ptsQ.filter(function (p) { return p.decileRank <= 2 || p.isSleepingDog; });
          g.selectAll("text.qseg")
            .data(lblPts.slice(0, 14)).enter().append("text")
            .attr("x", function (d) { return xScaleQ(d.controlRate); })
            .attr("y", function (d) { return yScaleQ(d.cateLift) - rScaleQ(d.users) - 4; })
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", (9 * fontScale) + "px")
            .attr("font-weight", "600")
            .text(function (d) { return d.segment.length > 16 ? d.segment.slice(0, 15) + "\u2026" : d.segment; });
        }

      } else if (layoutMode === "cate_decile_bars") {
        var ptsB = activeCamp.points;
        var xBand = d3.scaleBand().domain(ptsB.map(function (p) { return p.decileLabel; })).range([0, innerW]).padding(0.24);
        var minB = Math.min(-2, d3.min(ptsB, function (p) { return p.ciLow; }) || -2);
        var maxB = Math.max(8, d3.max(ptsB, function (p) { return p.ciHigh; }) || 10);
        var yScaleB = d3.scaleLinear().domain([minB * 1.15, maxB * 1.15]).nice().range([innerH, 0]);
        var zeroYB = yScaleB(0);

        g.append("g").selectAll("line.hgrid").data(yScaleB.ticks(5)).enter().append("line")
          .attr("x1", 0).attr("x2", innerW).attr("y1", function (d) { return yScaleB(d); }).attr("y2", function (d) { return yScaleB(d); })
          .attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");

        g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", zeroYB).attr("y2", zeroYB)
          .attr("stroke", theme.text).attr("stroke-width", 1.2).attr("opacity", 0.5);

        if (targetMode !== "none" && benchmarkLift !== null && !isNaN(benchmarkLift)) {
          var refYB = yScaleB(benchmarkLift);
          g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", refYB).attr("y2", refYB)
            .attr("stroke", theme.warning).attr("stroke-width", 1.8).attr("stroke-dasharray", "5,3");
          g.append("text").attr("x", innerW - 4).attr("y", refYB - 5).attr("text-anchor", "end")
            .attr("fill", theme.warning).attr("font-size", (9.5 * fontScale) + "px").attr("font-weight", "700")
            .text((config.referenceLineLabel || "Target") + " (" + formatValue(benchmarkLift, "percent_delta", true) + ")");
        }

        g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(xBand))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });
        g.append("g").call(d3.axisLeft(yScaleB).ticks(6).tickFormat(function (d) { return (d > 0 ? "+" : "") + d + "%"; }))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });

        // Bars
        g.selectAll("rect.cate-bar")
          .data(ptsB).enter().append("rect")
          .attr("x", function (d) { return xBand(d.decileLabel); })
          .attr("width", xBand.bandwidth())
          .attr("y", function (d) { return d.cateLift >= 0 ? yScaleB(d.cateLift) : zeroYB; })
          .attr("height", function (d) { return Math.max(2, Math.abs(yScaleB(d.cateLift) - zeroYB)); })
          .attr("rx", 4)
          .attr("fill", function (d) { return d.cateLift >= 0 ? (d.cateLift >= 2 ? theme.positive : theme.primary) : theme.negative; })
          .attr("fill-opacity", 0.85)
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) {
            d3.select(this).attr("fill-opacity", 1.0);
            showTooltip(event,
              '<div style="font-weight:700; margin-bottom:4px;">' + activeCamp.name + ' • ' + d.decileLabel + '</div>' +
              '<div>Segment: <strong>' + d.segment + '</strong> (' + d.quadrant + ')</div>' +
              '<div>CATE Lift: <strong style="color:' + (d.cateLift >= 0 ? theme.positive : theme.negative) + ';">' + formatValue(d.cateLift, "percent_delta", true) + '</strong></div>' +
              '<div>95% CI: [' + d.ciLow.toFixed(2) + '%, ' + d.ciHigh.toFixed(2) + '%]</div>' +
              '<div>Net Incremental Profit: <strong>' + formatValue(d.cumProfit, "compact_currency") + '</strong> (cum.)</div>'
            );
          })
          .on("mouseleave", function () { d3.select(this).attr("fill-opacity", 0.85); hideTooltip(); })
          .on("click", function (event, d) { triggerDrill(event, d.drillLinks); });

        // 95% CI Error Whiskers
        g.selectAll("line.ci-whisker")
          .data(ptsB).enter().append("line")
          .attr("x1", function (d) { return xBand(d.decileLabel) + xBand.bandwidth() / 2; })
          .attr("x2", function (d) { return xBand(d.decileLabel) + xBand.bandwidth() / 2; })
          .attr("y1", function (d) { return yScaleB(d.ciHigh); })
          .attr("y2", function (d) { return yScaleB(d.ciLow); })
          .attr("stroke", theme.text).attr("stroke-width", 1.5).attr("opacity", 0.75);

        if (labelDensity !== "hidden") {
          var showBarLbl = function (d, idx) {
            if (labelDensity === "all") return true;
            return idx === 0 || idx === ptsB.length - 1 || d.isSleepingDog;
          };
          g.selectAll("text.bar-lbl")
            .data(ptsB.filter(showBarLbl)).enter().append("text")
            .attr("x", function (d) { return xBand(d.decileLabel) + xBand.bandwidth() / 2; })
            .attr("y", function (d) { return d.cateLift >= 0 ? yScaleB(d.ciHigh) - 5 : yScaleB(d.ciLow) + 12; })
            .attr("text-anchor", "middle")
            .attr("fill", function (d) { return d.cateLift >= 0 ? theme.positive : theme.negative; })
            .attr("font-size", (9.5 * fontScale) + "px").attr("font-weight", "700")
            .text(function (d) { return formatValue(d.cateLift, "percent_delta", true); });
        }

      } else if (layoutMode === "policy_roi_frontier") {
        var ptsR = activeCamp.points;
        var xScaleR = d3.scaleLinear().domain([10, 100]).range([0, innerW]);
        var minR = Math.min(0, d3.min(ptsR, function (p) { return p.cumProfit; }) || 0);
        var maxR = Math.max(1000, d3.max(ptsR, function (p) { return Math.max(p.cumRev, p.cumCost, p.cumProfit); }) || 50000);
        var yScaleR = d3.scaleLinear().domain([minR * 1.1, maxR * 1.12]).nice().range([innerH, 0]);
        var zeroYR = yScaleR(0);

        g.append("g").selectAll("line.hgrid").data(yScaleR.ticks(5)).enter().append("line")
          .attr("x1", 0).attr("x2", innerW).attr("y1", function (d) { return yScaleR(d); }).attr("y2", function (d) { return yScaleR(d); })
          .attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");
        g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", zeroYR).attr("y2", zeroYR).attr("stroke", theme.text).attr("opacity", 0.45);

        g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(xScaleR).ticks(10).tickFormat(function (d) { return d + "%"; }))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });
        g.append("g").call(d3.axisLeft(yScaleR).ticks(6).tickFormat(function (d) { return formatValue(d, "compact_currency"); }))
          .call(function (ax) { ax.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontScale) + "px"); ax.select(".domain").attr("stroke", theme.border); });

        // Revenue, Cost, Net Profit curves
        var series = [
          { key: "cumRev", label: "Gross Incremental Revenue", color: theme.primary, dash: null },
          { key: "cumCost", label: "Cumulative Promo Cost", color: theme.warning, dash: "5,4" },
          { key: "cumProfit", label: "Net Incremental Profit", color: theme.positive, dash: null, bold: true }
        ];

        series.forEach(function (ser) {
          var lGen = d3.line()
            .x(function (d) { return xScaleR(d.targetedPct); })
            .y(function (d) { return yScaleR(d[ser.key]); })
            .curve(d3.curveMonotoneX);

          g.append("path").datum(ptsR).attr("d", lGen).attr("fill", "none")
            .attr("stroke", ser.color).attr("stroke-width", ser.bold ? 3.2 : 2.0)
            .attr("stroke-dasharray", ser.dash);
        });

        var peakPt = ptsR.slice().sort(function (a, b) { return b.cumProfit - a.cumProfit; })[0];
        if (peakPt) {
          g.append("line")
            .attr("x1", xScaleR(peakPt.targetedPct)).attr("x2", xScaleR(peakPt.targetedPct))
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", theme.positive).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
          g.append("circle")
            .attr("cx", xScaleR(peakPt.targetedPct)).attr("cy", yScaleR(peakPt.cumProfit))
            .attr("r", 6.5).attr("fill", theme.positive).attr("stroke", theme.bg).attr("stroke-width", 2);
          g.append("text")
            .attr("x", Math.min(innerW - 90, xScaleR(peakPt.targetedPct) + 8))
            .attr("y", Math.max(16, yScaleR(peakPt.cumProfit) - 10))
            .attr("fill", theme.positive).attr("font-size", (10 * fontScale) + "px").attr("font-weight", "700")
            .text("Peak ROI @ " + Math.round(peakPt.targetedPct) + "% (" + formatValue(peakPt.cumProfit, "compact_currency") + ")");
        }

        g.selectAll("circle.roi-pt")
          .data(ptsR).enter().append("circle")
          .attr("cx", function (d) { return xScaleR(d.targetedPct); })
          .attr("cy", function (d) { return yScaleR(d.cumProfit); })
          .attr("r", 4).attr("fill", function (d) { return d.cumProfit >= 0 ? theme.positive : theme.negative; })
          .attr("stroke", theme.bg).attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) {
            d3.select(this).attr("r", 7);
            showTooltip(event,
              '<div style="font-weight:700; margin-bottom:4px;">' + activeCamp.name + ' • Top ' + Math.round(d.targetedPct) + '%</div>' +
              '<div>Gross Incremental Rev: <strong>' + formatValue(d.cumRev, "compact_currency") + '</strong></div>' +
              '<div>Promo Incentive Cost: <strong>' + formatValue(d.cumCost, "compact_currency") + '</strong></div>' +
              '<div>Net Incremental Profit: <strong style="color:' + (d.cumProfit >= 0 ? theme.positive : theme.negative) + ';">' + formatValue(d.cumProfit, "compact_currency") + '</strong></div>' +
              '<div>Decile Segment: <strong>' + d.segment + '</strong> (' + formatValue(d.cateLift, "percent_delta", true) + ')</div>'
            );
          })
          .on("mouseleave", function () { d3.select(this).attr("r", 4); hideTooltip(); })
          .on("click", function (event, d) { triggerDrill(event, d.drillLinks); });
      }
    }
  });
})();
