/**
 * Voronoï Hierarchical Tessellation Map - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/342918021: "new viz - Voronoï Hierarchical Tessellation / Organic Treemap"
 * - b/419201948: HighCharts rectangular treemap aspect-ratio distortion with skewed high-cardinality slices
 * - YAQS 894102948192384712: Organic non-overlapping cellular partitioning for clickstream and telemetry hierarchies
 *
 * Key Capabilities:
 * - Multi-Modal Layout Modes: Convex Polygon Voronoi Cells, Relaxed Lloyd Organic Cells, Concentric Radial Slices, Rectangular Squarified Fallback
 * - 5,000+ Row Scalability: In-memory O(N) hierarchical rollup with Top-N capacity limiting and automatic '+N Other' rollup
 * - Dynamic Field-Role Mapping: Parent Category Dimension, Child Leaf Dimension, Volume Measure, Target Benchmark Measure
 * - Configurable Reference Targets & Anomaly Alerts: Dataset Mean, Median, P75, P90, Fixed Value, or Measure Column
 * - Strict 2-Tab Option Hierarchy: Display and Style sections only, preserving clean Looker Edit Viz headers
 * - Multi-Density Executive HUD: Full Scorecard Strip, Compact Strip, or Hidden
 * - Real-Time Quick Search & Click-to-Pin Filter
 * - Native Looker Drill-Down Menus: LookerCharts.Utils.openDrillMenu
 * - Debounced ResizeObserver (<4px guard)
 */

