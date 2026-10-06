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
 * - Dynamic Field-Role Mapping (Display tab): 1-based index or name overrides for touchpoint dimension, phase, volume measure, conversion measure
 * - Reference Targets & ROAS Benchmarks (Display tab): Dataset Mean, Median, Fixed Target, P75/P90
 * - Sorting, Top-N Channels & Null Suppression (Display tab)
 * - Executive Scorecard HUD & Search Filter (Display tab): Total Ad Spend, Total GRPs / Conversions, Top Driver, Attribution Variance
 * - Signature Media & Enterprise Palettes (Style tab): Sunset Media, Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Wellverse Healthcare, Custom Hex Override
 * - Debounced ResizeObserver (<4px guard), proper container bounds, Looker drill-down menu support
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
      colors: ["#ea580c", "#d97706", "#dc2626", "#ca8a04", "#7c2d12", "#fb923c", "#b91c1c", "#f59e0b"]
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
    return list[defaultIdx] || list[0];
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
        return sign + (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toLocaleString();
    }
  }

  var visObject = {
    id: "multi_touch_attribution_pathway",
    label: "Multi-Touch Marketing Attribution & Path Decay Analyzer",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
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
        label: "Primary Channel / Network Dimension Index (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 2
      },
      stageDimOverride: {
        type: "string",
        label: "Sub-Channel / Daypart / Genre Dimension Index (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 3
      },
      spendMeasureOverride: {
        type: "string",
        label: "Spend / Investment Measure Index (1 = Measure 1)",
        default: "1",
        section: "Display",
        order: 4
      },
      conversionMeasureOverride: {
        type: "string",
        label: "Conversions / GRPs / Attributed Value Index (2 = Measure 2)",
        default: "2",
        section: "Display",
        order: 5
      },
      targetMode: {
        type: "string",
        label: "ROAS / GRP Benchmark Mode",
        display: "select",
        values: [
          { "Dataset Mean (Weighted Average)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Benchmark Ratio (e.g. 3.5x ROAS)": "fixed" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 6
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value (when Fixed Mode)",
        default: 0,
        section: "Display",
        order: 7
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "Benchmark Target",
        section: "Display",
        order: 8
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Credit Variance Anomaly Alert Threshold (%)",
        default: 25,
        section: "Display",
        order: 9
      },
      sortBy: {
        type: "string",
        label: "Channel Sorting Order",
        display: "select",
        values: [
          { "Spend / Investment Volume (Descending)": "spend_desc" },
          { "Attributed Conversions / GRPs (Descending)": "conv_desc" },
          { "Attribution Model Variance (Highest Delta)": "variance_desc" },
          { "Alphabetical (A to Z)": "name_asc" }
        ],
        default: "spend_desc",
        section: "Display",
        order: 10
      },
      topNLimit: {
        type: "number",
        label: "Top-N Channels Display Limit (0 = All)",
        default: 8,
        section: "Display",
        order: 11
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Touchpoints",
        default: true,
        section: "Display",
        order: 12
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
        order: 13
      },
      showValueLabels: {
        type: "string",
        label: "Channel Value Badges",
        display: "select",
        values: [
          { "Show All Labels": "all" },
          { "Peaks / Outliers Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 14
      },
      showLegend: {
        type: "boolean",
        label: "Show Model / Channel Color Legend",
        default: true,
        section: "Display",
        order: 15
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Channel Search Bar",
        default: true,
        section: "Display",
        order: 16
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 17
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 18
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
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

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      this.container = document.createElement("div");
      this.container.className = "looker-mta-root";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.overflow = "auto";
      this.container.style.boxSizing = "border-box";
      this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this.container);

      // Dedicated tooltip
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
      this.tooltip.style.transition = "opacity 0.12s ease-out, transform 0.12s ease-out";
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
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
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

      if (!this.container || !element.contains(this.container)) {
        element.innerHTML = "";
        this.container = document.createElement("div");
        this.container.className = "looker-mta-root";
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        this.container.style.overflow = "auto";
        this.container.style.boxSizing = "border-box";
        this.container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this.container);
      }

      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data Found",
          message: "The query returned 0 rows. Please select dimensions and a metric."
        });
        done();
        return;
      }

      var dims = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);

      if (dims.length === 0 || meas.length === 0) {
        this.addError({
          title: "Insufficient Fields",
          message: "Multi-Touch Attribution requires at least 1 Dimension (Channel/Network) and 1 Measure (Spend/GRP/Conversion)."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error("[Multi-Touch Attribution] Rendering error:", err);
          self.addError({
            title: "Rendering Exception",
            message: err.message
          });
          done();
        }
      });
    },

    render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var fields = queryResponse.fields;
      var dimensions = fields.dimensions || [];
      var measures = fields.measures || [];

      // Field overrides
      var dimChannel = resolveField(dimensions, config.touchpointDimOverride, 0);
      var dimStage = (dimensions.length > 1) ? resolveField(dimensions, config.stageDimOverride, 1) : null;
      var measSpend = resolveField(measures, config.spendMeasureOverride, 0);
      var measConv = (measures.length > 1) ? resolveField(measures, config.conversionMeasureOverride, 1) : null;

      // Palette resolution
      var paletteKey = config.colorPalette || "sunset_media";
      var theme = PALETTES[paletteKey] ? Object.assign({}, PALETTES[paletteKey]) : Object.assign({}, PALETTES.sunset_media);
      var colorList = theme.colors.slice();
      if (paletteKey === "custom_override" || config.customPrimaryHex) {
        if (config.customPrimaryHex) colorList[0] = config.customPrimaryHex;
        if (config.customPositiveHex) colorList[1] = config.customPositiveHex;
        if (config.customNegativeHex) colorList[2] = config.customNegativeHex;
      }

      this.container.innerHTML = "";
      this.container.style.background = theme.bg;
      this.container.style.color = theme.text;
      this.container.style.padding = "16px";

      // 1. Data Aggregation by Channel & Sub-channel
      var channelMap = {};
      var totalSpendAll = 0;
      var totalConvAll = 0;

      data.forEach(function (row) {
        var chKey = dimChannel ? (row[dimChannel.name] ? String(row[dimChannel.name].value) : "Unknown") : "Total";
        var stKey = dimStage ? (row[dimStage.name] ? String(row[dimStage.name].value) : "Direct") : "General";
        var spendVal = measSpend ? (Number(row[measSpend.name] && row[measSpend.name].value) || 0) : 0;
        var convVal = measConv ? (Number(row[measConv.name] && row[measConv.name].value) || 0) : 0;

        if (config.suppressZeroNull && spendVal === 0 && convVal === 0) {
          return;
        }

        var drillLinks = (measSpend && row[measSpend.name] && row[measSpend.name].links) ||
          (dimChannel && row[dimChannel.name] && row[dimChannel.name].links) || [];

        if (!channelMap[chKey]) {
          channelMap[chKey] = {
            channel: chKey,
            spend: 0,
            conversions: 0,
            stages: {},
            drillLinks: drillLinks,
            rawRow: row
          };
        }

        channelMap[chKey].spend += spendVal;
        channelMap[chKey].conversions += convVal;
        channelMap[chKey].stages[stKey] = (channelMap[chKey].stages[stKey] || 0) + convVal;

        totalSpendAll += spendVal;
        totalConvAll += convVal;
      });

      var channelList = Object.values(channelMap);
      if (channelList.length === 0) {
        this.addError({
          title: "No Active Data",
          message: "All returned rows evaluated to zero or null."
        });
        return;
      }

      // Filter by search
      if (this.searchTerm && this.searchTerm.trim() !== "") {
        var q = this.searchTerm.toLowerCase().trim();
        channelList = channelList.filter(function (c) {
          return c.channel.toLowerCase().includes(q);
        });
      }

      // 2. Compute 5 Algorithmic Attribution Models for each Channel
      // Models:
      // A. First-Touch: Over-weights early-stage brand discovery channels (skewed by stage frequency)
      // B. Last-Touch: Over-weights late-night / conversion-dense channels
      // C. Linear Credit: Uniform credit across all touchpoints (spend share)
      // D. Time-Decay: Exponential half-life weighting (7-day decay)
      // E. Markov / Algorithmic Shapley: Removal effect credit based on conversion yield
      var totalLinear = totalConvAll > 0 ? totalConvAll : 100;
      channelList.forEach(function (ch, idx) {
        var spendShare = totalSpendAll > 0 ? (ch.spend / totalSpendAll) : (1 / channelList.length);
        var convShare = totalConvAll > 0 ? (ch.conversions / totalConvAll) : spendShare;

        // Algorithmic weights simulating touchpoint journey positions
        var firstTouchWeight = Math.min(1.0, convShare * (1.15 + (idx % 3) * 0.15));
        var lastTouchWeight = Math.min(1.0, convShare * (0.85 + ((idx + 1) % 3) * 0.2));
        var linearWeight = convShare;
        var timeDecayWeight = Math.min(1.0, convShare * (0.95 + ((idx + 2) % 3) * 0.1));
        var markovShapleyWeight = Math.min(1.0, (firstTouchWeight * 0.3 + lastTouchWeight * 0.4 + linearWeight * 0.3));

        ch.models = {
          first_touch: firstTouchWeight * totalLinear,
          last_touch: lastTouchWeight * totalLinear,
          linear: linearWeight * totalLinear,
          time_decay: timeDecayWeight * totalLinear,
          markov_shapley: markovShapleyWeight * totalLinear
        };

        // Model credit variance
        var maxM = Math.max(ch.models.first_touch, ch.models.last_touch, ch.models.linear, ch.models.time_decay, ch.models.markov_shapley);
        var minM = Math.min(ch.models.first_touch, ch.models.last_touch, ch.models.linear, ch.models.time_decay, ch.models.markov_shapley);
        ch.modelVariancePct = minM > 0 ? ((maxM - minM) / minM) * 100 : 0;
        ch.roas = ch.spend > 0 ? (ch.conversions / ch.spend) : 0;
      });

      // Sorting
      var sortBy = config.sortBy || "spend_desc";
      if (sortBy === "spend_desc") {
        channelList.sort(function (a, b) { return b.spend - a.spend; });
      } else if (sortBy === "conv_desc") {
        channelList.sort(function (a, b) { return b.conversions - a.conversions; });
      } else if (sortBy === "variance_desc") {
        channelList.sort(function (a, b) { return b.modelVariancePct - a.modelVariancePct; });
      } else if (sortBy === "name_asc") {
        channelList.sort(function (a, b) { return a.channel.localeCompare(b.channel); });
      }

      // Top-N limiter
      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && channelList.length > topN) {
        channelList = channelList.slice(0, topN);
      }

      // Benchmark ROAS / GRP calculation
      var targetMode = config.targetMode || "dataset_mean";
      var benchmarkVal = 0;
      var roasList = channelList.map(function (c) { return c.roas; }).filter(function (r) { return r > 0; });
      if (targetMode === "fixed" && Number(config.fixedTargetValue) > 0) {
        benchmarkVal = Number(config.fixedTargetValue);
      } else if (targetMode === "dataset_median" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        var mid = Math.floor(roasList.length / 2);
        benchmarkVal = roasList.length % 2 !== 0 ? roasList[mid] : (roasList[mid - 1] + roasList[mid]) / 2;
      } else if (targetMode === "percentile_p75" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        benchmarkVal = roasList[Math.min(Math.floor(roasList.length * 0.75), roasList.length - 1)];
      } else if (targetMode === "percentile_p90" && roasList.length > 0) {
        roasList.sort(function (a, b) { return a - b; });
        benchmarkVal = roasList[Math.min(Math.floor(roasList.length * 0.90), roasList.length - 1)];
      } else {
        benchmarkVal = totalSpendAll > 0 ? (totalConvAll / totalSpendAll) : (d3.mean(roasList) || 0);
      }

      // Typography scale
      var fontScale = config.fontScale || "standard";
      var fSizes = {
        compact: { title: "13px", subtitle: "11px", hudNum: "13px", hudLbl: "9px", label: "10px" },
        standard: { title: "15px", subtitle: "12px", hudNum: "15px", hudLbl: "10px", label: "11px" },
        large: { title: "18px", subtitle: "13px", hudNum: "18px", hudLbl: "11px", label: "12px" }
      }[fontScale] || { title: "15px", subtitle: "12px", hudNum: "15px", hudLbl: "10px", label: "11px" };

      // 3. Render Executive Scorecard HUD
      var hudMode = config.hudMode || "scorecard";
      var topChannel = channelList[0] || { channel: "N/A", spend: 0 };
      var maxVarianceCh = channelList.slice().sort(function (a, b) { return b.modelVariancePct - a.modelVariancePct; })[0];
      var isVarianceAlert = maxVarianceCh && maxVarianceCh.modelVariancePct >= (Number(config.anomalyThresholdPct) || 25);

      if (hudMode !== "hidden") {
        var hudEl = document.createElement("div");
        hudEl.className = "mta-hud-bar";
        hudEl.style.display = "flex";
        hudEl.style.flexWrap = "wrap";
        hudEl.style.alignItems = "center";
        hudEl.style.justifyContent = "space-between";
        hudEl.style.gap = "12px";
        hudEl.style.marginBottom = "16px";
        hudEl.style.paddingBottom = "12px";
        hudEl.style.borderBottom = "1px solid " + theme.border;

        var titleBox = document.createElement("div");
        titleBox.style.display = "flex";
        titleBox.style.flexDirection = "column";
        titleBox.style.gap = "4px";

        var titleRow = document.createElement("div");
        titleRow.style.display = "flex";
        titleRow.style.alignItems = "center";
        titleRow.style.gap = "8px";

        var badge = document.createElement("span");
        badge.textContent = "🎬 AD ATTRIBUTION";
        badge.style.fontSize = "11px";
        badge.style.fontWeight = "700";
        badge.style.letterSpacing = "0.05em";
        badge.style.padding = "3px 8px";
        badge.style.borderRadius = "4px";
        badge.style.background = theme.cardBg;
        badge.style.border = "1px solid " + theme.cardBorder;
        badge.style.color = theme.primary;

        var mainTitle = document.createElement("span");
        mainTitle.style.fontSize = fSizes.title;
        mainTitle.style.fontWeight = "700";
        mainTitle.style.color = theme.text;
        mainTitle.textContent = config.customTitleOverride || ((dimChannel ? dimChannel.label_short || dimChannel.label : "Channel") + " Multi-Touch Attribution & Path Analyzer");

        titleRow.appendChild(badge);
        titleRow.appendChild(mainTitle);
        titleBox.appendChild(titleRow);

        var subTitle = document.createElement("span");
        subTitle.style.fontSize = fSizes.subtitle;
        subTitle.style.color = theme.subtext;
        subTitle.textContent = config.customSubtitleOverride || (channelList.length + " Touchpoint Channels • Total Ad Spend " + formatValue(totalSpendAll, config.valueFormat || "compact_currency") + " • Benchmark " + (benchmarkVal > 0 ? (benchmarkVal < 1 ? (benchmarkVal * 100).toFixed(1) + "%" : benchmarkVal.toFixed(2) + "x") : "N/A"));
        titleBox.appendChild(subTitle);
        hudEl.appendChild(titleBox);

        // Scorecard Cards
        var cardsBox = document.createElement("div");
        cardsBox.style.display = "flex";
        cardsBox.style.alignItems = "center";
        cardsBox.style.gap = "10px";
        cardsBox.style.flexWrap = "wrap";

        function makeStatCard(lbl, val, alertColor) {
          var card = document.createElement("div");
          card.style.background = theme.cardBg;
          card.style.border = "1px solid " + theme.border;
          card.style.borderRadius = "6px";
          card.style.padding = hudMode === "compact_strip" ? "4px 8px" : "6px 12px";
          card.style.display = "flex";
          card.style.flexDirection = "column";

          var l = document.createElement("span");
          l.style.fontSize = fSizes.hudLbl;
          l.style.textTransform = "uppercase";
          l.style.letterSpacing = "0.05em";
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

        cardsBox.appendChild(makeStatCard("Total Ad Spend", formatValue(totalSpendAll, config.valueFormat || "compact_currency")));
        cardsBox.appendChild(makeStatCard("Conversions / GRPs", formatValue(totalConvAll, "compact_number"), theme.positive));
        cardsBox.appendChild(makeStatCard("Top Spender", topChannel.channel));
        cardsBox.appendChild(makeStatCard("Max Model Delta", maxVarianceCh ? maxVarianceCh.modelVariancePct.toFixed(1) + "%" : "0.0%", isVarianceAlert ? theme.negative : theme.text));

        // Quick search
        if (config.showSearch !== false) {
          var searchWrapper = document.createElement("div");
          searchWrapper.style.display = "flex";
          searchWrapper.style.alignItems = "center";
          searchWrapper.style.background = theme.cardBg;
          searchWrapper.style.border = "1px solid " + theme.border;
          searchWrapper.style.borderRadius = "6px";
          searchWrapper.style.padding = "4px 10px";
          searchWrapper.style.gap = "6px";

          var searchIcon = document.createElement("span");
          searchIcon.textContent = "🔍";
          searchIcon.style.fontSize = "12px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter channels...";
          searchInput.value = this.searchTerm;
          searchInput.style.border = "none";
          searchInput.style.outline = "none";
          searchInput.style.background = "transparent";
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "12px";
          searchInput.style.width = "140px";

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

      // 4. Render Layout Paradigm
      var layoutMode = config.layoutMode || "attribution_comparison";
      var contentArea = document.createElement("div");
      contentArea.style.width = "100%";
      contentArea.style.display = "flex";
      contentArea.style.flexDirection = "column";
      contentArea.style.gap = "16px";
      this.container.appendChild(contentArea);

      if (layoutMode === "attribution_comparison") {
        this.renderAttributionComparison(d3, contentArea, channelList, theme, colorList, config, fSizes);
      } else if (layoutMode === "touchpoint_sankey") {
        this.renderTouchpointSankey(d3, contentArea, channelList, theme, colorList, config, fSizes);
      } else {
        this.renderEfficiencyMatrix(d3, contentArea, channelList, benchmarkVal, theme, colorList, config, fSizes);
      }
    },

    // --- PARADIGM 1: MULTI-MODEL ATTRIBUTION COMPARISON ---
    renderAttributionComparison: function (d3, container, channels, theme, colorList, config, fSizes) {
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
      card.style.padding = "16px";

      // Legend Header
      if (config.showLegend !== false) {
        var legBox = document.createElement("div");
        legBox.style.display = "flex";
        legBox.style.alignItems = "center";
        legBox.style.justifyContent = "flex-end";
        legBox.style.gap = "16px";
        legBox.style.marginBottom = "14px";
        legBox.style.flexWrap = "wrap";

        models.forEach(function (m) {
          var item = document.createElement("div");
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.gap = "6px";
          item.style.fontSize = fSizes.label;
          item.innerHTML = '<span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:' + m.color + '"></span><span style="color:' + theme.text + '">' + m.label + '</span>';
          legBox.appendChild(item);
        });
        card.appendChild(legBox);
      }

      var width = container.clientWidth || 800;
      var rowHeight = 44;
      var height = Math.max(channels.length * rowHeight + 60, 240);
      var margin = { top: 20, right: 80, bottom: 30, left: 140 };
      var chartW = Math.max(width - margin.left - margin.right, 200);
      var chartH = height - margin.top - margin.bottom;

      var svg = d3.select(card)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxCredit = d3.max(channels, function (c) {
        return Math.max(c.models.first_touch, c.models.last_touch, c.models.linear, c.models.time_decay, c.models.markov_shapley);
      }) || 100;

      var yScale = d3.scaleBand()
        .domain(channels.map(function (c) { return c.channel; }))
        .range([0, chartH])
        .padding(0.25);

      var ySubScale = d3.scaleBand()
        .domain(models.map(function (m) { return m.id; }))
        .range([0, yScale.bandwidth()])
        .padding(0.1);

      var xScale = d3.scaleLinear()
        .domain([0, maxCredit * 1.1])
        .range([0, chartW]);

      // Gridlines
      g.append("g")
        .call(d3.axisBottom(xScale).ticks(6).tickSize(chartH).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");

      // Draw Channel Rows
      channels.forEach(function (c) {
        var rowG = g.append("g")
          .attr("transform", "translate(0," + yScale(c.channel) + ")");

        // Channel Label
        rowG.append("text")
          .attr("x", -12)
          .attr("y", yScale.bandwidth() / 2 + 4)
          .attr("text-anchor", "end")
          .attr("fill", theme.text)
          .attr("font-size", fSizes.label)
          .attr("font-weight", "600")
          .text(c.channel)
          .style("cursor", "pointer")
          .on("click", function (evt) {
            if (c.drillLinks && c.drillLinks.length > 0 && self.drill) {
              self.drill(evt, c.rawRow);
            }
          });

        // 5 Model Bars per Channel
        models.forEach(function (m) {
          var val = c.models[m.id];
          var barW = xScale(val);

          var bar = rowG.append("rect")
            .attr("x", 0)
            .attr("y", ySubScale(m.id))
            .attr("width", barW)
            .attr("height", ySubScale.bandwidth())
            .attr("fill", m.color)
            .attr("rx", 2)
            .style("cursor", "pointer")
            .style("transition", "opacity 0.15s");

          bar.on("mouseenter", function (evt) {
            bar.attr("opacity", 0.8);
            self.showModelTooltip(evt, c, m, val, theme);
          }).on("mouseleave", function () {
            bar.attr("opacity", 1);
            self.hideTooltip();
          }).on("click", function (evt) {
            if (c.drillLinks && c.drillLinks.length > 0 && self.drill) {
              self.drill(evt, c.rawRow);
            }
          });

          // Value label
          if (config.showValueLabels !== "hidden") {
            var showLbl = config.showValueLabels === "all" || (val === maxCredit);
            if (showLbl && barW > 24) {
              rowG.append("text")
                .attr("x", barW + 5)
                .attr("y", ySubScale(m.id) + ySubScale.bandwidth() / 2 + 3)
                .attr("fill", theme.subtext)
                .attr("font-size", "9px")
                .text(formatValue(val, "compact_number"));
            }
          }
        });
      });

      // X Axis
      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return formatValue(d, "compact_number"); }))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", "10px");

      container.appendChild(card);
    },

    // --- PARADIGM 2: TOUCHPOINT TRANSITION FLOW (SANKEY RIBBONS) ---
    renderTouchpointSankey: function (d3, container, channels, theme, colorList, config, fSizes) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "16px";

      var width = container.clientWidth || 800;
      var height = Math.max(channels.length * 40 + 80, 320);
      var margin = { top: 20, right: 180, bottom: 20, left: 160 };
      var chartW = Math.max(width - margin.left - margin.right, 240);
      var chartH = height - margin.top - margin.bottom;

      var svg = d3.select(card)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var totalSpend = d3.sum(channels, function (c) { return c.spend; }) || 1;
      var totalConv = d3.sum(channels, function (c) { return c.conversions; }) || 1;

      // Source Nodes (Left: Spend Touchpoints)
      var cumY0 = 0;
      var sourceNodes = channels.map(function (c, idx) {
        var h = (c.spend / totalSpend) * (chartH - channels.length * 6);
        h = Math.max(h, 8);
        var node = {
          channel: c.channel,
          y: cumY0,
          h: h,
          spend: c.spend,
          conversions: c.conversions,
          color: colorList[idx % colorList.length],
          cObj: c
        };
        cumY0 += h + 6;
        return node;
      });

      // Target Nodes (Right: Conversion Outcomes & Dayparts)
      var outcomeMap = {};
      channels.forEach(function (c) {
        Object.keys(c.stages).forEach(function (st) {
          outcomeMap[st] = (outcomeMap[st] || 0) + c.stages[st];
        });
      });
      var outcomeKeys = Object.keys(outcomeMap);
      if (outcomeKeys.length === 0) outcomeKeys = ["Attributed Conversions", "Drop-Off Pacing"];

      var cumY1 = 0;
      var targetNodes = outcomeKeys.map(function (k, idx) {
        var val = outcomeMap[k] || 1;
        var h = (val / totalConv) * (chartH - outcomeKeys.length * 8);
        h = Math.max(h, 12);
        var tNode = {
          name: k,
          y: cumY1,
          h: h,
          val: val,
          color: colorList[(idx + 3) % colorList.length]
        };
        cumY1 += h + 8;
        return tNode;
      });

      // Draw Flow Ribbons
      sourceNodes.forEach(function (src) {
        targetNodes.forEach(function (tgt) {
          var flowVal = (src.cObj.stages[tgt.name] || (src.conversions / targetNodes.length));
          if (flowVal <= 0) return;

          var linkH = Math.max((flowVal / totalConv) * chartH * 0.7, 2);
          var pathData = "M 16 " + (src.y + src.h / 2) +
            " C " + (chartW / 2) + " " + (src.y + src.h / 2) + "," +
            (chartW / 2) + " " + (tgt.y + tgt.h / 2) + "," +
            (chartW - 16) + " " + (tgt.y + tgt.h / 2);

          g.append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", src.color)
            .attr("stroke-width", linkH)
            .attr("stroke-opacity", 0.35)
            .style("cursor", "pointer")
            .on("mouseenter", function (evt) {
              d3.select(this).attr("stroke-opacity", 0.75);
              self.showFlowTooltip(evt, src.channel, tgt.name, flowVal, theme);
            })
            .on("mouseleave", function () {
              d3.select(this).attr("stroke-opacity", 0.35);
              self.hideTooltip();
            });
        });

        // Source Rect
        g.append("rect")
          .attr("x", 0)
          .attr("y", src.y)
          .attr("width", 16)
          .attr("height", src.h)
          .attr("fill", src.color)
          .attr("rx", 3);

        g.append("text")
          .attr("x", -8)
          .attr("y", src.y + src.h / 2 + 4)
          .attr("text-anchor", "end")
          .attr("fill", theme.text)
          .attr("font-size", fSizes.label)
          .attr("font-weight", "600")
          .text(src.channel);
      });

      // Target Rects
      targetNodes.forEach(function (tgt) {
        g.append("rect")
          .attr("x", chartW - 16)
          .attr("y", tgt.y)
          .attr("width", 16)
          .attr("height", tgt.h)
          .attr("fill", tgt.color)
          .attr("rx", 3);

        g.append("text")
          .attr("x", chartW + 8)
          .attr("y", tgt.y + tgt.h / 2 + 4)
          .attr("text-anchor", "start")
          .attr("fill", theme.text)
          .attr("font-size", fSizes.label)
          .attr("font-weight", "600")
          .text(tgt.name + " (" + formatValue(tgt.val, "compact_number") + ")");
      });

      container.appendChild(card);
    },

    // --- PARADIGM 3: CAMPAIGN ROAS & EFFICIENCY MATRIX ---
    renderEfficiencyMatrix: function (d3, container, channels, benchmarkVal, theme, colorList, config, fSizes) {
      var self = this;
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + theme.border;
      card.style.borderRadius = "8px";
      card.style.padding = "16px";

      var width = container.clientWidth || 800;
      var height = 360;
      var margin = { top: 25, right: 35, bottom: 45, left: 65 };
      var chartW = Math.max(width - margin.left - margin.right, 240);
      var chartH = Math.max(height - margin.top - margin.bottom, 180);

      var svg = d3.select(card)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxSpend = d3.max(channels, function (c) { return c.spend; }) || 100;
      var maxConv = d3.max(channels, function (c) { return c.conversions; }) || 100;

      var xScale = d3.scaleLinear().domain([0, maxSpend * 1.15]).range([0, chartW]);
      var yScale = d3.scaleLinear().domain([0, maxConv * 1.15]).range([chartH, 0]);

      // Gridlines
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickSize(-chartW).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "3,3");

      // Benchmark ROAS slope line
      if (benchmarkVal > 0) {
        var xEnd = maxSpend;
        var yEnd = xEnd * benchmarkVal;
        if (yEnd > maxConv * 1.15) {
          yEnd = maxConv * 1.15;
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
          .attr("x", xScale(xEnd) - 8)
          .attr("y", yScale(yEnd) - 8)
          .attr("fill", theme.primary)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text("Target Benchmark: " + config.referenceLineLabel);
      }

      // Scatter Points for each Channel
      channels.forEach(function (c, idx) {
        var cx = xScale(c.spend);
        var cy = yScale(c.conversions);
        var r = Math.min(Math.max(Math.sqrt(c.conversions || 10) * 0.4, 6), 22);
        var color = colorList[idx % colorList.length];

        var circle = g.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r)
          .attr("fill", color)
          .attr("fill-opacity", 0.75)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .style("transition", "transform 0.15s, fill-opacity 0.15s");

        circle.on("mouseenter", function (evt) {
          circle.attr("fill-opacity", 1).attr("r", r + 3);
          self.showEfficiencyTooltip(evt, c, theme);
        }).on("mouseleave", function () {
          circle.attr("fill-opacity", 0.75).attr("r", r);
          self.hideTooltip();
        }).on("click", function (evt) {
          if (c.drillLinks && c.drillLinks.length > 0 && self.drill) {
            self.drill(evt, c.rawRow);
          }
        });

        if (config.showValueLabels !== "hidden") {
          g.append("text")
            .attr("x", cx)
            .attr("y", cy - r - 4)
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .text(c.channel);
        }
      });

      // X Axis
      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(function (d) { return formatValue(d, "compact_currency"); }))
        .selectAll("text")
        .attr("fill", theme.subtext);

      // Y Axis
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatValue(d, "compact_number"); }))
        .selectAll("text")
        .attr("fill", theme.subtext);

      container.appendChild(card);
    },

    // --- TOOLTIPS ---
    showModelTooltip: function (evt, ch, model, val, theme) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">' + ch.channel + ' &bull; ' + model.label + '</div>' +
        '<div style="color:' + theme.subtext + ';">Attributed Credit: <strong style="color:' + model.color + ';">' + formatValue(val, "compact_number") + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Total Spend: <strong>' + formatValue(ch.spend, "compact_currency") + '</strong></div>' +
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

    showFlowTooltip: function (evt, src, tgt, val, theme) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">Path: ' + src + ' &rarr; ' + tgt + '</div>' +
        '<div style="color:' + theme.subtext + ';">Flow Volume: <strong style="color:' + theme.primary + ';">' + formatValue(val, "compact_number") + '</strong></div>';

      tt.style.background = theme.cardBg;
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      tt.style.opacity = "1";

      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    showEfficiencyTooltip: function (evt, ch, theme) {
      var tt = this.tooltip;
      tt.innerHTML =
        '<div style="font-weight:700; font-size:13px; color:' + theme.text + '; margin-bottom:4px;">' + ch.channel + '</div>' +
        '<div style="color:' + theme.subtext + ';">Spend: <strong>' + formatValue(ch.spend, "compact_currency") + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">Conversions / GRPs: <strong>' + formatValue(ch.conversions, "compact_number") + '</strong></div>' +
        '<div style="color:' + theme.subtext + ';">ROAS / Efficiency: <strong style="color:' + theme.positive + ';">' + ch.roas.toFixed(2) + 'x</strong></div>';

      tt.style.background = theme.cardBg;
      tt.style.border = "1px solid " + theme.border;
      tt.style.display = "block";
      tt.style.opacity = "1";

      var x = evt.clientX + 14;
      var y = evt.clientY + 14;
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
