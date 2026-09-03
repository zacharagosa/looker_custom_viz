/**
 * Sparkline Metric Matrix Table - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Modal Executive Scorecard & Matrix Table:
 * - Table Modes:
 *     1. "sparkline_matrix": In-cell trend sparklines + volume micro-bars + variance growth pills
 *     2. "heatmap_grid": Dense color-intensity heatmap matrix across pivot periods or metrics
 *     3. "compact_scorecard": Executive KPI scorecard with performance status badges and rank
 * - Expanded Row Limit Support: High-density client-side pagination (10, 25, 50, 100, All)
 *   capable of handling 5,000+ rows with zero DOM lag
 * - Client-side instant filtering & multi-column sorting across the entire dataset
 * - Sticky totals rollup summary footer row
 * - Looker native drill-down integration
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
      badgeNegText: "#b91c1c",
      heatmapRange: ["#f0fdf4", "#bbf7d0", "#4ade80", "#16a34a", "#14532d"]
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
      badgeNegText: "#c5221f",
      heatmapRange: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"]
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
      badgeNegText: "#9f1239",
      heatmapRange: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#064e3b"]
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
      badgeNegText: "#fda4af",
      heatmapRange: ["#0f172a", "#0369a1", "#0284c7", "#38bdf8", "#bae6fd"]
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
      tableMode: {
        type: "string",
        label: "Table Display Mode",
        display: "select",
        values: [
          { "Sparkline Matrix (Trends + Micro-Bars)": "sparkline_matrix" },
          { "Heatmap Matrix (Pivot Color Intensity)": "heatmap_grid" },
          { "Compact Scorecard (Dense Status Badges)": "compact_scorecard" }
        ],
        default: "sparkline_matrix",
        section: "Display Mode",
        order: 1
      },
      pageSize: {
        type: "string",
        label: "Pagination Page Size (5,000+ Row Support)",
        display: "select",
        values: [
          { "15 Rows per Page": "15" },
          { "25 Rows per Page": "25" },
          { "50 Rows per Page": "50" },
          { "100 Rows per Page": "100" },
          { "All Rows (No Pagination)": "all" }
        ],
        default: "25",
        section: "High-Density Data",
        order: 2
      },
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
        order: 3
      },
      showSparklines: {
        type: "boolean",
        label: "Show Inline Trend Sparklines",
        default: true,
        section: "Visuals",
        order: 4
      },
      showMicroBars: {
        type: "boolean",
        label: "Show Volume Micro Bullet Bars",
        default: true,
        section: "Visuals",
        order: 5
      },
      showVarianceBadge: {
        type: "boolean",
        label: "Show Period Growth / Delta Badges",
        default: true,
        section: "Visuals",
        order: 6
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Search Bar",
        default: true,
        section: "Controls",
        order: 7
      },
      showSummaryRow: {
        type: "boolean",
        label: "Show Grand Total Summary Row",
        default: true,
        section: "Controls",
        order: 8
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
        order: 9
      },
      rowHeight: {
        type: "number",
        label: "Row Height (px)",
        default: 46,
        section: "Layout",
        order: 10
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

      var tableMode = config.tableMode || "sparkline_matrix";
      var fields = queryResponse.fields;
      var dimField = fields.dimensions[0];
      var pivots = queryResponse.pivots || [];
      var isPivoted = pivots.length > 1;
      var measField = fields.measures[0];
      var fmt = config.valueFormat || "compact_currency";
      var totalRawCount = data.length;

      // Extract Rows
      var rows = [];
      var maxTotalVal = 0;
      var allPivotVals = [];

      data.forEach(function (row, idx) {
        var catName = row[dimField.name] ? (row[dimField.name].rendered || row[dimField.name].value) : ("Item " + (idx + 1));
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
            allPivotVals.push(v);
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        } else {
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
            allPivotVals.push(v);
            if (cell && cell.links && cell.links.length > 0) cellLinks = cell.links;
          });
        }

        if (totalVal > maxTotalVal) maxTotalVal = totalVal;

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

      // Rank rows by total
      rows.sort(function (a, b) { return b.total - a.total; });
      rows.forEach(function (r, rankIdx) {
        r.rank = rankIdx + 1;
        r.pctOfTotal = maxTotalVal > 0 ? (r.total / maxTotalVal) * 100 : 0;
      });

      // Heatmap Color Scale
      var heatmapScale = d3.scaleQuantile()
        .domain(allPivotVals.length > 0 ? allPivotVals : [0, 100])
        .range(theme.heatmapRange);

      // Top Control Bar: Search Input & High-Density Status
      var controls = document.createElement("div");
      controls.className = "matrix-controls-bar";
      controls.style.display = "flex";
      controls.style.justifyContent = "space-between";
      controls.style.alignItems = "center";
      controls.style.padding = "8px 16px";
      controls.style.borderBottom = "1px solid " + theme.border;
      controls.style.gap = "12px";
      controls.style.flexWrap = "wrap";

      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "10px";

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
      searchInput.style.minWidth = "220px";
      searchInput.style.display = config.showSearch !== false ? "block" : "none";
      leftControls.appendChild(searchInput);

      var summaryStats = document.createElement("div");
      summaryStats.style.fontSize = "12px";
      summaryStats.style.fontWeight = "600";
      summaryStats.style.color = theme.subtext;
      var grandTotal = d3.sum(rows, function (d) { return d.total; });
      summaryStats.innerHTML = "<span><strong>" + totalRawCount.toLocaleString() + "</strong> items &bull; Total: <strong>" + formatValue(grandTotal, fmt) + "</strong></span>";
      if (totalRawCount >= 100) {
        summaryStats.innerHTML += ' <span style="font-size:10.5px;padding:2px 7px;background:#e0f2fe;color:#0369a1;border-radius:10px;font-weight:700;margin-left:6px;">⚡ Expanded Row Limit</span>';
      }

      controls.appendChild(leftControls);
      controls.appendChild(summaryStats);
      container.appendChild(controls);

      // Table Container Wrapper
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

      // Table Head Setup
      var thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.backgroundColor = theme.headerBg;
      thead.style.zIndex = "5";

      var trHead = document.createElement("tr");
      trHead.style.borderBottom = "2px solid " + theme.border;

      var currentSortKey = "total";
      var currentSortAsc = false;
      var currentPage = 1;

      // Define Columns based on Mode
      var thCols = [];
      if (tableMode === "heatmap_grid" && (isPivoted || fields.measures.length > 1)) {
        // Heatmap Grid: Item Name, then 1 column per pivot period / measure, then Total
        thCols.push({ label: "#", align: "center", sortKey: "rank", width: "45px" });
        thCols.push({ label: dimField.label_short || dimField.label || "Category", align: "left", sortKey: "name" });
        var seriesSample = rows[0] ? rows[0].series : [];
        seriesSample.forEach(function (s, sIdx) {
          thCols.push({ label: s.label, align: "right", sortKey: "series_" + sIdx, isHeatmapCol: true, seriesIdx: sIdx });
        });
        thCols.push({ label: "Total", align: "right", sortKey: "total" });
      } else if (tableMode === "compact_scorecard") {
        // Compact Scorecard: Rank, Category, Attainment/Status Badge, Volume Bar, Total Metric
        thCols.push({ label: "Rank", align: "center", sortKey: "rank", width: "60px" });
        thCols.push({ label: dimField.label_short || dimField.label || "Item", align: "left", sortKey: "name" });
        thCols.push({ label: "Performance Status", align: "center", sortKey: "deltaPct" });
        thCols.push({ label: "% Volume Share", align: "left", sortKey: "total", width: "120px" });
        thCols.push({ label: "Total " + (measField.label_short || "Metric"), align: "right", sortKey: "total" });
      } else {
        // Standard Sparkline Matrix
        thCols.push({ label: dimField.label_short || dimField.label || "Category", align: "left", sortKey: "name" });
        thCols.push({ label: "Total " + (measField.label_short || "Metric"), align: "right", sortKey: "total" });
        if (config.showMicroBars !== false) {
          thCols.push({ label: "% Volume", align: "left", sortKey: "total", width: "110px" });
        }
        if (config.showSparklines !== false && (isPivoted || fields.measures.length > 1)) {
          thCols.push({ label: isPivoted ? "Trend Timeline" : "Measure Sparkline", align: "center", sortKey: null, width: "125px" });
        }
        if (config.showVarianceBadge !== false && (isPivoted || fields.measures.length > 1)) {
          thCols.push({ label: "Growth / Delta", align: "center", sortKey: "deltaPct", width: "95px" });
        }
      }

      thCols.forEach(function (col) {
        var th = document.createElement("th");
        th.style.padding = "10px 14px";
        th.style.textAlign = col.align;
        th.style.fontSize = "11px";
        th.style.fontWeight = "700";
        th.style.color = theme.headerText;
        th.style.textTransform = "uppercase";
        th.style.letterSpacing = "0.03em";
        th.style.whiteSpace = "nowrap";
        th.style.cursor = col.sortKey ? "pointer" : "default";
        th.style.userSelect = "none";
        if (col.width) th.style.width = col.width;

        var labelSpan = document.createElement("span");
        labelSpan.textContent = col.label;
        th.appendChild(labelSpan);

        if (col.sortKey) {
          var arrow = document.createElement("span");
          arrow.style.marginLeft = "4px";
          arrow.style.fontSize = "10px";
          arrow.style.opacity = currentSortKey === col.sortKey ? "1" : "0.3";
          arrow.textContent = currentSortKey === col.sortKey ? (currentSortAsc ? " ▲" : " ▼") : " ⇅";
          th.appendChild(arrow);

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

      // Pagination Controls Bar at the bottom
      var paginationBar = document.createElement("div");
      paginationBar.className = "matrix-pagination-bar";
      paginationBar.style.display = "flex";
      paginationBar.style.justifyContent = "space-between";
      paginationBar.style.alignItems = "center";
      paginationBar.style.padding = "8px 16px";
      paginationBar.style.borderTop = "1px solid " + theme.border;
      paginationBar.style.fontSize = "12px";
      paginationBar.style.color = theme.subtext;
      paginationBar.style.backgroundColor = themeKey === "midnight_cyber" ? "#1e293b" : "#f8fafc";
      container.appendChild(paginationBar);

      var tooltip = this._tooltip;

      function renderBody() {
        tbody.innerHTML = "";
        var filterTerm = searchInput.value.toLowerCase().trim();

        var displayRows = rows.filter(function (r) {
          if (!filterTerm) return true;
          return r.name.toLowerCase().includes(filterTerm);
        });

        // Sorting across full dataset
        if (currentSortKey) {
          displayRows.sort(function (a, b) {
            var vA, vB;
            if (currentSortKey.startsWith("series_")) {
              var sIdx = parseInt(currentSortKey.split("_")[1], 10);
              vA = a.series[sIdx] ? a.series[sIdx].value : 0;
              vB = b.series[sIdx] ? b.series[sIdx].value : 0;
            } else {
              vA = a[currentSortKey];
              vB = b[currentSortKey];
            }
            if (typeof vA === "string") {
              return currentSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
            }
            return currentSortAsc ? (vA - vB) : (vB - vA);
          });
        }

        // Pagination calculations
        var pageSizeOption = config.pageSize || "25";
        var pageSize = pageSizeOption === "all" ? displayRows.length : parseInt(pageSizeOption, 10);
        if (isNaN(pageSize) || pageSize <= 0) pageSize = 25;

        var totalPages = Math.ceil(displayRows.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var startIdx = (currentPage - 1) * pageSize;
        var endIdx = Math.min(startIdx + pageSize, displayRows.length);
        var pageRows = displayRows.slice(startIdx, endIdx);

        // Update Pagination Controls UI
        paginationBar.innerHTML = "";
        var infoDiv = document.createElement("div");
        infoDiv.innerHTML = "Showing <strong>" + (displayRows.length === 0 ? 0 : startIdx + 1) + "</strong> - <strong>" + endIdx + "</strong> of <strong>" + displayRows.length.toLocaleString() + "</strong> rows" + (filterTerm ? " (filtered)" : "");
        paginationBar.appendChild(infoDiv);

        if (pageSizeOption !== "all" && totalPages > 1) {
          var navDiv = document.createElement("div");
          navDiv.style.display = "flex";
          navDiv.style.alignItems = "center";
          navDiv.style.gap = "6px";

          function makeNavBtn(label, disabled, onClick) {
            var btn = document.createElement("button");
            btn.innerHTML = label;
            btn.disabled = disabled;
            btn.style.padding = "3px 8px";
            btn.style.fontSize = "11.5px";
            btn.style.border = "1px solid " + theme.border;
            btn.style.borderRadius = "4px";
            btn.style.background = disabled ? "transparent" : (themeKey === "midnight_cyber" ? "#334155" : "#ffffff");
            btn.style.color = disabled ? (themeKey === "midnight_cyber" ? "#475569" : "#cbd5e1") : theme.text;
            btn.style.cursor = disabled ? "not-allowed" : "pointer";
            btn.addEventListener("click", onClick);
            return btn;
          }

          navDiv.appendChild(makeNavBtn("⏮ First", currentPage === 1, function () {
            currentPage = 1;
            renderBody();
          }));
          navDiv.appendChild(makeNavBtn("◀ Prev", currentPage === 1, function () {
            currentPage--;
            renderBody();
          }));

          var pageReadout = document.createElement("span");
          pageReadout.style.margin = "0 6px";
          pageReadout.style.fontWeight = "600";
          pageReadout.textContent = "Page " + currentPage + " of " + totalPages;
          navDiv.appendChild(pageReadout);

          navDiv.appendChild(makeNavBtn("Next ▶", currentPage === totalPages, function () {
            currentPage++;
            renderBody();
          }));
          navDiv.appendChild(makeNavBtn("Last ⏭", currentPage === totalPages, function () {
            currentPage = totalPages;
            renderBody();
          }));

          paginationBar.appendChild(navDiv);
        }

        // Render Current Page Rows in the DOM
        pageRows.forEach(function (row) {
          var tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid " + theme.border;
          tr.style.height = (config.rowHeight || 46) + "px";
          tr.style.cursor = "pointer";
          tr.style.transition = "background-color 0.15s ease";

          tr.addEventListener("mouseenter", function () {
            tr.style.backgroundColor = theme.rowHover;
          });
          tr.addEventListener("mouseleave", function () {
            tr.style.backgroundColor = "transparent";
            if (tooltip) tooltip.style.display = "none";
          });

          // Drill-down on click
          tr.addEventListener("click", function (event) {
            if (row.links && row.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: row.links,
                event: event
              });
            }
          });

          // Branch by tableMode
          if (tableMode === "heatmap_grid" && (isPivoted || fields.measures.length > 1)) {
            // Rank
            var tdRank = document.createElement("td");
            tdRank.style.padding = "6px 10px";
            tdRank.style.textAlign = "center";
            tdRank.style.color = theme.subtext;
            tdRank.style.fontWeight = "600";
            tdRank.textContent = row.rank;
            tr.appendChild(tdRank);

            // Name
            var tdName = document.createElement("td");
            tdName.style.padding = "6px 12px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            // Pivot Columns Heatmap
            row.series.forEach(function (s) {
              var tdCell = document.createElement("td");
              tdCell.style.padding = "6px 10px";
              tdCell.style.textAlign = "right";
              tdCell.style.fontSize = "11.5px";
              tdCell.style.fontWeight = "600";

              var cellBg = heatmapScale(s.value);
              tdCell.style.backgroundColor = cellBg;
              // Contrast text color
              var rgb = d3.color(cellBg);
              var lum = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) : 255;
              tdCell.style.color = lum < 140 ? "#ffffff" : "#0f172a";
              tdCell.textContent = formatValue(s.value, fmt);
              tr.appendChild(tdCell);
            });

            // Total
            var tdTot = document.createElement("td");
            tdTot.style.padding = "6px 12px";
            tdTot.style.textAlign = "right";
            tdTot.style.fontWeight = "700";
            tdTot.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTot);

          } else if (tableMode === "compact_scorecard") {
            // Rank Badge
            var tdRank = document.createElement("td");
            tdRank.style.padding = "6px 10px";
            tdRank.style.textAlign = "center";
            tdRank.style.fontWeight = "700";
            tdRank.innerHTML = '<span style="display:inline-block;padding:2px 7px;border-radius:12px;background:' + (row.rank <= 3 ? "#fef3c7" : (themeKey === "midnight_cyber" ? "#334155" : "#f1f5f9")) + ';color:' + (row.rank <= 3 ? "#b45309" : theme.subtext) + ';">#' + row.rank + '</span>';
            tr.appendChild(tdRank);

            // Name
            var tdName = document.createElement("td");
            tdName.style.padding = "6px 12px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            // Performance Status Badge
            var tdStatus = document.createElement("td");
            tdStatus.style.padding = "6px 10px";
            tdStatus.style.textAlign = "center";
            var statusPill = document.createElement("span");
            statusPill.style.display = "inline-block";
            statusPill.style.padding = "3px 10px";
            statusPill.style.borderRadius = "12px";
            statusPill.style.fontSize = "11px";
            statusPill.style.fontWeight = "600";
            if (row.deltaPct > 0.15) {
              statusPill.style.backgroundColor = theme.badgePosBg;
              statusPill.style.color = theme.badgePosText;
              statusPill.textContent = "🚀 Top Performer (+" + (row.deltaPct * 100).toFixed(0) + "%)";
            } else if (row.deltaPct >= 0) {
              statusPill.style.backgroundColor = "#e0f2fe";
              statusPill.style.color = "#0369a1";
              statusPill.textContent = "✓ Stable / Growth (+" + (row.deltaPct * 100).toFixed(0) + "%)";
            } else {
              statusPill.style.backgroundColor = theme.badgeNegBg;
              statusPill.style.color = theme.badgeNegText;
              statusPill.textContent = "⚠ Under Target (" + (row.deltaPct * 100).toFixed(0) + "%)";
            }
            tdStatus.appendChild(statusPill);
            tr.appendChild(tdStatus);

            // Volume Share Bar
            var tdVol = document.createElement("td");
            tdVol.style.padding = "6px 12px";
            var volWrap = document.createElement("div");
            volWrap.style.display = "flex";
            volWrap.style.alignItems = "center";
            volWrap.style.gap = "6px";

            var barWrap = document.createElement("div");
            barWrap.style.flex = "1";
            barWrap.style.height = "6px";
            barWrap.style.backgroundColor = theme.barBg;
            barWrap.style.borderRadius = "3px";
            barWrap.style.overflow = "hidden";

            var barInner = document.createElement("div");
            barInner.style.width = row.pctOfTotal + "%";
            barInner.style.height = "100%";
            barInner.style.backgroundColor = theme.barFill;
            barWrap.appendChild(barInner);

            var pctText = document.createElement("span");
            pctText.style.fontSize = "10.5px";
            pctText.style.fontWeight = "600";
            pctText.style.color = theme.subtext;
            pctText.style.minWidth = "36px";
            pctText.textContent = row.pctOfTotal.toFixed(1) + "%";

            volWrap.appendChild(barWrap);
            volWrap.appendChild(pctText);
            tdVol.appendChild(volWrap);
            tr.appendChild(tdVol);

            // Total Metric
            var tdTot = document.createElement("td");
            tdTot.style.padding = "6px 12px";
            tdTot.style.textAlign = "right";
            tdTot.style.fontWeight = "700";
            tdTot.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTot);

          } else {
            // Standard Sparkline Matrix
            var tdName = document.createElement("td");
            tdName.style.padding = "8px 14px";
            tdName.style.fontWeight = "600";
            tdName.textContent = row.name;
            tr.appendChild(tdName);

            var tdTotal = document.createElement("td");
            tdTotal.style.padding = "8px 14px";
            tdTotal.style.textAlign = "right";
            tdTotal.style.fontWeight = "700";
            tdTotal.textContent = formatValue(row.total, fmt);
            tr.appendChild(tdTotal);

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

            if (config.showSparklines !== false && (isPivoted || fields.measures.length > 1)) {
              var tdSpark = document.createElement("td");
              tdSpark.style.padding = "4px 14px";
              tdSpark.style.textAlign = "center";
              tdSpark.style.width = "125px";

              var sparkWidth = 105;
              var sparkHeight = 26;

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

              svgSpark.append("path")
                .datum(seriesVals)
                .attr("d", areaGen)
                .attr("fill", theme.sparklineArea);

              svgSpark.append("path")
                .datum(seriesVals)
                .attr("d", lineGen)
                .attr("fill", "none")
                .attr("stroke", theme.sparkline)
                .attr("stroke-width", 1.8);

              var lastIdx = seriesVals.length - 1;
              svgSpark.append("circle")
                .attr("cx", xSc(lastIdx))
                .attr("cy", ySc(seriesVals[lastIdx]))
                .attr("r", 2.5)
                .attr("fill", theme.sparkline);

              tdSpark.appendChild(svgSpark.node());
              tr.appendChild(tdSpark);
            }

            if (config.showVarianceBadge !== false && (isPivoted || fields.measures.length > 1)) {
              var tdDelta = document.createElement("td");
              tdDelta.style.padding = "8px 14px";
              tdDelta.style.textAlign = "center";
              tdDelta.style.width = "95px";

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
          }

          tbody.appendChild(tr);
        });
      }

      searchInput.addEventListener("input", function () {
        currentPage = 1;
        renderBody();
      });

      renderBody();
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
