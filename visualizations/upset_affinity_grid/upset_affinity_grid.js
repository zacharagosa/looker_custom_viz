/**
 * UpSet Set-Intersection & Market Basket Affinity Grid - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/396288129: "Data Analytics > Looker > Multi-Set Overlap & UpSet Plot Support for Customer Cohorts [Cloud Blocker]"
 * - b/482910482: "Data Analytics > Looker > Market Basket Co-Occurrence & Affinity Matrix [Cloud Blocker]"
 * - b/519284711: "Data Analytics > Looker > UpSet Plot Visualization for Cross-Category Affinity & Product Bundling"
 * - PRD / Customer Requirements: Retail, E-Commerce, Healthcare & SaaS
 *   (Multi-set intersections, co-purchasing bundles, cross-shopping patterns,
 *   marginal set sizes, combination dot matrix, and pairwise affinity lift)
 *
 * Visual Paradigms:
 * 1. "upset_matrix": Classic UpSet Plot (Upper vertical intersection bar chart, left horizontal
 *                     marginal set size bar chart, and bottom-right combination dot matrix).
 * 2. "affinity_heatmap": Symmetric Pairwise Co-Occurrence & Affinity Heatmap (Dual-metric encoding
 *                         with frequency counts and affinity lift ratios).
 * 3. "radial_chord": Circular Set-Affinity Flow Chord (Bilateral set-to-set affinity ribbons).
 *
 * Dual-Tab Configuration (Strictly 'Display' and 'Style' only):
 * - Display: layoutMode, primaryDimOverride, secondaryDimOverride, primaryMeasureOverride, secondaryMeasureOverride,
 *            targetCalculationMode, fixedTargetValue, referenceLineLabel, underperformanceThresholdPct,
 *            sortOrder, topNCount, showOthersRollup, suppressZeros, hudMode, labelDensity,
 *            customTitle, customSubtitle, showSearch.
 * - Style: colorPalette, customPrimaryColor, customPositiveColor, customNegativeColor, metricPolarity,
 *          fontScale, valueFormat, dotRadius, hoverEffect.
 */

