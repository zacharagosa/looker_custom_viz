/**
 * Violin & Box Plot Distribution Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed to solve Looker Cloud Blocker b/249062272 (Tableau parity for distribution & boxplot analysis),
 * b/4438305129355018240 (Looker native boxplot restriction blocking raw observation queries and outliers),
 * and b/512744732 (Leveraging Looker's expanded 5,000+ row limit for rich client-side statistical aggregation).
 *
 * Features:
 * - Computes complete statistical distribution directly client-side from raw data rows:
 *   Epanechnikov & Gaussian Kernel Density Estimation (KDE), Silverman's Rule of Thumb bandwidth,
 *   Five-number summary (Min, Q1, Median, Q3, Max), Tukey Whiskers (1.5x IQR), and individual Outliers.
 * - 4 Multi-Modal Rendering Modes:
 *   1. Violin + Box Plot Hybrid (Full KDE envelope with inner IQR box, median circle, and whiskers)
 *   2. Split / Asymmetric Half-Violin (Single-sided density with adjacent boxplot or subgroup split)
 *   3. Box Plot + Jittered Scatter (Strip / Beeswarm plot showing raw sample density)
 *   4. Pure Density Silhouette (Ridge/KDE outline highlighting multi-modal peaks and skewness)
 * - Interactive horizontal value crosshair & synchronized density scrubber
 * - Search-as-you-type category filter and dynamic sorting (By Median, By Count, By IQR Spread, Name)
 * - Executive Statistical KPI Summary HUD
 * - Responsive SVG canvas with smart label rotation and glassmorphism hover cards
 * - Native Looker drill-down menu hooks (LookerCharts.Utils.openDrillMenu)
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
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

  // --- COLOR THEMES ---
  var PALETTES = {
    google_modern: {
      name: "Google Modern",
      colors: ["#1a73e8", "#ea4335", "#fbbc04", "#34a853", "#9334e6", "#12b5cb", "#fa7b17", "#4285f4"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      hudBg: "#f8f9fa",
      boxFill: "#ffffff",
      boxStroke: "#202124",
      medianColor: "#1a73e8",
      whiskerColor: "#5f6368",
      outlierColor: "#ea4335",
      grid: "#f1f3f4"
    },
    looker_classic: {
      name: "Looker Classic Navy & Cyan",
      colors: ["#262d33", "#2e5b88", "#4b7b9f", "#00a4e4", "#7fb2d0", "#1e3d59", "#17b978", "#ff6e40"],
      bg: "#ffffff",
      text: "#262d33",
      subtext: "#70777e",
      border: "#dce0e3",
      hudBg: "#f4f6f8",
      boxFill: "#ffffff",
      boxStroke: "#262d33",
      medianColor: "#00a4e4",
      whiskerColor: "#70777e",
      outlierColor: "#e53935",
      grid: "#eef1f4"
    },
    sunset_ember: {
      name: "Sunset Ember",
      colors: ["#f97316", "#ef4444", "#f59e0b", "#e11d48", "#8b5cf6", "#d97706", "#b91c1c", "#ec4899"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      hudBg: "#fff7ed",
      boxFill: "#ffffff",
      boxStroke: "#7c2d12",
      medianColor: "#ea580c",
      whiskerColor: "#9a3412",
      outlierColor: "#dc2626",
      grid: "#ffedd5"
    },
    emerald_forest: {
      name: "Emerald & Mint",
      colors: ["#059669", "#0d9488", "#10b981", "#34d399", "#0284c7", "#047857", "#065f46", "#14b8a6"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#d1fae5",
      hudBg: "#f0fdf4",
      boxFill: "#ffffff",
      boxStroke: "#065f46",
      medianColor: "#059669",
      whiskerColor: "#047857",
      outlierColor: "#e11d48",
      grid: "#ecfdf5"
    },
    cyber_indigo: {
      name: "Cyber Indigo & Violet",
      colors: ["#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#a855f7", "#ec4899", "#10b981", "#f59e0b"],
      bg: "#ffffff",
      text: "#1e1b4b",
      subtext: "#4338ca",
      border: "#e0e7ff",
      hudBg: "#eef2ff",
      boxFill: "#ffffff",
      boxStroke: "#312e81",
      medianColor: "#4f46e5",
      whiskerColor: "#4338ca",
      outlierColor: "#f43f5e",
      grid: "#f5f7ff"
    },
    wellverse: {
      name: "Wellverse Healthcare",
      colors: ["#007a87", "#00a896", "#028090", "#05668d", "#f08080", "#f4a261", "#e76f51", "#2a9d8f"],
      bg: "#ffffff",
      text: "#134e4a",
      subtext: "#0d9488",
      border: "#ccfbf1",
      hudBg: "#f0fdfa",
      boxFill: "#ffffff",
      boxStroke: "#0f766e",
      medianColor: "#007a87",
      whiskerColor: "#0d9488",
      outlierColor: "#e11d48",
      grid: "#f0fdfa"
    },
    monochrome_slate: {
      name: "Monochrome Executive Slate",
      colors: ["#334155", "#475569", "#64748b", "#1e293b", "#94a3b8", "#0f172a", "#52525b", "#71717a"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "#f8fafc",
      boxFill: "#ffffff",
      boxStroke: "#0f172a",
      medianColor: "#2563eb",
      whiskerColor: "#64748b",
      outlierColor: "#ef4444",
      grid: "#f1f5f9"
    }
  };

  // --- STATISTICAL HELPERS ---
  function computeStats(values, bandwidthFactor) {
    if (!values || values.length === 0) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var n = sorted.length;
    var min = sorted[0];
    var max = sorted[n - 1];

    var sum = 0;
    for (var i = 0; i < n; i++) sum += sorted[i];
    var mean = sum / n;

    var varianceSum = 0;
    for (var j = 0; j < n; j++) {
      var diff = sorted[j] - mean;
      varianceSum += diff * diff;
    }
    var variance = n > 1 ? varianceSum / (n - 1) : 0;
    var stdDev = Math.sqrt(variance);

    function quantile(p) {
      var idx = (n - 1) * p;
      var lo = Math.floor(idx);
      var hi = Math.ceil(idx);
      var weight = idx - lo;
      return sorted[lo] * (1 - weight) + sorted[hi] * weight;
    }

    var q1 = quantile(0.25);
    var median = quantile(0.50);
    var q3 = quantile(0.75);
    var iqr = q3 - q1;

    // Tukey 1.5x IQR Whiskers
    var lowerThreshold = q1 - 1.5 * iqr;
    var upperThreshold = q3 + 1.5 * iqr;

    var whiskerLow = min;
    for (var k = 0; k < n; k++) {
      if (sorted[k] >= lowerThreshold) {
        whiskerLow = sorted[k];
        break;
      }
    }

    var whiskerHigh = max;
    for (var m = n - 1; m >= 0; m--) {
      if (sorted[m] <= upperThreshold) {
        whiskerHigh = sorted[m];
        break;
      }
    }

    var outliers = [];
    var inliers = [];
    for (var p = 0; p < n; p++) {
      var val = sorted[p];
      if (val < lowerThreshold || val > upperThreshold) {
        outliers.push(val);
      } else {
        inliers.push(val);
      }
    }

    // Silverman's Rule of Thumb for Kernel Density Estimation Bandwidth
    // h = 1.06 * min(stdDev, IQR / 1.34) * n^(-1/5)
    var spread = (iqr > 0 && iqr / 1.34 < stdDev) ? (iqr / 1.34) : (stdDev || 1);
    var h = 1.06 * spread * Math.pow(n, -0.2);
    if (h <= 0 || isNaN(h)) h = (max - min) / 20 || 1;

    var bwMultiplier = 1.0;
    if (bandwidthFactor === "smooth") bwMultiplier = 1.6;
    else if (bandwidthFactor === "detailed") bwMultiplier = 0.7;
    else if (bandwidthFactor === "fine") bwMultiplier = 0.4;
    h *= bwMultiplier;

    return {
      n: n,
      min: min,
      max: max,
      mean: mean,
      stdDev: stdDev,
      q1: q1,
      median: median,
      q3: q3,
      iqr: iqr,
      whiskerLow: whiskerLow,
      whiskerHigh: whiskerHigh,
      outliers: outliers,
      inliers: inliers,
      h: h,
      sorted: sorted
    };
  }

  // Epanechnikov Kernel Density Estimation
  function epanechnikovKernel(u) {
    return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
  }

  function computeKDE(stats, numSteps, clipRange) {
    if (!stats || stats.n === 0) return { points: [], maxDensity: 0 };
    var steps = numSteps || 60;

    // Evaluate between the Tukey fences (the statistical body of the distribution)
    // rather than the absolute min/max. A lone extreme value would otherwise stretch
    // the envelope into a hairline spike; those points are drawn as outlier dots.
    // The range is then intersected with the visible axis window.
    var yStart = stats.whiskerLow;
    var yEnd = stats.whiskerHigh;
    if (!(yEnd > yStart)) {
      yStart = stats.min;
      yEnd = stats.max;
    }
    if (!(yEnd > yStart)) {
      yStart = stats.median - 1;
      yEnd = stats.median + 1;
    }
    var span = yEnd - yStart;
    var pad = Math.min(span * 0.1, stats.h * 1.1);
    yStart = Math.max(stats.min, yStart - pad);
    yEnd = Math.min(stats.max, yEnd + pad);
    if (clipRange) {
      yStart = Math.max(yStart, clipRange[0]);
      yEnd = Math.min(yEnd, clipRange[1]);
    }
    if (!(yEnd > yStart)) {
      yStart = stats.median - 1;
      yEnd = stats.median + 1;
    }

    var stepSize = (yEnd - yStart) / (steps - 1);
    var densityCurve = [];
    var maxDensity = 0;
    var n = stats.n;
    var h = stats.h;
    var sorted = stats.sorted;

    for (var s = 0; s < steps; s++) {
      var y = yStart + s * stepSize;
      var sumKernel = 0;

      for (var i = 0; i < n; i++) {
        var u = (y - sorted[i]) / h;
        sumKernel += epanechnikovKernel(u);
      }

      var density = (sumKernel / (n * h));
      if (density > maxDensity) maxDensity = density;
      densityCurve.push({ y: y, density: density });
    }

    // Force zero density at ends for closed droplet silhouette
    if (densityCurve.length > 1) {
      densityCurve[0].density = 0;
      densityCurve[densityCurve.length - 1].density = 0;
    }

    return {
      points: densityCurve,
      maxDensity: maxDensity
    };
  }

  // Value formatting helper
  function formatValue(val, fmt) {
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
      case "decimal_2":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "integer":
        return Math.round(num).toLocaleString();
      default:
        return Math.abs(num) >= 100 ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }) : num.toFixed(2);
    }
  }

  // --- LOOKER VISUALIZATION PLUGIN DEFINITION ---
  looker.plugins.visualizations.add({
    id: "violin_distribution_plot",
    label: "Violin & Box Plot Distribution Analyzer",
        options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      displayMode: {
        type: "string",
        label: "Distribution Layout Mode",
        default: "violin_box",
        display: "select",
        values: [
          { "Violin + Box Plot (Full Distribution & Quartiles)": "violin_box" },
          { "Split / Asymmetric Half-Violin (Single-Sided Density)": "split_violin" },
          { "Box Plot + Jittered Scatter (Strip / Beeswarm)": "box_jitter" },
          { "Pure Density Silhouette (KDE Ridge Curve)": "density_silhouette" }
        ],
        section: "Display",
        order: 1
      },
      categoryDimOverride: {
        type: "string",
        label: "Category Dimension (X-Axis Lane)",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      metricMeasureOverride: {
        type: "string",
        label: "Observation Value Measure / Numeric Field (Y-Axis)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      observationDimOverride: {
        type: "string",
        label: "Observation ID Dimension (Row De-duplication PK)",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      subgroupDimOverride: {
        type: "string",
        label: "Subgroup Split Dimension (Optional Color Split)",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      bandwidthFactor: {
        type: "string",
        label: "Kernel Smoothing Bandwidth",
        default: "auto",
        display: "select",
        values: [
          { "Auto (Silverman's Optimal Rule)": "auto" },
          { "Smooth (1.6x Bandwidth)": "smooth" },
          { "Detailed (0.7x Bandwidth)": "detailed" },
          { "Ultra Fine (0.4x Bandwidth)": "fine" }
        ],
        section: "Display",
        order: 6
      },
      scalingMode: {
        type: "string",
        label: "Violin Width Scaling",
        default: "shared",
        display: "select",
        values: [
          { "Shared Global Scale (Equal Density Across Categories)": "shared" },
          { "Independent Scale (Maximize Lane Width per Category)": "independent" }
        ],
        section: "Display",
        order: 7
      },
      yAxisScope: {
        type: "string",
        label: "Y-Axis Zoom Scope",
        default: "robust",
        display: "select",
        values: [
          { "Robust Zoom (Clip Extreme Outliers, Maximize Shape)": "robust" },
          { "Percentile Clip (1st–99th Percentile)": "p99" },
          { "Full Range (Include All Extreme Values)": "full" }
        ],
        section: "Display",
        order: 8
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Reference Line Mode",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "Dataset Mean (Overall Average)": "dataset_mean" },
          { "Dataset Median (Overall P50)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Top Decile Benchmark (P90)": "percentile_p90" },
          { "Fixed Target Value": "fixed_value" },
          { "None (Hide Benchmark Line)": "none" }
        ],
        default: "dataset_median"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 10,
        default: 0
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        section: "Display",
        order: 11,
        default: "Target Benchmark"
      },
      anomalyAlertThreshold: {
        type: "number",
        label: "Outlier Alert Threshold %",
        section: "Display",
        order: 12,
        default: 15
      },
      sortOrder: {
        type: "string",
        label: "Category Sorting & Ordering",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Median Metric Descending (Highest First)": "metric_desc" },
          { "Median Metric Ascending (Lowest First)": "metric_asc" },
          { "Sample Count Descending": "count_desc" },
          { "Spread / IQR Spread Descending": "spread_iqr_desc" },
          { "Alphabetical by Category Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc"
      },
      topN: {
        type: "string",
        label: "Top-N Category Focus Limit",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "All Categories (No Limit)": "all" },
          { "Top 5 Categories Only": "5" },
          { "Top 8 Categories Only": "8" },
          { "Top 10 Categories Only": "10" },
          { "Top 15 Categories Only": "15" },
          { "Top 20 Categories Only": "20" }
        ],
        default: "all"
      },
      rollupOther: {
        type: "boolean",
        label: "Rollup Excluded Categories into 'Other'",
        section: "Display",
        order: 15,
        default: false
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Empty & Null Observation Categories",
        section: "Display",
        order: 16,
        default: true
      },
      showOutliers: {
        type: "boolean",
        label: "Show Outlier Scatter Points (>1.5x IQR)",
        default: true,
        section: "Display",
        order: 17
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 18,
        display: "select",
        values: [
          { "Full Scorecard Strip": "full" },
          { "Compact Metric Pill": "compact" },
          { "Hidden (Maximum Canvas)": "hidden" }
        ],
        default: "full"
      },
      dataLabelDensity: {
        type: "string",
        label: "Distribution Data Value Labels",
        section: "Display",
        order: 19,
        display: "select",
        values: [
          { "All Key Quartiles (Min, Q1, Median, Q3, Max)": "all" },
          { "Extreme Peaks Only (Min & Max Bounds)": "peaks_only" },
          { "Hidden (Hover Only)": "hidden" }
        ],
        default: "peaks_only"
      },
      showSearch: {
        type: "boolean",
        label: "Enable Category Search Bar",
        default: true,
        section: "Display",
        order: 20
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 21,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 22,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Theme & Palette",
        default: "google_modern",
        display: "select",
        values: [
          { "Google Modern (Enterprise Blue, Red, Amber, Green)": "google_modern" },
          { "Looker Classic Navy & Cyan": "looker_classic" },
          { "Modern Executive Slate (Indigo & Charcoal)": "monochrome_slate" },
          { "Cyber Indigo & Violet": "cyber_indigo" },
          { "Emerald & Mint (FinOps Green)": "emerald_forest" },
          { "Sunset Ember (Orange & Crimson)": "sunset_ember" },
          { "Wellverse Healthcare (Teal & Coral)": "wellverse" },
          { "Custom Primary Hex Accent": "custom" }
        ],
        section: "Style",
        order: 1
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
        label: "Custom Warning / Alert Hex",
        section: "Style",
        order: 4,
        display: "color",
        default: ""
      },
      fillOpacity: {
        type: "string",
        label: "Violin Fill Opacity",
        default: "0.75",
        display: "select",
        values: [
          { "90% Vibrant Fill": "0.90" },
          { "75% Soft Fill": "0.75" },
          { "50% Translucent Fill": "0.50" },
          { "30% Minimal Outline Tint": "0.30" }
        ],
        section: "Style",
        order: 5
      },
      boxPlotWidth: {
        type: "string",
        label: "Inner Box Plot Width",
        default: "medium",
        display: "select",
        values: [
          { "Medium Width (14px)": "medium" },
          { "Slim Width (8px)": "slim" },
          { "Wide Width (22px)": "wide" }
        ],
        section: "Style",
        order: 6
      },
      showGridlines: {
        type: "boolean",
        label: "Show Horizontal Gridlines",
        default: true,
        section: "Style",
        order: 7
      },
      showMeanMarker: {
        type: "boolean",
        label: "Show Mean Diamond Marker",
        default: true,
        section: "Style",
        order: 8
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        section: "Style",
        order: 9,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Margin, Volume, Accuracy)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Cost, Defect Rate)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography & UI Scale",
        section: "Style",
        order: 10,
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
        label: "Value Formatting",
        default: "auto",
        display: "select",
        values: [
          { "Auto Detect by Metric Name": "auto" },
          { "Compact Currency ($1.2k, $4.5M)": "compact_currency" },
          { "Compact Number (1.2k, 4.5M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (0.00)": "decimal_2" },
          { "Integer (0)": "integer" },
          { "Raw Numeric": "raw" }
        ],
        section: "Style",
        order: 11
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        categoryDimOverride: { role: "dimension", defaultIdx: 0 },
        metricMeasureOverride: { role: "measure", defaultIdx: 0 },
        observationDimOverride: { role: "dimension", defaultIdx: -1 },
        subgroupDimOverride: { role: "dimension", defaultIdx: -1 }
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
      container.className = "violin-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      element.appendChild(container);
      this._container = container;

      // Create floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "violin-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "10000";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.transition = "opacity 0.12s ease-out, transform 0.12s ease-out";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.45";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
      this._searchTerm = "";

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

      var container = element.querySelector(".violin-root-container");
      if (!container) {
        element.innerHTML = "";
        container = document.createElement("div");
        container.className = "violin-root-container";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        element.appendChild(container);
        this._container = container;
      }

      var fields = queryResponse && queryResponse.fields;
      if (!fields || !data || data.length === 0) {
        container.innerHTML = "<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;">Awaiting query results...</div>";
        if (done) done();
        return;
      }

      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      if (dimensions.length === 0 && measures.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Missing Fields",
            message: "Violin Plot requires at least 1 Category Dimension and 1 Numeric Measure or Dimension."
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
          console.error("Violin Plot Render Error:", err);
          container.innerHTML = "<div style="padding:20px;color:#ef4444;">Render Error: " + err.message + "</div>";
        }
        if (done) done();
      });
    },

    renderChart: function (d3, container, data, config, queryResponse) {
      var self = this;
      var fields = queryResponse.fields;
      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      // Field Resolution with Dynamic Overrides
      function isIdentifier(name) {
        return /(^|[._])id$/i.test(name) || /(^|[._]).*_id$/i.test(name);
      }
      function numericCount(name) {
        var hits = 0;
        for (var i = 0; i < data.length; i++) {
          var cell = data[i][name];
          var v = cell ? cell.value : null;
          if (v !== null && v !== undefined && v !== "" && !isNaN(Number(v))) hits++;
          if (hits > 3) break;
        }
        return hits;
      }

      var catField = (config.categoryDimOverride && config.categoryDimOverride !== "") ? config.categoryDimOverride : (dimensions[0] ? dimensions[0].name : "Category");
      var catLabel = "Category";
      for (var d = 0; d < dimensions.length; d++) {
        if (dimensions[d].name === catField) {
          catLabel = dimensions[d].label_short || dimensions[d].label || catField;
          break;
        }
      }

      var valField = (config.metricMeasureOverride && config.metricMeasureOverride !== "") ? config.metricMeasureOverride : null;
      var valLabel = "Value";

      if (!valField) {
        var candidates = [];
        for (var m = 0; m < measures.length; m++) candidates.push(measures[m]);
        var dimCandidates = dimensions.filter(function (dm) { return dm.name !== catField; });
        dimCandidates.sort(function (a, b) {
          return (isIdentifier(a.name) ? 1 : 0) - (isIdentifier(b.name) ? 1 : 0);
        });
        candidates = candidates.concat(dimCandidates);
        for (var cd = 0; cd < candidates.length; cd++) {
          if (numericCount(candidates[cd].name) > 0) {
            valField = candidates[cd].name;
            valLabel = candidates[cd].label_short || candidates[cd].label || candidates[cd].name;
            break;
          }
        }
      } else {
        var allFields = dimensions.concat(measures);
        for (var af = 0; af < allFields.length; af++) {
          if (allFields[af].name === valField) {
            valLabel = allFields[af].label_short || allFields[af].label || valField;
            break;
          }
        }
      }

      if (!valField) {
        container.innerHTML = "<div style="padding:20px;color:#64748b;">Please add a numeric measure or dimension to plot distributions.</div>";
        return;
      }

      // Configuration settings
      var themeKey = config.colorPalette || "google_modern";
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.google_modern);
      if (config.customPrimaryColor) theme.medianColor = config.customPrimaryColor;
      var posColor = config.customPositiveColor || "#059669";
      var negColor = config.customNegativeColor || "#e11d48";

      var displayMode = config.displayMode || "violin_box";
      var bandwidthFactor = config.bandwidthFactor || "auto";
      var scalingMode = config.scalingMode || "shared";
      var yAxisScope = config.yAxisScope || "robust";
      var showOutliers = config.showOutliers !== false;
      var hudMode = config.hudMode || "full";
      var showSearch = config.showSearch !== false;
      var fillOpacity = parseFloat(config.fillOpacity || "0.75");
      var boxPlotWidthSetting = config.boxPlotWidth || "medium";
      var showGridlines = config.showGridlines !== false;
      var showMeanMarker = config.showMeanMarker !== false;
      var polarity = config.metricPolarity || "higher_is_better";
      var fontScale = config.fontScale || "standard";
      var labelDensity = config.dataLabelDensity || "peaks_only";
      var targetMode = config.targetCalculationMode || "dataset_median";
      var refLineLabel = config.referenceLineLabel || "Benchmark Target";
      var alertThreshold = config.anomalyAlertThreshold !== undefined ? Number(config.anomalyAlertThreshold) : 15;
      var sortOrder = config.sortOrder || "metric_desc";
      var topN = config.topN || "all";
      var rollupOther = config.rollupOther === true;
      var suppressNulls = config.suppressNulls !== false;

      var valueFormatSetting = config.valueFormat || "auto";
      var effectiveFormat = valueFormatSetting;
      if (effectiveFormat === "auto") {
        var lowerValName = (valField + " " + valLabel).toLowerCase();
        if (/price|cost|revenue|sales|spend|margin|arr|mrr|usd|\$/i.test(lowerValName)) {
          effectiveFormat = "compact_currency";
        } else if (/pct|percent|ratio|rate|share|penetration/i.test(lowerValName)) {
          effectiveFormat = "percentage";
        } else {
          effectiveFormat = "compact_num";
        }
      }

      var boxWidth = boxPlotWidthSetting === "slim" ? 8 : (boxPlotWidthSetting === "wide" ? 22 : 14);

      // --- AGGREGATE RAW OBSERVATIONS BY CATEGORY ---
      var groupsMap = {};
      var allNumericValues = [];
      var totalRows = data.length;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var catVal = row[catField] ? (row[catField].rendered || row[catField].value) : "Unknown";
        if (catVal === null || catVal === undefined || catVal === "") {
          if (suppressNulls) continue;
          catVal = "Unknown";
        }
        catVal = String(catVal);

        var rawNum = row[valField] ? row[valField].value : null;
        if (rawNum === null || rawNum === undefined || isNaN(Number(rawNum))) {
          if (suppressNulls) continue;
          continue;
        }
        var num = Number(rawNum);

        if (!groupsMap[catVal]) {
          groupsMap[catVal] = {
            category: catVal,
            values: [],
            links: (row[catField] && row[catField].links) ? row[catField].links : []
          };
        }
        groupsMap[catVal].values.push(num);
        allNumericValues.push(num);
      }

      var categories = Object.keys(groupsMap);
      if (categories.length === 0 || allNumericValues.length === 0) {
        container.innerHTML = "<div style="padding:20px;color:#64748b;">No numeric data points found to plot.</div>";
        return;
      }

      // Compute stats for all groups
      var categoryStatsList = [];
      categories.forEach(function (cat) {
        var vals = groupsMap[cat].values;
        if (vals.length === 0) return;
        var st = computeStats(vals, bandwidthFactor);
        categoryStatsList.push({
          category: cat,
          values: vals,
          links: groupsMap[cat].links,
          stats: st
        });
      });

      // Dataset-wide statistics & Benchmark Target calculation
      var datasetStats = computeStats(allNumericValues, bandwidthFactor);
      var benchmarkTarget = null;
      if (targetMode === "dataset_mean") benchmarkTarget = datasetStats.mean;
      else if (targetMode === "dataset_median") benchmarkTarget = datasetStats.median;
      else if (targetMode === "percentile_p75") benchmarkTarget = datasetStats.q3;
      else if (targetMode === "percentile_p90") {
        var sortedAll = allNumericValues.slice().sort(function(a,b){return a-b;});
        var p90Idx = Math.floor(sortedAll.length * 0.90);
        benchmarkTarget = sortedAll[Math.min(p90Idx, sortedAll.length - 1)];
      } else if (targetMode === "fixed_value") {
        benchmarkTarget = Number(config.fixedTargetValue || 0);
      }

      // Sorting
      if (sortOrder === "metric_desc") {
        categoryStatsList.sort(function (a, b) { return b.stats.median - a.stats.median; });
      } else if (sortOrder === "metric_asc") {
        categoryStatsList.sort(function (a, b) { return a.stats.median - b.stats.median; });
      } else if (sortOrder === "count_desc") {
        categoryStatsList.sort(function (a, b) { return b.stats.n - a.stats.n; });
      } else if (sortOrder === "spread_iqr_desc") {
        categoryStatsList.sort(function (a, b) { return b.stats.iqr - a.stats.iqr; });
      } else if (sortOrder === "alphabetical") {
        categoryStatsList.sort(function (a, b) { return a.category.localeCompare(b.category); });
      }

      // Top-N & Rollup Other
      var topNLimit = topN !== "all" ? parseInt(topN, 10) : Infinity;
      if (categoryStatsList.length > topNLimit) {
        if (rollupOther) {
          var keep = categoryStatsList.slice(0, topNLimit);
          var other = categoryStatsList.slice(topNLimit);
          var otherVals = [];
          var otherLinks = [];
          other.forEach(function (o) {
            otherVals = otherVals.concat(o.values);
            if (o.links && o.links.length) otherLinks = otherLinks.concat(o.links);
          });
          var otherStats = computeStats(otherVals, bandwidthFactor);
          keep.push({
            category: "Other (" + other.length + " groups)",
            values: otherVals,
            links: otherLinks,
            stats: otherStats
          });
          categoryStatsList = keep;
        } else {
          categoryStatsList = categoryStatsList.slice(0, topNLimit);
        }
      }

      // Search Filtering
      var searchTerm = (self._searchTerm || "").trim().toLowerCase();
      var filteredCategories = categoryStatsList.filter(function (cs) {
        if (!searchTerm) return true;
        return cs.category.toLowerCase().indexOf(searchTerm) !== -1;
      });

      if (filteredCategories.length === 0) {
        container.innerHTML = "<div style="padding:20px;color:#64748b;">No categories match search filter: \"" + searchTerm + "\".</div>";
        return;
      }

      // Compute Y-Axis Range across visible categories
      var yMin = Infinity;
      var yMax = -Infinity;
      filteredCategories.forEach(function (c) {
        if (yAxisScope === "robust") {
          if (c.stats.whiskerLow < yMin) yMin = c.stats.whiskerLow;
          if (c.stats.whiskerHigh > yMax) yMax = c.stats.whiskerHigh;
        } else if (yAxisScope === "p99") {
          var p01 = c.stats.sorted[Math.floor(c.stats.n * 0.01)];
          var p99 = c.stats.sorted[Math.floor(c.stats.n * 0.99)];
          if (p01 < yMin) yMin = p01;
          if (p99 > yMax) yMax = p99;
        } else {
          if (c.stats.min < yMin) yMin = c.stats.min;
          if (c.stats.max > yMax) yMax = c.stats.max;
        }
      });

      if (benchmarkTarget !== null) {
        if (benchmarkTarget < yMin) yMin = benchmarkTarget;
        if (benchmarkTarget > yMax) yMax = benchmarkTarget;
      }

      var yPadding = (yMax - yMin) * 0.08 || 1;
      var yRange = [yMin - yPadding, yMax + yPadding];

      // Compute KDE for each lane
      var globalMaxDensity = 0;
      filteredCategories.forEach(function (c) {
        c.kde = computeKDE(c.stats, 60, yRange);
        if (c.kde.maxDensity > globalMaxDensity) globalMaxDensity = c.kde.maxDensity;
      });

      // Clear container DOM
      container.innerHTML = "";
      container.style.background = theme.bg;

      // --- RENDER EXECUTIVE HUD & SEARCH BAR ---
      if (hudMode !== "hidden") {
        var headerEl = document.createElement("div");
        headerEl.style.padding = fontScale === "compact" ? "6px 12px" : "10px 18px";
        headerEl.style.borderBottom = "1px solid " + theme.border;
        headerEl.style.display = "flex";
        headerEl.style.flexWrap = "wrap";
        headerEl.style.alignItems = "center";
        headerEl.style.justifyContent = "space-between";
        headerEl.style.gap = "10px";
        headerEl.style.background = theme.bg;
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
          searchInput.placeholder = "🔍 Filter categories...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.padding = "4px 8px";
          searchInput.style.fontSize = "11px";
          searchInput.style.borderRadius = "6px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";
          searchInput.style.color = theme.text;
          searchInput.style.background = theme.hudBg;
          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.renderChart(d3, container, data, config, queryResponse);
          };
          leftControls.appendChild(searchInput);
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
          card.style.background = theme.hudBg;
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
            bd.style.background = badgeColor || theme.medianColor;
            bd.style.color = "#ffffff";
            bd.textContent = badge;
            valRow.appendChild(bd);
          }
          card.appendChild(valRow);
          return card;
        }

        if (hudMode === "full") {
          hudEl.appendChild(createHudCard("Categories", filteredCategories.length));
          hudEl.appendChild(createHudCard("Observations", datasetStats.n.toLocaleString()));
          hudEl.appendChild(createHudCard("Median " + valLabel, formatValue(datasetStats.median, effectiveFormat)));

          if (benchmarkTarget !== null) {
            var isGood = polarity === "higher_is_better" ? (datasetStats.median >= benchmarkTarget) : (datasetStats.median <= benchmarkTarget);
            var badgeText = isGood ? "✓ Met" : "! Gap";
            var badgeColor = isGood ? posColor : negColor;
            hudEl.appendChild(createHudCard(refLineLabel, formatValue(benchmarkTarget, effectiveFormat), badgeText, badgeColor));
          }

          var totalOutliers = 0;
          filteredCategories.forEach(function (c) { totalOutliers += c.stats.outliers.length; });
          var outlierPct = (totalOutliers / datasetStats.n) * 100;
          var outlierAlert = outlierPct >= alertThreshold;
          hudEl.appendChild(createHudCard("Outliers", totalOutliers + " (" + outlierPct.toFixed(1) + "%)", outlierAlert ? "Alert" : null, negColor));
        } else {
          // Compact HUD Pill
          var pill = document.createElement("div");
          pill.style.padding = "3px 10px";
          pill.style.borderRadius = "12px";
          pill.style.background = theme.hudBg;
          pill.style.border = "1px solid " + theme.border;
          pill.style.fontSize = "11px";
          pill.style.color = theme.text;
          pill.innerHTML = "<b>" + filteredCategories.length + "</b> lanes · <b>" + datasetStats.n.toLocaleString() + "</b> obs · Median: <b>" + formatValue(datasetStats.median, effectiveFormat) + "</b>";
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
      chartWrapper.style.overflowX = "auto";
      chartWrapper.style.overflowY = "hidden";
      container.appendChild(chartWrapper);

      var containerWidth = chartWrapper.clientWidth || container.clientWidth || 800;
      var containerHeight = chartWrapper.clientHeight || 450;
      var minLaneWidth = 72;
      var calculatedWidth = Math.max(containerWidth, filteredCategories.length * minLaneWidth + 120);

      var margin = { top: 25, right: 80, bottom: 65, left: 70 };
      var width = calculatedWidth - margin.left - margin.right;
      var height = containerHeight - margin.top - margin.bottom;
      if (height < 150) height = 150;

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", calculatedWidth)
        .attr("height", containerHeight)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var yScale = d3.scaleLinear()
        .domain(yRange)
        .range([height, 0])
        .clamp(true);

      var xScale = d3.scaleBand()
        .domain(filteredCategories.map(function (d) { return d.category; }))
        .range([0, width])
        .padding(0.18);

      var laneWidth = xScale.bandwidth();

      var colorScale = d3.scaleOrdinal()
        .domain(filteredCategories.map(function (d) { return d.category; }))
        .range(theme.colors);

      // Horizontal Gridlines
      if (showGridlines) {
        var yAxisGrid = d3.axisLeft(yScale)
          .ticks(6)
          .tickSize(-width)
          .tickFormat("");

        g.append("g")
          .attr("class", "y-grid")
          .call(yAxisGrid)
          .selectAll("line")
          .attr("stroke", theme.grid)
          .attr("stroke-dasharray", "3,3");

        g.select(".y-grid .domain").remove();
      }

      // Benchmark Reference Line across all lanes
      if (benchmarkTarget !== null) {
        var targetY = yScale(benchmarkTarget);
        var refLineGroup = g.append("g").attr("class", "benchmark-reference-group");
        refLineGroup.append("line")
          .attr("x1", 0)
          .attr("x2", width)
          .attr("y1", targetY)
          .attr("y2", targetY)
          .attr("stroke", theme.medianColor)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "5,4")
          .attr("opacity", 0.85);

        // Right margin label badge
        var badgeGroup = refLineGroup.append("g")
          .attr("transform", "translate(" + (width + 6) + "," + (targetY - 10) + ")");
        badgeGroup.append("rect")
          .attr("rx", 4)
          .attr("width", 70)
          .attr("height", 18)
          .attr("fill", theme.medianColor)
          .attr("opacity", 0.9);
        badgeGroup.append("text")
          .attr("x", 35)
          .attr("y", 12)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .text(refLineLabel.substring(0, 8) + ": " + formatValue(benchmarkTarget, effectiveFormat));
      }

      // Render Lanes
      var lanes = g.selectAll(".violin-lane")
        .data(filteredCategories)
        .enter()
        .append("g")
        .attr("class", "violin-lane")
        .attr("transform", function (d) {
          return "translate(" + xScale(d.category) + ", 0)";
        })
        .style("cursor", "pointer");

      // Hover background
      lanes.append("rect")
        .attr("class", "lane-hover-bg")
        .attr("x", -xScale.padding() * laneWidth / 2)
        .attr("y", 0)
        .attr("width", laneWidth * (1 + xScale.padding()))
        .attr("height", height)
        .attr("fill", "transparent")
        .attr("rx", 6);

      lanes.each(function (d) {
        var lane = d3.select(this);
        var stats = d.stats;
        var kde = d.kde;
        var catColor = colorScale(d.category);
        var center = laneWidth / 2;
        var maxDensityForLane = scalingMode === "independent" ? kde.maxDensity : globalMaxDensity;
        if (maxDensityForLane === 0) maxDensityForLane = 1;

        var halfMaxViolinWidth = (laneWidth * 0.44);
        var densityScale = d3.scaleLinear()
          .domain([0, maxDensityForLane])
          .range([0, halfMaxViolinWidth]);

        // 1. VIOLIN ENVELOPE
        if (displayMode !== "box_jitter") {
          var areaGenerator;
          if (displayMode === "split_violin") {
            areaGenerator = d3.area()
              .x0(center)
              .x1(function (pt) { return center + densityScale(pt.density); })
              .y(function (pt) { return yScale(pt.y); })
              .curve(d3.curveCatmullRom);
          } else {
            areaGenerator = d3.area()
              .x0(function (pt) { return center - densityScale(pt.density); })
              .x1(function (pt) { return center + densityScale(pt.density); })
              .y(function (pt) { return yScale(pt.y); })
              .curve(d3.curveCatmullRom);
          }

          lane.append("path")
            .datum(kde.points)
            .attr("class", "violin-body")
            .attr("d", areaGenerator)
            .attr("fill", catColor)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", catColor)
            .attr("stroke-width", displayMode === "density_silhouette" ? 2 : 1.2)
            .attr("stroke-linejoin", "round");
        }

        // 2. BOX PLOT & QUARTILES
        if (displayMode !== "density_silhouette") {
          var boxCenter = displayMode === "split_violin" ? center - (boxWidth / 2) - 2 : center;

          // Whisker Line
          lane.append("line")
            .attr("class", "whisker-stem")
            .attr("x1", boxCenter)
            .attr("x2", boxCenter)
            .attr("y1", yScale(stats.whiskerLow))
            .attr("y2", yScale(stats.whiskerHigh))
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.5)
            .attr("stroke-linecap", "round");

          // Whisker Caps
          var capWidth = boxWidth * 0.7;
          lane.append("line")
            .attr("class", "whisker-cap-low")
            .attr("x1", boxCenter - capWidth / 2)
            .attr("x2", boxCenter + capWidth / 2)
            .attr("y1", yScale(stats.whiskerLow))
            .attr("y2", yScale(stats.whiskerLow))
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.5);

          lane.append("line")
            .attr("class", "whisker-cap-high")
            .attr("x1", boxCenter - capWidth / 2)
            .attr("x2", boxCenter + capWidth / 2)
            .attr("y1", yScale(stats.whiskerHigh))
            .attr("y2", yScale(stats.whiskerHigh))
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.5);

          // IQR Box
          lane.append("rect")
            .attr("class", "iqr-box")
            .attr("x", boxCenter - boxWidth / 2)
            .attr("y", yScale(stats.q3))
            .attr("width", boxWidth)
            .attr("height", Math.max(2, yScale(stats.q1) - yScale(stats.q3)))
            .attr("fill", theme.boxFill)
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.5)
            .attr("rx", 2);

          // Median Marker
          lane.append("circle")
            .attr("class", "median-dot")
            .attr("cx", boxCenter)
            .attr("cy", yScale(stats.median))
            .attr("r", Math.max(3, boxWidth / 3.5))
            .attr("fill", theme.medianColor)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5);

          // Mean Marker
          if (showMeanMarker) {
            var meanY = yScale(stats.mean);
            var diamondSize = 4;
            var diamondPath = "M " + boxCenter + " " + (meanY - diamondSize) +
                              " L " + (boxCenter + diamondSize) + " " + meanY +
                              " L " + boxCenter + " " + (meanY + diamondSize) +
                              " L " + (boxCenter - diamondSize) + " " + meanY + " Z";
            lane.append("path")
              .attr("class", "mean-marker")
              .attr("d", diamondPath)
              .attr("fill", "#f59e0b")
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 1);
          }
        }

        // 3. JITTER SCATTER POINTS
        if (displayMode === "box_jitter" || showOutliers) {
          var ptsToPlot = displayMode === "box_jitter" ? stats.sorted : stats.outliers;
          var scatterCenter = displayMode === "split_violin" ? center + 12 : center;
          var maxJitter = displayMode === "box_jitter" ? (laneWidth * 0.32) : 6;

          lane.selectAll(".point-dot")
            .data(ptsToPlot)
            .enter()
            .append("circle")
            .attr("class", "point-dot")
            .attr("cx", function (v, i) {
              var pseudoRand = Math.sin(i * 12.9898 + v) * 43758.5453;
              var jitter = ((pseudoRand - Math.floor(pseudoRand)) - 0.5) * 2 * maxJitter;
              return scatterCenter + jitter;
            })
            .attr("cy", function (v) { return yScale(v); })
            .attr("r", displayMode === "box_jitter" ? 2.5 : 3.5)
            .attr("fill", function () {
              return displayMode === "box_jitter" ? catColor : theme.outlierColor;
            })
            .attr("fill-opacity", displayMode === "box_jitter" ? 0.45 : 0.85)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 0.6);
        }

        // 4. DATA VALUE LABELS
        if (labelDensity !== "hidden") {
          var labelX = center + (boxWidth / 2) + 6;
          function addValLabel(yVal, txt, color, isBold) {
            lane.append("text")
              .attr("x", labelX)
              .attr("y", yScale(yVal) + 3)
              .attr("fill", color || theme.text)
              .attr("font-size", fontScale === "compact" ? "9px" : "10px")
              .attr("font-weight", isBold ? "700" : "500")
              .text(txt);
          }

          if (labelDensity === "all") {
            addValLabel(stats.whiskerHigh, "Max: " + formatValue(stats.whiskerHigh, effectiveFormat), theme.subtext, false);
            addValLabel(stats.q3, "Q3: " + formatValue(stats.q3, effectiveFormat), theme.subtext, false);
            addValLabel(stats.median, formatValue(stats.median, effectiveFormat), theme.medianColor, true);
            addValLabel(stats.q1, "Q1: " + formatValue(stats.q1, effectiveFormat), theme.subtext, false);
            addValLabel(stats.whiskerLow, "Min: " + formatValue(stats.whiskerLow, effectiveFormat), theme.subtext, false);
          } else if (labelDensity === "peaks_only") {
            addValLabel(stats.whiskerHigh, formatValue(stats.whiskerHigh, effectiveFormat), theme.subtext, false);
            addValLabel(stats.median, formatValue(stats.median, effectiveFormat), theme.medianColor, true);
            addValLabel(stats.whiskerLow, formatValue(stats.whiskerLow, effectiveFormat), theme.subtext, false);
          }
        }
      });

      // X Axis
      var xAxis = d3.axisBottom(xScale);
      var xAxisG = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      xAxisG.select(".domain").attr("stroke", theme.border);
      xAxisG.selectAll(".tick line").attr("stroke", theme.border);
      xAxisG.selectAll(".tick text")
        .attr("fill", theme.text)
        .attr("font-size", fontScale === "compact" ? "10px" : "11px")
        .attr("font-weight", "600")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-32)");

      // Y Axis
      var yAxis = d3.axisLeft(yScale)
        .ticks(7)
        .tickFormat(function (d) { return formatValue(d, effectiveFormat); });

      var yAxisG = g.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

      yAxisG.select(".domain").attr("stroke", theme.border);
      yAxisG.selectAll(".tick line").attr("stroke", theme.border);
      yAxisG.selectAll(".tick text")
        .attr("fill", theme.subtext)
        .attr("font-size", fontScale === "compact" ? "10px" : "11px");

      // Y Axis Title
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text(valLabel);

      // Tooltip Interactions
      lanes.on("mousemove", function (event, d) {
        var s = d.stats;
        var tip = self._tooltip;
        if (!tip) return;
        tip.style.display = "block";
        tip.style.background = theme.bg;
        tip.style.color = theme.text;
        tip.style.border = "1px solid " + theme.border;

        var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;color:" + theme.text + ";'>" + d.category + "</div>" +
                   "<div style='display:grid;grid-template-columns:auto auto;gap:3px 12px;font-size:11px;'>" +
                   "<span style='color:" + theme.subtext + ";'>Sample Size:</span><span style='font-weight:600;text-align:right;'>" + s.n.toLocaleString() + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>Median:</span><span style='font-weight:700;color:" + theme.medianColor + ";text-align:right;'>" + formatValue(s.median, effectiveFormat) + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>Mean:</span><span style='font-weight:600;text-align:right;'>" + formatValue(s.mean, effectiveFormat) + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>IQR (Q1–Q3):</span><span style='font-weight:600;text-align:right;'>" + formatValue(s.q1, effectiveFormat) + " – " + formatValue(s.q3, effectiveFormat) + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>Tukey Whiskers:</span><span style='font-weight:600;text-align:right;'>" + formatValue(s.whiskerLow, effectiveFormat) + " – " + formatValue(s.whiskerHigh, effectiveFormat) + "</span>" +
                   "<span style='color:" + theme.subtext + ";'>Outliers:</span><span style='font-weight:600;color:" + theme.outlierColor + ";text-align:right;'>" + s.outliers.length + " (" + ((s.outliers.length / s.n) * 100).toFixed(1) + "%)</span>";

        if (benchmarkTarget !== null) {
          var delta = s.median - benchmarkTarget;
          var deltaPct = (delta / benchmarkTarget) * 100;
          var sign = delta >= 0 ? "+" : "";
          var isFavorable = polarity === "higher_is_better" ? (delta >= 0) : (delta <= 0);
          var deltaColor = isFavorable ? posColor : negColor;
          html += "<span style='color:" + theme.subtext + ";'>Vs Benchmark:</span><span style='font-weight:700;color:" + deltaColor + ";text-align:right;'>" + sign + deltaPct.toFixed(1) + "% (" + formatValue(delta, effectiveFormat) + ")</span>";
        }
        html += "</div>";

        if (d.links && d.links.length > 0) {
          html += "<div style='margin-top:6px;font-size:10px;color:" + theme.medianColor + ";border-top:1px solid " + theme.border + ";padding-top:4px;'>🔎 Click to open Looker drill menu</div>";
        }

        tip.innerHTML = html;
        var tipW = 240;
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

      // Drilldown click
      lanes.on("click", function (event, d) {
        if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: d.links,
            event: event
          });
        }
      });
    }
  });
})();
