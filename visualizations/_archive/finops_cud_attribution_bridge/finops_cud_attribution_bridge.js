/**
 * Cloud FinOps CUD Attribution & Savings Bridge - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Cloud Financial Management (FinOps Foundation) Attribution & Savings Walk Engine:
 * - 4 Multi-Modal Layout Modes:
 *     1. "waterfall_bridge": Financial Bridge Waterfall walking from Gross On-Demand Equivalent Cost
 *        through CUD Usage Credit Offset, Allocated CUD Commitment Fees, and Breakage to Net Attributed Cost & Realized Savings.
 *     2. "service_breakdown": Diverging Grouped Bar breakdown showing Gross On-Demand Cost vs Allocated CUD Fee vs Net Attributed Cost
 *        per GCP Service / Organization Folder.
 *     3. "savings_efficiency_matrix": Quadrant Bubble Matrix plotting Effective Savings Rate (ESR %) vs Net CUD Savings ($)
 *        with bubble size proportional to Gross On-Demand spend.
 *     4. "chargeback_allocation_shift": Proportional Chargeback Variance Waterfall walking from Raw Unattributed Payer Cost
 *        to Net CUD-Attributed Cost per Organization Folder / Project.
 * - Dynamic Field-Role Mapping (Entity/Folder Dimension, Service/Project Dimension, Gross On-Demand Measure,
 *   CUD Credit Offset Measure, Allocated CUD Fee Measure, Net Attributed Cost Measure)
 * - Configurable Financial Target Reference Lines & Anomaly Alert Thresholds
 * - Executive FinOps Scorecard HUD (Gross Spend, CUD Credits, Mapped Fees, Net Cost, Realized Savings, ESR %)
 * - Enterprise Palettes (Emerald FinOps, Google Enterprise, Executive Slate, Modern Slate, Cyberpunk Dark, Sunset Media, Custom Hex)
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
    emerald_finops: {
      name: "Emerald FinOps",
      baseBar: "#0f766e",
      currentBar: "#0d9488",
      positive: "#059669",
      negative: "#e11d48",
      allocated: "#0284c7",
      connector: "#94a3b8",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#cbd5e1",
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
      allocated: "#1a73e8",
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
      allocated: "#3b82f6",
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
      allocated: "#6366f1",
      connector: "#cbd5e1",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f8fafc",
      cardBg: "#f1f5f9",
      isDark: false
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      baseBar: "#00f0ff",
      currentBar: "#7000ff",
      positive: "#00ff66",
      negative: "#ff003c",
      allocated: "#ffb800",
      connector: "#382952",
      bg: "#0b0813",
      text: "#f0eeff",
      subtext: "#9085aa",
      border: "#251a3a",
      grid: "#1a1228",
      cardBg: "#150e22",
      isDark: true
    },
    sunset_media: {
      name: "Sunset Media",
      baseBar: "#ea580c",
      currentBar: "#c2410c",
      positive: "#16a34a",
      negative: "#dc2626",
      allocated: "#d97706",
      connector: "#fed7aa",
      bg: "#ffffff",
      text: "#1c1917",
      subtext: "#78716c",
      border: "#fcd34d",
      grid: "#fffbeb",
      cardBg: "#fef3c7",
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
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark, fontScale) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "115px";
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
    val.style.fontSize = (15 * fontScale) + "px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = (10 * fontScale) + "px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "finops_cud_attribution_bridge",
    label: "Cloud FinOps CUD Attribution & Savings Bridge",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Layout Mode",
        display: "select",
        values: [
          { "CUD Attribution Waterfall Bridge (Executive Walk)": "waterfall_bridge" },
          { "Service Cost & Attribution Breakdown (Grouped Bars)": "service_breakdown" },
          { "Savings Efficiency & ESR Matrix (Quadrant Bubble)": "savings_efficiency_matrix" },
          { "Chargeback Allocation Shift Walk (Payer to Net)": "chargeback_allocation_shift" }
        ],
        default: "waterfall_bridge",
        section: "Display",
        order: 1
      },
      entityFieldOverride: {
        type: "string",
        label: "Entity / Folder Dimension",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      serviceFieldOverride: {
        type: "string",
        label: "Service / Project Dimension",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      grossCostMeasureOverride: {
        type: "string",
        label: "Gross On-Demand Cost Measure",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      cudCreditMeasureOverride: {
        type: "string",
        label: "CUD Credit Offset Measure",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      allocatedFeeMeasureOverride: {
        type: "string",
        label: "Allocated CUD Fee Measure",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      netCostMeasureOverride: {
        type: "string",
        label: "Net Attributed Cost Measure",
        display: "select",
        values: [{ "Auto (run query)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      showConnectorLines: {
        type: "boolean",
        label: "Show Waterfall Connector Lines",
        default: true,
        section: "Display",
        order: 8
      },
      showStepLabels: {
        type: "boolean",
        label: "Show Value Labels Above Steps",
        default: true,
        section: "Display",
        order: 9
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        display: "select",
        values: [
          { "None": "none" },
          { "Dataset Mean Cost": "dataset_mean" },
          { "Dataset Median Cost": "dataset_median" },
          { "Percentile P90 Ceiling": "percentile_p90" },
          { "Fixed Target Value": "fixed" }
        ],
        default: "none",
        section: "Display",
        order: 10
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Benchmark Value ($)",
        default: 0,
        section: "Display",
        order: 11
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        default: "Budget Baseline",
        section: "Display",
        order: 12
      },
      sortBy: {
        type: "string",
        label: "Entity Sort Order",
        display: "select",
        values: [
          { "Gross Spend Descending": "spend_desc" },
          { "Net Savings Descending": "savings_desc" },
          { "Alphabetical": "alpha" }
        ],
        default: "spend_desc",
        section: "Display",
        order: 13
      },
      topNLimit: {
        type: "number",
        label: "Top-N Entities Limit (Remainder to 'Other')",
        default: 10,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Spend Rows",
        default: true,
        section: "Display",
        order: 15
      },
      hudDensity: {
        type: "string",
        label: "Executive FinOps HUD Density",
        display: "select",
        values: [
          { "Full 6-Card Scorecard HUD": "full" },
          { "Compact 3-Card Strip": "compact" },
          { "Hidden": "none" }
        ],
        default: "full",
        section: "Display",
        order: 16
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 17
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Show Filter / Search Bar",
        default: true,
        section: "Display",
        order: 19
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Enterprise FinOps Color Palette",
        display: "select",
        values: [
          { "Emerald FinOps (Forest & Mint)": "emerald_finops" },
          { "Google Enterprise (Cloud Modern)": "google_enterprise" },
          { "Executive Slate (Charcoal & Emerald)": "executive_slate" },
          { "Modern Slate (Indigo & Rose)": "modern_slate" },
          { "Cyberpunk Dark (Midnight & Neon)": "cyberpunk_dark" },
          { "Sunset Media (Amber & Terracotta)": "sunset_media" },
          { "Custom Hex Override": "custom" }
        ],
        default: "emerald_finops",
        section: "Style",
        order: 1
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Total Hex Color",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive Savings Hex Color",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Cost / Fee Hex Color",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Lower Cost / Higher Savings is Better (Standard FinOps)": "standard_finops" },
          { "Inverted Polarity": "inverted" }
        ],
        default: "standard_finops",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scale",
        display: "select",
        values: [
          { "Compact (Dense Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large (Executive Presentation)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value & Currency Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Full Currency ($1,234,567)": "full_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Percentage (34.2%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw Database Value": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      barPadding: {
        type: "number",
        label: "Bar Spacing / Padding (0.1 to 0.5)",
        default: 0.28,
        section: "Style",
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityFieldOverride: { role: "dimension", defaultIdx: 0 },
        serviceFieldOverride: { role: "dimension", defaultIdx: 1 },
        grossCostMeasureOverride: { role: "measure", defaultIdx: 0 },
        cudCreditMeasureOverride: { role: "measure", defaultIdx: 1 },
        allocatedFeeMeasureOverride: { role: "measure", defaultIdx: 2 },
        netCostMeasureOverride: { role: "measure", defaultIdx: 3 }
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
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
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
      container.className = "finops-bridge-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "finops-tooltip";
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
          console.error("FinOps Bridge Render Error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "Failed to render Cloud FinOps CUD Attribution & Savings Bridge."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector(".finops-bridge-container");
      if (!container) {
        element.innerHTML = "";
        container = document.createElement("div");
        container.className = "finops-bridge-container";
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
          message: "FinOps Bridge requires at least 1 Dimension (e.g. Organization Folder or GCP Project)."
        });
        return;
      }
      if (meas.length === 0) {
        this.addError({
          title: "Measures Required",
          message: "FinOps Bridge requires at least 1 Measure (Gross On-Demand Cost)."
        });
        return;
      }

      var entityDim = resolveField(dims, config.entityFieldOverride, 0);
      var serviceDim = resolveField(dims, config.serviceFieldOverride, dims.length > 1 ? 1 : 0);
      var grossMeas = resolveField(meas, config.grossCostMeasureOverride, 0);
      var cudCreditMeas = resolveField(meas, config.cudCreditMeasureOverride, meas.length > 1 ? 1 : -1);
      var allocatedFeeMeas = resolveField(meas, config.allocatedFeeMeasureOverride, meas.length > 2 ? 2 : -1);
      var netCostMeas = resolveField(meas, config.netCostMeasureOverride, meas.length > 3 ? 3 : -1);

      // Theme Resolution
      var theme = THEMES[config.colorPalette] || THEMES.emerald_finops;
      if (config.colorPalette === "custom") {
        theme = Object.assign({}, theme, {
          baseBar: config.customPrimaryHex || theme.baseBar,
          currentBar: config.customPrimaryHex || theme.currentBar,
          positive: config.customPositiveHex || theme.positive,
          negative: config.customNegativeHex || theme.negative,
          allocated: config.customNegativeHex || theme.allocated
        });
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontScale = config.fontScale === "compact" ? 0.85 : (config.fontScale === "large" ? 1.25 : 1.0);

      // ==========================================
      // 1. DATA AGGREGATION
      // ==========================================
      var entityMap = {};
      var totalGross = 0;
      var totalCredits = 0;
      var totalFees = 0;
      var totalNet = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var entName = entityDim && row[entityDim.name] ? String(row[entityDim.name].value || "Unknown").trim() : "All Workloads";
        var srvName = serviceDim && row[serviceDim.name] ? String(row[serviceDim.name].value || "Compute").trim() : "Compute";

        var gCost = grossMeas && row[grossMeas.name] && !isNaN(Number(row[grossMeas.name].value)) ? Number(row[grossMeas.name].value) : 0;
        var cCredit = cudCreditMeas && row[cudCreditMeas.name] && !isNaN(Number(row[cudCreditMeas.name].value)) ? Number(row[cudCreditMeas.name].value) : 0;
        var aFee = allocatedFeeMeas && row[allocatedFeeMeas.name] && !isNaN(Number(row[allocatedFeeMeas.name].value)) ? Number(row[allocatedFeeMeas.name].value) : 0;
        var nCost = netCostMeas && row[netCostMeas.name] && !isNaN(Number(row[netCostMeas.name].value)) ? Number(row[netCostMeas.name].value) : (gCost - cCredit + aFee);

        if (config.suppressZeroNull && gCost === 0 && cCredit === 0 && aFee === 0 && nCost === 0) continue;

        totalGross += gCost;
        totalCredits += cCredit;
        totalFees += aFee;
        totalNet += nCost;

        if (!entityMap[entName]) {
          entityMap[entName] = {
            name: entName,
            service: srvName,
            grossCost: 0,
            cudCredit: 0,
            allocatedFee: 0,
            netCost: 0,
            drillLinks: (entityDim && row[entityDim.name] && row[entityDim.name].links) || null
          };
        }

        entityMap[entName].grossCost += gCost;
        entityMap[entName].cudCredit += cCredit;
        entityMap[entName].allocatedFee += aFee;
        entityMap[entName].netCost += nCost;
      }

      var totalNetSavings = totalCredits - totalFees;
      if (totalNetSavings === 0 && totalGross > totalNet) {
        totalNetSavings = totalGross - totalNet;
      }
      var totalESR = totalGross > 0 ? (totalNetSavings / totalGross) : 0;

      var entityList = Object.values(entityMap);
      entityList.forEach(function (e) {
        e.netSavings = e.cudCredit - e.allocatedFee;
        if (e.netSavings === 0 && e.grossCost > e.netCost) e.netSavings = e.grossCost - e.netCost;
        e.esr = e.grossCost > 0 ? (e.netSavings / e.grossCost) : 0;
      });

      // Sorting
      var sortBy = config.sortBy || "spend_desc";
      if (sortBy === "spend_desc") {
        entityList.sort(function (a, b) { return b.grossCost - a.grossCost; });
      } else if (sortBy === "savings_desc") {
        entityList.sort(function (a, b) { return b.netSavings - a.netSavings; });
      } else if (sortBy === "alpha") {
        entityList.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N limiter
      var topN = Number(config.topNLimit) || 10;
      var activeEntities = entityList;
      if (topN > 0 && entityList.length > topN) {
        var topItems = entityList.slice(0, topN);
        var otherItems = entityList.slice(topN);
        var otherEntity = {
          name: "Other Folders (" + otherItems.length + ")",
          service: "Multiple Services",
          grossCost: 0,
          cudCredit: 0,
          allocatedFee: 0,
          netCost: 0,
          netSavings: 0,
          esr: 0,
          drillLinks: null
        };
        otherItems.forEach(function (o) {
          otherEntity.grossCost += o.grossCost;
          otherEntity.cudCredit += o.cudCredit;
          otherEntity.allocatedFee += o.allocatedFee;
          otherEntity.netCost += o.netCost;
          otherEntity.netSavings += o.netSavings;
        });
        otherEntity.esr = otherEntity.grossCost > 0 ? (otherEntity.netSavings / otherEntity.grossCost) : 0;
        activeEntities = topItems.concat([otherEntity]);
      }

      // ==========================================
      // 2. EXECUTIVE SCORECARD HUD & HEADER
      // ==========================================
      var hudContainer = document.createElement("div");
      hudContainer.className = "finops-bridge-hud";
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
      var mainTitle = config.customTitle || "Google Cloud FinOps CUD Attribution & Savings Bridge";
      var subTitle = config.customSubtitle || ("Reconciling Gross On-Demand List Spend vs CUD Credits, Mapped Fees, and Net Cost across " + entityList.length + " Workloads");

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
        searchInput.placeholder = "\ud83d\udd0d Filter workload...";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.backgroundColor = "transparent";
        searchInput.style.fontSize = (11 * fontScale) + "px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "140px";
        searchWrapper.appendChild(searchInput);
        headerRow.appendChild(searchWrapper);
      }
      hudContainer.appendChild(headerRow);

      // Scorecard Cards Strip
      var hudMode = config.hudDensity || "full";
      if (hudMode !== "none") {
        var cardsRow = document.createElement("div");
        cardsRow.style.display = "flex";
        cardsRow.style.flexWrap = "wrap";
        cardsRow.style.gap = "8px";

        if (hudMode === "full") {
          cardsRow.appendChild(makeHudCard("Gross On-Demand", formatValue(totalGross, config.valueFormat || "compact_currency"), "List Rate Spend", theme.subtext, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("CUD Credit Offset", "-" + formatValue(totalCredits, config.valueFormat || "compact_currency"), "Usage Credits", theme.positive, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Mapped CUD Fees", "+" + formatValue(totalFees, config.valueFormat || "compact_currency"), "Allocated Share", theme.allocated, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Net Attributed Cost", formatValue(totalNet, config.valueFormat || "compact_currency"), "True Chargeback", theme.subtext, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Realized CUD Savings", formatValue(totalNetSavings, config.valueFormat || "compact_currency"), ((totalESR * 100).toFixed(1) + "% of Gross"), theme.positive, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Effective Savings Rate", (totalESR * 100).toFixed(1) + "%", "FinOps Foundation ESR", theme.positive, theme, theme.isDark, fontScale));
        } else if (hudMode === "compact") {
          cardsRow.appendChild(makeHudCard("Gross Spend", formatValue(totalGross, config.valueFormat || "compact_currency"), null, null, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Net Attributed Cost", formatValue(totalNet, config.valueFormat || "compact_currency"), null, null, theme, theme.isDark, fontScale));
          cardsRow.appendChild(makeHudCard("Realized Savings (ESR)", formatValue(totalNetSavings, config.valueFormat || "compact_currency") + " (" + (totalESR * 100).toFixed(1) + "%)", null, theme.positive, theme, theme.isDark, fontScale));
        }
        hudContainer.appendChild(cardsRow);
      }
      container.appendChild(hudContainer);

      // ==========================================
      // 3. MAIN D3 CHART CANVAS
      // ==========================================
      var chartWrapper = document.createElement("div");
      chartWrapper.className = "finops-chart-wrapper";
      chartWrapper.style.flex = "1 1 0";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      container.appendChild(chartWrapper);

      var width = chartWrapper.clientWidth || container.clientWidth || 800;
      var height = chartWrapper.clientHeight || 450;
      if (width < 50) width = 800;
      if (height < 50) height = 450;

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      var margin = { top: 25, right: 30, bottom: 45, left: 65 };
      var innerW = Math.max(50, width - margin.left - margin.right);
      var innerH = Math.max(50, height - margin.top - margin.bottom);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var layoutMode = config.layoutMode || "waterfall_bridge";

      // ------------------------------------------------------------------
      // MODE 1: CUD ATTRIBUTION WATERFALL BRIDGE (Executive Walk)
      // ------------------------------------------------------------------
      if (layoutMode === "waterfall_bridge") {
        // Steps in CUD Financial Walk:
        // 1. Gross On-Demand List Cost (Base Total)
        // 2. CUD Credit Offset (Negative / Discount)
        // 3. Subtotal after Credits
        // 4. Mapped CUD Commitment Fee (Positive / Allocation)
        // 5. Net Attributed Cost (Final Total)
        // 6. Net Realized Savings (Summary Delta)
        var steps = [
          { name: "Gross On-Demand\nEquivalent", value: totalGross, delta: totalGross, start: 0, end: totalGross, isTotal: true, color: theme.baseBar },
          { name: "CUD Credit\nOffset", value: totalCredits, delta: -totalCredits, start: totalGross, end: Math.max(0, totalGross - totalCredits), isTotal: false, color: theme.positive },
          { name: "Allocated CUD\nCommitment Fee", value: totalFees, delta: totalFees, start: Math.max(0, totalGross - totalCredits), end: Math.max(0, totalGross - totalCredits) + totalFees, isTotal: false, color: theme.allocated },
          { name: "Net Attributed\nChargeback Cost", value: totalNet, delta: totalNet, start: 0, end: totalNet, isTotal: true, color: theme.currentBar },
          { name: "Net Realized\nCUD Savings", value: totalNetSavings, delta: totalNetSavings, start: 0, end: totalNetSavings, isTotal: true, color: theme.positive }
        ];

        var maxVal = d3.max(steps, function (d) { return Math.max(d.start, d.end); }) * 1.15;
        var yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);
        var xScale = d3.scaleBand().domain(steps.map(function (d) { return d.name; })).range([0, innerW]).padding(config.barPadding || 0.28);

        // Grid lines
        g.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(""))
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("line")
          .attr("stroke", theme.grid)
          .attr("stroke-dasharray", "2,2");

        // Stepped connector lines
        if (config.showConnectorLines !== false) {
          for (var sIdx = 0; sIdx < steps.length - 2; sIdx++) {
            var curr = steps[sIdx];
            var next = steps[sIdx + 1];
            var x1 = xScale(curr.name) + xScale.bandwidth();
            var x2 = xScale(next.name);
            var yConn = yScale(curr.end);

            g.append("line")
              .attr("x1", x1)
              .attr("x2", x2)
              .attr("y1", yConn)
              .attr("y2", yConn)
              .attr("stroke", theme.connector)
              .attr("stroke-dasharray", "3,3")
              .attr("stroke-width", 1.5);
          }
        }

        // Waterfall Bars
        var barGroups = g.selectAll(".waterfall-bar")
          .data(steps)
          .enter()
          .append("g")
          .attr("class", "waterfall-bar")
          .style("cursor", "pointer");

        barGroups.append("rect")
          .attr("x", function (d) { return xScale(d.name); })
          .attr("y", function (d) { return yScale(Math.max(d.start, d.end)); })
          .attr("width", xScale.bandwidth())
          .attr("height", function (d) { return Math.max(2, Math.abs(yScale(d.start) - yScale(d.end))); })
          .attr("rx", 4)
          .attr("fill", function (d) { return d.color; })
          .attr("opacity", 0.9);

        // Step Value Labels
        if (config.showStepLabels !== false) {
          barGroups.append("text")
            .attr("x", function (d) { return xScale(d.name) + xScale.bandwidth() / 2; })
            .attr("y", function (d) { return yScale(Math.max(d.start, d.end)) - 6; })
            .attr("text-anchor", "middle")
            .attr("font-size", (10.5 * fontScale) + "px")
            .attr("font-weight", "700")
            .attr("fill", function (d) { return d.isTotal ? theme.text : d.color; })
            .text(function (d) {
              var prefix = !d.isTotal && d.delta > 0 ? "+" : (!d.isTotal && d.delta < 0 ? "-" : "");
              return prefix + formatValue(d.value, config.valueFormat || "compact_currency");
            });
        }

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xScale))
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
        g.append("g")
          .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("text")
          .attr("font-size", (10 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Tooltip
        barGroups.on("mouseenter", function (event, d) {
          d3.select(this).select("rect").attr("opacity", 1.0);
          var tt = self._tooltip;
          tt.style.background = theme.isDark ? "#111827" : "#ffffff";
          tt.style.color = theme.text;
          tt.style.border = "1px solid " + theme.border;

          var pctOfGross = totalGross > 0 ? ((d.value / totalGross) * 100).toFixed(1) + "% of Gross List Cost" : "-";
          tt.innerHTML =
            '<div style="font-weight:700; margin-bottom:4px; font-size:13px;">' + d.name.replace("\n", " ") + '</div>' +
            '<div style="color:' + d.color + '; font-weight:700; font-size:14px; margin-bottom:4px;">' +
              formatValue(d.value, config.valueFormat || "compact_currency") + ' (' + pctOfGross + ')' +
            '</div>' +
            '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.4;">' +
              (d.isTotal ? 'Consolidated billing total across all GCP workloads and service categories.' :
               (d.name.indexOf("Credit") !== -1 ? 'Direct CUD credits applied from active 1-Year & 3-Year Flexible/Resource commitments.' :
                'Proportionally allocated fixed commitment fees mapped from central purchasing host projects.')) +
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
      // MODE 2: SERVICE COST & ATTRIBUTION BREAKDOWN (Grouped Bars)
      // ------------------------------------------------------------------
      } else if (layoutMode === "service_breakdown") {
        var subMetrics = ["grossCost", "allocatedFee", "netCost"];
        var subLabels = { grossCost: "Gross On-Demand", allocatedFee: "Allocated Fee", netCost: "Net Attributed" };
        var subColors = { grossCost: theme.baseBar, allocatedFee: theme.allocated, netCost: theme.positive };

        var y0 = d3.scaleBand()
          .domain(activeEntities.map(function (d) { return d.name; }))
          .range([0, innerH])
          .padding(0.24);

        var y1 = d3.scaleBand()
          .domain(subMetrics)
          .range([0, y0.bandwidth()])
          .padding(0.08);

        var maxCost = d3.max(activeEntities, function (d) { return d.grossCost; }) || 1;
        var xScaleGroup = d3.scaleLinear().domain([0, maxCost * 1.15]).range([0, innerW]);

        var entGroups = g.selectAll(".ent-row")
          .data(activeEntities)
          .enter()
          .append("g")
          .attr("class", "ent-row")
          .attr("transform", function (d) { return "translate(0," + y0(d.name) + ")"; })
          .style("cursor", "pointer");

        subMetrics.forEach(function (mKey) {
          entGroups.append("rect")
            .attr("y", y1(mKey))
            .attr("x", 0)
            .attr("width", function (d) { return xScaleGroup(d[mKey] || 0); })
            .attr("height", y1.bandwidth())
            .attr("rx", 3)
            .attr("fill", subColors[mKey])
            .attr("opacity", 0.88);
        });

        // Y Axis (Folder / Entity names)
        g.append("g")
          .call(d3.axisLeft(y0))
          .call(function (sel) { sel.select(".domain").remove(); })
          .selectAll("text")
          .attr("font-size", (10.5 * fontScale) + "px")
          .attr("fill", theme.text)
          .text(function (d) { return d.length > 22 ? d.substring(0, 20) + "\u2026" : d; });

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xScaleGroup).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Tooltip & Drill
        entGroups.on("click", function (event, d) {
          if (d.drillLinks && d.drillLinks.length && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
          }
        });

      // ------------------------------------------------------------------
      // MODE 3: SAVINGS EFFICIENCY & ESR MATRIX (Quadrant Bubble)
      // ------------------------------------------------------------------
      } else if (layoutMode === "savings_efficiency_matrix") {
        var xESR = d3.scaleLinear()
          .domain([0, Math.max(0.6, d3.max(activeEntities, function (d) { return d.esr; }) * 1.15)])
          .range([0, innerW]);

        var ySavings = d3.scaleLinear()
          .domain([0, d3.max(activeEntities, function (d) { return d.netSavings; }) * 1.15])
          .range([innerH, 0]);

        var rGross = d3.scaleSqrt()
          .domain([0, d3.max(activeEntities, function (d) { return d.grossCost; }) || 1])
          .range([6, 28]);

        // Median ESR Reference Line
        var medianESR = d3.median(activeEntities, function (d) { return d.esr; }) || 0.25;
        g.append("line")
          .attr("x1", xESR(medianESR))
          .attr("x2", xESR(medianESR))
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", theme.border)
          .attr("stroke-dasharray", "4,4");

        var bubbles = g.selectAll(".esr-bubble")
          .data(activeEntities)
          .enter()
          .append("g")
          .attr("class", "esr-bubble")
          .style("cursor", "pointer");

        bubbles.append("circle")
          .attr("cx", function (d) { return xESR(d.esr); })
          .attr("cy", function (d) { return ySavings(d.netSavings); })
          .attr("r", function (d) { return rGross(d.grossCost); })
          .attr("fill", theme.positive)
          .attr("fill-opacity", 0.6)
          .attr("stroke", theme.positive)
          .attr("stroke-width", 2);

        bubbles.append("text")
          .attr("x", function (d) { return xESR(d.esr); })
          .attr("y", function (d) { return ySavings(d.netSavings) - rGross(d.grossCost) - 4; })
          .attr("text-anchor", "middle")
          .attr("font-size", (10 * fontScale) + "px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(function (d) { return d.name.length > 15 ? d.substring(0, 13) + "\u2026" : d.name; });

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xESR).ticks(5).tickFormat(function (d) { return (d * 100).toFixed(0) + "%"; }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

        // Y Axis
        g.append("g")
          .call(d3.axisLeft(ySavings).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);

      // ------------------------------------------------------------------
      // MODE 4: CHARGEBACK ALLOCATION SHIFT WALK (Payer to Net)
      // ------------------------------------------------------------------
      } else if (layoutMode === "chargeback_allocation_shift") {
        var shiftSteps = activeEntities.map(function (d) {
          return {
            name: d.name,
            gross: d.grossCost,
            fee: d.allocatedFee,
            net: d.netCost,
            savings: d.netSavings
          };
        });

        var xShift = d3.scaleBand().domain(shiftSteps.map(function (d) { return d.name; })).range([0, innerW]).padding(0.25);
        var yShift = d3.scaleLinear().domain([0, d3.max(shiftSteps, function (d) { return d.gross; }) * 1.15]).range([innerH, 0]);

        var shiftBars = g.selectAll(".shift-bar")
          .data(shiftSteps)
          .enter()
          .append("g")
          .attr("class", "shift-bar")
          .style("cursor", "pointer");

        shiftBars.append("rect")
          .attr("x", function (d) { return xShift(d.name); })
          .attr("y", function (d) { return yShift(d.net); })
          .attr("width", xShift.bandwidth())
          .attr("height", function (d) { return innerH - yShift(d.net); })
          .attr("rx", 3)
          .attr("fill", theme.positive)
          .attr("opacity", 0.85);

        // X Axis
        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xShift))
          .selectAll("text")
          .attr("transform", "rotate(-25)")
          .style("text-anchor", "end")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext)
          .text(function (d) { return d.length > 16 ? d.substring(0, 14) + "\u2026" : d; });

        // Y Axis
        g.append("g")
          .call(d3.axisLeft(yShift).ticks(5).tickFormat(function (d) {
            return formatValue(d, config.valueFormat || "compact_currency");
          }))
          .selectAll("text")
          .attr("font-size", (9.5 * fontScale) + "px")
          .attr("fill", theme.subtext);
      }

      // Interactive Search Bar Binding
      if (searchInput) {
        searchInput.addEventListener("input", function (e) {
          var q = (e.target.value || "").toLowerCase().trim();
          if (!q) {
            d3.selectAll(".ent-row, .esr-bubble, .shift-bar").attr("opacity", 1.0);
          } else {
            d3.selectAll(".ent-row").attr("opacity", function (d) { return d.name.toLowerCase().indexOf(q) !== -1 ? 1.0 : 0.15; });
            d3.selectAll(".esr-bubble").attr("opacity", function (d) { return d.name.toLowerCase().indexOf(q) !== -1 ? 1.0 : 0.15; });
            d3.selectAll(".shift-bar").attr("opacity", function (d) { return d.name.toLowerCase().indexOf(q) !== -1 ? 1.0 : 0.15; });
          }
        });
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
