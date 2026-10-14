/**
 * Geospatial Flow & Route Arc Map - Looker Custom Visualization
 * Built with D3.js v7 & TopoJSON Client
 *
 * Multi-Modal Geospatial Flow & Route Intelligence:
 * - Multi-Mode Layouts: Bézier Flow Arcs, Hub & Spoke Radial, Hexbin Density, or Destination Choropleth Overlay
 * - 5,000+ Row Scalability: High-performance client-side aggregation, Top-N filtering, and thresholding
 * - Interactive Pan & Zoom with floating navigation controls and extent reset
 * - Origin Hub Selector and dynamic live-search filter
 * - Animated glowing flow particles traversing routes
 * - Executive HUD summary bar with key network metrics
 * - Glassmorphism tooltips with volume rank, network share, and Looker drill-down integration
 */

(function () {
  var US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  // Complete US State dictionary with official FIPS, names, and geographic centroids [lng, lat]
  var STATE_LOOKUP = {
    "AL": { name: "Alabama", fips: "01", coords: [-86.9023, 32.8067] },
    "AK": { name: "Alaska", fips: "02", coords: [-152.4044, 61.3707] },
    "AZ": { name: "Arizona", fips: "04", coords: [-111.4312, 34.0489] },
    "AR": { name: "Arkansas", fips: "05", coords: [-92.3731, 35.2010] },
    "CA": { name: "California", fips: "06", coords: [-119.4179, 36.7783] },
    "CO": { name: "Colorado", fips: "08", coords: [-105.7821, 39.5501] },
    "CT": { name: "Connecticut", fips: "09", coords: [-72.7554, 41.6032] },
    "DE": { name: "Delaware", fips: "10", coords: [-75.5277, 39.0067] },
    "DC": { name: "District of Columbia", fips: "11", coords: [-77.0369, 38.9072] },
    "FL": { name: "Florida", fips: "12", coords: [-81.5158, 27.6648] },
    "GA": { name: "Georgia", fips: "13", coords: [-83.6431, 32.1656] },
    "HI": { name: "Hawaii", fips: "15", coords: [-157.8583, 21.3069] },
    "ID": { name: "Idaho", fips: "16", coords: [-114.7420, 44.0682] },
    "IL": { name: "Illinois", fips: "17", coords: [-89.3985, 40.6331] },
    "IN": { name: "Indiana", fips: "18", coords: [-86.1349, 40.2672] },
    "IA": { name: "Iowa", fips: "19", coords: [-93.0977, 41.8780] },
    "KS": { name: "Kansas", fips: "20", coords: [-98.4842, 39.0119] },
    "KY": { name: "Kentucky", fips: "21", coords: [-84.2700, 37.8393] },
    "LA": { name: "Louisiana", fips: "22", coords: [-91.9623, 30.9843] },
    "ME": { name: "Maine", fips: "23", coords: [-69.4455, 45.2538] },
    "MD": { name: "Maryland", fips: "24", coords: [-76.6413, 39.0458] },
    "MA": { name: "Massachusetts", fips: "25", coords: [-71.3824, 42.4072] },
    "MI": { name: "Michigan", fips: "26", coords: [-85.6024, 44.3148] },
    "MN": { name: "Minnesota", fips: "27", coords: [-94.6859, 46.7296] },
    "MS": { name: "Mississippi", fips: "28", coords: [-89.3985, 32.3547] },
    "MO": { name: "Missouri", fips: "29", coords: [-91.8318, 37.9643] },
    "MT": { name: "Montana", fips: "30", coords: [-110.3626, 46.8797] },
    "NE": { name: "Nebraska", fips: "31", coords: [-99.9018, 41.4925] },
    "NV": { name: "Nevada", fips: "32", coords: [-116.4194, 38.8026] },
    "NH": { name: "New Hampshire", fips: "33", coords: [-71.5724, 43.1939] },
    "NJ": { name: "New Jersey", fips: "34", coords: [-74.4057, 40.0583] },
    "NM": { name: "New Mexico", fips: "35", coords: [-105.8701, 34.5199] },
    "NY": { name: "New York", fips: "36", coords: [-75.5268, 43.2994] },
    "NC": { name: "North Carolina", fips: "37", coords: [-79.0193, 35.7596] },
    "ND": { name: "North Dakota", fips: "38", coords: [-101.0020, 47.5515] },
    "OH": { name: "Ohio", fips: "39", coords: [-82.9071, 40.4173] },
    "OK": { name: "Oklahoma", fips: "40", coords: [-97.0929, 35.0078] },
    "OR": { name: "Oregon", fips: "41", coords: [-120.5542, 43.8041] },
    "PA": { name: "Pennsylvania", fips: "42", coords: [-77.1945, 41.2033] },
    "RI": { name: "Rhode Island", fips: "44", coords: [-71.4774, 41.5801] },
    "SC": { name: "South Carolina", fips: "45", coords: [-81.1637, 33.8361] },
    "SD": { name: "South Dakota", fips: "46", coords: [-99.9018, 43.9695] },
    "TN": { name: "Tennessee", fips: "47", coords: [-86.5804, 35.5175] },
    "TX": { name: "Texas", fips: "48", coords: [-99.9018, 31.9686] },
    "UT": { name: "Utah", fips: "49", coords: [-111.0937, 39.3210] },
    "VT": { name: "Vermont", fips: "50", coords: [-72.5778, 44.5588] },
    "VA": { name: "Virginia", fips: "51", coords: [-78.6569, 37.4316] },
    "WA": { name: "Washington", fips: "53", coords: [-120.7401, 47.7511] },
    "WV": { name: "West Virginia", fips: "54", coords: [-80.4549, 38.5976] },
    "WI": { name: "Wisconsin", fips: "55", coords: [-89.6165, 43.7844] },
    "WY": { name: "Wyoming", fips: "56", coords: [-107.2903, 43.0760] }
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

  function resolveCoords(stateOrCity, latVal, lonVal) {
    var lat = parseFloat(latVal);
    var lon = parseFloat(lonVal);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return [lon, lat];
    }
    var stCode = resolveStateCode(stateOrCity);
    if (stCode && STATE_LOOKUP[stCode]) {
      return STATE_LOOKUP[stCode].coords;
    }
    return null;
  }

  var PALETTES = {
    cyber_dark: {
      name: "Cyberpunk Dark (NOC / SecOps)",
      bg: "#0b0f19",
      land: "#1e293b",
      landStroke: "#334155",
      originHub: "#38bdf8",
      destNode: "#ec4899",
      arcPrimary: "#38bdf8",
      arcSecondary: "#818cf8",
      particle: "#67e8f9",
      hudBg: "rgba(15, 23, 42, 0.92)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      hudBorder: "rgba(51, 65, 85, 0.7)",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8",
      textColor: "#e2e8f0",
      palette: ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#fb923c", "#34d399", "#2dd4bf", "#a78bfa"]
    },
    google_enterprise: {
      name: "Google Enterprise",
      bg: "#ffffff",
      land: "#f1f3f4",
      landStroke: "#dadce0",
      originHub: "#1a73e8",
      destNode: "#ea4335",
      arcPrimary: "#1a73e8",
      arcSecondary: "#4285f4",
      particle: "#1a73e8",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      hudBorder: "#dadce0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8",
      textColor: "#202124",
      palette: ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9c27b0", "#00acc1", "#ff7043", "#5c6bc0"]
    },
    modern_slate: {
      name: "Modern Slate",
      bg: "#f8fafc",
      land: "#e2e8f0",
      landStroke: "#cbd5e1",
      originHub: "#0284c7",
      destNode: "#e11d48",
      arcPrimary: "#0284c7",
      arcSecondary: "#4f46e5",
      particle: "#0284c7",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      hudBorder: "#cbd5e1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0284c7",
      textColor: "#0f172a",
      palette: ["#0284c7", "#2563eb", "#0d9488", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#6366f1"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      bg: "#ffffff",
      land: "#ecfdf5",
      landStroke: "#a7f3d0",
      originHub: "#059669",
      destNode: "#047857",
      arcPrimary: "#059669",
      arcSecondary: "#10b981",
      particle: "#059669",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      hudBorder: "#a7f3d0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669",
      textColor: "#064e3b",
      palette: ["#059669", "#10b981", "#047857", "#0d9488", "#14b8a6", "#0f766e", "#34d399", "#6ee7b7"]
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      bg: "#ffffff",
      land: "#fff7ed",
      landStroke: "#fed7aa",
      originHub: "#ea580c",
      destNode: "#e11d48",
      arcPrimary: "#ea580c",
      arcSecondary: "#f97316",
      particle: "#ea580c",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudText: "#431407",
      hudSubtext: "#7c2d12",
      hudBorder: "#fed7aa",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#ea580c",
      textColor: "#431407",
      palette: ["#f97316", "#ef4444", "#e11d48", "#be123c", "#fb923c", "#f59e0b", "#d97706", "#b45309"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      bg: "#ffffff",
      land: "#f0fdf4",
      landStroke: "#bbf7d0",
      originHub: "#143359",
      destNode: "#00af68",
      arcPrimary: "#143359",
      arcSecondary: "#2e7cf6",
      particle: "#00af68",
      hudBg: "rgba(255, 255, 255, 0.96)",
      hudText: "#143359",
      hudSubtext: "#64748b",
      hudBorder: "#cbd5e1",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#143359",
      textColor: "#143359",
      palette: ["#143359", "#00af68", "#2e7cf6", "#ffb500", "#7c5cfc", "#14b8a6", "#e5484d", "#94a3b8"]
    },
    ocean_blue: {
      name: "Ocean Maritime",
      bg: "#022c43",
      land: "#053f5e",
      landStroke: "#115173",
      originHub: "#ffd700",
      destNode: "#ff7e67",
      arcPrimary: "#ffd700",
      arcSecondary: "#00adb5",
      particle: "#ffffff",
      hudBg: "rgba(5, 63, 94, 0.92)",
      hudText: "#ffffff",
      hudSubtext: "#9fd3c7",
      hudBorder: "#115173",
      tooltipBg: "rgba(2, 44, 67, 0.96)",
      tooltipBorder: "#ffd700",
      textColor: "#ffffff",
      palette: ["#ffd700", "#ff7e67", "#00adb5", "#eeeeee", "#393e46", "#00fff5", "#0077b6", "#90e0ef"]
    },
    custom_override: {
      name: "Custom Hex Override",
      bg: "#0f172a",
      land: "#1e293b",
      landStroke: "#334155",
      originHub: "#38bdf8",
      destNode: "#ec4899",
      arcPrimary: "#38bdf8",
      arcSecondary: "#818cf8",
      particle: "#67e8f9",
      hudBg: "rgba(15, 23, 42, 0.92)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      hudBorder: "rgba(51, 65, 85, 0.7)",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8",
      textColor: "#e2e8f0",
      palette: ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#fb923c", "#34d399", "#2dd4bf", "#a78bfa"]
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
    return defaultIdx >= 0 ? (list[defaultIdx] || list[0]) : null;
  }

  function formatValue(val, fmt, rendered) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    if (fmt === "auto" && rendered) return rendered;
    var num = parseFloat(val);
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";
    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "compact_num":
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toLocaleString();
      case "percentage":
        return sign + (abs * (abs <= 1 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (rendered) return rendered;
        return abs >= 100 ? sign + Math.round(abs).toLocaleString() : sign + abs.toFixed(2);
    }
  }

  // Load external libraries if not already in window
  function ensureDependencies(callback) {
    var hasD3 = window.d3 && typeof window.d3.geoPath === "function";
    var hasTopo = window.topojson && typeof window.topojson.feature === "function";

    if (hasD3 && hasTopo) {
      callback(window.d3, window.topojson);
      return;
    }

    var pending = 0;
    function checkDone() {
      if (pending === 0 && window.d3 && window.topojson) {
        callback(window.d3, window.topojson);
      }
    }

    if (!hasD3) {
      pending++;
      var sD3 = document.createElement("script");
      sD3.src = "https://d3js.org/d3.v7.min.js";
      sD3.onload = function () { pending--; checkDone(); };
      document.head.appendChild(sD3);
    }
    if (!hasTopo) {
      pending++;
      var sTopo = document.createElement("script");
      sTopo.src = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js";
      sTopo.onload = function () { pending--; checkDone(); };
      document.head.appendChild(sTopo);
    }
  }

  var cachedTopoData = null;
  function fetchTopoJson(callback) {
    if (cachedTopoData) {
      callback(cachedTopoData);
      return;
    }
    if (window.d3 && window.d3.json) {
      window.d3.json(US_TOPOJSON_URL).then(function (data) {
        cachedTopoData = data;
        callback(data);
      }).catch(function (err) {
        console.warn("FlowArcMap: Failed to fetch TopoJSON, falling back to pure geo coordinate projection", err);
        callback(null);
      });
    } else {
      callback(null);
    }
  }

  looker.plugins.visualizations.add({
    id: "flow_arc_map",
    label: "Geospatial Flow & Route Arc Map",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Map Flow Layout",
        display: "select",
        values: [
          { "Bézier Flow Arcs": "curved_arcs" },
          { "Hub & Spoke Radial": "hub_spoke" },
          { "Hexbin Density Grid": "hexbin_density" },
          { "Choropleth Corridor": "choropleth_overlay" }
        ],
        default: "curved_arcs",
        section: "Display",
        order: 1
      },
      originDimOverride: {
        type: "string",
        label: "Origin Hub Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      destDimOverride: {
        type: "string",
        label: "Destination Node Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      volumeMeasureOverride: {
        type: "string",
        label: "Flow Volume Measure",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: ""
      },
      latencyMeasureOverride: {
        type: "string",
        label: "Latency / Transit Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "None (No Target Line)": "none" },
          { "Dataset Mean (Average Flow)": "dataset_mean" },
          { "Dataset Median (P50 Flow)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Arterial (P90)": "percentile_p90" },
          { "Fixed Goal Value": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 7,
        default: 100000
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 8,
        default: "Network Volume SLA"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Anomaly Alert Threshold (% Deviation)",
        section: "Display",
        order: 9,
        default: 25
      },
      sortOrder: {
        type: "string",
        label: "Route Corridor Ordering",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Flow Volume Descending": "metric_desc" },
          { "Flow Volume Ascending": "metric_asc" },
          { "Alphabetical Origin Hub": "alphabetical" },
          { "Query Default (Natural Order)": "natural" }
        ],
        default: "metric_desc"
      },
      topRoutes: {
        type: "string",
        label: "Route Density Filter (Top-N)",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Top 15 Primary Arterials": "15" },
          { "Top 25 Core Corridors": "25" },
          { "Top 50 Routes": "50" },
          { "Top 100 Routes": "100" },
          { "All Active Routes (Expanded)": "all" }
        ],
        default: "50"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into 'Other' Aggregate Route",
        section: "Display",
        order: 12,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Value Routes",
        section: "Display",
        order: 13,
        default: true
      },
      hudDensity: {
        type: "string",
        label: "Executive KPI HUD Scorecard",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "Full Scorecard Banner": "full" },
          { "Compact Status Strip": "compact" },
          { "Hidden (Maximize Map Canvas)": "hidden" }
        ],
        default: "full"
      },
      labelDensity: {
        type: "string",
        label: "Map Node & State Labels",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "All Hubs & Active Endpoints": "all" },
          { "Dominant Arterials & Hubs Only": "peaks_only" },
          { "Hidden (Hover Tooltip Only)": "hidden" }
        ],
        default: "peaks_only"
      },
      customChartTitle: {
        type: "string",
        label: "Custom Map Title Override",
        section: "Display",
        order: 16,
        default: ""
      },
      customChartSubtitle: {
        type: "string",
        label: "Custom Map Subtitle Override",
        section: "Display",
        order: 17,
        default: ""
      },
      showHubFilter: {
        type: "boolean",
        label: "Show Origin Hub Selector",
        default: true,
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Show Route Search Filter",
        default: true,
        section: "Display",
        order: 19
      },
      arcCurvature: {
        type: "string",
        label: "Arc Arch & Curvature",
        display: "select",
        values: [
          { "Subtle (0.2)": "0.2" },
          { "Balanced (0.35)": "0.35" },
          { "High Great-Circle (0.55)": "0.55" }
        ],
        default: "0.35",
        section: "Display",
        order: 20
      },
      flowAnimation: {
        type: "string",
        label: "Flow Pulse Animation",
        display: "select",
        values: [
          { "Animated Pulse Particles": "pulse" },
          { "Subtle Glow Pulse": "glow" },
          { "Static Flow Arcs": "none" }
        ],
        default: "pulse",
        section: "Display",
        order: 21
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Palette Preset",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Cyberpunk Dark (NOC / SecOps)": "cyber_dark" },
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Ocean Maritime": "ocean_blue" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "cyber_dark"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Leader Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Positive / Target Pass Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Negative / Target Lag Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Higher is Better (Flow Volume, Revenue, Throughput)": "higher_is_better" },
          { "Lower is Better (Transit Latency, Defect, Friction)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (High-Density Dashboard)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large (Executive Presentation)": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Universal Metric Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto (Looker Field Rendered Format)": "auto" },
          { "Compact Currency ($1.2M, $45.2K)": "compact_currency" },
          { "Standard Currency ($1,234,567.00)": "currency" },
          { "Compact Number (1.2M, 45.2K)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw (Exact Unformatted Value)": "raw" }
        ],
        default: "compact_currency"
      },
      arcColorMode: {
        type: "string",
        label: "Arc Coloring Scheme",
        display: "select",
        values: [
          { "Color by Origin Hub": "by_origin" },
          { "Color by Volume Intensity": "by_volume" },
          { "Color by Latency / Transit Time": "by_latency" },
          { "Monochrome Theme Accent": "monochrome" }
        ],
        default: "by_origin",
        section: "Style",
        order: 8
      },
      baseArcWidth: {
        type: "number",
        label: "Base Arc Stroke Width",
        default: 2.5,
        section: "Style",
        order: 9
      },
      hubNodeRadius: {
        type: "number",
        label: "Origin Hub Radius",
        default: 7,
        section: "Style",
        order: 10
      },
      scaleEndpointRadius: {
        type: "boolean",
        label: "Scale Endpoints by Volume",
        default: true,
        section: "Style",
        order: 11
      },
      maxEndpointRadius: {
        type: "number",
        label: "Max Endpoint Radius (px)",
        default: 14,
        section: "Style",
        order: 12
      },
      minEndpointRadius: {
        type: "number",
        label: "Min Endpoint Radius (px)",
        default: 3,
        section: "Style",
        order: 13
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields) return;
      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) {
        meas = fields.table_calculations;
      }

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" +
                      meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      var fieldSpecs = {
        originDimOverride: { role: "dimension", defaultIdx: 0 },
        destDimOverride: { role: "dimension", defaultIdx: dims.length > 1 ? 1 : -1 },
        volumeMeasureOverride: { role: "measure", defaultIdx: 0 },
        latencyMeasureOverride: { role: "measure", defaultIdx: meas.length > 1 ? 1 : -1 }
      };

      Object.keys(fieldSpecs).forEach(function (key) {
        var spec = fieldSpecs[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
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
      } catch (err) {}
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      this._container = document.createElement("div");
      this._container.setAttribute("class", "flow-arc-map-container");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      this._selectedHub = "ALL";
      this._searchQuery = "";
      this._zoomTransform = null;
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
        element.style.boxSizing = "border-box";
        element.style.padding = "0";
        element.style.overflow = "hidden";

        this._container = document.createElement("div");
        this._container.setAttribute("class", "flow-arc-map-container");
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.position = "relative";
        this._container.style.overflow = "hidden";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      ensureDependencies(function (d3, topojson) {
        self._render(d3, topojson, data, element, config, queryResponse, done);
      });
    },

    _render: function (d3, topojson, data, element, config, queryResponse, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      if (!data || data.length === 0) {
        if (this.addError) {
          try {
            this.addError({ title: "No Data", message: "This visualization requires query results to render." });
          } catch (e) {}
        }
        if (done) done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) {
        meas = fields.table_calculations;
      }

      if (dims.length < 1 || meas.length < 1) {
        if (this.addError) {
          try {
            this.addError({
              title: "Insufficient Fields",
              message: "Requires at least 1 Dimension (Origin & Destination, e.g. Distribution Center and Destination State) and 1 Measure (Flow Volume / Total Sales)."
            });
          } catch (e) {}
        }
        if (done) done();
        return;
      }

      // Identify Dimensions & Dynamic Overrides
      var originDim = null;
      var originLatDim = null;
      var originLonDim = null;
      var destDim = null;
      var destLatDim = null;
      var destLonDim = null;

      // Check dynamic field overrides first
      var oDimCandidate = resolveField(dims, config.originDimOverride, -1);
      var dDimCandidate = resolveField(dims, config.destDimOverride, -1);
      if (oDimCandidate) originDim = oDimCandidate.name;
      if (dDimCandidate) destDim = dDimCandidate.name;

      dims.forEach(function (d) {
        var n = d.name.toLowerCase();
        if (n.indexOf("origin") >= 0 || n.indexOf("distribution_center") >= 0 || n.indexOf("source") >= 0) {
          if (n.indexOf("latitude") >= 0 || n.indexOf("lat") >= 0) originLatDim = d.name;
          else if (n.indexOf("longitude") >= 0 || n.indexOf("lon") >= 0) originLonDim = d.name;
          else if (!originDim) originDim = d.name;
        } else if (n.indexOf("dest") >= 0 || n.indexOf("target") >= 0 || n.indexOf("state") >= 0 || n.indexOf("city") >= 0 || n.indexOf("user") >= 0) {
          if (n.indexOf("latitude") >= 0 || n.indexOf("lat") >= 0) destLatDim = d.name;
          else if (n.indexOf("longitude") >= 0 || n.indexOf("lon") >= 0) destLonDim = d.name;
          else if (!destDim) destDim = d.name;
        }
      });

      // Fallback heuristics if specific named dimensions weren't matched
      if (!originDim && dims.length >= 1) originDim = dims[0].name;
      if (!destDim && dims.length >= 2) destDim = dims[1].name;
      if (!destDim) destDim = originDim; // single dim self-loop or matrix

      // Measures identification & Dynamic Overrides
      var volumeMeas = meas[0].name;
      var latencyMeas = meas.length > 1 ? meas[1].name : null;
      var countMeas = meas.length > 2 ? meas[2].name : null;

      var vMeasCandidate = resolveField(meas, config.volumeMeasureOverride, -1);
      if (vMeasCandidate) volumeMeas = vMeasCandidate.name;
      var lMeasCandidate = resolveField(meas, config.latencyMeasureOverride, -1);
      if (lMeasCandidate) latencyMeas = lMeasCandidate.name;

      // Extract Theme & Palette
      var paletteKey = config.colorPalette || config.colorTheme || "cyber_dark";
      var theme = PALETTES[paletteKey] || PALETTES.cyber_dark;
      if (config.customPrimaryHex && config.customPrimaryHex.trim()) {
        theme = Object.assign({}, theme, {
          originHub: config.customPrimaryHex.trim(),
          arcPrimary: config.customPrimaryHex.trim(),
          tooltipBorder: config.customPrimaryHex.trim()
        });
      }
      container.style.backgroundColor = theme.bg;

      // Font Scale Multiplier
      var fontScale = config.fontScale || "standard";
      var fontMultiplier = fontScale === "compact" ? 0.88 : (fontScale === "large" ? 1.18 : 1.0);
      container.style.fontSize = Math.round(12 * fontMultiplier) + "px";

      var viewMode = config.viewMode || "curved_arcs";
      var topRoutesLimit = config.topRoutes === "all" ? 999999 : parseInt(config.topRoutes || "50", 10);
      var curvatureFactor = parseFloat(config.arcCurvature || "0.35");
      var flowAnim = config.flowAnimation || "pulse";
      var valFmt = config.valueFormat || "compact_currency";
      var arcColorMode = config.arcColorMode || "by_origin";
      var baseWidth = parseFloat(config.baseArcWidth || 2.5);
      var hubRadius = parseFloat(config.hubNodeRadius || 7) * (fontScale === "compact" ? 0.9 : 1.0);
      var labelDensity = config.labelDensity || "peaks_only";
      var showLabels = labelDensity !== "hidden";
      var polarity = config.metricPolarity || "higher_is_better";

      // Aggregate raw rows into unique routes (Origin -> Destination)
      var routeMap = {};
      var originHubsSet = {};
      var destNodesSet = {};
      var totalNetworkVolume = 0;
      var totalNetworkLatencyWeighted = 0;
      var totalNetworkVolumeForLatency = 0;

      data.forEach(function (row) {
        var origName = (row[originDim] && row[originDim].value !== undefined) ? String(row[originDim].value) : "Unknown Origin";
        var destName = (row[destDim] && row[destDim].value !== undefined) ? String(row[destDim].value) : "Unknown Dest";

        var origLat = originLatDim && row[originLatDim] ? row[originLatDim].value : null;
        var origLon = originLonDim && row[originLonDim] ? row[originLonDim].value : null;
        var destLat = destLatDim && row[destLatDim] ? row[destLatDim].value : null;
        var destLon = destLonDim && row[destLonDim] ? row[destLonDim].value : null;

        var origCoords = resolveCoords(origName, origLat, origLon);
        var destCoords = resolveCoords(destName, destLat, destLon);

        if (!origCoords || !destCoords) return;

        var vol = row[volumeMeas] ? parseFloat(row[volumeMeas].value || 0) : 0;
        var latVal = (latencyMeas && row[latencyMeas]) ? parseFloat(row[latencyMeas].value || 0) : 0;
        var cntVal = (countMeas && row[countMeas]) ? parseFloat(row[countMeas].value || 0) : 1;

        var routeKey = origName + "|||" + destName;
        if (!routeMap[routeKey]) {
          routeMap[routeKey] = {
            key: routeKey,
            origin: origName,
            destination: destName,
            originCoords: origCoords,
            destCoords: destCoords,
            volume: 0,
            latencySum: 0,
            latencyCount: 0,
            shipmentCount: 0,
            rawRows: []
          };
        }

        routeMap[routeKey].volume += vol;
        routeMap[routeKey].shipmentCount += cntVal;
        if (latencyMeas) {
          routeMap[routeKey].latencySum += (latVal * (vol > 0 ? vol : 1));
          routeMap[routeKey].latencyCount += (vol > 0 ? vol : 1);
        }
        routeMap[routeKey].rawRows.push(row);

        originHubsSet[origName] = origCoords;
        destNodesSet[destName] = destCoords;
        totalNetworkVolume += vol;
        if (latencyMeas) {
          totalNetworkLatencyWeighted += (latVal * (vol > 0 ? vol : 1));
          totalNetworkVolumeForLatency += (vol > 0 ? vol : 1);
        }
      });

      var routes = Object.keys(routeMap).map(function (k) {
        var r = routeMap[k];
        r.avgLatency = r.latencyCount > 0 ? (r.latencySum / r.latencyCount) : 0;
        return r;
      });

      if (routes.length === 0) {
        if (this.addError) {
          try {
            this.addError({
              title: "Geocoding Notice",
              message: "Unable to match geographic coordinates for the given Origin and Destination. Please provide US state names (e.g. California, TX) or valid latitude/longitude coordinates."
            });
          } catch (e) {}
        }
        if (done) done();
        return;
      }

      // Null & Zero Suppression
      var suppressZeroNull = config.suppressZeroNull !== false;
      if (suppressZeroNull) {
        routes = routes.filter(function (r) {
          return r.volume !== null && r.volume !== undefined && !isNaN(r.volume) && r.volume > 0;
        });
      }

      // Calculate Target Reference Benchmarks
      var allVols = routes.map(function (r) { return r.volume; }).sort(function (a, b) { return a - b; });
      var datasetMean = allVols.length > 0 ? (d3.sum(allVols) / allVols.length) : 0;
      var datasetMedian = allVols.length > 0 ? (d3.quantile(allVols, 0.5) || 0) : 0;
      var p75 = allVols.length > 0 ? (d3.quantile(allVols, 0.75) || 0) : 0;
      var p90 = allVols.length > 0 ? (d3.quantile(allVols, 0.90) || 0) : 0;

      var targetMode = config.targetCalculationMode || "dataset_mean";
      var targetVal = 0;
      if (targetMode === "dataset_mean") targetVal = datasetMean;
      else if (targetMode === "dataset_median") targetVal = datasetMedian;
      else if (targetMode === "percentile_p75") targetVal = p75;
      else if (targetMode === "percentile_p90") targetVal = p90;
      else if (targetMode === "fixed_value") targetVal = parseFloat(config.fixedTargetValue || 100000);

      var anomalyPct = parseFloat(config.anomalyThresholdPct || 25) / 100;

      // Configurable Corridor Sorting
      var sortOrder = config.sortOrder || "metric_desc";
      if (sortOrder === "metric_desc") {
        routes.sort(function (a, b) { return b.volume - a.volume; });
      } else if (sortOrder === "metric_asc") {
        routes.sort(function (a, b) { return a.volume - b.volume; });
      } else if (sortOrder === "alphabetical") {
        routes.sort(function (a, b) { return a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination); });
      }

      // Assign global ranks and benchmark performance
      routes.forEach(function (r, idx) {
        r.rank = idx + 1;
        r.share = totalNetworkVolume > 0 ? (r.volume / totalNetworkVolume) : 0;
        r.targetVariance = targetVal > 0 ? ((r.volume - targetVal) / targetVal) : 0;
        r.isAboveTarget = r.volume >= targetVal;
        r.isAnomaly = targetVal > 0 && Math.abs(r.targetVariance) >= anomalyPct;
      });

      // Filter by Top-N and optional 'Other' synthetic corridor rollup
      var activeRoutes = [];
      if (routes.length <= topRoutesLimit || topRoutesLimit >= 999999) {
        activeRoutes = routes.slice();
      } else {
        activeRoutes = routes.slice(0, topRoutesLimit);
        if (config.enableOtherRollup) {
          var remainingRoutes = routes.slice(topRoutesLimit);
          var otherVolume = d3.sum(remainingRoutes, function (r) { return r.volume; });
          var otherShipments = d3.sum(remainingRoutes, function (r) { return r.shipmentCount; });
          var otherLatencyCount = d3.sum(remainingRoutes, function (r) { return r.latencyCount; });
          var otherLatencySum = d3.sum(remainingRoutes, function (r) { return r.latencySum; });
          if (remainingRoutes.length > 0 && otherVolume > 0) {
            activeRoutes.push({
              key: "Other Corridors|||Nationwide Rollup",
              origin: "Other Regional Hubs",
              destination: "Nationwide Endpoints",
              originCoords: remainingRoutes[0].originCoords,
              destCoords: remainingRoutes[remainingRoutes.length - 1].destCoords,
              volume: otherVolume,
              latencySum: otherLatencySum,
              latencyCount: otherLatencyCount,
              shipmentCount: otherShipments,
              avgLatency: otherLatencyCount > 0 ? (otherLatencySum / otherLatencyCount) : 0,
              rank: topRoutesLimit + 1,
              share: totalNetworkVolume > 0 ? (otherVolume / totalNetworkVolume) : 0,
              targetVariance: targetVal > 0 ? ((otherVolume - targetVal) / targetVal) : 0,
              isAboveTarget: otherVolume >= targetVal,
              isAnomaly: false,
              isOtherRollup: true,
              rawRows: []
            });
          }
        }
      }

      // Filter by Selected Hub if set
      if (self._selectedHub && self._selectedHub !== "ALL") {
        activeRoutes = activeRoutes.filter(function (r) {
          return r.origin === self._selectedHub;
        });
      }

      // Filter by Search Query if set
      if (self._searchQuery && self._searchQuery.trim() !== "") {
        var q = self._searchQuery.toLowerCase().trim();
        activeRoutes = activeRoutes.filter(function (r) {
          return r.origin.toLowerCase().indexOf(q) >= 0 || r.destination.toLowerCase().indexOf(q) >= 0;
        });
      }

      // Header & Title Overrides
      var chartTitle = config.customChartTitle || "";
      var chartSubtitle = config.customChartSubtitle || "";
      var hudDensity = config.hudDensity || "full";
      var showExecutiveHUD = hudDensity !== "hidden";
      var isCompactHud = hudDensity === "compact";

      if (chartTitle || chartSubtitle) {
        var titleGroup = d3.select(container)
          .append("div")
          .attr("class", "flow-title-header")
          .style("position", "absolute")
          .style("top", "8px")
          .style("left", "14px")
          .style("z-index", "12")
          .style("pointer-events", "none");

        if (chartTitle) {
          titleGroup.append("div")
            .style("font-size", (14 * fontMultiplier) + "px")
            .style("font-weight", "700")
            .style("color", theme.hudText)
            .style("letter-spacing", "0.2px")
            .text(chartTitle);
        }
        if (chartSubtitle) {
          titleGroup.append("div")
            .style("font-size", (10.5 * fontMultiplier) + "px")
            .style("color", theme.hudSubtext)
            .style("margin-top", "1px")
            .text(chartSubtitle);
        }
      }

      // Hub color mapping
      var originList = Object.keys(originHubsSet).sort();
      var hubColorScale = d3.scaleOrdinal()
        .domain(originList)
        .range(theme.palette);

      var maxVol = d3.max(activeRoutes, function (d) { return d.volume; }) || 1;
      var minVol = d3.min(activeRoutes, function (d) { return d.volume; }) || 0;
      var strokeScale = d3.scaleSqrt()
        .domain([minVol, maxVol])
        .range([Math.max(1, baseWidth * 0.6), Math.max(3, baseWidth * 2.6)]);

      var maxLat = d3.max(activeRoutes, function (d) { return d.avgLatency; }) || 1;
      var minLat = d3.min(activeRoutes, function (d) { return d.avgLatency; }) || 0;
      var latencyColorScale = d3.scaleSequential(d3.interpolateTurbo)
        .domain([minLat, maxLat]);

      // Top Control Bar & Executive HUD
      var topOffset = (chartTitle || chartSubtitle) ? "42px" : "8px";
      var topBar = d3.select(container)
        .append("div")
        .attr("class", "flow-top-bar")
        .style("position", "absolute")
        .style("top", topOffset)
        .style("left", "12px")
        .style("right", "12px")
        .style("z-index", "10")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "space-between")
        .style("flex-wrap", "wrap")
        .style("gap", "10px")
        .style("pointer-events", "none");

      // Interactive Controls (Left Side)
      var controlsGroup = topBar.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("gap", "8px")
        .style("pointer-events", "auto");

      // Hub Filter Dropdown
      if (config.showHubFilter !== false) {
        var hubSelect = controlsGroup.append("select")
          .attr("class", "hub-selector")
          .style("background", theme.hudBg)
          .style("color", theme.hudText)
          .style("border", "1px solid " + theme.hudBorder)
          .style("border-radius", "6px")
          .style("padding", isCompactHud ? "4px 8px" : "6px 12px")
          .style("font-size", (11.5 * fontMultiplier) + "px")
          .style("font-weight", "600")
          .style("cursor", "pointer")
          .style("backdrop-filter", "blur(8px)")
          .style("outline", "none");

        hubSelect.append("option")
          .attr("value", "ALL")
          .text("All Origin Hubs (" + originList.length + ")");

        originList.forEach(function (h) {
          var opt = hubSelect.append("option")
            .attr("value", h)
            .text(h);
          if (self._selectedHub === h) opt.property("selected", true);
        });

        hubSelect.on("change", function (e) {
          self._selectedHub = e.target.value;
          self._render(d3, topojson, data, element, config, queryResponse, done);
        });
      }

      // Live Route Search Box
      if (config.showSearch !== false) {
        var searchInput = controlsGroup.append("input")
          .attr("type", "text")
          .attr("placeholder", "Search routes...")
          .attr("value", self._searchQuery)
          .style("background", theme.hudBg)
          .style("color", theme.hudText)
          .style("border", "1px solid " + theme.hudBorder)
          .style("border-radius", "6px")
          .style("padding", isCompactHud ? "4px 8px" : "6px 12px")
          .style("font-size", (11.5 * fontMultiplier) + "px")
          .style("width", isCompactHud ? "110px" : "140px")
          .style("backdrop-filter", "blur(8px)")
          .style("outline", "none");

        searchInput.on("input", function (e) {
          self._searchQuery = e.target.value;
          self._render(d3, topojson, data, element, config, queryResponse, done);
        });
      }

      // Executive KPI HUD (Right Side)
      if (showExecutiveHUD) {
        var activeVolSum = d3.sum(activeRoutes, function (d) { return d.volume; });
        var activeOriginsCount = Object.keys(activeRoutes.reduce(function (acc, r) { acc[r.origin] = true; return acc; }, {})).length;
        var activeDestsCount = Object.keys(activeRoutes.reduce(function (acc, r) { acc[r.destination] = true; return acc; }, {})).length;
        var avgTransit = totalNetworkVolumeForLatency > 0 ? (totalNetworkLatencyWeighted / totalNetworkVolumeForLatency) : 0;
        var aboveTargetCount = activeRoutes.filter(function (r) { return r.isAboveTarget; }).length;
        var anomalyCount = activeRoutes.filter(function (r) { return r.isAnomaly; }).length;

        var hudCard = topBar.append("div")
          .style("background", theme.hudBg)
          .style("border", "1px solid " + theme.hudBorder)
          .style("border-radius", "8px")
          .style("padding", isCompactHud ? "3px 10px" : "5px 14px")
          .style("display", "flex")
          .style("align-items", "center")
          .style("gap", isCompactHud ? "10px" : "16px")
          .style("box-shadow", "0 4px 12px rgba(0,0,0,0.25)")
          .style("backdrop-filter", "blur(8px)")
          .style("pointer-events", "auto");

        function addKpi(label, val, color) {
          var k = hudCard.append("div")
            .style("display", "flex")
            .style("flex-direction", isCompactHud ? "row" : "column")
            .style("align-items", isCompactHud ? "center" : "flex-start")
            .style("gap", isCompactHud ? "4px" : "0px");
          k.append("span")
            .style("font-size", (8.5 * fontMultiplier) + "px")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.5px")
            .style("color", theme.hudSubtext)
            .text(label + (isCompactHud ? ":" : ""));
          k.append("span")
            .style("font-size", ((isCompactHud ? 11 : 13) * fontMultiplier) + "px")
            .style("font-weight", "700")
            .style("color", color || theme.hudText)
            .text(val);
        }

        addKpi("Network Flow", formatValue(activeVolSum, valFmt), theme.originHub);
        addKpi("Active Routes", activeRoutes.length.toLocaleString(), theme.hudText);
        addKpi("Hubs \u2192 Endpoints", activeOriginsCount + " \u2192 " + activeDestsCount, theme.destNode);
        if (targetMode !== "none" && targetVal > 0) {
          var passRate = activeRoutes.length > 0 ? ((aboveTargetCount / activeRoutes.length) * 100).toFixed(0) : "0";
          var passColor = config.customPositiveHex && config.customPositiveHex.trim() ? config.customPositiveHex.trim() : "#10b981";
          var lagColor = config.customNegativeHex && config.customNegativeHex.trim() ? config.customNegativeHex.trim() : (polarity === "higher_is_better" ? "#f59e0b" : "#ef4444");
          var targetColor = polarity === "higher_is_better" ? (passRate >= 70 ? passColor : lagColor) : (passRate >= 70 ? lagColor : passColor);
          addKpi(config.referenceLineLabel || "Benchmark", passRate + "% Met", targetColor);
        }
        if (anomalyCount > 0 && !isCompactHud) {
          addKpi("Anomalies", anomalyCount + " Corridors", "#f43f5e");
        }
        if (latencyMeas && !isCompactHud) {
          addKpi("Avg Transit", avgTransit.toFixed(1) + "d", theme.particle);
        }
      }

      // Floating Zoom / Reset Navigation Controls (Bottom Right)
      var navControls = d3.select(container)
        .append("div")
        .attr("class", "flow-nav-controls")
        .style("position", "absolute")
        .style("bottom", "16px")
        .style("right", "16px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "6px")
        .style("z-index", "10");

      function createNavBtn(text, title, onClick) {
        return navControls.append("button")
          .attr("title", title)
          .style("width", "32px")
          .style("height", "32px")
          .style("background", theme.hudBg)
          .style("color", theme.hudText)
          .style("border", "1px solid " + theme.hudBorder)
          .style("border-radius", "6px")
          .style("font-size", "14px")
          .style("font-weight", "700")
          .style("cursor", "pointer")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("backdrop-filter", "blur(8px)")
          .style("box-shadow", "0 2px 6px rgba(0,0,0,0.3)")
          .text(text)
          .on("click", onClick);
      }

      // Tooltip Card
      var tooltip = d3.select(container)
        .append("div")
        .attr("class", "flow-tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", theme.tooltipBg)
        .style("border", "1px solid " + theme.tooltipBorder)
        .style("border-radius", "8px")
        .style("padding", "10px 14px")
        .style("font-size", "12px")
        .style("color", theme.textColor)
        .style("box-shadow", "0 8px 24px rgba(0,0,0,0.4)")
        .style("backdrop-filter", "blur(12px)")
        .style("pointer-events", "none")
        .style("z-index", "20")
        .style("max-width", "320px");

      // Map SVG Container
      var width = container.clientWidth || 900;
      var height = container.clientHeight || 560;

      var svg = d3.select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Definitions for glows, gradients, and filters
      var defs = svg.append("defs");

      // Flow Glow filter
      var filter = defs.append("filter")
        .attr("id", "flow-glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
      var feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      // Setup D3 US Albers Projection
      var projection = d3.geoAlbersUsa()
        .scale(width * 1.18)
        .translate([width / 2, height / 2 + 10]);

      var pathGenerator = d3.geoPath().projection(projection);

      // Zoomable Canvas Group
      var gZoom = svg.append("g").attr("class", "map-zoom-group");
      var gBaseMap = gZoom.append("g").attr("class", "base-map-layer");
      var gHexbins = gZoom.append("g").attr("class", "hexbin-layer");
      var gChoropleth = gZoom.append("g").attr("class", "choropleth-layer");
      var gArcs = gZoom.append("g").attr("class", "flow-arcs-layer");
      var gParticles = gZoom.append("g").attr("class", "particles-layer");
      var gNodes = gZoom.append("g").attr("class", "nodes-layer");
      var gLabels = gZoom.append("g").attr("class", "labels-layer");

      // Zoom Behavior
      var zoom = d3.zoom()
        .scaleExtent([0.8, 8])
        .on("zoom", function (e) {
          self._zoomTransform = e.transform;
          gZoom.attr("transform", e.transform);
        });

      svg.call(zoom);

      if (self._zoomTransform) {
        gZoom.attr("transform", self._zoomTransform);
      }

      createNavBtn("+", "Zoom In", function () { svg.transition().duration(300).call(zoom.scaleBy, 1.3); });
      createNavBtn("\u2212", "Zoom Out", function () { svg.transition().duration(300).call(zoom.scaleBy, 0.7); });
      createNavBtn("\u27F2", "Reset View", function () {
        self._zoomTransform = null;
        svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
      });

      // Load and Render US Basemap
      fetchTopoJson(function (topoData) {
        if (topoData && topojson) {
          var stateFeatures = topojson.feature(topoData, topoData.objects.states).features;

          // Choropleth Destination Density map mode
          if (viewMode === "choropleth_overlay") {
            var destVolumeByFips = {};
            activeRoutes.forEach(function (r) {
              var stCode = resolveStateCode(r.destination);
              if (stCode && STATE_LOOKUP[stCode]) {
                var fips = STATE_LOOKUP[stCode].fips;
                destVolumeByFips[fips] = (destVolumeByFips[fips] || 0) + r.volume;
              }
            });
            var maxDestVol = d3.max(Object.values(destVolumeByFips)) || 1;
            var choroScale = d3.scaleSequential(d3.interpolateBlues)
              .domain([0, maxDestVol]);

            gChoropleth.selectAll("path.state-choro")
              .data(stateFeatures)
              .enter()
              .append("path")
              .attr("class", "state-choro")
              .attr("d", pathGenerator)
              .attr("fill", function (d) {
                var fips = String(d.id).padStart(2, "0");
                var v = destVolumeByFips[fips];
                return v ? choroScale(v) : theme.land;
              })
              .attr("stroke", theme.landStroke)
              .attr("stroke-width", 0.75)
              .attr("opacity", 0.85);
          } else {
            // Standard basemap polygons
            gBaseMap.selectAll("path.state-poly")
              .data(stateFeatures)
              .enter()
              .append("path")
              .attr("class", "state-poly")
              .attr("d", pathGenerator)
              .attr("fill", theme.land)
              .attr("stroke", theme.landStroke)
              .attr("stroke-width", 0.75)
              .attr("opacity", 0.9);
          }
        }

        // Render Map Elements (Arcs, Hubs, Hexbins, and Particles)
        renderVisualElements();
        if (done) done();
      });

      function renderVisualElements() {
        // Project coordinates for all active routes
        var projectedRoutes = [];
        activeRoutes.forEach(function (r) {
          var p0 = projection(r.originCoords);
          var p1 = projection(r.destCoords);
          if (p0 && p1) {
            projectedRoutes.push({
              route: r,
              source: p0,
              target: p1
            });
          }
        });

        // Compute curved bezier path string
        function computeArcPath(d) {
          var sx = d.source[0];
          var sy = d.source[1];
          var tx = d.target[0];
          var ty = d.target[1];

          if (viewMode === "hub_spoke") {
            // Straight radial spoke with slight bow
            var dx = tx - sx;
            var dy = ty - sy;
            var mx = (sx + tx) / 2 - dy * (curvatureFactor * 0.25);
            var my = (sy + ty) / 2 + dx * (curvatureFactor * 0.25);
            return "M " + sx + " " + sy + " Q " + mx + " " + my + " " + tx + " " + ty;
          }

          // Curved Great-Circle Bézier Arc
          var dx = tx - sx;
          var dy = ty - sy;
          var dist = Math.sqrt(dx * dx + dy * dy);

          // Normal vector offset (arch upward towards the north)
          var midX = (sx + tx) / 2;
          var midY = (sy + ty) / 2;

          // Lift vertex towards north (lower y)
          var arcLift = dist * curvatureFactor;
          var nx = -dy / dist;
          var ny = dx / dist;

          // Ensure arch curves northwards / convex
          if (ny > 0) { nx = -nx; ny = -ny; }

          var cx = midX + nx * arcLift;
          var cy = midY + ny * arcLift;

          return "M " + sx + " " + sy + " Q " + cx + " " + cy + " " + tx + " " + ty;
        }

        // Route color resolver
        function getRouteColor(r) {
          if (arcColorMode === "by_origin") {
            return hubColorScale(r.origin);
          } else if (arcColorMode === "by_latency") {
            return latencyColorScale(r.avgLatency);
          } else if (arcColorMode === "by_volume") {
            var ratio = maxVol > minVol ? (r.volume - minVol) / (maxVol - minVol) : 0.5;
            return d3.interpolatePlasma(ratio);
          }
          return theme.arcPrimary;
        }

        // MODE: HEXBIN DENSITY GRID
        if (viewMode === "hexbin_density") {
          // Bin destination points into hexagonal grid
          var hexRadius = 24;
          var hexMap = {};
          projectedRoutes.forEach(function (pr) {
            var tx = pr.target[0];
            var ty = pr.target[1];
            // Hex coordinates
            var q = Math.round((Math.sqrt(3)/3 * tx - 1/3 * ty) / hexRadius);
            var r = Math.round((2/3 * ty) / hexRadius);
            var hKey = q + "," + r;
            if (!hexMap[hKey]) {
              hexMap[hKey] = {
                center: [tx, ty],
                volume: 0,
                routesCount: 0,
                routes: []
              };
            }
            hexMap[hKey].volume += pr.route.volume;
            hexMap[hKey].routesCount++;
            hexMap[hKey].routes.push(pr.route);
          });

          var hexBins = Object.values(hexMap);
          var maxHexVol = d3.max(hexBins, function (h) { return h.volume; }) || 1;
          var hexColorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, maxHexVol]);

          // Hexagon polygon generator
          function hexagon(radius) {
            var angle = Math.PI / 3;
            var pts = [];
            for (var i = 0; i < 6; i++) {
              pts.push([radius * Math.cos(angle * i), radius * Math.sin(angle * i)]);
            }
            return "M" + pts.map(function (p) { return p.join(","); }).join("L") + "Z";
          }

          gHexbins.selectAll("path.hex-cell")
            .data(hexBins)
            .enter()
            .append("path")
            .attr("class", "hex-cell")
            .attr("transform", function (d) { return "translate(" + d.center[0] + "," + d.center[1] + ")"; })
            .attr("d", hexagon(hexRadius - 1))
            .attr("fill", function (d) { return hexColorScale(d.volume); })
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.8)
            .on("mouseover", function (e, d) {
              d3.select(this).attr("stroke", "#ffffff").attr("opacity", 1);
              tooltip.style("visibility", "visible")
                .html(
                  "<div style='font-weight:700; font-size:13px; margin-bottom:4px;'>Hexbin Spatial Cluster</div>" +
                  "<div>Inbound Flow: <strong>" + formatValue(d.volume, valFmt) + "</strong></div>" +
                  "<div>Arterial Routes: <strong>" + d.routesCount + "</strong></div>"
                );
            })
            .on("mousemove", function (e) {
              var m = d3.pointer(e, container);
              tooltip.style("top", (m[1] + 12) + "px").style("left", (m[0] + 16) + "px");
            })
            .on("mouseout", function () {
              d3.select(this).attr("stroke", theme.bg).attr("opacity", 0.8);
              tooltip.style("visibility", "hidden");
            });
        }

        // Render Flow Arcs
        var arcPaths = gArcs.selectAll("path.flow-arc")
          .data(projectedRoutes)
          .enter()
          .append("path")
          .attr("class", "flow-arc")
          .attr("d", computeArcPath)
          .attr("fill", "none")
          .attr("stroke", function (d) { return getRouteColor(d.route); })
          .attr("stroke-width", function (d) { return strokeScale(d.route.volume); })
          .attr("stroke-linecap", "round")
          .attr("opacity", 0.68)
          .style("cursor", "pointer")
          .style("transition", "stroke-width 0.2s, opacity 0.2s")
          .on("mouseover", function (e, d) {
            d3.select(this)
              .attr("opacity", 1)
              .attr("stroke-width", strokeScale(d.route.volume) + 2.5)
              .attr("filter", "url(#flow-glow)");

            var r = d.route;
            var html =
              "<div style='display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;'>" +
              "  <span style='font-size:11px; font-weight:700; color:" + theme.originHub + ";'>" + r.origin + "</span>" +
              "  <span style='font-size:11px; color:" + theme.hudSubtext + ";'>\u2794</span>" +
              "  <span style='font-size:11px; font-weight:700; color:" + theme.destNode + ";'>" + r.destination + "</span>" +
              "</div>" +
              "<div style='border-top:1px solid " + theme.hudBorder + "; padding-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px;'>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>VOLUME:</span><br><strong style='color:" + theme.hudText + ";'>" + formatValue(r.volume, valFmt) + "</strong></div>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>SHARE:</span><br><strong style='color:" + theme.hudText + ";'>" + (r.share * 100).toFixed(1) + "%</strong></div>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>RANK:</span><br><strong style='color:" + theme.particle + ";'>#" + r.rank + " of " + routes.length + "</strong></div>" +
              (latencyMeas ? "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>TRANSIT:</span><br><strong style='color:" + theme.destNode + ";'>" + r.avgLatency.toFixed(1) + " days</strong></div>" : "") +
              "</div>";

            tooltip.style("visibility", "visible").html(html);
          })
          .on("mousemove", function (e) {
            var m = d3.pointer(e, container);
            tooltip.style("top", (m[1] + 12) + "px").style("left", (m[0] + 16) + "px");
          })
          .on("mouseout", function () {
            d3.select(this)
              .attr("opacity", 0.68)
              .attr("stroke-width", function (d) { return strokeScale(d.route.volume); })
              .attr("filter", null);
            tooltip.style("visibility", "hidden");
          })
          .on("click", function (e, d) {
            // Looker drill-down integration
            if (d.route.rawRows && d.route.rawRows.length > 0 && d.route.rawRows[0][volumeMeas]) {
              var cell = d.route.rawRows[0][volumeMeas];
              if (cell.links && cell.links.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({
                  links: cell.links,
                  event: e
                });
              }
            }
          });

        // ANIMATED FLOW PARTICLES
        if (flowAnim === "pulse") {
          // Select high-volume representative arcs for smooth 60fps particle travel
          var pulseArcs = projectedRoutes.slice(0, Math.min(35, projectedRoutes.length));
          pulseArcs.forEach(function (pr, idx) {
            var pathNode = gArcs.selectAll("path.flow-arc").nodes()[idx];
            if (!pathNode || !pathNode.getTotalLength) return;

            var pathLength = pathNode.getTotalLength();
            var particle = gParticles.append("circle")
              .attr("r", Math.min(4, Math.max(1.8, strokeScale(pr.route.volume) * 0.75)))
              .attr("fill", theme.particle)
              .attr("filter", "url(#flow-glow)")
              .attr("opacity", 0.9);

            function animatePulse() {
              particle.transition()
                .duration(2000 + (idx % 5) * 400)
                .ease(d3.easeLinear)
                .attrTween("transform", function () {
                  return function (t) {
                    var pt = pathNode.getPointAtLength(t * pathLength);
                    return "translate(" + pt.x + "," + pt.y + ")";
                  };
                })
                .on("end", animatePulse);
            }
            // Stagger animation start
            setTimeout(animatePulse, (idx * 160) % 2400);
          });
        }

        // RENDER NODES (Origin Hubs & Destination Endpoints)
        var uniqueOrigins = {};
        projectedRoutes.forEach(function (pr) {
          if (!uniqueOrigins[pr.route.origin]) {
            uniqueOrigins[pr.route.origin] = {
              name: pr.route.origin,
              coords: pr.source,
              totalOutflow: 0
            };
          }
          uniqueOrigins[pr.route.origin].totalOutflow += pr.route.volume;
        });

        var uniqueDests = {};
        projectedRoutes.forEach(function (pr) {
          if (!uniqueDests[pr.route.destination]) {
            uniqueDests[pr.route.destination] = {
              name: pr.route.destination,
              coords: pr.target,
              totalInflow: 0,
              routesCount: 0,
              feedingOrigins: {}
            };
          }
          uniqueDests[pr.route.destination].totalInflow += pr.route.volume;
          uniqueDests[pr.route.destination].routesCount++;
          uniqueDests[pr.route.destination].feedingOrigins[pr.route.origin] =
            (uniqueDests[pr.route.destination].feedingOrigins[pr.route.origin] || 0) + pr.route.volume;
        });

        // Calculate Destination Inflows & Dynamic Radius Scale
        var destList = Object.values(uniqueDests);
        var destInflows = destList.map(function (d) { return d.totalInflow; });
        var minDestInflow = d3.min(destInflows) || 0;
        var maxDestInflow = d3.max(destInflows) || 1;

        var scaleByMagnitude = config.scaleEndpointRadius !== false;
        var minEndpointR = parseFloat(config.minEndpointRadius || 3);
        var maxEndpointR = parseFloat(config.maxEndpointRadius || 14);

        var destRadiusScale = d3.scaleSqrt()
          .domain([Math.max(0, minDestInflow), maxDestInflow])
          .range(scaleByMagnitude ? [minEndpointR, maxEndpointR] : [minEndpointR, minEndpointR]);

        function getDestRadius(d) {
          return Math.max(minEndpointR, destRadiusScale(d.totalInflow) || minEndpointR);
        }

        // Draw Destination Endpoints
        var destGroups = gNodes.selectAll("g.dest-anchor")
          .data(destList)
          .enter()
          .append("g")
          .attr("class", "dest-anchor")
          .attr("transform", function (d) { return "translate(" + d.coords[0] + "," + d.coords[1] + ")"; })
          .style("cursor", "pointer");

        // Destination Outer Halo
        destGroups.append("circle")
          .attr("class", "dest-halo")
          .attr("r", function (d) { return getDestRadius(d) * 1.55; })
          .attr("fill", theme.destNode)
          .attr("opacity", function (d) {
            var r = getDestRadius(d);
            return r >= 6 ? 0.22 : 0.12;
          })
          .attr("filter", "url(#flow-glow)");

        // Destination Core Circle
        destGroups.append("circle")
          .attr("class", "dest-dot")
          .attr("r", function (d) { return getDestRadius(d); })
          .attr("fill", theme.destNode)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", function (d) {
            var r = getDestRadius(d);
            return r >= 7 ? 1.4 : 0.9;
          })
          .attr("opacity", 0.9)
          .on("mouseover", function (e, d) {
            var r = getDestRadius(d);
            d3.select(this).attr("r", r * 1.35);

            // Highlight incoming corridors
            gArcs.selectAll("path.flow-arc")
              .attr("opacity", function (ad) {
                return ad.route.destination === d.name ? 1 : 0.12;
              })
              .attr("stroke-width", function (ad) {
                var w = strokeScale(ad.route.volume);
                return ad.route.destination === d.name ? (w + 2.5) : w;
              })
              .attr("filter", function (ad) {
                return ad.route.destination === d.name ? "url(#flow-glow)" : null;
              });

            var feedingHubNames = Object.keys(d.feedingOrigins);
            feedingHubNames.sort(function (a, b) { return d.feedingOrigins[b] - d.feedingOrigins[a]; });
            var topHub = feedingHubNames.length > 0 ? feedingHubNames[0] : "N/A";
            var topHubVol = topHub !== "N/A" ? d.feedingOrigins[topHub] : 0;

            var shareOfNet = totalNetworkVolume > 0 ? ((d.totalInflow / totalNetworkVolume) * 100).toFixed(1) : "0.0";

            var html =
              "<div style='display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;'>" +
              "  <span style='font-size:12px; font-weight:700; color:" + theme.destNode + ";'>" + d.name + "</span>" +
              "  <span style='font-size:9.5px; text-transform:uppercase; background:rgba(244,63,94,0.18); color:" + theme.destNode + "; padding:2px 6px; border-radius:4px; font-weight:700;'>Destination</span>" +
              "</div>" +
              "<div style='border-top:1px solid " + theme.hudBorder + "; padding-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px;'>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>TOTAL INFLOW:</span><br><strong style='color:" + theme.hudText + ";'>" + formatValue(d.totalInflow, valFmt) + "</strong></div>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>NETWORK SHARE:</span><br><strong style='color:" + theme.hudText + ";'>" + shareOfNet + "%</strong></div>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>FEEDING HUBS:</span><br><strong style='color:" + theme.originHub + ";'>" + feedingHubNames.length + " Hubs (" + d.routesCount + " routes)</strong></div>" +
              "  <div><span style='color:" + theme.hudSubtext + "; font-size:10px;'>TOP FEEDER:</span><br><strong style='color:" + theme.particle + ";'>" + topHub + " (" + formatValue(topHubVol, valFmt) + ")</strong></div>" +
              "</div>";

            tooltip.style("visibility", "visible").html(html);
          })
          .on("mousemove", function (e) {
            var m = d3.pointer(e, container);
            tooltip.style("top", (m[1] + 12) + "px").style("left", (m[0] + 16) + "px");
          })
          .on("mouseout", function (e, d) {
            var r = getDestRadius(d);
            d3.select(this).attr("r", r);

            // Reset flow arcs appearance
            gArcs.selectAll("path.flow-arc")
              .attr("opacity", 0.68)
              .attr("stroke-width", function (ad) { return strokeScale(ad.route.volume); })
              .attr("filter", null);

            tooltip.style("visibility", "hidden");
          });

        // Draw Origin Hubs
        var hubGroups = gNodes.selectAll("g.hub-anchor")
          .data(Object.values(uniqueOrigins))
          .enter()
          .append("g")
          .attr("class", "hub-anchor")
          .attr("transform", function (d) { return "translate(" + d.coords[0] + "," + d.coords[1] + ")"; })
          .style("cursor", "pointer");

        // Outer halo
        hubGroups.append("circle")
          .attr("r", hubRadius * 1.8)
          .attr("fill", function (d) { return hubColorScale(d.name); })
          .attr("opacity", 0.22)
          .attr("filter", "url(#flow-glow)");

        // Core Hub Circle
        hubGroups.append("circle")
          .attr("r", hubRadius)
          .attr("fill", function (d) { return hubColorScale(d.name); })
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.8)
          .on("mouseover", function (e, d) {
            d3.select(this).attr("r", hubRadius * 1.3);
            tooltip.style("visibility", "visible")
              .html(
                "<div style='font-size:12px; font-weight:700; color:" + theme.originHub + ";'>" + d.name + " (Origin Hub)</div>" +
                "<div style='margin-top:4px;'>Total Outbound Flow: <strong>" + formatValue(d.totalOutflow, valFmt) + "</strong></div>"
              );
          })
          .on("mousemove", function (e) {
            var m = d3.pointer(e, container);
            tooltip.style("top", (m[1] + 12) + "px").style("left", (m[0] + 16) + "px");
          })
          .on("mouseout", function () {
            d3.select(this).attr("r", hubRadius);
            tooltip.style("visibility", "hidden");
          })
          .on("click", function (e, d) {
            self._selectedHub = d.name;
            self._render(d3, topojson, data, element, config, queryResponse, done);
          });

        // Node Labels
        if (showLabels) {
          hubGroups.append("text")
            .attr("y", -hubRadius - 5)
            .attr("text-anchor", "middle")
            .attr("fill", theme.hudText)
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)")
            .style("pointer-events", "none")
            .text(function (d) { return d.name; });

          var topDests = destList.slice().sort(function (a, b) { return b.totalInflow - a.totalInflow; }).slice(0, 12);
          var topDestNames = {};
          topDests.forEach(function (d) { topDestNames[d.name] = true; });

          destGroups.filter(function (d) {
              if (labelDensity === "all") return true;
              return topDestNames[d.name] || getDestRadius(d) >= 7;
            })
            .append("text")
            .attr("y", function (d) { return getDestRadius(d) + 11; })
            .attr("text-anchor", "middle")
            .attr("fill", theme.hudSubtext)
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .style("text-shadow", "0 1px 3px rgba(0,0,0,0.9)")
            .style("pointer-events", "none")
            .text(function (d) { return d.name; });
        }
      }
    }
  });
})();
