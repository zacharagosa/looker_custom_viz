/**
 * Interactive Streamgraph & ThemeRiver Volume Flow - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/340585545: "new viz - streamgraph [Cloud Blocker]"
 * - b/490547912: HighCharts streamgraph limitations in Looker (lack of native drill menus, baseline offsets, dynamic sorting, normalized 100% ribbon)
 * - YAQS 8624335012298227712: Multi-category continuous time-series stream with interactive scrubbing & peak detection
 *
 * Multi-Mode Adaptability:
 * 1. "silhouette" (ThemeRiver): Centered organic flowing river around horizontal baseline
 * 2. "wiggle" (Byron & Wattenberg Streamgraph): Minimizes slope volatility for organic multi-stream browsing
 * 3. "zero" (Stacked Area Flow): Traditional zero-baseline cumulative volume stack
 * 4. "expand" (100% Proportional Ribbon): Normalized 100% percentage market share over time
 * 5. "ridge" (Joyplot / Staggered Ridges): Vertically staggered separate area curves for direct shape comparison
 *
 * Scalability (5,000+ rows):
 * - Fast client-side timestamp aggregation into uniform time slices
 * - Smooth D3 curve interpolation (Catmull-Rom, MonotoneX, Basis, Linear)
 * - Dynamic field-role mapping for Date, Category, Volume Measure, and Target Measure
 * - Configurable benchmark targets (Dataset Mean/Median, Percentiles P75/P90, Fixed Value)
 * - Anomaly threshold detection and peak stream highlighting
 * - Instantaneous search-as-you-type filter with ribbon dimming and highlight
 * - Stream layer focus/solo on click
 * - Interactive vertical crosshair scrubber with real-time time-slice KPI HUD breakdown
 * - Native Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 *
 * Minimal Option Sections (Strictly 2 clean tabs):
 * - Display: Flow Mode, Curve Smoothing, Dynamic Field Overrides, Target Mode/Value/Label/Threshold, Sorting, Top-N & Other, Null Suppression, HUD Mode, Label Density, Title/Subtitle, Crosshair, Search
 * - Style: Brand Palettes, Custom Hex Overrides, Metric Polarity, Stream Opacity, Stroke Separator, Font Scale, Value Format
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.stack === "function" && typeof window.d3.stackOffsetSilhouette === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.stack === "function") {
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

  // Modern Looker & Enterprise Palettes
  var PALETTES = {
    google_modern: {
      name: "Google Modern Blue",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60", "#7CB342", "#8E24AA", "#039BE5", "#F4511E", "#3949AB"]
    },
    executive_slate: {
      name: "Executive Slate",
      colors: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#2563eb", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"]
    },
    cyber_neon: {
      name: "Cyberpunk Glow",
      colors: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#06b6d4", "#3b82f6", "#6366f1", "#10b981", "#eab308", "#14b8a6", "#f97316"]
    },
    emerald_forest: {
      name: "Nordic Emerald & Moss",
      colors: ["#059669", "#10b981", "#34d399", "#047857", "#065f46", "#0d9488", "#14b8a6", "#15803d", "#16a34a", "#22c55e", "#84cc16", "#65a30d"]
    },
    sunset_aurora: {
      name: "Sunset Aurora Ebb",
      colors: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#facc15", "#e11d48", "#c026d3", "#a855f7", "#7c3aed", "#4f46e5", "#ec4899", "#d97706"]
    },
    wellverse: {
      name: "Wellverse Healthcare",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8", "#1E467A", "#5FD3A0", "#8FB8F9", "#FFD166"]
    },
    ocean_breeze: {
      name: "Pacific Ocean Breeze",
      colors: ["#0284c7", "#0ea5e9", "#38bdf8", "#06b6d4", "#14b8a6", "#10b981", "#3b82f6", "#6366f1", "#4f46e5", "#0891b2", "#0d9488", "#22c55e"]
    }
  };

  function formatMetricValue(val, fmt, polarity) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "percentage") {
      var p = (num <= 1 && num >= -1) ? num * 100 : num;
      return (p >= 0 ? "" : "-") + Math.abs(p).toFixed(1) + "%";
    }
    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
      return sign + Math.round(abs).toLocaleString();
    }
    if (fmt === "decimal_2") {
      return sign + abs.toFixed(2);
    }
    if (fmt === "integer") {
      return sign + Math.round(abs).toLocaleString();
    }
    if (fmt === "raw") {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
    if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
    return sign + Math.round(abs).toLocaleString();
  }

  var visObject = {
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      baselineMode: {
        type: "string",
        label: "Stream Flow Mode",
        display: "select",
        values: [
          { "ThemeRiver / Silhouette (Centered Flow)": "silhouette" },
          { "Wattenberg Stream (Organic Wiggle)": "wiggle" },
          { "Stacked Area (Zero Baseline)": "zero" },
          { "100% Proportional Share Ribbon": "expand" },
          { "Joyplot / Staggered Ridges": "ridge" }
        ],
        default: "silhouette",
        section: "Display",
        order: 1
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Smoothing",
        display: "select",
        values: [
          { "Catmull-Rom Smooth (Recommended)": "curveCatmullRom" },
          { "Monotone Horizontal (Accurate Peaks)": "curveMonotoneX" },
          { "Basis Spline (Organic River)": "curveBasis" },
          { "Linear (Geometric Polygons)": "curveLinear" }
        ],
        default: "curveCatmullRom",
        section: "Display",
        order: 2
      },
      dateDimOverride: {
        type: "string",
        label: "Date / Timeline Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      categoryDimOverride: {
        type: "string",
        label: "Category / Stream Dimension",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: ""
      },
      metricMeasureOverride: {
        type: "string",
        label: "Primary Volume Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / Benchmark Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Target & Benchmark Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "None / Hide Targets": "none" },
          { "Target Measure Column": "measure_column" },
          { "Fixed Target Value": "fixed_value" },
          { "Dataset Mean (Average Volume)": "dataset_mean" },
          { "Dataset Median (P50 Volume)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Top Decile Benchmark (P90)": "percentile_p90" }
        ],
        default: "none"
      },
      targetValue: {
        type: "number",
        label: "Custom Fixed Target Value",
        section: "Display",
        order: 8,
        default: 0
      },
      targetLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 9,
        default: "Benchmark Target"
      },
      anomalyThreshold: {
        type: "number",
        label: "Anomaly Variance Threshold (%)",
        section: "Display",
        order: 10,
        default: 25
      },
      highlightTargetBreaches: {
        type: "boolean",
        label: "Flag Peak Surge & Anomaly Streams",
        section: "Display",
        order: 11,
        default: true
      },
      sortOrder: {
        type: "string",
        label: "Stream Stacking Order",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Inside-Out by Peak Volume (ThemeRiver Default)": "insideOut" },
          { "Total Volume Descending": "descending" },
          { "Total Volume Ascending": "ascending" },
          { "Alphabetical / Query Natural": "none" }
        ],
        default: "insideOut"
      },
      topNLimit: {
        type: "string",
        label: "Top Streams Display Limit",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "All Streams (No Limit)": "all" },
          { "Top 5 Streams": "5" },
          { "Top 10 Streams": "10" },
          { "Top 12 Streams (Default)": "12" },
          { "Top 15 Streams": "15" },
          { "Top 25 Streams": "25" },
          { "Top 50 Streams": "50" }
        ],
        default: "12"
      },
      showOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Streams into 'Other'",
        section: "Display",
        order: 14,
        default: true
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Empty Streams",
        section: "Display",
        order: 15,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 16,
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
        label: "In-Stream Labels Density",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "All Visible Streams": "all" },
          { "Peak Volume Streams Only": "peaks_only" },
          { "Hidden (Hover Only)": "hidden" }
        ],
        default: "all"
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 18,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 19,
        default: ""
      },
      showCrosshair: {
        type: "boolean",
        label: "Enable Timeline Scrubber & Crosshair",
        section: "Display",
        order: 20,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Stream Filter & Search Bar",
        section: "Display",
        order: 21,
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
          { "Google Modern Spectrum": "google_modern" },
          { "Executive Slate": "executive_slate" },
          { "Cyberpunk Glow": "cyber_neon" },
          { "Nordic Emerald & Moss": "emerald_forest" },
          { "Sunset Aurora Ebb": "sunset_aurora" },
          { "Wellverse Healthcare": "wellverse" },
          { "Pacific Ocean Breeze": "ocean_breeze" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_modern"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
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
        label: "Custom Negative Anomaly Hex",
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
          { "Higher is Better (Growth, Revenue, Engagement)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Error Volume, Cost)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      streamOpacity: {
        type: "string",
        label: "Stream Fill Opacity",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "100% Solid": "1.0" },
          { "85% Vibrant (Recommended)": "0.85" },
          { "70% Translucent": "0.70" },
          { "50% Soft Water": "0.50" }
        ],
        default: "0.85"
      },
      strokeWidth: {
        type: "string",
        label: "Stream Border Separator",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "None (Seamless Blend)": "0" },
          { "1px Crisp White Border": "1" },
          { "1.5px Defined Separator": "1.5" },
          { "2px Bold Separator": "2" }
        ],
        default: "1"
      },
      fontSize: {
        type: "string",
        label: "Font Size & Density",
        section: "Style",
        order: 8,
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
        order: 9,
        display: "select",
        values: [
          { "Auto Detect": "auto" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_number" },
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
        dateDimOverride: { role: "dimension", defaultIdx: 0 },
        categoryDimOverride: { role: "dimension", defaultIdx: 1 },
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

      var container = document.createElement("div");
      container.className = "streamgraph-themeriver-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.boxSizing = "border-box";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      container.style.color = "#1f2937";
      container.style.backgroundColor = "#ffffff";
      container.style.overflow = "hidden";
      container.style.position = "relative";
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "streamgraph-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = "rgba(15, 23, 42, 0.95)";
      tooltip.style.color = "#ffffff";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 0.15s ease-out, transform 0.1s ease-out";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      tooltip.style.zIndex = "9999";
      tooltip.style.backdropFilter = "blur(4px)";
      tooltip.style.border = "1px solid rgba(255,255,255,0.15)";
      document.body.appendChild(tooltip);
      element._streamTooltip = tooltip;

      this._element = element;
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
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element || self._lastElement;
      if (!el) return;

      var curW = el.clientWidth || 0;
      var curH = el.clientHeight || 0;
      if (curW <= 20 || curH <= 20) return;

      if (self._lastRenderW && self._lastRenderH) {
        if (Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) {
          return;
        }
      }

      if (self._resizeTimer) {
        clearTimeout(self._resizeTimer);
      }
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse) {
          self.updateAsync(
            self._lastData,
            el,
            self._lastConfig,
            self._lastQueryResponse,
            self._lastDetails,
            function () {}
          );
        }
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      this._registerDynamicFieldOptions(queryResponse);

      // Input validation
      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to visualize."
        });
        if (done) done();
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!measures.length && fields.table_calculations && fields.table_calculations.length) measures = fields.table_calculations;

      var hasPivots = fields.pivots && fields.pivots.length > 0;
      var isValid = false;

      if (dimensions.length >= 2 && measures.length >= 1) {
        isValid = true;
      } else if (dimensions.length === 1 && hasPivots && measures.length >= 1) {
        isValid = true;
      } else if (dimensions.length === 1 && measures.length >= 2) {
        isValid = true;
      }

      if (!isValid) {
        this.addError({
          title: "Incompatible Data Shape",
          message: "Interactive Streamgraph requires either: (1) 1 Date Dimension + 1 Category Dimension + 1 Measure, (2) 1 Date Dimension + 1 Pivoted Dimension + 1 Measure, or (3) 1 Date Dimension + multiple Measures."
        });
        if (done) done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var container = element.querySelector(".streamgraph-themeriver-container");
      if (!container) return;
      container.innerHTML = "";

      var tooltip = element._streamTooltip;
      var width = container.clientWidth || element.clientWidth || 800;
      var height = container.clientHeight || element.clientHeight || 500;

      var fields = queryResponse.fields;
      var dimensions = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!measures.length && fields.table_calculations && fields.table_calculations.length) measures = fields.table_calculations;
      var pivots = fields.pivots || [];

      // Resolve field-role overrides
      function findField(list, name) {
        if (!name) return null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].name === name) return list[i];
        }
        return null;
      }

      var dateDim = findField(dimensions, config.dateDimOverride) || dimensions[0];
      var isPivotFormat = pivots.length > 0;
      var isMultiMeasureFormat = dimensions.length === 1 && measures.length >= 2 && !isPivotFormat;
      var isLongFormat = dimensions.length >= 2 && measures.length >= 1 && !isPivotFormat;

      var categoryDim = findField(dimensions, config.categoryDimOverride) || (isLongFormat ? dimensions[1] : null);
      var primaryMeasure = findField(measures, config.metricMeasureOverride) || measures[0];
      var targetMeasure = findField(measures, config.targetMeasureOverride) || (measures.length > 1 ? measures[1] : null);

      // Parse data into continuous time series matrix
      var keysSet = new Set();
      var keyTotals = {};
      var timeMap = new Map();
      var grandTotal = 0;
      var targetValuesList = [];

      data.forEach(function (row) {
        var dateCell = row[dateDim.name];
        var dateVal = dateCell ? dateCell.value : null;
        var dateRendered = (dateCell && dateCell.rendered) ? dateCell.rendered : String(dateVal);
        if (dateVal === null || dateVal === undefined) return;

        var dateKey = String(dateVal);
        if (!timeMap.has(dateKey)) {
          var parsedDate = new Date(dateVal);
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(dateKey + "-01");
          }
          timeMap.set(dateKey, {
            key: dateKey,
            rendered: dateRendered,
            date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            values: {},
            cells: {},
            targetVal: null
          });
        }
        var entry = timeMap.get(dateKey);

        if (targetMeasure && row[targetMeasure.name]) {
          var tCell = row[targetMeasure.name];
          var tNum = typeof tCell.value === "number" ? tCell.value : parseFloat(tCell.value);
          if (!isNaN(tNum)) {
            entry.targetVal = tNum;
            targetValuesList.push(tNum);
          }
        }

        if (isLongFormat && categoryDim) {
          var catVal = row[categoryDim.name] ? String(row[categoryDim.name].value || "Unknown") : "Unknown";
          var cell = row[primaryMeasure.name] || {};
          var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
          if (num < 0) num = 0; // Streamgraphs support non-negative flow
          keysSet.add(catVal);
          entry.values[catVal] = (entry.values[catVal] || 0) + num;
          entry.cells[catVal] = cell;
          keyTotals[catVal] = (keyTotals[catVal] || 0) + num;
          grandTotal += num;
        } else if (isPivotFormat) {
          pivots.forEach(function (p) {
            var pivotKey = p.key;
            var catName = (p.data && p.data[pivots[0].name]) ? String(p.data[pivots[0].name]) : pivotKey;
            var cell = (row[primaryMeasure.name] && row[primaryMeasure.name][pivotKey]) ? row[primaryMeasure.name][pivotKey] : {};
            var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
            if (num < 0) num = 0;
            keysSet.add(catName);
            entry.values[catName] = (entry.values[catName] || 0) + num;
            entry.cells[catName] = cell;
            keyTotals[catName] = (keyTotals[catName] || 0) + num;
            grandTotal += num;
          });
        } else if (isMultiMeasureFormat) {
          measures.forEach(function (m) {
            if (targetMeasure && m.name === targetMeasure.name) return;
            var catName = m.label_short || m.label || m.name;
            var cell = row[m.name] || {};
            var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
            if (num < 0) num = 0;
            keysSet.add(catName);
            entry.values[catName] = (entry.values[catName] || 0) + num;
            entry.cells[catName] = cell;
            keyTotals[catName] = (keyTotals[catName] || 0) + num;
            grandTotal += num;
          });
        }
      });

      // Sort time points chronologically
      var timePoints = Array.from(timeMap.values()).sort(function (a, b) {
        return a.date.getTime() - b.date.getTime();
      });

      if (timePoints.length < 2) {
        this.addError({
          title: "Insufficient Time Points",
          message: "Streamgraph requires at least 2 distinct temporal data points to render continuous volume flow."
        });
        if (done) done();
        return;
      }

      // Null / Empty suppression
      var allKeys = Array.from(keysSet);
      if (config.suppressNulls !== false) {
        allKeys = allKeys.filter(function (k) {
          return (keyTotals[k] || 0) > 0;
        });
      }

      // Rank keys by chosen sort order
      var sortOrder = config.sortOrder || "insideOut";
      if (sortOrder === "descending" || sortOrder === "insideOut") {
        allKeys.sort(function (a, b) { return (keyTotals[b] || 0) - (keyTotals[a] || 0); });
      } else if (sortOrder === "ascending") {
        allKeys.sort(function (a, b) { return (keyTotals[a] || 0) - (keyTotals[b] || 0); });
      } else if (sortOrder === "none") {
        // Natural order
      }

      // Top N filtering with optional 'Other' Rollup
      var topN = (config.topNLimit === "all" || !config.topNLimit) ? 0 : parseInt(config.topNLimit, 10);
      var displayKeys = allKeys;
      var hasOthers = false;
      var otherKey = "Other Categories";

      if (topN > 0 && allKeys.length > topN) {
        displayKeys = allKeys.slice(0, topN);
        var remainingKeys = new Set(allKeys.slice(topN));
        if (config.showOtherRollup !== false) {
          hasOthers = true;
          displayKeys.push(otherKey);

          var otherTotal = 0;
          timePoints.forEach(function (tp) {
            var oSum = 0;
            var firstOtherCell = null;
            remainingKeys.forEach(function (k) {
              oSum += (tp.values[k] || 0);
              if (!firstOtherCell && tp.cells[k]) firstOtherCell = tp.cells[k];
            });
            tp.values[otherKey] = oSum;
            tp.cells[otherKey] = firstOtherCell || {};
            otherTotal += oSum;
          });
          keyTotals[otherKey] = otherTotal;
        }
      }

      // Fill in zero for missing time slices
      timePoints.forEach(function (tp) {
        displayKeys.forEach(function (k) {
          if (tp.values[k] === undefined) {
            tp.values[k] = 0;
          }
        });
      });

      // Target / Reference Benchmark Calculation
      var targetMode = config.targetMode || "none";
      var effectiveTarget = 0;
      var allVolumeValues = [];
      timePoints.forEach(function (tp) {
        displayKeys.forEach(function (k) {
          allVolumeValues.push(tp.values[k] || 0);
        });
      });
      allVolumeValues.sort(function (a, b) { return a - b; });

      if (targetMode === "fixed_value") {
        effectiveTarget = Number(config.targetValue) || 0;
      } else if (targetMode === "dataset_mean") {
        effectiveTarget = allVolumeValues.length ? (d3.sum(allVolumeValues) / allVolumeValues.length) : 0;
      } else if (targetMode === "dataset_median") {
        effectiveTarget = allVolumeValues.length ? d3.quantile(allVolumeValues, 0.5) : 0;
      } else if (targetMode === "percentile_p75") {
        effectiveTarget = allVolumeValues.length ? d3.quantile(allVolumeValues, 0.75) : 0;
      } else if (targetMode === "percentile_p90") {
        effectiveTarget = allVolumeValues.length ? d3.quantile(allVolumeValues, 0.90) : 0;
      } else if (targetMode === "measure_column" && targetValuesList.length) {
        effectiveTarget = d3.mean(targetValuesList) || 0;
      }

      // Find overall Peak stream & time
      var maxPointVal = 0;
      var peakStream = displayKeys[0] || "";
      var peakDateStr = "";
      timePoints.forEach(function (tp) {
        displayKeys.forEach(function (k) {
          var v = tp.values[k] || 0;
          if (v > maxPointVal) {
            maxPointVal = v;
            peakStream = k;
            peakDateStr = tp.rendered;
          }
        });
      });

      // Anomaly detection
      var anomalyThresholdPct = Number(config.anomalyThreshold) || 25;
      var hasTargetBenchmark = targetMode !== "none" && effectiveTarget > 0;
      var anomalyCount = 0;
      if (hasTargetBenchmark && config.highlightTargetBreaches !== false) {
        timePoints.forEach(function (tp) {
          displayKeys.forEach(function (k) {
            var v = tp.values[k] || 0;
            var variance = (v - effectiveTarget) / effectiveTarget * 100;
            if (variance >= anomalyThresholdPct) {
              anomalyCount++;
            }
          });
        });
      }

      // Font size & Theme configuration
      var fontScale = config.fontSize || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : (fontScale === "spacious" ? 14 : 12.5);
      container.style.fontSize = baseFontSize + "px";

      // Color Palette mapping
      var paletteKey = config.colorPalette || "google_modern";
      var selectedPalette = (PALETTES[paletteKey] || PALETTES.google_modern).colors.slice();
      if (config.customPrimaryColor) selectedPalette[0] = config.customPrimaryColor;
      if (config.customPositiveColor && selectedPalette.length > 1) selectedPalette[1] = config.customPositiveColor;
      if (config.customNegativeColor && selectedPalette.length > 2) selectedPalette[2] = config.customNegativeColor;

      var colorScale = d3.scaleOrdinal()
        .domain(displayKeys)
        .range(selectedPalette);

      if (hasOthers) {
        colorScale.domain(displayKeys);
      }

      // Stacking configuration
      var baselineMode = config.baselineMode || "silhouette";
      var offsetFunc = d3.stackOffsetSilhouette;
      var isNormalized = false;
      var isRidge = false;

      if (baselineMode === "wiggle") {
        offsetFunc = d3.stackOffsetWiggle;
      } else if (baselineMode === "zero") {
        offsetFunc = d3.stackOffsetNone;
      } else if (baselineMode === "expand") {
        offsetFunc = d3.stackOffsetExpand;
        isNormalized = true;
      } else if (baselineMode === "ridge") {
        isRidge = true;
      }

      // Stacking order
      var orderFunc = d3.stackOrderInsideOut;
      if (sortOrder === "descending") {
        orderFunc = d3.stackOrderDescending;
      } else if (sortOrder === "ascending") {
        orderFunc = d3.stackOrderAscending;
      } else if (sortOrder === "none") {
        orderFunc = d3.stackOrderNone;
      }

      // Curve Interpolation
      var curveMethod = d3.curveCatmullRom;
      var curveConf = config.curveInterpolation || "curveCatmullRom";
      if (curveConf === "curveMonotoneX") {
        curveMethod = d3.curveMonotoneX;
      } else if (curveConf === "curveBasis") {
        curveMethod = d3.curveBasis;
      } else if (curveConf === "curveLinear") {
        curveMethod = d3.curveLinear;
      }

      var fmt = isNormalized ? "percentage" : (config.valueFormat || "compact_currency");
      var polarity = config.metricPolarity || "higher_is_better";

      // Optional Title & Subtitle
      if (config.chartTitleOverride || config.chartSubtitleOverride) {
        var titleWrap = document.createElement("div");
        titleWrap.style.padding = "10px 16px 0 16px";
        if (config.chartTitleOverride) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = (baseFontSize + 3) + "px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = "#0f172a";
          titleEl.textContent = config.chartTitleOverride;
          titleWrap.appendChild(titleEl);
        }
        if (config.chartSubtitleOverride) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = (baseFontSize - 1.5) + "px";
          subEl.style.color = "#64748b";
          subEl.style.marginTop = "2px";
          subEl.textContent = config.chartSubtitleOverride;
          titleWrap.appendChild(subEl);
        }
        container.appendChild(titleWrap);
      }

      // Header Bar & Search HUD
      var headerBar = document.createElement("div");
      headerBar.className = "streamgraph-header-bar";
      headerBar.style.padding = "10px 16px 8px 16px";
      headerBar.style.display = "flex";
      headerBar.style.alignItems = "center";
      headerBar.style.justifyContent = "space-between";
      headerBar.style.flexWrap = "wrap";
      headerBar.style.gap = "12px";
      headerBar.style.borderBottom = "1px solid #f1f5f9";
      container.appendChild(headerBar);

      // Executive Metrics HUD
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "16px";
      hudContainer.style.flexWrap = "wrap";
      headerBar.appendChild(hudContainer);

      var hudMode = config.hudMode || "full";
      if (hudMode !== "hidden") {
        var isCompactHud = hudMode === "compact";

        var totalKpi = document.createElement("div");
        totalKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Total Volume</span>' +
          '<strong style="font-size:' + (isCompactHud ? '13px' : '16px') + ';color:#0f172a;font-weight:700;">' + formatMetricValue(grandTotal, fmt, polarity) + '</strong>';
        hudContainer.appendChild(totalKpi);

        var streamsKpi = document.createElement("div");
        streamsKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Active Streams</span>' +
          '<strong style="font-size:' + (isCompactHud ? '13px' : '16px') + ';color:#0f172a;font-weight:700;">' + displayKeys.length + ' <span style="font-size:11px;font-weight:400;color:#94a3b8;">(' + timePoints.length + ' periods)</span></strong>';
        hudContainer.appendChild(streamsKpi);

        if (!isCompactHud && config.highlightTargetBreaches !== false && peakStream) {
          var peakKpi = document.createElement("div");
          peakKpi.style.padding = "4px 10px";
          peakKpi.style.backgroundColor = "#eff6ff";
          peakKpi.style.border = "1px solid #bfdbfe";
          peakKpi.style.borderRadius = "6px";
          peakKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1d4ed8;font-weight:600;display:block;">⚡ Peak Stream Surge</span>' +
            '<strong style="font-size:12px;color:#1e40af;font-weight:700;">' + peakStream + ': ' + formatMetricValue(maxPointVal, fmt, polarity) + ' <span style="font-weight:500;color:#3b82f6;">(' + peakDateStr + ')</span></strong>';
          hudContainer.appendChild(peakKpi);
        }

        if (hasTargetBenchmark) {
          var targetKpi = document.createElement("div");
          targetKpi.style.padding = "4px 10px";
          targetKpi.style.backgroundColor = "#f0fdf4";
          targetKpi.style.border = "1px solid #bbf7d0";
          targetKpi.style.borderRadius = "6px";
          var targetLbl = config.targetLabel || "Benchmark Target";
          targetKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#15803d;font-weight:600;display:block;">🎯 ' + targetLbl + '</span>' +
            '<strong style="font-size:12px;color:#166534;font-weight:700;">' + formatMetricValue(effectiveTarget, fmt, polarity) + (anomalyCount > 0 ? ' <span style="color:#b91c1c;font-weight:600;">(' + anomalyCount + ' surges)</span>' : '') + '</strong>';
          hudContainer.appendChild(targetKpi);
        }
      }

      // Search and Filter Pill Bar
      var searchFilterWrap = document.createElement("div");
      searchFilterWrap.style.display = "flex";
      searchFilterWrap.style.alignItems = "center";
      searchFilterWrap.style.gap = "8px";
      headerBar.appendChild(searchFilterWrap);

      var searchInput = null;
      if (config.showSearch !== false) {
        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search stream category...";
        searchInput.style.padding = "5px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.border = "1px solid #cbd5e1";
        searchInput.style.borderRadius = "6px";
        searchInput.style.outline = "none";
        searchInput.style.width = "180px";
        searchInput.style.transition = "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out";
        searchInput.onfocus = function () {
          searchInput.style.borderColor = "#3b82f6";
          searchInput.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.15)";
        };
        searchInput.onblur = function () {
          searchInput.style.borderColor = "#cbd5e1";
          searchInput.style.boxShadow = "none";
        };
        searchFilterWrap.appendChild(searchInput);
      }

      // Reset Focus Pill Button
      var resetBtn = document.createElement("button");
      resetBtn.innerText = "Show All Streams";
      resetBtn.style.padding = "5px 9px";
      resetBtn.style.fontSize = "11px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.color = "#475569";
      resetBtn.style.backgroundColor = "#f1f5f9";
      resetBtn.style.border = "1px solid #e2e8f0";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.cursor = "pointer";
      resetBtn.style.display = "none";
      searchFilterWrap.appendChild(resetBtn);

      // SVG Chart Viewport
      var chartWrapper = document.createElement("div");
      chartWrapper.className = "streamgraph-svg-wrapper";
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      var margin = { top: 20, right: 35, bottom: 40, left: 45 };
      var headerH = headerBar.offsetHeight || 48;
      var titleH = (config.chartTitleOverride || config.chartSubtitleOverride) ? 36 : 0;
      var chartW = Math.max(width - margin.left - margin.right, 200);
      var chartH = Math.max(height - headerH - titleH - margin.top - margin.bottom, 150);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height - headerH - titleH)
        .attr("viewBox", "0 0 " + width + " " + (height - headerH - titleH))
        .style("overflow", "visible");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleTime()
        .domain(d3.extent(timePoints, function (d) { return d.date; }))
        .range([0, chartW]);

      // Paths and Labels
      var activeSoloStream = null;
      var pathsGroup = g.append("g").attr("class", "streams-group");
      var labelsGroup = g.append("g").attr("class", "stream-labels-group");
      var opacityVal = parseFloat(config.streamOpacity || "0.85");
      var strokeWidth = config.strokeWidth !== undefined ? config.strokeWidth : "1";
      var strokeColor = strokeWidth === "0" ? "none" : "#ffffff";

      function updateHighlight(filterTerm, soloKey) {
        var term = (filterTerm || "").trim().toLowerCase();
        pathsGroup.selectAll(".stream-layer")
          .transition()
          .duration(200)
          .style("opacity", function (d) {
            var key = d ? d.key : null;
            if (soloKey) {
              return key === soloKey ? "1.0" : "0.12";
            }
            if (term.length > 0 && key) {
              return key.toLowerCase().indexOf(term) !== -1 ? "1.0" : "0.12";
            }
            return opacityVal;
          })
          .style("stroke-width", function (d) {
            var key = d ? d.key : null;
            if (soloKey && key === soloKey) return "2.5px";
            return strokeWidth + "px";
          });

        labelsGroup.selectAll(".stream-label")
          .transition()
          .duration(200)
          .style("opacity", function (d) {
            var key = d ? d.key : null;
            if (soloKey) {
              return key === soloKey ? "1.0" : "0";
            }
            if (term.length > 0 && key) {
              return key.toLowerCase().indexOf(term) !== -1 ? "1.0" : "0";
            }
            return "1.0";
          });

        if (soloKey || term.length > 0) {
          resetBtn.style.display = "inline-block";
        } else {
          resetBtn.style.display = "none";
        }
      }

      if (isRidge) {
        // Joyplot / Staggered Ridge Mode
        var ridgeH = chartH / displayKeys.length;
        var maxRidgeVal = d3.max(timePoints, function (d) {
          return d3.max(displayKeys, function (k) { return d.values[k] || 0; });
        }) || 1;

        var yRidgeScale = d3.scaleLinear()
          .domain([0, maxRidgeVal])
          .range([ridgeH * 1.5, 0]);

        displayKeys.forEach(function (key, idx) {
          var yOffset = idx * (chartH / displayKeys.length);
          var ridgeGroup = pathsGroup.append("g")
            .attr("class", "stream-layer")
            .datum({ key: key })
            .attr("transform", "translate(0," + yOffset + ")");

          var lineGen = d3.line()
            .curve(curveMethod)
            .x(function (d) { return xScale(d.date); })
            .y(function (d) { return yRidgeScale(d.values[key] || 0); });

          var areaGen = d3.area()
            .curve(curveMethod)
            .x(function (d) { return xScale(d.date); })
            .y0(ridgeH * 1.4)
            .y1(function (d) { return yRidgeScale(d.values[key] || 0); });

          ridgeGroup.append("path")
            .datum(timePoints)
            .attr("fill", colorScale(key))
            .attr("fill-opacity", opacityVal)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", strokeWidth)
            .attr("d", areaGen);

          ridgeGroup.append("path")
            .datum(timePoints)
            .attr("fill", "none")
            .attr("stroke", colorScale(key))
            .attr("stroke-width", 2)
            .attr("d", lineGen);

          ridgeGroup.append("text")
            .attr("x", 8)
            .attr("y", ridgeH * 1.3)
            .attr("fill", "#334155")
            .attr("font-size", (baseFontSize - 1) + "px")
            .attr("font-weight", "600")
            .text(key);
        });

      } else {
        // Standard Streamgraph / ThemeRiver / Stacked Area
        var stack = d3.stack()
          .keys(displayKeys)
          .offset(offsetFunc)
          .order(orderFunc)
          .value(function (d, key) {
            return d.values[key] || 0;
          });

        var series = stack(timePoints);

        var yMin = d3.min(series, function (layer) {
          return d3.min(layer, function (d) { return d[0]; });
        });
        var yMax = d3.max(series, function (layer) {
          return d3.max(layer, function (d) { return d[1]; });
        });

        var yScale = d3.scaleLinear()
          .domain([yMin, yMax])
          .range([chartH, 0]);

        var area = d3.area()
          .curve(curveMethod)
          .x(function (d) { return xScale(d.data.date); })
          .y0(function (d) { return yScale(d[0]); })
          .y1(function (d) { return yScale(d[1]); });

        pathsGroup.selectAll(".stream-layer")
          .data(series)
          .enter()
          .append("path")
          .attr("class", "stream-layer")
          .attr("d", area)
          .attr("fill", function (d) { return colorScale(d.key); })
          .attr("fill-opacity", opacityVal)
          .attr("stroke", strokeColor)
          .attr("stroke-width", strokeWidth + "px")
          .style("cursor", "pointer")
          .style("transition", "fill-opacity 0.2s ease, stroke-width 0.2s ease")
          .on("click", function (event, d) {
            if (activeSoloStream === d.key) {
              activeSoloStream = null;
            } else {
              activeSoloStream = d.key;
            }
            updateHighlight(searchInput ? searchInput.value : "", activeSoloStream);
          });

        // In-Stream Category Labels
        var labelDensity = config.dataLabelDensity || "all";
        if (labelDensity !== "hidden") {
          var fontSize = Math.max(baseFontSize - 1, 10);
          series.forEach(function (layer) {
            if (labelDensity === "peaks_only" && layer.key !== peakStream) {
              return;
            }

            var bestPoint = null;
            var maxThickness = 0;
            layer.forEach(function (d) {
              var thickness = Math.abs(yScale(d[0]) - yScale(d[1]));
              if (thickness > maxThickness) {
                maxThickness = thickness;
                bestPoint = d;
              }
            });

            if (bestPoint && maxThickness > fontSize * 1.4) {
              var posX = xScale(bestPoint.data.date);
              var posY = (yScale(bestPoint[0]) + yScale(bestPoint[1])) / 2;

              labelsGroup.append("text")
                .datum(layer)
                .attr("class", "stream-label")
                .attr("x", posX)
                .attr("y", posY)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#ffffff")
                .attr("font-size", fontSize + "px")
                .attr("font-weight", "600")
                .style("text-shadow", "0 1px 3px rgba(0,0,0,0.7)")
                .style("pointer-events", "none")
                .text(layer.key);
            }
          });
        }

        // Benchmark Reference Line (for Stacked Area Zero Baseline)
        if (baselineMode === "zero" && hasTargetBenchmark) {
          var targetY = yScale(effectiveTarget);
          if (targetY >= 0 && targetY <= chartH) {
            var refG = g.append("g").attr("class", "stream-benchmark-line");
            refG.append("line")
              .attr("x1", 0)
              .attr("x2", chartW)
              .attr("y1", targetY)
              .attr("y2", targetY)
              .attr("stroke", "#dc2626")
              .attr("stroke-width", "1.5px")
              .attr("stroke-dasharray", "5 3");

            refG.append("text")
              .attr("x", chartW - 6)
              .attr("y", targetY - 4)
              .attr("text-anchor", "end")
              .attr("fill", "#dc2626")
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .text((config.targetLabel || "Benchmark") + ": " + formatMetricValue(effectiveTarget, fmt, polarity));
          }
        }
      }

      // Time X-Axis
      var xAxis = d3.axisBottom(xScale)
        .ticks(Math.max(chartW / 110, 4))
        .tickFormat(d3.timeFormat("%b %Y"))
        .tickSizeOuter(0);

      var xAxisGroup = g.append("g")
        .attr("class", "stream-x-axis")
        .attr("transform", "translate(0," + chartH + ")")
        .call(xAxis);

      xAxisGroup.selectAll("text")
        .attr("fill", "#64748b")
        .attr("font-size", (baseFontSize - 1.5) + "px")
        .attr("dy", "10px");

      xAxisGroup.selectAll("line")
        .attr("stroke", "#cbd5e1");

      xAxisGroup.select(".domain")
        .attr("stroke", "#cbd5e1");

      // Y-Axis for Normalized (100%) or Zero-baseline
      if (baselineMode === "expand") {
        var yAxis = d3.axisLeft(d3.scaleLinear().domain([0, 1]).range([chartH, 0]))
          .ticks(5)
          .tickFormat(d3.format(".0%"));
        g.append("g")
          .attr("class", "stream-y-axis")
          .call(yAxis)
          .selectAll("text")
          .attr("fill", "#64748b")
          .attr("font-size", (baseFontSize - 2) + "px");
      }

      // Vertical Scrubber Crosshair & Timeline HUD
      if (config.showCrosshair !== false && !isRidge) {
        var scrubberGroup = g.append("g")
          .attr("class", "stream-scrubber")
          .style("opacity", 0)
          .style("pointer-events", "none");

        var scrubberLine = scrubberGroup.append("line")
          .attr("y1", 0)
          .attr("y2", chartH)
          .attr("stroke", "#0f172a")
          .attr("stroke-width", "1.5px")
          .attr("stroke-dasharray", "4 3");

        var scrubberDot = scrubberGroup.append("circle")
          .attr("r", 4.5)
          .attr("fill", "#3b82f6")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", "2px");

        var overlay = g.append("rect")
          .attr("class", "stream-overlay")
          .attr("width", chartW)
          .attr("height", chartH)
          .attr("fill", "transparent")
          .style("cursor", "crosshair");

        var bisectDate = d3.bisector(function (d) { return d.date; }).center;

        overlay.on("mouseenter", function () {
          scrubberGroup.style("opacity", 1);
          tooltip.style.opacity = "1";
        });

        overlay.on("mouseleave", function () {
          scrubberGroup.style("opacity", 0);
          tooltip.style.opacity = "0";
        });

        overlay.on("mousemove", function (event) {
          var pointer = d3.pointer(event, this);
          var mouseX = pointer[0];
          var mouseY = pointer[1];
          var dateAtMouse = xScale.invert(mouseX);

          var idx = bisectDate(timePoints, dateAtMouse);
          var dSelected = timePoints[idx] || timePoints[0];
          if (!dSelected) return;

          var actualX = xScale(dSelected.date);
          scrubberLine.attr("x1", actualX).attr("x2", actualX);
          scrubberDot.attr("cx", actualX).attr("cy", mouseY);

          var sliceTotal = 0;
          displayKeys.forEach(function (k) {
            sliceTotal += (dSelected.values[k] || 0);
          });

          var sortedSlice = displayKeys.map(function (k) {
            var val = dSelected.values[k] || 0;
            return {
              key: k,
              val: val,
              cell: dSelected.cells[k],
              pct: sliceTotal > 0 ? val / sliceTotal : 0,
              isAnomaly: (hasTargetBenchmark && effectiveTarget > 0 && ((val - effectiveTarget) / effectiveTarget * 100) >= anomalyThresholdPct)
            };
          }).sort(function (a, b) {
            return b.val - a.val;
          });

          var html = '<div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px;display:flex;justify-content:space-between;gap:12px;">' +
            '<span>📅 ' + dSelected.rendered + '</span>' +
            '<span style="color:#93c5fd;">Total: ' + formatMetricValue(sliceTotal, fmt, polarity) + '</span>' +
            '</div>';

          html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
          sortedSlice.slice(0, 8).forEach(function (row) {
            var color = colorScale(row.key);
            var isSolo = activeSoloStream === row.key;
            html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);' + (isSolo ? 'font-weight:bold;color:#60a5fa;' : '') + '">' +
              '<td style="padding:3px 6px 3px 0;display:flex;align-items:center;gap:6px;">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + color + '"></span>' +
              '<span>' + row.key + (row.isAnomaly ? ' <span style="color:#f87171;font-weight:bold;">⚡</span>' : '') + '</span>' +
              '</td>' +
              '<td style="padding:3px 8px;text-align:right;font-weight:600;">' + formatMetricValue(row.val, fmt, polarity) + '</td>' +
              '<td style="padding:3px 0;text-align:right;color:#94a3b8;">' + (row.pct * 100).toFixed(1) + '%</td>' +
              '</tr>';
          });
          if (sortedSlice.length > 8) {
            html += '<tr><td colspan="3" style="padding:4px 0 0 0;font-size:10px;color:#94a3b8;text-align:center;">+ ' + (sortedSlice.length - 8) + ' more categories</td></tr>';
          }
          html += '</table>';
          html += '<div style="margin-top:6px;font-size:10px;color:#93c5fd;text-align:right;font-style:italic;">💡 Click stream layer to isolate or drill</div>';

          tooltip.innerHTML = html;

          var pageX = event.clientX;
          var pageY = event.clientY;
          var ttW = tooltip.offsetWidth || 220;
          var ttH = tooltip.offsetHeight || 180;
          var left = pageX + 15;
          var top = pageY - ttH / 2;

          if (left + ttW > window.innerWidth - 20) {
            left = pageX - ttW - 15;
          }
          if (top < 10) top = 10;
          if (top + ttH > window.innerHeight - 10) {
            top = window.innerHeight - ttH - 10;
          }

          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";
        });

        // Drill menu on click
        overlay.on("contextmenu", function (event) {
          event.preventDefault();
          var pointer = d3.pointer(event, this);
          var mouseX = pointer[0];
          var dateAtMouse = xScale.invert(mouseX);
          var idx = bisectDate(timePoints, dateAtMouse);
          var dSelected = timePoints[idx] || timePoints[0];
          if (!dSelected) return;

          var targetKey = activeSoloStream || displayKeys[0];
          var cell = dSelected.cells[targetKey];
          if (cell && cell.links && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: cell.links,
              event: event
            });
          }
        });
      }

      // Hook Search & Reset Events
      if (searchInput) {
        searchInput.oninput = function () {
          updateHighlight(searchInput.value, activeSoloStream);
        };
      }

      resetBtn.onclick = function () {
        activeSoloStream = null;
        if (searchInput) searchInput.value = "";
        updateHighlight("", null);
      };

      if (done) done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
