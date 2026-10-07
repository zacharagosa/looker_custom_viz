/**
 * Raincloud Plot (Half-Violin KDE + Boxplot + Jittered Beeswarm) - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Combines three essential statistical views:
 *   1. "The Cloud": Smooth Half-Violin Kernel Density Estimation (KDE) showing the continuous probability distribution.
 *   2. "The Umbrella": Compact aligned Boxplot showing Median, Interquartile Range (IQR Q1-Q3), and Whiskers (1.5*IQR).
 *   3. "The Rain": Individual jittered observation dots (beeswarm/strip) revealing sample size, raw density, and outliers.
 *
 * Multi-Modal Layout View Modes:
 *   - "horizontal_split" (Default): Horizontal Raincloud (Cloud top, Boxplot middle, Rain dots bottom).
 *   - "vertical_columns": Vertical Columns (Cloud left, Boxplot center, Rain dots right).
 *   - "cloud_boxplot": Cloud + Boxplot Only (Executive high-density distribution mode).
 *   - "rain_strip": Jittered Beeswarm / Strip Plot with Mean & IQR overlay.
 *
 * Performance & Architecture:
 *   - O(N) client-side aggregation handling 5,000+ raw observations.
 *   - Deterministic hash-based jitter so point positions never jump on re-renders.
 *   - Debounced ResizeObserver with <4px height-delta guard.
 *   - Strict 2-tab configuration limit ("Display" and "Style").
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
      name: "Google Enterprise Blue",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#1e293b",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      benchmarkLine: "#2563eb",
      palette: ["#2563eb", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#7c3aed"]
    },
    indigo_violet: {
      name: "Executive Indigo",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#059669",
      negative: "#dc2626",
      benchmarkLine: "#4f46e5",
      palette: ["#4f46e5", "#7c3aed", "#2563eb", "#0284c7", "#059669", "#d97706", "#dc2626", "#475569"]
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      benchmarkLine: "#334155",
      palette: ["#334155", "#475569", "#64748b", "#2563eb", "#0284c7", "#059669", "#d97706", "#9333ea"]
    },
    cyberpunk_neon: {
      name: "Cyberpunk Dark (Neon)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      positive: "#00f0ff",
      negative: "#ff0055",
      benchmarkLine: "#f59e0b",
      palette: ["#00f0ff", "#a855f7", "#ff0055", "#22c55e", "#eab308", "#3b82f6", "#ec4899", "#14b8a6"]
    },
    emerald_teal: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#bbf7d0",
      positive: "#059669",
      negative: "#dc2626",
      benchmarkLine: "#047857",
      palette: ["#059669", "#0d9488", "#10b981", "#0284c7", "#6366f1", "#84cc16", "#eab308", "#14b8a6"]
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      grid: "#ffedd5",
      positive: "#059669",
      negative: "#dc2626",
      benchmarkLine: "#ea580c",
      palette: ["#ea580c", "#d97706", "#f59e0b", "#e11d48", "#7c2d12", "#9333ea", "#0284c7", "#16a34a"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0f9ff",
      border: "#bae6fd",
      text: "#0c4a6e",
      subtext: "#0369a1",
      grid: "#e0f2fe",
      positive: "#006B40",
      negative: "#B42318",
      benchmarkLine: "#0284c7",
      palette: ["#0284c7", "#006B40", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#143359"]
    },
    custom_override: {
      name: "Custom Hex Override",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      benchmarkLine: "#2563eb",
      palette: ["#2563eb", "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#475569"]
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
    return list[defaultIdx] || list[0];
  }

  function hashString(str) {
    var hash = 0;
    if (!str || str.length === 0) return 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function formatValue(val, formatType, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (formatType === "auto" && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    switch (formatType) {
      case "percentage":
      case "percent":
        return sign + (abs < 1 && abs > 0 ? (abs * 100).toFixed(1) : abs.toFixed(1)) + "%";
      case "compact_number":
      case "compact_num":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
    }
  }

  function computeSilvermanBandwidth(data) {
    var n = data.length;
    if (n < 2) return 1.0;
    var mean = data.reduce(function (a, b) { return a + b; }, 0) / n;
    var variance = data.reduce(function (sum, x) { return sum + Math.pow(x - mean, 2); }, 0) / (n - 1);
    var std = Math.sqrt(variance);

    var sorted = data.slice().sort(function (a, b) { return a - b; });
    var q1 = sorted[Math.floor(0.25 * n)];
    var q3 = sorted[Math.floor(0.75 * n)];
    var iqr = q3 - q1;

    var a = (iqr > 0 && iqr / 1.34 < std) ? iqr / 1.34 : std;
    var h = 0.9 * a * Math.pow(n, -0.2);
    return Math.max(h, 0.001);
  }

  function computeKDE(data, samplePoints, bandwidth) {
    var n = data.length;
    var invH = 1.0 / bandwidth;
    var invSqrt2Pi = 1.0 / Math.sqrt(2 * Math.PI);
    var densities = [];

    for (var i = 0; i < samplePoints.length; i++) {
      var x = samplePoints[i];
      var kSum = 0.0;
      for (var j = 0; j < n; j++) {
        var u = (x - data[j]) * invH;
        if (Math.abs(u) < 4.0) {
          kSum += invSqrt2Pi * Math.exp(-0.5 * u * u);
        }
      }
      densities.push(kSum / (n * bandwidth));
    }
    return densities;
  }

  looker.plugins.visualizations.add({
    id: "raincloud_plot",
    label: "Raincloud Plot (Half-Violin KDE + Boxplot + Jittered Beeswarm)",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Raincloud Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Horizontal Raincloud (Cloud Top, Rain Bottom)": "horizontal_split" },
          { "Vertical Columns (Cloud Left, Rain Right)": "vertical_columns" },
          { "Cloud + Boxplot Only (Executive Density)": "cloud_boxplot" },
          { "Jittered Beeswarm Strip with Mean/IQR Overlay": "rain_strip" }
        ],
        default: "horizontal_split"
      },
      categoryDimOverride: {
        type: "string",
        label: "Category Dimension (e.g. MITRE Tactic)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      observationDimOverride: {
        type: "string",
        label: "Observation Dimension (e.g. Incident ID)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      metricMeasureOverride: {
        type: "string",
        label: "Continuous Metric Measure (e.g. MTTR / Latency)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      sizeMeasureOverride: {
        type: "string",
        label: "Point Size Measure (Optional, e.g. Alert Count)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        display: "select",
        values: [
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Benchmark Value": "fixed" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "Target Measure Column": "measure_column" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 6
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value (when Fixed Mode, 0 = Auto)",
        default: 0,
        section: "Display",
        order: 7
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line & Benchmark Label",
        default: "Benchmark Target",
        section: "Display",
        order: 8
      },
      bandwidthMode: {
        type: "string",
        label: "KDE Smoothing Bandwidth",
        display: "select",
        values: [
          { "Silverman Rule-of-Thumb (Balanced)": "silverman" },
          { "Scott Rule": "scott" },
          { "Smooth (Wide Bandwidth x1.5)": "smooth" },
          { "Fine (Narrow Detail x0.7)": "fine" }
        ],
        default: "silverman",
        section: "Display",
        order: 9
      },
      jitterAmount: {
        type: "string",
        label: "Rain Dot Jitter Spread",
        display: "select",
        values: [
          { "Standard Jitter": "standard" },
          { "Compact Spread": "compact" },
          { "Wide Spread": "wide" }
        ],
        default: "standard",
        section: "Display",
        order: 10
      },
      pointRadius: {
        type: "number",
        label: "Rain Dot Radius (px)",
        display: "range",
        min: 2,
        max: 8,
        step: 0.5,
        default: 3.5,
        section: "Display",
        order: 11
      },
      pointOpacity: {
        type: "number",
        label: "Rain Dot Opacity",
        display: "range",
        min: 0.1,
        max: 1.0,
        step: 0.05,
        default: 0.65,
        section: "Display",
        order: 12
      },
      outlierThreshold: {
        type: "string",
        label: "Axis Zoom & Outlier Trimming",
        display: "select",
        values: [
          { "Tukey Fences (+1.5 IQR Zoom)": "tukey_fence" },
          { "99th Percentile P99 Zoom": "p99" },
          { "Full Raw Domain (Includes Extreme Outliers)": "full_domain" }
        ],
        default: "tukey_fence",
        section: "Display",
        order: 13
      },
      sortBy: {
        type: "string",
        label: "Category Sorting Order",
        display: "select",
        values: [
          { "Median (Descending)": "median_desc" },
          { "Median (Ascending)": "median_asc" },
          { "IQR Spread (Highest Dispersion First)": "iqr_desc" },
          { "Observation Count (Largest Sample First)": "count_desc" },
          { "Alphabetical": "alphabetical" },
          { "Natural / Natural Order": "natural" }
        ],
        default: "median_desc",
        section: "Display",
        order: 14
      },
      topNLimit: {
        type: "number",
        label: "Top-N Categories Display Limit (0 = All)",
        default: 0,
        section: "Display",
        order: 15
      },
      rollupOther: {
        type: "boolean",
        label: "Rollup Unselected into 'Other' Category",
        default: false,
        section: "Display",
        order: 16
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Data Observations",
        default: true,
        section: "Display",
        order: 17
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 18
      },
      showValueLabels: {
        type: "string",
        label: "Statistical Summary Labels",
        display: "select",
        values: [
          { "Show All (Median, IQR, Count)": "all" },
          { "Median Value Only": "median_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Category Search Bar",
        default: true,
        section: "Display",
        order: 20
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 21
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 22
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
          { "Google Enterprise Blue": "google_enterprise" },
          { "Executive Indigo": "indigo_violet" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Neon)": "cyberpunk_neon" },
          { "Emerald FinOps": "emerald_teal" },
          { "Sunset Media (Warm Amber)": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Brand Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Benchmark / Positive Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Outlier / Anomaly Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Lower is Better (MTTR, Latency, Defect Rate, Cost)": "lower_is_better" },
          { "Higher is Better (Throughput, Revenue, Score)": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 5
      },
      cloudFillOpacity: {
        type: "number",
        label: "Density Cloud Fill Opacity",
        display: "range",
        min: 0.1,
        max: 0.8,
        step: 0.05,
        default: 0.45,
        section: "Style",
        order: 6
      },
      boxplotColorMode: {
        type: "string",
        label: "Boxplot Visual Styling",
        display: "select",
        values: [
          { "Match Category Brand Color": "match_category" },
          { "Neutral Monochrome Slate": "slate_monochrome" },
          { "High Contrast Black/White": "high_contrast" }
        ],
        default: "match_category",
        section: "Style",
        order: 7
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        display: "select",
        values: [
          { "Compact (High Density Dashboard)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 8
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        display: "select",
        values: [
          { "Auto (Looker / Contextual)": "auto" },
          { "Compact Number (1.2M, 450K)": "compact_number" },
          { "Compact Currency (.2M, 50K)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 9
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
        categoryDimOverride: { role: "dimension", defaultIdx: 0 },
        observationDimOverride: { role: "dimension", defaultIdx: 1 },
        metricMeasureOverride: { role: "measure", defaultIdx: 0 },
        sizeMeasureOverride: { role: "measure", defaultIdx: -1 }
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
      this._container = document.createElement("div");
      this._container.className = "raincloud-plot-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.overflow = "auto";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Create floating tooltip
      this._tooltip = document.createElement("div");
      this._tooltip.className = "raincloud-plot-tooltip";
      this._tooltip.style.position = "fixed";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.display = "none";
      this._tooltip.style.zIndex = "999999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      this._tooltip.style.transition = "opacity 0.12s ease-out";
      document.body.appendChild(this._tooltip);

      this._searchFilter = "";
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
      this._registerDynamicFieldOptions(queryResponse);
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

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        this._container = document.createElement("div");
        this._container.className = "raincloud-plot-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.overflow = "auto";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      this.clearErrors();

      if (!queryResponse || !queryResponse.fields) {
        done();
        return;
      }

      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }

      if (dimensions.length < 1 || (dimensions.length < 2 && measures.length < 1)) {
        this.addError({
          title: "Incompatible Data Fields",
          message: "Raincloud Plot requires at least 1 Category Dimension, 1 Observation Dimension (e.g. Incident ID / Order ID), and 1 Numeric Measure."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._renderChart(d3, data, config, queryResponse);
          done();
        } catch (err) {
          console.error("Raincloud Plot render error:", err);
          self.addError({
            title: "Render Error",
            message: err.message
          });
          done();
        }
      });
    },

    _renderChart: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var themeKey = config.colorPalette || "google_enterprise";
      var theme = THEMES[themeKey] || THEMES.google_enterprise;

      if (themeKey === "custom_override" || config.customPrimaryHex || config.customPositiveHex || config.customNegativeHex) {
        theme = Object.assign({}, theme);
        if (config.customPrimaryHex) {
          theme.palette = [config.customPrimaryHex, "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626"];
        }
        if (config.customPositiveHex) theme.positive = config.customPositiveHex;
        if (config.customNegativeHex) theme.negative = config.customNegativeHex;
      }

      var fontMultiplier = 1.0;
      if (config.fontScale === "compact") fontMultiplier = 0.88;
      else if (config.fontScale === "large") fontMultiplier = 1.18;

      container.style.background = theme.bg;
      container.style.color = theme.text;
      container.style.fontSize = (12 * fontMultiplier) + "px";

      // Field resolution
      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }

      var categoryDim = resolveField(dimensions, config.categoryDimOverride, 0);
      var obsDim = resolveField(dimensions, config.observationDimOverride, dimensions.length > 1 ? 1 : 0);
      var metricMeasure = resolveField(measures, config.metricMeasureOverride, 0);
      var sizeMeasure = config.sizeMeasureOverride ? resolveField(measures, config.sizeMeasureOverride, -1) : null;

      // Group observations by category
      var categoryMap = {};
      var allObservations = [];

      data.forEach(function (row) {
        var catCell = row[categoryDim.name];
        var catVal = (catCell && typeof catCell === "object") ? (catCell.value !== undefined ? catCell.value : catCell.rendered) : catCell;
        if (catVal === null || catVal === undefined || catVal === "") catVal = "Unspecified";
        catVal = String(catVal);

        var obsCell = obsDim ? row[obsDim.name] : null;
        var obsVal = (obsCell && typeof obsCell === "object") ? (obsCell.value !== undefined ? obsCell.value : obsCell.rendered) : obsCell;
        var obsId = (obsVal !== null && obsVal !== undefined && obsVal !== "") ? String(obsVal) : "Obs-" + allObservations.length;

        var mCell = row[metricMeasure.name];
        var mVal = null;
        var mRendered = null;
        if (mCell && typeof mCell === "object") {
          mVal = mCell.value !== undefined ? Number(mCell.value) : Number(mCell.rendered);
          mRendered = mCell.rendered;
        } else if (mCell !== null && mCell !== undefined) {
          mVal = Number(mCell);
        }

        if (mVal === null || isNaN(mVal)) return;
        if (config.suppressZeroNull && mVal === 0) return;

        var sizeVal = 1;
        if (sizeMeasure && row[sizeMeasure.name] !== undefined) {
          var sCell = row[sizeMeasure.name];
          var sVal = (sCell && typeof sCell === "object") ? Number(sCell.value) : Number(sCell);
          if (!isNaN(sVal) && sVal > 0) sizeVal = sVal;
        }

        var drillLinks = (mCell && mCell.links) ? mCell.links : ((obsCell && obsCell.links) ? obsCell.links : null);

        var obsObj = {
          id: obsId,
          category: catVal,
          val: mVal,
          rendered: mRendered,
          size: sizeVal,
          rawRow: row,
          links: drillLinks,
          jitterSeed: hashString(obsId + "_" + catVal)
        };

        if (!categoryMap[catVal]) {
          categoryMap[catVal] = [];
        }
        categoryMap[catVal].push(obsObj);
        allObservations.push(obsObj);
      });

      if (allObservations.length === 0) {
        container.innerHTML = "<div style='padding:24px; text-align:center; color:" + theme.subtext + ";'>No non-empty observations returned for Raincloud analysis.</div>";
        return;
      }

      // Filter by search keyword
      var categoryNames = Object.keys(categoryMap);
      if (self._searchFilter) {
        var query = self._searchFilter.toLowerCase();
        categoryNames = categoryNames.filter(function (name) {
          return name.toLowerCase().indexOf(query) !== -1;
        });
      }

      // Compute statistics per category
      var categoryStats = categoryNames.map(function (catName) {
        var obsList = categoryMap[catName];
        var vals = obsList.map(function (o) { return o.val; }).sort(function (a, b) { return a - b; });
        var n = vals.length;

        var mean = vals.reduce(function (a, b) { return a + b; }, 0) / n;
        var q1 = d3.quantile(vals, 0.25) || vals[0];
        var median = d3.quantile(vals, 0.50) || vals[Math.floor(n / 2)];
        var q3 = d3.quantile(vals, 0.75) || vals[n - 1];
        var iqr = q3 - q1;
        var lowerWhisker = Math.max(vals[0], q1 - 1.5 * iqr);
        var upperWhisker = Math.min(vals[n - 1], q3 + 1.5 * iqr);

        var outliers = obsList.filter(function (o) {
          return o.val < lowerWhisker || o.val > upperWhisker;
        });

        // Compute KDE
        var bwMode = config.bandwidthMode || "silverman";
        var baseBw = computeSilvermanBandwidth(vals);
        if (bwMode === "smooth") baseBw *= 1.5;
        else if (bwMode === "fine") baseBw *= 0.7;

        var sampleMin = lowerWhisker;
        var sampleMax = upperWhisker;
        if (config.outlierThreshold === "full_domain") {
          sampleMin = vals[0];
          sampleMax = vals[n - 1];
        }

        var numPoints = 40;
        var step = (sampleMax - sampleMin) / (numPoints - 1 || 1);
        var samplePoints = [];
        for (var i = 0; i < numPoints; i++) {
          samplePoints.push(sampleMin + i * step);
        }

        var densities = computeKDE(vals, samplePoints, Math.max(baseBw, 0.001));
        var maxDensity = Math.max.apply(null, densities) || 0.001;

        var kdeData = samplePoints.map(function (pt, idx) {
          return {
            x: pt,
            density: densities[idx],
            normDensity: densities[idx] / maxDensity
          };
        });

        return {
          name: catName,
          observations: obsList,
          values: vals,
          count: n,
          mean: mean,
          median: median,
          q1: q1,
          q3: q3,
          iqr: iqr,
          lowerWhisker: lowerWhisker,
          upperWhisker: upperWhisker,
          outliers: outliers,
          kdeData: kdeData,
          maxDensity: maxDensity
        };
      });

      // Sorting categories
      var sortBy = config.sortBy || "median_desc";
      if (sortBy === "median_desc") {
        categoryStats.sort(function (a, b) { return b.median - a.median; });
      } else if (sortBy === "median_asc") {
        categoryStats.sort(function (a, b) { return a.median - b.median; });
      } else if (sortBy === "iqr_desc") {
        categoryStats.sort(function (a, b) { return b.iqr - a.iqr; });
      } else if (sortBy === "count_desc") {
        categoryStats.sort(function (a, b) { return b.count - a.count; });
      } else if (sortBy === "alphabetical") {
        categoryStats.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N limiting
      var topN = config.topNLimit ? parseInt(config.topNLimit, 10) : 0;
      if (topN > 0 && categoryStats.length > topN) {
        categoryStats = categoryStats.slice(0, topN);
      }

      // Global benchmark target resolution
      var allValsSorted = allObservations.map(function (o) { return o.val; }).sort(function (a, b) { return a - b; });
      var globalMean = allValsSorted.reduce(function (a, b) { return a + b; }, 0) / (allValsSorted.length || 1);
      var globalMedian = d3.quantile(allValsSorted, 0.50) || 0;
      var globalP75 = d3.quantile(allValsSorted, 0.75) || 0;
      var globalP90 = d3.quantile(allValsSorted, 0.90) || 0;

      var benchmarkTarget = globalMean;
      var targetMode = config.targetCalculationMode || "dataset_mean";
      if (targetMode === "dataset_median") benchmarkTarget = globalMedian;
      else if (targetMode === "percentile_p75") benchmarkTarget = globalP75;
      else if (targetMode === "percentile_p90") benchmarkTarget = globalP90;
      else if (targetMode === "fixed") benchmarkTarget = config.fixedTargetValue || globalMean;

      // Executive Scorecard HUD (Top Band)
      if (config.hudMode !== "hidden") {
        var hudElem = document.createElement("div");
        hudElem.className = "raincloud-hud";
        hudElem.style.display = config.hudMode === "compact_strip" ? "flex" : "grid";
        hudElem.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
        hudElem.style.alignItems = "center";
        hudElem.style.gap = "10px";
        hudElem.style.padding = config.hudMode === "compact_strip" ? "6px 14px" : "12px 16px";
        hudElem.style.background = theme.cardBg;
        hudElem.style.borderBottom = "1px solid " + theme.border;
        hudElem.style.marginBottom = "12px";

        var titleText = config.customTitleOverride || (metricMeasure.label + " Raincloud Distribution");
        var subtitleText = config.customSubtitleOverride || ("Half-Violin Density + Boxplot + Observations • " + categoryStats.length + " Categories • " + allObservations.length.toLocaleString() + " Total Samples");

        var varianceVsTarget = benchmarkTarget > 0 ? ((globalMedian - benchmarkTarget) / benchmarkTarget) * 100 : 0;
        var varianceSign = varianceVsTarget >= 0 ? "+" : "";
        var isPositive = config.metricPolarity === "lower_is_better" ? varianceVsTarget <= 0 : varianceVsTarget >= 0;
        var varColor = isPositive ? (theme.isDark ? "#34d399" : "#059669") : (theme.isDark ? "#f87171" : "#dc2626");

        if (config.hudMode === "compact_strip") {
          hudElem.innerHTML =
            '<div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">' +
              '<span style="font-size:12px; font-weight:700; color:' + theme.text + ';">' + titleText + '</span>' +
              '<span style="font-size:10px; color:' + theme.subtext + ';">Total Observations: <strong>' + allObservations.length.toLocaleString() + '</strong></span>' +
              '<span style="font-size:10px; color:' + theme.subtext + ';">Global Median: <strong>' + formatValue(globalMedian, config.valueFormat || "auto") + '</strong></span>' +
              '<span style="font-size:10px; color:' + (theme.isDark ? "#38bdf8" : "#0284c7") + ';">' + (config.referenceLineLabel || "Target") + ': <strong>' + formatValue(benchmarkTarget, config.valueFormat || "auto") + '</strong></span>' +
            '</div>';
        } else {
          hudElem.innerHTML =
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">' + titleText + '</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + allObservations.length.toLocaleString() + ' <span style="font-size:11px; font-weight:500; color:' + theme.subtext + ';">samples</span></div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">' + subtitleText + '</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">Dataset Median</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + formatValue(globalMedian, config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">Mean: ' + formatValue(globalMean, config.valueFormat || "auto") + '</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">' + (config.referenceLineLabel || "Benchmark Target") + '</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + (theme.isDark ? "#38bdf8" : "#0284c7") + ';">' + formatValue(benchmarkTarget, config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; font-weight:700; color:' + varColor + ';">Median Variance: ' + varianceSign + varianceVsTarget.toFixed(1) + '%</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">Interquartile Range (P25 - P75)</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + formatValue(globalP75 - d3.quantile(allValsSorted, 0.25), config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">Spread Across ' + categoryStats.length + ' Categories</div>' +
            '</div>';
        }
        container.appendChild(hudElem);
      }

      // Interactive Search Bar
      if (config.showSearch !== false) {
        var searchToolbar = document.createElement("div");
        searchToolbar.style.display = "flex";
        searchToolbar.style.alignItems = "center";
        searchToolbar.style.justifyContent = "space-between";
        searchToolbar.style.gap = "12px";
        searchToolbar.style.padding = "6px 16px";
        searchToolbar.style.background = theme.cardBg;
        searchToolbar.style.borderBottom = "1px solid " + theme.border;

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search categories (e.g. Initial Access, Persistence...)";
        searchInput.value = self._searchFilter || "";
        searchInput.style.padding = "5px 10px";
        searchInput.style.fontSize = "11.5px";
        searchInput.style.borderRadius = "5px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.width = "280px";
        searchInput.style.outline = "none";

        searchInput.oninput = function (e) {
          self._searchFilter = e.target.value;
          self._renderChart(d3, data, config, queryResponse);
        };
        searchToolbar.appendChild(searchInput);

        var modeBadge = document.createElement("div");
        modeBadge.style.fontSize = "11px";
        modeBadge.style.fontWeight = "600";
        modeBadge.style.color = theme.subtext;
        modeBadge.innerHTML = "View: <strong>" + (config.viewMode || "Horizontal Raincloud") + "</strong> &bull; Polar: <strong>" + (config.metricPolarity === "lower_is_better" ? "Lower is Better" : "Higher is Better") + "</strong>";
        searchToolbar.appendChild(modeBadge);

        container.appendChild(searchToolbar);
      }

      // Main Chart Area
      var mainArea = document.createElement("div");
      mainArea.className = "raincloud-main-area";
      mainArea.style.padding = "16px";
      mainArea.style.boxSizing = "border-box";
      container.appendChild(mainArea);

      // Render Layout
      var viewMode = config.viewMode || "horizontal_split";

      if (viewMode === "vertical_columns") {
        self._renderVerticalRainclouds(d3, mainArea, categoryStats, theme, config, metricMeasure, benchmarkTarget, fontMultiplier);
      } else {
        self._renderHorizontalRainclouds(d3, mainArea, categoryStats, theme, config, metricMeasure, benchmarkTarget, fontMultiplier, viewMode);
      }
    },

    _renderHorizontalRainclouds: function (d3, targetElem, categoryStats, theme, config, metricMeasure, benchmarkTarget, fontMultiplier, viewMode) {
      var self = this;
      var numCats = categoryStats.length;
      if (numCats === 0) return;

      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.overflowX = "auto";
      targetElem.appendChild(wrap);

      var laneHeight = 84;
      var marginTop = 30;
      var marginBottom = 40;
      var marginLeft = 150;
      var marginRight = 40;

      var totalHeight = marginTop + (laneHeight * numCats) + marginBottom;
      var totalWidth = Math.max(targetElem.clientWidth || 700, 680);
      var chartW = totalWidth - marginLeft - marginRight;

      // Determine global visible domain
      var globalMin = Infinity;
      var globalMax = -Infinity;

      categoryStats.forEach(function (cs) {
        if (config.outlierThreshold === "full_domain") {
          if (cs.values[0] < globalMin) globalMin = cs.values[0];
          if (cs.values[cs.values.length - 1] > globalMax) globalMax = cs.values[cs.values.length - 1];
        } else {
          if (cs.lowerWhisker < globalMin) globalMin = cs.lowerWhisker;
          if (cs.upperWhisker > globalMax) globalMax = cs.upperWhisker;
        }
      });

      if (globalMin === Infinity) globalMin = 0;
      if (globalMax === -Infinity || globalMax === globalMin) globalMax = globalMin + 10;

      var xPad = (globalMax - globalMin) * 0.05;
      var xScale = d3.scaleLinear()
        .domain([Math.max(0, globalMin - xPad), globalMax + xPad])
        .range([0, chartW]);

      var svg = d3.select(wrap)
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .style("font-family", "inherit");

      var g = svg.append("g")
        .attr("transform", "translate(" + marginLeft + "," + marginTop + ")");

      // Background alternating zebra stripes
      categoryStats.forEach(function (cs, idx) {
        g.append("rect")
          .attr("x", -marginLeft)
          .attr("y", idx * laneHeight)
          .attr("width", totalWidth)
          .attr("height", laneHeight)
          .attr("fill", idx % 2 === 0 ? (theme.isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.015)") : "none");
      });

      // Benchmark reference vertical line
      if (benchmarkTarget > 0 && benchmarkTarget >= xScale.domain()[0] && benchmarkTarget <= xScale.domain()[1]) {
        var bx = xScale(benchmarkTarget);
        g.append("line")
          .attr("x1", bx)
          .attr("x2", bx)
          .attr("y1", 0)
          .attr("y2", numCats * laneHeight)
          .attr("stroke", theme.benchmarkLine)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.7);

        g.append("text")
          .attr("x", bx + 4)
          .attr("y", -8)
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .attr("fill", theme.benchmarkLine)
          .text((config.referenceLineLabel || "Target") + ": " + formatValue(benchmarkTarget, config.valueFormat || "auto"));
      }

      // X-Axis Grid & Axis Line
      g.append("g")
        .attr("stroke", theme.grid)
        .attr("stroke-opacity", 0.6)
        .call(d3.axisBottom(xScale).ticks(6).tickSize(numCats * laneHeight).tickFormat(""));

      var xAxis = d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(function (d) { return formatValue(d, config.valueFormat || "auto"); });

      g.append("g")
        .attr("transform", "translate(0," + (numCats * laneHeight) + ")")
        .call(xAxis)
        .attr("color", theme.subtext)
        .selectAll("text")
        .attr("font-size", (10 * fontMultiplier) + "px");

      // Render each category lane
      categoryStats.forEach(function (cs, laneIdx) {
        var laneG = g.append("g")
          .attr("transform", "translate(0," + (laneIdx * laneHeight) + ")");

        var catColor = theme.palette[laneIdx % theme.palette.length];
        var cloudHeight = 32;
        var boxplotY = 40;
        var rainCenterY = 62;

        // Category Label on Left
        var labelG = svg.append("g")
          .attr("transform", "translate(" + (marginLeft - 14) + "," + (marginTop + (laneIdx * laneHeight) + boxplotY + 4) + ")");

        labelG.append("text")
          .attr("text-anchor", "end")
          .attr("font-size", (11.5 * fontMultiplier) + "px")
          .attr("font-weight", "700")
          .attr("fill", theme.text)
          .text(cs.name);

        labelG.append("text")
          .attr("y", 13)
          .attr("text-anchor", "end")
          .attr("font-size", (9.5 * fontMultiplier) + "px")
          .attr("font-weight", "500")
          .attr("fill", theme.subtext)
          .text(cs.count + " samples • Med: " + formatValue(cs.median, config.valueFormat || "auto"));

        // 1. THE CLOUD: Half-Violin KDE (Density curve pointing upwards)
        if (viewMode !== "rain_strip" && cs.kdeData && cs.kdeData.length > 1) {
          var yDensityScale = d3.scaleLinear()
            .domain([0, 1])
            .range([boxplotY - 2, boxplotY - 2 - cloudHeight]);

          var areaGen = d3.area()
            .x(function (d) { return xScale(d.x); })
            .y0(boxplotY - 2)
            .y1(function (d) { return yDensityScale(d.normDensity); })
            .curve(d3.curveCatmullRom);

          var lineGen = d3.line()
            .x(function (d) { return xScale(d.x); })
            .y(function (d) { return yDensityScale(d.normDensity); })
            .curve(d3.curveCatmullRom);

          laneG.append("path")
            .datum(cs.kdeData)
            .attr("fill", catColor)
            .attr("fill-opacity", config.cloudFillOpacity !== undefined ? config.cloudFillOpacity : 0.45)
            .attr("d", areaGen);

          laneG.append("path")
            .datum(cs.kdeData)
            .attr("fill", "none")
            .attr("stroke", catColor)
            .attr("stroke-width", 1.5)
            .attr("d", lineGen);
        }

        // 2. THE UMBRELLA: Boxplot
        var boxColor = catColor;
        if (config.boxplotColorMode === "slate_monochrome") boxColor = theme.subtext;
        else if (config.boxplotColorMode === "high_contrast") boxColor = theme.isDark ? "#ffffff" : "#0f172a";

        var q1X = xScale(cs.q1);
        var medX = xScale(cs.median);
        var q3X = xScale(cs.q3);
        var lowWhiskerX = xScale(cs.lowerWhisker);
        var highWhiskerX = xScale(cs.upperWhisker);
        var boxH = 10;
        var boxTop = boxplotY - (boxH / 2);

        // Whisker line
        laneG.append("line")
          .attr("x1", lowWhiskerX)
          .attr("x2", highWhiskerX)
          .attr("y1", boxplotY)
          .attr("y2", boxplotY)
          .attr("stroke", boxColor)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.85);

        // Whisker end caps
        laneG.append("line")
          .attr("x1", lowWhiskerX)
          .attr("x2", lowWhiskerX)
          .attr("y1", boxplotY - 3)
          .attr("y2", boxplotY + 3)
          .attr("stroke", boxColor)
          .attr("stroke-width", 1.5);

        laneG.append("line")
          .attr("x1", highWhiskerX)
          .attr("x2", highWhiskerX)
          .attr("y1", boxplotY - 3)
          .attr("y2", boxplotY + 3)
          .attr("stroke", boxColor)
          .attr("stroke-width", 1.5);

        // IQR Box
        laneG.append("rect")
          .attr("x", Math.min(q1X, q3X))
          .attr("y", boxTop)
          .attr("width", Math.max(2, Math.abs(q3X - q1X)))
          .attr("height", boxH)
          .attr("rx", 2)
          .attr("fill", theme.isDark ? "#1e293b" : "#ffffff")
          .attr("stroke", boxColor)
          .attr("stroke-width", 1.5);

        // Median Line
        laneG.append("line")
          .attr("x1", medX)
          .attr("x2", medX)
          .attr("y1", boxTop - 1)
          .attr("y2", boxTop + boxH + 1)
          .attr("stroke", theme.isDark ? "#fbbf24" : "#b45309")
          .attr("stroke-width", 2.5);

        // Mean diamond marker
        var meanX = xScale(cs.mean);
        laneG.append("circle")
          .attr("cx", meanX)
          .attr("cy", boxplotY)
          .attr("r", 2.5)
          .attr("fill", theme.isDark ? "#ffffff" : "#0f172a");

        // 3. THE RAIN: Jittered Dots
        if (viewMode !== "cloud_boxplot") {
          var jitterSpread = 8;
          if (config.jitterAmount === "compact") jitterSpread = 4;
          else if (config.jitterAmount === "wide") jitterSpread = 12;

          var basePtRadius = config.pointRadius !== undefined ? config.pointRadius : 3.5;
          var ptOpacity = config.pointOpacity !== undefined ? config.pointOpacity : 0.65;

          cs.observations.forEach(function (obs) {
            var ox = xScale(obs.val);
            // Deterministic hash jitter: range [-jitterSpread, +jitterSpread]
            var jOffset = ((obs.jitterSeed % 2000) / 1000.0 - 1.0) * jitterSpread;
            var oy = rainCenterY + jOffset;

            var r = basePtRadius;
            if (obs.size > 1) {
              r = Math.min(basePtRadius * 2, basePtRadius + Math.log2(obs.size));
            }

            var isOutlier = obs.val < cs.lowerWhisker || obs.val > cs.upperWhisker;

            var dot = laneG.append("circle")
              .attr("cx", ox)
              .attr("cy", oy)
              .attr("r", r)
              .attr("fill", isOutlier ? (theme.isDark ? "#f87171" : "#dc2626") : catColor)
              .attr("stroke", theme.isDark ? "#0b0f19" : "#ffffff")
              .attr("stroke-width", 0.75)
              .attr("opacity", ptOpacity)
              .style("cursor", "pointer");

            dot.on("mouseenter", function (event) {
              dot.attr("r", r * 1.5).attr("opacity", 1.0);

              var tt = self._tooltip;
              tt.style.background = theme.isDark ? "#1e293b" : "#ffffff";
              tt.style.color = theme.text;
              tt.style.border = "1px solid " + catColor;

              tt.innerHTML =
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:10px;">' +
                  '<strong>' + obs.id + '</strong>' +
                  '<span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:' + catColor + '; color:#fff;">' + cs.name + '</span>' +
                '</div>' +
                '<div style="font-size:15px; font-weight:800; color:' + catColor + '; margin-bottom:4px;">' +
                  metricMeasure.label + ': ' + formatValue(obs.val, config.valueFormat || "auto", obs.rendered) +
                '</div>' +
                '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.4;">' +
                  'Category Median: <strong>' + formatValue(cs.median, config.valueFormat || "auto") + '</strong> &bull; IQR: <strong>' + formatValue(cs.iqr, config.valueFormat || "auto") + '</strong><br/>' +
                  (isOutlier ? '<div style="color:' + (theme.isDark ? '#f87171' : '#dc2626') + '; font-weight:700; margin-top:2px;">⚠️ Statistical Outlier (>1.5× IQR)</div>' : '') +
                  (obs.links ? '<div style="margin-top:4px; color:#2563eb;">Click to drill down &rarr;</div>' : '') +
                '</div>';

              tt.style.display = "block";
              tt.style.opacity = "1";
            });

            dot.on("mousemove", function (event) {
              var tt = self._tooltip;
              var x = event.clientX + 14;
              var y = event.clientY - 30;
              if (x + 240 > window.innerWidth) x = event.clientX - 250;
              if (y + 120 > window.innerHeight) y = event.clientY - 120;
              tt.style.left = x + "px";
              tt.style.top = y + "px";
            });

            dot.on("mouseleave", function () {
              dot.attr("r", r).attr("opacity", ptOpacity);
              self._tooltip.style.display = "none";
              self._tooltip.style.opacity = "0";
            });

            dot.on("click", function (event) {
              if (obs.links) {
                LookerCharts.Utils.openDrillMenu({
                  links: obs.links,
                  event: event
                });
              }
            });
          });
        }
      });
    },

    _renderVerticalRainclouds: function (d3, targetElem, categoryStats, theme, config, metricMeasure, benchmarkTarget, fontMultiplier) {
      var self = this;
      var numCats = categoryStats.length;
      if (numCats === 0) return;

      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.overflowX = "auto";
      targetElem.appendChild(wrap);

      var columnWidth = Math.max(100, Math.floor(((targetElem.clientWidth || 700) - 120) / numCats));
      var marginTop = 40;
      var marginBottom = 70;
      var marginLeft = 70;
      var marginRight = 30;

      var totalWidth = marginLeft + (columnWidth * numCats) + marginRight;
      var totalHeight = 440;
      var chartH = totalHeight - marginTop - marginBottom;

      var globalMin = Infinity;
      var globalMax = -Infinity;

      categoryStats.forEach(function (cs) {
        if (config.outlierThreshold === "full_domain") {
          if (cs.values[0] < globalMin) globalMin = cs.values[0];
          if (cs.values[cs.values.length - 1] > globalMax) globalMax = cs.values[cs.values.length - 1];
        } else {
          if (cs.lowerWhisker < globalMin) globalMin = cs.lowerWhisker;
          if (cs.upperWhisker > globalMax) globalMax = cs.upperWhisker;
        }
      });

      if (globalMin === Infinity) globalMin = 0;
      if (globalMax === -Infinity || globalMax === globalMin) globalMax = globalMin + 10;

      var yPad = (globalMax - globalMin) * 0.05;
      var yScale = d3.scaleLinear()
        .domain([Math.max(0, globalMin - yPad), globalMax + yPad])
        .range([chartH, 0]);

      var svg = d3.select(wrap)
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .style("font-family", "inherit");

      var g = svg.append("g")
        .attr("transform", "translate(" + marginLeft + "," + marginTop + ")");

      // Horizontal Benchmark Target Line
      if (benchmarkTarget > 0 && benchmarkTarget >= yScale.domain()[0] && benchmarkTarget <= yScale.domain()[1]) {
        var by = yScale(benchmarkTarget);
        g.append("line")
          .attr("x1", 0)
          .attr("x2", numCats * columnWidth)
          .attr("y1", by)
          .attr("y2", by)
          .attr("stroke", theme.benchmarkLine)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.7);

        g.append("text")
          .attr("x", numCats * columnWidth - 6)
          .attr("y", by - 4)
          .attr("text-anchor", "end")
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .attr("fill", theme.benchmarkLine)
          .text((config.referenceLineLabel || "Target") + ": " + formatValue(benchmarkTarget, config.valueFormat || "auto"));
      }

      // Y-Axis Grid & Labels
      g.append("g")
        .attr("stroke", theme.grid)
        .attr("stroke-opacity", 0.6)
        .call(d3.axisLeft(yScale).ticks(6).tickSize(-numCats * columnWidth).tickFormat(""));

      var yAxis = d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(function (d) { return formatValue(d, config.valueFormat || "auto"); });

      g.append("g")
        .call(yAxis)
        .attr("color", theme.subtext)
        .selectAll("text")
        .attr("font-size", (10 * fontMultiplier) + "px");

      // Category Columns
      categoryStats.forEach(function (cs, colIdx) {
        var colG = g.append("g")
          .attr("transform", "translate(" + (colIdx * columnWidth) + ", 0)");

        var catColor = theme.palette[colIdx % theme.palette.length];
        var boxplotX = columnWidth * 0.45;
        var cloudW = columnWidth * 0.35;
        var rainCenterX = columnWidth * 0.72;

        // X-Axis Category Name (Rotated if long)
        g.append("text")
          .attr("x", (colIdx * columnWidth) + (columnWidth / 2))
          .attr("y", chartH + 18)
          .attr("text-anchor", "middle")
          .attr("font-size", (11 * fontMultiplier) + "px")
          .attr("font-weight", "700")
          .attr("fill", theme.text)
          .text(cs.name);

        g.append("text")
          .attr("x", (colIdx * columnWidth) + (columnWidth / 2))
          .attr("y", chartH + 32)
          .attr("text-anchor", "middle")
          .attr("font-size", (9 * fontMultiplier) + "px")
          .attr("fill", theme.subtext)
          .text(cs.count + " samples");

        // 1. Vertical Half-Violin Cloud (Facing Left)
        if (cs.kdeData && cs.kdeData.length > 1) {
          var xDensityScale = d3.scaleLinear()
            .domain([0, 1])
            .range([boxplotX - 2, boxplotX - 2 - cloudW]);

          var areaGen = d3.area()
            .y(function (d) { return yScale(d.x); })
            .x0(boxplotX - 2)
            .x1(function (d) { return xDensityScale(d.normDensity); })
            .curve(d3.curveCatmullRom);

          colG.append("path")
            .datum(cs.kdeData)
            .attr("fill", catColor)
            .attr("fill-opacity", config.cloudFillOpacity !== undefined ? config.cloudFillOpacity : 0.45)
            .attr("d", areaGen);
        }

        // 2. Vertical Boxplot
        var q1Y = yScale(cs.q1);
        var medY = yScale(cs.median);
        var q3Y = yScale(cs.q3);
        var lowWhiskerY = yScale(cs.lowerWhisker);
        var highWhiskerY = yScale(cs.upperWhisker);
        var boxW = 10;
        var boxLeft = boxplotX - (boxW / 2);

        colG.append("line")
          .attr("x1", boxplotX)
          .attr("x2", boxplotX)
          .attr("y1", lowWhiskerY)
          .attr("y2", highWhiskerY)
          .attr("stroke", catColor)
          .attr("stroke-width", 1.5);

        colG.append("rect")
          .attr("x", boxLeft)
          .attr("y", Math.min(q1Y, q3Y))
          .attr("width", boxW)
          .attr("height", Math.max(2, Math.abs(q1Y - q3Y)))
          .attr("rx", 2)
          .attr("fill", theme.isDark ? "#1e293b" : "#ffffff")
          .attr("stroke", catColor)
          .attr("stroke-width", 1.5);

        colG.append("line")
          .attr("x1", boxLeft - 1)
          .attr("x2", boxLeft + boxW + 1)
          .attr("y1", medY)
          .attr("y2", medY)
          .attr("stroke", theme.isDark ? "#fbbf24" : "#b45309")
          .attr("stroke-width", 2.5);

        // 3. Jittered Rain Dots (Falling along right side)
        var jitterSpread = 6;
        var basePtRadius = config.pointRadius !== undefined ? config.pointRadius : 3.5;
        var ptOpacity = config.pointOpacity !== undefined ? config.pointOpacity : 0.65;

        cs.observations.forEach(function (obs) {
          var oy = yScale(obs.val);
          var jOffset = ((obs.jitterSeed % 2000) / 1000.0 - 1.0) * jitterSpread;
          var ox = rainCenterX + jOffset;

          colG.append("circle")
            .attr("cx", ox)
            .attr("cy", oy)
            .attr("r", basePtRadius)
            .attr("fill", catColor)
            .attr("stroke", theme.isDark ? "#0b0f19" : "#ffffff")
            .attr("stroke-width", 0.75)
            .attr("opacity", ptOpacity)
            .style("cursor", "pointer");
        });
      });
    }
  });
})();
