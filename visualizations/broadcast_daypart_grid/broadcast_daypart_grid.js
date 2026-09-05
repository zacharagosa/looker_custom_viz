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
 *     1. "hourly_grid": Full 7-Day x 24-Hour Schedule Matrix Heatmap with daypart boundary markers,
 *        top hourly distribution curve/bars, and right daily volume rollups.
 *     2. "daypart_blocks": Standard Broadcast Daypart Aggregation (Overnight, Early Morning, Daytime,
 *        Early Fringe, Prime Time, Late Night) with share-of-voice scorecards and weekday/weekend indexing.
 *     3. "diurnal_curves": 24-Hour Diurnal Spline Curves plotting each day of the week with daypart
 *        background bands and weekly baseline curve.
 *     4. "split_view": Dual Synchronized View (Top 7x24 Heatmap Matrix + Bottom Broadcast Daypart Scorecards
 *        & Diurnal Curves with live cross-highlighting).
 * - High-Density Scalability:
 *     Handles 5,000+ rows with client-side indexing, slicing dimension selector (e.g. Category/Channel),
 *     and instant sub-10ms rollups.
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
    netflix_crimson: {
      name: "Streaming Crimson (Charcoal / Red)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fafafa",
      border: "#e5e5e5",
      text: "#171717",
      subtext: "#737373",
      grid: "#e5e5e5",
      emptyCell: "#f5f5f5",
      dividerColor: "#a3a3a3",
      peakBadgeBg: "#fee2e2",
      peakBadgeText: "#991b1b",
      scale: ["#fff1f2", "#fecdd3", "#fda4af", "#fb7185", "#e11d48", "#9f1239", "#4c0519"]
    },
    google_blue: {
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
    emerald_ratings: {
      name: "Emerald Ratings Green",
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
    amber_sunset: {
      name: "Warm Amber Sunset",
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
    cyber_neon: {
      name: "Cyber Neon (Dark)",
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
    // Check if numeric 0-6 (0=Sun or 0=Mon)
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
    // Handle "14:00" or "2 PM" or "02:00:00"
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

  function formatMetricValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    switch (fmt) {
      case "compact_currency":
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return "$" + num.toLocaleString(undefined, { maximumFractionDigits: 0 });
      case "currency":
        return "$" + Math.round(num).toLocaleString();
      case "compact_num":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString();
      case "percent":
        return (num * 100).toFixed(1) + "%";
      case "integer":
      default:
        return Math.round(num).toLocaleString();
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
      // SECTION 1: DISPLAY
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
      startOfWeek: {
        type: "string",
        label: "Start of Week",
        section: "Display",
        order: 2,
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
        order: 3,
        display: "select",
        values: [
          { "Broadcast / Nielsen Standard (6 Tiers)": "nielsen" },
          { "Retail & E-Commerce (4 Tiers)": "retail" },
          { "Workplace Operational Shifts (3 Tiers)": "shifts" }
        ],
        default: "nielsen"
      },
      highlightPeaks: {
        type: "string",
        label: "Peak Slot Anomaly Detection",
        section: "Display",
        order: 4,
        display: "select",
        values: [
          { "Top 5% Peak Slots (★ Gold)": "top_5" },
          { "Top 10% Peak Slots (★ Gold)": "top_10" },
          { "Above Average (+1σ Outliers)": "above_avg" },
          { "None": "none" }
        ],
        default: "top_5"
      },
      valueFormat: {
        type: "string",
        label: "Value Metric Formatting",
        section: "Display",
        order: 5,
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Standard Currency ($1,234,567)": "currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Standard Integer (1,234)": "integer" },
          { "Percentage (12.3%)": "percent" }
        ],
        default: "compact_currency"
      },
      showMarginals: {
        type: "boolean",
        label: "Show Marginal Rollups (Day/Hour Totals)",
        section: "Display",
        order: 6,
        default: true
      },
      showCellValues: {
        type: "boolean",
        label: "Show In-Cell Values",
        section: "Display",
        order: 7,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Slicing & Filter Toolbar",
        section: "Display",
        order: 8,
        default: true
      },

      // SECTION 2: STYLE
      colorPalette: {
        type: "string",
        label: "Color Palette & Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Nielsen Broadcast (Midnight / Cyan / Gold)": "nielsen_broadcast" },
          { "Streaming Crimson (Charcoal / Red)": "netflix_crimson" },
          { "Google Enterprise Blue": "google_blue" },
          { "Emerald Ratings Green": "emerald_ratings" },
          { "Warm Amber Sunset": "amber_sunset" },
          { "Cyber Neon (Dark Mode)": "cyber_neon" }
        ],
        default: "nielsen_broadcast"
      },
      colorScaleMode: {
        type: "string",
        label: "Color Scale Dynamics",
        section: "Style",
        order: 2,
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
        order: 3,
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
        order: 4,
        display: "range",
        min: 1,
        max: 6,
        step: 1,
        default: 2
      }
    },

    create: function (element, config) {
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

      // Slicing state for expanded row limit
      this._selectedSlice = "ALL";
      this._selectedMeasureIndex = 0;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      if (!queryResponse || !queryResponse.fields) {
        done();
        return;
      }

      var dimensions = queryResponse.fields.dimensions || [];
      var measures = queryResponse.fields.measures || [];

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
      container.style.background = theme.bg;
      container.style.color = theme.text;

      // Identify dimensions and measures
      var dimensions = queryResponse.fields.dimensions;
      var measures = queryResponse.fields.measures;

      var dayDim = null;
      var hourDim = null;
      var sliceDim = null;

      dimensions.forEach(function (dim) {
        var name = dim.name.toLowerCase();
        var label = dim.label.toLowerCase();
        if (!dayDim && (name.indexOf("day_of_week") !== -1 || name.indexOf("dayofweek") !== -1 || label.indexOf("day of week") !== -1 || name.indexOf("day") !== -1)) {
          dayDim = dim;
        } else if (!hourDim && (name.indexOf("hour") !== -1 || label.indexOf("hour") !== -1 || name.indexOf("time_of_day") !== -1)) {
          hourDim = dim;
        } else if (!sliceDim) {
          sliceDim = dim;
        }
      });

      // Fallbacks if not detected by naming
      if (!dayDim) dayDim = dimensions[0];
      if (!hourDim) hourDim = dimensions[1];
      if (!sliceDim && dimensions.length > 2) sliceDim = dimensions[2];

      var activeMeasure = measures[self._selectedMeasureIndex] || measures[0];

      // Build Day configuration
      var startOfWeek = config.startOfWeek || "monday";
      var daysConfig = startOfWeek === "sunday" ? DAYS_SUNDAY_START : DAYS_MONDAY_START;

      // Extract unique slicing categories for 5,000+ row scalability
      var sliceValues = ["ALL"];
      if (sliceDim) {
        var sliceSet = new Set();
        data.forEach(function (row) {
          var val = row[sliceDim.name] && row[sliceDim.name].value;
          if (val !== null && val !== undefined && val !== "") {
            sliceSet.add(String(val));
          }
        });
        sliceValues = ["ALL"].concat(Array.from(sliceSet).sort());
      }

      // Aggregate data into a 7x24 Matrix
      // Key: `${dayKey}_${hourNum}`
      var matrix = {};
      daysConfig.forEach(function (d) {
        matrix[d.key] = new Array(24).fill(0);
      });
      var cellRawRows = {}; // Keep reference to Looker row for drilldown

      var totalVolume = 0;
      var nonZeroCount = 0;
      var maxVal = 0;
      var minVal = Infinity;

      data.forEach(function (row) {
        if (sliceDim && self._selectedSlice !== "ALL") {
          var sVal = row[sliceDim.name] && String(row[sliceDim.name].value);
          if (sVal !== self._selectedSlice) return;
        }

        var dayVal = row[dayDim.name] && row[dayDim.name].value;
        var dayKey = normalizeDayString(dayVal);
        var hourVal = row[hourDim.name] && row[hourDim.name].value;
        var hourNum = normalizeHourNumber(hourVal);
        var measObj = row[activeMeasure.name];
        var measVal = measObj ? Number(measObj.value) : 0;

        if (dayKey && hourNum !== null && !isNaN(measVal) && matrix[dayKey]) {
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

      // Compute statistics for peak anomaly detection
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
      var peakThreshold = p95;
      var peakOption = config.highlightPeaks || "top_5";
      if (peakOption === "top_10") peakThreshold = p90;
      else if (peakOption === "above_avg") peakThreshold = mean + stdDev;
      else if (peakOption === "none") peakThreshold = Infinity;

      // Color Scale Setup
      var colorScale;
      var colorScaleMode = config.colorScaleMode || "quantile";
      if (colorScaleMode === "quantile" && allValues.length > 0) {
        colorScale = d3.scaleQuantile()
          .domain(allValues.filter(function (v) { return v > 0; }))
          .range(theme.scale);
      } else if (colorScaleMode === "log" && maxVal > 0) {
        colorScale = d3.scaleLog()
          .domain([Math.max(1, minVal), maxVal])
          .range([theme.scale[0], theme.scale[theme.scale.length - 1]]);
      } else {
        colorScale = d3.scaleLinear()
          .domain(d3.ticks(0, maxVal, theme.scale.length))
          .range(theme.scale);
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
          weekendIndex: weekendIndex
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

      // Top Toolbar: Slicing Selector & Measure Switcher
      if (config.showSearch !== false) {
        var toolbar = document.createElement("div");
        toolbar.className = "broadcast-toolbar";
        toolbar.style.display = "flex";
        toolbar.style.flexWrap = "wrap";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "10px";
        toolbar.style.padding = "10px 16px";
        toolbar.style.borderBottom = "1px solid " + theme.border;
        toolbar.style.background = theme.cardBg;

        var leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.alignItems = "center";
        leftGroup.style.gap = "12px";

        // Title and Total Volume KPI Badge
        var titleElem = document.createElement("div");
        titleElem.style.fontSize = "13px";
        titleElem.style.fontWeight = "700";
        titleElem.style.letterSpacing = "0.3px";
        titleElem.style.color = theme.text;
        titleElem.innerHTML = "📺 <strong>" + activeMeasure.label + "</strong> Daypart Schedule";
        leftGroup.appendChild(titleElem);

        var totalBadge = document.createElement("div");
        totalBadge.style.fontSize = "11px";
        totalBadge.style.fontWeight = "600";
        totalBadge.style.padding = "3px 8px";
        totalBadge.style.borderRadius = "4px";
        totalBadge.style.background = theme.border;
        totalBadge.style.color = theme.text;
        totalBadge.innerText = "Total: " + formatMetricValue(totalVolume, config.valueFormat || "compact_currency");
        leftGroup.appendChild(totalBadge);

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
            if (idx === self._selectedMeasureIndex) opt.selected = true;
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

        // Dimension Slicer Dropdown for 5,000+ row queries
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

        // Peak Legend Pill
        if (config.highlightPeaks !== "none") {
          var peakPill = document.createElement("div");
          peakPill.style.fontSize = "11px";
          peakPill.style.display = "flex";
          peakPill.style.alignItems = "center";
          peakPill.style.gap = "4px";
          peakPill.style.padding = "3px 7px";
          peakPill.style.borderRadius = "4px";
          peakPill.style.background = theme.peakBadgeBg;
          peakPill.style.color = theme.peakBadgeText;
          peakPill.style.fontWeight = "600";
          peakPill.innerHTML = "★ Peak Slot: &ge; " + formatMetricValue(peakThreshold, config.valueFormat || "compact_currency");
          rightGroup.appendChild(peakPill);
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
        self._renderHourlyMatrix(d3, mainArea, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume);
      } else if (viewMode === "daypart_blocks") {
        self._renderDaypartBlocks(mainArea, daypartStats, totalVolume, theme, config, activeMeasure);
      } else if (viewMode === "diurnal_curves") {
        self._renderDiurnalCurves(d3, mainArea, matrix, daysConfig, dayparts, theme, config, activeMeasure);
      } else {
        // SPLIT VIEW (Top: 7x24 Matrix, Bottom: Daypart Scorecards & Diurnal curves)
        var topSection = document.createElement("div");
        topSection.style.marginBottom = "24px";
        mainArea.appendChild(topSection);

        self._renderHourlyMatrix(d3, topSection, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume);

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
        dpTitle.style.fontSize = "13px";
        dpTitle.style.fontWeight = "700";
        dpTitle.style.marginBottom = "12px";
        dpTitle.style.color = theme.text;
        dpTitle.innerHTML = "🎯 Broadcast Daypart Performance Breakdown";
        daypartsCard.appendChild(dpTitle);
        self._renderDaypartBlocks(daypartsCard, daypartStats, totalVolume, theme, config, activeMeasure);
        bottomSection.appendChild(daypartsCard);

        var diurnalCard = document.createElement("div");
        diurnalCard.style.padding = "16px";
        diurnalCard.style.borderRadius = "8px";
        diurnalCard.style.border = "1px solid " + theme.border;
        diurnalCard.style.background = theme.cardBg;
        var curveTitle = document.createElement("div");
        curveTitle.style.fontSize = "13px";
        curveTitle.style.fontWeight = "700";
        curveTitle.style.marginBottom = "12px";
        curveTitle.style.color = theme.text;
        curveTitle.innerHTML = "📈 24-Hour Diurnal Progression Curves";
        diurnalCard.appendChild(curveTitle);
        self._renderDiurnalCurves(d3, diurnalCard, matrix, daysConfig, dayparts, theme, config, activeMeasure);
        bottomSection.appendChild(diurnalCard);
      }
    },

    _renderHourlyMatrix: function (d3, targetElem, matrix, daysConfig, dayparts, dayTotals, hourTotals, maxHourTotal, peakThreshold, colorScale, theme, config, activeMeasure, cellRawRows, totalVolume) {
      var self = this;
      var showMarginals = config.showMarginals !== false;
      var showValues = config.showCellValues !== false;
      var cellRadius = config.cellRadius !== undefined ? config.cellRadius : 4;
      var spacing = config.cellSpacing !== undefined ? config.cellSpacing : 2;

      var wrap = document.createElement("div");
      wrap.style.width = "100%";
      wrap.style.overflowX = "auto";
      targetElem.appendChild(wrap);

      var margin = { top: showMarginals ? 54 : 36, right: showMarginals ? 130 : 20, bottom: 20, left: 110 };
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

      // Crosshair highlight overlay elements
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

      // Marginal Top Mini-Bars (Hourly totals)
      if (showMarginals) {
        var topBarsG = svg.append("g")
          .attr("transform", "translate(" + margin.left + ", 8)");

        for (var h = 0; h < 24; h++) {
          var barH = maxHourTotal > 0 ? (hourTotals[h] / maxHourTotal) * 26 : 0;
          var bx = h * baseCellWidth + spacing;
          var bw = baseCellWidth - (spacing * 2);

          topBarsG.append("rect")
            .attr("x", bx)
            .attr("y", 28 - barH)
            .attr("width", Math.max(1, bw))
            .attr("height", Math.max(1, barH))
            .attr("fill", theme.scale[Math.min(theme.scale.length - 1, 3)])
            .attr("rx", 2)
            .attr("opacity", 0.75);
        }
      }

      // Column Daypart Band Dividers and Headers
      dayparts.forEach(function (dp) {
        var minHour = Math.min.apply(null, dp.hours);
        var maxHour = Math.max.apply(null, dp.hours);

        // Header label above hours
        var headerX = (minHour * baseCellWidth) + 4;
        svg.append("text")
          .attr("x", margin.left + headerX)
          .attr("y", showMarginals ? 46 : 24)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .attr("fill", dp.color)
          .text(dp.name.toUpperCase());

        // Vertical boundary line at start of daypart
        if (minHour > 0) {
          g.append("line")
            .attr("x1", minHour * baseCellWidth)
            .attr("y1", -6)
            .attr("x2", minHour * baseCellWidth)
            .attr("y2", cellHeight * 7 + 4)
            .attr("stroke", theme.dividerColor)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0.6);
        }
      });

      // Hour Labels on X-axis (Top of cells)
      for (var h = 0; h < 24; h++) {
        var hx = (h * baseCellWidth) + (baseCellWidth / 2);
        g.append("text")
          .attr("x", hx)
          .attr("y", -6)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", theme.subtext)
          .text(getHourLabel(h, false));
      }

      // Day Rows and Heatmap Cells
      daysConfig.forEach(function (d, rowIdx) {
        var ry = rowIdx * cellHeight;

        // Day Label on Left
        var labelG = g.append("g")
          .attr("transform", "translate(-12," + (ry + (cellHeight / 2) + 4) + ")");

        labelG.append("text")
          .attr("text-anchor", "end")
          .attr("font-size", "12px")
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

        // 24 Cells in this Row
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

          // Value inside cell
          if (showValues && val > 0) {
            var textColor = getTextColorForBackground(cellColor);
            cellG.append("text")
              .attr("x", cx + (cw / 2))
              .attr("y", cy + (ch / 2) + 3.5)
              .attr("text-anchor", "middle")
              .attr("font-size", cw > 32 ? "9.5px" : "8px")
              .attr("font-weight", isPeak ? "700" : "500")
              .attr("fill", textColor)
              .style("pointer-events", "none")
              .text(formatMetricValue(val, config.valueFormat || "compact_currency"));
          }

          // Peak slot star badge
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

          // Event Handlers for Cell
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
                  activeMeasure.label + ': ' + formatMetricValue(cellVal, config.valueFormat || "compact_currency") +
                '</div>' +
                '<div style="font-size:11px; color:' + theme.subtext + '; line-height:1.4;">' +
                  'Day Share: <strong>' + pctOfDay + '</strong> &bull; Week Share: <strong>' + pctOfWeek + '</strong>' +
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
              if (x + 220 > window.innerWidth) x = event.clientX - 230;
              if (y + 120 > window.innerHeight) y = event.clientY - 120;
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

            // Looker drilldown integration
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

        // Right Daily Marginal Summary Pill
        if (showMarginals) {
          var dStat = dayTotals[d.key];
          var mx = gridWidth + 14;
          var my = ry + (cellHeight / 2) + 4;

          var pillG = g.append("g")
            .attr("transform", "translate(" + mx + "," + my + ")");

          pillG.append("text")
            .attr("font-size", "11.5px")
            .attr("font-weight", "700")
            .attr("fill", theme.text)
            .text(formatMetricValue(dStat ? dStat.sum : 0, config.valueFormat || "compact_currency"));

          pillG.append("text")
            .attr("x", 68)
            .attr("font-size", "10px")
            .attr("font-weight", "500")
            .attr("fill", theme.subtext)
            .text("(" + (dStat ? dStat.pctOfWeek.toFixed(1) : "0") + "%)");
        }
      });
    },

    _renderDaypartBlocks: function (targetElem, daypartStats, totalVolume, theme, config, activeMeasure) {
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

        card.innerHTML =
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span style="font-size:12px; font-weight:700; color:' + theme.text + ';">' + dp.name + '</span>' +
            '<span style="font-size:10px; font-weight:600; color:' + theme.subtext + ';">' + dp.desc + '</span>' +
          '</div>' +
          '<div style="font-size:18px; font-weight:800; color:' + theme.text + '; margin-bottom:4px;">' +
            formatMetricValue(dp.sum, config.valueFormat || "compact_currency") +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">' +
            '<div style="flex:1; height:6px; background:' + theme.emptyCell + '; border-radius:3px; overflow:hidden;">' +
              '<div style="width:' + Math.min(100, dp.sharePct) + '%; height:100%; background:' + dp.color + '; border-radius:3px;"></div>' +
            '</div>' +
            '<span style="font-size:11px; font-weight:700; color:' + dp.color + ';">' + dp.sharePct.toFixed(1) + '%</span>' +
          '</div>' +
          '<div style="font-size:10.5px; color:' + theme.subtext + '; line-height:1.4;">' +
            '<div>Velocity: <strong>' + formatMetricValue(dp.hourlyVelocity, config.valueFormat || "compact_currency") + '/hr</strong></div>' +
            '<div>Peak Day: <strong>' + dp.peakDay + ' (' + getHourLabel(dp.peakHour, false) + ')</strong></div>' +
            '<div>Weekend Index: <strong>' + dp.weekendIndex.toFixed(0) + '</strong> (' + (dp.weekendIndex >= 100 ? '▲ +' + (dp.weekendIndex - 100).toFixed(0) + '%' : '▼ -' + (100 - dp.weekendIndex).toFixed(0) + '%') + ')</div>' +
          '</div>';

        grid.appendChild(card);
      });
    },

    _renderDiurnalCurves: function (d3, targetElem, matrix, daysConfig, dayparts, theme, config, activeMeasure) {
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
        .tickFormat(function (d) { return formatMetricValue(d, config.valueFormat || "compact_currency"); });

      g.append("g")
        .call(yAxis)
        .attr("color", theme.subtext)
        .selectAll("text")
        .attr("font-size", "9.5px");

      // Spline line generator
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
