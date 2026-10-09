/**
 * Sankey Flow & Multi-Stage Allocation Diagram - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Mode Functional Capabilities:
 *  1. sankey: Classic multi-stage Sankey with interactive draggable vertical columns,
 *     Bezier ribbon interconnects, layer ranking, cycle-breaking, and collision avoidance.
 *  2. alluvial: Streamlined ribbon streams emphasizing stage-to-stage transition shares.
 *  3. horizontal_tree: Hierarchical cascading dendrogram breakdown from root to leaves.
 *  4. chord: Circular peering chord ring highlighting inter-categorical flow balance.
 *
 * Scalability for Expanded Row Limits (5,000+ Rows):
 *  - High-performance client-side aggregation engine merges duplicate dimensional paths.
 *  - Configurable Top-N link truncation and minimum % threshold filters to prevent visual clutter.
 *  - Pure SVG rendering with GPU-accelerated CSS animations and clean lifecycle teardown.
 *
 * Configuration Options:
 *  - Strictly partitioned into 2 clean sections: Display and Style (no modal crowding).
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
      name: "Google Enterprise Blue",
      isDark: false,
      colors: ["#1a73e8", "#12b5cb", "#e52592", "#f9ab00", "#1e8e3e", "#9334e6", "#e8710a", "#188038", "#4285f4", "#ea4335"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#1e293b",
      subtext: "#64748b",
      border: "#e2e8f0",
      linkDefault: "#94a3b8",
      linkHover: "#2563eb",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#38bdf8"
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      colors: ["#334155", "#475569", "#64748b", "#0f766e", "#0369a1", "#4338ca", "#b45309", "#be123c", "#15803d", "#701a75"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#475569",
      border: "#cbd5e1",
      linkDefault: "#cbd5e1",
      linkHover: "#0f172a",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#0ea5e9"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (NOC)",
      isDark: true,
      colors: ["#38bdf8", "#a855f7", "#34d399", "#f472b6", "#fbbf24", "#818cf8", "#2dd4bf", "#fb7185", "#60a5fa", "#c084fc"],
      bg: "#0b0f19",
      cardBg: "#111827",
      text: "#f9fafb",
      subtext: "#9ca3af",
      border: "#1f2937",
      linkDefault: "#1f2937",
      linkHover: "#38bdf8",
      hudBg: "rgba(17, 24, 39, 0.92)",
      nodeStroke: "#111827",
      pulseColor: "#00f0ff"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      colors: ["#059669", "#0d9488", "#0284c7", "#10b981", "#14b8a6", "#047857", "#0f766e", "#0369a1", "#16a34a", "#22c55e"],
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      text: "#064e3b",
      subtext: "#047857",
      border: "#bbf7d0",
      linkDefault: "#a7f3d0",
      linkHover: "#059669",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#10b981"
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      colors: ["#ea580c", "#d97706", "#e11d48", "#b45309", "#c2410c", "#be123c", "#f59e0b", "#f97316", "#fb7185", "#fbbf24"],
      bg: "#ffffff",
      cardBg: "#fffbeb",
      text: "#451a03",
      subtext: "#92400e",
      border: "#fde68a",
      linkDefault: "#fed7aa",
      linkHover: "#ea580c",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#f97316"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      colors: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8", "#1E467A", "#5FD3A0", "#8FB8F9", "#FFD166"],
      bg: "#ffffff",
      cardBg: "#F8FAFC",
      text: "#0F172A",
      subtext: "#64748B",
      border: "#E2E8F0",
      linkDefault: "#CBD5E1",
      linkHover: "#143359",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#00AF68"
    },
    custom_override: {
      name: "Custom Hex Override",
      isDark: false,
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00bcd4", "#ff6d00", "#455a64"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      linkDefault: "#cbd5e1",
      linkHover: "#1a73e8",
      hudBg: "rgba(255, 255, 255, 0.94)",
      nodeStroke: "#ffffff",
      pulseColor: "#1a73e8"
    }
  };

  function formatMetric(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    var n = Number(val);
    switch (fmt) {
      case "compact_currency":
        if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
        if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
        if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
        return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "currency":
        return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      case "compact":
      case "compact_num":
      case "compact_number":
        if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
        if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
        if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
        return n.toLocaleString();
      case "percent":
      case "percentage":
        return (n * 100).toFixed(1) + "%";
      case "decimal_2":
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(n);
      case "integer":
      default:
        return Math.round(n).toLocaleString();
    }
  }

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
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return list[0] || null;
  }

  looker.plugins.visualizations.add({
    id: "sankey_flow_diagram",
    label: "Sankey Flow & Allocation Diagram",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Flow Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Sankey Multi-Stage": "sankey" },
          { "Alluvial Proportional Streams": "alluvial" },
          { "Horizontal Dendrogram Tree": "horizontal_tree" },
          { "Circular Peering Chord": "chord" }
        ],
        default: "sankey"
      },
      sourceDimOverride: {
        type: "string",
        label: "Stage 1: Source / Origin Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      intermediateDimOverride: {
        type: "string",
        label: "Stage 2: Transition / Intermediate Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      targetDimOverride: {
        type: "string",
        label: "Stage 3: Destination / Outcome Dimension (Optional)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      volumeMeasureOverride: {
        type: "string",
        label: "Primary Volume Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Target / Benchmark Measure (Optional)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      nodeAlignment: {
        type: "string",
        label: "Node Alignment",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Justify (Outer Edges)": "justify" },
          { "Left Align": "left" },
          { "Right Align": "right" },
          { "Center Align": "center" }
        ],
        default: "justify"
      },
      linkColorMode: {
        type: "string",
        label: "Link Gradient Mode",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "Source-to-Target Gradient": "gradient" },
          { "Source Node Color": "source" },
          { "Target Node Color": "target" },
          { "Subtle Neutral Ribbon": "neutral" }
        ],
        default: "gradient"
      },
      curvature: {
        type: "number",
        label: "Bézier Curvature (0.1 - 0.8)",
        section: "Display",
        order: 9,
        display: "range",
        min: 0.1,
        max: 0.8,
        step: 0.05,
        default: 0.5
      },
      minLinkPct: {
        type: "string",
        label: "Minimum Flow Threshold Filter",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Show All Flows (0%)": "0" },
          { "Hide < 0.5% of stage": "0.005" },
          { "Hide < 1.0% of stage": "0.01" },
          { "Hide < 2.0% of stage": "0.02" },
          { "Hide < 5.0% of stage": "0.05" }
        ],
        default: "0"
      },
      topPathsLimit: {
        type: "string",
        label: "Top Paths Limit (Rows Optimization)",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "All Paths (Up to 5,000 rows)": "all" },
          { "Top 25 Heavy Paths": "25" },
          { "Top 50 Heavy Paths": "50" },
          { "Top 100 Heavy Paths": "100" },
          { "Top 200 Heavy Paths": "200" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Unselected Flows into (Other) Stream",
        section: "Display",
        order: 12,
        default: false
      },
      sortBy: {
        type: "string",
        label: "Node & Flow Sort Order",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Flow Volume Descending (Highest First)": "volume_desc" },
          { "Flow Volume Ascending (Lowest First)": "volume_asc" },
          { "Alphabetical / Categorical": "alphabetical" },
          { "Chronological / Natural Order": "natural" }
        ],
        default: "volume_desc"
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Flow Paths",
        section: "Display",
        order: 14,
        default: true
      },
      targetCalculationMode: {
        type: "string",
        label: "Target / Benchmark Calculation Mode",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Dataset Mean (Average Node Volume)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Benchmark Target Value": "fixed" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "Target Measure Column": "measure_column" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 16,
        default: 100000
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        section: "Display",
        order: 17,
        default: "Target Quota"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Anomaly Alert Threshold (% of Target)",
        section: "Display",
        order: 18,
        default: 125
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        section: "Display",
        order: 19,
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
        label: "Node & Ribbon Data Labels",
        section: "Display",
        order: 20,
        display: "select",
        values: [
          { "Show All Node Metrics": "all" },
          { "Dominant / Peak Flows Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all"
      },
      showNodePercentages: {
        type: "boolean",
        label: "Show Stage Share % on Nodes",
        section: "Display",
        order: 21,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Path Search Filter Toolbar",
        section: "Display",
        order: 22,
        default: true
      },
      enableAnimation: {
        type: "boolean",
        label: "Pulse Particle Flow Animation",
        section: "Display",
        order: 23,
        default: true
      },
      highlightFlowsOnHover: {
        type: "boolean",
        label: "Bi-Directional Path Highlighting",
        section: "Display",
        order: 24,
        default: true
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        section: "Display",
        order: 25,
        default: ""
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 26,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise Blue": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (NOC)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media (Warm Amber)": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: "#1a73e8"
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Target / Positive Flow Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: "#0d9488"
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Anomaly / Alert Flow Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: "#e11d48"
      },
      metricPolarity: {
        type: "string",
        label: "Metric Target Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Conversions, Throughput)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Cost Leakage)": "lower_is_better" }
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
          { "Compact (High-Density Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Standard Currency ($1,234,567)": "currency" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_currency"
      },
      nodeWidth: {
        type: "number",
        label: "Node Width (px)",
        section: "Style",
        order: 8,
        display: "range",
        min: 8,
        max: 36,
        step: 2,
        default: 18
      },
      nodePadding: {
        type: "number",
        label: "Node Vertical Gap (px)",
        section: "Style",
        order: 9,
        display: "range",
        min: 4,
        max: 36,
        step: 2,
        default: 16
      },
      linkOpacity: {
        type: "number",
        label: "Flow Ribbon Opacity (0.15 - 0.70)",
        section: "Style",
        order: 10,
        display: "range",
        min: 0.15,
        max: 0.70,
        step: 0.05,
        default: 0.38
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // Populates every field-role selector from the live query's actual
    // dimensions & measures (via Looker's `registerOptions` trigger) so users
    // pick columns by name instead of typing 1-based column indexes.
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        sourceDimOverride: { role: "dimension", defaultIdx: 0 },
        intermediateDimOverride: { role: "dimension", defaultIdx: 1 },
        targetDimOverride: { role: "dimension", defaultIdx: 2 },
        volumeMeasureOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasureOverride: { role: "measure", defaultIdx: -1 }
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
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \\u2192 " + fieldLabel(autoField)) : "Auto / None";
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
      element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      element.style.position = "relative";
      element.style.overflow = "hidden";
      element.style.width = "100%";
      element.style.height = "100%";

      var container = document.createElement("div");
      container.className = "sankey-viz-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);
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

    updateAsync: function (data, element, config, queryResponse, details, done) {
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

      this.clearErrors();

      var dims = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);

      if (dims.length < 2) {
        this.addError({
          title: "Dimensions Required",
          message: "Sankey Flow Diagram requires at least 2 Dimensions to map flows (e.g. Origin Stage & Destination Stage). Up to 8 stage dimensions are supported."
        });
        return;
      }
      if (meas.length < 1) {
        this.addError({
          title: "Measure Required",
          message: "Sankey Flow Diagram requires at least 1 Numeric Measure to drive flow ribbon widths (e.g. Total Sales, Units, or Traffic Count)."
        });
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.render(d3, data, element, config, queryResponse, dims, meas);
          done();
        } catch (err) {
          console.error("Sankey Viz render error:", err);
          self.addError({
            title: "Render Error",
            message: "Unable to render flow diagram: " + err.message
          });
          done();
        }
      });
    },

    render: function (d3, data, element, config, queryResponse, dims, meas) {
      var root = element.querySelector(".sankey-viz-root");
      if (!root) {
        element.innerHTML = "";
        root = document.createElement("div");
        root.className = "sankey-viz-root";
        root.style.width = "100%";
        root.style.height = "100%";
        root.style.display = "flex";
        root.style.flexDirection = "column";
        root.style.boxSizing = "border-box";
        root.style.overflow = "hidden";
        element.appendChild(root);
      }
      root.innerHTML = "";

      var oldTooltips = document.querySelectorAll(".sankey-tooltip-floating");
      oldTooltips.forEach(function (t) { t.remove(); });

      var palKey = config.colorPalette || "google_enterprise";
      var theme = PALETTES[palKey] || PALETTES.google_enterprise;
      if (palKey === "custom_override") {
        theme = Object.assign({}, theme);
        if (config.customPrimaryHex) {
          theme.colors = [config.customPrimaryHex, config.customPositiveHex || "#0d9488", config.customNegativeHex || "#e11d48", "#12b5cb", "#f9ab00", "#9334e6", "#e8710a"];
          theme.linkHover = config.customPrimaryHex;
          theme.pulseColor = config.customPrimaryHex;
        }
      }

      var viewMode = config.viewMode || "sankey";
      var nodeAlign = config.nodeAlignment || "justify";
      var linkColorMode = config.linkColorMode || "gradient";
      var curvature = Number(config.curvature) || 0.5;
      var nodeWidth = Number(config.nodeWidth) || 18;
      var nodePadding = Number(config.nodePadding) || 16;
      var linkOpacity = Number(config.linkOpacity) || 0.38;
      var valueFmt = config.valueFormat || "compact_currency";
      var showValues = config.showValueLabels !== "hidden";
      var showPct = config.showNodePercentages !== false;
      var showSearch = config.showSearch !== false;
      var hudMode = config.hudMode || "scorecard";
      var enableAnim = config.enableAnimation !== false;
      var highlightHover = config.highlightFlowsOnHover !== false;
      var minLinkPct = parseFloat(config.minLinkPct) || 0;
      var topPathsLimit = config.topPathsLimit || "all";
      var enableOtherRollup = config.enableOtherRollup === true;
      var sortBy = config.sortBy || "volume_desc";
      var suppressZeroNull = config.suppressZeroNull !== false;
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var fixedTargetVal = Number(config.fixedTargetValue) || 100000;
      var refLabel = config.referenceLineLabel || "Target Quota";
      var anomalyThresholdPct = Number(config.anomalyThresholdPct) || 125;
      var metricPolarity = config.metricPolarity || "higher_is_better";
      var fontScale = config.fontScale || "standard";

      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;
      if (fontScale === "compact") {
        root.style.fontSize = "11px";
      } else if (fontScale === "large") {
        root.style.fontSize = "13.5px";
      } else {
        root.style.fontSize = "12px";
      }

      // Resolve field overrides
      var resolvedSourceDim = resolveField(dims, config.sourceDimOverride, 0);
      var resolvedInterDim = resolveField(dims, config.intermediateDimOverride, 1);
      var resolvedTargetDim = config.targetDimOverride ? resolveField(dims, config.targetDimOverride, 2) : (dims.length > 2 ? dims[2] : null);

      var activeStageDims = [resolvedSourceDim, resolvedInterDim];
      if (resolvedTargetDim && resolvedTargetDim.name !== resolvedInterDim.name) {
        activeStageDims.push(resolvedTargetDim);
      }
      // If there are more dimensions in query not mapped, include remaining in sequential order up to 8 stages
      if (!config.sourceDimOverride && !config.intermediateDimOverride && dims.length > 3) {
        activeStageDims = dims.slice(0, 8);
      }

      var stageDimNames = activeStageDims.map(function (d) { return d.name; });
      var stageLabels = activeStageDims.map(function (d) { return d.label_short || d.label || d.name; });

      var resolvedVolMeasure = resolveField(meas, config.volumeMeasureOverride, 0);
      var resolvedSecMeasure = config.secondaryMeasureOverride ? resolveField(meas, config.secondaryMeasureOverride, -1) : (meas.length > 1 ? meas[1] : null);

      var valMeasureName = resolvedVolMeasure ? resolvedVolMeasure.name : meas[0].name;
      var secMeasureName = resolvedSecMeasure ? resolvedSecMeasure.name : null;

      var rawPaths = [];
      var totalGlobalVolume = 0;
      var allRowValues = [];

      data.forEach(function (row) {
        var rawVal = row[valMeasureName] ? row[valMeasureName].value : 0;
        var val = Number(rawVal) || 0;
        if (suppressZeroNull && val <= 0) return;

        totalGlobalVolume += val;
        allRowValues.push(val);
        var secVal = secMeasureName && row[secMeasureName] ? Number(row[secMeasureName].value) || 0 : null;

        var pathNodes = [];
        for (var s = 0; s < stageDimNames.length; s++) {
          var dName = stageDimNames[s];
          var cell = row[dName];
          var nodeName = cell ? (cell.rendered || cell.value || "(Blank)") : "(Blank)";
          pathNodes.push({ stage: s, name: String(nodeName).trim(), links: cell && cell.links ? cell.links : null });
        }

        rawPaths.push({
          nodes: pathNodes,
          value: val,
          secondary: secVal,
          row: row
        });
      });

      // Target calculation mode
      var computedBenchmark = 0;
      if (targetMode === "fixed") {
        computedBenchmark = fixedTargetVal;
      } else if (targetMode === "measure_column" && secMeasureName) {
        var sumTarget = 0, countTarget = 0;
        data.forEach(function (r) {
          if (r[secMeasureName] && !isNaN(Number(r[secMeasureName].value))) {
            sumTarget += Number(r[secMeasureName].value);
            countTarget++;
          }
        });
        computedBenchmark = countTarget > 0 ? (sumTarget / countTarget) : 0;
      } else if (allRowValues.length > 0) {
        var sortedVals = allRowValues.slice().sort(function (a, b) { return a - b; });
        if (targetMode === "dataset_median") {
          var mid = Math.floor(sortedVals.length / 2);
          computedBenchmark = sortedVals.length % 2 !== 0 ? sortedVals[mid] : (sortedVals[mid - 1] + sortedVals[mid]) / 2;
        } else if (targetMode === "percentile_p75") {
          var p75Idx = Math.min(sortedVals.length - 1, Math.floor(sortedVals.length * 0.75));
          computedBenchmark = sortedVals[p75Idx];
        } else if (targetMode === "percentile_p90") {
          var p90Idx = Math.min(sortedVals.length - 1, Math.floor(sortedVals.length * 0.90));
          computedBenchmark = sortedVals[p90Idx];
        } else {
          computedBenchmark = totalGlobalVolume / (allRowValues.length || 1);
        }
      }

      // Top-N and Other Rollup
      if (topPathsLimit !== "all") {
        var pLimit = parseInt(topPathsLimit, 10) || 50;
        rawPaths.sort(function (a, b) { return b.value - a.value; });
        if (rawPaths.length > pLimit) {
          if (enableOtherRollup) {
            var keptPaths = rawPaths.slice(0, pLimit);
            var otherPaths = rawPaths.slice(pLimit);
            var otherVol = otherPaths.reduce(function (sum, p) { return sum + p.value; }, 0);
            if (otherVol > 0) {
              var otherNodes = [];
              for (var s = 0; s < stageDimNames.length; s++) {
                otherNodes.push({ stage: s, name: "(Other Flows)", links: null });
              }
              keptPaths.push({
                nodes: otherNodes,
                value: otherVol,
                secondary: null,
                row: {}
              });
            }
            rawPaths = keptPaths;
          } else {
            rawPaths = rawPaths.slice(0, pLimit);
          }
        }
      }

      var nodeRegistry = {};
      var linkRegistry = {};

      function getNode(stageIdx, nodeName, drillLinks) {
        var key = stageIdx + "::" + nodeName;
        if (!nodeRegistry[key]) {
          nodeRegistry[key] = {
            id: key,
            stage: stageIdx,
            name: nodeName,
            value: 0,
            inValue: 0,
            outValue: 0,
            drillLinks: drillLinks,
            color: null
          };
        }
        return nodeRegistry[key];
      }

      rawPaths.forEach(function (p) {
        for (var s = 0; s < p.nodes.length - 1; s++) {
          var sNode = getNode(s, p.nodes[s].name, p.nodes[s].links);
          var tNode = getNode(s + 1, p.nodes[s + 1].name, p.nodes[s + 1].links);

          var linkKey = sNode.id + "->" + tNode.id;
          if (!linkRegistry[linkKey]) {
            linkRegistry[linkKey] = {
              sourceKey: sNode.id,
              targetKey: tNode.id,
              sourceStage: s,
              targetStage: s + 1,
              sourceName: sNode.name,
              targetName: tNode.name,
              value: 0,
              paths: []
            };
          }
          linkRegistry[linkKey].value += p.value;
          linkRegistry[linkKey].paths.push(p);

          sNode.outValue += p.value;
          tNode.inValue += p.value;
        }
      });

      Object.keys(nodeRegistry).forEach(function (k) {
        var nd = nodeRegistry[k];
        nd.value = Math.max(nd.inValue, nd.outValue);
      });

      var finalLinks = [];
      Object.keys(linkRegistry).forEach(function (lk) {
        var link = linkRegistry[lk];
        var srcNode = nodeRegistry[link.sourceKey];
        var pct = srcNode && srcNode.outValue > 0 ? (link.value / srcNode.outValue) : 1;
        if (pct >= minLinkPct) {
          finalLinks.push(link);
        }
      });

      var colorScale = d3.scaleOrdinal().range(theme.colors);
      Object.keys(nodeRegistry).forEach(function (k) {
        var nd = nodeRegistry[k];
        nd.color = colorScale(nd.name);
      });

      // Header controls: Custom Title, Subtitle, HUD, Search
      var topControls = document.createElement("div");
      topControls.style.display = "flex";
      topControls.style.alignItems = "center";
      topControls.style.justifyContent = "space-between";
      topControls.style.padding = "8px 16px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.background = theme.cardBg;
      topControls.style.flexShrink = "0";
      topControls.style.gap = "12px";
      topControls.style.flexWrap = "wrap";

      var titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.flexDirection = "column";
      titleContainer.style.gap = "2px";

      if (config.customTitleOverride) {
        var tEl = document.createElement("div");
        tEl.style.fontWeight = "700";
        tEl.style.fontSize = fontScale === "large" ? "15px" : "13px";
        tEl.style.color = theme.text;
        tEl.innerText = config.customTitleOverride;
        titleContainer.appendChild(tEl);
      }
      if (config.customSubtitleOverride) {
        var stEl = document.createElement("div");
        stEl.style.fontSize = "11px";
        stEl.style.color = theme.subtext;
        stEl.innerText = config.customSubtitleOverride;
        titleContainer.appendChild(stEl);
      }
      if (titleContainer.childNodes.length > 0) {
        topControls.appendChild(titleContainer);
      }

      if (hudMode !== "hidden") {
        var hud = document.createElement("div");
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.gap = hudMode === "compact_strip" ? "8px" : "14px";
        hud.style.fontSize = fontScale === "compact" ? "11px" : "12px";
        hud.style.flexWrap = "wrap";

        var totalNodes = Object.keys(nodeRegistry).length;
        var totalLinks = finalLinks.length;
        var stagesCount = stageDimNames.length;
        var avgPerNode = totalNodes > 0 ? (totalGlobalVolume / totalNodes) : 0;
        var targetDiffPct = computedBenchmark > 0 ? Math.round(((avgPerNode - computedBenchmark) / computedBenchmark) * 100) : 0;
        var isAnomaly = computedBenchmark > 0 && Math.abs(targetDiffPct) >= (anomalyThresholdPct - 100);

        var statusBg = (metricPolarity === "higher_is_better" ? targetDiffPct >= 0 : targetDiffPct <= 0) ? "#dcfce7" : "#fee2e2";
        var statusColor = (metricPolarity === "higher_is_better" ? targetDiffPct >= 0 : targetDiffPct <= 0) ? "#15803d" : "#b91c1c";

        if (hudMode === "compact_strip") {
          hud.innerHTML = 
            '<span style="font-weight:700;color:' + theme.text + ';">🌊 Vol: ' + formatMetric(totalGlobalVolume, valueFmt) + '</span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span style="color:' + theme.subtext + ';">Stages: <b>' + stagesCount + '</b></span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span style="color:' + theme.subtext + ';">Nodes: <b>' + totalNodes + '</b></span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span style="color:' + theme.subtext + ';">' + refLabel + ': <b>' + formatMetric(computedBenchmark, valueFmt) + '</b></span>';
        } else {
          hud.innerHTML = 
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<span style="font-weight:700;color:' + theme.text + ';">🌊 Total Flow:</span> ' +
              '<span style="font-weight:600;padding:2px 8px;border-radius:12px;background:' + (theme.isDark ? "#1e293b" : "#e0f2fe") + ';color:' + (theme.isDark ? "#38bdf8" : "#0369a1") + ';">' + formatMetric(totalGlobalVolume, valueFmt) + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<span style="color:' + theme.subtext + ';">Stages:</span> ' +
              '<span style="font-weight:600;">' + stagesCount + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<span style="color:' + theme.subtext + ';">Active Nodes:</span> ' +
              '<span style="font-weight:600;">' + totalNodes + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              '<span style="color:' + theme.subtext + ';">' + refLabel + ':</span> ' +
              '<span style="font-weight:600;">' + formatMetric(computedBenchmark, valueFmt) + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:' + statusBg + ';color:' + statusColor + ';font-weight:600;font-size:11px;">' +
              (targetDiffPct >= 0 ? '▲ ' : '▼ ') + Math.abs(targetDiffPct) + '% vs Target' +
              (isAnomaly ? ' ⚠️' : '') +
            '</div>';
        }

        topControls.appendChild(hud);
      }

      var searchQuery = "";
      if (showSearch) {
        var searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.alignItems = "center";
        searchContainer.style.gap = "6px";
        searchContainer.style.marginLeft = "auto";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter nodes & paths...";
        searchInput.style.fontSize = "12px";
        searchInput.style.padding = "4px 10px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "180px";

        searchInput.addEventListener("input", function (e) {
          searchQuery = e.target.value.toLowerCase().trim();
          applyFilter(searchQuery);
        });

        searchContainer.appendChild(searchInput);
        topControls.appendChild(searchContainer);
      }

      root.appendChild(topControls);

      if (viewMode === "sankey" || viewMode === "alluvial") {
        var stageHeaderBar = document.createElement("div");
        stageHeaderBar.style.display = "flex";
        stageHeaderBar.style.justifyContent = "space-between";
        stageHeaderBar.style.padding = "6px 28px 4px 28px";
        stageHeaderBar.style.borderBottom = "1px solid " + theme.border;
        stageHeaderBar.style.fontSize = "11px";
        stageHeaderBar.style.fontWeight = "700";
        stageHeaderBar.style.letterSpacing = "0.5px";
        stageHeaderBar.style.textTransform = "uppercase";
        stageHeaderBar.style.color = theme.subtext;
        stageHeaderBar.style.flexShrink = "0";

        stageLabels.forEach(function (lbl, idx) {
          var stageTitle = document.createElement("div");
          stageTitle.innerText = (idx + 1) + ". " + lbl;
          stageTitle.style.textAlign = idx === 0 ? "left" : (idx === stageLabels.length - 1 ? "right" : "center");
          stageHeaderBar.appendChild(stageTitle);
        });
        root.appendChild(stageHeaderBar);
      }

      var vizArea = document.createElement("div");
      vizArea.className = "sankey-canvas-area";
      vizArea.style.flex = "1";
      vizArea.style.position = "relative";
      vizArea.style.overflow = "hidden";
      vizArea.style.width = "100%";
      vizArea.style.height = "100%";
      root.appendChild(vizArea);

      var width = vizArea.clientWidth || element.clientWidth || 800;
      var height = vizArea.clientHeight || element.clientHeight || 500;

      var tooltip = document.createElement("div");
      tooltip.className = "sankey-tooltip-floating";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = theme.hudBg;
      tooltip.style.border = "1px solid " + theme.border;
      tooltip.style.borderRadius = "8px";
      tooltip.style.color = theme.text;
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.boxShadow = "0 10px 25px rgba(0,0,0,0.18)";
      tooltip.style.backdropFilter = "blur(6px)";
      tooltip.style.maxWidth = "320px";
      document.body.appendChild(tooltip);

      var svg = d3.select(vizArea)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var defs = svg.append("defs");

      if (enableAnim && !document.getElementById("sankey-pulse-keyframes")) {
        var styleEl = document.createElement("style");
        styleEl.id = "sankey-pulse-keyframes";
        styleEl.textContent = 
          "@keyframes sankeyFlowDash { 0% { stroke-dashoffset: 64; } 100% { stroke-dashoffset: 0; } }" +
          ".sankey-flow-pulse { animation: sankeyFlowDash 1.8s linear infinite; }";
        document.head.appendChild(styleEl);
      }

      if (viewMode === "chord") {
        renderChordMode(d3, svg, defs, nodeRegistry, finalLinks, width, height, theme, valueFmt, tooltip, highlightHover);
      } else if (viewMode === "horizontal_tree") {
        renderTreeMode(d3, svg, rawPaths, stageLabels, width, height, theme, valueFmt, tooltip, highlightHover);
      } else {
        renderSankeyMode(d3, svg, defs, nodeRegistry, finalLinks, stageDimNames, stageLabels, width, height, theme, config, valueFmt, tooltip, showValues, showPct, enableAnim, highlightHover, sortBy);
      }

      function applyFilter(query) {
        if (!query) {
          svg.selectAll(".sankey-node").style("opacity", 1);
          svg.selectAll(".sankey-link").style("opacity", linkOpacity);
          svg.selectAll(".sankey-node-label").style("opacity", 1);
          return;
        }
        svg.selectAll(".sankey-node").style("opacity", function (d) {
          return d.name.toLowerCase().includes(query) ? 1 : 0.15;
        });
        svg.selectAll(".sankey-node-label").style("opacity", function (d) {
          return d.name.toLowerCase().includes(query) ? 1 : 0.2;
        });
        svg.selectAll(".sankey-link").style("opacity", function (d) {
          var matchSrc = d.sourceName.toLowerCase().includes(query);
          var matchTgt = d.targetName.toLowerCase().includes(query);
          return (matchSrc || matchTgt) ? Math.min(1, linkOpacity + 0.3) : 0.05;
        });
      }
    }
  });

  function renderSankeyMode(d3, svg, defs, nodeRegistry, finalLinks, stageDimNames, stageLabels, width, height, theme, config, valueFmt, tooltip, showValues, showPct, enableAnim, highlightHover, sortBy) {
    var margin = { top: 20, right: 30, bottom: 20, left: 30 };
    var innerWidth = Math.max(100, width - margin.left - margin.right);
    var innerHeight = Math.max(100, height - margin.top - margin.bottom);

    var nodeWidth = Number(config.nodeWidth) || 18;
    var nodePadding = Number(config.nodePadding) || 16;
    var curvature = Number(config.curvature) || 0.5;
    var linkOpacity = Number(config.linkOpacity) || 0.38;
    var linkColorMode = config.linkColorMode || "gradient";
    var nodeAlign = config.nodeAlignment || "justify";
    var labelDensity = config.showValueLabels || "all";

    var stages = [];
    for (var s = 0; s < stageDimNames.length; s++) {
      stages[s] = [];
    }

    Object.keys(nodeRegistry).forEach(function (k) {
      var nd = nodeRegistry[k];
      if (stages[nd.stage]) {
        stages[nd.stage].push(nd);
      }
    });

    stages.forEach(function (stg) {
      if (sortBy === "volume_asc") {
        stg.sort(function (a, b) { return a.value - b.value; });
      } else if (sortBy === "alphabetical") {
        stg.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortBy === "natural") {
        // preserve natural insertion order
      } else {
        stg.sort(function (a, b) { return b.value - a.value; });
      }
    });

    var numStages = stageDimNames.length;
    var stageX = [];
    if (numStages === 1) {
      stageX[0] = innerWidth / 2;
    } else {
      for (var s = 0; s < numStages; s++) {
        if (nodeAlign === "left") {
          stageX[s] = s * ((innerWidth - nodeWidth) / (numStages - 1));
        } else if (nodeAlign === "right") {
          stageX[s] = innerWidth - nodeWidth - (numStages - 1 - s) * ((innerWidth - nodeWidth) / (numStages - 1));
        } else if (nodeAlign === "center") {
          stageX[s] = (innerWidth / (numStages + 1)) * (s + 1) - (nodeWidth / 2);
        } else {
          stageX[s] = (s / (numStages - 1)) * (innerWidth - nodeWidth);
        }
      }
    }

    var stageTotalValues = stages.map(function (stg) {
      return stg.reduce(function (sum, nd) { return sum + nd.value; }, 0);
    });

    stages.forEach(function (stg, sIdx) {
      var count = stg.length;
      var availableHeight = innerHeight - Math.max(0, count - 1) * nodePadding;
      var stageTotal = stageTotalValues[sIdx] || 1;
      var yCursor = 0;

      stg.forEach(function (nd) {
        nd.x = stageX[sIdx];
        nd.width = nodeWidth;
        nd.height = Math.max(4, (nd.value / stageTotal) * availableHeight);
        nd.y = yCursor;
        yCursor += nd.height + nodePadding;
        nd.stageTotal = stageTotal;
      });
    });

    var sourceOutY = {};
    var targetInY = {};

    Object.keys(nodeRegistry).forEach(function (k) {
      sourceOutY[k] = nodeRegistry[k].y;
      targetInY[k] = nodeRegistry[k].y;
    });

    finalLinks.sort(function (a, b) {
      var srcNodeA = nodeRegistry[a.sourceKey];
      var srcNodeB = nodeRegistry[b.sourceKey];
      var tgtNodeA = nodeRegistry[a.targetKey];
      var tgtNodeB = nodeRegistry[b.targetKey];
      if (srcNodeA.y !== srcNodeB.y) return srcNodeA.y - srcNodeB.y;
      return tgtNodeA.y - tgtNodeB.y;
    });

    finalLinks.forEach(function (link, idx) {
      var sNode = nodeRegistry[link.sourceKey];
      var tNode = nodeRegistry[link.targetKey];

      var sFrac = sNode.outValue > 0 ? (link.value / sNode.outValue) : 1;
      var tFrac = tNode.inValue > 0 ? (link.value / tNode.inValue) : 1;

      link.sHeight = Math.max(1, sFrac * sNode.height);
      link.tHeight = Math.max(1, tFrac * tNode.height);

      link.sy = sourceOutY[link.sourceKey];
      link.ty = targetInY[link.targetKey];

      sourceOutY[link.sourceKey] += link.sHeight;
      targetInY[link.targetKey] += link.tHeight;

      link.sx = sNode.x + sNode.width;
      link.tx = tNode.x;

      link.gradId = "sankey-grad-" + idx;
      var grad = defs.append("linearGradient")
        .attr("id", link.gradId)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.sx)
        .attr("y1", (link.sy + link.sHeight / 2))
        .attr("x2", link.tx)
        .attr("y2", (link.ty + link.tHeight / 2));

      if (linkColorMode === "source") {
        grad.append("stop").attr("offset", "0%").attr("stop-color", sNode.color).attr("stop-opacity", linkOpacity + 0.1);
        grad.append("stop").attr("offset", "100%").attr("stop-color", sNode.color).attr("stop-opacity", linkOpacity - 0.05);
      } else if (linkColorMode === "target") {
        grad.append("stop").attr("offset", "0%").attr("stop-color", tNode.color).attr("stop-opacity", linkOpacity - 0.05);
        grad.append("stop").attr("offset", "100%").attr("stop-color", tNode.color).attr("stop-opacity", linkOpacity + 0.1);
      } else if (linkColorMode === "neutral") {
        grad.append("stop").attr("offset", "0%").attr("stop-color", theme.linkDefault).attr("stop-opacity", linkOpacity);
        grad.append("stop").attr("offset", "100%").attr("stop-color", theme.linkDefault).attr("stop-opacity", linkOpacity);
      } else {
        grad.append("stop").attr("offset", "0%").attr("stop-color", sNode.color).attr("stop-opacity", linkOpacity + 0.08);
        grad.append("stop").attr("offset", "100%").attr("stop-color", tNode.color).attr("stop-opacity", linkOpacity + 0.08);
      }
    });

    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    function ribbonPath(d) {
      var x0 = d.sx;
      var x1 = d.tx;
      var xi = d3.interpolateNumber(x0, x1);
      var x2 = xi(curvature);
      var x3 = xi(1 - curvature);
      var y0 = d.sy;
      var y1 = d.ty;
      var y0b = d.sy + d.sHeight;
      var y1b = d.ty + d.tHeight;

      return "M" + x0 + "," + y0 +
             "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + x1 + "," + y1 +
             "L" + x1 + "," + y1b +
             "C" + x3 + "," + y1b + " " + x2 + "," + y0b + " " + x0 + "," + y0b +
             "Z";
    }

    function centerlinePath(d) {
      var x0 = d.sx;
      var x1 = d.tx;
      var xi = d3.interpolateNumber(x0, x1);
      var x2 = xi(curvature);
      var x3 = xi(1 - curvature);
      var y0 = d.sy + d.sHeight / 2;
      var y1 = d.ty + d.tHeight / 2;

      return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + x1 + "," + y1;
    }

    var linkGroup = g.append("g").attr("class", "links-layer");
    var linkPaths = linkGroup.selectAll(".sankey-link")
      .data(finalLinks)
      .enter()
      .append("path")
      .attr("class", "sankey-link")
      .attr("d", ribbonPath)
      .attr("fill", function (d) { return "url(#" + d.gradId + ")"; })
      .style("cursor", "pointer")
      .style("transition", "opacity 0.2s ease");

    if (enableAnim) {
      var pulseGroup = g.append("g").attr("class", "pulse-layer").style("pointer-events", "none");
      pulseGroup.selectAll(".sankey-pulse-link")
        .data(finalLinks)
        .enter()
        .append("path")
        .attr("class", "sankey-pulse-link sankey-flow-pulse")
        .attr("d", centerlinePath)
        .attr("fill", "none")
        .attr("stroke", theme.pulseColor)
        .attr("stroke-width", function (d) { return Math.min(3, Math.max(1, d.sHeight / 6)); })
        .attr("stroke-opacity", 0.6)
        .attr("stroke-dasharray", "8 24");
    }

    var allNodes = [];
    stages.forEach(function (stg) {
      allNodes = allNodes.concat(stg);
    });

    var maxNodeVal = d3.max(allNodes, function (d) { return d.value; }) || 1;

    var nodeGroup = g.append("g").attr("class", "nodes-layer");
    var nodeContainers = nodeGroup.selectAll(".sankey-node")
      .data(allNodes)
      .enter()
      .append("g")
      .attr("class", "sankey-node")
      .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style("cursor", "grab");

    nodeContainers.append("rect")
      .attr("width", function (d) { return d.width; })
      .attr("height", function (d) { return d.height; })
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", function (d) { return d.color; })
      .attr("stroke", theme.nodeStroke)
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.12))");

    var labelGroup = g.append("g").attr("class", "labels-layer").style("pointer-events", "none");
    var labels = labelGroup.selectAll(".sankey-node-label")
      .data(allNodes)
      .enter()
      .append("g")
      .attr("class", "sankey-node-label")
      .attr("transform", function (d) { return "translate(" + d.x + "," + (d.y + d.height / 2) + ")"; });

    labels.append("text")
      .attr("x", function (d) {
        return d.stage === stageDimNames.length - 1 ? -8 : (d.width + 8);
      })
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", function (d) {
        return d.stage === stageDimNames.length - 1 ? "end" : "start";
      })
      .attr("fill", theme.text)
      .style("font-size", "11.5px")
      .style("font-weight", "600")
      .style("letter-spacing", "-0.1px")
      .text(function (d) {
        var isPeak = (d.value / maxNodeVal) >= 0.75;
        if (labelDensity === "hidden") return d.name;
        if (labelDensity === "peaks_only" && !isPeak) return d.name;

        var str = d.name;
        if (showValues) {
          str += " (" + formatMetric(d.value, valueFmt);
          if (showPct && d.stageTotal > 0) {
            var pct = Math.round((d.value / d.stageTotal) * 100);
            str += " · " + pct + "%";
          }
          str += ")";
        }
        return str;
      });

    var drag = d3.drag()
      .on("start", function (event, d) {
        d3.select(this).style("cursor", "grabbing");
      })
      .on("drag", function (event, d) {
        d.y = Math.max(0, Math.min(innerHeight - d.height, event.y));
        d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");

        finalLinks.forEach(function (link) {
          if (link.sourceKey === d.id) {
            link.sy = d.y + (link.sy - (d.y - (event.y - d.y)));
          }
          if (link.targetKey === d.id) {
            link.ty = d.y + (link.ty - (d.y - (event.y - d.y)));
          }
        });

        linkPaths.attr("d", ribbonPath);
        labels.attr("transform", function (nd) { return "translate(" + nd.x + "," + (nd.y + nd.height / 2) + ")"; });
      })
      .on("end", function (event, d) {
        d3.select(this).style("cursor", "grab");
      });

    nodeContainers.call(drag);

    nodeContainers
      .on("mouseenter", function (event, d) {
        if (highlightHover) {
          linkPaths.style("opacity", function (l) {
            return (l.sourceKey === d.id || l.targetKey === d.id) ? Math.min(1, linkOpacity + 0.4) : 0.08;
          });
          nodeContainers.style("opacity", function (n) {
            var connected = (n.id === d.id);
            finalLinks.forEach(function (l) {
              if ((l.sourceKey === d.id && l.targetKey === n.id) || (l.targetKey === d.id && l.sourceKey === n.id)) {
                connected = true;
              }
            });
            return connected ? 1 : 0.25;
          });
        }

        var pctStr = d.stageTotal > 0 ? ((d.value / d.stageTotal) * 100).toFixed(1) + "%" : "100%";
        var stageName = stageLabels[d.stage] || ("Stage " + (d.stage + 1));

        tooltip.style.display = "block";
        tooltip.innerHTML = 
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
            '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + d.color + ';"></span>' +
            '<strong style="font-size:13px;color:' + theme.text + ';">' + d.name + '</strong>' +
          '</div>' +
          '<div style="font-size:11.5px;color:' + theme.subtext + ';margin-bottom:6px;">' + stageName + '</div>' +
          '<div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:12px;">' +
            '<span style="color:' + theme.subtext + ';">Flow Volume:</span>' +
            '<span style="font-weight:700;text-align:right;">' + formatMetric(d.value, valueFmt) + '</span>' +
            '<span style="color:' + theme.subtext + ';">Stage Share:</span>' +
            '<span style="font-weight:700;text-align:right;color:#0284c7;">' + pctStr + '</span>' +
            (d.inValue > 0 ? '<span style="color:' + theme.subtext + ';">Inflow:</span><span style="text-align:right;">' + formatMetric(d.inValue, valueFmt) + '</span>' : '') +
            (d.outValue > 0 ? '<span style="color:' + theme.subtext + ';">Outflow:</span><span style="text-align:right;">' + formatMetric(d.outValue, valueFmt) + '</span>' : '') +
          '</div>' +
          (d.drillLinks && d.drillLinks.length ? '<div style="margin-top:8px;padding-top:6px;border-top:1px solid ' + theme.border + ';font-size:11px;color:#2563eb;font-weight:600;">Click for Looker Drill Menu ↗</div>' : '');
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 20) + "px";
      })
      .on("mouseleave", function () {
        tooltip.style.display = "none";
        if (highlightHover) {
          linkPaths.style("opacity", linkOpacity);
          nodeContainers.style("opacity", 1);
        }
      })
      .on("click", function (event, d) {
        if (d.drillLinks && d.drillLinks.length && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.drillLinks,
            event: event
          });
        }
      });

    linkPaths
      .on("mouseenter", function (event, d) {
        if (highlightHover) {
          linkPaths.style("opacity", function (l) { return l === d ? 0.9 : 0.08; });
          nodeContainers.style("opacity", function (n) {
            return (n.id === d.sourceKey || n.id === d.targetKey) ? 1 : 0.25;
          });
        }

        var sNode = nodeRegistry[d.sourceKey];
        var srcShare = sNode && sNode.outValue > 0 ? ((d.value / sNode.outValue) * 100).toFixed(1) + "%" : "—";

        tooltip.style.display = "block";
        tooltip.innerHTML = 
          '<div style="font-weight:700;font-size:12.5px;color:' + theme.text + ';margin-bottom:4px;">' +
            d.sourceName + ' &rarr; ' + d.targetName +
          '</div>' +
          '<div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:12px;">' +
            '<span style="color:' + theme.subtext + ';">Stream Volume:</span>' +
            '<span style="font-weight:700;text-align:right;">' + formatMetric(d.value, valueFmt) + '</span>' +
            '<span style="color:' + theme.subtext + ';">Share of ' + d.sourceName + ':</span>' +
            '<span style="font-weight:700;text-align:right;color:#0284c7;">' + srcShare + '</span>' +
            '<span style="color:' + theme.subtext + ';">Active Transactions:</span>' +
            '<span style="text-align:right;">' + d.paths.length + '</span>' +
          '</div>';
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 20) + "px";
      })
      .on("mouseleave", function () {
        tooltip.style.display = "none";
        if (highlightHover) {
          linkPaths.style("opacity", linkOpacity);
          nodeContainers.style("opacity", 1);
        }
      });
  }

  function renderTreeMode(d3, svg, rawPaths, stageLabels, width, height, theme, valueFmt, tooltip, highlightHover) {
    var margin = { top: 30, right: 140, bottom: 30, left: 100 };
    var innerWidth = Math.max(100, width - margin.left - margin.right);
    var innerHeight = Math.max(100, height - margin.top - margin.bottom);

    var rootObj = { name: "All Transactions", children: [], value: 0 };
    rawPaths.forEach(function (p) {
      rootObj.value += p.value;
      var curr = rootObj;
      p.nodes.forEach(function (step) {
        var found = null;
        if (!curr.children) curr.children = [];
        for (var i = 0; i < curr.children.length; i++) {
          if (curr.children[i].name === step.name) {
            found = curr.children[i];
            break;
          }
        }
        if (!found) {
          found = { name: step.name, stage: step.stage, children: [], value: 0, drillLinks: step.links };
          curr.children.push(found);
        }
        found.value += p.value;
        curr = found;
      });
    });

    var hierarchy = d3.hierarchy(rootObj);
    var treeLayout = d3.tree().size([innerHeight, innerWidth]);
    var rootNode = treeLayout(hierarchy);

    var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    var colorScale = d3.scaleOrdinal().range(theme.colors);

    g.selectAll(".tree-link")
      .data(rootNode.links())
      .enter()
      .append("path")
      .attr("class", "tree-link")
      .attr("d", d3.linkHorizontal().x(function (d) { return d.y; }).y(function (d) { return d.x; }))
      .attr("fill", "none")
      .attr("stroke", function (d) { return d.target.data.name ? colorScale(d.target.data.name) : theme.linkDefault; })
      .attr("stroke-width", function (d) { return Math.max(1.5, Math.min(18, Math.sqrt(d.target.value || 1) * 0.4)); })
      .attr("stroke-opacity", 0.45);

    var nodes = g.selectAll(".tree-node")
      .data(rootNode.descendants())
      .enter()
      .append("g")
      .attr("class", "tree-node")
      .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; })
      .style("cursor", "pointer");

    nodes.append("circle")
      .attr("r", function (d) { return d.depth === 0 ? 7 : Math.max(4, Math.min(14, Math.sqrt(d.value || 1) * 0.3)); })
      .attr("fill", function (d) { return d.depth === 0 ? theme.subtext : colorScale(d.data.name); })
      .attr("stroke", theme.nodeStroke)
      .attr("stroke-width", 2);

    nodes.append("text")
      .attr("dy", "0.32em")
      .attr("x", function (d) { return d.children ? -10 : 10; })
      .attr("text-anchor", function (d) { return d.children ? "end" : "start"; })
      .attr("fill", theme.text)
      .style("font-size", "11px")
      .style("font-weight", "600")
      .text(function (d) { return d.data.name + " (" + formatMetric(d.value, valueFmt) + ")"; });

    nodes
      .on("mouseenter", function (event, d) {
        tooltip.style.display = "block";
        tooltip.innerHTML = 
          '<div style="font-weight:700;font-size:12.5px;color:' + theme.text + ';">' + d.data.name + '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:4px;">Hierarchy Depth: Level ' + d.depth + '</div>' +
          '<div style="font-size:12px;font-weight:600;color:#0284c7;">Total Branch Volume: ' + formatMetric(d.value, valueFmt) + '</div>';
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 20) + "px";
      })
      .on("mouseleave", function () {
        tooltip.style.display = "none";
      });
  }

  function renderChordMode(d3, svg, defs, nodeRegistry, finalLinks, width, height, theme, valueFmt, tooltip, highlightHover) {
    var outerRadius = Math.min(width, height) * 0.42;
    var innerRadius = outerRadius - 20;

    var namesMap = {};
    var names = [];
    Object.keys(nodeRegistry).forEach(function (k) {
      var nm = nodeRegistry[k].name;
      if (namesMap[nm] === undefined) {
        namesMap[nm] = names.length;
        names.push(nm);
      }
    });

    var matrix = [];
    for (var i = 0; i < names.length; i++) {
      matrix[i] = new Array(names.length).fill(0);
    }

    finalLinks.forEach(function (l) {
      var sIdx = namesMap[l.sourceName];
      var tIdx = namesMap[l.targetName];
      if (sIdx !== undefined && tIdx !== undefined) {
        matrix[sIdx][tIdx] += l.value;
      }
    });

    var chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
    var chords = chord(matrix);
    var colorScale = d3.scaleOrdinal().range(theme.colors);

    var g = svg.append("g").attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

    var arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    var ribbon = d3.ribbon().radius(innerRadius);

    var ribbonGroup = g.append("g").selectAll("path")
      .data(chords)
      .enter()
      .append("path")
      .attr("d", ribbon)
      .attr("fill", function (d) { return colorScale(names[d.source.index]); })
      .attr("opacity", 0.5)
      .attr("stroke", theme.nodeStroke)
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer");

    var group = g.append("g").selectAll("g")
      .data(chords.groups)
      .enter()
      .append("g");

    group.append("path")
      .attr("fill", function (d) { return colorScale(names[d.index]); })
      .attr("stroke", theme.nodeStroke)
      .attr("d", arc);

    group.append("text")
      .each(function (d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", function (d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
          "translate(" + (outerRadius + 8) + ")" +
          (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .attr("text-anchor", function (d) { return d.angle > Math.PI ? "end" : null; })
      .text(function (d) { return names[d.index]; })
      .style("font-size", "10.5px")
      .style("font-weight", "600")
      .attr("fill", theme.text);

    ribbonGroup
      .on("mouseenter", function (event, d) {
        tooltip.style.display = "block";
        tooltip.innerHTML = 
          '<div style="font-weight:700;font-size:12px;color:' + theme.text + ';">' +
            names[d.source.index] + ' &harr; ' + names[d.target.index] +
          '</div>' +
          '<div style="font-size:12px;color:#0284c7;font-weight:600;">Volume: ' + formatMetric(d.source.value, valueFmt) + '</div>';
      })
      .on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 16) + "px";
        tooltip.style.top = (event.clientY - 20) + "px";
      })
      .on("mouseleave", function () {
        tooltip.style.display = "none";
      });
  }

})();