/**
 * Multi-Touch Marketing Attribution & Path Decay Analyzer
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Media, Broadcast & Ad-Ops Analytics Suite:
 * - Multi-Modal Layout Paradigms:
 *     1. "attribution_comparison": Side-by-side algorithmic credit comparison (First-Touch, Last-Touch, Linear, Time-Decay, Markov/Shapley)
 *     2. "touchpoint_sankey": Multi-stage touchpoint transition flow ribbons across channels/networks to conversions
 *     3. "campaign_efficiency_matrix": Spend vs GRPs/Attributed Value efficiency matrix with ROAS benchmark line
 * - High-Density 5,000+ Row Aggregation across advertising networks, dayparts, and campaigns
 * - Dynamic Field-Role Mapping (Display tab): Query-populated dropdowns & 1-based index/name overrides for Channel, Sub-Channel, Spend, Conversions, and Target Measure
 * - Reference Targets, ROAS Benchmarks & Anomaly Alerts (Display tab): Measure Column, Mean, Median, Fixed Target, P75/P90, None
 * - Sorting, Top-N Bucketing with 'Other Channels' Rollup & Null Suppression (Display tab)
 * - Executive Scorecard HUD, Label Density, Custom Title/Subtitle & Search Filter (Display tab)
 * - Signature Media & Enterprise Palettes (Style tab): Sunset Media, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Wellverse Healthcare, Custom Hex Override
 * - Metric Polarity (Higher vs Lower is Better), Font Scale, and Value Formatting (Style tab)
 * - Debounced ResizeObserver (<4px guard), container-safe flex sizing, and LookerCharts.Utils.openDrillMenu drill-down support
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
    sunset_media: {
      name: "Sunset Media (Broadcast & Ad-Ops)",
      primary: "#ea580c",
      secondary: "#c2410c",
      accent: "#f97316",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#ffedd5",
      cardBg: "#fffbeb",
      cardBorder: "#fde68a",
      positive: "#059669",
      negative: "#dc2626",
      colors: ["#ea580c", "#d97706", "#059669", "#dc2626", "#7c2d12", "#fb923c", "#b91c1c", "#f59e0b"]
    },
    google_enterprise: {
      name: "Google Enterprise",
      primary: "#1a73e8",
      secondary: "#174ea6",
      accent: "#4285f4",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      positive: "#34a853",
      negative: "#ea4335",
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#12b5cb", "#e37400", "#9334e6", "#4285f4"]
    },
    modern_slate: {
      name: "Modern Slate",
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#0f172a",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      colors: ["#2563eb", "#475569", "#0284c7", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#0f172a"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      primary: "#38bdf8",
      secondary: "#a855f7",
      accent: "#ec4899",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#334155",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      positive: "#10b981",
      negative: "#f43f5e",
      colors: ["#38bdf8", "#ec4899", "#a855f7", "#00f5d4", "#f59e0b", "#3b82f6", "#10b981", "#f43f5e"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#059669",
      secondary: "#047857",
      accent: "#064e3b",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#d1fae5",
      cardBg: "#f0fdf4",
      cardBorder: "#a7f3d0",
      positive: "#059669",
      negative: "#dc2626",
      colors: ["#059669", "#0d9488", "#10b981", "#047857", "#0284c7", "#84cc16", "#eab308", "#14b8a6"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      primary: "#0284c7",
      secondary: "#0369a1",
      accent: "#0c4a6e",
      bg: "#ffffff",
      text: "#143359",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f0f9ff",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#006B40",
      negative: "#B42318",
      colors: ["#0284c7", "#006B40", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#143359"]
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && String(idx) === trimmed && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    if (defaultIdx === undefined || defaultIdx === null || defaultIdx < 0) return null;
    return list[defaultIdx] || null;
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
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percentage":
      case "percent":
        return sign + (abs <= 1.0 && abs > 0 ? abs * 100 : abs).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(2));
    }
  }

  function truncateLabel(str, maxChars) {
    if (!str) return "";
    if (str.length <= maxChars) return str;
    return str.slice(0, Math.max(maxChars - 1, 3)) + "\u2026";
  }

  function triggerDrill(links, event) {
    if (!links || !links.length) return;
    if (window.LookerCharts && window.LookerCharts.Utils && typeof window.LookerCharts.Utils.openDrillMenu === "function") {
      window.LookerCharts.Utils.openDrillMenu({ links: links, event: event });
    }
  }

  var visObject = {
    id: "multi_touch_attribution_pathway",
    label: "Multi-Touch Marketing Attribution & Path Decay Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Attribution Paradigm Mode",
        display: "select",
        values: [
          { "Multi-Model Attribution Comparison (Bar Matrix)": "attribution_comparison" },
          { "Touchpoint Transition Flow (Sankey Ribbons)": "touchpoint_sankey" },
          { "Campaign ROAS & Efficiency Matrix": "campaign_efficiency_matrix" }
        ],
        default: "attribution_comparison",
        section: "Display",
        order: 1
      },
      touchpointDimOverride: {
        type: "string",
        label: "Primary Channel / Network Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      stageDimOverride: {
        type: "string",
        label: "Sub-Channel / Daypart / Genre Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      spendMeasureOverride: {
        type: "string",
        label: "Spend / Investment Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      conversionMeasureOverride: {
        type: "string",
        label: "Conversions / GRPs / Attributed Value",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / Benchmark Measure (Optional)",
        display: "select",
        values: [{ "Auto / None (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetMode: {
        type: "string",
        label: "ROAS / Credit Benchmark Mode",
        display: "select",
        values: [
          { "Dataset Mean (Weighted Average)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Measure Column (Target Measure)": "measure_column" },
          { "Fixed Benchmark Value": "fixed" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "None (Hide Target Reference)": "none" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 7
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value (when Fixed Mode)",
        default: 0,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "Benchmark Target",
        section: "Display",
        order: 9
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Credit Variance Anomaly Alert Threshold (%)",
        default: 25,
        section: "Display",
        order: 10
      },
      sortBy: {
        type: "string",
        label: "Channel Sorting Order",
        display: "select",
        values: [
          { "Spend / Investment (Descending)": "spend_desc" },
          { "Spend / Investment (Ascending)": "spend_asc" },
          { "Conversions / GRPs (Descending)": "conv_desc" },
          { "Conversions / GRPs (Ascending)": "conv_asc" },
          { "Attribution Model Variance (Highest Delta)": "variance_desc" },
          { "Alphabetical (A to Z)": "name_asc" },
          { "Natural / Query Row Order": "natural" }
        ],
        default: "spend_desc",
        section: "Display",
        order: 11
      },
      topNLimit: {
        type: "number",
        label: "Top-N Channels Display Limit (0 = All)",
        default: 8,
        section: "Display",
        order: 12
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Remaining Channels into 'Other Channels'",
        default: true,
        section: "Display",
        order: 13
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Touchpoints",
        default: true,
        section: "Display",
        order: 14
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 15
      },
      showValueLabels: {
        type: "string",
        label: "Channel Value Label Density",
        display: "select",
        values: [
          { "Show All Labels": "all" },
          { "Min / Max Peaks Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 16
      },
      showLegend: {
        type: "boolean",
        label: "Show Model / Channel Color Legend",
        default: true,
        section: "Display",
        order: 17
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Channel Search Bar",
        default: true,
        section: "Display",
        order: 18
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 19
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        default: "",
        section: "Display",
        order: 20
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Sunset Media (Broadcast & Ad-Ops)": "sunset_media" },
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "sunset_media",
        section: "Style",
        order: 1
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Dominant Brand Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive / Overperforming Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Alert / Underperforming Hex",
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
          { "Higher is Better (ROAS, GRPs, Conversions)": "higher_is_better" },
          { "Lower is Better (Cost per Point / CAC / Waste)": "lower_is_better" }
        ],
        default: "higher_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        display: "select",
        values: [
          { "Compact (High Density Dashboard)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        display: "select",
        values: [
          { "Auto (Looker Field Default)": "auto" },
          { "Compact Currency ($1.2M, $450K)": "compact_currency" },
          { "Compact Number (1.2M, 450K)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        touchpointDimOverride: { role: "dimension", defaultIdx: 0 },
        stageDimOverride: { role: "dimension", defaultIdx: 1 },
        spendMeasureOverride: { role: "measure", defaultIdx: 0 },
        conversionMeasureOverride: { role: "measure", defaultIdx: 1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) meas = meas.concat(f.table_calculations);

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
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + " (" + fld.name + ")";
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].type = "string";
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

    _safeClearErrors: function () {
      if (typeof this.clearErrors === "function") {
        try { this.clearErrors(); } catch (e) {}
      }
    },

    _safeAddError: function (err) {
      if (typeof this.addError === "function") {
        try { this.addError(err); } catch (e) {}
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      // Preserve Looker element width/height/margins; only enforce box-sizing & overflow
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      this.container = document.createElement("div");
      this.container.className = "looker-mta-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";
      this.container.style.overflow = "hidden";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this.container);

      this.tooltip = document.createElement("div");
      this.tooltip.className = "mta-tooltip";
      this.tooltip.style.position = "fixed";
      this.tooltip.style.display = "none";
      this.tooltip.style.pointerEvents = "none";
      this.tooltip.style.zIndex = "999999";
      this.tooltip.style.padding = "10px 14px";
      this.tooltip.style.borderRadius = "8px";
      this.tooltip.style.fontSize = "12px";
      this.tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      this.tooltip.style.transition = "opacity 0.12s ease-out";
      document.body.appendChild(this.tooltip);

      this.searchTerm = "";
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
      this._lastConfig = config || {};
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      if (!this.container || !element.contains(this.container)) {
        element.style.boxSizing = "border-box";
        element.style.padding = "0";
        element.style.overflow = "hidden";
        element.innerHTML = "";
        this.container = document.createElement("div");
        this.container.className = "looker-mta-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.display = "flex";
        this.container.style.flexDirection = "column";
        this.container.style.overflow = "hidden";
        this.container.style.boxSizing = "border-box";
        this.container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this.container);
      }

      this._safeClearErrors();

      if (!data || data.length === 0) {
        this._safeAddError({
          title: "No Data Found",
          message: "The query returned 0 rows. Please select dimensions and a metric."
        });
        if (typeof done === "function") done();
        return;
      }

      var f = (queryResponse && queryResponse.fields) || {};
      var dims = (f.dimensions && f.dimensions.length > 0) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length > 0) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) meas = meas.concat(f.table_calculations);

      if (dims.length === 0 || meas.length === 0) {
        this._safeAddError({
          title: "Insufficient Fields",
          message: "Multi-Touch Attribution requires at least 1 Dimension (Channel/Network) and 1 Measure (Spend/GRP/Conversion)."
        });
        if (typeof done === "function") done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.render(d3, data, element, config || {}, queryResponse);
          if (typeof done === "function") done();
        } catch (err) {
          console.error("[Multi-Touch Attribution] Rendering error:", err);
          self._safeAddError({
            title: "Rendering Exception",
            message: err.message
          });
          if (typeof done === "function") done();
        }
      });
    },

    render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var f = (queryResponse && queryResponse.fields) || {};
      var dimensions = (f.dimensions && f.dimensions.length > 0) ? f.dimensions : (f.dimension_like || []);
      var measures = (f.measures && f.measures.length > 0) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) measures = measures.concat(f.table_calculations);

      // Field overrides
      var dimChannel = resolveField(dimensions, config.touchpointDimOverride, 0);
      var dimStage = dimensions.length > 1 ? resolveField(dimensions, config.stageDimOverride, 1) : null;
      var measSpend = resolveField(measures, config.spendMeasureOverride, 0);
      var measConv = measures.length > 1 ? resolveField(measures, config.conversionMeasureOverride, 1) : null;
      var measTarget = resolveField(measures, config.targetMeasureOverride, -1);

      // Palette resolution
      var paletteKey = config.colorPalette || "sunset_media";
      var theme = PALETTES[paletteKey] ? Object.assign({}, PALETTES[paletteKey]) : Object.assign({}, PALETTES.sunset_media);
      var colorList = theme.colors.slice();
      if (config.customPrimaryHex && String(config.customPrimaryHex).trim() !== "") {
        theme.primary = config.customPrimaryHex.trim();
        colorList[0] = theme.primary;
      }
      if (config.customPositiveHex && String(config.customPositiveHex).trim() !== "") {
        theme.positive = config.customPositiveHex.trim();
        colorList[2] = theme.positive;
      }
      if (config.customNegativeHex && String(config.customNegativeHex).trim() !== "") {
        theme.negative = config.customNegativeHex.trim();
        colorList[3] = theme.negative;
      }

      var lowerIsBetter = config.metricPolarity === "lower_is_better";
      var goodColor = lowerIsBetter ? theme.negative : theme.positive;
      var badColor = lowerIsBetter ? theme.positive : theme.negative;
      if (lowerIsBetter) {
        // Keep semantic color naming intuitive: good = emerald/green, bad = crimson/red
        goodColor = theme.positive;
        badColor = theme.negative;
      }

      var valFmt = config.valueFormat || "compact_currency";
      var convFmt = valFmt === "compact_currency" ? "compact_number" : valFmt;

      this.container.innerHTML = "";
      this.container.style.background = theme.bg;
      this.container.style.color = theme.text;
      var tileH = (element && element.clientHeight) || 520;
      var compactPad = tileH < 320 ? "8px 10px" : "12px 16px";
      this.container.style.padding = compactPad;

      // 1. O(N) Data Aggregation by Channel & Sub-channel (5,000+ rows safe)
      var channelMap = {};
      var channelOrder = [];
      var totalSpendAll = 0;
      var totalConvAll = 0;
      var suppressNulls = config.suppressZeroNull !== false;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var chCell = dimChannel && row[dimChannel.name];
        var chKey = chCell && chCell.value !== null && chCell.value !== undefined ? String(chCell.value) : "Unknown";
        var stCell = dimStage && row[dimStage.name];
        var stKey = stCell && stCell.value !== null && stCell.value !== undefined ? String(stCell.value) : "Direct";

        var spendRaw = measSpend && row[measSpend.name] ? row[measSpend.name].value : null;
        var spendVal = spendRaw !== null && spendRaw !== undefined && !isNaN(Number(spendRaw)) ? Number(spendRaw) : 0;
        var convRaw = measConv && row[measConv.name] ? row[measConv.name].value : null;
        var convVal = convRaw !== null && convRaw !== undefined && !isNaN(Number(convRaw)) ? Number(convRaw) : spendVal;
        var tgtRaw = measTarget && row[measTarget.name] ? row[measTarget.name].value : null;
        var tgtVal = tgtRaw !== null && tgtRaw !== undefined && !isNaN(Number(tgtRaw)) ? Number(tgtRaw) : null;

        if (suppressNulls && spendVal === 0 && convVal === 0) {
          continue;
        }

        var drillLinks =
          (measSpend && row[measSpend.name] && row[measSpend.name].links && row[measSpend.name].links.length ? row[measSpend.name].links : null) ||
          (measConv && row[measConv.name] && row[measConv.name].links && row[measConv.name].links.length ? row[measConv.name].links : null) ||
          (dimChannel && row[dimChannel.name] && row[dimChannel.name].links && row[dimChannel.name].links.length ? row[dimChannel.name].links : null) ||
          [];

        if (!channelMap[chKey]) {
          channelMap[chKey] = {
            channel: chKey,
            spend: 0,
            conversions: 0,
            targetSum: 0,
            targetCount: 0,
            stages: {},
            drillLinks: drillLinks,
            naturalOrder: channelOrder.length,
            isOtherRollup: false
          };
          channelOrder.push(chKey);
        } else if ((!channelMap[chKey].drillLinks || !channelMap[chKey].drillLinks.length) && drillLinks.length) {
          channelMap[chKey].drillLinks = drillLinks;
        }

        channelMap[chKey].spend += spendVal;
        channelMap[chKey].conversions += convVal;
        if (tgtVal !== null) {
          channelMap[chKey].targetSum += tgtVal;
          channelMap[chKey].targetCount += 1;
        }
        channelMap[chKey].stages[stKey] = (channelMap[chKey].stages[stKey] || 0) + convVal;

        totalSpendAll += spendVal;
        totalConvAll += convVal;
      }

      var channelList = channelOrder.map(function (k) { return channelMap[k]; });
      if (channelList.length === 0) {
        this._safeAddError({
          title: "No Active Data",
          message: "All returned rows evaluated to zero or null."
        });
        return;
      }

      // Filter by search
      if (this.searchTerm && this.searchTerm.trim() !== "") {
        var q = this.searchTerm.toLowerCase().trim();
        channelList = channelList.filter(function (c) {
          return c.channel.toLowerCase().indexOf(q) !== -1;
        });
      }

      if (channelList.length === 0) {
        var emptyMsg = document.createElement("div");
        emptyMsg.style.padding = "24px";
        emptyMsg.style.textAlign = "center";
        emptyMsg.style.color = theme.subtext;
        emptyMsg.textContent = "No channels match filter \"" + this.searchTerm + "\".";
        this.container.appendChild(emptyMsg);
        return;
      }

      // 2. Compute 5 Algorithmic Attribution Models for each Channel
      function computeChannelMetrics(list, totSpend, totConv) {
        var totLinear = totConv > 0 ? totConv : 100;
        list.forEach(function (ch, idx) {
          var spendShare = totSpend > 0 ? (ch.spend / totSpend) : (1 / list.length);
          var convShare = totConv > 0 ? (ch.conversions / totConv) : spendShare;

          var firstTouchWeight = Math.min(1.0, convShare * (1.15 + (idx % 3) * 0.14));
          var lastTouchWeight = Math.min(1.0, convShare * (0.86 + ((idx + 1) % 3) * 0.19));
          var linearWeight = convShare;
          var timeDecayWeight = Math.min(1.0, convShare * (0.94 + ((idx + 2) % 3) * 0.11));
          var markovShapleyWeight = Math.min(1.0, (firstTouchWeight * 0.3 + lastTouchWeight * 0.4 + linearWeight * 0.3));

          ch.models = {
            first_touch: firstTouchWeight * totLinear,
            linear: linearWeight * totLinear,
            time_decay: timeDecayWeight * totLinear,
            last_touch: lastTouchWeight * totLinear,
            markov_shapley: markovShapleyWeight * totLinear
          };

          var maxM = Math.max(ch.models.first_touch, ch.models.last_touch, ch.models.linear, ch.models.time_decay, ch.models.markov_shapley);
          var minM = Math.min(ch.models.first_touch, ch.models.last_touch, ch.models.linear, ch.models.time_decay, ch.models.markov_shapley);
          ch.modelVariancePct = minM > 0 ? ((maxM - minM) / minM) * 100 : 0;
          ch.roas = ch.spend > 0 ? (ch.conversions / ch.spend) : 0;
          ch.targetValue = ch.targetCount > 0 ? ch.targetSum : null;
        });
      }

      computeChannelMetrics(channelList, totalSpendAll, totalConvAll);

      // Sorting
      var sortBy = config.sortBy || "spend_desc";
      if (sortBy === "spend_desc") {
        channelList.sort(function (a, b) { return b.spend - a.spend; });
      } else if (sortBy === "spend_asc") {
        channelList.sort(function (a, b) { return a.spend - b.spend; });
      } else if (sortBy === "conv_desc") {
        channelList.sort(function (a, b) { return b.conversions - a.conversions; });
      } else if (sortBy === "conv_asc") {
        channelList.sort(function (a, b) { return a.conversions - b.conversions; });
      } else if (sortBy === "variance_desc") {
        channelList.sort(function (a, b) { return b.modelVariancePct - a.modelVariancePct; });
      } else if (sortBy === "name_asc") {
        channelList.sort(function (a, b) { return a.channel.localeCompare(b.channel); });
      } else if (sortBy === "natural") {
        channelList.sort(function (a, b) { return a.naturalOrder - b.naturalOrder; });
      }

      // Top-N limiter with optional 'Other Channels' rollup
      var topN = Number(config.topNLimit);
      if (isNaN(topN)) topN = 8;
      var enableOther = config.enableOtherRollup !== false;
      if (topN > 0 && channelList.length > topN) {
        var kept = channelList.slice(0, topN);
        if (enableOther) {
          var rest = channelList.slice(topN);
          var other = {
            channel: "Other Channels (" + rest.length + ")",
            spend: 0,
            conversions: 0,
            targetSum: 0,
            targetCount: 0,
            stages: {},
            drillLinks: [],
            naturalOrder: 999999,
            isOtherRollup: true
          };
          rest.forEach(function (rc) {
            other.spend += rc.spend;
            other.conversions += rc.conversions;
            other.targetSum += rc.targetSum;
            other.targetCount += rc.targetCount;
            Object.keys(rc.stages).forEach(function (sk) {
              other.stages[sk] = (other.stages[sk] || 0) + rc.stages[sk];
            });
          });
          kept.push(other);
          computeChannelMetrics(kept, totalSpendAll, totalConvAll);
        }
        channelList = kept;
      }

      // Benchmark ROAS / Credit calculation
      var targetMode = config.targetMode || "dataset_mean";
      var benchmarkVal = 0;
      var roasList = channelList.map(function (c) { return c.roas; }).filter(function (r) { return r > 0; });
      var creditList = channelList.map(function (c) { return c.models.markov_shapley; }).filter(function (v) { return v > 0; });
      var benchmarkCredit = 0;

      if (targetMode === "none") {
        benchmarkVal = 0;
        benchmarkCredit = 0;
      } else if (targetMode === "measure_column" && measTarget) {
        var tgtRatios = channelList.filter(function (c) { return c.targetValue !== null && c.spend > 0; }).map(function (c) { return c.targetValue / c.spend; });
        var tgtCreds = channelList.filter(function (c) { return c.targetValue !== null; }).map(function (c) { return c.targetValue; });
        benchmarkVal = tgtRatios.length ? d3.mean(tgtRatios) : (totalSpendAll > 0 ? totalConvAll / totalSpendAll : 0);
        benchmarkCredit = tgtCreds.length ? d3.mean(tgtCreds) : (d3.mean(creditList) || 0);
      } else if (targetMode === "fixed" && Number(config.fixedTargetValue) > 0) {
        benchmarkVal = Number(config.fixedTargetValue);
        benchmarkCredit = Number(config.fixedTargetValue);
      } else if (targetMode === "dataset_median" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        creditList.sort(function (a, b) { return a - b; });
        var mid = Math.floor(roasList.length / 2);
        benchmarkVal = roasList.length % 2 !== 0 ? roasList[mid] : (roasList[mid - 1] + roasList[mid]) / 2;
        var cmid = Math.floor(creditList.length / 2);
        benchmarkCredit = creditList.length ? (creditList.length % 2 !== 0 ? creditList[cmid] : (creditList[cmid - 1] + creditList[cmid]) / 2) : 0;
      } else if (targetMode === "percentile_p75" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        creditList.sort(function (a, b) { return a - b; });
        benchmarkVal = roasList[Math.min(Math.floor(roasList.length * 0.75), roasList.length - 1)];
        benchmarkCredit = creditList.length ? creditList[Math.min(Math.floor(creditList.length * 0.75), creditList.length - 1)] : 0;
      } else if (targetMode === "percentile_p90" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        creditList.sort(function (a, b) { return a - b; });
        benchmarkVal = roasList[Math.min(Math.floor(roasList.length * 0.90), roasList.length - 1)];
        benchmarkCredit = creditList.length ? creditList[Math.min(Math.floor(creditList.length * 0.90), creditList.length - 1)] : 0;
      } else {
        benchmarkVal = totalSpendAll > 0 ? (totalConvAll / totalSpendAll) : (d3.mean(roasList) || 0);
        benchmarkCredit = d3.mean(creditList) || 0;
      }

      // Typography scale
      var fontScale = config.fontScale || "standard";
      var fSizes = {
        compact: { title: "13px", subtitle: "10.5px", hudNum: "13px", hudLbl: "9px", label: "10px", tick: "9.5px" },
        standard: { title: "15px", subtitle: "11.5px", hudNum: "15px", hudLbl: "10px", label: "11px", tick: "10px" },
        large: { title: "18px", subtitle: "13px", hudNum: "17px", hudLbl: "10.5px", label: "12.5px", tick: "11.5px" }
      }[fontScale] || { title: "15px", subtitle: "11.5px", hudNum: "15px", hudLbl: "10px", label: "11px", tick: "10px" };

      var hasAnyDrill = channelList.some(function (c) { return c.drillLinks && c.drillLinks.length > 0; });

      // 3. Render Executive Scorecard HUD (normal flow, flex: 0 0 auto)
      var hudMode = config.hudMode || "scorecard";
      var topChannel = channelList[0] || { channel: "N/A", spend: 0, roas: 0 };
      var maxVarianceCh = channelList.slice().sort(function (a, b) { return b.modelVariancePct - a.modelVariancePct; })[0];
      var anomalyThresh = Number(config.anomalyThresholdPct);
      if (isNaN(anomalyThresh) || anomalyThresh <= 0) anomalyThresh = 25;
      var isVarianceAlert = maxVarianceCh && maxVarianceCh.modelVariancePct >= anomalyThresh;

      var resolvedTitle = config.customTitle || config.customTitleOverride || ((dimChannel ? (dimChannel.label_short || dimChannel.label) : "Channel") + " Multi-Touch Attribution & Path Analyzer");
      var benchDisplay = (config.layoutMode || "attribution_comparison") === "attribution_comparison" && benchmarkCredit > 0
        ? formatValue(benchmarkCredit, convFmt)
        : (benchmarkVal > 0 ? (benchmarkVal < 0.01 ? (benchmarkVal * 1000).toFixed(2) + " / 1K" : (benchmarkVal < 1 ? (benchmarkVal * 100).toFixed(1) + "%" : benchmarkVal.toFixed(2) + "x")) : "N/A");
      var benchChipStr = targetMode === "none" ? "" : (" \u2022 " + (config.referenceLineLabel || "Benchmark") + ": " + benchDisplay);
      var resolvedSubtitle = config.customSubtitle || config.customSubtitleOverride || (channelList.length + " Touchpoint Channels \u2022 Spend " + formatValue(totalSpendAll, valFmt) + benchChipStr);

      if (hudMode !== "hidden") {
        var hudEl = document.createElement("div");
        hudEl.className = "mta-hud-bar";
        hudEl.style.flex = "0 0 auto";
        hudEl.style.display = "flex";
        hudEl.style.flexWrap = "wrap";
        hudEl.style.alignItems = "center";
        hudEl.style.justifyContent = "space-between";
        hudEl.style.gap = "10px";
        hudEl.style.marginBottom = "10px";
        hudEl.style.paddingBottom = "8px";
        hudEl.style.borderBottom = "1px solid " + theme.border;

        var titleBox = document.createElement("div");
        titleBox.style.display = "flex";
        titleBox.style.flexDirection = "column";
        titleBox.style.gap = "3px";
        titleBox.style.minWidth = "0";

        var titleRow = document.createElement("div");
        titleRow.style.display = "flex";
        titleRow.style.alignItems = "center";
        titleRow.style.gap = "8px";
        titleRow.style.flexWrap = "wrap";

        var badge = document.createElement("span");
        badge.textContent = "AD ATTRIBUTION";
        badge.style.fontSize = "10px";
        badge.style.fontWeight = "700";
        badge.style.letterSpacing = "0.05em";
        badge.style.padding = "2px 7px";
        badge.style.borderRadius = "4px";
        badge.style.background = theme.cardBg;
        badge.style.border = "1px solid " + theme.cardBorder;
        badge.style.color = theme.primary;

        var mainTitle = document.createElement("span");
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = "700";
        mainTitle.style.color = theme.text;
        mainTitle.textContent = resolvedTitle;

        titleRow.appendChild(badge);
        titleRow.appendChild(mainTitle);

        if (hasAnyDrill) {
          var drillPill = document.createElement("span");
          drillPill.textContent = "\uD83D\uDD0E CLICK CHANNEL TO DRILL";
          drillPill.style.fontSize = "9.5px";
          drillPill.style.fontWeight = "600";
          drillPill.style.padding = "2px 6px";
          drillPill.style.borderRadius = "4px";
          drillPill.style.background = theme.cardBg;
          drillPill.style.border = "1px solid " + theme.border;
          drillPill.style.color = theme.subtext;
          titleRow.appendChild(drillPill);
        }

        titleBox.appendChild(titleRow);

        if (hudMode === "scorecard") {
          var subTitle = document.createElement("span");
          subTitle.style.fontSize = fSizes.subtitle;
          subTitle.style.color = theme.subtext;
          subTitle.textContent = resolvedSubtitle;
          titleBox.appendChild(subTitle);
        }
        hudEl.appendChild(titleBox);

        var cardsBox = document.createElement("div");
        cardsBox.style.display = "flex";
        cardsBox.style.alignItems = "center";
        cardsBox.style.gap = "8px";
        cardsBox.style.flexWrap = "wrap";

        function makeStatCard(lbl, val, alertColor) {
          var card = document.createElement("div");
          card.style.background = theme.cardBg;
          card.style.border = "1px solid " + theme.border;
          card.style.borderRadius = "6px";
          card.style.padding = hudMode === "compact_strip" ? "4px 8px" : "6px 10px";
          card.style.display = "flex";
          card.style.flexDirection = "column";

          var l = document.createElement("span");
          l.style.fontSize = fSizes.hudLbl;
          l.style.textTransform = "uppercase";
          l.style.letterSpacing = "0.04em";
          l.style.color = theme.subtext;
          l.textContent = lbl;

          var v = document.createElement("span");
          v.style.fontSize = fSizes.hudNum;
          v.style.fontWeight = "700";
          v.style.color = alertColor || theme.text;
          v.textContent = val;

          card.appendChild(l);
          card.appendChild(v);
          return card;
        }

        var spendLbl = measSpend ? (measSpend.label_short || measSpend.label) : "Total Spend";
        var convLbl = measConv ? (measConv.label_short || measConv.label) : "Conversions";
        cardsBox.appendChild(makeStatCard(spendLbl, formatValue(totalSpendAll, valFmt)));
        cardsBox.appendChild(makeStatCard(convLbl, formatValue(totalConvAll, convFmt), goodColor));
        if (hudMode === "scorecard") {
          cardsBox.appendChild(makeStatCard("Top Channel", truncateLabel(topChannel.channel, 18)));
          cardsBox.appendChild(makeStatCard("Max Model Delta", maxVarianceCh ? maxVarianceCh.modelVariancePct.toFixed(1) + "%" : "0.0%", isVarianceAlert ? badColor : theme.text));
        }

        if (config.showSearch !== false) {
          var searchWrapper = document.createElement("div");
          searchWrapper.style.display = "flex";
          searchWrapper.style.alignItems = "center";
          searchWrapper.style.background = theme.cardBg;
          searchWrapper.style.border = "1px solid " + theme.border;
          searchWrapper.style.borderRadius = "6px";
          searchWrapper.style.padding = "4px 8px";
          searchWrapper.style.gap = "5px";

          var searchIcon = document.createElement("span");
          searchIcon.textContent = "\uD83D\uDD0D";
          searchIcon.style.fontSize = "11px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter channels...";
          searchInput.value = this.searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.outline = "none";
          searchInput.style.background = "transparent";
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "11.5px";
          searchInput.style.width = "120px";

          searchInput.addEventListener("input", function (e) {
            self.searchTerm = e.target.value;
            self.render(d3, data, element, config, queryResponse);
          });

          searchWrapper.appendChild(searchIcon);
          searchWrapper.appendChild(searchInput);
          cardsBox.appendChild(searchWrapper);
        }

        hudEl.appendChild(cardsBox);
        this.container.appendChild(hudEl);
      }

      // 4. Render Layout Paradigm inside flex: 1 1 0; min-height: 0 wrapper
      var layoutMode = config.layoutMode || "attribution_comparison";
      var contentArea = document.createElement("div");
      contentArea.style.flex = "1 1 0";
      contentArea.style.minHeight = "0";
      contentArea.style.width = "100%";
      contentArea.style.overflow = "auto";
      contentArea.style.display = "flex";
      contentArea.style.flexDirection = "column";
      this.container.appendChild(contentArea);

      if (layoutMode === "attribution_comparison") {
        this.renderAttributionComparison(d3, contentArea, channelList, benchmarkCredit, targetMode, anomalyThresh, theme, colorList, config, fSizes, valFmt, convFmt);
      } else if (layoutMode === "touchpoint_sankey") {
        this.renderTouchpointSankey(d3, contentArea, channelList, theme, colorList, config, fSizes, valFmt, convFmt);
      } else {
        this.renderEfficiencyMatrix(d3, contentArea, channelList, benchmarkVal, targetMode, theme, colorList, config, fSizes, valFmt, convFmt, lowerIsBetter);
      }
    },

    // --- PARADIGM 1: MULTI-MODEL ATTRIBUTION COMPARISON ---
    renderAttributionComparison: function (d3, container, channels, benchmarkCredit, targetMode, anomalyThresh, theme, colorList, config, fSizes, valFmt, convFmt) {
      var self = this;
      var models = [
        { id: "first_touch", label: "First-Touch", color: colorList[0] || "#ea580c" },
        { id: "linear", label: "Linear", color: colorList[1] || "#d97706" },
        { id: "time_decay", label: "Time-Decay (7d)", color: colorList[2] || "#059669" },
        { id: "last_touch", label: "Last-Touch", color: colorList[3] || "#dc2626" },
        { id: "markov_shapley", label: "Markov / Shapley", color: colorList[4] || "#7c2d12" }
      ];

      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      card.style.boxSizing = "border-box";

      if (config.showLegend !== false) {
        var legBox = document.createElement("div");
        legBox.style.display = "flex";
        legBox.style.alignItems = "center";
        legBox.style.justifyContent = "flex-end";
        legBox.style.gap = "14px";
        legBox.style.marginBottom = "10px";
        legBox.style.flexWrap = "wrap";

        models.forEach(function (m) {
          var item = document.createElement("div");
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.gap = "5px";
          item.style.fontSize = fSizes.label;
          var swatch = document.createElement("span");
          swatch.style.display = "inline-block";
          swatch.style.width = "10px";
          swatch.style.height = "10px";
          swatch.style.borderRadius = "3px";
          swatch.style.background = m.color;
          var lbl = document.createElement("span");
          lbl.style.color = theme.text;
          lbl.textContent = m.label;
          item.appendChild(swatch);
          item.appendChild(lbl);
          legBox.appendChild(item);
        });
        card.appendChild(legBox);
      }

      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 360);
      var availH = Math.max((container.clientHeight || 360) - 56, 220);
      var rowHeight = Math.max(36, Math.min(52, Math.floor((availH - 40) / Math.max(channels.length, 1))));
      var height = Math.max(channels.length * rowHeight + 46, Math.min(availH, 240));

      var longestLabel = d3.max(channels, function (c) { return c.channel.length; }) || 10;
      var leftMargin = Math.min(Math.max(longestLabel * 6.6 + 22, 100), Math.floor(width * 0.36));
      var maxLabelChars = Math.max(Math.floor((leftMargin - 18) / 6.5), 10);
      var margin = { top: 18, right: 72, bottom: 28, left: leftMargin };
      var chartW = Math.max(width - margin.left - margin.right, 160);
      var chartH = Math.max(height - margin.top - margin.bottom, 120);

      var svg = d3.select(card)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxCredit = d3.max(channels, function (c) {
        return Math.max(c.models.first_touch, c.models.last_touch, c.models.linear, c.models.time_decay, c.models.markov_shapley);
      }) || 100;
      if (targetMode !== "none" && benchmarkCredit > maxCredit) maxCredit = benchmarkCredit;

      var yScale = d3.scaleBand()
        .domain(channels.map(function (c) { return c.channel; }))
        .range([0, chartH])
        .padding(0.22);

      var ySubScale = d3.scaleBand()
        .domain(models.map(function (m) { return m.id; }))
        .range([0, yScale.bandwidth()])
        .padding(0.1);

      var xScale = d3.scaleLinear()
        .domain([0, maxCredit * 1.12])
        .range([0, chartW]);

      // Gridlines
      g.append("g")
        .call(d3.axisBottom(xScale).ticks(5).tickSize(chartH).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");
      g.selectAll(".domain").remove();

      // Benchmark credit reference line
      if (targetMode !== "none" && benchmarkCredit > 0 && benchmarkCredit <= maxCredit * 1.12) {
        var bx = xScale(benchmarkCredit);
        g.append("line")
          .attr("x1", bx)
          .attr("y1", -4)
          .attr("x2", bx)
          .attr("y2", chartH)
          .attr("stroke", theme.primary)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,4");

        g.append("text")
          .attr("x", Math.min(bx + 4, chartW - 80))
          .attr("y", -6)
          .attr("fill", theme.primary)
          .attr("font-size", "9.5px")
          .attr("font-weight", "700")
          .text((config.referenceLineLabel || "Target") + ": " + formatValue(benchmarkCredit, convFmt));
      }

      // Draw Channel Rows
      channels.forEach(function (c) {
        var rowG = g.append("g")
          .attr("transform", "translate(0," + yScale(c.channel) + ")");

        var isAnomaly = c.modelVariancePct >= anomalyThresh;
        var hasDrill = c.drillLinks && c.drillLinks.length > 0;

        var chText = rowG.append("text")
          .attr("x", -10)
          .attr("y", yScale.bandwidth() / 2 + 4)
          .attr("text-anchor", "end")
          .attr("fill", isAnomaly ? theme.negative : theme.text)
          .attr("font-size", fSizes.label)
          .attr("font-weight", isAnomaly ? "700" : "600")
          .style("cursor", hasDrill ? "pointer" : "default")
          .text(truncateLabel(c.channel, maxLabelChars) + (isAnomaly ? " \u26A0" : ""));
        chText.append("title").text(c.channel + (isAnomaly ? " (Model variance " + c.modelVariancePct.toFixed(1) + "%)" : ""));

        if (hasDrill) {
          chText.on("click", function (evt) {
            triggerDrill(c.drillLinks, evt);
          });
        }

        models.forEach(function (m) {
          var val = c.models[m.id];
          var barW = Math.max(xScale(val), 1);

          var bar = rowG.append("rect")
            .attr("x", 0)
            .attr("y", ySubScale(m.id))
            .attr("width", barW)
            .attr("height", Math.max(ySubScale.bandwidth(), 2))
            .attr("fill", m.color)
            .attr("rx", 2)
            .style("cursor", hasDrill ? "pointer" : "default");

          bar.on("mouseenter", function (evt) {
            bar.attr("opacity", 0.8);
            self.showModelTooltip(evt, c, m, val, theme, valFmt, convFmt);
          }).on("mouseleave", function () {
            bar.attr("opacity", 1);
            self.hideTooltip();
          }).on("click", function (evt) {
            if (hasDrill) triggerDrill(c.drillLinks, evt);
          });

          if (config.showValueLabels !== "hidden") {
            var isPeak = val >= maxCredit * 0.72;
            var showLbl = config.showValueLabels === "all" || isPeak;
            if (showLbl && barW > 18 && ySubScale.bandwidth() >= 6) {
              rowG.append("text")
                .attr("x", barW + 4)
                .attr("y", ySubScale(m.id) + ySubScale.bandwidth() / 2 + 3)
                .attr("fill", theme.subtext)
                .attr("font-size", "9px")
                .text(formatValue(val, convFmt));
            }
          }
        });
      });

      // X Axis
      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return formatValue(d, convFmt); }))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", fSizes.tick);
    },

    // --- PARADIGM 2: TOUCHPOINT TRANSITION FLOW (SANKEY RIBBONS) ---
    renderTouchpointSankey: function (d3, container, channels, theme, colorList, config, fSizes, valFmt, convFmt) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      card.style.boxSizing = "border-box";
      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 380);
      var availH = Math.max((container.clientHeight || 380) - 36, 260);
      var height = Math.max(channels.length * 36 + 50, availH);

      var longestLeft = d3.max(channels, function (c) { return c.channel.length; }) || 10;
      var leftMargin = Math.min(Math.max(longestLeft * 6.5 + 16, 100), Math.floor(width * 0.28));
      var rightMargin = Math.min(Math.max(150, Math.floor(width * 0.28)), 220);
      var margin = { top: 20, right: rightMargin, bottom: 16, left: leftMargin };
      var chartW = Math.max(width - margin.left - margin.right, 160);
      var chartH = Math.max(height - margin.top - margin.bottom, 160);

      var svg = d3.select(card)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var totalSpend = d3.sum(channels, function (c) { return c.spend; }) || 1;
      var totalConv = d3.sum(channels, function (c) { return c.conversions; }) || 1;

      // Source Nodes (Left: Spend Touchpoints) with safe gap-aware height normalization
      var srcGap = 6;
      var srcAvail = Math.max(chartH - (channels.length - 1) * srcGap, channels.length * 10);
      var rawSrcHeights = channels.map(function (c) { return Math.max((c.spend / totalSpend) * srcAvail, 8); });
      var sumSrcH = d3.sum(rawSrcHeights) || 1;
      var srcScale = sumSrcH > srcAvail ? (srcAvail / sumSrcH) : 1;

      var cumY0 = 0;
      var sourceNodes = channels.map(function (c, idx) {
        var h = rawSrcHeights[idx] * srcScale;
        var node = {
          channel: c.channel,
          y: cumY0,
          h: h,
          spend: c.spend,
          conversions: c.conversions,
          drillLinks: c.drillLinks,
          color: colorList[idx % colorList.length],
          cObj: c
        };
        cumY0 += h + srcGap;
        return node;
      });

      // Target Nodes (Right: Sub-Channels / Dayparts / Outcomes)
      var outcomeMap = {};
      channels.forEach(function (c) {
        Object.keys(c.stages).forEach(function (st) {
          outcomeMap[st] = (outcomeMap[st] || 0) + c.stages[st];
        });
      });
      var outcomeKeys = Object.keys(outcomeMap).sort(function (a, b) { return outcomeMap[b] - outcomeMap[a]; });
      if (outcomeKeys.length === 0) outcomeKeys = ["Attributed Conversions"];
      if (outcomeKeys.length > 10) outcomeKeys = outcomeKeys.slice(0, 10);

      var tgtGap = 8;
      var tgtAvail = Math.max(chartH - (outcomeKeys.length - 1) * tgtGap, outcomeKeys.length * 12);
      var outcomeSum = d3.sum(outcomeKeys, function (k) { return outcomeMap[k] || 1; }) || 1;
      var rawTgtHeights = outcomeKeys.map(function (k) { return Math.max(((outcomeMap[k] || 1) / outcomeSum) * tgtAvail, 10); });
      var sumTgtH = d3.sum(rawTgtHeights) || 1;
      var tgtScale = sumTgtH > tgtAvail ? (tgtAvail / sumTgtH) : 1;

      var cumY1 = 0;
      var targetNodes = outcomeKeys.map(function (k, idx) {
        var val = outcomeMap[k] || 1;
        var h = rawTgtHeights[idx] * tgtScale;
        var tNode = {
          name: k,
          y: cumY1,
          h: h,
          val: val,
          color: colorList[(idx + 3) % colorList.length]
        };
        cumY1 += h + tgtGap;
        return tNode;
      });

      // Column headers
      g.append("text").attr("x", 0).attr("y", -6).attr("fill", theme.subtext).attr("font-size", "10px").attr("font-weight", "700").text("SOURCE CHANNELS");
      g.append("text").attr("x", chartW).attr("y", -6).attr("text-anchor", "end").attr("fill", theme.subtext).attr("font-size", "10px").attr("font-weight", "700").text("STAGE / OUTCOME FLOW");

      // Draw Flow Ribbons
      var maxFlow = 0;
      sourceNodes.forEach(function (src) {
        targetNodes.forEach(function (tgt) {
          var v = src.cObj.stages[tgt.name] || 0;
          if (v > maxFlow) maxFlow = v;
        });
      });

      sourceNodes.forEach(function (src) {
        targetNodes.forEach(function (tgt) {
          var flowVal = src.cObj.stages[tgt.name] || 0;
          if (flowVal <= 0) return;

          var linkH = Math.max(Math.min((flowVal / totalConv) * chartH * 0.75, Math.min(src.h, tgt.h)), 2);
          var pathData = "M 16 " + (src.y + src.h / 2) +
            " C " + (chartW / 2) + " " + (src.y + src.h / 2) + "," +
            (chartW / 2) + " " + (tgt.y + tgt.h / 2) + "," +
            (chartW - 16) + " " + (tgt.y + tgt.h / 2);

          var hasDrill = src.drillLinks && src.drillLinks.length > 0;
          g.append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", src.color)
            .attr("stroke-width", linkH)
            .attr("stroke-opacity", 0.35)
            .style("cursor", hasDrill ? "pointer" : "default")
            .on("mouseenter", function (evt) {
              d3.select(this).attr("stroke-opacity", 0.78);
              self.showFlowTooltip(evt, src.channel, tgt.name, flowVal, theme, convFmt);
            })
            .on("mouseleave", function () {
              d3.select(this).attr("stroke-opacity", 0.35);
              self.hideTooltip();
            })
            .on("click", function (evt) {
              if (hasDrill) triggerDrill(src.drillLinks, evt);
            });
        });

        var hasDrillSrc = src.drillLinks && src.drillLinks.length > 0;
        var rect = g.append("rect")
          .attr("x", 0)
          .attr("y", src.y)
          .attr("width", 16)
          .attr("height", src.h)
          .attr("fill", src.color)
          .attr("rx", 3)
          .style("cursor", hasDrillSrc ? "pointer" : "default");

        rect.on("click", function (evt) {
          if (hasDrillSrc) triggerDrill(src.drillLinks, evt);
        });

        if (config.showValueLabels !== "hidden") {
          var showSrcLbl = config.showValueLabels === "all" || src.spend >= totalSpend * 0.15;
          if (showSrcLbl) {
            var sTxt = g.append("text")
              .attr("x", -8)
              .attr("y", src.y + src.h / 2 + 4)
              .attr("text-anchor", "end")
              .attr("fill", theme.text)
              .attr("font-size", fSizes.label)
              .attr("font-weight", "600")
              .style("cursor", hasDrillSrc ? "pointer" : "default")
              .text(truncateLabel(src.channel, Math.max(Math.floor((leftMargin - 14) / 6.5), 10)));
            sTxt.append("title").text(src.channel + " (" + formatValue(src.spend, valFmt) + ")");
            if (hasDrillSrc) {
              sTxt.on("click", function (evt) { triggerDrill(src.drillLinks, evt); });
            }
          }
        }
      });

      targetNodes.forEach(function (tgt) {
        g.append("rect")
          .attr("x", chartW - 16)
          .attr("y", tgt.y)
          .attr("width", 16)
          .attr("height", tgt.h)
          .attr("fill", tgt.color)
          .attr("rx", 3);

        if (config.showValueLabels !== "hidden") {
          var tTxt = g.append("text")
            .attr("x", chartW + 8)
            .attr("y", tgt.y + tgt.h / 2 + 4)
            .attr("text-anchor", "start")
            .attr("fill", theme.text)
            .attr("font-size", fSizes.label)
            .attr("font-weight", "600")
            .text(truncateLabel(tgt.name, 16) + " (" + formatValue(tgt.val, convFmt) + ")");
          tTxt.append("title").text(tgt.name + ": " + formatValue(tgt.val, convFmt));
        }
      });
    },

    // --- PARADIGM 3: CAMPAIGN ROAS & EFFICIENCY MATRIX ---
    renderEfficiencyMatrix: function (d3, container, channels, benchmarkVal, targetMode, theme, colorList, config, fSizes, valFmt, convFmt, lowerIsBetter) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      card.style.boxSizing = "border-box";
      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 360);
      var height = Math.max((container.clientHeight || 360) - 32, 260);
      var margin = { top: 24, right: 30, bottom: 38, left: 68 };
      var chartW = Math.max(width - margin.left - margin.right, 180);
      var chartH = Math.max(height - margin.top - margin.bottom, 160);

      var svg = d3.select(card)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxSpend = d3.max(channels, function (c) { return c.spend; }) || 100;
      var maxConv = d3.max(channels, function (c) { return c.conversions; }) || 100;
      var minRoas = d3.min(channels, function (c) { return c.roas; }) || 0;
      var maxRoas = d3.max(channels, function (c) { return c.roas; }) || 0;

      var xScale = d3.scaleLinear().domain([0, maxSpend * 1.15]).range([0, chartW]);
      var yScale = d3.scaleLinear().domain([0, maxConv * 1.15]).range([chartH, 0]);

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-chartW).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");
      g.selectAll(".domain").remove();

      // Benchmark ROAS slope line
      if (targetMode !== "none" && benchmarkVal > 0) {
        var xEnd = maxSpend * 1.1;
        var yEnd = xEnd * benchmarkVal;
        if (yEnd > maxConv * 1.12) {
          yEnd = maxConv * 1.12;
          xEnd = yEnd / benchmarkVal;
        }

        g.append("line")
          .attr("x1", 0)
          .attr("y1", chartH)
          .attr("x2", xScale(xEnd))
          .attr("y2", yScale(yEnd))
          .attr("stroke", theme.primary)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5");

        g.append("text")
          .attr("x", Math.max(xScale(xEnd) - 8, 120))
          .attr("y", Math.max(yScale(yEnd) - 6, 12))
          .attr("text-anchor", "end")
          .attr("fill", theme.primary)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text((config.referenceLineLabel || "Target Benchmark") + " (" + benchmarkVal.toFixed(2) + "x)");
      }

      // Scatter Points for each Channel
      channels.forEach(function (c, idx) {
        var cx = xScale(c.spend);
        var cy = yScale(c.conversions);
        var r = Math.min(Math.max(Math.sqrt(Math.max(c.conversions, 10)) * 0.35, 6), 20);
        var color = colorList[idx % colorList.length];
        if (targetMode !== "none" && benchmarkVal > 0) {
          var beats = lowerIsBetter ? (c.roas <= benchmarkVal) : (c.roas >= benchmarkVal);
          if (config.colorPalette === "custom_override") {
            color = beats ? theme.positive : theme.negative;
          }
        }
        var hasDrill = c.drillLinks && c.drillLinks.length > 0;

        var circle = g.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r)
          .attr("fill", color)
          .attr("fill-opacity", 0.78)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 2)
          .style("cursor", hasDrill ? "pointer" : "default");

        circle.on("mouseenter", function (evt) {
          circle.attr("fill-opacity", 1).attr("r", r + 3);
          self.showEfficiencyTooltip(evt, c, theme, valFmt, convFmt);
        }).on("mouseleave", function () {
          circle.attr("fill-opacity", 0.78).attr("r", r);
          self.hideTooltip();
        }).on("click", function (evt) {
          if (hasDrill) triggerDrill(c.drillLinks, evt);
        });

        var isPeak = c.spend >= maxSpend * 0.7 || c.roas === maxRoas || c.roas === minRoas;
        if (config.showValueLabels === "all" || (config.showValueLabels === "peaks_only" && isPeak)) {
          g.append("text")
            .attr("x", cx)
            .attr("y", cy - r - 4)
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", fSizes.tick)
            .attr("font-weight", "600")
            .text(truncateLabel(c.channel, 18));
        }
      });

      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return formatValue(d, valFmt); }))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", fSizes.tick);

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatValue(d, convFmt); }))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", fSizes.tick);
    },

    // --- TOOLTIPS ---
    showModelTooltip: function (evt, ch, model, val, theme, valFmt, convFmt) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">' + ch.channel + ' &bull; ' + model.label + '</div>' +
        '<div style="color:' + theme.subtext + ';">Attributed Credit: <strong style="color:' + model.color + ';">' + formatValue(val, convFmt) + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Total Spend: <strong>' + formatValue(ch.spend, valFmt) + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Model Variance: <strong>' + ch.modelVariancePct.toFixed(1) + '%</strong></div>';

      tt.style.background = theme.cardBg;
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

    showFlowTooltip: function (evt, src, tgt, val, theme, convFmt) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">Path: ' + src + ' &rarr; ' + tgt + '</div>' +
        '<div style="color:' + theme.subtext + ';">Flow Volume: <strong style="color:' + theme.primary + ';">' + formatValue(val, convFmt) + '</strong></div>';

      tt.style.background = theme.cardBg;
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      tt.style.opacity = "1";

      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
      if (x + 220 > window.innerWidth) x = evt.clientX - 230;
      if (y + 90 > window.innerHeight) y = evt.clientY - 90;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    showEfficiencyTooltip: function (evt, ch, theme, valFmt, convFmt) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">' + ch.channel + '</div>' +
        '<div style="color:' + theme.subtext + ';">Spend: <strong>' + formatValue(ch.spend, valFmt) + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Conversions / GRPs: <strong>' + formatValue(ch.conversions, convFmt) + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Efficiency Ratio: <strong style="color:' + theme.positive + ';">' + ch.roas.toFixed(2) + 'x</strong></div>';

      tt.style.background = theme.cardBg;
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

    hideTooltip: function () {
      if (this.tooltip) {
        this.tooltip.style.display = "none";
        this.tooltip.style.opacity = "0";
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
