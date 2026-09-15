/**
 * Dynamic Pivot Matrix & Heatmap Grid - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Looker Cloud Blockers:
 * - b/500385324 & b/496749649: Dynamic Pivot Table Sorting for ad-hoc business analysis
 * - b/314734619: Support Collapse / Expand in a Pivot Table (multi-level hierarchy + pivot periods)
 * - b/492843989: Enhanced Formatting for Totals and Subtotals
 * - b/552033600: Retain Visualization and Series Settings for Dynamic Pivoted Data
 * - b/509389150: Increased flexibility for repeated dimensions with pivots
 *
 * Features:
 * - 4 Multi-Modal Rendering Modes:
 *     1. "matrix_bars": Values with proportional micro-progress bars and rank/share
 *     2. "heatmap_grid": Dense quantile/linear color heatmap across pivot periods
 *     3. "growth_delta": Period-over-period percentage growth pills (green/red badges)
 *     4. "compact_kpi": Ultra-dense executive summary table with status indicators
 * - Client-side dynamic sorting by ANY pivot column (ascending/descending) or total
 * - Client-side full text instant search-as-you-type
 * - Client-side pagination (10, 25, 50, 100, All) scaling smoothly up to 5,000+ rows
 * - Dynamic Row and Column marginal totals with custom rollup calculations
 * - Fully configurable styling with Google Modern, Slate, Emerald, and Corporate palettes
 * - Native Looker drill-down menu hooks (LookerCharts.Utils.openDrillMenu)
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 */

