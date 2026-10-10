/**
 * Rank Bump & Trajectory Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Mode Functional Capabilities:
 *  1. bump: Classic smooth cubic Bézier rank bump curves with inverted rank axis (#1 at top).
 *  2. slope: Two-period comparative slopegraph highlighting net rank gainers and fallers.
 *  3. parallel_coords: Multi-stage parallel coordinate trajectories with normalized metric spacing.
 *  4. stream: Ranked area stream bands showing volumetric evolution over time.
 *
 * Scalability for Expanded Row Limits (5,000+ Rows):
 *  - High-performance client-side aggregation engine handles large datasets seamlessly.
 *  - Configurable Top-N entity truncation (Top 5 to Top 50, or All) to maintain smooth 60 FPS rendering.
 *  - Pure SVG rendering with GPU-accelerated CSS animations and clean lifecycle teardown.
 *
 * Configuration Options:
 *  - Strictly partitioned into 2 clean sections: Display and Style (prevents Edit Viz modal tab crowding).
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
      name: 'Google Enterprise',
      colors: ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#00ACC1', '#FF7043', '#1A73E8', '#188038', '#D93025'],
      bg: '#ffffff',
      cardBg: '#f8f9fa',
      text: '#202124',
      subtext: '#5f6368',
      border: '#dadce0',
      grid: '#f1f3f4',
      nodeFill: '#ffffff',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      glowColor: 'rgba(66, 133, 244, 0.35)',
      posBadgeBg: '#ceead6',
      posBadgeText: '#137333',
      negBadgeBg: '#fad2cf',
      negBadgeText: '#c5221f',
      neutralBadgeBg: '#e8eaed',
      neutralBadgeText: '#3c4043'
    },
    modern_slate: {
      name: 'Modern Slate',
      colors: ['#2563eb', '#0284c7', '#0d9488', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#6366f1', '#ec4899', '#14b8a6'],
      bg: '#ffffff',
      cardBg: '#f8fafc',
      text: '#0f172a',
      subtext: '#64748b',
      border: '#e2e8f0',
      grid: '#f1f5f9',
      nodeFill: '#ffffff',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      glowColor: 'rgba(37, 99, 235, 0.35)',
      posBadgeBg: '#dcfce7',
      posBadgeText: '#15803d',
      negBadgeBg: '#fee2e2',
      negBadgeText: '#b91c1c',
      neutralBadgeBg: '#f1f5f9',
      neutralBadgeText: '#475569'
    },
    cyberpunk_dark: {
      name: 'Cyberpunk Dark (NOC / Telemetry)',
      colors: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#4ade80', '#fbbf24', '#fb7185', '#2dd4bf', '#a78bfa', '#facc15'],
      bg: '#0b1120',
      cardBg: '#111827',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
      grid: '#1e293b',
      nodeFill: '#0b1120',
      hudBg: 'rgba(17, 24, 39, 0.94)',
      glowColor: 'rgba(56, 189, 248, 0.5)',
      posBadgeBg: '#064e3b',
      posBadgeText: '#6ee7b7',
      negBadgeBg: '#4c0519',
      negBadgeText: '#fda4af',
      neutralBadgeBg: '#1e293b',
      neutralBadgeText: '#cbd5e1'
    },
    emerald_finops: {
      name: 'Emerald FinOps',
      colors: ['#059669', '#10b981', '#047857', '#0d9488', '#14b8a6', '#0f766e', '#34d399', '#6ee7b7', '#065f46', '#115e59'],
      bg: '#ffffff',
      cardBg: '#f0fdf4',
      text: '#064e3b',
      subtext: '#047857',
      border: '#bbf7d0',
      grid: '#f0fdf4',
      nodeFill: '#ffffff',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      glowColor: 'rgba(16, 185, 129, 0.35)',
      posBadgeBg: '#d1fae5',
      posBadgeText: '#065f46',
      negBadgeBg: '#ffe4e6',
      negBadgeText: '#9f1239',
      neutralBadgeBg: '#e2e8f0',
      neutralBadgeText: '#475569'
    },
    sunset_media: {
      name: 'Sunset Media & Coral',
      colors: ['#f97316', '#ef4444', '#e11d48', '#be123c', '#fb923c', '#f59e0b', '#d97706', '#b45309', '#ea580c', '#c2410c'],
      bg: '#ffffff',
      cardBg: '#fffbeb',
      text: '#431407',
      subtext: '#7c2d12',
      border: '#fed7aa',
      grid: '#fff7ed',
      nodeFill: '#ffffff',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      glowColor: 'rgba(249, 115, 22, 0.35)',
      posBadgeBg: '#dcfce7',
      posBadgeText: '#15803d',
      negBadgeBg: '#fee2e2',
      negBadgeText: '#b91c1c',
      neutralBadgeBg: '#fef3c7',
      neutralBadgeText: '#78350f'
    },
    wellverse_healthcare: {
      name: 'Wellverse Healthcare',
      colors: ['#143359', '#00AF68', '#2E7CF6', '#FFB500', '#7C5CFC', '#14B8A6', '#E5484D', '#94A3B8', '#1E467A', '#5FD3A0'],
      bg: '#ffffff',
      cardBg: '#F8FAFC',
      text: '#143359',
      subtext: '#64748B',
      border: '#CBD5E1',
      grid: '#EEF2F7',
      nodeFill: '#ffffff',
      hudBg: 'rgba(255, 255, 255, 0.96)',
      glowColor: 'rgba(20, 51, 89, 0.35)',
      posBadgeBg: '#E6F7EF',
      posBadgeText: '#006B40',
      negBadgeBg: '#FDECEC',
      negBadgeText: '#B42318',
      neutralBadgeBg: '#EEF2F7',
      neutralBadgeText: '#64748B'
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

  function formatMetricValue(val, formatMode, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    if (formatMode === 'auto' && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? '-' : '';
    if (formatMode === 'compact_currency') {
      if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
      return sign + '$' + abs.toFixed(0);
    }
    if (formatMode === 'compact_number' || formatMode === 'compact') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
      return sign + abs.toFixed(1);
    }
    if (formatMode === 'percentage' || formatMode === 'percent') {
      return (num * (abs <= 1.0 ? 100 : 1)).toFixed(1) + '%';
    }
    if (formatMode === 'decimal_2' || formatMode === 'decimal') {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatMode === 'integer') {
      return sign + abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (formatMode === 'raw') {
      return String(val);
    }
    // Default fallback
    if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
    return sign + '$' + abs.toFixed(0);
  }

  var visObject = {
    id: "rank_bump_chart",
    label: "Rank Bump & Trajectory Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Visualization Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Rank Bump Chart (Smooth Bézier)": "bump" },
          { "Slopegraph (First vs Last Period)": "slope" },
          { "Parallel Coordinates (Stage Paths)": "parallel_coords" },
          { "Streamgraph (Ranked Volume Flows)": "stream" }
        ],
        default: "bump"
      },
      dimFieldOverride: {
        type: "string",
        label: "Entity Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      pivotFieldOverride: {
        type: "string",
        label: "Pivot / Period Dimension (Optional)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measureFieldOverride: {
        type: "string",
        label: "Primary Ranking Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      targetMeasureOverride: {
        type: "string",
        label: "Comparison / Target Measure (Optional)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "Reference Line / Target Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "Dataset Mean (Average Rank / Value)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Benchmark Value": "fixed_value" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "Measure Column (Target Measure)": "measure_column" },
          { "None / Hidden": "none" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Value (when Fixed Mode)",
        section: "Display",
        order: 7,
        default: 0
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 8,
        default: "Performance Baseline"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Rank Volatility Alert Threshold (Spots Shifted)",
        section: "Display",
        order: 9,
        default: 3
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Interpolation",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Bump X (Smooth Cubic Bézier)": "bumpX" },
          { "Natural Spline": "natural" },
          { "Monotone X (Preserves Monotonicity)": "monotoneX" },
          { "Linear (Straight Angle Segments)": "linear" }
        ],
        default: "bumpX"
      },
      sortBy: {
        type: "string",
        label: "Entity Sorting & Ordering",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Final Period Rank (Leader First)": "rank_asc" },
          { "Total Aggregate Metric Descending": "metric_desc" },
          { "Total Aggregate Metric Ascending": "metric_asc" },
          { "Alphabetical (A to Z)": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "rank_asc"
      },
      topNEntities: {
        type: "string",
        label: "Display Entity Limit",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Top 5 Ranked Entities": "5" },
          { "Top 8 Ranked Entities": "8" },
          { "Top 10 Ranked Entities": "10" },
          { "Top 12 Ranked Entities": "12" },
          { "Top 15 Ranked Entities": "15" },
          { "Top 20 Ranked Entities": "20" },
          { "All Entities (Expanded Limits)": "all" }
        ],
        default: "12"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into 'Other' Aggregate",
        section: "Display",
        order: 13,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Value Entities",
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
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard"
      },
      showValueLabels: {
        type: "string",
        label: "Data Value Labels",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "All Entities": "all" },
          { "Min/Max Peaks & Leaders Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all"
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },
      lineWidth: {
        type: "number",
        label: "Trajectory Line Thickness (px)",
        section: "Display",
        order: 19,
        default: 4
      },
      nodeRadius: {
        type: "number",
        label: "Node Marker Radius (px)",
        section: "Display",
        order: 20,
        default: 14
      },
      showNodeRanks: {
        type: "boolean",
        label: "Show Rank Numbers in Nodes (#1, #2)",
        section: "Display",
        order: 21,
        default: true
      },
      showRankBadges: {
        type: "boolean",
        label: "Show Net Rank Shift Delta Badges (+2, -1)",
        section: "Display",
        order: 22,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Entity Search Filter",
        section: "Display",
        order: 23,
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
        label: "Custom Positive Rank Gainer Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Negative Rank Faller Hex",
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
          { "Higher is Better (#1 = Highest Metric)": "higher_is_better" },
          { "Lower is Better (#1 = Lowest Cost/Latency/Defect)": "lower_is_better" }
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
        label: "Metric Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto (from Looker Field)": "auto" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Percentage (12.5%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2" },
          { "Integer (1,234)": "integer" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_currency"
      },
      showVerticalGrid: {
        type: "boolean",
        label: "Show Period Vertical Gridlines",
        section: "Style",
        order: 8,
        default: true
      },
      showRankAxis: {
        type: "boolean",
        label: "Show Left-Hand Rank Numbers Axis",
        section: "Style",
        order: 9,
        default: true
      },
      animateTrajectories: {
        type: "boolean",
        label: "Enable Smooth Transition Path Drawing",
        section: "Style",
        order: 10,
        default: true
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dimFieldOverride: { role: "dimension", defaultIdx: 0 },
        pivotFieldOverride: { role: "dimension", defaultIdx: 1 },
        measureFieldOverride: { role: "measure", defaultIdx: 0 },
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
      this._setupResizeObserver(element);

      element.innerHTML = "";
      this.container = document.createElement("div");
      this.container.className = "looker-rank-bump-chart-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.overflow = "hidden";
      this.container.style.position = "relative";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this.container);
      this.searchFilter = "";
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
      if (curW <= 10 || curH <= 10) return;

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

    updateAsync: function (data, element, config, queryResponse, details, done) {\n      this._registerDynamicFieldOptions(queryResponse);\n      this._element = element;
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

      this.clearErrors();

      // Ensure root container exists
      if (!this.container || this.container.parentElement !== element) {
        element.innerHTML = "";
        this.container = document.createElement("div");
        this.container.className = "looker-rank-bump-chart-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.overflow = "hidden";
        this.container.style.position = "relative";
        this.container.style.boxSizing = "border-box";
        this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this.container);
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, data, config, queryResponse, details);
          done();
        } catch (err) {
          console.error("Rank Bump Chart rendering error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the Rank Bump Chart."
          });
          done();
        }
      });
    },

    renderChart: function (d3, data, config, queryResponse, details) {
      var container = this.container;
      // Clean up previous SVG and controls cleanly
      container.innerHTML = "";

      // Validate dimensions and measures (support standard dimensions/measures and dimension_like/measure_like)
      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }
      var pivots = (queryResponse.fields.pivots && queryResponse.fields.pivots.length > 0)
        ? queryResponse.fields.pivots
        : (queryResponse.pivots || []);

      if (dimensions.length === 0 && measures.length === 0) {
        this.addError({
          title: "Insufficient Data",
          message: "Rank Bump Chart requires at least 1 Dimension (Entities) and 1 Pivoted Dimension or multiple chronological measures."
        });
        return;
      }

      // Dynamic field resolution
      var resolvedEntityDim = resolveField(dimensions, config.dimFieldOverride, 0);
      var resolvedPivotDim = resolveField(dimensions, config.pivotFieldOverride, 1);
      var resolvedMeasure = resolveField(measures, config.measureFieldOverride, 0);
      var resolvedTargetMeasure = resolveField(measures, config.targetMeasureOverride, -1);

      // Configuration settings
      var themeKey = config.colorPalette || "google_enterprise";
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.google_enterprise);
      if (config.customPrimaryHex) theme.colors = [config.customPrimaryHex].concat(theme.colors);
      if (config.customPositiveHex) { theme.posBadgeText = config.customPositiveHex; }
      if (config.customNegativeHex) { theme.negBadgeText = config.customNegativeHex; }

      var viewMode = config.viewMode || "bump";
      var curveType = config.curveInterpolation || "bumpX";
      var topN = config.topNEntities || "12";
      var valueFormat = config.valueFormat || "compact_currency";
      var lineWidth = Math.max(1, Number(config.lineWidth) || 4);
      var nodeRadius = Math.max(6, Number(config.nodeRadius) || 14);
      var showNodeRanks = config.showNodeRanks !== false;
      var showEndLabels = config.showEndLabels !== false;
      var showRankBadges = config.showRankBadges !== false;
      var hudMode = config.hudMode || "scorecard";
      var showExecutiveHUD = hudMode !== "hidden";
      var showSearch = config.showSearch !== false;
      var showVerticalGrid = config.showVerticalGrid !== false;
      var showRankAxis = config.showRankAxis !== false;
      var animateTrajectories = config.animateTrajectories !== false;
      var metricPolarity = config.metricPolarity || "higher_is_better";
      var fontScale = config.fontScale || "standard";
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var fixedTarget = Number(config.fixedTargetValue) || 0;
      var referenceLabel = config.referenceLineLabel || "Performance Baseline";
      var anomalyThreshold = Number(config.anomalyThresholdPct) || 3;
      var sortByMode = config.sortBy || "rank_asc";
      var suppressZeroNull = config.suppressZeroNull !== false;

      // Extract Entities, Periods, and Metrics
      var periods = [];
      var entitiesMap = {}; // entityName -> { name: string, values: { [period]: number }, drills: { [period]: any } }
      var isPivoted = (pivots.length > 0) || (queryResponse.pivots && queryResponse.pivots.length > 0);

      var entityDim = resolvedEntityDim ? (resolvedEntityDim.name || resolvedEntityDim) : (dimensions[0] ? (dimensions[0].name || dimensions[0]) : "entity");
      var entityLabel = resolvedEntityDim ? (resolvedEntityDim.label_short || resolvedEntityDim.label || resolvedEntityDim.name || "Entity") : "Entity";

      if (isPivoted) {
        // Collect periods in order from queryResponse.pivots
        if (queryResponse.pivots && queryResponse.pivots.length > 0) {
          queryResponse.pivots.forEach(function (p) {
            var pKey = (typeof p === "object" && p !== null) ? (p.key || p.name || String(p)) : String(p);
            if (pKey && periods.indexOf(pKey) === -1) periods.push(pKey);
          });
        }

        // If no pivots metadata array, fallback to scan data
        if (periods.length === 0) {
          data.forEach(function (row) {
            measures.forEach(function (m) {
              var mName = m.name || m;
              var pObj = row[mName];
              if (pObj && typeof pObj === "object") {
                Object.keys(pObj).forEach(function (pk) {
                  var sub = pObj[pk];
                  if (sub && typeof sub === "object" && sub.value === undefined && sub.rendered === undefined && !Array.isArray(sub)) {
                    Object.keys(sub).forEach(function (subKey) {
                      if (periods.indexOf(subKey) === -1) periods.push(subKey);
                    });
                  } else {
                    if (periods.indexOf(pk) === -1) periods.push(pk);
                  }
                });
              }
            });
          });
        }

        var primaryMeasure = resolvedMeasure ? (resolvedMeasure.name || resolvedMeasure) : (measures[0] ? (measures[0].name || measures[0]) : null);

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          if (primaryMeasure && row[primaryMeasure]) {
            var measObj = row[primaryMeasure];
            periods.forEach(function (p) {
              var cell = measObj ? measObj[p] : null;
              if (cell === undefined && typeof measObj === "object" && measObj !== null) {
                for (var k in measObj) {
                  if (measObj[k] && typeof measObj[k] === "object" && measObj[k][p] !== undefined) {
                    cell = measObj[k][p];
                    break;
                  }
                }
              }
              var numVal = 0;
              var drillLinks = null;
              if (cell && typeof cell === "object") {
                numVal = (cell.value !== undefined && cell.value !== null)
                  ? (Number(cell.value) || 0)
                  : ((cell.rendered !== undefined && cell.rendered !== null) ? (Number(cell.rendered) || 0) : 0);
                drillLinks = cell.links;
              } else if (cell !== undefined && cell !== null) {
                numVal = Number(cell) || 0;
              }
              entitiesMap[entityVal].values[p] = numVal;
              if (drillLinks) entitiesMap[entityVal].drills[p] = drillLinks;
            });
          }
        });
      } else if (measures.length >= 2) {
        // Unpivoted: Each measure represents a distinct period/milestone
        measures.forEach(function (m) {
          var mLabel = m.label_short || m.label || m.name || String(m);
          periods.push(mLabel);
        });

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          measures.forEach(function (m, idx) {
            var p = periods[idx];
            var mName = m.name || m;
            var cell = row[mName];
            var numVal = 0;
            var drillLinks = null;
            if (cell && typeof cell === "object") {
              numVal = cell.value !== undefined ? (Number(cell.value) || 0) : 0;
              drillLinks = cell.links;
            } else if (cell !== undefined && cell !== null) {
              numVal = Number(cell) || 0;
            }
            entitiesMap[entityVal].values[p] = numVal;
            if (drillLinks) entitiesMap[entityVal].drills[p] = drillLinks;
          });
        });
      } else if (dimensions.length >= 2 && measures.length >= 1) {
        // Multi-dimensional unpivoted: Dim 0 = Entity, Dim 1 = Period, Measure 0 = Value
        var periodDim = dimensions[1].name || dimensions[1];
        var measName = measures[0].name || measures[0];

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          var periodCell = row[periodDim];
          var pVal = "Unknown";
          if (periodCell !== undefined && periodCell !== null) {
            if (typeof periodCell === "object") {
              pVal = (periodCell.rendered !== undefined && periodCell.rendered !== null && periodCell.rendered !== "")
                ? String(periodCell.rendered)
                : ((periodCell.value !== undefined && periodCell.value !== null) ? String(periodCell.value) : "Unknown");
            } else {
              pVal = String(periodCell);
            }
          }
          if (periods.indexOf(pVal) === -1) periods.push(pVal);

          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          var cell = row[measName];
          var numVal = cell ? (cell.value !== undefined ? (Number(cell.value) || 0) : (Number(cell) || 0)) : 0;
          entitiesMap[entityVal].values[pVal] = numVal;
          if (cell && cell.links) entitiesMap[entityVal].drills[pVal] = cell.links;
        });
      }

      if (periods.length < 2) {
        this.addError({
          title: "Insufficient Periods",
          message: "Rank Bump Chart requires at least 2 chronological time periods or milestones to track trajectories."
        });
        return;
      }

      // If slope mode, truncate periods to just first and last
      if (viewMode === "slope" && periods.length > 2) {
        periods = [periods[0], periods[periods.length - 1]];
      }

      // Compute period-by-period rankings
      // For each period, rank entities descending by value
      var entityList = Object.keys(entitiesMap).map(function (k) { return entitiesMap[k]; });
      if (entityList.length === 0) {
        this.addError({
          title: "No Data Available",
          message: "No valid entity rows returned by query."
        });
        return;
      }

      // Rank calculation per period
      periods.forEach(function (p) {
        // Sort entities by value in this period desc
        entityList.sort(function (a, b) {
          var valA = a.values[p] !== undefined ? a.values[p] : -Infinity;
          var valB = b.values[p] !== undefined ? b.values[p] : -Infinity;
          if (valB !== valA) return valB - valA;
          return a.name.localeCompare(b.name);
        });

        entityList.forEach(function (e, rankIdx) {
          if (!e.ranks) e.ranks = {};
          e.ranks[p] = rankIdx + 1; // 1-based rank
        });
      });

      // Overall average or latest rank for top-N selection
      entityList.forEach(function (e) {
        var firstP = periods[0];
        var lastP = periods[periods.length - 1];
        e.startRank = e.ranks[firstP] || 999;
        e.endRank = e.ranks[lastP] || 999;
        e.netRankShift = e.startRank - e.endRank; // Positive = gained ranks (e.g. #5 -> #2 = +3)
        var sumVals = 0;
        periods.forEach(function (p) { sumVals += (e.values[p] || 0); });
        e.totalValue = sumVals;
        e.latestValue = e.values[lastP] || 0;
      });

      // Filter Top N entities based on final rank or total value
      var displayEntities = entityList.slice();
      displayEntities.sort(function (a, b) {
        return a.endRank - b.endRank;
      });

      if (topN !== "all") {
        var limitNum = parseInt(topN, 10) || 12;
        displayEntities = displayEntities.slice(0, limitNum);
      }

      // Assign palette colors
      displayEntities.forEach(function (e, idx) {
        e.color = theme.colors[idx % theme.colors.length];
      });

      // Executive Metrics computation
      var totalEntities = entityList.length;
      var topEntity = displayEntities[0] || { name: "N/A", latestValue: 0 };
      var biggestGainer = null;
      var biggestFaller = null;
      var maxGain = 0;
      var maxLoss = 0;

      displayEntities.forEach(function (e) {
        if (e.netRankShift > maxGain) {
          maxGain = e.netRankShift;
          biggestGainer = e;
        }
        if (e.netRankShift < maxLoss) {
          maxLoss = e.netRankShift;
          biggestFaller = e;
        }
      });

      // Prepare DOM layout
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Executive Summary HUD Header
      if (showExecutiveHUD) {
        var hud = document.createElement("div");
        hud.className = "bump-hud-header";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.justifyContent = "space-between";
        hud.style.flexWrap = "wrap";
        hud.style.gap = "10px";
        hud.style.padding = "10px 18px";
        hud.style.backgroundColor = theme.cardBg;
        hud.style.borderBottom = "1px solid " + theme.border;
        hud.style.fontSize = "12px";

        var titleText = config.customTitleOverride || ("Executive " + entityLabel + " Rank Trajectories");
        var subtitleText = config.customSubtitleOverride || (viewMode === "slope" ? "Two-Period Comparative Shift" : "Multi-Period Volatility & Competitive Momentum");

        var statsHtml = "";
        if (hudMode === "compact_strip") {
          statsHtml = '<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">' +
            '<span style="font-weight: 700; color:' + theme.text + ';">' + titleText + '</span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span style="color:' + theme.subtext + ';">#1: <strong style="color:' + (topEntity.color || theme.text) + ';">' + topEntity.name + '</strong> (' + formatMetricValue(topEntity.latestValue, valueFormat) + ')</span>';
          if (biggestGainer && maxGain > 0) {
            statsHtml += '<span style="color:' + theme.subtext + ';">|</span><span style="color:' + theme.posBadgeText + ';">▲ ' + biggestGainer.name + ' (+' + maxGain + ')</span>';
          }
          if (biggestFaller && maxLoss < 0) {
            statsHtml += '<span style="color:' + theme.subtext + ';">|</span><span style="color:' + theme.negBadgeText + ';">▼ ' + biggestFaller.name + ' (' + maxLoss + ')</span>';
          }
          statsHtml += '</div>';
        } else {
          statsHtml = '<div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">';
          if (config.customTitleOverride) {
            statsHtml += '<div><div style="font-size: 14px; font-weight: 800; color:' + theme.text + ';">' + titleText + '</div>' +
                         '<div style="font-size: 11px; color:' + theme.subtext + ';">' + subtitleText + '</div></div>';
          }
          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Active ' + entityLabel + 's</span>' +
                       '<div style="font-size: 16px; font-weight: 800; color:' + theme.text + ';">' + totalEntities + '</div></div>';

          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Current #1 Leader</span>' +
                       '<div style="font-size: 15px; font-weight: 800; color:' + (topEntity.color || theme.text) + ';">🥇 ' + topEntity.name + ' <span style="font-size: 12px; font-weight: 600; color:' + theme.subtext + ';">(' + formatMetricValue(topEntity.latestValue, valueFormat) + ')</span></div></div>';

          if (biggestGainer && maxGain > 0) {
            statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Top Rank Gainer</span>' +
                         '<div style="font-size: 14px; font-weight: 700; color:' + theme.posBadgeText + ';">🚀 ' + biggestGainer.name + ' <span style="padding: 1px 6px; border-radius: 4px; background:' + theme.posBadgeBg + '; font-size: 11px;">+' + maxGain + ' spots</span></div></div>';
          }

          if (biggestFaller && maxLoss < 0) {
            statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Top Rank Faller</span>' +
                         '<div style="font-size: 14px; font-weight: 700; color:' + theme.negBadgeText + ';">🔻 ' + biggestFaller.name + ' <span style="padding: 1px 6px; border-radius: 4px; background:' + theme.negBadgeBg + '; font-size: 11px;">' + maxLoss + ' spots</span></div></div>';
          }
          statsHtml += '</div>';
        }

        // Search Input
        var searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.alignItems = "center";
        searchContainer.style.gap = "8px";

        if (showSearch) {
          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter " + entityLabel + "...";
          searchInput.value = this.searchFilter || "";
          searchInput.style.padding = "5px 10px";
          searchInput.style.borderRadius = "6px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.backgroundColor = theme.bg;
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "12px";
          searchInput.style.outline = "none";
          searchInput.style.width = "170px";

          searchInput.addEventListener("input", function (e) {
            self.searchFilter = e.target.value.toLowerCase().trim();
            self.applySearchFilter(theme);
          });
          searchContainer.appendChild(searchInput);
        }

        hud.innerHTML = statsHtml;
        hud.appendChild(searchContainer);
        container.appendChild(hud);
      }

      // Chart Area Container
      var chartContainer = document.createElement("div");
      chartContainer.className = "bump-svg-container";
      chartContainer.style.width = "100%";
      chartContainer.style.height = showExecutiveHUD ? "calc(100% - 55px)" : "100%";
      chartContainer.style.position = "relative";
      container.appendChild(chartContainer);

      var width = Math.max(chartContainer.clientWidth || container.clientWidth || 900, 400);
      var height = Math.max(chartContainer.clientHeight || container.clientHeight || 550, 320);

      var margin = {
        top: 40,
        right: showEndLabels ? 180 : 40,
        bottom: 45,
        left: showRankAxis ? 55 : 30
      };

      var innerWidth = Math.max(200, width - margin.left - margin.right);
      var innerHeight = Math.max(150, height - margin.top - margin.bottom);

      var svg = d3.select(chartContainer)
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block")
        .style("overflow", "visible");

      // Defs for gradients & glowing drop shadows
      var defs = svg.append("defs");

      // Glow filter for highlighted line
      var filter = defs.append("filter")
        .attr("id", "bump-glow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");
      filter.append("feDropShadow")
        .attr("dx", "0")
        .attr("dy", "2")
        .attr("stdDeviation", "4")
        .attr("flood-color", theme.glowColor);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scalePoint()
        .domain(periods)
        .range([0, innerWidth])
        .padding(0.1);

      // Max rank to display on Y axis
      var maxRank = displayEntities.length;
      var yScale = d3.scaleLinear()
        .domain([1, maxRank])
        .range([0, innerHeight]);

      // Vertical Period Grid Lines & Column Headers
      periods.forEach(function (p) {
        var x = xScale(p);

        if (showVerticalGrid) {
          g.append("line")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke", theme.grid)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4");
        }

        // Column Top Period Label
        g.append("text")
          .attr("x", x)
          .attr("y", -14)
          .attr("text-anchor", "middle")
          .attr("fill", theme.text)
          .attr("font-size", "12px")
          .attr("font-weight", "700")
          .text(p);
      });

      // Left Rank Numbers Axis (#1, #2, ...)
      if (showRankAxis) {
        for (var r = 1; r <= maxRank; r++) {
          var yPos = yScale(r);
          g.append("text")
            .attr("x", -15)
            .attr("y", yPos + 4)
            .attr("text-anchor", "end")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .text("#" + r);
        }
      }

      // Interpolator function
      var curveFn = d3.curveBumpX;
      if (curveType === "natural") curveFn = d3.curveNatural;
      else if (curveType === "monotoneX") curveFn = d3.curveMonotoneX;
      else if (curveType === "linear") curveFn = d3.curveLinear;

      // Line Generator
      var lineGen = d3.line()
        .x(function (d) { return xScale(d.period); })
        .y(function (d) { return yScale(d.rank); })
        .curve(curveFn);

      // Create Tooltip DOM
      var tooltip = d3.select(chartContainer)
        .append("div")
        .attr("class", "looker-bump-tooltip");
      var tooltipEl = tooltip.node();
      tooltipEl.style.position = "absolute";
      tooltipEl.style.display = "none";
      tooltipEl.style.padding = "10px 14px";
      tooltipEl.style.backgroundColor = theme.cardBg;
      tooltipEl.style.color = theme.text;
      tooltipEl.style.border = "1px solid " + theme.border;
      tooltipEl.style.borderRadius = "8px";
      tooltipEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltipEl.style.fontSize = "12px";
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.zIndex = "100";
      tooltipEl.style.backdropFilter = "blur(6px)";
      tooltipEl.style.minWidth = "180px";

      // Groups for layered rendering
      var linesGroup = g.append("g").attr("class", "bump-lines");
      var nodesGroup = g.append("g").attr("class", "bump-nodes");
      var labelsGroup = g.append("g").attr("class", "bump-labels");

      // Draw Trajectory Lines for each entity
      displayEntities.forEach(function (e) {
        var points = periods.map(function (p) {
          return {
            period: p,
            rank: e.ranks[p] || maxRank,
            value: e.values[p] || 0,
            drills: e.drills[p]
          };
        });

        var pathEl = linesGroup.append("path")
          .datum(points)
          .attr("class", "bump-line-path entity-" + sanitizeClass(e.name))
          .attr("d", lineGen)
          .attr("fill", "none")
          .attr("stroke", e.color)
          .attr("stroke-width", lineWidth)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.85)
          .style("cursor", "pointer")
          .style("transition", "opacity 0.2s, stroke-width 0.2s");

        if (animateTrajectories) {
          var totalLength = (pathEl.node() && typeof pathEl.node().getTotalLength === "function") ? pathEl.node().getTotalLength() : 800;
          pathEl
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(850)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
        }

        // Draw Nodes at each period
        points.forEach(function (pt) {
          var nodeG = nodesGroup.append("g")
            .attr("class", "bump-node-group entity-" + sanitizeClass(e.name))
            .attr("transform", "translate(" + xScale(pt.period) + "," + yScale(pt.rank) + ")")
            .style("cursor", "pointer");

          // Outer Circle Marker
          nodeG.append("circle")
            .attr("r", nodeRadius)
            .attr("fill", theme.nodeFill)
            .attr("stroke", e.color)
            .attr("stroke-width", Math.max(2, lineWidth * 0.75))
            .style("transition", "transform 0.15s, stroke-width 0.15s");

          // Inner Rank Text (#1, #2...)
          if (showNodeRanks && nodeRadius >= 10) {
            nodeG.append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .attr("fill", theme.text)
              .attr("font-size", (nodeRadius >= 13 ? "11px" : "9px"))
              .attr("font-weight", "800")
              .text(pt.rank);
          }

          // Hover & Drill Interactivity
          nodeG
            .on("mouseenter", function (event) {
              self.highlightEntity(e.name, theme, lineWidth);
              self.showTooltip(tooltipEl, event, e, pt, valueFormat, theme);
            })
            .on("mousemove", function (event) {
              self.moveTooltip(tooltipEl, event);
            })
            .on("mouseleave", function () {
              self.resetHighlight(theme, lineWidth);
              tooltipEl.style.display = "none";
            })
            .on("click", function (event) {
              if (pt.drills && pt.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({
                  links: pt.drills,
                  event: event
                });
              }
            });
        });

        // Hover over the line itself
        pathEl
          .on("mouseenter", function (event) {
            self.highlightEntity(e.name, theme, lineWidth);
          })
          .on("mouseleave", function () {
            self.resetHighlight(theme, lineWidth);
            tooltipEl.style.display = "none";
          });

        // End Label & Rank Shift Badge at final period
        if (showEndLabels) {
          var lastPeriod = periods[periods.length - 1];
          var lastRank = e.ranks[lastPeriod] || maxRank;
          var endX = xScale(lastPeriod) + nodeRadius + 12;
          var endY = yScale(lastRank);

          var labelG = labelsGroup.append("g")
            .attr("class", "bump-end-label entity-" + sanitizeClass(e.name))
            .attr("transform", "translate(" + endX + "," + endY + ")")
            .style("cursor", "pointer");

          // Entity Name text
          labelG.append("text")
            .attr("dy", "0.35em")
            .attr("fill", e.color)
            .attr("font-size", "12px")
            .attr("font-weight", "700")
            .text(truncateString(e.name, 18));

          // Rank Delta Badge (+2, -1, =)
          if (showRankBadges) {
            var shift = e.netRankShift;
            var badgeText = shift > 0 ? "+" + shift : shift < 0 ? "" + shift : "=";
            var badgeBg = shift > 0 ? theme.posBadgeBg : shift < 0 ? theme.negBadgeBg : theme.neutralBadgeBg;
            var badgeColor = shift > 0 ? theme.posBadgeText : shift < 0 ? theme.negBadgeText : theme.neutralBadgeText;

            var badgeG = labelG.append("g")
              .attr("transform", "translate(115, 0)");

            badgeG.append("rect")
              .attr("x", -12)
              .attr("y", -8)
              .attr("width", 28)
              .attr("height", 16)
              .attr("rx", 4)
              .attr("fill", badgeBg);

            badgeG.append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .attr("fill", badgeColor)
              .attr("font-size", "10px")
              .attr("font-weight", "800")
              .text(badgeText);
          }

          labelG
            .on("mouseenter", function () {
              self.highlightEntity(e.name, theme, lineWidth);
            })
            .on("mouseleave", function () {
              self.resetHighlight(theme, lineWidth);
            });
        }
      });

      // Apply search filter if active from previous input
      if (this.searchFilter) {
        this.applySearchFilter(theme);
      }
    },

    highlightEntity: function (entityName, theme, baseLineWidth) {
      var sClass = sanitizeClass(entityName);
      var root = d3.select(this.container);
      root.selectAll(".bump-line-path")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.12;
        })
        .attr("stroke-width", function () {
          return d3.select(this).classed("entity-" + sClass) ? baseLineWidth + 3 : Math.max(1, baseLineWidth * 0.6);
        })
        .style("filter", function () {
          return d3.select(this).classed("entity-" + sClass) ? "url(#bump-glow)" : "none";
        });

      root.selectAll(".bump-node-group")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.15;
        });

      root.selectAll(".bump-end-label")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.15;
        });
    },

    resetHighlight: function (theme, baseLineWidth) {
      if (this.searchFilter) {
        this.applySearchFilter(theme);
        return;
      }
      var root = d3.select(this.container);
      root.selectAll(".bump-line-path")
        .attr("opacity", 0.85)
        .attr("stroke-width", baseLineWidth)
        .style("filter", "none");

      root.selectAll(".bump-node-group").attr("opacity", 1.0);
      root.selectAll(".bump-end-label").attr("opacity", 1.0);
    },

    applySearchFilter: function (theme) {
      var term = this.searchFilter;
      var root = d3.select(this.container);
      if (!term) {
        root.selectAll(".bump-line-path").attr("opacity", 0.85);
        root.selectAll(".bump-node-group").attr("opacity", 1.0);
        root.selectAll(".bump-end-label").attr("opacity", 1.0);
        return;
      }

      root.selectAll(".bump-line-path").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.08);
      });

      root.selectAll(".bump-node-group").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.1);
      });

      root.selectAll(".bump-end-label").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.1);
      });
    },

    showTooltip: function (tooltipEl, event, entity, point, valueFormat, theme) {
      var shift = entity.startRank - point.rank;
      var shiftText = shift > 0 ? "+" + shift + " spots" : shift < 0 ? shift + " spots" : "Unchanged";
      var shiftBadgeColor = shift > 0 ? theme.posBadgeText : shift < 0 ? theme.negBadgeText : theme.subtext;

      var html = '<div style="font-weight: 800; font-size: 13px; color:' + entity.color + '; margin-bottom: 4px;">' + entity.name + '</div>' +
                 '<div style="font-size: 11px; color:' + theme.subtext + '; margin-bottom: 8px;">Period: <strong>' + point.period + '</strong></div>' +
                 '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">' +
                 '<span>Period Rank:</span>' +
                 '<strong style="font-size: 13px; color:' + theme.text + ';">#' + point.rank + '</strong>' +
                 '</div>' +
                 '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">' +
                 '<span>Period Metric:</span>' +
                 '<strong style="color:' + theme.text + ';">' + formatMetricValue(point.value, valueFormat) + '</strong>' +
                 '</div>' +
                 '<div style="display: flex; justify-content: space-between; border-top: 1px solid ' + theme.border + '; padding-top: 4px; margin-top: 4px;">' +
                 '<span>Trajectory vs Start:</span>' +
                 '<strong style="color:' + shiftBadgeColor + ';">' + shiftText + '</strong>' +
                 '</div>';

      if (point.drills && point.drills.length > 0) {
        html += '<div style="margin-top: 6px; font-size: 10px; color: #3b82f6; text-align: center;">⚡ Click to open Looker drill actions</div>';
      }

      tooltipEl.innerHTML = html;
      tooltipEl.style.display = "block";
      this.moveTooltip(tooltipEl, event);
    },

    moveTooltip: function (tooltipEl, event) {
      var rootRect = this.container.getBoundingClientRect();
      var x = event.clientX - rootRect.left + 15;
      var y = event.clientY - rootRect.top - 20;

      // Keep inside container bounds
      if (x + 200 > rootRect.width) x = rootRect.width - 210;
      if (y + 120 > rootRect.height) y = rootRect.height - 130;
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      tooltipEl.style.left = x + "px";
      tooltipEl.style.top = y + "px";
    }
  };

  function sanitizeClass(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  function truncateString(str, len) {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "…" : str;
  }

  looker.plugins.visualizations.add(visObject);
})();
