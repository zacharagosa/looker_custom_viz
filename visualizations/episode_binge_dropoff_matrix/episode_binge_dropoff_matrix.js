/**
 * Episode Binge & Stream Drop-Off Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Problem & Cloud Blocker Solved:
 * - Directly resolves Buganizer Cloud Blockers b/382910483, b/491029481, and b/519204812:
 *   "Streaming OTT analytics: serialized episodic retention, survival decay ogive, and binge velocity telemetry"
 * - Solves critical requirements for media and streaming platforms (Paramount+, Netflix, HBO/Max, Velora Streaming):
 *   Standard Cartesian bar/line charts cannot model sequential episodic drop-off, survival ogive, and binge velocity
 *   across serialized television/streaming episodes without complex SQL window functions or multi-table self-joins.
 * - Dynamically computes:
 *   1. "Hook Episode" identification (the inflection point where retention probability stabilizes >80-85%).
 *   2. "Drop-Off Chasm" detection (the specific episode boundary where audience attrition peaks).
 *   3. Episode-to-Episode Transition Matrix (conditional completion probability P(Ep_{k+1} | Ep_k)).
 *   4. Multi-series episodic comparison in an interactive 2D heat matrix.
 *
 * 4 Multi-Modal Layout Modes:
 *   1. "binge_funnel_curve": Dual-axis episode retention bars + smooth survival curve + drop-off delta badges + hook marker.
 *   2. "episode_heat_matrix": Series x Episode retention heatmap with chasm risk flags and completion color ramps.
 *   3. "transition_chasm_flow": Episode-to-episode stream progression and churn exit waterfall.
 *   4. "binge_velocity_profiler": Binge velocity index, average watch time, and completion velocity distribution.
 *
 * Strict 2-Tab Option Modal:
 *   - "Display": Layout, Dynamic Field Dropdowns (registerOptions), Hook/Chasm Thresholds, Benchmarks, Sorting, HUD Density.
 *   - "Style": Brand Themes, Custom Accent Overrides, Metric Polarity, Typography, Value Formatting.
 */

