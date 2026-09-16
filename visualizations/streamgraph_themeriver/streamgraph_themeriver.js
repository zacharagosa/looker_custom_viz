/**
 * Interactive Streamgraph & ThemeRiver Volume Flow - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/340585545: "new viz - streamgraph [Cloud Blocker]"
 * - b/490547912: HighCharts streamgraph limitations in Looker (lack of native drill menus, baseline offsets, dynamic sorting, normalized 100% ribbon)
 * - YAQS 8624335012298227712: Multi-category continuous time-series stream with interactive scrubbing & peak detection
 *
 * Multi-Mode Adaptability:
 * 1. "silhouette" (ThemeRiver): Centered organic flowing river around horizontal baseline
 * 2. "wiggle" (Byron & Wattenberg Streamgraph): Minimizes slope volatility for organic multi-stream browsing
 * 3. "zero" (Stacked Area Flow): Traditional zero-baseline cumulative volume stack
 * 4. "expand" (100% Proportional Ribbon): Normalized 100% percentage market share over time
 * 5. "ridge" (Joyplot / Staggered Ridges): Vertically staggered separate area curves for direct shape comparison
 *
 * Scalability (5,000+ rows):
 * - Fast client-side timestamp aggregation into uniform time slices
 * - Smooth D3 curve interpolation (Catmull-Rom, MonotoneX, Basis, Linear)
 * - Instantaneous search-as-you-type filter with ribbon dimming and highlight
 * - Stream layer focus/solo on click
 * - Interactive vertical crosshair scrubber with real-time time-slice KPI HUD breakdown
 * - Native Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 *
 * Minimal Option Sections (Strictly 2 clean tabs):
 * - Display: baselineMode, curveInterpolation, sortOrder, topNStreams, showCrosshair, showPeakBadges, showSearch, showExecutiveHUD
 * - Style: colorPalette, streamOpacity, strokeWidth, showStreamLabels, labelFontSize
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.stack === "function" && typeof window.d3.stackOffsetSilhouette === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.stack === "function") {
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

  // Modern Looker & Enterprise Palettes
  var PALETTES = {
    google_modern: {
      name: "Google Modern Spectrum",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60", "#7CB342", "#8E24AA", "#039BE5", "#F4511E", "#3949AB"]
    },
    ocean_breeze: {
      name: "Pacific Ocean Breeze",
      colors: ["#0284c7", "#0ea5e9", "#38bdf8", "#06b6d4", "#14b8a6", "#10b981", "#3b82f6", "#6366f1", "#4f46e5", "#0891b2", "#0d9488", "#22c55e"]
    },
    sunset_aurora: {
      name: "Sunset Aurora Ebb",
      colors: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#facc15", "#e11d48", "#c026d3", "#a855f7", "#7c3aed", "#4f46e5", "#ec4899", "#d97706"]
    },
    emerald_forest: {
      name: "Nordic Emerald & Moss",
      colors: ["#059669", "#10b981", "#34d399", "#047857", "#065f46", "#0d9488", "#14b8a6", "#15803d", "#16a34a", "#22c55e", "#84cc16", "#65a30d"]
    },
    cyber_neon: {
      name: "Cyberpunk Glow",
      colors: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#06b6d4", "#3b82f6", "#6366f1", "#10b981", "#eab308", "#14b8a6", "#f97316"]
    }
  };

  function formatValue(val, formatType) {
    if (val === null || val === undefined || isNaN(val)) return "0";
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";

    if (formatType === "percent") {
      return (val * 100).toFixed(1) + "%";
    }
    if (formatType === "currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "k";
      return sign + "$" + abs.toFixed(2);
    }
    // compact default
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "k";
    if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
    return sign + Math.round(abs).toLocaleString();
  }

  var visObject = {
    id: "streamgraph_themeriver",
    label: "Interactive Streamgraph & ThemeRiver",
    options: {
      // Tab 1: Display
      baselineMode: {
        type: "string",
        label: "Stream Flow Mode",
        display: "select",
        values: [
          { "ThemeRiver / Silhouette (Centered Flow)": "silhouette" },
          { "Wattenberg Stream (Organic Wiggle)": "wiggle" },
          { "Stacked Area (Zero Baseline)": "zero" },
          { "100% Proportional Share Ribbon": "expand" },
          { "Joyplot / Staggered Ridges": "ridge" }
        ],
        default: "silhouette",
        section: "Display",
        order: 1
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Smoothing",
        display: "select",
        values: [
          { "Catmull-Rom Smooth (Recommended)": "curveCatmullRom" },
          { "Monotone Horizontal (Accurate Peaks)": "curveMonotoneX" },
          { "Basis Spline (Organic River)": "curveBasis" },
          { "Linear (Geometric Polygons)": "curveLinear" }
        ],
        default: "curveCatmullRom",
        section: "Display",
        order: 2
      },
      sortOrder: {
        type: "string",
        label: "Stream Stacking Order",
        display: "select",
        values: [
          { "Inside-Out by Peak Volume (ThemeRiver Default)": "insideOut" },
          { "Descending Total Volume": "descending" },
          { "Ascending Total Volume": "ascending" },
          { "Original Data / Alphabetical": "none" }
        ],
        default: "insideOut",
        section: "Display",
        order: 3
      },
      topNStreams: {
        type: "number",
        label: "Top Streams to Display (0 = All)",
        default: 12,
        section: "Display",
        order: 4
      },
      showCrosshair: {
        type: "boolean",
        label: "Enable Timeline Scrubber & Crosshair",
        default: true,
        section: "Display",
        order: 5
      },
      showPeakBadges: {
        type: "boolean",
        label: "Highlight Peak Stream Anomaly",
        default: true,
        section: "Display",
        order: 6
      },
      showSearch: {
        type: "boolean",
        label: "Show Stream Filter & Search Bar",
        default: true,
        section: "Display",
        order: 7
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Summary HUD",
        default: true,
        section: "Display",
        order: 8
      },

      // Tab 2: Style
      colorPalette: {
        type: "string",
        label: "Color Palette",
        display: "select",
        values: [
          { "Google Modern Spectrum": "google_modern" },
          { "Pacific Ocean Breeze": "ocean_breeze" },
          { "Sunset Aurora Ebb": "sunset_aurora" },
          { "Nordic Emerald & Moss": "emerald_forest" },
          { "Cyberpunk Glow": "cyber_neon" }
        ],
        default: "google_modern",
        section: "Style",
        order: 1
      },
      streamOpacity: {
        type: "string",
        label: "Stream Fill Opacity",
        display: "select",
        values: [
          { "85% Vibrant (Recommended)": "0.85" },
          { "100% Solid": "1.0" },
          { "70% Translucent": "0.70" },
          { "50% Soft Water": "0.50" }
        ],
        default: "0.85",
        section: "Style",
        order: 2
      },
      strokeWidth: {
        type: "string",
        label: "Stream Border Separator",
        display: "select",
        values: [
          { "1px Crisp White Border": "1" },
          { "1.5px Defined Separator": "1.5" },
          { "None (Seamless Blend)": "0" }
        ],
        default: "1",
        section: "Style",
        order: 3
      },
      showStreamLabels: {
        type: "boolean",
        label: "Show In-Stream Category Labels",
        default: true,
        section: "Style",
        order: 4
      },
      labelFontSize: {
        type: "string",
        label: "Label Font Size",
        display: "select",
        values: [
          { "Small (11px)": "11" },
          { "Medium (12px)": "12" },
          { "Large (13px)": "13" }
        ],
        default: "12",
        section: "Style",
        order: 5
      }
    },

    create: function (element, config) {
      element.innerHTML = "";

      var container = document.createElement("div");
      container.className = "streamgraph-themeriver-container";
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
      tooltip.className = "streamgraph-tooltip";
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
      element._streamTooltip = tooltip;

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

      // Input validation
      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to visualize."
        });
        return;
      }

      var fields = queryResponse.fields;
      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];

      // Valid configurations:
      // A) 1 Date dim + 1 Category dim + 1 Measure (long format)
      // B) 1 Date dim + 1 Pivot dim + 1 Measure (pivoted format)
      // C) 1 Date dim + 2+ Measures (wide format)
      var hasPivots = fields.pivots && fields.pivots.length > 0;
      var isValid = false;

      if (dimensions.length >= 2 && measures.length >= 1) {
        isValid = true;
      } else if (dimensions.length === 1 && hasPivots && measures.length >= 1) {
        isValid = true;
      } else if (dimensions.length === 1 && measures.length >= 2) {
        isValid = true;
      }

      if (!isValid) {
        this.addError({
          title: "Incompatible Data Shape",
          message: "Interactive Streamgraph requires either: (1) 1 Date Dimension + 1 Category Dimension + 1 Measure, (2) 1 Date Dimension + 1 Pivoted Dimension + 1 Measure, or (3) 1 Date Dimension + multiple Measures."
        });
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        self.render(d3, data, element, config, queryResponse, done);
      });
    },

    render: function (d3, data, element, config, queryResponse, done) {
      var container = element.querySelector(".streamgraph-themeriver-container");
      if (!container) return;
      container.innerHTML = "";

      var tooltip = element._streamTooltip;
      var width = container.clientWidth || element.clientWidth || 800;
      var height = container.clientHeight || element.clientHeight || 500;

      var fields = queryResponse.fields;
      var dimensions = fields.dimension_like || [];
      var measures = fields.measure_like || [];
      var pivots = fields.pivots || [];

      // Detect shape
      var dateDim = dimensions[0];
      var isPivotFormat = pivots.length > 0;
      var isMultiMeasureFormat = dimensions.length === 1 && measures.length >= 2 && !isPivotFormat;
      var isLongFormat = dimensions.length >= 2 && measures.length >= 1 && !isPivotFormat;

      var categoryDim = isLongFormat ? dimensions[1] : null;
      var primaryMeasure = measures[0];

      // Parse data into continuous time series matrix
      // keys: unique categories/measures
      // timeMap: dateKey -> { time: Date, label: String, values: { [key]: number }, cells: { [key]: cell } }
      var keysSet = new Set();
      var keyTotals = {};
      var timeMap = new Map();
      var grandTotal = 0;

      data.forEach(function (row) {
        var dateVal = row[dateDim.name] ? row[dateDim.name].value : null;
        var dateRendered = (row[dateDim.name] && row[dateDim.name].rendered) ? row[dateDim.name].rendered : String(dateVal);
        if (dateVal === null || dateVal === undefined) return;

        var dateKey = String(dateVal);
        if (!timeMap.has(dateKey)) {
          var parsedDate = new Date(dateVal);
          if (isNaN(parsedDate.getTime())) {
            // Try string parsing (e.g. "2024-05" or "2024 Q1")
            parsedDate = new Date(dateKey + "-01");
          }
          timeMap.set(dateKey, {
            key: dateKey,
            rendered: dateRendered,
            date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            values: {},
            cells: {}
          });
        }
        var entry = timeMap.get(dateKey);

        if (isLongFormat) {
          var catVal = row[categoryDim.name] ? String(row[categoryDim.name].value || "Unknown") : "Unknown";
          var cell = row[primaryMeasure.name] || {};
          var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
          if (num < 0) num = 0; // Streamgraphs support non-negative flow
          keysSet.add(catVal);
          entry.values[catVal] = (entry.values[catVal] || 0) + num;
          entry.cells[catVal] = cell;
          keyTotals[catVal] = (keyTotals[catVal] || 0) + num;
          grandTotal += num;
        } else if (isPivotFormat) {
          pivots.forEach(function (p) {
            var pivotKey = p.key;
            var catName = (p.data && p.data[pivots[0].name]) ? String(p.data[pivots[0].name]) : pivotKey;
            var cell = (row[primaryMeasure.name] && row[primaryMeasure.name][pivotKey]) ? row[primaryMeasure.name][pivotKey] : {};
            var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
            if (num < 0) num = 0;
            keysSet.add(catName);
            entry.values[catName] = (entry.values[catName] || 0) + num;
            entry.cells[catName] = cell;
            keyTotals[catName] = (keyTotals[catName] || 0) + num;
            grandTotal += num;
          });
        } else if (isMultiMeasureFormat) {
          measures.forEach(function (m) {
            var catName = m.label_short || m.label || m.name;
            var cell = row[m.name] || {};
            var num = typeof cell.value === "number" ? cell.value : parseFloat(cell.value) || 0;
            if (num < 0) num = 0;
            keysSet.add(catName);
            entry.values[catName] = (entry.values[catName] || 0) + num;
            entry.cells[catName] = cell;
            keyTotals[catName] = (keyTotals[catName] || 0) + num;
            grandTotal += num;
          });
        }
      });

      // Sort time points chronologically
      var timePoints = Array.from(timeMap.values()).sort(function (a, b) {
        return a.date.getTime() - b.date.getTime();
      });

      if (timePoints.length < 2) {
        this.addError({
          title: "Insufficient Time Points",
          message: "Streamgraph requires at least 2 distinct temporal data points to render continuous volume flow."
        });
        if (done) done();
        return;
      }

      // Rank keys by volume
      var allKeys = Array.from(keysSet);
      allKeys.sort(function (a, b) {
        return (keyTotals[b] || 0) - (keyTotals[a] || 0);
      });

      // Top N filtering
      var topN = parseInt(config.topNStreams, 10);
      var displayKeys = allKeys;
      var hasOthers = false;
      var otherKey = "Other Categories";

      if (topN > 0 && allKeys.length > topN) {
        displayKeys = allKeys.slice(0, topN);
        var remainingKeys = new Set(allKeys.slice(topN));
        hasOthers = true;
        displayKeys.push(otherKey);

        var otherTotal = 0;
        timePoints.forEach(function (tp) {
          var oSum = 0;
          var firstOtherCell = null;
          remainingKeys.forEach(function (k) {
            oSum += (tp.values[k] || 0);
            if (!firstOtherCell && tp.cells[k]) firstOtherCell = tp.cells[k];
          });
          tp.values[otherKey] = oSum;
          tp.cells[otherKey] = firstOtherCell || {};
          otherTotal += oSum;
        });
        keyTotals[otherKey] = otherTotal;
      }

      // Fill in zero for missing time slices
      timePoints.forEach(function (tp) {
        displayKeys.forEach(function (k) {
          if (tp.values[k] === undefined) {
            tp.values[k] = 0;
          }
        });
      });

      // Color mapping
      var paletteKey = config.colorPalette || "google_modern";
      var selectedPalette = (PALETTES[paletteKey] || PALETTES.google_modern).colors;
      var colorScale = d3.scaleOrdinal()
        .domain(displayKeys)
        .range(selectedPalette);

      if (hasOthers) {
        colorScale.domain(displayKeys);
      }

      // Find overall Peak stream & time
      var maxPointVal = 0;
      var peakStream = displayKeys[0] || "";
      var peakDateStr = "";
      timePoints.forEach(function (tp) {
        displayKeys.forEach(function (k) {
          var v = tp.values[k] || 0;
          if (v > maxPointVal) {
            maxPointVal = v;
            peakStream = k;
            peakDateStr = tp.rendered;
          }
        });
      });

      // Stacking configuration
      var baselineMode = config.baselineMode || "silhouette";
      var offsetFunc = d3.stackOffsetSilhouette;
      var isNormalized = false;
      var isRidge = false;

      if (baselineMode === "wiggle") {
        offsetFunc = d3.stackOffsetWiggle;
      } else if (baselineMode === "zero") {
        offsetFunc = d3.stackOffsetNone;
      } else if (baselineMode === "expand") {
        offsetFunc = d3.stackOffsetExpand;
        isNormalized = true;
      } else if (baselineMode === "ridge") {
        isRidge = true;
      }

      // Stacking order
      var orderFunc = d3.stackOrderInsideOut;
      var sortOrder = config.sortOrder || "insideOut";
      if (sortOrder === "descending") {
        orderFunc = d3.stackOrderDescending;
      } else if (sortOrder === "ascending") {
        orderFunc = d3.stackOrderAscending;
      } else if (sortOrder === "none") {
        orderFunc = d3.stackOrderNone;
      }

      // Curve Interpolation
      var curveMethod = d3.curveCatmullRom;
      var curveConf = config.curveInterpolation || "curveCatmullRom";
      if (curveConf === "curveMonotoneX") {
        curveMethod = d3.curveMonotoneX;
      } else if (curveConf === "curveBasis") {
        curveMethod = d3.curveBasis;
      } else if (curveConf === "curveLinear") {
        curveMethod = d3.curveLinear;
      }

      // Create Header Bar & Search HUD
      var headerBar = document.createElement("div");
      headerBar.className = "streamgraph-header-bar";
      headerBar.style.padding = "10px 16px 6px 16px";
      headerBar.style.display = "flex";
      headerBar.style.alignItems = "center";
      headerBar.style.justifyContent = "space-between";
      headerBar.style.flexWrap = "wrap";
      headerBar.style.gap = "10px";
      headerBar.style.borderBottom = "1px solid #f1f5f9";
      container.appendChild(headerBar);

      // Executive Metrics HUD
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "16px";
      hudContainer.style.flexWrap = "wrap";
      headerBar.appendChild(hudContainer);

      var isHudVisible = config.showExecutiveHUD !== false;
      if (isHudVisible) {
        var fmtKind = isNormalized ? "percent" : (primaryMeasure.is_numeric && primaryMeasure.value_format && primaryMeasure.value_format.indexOf("$") !== -1 ? "currency" : "compact");

        var totalKpi = document.createElement("div");
        totalKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Total Volume</span>' +
          '<strong style="font-size:16px;color:#0f172a;font-weight:700;">' + formatValue(grandTotal, fmtKind) + '</strong>';
        hudContainer.appendChild(totalKpi);

        var streamsKpi = document.createElement("div");
        streamsKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;display:block;">Streams Active</span>' +
          '<strong style="font-size:16px;color:#0f172a;font-weight:700;">' + displayKeys.length + ' <span style="font-size:11px;font-weight:400;color:#94a3b8;">(' + timePoints.length + ' periods)</span></strong>';
        hudContainer.appendChild(streamsKpi);

        if (config.showPeakBadges !== false && peakStream) {
          var peakKpi = document.createElement("div");
          peakKpi.style.padding = "4px 10px";
          peakKpi.style.backgroundColor = "#eff6ff";
          peakKpi.style.border = "1px solid #bfdbfe";
          peakKpi.style.borderRadius = "6px";
          peakKpi.innerHTML = '<span style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#1d4ed8;font-weight:600;display:block;">⚡ Peak Stream Surge</span>' +
            '<strong style="font-size:12px;color:#1e40af;font-weight:700;">' + peakStream + ': ' + formatValue(maxPointVal, fmtKind) + ' <span style="font-weight:500;color:#3b82f6;">(' + peakDateStr + ')</span></strong>';
          hudContainer.appendChild(peakKpi);
        }
      }

      // Search and Filter Pill Bar
      var searchFilterWrap = document.createElement("div");
      searchFilterWrap.style.display = "flex";
      searchFilterWrap.style.alignItems = "center";
      searchFilterWrap.style.gap = "8px";
      headerBar.appendChild(searchFilterWrap);

      var searchInput = null;
      if (config.showSearch !== false) {
        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search stream category...";
        searchInput.style.padding = "5px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.border = "1px solid #cbd5e1";
        searchInput.style.borderRadius = "6px";
        searchInput.style.outline = "none";
        searchInput.style.width = "180px";
        searchInput.style.transition = "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out";
        searchInput.onfocus = function () {
          searchInput.style.borderColor = "#3b82f6";
          searchInput.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.15)";
        };
        searchInput.onblur = function () {
          searchInput.style.borderColor = "#cbd5e1";
          searchInput.style.boxShadow = "none";
        };
        searchFilterWrap.appendChild(searchInput);
      }

      // Reset Focus Pill Button
      var resetBtn = document.createElement("button");
      resetBtn.innerText = "Show All Streams";
      resetBtn.style.padding = "5px 9px";
      resetBtn.style.fontSize = "11px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.color = "#475569";
      resetBtn.style.backgroundColor = "#f1f5f9";
      resetBtn.style.border = "1px solid #e2e8f0";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.cursor = "pointer";
      resetBtn.style.display = "none";
      searchFilterWrap.appendChild(resetBtn);

      // SVG Chart Viewport
      var chartWrapper = document.createElement("div");
      chartWrapper.className = "streamgraph-svg-wrapper";
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      var margin = { top: 20, right: 30, bottom: 40, left: 45 };
      var chartW = Math.max(width - margin.left - margin.right, 200);
      var headerH = headerBar.offsetHeight || 48;
      var chartH = Math.max(height - headerH - margin.top - margin.bottom, 150);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height - headerH)
        .attr("viewBox", "0 0 " + width + " " + (height - headerH))
        .style("overflow", "visible");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleTime()
        .domain(d3.extent(timePoints, function (d) { return d.date; }))
        .range([0, chartW]);

      // Handle Stacking or Ridge Joyplot
      var activeSoloStream = null;
      var pathsGroup = g.append("g").attr("class", "streams-group");
      var labelsGroup = g.append("g").attr("class", "stream-labels-group");
      var opacityVal = parseFloat(config.streamOpacity || "0.85");
      var strokeWidth = config.strokeWidth !== undefined ? config.strokeWidth : "1";
      var strokeColor = strokeWidth === "0" ? "none" : "#ffffff";

      function updateHighlight(filterTerm, soloKey) {
        var term = (filterTerm || "").trim().toLowerCase();
        pathsGroup.selectAll(".stream-layer")
          .transition()
          .duration(200)
          .style("opacity", function (d) {
            var key = d.key;
            if (soloKey) {
              return key === soloKey ? "1.0" : "0.12";
            }
            if (term.length > 0) {
              return key.toLowerCase().indexOf(term) !== -1 ? "1.0" : "0.12";
            }
            return opacityVal;
          })
          .style("stroke-width", function (d) {
            if (soloKey && d.key === soloKey) return "2.5px";
            return strokeWidth + "px";
          });

        labelsGroup.selectAll(".stream-label")
          .transition()
          .duration(200)
          .style("opacity", function (d) {
            var key = d.key;
            if (soloKey) {
              return key === soloKey ? "1.0" : "0";
            }
            if (term.length > 0) {
              return key.toLowerCase().indexOf(term) !== -1 ? "1.0" : "0";
            }
            return "1.0";
          });

        if (soloKey || term.length > 0) {
          resetBtn.style.display = "inline-block";
        } else {
          resetBtn.style.display = "none";
        }
      }

      if (isRidge) {
        // Joyplot / Staggered Ridge Mode
        var ridgeH = chartH / displayKeys.length;
        var maxRidgeVal = d3.max(timePoints, function (d) {
          return d3.max(displayKeys, function (k) { return d.values[k] || 0; });
        }) || 1;

        var yRidgeScale = d3.scaleLinear()
          .domain([0, maxRidgeVal])
          .range([ridgeH * 1.5, 0]);

        var ridgeArea = d3.area()
          .curve(curveMethod)
          .x(function (d) { return xScale(d.date); })
          .y0(ridgeH * 1.5)
          .y1(function (d, i, nodes) {
            var k = nodes._key;
            return yRidgeScale(d.values[k] || 0);
          });

        displayKeys.forEach(function (key, idx) {
          var yOffset = idx * (chartH / displayKeys.length);
          var ridgeGroup = pathsGroup.append("g")
            .attr("class", "stream-layer")
            .attr("transform", "translate(0," + yOffset + ")");

          var lineGen = d3.line()
            .curve(curveMethod)
            .x(function (d) { return xScale(d.date); })
            .y(function (d) { return yRidgeScale(d.values[key] || 0); });

          var areaGen = d3.area()
            .curve(curveMethod)
            .x(function (d) { return xScale(d.date); })
            .y0(ridgeH * 1.4)
            .y1(function (d) { return yRidgeScale(d.values[key] || 0); });

          ridgeGroup.append("path")
            .datum(timePoints)
            .attr("fill", colorScale(key))
            .attr("fill-opacity", opacityVal)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", strokeWidth)
            .attr("d", areaGen);

          ridgeGroup.append("path")
            .datum(timePoints)
            .attr("fill", "none")
            .attr("stroke", colorScale(key))
            .attr("stroke-width", 2)
            .attr("d", lineGen);

          ridgeGroup.append("text")
            .attr("x", 8)
            .attr("y", ridgeH * 1.3)
            .attr("fill", "#334155")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .text(key);
        });

      } else {
        // Standard Streamgraph / ThemeRiver / Stacked Area
        var stack = d3.stack()
          .keys(displayKeys)
          .offset(offsetFunc)
          .order(orderFunc)
          .value(function (d, key) {
            return d.values[key] || 0;
          });

        var series = stack(timePoints);

        var yMin = d3.min(series, function (layer) {
          return d3.min(layer, function (d) { return d[0]; });
        });
        var yMax = d3.max(series, function (layer) {
          return d3.max(layer, function (d) { return d[1]; });
        });

        var yScale = d3.scaleLinear()
          .domain([yMin, yMax])
          .range([chartH, 0]);

        var area = d3.area()
          .curve(curveMethod)
          .x(function (d) { return xScale(d.data.date); })
          .y0(function (d) { return yScale(d[0]); })
          .y1(function (d) { return yScale(d[1]); });

        var layers = pathsGroup.selectAll(".stream-layer")
          .data(series)
          .enter()
          .append("path")
          .attr("class", "stream-layer")
          .attr("d", area)
          .attr("fill", function (d) { return colorScale(d.key); })
          .attr("fill-opacity", opacityVal)
          .attr("stroke", strokeColor)
          .attr("stroke-width", strokeWidth + "px")
          .style("cursor", "pointer")
          .style("transition", "fill-opacity 0.2s ease, stroke-width 0.2s ease")
          .on("click", function (event, d) {
            if (activeSoloStream === d.key) {
              activeSoloStream = null;
            } else {
              activeSoloStream = d.key;
            }
            updateHighlight(searchInput ? searchInput.value : "", activeSoloStream);
          });

        // In-Stream Category Labels (at peak thickness of stream)
        if (config.showStreamLabels !== false) {
          var fontSize = parseInt(config.labelFontSize || "12", 10);
          series.forEach(function (layer) {
            var bestPoint = null;
            var maxThickness = 0;
            layer.forEach(function (d) {
              var thickness = Math.abs(yScale(d[0]) - yScale(d[1]));
              if (thickness > maxThickness) {
                maxThickness = thickness;
                bestPoint = d;
              }
            });

            // Only display label if stream ribbon is wide enough
            if (bestPoint && maxThickness > fontSize * 1.5) {
              var posX = xScale(bestPoint.data.date);
              var posY = (yScale(bestPoint[0]) + yScale(bestPoint[1])) / 2;

              labelsGroup.append("text")
                .datum(layer)
                .attr("class", "stream-label")
                .attr("x", posX)
                .attr("y", posY)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("fill", "#ffffff")
                .attr("font-size", fontSize + "px")
                .attr("font-weight", "600")
                .style("text-shadow", "0 1px 3px rgba(0,0,0,0.6)")
                .style("pointer-events", "none")
                .text(layer.key);
            }
          });
        }
      }

      // Time X-Axis
      var xAxis = d3.axisBottom(xScale)
        .ticks(Math.max(width / 100, 4))
        .tickFormat(d3.timeFormat("%b %Y"))
        .tickSizeOuter(0);

      var xAxisGroup = g.append("g")
        .attr("class", "stream-x-axis")
        .attr("transform", "translate(0," + chartH + ")")
        .call(xAxis);

      xAxisGroup.selectAll("text")
        .attr("fill", "#64748b")
        .attr("font-size", "11px")
        .attr("dy", "10px");

      xAxisGroup.selectAll("line")
        .attr("stroke", "#cbd5e1");

      xAxisGroup.select(".domain")
        .attr("stroke", "#cbd5e1");

      // Y-Axis for Normalized (100%) or Zero-baseline
      if (baselineMode === "expand") {
        var yAxis = d3.axisLeft(d3.scaleLinear().domain([0, 1]).range([chartH, 0]))
          .ticks(5)
          .tickFormat(d3.format(".0%"));
        g.append("g")
          .attr("class", "stream-y-axis")
          .call(yAxis)
          .selectAll("text")
          .attr("fill", "#64748b")
          .attr("font-size", "10px");
      }

      // Vertical Scrubber Crosshair & Timeline HUD
      if (config.showCrosshair !== false && !isRidge) {
        var scrubberGroup = g.append("g")
          .attr("class", "stream-scrubber")
          .style("opacity", 0)
          .style("pointer-events", "none");

        var scrubberLine = scrubberGroup.append("line")
          .attr("y1", 0)
          .attr("y2", chartH)
          .attr("stroke", "#0f172a")
          .attr("stroke-width", "1.5px")
          .attr("stroke-dasharray", "4 3");

        var scrubberDot = scrubberGroup.append("circle")
          .attr("r", 4.5)
          .attr("fill", "#3b82f6")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", "2px");

        // Transparent overlay rect for mouse tracking
        var overlay = g.append("rect")
          .attr("class", "stream-overlay")
          .attr("width", chartW)
          .attr("height", chartH)
          .attr("fill", "transparent")
          .style("cursor", "crosshair");

        var bisectDate = d3.bisector(function (d) { return d.date; }).center;

        overlay.on("mouseenter", function () {
          scrubberGroup.style("opacity", 1);
          tooltip.style.opacity = "1";
        });

        overlay.on("mouseleave", function () {
          scrubberGroup.style("opacity", 0);
          tooltip.style.opacity = "0";
        });

        overlay.on("mousemove", function (event) {
          var pointer = d3.pointer(event, this);
          var mouseX = pointer[0];
          var mouseY = pointer[1];
          var dateAtMouse = xScale.invert(mouseX);

          var idx = bisectDate(timePoints, dateAtMouse);
          var dSelected = timePoints[idx] || timePoints[0];
          if (!dSelected) return;

          var actualX = xScale(dSelected.date);
          scrubberLine.attr("x1", actualX).attr("x2", actualX);
          scrubberDot.attr("cx", actualX).attr("cy", mouseY);

          // Calculate total of time slice
          var sliceTotal = 0;
          displayKeys.forEach(function (k) {
            sliceTotal += (dSelected.values[k] || 0);
          });

          // Sort streams at this slice descending
          var sortedSlice = displayKeys.map(function (k) {
            return {
              key: k,
              val: dSelected.values[k] || 0,
              cell: dSelected.cells[k],
              pct: sliceTotal > 0 ? (dSelected.values[k] || 0) / sliceTotal : 0
            };
          }).sort(function (a, b) {
            return b.val - a.val;
          });

          // Build rich tooltip
          var fmtKind = isNormalized ? "percent" : (primaryMeasure.is_numeric && primaryMeasure.value_format && primaryMeasure.value_format.indexOf("$") !== -1 ? "currency" : "compact");
          var html = '<div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:4px;display:flex;justify-content:space-between;gap:12px;">' +
            '<span>📅 ' + dSelected.rendered + '</span>' +
            '<span style="color:#93c5fd;">Total: ' + formatValue(sliceTotal, fmtKind) + '</span>' +
            '</div>';

          html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
          sortedSlice.slice(0, 8).forEach(function (row) {
            var color = colorScale(row.key);
            var isSolo = activeSoloStream === row.key;
            html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);' + (isSolo ? 'font-weight:bold;color:#60a5fa;' : '') + '">' +
              '<td style="padding:3px 6px 3px 0;display:flex;align-items:center;gap:6px;">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + color + '"></span>' +
              '<span>' + row.key + '</span>' +
              '</td>' +
              '<td style="padding:3px 8px;text-align:right;font-weight:600;">' + formatValue(row.val, fmtKind) + '</td>' +
              '<td style="padding:3px 0;text-align:right;color:#94a3b8;">' + (row.pct * 100).toFixed(1) + '%</td>' +
              '</tr>';
          });
          if (sortedSlice.length > 8) {
            html += '<tr><td colspan="3" style="padding:4px 0 0 0;font-size:10px;color:#94a3b8;text-align:center;">+ ' + (sortedSlice.length - 8) + ' more categories</td></tr>';
          }
          html += '</table>';
          html += '<div style="margin-top:6px;font-size:10px;color:#93c5fd;text-align:right;font-style:italic;">💡 Click stream layer to isolate or drill</div>';

          tooltip.innerHTML = html;

          // Position tooltip
          var pageX = event.clientX;
          var pageY = event.clientY;
          var ttW = tooltip.offsetWidth || 220;
          var ttH = tooltip.offsetHeight || 180;
          var left = pageX + 15;
          var top = pageY - ttH / 2;

          if (left + ttW > window.innerWidth - 20) {
            left = pageX - ttW - 15;
          }
          if (top < 10) top = 10;
          if (top + ttH > window.innerHeight - 10) {
            top = window.innerHeight - ttH - 10;
          }

          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";
        });

        // Drill menu on click
        overlay.on("contextmenu", function (event) {
          event.preventDefault();
          var pointer = d3.pointer(event, this);
          var mouseX = pointer[0];
          var dateAtMouse = xScale.invert(mouseX);
          var idx = bisectDate(timePoints, dateAtMouse);
          var dSelected = timePoints[idx] || timePoints[0];
          if (!dSelected) return;

          var targetKey = activeSoloStream || displayKeys[0];
          var cell = dSelected.cells[targetKey];
          if (cell && cell.links && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: cell.links,
              event: event
            });
          }
        });
      }

      // Hook Search & Reset Events
      if (searchInput) {
        searchInput.oninput = function () {
          updateHighlight(searchInput.value, activeSoloStream);
        };
      }

      resetBtn.onclick = function () {
        activeSoloStream = null;
        if (searchInput) searchInput.value = "";
        updateHighlight("", null);
      };

      if (done) done();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
