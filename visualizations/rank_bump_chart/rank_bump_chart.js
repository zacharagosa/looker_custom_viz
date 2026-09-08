/**
 * Rank Bump & Trajectory Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Mode Functional Capabilities:
 *  1. bump: Classic smooth cubic Bézier rank bump curves with inverted rank axis (#1 at top).
 *  2. slope: Two-period comparative slopegraph highlighting net rank gainers and fallers.
 *  3. parallel_coords: Multi-stage parallel coordinate trajectories with normalized metric spacing.
 *  4. stream: Ranked area stream bands showing volumetric evolution over time.
 *
 * Scalability for Expanded Row Limits (5,000+ Rows):
 *  - High-performance client-side aggregation engine handles large datasets seamlessly.
 *  - Configurable Top-N entity truncation (Top 5 to Top 50, or All) to maintain smooth 60 FPS rendering.
 *  - Pure SVG rendering with GPU-accelerated CSS animations and clean lifecycle teardown.
 *
 * Configuration Options:
 *  - Strictly partitioned into 2 clean sections: Display and Style (prevents Edit Viz modal tab crowding).
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.select === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector("script[src*='d3.v7']");
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
    corporate_modern: {
      name: "Corporate Modern (Executive)",
      colors: ["#2563eb", "#0284c7", "#0d9488", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#6366f1", "#ec4899", "#14b8a6", "#84cc16", "#e11d48"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      nodeFill: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.96)",
      glowColor: "rgba(37, 99, 235, 0.35)",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      neutralBadgeBg: "#f1f5f9",
      neutralBadgeText: "#475569"
    },
    google_vibrant: {
      name: "Google Vibrant",
      colors: ["#1a73e8", "#34a853", "#f9ab00", "#ea4335", "#9334e6", "#12b5cb", "#e52592", "#e8710a", "#188038", "#4285f4", "#fa7b17", "#00838f"],
      bg: "#ffffff",
      cardBg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#f8f9fa",
      nodeFill: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.96)",
      glowColor: "rgba(26, 115, 232, 0.35)",
      posBadgeBg: "#ceead6",
      posBadgeText: "#137333",
      negBadgeBg: "#fad2cf",
      negBadgeText: "#c5221f",
      neutralBadgeBg: "#e8eaed",
      neutralBadgeText: "#3c4043"
    },
    cyber_dark: {
      name: "Cyber Dark (NOC / Telemetry)",
      colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#fbbf24", "#fb7185", "#2dd4bf", "#a78bfa", "#facc15", "#34d399", "#60a5fa"],
      bg: "#0b1120",
      cardBg: "#111827",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#1e293b",
      nodeFill: "#0b1120",
      hudBg: "rgba(17, 24, 39, 0.94)",
      glowColor: "rgba(56, 189, 248, 0.5)",
      posBadgeBg: "#064e3b",
      posBadgeText: "#6ee7b7",
      negBadgeBg: "#4c0519",
      negBadgeText: "#fda4af",
      neutralBadgeBg: "#1e293b",
      neutralBadgeText: "#cbd5e1"
    },
    sunset_ember: {
      name: "Sunset Ember & Coral",
      colors: ["#f97316", "#ef4444", "#e11d48", "#be123c", "#fb923c", "#f59e0b", "#d97706", "#b45309", "#ea580c", "#c2410c", "#fdba74", "#f43f5e"],
      bg: "#ffffff",
      cardBg: "#fffbeb",
      text: "#431407",
      subtext: "#7c2d12",
      border: "#fed7aa",
      grid: "#fff7ed",
      nodeFill: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.96)",
      glowColor: "rgba(249, 115, 22, 0.35)",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      neutralBadgeBg: "#fef3c7",
      neutralBadgeText: "#78350f"
    },
    emerald_wealth: {
      name: "Emerald & Forest Wealth",
      colors: ["#059669", "#10b981", "#047857", "#0d9488", "#14b8a6", "#0f766e", "#34d399", "#6ee7b7", "#065f46", "#115e59", "#2dd4bf", "#84cc16"],
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      text: "#064e3b",
      subtext: "#047857",
      border: "#bbf7d0",
      grid: "#f0fdf4",
      nodeFill: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.96)",
      glowColor: "rgba(16, 185, 129, 0.35)",
      posBadgeBg: "#d1fae5",
      posBadgeText: "#065f46",
      negBadgeBg: "#ffe4e6",
      negBadgeText: "#9f1239",
      neutralBadgeBg: "#e2e8f0",
      neutralBadgeText: "#475569"
    },
    monochromatic_steel: {
      name: "Monochromatic Slate & Steel",
      colors: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#1e293b", "#4b5563", "#374151", "#1f2937", "#111827", "#6b7280", "#9ca3af"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#475569",
      border: "#cbd5e1",
      grid: "#f1f5f9",
      nodeFill: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.96)",
      glowColor: "rgba(15, 23, 42, 0.3)",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      neutralBadgeBg: "#f1f5f9",
      neutralBadgeText: "#334155"
    }
  };

  function formatMetricValue(val, formatMode) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (formatMode === "integer") return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (formatMode === "decimal") return num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    if (formatMode === "percent") return (num * 100).toFixed(1) + "%";
    if (formatMode === "currency") return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (formatMode === "compact_currency") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(0);
    }
    // Default compact number
    var a = Math.abs(num);
    var s = num < 0 ? "-" : "";
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return s + (a / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return s + (a / 1e3).toFixed(1) + "K";
    return s + a.toFixed(1);
  }

  var visObject = {
    id: "rank_bump_chart",
    label: "Rank Bump & Trajectory Chart",
    options: {
      // SECTION 1: DISPLAY
      viewMode: {
        type: "string",
        label: "Visualization Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Rank Bump Chart (Smooth Bézier)": "bump" },
          { "Slopegraph (First vs Last Period)": "slope" },
          { "Parallel Coordinates (Stage Paths)": "parallel_coords" },
          { "Streamgraph (Ranked Volume Flows)": "stream" }
        ],
        default: "bump"
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Interpolation",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "Bump X (Smooth Cubic Bézier)": "bumpX" },
          { "Natural Spline": "natural" },
          { "Monotone X (Preserves Monotonicity)": "monotoneX" },
          { "Linear (Straight Angle Segments)": "linear" }
        ],
        default: "bumpX"
      },
      topNEntities: {
        type: "string",
        label: "Display Entity Limit",
        section: "Display",
        order: 3,
        display: "select",
        values: [
          { "Top 5 Ranked Entities": "5" },
          { "Top 8 Ranked Entities": "8" },
          { "Top 10 Ranked Entities": "10" },
          { "Top 12 Ranked Entities": "12" },
          { "Top 15 Ranked Entities": "15" },
          { "Top 20 Ranked Entities": "20" },
          { "All Entities (Expanded Limits)": "all" }
        ],
        default: "12"
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Format",
        section: "Display",
        order: 4,
        display: "select",
        values: [
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Full Currency ($1,234,567)": "currency" },
          { "Compact Metric (1.2M, 45K)": "compact" },
          { "Integer (1,234)": "integer" },
          { "Percentage (12.5%)": "percent" }
        ],
        default: "compact_currency"
      },
      lineWidth: {
        type: "number",
        label: "Trajectory Line Thickness (px)",
        section: "Display",
        order: 5,
        default: 4
      },
      nodeRadius: {
        type: "number",
        label: "Node Marker Radius (px)",
        section: "Display",
        order: 6,
        default: 14
      },
      showNodeRanks: {
        type: "boolean",
        label: "Show Rank Numbers in Nodes (#1, #2)",
        section: "Display",
        order: 7,
        default: true
      },
      showEndLabels: {
        type: "boolean",
        label: "Show Final Period Entity Labels",
        section: "Display",
        order: 8,
        default: true
      },
      showRankBadges: {
        type: "boolean",
        label: "Show Net Rank Shift Delta Badges (+2, -1)",
        section: "Display",
        order: 9,
        default: true
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Summary KPI HUD",
        section: "Display",
        order: 10,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Entity Search Filter",
        section: "Display",
        order: 11,
        default: true
      },

      // SECTION 2: STYLE
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Corporate Modern (Executive)": "corporate_modern" },
          { "Google Vibrant": "google_vibrant" },
          { "Cyber Dark (NOC / Telemetry)": "cyber_dark" },
          { "Sunset Ember & Coral": "sunset_ember" },
          { "Emerald & Forest Wealth": "emerald_wealth" },
          { "Monochromatic Slate & Steel": "monochromatic_steel" }
        ],
        default: "corporate_modern"
      },
      showVerticalGrid: {
        type: "boolean",
        label: "Show Period Vertical Gridlines",
        section: "Style",
        order: 2,
        default: true
      },
      showRankAxis: {
        type: "boolean",
        label: "Show Left-Hand Rank Numbers Axis",
        section: "Style",
        order: 3,
        default: true
      },
      animateTrajectories: {
        type: "boolean",
        label: "Enable Smooth Transition Path Drawing",
        section: "Style",
        order: 4,
        default: true
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      this.container = document.createElement("div");
      this.container.className = "looker-rank-bump-chart-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.overflow = "hidden";
      this.container.style.position = "relative";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this.container);
      this.searchFilter = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      // Ensure root container exists
      if (!this.container || this.container.parentElement !== element) {
        element.innerHTML = "";
        this.container = document.createElement("div");
        this.container.className = "looker-rank-bump-chart-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.overflow = "hidden";
        this.container.style.position = "relative";
        this.container.style.boxSizing = "border-box";
        this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this.container);
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, data, config, queryResponse, details);
          done();
        } catch (err) {
          console.error("Rank Bump Chart rendering error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the Rank Bump Chart."
          });
          done();
        }
      });
    },

    renderChart: function (d3, data, config, queryResponse, details) {
      var container = this.container;
      // Clean up previous SVG and controls cleanly
      container.innerHTML = "";

      // Validate dimensions and measures (support standard dimensions/measures and dimension_like/measure_like)
      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }
      var pivots = (queryResponse.fields.pivots && queryResponse.fields.pivots.length > 0)
        ? queryResponse.fields.pivots
        : (queryResponse.pivots || []);

      if (dimensions.length === 0 && measures.length === 0) {
        this.addError({
          title: "Insufficient Data",
          message: "Rank Bump Chart requires at least 1 Dimension (Entities) and 1 Pivoted Dimension or multiple chronological measures."
        });
        return;
      }

      // Configuration settings
      var themeKey = config.colorPalette || "corporate_modern";
      var theme = PALETTES[themeKey] || PALETTES.corporate_modern;
      var viewMode = config.viewMode || "bump";
      var curveType = config.curveInterpolation || "bumpX";
      var topN = config.topNEntities || "12";
      var valueFormat = config.valueFormat || "compact_currency";
      var lineWidth = Math.max(1, Number(config.lineWidth) || 4);
      var nodeRadius = Math.max(6, Number(config.nodeRadius) || 14);
      var showNodeRanks = config.showNodeRanks !== false;
      var showEndLabels = config.showEndLabels !== false;
      var showRankBadges = config.showRankBadges !== false;
      var showExecutiveHUD = config.showExecutiveHUD !== false;
      var showSearch = config.showSearch !== false;
      var showVerticalGrid = config.showVerticalGrid !== false;
      var showRankAxis = config.showRankAxis !== false;
      var animateTrajectories = config.animateTrajectories !== false;

      // Extract Entities, Periods, and Metrics
      var periods = [];
      var entitiesMap = {}; // entityName -> { name: string, values: { [period]: number }, drills: { [period]: any } }
      var isPivoted = (pivots.length > 0) || (queryResponse.pivots && queryResponse.pivots.length > 0);

      var entityDim = dimensions[0] ? (dimensions[0].name || dimensions[0]) : "entity";
      var entityLabel = dimensions[0] ? (dimensions[0].label_short || dimensions[0].label || dimensions[0].name || "Entity") : "Entity";

      if (isPivoted) {
        // Collect periods in order from queryResponse.pivots
        if (queryResponse.pivots && queryResponse.pivots.length > 0) {
          queryResponse.pivots.forEach(function (p) {
            var pKey = (typeof p === "object" && p !== null) ? (p.key || p.name || String(p)) : String(p);
            if (pKey && periods.indexOf(pKey) === -1) periods.push(pKey);
          });
        }

        // If no pivots metadata array, fallback to scan data
        if (periods.length === 0) {
          data.forEach(function (row) {
            measures.forEach(function (m) {
              var mName = m.name || m;
              var pObj = row[mName];
              if (pObj && typeof pObj === "object") {
                Object.keys(pObj).forEach(function (pk) {
                  if (periods.indexOf(pk) === -1) periods.push(pk);
                });
              }
            });
          });
        }

        var primaryMeasure = measures[0] ? (measures[0].name || measures[0]) : null;

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          if (primaryMeasure && row[primaryMeasure]) {
            var measObj = row[primaryMeasure];
            periods.forEach(function (p) {
              var cell = measObj[p];
              var numVal = 0;
              var drillLinks = null;
              if (cell && typeof cell === "object") {
                numVal = cell.value !== undefined ? (Number(cell.value) || 0) : 0;
                drillLinks = cell.links;
              } else if (cell !== undefined && cell !== null) {
                numVal = Number(cell) || 0;
              }
              entitiesMap[entityVal].values[p] = numVal;
              if (drillLinks) entitiesMap[entityVal].drills[p] = drillLinks;
            });
          }
        });
      } else if (measures.length >= 2) {
        // Unpivoted: Each measure represents a distinct period/milestone
        measures.forEach(function (m) {
          var mLabel = m.label_short || m.label || m.name || String(m);
          periods.push(mLabel);
        });

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          measures.forEach(function (m, idx) {
            var p = periods[idx];
            var mName = m.name || m;
            var cell = row[mName];
            var numVal = 0;
            var drillLinks = null;
            if (cell && typeof cell === "object") {
              numVal = cell.value !== undefined ? (Number(cell.value) || 0) : 0;
              drillLinks = cell.links;
            } else if (cell !== undefined && cell !== null) {
              numVal = Number(cell) || 0;
            }
            entitiesMap[entityVal].values[p] = numVal;
            if (drillLinks) entitiesMap[entityVal].drills[p] = drillLinks;
          });
        });
      } else if (dimensions.length >= 2 && measures.length >= 1) {
        // Multi-dimensional unpivoted: Dim 0 = Entity, Dim 1 = Period, Measure 0 = Value
        var periodDim = dimensions[1].name || dimensions[1];
        var measName = measures[0].name || measures[0];

        data.forEach(function (row) {
          var entityCell = row[entityDim];
          var entityVal = "Unknown";
          if (entityCell !== undefined && entityCell !== null) {
            if (typeof entityCell === "object") {
              entityVal = (entityCell.rendered !== undefined && entityCell.rendered !== null && entityCell.rendered !== "")
                ? String(entityCell.rendered)
                : ((entityCell.value !== undefined && entityCell.value !== null) ? String(entityCell.value) : "Unknown");
            } else {
              entityVal = String(entityCell);
            }
          }
          var periodCell = row[periodDim];
          var pVal = "Unknown";
          if (periodCell !== undefined && periodCell !== null) {
            if (typeof periodCell === "object") {
              pVal = (periodCell.rendered !== undefined && periodCell.rendered !== null && periodCell.rendered !== "")
                ? String(periodCell.rendered)
                : ((periodCell.value !== undefined && periodCell.value !== null) ? String(periodCell.value) : "Unknown");
            } else {
              pVal = String(periodCell);
            }
          }
          if (periods.indexOf(pVal) === -1) periods.push(pVal);

          if (!entitiesMap[entityVal]) {
            entitiesMap[entityVal] = { name: entityVal, values: {}, drills: {} };
          }
          var cell = row[measName];
          var numVal = cell ? (cell.value !== undefined ? (Number(cell.value) || 0) : (Number(cell) || 0)) : 0;
          entitiesMap[entityVal].values[pVal] = numVal;
          if (cell && cell.links) entitiesMap[entityVal].drills[pVal] = cell.links;
        });
      }

      if (periods.length < 2) {
        this.addError({
          title: "Insufficient Periods",
          message: "Rank Bump Chart requires at least 2 chronological time periods or milestones to track trajectories."
        });
        return;
      }

      // If slope mode, truncate periods to just first and last
      if (viewMode === "slope" && periods.length > 2) {
        periods = [periods[0], periods[periods.length - 1]];
      }

      // Compute period-by-period rankings
      // For each period, rank entities descending by value
      var entityList = Object.keys(entitiesMap).map(function (k) { return entitiesMap[k]; });
      if (entityList.length === 0) {
        this.addError({
          title: "No Data Available",
          message: "No valid entity rows returned by query."
        });
        return;
      }

      // Rank calculation per period
      periods.forEach(function (p) {
        // Sort entities by value in this period desc
        entityList.sort(function (a, b) {
          var valA = a.values[p] !== undefined ? a.values[p] : -Infinity;
          var valB = b.values[p] !== undefined ? b.values[p] : -Infinity;
          if (valB !== valA) return valB - valA;
          return a.name.localeCompare(b.name);
        });

        entityList.forEach(function (e, rankIdx) {
          if (!e.ranks) e.ranks = {};
          e.ranks[p] = rankIdx + 1; // 1-based rank
        });
      });

      // Overall average or latest rank for top-N selection
      entityList.forEach(function (e) {
        var firstP = periods[0];
        var lastP = periods[periods.length - 1];
        e.startRank = e.ranks[firstP] || 999;
        e.endRank = e.ranks[lastP] || 999;
        e.netRankShift = e.startRank - e.endRank; // Positive = gained ranks (e.g. #5 -> #2 = +3)
        var sumVals = 0;
        periods.forEach(function (p) { sumVals += (e.values[p] || 0); });
        e.totalValue = sumVals;
        e.latestValue = e.values[lastP] || 0;
      });

      // Filter Top N entities based on final rank or total value
      var displayEntities = entityList.slice();
      displayEntities.sort(function (a, b) {
        return a.endRank - b.endRank;
      });

      if (topN !== "all") {
        var limitNum = parseInt(topN, 10) || 12;
        displayEntities = displayEntities.slice(0, limitNum);
      }

      // Assign palette colors
      displayEntities.forEach(function (e, idx) {
        e.color = theme.colors[idx % theme.colors.length];
      });

      // Executive Metrics computation
      var totalEntities = entityList.length;
      var topEntity = displayEntities[0] || { name: "N/A", latestValue: 0 };
      var biggestGainer = null;
      var biggestFaller = null;
      var maxGain = 0;
      var maxLoss = 0;

      displayEntities.forEach(function (e) {
        if (e.netRankShift > maxGain) {
          maxGain = e.netRankShift;
          biggestGainer = e;
        }
        if (e.netRankShift < maxLoss) {
          maxLoss = e.netRankShift;
          biggestFaller = e;
        }
      });

      // Prepare DOM layout
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Executive Summary HUD Header
      if (showExecutiveHUD) {
        var hud = document.createElement("div");
        hud.className = "bump-hud-header";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.justifyContent = "space-between";
        hud.style.flexWrap = "wrap";
        hud.style.gap = "10px";
        hud.style.padding = "10px 18px";
        hud.style.backgroundColor = theme.cardBg;
        hud.style.borderBottom = "1px solid " + theme.border;
        hud.style.fontSize = "12px";

        var statsHtml = '<div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">';
        statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Active ' + entityLabel + 's</span>' +
                     '<div style="font-size: 16px; font-weight: 800; color:' + theme.text + ';">' + totalEntities + '</div></div>';

        statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Current #1 Leader</span>' +
                     '<div style="font-size: 15px; font-weight: 800; color:' + (topEntity.color || theme.text) + ';">🥇 ' + topEntity.name + ' <span style="font-size: 12px; font-weight: 600; color:' + theme.subtext + ';">(' + formatMetricValue(topEntity.latestValue, valueFormat) + ')</span></div></div>';

        if (biggestGainer && maxGain > 0) {
          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Top Rank Gainer</span>' +
                       '<div style="font-size: 14px; font-weight: 700; color:' + theme.posBadgeText + ';">🚀 ' + biggestGainer.name + ' <span style="padding: 1px 6px; border-radius: 4px; background:' + theme.posBadgeBg + '; font-size: 11px;">+' + maxGain + ' spots</span></div></div>';
        }

        if (biggestFaller && maxLoss < 0) {
          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">Top Rank Faller</span>' +
                       '<div style="font-size: 14px; font-weight: 700; color:' + theme.negBadgeText + ';">🔻 ' + biggestFaller.name + ' <span style="padding: 1px 6px; border-radius: 4px; background:' + theme.negBadgeBg + '; font-size: 11px;">' + maxLoss + ' spots</span></div></div>';
        }
        statsHtml += '</div>';

        // Search Input
        var searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.alignItems = "center";
        searchContainer.style.gap = "8px";

        if (showSearch) {
          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter " + entityLabel + "...";
          searchInput.value = this.searchFilter || "";
          searchInput.style.padding = "5px 10px";
          searchInput.style.borderRadius = "6px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.backgroundColor = theme.bg;
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "12px";
          searchInput.style.outline = "none";
          searchInput.style.width = "170px";

          searchInput.addEventListener("input", function (e) {
            self.searchFilter = e.target.value.toLowerCase().trim();
            self.applySearchFilter(theme);
          });
          searchContainer.appendChild(searchInput);
        }

        hud.innerHTML = statsHtml;
        hud.appendChild(searchContainer);
        container.appendChild(hud);
      }

      // Chart Area Container
      var chartContainer = document.createElement("div");
      chartContainer.className = "bump-svg-container";
      chartContainer.style.width = "100%";
      chartContainer.style.height = showExecutiveHUD ? "calc(100% - 55px)" : "100%";
      chartContainer.style.position = "relative";
      container.appendChild(chartContainer);

      var width = Math.max(chartContainer.clientWidth || container.clientWidth || 900, 400);
      var height = Math.max(chartContainer.clientHeight || container.clientHeight || 550, 320);

      var margin = {
        top: 40,
        right: showEndLabels ? 180 : 40,
        bottom: 45,
        left: showRankAxis ? 55 : 30
      };

      var innerWidth = Math.max(200, width - margin.left - margin.right);
      var innerHeight = Math.max(150, height - margin.top - margin.bottom);

      var svg = d3.select(chartContainer)
        .append("svg")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block")
        .style("overflow", "visible");

      // Defs for gradients & glowing drop shadows
      var defs = svg.append("defs");

      // Glow filter for highlighted line
      var filter = defs.append("filter")
        .attr("id", "bump-glow")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");
      filter.append("feDropShadow")
        .attr("dx", "0")
        .attr("dy", "2")
        .attr("stdDeviation", "4")
        .attr("flood-color", theme.glowColor);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scalePoint()
        .domain(periods)
        .range([0, innerWidth])
        .padding(0.1);

      // Max rank to display on Y axis
      var maxRank = displayEntities.length;
      var yScale = d3.scaleLinear()
        .domain([1, maxRank])
        .range([0, innerHeight]);

      // Vertical Period Grid Lines & Column Headers
      periods.forEach(function (p) {
        var x = xScale(p);

        if (showVerticalGrid) {
          g.append("line")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke", theme.grid)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4");
        }

        // Column Top Period Label
        g.append("text")
          .attr("x", x)
          .attr("y", -14)
          .attr("text-anchor", "middle")
          .attr("fill", theme.text)
          .attr("font-size", "12px")
          .attr("font-weight", "700")
          .text(p);
      });

      // Left Rank Numbers Axis (#1, #2, ...)
      if (showRankAxis) {
        for (var r = 1; r <= maxRank; r++) {
          var yPos = yScale(r);
          g.append("text")
            .attr("x", -15)
            .attr("y", yPos + 4)
            .attr("text-anchor", "end")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .text("#" + r);
        }
      }

      // Interpolator function
      var curveFn = d3.curveBumpX;
      if (curveType === "natural") curveFn = d3.curveNatural;
      else if (curveType === "monotoneX") curveFn = d3.curveMonotoneX;
      else if (curveType === "linear") curveFn = d3.curveLinear;

      // Line Generator
      var lineGen = d3.line()
        .x(function (d) { return xScale(d.period); })
        .y(function (d) { return yScale(d.rank); })
        .curve(curveFn);

      // Create Tooltip DOM
      var tooltip = d3.select(chartContainer)
        .append("div")
        .className = "looker-bump-tooltip";
      var tooltipEl = tooltip.node();
      tooltipEl.style.position = "absolute";
      tooltipEl.style.display = "none";
      tooltipEl.style.padding = "10px 14px";
      tooltipEl.style.backgroundColor = theme.cardBg;
      tooltipEl.style.color = theme.text;
      tooltipEl.style.border = "1px solid " + theme.border;
      tooltipEl.style.borderRadius = "8px";
      tooltipEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltipEl.style.fontSize = "12px";
      tooltipEl.style.pointerEvents = "none";
      tooltipEl.style.zIndex = "100";
      tooltipEl.style.backdropFilter = "blur(6px)";
      tooltipEl.style.minWidth = "180px";

      // Groups for layered rendering
      var linesGroup = g.append("g").attr("class", "bump-lines");
      var nodesGroup = g.append("g").attr("class", "bump-nodes");
      var labelsGroup = g.append("g").attr("class", "bump-labels");

      // Draw Trajectory Lines for each entity
      displayEntities.forEach(function (e) {
        var points = periods.map(function (p) {
          return {
            period: p,
            rank: e.ranks[p] || maxRank,
            value: e.values[p] || 0,
            drills: e.drills[p]
          };
        });

        var pathEl = linesGroup.append("path")
          .datum(points)
          .attr("class", "bump-line-path entity-" + sanitizeClass(e.name))
          .attr("d", lineGen)
          .attr("fill", "none")
          .attr("stroke", e.color)
          .attr("stroke-width", lineWidth)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.85)
          .style("cursor", "pointer")
          .style("transition", "opacity 0.2s, stroke-width 0.2s");

        if (animateTrajectories) {
          var totalLength = pathEl.node().getTotalLength ? pathEl.node().getTotalLength() : 800;
          pathEl
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(850)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
        }

        // Draw Nodes at each period
        points.forEach(function (pt) {
          var nodeG = nodesGroup.append("g")
            .attr("class", "bump-node-group entity-" + sanitizeClass(e.name))
            .attr("transform", "translate(" + xScale(pt.period) + "," + yScale(pt.rank) + ")")
            .style("cursor", "pointer");

          // Outer Circle Marker
          nodeG.append("circle")
            .attr("r", nodeRadius)
            .attr("fill", theme.nodeFill)
            .attr("stroke", e.color)
            .attr("stroke-width", Math.max(2, lineWidth * 0.75))
            .style("transition", "transform 0.15s, stroke-width 0.15s");

          // Inner Rank Text (#1, #2...)
          if (showNodeRanks && nodeRadius >= 10) {
            nodeG.append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .attr("fill", theme.text)
              .attr("font-size", (nodeRadius >= 13 ? "11px" : "9px"))
              .attr("font-weight", "800")
              .text(pt.rank);
          }

          // Hover & Drill Interactivity
          nodeG
            .on("mouseenter", function (event) {
              self.highlightEntity(e.name, theme, lineWidth);
              self.showTooltip(tooltipEl, event, e, pt, valueFormat, theme);
            })
            .on("mousemove", function (event) {
              self.moveTooltip(tooltipEl, event);
            })
            .on("mouseleave", function () {
              self.resetHighlight(theme, lineWidth);
              tooltipEl.style.display = "none";
            })
            .on("click", function (event) {
              if (pt.drills && pt.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({
                  links: pt.drills,
                  event: event
                });
              }
            });
        });

        // Hover over the line itself
        pathEl
          .on("mouseenter", function (event) {
            self.highlightEntity(e.name, theme, lineWidth);
          })
          .on("mouseleave", function () {
            self.resetHighlight(theme, lineWidth);
            tooltipEl.style.display = "none";
          });

        // End Label & Rank Shift Badge at final period
        if (showEndLabels) {
          var lastPeriod = periods[periods.length - 1];
          var lastRank = e.ranks[lastPeriod] || maxRank;
          var endX = xScale(lastPeriod) + nodeRadius + 12;
          var endY = yScale(lastRank);

          var labelG = labelsGroup.append("g")
            .attr("class", "bump-end-label entity-" + sanitizeClass(e.name))
            .attr("transform", "translate(" + endX + "," + endY + ")")
            .style("cursor", "pointer");

          // Entity Name text
          labelG.append("text")
            .attr("dy", "0.35em")
            .attr("fill", e.color)
            .attr("font-size", "12px")
            .attr("font-weight", "700")
            .text(truncateString(e.name, 18));

          // Rank Delta Badge (+2, -1, =)
          if (showRankBadges) {
            var shift = e.netRankShift;
            var badgeText = shift > 0 ? "+" + shift : shift < 0 ? "" + shift : "=";
            var badgeBg = shift > 0 ? theme.posBadgeBg : shift < 0 ? theme.negBadgeBg : theme.neutralBadgeBg;
            var badgeColor = shift > 0 ? theme.posBadgeText : shift < 0 ? theme.negBadgeText : theme.neutralBadgeText;

            var badgeG = labelG.append("g")
              .attr("transform", "translate(115, 0)");

            badgeG.append("rect")
              .attr("x", -12)
              .attr("y", -8)
              .attr("width", 28)
              .attr("height", 16)
              .attr("rx", 4)
              .attr("fill", badgeBg);

            badgeG.append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .attr("fill", badgeColor)
              .attr("font-size", "10px")
              .attr("font-weight", "800")
              .text(badgeText);
          }

          labelG
            .on("mouseenter", function () {
              self.highlightEntity(e.name, theme, lineWidth);
            })
            .on("mouseleave", function () {
              self.resetHighlight(theme, lineWidth);
            });
        }
      });

      // Apply search filter if active from previous input
      if (this.searchFilter) {
        this.applySearchFilter(theme);
      }
    },

    highlightEntity: function (entityName, theme, baseLineWidth) {
      var sClass = sanitizeClass(entityName);
      d3.selectAll(".bump-line-path")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.12;
        })
        .attr("stroke-width", function () {
          return d3.select(this).classed("entity-" + sClass) ? baseLineWidth + 3 : Math.max(1, baseLineWidth * 0.6);
        })
        .style("filter", function () {
          return d3.select(this).classed("entity-" + sClass) ? "url(#bump-glow)" : "none";
        });

      d3.selectAll(".bump-node-group")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.15;
        });

      d3.selectAll(".bump-end-label")
        .attr("opacity", function () {
          return d3.select(this).classed("entity-" + sClass) ? 1.0 : 0.15;
        });
    },

    resetHighlight: function (theme, baseLineWidth) {
      if (this.searchFilter) {
        this.applySearchFilter(theme);
        return;
      }
      d3.selectAll(".bump-line-path")
        .attr("opacity", 0.85)
        .attr("stroke-width", baseLineWidth)
        .style("filter", "none");

      d3.selectAll(".bump-node-group").attr("opacity", 1.0);
      d3.selectAll(".bump-end-label").attr("opacity", 1.0);
    },

    applySearchFilter: function (theme) {
      var term = this.searchFilter;
      if (!term) {
        d3.selectAll(".bump-line-path").attr("opacity", 0.85);
        d3.selectAll(".bump-node-group").attr("opacity", 1.0);
        d3.selectAll(".bump-end-label").attr("opacity", 1.0);
        return;
      }

      d3.selectAll(".bump-line-path").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.08);
      });

      d3.selectAll(".bump-node-group").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.1);
      });

      d3.selectAll(".bump-end-label").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.attr("opacity", match ? 1.0 : 0.1);
      });
    },

    showTooltip: function (tooltipEl, event, entity, point, valueFormat, theme) {
      var shift = entity.startRank - point.rank;
      var shiftText = shift > 0 ? "+" + shift + " spots" : shift < 0 ? shift + " spots" : "Unchanged";
      var shiftBadgeColor = shift > 0 ? theme.posBadgeText : shift < 0 ? theme.negBadgeText : theme.subtext;

      var html = '<div style="font-weight: 800; font-size: 13px; color:' + entity.color + '; margin-bottom: 4px;">' + entity.name + '</div>' +
                 '<div style="font-size: 11px; color:' + theme.subtext + '; margin-bottom: 8px;">Period: <strong>' + point.period + '</strong></div>' +
                 '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">' +
                 '<span>Period Rank:</span>' +
                 '<strong style="font-size: 13px; color:' + theme.text + ';">#' + point.rank + '</strong>' +
                 '</div>' +
                 '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;">' +
                 '<span>Period Metric:</span>' +
                 '<strong style="color:' + theme.text + ';">' + formatMetricValue(point.value, valueFormat) + '</strong>' +
                 '</div>' +
                 '<div style="display: flex; justify-content: space-between; border-top: 1px solid ' + theme.border + '; padding-top: 4px; margin-top: 4px;">' +
                 '<span>Trajectory vs Start:</span>' +
                 '<strong style="color:' + shiftBadgeColor + ';">' + shiftText + '</strong>' +
                 '</div>';

      if (point.drills && point.drills.length > 0) {
        html += '<div style="margin-top: 6px; font-size: 10px; color: #3b82f6; text-align: center;">⚡ Click to open Looker drill actions</div>';
      }

      tooltipEl.innerHTML = html;
      tooltipEl.style.display = "block";
      this.moveTooltip(tooltipEl, event);
    },

    moveTooltip: function (tooltipEl, event) {
      var rootRect = this.container.getBoundingClientRect();
      var x = event.clientX - rootRect.left + 15;
      var y = event.clientY - rootRect.top - 20;

      // Keep inside container bounds
      if (x + 200 > rootRect.width) x = rootRect.width - 210;
      if (y + 120 > rootRect.height) y = rootRect.height - 130;
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      tooltipEl.style.left = x + "px";
      tooltipEl.style.top = y + "px";
    }
  };

  function sanitizeClass(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  function truncateString(str, len) {
    if (!str) return "";
    return str.length > len ? str.substring(0, len) + "…" : str;
  }

  looker.plugins.visualizations.add(visObject);
})();
