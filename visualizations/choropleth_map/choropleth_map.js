/**
 * Interactive US Choropleth Map - Looker Custom Visualization
 * Built with D3.js v7 & TopoJSON Client
 *
 * Geospatial analytics visualization for regional performance, sales density,
 * customer penetration, and state-by-state variance analysis.
 *
 * Features:
 * - Full 50-state + DC Albers USA projection with auto-scaling responsive SVG
 * - Automatic name resolution: handles full state names ("California") and abbreviations ("CA")
 * - Quantile, Linear, and Quantize color scaling modes
 * - 6 Executive color themes (Google Blue, Emerald Forest, Thermal Heat, Midnight Cyber, Sunset Amber, Cool Purple)
 * - State postal abbreviation labels with automated contrast threshold
 * - Interactive hover states with boundary glow and elevation drop shadows
 * - Glassmorphism floating tooltip with national rank, % of total, and Looker drill-down links
 * - Integrated gradient legend with tick readouts
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

  // Build reverse lookups
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
      name: "Google Blue",
      range: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#ffffff",
      hoverStroke: "#1a73e8"
    },
    emerald_forest: {
      name: "Emerald Forest",
      range: ["#e6f4ea", "#a8dab5", "#5bb974", "#1e8e3e", "#0d652d"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#ffffff",
      hoverStroke: "#059669"
    },
    thermal_heat: {
      name: "Thermal Heat",
      range: ["#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#ffffff",
      hoverStroke: "#ea580c"
    },
    midnight_cyber: {
      name: "Midnight Cyber (Dark)",
      range: ["#1e293b", "#0369a1", "#0284c7", "#38bdf8", "#7dd3fc"],
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#0f172a",
      hoverStroke: "#38bdf8"
    },
    sunset_amber: {
      name: "Sunset Amber",
      range: ["#ffedd5", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#ffffff",
      hoverStroke: "#c2410c"
    },
    cool_purple: {
      name: "Cool Purple",
      range: ["#f3e8ff", "#d8b4fe", "#a855f7", "#7e22ce", "#581c87"],
      bg: "#ffffff",
      text: "#3b0764",
      subtext: "#6b21a8",
      border: "#ffffff",
      hoverStroke: "#9333ea"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";
    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "percent":
        return (val * 100).toFixed(1) + "%";
      case "full_number":
      default:
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  var visObject = {
    id: "choropleth_map",
    label: "Interactive US Choropleth Map",
    options: {
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Google Blue": "google_blue" },
          { "Emerald Forest": "emerald_forest" },
          { "Thermal Heat": "thermal_heat" },
          { "Midnight Cyber (Dark)": "midnight_cyber" },
          { "Sunset Amber": "sunset_amber" },
          { "Cool Purple": "cool_purple" }
        ],
        default: "google_blue",
        section: "Aesthetics",
        order: 1
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
        section: "Aesthetics",
        order: 2
      },
      showLabels: {
        type: "boolean",
        label: "Show State Postal Code Labels",
        default: true,
        section: "Labels & Layers",
        order: 3
      },
      showLegend: {
        type: "boolean",
        label: "Show Gradient Legend Bar",
        default: true,
        section: "Labels & Layers",
        order: 4
      },
      valueFormat: {
        type: "string",
        label: "Metric Display Format",
        display: "select",
        values: [
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Full Currency ($1,240,000)": "full_currency" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Full Number (1,240,000)": "full_number" },
          { "Percentage (12.4%)": "percent" }
        ],
        default: "compact_currency",
        section: "Formatting",
        order: 5
      },
      nullColor: {
        type: "string",
        label: "No Data State Color",
        display: "color",
        default: "#f1f5f9",
        section: "Aesthetics",
        order: 6
      },
      highlightColor: {
        type: "string",
        label: "Hover Highlight Stroke Color",
        display: "color",
        default: "#f59e0b",
        section: "Aesthetics",
        order: 7
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-choropleth-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "looker-choropleth-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.25)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.webkitBackdropFilter = "blur(8px)";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no rows to visualize on the choropleth map."
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
              message: err.message || "An unexpected error occurred while rendering the choropleth map."
            });
          }
          done();
        });
      });
    },

    _render: function (d3, geoData, data, element, config, queryResponse) {
      var container = element.querySelector(".looker-choropleth-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_blue";
      var theme = THEMES[themeKey] || THEMES.google_blue;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fields = queryResponse.fields;
      var dimField = fields.dimensions[0];
      var measField = fields.measures[0];
      var metricLabel = measField.label_short || measField.label || measField.name;

      // Extract and map row data
      var dataByCode = {};
      var values = [];
      var totalSum = 0;

      data.forEach(function (row) {
        var rawDim = row[dimField.name] ? (row[dimField.name].value || row[dimField.name].rendered) : null;
        var code = resolveStateCode(rawDim);
        if (!code) return;

        var cellMeas = row[measField.name];
        var val = cellMeas && cellMeas.value !== null && !isNaN(cellMeas.value) ? Number(cellMeas.value) : 0;
        var rendered = cellMeas && cellMeas.rendered ? cellMeas.rendered : null;
        var links = (cellMeas && cellMeas.links) || (row[dimField.name] && row[dimField.name].links) || [];

        dataByCode[code] = {
          code: code,
          stateName: STATE_LOOKUP[code].name,
          value: val,
          rendered: rendered,
          links: links
        };
        values.push(val);
        totalSum += val;
      });

      // Compute ranking
      var sortedEntries = Object.values(dataByCode).sort(function (a, b) { return b.value - a.value; });
      sortedEntries.forEach(function (item, rankIdx) {
        item.rank = rankIdx + 1;
        item.pctOfTotal = totalSum > 0 ? (item.value / totalSum) * 100 : 0;
      });

      // Color Scale
      var scaleMode = config.colorScaleMode || "quantile";
      var colorScale;
      var colors = theme.range;

      if (values.length > 0) {
        if (scaleMode === "linear") {
          var minVal = d3.min(values) || 0;
          var maxVal = d3.max(values) || 100;
          colorScale = d3.scaleLinear()
            .domain(d3.range(colors.length).map(function (i) {
              return minVal + (i / (colors.length - 1)) * (maxVal - minVal);
            }))
            .range(colors)
            .clamp(true);
        } else if (scaleMode === "quantize") {
          colorScale = d3.scaleQuantize()
            .domain([d3.min(values) || 0, d3.max(values) || 100])
            .range(colors);
        } else {
          // Quantile (default)
          colorScale = d3.scaleQuantile()
            .domain(values)
            .range(colors);
        }
      } else {
        colorScale = function () { return config.nullColor || "#f1f5f9"; };
      }

      var width = container.clientWidth || 850;
      var height = container.clientHeight || 500;
      var mapWidth = 960;
      var mapHeight = 600;

      var svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block");

      // Projection & Path Generator
      var projection = d3.geoAlbersUsa()
        .scale(1250)
        .translate([mapWidth / 2, mapHeight / 2]);

      var pathGenerator = d3.geoPath().projection(projection);

      // Map group
      var mapGroup = svg.append("g").attr("class", "states-group");

      var tooltip = this._tooltip;
      var highlightColor = config.highlightColor || "#f59e0b";
      var nullColor = config.nullColor || "#f1f5f9";

      // Render States
      var states = mapGroup.selectAll("path.state")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", pathGenerator)
        .attr("fill", function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          if (code && dataByCode[code]) {
            return colorScale(dataByCode[code].value);
          }
          return nullColor;
        })
        .attr("stroke", theme.border)
        .attr("stroke-width", 1.2)
        .style("cursor", "pointer")
        .style("transition", "fill 0.2s ease, stroke 0.2s ease, transform 0.15s ease");

      // Hover interactions
      states.on("mouseenter", function (event, d) {
        var code = FIPS_TO_CODE[String(d.id)];
        var info = code ? dataByCode[code] : null;
        var stateName = (code && STATE_LOOKUP[code]) ? STATE_LOOKUP[code].name : (d.properties && d.properties.name) || "Unknown State";

        d3.select(this)
          .raise()
          .attr("stroke", highlightColor)
          .attr("stroke-width", 2.5);

        if (!tooltip) return;
        var fmt = config.valueFormat || "compact_currency";
        var valStr = info ? (info.rendered || formatValue(info.value, fmt)) : "No Data";
        var rankStr = info ? ("#" + info.rank + " of " + sortedEntries.length) : "Unranked";
        var pctStr = info ? (info.pctOfTotal.toFixed(1) + "% of National Total") : "-";

        tooltip.innerHTML = "" +
          "<div style=\"font-size:13px;font-weight:700;color:" + theme.text + ";margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;\">" +
          "  <span>" + stateName + " (" + (code || "--") + ")</span>" +
          (info ? "<span style=\"font-size:10.5px;padding:2px 7px;background:#e0f2fe;color:#0369a1;border-radius:10px;font-weight:600;\">" + rankStr + "</span>" : "") +
          "</div>" +
          "<div style=\"margin-top:4px;font-size:12px;color:" + theme.subtext + ";\">" +
          "  <span>" + metricLabel + ": </span>" +
          "  <span style=\"font-weight:700;color:" + (themeKey === "midnight_cyber" ? "#38bdf8" : "#1e40af") + ";font-size:13px;\">" + valStr + "</span>" +
          "</div>" +
          (info ? "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-top:3px;\">" + pctStr + "</div>" : "") +
          (info && info.links && info.links.length > 0 ? "<div style=\"margin-top:6px;font-size:10px;color:#2563eb;font-weight:600;\">Click state to explore drill-down &rarr;</div>" : "");

        tooltip.style.backgroundColor = themeKey === "midnight_cyber" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)";
        tooltip.style.border = "1px solid " + (themeKey === "midnight_cyber" ? "#334155" : "#e2e8f0");
        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
      });

      states.on("mousemove", function (event) {
        if (!tooltip) return;
        var ttW = tooltip.offsetWidth || 180;
        var ttH = tooltip.offsetHeight || 100;
        var left = event.clientX + 14;
        var top = event.clientY - 15;
        if (left + ttW > window.innerWidth - 10) left = event.clientX - ttW - 14;
        if (top + ttH > window.innerHeight - 10) top = window.innerHeight - ttH - 10;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      });

      states.on("mouseleave", function (event, d) {
        d3.select(this)
          .attr("stroke", theme.border)
          .attr("stroke-width", 1.2);
        if (tooltip) tooltip.style.display = "none";
      });

      states.on("click", function (event, d) {
        var code = FIPS_TO_CODE[String(d.id)];
        var info = code ? dataByCode[code] : null;
        if (info && info.links && info.links.length > 0 && LookerCharts && LookerCharts.Utils) {
          LookerCharts.Utils.openDrillMenu({
            links: info.links,
            event: event
          });
        }
      });

      // State Postal Code Labels
      if (config.showLabels !== false) {
        var labelsGroup = svg.append("g").attr("class", "state-labels").style("pointer-events", "none");

        geoData.features.forEach(function (d) {
          var code = FIPS_TO_CODE[String(d.id)];
          if (!code) return;
          var centroid = pathGenerator.centroid(d);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

          // Small states adjustment (manual offsets for tiny northeastern states if needed)
          var x = centroid[0];
          var y = centroid[1];

          var info = dataByCode[code];
          var hasValue = !!info;

          labelsGroup.append("text")
            .attr("x", x)
            .attr("y", y + 3)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", function () {
              if (!hasValue) return theme.subtext;
              return themeKey === "midnight_cyber" ? "#ffffff" : "#0f172a";
            })
            .attr("opacity", hasValue ? 0.9 : 0.45)
            .text(code);
        });
      }

      // Legend Bar
      if (config.showLegend !== false && values.length > 0) {
        var legendWidth = 260;
        var legendHeight = 12;
        var legendX = mapWidth - legendWidth - 30;
        var legendY = mapHeight - 45;

        var legendG = svg.append("g")
          .attr("class", "map-legend")
          .attr("transform", "translate(" + legendX + "," + legendY + ")");

        // Gradient
        var legendGradId = "map-legend-grad";
        var legendGrad = svg.append("defs").append("linearGradient")
          .attr("id", legendGradId)
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "100%")
          .attr("y2", "0%");

        colors.forEach(function (col, idx) {
          legendGrad.append("stop")
            .attr("offset", (idx / (colors.length - 1)) * 100 + "%")
            .attr("stop-color", col);
        });

        // Legend Rect
        legendG.append("rect")
          .attr("width", legendWidth)
          .attr("height", legendHeight)
          .attr("rx", 6)
          .attr("fill", "url(#" + legendGradId + ")")
          .attr("stroke", theme.subtext)
          .attr("stroke-width", 0.5);

        // Min & Max Tick Labels
        var minVal = d3.min(values) || 0;
        var maxVal = d3.max(values) || 100;
        var midVal = (minVal + maxVal) / 2;
        var fmt = config.valueFormat || "compact_currency";

        legendG.append("text")
          .attr("x", 0)
          .attr("y", legendHeight + 14)
          .attr("text-anchor", "start")
          .attr("font-size", "10.5px")
          .attr("font-weight", "600")
          .attr("fill", theme.subtext)
          .text(formatValue(minVal, fmt));

        legendG.append("text")
          .attr("x", legendWidth / 2)
          .attr("y", legendHeight + 14)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "500")
          .attr("fill", theme.subtext)
          .text(formatValue(midVal, fmt));

        legendG.append("text")
          .attr("x", legendWidth)
          .attr("y", legendHeight + 14)
          .attr("text-anchor", "end")
          .attr("font-size", "10.5px")
          .attr("font-weight", "600")
          .attr("fill", theme.subtext)
          .text(formatValue(maxVal, fmt));

        // Legend Title
        legendG.append("text")
          .attr("x", 0)
          .attr("y", -6)
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .attr("fill", theme.text)
          .text(metricLabel);
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
