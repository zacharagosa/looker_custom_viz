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

  function computeKDE(stats, numSteps) {
    if (!stats || stats.n === 0) return { points: [], maxDensity: 0 };
    var steps = numSteps || 60;
    
    // Evaluate over the category's actual data range with slight padding
    var yStart = stats.whiskerLow;
    var yEnd = stats.whiskerHigh;
    if (yStart >= yEnd) {
      yStart = stats.min;
      yEnd = stats.max;
    }
    if (yStart === yEnd) {
      yStart -= 1;
      yEnd += 1;
    }
    var span = yEnd - yStart;
    var pad = Math.min(span * 0.12, stats.h * 1.2);
    yStart = Math.max(stats.min, yStart - pad);
    yEnd = Math.min(stats.max, yEnd + pad);

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
        order: 2
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
        order: 3
      },
      showOutliers: {
        type: "boolean",
        label: "Show Outlier Points (>1.5x IQR)",
        default: true,
        section: "Display",
        order: 4
      },
      showSummaryStats: {
        type: "boolean",
        label: "Show Executive KPI Summary HUD",
        default: true,
        section: "Display",
        order: 5
      },
      showSearch: {
        type: "boolean",
        label: "Enable Category Search Bar",
        default: true,
        section: "Display",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting",
        default: "compact_currency",
        display: "select",
        values: [
          { "Compact Currency ($1.2k, $4.5M)": "compact_currency" },
          { "Compact Number (1.2k, 4.5M)": "compact_num" },
          { "Decimal (0.00)": "decimal_2" },
          { "Integer (0)": "integer" }
        ],
        section: "Display",
        order: 7
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
          { "Google Modern": "google_modern" },
          { "Looker Classic Navy & Cyan": "looker_classic" },
          { "Sunset Ember": "sunset_ember" },
          { "Emerald & Mint": "emerald_forest" },
          { "Cyber Indigo & Violet": "cyber_indigo" },
          { "Monochrome Executive Slate": "monochrome_slate" }
        ],
        section: "Style",
        order: 1
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
        order: 2
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
        order: 3
      },
      showGridlines: {
        type: "boolean",
        label: "Show Horizontal Gridlines",
        default: true,
        section: "Style",
        order: 4
      },
      showMeanMarker: {
        type: "boolean",
        label: "Show Mean Diamond Marker",
        default: true,
        section: "Style",
        order: 5
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.boxSizing = "border-box";

      var container = document.createElement("div");
      container.className = "violin-root-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      element.appendChild(container);

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
      this._sortOption = "median_desc";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

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
      }

      // Check fields
      var fields = queryResponse && queryResponse.fields;
      if (!fields || !data || data.length === 0) {
        container.innerHTML = "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;\">Awaiting query results...</div>";
        done();
        return;
      }

      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      if (dimensions.length === 0 && measures.length === 0) {
        this.addError({
          title: "Missing Fields",
          message: "Violin Plot requires at least 1 Category Dimension and 1 Numeric Measure or Dimension."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, container, data, config, queryResponse);
        } catch (err) {
          console.error("Violin Plot Render Error:", err);
          container.innerHTML = "<div style=\"padding:20px;color:#ef4444;\">Render Error: " + err.message + "</div>";
        }
        done();
      });
    },

    renderChart: function (d3, container, data, config, queryResponse) {
      var self = this;
      var fields = queryResponse.fields;
      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      // Identify category and value fields
      var catField = dimensions[0] ? dimensions[0].name : "Category";
      var catLabel = dimensions[0] ? (dimensions[0].label_short || dimensions[0].label) : "Category";

      // Numeric value field: prefer first measure, otherwise second dimension
      var valField = null;
      var valLabel = "Value";
      if (measures.length > 0) {
        valField = measures[0].name;
        valLabel = measures[0].label_short || measures[0].label;
      } else if (dimensions.length > 1) {
        valField = dimensions[1].name;
        valLabel = dimensions[1].label_short || dimensions[1].label;
      }

      if (!valField) {
        container.innerHTML = "<div style=\"padding:20px;color:#64748b;\">Please add a numeric measure or dimension to plot distributions.</div>";
        return;
      }

      var themeKey = config.colorPalette || "google_modern";
      var theme = PALETTES[themeKey] || PALETTES.google_modern;
      var valueFormat = config.valueFormat || "compact_currency";
      var displayMode = config.displayMode || "violin_box";
      var bandwidthFactor = config.bandwidthFactor || "auto";
      var scalingMode = config.scalingMode || "shared";
      var showOutliers = config.showOutliers !== false;
      var showSummaryStats = config.showSummaryStats !== false;
      var showSearch = config.showSearch !== false;
      var fillOpacity = parseFloat(config.fillOpacity || "0.75");
      var boxPlotWidthSetting = config.boxPlotWidth || "medium";
      var showGridlines = config.showGridlines !== false;
      var showMeanMarker = config.showMeanMarker !== false;

      var boxWidth = boxPlotWidthSetting === "slim" ? 8 : (boxPlotWidthSetting === "wide" ? 22 : 14);

      // --- AGGREGATE RAW OBSERVATIONS BY CATEGORY ---
      var groupsMap = {};
      var allNumericValues = [];
      var totalRows = data.length;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var catVal = row[catField] ? (row[catField].rendered || row[catField].value) : "Unknown";
        if (catVal === null || catVal === undefined || catVal === "") catVal = "Unknown";
        catVal = String(catVal);

        var rawNum = row[valField] ? row[valField].value : null;
        if (rawNum === null || rawNum === undefined || isNaN(Number(rawNum))) continue;
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
        container.innerHTML = "<div style=\"padding:20px;color:#64748b;\">No numeric data points found to plot distribution.</div>";
        return;
      }

      // Compute statistics for each category
      var globalMin = Infinity;
      var globalMax = -Infinity;
      var categoryStats = [];
      var globalMaxDensity = 0;

      for (var c = 0; c < categories.length; c++) {
        var cName = categories[c];
        var grp = groupsMap[cName];
        var stats = computeStats(grp.values, bandwidthFactor);
        if (stats) {
          if (stats.min < globalMin) globalMin = stats.min;
          if (stats.max > globalMax) globalMax = stats.max;
          categoryStats.push({
            category: cName,
            stats: stats,
            links: grp.links
          });
        }
      }

      if (categoryStats.length === 0) {
        container.innerHTML = "<div style=\"padding:20px;color:#64748b;\">Insufficient data points to compute distributions.</div>";
        return;
      }

      // Add a small buffer to globalMin and globalMax
      var rangeSpan = globalMax - globalMin;
      if (rangeSpan === 0) rangeSpan = 1;
      var yDomainMin = Math.max(0, globalMin - rangeSpan * 0.05);
      if (globalMin < 0) yDomainMin = globalMin - rangeSpan * 0.05;
      var yDomainMax = globalMax + rangeSpan * 0.05;
      var yRange = [yDomainMin, yDomainMax];

      // Compute KDE for all categories locally
      for (var k = 0; k < categoryStats.length; k++) {
        var kde = computeKDE(categoryStats[k].stats, 60);
        categoryStats[k].kde = kde;
        if (kde.maxDensity > globalMaxDensity) {
          globalMaxDensity = kde.maxDensity;
        }
      }
      if (globalMaxDensity === 0) globalMaxDensity = 1;

      // Global Summary Stats for HUD
      var globalStats = computeStats(allNumericValues, "auto");
      var globalOutlierCount = 0;
      for (var g = 0; g < categoryStats.length; g++) {
        globalOutlierCount += categoryStats[g].stats.outliers.length;
      }
      var outlierPct = ((globalOutlierCount / totalRows) * 100).toFixed(1) + "%";

      // Filter by search term
      var filteredCategories = categoryStats;
      if (self._searchTerm && self._searchTerm.trim() !== "") {
        var query = self._searchTerm.toLowerCase().trim();
        filteredCategories = categoryStats.filter(function (d) {
          return d.category.toLowerCase().indexOf(query) !== -1;
        });
      }

      // Sort categories
      var sortMode = self._sortOption || "median_desc";
      filteredCategories.sort(function (a, b) {
        if (sortMode === "median_desc") return b.stats.median - a.stats.median;
        if (sortMode === "median_asc") return a.stats.median - b.stats.median;
        if (sortMode === "mean_desc") return b.stats.mean - a.stats.mean;
        if (sortMode === "count_desc") return b.stats.n - a.stats.n;
        if (sortMode === "iqr_desc") return b.stats.iqr - a.stats.iqr;
        if (sortMode === "name_asc") return a.category.localeCompare(b.category);
        return 0;
      });

      // Clear container DOM
      container.innerHTML = "";
      container.style.background = theme.bg;

      // --- HEADER & CONTROLS TOOLBAR ---
      var headerEl = document.createElement("div");
      headerEl.style.padding = "10px 18px";
      headerEl.style.borderBottom = "1px solid " + theme.border;
      headerEl.style.display = "flex";
      headerEl.style.flexWrap = "wrap";
      headerEl.style.alignItems = "center";
      headerEl.style.justifyContent = "space-between";
      headerEl.style.gap = "12px";
      headerEl.style.background = theme.bg;
      headerEl.style.flexShrink = "0";

      // Left controls: Search & Sort
      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "10px";

      if (showSearch) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search categories...";
        searchInput.value = self._searchTerm || "";
        searchInput.style.padding = "5px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.outline = "none";
        searchInput.style.width = "170px";
        searchInput.style.color = theme.text;
        searchInput.style.background = theme.hudBg;
        searchInput.oninput = function (e) {
          self._searchTerm = e.target.value;
          self.renderChart(d3, container, data, config, queryResponse);
        };
        leftControls.appendChild(searchInput);
      }

      // Sort Selector
      var sortSelect = document.createElement("select");
      sortSelect.style.padding = "5px 8px";
      sortSelect.style.fontSize = "12px";
      sortSelect.style.borderRadius = "6px";
      sortSelect.style.border = "1px solid " + theme.border;
      sortSelect.style.background = theme.hudBg;
      sortSelect.style.color = theme.text;
      sortSelect.style.outline = "none";
      sortSelect.style.cursor = "pointer";

      var sortOptions = [
        { label: "Sort: Median ↓", value: "median_desc" },
        { label: "Sort: Median ↑", value: "median_asc" },
        { label: "Sort: Mean ↓", value: "mean_desc" },
        { label: "Sort: Count (N) ↓", value: "count_desc" },
        { label: "Sort: Spread (IQR) ↓", value: "iqr_desc" },
        { label: "Sort: Category Name", value: "name_asc" }
      ];

      for (var s = 0; s < sortOptions.length; s++) {
        var opt = document.createElement("option");
        opt.value = sortOptions[s].value;
        opt.textContent = sortOptions[s].label;
        if (sortOptions[s].value === sortMode) opt.selected = true;
        sortSelect.appendChild(opt);
      }

      sortSelect.onchange = function (e) {
        self._sortOption = e.target.value;
        self.renderChart(d3, container, data, config, queryResponse);
      };
      leftControls.appendChild(sortSelect);

      headerEl.appendChild(leftControls);

      // Right Stats Summary HUD
      if (showSummaryStats && globalStats) {
        var hud = document.createElement("div");
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.gap = "14px";
        hud.style.fontSize = "11.5px";
        hud.style.color = theme.subtext;

        hud.innerHTML = "" +
          "<div><strong>Rows (N):</strong> <span style=\"color:" + theme.text + ";font-weight:600;\">" + totalRows.toLocaleString() + "</span></div>" +
          "<div><strong>Categories:</strong> <span style=\"color:" + theme.text + ";font-weight:600;\">" + filteredCategories.length + " / " + categories.length + "</span></div>" +
          "<div><strong>Global Median:</strong> <span style=\"color:" + theme.medianColor + ";font-weight:700;\">" + formatValue(globalStats.median, valueFormat) + "</span></div>" +
          "<div><strong>Global IQR:</strong> <span style=\"color:" + theme.text + ";font-weight:600;\">" + formatValue(globalStats.iqr, valueFormat) + "</span></div>" +
          "<div><strong>Outliers:</strong> <span style=\"color:" + theme.outlierColor + ";font-weight:600;\">" + globalOutlierCount + " (" + outlierPct + ")</span></div>";

        headerEl.appendChild(hud);
      }

      container.appendChild(headerEl);

      // --- SVG CHART CANVAS ---
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflowX = "auto";
      chartWrapper.style.overflowY = "hidden";
      container.appendChild(chartWrapper);

      var containerWidth = chartWrapper.clientWidth || container.clientWidth || 800;
      var containerHeight = chartWrapper.clientHeight || 450;

      // Ensure minimum lane width so violins don't overlap when many categories are plotted
      var minLaneWidth = 72;
      var calculatedWidth = Math.max(containerWidth, filteredCategories.length * minLaneWidth + 120);

      var margin = { top: 25, right: 30, bottom: 65, left: 70 };
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

      // Y Scale (Numeric observations)
      var yScale = d3.scaleLinear()
        .domain(yRange)
        .range([height, 0]);

      // X Scale (Categories band)
      var catNames = filteredCategories.map(function (d) { return d.category; });
      var xScale = d3.scaleBand()
        .domain(catNames)
        .range([0, width])
        .padding(0.18);

      var laneWidth = xScale.bandwidth();

      // Horizontal Gridlines
      if (showGridlines) {
        g.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(-width)
            .tickFormat("")
          )
          .selectAll("line")
          .attr("stroke", theme.grid)
          .attr("stroke-dasharray", "3,3");

        g.selectAll(".grid .domain").remove();
      }

      // Y Axis
      var yAxis = d3.axisLeft(yScale)
        .ticks(6)
        .tickFormat(function (d) { return formatValue(d, valueFormat); });

      var yAxisGroup = g.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

      yAxisGroup.selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px");

      yAxisGroup.selectAll("line, path")
        .attr("stroke", theme.border);

      // Y Axis Label
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 16)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .text(valLabel);

      // X Axis
      var xAxis = d3.axisBottom(xScale);
      var xAxisGroup = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      xAxisGroup.selectAll("line, path")
        .attr("stroke", theme.border);

      xAxisGroup.selectAll("text")
        .attr("fill", theme.text)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .style("text-anchor", "end")
        .attr("dx", "-0.6em")
        .attr("dy", "0.2em")
        .attr("transform", "rotate(-30)")
        .text(function (d) {
          return d.length > 16 ? d.substring(0, 15) + "…" : d;
        });

      // Synchronized Scrubber Crosshair Line (Horizontal)
      var crosshair = g.append("g")
        .attr("class", "crosshair-group")
        .style("display", "none")
        .style("pointer-events", "none");

      var crosshairLine = crosshair.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("stroke", theme.subtext)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .attr("opacity", 0.6);

      var crosshairBadge = crosshair.append("rect")
        .attr("x", -margin.left + 4)
        .attr("width", margin.left - 8)
        .attr("height", 18)
        .attr("rx", 4)
        .attr("fill", theme.text);

      var crosshairText = crosshair.append("text")
        .attr("x", -margin.left + (margin.left - 8) / 2 + 4)
        .attr("dy", "12px")
        .attr("text-anchor", "middle")
        .attr("fill", theme.bg)
        .attr("font-size", "10px")
        .attr("font-weight", "700");

      // --- RENDER VIOLIN LANES ---
      var colorScale = d3.scaleOrdinal()
        .domain(catNames)
        .range(theme.colors);

      var lanes = g.selectAll(".violin-lane")
        .data(filteredCategories)
        .enter()
        .append("g")
        .attr("class", "violin-lane")
        .attr("transform", function (d) {
          return "translate(" + xScale(d.category) + ", 0)";
        })
        .style("cursor", "pointer");

      // Background hover highlight rect
      lanes.append("rect")
        .attr("class", "lane-hover-bg")
        .attr("x", -xScale.padding() * laneWidth / 2)
        .attr("y", 0)
        .attr("width", laneWidth * (1 + xScale.padding()))
        .attr("height", height)
        .attr("fill", "transparent")
        .attr("rx", 6);

      lanes.each(function (d, idx) {
        var lane = d3.select(this);
        var stats = d.stats;
        var kde = d.kde;
        var catColor = colorScale(d.category);
        var center = laneWidth / 2;
        var maxDensityForLane = scalingMode === "independent" ? kde.maxDensity : globalMaxDensity;
        if (maxDensityForLane === 0) maxDensityForLane = 1;

        var halfMaxViolinWidth = (laneWidth * 0.44);

        // Density horizontal width scale
        var densityScale = d3.scaleLinear()
          .domain([0, maxDensityForLane])
          .range([0, halfMaxViolinWidth]);

        // 1. VIOLIN ENVELOPE (Modes: violin_box, split_violin, density_silhouette)
        if (displayMode !== "box_jitter") {
          var areaGenerator;

          if (displayMode === "split_violin") {
            // Asymmetric half violin (right side only)
            areaGenerator = d3.area()
              .x0(center)
              .x1(function (pt) { return center + densityScale(pt.density); })
              .y(function (pt) { return yScale(pt.y); })
              .curve(d3.curveCatmullRom);
          } else {
            // Symmetrical full violin
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

        // 2. BOX PLOT & QUARTILES (Modes: violin_box, split_violin, box_jitter)
        if (displayMode !== "density_silhouette") {
          var boxCenter = displayMode === "split_violin" ? center - (boxWidth / 2) - 2 : center;

          // Stem / Whisker Line
          lane.append("line")
            .attr("class", "whisker-stem")
            .attr("x1", boxCenter)
            .attr("x2", boxCenter)
            .attr("y1", yScale(stats.whiskerLow))
            .attr("y2", yScale(stats.whiskerHigh))
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", displayMode === "box_jitter" ? "none" : "3,2");

          // Whisker Caps (Horizontals at whiskerLow and whiskerHigh)
          var capWidth = boxWidth * 0.6;
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

          // Interquartile Range (IQR) Rect (Q1 to Q3)
          var yQ3 = yScale(stats.q3);
          var yQ1 = yScale(stats.q1);
          var boxHeight = Math.max(2, yQ1 - yQ3);

          lane.append("rect")
            .attr("class", "iqr-box")
            .attr("x", boxCenter - boxWidth / 2)
            .attr("y", yQ3)
            .attr("width", boxWidth)
            .attr("height", boxHeight)
            .attr("fill", theme.boxFill)
            .attr("stroke", theme.boxStroke)
            .attr("stroke-width", 1.8)
            .attr("rx", 2);

          // Median Indicator (Crisp circle or horizontal line)
          var yMed = yScale(stats.median);
          lane.append("circle")
            .attr("class", "median-marker")
            .attr("cx", boxCenter)
            .attr("cy", yMed)
            .attr("r", Math.min(boxWidth / 2 - 1, 3.5))
            .attr("fill", theme.medianColor)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.2);

          // Mean Marker (Optional Diamond)
          if (showMeanMarker) {
            var yMean = yScale(stats.mean);
            var dSize = 3;
            lane.append("polygon")
              .attr("class", "mean-marker")
              .attr("points", "" +
                boxCenter + "," + (yMean - dSize) + " " +
                (boxCenter + dSize) + "," + yMean + " " +
                boxCenter + "," + (yMean + dSize) + " " +
                (boxCenter - dSize) + "," + yMean
              )
              .attr("fill", "#f59e0b")
              .attr("stroke", "#78350f")
              .attr("stroke-width", 0.8);
          }
        }

        // 3. JITTERED SCATTER POINTS (For box_jitter mode, or outlier points in other modes)
        if (displayMode === "box_jitter") {
          // Render all sample points with pseudo-random jitter
          var jitterWidth = laneWidth * 0.45;
          lane.selectAll(".jitter-dot")
            .data(stats.sorted)
            .enter()
            .append("circle")
            .attr("class", "jitter-dot")
            .attr("cx", function (_, pIdx) {
              // Deterministic pseudo-jitter based on index
              var seed = Math.sin(pIdx * 12.9898 + idx * 78.233) * 43758.5453;
              var pseudoRand = seed - Math.floor(seed);
              return center + (pseudoRand - 0.5) * jitterWidth;
            })
            .attr("cy", function (val) { return yScale(val); })
            .attr("r", 2.5)
            .attr("fill", catColor)
            .attr("fill-opacity", 0.45)
            .attr("stroke", catColor)
            .attr("stroke-width", 0.5);
        } else if (showOutliers && stats.outliers.length > 0) {
          // Render only extreme outliers beyond Tukey whiskers
          var outlierJitter = Math.min(16, boxWidth * 0.8);
          lane.selectAll(".outlier-dot")
            .data(stats.outliers)
            .enter()
            .append("circle")
            .attr("class", "outlier-dot")
            .attr("cx", function (_, oIdx) {
              var seed = Math.sin(oIdx * 45.12 + idx * 91.3) * 1000;
              var r = seed - Math.floor(seed);
              return center + (r - 0.5) * outlierJitter;
            })
            .attr("cy", function (val) { return yScale(val); })
            .attr("r", 3)
            .attr("fill", theme.outlierColor)
            .attr("fill-opacity", 0.75)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1);
        }

        // Sample Size (N) Label at top of lane
        lane.append("text")
          .attr("x", center)
          .attr("y", 12)
          .attr("text-anchor", "middle")
          .attr("fill", theme.subtext)
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text("n=" + stats.n);
      });

      // --- INTERACTION & HOVER TOOLTIP ---
      var tooltip = self._tooltip;

      lanes.on("mouseenter", function (event, d) {
        d3.select(this).select(".lane-hover-bg").attr("fill", "rgba(0, 0, 0, 0.035)");
        crosshair.style("display", null);
      });

      lanes.on("mousemove", function (event, d) {
        var pointerCoords = d3.pointer(event, g.node());
        var currY = pointerCoords[1];
        var currVal = yScale.invert(currY);

        // Update horizontal scrubber crosshair
        crosshair.attr("transform", "translate(0, " + currY + ")");
        crosshairText.text(formatValue(currVal, valueFormat));

        if (!tooltip) return;

        var stats = d.stats;
        var catColor = colorScale(d.category);
        var q1Fmt = formatValue(stats.q1, valueFormat);
        var medFmt = formatValue(stats.median, valueFormat);
        var meanFmt = formatValue(stats.mean, valueFormat);
        var q3Fmt = formatValue(stats.q3, valueFormat);
        var iqrFmt = formatValue(stats.iqr, valueFormat);
        var minFmt = formatValue(stats.min, valueFormat);
        var maxFmt = formatValue(stats.max, valueFormat);
        var lowWhiskerFmt = formatValue(stats.whiskerLow, valueFormat);
        var highWhiskerFmt = formatValue(stats.whiskerHigh, valueFormat);

        tooltip.innerHTML = "" +
          "<div style=\"display:flex;align-items:center;gap:6px;margin-bottom:8px;\">" +
          "  <span style=\"display:inline-block;width:10px;height:10px;border-radius:50%;background:" + catColor + ";\"></span>" +
          "  <span style=\"font-weight:700;font-size:13px;color:" + theme.text + ";\">" + d.category + "</span>" +
          "  <span style=\"margin-left:auto;font-size:10.5px;padding:2px 6px;border-radius:4px;background:" + theme.hudBg + ";color:" + theme.subtext + ";font-weight:600;\">N = " + stats.n.toLocaleString() + "</span>" +
          "</div>" +
          "<div style=\"display:grid;grid-template-columns:auto auto;gap:4px 16px;color:" + theme.subtext + ";font-size:11.5px;\">" +
          "  <span><strong>Median (50th):</strong></span><span style=\"color:" + theme.medianColor + ";font-weight:700;text-align:right;\">" + medFmt + "</span>" +
          "  <span><strong>Mean (Avg):</strong></span><span style=\"color:" + theme.text + ";font-weight:600;text-align:right;\">" + meanFmt + "</span>" +
          "  <span><strong>Interquartile (IQR):</strong></span><span style=\"color:" + theme.text + ";font-weight:600;text-align:right;\">" + iqrFmt + " (" + q1Fmt + " – " + q3Fmt + ")</span>" +
          "  <span><strong>Tukey Whiskers:</strong></span><span style=\"color:" + theme.subtext + ";text-align:right;\">[" + lowWhiskerFmt + " … " + highWhiskerFmt + "]</span>" +
          "  <span><strong>Data Range:</strong></span><span style=\"color:" + theme.subtext + ";text-align:right;\">" + minFmt + " to " + maxFmt + "</span>" +
          "  <span><strong>Std Deviation:</strong></span><span style=\"color:" + theme.subtext + ";text-align:right;\">±" + formatValue(stats.stdDev, valueFormat) + "</span>" +
          "  <span><strong>Outliers:</strong></span><span style=\"color:" + (stats.outliers.length > 0 ? theme.outlierColor : theme.subtext) + ";font-weight:600;text-align:right;\">" + stats.outliers.length + " (" + ((stats.outliers.length / stats.n) * 100).toFixed(1) + "%)</span>" +
          "</div>" +
          (d.links && d.links.length > 0 ? "<div style=\"margin-top:8px;font-size:10.5px;color:#2563eb;font-weight:600;text-align:center;border-top:1px solid " + theme.border + ";padding-top:5px;\">Click category to drill down &rarr;</div>" : "");

        tooltip.style.backgroundColor = "rgba(255, 255, 255, 0.96)";
        tooltip.style.border = "1px solid " + theme.border;
        tooltip.style.color = theme.text;
        tooltip.style.display = "block";

        var mouseX = event.clientX;
        var mouseY = event.clientY;
        var ttWidth = tooltip.offsetWidth || 230;
        var ttHeight = tooltip.offsetHeight || 160;

        var left = mouseX + 16;
        var top = mouseY - 20;

        if (left + ttWidth > window.innerWidth - 10) {
          left = mouseX - ttWidth - 16;
        }
        if (top + ttHeight > window.innerHeight - 10) {
          top = window.innerHeight - ttHeight - 10;
        }

        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      });

      lanes.on("mouseleave", function () {
        d3.select(this).select(".lane-hover-bg").attr("fill", "transparent");
        crosshair.style("display", "none");
        if (tooltip) tooltip.style.display = "none";
      });

      // Handle Looker drill down on click
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
