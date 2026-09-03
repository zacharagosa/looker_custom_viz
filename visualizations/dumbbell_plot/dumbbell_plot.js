/**
 * Dumbbell Divergence Plot (Connected Dot Plot) - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for executive KPI variance analysis, period-over-period comparisons (e.g. 2024 vs 2025),
 * budget vs actuals, cost vs price, and range divergence across categories.
 *
 * Features:
 * - Dynamic data mapping: 1 Dimension + 2 Measures, OR 1 Dimension + Pivoted Measure (2 pivots)
 * - Directional bridge lines indicating positive/negative change
 * - Directional arrowheads / chevrons revealing movement vector
 * - Variance pill badges with formatted delta values and percentage growth
 * - Responsive SVG rendering with intelligent label positioning
 * - Glassmorphism interactive tooltips with drill-down link support
 * - Multiple executive color palettes (Executive Slate, Google Vibrant, Emerald Growth, Midnight Cyber, Sunset Warmth, Ocean Breeze)
 * - Rich sorting controls (By Delta, By End Value, By Start Value, Category)
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector("script[src*=\"d3.v7\"]");
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
    executive_slate: {
      name: "Executive Slate",
      dotA: "#64748b",         // Slate Gray
      dotB: "#1e40af",         // Deep Blue
      bridgePositive: "#10b981", // Emerald
      bridgeNegative: "#ef4444", // Crimson Red
      bridgeNeutral: "#cbd5e1",
      badgePosBg: "#dcfce7",
      badgePosText: "#15803d",
      badgeNegBg: "#fee2e2",
      badgeNegText: "#b91c1c",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#f1f5f9",
      rowHover: "rgba(241, 245, 249, 0.6)",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0"
    },
    google_vibrant: {
      name: "Google Vibrant",
      dotA: "#5f6368",         // Google Slate
      dotB: "#1a73e8",         // Google Blue
      bridgePositive: "#34a853", // Google Green
      bridgeNegative: "#ea4335", // Google Red
      bridgeNeutral: "#dadce0",
      badgePosBg: "#ceead6",
      badgePosText: "#137333",
      badgeNegBg: "#fad2cf",
      badgeNegText: "#c5221f",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      grid: "#f8f9fa",
      rowHover: "rgba(232, 240, 254, 0.4)",
      cardBg: "#ffffff",
      cardBorder: "#dadce0"
    },
    emerald_growth: {
      name: "Emerald Growth",
      dotA: "#0f766e",         // Teal
      dotB: "#047857",         // Deep Emerald
      bridgePositive: "#10b981", // Bright Emerald
      bridgeNegative: "#f43f5e", // Rose
      bridgeNeutral: "#cbd5e1",
      badgePosBg: "#d1fae5",
      badgePosText: "#065f46",
      badgeNegBg: "#ffe4e6",
      badgeNegText: "#9f1239",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#f0fdf4",
      rowHover: "rgba(209, 250, 229, 0.4)",
      cardBg: "#f0fdf4",
      cardBorder: "#a7f3d0"
    },
    midnight_cyber: {
      name: "Midnight Cyber (Dark)",
      dotA: "#38bdf8",         // Neon Sky Blue
      dotB: "#ec4899",         // Neon Pink / Fuchsia
      bridgePositive: "#10b981", // Neon Green
      bridgeNegative: "#f43f5e", // Neon Rose
      bridgeNeutral: "#475569",
      badgePosBg: "#064e3b",
      badgePosText: "#6ee7b7",
      badgeNegBg: "#4c0519",
      badgeNegText: "#fda4af",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      rowHover: "rgba(51, 65, 85, 0.5)",
      cardBg: "#1e293b",
      cardBorder: "#334155"
    },
    sunset_warmth: {
      name: "Sunset Warmth",
      dotA: "#d97706",         // Amber
      dotB: "#c2410c",         // Burnt Orange / Terracotta
      bridgePositive: "#059669", // Emerald
      bridgeNegative: "#dc2626", // Crimson
      bridgeNeutral: "#fed7aa",
      badgePosBg: "#fef3c7",
      badgePosText: "#92400e",
      badgeNegBg: "#fee2e2",
      badgeNegText: "#991b1b",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      grid: "#fff7ed",
      rowHover: "rgba(254, 243, 199, 0.4)",
      cardBg: "#fffbeb",
      cardBorder: "#fde68a"
    },
    ocean_breeze: {
      name: "Ocean Breeze",
      dotA: "#0284c7",         // Sky Blue
      dotB: "#1d4ed8",         // Cobalt
      bridgePositive: "#0d9488", // Teal
      bridgeNegative: "#e11d48", // Crimson
      bridgeNeutral: "#bae6fd",
      badgePosBg: "#e0f2fe",
      badgePosText: "#0369a1",
      badgeNegBg: "#ffe4e6",
      badgeNegText: "#be123c",
      bg: "#ffffff",
      text: "#0c4a6e",
      subtext: "#0369a1",
      grid: "#f0f9ff",
      rowHover: "rgba(224, 242, 254, 0.4)",
      cardBg: "#f0f9ff",
      cardBorder: "#bae6fd"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var absVal = Math.abs(val);
    var sign = val < 0 ? "-" : "";

    switch (fmt) {
      case "compact_currency":
        if (absVal >= 1e9) return sign + "$" + (absVal / 1e9).toFixed(1) + "B";
        if (absVal >= 1e6) return sign + "$" + (absVal / 1e6).toFixed(1) + "M";
        if (absVal >= 1e3) return sign + "$" + (absVal / 1e3).toFixed(1) + "K";
        return sign + "$" + absVal.toFixed(absVal % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + absVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (absVal >= 1e9) return sign + (absVal / 1e9).toFixed(1) + "B";
        if (absVal >= 1e6) return sign + (absVal / 1e6).toFixed(1) + "M";
        if (absVal >= 1e3) return sign + (absVal / 1e3).toFixed(1) + "K";
        return sign + absVal.toFixed(absVal % 1 === 0 ? 0 : 2);
      case "percent":
        return (val * 100).toFixed(1) + "%";
      case "full_number":
      default:
        return sign + absVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function formatDelta(delta, deltaPct, fmt, metricMode) {
    var deltaSign = delta > 0 ? "+" : delta < 0 ? "-" : "";
    var formattedVal = formatValue(Math.abs(delta), fmt);
    var valStr = deltaSign + formattedVal;
    var pctSign = deltaPct > 0 ? "+" : deltaPct < 0 ? "-" : "";
    var pctStr = pctSign + (Math.abs(deltaPct) * 100).toFixed(1) + "%";

    if (metricMode === "delta_pct") return pctStr;
    if (metricMode === "delta_val") return valStr;
    if (metricMode === "ratio") {
      var ratio = delta !== 0 ? (1 + deltaPct) : 1;
      return ratio.toFixed(2) + "x";
    }
    return valStr + " (" + pctStr + ")";
  }

  var visObject = {
    id: "dumbbell_plot",
    label: "Dumbbell Divergence Plot",
    options: {
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Executive Slate": "executive_slate" },
          { "Google Vibrant": "google_vibrant" },
          { "Emerald Growth": "emerald_growth" },
          { "Midnight Cyber (Dark)": "midnight_cyber" },
          { "Sunset Warmth": "sunset_warmth" },
          { "Ocean Breeze": "ocean_breeze" }
        ],
        default: "executive_slate",
        section: "Theme & Aesthetics",
        order: 1
      },
      bridgeColorMode: {
        type: "string",
        label: "Bridge Color Encoding",
        display: "select",
        values: [
          { "Directional (Green if B > A, Red if B < A)": "directional" },
          { "Uniform Neutral Bridge": "neutral" },
          { "Gradient (Dot A to Dot B)": "gradient" }
        ],
        default: "directional",
        section: "Styling & Encoding",
        order: 2
      },
      showDirectionArrows: {
        type: "boolean",
        label: "Show Direction Arrows (A -> B)",
        default: true,
        section: "Styling & Encoding",
        order: 3
      },
      pointRadius: {
        type: "number",
        label: "Marker Dot Radius (px)",
        default: 8,
        section: "Styling & Encoding",
        order: 4
      },
      bridgeThickness: {
        type: "number",
        label: "Bridge Line Thickness (px)",
        default: 3,
        section: "Styling & Encoding",
        order: 5
      },
      rowHeight: {
        type: "number",
        label: "Row Height (px)",
        default: 52,
        section: "Layout",
        order: 6
      },
      showVarianceBadge: {
        type: "boolean",
        label: "Show Variance / Delta Badges",
        default: true,
        section: "Labels & Badges",
        order: 7
      },
      badgeMetric: {
        type: "string",
        label: "Badge Metric Display",
        display: "select",
        values: [
          { "Value & % (+Delta ($) & +%)": "both" },
          { "Percentage Delta (+18.4%)": "delta_pct" },
          { "Value Delta (+$12.5K)": "delta_val" },
          { "Ratio Multiplier (1.25x)": "ratio" }
        ],
        default: "both",
        section: "Labels & Badges",
        order: 8
      },
      showPointLabels: {
        type: "boolean",
        label: "Show Value Numbers at Dots",
        default: true,
        section: "Labels & Badges",
        order: 9
      },
      valueFormat: {
        type: "string",
        label: "Number & Currency Format",
        display: "select",
        values: [
          { "Compact Currency ($12.4K)": "compact_currency" },
          { "Full Currency ($12,400)": "full_currency" },
          { "Compact Number (12.4K)": "compact_number" },
          { "Full Number (12,400)": "full_number" },
          { "Percentage (12.4%)": "percent" }
        ],
        default: "compact_currency",
        section: "Labels & Badges",
        order: 10
      },
      sortBy: {
        type: "string",
        label: "Sort Rows By",
        display: "select",
        values: [
          { "Default Query Sort": "none" },
          { "Highest Positive Variance First (B - A desc)": "delta_desc" },
          { "Highest Negative Variance First (B - A asc)": "delta_asc" },
          { "Point B Value Descending": "val_b_desc" },
          { "Point A Value Descending": "val_a_desc" },
          { "Category Name (A to Z)": "category_asc" }
        ],
        default: "none",
        section: "Layout",
        order: 11
      },
      showLegend: {
        type: "boolean",
        label: "Show Top Summary Header & Legend",
        default: true,
        section: "Theme & Aesthetics",
        order: 12
      },
      labelPointA: {
        type: "string",
        label: "Custom Label for Point A (Baseline)",
        default: "",
        section: "Labels & Badges",
        order: 13
      },
      labelPointB: {
        type: "string",
        label: "Custom Label for Point B (Comparison)",
        default: "",
        section: "Labels & Badges",
        order: 14
      },
      showGridLines: {
        type: "boolean",
        label: "Show Vertical Axis Grid Lines",
        default: true,
        section: "Layout",
        order: 15
      },
      zeroBaseline: {
        type: "boolean",
        label: "Force Axis Zero Baseline",
        default: false,
        section: "Layout",
        order: 16
      },
      enableAnimation: {
        type: "boolean",
        label: "Enable Smooth Render Transitions",
        default: true,
        section: "Theme & Aesthetics",
        order: 17
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-dumbbell-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflowX = "hidden";
      container.style.overflowY = "auto";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif";
      container.style.boxSizing = "border-box";
      element.appendChild(container);

      // Tooltip element
      var tooltip = document.createElement("div");
      tooltip.className = "looker-dumbbell-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)";
      tooltip.style.transition = "opacity 0.12s ease-out, transform 0.12s ease-out";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.webkitBackdropFilter = "blur(8px)";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this.clearErrors();

      // Validate inputs
      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to visualize."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Dumbbell Divergence Plot requires at least 1 Dimension for row grouping (e.g. Category, State, Rep)."
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Dumbbell Divergence Plot requires at least 1 Measure (2 measures recommended: Point A Baseline and Point B Comparison)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error("Dumbbell Plot render error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the visualization."
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".looker-dumbbell-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "executive_slate";
      var theme = THEMES[themeKey] || THEMES.executive_slate;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fields = queryResponse.fields;
      var dimField = fields.dimensions[0];
      var pivots = queryResponse.pivots || [];

      var labelA = config.labelPointA;
      var labelB = config.labelPointB;
      var isPivoted = pivots.length >= 2;

      var measFieldA = fields.measures[0];
      var measFieldB = fields.measures.length > 1 ? fields.measures[1] : null;

      if (isPivoted) {
        if (!labelA) labelA = pivots[0].key || "Baseline";
        if (!labelB) labelB = pivots[1].key || "Comparison";
      } else {
        if (!labelA) labelA = measFieldA.label_short || measFieldA.label || "Baseline";
        if (!labelB) labelB = measFieldB ? (measFieldB.label_short || measFieldB.label) : "Target / Projected";
      }

      // Parse and extract rows
      var items = [];
      var positiveDeltasCount = 0;
      var totalDeltaSum = 0;

      data.forEach(function (row, idx) {
        var catName = row[dimField.name] ? (row[dimField.name].rendered || row[dimField.name].value) : ("Item " + (idx + 1));
        var valA = 0;
        var valB = 0;
        var cellA = null;
        var cellB = null;

        if (isPivoted) {
          var pivotKeyA = pivots[0].key;
          var pivotKeyB = pivots[1].key;
          cellA = row[measFieldA.name] ? row[measFieldA.name][pivotKeyA] : null;
          cellB = row[measFieldA.name] ? row[measFieldA.name][pivotKeyB] : null;
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = cellB && cellB.value !== null && !isNaN(cellB.value) ? Number(cellB.value) : 0;
        } else if (measFieldB) {
          cellA = row[measFieldA.name];
          cellB = row[measFieldB.name];
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = cellB && cellB.value !== null && !isNaN(cellB.value) ? Number(cellB.value) : 0;
        } else {
          // Fallback single measure: projected 1.2x
          cellA = row[measFieldA.name];
          valA = cellA && cellA.value !== null && !isNaN(cellA.value) ? Number(cellA.value) : 0;
          valB = valA * 1.2;
        }

        var delta = valB - valA;
        var deltaPct = valA !== 0 ? delta / Math.abs(valA) : 0;
        if (delta > 0) positiveDeltasCount++;
        totalDeltaSum += delta;

        items.push({
          id: idx,
          category: String(catName),
          valA: valA,
          valB: valB,
          delta: delta,
          deltaPct: deltaPct,
          isPositive: delta >= 0,
          renderedA: cellA && cellA.rendered ? cellA.rendered : null,
          renderedB: cellB && cellB.rendered ? cellB.rendered : null,
          links: (cellB && cellB.links) || (cellA && cellA.links) || []
        });
      });

      // Sorting
      var sortBy = config.sortBy || "none";
      if (sortBy === "delta_desc") {
        items.sort(function (a, b) { return b.delta - a.delta; });
      } else if (sortBy === "delta_asc") {
        items.sort(function (a, b) { return a.delta - b.delta; });
      } else if (sortBy === "val_b_desc") {
        items.sort(function (a, b) { return b.valB - a.valB; });
      } else if (sortBy === "val_a_desc") {
        items.sort(function (a, b) { return b.valA - a.valA; });
      } else if (sortBy === "category_asc") {
        items.sort(function (a, b) { return a.category.localeCompare(b.category); });
      }

      var totalItems = items.length;
      var avgDelta = totalItems > 0 ? totalDeltaSum / totalItems : 0;
      var pctPositive = totalItems > 0 ? (positiveDeltasCount / totalItems) * 100 : 0;

      // Header / Legend Card
      if (config.showLegend !== false) {
        var header = document.createElement("div");
        header.style.padding = "16px 20px 12px 20px";
        header.style.borderBottom = "1px solid " + theme.grid;
        header.style.display = "flex";
        header.style.flexWrap = "wrap";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.gap = "12px";

        // Left: Legend dots
        var legendLeft = document.createElement("div");
        legendLeft.style.display = "flex";
        legendLeft.style.alignItems = "center";
        legendLeft.style.gap = "18px";
        legendLeft.style.fontSize = "13px";

        // Dot A indicator
        var itemA = document.createElement("div");
        itemA.style.display = "flex";
        itemA.style.alignItems = "center";
        itemA.style.gap = "6px";
        itemA.innerHTML = "<span style=\"display:inline-block;width:12px;height:12px;border-radius:50%;background:" + theme.dotA + ";box-shadow:0 0 0 2px " + theme.bg + ",0 0 0 3px " + theme.dotA + ";\"></span>" +
          "<span style=\"font-weight:600;color:" + theme.text + ";\">" + labelA + "</span>";

        // Arrow indicator
        var itemArrow = document.createElement("div");
        itemArrow.style.color = theme.subtext;
        itemArrow.style.fontSize = "14px";
        itemArrow.innerHTML = "&rarr;";

        // Dot B indicator
        var itemB = document.createElement("div");
        itemB.style.display = "flex";
        itemB.style.alignItems = "center";
        itemB.style.gap = "6px";
        itemB.innerHTML = "<span style=\"display:inline-block;width:12px;height:12px;border-radius:50%;background:" + theme.dotB + ";box-shadow:0 0 0 2px " + theme.bg + ",0 0 0 3px " + theme.dotB + ";\"></span>" +
          "<span style=\"font-weight:600;color:" + theme.text + ";\">" + labelB + "</span>";

        legendLeft.appendChild(itemA);
        legendLeft.appendChild(itemArrow);
        legendLeft.appendChild(itemB);

        // Right: Executive summary stats pills
        var legendRight = document.createElement("div");
        legendRight.style.display = "flex";
        legendRight.style.alignItems = "center";
        legendRight.style.gap = "10px";

        var pillCount = document.createElement("div");
        pillCount.style.fontSize = "11px";
        pillCount.style.fontWeight = "600";
        pillCount.style.padding = "4px 10px";
        pillCount.style.borderRadius = "12px";
        pillCount.style.backgroundColor = theme.cardBg;
        pillCount.style.border = "1px solid " + theme.cardBorder;
        pillCount.style.color = theme.subtext;
        pillCount.textContent = totalItems + " Categories";

        var pillNetGrowth = document.createElement("div");
        pillNetGrowth.style.fontSize = "11px";
        pillNetGrowth.style.fontWeight = "600";
        pillNetGrowth.style.padding = "4px 10px";
        pillNetGrowth.style.borderRadius = "12px";
        pillNetGrowth.style.backgroundColor = pctPositive >= 50 ? theme.badgePosBg : theme.badgeNegBg;
        pillNetGrowth.style.color = pctPositive >= 50 ? theme.badgePosText : theme.badgeNegText;
        pillNetGrowth.textContent = pctPositive.toFixed(0) + "% Showing Growth (" + positiveDeltasCount + "/" + totalItems + ")";

        legendRight.appendChild(pillCount);
        legendRight.appendChild(pillNetGrowth);

        header.appendChild(legendLeft);
        header.appendChild(legendRight);
        container.appendChild(header);
      }

      // Chart area dimensions
      var totalWidth = container.clientWidth || element.clientWidth || 800;
      var rowHeight = Math.max(36, config.rowHeight || 52);
      var chartHeight = items.length * rowHeight;
      var marginTop = 30;
      var marginBottom = 40;
      var marginLeft = 140; // Space for category labels
      var marginRight = config.showVarianceBadge !== false ? 140 : 60; // Space for badges

      // Dynamic category label truncation width
      var labelAvailableWidth = marginLeft - 16;

      var svgWidth = Math.max(totalWidth, 500);
      var svgHeight = chartHeight + marginTop + marginBottom;

      var svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", svgHeight)
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        .style("display", "block")
        .style("overflow", "visible");

      // Defs for gradients and markers
      var defs = svg.append("defs");

      // Arrow markers
      defs.append("marker")
        .attr("id", "arrow-positive")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 7)
        .attr("refY", 5)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 1.5 L 8 5 L 0 8.5 z")
        .attr("fill", theme.bridgePositive);

      defs.append("marker")
        .attr("id", "arrow-negative")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 7)
        .attr("refY", 5)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 1.5 L 8 5 L 0 8.5 z")
        .attr("fill", theme.bridgeNegative);

      defs.append("marker")
        .attr("id", "arrow-neutral")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 7)
        .attr("refY", 5)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 1.5 L 8 5 L 0 8.5 z")
        .attr("fill", theme.subtext);

      // Scales
      var allValues = [];
      items.forEach(function (d) {
        allValues.push(d.valA);
        allValues.push(d.valB);
      });

      var minVal = d3.min(allValues) || 0;
      var maxVal = d3.max(allValues) || 100;

      if (config.zeroBaseline) {
        minVal = Math.min(0, minVal);
      } else {
        var rangeSpan = maxVal - minVal;
        minVal = Math.max(0, minVal - rangeSpan * 0.08);
        maxVal = maxVal + rangeSpan * 0.08;
      }

      var plotWidth = svgWidth - marginLeft - marginRight;
      var xScale = d3.scaleLinear()
        .domain([minVal, maxVal])
        .range([marginLeft, marginLeft + plotWidth])
        .nice();

      var yScale = d3.scaleBand()
        .domain(items.map(function (d) { return d.category; }))
        .range([marginTop, marginTop + chartHeight])
        .padding(0.3);

      // Grid Lines & Ticks
      if (config.showGridLines !== false) {
        var xTicks = xScale.ticks(6);
        var gridGroup = svg.append("g").attr("class", "grid-lines");

        xTicks.forEach(function (tick) {
          var xPos = xScale(tick);
          gridGroup.append("line")
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", marginTop - 8)
            .attr("y2", marginTop + chartHeight + 6)
            .attr("stroke", theme.grid)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3 3");

          // Top axis tick label
          gridGroup.append("text")
            .attr("x", xPos)
            .attr("y", marginTop - 12)
            .attr("text-anchor", "middle")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .text(formatValue(tick, config.valueFormat || "compact_currency"));
        });
      }

      var pointRadius = Math.max(4, config.pointRadius || 8);
      var bridgeThickness = Math.max(1, config.bridgeThickness || 3);
      var bridgeMode = config.bridgeColorMode || "directional";
      var showArrows = config.showDirectionArrows !== false;
      var enableAnimation = config.enableAnimation !== false;

      // Render Rows
      var rowGroup = svg.append("g").attr("class", "dumbbell-rows");

      var rows = rowGroup.selectAll(".dumbbell-row")
        .data(items, function (d) { return d.category; })
        .enter()
        .append("g")
        .attr("class", "dumbbell-row")
        .attr("transform", function (d) {
          return "translate(0, " + yScale(d.category) + ")";
        })
        .style("cursor", "pointer");

      var rowBandHeight = yScale.bandwidth();
      var centerY = rowBandHeight / 2;

      // Row background hover pill
      rows.append("rect")
        .attr("x", 4)
        .attr("y", 0)
        .attr("width", svgWidth - 8)
        .attr("height", rowBandHeight)
        .attr("rx", 6)
        .attr("fill", "transparent")
        .attr("class", "row-bg-hover")
        .style("transition", "fill 0.15s ease");

      // Category Label (Y-axis)
      rows.append("text")
        .attr("x", marginLeft - 16)
        .attr("y", centerY)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .attr("fill", theme.text)
        .attr("font-size", "12px")
        .attr("font-weight", "600")
        .text(function (d) {
          var label = d.category;
          if (label.length > 18) return label.slice(0, 16) + "...";
          return label;
        })
        .append("title")
        .text(function (d) { return d.category; });

      // Connector Bridge Line
      rows.each(function (d, i) {
        var rowG = d3.select(this);
        var xA = xScale(d.valA);
        var xB = xScale(d.valB);
        var xLeft = Math.min(xA, xB);
        var xRight = Math.max(xA, xB);

        var bridgeColor = theme.bridgeNeutral;
        var markerId = null;

        if (bridgeMode === "directional") {
          bridgeColor = d.isPositive ? theme.bridgePositive : theme.bridgeNegative;
          if (showArrows && Math.abs(xB - xA) > 28) {
            markerId = d.isPositive ? "url(#arrow-positive)" : "url(#arrow-negative)";
          }
        } else if (bridgeMode === "gradient") {
          var gradId = "grad-" + i;
          var grad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("x1", xA < xB ? "0%" : "100%")
            .attr("y1", "0%")
            .attr("x2", xA < xB ? "100%" : "0%")
            .attr("y2", "0%");
          grad.append("stop").attr("offset", "0%").attr("stop-color", theme.dotA);
          grad.append("stop").attr("offset", "100%").attr("stop-color", theme.dotB);
          bridgeColor = "url(#" + gradId + ")";
        }

        // Bridge line
        var line = rowG.append("line")
          .attr("x1", xA)
          .attr("y1", centerY)
          .attr("y2", centerY)
          .attr("stroke", bridgeColor)
          .attr("stroke-width", bridgeThickness)
          .attr("stroke-linecap", "round");

        if (markerId) {
          line.attr("marker-end", markerId);
        }

        if (enableAnimation) {
          line.attr("x2", xA)
            .transition()
            .duration(600)
            .delay(i * 35)
            .ease(d3.easeCubicOut)
            .attr("x2", xB);
        } else {
          line.attr("x2", xB);
        }
      });

      // Point A Dot (Baseline)
      var dotsA = rows.append("circle")
        .attr("cy", centerY)
        .attr("r", pointRadius)
        .attr("fill", theme.dotA)
        .attr("stroke", theme.bg)
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.15))");

      if (enableAnimation) {
        dotsA.attr("cx", function (d) { return xScale(minVal); })
          .transition()
          .duration(500)
          .delay(function (d, i) { return i * 35; })
          .ease(d3.easeBackOut)
          .attr("cx", function (d) { return xScale(d.valA); });
      } else {
        dotsA.attr("cx", function (d) { return xScale(d.valA); });
      }

      // Point B Dot (Comparison / Outcome)
      var dotsB = rows.append("circle")
        .attr("cy", centerY)
        .attr("r", pointRadius + 1)
        .attr("fill", theme.dotB)
        .attr("stroke", theme.bg)
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");

      if (enableAnimation) {
        dotsB.attr("cx", function (d) { return xScale(d.valA); })
          .transition()
          .duration(650)
          .delay(function (d, i) { return i * 35 + 100; })
          .ease(d3.easeCubicOut)
          .attr("cx", function (d) { return xScale(d.valB); });
      } else {
        dotsB.attr("cx", function (d) { return xScale(d.valB); });
      }

      // Value text readouts at dots
      if (config.showPointLabels !== false) {
        rows.each(function (d, i) {
          var rowG = d3.select(this);
          var xA = xScale(d.valA);
          var xB = xScale(d.valB);
          var dist = Math.abs(xB - xA);
          var fmt = config.valueFormat || "compact_currency";

          var textValA = d.renderedA || formatValue(d.valA, fmt);
          var textValB = d.renderedB || formatValue(d.valB, fmt);

          // If dots are far enough apart, show both beside dots
          // If too close, place one above and one below or stagger
          var offsetA = xA <= xB ? -12 : 12;
          var offsetB = xB >= xA ? 12 : -12;
          var anchorA = xA <= xB ? "end" : "start";
          var anchorB = xB >= xA ? "start" : "end";

          if (dist < 55) {
            // Stagger vertically
            rowG.append("text")
              .attr("x", xA)
              .attr("y", centerY - pointRadius - 4)
              .attr("text-anchor", "middle")
              .attr("fill", theme.subtext)
              .attr("font-size", "10px")
              .attr("font-weight", "500")
              .text(textValA);

            rowG.append("text")
              .attr("x", xB)
              .attr("y", centerY + pointRadius + 12)
              .attr("text-anchor", "middle")
              .attr("fill", theme.dotB)
              .attr("font-size", "10.5px")
              .attr("font-weight", "700")
              .text(textValB);
          } else {
            rowG.append("text")
              .attr("x", xA + offsetA)
              .attr("y", centerY)
              .attr("dominant-baseline", "central")
              .attr("text-anchor", anchorA)
              .attr("fill", theme.subtext)
              .attr("font-size", "10.5px")
              .attr("font-weight", "500")
              .text(textValA);

            rowG.append("text")
              .attr("x", xB + offsetB)
              .attr("y", centerY)
              .attr("dominant-baseline", "central")
              .attr("text-anchor", anchorB)
              .attr("fill", theme.dotB)
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .text(textValB);
          }
        });
      }

      // Variance Badges (Right Margin)
      if (config.showVarianceBadge !== false) {
        var badgeGroup = rows.append("g")
          .attr("transform", "translate(" + (svgWidth - marginRight + 16) + ", " + centerY + ")");

        badgeGroup.each(function (d) {
          var bgG = d3.select(this);
          var badgeText = formatDelta(d.delta, d.deltaPct, config.valueFormat || "compact_currency", config.badgeMetric || "both");
          var isPos = d.isPositive;

          var badgeRect = bgG.append("rect")
            .attr("y", -11)
            .attr("height", 22)
            .attr("rx", 11)
            .attr("fill", isPos ? theme.badgePosBg : theme.badgeNegBg)
            .attr("stroke", isPos ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)")
            .attr("stroke-width", 1);

          var textElem = bgG.append("text")
            .attr("x", 8)
            .attr("y", 0)
            .attr("dominant-baseline", "central")
            .attr("fill", isPos ? theme.badgePosText : theme.badgeNegText)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .text(badgeText);

          // Size rect based on text length
          var textWidth = badgeText.length * 6.5 + 16;
          badgeRect.attr("width", textWidth);
        });
      }

      // Tooltip Interactions
      var tooltip = this._tooltip;
      rows.on("mouseenter", function (event, d) {
        d3.select(this).select(".row-bg-hover").attr("fill", theme.rowHover);

        if (!tooltip) return;
        var fmt = config.valueFormat || "compact_currency";
        var deltaSign = d.delta > 0 ? "+" : d.delta < 0 ? "-" : "";
        var valAFormatted = d.renderedA || formatValue(d.valA, fmt);
        var valBFormatted = d.renderedB || formatValue(d.valB, fmt);
        var deltaFormatted = deltaSign + formatValue(Math.abs(d.delta), fmt);
        var pctFormatted = (d.deltaPct >= 0 ? "+" : "") + (d.deltaPct * 100).toFixed(1) + "%";
        var ratioStr = (d.valA !== 0 ? (d.valB / d.valA) : 1).toFixed(2) + "x";

        var statusIcon = d.isPositive ? "&#9650; Growth / Surplus" : "&#9660; Decline / Deficit";
        var statusColor = d.isPositive ? theme.badgePosText : theme.badgeNegText;
        var statusBg = d.isPositive ? theme.badgePosBg : theme.badgeNegBg;

        tooltip.innerHTML = "" +
          "<div style=\"font-weight:700;font-size:13px;margin-bottom:6px;color:" + theme.text + ";\">" + d.category + "</div>" +
          "<div style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:" + statusBg + ";color:" + statusColor + ";margin-bottom:8px;\">" + statusIcon + "</div>" +
          "<div style=\"display:grid;grid-template-columns:auto auto;gap:4px 14px;color:" + theme.subtext + ";font-size:11.5px;\">" +
          "  <span>" + labelA + ":</span><span style=\"font-weight:600;color:" + theme.text + ";text-align:right;\">" + valAFormatted + "</span>" +
          "  <span>" + labelB + ":</span><span style=\"font-weight:600;color:" + theme.dotB + ";text-align:right;\">" + valBFormatted + "</span>" +
          "  <span>Net Variance:</span><span style=\"font-weight:700;color:" + statusColor + ";text-align:right;\">" + deltaFormatted + " (" + pctFormatted + ")</span>" +
          "  <span>Multiplier:</span><span style=\"font-weight:600;color:" + theme.text + ";text-align:right;\">" + ratioStr + "</span>" +
          "</div>" +
          (d.links && d.links.length > 0 ? "<div style=\"margin-top:8px;font-size:10.5px;color:#3b82f6;font-weight:600;\">Click row to explore drill-down &rarr;</div>" : "");

        tooltip.style.backgroundColor = themeKey === "midnight_cyber" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)";
        tooltip.style.border = "1px solid " + theme.cardBorder;
        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
        tooltip.style.transform = "scale(1)";
      });

      rows.on("mousemove", function (event) {
        if (!tooltip) return;
        var mouseX = event.clientX;
        var mouseY = event.clientY;
        var ttWidth = tooltip.offsetWidth || 220;
        var ttHeight = tooltip.offsetHeight || 130;

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

      rows.on("mouseleave", function () {
        d3.select(this).select(".row-bg-hover").attr("fill", "transparent");
        if (tooltip) {
          tooltip.style.display = "none";
        }
      });

      // Handle Looker drill links on click
      rows.on("click", function (event, d) {
        if (d.links && d.links.length > 0 && LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: d.links,
            event: event
          });
        }
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
})();\n