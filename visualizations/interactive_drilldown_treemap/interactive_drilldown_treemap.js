/**
 * Interactive Hierarchical Drilldown Treemap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/328594464: "Data Analytics > Looker > Treemap Visualization for Looker [Cloud Blocker]"
 * - b/396197680: "Data Analytics > Looker > Treemap Color by dimension [Cloud Blocker]"
 * - b/530822261: "Data Analytics > Looker > Native 'Top N and Others' Visualization Bucketing [Cloud Blocker]"
 * - b/325124429: "Woolworths - Availability of new vizualization features: Treemap Support"
 *
 * Upgraded with Full Flexibility Engine:
 * - Dynamic Field-Role Mapping (L1/L2/L3 Dimensions & Primary/Secondary Measures)
 * - Configurable Reference Benchmarks & Targets (Mean, Median, P75, P90, Fixed Goal)
 * - Sorting, Top-N Density & Other Rollup
 * - Multi-Density Executive HUD (Full, Compact, Hidden) & Title/Subtitle Overrides
 * - Brand Color Palettes, Custom Hex Overrides, Polarity Inversion & Typography Scales
 * - Debounced ResizeObserver (<4px guard) & Looker Native Drill Menus
 * - Strictly 2 Option Sections: 'Display' and 'Style'
 */

