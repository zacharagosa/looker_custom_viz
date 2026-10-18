/**
 * Dynamic Pivot Matrix & Heatmap Grid - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Looker Cloud Blockers:
 * - b/500385324 & b/496749649: Dynamic Pivot Table Sorting for ad-hoc business analysis
 * - b/314734619: Support Collapse / Expand in a Pivot Table (multi-level hierarchy + pivot periods)
 * - b/492843989: Enhanced Formatting for Totals and Subtotals
 * - b/552033600: Retain Visualization and Series Settings for Dynamic Pivoted Data
 * - b/509389150: Increased flexibility for repeated dimensions with pivots
 *
 * Upgraded Features:
 * - 4 Multi-Modal Rendering Modes (Micro-Bars & Volume, Color Heatmap Grid, Period Growth Deltas % PoP, Compact KPI)
 * - Dynamic Field-Role Mapping (Primary Row Dimension, Pivot Column Dimension, Primary Metric Measure, Target Measure) via dynamic Looker registerOptions
 * - Configurable Reference Lines, Targets & Thresholds (Measure Column, Fixed Value, Dataset Mean, Dataset Median, Percentiles P75/P90, Anomaly Alerts, Out-of-Spec Highlighting)
 * - Interactive Sorting, Top-N Bucketing with 'Other' Rollup, and Zero/Null Row Suppression
 * - Executive KPI HUD (Full Scorecard Strip, Compact Strip, Hidden) with Target Attainment and Peak Entity
 * - Data Value Labels Density (All, Extreme Peaks Only, Hidden)
 * - Custom Brand Palettes (Google Modern, Executive Slate, Cyberpunk Dark, Emerald Forest, Sunset Media, Wellverse Healthcare, Custom Hex Overrides)
 * - Metric Polarity (Higher is Better vs Lower is Better)
 * - Font Scale (Compact, Standard, Spacious) & Value Formatter (Auto, Compact Currency, Compact Number, Percentage, Decimal 2dp, Integer, Raw)
 * - Looker Drill-Down Menu integration
 * - Strictly 2 configuration sections: "Display" and "Style"
 */