(function () {
  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      primary: "#1a73e8",
      accent: "#1e8e3e",
      warning: "#f9ab00",
      danger: "#d93025",
      neutralDot: "#dadce0",
      activeDot: "#1a73e8",
      lineColor: "#1a73e8",
      bg: "#ffffff",
      hudBg: "#f8f9fa",
      border: "#e8eaed",
      text: "#202124",
      subtext: "#5f6368",
      colors: ["#1a73e8", "#1e8e3e", "#f9ab00", "#d93025", "#9334e6", "#12b5cb", "#fa7b17", "#e52592", "#4285f4", "#0f9d58"]
    },
    executive_slate: {
      name: "Executive Slate & Indigo",
      primary: "#4f46e5",
      accent: "#059669",
      warning: "#d97706",
      danger: "#dc2626",
      neutralDot: "#cbd5e1",
      activeDot: "#4f46e5",
      lineColor: "#4f46e5",
      bg: "#ffffff",
      hudBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      colors: ["#4f46e5", "#0284c7", "#059669", "#d97706", "#dc2626", "#7c3aed", "#2563eb", "#0d9488", "#475569", "#64748b"]
    },
    cyber_dark: {
      name: "Cyberpunk Dark",
      primary: "#38bdf8",
      accent: "#2dd4bf",
      warning: "#facc15",
      danger: "#f43f5e",
      neutralDot: "#334155",
      activeDot: "#38bdf8",
      lineColor: "#38bdf8",
      bg: "#0f172a",
      hudBg: "#1e293b",
      border: "#334155",
      text: "#f8fafc",
      subtext: "#94a3b8",
      colors: ["#38bdf8", "#2dd4bf", "#facc15", "#f43f5e", "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#f97316", "#6366f1"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#059669",
      accent: "#0284c7",
      warning: "#d97706",
      danger: "#e11d48",
      neutralDot: "#d1fae5",
      activeDot: "#059669",
      lineColor: "#059669",
      bg: "#ffffff",
      hudBg: "#f0fdf4",
      border: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      colors: ["#059669", "#0d9488", "#10b981", "#0284c7", "#f59e0b", "#e11d48", "#047857", "#14b8a6", "#3b82f6", "#6366f1"]
    },
    sunset_media: {
      name: "Sunset Media",
      primary: "#ea580c",
      accent: "#e11d48",
      warning: "#f59e0b",
      danger: "#dc2626",
      neutralDot: "#fed7aa",
      activeDot: "#ea580c",
      lineColor: "#ea580c",
      bg: "#ffffff",
      hudBg: "#fff7ed",
      border: "#fed7aa",
      text: "#7c2d12",
      subtext: "#9a3412",
      colors: ["#ea580c", "#e11d48", "#f59e0b", "#8b5cf6", "#0284c7", "#16a34a", "#d97706", "#b91c1c", "#ec4899", "#4f46e5"]
    },
    wellverse: {
      name: "Wellverse Healthcare",
      primary: "#143359",
      accent: "#00AF68",
      warning: "#FFB500",
      danger: "#E5484D",
      neutralDot: "#E2E8F0",
      activeDot: "#00AF68",
      lineColor: "#143359",
      bg: "#ffffff",
      hudBg: "#F8FAFC",
      border: "#E2E8F0",
      text: "#0F172A",
      subtext: "#64748B",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#1E467A", "#7C5CFC", "#14B8A6", "#E5484D", "#FFB500", "#64748B", "#008C52"]
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    switch (fmt) {
      case "compact_currency":
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return "$" + Math.round(num).toLocaleString();
      case "compact_num":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString();
      case "percentage":
        return (num * (Math.abs(num) <= 1 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2dp":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(num);
      case "auto":
      default:
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return Math.abs(num) < 10 && num % 1 !== 0 ? num.toFixed(2) : Math.round(num).toLocaleString();
    }
  }

  function resolveField(list, overrideVal, defaultIdx) {
    if (overrideVal && typeof overrideVal === "string" && overrideVal.trim() !== "") {
      var v = overrideVal.trim();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === v || list[i].label === v || list[i].label_short === v) return list[i];
      }
      var num = parseInt(v, 10);
      if (!isNaN(num) && num >= 1 && num <= list.length) return list[num - 1];
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) return list[defaultIdx];
    return null;
  }

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.select === "function") {
      callback(window.d3);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () { callback(window.d3); };
    document.head.appendChild(script);
  }

  looker.plugins.visualizations.add({
    id: "upset_affinity_grid",
    label: "UpSet Set-Intersection & Market Basket Affinity Grid",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Classic UpSet Plot (Bars + Combination Matrix)": "upset_matrix" },
          { "Pairwise Affinity & Co-Occurrence Heatmap": "affinity_heatmap" },
          { "Radial Set-Affinity Chord Ribbon": "radial_chord" }
        ],
        default: "upset_matrix"
      },
      primaryDimOverride: {
        type: "string",
        label: "Primary Set Dimension (e.g. Category A)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      secondaryDimOverride: {
        type: "string",
        label: "Secondary Set Dimension (e.g. Category B)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      tertiaryDimOverride: {
        type: "string",
        label: "Tertiary Set / Attribute Dimension",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Intersection Frequency Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Affinity Score / Lift Measure",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "None (No Benchmark Line)": "none" },
          { "Dataset Mean (Average Intersection Size)": "dataset_mean" },
          { "Dataset Median (P50 Intersection)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Performer Benchmark (P90)": "percentile_p90" },
          { "Fixed Goal Value": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 8,
        default: 50
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 9,
        default: "Affinity Benchmark"
      },
      underperformanceThresholdPct: {
        type: "number",
        label: "Underperformance Alert Threshold (%)",
        section: "Display",
        order: 10,
        default: 20
      },
      sortOrder: {
        type: "string",
        label: "Intersection Sort Order",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Intersection Size Descending (Largest Bundles First)": "size_desc" },
          { "Intersection Size Ascending (Smallest First)": "size_asc" },
          { "Degree Descending (Higher-Order Bundles First)": "degree_desc" },
          { "Degree Ascending (Single Sets First)": "degree_asc" },
          { "Alphabetical Name": "alpha" }
        ],
        default: "size_desc"
      },
      topNCount: {
        type: "string",
        label: "Top-N Combination Density",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Top 10 Combinations": "10" },
          { "Top 15 Combinations": "15" },
          { "Top 20 Combinations": "20" },
          { "Top 30 Combinations": "30" },
          { "Top 50 Combinations": "50" },
          { "All Combinations (Uncapped)": "all" }
        ],
        default: "20"
      },
      showOthersRollup: {
        type: "boolean",
        label: "Roll Remaining into 'Other' Combination",
        section: "Display",
        order: 13,
        default: true
      },
      suppressZeros: {
        type: "boolean",
        label: "Suppress Zero / Null Value Rows",
        section: "Display",
        order: 14,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Full Scorecard HUD": "full" },
          { "Compact KPI Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Data Label Density",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "All Visible Bars": "all" },
          { "High-Volume Peaks Only": "peaks_only" },
          { "Hidden (Clean Display)": "hidden" }
        ],
        default: "all"
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Quick Search Filter Bar",
        section: "Display",
        order: 19,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Color Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise (Modern)": "google_enterprise" },
          { "Executive Slate & Indigo": "executive_slate" },
          { "Emerald FinOps (Green)": "emerald_finops" },
          { "Sunset Media (Warm)": "sunset_media" },
          { "Cyberpunk Dark": "cyber_dark" },
          { "Wellverse Healthcare (Teal)": "wellverse" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_enterprise"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Bar / Active Dot Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: "#1a73e8"
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Outperforming Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: "#1e8e3e"
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Underperforming Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: "#d93025"
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Joint Orders, Affinity Lift)": "higher_is_better" },
          { "Lower is Better (Return Rate, Churn, Latency)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Font Scale / Typography Density",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (85%)": "compact" },
          { "Standard (100%)": "standard" },
          { "Large Presentation (115%)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Frequency Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto / Context Aware": "auto" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Compact Currency (.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2dp" },
          { "Raw Number": "raw" }
        ],
        default: "compact_num"
      },
      dotRadius: {
        type: "string",
        label: "Matrix Dot Radius",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Small (4px)": "4" },
          { "Medium (6px - Default)": "6" },
          { "Large (8px - Bold)": "8" }
        ],
        default: "6"
      },
      hoverEffect: {
        type: "string",
        label: "Hover Animation & Focus",
        section: "Style",
        order: 9,
        display: "select",
        values: [
          { "Elevate & Glow Focus": "elevate" },
          { "Brighten Fill": "brighten" },
          { "Subtle Border Highlight": "border" }
        ],
        default: "elevate"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        primaryDimOverride: { role: "dimension", defaultIdx: 0 },
        secondaryDimOverride: { role: "dimension", defaultIdx: 1 },
        tertiaryDimOverride: { role: "dimension", defaultIdx: 2 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasureOverride: { role: "measure", defaultIdx: 1 }
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
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      var container = document.createElement("div");
      container.className = "looker-upset-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      element.appendChild(container);

      this._container = container;
    },

    _setupLifecycleObservers: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        this._resizeObserver = new ResizeObserver(function () {
          self._onResize();
        });
        this._resizeObserver.observe(element);
      }
    },

    _onResize: function () {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element || self._lastElement;
      if (!el) return;

      var curW = el.clientWidth || 0;
      var curH = el.clientHeight || 0;
      if (curW <= 10 || curH <= 10) return;

      if (self._lastRenderW && self._lastRenderH) {
        if (Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) {
          return;
        }
      }

      if (self._resizeDebounceTimer) clearTimeout(self._resizeDebounceTimer);
      self._resizeDebounceTimer = setTimeout(function () {
        self.updateAsync(
          self._lastData,
          self._lastElement,
          self._lastConfig,
          self._lastQueryResponse,
          self._lastDetails,
          function () {}
        );
      }, 120);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastElement = element;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      this._registerDynamicFieldOptions(queryResponse);

      var f = queryResponse.fields;
      var rawDims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var rawMeas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!rawMeas.length && f.table_calculations) rawMeas = f.table_calculations;

      var dimA = resolveField(rawDims, config.primaryDimOverride, 0);
      var dimB = resolveField(rawDims, config.secondaryDimOverride, rawDims.length > 1 ? 1 : -1);
      var dimC = resolveField(rawDims, config.tertiaryDimOverride, rawDims.length > 2 ? 2 : -1);

      var dimFields = [];
      if (dimA) dimFields.push(dimA);
      if (dimB && dimB !== dimA) dimFields.push(dimB);
      if (dimC && dimC !== dimA && dimC !== dimB) dimFields.push(dimC);

      if (dimFields.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Insufficient Dimensions",
            message: "The UpSet Grid requires at least 1 Dimension representing Sets / Categories (e.g. Product A, Product B)."
          });
        }
        done();
        return;
      }

      var primaryMeas = resolveField(rawMeas, config.primaryMeasureOverride, 0);
      var secondaryMeas = resolveField(rawMeas, config.secondaryMeasureOverride, rawMeas.length > 1 ? 1 : -1);

      if (!primaryMeas) {
        if (this.addError) {
          this.addError({
            title: "Insufficient Measures",
            message: "The UpSet Grid requires at least 1 Numeric Measure for intersection frequency / size (e.g. Joint Orders)."
          });
        }
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, config, queryResponse, dimFields, primaryMeas, secondaryMeas);
          done();
        } catch (err) {
          console.error("UpSet Render Error:", err);
          if (self.addError) {
            self.addError({
              title: "Render Error",
              message: "Unable to render UpSet Grid: " + err.message
            });
          }
          done();
        }
      });
    },

    _render: function (d3, data, config, queryResponse, dimFields, primaryMeas, secondaryMeas) {
      var container = this._container;
      container.innerHTML = "";

      var el = this._element;
      var curW = el.clientWidth || 800;
      var curH = el.clientHeight || 500;
      this._lastRenderW = curW;
      this._lastRenderH = curH;

      var paletteKey = config.colorPalette || "google_enterprise";
      var theme = PALETTES[paletteKey] || PALETTES.google_enterprise;
      if (paletteKey === "custom") {
        var pCol = config.customPrimaryColor || "#1a73e8";
        var posCol = config.customPositiveColor || "#1e8e3e";
        var negCol = config.customNegativeColor || "#d93025";
        theme = {
          name: "Custom",
          primary: pCol,
          accent: posCol,
          warning: "#f9ab00",
          danger: negCol,
          neutralDot: "#dadce0",
          activeDot: pCol,
          lineColor: pCol,
          bg: "#ffffff",
          hudBg: "#f8f9fa",
          border: "#e8eaed",
          text: "#202124",
          subtext: "#5f6368",
          colors: [pCol, posCol, "#f9ab00", negCol, "#9334e6", "#12b5cb", "#fa7b17", "#e52592"]
        };
      }

      var isPolarityInverted = config.metricPolarity === "lower_is_better";
      var fontScale = config.fontScale || "standard";
      var fontMul = fontScale === "compact" ? 0.85 : (fontScale === "large" ? 1.15 : 1.0);
      var layoutMode = config.layoutMode || "upset_matrix";
      var valFmt = config.valueFormat || "compact_num";
      var dotRad = parseInt(config.dotRadius || "6", 10);
      var hudMode = config.hudMode || "full";
      var labelDensity = config.labelDensity || "all";
      var showSearch = config.showSearch !== false;
      var suppressZeros = config.suppressZeros !== false;
      var sortOrder = config.sortOrder || "size_desc";
      var topN = config.topNCount === "all" ? 999999 : parseInt(config.topNCount || "20", 10);

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Process Set Intersections & Marginal Set Frequencies
      var setMap = {}; // setName -> total marginal frequency
      var intersectionMap = {}; // key -> { sets: [...], count, totalSec, numRows, drillLinks: [] }
      var totalVolume = 0;
      var rowCount = 0;

      data.forEach(function (row) {
        var primCell = row[primaryMeas.name];
        var val = primCell && primCell.value !== null ? Number(primCell.value) : 0;
        if (isNaN(val)) val = 0;
        if (suppressZeros && val <= 0) return;

        var secCell = secondaryMeas ? row[secondaryMeas.name] : null;
        var secVal = secCell && secCell.value !== null ? Number(secCell.value) : null;
        if (secVal !== null && isNaN(secVal)) secVal = null;

        var activeSets = [];
        dimFields.forEach(function (df) {
          var cell = row[df.name];
          if (cell && cell.value !== null && String(cell.value).trim() !== "") {
            var sName = String(cell.value).trim();
            if (activeSets.indexOf(sName) === -1) activeSets.push(sName);
          }
        });

        if (activeSets.length === 0) return;

        totalVolume += val;
        rowCount++;

        activeSets.forEach(function (s) {
          setMap[s] = (setMap[s] || 0) + val;
        });

        activeSets.sort();
        var intKey = activeSets.join(" + ");
        if (!intersectionMap[intKey]) {
          intersectionMap[intKey] = {
            id: intKey,
            sets: activeSets,
            degree: activeSets.length,
            value: 0,
            secValue: 0,
            secCount: 0,
            drillLinks: primCell && primCell.links ? primCell.links : []
          };
        }

        intersectionMap[intKey].value += val;
        if (secVal !== null) {
          intersectionMap[intKey].secValue += secVal;
          intersectionMap[intKey].secCount += 1;
        }
      });

      var setList = Object.keys(setMap).map(function (k) {
        return { name: k, total: setMap[k] };
      });
      // Sort sets by total marginal size descending
      setList.sort(function (a, b) { return b.total - a.total; });

      // Build array of intersections
      var intersections = Object.keys(intersectionMap).map(function (k) {
        return intersectionMap[k];
      });

      // Sort intersections
      if (sortOrder === "size_desc") {
        intersections.sort(function (a, b) { return b.value - a.value; });
      } else if (sortOrder === "size_asc") {
        intersections.sort(function (a, b) { return a.value - b.value; });
      } else if (sortOrder === "degree_desc") {
        intersections.sort(function (a, b) {
          if (b.degree !== a.degree) return b.degree - a.degree;
          return b.value - a.value;
        });
      } else if (sortOrder === "degree_asc") {
        intersections.sort(function (a, b) {
          if (a.degree !== b.degree) return a.degree - b.degree;
          return b.value - a.value;
        });
      } else if (sortOrder === "alpha") {
        intersections.sort(function (a, b) { return a.id.localeCompare(b.id); });
      }

      // Top-N Slicing & Rollup
      var renderedIntersections = intersections;
      if (intersections.length > topN) {
        var topSlices = intersections.slice(0, topN);
        if (config.showOthersRollup !== false) {
          var otherVal = 0;
          var otherSec = 0;
          var otherSecN = 0;
          for (var i = topN; i < intersections.length; i++) {
            otherVal += intersections[i].value;
            otherSec += intersections[i].secValue;
            otherSecN += intersections[i].secCount;
          }
          topSlices.push({
            id: "+ Other Combinations",
            sets: [],
            degree: 0,
            value: otherVal,
            secValue: otherSec,
            secCount: otherSecN,
            isOther: true,
            drillLinks: []
          });
        }
        renderedIntersections = topSlices;
      }

      // Benchmark Target calculation
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var targetVal = null;
      var intVals = intersections.map(function (d) { return d.value; }).sort(function (a, b) { return a - b; });

      if (targetMode === "fixed_value") {
        targetVal = Number(config.fixedTargetValue || 50);
      } else if (intVals.length > 0) {
        if (targetMode === "dataset_mean") {
          targetVal = totalVolume / (intVals.length || 1);
        } else if (targetMode === "dataset_median") {
          var mid = Math.floor(intVals.length / 2);
          targetVal = intVals.length % 2 !== 0 ? intVals[mid] : (intVals[mid - 1] + intVals[mid]) / 2;
        } else if (targetMode === "percentile_p75") {
          targetVal = intVals[Math.min(intVals.length - 1, Math.floor(intVals.length * 0.75))];
        } else if (targetMode === "percentile_p90") {
          targetVal = intVals[Math.min(intVals.length - 1, Math.floor(intVals.length * 0.90))];
        }
      }

      var underperfThreshold = Number(config.underperformanceThresholdPct || 20) / 100;
      var underperfCount = 0;
      if (targetVal !== null) {
        renderedIntersections.forEach(function (d) {
          var ratio = d.value / (targetVal || 1);
          var isUnder = isPolarityInverted ? ratio > (1 + underperfThreshold) : ratio < (1 - underperfThreshold);
          if (isUnder) underperfCount++;
        });
      }

      var topCombo = renderedIntersections.length > 0 ? renderedIntersections[0] : null;

      // 2. Setup Top Control Bars (Title, HUD & Search)
      var topControls = document.createElement("div");
      topControls.className = "upset-top-controls";
      topControls.style.display = "flex";
      topControls.style.flexDirection = "column";
      topControls.style.gap = "6px";
      topControls.style.padding = "8px 12px 6px 12px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.flexShrink = "0";
      container.appendChild(topControls);

      // Title & Subtitle Override
      if (config.customTitle || config.customSubtitle) {
        var headerDiv = document.createElement("div");
        headerDiv.style.display = "flex";
        headerDiv.style.flexDirection = "column";
        headerDiv.style.gap = "2px";
        if (config.customTitle) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = Math.round(15 * fontMul) + "px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = theme.text;
          titleEl.textContent = config.customTitle;
          headerDiv.appendChild(titleEl);
        }
        if (config.customSubtitle) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = Math.round(11 * fontMul) + "px";
          subEl.style.color = theme.subtext;
          subEl.textContent = config.customSubtitle;
          headerDiv.appendChild(subEl);
        }
        topControls.appendChild(headerDiv);
      }

      // Executive HUD
      if (hudMode !== "hidden") {
        var hud = document.createElement("div");
        hud.className = "upset-hud";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.justifyContent = "space-between";
        hud.style.flexWrap = "wrap";
        hud.style.gap = hudMode === "compact" ? "8px" : "12px";
        hud.style.padding = hudMode === "compact" ? "4px 8px" : "6px 12px";
        hud.style.backgroundColor = theme.hudBg;
        hud.style.borderRadius = "6px";
        hud.style.border = "1px solid " + theme.border;

        var hudStats = [
          { label: "Total Volume", val: formatValue(totalVolume, valFmt), icon: "🛒" },
          { label: "Active Sets", val: setList.length.toLocaleString(), icon: "📦" }
        ];

        if (topCombo) {
          hudStats.push({
            label: "Top Bundle",
            val: topCombo.id + " (" + formatValue(topCombo.value, valFmt) + ")",
            icon: "⭐"
          });
        }

        if (targetVal !== null) {
          var bLabel = config.referenceLineLabel || "Benchmark";
          hudStats.push({
            label: bLabel,
            val: formatValue(targetVal, valFmt) + (underperfCount > 0 ? " (" + underperfCount + " under)" : ""),
            icon: "🎯"
          });
        }

        if (hudMode === "full") {
          hudStats.push({
            label: "Combinations",
            val: intersections.length.toLocaleString(),
            icon: "🔢"
          });
        }

        hudStats.forEach(function (st) {
          var item = document.createElement("div");
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.gap = "6px";

          var iconEl = document.createElement("span");
          iconEl.style.fontSize = Math.round(13 * fontMul) + "px";
          iconEl.textContent = st.icon;
          item.appendChild(iconEl);

          var textCol = document.createElement("div");
          var lbl = document.createElement("div");
          lbl.style.fontSize = Math.round(9 * fontMul) + "px";
          lbl.style.textTransform = "uppercase";
          lbl.style.letterSpacing = "0.05em";
          lbl.style.color = theme.subtext;
          lbl.style.fontWeight = "600";
          lbl.textContent = st.label;

          var val = document.createElement("div");
          val.style.fontSize = Math.round(12 * fontMul) + "px";
          val.style.fontWeight = "700";
          val.style.color = theme.text;
          val.textContent = st.val;

          textCol.appendChild(lbl);
          textCol.appendChild(val);
          item.appendChild(textCol);
          hud.appendChild(item);
        });

        topControls.appendChild(hud);
      }

      // Quick Search Filter Input
      var searchInput = null;
      if (showSearch) {
        var searchRow = document.createElement("div");
        searchRow.style.display = "flex";
        searchRow.style.alignItems = "center";
        searchRow.style.justifyContent = "flex-end";

        var searchBox = document.createElement("div");
        searchBox.style.display = "flex";
        searchBox.style.alignItems = "center";
        searchBox.style.position = "relative";
        searchBox.style.minWidth = "180px";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search sets / combinations...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.width = "100%";
        searchInput.style.padding = "4px 26px 4px 8px";
        searchInput.style.fontSize = Math.round(11 * fontMul) + "px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.borderRadius = "4px";
        searchInput.style.backgroundColor = theme.hudBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";

        var searchIcon = document.createElement("span");
        searchIcon.textContent = "🔍";
        searchIcon.style.position = "absolute";
        searchIcon.style.right = "8px";
        searchIcon.style.fontSize = "10px";
        searchIcon.style.pointerEvents = "none";

        searchBox.appendChild(searchInput);
        searchBox.appendChild(searchIcon);
        searchRow.appendChild(searchBox);
        topControls.appendChild(searchRow);
      }

      // 3. Canvas & SVG Workspace
      var vizArea = document.createElement("div");
      vizArea.className = "upset-viz-area";
      vizArea.style.flex = "1 1 auto";
      vizArea.style.width = "100%";
      vizArea.style.position = "relative";
      vizArea.style.overflow = "hidden";
      container.appendChild(vizArea);

      var tooltip = document.createElement("div");
      tooltip.className = "upset-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.visibility = "hidden";
      tooltip.style.backgroundColor = paletteKey === "cyber_dark" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)";
      tooltip.style.color = theme.text;
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.fontSize = Math.round(11 * fontMul) + "px";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.2)";
      tooltip.style.border = "1px solid " + theme.border;
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "280px";
      vizArea.appendChild(tooltip);

      var ctrlH = topControls.offsetHeight || 60;
      var availW = Math.max(100, container.clientWidth || 800);
      var availH = Math.max(100, (container.clientHeight || 500) - ctrlH);

      var svg = d3.select(vizArea)
        .append("svg")
        .attr("width", availW)
        .attr("height", availH)
        .style("display", "block");

      // -------------------------------------------------------------
      // LAYOUT ENGINE: Classic UpSet Matrix or Heatmap
      // -------------------------------------------------------------
      var leftWidth = Math.min(220, Math.floor(availW * 0.28));
      var topHeight = Math.min(180, Math.floor(availH * 0.45));
      var matrixW = availW - leftWidth - 20;
      var matrixH = availH - topHeight - 20;

      var numCols = renderedIntersections.length;
      var colWidth = Math.max(16, Math.min(48, matrixW / (numCols || 1)));
      var numRows = setList.length;
      var rowHeight = Math.max(16, Math.min(32, matrixH / (numRows || 1)));

      var maxIntVal = d3.max(renderedIntersections, function (d) { return d.value; }) || 1;
      var maxSetVal = d3.max(setList, function (d) { return d.total; }) || 1;

      // 4A. Upper Chart: Vertical Intersection Size Bars
      var yUp = d3.scaleLinear()
        .domain([0, maxIntVal * 1.15])
        .range([topHeight - 15, 10]);

      var gUpper = svg.append("g")
        .attr("class", "upset-upper-bars")
        .attr("transform", "translate(" + (leftWidth + 10) + ", 0)");

      // Axis line
      gUpper.append("line")
        .attr("x1", 0)
        .attr("x2", numCols * colWidth)
        .attr("y1", topHeight - 15)
        .attr("y2", topHeight - 15)
        .attr("stroke", theme.border)
        .attr("stroke-width", 1);

      // Benchmark Target reference line
      if (targetVal !== null && targetVal <= maxIntVal * 1.15) {
        var yTarg = yUp(targetVal);
        gUpper.append("line")
          .attr("x1", 0)
          .attr("x2", numCols * colWidth)
          .attr("y1", yTarg)
          .attr("y2", yTarg)
          .attr("stroke", theme.warning)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3");

        gUpper.append("text")
          .attr("x", numCols * colWidth + 4)
          .attr("y", yTarg + 3)
          .attr("fill", theme.warning)
          .attr("font-size", Math.round(9 * fontMul) + "px")
          .attr("font-weight", "600")
          .text(config.referenceLineLabel || "Target");
      }

      // Draw Upper Vertical Bars
      renderedIntersections.forEach(function (d, colIdx) {
        var barX = colIdx * colWidth + (colWidth * 0.12);
        var barW = colWidth * 0.76;
        var barY = yUp(d.value);
        var barH = Math.max(2, (topHeight - 15) - barY);

        var barCol = d.isOther ? "#94a3b8" : (d.degree > 1 ? theme.primary : theme.accent);

        var bar = gUpper.append("rect")
          .attr("class", "upset-int-bar")
          .attr("data-col", colIdx)
          .attr("x", barX)
          .attr("y", barY)
          .attr("width", barW)
          .attr("height", barH)
          .attr("rx", 3)
          .attr("fill", barCol)
          .attr("cursor", d.drillLinks && d.drillLinks.length ? "pointer" : "default")
          .style("transition", "opacity 0.2s ease, filter 0.2s ease");

        // Value Label
        if (labelDensity !== "hidden") {
          var showLabel = labelDensity === "all" || colIdx < 5;
          if (showLabel && colWidth >= 20) {
            gUpper.append("text")
              .attr("x", barX + barW / 2)
              .attr("y", barY - 4)
              .attr("text-anchor", "middle")
              .attr("font-size", Math.round(9 * fontMul) + "px")
              .attr("font-weight", "600")
              .attr("fill", theme.text)
              .text(formatValue(d.value, valFmt));
          }
        }

        // Hover & Click Interaction on Upper Bar
        bar.on("mouseenter", function (event) {
          highlightColumn(colIdx, d);
          showTooltip(event, d);
        });
        bar.on("mousemove", moveTooltip);
        bar.on("mouseleave", function () {
          resetHighlight();
          hideTooltip();
        });
        bar.on("click", function (event) {
          if (d.drillLinks && d.drillLinks.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
          }
        });
      });

      // 4B. Left Chart: Horizontal Marginal Set Size Bars & Set Names
      var gLeft = svg.append("g")
        .attr("class", "upset-left-bars")
        .attr("transform", "translate(10, " + (topHeight + 10) + ")");

      var xSet = d3.scaleLinear()
        .domain([0, maxSetVal * 1.1])
        .range([0, leftWidth - 90]);

      setList.forEach(function (s, rowIdx) {
        var rowY = rowIdx * rowHeight;
        var barW = xSet(s.total);
        var barH = rowHeight * 0.65;
        var barX = (leftWidth - 90) - barW;

        // Set Label
        gLeft.append("text")
          .attr("x", leftWidth - 95 - barW - 6)
          .attr("y", rowY + rowHeight / 2 + 3)
          .attr("text-anchor", "end")
          .attr("font-size", Math.round(10 * fontMul) + "px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(s.name.length > 14 ? s.name.substring(0, 13) + "…" : s.name);

        // Horizontal Bar
        gLeft.append("rect")
          .attr("x", barX)
          .attr("y", rowY + (rowHeight - barH) / 2)
          .attr("width", barW)
          .attr("height", barH)
          .attr("rx", 2)
          .attr("fill", theme.neutralDot)
          .attr("stroke", theme.border);

        // Marginal Value Label
        gLeft.append("text")
          .attr("x", barX + barW + 4)
          .attr("y", rowY + rowHeight / 2 + 3)
          .attr("font-size", Math.round(9 * fontMul) + "px")
          .attr("fill", theme.subtext)
          .text(formatValue(s.total, valFmt));
      });

      // 4C. Bottom-Right: UpSet Combination Dot Matrix
      var gMatrix = svg.append("g")
        .attr("class", "upset-matrix-grid")
        .attr("transform", "translate(" + (leftWidth + 10) + ", " + (topHeight + 10) + ")");

      // Alternating background zebra stripes
      setList.forEach(function (s, rowIdx) {
        var rowY = rowIdx * rowHeight;
        if (rowIdx % 2 === 0) {
          gMatrix.append("rect")
            .attr("x", 0)
            .attr("y", rowY)
            .attr("width", numCols * colWidth)
            .attr("height", rowHeight)
            .attr("fill", paletteKey === "cyber_dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)");
        }
      });

      // Draw columns: vertical lines + dots
      renderedIntersections.forEach(function (d, colIdx) {
        var colX = colIdx * colWidth + colWidth / 2;
        var activeIndices = [];

        setList.forEach(function (s, rowIdx) {
          if (d.sets.indexOf(s.name) !== -1) {
            activeIndices.push(rowIdx);
          }
        });

        // Vertical connecting line for multi-degree bundles
        if (activeIndices.length > 1) {
          var minY = d3.min(activeIndices) * rowHeight + rowHeight / 2;
          var maxY = d3.max(activeIndices) * rowHeight + rowHeight / 2;

          gMatrix.append("line")
            .attr("class", "upset-matrix-link")
            .attr("data-col", colIdx)
            .attr("x1", colX)
            .attr("x2", colX)
            .attr("y1", minY)
            .attr("y2", maxY)
            .attr("stroke", theme.primary)
            .attr("stroke-width", 3)
            .style("transition", "stroke 0.2s ease, stroke-width 0.2s ease");
        }

        // Draw dots for each row in this column
        setList.forEach(function (s, rowIdx) {
          var dotY = rowIdx * rowHeight + rowHeight / 2;
          var isActive = activeIndices.indexOf(rowIdx) !== -1;

          var circle = gMatrix.append("circle")
            .attr("class", "upset-dot")
            .attr("data-col", colIdx)
            .attr("data-row", rowIdx)
            .attr("cx", colX)
            .attr("cy", dotY)
            .attr("r", dotRad)
            .attr("fill", isActive ? (d.degree > 1 ? theme.primary : theme.accent) : theme.neutralDot)
            .attr("stroke", isActive ? theme.bg : "transparent")
            .attr("stroke-width", 1.5)
            .attr("cursor", "pointer")
            .style("transition", "transform 0.15s ease, filter 0.15s ease");

          circle.on("mouseenter", function (event) {
            highlightColumn(colIdx, d);
            showTooltip(event, d);
          });
          circle.on("mousemove", moveTooltip);
          circle.on("mouseleave", function () {
            resetHighlight();
            hideTooltip();
          });
          circle.on("click", function (event) {
            if (d.drillLinks && d.drillLinks.length && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
            }
          });
        });
      });

      // 5. Tooltip & Interactive Highlight Functions
      function highlightColumn(colIdx, d) {
        svg.selectAll(".upset-int-bar").each(function () {
          var idx = parseInt(d3.select(this).attr("data-col"), 10);
          d3.select(this).style("opacity", idx === colIdx ? 1 : 0.25);
          if (idx === colIdx) {
            d3.select(this).attr("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))");
          }
        });

        svg.selectAll(".upset-matrix-link").each(function () {
          var idx = parseInt(d3.select(this).attr("data-col"), 10);
          d3.select(this).style("opacity", idx === colIdx ? 1 : 0.15);
          if (idx === colIdx) d3.select(this).attr("stroke-width", 4);
        });

        svg.selectAll(".upset-dot").each(function () {
          var idx = parseInt(d3.select(this).attr("data-col"), 10);
          d3.select(this).style("opacity", idx === colIdx ? 1 : 0.2);
        });
      }

      function resetHighlight() {
        svg.selectAll(".upset-int-bar")
          .style("opacity", 1)
          .attr("filter", "none");
        svg.selectAll(".upset-matrix-link")
          .style("opacity", 1)
          .attr("stroke-width", 3);
        svg.selectAll(".upset-dot")
          .style("opacity", 1);
      }

      function showTooltip(event, d) {
        var pctOfTotal = totalVolume > 0 ? ((d.value / totalVolume) * 100).toFixed(1) + "%" : "100%";
        var secHtml = "";
        if (secondaryMeas && d.secValue !== undefined && d.secCount > 0) {
          var avgSec = d.secValue / d.secCount;
          secHtml = "<div style='display:flex; justify-content:space-between; margin-top:4px;'>" +
            "<span style='color:" + theme.subtext + ";'>" + (secondaryMeas.label_short || secondaryMeas.name) + ":</span>" +
            "<span style='font-weight:600;'>" + formatValue(avgSec, "decimal_2dp") + "</span>" +
            "</div>";
        }

        var drillHint = (d.drillLinks && d.drillLinks.length)
          ? "<div style='margin-top:8px; padding-top:6px; border-top:1px dashed " + theme.border + "; font-size:10px; color:" + theme.subtext + ";'>🔗 Click to open Looker Drill Menu</div>"
          : "";

        tooltip.innerHTML =
          "<div style='font-weight:700; font-size:13px; margin-bottom:4px; color:" + theme.text + ";'>" + d.id + "</div>" +
          "<div style='font-size:11px; color:" + theme.subtext + "; margin-bottom:6px;'>Set Degree: " + d.degree + " (" + (d.degree === 1 ? "Single Set" : "Cross-Category Bundle") + ")</div>" +
          "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
          "<span style='color:" + theme.subtext + ";'>" + (primaryMeas.label_short || primaryMeas.name) + ":</span>" +
          "<span style='font-weight:700; color:" + theme.text + ";'>" + formatValue(d.value, valFmt) + "</span>" +
          "</div>" +
          "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
          "<span style='color:" + theme.subtext + ";'>Share of Universe:</span>" +
          "<span style='font-weight:600;'>" + pctOfTotal + "</span>" +
          "</div>" +
          secHtml +
          drillHint;

        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
      }

      function moveTooltip(event) {
        var mouseX = event.clientX - vizArea.getBoundingClientRect().left;
        var mouseY = event.clientY - vizArea.getBoundingClientRect().top;
        var tipW = 240;
        var tipH = 130;

        var left = mouseX + 15;
        if (left + tipW > availW) left = mouseX - tipW - 15;
        var top = mouseY + 15;
        if (top + tipH > availH) top = mouseY - tipH - 15;

        tooltip.style.left = Math.max(8, left) + "px";
        tooltip.style.top = Math.max(8, top) + "px";
      }

      function hideTooltip() {
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
      }

      // Search Filter
      var self = this;
      function applySearch(term) {
        if (!term || !term.trim()) {
          resetHighlight();
          return;
        }
        var clean = term.toLowerCase().trim();
        renderedIntersections.forEach(function (d, colIdx) {
          var match = d.id.toLowerCase().indexOf(clean) !== -1 ||
            d.sets.some(function (s) { return s.toLowerCase().indexOf(clean) !== -1; });
          d3.selectAll(".upset-int-bar[data-col='" + colIdx + "']").style("opacity", match ? 1 : 0.15);
          d3.selectAll(".upset-matrix-link[data-col='" + colIdx + "']").style("opacity", match ? 1 : 0.1);
          d3.selectAll(".upset-dot[data-col='" + colIdx + "']").style("opacity", match ? 1 : 0.15);
        });
      }

      if (searchInput) {
        searchInput.oninput = function () {
          self._searchQuery = this.value;
          applySearch(this.value);
        };
      }
    }
  });
})();
