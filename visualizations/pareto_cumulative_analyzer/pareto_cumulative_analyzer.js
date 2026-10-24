/**
 * Pareto 80/20 & ABC Stratification Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Problem & Cloud Blocker Solved:
 * - Directly resolves Buganizer Cloud Blocker b/367544487:
 *   "LookML to support more sophisticated measure out of the box [Cloud Blocker] - Pareto analysis"
 * - Resolves customer deal-blockers from Monzo Bank (b/425859046), Mango (b/530925562),
 *   Woolworth's (b/461541028), and the Renault PSO Looker Performance Study.
 * - Solves native Looker Cartesian chart limitations: dynamically computes descending sort,
 *   cumulative running sums, on-the-fly percentage shares, dual Y-axis scaling (linear metric vs 0-100%
 *   cumulative line), dynamic 80/20 threshold cut-off lines, and automatic ABC classification
 *   (Class A: Vital Few 0-80%, Class B: Useful Many 80-95%, Class C: Trivial Many 95-100%)
 *   without requiring complex SQL window functions or brittle LookML table calculations.
 *
 * 4 Multi-Modal Layout Modes:
 *   1. "classic_pareto": Classic Pareto & 80/20 Cutoff (Dual Y-axis bars + cumulative curve + 80% cutoff line)
 *   2. "abc_stratification": ABC Stratification Matrix (3 segmented tiers with KPI distribution cards and item breakdown)
 *   3. "lorenz_inequality": Lorenz Inequality Curve & Gini (Population % vs Value % against 45° line of equality)
 *   4. "cumulative_waterfall": Cumulative Stepped Waterfall (Stepped cascade building from 0 to 100%)
 *
 * Architecture & Best Practices:
 * - 5,000+ Row Scalability: Ingests raw or high-cardinality rows with client-side aggregation and O(N log N) sorting.
 * - Strictly 2 Option Tabs: "Display" and "Style" to prevent tab wrapping in Looker's Edit Viz modal.
 * - Interactive Controls: Search-as-you-type filter, interactive hover tooltips, and native Looker drill-downs.
 * - Executive KPI HUD: Total Items, Total Volume, Vital Few Count & %, 80% Cutoff Rank, Gini Index, Top 1 Share.
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
      classA: "#1a73e8",
      classAGradient: ["#1a73e8", "#4285f4"],
      classB: "#34a853",
      classBGradient: ["#34a853", "#81c995"],
      classC: "#5f6368",
      classCGradient: ["#5f6368", "#9aa0a6"],
      curveColor: "#ea4335",
      thresholdColor: "#ea4335",
      benchmarkColor: "#fbbc04",
      gridColor: "#f1f3f4",
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
      classA: "#2563eb",
      classAGradient: ["#1d4ed8", "#3b82f6"],
      classB: "#0ea5e9",
      classBGradient: ["#0284c7", "#38bdf8"],
      classC: "#94a3b8",
      classCGradient: ["#64748b", "#cbd5e1"],
      curveColor: "#f59e0b",
      thresholdColor: "#ef4444",
      benchmarkColor: "#10b981",
      gridColor: "#f1f5f9",
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
      classA: "#06b6d4",
      classAGradient: ["#0891b2", "#22d3ee"],
      classB: "#eab308",
      classBGradient: ["#ca8a04", "#facc15"],
      classC: "#64748b",
      classCGradient: ["#475569", "#94a3b8"],
      curveColor: "#f43f5e",
      thresholdColor: "#f43f5e",
      benchmarkColor: "#10b981",
      gridColor: "#1e293b",
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
      classA: "#059669",
      classAGradient: ["#047857", "#10b981"],
      classB: "#0d9488",
      classBGradient: ["#0f766e", "#14b8a6"],
      classC: "#64748b",
      classCGradient: ["#475569", "#94a3b8"],
      curveColor: "#d97706",
      thresholdColor: "#dc2626",
      benchmarkColor: "#0284c7",
      gridColor: "#f1f5f9",
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
      classA: "#ea580c",
      classAGradient: ["#c2410c", "#f97316"],
      classB: "#d97706",
      classBGradient: ["#b45309", "#f59e0b"],
      classC: "#71717a",
      classCGradient: ["#52525b", "#a1a1aa"],
      curveColor: "#4338ca",
      thresholdColor: "#dc2626",
      benchmarkColor: "#059669",
      gridColor: "#f4f4f5",
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
      classA: "#143359",
      classAGradient: ["#143359", "#1E467A"],
      classB: "#00AF68",
      classBGradient: ["#00AF68", "#5FD3A0"],
      classC: "#94A3B8",
      classCGradient: ["#94A3B8", "#CBD5E1"],
      curveColor: "#FFB500",
      thresholdColor: "#E5484D",
      benchmarkColor: "#00AF68",
      gridColor: "#EEF2F7",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#143359"
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
      classA: "#6366f1",
      classAGradient: ["#4f46e5", "#818cf8"],
      classB: "#06b6d4",
      classBGradient: ["#0891b2", "#22d3ee"],
      classC: "#9ca3af",
      classCGradient: ["#6b7280", "#9ca3af"],
      curveColor: "#ec4899",
      thresholdColor: "#ec4899",
      benchmarkColor: "#10b981",
      gridColor: "#f3f4f6",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#6366f1"
    },
    // Backwards compatibility aliases
    modern_google: {
      name: "Modern Google",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#1e293b",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      classA: "#1a73e8",
      classAGradient: ["#1a73e8", "#4285f4"],
      classB: "#f29900",
      classBGradient: ["#f29900", "#fbbc04"],
      classC: "#5f6368",
      classCGradient: ["#5f6368", "#80868b"],
      curveColor: "#ea4335",
      thresholdColor: "#ea4335",
      benchmarkColor: "#34a853",
      gridColor: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    wellverse: {
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
      classA: "#143359",
      classAGradient: ["#143359", "#1E467A"],
      classB: "#00AF68",
      classBGradient: ["#00AF68", "#5FD3A0"],
      classC: "#94A3B8",
      classCGradient: ["#94A3B8", "#CBD5E1"],
      curveColor: "#FFB500",
      thresholdColor: "#E5484D",
      benchmarkColor: "#00AF68",
      gridColor: "#EEF2F7",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#143359"
    },
    neon_cyber: {
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
      classA: "#06b6d4",
      classAGradient: ["#0891b2", "#22d3ee"],
      classB: "#eab308",
      classBGradient: ["#ca8a04", "#facc15"],
      classC: "#64748b",
      classCGradient: ["#475569", "#94a3b8"],
      curveColor: "#f43f5e",
      thresholdColor: "#f43f5e",
      benchmarkColor: "#10b981",
      gridColor: "#1e293b",
      tooltipBg: "rgba(15, 23, 42, 0.95)",
      tooltipBorder: "#06b6d4"
    },
    emerald_teal: {
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
      classA: "#059669",
      classAGradient: ["#047857", "#10b981"],
      classB: "#0d9488",
      classBGradient: ["#0f766e", "#14b8a6"],
      classC: "#64748b",
      classCGradient: ["#475569", "#94a3b8"],
      curveColor: "#d97706",
      thresholdColor: "#dc2626",
      benchmarkColor: "#0284c7",
      gridColor: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
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
      classA: "#ea580c",
      classAGradient: ["#c2410c", "#f97316"],
      classB: "#d97706",
      classBGradient: ["#b45309", "#f59e0b"],
      classC: "#71717a",
      classCGradient: ["#52525b", "#a1a1aa"],
      curveColor: "#4338ca",
      thresholdColor: "#dc2626",
      benchmarkColor: "#059669",
      gridColor: "#f4f4f5",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#ea580c"
    },
    monochrome_slate: {
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
      classA: "#1e293b",
      classAGradient: ["#0f172a", "#334155"],
      classB: "#475569",
      classBGradient: ["#334155", "#64748b"],
      classC: "#94a3b8",
      classCGradient: ["#64748b", "#cbd5e1"],
      curveColor: "#0284c7",
      thresholdColor: "#0284c7",
      benchmarkColor: "#10b981",
      gridColor: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1e293b"
    }
  };

  function formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return "0";
    var abs = Math.abs(val);
    if (abs >= 1e9) return (val / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (val / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return (val / 1e3).toFixed(1) + "K";
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return "0.0%";
    return val.toFixed(1) + "%";
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
      var pVal = val > 1 ? val : val * 100;
      return pVal.toFixed(1) + "%";
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
 >= 1e9) return (val / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (val / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return (val / 1e3).toFixed(1) + "K";
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  }

  function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return "0.0%";
    return val.toFixed(1) + "%";
  }

  looker.plugins.visualizations.add({
    id: "pareto_cumulative_analyzer",
    label: "Pareto 80/20 & ABC Analyzer",
        options: {
      // =============================================================
      // SECTION 1: DISPLAY (Strictly minimized tab: Layout, Fields, Thresholds)
      // =============================================================
      layoutMode: {
        type: "string",
        label: "Analysis Layout Mode",
        default: "classic_pareto",
        display: "select",
        values: [
          { "Classic Pareto & 80/20 Cutoff": "classic_pareto" },
          { "ABC Stratification Matrix": "abc_stratification" },
          { "Lorenz Inequality Curve & Gini": "lorenz_inequality" },
          { "Cumulative Stepped Waterfall": "cumulative_waterfall" }
        ],
        section: "Display",
        order: 1
      },
      dimEntityOverride: {
        type: "string",
        label: "Category / Entity Dimension",
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      measurePrimaryOverride: {
        type: "string",
        label: "Primary Volume / Frequency Measure",
        display: "select",
        values: [{ "Auto / Primary Measure": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measureSecondaryOverride: {
        type: "string",
        label: "Secondary Comparison Measure (Optional)",
        display: "select",
        values: [{ "None / Secondary Measure (Optional)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      dimCategoryOverride: {
        type: "string",
        label: "Secondary Grouping Dimension (Optional)",
        display: "select",
        values: [{ "None / Optional Group": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None / No Benchmark": "none" },
          { "Fixed Target Value": "fixed_value" },
          { "Dataset Mean Average": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile (P75)": "percentile_p75" },
          { "90th Percentile (P90)": "percentile_p90" }
        ],
        default: "none",
        section: "Display",
        order: 6
      },
      customTargetValue: {
        type: "number",
        label: "Custom Target / Threshold Value",
        default: 0,
        section: "Display",
        order: 7
      },
      customReferenceLineLabel: {
        type: "string",
        label: "Reference Line Label Override",
        default: "80% Pareto Cutoff",
        section: "Display",
        order: 8
      },
      abcThresholdA: {
        type: "number",
        label: "Class A / Vital Few Cutoff (%)",
        default: 80,
        section: "Display",
        order: 9
      },
      abcThresholdB: {
        type: "number",
        label: "Class B / Useful Many Cutoff (%)",
        default: 95,
        section: "Display",
        order: 10
      },
      showThresholdLine: {
        type: "boolean",
        label: "Show 80% Pareto Reference Line",
        default: true,
        section: "Display",
        order: 11
      },
      showBenchmarkLine: {
        type: "boolean",
        label: "Show Target / Benchmark Line",
        default: false,
        section: "Display",
        order: 12
      },
      sortOrder: {
        type: "string",
        label: "Item Sorting Order",
        display: "select",
        values: [
          { "Metric Descending (Pareto Standard)": "desc" },
          { "Metric Ascending": "asc" },
          { "Alphabetical (A-Z)": "alpha" },
          { "Natural / Query Input Order": "natural" }
        ],
        default: "desc",
        section: "Display",
        order: 13
      },
      maxItemsDisplay: {
        type: "number",
        label: "Max Visible Items (Tail Rolled Up)",
        default: 35,
        section: "Display",
        order: 14
      },
      rollupTailOther: {
        type: "boolean",
        label: "Rollup Tail into 'Other' Group",
        default: true,
        section: "Display",
        order: 15
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Values",
        default: true,
        section: "Display",
        order: 16
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
        order: 17
      },
      labelDensity: {
        type: "string",
        label: "Data Value Labels",
        display: "select",
        values: [
          { "All Bars & Points": "all" },
          { "Min / Max Peaks Only": "peaks" },
          { "Hidden": "hidden" }
        ],
        default: "hidden",
        section: "Display",
        order: 18
      },
      chartTitleOverride: {
        type: "string",
        label: "Chart Title Override",
        default: "",
        section: "Display",
        order: 19
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Chart Subtitle Override",
        default: "",
        section: "Display",
        order: 20
      },
      showSearchFilter: {
        type: "boolean",
        label: "Show Live Search Filter",
        default: true,
        section: "Display",
        order: 21
      },
      curveInterpolation: {
        type: "string",
        label: "Cumulative Curve Smoothing",
        default: "monotone",
        display: "select",
        values: [
          { "Monotone Spline": "monotone" },
          { "Linear Polygon": "linear" },
          { "Step After": "step" }
        ],
        section: "Display",
        order: 22
      },

      // =============================================================
      // SECTION 2: STYLE (Color Palettes, Polarity & Typography)
      // =============================================================
      colorTheme: {
        type: "string",
        label: "Color Theme & Brand Palette",
        default: "google_enterprise",
        display: "select",
        values: [
          { "Google Enterprise (Clean Blue/Gold)": "google_enterprise" },
          { "Modern Slate (Neutral Executive)": "modern_slate" },
          { "Cyberpunk Dark (High Contrast)": "cyberpunk_dark" },
          { "Emerald FinOps (Green/Teal)": "emerald_finops" },
          { "Sunset Media (Warm Coral/Amber)": "sunset_media" },
          { "Wellverse Healthcare (Navy/Emerald)": "wellverse_healthcare" },
          { "Looker Analytics (Indigo/Pink)": "looker_analytics" }
        ],
        section: "Style",
        order: 1
      },
      customClassAColor: {
        type: "string",
        label: "Override Class A Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 2
      },
      customClassBColor: {
        type: "string",
        label: "Override Class B Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 3
      },
      customClassCColor: {
        type: "string",
        label: "Override Class C Accent",
        default: "",
        display: "color",
        section: "Style",
        order: 4
      },
      customCurveColor: {
        type: "string",
        label: "Override Cumulative Curve Color",
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
          { "Higher is Better (Revenue / Volume / Orders)": "higher_better" },
          { "Lower is Better (Defects / Churn / Latency / Cost)": "lower_better" }
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
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percent" },
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
      container.className = "looker-pareto-analyzer";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.position = "relative";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      element.appendChild(container);

      this._searchQuery = "";
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

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "No Query Metadata", message: "Awaiting valid query response." });
        done();
        return;
      }

      var dimensions = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      if (dimensions.length < 1) {
        this.addError({
          title: "Missing Category Dimension",
          message: "The Pareto 80/20 Analyzer requires at least 1 Dimension (e.g. Category, SKU, Customer, or Defect Type)."
        });
        done();
        return;
      }

      if (measures.length < 1) {
        this.addError({
          title: "Missing Metric Measure",
          message: "The Pareto 80/20 Analyzer requires at least 1 Measure (e.g. Total Revenue, Order Count, Spend, or Defects)."
        });
        done();
        return;
      }

      // Dynamic field-role mapping dropdowns via registerOptions (Display section only)
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
            dimEntityOverride: { values: dimOptions },
            dimCategoryOverride: { values: [{ "None / Optional Group": "" }].concat(dimOptions.slice(1)) },
            measurePrimaryOverride: { values: measOptions },
            measureSecondaryOverride: { values: [{ "None / Secondary Measure (Optional)": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self.render(data, element, config, queryResponse);
        } catch (err) {
          console.error("Pareto Analyzer Render Exception:", err);
          self.addError({
            title: "Render Error",
            message: err.message || "An error occurred while rendering the Pareto visualization."
          });
        }
        done();
      });
    },

    render: function (data, element, config, queryResponse) {
      var d3 = window.d3;
      if (!d3) return;

      var container = element.querySelector(".looker-pareto-analyzer");
      if (!container) return;
      container.innerHTML = "";

      // Determine Theme
      var themeKey = config.colorTheme || "modern_google";
      var theme = Object.assign({}, THEMES[themeKey] || THEMES.modern_google);
      if (config.customClassAColor) theme.classA = config.customClassAColor;
      if (config.customClassBColor) theme.classB = config.customClassBColor;
      if (config.customClassCColor) theme.classC = config.customClassCColor;
      if (config.customCurveColor) {
        theme.curveColor = config.customCurveColor;
        theme.thresholdColor = config.customCurveColor;
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;
      container.style.fontFamily = config.fontFamily || "Google Sans, Roboto, Inter, sans-serif";

      var dimensions = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      var dimField = (config.dimEntityOverride && dimensions.find(function(d){ return d.name === config.dimEntityOverride; })) || dimensions[0];
      var measureField = (config.measurePrimaryOverride && measures.find(function(m){ return m.name === config.measurePrimaryOverride; })) || measures[0];
      var secondaryMeasureField = (config.measureSecondaryOverride && measures.find(function(m){ return m.name === config.measureSecondaryOverride; })) || (measures.length > 1 ? measures[1] : null);

      var thresholdA = parseFloat(config.abcThresholdA) || 80;
      var thresholdB = parseFloat(config.abcThresholdB) || 95;
      if (thresholdB <= thresholdA) thresholdB = thresholdA + 15;

      // -------------------------------------------------------------
      // 1. DATA AGGREGATION & HIGH-CARDINALITY ROLLUP (O(N) Map)
      // -------------------------------------------------------------
      var aggregatedMap = new Map();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var rawDim = row[dimField.name];
        var dimVal = rawDim ? (rawDim.rendered || rawDim.value || "Unknown") : "Unknown";
        var rawMeasure = row[measureField.name];
        var val = rawMeasure ? parseFloat(rawMeasure.value) : 0;
        if (isNaN(val)) val = 0;

        var secVal = 0;
        if (secondaryMeasureField && row[secondaryMeasureField.name]) {
          secVal = parseFloat(row[secondaryMeasureField.name].value) || 0;
        }

        var drillLinks = (rawDim && rawDim.links) ? rawDim.links : [];
        if ((!drillLinks || drillLinks.length === 0) && rawMeasure && rawMeasure.links) {
          drillLinks = rawMeasure.links;
        }

        // Zero / null suppression toggle
        if (config.suppressZeroNull !== false && (val <= 0 || isNaN(val))) {
          continue;
        }

        if (aggregatedMap.has(dimVal)) {
          var item = aggregatedMap.get(dimVal);
          item.value += val;
          item.secondaryValue += secVal;
          item.count += 1;
        } else {
          aggregatedMap.set(dimVal, {
            name: String(dimVal),
            value: val,
            secondaryValue: secVal,
            count: 1,
            links: drillLinks
          });
        }
      }

      // Convert to sorted array based on sortOrder
      var sortOrder = config.sortOrder || "desc";
      var sortedItems = Array.from(aggregatedMap.values());
      if (sortOrder === "asc") {
        sortedItems.sort(function (a, b) { return a.value - b.value; });
      } else if (sortOrder === "alpha") {
        sortedItems.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortOrder === "natural") {
        // preserve query order
      } else {
        // default Pareto descending
        sortedItems.sort(function (a, b) { return b.value - a.value; });
      }

      if (sortedItems.length === 0) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:' + theme.subtext + ';">No data available for Pareto analysis.</div>';
        return;
      }

      // Compute Total Sum
      var totalSum = d3.sum(sortedItems, function (d) { return d.value; });
      if (totalSum <= 0) totalSum = 1;

      // Compute Cumulative Sums, Shares, and ABC Classification
      var runningSum = 0;
      var cutoffRankA = 0;
      var cutoffRankB = 0;
      var classACount = 0;
      var classBCount = 0;
      var classCCount = 0;
      var classAVal = 0;
      var classBVal = 0;
      var classCVal = 0;

      for (var j = 0; j < sortedItems.length; j++) {
        var it = sortedItems[j];
        it.rank = j + 1;
        it.share = (it.value / totalSum) * 100;
        runningSum += it.value;
        it.cumSum = runningSum;
        it.cumShare = (runningSum / totalSum) * 100;

        // ABC Stratification Logic
        if (it.cumShare <= thresholdA || (j === 0 && it.cumShare > thresholdA) || (j > 0 && sortedItems[j - 1].cumShare < thresholdA && !cutoffRankA)) {
          it.abcClass = "A";
          it.abcLabel = "Class A (Vital Few)";
          it.color = theme.classA;
          classACount++;
          classAVal += it.value;
          if (!cutoffRankA && it.cumShare >= thresholdA) cutoffRankA = it.rank;
        } else if (it.cumShare <= thresholdB || (!cutoffRankB && sortedItems[j - 1].cumShare < thresholdB)) {
          it.abcClass = "B";
          it.abcLabel = "Class B (Useful Many)";
          it.color = theme.classB;
          classBCount++;
          classBVal += it.value;
          if (!cutoffRankB && it.cumShare >= thresholdB) cutoffRankB = it.rank;
        } else {
          it.abcClass = "C";
          it.abcLabel = "Class C (Trivial Many)";
          it.color = theme.classC;
          classCCount++;
          classCVal += it.value;
        }
      }
      if (!cutoffRankA) cutoffRankA = sortedItems.length;
      if (!cutoffRankB) cutoffRankB = sortedItems.length;

      // Gini Coefficient Calculation
      // G = [sum((2i - n - 1) * y_i)] / [n * sum(y_i)]
      var n = sortedItems.length;
      var giniNumerator = 0;
      for (var g = 0; g < n; g++) {
        // g is 0-indexed, so 1-indexed i = (n - g) in ascending order
        // In ascending order, rank i goes from 1 to n
        var ascVal = sortedItems[n - 1 - g].value;
        giniNumerator += (2 * (g + 1) - n - 1) * ascVal;
      }
      var giniCoeff = n > 1 ? Math.max(0, Math.min(1, giniNumerator / (n * totalSum))) : 0;

      // Target benchmark calculation
      var targetBenchmark = null;
      var targetLabel = config.customReferenceLineLabel || "Target Benchmark";
      if (config.targetMode === "fixed_value") {
        targetBenchmark = parseFloat(config.customTargetValue) || 0;
      } else if (config.targetMode === "dataset_mean") {
        targetBenchmark = totalSum / sortedItems.length;
      } else if (config.targetMode === "dataset_median") {
        var mid = Math.floor(sortedItems.length / 2);
        var valsSorted = sortedItems.map(function(d){ return d.value; }).sort(function(a,b){ return a-b; });
        targetBenchmark = sortedItems.length % 2 !== 0 ? valsSorted[mid] : (valsSorted[mid - 1] + valsSorted[mid]) / 2;
      } else if (config.targetMode === "percentile_p75") {
        var idx75 = Math.floor(sortedItems.length * 0.75);
        var valsSorted = sortedItems.map(function(d){ return d.value; }).sort(function(a,b){ return a-b; });
        targetBenchmark = valsSorted[idx75] || 0;
      } else if (config.targetMode === "percentile_p90") {
        var idx90 = Math.floor(sortedItems.length * 0.90);
        var valsSorted = sortedItems.map(function(d){ return d.value; }).sort(function(a,b){ return a-b; });
        targetBenchmark = valsSorted[idx90] || 0;
      }

      // Apply Search Filter if any
      var query = (this._searchQuery || "").trim().toLowerCase();
      var filteredItems = sortedItems;
      if (query.length > 0) {
        filteredItems = sortedItems.filter(function (d) {
          return d.name.toLowerCase().indexOf(query) !== -1;
        });
      }

      // Max items display rollup (tail aggregation if items > max)
      var maxItems = parseInt(config.maxItemsDisplay, 10);
      if (isNaN(maxItems) || maxItems < 5) maxItems = 35;

      var displayItems = filteredItems;
      var hasTailGroup = false;
      var tailCount = 0;
      var tailVal = 0;

      if (filteredItems.length > maxItems && maxItems > 0 && config.layoutMode !== "lorenz_inequality") {
        displayItems = filteredItems.slice(0, maxItems);
        var tailItems = filteredItems.slice(maxItems);
        tailCount = tailItems.length;
        tailVal = d3.sum(tailItems, function (t) { return t.value; });
        var tailLast = filteredItems[filteredItems.length - 1];
        displayItems.push({
          name: "Other " + tailCount + " Tail Categories",
          value: tailVal,
          secondaryValue: d3.sum(tailItems, function (t) { return t.secondaryValue; }),
          rank: maxItems + 1,
          share: (tailVal / totalSum) * 100,
          cumSum: totalSum,
          cumShare: 100,
          abcClass: "C",
          abcLabel: "Class C (Trivial Many)",
          color: theme.classC,
          isTail: true,
          count: tailCount
        });
        hasTailGroup = true;
      }

      // -------------------------------------------------------------
      // 2. HEADER: TITLE & SEARCH CONTROLS
      // -------------------------------------------------------------
      var headerDiv = document.createElement("div");
      headerDiv.style.display = "flex";
      headerDiv.style.alignItems = "center";
      headerDiv.style.justifyContent = "space-between";
      headerDiv.style.padding = "10px 16px 6px 16px";
      headerDiv.style.flexWrap = "wrap";
      headerDiv.style.gap = "8px";
      headerDiv.style.borderBottom = "1px solid " + theme.border;

      var titleDiv = document.createElement("div");
      titleDiv.style.display = "flex";
      titleDiv.style.alignItems = "center";
      titleDiv.style.gap = "8px";

      var modeBadge = "";
      if (config.layoutMode === "classic_pareto") modeBadge = "80/20 Dual-Axis Pareto";
      else if (config.layoutMode === "abc_stratification") modeBadge = "ABC Stratification Matrix";
      else if (config.layoutMode === "lorenz_inequality") modeBadge = "Lorenz Inequality & Gini";
      else if (config.layoutMode === "cumulative_waterfall") modeBadge = "Cumulative Stepped Waterfall";

      titleDiv.innerHTML = '<span style="font-size:15px;font-weight:700;color:' + theme.text + ';">' +
        (measureField.label_short || measureField.label || "Value") + ' by ' + (dimField.label_short || dimField.label || "Category") +
        '</span>' +
        '<span style="background:' + theme.cardBg + ';color:' + theme.subtext + ';border:1px solid ' + theme.border + ';padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">' +
        modeBadge + '</span>';
      headerDiv.appendChild(titleDiv);

      var controlsDiv = document.createElement("div");
      controlsDiv.style.display = "flex";
      controlsDiv.style.alignItems = "center";
      controlsDiv.style.gap = "10px";

      if (config.showSearchFilter) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Filter " + (dimField.label_short || "categories") + "...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "11px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.backgroundColor = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "180px";

        var self = this;
        searchInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self.render(data, element, config, queryResponse);
        });
        controlsDiv.appendChild(searchInput);
      }

      headerDiv.appendChild(controlsDiv);
      container.appendChild(headerDiv);

      // -------------------------------------------------------------
      // 3. EXECUTIVE KPI HUD BANNER
      // -------------------------------------------------------------
      var hudMode = config.kpiHudDensity || (config.showKpiHud ? "full" : "hidden");
      if (hudMode !== "hidden" && config.showKpiHud !== false) {
        if (hudMode === "compact") {
          var compactHud = document.createElement("div");
          compactHud.style.display = "flex";
          compactHud.style.alignItems = "center";
          compactHud.style.gap = "14px";
          compactHud.style.padding = "6px 14px";
          compactHud.style.margin = "4px 16px 8px 16px";
          compactHud.style.borderRadius = "6px";
          compactHud.style.background = theme.hudBg;
          compactHud.style.border = "1px solid " + theme.hudBorder;
          compactHud.style.fontSize = "11px";
          compactHud.style.color = theme.hudText;
          compactHud.innerHTML = '<span><strong>Items:</strong> ' + sortedItems.length + '</span>' +
            '<span><strong>Volume:</strong> ' + formatValue(totalSum, config, measureField) + '</span>' +
            '<span><strong style="color:' + theme.classA + ';">Class A (80%):</strong> ' + classACount + ' (' + ((classACount / sortedItems.length) * 100).toFixed(0) + '%)</span>' +
            '<span><strong>Gini Index:</strong> ' + giniCoeff.toFixed(3) + '</span>';
          container.appendChild(compactHud);
        } else {
        var hudDiv = document.createElement("div");
        hudDiv.style.display = "grid";
        hudDiv.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
        hudDiv.style.gap = "8px";
        hudDiv.style.padding = "8px 16px";
        hudDiv.style.backgroundColor = theme.hudBg;
        hudDiv.style.borderBottom = "1px solid " + theme.hudBorder;

        var top1Share = sortedItems[0] ? sortedItems[0].share.toFixed(1) + "%" : "0%";
        var vitalFewPct = ((classACount / sortedItems.length) * 100).toFixed(1) + "%";

        var kpiCards = [
          { label: "TOTAL POPULATION", value: sortedItems.length.toLocaleString(), sub: "100% Entities" },
          { label: "TOTAL VOLUME", value: formatNumber(totalSum), sub: measureField.label_short || "Metric" },
          { label: "VITAL FEW (CLASS A)", value: classACount + " (" + vitalFewPct + ")", sub: thresholdA + "% Volume Cutoff", highlight: theme.classA },
          { label: "80% CUTOFF RANK", value: "#" + cutoffRankA, sub: "Crosses " + thresholdA + "% Mark", highlight: theme.curveColor },
          { label: "GINI CONCENTRATION", value: giniCoeff.toFixed(2), sub: giniCoeff > 0.6 ? "High Inequality" : "Moderate Spread", highlight: theme.classB },
          { label: "TOP 1 CONCENTRATION", value: top1Share, sub: sortedItems[0] ? sortedItems[0].name.substring(0, 15) : "-" }
        ];

        kpiCards.forEach(function (kpi) {
          var card = document.createElement("div");
          card.style.backgroundColor = theme.cardBg;
          card.style.border = "1px solid " + (kpi.highlight ? kpi.highlight : theme.border);
          card.style.borderRadius = "6px";
          card.style.padding = "6px 10px";
          card.style.display = "flex";
          card.style.flexDirection = "column";

          var lbl = document.createElement("div");
          lbl.style.fontSize = "9px";
          lbl.style.fontWeight = "700";
          lbl.style.color = theme.subtext;
          lbl.style.letterSpacing = "0.5px";
          lbl.textContent = kpi.label;

          var val = document.createElement("div");
          val.style.fontSize = "16px";
          val.style.fontWeight = "800";
          val.style.color = kpi.highlight || theme.text;
          val.style.margin = "2px 0";
          val.textContent = kpi.value;

          var sub = document.createElement("div");
          sub.style.fontSize = "10px";
          sub.style.color = theme.subtext;
          sub.textContent = kpi.sub;

          card.appendChild(lbl);
          card.appendChild(val);
          card.appendChild(sub);
          hudDiv.appendChild(card);
        });

        container.appendChild(hudDiv);
      }

      // -------------------------------------------------------------
      // 4. CHART VIEWPORT
      // -------------------------------------------------------------
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1";
      chartWrapper.style.width = "100%";
      chartWrapper.style.minHeight = "200px";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      // Tooltip Element
      var tooltip = d3.select(chartWrapper)
        .append("div")
        .attr("class", "pareto-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", theme.tooltipBg)
        .style("border", "1px solid " + theme.tooltipBorder)
        .style("box-shadow", "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)")
        .style("border-radius", "8px")
        .style("padding", "10px 14px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "100")
        .style("min-width", "210px");

      var rect = chartWrapper.getBoundingClientRect();
      var width = rect.width || container.clientWidth || 800;
      var height = rect.height || 450;

      var layoutMode = config.layoutMode || "classic_pareto";

      if (layoutMode === "abc_stratification") {
        this.renderAbcMatrix(chartWrapper, sortedItems, totalSum, thresholdA, thresholdB, theme, width, height, measureField, dimField, tooltip);
      } else if (layoutMode === "lorenz_inequality") {
        this.renderLorenzCurve(chartWrapper, sortedItems, totalSum, giniCoeff, theme, width, height, tooltip);
      } else if (layoutMode === "cumulative_waterfall") {
        this.renderWaterfall(chartWrapper, displayItems, totalSum, thresholdA, thresholdB, theme, width, height, config, tooltip);
      } else {
        this.renderClassicPareto(chartWrapper, displayItems, totalSum, thresholdA, thresholdB, cutoffRankA, theme, width, height, config, measureField, dimField, tooltip, targetBenchmark, targetLabel);
      }
    },

    // ---------------------------------------------------------------
    // MODE 1: CLASSIC PARETO & 80/20 DUAL-AXIS CUTOFF
    // ---------------------------------------------------------------
    renderClassicPareto: function (chartWrapper, items, totalSum, thresholdA, thresholdB, cutoffRankA, theme, width, height, config, measureField, dimField, tooltip, targetBenchmark, targetLabel) {
      var d3 = window.d3;
      var margin = { top: 30, right: 60, bottom: 65, left: 65 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      // Defs & Gradients
      var defs = svg.append("defs");

      // Class A Gradient
      var gradA = defs.append("linearGradient").attr("id", "gradClassA").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
      gradA.append("stop").attr("offset", "0%").attr("stop-color", theme.classAGradient[1]);
      gradA.append("stop").attr("offset", "100%").attr("stop-color", theme.classAGradient[0]);

      // Class B Gradient
      var gradB = defs.append("linearGradient").attr("id", "gradClassB").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
      gradB.append("stop").attr("offset", "0%").attr("stop-color", theme.classBGradient[1]);
      gradB.append("stop").attr("offset", "100%").attr("stop-color", theme.classBGradient[0]);

      // Class C Gradient
      var gradC = defs.append("linearGradient").attr("id", "gradClassC").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
      gradC.append("stop").attr("offset", "0%").attr("stop-color", theme.classCGradient[1]);
      gradC.append("stop").attr("offset", "100%").attr("stop-color", theme.classCGradient[0]);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var x = d3.scaleBand()
        .domain(items.map(function (d) { return d.name; }))
        .range([0, innerWidth])
        .padding(config.barPadding || 0.25);

      var maxVal = d3.max(items, function (d) { return d.value; }) || 1;
      var yLeft = d3.scaleLinear()
        .domain([0, maxVal * 1.08])
        .nice()
        .range([innerHeight, 0]);

      var yRight = d3.scaleLinear()
        .domain([0, 105])
        .range([innerHeight, 0]);

      // Gridlines (Horizontal left axis)
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yLeft).ticks(5).tickSize(-innerWidth).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.gridColor)
        .attr("stroke-dasharray", "3,3");

      // 80% Threshold Reference Line (Right Axis)
      if (config.showThresholdLine) {
        var yThreshold = yRight(thresholdA);
        var threshLine = g.append("g").attr("class", "threshold-80");

        threshLine.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yThreshold)
          .attr("y2", yThreshold)
          .attr("stroke", theme.thresholdColor)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "6,4")
          .attr("opacity", 0.9);

        // Badge pill at right
        var badge = threshLine.append("g")
          .attr("transform", "translate(" + (innerWidth - 110) + "," + (yThreshold - 12) + ")");

        badge.append("rect")
          .attr("width", 108)
          .attr("height", 20)
          .attr("rx", 4)
          .attr("fill", theme.thresholdColor)
          .attr("opacity", 0.95);

        badge.append("text")
          .attr("x", 54)
          .attr("y", 13)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text(config.customReferenceLineLabel || "80% Vital Cutoff");
      }

      // Target Benchmark Reference Line (Left Axis)
      if ((config.showBenchmarkLine || (config.targetMode && config.targetMode !== "none")) && targetBenchmark !== null && targetBenchmark > 0) {
        var yBench = yLeft(targetBenchmark);
        var benchLine = g.append("g").attr("class", "benchmark-line");

        benchLine.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yBench)
          .attr("y2", yBench)
          .attr("stroke", theme.benchmarkColor || "#fbbc04")
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "4,4")
          .attr("opacity", 0.9);

        var bBadge = benchLine.append("g")
          .attr("transform", "translate(" + (10) + "," + (yBench - 12) + ")");

        bBadge.append("rect")
          .attr("width", 140)
          .attr("height", 20)
          .attr("rx", 4)
          .attr("fill", theme.benchmarkColor || "#fbbc04")
          .attr("opacity", 0.95);

        bBadge.append("text")
          .attr("x", 70)
          .attr("y", 13)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text((targetLabel || "Target") + ": " + formatNumber(targetBenchmark));
      }

      // Vital Few Zone Shading (Background of Class A items)
      var classAItems = items.filter(function (d) { return d.abcClass === "A"; });
      if (classAItems.length > 0) {
        var firstA = classAItems[0];
        var lastA = classAItems[classAItems.length - 1];
        var x0 = x(firstA.name);
        var x1 = x(lastA.name) + x.bandwidth();

        g.append("rect")
          .attr("x", x0)
          .attr("y", 0)
          .attr("width", x1 - x0)
          .attr("height", innerHeight)
          .attr("fill", theme.classA)
          .attr("opacity", 0.04)
          .attr("rx", 4);
      }

      // Bars
      var bars = g.selectAll(".pareto-bar")
        .data(items)
        .enter()
        .append("rect")
        .attr("class", "pareto-bar")
        .attr("x", function (d) { return x(d.name); })
        .attr("y", function (d) { return yLeft(d.value); })
        .attr("width", x.bandwidth())
        .attr("height", function (d) { return Math.max(2, innerHeight - yLeft(d.value)); })
        .attr("rx", 3)
        .attr("fill", function (d) {
          if (d.abcClass === "A") return "url(#gradClassA)";
          if (d.abcClass === "B") return "url(#gradClassB)";
          return "url(#gradClassC)";
        })
        .attr("stroke", function (d) { return d.color; })
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("opacity", 0.8).attr("stroke-width", 2);
          showTooltip(event, d, tooltip, theme, totalSum);
        })
        .on("mousemove", function (event) {
          moveTooltip(event, tooltip, chartWrapper);
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", 1).attr("stroke-width", 1);
          tooltip.style("visibility", "hidden");
        })
        .on("click", function (event, d) {
          if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({
              links: d.links,
              event: event
            });
          }
        });

      // Data Labels on Bars (if enabled)
      var showLabels = config.labelDensity === "all" || (config.labelDensity === "peaks") || (config.showDataLabels && config.labelDensity !== "hidden");
      if (showLabels && x.bandwidth() > 18) {
        var maxItemVal = d3.max(items, function(d) { return d.value; });
        var minItemVal = d3.min(items, function(d) { return d.value; });
        var labelData = items;
        if (config.labelDensity === "peaks") {
          labelData = items.filter(function(d) { return d.value === maxItemVal || d.value === minItemVal; });
        }
        g.selectAll(".bar-label")
          .data(labelData)
          .enter()
          .append("text")
          .attr("class", "bar-label")
          .attr("x", function (d) { return x(d.name) + x.bandwidth() / 2; })
          .attr("y", function (d) { return yLeft(d.value) - 4; })
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .text(function (d) { return formatValue(d.value, config, measureField); });
      }

      // Cumulative Ogive Curve (Right Axis)
      var curveType = d3.curveMonotoneX;
      if (config.curveInterpolation === "linear") curveType = d3.curveLinear;
      if (config.curveInterpolation === "step") curveType = d3.curveStepAfter;

      var lineGenerator = d3.line()
        .x(function (d) { return x(d.name) + x.bandwidth() / 2; })
        .y(function (d) { return yRight(d.cumShare); })
        .curve(curveType);

      // Line Path
      g.append("path")
        .datum(items)
        .attr("class", "pareto-curve")
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", theme.curveColor)
        .attr("stroke-width", 2.8)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

      // Circular Nodes on Cumulative Curve
      var points = g.selectAll(".curve-point")
        .data(items)
        .enter()
        .append("circle")
        .attr("class", "curve-point")
        .attr("cx", function (d) { return x(d.name) + x.bandwidth() / 2; })
        .attr("cy", function (d) { return yRight(d.cumShare); })
        .attr("r", Math.min(5, Math.max(2.5, x.bandwidth() / 5)))
        .attr("fill", theme.bg)
        .attr("stroke", theme.curveColor)
        .attr("stroke-width", 2.2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 7).attr("fill", theme.curveColor);
          showTooltip(event, d, tooltip, theme, totalSum);
        })
        .on("mousemove", function (event) {
          moveTooltip(event, tooltip, chartWrapper);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", Math.min(5, Math.max(2.5, x.bandwidth() / 5))).attr("fill", theme.bg);
          tooltip.style("visibility", "hidden");
        });

      // Point % Labels (if enabled)
      if (config.showDataLabels && x.bandwidth() > 28) {
        g.selectAll(".curve-label")
          .data(items)
          .enter()
          .append("text")
          .attr("class", "curve-label")
          .attr("x", function (d) { return x(d.name) + x.bandwidth() / 2; })
          .attr("y", function (d) { return yRight(d.cumShare) - 7; })
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .attr("fill", theme.curveColor)
          .text(function (d) { return d.cumShare.toFixed(0) + "%"; });
      }

      // X Axis
      var xAxis = d3.axisBottom(x);
      var xAxisG = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis);

      xAxisG.select(".domain").attr("stroke", theme.border);
      xAxisG.selectAll("line").attr("stroke", theme.border);
      xAxisG.selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", items.length > 20 ? "9px" : "11px")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.6em")
        .text(function (d) {
          return d.length > 18 ? d.substring(0, 16) + "…" : d;
        });

      // Left Y-Axis (Metric Volume)
      var yAxisLeft = d3.axisLeft(yLeft)
        .ticks(5)
        .tickFormat(function (d) { return formatNumber(d); });
      var yAxisLeftG = g.append("g").attr("class", "y-axis-left").call(yAxisLeft);
      yAxisLeftG.select(".domain").attr("stroke", theme.border);
      yAxisLeftG.selectAll("line").attr("stroke", theme.border);
      yAxisLeftG.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");

      // Clean empty label rule: No label if header/legends exist
      yAxisLeftG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 16)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .text(measureField.label_short || "Volume");

      // Right Y-Axis (Cumulative Percentage 0-100%)
      var yAxisRight = d3.axisRight(yRight)
        .ticks(5)
        .tickFormat(function (d) { return d + "%"; });
      var yAxisRightG = g.append("g")
        .attr("class", "y-axis-right")
        .attr("transform", "translate(" + innerWidth + ",0)")
        .call(yAxisRight);

      yAxisRightG.select(".domain").attr("stroke", theme.border);
      yAxisRightG.selectAll("line").attr("stroke", theme.border);
      yAxisRightG.selectAll("text").attr("fill", theme.curveColor).attr("font-size", "10px").attr("font-weight", "600");

      yAxisRightG.append("text")
        .attr("transform", "rotate(90)")
        .attr("y", -margin.right + 18)
        .attr("x", innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", theme.curveColor)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .text("Cumulative %");
    },

    // ---------------------------------------------------------------
    // MODE 2: ABC STRATIFICATION MATRIX
    // ---------------------------------------------------------------
    renderAbcMatrix: function (chartWrapper, items, totalSum, thresholdA, thresholdB, theme, width, height, measureField, dimField, tooltip) {
      chartWrapper.innerHTML = "";
      var container = document.createElement("div");
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
      container.style.gap = "16px";
      container.style.padding = "16px";
      container.style.height = "100%";
      container.style.boxSizing = "border-box";
      container.style.overflowY = "auto";
      chartWrapper.appendChild(container);

      var classes = [
        {
          tier: "A",
          title: "Class A — Vital Few",
          range: "0% to " + thresholdA + "% Cumulative",
          color: theme.classA,
          bg: theme.cardBg,
          items: items.filter(function (d) { return d.abcClass === "A"; }),
          desc: "High-impact core driving the vast majority of volume. Prioritize top-tier resource allocation."
        },
        {
          tier: "B",
          title: "Class B — Useful Many",
          range: thresholdA + "% to " + thresholdB + "% Cumulative",
          color: theme.classB,
          bg: theme.cardBg,
          items: items.filter(function (d) { return d.abcClass === "B"; }),
          desc: "Secondary contributors with steady impact. Monitor for upward mobility or sudden churn."
        },
        {
          tier: "C",
          title: "Class C — Trivial Many",
          range: thresholdB + "% to 100% Cumulative",
          color: theme.classC,
          bg: theme.cardBg,
          items: items.filter(function (d) { return d.abcClass === "C"; }),
          desc: "Long tail of low individual volume. Consider aggregation, automated handling, or rationalization."
        }
      ];

      classes.forEach(function (cls) {
        var card = document.createElement("div");
        card.style.backgroundColor = cls.bg;
        card.style.border = "1px solid " + theme.border;
        card.style.borderTop = "4px solid " + cls.color;
        card.style.borderRadius = "8px";
        card.style.padding = "14px";
        card.style.display = "flex";
        card.style.flexDirection = "column";

        var tierSum = d3.sum(cls.items, function (d) { return d.value; });
        var tierShare = (tierSum / totalSum) * 100;
        var itemPct = ((cls.items.length / items.length) * 100).toFixed(1);

        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span style="font-size:14px;font-weight:700;color:' + cls.color + ';">' + cls.title + '</span>' +
            '<span style="font-size:10px;font-weight:700;background:' + cls.color + ';color:#ffffff;padding:2px 6px;border-radius:10px;">' + cls.tier + '</span>' +
          '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:12px;">' + cls.range + '</div>' +
          '<div style="display:flex;gap:12px;margin-bottom:14px;padding:8px;background:' + theme.bg + ';border-radius:6px;border:1px solid ' + theme.border + ';">' +
            '<div><div style="font-size:9px;color:' + theme.subtext + ';font-weight:700;">ITEMS</div><div style="font-size:15px;font-weight:800;color:' + theme.text + ';">' + cls.items.length + ' <span style="font-size:10px;color:' + theme.subtext + ';">(' + itemPct + '%)</span></div></div>' +
            '<div><div style="font-size:9px;color:' + theme.subtext + ';font-weight:700;">TOTAL VALUE</div><div style="font-size:15px;font-weight:800;color:' + cls.color + ';">' + formatNumber(tierSum) + ' <span style="font-size:10px;color:' + theme.subtext + ';">(' + tierShare.toFixed(1) + '%)</span></div></div>' +
          '</div>' +
          '<div style="font-size:11px;color:' + theme.subtext + ';margin-bottom:10px;line-height:1.4;">' + cls.desc + '</div>' +
          '<div style="font-size:10px;font-weight:700;color:' + theme.subtext + ';margin-bottom:6px;text-transform:uppercase;">Top Items in ' + cls.tier + '</div>' +
          '<div class="item-list" style="flex:1;overflow-y:auto;max-height:220px;display:flex;flex-direction:column;gap:4px;"></div>';

        var listDiv = card.querySelector(".item-list");
        var topTierItems = cls.items.slice(0, 15);
        topTierItems.forEach(function (it) {
          var row = document.createElement("div");
          row.style.display = "flex";
          row.style.justifyContent = "space-between";
          row.style.alignItems = "center";
          row.style.padding = "4px 6px";
          row.style.borderRadius = "4px";
          row.style.fontSize = "11px";
          row.style.backgroundColor = theme.bg;
          row.style.border = "1px solid " + theme.border;
          row.style.cursor = "pointer";

          row.innerHTML =
            '<div style="display:flex;gap:6px;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
              '<span style="font-weight:700;color:' + theme.subtext + ';width:22px;">#' + it.rank + '</span>' +
              '<span style="font-weight:600;color:' + theme.text + ';overflow:hidden;text-overflow:ellipsis;">' + it.name + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;align-items:center;">' +
              '<span style="font-weight:700;color:' + cls.color + ';">' + formatNumber(it.value) + '</span>' +
              '<span style="font-size:10px;color:' + theme.subtext + ';">' + it.share.toFixed(1) + '%</span>' +
            '</div>';

          row.addEventListener("click", function (e) {
            if (it.links && it.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: it.links, event: e });
            }
          });
          listDiv.appendChild(row);
        });

        if (cls.items.length > 15) {
          var more = document.createElement("div");
          more.style.fontSize = "10px";
          more.style.color = theme.subtext;
          more.style.textAlign = "center";
          more.style.padding = "4px";
          more.textContent = "+ " + (cls.items.length - 15) + " more items";
          listDiv.appendChild(more);
        }

        container.appendChild(card);
      });
    },

    // ---------------------------------------------------------------
    // MODE 3: LORENZ INEQUALITY CURVE & GINI
    // ---------------------------------------------------------------
    renderLorenzCurve: function (chartWrapper, items, totalSum, giniCoeff, theme, width, height, tooltip) {
      var d3 = window.d3;
      var margin = { top: 30, right: 40, bottom: 55, left: 60 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Lorenz Coordinates: (0,0) -> (cumPopPct, cumValPct) in ascending order
      var n = items.length;
      var lorenzPoints = [{ popPct: 0, valPct: 0, rank: 0, name: "Origin" }];
      var ascItems = items.slice().reverse();
      var runningAscSum = 0;

      for (var i = 0; i < n; i++) {
        var it = ascItems[i];
        runningAscSum += it.value;
        lorenzPoints.push({
          popPct: ((i + 1) / n) * 100,
          valPct: (runningAscSum / totalSum) * 100,
          rank: it.rank,
          name: it.name,
          value: it.value
        });
      }

      var x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
      var y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

      // Gridlines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.gridColor)
        .attr("stroke-dasharray", "3,3");

      // Area of Inequality (Between 45° line and Lorenz curve)
      var areaGenerator = d3.area()
        .x(function (d) { return x(d.popPct); })
        .y0(function (d) { return y(d.popPct); }) // 45° equality line
        .y1(function (d) { return y(d.valPct); });

      g.append("path")
        .datum(lorenzPoints)
        .attr("d", areaGenerator)
        .attr("fill", theme.classA)
        .attr("opacity", 0.12);

      // 45° Line of Perfect Equality
      g.append("line")
        .attr("x1", x(0))
        .attr("y1", y(0))
        .attr("x2", x(100))
        .attr("y2", y(100))
        .attr("stroke", theme.subtext)
        .attr("stroke-width", 1.8)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8);

      // 45° Label
      g.append("text")
        .attr("x", x(50))
        .attr("y", y(50) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("transform", "rotate(-45," + x(50) + "," + y(50) + ")")
        .text("Line of Perfect Equality (45°)");

      // Lorenz Empirical Curve
      var lineGen = d3.line()
        .x(function (d) { return x(d.popPct); })
        .y(function (d) { return y(d.valPct); })
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(lorenzPoints)
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", theme.curveColor)
        .attr("stroke-width", 3);

      // 80/20 Reference Pin: Top 20% items
      var top20Index = Math.floor(n * 0.80);
      var pointTop20 = lorenzPoints[top20Index] || lorenzPoints[lorenzPoints.length - 1];
      var shareTop20 = 100 - pointTop20.valPct; // Volume possessed by top 20%

      g.append("circle")
        .attr("cx", x(80))
        .attr("cy", y(pointTop20.valPct))
        .attr("r", 6)
        .attr("fill", theme.thresholdColor)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

      g.append("line")
        .attr("x1", x(80))
        .attr("y1", y(pointTop20.valPct))
        .attr("x2", x(80))
        .attr("y2", innerHeight)
        .attr("stroke", theme.thresholdColor)
        .attr("stroke-dasharray", "3,3");

      // Gini Overlay Card in Top Left
      var giniBox = g.append("g").attr("transform", "translate(20, 10)");
      giniBox.append("rect")
        .attr("width", 190)
        .attr("height", 64)
        .attr("rx", 6)
        .attr("fill", theme.cardBg)
        .attr("stroke", theme.border);

      giniBox.append("text")
        .attr("x", 12)
        .attr("y", 18)
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .attr("fill", theme.subtext)
        .text("GINI COEFFICIENT");

      giniBox.append("text")
        .attr("x", 12)
        .attr("y", 40)
        .attr("font-size", "18px")
        .attr("font-weight", "800")
        .attr("fill", theme.classA)
        .text(giniCoeff.toFixed(3));

      giniBox.append("text")
        .attr("x", 12)
        .attr("y", 54)
        .attr("font-size", "10px")
        .attr("fill", theme.subtext)
        .text("Top 20% population holds " + shareTop20.toFixed(1) + "% of total");

      // Axes
      var xAxis = d3.axisBottom(x).ticks(5).tickFormat(function (d) { return d + "%"; });
      var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return d + "%"; });

      var gx = g.append("g").attr("transform", "translate(0," + innerHeight + ")").call(xAxis);
      gx.select(".domain").attr("stroke", theme.border);
      gx.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");

      gx.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text("Cumulative Share of Population (Entities %)");

      var gy = g.append("g").call(yAxis);
      gy.select(".domain").attr("stroke", theme.border);
      gy.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");

      gy.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text("Cumulative Share of Metric (Volume %)");
    },

    // ---------------------------------------------------------------
    // MODE 4: CUMULATIVE STEPPED WATERFALL
    // ---------------------------------------------------------------
    renderWaterfall: function (chartWrapper, items, totalSum, thresholdA, thresholdB, theme, width, height, config, tooltip) {
      var d3 = window.d3;
      var margin = { top: 30, right: 40, bottom: 65, left: 65 };
      var innerWidth = Math.max(100, width - margin.left - margin.right);
      var innerHeight = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var x = d3.scaleBand()
        .domain(items.map(function (d) { return d.name; }))
        .range([0, innerWidth])
        .padding(config.barPadding || 0.25);

      var y = d3.scaleLinear()
        .domain([0, totalSum * 1.05])
        .nice()
        .range([innerHeight, 0]);

      // Gridlines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.gridColor)
        .attr("stroke-dasharray", "3,3");

      // 80% Reference Line
      var y80 = y(totalSum * (thresholdA / 100));
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", y80)
        .attr("y2", y80)
        .attr("stroke", theme.thresholdColor)
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.5);

      g.append("text")
        .attr("x", innerWidth - 8)
        .attr("y", y80 - 6)
        .attr("text-anchor", "end")
        .attr("fill", theme.thresholdColor)
        .attr("font-size", "10px")
        .attr("font-weight", "700")
        .text(thresholdA + "% Target (" + formatNumber(totalSum * (thresholdA / 100)) + ")");

      // Stepped Waterfall Blocks
      var runningBase = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var barTop = y(runningBase + it.value);
        var barBottom = y(runningBase);
        var barHeight = Math.max(2, barBottom - barTop);

        // Bar rect
        g.append("rect")
          .attr("class", "waterfall-bar")
          .attr("x", x(it.name))
          .attr("y", barTop)
          .attr("width", x.bandwidth())
          .attr("height", barHeight)
          .attr("rx", 3)
          .attr("fill", it.color)
          .attr("opacity", 0.9)
          .style("cursor", "pointer")
          .datum(it)
          .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.7);
            showTooltip(event, d, tooltip, theme, totalSum);
          })
          .on("mousemove", function (event) {
            moveTooltip(event, tooltip, chartWrapper);
          })
          .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.9);
            tooltip.style("visibility", "hidden");
          })
          .on("click", function (event, d) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
            }
          });

        // Connector line to next bar
        if (i < items.length - 1) {
          var nextName = items[i + 1].name;
          g.append("line")
            .attr("x1", x(it.name))
            .attr("x2", x(nextName) + x.bandwidth())
            .attr("y1", barTop)
            .attr("y2", barTop)
            .attr("stroke", theme.subtext)
            .attr("stroke-dasharray", "2,2")
            .attr("stroke-width", 1)
            .attr("opacity", 0.6);
        }

        runningBase += it.value;
      }

      // X Axis
      var xAxis = d3.axisBottom(x);
      var gx = g.append("g").attr("transform", "translate(0," + innerHeight + ")").call(xAxis);
      gx.select(".domain").attr("stroke", theme.border);
      gx.selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", items.length > 20 ? "9px" : "11px")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.6em")
        .text(function (d) { return d.length > 18 ? d.substring(0, 16) + "…" : d; });

      // Y Axis
      var yAxis = d3.axisLeft(y).ticks(5).tickFormat(function (d) { return formatNumber(d); });
      var gy = g.append("g").call(yAxis);
      gy.select(".domain").attr("stroke", theme.border);
      gy.selectAll("text").attr("fill", theme.subtext).attr("font-size", "10px");
    }
  });

  // -----------------------------------------------------------------
  // TOOLTIP HELPERS
  // -----------------------------------------------------------------
  function showTooltip(event, d, tooltip, theme, totalSum) {
    var tierBadgeColor = d.color || theme.classA;
    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">' +
        '<span style="font-weight:700;font-size:13px;color:' + theme.text + ';">' + d.name + '</span>' +
        '<span style="background:' + tierBadgeColor + ';color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">' + d.abcLabel + '</span>' +
      '</div>' +
      '<div style="border-top:1px solid ' + theme.border + ';padding-top:6px;display:flex;flex-direction:column;gap:3px;">' +
        '<div style="display:flex;justify-content:space-between;color:' + theme.subtext + ';"><span>Rank:</span><span style="font-weight:700;color:' + theme.text + ';">#' + d.rank + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:' + theme.subtext + ';"><span>Metric Value:</span><span style="font-weight:700;color:' + tierBadgeColor + ';">' + formatNumber(d.value) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:' + theme.subtext + ';"><span>Share of Total:</span><span style="font-weight:700;color:' + theme.text + ';">' + d.share.toFixed(2) + '%</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:' + theme.subtext + ';"><span>Cumulative Volume:</span><span style="font-weight:700;color:' + theme.text + ';">' + formatNumber(d.cumSum) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:' + theme.subtext + ';"><span>Cumulative Share:</span><span style="font-weight:800;color:' + theme.curveColor + ';">' + d.cumShare.toFixed(1) + '%</span></div>' +
      '</div>' +
      (d.links && d.links.length > 0 ? '<div style="margin-top:6px;font-size:9px;color:' + theme.classA + ';font-weight:600;">👆 Click for Looker Drill-Down</div>' : '');

    tooltip.html(html).style("visibility", "visible");
  }

  function moveTooltip(event, tooltip, container) {
    var rect = container.getBoundingClientRect();
    var x = event.clientX - rect.left + 14;
    var y = event.clientY - rect.top - 14;

    if (x + 230 > rect.width) x = event.clientX - rect.left - 235;
    if (y + 160 > rect.height) y = event.clientY - rect.top - 165;
    if (y < 10) y = 10;

    tooltip.style("left", x + "px").style("top", y + "px");
  }
})();
