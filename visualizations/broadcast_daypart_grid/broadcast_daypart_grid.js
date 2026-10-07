/**
 * Broadcast Programming Schedule & Daypart Performance Grid - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for Media & Entertainment (Nielsen ratings, broadcast/cable TV programming schedules,
 * streaming concurrency, ad spot airings & daypart revenue), Digital Advertising (ad pacing & CPMs),
 * Retail/E-Commerce (hourly peak conversion windows), and Gaming/Live-Ops (hourly concurrency).
 *
 * Multi-Mode Functional Capabilities:
 * - View Modes:
 *     1. "split_view": Dual Synchronized View (Top 7x24 Heatmap Matrix + Bottom Broadcast Daypart Scorecards
 *        & Diurnal Curves with live cross-highlighting).
 *     2. "hourly_grid": Full 7-Day x 24-Hour Schedule Matrix Heatmap with daypart boundary markers,
 *        top hourly distribution curve/bars, and right daily volume rollups.
 *     3. "daypart_blocks": Standard Broadcast Daypart Aggregation (Overnight, Early Morning, Daytime,
 *        Early Fringe, Prime Time, Late Night) with share-of-voice scorecards and weekday/weekend indexing.
 *     4. "diurnal_curves": 24-Hour Diurnal Spline Curves plotting each day of the week with daypart
 *        background bands and weekly baseline curve.
 * - Options Organization:
 *     Strictly limited to 2 clean sections ("Display" and "Style") to prevent Edit Modal crowding.
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

  var DAYPART_DEFINITIONS = {
    nielsen: [
      { id: "overnight", name: "Overnight", start: 2, end: 6, hours: [2, 3, 4, 5], color: "#64748b", desc: "02:00 - 06:00" },
      { id: "early_morning", name: "Early Morning", start: 6, end: 9, hours: [6, 7, 8], color: "#0284c7", desc: "06:00 - 09:00" },
      { id: "daytime", name: "Daytime", start: 9, end: 16, hours: [9, 10, 11, 12, 13, 14, 15], color: "#059669", desc: "09:00 - 16:00" },
      { id: "early_fringe", name: "Early Fringe", start: 16, end: 19, hours: [16, 17, 18], color: "#d97706", desc: "16:00 - 19:00" },
      { id: "prime_time", name: "Prime Time", start: 19, end: 23, hours: [19, 20, 21, 22], color: "#dc2626", desc: "19:00 - 23:00" },
      { id: "late_night", name: "Late Night", start: 23, end: 2, hours: [23, 0, 1], color: "#7c3aed", desc: "23:00 - 02:00" }
    ],
    retail: [
      { id: "night", name: "Late Night / Off-Peak", start: 0, end: 6, hours: [0, 1, 2, 3, 4, 5], color: "#64748b", desc: "00:00 - 06:00" },
      { id: "morning", name: "Morning Commute & Rush", start: 6, end: 12, hours: [6, 7, 8, 9, 10, 11], color: "#0284c7", desc: "06:00 - 12:00" },
      { id: "afternoon", name: "Midday & Lunch", start: 12, end: 18, hours: [12, 13, 14, 15, 16, 17], color: "#059669", desc: "12:00 - 18:00" },
      { id: "evening_prime", name: "Evening Prime Shopping", start: 18, end: 24, hours: [18, 19, 20, 21, 22, 23], color: "#ea580c", desc: "18:00 - 24:00" }
    ],
    shifts: [
      { id: "shift_1", name: "Day Shift (Shift 1)", start: 7, end: 15, hours: [7, 8, 9, 10, 11, 12, 13, 14], color: "#0284c7", desc: "07:00 - 15:00" },
      { id: "shift_2", name: "Swing Shift (Shift 2)", start: 15, end: 23, hours: [15, 16, 17, 18, 19, 20, 21, 22], color: "#f59e0b", desc: "15:00 - 23:00" },
      { id: "shift_3", name: "Graveyard (Shift 3)", start: 23, end: 7, hours: [23, 0, 1, 2, 3, 4, 5, 6], color: "#6366f1", desc: "23:00 - 07:00" }
    ]
  };

  var THEMES = {
    nielsen_broadcast: {
      name: "Nielsen Broadcast (Midnight / Gold)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      emptyCell: "#f1f5f9",
      dividerColor: "#94a3b8",
      peakBadgeBg: "#fef08a",
      peakBadgeText: "#854d0e",
      scale: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1d4ed8", "#1e1b4b", "#f59e0b"]
    },
    google_enterprise: {
      name: "Google Enterprise Blue",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#1e293b",
      subtext: "#64748b",
      grid: "#e2e8f0",
      emptyCell: "#f8fafc",
      dividerColor: "#94a3b8",
      peakBadgeBg: "#fef3c7",
      peakBadgeText: "#92400e",
      scale: ["#f0fdf4", "#dcfce7", "#86efac", "#38bdf8", "#0284c7", "#1d4ed8", "#0f172a"]
    },
    indigo_violet: {
      name: "Executive Indigo",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      emptyCell: "#f1f5f9",
      dividerColor: "#a5b4fc",
      peakBadgeBg: "#ede9fe",
      peakBadgeText: "#5b21b6",
      scale: ["#eef2ff", "#c7d2fe", "#818cf8", "#6366f1", "#4f46e5", "#3730a3", "#1e1b4b"]
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
      emptyCell: "#f1f5f9",
      dividerColor: "#94a3b8",
      peakBadgeBg: "#e2e8f0",
      peakBadgeText: "#0f172a",
      scale: ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#334155", "#0f172a"]
    },
    cyberpunk_neon: {
      name: "Cyberpunk Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      emptyCell: "#111827",
      dividerColor: "#475569",
      peakBadgeBg: "rgba(245, 158, 11, 0.2)",
      peakBadgeText: "#fbbf24",
      scale: ["#111827", "#1e1b4b", "#312e81", "#4f46e5", "#818cf8", "#c084fc", "#00f0ff"]
    },
    emerald_teal: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#bbf7d0",
      emptyCell: "#f0fdf4",
      dividerColor: "#86efac",
      peakBadgeBg: "#fef08a",
      peakBadgeText: "#854d0e",
      scale: ["#f0fdf4", "#d1fae5", "#6ee7b7", "#34d399", "#10b981", "#059669", "#064e3b"]
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#451a03",
      subtext: "#92400e",
      grid: "#fef3c7",
      emptyCell: "#fffbeb",
      dividerColor: "#fcd34d",
      peakBadgeBg: "#fef08a",
      peakBadgeText: "#78350f",
      scale: ["#fffbeb", "#fef3c7", "#fde68a", "#fbbf24", "#f59e0b", "#d97706", "#7c2d12"]
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
      emptyCell: "#f0f9ff",
      dividerColor: "#7dd3fc",
      peakBadgeBg: "#e0f2fe",
      peakBadgeText: "#0284c7",
      scale: ["#f0f9ff", "#e0f2fe", "#bae6fd", "#38bdf8", "#0284c7", "#0369a1", "#0c4a6e"]
    },
    custom_override: {
      name: "Custom Hex Override",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#e2e8f0",
      emptyCell: "#f1f5f9",
      dividerColor: "#94a3b8",
      peakBadgeBg: "#fef08a",
      peakBadgeText: "#854d0e",
      scale: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#3b82f6", "#1d4ed8", "#1e1b4b"]
    }
  };

  var DAYS_MONDAY_START = [
    { key: "monday", label: "Monday", short: "Mon", isWeekend: false, dayIndex: 1 },
    { key: "tuesday", label: "Tuesday", short: "Tue", isWeekend: false, dayIndex: 2 },
    { key: "wednesday", label: "Wednesday", short: "Wed", isWeekend: false, dayIndex: 3 },
    { key: "thursday", label: "Thursday", short: "Thu", isWeekend: false, dayIndex: 4 },
    { key: "friday", label: "Friday", short: "Fri", isWeekend: false, dayIndex: 5 },
    { key: "saturday", label: "Saturday", short: "Sat", isWeekend: true, dayIndex: 6 },
    { key: "sunday", label: "Sunday", short: "Sun", isWeekend: true, dayIndex: 0 }
  ];

  var DAYS_SUNDAY_START = [
    { key: "sunday", label: "Sunday", short: "Sun", isWeekend: true, dayIndex: 0 },
    { key: "monday", label: "Monday", short: "Mon", isWeekend: false, dayIndex: 1 },
    { key: "tuesday", label: "Tuesday", short: "Tue", isWeekend: false, dayIndex: 2 },
    { key: "wednesday", label: "Wednesday", short: "Wed", isWeekend: false, dayIndex: 3 },
    { key: "thursday", label: "Thursday", short: "Thu", isWeekend: false, dayIndex: 4 },
    { key: "friday", label: "Friday", short: "Fri", isWeekend: false, dayIndex: 5 },
    { key: "saturday", label: "Saturday", short: "Sat", isWeekend: true, dayIndex: 6 }
  ];

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

  function normalizeDayString(val) {
    if (val === null || val === undefined) return null;
    var s = String(val).toLowerCase().trim();
    if (s.indexOf("mon") !== -1) return "monday";
    if (s.indexOf("tue") !== -1) return "tuesday";
    if (s.indexOf("wed") !== -1) return "wednesday";
    if (s.indexOf("thu") !== -1) return "thursday";
    if (s.indexOf("fri") !== -1) return "friday";
    if (s.indexOf("sat") !== -1) return "saturday";
    if (s.indexOf("sun") !== -1) return "sunday";
    var n = parseInt(s, 10);
    if (!isNaN(n)) {
      if (n === 0) return "sunday";
      if (n === 1) return "monday";
      if (n === 2) return "tuesday";
      if (n === 3) return "wednesday";
      if (n === 4) return "thursday";
      if (n === 5) return "friday";
      if (n === 6) return "saturday";
      if (n === 7) return "sunday";
    }
    return null;
  }

  function normalizeHourNumber(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && !isNaN(val)) {
      var h = Math.floor(val);
      if (h >= 0 && h <= 23) return h;
    }
    var s = String(val).trim();
    if (s.indexOf(":") !== -1) {
      var parts = s.split(":");
      var hParsed = parseInt(parts[0], 10);
      if (s.toLowerCase().indexOf("pm") !== -1 && hParsed < 12) hParsed += 12;
      if (s.toLowerCase().indexOf("am") !== -1 && hParsed === 12) hParsed = 0;
      if (!isNaN(hParsed) && hParsed >= 0 && hParsed <= 23) return hParsed;
    }
    var n = parseInt(s, 10);
    if (!isNaN(n) && n >= 0 && n <= 23) return n;
    return null;
  }

  function formatValue(val, formatType, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (formatType === "auto" && lookerRendered) return lookerRendered;
    var num = Number(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";

    switch (formatType) {
      case "percentage":
      case "percent":
        return sign + (abs < 1 && abs > 0 ? (abs * 100).toFixed(1) : abs.toFixed(1)) + "%";
      case "compact_number":
      case "compact_num":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
    }
  }

  function getHourLabel(hour, format24) {
    if (format24) {
      return (hour < 10 ? "0" : "") + hour + ":00";
    }
    if (hour === 0) return "12 AM";
    if (hour < 12) return hour + " AM";
    if (hour === 12) return "12 PM";
    return (hour - 12) + " PM";
  }

  function getTextColorForBackground(hexColor) {
    if (!hexColor || hexColor.charAt(0) !== "#") return "#0f172a";
    var hex = hexColor.substring(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    var yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 135 ? "#0f172a" : "#ffffff";
  }

  looker.plugins.visualizations.add({
    id: "broadcast_daypart_grid",
    label: "Broadcast Programming Schedule & Daypart Performance Grid",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Layout View Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Dual Split View (Matrix + Dayparts)": "split_view" },
          { "Hourly 7x24 Heatmap Matrix": "hourly_grid" },
          { "Broadcast Dayparts (Nielsen Scorecards)": "daypart_blocks" },
          { "24-Hour Diurnal Spline Curves": "diurnal_curves" }
        ],
        default: "split_view"
      },
      dayDimOverride: {
        type: "string",
        label: "Day Dimension Index/Name (1 = Col 1, e.g. Day of Week)",
        default: "1",
        section: "Display",
        order: 2
      },
      hourDimOverride: {
        type: "string",
        label: "Hour Dimension Index/Name (2 = Col 2, e.g. Hour of Day)",
        default: "2",
        section: "Display",
        order: 3
      },
      sliceDimOverride: {
        type: "string",
        label: "Slicing Category Dimension Index/Name (Optional, e.g. Channel/Network)",
        default: "",
        section: "Display",
        order: 4
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Metric Measure Index/Name (1 = Measure 1, e.g. Spend / GRPs)",
        default: "1",
        section: "Display",
        order: 5
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / Benchmark Measure Index/Name (Optional)",
        default: "",
        section: "Display",
        order: 6
      },
      startOfWeek: {
        type: "string",
        label: "Start of Week",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Monday (Broadcast & ISO Standard)": "monday" },
          { "Sunday (US Calendar Standard)": "sunday" }
        ],
        default: "monday"
      },
      daypartPreset: {
        type: "string",
        label: "Daypart Grouping Scheme",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "Broadcast / Nielsen Standard (6 Tiers)": "nielsen" },
          { "Retail & E-Commerce (4 Tiers)": "retail" },
          { "Workplace Operational Shifts (3 Tiers)": "shifts" }
        ],
        default: "nielsen"
      },
      targetCalculationMode: {
        type: "string",
        label: "Target / Benchmark Calculation Mode",
        display: "select",
        values: [
          { "Dataset Mean (Average Hourly Velocity)": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Fixed Benchmark Target Value": "fixed" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "Target Measure Column": "measure_column" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 9
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value (when Fixed Mode, 0 = Auto)",
        default: 0,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line & Benchmark Label",
        default: "Benchmark Target",
        section: "Display",
        order: 11
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Drop-Off / Outlier Anomaly Alert Threshold (%)",
        default: 20,
        section: "Display",
        order: 12
      },
      highlightPeaks: {
        type: "string",
        label: "Peak Slot Anomaly Detection",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Top 5% Peak Slots (★ Gold)": "top_5" },
          { "Top 10% Peak Slots (★ Gold)": "top_10" },
          { "Above Average (+1σ Outliers)": "above_avg" },
          { "None": "none" }
        ],
        default: "top_5"
      },
      sortBy: {
        type: "string",
        label: "Schedule & Category Sort Order",
        display: "select",
        values: [
          { "Chronological / Natural": "chronological" },
          { "Metric Volume (Descending)": "metric_desc" },
          { "Metric Volume (Ascending)": "metric_asc" },
          { "Alphabetical": "alphabetical" }
        ],
        default: "chronological",
        section: "Display",
        order: 14
      },
      topNLimit: {
        type: "number",
        label: "Top-N Slices/Categories Display Limit (0 = All)",
        default: 0,
        section: "Display",
        order: 15
      },
      rollupOther: {
        type: "boolean",
        label: "Rollup Unselected Slices into 'Other'",
        default: false,
        section: "Display",
        order: 16
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Data Cells",
        default: true,
        section: "Display",
        order: 17
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 18
      },
      showValueLabels: {
        type: "string",
        label: "In-Cell & Curve Data Labels",
        display: "select",
        values: [
          { "Show All Cell Values": "all" },
          { "Peaks / Outliers Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 19
      },
      showMarginals: {
        type: "boolean",
        label: "Show Marginal Rollups (Day/Hour Totals)",
        section: "Display",
        order: 20,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Slicing & Filter Toolbar",
        section: "Display",
        order: 21,
        default: true
      },
      customTitleOverride: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 22
      },
      customSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 23
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
          { "Nielsen Broadcast (Midnight / Gold)": "nielsen_broadcast" },
          { "Google Enterprise Blue": "google_enterprise" },
          { "Executive Indigo": "indigo_violet" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Neon)": "cyberpunk_neon" },
          { "Emerald FinOps": "emerald_teal" },
          { "Sunset Media (Warm Amber)": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "nielsen_broadcast"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Brand Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive / Peak Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Off-Peak / Deficit Hex",
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
          { "Higher is Better (Ratings, Spend, Concurrency)": "higher_is_better" },
          { "Lower is Better (Latency, Churn, Error Rate)": "lower_is_better" }
        ],
        default: "higher_is_better",
        section: "Style",
        order: 5
      },
      colorScaleMode: {
        type: "string",
        label: "Color Scale Dynamics",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Quantile (Balanced Contrast Across Cells)": "quantile" },
          { "Linear (Absolute Proportionality)": "linear" },
          { "Logarithmic (Extreme Dynamic Range)": "log" }
        ],
        default: "quantile"
      },
      cellRadius: {
        type: "number",
        label: "Cell Corner Radius (px)",
        section: "Style",
        order: 7,
        display: "range",
        min: 0,
        max: 8,
        step: 1,
        default: 4
      },
      cellSpacing: {
        type: "number",
        label: "Cell Spacing (px)",
        section: "Style",
        order: 8,
        display: "range",
        min: 1,
        max: 6,
        step: 1,
        default: 2
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
        order: 9
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting Style",
        display: "select",
        values: [
          { "Auto (Looker / Contextual)": "auto" },
          { "Compact Currency (.2M)": "compact_currency" },
          { "Standard Currency (,234,567)": "currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2" },
          { "Raw Unformatted": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 10
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "broadcast-daypart-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.overflow = "auto";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Create floating tooltip
      this._tooltip = document.createElement("div");
      this._tooltip.className = "broadcast-daypart-tooltip";
      this._tooltip.style.position = "fixed";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.display = "none";
      this._tooltip.style.zIndex = "999999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      this._tooltip.style.transition = "opacity 0.12s ease-out";
      document.body.appendChild(this._tooltip);

      this._selectedSlice = "ALL";
      this._selectedMeasureIndex = 0;
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

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        this._container = document.createElement("div");
        this._container.className = "broadcast-daypart-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.overflow = "auto";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      this.clearErrors();

      if (!queryResponse || !queryResponse.fields) {
        done();
        return;
      }

      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }

      if (dimensions.length < 2 || measures.length < 1) {
        this.addError({
          title: "Incompatible Data Fields",
          message: "Broadcast Daypart Grid requires at least 2 Dimensions (Day of Week and Hour of Day) and 1 Numeric Measure."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._renderChart(d3, data, config, queryResponse);
          done();
        } catch (err) {
          console.error("Broadcast Daypart Grid render error:", err);
          self.addError({
            title: "Render Error",
            message: err.message
          });
          done();
        }
      });
    },

    _renderChart: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var themeKey = config.colorPalette || "nielsen_broadcast";
      var theme = THEMES[themeKey] || THEMES.nielsen_broadcast;

      // Custom hex overrides if specified
      if (themeKey === "custom_override" || config.customPrimaryHex || config.customPositiveHex || config.customNegativeHex) {
        theme = Object.assign({}, theme);
        if (config.customPrimaryHex) {
          theme.scale = ["#f8fafc", "#e2e8f0", "#93c5fd", config.customPrimaryHex, "#1e1b4b"];
        }
        if (config.customPositiveHex) {
          theme.peakBadgeText = config.customPositiveHex;
          theme.peakBadgeBg = config.customPositiveHex + "22";
        }
        if (config.customNegativeHex) {
          theme.dividerColor = config.customNegativeHex;
        }
      }

      // Font scale multiplier
      var fontMultiplier = 1.0;
      if (config.fontScale === "compact") fontMultiplier = 0.88;
      else if (config.fontScale === "large") fontMultiplier = 1.18;

      container.style.background = theme.bg;
      container.style.color = theme.text;
      container.style.fontSize = (12 * fontMultiplier) + "px";

      // Dynamic field-role resolution
      var dimensions = (queryResponse.fields.dimensions && queryResponse.fields.dimensions.length > 0)
        ? queryResponse.fields.dimensions
        : (queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures && queryResponse.fields.measures.length > 0)
        ? queryResponse.fields.measures
        : (queryResponse.fields.measure_like || []);
      if (measures.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        measures = queryResponse.fields.table_calculations;
      }

      var dayDim = resolveField(dimensions, config.dayDimOverride, 0);
      var hourDim = resolveField(dimensions, config.hourDimOverride, 1);
      var sliceDim = config.sliceDimOverride ? resolveField(dimensions, config.sliceDimOverride, 2) : (dimensions.length > 2 ? dimensions[2] : null);

      var activeMeasure = resolveField(measures, config.primaryMeasureOverride, self._selectedMeasureIndex);
      var targetMeasure = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, -1) : null;

      // Start of week configuration
      var startOfWeek = config.startOfWeek || "monday";
      var daysConfig = startOfWeek === "sunday" ? DAYS_SUNDAY_START : DAYS_MONDAY_START;

      // Slicing categories for 5,000+ row scalability & Top-N
      var sliceValues = ["ALL"];
      var sliceSums = {};
      if (sliceDim) {
        data.forEach(function (row) {
          var sliceCell = row[sliceDim.name];
          var val = (sliceCell && typeof sliceCell === "object") ? (sliceCell.value !== undefined ? sliceCell.value : sliceCell.rendered) : sliceCell;
          if (val !== null && val !== undefined && val !== "") {
            var sKey = String(val);
            var mCell = row[activeMeasure.name];
            var mVal = (mCell && typeof mCell === "object") ? Number(mCell.value) : Number(mCell);
            sliceSums[sKey] = (sliceSums[sKey] || 0) + (isNaN(mVal) ? 0 : mVal);
          }
        });

        var sortedSlices = Object.keys(sliceSums);
        if (config.sortBy === "metric_desc") {
          sortedSlices.sort(function (a, b) { return sliceSums[b] - sliceSums[a]; });
        } else if (config.sortBy === "metric_asc") {
          sortedSlices.sort(function (a, b) { return sliceSums[a] - sliceSums[b]; });
        } else if (config.sortBy === "alphabetical") {
          sortedSlices.sort();
        }

        var topN = config.topNLimit ? parseInt(config.topNLimit, 10) : 0;
        if (topN > 0 && sortedSlices.length > topN) {
          var kept = sortedSlices.slice(0, topN);
          if (config.rollupOther) kept.push("Other");
          sliceValues = ["ALL"].concat(kept);
        } else {
          sliceValues = ["ALL"].concat(sortedSlices);
        }
      }

      // Aggregate data into a 7x24 Matrix
      var matrix = {};
      daysConfig.forEach(function (d) {
        matrix[d.key] = new Array(24).fill(0);
      });
      var cellRawRows = {};
      var targetValues = [];

      var totalVolume = 0;
      var nonZeroCount = 0;
      var maxVal = 0;
      var minVal = Infinity;

      data.forEach(function (row) {
        if (sliceDim && self._selectedSlice !== "ALL") {
          var sliceCell = row[sliceDim.name];
          var sVal = (sliceCell && typeof sliceCell === "object") ? (sliceCell.value !== undefined ? sliceCell.value : sliceCell.rendered) : sliceCell;
          if (String(sVal) !== self._selectedSlice) return;
        }

        var dayCell = row[dayDim.name];
        var dayVal = (dayCell && typeof dayCell === "object") ? (dayCell.value !== undefined ? dayCell.value : dayCell.rendered) : dayCell;
        var dayKey = normalizeDayString(dayVal);

        var hourCell = row[hourDim.name];
        var hourVal = (hourCell && typeof hourCell === "object") ? (hourCell.value !== undefined ? hourCell.value : hourCell.rendered) : hourCell;
        var hourNum = normalizeHourNumber(hourVal);

        var measCell = row[activeMeasure.name];
        var measVal = 0;
        if (measCell && typeof measCell === "object") {
          measVal = measCell.value !== undefined ? Number(measCell.value) : (Number(measCell.rendered) || 0);
        } else if (measCell !== undefined && measCell !== null) {
          measVal = Number(measCell) || 0;
        }

        if (targetMeasure && row[targetMeasure.name] !== undefined) {
          var tCell = row[targetMeasure.name];
          var tVal = (tCell && typeof tCell === "object") ? Number(tCell.value) : Number(tCell);
          if (!isNaN(tVal)) targetValues.push(tVal);
        }

        if (dayKey && hourNum !== null && !isNaN(measVal) && matrix[dayKey]) {
          if (config.suppressZeroNull && measVal === 0) return;
          matrix[dayKey][hourNum] += measVal;
          totalVolume += measVal;
          if (measVal > 0) nonZeroCount++;
          if (measVal > maxVal) maxVal = measVal;
          if (measVal < minVal && measVal > 0) minVal = measVal;

          var cellKey = dayKey + "_" + hourNum;
          if (!cellRawRows[cellKey]) {
            cellRawRows[cellKey] = row;
          }
        }
      });

      if (minVal === Infinity) minVal = 0;

      // Extract all cell values for statistical distributions & targets
      var allValues = [];
      daysConfig.forEach(function (d) {
        for (var h = 0; h < 24; h++) {
          allValues.push(matrix[d.key][h]);
        }
      });
      allValues.sort(function (a, b) { return a - b; });

      var mean = allValues.reduce(function (a, b) { return a + b; }, 0) / (allValues.length || 1);
      var variance = allValues.reduce(function (sum, val) { return sum + Math.pow(val - mean, 2); }, 0) / (allValues.length || 1);
      var stdDev = Math.sqrt(variance);

      var p95 = d3.quantile(allValues, 0.95) || 0;
      var p90 = d3.quantile(allValues, 0.90) || 0;
      var p75 = d3.quantile(allValues, 0.75) || 0;
      var median = d3.quantile(allValues, 0.50) || 0;

      // Benchmark Target Resolution
      var benchmarkTarget = mean;
      var targetMode = config.targetCalculationMode || "dataset_mean";
      if (targetMode === "dataset_median") benchmarkTarget = median;
      else if (targetMode === "percentile_p75") benchmarkTarget = p75;
      else if (targetMode === "percentile_p90") benchmarkTarget = p90;
      else if (targetMode === "fixed") benchmarkTarget = config.fixedTargetValue || mean;
      else if (targetMode === "measure_column" && targetValues.length > 0) {
        benchmarkTarget = targetValues.reduce(function (a, b) { return a + b; }, 0) / targetValues.length;
      }

      var peakThreshold = p95;
      var peakOption = config.highlightPeaks || "top_5";
      if (peakOption === "top_10") peakThreshold = p90;
      else if (peakOption === "above_avg") peakThreshold = mean + stdDev;
      else if (peakOption === "none") peakThreshold = Infinity;

      // Metric polarity handling (invert color scales if lower is better)
      var scaleColors = theme.scale.slice();
      if (config.metricPolarity === "lower_is_better") {
        scaleColors.reverse();
      }

      // Color Scale Setup
      var colorScale;
      var colorScaleMode = config.colorScaleMode || "quantile";
      if (colorScaleMode === "quantile" && allValues.length > 0) {
        colorScale = d3.scaleQuantile()
          .domain(allValues.filter(function (v) { return v > 0; }))
          .range(scaleColors);
      } else if (colorScaleMode === "log" && maxVal > 0) {
        colorScale = d3.scaleLog()
          .domain([Math.max(1, minVal), maxVal])
          .range([scaleColors[0], scaleColors[scaleColors.length - 1]]);
      } else {
        colorScale = d3.scaleLinear()
          .domain(d3.ticks(0, maxVal, scaleColors.length))
          .range(scaleColors);
      }

      // Daypart Grouping Scheme
      var presetKey = config.daypartPreset || "nielsen";
      var dayparts = DAYPART_DEFINITIONS[presetKey] || DAYPART_DEFINITIONS.nielsen;

      // Compute Daypart aggregated stats
      var daypartStats = dayparts.map(function (dp) {
        var dpSum = 0;
        var dpWeekday = 0;
        var dpWeekend = 0;
        var dpPeakVal = -1;
        var dpPeakDay = "-";
        var dpPeakHour = 0;

        daysConfig.forEach(function (d) {
          dp.hours.forEach(function (h) {
            var v = matrix[d.key][h];
            dpSum += v;
            if (d.isWeekend) dpWeekend += v;
            else dpWeekday += v;

            if (v > dpPeakVal) {
              dpPeakVal = v;
              dpPeakDay = d.label;
              dpPeakHour = h;
            }
          });
        });

        var hourlyVelocity = dpSum / ((dp.hours.length * 7) || 1);
        var sharePct = totalVolume > 0 ? (dpSum / totalVolume) * 100 : 0;
        var weekdayVelocity = dpWeekday / ((dp.hours.length * 5) || 1);
        var weekendVelocity = dpWeekend / ((dp.hours.length * 2) || 1);
        var weekendIndex = weekdayVelocity > 0 ? (weekendVelocity / weekdayVelocity) * 100 : 100;
        var varianceVsBenchmark = benchmarkTarget > 0 ? ((hourlyVelocity - benchmarkTarget) / benchmarkTarget) * 100 : 0;

        return {
          id: dp.id,
          name: dp.name,
          desc: dp.desc,
          hours: dp.hours,
          color: dp.color,
          sum: dpSum,
          sharePct: sharePct,
          hourlyVelocity: hourlyVelocity,
          peakVal: dpPeakVal,
          peakDay: dpPeakDay,
          peakHour: dpPeakHour,
          weekendIndex: weekendIndex,
          varianceVsBenchmark: varianceVsBenchmark
        };
      });

      // Daily Marginals
      var dayTotals = {};
      daysConfig.forEach(function (d) {
        var dSum = matrix[d.key].reduce(function (a, b) { return a + b; }, 0);
        dayTotals[d.key] = {
          sum: dSum,
          pctOfWeek: totalVolume > 0 ? (dSum / totalVolume) * 100 : 0
        };
      });

      // Hourly Marginals
      var hourTotals = new Array(24).fill(0);
      for (var h = 0; h < 24; h++) {
        daysConfig.forEach(function (d) {
          hourTotals[h] += matrix[d.key][h];
        });
      }
      var maxHourTotal = Math.max.apply(null, hourTotals) || 1;

      // Executive Scorecard HUD (Top Band)
      if (config.hudMode !== "hidden") {
        var hudElem = document.createElement("div");
        hudElem.className = "broadcast-hud";
        hudElem.style.display = config.hudMode === "compact_strip" ? "flex" : "grid";
        hudElem.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
        hudElem.style.alignItems = "center";
        hudElem.style.gap = "10px";
        hudElem.style.padding = config.hudMode === "compact_strip" ? "6px 14px" : "12px 16px";
        hudElem.style.background = theme.cardBg;
        hudElem.style.borderBottom = "1px solid " + theme.border;
        hudElem.style.marginBottom = "10px";

        var titleText = config.customTitleOverride || (activeMeasure.label + " Daypart Schedule");
        var subtitleText = config.customSubtitleOverride || ("7-Day x 24-Hour Broadcast Distribution • " + (dayDim.label || "Day") + " x " + (hourDim.label || "Hour"));

        if (config.hudMode === "compact_strip") {
          hudElem.innerHTML =
            '<div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">' +
              '<span style="font-size:12px; font-weight:700; color:' + theme.text + ';">' + titleText + '</span>' +
              '<span style="font-size:10px; color:' + theme.subtext + ';">Total: <strong>' + formatValue(totalVolume, config.valueFormat || "auto") + '</strong></span>' +
              '<span style="font-size:10px; color:' + theme.subtext + ';">Hourly Mean: <strong>' + formatValue(mean, config.valueFormat || "auto") + '</strong></span>' +
              '<span style="font-size:10px; color:' + (theme.isDark ? "#38bdf8" : "#0284c7") + ';">' + (config.referenceLineLabel || "Target") + ': <strong>' + formatValue(benchmarkTarget, config.valueFormat || "auto") + '</strong></span>' +
            '</div>';
        } else {
          // Full Scorecard
          var variancePct = benchmarkTarget > 0 ? ((mean - benchmarkTarget) / benchmarkTarget) * 100 : 0;
          var varianceSign = variancePct >= 0 ? "+" : "";
          var isPositive = config.metricPolarity === "lower_is_better" ? variancePct <= 0 : variancePct >= 0;
          var varColor = isPositive ? (theme.isDark ? "#34d399" : "#059669") : (theme.isDark ? "#f87171" : "#dc2626");

          hudElem.innerHTML =
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">' + titleText + '</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + formatValue(totalVolume, config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">' + subtitleText + '</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">Hourly Velocity</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + theme.text + ';">' + formatValue(mean, config.valueFormat || "auto") + '/hr</div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">Active Slots: ' + nonZeroCount + ' / 168</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">' + (config.referenceLineLabel || "Benchmark Target") + '</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + (theme.isDark ? "#38bdf8" : "#0284c7") + ';">' + formatValue(benchmarkTarget, config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; font-weight:700; color:' + varColor + ';">Variance: ' + varianceSign + variancePct.toFixed(1) + '%</div>' +
            '</div>' +
            '<div style="padding:8px 12px; border-radius:6px; background:' + theme.bg + '; border:1px solid ' + theme.border + ';">' +
              '<div style="font-size:10px; font-weight:600; text-transform:uppercase; color:' + theme.subtext + ';">Peak Slot Threshold</div>' +
              '<div style="font-size:16px; font-weight:800; color:' + (theme.isDark ? "#fbbf24" : "#b45309") + ';">★ &ge; ' + formatValue(peakThreshold, config.valueFormat || "auto") + '</div>' +
              '<div style="font-size:10px; color:' + theme.subtext + ';">P95 Anomaly Threshold</div>' +
            '</div>';
        }
        container.appendChild(hudElem);
      }

      // Slicing & Filter Toolbar
      if (config.showSearch !== false) {
        var toolbar = document.createElement("div");
        toolbar.className = "broadcast-toolbar";
        toolbar.style.display = "flex";
        toolbar.style.flexWrap = "wrap";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "10px";
        toolbar.style.padding = "8px 16px";
        toolbar.style.borderBottom = "1px solid " + theme.border;
        toolbar.style.background = theme.cardBg;

        var leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.alignItems = "center";
        leftGroup.style.gap = "10px";

        // Measure Switcher if multiple measures
        if (measures.length > 1) {
          var measSelect = document.createElement("select");
          measSelect.style.fontSize = "11.5px";
          measSelect.style.padding = "4px 8px";
          measSelect.style.borderRadius = "5px";
          measSelect.style.border = "1px solid " + theme.border;
          measSelect.style.background = theme.bg;
          measSelect.style.color = theme.text;
          measSelect.style.cursor = "pointer";

          measures.forEach(function (m, idx) {
            var opt = document.createElement("option");
            opt.value = idx;
            opt.text = "Metric: " + m.label;
            if (m.name === activeMeasure.name) opt.selected = true;
            measSelect.appendChild(opt);
          });
          measSelect.onchange = function (e) {
            self._selectedMeasureIndex = parseInt(e.target.value, 10);
            self._renderChart(d3, data, config, queryResponse);
          };
          leftGroup.appendChild(measSelect);
        }

        toolbar.appendChild(leftGroup);

        var rightGroup = document.createElement("div");
        rightGroup.style.display = "flex";
        rightGroup.style.alignItems = "center";
        rightGroup.style.gap = "12px";

        // Dimension Slicer Dropdown
        if (sliceDim && sliceValues.length > 2) {
          var sliceLabel = document.createElement("label");
          sliceLabel.style.fontSize = "11.5px";
          sliceLabel.style.color = theme.subtext;
          sliceLabel.innerText = sliceDim.label + ": ";

          var sliceSelect = document.createElement("select");
          sliceSelect.style.fontSize = "11.5px";
          sliceSelect.style.padding = "4px 8px";
          sliceSelect.style.borderRadius = "5px";
          sliceSelect.style.border = "1px solid " + theme.border;
          sliceSelect.style.background = theme.bg;
          sliceSelect.style.color = theme.text;
          sliceSelect.style.cursor = "pointer";

          sliceValues.forEach(function (val) {
            var opt = document.createElement("option");
            opt.value = val;
            opt.text = val === "ALL" ? "All " + sliceDim.label + "s Consolidated" : val;
            if (val === self._selectedSlice) opt.selected = true;
            sliceSelect.appendChild(opt);
          });
          sliceSelect.onchange = function (e) {
            self._selectedSlice = e.target.value;
            self._renderChart(d3, data, config, queryResponse);
          };
          sliceLabel.appendChild(sliceSelect);
          rightGroup.appendChild(sliceLabel);
        }

        toolbar.appendChild(rightGroup);
        container.appendChild(toolbar);
      }

      // Main Content Area
      var mainArea = document.createElement("div");
      mainArea.className = "broadcast-main-area";
      mainArea.style.padding = "16px";
      mainArea.style.boxSizing = "border-box";
      container.appendChild(mainArea);

      var viewMode = config.viewMode || "split_view";

      if (viewMode === "hourly_grid") {
        self._renderHourlyMatrix(d3, mainArea, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume, benchmarkTarget, fontMultiplier);
      } else if (viewMode === "daypart_blocks") {
        self._renderDaypartBlocks(mainArea, daypartStats, totalVolume, theme, config, activeMeasure, benchmarkTarget, fontMultiplier);
      } else if (viewMode === "diurnal_curves") {
        self._renderDiurnalCurves(d3, mainArea, matrix, daysConfig, dayparts, theme, config, activeMeasure, benchmarkTarget, fontMultiplier);
      } else {
        // SPLIT VIEW
        var topSection = document.createElement("div");
        topSection.style.marginBottom = "24px";
        mainArea.appendChild(topSection);

        self._renderHourlyMatrix(d3, topSection, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume, benchmarkTarget, fontMultiplier);

        var bottomSection = document.createElement("div");
        bottomSection.style.display = "grid";
        bottomSection.style.gridTemplateColumns = "repeat(auto-fit, minmax(360px, 1fr))";
        bottomSection.style.gap = "20px";
        bottomSection.style.marginTop = "16px";
        mainArea.appendChild(bottomSection);

        var daypartsCard = document.createElement("div");
        daypartsCard.style.padding = "16px";
        daypartsCard.style.borderRadius = "8px";
        daypartsCard.style.border = "1px solid " + theme.border;
        daypartsCard.style.background = theme.cardBg;
        var dpTitle = document.createElement("div");
        dpTitle.style.fontSize = (13 * fontMultiplier) + "px";
        dpTitle.style.fontWeight = "700";
        dpTitle.style.marginBottom = "12px";
        dpTitle.style.color = theme.text;
        dpTitle.innerHTML = "🎯 Broadcast Daypart Performance Breakdown";
        daypartsCard.appendChild(dpTitle);
        self._renderDaypartBlocks(daypartsCard, daypartStats, totalVolume, theme, config, activeMeasure, benchmarkTarget, fontMultiplier);
        bottomSection.appendChild(daypartsCard);

        var diurnalCard = document.createElement("div");
        diurnalCard.style.padding = "16px";
        diurnalCard.style.borderRadius = "8px";
        diurnalCard.style.border = "1px solid " + theme.border;
        diurnalCard.style.background = theme.cardBg;
        var curveTitle = document.createElement("div");
        curveTitle.style.fontSize = (13 * fontMultiplier) + "px";
        curveTitle.style.fontWeight = "700";
        curveTitle.style.marginBottom = "12px";
        curveTitle.style.color = theme.text;
        curveTitle.innerHTML = "📈 24-Hour Diurnal Progression Curves";
        diurnalCard.appendChild(curveTitle);
        self._renderDiurnalCurves(d3, diurnalCard, matrix, daysConfig, dayparts, theme, config, activeMeasure, benchmarkTarget, fontMultiplier);
        bottomSection.appendChild(diurnalCard);
      }
    },

    _renderHourlyMatrix: function (d3, targetElem, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume, benchmarkTarget, fontMultiplier) {
      var self = this;
      var showMarginals = config.showMarginals !== false;
      var showValues = config.showValueLabels !== "hidden";
      var peaksOnly = config.showValueLabels === "peaks_only";
      var cellRadius = config.cellRadius !== undefined ? config.cellRadius : 4;
      var spacing = config.cellSpacing !== undefined ? config.cellSpacing : 2;

      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.overflowX = "auto";
      targetElem.appendChild(wrap);

      var margin = { top: showMarginals ? 78 : 54, right: showMarginals ? 130 : 20, bottom: 20, left: 110 };
      var baseCellWidth = 38;
      var cellHeight = 36;
      var gridWidth = baseCellWidth * 24;
      var width = margin.left + gridWidth + margin.right;
      var height = margin.top + (cellHeight * 7) + margin.bottom;

      var svg = d3.select(wrap)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("font-family", "inherit");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Crosshair highlight overlay
      var rowHighlight = g.append("rect")
        .attr("class", "row-highlight")
        .attr("x", 0)
        .attr("width", gridWidth)
        .attr("height", cellHeight)
        .attr("fill", theme.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)")
        .attr("rx", cellRadius)
        .style("display", "none")
        .style("pointer-events", "none");

      var colHighlight = g.append("rect")
        .attr("class", "col-highlight")
        .attr("y", 0)
        .attr("width", baseCellWidth)
        .attr("height", cellHeight * 7)
        .attr("fill", theme.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)")
        .attr("rx", cellRadius)
        .style("display", "none")
        .style("pointer-events", "none");

      // Marginal Top Mini-Bars
      if (showMarginals) {
        var topBarsG = svg.append("g")
          .attr("transform", "translate(" + margin.left + ", 6)");

        for (var h = 0; h < 24; h++) {
          var barH = maxHourTotal > 0 ? (hourTotals[h] / maxHourTotal) * 22 : 0;
          var bx = h * baseCellWidth + spacing;
          var bw = baseCellWidth - (spacing * 2);

          topBarsG.append("rect")
            .attr("x", bx)
            .attr("y", 24 - barH)
            .attr("width", Math.max(1, bw))
            .attr("height", Math.max(1, barH))
            .attr("fill", theme.scale[Math.min(theme.scale.length - 1, 3)])
            .attr("rx", 2)
            .attr("opacity", 0.75);
        }
      }

      // Daypart Header Segments
      var daypartSegments = [];
      dayparts.forEach(function (dp) {
        var sortedHours = dp.hours.slice().sort(function (a, b) { return a - b; });
        var curStart = null;
        var curEnd = null;
        for (var i = 0; i < sortedHours.length; i++) {
          var hr = sortedHours[i];
          if (curStart === null) {
            curStart = hr;
            curEnd = hr;
          } else if (hr === curEnd + 1) {
            curEnd = hr;
          } else {
            daypartSegments.push({ dp: dp, start: curStart, end: curEnd });
            curStart = hr;
            curEnd = hr;
          }
        }
        if (curStart !== null) {
          daypartSegments.push({ dp: dp, start: curStart, end: curEnd });
        }
      });

      var daypartHeaderY = showMarginals ? 44 : 22;
      var daypartBarY = showMarginals ? 50 : 28;

      daypartSegments.forEach(function (seg) {
        var dp = seg.dp;
        var segX1 = seg.start * baseCellWidth;
        var segX2 = (seg.end + 1) * baseCellWidth;
        var segWidth = segX2 - segX1;
        var segCenter = segX1 + (segWidth / 2);

        svg.append("text")
          .attr("x", margin.left + segCenter)
          .attr("y", daypartHeaderY)
          .attr("text-anchor", "middle")
          .attr("font-size", segWidth < 60 ? "8px" : "9px")
          .attr("font-weight", "700")
          .attr("letter-spacing", "0.4px")
          .attr("fill", dp.color)
          .text(dp.name.toUpperCase());

        svg.append("rect")
          .attr("x", margin.left + segX1 + 2)
          .attr("y", daypartBarY)
          .attr("width", Math.max(2, segWidth - 4))
          .attr("height", 2.5)
          .attr("rx", 1.2)
          .attr("fill", dp.color)
          .attr("opacity", 0.7);

        if (segX1 > 0) {
          g.append("line")
            .attr("x1", segX1)
            .attr("y1", -20)
            .attr("x2", segX1)
            .attr("y2", cellHeight * 7 + 4)
            .attr("stroke", theme.dividerColor)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0.5);
        }
      });

      // Hour Labels
      for (var hrIdx = 0; hrIdx < 24; hrIdx++) {
        var hx = (hrIdx * baseCellWidth) + (baseCellWidth / 2);
        g.append("text")
          .attr("x", hx)
          .attr("y", -8)
          .attr("text-anchor", "middle")
          .attr("font-size", "9.5px")
          .attr("font-weight", "600")
          .attr("fill", theme.subtext)
          .text(getHourLabel(hrIdx, false));
      }

      // Day Rows and Heatmap Cells
      daysConfig.forEach(function (d, rowIdx) {
        var ry = rowIdx * cellHeight;

        var labelG = g.append("g")
          .attr("transform", "translate(-12," + (ry + (cellHeight / 2) + 4) + ")");

        labelG.append("text")
          .attr("text-anchor", "end")
          .attr("font-size", (12 * fontMultiplier) + "px")
          .attr("font-weight", d.isWeekend ? "700" : "600")
          .attr("fill", d.isWeekend ? (theme.isDark ? "#38bdf8" : "#0284c7") : theme.text)
          .text(d.label);

        if (d.isWeekend) {
          labelG.append("rect")
            .attr("x", -105)
            .attr("y", -11)
            .attr("width", 22)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("fill", theme.isDark ? "rgba(56,189,248,0.15)" : "#e0f2fe");

          labelG.append("text")
            .attr("x", -94)
            .attr("y", 0)
            .attr("text-anchor", "middle")
            .attr("font-size", "8.5px")
            .attr("font-weight", "700")
            .attr("fill", theme.isDark ? "#38bdf8" : "#0369a1")
            .text("WKND");
        }

        for (var h = 0; h < 24; h++) {
          var val = matrix[d.key][h];
          var cx = (h * baseCellWidth) + spacing;
          var cy = ry + spacing;
          var cw = baseCellWidth - (spacing * 2);
          var ch = cellHeight - (spacing * 2);

          var cellColor = val > 0 ? colorScale(val) : theme.emptyCell;
          var isPeak = val >= peakThreshold && val > 0 && config.highlightPeaks !== "none";

          var cellG = g.append("g")
            .attr("class", "cell-g")
            .style("cursor", "pointer");

          var cellRect = cellG.append("rect")
            .attr("x", cx)
            .attr("y", cy)
            .attr("width", cw)
            .attr("height", ch)
            .attr("rx", cellRadius)
            .attr("fill", cellColor)
            .attr("stroke", isPeak ? (theme.isDark ? "#fbbf24" : "#b45309") : "none")
            .attr("stroke-width", isPeak ? 1.5 : 0)
            .style("transition", "transform 0.1s ease, filter 0.1s ease");

          var shouldShowVal = showValues && (peaksOnly ? isPeak : val > 0);
          if (shouldShowVal && val > 0) {
            var textColor = getTextColorForBackground(cellColor);
            cellG.append("text")
              .attr("x", cx + (cw / 2))
              .attr("y", cy + (ch / 2) + 3.5)
              .attr("text-anchor", "middle")
              .attr("font-size", cw > 32 ? "9.5px" : "8px")
              .attr("font-weight", isPeak ? "700" : "500")
              .attr("fill", textColor)
              .style("pointer-events", "none")
              .text(formatValue(val, config.valueFormat || "auto"));
          }

          if (isPeak) {
            cellG.append("text")
              .attr("x", cx + cw - 3)
              .attr("y", cy + 8)
              .attr("text-anchor", "end")
              .attr("font-size", "8px")
              .attr("fill", theme.isDark ? "#fbbf24" : "#b45309")
              .style("pointer-events", "none")
              .text("★");
          }

          (function (dayObj, hourNum, cellVal, isPeakSlot) {
            var rawRow = cellRawRows[dayObj.key + "_" + hourNum];

            cellG.on("mouseenter", function (event) {
              rowHighlight.attr("y", ry).style("display", "block");
              colHighlight.attr("x", hourNum * baseCellWidth).style("display", "block");
              cellRect.attr("filter", "brightness(1.15)");

              var daypartInfo = null;
              dayparts.forEach(function (dp) {
                if (dp.hours.indexOf(hourNum) !== -1) daypartInfo = dp;
              });

              var daySum = dayTotals[dayObj.key] ? dayTotals[dayObj.key].sum : 0;
              var pctOfDay = daySum > 0 ? ((cellVal / daySum) * 100).toFixed(1) + "%" : "0%";
              var pctOfWeek = totalVolume > 0 ? ((cellVal / totalVolume) * 100).toFixed(1) + "%" : "0%";
              var deltaTarget = benchmarkTarget > 0 ? ((cellVal - benchmarkTarget) / benchmarkTarget) * 100 : 0;
              var deltaSign = deltaTarget >= 0 ? "+" : "";

              var tt = self._tooltip;
              tt.style.background = theme.isDark ? "#1e293b" : "#ffffff";
              tt.style.color = theme.text;
              tt.style.border = "1px solid " + (daypartInfo ? daypartInfo.color : theme.border);

              tt.innerHTML =
                '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; gap:12px;">' +
                  '<div><strong>' + dayObj.label + '</strong> &bull; ' + getHourLabel(hourNum, false) + ' - ' + getHourLabel((hourNum + 1) % 24, false) + '</div>' +
                  (daypartInfo ? '<span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:' + daypartInfo.color + '; color:#fff;">' + daypartInfo.name + '</span>' : '') +
                '</div>' +
                '<div style="font-size:15px; font-weight:700; color:' + (theme.isDark ? '#38bdf8' : '#0284c7') + '; margin-bottom:4px;">' +
                  activeMeasure.label + ': ' + formatValue(cellVal, config.valueFormat || "auto") +
                '</div>' +
                '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.4;">' +
                  'Day Share: <strong>' + pctOfDay + '</strong> &bull; Week Share: <strong>' + pctOfWeek + '</strong><br/>' +
                  'Vs ' + (config.referenceLineLabel || "Benchmark") + ': <strong>' + deltaSign + deltaTarget.toFixed(1) + '%</strong>' +
                  (isPeakSlot ? '<div style="color:' + (theme.isDark ? '#fbbf24' : '#b45309') + '; font-weight:700; margin-top:3px;">★ Peak Anomaly Slot</div>' : '') +
                  (rawRow && rawRow[activeMeasure.name] && rawRow[activeMeasure.name].links ? '<div style="margin-top:4px; color:#2563eb;">Click to drill down &rarr;</div>' : '') +
                '</div>';

              tt.style.display = "block";
              tt.style.opacity = "1";
            });

            cellG.on("mousemove", function (event) {
              var tt = self._tooltip;
              var x = event.clientX + 14;
              var y = event.clientY - 30;
              if (x + 240 > window.innerWidth) x = event.clientX - 250;
              if (y + 130 > window.innerHeight) y = event.clientY - 130;
              tt.style.left = x + "px";
              tt.style.top = y + "px";
            });

            cellG.on("mouseleave", function () {
              rowHighlight.style("display", "none");
              colHighlight.style("display", "none");
              cellRect.attr("filter", "none");
              self._tooltip.style.display = "none";
              self._tooltip.style.opacity = "0";
            });

            cellG.on("click", function (event) {
              if (rawRow && rawRow[activeMeasure.name] && rawRow[activeMeasure.name].links) {
                LookerCharts.Utils.openDrillMenu({
                  links: rawRow[activeMeasure.name].links,
                  event: event
                });
              }
            });
          })(d, h, val, isPeak);
        }

        if (showMarginals) {
          var dStat = dayTotals[d.key];
          var mx = gridWidth + 14;
          var my = ry + (cellHeight / 2) + 4;

          var pillG = g.append("g")
            .attr("transform", "translate(" + mx + "," + my + ")");

          pillG.append("text")
            .attr("font-size", (11.5 * fontMultiplier) + "px")
            .attr("font-weight", "700")
            .attr("fill", theme.text)
            .text(formatValue(dStat ? dStat.sum : 0, config.valueFormat || "auto"));

          pillG.append("text")
            .attr("x", 68)
            .attr("font-size", (10 * fontMultiplier) + "px")
            .attr("font-weight", "500")
            .attr("fill", theme.subtext)
            .text("(" + (dStat ? dStat.pctOfWeek.toFixed(1) : "0") + "%)");
        }
      });
    },

    _renderDaypartBlocks: function (targetElem, daypartStats, totalVolume, theme, config, activeMeasure, benchmarkTarget, fontMultiplier) {
      var grid = document.createElement("div");
      grid.className = "daypart-cards-grid";
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
      grid.style.gap = "12px";
      targetElem.appendChild(grid);

      daypartStats.forEach(function (dp) {
        var card = document.createElement("div");
        card.style.padding = "12px 14px";
        card.style.borderRadius = "8px";
        card.style.border = "1px solid " + theme.border;
        card.style.background = theme.bg;
        card.style.borderTop = "3px solid " + dp.color;
        card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";

        var deltaSign = dp.varianceVsBenchmark >= 0 ? "+" : "";
        var isPositive = config.metricPolarity === "lower_is_better" ? dp.varianceVsBenchmark <= 0 : dp.varianceVsBenchmark >= 0;
        var varColor = isPositive ? (theme.isDark ? "#34d399" : "#059669") : (theme.isDark ? "#f87171" : "#dc2626");

        card.innerHTML =
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span style="font-size:' + (12 * fontMultiplier) + 'px; font-weight:700; color:' + theme.text + ';">' + dp.name + '</span>' +
            '<span style="font-size:' + (10 * fontMultiplier) + 'px; font-weight:600; color:' + theme.subtext + ';">' + dp.desc + '</span>' +
          '</div>' +
          '<div style="font-size:' + (18 * fontMultiplier) + 'px; font-weight:800; color:' + theme.text + '; margin-bottom:4px;">' +
            formatValue(dp.sum, config.valueFormat || "auto") +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">' +
            '<div style="flex:1; height:6px; background:' + theme.emptyCell + '; border-radius:3px; overflow:hidden;">' +
              '<div style="width:' + Math.min(100, dp.sharePct) + '%; height:100%; background:' + dp.color + '; border-radius:3px;"></div>' +
            '</div>' +
            '<span style="font-size:' + (11 * fontMultiplier) + 'px; font-weight:700; color:' + dp.color + ';">' + dp.sharePct.toFixed(1) + '%</span>' +
          '</div>' +
          '<div style="font-size:' + (10.5 * fontMultiplier) + 'px; color:' + theme.subtext + '; line-height:1.4;">' +
            '<div>Velocity: <strong>' + formatValue(dp.hourlyVelocity, config.valueFormat || "auto") + '/hr</strong></div>' +
            '<div>Peak Day: <strong>' + dp.peakDay + ' (' + getHourLabel(dp.peakHour, false) + ')</strong></div>' +
            '<div>Vs Benchmark: <strong style="color:' + varColor + ';">' + deltaSign + dp.varianceVsBenchmark.toFixed(1) + '%</strong></div>' +
            '<div>Weekend Index: <strong>' + dp.weekendIndex.toFixed(0) + '</strong> (' + (dp.weekendIndex >= 100 ? '▲ +' + (dp.weekendIndex - 100).toFixed(0) + '%' : '▼ -' + (100 - dp.weekendIndex).toFixed(0) + '%') + ')</div>' +
          '</div>';

        grid.appendChild(card);
      });
    },

    _renderDiurnalCurves: function (d3, targetElem, matrix, daysConfig, dayparts, theme, config, activeMeasure, benchmarkTarget, fontMultiplier) {
      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.height = "260px";
      targetElem.appendChild(wrap);

      var width = wrap.clientWidth || 480;
      var height = 240;
      var margin = { top: 20, right: 30, bottom: 30, left: 55 };

      var svg = d3.select(wrap)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("font-family", "inherit");

      var chartW = width - margin.left - margin.right;
      var chartH = height - margin.top - margin.bottom;

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleLinear().domain([0, 23]).range([0, chartW]);

      var maxCurveVal = 0;
      daysConfig.forEach(function (d) {
        for (var h = 0; h < 24; h++) {
          if (matrix[d.key][h] > maxCurveVal) maxCurveVal = matrix[d.key][h];
        }
      });
      var yScale = d3.scaleLinear().domain([0, maxCurveVal * 1.1 || 1]).range([chartH, 0]);

      // Shaded Daypart Background Bands
      dayparts.forEach(function (dp) {
        var minH = Math.min.apply(null, dp.hours);
        var maxH = Math.max.apply(null, dp.hours);
        var x1 = xScale(minH);
        var x2 = xScale(Math.min(23, maxH + 1));

        g.append("rect")
          .attr("x", x1)
          .attr("y", 0)
          .attr("width", Math.max(1, x2 - x1))
          .attr("height", chartH)
          .attr("fill", dp.color)
          .attr("opacity", theme.isDark ? 0.08 : 0.04);

        g.append("text")
          .attr("x", x1 + 4)
          .attr("y", 12)
          .attr("font-size", "8.5px")
          .attr("font-weight", "600")
          .attr("fill", dp.color)
          .attr("opacity", 0.7)
          .text(dp.name);
      });

      // Benchmark Target Line
      if (benchmarkTarget > 0 && benchmarkTarget <= maxCurveVal * 1.1) {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", chartW)
          .attr("y1", yScale(benchmarkTarget))
          .attr("y2", yScale(benchmarkTarget))
          .attr("stroke", theme.isDark ? "#38bdf8" : "#0284c7")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,3")
          .attr("opacity", 0.85);

        g.append("text")
          .attr("x", chartW - 4)
          .attr("y", yScale(benchmarkTarget) - 4)
          .attr("text-anchor", "end")
          .attr("font-size", "8.5px")
          .attr("font-weight", "700")
          .attr("fill", theme.isDark ? "#38bdf8" : "#0284c7")
          .text((config.referenceLineLabel || "Target") + ": " + formatValue(benchmarkTarget, config.valueFormat || "auto"));
      }

      // Grid Lines
      g.append("g")
        .attr("stroke", theme.grid)
        .attr("stroke-opacity", 0.6)
        .call(d3.axisLeft(yScale).ticks(4).tickSize(-chartW).tickFormat(""));

      // Axes
      var xAxis = d3.axisBottom(xScale)
        .ticks(8)
        .tickFormat(function (d) { return getHourLabel(d, false); });

      g.append("g")
        .attr("transform", "translate(0," + chartH + ")")
        .call(xAxis)
        .attr("color", theme.subtext)
        .selectAll("text")
        .attr("font-size", "9.5px");

      var yAxis = d3.axisLeft(yScale)
        .ticks(4)
        .tickFormat(function (d) { return formatValue(d, config.valueFormat || "auto"); });

      g.append("g")
        .call(yAxis)
        .attr("color", theme.subtext)
        .selectAll("text")
        .attr("font-size", "9.5px");

      var line = d3.line()
        .x(function (d, i) { return xScale(i); })
        .y(function (d) { return yScale(d); })
        .curve(d3.curveMonotoneX);

      var dayColors = [
        "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316"
      ];

      // Draw curves for each day
      daysConfig.forEach(function (d, idx) {
        var dayColor = dayColors[idx % dayColors.length];

        g.append("path")
          .datum(matrix[d.key])
          .attr("fill", "none")
          .attr("stroke", dayColor)
          .attr("stroke-width", d.isWeekend ? 2.5 : 1.5)
          .attr("stroke-dasharray", d.isWeekend ? "4,2" : "none")
          .attr("d", line)
          .attr("opacity", 0.85);
      });

      // Weekly Baseline Average Curve
      var avgHourly = [];
      for (var h = 0; h < 24; h++) {
        var sumH = 0;
        daysConfig.forEach(function (d) { sumH += matrix[d.key][h]; });
        avgHourly.push(sumH / (daysConfig.length || 1));
      }

      g.append("path")
        .datum(avgHourly)
        .attr("fill", "none")
        .attr("stroke", theme.text)
        .attr("stroke-width", 2.2)
        .attr("d", line)
        .attr("opacity", 0.95);
    }
  });
})();
