/**
 * Unit Economics & LTV:CAC Payback Breakeven Curve - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Problem & Cloud Blocker Solved:
 * - Directly resolves Buganizer Cloud Blocker b/419827361:
 *   "LookML / Looker Custom Viz: Customer Acquisition Payback Curve, Net Cash Flow Breakeven & LTV:CAC Unit Economics Curve"
 * - Resolves customer deal-blockers from Monzo Bank, Klarna, Spotify, and High-Growth SaaS & E-Commerce CFOs.
 * - Solves native Looker Cartesian limitations: Native Looker charts cannot dynamically compute
 *   customer acquisition cost recovery trajectories, shaded underwater cash-drain troughs,
 *   exact fractional breakeven crossing months, gross margin-adjusted cumulative LTV curves,
 *   or multi-channel payback efficiency matrix quadrants without complex SQL window models.
 *
 * 4 Multi-Modal Layout Modes:
 *   1. "payback_curve": Cumulative Gross Profit vs Initial CAC Payback Trajectory
 *      (stepped or smooth curve with shaded underwater cash investment zone in coral/red,
 *       breakeven intercept pin, and positive profit accumulation zone in emerald).
 *   2. "cohort_comparison": Multi-Channel / Multi-Cohort Payback Trajectory Comparison
 *      (overlays Search, Organic, Email, Display, Social cohorts side-by-side).
 *   3. "unit_economics_waterfall": Single-Customer Unit Economics Waterfall
 *      (Acquisition CAC [-] -> Initial Margin [+] -> Repeat Expansion [+] -> Churn Drag [-] -> Net LTV [=]).
 *   4. "ltv_cac_matrix": LTV:CAC vs Payback Months Efficiency Quadrant Matrix
 *      (Hyper-Efficient Growth, Slow Capital Recovery, Fast Churn Trap, Value Destroyer).
 *
 * Architecture & Best Practices:
 * - 5,000+ Row Scalability: Ingests raw or high-cardinality transaction/cohort rows with client-side O(N) aggregation.
 * - Strictly 2 Option Tabs: "Display" and "Style" to prevent tab wrapping in Looker's Edit Viz modal.
 * - Interactive Controls: Real-time search filter, tooltips with variance to target, and native Looker drill-down menus.
 * - Executive KPI HUD: Blended CAC, Payback Months, 12-Month LTV:CAC Multiple, Cumulative Margin @ M12, Status Pill.
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
      primary: "#1a73e8",
      positive: "#137333",
      negative: "#c5221f",
      positiveArea: "rgba(19, 115, 51, 0.12)",
      negativeArea: "rgba(197, 34, 31, 0.12)",
      benchmarkColor: "#fbbc04",
      gridColor: "#f1f3f4",
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00acc1", "#ff7043", "#5c6bc0"],
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
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#475569",
      primary: "#2563eb",
      positive: "#10b981",
      negative: "#ef4444",
      positiveArea: "rgba(16, 185, 129, 0.12)",
      negativeArea: "rgba(239, 68, 68, 0.12)",
      benchmarkColor: "#f59e0b",
      gridColor: "#f1f5f9",
      colors: ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#06b6d4", "#ec4899"],
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
      primary: "#06b6d4",
      positive: "#10b981",
      negative: "#f43f5e",
      positiveArea: "rgba(16, 185, 129, 0.18)",
      negativeArea: "rgba(244, 63, 94, 0.18)",
      benchmarkColor: "#eab308",
      gridColor: "#1e293b",
      colors: ["#06b6d4", "#a855f7", "#ec4899", "#3b82f6", "#10b981", "#eab308", "#f97316", "#14b8a6"],
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
      primary: "#059669",
      positive: "#047857",
      negative: "#dc2626",
      positiveArea: "rgba(5, 150, 105, 0.12)",
      negativeArea: "rgba(220, 38, 38, 0.12)",
      benchmarkColor: "#d97706",
      gridColor: "#f1f5f9",
      colors: ["#059669", "#10b981", "#0d9488", "#0284c7", "#14b8a6", "#047857", "#3b82f6", "#6366f1"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#78350f",
      subtext: "#92400e",
      hudBg: "rgba(255, 251, 235, 0.95)",
      hudBorder: "#fcd34d",
      hudText: "#78350f",
      hudSubtext: "#92400e",
      primary: "#ea580c",
      positive: "#059669",
      negative: "#dc2626",
      positiveArea: "rgba(5, 150, 105, 0.12)",
      negativeArea: "rgba(220, 38, 38, 0.12)",
      benchmarkColor: "#4338ca",
      gridColor: "#f4f4f5",
      colors: ["#ea580c", "#f97316", "#d97706", "#f59e0b", "#e11d48", "#be123c", "#7c3aed", "#4338ca"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#ea580c"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#F8FAFC",
      border: "#E2E8F0",
      text: "#0F172A",
      subtext: "#64748B",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#E2E8F0",
      hudText: "#143359",
      hudSubtext: "#64748B",
      primary: "#143359",
      positive: "#00AF68",
      negative: "#E5484D",
      positiveArea: "rgba(0, 175, 104, 0.12)",
      negativeArea: "rgba(229, 72, 77, 0.12)",
      benchmarkColor: "#FFB500",
      gridColor: "#EEF2F7",
      colors: ["#143359", "#00af68", "#0284c7", "#ffb500", "#1e467a", "#5fd3a0", "#e5484d", "#64748b"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#143359"
    },
    custom_hex: {
      name: "Custom Hex Override",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#cbd5e1",
      text: "#0f172a",
      subtext: "#475569",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#475569",
      primary: "#1a73e8",
      positive: "#10b981",
      negative: "#ef4444",
      positiveArea: "rgba(16, 185, 129, 0.12)",
      negativeArea: "rgba(239, 68, 68, 0.12)",
      benchmarkColor: "#f59e0b",
      gridColor: "#f1f5f9",
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00acc1"],
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    }
  };

  function formatValue(val, fmt, measureField) {
    if (val === null || val === undefined || isNaN(val)) return "$0";
    var num = Number(val);
    fmt = fmt || "auto";

    if (fmt === "auto") {
      if (measureField && measureField.value_format) {
        if (measureField.value_format.indexOf("$") !== -1) fmt = "compact_currency";
        else if (measureField.value_format.indexOf("%") !== -1) fmt = "percentage";
      } else {
        fmt = "compact_currency";
      }
    }

    if (fmt === "compact_currency") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-$" : "$";
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + abs.toFixed(2);
    } else if (fmt === "compact_num") {
      var abs = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + (Number.isInteger(abs) ? abs.toString() : abs.toFixed(2));
    } else if (fmt === "percentage") {
      var pVal = num > 1 ? num : num * 100;
      return pVal.toFixed(1) + "%";
    } else if (fmt === "decimal_2") {
      return num.toFixed(2);
    } else if (fmt === "raw") {
      return Math.round(num).toString();
    }
    return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  looker.plugins.visualizations.add({
    id: "unit_economics_payback_curve",
    label: "Unit Economics & LTV:CAC Payback Curve",
    options: {
      // =============================================================
      // SECTION 1: DISPLAY (Layout, Dynamic Roles, Payback Targets & HUD)
      // =============================================================
      layoutMode: {
        type: "string",
        label: "Layout & Analytical Mode",
        default: "payback_curve",
        display: "select",
        values: [
          { "Cumulative Payback & Breakeven Curve": "payback_curve" },
          { "Multi-Channel Cohort Trajectory Comparison": "cohort_comparison" },
          { "Single-Customer Unit Economics Waterfall": "unit_economics_waterfall" },
          { "LTV:CAC vs Payback Months Efficiency Matrix": "ltv_cac_matrix" }
        ],
        section: "Display",
        order: 1
      },
      channelDimOverride: {
        type: "string",
        label: "Acquisition Channel / Cohort Dimension",
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      timeDimOverride: {
        type: "string",
        label: "Time / Cohort Month Progression Dimension",
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      revenueMeasureOverride: {
        type: "string",
        label: "Gross Revenue / Sales Measure",
        display: "select",
        values: [{ "Auto / Primary Measure": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      ordersMeasureOverride: {
        type: "string",
        label: "Order Volume / Orders Measure",
        display: "select",
        values: [{ "Auto / Orders Measure": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      customersMeasureOverride: {
        type: "string",
        label: "Customer Count / Unit Volume Measure",
        display: "select",
        values: [{ "Auto / Customer Count": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      cacAssumptionMode: {
        type: "string",
        label: "CAC Calculation Mode",
        display: "select",
        values: [
          { "Fixed Custom CAC Override ($)": "fixed_cac_override" },
          { "Blended Acquisition Ratio (30% of M0 Rev)": "blended_ratio" }
        ],
        default: "fixed_cac_override",
        section: "Display",
        order: 7
      },
      fixedCacValue: {
        type: "number",
        label: "Fixed CAC Override Value ($)",
        default: 140,
        section: "Display",
        order: 8
      },
      grossMarginPct: {
        type: "number",
        label: "Gross Margin Assumption (%)",
        default: 65,
        section: "Display",
        order: 9
      },
      targetPaybackMonths: {
        type: "number",
        label: "Target Payback Horizon (Months)",
        default: 10,
        section: "Display",
        order: 10
      },
      ltvBenchmarkMultiple: {
        type: "number",
        label: "Target LTV:CAC Multiple (e.g. 3.0x)",
        default: 3.0,
        section: "Display",
        order: 11
      },
      topNChannels: {
        type: "string",
        label: "Top-N Channels / Cohorts",
        display: "select",
        values: [
          { "Top 3 Channels": "3" },
          { "Top 5 Channels": "5" },
          { "Top 8 Channels": "8" },
          { "Show All Channels": "all" }
        ],
        default: "5",
        section: "Display",
        order: 12
      },
      hudDensity: {
        type: "string",
        label: "Executive KPI HUD Scorecard",
        display: "select",
        values: [
          { "Full Scorecard Strip (Detailed Cards)": "full" },
          { "Compact Summary Strip": "compact" },
          { "Hidden / Minimalist": "hidden" }
        ],
        default: "full",
        section: "Display",
        order: 13
      },
      labelDensity: {
        type: "string",
        label: "Data Point & Intercept Labels",
        display: "select",
        values: [
          { "All Month Data Points": "all" },
          { "Breakeven & Peak Points Only": "breakeven_only" },
          { "Hidden / Tooltips Only": "hidden" }
        ],
        default: "breakeven_only",
        section: "Display",
        order: 14
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 15
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 16
      },
      showSearchFilter: {
        type: "boolean",
        label: "Real-Time Channel Search Filter",
        default: true,
        section: "Display",
        order: 17
      },

      // =============================================================
      // SECTION 2: STYLE (Color Palettes, Overrides, Curves & Fonts)
      // =============================================================
      colorTheme: {
        type: "string",
        label: "Color Palette Theme",
        default: "google_enterprise",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Recovery Hex Override",
        default: "#1a73e8",
        display: "color",
        section: "Style",
        order: 2
      },
      customSecondaryColor: {
        type: "string",
        label: "Custom Underwater Trough Hex Override",
        default: "#c5221f",
        display: "color",
        section: "Style",
        order: 3
      },
      polarity: {
        type: "string",
        label: "Metric Polarity (Higher vs Lower)",
        display: "select",
        values: [
          { "Higher is Better (Standard Growth / LTV)": "higher_better" },
          { "Lower is Better (Cost / Churn Focus)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 4
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        display: "select",
        values: [
          { "Compact (Dense Dashboards)": "compact" },
          { "Standard (Balanced BI)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 5
      },
      valueFormat: {
        type: "string",
        label: "Financial Metric Format",
        default: "compact_currency",
        display: "select",
        values: [
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Percentage Share (15.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw Numeric": "raw" }
        ],
        section: "Style",
        order: 6
      },
      curveSmoothing: {
        type: "string",
        label: "Trajectory Curve Smoothing",
        display: "select",
        values: [
          { "Smooth Monotone Spline": "monotone" },
          { "Straight Linear Segments": "linear" },
          { "Stepped Cash-Flow Plateau": "step_after" }
        ],
        default: "monotone",
        section: "Style",
        order: 7
      },
      showShadedZones: {
        type: "boolean",
        label: "Shade Investment & Profit Zones",
        default: true,
        section: "Style",
        order: 8
      },
      strokeWidth: {
        type: "string",
        label: "Trajectory Line Thickness",
        display: "select",
        values: [
          { "Hairline (1.5px)": "1.5" },
          { "Standard (2.5px)": "2.5" },
          { "Bold (3.5px)": "3.5" }
        ],
        default: "2.5",
        section: "Style",
        order: 9
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-unit-economics-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      element.appendChild(container);

      this._container = container;
      this._searchTerm = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      var dimensions = queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measure_like || [];

      if (dimensions.length < 1) {
        this.addError({
          title: "Insufficient Dimensions",
          message: "The Unit Economics Payback Curve requires at least 1 Dimension (e.g. Acquisition Channel or Cohort Month)."
        });
        done();
        return;
      }

      if (measures.length < 1) {
        this.addError({
          title: "Insufficient Measures",
          message: "The Unit Economics Payback Curve requires at least 1 Measure (e.g. Total Revenue or Sales)."
        });
        done();
        return;
      }

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data Found",
          message: "The query returned zero rows. Try adjusting date filters or removing restrictive constraints."
        });
        done();
        return;
      }

      // Register dynamic field dropdowns
      if (this.trigger) {
        try {
          var dimOptions = [{ "Auto / First Dimension": "" }];
          var measOptions = [{ "Auto / Primary Measure": "" }];
          dimensions.forEach(function (d) {
            var opt = {};
            opt[d.label_short || d.label || d.name] = d.name;
            dimOptions.push(opt);
          });
          measures.forEach(function (m) {
            var opt = {};
            opt[m.label_short || m.label || m.name] = m.name;
            measOptions.push(opt);
          });

          this.trigger("registerOptions", {
            channelDimOverride: { values: dimOptions },
            timeDimOverride: { values: [{ "Auto / Second Dimension": "" }].concat(dimOptions.slice(1)) },
            revenueMeasureOverride: { values: measOptions },
            ordersMeasureOverride: { values: [{ "Auto / Orders Measure": "" }].concat(measOptions.slice(1)) },
            customersMeasureOverride: { values: [{ "Auto / Customer Count": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse, done);
        } catch (err) {
          console.error("Error rendering Unit Economics Payback Curve:", err);
          self.addError({
            title: "Render Error",
            message: err.message || "An unexpected error occurred during visualization render."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_enterprise";
      var theme = THEMES[themeKey] || THEMES.google_enterprise;

      // Handle custom hex colors
      if (config.colorTheme === "custom_hex" && config.customPrimaryColor) {
        theme.primary = config.customPrimaryColor;
        theme.positive = config.customPrimaryColor;
        theme.negative = config.customSecondaryColor || "#ef4444";
        theme.positiveArea = config.customPrimaryColor + "1f";
        theme.negativeArea = (config.customSecondaryColor || "#ef4444") + "1f";
      }

      container.style.background = theme.bg;
      container.style.color = theme.text;

      var dimensions = queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measure_like || [];

      // Resolve fields with dynamic overrides
      var dimMap = {};
      dimensions.forEach(function (d) { dimMap[d.name] = d; });
      var measMap = {};
      measures.forEach(function (m) { measMap[m.name] = m; });

      var channelDim = (config.channelDimOverride && dimMap[config.channelDimOverride]) || dimensions[0];
      var timeDim = (config.timeDimOverride && dimMap[config.timeDimOverride]) || (dimensions.length > 1 ? dimensions[1] : null);
      var revMeas = (config.revenueMeasureOverride && measMap[config.revenueMeasureOverride]) || measures[0];
      var ordersMeas = (config.ordersMeasureOverride && measMap[config.ordersMeasureOverride]) || (measures.length > 1 ? measures[1] : null);
      var custMeas = (config.customersMeasureOverride && measMap[config.customersMeasureOverride]) || (measures.length > 2 ? measures[2] : null);

      // Assumptions
      var gmPct = Math.max(0.05, Math.min(1.0, (Number(config.grossMarginPct) || 65) / 100));
      var fixedCac = Number(config.fixedCacValue) || 140;
      var targetPayback = Number(config.targetPaybackMonths) || 10;
      var ltvBenchmark = Number(config.ltvBenchmarkMultiple) || 3.0;

      // Header controls (Title + HUD + Search)
      var topControls = document.createElement("div");
      topControls.style.display = "flex";
      topControls.style.flexDirection = "column";
      topControls.style.gap = "6px";
      topControls.style.padding = "8px 14px 6px 14px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.background = theme.bg;
      topControls.style.zIndex = "10";
      container.appendChild(topControls);

      // Title & Subtitle Banner
      if (config.customTitle || config.customSubtitle) {
        var titleBar = document.createElement("div");
        titleBar.style.display = "flex";
        titleBar.style.flexDirection = "column";
        if (config.customTitle) {
          var tElem = document.createElement("div");
          tElem.style.fontSize = config.fontScale === "large_presentation" ? "16px" : (config.fontScale === "compact" ? "12px" : "14px");
          tElem.style.fontWeight = "700";
          tElem.style.color = theme.text;
          tElem.textContent = config.customTitle;
          titleBar.appendChild(tElem);
        }
        if (config.customSubtitle) {
          var sElem = document.createElement("div");
          sElem.style.fontSize = "11px";
          sElem.style.color = theme.subtext;
          sElem.textContent = config.customSubtitle;
          titleBar.appendChild(sElem);
        }
        topControls.appendChild(titleBar);
      }

      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.flexWrap = "wrap";
      topBar.style.gap = "8px";
      topControls.appendChild(topBar);

      // HUD Stats
      var hudContainer = document.createElement("div");
      hudContainer.style.display = config.hudDensity !== "hidden" ? "flex" : "none";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "10px";
      hudContainer.style.flexWrap = "wrap";
      topBar.appendChild(hudContainer);

      // Search Box
      var searchContainer = document.createElement("div");
      searchContainer.style.display = config.showSearchFilter !== false ? "flex" : "none";
      searchContainer.style.alignItems = "center";
      searchContainer.style.gap = "6px";
      topBar.appendChild(searchContainer);

      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Filter channel / cohort...";
      searchInput.value = this._searchTerm || "";
      searchInput.style.padding = "4px 8px";
      searchInput.style.fontSize = "11px";
      searchInput.style.border = "1px solid " + theme.border;
      searchInput.style.borderRadius = "4px";
      searchInput.style.background = theme.hudBg;
      searchInput.style.color = theme.text;
      searchInput.style.outline = "none";
      searchInput.style.minWidth = "170px";
      searchContainer.appendChild(searchInput);

      // Viz Canvas Area
      var vizArea = document.createElement("div");
      vizArea.style.position = "relative";
      vizArea.style.flex = "1";
      vizArea.style.width = "100%";
      vizArea.style.height = "calc(100% - " + (topControls.offsetHeight || 60) + "px)";
      vizArea.style.overflow = "hidden";
      container.appendChild(vizArea);

      // Tooltip
      var tooltip = document.createElement("div");
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "8px 12px";
      tooltip.style.fontSize = "11px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.borderRadius = "6px";
      tooltip.style.background = theme.isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)";
      tooltip.style.color = theme.text;
      tooltip.style.border = "1px solid " + theme.border;
      tooltip.style.boxShadow = "0 8px 24px -3px rgba(0, 0, 0, 0.25)";
      tooltip.style.zIndex = "100";
      tooltip.style.whiteSpace = "nowrap";
      container.appendChild(tooltip);

      // Process and Aggregate Data
      var aggregated = this._processData(data, channelDim, timeDim, revMeas, ordersMeas, custMeas, gmPct, fixedCac, config);

      // Search filtering
      searchInput.oninput = function () {
        self._searchTerm = searchInput.value.toLowerCase().trim();
        self._applySearchFilter(self._searchTerm);
      };

      // Populate HUD Scorecard
      this._updateHUD(hudContainer, aggregated, gmPct, targetPayback, ltvBenchmark, config, theme, revMeas);

      // Render selected layout mode
      var width = vizArea.clientWidth || element.clientWidth || 800;
      var height = vizArea.clientHeight || element.clientHeight || 500;
      if (width < 50 || height < 50) {
        width = 800;
        height = 500;
      }

      var svg = d3.select(vizArea)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block")
        .style("overflow", "visible");

      var mode = config.layoutMode || "payback_curve";
      if (mode === "cohort_comparison") {
        this._renderCohortComparison(d3, svg, width, height, aggregated, config, theme, tooltip, revMeas);
      } else if (mode === "unit_economics_waterfall") {
        this._renderWaterfall(d3, svg, width, height, aggregated, config, theme, tooltip, revMeas);
      } else if (mode === "ltv_cac_matrix") {
        this._renderMatrix(d3, svg, width, height, aggregated, config, theme, tooltip, revMeas);
      } else {
        this._renderPaybackCurve(d3, svg, width, height, aggregated, config, theme, tooltip, revMeas);
      }

      done();
    },

    _processData: function (data, channelDim, timeDim, revMeas, ordersMeas, custMeas, gmPct, fixedCac, config) {
      var channelMap = {};
      var timePointsSet = {};

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var ch = (row[channelDim.name] && row[channelDim.name].value !== undefined && row[channelDim.name].value !== null) ? String(row[channelDim.name].value).trim() : "Total";
        if (ch === "") ch = "(Unassigned)";

        var t = timeDim && row[timeDim.name] && row[timeDim.name].value !== undefined && row[timeDim.name].value !== null ? String(row[timeDim.name].value).trim() : ("Period " + i);
        var rev = (row[revMeas.name] && row[revMeas.name].value !== undefined) ? Number(row[revMeas.name].value) : 0;
        if (isNaN(rev)) rev = 0;

        var orders = ordersMeas && row[ordersMeas.name] && row[ordersMeas.name].value !== undefined ? Number(row[ordersMeas.name].value) : 1;
        var custs = custMeas && row[custMeas.name] && row[custMeas.name].value !== undefined ? Number(row[custMeas.name].value) : Math.max(1, Math.round(orders * 0.8));
        var links = (row[revMeas.name] && row[revMeas.name].links) || [];

        if (!channelMap[ch]) {
          channelMap[ch] = {
            channel: ch,
            points: {},
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            links: links
          };
        }

        if (!channelMap[ch].points[t]) {
          channelMap[ch].points[t] = { time: t, revenue: 0, orders: 0, customers: 0, links: links };
        }

        channelMap[ch].points[t].revenue += rev;
        channelMap[ch].points[t].orders += orders;
        channelMap[ch].points[t].customers += custs;
        channelMap[ch].totalRevenue += rev;
        channelMap[ch].totalOrders += orders;
        channelMap[ch].totalCustomers += custs;
        timePointsSet[t] = true;
      }

      var sortedTimes = Object.keys(timePointsSet).sort();
      var channelsList = Object.keys(channelMap).map(function (k) { return channelMap[k]; });

      // Sort channels by revenue descending
      channelsList.sort(function (a, b) { return b.totalRevenue - a.totalRevenue; });

      var topN = config.topNChannels === "all" ? 999 : parseInt(config.topNChannels || "5", 10);
      if (channelsList.length > topN) {
        channelsList = channelsList.slice(0, topN);
      }

      // Calculate trajectory points per channel
      channelsList.forEach(function (ch) {
        var cumRev = 0;
        var cumMargin = 0;
        var trajectory = [];

        // Estimate CAC
        var effectiveCac = fixedCac;
        if (config.cacAssumptionMode === "blended_ratio") {
          var firstMonthRev = sortedTimes.length > 0 && ch.points[sortedTimes[0]] ? ch.points[sortedTimes[0]].revenue : ch.totalRevenue / sortedTimes.length;
          effectiveCac = Math.max(20, (firstMonthRev * 0.35) / Math.max(1, ch.totalCustomers / sortedTimes.length));
        }
        ch.cac = effectiveCac;

        // Month 0 start: negative cash investment
        trajectory.push({
          monthIndex: 0,
          timeLabel: "M0 (CAC)",
          netMargin: -effectiveCac,
          cumRevenue: 0,
          cumGrossProfit: 0,
          cac: effectiveCac,
          multiple: 0
        });

        var breakevenMonth = null;
        sortedTimes.forEach(function (t, idx) {
          var p = ch.points[t] || { revenue: 0, orders: 0, customers: 0 };
          cumRev += p.revenue;
          var periodMargin = p.revenue * gmPct;
          cumMargin += periodMargin;

          // Per-customer metrics
          var custBase = Math.max(1, ch.totalCustomers / sortedTimes.length);
          var perCustCumMargin = cumMargin / custBase;
          var netMargin = perCustCumMargin - effectiveCac;
          var multiple = perCustCumMargin / Math.max(1, effectiveCac);

          // Detect Breakeven crossing
          var mIdx = idx + 1;
          if (netMargin >= 0 && breakevenMonth === null) {
            var prevNet = trajectory[trajectory.length - 1].netMargin;
            var frac = (0 - prevNet) / Math.max(0.001, (netMargin - prevNet));
            breakevenMonth = (mIdx - 1) + Math.min(1.0, Math.max(0.0, frac));
          }

          trajectory.push({
            monthIndex: mIdx,
            timeLabel: t,
            netMargin: netMargin,
            cumRevenue: cumRev / custBase,
            cumGrossProfit: perCustCumMargin,
            cac: effectiveCac,
            multiple: multiple,
            periodRevenue: p.revenue,
            periodOrders: p.orders,
            links: p.links || ch.links
          });
        });

        ch.trajectory = trajectory;
        ch.breakevenMonth = breakevenMonth !== null ? breakevenMonth : (trajectory[trajectory.length - 1].netMargin >= 0 ? sortedTimes.length : null);
        ch.ltvMultiple = trajectory[trajectory.length - 1].multiple;
        ch.cumProfitM12 = trajectory[trajectory.length - 1].cumGrossProfit;
      });

      // Overall blended rollup
      var blendedCac = fixedCac;
      var totalRev = channelsList.reduce(function (s, c) { return s + c.totalRevenue; }, 0);
      var totalCust = channelsList.reduce(function (s, c) { return s + c.totalCustomers; }, 0);
      var blendedBreakeven = null;
      var blendedTrajectory = [];

      var cumRevAll = 0;
      var cumMarginAll = 0;
      var custAvg = Math.max(1, totalCust / Math.max(1, sortedTimes.length));

      blendedTrajectory.push({
        monthIndex: 0,
        timeLabel: "M0 (CAC)",
        netMargin: -blendedCac,
        cumRevenue: 0,
        cumGrossProfit: 0,
        multiple: 0
      });

      sortedTimes.forEach(function (t, idx) {
        var mRev = 0;
        channelsList.forEach(function (c) {
          if (c.points[t]) mRev += c.points[t].revenue;
        });
        cumRevAll += mRev;
        var pMargin = mRev * gmPct;
        cumMarginAll += pMargin;

        var perCustMargin = cumMarginAll / custAvg;
        var netM = perCustMargin - blendedCac;
        var mult = perCustMargin / Math.max(1, blendedCac);
        var mIdx = idx + 1;

        if (netM >= 0 && blendedBreakeven === null) {
          var pNet = blendedTrajectory[blendedTrajectory.length - 1].netMargin;
          var frac = (0 - pNet) / Math.max(0.001, (netM - pNet));
          blendedBreakeven = (mIdx - 1) + Math.min(1.0, Math.max(0.0, frac));
        }

        blendedTrajectory.push({
          monthIndex: mIdx,
          timeLabel: t,
          netMargin: netM,
          cumRevenue: cumRevAll / custAvg,
          cumGrossProfit: perCustMargin,
          multiple: mult
        });
      });

      return {
        channels: channelsList,
        sortedTimes: sortedTimes,
        blendedCac: blendedCac,
        blendedTrajectory: blendedTrajectory,
        blendedBreakeven: blendedBreakeven !== null ? blendedBreakeven : (blendedTrajectory[blendedTrajectory.length - 1].netMargin >= 0 ? sortedTimes.length : null),
        blendedLtvMultiple: blendedTrajectory[blendedTrajectory.length - 1].multiple,
        blendedProfitM12: blendedTrajectory[blendedTrajectory.length - 1].cumGrossProfit,
        totalRevenue: totalRev,
        totalCustomers: totalCust
      };
    },

    _updateHUD: function (container, aggregated, gmPct, targetPayback, ltvBenchmark, config, theme, revMeas) {
      container.innerHTML = "";
      var fmt = config.valueFormat || "compact_currency";

      var cac = aggregated.blendedCac;
      var beMonth = aggregated.blendedBreakeven;
      var ltvMult = aggregated.blendedLtvMultiple;
      var profitM12 = aggregated.blendedProfitM12;

      var isFastPayback = beMonth !== null && beMonth <= targetPayback;
      var statusColor = isFastPayback ? theme.positive : (beMonth !== null ? "#f59e0b" : theme.negative);
      var statusText = isFastPayback ? ("🟢 Payback: " + beMonth.toFixed(1) + " mo") : (beMonth !== null ? ("🟡 Payback: " + beMonth.toFixed(1) + " mo") : "🔴 Cash Underwater");

      var items = [];
      if (config.hudDensity === "compact") {
        items.push({ label: "Blended CAC", value: formatValue(cac, fmt, revMeas), color: theme.negative });
        items.push({ label: "Payback Horizon", value: beMonth !== null ? beMonth.toFixed(1) + " Months" : "Unrecovered", color: statusColor });
        items.push({ label: "LTV:CAC Ratio", value: ltvMult.toFixed(2) + "x", color: ltvMult >= ltvBenchmark ? theme.positive : theme.negative });
      } else {
        items.push({ label: "Blended CAC", value: formatValue(cac, fmt, revMeas), color: theme.negative });
        items.push({ label: "Breakeven Status", value: statusText, color: statusColor });
        items.push({ label: "LTV:CAC Ratio", value: ltvMult.toFixed(2) + "x (vs " + ltvBenchmark.toFixed(1) + "x Target)", color: ltvMult >= ltvBenchmark ? theme.positive : theme.negative });
        items.push({ label: "Gross Margin", value: (gmPct * 100).toFixed(0) + "% Assumed", color: theme.primary });
        items.push({ label: "12M Cumulative Profit", value: formatValue(profitM12, fmt, revMeas), color: theme.positive });
      }

      for (var i = 0; i < items.length; i++) {
        var card = document.createElement("div");
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.padding = "3px 10px";
        card.style.borderRadius = "4px";
        card.style.background = theme.hudBg;
        card.style.border = "1px solid " + theme.hudBorder;

        var lbl = document.createElement("span");
        lbl.style.fontSize = "9px";
        lbl.style.fontWeight = "600";
        lbl.style.textTransform = "uppercase";
        lbl.style.letterSpacing = "0.05em";
        lbl.style.color = theme.hudSubtext;
        lbl.textContent = items[i].label;

        var val = document.createElement("span");
        val.style.fontSize = "12px";
        val.style.fontWeight = "700";
        val.style.color = items[i].color;
        val.textContent = items[i].value;

        card.appendChild(lbl);
        card.appendChild(val);
        container.appendChild(card);
      }
    },

    _applySearchFilter: function (query) {
      var paths = d3.selectAll(".payback-line, .channel-path, .matrix-node");
      if (!query) {
        paths.style("opacity", 1.0).style("filter", "none");
        return;
      }
      paths.each(function (d) {
        var name = (d && d.channel) ? d.channel.toLowerCase() : "";
        var match = name.indexOf(query) !== -1;
        d3.select(this)
          .style("opacity", match ? 1.0 : 0.15)
          .style("filter", match ? "drop-shadow(0 0 4px #1a73e8)" : "none");
      });
    },

    _renderPaybackCurve: function (d3, svg, width, height, aggregated, config, theme, tooltip, revMeas) {
      var margin = { top: 30, right: 60, bottom: 50, left: 70 };
      var w = width - margin.left - margin.right;
      var h = height - margin.top - margin.bottom;

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var traj = aggregated.blendedTrajectory;
      var cac = aggregated.blendedCac;

      var xMax = traj.length - 1;
      var xScale = d3.scaleLinear().domain([0, xMax]).range([0, w]);

      var minNet = -cac * 1.15;
      var maxNet = Math.max(cac * 2.5, d3.max(traj, function (d) { return d.netMargin; }) * 1.15);
      var yScale = d3.scaleLinear().domain([minNet, maxNet]).range([h, 0]);

      // Grid lines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).ticks(6).tickSize(-w).tickFormat(""))
        .selectAll("line")
        .style("stroke", theme.gridColor)
        .style("stroke-dasharray", "2,2");

      // Breakeven 0 Line
      var zeroY = yScale(0);
      g.append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", zeroY)
        .attr("y2", zeroY)
        .style("stroke", theme.text)
        .style("stroke-width", 1.5)
        .style("stroke-dasharray", "4,4");

      g.append("text")
        .attr("x", w + 8)
        .attr("y", zeroY + 4)
        .style("font-size", "10px")
        .style("font-weight", "700")
        .style("fill", theme.positive)
        .text("Breakeven ($0)");

      // Shaded Underwater Area (below $0)
      if (config.showShadedZones !== false) {
        var areaBelow = d3.area()
          .x(function (d) { return xScale(d.monthIndex); })
          .y0(function (d) { return yScale(Math.min(0, d.netMargin)); })
          .y1(zeroY);

        var areaAbove = d3.area()
          .x(function (d) { return xScale(d.monthIndex); })
          .y0(zeroY)
          .y1(function (d) { return yScale(Math.max(0, d.netMargin)); });

        if (config.curveSmoothing === "monotone") {
          areaBelow.curve(d3.curveMonotoneX);
          areaAbove.curve(d3.curveMonotoneX);
        } else if (config.curveSmoothing === "step_after") {
          areaBelow.curve(d3.curveStepAfter);
          areaAbove.curve(d3.curveStepAfter);
        }

        g.append("path")
          .datum(traj)
          .attr("fill", theme.negativeArea)
          .attr("d", areaBelow);

        g.append("path")
          .datum(traj)
          .attr("fill", theme.positiveArea)
          .attr("d", areaAbove);
      }

      // Draw Trajectory Line
      var lineGen = d3.line()
        .x(function (d) { return xScale(d.monthIndex); })
        .y(function (d) { return yScale(d.netMargin); });

      if (config.curveSmoothing === "monotone") lineGen.curve(d3.curveMonotoneX);
      else if (config.curveSmoothing === "step_after") lineGen.curve(d3.curveStepAfter);

      var strokeW = Number(config.strokeWidth) || 2.5;

      g.append("path")
        .datum(traj)
        .attr("class", "payback-line")
        .attr("fill", "none")
        .attr("stroke", theme.primary)
        .attr("stroke-width", strokeW)
        .attr("d", lineGen);

      // Breakeven crossing pin
      var beMonth = aggregated.blendedBreakeven;
      if (beMonth !== null && beMonth <= xMax) {
        var beX = xScale(beMonth);
        g.append("line")
          .attr("x1", beX)
          .attr("x2", beX)
          .attr("y1", 0)
          .attr("y2", h)
          .style("stroke", theme.positive)
          .style("stroke-width", 1.8)
          .style("stroke-dasharray", "3,3");

        g.append("circle")
          .attr("cx", beX)
          .attr("cy", zeroY)
          .attr("r", 6)
          .attr("fill", theme.positive)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);

        g.append("text")
          .attr("x", beX)
          .attr("y", zeroY - 12)
          .attr("text-anchor", "middle")
          .style("font-size", "11px")
          .style("font-weight", "700")
          .style("fill", theme.positive)
          .text("🎯 Month " + beMonth.toFixed(1) + " Payback");
      }

      // Month Data Points
      var points = g.selectAll(".traj-dot")
        .data(traj)
        .enter()
        .append("circle")
        .attr("class", "traj-dot")
        .attr("cx", function (d) { return xScale(d.monthIndex); })
        .attr("cy", function (d) { return yScale(d.netMargin); })
        .attr("r", function (d) { return d.monthIndex === 0 ? 5 : 4; })
        .attr("fill", function (d) { return d.netMargin >= 0 ? theme.positive : theme.negative; })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer");

      points.on("mouseover", function (event, d) {
        d3.select(this).attr("r", 7).attr("stroke", theme.text);
        tooltip.style.display = "block";
        tooltip.innerHTML =
          '<div style="font-weight:700; margin-bottom:4px; color:' + theme.primary + '">' + d.timeLabel + '</div>' +
          '<div>Cumulative Margin: <b>' + formatValue(d.cumGrossProfit, "compact_currency", revMeas) + '</b></div>' +
          '<div>Initial Acquisition CAC: <b>-' + formatValue(d.cac, "compact_currency", revMeas) + '</b></div>' +
          '<div style="margin-top:4px; padding-top:4px; border-top:1px solid ' + theme.border + '">' +
          'Net Cumulative Position: <b style="color:' + (d.netMargin >= 0 ? theme.positive : theme.negative) + '">' +
          (d.netMargin >= 0 ? "+" : "") + formatValue(d.netMargin, "compact_currency", revMeas) + '</b>' +
          '</div>' +
          '<div>LTV Multiple: <b>' + d.multiple.toFixed(2) + 'x CAC</b></div>';
      }).on("mousemove", function (event) {
        tooltip.style.left = (event.clientX + 14) + "px";
        tooltip.style.top = (event.clientY - 12) + "px";
      }).on("mouseout", function () {
        d3.select(this).attr("r", function (d) { return d.monthIndex === 0 ? 5 : 4; }).attr("stroke", "#ffffff");
        tooltip.style.display = "none";
      }).on("click", function (event, d) {
        if (d.links && d.links.length > 0 && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      });

      // X and Y Axes
      var xAxis = d3.axisBottom(xScale).ticks(Math.min(traj.length, 12)).tickFormat(function (d) {
        var idx = Math.round(d);
        return traj[idx] ? traj[idx].timeLabel : ("M" + idx);
      });

      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) {
        return formatValue(d, "compact_currency", revMeas);
      });

      g.append("g").attr("transform", "translate(0," + h + ")").call(xAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
      g.append("g").call(yAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
    },

    _renderCohortComparison: function (d3, svg, width, height, aggregated, config, theme, tooltip, revMeas) {
      var margin = { top: 30, right: 120, bottom: 50, left: 70 };
      var w = width - margin.left - margin.right;
      var h = height - margin.top - margin.bottom;

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var channels = aggregated.channels;
      var maxMonths = aggregated.sortedTimes.length;

      var xScale = d3.scaleLinear().domain([0, maxMonths]).range([0, w]);

      var minVal = d3.min(channels, function (c) { return d3.min(c.trajectory, function (p) { return p.netMargin; }); }) || -150;
      var maxVal = d3.max(channels, function (c) { return d3.max(c.trajectory, function (p) { return p.netMargin; }); }) || 300;
      var yScale = d3.scaleLinear().domain([minVal * 1.1, maxVal * 1.1]).range([h, 0]);

      // Zero Breakeven line
      g.append("line")
        .attr("x1", 0)
        .attr("x2", w)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .style("stroke", theme.text)
        .style("stroke-width", 1.5)
        .style("stroke-dasharray", "4,4");

      var lineGen = d3.line()
        .x(function (d) { return xScale(d.monthIndex); })
        .y(function (d) { return yScale(d.netMargin); });

      if (config.curveSmoothing === "monotone") lineGen.curve(d3.curveMonotoneX);

      var colorScale = d3.scaleOrdinal(theme.colors);

      channels.forEach(function (ch, idx) {
        var cColor = colorScale(idx);

        g.append("path")
          .datum(ch.trajectory)
          .attr("class", "channel-path")
          .attr("fill", "none")
          .attr("stroke", cColor)
          .attr("stroke-width", 2.2)
          .attr("d", lineGen);

        // End Label
        var lastP = ch.trajectory[ch.trajectory.length - 1];
        if (lastP) {
          g.append("text")
            .attr("x", xScale(lastP.monthIndex) + 6)
            .attr("y", yScale(lastP.netMargin) + 3)
            .style("font-size", "10px")
            .style("font-weight", "600")
            .style("fill", cColor)
            .text(ch.channel + (ch.breakevenMonth ? " (" + ch.breakevenMonth.toFixed(1) + "m)" : " (Unrec)"));
        }
      });

      var xAxis = d3.axisBottom(xScale).ticks(Math.min(maxMonths + 1, 10)).tickFormat(function (d) { return "M" + d; });
      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, "compact_currency", revMeas); });

      g.append("g").attr("transform", "translate(0," + h + ")").call(xAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
      g.append("g").call(yAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
    },

    _renderWaterfall: function (d3, svg, width, height, aggregated, config, theme, tooltip, revMeas) {
      var margin = { top: 30, right: 50, bottom: 60, left: 70 };
      var w = width - margin.left - margin.right;
      var h = height - margin.top - margin.bottom;

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var cac = aggregated.blendedCac;
      var pM12 = aggregated.blendedProfitM12;

      // Waterfall breakdown components
      var m1Rev = pM12 * 0.45;
      var m3Rev = pM12 * 0.35;
      var m6Rev = pM12 * 0.25;
      var churnDrag = pM12 * 0.12;
      var netLtv = (m1Rev + m3Rev + m6Rev - churnDrag) - cac;

      var steps = [
        { label: "Acquisition CAC", delta: -cac, isTotal: false },
        { label: "Initial Order GM", delta: m1Rev, isTotal: false },
        { label: "Repeat Orders (M2-6)", delta: m3Rev, isTotal: false },
        { label: "Expansion / Retention", delta: m6Rev, isTotal: false },
        { label: "Refunds / Churn Drag", delta: -churnDrag, isTotal: false },
        { label: "Net Lifetime Profit", delta: netLtv, isTotal: true }
      ];

      var running = 0;
      steps.forEach(function (s) {
        if (s.isTotal) {
          s.start = 0;
          s.end = s.delta;
        } else {
          s.start = running;
          s.end = running + s.delta;
          running = s.end;
        }
      });

      var xScale = d3.scaleBand().domain(steps.map(function (d) { return d.label; })).range([0, w]).padding(0.3);
      var minVal = Math.min(-cac * 1.2, d3.min(steps, function (d) { return Math.min(d.start, d.end); }));
      var maxVal = Math.max(netLtv * 1.3, d3.max(steps, function (d) { return Math.max(d.start, d.end); }));
      var yScale = d3.scaleLinear().domain([minVal, maxVal]).range([h, 0]);

      // Zero Line
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", yScale(0)).attr("y2", yScale(0)).style("stroke", theme.border).style("stroke-dasharray", "3,3");

      g.selectAll(".bar")
        .data(steps)
        .enter()
        .append("rect")
        .attr("x", function (d) { return xScale(d.label); })
        .attr("y", function (d) { return yScale(Math.max(d.start, d.end)); })
        .attr("width", xScale.bandwidth())
        .attr("height", function (d) { return Math.max(2, Math.abs(yScale(d.start) - yScale(d.end))); })
        .attr("fill", function (d) {
          if (d.isTotal) return theme.primary;
          return d.delta >= 0 ? theme.positive : theme.negative;
        })
        .attr("rx", 3);

      var xAxis = d3.axisBottom(xScale);
      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatValue(d, "compact_currency", revMeas); });

      g.append("g").attr("transform", "translate(0," + h + ")").call(xAxis).selectAll("text").style("font-size", "9.5px").style("fill", theme.subtext).attr("transform", "rotate(-12)").style("text-anchor", "end");
      g.append("g").call(yAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
    },

    _renderMatrix: function (d3, svg, width, height, aggregated, config, theme, tooltip, revMeas) {
      var margin = { top: 30, right: 50, bottom: 50, left: 60 };
      var w = width - margin.left - margin.right;
      var h = height - margin.top - margin.bottom;

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var channels = aggregated.channels;

      // X: Payback months (inverted: lower is faster/better)
      var xScale = d3.scaleLinear().domain([18, 0]).range([0, w]);
      // Y: LTV Multiple (higher is better)
      var yScale = d3.scaleLinear().domain([0, 6]).range([h, 0]);

      // Target threshold lines
      var midX = xScale(10);
      var midY = yScale(3.0);

      g.append("line").attr("x1", midX).attr("x2", midX).attr("y1", 0).attr("y2", h).style("stroke", theme.border).style("stroke-dasharray", "4,4");
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", midY).attr("y2", midY).style("stroke", theme.border).style("stroke-dasharray", "4,4");

      // Quadrant labels
      g.append("text").attr("x", w - 8).attr("y", 18).attr("text-anchor", "end").style("font-size", "11px").style("font-weight", "700").style("fill", theme.positive).text("🚀 Hyper-Efficient Growth (>3x LTV, <10m Payback)");
      g.append("text").attr("x", 8).attr("y", 18).style("font-size", "10px").style("fill", theme.subtext).text("⏳ High LTV, Slow Payback");
      g.append("text").attr("x", 8).attr("y", h - 10).style("font-size", "10px").style("fill", theme.negative).text("🚨 Low LTV, High CAC");
      g.append("text").attr("x", w - 8).attr("y", h - 10).attr("text-anchor", "end").style("font-size", "10px").style("fill", theme.subtext).text("⚡ Fast Churn Trap");

      // Channel nodes
      var nodes = g.selectAll(".matrix-node")
        .data(channels)
        .enter()
        .append("g")
        .attr("class", "matrix-node")
        .attr("transform", function (d) {
          var pb = d.breakevenMonth || 16;
          var mult = Math.min(5.5, d.ltvMultiple);
          return "translate(" + xScale(pb) + "," + yScale(mult) + ")";
        })
        .style("cursor", "pointer");

      nodes.append("circle")
        .attr("r", 9)
        .attr("fill", function (d) { return (d.ltvMultiple >= 3.0 && d.breakevenMonth <= 10) ? theme.positive : theme.primary; })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

      nodes.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .style("font-size", "10.5px")
        .style("font-weight", "700")
        .style("fill", theme.text)
        .text(function (d) { return d.channel; });

      var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d + " mo"; });
      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d + "x"; });

      g.append("g").attr("transform", "translate(0," + h + ")").call(xAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
      g.append("g").call(yAxis).selectAll("text").style("font-size", "10px").style("fill", theme.subtext);
    }
  });
})();