(function () {
  var COLOR_THEMES = {
    google: {
      name: "Looker / Google Modern",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60"],
      bg: "#ffffff",
      text: "#1f2937",
      subtext: "#6b7280",
      border: "#e5e7eb",
      hudBg: "#f8fafc",
      tileBorder: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbActive: "#1e293b",
      searchBg: "#ffffff",
      searchBorder: "#cbd5e1",
      diverging: ["#EA4335", "#FBBC04", "#34A853"],
      sequential: ["#E8F0FE", "#8AB4F8", "#4285F4", "#1967D2", "#174EA6"]
    },
    executive_slate: {
      name: "Executive Slate & Indigo",
      colors: ["#4f46e5", "#0284c7", "#0d9488", "#475569", "#7c3aed", "#2563eb", "#64748b", "#0891b2", "#059669", "#d97706"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "#f8fafc",
      tileBorder: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbActive: "#0f172a",
      searchBg: "#ffffff",
      searchBorder: "#cbd5e1",
      diverging: ["#f43f5e", "#fbbf24", "#10b981"],
      sequential: ["#e0e7ff", "#a5b4fc", "#6366f1", "#4f46e5", "#3730a3"]
    },
    emerald_mint: {
      name: "Emerald FinOps",
      colors: ["#059669", "#0d9488", "#10b981", "#34d399", "#0284c7", "#047857", "#065f46", "#14b8a6", "#3b82f6", "#f59e0b"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#d1fae5",
      hudBg: "#f0fdf4",
      tileBorder: "#ffffff",
      breadcrumbBg: "#ecfdf5",
      breadcrumbActive: "#064e3b",
      searchBg: "#ffffff",
      searchBorder: "#a7f3d0",
      diverging: ["#ef4444", "#f59e0b", "#10b981"],
      sequential: ["#d1fae5", "#6ee7b7", "#10b981", "#059669", "#064e3b"]
    },
    sunset_ember: {
      name: "Sunset Media",
      colors: ["#f97316", "#ef4444", "#f59e0b", "#e11d48", "#ec4899", "#8b5cf6", "#d97706", "#b91c1c", "#4f46e5", "#0284c7"],
      bg: "#ffffff",
      text: "#7c2d12",
      subtext: "#9a3412",
      border: "#fed7aa",
      hudBg: "#fff7ed",
      tileBorder: "#ffffff",
      breadcrumbBg: "#ffedd5",
      breadcrumbActive: "#7c2d12",
      searchBg: "#ffffff",
      searchBorder: "#fdba74",
      diverging: ["#dc2626", "#fbbf24", "#16a34a"],
      sequential: ["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"]
    },
    cyber_neon: {
      name: "Cyberpunk Dark",
      colors: ["#00f5d4", "#f72585", "#7209b7", "#4cc9f0", "#fee440", "#ff007f", "#3a0ca3", "#4361ee", "#10b981", "#f97316"],
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#334155",
      hudBg: "#1e293b",
      tileBorder: "#0f172a",
      breadcrumbBg: "#1e293b",
      breadcrumbActive: "#38bdf8",
      searchBg: "#1e293b",
      searchBorder: "#475569",
      diverging: ["#f43f5e", "#facc15", "#2dd4bf"],
      sequential: ["#1e293b", "#0284c7", "#38bdf8", "#7dd3fc", "#e0f2fe"]
    },
    wellverse: {
      name: "Wellverse Healthcare",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#1E467A", "#7C5CFC", "#14B8A6", "#E5484D", "#FFB500", "#64748B", "#008C52"],
      bg: "#ffffff",
      text: "#0F172A",
      subtext: "#64748B",
      border: "#E2E8F0",
      hudBg: "#F8FAFC",
      tileBorder: "#ffffff",
      breadcrumbBg: "#F8FAFC",
      breadcrumbActive: "#143359",
      searchBg: "#ffffff",
      searchBorder: "#E2E8F0",
      diverging: ["#E5484D", "#FFB500", "#00AF68"],
      sequential: ["#EEF2F7", "#CDEFDD", "#7FD8AE", "#00AF68", "#143359"]
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
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
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
    if (window.d3 && typeof window.d3.treemap === "function") {
      callback(window.d3);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  looker.plugins.visualizations.add({
    id: "interactive_drilldown_treemap",
    label: "Interactive Hierarchical Drilldown Treemap",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY
      // ==========================================
      displayMode: {
        type: "string",
        label: "Display Mode",
        default: "drilldown",
        display: "select",
        values: [
          { "Hierarchical Zoom & Breadcrumbs": "drilldown" },
          { "Nested Multi-Tier (All Levels)": "nested" },
          { "Dynamic Top-N & Others Bucketing": "flat_top_n" }
        ],
        section: "Display",
        order: 1
      },
      tilingMethod: {
        type: "string",
        label: "Tiling Algorithm",
        default: "squarify",
        display: "select",
        values: [
          { "Squarified (Golden Ratio Aspect)": "squarify" },
          { "Binary (Balanced Partition)": "binary" },
          { "Dice (Horizontal Striping)": "dice" }
        ],
        section: "Display",
        order: 2
      },
      colorMode: {
        type: "string",
        label: "Color Encoding Mode",
        default: "branch",
        display: "select",
        values: [
          { "Categorical by Hierarchy Branch": "branch" },
          { "Secondary Metric Diverging Gradient": "metric_diverging" },
          { "Secondary Metric Sequential Gradient": "metric_sequential" },
          { "Monochromatic Depth Shading": "depth" }
        ],
        section: "Display",
        order: 3
      },
      primaryDimOverride: {
        type: "string",
        label: "Primary Hierarchy Dimension (L1)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      secondaryDimOverride: {
        type: "string",
        label: "Secondary Hierarchy Dimension (L2)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      tertiaryDimOverride: {
        type: "string",
        label: "Tertiary Hierarchy Dimension (L3)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Measure (Tile Sizing)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary Measure (Color / Badge)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 8
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "None (No Benchmark Scorecard)": "none" },
          { "Dataset Mean (Average Branch Volume)": "dataset_mean" },
          { "Dataset Median (P50 Branch Volume)": "dataset_median" },
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
        order: 10,
        default: 100000
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 11,
        default: "Benchmark Target"
      },
      underperformanceThresholdPct: {
        type: "number",
        label: "Underperformance Alert Threshold (%)",
        section: "Display",
        order: 12,
        default: 20
      },
      sortOrder: {
        type: "string",
        label: "Node Hierarchy Sort Order",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Metric Descending (Largest First)": "desc" },
          { "Metric Ascending (Smallest First)": "asc" },
          { "Alphabetical Name (A to Z)": "alpha" },
          { "Natural / Explore Order": "natural" }
        ],
        default: "desc"
      },
      topNCount: {
        type: "string",
        label: "Top-N / Tail Consolidation",
        default: "50",
        display: "select",
        values: [
          { "Top 10": "10" },
          { "Top 20": "20" },
          { "Top 50": "50" },
          { "Top 100": "100" },
          { "All Nodes (Uncapped)": "all" }
        ],
        section: "Display",
        order: 14
      },
      showOthersRollup: {
        type: "boolean",
        label: "Group Tail into '+N Others' Node",
        section: "Display",
        order: 15,
        default: true
      },
      suppressZeros: {
        type: "boolean",
        label: "Suppress Zero / Null Value Tiles",
        section: "Display",
        order: 16,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 17,
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
        order: 18,
        display: "select",
        values: [
          { "All Visible Tiles": "all" },
          { "High-Value Peaks Only": "min_max" },
          { "Hidden (No In-Tile Labels)": "hidden" }
        ],
        default: "all"
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 19,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 20,
        default: ""
      },
      showBreadcrumbs: {
        type: "boolean",
        label: "Show Breadcrumb Navigation Bar",
        default: true,
        section: "Display",
        order: 21
      },
      showSearch: {
        type: "boolean",
        label: "Show Quick Search Filter Bar",
        default: true,
        section: "Display",
        order: 22
      },
      tilePadding: {
        type: "string",
        label: "Tile Inner Spacing",
        default: "2",
        display: "select",
        values: [
          { "Flush (0px)": "0" },
          { "Compact (2px)": "2" },
          { "Standard (4px)": "4" },
          { "Relaxed (6px)": "6" }
        ],
        section: "Display",
        order: 23
      },

      // ==========================================
      // SECTION 2: STYLE
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Color Palette Theme",
        default: "google",
        display: "select",
        values: [
          { "Looker / Google Modern": "google" },
          { "Executive Slate & Indigo": "executive_slate" },
          { "Emerald FinOps": "emerald_mint" },
          { "Sunset Media": "sunset_ember" },
          { "Cyberpunk Dark": "cyber_neon" },
          { "Wellverse Healthcare": "wellverse" },
          { "Custom Hex Overrides": "custom" }
        ],
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: "#4285F4"
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Outperforming Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: "#34A853"
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Underperforming Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: "#EA4335"
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Standard / Revenue / Units)": "higher_is_better" },
          { "Lower is Better (Inverted / Cost / Churn / Latency)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Font Scale / Text Density",
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
        label: "Primary Metric Value Format",
        default: "compact_currency",
        display: "select",
        values: [
          { "Auto / Context Aware": "auto" },
          { "Compact Currency (.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2dp" },
          { "Raw Number": "raw" }
        ],
        section: "Style",
        order: 7
      },
      tileCornerRadius: {
        type: "string",
        label: "Tile Corner Radius",
        default: "4",
        display: "select",
        values: [
          { "Sharp (0px)": "0" },
          { "Subtle (4px)": "4" },
          { "Modern Rounded (8px)": "8" }
        ],
        section: "Style",
        order: 8
      },
      showSecondaryMetricInLabel: {
        type: "boolean",
        label: "Show Secondary Metric in Tile Label",
        default: true,
        section: "Style",
        order: 9
      },
      hoverEffect: {
        type: "string",
        label: "Hover Animation Effect",
        default: "elevate",
        display: "select",
        values: [
          { "Elevate & Glow Focus": "elevate" },
          { "Brighten Fill": "brighten" },
          { "Subtle Border Stroke": "border" }
        ],
        section: "Style",
        order: 10
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
      this._activeDrillNode = null;
      this._searchTerm = "";
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      var container = document.createElement("div");
      container.className = "looker-treemap-root";
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

      var l1Dim = resolveField(rawDims, config.primaryDimOverride, 0);
      var l2Dim = resolveField(rawDims, config.secondaryDimOverride, rawDims.length > 1 ? 1 : -1);
      var l3Dim = resolveField(rawDims, config.tertiaryDimOverride, rawDims.length > 2 ? 2 : -1);

      var dimFields = [];
      if (l1Dim) dimFields.push(l1Dim);
      if (l2Dim && l2Dim !== l1Dim) dimFields.push(l2Dim);
      if (l3Dim && l3Dim !== l1Dim && l3Dim !== l2Dim) dimFields.push(l3Dim);

      if (dimFields.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Insufficient Dimensions",
            message: "The Interactive Drilldown Treemap requires at least 1 Dimension (e.g. Department > Category > Brand)."
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
            message: "The Interactive Drilldown Treemap requires at least 1 Measure for tile sizing (e.g. Total Sales)."
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
          console.error("Interactive Treemap Render Error:", err);
          if (self.addError) {
            self.addError({
              title: "Render Error",
              message: "Unable to render treemap: " + err.message
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

      var themeKey = config.colorTheme || "google";
      var theme = COLOR_THEMES[themeKey] || COLOR_THEMES.google;
      if (themeKey === "custom") {
        var pCol = config.customPrimaryColor || "#4285F4";
        var posCol = config.customPositiveColor || "#34A853";
        var negCol = config.customNegativeColor || "#EA4335";
        theme = {
          name: "Custom",
          colors: [pCol, posCol, "#FBBC04", negCol, "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0"],
          bg: "#ffffff",
          text: "#1f2937",
          subtext: "#6b7280",
          border: "#e5e7eb",
          hudBg: "#f8fafc",
          tileBorder: "#ffffff",
          breadcrumbBg: "#f1f5f9",
          breadcrumbActive: pCol,
          searchBg: "#ffffff",
          searchBorder: "#cbd5e1",
          diverging: [negCol, "#FBBC04", posCol],
          sequential: ["#EEF2F7", pCol, "#174EA6"]
        };
      }

      var isPolarityInverted = config.metricPolarity === "lower_is_better";
      var effectiveDiverging = isPolarityInverted ? [theme.diverging[2], theme.diverging[1], theme.diverging[0]] : theme.diverging;

      var fontScale = config.fontScale || "standard";
      var fontMul = fontScale === "compact" ? 0.85 : (fontScale === "large" ? 1.15 : 1.0);

      var displayMode = config.displayMode || "drilldown";
      var tilingMethod = config.tilingMethod || "squarify";
      var colorMode = config.colorMode || "branch";
      var topN = config.topNCount === "all" ? 999999 : parseInt(config.topNCount || "50", 10);
      var valFmt = config.valueFormat || "compact_currency";
      var pad = parseInt(config.tilePadding || "2", 10);
      var radius = parseInt(config.tileCornerRadius || "4", 10);
      var baseFontSize = Math.round(12 * fontMul);
      var hudMode = config.hudMode || "full";
      var labelDensity = config.labelDensity || "all";
      var showBreadcrumbs = config.showBreadcrumbs !== false;
      var showSearch = config.showSearch !== false;
      var showSecMetric = config.showSecondaryMetricInLabel !== false;
      var hoverStyle = config.hoverEffect || "elevate";
      var suppressZeros = config.suppressZeros !== false;
      var sortOrder = config.sortOrder || "desc";

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Build Hierarchical Data Tree with Aggregation
      var rootData = {
        name: "All",
        id: "root",
        depth: 0,
        children: []
      };

      var totalSum = 0;
      var totalCount = 0;
      var topCategoryMap = {};
      var l1Values = [];

      data.forEach(function (row) {
        var primCell = row[primaryMeas.name];
        var primVal = primCell && primCell.value !== null ? Number(primCell.value) : 0;
        if (isNaN(primVal)) primVal = 0;
        if (suppressZeros && primVal <= 0) return;

        var secCell = secondaryMeas ? row[secondaryMeas.name] : null;
        var secVal = secCell && secCell.value !== null ? Number(secCell.value) : null;
        if (secVal !== null && isNaN(secVal)) secVal = null;

        totalSum += primVal;
        totalCount++;

        var curr = rootData;
        for (var i = 0; i < dimFields.length; i++) {
          var dimName = dimFields[i].name;
          var dimCell = row[dimName];
          var dimVal = dimCell && dimCell.value !== null ? String(dimCell.value) : "(Blank)";
          var isLeaf = (i === dimFields.length - 1);

          if (i === 0) {
            topCategoryMap[dimVal] = (topCategoryMap[dimVal] || 0) + primVal;
          }

          var existing = null;
          if (curr.children) {
            for (var c = 0; c < curr.children.length; c++) {
              if (curr.children[c].name === dimVal) {
                existing = curr.children[c];
                break;
              }
            }
          } else {
            curr.children = [];
          }

          if (!existing) {
            existing = {
              name: dimVal,
              id: (curr.id + "/" + dimVal).replace(/\s+/g, "_"),
              depth: i + 1,
              dimField: dimFields[i],
              drillLinks: dimCell && dimCell.links ? dimCell.links : (primCell && primCell.links ? primCell.links : []),
              branchName: i === 0 ? dimVal : curr.branchName,
              value: 0,
              secValue: 0,
              secCount: 0,
              children: isLeaf ? undefined : []
            };
            curr.children.push(existing);
          }

          existing.value += primVal;
          if (secVal !== null) {
            existing.secValue = (existing.secValue || 0) + secVal;
            existing.secCount = (existing.secCount || 0) + 1;
          }

          curr = existing;
        }
      });

      // Collect L1 branch values for benchmark statistics
      if (rootData.children) {
        rootData.children.forEach(function (c) {
          l1Values.push(c.value);
        });
      }
      l1Values.sort(function (a, b) { return a - b; });

      // Benchmark Target Calculation
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var benchmarkTarget = null;
      if (targetMode === "fixed_value") {
        benchmarkTarget = Number(config.fixedTargetValue || 100000);
      } else if (l1Values.length > 0) {
        if (targetMode === "dataset_mean") {
          benchmarkTarget = totalSum / (l1Values.length || 1);
        } else if (targetMode === "dataset_median") {
          var mid = Math.floor(l1Values.length / 2);
          benchmarkTarget = l1Values.length % 2 !== 0 ? l1Values[mid] : (l1Values[mid - 1] + l1Values[mid]) / 2;
        } else if (targetMode === "percentile_p75") {
          var p75Idx = Math.floor(l1Values.length * 0.75);
          benchmarkTarget = l1Values[Math.min(l1Values.length - 1, p75Idx)];
        } else if (targetMode === "percentile_p90") {
          var p90Idx = Math.floor(l1Values.length * 0.90);
          benchmarkTarget = l1Values[Math.min(l1Values.length - 1, p90Idx)];
        }
      }

      var underperfThreshold = Number(config.underperformanceThresholdPct || 20) / 100;
      var underperfCount = 0;
      if (benchmarkTarget && rootData.children) {
        rootData.children.forEach(function (c) {
          var ratio = c.value / (benchmarkTarget || 1);
          var isUnder = isPolarityInverted ? ratio > (1 + underperfThreshold) : ratio < (1 - underperfThreshold);
          if (isUnder) underperfCount++;
        });
      }

      // Top contributor calculation
      var topBranchName = "-";
      var topBranchVal = 0;
      Object.keys(topCategoryMap).forEach(function (k) {
        if (topCategoryMap[k] > topBranchVal) {
          topBranchVal = topCategoryMap[k];
          topBranchName = k;
        }
      });
      var topBranchShare = totalSum > 0 ? ((topBranchVal / totalSum) * 100).toFixed(1) + "%" : "0%";

      // Branch colors
      var branchColorMap = {};
      if (rootData.children) {
        rootData.children.forEach(function (child, idx) {
          branchColorMap[child.name] = theme.colors[idx % theme.colors.length];
        });
      }

      // Sort comparator for hierarchy nodes
      function sortComparator(a, b) {
        if (sortOrder === "asc") return a.value - b.value;
        if (sortOrder === "alpha") return (a.data.name || "").localeCompare(b.data.name || "");
        if (sortOrder === "natural") return 0;
        return b.value - a.value; // default desc
      }

      // 2. Setup Top Control Bars (Title, HUD, Breadcrumbs & Search)
      var topControls = document.createElement("div");
      topControls.className = "treemap-top-controls";
      topControls.style.display = "flex";
      topControls.style.flexDirection = "column";
      topControls.style.gap = "6px";
      topControls.style.padding = "8px 12px 6px 12px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.flexShrink = "0";
      container.appendChild(topControls);

      // Custom Header Title / Subtitle Override
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
        hud.className = "treemap-hud";
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
          { label: "Total Universe", val: formatValue(totalSum, valFmt), icon: "💼" }
        ];

        if (benchmarkTarget !== null) {
          var bLabel = config.referenceLineLabel || "Benchmark";
          hudStats.push({
            label: bLabel,
            val: formatValue(benchmarkTarget, valFmt) + (underperfCount > 0 ? " (" + underperfCount + " under)" : ""),
            icon: "🎯"
          });
        }

        if (hudMode === "full") {
          hudStats.push({
            label: "Active View",
            val: this._activeDrillNode ? this._activeDrillNode.data.name : "All Branches",
            icon: "🔍"
          });
          hudStats.push({
            label: "Top Branch",
            val: topBranchName + " (" + topBranchShare + ")",
            icon: "⭐"
          });
          hudStats.push({
            label: "Records",
            val: totalCount.toLocaleString(),
            icon: "📊"
          });
        } else {
          hudStats.push({
            label: "Top Branch",
            val: topBranchName + " (" + topBranchShare + ")",
            icon: "⭐"
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

      // Nav bar: Breadcrumbs & Search
      var navBar = document.createElement("div");
      navBar.className = "treemap-navbar";
      navBar.style.display = "flex";
      navBar.style.alignItems = "center";
      navBar.style.justifyContent = "space-between";
      navBar.style.gap = "10px";
      navBar.style.flexWrap = "wrap";
      topControls.appendChild(navBar);

      // Breadcrumb container
      var breadcrumbContainer = document.createElement("div");
      breadcrumbContainer.className = "treemap-breadcrumbs";
      breadcrumbContainer.style.display = showBreadcrumbs ? "flex" : "none";
      breadcrumbContainer.style.alignItems = "center";
      breadcrumbContainer.style.gap = "4px";
      breadcrumbContainer.style.fontSize = Math.round(11 * fontMul) + "px";
      breadcrumbContainer.style.fontWeight = "500";
      navBar.appendChild(breadcrumbContainer);

      // Search Bar
      var searchInput = null;
      if (showSearch) {
        var searchBox = document.createElement("div");
        searchBox.style.display = "flex";
        searchBox.style.alignItems = "center";
        searchBox.style.position = "relative";
        searchBox.style.minWidth = "160px";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Quick filter entities...";
        searchInput.value = this._searchTerm || "";
        searchInput.style.width = "100%";
        searchInput.style.padding = "4px 26px 4px 8px";
        searchInput.style.fontSize = Math.round(11 * fontMul) + "px";
        searchInput.style.border = "1px solid " + theme.searchBorder;
        searchInput.style.borderRadius = "4px";
        searchInput.style.backgroundColor = theme.searchBg;
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
        navBar.appendChild(searchBox);
      }

      // 3. Tree Visualization Canvas Area
      var vizArea = document.createElement("div");
      vizArea.className = "treemap-viz-area";
      vizArea.style.flex = "1 1 auto";
      vizArea.style.width = "100%";
      vizArea.style.position = "relative";
      vizArea.style.overflow = "hidden";
      container.appendChild(vizArea);

      // Reusable Tooltip Element
      var tooltip = document.createElement("div");
      tooltip.className = "treemap-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.visibility = "hidden";
      tooltip.style.backgroundColor = themeKey === "cyber_neon" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)";
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

      // Measure dimensions
      var ctrlH = topControls.offsetHeight || 70;
      var availW = Math.max(100, container.clientWidth || 800);
      var availH = Math.max(100, (container.clientHeight || 500) - ctrlH);

      var svg = d3.select(vizArea)
        .append("svg")
        .attr("width", availW)
        .attr("height", availH)
        .style("display", "block");

      // Tiling Function
      var tileFunc = d3.treemapSquarify.ratio(1.618);
      if (tilingMethod === "binary") tileFunc = d3.treemapBinary;
      if (tilingMethod === "dice") tileFunc = d3.treemapDice;

      // Color Scales
      var secMin = Infinity;
      var secMax = -Infinity;
      function scanSecValues(node) {
        if (node.secValue !== undefined && node.secCount > 0) {
          var avgSec = node.secValue / node.secCount;
          if (avgSec < secMin) secMin = avgSec;
          if (avgSec > secMax) secMax = avgSec;
        }
        if (node.children) {
          node.children.forEach(scanSecValues);
        }
      }
      scanSecValues(rootData);
      if (secMin === Infinity) { secMin = 0; secMax = 100; }
      if (secMin === secMax) secMax = secMin + 1;

      var divergingScale = d3.scaleLinear()
        .domain([secMin, (secMin + secMax) / 2, secMax])
        .range(effectiveDiverging)
        .interpolate(d3.interpolateRgb);

      var sequentialScale = d3.scaleQuantize()
        .domain([secMin, secMax])
        .range(theme.sequential);

      function getNodeColor(d) {
        if (colorMode === "metric_diverging" && secondaryMeas) {
          var valDiv = (d.data.secValue || 0) / (d.data.secCount || 1);
          return divergingScale(valDiv);
        }
        if (colorMode === "metric_sequential" && secondaryMeas) {
          var valSeq = (d.data.secValue || 0) / (d.data.secCount || 1);
          return sequentialScale(valSeq);
        }
        if (colorMode === "depth") {
          var baseHue = theme.colors[0];
          var lightness = 0.35 + (d.depth * 0.18);
          return d3.interpolateLab(baseHue, "#ffffff")(lightness);
        }
        // Default "branch" color
        var bName = d.data.branchName || (d.depth === 1 ? d.data.name : "Other");
        var baseColor = branchColorMap[bName] || theme.colors[0];
        if (d.depth > 1) {
          var depthFactor = Math.min(0.65, (d.depth - 1) * 0.22);
          return d3.interpolateLab(baseColor, "#ffffff")(depthFactor);
        }
        return baseColor;
      }

      var self = this;

      // 4. Render Hierarchy Function
      function renderLevel(targetDataNode) {
        svg.selectAll("*").remove();

        updateBreadcrumbs(targetDataNode);

        var hierarchyNode = d3.hierarchy(targetDataNode)
          .sum(function (d) { return d.children && d.children.length ? 0 : d.value; })
          .sort(sortComparator);

        // Apply Top-N / Tail Consolidation
        if ((displayMode === "flat_top_n" || (topN < 999999)) && hierarchyNode.children) {
          var leaves = hierarchyNode.leaves();
          if (leaves.length > topN) {
            var topLeaves = leaves.slice(0, topN);
            var otherSum = 0;
            var otherCount = 0;
            for (var k = topN; k < leaves.length; k++) {
              otherSum += leaves[k].value;
              otherCount++;
            }
            if (config.showOthersRollup !== false) {
              var consolidatedData = {
                name: targetDataNode.name,
                id: targetDataNode.id,
                children: topLeaves.map(function (l) { return l.data; }).concat([{
                  name: "+ " + otherCount + " Others",
                  id: targetDataNode.id + "/others",
                  value: otherSum,
                  isOthers: true,
                  branchName: "Others"
                }])
              };
              hierarchyNode = d3.hierarchy(consolidatedData)
                .sum(function (d) { return d.value; })
                .sort(sortComparator);
            }
          }
        }

        var treemapLayout = d3.treemap()
          .size([availW, availH])
          .tile(tileFunc)
          .paddingInner(pad)
          .paddingOuter(pad)
          .round(true);

        if (displayMode === "nested") {
          treemapLayout.paddingTop(22).paddingInner(pad * 2);
        }

        treemapLayout(hierarchyNode);

        var nodesToRender = displayMode === "nested"
          ? hierarchyNode.descendants().filter(function (d) { return d.depth > 0; })
          : hierarchyNode.children || [hierarchyNode];

        // Group container
        var cell = svg.selectAll("g")
          .data(nodesToRender)
          .enter()
          .append("g")
          .attr("transform", function (d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
          .style("cursor", function (d) {
            return (d.data.children && d.data.children.length) || (d.children && d.children.length) ? "pointer" : "default";
          });

        // Background Tile Rect
        cell.append("rect")
          .attr("id", function (d) { return "rect-" + d.data.id; })
          .attr("width", function (d) { return Math.max(0, d.x1 - d.x0); })
          .attr("height", function (d) { return Math.max(0, d.y1 - d.y0); })
          .attr("rx", radius)
          .attr("ry", radius)
          .attr("fill", function (d) {
            return d.data.isOthers ? "#94a3b8" : getNodeColor(d);
          })
          .attr("stroke", theme.tileBorder)
          .attr("stroke-width", pad > 0 ? "1px" : "0px")
          .style("transition", "fill 0.2s ease, filter 0.2s ease, opacity 0.2s ease");

        // Clip path for text overflow
        cell.append("clipPath")
          .attr("id", function (d) { return "clip-" + d.data.id; })
          .append("rect")
          .attr("width", function (d) { return Math.max(0, d.x1 - d.x0 - 6); })
          .attr("height", function (d) { return Math.max(0, d.y1 - d.y0 - 6); })
          .attr("rx", radius);

        // Identify Top & Bottom peaks for min_max label density
        var sortedByVal = nodesToRender.slice().sort(function (a, b) { return b.value - a.value; });
        var peakMap = {};
        if (labelDensity === "min_max") {
          sortedByVal.slice(0, 5).forEach(function (n) { peakMap[n.data.id] = true; });
          sortedByVal.slice(-5).forEach(function (n) { peakMap[n.data.id] = true; });
        }

        // Text Labels
        if (labelDensity !== "hidden") {
          var labelGroup = cell.append("g")
            .attr("clip-path", function (d) { return "url(#clip-" + d.data.id + ")"; })
            .attr("transform", "translate(6, 6)")
            .style("pointer-events", "none");

          labelGroup.each(function (d) {
            if (labelDensity === "min_max" && !peakMap[d.data.id]) return;

            var g = d3.select(this);
            var w = d.x1 - d.x0;
            var h = d.y1 - d.y0;

            if (w >= 45 && h >= 24) {
              // Entity Name
              g.append("text")
                .attr("x", 2)
                .attr("y", baseFontSize)
                .attr("font-size", baseFontSize + "px")
                .attr("font-weight", "600")
                .attr("fill", "#ffffff")
                .style("text-shadow", "0 1px 2px rgba(0,0,0,0.45)")
                .text(d.data.name);

              // Primary Metric Value
              if (h >= 42 && w >= 55) {
                g.append("text")
                  .attr("x", 2)
                  .attr("y", baseFontSize + 14)
                  .attr("font-size", Math.max(9, baseFontSize - 1) + "px")
                  .attr("font-weight", "500")
                  .attr("fill", "rgba(255, 255, 255, 0.92)")
                  .style("text-shadow", "0 1px 2px rgba(0,0,0,0.45)")
                  .text(formatValue(d.value, valFmt));
              }

              // Secondary Metric badge
              if (h >= 60 && w >= 75 && showSecMetric && secondaryMeas && d.data.secValue !== undefined) {
                var secValAvg = d.data.secValue / (d.data.secCount || 1);
                g.append("text")
                  .attr("x", 2)
                  .attr("y", baseFontSize + 28)
                  .attr("font-size", Math.max(9, baseFontSize - 2) + "px")
                  .attr("font-weight", "500")
                  .attr("fill", "rgba(255, 255, 255, 0.82)")
                  .style("text-shadow", "0 1px 2px rgba(0,0,0,0.45)")
                  .text((secondaryMeas.label_short || secondaryMeas.name) + ": " + formatValue(secValAvg, valFmt));
              }
            }
          });
        }

        // Hover & Click Interactions
        cell.on("mouseenter", function (event, d) {
          if (hoverStyle === "elevate") {
            d3.select(this).select("rect")
              .attr("filter", "drop-shadow(0 8px 16px rgba(0,0,0,0.3))")
              .attr("stroke", "#ffffff")
              .attr("stroke-width", "2px");
          } else if (hoverStyle === "brighten") {
            d3.select(this).select("rect").style("filter", "brightness(1.18)");
          } else {
            d3.select(this).select("rect").attr("stroke", theme.text).attr("stroke-width", "2px");
          }

          var parentVal = d.parent ? d.parent.value : totalSum;
          var shareParent = parentVal > 0 ? ((d.value / parentVal) * 100).toFixed(1) + "%" : "100%";
          var shareTotal = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) + "%" : "100%";
          var secHtml = "";
          if (secondaryMeas && d.data.secValue !== undefined) {
            var secValAvg = d.data.secValue / (d.data.secCount || 1);
            secHtml = "<div style='display:flex; justify-content:space-between; margin-top:4px;'>" +
              "<span style='color:" + theme.subtext + ";'>" + (secondaryMeas.label_short || secondaryMeas.name) + ":</span>" +
              "<span style='font-weight:600;'>" + formatValue(secValAvg, valFmt) + "</span>" +
              "</div>";
          }

          var drillHint = (d.data.children && d.data.children.length)
            ? "<div style='margin-top:8px; padding-top:6px; border-top:1px dashed " + theme.border + "; font-size:10px; color:" + theme.subtext + ";'>👆 Click to Zoom / Drill Into Branch</div>"
            : (d.data.drillLinks && d.data.drillLinks.length ? "<div style='margin-top:8px; padding-top:6px; border-top:1px dashed " + theme.border + "; font-size:10px; color:" + theme.subtext + ";'>🔗 Click for Looker Drill Menu</div>" : "");

          tooltip.innerHTML =
            "<div style='font-weight:700; font-size:13px; margin-bottom:4px; color:" + theme.text + ";'>" + d.data.name + "</div>" +
            "<div style='font-size:11px; color:" + theme.subtext + "; margin-bottom:6px;'>Level " + d.depth + " • " + (d.data.branchName || "Root") + "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>" + (primaryMeas.label_short || primaryMeas.name) + ":</span>" +
            "<span style='font-weight:700; color:" + theme.text + ";'>" + formatValue(d.value, valFmt) + "</span>" +
            "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>Share of Parent:</span>" +
            "<span style='font-weight:600;'>" + shareParent + "</span>" +
            "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>Share of Total:</span>" +
            "<span style='font-weight:600;'>" + shareTotal + "</span>" +
            "</div>" +
            secHtml +
            drillHint;

          tooltip.style.visibility = "visible";
          tooltip.style.opacity = "1";
        });

        cell.on("mousemove", function (event) {
          var mouseX = event.clientX - vizArea.getBoundingClientRect().left;
          var mouseY = event.clientY - vizArea.getBoundingClientRect().top;
          var tipW = 240;
          var tipH = 140;

          var left = mouseX + 15;
          if (left + tipW > availW) left = mouseX - tipW - 15;
          var top = mouseY + 15;
          if (top + tipH > availH) top = mouseY - tipH - 15;

          tooltip.style.left = Math.max(8, left) + "px";
          tooltip.style.top = Math.max(8, top) + "px";
        });

        cell.on("mouseleave", function () {
          d3.select(this).select("rect")
            .attr("filter", "none")
            .attr("stroke", theme.tileBorder)
            .attr("stroke-width", pad > 0 ? "1px" : "0px")
            .style("filter", "none");

          tooltip.style.visibility = "hidden";
          tooltip.style.opacity = "0";
        });

        cell.on("click", function (event, d) {
          if (displayMode === "drilldown" && d.data.children && d.data.children.length) {
            tooltip.style.visibility = "hidden";
            self._activeDrillNode = d;
            renderLevel(d.data);
          } else if (d.data.drillLinks && d.data.drillLinks.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: d.data.drillLinks,
              event: event
            });
          }
        });

        applySearchFilter(self._searchTerm);
      }

      // 5. Breadcrumb Builder
      function updateBreadcrumbs(currentNodeData) {
        breadcrumbContainer.innerHTML = "";

        var path = [];
        var curr = currentNodeData;
        while (curr) {
          path.unshift(curr);
          if (curr.id === "root") break;
          curr = findParentNode(rootData, curr.id);
        }

        path.forEach(function (node, idx) {
          var isLast = idx === path.length - 1;

          var crumb = document.createElement("span");
          crumb.textContent = node.name === "All" ? "🏠 All Categories" : node.name;
          crumb.style.padding = "3px 6px";
          crumb.style.borderRadius = "4px";
          crumb.style.backgroundColor = isLast ? theme.breadcrumbActive : theme.breadcrumbBg;
          crumb.style.color = isLast ? "#ffffff" : theme.text;
          crumb.style.cursor = isLast ? "default" : "pointer";
          crumb.style.transition = "background-color 0.15s ease";

          if (!isLast) {
            crumb.onmouseenter = function () { crumb.style.backgroundColor = theme.border; };
            crumb.onmouseleave = function () { crumb.style.backgroundColor = theme.breadcrumbBg; };
            crumb.onclick = function () {
              self._activeDrillNode = node.id === "root" ? null : { data: node };
              renderLevel(node);
            };
          }

          breadcrumbContainer.appendChild(crumb);

          if (!isLast) {
            var sep = document.createElement("span");
            sep.textContent = "›";
            sep.style.color = theme.subtext;
            sep.style.fontSize = "13px";
            sep.style.lineHeight = "1";
            breadcrumbContainer.appendChild(sep);
          }
        });

        if (path.length > 1) {
          var drillUpBtn = document.createElement("button");
          drillUpBtn.innerHTML = "⬆ Drill Up";
          drillUpBtn.style.marginLeft = "6px";
          drillUpBtn.style.padding = "2px 6px";
          drillUpBtn.style.fontSize = Math.round(10 * fontMul) + "px";
          drillUpBtn.style.fontWeight = "600";
          drillUpBtn.style.border = "1px solid " + theme.border;
          drillUpBtn.style.borderRadius = "4px";
          drillUpBtn.style.backgroundColor = theme.hudBg;
          drillUpBtn.style.color = theme.text;
          drillUpBtn.style.cursor = "pointer";
          drillUpBtn.onclick = function () {
            var parentNode = path[path.length - 2];
            self._activeDrillNode = parentNode.id === "root" ? null : { data: parentNode };
            renderLevel(parentNode);
          };
          breadcrumbContainer.appendChild(drillUpBtn);
        }
      }

      function findParentNode(searchRoot, targetId) {
        if (!searchRoot.children) return null;
        for (var i = 0; i < searchRoot.children.length; i++) {
          var child = searchRoot.children[i];
          if (child.id === targetId) return searchRoot;
          var found = findParentNode(child, targetId);
          if (found) return found;
        }
        return null;
      }

      // 6. Search Filter Handler
      function applySearchFilter(term) {
        if (!term || !term.trim()) {
          svg.selectAll("g").style("opacity", 1);
          svg.selectAll("rect").style("filter", "none");
          return;
        }
        var cleanTerm = term.toLowerCase().trim();
        svg.selectAll("g").each(function (d) {
          if (!d || !d.data) return;
          var g = d3.select(this);
          var matches = (d.data.name && d.data.name.toLowerCase().indexOf(cleanTerm) !== -1) ||
            (d.data.branchName && d.data.branchName.toLowerCase().indexOf(cleanTerm) !== -1);

          if (matches) {
            g.style("opacity", 1);
            g.select("rect")
              .attr("stroke", "#fbbf24")
              .attr("stroke-width", "2.5px")
              .style("filter", "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))");
          } else {
            g.style("opacity", 0.18);
            g.select("rect")
              .attr("stroke", theme.tileBorder)
              .attr("stroke-width", pad > 0 ? "1px" : "0px")
              .style("filter", "none");
          }
        });
      }

      if (searchInput) {
        searchInput.oninput = function () {
          self._searchTerm = this.value;
          applySearchFilter(this.value);
        };
      }

      // Initial Level Render
      var targetNode = this._activeDrillNode ? this._activeDrillNode.data : rootData;
      renderLevel(targetNode);
    }
  });
})();
