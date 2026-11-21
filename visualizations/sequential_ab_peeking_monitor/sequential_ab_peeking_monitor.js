/**
 * Sequential A/B Peeking & Anytime-Valid Boundary Monitor (mSPRT / Group Sequential)
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Experimentation, Causal Lift & A/B Ops Suite:
 * - Multi-Modal Visual Paradigms:
 *     1. "sequential_boundaries": Anytime-Valid mSPRT Confidence Sequence + O'Brien-Fleming Alpha-Spending Efficacy/Harm & Futility Cones
 *     2. "srm_health_monitor": Daily Sample Ratio Mismatch (SRM) Traffic Split Drift & -log10(p) Chi-Square Spike Monitor
 *     3. "guardrail_tradeoff_matrix": Experiment Scorecard & Primary Lift vs Guardrail Quadrant with 95% Always-Valid CI Whiskers
 *     4. "bayesian_posterior_density": Bayesian Posterior Lift PDF Curves with ROPE Band & P(Beat Control) Tail Shading
 * - High-Density 5,000+ Row Aggregation across experiments and daily checkpoints
 * - Dynamic Field-Role Mapping (Display tab) via query-populated registerOptions dropdowns
 * - Configurable MDE Target Modes, Anomaly Alerts, Sorting, Top-N with 'Other' Rollup & Null Suppression
 * - Executive Scorecard HUD, Label Density, Interactive Experiment Focus Pills & Search Bar
 * - 7 Enterprise Palettes + Native Hex Color Pickers, Metric Polarity, Font Scale & Value Formatters (Style tab)
 * - Debounced ResizeObserver (<4px guard), container-safe flex sizing, and LookerCharts.Utils.openDrillMenu support
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
    google_enterprise: {
      name: "Google Enterprise",
      primary: "#1a73e8",
      secondary: "#174ea6",
      accent: "#9334e6",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      positive: "#137333",
      negative: "#c5221f",
      warning: "#b06000",
      colors: ["#1a73e8", "#137333", "#c5221f", "#e37400", "#9334e6", "#12b5cb", "#3c4043", "#4285f4"]
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
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      colors: ["#2563eb", "#059669", "#dc2626", "#d97706", "#7c3aed", "#0284c7", "#475569", "#0f172a"]
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
      warning: "#f59e0b",
      colors: ["#38bdf8", "#10b981", "#f43f5e", "#f59e0b", "#a855f7", "#ec4899", "#00f5d4", "#60a5fa"]
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
      warning: "#d97706",
      colors: ["#059669", "#0284c7", "#dc2626", "#d97706", "#0d9488", "#65a30d", "#047857", "#14b8a6"]
    },
    sunset_media: {
      name: "Sunset Media",
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
      warning: "#d97706",
      colors: ["#ea580c", "#059669", "#dc2626", "#d97706", "#7c2d12", "#fb923c", "#b91c1c", "#f59e0b"]
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
      warning: "#d97706",
      colors: ["#0284c7", "#006B40", "#B42318", "#d97706", "#7c3aed", "#0891b2", "#2563eb", "#143359"]
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

  function findFieldByHint(list, hints, fallbackIdx) {
    if (!list || !list.length) return null;
    for (var h = 0; h < hints.length; h++) {
      var kw = hints[h].toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var nm = (list[i].name || "").split(".").pop().toLowerCase();
        var ls = (list[i].label_short || list[i].label || "").toLowerCase();
        if (nm.indexOf(kw) !== -1 || ls.indexOf(kw) !== -1) {
          return list[i];
        }
      }
    }
    if (fallbackIdx >= 0 && fallbackIdx < list.length) return list[fallbackIdx];
    return null;
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";
    switch (fmt) {
      case "percent_delta":
        return (val > 0 ? "+" : "") + val.toFixed(2) + "%";
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(0);
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(2));
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        return (val > 0 ? "+" : "") + val.toFixed(2) + "%";
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
    id: "sequential_ab_peeking_monitor",
    label: "Sequential A/B Peeking & Anytime-Valid Boundary Monitor",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Sequential A/B Visual Paradigm",
        display: "select",
        values: [
          { "Sequential Boundaries & mSPRT Cone": "sequential_boundaries" },
          { "SRM Traffic Allocation & Chi-Square Drift": "srm_health_monitor" },
          { "Experiment Guardrail Trade-Off Matrix": "guardrail_tradeoff_matrix" },
          { "Bayesian Posterior Lift & ROPE Density": "bayesian_posterior_density" }
        ],
        default: "sequential_boundaries",
        section: "Display",
        order: 1
      },
      experimentDimOverride: {
        type: "string",
        label: "Experiment / Cohort Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      timeDimOverride: {
        type: "string",
        label: "Experiment Day / Checkpoint Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      verdictDimOverride: {
        type: "string",
        label: "Stopping Verdict / Status Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      liftMeasureOverride: {
        type: "string",
        label: "Cumulative Lift (%) Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      ciLowerMeasureOverride: {
        type: "string",
        label: "Always-Valid CI Lower Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      ciUpperMeasureOverride: {
        type: "string",
        label: "Always-Valid CI Upper Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      upperBoundMeasureOverride: {
        type: "string",
        label: "Upper Efficacy Boundary Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 8
      },
      lowerBoundMeasureOverride: {
        type: "string",
        label: "Lower Harm Boundary Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 9
      },
      srmMeasureOverride: {
        type: "string",
        label: "SRM Chi-Square p-Value Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 10
      },
      targetMeasureOverride: {
        type: "string",
        label: "MDE / Target Threshold Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 11
      },
      targetMode: {
        type: "string",
        label: "MDE / Threshold Target Mode",
        display: "select",
        values: [
          { "Measure Column (MDE Target)": "measure_column" },
          { "Fixed MDE Lift (%)": "fixed" },
          { "Dataset Mean Lift": "dataset_mean" },
          { "Dataset Median Lift": "dataset_median" },
          { "Top Percentile P75 Lift": "percentile_p75" },
          { "Top Percentile P90 Lift": "percentile_p90" },
          { "None (Zero Null Hypothesis Only)": "none" }
        ],
        default: "measure_column",
        section: "Display",
        order: 12
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed MDE Target Lift (%)",
        default: 3.0,
        section: "Display",
        order: 13
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "MDE Launch Threshold",
        section: "Display",
        order: 14
      },
      anomalyThresholdPct: {
        type: "number",
        label: "SRM Alert p-Value Threshold (e.g. 0.001)",
        default: 0.001,
        section: "Display",
        order: 15
      },
      sortBy: {
        type: "string",
        label: "Experiment Sort Order",
        display: "select",
        values: [
          { "Latest Lift (Descending)": "lift_desc" },
          { "Latest Lift (Ascending)": "lift_asc" },
          { "Stopping Urgency (Ship / Alert First)": "urgency_desc" },
          { "Alphabetical (A to Z)": "alpha_asc" },
          { "Natural / Query Order": "natural" }
        ],
        default: "urgency_desc",
        section: "Display",
        order: 16
      },
      topNLimit: {
        type: "number",
        label: "Top-N Experiments Limit (0 = All)",
        default: 6,
        section: "Display",
        order: 17
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Remaining Experiments into 'Other'",
        default: true,
        section: "Display",
        order: 18
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Null / Empty Checkpoints",
        default: true,
        section: "Display",
        order: 19
      },
      hudMode: {
        type: "string",
        label: "Executive Experimentation HUD",
        display: "select",
        values: [
          { "Full Scorecard HUD": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 20
      },
      labelDensity: {
        type: "string",
        label: "Chart Annotation & Label Density",
        display: "select",
        values: [
          { "Show All Crossing & End Labels": "all" },
          { "Peaks / Breaches Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 21
      },
      showLegend: {
        type: "boolean",
        label: "Show Boundary & Confidence Legend",
        default: true,
        section: "Display",
        order: 22
      },
      showSearch: {
        type: "boolean",
        label: "Show Experiment Search & Focus Pills",
        default: true,
        section: "Display",
        order: 23
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 24
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        default: "",
        section: "Display",
        order: 25
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Trajectory Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Efficacy / Ship Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Harm / SRM Alert Hex",
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
          { "Higher is Better (Conversion, Retention, Revenue)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Crash Rate)": "lower_is_better" }
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
          { "Compact (High Density)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Lift Value Format",
        display: "select",
        values: [
          { "Auto (Signed Lift +4.25%)": "auto" },
          { "Signed Percentage (+4.25%)": "percent_delta" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2K)": "compact_number" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "percent_delta",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        experimentDimOverride: { role: "dimension", defaultIdx: 0 },
        timeDimOverride: { role: "dimension", defaultIdx: 1 },
        verdictDimOverride: { role: "dimension", defaultIdx: 2 },
        liftMeasureOverride: { role: "measure", defaultIdx: 0 },
        ciLowerMeasureOverride: { role: "measure", defaultIdx: 1 },
        ciUpperMeasureOverride: { role: "measure", defaultIdx: 2 },
        upperBoundMeasureOverride: { role: "measure", defaultIdx: 3 },
        lowerBoundMeasureOverride: { role: "measure", defaultIdx: 4 },
        srmMeasureOverride: { role: "measure", defaultIdx: -1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) meas = meas.concat(f.table_calculations);

      var sig = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === sig) return;
      self._dynamicFieldSignature = sig;

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
        console.warn("registerOptions unavailable:", e);
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

      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      this.container = document.createElement("div");
      this.container.className = "looker-seq-ab-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";
      this.container.style.overflow = "hidden";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(this.container);

      this.tooltip = document.createElement("div");
      this.tooltip.className = "seq-ab-tooltip";
      this.tooltip.style.position = "fixed";
      this.tooltip.style.display = "none";
      this.tooltip.style.pointerEvents = "none";
      this.tooltip.style.zIndex = "999999";
      this.tooltip.style.padding = "10px 13px";
      this.tooltip.style.borderRadius = "8px";
      this.tooltip.style.fontSize = "12px";
      this.tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      document.body.appendChild(this.tooltip);

      this.searchTerm = "";
      this.selectedExp = "ALL";
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
        if (Math.abs(curW - self._lastRenderW) < 4 && Math.abs(curH - self._lastRenderH) < 4) return;
      }
      if (self._resizeTimer) clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse) {
          self.updateAsync(self._lastData, el, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
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
        this.container.className = "looker-seq-ab-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.display = "flex";
        this.container.style.flexDirection = "column";
        this.container.style.overflow = "hidden";
        this.container.style.boxSizing = "border-box";
        this.container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        element.appendChild(this.container);
      }

      this._safeClearErrors();

      if (!data || data.length === 0) {
        this._safeAddError({
          title: "No Experiment Data",
          message: "Query returned 0 rows. Include experiment dimension, time checkpoint, and lift measure."
        });
        if (typeof done === "function") done();
        return;
      }

      var f = (queryResponse && queryResponse.fields) || {};
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) meas = meas.concat(f.table_calculations);

      if (dims.length === 0 || meas.length === 0) {
        this._safeAddError({
          title: "Insufficient Fields",
          message: "Requires at least 1 Dimension (Experiment / Day) and 1 Measure (Cumulative Lift %)."
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
          console.error("[Sequential A/B Monitor] Render error:", err);
          self._safeAddError({ title: "Rendering Exception", message: err.message });
          if (typeof done === "function") done();
        }
      });
    },

    render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var f = (queryResponse && queryResponse.fields) || {};
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (f.table_calculations && f.table_calculations.length) meas = meas.concat(f.table_calculations);

      // Field resolution with smart hints when overrides are Auto
      var dimExp = resolveField(dims, config.experimentDimOverride, -1) || findFieldByHint(dims, ["experiment_name", "experiment", "cohort", "test"], 0);
      var dimTime = resolveField(dims, config.timeDimOverride, -1) || findFieldByHint(dims, ["experiment_day", "day", "date", "step"], dims.length > 1 ? 1 : 0);
      var dimVerdict = resolveField(dims, config.verdictDimOverride, -1) || findFieldByHint(dims, ["verdict", "decision", "status"], -1);
      var dimSurface = findFieldByHint(dims, ["surface", "area", "category"], -1);

      var measLift = resolveField(meas, config.liftMeasureOverride, -1) || findFieldByHint(meas, ["relative_lift", "lift"], 0);
      var measCiLow = resolveField(meas, config.ciLowerMeasureOverride, -1) || findFieldByHint(meas, ["ci_lower", "valid_ci_lower", "lower"], -1);
      var measCiHigh = resolveField(meas, config.ciUpperMeasureOverride, -1) || findFieldByHint(meas, ["ci_upper", "valid_ci_upper", "upper_ci"], -1);
      var measEffBound = resolveField(meas, config.upperBoundMeasureOverride, -1) || findFieldByHint(meas, ["upper_efficacy", "efficacy"], -1);
      var measHarmBound = resolveField(meas, config.lowerBoundMeasureOverride, -1) || findFieldByHint(meas, ["lower_harm", "harm"], -1);
      var measFutility = findFieldByHint(meas, ["futility"], -1);
      var measSrm = resolveField(meas, config.srmMeasureOverride, -1) || findFieldByHint(meas, ["srm_p", "srm"], -1);
      var measSplit = findFieldByHint(meas, ["traffic_split", "split"], -1);
      var measMde = resolveField(meas, config.targetMeasureOverride, -1) || findFieldByHint(meas, ["mde"], -1);
      var measProb = findFieldByHint(meas, ["prob_beat", "beat_control"], -1);
      var measLatency = findFieldByHint(meas, ["latency_delta", "guardrail"], -1);
      var measImpact = findFieldByHint(meas, ["annualized_impact", "impact"], -1);
      var measCtrlN = findFieldByHint(meas, ["control_users"], -1);
      var measTreatN = findFieldByHint(meas, ["treatment_users"], -1);

      // Theme & custom hex overrides
      var paletteKey = config.colorPalette || "google_enterprise";
      var theme = PALETTES[paletteKey] ? Object.assign({}, PALETTES[paletteKey]) : Object.assign({}, PALETTES.google_enterprise);
      var colorList = theme.colors.slice();
      if (config.customPrimaryHex && String(config.customPrimaryHex).trim() !== "") {
        theme.primary = config.customPrimaryHex.trim();
        colorList[0] = theme.primary;
      }
      if (config.customPositiveHex && String(config.customPositiveHex).trim() !== "") {
        theme.positive = config.customPositiveHex.trim();
        colorList[1] = theme.positive;
      }
      if (config.customNegativeHex && String(config.customNegativeHex).trim() !== "") {
        theme.negative = config.customNegativeHex.trim();
        colorList[2] = theme.negative;
      }

      var lowerIsBetter = config.metricPolarity === "lower_is_better";
      var valFmt = config.valueFormat || "percent_delta";
      var suppressNulls = config.suppressZeroNull !== false;
      var srmAlphaThresh = Number(config.anomalyThresholdPct);
      if (isNaN(srmAlphaThresh) || srmAlphaThresh <= 0) srmAlphaThresh = 0.001;

      this.container.innerHTML = "";
      this.container.style.background = theme.bg;
      this.container.style.color = theme.text;
      var tileH = (element && element.clientHeight) || 560;
      this.container.style.padding = tileH < 340 ? "8px 10px" : "12px 16px";

      // 1. O(N) Aggregation by Experiment -> Checkpoints
      function numOf(row, fld) {
        if (!fld || !row[fld.name]) return null;
        var v = row[fld.name].value;
        if (v === null || v === undefined || v === "") return null;
        var n = Number(v);
        return isNaN(n) ? null : n;
      }

      var expMap = {};
      var expOrder = [];

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var expName = dimExp && row[dimExp.name] && row[dimExp.name].value !== null ? String(row[dimExp.name].value) : "Experiment";
        var rawT = dimTime && row[dimTime.name] ? row[dimTime.name].value : (i + 1);
        var tNum = Number(rawT);
        if (isNaN(tNum)) {
          var parsedD = Date.parse(String(rawT));
          tNum = !isNaN(parsedD) ? parsedD : (i + 1);
        }
        var liftVal = numOf(row, measLift);
        if (suppressNulls && liftVal === null) continue;
        if (liftVal === null) liftVal = 0;

        var ciL = numOf(row, measCiLow);
        var ciU = numOf(row, measCiHigh);
        if (ciL === null || ciU === null) {
          var hw = 12.0 / Math.sqrt(Math.max(tNum, 1));
          ciL = liftVal - hw;
          ciU = liftVal + hw;
        }
        var effB = numOf(row, measEffBound);
        var harmB = numOf(row, measHarmBound);
        if (effB === null) effB = Math.min(20, 4.4 / Math.sqrt(Math.max(tNum / 28, 0.04)));
        if (harmB === null) harmB = -effB;
        var futB = numOf(row, measFutility);
        if (futB === null) futB = tNum > 7 ? Math.min(2.6, 2.8 * (tNum - 7) / 21) : 0;

        var srmP = numOf(row, measSrm);
        if (srmP === null) srmP = 0.5;
        var splitPct = numOf(row, measSplit);
        if (splitPct === null) splitPct = 50.0;
        var mdeVal = numOf(row, measMde);
        var probBeat = numOf(row, measProb);
        var latDelta = numOf(row, measLatency);
        var impactUsd = numOf(row, measImpact);
        var ctrlN = numOf(row, measCtrlN) || 0;
        var treatN = numOf(row, measTreatN) || 0;

        var verdictStr = dimVerdict && row[dimVerdict.name] && row[dimVerdict.name].value !== null ? String(row[dimVerdict.name].value) : "";
        var surfaceStr = dimSurface && row[dimSurface.name] && row[dimSurface.name].value !== null ? String(row[dimSurface.name].value) : "";

        var links =
          (measLift && row[measLift.name] && row[measLift.name].links && row[measLift.name].links.length ? row[measLift.name].links : null) ||
          (dimExp && row[dimExp.name] && row[dimExp.name].links && row[dimExp.name].links.length ? row[dimExp.name].links : null) ||
          [];

        if (!expMap[expName]) {
          expMap[expName] = {
            name: expName,
            surface: surfaceStr,
            verdict: verdictStr,
            naturalOrder: expOrder.length,
            points: [],
            drillLinks: links,
            isOtherRollup: false
          };
          expOrder.push(expName);
        } else if ((!expMap[expName].drillLinks || !expMap[expName].drillLinks.length) && links.length) {
          expMap[expName].drillLinks = links;
        }
        if (verdictStr) expMap[expName].verdict = verdictStr;
        if (surfaceStr) expMap[expName].surface = surfaceStr;

        expMap[expName].points.push({
          t: tNum,
          tLabel: String(rawT),
          lift: liftVal,
          ciLow: ciL,
          ciHigh: ciU,
          effBound: effB,
          harmBound: harmB,
          futBound: futB,
          srmP: srmP,
          splitPct: splitPct,
          mde: mdeVal,
          probBeat: probBeat,
          latDelta: latDelta,
          impactUsd: impactUsd,
          ctrlN: ctrlN,
          treatN: treatN,
          links: links
        });
      }

      var expList = expOrder.map(function (k) { return expMap[k]; }).filter(function (e) { return e.points.length > 0; });
      if (expList.length === 0) {
        this._safeAddError({ title: "No Valid Checkpoints", message: "All rows were null or filtered." });
        return;
      }

      // Search filter
      if (this.searchTerm && this.searchTerm.trim() !== "") {
        var sq = this.searchTerm.toLowerCase().trim();
        expList = expList.filter(function (e) {
          return e.name.toLowerCase().indexOf(sq) !== -1 ||
                 (e.verdict && e.verdict.toLowerCase().indexOf(sq) !== -1) ||
                 (e.surface && e.surface.toLowerCase().indexOf(sq) !== -1);
        });
      }

      // Compute summary metrics & crossing detection per experiment
      function summarizeExp(exp) {
        exp.points.sort(function (a, b) { return a.t - b.t; });
        var latest = exp.points[exp.points.length - 1];
        exp.latest = latest;
        exp.latestLift = latest.lift;
        exp.latestCiLow = latest.ciLow;
        exp.latestCiHigh = latest.ciHigh;
        exp.minSrmP = d3.min(exp.points, function (p) { return p.srmP; });
        exp.hasSrmAlert = exp.minSrmP <= srmAlphaThresh || (exp.verdict && exp.verdict.toLowerCase().indexOf("srm") !== -1);

        exp.effCrossPoint = null;
        exp.harmCrossPoint = null;
        for (var j = 0; j < exp.points.length; j++) {
          var pt = exp.points[j];
          var effectiveLift = lowerIsBetter ? -pt.lift : pt.lift;
          var effectiveLower = lowerIsBetter ? -pt.ciHigh : pt.ciLow;
          if (!exp.effCrossPoint && effectiveLift >= pt.effBound && effectiveLower > 0) {
            exp.effCrossPoint = pt;
          }
          if (!exp.harmCrossPoint && effectiveLift <= pt.harmBound) {
            exp.harmCrossPoint = pt;
          }
        }

        if (!exp.verdict) {
          if (exp.hasSrmAlert) exp.verdict = "SRM Alert";
          else if (exp.harmCrossPoint) exp.verdict = "Harm Rollback";
          else if (exp.effCrossPoint) exp.verdict = "Efficacy Ship";
          else exp.verdict = "Continue Running";
        }

        var vLow = exp.verdict.toLowerCase();
        exp.urgencyScore = vLow.indexOf("srm") !== -1 ? 4 : (vLow.indexOf("harm") !== -1 || vLow.indexOf("rollback") !== -1 ? 3 : (vLow.indexOf("ship") !== -1 || vLow.indexOf("efficacy") !== -1 ? 2 : 1));
      }

      expList.forEach(summarizeExp);

      // Sort
      var sortBy = config.sortBy || "urgency_desc";
      if (sortBy === "lift_desc") {
        expList.sort(function (a, b) { return b.latestLift - a.latestLift; });
      } else if (sortBy === "lift_asc") {
        expList.sort(function (a, b) { return a.latestLift - b.latestLift; });
      } else if (sortBy === "urgency_desc") {
        expList.sort(function (a, b) { return b.urgencyScore - a.urgencyScore || Math.abs(b.latestLift) - Math.abs(a.latestLift); });
      } else if (sortBy === "alpha_asc") {
        expList.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortBy === "natural") {
        expList.sort(function (a, b) { return a.naturalOrder - b.naturalOrder; });
      }

      // Top-N with optional 'Other' rollup
      var topN = Number(config.topNLimit);
      if (isNaN(topN)) topN = 6;
      var enableOther = config.enableOtherRollup !== false;
      if (topN > 0 && expList.length > topN) {
        var kept = expList.slice(0, topN);
        if (enableOther) {
          var rest = expList.slice(topN);
          var tMap = {};
          rest.forEach(function (re) {
            re.points.forEach(function (pt) {
              if (!tMap[pt.t]) tMap[pt.t] = [];
              tMap[pt.t].push(pt);
            });
          });
          var otherPts = Object.keys(tMap).sort(function (a, b) { return Number(a) - Number(b); }).map(function (tk) {
            var arr = tMap[tk];
            return {
              t: arr[0].t,
              tLabel: arr[0].tLabel,
              lift: d3.mean(arr, function (p) { return p.lift; }),
              ciLow: d3.mean(arr, function (p) { return p.ciLow; }),
              ciHigh: d3.mean(arr, function (p) { return p.ciHigh; }),
              effBound: d3.mean(arr, function (p) { return p.effBound; }),
              harmBound: d3.mean(arr, function (p) { return p.harmBound; }),
              futBound: d3.mean(arr, function (p) { return p.futBound; }),
              srmP: d3.min(arr, function (p) { return p.srmP; }),
              splitPct: d3.mean(arr, function (p) { return p.splitPct; }),
              mde: d3.mean(arr, function (p) { return p.mde; }),
              probBeat: d3.mean(arr, function (p) { return p.probBeat; }),
              latDelta: d3.mean(arr, function (p) { return p.latDelta; }),
              impactUsd: d3.sum(arr, function (p) { return p.impactUsd || 0; }),
              ctrlN: d3.sum(arr, function (p) { return p.ctrlN; }),
              treatN: d3.sum(arr, function (p) { return p.treatN; }),
              links: []
            };
          });
          var otherExp = {
            name: "Other Experiments (" + rest.length + ")",
            surface: "Aggregated Cohort",
            verdict: "Pooled Mean",
            naturalOrder: 999999,
            points: otherPts,
            drillLinks: [],
            isOtherRollup: true
          };
          summarizeExp(otherExp);
          kept.push(otherExp);
        }
        expList = kept;
      }

      // Target MDE calculation
      var targetMode = config.targetMode || "measure_column";
      var mdeTarget = 0;
      var mdeVals = expList.map(function (e) { return e.latest.mde; }).filter(function (v) { return v !== null && !isNaN(v); });
      var liftVals = expList.map(function (e) { return e.latestLift; });
      if (targetMode === "none") {
        mdeTarget = 0;
      } else if (targetMode === "measure_column" && mdeVals.length) {
        mdeTarget = d3.mean(mdeVals);
      } else if (targetMode === "fixed") {
        mdeTarget = Number(config.fixedTargetValue) || 3.0;
      } else if (targetMode === "dataset_median") {
        liftVals.sort(function (a, b) { return a - b; });
        var mid = Math.floor(liftVals.length / 2);
        mdeTarget = liftVals.length % 2 !== 0 ? liftVals[mid] : (liftVals[mid - 1] + liftVals[mid]) / 2;
      } else if (targetMode === "percentile_p75") {
        liftVals.sort(function (a, b) { return a - b; });
        mdeTarget = liftVals[Math.min(Math.floor(liftVals.length * 0.75), liftVals.length - 1)];
      } else if (targetMode === "percentile_p90") {
        liftVals.sort(function (a, b) { return a - b; });
        mdeTarget = liftVals[Math.min(Math.floor(liftVals.length * 0.90), liftVals.length - 1)];
      } else {
        mdeTarget = d3.mean(liftVals) || 3.0;
      }

      // Validate selectedExp
      if (this.selectedExp !== "ALL" && !expList.some(function (e) { return e.name === self.selectedExp; })) {
        this.selectedExp = "ALL";
      }

      // Font scale
      var fontScale = config.fontScale || "standard";
      var fSizes = {
        compact: { title: "13px", subtitle: "10.5px", hudNum: "13px", hudLbl: "9px", label: "10px", tick: "9px" },
        standard: { title: "15px", subtitle: "11.5px", hudNum: "15px", hudLbl: "9.5px", label: "11px", tick: "10px" },
        large: { title: "17px", subtitle: "12.5px", hudNum: "17px", hudLbl: "10.5px", label: "12px", tick: "11px" }
      }[fontScale] || { title: "15px", subtitle: "11.5px", hudNum: "15px", hudLbl: "9.5px", label: "11px", tick: "10px" };

      var hasAnyDrill = expList.some(function (e) { return e.drillLinks && e.drillLinks.length > 0; });
      var shipCount = expList.filter(function (e) { return e.verdict.toLowerCase().indexOf("ship") !== -1 || e.verdict.toLowerCase().indexOf("efficacy") !== -1; }).length;
      var srmCount = expList.filter(function (e) { return e.hasSrmAlert; }).length;
      var harmCount = expList.filter(function (e) { return e.verdict.toLowerCase().indexOf("harm") !== -1 || e.verdict.toLowerCase().indexOf("rollback") !== -1; }).length;
      var totalSample = d3.sum(expList, function (e) { return (e.latest.ctrlN || 0) + (e.latest.treatN || 0); });

      // 2. Render Executive HUD (normal flow flex: 0 0 auto)
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "hidden") {
        var hudEl = document.createElement("div");
        hudEl.style.flex = "0 0 auto";
        hudEl.style.display = "flex";
        hudEl.style.flexWrap = "wrap";
        hudEl.style.alignItems = "center";
        hudEl.style.justifyContent = "space-between";
        hudEl.style.gap = "8px";
        hudEl.style.marginBottom = "8px";
        hudEl.style.paddingBottom = "8px";
        hudEl.style.borderBottom = "1px solid " + theme.border;

        var titleBox = document.createElement("div");
        titleBox.style.display = "flex";
        titleBox.style.flexDirection = "column";
        titleBox.style.gap = "2px";

        var titleRow = document.createElement("div");
        titleRow.style.display = "flex";
        titleRow.style.alignItems = "center";
        titleRow.style.gap = "7px";
        titleRow.style.flexWrap = "wrap";

        var badge = document.createElement("span");
        badge.textContent = "ANYTIME-VALID mSPRT";
        badge.style.fontSize = "9.5px";
        badge.style.fontWeight = "700";
        badge.style.letterSpacing = "0.05em";
        badge.style.padding = "2px 6px";
        badge.style.borderRadius = "4px";
        badge.style.background = theme.cardBg;
        badge.style.border = "1px solid " + theme.cardBorder;
        badge.style.color = theme.primary;

        var titleSpan = document.createElement("span");
        titleSpan.style.fontSize = fSizes.title;
        titleSpan.style.fontWeight = "700";
        titleSpan.style.color = theme.text;
        titleSpan.textContent = config.customTitle || "Sequential A/B Peeking & Boundary Monitor";

        titleRow.appendChild(badge);
        titleRow.appendChild(titleSpan);

        if (hasAnyDrill) {
          var dPill = document.createElement("span");
          dPill.textContent = "\uD83D\uDD0E CLICK TO DRILL";
          dPill.style.fontSize = "9px";
          dPill.style.fontWeight = "600";
          dPill.style.padding = "2px 6px";
          dPill.style.borderRadius = "4px";
          dPill.style.background = theme.cardBg;
          dPill.style.border = "1px solid " + theme.border;
          dPill.style.color = theme.subtext;
          titleRow.appendChild(dPill);
        }
        titleBox.appendChild(titleRow);

        if (hudMode === "scorecard") {
          var subSpan = document.createElement("span");
          subSpan.style.fontSize = fSizes.subtitle;
          subSpan.style.color = theme.subtext;
          var mdeStr = targetMode !== "none" ? (" \u2022 " + (config.referenceLineLabel || "MDE") + ": " + formatValue(mdeTarget, valFmt)) : "";
          subSpan.textContent = config.customSubtitle || (expList.length + " Active Tests \u2022 O'Brien-Fleming & mSPRT Peeking-Safe Inference" + mdeStr);
          titleBox.appendChild(subSpan);
        }
        hudEl.appendChild(titleBox);

        var cardsBox = document.createElement("div");
        cardsBox.style.display = "flex";
        cardsBox.style.alignItems = "center";
        cardsBox.style.gap = "7px";
        cardsBox.style.flexWrap = "wrap";

        function addKpiCard(lbl, val, clr) {
          var c = document.createElement("div");
          c.style.background = theme.cardBg;
          c.style.border = "1px solid " + theme.border;
          c.style.borderRadius = "6px";
          c.style.padding = hudMode === "compact_strip" ? "3px 7px" : "5px 9px";
          c.style.display = "flex";
          c.style.flexDirection = "column";
          var l = document.createElement("span");
          l.style.fontSize = fSizes.hudLbl;
          l.style.textTransform = "uppercase";
          l.style.letterSpacing = "0.04em";
          l.style.color = theme.subtext;
          l.textContent = lbl;
          var v = document.createElement("span");
          v.style.fontSize = fSizes.hudNum;
          v.style.fontWeight = "700";
          v.style.color = clr || theme.text;
          v.textContent = val;
          c.appendChild(l);
          c.appendChild(v);
          cardsBox.appendChild(c);
        }

        addKpiCard("Efficacy Ship", String(shipCount), theme.positive);
        addKpiCard("Harm / Rollback", String(harmCount), harmCount > 0 ? theme.negative : theme.text);
        if (hudMode === "scorecard") {
          addKpiCard("SRM Alerts", String(srmCount), srmCount > 0 ? theme.warning : theme.positive);
          if (totalSample > 0) {
            addKpiCard("Enrolled Users", formatValue(totalSample, "compact_number"), theme.primary);
          }
        }

        if (config.showSearch !== false) {
          var sWrap = document.createElement("div");
          sWrap.style.display = "flex";
          sWrap.style.alignItems = "center";
          sWrap.style.background = theme.cardBg;
          sWrap.style.border = "1px solid " + theme.border;
          sWrap.style.borderRadius = "6px";
          sWrap.style.padding = "3px 8px";
          sWrap.style.gap = "4px";
          var sIco = document.createElement("span");
          sIco.textContent = "\uD83D\uDD0D";
          sIco.style.fontSize = "11px";
          var sIn = document.createElement("input");
          sIn.type = "text";
          sIn.placeholder = "Filter tests...";
          sIn.value = this.searchTerm || "";
          sIn.style.border = "none";
          sIn.style.outline = "none";
          sIn.style.background = "transparent";
          sIn.style.color = theme.text;
          sIn.style.fontSize = "11px";
          sIn.style.width = "105px";
          sIn.addEventListener("input", function (e) {
            self.searchTerm = e.target.value;
            self.render(d3, data, element, config, queryResponse);
          });
          sWrap.appendChild(sIco);
          sWrap.appendChild(sIn);
          cardsBox.appendChild(sWrap);
        }

        hudEl.appendChild(cardsBox);
        this.container.appendChild(hudEl);
      }

      // Focus pills bar when >1 experiment & showSearch !== false
      if (expList.length > 1 && config.showSearch !== false && (config.layoutMode || "sequential_boundaries") === "sequential_boundaries") {
        var pillBar = document.createElement("div");
        pillBar.style.flex = "0 0 auto";
        pillBar.style.display = "flex";
        pillBar.style.flexWrap = "wrap";
        pillBar.style.alignItems = "center";
        pillBar.style.gap = "6px";
        pillBar.style.marginBottom = "8px";

        function makeFocusPill(label, key) {
          var active = self.selectedExp === key;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = label;
          btn.style.cursor = "pointer";
          btn.style.fontSize = "10.5px";
          btn.style.fontWeight = active ? "700" : "500";
          btn.style.padding = "3px 9px";
          btn.style.borderRadius = "999px";
          btn.style.border = "1px solid " + (active ? theme.primary : theme.border);
          btn.style.background = active ? theme.primary : theme.cardBg;
          btn.style.color = active ? "#ffffff" : theme.text;
          btn.addEventListener("click", function () {
            self.selectedExp = key;
            self.render(d3, data, element, config, queryResponse);
          });
          pillBar.appendChild(btn);
        }
        makeFocusPill("All (" + expList.length + ")", "ALL");
        expList.forEach(function (e) {
          makeFocusPill(truncateLabel(e.name, 26), e.name);
        });
        this.container.appendChild(pillBar);
      }

      // 3. Chart Area (flex: 1 1 0; min-height: 0)
      var contentArea = document.createElement("div");
      contentArea.style.flex = "1 1 0";
      contentArea.style.minHeight = "0";
      contentArea.style.width = "100%";
      contentArea.style.overflow = "auto";
      this.container.appendChild(contentArea);

      var mode = config.layoutMode || "sequential_boundaries";
      if (mode === "srm_health_monitor") {
        this.renderSrmMonitor(d3, contentArea, expList, srmAlphaThresh, theme, colorList, config, fSizes);
      } else if (mode === "guardrail_tradeoff_matrix") {
        this.renderGuardrailMatrix(d3, contentArea, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt, lowerIsBetter);
      } else if (mode === "bayesian_posterior_density") {
        this.renderBayesianPosterior(d3, contentArea, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt, lowerIsBetter);
      } else {
        this.renderSequentialBoundaries(d3, contentArea, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt, lowerIsBetter);
      }
    },

    // --- PARADIGM 1: SEQUENTIAL BOUNDARIES & mSPRT CONE ---
    renderSequentialBoundaries: function (d3, container, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt, lowerIsBetter) {
      var self = this;
      var activeExps = this.selectedExp === "ALL" ? expList : expList.filter(function (e) { return e.name === self.selectedExp; });

      if (config.showLegend !== false) {
        var leg = document.createElement("div");
        leg.style.display = "flex";
        leg.style.flexWrap = "wrap";
        leg.style.gap = "14px";
        leg.style.marginBottom = "8px";
        leg.style.fontSize = fSizes.label;
        leg.style.color = theme.subtext;
        var legItems = [
          { lbl: "Cumulative Lift Trajectory", swatch: theme.primary, type: "line" },
          { lbl: "95% Always-Valid mSPRT Ribbon", swatch: theme.primary, type: "band" },
          { lbl: "Efficacy Boundary (+α)", swatch: theme.positive, type: "dash" },
          { lbl: "Harm Boundary (-α)", swatch: theme.negative, type: "dash" },
          { lbl: "Futility Stop Zone", swatch: theme.subtext, type: "band" }
        ];
        legItems.forEach(function (li) {
          var item = document.createElement("span");
          item.style.display = "inline-flex";
          item.style.alignItems = "center";
          item.style.gap = "5px";
          var sw = document.createElement("span");
          sw.style.display = "inline-block";
          sw.style.width = "14px";
          sw.style.height = li.type === "band" ? "8px" : "2px";
          if (li.type === "band") {
            sw.style.background = li.swatch;
            sw.style.opacity = "0.22";
            sw.style.borderRadius = "2px";
          } else if (li.type === "dash") {
            sw.style.borderTop = "2px dashed " + li.swatch;
          } else {
            sw.style.background = li.swatch;
          }
          var txt = document.createElement("span");
          txt.textContent = li.lbl;
          item.appendChild(sw);
          item.appendChild(txt);
          leg.appendChild(item);
        });
        container.appendChild(leg);
      }

      var grid = document.createElement("div");
      var totalW = Math.max(container.clientWidth || 720, 320);
      var cols = activeExps.length === 1 || totalW < 620 ? 1 : 2;
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
      grid.style.gap = "10px";
      container.appendChild(grid);

      var availH = Math.max(container.clientHeight || 400, 260);
      var rowsCount = Math.ceil(activeExps.length / cols);
      var legH = config.showLegend !== false ? 28 : 4;
      var cardH = activeExps.length === 1
        ? Math.max(availH - legH - 6, 220)
        : Math.max(Math.floor((availH - legH - (rowsCount - 1) * 10 - 6) / Math.max(rowsCount, 1)), 155);

      activeExps.forEach(function (exp, idx) {
        var card = document.createElement("div");
        card.style.background = theme.cardBg;
        card.style.border = "1px solid " + theme.border;
        card.style.borderRadius = "8px";
        card.style.padding = "8px 10px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.minWidth = "0";
        card.style.height = cardH + "px";
        card.style.boxSizing = "border-box";
        grid.appendChild(card);

        // Card header
        var hdr = document.createElement("div");
        hdr.style.display = "flex";
        hdr.style.justifyContent = "space-between";
        hdr.style.alignItems = "center";
        hdr.style.gap = "6px";
        hdr.style.marginBottom = "2px";
        hdr.style.flex = "0 0 auto";

        var nameEl = document.createElement("div");
        nameEl.style.fontSize = fSizes.label;
        nameEl.style.fontWeight = "700";
        nameEl.style.color = theme.text;
        nameEl.style.whiteSpace = "nowrap";
        nameEl.style.overflow = "hidden";
        nameEl.style.textOverflow = "ellipsis";
        nameEl.textContent = exp.name;
        nameEl.title = exp.name + (exp.surface ? " (" + exp.surface + ")" : "");
        if (exp.drillLinks && exp.drillLinks.length) {
          nameEl.style.cursor = "pointer";
          nameEl.addEventListener("click", function (evt) { triggerDrill(exp.drillLinks, evt); });
        }

        var vLow = exp.verdict.toLowerCase();
        var vColor = vLow.indexOf("srm") !== -1 ? theme.warning : (vLow.indexOf("harm") !== -1 || vLow.indexOf("rollback") !== -1 ? theme.negative : (vLow.indexOf("ship") !== -1 || vLow.indexOf("efficacy") !== -1 ? theme.positive : theme.primary));
        var vBadge = document.createElement("span");
        vBadge.textContent = exp.verdict + " (" + formatValue(exp.latestLift, valFmt) + ")";
        vBadge.style.fontSize = "9.5px";
        vBadge.style.fontWeight = "700";
        vBadge.style.padding = "2px 6px";
        vBadge.style.borderRadius = "4px";
        vBadge.style.whiteSpace = "nowrap";
        vBadge.style.color = vColor;
        vBadge.style.border = "1px solid " + vColor;
        vBadge.style.background = theme.bg;

        hdr.appendChild(nameEl);
        hdr.appendChild(vBadge);
        card.appendChild(hdr);

        var svgW = Math.max(card.clientWidth - 20, 240);
        var svgH = Math.max(cardH - 38, 110);
        var margin = { top: 14, right: 16, bottom: 24, left: 44 };
        var w = Math.max(svgW - margin.left - margin.right, 140);
        var h = Math.max(svgH - margin.top - margin.bottom, 90);

        var svg = d3.select(card).append("svg")
          .attr("width", svgW)
          .attr("height", svgH)
          .attr("viewBox", "0 0 " + svgW + " " + svgH)
          .style("display", "block");

        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var pts = exp.points;

        var xScale = d3.scaleLinear()
          .domain(d3.extent(pts, function (p) { return p.t; }))
          .range([0, w]);

        var yMax = d3.max(pts, function (p) { return Math.max(p.ciHigh, p.effBound, p.lift, mdeTarget || 0); }) || 15;
        var yMin = d3.min(pts, function (p) { return Math.min(p.ciLow, p.harmBound, p.lift); }) || -15;
        var yPad = Math.max((yMax - yMin) * 0.08, 1.5);
        var yScale = d3.scaleLinear().domain([yMin - yPad, yMax + yPad]).range([h, 0]).nice();

        // Gridlines
        g.append("g")
          .call(d3.axisLeft(yScale).ticks(4).tickSize(-w).tickFormat(""))
          .selectAll("line")
          .attr("stroke", theme.grid)
          .attr("stroke-dasharray", "2,2");
        g.selectAll(".domain").remove();

        // Zero null hypothesis line
        if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
          g.append("line")
            .attr("x1", 0).attr("x2", w)
            .attr("y1", yScale(0)).attr("y2", yScale(0))
            .attr("stroke", theme.subtext).attr("stroke-width", 1).attr("stroke-opacity", 0.5);
        }

        // Futility stop band
        var futArea = d3.area()
          .x(function (p) { return xScale(p.t); })
          .y0(function (p) { return yScale(-p.futBound); })
          .y1(function (p) { return yScale(p.futBound); })
          .curve(d3.curveMonotoneX);
        g.append("path")
          .datum(pts)
          .attr("d", futArea)
          .attr("fill", theme.subtext)
          .attr("fill-opacity", 0.12);

        // Always-valid mSPRT 95% confidence sequence ribbon (semantic verdict color)
        var lineColor = vColor || colorList[idx % colorList.length] || theme.primary;
        var ciArea = d3.area()
          .x(function (p) { return xScale(p.t); })
          .y0(function (p) { return yScale(Math.max(yScale.domain()[0], p.ciLow)); })
          .y1(function (p) { return yScale(Math.min(yScale.domain()[1], p.ciHigh)); })
          .curve(d3.curveMonotoneX);
        g.append("path")
          .datum(pts)
          .attr("d", ciArea)
          .attr("fill", lineColor)
          .attr("fill-opacity", 0.18);

        // Upper Efficacy & Lower Harm O'Brien-Fleming boundaries
        var effLine = d3.line().x(function (p) { return xScale(p.t); }).y(function (p) { return yScale(p.effBound); }).curve(d3.curveMonotoneX);
        var harmLine = d3.line().x(function (p) { return xScale(p.t); }).y(function (p) { return yScale(p.harmBound); }).curve(d3.curveMonotoneX);

        g.append("path").datum(pts).attr("d", effLine).attr("fill", "none").attr("stroke", theme.positive).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
        g.append("path").datum(pts).attr("d", harmLine).attr("fill", "none").attr("stroke", theme.negative).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");

        // MDE Target Line
        if (targetMode !== "none" && mdeTarget !== 0) {
          var mdePlot = lowerIsBetter ? -Math.abs(mdeTarget) : mdeTarget;
          if (mdePlot >= yScale.domain()[0] && mdePlot <= yScale.domain()[1]) {
            g.append("line")
              .attr("x1", 0).attr("x2", w)
              .attr("y1", yScale(mdePlot)).attr("y2", yScale(mdePlot))
              .attr("stroke", theme.warning || "#d97706")
              .attr("stroke-width", 1)
              .attr("stroke-dasharray", "2,3");
          }
        }

        // Cumulative Lift trajectory
        var liftLine = d3.line().x(function (p) { return xScale(p.t); }).y(function (p) { return yScale(p.lift); }).curve(d3.curveMonotoneX);
        g.append("path")
          .datum(pts)
          .attr("d", liftLine)
          .attr("fill", "none")
          .attr("stroke", lineColor)
          .attr("stroke-width", 2.4);

        // Crossing marker
        var crossPt = exp.effCrossPoint || exp.harmCrossPoint;
        if (crossPt) {
          var cClr = exp.effCrossPoint ? theme.positive : theme.negative;
          g.append("circle")
            .attr("cx", xScale(crossPt.t))
            .attr("cy", yScale(crossPt.lift))
            .attr("r", 5)
            .attr("fill", cClr)
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1.5);

          if (config.labelDensity !== "hidden") {
            g.append("text")
              .attr("x", Math.min(xScale(crossPt.t) + 6, w - 58))
              .attr("y", Math.max(yScale(crossPt.lift) - 6, 10))
              .attr("fill", cClr)
              .attr("font-size", "9px")
              .attr("font-weight", "700")
              .text("Cross D" + crossPt.t);
          }
        } else if (config.labelDensity === "all") {
          var lastPt = pts[pts.length - 1];
          g.append("circle").attr("cx", xScale(lastPt.t)).attr("cy", yScale(lastPt.lift)).attr("r", 3.5).attr("fill", lineColor);
        }

        // Invisible hover overlay points
        g.selectAll(".pt-hit")
          .data(pts)
          .enter()
          .append("circle")
          .attr("cx", function (p) { return xScale(p.t); })
          .attr("cy", function (p) { return yScale(p.lift); })
          .attr("r", 6)
          .attr("fill", "transparent")
          .style("cursor", exp.drillLinks && exp.drillLinks.length ? "pointer" : "crosshair")
          .on("mouseenter", function (evt, p) {
            self.showSeqTooltip(evt, exp, p, theme, valFmt);
          })
          .on("mouseleave", function () {
            self.hideTooltip();
          })
          .on("click", function (evt, p) {
            var links = (p.links && p.links.length) ? p.links : exp.drillLinks;
            if (links && links.length) triggerDrill(links, evt);
          });

        // Axes
        g.append("g")
          .attr("transform", "translate(0," + h + ")")
          .call(d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return "D" + Math.round(d); }))
          .selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);

        g.append("g")
          .call(d3.axisLeft(yScale).ticks(4).tickFormat(function (d) { return (d > 0 ? "+" : "") + d.toFixed(0) + "%"; }))
          .selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
      });
    },

    // --- PARADIGM 2: SRM ALLOCATION DRIFT & CHI-SQUARE MONITOR ---
    renderSrmMonitor: function (d3, container, expList, srmAlphaThresh, theme, colorList, config, fSizes) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 360);
      var height = Math.max((container.clientHeight || 380) - 28, 270);
      var margin = { top: 24, right: 24, bottom: 34, left: 54 };
      var w = Math.max(width - margin.left - margin.right, 180);
      var h = Math.max(height - margin.top - margin.bottom, 160);

      var svg = d3.select(card).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var allPts = [];
      expList.forEach(function (e) { e.points.forEach(function (p) { allPts.push(p); }); });

      var xScale = d3.scaleLinear().domain(d3.extent(allPts, function (p) { return p.t; })).range([0, w]);
      var minSplit = Math.min(46.0, d3.min(allPts, function (p) { return p.splitPct; }) || 49.0);
      var maxSplit = Math.max(54.0, d3.max(allPts, function (p) { return p.splitPct; }) || 51.0);
      var yScale = d3.scaleLinear().domain([minSplit - 0.5, maxSplit + 0.5]).range([h, 0]).nice();

      g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-w).tickFormat("")).selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "2,2");
      g.selectAll(".domain").remove();

      // Expected 50% ± 0.6% healthy allocation band
      g.append("rect")
        .attr("x", 0).attr("width", w)
        .attr("y", yScale(50.6)).attr("height", Math.max(yScale(49.4) - yScale(50.6), 2))
        .attr("fill", theme.positive).attr("fill-opacity", 0.12);

      g.append("line")
        .attr("x1", 0).attr("x2", w)
        .attr("y1", yScale(50.0)).attr("y2", yScale(50.0))
        .attr("stroke", theme.positive).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");

      g.append("text")
        .attr("x", w - 4).attr("y", yScale(50.6) - 4)
        .attr("text-anchor", "end").attr("fill", theme.positive).attr("font-size", "9.5px").attr("font-weight", "700")
        .text("Expected 50.0% Allocation Band (SRM Safe)");

      expList.forEach(function (exp, idx) {
        var clr = exp.hasSrmAlert ? theme.negative : colorList[idx % colorList.length];
        var lineGen = d3.line().x(function (p) { return xScale(p.t); }).y(function (p) { return yScale(p.splitPct); }).curve(d3.curveMonotoneX);
        g.append("path")
          .datum(exp.points)
          .attr("d", lineGen)
          .attr("fill", "none")
          .attr("stroke", clr)
          .attr("stroke-width", exp.hasSrmAlert ? 2.8 : 1.8);

        var lastP = exp.latest;
        var hasDrill = exp.drillLinks && exp.drillLinks.length > 0;
        g.append("circle")
          .attr("cx", xScale(lastP.t)).attr("cy", yScale(lastP.splitPct)).attr("r", exp.hasSrmAlert ? 5.5 : 4)
          .attr("fill", clr).attr("stroke", theme.bg).attr("stroke-width", 1.5)
          .style("cursor", hasDrill ? "pointer" : "default")
          .on("mouseenter", function (evt) { self.showSeqTooltip(evt, exp, lastP, theme, "percent_delta"); })
          .on("mouseleave", function () { self.hideTooltip(); })
          .on("click", function (evt) { if (hasDrill) triggerDrill(exp.drillLinks, evt); });

        if (config.labelDensity === "all" || (config.labelDensity === "peaks_only" && exp.hasSrmAlert)) {
          g.append("text")
            .attr("x", xScale(lastP.t) - 6)
            .attr("y", yScale(lastP.splitPct) + (exp.hasSrmAlert ? 14 : -7))
            .attr("text-anchor", "end")
            .attr("fill", clr)
            .attr("font-size", "9.5px")
            .attr("font-weight", "700")
            .text(truncateLabel(exp.name, 20) + " (" + lastP.splitPct.toFixed(1) + "%, p=" + lastP.srmP.toFixed(4) + ")");
        }
      });

      g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return "Day " + Math.round(d); })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
      g.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return d.toFixed(1) + "%"; })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
    },

    // --- PARADIGM 3: GUARDRAIL TRADE-OFF MATRIX ---
    renderGuardrailMatrix: function (d3, container, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt, lowerIsBetter) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 360);
      var height = Math.max((container.clientHeight || 380) - 28, 270);
      var margin = { top: 24, right: 30, bottom: 38, left: 60 };
      var w = Math.max(width - margin.left - margin.right, 180);
      var h = Math.max(height - margin.top - margin.bottom, 160);

      var svg = d3.select(card).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var minX = d3.min(expList, function (e) { return e.latestCiLow; }) || -15;
      var maxX = d3.max(expList, function (e) { return e.latestCiHigh; }) || 15;
      var xScale = d3.scaleLinear().domain([Math.min(minX, -2), Math.max(maxX, 5)]).range([0, w]).nice();

      var hasLat = expList.some(function (e) { return e.latest.latDelta !== null && !isNaN(e.latest.latDelta); });
      var yVals = expList.map(function (e) { return hasLat ? (e.latest.latDelta || 0) : ((e.latest.probBeat || 0.5) * 100); });
      var yScale = d3.scaleLinear().domain([Math.min(d3.min(yVals) || 0, 0) - 4, Math.max(d3.max(yVals) || 100, 10) + 4]).range([h, 0]).nice();

      g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-w).tickFormat("")).selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "2,2");
      g.selectAll(".domain").remove();

      // Zero Lift & Zero Guardrail Lines
      g.append("line").attr("x1", xScale(0)).attr("x2", xScale(0)).attr("y1", 0).attr("y2", h).attr("stroke", theme.subtext).attr("stroke-dasharray", "3,3");
      if (targetMode !== "none" && mdeTarget !== 0) {
        g.append("line").attr("x1", xScale(mdeTarget)).attr("x2", xScale(mdeTarget)).attr("y1", 0).attr("y2", h).attr("stroke", theme.positive).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,3");
        g.append("text").attr("x", xScale(mdeTarget) + 4).attr("y", 10).attr("fill", theme.positive).attr("font-size", "9.5px").attr("font-weight", "700").text(config.referenceLineLabel || "MDE");
      }

      expList.forEach(function (exp, idx) {
        var yVal = hasLat ? (exp.latest.latDelta || 0) : ((exp.latest.probBeat || 0.5) * 100);
        var cx = xScale(exp.latestLift);
        var cy = yScale(yVal);
        var vLow = exp.verdict.toLowerCase();
        var clr = vLow.indexOf("srm") !== -1 ? theme.warning : (vLow.indexOf("harm") !== -1 || vLow.indexOf("rollback") !== -1 ? theme.negative : (vLow.indexOf("ship") !== -1 ? theme.positive : colorList[idx % colorList.length]));
        var hasDrill = exp.drillLinks && exp.drillLinks.length > 0;

        // Always-valid CI horizontal whisker
        g.append("line")
          .attr("x1", xScale(exp.latestCiLow)).attr("x2", xScale(exp.latestCiHigh))
          .attr("y1", cy).attr("y2", cy)
          .attr("stroke", clr).attr("stroke-width", 2).attr("stroke-opacity", 0.65);

        g.append("circle")
          .attr("cx", cx).attr("cy", cy).attr("r", 7)
          .attr("fill", clr).attr("stroke", theme.bg).attr("stroke-width", 2)
          .style("cursor", hasDrill ? "pointer" : "default")
          .on("mouseenter", function (evt) { self.showSeqTooltip(evt, exp, exp.latest, theme, valFmt); })
          .on("mouseleave", function () { self.hideTooltip(); })
          .on("click", function (evt) { if (hasDrill) triggerDrill(exp.drillLinks, evt); });

        if (config.labelDensity !== "hidden") {
          g.append("text")
            .attr("x", cx).attr("y", cy - 11)
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", fSizes.tick)
            .attr("font-weight", "600")
            .text(truncateLabel(exp.name, 22));
        }
      });

      g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return (d > 0 ? "+" : "") + d.toFixed(1) + "%"; })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
      g.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return hasLat ? (d.toFixed(0) + "ms") : (d.toFixed(0) + "%"); })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
      g.append("text").attr("x", w / 2).attr("y", h + 30).attr("text-anchor", "middle").attr("fill", theme.subtext).attr("font-size", "10px").text("Primary KPI Cumulative Lift (%) with Always-Valid 95% CI");
      g.append("text").attr("transform", "rotate(-90)").attr("x", -h / 2).attr("y", -44).attr("text-anchor", "middle").attr("fill", theme.subtext).attr("font-size", "10px").text(hasLat ? "Guardrail Latency Delta (ms)" : "P(Beat Control) %");
    },

    // --- PARADIGM 4: BAYESIAN POSTERIOR LIFT & ROPE DENSITY ---
    renderBayesianPosterior: function (d3, container, expList, mdeTarget, targetMode, theme, colorList, config, fSizes, valFmt) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      container.appendChild(card);

      var width = Math.max(card.clientWidth - 28, container.clientWidth - 28, 360);
      var height = Math.max((container.clientHeight || 380) - 28, 270);
      var margin = { top: 24, right: 24, bottom: 34, left: 48 };
      var w = Math.max(width - margin.left - margin.right, 180);
      var h = Math.max(height - margin.top - margin.bottom, 160);

      var svg = d3.select(card).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Compute analytical Normal posteriors from latest lift and half-width
      var posteriors = expList.map(function (exp, idx) {
        var mu = exp.latestLift;
        var sigma = Math.max((exp.latestCiHigh - exp.latestCiLow) / 3.92, 0.8);
        return { exp: exp, mu: mu, sigma: sigma, color: colorList[idx % colorList.length] };
      });

      var xMin = d3.min(posteriors, function (p) { return p.mu - 3.2 * p.sigma; }) || -15;
      var xMax = d3.max(posteriors, function (p) { return p.mu + 3.2 * p.sigma; }) || 15;
      var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, w]);

      var xGrid = d3.range(xMin, xMax, (xMax - xMin) / 140);
      var maxY = 0;
      posteriors.forEach(function (post) {
        post.curve = xGrid.map(function (x) {
          var z = (x - post.mu) / post.sigma;
          var y = (1 / (post.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
          if (y > maxY) maxY = y;
          return { x: x, y: y };
        });
      });

      var yScale = d3.scaleLinear().domain([0, maxY * 1.15]).range([h, 0]);

      // ROPE shaded band (-MDE to +MDE)
      var ropeHalf = Math.max(Math.abs(mdeTarget || 2.0), 1.0);
      if (targetMode !== "none") {
        g.append("rect")
          .attr("x", xScale(-ropeHalf))
          .attr("width", Math.max(xScale(ropeHalf) - xScale(-ropeHalf), 2))
          .attr("y", 0).attr("height", h)
          .attr("fill", theme.subtext).attr("fill-opacity", 0.12);
        g.append("text")
          .attr("x", xScale(0)).attr("y", 12).attr("text-anchor", "middle")
          .attr("fill", theme.subtext).attr("font-size", "9px").attr("font-weight", "700")
          .text("ROPE (\u00B1" + ropeHalf.toFixed(1) + "%)");
      }

      g.append("line").attr("x1", xScale(0)).attr("x2", xScale(0)).attr("y1", 0).attr("y2", h).attr("stroke", theme.subtext).attr("stroke-dasharray", "3,3");

      posteriors.forEach(function (post) {
        var areaGen = d3.area().x(function (d) { return xScale(d.x); }).y0(h).y1(function (d) { return yScale(d.y); }).curve(d3.curveMonotoneX);
        var lineGen = d3.line().x(function (d) { return xScale(d.x); }).y(function (d) { return yScale(d.y); }).curve(d3.curveMonotoneX);

        g.append("path").datum(post.curve).attr("d", areaGen).attr("fill", post.color).attr("fill-opacity", 0.16);
        g.append("path").datum(post.curve).attr("d", lineGen).attr("fill", "none").attr("stroke", post.color).attr("stroke-width", 2.2)
          .style("cursor", post.exp.drillLinks && post.exp.drillLinks.length ? "pointer" : "default")
          .on("mouseenter", function (evt) { self.showSeqTooltip(evt, post.exp, post.exp.latest, theme, valFmt); })
          .on("mouseleave", function () { self.hideTooltip(); })
          .on("click", function (evt) { if (post.exp.drillLinks && post.exp.drillLinks.length) triggerDrill(post.exp.drillLinks, evt); });

        if (config.labelDensity !== "hidden") {
          var peakY = (1 / (post.sigma * Math.sqrt(2 * Math.PI)));
          var pb = post.exp.latest.probBeat !== null ? (" P=" + (post.exp.latest.probBeat * 100).toFixed(1) + "%") : "";
          g.append("text")
            .attr("x", xScale(post.mu))
            .attr("y", Math.max(yScale(peakY) - 6, 12))
            .attr("text-anchor", "middle")
            .attr("fill", post.color)
            .attr("font-size", "9.5px")
            .attr("font-weight", "700")
            .text(truncateLabel(post.exp.name, 16) + pb);
        }
      });

      g.append("g").attr("transform", "translate(0," + h + ")").call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return (d > 0 ? "+" : "") + d.toFixed(1) + "%"; })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
      g.append("g").call(d3.axisLeft(yScale).ticks(4).tickFormat(function (d) { return d.toFixed(2); })).selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.tick);
    },

    showSeqTooltip: function (evt, exp, pt, theme, valFmt) {
      var tt = this.tooltip;
      var srmColor = pt.srmP <= 0.001 ? theme.negative : theme.positive;
      tt.innerHTML =
        '<div style="font-weight:700; color:' + theme.text + '; margin-bottom:4px;">' + exp.name + ' (Day ' + pt.t + ')</div>' +
        '<div style="color:' + theme.subtext + ';">Verdict: <strong style="color:' + theme.primary + ';">' + exp.verdict + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Cumulative Lift: <strong>' + formatValue(pt.lift, valFmt) + '</strong> [' + pt.ciLow.toFixed(2) + '%, ' + pt.ciHigh.toFixed(2) + '%]</div>' +
        '<div style="color:' + theme.subtext + ';">Bounds: Efficacy +' + pt.effBound.toFixed(2) + '% / Harm ' + pt.harmBound.toFixed(2) + '%</div>' +
        '<div style="color:' + theme.subtext + ';">Traffic Split: <strong>' + pt.splitPct.toFixed(2) + '%</strong> (SRM p=<strong style="color:' + srmColor + ';">' + pt.srmP.toFixed(4) + '</strong>)</div>';

      tt.style.background = theme.cardBg;
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
      if (x + 260 > window.innerWidth) x = evt.clientX - 270;
      if (y + 130 > window.innerHeight) y = evt.clientY - 130;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    hideTooltip: function () {
      if (this.tooltip) this.tooltip.style.display = "none";
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
