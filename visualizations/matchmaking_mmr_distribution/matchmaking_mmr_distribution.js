/**
 * Matchmaking Latency & MMR Distribution Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise-Grade Flexibility Upgrade:
 * - 4 Multi-Modal Layout Modes:
 *     1. "gaussian_bell": Skill Bell Curve & Gaussian Fit (empirical player rating histogram with fitted normal curve & sigma bands).
 *     2. "latency_envelope": Queue Latency & Wait-Time Envelope (dual Y-axis with wait-time risk envelope & SLA threshold line).
 *     3. "tier_stratification": Competitive Rank Tier Stratification (Bronze to Grandmaster cohorts with cumulative CDF distribution).
 *     4. "winrate_parity": Fairness & Win-Rate Parity Matrix (skill delta vs Win Rate % with 50% parity line & blowout danger zones).
 * - Dynamic Field-Role Mapping via registerOptions:
 *     Re-map Skill Rating Dimension, Player Volume Measure, Wait Time Measure, Win Rate Measure, and Target Measure dynamically.
 * - Configurable Reference Lines, Targets & Thresholds:
 *     Customizable SLA Goal Mode (Fixed, Dataset Mean, Dataset Median, P75, P90, or Measure Column), SLA threshold value, reference line label, and high-latency risk alert threshold.
 * - Sorting, Top-N Bucketing & Null Suppression:
 *     Sort by Natural/Rating Ascending, Volume Descending, Volume Ascending, Alphabetical; Top-N cutoff with automatic 'Other' rollup; zero/null suppression.
 * - HUD, Legend & Label Density Controls:
 *     Executive Telemetry HUD (Full Scorecard, Compact Strip, Hidden), data value labels (All, Peaks Only, Hidden), custom title/subtitle override, interactive search bar.
 * - Custom Brand Palettes, Polarity & Typography:
 *     7 Brand Palettes (Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Custom Hex Override), custom color pickers, metric polarity toggle, font scale, value formats.
 * - High-Density 5,000+ Row Scalability:
 *     Fast client-side O(N) rollup, adaptive binning, debounced ResizeObserver (<4px guard), Looker drill-down menu support.
 * - Strict 2-Tab Options Modal: "Display" and "Style" to avoid crowded Looker edit modal headers.
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
      name: "Google Enterprise (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 249, 250, 0.96)",
      hudBorder: "#dadce0",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      accent: "#1a73e8",
      barColor: "rgba(26, 115, 232, 0.40)",
      barBorder: "#1a73e8",
      gaussianLine: "#ea4335",
      gaussianFill: "rgba(234, 67, 53, 0.12)",
      latencyLine: "#f9ab00",
      latencyEnvelope: "rgba(249, 171, 0, 0.20)",
      slaLine: "#d93025",
      parityLine: "#1e8e3e",
      fairZone: "rgba(30, 142, 62, 0.12)",
      dangerZone: "rgba(217, 48, 37, 0.12)",
      cdfLine: "#9334e6",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Studio Slate (Light)",
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
      barColor: "rgba(37, 99, 235, 0.40)",
      barBorder: "#2563eb",
      gaussianLine: "#dc2626",
      gaussianFill: "rgba(220, 38, 38, 0.12)",
      latencyLine: "#d97706",
      latencyEnvelope: "rgba(217, 119, 6, 0.18)",
      slaLine: "#b91c1c",
      parityLine: "#059669",
      fairZone: "rgba(5, 150, 105, 0.12)",
      dangerZone: "rgba(220, 38, 38, 0.12)",
      cdfLine: "#7c3aed",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Dark)",
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
      barColor: "rgba(56, 189, 248, 0.45)",
      barBorder: "#38bdf8",
      gaussianLine: "#f43f5e",
      gaussianFill: "rgba(244, 63, 94, 0.15)",
      latencyLine: "#fbbf24",
      latencyEnvelope: "rgba(251, 191, 36, 0.20)",
      slaLine: "#ef4444",
      parityLine: "#10b981",
      fairZone: "rgba(16, 185, 129, 0.15)",
      dangerZone: "rgba(239, 68, 68, 0.15)",
      cdfLine: "#a855f7",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8"
    },
    emerald_finops: {
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
      barColor: "rgba(5, 150, 105, 0.40)",
      barBorder: "#059669",
      gaussianLine: "#0284c7",
      gaussianFill: "rgba(2, 132, 199, 0.15)",
      latencyLine: "#ea580c",
      latencyEnvelope: "rgba(234, 88, 12, 0.18)",
      slaLine: "#dc2626",
      parityLine: "#059669",
      fairZone: "rgba(5, 150, 105, 0.15)",
      dangerZone: "rgba(220, 38, 38, 0.12)",
      cdfLine: "#4f46e5",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_media: {
      name: "Sunset Media (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      hudBg: "rgba(255, 247, 237, 0.95)",
      hudBorder: "#fed7aa",
      hudText: "#431407",
      hudSubtext: "#9a3412",
      accent: "#ea580c",
      barColor: "rgba(234, 88, 12, 0.40)",
      barBorder: "#ea580c",
      gaussianLine: "#9333ea",
      gaussianFill: "rgba(147, 51, 234, 0.12)",
      latencyLine: "#f59e0b",
      latencyEnvelope: "rgba(245, 158, 11, 0.18)",
      slaLine: "#e11d48",
      parityLine: "#16a34a",
      fairZone: "rgba(22, 163, 74, 0.12)",
      dangerZone: "rgba(225, 29, 72, 0.12)",
      cdfLine: "#c026d3",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#ea580c"
    },
    wellverse_health: {
      name: "Wellverse Healthcare (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      hudBg: "rgba(240, 253, 250, 0.95)",
      hudBorder: "#99f6e4",
      hudText: "#134e4a",
      hudSubtext: "#0f766e",
      accent: "#0d9488",
      barColor: "rgba(13, 148, 136, 0.40)",
      barBorder: "#0d9488",
      gaussianLine: "#0284c7",
      gaussianFill: "rgba(2, 132, 199, 0.12)",
      latencyLine: "#d97706",
      latencyEnvelope: "rgba(217, 119, 6, 0.18)",
      slaLine: "#be123c",
      parityLine: "#059669",
      fairZone: "rgba(5, 150, 105, 0.12)",
      dangerZone: "rgba(190, 18, 60, 0.12)",
      cdfLine: "#6366f1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0d9488"
    }
  };

  var RANK_TIERS = [
    { name: "Bronze", minPct: 0, maxPct: 0.25, color: "#cd7f32", icon: "🥉" },
    { name: "Silver", minPct: 0.25, maxPct: 0.45, color: "#94a3b8", icon: "🥈" },
    { name: "Gold", minPct: 0.45, maxPct: 0.70, color: "#eab308", icon: "🥇" },
    { name: "Platinum", minPct: 0.70, maxPct: 0.85, color: "#06b6d4", icon: "💎" },
    { name: "Diamond", minPct: 0.85, maxPct: 0.95, color: "#3b82f6", icon: "🔷" },
    { name: "Master", minPct: 0.95, maxPct: 0.985, color: "#a855f7", icon: "👑" },
    { name: "Grandmaster", minPct: 0.985, maxPct: 1.00, color: "#f43f5e", icon: "⚡" }
  ];

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "percentage") {
      return num.toFixed(1) + "%";
    } else if (fmt === "decimal_2dp") {
      return num.toFixed(2);
    } else if (fmt === "raw") {
      return String(num);
    }
    // compact_num default
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString();
  }

  var FIELD_ROLE_OPTIONS = {
    ratingDimension: { role: "dimension", defaultIdx: 0 },
    volumeMeasure: { role: "measure", defaultIdx: 0 },
    waitTimeMeasure: { role: "measure", defaultIdx: 1 },
    winRateMeasure: { role: "measure", defaultIdx: 2 },
    targetMeasure: { role: "measure", defaultIdx: 3 }
  };

  looker.plugins.visualizations.add({
    id: "matchmaking_mmr_distribution",
    label: "Matchmaking Latency & MMR Distribution Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly limited to 2 sections: Display and Style)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Layout Analysis Mode",
        display: "select",
        values: [
          { "Skill Bell Curve & Gaussian Fit": "gaussian_bell" },
          { "Queue Latency & Wait-Time Envelope": "latency_envelope" },
          { "Competitive Rank Tier Stratification": "tier_stratification" },
          { "Fairness & Win-Rate Parity Matrix": "winrate_parity" }
        ],
        default: "gaussian_bell",
        section: "Display",
        order: 1
      },

      // Dynamic Field-Role Mapping
      ratingDimension: {
        type: "string",
        label: "Skill Rating / MMR Bucket Dimension",
        display: "select",
        values: [{ "Auto (First Dimension)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      volumeMeasure: {
        type: "string",
        label: "Player Volume / Matches Measure",
        display: "select",
        values: [{ "Auto (First Measure)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      waitTimeMeasure: {
        type: "string",
        label: "Queue Wait Time Measure",
        display: "select",
        values: [{ "Auto (Second Measure)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      winRateMeasure: {
        type: "string",
        label: "Win Rate % / Parity Measure",
        display: "select",
        values: [{ "Auto (Third Measure)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetMeasure: {
        type: "string",
        label: "Comparison / SLA Target Measure",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },

      // Reference Lines, Targets & Thresholds
      slaThresholdMode: {
        type: "string",
        label: "SLA Target Goal Mode",
        display: "select",
        values: [
          { "Fixed Benchmark Value": "fixed" },
          { "Dataset Mean Wait Time": "mean" },
          { "Dataset Median (P50)": "median" },
          { "Percentile P75 Target": "p75" },
          { "Percentile P90 SLA": "p90" },
          { "Target Measure Column": "measure" }
        ],
        default: "fixed",
        section: "Display",
        order: 7
      },
      latencySlaThreshold: {
        type: "number",
        label: "Fixed Target / SLA Threshold (sec)",
        default: 120,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Target Reference Line Label",
        default: "Competitive SLA",
        section: "Display",
        order: 9
      },
      anomalyThresholdPct: {
        type: "number",
        label: "High Latency Risk Threshold (%)",
        default: 130,
        section: "Display",
        order: 10
      },
      showGaussianFit: {
        type: "boolean",
        label: "Show Fitted Gaussian Curve",
        default: true,
        section: "Display",
        order: 11
      },
      showRankTiers: {
        type: "boolean",
        label: "Show Competitive Rank Tier Cutoffs",
        default: true,
        section: "Display",
        order: 12
      },
      showParityZones: {
        type: "boolean",
        label: "Show Fair Match Parity Bands (45-55%)",
        default: true,
        section: "Display",
        order: 13
      },

      // Sorting, Top-N & Null Handling
      sortOrder: {
        type: "string",
        label: "Sort Order",
        display: "select",
        values: [
          { "Natural / Skill Rating Ascending": "natural" },
          { "Player Volume Descending": "metric_desc" },
          { "Player Volume Ascending": "metric_asc" },
          { "Alphabetical / Label Order": "alpha" }
        ],
        default: "natural",
        section: "Display",
        order: 14
      },
      topNLimit: {
        type: "string",
        label: "Top-N Skill Buckets",
        display: "select",
        values: [
          { "All Active Buckets": "all" },
          { "Top 10 Buckets": "10" },
          { "Top 20 Buckets": "20" },
          { "Top 50 Buckets": "50" }
        ],
        default: "all",
        section: "Display",
        order: 15
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Buckets as 'Other'",
        default: false,
        section: "Display",
        order: 16
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Player Volumes",
        default: true,
        section: "Display",
        order: 17
      },

      // HUD, Legend & Label Density Controls
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Telemetry HUD",
        default: true,
        section: "Display",
        order: 18
      },
      hudDensity: {
        type: "string",
        label: "Executive HUD Display Mode",
        display: "select",
        values: [
          { "Full Telemetry Scorecard": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 19
      },
      labelDensity: {
        type: "string",
        label: "Data Value Labels",
        display: "select",
        values: [
          { "All Skill Buckets": "all" },
          { "Min/Max Peaks Only": "peaks" },
          { "Hidden / Tooltip Only": "hidden" }
        ],
        default: "peaks",
        section: "Display",
        order: 20
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 21
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 22
      },
      showSearch: {
        type: "boolean",
        label: "Enable Tier & Rating Search Bar",
        default: true,
        section: "Display",
        order: 23
      },

      // ==========================================
      // SECTION 2: STYLE (Aesthetics & Palettes)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Studio Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_health" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "modern_slate",
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
        label: "Custom Positive / Fair Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Alert Hex",
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
          { "Lower is Better (Queue Latency, Churn, Wait)": "lower_better" },
          { "Higher is Better (Player Volume, Win Rate)": "higher_better" }
        ],
        default: "lower_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scaling",
        display: "select",
        values: [
          { "Compact (Dense Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Formatting",
        display: "select",
        values: [
          { "Auto (Compact Number 1.2M)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2dp" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_num",
        section: "Style",
        order: 7
      },
      curveSmoothing: {
        type: "string",
        label: "Curve Smoothing Interpolation",
        display: "select",
        values: [
          { "Monotone Cubic": "monotone" },
          { "Catmull-Rom Spline": "catmull_rom" },
          { "Basis Spline": "basis" },
          { "Linear Segments": "linear" }
        ],
        default: "monotone",
        section: "Style",
        order: 8
      },
      showGridlines: {
        type: "boolean",
        label: "Show Background Gridlines",
        default: true,
        section: "Style",
        order: 9
      }
    },

    _registerDynamicOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields) return;
      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      var sig = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === sig) return;
      self._dynamicFieldSignature = sig;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(f) { return f.label_short || f.label || f.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (optKey) {
        var spec = FIELD_ROLE_OPTIONS[optKey];
        if (!newOptions[optKey]) return;
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

        newOptions[optKey].type = "string";
        newOptions[optKey].display = "select";
        newOptions[optKey].values = values;
        newOptions[optKey].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable:", e);
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-mmr-analyzer-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-mmr-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "320px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._selectedTier = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard to prevent infinite layout cycles
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
      this.clearErrors();

      // Store cache for resize observer
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      var container = this._container;
      var tooltip = this._tooltip;
      var self = this;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No matchmaking telemetry data returned.</span></div>";
        done();
        return;
      }

      this._registerDynamicOptions(queryResponse);

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length === 0 || meas.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;padding:20px;text-align:center;'>" +
          "<span>⚠️ <strong>Configuration Required:</strong> Matchmaking Analyzer requires at least 1 Dimension (Skill Rating / MMR / Tier / Bucket) and 1 Measure (Player Volume / Match Count).</span></div>";
        done();
        return;
      }

      // Field resolution with dynamic overrides
      var ratingDim = (config.ratingDimension && config.ratingDimension.length > 0) ? config.ratingDimension : dims[0].name;
      var volumeMeas = (config.volumeMeasure && config.volumeMeasure.length > 0) ? config.volumeMeasure : meas[0].name;
      var waitTimeMeas = (config.waitTimeMeasure && config.waitTimeMeasure.length > 0) ? config.waitTimeMeasure : (meas.length > 1 ? meas[1].name : null);
      var winRateMeas = (config.winRateMeasure && config.winRateMeasure.length > 0) ? config.winRateMeasure : (meas.length > 2 ? meas[2].name : null);
      var targetMeas = (config.targetMeasure && config.targetMeasure.length > 0) ? config.targetMeasure : (meas.length > 3 ? meas[3].name : null);

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "modern_slate";
        var theme = Object.assign({}, THEMES[themeKey] || THEMES.modern_slate);

        // Apply Custom Hex Overrides if set
        if (config.customPrimaryColor) {
          theme.accent = config.customPrimaryColor;
          theme.barBorder = config.customPrimaryColor;
          theme.barColor = config.customPrimaryColor + "66";
        }
        if (config.customPositiveColor) {
          theme.parityLine = config.customPositiveColor;
          theme.fairZone = config.customPositiveColor + "22";
        }
        if (config.customNegativeColor) {
          theme.slaLine = config.customNegativeColor;
          theme.dangerZone = config.customNegativeColor + "22";
        }

        var layoutMode = config.layoutMode || "gaussian_bell";
        var suppressNulls = config.suppressZeroNull !== false;

        // Font scaling
        var fontScale = config.fontScale || "standard";
        var fsTitle = fontScale === "compact" ? "14px" : (fontScale === "large" ? "20px" : "16px");
        var fsBody = fontScale === "compact" ? "11px" : (fontScale === "large" ? "13px" : "12px");
        var fsHUDVal = fontScale === "compact" ? "14px" : (fontScale === "large" ? "20px" : "17px");

        container.style.backgroundColor = theme.bg;
        container.style.color = theme.text;
        tooltip.style.backgroundColor = theme.tooltipBg;
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;

        // 1. Process & Aggregate Rows
        var parsedPoints = [];
        var totalPlayers = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawLabel = row[ratingDim] ? String(row[ratingDim].value) : "Unknown";
          var vol = row[volumeMeas] && row[volumeMeas].value !== null ? Number(row[volumeMeas].value) : 0;
          if (suppressNulls && (isNaN(vol) || vol <= 0)) continue;
          if (isNaN(vol)) vol = 0;

          // Attempt numeric parse for rating
          var numRating = parseFloat(rawLabel.replace(/[^0-9.-]/g, ""));
          if (isNaN(numRating)) {
            numRating = i * 100 + 500; // Synthetic continuous index if categorical
          }

          var waitTime = 0;
          if (waitTimeMeas && row[waitTimeMeas] && row[waitTimeMeas].value !== null) {
            waitTime = Number(row[waitTimeMeas].value);
          }

          var winRate = 0.5;
          if (winRateMeas && row[winRateMeas] && row[winRateMeas].value !== null) {
            winRate = Number(row[winRateMeas].value);
            if (winRate > 1.0) winRate = winRate / 100.0;
          }

          var targetVal = null;
          if (targetMeas && row[targetMeas] && row[targetMeas].value !== null) {
            targetVal = Number(row[targetMeas].value);
          }

          parsedPoints.push({
            id: i,
            label: rawLabel,
            rating: numRating,
            volume: vol,
            rawWaitTime: waitTime,
            rawWinRate: winRate,
            targetVal: targetVal,
            rowRef: row
          });
          totalPlayers += vol;
        }

        if (parsedPoints.length === 0) {
          container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>No valid player volume rows found.</div>";
          done();
          return;
        }

        // Apply Sorting
        var sortMode = config.sortOrder || "natural";
        if (sortMode === "metric_desc") {
          parsedPoints.sort(function (a, b) { return b.volume - a.volume; });
        } else if (sortMode === "metric_asc") {
          parsedPoints.sort(function (a, b) { return a.volume - b.volume; });
        } else if (sortMode === "alpha") {
          parsedPoints.sort(function (a, b) { return a.label.localeCompare(b.label); });
        } else {
          // natural rating ascending
          parsedPoints.sort(function (a, b) { return a.rating - b.rating; });
        }

        // Apply Top-N Cutoff and 'Other' Rollup
        var topN = config.topNLimit || "all";
        if (topN !== "all") {
          var nLimit = parseInt(topN, 10);
          if (nLimit > 0 && parsedPoints.length > nLimit) {
            if (config.enableOtherRollup) {
              var topSlice = parsedPoints.slice(0, nLimit);
              var remainder = parsedPoints.slice(nLimit);
              var otherVol = 0;
              var otherWaitSum = 0;
              for (var ri = 0; ri < remainder.length; ri++) {
                otherVol += remainder[ri].volume;
                otherWaitSum += remainder[ri].rawWaitTime * remainder[ri].volume;
              }
              topSlice.push({
                id: 99999,
                label: "Other Skill Buckets",
                rating: topSlice[topSlice.length - 1].rating + 100,
                volume: otherVol,
                rawWaitTime: otherVol > 0 ? (otherWaitSum / otherVol) : 0,
                rawWinRate: 0.50,
                targetVal: null,
                rowRef: null
              });
              parsedPoints = topSlice;
            } else {
              parsedPoints = parsedPoints.slice(0, nLimit);
            }
          }
        }

        // Re-sort ascending by rating for curve/histogram rendering
        parsedPoints.sort(function (a, b) { return a.rating - b.rating; });

        // 2. Statistical Computations (Weighted Mean, StdDev, Cumulative CDF, Gaussian Curve)
        var weightedSum = 0;
        for (var p = 0; p < parsedPoints.length; p++) {
          weightedSum += parsedPoints[p].rating * parsedPoints[p].volume;
        }
        var meanRating = totalPlayers > 0 ? (weightedSum / totalPlayers) : 0;

        var varianceSum = 0;
        for (var q = 0; q < parsedPoints.length; q++) {
          var diff = parsedPoints[q].rating - meanRating;
          varianceSum += parsedPoints[q].volume * diff * diff;
        }
        var stdDev = Math.sqrt(totalPlayers > 0 ? (varianceSum / totalPlayers) : 1);
        if (stdDev <= 0) stdDev = 1;

        // Assign Percentiles, Latencies, and Rank Tiers
        var runningVolume = 0;
        var totalWaitWeighted = 0;
        var p95Wait = 0;
        var p50Wait = 0;
        var p75Wait = 0;
        var p90Wait = 0;
        var fairMatchesCount = 0;

        for (var k = 0; k < parsedPoints.length; k++) {
          var pt = parsedPoints[k];
          runningVolume += pt.volume;
          var cumPct = totalPlayers > 0 ? (runningVolume / totalPlayers) : 0;
          pt.cumPct = cumPct;
          pt.zScore = (pt.rating - meanRating) / stdDev;

          // Latency Model: If user has waitTime measure, use it; otherwise model the classic U-curve
          if (waitTimeMeas && pt.rawWaitTime > 0) {
            pt.waitTime = pt.rawWaitTime;
          } else {
            var zAbs = Math.abs(pt.zScore);
            pt.waitTime = 18 + 22 * Math.pow(zAbs, 1.85);
          }

          totalWaitWeighted += pt.waitTime * pt.volume;
          if (cumPct >= 0.50 && p50Wait === 0) p50Wait = pt.waitTime;
          if (cumPct >= 0.75 && p75Wait === 0) p75Wait = pt.waitTime;
          if (cumPct >= 0.90 && p90Wait === 0) p90Wait = pt.waitTime;
          if (cumPct >= 0.95 && p95Wait === 0) p95Wait = pt.waitTime;

          // Win Rate Model
          if (winRateMeas && pt.rawWinRate > 0) {
            pt.winRate = pt.rawWinRate;
          } else {
            var delta = (pt.rating - meanRating) / (stdDev * 1.8);
            pt.winRate = 1.0 / (1.0 + Math.exp(-delta));
          }

          if (pt.winRate >= 0.45 && pt.winRate <= 0.55) {
            fairMatchesCount += pt.volume;
          }

          var tierFound = RANK_TIERS[0];
          for (var t = 0; t < RANK_TIERS.length; t++) {
            if (cumPct <= RANK_TIERS[t].maxPct || t === RANK_TIERS.length - 1) {
              tierFound = RANK_TIERS[t];
              break;
            }
          }
          pt.tier = tierFound;

          // Gaussian Height
          var normExp = Math.exp(-0.5 * pt.zScore * pt.zScore);
          var gaussianHeight = (totalPlayers / (stdDev * Math.sqrt(2 * Math.PI))) * normExp;
          pt.gaussianHeight = gaussianHeight;
        }

        var avgWaitTime = totalPlayers > 0 ? (totalWaitWeighted / totalPlayers) : 0;
        if (p50Wait === 0) p50Wait = avgWaitTime;
        if (p75Wait === 0) p75Wait = p50Wait * 1.5;
        if (p90Wait === 0) p90Wait = p50Wait * 1.9;
        if (p95Wait === 0) p95Wait = p50Wait * 2.2;
        var fairMatchPct = totalPlayers > 0 ? ((fairMatchesCount / totalPlayers) * 100) : 0;

        // Dynamic SLA Target Computation
        var slaMode = config.slaThresholdMode || "fixed";
        var effectiveSla = Number(config.latencySlaThreshold) || 120;
        if (slaMode === "mean") effectiveSla = avgWaitTime;
        else if (slaMode === "median") effectiveSla = p50Wait;
        else if (slaMode === "p75") effectiveSla = p75Wait;
        else if (slaMode === "p90") effectiveSla = p90Wait;
        else if (slaMode === "measure" && targetMeas) {
          var targetVals = parsedPoints.filter(function (x) { return x.targetVal !== null && !isNaN(x.targetVal); });
          if (targetVals.length > 0) {
            effectiveSla = d3.mean(targetVals, function (x) { return x.targetVal; });
          }
        }

        var refLineLabel = config.referenceLineLabel || "Competitive SLA";
        var anomalyThreshold = effectiveSla * (Number(config.anomalyThresholdPct || 130) / 100.0);

        // 3. Search & Filter State
        var displayPoints = parsedPoints.filter(function (d) {
          var matchesSearch = true;
          if (self._searchTerm) {
            var st = self._searchTerm.toLowerCase();
            matchesSearch = d.label.toLowerCase().indexOf(st) >= 0 ||
                            d.tier.name.toLowerCase().indexOf(st) >= 0;
          }
          var matchesTier = true;
          if (self._selectedTier) {
            matchesTier = d.tier.name === self._selectedTier;
          }
          return matchesSearch && matchesTier;
        });

        // 4. Render UI Shell (HUD + Controls + Visualization Canvas)
        container.innerHTML = "";

        // TOP HEADER: Optional Title + HUD + Controls Bar
        var topControls = document.createElement("div");
        topControls.style.padding = "10px 14px";
        topControls.style.borderBottom = "1px solid " + theme.border;
        topControls.style.display = "flex";
        topControls.style.flexDirection = "column";
        topControls.style.gap = "8px";
        topControls.style.flexShrink = "0";

        // Custom Title / Subtitle Override
        if (config.customTitle || config.customSubtitle) {
          var titleHeader = document.createElement("div");
          titleHeader.style.display = "flex";
          titleHeader.style.flexDirection = "column";
          titleHeader.style.gap = "2px";
          titleHeader.style.marginBottom = "4px";

          if (config.customTitle) {
            var tEl = document.createElement("div");
            tEl.style.fontSize = fsTitle;
            tEl.style.fontWeight = "700";
            tEl.style.color = theme.text;
            tEl.textContent = config.customTitle;
            titleHeader.appendChild(tEl);
          }
          if (config.customSubtitle) {
            var stEl = document.createElement("div");
            stEl.style.fontSize = fsBody;
            stEl.style.color = theme.subtext;
            stEl.textContent = config.customSubtitle;
            titleHeader.appendChild(stEl);
          }
          topControls.appendChild(titleHeader);
        }

        // Executive HUD Scorecard
        var hudMode = config.hudDensity || (config.showExecutiveHUD === false ? "hidden" : "scorecard");
        if (hudMode !== "hidden" && config.showExecutiveHUD !== false) {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = hudMode === "compact_strip" ? "repeat(auto-fit, minmax(90px, 1fr))" : "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = hudMode === "compact_strip" ? "4px" : "8px";

          var isSlaBreached = p95Wait > effectiveSla;
          var hudCards = [
            { label: "Total Players / Matches", val: formatValue(totalPlayers, config.valueFormat || "compact_num"), sub: parsedPoints.length + " skill buckets", color: theme.accent },
            { label: "Mean Rating (μ)", val: Math.round(meanRating).toLocaleString(), sub: "±" + Math.round(stdDev) + " StdDev (σ)", color: theme.gaussianLine },
            { label: "Median Wait (P50)", val: p50Wait.toFixed(1) + "s", sub: "Avg: " + avgWaitTime.toFixed(1) + "s", color: theme.latencyLine },
            { label: "Tail Wait (P95)", val: p95Wait.toFixed(1) + "s", sub: isSlaBreached ? ("⚠️ SLA Breach (> " + Math.round(effectiveSla) + "s)") : ("✅ Within " + Math.round(effectiveSla) + "s SLA"), color: isSlaBreached ? theme.slaLine : theme.parityLine },
            { label: "Fair Parity Rate", val: fairMatchPct.toFixed(1) + "%", sub: "Matches in 45-55% zone", color: theme.parityLine }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = hudMode === "compact_strip" ? "4px 8px" : "6px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            var l = document.createElement("div");
            l.style.fontSize = hudMode === "compact_strip" ? "9.5px" : "10.5px";
            l.style.color = theme.subtext;
            l.style.fontWeight = "600";
            l.textContent = c.label;

            var v = document.createElement("div");
            v.style.fontSize = hudMode === "compact_strip" ? "13px" : fsHUDVal;
            v.style.fontWeight = "700";
            v.style.color = c.color;
            v.style.margin = "2px 0";
            v.textContent = c.val;

            card.appendChild(l);
            card.appendChild(v);

            if (hudMode !== "compact_strip") {
              var s = document.createElement("div");
              s.style.fontSize = "10px";
              s.style.color = theme.subtext;
              s.textContent = c.sub;
              card.appendChild(s);
            }
            hudGrid.appendChild(card);
          });
          topControls.appendChild(hudGrid);
        }

        // Secondary Toolbar: Tier Filter Pills + Search Bar
        var filterRow = document.createElement("div");
        filterRow.style.display = "flex";
        filterRow.style.alignItems = "center";
        filterRow.style.justifyContent = "space-between";
        filterRow.style.flexWrap = "wrap";
        filterRow.style.gap = "8px";

        // Rank Tier Pills
        if (config.showRankTiers !== false) {
          var tierPills = document.createElement("div");
          tierPills.style.display = "flex";
          tierPills.style.alignItems = "center";
          tierPills.style.gap = "4px";
          tierPills.style.flexWrap = "wrap";

          var allPill = document.createElement("button");
          allPill.textContent = "All Tiers";
          allPill.style.fontSize = "11px";
          allPill.style.padding = "2px 8px";
          allPill.style.borderRadius = "12px";
          allPill.style.border = "1px solid " + (self._selectedTier === null ? theme.accent : theme.border);
          allPill.style.background = self._selectedTier === null ? theme.accent : "transparent";
          allPill.style.color = self._selectedTier === null ? "#ffffff" : theme.text;
          allPill.style.cursor = "pointer";
          allPill.onclick = function () {
            self._selectedTier = null;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          tierPills.appendChild(allPill);

          RANK_TIERS.forEach(function (tr) {
            var pill = document.createElement("button");
            var isSel = self._selectedTier === tr.name;
            pill.innerHTML = tr.icon + " " + tr.name;
            pill.style.fontSize = "11px";
            pill.style.padding = "2px 8px";
            pill.style.borderRadius = "12px";
            pill.style.border = "1px solid " + (isSel ? tr.color : theme.border);
            pill.style.background = isSel ? tr.color : "transparent";
            pill.style.color = isSel ? "#ffffff" : theme.text;
            pill.style.cursor = "pointer";
            pill.onclick = function () {
              self._selectedTier = isSel ? null : tr.name;
              self.updateAsync(data, element, config, queryResponse, details, done);
            };
            tierPills.appendChild(pill);
          });
          filterRow.appendChild(tierPills);
        }

        // Search Input
        if (config.showSearch !== false) {
          var searchBox = document.createElement("div");
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.gap = "4px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Filter tier / rating...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.padding = "3px 8px";
          searchInput.style.fontSize = "11px";
          searchInput.style.borderRadius = "4px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.background = theme.cardBg;
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";

          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          searchBox.appendChild(searchInput);
          filterRow.appendChild(searchBox);
        }

        topControls.appendChild(filterRow);
        container.appendChild(topControls);

        // CHART SVG CANVAS
        var chartWrapper = document.createElement("div");
        chartWrapper.style.flex = "1";
        chartWrapper.style.position = "relative";
        chartWrapper.style.width = "100%";
        chartWrapper.style.minHeight = "240px";
        chartWrapper.style.overflow = "hidden";
        container.appendChild(chartWrapper);

        var rect = chartWrapper.getBoundingClientRect();
        var width = rect.width || element.clientWidth || 700;
        var height = rect.height || 360;
        self._lastWidth = width;
        self._lastHeight = height;

        var margin = { top: 20, right: 60, bottom: 45, left: 60 };
        var innerWidth = Math.max(width - margin.left - margin.right, 100);
        var innerHeight = Math.max(height - margin.top - margin.bottom, 100);

        var svg = d3.select(chartWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // D3 Scales
        var pts = displayPoints.length > 0 ? displayPoints : parsedPoints;

        // X Scale: Skill Rating (continuous linear)
        var xMin = d3.min(pts, function (d) { return d.rating; });
        var xMax = d3.max(pts, function (d) { return d.rating; });
        if (xMin === xMax) { xMin -= 50; xMax += 50; }
        var xScale = d3.scaleLinear()
          .domain([xMin, xMax])
          .range([0, innerWidth]);

        // Y1 Scale (Left): Volume / Player Count
        var y1Max = d3.max(pts, function (d) { return d.volume; }) || 100;
        if (config.showGaussianFit && layoutMode === "gaussian_bell") {
          var maxGauss = d3.max(pts, function (d) { return d.gaussianHeight; }) || 0;
          y1Max = Math.max(y1Max, maxGauss * 1.15);
        }
        var y1Scale = d3.scaleLinear()
          .domain([0, y1Max * 1.1])
          .range([innerHeight, 0]);

        // Y2 Scale (Right): Latency or CDF %
        var y2Scale;
        if (layoutMode === "latency_envelope") {
          var maxWait = d3.max(pts, function (d) { return d.waitTime; }) || 60;
          maxWait = Math.max(maxWait, effectiveSla * 1.25);
          y2Scale = d3.scaleLinear()
            .domain([0, maxWait])
            .range([innerHeight, 0]);
        } else if (layoutMode === "tier_stratification") {
          y2Scale = d3.scaleLinear()
            .domain([0, 1.0])
            .range([innerHeight, 0]);
        } else if (layoutMode === "winrate_parity") {
          y2Scale = d3.scaleLinear()
            .domain([0.30, 0.70])
            .range([innerHeight, 0]);
        }

        // Background Gridlines
        if (config.showGridlines !== false) {
          g.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.15)
            .call(d3.axisLeft(y1Scale)
              .tickSize(-innerWidth)
              .tickFormat("")
            )
            .selectAll("line")
            .attr("stroke", theme.subtext);
        }

        // Curve Interpolator
        var interp = d3.curveMonotoneX;
        var cmode = config.curveSmoothing || "monotone";
        if (cmode === "catmull_rom") interp = d3.curveCatmullRom;
        else if (cmode === "basis") interp = d3.curveBasis;
        else if (cmode === "linear") interp = d3.curveLinear;

        // ==========================================
        // LAYOUT MODE 1: GAUSSIAN BELL CURVE & SKILL HISTOGRAM
        // ==========================================
        if (layoutMode === "gaussian_bell") {
          // Histogram Bar Columns
          var barWidth = Math.max(2, (innerWidth / pts.length) * 0.75);
          g.selectAll(".mmr-bar")
            .data(pts)
            .enter()
            .append("rect")
            .attr("class", "mmr-bar")
            .attr("x", function (d) { return xScale(d.rating) - barWidth / 2; })
            .attr("y", function (d) { return y1Scale(d.volume); })
            .attr("width", barWidth)
            .attr("height", function (d) { return Math.max(0, innerHeight - y1Scale(d.volume)); })
            .attr("fill", function (d) { return d.tier.color + "55"; })
            .attr("stroke", function (d) { return d.tier.color; })
            .attr("stroke-width", 1.2)
            .attr("rx", 2)
            .on("mouseover", function (event, d) {
              d3.select(this).attr("fill", d.tier.color + "99").attr("stroke-width", 2);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).attr("fill", d.tier.color + "55").attr("stroke-width", 1.2);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });

          // Fitted Gaussian Area & Line
          if (config.showGaussianFit !== false) {
            var gArea = d3.area()
              .x(function (d) { return xScale(d.rating); })
              .y0(innerHeight)
              .y1(function (d) { return y1Scale(d.gaussianHeight); })
              .curve(interp);

            var gLine = d3.line()
              .x(function (d) { return xScale(d.rating); })
              .y(function (d) { return y1Scale(d.gaussianHeight); })
              .curve(interp);

            g.append("path")
              .datum(pts)
              .attr("fill", theme.gaussianFill)
              .attr("d", gArea);

            g.append("path")
              .datum(pts)
              .attr("fill", "none")
              .attr("stroke", theme.gaussianLine)
              .attr("stroke-width", 2.5)
              .attr("stroke-dasharray", "4,3")
              .attr("d", gLine);
          }

          // Mean μ and Sigma Lines
          var meanX = xScale(meanRating);
          if (meanX >= 0 && meanX <= innerWidth) {
            g.append("line")
              .attr("x1", meanX)
              .attr("x2", meanX)
              .attr("y1", 0)
              .attr("y2", innerHeight)
              .attr("stroke", theme.gaussianLine)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5,4");

            g.append("text")
              .attr("x", meanX + 4)
              .attr("y", 15)
              .attr("fill", theme.gaussianLine)
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .text("μ = " + Math.round(meanRating));
          }

          // ±1σ Standard Deviation Line
          var sigLeft = xScale(meanRating - stdDev);
          var sigRight = xScale(meanRating + stdDev);
          if (sigLeft >= 0 && sigRight <= innerWidth) {
            g.append("rect")
              .attr("x", sigLeft)
              .attr("y", 0)
              .attr("width", sigRight - sigLeft)
              .attr("height", innerHeight)
              .attr("fill", theme.accent)
              .attr("opacity", 0.05);
          }
        }

        // ==========================================
        // LAYOUT MODE 2: QUEUE LATENCY & WAIT-TIME ENVELOPE (Dual Y-Axis)
        // ==========================================
        else if (layoutMode === "latency_envelope") {
          // Volume Area on Y1 (Left)
          var volArea = d3.area()
            .x(function (d) { return xScale(d.rating); })
            .y0(innerHeight)
            .y1(function (d) { return y1Scale(d.volume); })
            .curve(interp);

          g.append("path")
            .datum(pts)
            .attr("fill", theme.barColor)
            .attr("stroke", theme.barBorder)
            .attr("stroke-width", 1.5)
            .attr("d", volArea);

          // Queue Latency Shaded Risk Zone (Above SLA Threshold)
          var slaY = y2Scale(effectiveSla);
          if (slaY >= 0 && slaY <= innerHeight) {
            g.append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", innerWidth)
              .attr("height", slaY)
              .attr("fill", theme.dangerZone);

            g.append("line")
              .attr("x1", 0)
              .attr("x2", innerWidth)
              .attr("y1", slaY)
              .attr("y2", slaY)
              .attr("stroke", theme.slaLine)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "6,4");

            g.append("text")
              .attr("x", innerWidth - 8)
              .attr("y", slaY - 6)
              .attr("text-anchor", "end")
              .attr("fill", theme.slaLine)
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .text(refLineLabel + " (" + Math.round(effectiveSla) + "s)");
          }

          // Latency Trend Line on Y2 (Right)
          var latLine = d3.line()
            .x(function (d) { return xScale(d.rating); })
            .y(function (d) { return y2Scale(d.waitTime); })
            .curve(interp);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.latencyLine)
            .attr("stroke-width", 3)
            .attr("d", latLine);

          // Latency Target Measure Line if provided
          if (targetMeas) {
            var targetPoints = pts.filter(function (d) { return d.targetVal !== null && !isNaN(d.targetVal); });
            if (targetPoints.length > 1) {
              var tgtLine = d3.line()
                .x(function (d) { return xScale(d.rating); })
                .y(function (d) { return y2Scale(d.targetVal); })
                .curve(interp);

              g.append("path")
                .datum(targetPoints)
                .attr("fill", "none")
                .attr("stroke", theme.accent)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "3,3")
                .attr("d", tgtLine);
            }
          }

          // Points on Latency Line
          g.selectAll(".lat-point")
            .data(pts)
            .enter()
            .append("circle")
            .attr("class", "lat-point")
            .attr("cx", function (d) { return xScale(d.rating); })
            .attr("cy", function (d) { return y2Scale(d.waitTime); })
            .attr("r", 4.5)
            .attr("fill", function (d) { return d.waitTime > effectiveSla ? theme.slaLine : theme.latencyLine; })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function (event, d) {
              d3.select(this).attr("r", 7);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).attr("r", 4.5);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });
        }

        // ==========================================
        // LAYOUT MODE 3: COMPETITIVE RANK TIER STRATIFICATION & CDF
        // ==========================================
        else if (layoutMode === "tier_stratification") {
          // Partition Background Bands for Rank Tiers
          RANK_TIERS.forEach(function (tr) {
            var tierPts = pts.filter(function (d) { return d.tier.name === tr.name; });
            if (tierPts.length > 0) {
              var tMinX = xScale(tierPts[0].rating);
              var tMaxX = xScale(tierPts[tierPts.length - 1].rating);
              var tW = Math.max(tMaxX - tMinX, 10);

              g.append("rect")
                .attr("x", tMinX)
                .attr("y", 0)
                .attr("width", tW)
                .attr("height", innerHeight)
                .attr("fill", tr.color)
                .attr("opacity", 0.08);

              g.append("text")
                .attr("x", tMinX + tW / 2)
                .attr("y", 16)
                .attr("text-anchor", "middle")
                .attr("fill", tr.color)
                .attr("font-size", "11px")
                .attr("font-weight", "700")
                .text(tr.icon + " " + tr.name);
            }
          });

          // Volume Bars Colored by Tier
          var tierBarW = Math.max(2, (innerWidth / pts.length) * 0.7);
          g.selectAll(".tier-bar")
            .data(pts)
            .enter()
            .append("rect")
            .attr("class", "tier-bar")
            .attr("x", function (d) { return xScale(d.rating) - tierBarW / 2; })
            .attr("y", function (d) { return y1Scale(d.volume); })
            .attr("width", tierBarW)
            .attr("height", function (d) { return Math.max(0, innerHeight - y1Scale(d.volume)); })
            .attr("fill", function (d) { return d.tier.color + "77"; })
            .attr("stroke", function (d) { return d.tier.color; })
            .attr("stroke-width", 1.2)
            .attr("rx", 2)
            .on("mouseover", function (event, d) {
              d3.select(this).attr("fill", d.tier.color).attr("stroke-width", 2);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).attr("fill", d.tier.color + "77").attr("stroke-width", 1.2);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });

          // Cumulative CDF Line on Y2
          var cdfLine = d3.line()
            .x(function (d) { return xScale(d.rating); })
            .y(function (d) { return y2Scale(d.cumPct); })
            .curve(interp);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.cdfLine)
            .attr("stroke-width", 2.8)
            .attr("d", cdfLine);
        }

        // ==========================================
        // LAYOUT MODE 4: FAIRNESS & WIN-RATE PARITY MATRIX
        // ==========================================
        else if (layoutMode === "winrate_parity") {
          // Fair Match Band (45% to 55%)
          if (config.showParityZones !== false) {
            var y45 = y2Scale(0.45);
            var y55 = y2Scale(0.55);
            g.append("rect")
              .attr("x", 0)
              .attr("y", y55)
              .attr("width", innerWidth)
              .attr("height", y45 - y55)
              .attr("fill", theme.fairZone);

            // Stomp Blowout Danger Zones (<45% and >55%)
            g.append("rect")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", innerWidth)
              .attr("height", y55)
              .attr("fill", theme.dangerZone);

            g.append("rect")
              .attr("x", 0)
              .attr("y", y45)
              .attr("width", innerWidth)
              .attr("height", innerHeight - y45)
              .attr("fill", theme.dangerZone);
          }

          // Ideal 50% Win Rate Parity Baseline
          var y50 = y2Scale(0.50);
          g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", y50)
            .attr("y2", y50)
            .attr("stroke", theme.parityLine)
            .attr("stroke-width", 2.2)
            .attr("stroke-dasharray", "5,4");

          g.append("text")
            .attr("x", innerWidth - 8)
            .attr("y", y50 - 6)
            .attr("text-anchor", "end")
            .attr("fill", theme.parityLine)
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .text("50.0% Perfect Parity");

          // Win Rate Logistic Curve
          var wrLine = d3.line()
            .x(function (d) { return xScale(d.rating); })
            .y(function (d) { return y2Scale(d.winRate); })
            .curve(interp);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.accent)
            .attr("stroke-width", 2.8)
            .attr("d", wrLine);

          // Win Rate Scatter Points sized by Volume
          var maxVol = d3.max(pts, function (d) { return d.volume; }) || 1;
          var rScale = d3.scaleSqrt().domain([0, maxVol]).range([4, 14]);

          g.selectAll(".wr-bubble")
            .data(pts)
            .enter()
            .append("circle")
            .attr("class", "wr-bubble")
            .attr("cx", function (d) { return xScale(d.rating); })
            .attr("cy", function (d) { return y2Scale(d.winRate); })
            .attr("r", function (d) { return rScale(d.volume); })
            .attr("fill", function (d) {
              return (d.winRate >= 0.45 && d.winRate <= 0.55) ? theme.parityLine + "88" : theme.slaLine + "88";
            })
            .attr("stroke", function (d) {
              return (d.winRate >= 0.45 && d.winRate <= 0.55) ? theme.parityLine : theme.slaLine;
            })
            .attr("stroke-width", 1.8)
            .on("mouseover", function (event, d) {
              d3.select(this).attr("stroke-width", 3).attr("fill-opacity", 1);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).attr("stroke-width", 1.8).attr("fill-opacity", 0.88);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });
        }

        // ==========================================
        // DATA VALUE LABELS
        // ==========================================
        var labelMode = config.labelDensity || "peaks";
        if (labelMode !== "hidden") {
          var labelPts = [];
          if (labelMode === "all") {
            labelPts = pts;
          } else if (labelMode === "peaks") {
            // Find min, max, and high latency peak points
            var maxVolPt = d3.max(pts, function (d) { return d.volume; });
            var maxVolItem = pts.find(function (d) { return d.volume === maxVolPt; });
            var maxWaitPt = d3.max(pts, function (d) { return d.waitTime; });
            var maxWaitItem = pts.find(function (d) { return d.waitTime === maxWaitPt; });
            if (maxVolItem) labelPts.push(maxVolItem);
            if (maxWaitItem && maxWaitItem !== maxVolItem) labelPts.push(maxWaitItem);
            if (pts.length > 0 && pts[0] !== maxVolItem && pts[0] !== maxWaitItem) labelPts.push(pts[0]);
            if (pts.length > 1 && pts[pts.length - 1] !== maxVolItem && pts[pts.length - 1] !== maxWaitItem) labelPts.push(pts[pts.length - 1]);
          }

          g.selectAll(".val-label")
            .data(labelPts)
            .enter()
            .append("text")
            .attr("class", "val-label")
            .attr("x", function (d) { return xScale(d.rating); })
            .attr("y", function (d) {
              if (layoutMode === "winrate_parity") return y2Scale(d.winRate) - 10;
              if (layoutMode === "latency_envelope") return y2Scale(d.waitTime) - 10;
              return y1Scale(d.volume) - 6;
            })
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .text(function (d) {
              if (layoutMode === "winrate_parity") return (d.winRate * 100).toFixed(1) + "%";
              if (layoutMode === "latency_envelope") return d.waitTime.toFixed(0) + "s";
              return formatValue(d.volume, config.valueFormat || "compact_num");
            });
        }

        // ==========================================
        // AXES RENDERING
        // ==========================================
        // X-Axis (Skill Rating / MMR)
        var xAxis = d3.axisBottom(xScale)
          .ticks(Math.min(pts.length, Math.floor(innerWidth / 80)))
          .tickFormat(function (d) { return d; });

        var xAxisG = g.append("g")
          .attr("transform", "translate(0," + innerHeight + ")")
          .call(xAxis);

        xAxisG.selectAll("text")
          .attr("fill", theme.subtext)
          .attr("font-size", "11px");
        xAxisG.selectAll("line, path")
          .attr("stroke", theme.border);

        // X Axis Label
        g.append("text")
          .attr("x", innerWidth / 2)
          .attr("y", innerHeight + 36)
          .attr("text-anchor", "middle")
          .attr("fill", theme.subtext)
          .attr("font-size", "11.5px")
          .attr("font-weight", "600")
          .text("Player Skill Rating (MMR / Rank Tier)");

        // Left Y-Axis (Player Volume)
        var y1Axis = d3.axisLeft(y1Scale)
          .ticks(5)
          .tickFormat(function (d) { return formatValue(d, config.valueFormat || "compact_num"); });

        var y1AxisG = g.append("g")
          .call(y1Axis);

        y1AxisG.selectAll("text")
          .attr("fill", theme.subtext)
          .attr("font-size", "11px");
        y1AxisG.selectAll("line, path")
          .attr("stroke", theme.border);

        // Left Y Label
        g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -innerHeight / 2)
          .attr("y", -42)
          .attr("text-anchor", "middle")
          .attr("fill", theme.accent)
          .attr("font-size", "11.5px")
          .attr("font-weight", "600")
          .text("Active Ranked Player Volume");

        // Right Y-Axis (Latency, CDF %, or Win Rate %)
        if (y2Scale) {
          var y2Axis = d3.axisRight(y2Scale).ticks(5);
          var y2LabelText = "";
          var y2LabelColor = theme.latencyLine;

          if (layoutMode === "latency_envelope") {
            y2Axis.tickFormat(function (d) { return d + "s"; });
            y2LabelText = "Queue Wait Time (sec)";
            y2LabelColor = theme.latencyLine;
          } else if (layoutMode === "tier_stratification") {
            y2Axis.tickFormat(function (d) { return (d * 100).toFixed(0) + "%"; });
            y2LabelText = "Cumulative CDF Distribution (%)";
            y2LabelColor = theme.cdfLine;
          } else if (layoutMode === "winrate_parity") {
            y2Axis.tickFormat(function (d) { return (d * 100).toFixed(0) + "%"; });
            y2LabelText = "Matchmaking Win Rate Parity (%)";
            y2LabelColor = theme.parityLine;
          }

          var y2AxisG = g.append("g")
            .attr("transform", "translate(" + innerWidth + ",0)")
            .call(y2Axis);

          y2AxisG.selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px");
          y2AxisG.selectAll("line, path")
            .attr("stroke", theme.border);

          g.append("text")
            .attr("transform", "rotate(90)")
            .attr("x", innerHeight / 2)
            .attr("y", -innerWidth - 44)
            .attr("text-anchor", "middle")
            .attr("fill", y2LabelColor)
            .attr("font-size", "11.5px")
            .attr("font-weight", "600")
            .text(y2LabelText);
        }

        // Tooltip Helper Functions
        function showTooltip(event, d) {
          var pct = totalPlayers > 0 ? ((d.volume / totalPlayers) * 100).toFixed(1) + "%" : "0%";
          var slaStatus = d.waitTime > effectiveSla
            ? "<span style='color:" + theme.slaLine + ";font-weight:700;'>⚠️ SLA Breached (" + d.waitTime.toFixed(1) + "s > " + Math.round(effectiveSla) + "s)</span>"
            : "<span style='color:" + theme.parityLine + ";font-weight:700;'>✅ SLA Nominal (" + d.waitTime.toFixed(1) + "s)</span>";

          var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;color:" + d.tier.color + ";'>" +
            d.tier.icon + " " + d.label + " (" + d.tier.name + ")</div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Active Players:</span><strong>" + formatValue(d.volume, config.valueFormat || "compact_num") + " (" + pct + ")</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Avg Queue Wait:</span><strong>" + d.waitTime.toFixed(1) + "s</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>SLA Status:</span>" + slaStatus + "</div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Win Rate Parity:</span><strong>" + (d.winRate * 100).toFixed(1) + "%</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Cumulative CDF:</span><strong>" + (d.cumPct * 100).toFixed(1) + "%</strong></div>";

          if (d.targetVal !== null) {
            html += "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Target Benchmark:</span><strong>" + d.targetVal.toFixed(1) + "</strong></div>";
          }

          html += "<div style='margin-top:6px;font-size:10px;color:" + theme.subtext + ";text-align:right;'>Click to open Looker drill menu ↗</div>";

          tooltip.innerHTML = html;
          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          moveTooltip(event);
        }

        function moveTooltip(event) {
          var containerRect = container.getBoundingClientRect();
          var mouseX = event.clientX - containerRect.left;
          var mouseY = event.clientY - containerRect.top;

          var tooltipX = mouseX + 14;
          var tooltipY = mouseY - 20;

          if (tooltipX + 320 > containerRect.width) {
            tooltipX = mouseX - 330;
          }
          if (tooltipY + 180 > containerRect.height) {
            tooltipY = containerRect.height - 190;
          }
          if (tooltipY < 10) tooltipY = 10;

          tooltip.style.left = Math.max(10, tooltipX) + "px";
          tooltip.style.top = Math.max(10, tooltipY) + "px";
        }

        function hideTooltip() {
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        }

        function triggerDrill(d, event) {
          if (!d.rowRef) return;
          var cell = d.rowRef[ratingDim] || d.rowRef[volumeMeas];
          if (cell && cell.links && cell.links.length > 0 && LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({
              links: cell.links,
              event: event
            });
          }
        }

        done();
      });
    }
  });
})();
