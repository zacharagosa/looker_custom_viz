/**
 * Geospatial Hexbin & Density Heatmap - Looker Custom Visualization
 * Built with D3.js v7 & TopoJSON Client
 *
 * Inspired by:
 * - Buganizer Cloud Blockers b/418217123, b/537254276, b/556359527:
 *   "Hexbin Map", "Map Density Heatmap Visualization Rendered in Embedded Dashboard",
 *   and "Point Density Accumulation with Shader & Color Ramps".
 * - Buganizer Cloud Blockers b/503077532, b/243984441 (Verizon M5 & Looker Map PRD go/prd-looker-map-viz-improvements):
 *   "Enhanced Geospatial / Map Chart Types: Vector Maps, Layers, Polygons, Hexbins, and Point Density Clustering".
 * - YAQS & Community: Native Looker maps suffer severe visual occlusion (ink blob / hairball effect)
 *   and browser DOM crashes when plotting 5,000+ raw point locations. Hexagonal spatial tessellation
 *   aggregates dense geographic points into uniform, mathematically sound spatial bins.
 *
 * Multi-Modal Geospatial Capabilities:
 * - 4 Multi-Mode Rendering Layouts:
 *     1. "hexbin_density": Pointy-topped hexagonal tessellation grid aggregating point density and metric volume.
 *     2. "density_heatmap": Smooth Gaussian radial density contours & heat-island hotspots.
 *     3. "cluster_bubbles": Spatial bubble clusters with local point counts and volume halos.
 *     4. "hex_cartogram": Equal-area US State hexagonal cartogram eliminating geographic land-area bias.
 * - 5,000+ Row Scalability: High-performance client-side spatial indexing and O(N) binning engine.
 * - Dynamic Field-Role Mapping: Dropdown selectors for State/Latitude, Longitude, Metric Value, Point Count, Target.
 * - Configurable Reference Benchmarks & Anomaly Highlighting: Benchmark targets (Mean, Median, P75, P90, Fixed) & Sigma alerts.
 * - Sorting, Top-N Bucketing & Null Handling: Natural, metric ascending/descending, alphabetical, and top-N filters.
 * - Executive Spatial HUD: Full scorecard, compact strip, or hidden modes with real-time national rollups.
 * - Custom Brand Palettes & Polarity: Google Enterprise, Modern Slate, Cyberpunk Dark, Emerald FinOps, Sunset Media, Wellverse.
 * - Flexible Geo-Resolution: Seamlessly handles raw Lat/Long coordinates OR State/Region string names.
 * - Interactive Pan & Zoom: Smooth D3 zoom with bounds clamping and floating navigation controls.
 * - Instant Live Search: Real-time search-as-you-type filter with glowing boundary highlights.
 * - Native Looker Drill Menus: Direct integration with LookerCharts.Utils.openDrillMenu.
 * - Strict 2-Tab Options: Kept strictly to "Display" and "Style" to prevent Edit Viz modal header wrapping.
 */

