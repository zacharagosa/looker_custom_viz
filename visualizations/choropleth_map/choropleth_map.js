/**
 * Interactive US Choropleth Map - Looker Custom Visualization
 * Built with D3.js v7 & TopoJSON Client
 *
 * Upgraded Flexibility Edition:
 * - Multi-Modal Geospatial Analytics: Choropleth filled polygons, Proportional Bubble Pins, or Hybrid
 * - Dynamic Field-Role Mapping (Display tab): 1-based index or name overrides for State dimension and Measures
 * - Reference Benchmarks, Targets & Anomaly Alerts (Display tab): Mean, Median, P75/P90, Fixed Goal, or Secondary Measure
 * - Sorting, Top-N Bucketing & Null Suppression (Display tab): Metric Desc/Asc, Alphabetical, Top-N with Other rollup
 * - Executive Scorecard HUD & Search Filter (Display tab): Full Scorecard, Compact Strip, or Hidden; Search bar
 * - Enterprise Brand Palettes & Metric Polarity (Style tab): Google Enterprise, Executive Slate, Modern Slate,
 *   Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse Healthcare, Thermal Heat, and Custom Hex Overrides
 * - Debounced ResizeObserver (<4px guard), proper container bounds, Looker drill-down menu support
 */

(function () {
  var US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  var STATE_LOOKUP = {
    "AL": { name: "Alabama", fips: "01" },
    "AK": { name: "Alaska", fips: "02" },
    "AZ": { name: "Arizona", fips: "04" },
    "AR": { name: "Arkansas", fips: "05" },
    "CA": { name: "California", fips: "06" },
    "CO": { name: "Colorado", fips: "08" },
    "CT": { name: "Connecticut", fips: "09" },
    "DE": { name: "Delaware", fips: "10" },
    "DC": { name: "District of Columbia", fips: "11" },
    "FL": { name: "Florida", fips: "12" },
    "GA": { name: "Georgia", fips: "13" },
    "HI": { name: "Hawaii", fips: "15" },
    "ID": { name: "Idaho", fips: "16" },
    "IL": { name: "Illinois", fips: "17" },
    "IN": { name: "Indiana", fips: "18" },
    "IA": { name: "Iowa", fips: "19" },
    "KS": { name: "Kansas", fips: "20" },
    "KY": { name: "Kentucky", fips: "21" },
    "LA": { name: "Louisiana", fips: "22" },
    "ME": { name: "Maine", fips: "23" },
    "MD": { name: "Maryland", fips: "24" },
    "MA": { name: "Massachusetts", fips: "25" },
    "MI": { name: "Michigan", fips: "26" },
    "MN": { name: "Minnesota", fips: "27" },
    "MS": { name: "Mississippi", fips: "28" },
    "MO": { name: "Missouri", fips: "29" },
    "MT": { name: "Montana", fips: "30" },
    "NE": { name: "Nebraska", fips: "31" },
    "NV": { name: "Nevada", fips: "32" },
    "NH": { name: "New Hampshire", fips: "33" },
    "NJ": { name: "New Jersey", fips: "34" },
    "NM": { name: "New Mexico", fips: "35" },
    "NY": { name: "New York", fips: "36" },
    "NC": { name: "North Carolina", fips: "37" },
    "ND": { name: "North Dakota", fips: "38" },
    "OH": { name: "Ohio", fips: "39" },
    "OK": { name: "Oklahoma", fips: "40" },
    "OR": { name: "Oregon", fips: "41" },
    "PA": { name: "Pennsylvania", fips: "42" },
    "RI": { name: "Rhode Island", fips: "44" },
    "SC": { name: "South Carolina", fips: "45" },
    "SD": { name: "South Dakota", fips: "46" },
    "TN": { name: "Tennessee", fips: "47" },
    "TX": { name: "Texas", fips: "48" },
    "UT": { name: "Utah", fips: "49" },
    "VT": { name: "Vermont", fips: "50" },
    "VA": { name: "Virginia", fips: "51" },
    "WA": { name: "Washington", fips: "53" },
    "WV": { name: "West Virginia", fips: "54" },
    "WI": { name: "Wisconsin", fips: "55" },
    "WY": { name: "Wyoming", fips: "56" }
  };

  var NAME_TO_CODE = {};
  var FIPS_TO_CODE = {};
  Object.keys(STATE_LOOKUP).forEach(function (code) {
    var item = STATE_LOOKUP[code];
    NAME_TO_CODE[item.name.toLowerCase()] = code;
    FIPS_TO_CODE[item.fips] = code;
    FIPS_TO_CODE[String(parseInt(item.fips, 10))] = code;
  });

  function resolveStateCode(input) {
    if (!input) return null;
    var str = String(input).trim();
    var upper = str.toUpperCase();
    if (STATE_LOOKUP[upper]) return upper;
    var lower = str.toLowerCase();
    if (NAME_TO_CODE[lower]) return NAME_TO_CODE[lower];
    if (FIPS_TO_CODE[str]) return FIPS_TO_CODE[str];
    return null;
  }

  function ensureDependencies(callback) {
    var hasD3 = window.d3 && typeof window.d3.geoPath === "function";
    var hasTopo = window.topojson && typeof window.topojson.feature === "function";

    if (hasD3 && hasTopo) {
      callback(window.d3, window.topojson);
      return;
    }

    var pending = 0;
    function checkDone() {
      pending--;
      if (pending <= 0) {
        callback(window.d3, window.topojson);
      }
    }

    if (!hasD3) {
      pending++;
      var s1 = document.createElement("script");
      s1.src = "https://d3js.org/d3.v7.min.js";
      s1.onload = checkDone;
      document.head.appendChild(s1);
    }

    if (!hasTopo) {
      pending++;
      var s2 = document.createElement("script");
      s2.src = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js";
      s2.onload = checkDone;
      document.head.appendChild(s2);
    }
  }

  var cachedTopoJSON = null;
  function fetchUSGeoJSON(topojsonLib, callback) {
    if (cachedTopoJSON) {
      callback(cachedTopoJSON);
      return;
    }
    fetch(US_TOPOJSON_URL)
      .then(function (res) { return res.json(); })
      .then(function (us) {
        var geo = topojsonLib.feature(us, us.objects.states);
        cachedTopoJSON = geo;
        callback(geo);
      })
      .catch(function (err) {
        console.error("Failed to load US Atlas TopoJSON:", err);
        callback(null);
      });
  }

  var THEMES = {
    google_blue: {
      name: "Google Enterprise",
      range: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#ffffff",
      hoverStroke: "#1a73e8",
      bubbleStroke: "#1a73e8",
      bubbleFill: "rgba(26, 115, 232, 0.75)",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      positive: "#34a853",
      negative: "#ea4335"
    },
    executive_slate: {
      name: "Executive Slate (Classic Few)",
      range: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#475569", "#0f172a"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#ffffff",
      hoverStroke: "#0f172a",
      bubbleStroke: "#1e293b",
      bubbleFill: "rgba(15, 23, 42, 0.75)",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444"
    },
    modern_slate: {
      name: "Modern Slate",
      range: ["#e2e8f0", "#94a3b8", "#64748b", "#334155", "#0f172a"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#ffffff",
      hoverStroke: "#2563eb",
      bubbleStroke: "#2563eb",
      bubbleFill: "rgba(37, 99, 235, 0.75)",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#10b981",
      negative: "#f43f5e"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      range: ["#1e293b", "#0369a1", "#0284c7", "#38bdf8", "#7dd3fc"],
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#0f172a",
      hoverStroke: "#38bdf8",
      bubbleStroke: "#38bdf8",
      bubbleFill: "rgba(56, 189, 248, 0.75)",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      positive: "#10b981",
      negative: "#f43f5e"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      range: ["#e6f4ea", "#a8dab5", "#5bb974", "#1e8e3e", "#0d652d"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#ffffff",
      hoverStroke: "#059669",
      bubbleStroke: "#059669",
      bubbleFill: "rgba(5, 150, 105, 0.75)",
      cardBg: "#f0fdf4",
      cardBorder: "#a7f3d0",
      positive: "#059669",
      negative: "#dc2626"
    },
    sunset_media: {
      name: "Sunset Media",
      range: ["#ffedd5", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#ffffff",
      hoverStroke: "#c2410c",
      bubbleStroke: "#ea580c",
      bubbleFill: "rgba(234, 88, 12, 0.75)",
      cardBg: "#fffbeb",
      cardBorder: "#fde68a",
      positive: "#059669",
      negative: "#dc2626"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      range: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#ffffff",
      hoverStroke: "#2563eb",
      bubbleStroke: "#1e3a8a",
      bubbleFill: "rgba(30, 58, 138, 0.75)",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#006B40",
      negative: "#B42318"
    },
    thermal_heat: {
      name: "Thermal Heat",
      range: ["#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#ffffff",
      hoverStroke: "#ea580c",
      bubbleStroke: "#c2410c",
      bubbleFill: "rgba(234, 88, 12, 0.75)",
      cardBg: "#fff7ed",
      cardBorder: "#fed7aa",
      positive: "#10b981",
      negative: "#b91c1c"
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
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percent":
      case "percentage":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      case "full_number":
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function formatDelta(delta, deltaPct, fmt) {
    var deltaSign = delta > 0 ? "+" : delta < 0 ? "-" : "";
    var formattedVal = formatValue(Math.abs(delta), fmt);
    var pctSign = deltaPct > 0 ? "+" : deltaPct < 0 ? "-" : "";
    var pctStr = pctSign + (Math.abs(deltaPct) * 100).toFixed(1) + "%";
    return deltaSign + formattedVal + " (" + pctStr + ")";
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, themeKey, isDark) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "120px";
    card.style.padding = "8px 12px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : "#ffffff";
    card.style.border = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = "10.5px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = "17px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = "11px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "choropleth_map",
    label: "Interactive US Choropleth Map",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      mapMode: {
        type: "string",
        label: "Map Display Mode",
        display: "select",
        values: [
          { "Choropleth Filled Polygons": "choropleth" },
          { "Proportional Bubble Pins": "bubble_pins" },
          { "Hybrid (Choropleth + Proportional Pins)": "both_hybrid" }
        ],
        default: "choropleth",
        section: "Display",
        order: 1
      },
      stateFieldOverride: {
        type: "string",
        label: "State Dimension Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 2
      },
      measureFieldOverride: {
        type: "string",
        label: "Primary Metric Measure Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 3
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary / Target Measure Index or Name (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 4
      },
      targetCalculationMode: {
        type: "string",
        label: "Target / Benchmark Calculation Mode",
        display: "select",
        values: [
          { "None (No Target Benchmark)": "none" },
          { "Secondary Measure Column": "second_measure" },
          { "Multiplier of Baseline (e.g. 115%)": "multiplier" },
          { "Fixed Static Target Value": "fixed" },
          { "Dataset Mean (Average of Territories)": "dataset_mean" },
          { "Dataset Median (Median of Territories)": "dataset_median" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 5
      },
      targetMultiplier: {
        type: "number",
        label: "Target Multiplier (when Mode is Multiplier)",
        default: 1.15,
        section: "Display",
        order: 6
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Value (when Mode is Fixed, 0 = Auto)",
        default: 0,
        section: "Display",
        order: 7
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark / Target Label",
        default: "National Benchmark",
        section: "Display",
        order: 8
      },
      showReferenceLine: {
        type: "boolean",
        label: "Show Benchmark Target in HUD & Tooltips",
        default: true,
        section: "Display",
        order: 9
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Variance Anomaly Alert Threshold (%)",
        default: 30,
        section: "Display",
        order: 10
      },
      sortBy: {
        type: "string",
        label: "Sort Territories By",
        display: "select",
        values: [
          { "Default (Looker Query Order)": "none" },
          { "Metric Value Descending": "metric_desc" },
          { "Metric Value Ascending": "metric_asc" },
          { "State Name (Alphabetical A-Z)": "state_asc" },
          { "Variance vs Target Descending": "variance_desc" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 11
      },
      topNLimit: {
        type: "number",
        label: "Top-N Territories Limit (0 = All, Max 50)",
        default: 0,
        section: "Display",
        order: 12
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into Other Rollup Summary",
        default: false,
        section: "Display",
        order: 13
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Territories",
        default: false,
        section: "Display",
        order: 14
      },
      aggregationType: {
        type: "string",
        label: "High-Density Client-Side Aggregation",
        display: "select",
        values: [
          { "Sum (Aggregate Total Value)": "sum" },
          { "Average (Mean Value per Record)": "avg" },
          { "Count (Total Records / Transactions)": "count" },
          { "Max (Peak Record per State)": "max" }
        ],
        default: "sum",
        section: "Display",
        order: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 16
      },
      labelDensity: {
        type: "string",
        label: "State Postal Code Labels",
        display: "select",
        values: [
          { "All States": "all" },
          { "Top / Bottom 5 Peaks Only": "peaks" },
          { "None / Hidden": "none" }
        ],
        default: "all",
        section: "Display",
        order: 17
      },
      customTitle: {
        type: "string",
        label: "Custom Map Title Override",
        default: "",
        section: "Display",
        order: 18
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive State Search Bar",
        default: true,
        section: "Display",
        order: 20
      },
      showLegend: {
        type: "boolean",
        label: "Show Gradient Legend Bar",
        default: true,
        section: "Display",
        order: 21
      },
      enableZoom: {
        type: "boolean",
        label: "Enable Pan & Zoom Navigation",
        default: true,
        section: "Display",
        order: 22
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_blue" },
          { "Executive Slate (Classic Few)": "executive_slate" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Thermal Heat": "thermal_heat" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_blue",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Scale High / Primary Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Goal Hex",
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
          { "Higher is Better (Revenue, Output, Conversion)": "higher_better" },
          { "Lower is Better (Latency, Churn, Cost, Defect)": "lower_better" }
        ],
        default: "higher_better",
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
        label: "Metric Display Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Full Currency ($1,240,000)": "full_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Full Number (1,240,000)": "full_number" },
          { "Percentage (12.4%)": "percent" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw (Unformatted)": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      colorScaleMode: {
        type: "string",
        label: "Color Scale Distribution",
        display: "select",
        values: [
          { "Quantile (Balanced Equal Counts)": "quantile" },
          { "Linear (Continuous Min-Max)": "linear" },
          { "Quantize (Equal Value Buckets)": "quantize" }
        ],
        default: "quantile",
        section: "Style",
        order: 8
      },
      nullColor: {
        type: "string",
        label: "No Data State Color",
        display: "color",
        default: "#f1f5f9",
        section: "Style",
        order: 9
      },
      highlightColor: {
        type: "string",
        label: "Hover Highlight Stroke Color",
        display: "color",
        default: "#f59e0b",
        section: "Style",
        order: 10
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      var container = document.createElement("div");
      container.className = "looker-choropleth-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "looker-choropleth-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "99999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.25)";
      tooltip.style.backdropFilter = "blur(8px)";
      document.body.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._element = element;
      this._searchTerm = "";
      this._setupResizeObserver(element);
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
      var self = this;
      this.clearErrors();

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

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no rows to visualize on the map."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var measures = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Choropleth Map requires 1 State Dimension (e.g. users.state, orders.shipping_state)."
        });
        done();
        return;
      }

      if (measures.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Choropleth Map requires at least 1 Measure (e.g. order_items.total_sale_price, users.count)."
        });
        done();
        return;
      }

      ensureDependencies(function (d3, topojson) {
        fetchUSGeoJSON(topojson, function (geoData) {
          if (!geoData) {
            self.addError({
              title: "Map TopoJSON Unavailable",
              message: "Unable to load US Geographic boundaries TopoJSON data."
            });
            done();
            return;
          }

          try {
            self._render(d3, geoData, data, element, config, queryResponse);
          } catch (err) {
            console.error("Choropleth Map render error:", err);
            self.addError({
              title: "Rendering Error",
              message: err.message || "An unexpected error occurred while rendering the map."
            });
          }
          done();
        });
      });
    },

    _render: function (d3, geoData, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector(".looker-choropleth-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_blue";
      var theme = THEMES[themeKey] || THEMES.google_blue;
      var isDark = themeKey === "cyberpunk_dark";

      if (themeKey === "custom" && config.customPrimaryColor) {
        theme = {
          name: "Custom Hex Override",
          range: ["#f1f5f9", "#cbd5e1", config.customPrimaryColor, config.customPrimaryColor, "#0f172a"],
          bg: "#ffffff",
          text: "#0f172a",
          subtext: "#64748b",
          border: "#ffffff",
          hoverStroke: config.customPrimaryColor,
          bubbleStroke: config.customPrimaryColor,
          bubbleFill: config.customPrimaryColor,
          cardBg: "#f8fafc",
          cardBorder: "#e2e8f0",
          positive: config.customPositiveColor || "#10b981",
          negative: config.customNegativeColor || "#ef4444"
        };
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // Font scale adjustments
      var fontScale = config.fontScale || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : fontScale === "large" ? 14 : 12;
      container.style.fontSize = baseFontSize + "px";

      var mapMode = config.mapMode || "choropleth";
      var aggType = config.aggregationType || "sum";
      var polarity = config.metricPolarity || "higher_better";
      var fmt = config.valueFormat || "compact_currency";

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      var dimField = resolveField(dims, config.stateFieldOverride, 0);
      var measField = resolveField(meas, config.measureFieldOverride, 0);
      var secMeasField = meas.length > 1 ? resolveField(meas, config.secondaryMeasureOverride, 1) : null;

      var metricLabel = measField ? (measField.label_short || measField.label || measField.name) : "Metric";
      var totalRawRows = data.length;

      // 1. High-Density Client-Side Aggregation
      var dataByCode = {};
      var totalSumAll = 0;
      var totalCountAll = 0;
      var allRowMeasures = [];

      data.forEach(function (row) {
        var rawDim = row[dimField.name] ? (row[dimField.name].value || row[dimField.name].rendered) : null;
        var code = resolveStateCode(rawDim);
        if (!code) return;

        var cellMeas = row[measField.name];
        var val = cellMeas && cellMeas.value !== null && !isNaN(cellMeas.value) ? Number(cellMeas.value) : 0;
        var rendered = cellMeas ? cellMeas.rendered : null;
        var links = (cellMeas && cellMeas.links) || (row[dimField.name] && row[dimField.name].links) || [];

        var secVal = 0;
        if (secMeasField && row[secMeasField.name] && row[secMeasField.name].value !== null) {
          secVal = Number(row[secMeasField.name].value) || 0;
        }

        if (!dataByCode[code]) {
          dataByCode[code] = {
            code: code,
            stateName: STATE_LOOKUP[code].name,
            sum: 0,
            count: 0,
            min: Infinity,
            max: -Infinity,
            rawValues: [],
            secSum: 0,
            rendered: rendered,
            links: links
          };
        }

        dataByCode[code].sum += val;
        dataByCode[code].secSum += secVal;
        dataByCode[code].count += 1;
        if (val < dataByCode[code].min) dataByCode[code].min = val;
        if (val > dataByCode[code].max) dataByCode[code].max = val;
        dataByCode[code].rawValues.push(val);
        totalSumAll += val;
        totalCountAll += 1;
        allRowMeasures.push(val);
      });

      // 2. Compute display values per state based on aggregationType
      var entries = [];
      Object.keys(dataByCode).forEach(function (code) {
        var d = dataByCode[code];
        var computedVal = 0;
        switch (aggType) {
          case "avg":
            computedVal = d.count > 0 ? d.sum / d.count : 0;
            break;
          case "count":
            computedVal = d.count;
            break;
          case "max":
            computedVal = d.max === -Infinity ? 0 : d.max;
            break;
          case "sum":
          default:
            computedVal = d.sum;
            break;
        }

        if (config.suppressZeroNull && (!computedVal || computedVal === 0)) {
          delete dataByCode[code];
          return;
        }

        d.value = computedVal;
        entries.push(d);
      });

      if (entries.length === 0) {
        container.innerHTML = "<div style=\"padding:40px;text-align:center;color:" + theme.subtext + ";\">All territories suppressed by zero/null filter.</div>";
        return;
      }

      // 3. Compute Benchmark Target
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var meanVal = d3.mean(entries, function (d) { return d.value; }) || 0;
      var medianVal = d3.median(entries, function (d) { return d.value; }) || 0;
      var p75Val = d3.quantile(entries.map(function(d){ return d.value; }).sort(d3.ascending), 0.75) || 0;
      var p90Val = d3.quantile(entries.map(function(d){ return d.value; }).sort(d3.ascending), 0.90) || 0;

      entries.forEach(function (d) {
        var tgt = 0;
        switch (targetMode) {
          case "second_measure":
            tgt = d.secSum > 0 ? (aggType === "avg" ? d.secSum / d.count : d.secSum) : meanVal;
            break;
          case "multiplier":
            tgt = d.value * (Number(config.targetMultiplier) || 1.15);
            break;
          case "fixed":
            tgt = Number(config.fixedTargetValue) || meanVal;
            break;
          case "dataset_median":
            tgt = medianVal;
            break;
          case "percentile_p75":
            tgt = p75Val;
            break;
          case "percentile_p90":
            tgt = p90Val;
            break;
          case "dataset_mean":
            tgt = meanVal;
            break;
          case "none":
          default:
            tgt = null;
            break;
        }

        d.target = tgt;
        if (tgt !== null && tgt !== undefined) {
          d.delta = d.value - tgt;
          d.deltaPct = tgt !== 0 ? (d.delta / tgt) : 0;
          d.isAnomaly = Math.abs(d.deltaPct * 100) >= (Number(config.anomalyThresholdPct) || 30);
          d.isFavorable = polarity === "higher_better" ? (d.delta >= 0) : (d.delta <= 0);
        } else {
          d.delta = null;
          d.deltaPct = null;
          d.isAnomaly = false;
          d.isFavorable = true;
        }
      });

      // 4. Sorting & Top-N Bucketing
      var sortBy = config.sortBy || "metric_desc";
      if (sortBy === "metric_desc") {
        entries.sort(function (a, b) { return b.value - a.value; });
      } else if (sortBy === "metric_asc") {
        entries.sort(function (a, b) { return a.value - b.value; });
      } else if (sortBy === "state_asc") {
        entries.sort(function (a, b) { return a.stateName.localeCompare(b.stateName); });
      } else if (sortBy === "variance_desc") {
        entries.sort(function (a, b) { return (b.deltaPct || 0) - (a.deltaPct || 0); });
      }

      var topN = Number(config.topNLimit) || 0;
      var activeTotal = d3.sum(entries, function (d) { return d.value; });
      var topState = entries[0];

      entries.forEach(function (item, rankIdx) {
        item.rank = rankIdx + 1;
        item.pctOfTotal = activeTotal > 0 ? (item.value / activeTotal) * 100 : 0;
      });

      if (topN > 0 && topN < entries.length) {
        var topEntries = entries.slice(0, topN);
        var remaining = entries.slice(topN);
        if (config.enableOtherRollup && remaining.length > 0) {
          var otherSum = d3.sum(remaining, function (d) { return d.value; });
          var otherCount = d3.sum(remaining, function (d) { return d.count; });
          var otherEntry = {
            code: "OTHER",
            stateName: "Other (" + remaining.length + " States)",
            value: otherSum,
            count: otherCount,
            rank: topN + 1,
            pctOfTotal: activeTotal > 0 ? (otherSum / activeTotal) * 100 : 0,
            target: meanVal,
            delta: otherSum - meanVal,
            deltaPct: meanVal ? (otherSum - meanVal) / meanVal : 0,
            isAnomaly: false,
            isFavorable: true,
            rawValues: [],
            links: []
          };
          topEntries.push(otherEntry);
        }
        // Update dataByCode to only include filtered set for mapping
        var filteredCodeMap = {};
        topEntries.forEach(function (e) {
          if (e.code !== "OTHER") filteredCodeMap[e.code] = e;
        });
        dataByCode = filteredCodeMap;
      }

      // 5. Header Bar (Custom Title & Search Filter)
      var showSearch = config.showSearch !== false;
      var customTitle = (config.customTitle || "").trim();
      var customSubtitle = (config.customSubtitle || "").trim();

      if (customTitle || showSearch) {
        var headerBar = document.createElement("div");
        headerBar.style.display = "flex";
        headerBar.style.alignItems = "center";
        headerBar.style.justifyContent = "space-between";
        headerBar.style.padding = "10px 16px 6px 16px";
        headerBar.style.borderBottom = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
        headerBar.style.gap = "12px";
        headerBar.style.flexShrink = "0";

        var titleBlock = document.createElement("div");
        titleBlock.style.display = "flex";
        titleBlock.style.flexDirection = "column";

        if (customTitle) {
          var hTitle = document.createElement("div");
          hTitle.style.fontSize = (baseFontSize + 3) + "px";
          hTitle.style.fontWeight = "700";
          hTitle.style.color = theme.text;
          hTitle.textContent = customTitle;
          titleBlock.appendChild(hTitle);
        }

        if (customSubtitle) {
          var hSub = document.createElement("div");
          hSub.style.fontSize = (baseFontSize - 1) + "px";
          hSub.style.color = theme.subtext;
          hSub.textContent = customSubtitle;
          titleBlock.appendChild(hSub);
        }
        headerBar.appendChild(titleBlock);

        if (showSearch) {
          var searchWrapper = document.createElement("div");
          searchWrapper.style.display = "flex";
          searchWrapper.style.alignItems = "center";
          searchWrapper.style.gap = "6px";
          searchWrapper.style.backgroundColor = isDark ? "#1e293b" : "#f1f5f9";
          searchWrapper.style.border = "1px solid " + (isDark ? "#334155" : "#cbd5e1");
          searchWrapper.style.borderRadius = "20px";
          searchWrapper.style.padding = "4px 10px";

          var searchIcon = document.createElement("span");
          searchIcon.innerHTML = "&#128269;";
          searchIcon.style.fontSize = "11px";
          searchWrapper.appendChild(searchIcon);

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Find state...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.outline = "none";
          searchInput.style.fontSize = "11px";
          searchInput.style.color = theme.text;
          searchInput.style.width = "100px";

          searchInput.addEventListener("input", function (e) {
            self._searchTerm = e.target.value.toLowerCase().trim();
            self._highlightSearch();
          });
          searchWrapper.appendChild(searchInput);
          headerBar.appendChild(searchWrapper);
        }
        container.appendChild(headerBar);
      }

      // 6. Executive Scorecard HUD (Top Band)
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hudBand = document.createElement("div");
        hudBand.style.display = "flex";
        hudBand.style.alignItems = "stretch";
        hudBand.style.gap = "10px";
        hudBand.style.padding = "8px 16px";
        hudBand.style.borderBottom = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
        hudBand.style.backgroundColor = isDark ? "#0f172a" : "#f8fafc";
        hudBand.style.flexShrink = "0";

        var aggName = aggType === "sum" ? "Total" : aggType === "avg" ? "Avg" : aggType.toUpperCase();
        var totalStr = formatValue(activeTotal, fmt);
        var meanStr = formatValue(meanVal, fmt);
        var targetStr = targetMode !== "none" ? formatValue(meanVal, fmt) : null;

        var hud1 = makeHudCard("Territories", Object.keys(dataByCode).length + " States", totalRawRows > 50 ? (totalRawRows.toLocaleString() + " rows aggregated") : null, null, theme, themeKey, isDark);
        var hud2 = makeHudCard(aggName + " " + metricLabel, totalStr, "National Total", null, theme, themeKey, isDark);
        var hud3 = makeHudCard("Mean per State", meanStr, "P50 Median: " + formatValue(medianVal, fmt), null, theme, themeKey, isDark);

        var topStateSub = topState ? (topState.pctOfTotal.toFixed(1) + "% of National") : null;
        var hud4 = makeHudCard("Top Territory", topState ? (topState.code + " (" + formatValue(topState.value, fmt) + ")") : "-", topStateSub, theme.positive, theme, themeKey, isDark);

        hudBand.appendChild(hud1);
        hudBand.appendChild(hud2);
        hudBand.appendChild(hud3);
        hudBand.appendChild(hud4);

        if (targetMode !== "none" && config.showReferenceLine) {
          var targetLabel = config.referenceLineLabel || "Benchmark Target";
          var varianceAll = meanVal - (targetMode === "fixed" ? Number(config.fixedTargetValue) || meanVal : meanVal);
          var varPctAll = meanVal ? (varianceAll / meanVal) : 0;
          var hud5 = makeHudCard(targetLabel, targetStr, formatDelta(varianceAll, varPctAll, fmt), (varPctAll >= 0 ? theme.positive : theme.negative), theme, themeKey, isDark);
          hudBand.appendChild(hud5);
        }

        container.appendChild(hudBand);
      }

      // 7. Setup Canvas / SVG Area
      var mapWrapper = document.createElement("div");
      mapWrapper.className = "looker-choropleth-map-wrapper";
      mapWrapper.style.flex = "1 1 0";
      mapWrapper.style.minHeight = "0";
      mapWrapper.style.position = "relative";
      mapWrapper.style.overflow = "hidden";
      mapWrapper.style.width = "100%";
      container.appendChild(mapWrapper);

      var scaleValues = Object.keys(dataByCode).map(function (k) { return dataByCode[k].value; });
      var scaleMode = config.colorScaleMode || "quantile";
      var colorScale;
      var colors = theme.range;

      if (scaleValues.length > 0) {
        if (scaleMode === "linear") {
          var minVal = d3.min(scaleValues) || 0;
          var maxVal = d3.max(scaleValues) || 100;
          colorScale = d3.scaleLinear()
            .domain(d3.range(colors.length).map(function (i) {
              return minVal + (i / (colors.length - 1)) * (maxVal - minVal);
            }))
            .range(colors)
            .clamp(true);
        } else if (scaleMode === "quantize") {
          colorScale = d3.scaleQuantize()
            .domain([d3.min(scaleValues) || 0, d3.max(scaleValues) || 100])
            .range(colors);
        } else {
          colorScale = d3.scaleQuantile()
            .domain(scaleValues)
            .range(colors);
        }
      } else {
        colorScale = function () { return config.nullColor || "#f1f5f9"; };
      }

      var maxValForBubble = d3.max(scaleValues) || 1;
      var radiusScale = d3.scaleSqrt()
        .domain([0, maxValForBubble])
        .range([5, 26]);

      var mapWidth = 960;
      var mapHeight = 580;

      var svg = d3.select(mapWrapper)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block");

      var projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([mapWidth / 2, mapHeight / 2]);

      var pathGenerator = d3.geoPath().projection(projection);

      var rootZoomG = svg.append("g").attr("class", "zoom-root-group");

      // Zoom navigation
      if (config.enableZoom !== false) {
        var zoom = d3.zoom()
          .scaleExtent([0.85, 8])
          .on("zoom", function (event) {
            rootZoomG.attr("transform", event.transform);
          });

        svg.call(zoom);

        var zoomControls = document.createElement("div");
        zoomControls.className = "looker-zoom-controls";
        zoomControls.style.position = "absolute";
        zoomControls.style.top = "14px";
        zoomControls.style.right = "16px";
        zoomControls.style.zIndex = "10";
        zoomControls.style.display = "flex";
        zoomControls.style.flexDirection = "column";
        zoomControls.style.gap = "4px";
        zoomControls.style.background = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)";
        zoomControls.style.border = "1px solid " + (isDark ? "#334155" : "#cbd5e1");
        zoomControls.style.borderRadius = "8px";
        zoomControls.style.padding = "4px";
        zoomControls.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";

        function createBtn(text, title, onClick) {
          var btn = document.createElement("button");
          btn.innerHTML = text;
          btn.title = title;
          btn.style.width = "28px";
          btn.style.height = "28px";
          btn.style.border = "none";
          btn.style.background = "transparent";
          btn.style.cursor = "pointer";
          btn.style.fontSize = "15px";
          btn.style.fontWeight = "700";
          btn.style.color = theme.text;
          btn.style.borderRadius = "4px";
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
          btn.addEventListener("mouseenter", function () {
            btn.style.backgroundColor = isDark ? "#475569" : "#f1f5f9";
          });
          btn.addEventListener("mouseleave", function () {
            btn.style.backgroundColor = "transparent";
          });
          btn.addEventListener("click", onClick);
          return btn;
        }

        zoomControls.appendChild(createBtn("+", "Zoom In", function () {
          svg.transition().duration(250).call(zoom.scaleBy, 1.35);
        }));
        zoomControls.appendChild(createBtn("&minus;", "Zoom Out", function () {
          svg.transition().duration(250).call(zoom.scaleBy, 0.74);
        }));
        zoomControls.appendChild(createBtn("&#x21ba;", "Reset View", function () {
          svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity);
        }));
        mapWrapper.appendChild(zoomControls);
      }

      var mapGroup = rootZoomG.append("g").attr("class", "states-group");
      var bubblesGroup = rootZoomG.append("g").attr("class", "bubbles-group");
      var labelsGroup = rootZoomG.append("g").attr("class", "labels-group").style("pointer-events", "none");

      var tooltip = this._tooltip;
      var highlightColor = config.highlightColor || "#f59e0b";
      var nullColor = config.nullColor || "#f1f5f9";

      function showStateTooltip(d, code, info) {
        if (!tooltip) return;
        var stateName = (code && STATE_LOOKUP[code]) ? STATE_LOOKUP[code].name : (d.properties && d.properties.name) || "Unknown State";
        var valStr = info ? formatValue(info.value, fmt, info.rendered) : "No Data";
        var rankStr = info ? ("#" + info.rank + " of " + Object.keys(dataByCode).length) : "Unranked";
        var pctStr = info ? (info.pctOfTotal.toFixed(1) + "% of National Total") : "-";

        var targetRowHtml = "";
        if (info && info.target !== null && info.target !== undefined) {
          var tgtFormatted = formatValue(info.target, fmt);
          var varFormatted = formatDelta(info.delta, info.deltaPct, fmt);
          var varColor = info.isFavorable ? theme.positive : theme.negative;
          targetRowHtml = "" +
            "<div style=\"font-size:11.5px;margin-top:4px;display:flex;justify-content:space-between;color:" + theme.subtext + ";\">" +
            "  <span>Target (" + (config.referenceLineLabel || "Goal") + "):</span>" +
            "  <span style=\"font-weight:600;color:" + theme.text + ";\">" + tgtFormatted + "</span>" +
            "</div>" +
            "<div style=\"font-size:11.5px;margin-top:2px;display:flex;justify-content:space-between;color:" + theme.subtext + ";\">" +
            "  <span>Variance:</span>" +
            "  <span style=\"font-weight:700;color:" + varColor + ";\">" + varFormatted + "</span>" +
            "</div>";
        }

        var anomalyBadgeHtml = "";
        if (info && info.isAnomaly) {
          anomalyBadgeHtml = "<div style=\"margin-top:4px;padding:2px 6px;border-radius:4px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:10.5px;font-weight:700;\">&#9888; Anomaly: Variance exceeds " + (config.anomalyThresholdPct || 30) + "% threshold</div>";
        }

        tooltip.innerHTML = "" +
          "<div style=\"font-size:13px;font-weight:700;color:" + theme.text + ";margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;\">" +
          "  <span>" + stateName + " (" + (code || "--") + ")</span>" +
          (info ? "<span style=\"font-size:10.5px;padding:2px 7px;background:" + (isDark ? "#334155" : "#e0f2fe") + ";color:" + (isDark ? "#38bdf8" : "#0369a1") + ";border-radius:10px;font-weight:600;\">" + rankStr + "</span>" : "") +
          "</div>" +
          "<div style=\"margin-top:4px;font-size:12px;color:" + theme.subtext + ";display:flex;justify-content:space-between;gap:8px;\">" +
          "  <span>" + metricLabel + " (" + aggType.toUpperCase() + "): </span>" +
          "  <span style=\"font-weight:700;color:" + (isDark ? "#38bdf8" : "#1e40af") + ";font-size:13px;\">" + valStr + "</span>" +
          "</div>" +
          (info ? "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-top:3px;\">" + pctStr + "</div>" : "") +
          targetRowHtml +
          anomalyBadgeHtml +
          (info && info.links && info.links.length > 0 ? "<div style=\"margin-top:6px;font-size:10.5px;color:#2563eb;font-weight:600;\">Click territory to explore drill-down &rarr;</div>" : "");

        tooltip.style.backgroundColor = isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.97)";
        tooltip.style.border = "1px solid " + (isDark ? "#334155" : "#e2e8f0");
        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
      }

      function moveTooltip(event) {
        if (!tooltip) return;
        var ttW = tooltip.offsetWidth || 230;
        var ttH = tooltip.offsetHeight || 130;
        var left = event.clientX + 14;
        var top = event.clientY - 15;
        if (left + ttW > window.innerWidth - 10) left = event.clientX - ttW - 14;
        if (top + ttH > window.innerHeight - 10) top = window.innerHeight - ttH - 10;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      }

      function hideTooltip() {
        if (tooltip) tooltip.style.display = "none";
      }

      // Render State Polygons
      var states = mapGroup.selectAll("path.state")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", pathGenerator)
        .attr("data-fips", function (d) { return String(d.id); })
        .attr("fill", function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          var info = code ? dataByCode[code] : null;

          if (mapMode === "bubble_pins") {
            return isDark ? "#1e293b" : "#f8fafc";
          }
          if (info) {
            return colorScale(info.value);
          }
          return nullColor;
        })
        .attr("stroke", function () {
          return mapMode === "bubble_pins"
            ? (isDark ? "#334155" : "#cbd5e1")
            : theme.border;
        })
        .attr("stroke-width", mapMode === "bubble_pins" ? 1.0 : 1.2)
        .style("cursor", "pointer")
        .style("transition", "fill 0.2s ease, stroke 0.2s ease");

      states.on("mouseenter", function (event, d) {
        var code = FIPS_TO_CODE[String(d.id)];
        var info = code ? dataByCode[code] : null;

        d3.select(this)
          .raise()
          .attr("stroke", highlightColor)
          .attr("stroke-width", 2.5);

        showStateTooltip(d, code, info);
      });

      states.on("mousemove", moveTooltip);

      states.on("mouseleave", function (event, d) {
        d3.select(this)
          .attr("stroke", mapMode === "bubble_pins" ? (isDark ? "#334155" : "#cbd5e1") : theme.border)
          .attr("stroke-width", mapMode === "bubble_pins" ? 1.0 : 1.2);
        hideTooltip();
      });

      states.on("click", function (event, d) {
        var code = FIPS_TO_CODE[String(d.id)];
        var info = code ? dataByCode[code] : null;
        if (info && info.links && info.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
          window.LookerCharts.Utils.openDrillMenu({
            links: info.links,
            event: event
          });
        }
      });

      // Render Bubble Pins (if bubble_pins or both_hybrid mode)
      if (mapMode === "bubble_pins" || mapMode === "both_hybrid") {
        geoData.features.forEach(function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          if (!code || !dataByCode[code]) return;
          var info = dataByCode[code];
          var centroid = pathGenerator.centroid(d);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

          var r = radiusScale(info.value);
          var bubbleG = bubblesGroup.append("g")
            .attr("class", "bubble-node")
            .attr("data-fips", String(d.id))
            .attr("transform", "translate(" + centroid[0] + "," + centroid[1] + ")")
            .style("cursor", "pointer");

          if (info.rank <= 3) {
            bubbleG.append("circle")
              .attr("r", r + 4)
              .attr("fill", "none")
              .attr("stroke", highlightColor)
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "3,3")
              .attr("opacity", 0.7);
          }

          var bubbleCircle = bubbleG.append("circle")
            .attr("r", r)
            .attr("fill", mapMode === "both_hybrid" ? "rgba(255, 255, 255, 0.88)" : theme.bubbleFill)
            .attr("stroke", mapMode === "both_hybrid" ? (isDark ? "#38bdf8" : "#1e40af") : theme.bubbleStroke)
            .attr("stroke-width", 2.0)
            .style("transition", "transform 0.15s ease, fill 0.15s ease");

          bubbleG.on("mouseenter", function (event) {
            d3.select(this).raise();
            bubbleCircle.attr("transform", "scale(1.25)");
            showStateTooltip(d, code, info);
          });
          bubbleG.on("mousemove", moveTooltip);
          bubbleG.on("mouseleave", function () {
            bubbleCircle.attr("transform", "scale(1.0)");
            hideTooltip();
          });
          bubbleG.on("click", function (event) {
            if (info.links && info.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: info.links,
                event: event
              });
            }
          });
        });
      }

      // State Postal Code Labels
      var labelDensity = config.labelDensity || "all";
      if (labelDensity !== "none") {
        geoData.features.forEach(function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          if (!code) return;
          var info = dataByCode[code];

          // Filter by density mode
          if (labelDensity === "peaks" && info) {
            if (info.rank > 5 && info.rank <= (Object.keys(dataByCode).length - 5)) return;
          }

          var centroid = pathGenerator.centroid(d);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

          var textColor = "#0f172a";
          if (mapMode === "choropleth" || mapMode === "both_hybrid") {
            if (info) {
              var hex = colorScale(info.value);
              textColor = d3.hsl(hex).l < 0.55 ? "#ffffff" : "#0f172a";
            }
          }
          if (isDark && mapMode === "bubble_pins") textColor = "#f8fafc";

          labelsGroup.append("text")
            .attr("x", centroid[0])
            .attr("y", centroid[1] + 3.5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", textColor)
            .text(code);
        });
      }

      // Gradient Legend Bar (Bottom Left)
      if (config.showLegend !== false && colors && colors.length > 0) {
        var legendWrapper = document.createElement("div");
        legendWrapper.className = "looker-legend-bar";
        legendWrapper.style.position = "absolute";
        legendWrapper.style.bottom = "14px";
        legendWrapper.style.left = "16px";
        legendWrapper.style.zIndex = "10";
        legendWrapper.style.display = "flex";
        legendWrapper.style.flexDirection = "column";
        legendWrapper.style.gap = "4px";
        legendWrapper.style.background = isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)";
        legendWrapper.style.border = "1px solid " + (isDark ? "#334155" : "#cbd5e1");
        legendWrapper.style.borderRadius = "8px";
        legendWrapper.style.padding = "8px 12px";
        legendWrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";

        var legTitle = document.createElement("div");
        legTitle.style.fontSize = "10px";
        legTitle.style.fontWeight = "700";
        legTitle.style.color = theme.text;
        legTitle.textContent = metricLabel + " (" + scaleMode.toUpperCase() + ")";
        legendWrapper.appendChild(legTitle);

        var legBar = document.createElement("div");
        legBar.style.display = "flex";
        legBar.style.width = "160px";
        legBar.style.height = "10px";
        legBar.style.borderRadius = "4px";
        legBar.style.overflow = "hidden";
        colors.forEach(function (c) {
          var swatch = document.createElement("div");
          swatch.style.flex = "1";
          swatch.style.backgroundColor = c;
          legBar.appendChild(swatch);
        });
        legendWrapper.appendChild(legBar);

        var legLabels = document.createElement("div");
        legLabels.style.display = "flex";
        legLabels.style.justifyContent = "space-between";
        legLabels.style.fontSize = "9.5px";
        legLabels.style.color = theme.subtext;
        var minScaleVal = d3.min(scaleValues) || 0;
        var maxScaleVal = d3.max(scaleValues) || 0;
        legLabels.innerHTML = "<span>" + formatValue(minScaleVal, fmt) + "</span><span>" + formatValue(maxScaleVal, fmt) + "</span>";
        legendWrapper.appendChild(legLabels);

        mapWrapper.appendChild(legendWrapper);
      }

      this._highlightSearch = function () {
        var query = self._searchTerm;
        states.each(function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          var info = code ? dataByCode[code] : null;
          var stateName = (code && STATE_LOOKUP[code]) ? STATE_LOOKUP[code].name.toLowerCase() : "";
          var match = !query || (code && code.toLowerCase().indexOf(query) !== -1) || (stateName.indexOf(query) !== -1);

          d3.select(this)
            .attr("opacity", match ? 1.0 : 0.2)
            .attr("stroke-width", match && query ? 2.5 : (mapMode === "bubble_pins" ? 1.0 : 1.2))
            .attr("stroke", match && query ? highlightColor : (mapMode === "bubble_pins" ? (isDark ? "#334155" : "#cbd5e1") : theme.border));
        });
      };
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
