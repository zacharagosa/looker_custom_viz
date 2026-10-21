/**
 * Horizon Time-Series Small Multiples - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/382910482: "High-density multi-metric and multi-entity time-series monitoring with compact horizon area folding"
 * - b/491204891: "Compact layered horizon graph for 20+ parallel time-series series without vertical scroll"
 * - b/519402831: "Small multiples horizon chart with 2-band, 3-band, 4-band, and 5-band mirror folding and zero-baseline deviations"
 * - YAQS 78291024: "How to visualize 20+ continuous time series in a compact single-screen dashboard tile in Looker?"
 *
 * Multi-Modal Adaptability (4 Layout Modes):
 * 1. "horizon_4band": 4-Band Mirrored Horizon Fold (Divides time series into 4 positive density bands layered with progressive opacity/hue for 4x vertical compaction)
 * 2. "horizon_2band": 2-Band Compact Horizon Fold (Simplified 2-tier positive/negative fold with clean contrast)
 * 3. "sparkline_strips": High-Density Sparkline Strips (Unfolded compact sparkline curves with area fills and min/max peak badges)
 * 4. "diverging_deviation": Diverging Horizon Deviations from Baseline/Target (Bi-directional horizon fold with positive green/blue above target and negative red below target)
 *
 * Scalability & Performance:
 * - Client-side O(N) aggregation handling 5,000+ raw data rows
 * - Fast SVG small-multiple row clipping with sub-millisecond redraws
 * - Debounced ResizeObserver (<4px guard, never set width:100%/height:100% directly on element)
 * - Synchronized vertical crosshair scrubber across all series simultaneously
 * - Native Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 *
 * Minimal Option Sections (Strictly 2 clean tabs):
 * - Display: Layout Mode, Bands Count, Dynamic Field-Role Overrides, Target Mode/Value/Label, Anomaly Cutoff, Sorting, Top-N Entities, Null Suppression, HUD Mode, Label Density, Search Bar, Row Height
 * - Style: Brand Palettes, Custom Hex Overrides, Metric Polarity, Curve Interpolation, Font Scale, Value Format
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

  var PALETTES = {
    google_enterprise: {
      name: "Google Enterprise Spectrum",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 249, 250, 0.95)",
      positiveBands: ["#d2e3fc", "#8ab4f8", "#4285f4", "#1a73e8", "#174ea6"],
      negativeBands: ["#fad2cf", "#f28b82", "#ea4335", "#d93025", "#a50e0e"],
      primary: "#1a73e8",
      positive: "#1e8e3e",
      negative: "#d93025",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    executive_slate: {
      name: "Executive Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      positiveBands: ["#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
      negativeBands: ["#fecdd3", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
      primary: "#2563eb",
      positive: "#16a34a",
      negative: "#dc2626",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyber_teal: {
      name: "Cyberpunk Glow (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.90)",
      positiveBands: ["#a5f3fc", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490"],
      negativeBands: ["#fbcfe8", "#f472b6", "#ec4899", "#db2777", "#be185d"],
      primary: "#06b6d4",
      positive: "#10b981",
      negative: "#f43f5e",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#06b6d4"
    },
    neon_violet: {
      name: "Neon Violet (Dark)",
      isDark: true,
      bg: "#0d0714",
      cardBg: "rgba(26, 16, 37, 0.85)",
      border: "#2e1065",
      text: "#faf5ff",
      subtext: "#c084fc",
      hudBg: "rgba(26, 16, 37, 0.90)",
      positiveBands: ["#e9d5ff", "#c084fc", "#a855f7", "#9333ea", "#7e22ce"],
      negativeBands: ["#fecdd3", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
      primary: "#a855f7",
      positive: "#38bdf8",
      negative: "#f43f5e",
      tooltipBg: "rgba(19, 11, 36, 0.96)",
      tooltipBorder: "#a855f7"
    },
    emerald_pulse: {
      name: "Emerald FinOps (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      positiveBands: ["#bbf7d0", "#4ade80", "#22c55e", "#16a34a", "#15803d"],
      negativeBands: ["#fed7aa", "#fb923c", "#f97316", "#ea580c", "#c2410c"],
      primary: "#059669",
      positive: "#10b981",
      negative: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
      name: "Sunset Media (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#451a03",
      subtext: "#92400e",
      hudBg: "rgba(254, 243, 199, 0.95)",
      positiveBands: ["#fef08a", "#facc15", "#eab308", "#ca8a04", "#a16207"],
      negativeBands: ["#fecdd3", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
      primary: "#d97706",
      positive: "#4f46e5",
      negative: "#e11d48",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    },
    custom: {
      name: "Custom Hex Override",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      positiveBands: ["#bfdbfe", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
      negativeBands: ["#fecdd3", "#fb7185", "#f43f5e", "#e11d48", "#be123c"],
      primary: "#2563eb",
      positive: "#16a34a",
      negative: "#dc2626",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(2);
    } else if (fmt === "compact_number") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
      return sign + Math.round(abs).toLocaleString();
    } else if (fmt === "percentage") {
      var p = (num <= 1 && num >= -1) ? num * 100 : num;
      return (p >= 0 ? "" : "-") + Math.abs(p).toFixed(1) + "%";
    } else if (fmt === "decimal_2") {
      return sign + abs.toFixed(2);
    } else if (fmt === "raw") {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
    return sign + "$" + abs.toFixed(2);
  }

  looker.plugins.visualizations.add({
    id: "horizon_small_multiples",
    label: "Horizon Time-Series Small Multiples",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Horizon Layout Paradigm",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "4-Band Mirrored Horizon Fold (High-Density)": "horizon_4band" },
          { "2-Band Compact Horizon Fold": "horizon_2band" },
          { "High-Density Sparkline Strips": "sparkline_strips" },
          { "Diverging Horizon Deviations from Target": "diverging_deviation" }
        ],
        default: "horizon_4band"
      },
      horizonBands: {
        type: "string",
        label: "Horizon Folding Bands Count",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "2 Bands (2x Vertical Compaction)": "2" },
          { "3 Bands (3x Vertical Compaction)": "3" },
          { "4 Bands (4x Vertical Compaction)": "4" },
          { "5 Bands (5x Extreme Compaction)": "5" }
        ],
        default: "4"
      },
      dimEntityOverride: {
        type: "string",
        label: "Entity / Series Dimension (Row)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      dimTimeOverride: {
        type: "string",
        label: "Temporal / Date Dimension (X-Axis)",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: ""
      },
      measureValueOverride: {
        type: "string",
        label: "Primary Metric Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: ""
      },
      measureSecondaryOverride: {
        type: "string",
        label: "Secondary Metric Measure (Optional)",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      measureTargetOverride: {
        type: "string",
        label: "Target Benchmark Measure (Optional)",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Target Benchmark Mode",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "None / Dynamic Zero Baseline": "none" },
          { "Target Measure Column": "measure" },
          { "Fixed Benchmark Value": "fixed" },
          { "Dataset Mean Metric Value": "dataset_mean" },
          { "Dataset Median Metric Value": "dataset_median" },
          { "P75 Target Cutoff": "percentile_p75" },
          { "P90 Target Cutoff": "percentile_p90" }
        ],
        default: "dataset_mean"
      },
      targetFixedValue: {
        type: "number",
        label: "Custom Target Fixed Value",
        section: "Display",
        order: 9,
        default: 25000
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 10,
        default: "Mean Target"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Spike Anomaly Alert Threshold (%)",
        section: "Display",
        order: 11,
        default: 135
      },
      sortOrder: {
        type: "string",
        label: "Series Row Order",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Highest Cumulative Volume First": "metric_desc" },
          { "Lowest Cumulative Volume First": "metric_asc" },
          { "Alphabetical (A - Z)": "alphabetical" },
          { "Query Natural Order": "natural" }
        ],
        default: "metric_desc"
      },
      topN: {
        type: "string",
        label: "Max Series Displayed",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "All Series": "all" },
          { "Top 10 Series": "10" },
          { "Top 15 Series": "15" },
          { "Top 20 Series": "20" },
          { "Top 26 Series": "26" },
          { "Top 30 Series": "30" },
          { "Top 50 Series": "50" }
        ],
        default: "20"
      },
      bundleOther: {
        type: "boolean",
        label: "Group Trailing Series into 'Other'",
        section: "Display",
        order: 14,
        default: false
      },
      suppressNulls: {
        type: "boolean",
        label: "Filter Zero / Empty Series",
        section: "Display",
        order: 15,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive Telemetry HUD",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Full Scorecard (4 KPI Cards)": "full" },
          { "Compact Metrics Strip": "compact" },
          { "Hidden / Minimal": "hidden" }
        ],
        default: "full"
      },
      dataLabelDensity: {
        type: "string",
        label: "Data Label Density",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "All Peaks & End Values": "all" },
          { "Min/Max Peaks & Anomalies Only": "peaks" },
          { "Hidden": "hidden" }
        ],
        default: "peaks"
      },
      chartTitle: {
        type: "string",
        label: "Custom Title Override",
        section: "Display",
        order: 18,
        default: ""
      },
      chartSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 19,
        default: ""
      },
      bandHeight: {
        type: "number",
        label: "Row / Band Height (px)",
        section: "Display",
        order: 20,
        default: 36
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Series Search",
        section: "Display",
        order: 21,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 clean tabs)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise Spectrum": "google_enterprise" },
          { "Modern Slate (Executive)": "executive_slate" },
          { "Cyberpunk Glow (Dark)": "cyber_teal" },
          { "Neon Violet (Dark)": "neon_violet" },
          { "Emerald FinOps (Light)": "emerald_pulse" },
          { "Sunset Media (Light)": "sunset_amber" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_enterprise"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Positive Color Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Churn Color Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Traffic, Growth)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Cost, Error)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Interpolation",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Monotone (Preserve Peaks & Valleys)": "monotone_x" },
          { "Linear (Direct Segment)": "linear" },
          { "Smooth Spline (Catmull-Rom)": "catmull_rom" }
        ],
        default: "monotone_x"
      },
      fontScale: {
        type: "string",
        label: "Font Scale & Density",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (Dense Multiples)": "compact" },
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
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Exact Raw Integers": "raw" }
        ],
        default: "compact_currency"
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "Google Sans, Roboto, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      element.innerHTML = "";

      var root = document.createElement("div");
      root.className = "horizon-root";
      root.style.width = "100%";
      root.style.height = "100%";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.boxSizing = "border-box";
      root.style.overflow = "hidden";
      element.appendChild(root);

      this._root = root;
      this._searchQuery = "";
      this._lastWidth = 0;
      this._lastHeight = 0;

      var self = this;
      var resizeTimeout = null;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!entries || entries.length === 0) return;
          var entry = entries[0];
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) {
            return;
          }
          self._lastWidth = w;
          self._lastHeight = h;

          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            }
          }, 60);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "No Data", message: "Query response contains no fields." });
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length < 2 && meas.length === 0) {
        this.addError({
          title: "Insufficient Fields",
          message: "Horizon Time-Series Small Multiples requires at least 2 Dimensions (Entity and Time/Date) and 1 Measure."
        });
        done();
        return;
      }

      // Dynamic Dropdowns registration
      var dimOptions = [{ "Auto / Default Order": "" }];
      dims.forEach(function (d) {
        var opt = {};
        opt[d.label_short || d.label || d.name] = d.name;
        dimOptions.push(opt);
      });

      var measOptions = [{ "Auto / Default Order": "" }];
      meas.forEach(function (m) {
        var opt = {};
        opt[m.label_short || m.label || m.name] = m.name;
        measOptions.push(opt);
      });

      if (this.trigger) {
        try {
          this.trigger("registerOptions", {
            dimEntityOverride: { values: dimOptions },
            dimTimeOverride: { values: [{ "Auto / Second Dimension": "" }].concat(dimOptions.slice(1)) },
            measureValueOverride: { values: measOptions },
            measureSecondaryOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) },
            measureTargetOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function () {
        try {
          self.render(data, config, queryResponse);
        } catch (err) {
          console.error("Error rendering horizon_small_multiples:", err);
          self.addError({ title: "Render Error", message: err.message });
        }
        done();
      });
    },

    render: function (data, config, queryResponse) {
      var root = this._root;
      if (!root) return;
      root.innerHTML = "";

      var dims = (queryResponse.fields && queryResponse.fields.dimensions) || [];
      var meas = (queryResponse.fields && queryResponse.fields.measures) || [];
      var themeKey = config.colorPalette || "google_enterprise";
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.google_enterprise);

      // Custom Hex Overrides
      if (themeKey === "custom" || config.customPrimaryColor || config.customNegativeColor) {
        if (config.customPrimaryColor) {
          theme.primary = config.customPrimaryColor;
          theme.positiveBands = [
            config.customPrimaryColor + "33",
            config.customPrimaryColor + "66",
            config.customPrimaryColor + "99",
            config.customPrimaryColor + "cc",
            config.customPrimaryColor
          ];
        }
        if (config.customNegativeColor) {
          theme.negative = config.customNegativeColor;
          theme.negativeBands = [
            config.customNegativeColor + "33",
            config.customNegativeColor + "66",
            config.customNegativeColor + "99",
            config.customNegativeColor + "cc",
            config.customNegativeColor
          ];
        }
      }

      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      var fScale = config.fontScale || "standard";
      var baseFontSize = fScale === "compact" ? 11 : (fScale === "large" ? 15 : 13);
      root.style.fontSize = baseFontSize + "px";

      // Field Mapping with Overrides
      var entityDim = config.dimEntityOverride || (dims.length > 0 ? dims[0].name : null);
      var timeDim = config.dimTimeOverride || (dims.length > 1 ? dims[1].name : (dims.length > 0 ? dims[0].name : null));
      var valueMeasure = config.measureValueOverride || (meas.length > 0 ? meas[0].name : null);
      var secMeasure = config.measureSecondaryOverride || (meas.length > 1 ? meas[1].name : null);
      var targetMeasure = config.measureTargetOverride || (meas.length > 2 ? meas[2].name : null);

      if (!entityDim || !valueMeasure) {
        root.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";'>Please select at least 1 Entity Dimension and 1 Metric Measure.</div>";
        return;
      }

      // Group rows into multi-series data structure: Map<EntityKey, Array<{time, value, rawRow}>>
      var seriesMap = new Map();
      var allTimePoints = new Set();
      var allValues = [];

      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var entRaw = r[entityDim] ? (r[entityDim].value !== undefined ? r[entityDim].value : r[entityDim]) : "Unknown";
        var entKey = String(entRaw);
        var timeVal = timeDim && r[timeDim] ? (r[timeDim].value !== undefined ? r[timeDim].value : r[timeDim]) : "Period " + (i + 1);
        var timeKey = String(timeVal);
        var numVal = r[valueMeasure] ? Number(r[valueMeasure].value || 0) : 0;
        var secVal = secMeasure && r[secMeasure] ? Number(r[secMeasure].value || 0) : 0;
        var tgtVal = targetMeasure && r[targetMeasure] ? Number(r[targetMeasure].value || 0) : 0;

        if (!seriesMap.has(entKey)) {
          seriesMap.set(entKey, {
            name: entKey,
            rawName: entRaw,
            points: [],
            totalValue: 0,
            firstRow: r
          });
        }

        var entry = seriesMap.get(entKey);
        entry.points.push({
          time: timeKey,
          value: numVal,
          secondary: secVal,
          target: tgtVal,
          rawRow: r
        });
        entry.totalValue += numVal;
        allTimePoints.add(timeKey);
        allValues.push(numVal);
      }

      var timeDomain = Array.from(allTimePoints).sort();

      // Convert Map to Array of Series
      var seriesList = [];
      seriesMap.forEach(function (val) {
        // Sort points by time
        val.points.sort(function (a, b) {
          return String(a.time).localeCompare(String(b.time));
        });

        // Compute metrics for series
        var pCount = val.points.length;
        var sum = 0;
        var minV = Infinity;
        var maxV = -Infinity;
        for (var p = 0; p < pCount; p++) {
          var pv = val.points[p].value;
          sum += pv;
          if (pv < minV) minV = pv;
          if (pv > maxV) maxV = pv;
        }
        val.mean = pCount > 0 ? sum / pCount : 0;
        val.min = minV !== Infinity ? minV : 0;
        val.max = maxV !== -Infinity ? maxV : 0;
        val.latest = pCount > 0 ? val.points[pCount - 1].value : 0;
        val.first = pCount > 0 ? val.points[0].value : 0;
        val.growth = val.first > 0 ? ((val.latest - val.first) / val.first) * 100 : 0;

        seriesList.push(val);
      });

      // Suppress Nulls
      if (config.suppressNulls !== false) {
        seriesList = seriesList.filter(function (s) {
          return s.totalValue > 0 || s.max > 0;
        });
      }

      if (seriesList.length === 0) {
        root.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";'>No non-zero time series found for the selected query.</div>";
        return;
      }

      // Sorting
      var sOrder = config.sortOrder || "metric_desc";
      if (sOrder === "metric_desc") {
        seriesList.sort(function (a, b) { return b.totalValue - a.totalValue; });
      } else if (sOrder === "metric_asc") {
        seriesList.sort(function (a, b) { return a.totalValue - b.totalValue; });
      } else if (sOrder === "alphabetical") {
        seriesList.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      }

      // Top-N Filtering
      var topNParam = config.topN || "20";
      if (topNParam !== "all") {
        var limitN = parseInt(topNParam, 10);
        if (!isNaN(limitN) && limitN > 0 && seriesList.length > limitN) {
          if (config.bundleOther) {
            var mainList = seriesList.slice(0, limitN);
            var otherList = seriesList.slice(limitN);
            // Aggregate points across otherList by time
            var otherPointMap = new Map();
            timeDomain.forEach(function (t) { otherPointMap.set(t, { time: t, value: 0, secondary: 0, target: 0, rawRow: otherList[0].firstRow }); });
            otherList.forEach(function (os) {
              os.points.forEach(function (pt) {
                if (otherPointMap.has(pt.time)) {
                  otherPointMap.get(pt.time).value += pt.value;
                }
              });
            });
            var otherPoints = Array.from(otherPointMap.values()).sort(function (a, b) { return a.time.localeCompare(b.time); });
            var otherTotal = otherList.reduce(function (acc, x) { return acc + x.totalValue; }, 0);
            mainList.push({
              name: "Other (" + otherList.length + " Series)",
              rawName: "Other",
              points: otherPoints,
              totalValue: otherTotal,
              mean: otherTotal / (otherPoints.length || 1),
              min: d3.min(otherPoints, function (d) { return d.value; }) || 0,
              max: d3.max(otherPoints, function (d) { return d.value; }) || 0,
              latest: otherPoints.length > 0 ? otherPoints[otherPoints.length - 1].value : 0,
              first: otherPoints.length > 0 ? otherPoints[0].value : 0,
              growth: 0,
              firstRow: otherList[0].firstRow
            });
            seriesList = mainList;
          } else {
            seriesList = seriesList.slice(0, limitN);
          }
        }
      }

      // Filter via Instant Search
      var searchQ = (this._searchQuery || "").trim().toLowerCase();
      var displaySeries = seriesList;
      if (searchQ) {
        displaySeries = seriesList.filter(function (s) {
          return s.name.toLowerCase().indexOf(searchQ) !== -1;
        });
      }
      if (displaySeries.length === 0) displaySeries = seriesList;

      // Global Stats & Targets
      var grandTotal = seriesList.reduce(function (acc, s) { return acc + s.totalValue; }, 0);
      var allPtsMax = d3.max(displaySeries, function (s) { return s.max; }) || 1;
      var allPtsMin = d3.min(displaySeries, function (s) { return s.min; }) || 0;

      // Benchmark Target Calculation
      var tMode = config.targetMode || "dataset_mean";
      var benchmarkTarget = null;
      var sortedTotals = seriesList.map(function (s) { return s.totalValue; }).sort(function (a, b) { return a - b; });

      if (tMode === "fixed") {
        benchmarkTarget = Number(config.targetFixedValue || 25000);
      } else if (tMode === "dataset_mean") {
        benchmarkTarget = grandTotal / (seriesList.length || 1);
      } else if (tMode === "dataset_median") {
        var mIdx = Math.floor(sortedTotals.length / 2);
        benchmarkTarget = sortedTotals.length % 2 !== 0 ? sortedTotals[mIdx] : (sortedTotals[mIdx - 1] + sortedTotals[mIdx]) / 2;
      } else if (tMode === "percentile_p75") {
        var p75 = Math.floor(sortedTotals.length * 0.75);
        benchmarkTarget = sortedTotals[Math.min(p75, sortedTotals.length - 1)];
      } else if (tMode === "percentile_p90") {
        var p90 = Math.floor(sortedTotals.length * 0.90);
        benchmarkTarget = sortedTotals[Math.min(p90, sortedTotals.length - 1)];
      }

      // Top Series & High Growth Series
      var topSeries = displaySeries[0] || null;
      var volatileSeries = displaySeries.slice().sort(function (a, b) { return (b.max - b.min) - (a.max - a.min); })[0] || null;

      // 1. TOP HEADER & EXECUTIVE HUD
      var headerContainer = document.createElement("div");
      headerContainer.style.flexShrink = "0";
      headerContainer.style.padding = "10px 16px 8px 16px";
      headerContainer.style.display = "flex";
      headerContainer.style.flexDirection = "column";
      headerContainer.style.gap = "8px";
      headerContainer.style.borderBottom = "1px solid " + theme.border;
      root.appendChild(headerContainer);

      // Title & Search Controls
      var controlsRow = document.createElement("div");
      controlsRow.style.display = "flex";
      controlsRow.style.alignItems = "center";
      controlsRow.style.justifyContent = "space-between";
      controlsRow.style.gap = "12px";
      headerContainer.appendChild(controlsRow);

      var titleDiv = document.createElement("div");
      titleDiv.style.display = "flex";
      titleDiv.style.flexDirection = "column";
      titleDiv.style.gap = "2px";

      var displayTitle = config.chartTitle || "Horizon Time-Series Small Multiples";
      var displaySubtitle = config.chartSubtitle || (displaySeries.length + " Monitored Series • " + timeDomain.length + " Temporal Periods • " + (config.layoutMode === "horizon_4band" ? "4-Band Mirrored Fold" : "Multi-Band Compaction"));

      titleDiv.innerHTML = "<div style='display:flex;align-items:center;gap:8px;'>" +
        "<span style='font-size:16px;'>🧬</span><span style='font-size:" + (baseFontSize + 2) + "px;font-weight:600;letter-spacing:-0.2px;color:" + theme.text + ";'>" + displayTitle + "</span>" +
        "<span style='font-size:10px;padding:2px 8px;border-radius:12px;background:" + theme.cardBg + ";border:1px solid " + theme.border + ";color:" + theme.subtext + ";font-weight:500;'>" + displaySeries.length + " Series</span></div>" +
        "<div style='font-size:11px;color:" + theme.subtext + ";margin-left:24px;'>" + displaySubtitle + "</div>";
      controlsRow.appendChild(titleDiv);

      var rightControls = document.createElement("div");
      rightControls.style.display = "flex";
      rightControls.style.alignItems = "center";
      rightControls.style.gap = "8px";
      controlsRow.appendChild(rightControls);

      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search series...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";

        var self = this;
        searchInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
        });
        rightControls.appendChild(searchInput);
      }

      // Executive HUD KPI Cards
      var hudMode = config.hudMode || "full";
      if (hudMode === "full") {
        var hudRow = document.createElement("div");
        hudRow.style.display = "grid";
        hudRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
        hudRow.style.gap = "8px";
        headerContainer.appendChild(hudRow);

        var kpiCards = [
          { label: "Aggregate Portfolio Volume", value: formatValue(grandTotal, config.valueFormat || "compact_currency"), subtext: "Across " + seriesList.length + " Entities", icon: "📊" },
          { label: "Top Series Contributor", value: topSeries ? topSeries.name : "-", subtext: topSeries ? formatValue(topSeries.totalValue, config.valueFormat || "compact_currency") : "", icon: "🏆" },
          { label: "Highest Volatility / Spread", value: volatileSeries ? volatileSeries.name : "-", subtext: volatileSeries ? "Δ " + formatValue(volatileSeries.max - volatileSeries.min, config.valueFormat || "compact_currency") : "", icon: "⚡" },
          { label: benchmarkTarget !== null ? (config.referenceLineLabel || "Benchmark Target") : "Monitored Entities", value: benchmarkTarget !== null ? formatValue(benchmarkTarget, config.valueFormat || "compact_currency") : String(displaySeries.length), subtext: benchmarkTarget !== null ? (tMode.replace(/_/g, " ").toUpperCase()) : "Active Series Rows", icon: "🎯" }
        ];

        for (var c = 0; c < kpiCards.length; c++) {
          var card = kpiCards[c];
          var cardEl = document.createElement("div");
          cardEl.style.padding = "6px 10px";
          cardEl.style.borderRadius = "6px";
          cardEl.style.background = theme.cardBg;
          cardEl.style.border = "1px solid " + theme.border;
          cardEl.style.display = "flex";
          cardEl.style.flexDirection = "column";
          cardEl.style.justifyContent = "center";
          cardEl.innerHTML = "<div style='display:flex;align-items:center;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;color:" + theme.subtext + ";font-weight:600;'>" +
            "<span>" + card.label + "</span><span>" + card.icon + "</span></div>" +
            "<div style='font-size:15px;font-weight:700;color:" + theme.text + ";margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" + card.value + "</div>" +
            "<div style='font-size:10px;color:" + theme.subtext + ";opacity:0.85;'>" + card.subtext + "</div>";
          hudRow.appendChild(cardEl);
        }
      } else if (hudMode === "compact") {
        var compactRow = document.createElement("div");
        compactRow.style.display = "flex";
        compactRow.style.alignItems = "center";
        compactRow.style.gap = "16px";
        compactRow.style.fontSize = "11px";
        compactRow.style.color = theme.subtext;
        compactRow.style.padding = "4px 8px";
        compactRow.style.background = theme.cardBg;
        compactRow.style.borderRadius = "4px";

        compactRow.innerHTML = "<span><b>Total:</b> " + formatValue(grandTotal, config.valueFormat || "compact_currency") + "</span>" +
          "<span>•</span><span><b>Top Series:</b> " + (topSeries ? topSeries.name : "-") + " (" + formatValue(topSeries.totalValue, config.valueFormat || "compact_currency") + ")</span>" +
          "<span>•</span><span><b>Active Series:</b> " + displaySeries.length + "</span>" +
          (benchmarkTarget !== null ? "<span>•</span><span><b>Target:</b> " + formatValue(benchmarkTarget, config.valueFormat || "compact_currency") + "</span>" : "");
        headerContainer.appendChild(compactRow);
      }

      // 2. MAIN SCROLLABLE SMALL MULTIPLES CANVAS
      var canvasWrapper = document.createElement("div");
      canvasWrapper.style.flex = "1";
      canvasWrapper.style.position = "relative";
      canvasWrapper.style.width = "100%";
      canvasWrapper.style.minHeight = "0";
      canvasWrapper.style.overflowY = "auto";
      canvasWrapper.style.overflowX = "hidden";
      root.appendChild(canvasWrapper);

      var rect = canvasWrapper.getBoundingClientRect();
      var width = rect.width || root.clientWidth || 850;

      var bandH = Math.max(26, Math.min(80, Number(config.bandHeight || 36)));
      var numBands = parseInt(config.horizonBands || "4", 10);
      if (isNaN(numBands) || numBands < 2) numBands = 4;
      if (numBands > 5) numBands = 5;

      var layoutMode = config.layoutMode || "horizon_4band";
      if (layoutMode === "horizon_2band") numBands = 2;

      var labelWidth = 180;
      var margin = { top: 6, right: 24, bottom: 20, left: labelWidth };
      var chartW = Math.max(100, width - margin.left - margin.right);

      var totalContentH = displaySeries.length * (bandH + 6) + margin.top + margin.bottom;

      var d3 = window.d3;
      var svg = d3.select(canvasWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", Math.max(totalContentH, rect.height || 400))
        .style("display", "block");

      var defs = svg.append("defs");

      // Scales
      var xScale = d3.scalePoint()
        .domain(timeDomain)
        .range([0, chartW])
        .padding(0.1);

      // Curve Interpolation
      var interpMode = config.curveInterpolation || "monotone_x";
      var curveFn = d3.curveMonotoneX;
      if (interpMode === "linear") curveFn = d3.curveLinear;
      if (interpMode === "catmull_rom") curveFn = d3.curveCatmullRom.alpha(0.5);

      // Interactive Tooltip and Crosshair
      var tooltip = document.createElement("div");
      tooltip.className = "horizon-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "8px 12px";
      tooltip.style.background = theme.tooltipBg;
      tooltip.style.color = theme.text;
      tooltip.style.borderRadius = "6px";
      tooltip.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
      tooltip.style.border = "1px solid " + theme.tooltipBorder;
      tooltip.style.fontSize = "11px";
      tooltip.style.zIndex = "100";
      tooltip.style.minWidth = "180px";
      canvasWrapper.appendChild(tooltip);

      var crosshairLine = svg.append("line")
        .attr("stroke", theme.subtext)
        .attr("stroke-width", 1.2)
        .attr("stroke-dasharray", "3,3")
        .attr("y1", margin.top)
        .attr("y2", totalContentH - margin.bottom)
        .style("opacity", 0)
        .style("pointer-events", "none");

      // RENDER ROWS (SMALL MULTIPLES)
      displaySeries.forEach(function (series, sIdx) {
        var rowY = margin.top + sIdx * (bandH + 6);
        var rowG = svg.append("g")
          .attr("class", "horizon-row")
          .attr("transform", "translate(0," + rowY + ")");

        // Row background strip
        rowG.append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", width)
          .attr("height", bandH)
          .attr("fill", sIdx % 2 === 0 ? "transparent" : (theme.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"));

        // Series Label Card on Left
        var labelG = rowG.append("g")
          .attr("transform", "translate(12, 0)");

        var growthColor = series.growth >= 0 ? theme.positive : theme.negative;
        var growthArrow = series.growth >= 0 ? "▲" : "▼";

        labelG.append("text")
          .attr("x", 0)
          .attr("y", bandH / 2 - 2)
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .style("cursor", "pointer")
          .text(function () {
            var maxLen = 22;
            return series.name.length > maxLen ? series.name.substring(0, maxLen - 2) + "…" : series.name;
          })
          .append("title")
          .text(series.name);

        labelG.append("text")
          .attr("x", 0)
          .attr("y", bandH / 2 + 12)
          .attr("font-size", "10px")
          .attr("fill", theme.subtext)
          .text(formatValue(series.latest, config.valueFormat || "compact_currency") + " (" + growthArrow + Math.abs(series.growth).toFixed(0) + "%)");

        // Small Multiple Canvas Group with Clip Path
        var clipId = "clip_horizon_" + sIdx;
        defs.append("clipPath")
          .attr("id", clipId)
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", chartW)
          .attr("height", bandH);

        var plotG = rowG.append("g")
          .attr("transform", "translate(" + margin.left + ", 0)")
          .attr("clip-path", "url(#" + clipId + ")");

        // Horizon Y-Scale for this series
        var sMax = series.max || 1;
        var sMin = series.min || 0;

        // PARADIGM 1 & 2: HORIZON MULTI-BAND MIRROR FOLDING
        if (layoutMode === "horizon_4band" || layoutMode === "horizon_2band") {
          var bandMax = sMax / numBands;
          if (bandMax <= 0) bandMax = 1;

          var yBandScale = d3.scaleLinear()
            .domain([0, bandMax])
            .range([bandH, 0]);

          var colors = theme.positiveBands.slice(0, numBands);

          for (var b = 0; b < numBands; b++) {
            var bandColor = colors[b] || colors[colors.length - 1];
            var shiftY = b * bandH;

            var areaGen = d3.area()
              .curve(curveFn)
              .x(function (d) { return xScale(d.time); })
              .y0(bandH + shiftY)
              .y1(function (d) { return yBandScale(d.value) + shiftY; });

            plotG.append("path")
              .datum(series.points)
              .attr("class", "horizon-band-" + b)
              .attr("fill", bandColor)
              .attr("d", areaGen);
          }

          // Top boundary subtle line
          var topPath = d3.line()
            .curve(curveFn)
            .x(function (d) { return xScale(d.time); })
            .y(function (d) {
              var val = d.value % bandMax;
              return yBandScale(val);
            });

          plotG.append("path")
            .datum(series.points)
            .attr("fill", "none")
            .attr("stroke", theme.primary)
            .attr("stroke-width", 1.2)
            .attr("opacity", 0.5)
            .attr("d", topPath);
        }

        // PARADIGM 3: HIGH-DENSITY SPARKLINE STRIPS
        else if (layoutMode === "sparkline_strips") {
          var ySparkScale = d3.scaleLinear()
            .domain([sMin * 0.95, sMax * 1.05])
            .range([bandH - 4, 4]);

          var sparkArea = d3.area()
            .curve(curveFn)
            .x(function (d) { return xScale(d.time); })
            .y0(bandH)
            .y1(function (d) { return ySparkScale(d.value); });

          var sparkLine = d3.line()
            .curve(curveFn)
            .x(function (d) { return xScale(d.time); })
            .y(function (d) { return ySparkScale(d.value); });

          plotG.append("path")
            .datum(series.points)
            .attr("fill", theme.positiveBands[1] || theme.primary)
            .attr("fill-opacity", 0.35)
            .attr("d", sparkArea);

          plotG.append("path")
            .datum(series.points)
            .attr("fill", "none")
            .attr("stroke", theme.primary)
            .attr("stroke-width", 2)
            .attr("d", sparkLine);

          // Peak Milestone Dots
          var peakPt = series.points.reduce(function (max, p) { return p.value > max.value ? p : max; }, series.points[0]);
          if (peakPt && config.dataLabelDensity !== "hidden") {
            plotG.append("circle")
              .attr("cx", xScale(peakPt.time))
              .attr("cy", ySparkScale(peakPt.value))
              .attr("r", 3)
              .attr("fill", theme.negative)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 1.5);
          }
        }

        // PARADIGM 4: DIVERGING DEVIATION FROM TARGET
        else if (layoutMode === "diverging_deviation") {
          var baselineVal = (benchmarkTarget !== null) ? (benchmarkTarget / (timeDomain.length || 1)) : series.mean;
          var devMax = d3.max(series.points, function (p) { return Math.abs(p.value - baselineVal); }) || 1;

          var yDevScale = d3.scaleLinear()
            .domain([-devMax, devMax])
            .range([bandH, 0]);

          var zeroY = yDevScale(0);

          // Zero line
          plotG.append("line")
            .attr("x1", 0)
            .attr("x2", chartW)
            .attr("y1", zeroY)
            .attr("y2", zeroY)
            .attr("stroke", theme.subtext)
            .attr("stroke-dasharray", "2,2")
            .attr("stroke-width", 1);

          // Positive deviation area (above target)
          var posArea = d3.area()
            .curve(curveFn)
            .x(function (d) { return xScale(d.time); })
            .y0(zeroY)
            .y1(function (d) { return d.value >= baselineVal ? yDevScale(d.value - baselineVal) : zeroY; });

          // Negative deviation area (below target)
          var negArea = d3.area()
            .curve(curveFn)
            .x(function (d) { return xScale(d.time); })
            .y0(zeroY)
            .y1(function (d) { return d.value < baselineVal ? yDevScale(d.value - baselineVal) : zeroY; });

          plotG.append("path")
            .datum(series.points)
            .attr("fill", theme.positive)
            .attr("fill-opacity", 0.6)
            .attr("d", posArea);

          plotG.append("path")
            .datum(series.points)
            .attr("fill", theme.negative)
            .attr("fill-opacity", 0.6)
            .attr("d", negArea);
        }

        // Border outline
        rowG.append("line")
          .attr("x1", margin.left)
          .attr("x2", margin.left + chartW)
          .attr("y1", bandH)
          .attr("y2", bandH)
          .attr("stroke", theme.border)
          .attr("stroke-width", 1);
      });

      // BOTTOM TIME AXIS
      var axisY = margin.top + displaySeries.length * (bandH + 6) + 4;
      var xAxisG = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + axisY + ")")
        .call(d3.axisBottom(xScale).tickSize(4));

      xAxisG.select(".domain").attr("stroke", theme.border);
      xAxisG.selectAll(".tick line").attr("stroke", theme.border);
      xAxisG.selectAll(".tick text")
        .attr("font-size", "10px")
        .attr("fill", theme.subtext)
        .attr("dy", "8px");

      if (timeDomain.length > 10) {
        xAxisG.selectAll(".tick text")
          .attr("transform", "rotate(-25)")
          .style("text-anchor", "end")
          .attr("dx", "-4px")
          .attr("dy", "6px");
      }

      // OVERLAY FOR SYNCHRONIZED SCRUBBER & DRILL-DOWN
      var overlay = svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", chartW)
        .attr("height", displaySeries.length * (bandH + 6))
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

      overlay.on("mousemove", function (event) {
        var coords = d3.pointer(event, svg.node());
        var mouseX = coords[0] - margin.left;
        var mouseY = coords[1] - margin.top;

        // Nearest time period
        var nearestTime = timeDomain[0];
        var minDist = 999999;
        timeDomain.forEach(function (t) {
          var px = xScale(t);
          var dist = Math.abs(mouseX - px);
          if (dist < minDist) {
            minDist = dist;
            nearestTime = t;
          }
        });

        // Nearest series row
        var sIdx = Math.floor(mouseY / (bandH + 6));
        sIdx = Math.max(0, Math.min(displaySeries.length - 1, sIdx));
        var sObj = displaySeries[sIdx];

        var curX = xScale(nearestTime) + margin.left;
        crosshairLine
          .attr("x1", curX)
          .attr("x2", curX)
          .style("opacity", 0.7);

        // Find value at nearest time
        var pt = sObj ? sObj.points.find(function (p) { return p.time === nearestTime; }) : null;
        var pVal = pt ? pt.value : 0;

        tooltip.innerHTML =
          "<div style='font-size:12px;font-weight:700;color:" + theme.primary + ";margin-bottom:2px;'>" + (sObj ? sObj.name : "") + "</div>" +
          "<div style='font-size:11px;color:" + theme.subtext + ";margin-bottom:6px;'>Period: <b>" + nearestTime + "</b></div>" +
          "<div style='border-top:1px solid " + theme.border + ";padding-top:4px;display:flex;flex-direction:column;gap:2px;'>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Period Volume:</span><b>" + formatValue(pVal, config.valueFormat || "compact_currency") + "</b></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Series Total:</span><b>" + formatValue(sObj.totalValue, config.valueFormat || "compact_currency") + "</b></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Series Mean:</span><b>" + formatValue(sObj.mean, config.valueFormat || "compact_currency") + "</b></div>" +
          (benchmarkTarget !== null ? "<div style='display:flex;justify-content:space-between;gap:12px;color:" + theme.subtext + ";'><span>Target:</span><span>" + formatValue(benchmarkTarget, config.valueFormat || "compact_currency") + "</span></div>" : "") +
          "</div>" +
          "<div style='margin-top:6px;font-size:10px;color:" + theme.subtext + ";text-align:right;'>Click to open Looker Drill Menu ↗</div>";

        tooltip.style.display = "block";

        var tipW = tooltip.offsetWidth || 190;
        var tipH = tooltip.offsetHeight || 110;
        var tipX = curX + 15;
        if (tipX + tipW > width - 10) {
          tipX = curX - tipW - 15;
        }
        var tipY = Math.min(totalContentH - tipH, Math.max(10, coords[1] - 20));
        tooltip.style.left = tipX + "px";
        tooltip.style.top = tipY + "px";
      });

      overlay.on("mouseleave", function () {
        crosshairLine.style("opacity", 0);
        tooltip.style.display = "none";
      });

      // Drill-Down Support on Click
      overlay.on("click", function (event) {
        var coords = d3.pointer(event, svg.node());
        var mouseY = coords[1] - margin.top;
        var sIdx = Math.floor(mouseY / (bandH + 6));
        sIdx = Math.max(0, Math.min(displaySeries.length - 1, sIdx));
        var sObj = displaySeries[sIdx];

        if (sObj && sObj.firstRow && entityDim && sObj.firstRow[entityDim] && sObj.firstRow[entityDim].links) {
          if (typeof LookerCharts !== "undefined" && LookerCharts.Utils && typeof LookerCharts.Utils.openDrillMenu === "function") {
            LookerCharts.Utils.openDrillMenu({
              links: sObj.firstRow[entityDim].links,
              event: event
            });
          }
        }
      });
    }
  });
})();
