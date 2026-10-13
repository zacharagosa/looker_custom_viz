/**
 * Slopegraph & Multi-Period Rank Comparison - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Edward Tufte-style Slopegraph designed for multi-period rank and value progression analysis:
 * - 3 Multi-Modal Analytical Layouts:
 *     1. "dual_axis_value": Direct Value Slopegraph with calibrated dual vertical scales
 *     2. "rank_slope": Rank-Shift Ladder (1st, 2nd, 3rd...) highlighting rank gains & slips
 *     3. "delta_divergence": Normalized % Growth / Divergence Slope relative to baseline
 * - Iterative D3 Label Relaxation Algorithm: Prevents vertical label collisions and overlaps
 * - Dynamic Gainer / Decliner / Neutral Polarity Highlighting
 * - Executive KPI HUD Scorecard: Top Gainer, Top Decliner, Net Trajectory %, Median Delta, Benchmark Target
 * - Client-Side 5,000+ Row O(N) Aggregation & Interactive Search Filter
 * - Native Looker Drill-Down Menu Support
 * - Strictly 2-Tab Options Modal (Display and Style)
 */

(function () {
  "use strict";

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.select === "function") {
      callback(window.d3);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    script.onerror = function () {
      console.error("Failed to load D3.js v7 from CDN.");
    };
    document.head.appendChild(script);
  }

  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafd",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 250, 253, 0.95)",
      hudBorder: "#dadce0",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      gainer: "#137333", // Green 800
      decliner: "#c5221f", // Red 800
      neutral: "#5f6368",
      accent: "#1a73e8",
      axisLine: "#dadce0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      gainer: "#059669",
      decliner: "#dc2626",
      neutral: "#64748b",
      accent: "#2563eb",
      axisLine: "#cbd5e1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyber_teal: {
      name: "Cyber Teal (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.9)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      gainer: "#10b981",
      decliner: "#f43f5e",
      neutral: "#64748b",
      accent: "#06b6d4",
      axisLine: "#334155",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#06b6d4"
    },
    neon_violet: {
      name: "Neon Violet (Dark)",
      isDark: true,
      bg: "#0d0b18",
      cardBg: "rgba(23, 15, 38, 0.85)",
      border: "#2e1065",
      text: "#f8fafc",
      subtext: "#a78bfa",
      hudBg: "rgba(19, 11, 36, 0.9)",
      hudBorder: "rgba(91, 33, 182, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#c4b5fd",
      gainer: "#34d399",
      decliner: "#fb7185",
      neutral: "#818cf8",
      accent: "#a855f7",
      axisLine: "#4c1d95",
      tooltipBg: "rgba(19, 11, 36, 0.96)",
      tooltipBorder: "#a855f7"
    },
    emerald_growth: {
      name: "Emerald Growth (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      gainer: "#059669",
      decliner: "#ea580c",
      neutral: "#65a30d",
      accent: "#059669",
      axisLine: "#bbf7d0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
      name: "Sunset Amber (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#451a03",
      subtext: "#92400e",
      hudBg: "rgba(254, 243, 199, 0.95)",
      hudBorder: "#fcd34d",
      hudText: "#451a03",
      hudSubtext: "#92400e",
      gainer: "#d97706",
      decliner: "#e11d48",
      neutral: "#78716c",
      accent: "#f59e0b",
      axisLine: "#fde68a",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#f8fafc",
      cardBg: "#ffffff",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#475569",
      hudBg: "rgba(255, 255, 255, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#475569",
      gainer: "#0d9488",
      decliner: "#e11d48",
      neutral: "#64748b",
      accent: "#0284c7",
      axisLine: "#cbd5e1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0284c7"
    },
    custom_override: {
      name: "Custom Hex Override",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      gainer: "#10b981",
      decliner: "#ef4444",
      neutral: "#6b7280",
      accent: "#2563eb",
      axisLine: "#cbd5e1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "full_currency") {
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "compact_num") {
      if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
      return num.toLocaleString();
    } else if (fmt === "percent") {
      return (num * 100).toFixed(1) + "%";
    } else if (fmt === "decimal_2dp") {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "raw_num") {
      return String(num);
    } else if (fmt === "auto") {
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
      return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(2);
    }
    return Math.round(num).toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "slopegraph",
    label: "Slopegraph & Multi-Period Rank Comparison",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Slopegraph Layout Mode",
        display: "select",
        values: [
          { "Direct Value Slopegraph (Calibrated Scales)": "dual_axis_value" },
          { "Rank-Shift Ladder (1st, 2nd, 3rd... Shift)": "rank_slope" },
          { "Normalized % Growth Divergence": "delta_divergence" }
        ],
        default: "dual_axis_value",
        section: "Display",
        order: 1
      },
      entityDimOverride: {
        type: "string",
        label: "Entity / Category Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      periodDimOverride: {
        type: "string",
        label: "Time Period / Baseline vs Comparison Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Metric Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 5,
        display: "select",
        values: [
          { "None (No Benchmark Line)": "none" },
          { "Dataset Mean (Average Metric)": "dataset_mean" },
          { "Dataset Median (P50 Metric)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Threshold Benchmark (P90)": "percentile_p90" },
          { "Fixed Goal Value": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 6,
        default: 100000
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 7,
        default: "Target Baseline"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Outlier Shift Threshold (% Change)",
        section: "Display",
        order: 8,
        default: 50
      },
      sortOrder: {
        type: "string",
        label: "Entity Sort Ordering",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "% Growth / Delta Descending (Top Gainers)": "delta_desc" },
          { "% Growth / Delta Ascending (Top Decliners)": "delta_asc" },
          { "Baseline Period Value Descending": "baseline_desc" },
          { "Comparison Period Value Descending": "comparison_desc" },
          { "Alphabetical Entity Name": "alphabetical" }
        ],
        default: "delta_desc"
      },
      topEntities: {
        type: "string",
        label: "Entity Density Filter (Top-N)",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "All Entities (Expanded)": "all" },
          { "Top 10 Entities": "10" },
          { "Top 15 Entities": "15" },
          { "Top 20 Entities": "20" },
          { "Top 25 Entities": "25" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into 'Other' Aggregate Entity",
        section: "Display",
        order: 11,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Value Entities",
        section: "Display",
        order: 12,
        default: true
      },
      hudDensity: {
        type: "string",
        label: "Executive KPI HUD Scorecard",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Full Scorecard Banner": "full" },
          { "Compact Status Strip": "compact" },
          { "Hidden (Maximize Canvas)": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Axis Labels & Entity Titles",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "All Labels with Collision Avoidance": "all" },
          { "Significant Gainers/Decliners Only": "extremes_only" },
          { "Hidden (Tooltips Only)": "hidden" }
        ],
        default: "all"
      },
      showRankBadges: {
        type: "boolean",
        label: "Show Rank Shift Badges (▲ / ▼)",
        section: "Display",
        order: 15,
        default: true
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        section: "Display",
        order: 16,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        section: "Display",
        order: 17,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate (Light)": "modern_slate" },
          { "Cyber Teal (Dark)": "cyber_teal" },
          { "Neon Violet (Dark)": "neon_violet" },
          { "Emerald Growth (Light)": "emerald_growth" },
          { "Sunset Amber (Light)": "sunset_amber" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Gainer / Growth Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive Benchmark Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Decliner / Contraction Hex",
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
          { "Higher is Better (Revenue, Conversion, Volume)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Defect, Friction)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      lineCurve: {
        type: "string",
        label: "Slope Line Interpolation",
        display: "select",
        values: [
          { "Straight Euclidean Vectors": "straight" },
          { "Smooth Dynamic Bézier": "smooth_bezier" },
          { "Stepped Horizontal Bridge": "stepped_bridge" }
        ],
        default: "straight",
        section: "Style",
        order: 6
      },
      lineWidth: {
        type: "number",
        label: "Slope Line Stroke Width (px)",
        section: "Style",
        order: 7,
        default: 2.5
      },
      fontScale: {
        type: "string",
        label: "Typography & Label Scale",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Compact (85%)": "compact" },
          { "Standard (100%)": "standard" },
          { "Large Presentation (120%)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Primary Value Formatting",
        display: "select",
        values: [
          { "Auto / Dynamic": "auto" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Percentage (45.2%)": "percent" },
          { "Decimal (2 Decimal Places)": "decimal_2dp" },
          { "Full Currency ($1,234,567.89)": "full_currency" },
          { "Raw Integer": "raw_num" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 9
      },
      axisPadding: {
        type: "number",
        label: "Axis Margin Padding (px)",
        section: "Style",
        order: 10,
        default: 180
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields) return;
      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) {
        meas = fields.table_calculations;
      }

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" +
                      meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      var fieldSpecs = {
        entityDimOverride: { role: "dimension", defaultIdx: 0 },
        periodDimOverride: { role: "dimension", defaultIdx: dims.length > 1 ? 1 : -1 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 }
      };

      Object.keys(fieldSpecs).forEach(function (key) {
        var spec = fieldSpecs[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
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
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      this._element = element;
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      this._container = document.createElement("div");
      this._container.setAttribute("class", "slopegraph-root");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      this._searchFilter = "";
      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
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
      if (!this._windowResizeBound) {
        this._windowResizeBound = true;
        window.addEventListener("resize", function () {
          self._onResize();
        });
      }
    },

    _onResize: function () {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse || !self._container) return;

      var el = self._element || self._lastElement;
      var curW = self._container.clientWidth || (el ? el.clientWidth : 0);
      var curH = self._container.clientHeight || (el ? el.clientHeight : 0);

      if (curW <= 10 || curH <= 10) return;

      if (self._lastRenderW && self._lastRenderH) {
        if (Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) {
          return;
        }
      }

      if (self._resizeTimer) clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse && self._container) {
          ensureD3(function (d3) {
            try {
              self._render(d3, self._lastData, self._lastConfig, self._lastQueryResponse);
            } catch (e) {
              console.error("Slopegraph resize render error:", e);
            }
          });
        }
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, onComplete) {
      if (this.clearErrors) this.clearErrors();
      this._registerDynamicFieldOptions(queryResponse);

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      if (!data || data.length === 0) {
        if (this.addError) {
          this.addError({
            title: "No Data",
            message: "The query returned no results to render."
          });
        }
        if (onComplete) onComplete();
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) meas = fields.table_calculations;

      if (dims.length === 0 || meas.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Insufficient Fields",
            message: "Slopegraph requires at least 1 Entity Dimension and 1 Measure (with either a Period Dimension or 2 Measures representing baseline & comparison)."
          });
        }
        if (onComplete) onComplete();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, config, queryResponse);
        } catch (e) {
          console.error("Slopegraph render error:", e);
          if (self.addError) {
            self.addError({
              title: "Rendering Exception",
              message: e.message || "An error occurred during slopegraph rendering."
            });
          }
        }
        if (onComplete) onComplete();
      });
    },

    _parseData: function (data, queryResponse, config) {
      var self = this;
      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) meas = fields.table_calculations;

      function resolveField(list, overrideVal, fallbackIdx) {
        if (!list || list.length === 0) return null;
        if (overrideVal && typeof overrideVal === "string" && overrideVal.trim() !== "") {
          var trimmed = overrideVal.trim();
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
              return list[i];
            }
          }
          var parsedIdx = parseInt(trimmed, 10);
          if (!isNaN(parsedIdx) && parsedIdx >= 1 && parsedIdx <= list.length) {
            return list[parsedIdx - 1];
          }
        }
        if (fallbackIdx >= 0 && fallbackIdx < list.length) {
          return list[fallbackIdx];
        }
        return null;
      }

      var entityDim = resolveField(dims, config.entityDimOverride, 0);
      var periodDim = resolveField(dims, config.periodDimOverride, dims.length > 1 ? 1 : -1);
      var primMeas = resolveField(meas, config.primaryMeasureOverride, 0);
      var secMeas = meas.length > 1 ? meas[1] : null;

      var entityMap = {};
      var periods = [];
      var periodOrder = {};

      if (periodDim) {
        // Multi-row format: each row has (Entity, Period, Measure)
        data.forEach(function (row) {
          var eCell = entityDim ? row[entityDim.name] : null;
          var eName = eCell ? String(eCell.value !== undefined ? eCell.value : eCell) : "Unknown";

          var pCell = row[periodDim.name];
          var pName = pCell ? String(pCell.value !== undefined ? pCell.value : pCell) : "Period";

          var mCell = primMeas ? row[primMeas.name] : null;
          var mVal = mCell ? Number(mCell.value !== undefined ? mCell.value : mCell) || 0 : 0;

          if (!periodOrder[pName]) {
            periodOrder[pName] = Object.keys(periodOrder).length;
            periods.push(pName);
          }

          if (!entityMap[eName]) {
            entityMap[eName] = {
              name: eName,
              periods: {},
              drillData: mCell || eCell
            };
          }
          entityMap[eName].periods[pName] = mVal;
        });

        // Sort periods naturally or numerically if applicable
        periods.sort(function (a, b) {
          var numA = Number(a);
          var numB = Number(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (periodOrder[a] || 0) - (periodOrder[b] || 0);
        });
      } else if (meas.length >= 2) {
        // Multi-measure format: Measure 0 = Baseline, Measure 1 = Comparison
        periods = [
          meas[0].label_short || meas[0].label || meas[0].name,
          meas[1].label_short || meas[1].label || meas[1].name
        ];
        data.forEach(function (row) {
          var eCell = entityDim ? row[entityDim.name] : null;
          var eName = eCell ? String(eCell.value !== undefined ? eCell.value : eCell) : "Unknown";

          var m0Cell = row[meas[0].name];
          var m0Val = m0Cell ? Number(m0Cell.value !== undefined ? m0Cell.value : m0Cell) || 0 : 0;
          var m1Cell = row[meas[1].name];
          var m1Val = m1Cell ? Number(m1Cell.value !== undefined ? m1Cell.value : m1Cell) || 0 : 0;

          entityMap[eName] = {
            name: eName,
            periods: {},
            drillData: m1Cell || eCell
          };
          entityMap[eName].periods[periods[0]] = m0Val;
          entityMap[eName].periods[periods[1]] = m1Val;
        });
      }

      var baselinePeriod = periods.length > 0 ? periods[0] : "Baseline";
      var comparisonPeriod = periods.length > 1 ? periods[1] : (periods[0] || "Comparison");

      var entities = [];
      Object.keys(entityMap).forEach(function (name) {
        var e = entityMap[name];
        var v0 = e.periods[baselinePeriod] || 0;
        var v1 = e.periods[comparisonPeriod] || 0;

        if (config.suppressZeroNull !== false && v0 === 0 && v1 === 0) {
          return;
        }

        var delta = v1 - v0;
        var pctChange = v0 > 0 ? (delta / v0) : (v1 > 0 ? 1.0 : 0);

        entities.push({
          id: name,
          name: name,
          v0: v0,
          v1: v1,
          delta: delta,
          pctChange: pctChange,
          drillData: e.drillData
        });
      });

      // Filter by Search Query
      if (self._searchFilter && self._searchFilter.trim() !== "") {
        var q = self._searchFilter.trim().toLowerCase();
        entities = entities.filter(function (e) {
          return e.name.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Rank calculation
      entities.sort(function (a, b) { return b.v0 - a.v0; });
      entities.forEach(function (e, idx) { e.rank0 = idx + 1; });

      entities.sort(function (a, b) { return b.v1 - a.v1; });
      entities.forEach(function (e, idx) {
        e.rank1 = idx + 1;
        e.rankShift = e.rank0 - e.rank1; // positive = gained ranks (e.g. 5th to 2nd = +3)
      });

      // User Sort Ordering
      var sortOrder = config.sortOrder || "delta_desc";
      if (sortOrder === "delta_desc") {
        entities.sort(function (a, b) { return b.delta - a.delta; });
      } else if (sortOrder === "delta_asc") {
        entities.sort(function (a, b) { return a.delta - b.delta; });
      } else if (sortOrder === "baseline_desc") {
        entities.sort(function (a, b) { return b.v0 - a.v0; });
      } else if (sortOrder === "comparison_desc") {
        entities.sort(function (a, b) { return b.v1 - a.v1; });
      } else if (sortOrder === "alphabetical") {
        entities.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Filtering & 'Other' Rollup
      var topN = config.topEntities || "all";
      if (topN !== "all") {
        var nLimit = parseInt(topN, 10);
        if (!isNaN(nLimit) && nLimit > 0 && entities.length > nLimit) {
          var retained = entities.slice(0, nLimit);
          var dropped = entities.slice(nLimit);
          if (config.enableOtherRollup) {
            var sumV0 = 0, sumV1 = 0;
            dropped.forEach(function (d) {
              sumV0 += d.v0;
              sumV1 += d.v1;
            });
            var otherDelta = sumV1 - sumV0;
            var otherPct = sumV0 > 0 ? (otherDelta / sumV0) : 0;
            retained.push({
              id: "other_entities_rollup",
              name: "Other (" + dropped.length + ")",
              v0: sumV0,
              v1: sumV1,
              delta: otherDelta,
              pctChange: otherPct,
              rank0: retained.length + 1,
              rank1: retained.length + 1,
              rankShift: 0,
              isOther: true
            });
          }
          entities = retained;
        }
      }

      // Benchmark Target Calculation
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var targetVal = 0;
      if (entities.length > 0 && targetMode !== "none") {
        var allVals = [];
        entities.forEach(function (e) {
          allVals.push(e.v0);
          allVals.push(e.v1);
        });
        allVals.sort(function (a, b) { return a - b; });
        var sum = allVals.reduce(function (acc, v) { return acc + v; }, 0);
        var mean = sum / allVals.length;
        var median = allVals[Math.floor(allVals.length / 2)];
        var p75 = allVals[Math.floor(allVals.length * 0.75)] || median;
        var p90 = allVals[Math.floor(allVals.length * 0.90)] || p75;

        if (targetMode === "dataset_mean") targetVal = mean;
        else if (targetMode === "dataset_median") targetVal = median;
        else if (targetMode === "percentile_p75") targetVal = p75;
        else if (targetMode === "percentile_p90") targetVal = p90;
        else if (targetMode === "fixed_value") targetVal = Number(config.fixedTargetValue) || 0;
      }

      // Anomaly / Outlier tagging
      var outlierThresh = typeof config.anomalyThresholdPct !== "undefined" && config.anomalyThresholdPct !== null ? Number(config.anomalyThresholdPct) : 50;
      if (isNaN(outlierThresh)) outlierThresh = 50;
      entities.forEach(function (e) {
        e.isOutlier = Math.abs(e.pctChange * 100) >= outlierThresh;
      });

      return {
        entities: entities,
        baselinePeriod: baselinePeriod,
        comparisonPeriod: comparisonPeriod,
        metricLabel: primMeas ? (primMeas.label_short || primMeas.label || primMeas.name) : "Value",
        targetVal: targetVal,
        targetMode: targetMode,
        referenceLineLabel: config.referenceLineLabel || "Benchmark Target"
      };
    },

    _render: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var el = this._element || this._lastElement;
      var clientW = container.clientWidth || (el ? el.clientWidth : 800);
      var clientH = container.clientHeight || (el ? el.clientHeight : 500);

      this._lastRenderW = clientW;
      this._lastRenderH = clientH;

      var isCompactHeight = clientH < 340;

      var themeKey = config.colorPalette || "google_enterprise";
      var rawTheme = PALETTES[themeKey] || PALETTES.google_enterprise;
      var theme = Object.assign({}, rawTheme);

      // Custom hex overrides
      if (config.customPrimaryHex && config.customPrimaryHex.trim() !== "") {
        theme.gainer = config.customPrimaryHex.trim();
        theme.accent = config.customPrimaryHex.trim();
      }
      if (config.customPositiveHex && config.customPositiveHex.trim() !== "") {
        theme.gainer = config.customPositiveHex.trim();
      }
      if (config.customNegativeHex && config.customNegativeHex.trim() !== "") {
        theme.decliner = config.customNegativeHex.trim();
      }

      var isLowerBetter = config.metricPolarity === "lower_is_better";
      if (isLowerBetter) {
        var tmpG = theme.gainer;
        theme.gainer = theme.decliner;
        theme.decliner = tmpG;
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontMult = config.fontScale === "compact" ? 0.85 : (config.fontScale === "large" ? 1.2 : 1.0);

      var parsed = this._parseData(data, queryResponse, config);
      var entities = parsed.entities;

      if (entities.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:' + theme.subtext + ';">No matching entities found for slopegraph comparison.</div>';
        return;
      }

      // 1. Top Controls & Executive HUD
      var topControls = document.createElement("div");
      topControls.setAttribute("class", "slopegraph-top-bar");
      topControls.style.display = "flex";
      topControls.style.flexWrap = "wrap";
      topControls.style.alignItems = "center";
      topControls.style.justifyContent = "space-between";
      topControls.style.padding = isCompactHeight ? "6px 12px" : "10px 16px";
      topControls.style.gap = isCompactHeight ? "6px" : "10px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.background = theme.hudBg;
      topControls.style.boxSizing = "border-box";
      topControls.style.backdropFilter = "blur(8px)";
      topControls.style.zIndex = "10";
      topControls.style.flexShrink = "0";
      container.appendChild(topControls);

      var hudMode = config.hudDensity || "full";
      if (hudMode !== "hidden") {
        var hudGroup = document.createElement("div");
        hudGroup.style.display = "flex";
        hudGroup.style.alignItems = "center";
        hudGroup.style.gap = isCompactHeight ? "8px" : "14px";
        hudGroup.style.flexWrap = "wrap";

        // Find top gainer & decliner
        var topGainer = entities.reduce(function (max, e) { return e.delta > max.delta ? e : max; }, entities[0]);
        var topDecliner = entities.reduce(function (min, e) { return e.delta < min.delta ? e : min; }, entities[0]);
        var positiveCount = entities.filter(function (e) { return e.delta > 0; }).length;
        var netTrajectoryPct = entities.length > 0 ? (positiveCount / entities.length) * 100 : 0;

        var hudItems = [];
        if (config.customTitleOverride && config.customTitleOverride.trim() !== "") {
          hudItems.push({ label: "REPORT SCOPE", value: config.customTitleOverride.trim(), sub: "Custom Scope" });
        }
        hudItems.push({
          label: "TOP GAINER",
          value: "+" + formatValue(topGainer.delta, config.valueFormat || "compact_currency"),
          sub: topGainer.name + " (" + (topGainer.pctChange * 100).toFixed(1) + "%)",
          accentColor: theme.gainer
        });
        hudItems.push({
          label: "TOP DECLINER",
          value: formatValue(topDecliner.delta, config.valueFormat || "compact_currency"),
          sub: topDecliner.name + " (" + (topDecliner.pctChange * 100).toFixed(1) + "%)",
          accentColor: theme.decliner
        });
        hudItems.push({
          label: "NET EXPANSION",
          value: netTrajectoryPct.toFixed(0) + "% Gainers",
          sub: positiveCount + " of " + entities.length + " categories grew"
        });

        if (parsed.targetVal > 0 && parsed.targetMode !== "none") {
          hudItems.push({
            label: "BENCHMARK TARGET",
            value: formatValue(parsed.targetVal, config.valueFormat || "compact_currency"),
            sub: parsed.referenceLineLabel
          });
        }

        if (hudMode === "compact") {
          hudItems = hudItems.slice(0, 3);
        }

        hudItems.forEach(function (item) {
          var card = document.createElement("div");
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.padding = isCompactHeight ? "2px 8px" : "4px 10px";
          card.style.background = theme.isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)";
          card.style.border = "1px solid " + (item.accentColor ? item.accentColor : theme.hudBorder);
          card.style.borderRadius = "6px";

          var lbl = document.createElement("span");
          lbl.style.fontSize = Math.round((isCompactHeight ? 8.5 : 9.5) * fontMult) + "px";
          lbl.style.fontWeight = "700";
          lbl.style.letterSpacing = "0.5px";
          lbl.style.color = item.accentColor ? item.accentColor : theme.hudSubtext;
          lbl.innerText = item.label;

          var val = document.createElement("span");
          val.style.fontSize = Math.round((isCompactHeight ? 11.5 : 13.5) * fontMult) + "px";
          val.style.fontWeight = "800";
          val.style.color = item.accentColor ? item.accentColor : theme.hudText;
          val.innerText = item.value;

          var sub = document.createElement("span");
          sub.style.fontSize = Math.round((isCompactHeight ? 9 : 10) * fontMult) + "px";
          sub.style.color = theme.subtext;
          sub.style.whiteSpace = "nowrap";
          sub.style.overflow = "hidden";
          sub.style.textOverflow = "ellipsis";
          sub.style.maxWidth = isCompactHeight ? "120px" : "180px";
          sub.innerText = item.sub;

          card.appendChild(lbl);
          card.appendChild(val);
          card.appendChild(sub);
          hudGroup.appendChild(card);
        });
        topControls.appendChild(hudGroup);
      }

      // Search Filter Input
      if (config.showSearch !== false) {
        var filterGroup = document.createElement("div");
        filterGroup.style.display = "flex";
        filterGroup.style.alignItems = "center";
        filterGroup.style.gap = "8px";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter entities...";
        searchInput.value = self._searchFilter || "";
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.borderRadius = "5px";
        searchInput.style.padding = "4px 8px";
        searchInput.style.fontSize = "11.5px";
        searchInput.style.width = "120px";
        searchInput.style.outline = "none";

        searchInput.addEventListener("input", function (e) {
          self._searchFilter = e.target.value;
          self._render(d3, data, config, queryResponse);
        });
        filterGroup.appendChild(searchInput);
        topControls.appendChild(filterGroup);
      }

      // 2. Main Chart SVG Wrapper
      var chartWrapper = document.createElement("div");
      chartWrapper.setAttribute("class", "slopegraph-chart-wrapper");
      chartWrapper.style.flex = "1 1 0";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      var topH = topControls.offsetHeight || (isCompactHeight ? 40 : 50);
      var totalW = chartWrapper.clientWidth || container.clientWidth || 800;
      var totalH = chartWrapper.clientHeight || Math.max(160, clientH - topH);

      // Tooltip
      var tooltip = document.createElement("div");
      tooltip.setAttribute("class", "slopegraph-tooltip");
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = theme.tooltipBg;
      tooltip.style.border = "1px solid " + theme.tooltipBorder;
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
      tooltip.style.color = theme.text;
      tooltip.style.fontSize = "12px";
      tooltip.style.zIndex = "100";
      tooltip.style.backdropFilter = "blur(8px)";
      chartWrapper.appendChild(tooltip);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + totalW + " " + totalH)
        .style("display", "block");

      // Layout geometry
      var axisPadding = typeof config.axisPadding !== "undefined" && config.axisPadding !== null ? Number(config.axisPadding) : 180;
      if (isNaN(axisPadding)) axisPadding = 180;
      axisPadding = Math.max(100, Math.min(totalW * 0.35, axisPadding));

      var margin = {
        top: isCompactHeight ? 35 : 55,
        right: axisPadding,
        bottom: isCompactHeight ? 25 : 40,
        left: axisPadding
      };

      var innerW = Math.max(60, totalW - margin.left - margin.right);
      var innerH = Math.max(60, totalH - margin.top - margin.bottom);

      var x0 = margin.left;
      var x1 = margin.left + innerW;

      var layoutMode = config.layoutMode || "dual_axis_value";

      // Scales
      var y0Scale, y1Scale;
      if (layoutMode === "rank_slope") {
        // Rank ladder: 1 at top, N at bottom
        var maxRank = Math.max(entities.length, d3.max(entities, function (e) { return Math.max(e.rank0, e.rank1); }) || 1);
        y0Scale = d3.scaleLinear().domain([1, maxRank]).range([margin.top, margin.top + innerH]);
        y1Scale = d3.scaleLinear().domain([1, maxRank]).range([margin.top, margin.top + innerH]);
      } else if (layoutMode === "delta_divergence") {
        // Normalized % Growth
        var minPct = d3.min(entities, function (e) { return e.pctChange; }) || -0.2;
        var maxPct = d3.max(entities, function (e) { return e.pctChange; }) || 0.5;
        var bound = Math.max(Math.abs(minPct), Math.abs(maxPct), 0.1);
        y0Scale = d3.scaleLinear().domain([0, 0]).range([margin.top + innerH / 2, margin.top + innerH / 2]);
        y1Scale = d3.scaleLinear().domain([-bound, bound]).range([margin.top + innerH, margin.top]);
      } else {
        // Direct value mode (dual calibrated scales)
        var maxVal = d3.max(entities, function (e) { return Math.max(e.v0, e.v1); }) || 1;
        var minVal = Math.min(0, d3.min(entities, function (e) { return Math.min(e.v0, e.v1); }) || 0);
        y0Scale = d3.scaleLinear().domain([minVal, maxVal]).range([margin.top + innerH, margin.top]).nice();
        y1Scale = d3.scaleLinear().domain([minVal, maxVal]).range([margin.top + innerH, margin.top]).nice();
      }

      // Compute raw Y coordinates
      entities.forEach(function (e) {
        if (layoutMode === "rank_slope") {
          e.y0 = y0Scale(e.rank0);
          e.y1 = y1Scale(e.rank1);
        } else if (layoutMode === "delta_divergence") {
          e.y0 = margin.top + innerH / 2;
          e.y1 = y1Scale(e.pctChange);
        } else {
          e.y0 = y0Scale(e.v0);
          e.y1 = y1Scale(e.v1);
        }
      });

      // Iterative Label Relaxation Algorithm
      function relaxLabels(items, keyY, minY, maxY, minGap) {
        var sorted = items.slice().sort(function (a, b) { return a[keyY] - b[keyY]; });
        sorted.forEach(function (d) { d["relaxed_" + keyY] = d[keyY]; });

        var iterations = 16;
        for (var it = 0; it < iterations; it++) {
          // Downward sweep
          for (var i = 1; i < sorted.length; i++) {
            var prev = sorted[i - 1];
            var curr = sorted[i];
            var gap = curr["relaxed_" + keyY] - prev["relaxed_" + keyY];
            if (gap < minGap) {
              curr["relaxed_" + keyY] = prev["relaxed_" + keyY] + minGap;
            }
          }
          // Upward sweep
          for (var j = sorted.length - 2; j >= 0; j--) {
            var next = sorted[j + 1];
            var cur = sorted[j];
            var g = next["relaxed_" + keyY] - cur["relaxed_" + keyY];
            if (g < minGap) {
              cur["relaxed_" + keyY] = next["relaxed_" + keyY] - minGap;
            }
          }
        }

        // Clamp inside visible bounds
        var overflowBottom = sorted[sorted.length - 1]["relaxed_" + keyY] - maxY;
        if (overflowBottom > 0) {
          sorted.forEach(function (d) { d["relaxed_" + keyY] -= overflowBottom; });
        }
        var overflowTop = minY - sorted[0]["relaxed_" + keyY];
        if (overflowTop > 0) {
          sorted.forEach(function (d) { d["relaxed_" + keyY] += overflowTop; });
        }
      }

      var minLabelGap = Math.max(12, Math.min(22, (innerH / Math.max(1, entities.length)) * 1.1)) * fontMult;
      relaxLabels(entities, "y0", margin.top, margin.top + innerH, minLabelGap);
      relaxLabels(entities, "y1", margin.top, margin.top + innerH, minLabelGap);

      // Draw Axis Lines
      var axesG = svg.append("g").attr("class", "slope-axes");

      // Axis 0 (Left - Baseline)
      axesG.append("line")
        .attr("x1", x0)
        .attr("y1", margin.top)
        .attr("x2", x0)
        .attr("y2", margin.top + innerH)
        .attr("stroke", theme.axisLine)
        .attr("stroke-width", 2);

      // Axis 1 (Right - Comparison)
      axesG.append("line")
        .attr("x1", x1)
        .attr("y1", margin.top)
        .attr("x2", x1)
        .attr("y2", margin.top + innerH)
        .attr("stroke", theme.axisLine)
        .attr("stroke-width", 2);

      // Axis Header Titles
      var titleY = margin.top - (isCompactHeight ? 14 : 20);
      axesG.append("text")
        .attr("x", x0)
        .attr("y", titleY)
        .attr("text-anchor", "middle")
        .attr("fill", theme.text)
        .attr("font-size", Math.round(13 * fontMult) + "px")
        .attr("font-weight", "800")
        .text(parsed.baselinePeriod.toUpperCase());

      axesG.append("text")
        .attr("x", x1)
        .attr("y", titleY)
        .attr("text-anchor", "middle")
        .attr("fill", theme.text)
        .attr("font-size", Math.round(13 * fontMult) + "px")
        .attr("font-weight", "800")
        .text(parsed.comparisonPeriod.toUpperCase());

      // Benchmark Target Line
      if (parsed.targetVal > 0 && parsed.targetMode !== "none" && layoutMode === "dual_axis_value") {
        var targetY = y0Scale(parsed.targetVal);
        if (targetY >= margin.top && targetY <= margin.top + innerH) {
          axesG.append("line")
            .attr("x1", x0 - 15)
            .attr("y1", targetY)
            .attr("x2", x1 + 15)
            .attr("y2", targetY)
            .attr("stroke", theme.accent)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .attr("stroke-opacity", 0.7);

          axesG.append("text")
            .attr("x", (x0 + x1) / 2)
            .attr("y", targetY - 5)
            .attr("text-anchor", "middle")
            .attr("fill", theme.accent)
            .attr("font-size", Math.round(10 * fontMult) + "px")
            .attr("font-weight", "700")
            .text(parsed.referenceLineLabel + " (" + formatValue(parsed.targetVal, config.valueFormat || "compact_currency") + ")");
        }
      }

      // Draw Slope Paths
      var pathsG = svg.append("g").attr("class", "slope-lines");
      var strokeW = Number(config.lineWidth) || 2.5;
      var curveType = config.lineCurve || "straight";

      entities.forEach(function (e) {
        var isGain = isLowerBetter ? (e.delta < 0) : (e.delta > 0);
        var isFlat = e.delta === 0;
        var color = isFlat ? theme.neutral : (isGain ? theme.gainer : theme.decliner);

        var pathD;
        if (curveType === "smooth_bezier") {
          var midX = (x0 + x1) / 2;
          pathD = "M " + x0 + " " + e.y0 + " C " + midX + " " + e.y0 + ", " + midX + " " + e.y1 + ", " + x1 + " " + e.y1;
        } else if (curveType === "stepped_bridge") {
          var stepX = x0 + (x1 - x0) * 0.45;
          var stepX2 = x0 + (x1 - x0) * 0.55;
          pathD = "M " + x0 + " " + e.y0 + " L " + stepX + " " + e.y0 + " L " + stepX2 + " " + e.y1 + " L " + x1 + " " + e.y1;
        } else {
          pathD = "M " + x0 + " " + e.y0 + " L " + x1 + " " + e.y1;
        }

        var path = pathsG.append("path")
          .attr("d", pathD)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", strokeW)
          .attr("stroke-linecap", "round")
          .attr("stroke-opacity", 0.75)
          .attr("class", "slope-path")
          .style("cursor", "pointer");

        // Vertex Dots
        var dot0 = pathsG.append("circle")
          .attr("cx", x0)
          .attr("cy", e.y0)
          .attr("r", strokeW + 1.5)
          .attr("fill", color)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer");

        var dot1 = pathsG.append("circle")
          .attr("cx", x1)
          .attr("cy", e.y1)
          .attr("r", strokeW + 1.5)
          .attr("fill", color)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer");

        // Connecting tick lines to relaxed labels if displaced
        if (Math.abs(e.y0 - e.relaxed_y0) > 2) {
          pathsG.append("line")
            .attr("x1", x0)
            .attr("y1", e.y0)
            .attr("x2", x0 - 10)
            .attr("y2", e.relaxed_y0)
            .attr("stroke", theme.axisLine)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2 2");
        }
        if (Math.abs(e.y1 - e.relaxed_y1) > 2) {
          pathsG.append("line")
            .attr("x1", x1)
            .attr("y1", e.y1)
            .attr("x2", x1 + 10)
            .attr("y2", e.relaxed_y1)
            .attr("stroke", theme.axisLine)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "2 2");
        }

        // Labels
        var showLabels = config.labelDensity !== "hidden";
        var isExtreme = e.isOutlier || Math.abs(e.pctChange) > 0.4;
        if (config.labelDensity === "extremes_only") {
          showLabels = isExtreme;
        }

        var labelG0, labelG1;
        if (showLabels) {
          // Left Label (Entity Name + Baseline Value)
          labelG0 = pathsG.append("g")
            .attr("transform", "translate(" + (x0 - 14) + "," + e.relaxed_y0 + ")")
            .style("cursor", "pointer");

          var rankStr0 = config.showRankBadges !== false ? ("#" + e.rank0 + " ") : "";
          var valStr0 = formatValue(e.v0, config.valueFormat || "compact_currency");

          labelG0.append("text")
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("fill", theme.text)
            .attr("font-size", Math.round(11 * fontMult) + "px")
            .attr("font-weight", "600")
            .text(rankStr0 + e.name + " ")
            .append("tspan")
            .attr("fill", theme.subtext)
            .attr("font-weight", "400")
            .text(valStr0);

          // Right Label (Comparison Value + % Delta + Rank Shift)
          labelG1 = pathsG.append("g")
            .attr("transform", "translate(" + (x1 + 14) + "," + e.relaxed_y1 + ")")
            .style("cursor", "pointer");

          var rankShiftBadge = "";
          if (config.showRankBadges !== false && e.rankShift !== 0) {
            rankShiftBadge = e.rankShift > 0 ? (" \u25B2" + e.rankShift) : (" \u25BC" + Math.abs(e.rankShift));
          }

          var pctStr = (e.pctChange >= 0 ? "+" : "") + (e.pctChange * 100).toFixed(1) + "%";
          var valStr1 = formatValue(e.v1, config.valueFormat || "compact_currency");

          labelG1.append("text")
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("fill", color)
            .attr("font-size", Math.round(11 * fontMult) + "px")
            .attr("font-weight", "700")
            .text(valStr1 + " (" + pctStr + ")")
            .append("tspan")
            .attr("fill", e.rankShift > 0 ? theme.gainer : (e.rankShift < 0 ? theme.decliner : theme.subtext))
            .attr("font-weight", "800")
            .text(rankShiftBadge);
        }

        // Hover & Drill Interactivity
        var interactiveGroup = [path.node(), dot0.node(), dot1.node()];
        if (labelG0) interactiveGroup.push(labelG0.node());
        if (labelG1) interactiveGroup.push(labelG1.node());

        interactiveGroup.forEach(function (elem) {
          if (!elem) return;
          d3.select(elem)
            .on("mouseenter", function (evt) {
              pathsG.selectAll(".slope-path").attr("stroke-opacity", 0.15);
              path.attr("stroke-opacity", 1.0).attr("stroke-width", strokeW + 2);
              dot0.attr("r", strokeW + 3);
              dot1.attr("r", strokeW + 3);

              tooltip.style.display = "block";
              var badgeColor = color;
              var sign = e.delta >= 0 ? "+" : "";

              tooltip.innerHTML =
                '<div style="font-weight:800;font-size:13px;margin-bottom:6px;border-bottom:1px solid ' + theme.border + ';padding-bottom:4px;">' +
                e.name +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">' +
                '<span style="color:' + theme.subtext + ';">' + parsed.baselinePeriod + ':</span>' +
                '<b>' + formatValue(e.v0, config.valueFormat || "compact_currency") + ' (#' + e.rank0 + ')</b>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:6px;">' +
                '<span style="color:' + theme.subtext + ';">' + parsed.comparisonPeriod + ':</span>' +
                '<b>' + formatValue(e.v1, config.valueFormat || "compact_currency") + ' (#' + e.rank1 + ')</b>' +
                '</div>' +
                '<div style="border-top:1px dashed ' + theme.border + ';padding-top:4px;display:flex;justify-content:space-between;gap:16px;">' +
                '<span>Growth Shift:</span>' +
                '<span style="font-weight:800;color:' + badgeColor + ';">' + sign + formatValue(e.delta, config.valueFormat || "compact_currency") + ' (' + (e.pctChange * 100).toFixed(1) + '%)</span>' +
                '</div>' +
                (e.rankShift !== 0 ? ('<div style="font-size:10.5px;color:' + (e.rankShift > 0 ? theme.gainer : theme.decliner) + ';margin-top:2px;">' + (e.rankShift > 0 ? '\u25B2 Moved up ' + e.rankShift + ' ranks' : '\u25BC Dropped ' + Math.abs(e.rankShift) + ' ranks') + '</div>') : '');

              var rect = container.getBoundingClientRect();
              var tipX = evt.clientX - rect.left + 15;
              var tipY = evt.clientY - rect.top + 15;
              if (tipX + 220 > totalW) tipX = evt.clientX - rect.left - 230;
              if (tipY + 140 > totalH) tipY = evt.clientY - rect.top - 140;
              tooltip.style.left = tipX + "px";
              tooltip.style.top = tipY + "px";
            })
            .on("mousemove", function (evt) {
              var rect = container.getBoundingClientRect();
              var tipX = evt.clientX - rect.left + 15;
              var tipY = evt.clientY - rect.top + 15;
              if (tipX + 220 > totalW) tipX = evt.clientX - rect.left - 230;
              if (tipY + 140 > totalH) tipY = evt.clientY - rect.top - 140;
              tooltip.style.left = tipX + "px";
              tooltip.style.top = tipY + "px";
            })
            .on("mouseleave", function () {
              pathsG.selectAll(".slope-path").attr("stroke-opacity", 0.75).attr("stroke-width", strokeW);
              dot0.attr("r", strokeW + 1.5);
              dot1.attr("r", strokeW + 1.5);
              tooltip.style.display = "none";
            })
            .on("click", function (evt) {
              if (e.drillData && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({
                  links: e.drillData.links || [],
                  event: evt
                });
              }
            });
        });
      });
    }
  });
})();
