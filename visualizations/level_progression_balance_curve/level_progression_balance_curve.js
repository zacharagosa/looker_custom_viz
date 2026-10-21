/**
 * Level Progression & Balancing Curve - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Game Balancing & Telemetry Drop-off Visualizer solving Buganizer Cloud Blockers:
 * - b/341928091: "Telemetry progression curve with automated difficulty choke-point anomaly detection"
 * - b/490547912: "Dual-axis survival hazard rates alongside cumulative stage completion"
 * - b/530822261: "Multi-modal level balancing visualization with theoretical benchmark decay overlays"
 *
 * 4 Multi-Modal Layout Modes:
 * 1. "dual_axis_spikes": Progression & Choke Points (Left axis: smooth cumulative survivor curve; Right axis: marginal churn % spike columns with automated anomaly badges)
 * 2. "survival_decay": Survival Decay Model (Empirical survivor retention curve against theoretical power-law/exponential benchmark baseline with P50 half-life indicator)
 * 3. "milestone_waterfall": Milestone Step Waterfall (Stepped progression cascade tracking surviving players vs drop-off loss at each stage)
 * 4. "difficulty_pacing": Difficulty & Pacing Envelope (Dual-axis correlation of survivor attrition with secondary telemetry measures: boss wipes, retries, playtime, or resource sinks)
 *
 * Automated Choke-Point / Difficulty Spike Anomaly Engine:
 * - Computes step-to-step hazard rate h_i = (V_{i-1} - V_i) / V_{i-1}
 * - Calculates mean and standard deviation of hazard rates across the progression
 * - Flags levels deviating > 1.5σ or 2.0σ with visual warning badges and delta impact
 *
 * Enterprise Looker Standards:
 * - Strictly 2 clean tabs in Edit Viz Modal: "Display" and "Style"
 * - Dynamic field-role overrides via registerOptions dropdowns
 * - Client-side high-density aggregation for 5,000+ rows
 * - Debounced ResizeObserver (<4px threshold guard, never set width:100%/height:100% on element)
 * - Native Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
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
      name: "Google Enterprise Spectrum",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 249, 250, 0.95)",
      hudBorder: "#dadce0",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      accent: "#1a73e8",
      curveColor: "#1a73e8",
      curveFill: "rgba(26, 115, 232, 0.20)",
      spikeFill: "rgba(217, 48, 37, 0.75)",
      spikeBorder: "#d93025",
      benchmarkColor: "#5f6368",
      secondaryColor: "#1e8e3e",
      chokePointBg: "#fce8e6",
      chokePointText: "#c5221f",
      chokePointBorder: "#ea4335",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    executive_slate: {
      name: "Executive Slate (Light)",
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
      accent: "#2563eb",
      curveColor: "#2563eb",
      curveFill: "rgba(37, 99, 235, 0.20)",
      spikeFill: "rgba(225, 29, 72, 0.75)",
      spikeBorder: "#e11d48",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#059669",
      chokePointBg: "#fee2e2",
      chokePointText: "#b91c1c",
      chokePointBorder: "#ef4444",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyber_teal: {
      name: "Cyberpunk Glow (Dark)",
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
      accent: "#06b6d4",
      curveColor: "#06b6d4",
      curveFill: "rgba(6, 182, 212, 0.25)",
      spikeFill: "rgba(244, 63, 94, 0.85)",
      spikeBorder: "#f43f5e",
      benchmarkColor: "#64748b",
      secondaryColor: "#10b981",
      chokePointBg: "rgba(244, 63, 94, 0.25)",
      chokePointText: "#fda4af",
      chokePointBorder: "#f43f5e",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#06b6d4"
    },
    neon_violet: {
      name: "Neon Violet (Dark)",
      isDark: true,
      bg: "#0d0714",
      cardBg: "rgba(26, 16, 37, 0.85)",
      border: "#2e1065",
      text: "#faf5ff",
      subtext: "#c084fc",
      hudBg: "rgba(26, 16, 37, 0.90)",
      hudBorder: "rgba(147, 51, 234, 0.6)",
      hudText: "#faf5ff",
      hudSubtext: "#c084fc",
      accent: "#a855f7",
      curveColor: "#a855f7",
      curveFill: "rgba(168, 85, 247, 0.25)",
      spikeFill: "rgba(244, 63, 94, 0.85)",
      spikeBorder: "#f43f5e",
      benchmarkColor: "#7e22ce",
      secondaryColor: "#38bdf8",
      chokePointBg: "rgba(244, 63, 94, 0.25)",
      chokePointText: "#fbcfe8",
      chokePointBorder: "#f43f5e",
      tooltipBg: "rgba(19, 11, 36, 0.96)",
      tooltipBorder: "#a855f7"
    },
    emerald_pulse: {
      name: "Emerald FinOps (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      accent: "#059669",
      curveColor: "#059669",
      curveFill: "rgba(5, 150, 105, 0.20)",
      spikeFill: "rgba(234, 88, 12, 0.80)",
      spikeBorder: "#ea580c",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#0284c7",
      chokePointBg: "#ffedd5",
      chokePointText: "#c2410c",
      chokePointBorder: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
      name: "Sunset Media (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#451a03",
      subtext: "#92400e",
      hudBg: "rgba(254, 243, 199, 0.95)",
      hudBorder: "#fcd34d",
      hudText: "#451a03",
      hudSubtext: "#92400e",
      accent: "#d97706",
      curveColor: "#d97706",
      curveFill: "rgba(217, 119, 6, 0.20)",
      spikeFill: "rgba(225, 29, 72, 0.80)",
      spikeBorder: "#e11d48",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#4f46e5",
      chokePointBg: "#ffe4e6",
      chokePointText: "#be123c",
      chokePointBorder: "#e11d48",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    },
    wellverse: {
      name: "Wellverse Healthcare (Light)",
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
      accent: "#2e7cf6",
      curveColor: "#2e7cf6",
      curveFill: "rgba(46, 124, 246, 0.20)",
      spikeFill: "rgba(229, 72, 77, 0.80)",
      spikeBorder: "#e5484d",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#00af68",
      chokePointBg: "#fee2e2",
      chokePointText: "#b91c1c",
      chokePointBorder: "#ef4444",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2e7cf6"
    },
    custom: {
      name: "Custom Hex Override",
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
      accent: "#2563eb",
      curveColor: "#2563eb",
      curveFill: "rgba(37, 99, 235, 0.20)",
      spikeFill: "rgba(225, 29, 72, 0.75)",
      spikeBorder: "#e11d48",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#16a34a",
      chokePointBg: "#fee2e2",
      chokePointText: "#b91c1c",
      chokePointBorder: "#ef4444",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    if (fmt === "compact_currency") {
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(2);
    } else if (fmt === "percentage") {
      var p = (num <= 1 && num >= -1) ? num * 100 : num;
      return (p >= 0 ? "" : "-") + Math.abs(p).toFixed(1) + "%";
    } else if (fmt === "decimal_2") {
      return sign + abs.toFixed(2);
    } else if (fmt === "raw") {
      return String(num);
    }
    // compact_num / auto default
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
    if (abs < 10 && abs > 0 && Math.floor(abs) !== abs) return sign + abs.toFixed(2);
    return sign + Math.round(abs).toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "level_progression_balance_curve",
    label: "Level Progression & Balancing Curve",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      curveLayout: {
        type: "string",
        label: "Progression Layout Mode",
        display: "select",
        values: [
          { "Progression & Choke Points": "dual_axis_spikes" },
          { "Survival Decay Model": "survival_decay" },
          { "Milestone Step Waterfall": "milestone_waterfall" },
          { "Difficulty & Pacing Envelope": "difficulty_pacing" }
        ],
        default: "dual_axis_spikes",
        section: "Display",
        order: 1
      },
      dimLevelOverride: {
        type: "string",
        label: "Primary Stage / Level Dimension",
        display: "select",
        values: [{ "Auto / Default Order": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      dimGroupOverride: {
        type: "string",
        label: "Secondary / Zone Dimension (Optional)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measureVolumeOverride: {
        type: "string",
        label: "Primary Survivor Volume Measure",
        display: "select",
        values: [{ "Auto / Default Order": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      measureSecondaryOverride: {
        type: "string",
        label: "Secondary Telemetry Measure (Pacing)",
        display: "select",
        values: [{ "Auto / Default Order": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      measureTargetOverride: {
        type: "string",
        label: "Target Benchmark Measure (Optional)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None / Standard Curve": "none" },
          { "Target Measure Column": "measure" },
          { "Fixed Benchmark Value": "fixed" },
          { "Dataset Mean Survivor Volume": "dataset_mean" },
          { "Dataset Median Survivor Volume": "dataset_median" },
          { "P75 Milestone Target": "percentile_p75" },
          { "P90 Milestone Target": "percentile_p90" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 7
      },
      targetFixedValue: {
        type: "number",
        label: "Custom Target Fixed Value",
        default: 50000,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        default: "Retention Target",
        section: "Display",
        order: 9
      },
      chokePointSensitivity: {
        type: "string",
        label: "Choke Point Anomaly Sensitivity",
        display: "select",
        values: [
          { "High Sensitivity (> 1.5σ Churn)": "high" },
          { "Medium Sensitivity (> 2.0σ Churn)": "medium" },
          { "Fixed Cutoff Threshold": "fixed" }
        ],
        default: "medium",
        section: "Display",
        order: 10
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Fixed Churn Anomaly Cutoff %",
        default: 25.0,
        section: "Display",
        order: 11
      },
      sortOrder: {
        type: "string",
        label: "Stage Progression Order",
        display: "select",
        values: [
          { "Query Natural / Chronological Order": "natural" },
          { "Highest Survivor Volume First": "metric_desc" },
          { "Lowest Survivor Volume First": "metric_asc" },
          { "Alphabetical (A - Z)": "alphabetical" }
        ],
        default: "natural",
        section: "Display",
        order: 12
      },
      topN: {
        type: "string",
        label: "Top N Stages Displayed",
        display: "select",
        values: [
          { "All Stages": "all" },
          { "Top 10 Stages": "10" },
          { "Top 15 Stages": "15" },
          { "Top 20 Stages": "20" },
          { "Top 25 Stages": "25" },
          { "Top 30 Stages": "30" },
          { "Top 50 Stages": "50" }
        ],
        default: "all",
        section: "Display",
        order: 13
      },
      bundleOther: {
        type: "boolean",
        label: "Group Trailing Stages into 'Other'",
        default: false,
        section: "Display",
        order: 14
      },
      suppressNulls: {
        type: "boolean",
        label: "Filter Zero / Empty Stages",
        default: true,
        section: "Display",
        order: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Telemetry HUD",
        display: "select",
        values: [
          { "Full Scorecard (4 KPI Cards)": "full" },
          { "Compact Metrics Strip": "compact" },
          { "Hidden / Minimal": "hidden" }
        ],
        default: "full",
        section: "Display",
        order: 16
      },
      dataLabelDensity: {
        type: "string",
        label: "Data Value & Retention Labels",
        display: "select",
        values: [
          { "All Stages": "all" },
          { "Choke Points & Milestone Peaks Only": "peaks" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 17
      },
      chartTitle: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 18
      },
      chartSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Stage Search",
        default: true,
        section: "Display",
        order: 20
      },
      highlightWorstChoke: {
        type: "boolean",
        label: "Highlight Peak Bottleneck Level",
        default: true,
        section: "Display",
        order: 21
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 clean tabs)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        display: "select",
        values: [
          { "Google Enterprise Spectrum": "google_enterprise" },
          { "Modern Slate (Executive)": "executive_slate" },
          { "Cyberpunk Glow (Dark)": "cyber_teal" },
          { "Neon Violet (Dark)": "neon_violet" },
          { "Emerald FinOps (Light)": "emerald_pulse" },
          { "Sunset Media (Light)": "sunset_amber" },
          { "Wellverse Healthcare": "wellverse" },
          { "Custom Hex Override": "custom" }
        ],
        default: "executive_slate",
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
        label: "Custom Milestone / Pass Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Choke / Spike Hex",
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
          { "Higher is Better (Survivors, Clears, Retention)": "higher_is_better" },
          { "Lower is Better (Wipes, Churn, Deaths, Latency)": "lower_is_better" }
        ],
        default: "higher_is_better",
        section: "Style",
        order: 5
      },
      curveSmoothing: {
        type: "string",
        label: "Curve Interpolation",
        display: "select",
        values: [
          { "Smooth Spline (Catmull-Rom)": "catmull_rom" },
          { "Linear (Direct Segment)": "linear" },
          { "Monotone (Preserve Peaks)": "monotone_x" }
        ],
        default: "catmull_rom",
        section: "Style",
        order: 6
      },
      areaOpacity: {
        type: "string",
        label: "Area Shading Opacity",
        display: "select",
        values: [
          { "Subtle Fill (15%)": "subtle" },
          { "Medium Fill (30%)": "medium" },
          { "Solid Fill (50%)": "solid" }
        ],
        default: "medium",
        section: "Style",
        order: 7
      },
      fontScale: {
        type: "string",
        label: "Font Scale & Density",
        display: "select",
        values: [
          { "Compact (Dense Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 8
      },
      valueFormat: {
        type: "string",
        label: "Value Number Formatting",
        display: "select",
        values: [
          { "Auto Detect": "auto" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Exact Raw Integers": "raw" }
        ],
        default: "compact_num",
        section: "Style",
        order: 9
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "Google Sans, Roboto, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      element.innerHTML = "";

      var root = document.createElement("div");
      root.className = "level-progression-root";
      root.style.width = "100%";
      root.style.height = "100%";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.boxSizing = "border-box";
      root.style.overflow = "hidden";
      element.appendChild(root);

      this._root = root;
      this._searchQuery = "";
      this._hoverIndex = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      var self = this;
      var resizeTimeout = null;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!entries || entries.length === 0) return;
          var entry = entries[0];
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) {
            return;
          }
          self._lastWidth = w;
          self._lastHeight = h;

          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            }
          }, 60);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "No Data", message: "Query response contains no fields." });
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length === 0 && meas.length < 2) {
        this.addError({
          title: "Insufficient Fields",
          message: "Level Progression requires at least 1 Dimension (Level / Stage) and 1 Measure (Survivors / Volume), or 2+ Measures."
        });
        done();
        return;
      }

      // Dynamic Dropdowns registration
      var dimOptions = [{ "Auto / Default Order": "" }];
      dims.forEach(function (d) {
        var opt = {};
        opt[d.label_short || d.label || d.name] = d.name;
        dimOptions.push(opt);
      });

      var measOptions = [{ "Auto / Default Order": "" }];
      meas.forEach(function (m) {
        var opt = {};
        opt[m.label_short || m.label || m.name] = m.name;
        measOptions.push(opt);
      });

      if (this.trigger) {
        try {
          this.trigger("registerOptions", {
            dimLevelOverride: { values: dimOptions },
            dimGroupOverride: { values: [{ "Auto / None": "" }].concat(dimOptions.slice(1)) },
            measureVolumeOverride: { values: measOptions },
            measureSecondaryOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) },
            measureTargetOverride: { values: [{ "Auto / None": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function () {
        try {
          self.render(data, config, queryResponse);
        } catch (err) {
          console.error("Error rendering level_progression_balance_curve:", err);
          self.addError({ title: "Render Error", message: err.message });
        }
        done();
      });
    },

    render: function (data, config, queryResponse) {
      var root = this._root;
      if (!root) return;
      root.innerHTML = "";

      var dims = (queryResponse.fields && queryResponse.fields.dimensions) || [];
      var meas = (queryResponse.fields && queryResponse.fields.measures) || [];
      var themeKey = config.colorPalette || config.colorTheme || "executive_slate";
      var theme = Object.assign({}, THEMES[themeKey] || THEMES.executive_slate);

      // Custom Hex Overrides
      if (themeKey === "custom" || config.customPrimaryColor) {
        if (config.customPrimaryColor) {
          theme.accent = config.customPrimaryColor;
          theme.curveColor = config.customPrimaryColor;
          theme.curveFill = config.customPrimaryColor + "33";
          theme.tooltipBorder = config.customPrimaryColor;
        }
        if (config.customPositiveColor) {
          theme.secondaryColor = config.customPositiveColor;
        }
        if (config.customNegativeColor) {
          theme.spikeBorder = config.customNegativeColor;
          theme.spikeFill = config.customNegativeColor + "bb";
          theme.chokePointBorder = config.customNegativeColor;
          theme.chokePointText = config.customNegativeColor;
        }
      }

      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      // Font scaling
      var fScale = config.fontScale || "standard";
      var baseFontSize = fScale === "compact" ? 11 : (fScale === "large" ? 15 : 13);
      root.style.fontSize = baseFontSize + "px";

      // Field Mapping with Overrides
      var stageDim = config.dimLevelOverride || (dims.length > 0 ? dims[0].name : null);
      var groupDim = config.dimGroupOverride || (dims.length > 1 ? dims[1].name : null);
      var primaryMeasure = config.measureVolumeOverride || (meas.length > 0 ? meas[0].name : null);
      var secondaryMeasure = config.measureSecondaryOverride || (meas.length > 1 ? meas[1].name : null);
      var targetMeasure = config.measureTargetOverride || (meas.length > 2 ? meas[2].name : null);

      // Aggregation: Roll up rows (5,000+) by Stage
      var stageMap = new Map();
      var stageOrder = [];

      if (stageDim && primaryMeasure) {
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawVal = row[stageDim] ? (row[stageDim].value !== undefined ? row[stageDim].value : row[stageDim]) : "Level " + (i + 1);
          var stageKey = String(rawVal);
          var v1 = row[primaryMeasure] ? Number(row[primaryMeasure].value || 0) : 0;
          var v2 = secondaryMeasure && row[secondaryMeasure] ? Number(row[secondaryMeasure].value || 0) : 0;
          var vt = targetMeasure && row[targetMeasure] ? Number(row[targetMeasure].value || 0) : 0;

          if (!stageMap.has(stageKey)) {
            stageMap.set(stageKey, {
              label: stageKey,
              rawLabel: rawVal,
              volume: 0,
              secondary: 0,
              targetVal: 0,
              firstRow: row,
              count: 0
            });
            stageOrder.push(stageKey);
          }
          var entry = stageMap.get(stageKey);
          entry.volume += v1;
          entry.secondary += v2;
          entry.targetVal += vt;
          entry.count += 1;
        }
      } else if (meas.length >= 2) {
        for (var m = 0; m < meas.length; m++) {
          var mKey = meas[m].name;
          var mLabel = meas[m].label_short || meas[m].label || mKey;
          var sum = 0;
          for (var r = 0; r < data.length; r++) {
            sum += data[r][mKey] ? Number(data[r][mKey].value || 0) : 0;
          }
          stageMap.set(mKey, {
            label: mLabel,
            rawLabel: mLabel,
            volume: sum,
            secondary: 0,
            targetVal: 0,
            firstRow: data[0],
            count: data.length
          });
          stageOrder.push(mKey);
        }
      }

      var stages = [];
      for (var s = 0; s < stageOrder.length; s++) {
        stages.push(stageMap.get(stageOrder[s]));
      }

      // Suppress Nulls / Zeros
      if (config.suppressNulls !== false) {
        stages = stages.filter(function (st) {
          return st.volume > 0 || (st.secondary > 0);
        });
      }

      if (stages.length === 0) {
        root.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";'>No non-zero stages found for progression curve.</div>";
        return;
      }

      // Sorting
      var sortOrder = config.sortOrder || "natural";
      if (sortOrder === "metric_desc") {
        stages.sort(function (a, b) { return b.volume - a.volume; });
      } else if (sortOrder === "metric_asc") {
        stages.sort(function (a, b) { return a.volume - b.volume; });
      } else if (sortOrder === "alphabetical") {
        stages.sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
      }

      // Top-N & Bundle Other
      var topNLimit = config.topN || "all";
      if (topNLimit !== "all") {
        var n = parseInt(topNLimit, 10);
        if (!isNaN(n) && n > 0 && stages.length > n) {
          var topSlice = stages.slice(0, n);
          if (config.bundleOther) {
            var otherSlice = stages.slice(n);
            var otherVol = otherSlice.reduce(function (acc, x) { return acc + x.volume; }, 0);
            var otherSec = otherSlice.reduce(function (acc, x) { return acc + x.secondary; }, 0);
            topSlice.push({
              label: "Other Stages (" + otherSlice.length + ")",
              rawLabel: "Other",
              volume: otherVol,
              secondary: otherSec,
              targetVal: 0,
              firstRow: otherSlice[0].firstRow,
              count: otherSlice.length
            });
          }
          stages = topSlice;
        }
      }

      // Filter via instant search
      var query = (this._searchQuery || "").trim().toLowerCase();
      var displayStages = stages;
      if (query) {
        displayStages = stages.filter(function (st) {
          return st.label.toLowerCase().indexOf(query) !== -1;
        });
      }

      if (displayStages.length === 0) {
        displayStages = stages;
      }

      // Progression Analytics: Compute Survivors %, Step Hazard Drop-off %, and Anomaly Z-scores
      var initialVolume = displayStages[0].volume || 1;
      var hazardRates = [];

      for (var idx = 0; idx < displayStages.length; idx++) {
        var cur = displayStages[idx];
        cur.index = idx;
        cur.survivorPct = (cur.volume / initialVolume) * 100;

        if (idx === 0) {
          cur.stepDropoff = 0;
          cur.hazardRate = 0;
          cur.stepRetention = 100;
        } else {
          var prev = displayStages[idx - 1];
          cur.stepDropoff = Math.max(0, prev.volume - cur.volume);
          cur.hazardRate = prev.volume > 0 ? (cur.stepDropoff / prev.volume) * 100 : 0;
          cur.stepRetention = prev.volume > 0 ? (cur.volume / prev.volume) * 100 : 0;
          hazardRates.push(cur.hazardRate);
        }
      }

      // Target Benchmark Line Calculation
      var targetMode = config.targetMode || "dataset_mean";
      var targetValue = null;
      var volumes = displayStages.map(function (d) { return d.volume; }).sort(function (a, b) { return a - b; });

      if (targetMode === "fixed") {
        targetValue = Number(config.targetFixedValue || 50000);
      } else if (targetMode === "dataset_mean") {
        var sumV = volumes.reduce(function (a, b) { return a + b; }, 0);
        targetValue = volumes.length > 0 ? sumV / volumes.length : 0;
      } else if (targetMode === "dataset_median") {
        var mid = Math.floor(volumes.length / 2);
        targetValue = volumes.length % 2 !== 0 ? volumes[mid] : (volumes[mid - 1] + volumes[mid]) / 2;
      } else if (targetMode === "percentile_p75") {
        var p75Idx = Math.floor(volumes.length * 0.75);
        targetValue = volumes[Math.min(p75Idx, volumes.length - 1)];
      } else if (targetMode === "percentile_p90") {
        var p90Idx = Math.floor(volumes.length * 0.90);
        targetValue = volumes[Math.min(p90Idx, volumes.length - 1)];
      } else if (targetMode === "measure" && targetMeasure) {
        var tSum = displayStages.reduce(function (acc, d) { return acc + d.targetVal; }, 0);
        targetValue = displayStages.length > 0 ? tSum / displayStages.length : 0;
      }

      // Calculate Hazard Statistics for Anomaly Detection
      var avgHazard = 0;
      var stdHazard = 0;
      if (hazardRates.length > 0) {
        var sumH = hazardRates.reduce(function (a, b) { return a + b; }, 0);
        avgHazard = sumH / hazardRates.length;
        var varH = hazardRates.reduce(function (a, b) { return a + Math.pow(b - avgHazard, 2); }, 0) / hazardRates.length;
        stdHazard = Math.sqrt(varH);
      }

      var sensitivity = config.chokePointSensitivity || "medium";
      var sigmaThreshold = sensitivity === "high" ? 1.5 : (sensitivity === "medium" ? 2.0 : 999);
      var fixedThreshold = Number(config.anomalyThresholdPct || 25.0);

      var worstChokeIndex = -1;
      var maxHazard = -1;

      for (var k = 0; k < displayStages.length; k++) {
        var stg = displayStages[k];
        if (k > 0) {
          stg.zScore = stdHazard > 0 ? (stg.hazardRate - avgHazard) / stdHazard : 0;
          var isAnomaly = false;
          if (sensitivity === "fixed") {
            isAnomaly = stg.hazardRate >= fixedThreshold;
          } else {
            isAnomaly = stg.zScore >= sigmaThreshold && stg.hazardRate > 5.0;
          }
          stg.isChokePoint = isAnomaly;
          if (stg.hazardRate > maxHazard) {
            maxHazard = stg.hazardRate;
            worstChokeIndex = k;
          }
        } else {
          stg.zScore = 0;
          stg.isChokePoint = false;
        }
      }

      var worstChokeStage = worstChokeIndex >= 0 ? displayStages[worstChokeIndex] : null;

      // Find P50 Half-Life Level
      var p50Level = "N/A";
      for (var p = 0; p < displayStages.length; p++) {
        if (displayStages[p].survivorPct <= 50) {
          p50Level = displayStages[p].label;
          break;
        }
      }

      // 1. TOP HEADER & EXECUTIVE HUD
      var headerContainer = document.createElement("div");
      headerContainer.style.flexShrink = "0";
      headerContainer.style.padding = "10px 16px 8px 16px";
      headerContainer.style.display = "flex";
      headerContainer.style.flexDirection = "column";
      headerContainer.style.gap = "8px";
      headerContainer.style.borderBottom = "1px solid " + theme.border;
      root.appendChild(headerContainer);

      // Search and Layout Controls Bar
      var controlsRow = document.createElement("div");
      controlsRow.style.display = "flex";
      controlsRow.style.alignItems = "center";
      controlsRow.style.justifyContent = "space-between";
      controlsRow.style.gap = "12px";
      headerContainer.appendChild(controlsRow);

      var titleDiv = document.createElement("div");
      titleDiv.style.display = "flex";
      titleDiv.style.flexDirection = "column";
      titleDiv.style.gap = "2px";

      var displayTitle = config.chartTitle || "Level Progression & Balancing Curve";
      var displaySubtitle = config.chartSubtitle || (displayStages.length + " Progression Stages • " + formatValue(stages.length, "compact_num") + " Total Entities");

      titleDiv.innerHTML = "<div style='display:flex;align-items:center;gap:8px;'>" +
        "<span style='font-size:16px;'>🕹️</span><span style='font-size:" + (baseFontSize + 2) + "px;font-weight:600;letter-spacing:-0.2px;color:" + theme.text + ";'>" + displayTitle + "</span>" +
        "<span style='font-size:10px;padding:2px 8px;border-radius:12px;background:" + theme.cardBg + ";border:1px solid " + theme.border + ";color:" + theme.subtext + ";font-weight:500;'>" + displayStages.length + " Stages</span></div>" +
        (displaySubtitle ? "<div style='font-size:11px;color:" + theme.subtext + ";margin-left:24px;'>" + displaySubtitle + "</div>" : "");
      controlsRow.appendChild(titleDiv);

      var rightControls = document.createElement("div");
      rightControls.style.display = "flex";
      rightControls.style.alignItems = "center";
      rightControls.style.gap = "8px";
      controlsRow.appendChild(rightControls);

      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search stages...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";

        var self = this;
        searchInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
        });
        rightControls.appendChild(searchInput);
      }

      // Executive HUD KPI Cards
      var hudMode = config.hudMode || "full";
      if (hudMode === "full") {
        var hudRow = document.createElement("div");
        hudRow.style.display = "grid";
        hudRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
        hudRow.style.gap = "8px";
        headerContainer.appendChild(hudRow);

        var finalRetention = displayStages.length > 0 ? displayStages[displayStages.length - 1].survivorPct.toFixed(1) + "%" : "0%";
        var worstChokeText = worstChokeStage ? worstChokeStage.label + " (-" + worstChokeStage.hazardRate.toFixed(1) + "%)" : "None";

        var kpiCards = [
          { label: "Intake Entrants (L1)", value: formatValue(initialVolume, config.valueFormat || "compact_num"), subtext: "Starting Cohort", icon: "🚀" },
          { label: "Final Stage Survival", value: finalRetention, subtext: "End-of-Funnel Completion", icon: "🎯" },
          { label: "Worst Choke Point", value: worstChokeText, subtext: worstChokeStage ? "Z-Score: +" + worstChokeStage.zScore.toFixed(1) + "σ" : "Normal Decay", icon: "⚠️", alert: !!worstChokeStage },
          { label: targetValue !== null ? (config.referenceLineLabel || "Retention Target") : "Half-Life Milestone", value: targetValue !== null ? formatValue(targetValue, config.valueFormat || "compact_num") : p50Level, subtext: targetValue !== null ? (targetMode.replace(/_/g, " ").toUpperCase()) : "50% Survivor Benchmark", icon: targetValue !== null ? "📐" : "⏳" }
        ];

        for (var c = 0; c < kpiCards.length; c++) {
          var card = kpiCards[c];
          var cardEl = document.createElement("div");
          cardEl.style.padding = "6px 10px";
          cardEl.style.borderRadius = "6px";
          cardEl.style.background = card.alert ? theme.chokePointBg : theme.cardBg;
          cardEl.style.border = "1px solid " + (card.alert ? theme.chokePointBorder : theme.border);
          cardEl.style.display = "flex";
          cardEl.style.flexDirection = "column";
          cardEl.style.justifyContent = "center";
          cardEl.innerHTML = "<div style='display:flex;align-items:center;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;color:" + (card.alert ? theme.chokePointText : theme.subtext) + ";font-weight:600;'>" +
            "<span>" + card.label + "</span><span>" + card.icon + "</span></div>" +
            "<div style='font-size:15px;font-weight:700;color:" + (card.alert ? theme.chokePointText : theme.text) + ";margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" + card.value + "</div>" +
            "<div style='font-size:10px;color:" + (card.alert ? theme.chokePointText : theme.subtext) + ";opacity:0.85;'>" + card.subtext + "</div>";
          hudRow.appendChild(cardEl);
        }
      } else if (hudMode === "compact") {
        var compactRow = document.createElement("div");
        compactRow.style.display = "flex";
        compactRow.style.alignItems = "center";
        compactRow.style.gap = "16px";
        compactRow.style.fontSize = "11px";
        compactRow.style.color = theme.subtext;
        compactRow.style.padding = "4px 8px";
        compactRow.style.background = theme.cardBg;
        compactRow.style.borderRadius = "4px";

        var finalRet = displayStages.length > 0 ? displayStages[displayStages.length - 1].survivorPct.toFixed(1) + "%" : "0%";
        compactRow.innerHTML = "<span><b>Entrants:</b> " + formatValue(initialVolume, config.valueFormat || "compact_num") + "</span>" +
          "<span>•</span><span><b>Final Retention:</b> " + finalRet + "</span>" +
          "<span>•</span><span><b>Peak Choke:</b> " + (worstChokeStage ? worstChokeStage.label + " (-" + worstChokeStage.hazardRate.toFixed(1) + "%)" : "None") + "</span>" +
          (targetValue !== null ? "<span>•</span><span><b>Target:</b> " + formatValue(targetValue, config.valueFormat || "compact_num") + "</span>" : "");
        headerContainer.appendChild(compactRow);
      }

      // 2. MAIN VISUALIZATION CANVAS (SVG)
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1";
      chartWrapper.style.position = "relative";
      chartWrapper.style.width = "100%";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.overflow = "hidden";
      root.appendChild(chartWrapper);

      var rect = chartWrapper.getBoundingClientRect();
      var width = rect.width || root.clientWidth || 800;
      var height = rect.height || 450;

      var margin = { top: 24, right: 64, bottom: 44, left: 64 };
      var innerWidth = Math.max(width - margin.left - margin.right, 100);
      var innerHeight = Math.max(height - margin.top - margin.bottom, 100);

      var d3 = window.d3;
      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Defs: Gradients and Markers
      var defs = svg.append("defs");

      var areaGrad = defs.append("linearGradient")
        .attr("id", "progressionAreaGrad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
      areaGrad.append("stop").attr("offset", "0%").attr("stop-color", theme.curveColor).attr("stop-opacity", 0.45);
      areaGrad.append("stop").attr("offset", "100%").attr("stop-color", theme.curveColor).attr("stop-opacity", 0.03);

      var spikeGrad = defs.append("linearGradient")
        .attr("id", "progressionSpikeGrad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
      spikeGrad.append("stop").attr("offset", "0%").attr("stop-color", theme.spikeBorder).attr("stop-opacity", 0.85);
      spikeGrad.append("stop").attr("offset", "100%").attr("stop-color", theme.spikeBorder).attr("stop-opacity", 0.25);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scalePoint()
        .domain(displayStages.map(function (d) { return d.label; }))
        .range([0, innerWidth])
        .padding(0.4);

      // Left Y-Scale: Survivor Volume / Retention %
      var maxVol = d3.max(displayStages, function (d) { return d.volume; }) || 1;
      if (targetValue !== null && targetValue > maxVol) maxVol = targetValue;

      var yLeft = d3.scaleLinear()
        .domain([0, maxVol * 1.1])
        .nice()
        .range([innerHeight, 0]);

      // Right Y-Scale: Marginal Churn % (Spikes) or Secondary Metric
      var maxHazardVal = d3.max(displayStages, function (d) { return d.hazardRate; }) || 10;
      var yRight = d3.scaleLinear()
        .domain([0, Math.max(100, Math.ceil(maxHazardVal * 1.25))])
        .nice()
        .range([innerHeight, 0]);

      // Secondary Metric Scale if in difficulty_pacing mode
      var maxSec = d3.max(displayStages, function (d) { return d.secondary; }) || 1;
      var ySecondary = d3.scaleLinear()
        .domain([0, maxSec * 1.15])
        .nice()
        .range([innerHeight, 0]);

      // Gridlines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yLeft)
          .tickSize(-innerWidth)
          .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", theme.border)
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-opacity", 0.6);
      g.select(".grid .domain").remove();

      // Reference Line / Benchmark Target
      if (targetValue !== null && targetMode !== "none") {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yLeft(targetValue))
          .attr("y2", yLeft(targetValue))
          .attr("stroke", theme.secondaryColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "6,3");

        g.append("text")
          .attr("x", innerWidth - 6)
          .attr("y", yLeft(targetValue) - 6)
          .attr("text-anchor", "end")
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", theme.secondaryColor)
          .text((config.referenceLineLabel || "Target") + ": " + formatValue(targetValue, config.valueFormat || "compact_num"));
      }

      var layoutMode = config.curveLayout || "dual_axis_spikes";

      // -------------------------------------------------------------
      // MODE 1 & MODE 2 & MODE 4: Progression Curve & Dual Axis
      // -------------------------------------------------------------
      if (layoutMode === "dual_axis_spikes" || layoutMode === "survival_decay" || layoutMode === "difficulty_pacing") {
        var smoothing = config.curveSmoothing || "catmull_rom";
        var curveFunc = d3.curveCatmullRom.alpha(0.5);
        if (smoothing === "linear") curveFunc = d3.curveLinear;
        if (smoothing === "monotone_x") curveFunc = d3.curveMonotoneX;

        // Render Spikes / Hazard Bars on Right Axis
        if (layoutMode === "dual_axis_spikes") {
          var barW = Math.max(6, Math.min(28, (innerWidth / displayStages.length) * 0.35));
          g.selectAll(".hazard-bar")
            .data(displayStages.filter(function (d) { return d.index > 0; }))
            .enter()
            .append("rect")
            .attr("class", "hazard-bar")
            .attr("x", function (d) { return xScale(d.label) - barW / 2; })
            .attr("y", function (d) { return yRight(d.hazardRate); })
            .attr("width", barW)
            .attr("height", function (d) { return Math.max(0, innerHeight - yRight(d.hazardRate)); })
            .attr("rx", 3)
            .attr("fill", function (d) { return d.isChokePoint ? "url(#progressionSpikeGrad)" : "rgba(148, 163, 184, 0.25)"; })
            .attr("stroke", function (d) { return d.isChokePoint ? theme.spikeBorder : "transparent"; })
            .attr("stroke-width", 1.5);
        }

        // Render Theoretical Benchmark Line (Survival Decay Mode)
        if (layoutMode === "survival_decay") {
          var decayConst = displayStages.length > 1 ? Math.log(displayStages[0].volume / Math.max(1, displayStages[displayStages.length - 1].volume)) / (displayStages.length - 1) : 0.1;
          var benchmarkLine = d3.line()
            .curve(d3.curveBasis)
            .x(function (d, idx) { return xScale(d.label); })
            .y(function (d, idx) {
              var idealVal = displayStages[0].volume * Math.exp(-decayConst * idx);
              return yLeft(idealVal);
            });

          g.append("path")
            .datum(displayStages)
            .attr("fill", "none")
            .attr("stroke", theme.benchmarkColor)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4")
            .attr("d", benchmarkLine);

          g.append("text")
            .attr("x", innerWidth - 10)
            .attr("y", yLeft(displayStages[0].volume * Math.exp(-decayConst * (displayStages.length - 1))) - 8)
            .attr("text-anchor", "end")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("fill", theme.benchmarkColor)
            .text("Theoretical Power-Law Benchmark");
        }

        // Area Generator
        var areaGen = d3.area()
          .curve(curveFunc)
          .x(function (d) { return xScale(d.label); })
          .y0(innerHeight)
          .y1(function (d) { return yLeft(d.volume); });

        var pathGen = d3.line()
          .curve(curveFunc)
          .x(function (d) { return xScale(d.label); })
          .y(function (d) { return yLeft(d.volume); });

        var areaOpacityVal = config.areaOpacity === "subtle" ? 0.15 : (config.areaOpacity === "solid" ? 0.50 : 0.30);

        // Area Shading
        g.append("path")
          .datum(displayStages)
          .attr("fill", "url(#progressionAreaGrad)")
          .attr("fill-opacity", areaOpacityVal)
          .attr("d", areaGen);

        // Progression Spline Stroke
        g.append("path")
          .datum(displayStages)
          .attr("fill", "none")
          .attr("stroke", theme.curveColor)
          .attr("stroke-width", 3.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("d", pathGen);

        // Secondary Metric Line if in Difficulty Pacing Mode
        if (layoutMode === "difficulty_pacing" && secondaryMeasure) {
          var secLineGen = d3.line()
            .curve(curveFunc)
            .x(function (d) { return xScale(d.label); })
            .y(function (d) { return ySecondary(d.secondary); });

          g.append("path")
            .datum(displayStages)
            .attr("fill", "none")
            .attr("stroke", theme.secondaryColor)
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "4,2")
            .attr("d", secLineGen);

          g.selectAll(".sec-node")
            .data(displayStages)
            .enter()
            .append("circle")
            .attr("class", "sec-node")
            .attr("cx", function (d) { return xScale(d.label); })
            .attr("cy", function (d) { return ySecondary(d.secondary); })
            .attr("r", 4)
            .attr("fill", theme.bg)
            .attr("stroke", theme.secondaryColor)
            .attr("stroke-width", 2);
        }

        // Progression Data Points (Circles)
        var nodes = g.selectAll(".progression-node")
          .data(displayStages)
          .enter()
          .append("g")
          .attr("class", "progression-node")
          .attr("transform", function (d) { return "translate(" + xScale(d.label) + "," + yLeft(d.volume) + ")"; });

        nodes.append("circle")
          .attr("r", function (d) { return d.isChokePoint ? 7 : 5; })
          .attr("fill", function (d) { return d.isChokePoint ? theme.spikeBorder : theme.bg; })
          .attr("stroke", function (d) { return d.isChokePoint ? "#ffffff" : theme.curveColor; })
          .attr("stroke-width", 2.5);

        // Choke Point Badges / Anomaly Flags
        if (config.highlightWorstChoke !== false) {
          var chokeNodes = nodes.filter(function (d) { return d.isChokePoint; });

          chokeNodes.append("rect")
            .attr("x", -44)
            .attr("y", -30)
            .attr("width", 88)
            .attr("height", 18)
            .attr("rx", 9)
            .attr("fill", theme.spikeBorder)
            .attr("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.25))");

          chokeNodes.append("text")
            .attr("x", 0)
            .attr("y", -17)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", "#ffffff")
            .text(function (d) { return "⚠️ CHOKE -" + d.hazardRate.toFixed(0) + "%"; });
        }

        // Data Value & Retention Labels
        var labelDensity = config.dataLabelDensity || "all";
        if (labelDensity !== "hidden") {
          var targetNodes = nodes;
          if (labelDensity === "peaks") {
            targetNodes = nodes.filter(function (d) { return d.isChokePoint || d.index === 0 || d.index === displayStages.length - 1; });
          } else {
            targetNodes = nodes.filter(function (d) { return !d.isChokePoint || config.highlightWorstChoke === false; });
          }

          targetNodes.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", theme.text)
            .text(function (d) {
              return formatValue(d.volume, config.valueFormat || "compact_num") + " (" + d.survivorPct.toFixed(0) + "%)";
            });
        }
      }

      // -------------------------------------------------------------
      // MODE 3: Milestone Step Waterfall
      // -------------------------------------------------------------
      if (layoutMode === "milestone_waterfall") {
        var stepW = Math.max(16, (innerWidth / displayStages.length) * 0.75);

        var waterfallG = g.selectAll(".waterfall-step")
          .data(displayStages)
          .enter()
          .append("g")
          .attr("class", "waterfall-step")
          .attr("transform", function (d) { return "translate(" + (xScale(d.label) - stepW / 2) + ",0)"; });

        waterfallG.append("rect")
          .attr("x", 0)
          .attr("y", function (d) { return yLeft(d.volume); })
          .attr("width", stepW)
          .attr("height", function (d) { return innerHeight - yLeft(d.volume); })
          .attr("rx", 4)
          .attr("fill", theme.curveColor)
          .attr("opacity", 0.85);

        waterfallG.filter(function (d) { return d.index > 0 && d.stepDropoff > 0; })
          .append("rect")
          .attr("x", 0)
          .attr("y", function (d) {
            var prev = displayStages[d.index - 1];
            return yLeft(prev.volume);
          })
          .attr("width", stepW)
          .attr("height", function (d) {
            var prev = displayStages[d.index - 1];
            return Math.max(2, yLeft(d.volume) - yLeft(prev.volume));
          })
          .attr("rx", 3)
          .attr("fill", theme.spikeBorder)
          .attr("opacity", 0.7);

        waterfallG.filter(function (d) { return d.index > 0; })
          .append("line")
          .attr("x1", -((innerWidth / displayStages.length) - stepW) / 2)
          .attr("y1", function (d) { return yLeft(displayStages[d.index - 1].volume); })
          .attr("x2", 0)
          .attr("y2", function (d) { return yLeft(displayStages[d.index - 1].volume); })
          .attr("stroke", theme.subtext)
          .attr("stroke-dasharray", "2,2");

        var labelDensityWF = config.dataLabelDensity || "all";
        if (labelDensityWF !== "hidden") {
          waterfallG.append("text")
            .attr("x", stepW / 2)
            .attr("y", function (d) { return yLeft(d.volume) - 6; })
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", theme.text)
            .text(function (d) { return d.survivorPct.toFixed(0) + "%"; });
        }
      }

      // X-AXIS
      var xAxis = g.append("g")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(d3.axisBottom(xScale).tickSize(6));

      xAxis.select(".domain").attr("stroke", theme.border);
      xAxis.selectAll(".tick line").attr("stroke", theme.border);
      xAxis.selectAll(".tick text")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", theme.text)
        .attr("dy", "10px");

      if (displayStages.length > 8) {
        xAxis.selectAll(".tick text")
          .attr("transform", "rotate(-25)")
          .style("text-anchor", "end")
          .attr("dx", "-6px")
          .attr("dy", "6px");
      }

      // DUAL Y-AXES
      var yAxisLeft = g.append("g")
        .call(d3.axisLeft(yLeft).ticks(5).tickFormat(function (d) { return formatValue(d, config.valueFormat || "compact_num"); }));
      yAxisLeft.select(".domain").attr("stroke", theme.border);
      yAxisLeft.selectAll(".tick line").attr("stroke", theme.border);
      yAxisLeft.selectAll(".tick text").attr("font-size", "10px").attr("fill", theme.subtext);

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 16)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", theme.curveColor)
        .text("Active Survivor Volume");

      if (layoutMode === "dual_axis_spikes" || (layoutMode === "difficulty_pacing" && secondaryMeasure)) {
        var rightScaleToUse = (layoutMode === "difficulty_pacing" && secondaryMeasure) ? ySecondary : yRight;
        var yAxisRight = g.append("g")
          .attr("transform", "translate(" + innerWidth + ",0)")
          .call(d3.axisRight(rightScaleToUse).ticks(5).tickFormat(function (d) {
            return (layoutMode === "difficulty_pacing" && secondaryMeasure) ? formatValue(d, config.valueFormat || "compact_num") : d + "%";
          }));
        yAxisRight.select(".domain").attr("stroke", theme.border);
        yAxisRight.selectAll(".tick line").attr("stroke", theme.border);
        yAxisRight.selectAll(".tick text").attr("font-size", "10px").attr("fill", (layoutMode === "difficulty_pacing" && secondaryMeasure) ? theme.secondaryColor : theme.spikeBorder);

        g.append("text")
          .attr("transform", "rotate(90)")
          .attr("y", -innerWidth - margin.right + 20)
          .attr("x", innerHeight / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", (layoutMode === "difficulty_pacing" && secondaryMeasure) ? theme.secondaryColor : theme.spikeBorder)
          .text((layoutMode === "difficulty_pacing" && secondaryMeasure) ? "Secondary Pacing Metric" : "Step Drop-off Hazard %");
      }

      // 3. INTERACTIVE CROSSHAIR & TOOLTIP OVERLAY
      var tooltip = document.createElement("div");
      tooltip.className = "progression-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = theme.tooltipBg;
      tooltip.style.color = theme.text;
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.border = "1px solid " + theme.tooltipBorder;
      tooltip.style.fontSize = "12px";
      tooltip.style.zIndex = "100";
      tooltip.style.minWidth = "180px";
      chartWrapper.appendChild(tooltip);

      var crosshair = g.append("line")
        .attr("stroke", theme.text)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("opacity", 0)
        .style("pointer-events", "none");

      // Overlay for Mouse Events & Drill-Down
      var overlay = g.append("rect")
        .attr("class", "overlay")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

      var stageWidth = innerWidth / displayStages.length;

      overlay.on("mousemove", function (event) {
        var coords = d3.pointer(event, g.node());
        var mouseX = coords[0];
        var mouseY = coords[1];

        // Find nearest stage
        var nearestIdx = 0;
        var minDist = 999999;
        for (var i = 0; i < displayStages.length; i++) {
          var px = xScale(displayStages[i].label);
          var dist = Math.abs(mouseX - px);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = i;
          }
        }

        var d = displayStages[nearestIdx];
        var curX = xScale(d.label);

        crosshair.attr("x1", curX).attr("x2", curX).style("opacity", 0.7);

        // Tooltip Content
        var statusBadge = d.isChokePoint ?
          "<span style='color:" + theme.spikeBorder + ";font-weight:700;'>⚠️ Critical Bottleneck (Z: +" + d.zScore.toFixed(1) + "σ)</span>" :
          "<span style='color:" + theme.secondaryColor + ";font-weight:600;'>✓ Normal Progression Pace</span>";

        var secMetricRow = (layoutMode === "difficulty_pacing" && secondaryMeasure) ?
          "<div style='display:flex;justify-content:space-between;gap:12px;margin-top:2px;color:" + theme.secondaryColor + ";font-weight:600;'><span>Pacing Telemetry:</span><span>" + formatValue(d.secondary, config.valueFormat || "compact_num") + "</span></div>" : "";

        var targetRow = targetValue !== null ?
          "<div style='display:flex;justify-content:space-between;gap:12px;margin-top:2px;color:" + theme.subtext + ";'><span>" + (config.referenceLineLabel || "Target") + ":</span><span>" + formatValue(targetValue, config.valueFormat || "compact_num") + "</span></div>" : "";

        tooltip.innerHTML =
          "<div style='font-size:13px;font-weight:700;margin-bottom:4px;color:" + theme.accent + ";'>" + d.label + "</div>" +
          "<div style='margin-bottom:6px;font-size:11px;'>" + statusBadge + "</div>" +
          "<div style='border-top:1px solid " + theme.border + ";padding-top:4px;display:flex;flex-direction:column;gap:2px;'>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Active Survivors:</span><b>" + formatValue(d.volume, config.valueFormat || "compact_num") + "</b></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Cumulative Retention:</span><b>" + d.survivorPct.toFixed(1) + "%</b></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;'><span>Step Drop-off Loss:</span><b>-" + formatValue(d.stepDropoff, config.valueFormat || "compact_num") + "</b></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;color:" + (d.isChokePoint ? theme.spikeBorder : theme.text) + ";'><span>Marginal Hazard %:</span><b>" + d.hazardRate.toFixed(1) + "%</b></div>" +
          secMetricRow +
          targetRow +
          "</div>" +
          "<div style='margin-top:6px;font-size:10px;color:" + theme.subtext + ";text-align:right;'>Click to open Looker Drill Menu ↗</div>";

        tooltip.style.display = "block";

        var tipW = tooltip.offsetWidth || 200;
        var tipH = tooltip.offsetHeight || 130;

        var tipX = curX + margin.left + 15;
        if (tipX + tipW > width - 10) {
          tipX = curX + margin.left - tipW - 15;
        }

        var tipY = Math.min(innerHeight + margin.top - tipH, Math.max(margin.top, mouseY + margin.top - 20));
        tooltip.style.left = tipX + "px";
        tooltip.style.top = tipY + "px";
      });

      overlay.on("mouseleave", function () {
        crosshair.style("opacity", 0);
        tooltip.style.display = "none";
      });

      // Drill-Down Support
      overlay.on("click", function (event) {
        var coords = d3.pointer(event, g.node());
        var mouseX = coords[0];
        var nearestIdx = 0;
        var minDist = 999999;
        for (var i = 0; i < displayStages.length; i++) {
          var px = xScale(displayStages[i].label);
          var dist = Math.abs(mouseX - px);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = i;
          }
        }
        var d = displayStages[nearestIdx];
        if (d && d.firstRow && stageDim && d.firstRow[stageDim] && d.firstRow[stageDim].links) {
          if (typeof LookerCharts !== "undefined" && LookerCharts.Utils && typeof LookerCharts.Utils.openDrillMenu === "function") {
            LookerCharts.Utils.openDrillMenu({
              links: d.firstRow[stageDim].links,
              event: event
            });
          }
        }
      });
    }
  });
})();
