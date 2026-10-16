/**
 * Looker Custom Visualization: Dual-Axis Multi-Layer Geospatial Map
 *
 * Visual Paradigms & Capabilities:
 * - Multi-Layer Geospatial Rendering:
 *     1. Layer 1: Continuous Choropleth boundary polygon heatmap (Albers USA or Hex Cartogram)
 *     2. Layer 2: Proportional centroid bubble pins with dynamic radii scaling
 *     3. Layer 3: Contextual hover inspector, percentile benchmarks, and drill-downs
 * - Multi-Modal Layouts:
 *     1. "dual_layer": Choropleth region heatmap + Proportional centroid bubble pins.
 *     2. "choropleth_only": High-contrast boundary polygon heatmap.
 *     3. "bubble_only": Proportional scatter circles on neutral territory basemap.
 *     4. "hex_cartogram": Equal-area hexagonal state cartogram eliminating geographic area bias.
 * - Dynamic Field-Role Mapping: Auto-populated select dropdowns for State Dimension and Measures.
 * - Configurable Benchmark Targets: Mean, Median, P75, P90, or Fixed Target with anomaly alert thresholds.
 * - Sorting, Top-N Bucketing & Null Suppression.
 * - Multi-Density Executive HUD: Full scorecard, compact strip, or hidden.
 * - Interactive Pan & Zoom: Smooth D3 zoom with floating reset and navigation controls.
 * - Dual-Axis Legends: Synchronized color gradient ramp for Layer 1 + nested circle scale for Layer 2.
 * - Native Looker Drill-Downs: Contextual drill menu integration on click.
 */