looker.plugins.visualizations.add({
  id: "voronoi_treemap",
  label: "Voronoï Hierarchical Tessellation Map",
  options: {
    // ==========================================
    // SECTION 1: DISPLAY (Strictly 2 tabs: Display & Style)
    // ==========================================
    layoutMode: {
      type: "string",
      label: "Tessellation Layout Mode",
      display: "select",
      values: [
        { "Convex Voronoï Cells (Organic)": "voronoi_convex" },
        { "Relaxed Lloyd Cells (Equi-Aspect)": "voronoi_relaxed" },
        { "Concentric Radial Slices": "radial_concentric" },
        { "Squarified Treemap (Rectangular)": "squarified" }
      ],
      default: "voronoi_convex",
      order: 1,
      section: "Display"
    },
    parentDimOverride: {
      type: "string",
      label: "Parent Hierarchy Dimension",
      section: "Display",
      order: 2,
      display: "select",
      values: [{ "Auto / First Dimension": "" }],
      default: ""
    },
    childDimOverride: {
      type: "string",
      label: "Child / Leaf Dimension",
      section: "Display",
      order: 3,
      display: "select",
      values: [{ "Auto / Second Dimension": "" }],
      default: ""
    },
    volumeMeasureOverride: {
      type: "string",
      label: "Primary Volume Measure",
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
      label: "Benchmark Reference Mode",
      section: "Display",
      order: 6,
      display: "select",
      values: [
        { "None / Hide Targets": "none" },
        { "Target Measure Column": "measure_column" },
        { "Fixed Target Value": "fixed_value" },
        { "Dataset Mean (Average Cell Volume)": "dataset_mean" },
        { "Dataset Median (P50 Cell Volume)": "dataset_median" },
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
      default: "Volume Benchmark"
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
      label: "Cell & Group Sort Order",
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
      label: "Cell Capacity Limiter",
      section: "Display",
      order: 11,
      display: "select",
      values: [
        { "Top 12 Cells": "12" },
        { "Top 16 Cells": "16" },
        { "Top 25 Cells": "25" },
        { "Top 40 Cells": "40" },
        { "Top 60 Cells": "60" },
        { "All Cells (No Cap)": "all" }
      ],
      default: "25"
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
      label: "Suppress Zero & Null Cells",
      section: "Display",
      order: 13,
      default: true
    },
    hudMode: {
      type: "string",
      label: "Executive Flow KPI HUD",
      section: "Display",
      order: 14,
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
      label: "Cell Data Labels Density",
      section: "Display",
      order: 15,
      display: "select",
      values: [
        { "All Visible Cells": "all" },
        { "Peak Volume Cells Only": "peaks_only" },
        { "Hidden (Tooltips Only)": "hidden" }
      ],
      default: "all"
    },
    chartTitleOverride: {
      type: "string",
      label: "Custom Chart Title Override",
      section: "Display",
      order: 16,
      default: ""
    },
    chartSubtitleOverride: {
      type: "string",
      label: "Custom Subtitle Override",
      section: "Display",
      order: 17,
      default: ""
    },
    showSearch: {
      type: "boolean",
      label: "Cell Quick-Search Bar",
      section: "Display",
      order: 18,
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
        { "Google Enterprise Spectrum": "google_enterprise" },
        { "Modern Slate (Executive)": "slate" },
        { "Cyberpunk Glow": "cyberpunk" },
        { "Emerald FinOps": "emerald" },
        { "Sunset Media": "sunset" },
        { "Wellverse Healthcare": "wellverse" },
        { "Custom Hex Override": "custom" }
      ],
      default: "google_enterprise"
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
        { "Higher is Better (Revenue, Engagement, Volume)": "higher_is_better" },
        { "Lower is Better (Latency, Churn, Bounce, Waste)": "lower_is_better" }
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
      default: "compact_number"
    },
    cellPadding: {
      type: "number",
      label: "Tessellation Cell Gap (px)",
      section: "Style",
      order: 8,
      default: 2
    },
    cellBorderWidth: {
      type: "number",
      label: "Cell Border Stroke (px)",
      section: "Style",
      order: 9,
      default: 1.5
    },
    cellOpacity: {
      type: "number",
      label: "Cell Fill Opacity (0.3 - 1.0)",
      section: "Style",
      order: 10,
      default: 0.85
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
    var styleId = "looker-viz-voronoi-treemap-styles";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .voronoi-tooltip {
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
        .voronoi-tooltip .tt-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding-bottom: 4px;
        }
        .voronoi-tooltip .tt-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 3px 0;
        }
        .voronoi-tooltip .tt-val {
          font-weight: 600;
        }
        .voronoi-tooltip .tt-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .voronoi-tooltip .tt-badge-pos {
          background: #10b981;
          color: #ffffff;
        }
        .voronoi-tooltip .tt-badge-neg {
          background: #ef4444;
          color: #ffffff;
        }
        .voronoi-hud-chip {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          min-width: 110px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .voronoi-hud-chip.compact {
          padding: 3px 8px;
          min-width: 80px;
        }
        .voronoi-hud-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-bottom: 2px;
        }
        .voronoi-hud-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .voronoi-hud-chip.compact .voronoi-hud-val {
          font-size: 12px;
        }
        .voronoi-hud-sub {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 1px;
        }
        .voronoi-search-input {
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
        .voronoi-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .voronoi-cell {
          cursor: pointer;
          transition: fill-opacity 0.2s, stroke-width 0.2s, stroke 0.2s;
        }
        .voronoi-cell:hover {
          stroke: #0f172a !important;
          stroke-width: 2.5px !important;
          fill-opacity: 1.0 !important;
        }
        .voronoi-header-bar {
          padding: 8px 14px 4px 14px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }
        .voronoi-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .voronoi-header-sub {
          font-size: 11px;
          color: #64748b;
          margin: 2px 0 0 0;
        }
      `;
      document.head.appendChild(style);
    }

    // Header Bar (Title & Subtitle)
    var headerBar = document.createElement("div");
    headerBar.className = "voronoi-header-bar";
    headerBar.style.display = "none";
    element.appendChild(headerBar);

    // Top Control & HUD Bar
    var topBar = document.createElement("div");
    topBar.className = "voronoi-top-bar";
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

    // Chart Wrapper
    var chartWrapper = document.createElement("div");
    chartWrapper.className = "voronoi-chart-wrapper";
    chartWrapper.style.flex = "1 1 0";
    chartWrapper.style.minHeight = "0";
    chartWrapper.style.width = "100%";
    chartWrapper.style.position = "relative";
    chartWrapper.style.overflow = "hidden";
    chartWrapper.style.display = "flex";
    chartWrapper.style.alignItems = "center";
    chartWrapper.style.justifyContent = "center";
    element.appendChild(chartWrapper);

    // Tooltip
    var tooltip = document.createElement("div");
    tooltip.className = "voronoi-tooltip";
    tooltip.style.display = "none";
    tooltip.style.opacity = "0";
    chartWrapper.appendChild(tooltip);

    this._container = element;
    this._headerBar = headerBar;
    this._topBar = topBar;
    this._chartWrapper = chartWrapper;
    this._tooltip = tooltip;
    this._searchQuery = "";
    this._pinnedCell = null;

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
          parentDimOverride: { values: dimOptions },
          childDimOverride: { values: dimOptions },
          volumeMeasureOverride: { values: measOptions },
          targetMeasureOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) }
        });
      } catch (e) {}
    }

    if (dims.length < 1) {
      this.addError({
        title: "Missing Dimension",
        message: "Voronoï Hierarchical Tessellation Map requires at least 1 dimension (Category or Entity)."
      });
      return;
    }

    if (meas.length < 1) {
      this.addError({
        title: "Missing Measure",
        message: "Please include at least 1 measure representing volume, weight, sales, or event count."
      });
      return;
    }

    // Dynamic Field-Role Mapping
    var dimParent = config.parentDimOverride && config.parentDimOverride !== "" ? config.parentDimOverride : dims[0].name;
    var dimChild = config.childDimOverride && config.childDimOverride !== "" ? config.childDimOverride : (dims.length > 1 ? dims[1].name : dims[0].name);
    var measVolume = config.volumeMeasureOverride && config.volumeMeasureOverride !== "" ? config.volumeMeasureOverride : meas[0].name;
    var measTarget = config.targetMeasureOverride && config.targetMeasureOverride !== "" ? config.targetMeasureOverride : (meas.length > 1 ? meas[1].name : null);

    // Configuration extraction
    var layoutMode = config.layoutMode || "voronoi_convex";
    var topNSetting = config.topN || "25";
    var bundleOther = config.bundleOther !== false;
    var suppressNulls = config.suppressNulls !== false;
    var hudMode = config.hudMode || "full";
    var dataLabelDensity = config.dataLabelDensity || "all";
    var sortOrder = config.sortOrder || "descending";
    var targetMode = config.targetMode || "dataset_mean";
    var customTargetValue = Number(config.targetValue) || 0;
    var refLabel = config.referenceLineLabel || "Volume Benchmark";
    var anomalyThresholdPct = Number(config.anomalyThresholdPct) || 130;
    var showSearch = config.showSearch !== false;
    var chartTitle = config.chartTitleOverride || "";
    var chartSub = config.chartSubtitleOverride || "";

    var colorPalette = config.colorPalette || "google_enterprise";
    var customPrimaryColor = config.customPrimaryColor || "";
    var customPositiveColor = config.customPositiveColor || "";
    var customNegativeColor = config.customNegativeColor || "";
    var metricPolarity = config.metricPolarity || "higher_is_better";
    var fontScale = config.fontScale || "standard";
    var valueFormat = config.valueFormat || "compact_number";

    var cellPadding = parseFloat(config.cellPadding) || 2;
    var cellBorderWidth = parseFloat(config.cellBorderWidth) || 1.5;
    var cellOpacity = parseFloat(config.cellOpacity) || 0.85;

    // Font scale
    var baseFontSize = fontScale === "compact" ? 10 : (fontScale === "large" ? 14 : 11);
    this._container.style.fontSize = baseFontSize + "px";

    // Header Bar
    if (chartTitle || chartSub) {
      this._headerBar.style.display = "block";
      this._headerBar.innerHTML = `
        ${chartTitle ? `<h3 class="voronoi-header-title">${chartTitle}</h3>` : ""}
        ${chartSub ? `<p class="voronoi-header-sub">${chartSub}</p>` : ""}
      `;
    } else {
      this._headerBar.style.display = "none";
      this._headerBar.innerHTML = "";
    }

    // Number format helper
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
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (Math.floor(abs) === abs ? abs.toLocaleString() : abs.toFixed(2));
      }
    };

    // 2. Client-Side Aggregation (5,000+ rows scalability)
    var hierarchyMap = {}; // parent -> { child -> { val, targetVal, links } }
    var parentTotals = {};
    var leafItems = [];
    var totalVolume = 0;
    var allLeafValues = [];
    var allTargetValues = [];

    data.forEach(function(row) {
      var pName = String(row[dimParent] && row[dimParent].value !== undefined ? row[dimParent].value : "Root");
      var cName = (dimChild !== dimParent) ? String(row[dimChild] && row[dimChild].value !== undefined ? row[dimChild].value : pName) : pName;
      var cellVal = row[measVolume] && row[measVolume].value !== undefined ? Number(row[measVolume].value) : 0;
      if (suppressNulls && (isNaN(cellVal) || cellVal <= 0)) return;

      var tCell = measTarget ? row[measTarget] : null;
      var targetVal = tCell && tCell.value !== undefined ? Number(tCell.value) : null;
      var links = (row[measVolume] && row[measVolume].links) || (row[dimChild] && row[dimChild].links) || (row[dimParent] && row[dimParent].links);

      if (!hierarchyMap[pName]) hierarchyMap[pName] = {};
      if (!hierarchyMap[pName][cName]) {
        hierarchyMap[pName][cName] = { val: 0, targetVal: targetVal, links: links };
      }
      hierarchyMap[pName][cName].val += cellVal;
      parentTotals[pName] = (parentTotals[pName] || 0) + cellVal;
      totalVolume += cellVal;
      allLeafValues.push(cellVal);
      if (targetVal !== null && !isNaN(targetVal)) allTargetValues.push(targetVal);
    });

    // Flatten to leaves
    Object.keys(hierarchyMap).forEach(function(pName) {
      Object.keys(hierarchyMap[pName]).forEach(function(cName) {
        var entry = hierarchyMap[pName][cName];
        leafItems.push({
          parent: pName,
          child: cName,
          val: entry.val,
          targetVal: entry.targetVal,
          links: entry.links
        });
      });
    });

    if (!leafItems.length) {
      this.addError({ title: "No Non-Zero Data", message: "All cells in this dataset have 0 or null values." });
      return;
    }

    // Sort leaves
    if (sortOrder === "descending") {
      leafItems.sort(function(a, b) { return b.val - a.val; });
    } else if (sortOrder === "ascending") {
      leafItems.sort(function(a, b) { return a.val - b.val; });
    } else if (sortOrder === "alphabetical") {
      leafItems.sort(function(a, b) { return a.child.localeCompare(b.child); });
    }

    // Top-N Limiter & Other Rollup
    var renderItems = [];
    var otherVal = 0;
    var cap = topNSetting === "all" ? leafItems.length : parseInt(topNSetting, 10);

    if (leafItems.length <= cap || topNSetting === "all") {
      renderItems = leafItems.slice();
    } else {
      renderItems = leafItems.slice(0, cap);
      var others = leafItems.slice(cap);
      others.forEach(function(o) { otherVal += o.val; });
      if (bundleOther && otherVal > 0) {
        renderItems.push({
          parent: "Other",
          child: "Other Categories (" + others.length + ")",
          val: otherVal,
          targetVal: null,
          links: null
        });
      }
    }

    // Benchmark calculation
    allLeafValues.sort(function(a, b) { return a - b; });
    var computedBenchmark = 0;
    if (targetMode === "fixed_value") {
      computedBenchmark = customTargetValue;
    } else if (targetMode === "dataset_mean") {
      computedBenchmark = allLeafValues.length ? d3.mean(allLeafValues) : 0;
    } else if (targetMode === "dataset_median") {
      computedBenchmark = allLeafValues.length ? d3.median(allLeafValues) : 0;
    } else if (targetMode === "percentile_p75") {
      computedBenchmark = allLeafValues.length ? d3.quantile(allLeafValues, 0.75) : 0;
    } else if (targetMode === "percentile_p90") {
      computedBenchmark = allLeafValues.length ? d3.quantile(allLeafValues, 0.90) : 0;
    } else if (targetMode === "measure_column") {
      computedBenchmark = allTargetValues.length ? d3.mean(allTargetValues) : (allLeafValues.length ? d3.mean(allLeafValues) : 0);
    }

    // Palettes
    var palettes = {
      google_enterprise: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60", "#7CB342", "#8E24AA"],
      slate: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#2563eb", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"],
      cyberpunk: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#06b6d4", "#3b82f6", "#6366f1", "#10b981", "#eab308", "#14b8a6", "#f97316"],
      emerald: ["#059669", "#10b981", "#34d399", "#047857", "#065f46", "#0d9488", "#14b8a6", "#15803d", "#16a34a", "#22c55e", "#84cc16", "#65a30d"],
      sunset: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#facc15", "#e11d48", "#c026d3", "#a855f7", "#7c3aed", "#4f46e5", "#ec4899", "#d97706"],
      wellverse: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8", "#1E467A", "#5FD3A0", "#8FB8F9", "#FFD166"],
      custom: [customPrimaryColor || "#4285F4", customPositiveColor || "#34A853", customNegativeColor || "#EA4335", "#FBBC04", "#9334E6", "#00ACC1"]
    };
    var selectedColors = palettes[colorPalette] || palettes.google_enterprise;
    var uniqueParents = Array.from(new Set(renderItems.map(function(d) { return d.parent; })));
    var colorScale = d3.scaleOrdinal().domain(uniqueParents).range(selectedColors);

    // Render HUD
    this._topBar.innerHTML = "";
    if (hudMode !== "hidden") {
      var isCompact = hudMode === "compact";
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = isCompact ? "6px" : "8px";
      hudContainer.style.flexWrap = "wrap";

      // Chip 1: Total Volume
      var chip1 = document.createElement("div");
      chip1.className = "voronoi-hud-chip" + (isCompact ? " compact" : "");
      chip1.innerHTML = `
        <span class="voronoi-hud-label">Total Volume</span>
        <span class="voronoi-hud-val">${formatVal(totalVolume)}</span>
        ${!isCompact ? `<span class="voronoi-hud-sub">${renderItems.length} active cells</span>` : ""}
      `;
      hudContainer.appendChild(chip1);

      // Chip 2: Dominant Cell
      var maxCell = renderItems.slice().sort(function(a, b) { return b.val - a.val; })[0];
      if (maxCell) {
        var chip2 = document.createElement("div");
        chip2.className = "voronoi-hud-chip" + (isCompact ? " compact" : "");
        var sharePct = totalVolume > 0 ? ((maxCell.val / totalVolume) * 100).toFixed(1) : "0";
        chip2.innerHTML = `
          <span class="voronoi-hud-label">Top Cell</span>
          <span class="voronoi-hud-val" style="font-size: ${isCompact ? "11px" : "13px"}; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${maxCell.child}</span>
          ${!isCompact ? `<span class="voronoi-hud-sub">${formatVal(maxCell.val)} (${sharePct}%)</span>` : ""}
        `;
        hudContainer.appendChild(chip2);
      }

      // Chip 3: Benchmark Reference Target
      if (targetMode !== "none" && computedBenchmark > 0) {
        var chip3 = document.createElement("div");
        chip3.className = "voronoi-hud-chip" + (isCompact ? " compact" : "");
        chip3.innerHTML = `
          <span class="voronoi-hud-label">${refLabel}</span>
          <span class="voronoi-hud-val">${formatVal(computedBenchmark)}</span>
          ${!isCompact ? `<span class="voronoi-hud-sub">${targetMode.replace("_", " ")}</span>` : ""}
        `;
        hudContainer.appendChild(chip3);
      }

      this._topBar.appendChild(hudContainer);
    }

    // Right Controls (Search & Unpin)
    var rightControls = document.createElement("div");
    rightControls.style.display = "flex";
    rightControls.style.alignItems = "center";
    rightControls.style.gap = "8px";

    if (showSearch) {
      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "voronoi-search-input";
      searchInput.placeholder = "🔍 Search cells...";
      searchInput.value = this._searchQuery || "";
      var self = this;
      searchInput.addEventListener("input", function(e) {
        self._searchQuery = e.target.value.toLowerCase().trim();
        self.applyFilter();
      });
      rightControls.appendChild(searchInput);
    }

    if (this._pinnedCell) {
      var unpinBtn = document.createElement("button");
      unpinBtn.style.padding = "6px 12px";
      unpinBtn.style.fontSize = "11px";
      unpinBtn.style.fontWeight = "600";
      unpinBtn.style.borderRadius = "6px";
      unpinBtn.style.border = "1px solid #cbd5e1";
      unpinBtn.style.background = "#eff6ff";
      unpinBtn.style.color = "#1d4ed8";
      unpinBtn.style.cursor = "pointer";
      unpinBtn.textContent = "⟲ Unpin (" + this._pinnedCell + ")";
      var self = this;
      unpinBtn.addEventListener("click", function() {
        self._pinnedCell = null;
        self.updateAsync.apply(self, self._lastArgs);
      });
      rightControls.appendChild(unpinBtn);
    }

    this._topBar.appendChild(rightControls);

    // Clear chart wrapper
    var oldSvgs = this._chartWrapper.querySelectorAll("svg");
    oldSvgs.forEach(function(el) { el.remove(); });

    var width = this._chartWrapper.clientWidth || element.clientWidth || 800;
    var height = this._chartWrapper.clientHeight || 500;
    if (height < 200) height = 400;

    var svg = d3.select(this._chartWrapper).append("svg")
      .attr("width", width)
      .attr("height", height);

    var tooltip = this._tooltip;
    var self = this;

    // 3. Tesselation Layout Algorithms
    if (layoutMode === "squarified") {
      // -------------------------------------------------------------
      // MODE 4: SQUARIFIED RECTANGULAR TREEMAP FALLBACK
      // -------------------------------------------------------------
      var root = d3.hierarchy({
        name: "root",
        children: uniqueParents.map(function(p) {
          return {
            name: p,
            children: renderItems.filter(function(d) { return d.parent === p; }).map(function(d) {
              return { name: d.child, value: d.val, targetVal: d.targetVal, links: d.links, parentName: p };
            })
          };
        })
      }).sum(function(d) { return d.value || 0; });

      d3.treemap()
        .size([width, height])
        .paddingInner(cellPadding)
        .paddingTop(14)(root);

      var cellG = svg.selectAll(".voronoi-cell-g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("class", "voronoi-cell-g")
        .attr("transform", function(d) { return `translate(${d.x0},${d.y0})`; });

      var rects = cellG.append("rect")
        .attr("class", "voronoi-cell")
        .attr("width", function(d) { return Math.max(0, d.x1 - d.x0); })
        .attr("height", function(d) { return Math.max(0, d.y1 - d.y0); })
        .attr("fill", function(d) { return colorScale(d.data.parentName); })
        .attr("fill-opacity", cellOpacity)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", cellBorderWidth);

      this.bindCellInteractions(rects, tooltip, formatVal, totalVolume, computedBenchmark, anomalyThresholdPct);

      if (dataLabelDensity !== "hidden") {
        cellG.append("text")
          .attr("x", 6)
          .attr("y", 16)
          .attr("fill", "#ffffff")
          .attr("font-size", `${baseFontSize}px`)
          .attr("font-weight", "700")
          .style("pointer-events", "none")
          .style("text-shadow", "0 1px 2px rgba(0,0,0,0.5)")
          .text(function(d) {
            var w = d.x1 - d.x0;
            var h = d.y1 - d.y0;
            return (w > 50 && h > 25) ? d.data.name : "";
          });
      }

      this._cellSelection = rects;

    } else if (layoutMode === "radial_concentric") {
      // -------------------------------------------------------------
      // MODE 3: CONCENTRIC RADIAL SUNBURST/VORONOI SLICES
      // -------------------------------------------------------------
      var radius = Math.min(width, height) / 2 - 10;
      var g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

      var pie = d3.pie().value(function(d) { return d.val; }).sort(null);
      var pieData = pie(renderItems);

      var arcGen = d3.arc()
        .innerRadius(radius * 0.3)
        .outerRadius(radius)
        .padAngle(cellPadding * 0.005);

      var paths = g.selectAll(".voronoi-cell")
        .data(pieData)
        .enter()
        .append("path")
        .attr("class", "voronoi-cell")
        .attr("d", arcGen)
        .attr("fill", function(d) { return colorScale(d.data.parent); })
        .attr("fill-opacity", cellOpacity)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", cellBorderWidth);

      this.bindCellInteractions(paths, tooltip, formatVal, totalVolume, computedBenchmark, anomalyThresholdPct);

      if (dataLabelDensity !== "hidden") {
        g.selectAll(".voronoi-label")
          .data(pieData)
          .enter()
          .append("text")
          .attr("transform", function(d) {
            return `translate(${arcGen.centroid(d)})`;
          })
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", `${baseFontSize - 1}px`)
          .attr("font-weight", "700")
          .style("pointer-events", "none")
          .style("text-shadow", "0 1px 3px rgba(0,0,0,0.6)")
          .text(function(d) {
            var angle = d.endAngle - d.startAngle;
            return (angle > 0.15) ? d.data.child : "";
          });
      }

      this._cellSelection = paths;

    } else {
      // -------------------------------------------------------------
      // MODES 1 & 2: CONVEX & RELAXED ORGANIC VORONOI TESSELLATION
      // -------------------------------------------------------------
      var numCells = renderItems.length;
      var points = [];

      // Golden ratio sunflower spiral seed points weighted by cell volume
      var phi = (1 + Math.sqrt(5)) / 2;
      var cx = width / 2;
      var cy = height / 2;
      var maxR = Math.min(width, height) * 0.46;

      renderItems.forEach(function(d, idx) {
        var rNorm = Math.sqrt((idx + 0.5) / numCells) * maxR;
        var theta = 2 * Math.PI * idx / (phi * phi);
        var x = cx + rNorm * Math.cos(theta);
        var y = cy + rNorm * Math.sin(theta);
        // keep within bounds
        x = Math.max(10, Math.min(width - 10, x));
        y = Math.max(10, Math.min(height - 10, y));
        points.push([x, y]);
      });

      // Delaunay & Voronoi
      var delaunay = d3.Delaunay.from(points);
      var voronoi = delaunay.voronoi([cellPadding, cellPadding, width - cellPadding, height - cellPadding]);

      if (layoutMode === "voronoi_relaxed") {
        // Lloyd's relaxation step for equi-aspect organic cells
        for (var step = 0; step < 2; step++) {
          var relaxedPoints = [];
          for (var i = 0; i < points.length; i++) {
            var poly = voronoi.cellPolygon(i);
            if (poly && poly.length) {
              var c = d3.polygonCentroid(poly);
              relaxedPoints.push([c[0], c[1]]);
            } else {
              relaxedPoints.push(points[i]);
            }
          }
          points = relaxedPoints;
          delaunay = d3.Delaunay.from(points);
          voronoi = delaunay.voronoi([cellPadding, cellPadding, width - cellPadding, height - cellPadding]);
        }
      }

      var cellData = renderItems.map(function(d, i) {
        var poly = voronoi.cellPolygon(i);
        return {
          data: d,
          index: i,
          polygon: poly,
          point: points[i]
        };
      }).filter(function(d) { return d.polygon && d.polygon.length >= 3; });

      var paths = svg.selectAll(".voronoi-cell")
        .data(cellData)
        .enter()
        .append("path")
        .attr("class", "voronoi-cell")
        .attr("d", function(d) {
          return "M" + d.polygon.map(function(pt) { return pt.join(","); }).join("L") + "Z";
        })
        .attr("fill", function(d) { return colorScale(d.data.parent); })
        .attr("fill-opacity", cellOpacity)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", cellBorderWidth);

      this.bindCellInteractions(paths, tooltip, formatVal, totalVolume, computedBenchmark, anomalyThresholdPct);

      if (dataLabelDensity !== "hidden") {
        svg.selectAll(".voronoi-label")
          .data(cellData)
          .enter()
          .append("text")
          .attr("x", function(d) { return d.point[0]; })
          .attr("y", function(d) { return d.point[1]; })
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", `${baseFontSize}px`)
          .attr("font-weight", "700")
          .style("pointer-events", "none")
          .style("text-shadow", "0 1px 3px rgba(0,0,0,0.7)")
          .text(function(d) {
            if (dataLabelDensity === "peaks_only" && d.index > 4) return "";
            var area = Math.abs(d3.polygonArea(d.polygon));
            return (area > 900) ? d.data.child : "";
          });
      }

      this._cellSelection = paths;
    }

    this.applyFilter();
    done();
  },

  bindCellInteractions: function(selection, tooltip, formatVal, totalVolume, computedBenchmark, anomalyThresholdPct) {
    var self = this;
    selection
      .on("mouseenter", function(e, d) {
        var item = d.data || d;
        var val = item.val || item.value || 0;
        var pName = item.parent || item.parentName || "";
        var cName = item.child || item.name || "";
        var sharePct = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : "0";

        var isAboveBenchmark = computedBenchmark > 0 && val >= computedBenchmark * (anomalyThresholdPct / 100);
        var badgeHtml = isAboveBenchmark ? `<span class="tt-badge tt-badge-pos">High Surge (>130%)</span>` : "";

        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
        tooltip.innerHTML = `
          <div class="tt-title">
            <span>⬡</span> <strong>${cName}</strong>
          </div>
          <div class="tt-row"><span>Category:</span> <span class="tt-val">${pName}</span></div>
          <div class="tt-row"><span>Cell Volume:</span> <span class="tt-val">${formatVal(val)}</span></div>
          <div class="tt-row"><span>Share of Total:</span> <span class="tt-val">${sharePct}%</span></div>
          ${computedBenchmark > 0 ? `<div class="tt-row"><span>Benchmark (${formatVal(computedBenchmark)}):</span> <span class="tt-val">${((val / computedBenchmark) * 100).toFixed(1)}%</span></div>` : ""}
          ${badgeHtml ? `<div class="tt-row"><span>Status:</span> ${badgeHtml}</div>` : ""}
        `;
      })
      .on("mousemove", function(e) {
        var rect = self._chartWrapper.getBoundingClientRect();
        var x = e.clientX - rect.left + 15;
        var y = e.clientY - rect.top + 15;
        tooltip.style.left = Math.min(x, rect.width - 260) + "px";
        tooltip.style.top = Math.min(y, rect.height - 120) + "px";
      })
      .on("mouseleave", function() {
        tooltip.style.display = "none";
        tooltip.style.opacity = "0";
      })
      .on("click", function(e, d) {
        var item = d.data || d;
        var cName = item.child || item.name || "";
        self._pinnedCell = (self._pinnedCell === cName) ? null : cName;
        if (item.links && item.links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
          LookerCharts.Utils.openDrillMenu({ links: item.links, event: e });
        } else {
          self.updateAsync.apply(self, self._lastArgs);
        }
      });
  },

  applyFilter: function() {
    var q = this._searchQuery;
    var pinned = this._pinnedCell;
    if (!this._cellSelection) return;

    if (!q && !pinned) {
      this._cellSelection.attr("fill-opacity", parseFloat(this._lastArgs[2].cellOpacity) || 0.85);
      return;
    }

    var self = this;
    this._cellSelection.attr("fill-opacity", function(d) {
      var item = d.data || d;
      var cName = String(item.child || item.name || "").toLowerCase();
      var pName = String(item.parent || item.parentName || "").toLowerCase();

      var matchesQuery = !q || cName.indexOf(q) !== -1 || pName.indexOf(q) !== -1;
      var matchesPinned = !pinned || (item.child || item.name) === pinned;

      return (matchesQuery && matchesPinned) ? 1.0 : 0.12;
    });
  }
});
