/**
 * Multivariate Radar & Polar Balance Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Buganizer Cloud Blocker b/453718648: "Google-Supported Radar Chart in Looker & Looker Studio"
 * - Buganizer Cloud Blocker b/184359819: "Spider Chart Viz"
 * - Buganizer Cloud Blocker b/525330147: "Radar Chart (Spider Chart) visualization in Looker"
 * - Internal YAQS: "Radar Chart in Looker Studio Pro" & go/agentrics-docs-spider-chart
 *   (Normalized multi-axis spider charts with benchmark rings and multivariable balancing)
 *
 * Multi-Mode Functional Capabilities:
 * 1. "polygon": Classic Spider Web / Radar Chart with concentric polygon web rings,
 *               equi-angular spokes, semi-transparent shaded area polygon, vertex markers, and benchmark targets.
 * 2. "rose": Coxcomb / Nightingale Rose diagram with circular angular wedge sectors
 *            whose radius represents the metric magnitude.
 * 3. "radial_bar": Radial Spoke / Lollipop bar chart projecting from center ring.
 * 4. "small_multiples": Responsive matrix of mini radar charts comparing multiple entities side-by-side.
 *
 * Scalability (5,000+ rows):
 * - Client-side rollups / cohort aggregations.
 * - Top-N entity ranking slice (Top 3 to Top 25, or All) with automatic 'Other' rollup.
 * - Dynamic field-role mapping populated from live query via registerOptions.
 * - Responsive ResizeObserver with <4px delta guard and zero width/height styling mutations.
 *
 * Option Sections: Strictly 2 clean tabs (Display and Style).
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

  // Theme Palettes
  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9C27B0", "#00ACC1", "#FF7043", "#1A73E8"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      grid: "#e8eaed",
      gridText: "#80868b",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#137333",
      negBadge: "#c5221f",
      targetLine: "#ea4335"
    },
    modern_slate: {
      name: "Modern Slate",
      colors: ["#2563eb", "#0284c7", "#0d9488", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#6366f1"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#f1f5f9",
      gridText: "#94a3b8",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#b91c1c",
      targetLine: "#f59e0b"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (NOC / Telemetry)",
      colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#fbbf24", "#fb7185", "#2dd4bf"],
      bg: "#0b1120",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      gridText: "#64748b",
      cardBg: "#111827",
      cardBorder: "#1e293b",
      hudBg: "rgba(17, 24, 39, 0.96)",
      posBadge: "#4ade80",
      negBadge: "#fb7185",
      targetLine: "#f43f5e"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      colors: ["#059669", "#10b981", "#047857", "#0d9488", "#14b8a6", "#0f766e", "#34d399", "#6ee7b7"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#d1fae5",
      gridText: "#6ee7b7",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#047857",
      negBadge: "#dc2626",
      targetLine: "#047857"
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      colors: ["#f97316", "#ef4444", "#e11d48", "#be123c", "#fb923c", "#f59e0b", "#d97706", "#b45309"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#7c2d12",
      grid: "#fed7aa",
      gridText: "#fb923c",
      cardBg: "#fffbeb",
      cardBorder: "#fed7aa",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#dc2626",
      targetLine: "#be123c"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8"],
      bg: "#ffffff",
      text: "#143359",
      subtext: "#64748B",
      grid: "#EEF2F7",
      gridText: "#94A3B8",
      cardBg: "#F8FAFC",
      cardBorder: "#CBD5E1",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#006B40",
      negBadge: "#B42318",
      targetLine: "#2E7CF6"
    }
  };

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
    return defaultIdx >= 0 ? (list[defaultIdx] || list[0]) : null;
  }

  function formatValue(val, fmt, rendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && rendered) return rendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";
    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "k";
        return sign + "$" + Math.round(abs).toLocaleString();
      case "compact_number":
      case "compact_num":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "k";
        return sign + abs.toLocaleString();
      case "percentage":
        return sign + (abs * (abs <= 1 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (rendered) return rendered;
        return abs >= 100 ? sign + abs.toLocaleString(undefined, { maximumFractionDigits: 1 }) : sign + abs.toFixed(2);
    }
  }

  looker.plugins.visualizations.add({
    id: "radar_polar_chart",
    label: "Multivariate Radar & Polar Balance Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      displayMode: {
        type: "string",
        label: "Chart Display Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Polygon Radar (Spider Web)": "polygon" },
          { "Coxcomb / Nightingale Rose": "rose" },
          { "Radial Spoke Bar / Lollipop": "radial_bar" },
          { "Small Multiples Facet Grid": "small_multiples" }
        ],
        default: "polygon"
      },
      entityDimOverride: {
        type: "string",
        label: "Entity Dimension Override",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      groupDimOverride: {
        type: "string",
        label: "Group / Cohort Dimension Override (Small Multiples)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Spoke Measure Override",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Benchmark / Target Measure Override",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      normalizationMode: {
        type: "string",
        label: "Scale Normalization Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "Independent 100% Max per Spoke (Multi-Unit Balance)": "independent_max" },
          { "Global Absolute Scale (Shared Units)": "global_max" },
          { "Benchmark Median Ratio Ring (100% = Baseline)": "benchmark_median" }
        ],
        default: "independent_max"
      },
      targetMode: {
        type: "string",
        label: "Benchmark Reference Line / Goal Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "None (No Benchmark Ring)": "none" },
          { "Fixed Goal Value (% or Units)": "fixed_value" },
          { "Dataset Mean (Average of All Entities)": "dataset_mean" },
          { "Dataset Median (P50 Baseline)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Frontier (P90)": "percentile_p90" }
        ],
        default: "none"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target / Goal Value",
        section: "Display",
        order: 8,
        default: 80
      },
      targetLabel: {
        type: "string",
        label: "Reference Line / Benchmark Label",
        section: "Display",
        order: 9,
        default: "Benchmark SLA"
      },
      anomalyThreshold: {
        type: "number",
        label: "Anomaly Alert Threshold (% Spoke Deviation)",
        section: "Display",
        order: 10,
        default: 20
      },
      sortOrder: {
        type: "string",
        label: "Entity Sorting & Ordering",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Total Aggregate Metric Descending": "metric_desc" },
          { "Total Aggregate Metric Ascending": "metric_asc" },
          { "Alphabetical (A to Z)": "alphabetical" },
          { "Query Default (Natural Order)": "natural" }
        ],
        default: "metric_desc"
      },
      maxEntities: {
        type: "string",
        label: "Entity Slice Limit (Top-N)",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Top 3 Entities": "3" },
          { "Top 5 Entities": "5" },
          { "Top 8 Entities": "8" },
          { "Top 10 Entities": "10" },
          { "Top 15 Entities": "15" },
          { "Top 25 Entities": "25" },
          { "Show All Entities (Expanded Limits)": "all" }
        ],
        default: "5"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into 'Other' Synthetic Web",
        section: "Display",
        order: 13,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Value Entities",
        section: "Display",
        order: 14,
        default: false
      },
      hudDensity: {
        type: "string",
        label: "Executive KPI HUD Scorecard",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Full Balance Scorecard Banner": "full" },
          { "Compact Status Strip": "compact" },
          { "Hidden (Maximize Chart Canvas)": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Vertex Data Value Labels",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Show All Vertex Labels": "all" },
          { "Min / Max Peaks Only": "peaks_only" },
          { "Hidden (Hover Tooltip Only)": "hidden" }
        ],
        default: "peaks_only"
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Entity Search Box",
        section: "Display",
        order: 19,
        default: true
      },
      showLegend: {
        type: "boolean",
        label: "Show Entity Legend & Filter Pills",
        section: "Display",
        order: 20,
        default: true
      },
      showGridRings: {
        type: "boolean",
        label: "Show Concentric Grid Rings & Ticks",
        section: "Display",
        order: 21,
        default: true
      },
      showSpokeLabels: {
        type: "boolean",
        label: "Show Spoke Metric Axis Labels",
        section: "Display",
        order: 22,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (NOC / Telemetry)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Leader Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive / Target Pass Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Negative / Target Lag Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      polarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Reach, Uptime)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Defect Rate)": "lower_is_better" }
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
          { "Compact (High Density Dashboard)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Display Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto (Format from LookML)": "auto" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Percentage (85.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      },
      webShape: {
        type: "string",
        label: "Grid Background Web Shape",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Concentric Polygons (Equi-Angular Facets)": "polygon" },
          { "Concentric Smooth Circles": "circle" }
        ],
        default: "polygon"
      },
      curveType: {
        type: "string",
        label: "Polygon Line Interpolation",
        section: "Style",
        order: 9,
        display: "select",
        values: [
          { "Straight Polygon Edges (Linear)": "linear" },
          { "Smooth Cardinal Spline Curves": "cardinal" }
        ],
        default: "linear"
      },
      fillOpacity: {
        type: "number",
        label: "Polygon Area Fill Opacity (0.05 - 0.9)",
        section: "Style",
        order: 10,
        default: 0.25
      },
      strokeWidth: {
        type: "number",
        label: "Polygon Outline Thickness (px)",
        section: "Style",
        order: 11,
        default: 2.5
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimOverride: { role: "dimension", defaultIdx: 0 },
        groupDimOverride: { role: "dimension", defaultIdx: -1 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 },
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
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
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
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._searchQuery = "";
      this._activeEntity = null;
      this._lastHeight = 0;
      this._lastWidth = 0;

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-radar-polar-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Clean up any stale tooltips
      var oldTooltips = document.querySelectorAll(".radar-polar-tooltip");
      for (var i = 0; i < oldTooltips.length; i++) {
        if (oldTooltips[i].parentNode) oldTooltips[i].parentNode.removeChild(oldTooltips[i]);
      }

      this._tooltip = document.createElement("div");
      this._tooltip.className = "radar-polar-tooltip";
      this._tooltip.style.position = "absolute";
      this._tooltip.style.display = "none";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.zIndex = "9999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.transition = "opacity 0.15s ease";
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
        var resizeTimer = null;
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastConfig) return;
          var entry = entries[0];
          if (!entry) return;
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) return;
          self._lastWidth = w;
          self._lastHeight = h;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned 0 rows. Please select dimensions and measures to visualize."
        });
        done();
        return;
      }

      var fields = queryResponse ? queryResponse.fields : null;
      var dims = (fields && fields.dimensions) || [];
      var measures = (fields && fields.measures) || [];
      if (!measures.length && fields && fields.table_calculations && fields.table_calculations.length) {
        measures = fields.table_calculations;
      }
      var pivots = queryResponse ? queryResponse.pivots : null;
      var hasPivots = pivots && pivots.length > 0;

      // Dynamic field resolution
      var resolvedEntityDim = resolveField(dims, config.entityDimOverride, 0);
      var resolvedGroupDim = resolveField(dims, config.groupDimOverride, -1);
      var resolvedPrimaryMeasure = resolveField(measures, config.primaryMeasureOverride, 0);
      var resolvedTargetMeasure = resolveField(measures, config.targetMeasureOverride, -1);

      var entities = [];
      var axes = [];
      var entityMap = {};

      if (hasPivots && dims.length >= 1 && measures.length >= 1) {
        // Pivot shape: Dimension = Spoke Axis, Pivot = Entities, Measure = Value
        var axisDim = resolvedEntityDim || dims[0];
        var measure = resolvedPrimaryMeasure || measures[0];

        data.forEach(function (row) {
          var axName = row[axisDim.name] ? String(row[axisDim.name].value) : "Unknown";
          if (!axes.some(function (a) { return a.id === axName; })) {
            axes.push({ id: axName, label: axName });
          }
        });

        pivots.forEach(function (p, pIdx) {
          var entName = String(p.key || p.label || ("Entity " + (pIdx + 1)));
          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
          }
        });

        data.forEach(function (row) {
          var axName = row[axisDim.name] ? String(row[axisDim.name].value) : "Unknown";
          var mObj = row[measure.name];
          if (mObj && typeof mObj === "object") {
            pivots.forEach(function (p) {
              var entName = String(p.key || p.label);
              var cell = mObj[p.key];
              var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;
              if (entityMap[entName]) {
                entityMap[entName].values[axName] = isNaN(numVal) ? 0 : numVal;
                entityMap[entName].rendered[axName] = cell && cell.rendered ? cell.rendered : null;
                entityMap[entName].links[axName] = cell && cell.links ? cell.links : [];
              }
            });
          }
        });
      } else if (dims.length >= 2 && measures.length === 1) {
        // Multi-dimension shape: Dim 0 = Entity, Dim 1 = Spoke Axis, Measure 0 = Value
        var entDim = resolvedEntityDim || dims[0];
        var axDim = dims[1];
        var measure = resolvedPrimaryMeasure || measures[0];

        data.forEach(function (row) {
          var entName = row[entDim.name] ? String(row[entDim.name].value) : "Unknown";
          var axName = row[axDim.name] ? String(row[axDim.name].value) : "Unknown";
          var cell = row[measure.name];
          var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;

          if (!axes.some(function (a) { return a.id === axName; })) {
            axes.push({ id: axName, label: axName });
          }

          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
          }

          entityMap[entName].values[axName] = isNaN(numVal) ? 0 : numVal;
          entityMap[entName].rendered[axName] = cell && cell.rendered ? cell.rendered : null;
          entityMap[entName].links[axName] = cell && cell.links ? cell.links : [];
        });
      } else if (measures.length >= 2) {
        // Multi-measure shape: Dim 0 = Entity, Measures = Spoke Axes
        var entDim = resolvedEntityDim || (dims.length > 0 ? dims[0] : null);

        measures.forEach(function (m) {
          var lbl = m.label_short || m.label || m.name;
          axes.push({ id: m.name, label: lbl });
        });

        var rowCounts = {};
        data.forEach(function (row, rIdx) {
          var entName = entDim && row[entDim.name] && row[entDim.name].value !== null ? String(row[entDim.name].value) : "Series " + (rIdx + 1);

          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
            rowCounts[entName] = 0;
            axes.forEach(function (a) {
              entityMap[entName].values[a.id] = 0;
            });
          }

          rowCounts[entName]++;
          axes.forEach(function (a) {
            var cell = row[a.id];
            var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;
            entityMap[entName].values[a.id] += isNaN(numVal) ? 0 : numVal;
            if (cell && cell.rendered) entityMap[entName].rendered[a.id] = cell.rendered;
            if (cell && cell.links && cell.links.length > 0) entityMap[entName].links[a.id] = cell.links;
          });
        });

        entities.forEach(function (ent) {
          var count = rowCounts[ent.name] || 1;
          if (count > 1) {
            axes.forEach(function (a) {
              ent.values[a.id] = ent.values[a.id] / count;
            });
          }
        });
      } else {
        this.addError({
          title: "Insufficient Fields",
          message: "Radar Chart requires either: (1) One Dimension and 2+ Measures, (2) One Dimension, One Pivot, and One Measure, or (3) Two Dimensions and One Measure."
        });
        done();
        return;
      }

      if (axes.length < 3) {
        this.addError({
          title: "Minimum 3 Spoke Axes Required",
          message: "A radar or polar chart requires at least 3 distinct metric spokes to form a polygon. Currently found: " + axes.length
        });
        done();
        return;
      }

      // Zero & Null suppression
      if (config.suppressZeroNull) {
        entities = entities.filter(function (ent) {
          var nonZeroCount = 0;
          axes.forEach(function (a) {
            if (ent.values[a.id] !== 0 && ent.values[a.id] !== null && !isNaN(ent.values[a.id])) {
              nonZeroCount++;
            }
          });
          return nonZeroCount > 0;
        });
      }

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, data, config, queryResponse, entities, axes, done);
      });
    },

    _render: function (d3, rawData, config, queryResponse, entities, axes, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      // Options extraction
      var displayMode = config.displayMode || "polygon";
      var normalizationMode = config.normalizationMode || "independent_max";
      var maxEntitiesOpt = config.maxEntities || "5";
      var valueFmt = config.valueFormat || "auto";
      var showGridRings = config.showGridRings !== false;
      var showSpokeLabels = config.showSpokeLabels !== false;
      var showLegend = config.showLegend !== false;
      var showSearch = config.showSearch !== false;
      var hudDensity = config.hudDensity || "full";
      var labelDensity = config.labelDensity || "peaks_only";
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";

      var targetMode = config.targetMode || "none";
      var fixedTargetValue = config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 80;
      var targetLabel = config.targetLabel || "Benchmark SLA";
      var anomalyThreshold = config.anomalyThreshold !== undefined ? Number(config.anomalyThreshold) : 20;

      var sortOrder = config.sortOrder || "metric_desc";
      var enableOtherRollup = config.enableOtherRollup === true;
      var metricPolarity = config.polarity || "higher_is_better";
      var fontScale = config.fontScale || "standard";

      // Typography scaling
      var fSizes = {
        title: fontScale === "compact" ? "12px" : fontScale === "large" ? "16px" : "14px",
        hudVal: fontScale === "compact" ? "11px" : fontScale === "large" ? "15px" : "13px",
        hudLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px",
        spokeLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "13px" : "11px",
        spokeSub: fontScale === "compact" ? "8px" : fontScale === "large" ? "10px" : "9px"
      };

      // Theme resolution
      var paletteKey = config.colorPalette || "google_enterprise";
      var theme = PALETTES[paletteKey] || PALETTES.google_enterprise;
      if (paletteKey === "custom_override") {
        theme = Object.assign({}, PALETTES.google_enterprise);
        if (config.customPrimaryHex) theme.colors[0] = config.customPrimaryHex;
        if (config.customPositiveHex) theme.posBadge = config.customPositiveHex;
        if (config.customNegativeHex) theme.negBadge = config.customNegativeHex;
      }

      var webShape = config.webShape || "polygon";
      var curveType = config.curveType || "linear";
      var fillOpacity = config.fillOpacity !== undefined ? Number(config.fillOpacity) : 0.25;
      var strokeWidth = config.strokeWidth !== undefined ? Number(config.strokeWidth) : 2.5;

      // Filter by search query if any
      var filteredEntities = entities;
      if (this._searchQuery && this._searchQuery.trim() !== "") {
        var q = this._searchQuery.trim().toLowerCase();
        filteredEntities = entities.filter(function (e) {
          return e.name.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Calculate aggregate volume per entity for ranking & sorting
      filteredEntities.forEach(function (e) {
        var sum = 0;
        axes.forEach(function (a) {
          sum += Math.abs(e.values[a.id] || 0);
        });
        e._totalVolume = sum;
        e._avgVolume = axes.length > 0 ? sum / axes.length : 0;
      });

      // Sorting
      if (sortOrder === "metric_desc") {
        filteredEntities.sort(function (a, b) { return b._totalVolume - a._totalVolume; });
      } else if (sortOrder === "metric_asc") {
        filteredEntities.sort(function (a, b) { return a._totalVolume - b._totalVolume; });
      } else if (sortOrder === "alphabetical") {
        filteredEntities.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } // 'natural' leaves default query order

      // Apply Top-N slice with automatic 'Other' rollup
      var activeEntities = filteredEntities;
      if (maxEntitiesOpt !== "all") {
        var limit = parseInt(maxEntitiesOpt, 10);
        if (!isNaN(limit) && limit > 0 && filteredEntities.length > limit) {
          var topSlice = filteredEntities.slice(0, limit);
          var remaining = filteredEntities.slice(limit);
          if (enableOtherRollup && remaining.length > 0) {
            var otherEntity = {
              name: "Other (" + remaining.length + " Entities)",
              values: {},
              rendered: {},
              links: {},
              _isOther: true
            };
            axes.forEach(function (a) {
              var avgOther = d3.mean(remaining, function (r) { return r.values[a.id] || 0; }) || 0;
              otherEntity.values[a.id] = avgOther;
            });
            otherEntity._totalVolume = d3.sum(axes, function (a) { return otherEntity.values[a.id]; });
            topSlice.push(otherEntity);
          }
          activeEntities = topSlice;
        }
      }

      if (activeEntities.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:14px;'>No matching entities found.</div>";
        done();
        return;
      }

      // Compute axis statistics
      var axisStats = {};
      var globalMax = 0;

      axes.forEach(function (a) {
        var vals = activeEntities.map(function (e) { return e.values[a.id] || 0; });
        var maxV = d3.max(vals);
        var minV = d3.min(vals);
        if (minV > 0) minV = 0;
        if (maxV <= 0) maxV = 1;
        var meanV = d3.mean(vals) || (maxV / 2);
        var medianV = d3.median(vals) || (maxV / 2);
        var p75V = d3.quantile(vals.slice().sort(d3.ascending), 0.75) || (maxV * 0.75);
        var p90V = d3.quantile(vals.slice().sort(d3.ascending), 0.90) || (maxV * 0.90);

        axisStats[a.id] = {
          min: minV,
          max: maxV,
          mean: meanV,
          median: medianV,
          p75: p75V,
          p90: p90V,
          vals: vals
        };
        if (maxV > globalMax) globalMax = maxV;
      });

      // Target threshold resolution per spoke
      var targetScores = {};
      axes.forEach(function (a) {
        var st = axisStats[a.id];
        var tVal = fixedTargetValue;
        if (targetMode === "dataset_mean") tVal = st.mean;
        else if (targetMode === "dataset_median") tVal = st.median;
        else if (targetMode === "percentile_p75") tVal = st.p75;
        else if (targetMode === "percentile_p90") tVal = st.p90;

        var tScore = 0;
        if (normalizationMode === "global_max") {
          tScore = Math.max(0, Math.min(1.0, tVal / globalMax));
        } else if (normalizationMode === "benchmark_median") {
          tScore = st.median > 0 ? (tVal / st.median) * 0.5 : 0.5;
        } else {
          tScore = Math.max(0, Math.min(1.0, (tVal - st.min) / (st.max - st.min)));
        }
        targetScores[a.id] = { val: tVal, score: Math.max(0.05, Math.min(1.0, tScore)) };
      });

      function getNormalizedScore(e, a) {
        var val = e.values[a.id] || 0;
        var st = axisStats[a.id];
        if (normalizationMode === "global_max") {
          return Math.max(0, Math.min(1.0, val / globalMax));
        } else if (normalizationMode === "benchmark_median") {
          var ratio = st.median > 0 ? (val / st.median) * 0.5 : 0.5;
          return Math.max(0.05, Math.min(1.0, ratio));
        } else {
          return Math.max(0, Math.min(1.0, (val - st.min) / (st.max - st.min)));
        }
      }

      // Container background and styling
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

      // Title & Subtitle Card (if provided)
      if (customTitle || customSubtitle) {
        var headerCard = document.createElement("div");
        headerCard.style.marginBottom = "6px";
        headerCard.style.flexShrink = "0";
        if (customTitle) {
          var tDiv = document.createElement("div");
          tDiv.style.fontSize = fSizes.title;
          tDiv.style.fontWeight = "700";
          tDiv.style.color = theme.text;
          tDiv.innerText = customTitle;
          headerCard.appendChild(tDiv);
        }
        if (customSubtitle) {
          var sDiv = document.createElement("div");
          sDiv.style.fontSize = fSizes.hudLbl;
          sDiv.style.color = theme.subtext;
          sDiv.style.marginTop = "2px";
          sDiv.innerText = customSubtitle;
          headerCard.appendChild(sDiv);
        }
        outerFlex.appendChild(headerCard);
      }

      // 1. EXECUTIVE KPI BANNER / HUD
      if (hudDensity !== "hidden") {
        var topEntity = activeEntities[0];
        var topSpoke = axes[0];
        var maxSpokeVol = 0;
        axes.forEach(function (a) {
          var sum = d3.sum(activeEntities, function (e) { return e.values[a.id] || 0; });
          if (sum > maxSpokeVol) {
            maxSpokeVol = sum;
            topSpoke = a;
          }
        });

        // Compute balance score (1 - coefficient of variation across spokes for top entity)
        var topVals = axes.map(function (a) { return topEntity.values[a.id] || 0; });
        var meanVal = d3.mean(topVals) || 1;
        var devVal = d3.deviation(topVals) || 0;
        var cv = meanVal > 0 ? (devVal / meanVal) : 1;
        var balanceScore = Math.max(10, Math.min(100, Math.round((1 - Math.min(1, cv * 0.5)) * 100)));

        // Anomaly count (spokes deviating > anomalyThreshold from median)
        var anomalyCount = 0;
        activeEntities.forEach(function (ent) {
          axes.forEach(function (a) {
            var diff = Math.abs(ent.values[a.id] - axisStats[a.id].median);
            if (axisStats[a.id].median > 0 && (diff / axisStats[a.id].median) * 100 > anomalyThreshold) {
              anomalyCount++;
            }
          });
        });

        if (hudDensity === "compact") {
          var compactStrip = document.createElement("div");
          compactStrip.className = "radar-polar-compact-hud";
          compactStrip.style.display = "flex";
          compactStrip.style.alignItems = "center";
          compactStrip.style.justifyContent = "space-between";
          compactStrip.style.backgroundColor = theme.cardBg;
          compactStrip.style.border = "1px solid " + theme.cardBorder;
          compactStrip.style.borderRadius = "6px";
          compactStrip.style.padding = "4px 10px";
          compactStrip.style.marginBottom = "6px";
          compactStrip.style.fontSize = fSizes.hudLbl;
          compactStrip.style.fontWeight = "600";
          compactStrip.style.flexShrink = "0";

          var leftChip = document.createElement("span");
          leftChip.innerHTML = "<span style='color:" + theme.subtext + "'>Leader:</span> " + (topEntity ? topEntity.name : "-") + " (" + formatValue(topEntity._totalVolume, valueFmt) + ")";
          var midChip = document.createElement("span");
          midChip.innerHTML = "<span style='color:" + theme.subtext + "'>Balance Score:</span> <span style='color:" + theme.posBadge + "'>" + balanceScore + "%</span>";
          var rightChip = document.createElement("span");
          rightChip.innerHTML = targetMode !== "none"
            ? "<span style='color:" + theme.subtext + "'>Benchmark:</span> " + targetLabel
            : "<span style='color:" + theme.subtext + "'>Dominant:</span> " + topSpoke.label;

          compactStrip.appendChild(leftChip);
          compactStrip.appendChild(midChip);
          compactStrip.appendChild(rightChip);
          outerFlex.appendChild(compactStrip);
        } else {
          var hud = document.createElement("div");
          hud.className = "radar-polar-hud";
          hud.style.display = "grid";
          hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hud.style.gap = "8px";
          hud.style.marginBottom = "8px";
          hud.style.flexShrink = "0";

          var kpiCards = [
            { label: "Entities Analyzed", value: activeEntities.length + (entities.length > activeEntities.length ? " of " + entities.length : "") },
            { label: "Multivariate Balance", value: balanceScore + "% Balanced", badge: balanceScore >= 75 ? "Optimal" : "Asymmetric", badgeColor: balanceScore >= 75 ? theme.posBadge : theme.negBadge },
            { label: "Leader Footprint", value: topEntity ? topEntity.name : "-" },
            { label: targetMode !== "none" ? "Target Benchmark" : "Dominant Spoke", value: targetMode !== "none" ? targetLabel : topSpoke.label }
          ];

          kpiCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.backgroundColor = theme.cardBg;
            card.style.border = "1px solid " + theme.cardBorder;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 10px";
            card.style.boxSizing = "border-box";

            var lbl = document.createElement("div");
            lbl.style.fontSize = fSizes.hudLbl;
            lbl.style.textTransform = "uppercase";
            lbl.style.letterSpacing = "0.5px";
            lbl.style.color = theme.subtext;
            lbl.style.fontWeight = "600";
            lbl.innerText = c.label;

            var val = document.createElement("div");
            val.style.fontSize = fSizes.hudVal;
            val.style.fontWeight = "700";
            val.style.color = theme.text;
            val.style.whiteSpace = "nowrap";
            val.style.overflow = "hidden";
            val.style.textOverflow = "ellipsis";
            val.innerText = c.value;

            card.appendChild(lbl);
            card.appendChild(val);
            hud.appendChild(card);
          });

          outerFlex.appendChild(hud);
        }
      }

      // 2. TOOLBAR: Quick Search + Legend Pills
      var toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.flexWrap = "wrap";
      toolbar.style.alignItems = "center";
      toolbar.style.justifyContent = "space-between";
      toolbar.style.gap = "8px";
      toolbar.style.marginBottom = "6px";
      toolbar.style.flexShrink = "0";

      if (showSearch) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.backgroundColor = theme.cardBg;
        searchWrapper.style.border = "1px solid " + theme.cardBorder;
        searchWrapper.style.borderRadius = "6px";
        searchWrapper.style.padding = "3px 8px";
        searchWrapper.style.minWidth = "180px";

        var searchIcon = document.createElement("span");
        searchIcon.innerHTML = "&#128269;";
        searchIcon.style.fontSize = "11px";
        searchIcon.style.marginRight = "6px";
        searchIcon.style.opacity = "0.7";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter entities (" + entities.length + ")...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.background = "transparent";
        searchInput.style.fontSize = "11px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "100%";

        searchInput.addEventListener("input", function (evt) {
          self._searchQuery = evt.target.value;
          self._render(d3, rawData, config, queryResponse, entities, axes, function () {});
        });

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        toolbar.appendChild(searchWrapper);
      }

      if (showLegend) {
        var legendDiv = document.createElement("div");
        legendDiv.style.display = "flex";
        legendDiv.style.flexWrap = "wrap";
        legendDiv.style.alignItems = "center";
        legendDiv.style.gap = "6px";

        activeEntities.forEach(function (e, idx) {
          var color = e._isOther ? "#64748b" : theme.colors[idx % theme.colors.length];
          var pill = document.createElement("div");
          pill.className = "radar-legend-pill";
          pill.style.display = "flex";
          pill.style.alignItems = "center";
          pill.style.gap = "5px";
          pill.style.padding = "3px 8px";
          pill.style.borderRadius = "12px";
          pill.style.fontSize = "11px";
          pill.style.fontWeight = "600";
          pill.style.cursor = "pointer";
          pill.style.userSelect = "none";
          pill.style.border = "1px solid " + color;
          pill.style.transition = "all 0.15s ease";

          var isSelected = self._activeEntity === e.name || self._activeEntity === null;
          pill.style.backgroundColor = isSelected ? color + "20" : "transparent";
          pill.style.opacity = isSelected ? "1" : "0.4";

          var dot = document.createElement("div");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = color;

          var txt = document.createElement("span");
          txt.style.color = theme.text;
          txt.innerText = e.name;

          pill.appendChild(dot);
          pill.appendChild(txt);

          pill.addEventListener("click", function () {
            if (self._activeEntity === e.name) {
              self._activeEntity = null;
            } else {
              self._activeEntity = e.name;
            }
            self._render(d3, rawData, config, queryResponse, entities, axes, function () {});
          });

          legendDiv.appendChild(pill);
        });

        if (targetMode !== "none") {
          var targetPill = document.createElement("div");
          targetPill.style.display = "flex";
          targetPill.style.alignItems = "center";
          targetPill.style.gap = "5px";
          targetPill.style.padding = "3px 8px";
          targetPill.style.borderRadius = "12px";
          targetPill.style.fontSize = "11px";
          targetPill.style.fontWeight = "600";
          targetPill.style.border = "1px dashed " + theme.targetLine;
          targetPill.style.color = theme.targetLine;

          var lineDot = document.createElement("div");
          lineDot.style.width = "10px";
          lineDot.style.height = "2px";
          lineDot.style.backgroundColor = theme.targetLine;

          var targetTxt = document.createElement("span");
          targetTxt.innerText = targetLabel;

          targetPill.appendChild(lineDot);
          targetPill.appendChild(targetTxt);
          legendDiv.appendChild(targetPill);
        }

        toolbar.appendChild(legendDiv);
      }

      outerFlex.appendChild(toolbar);

      // 3. MAIN VISUALIZATION STAGE
      var stage = document.createElement("div");
      stage.style.flex = "1";
      stage.style.position = "relative";
      stage.style.width = "100%";
      stage.style.height = "100%";
      stage.style.overflow = displayMode === "small_multiples" ? "auto" : "hidden";
      outerFlex.appendChild(stage);

      if (displayMode === "small_multiples") {
        this._renderSmallMultiples(d3, stage, activeEntities, axes, axisStats, theme, config, getNormalizedScore, fSizes);
        done();
        return;
      }

      var rect = stage.getBoundingClientRect();
      var width = Math.max(300, rect.width || stage.clientWidth || 600);
      var height = Math.max(250, rect.height || stage.clientHeight || 500);

      var margin = { top: 35, right: 75, bottom: 35, left: 75 };
      var radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
      var center = { x: width / 2, y: height / 2 };

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + center.x + "," + center.y + ")");

      var numAxes = axes.length;
      var angleSlice = (Math.PI * 2) / numAxes;

      // Concentric Grid Rings
      if (showGridRings) {
        var levels = [0.2, 0.4, 0.6, 0.8, 1.0];
        var gridGroup = g.append("g").attr("class", "grid-rings");

        levels.forEach(function (lvl) {
          var rLvl = radius * lvl;

          if (webShape === "circle") {
            gridGroup.append("circle")
              .attr("r", rLvl)
              .attr("fill", "none")
              .attr("stroke", theme.grid)
              .attr("stroke-width", lvl === 1.0 ? 1.5 : 1)
              .attr("stroke-dasharray", lvl === 1.0 ? "none" : "3,3");
          } else {
            var polyPoints = [];
            for (var i = 0; i < numAxes; i++) {
              var aAngle = i * angleSlice - Math.PI / 2;
              var px = rLvl * Math.cos(aAngle);
              var py = rLvl * Math.sin(aAngle);
              polyPoints.push(px + "," + py);
            }
            gridGroup.append("polygon")
              .attr("points", polyPoints.join(" "))
              .attr("fill", lvl === 1.0 ? (theme.cardBg + "40") : "none")
              .attr("stroke", theme.grid)
              .attr("stroke-width", lvl === 1.0 ? 1.5 : 1)
              .attr("stroke-dasharray", lvl === 1.0 ? "none" : "3,3");
          }

          gridGroup.append("text")
            .attr("x", 4)
            .attr("y", -rLvl - 2)
            .attr("fill", theme.gridText)
            .attr("font-size", fSizes.spokeSub)
            .attr("font-weight", "500")
            .text(Math.round(lvl * 100) + "%");
        });
      }

      // Draw Benchmark Target Ring / Polygon
      if (targetMode !== "none") {
        var targetGroup = g.append("g").attr("class", "benchmark-target-ring");
        var tPoints = [];
        axes.forEach(function (axis, i) {
          var tScore = targetScores[axis.id].score;
          var tRadius = tScore * radius;
          var aAngle = i * angleSlice - Math.PI / 2;
          var tx = tRadius * Math.cos(aAngle);
          var ty = tRadius * Math.sin(aAngle);
          tPoints.push({ x: tx, y: ty, r: tRadius, angle: i * angleSlice });
        });

        if (webShape === "circle") {
          var avgTargetRadius = d3.mean(tPoints, function (p) { return p.r; }) || (radius * 0.7);
          targetGroup.append("circle")
            .attr("r", avgTargetRadius)
            .attr("fill", "none")
            .attr("stroke", theme.targetLine)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4");
        } else {
          var tPointsStr = tPoints.map(function (p) { return p.x + "," + p.y; }).join(" ");
          targetGroup.append("polygon")
            .attr("points", tPointsStr)
            .attr("fill", "none")
            .attr("stroke", theme.targetLine)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4");
        }

        targetGroup.append("text")
          .attr("x", 4)
          .attr("y", -tPoints[0].r - 4)
          .attr("fill", theme.targetLine)
          .attr("font-size", fSizes.spokeSub)
          .attr("font-weight", "700")
          .text(targetLabel);
      }

      // Draw Radial Spokes
      var spokesGroup = g.append("g").attr("class", "spokes");
      axes.forEach(function (axis, i) {
        var aAngle = i * angleSlice - Math.PI / 2;
        var endX = radius * Math.cos(aAngle);
        var endY = radius * Math.sin(aAngle);

        spokesGroup.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", endX)
          .attr("y2", endY)
          .attr("stroke", theme.grid)
          .attr("stroke-width", 1.2);

        if (showSpokeLabels) {
          var labelDist = radius + 18;
          var lx = labelDist * Math.cos(aAngle);
          var ly = labelDist * Math.sin(aAngle);

          var textAnchor = "middle";
          if (Math.abs(lx) > 10) {
            textAnchor = lx > 0 ? "start" : "end";
          }

          var labelG = spokesGroup.append("g")
            .attr("transform", "translate(" + lx + "," + ly + ")");

          labelG.append("text")
            .attr("text-anchor", textAnchor)
            .attr("dy", "0.35em")
            .attr("fill", theme.text)
            .attr("font-size", fSizes.spokeLbl)
            .attr("font-weight", "600")
            .style("cursor", "pointer")
            .text(axis.label);

          var st = axisStats[axis.id];
          labelG.append("text")
            .attr("text-anchor", textAnchor)
            .attr("dy", "1.5em")
            .attr("fill", theme.subtext)
            .attr("font-size", fSizes.spokeSub)
            .attr("font-weight", "400")
            .text("Max: " + formatValue(st.max, valueFmt));
        }
      });

      // Render Mode Specific Visuals
      if (displayMode === "rose") {
        this._renderRoseDiagram(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore, fSizes);
      } else if (displayMode === "radial_bar") {
        this._renderRadialBarChart(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore, fSizes);
      } else {
        this._renderPolygonRadar(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, curveType, fillOpacity, strokeWidth, config, getNormalizedScore, labelDensity, fSizes);
      }

      done();
    },

    _renderPolygonRadar: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, curveType, fillOpacity, strokeWidth, config, getNormalizedScore, labelDensity, fSizes) {
      var self = this;
      var valueFmt = config.valueFormat || "auto";

      var lineGenerator = d3.lineRadial()
        .radius(function (d) { return d.r; })
        .angle(function (d) { return d.angle; });

      if (curveType === "cardinal") {
        lineGenerator.curve(d3.curveCardinalClosed.tension(0.6));
      } else {
        lineGenerator.curve(d3.curveLinearClosed);
      }

      var dataGroup = g.append("g").attr("class", "radar-polygons");

      activeEntities.forEach(function (entity, entIdx) {
        var isTarget = self._activeEntity === null || self._activeEntity === entity.name;
        var color = entity._isOther ? "#64748b" : theme.colors[entIdx % theme.colors.length];

        var points = axes.map(function (axis, i) {
          var score = getNormalizedScore(entity, axis);
          var aAngle = i * angleSlice;
          return {
            axis: axis,
            score: score,
            val: entity.values[axis.id] || 0,
            r: score * radius,
            angle: aAngle,
            entity: entity,
            color: color
          };
        });

        // Min/max peak detection for labelDensity === 'peaks_only'
        var minVal = d3.min(points, function (p) { return p.val; });
        var maxVal = d3.max(points, function (p) { return p.val; });

        var pathString = lineGenerator(points);

        var polygonPath = dataGroup.append("path")
          .attr("d", pathString)
          .attr("fill", color)
          .attr("fill-opacity", isTarget ? fillOpacity : 0.05)
          .attr("stroke", color)
          .attr("stroke-width", isTarget ? strokeWidth : 1)
          .attr("stroke-opacity", isTarget ? 0.95 : 0.25)
          .attr("stroke-dasharray", entity._isOther ? "4,4" : "none")
          .style("transition", "all 0.2s ease")
          .style("cursor", "pointer");

        polygonPath
          .on("mouseenter", function (evt) {
            d3.select(this)
              .attr("fill-opacity", Math.min(0.85, fillOpacity * 2.2))
              .attr("stroke-width", strokeWidth + 1.5);
            self._showEntityTooltip(evt, entity, axes, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this)
              .attr("fill-opacity", isTarget ? fillOpacity : 0.05)
              .attr("stroke-width", isTarget ? strokeWidth : 1);
            self._hideTooltip();
          });

        if (isTarget) {
          points.forEach(function (pt) {
            var aAngle = pt.angle - Math.PI / 2;
            var cx = pt.r * Math.cos(aAngle);
            var cy = pt.r * Math.sin(aAngle);

            var circle = dataGroup.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", 4.5)
              .attr("fill", color)
              .attr("stroke", theme.bg)
              .attr("stroke-width", 2)
              .style("cursor", "pointer")
              .style("transition", "r 0.15s ease");

            // Data value labels
            var showThisLabel = false;
            if (labelDensity === "all") showThisLabel = true;
            else if (labelDensity === "peaks_only" && (pt.val === minVal || pt.val === maxVal)) showThisLabel = true;

            if (showThisLabel) {
              dataGroup.append("text")
                .attr("x", cx)
                .attr("y", cy - 8)
                .attr("text-anchor", "middle")
                .attr("fill", color)
                .attr("font-size", fSizes.spokeSub)
                .attr("font-weight", "700")
                .text(formatValue(pt.val, valueFmt, pt.entity.rendered && pt.entity.rendered[pt.axis.id]));
            }

            circle
              .on("mouseenter", function (evt) {
                d3.select(this).attr("r", 7.5);
                self._showPointTooltip(evt, pt, theme, valueFmt);
              })
              .on("mousemove", function (evt) {
                self._moveTooltip(evt);
              })
              .on("mouseleave", function () {
                d3.select(this).attr("r", 4.5);
                self._hideTooltip();
              })
              .on("click", function (evt) {
                var links = (entity.links && entity.links[pt.axis.id]) || [];
                if (links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                  LookerCharts.Utils.openDrillMenu({ links: links, event: evt });
                }
              });
          });
        }
      });
    },

    _renderRoseDiagram: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore, fSizes) {
      var self = this;
      var valueFmt = config.valueFormat || "auto";
      var roseGroup = g.append("g").attr("class", "rose-diagram");

      var entity = self._activeEntity ? activeEntities.find(function (e) { return e.name === self._activeEntity; }) || activeEntities[0] : activeEntities[0];
      var colorScale = d3.scaleOrdinal().range(theme.colors);

      axes.forEach(function (axis, i) {
        var score = getNormalizedScore(entity, axis);
        var rVal = Math.max(10, score * radius);
        var startAngle = i * angleSlice - Math.PI / 2;
        var endAngle = (i + 1) * angleSlice - Math.PI / 2;
        var color = colorScale(axis.id);

        var arc = d3.arc()
          .innerRadius(12)
          .outerRadius(rVal)
          .startAngle(startAngle + Math.PI / 2)
          .endAngle(endAngle + Math.PI / 2)
          .padAngle(0.02)
          .padRadius(radius / 2);

        var path = roseGroup.append("path")
          .attr("d", arc)
          .attr("fill", color)
          .attr("fill-opacity", 0.75)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .style("transition", "all 0.15s ease");

        path
          .on("mouseenter", function (evt) {
            d3.select(this).attr("fill-opacity", 0.95);
            var pt = {
              axis: axis,
              entity: entity,
              val: entity.values[axis.id] || 0,
              score: score,
              color: color
            };
            self._showPointTooltip(evt, pt, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this).attr("fill-opacity", 0.75);
            self._hideTooltip();
          });
      });

      roseGroup.append("circle")
        .attr("r", 12)
        .attr("fill", theme.cardBg)
        .attr("stroke", theme.cardBorder)
        .attr("stroke-width", 1.5);
    },

    _renderRadialBarChart: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore, fSizes) {
      var self = this;
      var valueFmt = config.valueFormat || "auto";
      var barGroup = g.append("g").attr("class", "radial-bars");

      var entity = self._activeEntity ? activeEntities.find(function (e) { return e.name === self._activeEntity; }) || activeEntities[0] : activeEntities[0];
      var colorScale = d3.scaleOrdinal().range(theme.colors);

      axes.forEach(function (axis, i) {
        var score = getNormalizedScore(entity, axis);
        var rVal = Math.max(15, score * radius);
        var aAngle = i * angleSlice - Math.PI / 2;
        var endX = rVal * Math.cos(aAngle);
        var endY = rVal * Math.sin(aAngle);
        var color = colorScale(axis.id);

        barGroup.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", endX)
          .attr("y2", endY)
          .attr("stroke", color)
          .attr("stroke-width", 4)
          .attr("stroke-linecap", "round");

        var headCircle = barGroup.append("circle")
          .attr("cx", endX)
          .attr("cy", endY)
          .attr("r", 6.5)
          .attr("fill", color)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .style("transition", "r 0.15s ease");

        headCircle
          .on("mouseenter", function (evt) {
            d3.select(this).attr("r", 9.5);
            var pt = {
              axis: axis,
              entity: entity,
              val: entity.values[axis.id] || 0,
              score: score,
              color: color
            };
            self._showPointTooltip(evt, pt, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this).attr("r", 6.5);
            self._hideTooltip();
          });
      });
    },

    _renderSmallMultiples: function (d3, stage, activeEntities, axes, axisStats, theme, config, getNormalizedScore, fSizes) {
      var self = this;
      var valueFmt = config.valueFormat || "auto";

      var gridWrapper = document.createElement("div");
      gridWrapper.className = "small-multiples-grid";
      gridWrapper.style.display = "grid";
      gridWrapper.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px, 1fr))";
      gridWrapper.style.gap = "12px";
      gridWrapper.style.padding = "6px 0";
      stage.appendChild(gridWrapper);

      var numAxes = axes.length;
      var angleSlice = (Math.PI * 2) / numAxes;

      activeEntities.forEach(function (entity, entIdx) {
        var card = document.createElement("div");
        card.style.backgroundColor = theme.cardBg;
        card.style.border = "1px solid " + theme.cardBorder;
        card.style.borderRadius = "8px";
        card.style.padding = "8px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "center";
        card.style.boxSizing = "border-box";
        card.style.cursor = "pointer";
        card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

        card.onmouseenter = function () {
          card.style.transform = "translateY(-2px)";
          card.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
        };
        card.onmouseleave = function () {
          card.style.transform = "none";
          card.style.boxShadow = "none";
        };

        var title = document.createElement("div");
        title.style.fontSize = fSizes.hudVal;
        title.style.fontWeight = "700";
        title.style.color = theme.text;
        title.style.marginBottom = "4px";
        title.style.textAlign = "center";
        title.style.whiteSpace = "nowrap";
        title.style.overflow = "hidden";
        title.style.textOverflow = "ellipsis";
        title.style.width = "100%";
        title.innerText = entity.name;
        card.appendChild(title);

        var miniSvg = d3.select(card)
          .append("svg")
          .attr("width", 180)
          .attr("height", 160)
          .attr("viewBox", "0 0 180 160");

        var mg = miniSvg.append("g").attr("transform", "translate(90, 85)");
        var miniRadius = 60;
        var color = entity._isOther ? "#64748b" : theme.colors[entIdx % theme.colors.length];

        [0.33, 0.66, 1.0].forEach(function (lvl) {
          var poly = [];
          for (var i = 0; i < numAxes; i++) {
            var ang = i * angleSlice - Math.PI / 2;
            poly.push((miniRadius * lvl * Math.cos(ang)) + "," + (miniRadius * lvl * Math.sin(ang)));
          }
          mg.append("polygon")
            .attr("points", poly.join(" "))
            .attr("fill", lvl === 1.0 ? theme.bg : "none")
            .attr("stroke", theme.grid)
            .attr("stroke-width", 1);
        });

        var polyPoints = [];
        axes.forEach(function (axis, i) {
          var score = getNormalizedScore(entity, axis);
          var ang = i * angleSlice - Math.PI / 2;
          var px = score * miniRadius * Math.cos(ang);
          var py = score * miniRadius * Math.sin(ang);
          polyPoints.push(px + "," + py);
        });

        mg.append("polygon")
          .attr("points", polyPoints.join(" "))
          .attr("fill", color)
          .attr("fill-opacity", 0.35)
          .attr("stroke", color)
          .attr("stroke-width", 2);

        gridWrapper.appendChild(card);
      });
    },

    _showEntityTooltip: function (evt, entity, axes, theme, valueFmt) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid " + theme.grid + ";padding-bottom:4px;'>" + entity.name + "</div>";
      html += "<table style='width:100%;font-size:11px;border-collapse:collapse;'>";

      axes.forEach(function (axis) {
        var rawV = entity.values[axis.id] || 0;
        var fmtV = formatValue(rawV, valueFmt, entity.rendered && entity.rendered[axis.id]);
        html += "<tr><td style='padding:2px 8px 2px 0;color:" + theme.subtext + ";'>" + axis.label + ":</td>";
        html += "<td style='padding:2px 0;font-weight:600;text-align:right;'>" + fmtV + "</td></tr>";
      });

      html += "</table>";
      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _showPointTooltip: function (evt, pt, theme, valueFmt) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var fmtV = pt.entity.rendered && pt.entity.rendered[pt.axis.id] ? pt.entity.rendered[pt.axis.id] : formatValue(pt.val, valueFmt);

      var html = "<div style='font-weight:700;font-size:12px;margin-bottom:2px;color:" + pt.color + ";'>" + pt.entity.name + "</div>";
      html += "<div style='font-size:13px;font-weight:800;'>" + pt.axis.label + ": " + fmtV + "</div>";
      html += "<div style='font-size:10px;color:" + theme.subtext + ";margin-top:2px;'>Normalized Spoke Score: " + Math.round(pt.score * 100) + "%</div>";

      var links = (pt.entity.links && pt.entity.links[pt.axis.id]) || [];
      if (links.length > 0) {
        html += "<div style='font-size:9px;color:#2563eb;margin-top:4px;font-weight:600;'>&#8599; Click to drill down in Looker</div>";
      }

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _moveTooltip: function (evt) {
      var tt = this._tooltip;
      var x = evt.pageX + 14;
      var y = evt.pageY - 28;
      var maxW = window.innerWidth - 220;
      if (x > maxW) x = evt.pageX - 200;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) {
        this._tooltip.style.display = "none";
      }
    }
  });
})();