(function () {
  var US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  var STATE_LOOKUP = {
    "AL": { name: "Alabama", fips: "01", hex: { q: 6, r: 5 } },
    "AK": { name: "Alaska", fips: "02", hex: { q: 0, r: 0 } },
    "AZ": { name: "Arizona", fips: "04", hex: { q: 1, r: 5 } },
    "AR": { name: "Arkansas", fips: "05", hex: { q: 4, r: 5 } },
    "CA": { name: "California", fips: "06", hex: { q: 0, r: 4 } },
    "CO": { name: "Colorado", fips: "08", hex: { q: 2, r: 4 } },
    "CT": { name: "Connecticut", fips: "09", hex: { q: 9, r: 3 } },
    "DE": { name: "Delaware", fips: "10", hex: { q: 9, r: 4 } },
    "DC": { name: "District of Columbia", fips: "11", hex: { q: 8, r: 5 } },
    "FL": { name: "Florida", fips: "12", hex: { q: 8, r: 7 } },
    "GA": { name: "Georgia", fips: "13", hex: { q: 7, r: 6 } },
    "HI": { name: "Hawaii", fips: "15", hex: { q: 0, r: 7 } },
    "ID": { name: "Idaho", fips: "16", hex: { q: 1, r: 2 } },
    "IL": { name: "Illinois", fips: "17", hex: { q: 5, r: 3 } },
    "IN": { name: "Indiana", fips: "18", hex: { q: 5, r: 4 } },
    "IA": { name: "Iowa", fips: "19", hex: { q: 4, r: 3 } },
    "KS": { name: "Kansas", fips: "20", hex: { q: 3, r: 5 } },
    "KY": { name: "Kentucky", fips: "21", hex: { q: 5, r: 5 } },
    "LA": { name: "Louisiana", fips: "22", hex: { q: 4, r: 6 } },
    "ME": { name: "Maine", fips: "23", hex: { q: 10, r: 0 } },
    "MD": { name: "Maryland", fips: "24", hex: { q: 8, r: 4 } },
    "MA": { name: "Massachusetts", fips: "25", hex: { q: 9, r: 2 } },
    "MI": { name: "Michigan", fips: "26", hex: { q: 6, r: 2 } },
    "MN": { name: "Minnesota", fips: "27", hex: { q: 4, r: 2 } },
    "MS": { name: "Mississippi", fips: "28", hex: { q: 5, r: 6 } },
    "MO": { name: "Missouri", fips: "29", hex: { q: 4, r: 4 } },
    "MT": { name: "Montana", fips: "30", hex: { q: 2, r: 2 } },
    "NE": { name: "Nebraska", fips: "31", hex: { q: 3, r: 4 } },
    "NV": { name: "Nevada", fips: "32", hex: { q: 1, r: 3 } },
    "NH": { name: "New Hampshire", fips: "33", hex: { q: 10, r: 1 } },
    "NJ": { name: "New Jersey", fips: "34", hex: { q: 8, r: 3 } },
    "NM": { name: "New Mexico", fips: "35", hex: { q: 2, r: 5 } },
    "NY": { name: "New York", fips: "36", hex: { q: 8, r: 2 } },
    "NC": { name: "North Carolina", fips: "37", hex: { q: 7, r: 5 } },
    "ND": { name: "North Dakota", fips: "38", hex: { q: 3, r: 2 } },
    "OH": { name: "Ohio", fips: "39", hex: { q: 6, r: 3 } },
    "OK": { name: "Oklahoma", fips: "40", hex: { q: 3, r: 6 } },
    "OR": { name: "Oregon", fips: "41", hex: { q: 0, r: 3 } },
    "PA": { name: "Pennsylvania", fips: "42", hex: { q: 7, r: 3 } },
    "RI": { name: "Rhode Island", fips: "44", hex: { q: 10, r: 3 } },
    "SC": { name: "South Carolina", fips: "45", hex: { q: 7, r: 7 } },
    "SD": { name: "South Dakota", fips: "46", hex: { q: 3, r: 3 } },
    "TN": { name: "Tennessee", fips: "47", hex: { q: 6, r: 6 } },
    "TX": { name: "Texas", fips: "48", hex: { q: 3, r: 7 } },
    "UT": { name: "Utah", fips: "49", hex: { q: 1, r: 4 } },
    "VT": { name: "Vermont", fips: "50", hex: { q: 9, r: 1 } },
    "VA": { name: "Virginia", fips: "51", hex: { q: 7, r: 4 } },
    "WA": { name: "Washington", fips: "53", hex: { q: 0, r: 2 } },
    "WV": { name: "West Virginia", fips: "54", hex: { q: 6, r: 4 } },
    "WI": { name: "Wisconsin", fips: "55", hex: { q: 5, r: 2 } },
    "WY": { name: "Wyoming", fips: "56", hex: { q: 2, r: 3 } }
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
    var hasD3 = window.d3 && typeof window.d3.geoPath === "function" && typeof window.d3.geoAlbersUsa === "function";
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
    google_enterprise: {
      name: "Google Enterprise",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      stateBorder: "#ffffff",
      stateEmpty: "#f1f5f9",
      choroplethRange: ["#e0f2fe", "#7dd3fc", "#0284c7", "#0369a1", "#0c4a6e"],
      bubbleFill: "#f59e0b",
      bubbleStroke: "#b45309",
      bubbleText: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#cbd5e1",
      buttonBg: "#f1f5f9",
      buttonHover: "#e2e8f0"
    },
    modern_slate: {
      name: "Modern Executive Slate",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#cbd5e1",
      text: "#1e293b",
      subtext: "#64748b",
      stateBorder: "#ffffff",
      stateEmpty: "#f1f5f9",
      choroplethRange: ["#f1f5f9", "#cbd5e1", "#64748b", "#334155", "#0f172a"],
      bubbleFill: "#6366f1",
      bubbleStroke: "#3730a3",
      bubbleText: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#cbd5e1",
      buttonBg: "#f8fafc",
      buttonHover: "#e2e8f0"
    },
    cyber_dark: {
      name: "Cyber NOC Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f2937",
      text: "#f9fafb",
      subtext: "#9ca3af",
      stateBorder: "#1e293b",
      stateEmpty: "#1f2937",
      choroplethRange: ["#1e293b", "#0e7490", "#06b6d4", "#22d3ee", "#a5f3fc"],
      bubbleFill: "#f43f5e",
      bubbleStroke: "#ffe4e6",
      bubbleText: "#ffffff",
      hudBg: "rgba(17, 24, 39, 0.94)",
      hudBorder: "#374151",
      buttonBg: "#1f2937",
      buttonHover: "#374151"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      stateBorder: "#ffffff",
      stateEmpty: "#f1f5f9",
      choroplethRange: ["#d1fae5", "#6ee7b7", "#10b981", "#047857", "#064e3b"],
      bubbleFill: "#e11d48",
      bubbleStroke: "#881337",
      bubbleText: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#a7f3d0",
      buttonBg: "#f0fdf4",
      buttonHover: "#d1fae5"
    },
    sunset_media: {
      name: "Sunset Media",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      border: "#fed7aa",
      text: "#7c2d12",
      subtext: "#9a3412",
      stateBorder: "#ffffff",
      stateEmpty: "#fef2f2",
      choroplethRange: ["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"],
      bubbleFill: "#8b5cf6",
      bubbleStroke: "#5b21b6",
      bubbleText: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#fdba74",
      buttonBg: "#ffedd5",
      buttonHover: "#fed7aa"
    },
    wellverse: {
      name: "Wellverse Healthcare",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      stateBorder: "#ffffff",
      stateEmpty: "#f8fafc",
      choroplethRange: ["#ccfbf1", "#5eead4", "#14b8a6", "#0f766e", "#134e4a"],
      bubbleFill: "#f97316",
      bubbleStroke: "#c2410c",
      bubbleText: "#ffffff",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#99f6e4",
      buttonBg: "#f0fdfa",
      buttonHover: "#ccfbf1"
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || !list.length) return null;
    if (overrideVal) {
      var needle = String(overrideVal).trim().toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (f.name && f.name.toLowerCase() === needle) return f;
        if (f.label && f.label.toLowerCase() === needle) return f;
        if (f.label_short && f.label_short.toLowerCase() === needle) return f;
      }
      var numericIdx = parseInt(overrideVal, 10);
      if (!isNaN(numericIdx) && numericIdx >= 1 && numericIdx <= list.length) {
        return list[numericIdx - 1];
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) {
      return list[defaultIdx];
    }
    return null;
  }

  function formatValue(val, fmt, field) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var chosenFmt = fmt || "auto";

    if (chosenFmt === "auto") {
      var fieldName = (field && (field.name || field.label || "")).toLowerCase();
      if (fieldName.indexOf("price") !== -1 || fieldName.indexOf("spend") !== -1 || fieldName.indexOf("cost") !== -1 || fieldName.indexOf("revenue") !== -1 || fieldName.indexOf("margin") !== -1 || fieldName.indexOf("$") !== -1) {
        chosenFmt = "compact_currency";
      } else if (fieldName.indexOf("%") !== -1 || fieldName.indexOf("pct") !== -1 || fieldName.indexOf("rate") !== -1 || fieldName.indexOf("ratio") !== -1) {
        chosenFmt = "percentage";
      } else {
        chosenFmt = "compact_num";
      }
    }

    switch (chosenFmt) {
      case "compact_currency":
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return "$" + Math.round(num).toLocaleString();
      case "compact_num":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString();
      case "percentage":
        return num.toFixed(1) + "%";
      case "decimal_2dp":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(num);
      case "numeric":
      default:
        return Math.round(num).toLocaleString();
    }
  }

  looker.plugins.visualizations.add({
    id: "multi_layer_geo_map",
    label: "Dual-Axis Multi-Layer Geospatial Map",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY
      // ==========================================
      mapMode: {
        type: "string",
        label: "Geospatial Map Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Dual-Layer: Choropleth + Bubble Pins": "dual_layer" },
          { "Pure Choropleth Boundary Heatmap": "choropleth_only" },
          { "Proportional Bubbles Scatter Only": "bubble_only" },
          { "Equal-Area Hexagonal Cartogram Grid": "hex_cartogram" }
        ],
        default: "dual_layer"
      },
      stateDimOverride: {
        type: "string",
        label: "Primary State Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      choroplethMeasureOverride: {
        type: "string",
        label: "Layer 1 (Choropleth Fill) Measure",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      bubbleMeasureOverride: {
        type: "string",
        label: "Layer 2 (Bubble Pins) Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      tertiaryMeasureOverride: {
        type: "string",
        label: "Layer 3 (Tooltip & Context) Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: ""
      },
      targetCalculationMode: {
        type: "string",
        label: "Reference Benchmark Target Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "None (No Benchmark Target)": "none" },
          { "Dataset Mean (Average of States)": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Top Decile Benchmark (P90)": "percentile_p90" },
          { "Fixed Target Value": "fixed_value" }
        ],
        default: "none"
      },
      fixedTargetValue: {
        type: "number",
        label: "Custom Fixed Target Benchmark Value",
        section: "Display",
        order: 7,
        default: 0
      },
      referenceLineLabel: {
        type: "string",
        label: "Target Benchmark Metric Label",
        section: "Display",
        order: 8,
        default: "Benchmark Target"
      },
      alertThreshold: {
        type: "number",
        label: "Underperformance Warning Threshold %",
        section: "Display",
        order: 9,
        default: 20
      },
      sortOrder: {
        type: "string",
        label: "State Ranking & Sort Order",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Choropleth Metric Descending (Highest First)": "metric_desc" },
          { "Choropleth Metric Ascending (Lowest First)": "metric_asc" },
          { "Alphabetical by State Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc"
      },
      topN: {
        type: "string",
        label: "Top-N State Focus Limit",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "All States (No Filter)": "all" },
          { "Top 10 States Only": "10" },
          { "Top 15 States Only": "15" },
          { "Top 20 States Only": "20" },
          { "Top 25 States Only": "25" }
        ],
        default: "all"
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Null States",
        section: "Display",
        order: 12,
        default: false
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Full Scorecard Strip": "full" },
          { "Compact Metric Pill": "compact" },
          { "Hidden (Maximum Map Canvas)": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Centroid Postal Code Labels",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "All States Labeled": "all" },
          { "Top 10 Peaks Only": "peaks" },
          { "On Hover / Focus Only": "hover_only" },
          { "Hidden": "hidden" }
        ],
        default: "all"
      },
      showDualLegend: {
        type: "boolean",
        label: "Show Dual-Layer Legends",
        section: "Display",
        order: 15,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive State Filter",
        section: "Display",
        order: 16,
        default: true
      },
      chartTitleOverride: {
        type: "string",
        label: "Custom Map Title Override",
        section: "Display",
        order: 17,
        default: ""
      },
      chartSubtitleOverride: {
        type: "string",
        label: "Custom Subtitle Override",
        section: "Display",
        order: 18,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Visual Palette Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise (Blue & Amber)": "google_enterprise" },
          { "Modern Executive Slate (Indigo & Slate)": "modern_slate" },
          { "Cyber NOC Dark (Cyan & Rose Neon)": "cyber_dark" },
          { "Emerald FinOps (Green & Ruby)": "emerald_finops" },
          { "Sunset Media (Amber & Violet)": "sunset_media" },
          { "Wellverse Healthcare (Teal & Coral)": "wellverse" },
          { "Custom Hex Overrides": "custom" }
        ],
        default: "google_enterprise"
      },
      primaryColorOverride: {
        type: "string",
        label: "Custom Primary Choropleth Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: ""
      },
      bubbleColorOverride: {
        type: "string",
        label: "Custom Bubble Pin Hex",
        section: "Style",
        order: 3,
        display: "color",
        default: ""
      },
      polarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Higher is Better (Revenue, Volume, Gross Margin)": "higher_better" },
          { "Lower is Better (Latency, Return Rate, Defects, Churn)": "lower_better" }
        ],
        default: "higher_better"
      },
      fontScale: {
        type: "string",
        label: "Typography & UI Scale",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Compact (Dense Dashboard Layouts)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (EBC / Video Walls)": "large" }
        ],
        default: "standard"
      },
      valueFormat1: {
        type: "string",
        label: "Layer 1 (Choropleth) Format",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Auto Detect from Measure": "auto" },
          { "Compact Currency (.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      },
      valueFormat2: {
        type: "string",
        label: "Layer 2 (Bubbles) Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto Detect from Measure": "auto" },
          { "Compact Currency (.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Numeric": "raw" }
        ],
        default: "auto"
      },
      bubbleScale: {
        type: "number",
        label: "Bubble Radius Scale Multiplier",
        section: "Style",
        order: 8,
        default: 1.2
      },
      choroplethOpacity: {
        type: "number",
        label: "Choropleth Fill Opacity",
        section: "Style",
        order: 9,
        default: 0.85
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        stateDimOverride: { role: "dimension", defaultIdx: 0 },
        choroplethMeasureOverride: { role: "measure", defaultIdx: 0 },
        bubbleMeasureOverride: { role: "measure", defaultIdx: 1 },
        tertiaryMeasureOverride: { role: "measure", defaultIdx: 2 }
      };

      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
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
        newOptions[key].values = values;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (err) {
        // Safe trigger failure catch in dev test harness
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      this._container = document.createElement("div");
      this._container.className = "looker-multi-layer-geo-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Reusable Tooltip
      var oldTooltip = document.querySelector(".multi-layer-geo-tooltip");
      if (oldTooltip) {
        this._tooltip = oldTooltip;
      } else {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "multi-layer-geo-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.padding = "10px 14px";
        this._tooltip.style.borderRadius = "8px";
        this._tooltip.style.fontSize = "12px";
        this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
        document.body.appendChild(this._tooltip);
      }
    },

    _setupLifecycleObservers: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          self._onResize(entries);
        });
        this._resizeObserver.observe(element);
      }
    },

    _onResize: function (entries) {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element || self._lastElement;
      if (!el) return;

      var curW = el.clientWidth || 0;
      var curH = el.clientHeight || 0;
      if (curW <= 10 || curH <= 10) return;

      if (self._lastWidth && self._lastHeight) {
        var dw = Math.abs(curW - self._lastWidth);
        var dh = Math.abs(curH - self._lastHeight);
        if (dw < 4 && dh < 4) return;
      }

      if (self._resizeTimer) clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () {
        if (self._lastData && self._lastQueryResponse) {
          self._lastWidth = curW;
          self._lastHeight = curH;
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

      this._registerDynamicFieldOptions(queryResponse);

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        element.style.boxSizing = "border-box";
        element.style.padding = "0";
        element.style.overflow = "hidden";

        this._container = document.createElement("div");
        this._container.className = "looker-multi-layer-geo-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.position = "relative";
        this._container.style.overflow = "hidden";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      var self = this;
      ensureDependencies(function (d3, topojson) {
        fetchUSGeoJSON(topojson, function (geoData) {
          try {
            self._render(d3, geoData, data, element, config, queryResponse);
            if (typeof done === "function") done();
          } catch (err) {
            console.error("Multi-Layer Geo Map Render Error:", err);
            if (self.addError) {
              try {
                self.addError({
                  title: "Rendering Error",
                  message: err.message || "Failed to render Dual-Axis Multi-Layer Geospatial Map."
                });
              } catch (e) {}
            }
            if (typeof done === "function") done();
          }
        });
      });
    },

    _render: function (d3, geoData, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) this._tooltip.style.display = "none";

      if (!data || !data.length) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned no data rows to visualize."
            });
          } catch (e) {}
        }
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || fields.dimension_like || [];
      var meas = fields.measures || fields.measure_like || [];
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) {
        meas = fields.table_calculations;
      }

      if (dims.length < 1 || meas.length < 1) {
        if (this.addError) {
          try {
            this.addError({
              title: "Fields Required",
              message: "Dual-Axis Map requires 1 State Dimension (e.g. users.state) and at least 1 Numeric Measure."
            });
          } catch (e) {}
        }
        return;
      }

      var stateDim = resolveField(dims, config.stateDimOverride, 0) || dims[0];
      var m1 = resolveField(meas, config.choroplethMeasureOverride, 0) || meas[0];
      var m2 = resolveField(meas, config.bubbleMeasureOverride, 1) || (meas.length > 1 ? meas[1] : meas[0]);
      var m3 = resolveField(meas, config.tertiaryMeasureOverride, 2) || (meas.length > 2 ? meas[2] : null);

      var themeKey = config.colorTheme || "google_enterprise";
      var theme = THEMES[themeKey] || THEMES.google_enterprise;

      // Handle custom hex color overrides
      if (config.primaryColorOverride && typeof d3.interpolateRgb === "function") {
        var baseC = config.primaryColorOverride;
        theme = Object.assign({}, theme, {
          choroplethRange: [
            d3.interpolateRgb("#ffffff", baseC)(0.15),
            d3.interpolateRgb("#ffffff", baseC)(0.35),
            baseC,
            d3.interpolateRgb(baseC, "#000000")(0.25),
            d3.interpolateRgb(baseC, "#000000")(0.55)
          ]
        });
      }
      if (config.bubbleColorOverride) {
        theme = Object.assign({}, theme, {
          bubbleFill: config.bubbleColorOverride,
          bubbleStroke: config.bubbleColorOverride
        });
      }

      this._container.style.backgroundColor = theme.bg;

      // Font Scale Multiplier
      var fontScale = 1.0;
      if (config.fontScale === "compact") fontScale = 0.88;
      else if (config.fontScale === "large") fontScale = 1.15;

      // ==========================================
      // 1. DATA AGGREGATION & NORMALIZATION
      // ==========================================
      var stateMetrics = {};
      var totalM1 = 0;
      var totalM2 = 0;
      var totalM3 = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var rawState = row[stateDim.name] ? row[stateDim.name].value : null;
        var code = resolveStateCode(rawState);
        if (!code) continue;

        var v1 = (m1 && row[m1.name] && !isNaN(Number(row[m1.name].value))) ? Number(row[m1.name].value) : 0;
        var v2 = (m2 && row[m2.name] && !isNaN(Number(row[m2.name].value))) ? Number(row[m2.name].value) : 0;
        var v3 = (m3 && row[m3.name] && !isNaN(Number(row[m3.name].value))) ? Number(row[m3.name].value) : 0;

        if (config.suppressNulls && v1 === 0 && v2 === 0) continue;

        if (!stateMetrics[code]) {
          stateMetrics[code] = {
            code: code,
            name: STATE_LOOKUP[code].name,
            fips: STATE_LOOKUP[code].fips,
            val1: 0,
            val2: 0,
            val3: 0,
            rowCount: 0,
            drillLinks: (row[stateDim.name] && row[stateDim.name].links) || null
          };
        }

        stateMetrics[code].val1 += v1;
        stateMetrics[code].val2 += v2;
        stateMetrics[code].val3 += v3;
        stateMetrics[code].rowCount++;
        totalM1 += v1;
        totalM2 += v2;
        totalM3 += v3;
      }

      var statesArr = Object.values(stateMetrics);
      if (!statesArr.length) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Matching State Geography",
              message: "Could not resolve any state names or postal codes in '" + stateDim.name + "'."
            });
          } catch (e) {}
        }
        return;
      }

      // Compute Benchmark Target
      var targetMode = config.targetCalculationMode || "none";
      var benchmarkTarget = null;
      var sortedVals1 = statesArr.map(function (s) { return s.val1; }).sort(function (a, b) { return a - b; });

      if (targetMode === "fixed_value") {
        benchmarkTarget = Number(config.fixedTargetValue) || 0;
      } else if (targetMode === "dataset_mean") {
        benchmarkTarget = totalM1 / statesArr.length;
      } else if (targetMode === "dataset_median") {
        benchmarkTarget = d3.quantile(sortedVals1, 0.5) || 0;
      } else if (targetMode === "percentile_p75") {
        benchmarkTarget = d3.quantile(sortedVals1, 0.75) || 0;
      } else if (targetMode === "percentile_p90") {
        benchmarkTarget = d3.quantile(sortedVals1, 0.90) || 0;
      }

      var alertThreshold = Number(config.alertThreshold) || 20;
      var isLowerBetter = (config.polarity === "lower_better");
      var onTrackCount = 0;

      statesArr.forEach(function (s) {
        if (benchmarkTarget !== null && benchmarkTarget > 0) {
          var ratio = s.val1 / benchmarkTarget;
          var onTrack = isLowerBetter ? (ratio <= 1 + alertThreshold / 100) : (ratio >= 1 - alertThreshold / 100);
          s.onTrack = onTrack;
          if (onTrack) onTrackCount++;
        }
      });

      // Sorting & Ranking
      var sortOrder = config.sortOrder || "metric_desc";
      if (sortOrder === "metric_desc") {
        statesArr.sort(function (a, b) { return b.val1 - a.val1; });
      } else if (sortOrder === "metric_asc") {
        statesArr.sort(function (a, b) { return a.val1 - b.val1; });
      } else if (sortOrder === "alphabetical") {
        statesArr.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }
      statesArr.forEach(function (s, idx) { s.rank1 = idx + 1; });

      var statesByM2 = statesArr.slice().sort(function (a, b) { return b.val2 - a.val2; });
      statesByM2.forEach(function (s, idx) { s.rank2 = idx + 1; });

      var topStateM1 = statesArr[0] || { name: "-", val1: 0 };
      var topStateM2 = statesByM2[0] || { name: "-", val2: 0 };

      // Top-N Filtering
      var topN = config.topN || "all";
      var topNMap = {};
      if (topN !== "all") {
        var limit = parseInt(topN, 10);
        statesArr.slice(0, limit).forEach(function (s) { topNMap[s.code] = true; });
      }

      var minM1 = d3.min(statesArr, function (d) { return d.val1; }) || 0;
      var maxM1 = d3.max(statesArr, function (d) { return d.val1; }) || 1;
      var minM2 = d3.min(statesArr, function (d) { return d.val2; }) || 0;
      var maxM2 = d3.max(statesArr, function (d) { return d.val2; }) || 1;

      // Color Scale for Layer 1 (Choropleth Fill)
      var choroplethScale = d3.scaleQuantize()
        .domain([minM1, maxM1])
        .range(theme.choroplethRange);

      // Bubble Scale for Layer 2 (Centroid Pins)
      var scaleMultiplier = Number(config.bubbleScale) || 1.2;
      var bubbleRadiusScale = d3.scaleSqrt()
        .domain([0, maxM2])
        .range([4 * scaleMultiplier, 22 * scaleMultiplier]);

      // ==========================================
      // 2. EXECUTIVE KPI HUD & SEARCH BAR
      // ==========================================
      var hudMode = config.hudMode || "full";
      var searchInput = null;

      if (hudMode !== "hidden") {
        var hudContainer = document.createElement("div");
        hudContainer.style.position = "absolute";
        hudContainer.style.top = "10px";
        hudContainer.style.left = "12px";
        hudContainer.style.right = "12px";
        hudContainer.style.zIndex = "10";
        hudContainer.style.display = "flex";
        hudContainer.style.alignItems = "center";
        hudContainer.style.justifyContent = "space-between";
        hudContainer.style.gap = "10px";
        hudContainer.style.pointerEvents = "none";

        var kpiCard = document.createElement("div");
        kpiCard.style.pointerEvents = "auto";
        kpiCard.style.display = "flex";
        kpiCard.style.alignItems = "center";
        kpiCard.style.flexWrap = "wrap";
        kpiCard.style.gap = (10 * fontScale) + "px";
        kpiCard.style.padding = (6 * fontScale) + "px " + (14 * fontScale) + "px";
        kpiCard.style.background = theme.hudBg;
        kpiCard.style.border = "1px solid " + theme.hudBorder;
        kpiCard.style.borderRadius = "8px";
        kpiCard.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        kpiCard.style.fontSize = (11.5 * fontScale) + "px";
        kpiCard.style.color = theme.text;

        var hudHTML = "";

        // Custom Title / Subtitle
        if (config.chartTitleOverride) {
          hudHTML +=
            '<div style="display:flex; flex-direction:column; margin-right:4px;">' +
              '<span style="font-weight:700; font-size:' + (12.5 * fontScale) + 'px; color:' + theme.text + ';">' + config.chartTitleOverride + '</span>' +
              (config.chartSubtitleOverride ? '<span style="font-size:' + (10 * fontScale) + 'px; color:' + theme.subtext + ';">' + config.chartSubtitleOverride + '</span>' : '') +
            '</div>' +
            '<div style="width:1px; height:18px; background:' + theme.hudBorder + ';"></div>';
        }

        if (hudMode === "full") {
          hudHTML +=
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="font-size:' + (13 * fontScale) + 'px;">🗺️</span>' +
              '<span>States: <strong>' + statesArr.length + ' Active</strong></span>' +
            '</div>' +
            '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="width:10px; height:10px; border-radius:2px; background:' + theme.choroplethRange[theme.choroplethRange.length - 1] + '; display:inline-block;"></span>' +
              '<span>' + (m1.label_short || m1.label || m1.name) + ': <strong>' + formatValue(totalM1, config.valueFormat1, m1) + '</strong></span>' +
            '</div>' +
            '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="width:10px; height:10px; border-radius:50%; background:' + theme.bubbleFill + '; display:inline-block;"></span>' +
              '<span>' + (m2.label_short || m2.label || m2.name) + ': <strong>' + formatValue(totalM2, config.valueFormat2, m2) + '</strong></span>' +
            '</div>' +
            '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span>Top State: <strong style="color:' + theme.text + ';">' + topStateM1.name + '</strong></span>' +
            '</div>';

          if (benchmarkTarget !== null) {
            var pctOnTrack = ((onTrackCount / statesArr.length) * 100).toFixed(0);
            var badgeColor = onTrackCount >= (statesArr.length * 0.7) ? "#16a34a" : "#dc2626";
            hudHTML +=
              '<div style="width:1px; height:16px; background:' + theme.hudBorder + ';"></div>' +
              '<div style="display:flex; align-items:center; gap:6px;">' +
                '<span>🎯 ' + (config.referenceLineLabel || "Target") + ': <strong>' + formatValue(benchmarkTarget, config.valueFormat1, m1) + '</strong></span>' +
                '<span style="background:' + badgeColor + '1a; color:' + badgeColor + '; padding:1px 6px; border-radius:4px; font-weight:700; font-size:' + (10 * fontScale) + 'px;">' + onTrackCount + '/' + statesArr.length + ' (' + pctOnTrack + '%)</span>' +
              '</div>';
          }
        } else {
          // Compact HUD mode
          hudHTML +=
            '<span>🗺️ <strong>' + statesArr.length + ' States</strong></span>' +
            '<span style="color:' + theme.subtext + ';">•</span>' +
            '<span>' + (m1.label_short || m1.label || m1.name) + ': <strong>' + formatValue(totalM1, config.valueFormat1, m1) + '</strong></span>' +
            '<span style="color:' + theme.subtext + ';">•</span>' +
            '<span>' + (m2.label_short || m2.label || m2.name) + ': <strong>' + formatValue(totalM2, config.valueFormat2, m2) + '</strong></span>';
        }

        kpiCard.innerHTML = hudHTML;
        hudContainer.appendChild(kpiCard);

        // Search Box
        if (config.showSearch !== false) {
          var searchBox = document.createElement("div");
          searchBox.style.pointerEvents = "auto";
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.padding = (5 * fontScale) + "px " + (10 * fontScale) + "px";
          searchBox.style.background = theme.hudBg;
          searchBox.style.border = "1px solid " + theme.hudBorder;
          searchBox.style.borderRadius = "8px";
          searchBox.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";

          searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Search State...";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.outline = "none";
          searchInput.style.fontSize = (11 * fontScale) + "px";
          searchInput.style.color = theme.text;
          searchInput.style.width = (150 * fontScale) + "px";

          searchBox.appendChild(searchInput);
          hudContainer.appendChild(searchBox);
        }

        this._container.appendChild(hudContainer);
      }

      // ==========================================
      // 3. SVG & PROJECTION SETUP
      // ==========================================
      var containerRect = this._container.getBoundingClientRect();
      var width = Math.max(400, containerRect.width);
      var height = Math.max(300, containerRect.height);

      var svg = d3.select(this._container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block")
        .style("user-select", "none");

      var gRoot = svg.append("g").attr("class", "map-root");

      var zoomBehavior = d3.zoom()
        .scaleExtent([0.8, 6])
        .on("zoom", function (event) {
          gRoot.attr("transform", event.transform);
        });

      svg.call(zoomBehavior);

      // Navigation Controls
      var navControls = document.createElement("div");
      navControls.style.position = "absolute";
      navControls.style.bottom = "16px";
      navControls.style.right = "16px";
      navControls.style.zIndex = "10";
      navControls.style.display = "flex";
      navControls.style.flexDirection = "column";
      navControls.style.gap = "6px";

      function createNavBtn(icon, title, onClick) {
        var btn = document.createElement("button");
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.width = "32px";
        btn.style.height = "32px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.background = theme.hudBg;
        btn.style.border = "1px solid " + theme.hudBorder;
        btn.style.borderRadius = "6px";
        btn.style.color = theme.text;
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
        btn.onclick = onClick;
        return btn;
      }

      navControls.appendChild(createNavBtn("➕", "Zoom In", function () {
        svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
      }));
      navControls.appendChild(createNavBtn("➖", "Zoom Out", function () {
        svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.77);
      }));
      navControls.appendChild(createNavBtn("⟲", "Reset View", function () {
        svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
      }));
      this._container.appendChild(navControls);

      var mapMode = config.mapMode || "dual_layer";

      // ==========================================
      // 4. MAP RENDERING (ALBERS USA VS HEX CARTOGRAM)
      // ==========================================
      var statePaths = null;
      var bubbleGroups = null;

      if (mapMode === "hex_cartogram") {
        var hexSide = Math.min(width / 14, height / 10) * 0.9;
        var hexRadius = hexSide;
        var hexW = Math.sqrt(3) * hexRadius;
        var hexH = 2 * hexRadius;
        var startX = (width - (11 * hexW)) / 2;
        var startY = (height - (8 * hexH * 0.75)) / 2 + 30;

        function getHexCenter(q, r) {
          var cx = startX + (q * hexW) + (r % 2 === 1 ? (hexW / 2) : 0);
          var cy = startY + (r * hexH * 0.75);
          return [cx, cy];
        }

        function hexPolygonPoints(cx, cy, r) {
          var pts = [];
          for (var a = 0; a < 6; a++) {
            var angle = (Math.PI / 180) * (60 * a - 30);
            pts.push((cx + r * Math.cos(angle)).toFixed(1) + "," + (cy + r * Math.sin(angle)).toFixed(1));
          }
          return pts.join(" ");
        }

        var hexG = gRoot.append("g").attr("class", "hex-grid-layer");

        var hexData = Object.keys(STATE_LOOKUP).map(function (code) {
          var sMeta = STATE_LOOKUP[code];
          var center = getHexCenter(sMeta.hex.q, sMeta.hex.r);
          var mData = stateMetrics[code] || { code: code, name: sMeta.name, val1: 0, val2: 0, rank1: 99, rank2: 99 };
          var isTopN = topN === "all" || Boolean(topNMap[code]);
          return {
            code: code,
            name: sMeta.name,
            center: center,
            metric: mData,
            isTopN: isTopN
          };
        });

        // Draw Hex Polygons
        statePaths = hexG.selectAll("polygon.hex-cell")
          .data(hexData)
          .enter()
          .append("polygon")
          .attr("class", "hex-cell")
          .attr("points", function (d) { return hexPolygonPoints(d.center[0], d.center[1], hexRadius * 0.94); })
          .attr("fill", function (d) {
            if (mapMode === "bubble_only") return theme.stateEmpty;
            if (topN !== "all" && !d.isTopN) return theme.stateEmpty;
            return d.metric.val1 > 0 ? choroplethScale(d.metric.val1) : theme.stateEmpty;
          })
          .attr("fill-opacity", Number(config.choroplethOpacity) || 0.85)
          .attr("stroke", theme.stateBorder)
          .attr("stroke-width", 2)
          .style("cursor", "pointer");

        // Centroid Bubbles for Hex
        bubbleGroups = hexG.selectAll("g.hex-bubble")
          .data(hexData)
          .enter()
          .append("g")
          .attr("class", "hex-bubble")
          .attr("transform", function (d) { return "translate(" + d.center[0] + "," + d.center[1] + ")"; })
          .style("cursor", "pointer");

        if (mapMode !== "choropleth_only") {
          bubbleGroups.append("circle")
            .attr("r", function (d) {
              if (topN !== "all" && !d.isTopN) return 0;
              return d.metric.val2 > 0 ? bubbleRadiusScale(d.metric.val2) : (hexRadius * 0.3);
            })
            .attr("fill", theme.bubbleFill)
            .attr("fill-opacity", 0.85)
            .attr("stroke", theme.bubbleStroke)
            .attr("stroke-width", 1.8);
        }

        var labelDensity = config.labelDensity || "all";
        if (labelDensity !== "hidden") {
          bubbleGroups.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("font-size", (11 * fontScale) + "px")
            .attr("font-weight", "700")
            .attr("fill", mapMode === "choropleth_only" ? (theme.isDark ? "#ffffff" : "#0f172a") : theme.bubbleText)
            .style("pointer-events", "none")
            .style("opacity", function (d) {
              if (labelDensity === "hover_only") return 0;
              if (labelDensity === "peaks" && d.metric.rank1 > 10) return 0;
              return 1;
            })
            .text(function (d) { return d.code; });
        }

      } else {
        // Albers USA Geometric Projection
        var projection = d3.geoAlbersUsa()
          .scale(Math.min(width * 1.15, height * 1.5))
          .translate([width / 2, height / 2 + 15]);

        var pathGenerator = d3.geoPath().projection(projection);

        var features = geoData ? geoData.features : [];

        var validFeatures = features.map(function (feat) {
          var code = FIPS_TO_CODE[feat.id];
          var sMeta = code ? STATE_LOOKUP[code] : null;
          var mData = code ? (stateMetrics[code] || { code: code, name: sMeta ? sMeta.name : "Unknown", val1: 0, val2: 0, rank1: 99, rank2: 99 }) : null;
          var centroid = pathGenerator.centroid(feat);
          var isTopN = topN === "all" || Boolean(topNMap[code]);
          return {
            feature: feat,
            code: code,
            name: sMeta ? sMeta.name : (feat.properties ? feat.properties.name : "Unknown"),
            metric: mData,
            centroid: centroid,
            isTopN: isTopN
          };
        }).filter(function (d) { return d.code && !isNaN(d.centroid[0]); });

        var stateLayer = gRoot.append("g").attr("class", "state-polygons-layer");
        var bubbleLayer = gRoot.append("g").attr("class", "bubble-pins-layer");

        // Draw State Polygons (Layer 1)
        statePaths = stateLayer.selectAll("path.state-poly")
          .data(validFeatures)
          .enter()
          .append("path")
          .attr("class", "state-poly")
          .attr("d", function (d) { return pathGenerator(d.feature); })
          .attr("fill", function (d) {
            if (mapMode === "bubble_only") return theme.stateEmpty;
            if (topN !== "all" && !d.isTopN) return theme.stateEmpty;
            return (d.metric && d.metric.val1 > 0) ? choroplethScale(d.metric.val1) : theme.stateEmpty;
          })
          .attr("fill-opacity", Number(config.choroplethOpacity) || 0.85)
          .attr("stroke", theme.stateBorder)
          .attr("stroke-width", 1.2)
          .style("cursor", "pointer")
          .style("transition", "stroke 0.15s ease, stroke-width 0.15s ease");

        // Draw Proportional Centroid Bubbles (Layer 2)
        bubbleGroups = bubbleLayer.selectAll("g.bubble-pin")
          .data(validFeatures.filter(function (d) { return d.metric && d.metric.val2 > 0 && (topN === "all" || d.isTopN); }))
          .enter()
          .append("g")
          .attr("class", "bubble-pin")
          .attr("transform", function (d) { return "translate(" + d.centroid[0] + "," + d.centroid[1] + ")"; })
          .style("cursor", "pointer");

        if (mapMode !== "choropleth_only") {
          bubbleGroups.append("circle")
            .attr("r", function (d) { return bubbleRadiusScale(d.metric.val2); })
            .attr("fill", theme.bubbleFill)
            .attr("fill-opacity", 0.85)
            .attr("stroke", theme.bubbleStroke)
            .attr("stroke-width", 1.5)
            .style("transition", "transform 0.15s ease");

          var labelDensity = config.labelDensity || "all";
          if (labelDensity !== "hidden") {
            bubbleGroups.append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .attr("font-size", function (d) { return (Math.max(9, Math.min(12, bubbleRadiusScale(d.metric.val2) * 0.85)) * fontScale) + "px"; })
              .attr("font-weight", "700")
              .attr("fill", theme.bubbleText)
              .style("pointer-events", "none")
              .style("opacity", function (d) {
                if (labelDensity === "hover_only") return 0;
                if (labelDensity === "peaks" && d.metric.rank1 > 10) return 0;
                return 1;
              })
              .text(function (d) { return d.code; });
          }
        }
      }

      // ==========================================
      // 5. INTERACTIVE HOVER CARDS & DRILL-DOWNS
      // ==========================================
      function handleMouseEnter(event, d) {
        var sCode = d.code;
        var sName = d.name;
        var mData = d.metric || (stateMetrics[sCode] || { val1: 0, val2: 0, val3: 0, rank1: "-", rank2: "-" });

        statePaths.attr("stroke", function (p) { return p.code === sCode ? theme.text : theme.stateBorder; })
          .attr("stroke-width", function (p) { return p.code === sCode ? 2.5 : 1.2; });

        if (bubbleGroups) {
          bubbleGroups.selectAll("circle").attr("stroke-width", function (b) { return b.code === sCode ? 3 : 1.5; });
          if (config.labelDensity === "hover_only") {
            bubbleGroups.selectAll("text").style("opacity", function (b) { return b.code === sCode ? 1 : 0; });
          }
        }

        var tt = self._tooltip;
        tt.style.background = theme.hudBg;
        tt.style.color = theme.text;
        tt.style.border = "1px solid " + theme.border;

        var pct1 = totalM1 > 0 ? ((mData.val1 / totalM1) * 100).toFixed(1) + "%" : "0%";
        var pct2 = totalM2 > 0 ? ((mData.val2 / totalM2) * 100).toFixed(1) + "%" : "0%";

        var targetHTML = "";
        if (benchmarkTarget !== null && benchmarkTarget > 0) {
          var variancePct = (((mData.val1 - benchmarkTarget) / benchmarkTarget) * 100).toFixed(1);
          var varSign = Number(variancePct) > 0 ? "+" : "";
          var isVarianceGood = isLowerBetter ? (Number(variancePct) <= 0) : (Number(variancePct) >= 0);
          var varianceColor = isVarianceGood ? "#16a34a" : "#dc2626";
          targetHTML =
            '<div style="display:grid; grid-template-columns:auto 1fr; gap:6px 12px; font-size:11px; margin-top:4px; padding-top:4px; border-top:1px dashed ' + theme.border + ';">' +
              '<span style="color:' + theme.subtext + ';">' + (config.referenceLineLabel || "Benchmark Target") + ':</span>' +
              '<strong style="text-align:right; color:' + varianceColor + ';">' + formatValue(benchmarkTarget, config.valueFormat1, m1) + ' (' + varSign + variancePct + '%)</strong>' +
            '</div>';
        }

        var tertiaryHTML = "";
        if (m3 && mData.val3 !== undefined && mData.val3 !== 0) {
          tertiaryHTML =
            '<span style="color:' + theme.subtext + ';">' + (m3.label_short || m3.label || m3.name) + ':</span>' +
            '<strong style="text-align:right;">' + formatValue(mData.val3, config.valueFormat2, m3) + '</strong>';
        }

        tt.innerHTML =
          '<div style="font-size:13px; font-weight:700; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
            '<span>📍 ' + sName + ' (' + sCode + ')</span>' +
            (mData.onTrack !== undefined ? ('<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:' + (mData.onTrack ? '#16a34a1a; color:#16a34a' : '#dc26261a; color:#dc2626') + '; font-weight:700;">' + (mData.onTrack ? 'ON TRACK' : 'ALERT') + '</span>') : '') +
          '</div>' +
          '<div style="display:grid; grid-template-columns:auto 1fr; gap:6px 12px; font-size:11.5px; border-top:1px solid ' + theme.border + '; padding-top:6px;">' +
            '<span style="color:' + theme.subtext + ';">' + (m1.label_short || m1.label || m1.name) + ' (Choropleth):</span>' +
            '<strong style="text-align:right;">' + formatValue(mData.val1, config.valueFormat1, m1) + ' (' + pct1 + ', Rank #' + (mData.rank1 || "-") + ')</strong>' +
            '<span style="color:' + theme.subtext + ';">' + (m2.label_short || m2.label || m2.name) + ' (Bubble):</span>' +
            '<strong style="text-align:right; color:' + theme.bubbleStroke + ';">' + formatValue(mData.val2, config.valueFormat2, m2) + ' (' + pct2 + ', Rank #' + (mData.rank2 || "-") + ')</strong>' +
            tertiaryHTML +
          '</div>' +
          targetHTML +
          (mData.drillLinks ? '<div style="margin-top:6px; font-size:11px; color:#2563eb;">Click to drill down &rarr;</div>' : '');

        tt.style.display = "block";
        tt.style.opacity = "1";
      }

      function handleMouseMove(event) {
        var tt = self._tooltip;
        var x = event.clientX + 14;
        var y = event.clientY - 20;
        if (x + 280 > window.innerWidth) x = event.clientX - 290;
        if (y + 160 > window.innerHeight) y = event.clientY - 160;
        tt.style.left = x + "px";
        tt.style.top = y + "px";
      }

      function handleMouseLeave() {
        statePaths.attr("stroke", theme.stateBorder).attr("stroke-width", 1.2);
        if (bubbleGroups) {
          bubbleGroups.selectAll("circle").attr("stroke-width", 1.5);
          if (config.labelDensity === "hover_only") {
            bubbleGroups.selectAll("text").style("opacity", 0);
          }
        }
        self._tooltip.style.display = "none";
        self._tooltip.style.opacity = "0";
      }

      function handleClick(event, d) {
        var mData = d.metric || (stateMetrics[d.code] || {});
        if (mData.drillLinks && window.LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: mData.drillLinks,
            event: event
          });
        }
      }

      statePaths
        .on("mouseenter", handleMouseEnter)
        .on("mousemove", handleMouseMove)
        .on("mouseleave", handleMouseLeave)
        .on("click", handleClick);

      if (bubbleGroups) {
        bubbleGroups
          .on("mouseenter", handleMouseEnter)
          .on("mousemove", handleMouseMove)
          .on("mouseleave", handleMouseLeave)
          .on("click", handleClick);
      }

      // Search Box Interaction
      if (searchInput) {
        searchInput.oninput = function () {
          var q = searchInput.value.toLowerCase().trim();
          if (!q) {
            statePaths.attr("stroke", theme.stateBorder).attr("stroke-width", 1.2).attr("opacity", 1);
            if (bubbleGroups) bubbleGroups.attr("opacity", 1);
            return;
          }

          statePaths.attr("opacity", function (p) {
            var m = p.code.toLowerCase().indexOf(q) !== -1 || p.name.toLowerCase().indexOf(q) !== -1;
            return m ? 1 : 0.15;
          }).attr("stroke", function (p) {
            var m = p.code.toLowerCase().indexOf(q) !== -1 || p.name.toLowerCase().indexOf(q) !== -1;
            return m ? theme.text : theme.stateBorder;
          }).attr("stroke-width", function (p) {
            var m = p.code.toLowerCase().indexOf(q) !== -1 || p.name.toLowerCase().indexOf(q) !== -1;
            return m ? 2.5 : 1.2;
          });

          if (bubbleGroups) {
            bubbleGroups.attr("opacity", function (b) {
              var m = b.code.toLowerCase().indexOf(q) !== -1 || b.name.toLowerCase().indexOf(q) !== -1;
              return m ? 1 : 0.15;
            });
          }
        };
      }

      // ==========================================
      // 6. DUAL-AXIS LEGENDS
      // ==========================================
      if (config.showDualLegend !== false) {
        var legendBox = document.createElement("div");
        legendBox.style.position = "absolute";
        legendBox.style.bottom = "16px";
        legendBox.style.left = "16px";
        legendBox.style.zIndex = "10";
        legendBox.style.background = theme.hudBg;
        legendBox.style.border = "1px solid " + theme.hudBorder;
        legendBox.style.borderRadius = "8px";
        legendBox.style.padding = (8 * fontScale) + "px " + (12 * fontScale) + "px";
        legendBox.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        legendBox.style.fontSize = (10.5 * fontScale) + "px";
        legendBox.style.color = theme.text;
        legendBox.style.display = "flex";
        legendBox.style.flexDirection = "column";
        legendBox.style.gap = "6px";

        // Choropleth Legend
        var choroTitle = document.createElement("div");
        choroTitle.style.fontWeight = "700";
        choroTitle.textContent = (m1.label_short || m1.label || m1.name) + " (Fill)";
        legendBox.appendChild(choroTitle);

        var rampContainer = document.createElement("div");
        rampContainer.style.display = "flex";
        rampContainer.style.alignItems = "center";
        rampContainer.style.gap = "3px";

        theme.choroplethRange.forEach(function (color) {
          var block = document.createElement("div");
          block.style.width = (20 * fontScale) + "px";
          block.style.height = "9px";
          block.style.background = color;
          block.style.borderRadius = "2px";
          rampContainer.appendChild(block);
        });
        legendBox.appendChild(rampContainer);

        var labelRow = document.createElement("div");
        labelRow.style.display = "flex";
        labelRow.style.justifyContent = "space-between";
        labelRow.style.fontSize = (9.5 * fontScale) + "px";
        labelRow.style.color = theme.subtext;
        labelRow.innerHTML = "<span>" + formatValue(minM1, config.valueFormat1, m1) + "</span><span>" + formatValue(maxM1, config.valueFormat1, m1) + "</span>";
        legendBox.appendChild(labelRow);

        // Bubble Scale Legend
        if (mapMode !== "choropleth_only") {
          var bubbleDivider = document.createElement("div");
          bubbleDivider.style.height = "1px";
          bubbleDivider.style.background = theme.hudBorder;
          legendBox.appendChild(bubbleDivider);

          var bubbleTitle = document.createElement("div");
          bubbleTitle.style.fontWeight = "700";
          bubbleTitle.style.display = "flex";
          bubbleTitle.style.alignItems = "center";
          bubbleTitle.style.gap = "6px";
          bubbleTitle.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:' + theme.bubbleFill + '; display:inline-block;"></span><span>' + (m2.label_short || m2.label || m2.name) + " (Bubble Size)</span>";
          legendBox.appendChild(bubbleTitle);

          var bubbleExamples = document.createElement("div");
          bubbleExamples.style.display = "flex";
          bubbleExamples.style.alignItems = "center";
          bubbleExamples.style.gap = "10px";
          bubbleExamples.style.marginTop = "2px";

          [0.25, 0.65, 1.0].forEach(function (frac) {
            var val = maxM2 * frac;
            var r = bubbleRadiusScale(val);
            var bContainer = document.createElement("div");
            bContainer.style.display = "flex";
            bContainer.style.alignItems = "center";
            bContainer.style.gap = "4px";

            var dot = document.createElement("div");
            dot.style.width = (r * 2) + "px";
            dot.style.height = (r * 2) + "px";
            dot.style.borderRadius = "50";
            dot.style.background = theme.bubbleFill;
            dot.style.border = "1px solid " + theme.bubbleStroke;

            var txt = document.createElement("span");
            txt.style.fontSize = (9 * fontScale) + "px";
            txt.style.color = theme.subtext;
            txt.textContent = formatValue(val, config.valueFormat2, m2);

            bContainer.appendChild(dot);
            bContainer.appendChild(txt);
            bubbleExamples.appendChild(bContainer);
          });

          legendBox.appendChild(bubbleExamples);
        }

        this._container.appendChild(legendBox);
      }
    }
  });
})();
