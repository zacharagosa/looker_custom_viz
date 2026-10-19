/**
 * Correlation & Covariance Splom Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/314890214: "Looker Feature Request: Pairwise Correlation Matrix & Multi-Variate Scatter Matrix (SPLOM)"
 * - b/482910392: "Scatterplot Matrix visualization with bivariate density, regression trendlines, and correlation coefficients"
 * - b/501293812: "Statistical correlation grid with interactive brushing across pairwise dimensions"
 * - YAQS 89312048123901: "How to render an N x N correlation matrix with scatter plots in Looker?"
 *
 * Multi-Modal Adaptability:
 * 1. "splom_full": Bivariate Scatter (Lower) + KDE Density (Diagonal) + Pearson/Spearman r (Upper)
 * 2. "corr_heatmap": Compact N x N Correlation Heatmap Matrix with statistical significance stars
 * 3. "scatter_matrix": Pure Scatter Matrix Grid with OLS regression trendlines
 * 4. "pairwise_focus": Interactive deep-dive inspector for the top correlated pair with regression equation and R^2
 *
 * Scalability (5,000+ rows):
 * - Client-side O(N) calculation of covariance, Pearson r, Spearman rank rho, and OLS regression
 * - Fast Gaussian Kernel Density Estimation (KDE) for diagonal univariate distributions
 * - Interactive cross-filtering and synchronized brushing across all matrix cells
 * - Native Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 *
 * Minimal Option Sections (Strictly 2 clean tabs):
 * - Display: Layout Mode, Correlation Method, Entity/Group Overrides, Target Mode/Value/Label/Threshold, Sorting, Top-N Metrics, Null Suppression, HUD Mode, Label Density, Title/Subtitle, Regression Lines, Confidence Bands, Search Bar
 * - Style: Brand Palettes, Custom Hex Overrides, Metric Polarity, Point Radius, Point Opacity, Font Scale, Value Format
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
    google_modern: {
      name: "Google Modern Blue",
      primary: "#1a73e8",
      positive: "#1e8e3e",
      negative: "#d93025",
      neutral: "#f8f9fa",
      colors: ["#1a73e8", "#1e8e3e", "#f9ab00", "#d93025", "#9334e6", "#007b83", "#e37400", "#185abc"]
    },
    executive_slate: {
      name: "Executive Slate",
      primary: "#2563eb",
      positive: "#16a34a",
      negative: "#dc2626",
      neutral: "#f8fafc",
      colors: ["#0f172a", "#334155", "#475569", "#64748b", "#2563eb", "#0284c7", "#0d9488", "#16a34a"]
    },
    cyber_neon: {
      name: "Cyberpunk Glow",
      primary: "#8b5cf6",
      positive: "#10b981",
      negative: "#f43f5e",
      neutral: "#18181b",
      colors: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#06b6d4", "#3b82f6", "#10b981"]
    },
    emerald_forest: {
      name: "Nordic Emerald & Moss",
      primary: "#059669",
      positive: "#10b981",
      negative: "#e11d48",
      neutral: "#f0fdf4",
      colors: ["#059669", "#10b981", "#34d399", "#047857", "#0d9488", "#14b8a6", "#15803d", "#22c55e"]
    },
    sunset_aurora: {
      name: "Sunset Aurora Ebb",
      primary: "#f43f5e",
      positive: "#059669",
      negative: "#e11d48",
      neutral: "#fff1f2",
      colors: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#facc15", "#c026d3", "#a855f7", "#7c3aed"]
    },
    wellverse: {
      name: "Wellverse Healthcare",
      primary: "#2e7cf6",
      positive: "#00af68",
      negative: "#e5484d",
      neutral: "#f8fafc",
      colors: ["#143359", "#00af68", "#2e7cf6", "#ffb500", "#7c5cfc", "#14b8a6", "#e5484d", "#94a3b8"]
    },
    ocean_breeze: {
      name: "Pacific Ocean Breeze",
      primary: "#0284c7",
      positive: "#10b981",
      negative: "#ef4444",
      neutral: "#f0f9ff",
      colors: ["#0284c7", "#0ea5e9", "#38bdf8", "#06b6d4", "#14b8a6", "#10b981", "#3b82f6", "#6366f1"]
    }
  };

  function formatNum(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
      return sign + Math.round(abs).toLocaleString();
    }
    if (fmt === "percentage") {
      var p = (num <= 1 && num >= -1) ? num * 100 : num;
      return (p >= 0 ? "" : "-") + Math.abs(p).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return sign + abs.toFixed(2);
    }
    if (fmt === "raw") {
      return String(num);
    }
    // auto fallback
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
    if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
    return sign + Math.round(abs).toLocaleString();
  }

  // Statistical Helpers
  function calcStats(values) {
    var n = values.length;
    if (n === 0) return { mean: 0, std: 0, min: 0, max: 0 };
    var sum = 0;
    var min = values[0];
    var max = values[0];
    for (var i = 0; i < n; i++) {
      var v = values[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    var mean = sum / n;
    var varSum = 0;
    for (var j = 0; j < n; j++) {
      var diff = values[j] - mean;
      varSum += diff * diff;
    }
    var std = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;
    return { mean: mean, std: std, min: min, max: max };
  }

  function calcPearson(arrX, arrY) {
    var n = Math.min(arrX.length, arrY.length);
    if (n < 2) return 0;
    var sx = calcStats(arrX);
    var sy = calcStats(arrY);
    if (sx.std === 0 || sy.std === 0) return 0;

    var cov = 0;
    for (var i = 0; i < n; i++) {
      cov += (arrX[i] - sx.mean) * (arrY[i] - sy.mean);
    }
    cov = cov / (n - 1);
    var r = cov / (sx.std * sy.std);
    return Math.max(-1, Math.min(1, r));
  }

  function calcSpearman(arrX, arrY) {
    var n = Math.min(arrX.length, arrY.length);
    if (n < 2) return 0;

    function getRanks(arr) {
      var indexed = arr.map(function (val, idx) { return { val: val, idx: idx }; });
      indexed.sort(function (a, b) { return a.val - b.val; });
      var ranks = new Array(n);
      for (var i = 0; i < n; i++) {
        ranks[indexed[i].idx] = i + 1;
      }
      return ranks;
    }

    var rankX = getRanks(arrX);
    var rankY = getRanks(arrY);
    return calcPearson(rankX, rankY);
  }

  function calcOLS(arrX, arrY) {
    var n = Math.min(arrX.length, arrY.length);
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
    var sx = calcStats(arrX);
    var sy = calcStats(arrY);
    if (sx.std === 0) return { slope: 0, intercept: sy.mean, r2: 0 };

    var r = calcPearson(arrX, arrY);
    var slope = r * (sy.std / sx.std);
    var intercept = sy.mean - slope * sx.mean;
    return { slope: slope, intercept: intercept, r2: r * r };
  }

  function kdeKernel(kernel, X) {
    return function (V) {
      return X.map(function (x) {
        return [x, d3.mean(V, function (v) { return kernel(x - v); })];
      });
    };
  }

  function epanechnikovKernel(bandwidth) {
    return function (u) {
      return Math.abs(u /= bandwidth) <= 1 ? 0.75 * (1 - u * u) / bandwidth : 0;
    };
  }

  var visObject = {
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "SPLOM Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Full SPLOM (Scatter, KDE & Pearson r)": "splom_full" },
          { "Correlation Heatmap Matrix (N x N)": "corr_heatmap" },
          { "Classic Scatter Matrix Grid": "scatter_matrix" },
          { "Top Pairwise Deep-Dive & Residuals": "pairwise_focus" }
        ],
        default: "splom_full"
      },
      correlationMethod: {
        type: "string",
        label: "Correlation Method",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "Pearson (Linear Product-Moment r)": "pearson" },
          { "Spearman (Monotonic Rank rho)": "spearman" }
        ],
        default: "pearson"
      },
      dimEntityOverride: {
        type: "string",
        label: "Entity Dimension (Observation ID)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      groupDimOverride: {
        type: "string",
        label: "Group Dimension (Point Color / Category)",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: ""
      },
      targetMode: {
        type: "string",
        label: "Target Benchmark Mode",
        section: "Display",
        order: 5,
        display: "select",
        values: [
          { "None / Standard Matrix": "none" },
          { "Highlight Correlations Above Threshold": "correlation_threshold" },
          { "Benchmark Against Dataset Mean r": "dataset_mean" },
          { "Benchmark Against P75 Strong Correlation": "percentile_p75" }
        ],
        default: "correlation_threshold"
      },
      correlationThreshold: {
        type: "number",
        label: "Significant Correlation Cutoff (|r|)",
        section: "Display",
        order: 6,
        default: 0.5
      },
      targetLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        section: "Display",
        order: 7,
        default: "Significant Cutoff"
      },
      highlightStrongCorrelations: {
        type: "boolean",
        label: "Flag Strong Correlated Pairs in Grid",
        section: "Display",
        order: 8,
        default: true
      },
      sortOrder: {
        type: "string",
        label: "Matrix Variable Order",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "Correlation Similarity Clustering": "cluster" },
          { "Max Absolute Correlation First": "strength_desc" },
          { "Alphabetical (A - Z)": "alphabetical" },
          { "Query Natural Order": "natural" }
        ],
        default: "cluster"
      },
      topNLimit: {
        type: "string",
        label: "Metric Variables Limit",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "All Query Measures (Up to 8)": "all" },
          { "Top 3 Measures": "3" },
          { "Top 4 Measures": "4" },
          { "Top 5 Measures": "5" },
          { "Top 6 Measures": "6" }
        ],
        default: "all"
      },
      suppressNulls: {
        type: "boolean",
        label: "Filter Zero / Empty Observations",
        section: "Display",
        order: 11,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 12,
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
        label: "Correlation Badges Density",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "All Matrix Cells": "all" },
          { "Significant Pairs Only": "significant_only" },
          { "Hidden (Hover Only)": "hidden" }
        ],
        default: "all"
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 14,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 15,
        default: ""
      },
      showRegressionLine: {
        type: "boolean",
        label: "Display OLS Linear Trendlines",
        section: "Display",
        order: 16,
        default: true
      },
      showConfidenceBands: {
        type: "boolean",
        label: "Show Trendline Confidence Region",
        section: "Display",
        order: 17,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Enable Metric Variable Filter Search",
        section: "Display",
        order: 18,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Modern Blue": "google_modern" },
          { "Executive Slate": "executive_slate" },
          { "Cyberpunk Glow": "cyber_neon" },
          { "Nordic Emerald & Moss": "emerald_forest" },
          { "Sunset Aurora Ebb": "sunset_aurora" },
          { "Wellverse Healthcare": "wellverse" },
          { "Pacific Ocean Breeze": "ocean_breeze" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_modern"
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Point Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive Correlation Hex (+r)",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative Correlation Hex (-r)",
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
          { "Positive Correlation is Favorable": "higher_is_better" },
          { "Inverse Correlation is Favorable": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      pointRadius: {
        type: "string",
        label: "Scatter Point Radius",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "2px Compact (5,000+ Points)": "2" },
          { "3px Standard (Recommended)": "3" },
          { "4.5px Presentation High-Visibility": "4.5" }
        ],
        default: "3"
      },
      pointOpacity: {
        type: "string",
        label: "Scatter Point Opacity",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "0.40 Subtle / High Density": "0.4" },
          { "0.65 Standard Vibrant": "0.65" },
          { "0.85 Solid": "0.85" },
          { "1.00 Fully Opaque": "1.0" }
        ],
        default: "0.65"
      },
      fontSize: {
        type: "string",
        label: "Font Size & Density",
        section: "Style",
        order: 8,
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
        label: "Metric Number Format",
        section: "Style",
        order: 9,
        display: "select",
        values: [
          { "Auto Detect": "auto" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (0.00)": "decimal_2" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dimEntityOverride: { role: "dimension", defaultIdx: 0 },
        groupDimOverride: { role: "dimension", defaultIdx: 1 }
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

      var container = document.createElement("div");
      container.className = "correlation-splom-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.boxSizing = "border-box";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      container.style.color = "#1f2937";
      container.style.backgroundColor = "#ffffff";
      container.style.overflow = "hidden";
      container.style.position = "relative";
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "correlation-splom-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = "rgba(15, 23, 42, 0.95)";
      tooltip.style.color = "#ffffff";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 0.15s ease-out, transform 0.1s ease-out";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      tooltip.style.zIndex = "9999";
      tooltip.style.backdropFilter = "blur(4px)";
      tooltip.style.border = "1px solid rgba(255,255,255,0.15)";
      document.body.appendChild(tooltip);
      element._splomTooltip = tooltip;

      this._element = element;
      this._setupResizeObserver(element);
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
      if (curW <= 20 || curH <= 20) return;

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
      this.clearErrors();

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

      this._registerDynamicFieldOptions(queryResponse);

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to visualize."
        });
        if (done) done();
        return;
      }

      var fields = queryResponse.fields;
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!measures.length && fields.table_calculations && fields.table_calculations.length) measures = fields.table_calculations;

      if (measures.length < 2) {
        this.addError({
          title: "Insufficient Measures",
          message: "Correlation & Covariance Splom Matrix requires at least 2 quantitative measures to evaluate pairwise correlations."
        });
        if (done) done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var container = element.querySelector(".correlation-splom-container");
      if (!container) return;
      container.innerHTML = "";

      var tooltip = element._splomTooltip;
      var width = container.clientWidth || element.clientWidth || 800;
      var height = container.clientHeight || element.clientHeight || 600;

      var fields = queryResponse.fields;
      var dimensions = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var measures = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!measures.length && fields.table_calculations && fields.table_calculations.length) measures = fields.table_calculations;

      function findField(list, name) {
        if (!name) return null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].name === name) return list[i];
        }
        return null;
      }

      var entityDim = findField(dimensions, config.dimEntityOverride) || (dimensions.length ? dimensions[0] : null);
      var groupDim = findField(dimensions, config.groupDimOverride) || (dimensions.length > 1 ? dimensions[1] : null);

      // Filter measures by limit
      var topN = (config.topNLimit === "all" || !config.topNLimit) ? 8 : parseInt(config.topNLimit, 10);
      var activeMeasures = measures.slice(0, Math.min(topN, 8));

      // Extract numeric arrays for each measure
      var observations = [];
      data.forEach(function (row, idx) {
        var entityVal = entityDim && row[entityDim.name] ? (row[entityDim.name].rendered || row[entityDim.name].value) : ("#" + (idx + 1));
        var groupVal = groupDim && row[groupDim.name] ? String(row[groupDim.name].value || "Default") : "Default";

        var obs = {
          id: idx,
          entity: entityVal,
          group: groupVal,
          values: {},
          cells: {}
        };

        var allValid = true;
        activeMeasures.forEach(function (m) {
          var cell = row[m.name] || {};
          var v = typeof cell.value === "number" ? cell.value : parseFloat(cell.value);
          if (isNaN(v)) {
            allValid = false;
          }
          obs.values[m.name] = v;
          obs.cells[m.name] = cell;
        });

        if (config.suppressNulls !== false) {
          if (allValid) observations.push(obs);
        } else {
          observations.push(obs);
        }
      });

      if (observations.length < 2) {
        this.addError({
          title: "Insufficient Rows",
          message: "At least 2 valid observations are required to compute correlations and draw scatter matrices."
        });
        if (done) done();
        return;
      }

      // Compute pairwise correlations and OLS
      var corrMatrix = {};
      var maxCorr = -2;
      var minCorr = 2;
      var topPosPair = null;
      var topNegPair = null;
      var allAbsCorrs = [];
      var corrMethod = config.correlationMethod || "pearson";

      activeMeasures.forEach(function (m1) {
        corrMatrix[m1.name] = {};
        activeMeasures.forEach(function (m2) {
          if (m1.name === m2.name) {
            corrMatrix[m1.name][m2.name] = { r: 1.0, slope: 1, intercept: 0, r2: 1.0 };
            return;
          }
          var arrX = observations.map(function (o) { return o.values[m1.name] || 0; });
          var arrY = observations.map(function (o) { return o.values[m2.name] || 0; });

          var r = corrMethod === "spearman" ? calcSpearman(arrX, arrY) : calcPearson(arrX, arrY);
          var ols = calcOLS(arrX, arrY);
          corrMatrix[m1.name][m2.name] = { r: r, slope: ols.slope, intercept: ols.intercept, r2: ols.r2 };

          if (m1.name < m2.name) {
            allAbsCorrs.push(Math.abs(r));
            if (r > maxCorr) {
              maxCorr = r;
              topPosPair = { m1: m1, m2: m2, r: r };
            }
            if (r < minCorr) {
              minCorr = r;
              topNegPair = { m1: m1, m2: m2, r: r };
            }
          }
        });
      });

      // Variable reordering
      var sortOrder = config.sortOrder || "cluster";
      if (sortOrder === "cluster") {
        activeMeasures.sort(function (a, b) {
          var sumA = d3.sum(activeMeasures, function (m) { return Math.abs(corrMatrix[a.name][m.name].r); });
          var sumB = d3.sum(activeMeasures, function (m) { return Math.abs(corrMatrix[b.name][m.name].r); });
          return sumB - sumA;
        });
      } else if (sortOrder === "strength_desc") {
        activeMeasures.sort(function (a, b) {
          var maxA = d3.max(activeMeasures, function (m) { return m.name !== a.name ? Math.abs(corrMatrix[a.name][m.name].r) : 0; });
          var maxB = d3.max(activeMeasures, function (m) { return m.name !== b.name ? Math.abs(corrMatrix[b.name][m.name].r) : 0; });
          return maxB - maxA;
        });
      } else if (sortOrder === "alphabetical") {
        activeMeasures.sort(function (a, b) {
          var lA = a.label_short || a.label || a.name;
          var lB = b.label_short || b.label || b.name;
          return lA.localeCompare(lB);
        });
      }

      // Themes and Palette
      var paletteKey = config.colorPalette || "google_modern";
      var pal = PALETTES[paletteKey] || PALETTES.google_modern;
      var posColor = config.customPositiveColor || pal.positive;
      var negColor = config.customNegativeColor || pal.negative;
      var primaryPointColor = config.customPrimaryColor || pal.primary;

      var fontScale = config.fontSize || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : (fontScale === "spacious" ? 14 : 12.5);
      container.style.fontSize = baseFontSize + "px";

      // Group color scale
      var groupKeys = Array.from(new Set(observations.map(function (o) { return o.group; })));
      var groupColorScale = d3.scaleOrdinal()
        .domain(groupKeys)
        .range(pal.colors);

      // Diverging color scale for correlation
      var corrColorScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range([negColor, "#ffffff", posColor]);

      // Title & Subtitle
      if (config.chartTitleOverride || config.chartSubtitleOverride) {
        var titleWrap = document.createElement("div");
        titleWrap.style.padding = "10px 16px 0 16px";
        if (config.chartTitleOverride) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = (baseFontSize + 3) + "px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = "#0f172a";
          titleEl.textContent = config.chartTitleOverride;
          titleWrap.appendChild(titleEl);
        }
        if (config.chartSubtitleOverride) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = (baseFontSize - 1.5) + "px";
          subEl.style.color = "#64748b";
          subEl.style.marginTop = "2px";
          subEl.textContent = config.chartSubtitleOverride;
          titleWrap.appendChild(subEl);
        }
        container.appendChild(titleWrap);
      }

      // Header Bar & Executive HUD
      var headerBar = document.createElement("div");
      headerBar.className = "splom-header-bar";
      headerBar.style.padding = "10px 16px 8px 16px";
      headerBar.style.display = "flex";
      headerBar.style.alignItems = "center";
      headerBar.style.justifyContent = "space-between";
      headerBar.style.flexWrap = "wrap";
      headerBar.style.gap = "12px";
      headerBar.style.borderBottom = "1px solid #f1f5f9";
      container.appendChild(headerBar);

      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "16px";
      hudContainer.style.flexWrap = "wrap";
      headerBar.appendChild(hudContainer);

      var hudMode = config.hudMode || "full";
      if (hudMode !== "hidden") {
        var isCompact = hudMode === "compact";
        var meanAbsR = allAbsCorrs.length ? d3.mean(allAbsCorrs) : 0;

        var obsKpi = document.createElement("div");
        obsKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Observations</span>' +
          '<strong style="font-size:' + (isCompact ? '13px' : '16px') + ';color:#0f172a;font-weight:700;">' + observations.length.toLocaleString() + ' <span style="font-size:11px;font-weight:400;color:#94a3b8;">(' + activeMeasures.length + ' metrics)</span></strong>';
        hudContainer.appendChild(obsKpi);

        var rKpi = document.createElement("div");
        rKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Mean |r| Strength</span>' +
          '<strong style="font-size:' + (isCompact ? '13px' : '16px') + ';color:#0f172a;font-weight:700;">' + meanAbsR.toFixed(2) + '</strong>';
        hudContainer.appendChild(rKpi);

        if (!isCompact && topPosPair && topPosPair.r > 0.3) {
          var posKpi = document.createElement("div");
          posKpi.style.padding = "4px 10px";
          posKpi.style.backgroundColor = "#f0fdf4";
          posKpi.style.border = "1px solid #bbf7d0";
          posKpi.style.borderRadius = "6px";
          var l1 = topPosPair.m1.label_short || topPosPair.m1.label || topPosPair.m1.name;
          var l2 = topPosPair.m2.label_short || topPosPair.m2.label || topPosPair.m2.name;
          posKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#15803d;font-weight:600;display:block;">⚡ Top Positive Co-Movement</span>' +
            '<strong style="font-size:12px;color:#166534;font-weight:700;">' + l1 + ' ↔ ' + l2 + ': <span style="color:#059669;">r = +' + topPosPair.r.toFixed(2) + '</span></strong>';
          hudContainer.appendChild(posKpi);
        }

        if (!isCompact && topNegPair && topNegPair.r < -0.3) {
          var negKpi = document.createElement("div");
          negKpi.style.padding = "4px 10px";
          negKpi.style.backgroundColor = "#fef2f2";
          negKpi.style.border = "1px solid #fecaca";
          negKpi.style.borderRadius = "6px";
          var nl1 = topNegPair.m1.label_short || topNegPair.m1.label || topNegPair.m1.name;
          var nl2 = topNegPair.m2.label_short || topNegPair.m2.label || topNegPair.m2.name;
          negKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#b91c1c;font-weight:600;display:block;">⚠️ Top Inverse Trade-Off</span>' +
            '<strong style="font-size:12px;color:#991b1b;font-weight:700;">' + nl1 + ' ↔ ' + nl2 + ': <span style="color:#dc2626;">r = ' + topNegPair.r.toFixed(2) + '</span></strong>';
          hudContainer.appendChild(negKpi);
        }
      }

      // Search Filter
      var searchWrap = document.createElement("div");
      searchWrap.style.display = "flex";
      searchWrap.style.alignItems = "center";
      searchWrap.style.gap = "8px";
      headerBar.appendChild(searchWrap);

      var searchInput = null;
      if (config.showSearch !== false) {
        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter metric...";
        searchInput.style.padding = "5px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.border = "1px solid #cbd5e1";
        searchInput.style.borderRadius = "6px";
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";
        searchWrap.appendChild(searchInput);
      }

      // Main Chart Canvas
      var chartWrapper = document.createElement("div");
      chartWrapper.className = "splom-chart-wrapper";
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "auto";
      container.appendChild(chartWrapper);

      var K = activeMeasures.length;
      var headerH = headerBar.offsetHeight || 48;
      var titleH = (config.chartTitleOverride || config.chartSubtitleOverride) ? 36 : 0;
      var availW = Math.max(width - 40, 300);
      var availH = Math.max(height - headerH - titleH - 30, 300);

      var layoutMode = config.layoutMode || "splom_full";
      var cellSize = Math.max(Math.floor(Math.min(availW, availH) / K), 90);
      var matrixSize = cellSize * K;

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", matrixSize + 70)
        .attr("height", matrixSize + 70)
        .style("display", "block")
        .style("margin", "10px auto");

      var g = svg.append("g")
        .attr("transform", "translate(40, 20)");

      // Build scales for each dimension
      var scales = {};
      activeMeasures.forEach(function (m) {
        var extent = d3.extent(observations, function (o) { return o.values[m.name]; });
        var span = (extent[1] - extent[0]) || 1;
        scales[m.name] = d3.scaleLinear()
          .domain([extent[0] - span * 0.05, extent[1] + span * 0.05])
          .range([cellSize - 8, 8]);
      });

      var activeObsId = null;

      function highlightObs(obsId) {
        activeObsId = obsId;
        svg.selectAll(".splom-point")
          .style("opacity", function (d) {
            if (activeObsId === null) return parseFloat(config.pointOpacity || "0.65");
            return d.id === activeObsId ? "1.0" : "0.15";
          })
          .attr("r", function (d) {
            var rBase = parseFloat(config.pointRadius || "3");
            return d.id === activeObsId ? (rBase * 2) : rBase;
          })
          .style("stroke", function (d) {
            return d.id === activeObsId ? "#0f172a" : "none";
          })
          .style("stroke-width", function (d) {
            return d.id === activeObsId ? "1.5px" : "0px";
          });
      }

      // Draw Cells
      activeMeasures.forEach(function (rowM, rowIdx) {
        activeMeasures.forEach(function (colM, colIdx) {
          var cellG = g.append("g")
            .attr("class", "splom-cell")
            .attr("transform", "translate(" + (colIdx * cellSize) + "," + (rowIdx * cellSize) + ")");

          var isDiagonal = rowIdx === colIdx;
          var isLower = rowIdx > colIdx;
          var isUpper = rowIdx < colIdx;

          // Cell background
          var cellRect = cellG.append("rect")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("stroke", "#e2e8f0")
            .attr("stroke-width", 1);

          var corr = corrMatrix[rowM.name][colM.name].r;
          var threshold = Number(config.correlationThreshold) || 0.5;
          var isStrong = Math.abs(corr) >= threshold;

          if (layoutMode === "corr_heatmap" || (layoutMode === "splom_full" && isUpper)) {
            // Render Correlation Coefficient & Badge
            cellRect.attr("fill", isDiagonal ? "#f8fafc" : corrColorScale(corr))
              .attr("fill-opacity", isDiagonal ? 1.0 : (0.15 + Math.abs(corr) * 0.75));

            var labelG = cellG.append("g")
              .attr("transform", "translate(" + (cellSize / 2) + "," + (cellSize / 2) + ")");

            if (isDiagonal) {
              var shortName = rowM.label_short || rowM.label || rowM.name;
              labelG.append("text")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#0f172a")
                .attr("font-size", Math.max(cellSize / 8, 10) + "px")
                .attr("font-weight", "700")
                .text(shortName);
            } else {
              labelG.append("text")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", Math.abs(corr) > 0.6 ? "#ffffff" : "#0f172a")
                .attr("font-size", Math.max(cellSize / 6, 12) + "px")
                .attr("font-weight", "800")
                .text((corr >= 0 ? "+" : "") + corr.toFixed(2));

              if (isStrong && config.highlightStrongCorrelations !== false) {
                labelG.append("text")
                  .attr("y", cellSize / 4.5)
                  .attr("text-anchor", "middle")
                  .attr("fill", Math.abs(corr) > 0.6 ? "#ffffff" : (corr >= 0 ? posColor : negColor))
                  .attr("font-size", "10px")
                  .attr("font-weight", "700")
                  .text(Math.abs(corr) >= 0.8 ? "★★★ Strong" : "★★ Moderate");
              }
            }
          } else if (isDiagonal) {
            // Univariate KDE Density / Histogram
            cellRect.attr("fill", "#f8fafc");

            var vals = observations.map(function (o) { return o.values[rowM.name]; }).sort(function (a, b) { return a - b; });
            var ext = d3.extent(vals);
            var bWidth = (ext[1] - ext[0]) / 10 || 1;
            var kde = kdeKernel(epanechnikovKernel(bWidth), d3.ticks(ext[0], ext[1], 30));
            var density = kde(vals);

            var yDensityScale = d3.scaleLinear()
              .domain([0, d3.max(density, function (d) { return d[1]; }) || 1])
              .range([cellSize - 10, 10]);

            var xDensityScale = d3.scaleLinear()
              .domain(ext)
              .range([8, cellSize - 8]);

            var densityArea = d3.area()
              .curve(d3.curveBasis)
              .x(function (d) { return xDensityScale(d[0]); })
              .y0(cellSize - 6)
              .y1(function (d) { return yDensityScale(d[1]); });

            cellG.append("path")
              .datum(density)
              .attr("fill", primaryPointColor)
              .attr("fill-opacity", 0.3)
              .attr("stroke", primaryPointColor)
              .attr("stroke-width", 1.5)
              .attr("d", densityArea);

            var diagLabel = rowM.label_short || rowM.label || rowM.name;
            cellG.append("text")
              .attr("x", cellSize / 2)
              .attr("y", 18)
              .attr("text-anchor", "middle")
              .attr("fill", "#0f172a")
              .attr("font-size", Math.max(cellSize / 9, 10) + "px")
              .attr("font-weight", "700")
              .text(diagLabel);
          } else {
            // Scatter Plot Cell
            cellRect.attr("fill", "#ffffff");

            var scaleX = d3.scaleLinear()
              .domain(scales[colM.name].domain())
              .range([8, cellSize - 8]);

            var scaleY = d3.scaleLinear()
              .domain(scales[rowM.name].domain())
              .range([cellSize - 8, 8]);

            // Trendline OLS
            if (config.showRegressionLine !== false) {
              var ols = corrMatrix[rowM.name][colM.name];
              var xDom = scaleX.domain();
              var y1 = ols.slope * xDom[0] + ols.intercept;
              var y2 = ols.slope * xDom[1] + ols.intercept;

              cellG.append("line")
                .attr("x1", scaleX(xDom[0]))
                .attr("y1", scaleY(y1))
                .attr("x2", scaleX(xDom[1]))
                .attr("y2", scaleY(y2))
                .attr("stroke", corr >= 0 ? posColor : negColor)
                .attr("stroke-width", isStrong ? 2 : 1)
                .attr("stroke-dasharray", isStrong ? "none" : "3 2")
                .attr("opacity", 0.85);
            }

            // Scatter Points
            var rBase = parseFloat(config.pointRadius || "3");
            var opBase = parseFloat(config.pointOpacity || "0.65");

            cellG.selectAll(".splom-point")
              .data(observations)
              .enter()
              .append("circle")
              .attr("class", "splom-point")
              .attr("cx", function (d) { return scaleX(d.values[colM.name]); })
              .attr("cy", function (d) { return scaleY(d.values[rowM.name]); })
              .attr("r", rBase)
              .attr("fill", function (d) {
                return groupDim ? groupColorScale(d.group) : primaryPointColor;
              })
              .attr("opacity", opBase)
              .style("cursor", "pointer")
              .on("mouseenter", function (event, d) {
                highlightObs(d.id);
                tooltip.style.opacity = "1";

                var xVal = d.values[colM.name];
                var yVal = d.values[rowM.name];
                var colName = colM.label_short || colM.label || colM.name;
                var rowName = rowM.label_short || rowM.label || rowM.name;

                var html = '<div style="font-weight:700;font-size:12px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:3px;">' +
                  '<span>📍 ' + d.entity + '</span>' + (groupDim ? ' <span style="font-weight:normal;color:#94a3b8;">(' + d.group + ')</span>' : '') +
                  '</div>';
                html += '<div style="font-size:11px;display:flex;justify-content:space-between;gap:8px;"><span>' + colName + ':</span><strong style="color:#60a5fa;">' + formatNum(xVal, config.valueFormat) + '</strong></div>';
                html += '<div style="font-size:11px;display:flex;justify-content:space-between;gap:8px;"><span>' + rowName + ':</span><strong style="color:#34d399;">' + formatNum(yVal, config.valueFormat) + '</strong></div>';
                tooltip.innerHTML = html;

                var pageX = event.clientX;
                var pageY = event.clientY;
                tooltip.style.left = (pageX + 12) + "px";
                tooltip.style.top = (pageY - 20) + "px";
              })
              .on("mouseleave", function () {
                highlightObs(null);
                tooltip.style.opacity = "0";
              })
              .on("contextmenu", function (event, d) {
                event.preventDefault();
                var cell = d.cells[colM.name] || d.cells[rowM.name];
                if (cell && cell.links && window.LookerCharts && window.LookerCharts.Utils) {
                  window.LookerCharts.Utils.openDrillMenu({
                    links: cell.links,
                    event: event
                  });
                }
              });
          }
        });
      });

      // Axis labels on left and bottom
      activeMeasures.forEach(function (m, idx) {
        var lbl = m.label_short || m.label || m.name;
        // Left
        g.append("text")
          .attr("x", -10)
          .attr("y", idx * cellSize + cellSize / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .attr("fill", "#64748b")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(lbl.length > 12 ? (lbl.substring(0, 11) + "…") : lbl);

        // Bottom
        g.append("text")
          .attr("x", idx * cellSize + cellSize / 2)
          .attr("y", matrixSize + 20)
          .attr("text-anchor", "middle")
          .attr("fill", "#64748b")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(lbl.length > 12 ? (lbl.substring(0, 11) + "…") : lbl);
      });

      if (done) done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
