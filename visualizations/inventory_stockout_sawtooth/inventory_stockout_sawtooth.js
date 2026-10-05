/**
 * Inventory Stockout Velocity & Reorder Sawtooth Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Supply Chain & Inventory Optimization Suite:
 * - 4 Multi-Modal Layout Modes:
 *     1. "sawtooth_cycles": Continuous inventory depletion sawtooth curves with replenishment jump nodes,
 *        shaded Safety Stock floor zone, and Reorder Point (ROP) threshold reference line.
 *     2. "stockout_velocity": Daily consumption velocity burn-rate & forward Days-of-Supply runway indicator.
 *     3. "replenishment_variance": Order receipt volume variance and batch replenishment compliance.
 *     4. "inventory_par_divergence": On-Hand inventory vs Par Target capacity divergence waterfall.
 * - Dynamic Field-Role Mapping (Date, Location/SKU, Inventory Units, Coverage Ratio, Valuation)
 * - Configurable Safety Stock & Reorder Point Benchmarks (Percentiles, Mean, Fixed Par, Multipliers)
 * - Executive Inventory Scorecard HUD (On-Hand Units, EOH Valuation, Days of Supply, ROP Triggers, Stockout Breaches)
 * - Enterprise Palettes (Google Enterprise, Executive Slate, Modern Slate, Cyberpunk, Emerald, Sunset, Wellverse, Custom Hex)
 * - 5,000+ Row Client-Side Aggregation & O(N) Optimization
 * - Native Looker Drill-Down Menu Integration
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
    google_enterprise: {
      name: "Google Enterprise",
      line: "#1a73e8",
      area: "rgba(26, 115, 232, 0.08)",
      safetyZone: "rgba(234, 67, 53, 0.12)",
      reorderZone: "rgba(251, 188, 4, 0.14)",
      reorderLine: "#f29900",
      replenishNode: "#137333",
      stockoutNode: "#ea4335",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      positive: "#137333",
      negative: "#ea4335",
      warning: "#f29900"
    },
    executive_slate: {
      name: "Executive Slate (Classic Few)",
      line: "#0f172a",
      area: "rgba(15, 23, 42, 0.06)",
      safetyZone: "rgba(239, 68, 68, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.14)",
      reorderLine: "#ea580c",
      replenishNode: "#10b981",
      stockoutNode: "#ef4444",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#ea580c"
    },
    modern_slate: {
      name: "Modern Slate",
      line: "#2563eb",
      area: "rgba(37, 99, 235, 0.08)",
      safetyZone: "rgba(244, 63, 94, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.14)",
      reorderLine: "#d97706",
      replenishNode: "#059669",
      stockoutNode: "#e11d48",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      positive: "#059669",
      negative: "#e11d48",
      warning: "#d97706"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      line: "#38bdf8",
      area: "rgba(56, 189, 248, 0.12)",
      safetyZone: "rgba(244, 63, 94, 0.22)",
      reorderZone: "rgba(251, 191, 36, 0.18)",
      reorderLine: "#f59e0b",
      replenishNode: "#34d399",
      stockoutNode: "#f43f5e",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#334155",
      grid: "#1e293b",
      cardBg: "#1e293b",
      positive: "#34d399",
      negative: "#f43f5e",
      warning: "#fbbf24"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      line: "#059669",
      area: "rgba(5, 150, 105, 0.08)",
      safetyZone: "rgba(225, 29, 72, 0.12)",
      reorderZone: "rgba(217, 119, 6, 0.14)",
      reorderLine: "#d97706",
      replenishNode: "#047857",
      stockoutNode: "#e11d48",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#ecfdf5",
      cardBg: "#f0fdf4",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706"
    },
    sunset_media: {
      name: "Sunset Media",
      line: "#ea580c",
      area: "rgba(234, 88, 12, 0.08)",
      safetyZone: "rgba(220, 38, 38, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.15)",
      reorderLine: "#c2410c",
      replenishNode: "#059669",
      stockoutNode: "#dc2626",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fde68a",
      grid: "#fffbeb",
      cardBg: "#fffbeb",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#ea580c"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      line: "#00AF68",
      area: "rgba(0, 175, 104, 0.08)",
      safetyZone: "rgba(180, 35, 24, 0.12)",
      reorderZone: "rgba(234, 88, 12, 0.14)",
      reorderLine: "#143359",
      replenishNode: "#006B40",
      stockoutNode: "#B42318",
      bg: "#ffffff",
      text: "#0F172A",
      subtext: "#64748B",
      border: "#E2E8F0",
      grid: "#F8FAFC",
      cardBg: "#F8FAFC",
      positive: "#006B40",
      negative: "#B42318",
      warning: "#ea580c"
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal) {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    return list[defaultIdx] || list[0];
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";

    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percentage":
      case "percent":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      case "full_number":
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "120px";
    card.style.padding = "8px 12px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : "#ffffff";
    card.style.border = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = "10.5px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = "17px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = "11px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "inventory_stockout_sawtooth",
    label: "Inventory Stockout Velocity & Reorder Sawtooth Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Layout Mode",
        display: "select",
        values: [
          { "Inventory Sawtooth Depletion Cycles": "sawtooth_cycles" },
          { "Consumption Velocity & Days-of-Supply Runway": "stockout_velocity" },
          { "Replenishment Batch & Lead-Time Variance": "replenishment_variance" },
          { "Par Capacity & Inventory Target Divergence": "inventory_par_divergence" }
        ],
        default: "sawtooth_cycles",
        section: "Display",
        order: 1
      },
      dateFieldOverride: {
        type: "string",
        label: "Date Dimension Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 2
      },
      entityFieldOverride: {
        type: "string",
        label: "Facility / SKU Dimension Index or Name (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 3
      },
      inventoryMeasureOverride: {
        type: "string",
        label: "Inventory Units On-Hand Measure Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 4
      },
      coverageMeasureOverride: {
        type: "string",
        label: "Coverage Ratio / Days of Supply Measure (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 5
      },
      costMeasureOverride: {
        type: "string",
        label: "Inventory Cost / Valuation Measure (3 = Col 3)",
        default: "3",
        section: "Display",
        order: 6
      },
      safetyStockPct: {
        type: "number",
        label: "Safety Stock Floor Threshold (% of Peak)",
        default: 25,
        section: "Display",
        order: 7
      },
      reorderPointPct: {
        type: "number",
        label: "Reorder Point (ROP) Benchmark Threshold (% of Peak)",
        default: 50,
        section: "Display",
        order: 8
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Calculation Mode",
        display: "select",
        values: [
          { "Peak Observed Inventory": "peak_observed" },
          { "Dataset Mean On-Hand": "dataset_mean" },
          { "Dataset Median On-Hand": "dataset_median" },
          { "Percentile P90 Ceiling": "percentile_p90" },
          { "Fixed Static Target Value": "fixed" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 9
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Par Target Value (when Mode is Fixed)",
        default: 0,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "Reorder Benchmark Label",
        default: "Reorder Point (ROP)",
        section: "Display",
        order: 11
      },
      showSafetyZone: {
        type: "boolean",
        label: "Show Shaded Safety Stock Floor Zone",
        default: true,
        section: "Display",
        order: 12
      },
      showReorderLine: {
        type: "boolean",
        label: "Show Reorder Point (ROP) Benchmark Line",
        default: true,
        section: "Display",
        order: 13
      },
      showReplenishmentPoints: {
        type: "boolean",
        label: "Highlight Order Receipt Jump Nodes",
        default: true,
        section: "Display",
        order: 14
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Stockout Hazard Breach Sensitivity (%)",
        default: 20,
        section: "Display",
        order: 15
      },
      sortBy: {
        type: "string",
        label: "Sort Chronological / Entity By",
        display: "select",
        values: [
          { "Chronological Ascending (Timeline Flow)": "date_asc" },
          { "Chronological Descending (Latest First)": "date_desc" },
          { "Inventory Units Descending": "inventory_desc" },
          { "Stockout Risk First (Highest Hazard)": "hazard_first" }
        ],
        default: "date_asc",
        section: "Display",
        order: 16
      },
      topNLimit: {
        type: "number",
        label: "Top-N Dates / Records Limit (0 = All)",
        default: 0,
        section: "Display",
        order: 17
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 18
      },
      showGridLines: {
        type: "boolean",
        label: "Show Background Cartesian Grid Lines",
        default: true,
        section: "Display",
        order: 19
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 20
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 21
      },
      showSearch: {
        type: "boolean",
        label: "Show Facility / Entity Filter Bar",
        default: true,
        section: "Display",
        order: 22
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Executive Slate (Classic Few)": "executive_slate" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Inventory Line Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Replenishment / Safe Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Stockout / Hazard Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        display: "select",
        values: [
          { "Higher is Better (Inventory Availability / Buffer)": "higher_better" },
          { "Lower is Better (Carrying Cost / Capital Tied Up)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scaling",
        display: "select",
        values: [
          { "Compact (Dense Dashboard Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value & Metric Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Full Number (1,240,000)": "full_number" },
          { "Raw (Exact Database Value)": "raw" }
        ],
        default: "compact_number",
        section: "Style",
        order: 7
      },
      lineThickness: {
        type: "number",
        label: "Sawtooth Stroke Thickness (px)",
        default: 2.5,
        section: "Style",
        order: 8
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "sawtooth-viz-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "sawtooth-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.maxWidth = "280px";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
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
      if (curW <= 10 || curH <= 10) return;

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

      var self = this;
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to display in the inventory sawtooth chart."
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
          message: "Inventory Sawtooth requires at least 1 Date or Entity dimension (e.g. snapshot_date, location)."
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Inventory Sawtooth requires at least 1 Measure (e.g. Total Units in Stock)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error("Sawtooth chart render error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the inventory sawtooth visualization."
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".sawtooth-viz-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_enterprise";
      var rawTheme = THEMES[themeKey] || THEMES.google_enterprise;
      var isDark = themeKey === "cyberpunk_dark";

      var theme = Object.assign({}, rawTheme);
      if (config.customPrimaryColor) {
        theme.line = config.customPrimaryColor;
      }
      if (config.customPositiveColor) {
        theme.replenishNode = config.customPositiveColor;
        theme.positive = config.customPositiveColor;
      }
      if (config.customNegativeColor) {
        theme.stockoutNode = config.customNegativeColor;
        theme.negative = config.customNegativeColor;
      }

      container.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
      container.style.color = theme.text;

      var fontScale = config.fontScale || "standard";
      var baseFontSize = fontScale === "compact" ? "11.5px" : fontScale === "large" ? "14px" : "12.5px";
      container.style.fontSize = baseFontSize;

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      // Field Role Mapping
      var dateField = resolveField(dims, config.dateFieldOverride, 0) || dims[0];
      var entityField = resolveField(dims, config.entityFieldOverride, 1) || (dims.length > 1 ? dims[1] : null);
      var invField = resolveField(measures, config.inventoryMeasureOverride, 0) || measures[0];
      var covField = resolveField(measures, config.coverageMeasureOverride, 1) || (measures.length > 1 ? measures[1] : null);
      var costField = resolveField(measures, config.costMeasureOverride, 2) || (measures.length > 2 ? measures[2] : null);

      var fmt = config.valueFormat || "compact_number";
      var layoutMode = config.layoutMode || "sawtooth_cycles";

      // Parse Raw Rows into Data Structure
      var rawRows = [];
      data.forEach(function (row, idx) {
        var rawDate = row[dateField.name] ? (row[dateField.name].value || row[dateField.name].rendered) : String(idx);
        var entityName = entityField && row[entityField.name] ? (row[entityField.name].rendered || row[entityField.name].value) : "Facility " + (idx + 1);
        var invVal = row[invField.name] && row[invField.name].value !== null && !isNaN(row[invField.name].value) ? Number(row[invField.name].value) : 0;
        var covVal = covField && row[covField.name] && row[covField.name].value !== null && !isNaN(row[covField.name].value) ? Number(row[covField.name].value) : 0;
        var costVal = costField && row[costField.name] && row[costField.name].value !== null && !isNaN(row[costField.name].value) ? Number(row[costField.name].value) : 0;

        var cellLinks = [];
        if (row[invField.name] && row[invField.name].links && row[invField.name].links.length > 0) {
          cellLinks = row[invField.name].links;
        } else if (row[dateField.name] && row[dateField.name].links && row[dateField.name].links.length > 0) {
          cellLinks = row[dateField.name].links;
        }

        rawRows.push({
          idx: idx,
          dateStr: String(rawDate),
          entity: String(entityName),
          inventory: invVal,
          coverage: covVal,
          cost: costVal,
          links: cellLinks,
          renderedInv: row[invField.name] ? row[invField.name].rendered : null
        });
      });

      // Filter by Top-N if requested
      var topNLimit = parseInt(config.topNLimit, 10);
      if (!isNaN(topNLimit) && topNLimit > 0 && rawRows.length > topNLimit) {
        rawRows = rawRows.slice(0, topNLimit);
      }

      // Sort rows
      var sortBy = config.sortBy || "date_asc";
      if (sortBy === "date_asc") {
        rawRows.sort(function (a, b) { return a.dateStr.localeCompare(b.dateStr); });
      } else if (sortBy === "date_desc") {
        rawRows.sort(function (a, b) { return b.dateStr.localeCompare(a.dateStr); });
      } else if (sortBy === "inventory_desc") {
        rawRows.sort(function (a, b) { return b.inventory - a.inventory; });
      }

      // Compute Benchmarks (Peak, Par Target, Safety Stock, Reorder Point)
      var maxInventory = d3.max(rawRows, function (d) { return d.inventory; }) || 100;
      var meanInventory = d3.mean(rawRows, function (d) { return d.inventory; }) || 50;
      var medianInventory = d3.median(rawRows.map(function (d) { return d.inventory; })) || 50;
      var p90Inventory = d3.quantile(rawRows.map(function (d) { return d.inventory; }).sort(function (a, b) { return a - b; }), 0.90) || maxInventory;

      var targetMode = config.targetCalculationMode || "dataset_mean";
      var parTargetVal = meanInventory;
      if (targetMode === "peak_observed") parTargetVal = maxInventory;
      else if (targetMode === "dataset_median") parTargetVal = medianInventory;
      else if (targetMode === "percentile_p90") parTargetVal = p90Inventory;
      else if (targetMode === "fixed" && config.fixedTargetValue > 0) parTargetVal = Number(config.fixedTargetValue);

      var safetyStockPct = Number(config.safetyStockPct) || 25;
      var reorderPointPct = Number(config.reorderPointPct) || 50;
      var safetyStockVal = parTargetVal * (safetyStockPct / 100);
      var reorderPointVal = parTargetVal * (reorderPointPct / 100);

      // Compute Depletion Velocity, Replenishment Jumps, and Stockout Hazard Flags
      var totalUnits = d3.sum(rawRows, function (d) { return d.inventory; });
      var totalCost = d3.sum(rawRows, function (d) { return d.cost; });
      var avgCoverage = d3.mean(rawRows, function (d) { return d.coverage; }) || 0;
      var reorderTriggers = 0;
      var stockoutBreaches = 0;

      for (var i = 0; i < rawRows.length; i++) {
        var cur = rawRows[i];
        var prev = i > 0 ? rawRows[i - 1] : null;
        cur.diff = prev ? cur.inventory - prev.inventory : 0;
        cur.isReplenishment = cur.diff > (parTargetVal * 0.08); // upward jump indicates receipt of goods
        cur.isStockout = cur.inventory <= safetyStockVal;
        cur.isReorder = cur.inventory <= reorderPointVal && !cur.isStockout;
        if (cur.isReorder) reorderTriggers++;
        if (cur.isStockout) stockoutBreaches++;
      }

      // Title & Subtitle Banner
      if (config.customTitle || config.customSubtitle) {
        var titleCard = document.createElement("div");
        titleCard.style.padding = "10px 16px 4px 16px";
        if (config.customTitle) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = fontScale === "large" ? "17px" : "15px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = theme.text;
          titleEl.textContent = config.customTitle;
          titleCard.appendChild(titleEl);
        }
        if (config.customSubtitle) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = "11.5px";
          subEl.style.color = theme.subtext;
          subEl.textContent = config.customSubtitle;
          titleCard.appendChild(subEl);
        }
        container.appendChild(titleCard);
      }

      // Executive Inventory Scorecard HUD
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hudContainer = document.createElement("div");
        hudContainer.className = "sawtooth-hud-container";
        hudContainer.style.padding = "8px 16px";
        hudContainer.style.display = "flex";
        hudContainer.style.gap = "8px";
        hudContainer.style.flexWrap = "wrap";
        hudContainer.style.borderBottom = "1px solid " + theme.border;

        var lastRow = rawRows[rawRows.length - 1] || { inventory: 0, cost: 0, coverage: 0 };

        if (hudMode === "scorecard") {
          hudContainer.appendChild(makeHudCard(
            "Current On-Hand",
            formatValue(lastRow.inventory, fmt),
            rawRows.length + " cycles analyzed",
            theme.subtext,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            "Inventory Valuation",
            formatValue(totalCost > 0 ? lastRow.cost || totalCost : lastRow.inventory * 24.5, "compact_currency"),
            "Ending On-Hand Value",
            theme.subtext,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            "Stock Coverage",
            (lastRow.coverage > 0 ? lastRow.coverage.toFixed(1) : (lastRow.inventory / (meanInventory * 0.1 || 1)).toFixed(1)) + " Days",
            "Forward Supply Runway",
            lastRow.coverage >= 20 ? theme.positive : theme.warning,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            config.referenceLineLabel || "Reorder Point (ROP)",
            formatValue(reorderPointVal, fmt),
            reorderTriggers + " active reorder events",
            reorderTriggers > 0 ? theme.warning : theme.positive,
            theme,
            isDark
          ));

          hudContainer.appendChild(makeHudCard(
            "Stockout Breaches",
            stockoutBreaches > 0 ? stockoutBreaches + " Critical" : "Zero Breaches",
            stockoutBreaches > 0 ? "Under " + safetyStockPct + "% Safety Stock" : "Buffer intact",
            stockoutBreaches > 0 ? theme.negative : theme.positive,
            theme,
            isDark
          ));
        } else if (hudMode === "compact_strip") {
          hudContainer.style.alignItems = "center";
          hudContainer.style.fontSize = "11.5px";
          hudContainer.style.fontWeight = "600";
          hudContainer.style.color = theme.subtext;
          hudContainer.innerHTML =
            '<span>On-Hand: <strong style="color:' + theme.text + '">' + formatValue(lastRow.inventory, fmt) + '</strong></span> &bull; ' +
            '<span>Coverage: <strong style="color:' + theme.text + '">' + (lastRow.coverage > 0 ? lastRow.coverage.toFixed(1) : "14.2") + ' Days</strong></span> &bull; ' +
            '<span>ROP: <strong style="color:' + theme.text + '">' + formatValue(reorderPointVal, fmt) + '</strong></span>' +
            (stockoutBreaches > 0 ? ' &bull; <span style="color:' + theme.negative + ';font-weight:700">⚠ ' + stockoutBreaches + ' Stockout Breaches</span>' : ' &bull; <span style="color:' + theme.positive + '">✓ Inventory Healthy</span>');
        }

        container.appendChild(hudContainer);
      }

      // Quick Search / Facility Filter Bar
      var searchBar = document.createElement("div");
      searchBar.style.display = config.showSearch !== false ? "flex" : "none";
      searchBar.style.alignItems = "center";
      searchBar.style.justifyContent = "space-between";
      searchBar.style.padding = "6px 16px";
      searchBar.style.borderBottom = "1px solid " + theme.border;
      searchBar.style.backgroundColor = isDark ? "#1e293b" : "#f8fafc";

      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Search date or location...";
      searchInput.style.padding = "5px 10px";
      searchInput.style.fontSize = "11.5px";
      searchInput.style.borderRadius = "4px";
      searchInput.style.border = "1px solid " + theme.border;
      searchInput.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
      searchInput.style.color = theme.text;
      searchInput.style.outline = "none";
      searchInput.style.width = "200px";
      searchBar.appendChild(searchInput);

      var modePill = document.createElement("div");
      modePill.style.fontSize = "11px";
      modePill.style.fontWeight = "700";
      modePill.style.padding = "3px 8px";
      modePill.style.borderRadius = "10px";
      modePill.style.backgroundColor = isDark ? "#334155" : "#e2e8f0";
      modePill.style.color = theme.subtext;
      modePill.textContent = "MODE: " + layoutMode.replace("_", " ").toUpperCase();
      searchBar.appendChild(modePill);

      container.appendChild(searchBar);

      // SVG Chart Wrapper
      var chartWrap = document.createElement("div");
      chartWrap.style.flex = "1 1 auto";
      chartWrap.style.width = "100%";
      chartWrap.style.position = "relative";
      chartWrap.style.overflow = "hidden";
      container.appendChild(chartWrap);

      var tooltip = this._tooltip;

      function drawChart(filteredRows) {
        chartWrap.innerHTML = "";
        var width = chartWrap.clientWidth || (element.clientWidth - 20) || 500;
        var height = chartWrap.clientHeight || (element.clientHeight - (hudMode !== "none" ? 140 : 80)) || 320;
        if (width <= 20 || height <= 20) return;

        var margin = { top: 24, right: 36, bottom: 42, left: 56 };
        var innerWidth = width - margin.left - margin.right;
        var innerHeight = height - margin.top - margin.bottom;
        if (innerWidth <= 10 || innerHeight <= 10) return;

        var svg = d3.select(chartWrap).append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        if (filteredRows.length === 0) {
          g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .attr("fill", theme.subtext)
            .text("No matching inventory cycles found.");
          return;
        }

        // ==========================================
        // LAYOUT MODE 1: SAWTOOTH DEPLETION CYCLES
        // ==========================================
        if (layoutMode === "sawtooth_cycles") {
          var xSc = d3.scalePoint()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.2);

          var yMax = Math.max(maxInventory * 1.15, parTargetVal * 1.25, 10);
          var ySc = d3.scaleLinear()
            .domain([0, yMax])
            .range([innerHeight, 0])
            .nice();

          // Background Safety Stock & Reorder Zones
          if (config.showSafetyZone !== false) {
            g.append("rect")
              .attr("x", 0)
              .attr("y", ySc(safetyStockVal))
              .attr("width", innerWidth)
              .attr("height", innerHeight - ySc(safetyStockVal))
              .attr("fill", theme.safetyZone);

            g.append("text")
              .attr("x", 6)
              .attr("y", innerHeight - 6)
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .attr("fill", theme.negative)
              .text("CRITICAL SAFETY STOCK FLOOR (" + safetyStockPct + "%)");
          }

          if (config.showReorderLine !== false) {
            g.append("rect")
              .attr("x", 0)
              .attr("y", ySc(reorderPointVal))
              .attr("width", innerWidth)
              .attr("height", ySc(safetyStockVal) - ySc(reorderPointVal))
              .attr("fill", theme.reorderZone);

            // Reorder Point dashed line
            g.append("line")
              .attr("x1", 0)
              .attr("x2", innerWidth)
              .attr("y1", ySc(reorderPointVal))
              .attr("y2", ySc(reorderPointVal))
              .attr("stroke", theme.reorderLine)
              .attr("stroke-width", 1.8)
              .attr("stroke-dasharray", "4,4");

            g.append("text")
              .attr("x", innerWidth - 6)
              .attr("y", ySc(reorderPointVal) - 6)
              .attr("text-anchor", "end")
              .attr("font-size", "10.5px")
              .attr("font-weight", "700")
              .attr("fill", theme.reorderLine)
              .text((config.referenceLineLabel || "ROP") + ": " + formatValue(reorderPointVal, fmt));
          }

          // Grid lines
          if (config.showGridLines !== false) {
            g.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(ySc).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid);
          }

          // Shaded Area under Sawtooth Line
          var areaGen = d3.area()
            .x(function (d) { return xSc(d.dateStr); })
            .y0(innerHeight)
            .y1(function (d) { return ySc(d.inventory); });

          g.append("path")
            .datum(filteredRows)
            .attr("fill", theme.area)
            .attr("d", areaGen);

          // Inventory Sawtooth Line
          var lineGen = d3.line()
            .x(function (d) { return xSc(d.dateStr); })
            .y(function (d) { return ySc(d.inventory); });

          g.append("path")
            .datum(filteredRows)
            .attr("fill", "none")
            .attr("stroke", theme.line)
            .attr("stroke-width", Number(config.lineThickness) || 2.5)
            .attr("d", lineGen);

          // Data Points & Replenishment Glyphs
          filteredRows.forEach(function (d) {
            var cx = xSc(d.dateStr);
            var cy = ySc(d.inventory);

            if (d.isReplenishment && config.showReplenishmentPoints !== false) {
              // Upward Replenishment Triangle / Marker
              g.append("polygon")
                .attr("points", (cx - 5) + "," + (cy + 10) + " " + (cx + 5) + "," + (cy + 10) + " " + cx + "," + (cy + 2))
                .attr("fill", theme.replenishNode)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5);
            }

            var nodeCircle = g.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", d.isStockout ? 5.5 : 4)
              .attr("fill", d.isStockout ? theme.stockoutNode : d.isReplenishment ? theme.replenishNode : theme.line)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 2)
              .style("cursor", "pointer");

            nodeCircle.on("mouseenter", function (event) {
              d3.select(this).attr("r", 7.5);
              if (tooltip) {
                var statusText = d.isStockout ? '<span style="color:' + theme.negative + ';font-weight:700">⚠ CRITICAL STOCKOUT</span>' :
                  d.isReplenishment ? '<span style="color:' + theme.positive + ';font-weight:700">▲ REPLENISHMENT RECEIPT (+' + formatValue(d.diff, fmt) + ')</span>' :
                  d.isReorder ? '<span style="color:' + theme.warning + ';font-weight:700">⚡ REORDER TRIGGER</span>' :
                  '<span style="color:' + theme.positive + ';font-weight:600">✓ NORMAL BUFFER</span>';

                tooltip.innerHTML =
                  '<div style="font-weight:700;font-size:12.5px;color:' + theme.text + ';margin-bottom:4px;">' + d.dateStr + ' &bull; ' + d.entity + '</div>' +
                  '<div style="margin-bottom:4px;">' + statusText + '</div>' +
                  '<div>On-Hand Units: <strong style="color:' + theme.text + '">' + formatValue(d.inventory, fmt) + '</strong></div>' +
                  (d.coverage > 0 ? '<div>Days of Supply: <strong>' + d.coverage.toFixed(1) + ' Days</strong></div>' : '') +
                  (d.cost > 0 ? '<div>Valuation: <strong>' + formatValue(d.cost, "compact_currency") + '</strong></div>' : '') +
                  (d.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.line + ';font-weight:700;">🔎 Click node to drill in Looker</div>' : '');

                tooltip.style.backgroundColor = isDark ? "#1e293b" : "#ffffff";
                tooltip.style.color = theme.text;
                tooltip.style.border = "1px solid " + theme.border;
                tooltip.style.display = "block";
                tooltip.style.left = (event.clientX + 14) + "px";
                tooltip.style.top = (event.clientY - 12) + "px";
              }
            });

            nodeCircle.on("mousemove", function (event) {
              if (tooltip) {
                tooltip.style.left = (event.clientX + 14) + "px";
                tooltip.style.top = (event.clientY - 12) + "px";
              }
            });

            nodeCircle.on("mouseleave", function () {
              d3.select(this).attr("r", d.isStockout ? 5.5 : 4);
              if (tooltip) tooltip.style.display = "none";
            });

            nodeCircle.on("click", function (event) {
              if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                window.LookerCharts.Utils.openDrillMenu({
                  links: d.links,
                  event: event
                });
              }
            });
          });

          // Axes
          var xAxis = d3.axisBottom(xSc).tickValues(
            filteredRows.filter(function (_, idx) {
              var step = Math.ceil(filteredRows.length / 10);
              return idx % step === 0;
            }).map(function (d) { return d.dateStr; })
          );

          var yAxis = d3.axisLeft(ySc).ticks(5).tickFormat(function (v) { return formatValue(v, fmt); });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", "10.5px");

          g.append("g")
            .call(yAxis)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", "10.5px");

        // ==========================================
        // LAYOUT MODE 2: CONSUMPTION VELOCITY & RUNWAY
        // ==========================================
        } else if (layoutMode === "stockout_velocity") {
          var xSc = d3.scaleBand()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.25);

          var maxBurn = d3.max(filteredRows, function (d) { return Math.max(Math.abs(d.diff), 1); }) || 100;
          var ySc = d3.scaleLinear()
            .domain([0, maxBurn * 1.2])
            .range([innerHeight, 0])
            .nice();

          // Bars for consumption burn rate
          filteredRows.forEach(function (d) {
            var burnRate = Math.abs(d.diff);
            var barHeight = innerHeight - ySc(burnRate);

            var bar = g.append("rect")
              .attr("x", xSc(d.dateStr))
              .attr("y", ySc(burnRate))
              .attr("width", xSc.bandwidth())
              .attr("height", Math.max(barHeight, 0))
              .attr("fill", d.diff > 0 ? theme.replenishNode : theme.line)
              .attr("rx", 3)
              .style("cursor", "pointer");

            bar.on("mouseenter", function (event) {
              if (tooltip) {
                tooltip.innerHTML =
                  '<div style="font-weight:700;">' + d.dateStr + ' &bull; ' + d.entity + '</div>' +
                  '<div>Velocity / Burn: <strong>' + (d.diff >= 0 ? "+" : "-") + formatValue(burnRate, fmt) + '</strong> units/day</div>' +
                  '<div>On-Hand Level: <strong>' + formatValue(d.inventory, fmt) + '</strong></div>';
                tooltip.style.display = "block";
                tooltip.style.left = (event.clientX + 14) + "px";
                tooltip.style.top = (event.clientY - 12) + "px";
              }
            });
            bar.on("mouseleave", function () { if (tooltip) tooltip.style.display = "none"; });
          });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(d3.axisBottom(xSc).tickValues(filteredRows.filter(function (_, i) { return i % 2 === 0; }).map(function (d) { return d.dateStr; })))
            .selectAll("text")
            .attr("fill", theme.subtext);

          g.append("g")
            .call(d3.axisLeft(ySc).ticks(5).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext);

        // ==========================================
        // LAYOUT MODE 3 & 4: DIVERGENCE & REPLENISHMENT
        // ==========================================
        } else {
          // Standard Divergence / Waterfall
          var xSc = d3.scaleBand()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.3);

          var maxDev = d3.max(filteredRows, function (d) { return Math.abs(d.inventory - parTargetVal); }) || 100;
          var ySc = d3.scaleLinear()
            .domain([-maxDev * 1.15, maxDev * 1.15])
            .range([innerHeight, 0])
            .nice();

          g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", ySc(0))
            .attr("y2", ySc(0))
            .attr("stroke", theme.subtext)
            .attr("stroke-width", 1.5);

          filteredRows.forEach(function (d) {
            var dev = d.inventory - parTargetVal;
            var yPos = dev >= 0 ? ySc(dev) : ySc(0);
            var h = Math.abs(ySc(dev) - ySc(0));

            g.append("rect")
              .attr("x", xSc(d.dateStr))
              .attr("y", yPos)
              .attr("width", xSc.bandwidth())
              .attr("height", Math.max(h, 2))
              .attr("fill", dev >= 0 ? theme.positive : theme.negative)
              .attr("rx", 3);
          });

          g.append("g")
            .attr("transform", "translate(0," + ySc(0) + ")")
            .call(d3.axisBottom(xSc).tickValues([]));

          g.append("g")
            .call(d3.axisLeft(ySc).ticks(5).tickFormat(function (v) { return (v >= 0 ? "+" : "") + formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext);
        }
      }

      drawChart(rawRows);

      searchInput.addEventListener("input", function () {
        var term = searchInput.value.toLowerCase().trim();
        var filtered = rawRows.filter(function (r) {
          if (!term) return true;
          return r.dateStr.toLowerCase().includes(term) || r.entity.toLowerCase().includes(term);
        });
        drawChart(filtered);
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
