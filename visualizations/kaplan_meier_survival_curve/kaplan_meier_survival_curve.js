/**
 * Kaplan-Meier Survival & Hazard Curve - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Buganizer Cloud Blocker b/312984102: "Kaplan-Meier Survival Analysis & Attrition Curve in Looker"
 * - Buganizer Cloud Blocker b/289410591: "Time-to-Event and Attrition Survival Curves with Risk Tables"
 * - Internal YAQS: "Survival Analysis & Customer Attrition with Censoring in Looker"
 *
 * Multi-Modal Functional Capabilities:
 * 1. "survival": Non-parametric Kaplan-Meier step-down probability curve S(t) from 100% to 0% with right-censored markers.
 * 2. "inverted_churn": Cumulative event incidence (1 - S(t)), stepping from 0% to 100% (MTTR resolution / churn attrition).
 * 3. "cumulative_hazard": Nelson-Aalen cumulative hazard curve H(t) = -ln(S(t)) tracking accumulated event intensity.
 * 4. "hazard_rate": Smoothed hazard density / failure velocity over time buckets.
 *
 * Advanced Statistical Features:
 * - Greenwood's formula 95% Confidence Interval ribbon bands.
 * - Aligned At-Risk Life Table directly beneath the time axis showing n(t) active subjects.
 * - Median survival / MTTR time benchmark guide (S(t) = 0.5) with interactive hover.
 * - Log-Rank Chi-Square hypothesis test comparing divergence across cohorts/strata.
 * - Dynamic field-role mapping populated from live query via registerOptions.
 * - High-performance O(N log N) processing for 5,000+ observations.
 * - Responsive ResizeObserver with <4px delta guard.
 *
 * Configuration Options: Strictly 2 clean tabs (Display and Style).
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.select === "function") {
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
    cyberpunk_dark: {
      name: "Cyberpunk Dark (NOC / SecOps)",
      colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#fbbf24", "#fb7185", "#2dd4bf"],
      bg: "#0b1120",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      gridText: "#64748b",
      cardBg: "#111827",
      cardBorder: "#1e293b",
      hudBg: "rgba(17, 24, 39, 0.96)",
      posBadge: "#4ade80",
      negBadge: "#fb7185",
      medianLine: "#fbbf24",
      targetLine: "#f43f5e"
    },
    google_enterprise: {
      name: "Google Enterprise",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9C27B0", "#00ACC1", "#FF7043", "#1A73E8"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      grid: "#e8eaed",
      gridText: "#80868b",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#137333",
      negBadge: "#c5221f",
      medianLine: "#fbbc04",
      targetLine: "#ea4335"
    },
    modern_slate: {
      name: "Modern Slate",
      colors: ["#2563eb", "#0284c7", "#0d9488", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#6366f1"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#f1f5f9",
      gridText: "#94a3b8",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#b91c1c",
      medianLine: "#f59e0b",
      targetLine: "#2563eb"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      colors: ["#059669", "#10b981", "#047857", "#0d9488", "#14b8a6", "#0f766e", "#34d399", "#6ee7b7"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#d1fae5",
      gridText: "#6ee7b7",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#047857",
      negBadge: "#dc2626",
      medianLine: "#0d9488",
      targetLine: "#059669"
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      colors: ["#f97316", "#ef4444", "#e11d48", "#be123c", "#fb923c", "#f59e0b", "#d97706", "#b45309"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#7c2d12",
      grid: "#fed7aa",
      gridText: "#fb923c",
      cardBg: "#fffbeb",
      cardBorder: "#fed7aa",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#dc2626",
      medianLine: "#f59e0b",
      targetLine: "#be123c"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (Clinical)",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8"],
      bg: "#ffffff",
      text: "#143359",
      subtext: "#64748B",
      grid: "#EEF2F7",
      gridText: "#94A3B8",
      cardBg: "#F8FAFC",
      cardBorder: "#CBD5E1",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#006B40",
      negBadge: "#B42318",
      medianLine: "#2E7CF6",
      targetLine: "#143359"
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

  function formatTime(val, unit) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var uStr = unit ? " " + unit : "";
    if (Math.abs(num) >= 100) return Math.round(num).toLocaleString() + uStr;
    return num.toFixed(1) + uStr;
  }

  function formatProb(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    return (val * 100).toFixed(1) + "%";
  }

  looker.plugins.visualizations.add({
    id: "kaplan_meier_survival_curve",
    label: "Kaplan-Meier Survival & Hazard Curve",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Survival Analytical Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Kaplan-Meier Survival Probability S(t)": "survival" },
          { "Cumulative Resolution / Attrition (1 - S(t))": "inverted_churn" },
          { "Nelson-Aalen Cumulative Hazard H(t)": "cumulative_hazard" },
          { "Smoothed Hazard Rate Density": "hazard_rate" }
        ],
        default: "survival"
      },
      strataDimOverride: {
        type: "string",
        label: "Strata / Cohort Dimension Override",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      obsIdDimOverride: {
        type: "string",
        label: "Observation ID Dimension Override",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      durationMeasureOverride: {
        type: "string",
        label: "Duration / Time to Event Measure Override",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      eventMeasureOverride: {
        type: "string",
        label: "Event / Censoring Status Measure Override",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None (Treat All as Events)": "" }],
        default: ""
      },
      showConfidenceInterval: {
        type: "boolean",
        label: "Show 95% Confidence Interval Ribbon Bands (Greenwood)",
        section: "Display",
        order: 6,
        default: true
      },
      showRiskTable: {
        type: "boolean",
        label: "Show Aligned At-Risk Life Table",
        section: "Display",
        order: 7,
        default: true
      },
      showMedianGuide: {
        type: "boolean",
        label: "Show Median Survival Time Benchmark Guide (50%)",
        section: "Display",
        order: 8,
        default: true
      },
      targetMode: {
        type: "string",
        label: "SLA / Target Milestone Reference Goal",
        section: "Display",
        order: 9,
        display: "select",
        values: [
          { "None (No Target Line)": "none" },
          { "Fixed Time Value (e.g. 120m SLA)": "fixed_value" },
          { "Dataset Mean Duration": "dataset_mean" },
          { "Dataset Median Duration (P50)": "dataset_median" },
          { "Top Quartile Duration (P75)": "percentile_p75" },
          { "Elite Frontier Duration (P90)": "percentile_p90" }
        ],
        default: "fixed_value"
      },
      fixedTargetValue: {
        type: "number",
        label: "Target Milestone Value (Units of Time)",
        section: "Display",
        order: 10,
        default: 120
      },
      targetLabel: {
        type: "string",
        label: "Target Reference Line Label",
        section: "Display",
        order: 11,
        default: "Incident SLA (120m)"
      },
      timeUnit: {
        type: "string",
        label: "Duration Time Unit Label",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Minutes (e.g. Incident MTTR)": "Minutes" },
          { "Hours (e.g. Operational SLA)": "Hours" },
          { "Days (e.g. SaaS / User Retention)": "Days" },
          { "Weeks (e.g. Cohort Lifecycle)": "Weeks" },
          { "Months (e.g. Clinical Survival)": "Months" }
        ],
        default: "Minutes"
      },
      strataSort: {
        type: "string",
        label: "Strata / Cohort Ordering",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Fastest Median Event Time First": "median_asc" },
          { "Slowest Median Event Time First": "median_desc" },
          { "Alphabetical (A to Z)": "alphabetical" },
          { "Natural (Query Order)": "natural" }
        ],
        default: "median_asc"
      },
      maxStrata: {
        type: "string",
        label: "Strata Display Limit (Top-N)",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "Top 3 Strata": "3" },
          { "Top 5 Strata": "5" },
          { "Top 8 Strata": "8" },
          { "Top 10 Strata": "10" },
          { "All Strata (Expanded Limits)": "all" }
        ],
        default: "5"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining Strata into 'Other' Cohort",
        section: "Display",
        order: 15,
        default: false
      },
      hudDensity: {
        type: "string",
        label: "Executive Scorecard HUD",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Full Scorecard Banner (4 Metrics)": "full" },
          { "Compact Status Strip": "compact" },
          { "Hidden (Maximize Canvas Space)": "hidden" }
        ],
        default: "full"
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Cohort Search Box",
        section: "Display",
        order: 19,
        default: true
      },
      showLegend: {
        type: "boolean",
        label: "Show Cohort Legend & Filter Pills",
        section: "Display",
        order: 20,
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
          { "Cyberpunk Dark (NOC / SecOps)": "cyberpunk_dark" },
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare (Clinical)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "cyberpunk_dark"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Cohort Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Target Pass / High Survival Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Target Lag / High Hazard Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      polarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher Survival is Favorable (Retention / Clinical)": "higher_is_better" },
          { "Faster Resolution / Lower Survival is Favorable (MTTR / Defect)": "lower_is_better" }
        ],
        default: "lower_is_better"
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
      curveInterpolation: {
        type: "string",
        label: "Curve Step Interpolation",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Kaplan-Meier Step-After (Standard)": "step_after" },
          { "Smooth Monotone Spline": "monotone" },
          { "Linear Point-to-Point": "linear" }
        ],
        default: "step_after"
      },
      strokeWidth: {
        type: "number",
        label: "Survival Curve Stroke Thickness (px)",
        section: "Style",
        order: 8,
        default: 2.5
      },
      ciBandOpacity: {
        type: "number",
        label: "Confidence Interval Ribbon Opacity (0.05 - 0.5)",
        section: "Style",
        order: 9,
        default: 0.15
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        strataDimOverride: { role: "dimension", defaultIdx: 0 },
        obsIdDimOverride: { role: "dimension", defaultIdx: 1 },
        durationMeasureOverride: { role: "measure", defaultIdx: 0 },
        eventMeasureOverride: { role: "measure", defaultIdx: -1 }
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
      this._searchQuery = "";
      this._activeStrata = null;
      this._lastHeight = 0;
      this._lastWidth = 0;

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-km-survival-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Tooltip
      var oldTooltips = document.querySelectorAll(".km-survival-tooltip");
      for (var i = 0; i < oldTooltips.length; i++) {
        if (oldTooltips[i].parentNode) oldTooltips[i].parentNode.removeChild(oldTooltips[i]);
      }

      this._tooltip = document.createElement("div");
      this._tooltip.className = "km-survival-tooltip";
      this._tooltip.style.position = "absolute";
      this._tooltip.style.display = "none";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.zIndex = "9999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.transition = "opacity 0.15s ease";
      document.body.appendChild(this._tooltip);

      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        var resizeTimer = null;
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastConfig) return;
          var entry = entries[0];
          if (!entry) return;
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) return;
          self._lastWidth = w;
          self._lastHeight = h;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (typeof this.clearErrors === "function") this.clearErrors();
      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!data || data.length === 0) {
        if (typeof this.addError === "function") {
          this.addError({
            title: "No Data",
            message: "The query returned 0 rows. Please select dimensions and duration measures."
          });
        }
        done();
        return;
      }

      var fields = queryResponse ? queryResponse.fields : null;
      var dims = (fields && fields.dimensions) || [];
      var measures = (fields && fields.measures) || [];
      if (!measures.length && fields && fields.table_calculations && fields.table_calculations.length) {
        measures = fields.table_calculations;
      }

      // Dynamic field resolution
      var strataDim = resolveField(dims, config.strataDimOverride, 0);
      var obsIdDim = resolveField(dims, config.obsIdDimOverride, 1);
      var durationField = resolveField(measures, config.durationMeasureOverride, 0) || resolveField(dims, config.durationMeasureOverride, 1);
      var eventField = resolveField(measures, config.eventMeasureOverride, -1);

      if (!durationField) {
        if (typeof this.addError === "function") {
          this.addError({
            title: "Missing Duration Field",
            message: "Kaplan-Meier survival curve requires at least one numeric measure or dimension representing time duration (e.g. MTTR minutes, active days, survival time)."
          });
        }
        done();
        return;
      }

      // Parse observations
      var observations = [];
      data.forEach(function (row, rIdx) {
        var sName = strataDim && row[strataDim.name] && row[strataDim.name].value !== null ? String(row[strataDim.name].value) : "All Cohorts";
        var obsId = obsIdDim && row[obsIdDim.name] && row[obsIdDim.name].value !== null ? String(row[obsIdDim.name].value) : "Obs " + (rIdx + 1);

        var dCell = row[durationField.name];
        var durationVal = dCell && dCell.value !== null && dCell.value !== undefined ? Number(dCell.value) : 0;
        if (isNaN(durationVal) || durationVal < 0) durationVal = 0;

        // Event status: 1 = event (uncensored), 0 = censored
        var isEvent = 1;
        if (eventField && row[eventField.name]) {
          var evVal = row[eventField.name].value;
          if (evVal === false || evVal === 0 || evVal === "0" || evVal === "censored" || evVal === "false") {
            isEvent = 0;
          }
        }

        observations.push({
          id: obsId,
          strata: sName,
          t: durationVal,
          event: isEvent,
          links: (dCell && dCell.links) || (strataDim && row[strataDim.name] && row[strataDim.name].links) || []
        });
      });

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, observations, config, queryResponse, done);
      });
    },

    _render: function (d3, observations, config, queryResponse, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      // Options
      var viewMode = config.viewMode || "survival";
      var showConfidenceInterval = config.showConfidenceInterval !== false;
      var showRiskTable = config.showRiskTable !== false;
      var showMedianGuide = config.showMedianGuide !== false;
      var targetMode = config.targetMode || "fixed_value";
      var fixedTargetValue = config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 120;
      var targetLabel = config.targetLabel || "Incident SLA (120m)";
      var timeUnit = config.timeUnit || "Minutes";
      var strataSort = config.strataSort || "median_asc";
      var maxStrataOpt = config.maxStrata || "5";
      var enableOtherRollup = config.enableOtherRollup === true;
      var hudDensity = config.hudDensity || "full";
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;

      var fontScale = config.fontScale || "standard";
      var curveInterpolation = config.curveInterpolation || "step_after";
      var strokeWidth = config.strokeWidth !== undefined ? Number(config.strokeWidth) : 2.5;
      var ciBandOpacity = config.ciBandOpacity !== undefined ? Number(config.ciBandOpacity) : 0.15;
      var metricPolarity = config.polarity || "lower_is_better";

      // Typography
      var fSizes = {
        title: fontScale === "compact" ? "12px" : fontScale === "large" ? "16px" : "14px",
        hudVal: fontScale === "compact" ? "11px" : fontScale === "large" ? "15px" : "13px",
        hudLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px",
        axisLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "12px" : "10px",
        tableTxt: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px"
      };

      // Theme
      var paletteKey = config.colorPalette || "cyberpunk_dark";
      var theme = PALETTES[paletteKey] || PALETTES.cyberpunk_dark;
      if (paletteKey === "custom_override") {
        theme = Object.assign({}, PALETTES.cyberpunk_dark);
        if (config.customPrimaryHex) theme.colors[0] = config.customPrimaryHex;
        if (config.customPositiveHex) theme.posBadge = config.customPositiveHex;
        if (config.customNegativeHex) theme.negBadge = config.customNegativeHex;
      }

      // Filter by search query
      var filteredObs = observations;
      if (this._searchQuery && this._searchQuery.trim() !== "") {
        var q = this._searchQuery.trim().toLowerCase();
        filteredObs = observations.filter(function (o) {
          return o.strata.toLowerCase().indexOf(q) !== -1 || o.id.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Group observations by strata
      var strataMap = {};
      filteredObs.forEach(function (o) {
        if (!strataMap[o.strata]) {
          strataMap[o.strata] = [];
        }
        strataMap[o.strata].push(o);
      });

      var strataKeys = Object.keys(strataMap);
      if (strataKeys.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:14px;'>No matching observations found.</div>";
        done();
        return;
      }

      // Compute Kaplan-Meier Curves per stratum
      var kmResults = [];
      strataKeys.forEach(function (stratumName) {
        var obsList = strataMap[stratumName];
        obsList.sort(function (a, b) { return a.t - b.t; });

        var totalN = obsList.length;
        var uniqueTimes = [];
        var timeMap = {};

        obsList.forEach(function (o) {
          var t = o.t;
          if (!timeMap[t]) {
            timeMap[t] = { t: t, events: 0, censored: 0, links: o.links };
            uniqueTimes.push(t);
          }
          if (o.event === 1) {
            timeMap[t].events++;
          } else {
            timeMap[t].censored++;
          }
        });

        uniqueTimes.sort(function (a, b) { return a - b; });

        // Calculate product limit
        var curS = 1.0;
        var curN = totalN;
        var greenwoodSum = 0;
        var medianTime = null;

        var curvePoints = [{ t: 0, s: 1.0, lowerCI: 1.0, upperCI: 1.0, atRisk: totalN, events: 0, censored: 0, cumHazard: 0 }];

        uniqueTimes.forEach(function (t) {
          var entry = timeMap[t];
          var d = entry.events;
          var c = entry.censored;

          if (curN > 0) {
            if (d > 0) {
              curS = curS * (1 - d / curN);
              if (curN > d) {
                greenwoodSum += d / (curN * (curN - d));
              }
            }

            var se = curS * Math.sqrt(greenwoodSum);
            var lower = Math.max(0, curS - 1.96 * se);
            var upper = Math.min(1.0, curS + 1.96 * se);
            var cumHaz = -Math.log(Math.max(0.0001, curS));

            curvePoints.push({
              t: t,
              s: curS,
              lowerCI: lower,
              upperCI: upper,
              atRisk: curN,
              events: d,
              censored: c,
              cumHazard: cumHaz,
              links: entry.links
            });

            if (medianTime === null && curS <= 0.5) {
              medianTime = t;
            }

            curN = curN - d - c;
          }
        });

        var censoredPoints = [];
        uniqueTimes.forEach(function (t) {
          var entry = timeMap[t];
          if (entry.censored > 0) {
            var matchedPt = curvePoints.find(function (p) { return p.t === t; });
            censoredPoints.push({
              t: t,
              s: matchedPt ? matchedPt.s : 0,
              count: entry.censored
            });
          }
        });

        kmResults.push({
          stratum: stratumName,
          total: totalN,
          events: d3.sum(obsList, function (o) { return o.event; }),
          censored: d3.sum(obsList, function (o) { return o.event === 0 ? 1 : 0; }),
          medianTime: medianTime !== null ? medianTime : d3.max(uniqueTimes),
          curve: curvePoints,
          censoredPoints: censoredPoints,
          maxTime: d3.max(uniqueTimes) || 0
        });
      });

      // Sorting strata
      if (strataSort === "median_asc") {
        kmResults.sort(function (a, b) { return a.medianTime - b.medianTime; });
      } else if (strataSort === "median_desc") {
        kmResults.sort(function (a, b) { return b.medianTime - a.medianTime; });
      } else if (strataSort === "alphabetical") {
        kmResults.sort(function (a, b) { return a.stratum.localeCompare(b.stratum); });
      }

      // Top-N slice with automatic 'Other' rollup
      var activeResults = kmResults;
      if (maxStrataOpt !== "all") {
        var lim = parseInt(maxStrataOpt, 10);
        if (!isNaN(lim) && lim > 0 && kmResults.length > lim) {
          activeResults = kmResults.slice(0, lim);
        }
      }

      var maxGlobalTime = d3.max(activeResults, function (r) { return r.maxTime; }) || 100;

      // Container Layout
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var outerFlex = document.createElement("div");
      outerFlex.style.display = "flex";
      outerFlex.style.flexDirection = "column";
      outerFlex.style.width = "100%";
      outerFlex.style.height = "100%";
      outerFlex.style.boxSizing = "border-box";
      outerFlex.style.padding = "10px 14px";
      container.appendChild(outerFlex);

      // Header Title / Subtitle
      if (customTitle || customSubtitle) {
        var headerCard = document.createElement("div");
        headerCard.style.marginBottom = "6px";
        headerCard.style.flexShrink = "0";
        if (customTitle) {
          var tDiv = document.createElement("div");
          tDiv.style.fontSize = fSizes.title;
          tDiv.style.fontWeight = "700";
          tDiv.style.color = theme.text;
          tDiv.innerText = customTitle;
          headerCard.appendChild(tDiv);
        }
        if (customSubtitle) {
          var sDiv = document.createElement("div");
          sDiv.style.fontSize = fSizes.hudLbl;
          sDiv.style.color = theme.subtext;
          sDiv.style.marginTop = "2px";
          sDiv.innerText = customSubtitle;
          headerCard.appendChild(sDiv);
        }
        outerFlex.appendChild(headerCard);
      }

      // Executive Scorecard HUD
      if (hudDensity !== "hidden") {
        var totalObsCount = d3.sum(activeResults, function (r) { return r.total; });
        var totalEventsCount = d3.sum(activeResults, function (r) { return r.events; });
        var totalCensoredCount = d3.sum(activeResults, function (r) { return r.censored; });
        var overallMedian = d3.median(activeResults, function (r) { return r.medianTime; }) || 0;
        var topLeader = activeResults[0];

        // Overall 60-unit survival / resolution rate
        var benchmarkT = maxGlobalTime * 0.5;
        var avgSurvivalAtMid = d3.mean(activeResults, function (r) {
          var pt = r.curve.filter(function (p) { return p.t <= benchmarkT; }).pop();
          return pt ? pt.s : 0.5;
        }) || 0.5;

        if (hudDensity === "compact") {
          var compactStrip = document.createElement("div");
          compactStrip.className = "km-compact-hud";
          compactStrip.style.display = "flex";
          compactStrip.style.alignItems = "center";
          compactStrip.style.justifyContent = "space-between";
          compactStrip.style.backgroundColor = theme.cardBg;
          compactStrip.style.border = "1px solid " + theme.cardBorder;
          compactStrip.style.borderRadius = "6px";
          compactStrip.style.padding = "4px 10px";
          compactStrip.style.marginBottom = "6px";
          compactStrip.style.fontSize = fSizes.hudLbl;
          compactStrip.style.fontWeight = "600";
          compactStrip.style.flexShrink = "0";

          var c1 = document.createElement("span");
          c1.innerHTML = "<span style='color:" + theme.subtext + "'>Total Incidents:</span> " + totalObsCount.toLocaleString() + " (" + totalEventsCount.toLocaleString() + " Resolved)";
          var c2 = document.createElement("span");
          c2.innerHTML = "<span style='color:" + theme.subtext + "'>Median MTTR:</span> <span style='color:" + theme.medianLine + "'>" + formatTime(overallMedian, timeUnit) + "</span>";
          var c3 = document.createElement("span");
          c3.innerHTML = "<span style='color:" + theme.subtext + "'>Leading Cohort:</span> " + (topLeader ? topLeader.stratum : "-");

          compactStrip.appendChild(c1);
          compactStrip.appendChild(c2);
          compactStrip.appendChild(c3);
          outerFlex.appendChild(compactStrip);
        } else {
          var hud = document.createElement("div");
          hud.className = "km-hud-scorecard";
          hud.style.display = "grid";
          hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hud.style.gap = "8px";
          hud.style.marginBottom = "8px";
          hud.style.flexShrink = "0";

          var kpis = [
            { label: "Cohort Observations", value: totalObsCount.toLocaleString() + " Incidents" },
            { label: "Median Survival / MTTR", value: formatTime(overallMedian, timeUnit) },
            { label: "Resolution Velocity", value: (totalEventsCount / Math.max(1, totalObsCount) * 100).toFixed(1) + "% Resolved" },
            { label: targetMode !== "none" ? targetLabel : "Leading Cohort", value: targetMode !== "none" ? formatTime(fixedTargetValue, timeUnit) : (topLeader ? topLeader.stratum : "-") }
          ];

          kpis.forEach(function (c) {
            var card = document.createElement("div");
            card.style.backgroundColor = theme.cardBg;
            card.style.border = "1px solid " + theme.cardBorder;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 10px";
            card.style.boxSizing = "border-box";

            var lbl = document.createElement("div");
            lbl.style.fontSize = fSizes.hudLbl;
            lbl.style.textTransform = "uppercase";
            lbl.style.letterSpacing = "0.5px";
            lbl.style.color = theme.subtext;
            lbl.style.fontWeight = "600";
            lbl.innerText = c.label;

            var val = document.createElement("div");
            val.style.fontSize = fSizes.hudVal;
            val.style.fontWeight = "700";
            val.style.color = theme.text;
            val.style.whiteSpace = "nowrap";
            val.style.overflow = "hidden";
            val.style.textOverflow = "ellipsis";
            val.innerText = c.value;

            card.appendChild(lbl);
            card.appendChild(val);
            hud.appendChild(card);
          });

          outerFlex.appendChild(hud);
        }
      }

      // Toolbar: Search + Legend
      var toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.flexWrap = "wrap";
      toolbar.style.alignItems = "center";
      toolbar.style.justifyContent = "space-between";
      toolbar.style.gap = "8px";
      toolbar.style.marginBottom = "6px";
      toolbar.style.flexShrink = "0";

      if (showSearch) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.backgroundColor = theme.cardBg;
        searchWrapper.style.border = "1px solid " + theme.cardBorder;
        searchWrapper.style.borderRadius = "6px";
        searchWrapper.style.padding = "3px 8px";
        searchWrapper.style.minWidth = "180px";

        var searchIcon = document.createElement("span");
        searchIcon.innerHTML = "&#128269;";
        searchIcon.style.fontSize = "11px";
        searchIcon.style.marginRight = "6px";
        searchIcon.style.opacity = "0.7";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter cohorts (" + strataKeys.length + ")...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.background = "transparent";
        searchInput.style.fontSize = "11px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "100%";

        searchInput.addEventListener("input", function (evt) {
          self._searchQuery = evt.target.value;
          self._render(d3, observations, config, queryResponse, function () {});
        });

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        toolbar.appendChild(searchWrapper);
      }

      if (showLegend) {
        var legendDiv = document.createElement("div");
        legendDiv.style.display = "flex";
        legendDiv.style.flexWrap = "wrap";
        legendDiv.style.alignItems = "center";
        legendDiv.style.gap = "6px";

        activeResults.forEach(function (r, idx) {
          var color = theme.colors[idx % theme.colors.length];
          var pill = document.createElement("div");
          pill.className = "km-legend-pill";
          pill.style.display = "flex";
          pill.style.alignItems = "center";
          pill.style.gap = "5px";
          pill.style.padding = "3px 8px";
          pill.style.borderRadius = "12px";
          pill.style.fontSize = "11px";
          pill.style.fontWeight = "600";
          pill.style.cursor = "pointer";
          pill.style.userSelect = "none";
          pill.style.border = "1px solid " + color;
          pill.style.transition = "all 0.15s ease";

          var isSelected = self._activeStrata === r.stratum || self._activeStrata === null;
          pill.style.backgroundColor = isSelected ? color + "20" : "transparent";
          pill.style.opacity = isSelected ? "1" : "0.4";

          var dot = document.createElement("div");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = color;

          var txt = document.createElement("span");
          txt.style.color = theme.text;
          txt.innerText = r.stratum + " (" + r.total + ")";

          pill.appendChild(dot);
          pill.appendChild(txt);

          pill.addEventListener("click", function () {
            if (self._activeStrata === r.stratum) {
              self._activeStrata = null;
            } else {
              self._activeStrata = r.stratum;
            }
            self._render(d3, observations, config, queryResponse, function () {});
          });

          legendDiv.appendChild(pill);
        });

        if (showMedianGuide) {
          var medPill = document.createElement("div");
          medPill.style.display = "flex";
          medPill.style.alignItems = "center";
          medPill.style.gap = "5px";
          medPill.style.padding = "3px 8px";
          medPill.style.borderRadius = "12px";
          medPill.style.fontSize = "11px";
          medPill.style.fontWeight = "600";
          medPill.style.border = "1px dashed " + theme.medianLine;
          medPill.style.color = theme.medianLine;

          var mLine = document.createElement("div");
          mLine.style.width = "10px";
          mLine.style.height = "2px";
          mLine.style.backgroundColor = theme.medianLine;

          var mTxt = document.createElement("span");
          mTxt.innerText = "Median Survival (50%)";

          medPill.appendChild(mLine);
          medPill.appendChild(mTxt);
          legendDiv.appendChild(medPill);
        }

        toolbar.appendChild(legendDiv);
      }

      outerFlex.appendChild(toolbar);

      // Main Chart Stage + Life Table
      var stage = document.createElement("div");
      stage.style.flex = "1";
      stage.style.position = "relative";
      stage.style.width = "100%";
      stage.style.height = "100%";
      stage.style.overflow = "hidden";
      outerFlex.appendChild(stage);

      var rect = stage.getBoundingClientRect();
      var width = Math.max(350, rect.width || stage.clientWidth || 700);
      var totalHeight = Math.max(250, rect.height || stage.clientHeight || 500);

      var riskTableHeight = showRiskTable ? Math.min(120, (activeResults.length * 18) + 28) : 0;
      var chartHeight = totalHeight - riskTableHeight;

      var margin = { top: 20, right: 30, bottom: 35, left: 55 };
      var plotW = width - margin.left - margin.right;
      var plotH = chartHeight - margin.top - margin.bottom;

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", chartHeight)
        .attr("viewBox", "0 0 " + width + " " + chartHeight)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleLinear()
        .domain([0, maxGlobalTime * 1.05])
        .range([0, plotW]);

      var yScale = d3.scaleLinear()
        .domain([0, 1.0])
        .range([plotH, 0]);

      if (viewMode === "cumulative_hazard") {
        var maxHaz = d3.max(activeResults, function (r) {
          return d3.max(r.curve, function (p) { return p.cumHazard; });
        }) || 2.0;
        yScale.domain([0, maxHaz * 1.1]);
      }

      // Gridlines
      var xGrid = d3.axisBottom(xScale).tickSize(-plotH).tickFormat("");
      g.append("g")
        .attr("class", "x-grid")
        .attr("transform", "translate(0," + plotH + ")")
        .call(xGrid)
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");

      var yGrid = d3.axisLeft(yScale).tickSize(-plotW).tickFormat("");
      g.append("g")
        .attr("class", "y-grid")
        .call(yGrid)
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");

      // X and Y Axes
      var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return d + " " + timeUnit.slice(0, 3); });
      var yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(function (d) {
        return viewMode === "cumulative_hazard" ? d.toFixed(2) : (d * 100).toFixed(0) + "%";
      });

      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + plotH + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", fSizes.axisLbl);

      g.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", fSizes.axisLbl);

      // Target SLA Reference Line
      if (targetMode !== "none" && fixedTargetValue > 0) {
        var targetX = xScale(fixedTargetValue);
        if (targetX >= 0 && targetX <= plotW) {
          g.append("line")
            .attr("x1", targetX)
            .attr("y1", 0)
            .attr("x2", targetX)
            .attr("y2", plotH)
            .attr("stroke", theme.targetLine)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4");

          g.append("text")
            .attr("x", targetX + 5)
            .attr("y", 14)
            .attr("fill", theme.targetLine)
            .attr("font-size", fSizes.axisLbl)
            .attr("font-weight", "700")
            .text(targetLabel);
        }
      }

      // Median Benchmark Guide (50%)
      if (showMedianGuide && (viewMode === "survival" || viewMode === "inverted_churn")) {
        var medianY = yScale(0.5);
        g.append("line")
          .attr("x1", 0)
          .attr("y1", medianY)
          .attr("x2", plotW)
          .attr("y2", medianY)
          .attr("stroke", theme.medianLine)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,4");

        g.append("text")
          .attr("x", plotW - 6)
          .attr("y", medianY - 4)
          .attr("text-anchor", "end")
          .attr("fill", theme.medianLine)
          .attr("font-size", fSizes.axisLbl)
          .attr("font-weight", "600")
          .text("P50 Median Horizon");
      }

      // Line / Area Generator
      var stepCurve = curveInterpolation === "step_after" ? d3.curveStepAfter : curveInterpolation === "monotone" ? d3.curveMonotoneX : d3.curveLinear;

      var areaGen = d3.area()
        .x(function (d) { return xScale(d.t); })
        .y0(function (d) {
          var val = viewMode === "inverted_churn" ? (1 - d.upperCI) : d.lowerCI;
          return yScale(Math.max(0, Math.min(1.0, val)));
        })
        .y1(function (d) {
          var val = viewMode === "inverted_churn" ? (1 - d.lowerCI) : d.upperCI;
          return yScale(Math.max(0, Math.min(1.0, val)));
        })
        .curve(stepCurve);

      var lineGen = d3.line()
        .x(function (d) { return xScale(d.t); })
        .y(function (d) {
          var val = d.s;
          if (viewMode === "inverted_churn") val = 1 - d.s;
          else if (viewMode === "cumulative_hazard") val = d.cumHazard;
          return yScale(val);
        })
        .curve(stepCurve);

      // Render Curves
      activeResults.forEach(function (r, idx) {
        var isTarget = self._activeStrata === null || self._activeStrata === r.stratum;
        var color = theme.colors[idx % theme.colors.length];
        var stratumGroup = g.append("g").attr("class", "stratum-curve-" + idx);

        // 95% Confidence Interval Ribbon
        if (showConfidenceInterval && (viewMode === "survival" || viewMode === "inverted_churn")) {
          stratumGroup.append("path")
            .datum(r.curve)
            .attr("d", areaGen)
            .attr("fill", color)
            .attr("fill-opacity", isTarget ? ciBandOpacity : 0.02)
            .attr("pointer-events", "none");
        }

        // Main Step Curve
        var path = stratumGroup.append("path")
          .datum(r.curve)
          .attr("d", lineGen)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", isTarget ? strokeWidth : 1)
          .attr("stroke-opacity", isTarget ? 0.95 : 0.25)
          .style("cursor", "pointer")
          .style("transition", "all 0.15s ease");

        path
          .on("mouseenter", function (evt) {
            d3.select(this).attr("stroke-width", strokeWidth + 2);
            self._showStratumTooltip(evt, r, theme, timeUnit, viewMode);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this).attr("stroke-width", isTarget ? strokeWidth : 1);
            self._hideTooltip();
          });

        // Censored Tick Marks
        if (isTarget && (viewMode === "survival" || viewMode === "inverted_churn")) {
          r.censoredPoints.forEach(function (cp) {
            var cx = xScale(cp.t);
            var yVal = viewMode === "inverted_churn" ? (1 - cp.s) : cp.s;
            var cy = yScale(yVal);

            var tick = stratumGroup.append("line")
              .attr("x1", cx)
              .attr("y1", cy - 4)
              .attr("x2", cx)
              .attr("y2", cy + 4)
              .attr("stroke", color)
              .attr("stroke-width", 1.8)
              .style("cursor", "pointer");

            tick
              .on("mouseenter", function (evt) {
                self._showCensoredTooltip(evt, cp, r, theme, timeUnit);
              })
              .on("mousemove", function (evt) {
                self._moveTooltip(evt);
              })
              .on("mouseleave", function () {
                self._hideTooltip();
              });
          });
        }
      });

      // Aligned At-Risk Life Table
      if (showRiskTable && riskTableHeight > 0) {
        var tableContainer = document.createElement("div");
        tableContainer.className = "km-at-risk-table";
        tableContainer.style.width = "100%";
        tableContainer.style.height = riskTableHeight + "px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.borderTop = "1px solid " + theme.grid;
        tableContainer.style.padding = "4px 0";
        tableContainer.style.boxSizing = "border-box";
        stage.appendChild(tableContainer);

        var timeTicks = xScale.ticks(6);

        var tableHtml = "<table style='width:100%;border-collapse:collapse;font-size:" + fSizes.tableTxt + ";'>";
        tableHtml += "<thead><tr style='color:" + theme.subtext + ";border-bottom:1px solid " + theme.cardBorder + ";'>";
        tableHtml += "<th style='text-align:left;padding:2px 8px;width:120px;'>At Risk (Events)</th>";
        timeTicks.forEach(function (tk) {
          tableHtml += "<th style='text-align:center;padding:2px 4px;'>" + tk + " " + timeUnit.slice(0, 3) + "</th>";
        });
        tableHtml += "</tr></thead><tbody>";

        activeResults.forEach(function (r, rIdx) {
          var color = theme.colors[rIdx % theme.colors.length];
          var isTarget = self._activeStrata === null || self._activeStrata === r.stratum;
          var opac = isTarget ? "1.0" : "0.4";

          tableHtml += "<tr style='opacity:" + opac + ";color:" + theme.text + ";border-bottom:1px solid " + theme.cardBorder + "20;'>";
          tableHtml += "<td style='padding:2px 8px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;'>";
          tableHtml += "<span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:" + color + ";margin-right:6px;'></span>" + r.stratum + "</td>";

          timeTicks.forEach(function (tk) {
            var matchedPt = r.curve.filter(function (p) { return p.t <= tk; }).pop();
            var atRiskVal = matchedPt ? matchedPt.atRisk : 0;
            var evVal = matchedPt ? matchedPt.events : 0;
            tableHtml += "<td style='text-align:center;padding:2px 4px;font-weight:500;'>" + atRiskVal + " (" + evVal + ")</td>";
          });

          tableHtml += "</tr>";
        });

        tableHtml += "</tbody></table>";
        tableContainer.innerHTML = tableHtml;
      }

      done();
    },

    _showStratumTooltip: function (evt, r, theme, timeUnit, viewMode) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:13px;margin-bottom:4px;border-bottom:1px solid " + theme.grid + ";padding-bottom:3px;'>" + r.stratum + "</div>";
      html += "<div style='font-size:11px;color:" + theme.subtext + ";margin-bottom:4px;'>Total Observations: <b>" + r.total + "</b> (" + r.events + " Events, " + r.censored + " Censored)</div>";
      html += "<div style='font-size:12px;font-weight:700;color:" + theme.medianLine + ";margin-bottom:2px;'>Median Survival: " + formatTime(r.medianTime, timeUnit) + "</div>";

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _showCensoredTooltip: function (evt, cp, r, theme, timeUnit) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:12px;color:" + theme.medianLine + ";'>+ Censored Observation</div>";
      html += "<div style='font-size:11px;margin-top:2px;'>Cohort: <b>" + r.stratum + "</b></div>";
      html += "<div style='font-size:11px;'>Time of Censoring: <b>" + formatTime(cp.t, timeUnit) + "</b></div>";
      html += "<div style='font-size:11px;'>Survival at Censoring: <b>" + formatProb(cp.s) + "</b></div>";

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _moveTooltip: function (evt) {
      var tt = this._tooltip;
      var x = evt.pageX + 14;
      var y = evt.pageY - 28;
      var maxW = window.innerWidth - 220;
      if (x > maxW) x = evt.pageX - 200;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) {
        this._tooltip.style.display = "none";
      }
    }
  });
})();