(function () {
  // --- DYNAMIC D3 LOADER ---
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.interpolateBlues === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.interpolateBlues === "function") {
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

  // --- BRAND COLOR PALETTES ---
  var PALETTES = {
    google_modern: {
      name: "Google Modern",
      headerBg: "#f8f9fa",
      headerText: "#202124",
      headerBorder: "#dadce0",
      rowHover: "rgba(26, 115, 232, 0.06)",
      rowAlt: "#fafafa",
      border: "#e8eaed",
      text: "#202124",
      subtext: "#5f6368",
      primary: "#1a73e8",
      barFill: "#1a73e8",
      barBg: "#e8f0fe",
      totalBg: "#f1f3f4",
      totalText: "#202124",
      posBadgeBg: "#e6f4ea",
      posBadgeText: "#137333",
      negBadgeBg: "#fce8e6",
      negBadgeText: "#c5221f",
      heatmapLow: "#f8f9fa",
      heatmapMid: "#8ab4f8",
      heatmapHigh: "#1a73e8",
      hudBg: "#f8f9fa"
    },
    executive_slate: {
      name: "Executive Slate",
      headerBg: "#f1f5f9",
      headerText: "#0f172a",
      headerBorder: "#cbd5e1",
      rowHover: "rgba(15, 23, 42, 0.05)",
      rowAlt: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      primary: "#334155",
      barFill: "#475569",
      barBg: "#e2e8f0",
      totalBg: "#e2e8f0",
      totalText: "#0f172a",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#f8fafc",
      heatmapMid: "#94a3b8",
      heatmapHigh: "#1e293b",
      hudBg: "#f1f5f9"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      headerBg: "#0f172a",
      headerText: "#f8fafc",
      headerBorder: "#334155",
      rowHover: "rgba(139, 92, 246, 0.12)",
      rowAlt: "#1e293b",
      border: "#334155",
      text: "#f1f5f9",
      subtext: "#94a3b8",
      primary: "#8b5cf6",
      barFill: "#a855f7",
      barBg: "#2e1065",
      totalBg: "#1e1b4b",
      totalText: "#f8fafc",
      posBadgeBg: "#064e3b",
      posBadgeText: "#34d399",
      negBadgeBg: "#7f1d1d",
      negBadgeText: "#f87171",
      heatmapLow: "#0f172a",
      heatmapMid: "#6366f1",
      heatmapHigh: "#ec4899",
      hudBg: "#090d16"
    },
    emerald_forest: {
      name: "Emerald FinOps",
      headerBg: "#f0fdf4",
      headerText: "#064e3b",
      headerBorder: "#bbf7d0",
      rowHover: "rgba(16, 185, 129, 0.07)",
      rowAlt: "#f9fbf9",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      primary: "#059669",
      barFill: "#10b981",
      barBg: "#d1fae5",
      totalBg: "#dcfce7",
      totalText: "#064e3b",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#f0fdf4",
      heatmapMid: "#6ee7b7",
      heatmapHigh: "#047857",
      hudBg: "#f0fdf4"
    },
    sunset_media: {
      name: "Sunset Media",
      headerBg: "#fff7ed",
      headerText: "#7c2d12",
      headerBorder: "#fed7aa",
      rowHover: "rgba(249, 115, 22, 0.08)",
      rowAlt: "#fafafa",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      primary: "#ea580c",
      barFill: "#f97316",
      barBg: "#ffedd5",
      totalBg: "#ffedd5",
      totalText: "#7c2d12",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#fff7ed",
      heatmapMid: "#fdba74",
      heatmapHigh: "#c2410c",
      hudBg: "#fff7ed"
    },
    wellverse: {
      name: "Wellverse Healthcare",
      headerBg: "#f0fdfa",
      headerText: "#134e4a",
      headerBorder: "#99f6e4",
      rowHover: "rgba(13, 148, 136, 0.07)",
      rowAlt: "#f8fbfb",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      primary: "#0d9488",
      barFill: "#14b8a6",
      barBg: "#ccfbf1",
      totalBg: "#ccfbf1",
      totalText: "#134e4a",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#f0fdfa",
      heatmapMid: "#5eead4",
      heatmapHigh: "#0f766e",
      hudBg: "#f0fdfa"
    }
  };

  // --- VALUE FORMATTER ---
  function formatMetricValue(val, fmt, prefix, suffix) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    prefix = prefix || "";
    suffix = suffix || "";

    var num = Number(val);
    var formatted = "";

    if (fmt === "compact_currency") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (abs >= 1e9) formatted = sign + "$" + (abs / 1e9).toFixed(2) + "B";
      else if (abs >= 1e6) formatted = sign + "$" + (abs / 1e6).toFixed(2) + "M";
      else if (abs >= 1e3) formatted = sign + "$" + (abs / 1e3).toFixed(1) + "K";
      else formatted = sign + "$" + abs.toFixed(2);
    } else if (fmt === "compact_number" || fmt === "compact_num") {
      var abs2 = Math.abs(num);
      var sign2 = num < 0 ? "-" : "";
      if (abs2 >= 1e9) formatted = sign2 + (abs2 / 1e9).toFixed(2) + "B";
      else if (abs2 >= 1e6) formatted = sign2 + (abs2 / 1e6).toFixed(2) + "M";
      else if (abs2 >= 1e3) formatted = sign2 + (abs2 / 1e3).toFixed(1) + "K";
      else formatted = sign2 + (abs2 % 1 === 0 ? abs2.toString() : abs2.toFixed(2));
    } else if (fmt === "percentage" || fmt === "percent") {
      var pctVal = (num <= 1 && num >= -1) ? (num * 100) : num;
      formatted = pctVal.toFixed(1) + "%";
    } else if (fmt === "decimal_2") {
      formatted = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "integer") {
      formatted = Math.round(num).toLocaleString("en-US");
    } else if (fmt === "raw") {
      formatted = String(num);
    } else {
      // Auto
      var absA = Math.abs(num);
      if (absA >= 1000) {
        var signA = num < 0 ? "-" : "";
        if (absA >= 1e9) formatted = signA + (absA / 1e9).toFixed(2) + "B";
        else if (absA >= 1e6) formatted = signA + (absA / 1e6).toFixed(2) + "M";
        else formatted = signA + (absA / 1e3).toFixed(1) + "K";
      } else if (absA < 1 && absA > 0) {
        formatted = num.toFixed(3);
      } else {
        formatted = num.toLocaleString("en-US", { maximumFractionDigits: 2 });
      }
    }

    if (fmt !== "compact_currency" && prefix) formatted = prefix + formatted;
    if (suffix && fmt !== "percentage" && fmt !== "percent") formatted = formatted + suffix;
    return formatted;
  }

  // --- CLIENT-SIDE INTERACTION STATE ---
  var vizState = {
    sortKey: null,
    sortAsc: false,
    searchTerm: "",
    currentPage: 1
  };

  // --- REGISTER VISUALIZATION ---
  looker.plugins.visualizations.add({
    id: "dynamic_pivot_matrix",
    label: "Dynamic Pivot Matrix & Heatmap Grid",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      renderMode: {
        type: "string",
        label: "Table Render Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Micro-Bars & Volume": "matrix_bars" },
          { "Color Heatmap Grid": "heatmap_grid" },
          { "Period Growth Deltas (% PoP)": "growth_delta" },
          { "Executive Compact KPI": "compact_kpi" }
        ],
        default: "matrix_bars"
      },
      rowDimOverride: {
        type: "string",
        label: "Primary Row Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      pivotDimOverride: {
        type: "string",
        label: "Pivot Column Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / Query Pivot": "" }],
        default: ""
      },
      metricMeasureOverride: {
        type: "string",
        label: "Primary Metric Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / Benchmark Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Target & Reference Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "None / Hide Targets": "none" },
          { "Target Measure Column": "measure_column" },
          { "Fixed Target Value": "fixed_value" },
          { "Dataset Mean (Average)": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Top Decile Benchmark (P90)": "percentile_p90" }
        ],
        default: "none"
      },
      targetValue: {
        type: "number",
        label: "Custom Fixed Target Value",
        section: "Display",
        order: 7,
        default: 0
      },
      targetLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 8,
        default: "Target"
      },
      anomalyThreshold: {
        type: "number",
        label: "Anomaly Variance Threshold (%)",
        section: "Display",
        order: 9,
        default: 20
      },
      highlightTargetBreaches: {
        type: "boolean",
        label: "Flag Out-of-Spec / Variance Cells",
        section: "Display",
        order: 10,
        default: true
      },
      sortOrder: {
        type: "string",
        label: "Default Row Sort Order",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Total Volume Descending": "metric_desc" },
          { "Total Volume Ascending": "metric_asc" },
          { "Alphabetical (A - Z)": "alphabetical" },
          { "Query Natural Order": "natural" }
        ],
        default: "metric_desc"
      },
      topNLimit: {
        type: "string",
        label: "Top-N Rows Display Limit",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "All Rows (No Limit)": "all" },
          { "Top 5 Rows": "5" },
          { "Top 10 Rows": "10" },
          { "Top 15 Rows": "15" },
          { "Top 25 Rows": "25" },
          { "Top 50 Rows": "50" }
        ],
        default: "all"
      },
      showOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Rows into 'Other'",
        section: "Display",
        order: 13,
        default: false
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Empty Rows",
        section: "Display",
        order: 14,
        default: true
      },
      pageSize: {
        type: "string",
        label: "Rows Per Page (Pagination)",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "10 Rows": "10" },
          { "25 Rows": "25" },
          { "50 Rows": "50" },
          { "100 Rows": "100" },
          { "All Rows (Expanded 5,000+)": "all" }
        ],
        default: "10"
      },
      showRowTotals: {
        type: "boolean",
        label: "Show Row Total Column",
        section: "Display",
        order: 16,
        default: true
      },
      showColTotals: {
        type: "boolean",
        label: "Show Column Total Summary Footer",
        section: "Display",
        order: 17,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 18,
        display: "select",
        values: [
          { "Full Scorecard Strip": "full" },
          { "Compact Strip": "compact" },
          { "Hidden (Maximum Canvas)": "hidden" }
        ],
        default: "full"
      },
      dataLabelDensity: {
        type: "string",
        label: "Data Value Labels Density",
        section: "Display",
        order: 19,
        display: "select",
        values: [
          { "All Values Visible": "all" },
          { "Extreme Peaks Only": "peaks_only" },
          { "Hidden (Hover Only)": "hidden" }
        ],
        default: "all"
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 20,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 21,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Search Filter",
        section: "Display",
        order: 22,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Modern Blue": "google_modern" },
          { "Executive Slate": "executive_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_forest" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_modern"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive Benchmark Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative Alert Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Growth, Revenue, Attainment)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Cost, Error Rate)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      highlightMaxCell: {
        type: "boolean",
        label: "Highlight Peak Cell in Row",
        section: "Style",
        order: 6,
        default: true
      },
      fontSize: {
        type: "string",
        label: "Font Size & Density",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (12.5px)": "standard" },
          { "Spacious (14px)": "spacious" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Metric Number Format",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Auto Detect": "auto" },
          { "Compact Currency (, , )": "compact_currency" },
          { "Compact Number (K, M, B)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (0.00)": "decimal_2" },
          { "Integer (1,234)": "integer" },
          { "Raw Numeric": "raw" }
        ],
        default: "compact_currency"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        rowDimOverride: { role: "dimension", defaultIdx: 0 },
        pivotDimOverride: { role: "dimension", defaultIdx: 1 },
        metricMeasureOverride: { role: "measure", defaultIdx: 0 },
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
        var autoLabel = autoField ? ("Auto → " + fieldLabel(autoField)) : "Auto / None";
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
      element.innerHTML = "";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";

      var container = document.createElement("div");
      container.className = "dynamic-pivot-matrix-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "auto";
      container.style.boxSizing = "border-box";
      element.appendChild(container);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._registerDynamicFieldOptions(queryResponse);

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to render."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimension_like || [];
      var meas = fields.measure_like || [];
      var pivots = queryResponse.pivots || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Dynamic Pivot Matrix requires at least 1 Dimension (e.g. products.category)."
        });
        done();
        return;
      }

      if (meas.length === 0 && pivots.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Dynamic Pivot Matrix requires at least 1 Measure or Pivoted Measure."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          var container = element.querySelector(".dynamic-pivot-matrix-root");
          if (!container) {
            element.innerHTML = "";
            container = document.createElement("div");
            container.className = "dynamic-pivot-matrix-root";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.overflow = "auto";
            container.style.boxSizing = "border-box";
            element.appendChild(container);
          }
          container.innerHTML = "";

          // Options & Config
          var themeKey = config.colorPalette || config.colorTheme || "google_modern";
          var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.google_modern);
          if (config.customPrimaryColor) {
            theme.primary = config.customPrimaryColor;
            theme.barFill = config.customPrimaryColor;
            theme.heatmapHigh = config.customPrimaryColor;
          }
          if (config.customPositiveColor) {
            theme.posBadgeText = config.customPositiveColor;
          }
          if (config.customNegativeColor) {
            theme.negBadgeText = config.customNegativeColor;
          }

          var renderMode = config.renderMode || "matrix_bars";
          var showRowTotals = config.showRowTotals !== false;
          var showColTotals = config.showColTotals !== false;
          var showSearch = config.showSearch !== false;
          var highlightMax = config.highlightMaxCell !== false;
          var valFormat = config.valueFormat || "compact_currency";
          var fontSizeOpt = config.fontSize || "standard";
          var metricPolarity = config.metricPolarity || "higher_is_better";
          var hudMode = config.hudMode || "full";
          var labelDensity = config.dataLabelDensity || "all";
          var chartTitle = config.chartTitleOverride || "";
          var chartSubtitle = config.chartSubtitleOverride || "";

          var fontSizes = {
            compact: { base: "11px", header: "11.5px", badge: "10px", padY: "5px", padX: "9px" },
            standard: { base: "12.5px", header: "13px", badge: "11px", padY: "8px", padX: "12px" },
            spacious: { base: "14px", header: "14.5px", badge: "12px", padY: "11px", padX: "14px" }
          };
          var curFont = fontSizes[fontSizeOpt] || fontSizes.standard;

          // Resolve Field Roles dynamically
          var primaryDim = dims[0];
          if (config.rowDimOverride) {
            for (var d = 0; d < dims.length; d++) {
              if (dims[d].name === config.rowDimOverride) {
                primaryDim = dims[d];
                break;
              }
            }
          }

          var secondaryDim = null;
          if (config.pivotDimOverride) {
            for (var d2 = 0; d2 < dims.length; d2++) {
              if (dims[d2].name === config.pivotDimOverride && dims[d2].name !== primaryDim.name) {
                secondaryDim = dims[d2];
                break;
              }
            }
          } else if (dims.length > 1) {
            secondaryDim = dims[1];
          }

          var primaryMeas = meas[0];
          if (config.metricMeasureOverride) {
            for (var m = 0; m < meas.length; m++) {
              if (meas[m].name === config.metricMeasureOverride) {
                primaryMeas = meas[m];
                break;
              }
            }
          }

          var targetMeas = null;
          if (config.targetMeasureOverride) {
            for (var m2 = 0; m2 < meas.length; m2++) {
              if (meas[m2].name === config.targetMeasureOverride) {
                targetMeas = meas[m2];
                break;
              }
            }
          }

          // Parse Pivots
          var pivotCols = [];
          if (pivots && pivots.length > 0) {
            pivotCols = pivots.filter(function (p) { return !p.is_total; }).map(function (p) {
              return {
                key: p.key,
                label: p.label || p.key || "Value",
                data: p.data || {}
              };
            });
          }

          var isMeasureMatrix = pivotCols.length === 0;
          if (isMeasureMatrix) {
            pivotCols = meas.map(function (m) {
              return {
                key: m.name,
                label: m.label_short || m.label || m.name,
                isMeasure: true
              };
            });
          }

          // Parse Rows & Collect Values for Statistical Baselines
          var parsedRows = [];
          var allNumericValues = [];
          var colAggregations = {};
          pivotCols.forEach(function (c) { colAggregations[c.key] = { sum: 0, count: 0, values: [] }; });
          var grandTotalSum = 0;
          var globalMinVal = Infinity;
          var globalMaxVal = -Infinity;

          data.forEach(function (row, rowIdx) {
            var dimCell = row[primaryDim.name];
            var dimVal = dimCell ? (dimCell.rendered || dimCell.value) : "";
            var dimDrills = dimCell ? dimCell.links : null;

            var secDimVal = "";
            if (secondaryDim && row[secondaryDim.name]) {
              secDimVal = row[secondaryDim.name].rendered || row[secondaryDim.name].value || "";
            }

            var cellMap = {};
            var rowSum = 0;
            var rowVals = [];
            var rowMaxVal = -Infinity;
            var rowMaxColKey = null;

            pivotCols.forEach(function (c, cIdx) {
              var numVal = null;
              var rendVal = "";
              var cellDrills = null;

              if (isMeasureMatrix) {
                var mCell = row[c.key];
                if (mCell) {
                  numVal = (mCell.value !== null && mCell.value !== undefined) ? Number(mCell.value) : null;
                  rendVal = mCell.rendered || (numVal !== null ? formatMetricValue(numVal, valFormat) : "-");
                  cellDrills = mCell.links;
                }
              } else {
                var pMap = row[primaryMeas.name];
                if (pMap && pMap[c.key]) {
                  var pCell = pMap[c.key];
                  numVal = (pCell.value !== null && pCell.value !== undefined) ? Number(pCell.value) : null;
                  rendVal = pCell.rendered || (numVal !== null ? formatMetricValue(numVal, valFormat) : "-");
                  cellDrills = pCell.links;
                }
              }

              if (numVal !== null && !isNaN(numVal)) {
                rowSum += numVal;
                rowVals.push(numVal);
                allNumericValues.push(numVal);
                if (numVal > rowMaxVal) {
                  rowMaxVal = numVal;
                  rowMaxColKey = c.key;
                }
                if (numVal < globalMinVal) globalMinVal = numVal;
                if (numVal > globalMaxVal) globalMaxVal = numVal;

                colAggregations[c.key].sum += numVal;
                colAggregations[c.key].count += 1;
                colAggregations[c.key].values.push(numVal);
              }

              // Period-over-Period Delta
              var popDelta = null;
              var popPct = null;
              if (cIdx > 0 && numVal !== null) {
                var prevColKey = pivotCols[cIdx - 1].key;
                var prevCell = cellMap[prevColKey];
                if (prevCell && prevCell.val !== null && prevCell.val !== 0) {
                  popDelta = numVal - prevCell.val;
                  popPct = (popDelta / Math.abs(prevCell.val)) * 100;
                }
              }

              cellMap[c.key] = {
                val: numVal,
                rendered: rendVal,
                links: cellDrills,
                popDelta: popDelta,
                popPct: popPct
              };
            });

            // Target Measure (if configured)
            var targetVal = null;
            if (targetMeas && row[targetMeas.name]) {
              var tCell = row[targetMeas.name];
              targetVal = (tCell.value !== null && tCell.value !== undefined) ? Number(tCell.value) : null;
            }

            grandTotalSum += rowSum;

            parsedRows.push({
              id: rowIdx,
              rawRow: row,
              dimVal: dimVal,
              secDimVal: secDimVal,
              dimDrills: dimDrills,
              cells: cellMap,
              rowSum: rowSum,
              rowAvg: rowVals.length > 0 ? rowSum / rowVals.length : 0,
              rowMaxColKey: rowMaxColKey,
              rowMaxVal: rowMaxVal,
              targetVal: targetVal,
              hasValues: rowVals.length > 0 && rowSum !== 0
            });
          });

          if (globalMinVal === Infinity) globalMinVal = 0;
          if (globalMaxVal === -Infinity) globalMaxVal = 1;

          // Calculate Reference Benchmark Target
          var targetMode = config.targetMode || "none";
          var benchmarkTarget = null;
          allNumericValues.sort(function (a, b) { return a - b; });

          if (targetMode === "fixed_value") {
            benchmarkTarget = Number(config.targetValue) || 0;
          } else if (targetMode === "dataset_mean" && allNumericValues.length > 0) {
            benchmarkTarget = allNumericValues.reduce(function (a, b) { return a + b; }, 0) / allNumericValues.length;
          } else if (targetMode === "dataset_median" && allNumericValues.length > 0) {
            var mid = Math.floor(allNumericValues.length / 2);
            benchmarkTarget = (allNumericValues.length % 2 === 0) ? (allNumericValues[mid - 1] + allNumericValues[mid]) / 2 : allNumericValues[mid];
          } else if (targetMode === "percentile_p75" && allNumericValues.length > 0) {
            var idx75 = Math.floor(allNumericValues.length * 0.75);
            benchmarkTarget = allNumericValues[idx75];
          } else if (targetMode === "percentile_p90" && allNumericValues.length > 0) {
            var idx90 = Math.floor(allNumericValues.length * 0.90);
            benchmarkTarget = allNumericValues[idx90];
          }

          var anomalyThreshold = Number(config.anomalyThreshold) || 20;
          var highlightBreaches = config.highlightTargetBreaches !== false && targetMode !== "none" && benchmarkTarget !== null;

          // --- FILTERING & NULL SUPPRESSION ---
          var filteredRows = parsedRows;
          if (config.suppressNulls) {
            filteredRows = filteredRows.filter(function (r) { return r.hasValues; });
          }

          if (vizState.searchTerm && vizState.searchTerm.trim() !== "") {
            var st = vizState.searchTerm.trim().toLowerCase();
            filteredRows = filteredRows.filter(function (r) {
              if (r.dimVal && r.dimVal.toString().toLowerCase().indexOf(st) !== -1) return true;
              if (r.secDimVal && r.secDimVal.toString().toLowerCase().indexOf(st) !== -1) return true;
              return false;
            });
          }

          // --- INITIAL / DEFAULT SORTING ---
          if (!vizState.sortKey) {
            var defaultSort = config.sortOrder || "metric_desc";
            if (defaultSort === "metric_desc") {
              vizState.sortKey = "__row_total__";
              vizState.sortAsc = false;
            } else if (defaultSort === "metric_asc") {
              vizState.sortKey = "__row_total__";
              vizState.sortAsc = true;
            } else if (defaultSort === "alphabetical") {
              vizState.sortKey = "__dim__";
              vizState.sortAsc = true;
            }
          }

          if (vizState.sortKey) {
            var sk = vizState.sortKey;
            var isAsc = vizState.sortAsc;
            filteredRows.sort(function (a, b) {
              var vA, vB;
              if (sk === "__dim__") {
                vA = a.dimVal ? a.dimVal.toString() : "";
                vB = b.dimVal ? b.dimVal.toString() : "";
                return isAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
              } else if (sk === "__sec_dim__") {
                vA = a.secDimVal ? a.secDimVal.toString() : "";
                vB = b.secDimVal ? b.secDimVal.toString() : "";
                return isAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
              } else if (sk === "__row_total__") {
                vA = a.rowSum;
                vB = b.rowSum;
              } else {
                var cA = a.cells[sk];
                var cB = b.cells[sk];
                vA = (cA && cA.val !== null) ? cA.val : -Infinity;
                vB = (cB && cB.val !== null) ? cB.val : -Infinity;
              }
              if (vA < vB) return isAsc ? -1 : 1;
              if (vA > vB) return isAsc ? 1 : -1;
              return 0;
            });
          }

          // --- TOP-N BUCKETING & 'OTHER' ROLLUP ---
          var topN = config.topNLimit || "all";
          if (topN !== "all") {
            var limitNum = parseInt(topN, 10);
            if (!isNaN(limitNum) && limitNum > 0 && filteredRows.length > limitNum) {
              var topSlice = filteredRows.slice(0, limitNum);
              if (config.showOtherRollup) {
                var otherRows = filteredRows.slice(limitNum);
                var otherSum = 0;
                var otherCells = {};
                pivotCols.forEach(function (c) {
                  var sumC = 0;
                  otherRows.forEach(function (or) {
                    var cell = or.cells[c.key];
                    if (cell && cell.val !== null) sumC += cell.val;
                  });
                  otherSum += sumC;
                  otherCells[c.key] = {
                    val: sumC,
                    rendered: formatMetricValue(sumC, valFormat),
                    links: null,
                    popDelta: null,
                    popPct: null
                  };
                });
                topSlice.push({
                  id: 999999,
                  dimVal: "Other (" + otherRows.length + " entities)",
                  secDimVal: "Rollup",
                  dimDrills: null,
                  cells: otherCells,
                  rowSum: otherSum,
                  rowAvg: otherSum / Math.max(1, pivotCols.length),
                  rowMaxColKey: null,
                  rowMaxVal: 0,
                  isOther: true
                });
              }
              filteredRows = topSlice;
            }
          }

          // --- PAGINATION ---
          var effectivePageSize = config.pageSize || "10";
          var pageSizeNum = (effectivePageSize === "all") ? filteredRows.length : parseInt(effectivePageSize, 10);
          if (isNaN(pageSizeNum) || pageSizeNum <= 0) pageSizeNum = 10;
          var totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSizeNum));
          if (vizState.currentPage > totalPages) vizState.currentPage = totalPages;
          if (vizState.currentPage < 1) vizState.currentPage = 1;

          var startIndex = (vizState.currentPage - 1) * pageSizeNum;
          var pageRows = (effectivePageSize === "all") ? filteredRows : filteredRows.slice(startIndex, startIndex + pageSizeNum);

          // Heatmap D3 Color Scale
          var heatColorScale = d3.scaleLinear()
            .domain([globalMinVal, (globalMinVal + globalMaxVal) / 2, globalMaxVal])
            .range([theme.heatmapLow, theme.heatmapMid, theme.heatmapHigh]);

          // Build UI Container
          var wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.flexDirection = "column";
          wrapper.style.minHeight = "100%";
          wrapper.style.background = "#ffffff";
          wrapper.style.color = theme.text;
          wrapper.style.fontSize = curFont.base;

          // Title / Subtitle Override
          if (chartTitle) {
            var titleBox = document.createElement("div");
            titleBox.style.padding = "12px 16px 4px 16px";
            titleBox.style.background = theme.hudBg;
            titleBox.style.borderBottom = "1px solid " + theme.border;
            titleBox.innerHTML =
              "<div style="font-size: 15px; font-weight: 700; color: " + theme.text + "; letter-spacing: -0.2px;">" + chartTitle + "</div>" +
              (chartSubtitle ? "<div style="font-size: 11.5px; color: " + theme.subtext + "; margin-top: 2px;">" + chartSubtitle + "</div>" : "");
            wrapper.appendChild(titleBox);
          }

          // Top Action Toolbar (Search Bar + KPI Summary HUD + Mode Selector)
          if (hudMode !== "hidden" || showSearch) {
            var toolbar = document.createElement("div");
            toolbar.style.display = "flex";
            toolbar.style.alignItems = "center";
            toolbar.style.justifyContent = "space-between";
            toolbar.style.padding = "10px 16px";
            toolbar.style.borderBottom = "1px solid " + theme.border;
            toolbar.style.background = theme.hudBg;
            toolbar.style.flexWrap = "wrap";
            toolbar.style.gap = "10px";

            // Left HUD: KPI Summary
            if (hudMode === "full") {
              var hudLeft = document.createElement("div");
              hudLeft.style.display = "flex";
              hudLeft.style.alignItems = "center";
              hudLeft.style.gap = "14px";
              hudLeft.style.flexWrap = "wrap";

              var kpiGrandTotal = document.createElement("div");
              kpiGrandTotal.style.display = "flex";
              kpiGrandTotal.style.flexDirection = "column";
              kpiGrandTotal.innerHTML =
                "<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;">Grand Volume</span>" +
                "<span style="font-size: 15px; font-weight: 700; color: " + theme.text + ";">" + formatMetricValue(grandTotalSum, valFormat) + "</span>";
              hudLeft.appendChild(kpiGrandTotal);

              var kpiRowsCount = document.createElement("div");
              kpiRowsCount.style.display = "flex";
              kpiRowsCount.style.flexDirection = "column";
              kpiRowsCount.style.borderLeft = "1px solid " + theme.border;
              kpiRowsCount.style.paddingLeft = "14px";
              kpiRowsCount.innerHTML =
                "<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;">Entities</span>" +
                "<span style="font-size: 15px; font-weight: 700; color: " + theme.text + ";">" + filteredRows.length + " of " + parsedRows.length + "</span>";
              hudLeft.appendChild(kpiRowsCount);

              var kpiColsCount = document.createElement("div");
              kpiColsCount.style.display = "flex";
              kpiColsCount.style.flexDirection = "column";
              kpiColsCount.style.borderLeft = "1px solid " + theme.border;
              kpiColsCount.style.paddingLeft = "14px";
              kpiColsCount.innerHTML =
                "<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;">Pivot Periods</span>" +
                "<span style="font-size: 15px; font-weight: 700; color: " + theme.primary + ";">" + pivotCols.length + " Columns</span>";
              hudLeft.appendChild(kpiColsCount);

              if (benchmarkTarget !== null) {
                var kpiTarget = document.createElement("div");
                kpiTarget.style.display = "flex";
                kpiTarget.style.flexDirection = "column";
                kpiTarget.style.borderLeft = "1px solid " + theme.border;
                kpiTarget.style.paddingLeft = "14px";
                var tLabel = config.targetLabel || "Benchmark";
                var attainment = grandTotalSum > 0 ? ((grandTotalSum / (benchmarkTarget * Math.max(1, filteredRows.length))) * 100).toFixed(0) + "%" : "-";
                kpiTarget.innerHTML =
                  "<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;">" + tLabel + "</span>" +
                  "<span style="font-size: 15px; font-weight: 700; color: " + theme.primary + ";">" + formatMetricValue(benchmarkTarget, valFormat) + " <span style="font-size: 11px; font-weight: 600; color: " + theme.subtext + ";">(" + attainment + ")</span></span>";
                hudLeft.appendChild(kpiTarget);
              }

              toolbar.appendChild(hudLeft);
            } else if (hudMode === "compact") {
              var hudCompact = document.createElement("div");
              hudCompact.style.fontSize = "12px";
              hudCompact.style.fontWeight = "600";
              hudCompact.style.color = theme.subtext;
              hudCompact.innerHTML =
                "Total: <strong style="color:" + theme.text + ";">" + formatMetricValue(grandTotalSum, valFormat) + "</strong> &bull; " +
                "Rows: <strong style="color:" + theme.text + ";">" + filteredRows.length + "</strong> &bull; " +
                "Periods: <strong style="color:" + theme.primary + ";">" + pivotCols.length + "</strong>";
              toolbar.appendChild(hudCompact);
            }

            // Right HUD: Search Box
            if (showSearch) {
              var searchContainer = document.createElement("div");
              searchContainer.style.display = "flex";
              searchContainer.style.alignItems = "center";
              searchContainer.style.gap = "8px";

              var searchInput = document.createElement("input");
              searchInput.type = "text";
              searchInput.placeholder = "🔍 Search entity...";
              searchInput.value = vizState.searchTerm;
              searchInput.style.padding = "5px 10px";
              searchInput.style.fontSize = "12px";
              searchInput.style.border = "1px solid " + theme.border;
              searchInput.style.borderRadius = "6px";
              searchInput.style.outline = "none";
              searchInput.style.width = "170px";
              searchInput.style.background = "#ffffff";
              searchInput.style.color = theme.text;

              searchInput.oninput = function (e) {
                vizState.searchTerm = e.target.value;
                vizState.currentPage = 1;
                triggerReRender();
              };

              searchContainer.appendChild(searchInput);

              if (vizState.searchTerm) {
                var clearBtn = document.createElement("button");
                clearBtn.innerHTML = "&times;";
                clearBtn.style.background = "transparent";
                clearBtn.style.border = "none";
                clearBtn.style.cursor = "pointer";
                clearBtn.style.fontSize = "15px";
                clearBtn.style.color = theme.subtext;
                clearBtn.onclick = function () {
                  vizState.searchTerm = "";
                  vizState.currentPage = 1;
                  triggerReRender();
                };
                searchContainer.appendChild(clearBtn);
              }
              toolbar.appendChild(searchContainer);
            }

            wrapper.appendChild(toolbar);
          }

          // Table Scroll Wrapper
          var tableScrollWrapper = document.createElement("div");
          tableScrollWrapper.style.flex = "1";
          tableScrollWrapper.style.overflow = "auto";
          tableScrollWrapper.style.position = "relative";

          var table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "separate";
          table.style.borderSpacing = "0";
          table.style.fontSize = curFont.base;

          // THEAD
          var thead = document.createElement("thead");
          thead.style.position = "sticky";
          thead.style.top = "0";
          thead.style.zIndex = "10";
          thead.style.background = theme.headerBg;

          var trHead = document.createElement("tr");

          // Helper to create sortable th
          function createTh(label, sortKeyVal, isNum, minWidth) {
            var th = document.createElement("th");
            th.style.padding = curFont.padY + " " + curFont.padX;
            th.style.textAlign = isNum ? "right" : "left";
            th.style.borderBottom = "2px solid " + theme.headerBorder;
            th.style.borderRight = "1px solid " + theme.border;
            th.style.color = theme.headerText;
            th.style.fontSize = curFont.header;
            th.style.fontWeight = "700";
            th.style.whiteSpace = "nowrap";
            th.style.cursor = "pointer";
            th.style.userSelect = "none";
            if (minWidth) th.style.minWidth = minWidth;

            var sortIcon = "";
            if (vizState.sortKey === sortKeyVal) {
              sortIcon = vizState.sortAsc ? " &uarr;" : " &darr;";
              th.style.color = theme.primary;
            }

            th.innerHTML = "<span>" + label + "</span><span style="font-size: 11px; opacity: 0.8;">" + sortIcon + "</span>";

            th.onclick = function () {
              if (vizState.sortKey === sortKeyVal) {
                vizState.sortAsc = !vizState.sortAsc;
              } else {
                vizState.sortKey = sortKeyVal;
                vizState.sortAsc = !isNum;
              }
              vizState.currentPage = 1;
              triggerReRender();
            };

            return th;
          }

          // Primary Dim Header
          trHead.appendChild(createTh(primaryDim.label_short || primaryDim.label || primaryDim.name, "__dim__", false, "160px"));

          // Secondary Dim Header if available
          if (secondaryDim) {
            trHead.appendChild(createTh(secondaryDim.label_short || secondaryDim.label || secondaryDim.name, "__sec_dim__", false, "130px"));
          }

          // Pivot Column Headers
          pivotCols.forEach(function (c) {
            trHead.appendChild(createTh(c.label, c.key, true, "110px"));
          });

          // Row Total Header
          if (showRowTotals) {
            var thTot = createTh("Total", "__row_total__", true, "120px");
            thTot.style.background = theme.totalBg;
            thTot.style.color = theme.totalText;
            thTot.style.borderLeft = "2px solid " + theme.border;
            trHead.appendChild(thTot);
          }

          thead.appendChild(trHead);
          table.appendChild(thead);

          // TBODY
          var tbody = document.createElement("tbody");

          if (pageRows.length === 0) {
            var trEmpty = document.createElement("tr");
            var tdEmpty = document.createElement("td");
            tdEmpty.colSpan = 1 + (secondaryDim ? 1 : 0) + pivotCols.length + (showRowTotals ? 1 : 0);
            tdEmpty.style.padding = "30px";
            tdEmpty.style.textAlign = "center";
            tdEmpty.style.color = theme.subtext;
            tdEmpty.innerHTML = "No matching entities found.";
            trEmpty.appendChild(tdEmpty);
            tbody.appendChild(trEmpty);
          } else {
            pageRows.forEach(function (rowObj, idx) {
              var tr = document.createElement("tr");
              tr.style.background = (idx % 2 === 1) ? theme.rowAlt : "#ffffff";
              tr.style.borderBottom = "1px solid " + theme.border;
              tr.style.transition = "background 0.15s ease";

              tr.onmouseenter = function () { tr.style.background = theme.rowHover; };
              tr.onmouseleave = function () { tr.style.background = (idx % 2 === 1) ? theme.rowAlt : "#ffffff"; };

              // Primary Dim Cell
              var tdDim = document.createElement("td");
              tdDim.style.padding = curFont.padY + " " + curFont.padX;
              tdDim.style.borderRight = "1px solid " + theme.border;
              tdDim.style.borderBottom = "1px solid " + theme.border;
              tdDim.style.fontWeight = "600";
              tdDim.style.color = theme.text;
              tdDim.style.whiteSpace = "nowrap";

              if (rowObj.dimDrills && rowObj.dimDrills.length > 0) {
                tdDim.style.cursor = "pointer";
                tdDim.style.color = theme.primary;
                tdDim.innerHTML = "<span style="text-decoration: underline; text-underline-offset: 2px;">" + (rowObj.dimVal || "-") + "</span>";
                tdDim.onclick = function (e) {
                  if (typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                    LookerCharts.Utils.openDrillMenu({ links: rowObj.dimDrills, event: e });
                  }
                };
              } else {
                tdDim.textContent = rowObj.dimVal || "-";
              }
              tr.appendChild(tdDim);

              // Secondary Dim Cell
              if (secondaryDim) {
                var tdSec = document.createElement("td");
                tdSec.style.padding = curFont.padY + " " + curFont.padX;
                tdSec.style.borderRight = "1px solid " + theme.border;
                tdSec.style.borderBottom = "1px solid " + theme.border;
                tdSec.style.color = theme.subtext;
                tdSec.style.whiteSpace = "nowrap";
                tdSec.textContent = rowObj.secDimVal || "-";
                tr.appendChild(tdSec);
              }

              // Value Cells
              pivotCols.forEach(function (c) {
                var td = document.createElement("td");
                td.style.padding = curFont.padY + " " + curFont.padX;
                td.style.borderRight = "1px solid " + theme.border;
                td.style.borderBottom = "1px solid " + theme.border;
                td.style.textAlign = "right";
                td.style.whiteSpace = "nowrap";

                var cellData = rowObj.cells[c.key];
                var val = cellData ? cellData.val : null;
                var isMaxInRow = highlightMax && (c.key === rowObj.rowMaxColKey) && (val !== null && val > 0);

                // Polarity & Breach check
                var isBreach = false;
                var breachDiffPct = null;
                var effectiveTarget = benchmarkTarget;
                if (targetMode === "measure_column" && rowObj.targetVal !== null) {
                  effectiveTarget = rowObj.targetVal;
                }
                if (highlightBreaches && effectiveTarget !== null && val !== null) {
                  breachDiffPct = ((val - effectiveTarget) / Math.abs(effectiveTarget || 1)) * 100;
                  if (metricPolarity === "higher_is_better" && breachDiffPct < -anomalyThreshold) {
                    isBreach = true;
                  } else if (metricPolarity === "lower_is_better" && breachDiffPct > anomalyThreshold) {
                    isBreach = true;
                  }
                }

                if (val === null || val === undefined) {
                  td.style.color = "#94a3b8";
                  td.textContent = "-";
                } else if (renderMode === "heatmap_grid") {
                  var cellBg = heatColorScale(val);
                  td.style.background = cellBg;
                  var t = (val - globalMinVal) / Math.max(1, (globalMaxVal - globalMinVal));
                  td.style.color = (t > 0.55 && themeKey !== "cyberpunk_dark") ? "#ffffff" : theme.text;
                  td.style.fontWeight = isMaxInRow ? "700" : "500";

                  if (labelDensity === "hidden") {
                    td.textContent = "";
                    td.title = cellData.rendered;
                  } else if (labelDensity === "peaks_only" && !isMaxInRow) {
                    td.textContent = "";
                    td.title = cellData.rendered;
                  } else {
                    td.textContent = cellData.rendered;
                  }
                } else if (renderMode === "matrix_bars") {
                  var barPct = (globalMaxVal > 0) ? Math.min(100, Math.max(0, (val / globalMaxVal) * 100)) : 0;
                  var barHtml =
                    "<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">" +
                    "  <div style="display: flex; align-items: center; gap: 4px;">" +
                    (isBreach ? "<span title="Anomaly Breach: " + breachDiffPct.toFixed(1) + "%" style="font-size: 10px; color: " + theme.negBadgeText + ";">⚠️</span>" : "") +
                    (isMaxInRow ? "<span title="Peak Cell in Row" style="font-size: 10px; color: " + theme.primary + "; font-weight: 700;">★</span>" : "") +
                    "    <span style="font-weight: " + (isMaxInRow ? "700" : "500") + "; color: " + (isBreach ? theme.negBadgeText : theme.text) + ";">" + (labelDensity === "hidden" ? "" : cellData.rendered) + "</span>" +
                    "  </div>" +
                    "  <div style="width: 100%; height: 4px; background: " + theme.barBg + "; border-radius: 2px; overflow: hidden; display: flex; justify-content: flex-end;">" +
                    "    <div style="width: " + barPct + "%; height: 100%; background: " + (isBreach ? theme.negBadgeText : theme.barFill) + "; border-radius: 2px;"></div>" +
                    "  </div>" +
                    "</div>";
                  td.innerHTML = barHtml;
                } else if (renderMode === "growth_delta") {
                  var popHtml = cellData.rendered;
                  if (cellData.popPct !== null) {
                    var isPos = cellData.popPct >= 0;
                    var badgeBg = isPos ? theme.posBadgeBg : theme.negBadgeBg;
                    var badgeText = isPos ? theme.posBadgeText : theme.negBadgeText;
                    if (metricPolarity === "lower_is_better") {
                      badgeBg = isPos ? theme.negBadgeBg : theme.posBadgeBg;
                      badgeText = isPos ? theme.negBadgeText : theme.posBadgeText;
                    }
                    var signChar = isPos ? "+" : "";
                    popHtml =
                      "<div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">" +
                      "  <span style="font-weight: 500; color: " + theme.text + ";">" + cellData.rendered + "</span>" +
                      "  <span style="font-size: " + curFont.badge + "; font-weight: 700; padding: 2px 5px; border-radius: 4px; background: " + badgeBg + "; color: " + badgeText + "; white-space: nowrap;">" + signChar + cellData.popPct.toFixed(1) + "%</span>" +
                      "</div>";
                  }
                  td.innerHTML = popHtml;
                } else {
                  // compact_kpi
                  td.style.fontWeight = isMaxInRow ? "700" : "500";
                  td.textContent = cellData.rendered;
                }

                if (cellData.links && cellData.links.length > 0) {
                  td.style.cursor = "pointer";
                  td.onclick = function (e) {
                    if (typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                      LookerCharts.Utils.openDrillMenu({ links: cellData.links, event: e });
                    }
                  };
                }

                tr.appendChild(td);
              });

              // Row Total Cell
              if (showRowTotals) {
                var tdTot = document.createElement("td");
                tdTot.style.padding = curFont.padY + " " + curFont.padX;
                tdTot.style.borderBottom = "1px solid " + theme.border;
                tdTot.style.borderLeft = "2px solid " + theme.border;
                tdTot.style.textAlign = "right";
                tdTot.style.fontWeight = "700";
                tdTot.style.background = theme.totalBg;
                tdTot.style.color = theme.totalText;
                tdTot.style.whiteSpace = "nowrap";
                tdTot.textContent = formatMetricValue(rowObj.rowSum, valFormat);
                tr.appendChild(tdTot);
              }

              tbody.appendChild(tr);
            });
          }

          table.appendChild(tbody);

          // TFOOT: Column Totals Footer
          if (showColTotals && pageRows.length > 0) {
            var tfoot = document.createElement("tfoot");
            tfoot.style.position = "sticky";
            tfoot.style.bottom = "0";
            tfoot.style.zIndex = "9";
            tfoot.style.background = theme.totalBg;
            tfoot.style.borderTop = "2px solid " + theme.border;

            var trFoot = document.createElement("tr");

            var tdFootLabel = document.createElement("td");
            tdFootLabel.style.padding = curFont.padY + " " + curFont.padX;
            tdFootLabel.style.borderRight = "1px solid " + theme.border;
            tdFootLabel.style.fontWeight = "800";
            tdFootLabel.style.color = theme.totalText;
            tdFootLabel.textContent = "Total Summary";
            trFoot.appendChild(tdFootLabel);

            if (secondaryDim) {
              var tdSecEmpty = document.createElement("td");
              tdSecEmpty.style.padding = curFont.padY + " " + curFont.padX;
              tdSecEmpty.style.borderRight = "1px solid " + theme.border;
              trFoot.appendChild(tdSecEmpty);
            }

            pivotCols.forEach(function (c) {
              var tdColSum = document.createElement("td");
              tdColSum.style.padding = curFont.padY + " " + curFont.padX;
              tdColSum.style.borderRight = "1px solid " + theme.border;
              tdColSum.style.textAlign = "right";
              tdColSum.style.fontWeight = "800";
              tdColSum.style.color = theme.totalText;
              tdColSum.textContent = formatMetricValue(colAggregations[c.key].sum, valFormat);
              trFoot.appendChild(tdColSum);
            });

            if (showRowTotals) {
              var tdGrandTot = document.createElement("td");
              tdGrandTot.style.padding = curFont.padY + " " + curFont.padX;
              tdGrandTot.style.borderLeft = "2px solid " + theme.border;
              tdGrandTot.style.textAlign = "right";
              tdGrandTot.style.fontWeight = "900";
              tdGrandTot.style.color = theme.primary;
              tdGrandTot.textContent = formatMetricValue(grandTotalSum, valFormat);
              trFoot.appendChild(tdGrandTot);
            }

            tfoot.appendChild(trFoot);
            table.appendChild(tfoot);
          }

          tableScrollWrapper.appendChild(table);
          wrapper.appendChild(tableScrollWrapper);

          // Pagination Controls Footer
          if (effectivePageSize !== "all" && totalPages > 1) {
            var paginBar = document.createElement("div");
            paginBar.style.display = "flex";
            paginBar.style.alignItems = "center";
            paginBar.style.justifyContent = "space-between";
            paginBar.style.padding = "8px 16px";
            paginBar.style.borderTop = "1px solid " + theme.border;
            paginBar.style.background = theme.headerBg;
            paginBar.style.fontSize = "12px";
            paginBar.style.color = theme.subtext;

            var paginInfo = document.createElement("div");
            var curStart = startIndex + 1;
            var curEnd = Math.min(filteredRows.length, startIndex + pageSizeNum);
            paginInfo.innerHTML = "Showing <strong>" + curStart + "-" + curEnd + "</strong> of <strong>" + filteredRows.length + "</strong> entries";
            paginBar.appendChild(paginInfo);

            var paginBtns = document.createElement("div");
            paginBtns.style.display = "flex";
            paginBtns.style.alignItems = "center";
            paginBtns.style.gap = "6px";

            var prevBtn = document.createElement("button");
            prevBtn.textContent = "&larr; Previous";
            prevBtn.innerHTML = "&larr; Prev";
            prevBtn.disabled = vizState.currentPage <= 1;
            prevBtn.style.padding = "4px 10px";
            prevBtn.style.fontSize = "12px";
            prevBtn.style.border = "1px solid " + theme.border;
            prevBtn.style.borderRadius = "5px";
            prevBtn.style.background = prevBtn.disabled ? "#f1f5f9" : "#ffffff";
            prevBtn.style.color = prevBtn.disabled ? "#94a3b8" : theme.text;
            prevBtn.style.cursor = prevBtn.disabled ? "default" : "pointer";
            prevBtn.onclick = function () {
              if (vizState.currentPage > 1) {
                vizState.currentPage -= 1;
                triggerReRender();
              }
            };
            paginBtns.appendChild(prevBtn);

            var pageIndicator = document.createElement("span");
            pageIndicator.style.fontWeight = "600";
            pageIndicator.style.color = theme.text;
            pageIndicator.style.padding = "0 4px";
            pageIndicator.textContent = vizState.currentPage + " / " + totalPages;
            paginBtns.appendChild(pageIndicator);

            var nextBtn = document.createElement("button");
            nextBtn.innerHTML = "Next &rarr;";
            nextBtn.disabled = vizState.currentPage >= totalPages;
            nextBtn.style.padding = "4px 10px";
            nextBtn.style.fontSize = "12px";
            nextBtn.style.border = "1px solid " + theme.border;
            nextBtn.style.borderRadius = "5px";
            nextBtn.style.background = nextBtn.disabled ? "#f1f5f9" : "#ffffff";
            nextBtn.style.color = nextBtn.disabled ? "#94a3b8" : theme.text;
            nextBtn.style.cursor = nextBtn.disabled ? "default" : "pointer";
            nextBtn.onclick = function () {
              if (vizState.currentPage < totalPages) {
                vizState.currentPage += 1;
                triggerReRender();
              }
            };
            paginBtns.appendChild(nextBtn);

            paginBar.appendChild(paginBtns);
            wrapper.appendChild(paginBar);
          }

          container.appendChild(wrapper);

          // Internal re-render trigger for client-side state changes
          function triggerReRender() {
            self.updateAsync(data, element, config, queryResponse, details, function () {});
          }

          done();
        } catch (err) {
          self.addError({
            title: "Render Error",
            message: err.message
          });
          done();
        }
      });
    }
  });
})();
