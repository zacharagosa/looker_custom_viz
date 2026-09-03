/**
 * Sparkline Metric Matrix Table - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Executive scorecard table featuring in-cell SVG sparklines, micro bullet bars,
 * period-over-period variance pills, and interactive sorting & search filtering.
 *
 * Supports:
 * - Pivoted Time-Series (1 Dimension + Pivoted Time + 1 Measure): collapses time columns into sparklines
 * - Multi-Metric Matrices (1 Dimension + 2-6 Measures): renders micro-bars and composite sparklines
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
      headerBg: "#f8fafc",
      headerText: "#475569",
      rowHover: "rgba(241, 245, 249, 0.7)",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      sparkline: "#1e40af",
      sparklineArea: "#dbeafe",
      barBg: "#e2e8f0",
      barFill: "#3b82f6",
      badgePosBg: "#dcfce7",
      badgePosText: "#15803d",
      badgeNegBg: "#fee2e2",
      badgeNegText: "#b91c1c"
    },
    google_vibrant: {
      name: "Google Vibrant",
      headerBg: "#f8f9fa",
      headerText: "#5f6368",
      rowHover: "rgba(232, 240, 254, 0.5)",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      sparkline: "#1a73e8",
      sparklineArea: "#e8f0fe",
      barBg: "#f1f3f4",
      barFill: "#1a73e8",
      badgePosBg: "#ceead6",
      badgePosText: "#137333",
      badgeNegBg: "#fad2cf",
      badgeNegText: "#c5221f"
    },
    emerald_growth: {
      name: "Emerald Growth",
      headerBg: "#f0fdf4",
      headerText: "#065f46",
      rowHover: "rgba(209, 250, 229, 0.4)",
      border: "#a7f3d0",
      text: "#064e3b",
      subtext: "#047857",
      sparkline: "#059669",
      sparklineArea: "#d1fae5",
      barBg: "#dcfce7",
      barFill: "#10b981",
      badgePosBg: "#d1fae5",
      badgePosText: "#065f46",
      badgeNegBg: "#ffe4e6",
      badgeNegText: "#9f1239"
    },
    midnight_cyber: {
      name: "Midnight Cyber (Dark)",
      headerBg: "#1e293b",
      headerText: "#94a3b8",
      rowHover: "rgba(51, 65, 85, 0.5)",
      border: "#334155",
      text: "#f8fafc",
      subtext: "#94a3b8",
      sparkline: "#38bdf8",
      sparklineArea: "rgba(56, 189, 248, 0.15)",
      barBg: "#334155",
      barFill: "#38bdf8",
      badgePosBg: "#064e3b",
      badgePosText: "#6ee7b7",
      badgeNegBg: "#4c0519",
      badgeNegText: "#fda4af"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";
    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "percent":
        return (val * 100).toFixed(1) + "%";
      case "full_number":
      default:
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  var visObject = {
    id: "sparkline_matrix_table",
    label: "Sparkline Metric Matrix Table",
    options: {
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Executive Slate": "executive_slate" },
          { "Google Vibrant": "google_vibrant" },
          { "Emerald Growth": "emerald_growth" },
          { "Midnight Cyber (Dark)": "midnight_cyber" }
        ],
        default: "executive_slate",
        section: "Theme",
        order: 1
      },
      showSparklines: {
        type: "boolean",
        label: "Show Inline Trend Sparklines",
        default: true,
        section: "Visuals",
        order: 2
      },
      showMicroBars: {
        type: "boolean",
        label: "Show Volume Micro Bullet Bars",
        default: true,
        section: "Visuals",
        order: 3
      },
      showVarianceBadge: {
        type: "boolean",
        label: "Show Period Growth / Delta Badges",
        default: true,
        section: "Visuals",
        order: 4
      },
      showSearch: {
        type: "boolean",
        label: "Enable Quick Search Filter",
        default: true,
        section: "Controls",
        order: 5
      },
      valueFormat: {
        type: "string",
        label: "Value & Number Format",
        display: "select",
        values: [
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Full Currency ($1,240,000)": "full_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Full Number (1,240,000)": "full_number" },
          { "Percentage (12.4%)": "percent" }
        ],
        default: "compact_currency",
        section: "Formatting",
        order: 6
      },
      rowHeight: {
        type: "number",
        label: "Row Height (px)",
        default: 48,
        section: "Layout",
        order: 7
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "sparkline-matrix-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "sparkline-matrix-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
      tooltip.style.backdropFilter = "blur(8px)";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to display in the matrix table."
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
          message: "Sparkline Matrix Table requires at least 1 Dimension for row grouping (e.g. Category, Brand, State)."
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Sparkline Matrix Table requires at least 1 Measure (e.g. Total Revenue, Orders)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error("Sparkline Table render error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the matrix table."
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".sparkline-matrix-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "executive_slate";
      var theme = THEMES[themeKey] || THEMES.executive_slate;
      container.style.backgroundColor = themeKey === "midnight_cyber" ? "#0f172a" : "#ffffff";
      container.style.color = theme.text;

      var fields = queryResponse.fields;
      var dimField = fields.dimensions[0];
      var pivots = queryResponse.pivots || [];
      var isPivoted = pivots.length > 1;
      var measField = fields.measures[0];
      var fmt = config.valueFormat || "compact_currency";

      // Parse Rows
      var rows = [];
      var maxTotalVal = 0;

      data.forEach(function (row, idx) {
        var catName = row[dimField.name] ? (row[dimField.name].rendered || row[dimField.name].value) : ("Row " + (idx + 1));
        var seriesPoints = [];
        var totalVal = 0;
        var cellLinks = [];

        if (isPivoted) {
          pivots.forEach(function (p) {
            var cell = row[measField.name] ? row[measField.name][p.key] : null;
            var v = cell && cell.value !== null && !isNaN(cell.value) ? Number(cell.value) : 0;
            totalVal += v;
            seriesPoints.push({
              key: p.key,
              label: p.key,
              value: v,
              rendered: cell && cell.rendered ? cell.rendered : null
            });
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        } else {
          // Unpivoted measures
          fields.measures.forEach(function (m) {
            var cell = row[m.name];
            var v = cell && cell.value !== null && !isNaN(cell.value) ? Number(cell.value) : 0;
            totalVal += v;
            seriesPoints.push({
              key: m.name,
              label: m.label_short || m.label || m.name,
              value: v,
              rendered: cell && cell.rendered ? cell.rendered : null
            });
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        }

        if (totalVal > maxTotalVal) maxTotalVal = totalVal;

        // Compute delta between first and last point
        var firstVal = seriesPoints.length > 0 ? seriesPoints[0].value : 0;
        var lastVal = seriesPoints.length > 0 ? seriesPoints[seriesPoints.length - 1].value : 0;
        var delta = lastVal - firstVal;
        var deltaPct = firstVal !== 0 ? delta / Math.abs(firstVal) : 0;

        rows.push({
          id: idx,
          name: String(catName),
          total: totalVal,
          avg: seriesPoints.length > 0 ? totalVal / seriesPoints.length : 0,
          series: seriesPoints,
          delta: delta,
          deltaPct: deltaPct,
          links: cellLinks
        });
      });

      // Controls Bar (Search + Summary)
      var controls = document.createElement("div");
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.alignItems = "center";
      controls.style.padding = "10px 16px";
      controls.style.borderBottom = "1px solid " + theme.border;
      controls.style.gap = "12px";

      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Search " + (dimField.label_short || dimField.label || "items") + "...";
      searchInput.style.padding = "6px 12px";
      searchInput.style.fontSize = "12px";
      searchInput.style.borderRadius = "6px";
      searchInput.style.border = "1px solid " + theme.border;
      searchInput.style.backgroundColor = themeKey === "midnight_cyber" ? "#1e293b" : "#ffffff";
      searchInput.style.color = theme.text;
      searchInput.style.outline = "none";
      searchInput.style.maxWidth = "240px";
      searchInput.style.display = config.showSearch !== false ? "block" : "none";

      var summaryStats = document.createElement("div");
      summaryStats.style.fontSize = "12px";
      summaryStats.style.fontWeight = "600";
      summaryStats.style.color = theme.subtext;
      summaryStats.textContent = rows.length + " Items &bull; Total: " + formatValue(d3.sum(rows, function (d) { return d.total; }), fmt);

      controls.appendChild(searchInput);
      controls.appendChild(summaryStats);
      container.appendChild(controls);

      // Table Wrapper
      var tableWrap = document.createElement("div");
      tableWrap.style.flex = "1 1 auto";
      tableWrap.style.overflowY = "auto";
      tableWrap.style.overflowX = "auto";
      container.appendChild(tableWrap);

      var table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12.5px";
      tableWrap.appendChild(table);

      // Render Head
      var thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.backgroundColor = theme.headerBg;
      thead.style.zIndex = "5";

      var trHead = document.createElement("tr");
      trHead.style.borderBottom = "2px solid " + theme.border;

      var thCols = [
        { label: dimField.label_short || dimField.label || "Category", align: "left", sortKey: "name" },
        { label: "Total " + (measField.label_short || "Metric"), align: "right", sortKey: "total" }
      ];

      if (config.showMicroBars !== false) {
        thCols.push({ label: "% Volume", align: "left", sortKey: "total" });
      }
      if (config.showSparklines !== false && (isPivoted || fields.measures.length > 1)) {
        thCols.push({ label: isPivoted ? "Trend Timeline" : "Measure Sparkline", align: "center", sortKey: null });
      }
      if (config.showVarianceBadge !== false && (isPivoted || fields.measures.length > 1)) {
        thCols.push({ label: "Growth / Delta", align: "center", sortKey: "deltaPct" });
      }

      var currentSortKey = "total";
      var currentSortAsc = false;

      thCols.forEach(function (col) {
        var th = document.createElement("th");
        th.style.padding = "10px 14px";
        th.style.textAlign = col.align;
        th.style.fontSize = "11.5px";
        th.style.fontWeight = "700";
        th.style.color = theme.headerText;
        th.style.textTransform = "uppercase";
        th.style.letterSpacing = "0.03em";
        th.style.cursor = col.sortKey ? "pointer" : "default";
        th.textContent = col.label;

        if (col.sortKey) {
          th.addEventListener("click", function () {
            if (currentSortKey === col.sortKey) {
              currentSortAsc = !currentSortAsc;
            } else {
              currentSortKey = col.sortKey;
              currentSortAsc = false;
            }
            renderBody();
          });
        }
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");
      table.appendChild(tbody);

      var tooltip = this._tooltip;

      function renderBody() {
        tbody.innerHTML = "";
        var filterTerm = searchInput.value.toLowerCase().trim();

        var displayRows = rows.filter(function (r) {
          if (!filterTerm) return true;
          return r.name.toLowerCase().includes(filterTerm);
        });

        // Sort
        if (currentSortKey) {
          displayRows.sort(function (a, b) {
            var vA = a[currentSortKey];
            var vB = b[currentSortKey];
            if (typeof vA === "string") {
              return currentSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
            }
            return currentSortAsc ? (vA - vB) : (vB - vA);
          });
        }

        displayRows.forEach(function (row) {
          var tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid " + theme.border;
          tr.style.height = (config.rowHeight || 48) + "px";
          tr.style.cursor = "pointer";
          tr.style.transition = "background-color 0.15s ease";

          tr.addEventListener("mouseenter", function () {
            tr.style.backgroundColor = theme.rowHover;
          });
          tr.addEventListener("mouseleave", function () {
            tr.style.backgroundColor = "transparent";
            if (tooltip) tooltip.style.display = "none";
          });

          // Click drilldown
          tr.addEventListener("click", function (event) {
            if (row.links && row.links.length > 0 && LookerCharts && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({
                links: row.links,
                event: event
              });
            }
          });

          // Col 1: Name
          var tdName = document.createElement("td");
          tdName.style.padding = "8px 14px";
          tdName.style.fontWeight = "600";
          tdName.textContent = row.name;
          tr.appendChild(tdName);

          // Col 2: Total
          var tdTotal = document.createElement("td");
          tdTotal.style.padding = "8px 14px";
          tdTotal.style.textAlign = "right";
          tdTotal.style.fontWeight = "700";
          tdTotal.textContent = formatValue(row.total, fmt);
          tr.appendChild(tdTotal);

          // Col 3: Micro Bar
          if (config.showMicroBars !== false) {
            var tdBar = document.createElement("td");
            tdBar.style.padding = "8px 14px";
            tdBar.style.width = "110px";

            var barPct = maxTotalVal > 0 ? (row.total / maxTotalVal) * 100 : 0;
            var barWrap = document.createElement("div");
            barWrap.style.width = "100%";
            barWrap.style.height = "7px";
            barWrap.style.backgroundColor = theme.barBg;
            barWrap.style.borderRadius = "4px";
            barWrap.style.overflow = "hidden";

            var barInner = document.createElement("div");
            barInner.style.width = barPct + "%";
            barInner.style.height = "100%";
            barInner.style.backgroundColor = theme.barFill;
            barInner.style.borderRadius = "4px";

            barWrap.appendChild(barInner);
            tdBar.appendChild(barWrap);
            tr.appendChild(tdBar);
          }

          // Col 4: Sparkline
          if (config.showSparklines !== false && (isPivoted || fields.measures.length > 1)) {
            var tdSpark = document.createElement("td");
            tdSpark.style.padding = "4px 14px";
            tdSpark.style.textAlign = "center";
            tdSpark.style.width = "130px";

            var sparkWidth = 110;
            var sparkHeight = 28;

            var svgSpark = d3.create("svg")
              .attr("width", sparkWidth)
              .attr("height", sparkHeight)
              .style("display", "inline-block")
              .style("overflow", "visible");

            var seriesVals = row.series.map(function (s) { return s.value; });
            var yMin = d3.min(seriesVals) || 0;
            var yMax = d3.max(seriesVals) || 1;
            if (yMin === yMax) { yMin -= 1; yMax += 1; }

            var xSc = d3.scaleLinear().domain([0, seriesVals.length - 1]).range([4, sparkWidth - 4]);
            var ySc = d3.scaleLinear().domain([yMin, yMax]).range([sparkHeight - 4, 4]);

            var lineGen = d3.line()
              .x(function (d, i) { return xSc(i); })
              .y(function (d) { return ySc(d); })
              .curve(d3.curveMonotoneX);

            var areaGen = d3.area()
              .x(function (d, i) { return xSc(i); })
              .y0(sparkHeight)
              .y1(function (d) { return ySc(d); })
              .curve(d3.curveMonotoneX);

            // Shaded area
            svgSpark.append("path")
              .datum(seriesVals)
              .attr("d", areaGen)
              .attr("fill", theme.sparklineArea);

            // Line
            svgSpark.append("path")
              .datum(seriesVals)
              .attr("d", lineGen)
              .attr("fill", "none")
              .attr("stroke", theme.sparkline)
              .attr("stroke-width", 1.8);

            // Min & Max Dots
            var maxIdx = seriesVals.indexOf(d3.max(seriesVals));
            var minIdx = seriesVals.indexOf(d3.min(seriesVals));
            var lastIdx = seriesVals.length - 1;

            // Current / Last Dot
            svgSpark.append("circle")
              .attr("cx", xSc(lastIdx))
              .attr("cy", ySc(seriesVals[lastIdx]))
              .attr("r", 2.5)
              .attr("fill", theme.sparkline);

            // Max Dot
            if (maxIdx !== lastIdx) {
              svgSpark.append("circle")
                .attr("cx", xSc(maxIdx))
                .attr("cy", ySc(seriesVals[maxIdx]))
                .attr("r", 2.5)
                .attr("fill", "#10b981");
            }

            tdSpark.appendChild(svgSpark.node());
            tr.appendChild(tdSpark);
          }

          // Col 5: Growth Badge
          if (config.showVarianceBadge !== false && (isPivoted || fields.measures.length > 1)) {
            var tdDelta = document.createElement("td");
            tdDelta.style.padding = "8px 14px";
            tdDelta.style.textAlign = "center";
            tdDelta.style.width = "90px";

            var isPos = row.delta >= 0;
            var pctStr = (isPos ? "+" : "") + (row.deltaPct * 100).toFixed(1) + "%";

            var pill = document.createElement("span");
            pill.style.display = "inline-block";
            pill.style.padding = "2px 8px";
            pill.style.borderRadius = "10px";
            pill.style.fontSize = "11px";
            pill.style.fontWeight = "600";
            pill.style.backgroundColor = isPos ? theme.badgePosBg : theme.badgeNegBg;
            pill.style.color = isPos ? theme.badgePosText : theme.badgeNegText;
            pill.textContent = pctStr;

            tdDelta.appendChild(pill);
            tr.appendChild(tdDelta);
          }

          tbody.appendChild(tr);
        });
      }

      searchInput.addEventListener("input", renderBody);
      renderBody();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
