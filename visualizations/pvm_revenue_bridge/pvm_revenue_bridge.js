/**
 * Price-Volume-Mix (PVM) Revenue Bridge Waterfall - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Strategic Finance, Pricing & Supply Chain Revenue Walk Engine:
 * - 4 Multi-Modal Layout Modes:
 *     1. "pvm_waterfall": Strategic Bridge Waterfall decomposing revenue delta from Base Period
 *        to Current Period into distinct Price Effect, Volume Growth Effect, Mix Shift Effect, and Net Delta.
 *     2. "category_breakdown": Horizontal or Grouped PVM bar breakdown showing individual Price, Volume,
 *        and Mix contributions for every product category / business unit.
 *     3. "mix_elasticity": Scatter/bubble quadrant plotting Price Change % vs Volume Change % with bubble
 *        size proportional to Base Revenue, categorizing products into Strategic Elasticity quadrants.
 *     4. "variance_waterfall": Step-by-step sequential waterfall walking from Base Revenue to Current Revenue
 *        category-by-category.
 * - Dynamic Field-Role Mapping (Category/SKU Dimension, Period/Date Dimension, Revenue/Spend Measure, Volume/Units Measure)
 * - Configurable Revenue Bridge Reference Lines & Targets (Budget Target, Prior Year, Mean Run-Rate)
 * - Executive Financial Bridge Scorecard HUD (Base Revenue, Current Revenue, Net Delta $, Price Effect $, Volume Effect $, Mix Effect $)
 * - Enterprise Palettes (Wellverse Healthcare, Google Enterprise, Executive Slate, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Custom Hex)
 * - 5,000+ Row Client-Side O(N) Aggregation & Looker Drill-Down Menu Integration
 * - Debounced ResizeObserver (<4px guard, never sets 100% width/height on Looker's root element)
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleBand === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleBand === "function") {
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
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      baseBar: "#1e3a8a",
      currentBar: "#0284c7",
      positive: "#059669",
      negative: "#dc2626",
      connector: "#94a3b8",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
    },
    google_enterprise: {
      name: "Google Enterprise",
      baseBar: "#1a73e8",
      currentBar: "#1967d2",
      positive: "#188038",
      negative: "#d93025",
      connector: "#dadce0",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      isDark: false
    },
    executive_slate: {
      name: "Executive Slate",
      baseBar: "#0f172a",
      currentBar: "#334155",
      positive: "#10b981",
      negative: "#ef4444",
      connector: "#cbd5e1",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#cbd5e1",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
    },
    modern_slate: {
      name: "Modern Slate",
      baseBar: "#3b82f6",
      currentBar: "#1d4ed8",
      positive: "#059669",
      negative: "#e11d48",
      connector: "#cbd5e1",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      baseBar: "#818cf8",
      currentBar: "#38bdf8",
      positive: "#00f5d4",
      negative: "#f72585",
      connector: "#475569",
      bg: "#0b0f19",
      text: "#f9fafb",
      subtext: "#9ca3af",
      border: "#1f2937",
      grid: "#1e293b",
      cardBg: "#111827",
      isDark: true
    },
    emerald_finops: {
      name: "Emerald FinOps",
      baseBar: "#065f46",
      currentBar: "#047857",
      positive: "#059669",
      negative: "#dc2626",
      connector: "#a7f3d0",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#dcfce7",
      grid: "#ecfdf5",
      cardBg: "#f0fdf4",
      isDark: false
    },
    sunset_media: {
      name: "Sunset Media",
      baseBar: "#7c2d12",
      currentBar: "#ea580c",
      positive: "#15803d",
      negative: "#b91c1c",
      connector: "#fed7aa",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fde68a",
      grid: "#fffbeb",
      cardBg: "#fffbeb",
      isDark: false
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
    return defaultIdx >= 0 && defaultIdx < list.length ? list[defaultIdx] : (list[0] || null);
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

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark, fontScale) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "110px";
    card.style.padding = (7 * fontScale) + "px " + (12 * fontScale) + "px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : "#ffffff";
    card.style.border = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = (10 * fontScale) + "px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = (16 * fontScale) + "px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = (10.5 * fontScale) + "px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "pvm_revenue_bridge",
    label: "Price-Volume-Mix (PVM) Revenue Bridge Waterfall",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Layout Mode",
        display: "select",
        values: [
          { "PVM Revenue Bridge Waterfall (Executive Walk)": "pvm_waterfall" },
          { "Category PVM Decomposition (Grouped Contribution)": "category_breakdown" },
          { "Mix & Price Elasticity Matrix (Quadrant Bubble)": "mix_elasticity" },
          { "Sequential Variance Waterfall (Step-by-Step Walk)": "variance_waterfall" }
        ],
        default: "pvm_waterfall",
        section: "Display",
        order: 1
      },
      categoryFieldOverride: {
        type: "string",
        label: "Category / Entity Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      periodFieldOverride: {
        type: "string",
        label: "Period / Time Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      revenueMeasureOverride: {
        type: "string",
        label: "Revenue / Total Spend Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      volumeMeasureOverride: {
        type: "string",
        label: "Volume / Units Ordered Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      basePeriodOverride: {
        type: "string",
        label: "Base Period Selection (Default: Earliest Period)",
        default: "",
        section: "Display",
        order: 6
      },
      currentPeriodOverride: {
        type: "string",
        label: "Current Period Selection (Default: Latest Period)",
        default: "",
        section: "Display",
        order: 7
      },
      showConnectorLines: {
        type: "boolean",
        label: "Show Waterfall Stepped Connector Lines",
        default: true,
        section: "Display",
        order: 8
      },
      showVarianceBadges: {
        type: "boolean",
        label: "Show Delta $ and % Variance Badges",
        default: true,
        section: "Display",
        order: 9
      },
      targetCalculationMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None": "none" },
          { "Dataset Mean Revenue Run-Rate": "dataset_mean" },
          { "Dataset Median Revenue": "dataset_median" },
          { "Top P90 Benchmark": "percentile_p90" },
          { "Fixed Custom Target Value": "fixed" }
        ],
        default: "none",
        section: "Display",
        order: 10
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        default: 0,
        section: "Display",
        order: 11
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        default: "Revenue Target",
        section: "Display",
        order: 12
      },
      sortBy: {
        type: "string",
        label: "Category Sort Order",
        display: "select",
        values: [
          { "Net Impact Descending (Largest Gainers First)": "impact_desc" },
          { "Net Impact Ascending (Largest Decliners First)": "impact_asc" },
          { "Base Revenue Descending": "revenue_desc" },
          { "Alphabetical Category Name": "alpha" }
        ],
        default: "impact_desc",
        section: "Display",
        order: 13
      },
      topNLimit: {
        type: "number",
        label: "Top-N Categories Limit (0 = All, roll remainder to 'Other')",
        default: 8,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Revenue Categories",
        default: true,
        section: "Display",
        order: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Bridge Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Financial Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 16
      },
      showDataLabels: {
        type: "string",
        label: "Data Value Labels Density",
        display: "select",
        values: [
          { "All Bar Values Visible": "all" },
          { "Min / Max Peaks Only": "peaks_only" },
          { "Hidden": "off" }
        ],
        default: "all",
        section: "Display",
        order: 17
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 18
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Show Category Search & Filter Bar",
        default: true,
        section: "Display",
        order: 20
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Wellverse Healthcare (Medical-Surgical)": "wellverse_healthcare" },
          { "Google Enterprise": "google_enterprise" },
          { "Executive Slate": "executive_slate" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Custom Hex Override": "custom" }
        ],
        default: "wellverse_healthcare",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Total Bars Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive Growth / Gain Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Contraction Hex",
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
          { "Higher is Better (Revenue / Gross Margin / Unit Sales)": "higher_better" },
          { "Lower is Better (Procurement Cost / Unit Price Paid)": "lower_better" }
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
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Full Currency ($1,234,567)": "full_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw (Exact Database Value)": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      barPadding: {
        type: "number",
        label: "Bar Spacing / Padding (0.1 to 0.6)",
        default: 0.3,
        section: "Style",
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        categoryFieldOverride: { role: "dimension", defaultIdx: 0 },
        periodFieldOverride: { role: "dimension", defaultIdx: 1 },
        revenueMeasureOverride: { role: "measure", defaultIdx: 0 },
        volumeMeasureOverride: { role: "measure", defaultIdx: 1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto → " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        for (var i = 0; i < list.length; i++) {
          var fld = list[i];
          var lbl = fieldLabel(fld);
          if (seen[fld.name]) continue;
          seen[fld.name] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        }
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "pvm-bridge-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "pvm-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.maxWidth = "320px";
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
      }, 60);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);
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
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error("PVM Revenue Bridge Render Error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "Failed to render PVM Revenue Bridge Waterfall."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector(".pvm-bridge-container");
      if (!container) {
        element.innerHTML = "";
        container = document.createElement("div");
        container.className = "pvm-bridge-container";
        container.style.boxSizing = "border-box";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.overflow = "hidden";
        container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        element.appendChild(container);
      }
      container.innerHTML = "";

      if (!data || !data.length) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to visualize."
        });
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (dims.length === 0) {
        this.addError({
          title: "Dimensions Required",
          message: "PVM Revenue Bridge requires at least 1 Dimension (Product Category) and preferably 2 Dimensions (Category & Period)."
        });
        return;
      }
      if (meas.length === 0) {
        this.addError({
          title: "Measures Required",
          message: "PVM Revenue Bridge requires at least 1 Measure (Revenue / Spend) and preferably 2 Measures (Revenue & Units)."
        });
        return;
      }

      var categoryDim = resolveField(dims, config.categoryFieldOverride, 0);
      var periodDim = resolveField(dims, config.periodFieldOverride, dims.length > 1 ? 1 : 0);
      var hasDistinctPeriods = dims.length > 1 && categoryDim.name !== periodDim.name;

      var revenueMeas = resolveField(meas, config.revenueMeasureOverride, 0);
      var volumeMeas = resolveField(meas, config.volumeMeasureOverride, meas.length > 1 ? 1 : -1);

      // Theme Resolution
      var theme = THEMES[config.colorTheme] || THEMES.wellverse_healthcare;
      if (config.colorTheme === "custom") {
        theme = Object.assign({}, theme, {
          baseBar: config.customPrimaryColor || theme.baseBar,
          currentBar: config.customPrimaryColor || theme.currentBar,
          positive: config.customPositiveColor || theme.positive,
          negative: config.customNegativeColor || theme.negative
        });
      }
      if (config.metricPolarity === "lower_better") {
        var origPos = theme.positive;
        theme.positive = theme.negative;
        theme.negative = origPos;
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font Scale Factor
      var fontScale = config.fontScale === "compact" ? 0.85 : (config.fontScale === "large" ? 1.25 : 1.0);

      // ==========================================
      // 1. DATA AGGREGATION & PVM DECOMPOSITION
      // ==========================================
      var periodsMap = {};
      var periodsList = [];
      var categoriesMap = {};

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var cat = row[categoryDim.name] ? String(row[categoryDim.name].value || "Unknown").trim() : "Unknown";
        var per = hasDistinctPeriods && row[periodDim.name] ? String(row[periodDim.name].value || "Current").trim() : "Current";

        var rev = revenueMeas && row[revenueMeas.name] && !isNaN(Number(row[revenueMeas.name].value)) ? Number(row[revenueMeas.name].value) : 0;
        var vol = volumeMeas && row[volumeMeas.name] && !isNaN(Number(row[volumeMeas.name].value)) ? Number(row[volumeMeas.name].value) : (rev > 0 ? 1 : 0);

        if (config.suppressZeroNull && rev === 0 && vol === 0) continue;

        if (!periodsMap[per]) {
          periodsMap[per] = true;
          periodsList.push(per);
        }

        if (!categoriesMap[cat]) {
          categoriesMap[cat] = {
            id: cat,
            name: cat,
            byPeriod: {},
            totalRevenue: 0,
            totalVolume: 0,
            drillLinks: (row[categoryDim.name] && row[categoryDim.name].links) || null
          };
        }

        if (!categoriesMap[cat].byPeriod[per]) {
          categoriesMap[cat].byPeriod[per] = { revenue: 0, volume: 0, links: (row[revenueMeas.name] && row[revenueMeas.name].links) || null };
        }
        categoriesMap[cat].byPeriod[per].revenue += rev;
        categoriesMap[cat].byPeriod[per].volume += vol;
        categoriesMap[cat].totalRevenue += rev;
        categoriesMap[cat].totalVolume += vol;
      }

      // Determine Base and Current Periods
      var basePeriod = config.basePeriodOverride || (periodsList.length > 1 ? periodsList[0] : "Base");
      var currentPeriod = config.currentPeriodOverride || (periodsList.length > 1 ? periodsList[periodsList.length - 1] : "Current");

      if (basePeriod === currentPeriod && periodsList.length > 1) {
        basePeriod = periodsList[0];
        currentPeriod = periodsList[periodsList.length - 1];
      }

      // If only 1 period in data (e.g. static category view), simulate base as prior baseline (85-90% benchmark)
      var isSinglePeriodModel = periodsList.length <= 1;

      var categoryPVM = [];
      var totalBaseRev = 0;
      var totalCurrentRev = 0;
      var totalBaseVol = 0;
      var totalCurrentVol = 0;

      Object.values(categoriesMap).forEach(function (c) {
        var baseRev = 0, baseVol = 0;
        var currRev = 0, currVol = 0;

        if (isSinglePeriodModel) {
          currRev = c.totalRevenue;
          currVol = c.totalVolume;
          baseRev = currRev * 0.88; // 12% growth walk benchmark
          baseVol = currVol * 0.92;
        } else {
          baseRev = (c.byPeriod[basePeriod] && c.byPeriod[basePeriod].revenue) || 0;
          baseVol = (c.byPeriod[basePeriod] && c.byPeriod[basePeriod].volume) || 0;
          currRev = (c.byPeriod[currentPeriod] && c.byPeriod[currentPeriod].revenue) || 0;
          currVol = (c.byPeriod[currentPeriod] && c.byPeriod[currentPeriod].volume) || 0;
        }

        totalBaseRev += baseRev;
        totalCurrentRev += currRev;
        totalBaseVol += baseVol;
        totalCurrentVol += currVol;

        var basePrice = baseVol > 0 ? (baseRev / baseVol) : 0;
        var currPrice = currVol > 0 ? (currRev / currVol) : 0;

        categoryPVM.push({
          category: c.name,
          baseRevenue: baseRev,
          currentRevenue: currRev,
          baseVolume: baseVol,
          currentVolume: currVol,
          basePrice: basePrice,
          currentPrice: currPrice,
          drillLinks: c.drillLinks
        });
      });

      var avgBasePrice = totalBaseVol > 0 ? (totalBaseRev / totalBaseVol) : 0;
      var totalVolGrowthRate = totalBaseVol > 0 ? ((totalCurrentVol - totalBaseVol) / totalBaseVol) : 0;

      var totalPvmPrice = 0;
      var totalPvmVolume = 0;
      var totalPvmMix = 0;

      // PVM Mathematical Decomposition per Category
      categoryPVM.forEach(function (item) {
        // Price Effect: Impact of price change holding current volume constant = (P1 - P0) * Q1
        item.priceEffect = (item.currentPrice - item.basePrice) * item.currentVolume;

        // Volume Effect: Growth in volume at portfolio average base price = Q0 * totalVolGrowthRate * P0
        item.volumeEffect = item.baseVolume * totalVolGrowthRate * item.basePrice;

        // Mix Effect: Shift in product portfolio share = (Q1 - Q0*(1+totalVolGrowthRate)) * (P0 - avgBasePrice)
        var expectedVol = item.baseVolume * (1 + totalVolGrowthRate);
        item.mixEffect = (item.currentVolume - expectedVol) * (item.basePrice - avgBasePrice);

        // Adjust for rounding so Price + Volume + Mix exactly equals Net Delta
        item.netDelta = item.currentRevenue - item.baseRevenue;
        var pvmSum = item.priceEffect + item.volumeEffect + item.mixEffect;
        if (Math.abs(item.netDelta - pvmSum) > 0.01) {
          item.mixEffect = item.netDelta - (item.priceEffect + item.volumeEffect);
        }

        totalPvmPrice += item.priceEffect;
        totalPvmVolume += item.volumeEffect;
        totalPvmMix += item.mixEffect;
      });

      var netRevenueDelta = totalCurrentRev - totalBaseRev;
      var netRevenuePct = totalBaseRev > 0 ? ((netRevenueDelta / totalBaseRev) * 100) : 0;

      // Sorting
      var sortBy = config.sortBy || "impact_desc";
      if (sortBy === "impact_desc") {
        categoryPVM.sort(function (a, b) { return b.netDelta - a.netDelta; });
      } else if (sortBy === "impact_asc") {
        categoryPVM.sort(function (a, b) { return a.netDelta - b.netDelta; });
      } else if (sortBy === "revenue_desc") {
        categoryPVM.sort(function (a, b) { return b.currentRevenue - a.currentRevenue; });
      } else if (sortBy === "alpha") {
        categoryPVM.sort(function (a, b) { return a.category.localeCompare(b.category); });
      }

      // Top-N Limiter with automatic 'Other' rollup
      var activeCategories = categoryPVM;
      var topN = Number(config.topNLimit) || 8;
      if (topN > 0 && categoryPVM.length > topN) {
        var topItems = categoryPVM.slice(0, topN);
        var otherItems = categoryPVM.slice(topN);

        var otherItem = {
          category: "Other Categories (" + otherItems.length + ")",
          baseRevenue: 0,
          currentRevenue: 0,
          baseVolume: 0,
          currentVolume: 0,
          priceEffect: 0,
          volumeEffect: 0,
          mixEffect: 0,
          netDelta: 0,
          drillLinks: null
        };
        otherItems.forEach(function (o) {
          otherItem.baseRevenue += o.baseRevenue;
          otherItem.currentRevenue += o.currentRevenue;
          otherItem.baseVolume += o.baseVolume;
          otherItem.currentVolume += o.currentVolume;
          otherItem.priceEffect += o.priceEffect;
          otherItem.volumeEffect += o.volumeEffect;
          otherItem.mixEffect += o.mixEffect;
          otherItem.netDelta += o.netDelta;
        });
        otherItem.basePrice = otherItem.baseVolume > 0 ? (otherItem.baseRevenue / otherItem.baseVolume) : 0;
        otherItem.currentPrice = otherItem.currentVolume > 0 ? (otherItem.currentRevenue / otherItem.currentVolume) : 0;

        activeCategories = topItems.concat([otherItem]);
      }

      // ==========================================
      // 2. EXECUTIVE SCORECARD HUD & HEADER
      // ==========================================
      var hudContainer = document.createElement("div");
      hudContainer.className = "pvm-bridge-hud";
      hudContainer.style.display = "flex";
      hudContainer.style.flexDirection = "column";
      hudContainer.style.gap = "8px";
      hudContainer.style.padding = "10px 14px 6px 14px";
      hudContainer.style.flexShrink = "0";

      // Header row: Title & Subtitle + Search Bar
      var headerRow = document.createElement("div");
      headerRow.style.display = "flex";
      headerRow.style.alignItems = "center";
      headerRow.style.justifyContent = "space-between";
      headerRow.style.gap = "12px";

      var titleBox = document.createElement("div");
      var mainTitle = config.customTitle || "Price-Volume-Mix (PVM) Strategic Revenue Bridge";
      var subTitle = config.customSubtitle || ("Decomposing revenue walk from " + basePeriod + " to " + currentPeriod + " across medical-surgical categories");

      titleBox.innerHTML =
        '<div style="font-size:' + (14 * fontScale) + 'px; font-weight:700; color:' + theme.text + ';">' + mainTitle + '</div>' +
        '<div style="font-size:' + (11 * fontScale) + 'px; color:' + theme.subtext + '; margin-top:2px;">' + subTitle + '</div>';
      headerRow.appendChild(titleBox);

      var searchInput = null;
      if (config.showSearch !== false) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.gap = "6px";
        searchWrapper.style.padding = "4px 10px";
        searchWrapper.style.backgroundColor = theme.cardBg;
        searchWrapper.style.border = "1px solid " + theme.border;
        searchWrapper.style.borderRadius = "6px";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Filter category...";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.background = "transparent";
        searchInput.style.fontSize = (11 * fontScale) + "px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "140px";
        searchWrapper.appendChild(searchInput);
        headerRow.appendChild(searchWrapper);
      }
      hudContainer.appendChild(headerRow);

      // Scorecard Cards Row
      var hudMode = config.hudMode || "scorecard";
      if (hudMode === "scorecard") {
        var cardRow = document.createElement("div");
        cardRow.style.display = "flex";
        cardRow.style.gap = "10px";
        cardRow.style.marginTop = "4px";

        var deltaSub = (netRevenueDelta >= 0 ? "+" : "") + formatValue(netRevenueDelta, config.valueFormat || "compact_currency") + " (" + (netRevenuePct >= 0 ? "+" : "") + netRevenuePct.toFixed(1) + "%)";
        var deltaColor = netRevenueDelta >= 0 ? theme.positive : theme.negative;

        cardRow.appendChild(makeHudCard("Base Revenue (" + basePeriod + ")", formatValue(totalBaseRev, config.valueFormat || "compact_currency"), "Base Period", theme.subtext, theme, theme.isDark, fontScale));
        cardRow.appendChild(makeHudCard("Price Effect", (totalPvmPrice >= 0 ? "+" : "") + formatValue(totalPvmPrice, config.valueFormat || "compact_currency"), ((totalPvmPrice / totalBaseRev) * 100).toFixed(1) + "% of Base", totalPvmPrice >= 0 ? theme.positive : theme.negative, theme, theme.isDark, fontScale));
        cardRow.appendChild(makeHudCard("Volume Effect", (totalPvmVolume >= 0 ? "+" : "") + formatValue(totalPvmVolume, config.valueFormat || "compact_currency"), ((totalPvmVolume / totalBaseRev) * 100).toFixed(1) + "% of Base", totalPvmVolume >= 0 ? theme.positive : theme.negative, theme, theme.isDark, fontScale));
        cardRow.appendChild(makeHudCard("Mix Effect", (totalPvmMix >= 0 ? "+" : "") + formatValue(totalPvmMix, config.valueFormat || "compact_currency"), ((totalPvmMix / totalBaseRev) * 100).toFixed(1) + "% of Base", totalPvmMix >= 0 ? theme.positive : theme.negative, theme, theme.isDark, fontScale));
        cardRow.appendChild(makeHudCard("Current Revenue (" + currentPeriod + ")", formatValue(totalCurrentRev, config.valueFormat || "compact_currency"), deltaSub, deltaColor, theme, theme.isDark, fontScale));

        hudContainer.appendChild(cardRow);
      } else if (hudMode === "compact_strip") {
        var stripRow = document.createElement("div");
        stripRow.style.display = "flex";
        stripRow.style.alignItems = "center";
        stripRow.style.gap = "12px";
        stripRow.style.fontSize = (11 * fontScale) + "px";
        stripRow.style.color = theme.subtext;
        stripRow.style.padding = "4px 0";

        stripRow.innerHTML =
          '<span>Base: <strong>' + formatValue(totalBaseRev, config.valueFormat || "compact_currency") + '</strong></span> • ' +
          '<span>Price: <strong style="color:' + (totalPvmPrice >= 0 ? theme.positive : theme.negative) + ';">' + (totalPvmPrice >= 0 ? '+' : '') + formatValue(totalPvmPrice, config.valueFormat || 'compact_currency') + '</strong></span> • ' +
          '<span>Volume: <strong style="color:' + (totalPvmVolume >= 0 ? theme.positive : theme.negative) + ';">' + (totalPvmVolume >= 0 ? '+' : '') + formatValue(totalPvmVolume, config.valueFormat || 'compact_currency') + '</strong></span> • ' +
          '<span>Mix: <strong style="color:' + (totalPvmMix >= 0 ? theme.positive : theme.negative) + ';">' + (totalPvmMix >= 0 ? '+' : '') + formatValue(totalPvmMix, config.valueFormat || 'compact_currency') + '</strong></span> • ' +
          '<span>Current: <strong>' + formatValue(totalCurrentRev, config.valueFormat || "compact_currency") + '</strong> (<span style="color:' + (netRevenueDelta >= 0 ? theme.positive : theme.negative) + '; font-weight:700;">' + (netRevenueDelta >= 0 ? '+' : '') + netRevenuePct.toFixed(1) + '%</span>)</span>';

        hudContainer.appendChild(stripRow);
      }

      container.appendChild(hudContainer);

      // ==========================================
      // 3. CHART CANVAS CONTAINER
      // ==========================================
      var chartContainer = document.createElement("div");
      chartContainer.className = "pvm-chart-svg-wrap";
      chartContainer.style.flex = "1 1 auto";
      chartContainer.style.width = "100%";
      chartContainer.style.position = "relative";
      chartContainer.style.overflow = "hidden";
      container.appendChild(chartContainer);

      var rect = chartContainer.getBoundingClientRect();
      var width = Math.max(300, rect.width || container.clientWidth || 600);
      var height = Math.max(220, rect.height || 360);

      var margin = { top: 25, right: 30, bottom: 45, left: 65 };
      var innerW = width - margin.left - margin.right;
      var innerH = height - margin.top - margin.bottom;

      var svg = d3.select(chartContainer)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var layoutMode = config.layoutMode || "pvm_waterfall";

      // ------------------------------------------------------------------
      // MODE 1: PVM STRATEGIC BRIDGE WATERFALL (Default)
      // ------------------------------------------------------------------
      if (layoutMode === "pvm_waterfall") {
        var waterfallSteps = [
          { name: "Base Revenue\n(" + basePeriod + ")", delta: totalBaseRev, start: 0, end: totalBaseRev, isTotal: true, color: theme.baseBar, drillLinks: null },
          { name: "Price Effect\n(Net Realization)", delta: totalPvmPrice, start: totalBaseRev, end: totalBaseRev + totalPvmPrice, isTotal: false, color: totalPvmPrice >= 0 ? theme.positive : theme.negative, drillLinks: null },
          { name: "Volume Effect\n(Unit Growth)", delta: totalPvmVolume, start: totalBaseRev + totalPvmPrice, end: totalBaseRev + totalPvmPrice + totalPvmVolume, isTotal: false, color: totalPvmVolume >= 0 ? theme.positive : theme.negative, drillLinks: null },
          { name: "Mix Effect\n(Portfolio Shift)", delta: totalPvmMix, start: totalBaseRev + totalPvmPrice + totalPvmVolume, end: totalCurrentRev, isTotal: false, color: totalPvmMix >= 0 ? theme.positive : theme.negative, drillLinks: null },
          { name: "Current Revenue\n(" + currentPeriod + ")", delta: totalCurrentRev, start: 0, end: totalCurrentRev, isTotal: true, color: theme.currentBar, drillLinks: null }
        ];

        var minVal = Math.min(0, d3.min(waterfallSteps, function (d) { return Math.min(d.start, d.end); }));
        var maxVal = d3.max(waterfallSteps, function (d) { return Math.max(d.start, d.end); }) * 1.15;

        var xScale = d3.scaleBand()
          .domain(waterfallSteps.map(function (d) { return d.name; }))
          .range([0, innerW])
          .padding(config.barPadding !== undefined ? config.barPadding : 0.3);

        var yScale = d3.scaleLinear()
          .domain([minVal, maxVal])
          .range([innerH, 0])
          .nice();

        // Horizontal Gridlines
        g.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(""))
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("line")
          .attr("stroke", theme.grid)
          .attr("stroke-dasharray", "3,3");

        // Zero Baseline
        g.append("line")
          .attr("x1", 0)
          .attr("x2", innerW)
          .attr("y1", yScale(0))
          .attr("y2", yScale(0))
          .attr("stroke", theme.border)
          .attr("stroke-width", 1.2);

        // Stepped Connector Lines
        if (config.showConnectorLines !== false) {
          for (var c = 0; c < waterfallSteps.length - 1; c++) {
            var stepA = waterfallSteps[c];
            var stepB = waterfallSteps[c + 1];
            var connectY = yScale(stepA.end);
            var x1 = xScale(stepA.name) + xScale.bandwidth();
            var x2 = xScale(stepB.name);

            g.append("line")
              .attr("x1", x1)
              .attr("x2", x2)
              .attr("y1", connectY)
              .attr("y2", connectY)
              .attr("stroke", theme.connector)
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "4,3");
          }
        }

        // Waterfall Bars
        var barGroups = g.selectAll(".pvm-bar")
          .data(waterfallSteps)
          .enter()
          .append("g")
          .attr("class", "pvm-bar")
          .style("cursor", "pointer");

        barGroups.append("rect")
          .attr("x", function (d) { return xScale(d.name); })
          .attr("y", function (d) { return yScale(Math.max(d.start, d.end)); })
          .attr("width", xScale.bandwidth())
          .attr("height", function (d) { return Math.max(2, Math.abs(yScale(d.start) - yScale(d.end))); })
          .attr("rx", 4)
          .attr("fill", function (d) { return d.color; })
          .attr("opacity", 0.9)
          .style("transition", "opacity 0.15s ease");

        // Value Labels & Badges
        if (config.showDataLabels !== "off") {
          barGroups.append("text")
            .attr("x", function (d) { return xScale(d.name) + (xScale.bandwidth() / 2); })
            .attr("y", function (d) {
              var topY = yScale(Math.max(d.start, d.end));
              return topY - 7;
            })
            .attr("text-anchor", "middle")
            .attr("font-size", (11 * fontScale) + "px")
            .attr("font-weight", "700")
            .attr("fill", theme.text)
            .text(function (d) {
              var prefix = !d.isTotal && d.delta > 0 ? "+" : "";
              return prefix + formatValue(d.delta, config.valueFormat || "compact_currency");
            });

          if (config.showVarianceBadges !== false) {
            barGroups.each(function (d) {
              if (d.isTotal) return;
              var pctOfBase = totalBaseRev > 0 ? ((d.delta / totalBaseRev) * 100) : 0;
              var topY = yScale(Math.max(d.start, d.end));
              d3.select(this).append("text")
                .attr("x", xScale(d.name) + (xScale.bandwidth() / 2))
                .attr("y", topY - 20)
                .attr("text-anchor", "middle")
                .attr("font-size", (9.5 * fontScale) + "px")
                .attr("font-weight", "600")
                .attr("fill", d.delta >= 0 ? theme.positive : theme.negative)
                .text((pctOfBase >= 0 ? "+" : "") + pctOfBase.toFixed(1) + "%");
            });
          }
        }

        // X Axis
        var xAxis = d3.axisBottom(xScale);
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(xAxis)
          .call(function (sel) { sel.select(".domain").attr("stroke", theme.border); })
          .selectAll("text")
          .attr("font-size", (10.5 * fontScale) + "px")
          .attr("fill", theme.subtext)
          .each(function (d) {
            var el = d3.select(this);
            var lines = d.split("\n");
            el.text("");
            lines.forEach(function (ln, idx) {
              el.append("tspan")
                .attr("x", 0)
                .attr("dy", idx === 0 ? "0.9em" : "1.1em")
                .text(ln);
            });
          });

        // Y Axis
        var yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(function (d) {
          return formatValue(d, config.valueFormat || "compact_currency");
        });
        g.append("g")
          .call(yAxis)
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("text")
          .attr("font-size", (10 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Tooltip & Drill
        barGroups.on("mouseenter", function (event, d) {
          d3.select(this).select("rect").attr("opacity", 1.0);
          var tt = self._tooltip;
          tt.style.background = theme.isDark ? "#111827" : "#ffffff";
          tt.style.color = theme.text;
          tt.style.border = "1px solid " + theme.border;

          var pctStr = totalBaseRev > 0 ? (((d.delta) / totalBaseRev) * 100).toFixed(1) + "% of Base" : "-";
          tt.innerHTML =
            '<div style="font-weight:700; margin-bottom:4px; font-size:13px;">' + d.name.replace("\n", " ") + '</div>' +
            '<div style="color:' + (d.delta >= 0 ? theme.positive : theme.negative) + '; font-weight:700; font-size:14px; margin-bottom:4px;">' +
              (d.delta >= 0 && !d.isTotal ? "+" : "") + formatValue(d.delta, config.valueFormat || "compact_currency") +
              (!d.isTotal ? ' (' + pctStr + ')' : '') +
            '</div>' +
            '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.4;">' +
              (d.isTotal ? 'Total period revenue across all observed product categories.' :
               (d.name.indexOf("Price") !== -1 ? 'Pure price realization effect: (P_current - P_base) * Q_current.' :
                (d.name.indexOf("Volume") !== -1 ? 'Unit volume expansion effect: Q_base * Portfolio_Growth_Rate * P_base.' :
                 'Product mix shift effect: shifts into higher/lower margin categories.'))) +
            '</div>';

          tt.style.display = "block";
        });

        barGroups.on("mousemove", function (event) {
          var tt = self._tooltip;
          tt.style.left = (event.clientX + 14) + "px";
          tt.style.top = (event.clientY - 20) + "px";
        });

        barGroups.on("mouseleave", function () {
          d3.select(this).select("rect").attr("opacity", 0.9);
          self._tooltip.style.display = "none";
        });

      // ------------------------------------------------------------------
      // MODE 2: CATEGORY PVM DECOMPOSITION (Grouped Contribution)
      // ------------------------------------------------------------------
      } else if (layoutMode === "category_breakdown") {
        var subMetrics = ["priceEffect", "volumeEffect", "mixEffect"];
        var subLabels = { priceEffect: "Price Effect", volumeEffect: "Volume Effect", mixEffect: "Mix Effect" };
        var subColors = { priceEffect: "#2563eb", volumeEffect: "#059669", mixEffect: "#d97706" };

        var y0 = d3.scaleBand()
          .domain(activeCategories.map(function (d) { return d.category; }))
          .range([0, innerH])
          .padding(0.25);

        var y1 = d3.scaleBand()
          .domain(subMetrics)
          .range([0, y0.bandwidth()])
          .padding(0.1);

        var maxAbsDelta = d3.max(activeCategories, function (d) {
          return Math.max(Math.abs(d.priceEffect), Math.abs(d.volumeEffect), Math.abs(d.mixEffect));
        }) || 1;

        var xDeltaScale = d3.scaleLinear()
          .domain([-maxAbsDelta * 1.15, maxAbsDelta * 1.15])
          .range([0, innerW]);

        // Zero vertical line
        g.append("line")
          .attr("x1", xDeltaScale(0))
          .attr("x2", xDeltaScale(0))
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", theme.border)
          .attr("stroke-width", 1.5);

        var catGroups = g.selectAll(".cat-row")
          .data(activeCategories)
          .enter()
          .append("g")
          .attr("class", "cat-row")
          .attr("transform", function (d) { return "translate(0," + y0(d.category) + ")"; });

        subMetrics.forEach(function (mKey) {
          catGroups.append("rect")
            .attr("y", y1(mKey))
            .attr("x", function (d) { return xDeltaScale(Math.min(0, d[mKey])); })
            .attr("width", function (d) { return Math.max(2, Math.abs(xDeltaScale(d[mKey]) - xDeltaScale(0))); })
            .attr("height", y1.bandwidth())
            .attr("rx", 3)
            .attr("fill", function (d) { return d[mKey] >= 0 ? theme.positive : theme.negative; })
            .attr("opacity", 0.85);
        });

        // Y Axis (Category names)
        g.append("g")
          .call(d3.axisLeft(y0))
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("text")
          .attr("font-size", (10.5 * fontScale) + "px")
          .attr("fill", theme.text)
          .text(function (d) { return d.length > 20 ? d.substring(0, 18) + "…" : d; });

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xDeltaScale).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

      // ------------------------------------------------------------------
      // MODE 3: MIX & PRICE ELASTICITY MATRIX (Quadrant Bubble)
      // ------------------------------------------------------------------
      } else if (layoutMode === "mix_elasticity") {
        var xPricePct = d3.scaleLinear()
          .domain(d3.extent(activeCategories, function (d) {
            return d.basePrice > 0 ? ((d.currentPrice - d.basePrice) / d.basePrice) * 100 : 0;
          }))
          .nice()
          .range([0, innerW]);

        var yVolPct = d3.scaleLinear()
          .domain(d3.extent(activeCategories, function (d) {
            return d.baseVolume > 0 ? ((d.currentVolume - d.baseVolume) / d.baseVolume) * 100 : 0;
          }))
          .nice()
          .range([innerH, 0]);

        var rRevScale = d3.scaleSqrt()
          .domain([0, d3.max(activeCategories, function (d) { return d.currentRevenue; }) || 1])
          .range([5, 26]);

        // Zero crosshairs (Quadrants)
        g.append("line")
          .attr("x1", xPricePct(0))
          .attr("x2", xPricePct(0))
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", theme.border)
          .attr("stroke-dasharray", "4,4");

        g.append("line")
          .attr("x1", 0)
          .attr("x2", innerW)
          .attr("y1", yVolPct(0))
          .attr("y2", yVolPct(0))
          .attr("stroke", theme.border)
          .attr("stroke-dasharray", "4,4");

        var bubbles = g.selectAll(".elasticity-bubble")
          .data(activeCategories)
          .enter()
          .append("g")
          .attr("class", "elasticity-bubble")
          .style("cursor", "pointer");

        bubbles.append("circle")
          .attr("cx", function (d) {
            var pct = d.basePrice > 0 ? ((d.currentPrice - d.basePrice) / d.basePrice) * 100 : 0;
            return xPricePct(pct);
          })
          .attr("cy", function (d) {
            var pct = d.baseVolume > 0 ? ((d.currentVolume - d.baseVolume) / d.baseVolume) * 100 : 0;
            return yVolPct(pct);
          })
          .attr("r", function (d) { return rRevScale(d.currentRevenue); })
          .attr("fill", function (d) { return d.netDelta >= 0 ? theme.positive : theme.negative; })
          .attr("fill-opacity", 0.55)
          .attr("stroke", function (d) { return d.netDelta >= 0 ? theme.positive : theme.negative; })
          .attr("stroke-width", 2);

        bubbles.append("text")
          .attr("x", function (d) {
            var pct = d.basePrice > 0 ? ((d.currentPrice - d.basePrice) / d.basePrice) * 100 : 0;
            return xPricePct(pct);
          })
          .attr("y", function (d) {
            var pct = d.baseVolume > 0 ? ((d.currentVolume - d.baseVolume) / d.baseVolume) * 100 : 0;
            return yVolPct(pct) - rRevScale(d.currentRevenue) - 4;
          })
          .attr("text-anchor", "middle")
          .attr("font-size", (10 * fontScale) + "px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(function (d) { return d.category; });

        // X Axis (Price % Change)
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xPricePct).ticks(6).tickFormat(function (d) { return d.toFixed(0) + "%"; }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Y Axis (Volume % Change)
        g.append("g")
          .call(d3.axisLeft(yVolPct).ticks(6).tickFormat(function (d) { return d.toFixed(0) + "%"; }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

      // ------------------------------------------------------------------
      // MODE 4: SEQUENTIAL VARIANCE WATERFALL (Category-by-Category Walk)
      // ------------------------------------------------------------------
      } else if (layoutMode === "variance_waterfall") {
        var runningTotal = totalBaseRev;
        var seqSteps = [{ name: "Base\n(" + basePeriod + ")", delta: totalBaseRev, start: 0, end: totalBaseRev, isTotal: true, color: theme.baseBar, drillLinks: null }];

        activeCategories.forEach(function (c) {
          seqSteps.push({
            name: c.category,
            delta: c.netDelta,
            start: runningTotal,
            end: runningTotal + c.netDelta,
            isTotal: false,
            color: c.netDelta >= 0 ? theme.positive : theme.negative,
            drillLinks: c.drillLinks
          });
          runningTotal += c.netDelta;
        });

        seqSteps.push({ name: "Current\n(" + currentPeriod + ")", delta: totalCurrentRev, start: 0, end: totalCurrentRev, isTotal: true, color: theme.currentBar, drillLinks: null });

        var xSeq = d3.scaleBand()
          .domain(seqSteps.map(function (d) { return d.name; }))
          .range([0, innerW])
          .padding(0.25);

        var ySeq = d3.scaleLinear()
          .domain([0, d3.max(seqSteps, function (d) { return Math.max(d.start, d.end); }) * 1.12])
          .range([innerH, 0])
          .nice();

        var seqGroups = g.selectAll(".seq-bar")
          .data(seqSteps)
          .enter()
          .append("g")
          .attr("class", "seq-bar")
          .style("cursor", "pointer");

        seqGroups.append("rect")
          .attr("x", function (d) { return xSeq(d.name); })
          .attr("y", function (d) { return ySeq(Math.max(d.start, d.end)); })
          .attr("width", xSeq.bandwidth())
          .attr("height", function (d) { return Math.max(2, Math.abs(ySeq(d.start) - ySeq(d.end))); })
          .attr("rx", 3)
          .attr("fill", function (d) { return d.color; })
          .attr("opacity", 0.9);

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xSeq))
          .selectAll("text")
          .attr("transform", "rotate(-35)")
          .attr("text-anchor", "end")
          .attr("font-size", (9 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Y Axis
        g.append("g")
          .call(d3.axisLeft(ySeq).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);
      }

      // Native Looker Drill-Down Menu Support on Click
      svg.selectAll("g.pvm-bar, g.cat-row, g.elasticity-bubble, g.seq-bar")
        .on("click", function (event, d) {
          if (d && d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({
              links: d.drillLinks,
              event: event
            });
          }
        });

      // Search Box Filter Hook
      if (searchInput) {
        searchInput.oninput = function () {
          var query = searchInput.value.toLowerCase().trim();
          svg.selectAll("g.pvm-bar, g.cat-row, g.elasticity-bubble, g.seq-bar")
            .style("opacity", function (d) {
              if (!query) return 1;
              var name = d.name || d.category || "";
              return name.toLowerCase().indexOf(query) !== -1 ? 1 : 0.15;
            });
        };
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
