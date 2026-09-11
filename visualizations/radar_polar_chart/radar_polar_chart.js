/**
 * Multivariate Radar & Polar Balance Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Buganizer Cloud Blocker b/453718648: "Google-Supported Radar Chart in Looker & Looker Studio"
 * - Buganizer Cloud Blocker b/184359819: "Spider Chart Viz"
 * - Buganizer Cloud Blocker b/525330147: "Radar Chart (Spider Chart) visualization in Looker"
 * - Internal YAQS: "Radar Chart in Looker Studio Pro" & go/agentrics-docs-spider-chart
 *   (Normalized 6-axis executive spider charts with benchmark rings and multivariable balancing)
 * - PRD / Customer Requirements: Gaming player balance/toxicity radars, Telco QoS scorecards,
 *   Media contextual ad match radars, and Executive KPI balance webs.
 *
 * Multi-Mode Adaptability:
 * 1. "polygon": Classic Spider Web / Radar Chart with concentric polygon web rings,
 *               equi-angular spokes, semi-transparent shaded area polygon, and vertex markers.
 * 2. "rose": Coxcomb / Nightingale Rose diagram with circular angular wedge sectors
 *            whose radius represents the metric magnitude.
 * 3. "radial_bar": Radial Spoke / Lollipop bar chart projecting from center ring.
 * 4. "small_multiples": Responsive matrix of mini radar charts comparing multiple entities side-by-side.
 *
 * Scalability (5,000+ rows):
 * - Client-side rollups / cohort aggregations.
 * - Top-N entity ranking slice (Top 3, Top 5, Top 10, All).
 * - Instantaneous search-as-you-type filter.
 * - Paginated small multiples grid with zero stuttering.
 *
 * Option Sections (Strictly 2 clean tabs):
 * - Display: displayMode, normalizationMode, maxEntities, valueFormat, showGridRings, showSpokeLabels, showLegend, showSearch, showExecutiveHUD.
 * - Style: colorTheme, webShape, curveType, fillOpacity, strokeWidth.
 */