(function () {
  var US_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

  // US State lookup dictionary with FIPS, coordinates [lng, lat], and hexagonal cartogram grid [q, r]
  var STATE_LOOKUP = {
    "AL": { name: "Alabama", fips: "01", coords: [-86.9023, 32.8067], hex: { q: 6, r: 5 } },
    "AK": { name: "Alaska", fips: "02", coords: [-152.4044, 61.3707], hex: { q: 0, r: 0 } },
    "AZ": { name: "Arizona", fips: "04", coords: [-111.4312, 34.0489], hex: { q: 1, r: 5 } },
    "AR": { name: "Arkansas", fips: "05", coords: [-92.3731, 35.2010], hex: { q: 4, r: 5 } },
    "CA": { name: "California", fips: "06", coords: [-119.4179, 36.7783], hex: { q: 0, r: 4 } },
    "CO": { name: "Colorado", fips: "08", coords: [-105.7821, 39.5501], hex: { q: 2, r: 4 } },
    "CT": { name: "Connecticut", fips: "09", coords: [-72.7554, 41.6032], hex: { q: 9, r: 3 } },
    "DE": { name: "Delaware", fips: "10", coords: [-75.5277, 39.0067], hex: { q: 9, r: 4 } },
    "DC": { name: "District of Columbia", fips: "11", coords: [-77.0369, 38.9072], hex: { q: 8, r: 5 } },
    "FL": { name: "Florida", fips: "12", coords: [-81.5158, 27.6648], hex: { q: 8, r: 7 } },
    "GA": { name: "Georgia", fips: "13", coords: [-83.6431, 32.1656], hex: { q: 7, r: 6 } },
    "HI": { name: "Hawaii", fips: "15", coords: [-157.8583, 21.3069], hex: { q: 0, r: 7 } },
    "ID": { name: "Idaho", fips: "16", coords: [-114.7420, 44.0682], hex: { q: 1, r: 2 } },
    "IL": { name: "Illinois", fips: "17", coords: [-89.3985, 40.6331], hex: { q: 5, r: 3 } },
    "IN": { name: "Indiana", fips: "18", coords: [-86.1349, 40.2672], hex: { q: 5, r: 4 } },
    "IA": { name: "Iowa", fips: "19", coords: [-93.0977, 41.8780], hex: { q: 4, r: 3 } },
    "KS": { name: "Kansas", fips: "20", coords: [-98.4842, 39.0119], hex: { q: 3, r: 5 } },
    "KY": { name: "Kentucky", fips: "21", coords: [-84.2700, 37.8393], hex: { q: 5, r: 5 } },
    "LA": { name: "Louisiana", fips: "22", coords: [-91.9623, 30.9843], hex: { q: 4, r: 6 } },
    "ME": { name: "Maine", fips: "23", coords: [-69.4455, 45.2538], hex: { q: 10, r: 0 } },
    "MD": { name: "Maryland", fips: "24", coords: [-76.6413, 39.0458], hex: { q: 8, r: 4 } },
    "MA": { name: "Massachusetts", fips: "25", coords: [-71.3824, 42.4072], hex: { q: 9, r: 2 } },
    "MI": { name: "Michigan", fips: "26", coords: [-85.6024, 44.3148], hex: { q: 6, r: 2 } },
    "MN": { name: "Minnesota", fips: "27", coords: [-94.6859, 46.7296], hex: { q: 4, r: 2 } },
    "MS": { name: "Mississippi", fips: "28", coords: [-89.3985, 32.3547], hex: { q: 5, r: 6 } },
    "MO": { name: "Missouri", fips: "29", coords: [-91.8318, 37.9643], hex: { q: 4, r: 4 } },
    "MT": { name: "Montana", fips: "30", coords: [-110.3626, 46.8797], hex: { q: 2, r: 2 } },
    "NE": { name: "Nebraska", fips: "31", coords: [-99.9018, 41.4925], hex: { q: 3, r: 4 } },
    "NV": { name: "Nevada", fips: "32", coords: [-116.4194, 38.8026], hex: { q: 1, r: 3 } },
    "NH": { name: "New Hampshire", fips: "33", coords: [-71.5724, 43.1939], hex: { q: 10, r: 1 } },
    "NJ": { name: "New Jersey", fips: "34", coords: [-74.4057, 40.0583], hex: { q: 8, r: 3 } },
    "NM": { name: "New Mexico", fips: "35", coords: [-105.8701, 34.5199], hex: { q: 2, r: 5 } },
    "NY": { name: "New York", fips: "36", coords: [-75.5268, 43.2994], hex: { q: 8, r: 2 } },
    "NC": { name: "North Carolina", fips: "37", coords: [-79.0193, 35.7596], hex: { q: 7, r: 5 } },
    "ND": { name: "North Dakota", fips: "38", coords: [-101.0020, 47.5515], hex: { q: 3, r: 2 } },
    "OH": { name: "Ohio", fips: "39", coords: [-82.9071, 40.4173], hex: { q: 6, r: 3 } },
    "OK": { name: "Oklahoma", fips: "40", coords: [-97.0929, 35.0078], hex: { q: 3, r: 6 } },
    "OR": { name: "Oregon", fips: "41", coords: [-120.5542, 43.8041], hex: { q: 0, r: 3 } },
    "PA": { name: "Pennsylvania", fips: "42", coords: [-77.1945, 41.2033], hex: { q: 7, r: 3 } },
    "RI": { name: "Rhode Island", fips: "44", coords: [-71.4774, 41.5801], hex: { q: 10, r: 3 } },
    "SC": { name: "South Carolina", fips: "45", coords: [-81.1637, 33.8361], hex: { q: 7, r: 7 } },
    "SD": { name: "South Dakota", fips: "46", coords: [-99.9018, 43.9695], hex: { q: 3, r: 3 } },
    "TN": { name: "Tennessee", fips: "47", coords: [-86.5804, 35.5175], hex: { q: 6, r: 6 } },
    "TX": { name: "Texas", fips: "48", coords: [-99.9018, 31.9686], hex: { q: 3, r: 7 } },
    "UT": { name: "Utah", fips: "49", coords: [-111.0937, 39.3210], hex: { q: 1, r: 4 } },
    "VT": { name: "Vermont", fips: "50", coords: [-72.5778, 44.5588], hex: { q: 9, r: 1 } },
    "VA": { name: "Virginia", fips: "51", coords: [-78.6569, 37.4316], hex: { q: 7, r: 4 } },
    "WA": { name: "Washington", fips: "53", coords: [-120.7401, 47.7511], hex: { q: 0, r: 2 } },
    "WV": { name: "West Virginia", fips: "54", coords: [-80.4549, 38.5976], hex: { q: 6, r: 4 } },
    "WI": { name: "Wisconsin", fips: "55", coords: [-89.6165, 43.7844], hex: { q: 5, r: 2 } },
    "WY": { name: "Wyoming", fips: "56", coords: [-107.2903, 43.0760], hex: { q: 2, r: 3 } }
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

  function resolveCoords(latVal, lonVal, stateOrName) {
    var lat = parseFloat(latVal);
    var lon = parseFloat(lonVal);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
      return [lon, lat];
    }
    var stCode = resolveStateCode(stateOrName);
    if (stCode && STATE_LOOKUP[stCode]) {
      return STATE_LOOKUP[stCode].coords;
    }
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
      if (--pending === 0) {
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

  // Pure JavaScript Pointy-Topped Hexagonal Lattice & Binning Engine
  function generatePointyHexPolygon(cx, cy, r) {
    var points = [];
    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 6) + (i * Math.PI / 3);
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      points.push(x.toFixed(2) + "," + y.toFixed(2));
    }
    return "M" + points.join("L") + "Z";
  }

  function getHexBinCoordinates(px, py, r) {
    var q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / r;
    var rCoord = ((2 / 3) * py) / r;

    var x = q;
    var z = rCoord;
    var y = -x - z;

    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);

    var xDiff = Math.abs(rx - x);
    var yDiff = Math.abs(ry - y);
    var zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    var cx = r * Math.sqrt(3) * (rx + rz / 2);
    var cy = r * (3 / 2) * rz;

    return {
      binKey: rx + ":" + rz,
      q: rx,
      r: rz,
      cx: cx,
      cy: cy
    };
  }

  // Palettes for spatial density heatmaps
  var COLOR_PALETTES = {
    plasma: ["#0d0887", "#5302a3", "#8b0aa5", "#b83289", "#db5c68", "#f48849", "#febc2b", "#f0f921"],
    turbo: ["#30123b", "#4662d8", "#28bbec", "#1ae4b6", "#72fe5e", "#c8ef34", "#faba39", "#ed6925", "#b41c02"],
    viridis: ["#440154", "#482878", "#3e4a89", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"],
    inferno: ["#000004", "#280b53", "#65156e", "#9f2a63", "#d44842", "#f57d15", "#fac127", "#fcffa4"],
    electric_blue: ["#0f172a", "#172554", "#1e40af", "#2563eb", "#38bdf8", "#7dd3fc", "#bae6fd", "#f0f9ff"],
    sunset_amber: ["#450a0a", "#7f1d1d", "#b91c1c", "#ea580c", "#f97316", "#f59e0b", "#fbbf24", "#fef08a"],
    emerald_surge: ["#022c22", "#064e3b", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#d1fae5"],
    google_enterprise: ["#e8f0fe", "#aecbfa", "#669df6", "#4285f4", "#1a73e8", "#185abc", "#174ea6"],
    modern_slate: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#0f172a"],
    cyberpunk_dark: ["#03001e", "#7303c0", "#ec38bc", "#fde24f"],
    emerald_finops: ["#ecfdf5", "#a7f3d0", "#34d399", "#10b981", "#059669", "#047857", "#064e3b"],
    sunset_media: ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#c2410c", "#9a3412", "#7c2d12"],
    wellverse_healthcare: ["#f0fdfa", "#99f6e4", "#2dd4bf", "#0d9488", "#115e59", "#134e4a"]
  };

  // Basemap Themes
  var BASEMAP_THEMES = {
    light_clean: {
      isDark: false,
      bg: "#ffffff",
      mapBg: "#f8fafc",
      stateFill: "#edf2f7",
      stateStroke: "#cbd5e1",
      stateHover: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(255, 255, 255, 0.94)",
      hudBorder: "#e2e8f0",
      hexStroke: "rgba(255, 255, 255, 0.85)"
    },
    dark_slate: {
      isDark: true,
      bg: "#0b0f19",
      mapBg: "#0f172a",
      stateFill: "#1e293b",
      stateStroke: "#334155",
      stateHover: "#475569",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.92)",
      hudBorder: "#334155",
      hexStroke: "rgba(15, 23, 42, 0.75)"
    },
    midnight_navy: {
      isDark: true,
      bg: "#030712",
      mapBg: "#0b1120",
      stateFill: "#111827",
      stateStroke: "#1f2937",
      stateHover: "#374151",
      text: "#f9fafb",
      subtext: "#9ca3af",
      hudBg: "rgba(17, 24, 39, 0.92)",
      hudBorder: "#374151",
      hexStroke: "rgba(3, 7, 18, 0.85)"
    },
    paper_minimal: {
      isDark: false,
      bg: "#fafaf9",
      mapBg: "#f5f5f4",
      stateFill: "#e7e5e4",
      stateStroke: "#d6d3d1",
      stateHover: "#d6d3d1",
      text: "#1c1917",
      subtext: "#78716c",
      hudBg: "rgba(250, 250, 249, 0.94)",
      hudBorder: "#e7e5e4",
      hexStroke: "rgba(255, 255, 255, 0.9)"
    },
    no_basemap: {
      isDark: false,
      bg: "#ffffff",
      mapBg: "#ffffff",
      stateFill: "none",
      stateStroke: "#e2e8f0",
      stateHover: "none",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(255, 255, 255, 0.95)",
      hudBorder: "#e2e8f0",
      hexStroke: "rgba(15, 23, 42, 0.2)"
    }
  };

  // Metric Formatter
  function formatMetric(val, isCurrency, formatMode) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = parseFloat(val);
    var prefix = isCurrency ? "$" : "";

    if (formatMode === "compact_cur") prefix = "$";
    else if (formatMode === "compact_num") prefix = "";
    else if (formatMode === "percentage") return (num > 1.0 ? num : num * 100).toFixed(1) + "%";
    else if (formatMode === "decimal_2dp") return prefix + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    else if (formatMode === "raw_int") return prefix + Math.round(num).toLocaleString();

    if (Math.abs(num) >= 1e9) return prefix + (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return prefix + (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return prefix + (num / 1e3).toFixed(1) + "K";
    return prefix + (Math.abs(num) < 10 ? num.toFixed(2) : Math.round(num).toLocaleString());
  }

  // Looker Custom Visualization Registration
  looker.plugins.visualizations.add({
    id: "hexbin_density_map",
    label: "Geospatial Hexbin & Density Heatmap",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layout_mode: {
        type: "string",
        label: "Layout Mode",
        values: [
          { "Hexagonal Spatial Binning": "hexbin_density" },
          { "Gaussian Density Heatmap": "density_heatmap" },
          { "Spatial Bubble Clusters": "cluster_bubbles" },
          { "Equal-Area Hex Cartogram": "hex_cartogram" }
        ],
        display: "select",
        default: "hexbin_density",
        section: "Display",
        order: 1
      },
      aggregation_type: {
        type: "string",
        label: "Hex Aggregation Metric",
        values: [
          { "Total Sum": "sum" },
          { "Point Count (Density)": "count" },
          { "Average Value": "avg" },
          { "Maximum Value": "max" }
        ],
        display: "select",
        default: "sum",
        section: "Display",
        order: 2
      },
      dimStateOrLatOverride: {
        type: "string",
        label: "State or Latitude Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / Detect Geo Dimension": "" }],
        default: ""
      },
      dimLonOverride: {
        type: "string",
        label: "Longitude Dimension",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / Detect Longitude": "" }],
        default: ""
      },
      measureValueOverride: {
        type: "string",
        label: "Primary Volume / Value Measure",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: ""
      },
      measureCountOverride: {
        type: "string",
        label: "Secondary Count / Point Measure",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / Second Measure or Records": "" }],
        default: ""
      },
      target_mode: {
        type: "string",
        label: "Target / Benchmark Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "None / No Benchmark": "none" },
          { "Measure Column": "measure_col" },
          { "Fixed Custom Value": "fixed" },
          { "Dataset Mean": "mean" },
          { "Dataset Median": "median" },
          { "Percentile P75": "p75" },
          { "Percentile P90": "p90" }
        ],
        default: "none"
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target Measure Column",
        section: "Display",
        order: 8,
        display: "select",
        values: [{ "None / Fixed Target": "" }],
        default: ""
      },
      custom_target_value: {
        type: "number",
        label: "Custom Target Value",
        section: "Display",
        order: 9,
        default: 0
      },
      target_reference_label: {
        type: "string",
        label: "Target Reference Label",
        section: "Display",
        order: 10,
        default: "Target Quota"
      },
      highlight_anomalies: {
        type: "boolean",
        label: "Highlight High-Density Anomalies",
        section: "Display",
        order: 11,
        default: false
      },
      anomaly_threshold_stddev: {
        type: "string",
        label: "Anomaly Detection Sensitivity",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "1.0 Sigma (Top 16% Anomaly)": "1.0" },
          { "1.5 Sigma (Top 7% Anomaly)": "1.5" },
          { "2.0 Sigma (Top 2.5% Extreme)": "2.0" },
          { "2.5 Sigma (Top 0.6% Severe)": "2.5" }
        ],
        default: "2.0"
      },
      sort_order: {
        type: "string",
        label: "Entity / Hex Sort Order",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Natural / Query Order": "natural" },
          { "Metric Descending": "metric_desc" },
          { "Metric Ascending": "metric_asc" },
          { "Alphabetical by Region": "alpha" },
          { "Point Density Descending": "count_desc" }
        ],
        default: "natural"
      },
      top_n_limit: {
        type: "string",
        label: "Top-N Hotspots Filter",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "All Entities (No Limit)": "all" },
          { "Top 10 Hotspots": "10" },
          { "Top 25 Hotspots": "25" },
          { "Top 50 Hotspots": "50" },
          { "Top 100 Hotspots": "100" }
        ],
        default: "all"
      },
      top_n_rollup_other: {
        type: "boolean",
        label: "Keep Non-Top N in Background",
        section: "Display",
        order: 15,
        default: true
      },
      suppress_zeros: {
        type: "boolean",
        label: "Suppress Zero / Null Coordinates",
        section: "Display",
        order: 16,
        default: true
      },
      hud_mode: {
        type: "string",
        label: "Executive Spatial HUD",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "Full Scorecard Cards": "full" },
          { "Compact Summary Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full"
      },
      label_density: {
        type: "string",
        label: "Data Label Density",
        section: "Display",
        order: 18,
        display: "select",
        values: [
          { "State Postal Codes (Cartogram)": "state_only" },
          { "Peak Hotspots & Anomalies Only": "peaks" },
          { "All Visible Cells": "all" },
          { "Hidden": "hidden" }
        ],
        default: "state_only"
      },
      custom_chart_title: {
        type: "string",
        label: "Custom Chart Title",
        section: "Display",
        order: 19,
        default: ""
      },
      custom_chart_subtitle: {
        type: "string",
        label: "Custom Subtitle / Description",
        section: "Display",
        order: 20,
        default: ""
      },
      show_search: {
        type: "boolean",
        label: "Show State/Region Search",
        section: "Display",
        order: 21,
        default: true
      },
      show_legend: {
        type: "boolean",
        label: "Show Density Legend",
        section: "Display",
        order: 22,
        default: true
      },
      hex_radius: {
        type: "number",
        label: "Hexagon Cell Radius (px)",
        section: "Display",
        order: 23,
        default: 20
      },
      proportional_hex_size: {
        type: "boolean",
        label: "Scale Hex Size by Magnitude",
        section: "Display",
        order: 24,
        default: true
      },
      min_points_threshold: {
        type: "number",
        label: "Min Points per Hexbin",
        section: "Display",
        order: 25,
        default: 1
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      color_palette: {
        type: "string",
        label: "Color Ramp Palette",
        values: [
          { "Plasma (Purple-Orange-Yellow)": "plasma" },
          { "Turbo (Full Thermal Spectrum)": "turbo" },
          { "Viridis (Emerald-Teal-Yellow)": "viridis" },
          { "Inferno (Black-Crimson-Gold)": "inferno" },
          { "Electric Blue (Navy-Cyan-White)": "electric_blue" },
          { "Google Enterprise (Blue Horizon)": "google_enterprise" },
          { "Modern Slate (Executive Minimal)": "modern_slate" },
          { "Cyberpunk Dark (Neon Magenta/Yellow)": "cyberpunk_dark" },
          { "Emerald FinOps (Green Growth)": "emerald_finops" },
          { "Sunset Media (Amber-Orange-Crimson)": "sunset_media" },
          { "Wellverse Healthcare (Teal Clinical)": "wellverse_healthcare" },
          { "Custom Hex Two-Color Gradient": "custom_ramp" }
        ],
        display: "select",
        default: "plasma",
        section: "Style",
        order: 1
      },
      custom_primary_hex: {
        type: "string",
        label: "Custom Primary / High Color",
        display: "color",
        default: "#4285f4",
        section: "Style",
        order: 2
      },
      custom_secondary_hex: {
        type: "string",
        label: "Custom Base / Low Color",
        display: "color",
        default: "#e8f0fe",
        section: "Style",
        order: 3
      },
      metric_polarity: {
        type: "string",
        label: "Metric Polarity",
        values: [
          { "Higher is Better (Standard Volume/Revenue)": "higher_is_better" },
          { "Lower is Better (Cost, Latency, Churn)": "lower_is_better" }
        ],
        display: "select",
        default: "higher_is_better",
        section: "Style",
        order: 4
      },
      basemap_theme: {
        type: "string",
        label: "Basemap Theme",
        values: [
          { "Light Clean (Google Modern)": "light_clean" },
          { "Dark Slate (Executive NOC)": "dark_slate" },
          { "Midnight Navy": "midnight_navy" },
          { "Paper Minimal": "paper_minimal" },
          { "No Basemap (Points & Hexagons Only)": "no_basemap" }
        ],
        display: "select",
        default: "light_clean",
        section: "Style",
        order: 5
      },
      hex_opacity: {
        type: "number",
        label: "Hexagon Opacity (0.2 - 1.0)",
        default: 0.85,
        section: "Style",
        order: 6
      },
      hex_stroke: {
        type: "string",
        label: "Hexagon Border Stroke",
        values: [
          { "Crisp White (#ffffff)": "crisp_white" },
          { "Subtle Dark (#0f172a)": "subtle_dark" },
          { "Neon Glow Accent": "neon_accent" },
          { "None": "none" }
        ],
        display: "select",
        default: "crisp_white",
        section: "Style",
        order: 7
      },
      font_scale: {
        type: "string",
        label: "Font Scale",
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (13px)": "standard" },
          { "Large Presentation (15px)": "large" }
        ],
        display: "select",
        default: "standard",
        section: "Style",
        order: 8
      },
      value_format: {
        type: "string",
        label: "Value Metric Format",
        values: [
          { "Auto (Detect from Looker)": "auto" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_cur" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Integer": "raw_int" }
        ],
        display: "select",
        default: "auto",
        section: "Style",
        order: 9
      }
    },

    create: function (element, config) {
      this._container = element;
      this._container.innerHTML = "";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "Google Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

      // Tooltip Element
      var tooltip = document.createElement("div");
      tooltip.className = "hexbin-custom-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "99999";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 0.15s ease";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;

      // Debounced Resize Observer with <4px jitter guard
      var self = this;
      var lastW = 0;
      var lastH = 0;
      var resizeTimer = null;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var cr = entries[0].contentRect;
          if (Math.abs(cr.width - lastW) < 4 && Math.abs(cr.height - lastH) < 4) return;
          lastW = cr.width;
          lastH = cr.height;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.updateAsync(self._lastData, self._container, self._lastConfig, self._lastQueryResponse, null, function () {});
            }
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      // Defensive parameter normalization if called with 5 args
      if (config && config.fields && (!queryResponse || !queryResponse.fields)) {
        done = details;
        details = queryResponse;
        queryResponse = config;
        config = element;
      }
      if (typeof done !== "function") {
        done = function () {};
      }

      this._lastData = data;
      this._lastConfig = config || {};
      this._lastQueryResponse = queryResponse;

      if (!data || data.length === 0) {
        this.addError({ title: "No Data", message: "Query returned zero rows." });
        done();
        return;
      }

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "Missing Query Metadata", message: "Awaiting valid Looker queryResponse.fields." });
        done();
        return;
      }

      var fields = queryResponse.fields || {};
      var dims = (fields.dimensions && fields.dimensions.length > 0)
        ? fields.dimensions
        : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length > 0)
        ? fields.measures
        : (fields.measure_like || []);

      var dimOptions = [{ "Auto / Detect Geo Dimension": "" }];
      dims.forEach(function (d) {
        var opt = {};
        opt[d.label_short || d.label || d.name] = d.name;
        dimOptions.push(opt);
      });

      var measOptions = [{ "Auto / First Measure": "" }];
      meas.forEach(function (m) {
        var opt = {};
        opt[m.label_short || m.label || m.name] = m.name;
        measOptions.push(opt);
      });

      if (this.trigger) {
        try {
          this.trigger("registerOptions", {
            dimStateOrLatOverride: { values: dimOptions },
            dimLonOverride: { values: [{ "Auto / Detect Longitude": "" }].concat(dimOptions.slice(1)) },
            measureValueOverride: { values: measOptions },
            measureCountOverride: { values: [{ "Auto / Second Measure or Records": "" }].concat(measOptions.slice(1)) },
            targetMeasureOverride: { values: [{ "None / Fixed Target": "" }].concat(measOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureDependencies(function (d3, topojson) {
        fetchUSGeoJSON(topojson, function (usGeoJSON) {
          try {
            self._renderMap(d3, usGeoJSON, data, config || {}, queryResponse);
          } catch (err) {
            console.error("Hexbin Density Map render error:", err);
            self.addError({ title: "Render Error", message: err.message });
          }
          done();
        });
      });
    },

    _renderMap: function (d3, usGeoJSON, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var width = container.clientWidth || 800;
      var height = container.clientHeight || 500;

      // Extract field descriptors safely
      var fields = (queryResponse && queryResponse.fields) ? queryResponse.fields : {};
      var dims = (fields.dimensions && fields.dimensions.length > 0)
        ? fields.dimensions
        : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length > 0)
        ? fields.measures
        : (fields.measure_like || []);

      // Dynamic field override or auto-detection
      var latDim = null;
      var lonDim = null;
      var stateDim = null;

      if (config.dimStateOrLatOverride) {
        var overrideName = config.dimStateOrLatOverride;
        if (overrideName.toLowerCase().indexOf("lat") !== -1) {
          latDim = overrideName;
        } else {
          stateDim = overrideName;
        }
      }
      if (config.dimLonOverride) {
        lonDim = config.dimLonOverride;
      }

      // Auto-detect missing geo fields
      dims.forEach(function (d) {
        var n = d.name.toLowerCase();
        if (!latDim && n.indexOf("lat") !== -1) latDim = d.name;
        else if (!lonDim && (n.indexOf("lon") !== -1 || n.indexOf("lng") !== -1)) lonDim = d.name;
        else if (!stateDim && (n.indexOf("state") !== -1 || n.indexOf("region") !== -1 || n.indexOf("city") !== -1)) stateDim = d.name;
      });

      // Measures
      var primaryMeasure = config.measureValueOverride || (meas.length > 0 ? meas[0].name : (dims.length > 1 ? dims[1].name : null));
      var secondaryMeasure = config.measureCountOverride || (meas.length > 1 ? meas[1].name : null);
      var targetMeasure = config.targetMeasureOverride || null;

      var primaryFieldObj = meas.concat(dims).find(function (f) { return f.name === primaryMeasure; });
      var primaryMeasureLabel = primaryFieldObj ? (primaryFieldObj.label_short || primaryFieldObj.label || primaryFieldObj.name) : "Value";

      var isCurrency = primaryMeasureLabel.toLowerCase().indexOf("price") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("sale") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("revenue") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("spend") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("cost") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("margin") !== -1;

      // Configuration options
      var layoutMode = config.layout_mode || "hexbin_density";
      var aggType = config.aggregation_type || "sum";
      var hexRadius = parseInt(config.hex_radius, 10) || 20;
      var proportionalHex = config.proportional_hex_size !== false;
      var minThreshold = parseInt(config.min_points_threshold, 10) || 1;
      var hudMode = config.hud_mode || (config.show_hud === false ? "hidden" : "full");
      var showSearch = config.show_search !== false;
      var showLegend = config.show_legend !== false;
      var paletteKey = config.color_palette || "plasma";
      var colorRamp = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.plasma;

      if (paletteKey === "custom_ramp") {
        var pCol = config.custom_primary_hex || "#4285f4";
        var sCol = config.custom_secondary_hex || "#e8f0fe";
        colorRamp = [sCol, pCol];
      }

      var metricPolarity = config.metric_polarity || "higher_is_better";
      if (metricPolarity === "lower_is_better") {
        colorRamp = colorRamp.slice().reverse();
      }

      var themeKey = config.basemap_theme || "light_clean";
      var theme = BASEMAP_THEMES[themeKey] || BASEMAP_THEMES.light_clean;
      var hexOpacity = parseFloat(config.hex_opacity) || 0.85;
      var hexStrokeMode = config.hex_stroke || "crisp_white";
      var fontScale = config.font_scale || "standard";
      var valueFormat = config.value_format || "auto";
      var targetMode = config.target_mode || "none";
      var labelDensity = config.label_density || "state_only";

      var strokeColor = "rgba(255, 255, 255, 0.85)";
      if (hexStrokeMode === "subtle_dark") strokeColor = "rgba(15, 23, 42, 0.75)";
      else if (hexStrokeMode === "neon_accent") strokeColor = "#38bdf8";
      else if (hexStrokeMode === "none") strokeColor = "none";

      var baseFontSize = fontScale === "compact" ? 11 : (fontScale === "large" ? 15 : 13);
      container.style.fontSize = baseFontSize + "px";
      container.style.backgroundColor = theme.bg;

      // Header Banner (Title / Subtitle)
      if (config.custom_chart_title || config.custom_chart_subtitle) {
        var headerBanner = document.createElement("div");
        headerBanner.style.padding = "10px 16px 6px 16px";
        headerBanner.style.borderBottom = "1px solid " + theme.hudBorder;
        headerBanner.style.backgroundColor = theme.hudBg;

        if (config.custom_chart_title) {
          var titleEl = document.createElement("div");
          titleEl.textContent = config.custom_chart_title;
          titleEl.style.fontWeight = "700";
          titleEl.style.fontSize = (baseFontSize + 3) + "px";
          titleEl.style.color = theme.text;
          headerBanner.appendChild(titleEl);
        }
        if (config.custom_chart_subtitle) {
          var subtitleEl = document.createElement("div");
          subtitleEl.textContent = config.custom_chart_subtitle;
          subtitleEl.style.fontSize = (baseFontSize - 1) + "px";
          subtitleEl.style.color = theme.subtext;
          subtitleEl.style.marginTop = "2px";
          headerBanner.appendChild(subtitleEl);
        }
        container.appendChild(headerBanner);
      }

      // Top Control Bar: Search & HUD
      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.padding = "8px 16px";
      topBar.style.borderBottom = "1px solid " + theme.hudBorder;
      topBar.style.backgroundColor = theme.hudBg;
      topBar.style.zIndex = "10";
      topBar.style.backdropFilter = "blur(8px)";
      topBar.style.flexShrink = "0";
      container.appendChild(topBar);

      // HUD Metrics Container
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = hudMode === "compact" ? "8px" : "14px";
      hudContainer.style.flexWrap = "wrap";
      topBar.appendChild(hudContainer);

      // Search and Controls Container
      var controlsContainer = document.createElement("div");
      controlsContainer.style.display = "flex";
      controlsContainer.style.alignItems = "center";
      controlsContainer.style.gap = "10px";
      topBar.appendChild(controlsContainer);

      // Search Box
      if (showSearch) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.position = "relative";
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter state or region...";
        searchInput.value = this._searchFilter || "";
        searchInput.style.padding = "4px 10px 4px 26px";
        searchInput.style.fontSize = (baseFontSize - 1) + "px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.hudBorder;
        searchInput.style.backgroundColor = theme.isDark ? "#1e293b" : "#ffffff";
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "165px";

        var searchIcon = document.createElement("span");
        searchIcon.innerHTML = "🔍";
        searchIcon.style.position = "absolute";
        searchIcon.style.left = "8px";
        searchIcon.style.fontSize = "11px";
        searchIcon.style.pointerEvents = "none";

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        controlsContainer.appendChild(searchWrapper);

        searchInput.addEventListener("input", function (e) {
          self._searchFilter = e.target.value.toLowerCase().trim();
          self._highlightFilter(d3);
        });
      }

      // Reset Zoom Button
      var resetBtn = document.createElement("button");
      resetBtn.innerHTML = "⟲ Reset Zoom";
      resetBtn.style.padding = "4px 10px";
      resetBtn.style.fontSize = (baseFontSize - 2) + "px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.border = "1px solid " + theme.hudBorder;
      resetBtn.style.backgroundColor = theme.isDark ? "#1e293b" : "#f1f5f9";
      resetBtn.style.color = theme.text;
      resetBtn.style.cursor = "pointer";
      resetBtn.title = "Reset map zoom and pan centering";
      controlsContainer.appendChild(resetBtn);

      // Map SVG Canvas Area
      var mapArea = document.createElement("div");
      mapArea.style.flex = "1";
      mapArea.style.position = "relative";
      mapArea.style.overflow = "hidden";
      mapArea.style.backgroundColor = theme.mapBg;
      container.appendChild(mapArea);

      var mapWidth = mapArea.clientWidth || (width - 2);
      var mapHeight = mapArea.clientHeight || (height - (topBar.clientHeight || 50));

      var svg = d3.select(mapArea)
        .append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .style("display", "block")
        .style("cursor", "grab");

      // Defs for Glow Filter & Gradients
      var defs = svg.append("defs");
      var filter = defs.append("filter")
        .attr("id", "hex-glow")
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%");
      filter.append("feGaussianBlur")
        .attr("stdDeviation", Math.max(8, hexRadius * 0.75))
        .attr("result", "blur");

      // Map layers root
      var g = svg.append("g").attr("class", "map-viewport");
      var stateLayer = g.append("g").attr("class", "state-layer");
      var hexLayer = g.append("g").attr("class", "hex-layer");

      // D3 Zoom Behavior
      var zoom = d3.zoom()
        .scaleExtent([0.8, 8])
        .on("zoom", function (event) {
          self._currentZoomTransform = event.transform;
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      resetBtn.addEventListener("click", function () {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });

      if (this._currentZoomTransform) {
        g.attr("transform", this._currentZoomTransform);
      }

      // Geo Projection setup
      var projection = d3.geoAlbersUsa()
        .fitSize([mapWidth, mapHeight], usGeoJSON || { type: "FeatureCollection", features: [] });
      var pathGenerator = d3.geoPath().projection(projection);

      // Render US State Polygons
      var stateFeatures = (usGeoJSON && usGeoJSON.features) ? usGeoJSON.features : [];
      if (themeKey !== "no_basemap") {
        stateLayer.selectAll("path.state-boundary")
          .data(stateFeatures)
          .enter()
          .append("path")
          .attr("class", "state-boundary")
          .attr("d", pathGenerator)
          .attr("fill", theme.stateFill)
          .attr("stroke", theme.stateStroke)
          .attr("stroke-width", 0.75)
          .attr("stroke-linejoin", "round")
          .attr("opacity", layoutMode === "hex_cartogram" ? 0.2 : 0.95);
      }

      // Project and Process Data Points
      var totalDataPoints = 0;
      var totalValue = 0;
      var validPoints = [];
      var suppressZeros = config.suppress_zeros !== false;

      data.forEach(function (row) {
        totalDataPoints++;
        var latVal = latDim ? (row[latDim] ? row[latDim].value : null) : null;
        var lonVal = lonDim ? (row[lonDim] ? row[lonDim].value : null) : null;
        var stVal = stateDim ? (row[stateDim] ? row[stateDim].value : null) : null;

        var coords = resolveCoords(latVal, lonVal, stVal);
        if (!coords) return;

        var projected = projection(coords);
        if (!projected) return;

        var val = 0;
        if (primaryMeasure && row[primaryMeasure]) {
          val = parseFloat(row[primaryMeasure].value) || 0;
        }

        if (suppressZeros && val === 0 && (!latVal && !lonVal)) {
          return;
        }

        var secVal = 0;
        if (secondaryMeasure && row[secondaryMeasure]) {
          secVal = parseFloat(row[secondaryMeasure].value) || 0;
        }

        var tgtVal = null;
        if (targetMeasure && row[targetMeasure]) {
          tgtVal = parseFloat(row[targetMeasure].value);
        }

        totalValue += val;

        // Extract drill links
        var links = [];
        if (primaryMeasure && row[primaryMeasure] && row[primaryMeasure].links) {
          links = row[primaryMeasure].links;
        } else if (stateDim && row[stateDim] && row[stateDim].links) {
          links = row[stateDim].links;
        }

        validPoints.push({
          x: projected[0],
          y: projected[1],
          coords: coords,
          value: val,
          secondaryValue: secVal,
          targetValue: tgtVal,
          state: resolveStateCode(stVal) || "US",
          rawState: stVal || "United States",
          links: links,
          row: row
        });
      });

      // Spatial Binning
      var binsMap = {};
      if (layoutMode === "hex_cartogram") {
        // Equal-Area Hexagonal Cartogram Layout
        var cartogramRadius = Math.min(mapWidth / 24, mapHeight / 16, 26);
        var xOffset = mapWidth * 0.08;
        var yOffset = mapHeight * 0.12;

        Object.keys(STATE_LOOKUP).forEach(function (code) {
          var meta = STATE_LOOKUP[code];
          var cx = xOffset + meta.hex.q * (cartogramRadius * 1.75);
          var cy = yOffset + meta.hex.r * (cartogramRadius * 1.5) + (meta.hex.q % 2 === 1 ? cartogramRadius * 0.75 : 0);

          binsMap[code] = {
            id: code,
            state: code,
            stateName: meta.name,
            cx: cx,
            cy: cy,
            radius: cartogramRadius,
            polygon: generatePointyHexPolygon(cx, cy, cartogramRadius),
            points: [],
            count: 0,
            sum: 0,
            values: [],
            targets: []
          };
        });

        validPoints.forEach(function (pt) {
          if (binsMap[pt.state]) {
            binsMap[pt.state].points.push(pt);
            binsMap[pt.state].count++;
            binsMap[pt.state].sum += pt.value;
            binsMap[pt.state].values.push(pt.value);
            if (pt.targetValue !== null) binsMap[pt.state].targets.push(pt.targetValue);
          }
        });
      } else {
        // Continuous Coordinate Spatial Binning
        validPoints.forEach(function (pt) {
          var binCoord = getHexBinCoordinates(pt.x, pt.y, hexRadius);
          var key = binCoord.binKey;

          if (!binsMap[key]) {
            binsMap[key] = {
              id: key,
              state: pt.state,
              stateName: STATE_LOOKUP[pt.state] ? STATE_LOOKUP[pt.state].name : pt.rawState,
              cx: binCoord.cx,
              cy: binCoord.cy,
              radius: hexRadius,
              polygon: generatePointyHexPolygon(binCoord.cx, binCoord.cy, hexRadius),
              points: [],
              count: 0,
              sum: 0,
              values: [],
              targets: []
            };
          }
          binsMap[key].points.push(pt);
          binsMap[key].count++;
          binsMap[key].sum += pt.value;
          binsMap[key].values.push(pt.value);
          if (pt.targetValue !== null) binsMap[key].targets.push(pt.targetValue);
        });
      }

      // Convert bins map to array and compute aggregates
      var binsArray = Object.keys(binsMap).map(function (k) {
        var b = binsMap[k];
        b.avg = b.count > 0 ? (b.sum / b.count) : 0;
        b.max = b.values.length > 0 ? Math.max.apply(null, b.values) : 0;
        b.target = b.targets.length > 0 ? (b.targets.reduce(function (acc, v) { return acc + v; }, 0) / b.targets.length) : null;
        return b;
      }).filter(function (b) {
        if (layoutMode === "hex_cartogram") return true;
        return b.count >= minThreshold;
      });

      // Sorting
      var sortOrder = config.sort_order || "natural";
      if (sortOrder === "metric_desc") {
        binsArray.sort(function (a, b) { return (b[aggType] || b.sum) - (a[aggType] || a.sum); });
      } else if (sortOrder === "metric_asc") {
        binsArray.sort(function (a, b) { return (a[aggType] || a.sum) - (b[aggType] || b.sum); });
      } else if (sortOrder === "alpha") {
        binsArray.sort(function (a, b) { return (a.stateName || a.state || "").localeCompare(b.stateName || b.state || ""); });
      } else if (sortOrder === "count_desc") {
        binsArray.sort(function (a, b) { return b.count - a.count; });
      }

      // Top-N Filter
      var topNLimit = config.top_n_limit || "all";
      var topNCount = parseInt(topNLimit, 10);
      var otherRollup = config.top_n_rollup_other !== false;
      if (!isNaN(topNCount) && topNCount > 0 && topNCount < binsArray.length) {
        if (otherRollup) {
          binsArray.forEach(function (b, idx) {
            b.isOther = idx >= topNCount;
          });
        } else {
          binsArray = binsArray.slice(0, topNCount);
        }
      }

      var values = binsArray.filter(function (b) { return b.count > 0 && !b.isOther; }).map(function (b) {
        return b[aggType] !== undefined ? b[aggType] : b.sum;
      });
      var minVal = values.length > 0 ? Math.min.apply(null, values) : 0;
      var maxVal = values.length > 0 ? Math.max.apply(null, values) : 1;
      if (minVal === maxVal) maxVal = minVal + 1;

      // Statistical Benchmarks (Mean, Median, Percentiles, Sigma)
      var sumVal = values.reduce(function (acc, v) { return acc + v; }, 0);
      var meanVal = values.length > 0 ? sumVal / values.length : 0;
      var sortedValues = values.slice().sort(function (a, b) { return a - b; });
      var medianVal = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length * 0.5)] : 0;
      var p75Val = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length * 0.75)] : 0;
      var p90Val = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length * 0.9)] : 0;

      var variance = values.length > 0 ? values.reduce(function (acc, v) { return acc + Math.pow(v - meanVal, 2); }, 0) / values.length : 0;
      var stdDev = Math.sqrt(variance);

      // Target benchmark resolution
      var targetBenchmark = null;
      if (targetMode === "fixed") targetBenchmark = parseFloat(config.custom_target_value) || 0;
      else if (targetMode === "mean") targetBenchmark = meanVal;
      else if (targetMode === "median") targetBenchmark = medianVal;
      else if (targetMode === "p75") targetBenchmark = p75Val;
      else if (targetMode === "p90") targetBenchmark = p90Val;

      // Anomaly detection cutoff
      var highlightAnomalies = config.highlight_anomalies === true;
      var sigmaMultiplier = parseFloat(config.anomaly_threshold_stddev) || 2.0;
      var anomalyCutoff = meanVal + sigmaMultiplier * stdDev;
      var anomalyCount = 0;

      binsArray.forEach(function (b) {
        var metricVal = b[aggType] !== undefined ? b[aggType] : b.sum;
        if (highlightAnomalies && b.count > 0 && metricVal >= anomalyCutoff) {
          b.isAnomaly = true;
          anomalyCount++;
        }
      });

      // Quantile Color Scale
      var colorScale = d3.scaleQuantize()
        .domain([minVal, maxVal])
        .range(colorRamp);

      // Rank assignment
      var rankedBins = binsArray.slice().sort(function (a, b) {
        return (b[aggType] || b.sum) - (a[aggType] || a.sum);
      });
      rankedBins.forEach(function (b, idx) {
        b.rank = idx + 1;
      });

      // Executive HUD Render
      if (hudMode !== "hidden") {
        var hudItems = [
          { label: "Total Points", val: totalDataPoints.toLocaleString() + " records", badge: "Live" },
          { label: "National " + aggType.toUpperCase(), val: formatMetric(totalValue, isCurrency, valueFormat), badge: isCurrency ? "USD" : "KPI" },
          { label: "Active Cells", val: binsArray.filter(function (b) { return b.count > 0; }).length + " clusters", badge: layoutMode === "hex_cartogram" ? "States" : "Hexagons" },
          {
            label: highlightAnomalies ? "Anomalies (> " + sigmaMultiplier + "σ)" : (targetBenchmark !== null ? (config.target_reference_label || "Target Quota") : "Peak Density"),
            val: highlightAnomalies ? (anomalyCount + " hot cells") : (targetBenchmark !== null ? formatMetric(targetBenchmark, isCurrency, valueFormat) : formatMetric(maxVal, isCurrency, valueFormat)),
            badge: highlightAnomalies ? "Alert" : (targetBenchmark !== null ? "Target" : "Peak"),
            isAlert: highlightAnomalies && anomalyCount > 0
          }
        ];

        if (hudMode === "compact") {
          hudItems.forEach(function (item) {
            var pill = document.createElement("div");
            pill.style.display = "inline-flex";
            pill.style.alignItems = "center";
            pill.style.gap = "6px";
            pill.style.padding = "3px 8px";
            pill.style.backgroundColor = theme.isDark ? "#1e293b" : "#f1f5f9";
            pill.style.border = "1px solid " + (item.isAlert ? "#ef4444" : theme.hudBorder);
            pill.style.borderRadius = "12px";
            pill.style.fontSize = (baseFontSize - 2) + "px";

            pill.innerHTML = '<span style="color:' + theme.subtext + ';">' + item.label + ':</span><strong style="color:' + (item.isAlert ? "#ef4444" : theme.text) + ';">' + item.val + '</strong>';
            hudContainer.appendChild(pill);
          });
        } else {
          // Full Scorecard HUD
          hudItems.forEach(function (item) {
            var card = document.createElement("div");
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "2px";
            card.style.padding = "4px 10px";
            card.style.border = "1px solid " + (item.isAlert ? "#ef4444" : theme.hudBorder);
            card.style.borderRadius = "6px";
            card.style.backgroundColor = item.isAlert ? (theme.isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2") : (theme.isDark ? "#1e293b" : "#f8fafc");

            var cardHeader = document.createElement("div");
            cardHeader.style.display = "flex";
            cardHeader.style.alignItems = "center";
            cardHeader.style.gap = "6px";

            var labelSpan = document.createElement("span");
            labelSpan.textContent = item.label;
            labelSpan.style.fontSize = (baseFontSize - 3) + "px";
            labelSpan.style.color = theme.subtext;
            labelSpan.style.textTransform = "uppercase";
            labelSpan.style.letterSpacing = "0.5px";

            var badgeSpan = document.createElement("span");
            badgeSpan.textContent = item.badge;
            badgeSpan.style.fontSize = "9px";
            badgeSpan.style.fontWeight = "700";
            badgeSpan.style.padding = "1px 4px";
            badgeSpan.style.borderRadius = "3px";
            badgeSpan.style.backgroundColor = item.isAlert ? "#ef4444" : (theme.isDark ? "#334155" : "#e2e8f0");
            badgeSpan.style.color = item.isAlert ? "#ffffff" : theme.text;

            cardHeader.appendChild(labelSpan);
            cardHeader.appendChild(badgeSpan);

            var valSpan = document.createElement("strong");
            valSpan.textContent = item.val;
            valSpan.style.fontSize = (baseFontSize + 1) + "px";
            valSpan.style.color = item.isAlert ? "#ef4444" : theme.text;
            valSpan.style.fontWeight = "700";

            card.appendChild(cardHeader);
            card.appendChild(valSpan);
            hudContainer.appendChild(card);
          });
        }
      }

      // Render Visualizations according to layoutMode
      if (layoutMode === "density_heatmap") {
        // Gaussian Radial Density Heatmap
        var heatGroup = hexLayer.append("g").attr("class", "density-heat-layer");
        binsArray.forEach(function (b) {
          if (b.count === 0) return;
          var metricVal = b[aggType] !== undefined ? b[aggType] : b.sum;
          var norm = (metricVal - minVal) / (maxVal - minVal || 1);
          var coreR = Math.max(12, hexRadius * (0.8 + norm * 1.5));
          var fillColor = colorScale(metricVal);

          heatGroup.append("circle")
            .attr("class", "heat-halo")
            .attr("cx", b.cx)
            .attr("cy", b.cy)
            .attr("r", coreR * 1.6)
            .attr("fill", fillColor)
            .attr("opacity", b.isOther ? 0.08 : (hexOpacity * 0.4))
            .attr("filter", "url(#hex-glow)");

          heatGroup.append("circle")
            .attr("class", "heat-core")
            .attr("cx", b.cx)
            .attr("cy", b.cy)
            .attr("r", coreR)
            .attr("fill", fillColor)
            .attr("opacity", b.isOther ? 0.2 : hexOpacity)
            .attr("stroke", strokeColor)
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
              d3.select(this).attr("stroke", "#38bdf8").attr("stroke-width", 2);
              self._showTooltip(event, b, isCurrency, primaryMeasureLabel, aggType, valueFormat, targetBenchmark);
            })
            .on("mousemove", function (event) { self._moveTooltip(event); })
            .on("mouseout", function () {
              d3.select(this).attr("stroke", strokeColor).attr("stroke-width", 0.5);
              self._hideTooltip();
            })
            .on("click", function (event) { self._handleClick(event, b); });
        });
      } else if (layoutMode === "cluster_bubbles") {
        // Spatial Proportional Bubble Clusters
        var bubbleGroup = hexLayer.append("g").attr("class", "bubble-cluster-layer");
        var sizeScale = d3.scaleSqrt()
          .domain([minVal, maxVal])
          .range([6, Math.max(16, hexRadius * 1.8)]);

        var bubbles = bubbleGroup.selectAll("g.bubble-node")
          .data(binsArray.filter(function (b) { return b.count > 0; }))
          .enter()
          .append("g")
          .attr("class", "bubble-node")
          .attr("transform", function (d) { return "translate(" + d.cx + "," + d.cy + ")"; })
          .style("cursor", "pointer");

        bubbles.append("circle")
          .attr("r", function (d) { return sizeScale(d[aggType] !== undefined ? d[aggType] : d.sum); })
          .attr("fill", function (d) { return colorScale(d[aggType] !== undefined ? d[aggType] : d.sum); })
          .attr("opacity", function (d) { return d.isOther ? 0.25 : hexOpacity; })
          .attr("stroke", function (d) { return d.isAnomaly ? "#ef4444" : strokeColor; })
          .attr("stroke-width", function (d) { return d.isAnomaly ? 2.5 : 1.2; })
          .on("mouseover", function (event, d) {
            d3.select(this).attr("stroke", "#38bdf8").attr("stroke-width", 2.5);
            self._showTooltip(event, d, isCurrency, primaryMeasureLabel, aggType, valueFormat, targetBenchmark);
          })
          .on("mousemove", function (event) { self._moveTooltip(event); })
          .on("mouseout", function (event, d) {
            d3.select(this).attr("stroke", d.isAnomaly ? "#ef4444" : strokeColor).attr("stroke-width", d.isAnomaly ? 2.5 : 1.2);
            self._hideTooltip();
          })
          .on("click", function (event, d) { self._handleClick(event, d); });

        if (labelDensity !== "hidden") {
          bubbles.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", theme.isDark ? "#ffffff" : "#0f172a")
            .attr("font-size", (baseFontSize - 3) + "px")
            .attr("font-weight", "700")
            .attr("pointer-events", "none")
            .text(function (d) {
              if (labelDensity === "peaks" && d.rank > 5 && !d.isAnomaly) return "";
              return d.state || "";
            });
        }
      } else {
        // Hexagonal Spatial Binning or Hex Cartogram
        var hexTiles = hexLayer.selectAll("g.hex-tile")
          .data(binsArray)
          .enter()
          .append("g")
          .attr("class", "hex-tile")
          .style("cursor", "pointer");

        hexTiles.append("path")
          .attr("d", function (d) {
            if (proportionalHex && layoutMode !== "hex_cartogram" && d.count > 0 && !d.isOther) {
              var metricVal = d[aggType] !== undefined ? d[aggType] : d.sum;
              var norm = Math.max(0.35, Math.min(1.0, (metricVal - minVal) / (maxVal - minVal || 1)));
              return generatePointyHexPolygon(d.cx, d.cy, d.radius * norm);
            }
            return d.polygon;
          })
          .attr("fill", function (d) {
            if (d.count === 0) return theme.stateFill;
            if (d.isOther) return theme.isDark ? "#334155" : "#cbd5e1";
            var metricVal = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(metricVal);
          })
          .attr("opacity", function (d) {
            if (d.count === 0) return 0.25;
            return d.isOther ? 0.35 : hexOpacity;
          })
          .attr("stroke", function (d) {
            if (d.isAnomaly) return "#ef4444";
            return strokeColor;
          })
          .attr("stroke-width", function (d) {
            if (d.isAnomaly) return 2.5;
            return d.count === 0 ? 0.5 : 1.0;
          })
          .on("mouseover", function (event, d) {
            d3.select(this).attr("stroke", "#38bdf8").attr("stroke-width", 2.5);
            self._showTooltip(event, d, isCurrency, primaryMeasureLabel, aggType, valueFormat, targetBenchmark);
          })
          .on("mousemove", function (event) { self._moveTooltip(event); })
          .on("mouseout", function (event, d) {
            d3.select(this).attr("stroke", d.isAnomaly ? "#ef4444" : strokeColor).attr("stroke-width", d.isAnomaly ? 2.5 : (d.count === 0 ? 0.5 : 1.0));
            self._hideTooltip();
          })
          .on("click", function (event, d) { self._handleClick(event, d); });

        // Labels
        if (labelDensity !== "hidden") {
          hexTiles.each(function (d) {
            if (layoutMode === "hex_cartogram") {
              var tGroup = d3.select(this);
              tGroup.append("text")
                .attr("x", d.cx)
                .attr("y", d.cy - 2)
                .attr("text-anchor", "middle")
                .attr("fill", d.count > 0 ? (theme.isDark ? "#ffffff" : "#0f172a") : theme.subtext)
                .attr("font-size", (baseFontSize - 2) + "px")
                .attr("font-weight", "700")
                .attr("pointer-events", "none")
                .text(d.state);

              if (d.count > 0 && d.radius > 18) {
                tGroup.append("text")
                  .attr("x", d.cx)
                  .attr("y", d.cy + (baseFontSize - 1))
                  .attr("text-anchor", "middle")
                  .attr("fill", d.isAnomaly ? "#ef4444" : (theme.isDark ? "#cbd5e1" : "#475569"))
                  .attr("font-size", (baseFontSize - 4) + "px")
                  .attr("font-weight", "600")
                  .attr("pointer-events", "none")
                  .text(formatMetric(d[aggType] !== undefined ? d[aggType] : d.sum, isCurrency, valueFormat));
              }
            } else if (labelDensity === "all" || (labelDensity === "peaks" && (d.rank <= 5 || d.isAnomaly))) {
              if (d.count > 0 && !d.isOther) {
                d3.select(this).append("text")
                  .attr("x", d.cx)
                  .attr("y", d.cy + 3)
                  .attr("text-anchor", "middle")
                  .attr("fill", theme.isDark ? "#ffffff" : "#0f172a")
                  .attr("font-size", (baseFontSize - 3) + "px")
                  .attr("font-weight", "700")
                  .attr("pointer-events", "none")
                  .text(d.state || (d.rank <= 3 ? "#" + d.rank : ""));
              }
            }
          });
        }
      }

      // Legend Strip
      if (showLegend && values.length > 0) {
        var legendG = svg.append("g")
          .attr("class", "map-legend")
          .attr("transform", "translate(20, " + (mapHeight - 55) + ")");

        legendG.append("rect")
          .attr("width", 220)
          .attr("height", 45)
          .attr("rx", 6)
          .attr("fill", theme.hudBg)
          .attr("stroke", theme.hudBorder)
          .attr("stroke-width", 1);

        legendG.append("text")
          .attr("x", 10)
          .attr("y", 14)
          .attr("fill", theme.subtext)
          .attr("font-size", "9.5px")
          .attr("font-weight", "700")
          .attr("text-transform", "uppercase")
          .text(primaryMeasureLabel + " (" + aggType.toUpperCase() + ")");

        var legendWidth = 200;
        var step = legendWidth / colorRamp.length;
        colorRamp.forEach(function (col, i) {
          legendG.append("rect")
            .attr("x", 10 + i * step)
            .attr("y", 20)
            .attr("width", step + 0.5)
            .attr("height", 8)
            .attr("fill", col);
        });

        legendG.append("text")
          .attr("x", 10)
          .attr("y", 38)
          .attr("fill", theme.text)
          .attr("font-size", "9px")
          .attr("font-weight", "600")
          .text(formatMetric(minVal, isCurrency && aggType !== "count", valueFormat));

        legendG.append("text")
          .attr("x", 210)
          .attr("y", 38)
          .attr("text-anchor", "end")
          .attr("fill", theme.text)
          .attr("font-size", "9px")
          .attr("font-weight", "600")
          .text(formatMetric(maxVal, isCurrency && aggType !== "count", valueFormat));
      }

      // Re-apply search filter highlights if active
      this._highlightFilter(d3);
    },

    _highlightFilter: function (d3) {
      var filterStr = this._searchFilter;
      if (!filterStr) {
        d3.selectAll(".hex-tile, .bubble-node, .heat-halo, .heat-core")
          .attr("opacity", null);
        return;
      }

      d3.selectAll(".hex-tile, .bubble-node").each(function (d) {
        var el = d3.select(this);
        var match = false;
        if (d.state && d.state.toLowerCase().indexOf(filterStr) !== -1) match = true;
        if (d.stateName && d.stateName.toLowerCase().indexOf(filterStr) !== -1) match = true;
        if (d.points && d.points.some(function (p) { return p.rawState.toLowerCase().indexOf(filterStr) !== -1; })) match = true;

        el.attr("opacity", match ? 1.0 : 0.15);
        if (match) {
          el.select("path, circle").attr("stroke", "#38bdf8").attr("stroke-width", 2.2);
        }
      });
    },

    _showTooltip: function (event, d, isCurrency, measureLabel, aggType, valueFormat, targetBenchmark) {
      var tip = this._tooltip;
      var metricVal = d[aggType] !== undefined ? d[aggType] : d.sum;

      var varianceHtml = "";
      var effectiveTarget = d.target !== null ? d.target : targetBenchmark;
      if (effectiveTarget !== null && effectiveTarget > 0) {
        var variancePct = ((metricVal - effectiveTarget) / effectiveTarget) * 100;
        var varColor = variancePct >= 0 ? "#34d399" : "#f87171";
        varianceHtml = [
          '    <span style="color: #94a3b8;">Vs Target:</span>',
          '    <strong style="color: ' + varColor + '; text-align: right;">' + (variancePct >= 0 ? "+" : "") + variancePct.toFixed(1) + '% (' + formatMetric(effectiveTarget, isCurrency, valueFormat) + ')</strong>'
        ].join("");
      }

      var anomalyHtml = "";
      if (d.isAnomaly) {
        anomalyHtml = '<div style="margin-top: 6px; padding: 2px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-size: 10px; font-weight: 700; text-align: center;">⚠️ High-Density Anomaly Alert (> 2σ)</div>';
      }

      var html = [
        '<div style="background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(10px); color: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); font-size: 12px; min-width: 200px; line-height: 1.4;">',
        '  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 5px; margin-bottom: 7px;">',
        '    <span style="font-weight: 700; color: #38bdf8; font-size: 13px;">⬡ ' + (d.stateName || d.state || "Spatial Cluster") + '</span>',
        '    <span style="font-size: 10.5px; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Rank #' + d.rank + '</span>',
        '  </div>',
        '  <div style="display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 4px; font-size: 11.5px;">',
        '    <span style="color: #94a3b8;">Binned Points:</span>',
        '    <strong style="color: #f8fafc; text-align: right;">' + d.count.toLocaleString() + ' records</strong>',
        '    <span style="color: #94a3b8;">' + measureLabel + ' (' + aggType.toUpperCase() + '):</span>',
        '    <strong style="color: #34d399; text-align: right;">' + formatMetric(metricVal, isCurrency, valueFormat) + '</strong>',
        '    <span style="color: #94a3b8;">Average / Point:</span>',
        '    <strong style="color: #fbbf24; text-align: right;">' + formatMetric(d.avg, isCurrency, valueFormat) + '</strong>',
        varianceHtml,
        '  </div>',
        anomalyHtml,
        (d.points && d.points[0] && d.points[0].links && d.points[0].links.length > 0)
          ? '  <div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #334155; font-size: 10.5px; color: #38bdf8; text-align: center; font-weight: 600;">🔎 Click to Drill Into Points</div>'
          : '',
        '</div>'
      ].join("");

      tip.innerHTML = html;
      tip.style.opacity = "1";
      this._moveTooltip(event);
    },

    _moveTooltip: function (event) {
      var tip = this._tooltip;
      var x = event.clientX + 14;
      var y = event.clientY - 14;

      var rect = tip.getBoundingClientRect();
      if (x + rect.width > window.innerWidth - 10) {
        x = event.clientX - rect.width - 14;
      }
      if (y + rect.height > window.innerHeight - 10) {
        y = window.innerHeight - rect.height - 10;
      }

      tip.style.left = x + "px";
      tip.style.top = y + "px";
    },

    _hideTooltip: function () {
      this._tooltip.style.opacity = "0";
    },

    _handleClick: function (event, d) {
      if (!d.points || !d.points.length) return;

      var targetLinks = null;
      for (var i = 0; i < d.points.length; i++) {
        if (d.points[i].links && d.points[i].links.length > 0) {
          targetLinks = d.points[i].links;
          break;
        }
      }

      if (targetLinks && targetLinks.length > 0 && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
        LookerCharts.Utils.openDrillMenu({
          links: targetLinks,
          event: event
        });
      }
    }
  });
})();
