/**
 * Looker Custom Visualization: Parallel Coordinates Multivariate Profiler
 *
 * Visual Paradigms & Capabilities:
 * - High-Dimensional Multivariate Profiling:
 *     Visualizes multi-dimensional entities (e.g. 5G RAN cell sites, cloud microservices, retail stores,
 *     or patient cohorts) across 3 to 10 simultaneous metric axes, exposing trade-offs, clusters, and anomalies.
 * - Multi-Modal Curve Topologies:
 *     1. "smooth_spline": Smooth cubic B-spline Catmull-Rom curves.
 *     2. "straight_line": High-precision piecewise linear polylines.
 *     3. "bundle_curves": Centroid-directed edge bundled curves.
 * - Interactive 1D Multi-Axis Brushing:
 *     Drag selection boxes along any vertical axis to perform real-time compound multi-metric filtering
 *     (e.g., Latency < 18ms AND Throughput > 700 Mbps), with real-time pass-through counter and Clear button.
 * - Benchmark Reference Profile:
 *     Draws a dashed multi-metric benchmark polyline (Dataset Mean, Median, P75, P90, or Fixed) across all axes.
 * - Executive KPI HUD:
 *     Full scorecard, compact metric pill, or hidden, with entity counts, brush pass rates, and top performers.
 * - Native Looker Drill-Down Menus:
 *     Full LookerCharts.Utils.openDrillMenu integration on entity interaction.
 * - Strict 2-Tab Options Schema:
 *     All options strictly organized under "Display" and "Style".
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.brushY === "function") {
      callback(window.d3);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://d3js.org/d3.v7.min.js";
    s.onload = function () { callback(window.d3); };
    document.head.appendChild(s);
  }

  var THEMES = {
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      axisLine: "#cbd5e1",
      axisTick: "#94a3b8",
      benchmarkLine: "#ea580c",
      palette: ["#2563eb", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#9333ea"],
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#cbd5e1"
    },
    modern_slate: {
      name: "Modern Executive Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#cbd5e1",
      text: "#1e293b",
      subtext: "#64748b",
      axisLine: "#94a3b8",
      axisTick: "#64748b",
      benchmarkLine: "#e11d48",
      palette: ["#475569", "#6366f1", "#0284c7", "#059669", "#d97706", "#7c3aed", "#be123c"],
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#cbd5e1"
    },
    cyber_dark: {
      name: "Cyber NOC Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      text: "#f9fafb",
      subtext: "#9ca3af",
      axisLine: "#374151",
      axisTick: "#6b7280",
      benchmarkLine: "#fbbf24",
      palette: ["#06b6d4", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#f59e0b", "#a855f7"],
      hudBg: "rgba(17, 24, 39, 0.94)",
      hudBorder: "#374151"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      axisLine: "#a7f3d0",
      axisTick: "#059669",
      benchmarkLine: "#b91c1c",
      palette: ["#059669", "#10b981", "#047857", "#0d9488", "#0284c7", "#2563eb", "#d97706"],
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#a7f3d0"
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      border: "#fed7aa",
      text: "#7c2d12",
      subtext: "#9a3412",
      axisLine: "#fdba74",
      axisTick: "#ea580c",
      benchmarkLine: "#4338ca",
      palette: ["#ea580c", "#f97316", "#fb923c", "#db2777", "#8b5cf6", "#0284c7", "#16a34a"],
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#fdba74"
    },
    wellverse: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      axisLine: "#99f6e4",
      axisTick: "#14b8a6",
      benchmarkLine: "#ea580c",
      palette: ["#0d9488", "#14b8a6", "#0284c7", "#2563eb", "#f97316", "#7c3aed", "#e11d48"],
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#99f6e4"
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || !list.length) return null;
    if (overrideVal) {
      var needle = String(overrideVal).trim().toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (f.name && f.name.toLowerCase() === needle) return f;
        if (f.label && f.label.toLowerCase() === needle) return f;
        if (f.label_short && f.label_short.toLowerCase() === needle) return f;
      }
      var numericIdx = parseInt(overrideVal, 10);
      if (!isNaN(numericIdx) && numericIdx >= 1 && numericIdx <= list.length) {
        return list[numericIdx - 1];
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return null;
  }

  function formatValue(val, fmt, field) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var chosenFmt = fmt || "auto";

    if (chosenFmt === "auto") {
      var fieldName = (field && (field.name || field.label || "")).toLowerCase();
      if (fieldName.indexOf("price") !== -1 || fieldName.indexOf("spend") !== -1 || fieldName.indexOf("cost") !== -1 || fieldName.indexOf("revenue") !== -1 || fieldName.indexOf("margin") !== -1 || fieldName.indexOf("$") !== -1) {
        chosenFmt = "compact_currency";
      } else if (fieldName.indexOf("%") !== -1 || fieldName.indexOf("pct") !== -1 || fieldName.indexOf("rate") !== -1 || fieldName.indexOf("ratio") !== -1 || fieldName.indexOf("loss") !== -1 || fieldName.indexOf("drop") !== -1) {
        // If raw percentage is in decimals (e.g. 0.0026 -> 0.26%), scale if small
        if (Math.abs(num) <= 1.0 && num > 0) return (num * 100).toFixed(2) + "%";
        return num.toFixed(2) + "%";
      } else if (fieldName.indexOf("kwh") !== -1 || fieldName.indexOf("energy") !== -1 || fieldName.indexOf("power") !== -1) {
        return num.toFixed(1) + " kWh";
      } else if (fieldName.indexOf("mbps") !== -1 || fieldName.indexOf("throughput") !== -1) {
        return num.toFixed(1) + " Mbps";
      } else if (fieldName.indexOf("ms") !== -1 || fieldName.indexOf("latency") !== -1) {
        return num.toFixed(1) + " ms";
      } else {
        chosenFmt = "compact_num";
      }
    }

    switch (chosenFmt) {
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
        if (Math.abs(num) <= 1.0 && num > 0) return (num * 100).toFixed(2) + "%";
        return num.toFixed(2) + "%";
      case "decimal_2dp":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(num);
      case "numeric":
      default:
        return Math.round(num).toLocaleString();
    }
  }

  looker.plugins.visualizations.add({
    id: "parallel_coordinates_profiler",
    label: "Parallel Coordinates Multivariate Profiler",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY
      // ==========================================
      curveType: {
        type: "string",
        label: "Line & Curve Interpolation Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Smooth B-Spline Curves (Catmull-Rom)": "smooth_spline" },
          { "Straight Piecewise Linear Segments": "straight_line" },
          { "Hierarchical Centroid Bundled Curves": "bundle_curves" }
        ],
        default: "smooth_spline"
      },
      entityDimOverride: {
        type: "string",
        label: "Entity Dimension (Polyline Label)",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      groupDimOverride: {
        type: "string",
        label: "Group / Category Dimension (Color Cluster)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Measure (Sort & Ranking Anchor)",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Reference Profile Mode",
        section: "Display",
        order: 5,
        display: "select",
        values: [
          { "Dataset Mean (Average of All Entities)": "dataset_mean" },
          { "Dataset Median (P50 Profile)": "dataset_median" },
          { "Top Quartile Benchmark (P75 Profile)": "percentile_p75" },
          { "Top Decile Benchmark (P90 Profile)": "percentile_p90" },
          { "None (Hide Benchmark Polyline)": "none" }
        ],
        default: "dataset_mean"
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Profile Label",
        section: "Display",
        order: 6,
        default: "Dataset Benchmark Profile"
      },
      alertThreshold: {
        type: "number",
        label: "Outlier Anomaly Alert Threshold %",
        section: "Display",
        order: 7,
        default: 25
      },
      sortOrder: {
        type: "string",
        label: "Entity Sorting & Priority",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "Primary Metric Descending (Highest First)": "metric_desc" },
          { "Primary Metric Ascending (Lowest First)": "metric_asc" },
          { "Alphabetical by Entity Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc"
      },
      topN: {
        type: "string",
        label: "Top-N Entity Focus Limit",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "All Entities (No Limit)": "all" },
          { "Top 10 Entities Only": "10" },
          { "Top 20 Entities Only": "20" },
          { "Top 30 Entities Only": "30" },
          { "Top 50 Entities Only": "50" }
        ],
        default: "all"
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Incomplete Entity Records",
        section: "Display",
        order: 10,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Full Scorecard Strip": "full" },
          { "Compact Metric Pill": "compact" },
          { "Hidden (Maximum Chart Canvas)": "hidden" }
        ],
        default: "full"
      },
      showBrushHUD: {
        type: "boolean",
        label: "Show Real-Time Brush Filter Counter",
        section: "Display",
        order: 12,
        default: true
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 13,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 14,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Visual Palette Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise (Corporate Blue & Emerald)": "google_enterprise" },
          { "Modern Executive Slate (Indigo & Charcoal)": "modern_slate" },
          { "Cyber NOC Dark (Cyan & Neon Violet)": "cyber_dark" },
          { "Emerald FinOps (Green & Ruby)": "emerald_finops" },
          { "Sunset Media (Amber & Magenta)": "sunset_media" },
          { "Wellverse Healthcare (Teal & Coral)": "wellverse" },
          { "Custom Primary Hex Accent": "custom" }
        ],
        default: "google_enterprise"
      },
      primaryColorOverride: {
        type: "string",
        label: "Custom Primary Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      lineOpacity: {
        type: "number",
        label: "Default Line Opacity (0.1 to 1.0)",
        section: "Style",
        order: 3,
        default: 0.45
      },
      lineWidth: {
        type: "number",
        label: "Normal Line Stroke Width (px)",
        section: "Style",
        order: 4,
        default: 1.8
      },
      highlightWidth: {
        type: "number",
        label: "Hover Focus Stroke Width (px)",
        section: "Style",
        order: 5,
        default: 3.5
      },
      polarity: {
        type: "string",
        label: "Primary Metric Polarity",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Higher is Better (Throughput, Revenue, Availability)": "higher_better" },
          { "Lower is Better (Latency, Packet Loss, Call Drops, Errors)": "lower_better" }
        ],
        default: "higher_better"
      },
      fontScale: {
        type: "string",
        label: "Typography & UI Scale",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Compact (Dense Multi-Tile Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (EBC / Large Monitors)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Axis & Tooltip Numeric Format",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Auto Detect by Metric Name": "auto" },
          { "Compact Number (1.2M, 45k)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimOverride: { role: "dimension", defaultIdx: 0 },
        groupDimOverride: { role: "dimension", defaultIdx: 1 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 }
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
      this._element = element;
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      this._container = document.createElement("div");
      this._container.className = "looker-parallel-coords-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Reusable Tooltip
      var oldTooltip = document.querySelector(".parallel-coords-tooltip");
      if (oldTooltip) {
        this._tooltip = oldTooltip;
      } else {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "parallel-coords-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.padding = "10px 14px";
        this._tooltip.style.borderRadius = "8px";
        this._tooltip.style.fontSize = "12px";
        this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
        document.body.appendChild(this._tooltip);
      }
    },

    _setupLifecycleObservers: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          self._onResize(entries);
        });
        this._resizeObserver.observe(element);
      }
    },

    _onResize: function (entries) {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element || self._lastElement;
      if (!el) return;

      var curW = el.clientWidth || 0;
      var curH = el.clientHeight || 0;
      if (curW <= 10 || curH <= 10) return;

      if (self._lastWidth && self._lastHeight) {
        var dw = Math.abs(curW - self._lastWidth);
        var dh = Math.abs(curH - self._lastHeight);
        if (dw < 4 && dh < 4) return;
      }

      if (self._resizeTimer) clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse) {
          self._lastWidth = curW;
          self._lastHeight = curH;
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
      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      this._registerDynamicFieldOptions(queryResponse);

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        element.style.boxSizing = "border-box";
        element.style.padding = "0";
        element.style.overflow = "hidden";

        this._container = document.createElement("div");
        this._container.className = "looker-parallel-coords-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.position = "relative";
        this._container.style.overflow = "hidden";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          if (typeof done === "function") done();
        } catch (err) {
          console.error("Parallel Coordinates Profiler Render Error:", err);
          if (self.addError) {
            try {
              self.addError({
                title: "Rendering Error",
                message: err.message || "Failed to render Parallel Coordinates Multivariate Profiler."
              });
            } catch (e) {}
          }
          if (typeof done === "function") done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) this._tooltip.style.display = "none";

      if (!data || !data.length) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned no data rows to visualize."
            });
          } catch (e) {}
        }
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || fields.dimension_like || [];
      var meas = fields.measures || fields.measure_like || [];
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) {
        meas = fields.table_calculations;
      }

      if (dims.length < 1 || meas.length < 2) {
        if (this.addError) {
          try {
            this.addError({
              title: "Fields Required",
              message: "Parallel Coordinates requires at least 1 Entity Dimension and 2 or more Numeric Measures (3+ recommended)."
            });
          } catch (e) {}
        }
        return;
      }

      var entityDim = resolveField(dims, config.entityDimOverride, 0) || dims[0];
      var groupDim = resolveField(dims, config.groupDimOverride, 1) || (dims.length > 1 ? dims[1] : null);
      var anchorMeas = resolveField(meas, config.primaryMeasureOverride, 0) || meas[0];

      var themeKey = config.colorTheme || "google_enterprise";
      var theme = THEMES[themeKey] || THEMES.google_enterprise;
      if (config.primaryColorOverride) {
        theme = Object.assign({}, theme, {
          palette: [config.primaryColorOverride].concat(theme.palette)
        });
      }
      this._container.style.backgroundColor = theme.bg;

      var fontScale = 1.0;
      if (config.fontScale === "compact") fontScale = 0.88;
      else if (config.fontScale === "large") fontScale = 1.15;

      // Extract Active Measure Axes (all numeric measures)
      var activeMeasures = meas.filter(function (m) {
        return m.name !== (entityDim ? entityDim.name : null) && m.name !== (groupDim ? groupDim.name : null);
      });

      if (activeMeasures.length < 2) {
        activeMeasures = meas;
      }

      // ==========================================
      // 1. DATA EXTRACTION & AGGREGATION
      // ==========================================
      var entities = [];
      var groupSet = {};

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var eName = row[entityDim.name] ? String(row[entityDim.name].value) : ("Entity #" + (i + 1));
        var gVal = (groupDim && row[groupDim.name]) ? String(row[groupDim.name].value) : "All";
        groupSet[gVal] = true;

        var vals = {};
        var hasValidMeasure = false;
        for (var mIdx = 0; mIdx < activeMeasures.length; mIdx++) {
          var m = activeMeasures[mIdx];
          var rawVal = row[m.name] ? row[m.name].value : null;
          var num = Number(rawVal);
          if (rawVal !== null && !isNaN(num)) {
            vals[m.name] = num;
            hasValidMeasure = true;
          } else {
            vals[m.name] = null;
          }
        }

        if (config.suppressNulls && !hasValidMeasure) continue;

        entities.push({
          id: i,
          name: eName,
          group: gVal,
          values: vals,
          rawRow: row,
          drillLinks: (row[entityDim.name] && row[entityDim.name].links) || null
        });
      }

      if (!entities.length) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Valid Records",
              message: "All records were filtered out or contained invalid values."
            });
          } catch (e) {}
        }
        return;
      }

      // Sorting
      var sortOrder = config.sortOrder || "metric_desc";
      if (sortOrder === "metric_desc") {
        entities.sort(function (a, b) { return (b.values[anchorMeas.name] || 0) - (a.values[anchorMeas.name] || 0); });
      } else if (sortOrder === "metric_asc") {
        entities.sort(function (a, b) { return (a.values[anchorMeas.name] || 0) - (b.values[anchorMeas.name] || 0); });
      } else if (sortOrder === "alphabetical") {
        entities.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Filtering
      if (config.topN && config.topN !== "all") {
        var limit = parseInt(config.topN, 10);
        if (!isNaN(limit) && limit > 0) {
          entities = entities.slice(0, limit);
        }
      }

      // Color Scale for Groups
      var groupKeys = Object.keys(groupSet);
      var colorScale = d3.scaleOrdinal()
        .domain(groupKeys)
        .range(theme.palette);

      // Y Scales per Axis
      var yScales = {};
      var benchmarkValues = {};
      var targetMode = config.targetCalculationMode || "dataset_mean";

      activeMeasures.forEach(function (m) {
        var arr = entities.map(function (e) { return e.values[m.name]; }).filter(function (v) { return v !== null; });
        var minVal = d3.min(arr);
        var maxVal = d3.max(arr);
        if (minVal === undefined) minVal = 0;
        if (maxVal === undefined || maxVal === minVal) maxVal = minVal + 1;

        // Headroom 5%
        var span = maxVal - minVal;
        yScales[m.name] = d3.scaleLinear()
          .domain([minVal - (span * 0.05), maxVal + (span * 0.05)])
          .nice();

        if (targetMode === "dataset_mean") {
          benchmarkValues[m.name] = d3.mean(arr);
        } else if (targetMode === "dataset_median") {
          benchmarkValues[m.name] = d3.median(arr);
        } else if (targetMode === "percentile_p75") {
          benchmarkValues[m.name] = d3.quantile(arr.slice().sort(d3.ascending), 0.75);
        } else if (targetMode === "percentile_p90") {
          benchmarkValues[m.name] = d3.quantile(arr.slice().sort(d3.ascending), 0.90);
        }
      });

      // ==========================================
      // 2. EXECUTIVE KPI HUD & SEARCH BAR
      // ==========================================
      var hudMode = config.hudMode || "full";
      var searchInput = null;
      var brushedCountSpan = null;
      var activeBrushes = {};

      if (hudMode !== "hidden") {
        var hudContainer = document.createElement("div");
        hudContainer.style.position = "absolute";
        hudContainer.style.top = "10px";
        hudContainer.style.left = "14px";
        hudContainer.style.right = "14px";
        hudContainer.style.zIndex = "10";
        hudContainer.style.display = "flex";
        hudContainer.style.alignItems = "center";
        hudContainer.style.justifyContent = "space-between";
        hudContainer.style.gap = "10px";
        hudContainer.style.pointerEvents = "none";

        var kpiCard = document.createElement("div");
        kpiCard.style.pointerEvents = "auto";
        kpiCard.style.display = "flex";
        kpiCard.style.alignItems = "center";
        kpiCard.style.flexWrap = "wrap";
        kpiCard.style.gap = (10 * fontScale) + "px";
        kpiCard.style.padding = (6 * fontScale) + "px " + (14 * fontScale) + "px";
        kpiCard.style.background = theme.hudBg;
        kpiCard.style.border = "1px solid " + theme.hudBorder;
        kpiCard.style.borderRadius = "8px";
        kpiCard.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        kpiCard.style.fontSize = (11.5 * fontScale) + "px";
        kpiCard.style.color = theme.text;

        var hudHTML = "";
        if (config.chartTitleOverride) {
          hudHTML +=
            '<div style="display:flex; flex-direction:column; margin-right:4px;">' +
              '<span style="font-weight:700; font-size:' + (12.5 * fontScale) + 'px; color:' + theme.text + ';">' + config.chartTitleOverride + '</span>' +
              (config.chartSubtitleOverride ? '<span style="font-size:' + (10 * fontScale) + 'px; color:' + theme.subtext + ';">' + config.chartSubtitleOverride + '</span>' : '') +
            '</div>' +
            '<div style="width:1px; height:18px; background:' + theme.hudBorder + ';"></div>';
        }

        hudHTML +=
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:' + (13 * fontScale) + 'px;">📊</span>' +
            '<span>Entities: <strong>' + entities.length + '</strong></span>' +
          '</div>' +
          '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:' + (13 * fontScale) + 'px;">📐</span>' +
            '<span>Axes: <strong>' + activeMeasures.length + ' Telemetry KPIs</strong></span>' +
          '</div>';

        if (groupDim) {
          hudHTML +=
            '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="font-size:' + (13 * fontScale) + 'px;">🏷️</span>' +
              '<span>Clusters: <strong>' + groupKeys.length + ' (' + (groupDim.label_short || groupDim.label || groupDim.name) + ')</strong></span>' +
            '</div>';
        }

        if (config.showBrushHUD !== false) {
          hudHTML +=
            '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span>Active Filtered: <strong id="brushed-counter" style="color:#2563eb;">' + entities.length + ' / ' + entities.length + ' (100%)</strong></span>' +
              '<button id="clear-brushes-btn" style="display:none; font-size:10px; padding:1px 6px; border-radius:4px; border:1px solid #cbd5e1; background:#f1f5f9; cursor:pointer;">Clear</button>' +
            '</div>';
        }

        kpiCard.innerHTML = hudHTML;
        hudContainer.appendChild(kpiCard);

        // Search Input
        var searchBox = document.createElement("div");
        searchBox.style.pointerEvents = "auto";
        searchBox.style.display = "flex";
        searchBox.style.alignItems = "center";
        searchBox.style.padding = (5 * fontScale) + "px " + (10 * fontScale) + "px";
        searchBox.style.background = theme.hudBg;
        searchBox.style.border = "1px solid " + theme.hudBorder;
        searchBox.style.borderRadius = "8px";
        searchBox.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search Entity...";
        searchInput.style.border = "none";
        searchInput.style.background = "transparent";
        searchInput.style.outline = "none";
        searchInput.style.fontSize = (11 * fontScale) + "px";
        searchInput.style.color = theme.text;
        searchInput.style.width = (140 * fontScale) + "px";

        searchBox.appendChild(searchInput);
        hudContainer.appendChild(searchBox);

        this._container.appendChild(hudContainer);
        brushedCountSpan = kpiCard.querySelector("#brushed-counter");
      }

      // ==========================================
      // 3. SVG & LAYOUT CALCULATION
      // ==========================================
      var containerRect = this._container.getBoundingClientRect();
      var width = Math.max(450, containerRect.width);
      var height = Math.max(320, containerRect.height);

      var topMargin = (hudMode !== "hidden" ? 64 : 28) * fontScale;
      var bottomMargin = 45 * fontScale;
      var leftMargin = 60 * fontScale;
      var rightMargin = 60 * fontScale;

      var innerWidth = Math.max(200, width - leftMargin - rightMargin);
      var innerHeight = Math.max(150, height - topMargin - bottomMargin);

      // Update Y Scales range
      activeMeasures.forEach(function (m) {
        yScales[m.name].range([innerHeight, 0]);
      });

      // X Scale across parallel axes
      var xScale = d3.scalePoint()
        .domain(activeMeasures.map(function (m) { return m.name; }))
        .range([0, innerWidth])
        .padding(0.08);

      var svg = d3.select(this._container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block")
        .style("user-select", "none");

      var gMain = svg.append("g")
        .attr("transform", "translate(" + leftMargin + "," + topMargin + ")");

      // Path generator
      var curveType = config.curveType || "smooth_spline";
      function path(d) {
        var pts = [];
        activeMeasures.forEach(function (m) {
          var val = d.values[m.name];
          if (val !== null && val !== undefined) {
            pts.push([xScale(m.name), yScales[m.name](val)]);
          }
        });
        if (pts.length < 2) return null;

        if (curveType === "straight_line") {
          return d3.line()(pts);
        } else if (curveType === "bundle_curves") {
          return d3.line().curve(d3.curveBundle.beta(0.85))(pts);
        } else {
          return d3.line().curve(d3.curveCatmullRom.alpha(0.5))(pts);
        }
      }

      // ==========================================
      // 4. ENTITY POLYLINES LAYER
      // ==========================================
      var defaultOpacity = Number(config.lineOpacity) || 0.45;
      var normalWidth = Number(config.lineWidth) || 1.8;
      var highlightWidth = Number(config.highlightWidth) || 3.5;

      var linesG = gMain.append("g").attr("class", "entity-lines-layer");

      var paths = linesG.selectAll("path.entity-line")
        .data(entities)
        .enter()
        .append("path")
        .attr("class", "entity-line")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", function (d) { return colorScale(d.group); })
        .attr("stroke-width", normalWidth)
        .attr("stroke-opacity", defaultOpacity)
        .style("cursor", "pointer")
        .style("transition", "stroke-opacity 0.15s ease, stroke-width 0.15s ease");

      // ==========================================
      // 5. BENCHMARK PROFILE POLYLINE
      // ==========================================
      if (targetMode !== "none") {
        var benchmarkG = gMain.append("g").attr("class", "benchmark-profile-layer");
        var benchPts = [];
        activeMeasures.forEach(function (m) {
          var bVal = benchmarkValues[m.name];
          if (bVal !== undefined) {
            benchPts.push([xScale(m.name), yScales[m.name](bVal)]);
          }
        });

        if (benchPts.length >= 2) {
          var benchD = (curveType === "straight_line")
            ? d3.line()(benchPts)
            : d3.line().curve(d3.curveCatmullRom.alpha(0.5))(benchPts);

          benchmarkG.append("path")
            .attr("d", benchD)
            .attr("fill", "none")
            .attr("stroke", theme.benchmarkLine)
            .attr("stroke-width", 2.6)
            .attr("stroke-dasharray", "6,4")
            .attr("opacity", 0.95);

          // Benchmark Nodes on each axis
          benchmarkG.selectAll("circle.bench-node")
            .data(benchPts)
            .enter()
            .append("circle")
            .attr("class", "bench-node")
            .attr("cx", function (d) { return d[0]; })
            .attr("cy", function (d) { return d[1]; })
            .attr("r", 4)
            .attr("fill", theme.benchmarkLine)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5);
        }
      }

      // ==========================================
      // 6. VERTICAL AXES & 1D BRUSHING
      // ==========================================
      var axesG = gMain.append("g").attr("class", "parallel-axes-layer");

      var axisGroups = axesG.selectAll("g.axis-group")
        .data(activeMeasures)
        .enter()
        .append("g")
        .attr("class", "axis-group")
        .attr("transform", function (m) { return "translate(" + xScale(m.name) + ",0)"; });

      // Draw D3 Y Axis
      axisGroups.each(function (m) {
        var axis = d3.axisLeft(yScales[m.name])
          .ticks(6)
          .tickFormat(function (d) { return formatValue(d, config.valueFormat, m); });

        var aNode = d3.select(this).call(axis);
        aNode.select(".domain").attr("stroke", theme.axisLine).attr("stroke-width", 1.5);
        aNode.selectAll(".tick line").attr("stroke", theme.axisTick);
        aNode.selectAll(".tick text")
          .attr("fill", theme.subtext)
          .attr("font-size", (9.5 * fontScale) + "px");
      });

      // Axis Headers (Metric Names)
      axisGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -14 * fontScale)
        .attr("fill", theme.text)
        .attr("font-size", (11 * fontScale) + "px")
        .attr("font-weight", "700")
        .text(function (m) { return m.label_short || m.label || m.name; });

      // Axis Footers (Metric Units / Summary)
      axisGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("y", innerHeight + (18 * fontScale))
        .attr("fill", theme.subtext)
        .attr("font-size", (9.5 * fontScale) + "px")
        .text(function (m) {
          if (targetMode !== "none" && benchmarkValues[m.name] !== undefined) {
            return "Avg: " + formatValue(benchmarkValues[m.name], config.valueFormat, m);
          }
          return "";
        });

      // Multi-Axis Brushing Functionality
      function updateBrushedVisibility() {
        var hasActiveBrushes = Object.keys(activeBrushes).length > 0;
        var passingCount = 0;

        paths.each(function (d) {
          var passes = true;
          for (var mName in activeBrushes) {
            var extent = activeBrushes[mName];
            var val = d.values[mName];
            if (val === null || val === undefined || val < extent[0] || val > extent[1]) {
              passes = false;
              break;
            }
          }
          d._passesBrush = passes;
          if (passes) passingCount++;
        });

        paths
          .attr("stroke-opacity", function (d) {
            if (!hasActiveBrushes) return defaultOpacity;
            return d._passesBrush ? 0.9 : 0.04;
          })
          .attr("stroke-width", function (d) {
            if (!hasActiveBrushes) return normalWidth;
            return d._passesBrush ? (normalWidth + 0.6) : (normalWidth * 0.7);
          });

        if (brushedCountSpan) {
          var pct = ((passingCount / entities.length) * 100).toFixed(0);
          brushedCountSpan.textContent = passingCount + " / " + entities.length + " (" + pct + "%)";
        }

        var clearBtn = document.getElementById("clear-brushes-btn");
        if (clearBtn) {
          clearBtn.style.display = hasActiveBrushes ? "inline-block" : "none";
          clearBtn.onclick = function () {
            axisGroups.selectAll(".brush").call(d3.brushY().move, null);
            activeBrushes = {};
            updateBrushedVisibility();
          };
        }
      }

      // Attach D3 1D Brush to Each Axis
      axisGroups.append("g")
        .attr("class", "brush")
        .each(function (m) {
          d3.select(this).call(
            d3.brushY()
              .extent([[-12, 0], [12, innerHeight]])
              .on("brush end", function (event) {
                if (event.selection) {
                  var y0 = yScales[m.name].invert(event.selection[1]);
                  var y1 = yScales[m.name].invert(event.selection[0]);
                  activeBrushes[m.name] = [Math.min(y0, y1), Math.max(y0, y1)];
                } else {
                  delete activeBrushes[m.name];
                }
                updateBrushedVisibility();
              })
          );
        });

      // ==========================================
      // 7. INTERACTIVE HOVER & DRILL-DOWNS
      // ==========================================
      function handleMouseEnter(event, d) {
        // Bring selected line to front
        this.parentNode.appendChild(this);

        paths.attr("stroke-opacity", function (p) {
          if (p === d) return 1.0;
          return 0.08;
        }).attr("stroke-width", function (p) {
          return p === d ? highlightWidth : normalWidth * 0.7;
        });

        var tt = self._tooltip;
        tt.style.background = theme.hudBg;
        tt.style.color = theme.text;
        tt.style.border = "1px solid " + theme.border;

        var rowsHTML = "";
        activeMeasures.forEach(function (m) {
          var val = d.values[m.name];
          var bVal = benchmarkValues[m.name];
          var varianceBadge = "";
          if (bVal !== undefined && bVal > 0 && val !== null) {
            var diff = ((val - bVal) / bVal) * 100;
            var isGood = (config.polarity === "lower_better") ? (diff <= 0) : (diff >= 0);
            var color = isGood ? "#16a34a" : "#dc2626";
            var sign = diff > 0 ? "+" : "";
            varianceBadge = '<span style="font-size:10px; margin-left:6px; color:' + color + '; font-weight:700;">(' + sign + diff.toFixed(1) + '%)</span>';
          }

          rowsHTML +=
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:3px;">' +
              '<span style="color:' + theme.subtext + ';">' + (m.label_short || m.label || m.name) + ':</span>' +
              '<span style="font-weight:700;">' + formatValue(val, config.valueFormat, m) + varianceBadge + '</span>' +
            '</div>';
        });

        tt.innerHTML =
          '<div style="font-size:13px; font-weight:700; margin-bottom:4px; display:flex; align-items:center; justify-content:space-between; gap:10px;">' +
            '<span>' + d.name + '</span>' +
            (groupDim ? ('<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:' + colorScale(d.group) + '22; color:' + colorScale(d.group) + '; font-weight:700;">' + d.group + '</span>') : '') +
          '</div>' +
          '<div style="border-top:1px solid ' + theme.border + '; padding-top:6px; font-size:11px;">' +
            rowsHTML +
          '</div>' +
          (d.drillLinks ? '<div style="margin-top:6px; font-size:10.5px; color:#2563eb;">Click to drill down &rarr;</div>' : '');

        tt.style.display = "block";
        tt.style.opacity = "1";
      }

      function handleMouseMove(event) {
        var tt = self._tooltip;
        var x = event.clientX + 14;
        var y = event.clientY - 20;
        if (x + 300 > window.innerWidth) x = event.clientX - 310;
        if (y + 220 > window.innerHeight) y = event.clientY - 220;
        tt.style.left = x + "px";
        tt.style.top = y + "px";
      }

      function handleMouseLeave() {
        updateBrushedVisibility();
        self._tooltip.style.display = "none";
        self._tooltip.style.opacity = "0";
      }

      function handleClick(event, d) {
        if (d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: d.drillLinks,
            event: event
          });
        }
      }

      paths
        .on("mouseenter", handleMouseEnter)
        .on("mousemove", handleMouseMove)
        .on("mouseleave", handleMouseLeave)
        .on("click", handleClick);

      // Search Box Interaction
      if (searchInput) {
        searchInput.oninput = function () {
          var q = searchInput.value.toLowerCase().trim();
          if (!q) {
            updateBrushedVisibility();
            return;
          }
          paths
            .attr("stroke-opacity", function (d) {
              var matches = d.name.toLowerCase().indexOf(q) !== -1 || (d.group && d.group.toLowerCase().indexOf(q) !== -1);
              return matches ? 1.0 : 0.04;
            })
            .attr("stroke-width", function (d) {
              var matches = d.name.toLowerCase().indexOf(q) !== -1 || (d.group && d.group.toLowerCase().indexOf(q) !== -1);
              return matches ? highlightWidth : (normalWidth * 0.7);
            });
        };
      }
    }
  });
})();