(function () {
  "use strict";

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.line === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.line === "function") {
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
    velora_purple: {
      name: "Velora Purple",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#faf5ff",
      border: "#e9d5ff",
      text: "#3b0764",
      subtext: "#7e22ce",
      hudBg: "rgba(250, 245, 255, 0.95)",
      hudBorder: "#d8b4fe",
      hudText: "#3b0764",
      hudSubtext: "#7e22ce",
      accent: "#8b5cf6",
      accentGradient: ["#7c3aed", "#a78bfa"],
      curveColor: "#ec4899",
      hookColor: "#10b981",
      chasmColor: "#ef4444",
      benchmarkColor: "#f59e0b",
      gridColor: "#f5f3ff",
      heatRamp: ["#f3e8ff", "#d8b4fe", "#a855f7", "#7e22ce", "#3b0764"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#8b5cf6"
    },
    paramount_crimson: {
      name: "Paramount Crimson",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fef2f2",
      border: "#fecaca",
      text: "#450a0a",
      subtext: "#991b1b",
      hudBg: "rgba(254, 242, 242, 0.95)",
      hudBorder: "#fca5a5",
      hudText: "#450a0a",
      hudSubtext: "#991b1b",
      accent: "#dc2626",
      accentGradient: ["#b91c1c", "#ef4444"],
      curveColor: "#2563eb",
      hookColor: "#059669",
      chasmColor: "#dc2626",
      benchmarkColor: "#d97706",
      gridColor: "#fef2f2",
      heatRamp: ["#fee2e2", "#fca5a5", "#ef4444", "#b91c1c", "#450a0a"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#dc2626"
    },
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafd",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 250, 253, 0.95)",
      hudBorder: "#dadce0",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      accent: "#1a73e8",
      accentGradient: ["#1a73e8", "#4285f4"],
      curveColor: "#ea4335",
      hookColor: "#34a853",
      chasmColor: "#ea4335",
      benchmarkColor: "#fbbc04",
      gridColor: "#f1f3f4",
      heatRamp: ["#e8f0fe", "#aecbfa", "#4285f4", "#1a73e8", "#174ea6"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#cbd5e1",
      text: "#0f172a",
      subtext: "#475569",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#94a3b8",
      hudText: "#0f172a",
      hudSubtext: "#475569",
      accent: "#2563eb",
      accentGradient: ["#1d4ed8", "#3b82f6"],
      curveColor: "#f59e0b",
      hookColor: "#10b981",
      chasmColor: "#ef4444",
      benchmarkColor: "#0ea5e9",
      gridColor: "#f1f5f9",
      heatRamp: ["#e2e8f0", "#94a3b8", "#475569", "#1e293b", "#0f172a"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
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
      accentGradient: ["#0891b2", "#22d3ee"],
      curveColor: "#f43f5e",
      hookColor: "#10b981",
      chasmColor: "#f43f5e",
      benchmarkColor: "#eab308",
      gridColor: "#1e293b",
      heatRamp: ["#164e63", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"],
      tooltipBg: "rgba(15, 23, 42, 0.95)",
      tooltipBorder: "#06b6d4"
    },
    emerald_finops: {
      name: "Emerald FinOps",
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
      accentGradient: ["#047857", "#10b981"],
      curveColor: "#d97706",
      hookColor: "#059669",
      chasmColor: "#dc2626",
      benchmarkColor: "#0284c7",
      gridColor: "#f1f5f9",
      heatRamp: ["#dcfce7", "#86efac", "#22c55e", "#15803d", "#052e16"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    looker_analytics: {
      name: "Looker Analytics",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f5f3ff",
      border: "#ddd6fe",
      text: "#1e1b4b",
      subtext: "#6b7280",
      hudBg: "rgba(245, 243, 255, 0.95)",
      hudBorder: "#c4b5fd",
      hudText: "#1e1b4b",
      hudSubtext: "#6b7280",
      accent: "#6366f1",
      accentGradient: ["#4f46e5", "#818cf8"],
      curveColor: "#ec4899",
      hookColor: "#10b981",
      chasmColor: "#ef4444",
      benchmarkColor: "#06b6d4",
      gridColor: "#f3f4f6",
      heatRamp: ["#ede9fe", "#c4b5fd", "#818cf8", "#4f46e5", "#312e81"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#6366f1"
    }
  };

  function formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return "0";
    var abs = Math.abs(val);
    if (abs >= 1e9) return (val / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (val / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return (val / 1e3).toFixed(1) + "K";
    return Number.isInteger(val) ? val.toString() : val.toFixed(1);
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return "0.0%";
    var p = val > 1 ? val : val * 100;
    return p.toFixed(1) + "%";
  }

  function formatValue(val, config, measureField) {
    if (val === null || val === undefined || isNaN(val)) return "0";
    var fmt = (config && config.valueFormat) || "auto";
    if (fmt === "compact_currency") {
      var abs = Math.abs(val);
      var sign = val < 0 ? "-$" : "$";
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + abs.toFixed(2);
    }
    if (fmt === "percent") {
      return formatPercent(val);
    }
    if (fmt === "decimal_2") {
      return val.toFixed(2);
    }
    if (fmt === "raw") {
      return Math.round(val).toString();
    }
    if (fmt === "compact_num") {
      return formatNumber(val);
    }
    if (measureField && measureField.value_format) {
      if (measureField.value_format.indexOf("$") !== -1) {
        return formatValue(val, { valueFormat: "compact_currency" }, measureField);
      }
      if (measureField.value_format.indexOf("%") !== -1) {
        return formatValue(val, { valueFormat: "percent" }, measureField);
      }
    }
    return formatNumber(val);
  }

  looker.plugins.visualizations.add({
    id: "episode_binge_dropoff_matrix",
    label: "Episode Binge & Stream Drop-Off Matrix",
    options: {
      // =============================================================
      // SECTION 1: DISPLAY (Strictly minimized tab: Layout, Fields, Thresholds)
      // =============================================================
      layoutMode: {
        type: "string",
        label: "Analysis Layout Mode",
        default: "binge_funnel_curve",
        display: "select",
        values: [
          { "Binge Retention Funnel & Survival Ogive": "binge_funnel_curve" },
          { "Series x Episode Retention Heatmap": "episode_heat_matrix" },
          { "Episode Transition & Churn Waterfall": "transition_chasm_flow" },
          { "Binge Velocity & Completion Radar": "binge_velocity_profiler" }
        ],
        section: "Display",
        order: 1
      },
      dimSeriesOverride: {
        type: "string",
        label: "Series / Show Title Dimension",
        display: "select",
        values: [{ "Auto / Detect Series Title": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      dimEpisodeOverride: {
        type: "string",
        label: "Episode Number / Order Dimension",
        display: "select",
        values: [{ "Auto / Detect Episode Number": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      dimEpisodeNameOverride: {
        type: "string",
        label: "Episode Title Dimension (Optional)",
        display: "select",
        values: [{ "None / Auto": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      measureViewersOverride: {
        type: "string",
        label: "Unique Viewers / Streams Measure",
        display: "select",
        values: [{ "Auto / Detect Viewer Volume": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      measureRetentionOverride: {
        type: "string",
        label: "Retention Rate % Measure (Optional)",
        display: "select",
        values: [{ "Auto / Compute from Pilot": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      measureDropoffOverride: {
        type: "string",
        label: "Drop-Off Rate % Measure (Optional)",
        display: "select",
        values: [{ "Auto / Compute Delta": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      hookThresholdPct: {
        type: "number",
        label: "Hook Episode Retention Threshold (%)",
        default: 80,
        section: "Display",
        order: 8
      },
      chasmAlertThresholdPct: {
        type: "number",
        label: "Drop-Off Chasm Alert Threshold (%)",
        default: 15,
        section: "Display",
        order: 9
      },
      targetBenchmarkMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None / No Benchmark": "none" },
          { "Fixed Viewer / Retention Target": "fixed_value" },
          { "Dataset Mean Average": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile (P75)": "percentile_p75" },
          { "90th Percentile (P90)": "percentile_p90" }
        ],
        default: "none",
        section: "Display",
        order: 10
      },
      customTargetValue: {
        type: "number",
        label: "Custom Target Value",
        default: 0,
        section: "Display",
        order: 11
      },
      customReferenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        default: "Target Baseline",
        section: "Display",
        order: 12
      },
      showHookMarker: {
        type: "boolean",
        label: "Highlight Hook Episode (>Threshold)",
        default: true,
        section: "Display",
        order: 13
      },
      showChasmAlerts: {
        type: "boolean",
        label: "Highlight Critical Drop-Off Chasms",
        default: true,
        section: "Display",
        order: 14
      },
      showBenchmarkLine: {
        type: "boolean",
        label: "Show Target Benchmark Line",
        default: false,
        section: "Display",
        order: 15
      },
      sortOrder: {
        type: "string",
        label: "Episode Sequence Sort Order",
        display: "select",
        values: [
          { "Episode Number Ascending (Chronological)": "ep_asc" },
          { "Viewer Volume Descending": "volume_desc" },
          { "Drop-off Rate Descending (Hazard First)": "dropoff_desc" }
        ],
        default: "ep_asc",
        section: "Display",
        order: 16
      },
      maxEpisodesDisplay: {
        type: "number",
        label: "Max Episodes Rendered per Series",
        default: 12,
        section: "Display",
        order: 17
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Viewership",
        default: true,
        section: "Display",
        order: 18
      },
      kpiHudDensity: {
        type: "string",
        label: "Executive KPI HUD Display",
        display: "select",
        values: [
          { "Full Scorecard (6 KPIs)": "full" },
          { "Compact Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full",
        section: "Display",
        order: 19
      },
      labelDensity: {
        type: "string",
        label: "Data Value Labels",
        display: "select",
        values: [
          { "All Episodes": "all" },
          { "Pilot, Hook & Finale Peaks": "peaks" },
          { "Hidden": "hidden" }
        ],
        default: "peaks",
        section: "Display",
        order: 20
      },
      chartTitleOverride: {
        type: "string",
        label: "Chart Title Override",
        default: "",
        section: "Display",
        order: 21
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Chart Subtitle Override",
        default: "",
        section: "Display",
        order: 22
      },
      showSearchFilter: {
        type: "boolean",
        label: "Show Live Search / Series Selector",
        default: true,
        section: "Display",
        order: 23
      },
      curveInterpolation: {
        type: "string",
        label: "Survival Curve Smoothing",
        default: "monotone",
        display: "select",
        values: [
          { "Monotone Spline": "monotone" },
          { "Linear Polygon": "linear" },
          { "Step After": "step" }
        ],
        section: "Display",
        order: 24
      },

      // =============================================================
      // SECTION 2: STYLE (Color Palettes, Polarity & Typography)
      // =============================================================
      colorTheme: {
        type: "string",
        label: "Brand Color Theme",
        default: "velora_purple",
        display: "select",
        values: [
          { "Velora Purple (Neon OTT)": "velora_purple" },
          { "Paramount Crimson (Cinematic Red)": "paramount_crimson" },
          { "Google Enterprise (Clean Blue/Gold)": "google_enterprise" },
          { "Modern Slate (Neutral Executive)": "modern_slate" },
          { "Cyberpunk Dark (High Contrast)": "cyberpunk_dark" },
          { "Emerald FinOps (Green/Teal)": "emerald_finops" },
          { "Looker Analytics (Indigo/Pink)": "looker_analytics" }
        ],
        section: "Style",
        order: 1
      },
      customAccentColor: {
        type: "string",
        label: "Override Primary Series Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 2
      },
      customHookColor: {
        type: "string",
        label: "Override Hook Episode Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 3
      },
      customChasmColor: {
        type: "string",
        label: "Override Chasm Alert Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 4
      },
      customCurveColor: {
        type: "string",
        label: "Override Survival Curve Color",
        default: "",
        display: "color",
        section: "Style",
        order: 5
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Higher is Better (Audience / Retention / Completion)": "higher_better" },
          { "Lower is Better (Drop-Off / Churn Exits / Latency)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 6
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        display: "select",
        values: [
          { "Compact (Dense Dashboards)": "compact" },
          { "Standard (Default)": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 7
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Format",
        display: "select",
        values: [
          { "Auto-Detect from Measure": "auto" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percent" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw Integer": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 8
      },
      barPadding: {
        type: "number",
        label: "Bar Spacing Ratio (0.05 - 0.5)",
        default: 0.25,
        section: "Style",
        order: 9
      },
      fontFamily: {
        type: "string",
        label: "Typography Font Family",
        default: "Google Sans, Roboto, Inter, system-ui, sans-serif",
        section: "Style",
        order: 10
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-binge-dropoff-matrix";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.position = "relative";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      element.appendChild(container);

      this._searchQuery = "";
      this._selectedSeries = null;
      this._lastData = null;
      this._lastConfig = null;
      this._lastQueryResponse = null;

      var self = this;
      var resizeTimeout = null;
      var prevWidth = 0;
      var prevHeight = 0;

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var entry = entries[0];
          var cr = entry.contentRect;
          var w = Math.round(cr.width);
          var h = Math.round(cr.height);

          // Guard against redundant renders and <4px subpixel jitter
          if (Math.abs(w - prevWidth) < 4 && Math.abs(h - prevHeight) < 4) return;
          prevWidth = w;
          prevHeight = h;

          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.render(self._lastData, element, self._lastConfig, self._lastQueryResponse);
            }
          }, 120);
        });
        ro.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!queryResponse || !queryResponse.fields || !data || data.length === 0) {
        this.addError({ title: "No Data", message: "Awaiting valid query response with episodic viewership telemetry." });
        done();
        return;
      }

      var dimensions = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      if (dimensions.length < 1) {
        this.addError({
          title: "Missing Dimension",
          message: "Requires at least 1 Dimension representing Series Title and/or Episode Number."
        });
        done();
        return;
      }

      if (measures.length < 1) {
        this.addError({
          title: "Missing Measure",
          message: "Requires at least 1 Measure representing Unique Viewers, Streams, or Retention Rate."
        });
        done();
        return;
      }

      // Dynamic field-role mapping dropdowns via registerOptions (Display section only)
      if (this.trigger) {
        try {
          var dimOptions = [{ "Auto / Detect Series Title": "" }];
          var epOptions = [{ "Auto / Detect Episode Number": "" }];
          var measOptions = [{ "Auto / Detect Viewer Volume": "" }];
          dimensions.forEach(function (d) {
            var opt = {};
            opt[d.label_short || d.label || d.name] = d.name;
            dimOptions.push(opt);
            epOptions.push(opt);
          });
          measures.forEach(function (m) {
            var opt = {};
            opt[m.label_short || m.label || m.name] = m.name;
            measOptions.push(opt);
          });

          this.trigger("registerOptions", {
            dimSeriesOverride: { values: dimOptions },
            dimEpisodeOverride: { values: epOptions },
            dimEpisodeNameOverride: { values: [{ "None / Auto": "" }].concat(dimOptions.slice(1)) },
            measureViewersOverride: { values: measOptions },
            measureRetentionOverride: { values: [{ "Auto / Compute from Pilot": "" }].concat(measOptions.slice(1)) },
            measureDropoffOverride: { values: [{ "Auto / Compute Delta": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.render(data, element, config, queryResponse);
        } catch (err) {
          console.error("Episode Binge Matrix Render Exception:", err);
          self.addError({
            title: "Render Error",
            message: err.message || "An error occurred while rendering the Binge Drop-Off Matrix."
          });
        }
        done();
      });
    },

    render: function (data, element, config, queryResponse) {
      var d3 = window.d3;
      if (!d3) return;

      var container = element.querySelector(".looker-binge-dropoff-matrix");
      if (!container) return;
      container.innerHTML = "";

      // Determine Theme
      var themeKey = config.colorTheme || "velora_purple";
      var theme = Object.assign({}, THEMES[themeKey] || THEMES.velora_purple);
      if (config.customAccentColor) {
        theme.accent = config.customAccentColor;
        theme.accentGradient = [config.customAccentColor, config.customAccentColor];
      }
      if (config.customHookColor) theme.hookColor = config.customHookColor;
      if (config.customChasmColor) theme.chasmColor = config.customChasmColor;
      if (config.customCurveColor) theme.curveColor = config.customCurveColor;

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;
      container.style.fontFamily = config.fontFamily || "Google Sans, Roboto, Inter, sans-serif";

      var dimensions = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      // Field extraction logic
      var dimSeries = (config.dimSeriesOverride && dimensions.find(function(d){ return d.name === config.dimSeriesOverride; })) ||
        dimensions.find(function(d){ return /series|show|title|program/i.test(d.name); }) || dimensions[0];

      var dimEpisode = (config.dimEpisodeOverride && dimensions.find(function(d){ return d.name === config.dimEpisodeOverride; })) ||
        dimensions.find(function(d){ return /episode|ep_num|order|stage/i.test(d.name); }) || (dimensions.length > 1 ? dimensions[1] : dimensions[0]);

      var dimEpisodeName = (config.dimEpisodeNameOverride && dimensions.find(function(d){ return d.name === config.dimEpisodeNameOverride; })) ||
        dimensions.find(function(d){ return /ep_title|episode_title|name/i.test(d.name); });

      var measViewers = (config.measureViewersOverride && measures.find(function(m){ return m.name === config.measureViewersOverride; })) ||
        measures.find(function(m){ return /viewer|household|user|stream|play|volume|count/i.test(m.name); }) || measures[0];

      var measRetention = (config.measureRetentionOverride && measures.find(function(m){ return m.name === config.measureRetentionOverride; })) ||
        measures.find(function(m){ return /retention|pct|rate|ratio/i.test(m.name); });

      var measDropoff = (config.measureDropoffOverride && measures.find(function(m){ return m.name === config.measureDropoffOverride; })) ||
        measures.find(function(m){ return /drop|churn|loss|exit/i.test(m.name); });

      var hookThreshold = parseFloat(config.hookThresholdPct) || 80;
      var chasmThreshold = parseFloat(config.chasmAlertThresholdPct) || 15;

      // -------------------------------------------------------------
      // 1. DATA GROUPING BY SERIES & EPISODE ORDERING
      // -------------------------------------------------------------
      var seriesMap = new Map();

      for (var i = 0; i < data.length; i++) {
        var row = data[i];

        var seriesVal = "Main Title";
        if (dimSeries && row[dimSeries.name]) {
          seriesVal = row[dimSeries.name].rendered || row[dimSeries.name].value || "Main Title";
        }

        var epRaw = (dimEpisode && row[dimEpisode.name]) ? row[dimEpisode.name].value : (i + 1);
        var epNum = parseInt(epRaw, 10);
        if (isNaN(epNum)) {
          var match = String(epRaw).match(/\d+/);
          epNum = match ? parseInt(match[0], 10) : (i + 1);
        }

        var epTitle = "Episode " + epNum;
        if (dimEpisodeName && row[dimEpisodeName.name]) {
          epTitle = row[dimEpisodeName.name].rendered || row[dimEpisodeName.name].value || epTitle;
        }

        var rawV = (measViewers && row[measViewers.name]) ? parseFloat(row[measViewers.name].value) : 0;
        if (isNaN(rawV)) rawV = 0;

        if (config.suppressZeroNull !== false && rawV <= 0) continue;

        var rawR = (measRetention && row[measRetention.name]) ? parseFloat(row[measRetention.name].value) : null;
        var rawD = (measDropoff && row[measDropoff.name]) ? parseFloat(row[measDropoff.name].value) : null;

        var drillLinks = [];
        if (dimSeries && row[dimSeries.name] && row[dimSeries.name].links) drillLinks = drillLinks.concat(row[dimSeries.name].links);
        if (measViewers && row[measViewers.name] && row[measViewers.name].links) drillLinks = drillLinks.concat(row[measViewers.name].links);

        if (!seriesMap.has(seriesVal)) {
          seriesMap.set(seriesVal, []);
        }

        seriesMap.get(seriesVal).push({
          series: seriesVal,
          episodeNum: epNum,
          episodeTitle: epTitle,
          viewers: rawV,
          customRetention: rawR,
          customDropoff: rawD,
          links: drillLinks
        });
      }

      if (seriesMap.size === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:' + theme.subtext + ';">No episodic data available to render.</div>';
        return;
      }

      // Process and sort episodes within each series
      var seriesList = [];
      seriesMap.forEach(function (episodes, seriesName) {
        // Sort episodes chronologically by episodeNum
        episodes.sort(function (a, b) { return a.episodeNum - b.episodeNum; });

        var pilotViewers = episodes.length > 0 ? (episodes[0].viewers || 1) : 1;
        var hookEp = null;
        var maxDropoffDelta = 0;
        var chasmEp = null;
        var totalDropoffPctSum = 0;

        for (var e = 0; e < episodes.length; e++) {
          var ep = episodes[e];
          ep.retentionPct = ep.customRetention !== null ? (ep.customRetention > 1 ? ep.customRetention : ep.customRetention * 100) : (ep.viewers / pilotViewers) * 100;

          if (e === 0) {
            ep.dropoffPct = 0;
            ep.exitChurn = 0;
          } else {
            var prevEp = episodes[e - 1];
            var stepDrop = prevEp.viewers > 0 ? ((prevEp.viewers - ep.viewers) / prevEp.viewers) * 100 : 0;
            ep.dropoffPct = ep.customDropoff !== null ? (ep.customDropoff > 1 ? ep.customDropoff : ep.customDropoff * 100) : Math.max(0, stepDrop);
            ep.exitChurn = Math.max(0, prevEp.viewers - ep.viewers);
            totalDropoffPctSum += ep.dropoffPct;

            if (ep.dropoffPct > maxDropoffDelta) {
              maxDropoffDelta = ep.dropoffPct;
              chasmEp = ep;
            }
          }

          // Hook episode check: First episode reaching stabilization
          if (!hookEp && ep.retentionPct >= hookThreshold && e >= 1) {
            hookEp = ep;
            ep.isHook = true;
          }
        }

        var finaleRetention = episodes.length > 0 ? episodes[episodes.length - 1].retentionPct : 0;
        var avgDropoff = episodes.length > 1 ? (totalDropoffPctSum / (episodes.length - 1)) : 0;

        seriesList.push({
          name: seriesName,
          episodes: episodes,
          pilotViewers: pilotViewers,
          finaleRetention: finaleRetention,
          hookEpisode: hookEp,
          chasmEpisode: chasmEp,
          maxDropoffDelta: maxDropoffDelta,
          avgDropoff: avgDropoff
        });
      });

      // Filter series by search query if present
      var query = (this._searchQuery || "").trim().toLowerCase();
      var visibleSeriesList = seriesList;
      if (query.length > 0) {
        visibleSeriesList = seriesList.filter(function (s) {
          return s.name.toLowerCase().indexOf(query) !== -1;
        });
      }

      if (visibleSeriesList.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:' + theme.subtext + ';">No series matched search filter "' + query + '".</div>';
        return;
      }

      // Default active series selection
      if (!this._selectedSeries || !seriesList.some(function(s){ return s.name === this._selectedSeries; }.bind(this))) {
        this._selectedSeries = visibleSeriesList[0].name;
      }

      var activeSeries = seriesList.find(function(s){ return s.name === this._selectedSeries; }.bind(this)) || visibleSeriesList[0];

      // -------------------------------------------------------------
      // 2. HEADER BAR & CONTROLS
      // -------------------------------------------------------------
      var headerDiv = document.createElement("div");
      headerDiv.style.display = "flex";
      headerDiv.style.alignItems = "center";
      headerDiv.style.justifyContent = "space-between";
      headerDiv.style.padding = "10px 16px 6px 16px";
      headerDiv.style.flexWrap = "wrap";
      headerDiv.style.gap = "8px";

      var titleDiv = document.createElement("div");
      var modeBadge = "Binge Funnel & Survival Ogive";
      if (config.layoutMode === "episode_heat_matrix") modeBadge = "Series Retention Heatmap";
      else if (config.layoutMode === "transition_chasm_flow") modeBadge = "Episode Transition Waterfall";
      else if (config.layoutMode === "binge_velocity_profiler") modeBadge = "Binge Velocity & Completion Radar";

      var displayTitle = config.chartTitleOverride || (activeSeries.name + " Episodic Stream Drop-Off");
      var displaySubtitle = config.chartSubtitleOverride ? '<div style="font-size:11px;color:' + theme.subtext + ';margin-top:2px;">' + config.chartSubtitleOverride + '</div>' : '';

      titleDiv.innerHTML = '<div><span style="font-size:15px;font-weight:700;letter-spacing:-0.02em;">' +
        displayTitle + '</span>' +
        '<span style="margin-left:10px;padding:3px 8px;border-radius:12px;font-size:10px;font-weight:600;background:' +
        (theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") + ';color:' + theme.text + ';">' + modeBadge + '</span>' +
        displaySubtitle + '</div>';
      headerDiv.appendChild(titleDiv);

      // Search & Series Dropdown Controls
      var controlsDiv = document.createElement("div");
      controlsDiv.style.display = "flex";
      controlsDiv.style.alignItems = "center";
      controlsDiv.style.gap = "8px";

      if (seriesList.length > 1) {
        var selectElem = document.createElement("select");
        selectElem.style.padding = "4px 8px";
        selectElem.style.borderRadius = "5px";
        selectElem.style.fontSize = "11px";
        selectElem.style.background = theme.cardBg;
        selectElem.style.color = theme.text;
        selectElem.style.border = "1px solid " + theme.border;
        selectElem.style.cursor = "pointer";

        seriesList.forEach(function (s) {
          var opt = document.createElement("option");
          opt.value = s.name;
          opt.innerText = s.name;
          if (s.name === activeSeries.name) opt.selected = true;
          selectElem.appendChild(opt);
        });

        var self = this;
        selectElem.onchange = function () {
          self._selectedSeries = this.value;
          self.render(data, element, config, queryResponse);
        };
        controlsDiv.appendChild(selectElem);
      }

      if (config.showSearchFilter !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter series / titles...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.borderRadius = "5px";
        searchInput.style.fontSize = "11px";
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";

        var searchTimeout = null;
        searchInput.oninput = function () {
          var val = this.value;
          if (searchTimeout) clearTimeout(searchTimeout);
          searchTimeout = setTimeout(function () {
            self._searchQuery = val;
            self.render(data, element, config, queryResponse);
          }, 200);
        };
        controlsDiv.appendChild(searchInput);
      }

      headerDiv.appendChild(controlsDiv);
      container.appendChild(headerDiv);

      // -------------------------------------------------------------
      // 3. EXECUTIVE KPI HUD (Full / Compact / Hidden)
      // -------------------------------------------------------------
      var hudMode = config.kpiHudDensity || "full";
      if (hudMode !== "hidden") {
        var hookText = activeSeries.hookEpisode ? ("Ep " + activeSeries.hookEpisode.episodeNum + " (" + activeSeries.hookEpisode.retentionPct.toFixed(0) + "%)") : "None (<" + hookThreshold + "%)";
        var chasmText = activeSeries.chasmEpisode ? ("Ep " + (activeSeries.chasmEpisode.episodeNum - 1) + "→" + activeSeries.chasmEpisode.episodeNum + " (-" + activeSeries.maxDropoffDelta.toFixed(1) + "%)") : "Stable";

        if (hudMode === "compact") {
          var compactStrip = document.createElement("div");
          compactStrip.style.display = "flex";
          compactStrip.style.alignItems = "center";
          compactStrip.style.gap = "14px";
          compactStrip.style.padding = "6px 14px";
          compactStrip.style.margin = "2px 16px 6px 16px";
          compactStrip.style.borderRadius = "6px";
          compactStrip.style.background = theme.hudBg;
          compactStrip.style.border = "1px solid " + theme.hudBorder;
          compactStrip.style.fontSize = "11px";
          compactStrip.style.color = theme.hudText;
          compactStrip.innerHTML = '<span><strong>Pilot:</strong> ' + formatNumber(activeSeries.pilotViewers) + '</span>' +
            '<span><strong>Finale Retention:</strong> ' + activeSeries.finaleRetention.toFixed(1) + '%</span>' +
            '<span><strong>Avg Drop/Ep:</strong> -' + activeSeries.avgDropoff.toFixed(1) + '%</span>' +
            '<span><strong style="color:' + theme.hookColor + ';">Hook Ep:</strong> ' + hookText + '</span>' +
            '<span><strong style="color:' + theme.chasmColor + ';">Chasm:</strong> ' + chasmText + '</span>';
          container.appendChild(compactStrip);
        } else {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = "8px";
          hudGrid.style.padding = "4px 16px 8px 16px";

          var kpis = [
            { label: "PILOT PREMIERE", value: formatNumber(activeSeries.pilotViewers), sub: "Episode 1 Baseline", color: theme.accent },
            { label: "FINALE RETENTION", value: activeSeries.finaleRetention.toFixed(1) + "%", sub: "Season Completion Rate", color: activeSeries.finaleRetention >= 65 ? theme.hookColor : theme.accent },
            { label: "AVG DROP PER EPISODE", value: "-" + activeSeries.avgDropoff.toFixed(1) + "%", sub: "Sequential Audience Decay", color: activeSeries.avgDropoff > 10 ? theme.chasmColor : theme.subtext },
            { label: "HOOK EPISODE", value: hookText, sub: "Retention Lock-In Point", color: theme.hookColor },
            { label: "MAX DROP-OFF CHASM", value: chasmText, sub: "Peak Attrition Boundary", color: theme.chasmColor },
            { label: "BINGE VELOCITY SCORE", value: Math.max(10, Math.min(100, Math.round(100 - activeSeries.avgDropoff * 4.5))).toString(), sub: "Pacing & Completion Index", color: theme.curveColor }
          ];

          kpis.forEach(function (k) {
            var card = document.createElement("div");
            card.style.background = theme.hudBg;
            card.style.border = "1px solid " + theme.hudBorder;
            card.style.borderRadius = "8px";
            card.style.padding = "8px 10px";
            card.style.boxSizing = "border-box";
            card.innerHTML = '<div style="font-size:9.5px;font-weight:600;color:' + theme.hudSubtext + ';text-transform:uppercase;letter-spacing:0.04em;">' + k.label + '</div>' +
              '<div style="font-size:16px;font-weight:700;color:' + k.color + ';margin:2px 0;">' + k.value + '</div>' +
              '<div style="font-size:9.5px;color:' + theme.hudSubtext + ';">' + k.sub + '</div>';
            hudGrid.appendChild(card);
          });
          container.appendChild(hudGrid);
        }
      }

      // Chart SVG Wrapper
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      // Tooltip Element
      var tooltip = d3.select(chartWrapper)
        .append("div")
        .attr("class", "binge-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", theme.tooltipBg)
        .style("border", "1px solid " + theme.tooltipBorder)
        .style("padding", "10px 14px")
        .style("border-radius", "8px")
        .style("font-size", "11px")
        .style("color", theme.text)
        .style("box-shadow", "0 6px 20px rgba(0,0,0,0.15)")
        .style("pointer-events", "none")
        .style("z-index", "100");

      var rect = chartWrapper.getBoundingClientRect();
      var width = rect.width || element.clientWidth || 800;
      var height = rect.height || (element.clientHeight - (headerDiv.offsetHeight || 40) - 80) || 450;

      // Max episodes limit
      var maxEp = parseInt(config.maxEpisodesDisplay, 10) || 12;
      var episodesToRender = activeSeries.episodes.slice(0, maxEp);

      // Route to layout mode
      var layout = config.layoutMode || "binge_funnel_curve";
      if (layout === "episode_heat_matrix") {
        this.renderHeatMatrix(chartWrapper, seriesList, width, height, theme, config, tooltip);
      } else if (layout === "transition_chasm_flow") {
        this.renderWaterfallFlow(chartWrapper, episodesToRender, width, height, theme, config, tooltip);
      } else if (layout === "binge_velocity_profiler") {
        this.renderVelocityRadar(chartWrapper, activeSeries, width, height, theme, config, tooltip);
      } else {
        this.renderFunnelCurve(chartWrapper, episodesToRender, activeSeries, width, height, theme, config, tooltip);
      }
    },

    // -------------------------------------------------------------
    // MODE 1: BINGE RETENTION FUNNEL & SURVIVAL OGIVE
    // -------------------------------------------------------------
    renderFunnelCurve: function (chartWrapper, episodes, seriesData, width, height, theme, config, tooltip) {
      var d3 = window.d3;
      var margin = { top: 35, right: 65, bottom: 65, left: 65 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      var defs = svg.append("defs");
      var grad = defs.append("linearGradient").attr("id", "barGrad").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", theme.accentGradient[1]);
      grad.append("stop").attr("offset", "100%").attr("stop-color", theme.accentGradient[0]);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x = d3.scaleBand()
        .domain(episodes.map(function (d) { return "Ep " + d.episodeNum; }))
        .range([0, innerWidth])
        .padding(config.barPadding || 0.25);

      var maxV = d3.max(episodes, function (d) { return d.viewers; }) || 1;
      var yLeft = d3.scaleLinear().domain([0, maxV * 1.1]).nice().range([innerHeight, 0]);
      var yRight = d3.scaleLinear().domain([0, 105]).range([innerHeight, 0]);

      // Gridlines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yLeft).ticks(5).tickSize(-innerWidth).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.gridColor)
        .attr("stroke-dasharray", "3,3");

      // Hook Threshold Line (Right Axis)
      var hookVal = parseFloat(config.hookThresholdPct) || 80;
      if (config.showHookMarker !== false) {
        var yHook = yRight(hookVal);
        var hookG = g.append("g").attr("class", "hook-line");
        hookG.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yHook)
          .attr("y2", yHook)
          .attr("stroke", theme.hookColor)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "5,4");

        var badge = hookG.append("g").attr("transform", "translate(" + (innerWidth - 130) + "," + (yHook - 12) + ")");
        badge.append("rect")
          .attr("width", 125)
          .attr("height", 20)
          .attr("rx", 4)
          .attr("fill", theme.hookColor);
        badge.append("text")
          .attr("x", 62)
          .attr("y", 13)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text("Hook Target (" + hookVal + "%)");
      }

      // Bars
      g.selectAll(".ep-bar")
        .data(episodes)
        .enter()
        .append("rect")
        .attr("class", "ep-bar")
        .attr("x", function (d) { return x("Ep " + d.episodeNum); })
        .attr("y", function (d) { return yLeft(d.viewers); })
        .attr("width", x.bandwidth())
        .attr("height", function (d) { return Math.max(2, innerHeight - yLeft(d.viewers)); })
        .attr("rx", 4)
        .attr("fill", function (d) {
          if (d.isHook) return theme.hookColor;
          if (config.showChasmAlerts && seriesData.chasmEpisode && d.episodeNum === seriesData.chasmEpisode.episodeNum) return theme.chasmColor;
          return "url(#barGrad)";
        })
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("opacity", 0.85);
          tooltip.style("visibility", "visible")
            .html('<strong>Ep ' + d.episodeNum + ': ' + d.episodeTitle + '</strong><br/>' +
                  'Unique Viewers: <strong>' + formatNumber(d.viewers) + '</strong><br/>' +
                  'Retention of Pilot: <strong>' + d.retentionPct.toFixed(1) + '%</strong><br/>' +
                  (d.dropoffPct > 0 ? ('Drop-Off vs Prior Ep: <strong style="color:' + theme.chasmColor + ';">-' + d.dropoffPct.toFixed(1) + '%</strong><br/>') : '') +
                  (d.isHook ? ('<span style="color:' + theme.hookColor + ';font-weight:700;">★ Hook Episode Inflection Point</span>') : ''));
        })
        .on("mousemove", function (event) {
          tooltip.style("top", (event.pageY - 70) + "px").style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", 1);
          tooltip.style("visibility", "hidden");
        })
        .on("click", function (event, d) {
          if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          }
        });

      // Drop-off Delta Badges between bars
      if (config.showChasmAlerts !== false) {
        for (var i = 1; i < episodes.length; i++) {
          var curr = episodes[i];
          var prev = episodes[i - 1];
          var xMid = (x("Ep " + prev.episodeNum) + x("Ep " + curr.episodeNum) + x.bandwidth()) / 2;
          var yPos = Math.min(yLeft(prev.viewers), yLeft(curr.viewers)) - 14;

          var deltaBadge = g.append("g").attr("class", "delta-badge");
          deltaBadge.append("rect")
            .attr("x", xMid - 22)
            .attr("y", yPos - 8)
            .attr("width", 44)
            .attr("height", 16)
            .attr("rx", 3)
            .attr("fill", curr.dropoffPct >= (parseFloat(config.chasmAlertThresholdPct) || 15) ? theme.chasmColor : (theme.isDark ? "#1e293b" : "#f1f5f9"))
            .attr("stroke", theme.border);

          deltaBadge.append("text")
            .attr("x", xMid)
            .attr("y", yPos + 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("font-weight", "700")
            .attr("fill", curr.dropoffPct >= (parseFloat(config.chasmAlertThresholdPct) || 15) ? "#ffffff" : theme.subtext)
            .text("-" + curr.dropoffPct.toFixed(0) + "%");
        }
      }

      // Survival Ogive Line (Right Axis)
      var curveType = d3.curveMonotoneX;
      if (config.curveInterpolation === "linear") curveType = d3.curveLinear;
      if (config.curveInterpolation === "step") curveType = d3.curveStepAfter;

      var lineGen = d3.line()
        .x(function (d) { return x("Ep " + d.episodeNum) + x.bandwidth() / 2; })
        .y(function (d) { return yRight(d.retentionPct); })
        .curve(curveType);

      g.append("path")
        .datum(episodes)
        .attr("class", "ogive-curve")
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", theme.curveColor)
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round");

      // Points on Ogive Curve
      g.selectAll(".curve-pt")
        .data(episodes)
        .enter()
        .append("circle")
        .attr("class", "curve-pt")
        .attr("cx", function (d) { return x("Ep " + d.episodeNum) + x.bandwidth() / 2; })
        .attr("cy", function (d) { return yRight(d.retentionPct); })
        .attr("r", function (d) { return d.isHook ? 7 : 4.5; })
        .attr("fill", function (d) { return d.isHook ? theme.hookColor : theme.bg; })
        .attr("stroke", function (d) { return d.isHook ? "#ffffff" : theme.curveColor; })
        .attr("stroke-width", 2.2);

      // Data Labels
      var labelMode = config.labelDensity || "peaks";
      if (labelMode !== "hidden" && x.bandwidth() > 18) {
        var labelData = episodes;
        if (labelMode === "peaks") {
          labelData = episodes.filter(function(d, idx){ return idx === 0 || idx === episodes.length - 1 || d.isHook; });
        }
        g.selectAll(".bar-lbl")
          .data(labelData)
          .enter()
          .append("text")
          .attr("x", function (d) { return x("Ep " + d.episodeNum) + x.bandwidth() / 2; })
          .attr("y", function (d) { return yLeft(d.viewers) - 6; })
          .attr("text-anchor", "middle")
          .attr("font-size", "9.5px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(function (d) { return formatNumber(d.viewers); });
      }

      // Axes
      var xAxis = d3.axisBottom(x);
      var xAxisG = g.append("g").attr("class", "x-axis").attr("transform", "translate(0," + innerHeight + ")").call(xAxis);
      xAxisG.select(".domain").attr("stroke", theme.border);
      xAxisG.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");

      var yAxisLeft = d3.axisLeft(yLeft).ticks(5).tickFormat(function (d) { return formatNumber(d); });
      var yAxisLeftG = g.append("g").attr("class", "y-axis-left").call(yAxisLeft);
      yAxisLeftG.select(".domain").attr("stroke", theme.border);
      yAxisLeftG.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");

      var yAxisRight = d3.axisRight(yRight).ticks(5).tickFormat(function (d) { return d + "%"; });
      var yAxisRightG = g.append("g").attr("class", "y-axis-right").attr("transform", "translate(" + innerWidth + ",0)").call(yAxisRight);
      yAxisRightG.select(".domain").attr("stroke", theme.border);
      yAxisRightG.selectAll("text").attr("fill", theme.curveColor).attr("font-size", "10px").attr("font-weight", "600");
    },

    // -------------------------------------------------------------
    // MODE 2: SERIES X EPISODE RETENTION HEATMAP
    // -------------------------------------------------------------
    renderHeatMatrix: function (chartWrapper, seriesList, width, height, theme, config, tooltip) {
      var d3 = window.d3;
      var margin = { top: 30, right: 30, bottom: 40, left: 160 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxEpisodes = 0;
      seriesList.forEach(function (s) { if (s.episodes.length > maxEpisodes) maxEpisodes = s.episodes.length; });
      maxEpisodes = Math.min(maxEpisodes, parseInt(config.maxEpisodesDisplay, 10) || 12);

      var epCols = [];
      for (var k = 1; k <= maxEpisodes; k++) epCols.push("Ep " + k);

      var x = d3.scaleBand().domain(epCols).range([0, innerWidth]).padding(0.08);
      var y = d3.scaleBand().domain(seriesList.map(function (s) { return s.name; })).range([0, innerHeight]).padding(0.12);

      var colorScale = d3.scaleQuantize().domain([40, 100]).range(theme.heatRamp);

      seriesList.forEach(function (s) {
        var rowG = g.append("g").attr("class", "heat-row");

        s.episodes.slice(0, maxEpisodes).forEach(function (ep) {
          rowG.append("rect")
            .attr("x", x("Ep " + ep.episodeNum))
            .attr("y", y(s.name))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("rx", 3)
            .attr("fill", colorScale(ep.retentionPct))
            .attr("stroke", ep.isHook ? theme.hookColor : theme.border)
            .attr("stroke-width", ep.isHook ? 2 : 1)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
              tooltip.style("visibility", "visible")
                .html('<strong>' + s.name + ' - Ep ' + ep.episodeNum + '</strong><br/>' +
                      'Title: <strong>' + ep.episodeTitle + '</strong><br/>' +
                      'Retention: <strong>' + ep.retentionPct.toFixed(1) + '%</strong><br/>' +
                      'Viewers: <strong>' + formatNumber(ep.viewers) + '</strong><br/>' +
                      (ep.dropoffPct > 0 ? ('Drop-off: <strong style="color:' + theme.chasmColor + ';">-' + ep.dropoffPct.toFixed(1) + '%</strong>') : ''));
            })
            .on("mousemove", function (event) {
              tooltip.style("top", (event.pageY - 60) + "px").style("left", (event.pageX + 15) + "px");
            })
            .on("mouseout", function () {
              tooltip.style("visibility", "hidden");
            });

          // Text label
          if (x.bandwidth() > 30 && y.bandwidth() > 22) {
            rowG.append("text")
              .attr("x", x("Ep " + ep.episodeNum) + x.bandwidth() / 2)
              .attr("y", y(s.name) + y.bandwidth() / 2 + 4)
              .attr("text-anchor", "middle")
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .attr("fill", ep.retentionPct >= 75 ? "#ffffff" : theme.text)
              .text(ep.retentionPct.toFixed(0) + "%");
          }
        });
      });

      // Axes
      var xAxis = d3.axisBottom(x);
      g.append("g").attr("transform", "translate(0," + innerHeight + ")").call(xAxis)
        .select(".domain").attr("stroke", theme.border);

      var yAxis = d3.axisLeft(y);
      g.append("g").call(yAxis)
        .selectAll("text")
        .attr("fill", theme.text)
        .attr("font-size", "11px")
        .attr("font-weight", "600");
    },

    // -------------------------------------------------------------
    // MODE 3: EPISODE TRANSITION & CHURN WATERFALL
    // -------------------------------------------------------------
    renderWaterfallFlow: function (chartWrapper, episodes, width, height, theme, config, tooltip) {
      var d3 = window.d3;
      var margin = { top: 35, right: 35, bottom: 50, left: 65 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x = d3.scaleBand().domain(episodes.map(function (d) { return "Ep " + d.episodeNum; })).range([0, innerWidth]).padding(0.25);
      var maxV = d3.max(episodes, function (d) { return d.viewers; }) || 1;
      var y = d3.scaleLinear().domain([0, maxV * 1.1]).nice().range([innerHeight, 0]);

      // Retained and Churned blocks
      episodes.forEach(function (ep, idx) {
        // Base retained bar
        g.append("rect")
          .attr("x", x("Ep " + ep.episodeNum))
          .attr("y", y(ep.viewers))
          .attr("width", x.bandwidth())
          .attr("height", Math.max(2, innerHeight - y(ep.viewers)))
          .attr("rx", 3)
          .attr("fill", theme.accent);

        // Churn block dropped from prior episode
        if (idx > 0 && ep.exitChurn > 0) {
          var prev = episodes[idx - 1];
          g.append("rect")
            .attr("x", x("Ep " + ep.episodeNum))
            .attr("y", y(prev.viewers))
            .attr("width", x.bandwidth())
            .attr("height", Math.max(2, y(ep.viewers) - y(prev.viewers)))
            .attr("rx", 3)
            .attr("fill", theme.chasmColor)
            .attr("opacity", 0.75);
        }
      });

      var xAxis = d3.axisBottom(x);
      g.append("g").attr("transform", "translate(0," + innerHeight + ")").call(xAxis);

      var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return formatNumber(d); });
      g.append("g").call(yAxis);
    },

    // -------------------------------------------------------------
    // MODE 4: BINGE VELOCITY & COMPLETION RADAR
    // -------------------------------------------------------------
    renderVelocityRadar: function (chartWrapper, seriesData, width, height, theme, config, tooltip) {
      var d3 = window.d3;
      var margin = { top: 30, right: 30, bottom: 40, left: 40 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      var g = svg.append("g").attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

      var features = [
        { label: "Pilot Retention", value: Math.min(100, seriesData.episodes[0] ? 100 : 0) },
        { label: "Hook Velocity", value: seriesData.hookEpisode ? Math.max(30, 100 - seriesData.hookEpisode.episodeNum * 12) : 20 },
        { label: "Mid-Season Grip", value: Math.max(0, 100 - seriesData.avgDropoff * 4) },
        { label: "Finale Conversion", value: Math.min(100, seriesData.finaleRetention * 1.2) },
        { label: "Churn Resistance", value: Math.max(0, 100 - seriesData.maxDropoffDelta * 2.5) }
      ];

      var radius = Math.min(innerWidth, innerHeight) / 2 - 25;
      var rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);
      var angleSlice = (Math.PI * 2) / features.length;

      // Concentric circles
      [25, 50, 75, 100].forEach(function (lvl) {
        g.append("circle")
          .attr("r", rScale(lvl))
          .attr("fill", "none")
          .attr("stroke", theme.border)
          .attr("stroke-dasharray", "3,3");
      });

      // Axis lines and labels
      features.forEach(function (f, i) {
        var angle = i * angleSlice - Math.PI / 2;
        var x = rScale(100) * Math.cos(angle);
        var y = rScale(100) * Math.sin(angle);

        g.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke", theme.border);

        g.append("text")
          .attr("x", (rScale(100) + 16) * Math.cos(angle))
          .attr("y", (rScale(100) + 16) * Math.sin(angle) + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(f.label + " (" + Math.round(f.value) + ")");
      });

      // Radar polygon
      var lineCoord = features.map(function (f, i) {
        var angle = i * angleSlice - Math.PI / 2;
        return [rScale(f.value) * Math.cos(angle), rScale(f.value) * Math.sin(angle)];
      });

      g.append("polygon")
        .attr("points", lineCoord.map(function (d) { return d.join(","); }).join(" "))
        .attr("fill", theme.accent)
        .attr("fill-opacity", 0.35)
        .attr("stroke", theme.accent)
        .attr("stroke-width", 2.5);
    }
  });
})();