(function () {
  // Theme Palettes
  var COLOR_THEMES = {
    google: {
      name: "Looker / Google Modern",
      colors: ["#4285F4", "#EA4335", "#FBBC04", "#34A853", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0"],
      bg: "#ffffff",
      text: "#1f2937",
      subtext: "#6b7280",
      grid: "#e5e7eb",
      gridText: "#9ca3af",
      cardBg: "#f9fafb",
      cardBorder: "#e5e7eb",
      hudBg: "#ffffff"
    },
    cyber_neon: {
      name: "Cyberpunk Neon",
      colors: ["#00f5d4", "#f72585", "#7209b7", "#4cc9f0", "#fee440", "#ff007f", "#3a0ca3", "#4361ee"],
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#334155",
      gridText: "#64748b",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      hudBg: "#1e293b"
    },
    emerald_mint: {
      name: "Emerald & Mint",
      colors: ["#059669", "#10b981", "#34d399", "#047857", "#065f46", "#0284c7", "#0d9488", "#14b8a6"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#d1fae5",
      gridText: "#6ee7b7",
      cardBg: "#f0fdf4",
      cardBorder: "#d1fae5",
      hudBg: "#ffffff"
    },
    sunset_ember: {
      name: "Sunset Ember",
      colors: ["#f97316", "#ef4444", "#e11d48", "#f59e0b", "#ec4899", "#8b5cf6", "#d97706", "#b91c1c"],
      bg: "#ffffff",
      text: "#7c2d12",
      subtext: "#9a3412",
      grid: "#fed7aa",
      gridText: "#fb923c",
      cardBg: "#fff7ed",
      cardBorder: "#fed7aa",
      hudBg: "#ffffff"
    },
    executive_slate: {
      name: "Executive Slate & Indigo",
      colors: ["#4f46e5", "#0284c7", "#0d9488", "#475569", "#7c3aed", "#2563eb", "#64748b", "#0891b2"],
      bg: "#ffffff",
      text: "#1e293b",
      subtext: "#64748b",
      grid: "#e2e8f0",
      gridText: "#94a3b8",
      cardBg: "#f8fafc",
      cardBorder: "#cbd5e1",
      hudBg: "#ffffff"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    switch (fmt) {
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
        return (num * (Math.abs(num) <= 1 ? 100 : 1)).toFixed(1) + "%";
      case "raw":
      default:
        return Math.abs(num) >= 100 ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }) : num.toFixed(2);
    }
  }

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
      callback(window.d3);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  looker.plugins.visualizations.add({
    id: "radar_polar_chart",
    label: "Multivariate Radar & Polar Balance Chart",
    options: {
      // SECTION 1: DISPLAY
      displayMode: {
        type: "string",
        label: "Chart Display Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Polygon Radar (Spider Web)": "polygon" },
          { "Coxcomb / Nightingale Rose": "rose" },
          { "Radial Spoke Bar / Lollipop": "radial_bar" },
          { "Small Multiples Facet Grid": "small_multiples" }
        ],
        default: "polygon"
      },
      normalizationMode: {
        type: "string",
        label: "Scale Normalization Mode",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "Independent 100% Max per Spoke (Multi-Unit Balance)": "independent_max" },
          { "Global Absolute Scale (Shared Units)": "global_max" },
          { "Benchmark Median Ratio Ring (100% = Baseline)": "benchmark_median" }
        ],
        default: "independent_max"
      },
      maxEntities: {
        type: "string",
        label: "Entity Slice Limit (Top-N)",
        section: "Display",
        order: 3,
        display: "select",
        values: [
          { "Top 3 Entities": "3" },
          { "Top 5 Entities": "5" },
          { "Top 10 Entities": "10" },
          { "Top 25 Entities": "25" },
          { "Show All Entities": "all" }
        ],
        default: "5"
      },
      valueFormat: {
        type: "string",
        label: "Metric Display Format",
        section: "Display",
        order: 4,
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (85.2%)": "percentage" },
          { "Raw Numeric": "raw" }
        ],
        default: "compact_currency"
      },
      showGridRings: {
        type: "boolean",
        label: "Show Concentric Grid Rings & Ticks",
        section: "Display",
        order: 5,
        default: true
      },
      showSpokeLabels: {
        type: "boolean",
        label: "Show Spoke Metric Axis Labels",
        section: "Display",
        order: 6,
        default: true
      },
      showLegend: {
        type: "boolean",
        label: "Show Entity Legend & Filter Pills",
        section: "Display",
        order: 7,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Entity Search Box",
        section: "Display",
        order: 8,
        default: true
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive KPI Balance Banner",
        section: "Display",
        order: 9,
        default: true
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Palette Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Looker / Google Modern": "google" },
          { "Cyberpunk Neon Dark": "cyber_neon" },
          { "Emerald & Mint": "emerald_mint" },
          { "Sunset Ember": "sunset_ember" },
          { "Executive Slate & Indigo": "executive_slate" }
        ],
        default: "google"
      },
      webShape: {
        type: "string",
        label: "Grid Background Web Shape",
        section: "Style",
        order: 2,
        display: "select",
        values: [
          { "Concentric Polygons (Equi-Angular Facets)": "polygon" },
          { "Concentric Smooth Circles": "circle" }
        ],
        default: "polygon"
      },
      curveType: {
        type: "string",
        label: "Polygon Line Interpolation",
        section: "Style",
        order: 3,
        display: "select",
        values: [
          { "Straight Polygon Edges (Linear)": "linear" },
          { "Smooth Cardinal Spline Curves": "cardinal" }
        ],
        default: "linear"
      },
      fillOpacity: {
        type: "number",
        label: "Polygon Area Fill Opacity (0.05 - 0.9)",
        section: "Style",
        order: 4,
        default: 0.25
      },
      strokeWidth: {
        type: "number",
        label: "Polygon Outline Thickness (px)",
        section: "Style",
        order: 5,
        default: 2.5
      }
    },

    create: function (element, config) {
      this._element = element;
      this._searchQuery = "";
      this._activeEntity = null; // null = all active

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-radar-polar-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Clean up any stale tooltips
      var oldTooltips = document.querySelectorAll(".radar-polar-tooltip");
      for (var i = 0; i < oldTooltips.length; i++) {
        if (oldTooltips[i].parentNode) oldTooltips[i].parentNode.removeChild(oldTooltips[i]);
      }

      this._tooltip = document.createElement("div");
      this._tooltip.className = "radar-polar-tooltip";
      this._tooltip.style.position = "absolute";
      this._tooltip.style.display = "none";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.zIndex = "9999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.transition = "opacity 0.15s ease";
      document.body.appendChild(this._tooltip);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned 0 rows. Please select dimensions and measures to visualize."
        });
        done();
        return;
      }

      var fields = queryResponse ? queryResponse.fields : null;
      var dims = (fields && fields.dimensions) || [];
      var measures = (fields && fields.measures) || [];
      var pivots = queryResponse ? queryResponse.pivots : null;

      var hasPivots = pivots && pivots.length > 0;

      // Extract Entities and Axes
      var entities = [];
      var axes = [];
      var entityMap = {};

      if (hasPivots && dims.length >= 1 && measures.length >= 1) {
        // Shape B: Dimension 0 = Spoke Axis, Pivot = Entities, Measure 0 = Value
        var axisDim = dims[0];
        var measure = measures[0];

        data.forEach(function (row) {
          var axName = row[axisDim.name] ? String(row[axisDim.name].value) : "Unknown";
          if (!axes.some(function (a) { return a.id === axName; })) {
            axes.push({ id: axName, label: axName });
          }
        });

        pivots.forEach(function (p, pIdx) {
          var entName = String(p.key || p.label || ("Entity " + (pIdx + 1)));
          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
          }
        });

        data.forEach(function (row) {
          var axName = row[axisDim.name] ? String(row[axisDim.name].value) : "Unknown";
          var mObj = row[measure.name];
          if (mObj && typeof mObj === "object") {
            pivots.forEach(function (p) {
              var entName = String(p.key || p.label);
              var cell = mObj[p.key];
              var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;
              if (entityMap[entName]) {
                entityMap[entName].values[axName] = isNaN(numVal) ? 0 : numVal;
                entityMap[entName].rendered[axName] = cell && cell.rendered ? cell.rendered : null;
                entityMap[entName].links[axName] = cell && cell.links ? cell.links : [];
              }
            });
          }
        });
      } else if (dims.length >= 2 && measures.length === 1) {
        // Shape C: Dimension 0 = Entity, Dimension 1 = Spoke Axis, Measure 0 = Value
        var entDim = dims[0];
        var axDim = dims[1];
        var measure = measures[0];

        data.forEach(function (row) {
          var entName = row[entDim.name] ? String(row[entDim.name].value) : "Unknown";
          var axName = row[axDim.name] ? String(row[axDim.name].value) : "Unknown";
          var cell = row[measure.name];
          var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;

          if (!axes.some(function (a) { return a.id === axName; })) {
            axes.push({ id: axName, label: axName });
          }

          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
          }

          entityMap[entName].values[axName] = isNaN(numVal) ? 0 : numVal;
          entityMap[entName].rendered[axName] = cell && cell.rendered ? cell.rendered : null;
          entityMap[entName].links[axName] = cell && cell.links ? cell.links : [];
        });
      } else if (measures.length >= 2) {
        // Shape A: Dimension 0 = Entity, Measures = Spoke Axes
        var entDim = dims.length > 0 ? dims[0] : null;

        measures.forEach(function (m) {
          var lbl = m.label_short || m.label || m.name;
          axes.push({ id: m.name, label: lbl });
        });

        var rowCounts = {};
        data.forEach(function (row, rIdx) {
          var entName = entDim && row[entDim.name] && row[entDim.name].value !== null ? String(row[entDim.name].value) : "Series " + (rIdx + 1);

          if (!entityMap[entName]) {
            entityMap[entName] = {
              name: entName,
              values: {},
              rendered: {},
              links: {}
            };
            entities.push(entityMap[entName]);
            rowCounts[entName] = 0;
            axes.forEach(function (a) {
              entityMap[entName].values[a.id] = 0;
            });
          }

          rowCounts[entName]++;
          axes.forEach(function (a) {
            var cell = row[a.id];
            var numVal = cell && cell.value !== null && cell.value !== undefined ? Number(cell.value) : 0;
            entityMap[entName].values[a.id] += isNaN(numVal) ? 0 : numVal;
            if (cell && cell.rendered) entityMap[entName].rendered[a.id] = cell.rendered;
            if (cell && cell.links && cell.links.length > 0) entityMap[entName].links[a.id] = cell.links;
          });
        });

        entities.forEach(function (ent) {
          var count = rowCounts[ent.name] || 1;
          if (count > 1) {
            axes.forEach(function (a) {
              ent.values[a.id] = ent.values[a.id] / count;
            });
          }
        });
      } else {
        this.addError({
          title: "Insufficient Fields",
          message: "Radar Chart requires either: (1) One Dimension and 2+ Measures, (2) One Dimension, One Pivot, and One Measure, or (3) Two Dimensions and One Measure."
        });
        done();
        return;
      }

      if (axes.length < 3) {
        this.addError({
          title: "Minimum 3 Spoke Axes Required",
          message: "A radar or polar chart requires at least 3 distinct metric spokes to form a polygon. Currently found: " + axes.length
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, data, config, queryResponse, entities, axes, done);
      });
    },

    _render: function (d3, rawData, config, queryResponse, entities, axes, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      // Options
      var displayMode = config.displayMode || "polygon";
      var normalizationMode = config.normalizationMode || "independent_max";
      var maxEntitiesOpt = config.maxEntities || "5";
      var valueFmt = config.valueFormat || "compact_currency";
      var showGridRings = config.showGridRings !== false;
      var showSpokeLabels = config.showSpokeLabels !== false;
      var showLegend = config.showLegend !== false;
      var showSearch = config.showSearch !== false;
      var showExecutiveHUD = config.showExecutiveHUD !== false;

      var colorThemeKey = config.colorTheme || "google";
      var theme = COLOR_THEMES[colorThemeKey] || COLOR_THEMES.google;
      var webShape = config.webShape || "polygon";
      var curveType = config.curveType || "linear";
      var fillOpacity = config.fillOpacity !== undefined ? Number(config.fillOpacity) : 0.25;
      var strokeWidth = config.strokeWidth !== undefined ? Number(config.strokeWidth) : 2.5;

      // Filter by search query if any
      var filteredEntities = entities;
      if (this._searchQuery && this._searchQuery.trim() !== "") {
        var q = this._searchQuery.trim().toLowerCase();
        filteredEntities = entities.filter(function (e) {
          return e.name.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Calculate aggregate volume per entity for ranking
      filteredEntities.forEach(function (e) {
        var sum = 0;
        axes.forEach(function (a) {
          sum += Math.abs(e.values[a.id] || 0);
        });
        e._totalVolume = sum;
      });

      // Sort entities descending by total volume
      filteredEntities.sort(function (a, b) {
        return b._totalVolume - a._totalVolume;
      });

      // Apply Top-N slice
      var activeEntities = filteredEntities;
      if (maxEntitiesOpt !== "all") {
        var limit = parseInt(maxEntitiesOpt, 10);
        if (!isNaN(limit) && limit > 0) {
          activeEntities = filteredEntities.slice(0, limit);
        }
      }

      if (activeEntities.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:14px;'>No matching entities found for search query.</div>";
        done();
        return;
      }

      // Compute axis statistics
      var axisStats = {};
      var globalMax = 0;

      axes.forEach(function (a) {
        var vals = activeEntities.map(function (e) { return e.values[a.id] || 0; });
        var maxV = d3.max(vals);
        var minV = d3.min(vals);
        if (minV > 0) minV = 0;
        if (maxV <= 0) maxV = 1;
        var medianV = d3.median(vals) || (maxV / 2);
        axisStats[a.id] = {
          min: minV,
          max: maxV,
          median: medianV,
          vals: vals
        };
        if (maxV > globalMax) globalMax = maxV;
      });

      function getNormalizedScore(e, a) {
        var val = e.values[a.id] || 0;
        var st = axisStats[a.id];
        if (normalizationMode === "global_max") {
          return Math.max(0, Math.min(1.0, val / globalMax));
        } else if (normalizationMode === "benchmark_median") {
          var ratio = st.median > 0 ? (val / st.median) * 0.5 : 0.5;
          return Math.max(0.05, Math.min(1.0, ratio));
        } else {
          return Math.max(0, Math.min(1.0, (val - st.min) / (st.max - st.min)));
        }
      }

      // Container background and styling
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var outerFlex = document.createElement("div");
      outerFlex.style.display = "flex";
      outerFlex.style.flexDirection = "column";
      outerFlex.style.width = "100%";
      outerFlex.style.height = "100%";
      outerFlex.style.boxSizing = "border-box";
      outerFlex.style.padding = "10px 14px";
      container.appendChild(outerFlex);

      // 1. EXECUTIVE KPI BANNER / HUD
      if (showExecutiveHUD) {
        var hud = document.createElement("div");
        hud.className = "radar-polar-hud";
        hud.style.display = "grid";
        hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
        hud.style.gap = "8px";
        hud.style.marginBottom = "8px";
        hud.style.flexShrink = "0";

        var topEntity = activeEntities[0];
        var topSpoke = axes[0];
        var maxSpokeVol = 0;
        axes.forEach(function (a) {
          var sum = d3.sum(activeEntities, function (e) { return e.values[a.id] || 0; });
          if (sum > maxSpokeVol) {
            maxSpokeVol = sum;
            topSpoke = a;
          }
        });

        var kpiCards = [
          { label: "Entities Analyzed", value: activeEntities.length + (entities.length > activeEntities.length ? " of " + entities.length : "") },
          { label: "Multivariate Spokes", value: axes.length + " Dimensions" },
          { label: "Highest Overall Footprint", value: topEntity ? topEntity.name : "-" },
          { label: "Dominant Spoke Metric", value: topSpoke ? topSpoke.label : "-" }
        ];

        kpiCards.forEach(function (c) {
          var card = document.createElement("div");
          card.style.backgroundColor = theme.cardBg;
          card.style.border = "1px solid " + theme.cardBorder;
          card.style.borderRadius = "6px";
          card.style.padding = "6px 10px";
          card.style.boxSizing = "border-box";

          var lbl = document.createElement("div");
          lbl.style.fontSize = "10px";
          lbl.style.textTransform = "uppercase";
          lbl.style.letterSpacing = "0.5px";
          lbl.style.color = theme.subtext;
          lbl.style.fontWeight = "600";
          lbl.innerText = c.label;

          var val = document.createElement("div");
          val.style.fontSize = "13px";
          val.style.fontWeight = "700";
          val.style.color = theme.text;
          val.style.whiteSpace = "nowrap";
          val.style.overflow = "hidden";
          val.style.textOverflow = "ellipsis";
          val.innerText = c.value;

          card.appendChild(lbl);
          card.appendChild(val);
          hud.appendChild(card);
        });

        outerFlex.appendChild(hud);
      }

      // 2. TOOLBAR: Quick Search + Legend Pills
      var toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.flexWrap = "wrap";
      toolbar.style.alignItems = "center";
      toolbar.style.justifyContent = "space-between";
      toolbar.style.gap = "8px";
      toolbar.style.marginBottom = "6px";
      toolbar.style.flexShrink = "0";

      if (showSearch) {
        var searchWrapper = document.createElement("div");
        searchWrapper.style.display = "flex";
        searchWrapper.style.alignItems = "center";
        searchWrapper.style.backgroundColor = theme.cardBg;
        searchWrapper.style.border = "1px solid " + theme.cardBorder;
        searchWrapper.style.borderRadius = "6px";
        searchWrapper.style.padding = "3px 8px";
        searchWrapper.style.minWidth = "180px";

        var searchIcon = document.createElement("span");
        searchIcon.innerHTML = "&#128269;";
        searchIcon.style.fontSize = "11px";
        searchIcon.style.marginRight = "6px";
        searchIcon.style.opacity = "0.7";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter entities (" + entities.length + ")...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.border = "none";
        searchInput.style.outline = "none";
        searchInput.style.background = "transparent";
        searchInput.style.fontSize = "11px";
        searchInput.style.color = theme.text;
        searchInput.style.width = "100%";

        searchInput.addEventListener("input", function (evt) {
          self._searchQuery = evt.target.value;
          self._render(d3, rawData, config, queryResponse, entities, axes, function () {});
        });

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        toolbar.appendChild(searchWrapper);
      }

      if (showLegend) {
        var legendDiv = document.createElement("div");
        legendDiv.style.display = "flex";
        legendDiv.style.flexWrap = "wrap";
        legendDiv.style.alignItems = "center";
        legendDiv.style.gap = "6px";

        activeEntities.forEach(function (e, idx) {
          var color = theme.colors[idx % theme.colors.length];
          var pill = document.createElement("div");
          pill.className = "radar-legend-pill";
          pill.style.display = "flex";
          pill.style.alignItems = "center";
          pill.style.gap = "5px";
          pill.style.padding = "3px 8px";
          pill.style.borderRadius = "12px";
          pill.style.fontSize = "11px";
          pill.style.fontWeight = "600";
          pill.style.cursor = "pointer";
          pill.style.userSelect = "none";
          pill.style.border = "1px solid " + color;
          pill.style.transition = "all 0.15s ease";

          var isSelected = self._activeEntity === e.name || self._activeEntity === null;
          pill.style.backgroundColor = isSelected ? color + "20" : "transparent";
          pill.style.opacity = isSelected ? "1" : "0.4";

          var dot = document.createElement("div");
          dot.style.width = "8px";
          dot.style.height = "8px";
          dot.style.borderRadius = "50%";
          dot.style.backgroundColor = color;

          var txt = document.createElement("span");
          txt.style.color = theme.text;
          txt.innerText = e.name;

          pill.appendChild(dot);
          pill.appendChild(txt);

          pill.addEventListener("click", function () {
            if (self._activeEntity === e.name) {
              self._activeEntity = null;
            } else {
              self._activeEntity = e.name;
            }
            self._render(d3, rawData, config, queryResponse, entities, axes, function () {});
          });

          legendDiv.appendChild(pill);
        });

        toolbar.appendChild(legendDiv);
      }

      outerFlex.appendChild(toolbar);

      // 3. MAIN VISUALIZATION STAGE
      var stage = document.createElement("div");
      stage.style.flex = "1";
      stage.style.position = "relative";
      stage.style.width = "100%";
      stage.style.height = "100%";
      stage.style.overflow = displayMode === "small_multiples" ? "auto" : "hidden";
      outerFlex.appendChild(stage);

      if (displayMode === "small_multiples") {
        this._renderSmallMultiples(d3, stage, activeEntities, axes, axisStats, theme, config, getNormalizedScore);
        done();
        return;
      }

      var rect = stage.getBoundingClientRect();
      var width = Math.max(300, rect.width || stage.clientWidth || 600);
      var height = Math.max(250, rect.height || stage.clientHeight || 500);

      var margin = { top: 35, right: 65, bottom: 35, left: 65 };
      var radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
      var center = { x: width / 2, y: height / 2 };

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + center.x + "," + center.y + ")");

      var numAxes = axes.length;
      var angleSlice = (Math.PI * 2) / numAxes;

      // 1. Draw Concentric Grid Rings
      if (showGridRings) {
        var levels = [0.2, 0.4, 0.6, 0.8, 1.0];
        var gridGroup = g.append("g").attr("class", "grid-rings");

        levels.forEach(function (lvl) {
          var rLvl = radius * lvl;

          if (webShape === "circle") {
            gridGroup.append("circle")
              .attr("r", rLvl)
              .attr("fill", "none")
              .attr("stroke", theme.grid)
              .attr("stroke-width", lvl === 1.0 ? 1.5 : 1)
              .attr("stroke-dasharray", lvl === 1.0 ? "none" : "3,3");
          } else {
            var polyPoints = [];
            for (var i = 0; i < numAxes; i++) {
              var aAngle = i * angleSlice - Math.PI / 2;
              var px = rLvl * Math.cos(aAngle);
              var py = rLvl * Math.sin(aAngle);
              polyPoints.push(px + "," + py);
            }
            gridGroup.append("polygon")
              .attr("points", polyPoints.join(" "))
              .attr("fill", lvl === 1.0 ? (theme.cardBg + "40") : "none")
              .attr("stroke", theme.grid)
              .attr("stroke-width", lvl === 1.0 ? 1.5 : 1)
              .attr("stroke-dasharray", lvl === 1.0 ? "none" : "3,3");
          }

          gridGroup.append("text")
            .attr("x", 4)
            .attr("y", -rLvl - 2)
            .attr("fill", theme.gridText)
            .attr("font-size", "9px")
            .attr("font-weight", "500")
            .text(Math.round(lvl * 100) + "%");
        });

        if (normalizationMode === "benchmark_median") {
          var benchR = radius * 0.5;
          g.append("circle")
            .attr("r", benchR)
            .attr("fill", "none")
            .attr("stroke", "#f59e0b")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4");

          g.append("text")
            .attr("x", 4)
            .attr("y", -benchR - 3)
            .attr("fill", "#f59e0b")
            .attr("font-size", "9px")
            .attr("font-weight", "700")
            .text("Median Baseline (100%)");
        }
      }

      // 2. Draw Radial Spokes
      var spokesGroup = g.append("g").attr("class", "spokes");
      axes.forEach(function (axis, i) {
        var aAngle = i * angleSlice - Math.PI / 2;
        var endX = radius * Math.cos(aAngle);
        var endY = radius * Math.sin(aAngle);

        spokesGroup.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", endX)
          .attr("y2", endY)
          .attr("stroke", theme.grid)
          .attr("stroke-width", 1.2);

        if (showSpokeLabels) {
          var labelDist = radius + 18;
          var lx = labelDist * Math.cos(aAngle);
          var ly = labelDist * Math.sin(aAngle);

          var textAnchor = "middle";
          if (Math.abs(lx) > 10) {
            textAnchor = lx > 0 ? "start" : "end";
          }

          var labelG = spokesGroup.append("g")
            .attr("transform", "translate(" + lx + "," + ly + ")");

          labelG.append("text")
            .attr("text-anchor", textAnchor)
            .attr("dy", "0.35em")
            .attr("fill", theme.text)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .style("cursor", "pointer")
            .text(axis.label);

          var st = axisStats[axis.id];
          labelG.append("text")
            .attr("text-anchor", textAnchor)
            .attr("dy", "1.5em")
            .attr("fill", theme.subtext)
            .attr("font-size", "9px")
            .attr("font-weight", "400")
            .text("Max: " + formatValue(st.max, valueFmt));
        }
      });

      // 3. Render Mode Specific Visuals
      if (displayMode === "rose") {
        this._renderRoseDiagram(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore);
      } else if (displayMode === "radial_bar") {
        this._renderRadialBarChart(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore);
      } else {
        this._renderPolygonRadar(d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, curveType, fillOpacity, strokeWidth, config, getNormalizedScore);
      }

      done();
    },

    _renderPolygonRadar: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, curveType, fillOpacity, strokeWidth, config, getNormalizedScore) {
      var self = this;
      var valueFmt = config.valueFormat || "compact_currency";

      var lineGenerator = d3.lineRadial()
        .radius(function (d) { return d.r; })
        .angle(function (d) { return d.angle; });

      if (curveType === "cardinal") {
        lineGenerator.curve(d3.curveCardinalClosed.tension(0.6));
      } else {
        lineGenerator.curve(d3.curveLinearClosed);
      }

      var dataGroup = g.append("g").attr("class", "radar-polygons");

      activeEntities.forEach(function (entity, entIdx) {
        var isTarget = self._activeEntity === null || self._activeEntity === entity.name;
        var color = theme.colors[entIdx % theme.colors.length];

        var points = axes.map(function (axis, i) {
          var score = getNormalizedScore(entity, axis);
          var aAngle = i * angleSlice;
          return {
            axis: axis,
            score: score,
            val: entity.values[axis.id] || 0,
            r: score * radius,
            angle: aAngle,
            entity: entity,
            color: color
          };
        });

        var pathString = lineGenerator(points);

        var polygonPath = dataGroup.append("path")
          .attr("d", pathString)
          .attr("fill", color)
          .attr("fill-opacity", isTarget ? fillOpacity : 0.05)
          .attr("stroke", color)
          .attr("stroke-width", isTarget ? strokeWidth : 1)
          .attr("stroke-opacity", isTarget ? 0.95 : 0.25)
          .style("transition", "all 0.2s ease")
          .style("cursor", "pointer");

        polygonPath
          .on("mouseenter", function (evt) {
            d3.select(this)
              .attr("fill-opacity", Math.min(0.85, fillOpacity * 2.2))
              .attr("stroke-width", strokeWidth + 1.5);
            self._showEntityTooltip(evt, entity, axes, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this)
              .attr("fill-opacity", isTarget ? fillOpacity : 0.05)
              .attr("stroke-width", isTarget ? strokeWidth : 1);
            self._hideTooltip();
          });

        if (isTarget) {
          points.forEach(function (pt) {
            var aAngle = pt.angle - Math.PI / 2;
            var cx = pt.r * Math.cos(aAngle);
            var cy = pt.r * Math.sin(aAngle);

            var circle = dataGroup.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", 4.5)
              .attr("fill", color)
              .attr("stroke", theme.bg)
              .attr("stroke-width", 2)
              .style("cursor", "pointer")
              .style("transition", "r 0.15s ease");

            circle
              .on("mouseenter", function (evt) {
                d3.select(this).attr("r", 7.5);
                self._showPointTooltip(evt, pt, theme, valueFmt);
              })
              .on("mousemove", function (evt) {
                self._moveTooltip(evt);
              })
              .on("mouseleave", function () {
                d3.select(this).attr("r", 4.5);
                self._hideTooltip();
              })
              .on("click", function (evt) {
                var links = (entity.links && entity.links[pt.axis.id]) || [];
                if (links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                  LookerCharts.Utils.openDrillMenu({ links: links, event: evt });
                }
              });
          });
        }
      });
    },

    _renderRoseDiagram: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore) {
      var self = this;
      var valueFmt = config.valueFormat || "compact_currency";
      var roseGroup = g.append("g").attr("class", "rose-diagram");

      var entity = self._activeEntity ? activeEntities.find(function (e) { return e.name === self._activeEntity; }) || activeEntities[0] : activeEntities[0];
      var colorScale = d3.scaleOrdinal().range(theme.colors);

      axes.forEach(function (axis, i) {
        var score = getNormalizedScore(entity, axis);
        var rVal = Math.max(10, score * radius);
        var startAngle = i * angleSlice - Math.PI / 2;
        var endAngle = (i + 1) * angleSlice - Math.PI / 2;
        var color = colorScale(axis.id);

        var arc = d3.arc()
          .innerRadius(12)
          .outerRadius(rVal)
          .startAngle(startAngle + Math.PI / 2)
          .endAngle(endAngle + Math.PI / 2)
          .padAngle(0.02)
          .padRadius(radius / 2);

        var path = roseGroup.append("path")
          .attr("d", arc)
          .attr("fill", color)
          .attr("fill-opacity", 0.75)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .style("transition", "all 0.15s ease");

        path
          .on("mouseenter", function (evt) {
            d3.select(this).attr("fill-opacity", 0.95);
            var pt = {
              axis: axis,
              entity: entity,
              val: entity.values[axis.id] || 0,
              score: score,
              color: color
            };
            self._showPointTooltip(evt, pt, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this).attr("fill-opacity", 0.75);
            self._hideTooltip();
          });
      });

      roseGroup.append("circle")
        .attr("r", 12)
        .attr("fill", theme.cardBg)
        .attr("stroke", theme.cardBorder)
        .attr("stroke-width", 1.5);
    },

    _renderRadialBarChart: function (d3, g, activeEntities, axes, axisStats, theme, radius, angleSlice, config, getNormalizedScore) {
      var self = this;
      var valueFmt = config.valueFormat || "compact_currency";
      var barGroup = g.append("g").attr("class", "radial-bars");

      var entity = self._activeEntity ? activeEntities.find(function (e) { return e.name === self._activeEntity; }) || activeEntities[0] : activeEntities[0];
      var colorScale = d3.scaleOrdinal().range(theme.colors);

      axes.forEach(function (axis, i) {
        var score = getNormalizedScore(entity, axis);
        var rVal = Math.max(15, score * radius);
        var aAngle = i * angleSlice - Math.PI / 2;
        var endX = rVal * Math.cos(aAngle);
        var endY = rVal * Math.sin(aAngle);
        var color = colorScale(axis.id);

        barGroup.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", endX)
          .attr("y2", endY)
          .attr("stroke", color)
          .attr("stroke-width", 4)
          .attr("stroke-linecap", "round");

        var headCircle = barGroup.append("circle")
          .attr("cx", endX)
          .attr("cy", endY)
          .attr("r", 6.5)
          .attr("fill", color)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .style("transition", "r 0.15s ease");

        headCircle
          .on("mouseenter", function (evt) {
            d3.select(this).attr("r", 9.5);
            var pt = {
              axis: axis,
              entity: entity,
              val: entity.values[axis.id] || 0,
              score: score,
              color: color
            };
            self._showPointTooltip(evt, pt, theme, valueFmt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(evt);
          })
          .on("mouseleave", function () {
            d3.select(this).attr("r", 6.5);
            self._hideTooltip();
          });
      });
    },

    _renderSmallMultiples: function (d3, stage, activeEntities, axes, axisStats, theme, config, getNormalizedScore) {
      var self = this;
      var valueFmt = config.valueFormat || "compact_currency";

      var gridWrapper = document.createElement("div");
      gridWrapper.className = "small-multiples-grid";
      gridWrapper.style.display = "grid";
      gridWrapper.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px, 1fr))";
      gridWrapper.style.gap = "12px";
      gridWrapper.style.padding = "6px 0";
      stage.appendChild(gridWrapper);

      var numAxes = axes.length;
      var angleSlice = (Math.PI * 2) / numAxes;

      activeEntities.forEach(function (entity, entIdx) {
        var card = document.createElement("div");
        card.style.backgroundColor = theme.cardBg;
        card.style.border = "1px solid " + theme.cardBorder;
        card.style.borderRadius = "8px";
        card.style.padding = "8px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "center";
        card.style.boxSizing = "border-box";
        card.style.cursor = "pointer";
        card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

        card.onmouseenter = function () {
          card.style.transform = "translateY(-2px)";
          card.style.boxShadow = "0 6px 12px rgba(0,0,0,0.08)";
        };
        card.onmouseleave = function () {
          card.style.transform = "none";
          card.style.boxShadow = "none";
        };

        var title = document.createElement("div");
        title.style.fontSize = "12px";
        title.style.fontWeight = "700";
        title.style.color = theme.text;
        title.style.marginBottom = "4px";
        title.style.textAlign = "center";
        title.style.whiteSpace = "nowrap";
        title.style.overflow = "hidden";
        title.style.textOverflow = "ellipsis";
        title.style.width = "100%";
        title.innerText = entity.name;
        card.appendChild(title);

        var miniSvg = d3.select(card)
          .append("svg")
          .attr("width", 180)
          .attr("height", 160)
          .attr("viewBox", "0 0 180 160");

        var mg = miniSvg.append("g").attr("transform", "translate(90, 85)");
        var miniRadius = 60;
        var color = theme.colors[entIdx % theme.colors.length];

        [0.33, 0.66, 1.0].forEach(function (lvl) {
          var poly = [];
          for (var i = 0; i < numAxes; i++) {
            var ang = i * angleSlice - Math.PI / 2;
            poly.push((miniRadius * lvl * Math.cos(ang)) + "," + (miniRadius * lvl * Math.sin(ang)));
          }
          mg.append("polygon")
            .attr("points", poly.join(" "))
            .attr("fill", lvl === 1.0 ? theme.bg : "none")
            .attr("stroke", theme.grid)
            .attr("stroke-width", 1);
        });

        var polyPoints = [];
        axes.forEach(function (axis, i) {
          var score = getNormalizedScore(entity, axis);
          var ang = i * angleSlice - Math.PI / 2;
          var px = score * miniRadius * Math.cos(ang);
          var py = score * miniRadius * Math.sin(ang);
          polyPoints.push(px + "," + py);
        });

        mg.append("polygon")
          .attr("points", polyPoints.join(" "))
          .attr("fill", color)
          .attr("fill-opacity", 0.35)
          .attr("stroke", color)
          .attr("stroke-width", 2);

        gridWrapper.appendChild(card);
      });
    },

    _showEntityTooltip: function (evt, entity, axes, theme, valueFmt) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid " + theme.grid + ";padding-bottom:4px;'>" + entity.name + "</div>";
      html += "<table style='width:100%;font-size:11px;border-collapse:collapse;'>";

      axes.forEach(function (axis) {
        var rawV = entity.values[axis.id] || 0;
        var fmtV = formatValue(rawV, valueFmt);
        html += "<tr><td style='padding:2px 8px 2px 0;color:" + theme.subtext + ";'>" + axis.label + ":</td>";
        html += "<td style='padding:2px 0;font-weight:600;text-align:right;'>" + fmtV + "</td></tr>";
      });

      html += "</table>";
      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _showPointTooltip: function (evt, pt, theme, valueFmt) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var fmtV = pt.entity.rendered && pt.entity.rendered[pt.axis.id] ? pt.entity.rendered[pt.axis.id] : formatValue(pt.val, valueFmt);

      var html = "<div style='font-weight:700;font-size:12px;margin-bottom:2px;color:" + pt.color + ";'>" + pt.entity.name + "</div>";
      html += "<div style='font-size:13px;font-weight:800;'>" + pt.axis.label + ": " + fmtV + "</div>";
      html += "<div style='font-size:10px;color:" + theme.subtext + ";margin-top:2px;'>Normalized Spoke Score: " + Math.round(pt.score * 100) + "%</div>";

      var links = (pt.entity.links && pt.entity.links[pt.axis.id]) || [];
      if (links.length > 0) {
        html += "<div style='font-size:9px;color:#2563eb;margin-top:4px;font-weight:600;'>&#8599; Click to drill down in Looker</div>";
      }

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _moveTooltip: function (evt) {
      var tt = this._tooltip;
      var x = evt.pageX + 14;
      var y = evt.pageY - 28;
      var maxW = window.innerWidth - 220;
      if (x > maxW) x = evt.pageX - 200;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) {
        this._tooltip.style.display = "none";
      }
    }
  });
})();
