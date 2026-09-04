/**
 * Player & Customer Retention Cohort Decay - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for Gaming Telemetry (Player retention decay D1/D7/D30), SaaS (Subscriber lifecycle retention),
 * and E-Commerce (Repeat customer cohort analysis).
 *
 * Multi-Mode Functional Capabilities:
 * - View Modes:
 *     1. "heatmap": Triangular Cohort Retention Matrix with quantile/sequential color scales & benchmark row
 *     2. "decay_curves": Multi-Cohort D3 Bézier Decay Curves with average benchmark overlay & hover isolation
 *     3. "split_view": Dual Synchronized View (Decay Curves on top, Triangular Heatmap on bottom)
 *     4. "churn_waterfall": Cumulative Churn vs Retained Volume Stack
 * - Value Displays:
 *     1. Retention Rate (%) - Normalized to Period 0 = 100%
 *     2. Raw User/Event Count
 *     3. Delta vs Benchmark (±% outperformance or underperformance)
 * - Scalable Data Handling:
 *     Supports 5,000+ rows with client-side aggregation, automatic month/day date delta detection,
 *     and pivot handling.
 * - Options Organization:
 *     Strictly limited to 2 clean sections ("Display" and "Style") to prevent Edit Modal crowding.
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
    cyberpunk_neon: {
      name: "Cyberpunk Neon (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      headerBg: "#1e293b",
      headerText: "#94a3b8",
      text: "#f8fafc",
      subtext: "#64748b",
      grid: "#1e293b",
      benchmarkCurve: "#00f0ff",
      benchmarkRowBg: "rgba(0, 240, 255, 0.08)",
      benchmarkRowText: "#38bdf8",
      curveColors: ["#ff007f", "#00f0ff", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"],
      heatmapScale: ["#111827", "#1e1b4b", "#312e81", "#4338ca", "#6366f1", "#818cf8", "#00f0ff"]
    },
    indigo_violet: {
      name: "Executive Indigo",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      headerBg: "#f1f5f9",
      headerText: "#475569",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      benchmarkCurve: "#1e1b4b",
      benchmarkRowBg: "#eef2ff",
      benchmarkRowText: "#3730a3",
      curveColors: ["#4f46e5", "#7c3aed", "#2563eb", "#0284c7", "#059669", "#d97706", "#dc2626", "#475569"],
      heatmapScale: ["#ffffff", "#eef2ff", "#c7d2fe", "#818cf8", "#4f46e5", "#3730a3", "#1e1b4b"]
    },
    emerald_teal: {
      name: "Emerald Growth",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      headerBg: "#f0fdf4",
      headerText: "#065f46",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#bbf7d0",
      benchmarkCurve: "#064e3b",
      benchmarkRowBg: "#d1fae5",
      benchmarkRowText: "#065f46",
      curveColors: ["#059669", "#0d9488", "#10b981", "#0284c7", "#6366f1", "#84cc16", "#eab308", "#14b8a6"],
      heatmapScale: ["#ffffff", "#ecfdf5", "#a7f3d0", "#34d399", "#10b981", "#059669", "#064e3b"]
    },
    heat_flame: {
      name: "Thermal Flame",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fed7aa",
      headerBg: "#fff7ed",
      headerText: "#9a3412",
      text: "#431407",
      subtext: "#9a3412",
      grid: "#ffedd5",
      benchmarkCurve: "#7c2d12",
      benchmarkRowBg: "#ffedd5",
      benchmarkRowText: "#9a3412",
      curveColors: ["#ea580c", "#dc2626", "#b91c1c", "#d97706", "#ca8a04", "#c026d3", "#e11d48", "#f97316"],
      heatmapScale: ["#ffffff", "#fef3c7", "#fde68a", "#fca5a5", "#f87171", "#ef4444", "#991b1b"]
    },
    slate_neutral: {
      name: "Minimal Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      headerBg: "#f1f5f9",
      headerText: "#334155",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      benchmarkCurve: "#0f172a",
      benchmarkRowBg: "#f1f5f9",
      benchmarkRowText: "#1e293b",
      curveColors: ["#3b82f6", "#64748b", "#0284c7", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0f172a"],
      heatmapScale: ["#ffffff", "#f1f5f9", "#cbd5e1", "#94a3b8", "#64748b", "#334155", "#0f172a"]
    }
  };

  function parseMonthOffset(activityStr, cohortStr) {
    if (!activityStr || !cohortStr) return null;
    var actDate = new Date(activityStr);
    var cohDate = new Date(cohortStr);
    if (isNaN(actDate.getTime()) || isNaN(cohDate.getTime())) {
      // Check for YYYY-MM format manually
      var actParts = String(activityStr).split("-");
      var cohParts = String(cohortStr).split("-");
      if (actParts.length >= 2 && cohParts.length >= 2) {
        var yDiff = parseInt(actParts[0], 10) - parseInt(cohParts[0], 10);
        var mDiff = parseInt(actParts[1], 10) - parseInt(cohParts[1], 10);
        return yDiff * 12 + mDiff;
      }
      return null;
    }
    var yDiff2 = actDate.getFullYear() - cohDate.getFullYear();
    var mDiff2 = actDate.getMonth() - cohDate.getMonth();
    return yDiff2 * 12 + mDiff2;
  }

  function formatValue(val, formatType) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (formatType === "percent") {
      return (val).toFixed(1) + "%";
    }
    if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
    if (val >= 1e3) return (val / 1e3).toFixed(1) + "K";
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  var visObject = {
    id: "retention_cohort_decay",
    label: "Player & Customer Retention Cohort Decay",
    options: {
      viewMode: {
        type: "string",
        label: "View Mode",
        display: "select",
        values: [
          { "Triangular Heatmap Matrix": "heatmap" },
          { "Multi-Cohort Decay Curves": "decay_curves" },
          { "Dual Synchronized Split View": "split_view" },
          { "Cumulative Churn & Retention Stack": "churn_waterfall" }
        ],
        default: "split_view",
        section: "Display",
        order: 1
      },
      valueDisplay: {
        type: "string",
        label: "Matrix Cell Display",
        display: "select",
        values: [
          { "Retention Rate (%)": "retention_pct" },
          { "Raw Metric / User Count": "raw_count" },
          { "Variance vs Benchmark (±%)": "delta_benchmark" }
        ],
        default: "retention_pct",
        section: "Display",
        order: 2
      },
      periodZeroHandling: {
        type: "string",
        label: "Period 0 Normalization",
        display: "select",
        values: [
          { "Index Period 0 to 100% (Calculate % Decay)": "index_100" },
          { "Hide Period 0 (Focus on Subsequent Periods)": "hide_zero" },
          { "Use Pre-Calculated Values (As Is)": "as_is" }
        ],
        default: "index_100",
        section: "Display",
        order: 3
      },
      showBenchmark: {
        type: "boolean",
        label: "Show Benchmark Row & Average Curve",
        default: true,
        section: "Display",
        order: 4
      },
      showLabels: {
        type: "boolean",
        label: "Show Cell & Point Value Labels",
        default: true,
        section: "Display",
        order: 5
      },
      showSearch: {
        type: "boolean",
        label: "Show Cohort Quick-Search Filter",
        default: true,
        section: "Display",
        order: 6
      },
      cohortOrder: {
        type: "string",
        label: "Cohort Sort Order",
        display: "select",
        values: [
          { "Chronological (Oldest to Newest)": "asc" },
          { "Reverse Chronological (Newest to Oldest)": "desc" },
          { "Cohort Size (Largest First)": "size_desc" }
        ],
        default: "asc",
        section: "Display",
        order: 7
      },
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Cyberpunk Neon (Dark Mode)": "cyberpunk_neon" },
          { "Executive Indigo": "indigo_violet" },
          { "Emerald Growth": "emerald_teal" },
          { "Thermal Flame": "heat_flame" },
          { "Minimal Slate": "slate_neutral" }
        ],
        default: "indigo_violet",
        section: "Style",
        order: 1
      },
      curveSmoothing: {
        type: "string",
        label: "Decay Curve Smoothing",
        display: "select",
        values: [
          { "Smooth Catmull-Rom Spline": "catmull_rom" },
          { "Monotone (Natural Drop)": "monotone" },
          { "Direct Linear Links": "linear" }
        ],
        default: "catmull_rom",
        section: "Style",
        order: 2
      },
      cellRadius: {
        type: "number",
        label: "Heatmap Cell Border Radius (px)",
        default: 4,
        section: "Style",
        order: 3
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      this.container = document.createElement("div");
      this.container.className = "looker-retention-cohort-decay-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.overflow = "auto";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this.container);

      // Dedicated tooltip
      this.tooltip = document.createElement("div");
      this.tooltip.className = "retention-tooltip";
      this.tooltip.style.position = "fixed";
      this.tooltip.style.display = "none";
      this.tooltip.style.pointerEvents = "none";
      this.tooltip.style.zIndex = "999999";
      this.tooltip.style.padding = "10px 14px";
      this.tooltip.style.borderRadius = "8px";
      this.tooltip.style.fontSize = "12px";
      this.tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      this.tooltip.style.transition = "opacity 0.12s ease-out, transform 0.12s ease-out";
      document.body.appendChild(this.tooltip);

      this.searchTerm = "";
      this.activeCohortFilter = null;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data Found",
          message: "The query returned 0 rows. Please select dimensions and a metric."
        });
        done();
        return;
      }

      var dims = queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measure_like || [];
      var pivots = queryResponse.pivots || [];

      if (dims.length === 0 && pivots.length === 0) {
        this.addError({
          title: "Insufficient Dimensions",
          message: "Retention Cohort Decay requires at least 1 Cohort Dimension (e.g. users.created_month) and 1 Activity Dimension (e.g. order_items.created_month) or Pivot."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, data, config, queryResponse);
          done();
        } catch (err) {
          console.error("[Retention Cohort Decay] Rendering error:", err);
          self.addError({
            title: "Rendering Exception",
            message: err.message
          });
          done();
        }
      });
    },

    renderChart: function (d3, rawData, config, queryResponse) {
      var self = this;
      var dims = queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measure_like || [];
      var pivots = queryResponse.pivots || [];

      var themeKey = config.colorTheme || "indigo_violet";
      var theme = THEMES[themeKey] || THEMES.indigo_violet;
      var viewMode = config.viewMode || "split_view";
      var valueDisplay = config.valueDisplay || "retention_pct";
      var periodZeroHandling = config.periodZeroHandling || "index_100";
      var showBenchmark = config.showBenchmark !== false;
      var showLabels = config.showLabels !== false;
      var showSearch = config.showSearch !== false;
      var cohortOrder = config.cohortOrder || "asc";
      var cellRadius = config.cellRadius !== undefined ? config.cellRadius : 4;
      var smoothingMode = config.curveSmoothing || "catmull_rom";

      // 1. Process Data & Compute Cohort Matrix
      var cohortDim = dims[0] ? dims[0].name : null;
      var activityDim = dims[1] ? dims[1].name : null;
      var measureName = meas[0] ? meas[0].name : null;

      // Map of cohorts: { [cohortKey]: { cohort: string, baseCount: number, periods: { [periodIdx]: count } } }
      var cohortsMap = {};
      var maxPeriodIndex = 0;

      if (pivots.length > 0) {
        // Case A: Pivoted data (Cohort on rows, Periods across pivots)
        rawData.forEach(function (row) {
          var cKey = row[cohortDim] ? String(row[cohortDim].value) : "Unknown";
          if (!cohortsMap[cKey]) {
            cohortsMap[cKey] = { cohort: cKey, periods: {}, rawRow: row };
          }
          pivots.forEach(function (piv, pIdx) {
            var cellObj = row[measureName] ? row[measureName][piv.key] : null;
            if (cellObj && cellObj.value !== null && cellObj.value !== undefined) {
              var val = Number(cellObj.value);
              cohortsMap[cKey].periods[pIdx] = val;
              if (pIdx > maxPeriodIndex) maxPeriodIndex = pIdx;
            }
          });
        });
      } else if (activityDim && measureName) {
        // Case B: Unpivoted data (Cohort Dim, Activity Period Dim, Measure)
        // Group by cohort and determine period index
        rawData.forEach(function (row) {
          var cKey = row[cohortDim] ? String(row[cohortDim].value) : "Unknown";
          var aVal = row[activityDim] ? String(row[activityDim].value) : null;
          var mVal = row[measureName] ? Number(row[measureName].value) : 0;

          if (!cohortsMap[cKey]) {
            cohortsMap[cKey] = { cohort: cKey, periods: {}, rawRow: row };
          }

          var pOffset = null;
          // Try numeric check first (e.g. 0, 1, 2 or D0, D1)
          var cleanNum = String(aVal).replace(/[^0-9]/g, "");
          if (cleanNum !== "" && !isNaN(cleanNum) && !String(aVal).includes("-")) {
            pOffset = parseInt(cleanNum, 10);
          } else {
            // Try date month difference
            pOffset = parseMonthOffset(aVal, cKey);
          }

          if (pOffset === null || pOffset < 0) {
            pOffset = 0;
          }

          cohortsMap[cKey].periods[pOffset] = (cohortsMap[cKey].periods[pOffset] || 0) + mVal;
          if (pOffset > maxPeriodIndex) maxPeriodIndex = pOffset;
        });
      } else {
        // Fallback: 1 dim + multiple measures
        rawData.forEach(function (row) {
          var cKey = row[cohortDim] ? String(row[cohortDim].value) : "Unknown";
          if (!cohortsMap[cKey]) {
            cohortsMap[cKey] = { cohort: cKey, periods: {}, rawRow: row };
          }
          meas.forEach(function (m, mIdx) {
            var val = row[m.name] ? Number(row[m.name].value) : null;
            if (val !== null) {
              cohortsMap[cKey].periods[mIdx] = val;
              if (mIdx > maxPeriodIndex) maxPeriodIndex = mIdx;
            }
          });
        });
      }

      // 2. Normalize and compute retention percentages
      var cohortList = Object.keys(cohortsMap).map(function (k) {
        var cObj = cohortsMap[k];
        var baseVal = cObj.periods[0] !== undefined ? cObj.periods[0] : 0;
        if (baseVal === 0) {
          // If period 0 is empty, take first available period as base
          var firstAvailable = Object.keys(cObj.periods).sort(function (a, b) { return a - b; })[0];
          baseVal = firstAvailable !== undefined ? cObj.periods[firstAvailable] : 1;
        }

        var rates = {};
        for (var p = 0; p <= maxPeriodIndex; p++) {
          var count = cObj.periods[p];
          if (count !== undefined && count !== null) {
            if (periodZeroHandling === "as_is") {
              rates[p] = count;
            } else {
              rates[p] = baseVal > 0 ? (count / baseVal) * 100 : 0;
            }
          } else {
            rates[p] = null;
          }
        }
        return {
          cohort: cObj.cohort,
          baseCount: baseVal,
          rawCounts: cObj.periods,
          rates: rates,
          rawRow: cObj.rawRow
        };
      });

      // Filter by search term
      if (this.searchTerm && this.searchTerm.trim() !== "") {
        var query = this.searchTerm.toLowerCase().trim();
        cohortList = cohortList.filter(function (item) {
          return item.cohort.toLowerCase().includes(query);
        });
      }

      // Sort cohorts
      if (cohortOrder === "asc") {
        cohortList.sort(function (a, b) { return a.cohort.localeCompare(b.cohort); });
      } else if (cohortOrder === "desc") {
        cohortList.sort(function (a, b) { return b.cohort.localeCompare(a.cohort); });
      } else if (cohortOrder === "size_desc") {
        cohortList.sort(function (a, b) { return b.baseCount - a.baseCount; });
      }

      // 3. Compute Benchmark Averages for each period
      var benchmarkRates = {};
      var benchmarkCounts = {};
      var startPeriod = periodZeroHandling === "hide_zero" ? 1 : 0;

      for (var p = startPeriod; p <= maxPeriodIndex; p++) {
        var totalRetained = 0;
        var totalBase = 0;
        var rateSum = 0;
        var validCount = 0;

        cohortList.forEach(function (c) {
          if (c.rates[p] !== null) {
            totalRetained += (c.rawCounts[p] || 0);
            totalBase += c.baseCount;
            rateSum += c.rates[p];
            validCount++;
          }
        });

        if (validCount > 0) {
          // Weighted average retention
          benchmarkRates[p] = totalBase > 0 ? (totalRetained / totalBase) * 100 : (rateSum / validCount);
          benchmarkCounts[p] = totalRetained;
        } else {
          benchmarkRates[p] = null;
        }
      }

      // Build DOM container
      this.container.innerHTML = "";
      this.container.style.background = theme.bg;
      this.container.style.color = theme.text;
      this.container.style.padding = "16px";

      // Top Control Bar
      var controlBar = document.createElement("div");
      controlBar.style.display = "flex";
      controlBar.style.alignItems = "center";
      controlBar.style.justifyContent = "space-between";
      controlBar.style.flexWrap = "wrap";
      controlBar.style.gap = "12px";
      controlBar.style.marginBottom = "16px";
      controlBar.style.paddingBottom = "12px";
      controlBar.style.borderBottom = "1px solid " + theme.border;

      // Title & KPI summary
      var titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.gap = "10px";

      var titleBadge = document.createElement("span");
      titleBadge.textContent = "🎮 RETENTION DECAY";
      titleBadge.style.fontSize = "11px";
      titleBadge.style.fontWeight = "700";
      titleBadge.style.letterSpacing = "0.05em";
      titleBadge.style.padding = "4px 8px";
      titleBadge.style.borderRadius = "4px";
      titleBadge.style.background = theme.isDark ? "#1e293b" : "#e0e7ff";
      titleBadge.style.color = theme.isDark ? "#38bdf8" : "#4338ca";

      var statsLabel = document.createElement("span");
      statsLabel.style.fontSize = "13px";
      statsLabel.style.color = theme.subtext;
      var avgD1 = benchmarkRates[1] !== null && benchmarkRates[1] !== undefined ? benchmarkRates[1].toFixed(1) + "%" : "N/A";
      var avgD30 = benchmarkRates[maxPeriodIndex] !== null && benchmarkRates[maxPeriodIndex] !== undefined ? benchmarkRates[maxPeriodIndex].toFixed(1) + "%" : "N/A";
      statsLabel.innerHTML = "<strong>" + cohortList.length + "</strong> Cohorts &bull; Period 1 Avg: <strong>" + avgD1 + "</strong> &bull; Final Avg: <strong>" + avgD30 + "</strong>";

      titleContainer.appendChild(titleBadge);
      titleContainer.appendChild(statsLabel);
      controlBar.appendChild(titleContainer);

      // Search bar
      if (showSearch) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.background = theme.cardBg;
        searchWrapper.style.border = "1px solid " + theme.border;
        searchWrapper.style.borderRadius = "6px";
        searchWrapper.style.padding = "4px 10px";
        searchWrapper.style.gap = "6px";

        var searchIcon = document.createElement("span");
        searchIcon.textContent = "🔍";
        searchIcon.style.fontSize = "12px";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter cohorts (e.g. 2026-04)...";
        searchInput.value = this.searchTerm;
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.background = "transparent";
        searchInput.style.color = theme.text;
        searchInput.style.fontSize = "12px";
        searchInput.style.width = "180px";

        searchInput.addEventListener("input", function (e) {
          self.searchTerm = e.target.value;
          self.renderChart(d3, rawData, config, queryResponse);
        });

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        controlBar.appendChild(searchWrapper);
      }

      this.container.appendChild(controlBar);

      // Main content wrapper depending on viewMode
      var contentArea = document.createElement("div");
      contentArea.style.display = "flex";
      contentArea.style.flexDirection = "column";
      contentArea.style.gap = "20px";
      this.container.appendChild(contentArea);

      // 4. Render Decay Curves (if mode is decay_curves or split_view)
      if (viewMode === "decay_curves" || viewMode === "split_view" || viewMode === "churn_waterfall") {
        var curveCard = document.createElement("div");
        curveCard.style.background = theme.cardBg;
        curveCard.style.border = "1px solid " + theme.border;
        curveCard.style.borderRadius = "8px";
        curveCard.style.padding = "16px";
        curveCard.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";

        var curveTitle = document.createElement("div");
        curveTitle.style.display = "flex";
        curveTitle.style.justifyContent = "space-between";
        curveTitle.style.alignItems = "center";
        curveTitle.style.marginBottom = "12px";

        var curveTitleText = document.createElement("span");
        curveTitleText.style.fontSize = "14px";
        curveTitleText.style.fontWeight = "600";
        curveTitleText.style.color = theme.text;
        curveTitleText.textContent = viewMode === "churn_waterfall" ? "Cumulative Churn & Retention Volume" : "Cohort Retention Decay Curves (%)";

        var legendDiv = document.createElement("div");
        legendDiv.style.display = "flex";
        legendDiv.style.gap = "12px";
        legendDiv.style.fontSize = "11px";
        legendDiv.style.flexWrap = "wrap";

        // Benchmark legend item
        if (showBenchmark) {
          var bItem = document.createElement("div");
          bItem.style.display = "flex";
          bItem.style.alignItems = "center";
          bItem.style.gap = "5px";
          bItem.innerHTML = '<span style="display:inline-block; width:16px; height:0px; border-top:2px dashed ' + theme.benchmarkCurve + '"></span><strong style="color:' + theme.text + '">Benchmark Avg</strong>';
          legendDiv.appendChild(bItem);
        }

        curveTitle.appendChild(curveTitleText);
        curveTitle.appendChild(legendDiv);
        curveCard.appendChild(curveTitle);

        var curveSvgContainer = document.createElement("div");
        curveSvgContainer.style.width = "100%";
        curveSvgContainer.style.height = viewMode === "split_view" ? "260px" : "380px";
        curveCard.appendChild(curveSvgContainer);
        contentArea.appendChild(curveCard);

        this.renderDecayCurvesSvg(d3, curveSvgContainer, cohortList, benchmarkRates, startPeriod, maxPeriodIndex, theme, smoothingMode, showBenchmark, viewMode === "churn_waterfall");
      }

      // 5. Render Triangular Heatmap Matrix (if mode is heatmap or split_view)
      if (viewMode === "heatmap" || viewMode === "split_view") {
        var matrixCard = document.createElement("div");
        matrixCard.style.background = theme.cardBg;
        matrixCard.style.border = "1px solid " + theme.border;
        matrixCard.style.borderRadius = "8px";
        matrixCard.style.padding = "16px";
        matrixCard.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        matrixCard.style.overflowX = "auto";

        var matrixTitle = document.createElement("div");
        matrixTitle.style.display = "flex";
        matrixTitle.style.justifyContent = "space-between";
        matrixTitle.style.alignItems = "center";
        matrixTitle.style.marginBottom = "12px";

        var matrixTitleText = document.createElement("span");
        matrixTitleText.style.fontSize = "14px";
        matrixTitleText.style.fontWeight = "600";
        matrixTitleText.style.color = theme.text;
        matrixTitleText.textContent = "Triangular Retention Cohort Matrix";

        var displayBadge = document.createElement("span");
        displayBadge.style.fontSize = "11px";
        displayBadge.style.padding = "3px 8px";
        displayBadge.style.borderRadius = "4px";
        displayBadge.style.background = theme.headerBg;
        displayBadge.style.color = theme.headerText;
        displayBadge.textContent = "Metric: " + (valueDisplay === "raw_count" ? "User Count" : valueDisplay === "delta_benchmark" ? "Variance vs Avg (±%)" : "Retention Rate (%)");

        matrixTitle.appendChild(matrixTitleText);
        matrixTitle.appendChild(displayBadge);
        matrixCard.appendChild(matrixTitle);

        this.renderHeatmapTable(d3, matrixCard, cohortList, benchmarkRates, startPeriod, maxPeriodIndex, theme, valueDisplay, showBenchmark, cellRadius, showLabels);
        contentArea.appendChild(matrixCard);
      }
    },

    renderDecayCurvesSvg: function (d3, container, cohortList, benchmarkRates, startPeriod, maxPeriodIndex, theme, smoothingMode, showBenchmark, isWaterfall) {
      var self = this;
      var width = container.clientWidth || 800;
      var height = container.clientHeight || 260;
      var margin = { top: 15, right: 30, bottom: 35, left: 45 };
      var chartW = Math.max(width - margin.left - margin.right, 200);
      var chartH = Math.max(height - margin.top - margin.bottom, 150);

      container.innerHTML = "";
      var svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleLinear()
        .domain([startPeriod, maxPeriodIndex])
        .range([0, chartW]);

      var maxY = 100;
      if (isWaterfall) {
        var maxCount = d3.max(cohortList, function (c) { return c.baseCount; }) || 100;
        maxY = maxCount;
      }
      var yScale = d3.scaleLinear()
        .domain([0, maxY])
        .range([chartH, 0]);

      // Gridlines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
          .ticks(5)
          .tickSize(-chartW)
          .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");

      // X Axis
      var xAxis = d3.axisBottom(xScale)
        .ticks(Math.min(maxPeriodIndex - startPeriod + 1, 12))
        .tickFormat(function (d) { return "Period " + d; });

      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px");

      // Y Axis
      var yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(function (d) { return isWaterfall ? formatValue(d, "compact") : d + "%"; });

      g.append("g")
        .call(yAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px");

      // Curve Generator
      var curveInterpolator = d3.curveCatmullRom.alpha(0.5);
      if (smoothingMode === "monotone") curveInterpolator = d3.curveMonotoneX;
      if (smoothingMode === "linear") curveInterpolator = d3.curveLinear;

      var lineGenerator = d3.line()
        .defined(function (d) { return d.val !== null && !isNaN(d.val); })
        .x(function (d) { return xScale(d.period); })
        .y(function (d) { return yScale(d.val); })
        .curve(curveInterpolator);

      // Area generator for waterfall
      var areaGenerator = d3.area()
        .defined(function (d) { return d.val !== null && !isNaN(d.val); })
        .x(function (d) { return xScale(d.period); })
        .y0(chartH)
        .y1(function (d) { return yScale(d.val); })
        .curve(curveInterpolator);

      // Draw Individual Cohort Curves
      cohortList.forEach(function (c, idx) {
        var strokeColor = theme.curveColors[idx % theme.curveColors.length];
        var pts = [];
        for (var p = startPeriod; p <= maxPeriodIndex; p++) {
          if (c.rates[p] !== null) {
            pts.push({
              period: p,
              val: isWaterfall ? (c.rawCounts[p] || 0) : c.rates[p],
              count: c.rawCounts[p],
              baseCount: c.baseCount,
              cohort: c.cohort,
              rate: c.rates[p]
            });
          }
        }

        if (pts.length > 0) {
          if (isWaterfall) {
            g.append("path")
              .datum(pts)
              .attr("d", areaGenerator)
              .attr("fill", strokeColor)
              .attr("fill-opacity", 0.15);
          }

          var path = g.append("path")
            .datum(pts)
            .attr("class", "cohort-line cohort-" + idx)
            .attr("d", lineGenerator)
            .attr("fill", "none")
            .attr("stroke", strokeColor)
            .attr("stroke-width", 2.2)
            .attr("stroke-opacity", 0.75)
            .style("transition", "stroke-width 0.2s, stroke-opacity 0.2s");

          // Interactive dots on curve
          g.selectAll(".dot-" + idx)
            .data(pts)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return xScale(d.period); })
            .attr("cy", function (d) { return yScale(d.val); })
            .attr("r", 3.5)
            .attr("fill", strokeColor)
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1.5)
            .style("cursor", "pointer")
            .on("mouseenter", function (evt, d) {
              d3.select(this).attr("r", 6);
              path.attr("stroke-width", 4).attr("stroke-opacity", 1);
              self.showTooltip(evt, d, theme, benchmarkRates[d.period]);
            })
            .on("mouseleave", function () {
              d3.select(this).attr("r", 3.5);
              path.attr("stroke-width", 2.2).attr("stroke-opacity", 0.75);
              self.hideTooltip();
            });
        }
      });

      // Benchmark Average Curve (Prominent dashed)
      if (showBenchmark && !isWaterfall) {
        var benchPts = [];
        for (var p2 = startPeriod; p2 <= maxPeriodIndex; p2++) {
          if (benchmarkRates[p2] !== null) {
            benchPts.push({ period: p2, val: benchmarkRates[p2], cohort: "Average Benchmark" });
          }
        }
        if (benchPts.length > 0) {
          g.append("path")
            .datum(benchPts)
            .attr("d", lineGenerator)
            .attr("fill", "none")
            .attr("stroke", theme.benchmarkCurve)
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "6,4")
            .attr("stroke-opacity", 0.95);

          g.selectAll(".bench-dot")
            .data(benchPts)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return xScale(d.period); })
            .attr("cy", function (d) { return yScale(d.val); })
            .attr("r", 4)
            .attr("fill", theme.benchmarkCurve)
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1.5)
            .on("mouseenter", function (evt, d) {
              self.showBenchmarkTooltip(evt, d, theme);
            })
            .on("mouseleave", function () {
              self.hideTooltip();
            });
        }
      }
    },

    renderHeatmapTable: function (d3, container, cohortList, benchmarkRates, startPeriod, maxPeriodIndex, theme, valueDisplay, showBenchmark, cellRadius, showLabels) {
      var self = this;
      var table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "separate";
      table.style.borderSpacing = "3px";
      table.style.fontSize = "12px";

      // Build Header Row
      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");

      var thCohort = document.createElement("th");
      thCohort.textContent = "Cohort Group";
      thCohort.style.textAlign = "left";
      thCohort.style.padding = "8px 12px";
      thCohort.style.background = theme.headerBg;
      thCohort.style.color = theme.headerText;
      thCohort.style.borderRadius = cellRadius + "px";
      thCohort.style.fontWeight = "600";
      headerRow.appendChild(thCohort);

      var thSize = document.createElement("th");
      thSize.textContent = "Initial Users";
      thSize.style.textAlign = "right";
      thSize.style.padding = "8px 12px";
      thSize.style.background = theme.headerBg;
      thSize.style.color = theme.headerText;
      thSize.style.borderRadius = cellRadius + "px";
      thSize.style.fontWeight = "600";
      headerRow.appendChild(thSize);

      for (var p = startPeriod; p <= maxPeriodIndex; p++) {
        var thP = document.createElement("th");
        thP.textContent = "P " + p;
        thP.style.textAlign = "center";
        thP.style.padding = "8px 6px";
        thP.style.background = theme.headerBg;
        thP.style.color = theme.headerText;
        thP.style.borderRadius = cellRadius + "px";
        thP.style.fontWeight = "600";
        thP.style.minWidth = "64px";
        headerRow.appendChild(thP);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Quantile Color Scale for Retention %
      var colorScale = d3.scaleLinear()
        .domain([0, 10, 20, 35, 50, 75, 100])
        .range(theme.heatmapScale);

      // Build Cohort Rows
      var tbody = document.createElement("tbody");
      cohortList.forEach(function (c) {
        var tr = document.createElement("tr");

        var tdName = document.createElement("td");
        tdName.textContent = c.cohort;
        tdName.style.padding = "6px 12px";
        tdName.style.fontWeight = "600";
        tdName.style.color = theme.text;
        tdName.style.background = theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
        tdName.style.borderRadius = cellRadius + "px";
        tr.appendChild(tdName);

        var tdSize = document.createElement("td");
        tdSize.textContent = formatValue(c.baseCount, "compact");
        tdSize.style.textAlign = "right";
        tdSize.style.padding = "6px 12px";
        tdSize.style.color = theme.subtext;
        tdSize.style.background = theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
        tdSize.style.borderRadius = cellRadius + "px";
        tr.appendChild(tdSize);

        for (var p = startPeriod; p <= maxPeriodIndex; p++) {
          var tdCell = document.createElement("td");
          var rate = c.rates[p];
          var count = c.rawCounts[p];

          tdCell.style.textAlign = "center";
          tdCell.style.padding = "6px 4px";
          tdCell.style.borderRadius = cellRadius + "px";
          tdCell.style.transition = "transform 0.1s, box-shadow 0.1s";
          tdCell.style.cursor = "pointer";

          if (rate !== null && rate !== undefined) {
            var cellBg = colorScale(Math.min(rate, 100));
            tdCell.style.background = cellBg;

            // Determine text color based on luminance
            var rgb = d3.rgb(cellBg);
            var lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
            var cellTextColor = lum > 140 ? "#0f172a" : "#ffffff";
            tdCell.style.color = cellTextColor;

            var displayText = "-";
            if (valueDisplay === "raw_count") {
              displayText = formatValue(count, "compact");
            } else if (valueDisplay === "delta_benchmark") {
              var bench = benchmarkRates[p] || 0;
              var delta = rate - bench;
              var sign = delta >= 0 ? "+" : "";
              displayText = sign + delta.toFixed(1) + "%";
              tdCell.style.fontWeight = Math.abs(delta) > 5 ? "700" : "500";
            } else {
              displayText = rate.toFixed(1) + "%";
              if (rate === 100 && p === 0) displayText = "100%";
            }

            tdCell.textContent = showLabels ? displayText : "";

            // Tooltip events
            (function (dataPoint, cohortObj) {
              tdCell.addEventListener("mouseenter", function (evt) {
                tdCell.style.transform = "scale(1.06)";
                tdCell.style.zIndex = "10";
                tdCell.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                self.showTooltip(evt, dataPoint, theme, benchmarkRates[dataPoint.period]);
              });
              tdCell.addEventListener("mouseleave", function () {
                tdCell.style.transform = "none";
                tdCell.style.boxShadow = "none";
                self.hideTooltip();
              });
              tdCell.addEventListener("click", function (evt) {
                // Trigger Looker drill menu if links exist
                if (cohortObj.rawRow && self.drill) {
                  self.drill(evt, cohortObj.rawRow);
                }
              });
            })({
              cohort: c.cohort,
              period: p,
              rate: rate,
              count: count,
              baseCount: c.baseCount
            }, c);

          } else {
            tdCell.style.background = "transparent";
            tdCell.textContent = "";
          }
          tr.appendChild(tdCell);
        }
        tbody.appendChild(tr);
      });

      // Bottom Benchmark Row
      if (showBenchmark) {
        var benchRow = document.createElement("tr");
        benchRow.style.fontWeight = "700";

        var tdBenchName = document.createElement("td");
        tdBenchName.textContent = "Benchmark Average";
        tdBenchName.style.padding = "8px 12px";
        tdBenchName.style.background = theme.benchmarkRowBg;
        tdBenchName.style.color = theme.benchmarkRowText;
        tdBenchName.style.borderRadius = cellRadius + "px";
        benchRow.appendChild(tdBenchName);

        var tdBenchSize = document.createElement("td");
        var totalInit = cohortList.reduce(function (sum, c) { return sum + c.baseCount; }, 0);
        tdBenchSize.textContent = formatValue(totalInit, "compact");
        tdBenchSize.style.textAlign = "right";
        tdBenchSize.style.padding = "8px 12px";
        tdBenchSize.style.background = theme.benchmarkRowBg;
        tdBenchSize.style.color = theme.benchmarkRowText;
        tdBenchSize.style.borderRadius = cellRadius + "px";
        benchRow.appendChild(tdBenchSize);

        for (var p2 = startPeriod; p2 <= maxPeriodIndex; p2++) {
          var tdBRate = document.createElement("td");
          var bVal = benchmarkRates[p2];
          tdBRate.style.textAlign = "center";
          tdBRate.style.padding = "8px 4px";
          tdBRate.style.background = theme.benchmarkRowBg;
          tdBRate.style.color = theme.benchmarkRowText;
          tdBRate.style.borderRadius = cellRadius + "px";
          tdBRate.textContent = bVal !== null ? bVal.toFixed(1) + "%" : "-";
          benchRow.appendChild(tdBRate);
        }
        tbody.appendChild(benchRow);
      }

      table.appendChild(tbody);
      container.appendChild(table);
    },

    showTooltip: function (evt, d, theme, benchRate) {
      var tt = this.tooltip;
      var rateStr = d.rate !== undefined ? d.rate.toFixed(1) + "%" : "-";
      var deltaStr = "";
      if (benchRate !== undefined && benchRate !== null && d.rate !== undefined) {
        var delta = d.rate - benchRate;
        var sign = delta >= 0 ? "+" : "";
        var col = delta >= 0 ? "#10b981" : "#ef4444";
        var statusWord = delta >= 0 ? "Above Avg" : "Below Avg";
        deltaStr = '<div style="margin-top:4px; font-size:11.5px; color:' + col + '; font-weight:600;">' + sign + delta.toFixed(1) + "% vs Benchmark (" + statusWord + ')</div>';
      }

      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + (theme.isDark ? "#f8fafc" : "#0f172a") + '; margin-bottom:4px;">' + d.cohort + ' &bull; Period ' + d.period + '</div>' +
        '<div style="color:' + (theme.isDark ? "#cbd5e1" : "#475569") + ';">Retention Rate: <strong style="color:' + (theme.isDark ? "#38bdf8" : "#2563eb") + ';">' + rateStr + '</strong></div>' +
        (d.count !== undefined ? '<div style="color:' + (theme.isDark ? "#94a3b8" : "#64748b") + ';">Retained: <strong>' + (d.count || 0).toLocaleString() + '</strong> / ' + (d.baseCount || 0).toLocaleString() + ' users</div>' : '') +
        deltaStr;

      tt.style.background = theme.isDark ? "#0f172a" : "#ffffff";
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      tt.style.opacity = "1";

      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
      if (x + 220 > window.innerWidth) x = evt.clientX - 230;
      if (y + 120 > window.innerHeight) y = evt.clientY - 120;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    showBenchmarkTooltip: function (evt, d, theme) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + (theme.isDark ? "#f8fafc" : "#0f172a") + '; margin-bottom:4px;">All Cohorts Benchmark</div>' +
        '<div style="color:' + (theme.isDark ? "#cbd5e1" : "#475569") + ';">Period ' + d.period + ' Average: <strong style="color:' + theme.benchmarkCurve + ';">' + d.val.toFixed(1) + '%</strong></div>';

      tt.style.background = theme.isDark ? "#0f172a" : "#ffffff";
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      tt.style.opacity = "1";

      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    hideTooltip: function () {
      if (this.tooltip) {
        this.tooltip.style.display = "none";
        this.tooltip.style.opacity = "0";
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