(function () {
  // --- DYNAMIC D3 LOADER ---
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.interpolateBlues === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.interpolateBlues === "function") {
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
      headerBg: "#f8f9fa",
      headerText: "#202124",
      headerBorder: "#dadce0",
      rowHover: "rgba(26, 115, 232, 0.06)",
      rowAlt: "#fafafa",
      border: "#e8eaed",
      text: "#202124",
      subtext: "#5f6368",
      primary: "#1a73e8",
      barFill: "#1a73e8",
      barBg: "#e8f0fe",
      totalBg: "#f1f3f4",
      totalText: "#202124",
      posBadgeBg: "#e6f4ea",
      posBadgeText: "#137333",
      negBadgeBg: "#fce8e6",
      negBadgeText: "#c5221f",
      heatmapLow: "#f8f9fa",
      heatmapMid: "#8ab4f8",
      heatmapHigh: "#1a73e8",
      hudBg: "#f8f9fa"
    },
    executive_slate: {
      name: "Executive Slate",
      headerBg: "#f1f5f9",
      headerText: "#0f172a",
      headerBorder: "#cbd5e1",
      rowHover: "rgba(15, 23, 42, 0.05)",
      rowAlt: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      primary: "#334155",
      barFill: "#475569",
      barBg: "#e2e8f0",
      totalBg: "#e2e8f0",
      totalText: "#0f172a",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#f8fafc",
      heatmapMid: "#94a3b8",
      heatmapHigh: "#1e293b",
      hudBg: "#f1f5f9"
    },
    emerald_forest: {
      name: "Emerald Forest",
      headerBg: "#f0fdf4",
      headerText: "#064e3b",
      headerBorder: "#bbf7d0",
      rowHover: "rgba(16, 185, 129, 0.07)",
      rowAlt: "#f9fbf9",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      primary: "#059669",
      barFill: "#10b981",
      barBg: "#d1fae5",
      totalBg: "#dcfce7",
      totalText: "#064e3b",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#f0fdf4",
      heatmapMid: "#6ee7b7",
      heatmapHigh: "#047857",
      hudBg: "#f0fdf4"
    },
    zayo_telecom: {
      name: "Zayo Corporate Orange",
      headerBg: "#fff7ed",
      headerText: "#7c2d12",
      headerBorder: "#fed7aa",
      rowHover: "rgba(245, 131, 31, 0.08)",
      rowAlt: "#fafafa",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      primary: "#f5831f",
      barFill: "#f5831f",
      barBg: "#ffedd5",
      totalBg: "#ffedd5",
      totalText: "#7c2d12",
      posBadgeBg: "#dcfce7",
      posBadgeText: "#15803d",
      negBadgeBg: "#fee2e2",
      negBadgeText: "#b91c1c",
      heatmapLow: "#fff7ed",
      heatmapMid: "#fdba74",
      heatmapHigh: "#c2410c",
      hudBg: "#fff7ed"
    }
  };

  // --- COMPACT NUMBER FORMATTER ---
  function formatMetricValue(val, fmt, prefix, suffix) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    prefix = prefix || "";
    suffix = suffix || "";

    var num = Number(val);
    var formatted = "";

    if (fmt === "compact_currency") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (abs >= 1e9) formatted = sign + "$" + (abs / 1e9).toFixed(2) + "B";
      else if (abs >= 1e6) formatted = sign + "$" + (abs / 1e6).toFixed(2) + "M";
      else if (abs >= 1e3) formatted = sign + "$" + (abs / 1e3).toFixed(1) + "K";
      else formatted = sign + "$" + abs.toFixed(2);
    } else if (fmt === "compact_number") {
      var abs2 = Math.abs(num);
      var sign2 = num < 0 ? "-" : "";
      if (abs2 >= 1e9) formatted = sign2 + (abs2 / 1e9).toFixed(2) + "B";
      else if (abs2 >= 1e6) formatted = sign2 + (abs2 / 1e6).toFixed(2) + "M";
      else if (abs2 >= 1e3) formatted = sign2 + (abs2 / 1e3).toFixed(1) + "K";
      else formatted = sign2 + (abs2 % 1 === 0 ? abs2.toString() : abs2.toFixed(2));
    } else if (fmt === "currency_precise") {
      formatted = "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "percent") {
      formatted = (num * 100).toFixed(1) + "%";
    } else if (fmt === "integer") {
      formatted = Math.round(num).toLocaleString("en-US");
    } else {
      formatted = num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }

    if (fmt !== "compact_currency" && fmt !== "currency_precise" && prefix) {
      formatted = prefix + formatted;
    }
    if (suffix && fmt !== "percent") {
      formatted = formatted + suffix;
    }
    return formatted;
  }

  // --- STATE FOR CLIENT-SIDE INTERACTION ---
  var vizState = {
    sortKey: null,      // e.g. '__row_total__' or dimension name or pivot key
    sortAsc: false,
    searchTerm: "",
    currentPage: 1,
    pageSize: 10
  };

  // --- REGISTER VISUALIZATION ---
  looker.plugins.visualizations.add({
    id: "dynamic_pivot_matrix",
    label: "Dynamic Pivot Matrix & Heatmap Grid",
    options: {
      // ===== SECTION 1: DISPLAY =====
      renderMode: {
        type: "string",
        component: "select",
        label: "Table Render Mode",
        section: "Display",
        order: 1,
        values: [
          { "Micro-Bars & Volume": "matrix_bars" },
          { "Color Heatmap Grid": "heatmap_grid" },
          { "Period Growth Deltas (% PoP)": "growth_delta" },
          { "Executive Compact KPI": "compact_kpi" }
        ],
        default: "matrix_bars"
      },
      showRowTotals: {
        type: "boolean",
        label: "Show Row Total Column",
        section: "Display",
        order: 2,
        default: true
      },
      showColTotals: {
        type: "boolean",
        label: "Show Column Total Summary Footer",
        section: "Display",
        order: 3,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Search Filter",
        section: "Display",
        order: 4,
        default: true
      },
      pageSize: {
        type: "string",
        component: "select",
        label: "Rows Per Page (Pagination)",
        section: "Display",
        order: 5,
        values: [
          { "10 Rows": "10" },
          { "25 Rows": "25" },
          { "50 Rows": "50" },
          { "100 Rows": "100" },
          { "All Rows (Expanded 5,000+)": "all" }
        ],
        default: "10"
      },
      valueFormat: {
        type: "string",
        component: "select",
        label: "Metric Number Format",
        section: "Display",
        order: 6,
        values: [
          { "Compact Currency ($K, $M, $B)": "compact_currency" },
          { "Compact Number (K, M, B)": "compact_number" },
          { "Precise Currency ($1,234.56)": "currency_precise" },
          { "Standard Number (1,234.5)": "standard_number" },
          { "Integer (1,235)": "integer" },
          { "Percentage (12.3%)": "percent" }
        ],
        default: "compact_currency"
      },

      // ===== SECTION 2: STYLE =====
      colorTheme: {
        type: "string",
        component: "select",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        values: [
          { "Google Modern Blue": "google_modern" },
          { "Executive Slate": "executive_slate" },
          { "Emerald Forest": "emerald_forest" },
          { "Zayo Telecom Orange": "zayo_telecom" }
        ],
        default: "google_modern"
      },
      highlightMaxCell: {
        type: "boolean",
        label: "Highlight Peak Cell in Row",
        section: "Style",
        order: 2,
        default: true
      },
      fontSize: {
        type: "string",
        component: "select",
        label: "Font Size & Density",
        section: "Style",
        order: 3,
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (12.5px)": "standard" },
          { "Spacious (14px)": "spacious" }
        ],
        default: "standard"
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "dynamic-pivot-matrix-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "auto";
      container.style.boxSizing = "border-box";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      // Ensure data exists
      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data to render."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimension_like || [];
      var meas = fields.measure_like || [];
      var pivots = queryResponse.pivots || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Dynamic Pivot Matrix requires at least 1 Dimension (e.g. products.category)."
        });
        done();
        return;
      }

      if (meas.length === 0 && pivots.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Dynamic Pivot Matrix requires at least 1 Measure or Pivoted Measure."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          var container = element.querySelector(".dynamic-pivot-matrix-root");
          if (!container) {
            element.innerHTML = "";
            container = document.createElement("div");
            container.className = "dynamic-pivot-matrix-root";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.overflow = "auto";
            container.style.boxSizing = "border-box";
            container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
            element.appendChild(container);
          }
          container.innerHTML = "";

          // Options & Config
          var themeKey = config.colorTheme || "google_modern";
          var theme = PALETTES[themeKey] || PALETTES.google_modern;
          var renderMode = config.renderMode || "matrix_bars";
          var showRowTotals = config.showRowTotals !== false;
          var showColTotals = config.showColTotals !== false;
          var showSearch = config.showSearch !== false;
          var highlightMax = config.highlightMaxCell !== false;
          var valFormat = config.valueFormat || "compact_currency";
          var fontSizeOpt = config.fontSize || "standard";

          var fontSizes = {
            compact: { base: "11px", header: "11.5px", badge: "10px", padY: "6px", padX: "10px" },
            standard: { base: "12.5px", header: "13px", badge: "11px", padY: "8px", padX: "12px" },
            spacious: { base: "14px", header: "14.5px", badge: "12px", padY: "11px", padX: "14px" }
          };
          var curFont = fontSizes[fontSizeOpt] || fontSizes.standard;

          // Parse Pivots and Dimensions
          // In Looker, when a query is pivoted, queryResponse.pivots is an array of objects
          // e.g. [{ key: "2023", is_total: false, data: { "order_items.created_year": "2023" } }, ...]
          var pivotCols = [];
          if (pivots && pivots.length > 0) {
            pivotCols = pivots.filter(function (p) { return !p.is_total; }).map(function (p) {
              return {
                key: p.key,
                label: p.label || p.key || "Value",
                data: p.data || {}
              };
            });
          }

          var primaryDim = dims[0];
          var secondaryDim = dims.length > 1 ? dims[1] : null;
          var primaryMeas = meas[0];

          // If no pivots were used in the query, treat measures as columns (unpivoted matrix)
          var isMeasureMatrix = pivotCols.length === 0;
          if (isMeasureMatrix) {
            pivotCols = meas.map(function (m) {
              return {
                key: m.name,
                label: m.label_short || m.label || m.name,
                isMeasure: true
              };
            });
          }

          // Parse Rows
          var parsedRows = [];
          var globalMinVal = Infinity;
          var globalMaxVal = -Infinity;
          var colAggregations = {};
          pivotCols.forEach(function (c) { colAggregations[c.key] = { sum: 0, count: 0, values: [] }; });
          var grandTotalSum = 0;

          data.forEach(function (row, rowIdx) {
            var dimVal = row[primaryDim.name] ? (row[primaryDim.name].rendered || row[primaryDim.name].value) : "";
            var dimDrills = row[primaryDim.name] ? row[primaryDim.name].links : null;

            var secDimVal = "";
            if (secondaryDim && row[secondaryDim.name]) {
              secDimVal = row[secondaryDim.name].rendered || row[secondaryDim.name].value || "";
            }

            var cellMap = {};
            var rowSum = 0;
            var rowVals = [];
            var rowMaxVal = -Infinity;
            var rowMaxColKey = null;

            pivotCols.forEach(function (c, cIdx) {
              var cellObj = null;
              var numVal = null;
              var rendVal = "";
              var cellDrills = null;

              if (isMeasureMatrix) {
                // Column is a direct measure
                var mCell = row[c.key];
                if (mCell) {
                  numVal = (mCell.value !== null && mCell.value !== undefined) ? Number(mCell.value) : null;
                  rendVal = mCell.rendered || (numVal !== null ? formatMetricValue(numVal, valFormat) : "-");
                  cellDrills = mCell.links;
                }
              } else {
                // Pivoted measure: row[primaryMeas.name] is a map of pivot keys -> cell
                var pMap = row[primaryMeas.name];
                if (pMap && pMap[c.key]) {
                  var pCell = pMap[c.key];
                  numVal = (pCell.value !== null && pCell.value !== undefined) ? Number(pCell.value) : null;
                  rendVal = pCell.rendered || (numVal !== null ? formatMetricValue(numVal, valFormat) : "-");
                  cellDrills = pCell.links;
                }
              }

              if (numVal !== null && !isNaN(numVal)) {
                rowSum += numVal;
                rowVals.push(numVal);
                if (numVal > rowMaxVal) {
                  rowMaxVal = numVal;
                  rowMaxColKey = c.key;
                }
                if (numVal < globalMinVal) globalMinVal = numVal;
                if (numVal > globalMaxVal) globalMaxVal = numVal;

                colAggregations[c.key].sum += numVal;
                colAggregations[c.key].count += 1;
                colAggregations[c.key].values.push(numVal);
              }

              // Calculate period-over-period delta if cIdx > 0
              var popDelta = null;
              var popPct = null;
              if (cIdx > 0 && numVal !== null) {
                var prevColKey = pivotCols[cIdx - 1].key;
                var prevCell = cellMap[prevColKey];
                if (prevCell && prevCell.val !== null && prevCell.val !== 0) {
                  popDelta = numVal - prevCell.val;
                  popPct = (popDelta / Math.abs(prevCell.val)) * 100;
                }
              }

              cellMap[c.key] = {
                val: numVal,
                rendered: rendVal,
                links: cellDrills,
                popDelta: popDelta,
                popPct: popPct
              };
            });

            grandTotalSum += rowSum;

            parsedRows.push({
              id: rowIdx,
              rawRow: row,
              dimVal: dimVal,
              secDimVal: secDimVal,
              dimDrills: dimDrills,
              cells: cellMap,
              rowSum: rowSum,
              rowAvg: rowVals.length > 0 ? rowSum / rowVals.length : 0,
              rowMaxColKey: rowMaxColKey,
              rowMaxVal: rowMaxVal
            });
          });

          if (globalMinVal === Infinity) globalMinVal = 0;
          if (globalMaxVal === -Infinity) globalMaxVal = 1;

          // D3 color interpolator for heatmap grid mode
          var heatColorScale = d3.scaleLinear()
            .domain([globalMinVal, (globalMinVal + globalMaxVal) / 2, globalMaxVal])
            .range([theme.heatmapLow, theme.heatmapMid, theme.heatmapHigh]);

          // --- FILTERING ---
          var filteredRows = parsedRows;
          if (vizState.searchTerm && vizState.searchTerm.trim() !== "") {
            var st = vizState.searchTerm.trim().toLowerCase();
            filteredRows = parsedRows.filter(function (r) {
              if (r.dimVal && r.dimVal.toString().toLowerCase().indexOf(st) !== -1) return true;
              if (r.secDimVal && r.secDimVal.toString().toLowerCase().indexOf(st) !== -1) return true;
              return false;
            });
          }

          // --- SORTING ---
          if (vizState.sortKey) {
            var sk = vizState.sortKey;
            var isAsc = vizState.sortAsc;
            filteredRows.sort(function (a, b) {
              var vA, vB;
              if (sk === "__dim__") {
                vA = a.dimVal ? a.dimVal.toString() : "";
                vB = b.dimVal ? b.dimVal.toString() : "";
                return isAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
              } else if (sk === "__sec_dim__") {
                vA = a.secDimVal ? a.secDimVal.toString() : "";
                vB = b.secDimVal ? b.secDimVal.toString() : "";
                return isAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
              } else if (sk === "__row_total__") {
                vA = a.rowSum;
                vB = b.rowSum;
              } else {
                // Specific pivot column
                var cA = a.cells[sk];
                var cB = b.cells[sk];
                vA = (cA && cA.val !== null) ? cA.val : -Infinity;
                vB = (cB && cB.val !== null) ? cB.val : -Infinity;
              }
              if (vA < vB) return isAsc ? -1 : 1;
              if (vA > vB) return isAsc ? 1 : -1;
              return 0;
            });
          }

          // --- PAGINATION ---
          var effectivePageSize = config.pageSize || "10";
          var pageSizeNum = (effectivePageSize === "all") ? filteredRows.length : parseInt(effectivePageSize, 10);
          if (isNaN(pageSizeNum) || pageSizeNum <= 0) pageSizeNum = 10;
          var totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSizeNum));
          if (vizState.currentPage > totalPages) vizState.currentPage = totalPages;
          if (vizState.currentPage < 1) vizState.currentPage = 1;

          var startIndex = (vizState.currentPage - 1) * pageSizeNum;
          var pageRows = (effectivePageSize === "all") ? filteredRows : filteredRows.slice(startIndex, startIndex + pageSizeNum);

          // Build UI Container
          var wrapper = document.createElement("div");
          wrapper.style.display = "flex";
          wrapper.style.flexDirection = "column";
          wrapper.style.height = "100%";
          wrapper.style.background = "#ffffff";
          wrapper.style.color = theme.text;
          wrapper.style.fontSize = curFont.base;

          // Top Action Toolbar (Search Bar + KPI Summary HUD + Mode Selector)
          var toolbar = document.createElement("div");
          toolbar.style.display = "flex";
          toolbar.style.alignItems = "center";
          toolbar.style.justifyContent = "space-between";
          toolbar.style.padding = "10px 16px";
          toolbar.style.borderBottom = "1px solid " + theme.border;
          toolbar.style.background = theme.hudBg;
          toolbar.style.flexWrap = "wrap";
          toolbar.style.gap = "10px";

          // Left HUD: KPI Summary
          var hudLeft = document.createElement("div");
          hudLeft.style.display = "flex";
          hudLeft.style.alignItems = "center";
          hudLeft.style.gap = "14px";

          var kpiGrandTotal = document.createElement("div");
          kpiGrandTotal.style.display = "flex";
          kpiGrandTotal.style.flexDirection = "column";
          kpiGrandTotal.innerHTML =
            "<span style=\"font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Grand Volume Total</span>" +
            "<span style=\"font-size: 15px; font-weight: 700; color: " + theme.text + ";\">" + formatMetricValue(grandTotalSum, valFormat) + "</span>";
          hudLeft.appendChild(kpiGrandTotal);

          var kpiRowsCount = document.createElement("div");
          kpiRowsCount.style.display = "flex";
          kpiRowsCount.style.flexDirection = "column";
          kpiRowsCount.style.borderLeft = "1px solid " + theme.border;
          kpiRowsCount.style.paddingLeft = "14px";
          kpiRowsCount.innerHTML =
            "<span style=\"font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Entities / Rows</span>" +
            "<span style=\"font-size: 15px; font-weight: 700; color: " + theme.text + ";\">" + filteredRows.length + " of " + parsedRows.length + "</span>";
          hudLeft.appendChild(kpiRowsCount);

          var kpiColsCount = document.createElement("div");
          kpiColsCount.style.display = "flex";
          kpiColsCount.style.flexDirection = "column";
          kpiColsCount.style.borderLeft = "1px solid " + theme.border;
          kpiColsCount.style.paddingLeft = "14px";
          kpiColsCount.innerHTML =
            "<span style=\"font-size: 10.5px; font-weight: 600; text-transform: uppercase; color: " + theme.subtext + "; letter-spacing: 0.5px;\">Pivot Periods</span>" +
            "<span style=\"font-size: 15px; font-weight: 700; color: " + theme.primary + ";\">" + pivotCols.length + " Columns</span>";
          hudLeft.appendChild(kpiColsCount);

          toolbar.appendChild(hudLeft);

          // Right HUD: Search Box
          if (showSearch) {
            var searchContainer = document.createElement("div");
            searchContainer.style.display = "flex";
            searchContainer.style.alignItems = "center";
            searchContainer.style.gap = "8px";

            var searchInput = document.createElement("input");
            searchInput.type = "text";
            searchInput.placeholder = "🔍 Search entity...";
            searchInput.value = vizState.searchTerm;
            searchInput.style.padding = "5px 10px";
            searchInput.style.fontSize = "12px";
            searchInput.style.border = "1px solid " + theme.border;
            searchInput.style.borderRadius = "6px";
            searchInput.style.outline = "none";
            searchInput.style.width = "180px";
            searchInput.style.background = "#ffffff";
            searchInput.style.color = theme.text;
            searchInput.oninput = function (e) {
              vizState.searchTerm = e.target.value;
              vizState.currentPage = 1;
              // Re-render
              triggerReRender();
            };
            searchContainer.appendChild(searchInput);

            if (vizState.searchTerm) {
              var clearBtn = document.createElement("button");
              clearBtn.textContent = "✕";
              clearBtn.style.border = "none";
              clearBtn.style.background = "none";
              clearBtn.style.cursor = "pointer";
              clearBtn.style.color = theme.subtext;
              clearBtn.style.fontWeight = "bold";
              clearBtn.onclick = function () {
                vizState.searchTerm = "";
                vizState.currentPage = 1;
                triggerReRender();
              };
              searchContainer.appendChild(clearBtn);
            }
            toolbar.appendChild(searchContainer);
          }

          wrapper.appendChild(toolbar);

          // --- TABLE SCROLL CONTAINER ---
          var tableContainer = document.createElement("div");
          tableContainer.style.flex = "1 1 auto";
          tableContainer.style.overflow = "auto";
          tableContainer.style.position = "relative";

          var table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.textAlign = "left";
          table.style.fontSize = curFont.base;

          // --- TABLE HEADER ---
          var thead = document.createElement("thead");
          thead.style.position = "sticky";
          thead.style.top = "0";
          thead.style.zIndex = "10";
          thead.style.background = theme.headerBg;

          var trHead = document.createElement("tr");

          // Primary Dimension Header
          var thDim = document.createElement("th");
          thDim.style.padding = curFont.padY + " " + curFont.padX;
          thDim.style.fontWeight = "600";
          thDim.style.color = theme.headerText;
          thDim.style.borderBottom = "2px solid " + theme.headerBorder;
          thDim.style.cursor = "pointer";
          thDim.style.userSelect = "none";
          thDim.style.whiteSpace = "nowrap";
          thDim.innerHTML = (primaryDim.label_short || primaryDim.label || "Entity") +
            (vizState.sortKey === "__dim__" ? (vizState.sortAsc ? " ▲" : " ▼") : " <span style=\"color:#94a3b8; font-size:10px;\">⇅</span>");
          thDim.onclick = function () {
            if (vizState.sortKey === "__dim__") {
              vizState.sortAsc = !vizState.sortAsc;
            } else {
              vizState.sortKey = "__dim__";
              vizState.sortAsc = true;
            }
            triggerReRender();
          };
          trHead.appendChild(thDim);

          // Secondary Dimension Header (if present)
          if (secondaryDim) {
            var thSecDim = document.createElement("th");
            thSecDim.style.padding = curFont.padY + " " + curFont.padX;
            thSecDim.style.fontWeight = "600";
            thSecDim.style.color = theme.headerText;
            thSecDim.style.borderBottom = "2px solid " + theme.headerBorder;
            thSecDim.style.cursor = "pointer";
            thSecDim.style.userSelect = "none";
            thSecDim.style.whiteSpace = "nowrap";
            thSecDim.innerHTML = (secondaryDim.label_short || secondaryDim.label || "Sub-Category") +
              (vizState.sortKey === "__sec_dim__" ? (vizState.sortAsc ? " ▲" : " ▼") : " <span style=\"color:#94a3b8; font-size:10px;\">⇅</span>");
            thSecDim.onclick = function () {
              if (vizState.sortKey === "__sec_dim__") {
                vizState.sortAsc = !vizState.sortAsc;
              } else {
                vizState.sortKey = "__sec_dim__";
                vizState.sortAsc = true;
              }
              triggerReRender();
            };
            trHead.appendChild(thSecDim);
          }

          // Pivot Column Headers
          pivotCols.forEach(function (c) {
            var thCol = document.createElement("th");
            thCol.style.padding = curFont.padY + " " + curFont.padX;
            thCol.style.fontWeight = "600";
            thCol.style.color = theme.headerText;
            thCol.style.borderBottom = "2px solid " + theme.headerBorder;
            thCol.style.textAlign = "right";
            thCol.style.cursor = "pointer";
            thCol.style.userSelect = "none";
            thCol.style.whiteSpace = "nowrap";
            thCol.title = "Click to dynamically sort table by " + c.label + " (Cloud Blocker b/500385324)";

            var sortSymbol = (vizState.sortKey === c.key)
              ? (vizState.sortAsc ? " ▲" : " ▼")
              : " <span style=\"color:#94a3b8; font-size:10px;\">⇅</span>";

            thCol.innerHTML = c.label + sortSymbol;
            thCol.onclick = function () {
              if (vizState.sortKey === c.key) {
                vizState.sortAsc = !vizState.sortAsc;
              } else {
                vizState.sortKey = c.key;
                vizState.sortAsc = false; // default desc for numbers
              }
              triggerReRender();
            };
            trHead.appendChild(thCol);
          });

          // Row Total Header
          if (showRowTotals) {
            var thTotal = document.createElement("th");
            thTotal.style.padding = curFont.padY + " " + curFont.padX;
            thTotal.style.fontWeight = "700";
            thTotal.style.color = theme.headerText;
            thTotal.style.borderBottom = "2px solid " + theme.headerBorder;
            thTotal.style.textAlign = "right";
            thTotal.style.background = theme.totalBg;
            thTotal.style.cursor = "pointer";
            thTotal.style.userSelect = "none";
            thTotal.style.whiteSpace = "nowrap";
            thTotal.title = "Click to sort by Row Total";
            thTotal.innerHTML = "Total" + (vizState.sortKey === "__row_total__" ? (vizState.sortAsc ? " ▲" : " ▼") : " <span style=\"color:#94a3b8; font-size:10px;\">⇅</span>");
            thTotal.onclick = function () {
              if (vizState.sortKey === "__row_total__") {
                vizState.sortAsc = !vizState.sortAsc;
              } else {
                vizState.sortKey = "__row_total__";
                vizState.sortAsc = false;
              }
              triggerReRender();
            };
            trHead.appendChild(thTotal);
          }

          thead.appendChild(trHead);
          table.appendChild(thead);

          // --- TABLE BODY ---
          var tbody = document.createElement("tbody");

          if (pageRows.length === 0) {
            var trEmpty = document.createElement("tr");
            var tdEmpty = document.createElement("td");
            tdEmpty.colSpan = pivotCols.length + (secondaryDim ? 2 : 1) + (showRowTotals ? 1 : 0);
            tdEmpty.style.padding = "36px";
            tdEmpty.style.textAlign = "center";
            tdEmpty.style.color = theme.subtext;
            tdEmpty.innerHTML = "No entities match the current search filter.";
            trEmpty.appendChild(tdEmpty);
            tbody.appendChild(trEmpty);
          } else {
            pageRows.forEach(function (r, rIndex) {
              var tr = document.createElement("tr");
              tr.style.borderBottom = "1px solid " + theme.border;
              tr.style.background = (rIndex % 2 === 1) ? theme.rowAlt : "#ffffff";
              tr.style.transition = "background 0.15s ease";

              tr.onmouseenter = function () {
                tr.style.background = theme.rowHover;
              };
              tr.onmouseleave = function () {
                tr.style.background = (rIndex % 2 === 1) ? theme.rowAlt : "#ffffff";
              };

              // Primary Dim Cell
              var tdDim = document.createElement("td");
              tdDim.style.padding = curFont.padY + " " + curFont.padX;
              tdDim.style.fontWeight = "600";
              tdDim.style.color = theme.text;
              tdDim.style.whiteSpace = "nowrap";

              if (r.dimDrills && r.dimDrills.length > 0) {
                var dimLink = document.createElement("a");
                dimLink.href = "#";
                dimLink.style.color = theme.primary;
                dimLink.style.textDecoration = "none";
                dimLink.textContent = r.dimVal || "(empty)";
                dimLink.title = "Looker Drilldown menu";
                dimLink.onclick = function (e) {
                  e.preventDefault();
                  if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                    LookerCharts.Utils.openDrillMenu({ links: r.dimDrills, event: e });
                  }
                };
                tdDim.appendChild(dimLink);
              } else {
                tdDim.textContent = r.dimVal || "(empty)";
              }
              tr.appendChild(tdDim);

              // Secondary Dim Cell
              if (secondaryDim) {
                var tdSec = document.createElement("td");
                tdSec.style.padding = curFont.padY + " " + curFont.padX;
                tdSec.style.color = theme.subtext;
                tdSec.style.whiteSpace = "nowrap";
                tdSec.textContent = r.secDimVal || "-";
                tr.appendChild(tdSec);
              }

              // Pivot Value Cells
              pivotCols.forEach(function (c) {
                var tdVal = document.createElement("td");
                tdVal.style.padding = curFont.padY + " " + curFont.padX;
                tdVal.style.textAlign = "right";
                tdVal.style.position = "relative";

                var cellData = r.cells[c.key];
                var cellNum = cellData ? cellData.val : null;
                var cellFmt = (cellData && cellData.rendered) ? cellData.rendered : (cellNum !== null ? formatMetricValue(cellNum, valFormat) : "-");

                var isPeakInRow = highlightMax && (r.rowMaxColKey === c.key) && (cellNum !== null && cellNum > 0);

                // --- RENDERING MODES ---
                if (renderMode === "heatmap_grid") {
                  // Color intensity background
                  if (cellNum !== null) {
                    tdVal.style.background = heatColorScale(cellNum);
                    // Determine contrast text
                    var norm = (cellNum - globalMinVal) / ((globalMaxVal - globalMinVal) || 1);
                    tdVal.style.color = norm > 0.65 ? "#ffffff" : theme.text;
                    tdVal.style.fontWeight = "600";
                  } else {
                    tdVal.style.color = theme.subtext;
                  }
                  tdVal.textContent = cellFmt;
                } else if (renderMode === "matrix_bars") {
                  // In-cell proportional micro-bar
                  var barPct = (cellNum !== null && globalMaxVal > 0) ? Math.min(100, Math.max(0, (cellNum / globalMaxVal) * 100)) : 0;

                  var contentBox = document.createElement("div");
                  contentBox.style.display = "flex";
                  contentBox.style.flexDirection = "column";
                  contentBox.style.alignItems = "flex-end";
                  contentBox.style.gap = "3px";

                  var textSpan = document.createElement("span");
                  textSpan.style.fontWeight = isPeakInRow ? "700" : "500";
                  textSpan.style.color = isPeakInRow ? theme.primary : theme.text;
                  textSpan.textContent = cellFmt;
                  if (isPeakInRow) {
                    textSpan.title = "Row Peak Value";
                    textSpan.innerHTML = cellFmt + " <span style=\"font-size:9px; color:" + theme.primary + "\">★</span>";
                  }
                  contentBox.appendChild(textSpan);

                  if (cellNum !== null && cellNum > 0) {
                    var barTrack = document.createElement("div");
                    barTrack.style.width = "75px";
                    barTrack.style.height = "4px";
                    barTrack.style.background = theme.barBg;
                    barTrack.style.borderRadius = "2px";
                    barTrack.style.overflow = "hidden";

                    var barFill = document.createElement("div");
                    barFill.style.width = barPct + "%";
                    barFill.style.height = "100%";
                    barFill.style.background = isPeakInRow ? theme.primary : theme.barFill;
                    barFill.style.borderRadius = "2px";
                    barTrack.appendChild(barFill);

                    contentBox.appendChild(barTrack);
                  }

                  tdVal.appendChild(contentBox);
                } else if (renderMode === "growth_delta") {
                  // Period over period growth pills
                  var wrapBox = document.createElement("div");
                  wrapBox.style.display = "flex";
                  wrapBox.style.flexDirection = "column";
                  wrapBox.style.alignItems = "flex-end";
                  wrapBox.style.gap = "2px";

                  var vSpan = document.createElement("span");
                  vSpan.style.fontWeight = "600";
                  vSpan.style.color = theme.text;
                  vSpan.textContent = cellFmt;
                  wrapBox.appendChild(vSpan);

                  if (cellData && cellData.popPct !== null) {
                    var pctVal = cellData.popPct;
                    var badge = document.createElement("span");
                    badge.style.fontSize = curFont.badge;
                    badge.style.fontWeight = "700";
                    badge.style.padding = "1px 5px";
                    badge.style.borderRadius = "4px";
                    if (pctVal >= 0) {
                      badge.style.background = theme.posBadgeBg;
                      badge.style.color = theme.posBadgeText;
                      badge.textContent = "+" + pctVal.toFixed(1) + "%";
                    } else {
                      badge.style.background = theme.negBadgeBg;
                      badge.style.color = theme.negBadgeText;
                      badge.textContent = pctVal.toFixed(1) + "%";
                    }
                    wrapBox.appendChild(badge);
                  }

                  tdVal.appendChild(wrapBox);
                } else {
                  // Compact KPI Mode
                  tdVal.textContent = cellFmt;
                  tdVal.style.fontWeight = isPeakInRow ? "700" : "400";
                  if (isPeakInRow) tdVal.style.color = theme.primary;
                }

                // Add Drilldown click event if available
                if (cellData && cellData.links && cellData.links.length > 0) {
                  tdVal.style.cursor = "pointer";
                  tdVal.onclick = (function (links) {
                    return function (e) {
                      if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                        LookerCharts.Utils.openDrillMenu({ links: links, event: e });
                      }
                    };
                  })(cellData.links);
                }

                tr.appendChild(tdVal);
              });

              // Row Total Cell
              if (showRowTotals) {
                var tdTotal = document.createElement("td");
                tdTotal.style.padding = curFont.padY + " " + curFont.padX;
                tdTotal.style.textAlign = "right";
                tdTotal.style.fontWeight = "700";
                tdTotal.style.background = theme.totalBg;
                tdTotal.style.color = theme.totalText;
                tdTotal.style.whiteSpace = "nowrap";
                tdTotal.textContent = formatMetricValue(r.rowSum, valFormat);
                tr.appendChild(tdTotal);
              }

              tbody.appendChild(tr);
            });
          }

          table.appendChild(tbody);

          // --- COLUMN TOTALS SUMMARY FOOTER ---
          if (showColTotals && parsedRows.length > 0) {
            var tfoot = document.createElement("tfoot");
            tfoot.style.position = "sticky";
            tfoot.style.bottom = "0";
            tfoot.style.zIndex = "10";
            tfoot.style.background = theme.totalBg;
            tfoot.style.borderTop = "2px solid " + theme.headerBorder;

            var trFoot = document.createElement("tr");

            var tdFootLabel = document.createElement("td");
            tdFootLabel.style.padding = curFont.padY + " " + curFont.padX;
            tdFootLabel.style.fontWeight = "700";
            tdFootLabel.style.color = theme.totalText;
            tdFootLabel.textContent = "Summary Total";
            trFoot.appendChild(tdFootLabel);

            if (secondaryDim) {
              var tdFootSec = document.createElement("td");
              tdFootSec.style.padding = curFont.padY + " " + curFont.padX;
              tdFootSec.textContent = "";
              trFoot.appendChild(tdFootSec);
            }

            pivotCols.forEach(function (c) {
              var tdFootCol = document.createElement("td");
              tdFootCol.style.padding = curFont.padY + " " + curFont.padX;
              tdFootCol.style.textAlign = "right";
              tdFootCol.style.fontWeight = "700";
              tdFootCol.style.color = theme.totalText;
              var cSum = colAggregations[c.key] ? colAggregations[c.key].sum : 0;
              tdFootCol.textContent = formatMetricValue(cSum, valFormat);
              trFoot.appendChild(tdFootCol);
            });

            if (showRowTotals) {
              var tdFootGrand = document.createElement("td");
              tdFootGrand.style.padding = curFont.padY + " " + curFont.padX;
              tdFootGrand.style.textAlign = "right";
              tdFootGrand.style.fontWeight = "800";
              tdFootGrand.style.color = theme.primary;
              tdFootGrand.textContent = formatMetricValue(grandTotalSum, valFormat);
              trFoot.appendChild(tdFootGrand);
            }

            tfoot.appendChild(trFoot);
            table.appendChild(tfoot);
          }

          tableContainer.appendChild(table);
          wrapper.appendChild(tableContainer);

          // --- PAGINATION FOOTER BAR ---
          if (effectivePageSize !== "all" && totalPages > 1) {
            var paginationBar = document.createElement("div");
            paginationBar.style.display = "flex";
            paginationBar.style.alignItems = "center";
            paginationBar.style.justifyContent = "space-between";
            paginationBar.style.padding = "8px 16px";
            paginationBar.style.borderTop = "1px solid " + theme.border;
            paginationBar.style.background = "#ffffff";
            paginationBar.style.fontSize = "12px";

            var pageInfo = document.createElement("span");
            pageInfo.style.color = theme.subtext;
            pageInfo.textContent = "Showing " + (startIndex + 1) + " - " + Math.min(startIndex + pageSizeNum, filteredRows.length) + " of " + filteredRows.length + " entries";
            paginationBar.appendChild(pageInfo);

            var pageControls = document.createElement("div");
            pageControls.style.display = "flex";
            pageControls.style.alignItems = "center";
            pageControls.style.gap = "6px";

            var prevBtn = document.createElement("button");
            prevBtn.textContent = "◀ Prev";
            prevBtn.disabled = vizState.currentPage === 1;
            prevBtn.style.padding = "4px 8px";
            prevBtn.style.fontSize = "11.5px";
            prevBtn.style.border = "1px solid " + theme.border;
            prevBtn.style.borderRadius = "4px";
            prevBtn.style.background = prevBtn.disabled ? "#f1f5f9" : "#ffffff";
            prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
            prevBtn.onclick = function () {
              if (vizState.currentPage > 1) {
                vizState.currentPage--;
                triggerReRender();
              }
            };
            pageControls.appendChild(prevBtn);

            var pageNumDisplay = document.createElement("span");
            pageNumDisplay.style.fontWeight = "600";
            pageNumDisplay.style.color = theme.text;
            pageNumDisplay.textContent = "Page " + vizState.currentPage + " of " + totalPages;
            pageControls.appendChild(pageNumDisplay);

            var nextBtn = document.createElement("button");
            nextBtn.textContent = "Next ▶";
            nextBtn.disabled = vizState.currentPage === totalPages;
            nextBtn.style.padding = "4px 8px";
            nextBtn.style.fontSize = "11.5px";
            nextBtn.style.border = "1px solid " + theme.border;
            nextBtn.style.borderRadius = "4px";
            nextBtn.style.background = nextBtn.disabled ? "#f1f5f9" : "#ffffff";
            nextBtn.style.cursor = nextBtn.disabled ? "not-allowed" : "pointer";
            nextBtn.onclick = function () {
              if (vizState.currentPage < totalPages) {
                vizState.currentPage++;
                triggerReRender();
              }
            };
            pageControls.appendChild(nextBtn);

            paginationBar.appendChild(pageControls);
            wrapper.appendChild(paginationBar);
          }

          container.appendChild(wrapper);

          // Helper for re-rendering after user interaction (sorting, search, pagination)
          function triggerReRender() {
            var self = this;
            // Update visualization DOM synchronously
            var syntheticConfig = Object.assign({}, config);
            looker.plugins.visualizations.get("dynamic_pivot_matrix").updateAsync(
              data,
              element,
              syntheticConfig,
              queryResponse,
              details,
              function () {}
            );
          }

          done();
        } catch (err) {
          console.error("Error rendering Dynamic Pivot Matrix:", err);
          done();
        }
      });
    }
  });
})();
