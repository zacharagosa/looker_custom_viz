/**
 * Sparkline Metric Matrix Table - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Modal Executive Scorecard & Matrix Table:
 * - Table Modes:
 *     1. "sparkline_matrix": In-cell trend sparklines + volume micro-bars + variance growth pills
 *     2. "heatmap_grid": Dense color-intensity heatmap matrix across pivot periods or metrics
 *     3. "compact_scorecard": Executive KPI scorecard with performance status badges and rank
 * - Dynamic Field-Role Mapping (1-based index or field name overrides)
 * - Benchmark Targets & Reference Lines (Mean, Median, Percentiles, Multipliers, Fixed, Secondary Measure)
 * - Flexible Sorting, Top-N Bucketing with 'Other' Rollup & Zero/Null Suppression
 * - Executive Scorecard HUD (Full Scorecard, Compact Strip, Hidden) & Quick Search
 * - Enterprise Palettes (Google, Executive Slate, Modern Slate, Cyberpunk, Emerald, Sunset, Wellverse, Custom Hex)
 * - Metric Polarity (Higher is Better vs Lower is Better) & Font Scaling
 * - Expanded Row Limit Support: High-density client-side pagination (10, 15, 25, 50, 100, All) for 5,000+ rows
 * - Native Looker drill-down integration
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
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
    google_enterprise: {
      name: "Google Enterprise",
      headerBg: "#f8f9fa",
      headerText: "#5f6368",
      rowHover: "rgba(232, 240, 254, 0.5)",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      sparkline: "#1a73e8",
      sparklineArea: "#e8f0fe",
      barBg: "#f1f3f4",
      barFill: "#1a73e8",
      badgePosBg: "#ceead6",
      badgePosText: "#137333",
      badgeNegBg: "#fad2cf",
      badgeNegText: "#c5221f",
      heatmapRange: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"]
    },
    executive_slate: {
      name: "Executive Slate (Classic Few)",
      headerBg: "#f8fafc",
      headerText: "#475569",
      rowHover: "rgba(255, 247, 237, 0.6)",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      sparkline: "#f5831f",
      sparklineArea: "#ffedd5",
      barBg: "#e2e8f0",
      barFill: "#ea580c",
      badgePosBg: "#dcfce7",
      badgePosText: "#15803d",
      badgeNegBg: "#fee2e2",
      badgeNegText: "#b91c1c",
      heatmapRange: ["#fff7ed", "#fed7aa", "#fb923c", "#f5831f", "#c2410c"]
    },
    modern_slate: {
      name: "Modern Slate",
      headerBg: "#f8fafc",
      headerText: "#334155",
      rowHover: "rgba(241, 245, 249, 0.7)",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      sparkline: "#2563eb",
      sparklineArea: "#dbeafe",
      barBg: "#f1f5f9",
      barFill: "#2563eb",
      badgePosBg: "#d1fae5",
      badgePosText: "#059669",
      badgeNegBg: "#ffe4e6",
      badgeNegText: "#e11d48",
      heatmapRange: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#334155", "#0f172a"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      headerBg: "#1e293b",
      headerText: "#94a3b8",
      rowHover: "rgba(51, 65, 85, 0.5)",
      border: "#334155",
      text: "#f8fafc",
      subtext: "#94a3b8",
      sparkline: "#38bdf8",
      sparklineArea: "rgba(56, 189, 248, 0.15)",
      barBg: "#334155",
      barFill: "#38bdf8",
      badgePosBg: "#064e3b",
      badgePosText: "#6ee7b7",
      badgeNegBg: "#4c0519",
      badgeNegText: "#fda4af",
      heatmapRange: ["#0f172a", "#0369a1", "#0284c7", "#38bdf8", "#bae6fd"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      headerBg: "#f0fdf4",
      headerText: "#065f46",
      rowHover: "rgba(209, 250, 229, 0.4)",
      border: "#a7f3d0",
      text: "#064e3b",
      subtext: "#047857",
      sparkline: "#059669",
      sparklineArea: "#d1fae5",
      barBg: "#dcfce7",
      barFill: "#10b981",
      badgePosBg: "#d1fae5",
      badgePosText: "#065f46",
      badgeNegBg: "#ffe4e6",
      badgeNegText: "#9f1239",
      heatmapRange: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#064e3b"]
    },
    sunset_media: {
      name: "Sunset Media",
      headerBg: "#fffbeb",
      headerText: "#9a3412",
      rowHover: "rgba(255, 237, 213, 0.6)",
      border: "#fde68a",
      text: "#431407",
      subtext: "#9a3412",
      sparkline: "#ea580c",
      sparklineArea: "#ffedd5",
      barBg: "#fed7aa",
      barFill: "#f97316",
      badgePosBg: "#d1fae5",
      badgePosText: "#059669",
      badgeNegBg: "#fee2e2",
      badgeNegText: "#dc2626",
      heatmapRange: ["#ffedd5", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      headerBg: "#F8FAFC",
      headerText: "#143359",
      rowHover: "rgba(230, 247, 239, 0.6)",
      border: "#E2E8F0",
      text: "#0F172A",
      subtext: "#64748B",
      sparkline: "#00AF68",
      sparklineArea: "#E6F7EF",
      barBg: "#EEF2F7",
      barFill: "#143359",
      badgePosBg: "#E6F7EF",
      badgePosText: "#006B40",
      badgeNegBg: "#FDECEC",
      badgeNegText: "#B42318",
      heatmapRange: ["#EEF2F7", "#CDEFDD", "#7FD8AE", "#00AF68", "#143359"]
    }
  };
  // Backwards compatibility aliases
  THEMES.zayo_corporate = THEMES.executive_slate;
  THEMES.google_vibrant = THEMES.google_enterprise;
  THEMES.emerald_growth = THEMES.emerald_finops;
  THEMES.wellverse = THEMES.wellverse_healthcare;

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
    return list[defaultIdx] || list[0];
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";

    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percentage":
      case "percent":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      case "full_number":
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "120px";
    card.style.padding = "8px 12px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : "#ffffff";
    card.style.border = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = "10.5px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = "17px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = "11px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "sparkline_matrix_table",
    label: "Sparkline Metric Matrix Table",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      tableMode: {
        type: "string",
        label: "Table Display Mode",
        display: "select",
        values: [
          { "Sparkline Matrix (Trends + Micro-Bars)": "sparkline_matrix" },
          { "Heatmap Matrix (Pivot Color Intensity)": "heatmap_grid" },
          { "Compact Scorecard (Dense Status Badges)": "compact_scorecard" }
        ],
        default: "sparkline_matrix",
        section: "Display",
        order: 1
      },
      dimFieldOverride: {
        type: "string",
        label: "Primary Group Dimension Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 2
      },
      pivotFieldOverride: {
        type: "string",
        label: "Pivot / Secondary Dimension Index or Name",
        default: "1",
        section: "Display",
        order: 3
      },
      measureFieldOverride: {
        type: "string",
        label: "Primary Metric Measure Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 4
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary / Target Measure Index or Name (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "Target Benchmark Calculation Mode",
        display: "select",
        values: [
          { "None (No Target Benchmark)": "none" },
          { "Secondary Measure Column": "second_measure" },
          { "Multiplier of Baseline (e.g. 115%)": "multiplier" },
          { "Fixed Static Target Value": "fixed" },
          { "Dataset Mean (Average per Item)": "dataset_mean" },
          { "Dataset Median (Median per Item)": "dataset_median" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 6
      },
      targetMultiplier: {
        type: "number",
        label: "Target Multiplier (when Mode is Multiplier)",
        default: 1.15,
        section: "Display",
        order: 7
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Value (when Mode is Fixed, 0 = Auto)",
        default: 0,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark / Target Reference Label",
        default: "Target Benchmark",
        section: "Display",
        order: 9
      },
      showReferenceLine: {
        type: "boolean",
        label: "Show Benchmark Target in HUD & Badges",
        default: true,
        section: "Display",
        order: 10
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Variance Anomaly Alert Threshold (%)",
        default: 25,
        section: "Display",
        order: 11
      },
      sortBy: {
        type: "string",
        label: "Sort Rows By",
        display: "select",
        values: [
          { "Default (Looker Query Order)": "none" },
          { "Metric Total Descending": "metric_desc" },
          { "Metric Total Ascending": "metric_asc" },
          { "Item Name (Alphabetical A-Z)": "name_asc" },
          { "Variance vs Target Descending": "variance_desc" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 12
      },
      topNLimit: {
        type: "number",
        label: "Top-N Rows Limit (0 = All, Max 100)",
        default: 0,
        section: "Display",
        order: 13
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into Other Rollup Summary",
        default: false,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Metric Rows",
        default: false,
        section: "Display",
        order: 15
      },
      pageSize: {
        type: "string",
        label: "Pagination Page Size (5,000+ Rows)",
        display: "select",
        values: [
          { "10 Rows per Page": "10" },
          { "15 Rows per Page": "15" },
          { "25 Rows per Page": "25" },
          { "50 Rows per Page": "50" },
          { "100 Rows per Page": "100" },
          { "All Rows (No Pagination)": "all" }
        ],
        default: "25",
        section: "Display",
        order: 16
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 17
      },
      showSparklines: {
        type: "boolean",
        label: "Show Inline Trend Sparklines",
        default: true,
        section: "Display",
        order: 18
      },
      showMicroBars: {
        type: "boolean",
        label: "Show Volume Micro Bullet Bars",
        default: true,
        section: "Display",
        order: 19
      },
      showVarianceBadge: {
        type: "boolean",
        label: "Show Period Growth / Delta Badges",
        default: true,
        section: "Display",
        order: 20
      },
      showSummaryRow: {
        type: "boolean",
        label: "Show Grand Total Summary Row",
        default: true,
        section: "Display",
        order: 21
      },
      customTitle: {
        type: "string",
        label: "Custom Table Title Override",
        default: "",
        section: "Display",
        order: 22
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 23
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Search Bar",
        default: true,
        section: "Display",
        order: 24
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Executive Slate (Classic Few)": "executive_slate" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Sparkline / Bar Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Growth Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Alert Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        display: "select",
        values: [
          { "Higher is Better (Revenue, Output, Conversion)": "higher_better" },
          { "Lower is Better (Latency, Churn, Cost, Defect)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scaling",
        display: "select",
        values: [
          { "Compact (Dense Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value & Number Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Full Currency ($1,240,000)": "full_currency" },
          { "Full Number (1,240,000)": "full_number" },
          { "Raw (Exact Database Value)": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      rowHeight: {
        type: "number",
        label: "Row Height (px)",
        default: 46,
        section: "Style",
        order: 8
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "sparkline-matrix-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "sparkline-matrix-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
      tooltip.style.backdropFilter = "blur(8px)";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
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

      var self = this;
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to display in the matrix table."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Sparkline Matrix Table requires at least 1 Dimension for row grouping (e.g. Category, Brand, State)."
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Sparkline Matrix Table requires at least 1 Measure (e.g. Total Revenue, Orders)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error("Sparkline Table render error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the matrix table."
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".sparkline-matrix-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_enterprise";
      var rawTheme = THEMES[themeKey] || THEMES.google_enterprise;
      var isDark = themeKey === "cyberpunk_dark";

      // Clone theme so custom hex overrides do not mutate static config
      var theme = Object.assign({}, rawTheme);
      if (config.customPrimaryColor) {
        theme.sparkline = config.customPrimaryColor;
        theme.barFill = config.customPrimaryColor;
      }
      if (config.customPositiveColor) {
        theme.badgePosText = config.customPositiveColor;
      }
      if (config.customNegativeColor) {
        theme.badgeNegText = config.customNegativeColor;
      }

      var isLowerBetter = config.metricPolarity === "lower_better";
      if (isLowerBetter) {
        var tempPosBg = theme.badgePosBg;
        var tempPosTxt = theme.badgePosText;
        theme.badgePosBg = theme.badgeNegBg;
        theme.badgePosText = theme.badgeNegText;
        theme.badgeNegBg = tempPosBg;
        theme.badgeNegText = tempPosTxt;
      }

      container.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
      container.style.color = theme.text;

      var fontScale = config.fontScale || "standard";
      var baseFontSize = fontScale === "compact" ? "11.5px" : fontScale === "large" ? "14px" : "12.5px";
      container.style.fontSize = baseFontSize;

      var tableMode = config.tableMode || "sparkline_matrix";
      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      // Dynamic Field-Role Resolution
      var dimField = resolveField(dims, config.dimFieldOverride, 0) || dims[0];
      var measField = resolveField(measures, config.measureFieldOverride, 0) || measures[0];
      var secondaryMeasField = resolveField(measures, config.secondaryMeasureOverride, 1);

      var pivots = queryResponse.pivots || [];
      var isPivoted = pivots.length > 1;
      var fmt = config.valueFormat || "compact_currency";

      // Extract Raw Rows
      var rawRows = [];
      var allPivotVals = [];

      data.forEach(function (row, idx) {
        var catName = row[dimField.name] ? (row[dimField.name].rendered || row[dimField.name].value) : ("Item " + (idx + 1));
        var seriesPoints = [];
        var totalVal = 0;
        var cellLinks = [];

        if (isPivoted) {
          pivots.forEach(function (p) {
            var cell = row[measField.name] ? row[measField.name][p.key] : null;
            var v = cell && cell.value !== null && !isNaN(cell.value) ? Number(cell.value) : 0;
            totalVal += v;
            seriesPoints.push({
              key: p.key,
              label: p.key,
              value: v,
              rendered: cell && cell.rendered ? cell.rendered : null
            });
            allPivotVals.push(v);
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        } else {
          measures.forEach(function (m) {
            var cell = row[m.name];
            var v = cell && cell.value !== null && !isNaN(cell.value) ? Number(cell.value) : 0;
            totalVal += v;
            seriesPoints.push({
              key: m.name,
              label: m.label_short || m.label || m.name,
              value: v,
              rendered: cell && cell.rendered ? cell.rendered : null
            });
            allPivotVals.push(v);
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        }

        var secondaryVal = 0;
        if (secondaryMeasField && row[secondaryMeasField.name]) {
          var secCell = row[secondaryMeasField.name];
          secondaryVal = secCell && secCell.value !== null && !isNaN(secCell.value) ? Number(secCell.value) : 0;
        }

        var firstVal = seriesPoints.length > 0 ? seriesPoints[0].value : 0;
        var lastVal = seriesPoints.length > 0 ? seriesPoints[seriesPoints.length - 1].value : 0;
        var delta = lastVal - firstVal;
        var deltaPct = firstVal !== 0 ? delta / Math.abs(firstVal) : 0;

        rawRows.push({
          id: idx,
          name: String(catName),
          total: totalVal,
          secondaryVal: secondaryVal,
          avg: seriesPoints.length > 0 ? totalVal / seriesPoints.length : 0,
          series: seriesPoints,
          delta: delta,
          deltaPct: deltaPct,
          links: cellLinks
        });
      });

      // Filter out Zero / Null Rows if requested
      if (config.suppressZeroNull) {
        rawRows = rawRows.filter(function (r) {
          return r.total !== 0 && !isNaN(r.total) && r.total !== null;
        });
      }

      // Calculate Target Benchmark Value
      var grandTotal = d3.sum(rawRows, function (d) { return d.total; });
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var targetVal = null;
      var targetMultiplier = Number(config.targetMultiplier) || 1.15;
      var fixedTargetValue = Number(config.fixedTargetValue) || 0;
      var rowTotals = rawRows.map(function (r) { return r.total; }).sort(function (a, b) { return a - b; });

      if (targetMode === "second_measure" && secondaryMeasField) {
        var secSum = d3.sum(rawRows, function (d) { return d.secondaryVal; });
        targetVal = rawRows.length > 0 ? secSum / rawRows.length : 0;
      } else if (targetMode === "multiplier") {
        targetVal = rawRows.length > 0 ? (grandTotal / rawRows.length) * targetMultiplier : 0;
      } else if (targetMode === "fixed") {
        targetVal = fixedTargetValue > 0 ? fixedTargetValue : (grandTotal / (rawRows.length || 1));
      } else if (targetMode === "dataset_mean") {
        targetVal = rawRows.length > 0 ? grandTotal / rawRows.length : 0;
      } else if (targetMode === "dataset_median") {
        targetVal = d3.median(rowTotals) || 0;
      } else if (targetMode === "percentile_p75") {
        targetVal = d3.quantile(rowTotals, 0.75) || 0;
      } else if (targetMode === "percentile_p90") {
        targetVal = d3.quantile(rowTotals, 0.90) || 0;
      }

      // Calculate Variance vs Target & Anomaly Alert Flags
      var anomalyThreshold = Number(config.anomalyThresholdPct) || 25;
      var anomalyCount = 0;

      rawRows.forEach(function (r) {
        if (targetVal !== null) {
          r.target = targetVal;
          r.variance = r.total - targetVal;
          r.variancePct = targetVal !== 0 ? (r.variance / targetVal) : 0;
          r.attainmentPct = targetVal !== 0 ? (r.total / targetVal) * 100 : 0;
          var breachCondition = isLowerBetter ? (r.variance > 0) : (r.variance < 0);
          r.isAnomaly = breachCondition && (Math.abs(r.variancePct) * 100 >= anomalyThreshold);
          if (r.isAnomaly) anomalyCount++;
        } else {
          r.target = null;
          r.variance = 0;
          r.variancePct = 0;
          r.attainmentPct = 100;
          r.isAnomaly = false;
        }
      });

      // Sorting Logic
      var sortBy = config.sortBy || "metric_desc";
      if (sortBy === "metric_desc") {
        rawRows.sort(function (a, b) { return b.total - a.total; });
      } else if (sortBy === "metric_asc") {
        rawRows.sort(function (a, b) { return a.total - b.total; });
      } else if (sortBy === "name_asc") {
        rawRows.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortBy === "variance_desc") {
        rawRows.sort(function (a, b) { return b.variancePct - a.variancePct; });
      }

      // Top-N with Automatic 'Other' Rollup
      var topNLimit = parseInt(config.topNLimit, 10);
      var rows = rawRows;
      if (!isNaN(topNLimit) && topNLimit > 0 && rawRows.length > topNLimit) {
        var topNRows = rawRows.slice(0, topNLimit);
        if (config.enableOtherRollup) {
          var otherRows = rawRows.slice(topNLimit);
          var otherTotal = d3.sum(otherRows, function (d) { return d.total; });
          var otherCount = otherRows.length;
          var otherSeries = [];
          if (topNRows[0] && topNRows[0].series) {
            topNRows[0].series.forEach(function (s, sIdx) {
              var sSum = d3.sum(otherRows, function (r) { return r.series[sIdx] ? r.series[sIdx].value : 0; });
              otherSeries.push({
                key: s.key,
                label: s.label,
                value: sSum,
                rendered: null
              });
            });
          }
          var oFirst = otherSeries.length > 0 ? otherSeries[0].value : 0;
          var oLast = otherSeries.length > 0 ? otherSeries[otherSeries.length - 1].value : 0;
          var oDelta = oLast - oFirst;
          var oDeltaPct = oFirst !== 0 ? oDelta / Math.abs(oFirst) : 0;

          topNRows.push({
            id: 99999,
            name: "Other (" + otherCount + " items)",
            total: otherTotal,
            secondaryVal: 0,
            avg: otherSeries.length > 0 ? otherTotal / otherSeries.length : 0,
            series: otherSeries,
            delta: oDelta,
            deltaPct: oDeltaPct,
            target: targetVal,
            variance: targetVal !== null ? otherTotal - targetVal : 0,
            variancePct: targetVal ? (otherTotal - targetVal) / targetVal : 0,
            attainmentPct: targetVal ? (otherTotal / targetVal) * 100 : 0,
            isAnomaly: false,
            links: []
          });
        }
        rows = topNRows;
      }

      // Assign ranks & percentage share
      var maxTotalVal = d3.max(rows, function (d) { return d.total; }) || 1;
      rows.forEach(function (r, rankIdx) {
        r.rank = rankIdx + 1;
        r.pctOfTotal = maxTotalVal > 0 ? (r.total / maxTotalVal) * 100 : 0;
      });

      // Optional Title & Subtitle Card
      if (config.customTitle || config.customSubtitle) {
        var titleCard = document.createElement("div");
        titleCard.style.padding = "10px 16px 4px 16px";
        if (config.customTitle) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = fontScale === "large" ? "17px" : "15px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = theme.text;
          titleEl.textContent = config.customTitle;
          titleCard.appendChild(titleEl);
        }
        if (config.customSubtitle) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = "11.5px";
          subEl.style.color = theme.subtext;
          subEl.textContent = config.customSubtitle;
          titleCard.appendChild(subEl);
        }
        container.appendChild(titleCard);
      }

      // Top Executive KPI HUD
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hudContainer = document.createElement("div");
        hudContainer.className = "matrix-hud-container";
        hudContainer.style.padding = "8px 16px";
        hudContainer.style.display = "flex";
        hudContainer.style.gap = "8px";
        hudContainer.style.flexWrap = "wrap";
        hudContainer.style.borderBottom = "1px solid " + theme.border;

        var avgTotal = rows.length > 0 ? grandTotal / rows.length : 0;
        var topRow = rows[0] || { name: "-", total: 0 };
        var topShare = grandTotal > 0 ? ((topRow.total / grandTotal) * 100).toFixed(1) + "%" : "0%";

        if (hudMode === "scorecard") {
          hudContainer.appendChild(makeHudCard(
            "Total Volume",
            formatValue(grandTotal, fmt),
            rows.length.toLocaleString() + " entities analyzed",
            theme.subtext,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            "Average Run-Rate",
            formatValue(avgTotal, fmt),
            "Mean per category",
            theme.subtext,
            theme,
            isDark
          ));

          if (targetVal !== null) {
            var attPct = targetVal > 0 ? ((avgTotal / targetVal) * 100).toFixed(1) + "%" : "100%";
            var attColor = avgTotal >= targetVal ? theme.badgePosText : theme.badgeNegText;
            hudContainer.appendChild(makeHudCard(
              config.referenceLineLabel || "Benchmark Target",
              formatValue(targetVal, fmt),
              attPct + " average attainment",
              attColor,
              theme,
              isDark
            ));
          }

          hudContainer.appendChild(makeHudCard(
            "Top Contributor",
            topRow.name,
            formatValue(topRow.total, fmt) + " (" + topShare + " share)",
            theme.subtext,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            "Variance Alerts",
            anomalyCount > 0 ? anomalyCount + " Flags" : "All Normal",
            anomalyCount > 0 ? "Breaching ±" + anomalyThreshold + "% SLA" : "Within target corridor",
            anomalyCount > 0 ? theme.badgeNegText : theme.badgePosText,
            theme,
            isDark
          ));
        } else if (hudMode === "compact_strip") {
          hudContainer.style.alignItems = "center";
          hudContainer.style.fontSize = "11.5px";
          hudContainer.style.fontWeight = "600";
          hudContainer.style.color = theme.subtext;
          hudContainer.innerHTML =
            '<span>Total: <strong style="color:' + theme.text + '">' + formatValue(grandTotal, fmt) + '</strong></span> &bull; ' +
            '<span>Avg: <strong style="color:' + theme.text + '">' + formatValue(avgTotal, fmt) + '</strong></span> &bull; ' +
            (targetVal !== null ? '<span>Target: <strong style="color:' + theme.text + '">' + formatValue(targetVal, fmt) + '</strong></span> &bull; ' : '') +
            '<span>Top: <strong style="color:' + theme.text + '">' + topRow.name + '</strong></span>' +
            (anomalyCount > 0 ? ' &bull; <span style="color:' + theme.badgeNegText + ';font-weight:700">⚠ ' + anomalyCount + ' Alerts</span>' : '');
        }

        container.appendChild(hudContainer);
      }

      // Heatmap Color Scale
      var heatmapScale = d3.scaleQuantile()
        .domain(allPivotVals.length > 0 ? allPivotVals : [0, 100])
        .range(theme.heatmapRange);

      // Top Control Bar: Search Input & High-Density Status
      var controls = document.createElement("div");
      controls.className = "matrix-controls-bar";
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.alignItems = "center";
      controls.style.padding = "8px 16px";
      controls.style.borderBottom = "1px solid " + theme.border;
      controls.style.gap = "12px";
      controls.style.flexWrap = "wrap";

      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "10px";

      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Search " + (dimField.label_short || dimField.label || "items") + "...";
      searchInput.style.padding = "6px 12px";
      searchInput.style.fontSize = "12px";
      searchInput.style.borderRadius = "6px";
      searchInput.style.border = "1px solid " + theme.border;
      searchInput.style.backgroundColor = isDark ? "#1e293b" : "#ffffff";
      searchInput.style.color = theme.text;
      searchInput.style.outline = "none";
      searchInput.style.minWidth = "220px";
      searchInput.style.display = config.showSearch !== false ? "block" : "none";
      leftControls.appendChild(searchInput);

      var summaryStats = document.createElement("div");
      summaryStats.style.fontSize = "12px";
      summaryStats.style.fontWeight = "600";
      summaryStats.style.color = theme.subtext;
      summaryStats.innerHTML = "<span><strong>" + rows.length.toLocaleString() + "</strong> items &bull; Total: <strong>" + formatValue(grandTotal, fmt) + "</strong></span>";
      if (data.length >= 100) {
        summaryStats.innerHTML += ' <span style="font-size:10.5px;padding:2px 7px;background:#e0f2fe;color:#0369a1;border-radius:10px;font-weight:700;margin-left:6px;">⚡ Expanded Row Limit</span>';
      }

      controls.appendChild(leftControls);
      controls.appendChild(summaryStats);
      container.appendChild(controls);

      // Table Container Wrapper
      var tableWrap = document.createElement("div");
      tableWrap.style.flex = "1 1 auto";
      tableWrap.style.overflowY = "auto";
      tableWrap.style.overflowX = "auto";
      container.appendChild(tableWrap);

      var table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = baseFontSize;
      tableWrap.appendChild(table);

      // Table Head Setup
      var thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.backgroundColor = theme.headerBg;
      thead.style.zIndex = "5";

      var trHead = document.createElement("tr");
      trHead.style.borderBottom = "2px solid " + theme.border;

      var currentSortKey = "total";
      var currentSortAsc = false;
      var currentPage = 1;

      // Define Columns based on Mode
      var thCols = [];
      if (tableMode === "heatmap_grid" && (isPivoted || measures.length > 1)) {
        thCols.push({ label: "#", align: "center", sortKey: "rank", width: "45px" });
        thCols.push({ label: dimField.label_short || dimField.label || "Category", align: "left", sortKey: "name" });
        var seriesSample = rows[0] ? rows[0].series : [];
        seriesSample.forEach(function (s, sIdx) {
          thCols.push({ label: s.label, align: "right", sortKey: "series_" + sIdx, isHeatmapCol: true, seriesIdx: sIdx });
        });
        thCols.push({ label: "Total", align: "right", sortKey: "total" });
        if (targetVal !== null && config.showReferenceLine !== false) {
          thCols.push({ label: "Attainment", align: "center", sortKey: "attainmentPct", width: "100px" });
        }
      } else if (tableMode === "compact_scorecard") {
        thCols.push({ label: "Rank", align: "center", sortKey: "rank", width: "60px" });
        thCols.push({ label: dimField.label_short || dimField.label || "Item", align: "left", sortKey: "name" });
        thCols.push({ label: "Performance Status", align: "center", sortKey: "deltaPct" });
        thCols.push({ label: "% Volume Share", align: "left", sortKey: "total", width: "120px" });
        thCols.push({ label: "Total " + (measField.label_short || "Metric"), align: "right", sortKey: "total" });
        if (targetVal !== null && config.showReferenceLine !== false) {
          thCols.push({ label: "Attainment", align: "center", sortKey: "attainmentPct", width: "100px" });
        }
      } else {
        // Standard Sparkline Matrix
        thCols.push({ label: dimField.label_short || dimField.label || "Category", align: "left", sortKey: "name" });
        thCols.push({ label: "Total " + (measField.label_short || "Metric"), align: "right", sortKey: "total" });
        if (config.showMicroBars !== false) {
          thCols.push({ label: "% Volume", align: "left", sortKey: "total", width: "110px" });
        }
        if (config.showSparklines !== false && (isPivoted || measures.length > 1)) {
          thCols.push({ label: isPivoted ? "Trend Timeline" : "Measure Sparkline", align: "center", sortKey: null, width: "125px" });
        }
        if (config.showVarianceBadge !== false && (isPivoted || measures.length > 1)) {
          thCols.push({ label: "Growth / Delta", align: "center", sortKey: "deltaPct", width: "95px" });
        }
        if (targetVal !== null && config.showReferenceLine !== false) {
          thCols.push({ label: "Attainment", align: "center", sortKey: "attainmentPct", width: "100px" });
        }
      }

      thCols.forEach(function (col) {
        var th = document.createElement("th");
        th.style.padding = fontScale === "compact" ? "8px 10px" : "10px 14px";
        th.style.textAlign = col.align;
        th.style.fontSize = fontScale === "compact" ? "10.5px" : "11px";
        th.style.fontWeight = "700";
        th.style.color = theme.headerText;
        th.style.textTransform = "uppercase";
        th.style.letterSpacing = "0.03em";
        th.style.whiteSpace = "nowrap";
        th.style.cursor = col.sortKey ? "pointer" : "default";
        th.style.userSelect = "none";
        if (col.width) th.style.width = col.width;

        var labelSpan = document.createElement("span");
        labelSpan.textContent = col.label;
        th.appendChild(labelSpan);

        if (col.sortKey) {
          var arrow = document.createElement("span");
          arrow.style.marginLeft = "4px";
          arrow.style.fontSize = "10px";
          arrow.style.opacity = currentSortKey === col.sortKey ? "1" : "0.3";
          arrow.textContent = currentSortKey === col.sortKey ? (currentSortAsc ? " ▲" : " ▼") : " ⇅";
          th.appendChild(arrow);

          th.addEventListener("click", function () {
            if (currentSortKey === col.sortKey) {
              currentSortAsc = !currentSortAsc;
            } else {
              currentSortKey = col.sortKey;
              currentSortAsc = false;
            }
            renderBody();
          });
        }
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");
      table.appendChild(tbody);

      // Pagination Controls Bar at the bottom
      var paginationBar = document.createElement("div");
      paginationBar.className = "matrix-pagination-bar";
      paginationBar.style.display = "flex";
      paginationBar.style.justifyContent = "space-between";
      paginationBar.style.alignItems = "center";
      paginationBar.style.padding = "8px 16px";
      paginationBar.style.borderTop = "1px solid " + theme.border;
      paginationBar.style.fontSize = "12px";
      paginationBar.style.color = theme.subtext;
      paginationBar.style.backgroundColor = isDark ? "#1e293b" : "#f8fafc";
      container.appendChild(paginationBar);

      var tooltip = this._tooltip;

      function renderBody() {
        tbody.innerHTML = "";
        var filterTerm = searchInput.value.toLowerCase().trim();

        var displayRows = rows.filter(function (r) {
          if (!filterTerm) return true;
          return r.name.toLowerCase().includes(filterTerm);
        });

        // Sorting across full dataset
        if (currentSortKey) {
          displayRows.sort(function (a, b) {
            var vA, vB;
            if (currentSortKey.startsWith("series_")) {
              var sIdx = parseInt(currentSortKey.split("_")[1], 10);
              vA = a.series[sIdx] ? a.series[sIdx].value : 0;
              vB = b.series[sIdx] ? b.series[sIdx].value : 0;
            } else {
              vA = a[currentSortKey];
              vB = b[currentSortKey];
            }
            if (typeof vA === "string") {
              return currentSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
            }
            return currentSortAsc ? (vA - vB) : (vB - vA);
          });
        }

        // Pagination calculations
        var pageSizeOption = config.pageSize || "25";
        var pageSize = pageSizeOption === "all" ? displayRows.length : parseInt(pageSizeOption, 10);
        if (isNaN(pageSize) || pageSize <= 0) pageSize = 25;

        var totalPages = Math.ceil(displayRows.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var startIdx = (currentPage - 1) * pageSize;
        var endIdx = Math.min(startIdx + pageSize, displayRows.length);
        var pageRows = displayRows.slice(startIdx, endIdx);

        // Update Pagination Controls UI
        paginationBar.innerHTML = "";
        var infoDiv = document.createElement("div");
        infoDiv.innerHTML = "Showing <strong>" + (displayRows.length === 0 ? 0 : startIdx + 1) + "</strong> - <strong>" + endIdx + "</strong> of <strong>" + displayRows.length.toLocaleString() + "</strong> rows" + (filterTerm ? " (filtered)" : "");
        paginationBar.appendChild(infoDiv);

        if (pageSizeOption !== "all" && totalPages > 1) {
          var navDiv = document.createElement("div");
          navDiv.style.display = "flex";
          navDiv.style.alignItems = "center";
          navDiv.style.gap = "6px";

          function makeNavBtn(label, disabled, onClick) {
            var btn = document.createElement("button");
            btn.innerHTML = label;
            btn.disabled = disabled;
            btn.style.padding = "3px 8px";
            btn.style.fontSize = "11.5px";
            btn.style.border = "1px solid " + theme.border;
            btn.style.borderRadius = "4px";
            btn.style.background = disabled ? "transparent" : (isDark ? "#334155" : "#ffffff");
            btn.style.color = disabled ? (isDark ? "#475569" : "#cbd5e1") : theme.text;
            btn.style.cursor = disabled ? "not-allowed" : "pointer";
            btn.addEventListener("click", onClick);
            return btn;
          }

          navDiv.appendChild(makeNavBtn("⏮ First", currentPage === 1, function () {
            currentPage = 1;
            renderBody();
          }));
          navDiv.appendChild(makeNavBtn("◀ Prev", currentPage === 1, function () {
            currentPage--;
            renderBody();
          }));

          var pageReadout = document.createElement("span");
          pageReadout.style.margin = "0 6px";
          pageReadout.style.fontWeight = "600";
          pageReadout.textContent = "Page " + currentPage + " of " + totalPages;
          navDiv.appendChild(pageReadout);

          navDiv.appendChild(makeNavBtn("Next ▶", currentPage === totalPages, function () {
            currentPage++;
            renderBody();
          }));
          navDiv.appendChild(makeNavBtn("Last ⏭", currentPage === totalPages, function () {
            currentPage = totalPages;
            renderBody();
          }));

          paginationBar.appendChild(navDiv);
        }

        // Render Current Page Rows in the DOM
        pageRows.forEach(function (row) {
          var tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid " + theme.border;
          tr.style.height = (config.rowHeight || 46) + "px";
          tr.style.cursor = "pointer";
          tr.style.transition = "background-color 0.15s ease";

          tr.addEventListener("mouseenter", function () {
            tr.style.backgroundColor = theme.rowHover;
          });
          tr.addEventListener("mouseleave", function () {
            tr.style.backgroundColor = "transparent";
            if (tooltip) tooltip.style.display = "none";
          });

          // Drill-down on click
          tr.addEventListener("click", function (event) {
            if (row.links && row.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: row.links,
                event: event
              });
            }
          });

          // Branch by tableMode
          if (tableMode === "heatmap_grid" && (isPivoted || measures.length > 1)) {
            var tdRank = document.createElement("td");
            tdRank.style.padding = "6px 10px";
            tdRank.style.textAlign = "center";
            tdRank.style.color = theme.subtext;
            tdRank.style.fontWeight = "600";
            tdRank.textContent = row.rank;
            tr.appendChild(tdRank);

            var tdName = document.createElement("td");
            tdName.style.padding = "6px 12px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            row.series.forEach(function (s) {
              var tdCell = document.createElement("td");
              tdCell.style.padding = "6px 10px";
              tdCell.style.textAlign = "right";
              tdCell.style.fontSize = "11.5px";
              tdCell.style.fontWeight = "600";

              var cellBg = heatmapScale(s.value);
              tdCell.style.backgroundColor = cellBg;
              var rgb = d3.color(cellBg);
              var lum = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) : 255;
              tdCell.style.color = lum < 140 ? "#ffffff" : "#0f172a";
              tdCell.textContent = formatValue(s.value, fmt);
              tr.appendChild(tdCell);
            });

            var tdTot = document.createElement("td");
            tdTot.style.padding = "6px 12px";
            tdTot.style.textAlign = "right";
            tdTot.style.fontWeight = "700";
            tdTot.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTot);

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAtt = document.createElement("td");
              tdAtt.style.padding = "6px 10px";
              tdAtt.style.textAlign = "center";
              var attPill = document.createElement("span");
              attPill.style.display = "inline-block";
              attPill.style.padding = "2px 7px";
              attPill.style.borderRadius = "10px";
              attPill.style.fontSize = "10.5px";
              attPill.style.fontWeight = "700";
              var isAttGood = isLowerBetter ? (row.total <= targetVal) : (row.total >= targetVal);
              attPill.style.backgroundColor = isAttGood ? theme.badgePosBg : theme.badgeNegBg;
              attPill.style.color = isAttGood ? theme.badgePosText : theme.badgeNegText;
              attPill.textContent = row.attainmentPct.toFixed(0) + "%";
              tdAtt.appendChild(attPill);
              tr.appendChild(tdAtt);
            }

          } else if (tableMode === "compact_scorecard") {
            var tdRank = document.createElement("td");
            tdRank.style.padding = "6px 10px";
            tdRank.style.textAlign = "center";
            tdRank.style.fontWeight = "700";
            tdRank.innerHTML = '<span style="display:inline-block;padding:2px 7px;border-radius:12px;background:' + (row.rank <= 3 ? "#fef3c7" : (isDark ? "#334155" : "#f1f5f9")) + ';color:' + (row.rank <= 3 ? "#b45309" : theme.subtext) + ';">#' + row.rank + '</span>';
            tr.appendChild(tdRank);

            var tdName = document.createElement("td");
            tdName.style.padding = "6px 12px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            var tdStatus = document.createElement("td");
            tdStatus.style.padding = "6px 10px";
            tdStatus.style.textAlign = "center";
            var statusPill = document.createElement("span");
            statusPill.style.display = "inline-block";
            statusPill.style.padding = "3px 10px";
            statusPill.style.borderRadius = "12px";
            statusPill.style.fontSize = "11px";
            statusPill.style.fontWeight = "600";

            var isPosDelta = row.delta >= 0;
            var isGoodDelta = isLowerBetter ? !isPosDelta : isPosDelta;

            if (row.isAnomaly) {
              statusPill.style.backgroundColor = theme.badgeNegBg;
              statusPill.style.color = theme.badgeNegText;
              statusPill.textContent = "⚠ SLA Breach (" + (row.variancePct * 100).toFixed(0) + "%)";
            } else if (isGoodDelta && Math.abs(row.deltaPct) > 0.15) {
              statusPill.style.backgroundColor = theme.badgePosBg;
              statusPill.style.color = theme.badgePosText;
              statusPill.textContent = "🚀 Top Performer (" + (row.deltaPct >= 0 ? "+" : "") + (row.deltaPct * 100).toFixed(0) + "%)";
            } else if (isGoodDelta) {
              statusPill.style.backgroundColor = theme.badgePosBg;
              statusPill.style.color = theme.badgePosText;
              statusPill.textContent = "✓ On Target (" + (row.deltaPct >= 0 ? "+" : "") + (row.deltaPct * 100).toFixed(0) + "%)";
            } else {
              statusPill.style.backgroundColor = theme.badgeNegBg;
              statusPill.style.color = theme.badgeNegText;
              statusPill.textContent = "Under Target (" + (row.deltaPct >= 0 ? "+" : "") + (row.deltaPct * 100).toFixed(0) + "%)";
            }
            tdStatus.appendChild(statusPill);
            tr.appendChild(tdStatus);

            var tdVol = document.createElement("td");
            tdVol.style.padding = "6px 12px";
            var volWrap = document.createElement("div");
            volWrap.style.display = "flex";
            volWrap.style.alignItems = "center";
            volWrap.style.gap = "6px";

            var barWrap = document.createElement("div");
            barWrap.style.flex = "1";
            barWrap.style.height = "6px";
            barWrap.style.backgroundColor = theme.barBg;
            barWrap.style.borderRadius = "3px";
            barWrap.style.overflow = "hidden";

            var barInner = document.createElement("div");
            barInner.style.width = row.pctOfTotal + "%";
            barInner.style.height = "100%";
            barInner.style.backgroundColor = theme.barFill;
            barWrap.appendChild(barInner);

            var pctText = document.createElement("span");
            pctText.style.fontSize = "10.5px";
            pctText.style.fontWeight = "600";
            pctText.style.color = theme.subtext;
            pctText.style.minWidth = "36px";
            pctText.textContent = row.pctOfTotal.toFixed(1) + "%";

            volWrap.appendChild(barWrap);
            volWrap.appendChild(pctText);
            tdVol.appendChild(volWrap);
            tr.appendChild(tdVol);

            var tdTot = document.createElement("td");
            tdTot.style.padding = "6px 12px";
            tdTot.style.textAlign = "right";
            tdTot.style.fontWeight = "700";
            tdTot.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTot);

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAtt = document.createElement("td");
              tdAtt.style.padding = "6px 10px";
              tdAtt.style.textAlign = "center";
              var attPill = document.createElement("span");
              attPill.style.display = "inline-block";
              attPill.style.padding = "2px 7px";
              attPill.style.borderRadius = "10px";
              attPill.style.fontSize = "10.5px";
              attPill.style.fontWeight = "700";
              var isAttGood = isLowerBetter ? (row.total <= targetVal) : (row.total >= targetVal);
              attPill.style.backgroundColor = isAttGood ? theme.badgePosBg : theme.badgeNegBg;
              attPill.style.color = isAttGood ? theme.badgePosText : theme.badgeNegText;
              attPill.textContent = row.attainmentPct.toFixed(0) + "%";
              tdAtt.appendChild(attPill);
              tr.appendChild(tdAtt);
            }

          } else {
            // Standard Sparkline Matrix
            var tdName = document.createElement("td");
            tdName.style.padding = "8px 14px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            var tdTotal = document.createElement("td");
            tdTotal.style.padding = "8px 14px";
            tdTotal.style.textAlign = "right";
            tdTotal.style.fontWeight = "700";
            tdTotal.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTotal);

            if (config.showMicroBars !== false) {
              var tdBar = document.createElement("td");
              tdBar.style.padding = "8px 14px";
              tdBar.style.width = "110px";

              var barPct = maxTotalVal > 0 ? (row.total / maxTotalVal) * 100 : 0;
              var barWrap = document.createElement("div");
              barWrap.style.width = "100%";
              barWrap.style.height = "7px";
              barWrap.style.backgroundColor = theme.barBg;
              barWrap.style.borderRadius = "4px";
              barWrap.style.overflow = "hidden";

              var barInner = document.createElement("div");
              barInner.style.width = barPct + "%";
              barInner.style.height = "100%";
              barInner.style.backgroundColor = theme.barFill;
              barInner.style.borderRadius = "4px";

              barWrap.appendChild(barInner);
              tdBar.appendChild(barWrap);
              tr.appendChild(tdBar);
            }

            if (config.showSparklines !== false && (isPivoted || measures.length > 1)) {
              var tdSpark = document.createElement("td");
              tdSpark.style.padding = "4px 14px";
              tdSpark.style.textAlign = "center";
              tdSpark.style.width = "125px";

              var sparkWidth = 105;
              var sparkHeight = 26;

              var svgSpark = d3.create("svg")
                .attr("width", sparkWidth)
                .attr("height", sparkHeight)
                .style("display", "inline-block")
                .style("overflow", "visible");

              var seriesVals = row.series.map(function (s) { return s.value; });
              var yMin = d3.min(seriesVals) || 0;
              var yMax = d3.max(seriesVals) || 1;
              if (yMin === yMax) { yMin -= 1; yMax += 1; }

              var xSc = d3.scaleLinear().domain([0, seriesVals.length - 1]).range([4, sparkWidth - 4]);
              var ySc = d3.scaleLinear().domain([yMin, yMax]).range([sparkHeight - 4, 4]);

              var lineGen = d3.line()
                .x(function (d, i) { return xSc(i); })
                .y(function (d) { return ySc(d); })
                .curve(d3.curveMonotoneX);

              var areaGen = d3.area()
                .x(function (d, i) { return xSc(i); })
                .y0(sparkHeight)
                .y1(function (d) { return ySc(d); })
                .curve(d3.curveMonotoneX);

              svgSpark.append("path")
                .datum(seriesVals)
                .attr("d", areaGen)
                .attr("fill", theme.sparklineArea);

              svgSpark.append("path")
                .datum(seriesVals)
                .attr("d", lineGen)
                .attr("fill", "none")
                .attr("stroke", theme.sparkline)
                .attr("stroke-width", 1.8);

              var lastIdx = seriesVals.length - 1;
              svgSpark.append("circle")
                .attr("cx", xSc(lastIdx))
                .attr("cy", ySc(seriesVals[lastIdx]))
                .attr("r", 2.5)
                .attr("fill", theme.sparkline);

              tdSpark.appendChild(svgSpark.node());
              tr.appendChild(tdSpark);
            }

            if (config.showVarianceBadge !== false && (isPivoted || measures.length > 1)) {
              var tdDelta = document.createElement("td");
              tdDelta.style.padding = "8px 14px";
              tdDelta.style.textAlign = "center";
              tdDelta.style.width = "95px";

              var isPos = row.delta >= 0;
              var isGood = isLowerBetter ? !isPos : isPos;
              var pctStr = (isPos ? "+" : "") + (row.deltaPct * 100).toFixed(1) + "%";

              var pill = document.createElement("span");
              pill.style.display = "inline-block";
              pill.style.padding = "2px 8px";
              pill.style.borderRadius = "10px";
              pill.style.fontSize = "11px";
              pill.style.fontWeight = "600";
              pill.style.backgroundColor = isGood ? theme.badgePosBg : theme.badgeNegBg;
              pill.style.color = isGood ? theme.badgePosText : theme.badgeNegText;
              pill.textContent = pctStr;

              tdDelta.appendChild(pill);
              tr.appendChild(tdDelta);
            }

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAtt = document.createElement("td");
              tdAtt.style.padding = "8px 14px";
              tdAtt.style.textAlign = "center";
              tdAtt.style.width = "100px";

              var isAttGood = isLowerBetter ? (row.total <= targetVal) : (row.total >= targetVal);
              var pill = document.createElement("span");
              pill.style.display = "inline-block";
              pill.style.padding = "2px 8px";
              pill.style.borderRadius = "10px";
              pill.style.fontSize = "11px";
              pill.style.fontWeight = "700";
              pill.style.backgroundColor = isAttGood ? theme.badgePosBg : theme.badgeNegBg;
              pill.style.color = isAttGood ? theme.badgePosText : theme.badgeNegText;
              pill.textContent = row.attainmentPct.toFixed(0) + "%";

              tdAtt.appendChild(pill);
              tr.appendChild(tdAtt);
            }
          }

          tbody.appendChild(tr);
        });

        // Summary / Grand Total Row
        if (config.showSummaryRow !== false) {
          var trTotal = document.createElement("tr");
          trTotal.style.borderTop = "2px solid " + theme.border;
          trTotal.style.borderBottom = "2px solid " + theme.border;
          trTotal.style.backgroundColor = isDark ? "#1e293b" : "#f8fafc";
          trTotal.style.fontWeight = "700";
          trTotal.style.height = (config.rowHeight || 46) + "px";

          if (tableMode === "heatmap_grid" && (isPivoted || measures.length > 1)) {
            var tdTotalRank = document.createElement("td");
            tdTotalRank.style.padding = "8px 10px";
            tdTotalRank.style.textAlign = "center";
            tdTotalRank.textContent = "Σ";
            trTotal.appendChild(tdTotalRank);

            var tdTotalLabel = document.createElement("td");
            tdTotalLabel.style.padding = "8px 12px";
            tdTotalLabel.textContent = "Grand Total (" + displayRows.length + ")";
            trTotal.appendChild(tdTotalLabel);

            if (displayRows[0] && displayRows[0].series) {
              displayRows[0].series.forEach(function (s, sIdx) {
                var sTotal = d3.sum(displayRows, function (r) { return r.series[sIdx] ? r.series[sIdx].value : 0; });
                var tdCell = document.createElement("td");
                tdCell.style.padding = "8px 10px";
                tdCell.style.textAlign = "right";
                tdCell.textContent = formatValue(sTotal, fmt);
                trTotal.appendChild(tdCell);
              });
            }

            var tdGrand = document.createElement("td");
            tdGrand.style.padding = "8px 12px";
            tdGrand.style.textAlign = "right";
            tdGrand.textContent = formatValue(d3.sum(displayRows, function (r) { return r.total; }), fmt);
            trTotal.appendChild(tdGrand);

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAttTotal = document.createElement("td");
              tdAttTotal.style.padding = "8px 10px";
              tdAttTotal.style.textAlign = "center";
              tdAttTotal.textContent = "-";
              trTotal.appendChild(tdAttTotal);
            }

          } else if (tableMode === "compact_scorecard") {
            var tdTotalRank = document.createElement("td");
            tdTotalRank.style.padding = "8px 10px";
            tdTotalRank.style.textAlign = "center";
            tdTotalRank.textContent = "Σ";
            trTotal.appendChild(tdTotalRank);

            var tdTotalLabel = document.createElement("td");
            tdTotalLabel.style.padding = "8px 12px";
            tdTotalLabel.textContent = "Grand Total (" + displayRows.length + ")";
            trTotal.appendChild(tdTotalLabel);

            var tdTotalStatus = document.createElement("td");
            tdTotalStatus.style.padding = "8px 10px";
            tdTotalStatus.style.textAlign = "center";
            tdTotalStatus.textContent = "-";
            trTotal.appendChild(tdTotalStatus);

            var tdTotalShare = document.createElement("td");
            tdTotalShare.style.padding = "8px 12px";
            tdTotalShare.textContent = "100.0%";
            trTotal.appendChild(tdTotalShare);

            var tdGrand = document.createElement("td");
            tdGrand.style.padding = "8px 12px";
            tdGrand.style.textAlign = "right";
            tdGrand.textContent = formatValue(d3.sum(displayRows, function (r) { return r.total; }), fmt);
            trTotal.appendChild(tdGrand);

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAttTotal = document.createElement("td");
              tdAttTotal.style.padding = "8px 10px";
              tdAttTotal.style.textAlign = "center";
              tdAttTotal.textContent = "-";
              trTotal.appendChild(tdAttTotal);
            }

          } else {
            var tdTotalLabel = document.createElement("td");
            tdTotalLabel.style.padding = "8px 14px";
            tdTotalLabel.textContent = "Grand Total (" + displayRows.length + ")";
            trTotal.appendChild(tdTotalLabel);

            var tdGrand = document.createElement("td");
            tdGrand.style.padding = "8px 14px";
            tdGrand.style.textAlign = "right";
            tdGrand.textContent = formatValue(d3.sum(displayRows, function (r) { return r.total; }), fmt);
            trTotal.appendChild(tdGrand);

            if (config.showMicroBars !== false) {
              var tdEmptyBar = document.createElement("td");
              tdEmptyBar.style.padding = "8px 14px";
              tdEmptyBar.textContent = "100.0%";
              trTotal.appendChild(tdEmptyBar);
            }

            if (config.showSparklines !== false && (isPivoted || measures.length > 1)) {
              var tdEmptySpark = document.createElement("td");
              tdEmptySpark.style.padding = "8px 14px";
              tdEmptySpark.style.textAlign = "center";
              tdEmptySpark.textContent = "-";
              trTotal.appendChild(tdEmptySpark);
            }

            if (config.showVarianceBadge !== false && (isPivoted || measures.length > 1)) {
              var tdEmptyDelta = document.createElement("td");
              tdEmptyDelta.style.padding = "8px 14px";
              tdEmptyDelta.style.textAlign = "center";
              tdEmptyDelta.textContent = "-";
              trTotal.appendChild(tdEmptyDelta);
            }

            if (targetVal !== null && config.showReferenceLine !== false) {
              var tdAttTotal = document.createElement("td");
              tdAttTotal.style.padding = "8px 14px";
              tdAttTotal.style.textAlign = "center";
              tdAttTotal.textContent = "-";
              trTotal.appendChild(tdAttTotal);
            }
          }

          tbody.appendChild(trTotal);
        }
      }

      searchInput.addEventListener("input", function () {
        currentPage = 1;
        renderBody();
      });

      renderBody();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
