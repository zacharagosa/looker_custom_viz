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
 * - 5,000+ Row Scalability: High-performance client-side spatial indexing and $O(N)$ binning engine.
 * - Flexible Geo-Resolution: Seamlessly handles raw Lat/Long coordinates OR State/Region string names.
 * - Interactive Pan & Zoom: Smooth D3 zoom with bounds clamping and floating navigation controls.
 * - Executive Spatial HUD: Real-time national rollups (Total Points, Volume, Active Cells, Peak Density).
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

  // Load D3 and TopoJSON asynchronously if missing
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

    // Cube coordinates rounding
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
    emerald_surge: ["#022c22", "#064e3b", "#047857", "#059669", "#10b981", "#34d399", "#6ee7b7", "#d1fae5"]
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
    }
  };

  // Metric Formatter
  function formatMetric(val, isCurrency) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = parseFloat(val);
    var prefix = isCurrency ? "$" : "";
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
      // === SECTION: DISPLAY ===
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
      hex_radius: {
        type: "number",
        label: "Hexagon Cell Radius (px)",
        default: 20,
        section: "Display",
        order: 3
      },
      proportional_hex_size: {
        type: "boolean",
        label: "Scale Hex Size by Magnitude",
        default: true,
        section: "Display",
        order: 4
      },
      min_points_threshold: {
        type: "number",
        label: "Min Points per Hexbin",
        default: 1,
        section: "Display",
        order: 5
      },
      show_hud: {
        type: "boolean",
        label: "Show Spatial KPI HUD",
        default: true,
        section: "Display",
        order: 6
      },
      show_search: {
        type: "boolean",
        label: "Show State/Region Search",
        default: true,
        section: "Display",
        order: 7
      },
      show_legend: {
        type: "boolean",
        label: "Show Density Legend",
        default: true,
        section: "Display",
        order: 8
      },

      // === SECTION: STYLE ===
      color_palette: {
        type: "string",
        label: "Color Ramp Palette",
        values: [
          { "Plasma (Purple-Orange-Yellow)": "plasma" },
          { "Turbo (Full Thermal Spectrum)": "turbo" },
          { "Viridis (Emerald-Teal-Yellow)": "viridis" },
          { "Inferno (Black-Crimson-Gold)": "inferno" },
          { "Electric Blue (Navy-Cyan-White)": "electric_blue" },
          { "Sunset Amber (Burgundy-Gold)": "sunset_amber" },
          { "Emerald Surge (Forest-Mint)": "emerald_surge" }
        ],
        display: "select",
        default: "plasma",
        section: "Style",
        order: 1
      },
      basemap_theme: {
        type: "string",
        label: "Basemap Theme",
        values: [
          { "Light Clean (Google Modern)": "light_clean" },
          { "Dark Slate (Executive NOC)": "dark_slate" },
          { "Midnight Navy": "midnight_navy" },
          { "Paper Minimal": "paper_minimal" }
        ],
        display: "select",
        default: "light_clean",
        section: "Style",
        order: 2
      },
      hex_opacity: {
        type: "number",
        label: "Hexagon Opacity (0.2 - 1.0)",
        default: 0.85,
        section: "Style",
        order: 3
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
        order: 4
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.innerHTML = "";

      this._container = document.createElement("div");
      this._container.className = "looker-hexbin-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      element.appendChild(this._container);

      // Create global floating tooltip
      this._tooltip = document.createElement("div");
      this._tooltip.className = "looker-hexbin-tooltip";
      this._tooltip.style.position = "fixed";
      this._tooltip.style.zIndex = "999999";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.opacity = "0";
      this._tooltip.style.transition = "opacity 0.15s ease-out, transform 0.15s ease-out";
      document.body.appendChild(this._tooltip);

      this._searchFilter = "";
      this._currentZoomTransform = null;
      this._lastHeight = 0;
      this._lastWidth = 0;

      var self = this;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var entry = entries[0];
          var newH = entry.contentRect.height;
          var newW = entry.contentRect.width;
          if (Math.abs(newH - self._lastHeight) > 4 || Math.abs(newW - self._lastWidth) > 4) {
            self._lastHeight = newH;
            self._lastWidth = newW;
            if (self._lastData && self._lastConfig && self._lastQueryResponse) {
              self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, null, function () {});
            }
          }
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

      // Find Lat/Long or State dimensions
      var latDim = null;
      var lonDim = null;
      var stateDim = null;

      dims.forEach(function (d) {
        var n = d.name.toLowerCase();
        if (n.indexOf("lat") !== -1 && !latDim) latDim = d.name;
        else if ((n.indexOf("lon") !== -1 || n.indexOf("lng") !== -1) && !lonDim) lonDim = d.name;
        else if ((n.indexOf("state") !== -1 || n.indexOf("region") !== -1 || n.indexOf("city") !== -1) && !stateDim) stateDim = d.name;
      });

      // Find primary and secondary measures
      var primaryMeasure = meas.length > 0 ? meas[0].name : (dims.length > 1 ? dims[1].name : null);
      var secondaryMeasure = meas.length > 1 ? meas[1].name : null;
      var primaryMeasureLabel = (meas.length > 0 ? meas[0].label_short || meas[0].label : "Value");
      var isCurrency = primaryMeasureLabel.toLowerCase().indexOf("price") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("sale") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("revenue") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("spend") !== -1 ||
                         primaryMeasureLabel.toLowerCase().indexOf("margin") !== -1;

      // Configuration options
      var layoutMode = config.layout_mode || "hexbin_density";
      var aggType = config.aggregation_type || "sum";
      var hexRadius = parseInt(config.hex_radius, 10) || 20;
      var proportionalHex = config.proportional_hex_size !== false;
      var minThreshold = parseInt(config.min_points_threshold, 10) || 1;
      var showHud = config.show_hud !== false;
      var showSearch = config.show_search !== false;
      var showLegend = config.show_legend !== false;
      var paletteKey = config.color_palette || "plasma";
      var colorRamp = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.plasma;
      var themeKey = config.basemap_theme || "light_clean";
      var theme = BASEMAP_THEMES[themeKey] || BASEMAP_THEMES.light_clean;
      var hexOpacity = parseFloat(config.hex_opacity) || 0.85;
      var hexStrokeMode = config.hex_stroke || "crisp_white";

      var strokeColor = "rgba(255, 255, 255, 0.85)";
      if (hexStrokeMode === "subtle_dark") strokeColor = "rgba(15, 23, 42, 0.75)";
      else if (hexStrokeMode === "neon_accent") strokeColor = "#38bdf8";
      else if (hexStrokeMode === "none") strokeColor = "none";

      container.style.backgroundColor = theme.bg;

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
      hudContainer.style.gap = "14px";
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
        searchInput.style.fontSize = "12px";
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
          self._searchFilter = e.target.value.trim().toLowerCase();
          self._highlightFilter(d3);
        });
      }

      // Reset Zoom Button
      var resetBtn = document.createElement("button");
      resetBtn.innerHTML = "↺ Reset";
      resetBtn.title = "Reset Zoom & Pan";
      resetBtn.style.padding = "4px 10px";
      resetBtn.style.fontSize = "11.5px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.border = "1px solid " + theme.hudBorder;
      resetBtn.style.backgroundColor = theme.isDark ? "#1e293b" : "#f1f5f9";
      resetBtn.style.color = theme.text;
      resetBtn.style.cursor = "pointer";
      controlsContainer.appendChild(resetBtn);

      // SVG Canvas Wrapper
      var svgWrapper = document.createElement("div");
      svgWrapper.style.flex = "1 1 0";
      svgWrapper.style.minHeight = "0";
      svgWrapper.style.position = "relative";
      svgWrapper.style.overflow = "hidden";
      container.appendChild(svgWrapper);

      var mapWidth = svgWrapper.clientWidth || width;
      var mapHeight = svgWrapper.clientHeight || (height - 50);

      var svg = d3.select(svgWrapper)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block")
        .style("background-color", theme.mapBg);

      // Defs for filters and gradients
      var defs = svg.append("defs");

      // Blur filter for Gaussian density mode
      var filter = defs.append("filter")
        .attr("id", "hexbin-heat-blur")
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");
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

      // Project and Process Data Points
      var totalDataPoints = 0;
      var totalValue = 0;
      var validPoints = [];

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

        var secVal = 0;
        if (secondaryMeasure && row[secondaryMeasure]) {
          secVal = parseFloat(row[secondaryMeasure].value) || 0;
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

        validPoints.forEach(function (pt) {
          var st = pt.state;
          var hexInfo = STATE_LOOKUP[st] ? STATE_LOOKUP[st].hex : null;
          if (!hexInfo) return;

          var cx = xOffset + cartogramRadius * Math.sqrt(3) * (hexInfo.q + hexInfo.r / 2);
          var cy = yOffset + cartogramRadius * (3 / 2) * hexInfo.r;
          var key = "carto_" + st;

          if (!binsMap[key]) {
            binsMap[key] = {
              key: key,
              cx: cx,
              cy: cy,
              radius: cartogramRadius,
              state: st,
              stateName: STATE_LOOKUP[st].name,
              count: 0,
              sum: 0,
              max: -Infinity,
              points: []
            };
          }
          binsMap[key].count++;
          binsMap[key].sum += pt.value;
          if (pt.value > binsMap[key].max) binsMap[key].max = pt.value;
          binsMap[key].points.push(pt);
        });
      } else {
        // Hexagonal Spatial Tessellation Grid
        validPoints.forEach(function (pt) {
          var binCoord = getHexBinCoordinates(pt.x, pt.y, hexRadius);
          var key = binCoord.binKey;

          if (!binsMap[key]) {
            binsMap[key] = {
              key: key,
              cx: binCoord.cx,
              cy: binCoord.cy,
              radius: hexRadius,
              state: pt.state,
              stateName: pt.rawState,
              count: 0,
              sum: 0,
              max: -Infinity,
              points: []
            };
          }
          binsMap[key].count++;
          binsMap[key].sum += pt.value;
          if (pt.value > binsMap[key].max) binsMap[key].max = pt.value;
          binsMap[key].points.push(pt);
        });
      }

      // Finalize bin metrics and filter by threshold
      var binsArray = Object.keys(binsMap).map(function (k) {
        var b = binsMap[k];
        b.avg = b.count > 0 ? b.sum / b.count : 0;
        return b;
      }).filter(function (b) {
        return b.count >= minThreshold;
      });

      // Sort bins descending by selected aggregation metric
      binsArray.sort(function (a, b) {
        var valA = a[aggType] !== undefined ? a[aggType] : a.sum;
        var valB = b[aggType] !== undefined ? b[aggType] : b.sum;
        return valB - valA;
      });

      // Compute ranks
      binsArray.forEach(function (b, idx) {
        b.rank = idx + 1;
      });

      // Calculate metric domain for color scale
      var values = binsArray.map(function (b) {
        return b[aggType] !== undefined ? b[aggType] : b.sum;
      });

      var minVal = d3.min(values) || 0;
      var maxVal = d3.max(values) || 1;
      if (minVal === maxVal) maxVal = minVal + 1;

      // D3 Color Scale
      var colorScale = d3.scaleQuantize()
        .domain([minVal, maxVal])
        .range(colorRamp);

      // Radius Scale for Proportional Hexagons
      var radiusScale = d3.scaleSqrt()
        .domain([minVal, maxVal])
        .range([hexRadius * 0.42, hexRadius * 0.96]);

      // Render HUD Summary
      if (showHud) {
        var peakBin = binsArray.length > 0 ? binsArray[0] : null;
        var peakVal = peakBin ? (peakBin[aggType] !== undefined ? peakBin[aggType] : peakBin.sum) : 0;

        var hudItems = [
          { label: "Total Points", val: totalDataPoints.toLocaleString() + " rows", icon: "📍" },
          { label: "Total Volume", val: formatMetric(totalValue, isCurrency), icon: "💎" },
          { label: "Active Cells", val: binsArray.length.toLocaleString() + " hexbins", icon: "⬡" },
          { label: "Peak Density", val: formatMetric(peakVal, isCurrency && aggType !== "count") + " (" + (peakBin ? peakBin.count + " pts" : "0") + ")", icon: "🔥" }
        ];

        hudContainer.innerHTML = "";
        hudItems.forEach(function (it) {
          var chip = document.createElement("div");
          chip.style.display = "flex";
          chip.style.alignItems = "center";
          chip.style.gap = "6px";
          chip.style.fontSize = "11.5px";

          var iconSpan = document.createElement("span");
          iconSpan.innerHTML = it.icon;
          iconSpan.style.fontSize = "13px";

          var textDiv = document.createElement("div");
          textDiv.style.display = "flex";
          textDiv.style.flexDirection = "column";

          var labelSpan = document.createElement("span");
          labelSpan.innerText = it.label;
          labelSpan.style.fontSize = "9.5px";
          labelSpan.style.textTransform = "uppercase";
          labelSpan.style.letterSpacing = "0.4px";
          labelSpan.style.color = theme.subtext;

          var valSpan = document.createElement("span");
          valSpan.innerText = it.val;
          valSpan.style.fontWeight = "700";
          valSpan.style.color = theme.text;

          textDiv.appendChild(labelSpan);
          textDiv.appendChild(valSpan);
          chip.appendChild(iconSpan);
          chip.appendChild(textDiv);
          hudContainer.appendChild(chip);
        });
      }

      // Render Layout Elements
      if (layoutMode === "density_heatmap") {
        // Continuous Gaussian Density Contours
        var heatG = hexLayer.append("g").attr("class", "gaussian-density-layer");
        heatG.selectAll("circle.heat-halo")
          .data(binsArray)
          .enter()
          .append("circle")
          .attr("class", "heat-halo")
          .attr("cx", function (d) { return d.cx; })
          .attr("cy", function (d) { return d.cy; })
          .attr("r", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return radiusScale(v) * 2.2;
          })
          .attr("fill", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(v);
          })
          .attr("opacity", hexOpacity * 0.7)
          .style("filter", "url(#hexbin-heat-blur)");

        // Subtle core centers
        heatG.selectAll("circle.heat-core")
          .data(binsArray)
          .enter()
          .append("circle")
          .attr("class", "heat-core")
          .attr("cx", function (d) { return d.cx; })
          .attr("cy", function (d) { return d.cy; })
          .attr("r", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return radiusScale(v) * 0.85;
          })
          .attr("fill", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(v);
          })
          .attr("stroke", strokeColor)
          .attr("stroke-width", 0.75)
          .attr("opacity", hexOpacity)
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) { self._showTooltip(event, d, isCurrency, primaryMeasureLabel, aggType); })
          .on("mousemove", function (event, d) { self._moveTooltip(event); })
          .on("mouseleave", function () { self._hideTooltip(); })
          .on("click", function (event, d) { self._handleClick(event, d); });

      } else if (layoutMode === "cluster_bubbles") {
        // Spatial Bubble Clusters with Volume Halos
        var bubbleG = hexLayer.append("g").attr("class", "bubble-cluster-layer");

        var bubbles = bubbleG.selectAll("g.bubble-node")
          .data(binsArray)
          .enter()
          .append("g")
          .attr("class", "bubble-node")
          .attr("transform", function (d) { return "translate(" + d.cx + "," + d.cy + ")"; })
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) { self._showTooltip(event, d, isCurrency, primaryMeasureLabel, aggType); })
          .on("mousemove", function (event, d) { self._moveTooltip(event); })
          .on("mouseleave", function () { self._hideTooltip(); })
          .on("click", function (event, d) { self._handleClick(event, d); });

        bubbles.append("circle")
          .attr("r", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return radiusScale(v) * 1.35;
          })
          .attr("fill", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(v);
          })
          .attr("opacity", 0.25);

        bubbles.append("circle")
          .attr("r", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return radiusScale(v);
          })
          .attr("fill", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(v);
          })
          .attr("stroke", strokeColor)
          .attr("stroke-width", 1.2)
          .attr("opacity", hexOpacity);

        bubbles.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", ".35em")
          .attr("fill", "#ffffff")
          .attr("font-size", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return Math.max(9, Math.min(13, radiusScale(v) * 0.65)) + "px";
          })
          .attr("font-weight", "700")
          .attr("pointer-events", "none")
          .text(function (d) {
            return d.count >= 1000 ? (d.count / 1000).toFixed(1) + "k" : d.count;
          });

      } else {
        // Default "hexbin_density" and "hex_cartogram"
        var hexG = hexLayer.append("g").attr("class", "hexagonal-tiles");

        var hexTiles = hexG.selectAll("g.hex-tile")
          .data(binsArray)
          .enter()
          .append("g")
          .attr("class", "hex-tile")
          .attr("transform", function (d) { return "translate(" + d.cx + "," + d.cy + ")"; })
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) {
            d3.select(this).select("path")
              .transition().duration(120)
              .attr("stroke", "#38bdf8")
              .attr("stroke-width", 2.2);
            self._showTooltip(event, d, isCurrency, primaryMeasureLabel, aggType);
          })
          .on("mousemove", function (event, d) { self._moveTooltip(event); })
          .on("mouseleave", function () {
            d3.select(this).select("path")
              .transition().duration(120)
              .attr("stroke", strokeColor)
              .attr("stroke-width", hexStrokeMode === "none" ? 0 : 0.85);
            self._hideTooltip();
          })
          .on("click", function (event, d) { self._handleClick(event, d); });

        hexTiles.append("path")
          .attr("d", function (d) {
            var r = d.radius;
            if (proportionalHex && layoutMode !== "hex_cartogram") {
              var v = d[aggType] !== undefined ? d[aggType] : d.sum;
              r = radiusScale(v);
            }
            return generatePointyHexPolygon(0, 0, r);
          })
          .attr("fill", function (d) {
            var v = d[aggType] !== undefined ? d[aggType] : d.sum;
            return colorScale(v);
          })
          .attr("stroke", strokeColor)
          .attr("stroke-width", hexStrokeMode === "none" ? 0 : 0.85)
          .attr("opacity", hexOpacity);

        // State labels in Cartogram Mode
        if (layoutMode === "hex_cartogram") {
          hexTiles.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.15em")
            .attr("fill", "#ffffff")
            .attr("font-size", "11px")
            .attr("font-weight", "800")
            .attr("pointer-events", "none")
            .text(function (d) { return d.state; });

          hexTiles.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.1em")
            .attr("fill", "rgba(255, 255, 255, 0.85)")
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .attr("pointer-events", "none")
            .text(function (d) {
              return formatMetric(d[aggType] !== undefined ? d[aggType] : d.sum, isCurrency);
            });
        }
      }

      // Legend Component
      if (showLegend) {
        var legendG = svg.append("g")
          .attr("class", "density-legend")
          .attr("transform", "translate(" + 20 + "," + (mapHeight - 48) + ")");

        legendG.append("rect")
          .attr("width", 210)
          .attr("height", 38)
          .attr("rx", 6)
          .attr("fill", theme.hudBg)
          .attr("stroke", theme.hudBorder)
          .attr("stroke-width", 1)
          .style("backdrop-filter", "blur(6px)");

        var legendTitle = (aggType === "count" ? "Point Density" : primaryMeasureLabel) + " (" + aggType.toUpperCase() + ")";
        legendG.append("text")
          .attr("x", 10)
          .attr("y", 13)
          .attr("fill", theme.subtext)
          .attr("font-size", "9.5px")
          .attr("font-weight", "600")
          .attr("text-transform", "uppercase")
          .attr("letter-spacing", "0.3px")
          .text(legendTitle);

        var swatchWidth = 190 / colorRamp.length;
        colorRamp.forEach(function (clr, idx) {
          legendG.append("rect")
            .attr("x", 10 + idx * swatchWidth)
            .attr("y", 18)
            .attr("width", swatchWidth)
            .attr("height", 8)
            .attr("fill", clr);
        });

        legendG.append("text")
          .attr("x", 10)
          .attr("y", 33)
          .attr("fill", theme.text)
          .attr("font-size", "9px")
          .attr("font-weight", "600")
          .text(formatMetric(minVal, isCurrency && aggType !== "count"));

        legendG.append("text")
          .attr("x", 200)
          .attr("y", 33)
          .attr("text-anchor", "end")
          .attr("fill", theme.text)
          .attr("font-size", "9px")
          .attr("font-weight", "600")
          .text(formatMetric(maxVal, isCurrency && aggType !== "count"));
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

    _showTooltip: function (event, d, isCurrency, measureLabel, aggType) {
      var tip = this._tooltip;
      var metricVal = d[aggType] !== undefined ? d[aggType] : d.sum;

      var html = [
        '<div style="background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(10px); color: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); font-size: 12px; min-width: 190px; line-height: 1.4;">',
        '  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 5px; margin-bottom: 7px;">',
        '    <span style="font-weight: 700; color: #38bdf8; font-size: 13px;">⬡ ' + (d.stateName || d.state || "Spatial Cluster") + '</span>',
        '    <span style="font-size: 10.5px; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Rank #' + d.rank + '</span>',
        '  </div>',
        '  <div style="display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 4px; font-size: 11.5px;">',
        '    <span style="color: #94a3b8;">Binned Points:</span>',
        '    <strong style="color: #f8fafc; text-align: right;">' + d.count.toLocaleString() + ' records</strong>',
        '    <span style="color: #94a3b8;">' + measureLabel + ' (Sum):</span>',
        '    <strong style="color: #34d399; text-align: right;">' + formatMetric(d.sum, isCurrency) + '</strong>',
        '    <span style="color: #94a3b8;">Average / Point:</span>',
        '    <strong style="color: #fbbf24; text-align: right;">' + formatMetric(d.avg, isCurrency) + '</strong>',
        '  </div>',
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

      // Clamp within viewport
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

      // Find first valid links array
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
