/**
 * Tornado Sensitivity Analysis & Risk Variance Chart
 * Looker Custom Visualization for Corporate Strategy, Financial Modeling & What-If Variance Decomposition
 *
 * Visual Paradigms & Multi-Modal Modes:
 * 1. "tornado_bars": Classic bidirectional horizontal sensitivity bars sorted descending by total swing magnitude,
 *    centered on a vertical baseline reference line, showing Downside Risk to Upside Opportunity.
 * 2. "spider_sensitivity": Multi-parameter spider / sensitivity curves showing % change in target metric across
 *    parameter perturbations (-30% to +30%).
 * 3. "cumulative_swing_waterfall": Cumulative variance waterfall aggregating each driver's variance to total forecast spread.
 * 4. "variance_risk_matrix": Executive risk driver scorecard displaying sensitivity ranking, elasticity, downside risk, and upside potential.
 *
 * Enterprise Standards:
 * - Dynamic Field-Role Mapping (Driver Dimension, Downside Measure, Upside Measure, Baseline Measure)
 * - Configurable Baseline Modes (Measure Column, Fixed Value, Dataset Mean, Dataset Median, Zero Center)
 * - Sorting, Top-N density, zero-variance suppression, search filtering
 * - Executive HUD Scorecard (Full, Compact, Hidden)
 * - Enterprise Brand Palettes (Slate, Google, Cyberpunk, Emerald, Sunset, Wellverse, Custom Hex)
 * - Strictly 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver (<4px delta guard) and responsive SVG scaling
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
    modern_slate: {
      name: "Modern Studio Slate (#0f172a)",
      primary: "#0f172a",
      secondary: "#334155",
      downside: "#dc2626",
      upside: "#059669",
      baseline: "#0f172a",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    google_enterprise: {
      name: "Google Enterprise (#1a73e8)",
      primary: "#1a73e8",
      secondary: "#174ea6",
      downside: "#d93025",
      upside: "#1e8e3e",
      baseline: "#202124",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368",
      surface: "#f8f9fa",
      border: "#dadce0"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (#00ffcc)",
      primary: "#00ffcc",
      secondary: "#7928ca",
      downside: "#ff0055",
      upside: "#00ffcc",
      baseline: "#00ffcc",
      bgBadge: "rgba(0, 255, 204, 0.15)",
      borderBadge: "#00ffcc",
      textBadge: "#00ffcc",
      cardBg: "#0f172a",
      textPrimary: "#f8fafc",
      textMuted: "#94a3b8",
      surface: "#1e293b",
      border: "#334155"
    },
    emerald_finops: {
      name: "Emerald FinOps (#10b981)",
      primary: "#10b981",
      secondary: "#059669",
      downside: "#ef4444",
      upside: "#10b981",
      baseline: "#064e3b",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#047857",
      cardBg: "#ffffff",
      textPrimary: "#064e3b",
      textMuted: "#047857",
      surface: "#f0fdf4",
      border: "#bbf7d0"
    },
    sunset_media: {
      name: "Sunset Media (#f97316)",
      primary: "#f97316",
      secondary: "#c2410c",
      downside: "#e11d48",
      upside: "#10b981",
      baseline: "#431407",
      bgBadge: "#fff7ed",
      borderBadge: "#ffedd5",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#431407",
      textMuted: "#9a3412",
      surface: "#fffaf5",
      border: "#fed7aa"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (#0284c7)",
      primary: "#0284c7",
      secondary: "#0369a1",
      downside: "#e11d48",
      upside: "#059669",
      baseline: "#0c4a6e",
      bgBadge: "#f0f9ff",
      borderBadge: "#bae6fd",
      textBadge: "#0369a1",
      cardBg: "#ffffff",
      textPrimary: "#0c4a6e",
      textMuted: "#0369a1",
      surface: "#f8fafc",
      border: "#e0f2fe"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(Number(val))) return "-";
    var n = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    if (fmt === "percentage") {
      return (n * 100).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return n.toFixed(2);
    }
    if (fmt === "raw") {
      return String(val);
    }
    // auto fallback
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "tornado_sensitivity_chart",
    label: "Tornado Sensitivity & Risk Variance Chart",
    options: {
      // ===== DISPLAY OPTIONS =====
      chartMode: {
        type: "string",
        label: "Visualization Mode",
        display: "select",
        values: [
          { "Tornado Sensitivity Bars": "tornado_bars" },
          { "Multi-Parameter Spider Curves": "spider_sensitivity" },
          { "Cumulative Variance Waterfall": "cumulative_swing_waterfall" },
          { "Executive Driver Risk Matrix": "variance_risk_matrix" }
        ],
        default: "tornado_bars",
        section: "Display",
        order: 1
      },
      custom_title: {
        type: "string",
        label: "Chart Title Override",
        default: "Strategic Tornado Sensitivity & Risk Variance Analysis",
        section: "Display",
        order: 2
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Model Context",
        default: "Key Business Driver Volatility & Downside/Upside Spread",
        section: "Display",
        order: 3
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard Strip": "scorecard" },
          { "Compact Summary": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 4
      },
      baselineMode: {
        type: "string",
        label: "Center Baseline Reference Mode",
        display: "select",
        values: [
          { "Baseline Measure Column": "measure_column" },
          { "Fixed Baseline Value": "fixed_value" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Zero Centered": "zero_center" }
        ],
        default: "measure_column",
        section: "Display",
        order: 5
      },
      fixedBaselineValue: {
        type: "number",
        label: "Fixed Baseline Value",
        default: 0,
        section: "Display",
        order: 6
      },
      baselineLabel: {
        type: "string",
        label: "Baseline Reference Label",
        default: "Base Case Expected Value",
        section: "Display",
        order: 7
      },
      sortOrder: {
        type: "string",
        label: "Driver Sorting Mode",
        display: "select",
        values: [
          { "Total Swing Magnitude (Tornado Funnel)": "swing_desc" },
          { "Highest Downside Risk": "downside_desc" },
          { "Highest Upside Opportunity": "upside_desc" },
          { "Alphabetical by Driver": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "swing_desc",
        section: "Display",
        order: 8
      },
      topN: {
        type: "string",
        label: "Top-N Drivers Limit",
        display: "select",
        values: [
          { "All Drivers": "all" },
          { "Top 5 Key Drivers": "5" },
          { "Top 8 Key Drivers": "8" },
          { "Top 10 Key Drivers": "10" },
          { "Top 15 Key Drivers": "15" }
        ],
        default: "all",
        section: "Display",
        order: 9
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "All Values (Deltas & Totals)": "all" },
          { "Extreme Bounds Only": "extreme_only" },
          { "Hidden (Hover Tooltip Only)": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 10
      },
      showSearchBar: {
        type: "boolean",
        label: "Show Interactive Search Filter Bar",
        default: true,
        section: "Display",
        order: 11
      },
      suppressZeroVariance: {
        type: "boolean",
        label: "Suppress Drivers with Zero Variance",
        default: true,
        section: "Display",
        order: 12
      },
      dimDriverOverride: {
        type: "string",
        label: "Field Override: Driver / Factor",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 13
      },
      measureDownsideOverride: {
        type: "string",
        label: "Field Override: Downside Risk / Low Case",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 14
      },
      measureUpsideOverride: {
        type: "string",
        label: "Field Override: Upside Opportunity / High Case",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 15
      },
      measureBaselineOverride: {
        type: "string",
        label: "Field Override: Base Case / Baseline",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 16
      },

      // ===== STYLE OPTIONS =====
      colorPalette: {
        type: "string",
        label: "Color Palette Theme",
        display: "select",
        values: [
          { "Modern Studio Slate (#0f172a)": "modern_slate" },
          { "Google Enterprise (#1a73e8)": "google_enterprise" },
          { "Cyberpunk Dark (#00ffcc)": "cyberpunk_dark" },
          { "Emerald FinOps (#10b981)": "emerald_finops" },
          { "Sunset Media (#f97316)": "sunset_media" },
          { "Wellverse Healthcare (#0284c7)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "modern_slate",
        section: "Style",
        order: 1
      },
      customDownsideColor: {
        type: "string",
        label: "Custom Downside / Risk Color",
        display: "color",
        default: "#dc2626",
        section: "Style",
        order: 2
      },
      customUpsideColor: {
        type: "string",
        label: "Custom Upside / Opportunity Color",
        display: "color",
        default: "#059669",
        section: "Style",
        order: 3
      },
      customBaselineColor: {
        type: "string",
        label: "Custom Baseline Axis Color",
        display: "color",
        default: "#0f172a",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Higher is Better (Revenue, ARR, Profit, LTV)": "higher_is_better" },
          { "Lower is Better (Cost, Churn, Risk Exposure, Latency)": "lower_is_better" }
        ],
        default: "higher_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Density Scale",
        display: "select",
        values: [
          { "Compact (0.85x)": "compact" },
          { "Standard (1.0x)": "standard" },
          { "Large Presentation (1.15x)": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Format",
        display: "select",
        values: [
          { "Auto Currency ($1.2M)": "auto" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.background = "#ffffff";

      this._container = document.createElement("div");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.boxSizing = "border-box";
      this._container.style.overflow = "hidden";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      element.appendChild(this._container);

      this._searchQuery = "";
      this._activeDriver = null;

      var self = this;
      var lastH = 0;
      if (typeof ResizeObserver !== "undefined") {
        this._ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var h = entries[0].contentRect.height;
          if (Math.abs(h - lastH) < 4) return;
          lastH = h;
          if (self._lastData && self._lastQueryResponse) {
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }
        });
        this._ro.observe(element);
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      if (!queryResponse || !queryResponse.fields) return;
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        meas = meas.concat(queryResponse.fields.table_calculations);
      }

      var dimSig = dims.map(function (d) { return d.name; }).join(",");
      var measSig = meas.map(function (m) { return m.name; }).join(",");
      if (this._lastDimSig === dimSig && this._lastMeasSig === measSig) return;
      this._lastDimSig = dimSig;
      this._lastMeasSig = measSig;

      var dimValues = [{ "Auto-Detect from Query": "" }];
      dims.forEach(function (d) {
        var label = d.label_short || d.label || d.name;
        var opt = {};
        opt[label + " (" + d.name + ")"] = d.name;
        dimValues.push(opt);
      });

      var measValues = [{ "Auto-Detect from Query": "" }];
      meas.forEach(function (m) {
        var label = m.label_short || m.label || m.name;
        var opt = {};
        opt[label + " (" + m.name + ")"] = m.name;
        measValues.push(opt);
      });

      var newOptions = Object.assign({}, this.options);
      if (newOptions.dimDriverOverride) {
        newOptions.dimDriverOverride = Object.assign({}, newOptions.dimDriverOverride, { values: dimValues });
      }
      var measKeys = ["measureDownsideOverride", "measureUpsideOverride", "measureBaselineOverride"];
      measKeys.forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: measValues });
        }
      });

      try {
        this.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      if (!this._container) {
        this.create(element, config);
      }
      var container = this._container;
      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='padding:24px;color:#64748b;font-size:13px;text-align:center;'>No sensitivity data returned in query result.</div>";
        done();
        return;
      }

      ensureD3(function (d3) {
        // Resolve theme & palette
        var paletteKey = config.colorPalette || "modern_slate";
        var basePalette = PALETTES[paletteKey] || PALETTES.modern_slate;
        var palette = Object.assign({}, basePalette);
        if (paletteKey === "custom_hex" || config.customDownsideColor) {
          if (config.customDownsideColor) palette.downside = config.customDownsideColor;
          if (config.customUpsideColor) palette.upside = config.customUpsideColor;
          if (config.customBaselineColor) palette.baseline = config.customBaselineColor;
        }

        var polarity = config.metricPolarity || "higher_is_better";
        var isHigherBetter = polarity === "higher_is_better";
        var fontScale = config.fontScale === "compact" ? 0.85 : config.fontScale === "large_presentation" ? 1.15 : 1.0;
        var valFormat = config.valueFormat || "compact_currency";

        // Field resolution helpers
        function resolveField(list, overrideVal, matchSuffixes, fallbackIdx) {
          if (overrideVal) {
            for (var i = 0; i < list.length; i++) {
              if (list[i].name === overrideVal) return list[i].name;
            }
          }
          for (var s = 0; s < matchSuffixes.length; s++) {
            var suf = matchSuffixes[s].toLowerCase();
            for (var j = 0; j < list.length; j++) {
              var fn = list[j].name.toLowerCase();
              var fl = (list[j].label_short || list[j].label || "").toLowerCase();
              if (fn.indexOf(suf) !== -1 || fl.indexOf(suf) !== -1) {
                return list[j].name;
              }
            }
          }
          if (list[fallbackIdx]) return list[fallbackIdx].name;
          return list.length > 0 ? list[0].name : null;
        }

        var allDims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
        var allMeas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
        if (queryResponse.fields.table_calculations) {
          allMeas = allMeas.concat(queryResponse.fields.table_calculations);
        }

        var fDriver = resolveField(allDims, config.dimDriverOverride, ["driver", "account_name", "parameter", "factor", "variable", "name", "category"], 0);
        var fDownside = resolveField(allMeas, config.measureDownsideOverride, ["downside", "arr_at_risk", "risk", "min", "low", "p10", "worst"], 0);
        var fUpside = resolveField(allMeas, config.measureUpsideOverride, ["upside", "renewal", "max", "high", "p90", "best", "opportunity"], 1);
        var fBaseline = resolveField(allMeas, config.measureBaselineOverride, ["baseline", "active_arr", "target", "base", "expected", "mean", "quota"], 2);

        function extractVal(row, fieldName, fallback) {
          if (!fieldName || !row[fieldName]) return fallback;
          var cell = row[fieldName];
          if (cell.value !== undefined && cell.value !== null) return cell.value;
          return fallback;
        }

        function extractCell(row, fieldName) {
          if (!fieldName || !row[fieldName]) return null;
          return row[fieldName];
        }

        // Determine baseline
        var rawBaselines = [];
        for (var bIdx = 0; bIdx < data.length; bIdx++) {
          var bVal = Number(extractVal(data[bIdx], fBaseline, null));
          if (!isNaN(bVal) && bVal !== null) rawBaselines.push(bVal);
        }

        var globalBaseline = 0;
        var bMode = config.baselineMode || "measure_column";
        if (bMode === "fixed_value") {
          globalBaseline = Number(config.fixedBaselineValue) || 0;
        } else if (bMode === "dataset_mean") {
          globalBaseline = rawBaselines.reduce(function (sum, v) { return sum + v; }, 0) / (rawBaselines.length || 1);
        } else if (bMode === "dataset_median") {
          var sortedB = rawBaselines.slice().sort(function (a, b) { return a - b; });
          globalBaseline = sortedB[Math.floor(sortedB.length / 2)] || 0;
        } else if (bMode === "zero_center") {
          globalBaseline = 0;
        } else {
          // measure_column default
          if (rawBaselines.length > 0) {
            globalBaseline = rawBaselines.reduce(function (sum, v) { return sum + v; }, 0) / rawBaselines.length;
          } else {
            globalBaseline = 0;
          }
        }

        var parsedRows = [];
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var driverName = String(extractVal(row, fDriver, "Driver " + (i + 1)));

          var downVal = Number(extractVal(row, fDownside, 0));
          if (isNaN(downVal)) downVal = 0;

          var upVal = Number(extractVal(row, fUpside, 0));
          if (isNaN(upVal)) upVal = 0;

          var baseVal = Number(extractVal(row, fBaseline, globalBaseline));
          if (isNaN(baseVal)) baseVal = globalBaseline;

          // If downside > upside, normalize order
          var lowVal = Math.min(downVal, upVal);
          var highVal = Math.max(downVal, upVal);

          // In standard tornado: Downside delta is negative from baseline, Upside is positive from baseline
          var downsideDelta = lowVal - baseVal;
          var upsideDelta = highVal - baseVal;
          var totalSwing = Math.abs(highVal - lowVal);

          if (config.suppressZeroVariance && totalSwing === 0 && Math.abs(downsideDelta) === 0 && Math.abs(upsideDelta) === 0) {
            continue;
          }

          var drillCell = extractCell(row, fDriver) || extractCell(row, fDownside) || extractCell(row, fUpside);
          if (!drillCell || !drillCell.links || !drillCell.links.length) {
            for (var k in row) {
              if (row[k] && row[k].links && row[k].links.length) {
                drillCell = row[k];
                break;
              }
            }
          }

          parsedRows.push({
            driver: driverName,
            lowVal: lowVal,
            highVal: highVal,
            baseVal: baseVal,
            downsideDelta: downsideDelta,
            upsideDelta: upsideDelta,
            totalSwing: totalSwing,
            drillCell: drillCell,
            rawRow: row
          });
        }

        // Sorting
        var sOrder = config.sortOrder || "swing_desc";
        if (sOrder === "swing_desc") {
          parsedRows.sort(function (a, b) { return b.totalSwing - a.totalSwing; });
        } else if (sOrder === "downside_desc") {
          parsedRows.sort(function (a, b) { return Math.abs(a.downsideDelta) - Math.abs(b.downsideDelta); });
        } else if (sOrder === "upside_desc") {
          parsedRows.sort(function (a, b) { return b.upsideDelta - a.upsideDelta; });
        } else if (sOrder === "alphabetical") {
          parsedRows.sort(function (a, b) { return a.driver.localeCompare(b.driver); });
        }

        // Top N
        if (config.topN && config.topN !== "all") {
          var limitN = parseInt(config.topN, 10);
          if (!isNaN(limitN) && limitN > 0) {
            parsedRows = parsedRows.slice(0, limitN);
          }
        }

        var totalDrivers = parsedRows.length;
        var totalDownsideRisk = parsedRows.reduce(function (sum, r) { return sum + Math.abs(r.downsideDelta); }, 0);
        var totalUpsideOpp = parsedRows.reduce(function (sum, r) { return sum + Math.abs(r.upsideDelta); }, 0);
        var topDriver = parsedRows.length > 0 ? parsedRows[0].driver : "None";
        var topSwing = parsedRows.length > 0 ? parsedRows[0].totalSwing : 0;

        function renderTornadoUI() {
          var filtered = parsedRows;
          if (self._searchQuery) {
            var q = self._searchQuery.toLowerCase();
            filtered = filtered.filter(function (r) {
              return r.driver.toLowerCase().indexOf(q) !== -1;
            });
          }

          var titleStr = config.custom_title || "Strategic Tornado Sensitivity & Risk Variance Analysis";
          var subStr = config.custom_subtitle || "Key Business Driver Volatility & Downside/Upside Spread";
          var hudMode = config.hudMode || "scorecard";

          var hudHtml = "";
          if (hudMode === "scorecard") {
            hudHtml =
              '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px;">' +
                '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.baseline + ';">' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.textMuted + ';">' + (config.baselineLabel || "Base Case Baseline") + '</div>' +
                  '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + palette.textPrimary + ';margin-top:2px;">' + formatValue(globalBaseline, valFormat) + '</div>' +
                  '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Expected Operating Target</div>' +
                '</div>' +
                '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + (isHigherBetter ? palette.downside : palette.upside) + ';">' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + (isHigherBetter ? palette.downside : palette.upside) + ';">Total Downside Exposure</div>' +
                  '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + (isHigherBetter ? palette.downside : palette.upside) + ';margin-top:2px;">-' + formatValue(totalDownsideRisk, valFormat) + '</div>' +
                  '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Cumulative Risk Variance</div>' +
                '</div>' +
                '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + (isHigherBetter ? palette.upside : palette.downside) + ';">' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + (isHigherBetter ? palette.upside : palette.downside) + ';">Total Upside Potential</div>' +
                  '<div style="font-size:20px;font-weight:800;font-family:monospace;color:' + (isHigherBetter ? palette.upside : palette.downside) + ';margin-top:2px;">+' + formatValue(totalUpsideOpp, valFormat) + '</div>' +
                  '<div style="font-size:10px;color:' + palette.textMuted + ';margin-top:1px;">Opportunity Expansion Spread</div>' +
                '</div>' +
                '<div style="padding:10px 14px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:8px;border-left:4px solid ' + palette.primary + ';">' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:' + palette.textMuted + ';">Primary Volatility Driver</div>' +
                  '<div style="font-size:16px;font-weight:800;color:' + palette.textPrimary + ';margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + topDriver + '</div>' +
                  '<div style="font-size:10px;font-family:monospace;color:' + palette.primary + ';font-weight:700;margin-top:1px;">' + formatValue(topSwing, valFormat) + ' Swing Spread</div>' +
                '</div>' +
              '</div>';
          } else if (hudMode === "compact_strip") {
            hudHtml =
              '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;padding:6px 12px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:6px;font-size:11px;font-family:monospace;">' +
                '<span>BASE: <strong>' + formatValue(globalBaseline, valFormat) + '</strong></span>' +
                '<span style="color:' + palette.border + ';">•</span>' +
                '<span style="color:' + palette.downside + ';font-weight:700;">DOWNSIDE: -' + formatValue(totalDownsideRisk, valFormat) + '</span>' +
                '<span style="color:' + palette.border + ';">•</span>' +
                '<span style="color:' + palette.upside + ';font-weight:700;">UPSIDE: +' + formatValue(totalUpsideOpp, valFormat) + '</span>' +
                '<span style="color:' + palette.border + ';">•</span>' +
                '<span>KEY LEVER: <strong>' + topDriver + '</strong> (' + formatValue(topSwing, valFormat) + ')</span>' +
              '</div>';
          }

          var searchHtml = config.showSearchBar !== false
            ? '<input id="tornado-search" type="text" placeholder="Search driver factor..." value="' + (self._searchQuery || "") + '" ' +
              'style="font-size:' + (11 * fontScale) + 'px;padding:5px 10px;border:1px solid ' + palette.border + ';border-radius:6px;outline:none;width:170px;color:' + palette.textPrimary + ';background:' + palette.cardBg + ';margin-left:4px;" />'
            : "";

          var chartMode = config.chartMode || "tornado_bars";
          var modes = [
            { key: "tornado_bars", label: "🌪️ Tornado Bars" },
            { key: "spider_sensitivity", label: "🕸️ Spider Sensitivity" },
            { key: "cumulative_swing_waterfall", label: "📊 Variance Waterfall" },
            { key: "variance_risk_matrix", label: "📋 Risk Scorecard" }
          ];

          var modeButtons = modes.map(function (m) {
            var isActive = chartMode === m.key;
            return (
              '<button data-mode="' + m.key + '" style="cursor:pointer;font-size:' + (11 * fontScale) + 'px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid ' +
              (isActive ? palette.primary : palette.border) +
              ';background:' +
              (isActive ? palette.primary : palette.cardBg) +
              ';color:' +
              (isActive ? '#ffffff' : palette.textMuted) +
              ';transition:all 0.15s;outline:none;">' +
                m.label +
              '</button>'
            );
          }).join("");

          var html =
            '<div style="padding:14px 16px;background:' + palette.cardBg + ';box-sizing:border-box;flex:1 1 auto;display:flex;flex-direction:column;">' +
              // Top Header Bar
              '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid ' + palette.border + ';margin-bottom:12px;">' +
                '<div>' +
                  '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<span style="width:10px;height:10px;border-radius:50%;background:' + palette.primary + ';display:inline-block;box-shadow:0 0 0 3px ' + (palette.primary + '28') + ';"></span>' +
                    '<span style="font-size:' + (14 * fontScale) + 'px;font-weight:800;color:' + palette.textPrimary + ';letter-spacing:-0.01em;">' + titleStr + '</span>' +
                  '</div>' +
                  (subStr ? '<div style="font-size:' + (11 * fontScale) + 'px;color:' + palette.textMuted + ';margin-top:2px;">' + subStr + '</div>' : '') +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                  modeButtons +
                  searchHtml +
                '</div>' +
              '</div>' +

              // Scorecard HUD
              hudHtml +

              // Visual Canvas Wrapper
              '<div id="tornado-visual-canvas" style="flex:1 1 0;min-height:0;overflow:hidden;position:relative;display:flex;flex-direction:column;"></div>' +
            '</div>';

          container.innerHTML = html;

          // Wire mode buttons
          var mBtns = container.querySelectorAll("button[data-mode]");
          for (var mb = 0; mb < mBtns.length; mb++) {
            mBtns[mb].addEventListener("click", function (e) {
              var newMode = e.currentTarget.getAttribute("data-mode");
              config.chartMode = newMode;
              renderTornadoUI();
            });
          }

          // Wire search input
          var searchInput = container.querySelector("#tornado-search");
          if (searchInput) {
            searchInput.addEventListener("input", function (e) {
              self._searchQuery = e.target.value;
              renderTornadoUI();
              var newInput = container.querySelector("#tornado-search");
              if (newInput) {
                newInput.focus();
                newInput.setSelectionRange(newInput.value.length, newInput.value.length);
              }
            });
          }

          // Render selected visual mode
          var canvas = container.querySelector("#tornado-visual-canvas");
          if (!canvas) return;

          var cw = canvas.clientWidth || element.clientWidth || 800;
          var ch = canvas.clientHeight || 420;

          if (chartMode === "tornado_bars") {
            renderTornadoBars(canvas, filtered, cw, ch);
          } else if (chartMode === "spider_sensitivity") {
            renderSpiderSensitivity(canvas, filtered, cw, ch);
          } else if (chartMode === "cumulative_swing_waterfall") {
            renderWaterfall(canvas, filtered, cw, ch);
          } else if (chartMode === "variance_risk_matrix") {
            renderRiskMatrix(canvas, filtered, cw, ch);
          }
        }

        // MODE 1: TORNADO BARS
        function renderTornadoBars(canvas, rows, width, height) {
          canvas.innerHTML = "";
          if (rows.length === 0) {
            canvas.innerHTML = "<div style='padding:30px;color:" + palette.textMuted + ";text-align:center;'>No matching drivers to render.</div>";
            return;
          }

          var margin = { top: 28, right: 90, bottom: 36, left: 160 };
          var w = Math.max(280, width - margin.left - margin.right);
          var h = Math.max(200, height - margin.top - margin.bottom);

          var svg = d3.select(canvas)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

          var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          // Compute max swing range for symmetric zero/baseline scale
          var maxDelta = d3.max(rows, function (d) {
            return Math.max(Math.abs(d.downsideDelta), Math.abs(d.upsideDelta));
          }) || 1;

          var xScale = d3.scaleLinear()
            .domain([-maxDelta * 1.15, maxDelta * 1.15])
            .range([0, w]);

          var yScale = d3.scaleBand()
            .domain(rows.map(function (d) { return d.driver; }))
            .range([0, h])
            .padding(0.24);

          var zeroX = xScale(0);

          // Gridlines
          g.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + h + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickSize(-h).tickFormat(""))
            .selectAll("line")
            .attr("stroke", palette.border)
            .attr("stroke-dasharray", "3,3");

          // X Axis
          g.append("g")
            .attr("transform", "translate(0," + h + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) {
              return (d > 0 ? "+" : "") + formatValue(d, valFormat);
            }))
            .selectAll("text")
            .attr("fill", palette.textMuted)
            .attr("font-size", 10 * fontScale)
            .attr("font-family", "monospace");

          // Central Baseline Reference Line
          g.append("line")
            .attr("x1", zeroX)
            .attr("x2", zeroX)
            .attr("y1", -10)
            .attr("y2", h)
            .attr("stroke", palette.baseline)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,3");

          g.append("text")
            .attr("x", zeroX)
            .attr("y", -14)
            .attr("text-anchor", "middle")
            .attr("font-size", 9 * fontScale)
            .attr("font-weight", 700)
            .attr("font-family", "monospace")
            .attr("fill", palette.baseline)
            .text("BASELINE: " + formatValue(globalBaseline, valFormat));

          // Draw Bars for Each Driver
          rows.forEach(function (d) {
            var yPos = yScale(d.driver);
            var barHeight = yScale.bandwidth();

            // Downside Bar (left of baseline)
            var downX1 = xScale(d.downsideDelta);
            var downX2 = zeroX;
            var downW = Math.max(0, downX2 - downX1);

            g.append("rect")
              .attr("x", downX1)
              .attr("y", yPos)
              .attr("width", downW)
              .attr("height", barHeight)
              .attr("rx", 3)
              .attr("fill", isHigherBetter ? palette.downside : palette.upside)
              .attr("opacity", 0.88)
              .style("cursor", d.drillCell ? "pointer" : "default")
              .on("click", function (event) {
                if (d.drillCell && d.drillCell.links && typeof LookerCharts !== "undefined") {
                  LookerCharts.Utils.openDrillMenu({ links: d.drillCell.links, event: event });
                }
              })
              .append("title")
              .text(d.driver + " Downside: " + formatValue(d.downsideDelta, valFormat) + " (Val: " + formatValue(d.lowVal, valFormat) + ")");

            // Upside Bar (right of baseline)
            var upX1 = zeroX;
            var upX2 = xScale(d.upsideDelta);
            var upW = Math.max(0, upX2 - upX1);

            g.append("rect")
              .attr("x", upX1)
              .attr("y", yPos)
              .attr("width", upW)
              .attr("height", barHeight)
              .attr("rx", 3)
              .attr("fill", isHigherBetter ? palette.upside : palette.downside)
              .attr("opacity", 0.88)
              .style("cursor", d.drillCell ? "pointer" : "default")
              .on("click", function (event) {
                if (d.drillCell && d.drillCell.links && typeof LookerCharts !== "undefined") {
                  LookerCharts.Utils.openDrillMenu({ links: d.drillCell.links, event: event });
                }
              })
              .append("title")
              .text(d.driver + " Upside: +" + formatValue(d.upsideDelta, valFormat) + " (Val: " + formatValue(d.highVal, valFormat) + ")");

            // Driver Label (Y Axis)
            var labelText = g.append("text")
              .attr("x", -10)
              .attr("y", yPos + barHeight / 2 + 4)
              .attr("text-anchor", "end")
              .attr("font-size", 11 * fontScale)
              .attr("font-weight", 600)
              .attr("fill", palette.textPrimary)
              .style("cursor", d.drillCell ? "pointer" : "default")
              .text(d.driver.length > 20 ? d.driver.substring(0, 19) + "…" : d.driver)
              .on("click", function (event) {
                if (d.drillCell && d.drillCell.links && typeof LookerCharts !== "undefined") {
                  LookerCharts.Utils.openDrillMenu({ links: d.drillCell.links, event: event });
                }
              });
            labelText.append("title").text(d.driver);

            // Value Labels
            var labelDensity = config.labelDensity || "all";
            if (labelDensity !== "hidden") {
              // Left value label
              g.append("text")
                .attr("x", downX1 - 6)
                .attr("y", yPos + barHeight / 2 + 4)
                .attr("text-anchor", "end")
                .attr("font-size", 9 * fontScale)
                .attr("font-family", "monospace")
                .attr("font-weight", 700)
                .attr("fill", isHigherBetter ? palette.downside : palette.upside)
                .text(formatValue(d.downsideDelta, valFormat));

              // Right value label
              g.append("text")
                .attr("x", upX2 + 6)
                .attr("y", yPos + barHeight / 2 + 4)
                .attr("text-anchor", "start")
                .attr("font-size", 9 * fontScale)
                .attr("font-family", "monospace")
                .attr("font-weight", 700)
                .attr("fill", isHigherBetter ? palette.upside : palette.downside)
                .text("+" + formatValue(d.upsideDelta, valFormat));
            }
          });
        }

        // MODE 2: SPIDER SENSITIVITY CURVES
        function renderSpiderSensitivity(canvas, rows, width, height) {
          canvas.innerHTML = "";
          var margin = { top: 32, right: 140, bottom: 40, left: 60 };
          var w = Math.max(280, width - margin.left - margin.right);
          var h = Math.max(200, height - margin.top - margin.bottom);

          var svg = d3.select(canvas)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

          var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var perturbations = [-30, -20, -10, 0, 10, 20, 30];

          var xScale = d3.scaleLinear()
            .domain([-30, 30])
            .range([0, w]);

          var maxPctSpread = d3.max(rows, function (d) {
            return (d.totalSwing / (globalBaseline || 1)) * 50;
          }) || 40;

          var yScale = d3.scaleLinear()
            .domain([-maxPctSpread, maxPctSpread])
            .range([h, 0]);

          // Gridlines
          g.append("g")
            .attr("transform", "translate(0," + h + ")")
            .call(d3.axisBottom(xScale).tickValues(perturbations).tickFormat(function (d) { return (d > 0 ? "+" : "") + d + "%"; }))
            .selectAll("text")
            .attr("fill", palette.textMuted)
            .attr("font-size", 10 * fontScale)
            .attr("font-family", "monospace");

          g.append("g")
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return (d > 0 ? "+" : "") + d.toFixed(0) + "%"; }))
            .selectAll("text")
            .attr("fill", palette.textMuted)
            .attr("font-size", 10 * fontScale)
            .attr("font-family", "monospace");

          // Central Axes
          g.append("line")
            .attr("x1", 0)
            .attr("x2", w)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", palette.border)
            .attr("stroke-width", 1.5);

          g.append("line")
            .attr("x1", xScale(0))
            .attr("x2", xScale(0))
            .attr("y1", 0)
            .attr("y2", h)
            .attr("stroke", palette.border)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,3");

          var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

          var lineGen = d3.line()
            .x(function (p) { return xScale(p.x); })
            .y(function (p) { return yScale(p.y); })
            .curve(d3.curveMonotoneX);

          rows.forEach(function (d, idx) {
            var driverColor = colorScale(idx);
            var elasticity = (d.totalSwing / (globalBaseline || 1)) / 0.6; // normalized slope
            var pts = perturbations.map(function (pct) {
              return {
                x: pct,
                y: (pct / 30.0) * ((d.upsideDelta / (globalBaseline || 1)) * 100)
              };
            });

            var path = g.append("path")
              .datum(pts)
              .attr("fill", "none")
              .attr("stroke", driverColor)
              .attr("stroke-width", 2.2)
              .attr("d", lineGen);

            path.append("title").text(d.driver + " (Elasticity: " + elasticity.toFixed(2) + "x)");

            // Dot points
            pts.forEach(function (pt) {
              g.append("circle")
                .attr("cx", xScale(pt.x))
                .attr("cy", yScale(pt.y))
                .attr("r", 3)
                .attr("fill", driverColor);
            });

            // Legend item
            var legY = idx * 18;
            var legG = svg.append("g")
              .attr("transform", "translate(" + (width - margin.right + 14) + "," + (margin.top + legY) + ")");

            legG.append("line")
              .attr("x1", 0)
              .attr("x2", 12)
              .attr("y1", 5)
              .attr("y2", 5)
              .attr("stroke", driverColor)
              .attr("stroke-width", 2.5);

            legG.append("text")
              .attr("x", 18)
              .attr("y", 9)
              .attr("font-size", 10 * fontScale)
              .attr("font-weight", 600)
              .attr("fill", palette.textPrimary)
              .text(d.driver.length > 14 ? d.driver.substring(0, 13) + "…" : d.driver);
          });
        }

        // MODE 3: CUMULATIVE VARIANCE WATERFALL
        function renderWaterfall(canvas, rows, width, height) {
          canvas.innerHTML = "";
          var margin = { top: 32, right: 40, bottom: 60, left: 70 };
          var w = Math.max(280, width - margin.left - margin.right);
          var h = Math.max(200, height - margin.top - margin.bottom);

          var svg = d3.select(canvas)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("overflow", "visible");

          var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var waterfallSteps = [];
          var runningTotal = globalBaseline;

          waterfallSteps.push({
            name: "Baseline",
            start: 0,
            end: runningTotal,
            val: runningTotal,
            type: "baseline"
          });

          rows.forEach(function (d) {
            var stepVal = d.upsideDelta;
            var nextTotal = runningTotal + stepVal;
            waterfallSteps.push({
              name: d.driver,
              start: runningTotal,
              end: nextTotal,
              val: stepVal,
              type: stepVal >= 0 ? "positive" : "negative",
              drillCell: d.drillCell
            });
            runningTotal = nextTotal;
          });

          waterfallSteps.push({
            name: "Potential Forecast",
            start: 0,
            end: runningTotal,
            val: runningTotal,
            type: "total"
          });

          var xScale = d3.scaleBand()
            .domain(waterfallSteps.map(function (s) { return s.name; }))
            .range([0, w])
            .padding(0.24);

          var minVal = d3.min(waterfallSteps, function (s) { return Math.min(s.start, s.end); }) || 0;
          var maxVal = d3.max(waterfallSteps, function (s) { return Math.max(s.start, s.end); }) || 1;

          var yScale = d3.scaleLinear()
            .domain([Math.min(0, minVal * 0.9), maxVal * 1.15])
            .range([h, 0]);

          // X Axis
          g.append("g")
            .attr("transform", "translate(0," + h + ")")
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-25)")
            .attr("text-anchor", "end")
            .attr("fill", palette.textPrimary)
            .attr("font-size", 9 * fontScale);

          // Y Axis
          g.append("g")
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, valFormat); }))
            .selectAll("text")
            .attr("fill", palette.textMuted)
            .attr("font-size", 10 * fontScale)
            .attr("font-family", "monospace");

          waterfallSteps.forEach(function (s) {
            var x = xScale(s.name);
            var bw = xScale.bandwidth();
            var y = yScale(Math.max(s.start, s.end));
            var bHeight = Math.abs(yScale(s.start) - yScale(s.end));

            var barColor = palette.baseline;
            if (s.type === "positive") barColor = isHigherBetter ? palette.upside : palette.downside;
            if (s.type === "negative") barColor = isHigherBetter ? palette.downside : palette.upside;
            if (s.type === "total") barColor = palette.primary;

            g.append("rect")
              .attr("x", x)
              .attr("y", y)
              .attr("width", bw)
              .attr("height", Math.max(2, bHeight))
              .attr("fill", barColor)
              .attr("rx", 3)
              .style("cursor", s.drillCell ? "pointer" : "default")
              .on("click", function (event) {
                if (s.drillCell && s.drillCell.links && typeof LookerCharts !== "undefined") {
                  LookerCharts.Utils.openDrillMenu({ links: s.drillCell.links, event: event });
                }
              })
              .append("title")
              .text(s.name + ": " + formatValue(s.val, valFormat));

            // Bar Label
            g.append("text")
              .attr("x", x + bw / 2)
              .attr("y", y - 4)
              .attr("text-anchor", "middle")
              .attr("font-size", 9 * fontScale)
              .attr("font-family", "monospace")
              .attr("font-weight", 700)
              .attr("fill", barColor)
              .text((s.type === "positive" ? "+" : "") + formatValue(s.val, valFormat));
          });
        }

        // MODE 4: EXECUTIVE DRIVER RISK MATRIX SCORECARD
        function renderRiskMatrix(canvas, rows, width, height) {
          canvas.innerHTML = "";
          var html =
            '<div style="width:100%;height:100%;overflow-y:auto;box-sizing:border-box;">' +
              '<table style="width:100%;border-collapse:collapse;font-size:' + (11 * fontScale) + 'px;color:' + palette.textPrimary + ';">' +
                '<thead>' +
                  '<tr style="background:' + palette.surface + ';border-bottom:2px solid ' + palette.border + ';font-size:' + (10 * fontScale) + 'px;text-transform:uppercase;letter-spacing:0.04em;color:' + palette.textMuted + ';">' +
                    '<th style="padding:10px 12px;text-align:left;">Rank & Driver</th>' +
                    '<th style="padding:10px 12px;text-align:right;">Downside Risk</th>' +
                    '<th style="padding:10px 12px;text-align:right;">Base Case Target</th>' +
                    '<th style="padding:10px 12px;text-align:right;">Upside Opportunity</th>' +
                    '<th style="padding:10px 12px;text-align:right;">Total Swing Spread</th>' +
                    '<th style="padding:10px 12px;text-align:center;">Volatility Share</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  rows.map(function (r, idx) {
                    var pctTotalSwing = totalDownsideRisk + totalUpsideOpp > 0 ? (r.totalSwing / (totalDownsideRisk + totalUpsideOpp)) * 100 : 0;
                    return (
                      '<tr style="border-bottom:1px solid ' + palette.border + ';transition:background 0.15s;" onmouseover="this.style.background=\'' + palette.surface + '\'" onmouseout="this.style.background=\'transparent\'">' +
                        '<td style="padding:10px 12px;font-weight:700;">' +
                          '<span style="font-family:monospace;color:' + palette.textMuted + ';margin-right:6px;">#' + (idx + 1) + '</span>' +
                          r.driver +
                        '</td>' +
                        '<td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:700;color:' + (isHigherBetter ? palette.downside : palette.upside) + ';">' +
                          formatValue(r.downsideDelta, valFormat) +
                        '</td>' +
                        '<td style="padding:10px 12px;text-align:right;font-family:monospace;color:' + palette.textMuted + ';">' +
                          formatValue(r.baseVal, valFormat) +
                        '</td>' +
                        '<td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:700;color:' + (isHigherBetter ? palette.upside : palette.downside) + ';">' +
                          '+' + formatValue(r.upsideDelta, valFormat) +
                        '</td>' +
                        '<td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:800;color:' + palette.textPrimary + ';">' +
                          formatValue(r.totalSwing, valFormat) +
                        '</td>' +
                        '<td style="padding:10px 12px;text-align:center;">' +
                          '<div style="display:inline-flex;align-items:center;gap:6px;">' +
                            '<div style="width:50px;height:6px;background:' + palette.surface + ';border:1px solid ' + palette.border + ';border-radius:999px;overflow:hidden;">' +
                              '<div style="width:' + pctTotalSwing.toFixed(0) + '%;height:100%;background:' + palette.primary + ';"></div>' +
                            '</div>' +
                            '<span style="font-size:10px;font-family:monospace;font-weight:700;">' + pctTotalSwing.toFixed(1) + '%</span>' +
                          '</div>' +
                        '</td>' +
                      '</tr>'
                    );
                  }).join("") +
                '</tbody>' +
              '</table>' +
            '</div>';
          canvas.innerHTML = html;
        }

        renderTornadoUI();
        done();
      });
    }
  });
})();
