/**
 * Distributed Trace & Span Waterfall Flamegraph - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google Cloud Blockers:
 * - b/394819201: Native OpenTelemetry / Cloud Trace span waterfall & distributed tracing in Looker
 * - b/482019482: Hierarchical microservice latency call graph & flamegraph profiling
 * - b/510293847: Critical path bottleneck latency isolation across distributed cloud services
 *
 * Features:
 * - 4 Multi-Modal Layout Modes:
 *   1. topdown_icicle: Hierarchical Top-Down Icicle Tree (Roots at top, child operations below)
 *   2. bottomup_flame: Classic Brendan Gregg Flame Graph (Roots at bottom, call stack growing upwards)
 *   3. waterfall_timeline: Distributed Trace Waterfall Timeline (Sequential spans with start-offset & duration bars)
 *   4. critical_path_chain: Bottleneck Span Isolation (Highlights only the critical execution chain)
 * - Interactive Sub-Tree Zoom: Click any span to zoom into its call sub-tree with breadcrumb navigation
 * - Self-Time vs Cumulative-Time Calculation
 * - Executive HUD Scorecard (Total Latency, Spans Count, Bottleneck Span, Error/Critical Rate, Max Depth)
 * - Looker Drilldown Integration (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver (<4px delta check)
 * - Strict 2-tab configuration schema: "Display" and "Style"
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.hierarchy === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
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

  var THEMES = {
    google_cloud_trace: {
      name: "Google Cloud Trace",
      colors: ["#1a73e8", "#4285f4", "#669df6", "#8ab4f8", "#aecbfa", "#cbf0f8", "#12b5cb", "#007b83"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      hudBg: "#f8f9fa",
      hoverBg: "#f1f3f4",
      grid: "#f1f3f4",
      critical: "#d93025",
      high: "#f2994a",
      medium: "#f9ab00",
      low: "#1e8e3e"
    },
    jaeger_telemetry: {
      name: "Jaeger OpenTelemetry",
      colors: ["#005f73", "#0a9396", "#94d2bd", "#ee9b00", "#ca6702", "#bb3e03", "#ae2012", "#9b2226"],
      bg: "#ffffff",
      text: "#1e293b",
      subtext: "#64748b",
      border: "#cbd5e1",
      hudBg: "#f1f5f9",
      hoverBg: "#e2e8f0",
      grid: "#e2e8f0",
      critical: "#e11d48",
      high: "#f97316",
      medium: "#eab308",
      low: "#10b981"
    },
    cyberpunk_noc: {
      name: "Cyberpunk NOC Dark",
      colors: ["#7928ca", "#ff0080", "#00dfd8", "#79ffe1", "#ff4d4d", "#f5a623", "#50e3c2", "#b967ff"],
      bg: "#0d1117",
      text: "#f0f6fc",
      subtext: "#8b949e",
      border: "#30363d",
      hudBg: "#161b22",
      hoverBg: "#21262d",
      grid: "#21262d",
      critical: "#ff0055",
      high: "#ff7700",
      medium: "#ffcc00",
      low: "#00ff99"
    },
    hot_flame: {
      name: "Hot Flame (Classic Profiler)",
      colors: ["#b91c1c", "#c2410c", "#d97706", "#b45309", "#ea580c", "#f97316", "#fb923c", "#fde047"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      hudBg: "#fff7ed",
      hoverBg: "#ffedd5",
      grid: "#ffedd5",
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#f59e0b",
      low: "#16a34a"
    },
    monochrome_slate: {
      name: "Monochrome Executive Slate",
      colors: ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#0f172a", "#52525b"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "#f8fafc",
      hoverBg: "#f1f5f9",
      grid: "#f1f5f9",
      critical: "#ef4444",
      high: "#f97316",
      medium: "#f59e0b",
      low: "#10b981"
    },
    wellverse: {
      name: "Wellverse Healthcare",
      colors: ["#007a87", "#00a896", "#028090", "#05668d", "#f08080", "#f4a261", "#e76f51", "#2a9d8f"],
      bg: "#ffffff",
      text: "#134e4a",
      subtext: "#0d9488",
      border: "#ccfbf1",
      hudBg: "#f0fdfa",
      hoverBg: "#ccfbf1",
      grid: "#f0fdfa",
      critical: "#e11d48",
      high: "#f97316",
      medium: "#eab308",
      low: "#0d9488"
    }
  };

  function formatDuration(val, fmt) {
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
        return num.toFixed(1) + "%";
      case "decimal_2dp":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(num);
      default:
        if (num >= 60) return (num / 60).toFixed(1) + "h";
        if (num >= 1) return num.toFixed(1) + "m";
        if (num >= 0.001) return (num * 1000).toFixed(0) + "s";
        return num.toFixed(2);
    }
  }

  looker.plugins.visualizations.add({
    id: "distributed_trace_flamegraph",
    label: "Distributed Trace & Span Waterfall Flamegraph",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Trace Visualization Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Top-Down Hierarchical Icicle (OpenTelemetry & Cloud Trace)": "topdown_icicle" },
          { "Bottom-Up Brendan Gregg Flame Graph (Call Stack Profiling)": "bottomup_flame" },
          { "Distributed Trace Waterfall Timeline (Sequential Spans)": "waterfall_timeline" },
          { "Critical Path Latency Bottleneck Chain": "critical_path_chain" }
        ],
        default: "topdown_icicle"
      },
      parentServiceDimOverride: {
        type: "string",
        label: "Root Service / Tactic Dimension (Parent)",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      childOperationDimOverride: {
        type: "string",
        label: "Operation / Technique Dimension (Child Span)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      statusSeverityDimOverride: {
        type: "string",
        label: "Status / Severity Dimension (Optional Health)",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      durationMeasureOverride: {
        type: "string",
        label: "Duration / MTTR Measure (Span Execution Width)",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      volumeMeasureOverride: {
        type: "string",
        label: "Call Volume / Alert Count Measure (Secondary)",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      targetCalculationMode: {
        type: "string",
        label: "SLA Benchmark Latency Target Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Dataset Median Latency (P50)": "dataset_median" },
          { "Dataset Mean Latency (Average)": "dataset_mean" },
          { "Top Quartile Latency (P75)": "percentile_p75" },
          { "P90 Latency Benchmark": "percentile_p90" },
          { "Fixed Target Value": "fixed_value" },
          { "None (Hide Benchmark Target)": "none" }
        ],
        default: "dataset_median"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed SLA Target Value (minutes/ms)",
        section: "Display",
        order: 8,
        default: 45
      },
      referenceLineLabel: {
        type: "string",
        label: "SLA Target Reference Label",
        section: "Display",
        order: 9,
        default: "SLA Latency Cap"
      },
      latencyThresholdAlert: {
        type: "number",
        label: "Critical Bottleneck Alert Threshold",
        section: "Display",
        order: 10,
        default: 45
      },
      sortOrder: {
        type: "string",
        label: "Span Ordering & Sorting",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Span Duration Descending (Slowest First)": "duration_desc" },
          { "Span Duration Ascending (Fastest First)": "duration_asc" },
          { "Call Volume / Alerts Descending": "volume_desc" },
          { "Alphabetical by Service Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "duration_desc"
      },
      topN: {
        type: "string",
        label: "Top-N Span Limit",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "All Spans (No Limit)": "all" },
          { "Top 10 Spans Only": "10" },
          { "Top 15 Spans Only": "15" },
          { "Top 20 Spans Only": "20" },
          { "Top 30 Spans Only": "30" },
          { "Top 50 Spans Only": "50" }
        ],
        default: "all"
      },
      rollupOther: {
        type: "boolean",
        label: "Rollup Excluded Spans into 'Other'",
        section: "Display",
        order: 13,
        default: false
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Spans with Zero/Null Duration",
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
          { "Full Scorecard Strip": "full" },
          { "Compact Metric Pill": "compact" },
          { "Hidden (Maximum Canvas)": "hidden" }
        ],
        default: "full"
      },
      showSearch: {
        type: "boolean",
        label: "Enable Service & Span Search Filter",
        section: "Display",
        order: 16,
        default: true
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Visual Palette Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Cloud Trace (Enterprise Blue & Indigo)": "google_cloud_trace" },
          { "Jaeger OpenTelemetry (Deep Navy & Aqua)": "jaeger_telemetry" },
          { "Cyberpunk NOC Dark (Violet & Neon Pink)": "cyberpunk_noc" },
          { "Hot Flame (Classic Profiler Amber & Red)": "hot_flame" },
          { "Monochrome Executive Slate": "monochrome_slate" },
          { "Wellverse Healthcare (Teal & Coral)": "wellverse" },
          { "Custom Primary Accent Hex": "custom" }
        ],
        default: "google_cloud_trace"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      colorBySeverity: {
        type: "boolean",
        label: "Color Spans by Health / Severity Status",
        section: "Style",
        order: 3,
        default: true
      },
      barHeight: {
        type: "string",
        label: "Span Bar Height",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Compact (22px)": "compact" },
          { "Standard (28px)": "standard" },
          { "Roomy (36px)": "roomy" }
        ],
        default: "standard"
      },
      showSpanLabels: {
        type: "boolean",
        label: "Show Span Text & Duration on Bars",
        section: "Style",
        order: 5,
        default: true
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Lower is Better (Latency, MTTR, Bottleneck Time, Errors)": "lower_is_better" },
          { "Higher is Better (Throughput, Call Capacity, Completed Tasks)": "higher_is_better" }
        ],
        default: "lower_is_better"
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
        label: "Duration & Numeric Value Format",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Auto Detect by Metric Name": "auto" },
          { "Compact Number (1.2k, 4.5M)": "compact_num" },
          { "Compact Currency ($1.2k, $4.5M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (0.00)": "decimal_2dp" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        parentServiceDimOverride: { role: "dimension", defaultIdx: 0 },
        childOperationDimOverride: { role: "dimension", defaultIdx: 1 },
        statusSeverityDimOverride: { role: "dimension", defaultIdx: 2 },
        durationMeasureOverride: { role: "measure", defaultIdx: 0 },
        volumeMeasureOverride: { role: "measure", defaultIdx: 1 }
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
      container.className = "flamegraph-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      element.appendChild(container);
      this._container = container;

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "flamegraph-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "10000";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.45";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._activeZoomNode = null;

      var self = this;
      if (window.ResizeObserver) {
        var roTimeout;
        var lastH = 0;
        var lastW = 0;
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastQueryResponse) return;
          var entry = entries[0];
          if (!entry) return;
          var cr = entry.contentRect;
          if (Math.abs(cr.height - lastH) < 4 && Math.abs(cr.width - lastW) < 4) return;
          lastH = cr.height;
          lastW = cr.width;
          clearTimeout(roTimeout);
          roTimeout = setTimeout(function () {
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, self._lastDone || function(){});
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) try { this.clearErrors(); } catch(e) {}
      this._registerDynamicFieldOptions(queryResponse);
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastDone = done;

      var container = element.querySelector(".flamegraph-root-container");
      if (!container) {
        element.innerHTML = "";
        container = document.createElement("div");
        container.className = "flamegraph-root-container";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        element.appendChild(container);
        this._container = container;
      }

      var fields = queryResponse && queryResponse.fields;
      if (!fields || !data || data.length === 0) {
        container.innerHTML = "<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;\'>Awaiting trace telemetry results...</div>";
        if (done) done();
        return;
      }

      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];
      if (dimensions.length === 0 && measures.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Missing Fields",
            message: "Trace Flamegraph requires at least 1 Parent Service Dimension and 1 Duration Measure."
          });
        }
        if (done) done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, container, data, config, queryResponse);
        } catch (err) {
          console.error("Flamegraph Render Error:", err);
          container.innerHTML = "<div style=\'padding:20px;color:#ef4444;\'>Render Error: " + err.message + "</div>";
        }
        if (done) done();
      });
    },

    renderChart: function (d3, container, data, config, queryResponse) {
      var self = this;
      var fields = queryResponse.fields;
      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      // Field resolution
      var parentField = (config.parentServiceDimOverride && config.parentServiceDimOverride !== "") ? config.parentServiceDimOverride : (dimensions[0] ? dimensions[0].name : "Service");
      var parentLabel = "Service";
      var childField = (config.childOperationDimOverride && config.childOperationDimOverride !== "") ? config.childOperationDimOverride : (dimensions[1] ? dimensions[1].name : null);
      var childLabel = "Operation";
      var statusField = (config.statusSeverityDimOverride && config.statusSeverityDimOverride !== "") ? config.statusSeverityDimOverride : (dimensions[2] ? dimensions[2].name : null);
      var statusLabel = "Severity";

      var allFields = dimensions.concat(measures);
      for (var f = 0; f < allFields.length; f++) {
        var fld = allFields[f];
        if (fld.name === parentField) parentLabel = fld.label_short || fld.label || parentField;
        if (fld.name === childField) childLabel = fld.label_short || fld.label || childField;
        if (fld.name === statusField) statusLabel = fld.label_short || fld.label || statusField;
      }

      // Duration Measure Resolution
      var durationField = (config.durationMeasureOverride && config.durationMeasureOverride !== "") ? config.durationMeasureOverride : (measures[0] ? measures[0].name : null);
      var durationLabel = "Duration";
      var volumeField = (config.volumeMeasureOverride && config.volumeMeasureOverride !== "") ? config.volumeMeasureOverride : (measures[1] ? measures[1].name : null);

      if (!durationField) {
        // Fallback scan
        for (var m = 0; m < measures.length; m++) {
          if (/time|duration|latency|mttr|cost|delay/i.test(measures[m].name)) {
            durationField = measures[m].name;
            durationLabel = measures[m].label_short || measures[m].label || durationField;
            break;
          }
        }
        if (!durationField && measures.length > 0) {
          durationField = measures[0].name;
          durationLabel = measures[0].label_short || measures[0].label || durationField;
        }
      }

      if (!durationField) {
        container.innerHTML = "<div style=\'padding:20px;color:#64748b;\'>Please select or include a Duration or Latency measure.</div>";
        return;
      }

      // Config Options
      var layoutMode = config.layoutMode || "topdown_icicle";
      var themeKey = config.colorTheme || "google_cloud_trace";
      var theme = Object.assign({}, THEMES[themeKey] || THEMES.google_cloud_trace);
      if (config.customPrimaryColor) theme.colors[0] = config.customPrimaryColor;

      var colorBySeverity = config.colorBySeverity !== false;
      var fontScale = config.fontScale || "standard";
      var hudMode = config.hudMode || "full";
      var showSearch = config.showSearch !== false;
      var showSpanLabels = config.showSpanLabels !== false;
      var polarity = config.metricPolarity || "lower_is_better";
      var targetMode = config.targetCalculationMode || "dataset_median";
      var refLineLabel = config.referenceLineLabel || "SLA Latency Cap";
      var alertThreshold = config.latencyThresholdAlert !== undefined ? Number(config.latencyThresholdAlert) : 45;
      var sortOrder = config.sortOrder || "duration_desc";
      var topN = config.topN || "all";
      var suppressNulls = config.suppressNulls !== false;
      var barHeightSetting = config.barHeight || "standard";
      var rowH = barHeightSetting === "compact" ? 22 : (barHeightSetting === "roomy" ? 36 : 28);

      var effectiveFormat = config.valueFormat || "auto";
      if (effectiveFormat === "auto") {
        var lowerName = (durationField + " " + durationLabel).toLowerCase();
        if (/ms|millis|millisecond/i.test(lowerName)) effectiveFormat = "raw";
        else if (/minute|mttr|delay|duration|sec/i.test(lowerName)) effectiveFormat = "auto";
        else if (/cost|price|spend|\$/i.test(lowerName)) effectiveFormat = "compact_currency";
        else effectiveFormat = "compact_num";
      }

      // Aggregate and parse raw trace spans
      var serviceMap = {};
      var allDurations = [];
      var totalAlerts = 0;
      var criticalSpanCount = 0;
      var totalSpanRecords = 0;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var parentVal = row[parentField] ? (row[parentField].rendered || row[parentField].value) : "Root Service";
        if (parentVal === null || parentVal === undefined || parentVal === "") {
          if (suppressNulls) continue;
          parentVal = "Unknown Service";
        }
        parentVal = String(parentVal);

        var childVal = childField && row[childField] ? (row[childField].rendered || row[childField].value) : null;
        if (childVal !== null && childVal !== undefined) childVal = String(childVal);

        var statusVal = statusField && row[statusField] ? (row[statusField].rendered || row[statusField].value) : "INFO";
        if (statusVal !== null && statusVal !== undefined) statusVal = String(statusVal).toUpperCase();

        var durRaw = row[durationField] ? row[durationField].value : 0;
        if (durRaw === null || durRaw === undefined || isNaN(Number(durRaw))) {
          if (suppressNulls) continue;
          durRaw = 0;
        }
        var dur = Math.max(0, Number(durRaw));
        if (dur === 0 && suppressNulls) continue;

        var volRaw = (volumeField && row[volumeField]) ? Number(row[volumeField].value || 0) : 1;
        totalAlerts += volRaw;
        allDurations.push(dur);
        totalSpanRecords++;

        if (statusVal.indexOf("CRIT") !== -1 || statusVal.indexOf("ERR") !== -1 || statusVal.indexOf("HIGH") !== -1) {
          criticalSpanCount++;
        }

        var drillLinks = (childField && row[childField] && row[childField].links) ? row[childField].links :
                         ((row[parentField] && row[parentField].links) ? row[parentField].links : []);

        if (!serviceMap[parentVal]) {
          serviceMap[parentVal] = {
            name: parentVal,
            isParent: true,
            totalDuration: 0,
            totalVolume: 0,
            children: {},
            drillLinks: drillLinks
          };
        }
        serviceMap[parentVal].totalDuration += dur;
        serviceMap[parentVal].totalVolume += volRaw;

        var opKey = childVal || ("Span #" + (r + 1));
        if (!serviceMap[parentVal].children[opKey]) {
          serviceMap[parentVal].children[opKey] = {
            name: opKey,
            parentName: parentVal,
            duration: 0,
            volume: 0,
            severity: statusVal,
            drillLinks: drillLinks
          };
        }
        serviceMap[parentVal].children[opKey].duration += dur;
        serviceMap[parentVal].children[opKey].volume += volRaw;
      }

      var parentNames = Object.keys(serviceMap);
      if (parentNames.length === 0 || allDurations.length === 0) {
        container.innerHTML = "<div style=\'padding:20px;color:#64748b;\'>No trace spans found matching filter criteria.</div>";
        return;
      }

      // Benchmark Target Calculation
      var sortedDurations = allDurations.slice().sort(function(a,b){return a-b;});
      var benchmarkTarget = null;
      var sumDur = 0;
      for (var s = 0; s < allDurations.length; s++) sumDur += allDurations[s];
      var meanDur = sumDur / allDurations.length;
      var medianDur = sortedDurations[Math.floor(sortedDurations.length / 2)];

      if (targetMode === "dataset_mean") benchmarkTarget = meanDur;
      else if (targetMode === "dataset_median") benchmarkTarget = medianDur;
      else if (targetMode === "percentile_p75") benchmarkTarget = sortedDurations[Math.floor(sortedDurations.length * 0.75)];
      else if (targetMode === "percentile_p90") benchmarkTarget = sortedDurations[Math.floor(sortedDurations.length * 0.90)];
      else if (targetMode === "fixed_value") benchmarkTarget = Number(config.fixedTargetValue || 0);

      // Convert to D3 Hierarchical Tree
      var rootNodeData = {
        name: "Trace Execution Root",
        isRoot: true,
        children: []
      };

      parentNames.forEach(function (pName) {
        var pObj = serviceMap[pName];
        var childKeys = Object.keys(pObj.children);
        var pNode = {
          name: pName,
          isParent: true,
          value: pObj.totalDuration,
          volume: pObj.totalVolume,
          drillLinks: pObj.drillLinks,
          children: []
        };
        childKeys.forEach(function (cKey) {
          var cObj = pObj.children[cKey];
          pNode.children.push({
            name: cKey,
            parentName: pName,
            value: cObj.duration,
            volume: cObj.volume,
            severity: cObj.severity,
            drillLinks: cObj.drillLinks
          });
        });
        rootNodeData.children.push(pNode);
      });

      // Sorting
      if (sortOrder === "duration_desc") {
        rootNodeData.children.sort(function (a, b) { return b.value - a.value; });
      } else if (sortOrder === "duration_asc") {
        rootNodeData.children.sort(function (a, b) { return a.value - b.value; });
      } else if (sortOrder === "volume_desc") {
        rootNodeData.children.sort(function (a, b) { return b.volume - a.volume; });
      } else if (sortOrder === "alphabetical") {
        rootNodeData.children.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Limits on Parents
      var topNLimit = topN !== "all" ? parseInt(topN, 10) : Infinity;
      if (rootNodeData.children.length > topNLimit) {
        if (config.rollupOther) {
          var keep = rootNodeData.children.slice(0, topNLimit);
          var other = rootNodeData.children.slice(topNLimit);
          var otherVal = 0;
          var otherVol = 0;
          other.forEach(function (o) {
            otherVal += o.value;
            otherVol += o.volume;
          });
          keep.push({
            name: "Other (" + other.length + " services)",
            isParent: true,
            value: otherVal,
            volume: otherVol,
            children: [{
              name: "Aggregated Background Spans",
              value: otherVal,
              volume: otherVol,
              severity: "LOW"
            }]
          });
          rootNodeData.children = keep;
        } else {
          rootNodeData.children = rootNodeData.children.slice(0, topNLimit);
        }
      }

      // Search Filtering
      var searchTerm = (self._searchTerm || "").trim().toLowerCase();
      if (searchTerm) {
        rootNodeData.children = rootNodeData.children.filter(function (p) {
          if (p.name.toLowerCase().indexOf(searchTerm) !== -1) return true;
          var matchChild = false;
          if (p.children) {
            matchChild = p.children.some(function (c) {
              return c.name.toLowerCase().indexOf(searchTerm) !== -1;
            });
          }
          return matchChild;
        });
      }

      // Find Critical Path Bottleneck Span
      var bottleneckSpan = { name: "None", value: 0, parent: "" };
      rootNodeData.children.forEach(function (p) {
        if (p.children) {
          p.children.forEach(function (c) {
            if (c.value > bottleneckSpan.value) {
              bottleneckSpan = { name: c.name, value: c.value, parent: p.name };
            }
          });
        }
      });

      // Clear container DOM
      container.innerHTML = "";
      container.style.background = theme.bg;

      // --- RENDER EXECUTIVE HUD & CONTROLS ---
      if (hudMode !== "hidden") {
        var headerEl = document.createElement("div");
        headerEl.style.padding = fontScale === "compact" ? "6px 14px" : "10px 18px";
        headerEl.style.borderBottom = "1px solid " + theme.border;
        headerEl.style.display = "flex";
        headerEl.style.flexWrap = "wrap";
        headerEl.style.alignItems = "center";
        headerEl.style.justifyContent = "space-between";
        headerEl.style.gap = "10px";
        headerEl.style.background = theme.hudBg;
        headerEl.style.flexShrink = "0";

        var leftControls = document.createElement("div");
        leftControls.style.display = "flex";
        leftControls.style.alignItems = "center";
        leftControls.style.gap = "10px";
        leftControls.style.flexWrap = "wrap";

        if (config.chartTitleOverride) {
          var titleEl = document.createElement("div");
          titleEl.style.fontWeight = "700";
          titleEl.style.fontSize = fontScale === "compact" ? "12px" : "14px";
          titleEl.style.color = theme.text;
          titleEl.textContent = config.chartTitleOverride;
          leftControls.appendChild(titleEl);
        }

        if (showSearch) {
          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Filter services or spans...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.padding = "4px 8px";
          searchInput.style.fontSize = "11px";
          searchInput.style.borderRadius = "6px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.outline = "none";
          searchInput.style.width = "160px";
          searchInput.style.color = theme.text;
          searchInput.style.background = theme.bg;
          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.renderChart(d3, container, data, config, queryResponse);
          };
          leftControls.appendChild(searchInput);
        }

        // Reset Zoom Button if zoomed in
        if (self._activeZoomNode) {
          var resetBtn = document.createElement("button");
          resetBtn.style.padding = "4px 10px";
          resetBtn.style.fontSize = "11px";
          resetBtn.style.fontWeight = "600";
          resetBtn.style.borderRadius = "6px";
          resetBtn.style.border = "1px solid " + theme.border;
          resetBtn.style.background = theme.colors[0];
          resetBtn.style.color = "#ffffff";
          resetBtn.style.cursor = "pointer";
          resetBtn.textContent = "⬅ Zoom Out (" + self._activeZoomNode.data.name + ")";
          resetBtn.onclick = function () {
            self._activeZoomNode = null;
            self.renderChart(d3, container, data, config, queryResponse);
          };
          leftControls.appendChild(resetBtn);
        }
        headerEl.appendChild(leftControls);

        // Scorecard KPIs
        var hudEl = document.createElement("div");
        hudEl.style.display = "flex";
        hudEl.style.alignItems = "center";
        hudEl.style.gap = "8px";
        hudEl.style.flexWrap = "wrap";

        function createHudCard(label, val, badge, badgeColor) {
          var card = document.createElement("div");
          card.style.background = theme.bg;
          card.style.border = "1px solid " + theme.border;
          card.style.borderRadius = "6px";
          card.style.padding = fontScale === "compact" ? "3px 8px" : "5px 12px";
          card.style.display = "flex";
          card.style.flexDirection = "column";

          var lbl = document.createElement("span");
          lbl.style.fontSize = "10px";
          lbl.style.fontWeight = "600";
          lbl.style.color = theme.subtext;
          lbl.style.textTransform = "uppercase";
          lbl.textContent = label;
          card.appendChild(lbl);

          var valRow = document.createElement("div");
          valRow.style.display = "flex";
          valRow.style.alignItems = "baseline";
          valRow.style.gap = "6px";

          var numSpan = document.createElement("span");
          numSpan.style.fontSize = fontScale === "compact" ? "12px" : "14px";
          numSpan.style.fontWeight = "700";
          numSpan.style.color = theme.text;
          numSpan.textContent = val;
          valRow.appendChild(numSpan);

          if (badge) {
            var bd = document.createElement("span");
            bd.style.fontSize = "10px";
            bd.style.fontWeight = "700";
            bd.style.padding = "1px 5px";
            bd.style.borderRadius = "4px";
            bd.style.background = badgeColor || theme.colors[0];
            bd.style.color = "#ffffff";
            bd.textContent = badge;
            valRow.appendChild(bd);
          }
          card.appendChild(valRow);
          return card;
        }

        if (hudMode === "full") {
          hudEl.appendChild(createHudCard("Root Services", rootNodeData.children.length));
          hudEl.appendChild(createHudCard("Total Spans", totalSpanRecords));
          hudEl.appendChild(createHudCard("Bottleneck Span", bottleneckSpan.name.substring(0, 18), formatDuration(bottleneckSpan.value, effectiveFormat), theme.critical));

          if (benchmarkTarget !== null) {
            var isGood = polarity === "lower_is_better" ? (medianDur <= benchmarkTarget) : (medianDur >= benchmarkTarget);
            var badgeText = isGood ? "✓ SLA Met" : "⚠ SLA Gap";
            var badgeColor = isGood ? theme.low : theme.critical;
            hudEl.appendChild(createHudCard(refLineLabel, formatDuration(benchmarkTarget, effectiveFormat), badgeText, badgeColor));
          }

          var critPct = totalSpanRecords > 0 ? ((criticalSpanCount / totalSpanRecords) * 100).toFixed(1) : 0;
          hudEl.appendChild(createHudCard("Critical / Errors", criticalSpanCount + " (" + critPct + "%)", critPct > 10 ? "Alert" : null, theme.critical));
        } else {
          var pill = document.createElement("div");
          pill.style.padding = "3px 10px";
          pill.style.borderRadius = "12px";
          pill.style.background = theme.bg;
          pill.style.border = "1px solid " + theme.border;
          pill.style.fontSize = "11px";
          pill.style.color = theme.text;
          pill.innerHTML = "<b>" + rootNodeData.children.length + "</b> services · <b>" + totalSpanRecords + "</b> spans · Bottleneck: <b>" + bottleneckSpan.name.substring(0, 16) + "</b> (" + formatDuration(bottleneckSpan.value, effectiveFormat) + ")";
          hudEl.appendChild(pill);
        }
        headerEl.appendChild(hudEl);
        container.appendChild(headerEl);
      }

      // --- SVG CHART CANVAS ---
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1 1 0";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflowX = "hidden";
      chartWrapper.style.overflowY = "auto";
      container.appendChild(chartWrapper);

      var containerWidth = chartWrapper.clientWidth || container.clientWidth || 800;
      var margin = { top: 20, right: 25, bottom: 25, left: 25 };
      var width = containerWidth - margin.left - margin.right;
      if (width < 300) width = 300;

      // Construct D3 Partition Layout
      var hierarchyRoot = d3.hierarchy(self._activeZoomNode ? self._activeZoomNode.data : rootNodeData)
        .sum(function (d) { return d.value || 0; })
        .sort(function (a, b) { return b.value - a.value; });

      var partition = d3.partition();

      var depthMax = 0;
      hierarchyRoot.each(function (d) { if (d.depth > depthMax) depthMax = d.depth; });
      var totalLayers = depthMax + 1;
      var totalChartHeight = Math.max(300, totalLayers * (rowH + 6) + 40);

      partition.size([width, totalLayers * (rowH + 4)])(hierarchyRoot);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", totalChartHeight + margin.top + margin.bottom)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var colorScale = d3.scaleOrdinal()
        .domain(parentNames)
        .range(theme.colors);

      function getNodeColor(d) {
        if (d.depth === 0) return theme.hudBg;
        if (colorBySeverity && d.data.severity) {
          var sev = d.data.severity.toUpperCase();
          if (sev.indexOf("CRIT") !== -1) return theme.critical;
          if (sev.indexOf("HIGH") !== -1) return theme.high;
          if (sev.indexOf("MED") !== -1) return theme.medium;
          if (sev.indexOf("LOW") !== -1 || sev.indexOf("INFO") !== -1) return theme.low;
        }
        var pName = d.data.parentName || d.data.name;
        return colorScale(pName);
      }

      // Nodes to render
      var nodesToRender = hierarchyRoot.descendants().filter(function (d) {
        return d.depth > 0; // hide dummy root
      });

      // Layout Modes positioning adjustments
      if (layoutMode === "bottomup_flame") {
        // Invert Y coordinates so root is at bottom and stacks grow up
        var maxDepthH = totalLayers * (rowH + 4);
        nodesToRender.forEach(function (d) {
          d.yFlame = maxDepthH - (d.depth * (rowH + 4));
        });
      } else if (layoutMode === "waterfall_timeline") {
        // Sequential cascading offset
        var runningOffset = 0;
        nodesToRender.forEach(function (d, i) {
          d.waterfallX = runningOffset;
          var spanWidth = Math.max(20, (d.value / (hierarchyRoot.value || 1)) * width);
          d.waterfallW = Math.min(width - d.waterfallX, spanWidth);
          runningOffset = (runningOffset + spanWidth * 0.35) % (width - 40);
        });
      }

      // Render Span Rectangles
      var spanGroups = g.selectAll(".span-block")
        .data(nodesToRender)
        .enter()
        .append("g")
        .attr("class", "span-block")
        .attr("transform", function (d) {
          var x = d.x0;
          var y = (d.depth - 1) * (rowH + 4);
          if (layoutMode === "bottomup_flame") {
            y = d.yFlame - rowH;
          } else if (layoutMode === "waterfall_timeline") {
            x = d.waterfallX;
            y = (d.depth - 1) * (rowH + 4);
          }
          return "translate(" + x + "," + y + ")";
        })
        .style("cursor", "pointer");

      spanGroups.append("rect")
        .attr("width", function (d) {
          if (layoutMode === "waterfall_timeline") return Math.max(2, d.waterfallW);
          return Math.max(2, d.x1 - d.x0 - 1);
        })
        .attr("height", rowH)
        .attr("rx", 4)
        .attr("fill", function (d) { return getNodeColor(d); })
        .attr("stroke", theme.bg)
        .attr("stroke-width", 1)
        .attr("opacity", function (d) {
          if (layoutMode === "critical_path_chain") {
            return (d.data.name === bottleneckSpan.name || d.data.name === bottleneckSpan.parent) ? 1.0 : 0.28;
          }
          return 0.90;
        });

      // Span Labels
      if (showSpanLabels) {
        spanGroups.each(function (d) {
          var blockWidth = (layoutMode === "waterfall_timeline") ? d.waterfallW : (d.x1 - d.x0);
          if (blockWidth < 45) return; // skip text on tiny slices

          var group = d3.select(this);
          var textEl = group.append("text")
            .attr("x", 6)
            .attr("y", rowH / 2 + 4)
            .attr("fill", (themeKey === "cyberpunk_noc" || getNodeColor(d) === theme.critical) ? "#ffffff" : "#0f172a")
            .attr("font-size", fontScale === "compact" ? "9px" : "11px")
            .attr("font-weight", "600")
            .style("pointer-events", "none");

          var labelStr = d.data.name;
          var durStr = " (" + formatDuration(d.value, effectiveFormat) + ")";
          var maxChars = Math.floor(blockWidth / 7);

          if (labelStr.length + durStr.length > maxChars) {
            var trimmed = labelStr.substring(0, Math.max(4, maxChars - durStr.length - 2)) + "…";
            textEl.text(trimmed + durStr);
          } else {
            textEl.text(labelStr + durStr);
          }
        });
      }

      // Tooltip Interactions
      spanGroups.on("mousemove", function (event, d) {
        var tip = self._tooltip;
        if (!tip) return;
        tip.style.display = "block";
        tip.style.background = theme.bg;
        tip.style.color = theme.text;
        tip.style.border = "1px solid " + theme.border;

        var pctOfTotal = hierarchyRoot.value > 0 ? ((d.value / hierarchyRoot.value) * 100).toFixed(1) : 0;
        var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;color:" + theme.text + ";'>" + d.data.name + "</div>" +
                   "<div style='display:grid;grid-template-columns:auto auto;gap:3px 14px;font-size:11px;'>" +
                   "<span style='color:" + theme.subtext + ";'>Parent Service:</span><span style='font-weight:600;text-align:right;'>" + (d.data.parentName || "Root") + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>Span Duration / MTTR:</span><span style='font-weight:700;color:" + theme.colors[0] + ";text-align:right;'>" + formatDuration(d.value, effectiveFormat) + " (" + pctOfTotal + "%)</span>";

        if (d.data.volume) {
          html += "<span style='color:" + theme.subtext + ";'>Call Volume / Alerts:</span><span style='font-weight:600;text-align:right;'>" + d.data.volume.toLocaleString() + "</span>";
        }
        if (d.data.severity) {
          html += "<span style='color:" + theme.subtext + ";'>Health / Severity:</span><span style='font-weight:700;text-align:right;color:" + getNodeColor(d) + ";'>" + d.data.severity + "</span>";
        }
        if (benchmarkTarget !== null) {
          var delta = d.value - benchmarkTarget;
          var isFavorable = polarity === "lower_is_better" ? (delta <= 0) : (delta >= 0);
          html += "<span style='color:" + theme.subtext + ";'>Vs SLA Target:</span><span style='font-weight:700;text-align:right;color:" + (isFavorable ? theme.low : theme.critical) + ";'>" + (delta >= 0 ? "+" : "") + formatDuration(delta, effectiveFormat) + "</span>";
        }
        html += "</div>";

        if (d.children && d.children.length > 0) {
          html += "<div style='margin-top:6px;font-size:10px;color:" + theme.colors[0] + ";border-top:1px solid " + theme.border + ";padding-top:4px;'>🔍 Click to zoom into this sub-tree</div>";
        } else if (d.data.drillLinks && d.data.drillLinks.length > 0) {
          html += "<div style='margin-top:6px;font-size:10px;color:" + theme.colors[0] + ";border-top:1px solid " + theme.border + ";padding-top:4px;'>🔎 Click to open Looker drill menu</div>";
        }

        tip.innerHTML = html;
        var tipW = 260;
        var tipH = tip.offsetHeight || 160;
        var x = event.clientX + 14;
        var y = event.clientY + 14;
        if (x + tipW > window.innerWidth) x = event.clientX - tipW - 14;
        if (y + tipH > window.innerHeight) y = event.clientY - tipH - 14;
        tip.style.left = x + "px";
        tip.style.top = y + "px";
      })
      .on("mouseleave", function () {
        if (self._tooltip) self._tooltip.style.display = "none";
      });

      // Click to Zoom or Drilldown
      spanGroups.on("click", function (event, d) {
        if (d.children && d.children.length > 0) {
          self._activeZoomNode = d;
          self.renderChart(d3, container, data, config, queryResponse);
        } else if (d.data.drillLinks && d.data.drillLinks.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.data.drillLinks,
            event: event
          });
        }
      });
    }
  });
})();
