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
 *     1. "candlestick_bollinger": Classic Japanese Candlesticks + 20-period SMA + Bollinger Volatility Envelope
 *     2. "ohlc_bars": Traditional Western High-Low-Close tick bars
 *     3. "heikin_ashi": Noise-filtered Heikin-Ashi trend candles
 *     4. "bandwidth_oscillator": Price line with Bollinger %B Volatility Squeeze oscillator
 * - Dynamic Field-Role Mapping (Date, Open, High, Low, Close, Volume) via registerOptions
 * - Bollinger Band parameters (Period, StdDev multiplier, Envelope Ribbon)
 * - Volume Sub-Chart Panel with Bullish/Bearish volume bars
 * - Executive Summary HUD (Current Price, Period Return %, 52W/Period High/Low, Volatility Squeeze State)
 * - Interactive Vertical Crosshair Scrubber with Floating Inspection Card
 * - Looker Drill-Down Menus (LookerCharts.Utils.openDrillMenu)
 * - Strictly 2 configuration sections: "Display" and "Style"
 */

(function () {
  // --- DYNAMIC D3 LOADER ---
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

  // --- PALETTES ---
  var PALETTES = {
    google_modern: {
      name: "Google Modern",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#e8eaed",
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
      crosshair: "#5f6368"
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
      crosshair: "#8b949e"
    },
    emerald_bull: {
      name: "Emerald FinOps",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#dcfce7",
      grid: "#f0fdf4",
      hudBg: "#f0fdf4",
      bullish: "#059669",
      bearish: "#dc2626",
      sma: "#0284c7",
      upperBand: "#34d399",
      lowerBand: "#34d399",
      bandFill: "rgba(16, 185, 129, 0.09)",
      volumeBull: "rgba(5, 150, 105, 0.35)",
      volumeBear: "rgba(220, 38, 38, 0.35)",
      crosshair: "#047857"
    },
    monochrome_slate: {
      name: "Monochrome Slate",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f8fafc",
      hudBg: "#f1f5f9",
      bullish: "#334155",
      bearish: "#94a3b8",
      sma: "#6366f1",
      upperBand: "#cbd5e1",
      lowerBand: "#cbd5e1",
      bandFill: "rgba(100, 116, 139, 0.08)",
      volumeBull: "rgba(51, 65, 85, 0.3)",
      volumeBear: "rgba(148, 163, 184, 0.3)",
      crosshair: "#64748b"
    },
    cyberpunk_neon: {
      name: "Cyberpunk Neon",
      bg: "#09090b",
      text: "#fafafa",
      subtext: "#a1a1aa",
      border: "#27272a",
      grid: "#18181b",
      hudBg: "#18181b",
      bullish: "#10b981",
      bearish: "#f43f5e",
      sma: "#ec4899",
      upperBand: "#a855f7",
      lowerBand: "#a855f7",
      bandFill: "rgba(168, 85, 247, 0.14)",
      volumeBull: "rgba(16, 185, 129, 0.4)",
      volumeBear: "rgba(244, 63, 94, 0.4)",
      crosshair: "#a1a1aa"
    }
  };

  // --- FORMATTERS ---
  function formatPrice(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    if (fmt === "compact_currency") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(2);
    } else if (fmt === "compact_number") {
      var abs2 = Math.abs(num);
      var sign2 = num < 0 ? "-" : "";
      if (abs2 >= 1e9) return sign2 + (abs2 / 1e9).toFixed(2) + "B";
      if (abs2 >= 1e6) return sign2 + (abs2 / 1e6).toFixed(2) + "M";
      if (abs2 >= 1e3) return sign2 + (abs2 / 1e3).toFixed(1) + "K";
      return sign2 + abs2.toFixed(2);
    } else if (fmt === "percentage") {
      var p = (num <= 1 && num >= -1) ? num * 100 : num;
      return (p >= 0 ? "+" : "") + p.toFixed(2) + "%";
    } else if (fmt === "raw") {
      return String(num);
    } else {
      // currency_precise
      return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
  }

  function formatVolume(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    if (abs >= 1e9) return (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return (abs / 1e3).toFixed(1) + "K";
    return String(Math.round(num));
  }

  // --- VISUALIZATION REGISTRATION ---
  looker.plugins.visualizations.add({
    id: "candlestick_bollinger_bands",
    label: "Candlestick / OHLC & Bollinger Volatility Envelope",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
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
        label: "Trading Date Dimension (X-Axis)",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      openMeasOverride: {
        type: "string",
        label: "Open Price Measure",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: ""
      },
      highMeasOverride: {
        type: "string",
        label: "High Price Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / Second Measure": "" }],
        default: ""
      },
      lowMeasOverride: {
        type: "string",
        label: "Low Price Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / Third Measure": "" }],
        default: ""
      },
      closeMeasOverride: {
        type: "string",
        label: "Close Price Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / Fourth Measure": "" }],
        default: ""
      },
      volumeMeasOverride: {
        type: "string",
        label: "Trading Volume Measure (Optional)",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto / Fifth Measure": "" }],
        default: ""
      },
      bollingerPeriod: {
        type: "string",
        label: "Bollinger SMA Moving Average Period",
        section: "Display",
        order: 8,
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
        order: 9,
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
        order: 10,
        default: true
      },
      showBollingerEnvelope: {
        type: "boolean",
        label: "Show Bollinger Volatility Ribbon & Bands",
        section: "Display",
        order: 11,
        default: true
      },
      showVolumeSubchart: {
        type: "boolean",
        label: "Show Volume Histogram Sub-Chart",
        section: "Display",
        order: 12,
        default: true
      },
      targetMode: {
        type: "string",
        label: "Benchmark Reference Line Mode",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "None / Hide Target Line": "none" },
          { "Dataset Mean (90-Day Average)": "dataset_mean" },
          { "Dataset Median (P50 Price)": "dataset_median" },
          { "Period High (Resistance Level)": "period_high" },
          { "Period Low (Support Level)": "period_low" },
          { "Custom Fixed Benchmark Value": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      targetValue: {
        type: "number",
        label: "Custom Target Benchmark Value",
        section: "Display",
        order: 14,
        default: 0
      },
      targetLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        section: "Display",
        order: 15,
        default: "Benchmark Mean"
      },
      anomalyAlertThreshold: {
        type: "number",
        label: "Volatility Squeeze Alert Threshold (%)",
        section: "Display",
        order: 16,
        default: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Summary HUD Mode",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "Full Scorecard Strip": "full" },
          { "Compact Strip": "compact" },
          { "Hidden (Maximum Canvas)": "hidden" }
        ],
        default: "full"
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

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Theme & Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Modern (Enterprise Light)": "google_modern" },
          { "Trading Pro Dark (Terminal Dark)": "trading_pro_dark" },
          { "Emerald FinOps (Green Bullish)": "emerald_bull" },
          { "Monochrome Slate (Executive Charcoal)": "monochrome_slate" },
          { "Cyberpunk Neon (Dark Electric)": "cyberpunk_neon" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_modern"
      },
      bullishColor: {
        type: "string",
        label: "Custom Bullish (Up Candle) Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      bearishColor: {
        type: "string",
        label: "Custom Bearish (Down Candle) Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      bollingerBandColor: {
        type: "string",
        label: "Custom Bollinger Ribbon Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: ""
      },
      fontSize: {
        type: "string",
        label: "Font Size & Density",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (12.5px)": "standard" },
          { "Spacious (14px)": "spacious" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Price Value Format",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Precise Currency ($1.4500)": "currency_precise" },
          { "Compact Currency ($1.45M)": "compact_currency" },
          { "Compact Number (1.45M)": "compact_number" },
          { "Raw Numeric": "raw" }
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
        volumeMeasOverride: { role: "measure", defaultIdx: 4 }
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
      container.className = "candlestick-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      element.appendChild(container);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._registerDynamicFieldOptions(queryResponse);

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to render."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimension_like || [];
      var meas = fields.measure_like || [];

      if (dims.length === 0) {
        this.addError({
          title: "Date Dimension Required",
          message: "Candlestick visualization requires 1 Date/Time dimension (e.g. trading_date)."
        });
        done();
        return;
      }

      if (meas.length < 3) {
        this.addError({
          title: "Price Measures Required",
          message: "Candlestick visualization requires at least 3 numeric measures (Open, High, Low, Close)."
        });
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
            element.appendChild(container);
          }
          container.innerHTML = "";

          // Resolve Palette & Colors
          var pKey = config.colorPalette || "google_modern";
          var theme = Object.assign({}, PALETTES[pKey] || PALETTES.google_modern);
          if (config.bullishColor) theme.bullish = config.bullishColor;
          if (config.bearishColor) theme.bearish = config.bearishColor;
          if (config.bollingerBandColor) {
            theme.upperBand = config.bollingerBandColor;
            theme.lowerBand = config.bollingerBandColor;
            theme.bandFill = config.bollingerBandColor.replace("rgb", "rgba").replace(")", ", 0.12)");
          }

          var layoutMode = config.layoutMode || "candlestick_bollinger";
          var showSMA = config.showMovingAverage !== false;
          var showBollinger = config.showBollingerEnvelope !== false;
          var showVolume = config.showVolumeSubchart !== false;
          var hudMode = config.hudMode || "full";
          var valFormat = config.valueFormat || "currency_precise";
          var chartTitle = config.chartTitleOverride || "";
          var chartSubtitle = config.chartSubtitleOverride || "";

          // Resolve Field Roles
          var dateDim = dims[0];
          if (config.dateDimOverride) {
            for (var d = 0; d < dims.length; d++) {
              if (dims[d].name === config.dateDimOverride) { dateDim = dims[d]; break; }
            }
          }

          var openMeas = meas[0];
          if (config.openMeasOverride) {
            for (var m1 = 0; m1 < meas.length; m1++) {
              if (meas[m1].name === config.openMeasOverride) { openMeas = meas[m1]; break; }
            }
          }

          var highMeas = meas.length > 1 ? meas[1] : openMeas;
          if (config.highMeasOverride) {
            for (var m2 = 0; m2 < meas.length; m2++) {
              if (meas[m2].name === config.highMeasOverride) { highMeas = meas[m2]; break; }
            }
          }

          var lowMeas = meas.length > 2 ? meas[2] : openMeas;
          if (config.lowMeasOverride) {
            for (var m3 = 0; m3 < meas.length; m3++) {
              if (meas[m3].name === config.lowMeasOverride) { lowMeas = meas[m3]; break; }
            }
          }

          var closeMeas = meas.length > 3 ? meas[3] : (meas.length > 1 ? meas[1] : openMeas);
          if (config.closeMeasOverride) {
            for (var m4 = 0; m4 < meas.length; m4++) {
              if (meas[m4].name === config.closeMeasOverride) { closeMeas = meas[m4]; break; }
            }
          }

          var volumeMeas = meas.length > 4 ? meas[4] : null;
          if (config.volumeMeasOverride) {
            for (var m5 = 0; m5 < meas.length; m5++) {
              if (meas[m5].name === config.volumeMeasOverride) { volumeMeas = meas[m5]; break; }
            }
          }

          // Parse Data Rows
          var candles = [];
          var allCloses = [];
          var totalVolume = 0;
          var periodHigh = -Infinity;
          var periodLow = Infinity;

          data.forEach(function (row, idx) {
            var dateCell = row[dateDim.name];
            var dateStr = dateCell ? (dateCell.rendered || dateCell.value) : ("T" + idx);
            var drills = dateCell ? dateCell.links : null;

            var openVal = (row[openMeas.name] && row[openMeas.name].value !== null) ? Number(row[openMeas.name].value) : 0;
            var highVal = (row[highMeas.name] && row[highMeas.name].value !== null) ? Number(row[highMeas.name].value) : openVal;
            var lowVal = (row[lowMeas.name] && row[lowMeas.name].value !== null) ? Number(row[lowMeas.name].value) : openVal;
            var closeVal = (row[closeMeas.name] && row[closeMeas.name].value !== null) ? Number(row[closeMeas.name].value) : openVal;
            var volVal = (volumeMeas && row[volumeMeas.name] && row[volumeMeas.name].value !== null) ? Number(row[volumeMeas.name].value) : 0;

            if (isNaN(openVal) || isNaN(highVal) || isNaN(lowVal) || isNaN(closeVal)) return;

            // Normalize High / Low
            var trueHigh = Math.max(openVal, highVal, lowVal, closeVal);
            var trueLow = Math.min(openVal, highVal, lowVal, closeVal);

            if (trueHigh > periodHigh) periodHigh = trueHigh;
            if (trueLow < periodLow) periodLow = trueLow;
            allCloses.push(closeVal);
            totalVolume += volVal;

            candles.push({
              index: idx,
              dateStr: dateStr,
              dateObj: new Date(dateStr),
              open: openVal,
              high: trueHigh,
              low: trueLow,
              close: closeVal,
              volume: volVal,
              isBullish: closeVal >= openVal,
              drills: drills,
              rawRow: row
            });
          });

          if (candles.length === 0) {
            self.addError({ title: "No Valid Candles", message: "Could not parse valid OHLC numeric values." });
            done();
            return;
          }

          // Heikin-Ashi Transformation if selected
          if (layoutMode === "heikin_ashi") {
            var prevHaOpen = candles[0].open;
            var prevHaClose = candles[0].close;

            candles.forEach(function (c, idx) {
              var haClose = (c.open + c.high + c.low + c.close) / 4;
              var haOpen = idx === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
              var haHigh = Math.max(c.high, haOpen, haClose);
              var haLow = Math.min(c.low, haOpen, haClose);

              c.origOpen = c.open;
              c.origClose = c.close;
              c.open = haOpen;
              c.close = haClose;
              c.high = haHigh;
              c.low = haLow;
              c.isBullish = haClose >= haOpen;

              prevHaOpen = haOpen;
              prevHaClose = haClose;
            });
          }

          // Compute Bollinger Bands & Moving Average
          var bPeriod = parseInt(config.bollingerPeriod || "20", 10) || 20;
          var bStdDev = parseFloat(config.bollingerStdDev || "2.0") || 2.0;

          candles.forEach(function (c, i) {
            if (i < bPeriod - 1) {
              c.sma = null;
              c.upperBand = null;
              c.lowerBand = null;
              c.bandwidth = null;
              c.percentB = null;
            } else {
              var windowSlice = candles.slice(i - bPeriod + 1, i + 1);
              var sum = 0;
              for (var k = 0; k < windowSlice.length; k++) { sum += windowSlice[k].close; }
              var mean = sum / bPeriod;

              var varianceSum = 0;
              for (var j = 0; j < windowSlice.length; j++) {
                varianceSum += Math.pow(windowSlice[j].close - mean, 2);
              }
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
            }
          });

          // Reference Target Calculation
          var targetMode = config.targetMode || "dataset_mean";
          var targetVal = null;
          if (targetMode === "dataset_mean" && allCloses.length > 0) {
            targetVal = allCloses.reduce(function (a, b) { return a + b; }, 0) / allCloses.length;
          } else if (targetMode === "dataset_median" && allCloses.length > 0) {
            var sorted = allCloses.slice().sort(function (a, b) { return a - b; });
            var mid = Math.floor(sorted.length / 2);
            targetVal = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
          } else if (targetMode === "period_high") {
            targetVal = periodHigh;
          } else if (targetMode === "period_low") {
            targetVal = periodLow;
          } else if (targetMode === "fixed_value") {
            targetVal = Number(config.targetValue) || 0;
          }

          var firstClose = candles[0].close;
          var lastCandle = candles[candles.length - 1];
          var lastClose = lastCandle.close;
          var totalReturnPct = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
          var isNetBullish = totalReturnPct >= 0;

          // Build UI Containers
          var rootBox = document.createElement("div");
          rootBox.style.display = "flex";
          rootBox.style.flexDirection = "column";
          rootBox.style.width = "100%";
          rootBox.style.height = "100%";
          rootBox.style.background = theme.bg;
          rootBox.style.color = theme.text;
          rootBox.style.boxSizing = "border-box";
          rootBox.style.overflow = "hidden";

          // Header: Title Override
          if (chartTitle) {
            var titleBox = document.createElement("div");
            titleBox.style.padding = "10px 18px 4px 18px";
            titleBox.style.background = theme.hudBg;
            titleBox.style.borderBottom = "1px solid " + theme.border;
            titleBox.innerHTML =
              "<div style=\"font-size: 15px; font-weight: 700; color: " + theme.text + ";\">" + chartTitle + "</div>" +
              (chartSubtitle ? "<div style=\"font-size: 11.5px; color: " + theme.subtext + "; margin-top: 2px;\">" + chartSubtitle + "</div>" : "");
            rootBox.appendChild(titleBox);
          }

          // HUD Scorecard
          if (hudMode !== "hidden") {
            var hudStrip = document.createElement("div");
            hudStrip.style.display = "flex";
            hudStrip.style.alignItems = "center";
            hudStrip.style.justifyContent = "space-between";
            hudStrip.style.padding = "8px 18px";
            hudStrip.style.background = theme.hudBg;
            hudStrip.style.borderBottom = "1px solid " + theme.border;
            hudStrip.style.flexWrap = "wrap";
            hudStrip.style.gap = "12px";

            if (hudMode === "full") {
              var hudLeft = document.createElement("div");
              hudLeft.style.display = "flex";
              hudLeft.style.alignItems = "center";
              hudLeft.style.gap = "18px";
              hudLeft.style.flexWrap = "wrap";

              // Last Close KPI
              var kpiLastClose = document.createElement("div");
              kpiLastClose.innerHTML =
                "<div style=\"font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Latest Close</div>" +
                "<div style=\"font-size: 16px; font-weight: 800; color: " + (lastCandle.isBullish ? theme.bullish : theme.bearish) + ";\">" + formatPrice(lastClose, valFormat) + "</div>";
              hudLeft.appendChild(kpiLastClose);

              // 90D Trend Return KPI
              var kpiReturn = document.createElement("div");
              kpiReturn.style.borderLeft = "1px solid " + theme.border;
              kpiReturn.style.paddingLeft = "16px";
              kpiReturn.innerHTML =
                "<div style=\"font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Period Return</div>" +
                "<div style=\"font-size: 16px; font-weight: 800; color: " + (isNetBullish ? theme.bullish : theme.bearish) + ";\">" + (isNetBullish ? "+" : "") + totalReturnPct.toFixed(2) + "%</div>";
              hudLeft.appendChild(kpiReturn);

              // Period Range KPI
              var kpiRange = document.createElement("div");
              kpiRange.style.borderLeft = "1px solid " + theme.border;
              kpiRange.style.paddingLeft = "16px";
              kpiRange.innerHTML =
                "<div style=\"font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Period Range (Low &bull; High)</div>" +
                "<div style=\"font-size: 14px; font-weight: 700; color: " + theme.text + ";\">" + formatPrice(periodLow, valFormat) + " &ndash; " + formatPrice(periodHigh, valFormat) + "</div>";
              hudLeft.appendChild(kpiRange);

              // Volatility State
              if (lastCandle.bandwidth !== null) {
                var isSqueeze = lastCandle.bandwidth < (Number(config.anomalyAlertThreshold) || 15);
                var kpiVolatility = document.createElement("div");
                kpiVolatility.style.borderLeft = "1px solid " + theme.border;
                kpiVolatility.style.paddingLeft = "16px";
                kpiVolatility.innerHTML =
                  "<div style=\"font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Bollinger Bandwidth</div>" +
                  "<div style=\"font-size: 14px; font-weight: 700; color: " + (isSqueeze ? "#f59e0b" : theme.sma) + ";\">" + lastCandle.bandwidth.toFixed(1) + "% <span style=\"font-size: 11px; font-weight: 600;\">(" + (isSqueeze ? "⚠️ Squeeze" : "Normal") + ")</span></div>";
                hudLeft.appendChild(kpiVolatility);
              }

              hudStrip.appendChild(hudLeft);

              // HUD Right: Volume Total
              if (volumeMeas) {
                var hudRight = document.createElement("div");
                hudRight.innerHTML =
                  "<div style=\"font-size: 10px; font-weight: 700; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px; text-align: right;\">Aggregated Volume</div>" +
                  "<div style=\"font-size: 15px; font-weight: 700; color: " + theme.text + "; text-align: right;\">" + formatVolume(totalVolume) + " units</div>";
                hudStrip.appendChild(hudRight);
              }
            } else {
              // compact
              hudStrip.innerHTML =
                "<div style=\"font-size: 12px; font-weight: 600; color: " + theme.subtext + ";\">" +
                "Close: <strong style=\"color:" + (lastCandle.isBullish ? theme.bullish : theme.bearish) + ";\">" + formatPrice(lastClose, valFormat) + "</strong> (" + (isNetBullish ? "+" : "") + totalReturnPct.toFixed(2) + "%) &bull; " +
                "Range: <strong>" + formatPrice(periodLow, valFormat) + " - " + formatPrice(periodHigh, valFormat) + "</strong> &bull; " +
                "Candles: <strong>" + candles.length + "</strong>" +
                "</div>";
            }
            rootBox.appendChild(hudStrip);
          }

          // Main Chart Canvas Container
          var chartContainer = document.createElement("div");
          chartContainer.style.flex = "1";
          chartContainer.style.width = "100%";
          chartContainer.style.position = "relative";
          chartContainer.style.overflow = "hidden";
          rootBox.appendChild(chartContainer);
          container.appendChild(rootBox);

          // Render SVG with D3
          function drawChart() {
            var width = chartContainer.clientWidth || element.clientWidth || 800;
            var height = chartContainer.clientHeight || 450;
            if (width < 50 || height < 50) return;

            chartContainer.innerHTML = "";

            var margin = { top: 20, right: 65, bottom: 25, left: 65 };
            var innerWidth = width - margin.left - margin.right;
            var totalInnerHeight = height - margin.top - margin.bottom;

            var volumeHeight = (showVolume && volumeMeas) ? Math.max(60, Math.floor(totalInnerHeight * 0.22)) : 0;
            var gapHeight = (showVolume && volumeMeas) ? 15 : 0;
            var priceHeight = totalInnerHeight - volumeHeight - gapHeight;

            var svg = d3.select(chartContainer).append("svg")
              .attr("width", width)
              .attr("height", height)
              .style("display", "block");

            // Define Clip Path
            svg.append("defs").append("clipPath")
              .attr("id", "candlestick-clip")
              .append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", innerWidth)
              .attr("height", priceHeight);

            var mainG = svg.append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Scales
            var xScale = d3.scaleBand()
              .domain(candles.map(function (c) { return c.dateStr; }))
              .range([0, innerWidth])
              .padding(0.3);

            // Compute Y-Domain for Price
            var yMin = d3.min(candles, function (c) {
              return Math.min(c.low, c.lowerBand !== null ? c.lowerBand : c.low);
            });
            var yMax = d3.max(candles, function (c) {
              return Math.max(c.high, c.upperBand !== null ? c.upperBand : c.high);
            });
            if (targetVal !== null) {
              yMin = Math.min(yMin, targetVal);
              yMax = Math.max(yMax, targetVal);
            }
            var yPadding = (yMax - yMin) * 0.05 || 0.1;
            var yScale = d3.scaleLinear()
              .domain([yMin - yPadding, yMax + yPadding])
              .range([priceHeight, 0]);

            // Grid Lines
            mainG.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid)
              .attr("stroke-dasharray", "3,3");

            // X Axis
            var xTickStep = Math.max(1, Math.floor(candles.length / 8));
            var xTicks = candles.filter(function (_, idx) { return idx % xTickStep === 0; }).map(function (c) { return c.dateStr; });
            var xAxis = d3.axisBottom(xScale).tickValues(xTicks);

            var xAxisG = mainG.append("g")
              .attr("transform", "translate(0," + (priceHeight + gapHeight + volumeHeight) + ")")
              .call(xAxis);

            xAxisG.select(".domain").attr("stroke", theme.border);
            xAxisG.selectAll(".tick line").attr("stroke", theme.border);
            xAxisG.selectAll(".tick text")
              .attr("fill", theme.subtext)
              .style("font-size", "11px");

            // Y Axis Left (Price)
            var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatPrice(d, valFormat); });
            var yAxisG = mainG.append("g").call(yAxis);
            yAxisG.select(".domain").attr("stroke", theme.border);
            yAxisG.selectAll(".tick line").attr("stroke", theme.border);
            yAxisG.selectAll(".tick text")
              .attr("fill", theme.text)
              .style("font-size", "11px")
              .style("font-weight", "600");

            // Content Group with Clip Path
            var contentG = mainG.append("g").attr("clip-path", "url(#candlestick-clip)");

            // Bollinger Envelope Bands (Shaded Ribbon)
            if (showBollinger) {
              var validBollingerCandles = candles.filter(function (c) { return c.upperBand !== null && c.lowerBand !== null; });

              if (validBollingerCandles.length > 0) {
                var bandArea = d3.area()
                  .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                  .y0(function (c) { return yScale(c.lowerBand); })
                  .y1(function (c) { return yScale(c.upperBand); })
                  .curve(d3.curveMonotoneX);

                contentG.append("path")
                  .datum(validBollingerCandles)
                  .attr("fill", theme.bandFill)
                  .attr("d", bandArea);

                var upperLine = d3.line()
                  .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                  .y(function (c) { return yScale(c.upperBand); })
                  .curve(d3.curveMonotoneX);

                var lowerLine = d3.line()
                  .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                  .y(function (c) { return yScale(c.lowerBand); })
                  .curve(d3.curveMonotoneX);

                contentG.append("path")
                  .datum(validBollingerCandles)
                  .attr("fill", "none")
                  .attr("stroke", theme.upperBand)
                  .attr("stroke-width", 1.2)
                  .attr("stroke-dasharray", "4,2")
                  .attr("d", upperLine);

                contentG.append("path")
                  .datum(validBollingerCandles)
                  .attr("fill", "none")
                  .attr("stroke", theme.lowerBand)
                  .attr("stroke-width", 1.2)
                  .attr("stroke-dasharray", "4,2")
                  .attr("d", lowerLine);
              }
            }

            // SMA Line
            if (showSMA) {
              var validSMACandles = candles.filter(function (c) { return c.sma !== null; });
              if (validSMACandles.length > 0) {
                var smaLine = d3.line()
                  .x(function (c) { return xScale(c.dateStr) + xScale.bandwidth() / 2; })
                  .y(function (c) { return yScale(c.sma); })
                  .curve(d3.curveMonotoneX);

                contentG.append("path")
                  .datum(validSMACandles)
                  .attr("fill", "none")
                  .attr("stroke", theme.sma)
                  .attr("stroke-width", 2)
                  .attr("d", smaLine);
              }
            }

            // Benchmark Reference Line
            if (targetMode !== "none" && targetVal !== null) {
              contentG.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", yScale(targetVal))
                .attr("y2", yScale(targetVal))
                .attr("stroke", theme.subtext)
                .attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.75);

              contentG.append("text")
                .attr("x", innerWidth - 6)
                .attr("y", yScale(targetVal) - 6)
                .attr("text-anchor", "end")
                .attr("fill", theme.subtext)
                .style("font-size", "10.5px")
                .style("font-weight", "700")
                .text((config.targetLabel || "Benchmark") + ": " + formatPrice(targetVal, valFormat));
            }

            // Candlesticks / OHLC Bars
            var candleG = contentG.selectAll(".candle-item")
              .data(candles)
              .enter()
              .append("g")
              .attr("class", "candle-item")
              .attr("transform", function (c) { return "translate(" + xScale(c.dateStr) + ",0)"; })
              .style("cursor", "pointer");

            var candleWidth = Math.max(2, xScale.bandwidth());

            if (layoutMode === "ohlc_bars") {
              // High-Low vertical stem
              candleG.append("line")
                .attr("x1", candleWidth / 2)
                .attr("x2", candleWidth / 2)
                .attr("y1", function (c) { return yScale(c.high); })
                .attr("y2", function (c) { return yScale(c.low); })
                .attr("stroke", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke-width", 1.8);

              // Left tick (Open)
              candleG.append("line")
                .attr("x1", 0)
                .attr("x2", candleWidth / 2)
                .attr("y1", function (c) { return yScale(c.open); })
                .attr("y2", function (c) { return yScale(c.open); })
                .attr("stroke", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke-width", 1.8);

              // Right tick (Close)
              candleG.append("line")
                .attr("x1", candleWidth / 2)
                .attr("x2", candleWidth)
                .attr("y1", function (c) { return yScale(c.close); })
                .attr("y2", function (c) { return yScale(c.close); })
                .attr("stroke", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke-width", 1.8);

            } else {
              // Japanese Candlesticks (Classic or Heikin-Ashi)
              // Wicks
              candleG.append("line")
                .attr("x1", candleWidth / 2)
                .attr("x2", candleWidth / 2)
                .attr("y1", function (c) { return yScale(c.high); })
                .attr("y2", function (c) { return yScale(c.low); })
                .attr("stroke", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke-width", 1.2);

              // Candle Real Body
              candleG.append("rect")
                .attr("x", 0)
                .attr("width", candleWidth)
                .attr("y", function (c) { return yScale(Math.max(c.open, c.close)); })
                .attr("height", function (c) {
                  return Math.max(1.5, Math.abs(yScale(c.open) - yScale(c.close)));
                })
                .attr("fill", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke", function (c) { return c.isBullish ? theme.bullish : theme.bearish; })
                .attr("stroke-width", 1)
                .attr("rx", 1);
            }

            // Drill Menus on Candle Click
            candleG.on("click", function (event, c) {
              if (c.drills && c.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({ links: c.drills, event: event });
              }
            });

            // Volume Sub-Chart Panel
            if (showVolume && volumeMeas) {
              var volY = priceHeight + gapHeight;
              var volG = mainG.append("g").attr("transform", "translate(0," + volY + ")");

              // Separator line
              volG.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("stroke", theme.border);

              volG.append("text")
                .attr("x", 0)
                .attr("y", -4)
                .attr("fill", theme.subtext)
                .style("font-size", "10px")
                .style("font-weight", "700")
                .style("text-transform", "uppercase")
                .text("Trading Volume (DEX Units)");

              var maxVol = d3.max(candles, function (c) { return c.volume; }) || 1;
              var volScale = d3.scaleLinear()
                .domain([0, maxVol * 1.05])
                .range([volumeHeight, 0]);

              var volAxis = d3.axisLeft(volScale).ticks(3).tickFormat(function (d) { return formatVolume(d); });
              var volAxisG = volG.append("g").call(volAxis);
              volAxisG.select(".domain").attr("stroke", theme.border);
              volAxisG.selectAll(".tick line").attr("stroke", theme.border);
              volAxisG.selectAll(".tick text")
                .attr("fill", theme.subtext)
                .style("font-size", "10px");

              volG.selectAll(".vol-bar")
                .data(candles)
                .enter()
                .append("rect")
                .attr("class", "vol-bar")
                .attr("x", function (c) { return xScale(c.dateStr); })
                .attr("width", candleWidth)
                .attr("y", function (c) { return volScale(c.volume); })
                .attr("height", function (c) { return Math.max(0, volumeHeight - volScale(c.volume)); })
                .attr("fill", function (c) { return c.isBullish ? theme.volumeBull : theme.volumeBear; })
                .attr("rx", 1);
            }

            // Crosshair Scrubber & Floating Tooltip Card
            var crosshairLine = mainG.append("line")
              .attr("stroke", theme.crosshair)
              .attr("stroke-width", 1.2)
              .attr("stroke-dasharray", "3,3")
              .attr("y1", 0)
              .attr("y2", priceHeight + (showVolume ? gapHeight + volumeHeight : 0))
              .style("opacity", 0)
              .style("pointer-events", "none");

            var tooltip = d3.select(chartContainer).append("div")
              .style("position", "absolute")
              .style("background", "rgba(15, 23, 42, 0.92)")
              .style("backdrop-filter", "blur(6px)")
              .style("color", "#f8fafc")
              .style("padding", "10px 14px")
              .style("border-radius", "8px")
              .style("border", "1px solid rgba(255, 255, 255, 0.15)")
              .style("box-shadow", "0 4px 14px rgba(0,0,0,0.25)")
              .style("font-size", "11.5px")
              .style("line-height", "1.4")
              .style("pointer-events", "none")
              .style("opacity", 0)
              .style("z-index", 100);

            // Overlay for Mouse Tracking
            mainG.append("rect")
              .attr("width", innerWidth)
              .attr("height", priceHeight + (showVolume ? gapHeight + volumeHeight : 0))
              .attr("fill", "transparent")
              .on("mousemove", function (event) {
                var coords = d3.pointer(event);
                var mouseX = coords[0];

                // Find closest candle by index
                var eachBand = innerWidth / candles.length;
                var candleIdx = Math.floor(mouseX / eachBand);
                candleIdx = Math.max(0, Math.min(candles.length - 1, candleIdx));
                var c = candles[candleIdx];

                var cx = xScale(c.dateStr) + candleWidth / 2;
                crosshairLine
                  .attr("x1", cx)
                  .attr("x2", cx)
                  .style("opacity", 1);

                var changePct = ((c.close - c.open) / c.open) * 100;
                var changeSign = changePct >= 0 ? "+" : "";
                var changeColor = c.isBullish ? "#34d399" : "#f87171";

                var tooltipHtml =
                  "<div style=\"font-size: 12.5px; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px; margin-bottom: 6px;\">" +
                  "📅 " + c.dateStr +
                  "</div>" +
                  "<div style=\"display: grid; grid-template-columns: auto auto; gap: 4px 16px;\">" +
                  "  <span style=\"color:#94a3b8;\">Open:</span><span style=\"font-weight:700; text-align:right;\">" + formatPrice(c.open, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">High:</span><span style=\"font-weight:700; text-align:right; color:#34d399;\">" + formatPrice(c.high, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Low:</span><span style=\"font-weight:700; text-align:right; color:#f87171;\">" + formatPrice(c.low, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Close:</span><span style=\"font-weight:700; text-align:right;\">" + formatPrice(c.close, valFormat) + "</span>" +
                  "  <span style=\"color:#94a3b8;\">Net Change:</span><span style=\"font-weight:800; text-align:right; color:" + changeColor + ";\">" + changeSign + changePct.toFixed(2) + "%</span>" +
                  (volumeMeas ? "  <span style=\"color:#94a3b8;\">Volume:</span><span style=\"font-weight:700; text-align:right;\">" + formatVolume(c.volume) + "</span>" : "") +
                  (c.sma !== null ? "  <span style=\"color:#94a3b8;\">20-SMA:</span><span style=\"font-weight:700; text-align:right; color:#38bdf8;\">" + formatPrice(c.sma, valFormat) + "</span>" : "") +
                  (c.upperBand !== null ? "  <span style=\"color:#94a3b8;\">Bollinger Upper:</span><span style=\"font-weight:700; text-align:right;\">" + formatPrice(c.upperBand, valFormat) + "</span>" : "") +
                  (c.lowerBand !== null ? "  <span style=\"color:#94a3b8;\">Bollinger Lower:</span><span style=\"font-weight:700; text-align:right;\">" + formatPrice(c.lowerBand, valFormat) + "</span>" : "") +
                  (c.bandwidth !== null ? "  <span style=\"color:#94a3b8;\">%B Bandwidth:</span><span style=\"font-weight:700; text-align:right;\">" + c.bandwidth.toFixed(1) + "%</span>" : "") +
                  "</div>";

                tooltip.html(tooltipHtml).style("opacity", 1);

                // Tooltip positioning
                var tipW = 210;
                var leftPos = margin.left + cx + 15;
                if (leftPos + tipW > width) {
                  leftPos = margin.left + cx - tipW - 15;
                }
                tooltip
                  .style("left", Math.max(10, leftPos) + "px")
                  .style("top", (margin.top + 15) + "px");
              })
              .on("mouseleave", function () {
                crosshairLine.style("opacity", 0);
                tooltip.style("opacity", 0);
              });
          }

          drawChart();

          // Responsive Debounced ResizeObserver (<4px guard)
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
          self.addError({
            title: "Render Error",
            message: err.message
          });
          done();
        }
      });
    }
  });
})();
