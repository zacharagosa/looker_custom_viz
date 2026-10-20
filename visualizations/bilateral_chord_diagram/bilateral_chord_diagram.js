/**
 * Bilateral Chord Diagram & Directed Flow Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for bilateral entity relationships, customer migrations, brand switching,
 * supply chain fulfillment corridors, telecom network peering, and market basket affinities.
 * Solves Looker Cloud Blockers b/314340020, b/213338627, b/184376439, b/171817900, b/171818436.
 *
 * Upgraded with:
 * - Dynamic field-role mapping (Source Dim, Target Dim, Flow Measure, Target Measure)
 * - Configurable benchmark targets (Dataset Mean, Median, P75, P90, Fixed Value)
 * - Interactive sorting (Metric Descending, Ascending, Alphabetical, Natural)
 * - Top-N capacity limiter with automatic '+N Other' rollup and null suppression
 * - Multi-density Executive HUD (Full, Compact, Hidden) and data label density
 * - Enterprise color palettes (Google Enterprise, Modern Slate, Cyberpunk, Emerald, Sunset, Wellverse, Custom)
 * - Metric polarity toggle (Higher is Better vs Lower is Better)
 * - Formatters for compact numbers, currency, percentage, decimal, raw
 * - Native Looker drill-down menus and debounced ResizeObserver
 */

