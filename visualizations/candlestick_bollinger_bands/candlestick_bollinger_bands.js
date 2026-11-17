/**
 * Candlestick / OHLC & Bollinger Volatility Envelope - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Looker Cloud Blockers:
 * - b/271849182 & b/315920194: Native Candlestick / OHLC chart with technical overlays (Bollinger Bands, Moving Averages, Volume bars)
 * - b/482910482: Dual-panel time series with integrated volume histogram
 *
 * Features:
 * - 4 Multi-Modal Layout Modes:
 *     1. "candlestick_bollinger": Classic Japanese Candlesticks + SMA + Bollinger Volatility Envelope
 *     2. "ohlc_bars": Traditional Western High-Low-Close tick bars
 *     3. "heikin_ashi": Noise-filtered Heikin-Ashi trend candles
 *     4. "bandwidth_oscillator": Price Envelope + Bollinger %B / Bandwidth Volatility Squeeze Oscillator panel
 * - Dynamic Field-Role Mapping (Date, Open, High, Low, Close, Volume, Target Measure) via registerOptions
 * - Configurable Benchmark Reference Lines (Measure Column, Fixed, Mean, Median, P75, P90, High, Low) & Squeeze Alerts
 * - Sorting, Top-N Windowing with Prior/Other Rollup, Zero/Null Suppression & Interactive Search/Signal Filter Bar
 * - Multi-Density Executive Scorecard HUD, Legend Strip & Peak/All Value Callouts
 * - 8 Enterprise Brand Palettes (Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps,
 *   Sunset Media, Wellverse Healthcare, Trading Pro Dark, Custom Hex) + Native Color Pickers
 * - Metric Polarity (Higher vs Lower is Better), Font Scale (Compact/Standard/Large) & Value Formatting
 * - Debounced ResizeObserver (<4px guard) & Looker Drill-Down Menus
 * - Strictly 2 configuration sections: "Display" and "Style"
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.area === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.area === "function") {
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
    google_modern: {
      name: "Google Enterprise",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#f1f3f4",
      hudBg: "#f8f9fa",
      bullish: "#0d904f",
      bearish: "#d93025",
      sma: "#1a73e8",
      upperBand: "#8ab4f8",
      lowerBand: "#8ab4f8",
      bandFill: "rgba(26, 115, 232, 0.08)",
      volumeBull: "rgba(13, 144, 79, 0.35)",
      volumeBear: "rgba(217, 48, 37, 0.35)",
      crosshair: "#5f6368",
      isDark: false
    },
    modern_slate: {
      name: "Modern Slate",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      hudBg: "#f8fafc",
      bullish: "#0f766e",
      bearish: "#e11d48",
      sma: "#2563eb",
      upperBand: "#94a3b8",
      lowerBand: "#94a3b8",
      bandFill: "rgba(37, 99, 235, 0.08)",
      volumeBull: "rgba(15, 118, 110, 0.35)",
      volumeBear: "rgba(225, 29, 72, 0.35)",
      crosshair: "#64748b",
      isDark: false
    },
    cyberpunk_neon: {
      name: "Cyberpunk Dark",
      bg: "#09090b",
      text: "#fafafa",
      subtext: "#a1a1aa",
      border: "#27272a",
      grid: "#18181b",
      hudBg: "#18181b",
      bullish: "#10b981",
      bearish: "#f43f5e",
      sma: "#38bdf8",
      upperBand: "#a855f7",
      lowerBand: "#a855f7",
      bandFill: "rgba(168, 85, 247, 0.14)",
      volumeBull: "rgba(16, 185, 129, 0.4)",
      volumeBear: "rgba(244, 63, 94, 0.4)",
      crosshair: "#a1a1aa",
      isDark: true
    },
    emerald_bull: {
      name: "Emerald FinOps",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#ecfdf5",
      hudBg: "#f0fdf4",
      bullish: "#059669",
      bearish: "#dc2626",
      sma: "#0284c7",
      upperBand: "#34d399",
      lowerBand: "#34d399",
      bandFill: "rgba(16, 185, 129, 0.09)",
      volumeBull: "rgba(5, 150, 105, 0.35)",
      volumeBear: "rgba(220, 38, 38, 0.35)",
      crosshair: "#047857",
      isDark: false
    },
    sunset_media: {
      name: "Sunset Media",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#fff7ed",
      hudBg: "#fffbeb",
      bullish: "#059669",
      bearish: "#e11d48",
      sma: "#ea580c",
      upperBand: "#fb923c",
      lowerBand: " #fb923c",
      bandFill: "rgba(234, 88, 12, 0.10)",
      volumeBull: "rgba(5, 150, 105, 0.35)",
      volumeBear: "rgba(225, 29, 72, 0.35)",
      crosshair: "#9a3412",
      isDark: false
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#475569",
      border: "#cbd5e1",
      grid: "#f0f9ff",
      hudBg: "#f8fafc",
      bullish: "#00af68",
      bearish: "#b42318",
      sma: "#143359",
      upperBand: "#0284c7",
      lowerBand: "#0284c7",
      bandFill: "rgba(2, 132, 199, 0.09)",
      volumeBull: "rgba(0, 175, 104, 0.35)",
      volumeBear: "rgba(180, 35, 24, 0.35)",
      crosshair: "#475569",
      isDark: false
    },
    trading_pro_dark: {
      name: "Trading Pro Dark",
      bg: "#0b0e14",
      text: "#f0f6fc",
      subtext: "#8b949e",
      border: "#30363d",
      grid: "#161b22",
      hudBg: "#161b22",
      bullish: "#26a69a",
      bearish: "#ef5350",
      sma: "#f59e0b",
      upperBand: "#38bdf8",
      lowerBand: "#38bdf8",
      bandFill: "rgba(56, 189, 248, 0.12)",
      volumeBull: "rgba(38, 166, 154, 0.4)",
      volumeBear: "rgba(239, 83, 80, 0.4)",
      crosshair: "#8b949e",
      isDark: true
    }
  };

  PALETTES.monochrome_slate = PALETTES.modern_slate;
  PALETTES.custom = PALETTES.google_modern;

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string") return "rgba(26, 115, 232, " + alpha + ")";
    var h = hex.replace("#", "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return hex;
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
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
    if (defaultIdx < 0 || defaultIdx >= list.length) return null;
    return list[defaultIdx] || null;
  }

  function computePercentile(sortedArr, p) {
    if (!sortedArr || sortedArr.length === 0) return null;
    if (sortedArr.length === 1) return sortedArr[0];
    var idx = (sortedArr.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
  }

  function formatPrice(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(abs < 10 ? 2 : 0);
    }
    if (fmt === "compact_number") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + (abs >= 100 ? Math.round(abs).toLocaleString() : abs.toFixed(2));
    }
    if (fmt === "percentage") {
      var p = (abs <= 1.5) ? num * 100 : num;
      return p.toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return sign + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === "raw") {
      return String(num);
    }
    if (fmt === "auto") {
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    // currency_precise (default)
    return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  function formatVolume(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    if (abs >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return String(Math.round(num));
  }

  looker.plugins.visualizations.add({
    id: "candlestick_bollinger_bands",
    label: "Candlestick / OHLC & Bollinger Volatility Envelope",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Candlestick & Bollinger Volatility Envelope": "candlestick_bollinger" },
          { "Western OHLC Tick Bars": "ohlc_bars" },
          { "Heikin-Ashi Smoothed Trend Candles": "heikin_ashi" },
          { "Bandwidth %B Volatility Squeeze Oscillator": "bandwidth_oscillator" }
        ],
        default: "candlestick_bollinger"
      },
      dateDimOverride: {
        type: "string",
        label: "Trading Date / Period Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      openMeasOverride: {
        type: "string",
        label: "Open Price Measure",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      highMeasOverride: {
        type: "string",
        label: "High Price Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      lowMeasOverride: {
        type: "string",
        label: "Low Price Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      closeMeasOverride: {
        type: "string",
        label: "Close Price Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      volumeMeasOverride: {
        type: "string",
        label: "Trading Volume Measure (Optional)",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Comparison / Target Benchmark Measure (Optional)",
        section: "Display",
        order: 8,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      bollingerPeriod: {
        type: "string",
        label: "Bollinger SMA Moving Average Period",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "10 Periods (Short-Term Momentum)": "10" },
          { "14 Periods (Active Swing)": "14" },
          { "20 Periods (Industry Standard Default)": "20" },
          { "30 Periods (Intermediate)": "30" },
          { "50 Periods (Long-Term Institutional)": "50" }
        ],
        default: "20"
      },
      bollingerStdDev: {
        type: "string",
        label: "Bollinger Standard Deviation Multiplier",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "1.5 Standard Deviations (87% Containment)": "1.5" },
          { "2.0 Standard Deviations (95% Default)": "2.0" },
          { "2.5 Standard Deviations (98.8% Conservative)": "2.5" },
          { "3.0 Standard Deviations (99.7% Extreme Outliers)": "3.0" }
        ],
        default: "2.0"
      },
      showMovingAverage: {
        type: "boolean",
        label: "Show Center SMA Moving Average Line",
        section: "Display",
        order: 11,
        default: true
      },
      showBollingerEnvelope: {
        type: "boolean",
        label: "Show Bollinger Volatility Ribbon & Bands",
        section: "Display",
        order: 12,
        default: true
      },
      showVolumeSubchart: {
        type: "boolean",
        label: "Show Volume Histogram Sub-Chart",
        section: "Display",
        order: 13,
        default: true
      },
      targetMode: {
        type: "string",
        label: "Benchmark Reference Line Mode",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "Dataset Mean (Period Average)": "dataset_mean" },
          { "Dataset Median (P50 Close)": "dataset_median" },
          { "Percentile P75 (Upper Quartile)": "percentile_p75" },
          { "Percentile P90 (Top Decile)": "percentile_p90" },
          { "Target Measure Column": "measure_column" },
          { "Period High (Resistance Level)": "period_high" },
          { "Period Low (Support Level)": "period_low" },
          { "Custom Fixed Benchmark Value": "fixed_value" },
          { "None / Hide Target Line": "none" }
        ],
        default: "dataset_mean"
      },
      targetValue: {
        type: "number",
        label: "Custom Fixed Target Value",
        section: "Display",
        order: 15,
        default: 0
      },
      targetLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        section: "Display",
        order: 16,
        default: "Benchmark Mean"
      },
      anomalyAlertThreshold: {
        type: "number",
        label: "Volatility Squeeze Alert Threshold (% Bandwidth)",
        section: "Display",
        order: 17,
        default: 15
      },
      sortBy: {
        type: "string",
        label: "Sort Candles / Periods By",
        section: "Display",
        order: 18,
        display: "select",
        values: [
          { "Chronological Ascending (Natural Flow)": "chronological_asc" },
          { "Chronological Descending (Latest First)": "chronological_desc" },
          { "Close Price Descending": "metric_desc" },
          { "Close Price Ascending": "metric_asc" },
          { "Alphabetical Label": "alpha_asc" }
        ],
        default: "chronological_asc"
      },
      topNLimit: {
        type: "number",
        label: "Top-N Candles Window Limit (0 = All)",
        section: "Display",
        order: 19,
        default: 0
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Show Excluded / Prior Periods Summary Rollup",
        section: "Display",
        order: 20,
        default: true
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero & Null OHLC Rows",
        section: "Display",
        order: 21,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        section: "Display",
        order: 22,
        display: "select",
        values: [
          { "Full Scorecard": "full" },
          { "Compact Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Data Value Callouts Density",
        section: "Display",
        order: 23,
        display: "select",
        values: [
          { "All Key Callouts (High, Low, Latest, Squeeze)": "all" },
          { "Min/Max Peaks Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only"
      },
      showLegend: {
        type: "boolean",
        label: "Show Overlay Legend Strip",
        section: "Display",
        order: 24,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Date & Signal Filter Bar",
        section: "Display",
        order: 25,
        default: true
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 26,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 27,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Color Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise": "google_modern" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_neon" },
          { "Emerald FinOps": "emerald_bull" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Trading Pro Dark": "trading_pro_dark" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_modern"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / SMA Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      bullishColor: {
        type: "string",
        label: "Custom Positive / Bullish Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      bearishColor: {
        type: "string",
        label: "Custom Negative / Bearish Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: ""
      },
      bollingerBandColor: {
        type: "string",
        label: "Custom Bollinger Envelope Hex",
        section: "Style",
        order: 5,
        display: "color",
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Higher is Better (Asset Appreciation / Margin)": "higher_is_better" },
          { "Lower is Better (Cost / Latency / Risk Spread)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Compact": "compact" },
          { "Standard": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Value Format",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Precise Currency ($1.4500)": "currency_precise" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "currency_precise"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dateDimOverride: { role: "dimension", defaultIdx: 0 },
        openMeasOverride: { role: "measure", defaultIdx: 0 },
        highMeasOverride: { role: "measure", defaultIdx: 1 },
        lowMeasOverride: { role: "measure", defaultIdx: 2 },
        closeMeasOverride: { role: "measure", defaultIdx: 3 },
        volumeMeasOverride: { role: "measure", defaultIdx: 4 },
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
        newOptions[key].values = values;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (err) {}
    },

    create: function (element, config) {
      this._element = element;
      this._searchText = "";
      this._signalFilter = "ALL";
      element.innerHTML = "";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";

      var container = document.createElement("div");
      container.className = "candlestick-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}
      this._registerDynamicFieldOptions(queryResponse);
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!data || data.length === 0) {
        if (this.addError) this.addError({ title: "No Data", message: "The query returned no data to render." });
        done();
        return;
      }

      var fields = (queryResponse && queryResponse.fields) || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (dims.length === 0) {
        if (this.addError) this.addError({ title: "Date Dimension Required", message: "Candlestick visualization requires 1 Date/Time dimension (e.g. trading_date)." });
        done();
        return;
      }
      if (meas.length < 3) {
        if (this.addError) this.addError({ title: "Price Measures Required", message: "Candlestick visualization requires at least 3 numeric measures (Open, High, Low, Close)." });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          var container = element.querySelector(".candlestick-root-container");
          if (!container) {
            element.innerHTML = "";
            container = document.createElement("div");
            container.className = "candlestick-root-container";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.boxSizing = "border-box";
            container.style.overflow = "hidden";
            element.appendChild(container);
          }
          container.innerHTML = "";

          // Resolve Palette & Custom Hex Overrides
          var pKey = config.colorPalette || "google_modern";
          var theme = Object.assign({}, PALETTES[pKey] || PALETTES.google_modern);
          if (config.customPrimaryColor) theme.sma = config.customPrimaryColor;
          if (config.bullishColor) {
            theme.bullish = config.bullishColor;
            theme.volumeBull = hexToRgba(config.bullishColor, 0.35);
          }
          if (config.bearishColor) {
            theme.bearish = config.bearishColor;
            theme.volumeBear = hexToRgba(config.bearishColor, 0.35);
          }
          if (config.bollingerBandColor) {
            theme.upperBand = config.bollingerBandColor;
            theme.lowerBand = config.bollingerBandColor;
            theme.bandFill = hexToRgba(config.bollingerBandColor, 0.12);
          }

          var polarity = config.metricPolarity || "higher_is_better";
          var posColor = polarity === "lower_is_better" ? theme.bearish : theme.bullish;
          var negColor = polarity === "lower_is_better" ? theme.bullish : theme.bearish;

          var fScaleKey = config.fontScale || (config.fontSize === "spacious" ? "large" : config.fontSize) || "standard";
          var fMult = fScaleKey === "compact" ? 0.88 : (fScaleKey === "large" ? 1.18 : 1.0);

          var layoutMode = config.layoutMode || "candlestick_bollinger";
          var showSMA = config.showMovingAverage !== false;
          var showBollinger = config.showBollingerEnvelope !== false;
          var showVolume = config.showVolumeSubchart !== false;
          var hudMode = config.hudMode || "full";
          var labelDensity = config.labelDensity || "peaks_only";
          var showLegend = config.showLegend !== false;
          var showSearch = config.showSearch !== false;
          var suppressNulls = config.suppressNulls !== false;
          var valFormat = config.valueFormat || "currency_precise";
          var chartTitle = config.chartTitleOverride || "";
          var chartSubtitle = config.chartSubtitleOverride || "";

          // Resolve Field Roles
          var dateDim = resolveField(dims, config.dateDimOverride, 0);
          var openMeas = resolveField(meas, config.openMeasOverride, 0);
          var highMeas = resolveField(meas, config.highMeasOverride, Math.min(1, meas.length - 1));
          var lowMeas = resolveField(meas, config.lowMeasOverride, Math.min(2, meas.length - 1));
          var closeMeas = resolveField(meas, config.closeMeasOverride, meas.length > 3 ? 3 : Math.min(1, meas.length - 1));
          var volumeMeas = config.volumeMeasOverride ? resolveField(meas, config.volumeMeasOverride, -1) : (meas.length > 4 ? meas[4] : null);
          var targetMeas = config.targetMeasureOverride ? resolveField(meas, config.targetMeasureOverride, -1) : null;

          // Parse Raw Candles
          var rawCandles = [];
          data.forEach(function (row, idx) {
            var dateCell = row[dateDim.name];
            var dateStr = dateCell ? String(dateCell.rendered || dateCell.value || ("T" + idx)) : ("T" + idx);
            var drills = null;
            if (dateCell && dateCell.links && dateCell.links.length) drills = dateCell.links;
            else if (row[closeMeas.name] && row[closeMeas.name].links && row[closeMeas.name].links.length) drills = row[closeMeas.name].links;

            var openCell = row[openMeas.name];
            var highCell = row[highMeas.name];
            var lowCell = row[lowMeas.name];
            var closeCell = row[closeMeas.name];

            if (suppressNulls && (!openCell || openCell.value === null || !closeCell || closeCell.value === null)) return;

            var openVal = (openCell && openCell.value !== null) ? Number(openCell.value) : 0;
            var highVal = (highCell && highCell.value !== null) ? Number(highCell.value) : openVal;
            var lowVal = (lowCell && lowCell.value !== null) ? Number(lowCell.value) : openVal;
            var closeVal = (closeCell && closeCell.value !== null) ? Number(closeCell.value) : openVal;
            var volVal = (volumeMeas && row[volumeMeas.name] && row[volumeMeas.name].value !== null) ? Number(row[volumeMeas.name].value) : 0;
            var targColVal = (targetMeas && row[targetMeas.name] && row[targetMeas.name].value !== null) ? Number(row[targetMeas.name].value) : null;

            if (isNaN(openVal) || isNaN(highVal) || isNaN(lowVal) || isNaN(closeVal)) return;
            if (suppressNulls && openVal === 0 && highVal === 0 && lowVal === 0 && closeVal === 0) return;

            var trueHigh = Math.max(openVal, highVal, lowVal, closeVal);
            var trueLow = Math.min(openVal, highVal, lowVal, closeVal);

            rawCandles.push({
              origIdx: idx,
              dateStr: dateStr,
              dateObj: new Date(dateStr),
              open: openVal,
              high: trueHigh,
              low: trueLow,
              close: closeVal,
              closeRendered: closeCell ? closeCell.rendered : null,
              volume: volVal,
              targetColVal: targColVal,
              isBullish: closeVal >= openVal,
              drills: drills
            });
          });

          if (rawCandles.length === 0) {
            if (this.addError) this.addError({ title: "No Valid Candles", message: "Could not parse valid OHLC numeric values." });
            done();
            return;
          }

          // Compute Bollinger & Heikin-Ashi on chronological order first for mathematical accuracy
          var chronoCandles = rawCandles.slice().sort(function (a, b) {
            var ta = a.dateObj.getTime();
            var tb = b.dateObj.getTime();
            if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta - tb;
            return a.dateStr.localeCompare(b.dateStr);
          });

          if (layoutMode === "heikin_ashi") {
            var prevHaOpen = chronoCandles[0].open;
            var prevHaClose = chronoCandles[0].close;
            chronoCandles.forEach(function (c, idx) {
              var haClose = (c.open + c.high + c.low + c.close) / 4;
              var haOpen = idx === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
              c.origOpen = c.open;
              c.origClose = c.close;
              c.open = haOpen;
              c.close = haClose;
              c.high = Math.max(c.high, haOpen, haClose);
              c.low = Math.min(c.low, haOpen, haClose);
              c.isBullish = haClose >= haOpen;
              prevHaOpen = haOpen;
              prevHaClose = haClose;
            });
          }

          var bPeriod = parseInt(config.bollingerPeriod || "20", 10) || 20;
          var bStdDev = parseFloat(config.bollingerStdDev || "2.0") || 2.0;
          var squeezeThresh = Number(config.anomalyAlertThreshold) || 15;

          chronoCandles.forEach(function (c, i) {
            if (i < bPeriod - 1) {
              c.sma = null;
              c.upperBand = null;
              c.lowerBand = null;
              c.bandwidth = null;
              c.percentB = null;
              c.isSqueeze = false;
            } else {
              var windowSlice = chronoCandles.slice(i - bPeriod + 1, i + 1);
              var sum = 0;
              for (var k = 0; k < windowSlice.length; k++) sum += windowSlice[k].close;
              var mean = sum / bPeriod;
              var varianceSum = 0;
              for (var j = 0; j < windowSlice.length; j++) varianceSum += Math.pow(windowSlice[j].close - mean, 2);
              var std = Math.sqrt(varianceSum / bPeriod);
              var upper = mean + (bStdDev * std);
              var lower = mean - (bStdDev * std);
              var bw = mean !== 0 ? ((upper - lower) / mean) * 100 : 0;
              var pctB = (upper !== lower) ? (c.close - lower) / (upper - lower) : 0.5;

              c.sma = mean;
              c.upperBand = upper;
              c.lowerBand = lower;
              c.bandwidth = bw;
              c.percentB = pctB;
              c.isSqueeze = bw < squeezeThresh;
            }
          });

          // Apply Sort & Top-N Windowing + Other Rollup
          var sortBy = config.sortBy || "chronological_asc";
          var sortedCandles = chronoCandles.slice();
          if (sortBy === "chronological_desc") {
            sortedCandles.reverse();
          } else if (sortBy === "metric_desc") {
            sortedCandles.sort(function (a, b) { return b.close - a.close; });
          } else if (sortBy === "metric_asc") {
            sortedCandles.sort(function (a, b) { return a.close - b.close; });
          } else if (sortBy === "alpha_asc") {
            sortedCandles.sort(function (a, b) { return a.dateStr.localeCompare(b.dateStr); });
          }

          var topN = parseInt(config.topNLimit || "0", 10) || 0;
          var excludedCandles = [];
          if (topN > 0 && sortedCandles.length > topN) {
            if (sortBy === "chronological_asc") {
              // Keep most recent N periods for chronological ascending timeline
              excludedCandles = sortedCandles.slice(0, sortedCandles.length - topN);
              sortedCandles = sortedCandles.slice(sortedCandles.length - topN);
            } else {
              excludedCandles = sortedCandles.slice(topN);
              sortedCandles = sortedCandles.slice(0, topN);
            }
          }

          // Apply interactive search / signal filter
          var searchQ = (self._searchText || "").trim().toLowerCase();
          var sigFilter = self._signalFilter || "ALL";
          var candles = sortedCandles.filter(function (c) {
            if (searchQ && c.dateStr.toLowerCase().indexOf(searchQ) === -1) return false;
            if (sigFilter === "BULLISH" && !c.isBullish) return false;
            if (sigFilter === "BEARISH" && c.isBullish) return false;
            if (sigFilter === "SQUEEZE" && !c.isSqueeze) return false;
            return true;
          });
          if (candles.length === 0) candles = sortedCandles.slice(0, 1);

          // Summary Stats across active candles
          var allCloses = candles.map(function (c) { return c.close; });
          var sortedCloses = allCloses.slice().sort(function (a, b) { return a - b; });
          var periodHigh = d3.max(candles, function (c) { return c.high; });
          var periodLow = d3.min(candles, function (c) { return c.low; });
          var totalVolume = d3.sum(candles, function (c) { return c.volume; });
          var hasDrills = candles.some(function (c) { return c.drills && c.drills.length > 0; });

          // Benchmark Target Calculation
          var targetMode = config.targetMode || "dataset_mean";
          var targetVal = null;
          if (targetMode === "dataset_mean") {
            targetVal = d3.mean(allCloses);
          } else if (targetMode === "dataset_median") {
            targetVal = computePercentile(sortedCloses, 0.5);
          } else if (targetMode === "percentile_p75") {
            targetVal = computePercentile(sortedCloses, 0.75);
          } else if (targetMode === "percentile_p90") {
            targetVal = computePercentile(sortedCloses, 0.90);
          } else if (targetMode === "measure_column") {
            var tCols = candles.map(function (c) { return c.targetColVal; }).filter(function (v) { return v !== null && !isNaN(v); });
            if (tCols.length > 0) targetVal = d3.mean(tCols);
          } else if (targetMode === "period_high") {
            targetVal = periodHigh;
          } else if (targetMode === "period_low") {
            targetVal = periodLow;
          } else if (targetMode === "fixed_value") {
            targetVal = Number(config.targetValue) || 0;
          }

          var firstCandle = candles[0];
          var lastCandle = candles[candles.length - 1];
          var totalReturnPct = firstCandle.close > 0 ? ((lastCandle.close - firstCandle.close) / firstCandle.close) * 100 : 0;
          var isReturnPositive = polarity === "lower_is_better" ? totalReturnPct <= 0 : totalReturnPct >= 0;
          var squeezeCount = candles.filter(function (c) { return c.isSqueeze; }).length;

          // Build Root Layout (Normal flow header + flex: 1 1 0 chart canvas)
          var rootBox = document.createElement("div");
          rootBox.style.display = "flex";
          rootBox.style.flexDirection = "column";
          rootBox.style.width = "100%";
          rootBox.style.height = "100%";
          rootBox.style.background = theme.bg;
          rootBox.style.color = theme.text;
          rootBox.style.boxSizing = "border-box";
          rootBox.style.overflow = "hidden";

          // Optional Title Header
          if (chartTitle || hasDrills) {
            var titleBox = document.createElement("div");
            titleBox.style.flex = "0 0 auto";
            titleBox.style.padding = "8px 16px 6px 16px";
            titleBox.style.background = theme.hudBg;
            titleBox.style.borderBottom = "1px solid " + theme.border;
            titleBox.style.display = "flex";
            titleBox.style.alignItems = "center";
            titleBox.style.justifyContent = "space-between";
            titleBox.style.flexWrap = "wrap";
            titleBox.style.gap = "8px";

            var titleLeft = document.createElement("div");
            if (chartTitle) {
              var tDiv = document.createElement("div");
              tDiv.style.fontSize = Math.round(14.5 * fMult) + "px";
              tDiv.style.fontWeight = "700";
              tDiv.style.color = theme.text;
              tDiv.textContent = chartTitle;
              titleLeft.appendChild(tDiv);
            }
            if (chartSubtitle) {
              var sDiv = document.createElement("div");
              sDiv.style.fontSize = Math.round(11 * fMult) + "px";
              sDiv.style.color = theme.subtext;
              sDiv.style.marginTop = "2px";
              sDiv.textContent = chartSubtitle;
              titleLeft.appendChild(sDiv);
            }
            titleBox.appendChild(titleLeft);

            if (hasDrills) {
              var drillPill = document.createElement("span");
              drillPill.style.fontSize = Math.round(10 * fMult) + "px";
              drillPill.style.fontWeight = "700";
              drillPill.style.padding = "2px 8px";
              drillPill.style.borderRadius = "999px";
              drillPill.style.background = hexToRgba(theme.sma, 0.12);
              drillPill.style.color = theme.sma;
              drillPill.textContent = "\uD83D\uDD0E CLICK CANDLE TO DRILL";
              titleBox.appendChild(drillPill);
            }
            rootBox.appendChild(titleBox);
          }

          // HUD Scorecard
          if (hudMode !== "hidden") {
            var hudStrip = document.createElement("div");
            hudStrip.style.flex = "0 0 auto";
            hudStrip.style.display = "flex";
            hudStrip.style.alignItems = "center";
            hudStrip.style.justifyContent = "space-between";
            hudStrip.style.padding = "8px 16px";
            hudStrip.style.background = theme.hudBg;
            hudStrip.style.borderBottom = "1px solid " + theme.border;
            hudStrip.style.flexWrap = "wrap";
            hudStrip.style.gap = "12px";

            if (hudMode === "full") {
              var hudLeft = document.createElement("div");
              hudLeft.style.display = "flex";
              hudLeft.style.alignItems = "center";
              hudLeft.style.gap = "16px";
              hudLeft.style.flexWrap = "wrap";

              function addKpi(labelTxt, valTxt, valCol, hasBorder) {
                var box = document.createElement("div");
                if (hasBorder) {
                  box.style.borderLeft = "1px solid " + theme.border;
                  box.style.paddingLeft = "14px";
                }
                var l = document.createElement("div");
                l.style.fontSize = Math.round(9.5 * fMult) + "px";
                l.style.fontWeight = "700";
                l.style.textTransform = "uppercase";
                l.style.letterSpacing = "0.5px";
                l.style.color = theme.subtext;
                l.textContent = labelTxt;
                var v = document.createElement("div");
                v.style.fontSize = Math.round(14.5 * fMult) + "px";
                v.style.fontWeight = "800";
                v.style.color = valCol || theme.text;
                v.textContent = valTxt;
                box.appendChild(l);
                box.appendChild(v);
                hudLeft.appendChild(box);
              }

              var latestCol = (polarity === "lower_is_better" ? !lastCandle.isBullish : lastCandle.isBullish) ? posColor : negColor;
              addKpi("Latest Close", formatPrice(lastCandle.close, valFormat, lastCandle.closeRendered), latestCol, false);
              addKpi("Period Return", (totalReturnPct >= 0 ? "+" : "") + totalReturnPct.toFixed(2) + "%", isReturnPositive ? posColor : negColor, true);
              addKpi("Range (Low - High)", formatPrice(periodLow, valFormat) + " \u2013 " + formatPrice(periodHigh, valFormat), theme.text, true);
              if (lastCandle.bandwidth !== null) {
                addKpi("Bollinger Bandwidth", lastCandle.bandwidth.toFixed(1) + "% (" + (lastCandle.isSqueeze ? "\u26A0\uFE0F Squeeze" : squeezeCount + " sqz") + ")", lastCandle.isSqueeze ? "#f59e0b" : theme.sma, true);
              }
              if (excludedCandles.length > 0 && config.enableOtherRollup !== false) {
                var excAvg = d3.mean(excludedCandles, function (c) { return c.close; });
                addKpi("Prior / Other (" + excludedCandles.length + ")", "Avg " + formatPrice(excAvg, valFormat), theme.subtext, true);
              }
              hudStrip.appendChild(hudLeft);

              if (volumeMeas) {
                var hudRight = document.createElement("div");
                hudRight.style.textAlign = "right";
                hudRight.innerHTML =
                  "<div style=\"font-size:" + Math.round(9.5 * fMult) + "px;font-weight:700;text-transform:uppercase;color:" + theme.subtext + ";letter-spacing:0.5px;\">Aggregated Volume</div>" +
                  "<div style=\"font-size:" + Math.round(14 * fMult) + "px;font-weight:700;color:" + theme.text + ";\">" + formatVolume(totalVolume) + " units</div>";
                hudStrip.appendChild(hudRight);
              }
            } else {
              var latestColC = (polarity === "lower_is_better" ? !lastCandle.isBullish : lastCandle.isBullish) ? posColor : negColor;
              hudStrip.innerHTML =
                "<div style=\"font-size:" + Math.round(11.5 * fMult) + "px;font-weight:600;color:" + theme.subtext + ";\">" +
                "Close: <strong style=\"color:" + latestColC + ";\">" + formatPrice(lastCandle.close, valFormat) + "</strong> (" + (totalReturnPct >= 0 ? "+" : "") + totalReturnPct.toFixed(2) + "%) &bull; " +
                "Range: <strong>" + formatPrice(periodLow, valFormat) + " \u2013 " + formatPrice(periodHigh, valFormat) + "</strong> &bull; " +
                "Candles: <strong>" + candles.length + "</strong>" +
                (excludedCandles.length > 0 && config.enableOtherRollup !== false ? " (+" + excludedCandles.length + " prior)" : "") +
                "</div>";
            }
            rootBox.appendChild(hudStrip);
          }

          // Search, Signal Filter & Overlay Legend Bar (Normal Flow)
          if (showSearch || showLegend) {
            var controlBar = document.createElement("div");
            controlBar.style.flex = "0 0 auto";
            controlBar.style.display = "flex";
            controlBar.style.alignItems = "center";
            controlBar.style.justifyContent = "space-between";
            controlBar.style.flexWrap = "wrap";
            controlBar.style.gap = "8px";
            controlBar.style.padding = "6px 16px";
            controlBar.style.background = theme.bg;
            controlBar.style.borderBottom = "1px solid " + theme.border;

            if (showSearch) {
              var filterWrap = document.createElement("div");
              filterWrap.style.display = "flex";
              filterWrap.style.alignItems = "center";
              filterWrap.style.gap = "6px";
              filterWrap.style.flexWrap = "wrap";

              var searchInput = document.createElement("input");
              searchInput.type = "text";
              searchInput.placeholder = "Filter date (e.g. 2026-08)...";
              searchInput.value = self._searchText || "";
              searchInput.style.fontSize = Math.round(11 * fMult) + "px";
              searchInput.style.padding = "3px 8px";
              searchInput.style.borderRadius = "6px";
              searchInput.style.border = "1px solid " + theme.border;
              searchInput.style.background = theme.hudBg;
              searchInput.style.color = theme.text;
              searchInput.style.outline = "none";
              searchInput.style.width = "155px";
              searchInput.addEventListener("input", function (ev) {
                self._searchText = ev.target.value;
                self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, {}, function () {});
              });
              filterWrap.appendChild(searchInput);

              ["ALL", "BULLISH", "BEARISH", "SQUEEZE"].forEach(function (sig) {
                var btn = document.createElement("button");
                var active = (self._signalFilter || "ALL") === sig;
                btn.textContent = sig === "ALL" ? "All" : (sig === "BULLISH" ? "Bullish" : (sig === "BEARISH" ? "Bearish" : "Squeeze"));
                btn.style.fontSize = Math.round(10.5 * fMult) + "px";
                btn.style.fontWeight = active ? "700" : "600";
                btn.style.padding = "3px 8px";
                btn.style.borderRadius = "6px";
                btn.style.cursor = "pointer";
                btn.style.border = "1px solid " + (active ? theme.sma : theme.border);
                btn.style.background = active ? hexToRgba(theme.sma, 0.14) : theme.hudBg;
                btn.style.color = active ? theme.sma : theme.subtext;
                btn.addEventListener("click", function () {
                  self._signalFilter = sig;
                  self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, {}, function () {});
                });
                filterWrap.appendChild(btn);
              });

              controlBar.appendChild(filterWrap);
            }

            if (showLegend) {
              var legWrap = document.createElement("div");
              legWrap.style.display = "flex";
              legWrap.style.alignItems = "center";
              legWrap.style.gap = "12px";
              legWrap.style.flexWrap = "wrap";
              legWrap.style.fontSize = Math.round(10.5 * fMult) + "px";
              legWrap.style.color = theme.subtext;

              function addLegItem(col, lbl, isDashed) {
                var item = document.createElement("span");
                item.style.display = "inline-flex";
                item.style.alignItems = "center";
                item.style.gap = "5px";
                var sw = document.createElement("span");
                sw.style.display = "inline-block";
                sw.style.width = "10px";
                sw.style.height = isDashed ? "0px" : "10px";
                if (isDashed) {
                  sw.style.borderTop = "2px dashed " + col;
                } else {
                  sw.style.background = col;
                  sw.style.borderRadius = "2px";
                }
                item.appendChild(sw);
                item.appendChild(document.createTextNode(lbl));
                legWrap.appendChild(item);
              }
              addLegItem(posColor, polarity === "lower_is_better" ? "Favorable Drop" : "Bullish", false);
              addLegItem(negColor, polarity === "lower_is_better" ? "Adverse Spike" : "Bearish", false);
              if (showSMA) addLegItem(theme.sma, bPeriod + "-SMA", false);
              if (showBollinger) addLegItem(theme.upperBand, "Bollinger (" + bStdDev + "\u03C3)", true);
              controlBar.appendChild(legWrap);
            }

            rootBox.appendChild(controlBar);
          }

          // Main Chart Canvas Container
          var chartContainer = document.createElement("div");
          chartContainer.style.flex = "1 1 0";
          chartContainer.style.minHeight = "0";
          chartContainer.style.width = "100%";
          chartContainer.style.position = "relative";
          chartContainer.style.overflow = "hidden";
          rootBox.appendChild(chartContainer);
          container.appendChild(rootBox);

          function drawChart() {
            var width = chartContainer.clientWidth || element.clientWidth || 800;
            var height = chartContainer.clientHeight || 420;
            if (width < 50 || height < 50) return;

            chartContainer.innerHTML = "";
            var margin = { top: 20, right: 24, bottom: 26, left: 66 };
            var innerWidth = Math.max(40, width - margin.left - margin.right);
            var totalInnerHeight = Math.max(40, height - margin.top - margin.bottom);

            var hasOscillator = layoutMode === "bandwidth_oscillator";
            var hasSubPanel = hasOscillator || (showVolume && volumeMeas);
            var subHeight = hasSubPanel ? Math.max(58, Math.floor(totalInnerHeight * 0.24)) : 0;
            var gapHeight = hasSubPanel ? 18 : 0;
            var priceHeight = Math.max(40, totalInnerHeight - subHeight - gapHeight);

            var svg = d3.select(chartContainer).append("svg")
              .attr("width", width)
              .attr("height", height)
              .style("display", "block");

            var clipId = "candlestick-clip-" + Math.floor(Math.random() * 1e6);
            svg.append("defs").append("clipPath")
              .attr("id", clipId)
              .append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", innerWidth)
              .attr("height", priceHeight);

            var mainG = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var xScale = d3.scaleBand()
              .domain(candles.map(function (c) { return c.dateStr; }))
              .range([0, innerWidth])
              .padding(0.3);

            var yMin = d3.min(candles, function (c) {
              return Math.min(c.low, c.lowerBand !== null ? c.lowerBand : c.low);
            });
            var yMax = d3.max(candles, function (c) {
              return Math.max(c.high, c.upperBand !== null ? c.upperBand : c.high);
            });
            if (targetMode !== "none" && targetVal !== null && !isNaN(targetVal)) {
              yMin = Math.min(yMin, targetVal);
              yMax = Math.max(yMax, targetVal);
            }
            var yPadding = (yMax - yMin) * 0.08 || 0.1;
            var yScale = d3.scaleLinear()
              .domain([yMin - yPadding, yMax + yPadding])
              .range([priceHeight, 0]);

            mainG.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid)
              .attr("stroke-dasharray", "3,3");

            var xTickStep = Math.max(1, Math.floor(candles.length / 8));
            var xTicks = candles.filter(function (_, idx) { return idx % xTickStep === 0; }).map(function (c) { return c.dateStr; });
            var xAxisG = mainG.append("g")
              .attr("transform", "translate(0," + (priceHeight + gapHeight + subHeight) + ")")
              .call(d3.axisBottom(xScale).tickValues(xTicks));
            xAxisG.select(".domain").attr("stroke", theme.border);
            xAxisG.selectAll(".tick line").attr("stroke", theme.border);
            xAxisG.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", Math.round(10.5 * fMult) + "px");

            var yAxisG = mainG.append("g")
              .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatPrice(d, valFormat); }));
            yAxisG.select(".domain").attr("stroke", theme.border);
            yAxisG.selectAll(".tick line").attr("stroke", theme.border);
            yAxisG.selectAll(".tick text").attr("fill", theme.text).style("font-size", Math.round(10.5 * fMult) + "px").style("font-weight", "600");

            var contentG = mainG.append("g").attr("clip-path", "url(#" + clipId + ")");

            // Bollinger Envelope Ribbon
            if (showBollinger) {
              var validB = candles.filter(function (c) { return c.upperBand !== null && c.lowerBand !== null; });
              if (validB.length > 0) {
                contentG.append("path")
                  .datum(validB)
                  .attr("fill", theme.bandFill)
                  .attr("d", d3.area()
                    .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                    .y0(function (c) { return yScale(c.lowerBand); })
                    .y1(function (c) { return yScale(c.upperBand); })
                    .curve(d3.curveMonotoneX));

                [function (c) { return yScale(c.upperBand); }, function (c) { return yScale(c.lowerBand); }].forEach(function (yFn) {
                  contentG.append("path")
                    .datum(validB)
                    .attr("fill", "none")
                    .attr("stroke", theme.upperBand)
                    .attr("stroke-width", 1.2)
                    .attr("stroke-dasharray", "4,2")
                    .attr("d", d3.line().x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; }).y(yFn).curve(d3.curveMonotoneX));
                });
              }
            }

            // SMA Line
            if (showSMA) {
              var validS = candles.filter(function (c) { return c.sma !== null; });
              if (validS.length > 0) {
                contentG.append("path")
                  .datum(validS)
                  .attr("fill", "none")
                  .attr("stroke", theme.sma)
                  .attr("stroke-width", 2)
                  .attr("d", d3.line()
                    .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                    .y(function (c) { return yScale(c.sma); })
                    .curve(d3.curveMonotoneX));
              }
            }

            // Benchmark Reference Line
            if (targetMode !== "none" && targetVal !== null && !isNaN(targetVal)) {
              contentG.append("line")
                .attr("x1", 0).attr("x2", innerWidth)
                .attr("y1", yScale(targetVal)).attr("y2", yScale(targetVal))
                .attr("stroke", theme.subtext).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,5").attr("opacity", 0.8);

              contentG.append("text")
                .attr("x", innerWidth - 6).attr("y", Math.max(12, yScale(targetVal) - 5))
                .attr("text-anchor", "end").attr("fill", theme.subtext)
                .style("font-size", Math.round(10 * fMult) + "px").style("font-weight", "700")
                .text((config.targetLabel || "Benchmark") + ": " + formatPrice(targetVal, valFormat));
            }

            var candleWidth = Math.max(2, xScale.bandwidth());
            function candleColor(c) {
              var favorable = polarity === "lower_is_better" ? !c.isBullish : c.isBullish;
              return favorable ? posColor : negColor;
            }

            if (layoutMode === "bandwidth_oscillator") {
              // Close price curve + markers
              contentG.append("path")
                .datum(candles)
                .attr("fill", "none")
                .attr("stroke", theme.text)
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                  .x(function (c) { return xScale(c.dateStr) + candleWidth / 2; })
                  .y(function (c) { return yScale(c.close); })
                  .curve(d3.curveMonotoneX));

              contentG.selectAll(".osc-pt")
                .data(candles)
                .enter()
                .append("circle")
                .attr("cx", function (c) { return xScale(c.dateStr) + candleWidth / 2; })
                .attr("cy", function (c) { return yScale(c.close); })
                .attr("r", function (c) { return c.isSqueeze ? 4.2 : 2.6; })
                .attr("fill", function (c) { return c.isSqueeze ? "#f59e0b" : candleColor(c); })
                .style("cursor", "pointer")
                .on("click", function (event, c) {
                  if (c.drills && c.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                    LookerCharts.Utils.openDrillMenu({ links: c.drills, event: event });
                  }
                });
            } else {
              var candleG = contentG.selectAll(".candle-item")
                .data(candles)
                .enter()
                .append("g")
                .attr("class", "candle-item")
                .attr("transform", function (c) { return "translate(" + xScale(c.dateStr) + ",0)"; })
                .style("cursor", "pointer");

              if (layoutMode === "ohlc_bars") {
                candleG.append("line")
                  .attr("x1", candleWidth / 2).attr("x2", candleWidth / 2)
                  .attr("y1", function (c) { return yScale(c.high); }).attr("y2", function (c) { return yScale(c.low); })
                  .attr("stroke", candleColor).attr("stroke-width", 1.8);
                candleG.append("line")
                  .attr("x1", 0).attr("x2", candleWidth / 2)
                  .attr("y1", function (c) { return yScale(c.open); }).attr("y2", function (c) { return yScale(c.open); })
                  .attr("stroke", candleColor).attr("stroke-width", 1.8);
                candleG.append("line")
                  .attr("x1", candleWidth / 2).attr("x2", candleWidth)
                  .attr("y1", function (c) { return yScale(c.close); }).attr("y2", function (c) { return yScale(c.close); })
                  .attr("stroke", candleColor).attr("stroke-width", 1.8);
              } else {
                candleG.append("line")
                  .attr("x1", candleWidth / 2).attr("x2", candleWidth / 2)
                  .attr("y1", function (c) { return yScale(c.high); }).attr("y2", function (c) { return yScale(c.low); })
                  .attr("stroke", candleColor).attr("stroke-width", 1.2);

                candleG.append("rect")
                  .attr("x", 0)
                  .attr("width", candleWidth)
                  .attr("y", function (c) { return yScale(Math.max(c.open, c.close)); })
                  .attr("height", function (c) { return Math.max(1.5, Math.abs(yScale(c.open) - yScale(c.close))); })
                  .attr("fill", candleColor)
                  .attr("stroke", function (c) { return c.isSqueeze ? "#f59e0b" : candleColor(c); })
                  .attr("stroke-width", function (c) { return c.isSqueeze ? 1.5 : 1; })
                  .attr("rx", 1);
              }

              candleG.on("click", function (event, c) {
                if (c.drills && c.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                  LookerCharts.Utils.openDrillMenu({ links: c.drills, event: event });
                }
              });
            }

            // Peak / Value Callout Labels
            if (labelDensity !== "hidden" && candles.length > 0) {
              var maxCandle = candles.reduce(function (best, c) { return c.high > best.high ? c : best; }, candles[0]);
              var minCandle = candles.reduce(function (best, c) { return c.low < best.low ? c : best; }, candles[0]);
              var callouts = [
                { c: maxCandle, val: maxCandle.high, lbl: "High " + formatPrice(maxCandle.high, valFormat), col: posColor, dy: -6 },
                { c: minCandle, val: minCandle.low, lbl: "Low " + formatPrice(minCandle.low, valFormat), col: negColor, dy: 12 }
              ];
              if (labelDensity === "all") {
                callouts.push({ c: lastCandle, val: lastCandle.close, lbl: "Close " + formatPrice(lastCandle.close, valFormat), col: theme.sma, dy: -8 });
              }
              callouts.forEach(function (co) {
                var cx = xScale(co.c.dateStr) + candleWidth / 2;
                var cy = yScale(co.val);
                var anchor = cx > innerWidth * 0.78 ? "end" : (cx < innerWidth * 0.22 ? "start" : "middle");
                mainG.append("text")
                  .attr("x", cx)
                  .attr("y", Math.max(11, Math.min(priceHeight - 4, cy + co.dy)))
                  .attr("text-anchor", anchor)
                  .attr("fill", co.col)
                  .style("font-size", Math.round(9.5 * fMult) + "px")
                  .style("font-weight", "700")
                  .text(co.lbl);
              });
            }

            // Sub-Panel: %B Volatility Oscillator OR Volume Histogram
            if (hasSubPanel) {
              var subY = priceHeight + gapHeight;
              var subG = mainG.append("g").attr("transform", "translate(0," + subY + ")");
              subG.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", 0).attr("y2", 0).attr("stroke", theme.border);

              if (hasOscillator) {
                subG.append("text")
                  .attr("x", 0).attr("y", -4).attr("fill", theme.subtext)
                  .style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700").style("text-transform", "uppercase")
                  .text("Bollinger %B & Volatility Squeeze Oscillator");

                var validOsc = candles.filter(function (c) { return c.percentB !== null; });
                var oscMin = Math.min(-0.1, d3.min(validOsc, function (c) { return c.percentB; }) || 0);
                var oscMax = Math.max(1.1, d3.max(validOsc, function (c) { return c.percentB; }) || 1);
                var oscScale = d3.scaleLinear().domain([oscMin, oscMax]).range([subHeight, 4]);

                var oscAxis = subG.append("g").call(d3.axisLeft(oscScale).tickValues([0, 0.5, 1]).tickFormat(function (d) { return (d * 100).toFixed(0) + "%"; }));
                oscAxis.select(".domain").attr("stroke", theme.border);
                oscAxis.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", "9.5px");

                [0, 1].forEach(function (lvl) {
                  subG.append("line")
                    .attr("x1", 0).attr("x2", innerWidth)
                    .attr("y1", oscScale(lvl)).attr("y2", oscScale(lvl))
                    .attr("stroke", lvl === 1 ? negColor : posColor)
                    .attr("stroke-dasharray", "3,3").attr("opacity", 0.6);
                });

                if (validOsc.length > 0) {
                  subG.append("path")
                    .datum(validOsc)
                    .attr("fill", "none")
                    .attr("stroke", theme.sma)
                    .attr("stroke-width", 1.8)
                    .attr("d", d3.line()
                      .x(function (c) { return xScale(c.dateStr) + candleWidth / 2; })
                      .y(function (c) { return oscScale(c.percentB); })
                      .curve(d3.curveMonotoneX));
                }
              } else if (showVolume && volumeMeas) {
                subG.append("text")
                  .attr("x", 0).attr("y", -4).attr("fill", theme.subtext)
                  .style("font-size", Math.round(9.5 * fMult) + "px").style("font-weight", "700").style("text-transform", "uppercase")
                  .text("Volume (" + (volumeMeas.label_short || volumeMeas.label || "Units") + ")");

                var maxVol = d3.max(candles, function (c) { return c.volume; }) || 1;
                var volScale = d3.scaleLinear().domain([0, maxVol * 1.05]).range([subHeight, 0]);
                var volAxisG = subG.append("g").call(d3.axisLeft(volScale).ticks(3).tickFormat(formatVolume));
                volAxisG.select(".domain").attr("stroke", theme.border);
                volAxisG.selectAll(".tick line").attr("stroke", theme.border);
                volAxisG.selectAll(".tick text").attr("fill", theme.subtext).style("font-size", "9.5px");

                subG.selectAll(".vol-bar")
                  .data(candles)
                  .enter()
                  .append("rect")
                  .attr("class", "vol-bar")
                  .attr("x", function (c) { return xScale(c.dateStr); })
                  .attr("width", candleWidth)
                  .attr("y", function (c) { return volScale(c.volume); })
                  .attr("height", function (c) { return Math.max(0, subHeight - volScale(c.volume)); })
                  .attr("fill", function (c) {
                    var fav = polarity === "lower_is_better" ? !c.isBullish : c.isBullish;
                    return fav ? hexToRgba(posColor, 0.38) : hexToRgba(negColor, 0.38);
                  })
                  .attr("rx", 1);
              }
            }

            // Crosshair Scrubber & Floating Tooltip Card
            var crosshairLine = mainG.append("line")
              .attr("stroke", theme.crosshair)
              .attr("stroke-width", 1.2)
              .attr("stroke-dasharray", "3,3")
              .attr("y1", 0)
              .attr("y2", priceHeight + (hasSubPanel ? gapHeight + subHeight : 0))
              .style("opacity", 0)
              .style("pointer-events", "none");

            var tooltip = d3.select(chartContainer).append("div")
              .style("position", "absolute")
              .style("background", "rgba(15, 23, 42, 0.94)")
              .style("color", "#f8fafc")
              .style("padding", "10px 14px")
              .style("border-radius", "8px")
              .style("border", "1px solid rgba(255, 255, 255, 0.16)")
              .style("box-shadow", "0 4px 14px rgba(0,0,0,0.28)")
              .style("font-size", "11.5px")
              .style("line-height", "1.4")
              .style("pointer-events", "none")
              .style("opacity", 0)
              .style("z-index", 100);

            mainG.append("rect")
              .attr("width", innerWidth)
              .attr("height", priceHeight + (hasSubPanel ? gapHeight + subHeight : 0))
              .attr("fill", "transparent")
              .on("mousemove", function (event) {
                var coords = d3.pointer(event);
                var mouseX = coords[0];
                var eachBand = innerWidth / candles.length;
                var candleIdx = Math.max(0, Math.min(candles.length - 1, Math.floor(mouseX / eachBand)));
                var c = candles[candleIdx];
                var cx = xScale(c.dateStr) + candleWidth / 2;

                crosshairLine.attr("x1", cx).attr("x2", cx).style("opacity", 1);

                var changePct = c.open !== 0 ? ((c.close - c.open) / c.open) * 100 : 0;
                var changeSign = changePct >= 0 ? "+" : "";
                var changeColor = (polarity === "lower_is_better" ? !c.isBullish : c.isBullish) ? "#34d399" : "#f87171";

                var html =
                  "<div style=\"font-size:12.5px;font-weight:800;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;margin-bottom:6px;\">\uD83D\uDCC5 " + c.dateStr + "</div>" +
                  "<div style=\"display:grid;grid-template-columns:auto auto;gap:4px 16px;\">" +
                  "  <span style=\"color:#94a3b8;\">Open:</span><span style=\"font-weight:700;text-align:right;\">" + formatPrice(c.open, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">High:</span><span style=\"font-weight:700;text-align:right;color:#34d399;\">" + formatPrice(c.high, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Low:</span><span style=\"font-weight:700;text-align:right;color:#f87171;\">" + formatPrice(c.low, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Close:</span><span style=\"font-weight:700;text-align:right;\">" + formatPrice(c.close, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Net Change:</span><span style=\"font-weight:800;text-align:right;color:" + changeColor + ";\">" + changeSign + changePct.toFixed(2) + "%</span>" +
                  (volumeMeas ? "  <span style=\"color:#94a3b8;\">Volume:</span><span style=\"font-weight:700;text-align:right;\">" + formatVolume(c.volume) + "</span>" : "") +
                  (c.sma !== null ? "  <span style=\"color:#94a3b8;\">" + bPeriod + "-SMA:</span><span style=\"font-weight:700;text-align:right;color:#38bdf8;\">" + formatPrice(c.sma, valFormat) + "</span>" : "") +
                  (c.upperBand !== null ? "  <span style=\"color:#94a3b8;\">Upper Band:</span><span style=\"font-weight:700;text-align:right;\">" + formatPrice(c.upperBand, valFormat) + "</span>" : "") +
                  (c.lowerBand !== null ? "  <span style=\"color:#94a3b8;\">Lower Band:</span><span style=\"font-weight:700;text-align:right;\">" + formatPrice(c.lowerBand, valFormat) + "</span>" : "") +
                  (c.bandwidth !== null ? "  <span style=\"color:#94a3b8;\">Bandwidth:</span><span style=\"font-weight:700;text-align:right;\">" + c.bandwidth.toFixed(1) + "%" + (c.isSqueeze ? " (Squeeze)" : "") + "</span>" : "") +
                  "</div>";

                tooltip.html(html).style("opacity", 1);
                var tipW = 215;
                var leftPos = margin.left + cx + 14;
                if (leftPos + tipW > width) leftPos = margin.left + cx - tipW - 14;
                tooltip.style("left", Math.max(10, leftPos) + "px").style("top", (margin.top + 12) + "px");
              })
              .on("mouseleave", function () {
                crosshairLine.style("opacity", 0);
                tooltip.style("opacity", 0);
              });
          }

          drawChart();

          if (self._resizeObserver) {
            try { self._resizeObserver.disconnect(); } catch (e) {}
          }
          var lastW = chartContainer.clientWidth;
          var lastH = chartContainer.clientHeight;
          self._resizeObserver = new ResizeObserver(function (entries) {
            if (!entries || !entries.length) return;
            var newW = chartContainer.clientWidth;
            var newH = chartContainer.clientHeight;
            if (Math.abs(newW - lastW) > 4 || Math.abs(newH - lastH) > 4) {
              lastW = newW;
              lastH = newH;
              drawChart();
            }
          });
          self._resizeObserver.observe(chartContainer);

          done();
        } catch (err) {
          if (self.addError) self.addError({ title: "Render Error", message: err.message });
          done();
        }
      });
    }
  });
})();
