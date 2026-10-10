/**
 * Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Horizon Graph Visual Paradigm:
 * - Solves the critical FinOps and observability challenge of visualizing 20+ concurrent
 *   cloud commitments (1-Year & 3-Year CUDs, Flex CUDs, BigQuery Slot Reservations, Cloud SQL)
 *   in a compact executive space without chart clutter.
 * - Folds metric values across layered color density bands (2-band or 3-band) with negative
 *   waste values mirrored and rendered with deficit alerts.
 * - Dynamic baseline tracking (Quota, 100% Commitment Capacity, Mean, Median, or Target).
 * - Full client-side O(N) aggregation handling 5,000+ rows smoothly.
 * - Strict 2-Tab Options Architecture: "Display" and "Style" only (no tab overcrowding).
 * - Debounced ResizeObserver (<4px guard, never width:100%/height:100% on element).
 * - Looker native drill-down integration on data points and series lanes.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.area === "function") {
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
    emerald_finops: {
      name: "Emerald FinOps (Cloud Sustainability & Savings)",
      posBands: ["#a7f3d0", "#34d399", "#059669", "#064e3b"],
      negBands: ["#fecdd3", "#f87171", "#dc2626", "#881337"],
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      text: "#064e3b",
      subtext: "#047857",
      border: "#bbf7d0",
      grid: "#e2e8f0",
      baseline: "#047857",
      hudBg: "rgba(255, 255, 255, 0.96)"
    },
    google_enterprise: {
      name: "Google Enterprise",
      posBands: ["#bbdefb", "#42a5f5", "#1976d2", "#0d47a1"],
      negBands: ["#ffcdd2", "#ef5350", "#c62828", "#b71c1c"],
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#f1f3f4",
      baseline: "#1a73e8",
      hudBg: "rgba(255, 255, 255, 0.96)"
    },
    modern_slate: {
      name: "Modern Slate",
      posBands: ["#cbd5e1", "#64748b", "#334155", "#0f172a"],
      negBands: ["#fecaca", "#f87171", "#ef4444", "#991b1b"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      baseline: "#2563eb",
      hudBg: "rgba(255, 255, 255, 0.96)"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (NOC / SecOps)",
      posBands: ["#083344", "#06b6d4", "#22d3ee", "#67e8f9"],
      negBands: ["#450a0a", "#dc2626", "#f87171", "#fca5a5"],
      bg: "#0b1120",
      cardBg: "#111827",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#1e293b",
      baseline: "#38bdf8",
      hudBg: "rgba(17, 24, 39, 0.94)"
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      posBands: ["#fed7aa", "#fb923c", "#ea580c", "#7c2d12"],
      negBands: ["#fce7f3", "#f472b6", "#db2777", "#831843"],
      bg: "#ffffff",
      cardBg: "#fffbeb",
      text: "#431407",
      subtext: "#7c2d12",
      border: "#fed7aa",
      grid: "#fff7ed",
      baseline: "#ea580c",
      hudBg: "rgba(255, 255, 255, 0.96)"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      posBands: ["#bbf7d0", "#4ade80", "#16a34a", "#14532d"],
      negBands: ["#fee2e2", "#f87171", "#dc2626", "#7f1d1d"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#143359",
      subtext: "#64748b",
      border: "#cbd5e1",
      grid: "#eef2f7",
      baseline: "#2e7cf6",
      hudBg: "rgba(255, 255, 255, 0.96)"
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
    return defaultIdx >= 0 ? (list[defaultIdx] || list[0]) : null;
  }

  function formatNumber(val, formatType, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (formatType === "auto" && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (formatType === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(0);
    }
    if (formatType === "compact_number" || formatType === "compact") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + abs.toFixed(1);
    }
    if (formatType === "percentage" || formatType === "percent") {
      return (num * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
    }
    if (formatType === "decimal_2" || formatType === "decimal") {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (formatType === "integer") {
      return sign + abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (formatType === "raw") {
      return String(val);
    }
    // Default fallback
    if (abs <= 1.0 && abs > 0) return (num * 100).toFixed(1) + "%";
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
    return sign + abs.toFixed(1);
  }

  var visObject = {
    id: "cloud_finops_commit_horizon",
    label: "Cloud FinOps Commit/CUD Utilization & Waste Horizon Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Horizon Visualization Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "2-Band Horizon (Standard Density)": "horizon_2band" },
          { "3-Band Horizon (Ultra-Compact High Dynamic Range)": "horizon_3band" },
          { "Split Positive Utilization vs Breakage Waste": "split_mirror" },
          { "Small Multiples Sparkline Bands": "small_multiples" }
        ],
        default: "horizon_2band"
      },
      entityDimOverride: {
        type: "string",
        label: "Commitment / Series Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      dateDimOverride: {
        type: "string",
        label: "Date / Timeline Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measureFieldOverride: {
        type: "string",
        label: "Utilization Measure (% or Units)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      wasteMeasureOverride: {
        type: "string",
        label: "Waste / Breakage Measure (Optional $)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetMode: {
        type: "string",
        label: "Commitment Capacity Baseline Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "Full 100% Commitment Target (1.0 or 100%)": "target_100" },
          { "Dataset Mean Utilization (Run-Rate Baseline)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Target Value": "fixed_value" },
          { "Percentile P90 Target": "percentile_p90" },
          { "Zero Centered Horizon": "zero_centered" }
        ],
        default: "target_100"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target / Baseline Value (when Fixed Mode)",
        section: "Display",
        order: 7,
        default: 1.0
      },
      referenceLineLabel: {
        type: "string",
        label: "Baseline Target Label",
        section: "Display",
        order: 8,
        default: "100% Commitment Target"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Under-Utilization Alert Threshold (%)",
        section: "Display",
        order: 9,
        default: 85
      },
      sortBy: {
        type: "string",
        label: "Commitment Sort Order",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Under-Utilized & Highest Waste First (Risk Priority)": "waste_desc" },
          { "Lowest Utilization % First": "util_asc" },
          { "Highest Utilization % First": "util_desc" },
          { "Alphabetical by Commitment Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "waste_desc"
      },
      topNEntities: {
        type: "string",
        label: "Display Commitment Series Limit",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Top 6 Commitments": "6" },
          { "Top 10 Commitments": "10" },
          { "Top 15 Commitments": "15" },
          { "Top 20 Commitments (Full Portfolio)": "20" },
          { "All Commitments": "all" }
        ],
        default: "20"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Remaining Series into 'Other Commitments'",
        section: "Display",
        order: 12,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Commitments with 0 Activity",
        section: "Display",
        order: 13,
        default: true
      },
      hudMode: {
        type: "string",
        label: "Executive FinOps HUD Mode",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard"
      },
      showValueLabels: {
        type: "string",
        label: "Band Summary Metrics",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Show Latest & Average % on Right": "all" },
          { "Show At-Risk Commitments Only (<85%)": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all"
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        section: "Display",
        order: 16,
        default: ""
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 17,
        default: ""
      },
      bandHeight: {
        type: "number",
        label: "Commitment Lane Height (px)",
        section: "Display",
        order: 18,
        default: 44
      },
      showZeroBaseline: {
        type: "boolean",
        label: "Show Horizon Baseline Reference Line",
        section: "Display",
        order: 19,
        default: true
      },
      showDataPoints: {
        type: "boolean",
        label: "Show Interactive Daily Hover Line & Tooltip",
        section: "Display",
        order: 20,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Commitment Search & Filter Bar",
        section: "Display",
        order: 21,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Emerald FinOps (Green Savings / Red Waste)": "emerald_finops" },
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (NOC / SecOps)": "cyberpunk_dark" },
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "emerald_finops"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Optimal Tier Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Healthy Tier Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Waste / Deficit Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (100% CUD Utilization)": "higher_is_better" },
          { "Lower is Better (Zero Waste / Lower Breakage)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (High Density Dashboard)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Percentage (96.2%, 84.5%)": "percentage" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Decimal (1,234.56)": "decimal_2" },
          { "Auto (from Looker Field Format)": "auto" },
          { "Raw Unformatted": "raw" }
        ],
        default: "percentage"
      },
      showGridlines: {
        type: "boolean",
        label: "Show Timeline Vertical Date Dividers",
        section: "Style",
        order: 8,
        default: true
      },
      showAlternatingLanes: {
        type: "boolean",
        label: "Show Alternating Lane Background Shading",
        section: "Style",
        order: 9,
        default: true
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimOverride: { role: "dimension", defaultIdx: 0 },
        dateDimOverride: { role: "dimension", defaultIdx: 1 },
        measureFieldOverride: { role: "measure", defaultIdx: 0 },
        wasteMeasureOverride: { role: "measure", defaultIdx: 1 }
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
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
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

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      this.container = document.createElement("div");
      this.container.className = "cloud-finops-horizon-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.overflow = "hidden";
      this.container.style.position = "relative";
      this.container.style.boxSizing = "border-box";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";
      element.appendChild(this.container);

      this.searchFilter = "";
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

      this.clearErrors();

      if (!this.container || this.container.parentElement !== element) {
        element.innerHTML = "";
        this.container = document.createElement("div");
        this.container.className = "cloud-finops-horizon-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.overflow = "hidden";
        this.container.style.position = "relative";
        this.container.style.boxSizing = "border-box";
        this.container.style.display = "flex";
        this.container.style.flexDirection = "column";
        element.appendChild(this.container);
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.renderChart(d3, data, config, queryResponse, details);
          done();
        } catch (err) {
          console.error("Cloud FinOps Horizon Chart rendering error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the Horizon Chart."
          });
          done();
        }
      });
    },

    renderChart: function (d3, data, config, queryResponse, details) {
      var container = this.container;
      container.innerHTML = "";

      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }

      if (dimensions.length < 2 || measures.length === 0) {
        this.addError({
          title: "Insufficient Fields",
          message: "Horizon Chart requires at least 2 Dimensions (Commitment/Series, Timeline Date) and 1 Measure (Utilization Rate %)."
        });
        return;
      }

      // Dynamic field mapping
      var entityField = resolveField(dimensions, config.entityDimOverride, 0);
      var dateField = resolveField(dimensions, config.dateDimOverride, 1);
      var measureField = resolveField(measures, config.measureFieldOverride, 0);
      var wasteField = resolveField(measures, config.wasteMeasureOverride, 1);

      var entityDim = entityField ? entityField.name : dimensions[0].name;
      var entityLabel = entityField ? (entityField.label_short || entityField.label || "Commitment") : "Commitment";
      var dateDim = dateField ? dateField.name : dimensions[1].name;
      var measName = measureField ? measureField.name : measures[0].name;
      var wasteName = wasteField ? wasteField.name : null;

      // Theme & styling setup
      var themeKey = config.colorPalette || "emerald_finops";
      var theme = Object.assign({}, PALETTES[themeKey] || PALETTES.emerald_finops);
      if (config.customPrimaryHex) theme.posBands[theme.posBands.length - 1] = config.customPrimaryHex;
      if (config.customNegativeHex) theme.negBands[theme.negBands.length - 1] = config.customNegativeHex;

      var layoutMode = config.layoutMode || "horizon_2band";
      var numBands = (layoutMode === "horizon_3band") ? 3 : 2;
      var bandHeight = Math.max(28, Number(config.bandHeight) || 44);
      var hudMode = config.hudMode || "scorecard";
      var showExecutiveHUD = hudMode !== "hidden";
      var valueFormat = config.valueFormat || "percentage";
      var topN = config.topNEntities || "20";
      var sortBy = config.sortBy || "waste_desc";
      var suppressZeroNull = config.suppressZeroNull !== false;
      var showSearch = config.showSearch !== false;
      var showGridlines = config.showGridlines !== false;
      var showAlternating = config.showAlternatingLanes !== false;
      var anomalyThreshold = Number(config.anomalyThresholdPct) || 85;

      // Aggregate data series: Map each commitment to daily observations
      var seriesMap = {};
      var dateSet = {};

      data.forEach(function (row) {
        var entCell = row[entityDim];
        var entVal = "Unknown";
        if (entCell !== undefined && entCell !== null) {
          entVal = (typeof entCell === "object")
            ? (entCell.rendered !== undefined ? String(entCell.rendered) : String(entCell.value))
            : String(entCell);
        }

        var dCell = row[dateDim];
        var dVal = "Unknown";
        if (dCell !== undefined && dCell !== null) {
          dVal = (typeof dCell === "object")
            ? (dCell.rendered !== undefined ? String(dCell.rendered) : String(dCell.value))
            : String(dCell);
        }
        dateSet[dVal] = true;

        var mCell = row[measName];
        var mVal = 0;
        var drills = null;
        if (mCell !== undefined && mCell !== null) {
          if (typeof mCell === "object") {
            mVal = Number(mCell.value !== undefined ? mCell.value : mCell.rendered) || 0;
            drills = mCell.links;
          } else {
            mVal = Number(mCell) || 0;
          }
        }

        var wVal = 0;
        if (wasteName && row[wasteName]) {
          var wc = row[wasteName];
          wVal = Number(typeof wc === "object" ? (wc.value !== undefined ? wc.value : wc.rendered) : wc) || 0;
        }

        if (!seriesMap[entVal]) {
          seriesMap[entVal] = {
            name: entVal,
            points: {},
            wasteTotal: 0,
            drills: drills
          };
        }
        seriesMap[entVal].points[dVal] = { value: mVal, waste: wVal, drills: drills };
        seriesMap[entVal].wasteTotal += wVal;
      });

      var dates = Object.keys(dateSet).sort();
      if (dates.length < 2) {
        this.addError({
          title: "Insufficient Timeline Dates",
          message: "Horizon Chart requires at least 2 distinct date intervals to construct horizon bands."
        });
        return;
      }

      // Convert series to array and calculate stats
      var seriesList = [];
      Object.keys(seriesMap).forEach(function (name) {
        var s = seriesMap[name];
        var sumVals = 0;
        var countVals = 0;
        var nonZero = false;
        var pts = dates.map(function (d) {
          var p = s.points[d] || { value: 0, waste: 0 };
          if (p.value > 0) nonZero = true;
          sumVals += p.value;
          countVals++;
          return { date: d, value: p.value, waste: p.waste, drills: p.drills };
        });

        if (suppressZeroNull && !nonZero) return;

        s.timeline = pts;
        s.avgUtil = countVals > 0 ? (sumVals / countVals) : 0;
        s.latestUtil = pts[pts.length - 1].value;
        seriesList.push(s);
      });

      if (seriesList.length === 0) {
        this.addError({
          title: "No Active Series",
          message: "No non-zero commitment series found for the current query."
        });
        return;
      }

      // Sort series
      if (sortBy === "waste_desc") {
        seriesList.sort(function (a, b) { return b.wasteTotal - a.wasteTotal || a.avgUtil - b.avgUtil; });
      } else if (sortBy === "util_asc") {
        seriesList.sort(function (a, b) { return a.avgUtil - b.avgUtil; });
      } else if (sortBy === "util_desc") {
        seriesList.sort(function (a, b) { return b.avgUtil - a.avgUtil; });
      } else if (sortBy === "alphabetical") {
        seriesList.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top N limit
      if (topN !== "all") {
        var lim = parseInt(topN, 10) || 20;
        seriesList = seriesList.slice(0, lim);
      }

      // Baseline Calculation
      var baselineVal = 1.0; // default 100% capacity
      if (config.targetMode === "dataset_mean") {
        var allSum = 0, allCount = 0;
        seriesList.forEach(function (s) { s.timeline.forEach(function (pt) { allSum += pt.value; allCount++; }); });
        baselineVal = allCount > 0 ? (allSum / allCount) : 1.0;
      } else if (config.targetMode === "fixed_value") {
        baselineVal = Number(config.fixedTargetValue) || 1.0;
      } else if (config.targetMode === "zero_centered") {
        baselineVal = 0.0;
      }

      // High-level FinOps KPIs
      var totalPortfolioWaste = seriesList.reduce(function (acc, s) { return acc + s.wasteTotal; }, 0);
      var portfolioAvgUtil = seriesList.reduce(function (acc, s) { return acc + s.avgUtil; }, 0) / (seriesList.length || 1);
      var criticalBreachCount = seriesList.filter(function (s) {
        var pct = s.avgUtil <= 1.0 ? s.avgUtil * 100 : s.avgUtil;
        return pct < anomalyThreshold;
      }).length;
      var topWasteSeries = seriesList[0];

      // Prepare Container Theme
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Executive FinOps Scorecard HUD
      if (showExecutiveHUD) {
        var hud = document.createElement("div");
        hud.className = "finops-horizon-hud";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.justifyContent = "space-between";
        hud.style.flexWrap = "wrap";
        hud.style.gap = "12px";
        hud.style.padding = "10px 18px";
        hud.style.backgroundColor = theme.cardBg;
        hud.style.borderBottom = "1px solid " + theme.border;
        hud.style.fontSize = "12px";

        var hudTitle = config.customTitleOverride || "Cloud FinOps CUD Commitment & Utilization Horizon";
        var statsHtml = "";

        if (hudMode === "compact_strip") {
          statsHtml = '<div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">' +
            '<span style="font-weight:700; color:' + theme.text + ';">' + hudTitle + '</span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span>Avg Portfolio: <strong>' + formatNumber(portfolioAvgUtil, valueFormat) + '</strong></span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span>Unutilized Breakage: <strong style="color:#b91c1c;">' + formatNumber(totalPortfolioWaste, "compact_currency") + '</strong></span>' +
            '<span style="color:' + theme.subtext + ';">|</span>' +
            '<span>At-Risk Commitments (<' + anomalyThreshold + '%): <strong style="color:' + (criticalBreachCount > 0 ? '#b91c1c' : theme.text) + ';">' + criticalBreachCount + '</strong></span>' +
            '</div>';
        } else {
          statsHtml = '<div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">';
          if (config.customTitleOverride) {
            statsHtml += '<div><div style="font-size:14px; font-weight:800; color:' + theme.text + ';">' + hudTitle + '</div>' +
                         '<div style="font-size:11px; color:' + theme.subtext + ';">' + (config.customSubtitleOverride || "Multi-Band Horizon Telemetry") + '</div></div>';
          }
          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform:uppercase; font-size:10px; font-weight:700;">Portfolio Contracts</span>' +
                       '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + seriesList.length + ' active</div></div>';

          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform:uppercase; font-size:10px; font-weight:700;">Avg Utilization</span>' +
                       '<div style="font-size:16px; font-weight:800; color:' + (portfolioAvgUtil >= 0.85 ? "#15803d" : "#b91c1c") + ';">' + formatNumber(portfolioAvgUtil, valueFormat) + '</div></div>';

          statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform:uppercase; font-size:10px; font-weight:700;">Breakage Waste</span>' +
                       '<div style="font-size:16px; font-weight:800; color:#b91c1c;">' + formatNumber(totalPortfolioWaste, "compact_currency") + '</div></div>';

          if (topWasteSeries && topWasteSeries.wasteTotal > 0) {
            statsHtml += '<div><span style="color:' + theme.subtext + '; text-transform:uppercase; font-size:10px; font-weight:700;">Top Breakage Contract</span>' +
                         '<div style="font-size:14px; font-weight:700; color:#b91c1c;">⚠️ ' + topWasteSeries.name + ' (' + formatNumber(topWasteSeries.wasteTotal, "compact_currency") + ')</div></div>';
          }
          statsHtml += '</div>';
        }

        // Search bar
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
          searchInput.style.width = "180px";

          var selfRef = this;
          searchInput.addEventListener("input", function (e) {
            selfRef.searchFilter = e.target.value.toLowerCase().trim();
            selfRef.filterSeries(theme);
          });
          searchContainer.appendChild(searchInput);
        }

        hud.innerHTML = statsHtml;
        hud.appendChild(searchContainer);
        container.appendChild(hud);
      }

      // Scrollable Lanes Wrapper
      var chartWrapper = document.createElement("div");
      chartWrapper.className = "finops-horizon-scroll-container";
      chartWrapper.style.flex = "1 1 auto";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.overflowY = "auto";
      chartWrapper.style.overflowX = "hidden";
      chartWrapper.style.position = "relative";
      container.appendChild(chartWrapper);

      var containerWidth = Math.max(chartWrapper.clientWidth || container.clientWidth || 900, 400);
      var labelWidth = 260;
      var valueWidth = 120;
      var chartWidth = Math.max(200, containerWidth - labelWidth - valueWidth - 40);

      // Tooltip Element
      var tooltip = document.createElement("div");
      tooltip.className = "finops-horizon-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.backgroundColor = theme.hudBg;
      tooltip.style.color = theme.text;
      tooltip.style.border = "1px solid " + theme.border;
      tooltip.style.boxShadow = "0 6px 18px rgba(0,0,0,0.18)";
      tooltip.style.fontSize = "11px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "1000";
      tooltip.style.backdropFilter = "blur(4px)";
      chartWrapper.appendChild(tooltip);

      // X Scale across all dates
      var xScale = d3.scalePoint()
        .domain(dates)
        .range([0, chartWidth])
        .padding(0);

      // Date Header Axis
      var headerDiv = document.createElement("div");
      headerDiv.style.display = "flex";
      headerDiv.style.alignItems = "center";
      headerDiv.style.padding = "6px 20px 6px 16px";
      headerDiv.style.borderBottom = "1px solid " + theme.border;
      headerDiv.style.backgroundColor = theme.cardBg;
      headerDiv.style.fontSize = "10px";
      headerDiv.style.fontWeight = "700";
      headerDiv.style.color = theme.subtext;
      headerDiv.style.textTransform = "uppercase";

      var hLabel = document.createElement("div");
      hLabel.style.width = labelWidth + "px";
      hLabel.textContent = entityLabel + " (" + seriesList.length + ")";
      headerDiv.appendChild(hLabel);

      var hTimeline = document.createElement("div");
      hTimeline.style.flex = "1 1 auto";
      hTimeline.style.display = "flex";
      hTimeline.style.justifyContent = "space-between";
      hTimeline.innerHTML = "<span>" + dates[0] + "</span><span>" + dates[Math.floor(dates.length / 2)] + "</span><span>" + dates[dates.length - 1] + "</span>";
      headerDiv.appendChild(hTimeline);

      var hVal = document.createElement("div");
      hVal.style.width = valueWidth + "px";
      hVal.style.textAlign = "right";
      hVal.textContent = "Utilization / Waste";
      headerDiv.appendChild(hVal);

      chartWrapper.appendChild(headerDiv);

      // Render Each Series Lane
      var self = this;
      seriesList.forEach(function (s, sIdx) {
        var laneRow = document.createElement("div");
        laneRow.className = "finops-horizon-lane lane-" + sanitizeClass(s.name);
        laneRow.style.display = "flex";
        laneRow.style.alignItems = "center";
        laneRow.style.padding = "2px 20px 2px 16px";
        laneRow.style.height = bandHeight + "px";
        laneRow.style.boxSizing = "border-box";
        laneRow.style.borderBottom = "1px solid " + theme.grid;
        if (showAlternating && sIdx % 2 === 1) {
          laneRow.style.backgroundColor = theme.cardBg;
        }

        // Left Label
        var lblDiv = document.createElement("div");
        lblDiv.style.width = labelWidth + "px";
        lblDiv.style.paddingRight = "12px";
        lblDiv.style.overflow = "hidden";
        lblDiv.style.textOverflow = "ellipsis";
        lblDiv.style.whiteSpace = "nowrap";
        lblDiv.style.cursor = "pointer";
        lblDiv.innerHTML = '<span style="font-size:12px; font-weight:700; color:' + theme.text + ';" title="' + s.name + '">' + s.name + '</span>';

        if (s.avgUtil < 0.85 && s.wasteTotal > 0) {
          lblDiv.innerHTML += ' <span style="font-size:9px; padding:1px 5px; border-radius:3px; background:#fee2e2; color:#b91c1c; font-weight:800;">CRITICAL</span>';
        }
        laneRow.appendChild(lblDiv);

        // Center SVG Horizon Lane
        var svgContainer = document.createElement("div");
        svgContainer.style.flex = "1 1 auto";
        svgContainer.style.height = (bandHeight - 6) + "px";
        svgContainer.style.position = "relative";
        svgContainer.style.overflow = "hidden";

        var laneSvg = d3.select(svgContainer)
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("viewBox", "0 0 " + chartWidth + " " + (bandHeight - 6))
          .attr("preserveAspectRatio", "none")
          .style("display", "block");

        var defs = laneSvg.append("defs");
        var clipId = "clip-" + sIdx + "-" + Math.floor(Math.random() * 10000);
        defs.append("clipPath")
          .attr("id", clipId)
          .append("rect")
          .attr("width", chartWidth)
          .attr("height", bandHeight - 6);

        var laneG = laneSvg.append("g").attr("clip-path", "url(#" + clipId + ")");

        // Horizon Area Computation
        // Max value scale for band layering
        var maxObserved = d3.max(s.timeline, function (d) { return d.value; }) || 1.0;
        var maxDev = Math.max(maxObserved, baselineVal * 1.2, 0.001);
        var bandSpan = maxDev / numBands;

        var hLaneHeight = bandHeight - 6;
        var yScale = d3.scaleLinear()
          .domain([0, bandSpan])
          .range([hLaneHeight, 0]);

        // Draw layered bands
        for (var b = 0; b < numBands; b++) {
          var bandColor = theme.posBands[b % theme.posBands.length];
          var bandOffset = b * bandSpan;

          var areaGen = d3.area()
            .x(function (d) { return xScale(d.date); })
            .y0(hLaneHeight)
            .y1(function (d) {
              var v = d.value - bandOffset;
              if (v <= 0) return hLaneHeight;
              if (v >= bandSpan) return 0;
              return yScale(v);
            })
            .curve(d3.curveMonotoneX);

          laneG.append("path")
            .datum(s.timeline)
            .attr("fill", bandColor)
            .attr("opacity", 0.88)
            .attr("d", areaGen);
        }

        // Baseline Indicator Line
        if (config.showZeroBaseline) {
          var baseRatio = baselineVal / maxDev;
          var baseY = Math.max(2, Math.min(hLaneHeight - 2, hLaneHeight * (1 - (baseRatio % 1))));
          laneG.append("line")
            .attr("x1", 0)
            .attr("x2", chartWidth)
            .attr("y1", baseY)
            .attr("y2", baseY)
            .attr("stroke", theme.baseline)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3 2")
            .attr("opacity", 0.65);
        }

        // Vertical date gridlines
        if (showGridlines) {
          var step = Math.max(1, Math.floor(dates.length / 6));
          for (var gi = 0; gi < dates.length; gi += step) {
            var gx = xScale(dates[gi]);
            laneG.append("line")
              .attr("x1", gx)
              .attr("x2", gx)
              .attr("y1", 0)
              .attr("y2", hLaneHeight)
              .attr("stroke", theme.grid)
              .attr("stroke-width", 0.75)
              .attr("stroke-dasharray", "2 2");
          }
        }

        // Invisible Hover Overlay for Tracking
        var hoverRect = laneSvg.append("rect")
          .attr("width", chartWidth)
          .attr("height", hLaneHeight)
          .attr("fill", "transparent")
          .style("cursor", "crosshair");

        hoverRect
          .on("mousemove", function (event) {
            var mouseX = d3.pointer(event)[0];
            var dateIdx = Math.round((mouseX / chartWidth) * (dates.length - 1));
            dateIdx = Math.max(0, Math.min(dates.length - 1, dateIdx));
            var hoveredDate = dates[dateIdx];
            var pt = s.points[hoveredDate] || { value: 0, waste: 0 };

            var html = '<div style="font-weight:800; font-size:12px; color:' + theme.text + '; margin-bottom:4px;">' + s.name + '</div>' +
                       '<div style="font-size:11px; color:' + theme.subtext + '; margin-bottom:4px;">Date: <strong>' + hoveredDate + '</strong></div>' +
                       '<div style="display:flex; justify-content:space-between; gap:12px;"><span>Utilization:</span><strong style="color:' + (pt.value >= 0.85 ? "#15803d" : "#b91c1c") + ';">' + formatNumber(pt.value, valueFormat) + '</strong></div>';
            if (pt.waste > 0) {
              html += '<div style="display:flex; justify-content:space-between; gap:12px; color:#b91c1c;"><span>Breakage Waste:</span><strong>' + formatNumber(pt.waste, "compact_currency") + '</strong></div>';
            }
            if (pt.drills && pt.drills.length > 0) {
              html += '<div style="margin-top:4px; font-size:10px; color:#2563eb; text-align:center;">⚡ Click to open Looker drill actions</div>';
            }

            tooltip.innerHTML = html;
            tooltip.style.display = "block";
            var rootRect = chartWrapper.getBoundingClientRect();
            var tx = event.clientX - rootRect.left + 15;
            var ty = event.clientY - rootRect.top - 25;
            if (tx + 180 > rootRect.width) tx = rootRect.width - 190;
            if (ty + 80 > rootRect.height) ty = rootRect.height - 90;
            tooltip.style.left = tx + "px";
            tooltip.style.top = ty + "px";
          })
          .on("mouseleave", function () {
            tooltip.style.display = "none";
          })
          .on("click", function (event) {
            var mouseX = d3.pointer(event)[0];
            var dateIdx = Math.round((mouseX / chartWidth) * (dates.length - 1));
            dateIdx = Math.max(0, Math.min(dates.length - 1, dateIdx));
            var hoveredDate = dates[dateIdx];
            var pt = s.points[hoveredDate];
            if (pt && pt.drills && pt.drills.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({ links: pt.drills, event: event });
            }
          });

        laneRow.appendChild(svgContainer);

        // Right-Hand Stats Summary
        var statDiv = document.createElement("div");
        statDiv.style.width = valueWidth + "px";
        statDiv.style.textAlign = "right";
        statDiv.style.paddingLeft = "10px";
        statDiv.innerHTML = '<div style="font-size:12px; font-weight:800; color:' + (s.avgUtil >= 0.85 ? "#15803d" : "#b91c1c") + ';">' + formatNumber(s.latestUtil, valueFormat) + '</div>' +
                            '<div style="font-size:10px; color:' + theme.subtext + ';">Waste: <span style="color:#b91c1c; font-weight:700;">' + formatNumber(s.wasteTotal, "compact_currency") + '</span></div>';
        laneRow.appendChild(statDiv);

        chartWrapper.appendChild(laneRow);
      });
    },

    filterSeries: function (theme) {
      var term = this.searchFilter;
      var root = d3.select(this.container);
      if (!term) {
        root.selectAll(".finops-horizon-lane").style("display", "flex");
        return;
      }
      root.selectAll(".finops-horizon-lane").each(function () {
        var el = d3.select(this);
        var cls = el.attr("class") || "";
        var match = cls.toLowerCase().indexOf(term) !== -1;
        el.style("display", match ? "flex" : "none");
      });
    }
  };

  function sanitizeClass(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  }

  looker.plugins.visualizations.add(visObject);
})();
