/**
 * Multi-Armed Bandit & Thompson Sampling Allocation Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Experimentation, LiveOps & Dynamic Optimization Suite:
 * - 4 Multi-Modal Visual Paradigms:
 *     1. "allocation_ribbon" (Default): 100% Stacked Thompson Sampling Traffic Allocation Share Stream
 *        over experiment days, with Exploration -> Exploitation convergence marker and winning arm crown.
 *     2. "regret_horizon": Cumulative Bandit Regret vs Static Equal-Split A/B Counterfactual Regret
 *        with shaded "Regret Saved ($)" area ribbon and daily incremental savings bars.
 *     3. "posterior_win_density": Smoothed Beta(alpha, beta) Posterior Density curves with 95% Credible
 *        Intervals paired with horizontal P(Arm is Best) win-probability bars.
 *     4. "arm_efficiency_quadrant": Exploration-Exploitation Bubble Quadrant (Traffic Share % vs CVR %)
 *        with 95% CI error whiskers and quadrant classifications.
 * - Strict 2-tab Edit Viz options ("Display" and "Style")
 * - Dynamic Field-Role Mapping via Looker `registerOptions`
 * - O(N) client-side aggregation for 5,000+ rows, Top-N with 'Other Arms' rollup
 * - Debounced ResizeObserver (<4px guard), safe element sizing, Looker drill-down menu support
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.stack === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.stack === "function") {
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
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      primary: "#1a73e8",
      palette: ["#1a73e8", "#0d9488", "#f59e0b", "#64748b", "#7c3aed", "#dc2626", "#0284c7", "#16a34a"]
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#f59e0b",
      primary: "#2563eb",
      palette: ["#2563eb", "#0f172a", "#059669", "#94a3b8", "#7c3aed", "#ea580c", "#0284c7", "#475569"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      isDark: true,
      bg: "#0b1120",
      cardBg: "#111827",
      border: "#1e293b",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      positive: "#10b981",
      negative: "#f43f5e",
      warning: "#fbbf24",
      primary: "#38bdf8",
      palette: ["#38bdf8", "#a855f7", "#10b981", "#64748b", "#f43f5e", "#eab308", "#ec4899", "#14b8a6"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#dcfce7",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      primary: "#059669",
      palette: ["#059669", "#0284c7", "#0d9488", "#64748b", "#16a34a", "#ea580c", "#6366f1", "#84cc16"]
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      grid: "#ffedd5",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      primary: "#ea580c",
      palette: ["#ea580c", "#7c3aed", "#d97706", "#78716c", "#e11d48", "#0284c7", "#16a34a", "#9333ea"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0f9ff",
      border: "#bae6fd",
      text: "#0c4a6e",
      subtext: "#0369a1",
      grid: "#e0f2fe",
      positive: "#006B40",
      negative: "#B42318",
      warning: "#d97706",
      primary: "#0284c7",
      palette: ["#0284c7", "#006B40", "#4f46e5", "#64748b", "#d97706", "#dc2626", "#0891b2", "#143359"]
    }
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shortName(fld) {
    if (!fld) return "";
    var n = fld.name || "";
    var dot = n.lastIndexOf(".");
    return (dot >= 0 ? n.slice(dot + 1) : n).toLowerCase();
  }

  function resolveField(list, overrideVal, defaultIdx, hints) {
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
    if (hints && hints.length > 0) {
      for (var h = 0; h < hints.length; h++) {
        var pat = hints[h].toLowerCase();
        for (var j = 0; j < list.length; j++) {
          var sn = shortName(list[j]);
          var ls = (list[j].label_short || "").toLowerCase();
          if (sn.indexOf(pat) !== -1 || ls.indexOf(pat) !== -1) {
            return list[j];
          }
        }
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) return list[defaultIdx];
    return defaultIdx < 0 ? null : list[0];
  }

  function extractCellVal(cell) {
    if (cell === null || cell === undefined) return null;
    if (typeof cell === "object") {
      if (cell.value !== undefined && cell.value !== null) return cell.value;
      if (cell.rendered !== undefined && cell.rendered !== null) return cell.rendered;
      return null;
    }
    return cell;
  }

  function extractNumeric(cell) {
    var v = extractCellVal(cell);
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return (typeof n === "number" && isFinite(n)) ? n : null;
  }

  function formatValue(val, fmt, kind) {
    if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "percentage" || (fmt === "auto" && kind === "pct")) {
      return sign + abs.toFixed(1) + "%";
    }
    if (fmt === "compact_currency" || (fmt === "auto" && kind === "currency")) {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
    }
    if (fmt === "compact_number" || fmt === "auto") {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + (abs >= 100 ? Math.round(abs).toLocaleString() : abs.toFixed(abs % 1 === 0 ? 0 : 2));
    }
    if (fmt === "decimal_2") {
      return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === "raw") {
      return String(num);
    }
    return String(num);
  }

  function gaussianPDF(x, mean, std) {
    if (std <= 0) return 0;
    var z = (x - mean) / std;
    return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
  }

  looker.plugins.visualizations.add({
    id: "multi_armed_bandit_allocation",
    label: "Multi-Armed Bandit & Thompson Sampling Allocation Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Bandit Visual Paradigm",
        display: "select",
        values: [
          { "Thompson Sampling Traffic Share Stream": "allocation_ribbon" },
          { "Cumulative Regret & Savings vs Static A/B": "regret_horizon" },
          { "Beta Posterior Density & P(Best) Win Bars": "posterior_win_density" },
          { "Arm Exploration-Exploitation Quadrant": "arm_efficiency_quadrant" }
        ],
        default: "allocation_ribbon",
        section: "Display",
        order: 1
      },
      experimentDimOverride: {
        type: "string",
        label: "Experiment Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      periodDimOverride: {
        type: "string",
        label: "Day / Time Period Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      armDimOverride: {
        type: "string",
        label: "Variant Arm Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      shareMeasureOverride: {
        type: "string",
        label: "Traffic Allocation Share (%) Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      cvrMeasureOverride: {
        type: "string",
        label: "Arm Conversion / Reward Rate Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      winProbMeasureOverride: {
        type: "string",
        label: "Posterior P(Best) Win Prob (%) Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      regretMeasureOverride: {
        type: "string",
        label: "Cumulative Bandit Regret ($) Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 8
      },
      baselineRegretMeasureOverride: {
        type: "string",
        label: "Static A/B Counterfactual Regret ($) Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 9
      },
      ciLowerMeasureOverride: {
        type: "string",
        label: "Posterior 95% CI Lower Measure (Optional)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 10
      },
      ciUpperMeasureOverride: {
        type: "string",
        label: "Posterior 95% CI Upper Measure (Optional)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 11
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target Benchmark Measure (when Measure Column Mode)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 12
      },
      targetMode: {
        type: "string",
        label: "Convergence / Target Benchmark Mode",
        display: "select",
        values: [
          { "Fixed Target Value": "fixed" },
          { "Target Measure Column": "measure_column" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Percentile P75": "percentile_p75" },
          { "Percentile P90": "percentile_p90" },
          { "None (Hide Target)": "none" }
        ],
        default: "fixed",
        section: "Display",
        order: 13
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Convergence Target (e.g. 80 for 80% P(Best))",
        default: 80,
        section: "Display",
        order: 14
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line / Threshold Label",
        default: "Exploitation Convergence Target",
        section: "Display",
        order: 15
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Underperforming / Stalled Convergence Alert (%)",
        default: 50,
        section: "Display",
        order: 16
      },
      sortBy: {
        type: "string",
        label: "Sort Variant Arms By",
        display: "select",
        values: [
          { "Posterior P(Best) Descending": "win_prob_desc" },
          { "Traffic Share Descending": "share_desc" },
          { "Conversion Rate Descending": "reward_desc" },
          { "Arm Name Alphabetical": "alpha_asc" },
          { "Natural Query Order": "natural" }
        ],
        default: "win_prob_desc",
        section: "Display",
        order: 17
      },
      topNLimit: {
        type: "string",
        label: "Top-N Arms Limit",
        display: "select",
        values: [
          { "All Arms": "all" },
          { "Top 3 Arms": "3" },
          { "Top 5 Arms": "5" },
          { "Top 8 Arms": "8" }
        ],
        default: "all",
        section: "Display",
        order: 18
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Remaining Arms into 'Other Arms'",
        default: true,
        section: "Display",
        order: 19
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Observations",
        default: true,
        section: "Display",
        order: 20
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 21
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "Min/Max & Winner Peaks Only": "peaks_only" },
          { "All Data Points": "all" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only",
        section: "Display",
        order: 22
      },
      showLegend: {
        type: "boolean",
        label: "Show Interactive Arm Legend",
        default: true,
        section: "Display",
        order: 23
      },
      showSearch: {
        type: "boolean",
        label: "Show Experiment Pills & Arm Filter Bar",
        default: true,
        section: "Display",
        order: 24
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 25
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 26
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
          { "Cyberpunk Dark": "cyberpunk_dark" },
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
        label: "Custom Winning / Primary Arm Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Regret Saved / Positive Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Regret / Alert Hex",
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
          { "Higher is Better (CVR, Win Prob, Regret Saved)": "higher_is_better" },
          { "Lower is Better (Regret $, Churn, Latency)": "lower_is_better" }
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
          { "Compact (Dense Tiles)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation (Executive)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Format Override",
        display: "select",
        values: [
          { "Auto (Contextual % & $)": "auto" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 7
      },
      curveInterpolation: {
        type: "string",
        label: "Stream & Curve Interpolation",
        display: "select",
        values: [
          { "Smooth Monotone Spline": "smooth" },
          { "Linear Segments": "linear" }
        ],
        default: "smooth",
        section: "Style",
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        experimentDimOverride: { role: "dimension", defaultIdx: 0 },
        periodDimOverride: { role: "dimension", defaultIdx: 1 },
        armDimOverride: { role: "dimension", defaultIdx: 2 },
        shareMeasureOverride: { role: "measure", defaultIdx: 0 },
        cvrMeasureOverride: { role: "measure", defaultIdx: 1 },
        winProbMeasureOverride: { role: "measure", defaultIdx: 2 },
        regretMeasureOverride: { role: "measure", defaultIdx: 5 },
        baselineRegretMeasureOverride: { role: "measure", defaultIdx: 6 },
        ciLowerMeasureOverride: { role: "measure", defaultIdx: -1 },
        ciUpperMeasureOverride: { role: "measure", defaultIdx: -1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
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

    create: function (element) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      this._container = document.createElement("div");
      this._container.className = "bandit-alloc-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      if (!this._tooltip || !document.body.contains(this._tooltip)) {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "bandit-alloc-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.padding = "10px 14px";
        this._tooltip.style.borderRadius = "8px";
        this._tooltip.style.fontSize = "12px";
        this._tooltip.style.boxShadow = "0 10px 24px rgba(0,0,0,0.22)";
        document.body.appendChild(this._tooltip);
      }

      this._selectedExperiment = null;
      this._searchTerm = "";
      this._isolatedArm = null;
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

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        element.style.boxSizing = "border-box";
        element.style.padding = "0";
        element.style.overflow = "hidden";
        this._container = document.createElement("div");
        this._container.className = "bandit-alloc-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.display = "flex";
        this._container.style.flexDirection = "column";
        this._container.style.overflow = "hidden";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      if (!data || data.length === 0 || !queryResponse || !queryResponse.fields) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Bandit Telemetry Data",
              message: "Run a query with Experiment, Period/Day, Variant Arm, and Traffic Share / CVR / Regret measures."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      if (dims.length < 2 || meas.length < 1) {
        if (this.addError) {
          try {
            this.addError({
              title: "Insufficient Fields",
              message: "Multi-Armed Bandit Analyzer requires at least 2 dimensions (Period/Day, Variant Arm) and 1 measure (Traffic Share %)."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, config || {}, queryResponse);
          done();
        } catch (err) {
          console.error("Bandit allocation render error:", err);
          if (self.addError) {
            try {
              self.addError({ title: "Render Error", message: err.message });
            } catch (e) {}
          }
          done();
        }
      });
    },

    _render: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var themeKey = config.colorPalette || "google_enterprise";
      var theme = Object.assign({}, THEMES[themeKey] || THEMES.google_enterprise);
      if (themeKey === "custom" || config.customPrimaryColor || config.customPositiveColor || config.customNegativeColor) {
        if (config.customPrimaryColor) {
          theme.primary = config.customPrimaryColor;
          theme.palette = [config.customPrimaryColor].concat(theme.palette.slice(1));
        }
        if (config.customPositiveColor) theme.positive = config.customPositiveColor;
        if (config.customNegativeColor) theme.negative = config.customNegativeColor;
      }

      var fontMultiplier = 1.0;
      if (config.fontScale === "compact") fontMultiplier = 0.88;
      else if (config.fontScale === "large") fontMultiplier = 1.16;

      container.style.background = theme.bg;
      container.style.color = theme.text;
      container.style.fontSize = (12 * fontMultiplier) + "px";

      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var expDim = dims.length >= 3 ? resolveField(dims, config.experimentDimOverride, 0, ["experiment", "campaign", "test"]) : null;
      var periodDim = resolveField(dims, config.periodDimOverride, expDim ? 1 : 0, ["day", "date", "period", "step", "week"]);
      var armDim = resolveField(dims, config.armDimOverride, expDim ? 2 : 1, ["arm", "variant", "branch", "treatment"]);

      var shareMeas = resolveField(meas, config.shareMeasureOverride, 0, ["traffic_share", "share", "alloc", "weight"]);
      var cvrMeas = resolveField(meas, config.cvrMeasureOverride, Math.min(1, meas.length - 1), ["cvr", "conversion", "reward_rate", "ctr", "rate"]);
      var winProbMeas = resolveField(meas, config.winProbMeasureOverride, Math.min(2, meas.length - 1), ["win_prob", "p_best", "best", "prob"]);
      var regretMeas = resolveField(meas, config.regretMeasureOverride, -1, ["bandit_regret", "cum_regret", "regret_usd", "regret"]);
      var baseRegretMeas = resolveField(meas, config.baselineRegretMeasureOverride, -1, ["static_ab_regret", "baseline_regret", "counterfactual"]);
      var savedMeas = resolveField(meas, "", -1, ["regret_saved", "saved"]);
      var ciLowMeas = resolveField(meas, config.ciLowerMeasureOverride, -1, ["ci_lower", "lower"]);
      var ciHighMeas = resolveField(meas, config.ciUpperMeasureOverride, -1, ["ci_upper", "upper"]);
      var alphaMeas = resolveField(meas, "", -1, ["beta_alpha", "alpha"]);
      var betaMeas = resolveField(meas, "", -1, ["beta_beta", "beta"]);
      var impMeas = resolveField(meas, "", -1, ["impression", "sample", "users", "count"]);
      var convMeas = resolveField(meas, "", -1, ["conversion", "success"]);
      var targetMeas = config.targetMeasureOverride ? resolveField(meas, config.targetMeasureOverride, -1) : null;

      // Aggregate O(N) into experiments -> periods -> arms
      var expMap = {};
      var expOrder = [];
      var hasAnyDrills = false;

      data.forEach(function (row) {
        var expName = expDim ? String(extractCellVal(row[expDim.name]) || "Bandit Experiment") : "Bandit Optimization";
        var rawPeriod = extractCellVal(row[periodDim.name]);
        if (rawPeriod === null || rawPeriod === undefined || rawPeriod === "") return;
        var periodNum = Number(rawPeriod);
        var periodKey = isFinite(periodNum) ? periodNum : String(rawPeriod);
        var armName = String(extractCellVal(row[armDim.name]) || "Unknown Arm");

        var shareVal = extractNumeric(row[shareMeas.name]);
        if (config.suppressZeroNull && (shareVal === null || shareVal <= 0)) return;
        if (shareVal === null) shareVal = 0;

        var cvrVal = cvrMeas ? extractNumeric(row[cvrMeas.name]) : null;
        var winProbVal = winProbMeas ? extractNumeric(row[winProbMeas.name]) : null;
        var regretVal = regretMeas ? extractNumeric(row[regretMeas.name]) : null;
        var baseRegretVal = baseRegretMeas ? extractNumeric(row[baseRegretMeas.name]) : null;
        var savedVal = savedMeas ? extractNumeric(row[savedMeas.name]) : null;
        var ciLowVal = ciLowMeas ? extractNumeric(row[ciLowMeas.name]) : null;
        var ciHighVal = ciHighMeas ? extractNumeric(row[ciHighMeas.name]) : null;
        var alphaVal = alphaMeas ? extractNumeric(row[alphaMeas.name]) : null;
        var betaVal = betaMeas ? extractNumeric(row[betaMeas.name]) : null;
        var impVal = impMeas ? extractNumeric(row[impMeas.name]) : null;
        var convVal = convMeas ? extractNumeric(row[convMeas.name]) : null;
        var tgtVal = targetMeas ? extractNumeric(row[targetMeas.name]) : null;

        var links = null;
        var linkCandidates = [armDim, expDim, shareMeas, cvrMeas, winProbMeas];
        for (var li = 0; li < linkCandidates.length; li++) {
          var lf = linkCandidates[li];
          if (lf && row[lf.name] && row[lf.name].links && row[lf.name].links.length) {
            links = row[lf.name].links;
            hasAnyDrills = true;
            break;
          }
        }

        if (!expMap[expName]) {
          expMap[expName] = { name: expName, rows: [], periods: {}, arms: {} };
          expOrder.push(expName);
        }
        var rec = {
          expName: expName,
          periodKey: periodKey,
          periodNum: isFinite(periodNum) ? periodNum : null,
          armName: armName,
          share: shareVal,
          cvr: cvrVal !== null ? cvrVal : 0,
          winProb: winProbVal !== null ? winProbVal : 0,
          regret: regretVal !== null ? regretVal : 0,
          baseRegret: baseRegretVal !== null ? baseRegretVal : 0,
          saved: savedVal !== null ? savedVal : Math.max(0, (baseRegretVal || 0) - (regretVal || 0)),
          ciLow: ciLowVal,
          ciHigh: ciHighVal,
          alpha: alphaVal,
          beta: betaVal,
          impressions: impVal || 0,
          conversions: convVal || 0,
          targetVal: tgtVal,
          links: links
        };
        expMap[expName].rows.push(rec);
        expMap[expName].arms[armName] = true;
      });

      if (expOrder.length === 0) {
        container.innerHTML = "<div style='padding:24px;text-align:center;color:" + theme.subtext + ";'>No non-empty bandit observations returned.</div>";
        return;
      }

      if (!self._selectedExperiment || !expMap[self._selectedExperiment]) {
        self._selectedExperiment = expOrder[0];
      }

      var activeExp = expMap[self._selectedExperiment];
      var armList = Object.keys(activeExp.arms);

      // Organize rows by period and compute latest-day summary per arm
      var periodMap = {};
      var armLatest = {};
      var armTotals = {};

      activeExp.rows.forEach(function (r) {
        var pk = String(r.periodKey);
        if (!periodMap[pk]) {
          periodMap[pk] = {
            periodKey: r.periodKey,
            periodNum: r.periodNum,
            arms: {},
            banditRegret: 0,
            staticRegret: 0,
            regretSaved: 0
          };
        }
        periodMap[pk].arms[r.armName] = r;
        periodMap[pk].banditRegret = Math.max(periodMap[pk].banditRegret, r.regret);
        periodMap[pk].staticRegret = Math.max(periodMap[pk].staticRegret, r.baseRegret);
        periodMap[pk].regretSaved = Math.max(periodMap[pk].regretSaved, r.saved);

        if (!armTotals[r.armName]) {
          armTotals[r.armName] = { armName: r.armName, impressions: 0, conversions: 0, links: r.links };
        }
        armTotals[r.armName].impressions += r.impressions;
        armTotals[r.armName].conversions += r.conversions;
        if (!armTotals[r.armName].links && r.links) armTotals[r.armName].links = r.links;

        if (!armLatest[r.armName] || (r.periodNum !== null && (armLatest[r.armName].periodNum === null || r.periodNum >= armLatest[r.armName].periodNum))) {
          armLatest[r.armName] = r;
        }
      });

      var periods = Object.keys(periodMap).map(function (k) { return periodMap[k]; });
      periods.sort(function (a, b) {
        if (a.periodNum !== null && b.periodNum !== null) return a.periodNum - b.periodNum;
        return String(a.periodKey).localeCompare(String(b.periodKey));
      });

      // Build sorted arm summary list
      var armSummaries = armList.map(function (name) {
        var lat = armLatest[name] || {};
        var tot = armTotals[name] || {};
        var ciLow = lat.ciLow !== null && lat.ciLow !== undefined ? lat.ciLow : Math.max(0, (lat.cvr || 0) - 0.5);
        var ciHigh = lat.ciHigh !== null && lat.ciHigh !== undefined ? lat.ciHigh : ((lat.cvr || 0) + 0.5);
        return {
          armName: name,
          latestShare: lat.share || 0,
          latestCvr: lat.cvr || 0,
          latestWinProb: lat.winProb || 0,
          ciLow: ciLow,
          ciHigh: ciHigh,
          alpha: lat.alpha,
          beta: lat.beta,
          impressions: tot.impressions || 0,
          conversions: tot.conversions || 0,
          targetVal: lat.targetVal,
          links: tot.links || lat.links || null,
          isOther: false
        };
      });

      // Filter by search term if applied
      if (self._searchTerm) {
        var q = self._searchTerm.toLowerCase();
        var filteredArms = armSummaries.filter(function (a) {
          return a.armName.toLowerCase().indexOf(q) !== -1 || activeExp.name.toLowerCase().indexOf(q) !== -1;
        });
        if (filteredArms.length > 0) armSummaries = filteredArms;
      }

      var sortBy = config.sortBy || "win_prob_desc";
      if (sortBy === "win_prob_desc") armSummaries.sort(function (a, b) { return b.latestWinProb - a.latestWinProb; });
      else if (sortBy === "share_desc") armSummaries.sort(function (a, b) { return b.latestShare - a.latestShare; });
      else if (sortBy === "reward_desc") armSummaries.sort(function (a, b) { return b.latestCvr - a.latestCvr; });
      else if (sortBy === "alpha_asc") armSummaries.sort(function (a, b) { return a.armName.localeCompare(b.armName); });

      // Top-N & 'Other Arms' Rollup
      var topN = config.topNLimit && config.topNLimit !== "all" ? parseInt(config.topNLimit, 10) : 0;
      if (topN > 0 && armSummaries.length > topN) {
        var kept = armSummaries.slice(0, topN);
        var dropped = armSummaries.slice(topN);
        var droppedSet = {};
        dropped.forEach(function (d) { droppedSet[d.armName] = true; });
        if (config.enableOtherRollup !== false && dropped.length > 0) {
          var otherName = "Other Arms (" + dropped.length + ")";
          var sumShare = d3.sum(dropped, function (d) { return d.latestShare; });
          var meanCvr = d3.mean(dropped, function (d) { return d.latestCvr; }) || 0;
          var sumWin = d3.sum(dropped, function (d) { return d.latestWinProb; });
          kept.push({
            armName: otherName,
            latestShare: sumShare,
            latestCvr: meanCvr,
            latestWinProb: sumWin,
            ciLow: Math.max(0, meanCvr - 0.5),
            ciHigh: meanCvr + 0.5,
            impressions: d3.sum(dropped, function (d) { return d.impressions; }),
            conversions: d3.sum(dropped, function (d) { return d.conversions; }),
            links: null,
            isOther: true
          });
          periods.forEach(function (p) {
            var oShare = 0, oCvrSum = 0, oCvrCnt = 0, oWin = 0;
            Object.keys(droppedSet).forEach(function (dn) {
              if (p.arms[dn]) {
                oShare += p.arms[dn].share;
                oCvrSum += p.arms[dn].cvr;
                oCvrCnt += 1;
                oWin += p.arms[dn].winProb;
                delete p.arms[dn];
              }
            });
            p.arms[otherName] = {
              armName: otherName,
              share: oShare,
              cvr: oCvrCnt ? oCvrSum / oCvrCnt : 0,
              winProb: oWin
            };
          });
        }
        armSummaries = kept;
      }

      var activeArmNames = armSummaries.map(function (a) { return a.armName; });
      var armColorMap = {};
      armSummaries.forEach(function (a, i) {
        armColorMap[a.armName] = a.isOther ? theme.subtext : theme.palette[i % theme.palette.length];
      });

      var winningArm = armSummaries[0] || { armName: "-", latestWinProb: 0, latestShare: 0, latestCvr: 0, ciLow: 0, ciHigh: 0 };
      var lastPeriod = periods[periods.length - 1] || { banditRegret: 0, staticRegret: 0, regretSaved: 0 };
      var regretReductionPct = lastPeriod.staticRegret > 0 ? (lastPeriod.regretSaved / lastPeriod.staticRegret) * 100 : 0;

      // Resolve Target Benchmark Value (for P(Best) convergence / reference lines)
      var winValues = armSummaries.map(function (a) { return a.latestWinProb; }).sort(d3.ascending);
      var targetMode = config.targetMode || "fixed";
      var targetVal = null;
      if (targetMode === "fixed") {
        targetVal = config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 80;
      } else if (targetMode === "dataset_mean") {
        targetVal = d3.mean(winValues) || 0;
      } else if (targetMode === "dataset_median") {
        targetVal = d3.median(winValues) || 0;
      } else if (targetMode === "percentile_p75") {
        targetVal = d3.quantile(winValues, 0.75) || 0;
      } else if (targetMode === "percentile_p90") {
        targetVal = d3.quantile(winValues, 0.90) || 0;
      } else if (targetMode === "measure_column") {
        var tv = armSummaries.map(function (a) { return a.targetVal; }).filter(function (v) { return v !== null && isFinite(v); });
        targetVal = tv.length ? d3.mean(tv) : 80;
      }

      var valFmt = config.valueFormat || "auto";
      var lowerIsBetter = config.metricPolarity === "lower_is_better";
      var anomalyThresh = config.anomalyThresholdPct !== undefined ? Number(config.anomalyThresholdPct) : 50;
      var isStalled = anomalyThresh > 0 && winningArm.latestWinProb < anomalyThresh;

      // 1. Executive Scorecard HUD
      if (config.hudMode !== "hidden") {
        var hud = document.createElement("div");
        hud.style.flex = "0 0 auto";
        hud.style.padding = config.hudMode === "compact_strip" ? "6px 14px" : "10px 14px";
        hud.style.background = theme.cardBg;
        hud.style.borderBottom = "1px solid " + theme.border;
        hud.style.display = config.hudMode === "compact_strip" ? "flex" : "grid";
        hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(175px, 1fr))";
        hud.style.gap = "8px";
        hud.style.alignItems = "center";

        var titleStr = config.customTitle || activeExp.name;
        var subStr = config.customSubtitle || (periods.length + " Days \u2022 " + armSummaries.length + " Variant Arms \u2022 Thompson Sampling");
        var convergeColor = isStalled ? theme.negative : theme.positive;

        if (config.hudMode === "compact_strip") {
          hud.innerHTML =
            '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;width:100%;">' +
              '<span style="font-size:' + (12.5 * fontMultiplier) + 'px;font-weight:700;color:' + theme.text + ';">' + escapeHtml(titleStr) + '</span>' +
              '<span style="font-size:' + (11 * fontMultiplier) + 'px;color:' + theme.subtext + ';">Leader: <strong style="color:' + theme.primary + ';">' + escapeHtml(winningArm.armName) + '</strong> (' + winningArm.latestWinProb.toFixed(1) + '% P(Best))</span>' +
              '<span style="font-size:' + (11 * fontMultiplier) + 'px;color:' + theme.positive + ';font-weight:700;">Regret Saved: ' + escapeHtml(formatValue(lastPeriod.regretSaved, valFmt, "currency")) + ' (' + regretReductionPct.toFixed(0) + '%)</span>' +
              (hasAnyDrills ? '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(26,115,232,0.1);color:' + theme.primary + ';">CLICK TO DRILL</span>' : '') +
            '</div>';
        } else {
          hud.innerHTML =
            '<div style="padding:7px 10px;border-radius:6px;background:' + theme.bg + ';border:1px solid ' + theme.border + ';min-width:0;">' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:600;text-transform:uppercase;color:' + theme.subtext + ';display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Active Bandit Experiment</span>' +
                (hasAnyDrills ? '<span style="font-size:8.5px;padding:1px 5px;border-radius:3px;background:rgba(26,115,232,0.12);color:' + theme.primary + ';">DRILL</span>' : '') +
              '</div>' +
              '<div style="font-size:' + (14 * fontMultiplier) + 'px;font-weight:800;color:' + theme.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(titleStr) + '">' + escapeHtml(titleStr) + '</div>' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;color:' + theme.subtext + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(subStr) + '</div>' +
            '</div>' +
            '<div style="padding:7px 10px;border-radius:6px;background:' + theme.bg + ';border:1px solid ' + theme.border + ';min-width:0;">' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:600;text-transform:uppercase;color:' + theme.subtext + ';">Leading Variant Arm</div>' +
              '<div style="font-size:' + (14 * fontMultiplier) + 'px;font-weight:800;color:' + theme.primary + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + escapeHtml(winningArm.armName) + '">\u2605 ' + escapeHtml(winningArm.armName) + '</div>' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;color:' + convergeColor + ';">P(Best): ' + winningArm.latestWinProb.toFixed(1) + '% ' + (isStalled ? '(Exploring)' : '(Converged)') + '</div>' +
            '</div>' +
            '<div style="padding:7px 10px;border-radius:6px;background:' + theme.bg + ';border:1px solid ' + theme.border + ';min-width:0;">' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:600;text-transform:uppercase;color:' + theme.subtext + ';">Current Traffic Share &amp; CVR</div>' +
              '<div style="font-size:' + (14 * fontMultiplier) + 'px;font-weight:800;color:' + theme.text + ';">' + winningArm.latestShare.toFixed(1) + '% <span style="font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:' + theme.subtext + ';">share</span></div>' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;color:' + theme.subtext + ';">CVR: ' + winningArm.latestCvr.toFixed(2) + '% [' + winningArm.ciLow.toFixed(2) + '%\u2013' + winningArm.ciHigh.toFixed(2) + '%]</div>' +
            '</div>' +
            '<div style="padding:7px 10px;border-radius:6px;background:' + theme.bg + ';border:1px solid ' + theme.border + ';min-width:0;">' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:600;text-transform:uppercase;color:' + theme.subtext + ';">Regret Saved vs Static A/B</div>' +
              '<div style="font-size:' + (14 * fontMultiplier) + 'px;font-weight:800;color:' + (lowerIsBetter ? theme.negative : theme.positive) + ';">' + escapeHtml(formatValue(lastPeriod.regretSaved, valFmt, "currency")) + '</div>' +
              '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;color:' + theme.subtext + ';">' + regretReductionPct.toFixed(1) + '% opportunity cost avoided</div>' +
            '</div>';
        }
        container.appendChild(hud);
      }

      // 2. Experiment Selector Pills, Search & Interactive Legend Bar
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;
      if (showSearch || showLegend) {
        var bar = document.createElement("div");
        bar.style.flex = "0 0 auto";
        bar.style.display = "flex";
        bar.style.flexWrap = "wrap";
        bar.style.alignItems = "center";
        bar.style.justifyContent = "space-between";
        bar.style.gap = "8px";
        bar.style.padding = "6px 14px";
        bar.style.background = theme.bg;
        bar.style.borderBottom = "1px solid " + theme.border;

        if (showSearch) {
          var leftCtrl = document.createElement("div");
          leftCtrl.style.display = "flex";
          leftCtrl.style.flexWrap = "wrap";
          leftCtrl.style.alignItems = "center";
          leftCtrl.style.gap = "6px";

          if (expOrder.length > 1) {
            expOrder.forEach(function (ename) {
              var pill = document.createElement("button");
              var isActive = ename === activeExp.name;
              pill.type = "button";
              pill.textContent = ename;
              pill.style.padding = "3px 9px";
              pill.style.borderRadius = "999px";
              pill.style.fontSize = (10.5 * fontMultiplier) + "px";
              pill.style.fontWeight = isActive ? "700" : "500";
              pill.style.cursor = "pointer";
              pill.style.border = "1px solid " + (isActive ? theme.primary : theme.border);
              pill.style.background = isActive ? theme.primary : theme.cardBg;
              pill.style.color = isActive ? "#ffffff" : theme.text;
              pill.onclick = function () {
                self._selectedExperiment = ename;
                self._isolatedArm = null;
                self._render(d3, data, config, queryResponse);
              };
              leftCtrl.appendChild(pill);
            });
          }

          var inp = document.createElement("input");
          inp.type = "text";
          inp.placeholder = "Filter variant arms...";
          inp.value = self._searchTerm || "";
          inp.style.padding = "3px 9px";
          inp.style.fontSize = (10.5 * fontMultiplier) + "px";
          inp.style.borderRadius = "5px";
          inp.style.border = "1px solid " + theme.border;
          inp.style.background = theme.cardBg;
          inp.style.color = theme.text;
          inp.style.width = "145px";
          inp.style.outline = "none";
          inp.oninput = function (e) {
            self._searchTerm = e.target.value;
            self._render(d3, data, config, queryResponse);
          };
          leftCtrl.appendChild(inp);
          bar.appendChild(leftCtrl);
        }

        if (showLegend) {
          var leg = document.createElement("div");
          leg.style.display = "flex";
          leg.style.flexWrap = "wrap";
          leg.style.alignItems = "center";
          leg.style.gap = "10px";
          leg.style.fontSize = (10.5 * fontMultiplier) + "px";
          armSummaries.forEach(function (a, i) {
            var item = document.createElement("span");
            var faded = self._isolatedArm && self._isolatedArm !== a.armName;
            item.style.display = "inline-flex";
            item.style.alignItems = "center";
            item.style.gap = "4px";
            item.style.cursor = "pointer";
            item.style.opacity = faded ? "0.38" : "1";
            item.style.fontWeight = i === 0 ? "700" : "500";
            item.style.color = theme.text;
            item.title = "Click to isolate " + a.armName;
            item.innerHTML = '<span style="width:9px;height:9px;border-radius:2px;background:' + armColorMap[a.armName] + ';display:inline-block;"></span>' + escapeHtml(a.armName);
            item.onclick = function () {
              self._isolatedArm = (self._isolatedArm === a.armName) ? null : a.armName;
              self._render(d3, data, config, queryResponse);
            };
            leg.appendChild(item);
          });
          bar.appendChild(leg);
        }
        container.appendChild(bar);
      }

      // 3. Main SVG Chart Canvas Wrapper
      var chartWrap = document.createElement("div");
      chartWrap.style.flex = "1 1 0";
      chartWrap.style.minHeight = "0";
      chartWrap.style.width = "100%";
      chartWrap.style.position = "relative";
      chartWrap.style.overflow = "hidden";
      container.appendChild(chartWrap);

      var w = Math.max(chartWrap.clientWidth || 720, 420);
      var h = Math.max(chartWrap.clientHeight || 340, 220);

      var mode = config.layoutMode || "allocation_ribbon";
      if (mode === "regret_horizon") {
        self._renderRegretHorizon(d3, chartWrap, w, h, periods, activeExp, theme, config, valFmt, fontMultiplier);
      } else if (mode === "posterior_win_density") {
        self._renderPosteriorWinDensity(d3, chartWrap, w, h, armSummaries, armColorMap, targetVal, theme, config, valFmt, fontMultiplier);
      } else if (mode === "arm_efficiency_quadrant") {
        self._renderArmQuadrant(d3, chartWrap, w, h, armSummaries, armColorMap, theme, config, valFmt, fontMultiplier);
      } else {
        self._renderAllocationRibbon(d3, chartWrap, w, h, periods, armSummaries, activeArmNames, armColorMap, targetVal, theme, config, valFmt, fontMultiplier);
      }
    },

    _showTooltip: function (html, event, borderColor, theme) {
      var tt = this._tooltip;
      tt.style.background = theme.isDark ? "#1e293b" : "#ffffff";
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + borderColor;
      tt.innerHTML = html;
      tt.style.display = "block";
      var x = event.clientX + 14;
      var y = event.clientY - 28;
      if (x + 260 > window.innerWidth) x = event.clientX - 270;
      if (y + 150 > window.innerHeight) y = event.clientY - 150;
      tt.style.left = Math.max(8, x) + "px";
      tt.style.top = Math.max(8, y) + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) this._tooltip.style.display = "none";
    },

    _renderAllocationRibbon: function (d3, wrap, w, h, periods, armSummaries, armNames, armColorMap, targetVal, theme, config, valFmt, fontMultiplier) {
      var self = this;
      var labelDens = config.labelDensity || "peaks_only";
      var margin = {
        top: 26,
        right: Math.min(205, Math.max(125, Math.round(w * 0.23))),
        bottom: 34,
        left: 52
      };
      var cw = Math.max(180, w - margin.left - margin.right);
      var ch = Math.max(120, h - margin.top - margin.bottom);

      var svg = d3.select(wrap).append("svg").attr("width", w).attr("height", h).style("display", "block");
      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Normalize rows for 100% stacked stream
      var stackRows = periods.map(function (p) {
        var row = { periodKey: p.periodKey, periodNum: p.periodNum, rawArms: p.arms };
        var total = 0;
        armNames.forEach(function (an) {
          var v = p.arms[an] ? Math.max(0, p.arms[an].share) : 0;
          row[an] = v;
          total += v;
        });
        if (total > 0) {
          armNames.forEach(function (an) {
            row[an] = (row[an] / total) * 100.0;
          });
        }
        return row;
      });

      var stackOrder = armNames.slice().reverse();
      var stacked = d3.stack().keys(stackOrder)(stackRows);

      var xDomain = periods.map(function (p) { return p.periodKey; });
      var xScale = d3.scalePoint().domain(xDomain).range([0, cw]);
      var yScale = d3.scaleLinear().domain([0, 100]).range([ch, 0]);

      // Gridlines
      var gridG = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-cw).tickFormat(""));
      gridG.select(".domain").remove();
      gridG.selectAll(".tick line").attr("stroke", theme.grid).attr("stroke-dasharray", "2,2");

      var curveFn = config.curveInterpolation === "linear" ? d3.curveLinear : d3.curveMonotoneX;
      var area = d3.area()
        .x(function (d) { return xScale(d.data.periodKey); })
        .y0(function (d) { return yScale(d[0]); })
        .y1(function (d) { return yScale(d[1]); })
        .curve(curveFn);

      g.selectAll(".bandit-stream")
        .data(stacked)
        .enter()
        .append("path")
        .attr("class", "bandit-stream")
        .attr("d", area)
        .attr("fill", function (d) { return armColorMap[d.key]; })
        .attr("fill-opacity", function (d) {
          if (self._isolatedArm && self._isolatedArm !== d.key) return 0.18;
          return 0.85;
        })
        .attr("stroke", theme.bg)
        .attr("stroke-width", 1.2)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          var summary = armSummaries.find(function (a) { return a.armName === d.key; });
          if (summary && summary.links && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: summary.links, event: event });
          }
        });

      // Convergence Day Marker (first day winning arm crosses targetVal P(Best))
      var leaderName = armNames[0];
      var convThresh = targetVal !== null ? targetVal : 80;
      var convPeriod = null;
      for (var pi = 0; pi < periods.length; pi++) {
        var armRec = periods[pi].arms[leaderName];
        if (armRec && armRec.winProb >= convThresh) {
          convPeriod = periods[pi].periodKey;
          break;
        }
      }
      if (convPeriod !== null) {
        var cx = xScale(convPeriod);
        g.append("line")
          .attr("x1", cx).attr("x2", cx)
          .attr("y1", 0).attr("y2", ch)
          .attr("stroke", theme.isDark ? "#fbbf24" : "#0f172a")
          .attr("stroke-width", 1.75)
          .attr("stroke-dasharray", "5,3");

        g.append("text")
          .attr("x", cx + 4)
          .attr("y", -8)
          .attr("font-size", (9.5 * fontMultiplier) + "px")
          .attr("font-weight", "700")
          .attr("fill", theme.isDark ? "#fbbf24" : "#0f172a")
          .text("Exploit Lock (Day " + convPeriod + ": P(Best)\u2265" + Math.round(convThresh) + "%)");
      }

      // Axes
      var tickVals = xDomain.filter(function (_, idx) {
        return idx === 0 || idx === xDomain.length - 1 || idx % Math.max(1, Math.ceil(xDomain.length / 7)) === 0;
      });
      var xAx = g.append("g")
        .attr("transform", "translate(0," + ch + ")")
        .call(d3.axisBottom(xScale).tickValues(tickVals).tickFormat(function (d) { return "Day " + d; }));
      xAx.select(".domain").attr("stroke", theme.border);
      xAx.selectAll(".tick line").attr("stroke", theme.border);
      xAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      var yAx = g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return d + "%"; }));
      yAx.select(".domain").attr("stroke", theme.border);
      yAx.selectAll(".tick line").attr("stroke", theme.border);
      yAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      // Right-edge direct labels with collision avoidance
      if (labelDens !== "hidden") {
        var labelEntries = [];
        stacked.forEach(function (layer) {
          var lastPt = layer[layer.length - 1];
          if (!lastPt) return;
          var midY = (yScale(lastPt[0]) + yScale(lastPt[1])) / 2;
          var sumObj = armSummaries.find(function (a) { return a.armName === layer.key; }) || {};
          labelEntries.push({
            armName: layer.key,
            y: midY,
            share: sumObj.latestShare || 0,
            winProb: sumObj.latestWinProb || 0,
            isWinner: layer.key === leaderName
          });
        });
        labelEntries.sort(function (a, b) { return a.y - b.y; });
        var minGap = 24 * fontMultiplier;
        for (var li = 1; li < labelEntries.length; li++) {
          if (labelEntries[li].y - labelEntries[li - 1].y < minGap) {
            labelEntries[li].y = labelEntries[li - 1].y + minGap;
          }
        }
        var lowestArmName = armSummaries[armSummaries.length - 1] ? armSummaries[armSummaries.length - 1].armName : "";
        labelEntries.forEach(function (le) {
          if (labelDens === "peaks_only" && !le.isWinner && le.armName !== lowestArmName && le.share < 10) return;
          var maxChars = Math.max(12, Math.floor((margin.right - 14) / (6.2 * fontMultiplier)));
          var shortLbl = le.armName.length > maxChars ? le.armName.slice(0, maxChars - 1) + "\u2026" : le.armName;
          var lblG = g.append("g").attr("transform", "translate(" + (cw + 8) + "," + Math.min(ch - 6, Math.max(10, le.y)) + ")");
          lblG.append("circle").attr("cx", 0).attr("cy", -3).attr("r", 3.5).attr("fill", armColorMap[le.armName]);
          lblG.append("text")
            .attr("x", 8).attr("y", 0)
            .attr("font-size", (10 * fontMultiplier) + "px")
            .attr("font-weight", le.isWinner ? "700" : "600")
            .attr("fill", le.isWinner ? theme.primary : theme.text)
            .text((le.isWinner ? "\u2605 " : "") + shortLbl);
          lblG.append("text")
            .attr("x", 8).attr("y", 11)
            .attr("font-size", (9 * fontMultiplier) + "px")
            .attr("fill", theme.subtext)
            .text(le.share.toFixed(1) + "% share \u2022 P=" + le.winProb.toFixed(0) + "%");
        });
      }

      // Interactive hover crosshair overlay
      var crossLine = g.append("line")
        .attr("y1", 0).attr("y2", ch)
        .attr("stroke", theme.text).attr("stroke-width", 1).attr("stroke-dasharray", "3,3")
        .style("opacity", 0).style("pointer-events", "none");

      g.append("rect")
        .attr("width", cw).attr("height", ch)
        .attr("fill", "transparent")
        .on("mousemove", function (event) {
          var mx = d3.pointer(event, this)[0];
          var bestIdx = 0;
          var bestDist = Infinity;
          periods.forEach(function (p, idx) {
            var dist = Math.abs(xScale(p.periodKey) - mx);
            if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
          });
          var p = periods[bestIdx];
          if (!p) return;
          var px = xScale(p.periodKey);
          crossLine.attr("x1", px).attr("x2", px).style("opacity", 0.65);

          var rowsHtml = armNames.map(function (an) {
            var r = p.arms[an];
            if (!r) return "";
            return '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px;">' +
              '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + armColorMap[an] + ';margin-right:5px;"></span>' + escapeHtml(an) + '</span>' +
              '<strong>' + r.share.toFixed(1) + '%</strong> <span style="color:' + theme.subtext + ';">(CVR ' + r.cvr.toFixed(2) + '% / P=' + r.winProb.toFixed(0) + '%)</span>' +
            '</div>';
          }).join("");

          self._showTooltip(
            '<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid ' + theme.border + ';padding-bottom:3px;">Day ' + escapeHtml(p.periodKey) + ' \u2014 Traffic Allocation</div>' +
            rowsHtml +
            '<div style="margin-top:5px;padding-top:4px;border-top:1px solid ' + theme.border + ';font-size:11px;color:' + theme.positive + ';font-weight:700;">Cumulative Regret Saved: ' + escapeHtml(formatValue(p.regretSaved, valFmt, "currency")) + '</div>',
            event, theme.primary, theme
          );
        })
        .on("mouseleave", function () {
          crossLine.style("opacity", 0);
          self._hideTooltip();
        });
    },

    _renderRegretHorizon: function (d3, wrap, w, h, periods, activeExp, theme, config, valFmt, fontMultiplier) {
      var self = this;
      var margin = { top: 26, right: 30, bottom: 36, left: 66 };
      var cw = Math.max(180, w - margin.left - margin.right);
      var ch = Math.max(120, h - margin.top - margin.bottom);

      var svg = d3.select(wrap).append("svg").attr("width", w).attr("height", h).style("display", "block");
      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var xDomain = periods.map(function (p) { return p.periodKey; });
      var xScale = d3.scalePoint().domain(xDomain).range([0, cw]);
      var maxY = d3.max(periods, function (p) { return Math.max(p.staticRegret, p.banditRegret); }) || 100;
      var yScale = d3.scaleLinear().domain([0, maxY * 1.12]).range([ch, 0]);

      var gridG = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-cw).tickFormat(""));
      gridG.select(".domain").remove();
      gridG.selectAll(".tick line").attr("stroke", theme.grid).attr("stroke-dasharray", "2,2");

      var curveFn = config.curveInterpolation === "linear" ? d3.curveLinear : d3.curveMonotoneX;

      // Shaded Regret Saved Area between Static A/B and Bandit Regret
      var savedArea = d3.area()
        .x(function (p) { return xScale(p.periodKey); })
        .y0(function (p) { return yScale(p.banditRegret); })
        .y1(function (p) { return yScale(p.staticRegret); })
        .curve(curveFn);

      g.append("path")
        .datum(periods)
        .attr("d", savedArea)
        .attr("fill", theme.positive)
        .attr("fill-opacity", 0.16);

      var staticLine = d3.line().x(function (p) { return xScale(p.periodKey); }).y(function (p) { return yScale(p.staticRegret); }).curve(curveFn);
      var banditLine = d3.line().x(function (p) { return xScale(p.periodKey); }).y(function (p) { return yScale(p.banditRegret); }).curve(curveFn);

      g.append("path")
        .datum(periods)
        .attr("fill", "none")
        .attr("stroke", theme.negative)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4")
        .attr("d", staticLine);

      g.append("path")
        .datum(periods)
        .attr("fill", "none")
        .attr("stroke", theme.primary)
        .attr("stroke-width", 2.8)
        .attr("d", banditLine);

      // Endpoint Callouts
      var last = periods[periods.length - 1];
      if (last && (config.labelDensity || "peaks_only") !== "hidden") {
        var lx = xScale(last.periodKey);
        g.append("text")
          .attr("x", lx - 4).attr("y", yScale(last.staticRegret) - 7)
          .attr("text-anchor", "end")
          .attr("font-size", (10 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.negative)
          .text("Static A/B Regret: " + formatValue(last.staticRegret, valFmt, "currency"));

        g.append("text")
          .attr("x", lx - 4).attr("y", yScale(last.banditRegret) + 15)
          .attr("text-anchor", "end")
          .attr("font-size", (10 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.primary)
          .text("Bandit Regret: " + formatValue(last.banditRegret, valFmt, "currency"));

        var midY = (yScale(last.staticRegret) + yScale(last.banditRegret)) / 2;
        g.append("text")
          .attr("x", lx - 8).attr("y", midY)
          .attr("text-anchor", "end")
          .attr("font-size", (10.5 * fontMultiplier) + "px").attr("font-weight", "800").attr("fill", theme.positive)
          .text("Regret Saved: " + formatValue(last.regretSaved, valFmt, "currency"));
      }

      var tickVals = xDomain.filter(function (_, idx) {
        return idx === 0 || idx === xDomain.length - 1 || idx % Math.max(1, Math.ceil(xDomain.length / 7)) === 0;
      });
      var xAx = g.append("g").attr("transform", "translate(0," + ch + ")")
        .call(d3.axisBottom(xScale).tickValues(tickVals).tickFormat(function (d) { return "Day " + d; }));
      xAx.select(".domain").attr("stroke", theme.border);
      xAx.selectAll(".tick line").attr("stroke", theme.border);
      xAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      var yAx = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatValue(d, valFmt, "currency"); }));
      yAx.select(".domain").attr("stroke", theme.border);
      yAx.selectAll(".tick line").attr("stroke", theme.border);
      yAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      // Hover interaction
      g.append("rect").attr("width", cw).attr("height", ch).attr("fill", "transparent")
        .on("mousemove", function (event) {
          var mx = d3.pointer(event, this)[0];
          var best = periods[0];
          var bd = Infinity;
          periods.forEach(function (p) {
            var d = Math.abs(xScale(p.periodKey) - mx);
            if (d < bd) { bd = d; best = p; }
          });
          self._showTooltip(
            '<div style="font-weight:700;margin-bottom:4px;">Day ' + escapeHtml(best.periodKey) + ' \u2014 Cumulative Regret</div>' +
            '<div>Static 50/50 A/B Regret: <strong style="color:' + theme.negative + ';">' + escapeHtml(formatValue(best.staticRegret, valFmt, "currency")) + '</strong></div>' +
            '<div>Thompson Bandit Regret: <strong style="color:' + theme.primary + ';">' + escapeHtml(formatValue(best.banditRegret, valFmt, "currency")) + '</strong></div>' +
            '<div style="margin-top:4px;color:' + theme.positive + ';font-weight:700;">Regret Saved: ' + escapeHtml(formatValue(best.regretSaved, valFmt, "currency")) + '</div>',
            event, theme.positive, theme
          );
        })
        .on("mouseleave", function () { self._hideTooltip(); });
    },

    _renderPosteriorWinDensity: function (d3, wrap, w, h, armSummaries, armColorMap, targetVal, theme, config, valFmt, fontMultiplier) {
      var self = this;
      var leftW = Math.round(w * 0.60);
      var rightW = w - leftW;
      var svg = d3.select(wrap).append("svg").attr("width", w).attr("height", h).style("display", "block");

      // LEFT PANEL: Beta Posterior Density Bells
      var mL = { top: 28, right: 20, bottom: 38, left: 46 };
      var cwL = Math.max(140, leftW - mL.left - mL.right);
      var chL = Math.max(100, h - mL.top - mL.bottom);
      var gL = svg.append("g").attr("transform", "translate(" + mL.left + "," + mL.top + ")");

      var minX = d3.min(armSummaries, function (a) { return a.ciLow - (a.ciHigh - a.ciLow) * 0.8; }) || 0;
      var maxX = d3.max(armSummaries, function (a) { return a.ciHigh + (a.ciHigh - a.ciLow) * 0.8; }) || 10;
      minX = Math.max(0, minX);
      var xScaleL = d3.scaleLinear().domain([minX, maxX]).range([0, cwL]);

      var samples = 70;
      var step = (maxX - minX) / (samples - 1 || 1);
      var allCurves = armSummaries.map(function (a) {
        var mean = a.latestCvr;
        var std = Math.max(0.08, (a.ciHigh - a.ciLow) / 3.92);
        var pts = [];
        for (var i = 0; i < samples; i++) {
          var xv = minX + i * step;
          pts.push({ x: xv, y: gaussianPDF(xv, mean, std) });
        }
        return { arm: a, pts: pts };
      });
      var maxPDF = d3.max(allCurves, function (c) { return d3.max(c.pts, function (p) { return p.y; }); }) || 1;
      var yScaleL = d3.scaleLinear().domain([0, maxPDF * 1.15]).range([chL, 0]);

      gL.append("text").attr("x", 0).attr("y", -10)
        .attr("font-size", (11 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.text)
        .text("Posterior Conversion Rate Density (95% Beta Credible Intervals)");

      var areaL = d3.area().x(function (d) { return xScaleL(d.x); }).y0(chL).y1(function (d) { return yScaleL(d.y); }).curve(d3.curveCatmullRom);
      var lineL = d3.line().x(function (d) { return xScaleL(d.x); }).y(function (d) { return yScaleL(d.y); }).curve(d3.curveCatmullRom);

      allCurves.forEach(function (c) {
        var col = armColorMap[c.arm.armName];
        gL.append("path").datum(c.pts).attr("d", areaL).attr("fill", col).attr("fill-opacity", 0.20);
        gL.append("path").datum(c.pts).attr("d", lineL).attr("fill", "none").attr("stroke", col).attr("stroke-width", 2.2);
        var mx = xScaleL(c.arm.latestCvr);
        gL.append("line").attr("x1", mx).attr("x2", mx).attr("y1", yScaleL(gaussianPDF(c.arm.latestCvr, c.arm.latestCvr, Math.max(0.08, (c.arm.ciHigh - c.arm.ciLow) / 3.92)))).attr("y2", chL)
          .attr("stroke", col).attr("stroke-dasharray", "3,2").attr("stroke-width", 1.2);
      });

      var xAxL = gL.append("g").attr("transform", "translate(0," + chL + ")").call(d3.axisBottom(xScaleL).ticks(6).tickFormat(function (d) { return d.toFixed(1) + "%"; }));
      xAxL.select(".domain").attr("stroke", theme.border);
      xAxL.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      // RIGHT PANEL: P(Arm is Best) Win Probability Bars
      var mR = { top: 28, right: 32, bottom: 38, left: 135 };
      var cwR = Math.max(90, rightW - mR.left - mR.right);
      var chR = Math.max(100, h - mR.top - mR.bottom);
      var gR = svg.append("g").attr("transform", "translate(" + (leftW + mR.left) + "," + mR.top + ")");

      gR.append("text").attr("x", -mR.left + 8).attr("y", -10)
        .attr("font-size", (11 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.text)
        .text("P(Arm is Best) Win Probability");

      var yBand = d3.scaleBand().domain(armSummaries.map(function (a) { return a.armName; })).range([0, chR]).padding(0.32);
      var xScaleR = d3.scaleLinear().domain([0, 100]).range([0, cwR]);

      armSummaries.forEach(function (a) {
        var col = armColorMap[a.armName];
        var y = yBand(a.armName);
        var bh = yBand.bandwidth();
        var maxChars = 19;
        var lblTxt = a.armName.length > maxChars ? a.armName.slice(0, maxChars - 1) + "\u2026" : a.armName;

        gR.append("text").attr("x", -8).attr("y", y + bh / 2 + 4).attr("text-anchor", "end")
          .attr("font-size", (10 * fontMultiplier) + "px").attr("font-weight", "600").attr("fill", theme.text)
          .text(lblTxt).append("title").text(a.armName);

        gR.append("rect").attr("x", 0).attr("y", y).attr("width", cwR).attr("height", bh).attr("rx", 4).attr("fill", theme.grid).attr("opacity", 0.5);
        var bar = gR.append("rect").attr("x", 0).attr("y", y).attr("width", xScaleR(a.latestWinProb)).attr("height", bh).attr("rx", 4).attr("fill", col).style("cursor", "pointer");

        bar.on("mousemove", function (event) {
          self._showTooltip(
            '<strong>' + escapeHtml(a.armName) + '</strong><br/>P(Best): <strong>' + a.latestWinProb.toFixed(1) + '%</strong><br/>CVR: ' + a.latestCvr.toFixed(2) + '% [' + a.ciLow.toFixed(2) + '%\u2013' + a.ciHigh.toFixed(2) + '%]',
            event, col, theme
          );
        }).on("mouseleave", function () { self._hideTooltip(); });

        gR.append("text").attr("x", Math.min(cwR + 4, xScaleR(a.latestWinProb) + 5)).attr("y", y + bh / 2 + 4)
          .attr("font-size", (10 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.text)
          .text(a.latestWinProb.toFixed(1) + "%");
      });

      if (targetVal !== null && targetVal >= 0 && targetVal <= 100) {
        var tx = xScaleR(targetVal);
        gR.append("line").attr("x1", tx).attr("x2", tx).attr("y1", 0).attr("y2", chR)
          .attr("stroke", theme.positive).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
      }
    },

    _renderArmQuadrant: function (d3, wrap, w, h, armSummaries, armColorMap, theme, config, valFmt, fontMultiplier) {
      var self = this;
      var margin = { top: 28, right: 32, bottom: 42, left: 58 };
      var cw = Math.max(180, w - margin.left - margin.right);
      var ch = Math.max(120, h - margin.top - margin.bottom);

      var svg = d3.select(wrap).append("svg").attr("width", w).attr("height", h).style("display", "block");
      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxShare = Math.max(50, d3.max(armSummaries, function (a) { return a.latestShare; }) * 1.15);
      var minCvr = Math.max(0, (d3.min(armSummaries, function (a) { return a.ciLow; }) || 0) * 0.85);
      var maxCvr = (d3.max(armSummaries, function (a) { return a.ciHigh; }) || 10) * 1.12;

      var xScale = d3.scaleLinear().domain([0, maxShare]).range([0, cw]);
      var yScale = d3.scaleLinear().domain([minCvr, maxCvr]).range([ch, 0]);
      var rScale = d3.scaleSqrt().domain([0, d3.max(armSummaries, function (a) { return a.impressions; }) || 100]).range([7, 22]);

      var gridG = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-cw).tickFormat(""));
      gridG.select(".domain").remove();
      gridG.selectAll(".tick line").attr("stroke", theme.grid).attr("stroke-dasharray", "2,2");

      // Mean quadrant crosshairs
      var meanShare = d3.mean(armSummaries, function (a) { return a.latestShare; }) || 25;
      var meanCvr = d3.mean(armSummaries, function (a) { return a.latestCvr; }) || 5;
      g.append("line").attr("x1", xScale(meanShare)).attr("x2", xScale(meanShare)).attr("y1", 0).attr("y2", ch)
        .attr("stroke", theme.subtext).attr("stroke-dasharray", "4,4").attr("opacity", 0.55);
      g.append("line").attr("x1", 0).attr("x2", cw).attr("y1", yScale(meanCvr)).attr("y2", yScale(meanCvr))
        .attr("stroke", theme.subtext).attr("stroke-dasharray", "4,4").attr("opacity", 0.55);

      g.append("text").attr("x", cw - 6).attr("y", 14).attr("text-anchor", "end")
        .attr("font-size", (9.5 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.positive)
        .text("EXPLOIT WINNER (High Share & High CVR)");
      g.append("text").attr("x", 6).attr("y", ch - 8).attr("text-anchor", "start")
        .attr("font-size", (9.5 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.subtext)
        .text("PRUNED / EXPLORED (Low Share & Low CVR)");

      armSummaries.forEach(function (a) {
        var col = armColorMap[a.armName];
        var cx = xScale(a.latestShare);
        var cy = yScale(a.latestCvr);
        var rad = rScale(a.impressions);

        // 95% CI Error bar
        g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", yScale(a.ciLow)).attr("y2", yScale(a.ciHigh))
          .attr("stroke", col).attr("stroke-width", 2).attr("opacity", 0.7);

        var circ = g.append("circle")
          .attr("cx", cx).attr("cy", cy).attr("r", rad)
          .attr("fill", col).attr("fill-opacity", 0.75)
          .attr("stroke", theme.bg).attr("stroke-width", 1.8)
          .style("cursor", "pointer");

        circ.on("mousemove", function (event) {
          self._showTooltip(
            '<strong>' + escapeHtml(a.armName) + '</strong><br/>Traffic Share: <strong>' + a.latestShare.toFixed(1) + '%</strong><br/>CVR: <strong>' + a.latestCvr.toFixed(2) + '%</strong> [' + a.ciLow.toFixed(2) + '%\u2013' + a.ciHigh.toFixed(2) + '%]<br/>P(Best): <strong>' + a.latestWinProb.toFixed(1) + '%</strong><br/>Impressions: ' + a.impressions.toLocaleString(),
            event, col, theme
          );
        }).on("mouseleave", function () {
          self._hideTooltip();
        }).on("click", function (event) {
          if (a.links && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: a.links, event: event });
          }
        });

        if ((config.labelDensity || "peaks_only") !== "hidden") {
          g.append("text").attr("x", cx).attr("y", cy - rad - 5).attr("text-anchor", "middle")
            .attr("font-size", (9.5 * fontMultiplier) + "px").attr("font-weight", "700").attr("fill", theme.text)
            .text(a.armName + " (" + a.latestCvr.toFixed(2) + "%)");
        }
      });

      var xAx = g.append("g").attr("transform", "translate(0," + ch + ")").call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return d + "%"; }));
      xAx.select(".domain").attr("stroke", theme.border);
      xAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");

      var yAx = g.append("g").call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return d.toFixed(1) + "%"; }));
      yAx.select(".domain").attr("stroke", theme.border);
      yAx.selectAll("text").attr("fill", theme.subtext).attr("font-size", (10 * fontMultiplier) + "px");
    }
  });
})();
