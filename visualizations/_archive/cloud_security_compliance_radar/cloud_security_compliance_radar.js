/**
 * Cloud Security Posture & Framework Compliance Radar - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Directly solves Buganizer Cloud Blockers & SecOps Customer Requirements (b/489102941, b/394109283, b/520194821):
 * - Native Looker radar/spider charts lack multi-series benchmark overlays, polar area coxcomb distributions,
 *   concentric severity tier rings, and drill-through on individual risk axes.
 *
 * 4 Multi-Modal Layout Modes:
 *   1. "multiaxis_radar": Multi-Framework Compliance Radar & Target Benchmark Ring
 *      (Radar polygon plotting posture compliance score across CIS, NIST, ISO 27001, SOC 2, PCI-DSS,
 *       with configurable benchmark target ring, severity alert pins, and shaded polygon area).
 *   2. "polar_rose_coxcomb": Florence Nightingale / Polar Area Coxcomb
 *      (Angular width = framework finding volume, radial distance = open finding count, colored by severity).
 *   3. "severity_stacked_radial": Radial Stacked Severity Rings
 *      (Concentric circular tracks with segmented arcs for Critical, High, Medium, Low severity findings per framework).
 *   4. "framework_audit_grid": Executive Compliance Audit Scorecard
 *      (High-density security scorecard cards per framework showing overall compliance status [PASS/AT-RISK/FAIL],
 *       posture progress gauge bar, critical finding count, and days open).
 *
 * - Strict 2-Tab Options Schema: "Display" and "Style" to avoid crowded Looker edit modal headers.
 * - Dynamic Field-Role Mapping: Dynamic dropdowns for Framework Dim, Severity Dim, Open Findings, Critical/High, and Posture Score.
 * - 5,000+ Row Scalability: Single-pass O(N) client-side aggregation.
 * - Debounced ResizeObserver (<4px delta guard) and container hygiene (no width/height 100% on element).
 * - Looker Drill Menu Integration via LookerCharts.Utils.openDrillMenu.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.arc === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.arc === "function") {
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
      name: "Google Enterprise Blue (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      accent: "#1a73e8",
      radarArea: "rgba(26, 115, 232, 0.25)",
      radarStroke: "#1a73e8",
      targetRing: "#ea4335",
      gridLines: "#e2e8f0",
      critical: "#ea4335",
      high: "#f97316",
      medium: "#fbbc04",
      low: "#34a853",
      passColor: "#34a853",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Executive Slate (Indigo & Charcoal)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#cbd5e1",
      text: "#1e293b",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#94a3b8",
      hudText: "#1e293b",
      hudSubtext: "#64748b",
      accent: "#4f46e5",
      radarArea: "rgba(79, 70, 229, 0.25)",
      radarStroke: "#4f46e5",
      targetRing: "#dc2626",
      gridLines: "#e2e8f0",
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#d97706",
      low: "#059669",
      passColor: "#059669",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#4f46e5"
    },
    cyber_secops: {
      name: "Cyber SecOps (Dark Mode)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.90)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      accent: "#38bdf8",
      radarArea: "rgba(56, 189, 248, 0.28)",
      radarStroke: "#38bdf8",
      targetRing: "#f43f5e",
      gridLines: "#334155",
      critical: "#f43f5e",
      high: "#fb923c",
      medium: "#fbbf24",
      low: "#10b981",
      passColor: "#10b981",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8"
    },
    emerald_finops: {
      name: "Emerald Security & Governance (Light Mode)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      accent: "#059669",
      radarArea: "rgba(5, 150, 105, 0.25)",
      radarStroke: "#059669",
      targetRing: "#dc2626",
      gridLines: "#dcfce7",
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#d97706",
      low: "#059669",
      passColor: "#059669",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
      name: "Sunset Threat Monitor (Warm Slate)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fef3c7",
      text: "#78350f",
      subtext: "#b45309",
      hudBg: "rgba(255, 251, 235, 0.95)",
      hudBorder: "#fde68a",
      hudText: "#78350f",
      hudSubtext: "#b45309",
      accent: "#d97706",
      radarArea: "rgba(217, 119, 6, 0.25)",
      radarStroke: "#d97706",
      targetRing: "#dc2626",
      gridLines: "#fef3c7",
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#d97706",
      low: "#16a34a",
      passColor: "#16a34a",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    },
    wellverse: {
      name: "Wellverse Healthcare Compliance (Teal & Coral)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#99f6e4",
      hudText: "#134e4a",
      hudSubtext: "#0f766e",
      accent: "#0d9488",
      radarArea: "rgba(13, 148, 136, 0.25)",
      radarStroke: "#0d9488",
      targetRing: "#e11d48",
      gridLines: "#ccfbf1",
      critical: "#e11d48",
      high: "#ea580c",
      medium: "#d97706",
      low: "#0d9488",
      passColor: "#0d9488",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0d9488"
    },
    custom: {
      name: "Custom Hex Accent",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      accent: "#1a73e8",
      radarArea: "rgba(26, 115, 232, 0.25)",
      radarStroke: "#1a73e8",
      targetRing: "#ea4335",
      gridLines: "#e2e8f0",
      critical: "#ea4335",
      high: "#f97316",
      medium: "#fbbc04",
      low: "#34a853",
      passColor: "#34a853",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    }
  };

  function formatValue(num, fmt) {
    if (num === null || num === undefined || isNaN(num)) return "-";
    num = Number(num);
    if (fmt === "percent") {
      var pct = num <= 1 ? num * 100 : num;
      return pct.toFixed(1) + "%";
    } else if (fmt === "integer") {
      return Math.round(num).toLocaleString();
    } else if (fmt === "decimal_2dp") {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "raw") {
      return String(num);
    }
    // Default compact_num / auto
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return (Math.abs(num) >= 100 ? Math.round(num).toLocaleString() : num.toFixed(1));
  }

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || !list.length) return null;
    if (overrideVal) {
      var found = list.find(function (f) {
        return f.name === overrideVal || f.label === overrideVal || f.label_short === overrideVal;
      });
      if (found) return found;
      var idx = parseInt(overrideVal, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) return list[defaultIdx];
    return null;
  }

  looker.plugins.visualizations.add({
    id: "cloud_security_compliance_radar",
    label: "Cloud Security Posture & Compliance Radar",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Layout Analysis Mode",
        display: "select",
        values: [
          { "Multi-Framework Compliance Radar & Target Ring": "multiaxis_radar" },
          { "Florence Nightingale / Polar Area Coxcomb": "polar_rose_coxcomb" },
          { "Radial Stacked Severity Rings": "severity_stacked_radial" },
          { "Executive Compliance Audit Scorecard": "framework_audit_grid" }
        ],
        default: "multiaxis_radar",
        section: "Display",
        order: 1
      },
      frameworkDimOverride: {
        type: "string",
        label: "Compliance Framework Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      severityDimOverride: {
        type: "string",
        label: "Finding Severity Dimension",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      openFindingsMeasOverride: {
        type: "string",
        label: "Open Findings Count Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      criticalHighMeasOverride: {
        type: "string",
        label: "Critical / High Open Findings Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      postureScoreMeasOverride: {
        type: "string",
        label: "Posture Compliance Score Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      benchmarkMode: {
        type: "string",
        label: "Compliance Benchmark Goal Mode",
        display: "select",
        values: [
          { "Fixed Target Goal Ring": "fixed_target" },
          { "Dataset Mean Posture Score": "dataset_mean" },
          { "Dataset Median Posture Score": "dataset_median" },
          { "Top Quintile (P80 Benchmark)": "percentile_p80" },
          { "None / Hide Benchmark Ring": "none" }
        ],
        default: "fixed_target",
        section: "Display",
        order: 7
      },
      targetScoreGoal: {
        type: "number",
        label: "Target Compliance Score Goal (%)",
        default: 85,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "Target Compliance Goal",
        section: "Display",
        order: 9
      },
      criticalAlertThreshold: {
        type: "number",
        label: "Critical Findings Alert Threshold",
        default: 5,
        section: "Display",
        order: 10
      },
      sortOrder: {
        type: "string",
        label: "Framework Sorting & Ordering",
        display: "select",
        values: [
          { "Compliance Score Descending (Best First)": "score_desc" },
          { "Compliance Score Ascending (Worst First)": "score_asc" },
          { "Open Findings Volume Descending": "findings_desc" },
          { "Alphabetical by Framework Name": "alphabetical" },
          { "Natural Query Order": "natural" }
        ],
        default: "score_desc",
        section: "Display",
        order: 11
      },
      topNLimit: {
        type: "string",
        label: "Top-N Framework Focus Limit",
        display: "select",
        values: [
          { "All Frameworks (No Limit)": "all" },
          { "Top 5 Frameworks": "5" },
          { "Top 8 Frameworks": "8" },
          { "Top 10 Frameworks": "10" }
        ],
        default: "all",
        section: "Display",
        order: 12
      },
      rollupOther: {
        type: "boolean",
        label: "Rollup Excluded Frameworks into 'Other'",
        default: false,
        section: "Display",
        order: 13
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Finding Frameworks",
        default: true,
        section: "Display",
        order: 14
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard (5 KPI Chips)": "full" },
          { "Compact Metric Strip (3 Core Metrics)": "compact" },
          { "Hidden (Maximum Canvas)": "hidden" }
        ],
        default: "full",
        section: "Display",
        order: 15
      },
      dataLabelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "Peaks & Critical Gaps Only": "peaks_only" },
          { "All Spoke Labels": "all" },
          { "Hidden (Clean View)": "hidden" }
        ],
        default: "peaks_only",
        section: "Display",
        order: 16
      },
      customChartTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 17
      },
      customChartSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        default: "",
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Enable Framework Search Bar",
        default: true,
        section: "Display",
        order: 19
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Color Theme & Brand Palette",
        display: "select",
        values: [
          { "Google Enterprise Blue (Light)": "google_enterprise" },
          { "Modern Executive Slate (Indigo & Charcoal)": "modern_slate" },
          { "Cyber SecOps (Dark Mode)": "cyber_secops" },
          { "Emerald Security & Governance (Light Mode)": "emerald_finops" },
          { "Sunset Threat Monitor (Warm Slate)": "sunset_amber" },
          { "Wellverse Healthcare Compliance (Teal & Coral)": "wellverse" },
          { "Custom Primary Hex Accent": "custom" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Pass / Good Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Critical / Warning Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Optimization Polarity",
        display: "select",
        values: [
          { "Higher is Better (Compliance Pass Score)": "higher_better" },
          { "Lower is Better (Vulnerability Risk & Findings)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scale",
        display: "select",
        values: [
          { "Compact (Dashboard Grid)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Display)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Metric Formatting",
        display: "select",
        values: [
          { "Percentage (85.2%)": "percent" },
          { "Compact Number (1.2K)": "compact_num" },
          { "Standard Integer (1,234)": "integer" },
          { "Decimal 2dp (85.24%)": "decimal_2dp" },
          { "Raw Unformatted": "raw" }
        ],
        default: "percent",
        section: "Style",
        order: 7
      },
      showSpokeGrid: {
        type: "boolean",
        label: "Show Concentric Grid Rings & Spokes",
        default: true,
        section: "Style",
        order: 8
      },
      fillAreaOpacity: {
        type: "string",
        label: "Polygon / Petal Fill Opacity",
        display: "select",
        values: [
          { "65% Vibrant Fill": "0.65" },
          { "45% Standard Translucent Fill": "0.45" },
          { "25% Subtle Outline Tint": "0.25" },
          { "85% High Contrast Fill": "0.85" }
        ],
        default: "0.45",
        section: "Style",
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        frameworkDimOverride: { role: "dimension", defaultIdx: 0 },
        severityDimOverride: { role: "dimension", defaultIdx: 1 },
        openFindingsMeasOverride: { role: "measure", defaultIdx: 0 },
        criticalHighMeasOverride: { role: "measure", defaultIdx: 1 },
        postureScoreMeasOverride: { role: "measure", defaultIdx: 2 }
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
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto → " + fieldLabel(autoField)) : "Auto / None";
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
        newOptions[key].values = values;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (err) {}
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-compliance-radar-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-compliance-radar-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.12s ease";
      tooltip.style.maxWidth = "290px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard
      var self = this;
      var resizeTimeout = null;
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries[0]) return;
          var cr = entries[0].contentRect;
          var w = Math.round(cr.width);
          var h = Math.round(cr.height);
          if (Math.abs(w - self._lastWidth) >= 4 || Math.abs(h - self._lastHeight) >= 4) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
              if (self._lastData && self._lastQueryResponse) {
                self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
              }
            }, 100);
          }
        });
        ro.observe(element);
        this._ro = ro;
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}
      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      var container = this._container;
      var tooltip = this._tooltip;
      var self = this;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No cloud security compliance telemetry returned.</span></div>";
        done();
        return;
      }

      if (!queryResponse || !queryResponse.fields) {
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];
      if (meas.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        meas = queryResponse.fields.table_calculations;
      }

      if (dims.length === 0 && meas.length === 0) {
        if (this.addError) {
          this.addError({
            title: "Missing Fields",
            message: "Cloud Security Compliance Radar requires at least 1 Framework Dimension and 1 Numeric Measure."
          });
        }
        done();
        return;
      }

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "google_enterprise";
        var theme = Object.assign({}, THEMES[themeKey] || THEMES.google_enterprise);

        // Custom hex overrides
        if (config.customPrimaryColor) {
          theme.accent = config.customPrimaryColor;
          theme.radarStroke = config.customPrimaryColor;
          theme.radarArea = config.customPrimaryColor.replace(")", ", 0.25)").replace("rgb", "rgba");
        }
        if (config.customPositiveColor) {
          theme.low = config.customPositiveColor;
          theme.passColor = config.customPositiveColor;
        }
        if (config.customNegativeColor) {
          theme.critical = config.customNegativeColor;
          theme.targetRing = config.customNegativeColor;
        }

        var layoutMode = config.layoutMode || "multiaxis_radar";
        var fontScaleFactor = config.fontScale === "compact" ? 0.88 : (config.fontScale === "large" ? 1.18 : 1.0);

        container.style.background = theme.bg;
        container.style.color = theme.text;
        container.style.fontSize = Math.round(12 * fontScaleFactor) + "px";
        tooltip.style.background = theme.tooltipBg;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;
        tooltip.style.color = theme.text;

        // 1. Identify Fields with Dynamic Override Resolvers
        var frameworkDim = resolveField(dims, config.frameworkDimOverride, 0);
        var severityDim = resolveField(dims, config.severityDimOverride, 1);
        var openFindingsMeas = resolveField(meas, config.openFindingsMeasOverride, 0);
        var criticalHighMeas = resolveField(meas, config.criticalHighMeasOverride, 1);
        var postureScoreMeas = resolveField(meas, config.postureScoreMeasOverride, 2);

        // 2. Parse & Aggregate Data by Framework
        var frameworkMap = {};
        var totalOpenFindings = 0;
        var totalCriticalHigh = 0;
        var totalPassed = 0;
        var globalScoreSum = 0;
        var globalScoreWeight = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var fwName = frameworkDim ? (row[frameworkDim.name]?.value || row[frameworkDim.name]?.rendered || "Framework " + (i + 1)) : "All Controls";
          var sevName = severityDim ? String(row[severityDim.name]?.value || row[severityDim.name]?.rendered || "MEDIUM").toUpperCase() : "MEDIUM";

          var openCnt = 0;
          if (openFindingsMeas) {
            var cO = row[openFindingsMeas.name];
            openCnt = cO && cO.value !== undefined && cO.value !== null ? Number(cO.value) : (Number(cO) || 0);
          } else {
            openCnt = 1;
          }
          if (isNaN(openCnt) || openCnt < 0) openCnt = 0;

          // Zero / Null suppression
          if (config.suppressZeroNull !== false && openCnt <= 0) {
            continue;
          }

          var critCnt = 0;
          if (criticalHighMeas) {
            var cC = row[criticalHighMeas.name];
            critCnt = cC && cC.value !== undefined && cC.value !== null ? Number(cC.value) : (Number(cC) || 0);
          } else if (sevName.indexOf("CRIT") >= 0 || sevName.indexOf("HIGH") >= 0) {
            critCnt = openCnt;
          }
          if (isNaN(critCnt) || critCnt < 0) critCnt = 0;

          var pScore = 0;
          if (postureScoreMeas) {
            var cP = row[postureScoreMeas.name];
            var rawScore = cP && cP.value !== undefined && cP.value !== null ? Number(cP.value) : (Number(cP) || 0);
            pScore = rawScore <= 1 ? rawScore * 100 : rawScore;
          } else {
            pScore = Math.max(100 - (critCnt * 2.5 + openCnt * 0.4), 25);
          }
          if (isNaN(pScore) || pScore < 0) pScore = 0;
          if (pScore > 100) pScore = 100;

          if (!frameworkMap[fwName]) {
            frameworkMap[fwName] = {
              name: fwName,
              totalOpen: 0,
              criticalHigh: 0,
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              scoreWeightedSum: 0,
              rowCount: 0,
              links: row[openFindingsMeas ? openFindingsMeas.name : (frameworkDim ? frameworkDim.name : "")]?.links || []
            };
          }

          frameworkMap[fwName].totalOpen += openCnt;
          frameworkMap[fwName].criticalHigh += critCnt;
          frameworkMap[fwName].scoreWeightedSum += pScore;
          frameworkMap[fwName].rowCount++;

          if (sevName.indexOf("CRIT") >= 0) frameworkMap[fwName].critical += openCnt;
          else if (sevName.indexOf("HIGH") >= 0) frameworkMap[fwName].high += openCnt;
          else if (sevName.indexOf("LOW") >= 0) frameworkMap[fwName].low += openCnt;
          else frameworkMap[fwName].medium += openCnt;

          totalOpenFindings += openCnt;
          totalCriticalHigh += critCnt;
          globalScoreSum += pScore;
          globalScoreWeight++;
        }

        var frameworks = Object.keys(frameworkMap).map(function (k) {
          var item = frameworkMap[k];
          item.postureScore = item.rowCount > 0 ? (item.scoreWeightedSum / item.rowCount) : 75;
          return item;
        });

        // Sorting
        var sOrder = config.sortOrder || "score_desc";
        if (sOrder === "score_asc") {
          frameworks.sort(function (a, b) { return a.postureScore - b.postureScore; });
        } else if (sOrder === "findings_desc") {
          frameworks.sort(function (a, b) { return b.totalOpen - a.totalOpen; });
        } else if (sOrder === "alphabetical") {
          frameworks.sort(function (a, b) { return a.name.localeCompare(b.name); });
        } else if (sOrder === "natural") {
          // natural query order
        } else {
          frameworks.sort(function (a, b) { return b.postureScore - a.postureScore; });
        }

        // Top-N Filter
        if (config.topNLimit && config.topNLimit !== "all") {
          var topLimit = parseInt(config.topNLimit, 10);
          if (!isNaN(topLimit) && frameworks.length > topLimit) {
            var kept = frameworks.slice(0, topLimit);
            var rest = frameworks.slice(topLimit);
            if (config.rollupOther) {
              var oOpen = rest.reduce(function (acc, f) { return acc + f.totalOpen; }, 0);
              var oCrit = rest.reduce(function (acc, f) { return acc + f.criticalHigh; }, 0);
              var oScore = rest.reduce(function (acc, f) { return acc + f.postureScore; }, 0) / (rest.length || 1);
              kept.push({
                name: "Other Frameworks (" + rest.length + ")",
                totalOpen: oOpen,
                criticalHigh: oCrit,
                critical: rest.reduce(function (acc, f) { return acc + f.critical; }, 0),
                high: rest.reduce(function (acc, f) { return acc + f.high; }, 0),
                medium: rest.reduce(function (acc, f) { return acc + f.medium; }, 0),
                low: rest.reduce(function (acc, f) { return acc + f.low; }, 0),
                postureScore: oScore,
                links: []
              });
            }
            frameworks = kept;
          }
        }

        // Benchmark Target Calculation
        var bMode = config.benchmarkMode || "fixed_target";
        var targetGoal = config.targetScoreGoal !== undefined ? Number(config.targetScoreGoal) : 85;
        var avgScore = globalScoreWeight > 0 ? (globalScoreSum / globalScoreWeight) : 75;

        if (bMode === "none") {
          targetGoal = null;
        } else if (bMode === "dataset_mean") {
          targetGoal = Math.round(avgScore);
        } else if (bMode === "dataset_median") {
          var sortedScores = frameworks.map(function (f) { return f.postureScore; }).sort(function (a, b) { return a - b; });
          targetGoal = Math.round(sortedScores[Math.floor(sortedScores.length / 2)] || 80);
        } else if (bMode === "percentile_p80") {
          targetGoal = Math.min(Math.round(avgScore * 1.12), 98);
        }

        var refLineLabel = config.referenceLineLabel || "Target Compliance Goal";
        var critThreshold = config.criticalAlertThreshold !== undefined ? Number(config.criticalAlertThreshold) : 5;

        // Search Filter
        var displayFrameworks = frameworks.filter(function (f) {
          if (!self._searchTerm) return true;
          return f.name.toLowerCase().indexOf(self._searchTerm.toLowerCase()) >= 0;
        });

        // UI Shell Construction
        container.innerHTML = "";

        var topControls = document.createElement("div");
        topControls.style.padding = "10px 14px";
        topControls.style.borderBottom = "1px solid " + theme.border;
        topControls.style.display = "flex";
        topControls.style.flexDirection = "column";
        topControls.style.gap = "8px";
        topControls.style.flexShrink = "0";

        // Custom Title / Subtitle Override
        if (config.customChartTitle) {
          var titleHeader = document.createElement("div");
          titleHeader.style.display = "flex";
          titleHeader.style.flexDirection = "column";
          titleHeader.style.marginBottom = "2px";

          var mainTitle = document.createElement("h3");
          mainTitle.style.margin = "0";
          mainTitle.style.fontSize = Math.round(15 * fontScaleFactor) + "px";
          mainTitle.style.fontWeight = "700";
          mainTitle.style.color = theme.text;
          mainTitle.innerText = config.customChartTitle;
          titleHeader.appendChild(mainTitle);

          if (config.customChartSubtitle) {
            var subTitle = document.createElement("p");
            subTitle.style.margin = "2px 0 0 0";
            subTitle.style.fontSize = Math.round(11 * fontScaleFactor) + "px";
            subTitle.style.color = theme.subtext;
            subTitle.innerText = config.customChartSubtitle;
            titleHeader.appendChild(subTitle);
          }
          topControls.appendChild(titleHeader);
        }

        // Executive HUD Scorecard
        var hudMode = config.hudMode || "full";
        if (hudMode !== "hidden") {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = "8px";

          var overallPassedFws = frameworks.filter(function (f) { return targetGoal !== null ? f.postureScore >= targetGoal : f.criticalHigh === 0; }).length;

          var hudCards = [
            {
              label: "Average Posture Score",
              val: avgScore.toFixed(1) + "%",
              sub: targetGoal !== null ? (refLineLabel + ": " + targetGoal + "%") : "Global Fleet Average",
              color: (targetGoal !== null && avgScore >= targetGoal) ? theme.passColor : theme.critical
            },
            {
              label: "Critical / High Findings",
              val: formatValue(totalCriticalHigh, "integer"),
              sub: totalCriticalHigh > critThreshold ? ("⚠️ Exceeds " + critThreshold + " Alert Threshold") : "✅ Within Risk Tolerance",
              color: totalCriticalHigh > critThreshold ? theme.critical : theme.passColor
            },
            {
              label: "Total Open Vulnerabilities",
              val: formatValue(totalOpenFindings, "integer"),
              sub: frameworks.length + " compliance frameworks",
              color: theme.accent
            },
            {
              label: "Passing Frameworks",
              val: overallPassedFws + " / " + frameworks.length,
              sub: Math.round((overallPassedFws / (frameworks.length || 1)) * 100) + "% Audit Pass Rate",
              color: overallPassedFws === frameworks.length ? theme.passColor : theme.medium
            },
            {
              label: "Posture Compliance Health",
              val: avgScore >= 80 ? "STRONG" : (avgScore >= 60 ? "MODERATE" : "AT RISK"),
              sub: "Prisma Cloud & SASE Posture",
              color: avgScore >= 80 ? theme.passColor : (avgScore >= 60 ? theme.medium : theme.critical)
            }
          ];

          var activeCards = hudMode === "compact" ? hudCards.slice(0, 3) : hudCards;
          activeCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = "7px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            var l = document.createElement("span");
            l.style.fontSize = "10.5px";
            l.style.fontWeight = "600";
            l.style.color = theme.hudSubtext;
            l.style.textTransform = "uppercase";
            l.style.letterSpacing = "0.4px";
            l.innerText = c.label;

            var v = document.createElement("span");
            v.style.fontSize = "17px";
            v.style.fontWeight = "700";
            v.style.color = c.color;
            v.style.margin = "2px 0";
            v.innerText = c.val;

            var s = document.createElement("span");
            s.style.fontSize = "10px";
            s.style.color = theme.hudSubtext;
            s.innerText = c.sub;

            card.appendChild(l);
            card.appendChild(v);
            card.appendChild(s);
            hudGrid.appendChild(card);
          });

          topControls.appendChild(hudGrid);
        }

        // Search Bar & Severity Legend Row
        if (config.showSearch !== false) {
          var toolbar = document.createElement("div");
          toolbar.style.display = "flex";
          toolbar.style.alignItems = "center";
          toolbar.style.justifyContent = "space-between";
          toolbar.style.flexWrap = "wrap";
          toolbar.style.gap = "8px";

          var legend = document.createElement("div");
          legend.style.display = "flex";
          legend.style.alignItems = "center";
          legend.style.gap = "10px";
          legend.style.fontSize = "11px";
          legend.innerHTML =
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.critical + ";border-radius:2px;'></span><span>Critical</span></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.high + ";border-radius:2px;'></span><span>High</span></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.medium + ";border-radius:2px;'></span><span>Medium</span></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.low + ";border-radius:2px;'></span><span>Low</span></div>";
          toolbar.appendChild(legend);

          var searchBox = document.createElement("div");
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.background = theme.cardBg;
          searchBox.style.border = "1px solid " + theme.border;
          searchBox.style.borderRadius = "4px";
          searchBox.style.padding = "3px 8px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter frameworks...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "11px";
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";

          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          searchBox.appendChild(searchInput);
          toolbar.appendChild(searchBox);

          topControls.appendChild(toolbar);
        }

        container.appendChild(topControls);

        // Visualization Canvas Wrapper
        var chartWrapper = document.createElement("div");
        chartWrapper.style.flex = "1";
        chartWrapper.style.position = "relative";
        chartWrapper.style.width = "100%";
        chartWrapper.style.minHeight = "240px";
        chartWrapper.style.overflow = "hidden";
        container.appendChild(chartWrapper);

        var width = chartWrapper.clientWidth || 600;
        var height = chartWrapper.clientHeight || 420;

        // ==========================================
        // LAYOUT MODE 4: Framework Audit Grid
        // ==========================================
        if (layoutMode === "framework_audit_grid") {
          chartWrapper.style.overflowY = "auto";
          chartWrapper.style.padding = "14px";

          var cardGrid = document.createElement("div");
          cardGrid.style.display = "grid";
          cardGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
          cardGrid.style.gap = "12px";

          displayFrameworks.forEach(function (f) {
            var cCard = document.createElement("div");
            cCard.style.background = theme.cardBg;
            cCard.style.border = "1px solid " + (f.criticalHigh > 0 ? theme.critical : theme.border);
            cCard.style.borderRadius = "8px";
            cCard.style.padding = "12px 14px";
            cCard.style.display = "flex";
            cCard.style.flexDirection = "column";
            cCard.style.gap = "8px";
            cCard.style.cursor = (f.links && f.links.length) ? "pointer" : "default";

            if (f.links && f.links.length) {
              cCard.onclick = function (e) {
                if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                  LookerCharts.Utils.openDrillMenu({ links: f.links, event: e });
                }
              };
            }

            var statusBadge = f.postureScore >= 80 ? "PASS" : (f.postureScore >= 60 ? "AT-RISK" : "FAIL");
            var statusColor = statusBadge === "PASS" ? theme.passColor : (statusBadge === "AT-RISK" ? theme.medium : theme.critical);

            cCard.innerHTML =
              "<div style='display:flex;justify-content:space-between;align-items:center;'>" +
              "  <span style='font-weight:700;font-size:13px;color:" + theme.text + ";'>" + f.name + "</span>" +
              "  <span style='padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;background:" + statusColor + ";color:#ffffff;'>" + statusBadge + "</span>" +
              "</div>" +
              "<div style='display:flex;justify-content:space-between;align-items:baseline;'>" +
              "  <span style='font-size:22px;font-weight:800;color:" + theme.accent + ";'>" + f.postureScore.toFixed(1) + "%</span>" +
              "  <span style='font-size:11px;color:" + theme.subtext + ";'>" + f.totalOpen + " Open Findings</span>" +
              "</div>" +
              "<div style='width:100%;height:6px;background:" + theme.border + ";border-radius:3px;overflow:hidden;'>" +
              "  <div style='width:" + Math.min(f.postureScore, 100) + "%;height:100%;background:" + statusColor + ";border-radius:3px;'></div>" +
              "</div>" +
              "<div style='display:flex;justify-content:space-between;font-size:11px;color:" + theme.subtext + ";padding-top:4px;border-top:1px solid " + theme.border + ";'>" +
              "  <span style='color:" + theme.critical + ";font-weight:600;'>🚨 " + f.criticalHigh + " Critical/High</span>" +
              "  <span>" + f.medium + " Med · " + f.low + " Low</span>" +
              "</div>";

            cardGrid.appendChild(cCard);
          });

          chartWrapper.appendChild(cardGrid);
          done();
          return;
        }

        // D3 RADIAL SVG SETUP for Modes 1, 2, 3
        var svg = d3.select(chartWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block")
          .style("overflow", "visible");

        var margin = { top: 25, right: 35, bottom: 25, left: 35 };
        var innerW = width - margin.left - margin.right;
        var innerH = height - margin.top - margin.bottom;
        var radius = Math.max(Math.min(innerW, innerH) / 2 - 25, 60);
        var centerX = margin.left + innerW / 2;
        var centerY = margin.top + innerH / 2;

        var g = svg.append("g")
          .attr("transform", "translate(" + centerX + "," + centerY + ")");

        var nAxes = displayFrameworks.length;
        var angleSlice = (Math.PI * 2) / (nAxes || 1);

        // ==========================================
        // LAYOUT MODE 1: Multi-Axis Radar Polygon & Target Ring
        // ==========================================
        if (layoutMode === "multiaxis_radar") {
          var rScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, radius]);

          // Concentric Grid Rings
          if (config.showSpokeGrid !== false) {
            var levels = [25, 50, 75, 100];
            levels.forEach(function (lvl) {
              g.append("circle")
                .attr("r", rScale(lvl))
                .attr("fill", "none")
                .attr("stroke", theme.gridLines)
                .attr("stroke-dasharray", lvl === 100 ? "none" : "3,3")
                .attr("stroke-width", 1);

              g.append("text")
                .attr("x", 4)
                .attr("y", -rScale(lvl) + 2)
                .attr("fill", theme.subtext)
                .attr("font-size", "9px")
                .attr("font-weight", "500")
                .text(lvl + "%");
            });

            // Radial Spokes
            displayFrameworks.forEach(function (f, idx) {
              var angle = angleSlice * idx - Math.PI / 2;
              var x2 = Math.cos(angle) * radius;
              var y2 = Math.sin(angle) * radius;

              g.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", x2)
                .attr("y2", y2)
                .attr("stroke", theme.gridLines)
                .attr("stroke-width", 1);

              // Spoke Axis Label
              var labelDist = radius + 18;
              var lx = Math.cos(angle) * labelDist;
              var ly = Math.sin(angle) * labelDist;
              var anchor = Math.abs(lx) < 10 ? "middle" : (lx > 0 ? "start" : "end");

              var labelText = g.append("text")
                .attr("x", lx)
                .attr("y", ly)
                .attr("text-anchor", anchor)
                .attr("fill", theme.text)
                .attr("font-size", "11px")
                .attr("font-weight", "600")
                .text(f.name);

              if (f.criticalHigh > 0) {
                g.append("text")
                  .attr("x", lx)
                  .attr("y", ly + 12)
                  .attr("text-anchor", anchor)
                  .attr("fill", theme.critical)
                  .attr("font-size", "9.5px")
                  .attr("font-weight", "700")
                  .text("⚠️ " + f.criticalHigh + " Crit/High");
              }
            });
          }

          // Benchmark Target Ring
          if (targetGoal !== null) {
            g.append("circle")
              .attr("r", rScale(targetGoal))
              .attr("fill", "none")
              .attr("stroke", theme.targetRing)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5,4");

            g.append("text")
              .attr("x", -rScale(targetGoal))
              .attr("y", -6)
              .attr("fill", theme.targetRing)
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .attr("text-anchor", "end")
              .text(refLineLabel + " (" + targetGoal + "%)");
          }

          // Radar Polygon Line Generator
          var radarLine = d3.lineRadial()
            .radius(function (d) { return rScale(d.postureScore); })
            .angle(function (d, i) { return i * angleSlice; })
            .curve(d3.curveLinearClosed);

          var fillOpacity = parseFloat(config.fillAreaOpacity || "0.45");

          // Shaded Radar Area
          g.append("path")
            .datum(displayFrameworks)
            .attr("d", radarLine)
            .attr("fill", theme.radarArea)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", theme.radarStroke)
            .attr("stroke-width", 2.5);

          // Radar Vertices & Drill Menus
          displayFrameworks.forEach(function (f, idx) {
            var angle = angleSlice * idx - Math.PI / 2;
            var rVal = rScale(f.postureScore);
            var vx = Math.cos(angle) * rVal;
            var vy = Math.sin(angle) * rVal;

            var vertex = g.append("circle")
              .attr("cx", vx)
              .attr("cy", vy)
              .attr("r", 5.5)
              .attr("fill", f.criticalHigh > 0 ? theme.critical : theme.accent)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 2)
              .style("cursor", (f.links && f.links.length) ? "pointer" : "default");

            // Peak data label
            if (config.dataLabelDensity === "all" || (config.dataLabelDensity === "peaks_only" && (f.postureScore < 60 || f.postureScore > 90 || f.criticalHigh > 0))) {
              g.append("text")
                .attr("x", vx + (Math.cos(angle) * 10))
                .attr("y", vy + (Math.sin(angle) * 10))
                .attr("text-anchor", "middle")
                .attr("fill", theme.text)
                .attr("font-size", "10px")
                .attr("font-weight", "700")
                .text(f.postureScore.toFixed(0) + "%");
            }

            vertex.on("mouseenter", function (e) {
              d3.select(this).transition().duration(100).attr("r", 8);
              tooltip.style.display = "block";
              tooltip.innerHTML =
                "<div style='font-weight:700;font-size:13px;margin-bottom:4px;color:" + theme.accent + ";'>" + f.name + "</div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'>" +
                "  <span>Posture Score:</span><strong>" + f.postureScore.toFixed(1) + "%</strong>" +
                "</div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'>" +
                "  <span>Open Findings:</span><strong>" + f.totalOpen + "</strong>" +
                "</div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;color:" + theme.critical + ";font-weight:600;'>" +
                "  <span>Critical/High:</span><strong>" + f.criticalHigh + "</strong>" +
                "</div>" +
                (f.links && f.links.length ? "<div style='font-size:10px;color:#94a3b8;margin-top:6px;'>🔍 Click vertex to drill</div>" : "");
            });

            vertex.on("mousemove", function (e) {
              tooltip.style.left = (e.clientX + 14) + "px";
              tooltip.style.top = (e.clientY - 12) + "px";
            });

            vertex.on("mouseleave", function () {
              d3.select(this).transition().duration(100).attr("r", 5.5);
              tooltip.style.display = "none";
            });

            if (f.links && f.links.length) {
              vertex.on("click", function (e) {
                if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                  LookerCharts.Utils.openDrillMenu({ links: f.links, event: e });
                }
              });
            }
          });
        }

        // ==========================================
        // LAYOUT MODE 2: Florence Nightingale / Polar Area Coxcomb
        // ==========================================
        else if (layoutMode === "polar_rose_coxcomb") {
          var maxFindings = d3.max(displayFrameworks, function (d) { return d.totalOpen; }) || 10;
          var coxScale = d3.scaleSqrt()
            .domain([0, maxFindings])
            .range([10, radius]);

          displayFrameworks.forEach(function (f, idx) {
            var startA = angleSlice * idx;
            var endA = startA + angleSlice - 0.04;
            var petalR = coxScale(f.totalOpen);

            var arcGen = d3.arc()
              .innerRadius(12)
              .outerRadius(petalR)
              .startAngle(startA)
              .endAngle(endA);

            var petalColor = f.criticalHigh > 0 ? theme.critical : (f.postureScore >= 80 ? theme.passColor : theme.medium);

            var path = g.append("path")
              .attr("d", arcGen)
              .attr("fill", petalColor)
              .attr("fill-opacity", parseFloat(config.fillAreaOpacity || "0.45"))
              .attr("stroke", petalColor)
              .attr("stroke-width", 1.5)
              .style("cursor", (f.links && f.links.length) ? "pointer" : "default");

            // Label
            var midA = (startA + endA) / 2 - Math.PI / 2;
            var lx = Math.cos(midA) * (radius + 15);
            var ly = Math.sin(midA) * (radius + 15);
            var anchor = Math.abs(lx) < 10 ? "middle" : (lx > 0 ? "start" : "end");

            g.append("text")
              .attr("x", lx)
              .attr("y", ly)
              .attr("text-anchor", anchor)
              .attr("fill", theme.text)
              .attr("font-size", "10.5px")
              .attr("font-weight", "600")
              .text(f.name);

            path.on("mouseenter", function (e) {
              d3.select(this).attr("fill-opacity", 0.85);
              tooltip.style.display = "block";
              tooltip.innerHTML =
                "<div style='font-weight:700;font-size:13px;color:" + theme.accent + ";'>" + f.name + "</div>" +
                "<div>Total Findings: <strong>" + f.totalOpen + "</strong></div>" +
                "<div>Critical/High: <strong style='color:" + theme.critical + ";'>" + f.criticalHigh + "</strong></div>" +
                "<div>Posture Score: <strong>" + f.postureScore.toFixed(1) + "%</strong></div>";
            });
            path.on("mousemove", function (e) {
              tooltip.style.left = (e.clientX + 14) + "px";
              tooltip.style.top = (e.clientY - 12) + "px";
            });
            path.on("mouseleave", function () {
              d3.select(this).attr("fill-opacity", parseFloat(config.fillAreaOpacity || "0.45"));
              tooltip.style.display = "none";
            });
            if (f.links && f.links.length) {
              path.on("click", function (e) {
                if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                  LookerCharts.Utils.openDrillMenu({ links: f.links, event: e });
                }
              });
            }
          });
        }

        // ==========================================
        // LAYOUT MODE 3: Radial Stacked Severity Rings
        // ==========================================
        else if (layoutMode === "severity_stacked_radial") {
          var nFw = displayFrameworks.length;
          var trackWidth = radius / (nFw + 1);

          displayFrameworks.forEach(function (f, idx) {
            var innerR = (idx + 1) * trackWidth;
            var outerR = innerR + trackWidth - 3;
            var total = f.totalOpen || 1;

            var sevs = [
              { name: "Critical", cnt: f.critical, col: theme.critical },
              { name: "High", cnt: f.high, col: theme.high },
              { name: "Medium", cnt: f.medium, col: theme.medium },
              { name: "Low", cnt: f.low, col: theme.low }
            ];

            var curAngle = 0;
            sevs.forEach(function (s) {
              if (s.cnt <= 0) return;
              var arcAngle = (s.cnt / total) * Math.PI * 2;
              var arcG = d3.arc()
                .innerRadius(innerR)
                .outerRadius(outerR)
                .startAngle(curAngle)
                .endAngle(curAngle + arcAngle - 0.02);

              var seg = g.append("path")
                .attr("d", arcG)
                .attr("fill", s.col)
                .attr("stroke", theme.bg)
                .attr("stroke-width", 1)
                .style("cursor", "pointer");

              seg.on("mouseenter", function (e) {
                tooltip.style.display = "block";
                tooltip.innerHTML =
                  "<div style='font-weight:700;font-size:13px;color:" + theme.accent + ";'>" + f.name + "</div>" +
                  "<div>" + s.name + " Severity: <strong>" + s.cnt + " findings</strong></div>" +
                  "<div>Share: <strong>" + ((s.cnt / total) * 100).toFixed(1) + "%</strong></div>";
              });
              seg.on("mousemove", function (e) {
                tooltip.style.left = (e.clientX + 14) + "px";
                tooltip.style.top = (e.clientY - 12) + "px";
              });
              seg.on("mouseleave", function () {
                tooltip.style.display = "none";
              });

              curAngle += arcAngle;
            });

            // Track Label
            g.append("text")
              .attr("x", 4)
              .attr("y", -outerR + 4)
              .attr("fill", theme.text)
              .attr("font-size", "9.5px")
              .attr("font-weight", "600")
              .text(f.name);
          });
        }

        done();
      });
    }
  });
})();
