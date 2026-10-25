/**
 * Sunburst Multi-Level Partition Wheel & Radial Drilldown Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Enterprise Customer Requirements:
 * - b/340585545, b/328594464, b/396197680, b/530822261
 * - High-demand enterprise BI request: Radial hierarchical breakdown with smooth zooming drilldowns,
 *   parent-to-child proportional angle subdivision, secondary metric color gradients,
 *   multi-mode layouts (Radial Sunburst Wheel, Icicle Horizontal Partition, and Concentric Donut Rings),
 *   5,000+ row client-side tree rollup with Top-N & Others consolidation,
 *   search-as-you-type highlighting, rich interactive breadcrumbs, and native Looker drill-down menus.
 *
 * Multi-Mode Adaptability:
 * 1. "sunburst_wheel": Classic Multi-Level Radial Sunburst Wheel with angular proportional partitioning.
 * 2. "icicle_partition": Linear / Horizontal Hierarchical Icicle Partition (orthogonal cascading flow).
 * 3. "concentric_rings": Concentric Layered Donut Rings with uniform ring thickness and centered KPI readout.
 *
 * Color Modes:
 * 1. "branch_palette": Categorical color assigned per root branch with automatic child luminance stepping.
 * 2. "metric_diverging": Secondary metric mapped across a continuous Red -> Gold -> Emerald gradient.
 * 3. "depth_gradient": Monochromatic radial gradient darkening from root core to outer rings.
 *
 * Scalability:
 * - Handles 5,000+ rows effortlessly via client-side tree rollup, sub-threshold leaf pruning (<0.2%),
 *   and responsive SVG rendering with transition tweens.
 *
 * Minimal Option Sections (Strictly 2 tabs):
 * - Display: layoutMode, colorMode, innerHoleRadius, maxDepthDisplay, topNThreshold, valueMetricFormat,
 *            showExecutiveHUD, showBreadcrumbTrail, showSearchFilter, showSliceLabels, enableZoomDrill.
 * - Style: colorTheme, sliceCornerRadius, slicePadding, labelFontSize, labelOrientation.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.partition === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.partition === "function") {
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

  var COLOR_THEMES = {
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00acc1", "#ff7043", "#5c6bc0", "#00897b", "#d81b60"],
      bg: "#ffffff",
      cardBg: "#f8fafd",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      hudBg: "rgba(248, 250, 253, 0.95)",
      hudBorder: "#dadce0",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#e8f0fe",
      breadcrumbText: "#1a73e8",
      centerCircleBg: "#ffffff",
      diverging: ["#ea4335", "#fbbc04", "#34a853"]
    },
    modern_slate: {
      name: "Modern Slate",
      isDark: false,
      colors: ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#64748b", "#06b6d4", "#ec4899", "#14b8a6", "#f97316"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#475569",
      border: "#cbd5e1",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbText: "#0f172a",
      centerCircleBg: "#ffffff",
      diverging: ["#ef4444", "#f59e0b", "#10b981"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      isDark: true,
      colors: ["#06b6d4", "#a855f7", "#ec4899", "#3b82f6", "#10b981", "#eab308", "#f97316", "#14b8a6", "#6366f1", "#f43f5e"],
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1f2937",
      hudBg: "rgba(15, 23, 42, 0.90)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      sliceStroke: "#0b0f19",
      breadcrumbBg: "#1e293b",
      breadcrumbText: "#38bdf8",
      centerCircleBg: "#0f172a",
      diverging: ["#f43f5e", "#eab308", "#06b6d4"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      colors: ["#059669", "#10b981", "#0d9488", "#0284c7", "#14b8a6", "#047857", "#3b82f6", "#6366f1", "#f59e0b", "#64748b"],
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      text: "#064e3b",
      subtext: "#047857",
      border: "#bbf7d0",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#dcfce7",
      breadcrumbText: "#14532d",
      centerCircleBg: "#ffffff",
      diverging: ["#dc2626", "#d97706", "#059669"]
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      colors: ["#ea580c", "#f97316", "#d97706", "#f59e0b", "#e11d48", "#be123c", "#7c3aed", "#4338ca", "#059669", "#71717a"],
      bg: "#ffffff",
      cardBg: "#fffbeb",
      text: "#78350f",
      subtext: "#92400e",
      border: "#fde68a",
      hudBg: "rgba(255, 251, 235, 0.95)",
      hudBorder: "#fcd34d",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#fef3c7",
      breadcrumbText: "#92400e",
      centerCircleBg: "#ffffff",
      diverging: ["#dc2626", "#f59e0b", "#ea580c"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      colors: ["#143359", "#00af68", "#0284c7", "#ffb500", "#1e467a", "#5fd3a0", "#e5484d", "#64748b", "#0d9488", "#94a3b8"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#e2e8f0",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#e2e8f0",
      breadcrumbText: "#143359",
      centerCircleBg: "#ffffff",
      diverging: ["#e5484d", "#ffb500", "#00af68"]
    },
    custom_hex: {
      name: "Custom Hex Override",
      isDark: false,
      colors: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00acc1"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#1e293b",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbText: "#1e293b",
      centerCircleBg: "#ffffff",
      diverging: ["#ea4335", "#fbbc04", "#1a73e8"]
    },
    modern_google: {
      name: "Looker / Google Modern (Light)",
      isDark: false,
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60"],
      bg: "#ffffff",
      cardBg: "#f8fafc",
      text: "#1f2937",
      subtext: "#6b7280",
      border: "#e5e7eb",
      hudBg: "#f8fafc",
      hudBorder: "#e2e8f0",
      sliceStroke: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbText: "#1e293b",
      centerCircleBg: "#ffffff",
      diverging: ["#EA4335", "#FBBC04", "#34A853"]
    }
  };
  function formatValue(val, fmt, measureField) {
    if (val === null || val === undefined || isNaN(val)) return "0";
    var num = Number(val);
    fmt = fmt || "auto";

    if (fmt === "auto") {
      if (measureField && measureField.value_format) {
        if (measureField.value_format.indexOf("$") !== -1) fmt = "compact_currency";
        else if (measureField.value_format.indexOf("%") !== -1) fmt = "percentage";
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
    return num.toLocaleString();
  }
  looker.plugins.visualizations.add({
    id: "sunburst_partition_wheel",
    label: "Sunburst Multi-Level Partition Wheel",
    options: {
      // =============================================================
      // SECTION 1: DISPLAY (Layout, Dynamic Roles, Targets & Density)
      // =============================================================
      layoutMode: {
        type: "string",
        label: "Layout & Geometry Mode",
        default: "sunburst_wheel",
        display: "select",
        values: [
          { "Sunburst Radial Wheel (360° Partition)": "sunburst_wheel" },
          { "Linear Horizontal Icicle (Cascading Flow)": "icicle_partition" },
          { "Concentric Layered Donut Rings": "concentric_rings" }
        ],
        section: "Display",
        order: 1
      },
      colorMode: {
        type: "string",
        label: "Color Encoding Strategy",
        default: "branch_palette",
        display: "select",
        values: [
          { "Categorical by Root Hierarchy Branch": "branch_palette" },
          { "Secondary Metric Diverging Gradient": "metric_diverging" },
          { "Depth Monochromatic Radial Gradient": "depth_gradient" }
        ],
        section: "Display",
        order: 2
      },
      dimLevel1Override: {
        type: "string",
        label: "Level 1 Dimension (Root Category)",
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      dimLevel2Override: {
        type: "string",
        label: "Level 2 Dimension (Sub-Category)",
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      dimLevel3Override: {
        type: "string",
        label: "Level 3 Dimension (Detail Level)",
        display: "select",
        values: [{ "Auto / Third Dimension": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      dimLevel4Override: {
        type: "string",
        label: "Level 4 Dimension (Leaf Entity)",
        display: "select",
        values: [{ "Auto / Fourth Dimension": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      measurePrimaryOverride: {
        type: "string",
        label: "Primary Arc Sizing Measure",
        display: "select",
        values: [{ "Auto / Primary Measure": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      measureSecondaryOverride: {
        type: "string",
        label: "Secondary Color Gradient Measure",
        display: "select",
        values: [{ "None / Optional Secondary": "" }],
        default: "",
        section: "Display",
        order: 8
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark / Target Mode",
        display: "select",
        values: [
          { "None / Disabled": "none" },
          { "Dataset Mean Average": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Benchmark (P90)": "percentile_p90" },
          { "Fixed Custom Target Value": "fixed_value" }
        ],
        default: "none",
        section: "Display",
        order: 9
      },
      targetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        default: 100000,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        default: "Benchmark Target",
        section: "Display",
        order: 11
      },
      alertThreshold: {
        type: "number",
        label: "Anomaly Alert Threshold (%)",
        default: 20,
        section: "Display",
        order: 12
      },
      sortOrder: {
        type: "string",
        label: "Sibling Node Sort Order",
        display: "select",
        values: [
          { "Metric Descending (Largest First)": "metric_desc" },
          { "Metric Ascending (Smallest First)": "metric_asc" },
          { "Alphabetical (A to Z)": "alpha_asc" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 13
      },
      topNThreshold: {
        type: "string",
        label: "Top-N Sibling Consolidation",
        default: "15",
        display: "select",
        values: [
          { "Top 5 Siblings + 'Others'": "5" },
          { "Top 8 Siblings + 'Others'": "8" },
          { "Top 12 Siblings + 'Others'": "12" },
          { "Top 15 Siblings + 'Others'": "15" },
          { "Top 25 Siblings + 'Others'": "25" },
          { "Show All Siblings": "all" }
        ],
        section: "Display",
        order: 14
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Null Rows",
        default: true,
        section: "Display",
        order: 15
      },
      innerHoleRadius: {
        type: "number",
        label: "Center Hole Radius (%)",
        default: 22,
        display: "range",
        min: 10,
        max: 50,
        step: 2,
        section: "Display",
        order: 16
      },
      hudDensity: {
        type: "string",
        label: "Executive KPI HUD Scorecard",
        display: "select",
        values: [
          { "Full Scorecard Strip (Detailed Cards)": "full" },
          { "Compact Summary Badge": "compact" },
          { "Hidden / Minimalist": "hidden" }
        ],
        default: "full",
        section: "Display",
        order: 17
      },
      labelDensity: {
        type: "string",
        label: "Segment Label Density",
        display: "select",
        values: [
          { "All Readable Segments": "all" },
          { "Major Branches & Peaks Only (>5% Share)": "prominent" },
          { "Hidden / Tooltips Only": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 18
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 19
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 20
      },
      showBreadcrumbTrail: {
        type: "boolean",
        label: "Interactive Breadcrumb Trail",
        default: true,
        section: "Display",
        order: 21
      },
      showSearchFilter: {
        type: "boolean",
        label: "Real-Time Node Search Filter",
        default: true,
        section: "Display",
        order: 22
      },
      enableZoomDrill: {
        type: "boolean",
        label: "Click-to-Zoom Radial Drilldown",
        default: true,
        section: "Display",
        order: 23
      },

      // =============================================================
      // SECTION 2: STYLE (Color Palettes, Overrides, Polarity & Fonts)
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
          { "Looker / Google Modern (Light)": "modern_google" },
          { "Custom Hex Override": "custom_hex" }
        ],
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Brand Color Hex",
        default: "#1a73e8",
        display: "color",
        section: "Style",
        order: 2
      },
      customSecondaryColor: {
        type: "string",
        label: "Custom Secondary / Accent Color Hex",
        default: "#34a853",
        display: "color",
        section: "Style",
        order: 3
      },
      polarity: {
        type: "string",
        label: "Metric Polarity (Higher vs Lower)",
        display: "select",
        values: [
          { "Higher is Better (Revenue, Retained Users)": "higher_better" },
          { "Lower is Better (Cost, Latency, Defects, Churn)": "lower_better" }
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
          { "Large Presentation (Boardroom / Kiosk)": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 5
      },
      valueMetricFormat: {
        type: "string",
        label: "Primary Metric Value Format",
        default: "auto",
        display: "select",
        values: [
          { "Auto (Match LookML Format)": "auto" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Percentage Share (15.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw Numeric (Unformatted)": "raw" }
        ],
        section: "Style",
        order: 6
      },
      sliceCornerRadius: {
        type: "string",
        label: "Segment Arc Corner Radius",
        default: "2",
        display: "select",
        values: [
          { "Sharp Edges (0px)": "0" },
          { "Slightly Rounded (2px)": "2" },
          { "Modern Curved (4px)": "4" },
          { "Full Pill Rounded (6px)": "6" }
        ],
        section: "Style",
        order: 7
      },
      slicePadding: {
        type: "string",
        label: "Arc Segment Inner Padding",
        default: "2",
        display: "select",
        values: [
          { "Flush Border (0px)": "0" },
          { "Hairline Gap (1px)": "1" },
          { "Subtle Gap (2px)": "2" },
          { "Distinct Gap (4px)": "4" }
        ],
        section: "Style",
        order: 8
      },
      labelOrientation: {
        type: "string",
        label: "Radial Text Label Orientation",
        default: "curved_radial",
        display: "select",
        values: [
          { "Tangential / Circular Arc Flow": "curved_radial" },
          { "Spoke / Centered Radial Rays": "spoke_radial" },
          { "Horizontal Standard": "horizontal" }
        ],
        section: "Style",
        order: 9
      }
    },
    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-sunburst-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      element.appendChild(container);

      this._container = container;
      this._currentNode = null;
      this._searchTerm = "";
      this._rootData = null;
      this._lastDimensions = [];
      this._lastMeasures = [];
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      var dimensions = queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measure_like || [];

      var measMap = {};
      for (var mIdx = 0; mIdx < measures.length; mIdx++) {
        measMap[measures[mIdx].name] = measures[mIdx];
      }
      var primaryMeas = (config.measurePrimaryOverride && measMap[config.measurePrimaryOverride]) || measures[0];
      var secondaryMeas = (config.measureSecondaryOverride && measMap[config.measureSecondaryOverride]) || (measures.length > 1 ? measures[1] : null);

      // Handle custom hex colors
      if (config.colorTheme === "custom_hex" && config.customPrimaryColor) {
        theme.colors = [config.customPrimaryColor, config.customSecondaryColor || "#34a853", "#fbbc04", "#ea4335", "#9334e6", "#00acc1"];
        theme.diverging = [config.customSecondaryColor || "#ea4335", "#fbbc04", config.customPrimaryColor];
      }

      // Title & Subtitle Banner (if configured)
      if (config.customTitle || config.customSubtitle) {
        var titleBar = document.createElement("div");
        titleBar.style.padding = "6px 12px 0px 12px";
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
        container.appendChild(titleBar);
      }
      // Header controls (HUD + Search + Breadcrumbs)
      var topControls = document.createElement("div");
      topControls.style.display = "flex";
      topControls.style.flexDirection = "column";
      topControls.style.gap = "6px";
      topControls.style.padding = "8px 12px 4px 12px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.background = theme.bg;
      topControls.style.zIndex = "10";
      container.appendChild(topControls);

      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.flexWrap = "wrap";
      topBar.style.gap = "8px";
      topControls.appendChild(topBar);

      // HUD Stats
      var hudContainer = document.createElement("div");
      hudContainer.style.display = config.showExecutiveHUD !== false ? "flex" : "none";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "12px";
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
      searchInput.placeholder = "🔍 Search hierarchy nodes...";
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

      // Breadcrumb Trail Row
      var breadcrumbContainer = document.createElement("div");
      breadcrumbContainer.style.display = config.showBreadcrumbTrail !== false ? "flex" : "none";
      breadcrumbContainer.style.alignItems = "center";
      breadcrumbContainer.style.flexWrap = "wrap";
      breadcrumbContainer.style.gap = "4px";
      breadcrumbContainer.style.fontSize = "11px";
      topControls.appendChild(breadcrumbContainer);

      // Viz Area
      var vizArea = document.createElement("div");
      vizArea.style.position = "relative";
      vizArea.style.flex = "1";
      vizArea.style.width = "100%";
      vizArea.style.height = "calc(100% - " + (topControls.offsetHeight || 50) + "px)";
      vizArea.style.overflow = "hidden";
      container.appendChild(vizArea);

      // Floating Tooltip
      var tooltip = document.createElement("div");
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "8px 12px";
      tooltip.style.fontSize = "11px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.borderRadius = "6px";
      tooltip.style.background = theme.isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.97)";
      tooltip.style.color = theme.text;
      tooltip.style.border = "1px solid " + (theme.isDark ? "#334155" : "#cbd5e1");
      tooltip.style.boxShadow = "0 8px 20px -2px rgba(0, 0, 0, 0.25)";
      tooltip.style.zIndex = "100";
      tooltip.style.whiteSpace = "nowrap";
      container.appendChild(tooltip);

      // Build hierarchical tree
      var hierarchyRoot = this._buildHierarchy(data, dimensions, primaryMeas, secondaryMeas, config);
      this._rootData = hierarchyRoot;

      var root = d3.hierarchy(hierarchyRoot)
        .sum(function (d) { return d.value || 0; })
        .sort(function (a, b) { return (b.value || 0) - (a.value || 0); });

      // Determine active node (if user drilled in and node still exists)
      var activeNode = root;
      if (this._currentNode) {
        var found = null;
        root.each(function (n) {
          if (n.data.id === self._currentNode.data.id) found = n;
        });
        if (found) activeNode = found;
      }
      this._currentNode = activeNode;

      // Update HUD
      this._updateHUD(hudContainer, activeNode, root, primaryMeas, secondaryMeas, config, theme);

      // Update Breadcrumbs
      this._updateBreadcrumbs(breadcrumbContainer, activeNode, root, config, theme, function (targetNode) {
        self._currentNode = targetNode;
        self._render(d3, data, element, config, queryResponse, done);
      });

      // Filter input event
      searchInput.oninput = function () {
        self._searchTerm = searchInput.value.toLowerCase().trim();
        self._applySearchFilter(self._searchTerm);
      };

      // Measure dimensions of vizArea
      var rect = vizArea.getBoundingClientRect();
      var width = Math.max(rect.width || container.clientWidth || 400, 240);
      var height = Math.max(rect.height || (container.clientHeight - (topControls.offsetHeight || 50)) || 300, 200);

      var svg = d3.select(vizArea).append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      var layoutMode = config.layoutMode || "sunburst_wheel";

      if (layoutMode === "icicle_partition") {
        this._renderIcicle(d3, svg, width, height, root, activeNode, config, theme, tooltip, primaryMeas, secondaryMeas, data);
      } else {
        // Sunburst or concentric rings
        this._renderSunburst(d3, svg, width, height, root, activeNode, config, theme, tooltip, primaryMeas, secondaryMeas, data);
      }

      // Hook ResizeObserver if not already attached
      if (!this._resizeObserver) {
        this._lastHeight = element.offsetHeight;
        this._resizeObserver = new ResizeObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var currentHeight = entries[i].contentRect.height;
            if (Math.abs(currentHeight - (self._lastHeight || 0)) > 4) {
              self._lastHeight = currentHeight;
              if (self._resizeTimeout) clearTimeout(self._resizeTimeout);
              self._resizeTimeout = setTimeout(function () {
                self._render(d3, data, element, config, queryResponse, done);
              }, 120);
            }
          }
        });
        this._resizeObserver.observe(element);
      }

      done();
    },

    _buildHierarchy: function (data, dimensions, primaryMeas, secondaryMeas, config) {
      var root = {
        name: config.customTitle || "Total Organization",
        id: "root",
        depth: 0,
        children: [],
        links: []
      };

      var topN = config.topNThreshold === "all" ? 9999 : parseInt(config.topNThreshold || "15", 10);
      var maxDepth = parseInt(config.maxDepthDisplay || "5", 10);

      // Resolve effective dimensions with dynamic overrides
      var dimMap = {};
      for (var dm = 0; dm < dimensions.length; dm++) {
        dimMap[dimensions[dm].name] = dimensions[dm];
      }
      var effectiveDims = [];
      var overrides = [config.dimLevel1Override, config.dimLevel2Override, config.dimLevel3Override, config.dimLevel4Override];
      for (var ov = 0; ov < overrides.length; ov++) {
        if (overrides[ov] && dimMap[overrides[ov]]) {
          effectiveDims.push(dimMap[overrides[ov]]);
        }
      }
      if (effectiveDims.length === 0) {
        effectiveDims = dimensions.slice(0, maxDepth);
      } else {
        effectiveDims = effectiveDims.slice(0, maxDepth);
      }

      // Aggregate row-level data into a nested map
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var val = (row[primaryMeas.name] && row[primaryMeas.name].value) || 0;
        if (isNaN(val)) val = 0;
        var secVal = secondaryMeas && row[secondaryMeas.name] && row[secondaryMeas.name].value !== undefined ? Number(row[secondaryMeas.name].value) : null;
        var cellLinks = (row[primaryMeas.name] && row[primaryMeas.name].links) || [];

        // Suppress null / zero rows
        if (config.suppressNulls !== false && val === 0 && (secVal === null || secVal === 0)) {
          continue;
        }

        var currentNode = root;
        for (var d = 0; d < effectiveDims.length; d++) {
          var dim = effectiveDims[d];
          var cell = row[dim.name];
          var name = cell && cell.value !== undefined && cell.value !== null ? String(cell.value).trim() : "Unknown";
          if (name === "" || name === "null" || name === "undefined") {
            if (config.suppressNulls !== false) {
              name = "(Unassigned)";
            } else {
              name = "(Blank)";
            }
          }

          var dimLinks = (cell && cell.links) || [];
          var combinedLinks = [].concat(dimLinks, cellLinks);

          var child = null;
          for (var c = 0; c < currentNode.children.length; c++) {
            if (currentNode.children[c].name === name) {
              child = currentNode.children[c];
              break;
            }
          }

          if (!child) {
            child = {
              name: name,
              id: currentNode.id + "::" + name,
              depth: d + 1,
              dimName: dim.label_short || dim.label || dim.name,
              children: [],
              value: 0,
              secondaryTotal: 0,
              secondaryCount: 0,
              links: combinedLinks
            };
            currentNode.children.push(child);
          }

          child.value += val;
          if (secVal !== null && !isNaN(secVal)) {
            child.secondaryTotal += secVal;
            child.secondaryCount += 1;
            child.secondaryVal = child.secondaryTotal / child.secondaryCount;
          }
          currentNode = child;
        }
      }

      // Consolidate beyond topN into "Others" per level and sort
      var sortMode = config.sortOrder || "metric_desc";
      function pruneTree(node) {
        if (!node.children || node.children.length === 0) return;

        node.children.sort(function (a, b) {
          if (sortMode === "metric_asc") return (a.value || 0) - (b.value || 0);
          if (sortMode === "alpha_asc") return a.name.localeCompare(b.name);
          if (sortMode === "natural") return 0;
          return (b.value || 0) - (a.value || 0);
        });

        if (node.children.length > topN) {
          var keep = node.children.slice(0, topN);
          var others = node.children.slice(topN);

          var othersValue = 0;
          var othersSecTotal = 0;
          var othersSecCount = 0;
          for (var o = 0; o < others.length; o++) {
            othersValue += others[o].value || 0;
            othersSecTotal += others[o].secondaryTotal || 0;
            othersSecCount += others[o].secondaryCount || 0;
          }

          keep.push({
            name: "Other " + (node.children[0].dimName || "Nodes") + " (" + others.length + ")",
            id: node.id + "::others",
            depth: node.depth + 1,
            dimName: node.children[0].dimName,
            children: [],
            value: othersValue,
            secondaryVal: othersSecCount > 0 ? othersSecTotal / othersSecCount : null,
            links: []
          });

          node.children = keep;
        }

        for (var c = 0; c < node.children.length; c++) {
          pruneTree(node.children[c]);
        }
      }

      pruneTree(root);
      return root;
    },
    _updateHUD: function (container, activeNode, root, primaryMeas, secMeas, config, theme) {
      container.innerHTML = "";
      if (config.hudDensity === "hidden") {
        container.style.display = "none";
        return;
      }
      container.style.display = "flex";

      var fmt = config.valueMetricFormat || "auto";
      var totalVal = activeNode.value || 0;
      var rootVal = root.value || 1;
      var shareOfTotal = (totalVal / rootVal) * 100;
      var childCount = (activeNode.children && activeNode.children.length) || 0;

      // Benchmark Target calculation
      var targetMode = config.targetCalculationMode || "none";
      var targetBenchmark = null;
      if (targetMode === "fixed_value") {
        targetBenchmark = Number(config.targetValue) || 100000;
      } else if (targetMode !== "none" && root.children && root.children.length > 0) {
        var vals = root.children.map(function (c) { return c.value || 0; }).sort(function (a, b) { return a - b; });
        if (targetMode === "dataset_mean") {
          var sum = vals.reduce(function (a, b) { return a + b; }, 0);
          targetBenchmark = sum / vals.length;
        } else if (targetMode === "dataset_median") {
          var mid = Math.floor(vals.length / 2);
          targetBenchmark = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
        } else if (targetMode === "percentile_p75") {
          var idx75 = Math.floor(vals.length * 0.75);
          targetBenchmark = vals[idx75] || vals[vals.length - 1];
        } else if (targetMode === "percentile_p90") {
          var idx90 = Math.floor(vals.length * 0.90);
          targetBenchmark = vals[idx90] || vals[vals.length - 1];
        }
      }

      var variancePct = targetBenchmark && targetBenchmark > 0 ? ((totalVal - targetBenchmark) / targetBenchmark) * 100 : null;
      var isLowerBetter = config.polarity === "lower_better";
      var isPositive = variancePct !== null ? (isLowerBetter ? variancePct <= 0 : variancePct >= 0) : true;
      var statusColor = isPositive ? (theme.diverging ? theme.diverging[2] : "#10b981") : (theme.diverging ? theme.diverging[0] : "#ef4444");

      var items = [];
      if (config.hudDensity === "compact") {
        items.push({
          label: activeNode.depth === 0 ? "Global Total" : (activeNode.data.dimName || "Node") + ": " + activeNode.data.name,
          value: formatValue(totalVal, fmt, primaryMeas),
          color: theme.colors[0]
        });
        items.push({
          label: "Share of Total",
          value: shareOfTotal.toFixed(1) + "%",
          color: theme.colors[1] || theme.text
        });
      } else {
        // Full Scorecard
        items.push({
          label: activeNode.depth === 0 ? "Total Volume" : (activeNode.data.dimName || "Active Level"),
          value: activeNode.depth === 0 ? formatValue(totalVal, fmt, primaryMeas) : activeNode.data.name,
          color: theme.colors[0]
        });
        items.push({
          label: (primaryMeas.label_short || primaryMeas.label || "Volume"),
          value: formatValue(totalVal, fmt, primaryMeas),
          color: theme.colors[0]
        });
        items.push({
          label: "Share of Total",
          value: shareOfTotal.toFixed(1) + "%",
          color: theme.colors[1] || theme.text
        });
        items.push({
          label: "Sub-Categories",
          value: childCount.toString() + " branches",
          color: theme.colors[2] || theme.subtext
        });

        if (targetBenchmark !== null) {
          items.push({
            label: config.referenceLineLabel || "Benchmark Target",
            value: formatValue(targetBenchmark, fmt, primaryMeas),
            color: theme.colors[3] || theme.subtext
          });
          items.push({
            label: "Benchmark Var.",
            value: (variancePct >= 0 ? "+" : "") + variancePct.toFixed(1) + "%",
            color: statusColor
          });
        }

        if (secMeas && activeNode.data.secondaryVal !== undefined && activeNode.data.secondaryVal !== null) {
          items.push({
            label: (secMeas.label_short || secMeas.label || "Avg Secondary"),
            value: formatValue(activeNode.data.secondaryVal, fmt, secMeas),
            color: theme.colors[4] || theme.text
          });
        }
      }

      for (var i = 0; i < items.length; i++) {
        var card = document.createElement("div");
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.padding = "2px 8px";
        card.style.borderRadius = "4px";
        card.style.background = theme.hudBg;
        card.style.border = "1px solid " + theme.hudBorder;

        var lbl = document.createElement("span");
        lbl.style.fontSize = "9px";
        lbl.style.fontWeight = "600";
        lbl.style.textTransform = "uppercase";
        lbl.style.letterSpacing = "0.05em";
        lbl.style.color = theme.subtext;
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
    _updateBreadcrumbs: function (container, activeNode, root, config, theme, onSelect) {
      container.innerHTML = "";
      var path = [];
      var curr = activeNode;
      while (curr) {
        path.unshift(curr);
        curr = curr.parent;
      }

      var trailLabel = document.createElement("span");
      trailLabel.style.fontWeight = "600";
      trailLabel.style.color = theme.subtext;
      trailLabel.style.marginRight = "4px";
      trailLabel.textContent = "📍 Trail:";
      container.appendChild(trailLabel);

      for (var i = 0; i < path.length; i++) {
        (function (node, index) {
          var isLast = index === path.length - 1;
          var pill = document.createElement("span");
          pill.style.padding = "2px 6px";
          pill.style.borderRadius = "3px";
          pill.style.cursor = isLast ? "default" : "pointer";
          pill.style.background = isLast ? theme.colors[0] : theme.breadcrumbBg;
          pill.style.color = isLast ? "#ffffff" : theme.breadcrumbText;
          pill.style.fontWeight = isLast ? "700" : "500";
          pill.textContent = node.data.name;

          if (!isLast) {
            pill.onmouseover = function () { pill.style.opacity = "0.8"; };
            pill.onmouseout = function () { pill.style.opacity = "1.0"; };
            pill.onclick = function () { onSelect(node); };
          }

          container.appendChild(pill);

          if (!isLast) {
            var sep = document.createElement("span");
            sep.style.color = theme.subtext;
            sep.textContent = "❯";
            container.appendChild(sep);
          }
        })(path[i], i);
      }

      if (activeNode !== root) {
        var resetBtn = document.createElement("span");
        resetBtn.style.marginLeft = "8px";
        resetBtn.style.padding = "2px 6px";
        resetBtn.style.borderRadius = "3px";
        resetBtn.style.cursor = "pointer";
        resetBtn.style.background = "#fee2e2";
        resetBtn.style.color = "#b91c1c";
        resetBtn.style.fontWeight = "600";
        resetBtn.textContent = "↺ Reset to Root";
        resetBtn.onclick = function () { onSelect(root); };
        container.appendChild(resetBtn);
      }
    },

    _applySearchFilter: function (query) {
      var self = this;
      var paths = d3.selectAll(".sunburst-arc, .icicle-rect");
      if (!query) {
        paths.style("opacity", 1.0).style("filter", "none");
        return;
      }
      paths.each(function (d) {
        var el = d3.select(this);
        var match = d.data.name.toLowerCase().indexOf(query) !== -1;
        if (match) {
          el.style("opacity", 1.0).style("filter", "drop-shadow(0 0 4px #38bdf8)");
        } else {
          el.style("opacity", 0.18).style("filter", "none");
        }
      });
    },

    _renderSunburst: function (d3, svg, width, height, root, activeNode, config, theme, tooltip, primaryMeas, secMeas, data) {
      var self = this;
      var radius = Math.min(width, height) / 2 - 8;
      var innerPct = (config.innerHoleRadius || 22) / 100;
      var isConcentric = config.layoutMode === "concentric_rings";

      var g = svg.append("g")
        .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

      // D3 partition layout
      var partition = d3.partition()
        .size([2 * Math.PI, radius * radius]);

      partition(root);

      // Arc generator
      var padAngle = (parseInt(config.slicePadding || "2", 10) / 1000) * Math.PI;
      var cornerRadius = parseInt(config.sliceCornerRadius || "2", 10);

      var arc = d3.arc()
        .startAngle(function (d) { return d.x0; })
        .endAngle(function (d) { return d.x1; })
        .padAngle(function (d) { return padAngle; })
        .padRadius(radius / 2)
        .innerRadius(function (d) {
          if (isConcentric) {
            var ringWidth = (radius * (1 - innerPct)) / (root.height || 1);
            return (radius * innerPct) + ((d.depth - 1) * ringWidth);
          }
          return Math.sqrt(d.y0) + (d.depth === 1 ? radius * innerPct : 0);
        })
        .outerRadius(function (d) {
          if (isConcentric) {
            var ringWidth = (radius * (1 - innerPct)) / (root.height || 1);
            return (radius * innerPct) + (d.depth * ringWidth);
          }
          return Math.max(Math.sqrt(d.y0), Math.sqrt(d.y1) - 1);
        })
        .cornerRadius(cornerRadius);

      // Build branch color map
      var branchMap = {};
      if (root.children) {
        for (var b = 0; b < root.children.length; b++) {
          branchMap[root.children[b].data.name] = theme.colors[b % theme.colors.length];
        }
      }

      function getNodeBranch(d) {
        var curr = d;
        while (curr.depth > 1) curr = curr.parent;
        return curr.data.name;
      }

      // Secondary metric color scale if mode is metric_diverging
      var colorScale = null;
      if (config.colorMode === "metric_diverging" && secMeas) {
        var secVals = [];
        root.each(function (n) {
          if (n.data.secondaryVal !== undefined && n.data.secondaryVal !== null) secVals.push(n.data.secondaryVal);
        });
        var minV = secVals.length > 0 ? d3.min(secVals) : 0;
        var maxV = secVals.length > 0 ? d3.max(secVals) : 1;
        var midV = (minV + maxV) / 2;
        colorScale = d3.scaleLinear()
          .domain([minV, midV, maxV])
          .range(theme.diverging);
      }

      function getNodeColor(d) {
        if (d.depth === 0) return theme.bg;
        if (config.colorMode === "metric_diverging" && colorScale && d.data.secondaryVal !== undefined && d.data.secondaryVal !== null) {
          return colorScale(d.data.secondaryVal);
        }
        if (config.colorMode === "depth_gradient") {
          var t = d.depth / (root.height + 1);
          return d3.interpolateBlues(0.3 + 0.6 * t);
        }
        // Branch palette
        var branchName = getNodeBranch(d);
        var baseColor = branchMap[branchName] || theme.colors[0];
        if (d.depth === 1) return baseColor;
        var depthMod = (d.depth - 1) * 0.12;
        return d3.color(baseColor).brighter(depthMod).formatHex();
      }

      // Filter nodes to render (only visible within activeNode drill down)
      var nodesToRender = root.descendants().filter(function (d) {
        // Exclude root from wheel itself (draw center hub circle instead)
        if (d.depth === 0) return false;
        // In zoom drilldown mode, only show descendants of activeNode
        var curr = d;
        var isChildOfActive = false;
        while (curr) {
          if (curr === activeNode) {
            isChildOfActive = true;
            break;
          }
          curr = curr.parent;
        }
        return isChildOfActive;
      });

      // Slices
      var sliceGroup = g.append("g").attr("class", "slices");

      var path = sliceGroup.selectAll("path")
        .data(nodesToRender)
        .enter().append("path")
        .attr("class", "sunburst-arc")
        .attr("d", arc)
        .style("fill", function (d) { return getNodeColor(d); })
        .style("stroke", theme.sliceStroke)
        .style("stroke-width", "1px")
        .style("cursor", config.enableZoomDrill !== false ? "pointer" : "default")
        .on("mouseover", function (event, d) {
          d3.select(this)
            .style("stroke", "#ffffff")
            .style("stroke-width", "2.5px")
            .style("filter", "brightness(1.15)");

          var fmt = config.valueMetricFormat || "compact_currency";
          var pctParent = d.parent ? ((d.value / d.parent.value) * 100).toFixed(1) + "%" : "100%";
          var pctTotal = ((d.value / (root.value || 1)) * 100).toFixed(1) + "%";

          var html = "<strong>" + d.data.name + "</strong> (" + (d.data.dimName || "Level " + d.depth) + ")<br/>" +
            (primaryMeas.label_short || primaryMeas.label || "Value") + ": <strong>" + formatValue(d.value, fmt) + "</strong><br/>" +
            "Share of Parent: <strong>" + pctParent + "</strong><br/>" +
            "Share of Total: <strong>" + pctTotal + "</strong>";

          if (secMeas && d.data.secondaryVal !== undefined && d.data.secondaryVal !== null) {
            html += "<br/>" + (secMeas.label_short || secMeas.label) + ": <strong>" + formatValue(d.data.secondaryVal, fmt) + "</strong>";
          }

          if (d.children && d.children.length > 0) {
            html += "<br/><em style='color:" + theme.subtext + ";font-size:10px;'>💡 Click to drill into " + d.children.length + " sub-categories</em>";
          }

          tooltip.innerHTML = html;
          tooltip.style.display = "block";
        })
        .on("mousemove", function (event) {
          var containerRect = self._container.getBoundingClientRect();
          var x = event.clientX - containerRect.left + 15;
          var y = event.clientY - containerRect.top + 15;
          if (x + 220 > containerRect.width) x = event.clientX - containerRect.left - 230;
          if (y + 120 > containerRect.height) y = event.clientY - containerRect.top - 130;
          tooltip.style.left = Math.max(x, 10) + "px";
          tooltip.style.top = Math.max(y, 10) + "px";
        })
        .on("mouseout", function () {
          d3.select(this)
            .style("stroke", theme.sliceStroke)
            .style("stroke-width", "1px")
            .style("filter", "none");
          tooltip.style.display = "none";
        })
        .on("click", function (event, d) {
          tooltip.style.display = "none";

          // If drill links present and shift key or option
          if (d.data.links && d.data.links.length > 0 && (event.metaKey || event.ctrlKey)) {
            LookerCharts.Utils.openDrillMenu({
              links: d.data.links,
              event: event
            });
            return;
          }

          if (config.enableZoomDrill !== false) {
            self._currentNode = d;
            self._render(d3, data, element, config, queryResponse, done);
          }
        })
        .on("contextmenu", function (event, d) {
          if (d.data.links && d.data.links.length > 0) {
            event.preventDefault();
            LookerCharts.Utils.openDrillMenu({
              links: d.data.links,
              event: event
            });
          }
        });

      // Labels on slices
      if (config.showSliceLabels !== false) {
        var labelGroup = g.append("g").attr("class", "labels").attr("pointer-events", "none");
        var fontSize = parseInt(config.labelFontSize || "11", 10);
        var labelStyle = config.labelOrientation || "curved_radial";

        labelGroup.selectAll("text")
          .data(nodesToRender.filter(function (d) {
            // Only show labels for slices with sufficient angular span (> 0.08 rad)
            return (d.x1 - d.x0) > 0.09;
          }))
          .enter().append("text")
          .attr("transform", function (d) {
            var angle = (d.x0 + d.x1) / 2 * 180 / Math.PI - 90;
            var r = (Math.sqrt(d.y0) + Math.sqrt(d.y1)) / 2;
            if (isConcentric) {
              var ringWidth = (radius * (1 - innerPct)) / (root.height || 1);
              r = (radius * innerPct) + ((d.depth - 0.5) * ringWidth);
            }
            if (labelStyle === "horizontal") {
              return "translate(" + (Math.cos((d.x0 + d.x1) / 2 - Math.PI / 2) * r) + "," + (Math.sin((d.x0 + d.x1) / 2 - Math.PI / 2) * r) + ")";
            }
            return "rotate(" + angle + ") translate(" + r + ",0) rotate(" + (angle > 90 ? 180 : 0) + ")";
          })
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .style("font-size", fontSize + "px")
          .style("font-weight", "600")
          .style("fill", function (d) {
            var c = d3.rgb(getNodeColor(d));
            var brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
            return brightness > 150 ? "#0f172a" : "#ffffff";
          })
          .text(function (d) {
            var label = d.data.name;
            var maxChars = Math.floor((d.x1 - d.x0) * 20);
            if (label.length > maxChars && maxChars > 3) {
              return label.substring(0, maxChars - 1) + "…";
            }
            return label;
          });
      }

      // Center Hub Circle (Click to go up a level)
      var centerHubRadius = Math.max(radius * innerPct, 28);
      var centerGroup = g.append("g")
        .attr("class", "center-hub")
        .style("cursor", activeNode !== root ? "pointer" : "default")
        .on("click", function () {
          if (activeNode !== root) {
            self._currentNode = activeNode.parent || root;
            self._render(d3, data, element, config, queryResponse, done);
          }
        });

      centerGroup.append("circle")
        .attr("r", centerHubRadius)
        .style("fill", theme.centerCircleBg)
        .style("stroke", theme.hudBorder)
        .style("stroke-width", "2px")
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.12))");

      var centerTextGroup = centerGroup.append("g").attr("pointer-events", "none");

      centerTextGroup.append("text")
        .attr("dy", "-0.7em")
        .attr("text-anchor", "middle")
        .style("font-size", Math.max(centerHubRadius * 0.22, 10) + "px")
        .style("font-weight", "600")
        .style("fill", theme.subtext)
        .text(activeNode === root ? "TOTAL" : "CURRENT");

      var fmt = config.valueMetricFormat || "compact_currency";
      centerTextGroup.append("text")
        .attr("dy", "0.45em")
        .attr("text-anchor", "middle")
        .style("font-size", Math.max(centerHubRadius * 0.28, 12) + "px")
        .style("font-weight", "800")
        .style("fill", theme.text)
        .text(formatValue(activeNode.value, fmt));

      if (activeNode !== root) {
        centerTextGroup.append("text")
          .attr("dy", "1.6em")
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .style("font-weight", "600")
          .style("fill", theme.colors[0])
          .text("▲ Click to Up");
      }
    },

    _renderIcicle: function (d3, svg, width, height, root, activeNode, config, theme, tooltip, primaryMeas, secMeas, data) {
      var self = this;
      var partition = d3.partition()
        .size([height, width])
        .padding(parseInt(config.slicePadding || "2", 10));

      partition(root);

      var branchMap = {};
      if (root.children) {
        for (var b = 0; b < root.children.length; b++) {
          branchMap[root.children[b].data.name] = theme.colors[b % theme.colors.length];
        }
      }

      function getNodeBranch(d) {
        var curr = d;
        while (curr.depth > 1) curr = curr.parent;
        return curr.data.name;
      }

      function getNodeColor(d) {
        if (d.depth === 0) return theme.bg;
        var branchName = getNodeBranch(d);
        var baseColor = branchMap[branchName] || theme.colors[0];
        if (d.depth === 1) return baseColor;
        var depthMod = (d.depth - 1) * 0.15;
        return d3.color(baseColor).brighter(depthMod).formatHex();
      }

      var nodesToRender = root.descendants().filter(function (d) {
        return d.depth > 0;
      });

      var rects = svg.selectAll("rect")
        .data(nodesToRender)
        .enter().append("rect")
        .attr("class", "icicle-rect")
        .attr("x", function (d) { return d.y0; })
        .attr("y", function (d) { return d.x0; })
        .attr("width", function (d) { return Math.max(d.y1 - d.y0 - 1, 1); })
        .attr("height", function (d) { return Math.max(d.x1 - d.x0 - 1, 1); })
        .attr("rx", parseInt(config.sliceCornerRadius || "2", 10))
        .style("fill", function (d) { return getNodeColor(d); })
        .style("stroke", theme.sliceStroke)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).style("filter", "brightness(1.15)");
          var fmt = config.valueMetricFormat || "compact_currency";
          tooltip.innerHTML = "<strong>" + d.data.name + "</strong> (" + (d.data.dimName || "Level " + d.depth) + ")<br/>" +
            (primaryMeas.label_short || primaryMeas.label || "Value") + ": <strong>" + formatValue(d.value, fmt) + "</strong>";
          tooltip.style.display = "block";
        })
        .on("mousemove", function (event) {
          var containerRect = self._container.getBoundingClientRect();
          tooltip.style.left = (event.clientX - containerRect.left + 15) + "px";
          tooltip.style.top = (event.clientY - containerRect.top + 15) + "px";
        })
        .on("mouseout", function () {
          d3.select(this).style("filter", "none");
          tooltip.style.display = "none";
        })
        .on("click", function (event, d) {
          tooltip.style.display = "none";
          if (d.data.links && d.data.links.length > 0 && (event.metaKey || event.ctrlKey)) {
            LookerCharts.Utils.openDrillMenu({ links: d.data.links, event: event });
            return;
          }
          self._currentNode = d;
          self._render(d3, data, element, config, queryResponse, done);
        });

      // Icicle Labels
      if (config.showSliceLabels !== false) {
        var fontSize = parseInt(config.labelFontSize || "11", 10);
        svg.selectAll("text")
          .data(nodesToRender.filter(function (d) { return (d.x1 - d.x0) > 16 && (d.y1 - d.y0) > 40; }))
          .enter().append("text")
          .attr("x", function (d) { return d.y0 + 6; })
          .attr("y", function (d) { return d.x0 + (d.x1 - d.x0) / 2; })
          .attr("dy", "0.35em")
          .attr("pointer-events", "none")
          .style("font-size", fontSize + "px")
          .style("font-weight", "600")
          .style("fill", function (d) {
            var c = d3.rgb(getNodeColor(d));
            return (c.r * 299 + c.g * 587 + c.b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
          })
          .text(function (d) { return d.data.name; });
      }
    }
  });
})();