looker.plugins.visualizations.add({
  id: "bilateral_chord_diagram",
  label: "Bilateral Chord & Directed Flow Matrix",
  options: {
    // ==========================================
    // SECTION 1: DISPLAY (Strictly 2 tabs: Display & Style)
    // ==========================================
    vizMode: {
      type: "string",
      label: "Visualization Layout Mode",
      display: "select",
      values: [
        { "Circular Directed Chord": "chord" },
        { "Bilateral Flow Matrix (Heatmap)": "matrix" },
        { "Bipartite Split Corridor": "bipartite" }
      ],
      default: "chord",
      order: 1,
      section: "Display"
    },
    sourceDimOverride: {
      type: "string",
      label: "Source Entity Dimension",
      section: "Display",
      order: 2,
      display: "select",
      values: [{ "Auto / First Dimension": "" }],
      default: ""
    },
    targetDimOverride: {
      type: "string",
      label: "Target Entity Dimension",
      section: "Display",
      order: 3,
      display: "select",
      values: [{ "Auto / Second Dimension": "" }],
      default: ""
    },
    flowMeasureOverride: {
      type: "string",
      label: "Primary Flow Measure",
      section: "Display",
      order: 4,
      display: "select",
      values: [{ "Auto / First Measure": "" }],
      default: ""
    },
    targetMeasureOverride: {
      type: "string",
      label: "Comparison / Target Measure",
      section: "Display",
      order: 5,
      display: "select",
      values: [{ "Auto / None": "" }],
      default: ""
    },
    targetMode: {
      type: "string",
      label: "Corridor Target & Benchmark Mode",
      section: "Display",
      order: 6,
      display: "select",
      values: [
        { "None / Hide Benchmarks": "none" },
        { "Target Measure Column": "measure_column" },
        { "Fixed Target Value": "fixed_value" },
        { "Dataset Mean (Average Flow)": "dataset_mean" },
        { "Dataset Median (P50 Flow)": "dataset_median" },
        { "Top Quartile Benchmark (P75)": "percentile_p75" },
        { "Top Decile Benchmark (P90)": "percentile_p90" }
      ],
      default: "dataset_mean"
    },
    targetValue: {
      type: "number",
      label: "Custom Target Value",
      section: "Display",
      order: 7,
      default: 0
    },
    referenceLineLabel: {
      type: "string",
      label: "Benchmark Reference Label",
      section: "Display",
      order: 8,
      default: "Flow Benchmark"
    },
    anomalyThresholdPct: {
      type: "number",
      label: "Anomaly Alert Threshold (%)",
      section: "Display",
      order: 9,
      default: 130
    },
    sortOrder: {
      type: "string",
      label: "Entity & Ribbon Sort Order",
      section: "Display",
      order: 10,
      display: "select",
      values: [
        { "Metric Volume Descending": "descending" },
        { "Metric Volume Ascending": "ascending" },
        { "Alphabetical / Entity Name": "alphabetical" },
        { "Chronological / Natural Order": "natural" }
      ],
      default: "descending"
    },
    topN: {
      type: "string",
      label: "Entity Capacity Limiter",
      section: "Display",
      order: 11,
      display: "select",
      values: [
        { "Top 8 Entities": "8" },
        { "Top 10 Entities": "10" },
        { "Top 12 Entities": "12" },
        { "Top 16 Entities": "16" },
        { "Top 20 Entities": "20" },
        { "Top 30 Entities": "30" },
        { "All Entities (No Cap)": "all" }
      ],
      default: "12"
    },
    bundleOther: {
      type: "boolean",
      label: "Bundle Remainder into \"Other\"",
      section: "Display",
      order: 12,
      default: true
    },
    suppressNulls: {
      type: "boolean",
      label: "Suppress Zero & Null Flows",
      section: "Display",
      order: 13,
      default: true
    },
    showSelfFlow: {
      type: "boolean",
      label: "Show Self-Flow (Intra-Entity)",
      section: "Display",
      order: 14,
      default: true
    },
    directedFlow: {
      type: "boolean",
      label: "Directional Ribbon Gradients",
      section: "Display",
      order: 15,
      default: true
    },
    hudMode: {
      type: "string",
      label: "Executive Flow KPI HUD",
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
      label: "Data Value Labels Density",
      section: "Display",
      order: 17,
      display: "select",
      values: [
        { "All Visible Entities": "all" },
        { "Peak Corridors Only": "peaks_only" },
        { "Hidden (Tooltips Only)": "hidden" }
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
    showSearch: {
      type: "boolean",
      label: "Entity Quick-Search Bar",
      section: "Display",
      order: 20,
      default: true
    },

    // ==========================================
    // SECTION 2: STYLE (Strictly 2 tabs: Display & Style)
    // ==========================================
    colorPalette: {
      type: "string",
      label: "Color Palette & Theme",
      section: "Style",
      order: 1,
      display: "select",
      values: [
        { "Google Enterprise Spectrum": "google" },
        { "Modern Slate (Executive)": "slate" },
        { "Cyberpunk Glow": "cyberpunk" },
        { "Emerald FinOps": "emerald" },
        { "Sunset Media": "sunset" },
        { "Wellverse Healthcare": "wellverse" },
        { "Custom Hex Override": "custom" }
      ],
      default: "google"
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
        { "Higher is Better (Revenue, Conversion, Volume)": "higher_is_better" },
        { "Lower is Better (Latency, Churn, Waste, Defect)": "lower_is_better" }
      ],
      default: "higher_is_better"
    },
    fontScale: {
      type: "string",
      label: "Font Scale & Density",
      section: "Style",
      order: 6,
      display: "select",
      values: [
        { "Compact (Dense Dashboard)": "compact" },
        { "Standard (Balanced)": "standard" },
        { "Large Presentation": "large" }
      ],
      default: "standard"
    },
    valueFormat: {
      type: "string",
      label: "Value Number Formatting",
      section: "Style",
      order: 7,
      display: "select",
      values: [
        { "Auto Detect": "auto" },
        { "Compact Number (1.2M)": "compact_number" },
        { "Compact Currency ($1.2M)": "compact_currency" },
        { "Percentage (45.2%)": "percentage" },
        { "Decimal (2 Decimal Places)": "decimal_2" },
        { "Raw Exact Number": "raw" }
      ],
      default: "compact_currency"
    },
    ribbonOpacity: {
      type: "number",
      label: "Ribbon Flow Opacity (0.2 - 0.9)",
      section: "Style",
      order: 8,
      default: 0.65
    },
    arcThickness: {
      type: "number",
      label: "Perimeter Arc Thickness (px)",
      section: "Style",
      order: 9,
      default: 18
    },
    padAngle: {
      type: "number",
      label: "Arc Gap Spacing (0.01 - 0.08)",
      section: "Style",
      order: 10,
      default: 0.03
    },
    labelStyle: {
      type: "string",
      label: "Entity Label Placement",
      section: "Style",
      order: 11,
      display: "select",
      values: [
        { "Radial (Outward from Arc)": "radial" },
        { "Circumference (Along Arc)": "circumference" },
        { "Hidden": "none" }
      ],
      default: "radial"
    }
  },

  create: function(element, config) {
    element.style.boxSizing = "border-box";
    element.style.padding = "0";
    element.style.overflow = "hidden";
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.fontFamily = "-apple-system, BlinkMacSystemFont, \"Google Sans\", \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif";
    element.style.background = "#ffffff";
    element.style.color = "#1e293b";

    // Inject styles
    var styleId = "looker-viz-bilateral-chord-styles";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .chord-tooltip {
          position: absolute;
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.94);
          color: #ffffff;
          font-size: 12px;
          line-height: 1.45;
          border-radius: 8px;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          backdrop-filter: blur(4px);
          max-width: 320px;
          transition: opacity 0.15s ease-out;
          font-family: inherit;
        }
        .chord-tooltip .tt-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding-bottom: 4px;
        }
        .chord-tooltip .tt-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 3px 0;
        }
        .chord-tooltip .tt-val {
          font-weight: 600;
        }
        .chord-tooltip .tt-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .chord-tooltip .tt-badge-pos {
          background: #10b981;
          color: #ffffff;
        }
        .chord-tooltip .tt-badge-neg {
          background: #ef4444;
          color: #ffffff;
        }
        .chord-tooltip .tt-badge-neutral {
          background: #64748b;
          color: #ffffff;
        }
        .chord-arc {
          cursor: pointer;
          transition: opacity 0.2s, stroke-width 0.2s;
        }
        .chord-arc:hover {
          filter: drop-shadow(0 0 4px rgba(0,0,0,0.25));
        }
        .chord-ribbon {
          cursor: pointer;
          transition: opacity 0.2s, stroke 0.2s;
        }
        .chord-ribbon:hover {
          stroke: #0f172a;
          stroke-width: 1.5px;
        }
        .chord-hud-chip {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          min-width: 110px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .chord-hud-chip.compact {
          padding: 3px 8px;
          min-width: 80px;
        }
        .chord-hud-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-bottom: 2px;
        }
        .chord-hud-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .chord-hud-chip.compact .chord-hud-val {
          font-size: 12px;
        }
        .chord-hud-sub {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 1px;
        }
        .chord-search-input {
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background: #ffffff;
          color: #1e293b;
          min-width: 160px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .chord-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .chord-matrix-table {
          border-collapse: collapse;
          font-size: 11px;
          width: 100%;
          table-layout: fixed;
        }
        .chord-matrix-table th, .chord-matrix-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 4px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chord-matrix-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        .chord-matrix-cell {
          cursor: pointer;
          transition: transform 0.1s;
        }
        .chord-matrix-cell:hover {
          outline: 2px solid #2563eb;
          z-index: 10;
        }
        .chord-header-bar {
          padding: 8px 14px 4px 14px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }
        .chord-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .chord-header-sub {
          font-size: 11px;
          color: #64748b;
          margin: 2px 0 0 0;
        }
      `;
      document.head.appendChild(style);
    }

    // Header Bar (Title & Subtitle)
    var headerBar = document.createElement("div");
    headerBar.className = "chord-header-bar";
    headerBar.style.display = "none";
    element.appendChild(headerBar);

    // Top control & HUD bar
    var topBar = document.createElement("div");
    topBar.className = "chord-top-bar";
    topBar.style.flex = "0 0 auto";
    topBar.style.padding = "8px 14px";
    topBar.style.borderBottom = "1px solid #e2e8f0";
    topBar.style.background = "#ffffff";
    topBar.style.display = "flex";
    topBar.style.flexWrap = "wrap";
    topBar.style.alignItems = "center";
    topBar.style.justifyContent = "space-between";
    topBar.style.gap = "10px";
    element.appendChild(topBar);

    // Main Chart Wrapper
    var chartWrapper = document.createElement("div");
    chartWrapper.className = "chord-chart-wrapper";
    chartWrapper.style.flex = "1 1 0";
    chartWrapper.style.minHeight = "0";
    chartWrapper.style.width = "100%";
    chartWrapper.style.position = "relative";
    chartWrapper.style.overflow = "hidden";
    chartWrapper.style.display = "flex";
    chartWrapper.style.alignItems = "center";
    chartWrapper.style.justifyContent = "center";
    element.appendChild(chartWrapper);

    // Floating Tooltip
    var tooltip = document.createElement("div");
    tooltip.className = "chord-tooltip";
    tooltip.style.display = "none";
    tooltip.style.opacity = "0";
    chartWrapper.appendChild(tooltip);

    this._container = element;
    this._headerBar = headerBar;
    this._topBar = topBar;
    this._chartWrapper = chartWrapper;
    this._tooltip = tooltip;
    this._searchQuery = "";
    this._pinnedEntity = null;

    // Debounced ResizeObserver (<4px guard)
    var self = this;
    var resizeTimer = null;
    var lastW = 0;
    var lastH = 0;
    this._ro = new ResizeObserver(function(entries) {
      if (!entries || !entries.length) return;
      var cr = entries[0].contentRect;
      if (Math.abs(cr.width - lastW) < 4 && Math.abs(cr.height - lastH) < 4) return;
      lastW = cr.width;
      lastH = cr.height;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (self._lastArgs) {
          self.updateAsync.apply(self, self._lastArgs);
        }
      }, 150);
    });
    this._ro.observe(element);
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    this._lastArgs = [data, element, config, queryResponse, details, done];
    this.clearErrors();

    // 1. Validate Fields
    if (!data || !data.length) {
      this.addError({ title: "No Data", message: "This query returned 0 rows of data." });
      return;
    }

    var fields = queryResponse.fields;
    var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
    var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
    var pivots = queryResponse.pivots || [];
    var isPivoted = pivots.length > 0;

    // Dynamic field options registration
    var dimOptions = [{ "Auto / Default Order": "" }];
    dims.forEach(function(d) {
      var opt = {};
      opt[d.label || d.name] = d.name;
      dimOptions.push(opt);
    });
    var measOptions = [{ "Auto / Default Order": "" }];
    meas.forEach(function(m) {
      var opt = {};
      opt[m.label || m.name] = m.name;
      measOptions.push(opt);
    });

    if (this.trigger) {
      try {
        this.trigger("registerOptions", {
          sourceDimOverride: { values: dimOptions },
          targetDimOverride: { values: dimOptions },
          flowMeasureOverride: { values: measOptions },
          targetMeasureOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) }
        });
      } catch (e) {}
    }

    if (dims.length < 2 && !isPivoted) {
      this.addError({
        title: "Insufficient Dimensions",
        message: "Bilateral Chord Diagram requires either 2 dimensions (Source entity and Target entity) or 1 dimension pivoted by a second dimension."
      });
      return;
    }

    if (meas.length < 1) {
      this.addError({
        title: "Missing Flow Measure",
        message: "Please include at least 1 measure representing flow volume, sales, migration count, or bandwidth."
      });
      return;
    }

    // Dynamic Field-Role Mapping
    var dimSource = config.sourceDimOverride && config.sourceDimOverride !== "" ? config.sourceDimOverride : dims[0].name;
    var dimTarget = isPivoted ? null : (config.targetDimOverride && config.targetDimOverride !== "" ? config.targetDimOverride : (dims.length > 1 ? dims[1].name : dims[0].name));
    var measFlow = config.flowMeasureOverride && config.flowMeasureOverride !== "" ? config.flowMeasureOverride : meas[0].name;
    var measTarget = config.targetMeasureOverride && config.targetMeasureOverride !== "" ? config.targetMeasureOverride : (meas.length > 1 ? meas[1].name : null);

    // Config options
    var vizMode = config.vizMode || "chord";
    var topNSetting = config.topN || "12";
    var bundleOther = config.bundleOther !== false;
    var suppressNulls = config.suppressNulls !== false;
    var showSelfFlow = config.showSelfFlow !== false;
    var directedFlow = config.directedFlow !== false;
    var hudMode = config.hudMode || (config.showExecutiveHUD === false ? "hidden" : "full");
    var showSearch = config.showSearch !== false;
    var sortOrder = config.sortOrder || "descending";
    var targetMode = config.targetMode || "dataset_mean";
    var customTargetValue = Number(config.targetValue) || 0;
    var refLabel = config.referenceLineLabel || "Flow Benchmark";
    var anomalyThresholdPct = Number(config.anomalyThresholdPct) || 130;
    var dataLabelDensity = config.dataLabelDensity || "all";
    var chartTitle = config.chartTitleOverride || "";
    var chartSub = config.chartSubtitleOverride || "";

    var colorPalette = config.colorPalette || "google";
    var customPrimaryColor = config.customPrimaryColor || "";
    var customPositiveColor = config.customPositiveColor || "";
    var customNegativeColor = config.customNegativeColor || "";
    var metricPolarity = config.metricPolarity || "higher_is_better";
    var fontScale = config.fontScale || "standard";
    var valueFormat = config.valueFormat || "compact_currency";

    var ribbonOpacity = parseFloat(config.ribbonOpacity) || 0.65;
    var arcThickness = parseFloat(config.arcThickness) || 18;
    var padAngle = parseFloat(config.padAngle) || 0.03;
    var labelStyle = config.labelStyle || "radial";

    // Font scale settings
    var baseFontSize = fontScale === "compact" ? 10 : (fontScale === "large" ? 14 : 11);
    this._container.style.fontSize = baseFontSize + "px";

    // Header Bar update
    if (chartTitle || chartSub) {
      this._headerBar.style.display = "block";
      this._headerBar.innerHTML = `
        ${chartTitle ? `<h3 class="chord-header-title">${chartTitle}</h3>` : ""}
        ${chartSub ? `<p class="chord-header-sub">${chartSub}</p>` : ""}
      `;
    } else {
      this._headerBar.style.display = "none";
      this._headerBar.innerHTML = "";
    }

    // Value formatter
    var formatVal = function(val) {
      if (val === null || val === undefined || isNaN(val)) return "-";
      var num = Number(val);
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";

      if (valueFormat === "percentage") {
        var p = (num <= 1 && num >= -1) ? num * 100 : num;
        return (p >= 0 ? "" : "-") + Math.abs(p).toFixed(1) + "%";
      } else if (valueFormat === "compact_currency") {
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(2);
      } else if (valueFormat === "compact_number") {
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + Math.round(abs).toLocaleString();
      } else if (valueFormat === "decimal_2") {
        return sign + abs.toFixed(2);
      } else if (valueFormat === "raw") {
        return String(num);
      } else {
        // Auto
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (Math.floor(abs) === abs ? abs.toLocaleString() : abs.toFixed(2));
      }
    };

    // 2. Build Adjacency Flow Graph from Data (5,000+ rows client-side O(N) aggregation)
    var rawFlows = {};
    var entityTotals = {};
    var entityOutbound = {};
    var entityInbound = {};
    var drillLinksMap = {};
    var corridorTargetValues = [];
    var totalFlowVolume = 0;
    var activeCorridors = 0;

    var registerFlow = function(src, tgt, val, targetVal, links) {
      if (!src || !tgt || isNaN(val)) return;
      if (suppressNulls && val <= 0) return;
      if (!showSelfFlow && src === tgt) return;

      if (!rawFlows[src]) rawFlows[src] = {};
      rawFlows[src][tgt] = (rawFlows[src][tgt] || 0) + val;

      entityTotals[src] = (entityTotals[src] || 0) + val;
      entityTotals[tgt] = (entityTotals[tgt] || 0) + val;
      entityOutbound[src] = (entityOutbound[src] || 0) + val;
      entityInbound[tgt] = (entityInbound[tgt] || 0) + val;

      totalFlowVolume += val;
      activeCorridors++;

      if (targetVal !== null && !isNaN(targetVal)) {
        corridorTargetValues.push(targetVal);
      }

      var pairKey = src + "::" + tgt;
      if (links && links.length) {
        drillLinksMap[pairKey] = (drillLinksMap[pairKey] || []).concat(links);
      }
    };

    if (isPivoted) {
      data.forEach(function(row) {
        var src = String(row[dimSource] && row[dimSource].value !== undefined ? row[dimSource].value : "Unknown");
        pivots.forEach(function(pivot) {
          var tgt = String(pivot.key !== undefined ? pivot.key : "Unknown");
          var cell = row[measFlow] && row[measFlow][pivot.key];
          var val = cell && cell.value !== undefined ? Number(cell.value) : 0;
          var tCell = measTarget && row[measTarget] ? row[measTarget][pivot.key] : null;
          var targetVal = tCell && tCell.value !== undefined ? Number(tCell.value) : null;
          var links = cell && cell.links ? cell.links : (row[dimSource] ? row[dimSource].links : null);
          registerFlow(src, tgt, val, targetVal, links);
        });
      });
    } else {
      data.forEach(function(row) {
        var src = String(row[dimSource] && row[dimSource].value !== undefined ? row[dimSource].value : "Unknown");
        var tgt = String(row[dimTarget] && row[dimTarget].value !== undefined ? row[dimTarget].value : "Unknown");
        var cell = row[measFlow];
        var val = cell && cell.value !== undefined ? Number(cell.value) : 0;
        var tCell = measTarget ? row[measTarget] : null;
        var targetVal = tCell && tCell.value !== undefined ? Number(tCell.value) : null;
        var links = (cell && cell.links) || (row[dimSource] && row[dimSource].links) || (row[dimTarget] && row[dimTarget].links);
        registerFlow(src, tgt, val, targetVal, links);
      });
    }

    // 3. Top-N Entity Selection & Sorting
    var allEntityKeys = Object.keys(entityTotals);
    if (sortOrder === "descending") {
      allEntityKeys.sort(function(a, b) { return entityTotals[b] - entityTotals[a]; });
    } else if (sortOrder === "ascending") {
      allEntityKeys.sort(function(a, b) { return entityTotals[a] - entityTotals[b]; });
    } else if (sortOrder === "alphabetical") {
      allEntityKeys.sort(function(a, b) { return a.localeCompare(b); });
    }

    var entityList = [];
    var otherEntities = [];
    var topNCap = topNSetting === "all" ? allEntityKeys.length : parseInt(topNSetting, 10);

    if (allEntityKeys.length <= topNCap || topNSetting === "all") {
      entityList = allEntityKeys.slice();
    } else {
      entityList = allEntityKeys.slice(0, topNCap);
      otherEntities = allEntityKeys.slice(topNCap);
      if (bundleOther && otherEntities.length > 0) {
        entityList.push("Other Entities");
      }
    }

    var entityIndexMap = {};
    entityList.forEach(function(e, idx) {
      entityIndexMap[e] = idx;
    });

    var N = entityList.length;
    if (N < 2) {
      this.addError({
        title: "Insufficient Entities",
        message: "Query returned fewer than 2 distinct entities with non-zero flow volume."
      });
      return;
    }

    // Build square N x N matrix
    var matrix = [];
    for (var i = 0; i < N; i++) {
      var rowArr = [];
      for (var j = 0; j < N; j++) rowArr.push(0);
      matrix.push(rowArr);
    }

    var dominantPair = { src: "", tgt: "", vol: 0 };
    var totalCorridorsCount = 0;
    var allFlowValues = [];

    Object.keys(rawFlows).forEach(function(src) {
      var srcIdx = entityIndexMap[src];
      if (srcIdx === undefined) {
        if (bundleOther && entityIndexMap["Other Entities"] !== undefined) {
          srcIdx = entityIndexMap["Other Entities"];
        } else {
          return;
        }
      }

      Object.keys(rawFlows[src]).forEach(function(tgt) {
        var tgtIdx = entityIndexMap[tgt];
        if (tgtIdx === undefined) {
          if (bundleOther && entityIndexMap["Other Entities"] !== undefined) {
            tgtIdx = entityIndexMap["Other Entities"];
          } else {
            return;
          }
        }

        var vol = rawFlows[src][tgt];
        matrix[srcIdx][tgtIdx] += vol;
        totalCorridorsCount++;
        allFlowValues.push(vol);

        if (vol > dominantPair.vol) {
          dominantPair = { src: src, tgt: tgt, vol: vol };
        }
      });
    });

    // Compute Symmetry Index
    var bidirectionalSum = 0;
    var totalPairVol = 0;
    for (var r = 0; r < N; r++) {
      for (var c = r + 1; c < N; c++) {
        var fwd = matrix[r][c];
        var rev = matrix[c][r];
        var sum = fwd + rev;
        if (sum > 0) {
          totalPairVol += sum;
          var diff = Math.abs(fwd - rev);
          bidirectionalSum += diff;
        }
      }
    }
    var asymmetryRatio = totalPairVol > 0 ? (bidirectionalSum / totalPairVol) : 0;
    var symmetryIndex = Math.max(0, Math.min(100, Math.round((1 - asymmetryRatio) * 100)));

    // Benchmark calculation
    allFlowValues.sort(function(a, b) { return a - b; });
    var computedBenchmark = 0;
    if (targetMode === "fixed_value") {
      computedBenchmark = customTargetValue;
    } else if (targetMode === "dataset_mean") {
      computedBenchmark = allFlowValues.length ? d3.mean(allFlowValues) : 0;
    } else if (targetMode === "dataset_median") {
      computedBenchmark = allFlowValues.length ? d3.median(allFlowValues) : 0;
    } else if (targetMode === "percentile_p75") {
      computedBenchmark = allFlowValues.length ? d3.quantile(allFlowValues, 0.75) : 0;
    } else if (targetMode === "percentile_p90") {
      computedBenchmark = allFlowValues.length ? d3.quantile(allFlowValues, 0.90) : 0;
    } else if (targetMode === "measure_column") {
      computedBenchmark = corridorTargetValues.length ? d3.mean(corridorTargetValues) : (allFlowValues.length ? d3.mean(allFlowValues) : 0);
    }

    // 4. Color Palettes
    var palettes = {
      google: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60", "#7CB342", "#8E24AA"],
      slate: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#2563eb", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"],
      cyberpunk: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#06b6d4", "#3b82f6", "#6366f1", "#10b981", "#eab308", "#14b8a6", "#f97316"],
      emerald: ["#059669", "#10b981", "#34d399", "#047857", "#065f46", "#0d9488", "#14b8a6", "#15803d", "#16a34a", "#22c55e", "#84cc16", "#65a30d"],
      sunset: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#facc15", "#e11d48", "#c026d3", "#a855f7", "#7c3aed", "#4f46e5", "#ec4899", "#d97706"],
      wellverse: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8", "#1E467A", "#5FD3A0", "#8FB8F9", "#FFD166"],
      custom: [customPrimaryColor || "#1A73E8", customPositiveColor || "#10B981", customNegativeColor || "#EA4335", "#F9AB00", "#9334E6", "#00ACC1"]
    };
    var selectedColors = palettes[colorPalette] || palettes.google;
    var colorScale = d3.scaleOrdinal().domain(entityList).range(selectedColors);

    // 5. Render Top Control & Executive HUD Bar
    this._topBar.innerHTML = "";
    if (hudMode !== "hidden") {
      var isCompact = hudMode === "compact";
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = isCompact ? "6px" : "8px";
      hudContainer.style.flexWrap = "wrap";

      // Chip 1: Total Bilateral Flow
      var chip1 = document.createElement("div");
      chip1.className = "chord-hud-chip" + (isCompact ? " compact" : "");
      chip1.innerHTML = `
        <span class="chord-hud-label">Total Flow</span>
        <span class="chord-hud-val">${formatVal(totalFlowVolume)}</span>
        ${!isCompact ? `<span class="chord-hud-sub">${data.length} records</span>` : ""}
      `;
      hudContainer.appendChild(chip1);

      // Chip 2: Active Corridors & Entities
      var chip2 = document.createElement("div");
      chip2.className = "chord-hud-chip" + (isCompact ? " compact" : "");
      chip2.innerHTML = `
        <span class="chord-hud-label">Corridors</span>
        <span class="chord-hud-val">${totalCorridorsCount}</span>
        ${!isCompact ? `<span class="chord-hud-sub">${entityList.length} Entities</span>` : ""}
      `;
      hudContainer.appendChild(chip2);

      // Chip 3: Dominant Corridor
      var chip3 = document.createElement("div");
      chip3.className = "chord-hud-chip" + (isCompact ? " compact" : "");
      var domPct = totalFlowVolume > 0 ? ((dominantPair.vol / totalFlowVolume) * 100).toFixed(1) : "0";
      chip3.innerHTML = `
        <span class="chord-hud-label">Dominant</span>
        <span class="chord-hud-val" style="font-size: ${isCompact ? "11px" : "13px"}; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${dominantPair.src} ➔ ${dominantPair.tgt}">${dominantPair.src} ➔ ${dominantPair.tgt}</span>
        ${!isCompact ? `<span class="chord-hud-sub">${formatVal(dominantPair.vol)} (${domPct}%)</span>` : ""}
      `;
      hudContainer.appendChild(chip3);

      // Chip 4: Flow Reciprocity Index
      var chip4 = document.createElement("div");
      chip4.className = "chord-hud-chip" + (isCompact ? " compact" : "");
      var symLabel = symmetryIndex >= 70 ? "Reciprocal" : (symmetryIndex >= 40 ? "Asymmetric" : "One-Way");
      chip4.innerHTML = `
        <span class="chord-hud-label">Reciprocity</span>
        <span class="chord-hud-val">${symmetryIndex}%</span>
        ${!isCompact ? `<span class="chord-hud-sub">${symLabel}</span>` : ""}
      `;
      hudContainer.appendChild(chip4);

      // Chip 5: Target Benchmark (if active)
      if (targetMode !== "none" && computedBenchmark > 0) {
        var chip5 = document.createElement("div");
        chip5.className = "chord-hud-chip" + (isCompact ? " compact" : "");
        chip5.innerHTML = `
          <span class="chord-hud-label">${refLabel}</span>
          <span class="chord-hud-val">${formatVal(computedBenchmark)}</span>
          ${!isCompact ? `<span class="chord-hud-sub">${targetMode.replace("_", " ")}</span>` : ""}
        `;
        hudContainer.appendChild(chip5);
      }

      this._topBar.appendChild(hudContainer);
    }

    // Right Controls: Quick Search & Unpin Button
    var rightControls = document.createElement("div");
    rightControls.style.display = "flex";
    rightControls.style.alignItems = "center";
    rightControls.style.gap = "8px";

    if (showSearch) {
      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "chord-search-input";
      searchInput.placeholder = "🔍 Search entity...";
      searchInput.value = this._searchQuery || "";
      var self = this;
      searchInput.addEventListener("input", function(e) {
        self._searchQuery = e.target.value.toLowerCase().trim();
        self.applyEntityFilter();
      });
      rightControls.appendChild(searchInput);
    }

    if (this._pinnedEntity) {
      var resetBtn = document.createElement("button");
      resetBtn.style.padding = "6px 12px";
      resetBtn.style.fontSize = "11px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.border = "1px solid #cbd5e1";
      resetBtn.style.background = "#eff6ff";
      resetBtn.style.color = "#1d4ed8";
      resetBtn.style.cursor = "pointer";
      resetBtn.textContent = "⟲ Unpin (" + this._pinnedEntity + ")";
      var self = this;
      resetBtn.addEventListener("click", function() {
        self._pinnedEntity = null;
        self.updateAsync.apply(self, self._lastArgs);
      });
      rightControls.appendChild(resetBtn);
    }

    this._topBar.appendChild(rightControls);

    // 6. Clear Previous Visuals in Chart Wrapper
    var oldSvgs = this._chartWrapper.querySelectorAll("svg, table");
    oldSvgs.forEach(function(el) { el.remove(); });

    var width = this._chartWrapper.clientWidth || element.clientWidth || 800;
    var height = this._chartWrapper.clientHeight || 500;
    if (height < 200) height = 400;

    var tooltip = this._tooltip;
    var self = this;

    // 7. RENDER BASED ON MODE
    if (vizMode === "matrix") {
      // -------------------------------------------------------------
      // MODE 2: BILATERAL FLOW MATRIX (HEATMAP GRID)
      // -------------------------------------------------------------
      var matrixContainer = document.createElement("div");
      matrixContainer.style.width = "100%";
      matrixContainer.style.height = "100%";
      matrixContainer.style.overflow = "auto";
      matrixContainer.style.padding = "10px";

      var table = document.createElement("table");
      table.className = "chord-matrix-table";

      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      var cornerTh = document.createElement("th");
      cornerTh.style.width = "140px";
      cornerTh.style.textAlign = "left";
      cornerTh.style.paddingLeft = "8px";
      cornerTh.innerHTML = "<strong>Source ➔ Target</strong>";
      headerRow.appendChild(cornerTh);

      entityList.forEach(function(tgt) {
        var th = document.createElement("th");
        th.title = tgt;
        th.textContent = tgt;
        headerRow.appendChild(th);
      });
      var totalTh = document.createElement("th");
      totalTh.style.background = "#e2e8f0";
      totalTh.textContent = "Total Out";
      headerRow.appendChild(totalTh);
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");
      var maxMatrixVal = d3.max(matrix.flatMap(function(d) { return d; })) || 1;
      var matrixColor = d3.scaleSequential(d3.interpolateBlues).domain([0, maxMatrixVal]);

      matrix.forEach(function(row, rIdx) {
        var srcName = entityList[rIdx];
        var tr = document.createElement("tr");

        var srcTh = document.createElement("th");
        srcTh.style.textAlign = "left";
        srcTh.style.paddingLeft = "8px";
        srcTh.title = srcName;
        srcTh.textContent = srcName;
        tr.appendChild(srcTh);

        var rowSum = 0;
        row.forEach(function(val, cIdx) {
          var tgtName = entityList[cIdx];
          rowSum += val;
          var td = document.createElement("td");
          td.className = "chord-matrix-cell";

          var isSelf = (rIdx === cIdx);
          if (val > 0) {
            var bg = matrixColor(val);
            td.style.background = bg;
            var lum = d3.hsl(bg).l;
            td.style.color = lum < 0.5 ? "#ffffff" : "#0f172a";
            td.textContent = formatVal(val);
          } else {
            td.style.background = isSelf ? "#f8fafc" : "#ffffff";
            td.style.color = "#cbd5e1";
            td.textContent = "-";
          }

          if (isSelf && val > 0) {
            td.style.fontWeight = "700";
            td.style.border = "2px dashed #94a3b8";
          }

          td.addEventListener("mouseenter", function(e) {
            var reverseVal = matrix[cIdx][rIdx];
            var net = val - reverseVal;
            tooltip.style.display = "block";
            tooltip.style.opacity = "1";
            var netBadge = net > 0 ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net Out</span>`
              : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net In</span>` : `<span class="tt-badge tt-badge-neutral">Balanced</span>`);
            tooltip.innerHTML = `
              <div class="tt-title">
                <span>🔄</span> <strong>${srcName}</strong> ➔ <strong>${tgtName}</strong>
              </div>
              <div class="tt-row"><span>Forward Flow:</span> <span class="tt-val">${formatVal(val)}</span></div>
              <div class="tt-row"><span>Reverse Flow:</span> <span class="tt-val">${formatVal(reverseVal)}</span></div>
              <div class="tt-row"><span>Net Balance:</span> ${netBadge}</div>
              <div class="tt-row"><span>Share of Outbound:</span> <span class="tt-val">${rowSum > 0 ? ((val / rowSum) * 100).toFixed(1) : 0}%</span></div>
            `;
          });
          td.addEventListener("mousemove", function(e) {
            var rect = self._chartWrapper.getBoundingClientRect();
            var x = e.clientX - rect.left + 15;
            var y = e.clientY - rect.top + 15;
            tooltip.style.left = Math.min(x, rect.width - 260) + "px";
            tooltip.style.top = Math.min(y, rect.height - 120) + "px";
          });
          td.addEventListener("mouseleave", function() {
            tooltip.style.display = "none";
            tooltip.style.opacity = "0";
          });

          // Drill on cell click
          td.addEventListener("click", function(e) {
            var key = srcName + "::" + tgtName;
            var links = drillLinksMap[key];
            if (links && links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: links, event: e });
            }
          });

          tr.appendChild(td);
        });

        var sumTd = document.createElement("td");
        sumTd.style.background = "#f1f5f9";
        sumTd.style.fontWeight = "700";
        sumTd.textContent = formatVal(rowSum);
        tr.appendChild(sumTd);
        tbody.appendChild(tr);
      });

      // Bottom Row: Total In
      var tfoot = document.createElement("tfoot");
      var footRow = document.createElement("tr");
      var footTh = document.createElement("th");
      footTh.style.background = "#e2e8f0";
      footTh.style.textAlign = "left";
      footTh.style.paddingLeft = "8px";
      footTh.textContent = "Total In";
      footRow.appendChild(footTh);

      for (var c = 0; c < N; c++) {
        var colSum = 0;
        for (var r = 0; r < N; r++) colSum += matrix[r][c];
        var colTd = document.createElement("td");
        colTd.style.background = "#f1f5f9";
        colTd.style.fontWeight = "700";
        colTd.textContent = formatVal(colSum);
        footRow.appendChild(colTd);
      }
      var grandTd = document.createElement("td");
      grandTd.style.background = "#cbd5e1";
      grandTd.style.fontWeight = "800";
      grandTd.textContent = formatVal(totalFlowVolume);
      footRow.appendChild(grandTd);
      tfoot.appendChild(footRow);
      table.appendChild(tbody);
      table.appendChild(tfoot);
      matrixContainer.appendChild(table);
      this._chartWrapper.appendChild(matrixContainer);

    } else if (vizMode === "bipartite") {
      // -------------------------------------------------------------
      // MODE 3: BIPARTITE SPLIT CORRIDOR (SANKEY-LIKE DUAL COLUMN)
      // -------------------------------------------------------------
      var svg = d3.select(this._chartWrapper).append("svg")
        .attr("width", width)
        .attr("height", height);

      var margin = { top: 30, right: 140, bottom: 20, left: 140 };
      var innerW = width - margin.left - margin.right;
      var innerH = height - margin.top - margin.bottom;

      if (innerW < 100 || innerH < 100) {
        done();
        return;
      }

      var g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      // Calculate total out per entity and total in per entity
      var outList = entityList.map(function(e) { return { name: e, val: entityOutbound[e] || 0 }; }).filter(function(d) { return d.val > 0; });
      var inList = entityList.map(function(e) { return { name: e, val: entityInbound[e] || 0 }; }).filter(function(d) { return d.val > 0; });

      var totalOutSum = d3.sum(outList, function(d) { return d.val; }) || 1;
      var totalInSum = d3.sum(inList, function(d) { return d.val; }) || 1;

      var gap = 8;
      var availOutH = innerH - (outList.length - 1) * gap;
      var availInH = innerH - (inList.length - 1) * gap;

      var curY = 0;
      var outPositions = {};
      outList.forEach(function(d) {
        var h = Math.max(8, (d.val / totalOutSum) * availOutH);
        outPositions[d.name] = { y0: curY, y1: curY + h, height: h, val: d.val };
        curY += h + gap;
      });

      curY = 0;
      var inPositions = {};
      inList.forEach(function(d) {
        var h = Math.max(8, (d.val / totalInSum) * availInH);
        inPositions[d.name] = { y0: curY, y1: curY + h, height: h, val: d.val };
        curY += h + gap;
      });

      // Left Column (Sources)
      var colW = 14;
      g.selectAll(".source-bar")
        .data(outList)
        .enter()
        .append("rect")
        .attr("class", "source-bar")
        .attr("x", 0)
        .attr("y", function(d) { return outPositions[d.name].y0; })
        .attr("width", colW)
        .attr("height", function(d) { return outPositions[d.name].height; })
        .attr("fill", function(d) { return colorScale(d.name); })
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
          self._pinnedEntity = (self._pinnedEntity === d.name) ? null : d.name;
          self.updateAsync.apply(self, self._lastArgs);
        });

      // Left Labels
      g.selectAll(".source-label")
        .data(outList)
        .enter()
        .append("text")
        .attr("class", "source-label")
        .attr("x", -10)
        .attr("y", function(d) { return outPositions[d.name].y0 + outPositions[d.name].height / 2; })
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${baseFontSize}px`)
        .attr("font-weight", "600")
        .attr("fill", "#334155")
        .text(function(d) { return d.name; });

      // Right Column (Targets)
      g.selectAll(".target-bar")
        .data(inList)
        .enter()
        .append("rect")
        .attr("class", "target-bar")
        .attr("x", innerW - colW)
        .attr("y", function(d) { return inPositions[d.name].y0; })
        .attr("width", colW)
        .attr("height", function(d) { return inPositions[d.name].height; })
        .attr("fill", function(d) { return colorScale(d.name); })
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
          self._pinnedEntity = (self._pinnedEntity === d.name) ? null : d.name;
          self.updateAsync.apply(self, self._lastArgs);
        });

      // Right Labels
      g.selectAll(".target-label")
        .data(inList)
        .enter()
        .append("text")
        .attr("class", "target-label")
        .attr("x", innerW + 10)
        .attr("y", function(d) { return inPositions[d.name].y0 + inPositions[d.name].height / 2; })
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .attr("font-size", `${baseFontSize}px`)
        .attr("font-weight", "600")
        .attr("fill", "#334155")
        .text(function(d) { return d.name; });

      // Draw Flow Ribbons
      var srcRunningY = {};
      Object.keys(outPositions).forEach(function(k) { srcRunningY[k] = outPositions[k].y0; });
      var tgtRunningY = {};
      Object.keys(inPositions).forEach(function(k) { tgtRunningY[k] = inPositions[k].y0; });

      var ribbonData = [];
      entityList.forEach(function(src) {
        var sIdx = entityIndexMap[src];
        entityList.forEach(function(tgt) {
          var tIdx = entityIndexMap[tgt];
          var vol = matrix[sIdx][tIdx];
          if (vol <= 0) return;
          if (!outPositions[src] || !inPositions[tgt]) return;

          var sH = (vol / outPositions[src].val) * outPositions[src].height;
          var tH = (vol / inPositions[tgt].val) * inPositions[tgt].height;

          var sy0 = srcRunningY[src];
          var sy1 = sy0 + sH;
          srcRunningY[src] += sH;

          var ty0 = tgtRunningY[tgt];
          var ty1 = ty0 + tH;
          tgtRunningY[tgt] += tH;

          ribbonData.push({
            source: src,
            target: tgt,
            vol: vol,
            sy0: sy0,
            sy1: sy1,
            ty0: ty0,
            ty1: ty1
          });
        });
      });

      // Defs for gradients
      var defs = svg.append("defs");
      ribbonData.forEach(function(d, idx) {
        var gradId = "bipartite-grad-" + idx;
        var grad = defs.append("linearGradient")
          .attr("id", gradId)
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", colW)
          .attr("y1", (d.sy0 + d.sy1) / 2)
          .attr("x2", innerW - colW)
          .attr("y2", (d.ty0 + d.ty1) / 2);
        grad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(d.source));
        grad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(d.target));
        d.gradId = gradId;
      });

      var ribbonPaths = g.selectAll(".bipartite-ribbon")
        .data(ribbonData)
        .enter()
        .append("path")
        .attr("class", "bipartite-ribbon")
        .attr("d", function(d) {
          var x0 = colW;
          var x1 = innerW - colW;
          var xi = d3.interpolateNumber(x0, x1);
          var x2 = xi(0.5);
          var x3 = xi(0.5);
          return `M ${x0},${d.sy0}
                  C ${x2},${d.sy0} ${x3},${d.ty0} ${x1},${d.ty0}
                  L ${x1},${d.ty1}
                  C ${x3},${d.ty1} ${x2},${d.sy1} ${x0},${d.sy1}
                  Z`;
        })
        .attr("fill", function(d) { return directedFlow ? `url(#${d.gradId})` : colorScale(d.source); })
        .attr("fill-opacity", ribbonOpacity)
        .style("cursor", "pointer")
        .on("mouseenter", function(e, d) {
          d3.select(this).attr("fill-opacity", 0.9).attr("stroke", "#0f172a").attr("stroke-width", 1.5);
          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          tooltip.innerHTML = `
            <div class="tt-title">
              <span>🔄</span> <strong>${d.source}</strong> ➔ <strong>${d.target}</strong>
            </div>
            <div class="tt-row"><span>Corridor Flow:</span> <span class="tt-val">${formatVal(d.vol)}</span></div>
            <div class="tt-row"><span>Source Share:</span> <span class="tt-val">${((d.vol / outPositions[d.source].val) * 100).toFixed(1)}%</span></div>
            <div class="tt-row"><span>Target Share:</span> <span class="tt-val">${((d.vol / inPositions[d.target].val) * 100).toFixed(1)}%</span></div>
          `;
        })
        .on("mousemove", function(e) {
          var rect = self._chartWrapper.getBoundingClientRect();
          var x = e.clientX - rect.left + 15;
          var y = e.clientY - rect.top + 15;
          tooltip.style.left = Math.min(x, rect.width - 240) + "px";
          tooltip.style.top = Math.min(y, rect.height - 110) + "px";
        })
        .on("mouseleave", function() {
          d3.select(this).attr("fill-opacity", ribbonOpacity).attr("stroke", "none");
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        })
        .on("click", function(e, d) {
          var key = d.source + "::" + d.target;
          var links = drillLinksMap[key];
          if (links && links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: links, event: e });
          }
        });

      this._activeRibbons = ribbonPaths;

    } else {
      // -------------------------------------------------------------
      // MODE 1: CIRCULAR DIRECTED CHORD DIAGRAM (D3.CHORD)
      // -------------------------------------------------------------
      var svg = d3.select(this._chartWrapper).append("svg")
        .attr("width", width)
        .attr("height", height);

      var outerRadius = Math.min(width, height) * 0.5 - 75;
      if (outerRadius < 60) outerRadius = 60;
      var innerRadius = outerRadius - arcThickness;

      var g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      var chord = d3.chordDirected()
        .padAngle(padAngle)
        .sortSubgroups(d3.descending);

      var chords = chord(matrix);

      // Arc generator
      var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      // Ribbon generator
      var ribbon = d3.ribbonArrow()
        .radius(innerRadius - 0.5)
        .padAngle(padAngle);

      // Defs for ribbon directional gradients
      var defs = svg.append("defs");
      chords.forEach(function(d, idx) {
        var gradId = "chord-grad-" + idx;
        var grad = defs.append("linearGradient")
          .attr("id", gradId)
          .attr("gradientUnits", "userSpaceOnUse");

        var sa = (d.source.startAngle + d.source.endAngle) / 2 - Math.PI / 2;
        var ta = (d.target.startAngle + d.target.endAngle) / 2 - Math.PI / 2;
        grad.attr("x1", innerRadius * Math.cos(sa))
            .attr("y1", innerRadius * Math.sin(sa))
            .attr("x2", innerRadius * Math.cos(ta))
            .attr("y2", innerRadius * Math.sin(ta));

        var srcColor = colorScale(entityList[d.source.index]);
        var tgtColor = colorScale(entityList[d.target.index]);
        grad.append("stop").attr("offset", "0%").attr("stop-color", srcColor);
        grad.append("stop").attr("offset", "100%").attr("stop-color", tgtColor);
        d.gradId = gradId;
      });

      // 1. Draw Ribbons
      var ribbonGroup = g.append("g").attr("class", "ribbons");
      var ribbonSelection = ribbonGroup.selectAll("path")
        .data(chords)
        .enter()
        .append("path")
        .attr("class", "chord-ribbon")
        .attr("d", ribbon)
        .attr("fill", function(d) {
          return directedFlow ? `url(#${d.gradId})` : colorScale(entityList[d.source.index]);
        })
        .attr("fill-opacity", ribbonOpacity)
        .on("mouseenter", function(e, d) {
          var sName = entityList[d.source.index];
          var tName = entityList[d.target.index];
          var sVal = d.source.value;
          var revVal = matrix[d.target.index][d.source.index];
          var net = sVal - revVal;

          d3.select(this)
            .attr("fill-opacity", 0.95)
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 2);

          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          var netBadge = net > 0 ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net Out</span>`
            : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net In</span>` : `<span class="tt-badge tt-badge-neutral">Balanced</span>`);

          tooltip.innerHTML = `
            <div class="tt-title">
              <span>🔄</span> <strong>${sName}</strong> ➔ <strong>${tName}</strong>
            </div>
            <div class="tt-row"><span>Forward Flow:</span> <span class="tt-val">${formatVal(sVal)}</span></div>
            <div class="tt-row"><span>Reverse Flow:</span> <span class="tt-val">${formatVal(revVal)}</span></div>
            <div class="tt-row"><span>Net Balance:</span> ${netBadge}</div>
            <div class="tt-row"><span>Corridor Share:</span> <span class="tt-val">${totalFlowVolume > 0 ? ((sVal / totalFlowVolume) * 100).toFixed(1) : 0}%</span></div>
          `;
        })
        .on("mousemove", function(e) {
          var rect = self._chartWrapper.getBoundingClientRect();
          var x = e.clientX - rect.left + 15;
          var y = e.clientY - rect.top + 15;
          tooltip.style.left = Math.min(x, rect.width - 250) + "px";
          tooltip.style.top = Math.min(y, rect.height - 110) + "px";
        })
        .on("mouseleave", function() {
          d3.select(this)
            .attr("fill-opacity", ribbonOpacity)
            .attr("stroke", "none");
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        })
        .on("click", function(e, d) {
          var sName = entityList[d.source.index];
          var tName = entityList[d.target.index];
          var key = sName + "::" + tName;
          var links = drillLinksMap[key];
          if (links && links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: links, event: e });
          }
        });

      this._activeRibbons = ribbonSelection;

      // 2. Draw Group Arcs
      var group = g.append("g").attr("class", "groups")
        .selectAll("g")
        .data(chords.groups)
        .enter()
        .append("g");

      var arcPaths = group.append("path")
        .attr("class", "chord-arc")
        .attr("fill", function(d) { return colorScale(entityList[d.index]); })
        .attr("d", arc)
        .on("mouseenter", function(e, d) {
          var eName = entityList[d.index];
          var outVol = entityOutbound[eName] || 0;
          var inVol = entityInbound[eName] || 0;
          var net = outVol - inVol;

          // Highlight connected ribbons
          ribbonSelection.attr("fill-opacity", function(r) {
            return (r.source.index === d.index || r.target.index === d.index) ? 0.95 : 0.08;
          });

          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          var netBadge = net > 0 ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net Exporter</span>`
            : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net Importer</span>` : `<span class="tt-badge tt-badge-neutral">Balanced</span>`);

          tooltip.innerHTML = `
            <div class="tt-title">
              <span>🏛️</span> <strong>${eName}</strong>
            </div>
            <div class="tt-row"><span>Total Outbound:</span> <span class="tt-val">${formatVal(outVol)}</span></div>
            <div class="tt-row"><span>Total Inbound:</span> <span class="tt-val">${formatVal(inVol)}</span></div>
            <div class="tt-row"><span>Net Balance:</span> ${netBadge}</div>
            <div class="tt-row"><span>Total Volume:</span> <span class="tt-val">${formatVal(d.value)}</span></div>
          `;
        })
        .on("mousemove", function(e) {
          var rect = self._chartWrapper.getBoundingClientRect();
          var x = e.clientX - rect.left + 15;
          var y = e.clientY - rect.top + 15;
          tooltip.style.left = Math.min(x, rect.width - 250) + "px";
          tooltip.style.top = Math.min(y, rect.height - 110) + "px";
        })
        .on("mouseleave", function() {
          ribbonSelection.attr("fill-opacity", ribbonOpacity);
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        })
        .on("click", function(e, d) {
          var eName = entityList[d.index];
          self._pinnedEntity = (self._pinnedEntity === eName) ? null : eName;
          self.updateAsync.apply(self, self._lastArgs);
        });

      this._activeArcs = arcPaths;

      // 3. Entity Labels & Value Labels
      if (labelStyle !== "none" && dataLabelDensity !== "hidden") {
        group.append("text")
          .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
          .attr("dy", "0.35em")
          .attr("transform", function(d) {
            return `
              rotate(${(d.angle * 180 / Math.PI - 90)})
              translate(${outerRadius + 8})
              ${d.angle > Math.PI ? "rotate(180)" : ""}
            `;
          })
          .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : "start"; })
          .attr("font-size", `${baseFontSize}px`)
          .attr("font-weight", "600")
          .attr("fill", "#1e293b")
          .text(function(d) {
            var eName = entityList[d.index];
            if (dataLabelDensity === "peaks_only" && d.index > 3) return "";
            return eName;
          });
      }

      // Check pinned entity filter
      if (this._pinnedEntity) {
        var pinnedIdx = entityIndexMap[this._pinnedEntity];
        if (pinnedIdx !== undefined) {
          ribbonSelection.attr("fill-opacity", function(r) {
            return (r.source.index === pinnedIdx || r.target.index === pinnedIdx) ? 0.95 : 0.05;
          });
        }
      }
    }

    // Apply quick-search if query active
    this.applyEntityFilter();

    done();
  },

  applyEntityFilter: function() {
    var q = this._searchQuery;
    if (!this._activeRibbons) return;

    if (!q || q === "") {
      this._activeRibbons.attr("fill-opacity", parseFloat(this._lastArgs[2].ribbonOpacity) || 0.65);
      if (this._activeArcs) this._activeArcs.attr("opacity", 1.0);
      return;
    }

    var self = this;
    if (this._activeRibbons) {
      this._activeRibbons.attr("fill-opacity", function(d) {
        var sName = d.source && d.source.index !== undefined ? self._lastArgs[3].fields.dimensions[0].name : (d.source || "");
        var tName = d.target && d.target.index !== undefined ? self._lastArgs[3].fields.dimensions[0].name : (d.target || "");
        var sMatch = String(sName).toLowerCase().indexOf(q) !== -1;
        var tMatch = String(tName).toLowerCase().indexOf(q) !== -1;
        return (sMatch || tMatch) ? 0.95 : 0.05;
      });
    }
  }
});
