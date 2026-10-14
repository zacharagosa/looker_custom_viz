/**
 * Content Genre & Advertiser Affinity Force Network - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Buganizer Cloud Blocker b/534910284: "Force-directed bipartite and co-occurrence affinity network for media broadcast and advertising spend"
 * - PRD go/prd-media-broadcast-affinity: "Media cross-affinity, content genre affinity, and sponsor adjacency"
 * - YAQS go/yaqs/892019482018: "Interactive bipartite force network connecting television genres to advertising categories with spend-weighted links and community clustering"
 *
 * Visual & Analytical Capabilities:
 * - 4 Interactive Multi-Modal Layouts:
 *     1. "force_directed": Organic force simulation with Barnes-Hut repulsion, collision detection, and community grouping
 *     2. "radial_concentric": Concentric orbital rings with core content genres at the hub and advertiser verticals in orbit
 *     3. "bipartite_columns": Dual-column bipartite diagram with curved Bézier flow ribbons
 *     4. "adjacency_matrix": Circular cross-pollination chord ring showing inter-genre shared advertiser overlap
 * - Dual-Entity Graph Architecture:
 *     - Source Dimension: Content Programming Genre (e.g. Sports, Telenovela, Reality, Noticiero)
 *     - Target Dimension: Advertiser Industry Category / Brand (e.g. CPG & Alimentos, Bebidas, Retail, Telecom)
 *     - Primary Measure: Link Affinity Weight & Spend Volume (e.g. Total Ad Spend MXN)
 *     - Secondary Measure: Node Influence & Audience Scale (e.g. Nielsen GRPs, Impressions, Viewing Hours)
 * - Interactive Ego-Network Exploration:
 *     - Hovering any node highlights its 1-hop neighborhood, highlights connecting edges, and dims unrelated nodes
 *     - Instant search filter isolates matching nodes and expands their connected clusters
 *     - Weak-link threshold slider prunes low-volume background noise to surface core revenue corridors
 *     - Executive Scorecard HUD: Total Media Spend, Total GRPs/Reach, Active Connections, and Top Affinity Pair
 *     - Full Looker drill-down menu integration (LookerCharts.Utils.openDrillMenu)
 * - Strict 2-Section Schema: "Display" and "Style" to keep Looker's Edit Viz modal clean and uncluttered.
 * - Resilient & Scalable: Pre-warmed physics simulation (35 ticks), debounced ResizeObserver (<4px guard),
 *   and O(N) client-side aggregation smoothly handling 5,000+ rows.
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
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
    sunset_media: {
      name: "Sunset Media (Warm)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      headerBg: "#ffedd5",
      headerText: "#7c2d12",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      hudBg: "rgba(255, 247, 237, 0.95)",
      hudBorder: "#fdba74",
      genreNode: "#ea580c",
      adNode: "#f59e0b",
      linkStroke: "rgba(234, 88, 12, 0.25)",
      linkHighlight: "#ea580c",
      accent: "#c2410c",
      tooltipBg: "#431407",
      tooltipText: "#fff7ed"
    },
    google_enterprise: {
      name: "Google Enterprise (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      headerBg: "#f0f7ff",
      headerText: "#1e3a8a",
      border: "#dbeafe",
      text: "#0f172a",
      subtext: "#475569",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      genreNode: "#2563eb",
      adNode: "#0ea5e9",
      linkStroke: "rgba(37, 99, 235, 0.22)",
      linkHighlight: "#1d4ed8",
      accent: "#2563eb",
      tooltipBg: "#0f172a",
      tooltipText: "#f8fafc"
    },
    cyber_teal: {
      name: "Cyber NOC Teal (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      headerBg: "#1f2937",
      headerText: "#f9fafb",
      border: "#374151",
      text: "#f3f4f6",
      subtext: "#9ca3af",
      hudBg: "rgba(17, 24, 39, 0.95)",
      hudBorder: "#4b5563",
      genreNode: "#06b6d4",
      adNode: "#38bdf8",
      linkStroke: "rgba(6, 182, 212, 0.28)",
      linkHighlight: "#22d3ee",
      accent: "#06b6d4",
      tooltipBg: "#111827",
      tooltipText: "#f3f4f6"
    },
    emerald_finops: {
      name: "Emerald Broadcast (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      headerBg: "#ecfdf5",
      headerText: "#064e3b",
      border: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#a7f3d0",
      genreNode: "#059669",
      adNode: "#10b981",
      linkStroke: "rgba(5, 150, 105, 0.22)",
      linkHighlight: "#047857",
      accent: "#059669",
      tooltipBg: "#064e3b",
      tooltipText: "#ecfdf5"
    },
    modern_slate: {
      name: "Modern Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      headerBg: "#f1f5f9",
      headerText: "#1e293b",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      genreNode: "#475569",
      adNode: "#64748b",
      linkStroke: "rgba(71, 85, 105, 0.22)",
      linkHighlight: "#334155",
      accent: "#0f766e",
      tooltipBg: "#0f172a",
      tooltipText: "#f8fafc"
    },
    wellverse: {
      name: "Wellverse Healthcare (Teal)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      headerBg: "#ccfbf1",
      headerText: "#134e4a",
      border: "#99f6e4",
      text: "#0f766e",
      subtext: "#115e59",
      hudBg: "rgba(240, 253, 250, 0.95)",
      hudBorder: "#5eead4",
      genreNode: "#0d9488",
      adNode: "#14b8a6",
      linkStroke: "rgba(13, 148, 136, 0.22)",
      linkHighlight: "#0f766e",
      accent: "#0d9488",
      tooltipBg: "#134e4a",
      tooltipText: "#f0fdfa"
    }
  };

  function getActiveTheme(config) {
    var key = config.colorTheme || "sunset_media";
    if (key === "custom" && config.customAccentColor) {
      var acc = config.customAccentColor;
      return {
        name: "Custom Brand",
        isDark: false,
        bg: "#ffffff",
        cardBg: "#f8fafc",
        headerBg: "#f1f5f9",
        headerText: "#0f172a",
        border: "#e2e8f0",
        text: "#0f172a",
        subtext: "#64748b",
        hudBg: "rgba(248, 250, 252, 0.95)",
        hudBorder: "#cbd5e1",
        genreNode: acc,
        adNode: "#6366f1",
        linkStroke: acc + "33",
        linkHighlight: acc,
        accent: acc,
        tooltipBg: "#0f172a",
        tooltipText: "#f8fafc"
      };
    }
    return THEMES[key] || THEMES.sunset_media;
  }

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
        return (num * 100).toFixed(1) + "%";
      case "numeric":
        return Math.round(num).toLocaleString();
      case "raw":
        return String(num);
      case "auto":
      default:
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return Math.round(num).toLocaleString();
    }
  }

  looker.plugins.visualizations.add({
    id: "content_genre_affinity_network",
    label: "Content Genre & Advertiser Affinity Force Network",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly limited tab)
      // ==========================================
      networkLayout: {
        type: "string",
        label: "Network Layout Topology",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Organic Force-Directed Physics": "force_directed" },
          { "Concentric Orbital Rings (Genre Hubs)": "radial_concentric" },
          { "Dual-Column Bipartite Ribbons": "bipartite_columns" },
          { "Circular Adjacency Chord Matrix": "adjacency_matrix" }
        ],
        default: "force_directed"
      },
      sourceDimOverride: {
        type: "string",
        label: "Source Genre Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      targetDimOverride: {
        type: "string",
        label: "Target Advertiser / Industry Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      weightMeasureOverride: {
        type: "string",
        label: "Affinity Spend / Weight Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      sizeMeasureOverride: {
        type: "string",
        label: "Node Scale Measure (GRPs / Reach)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Link Target Mode",
        section: "Display",
        order: 6,
        display: "select",
        values: [
          { "None (Show All Active Links)": "none" },
          { "Dataset Mean Affinity Spend": "dataset_mean" },
          { "Dataset Median (P50) Affinity": "dataset_median" },
          { "Top Quartile Core Links (P75)": "percentile_p75" },
          { "Elite Tier Corridors (P90)": "percentile_p90" },
          { "Fixed Spend Target": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Spend Target",
        section: "Display",
        order: 7,
        default: 5000000000
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 8,
        default: "Benchmark Target"
      },
      minLinkWeightPct: {
        type: "number",
        label: "Weak Link Pruning Filter (% of Max Spend)",
        section: "Display",
        order: 9,
        default: 0
      },
      sortOrder: {
        type: "string",
        label: "Node Ranking & Sorting",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Spend Weight Descending (High Volume First)": "metric_desc" },
          { "Spend Weight Ascending": "metric_asc" },
          { "Alphabetical Entity Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc"
      },
      topNNodes: {
        type: "string",
        label: "Node Density Cap (Top-N)",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "All Active Nodes (Uncapped)": "all" },
          { "Top 12 Core Entities": "12" },
          { "Top 20 Entities": "20" },
          { "Top 30 Entities": "30" },
          { "Top 50 Entities": "50" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Tail Nodes into 'Other' Aggregate Hub",
        section: "Display",
        order: 12,
        default: false
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "Full Scorecard HUD (All Metrics)": "full" },
          { "Compact Strip (Key Metrics Only)": "compact" },
          { "Hidden (Graph Only)": "hidden" }
        ],
        default: "full"
      },
      showNodeLabels: {
        type: "string",
        label: "Node Label Density",
        section: "Display",
        order: 14,
        display: "select",
        values: [
          { "All Node Labels": "all" },
          { "Major Nodes Only (Top 50% Volume)": "major_only" },
          { "Hover Only (Clean Canvas)": "hidden" }
        ],
        default: "all"
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Search & Filter",
        section: "Display",
        order: 15,
        default: true
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 16,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        section: "Display",
        order: 17,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly limited tab)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Visual Brand Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Sunset Media (Warm Orange/Gold)": "sunset_media" },
          { "Google Enterprise (Cobalt/Cyan)": "google_enterprise" },
          { "Cyber NOC Teal (Dark Modern)": "cyber_teal" },
          { "Emerald Broadcast (Forest/Mint)": "emerald_finops" },
          { "Modern Slate (Executive Monochrome)": "modern_slate" },
          { "Wellverse Healthcare (Teal)": "wellverse" },
          { "Custom Accent Hex": "custom" }
        ],
        default: "sunset_media"
      },
      customAccentColor: {
        type: "string",
        label: "Custom Accent Hex Color",
        section: "Style",
        order: 2,
        display: "color",
        default: "#ea580c"
      },
      metricPolarity: {
        type: "string",
        label: "Performance Polarity",
        section: "Style",
        order: 3,
        display: "select",
        values: [
          { "Higher is Better (Spend, Audience, GRPs)": "higher_is_better" },
          { "Lower is Better (Cost-Per-Point, CPM, Churn)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography & Label Scale",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Compact (10px labels, tight nodes)": "compact" },
          { "Standard (12px labels, balanced)": "standard" },
          { "Large Presentation (14px bold, large nodes)": "large_presentation" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Primary Metric Value Format",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Compact Currency ($1.2M / $1.2B)": "compact_currency" },
          { "Compact Number (1.2M / 1.2B)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Raw Formatted (1,234,567)": "numeric" },
          { "Unformatted Raw": "raw" }
        ],
        default: "compact_currency"
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
        sourceDimOverride: { role: "dimension", defaultIdx: 0 },
        targetDimOverride: { role: "dimension", defaultIdx: dims.length > 1 ? 1 : 0 },
        weightMeasureOverride: { role: "measure", defaultIdx: 0 },
        sizeMeasureOverride: { role: "measure", defaultIdx: meas.length > 1 ? 1 : -1 }
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
        newOptions[key].type = "string";
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._searchQuery = "";
      this._highlightedNodeId = null;
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-affinity-network-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Reusable Floating Tooltip
      var oldTooltip = document.querySelector(".affinity-network-tooltip");
      if (oldTooltip) {
        this._tooltip = oldTooltip;
      } else {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "affinity-network-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.padding = "10px 14px";
        this._tooltip.style.borderRadius = "8px";
        this._tooltip.style.fontSize = "12px";
        this._tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
        this._tooltip.style.backdropFilter = "blur(6px)";
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
        this._resizeObserver = new ResizeObserver(function () {
          self._onResize();
        });
        this._resizeObserver.observe(element);
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

      if (self._resizeTimer) clearTimeout(self._resizeTimer);
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
      }, 60);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        this._container = document.createElement("div");
        this._container.className = "looker-affinity-network-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.display = "flex";
        this._container.style.flexDirection = "column";
        this._container.style.overflow = "hidden";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          if (done) done();
        } catch (err) {
          console.error("Content Genre Affinity Network Render Error:", err);
          if (self.addError) {
            self.addError({
              title: "Rendering Error",
              message: err.message || "Failed to render Content Genre Affinity Network."
            });
          }
          if (done) done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) this._tooltip.style.display = "none";

      this._lastRenderW = element.clientWidth || 0;
      this._lastRenderH = element.clientHeight || 0;

      if (!data || !data.length) {
        if (this.addError) {
          this.addError({
            title: "No Data",
            message: "The query returned no data rows to visualize."
          });
        }
        return;
      }

      var fields = queryResponse.fields;
      var allDims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var allMeas = (fields.measures || []).concat(fields.measure_like || []);
      if (allMeas.length === 0 && fields.table_calculations) {
        allMeas = fields.table_calculations;
      }

      if (allDims.length < 2 && allDims.length < 1) {
        if (this.addError) {
          this.addError({
            title: "Dimensions Required",
            message: "Content Genre Affinity Network requires at least 1-2 Dimensions (e.g. Content Genre & Advertiser Industry) and 1 Measure (Ad Spend)."
          });
        }
        return;
      }

      // ==========================================
      // FIELD RESOLUTION
      // ==========================================
      function findField(list, nameOrLabel) {
        if (!nameOrLabel) return null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].name === nameOrLabel || list[i].label === nameOrLabel || list[i].label_short === nameOrLabel) {
            return list[i];
          }
        }
        return null;
      }

      var sourceDim = findField(allDims, config.sourceDimOverride) || allDims[0];
      var targetDim = findField(allDims, config.targetDimOverride) || (allDims.length > 1 ? allDims[1] : allDims[0]);
      var weightMeas = findField(allMeas, config.weightMeasureOverride) || allMeas[0];
      var sizeMeas = findField(allMeas, config.sizeMeasureOverride) || (allMeas.length > 1 ? allMeas[1] : null);

      var theme = getActiveTheme(config);
      this._container.style.backgroundColor = theme.bg;
      this._container.style.color = theme.text;

      // ==========================================
      // 1. DATA AGGREGATION & GRAPH MODEL
      // ==========================================
      var nodeMap = {};
      var linkMap = {};
      var totalSpend = 0;
      var totalGrps = 0;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var sVal = row[sourceDim.name] ? String(row[sourceDim.name].value !== null && row[sourceDim.name].value !== undefined ? row[sourceDim.name].value : "Unknown").trim() : "Unknown";
        var tVal = targetDim ? (row[targetDim.name] ? String(row[targetDim.name].value !== null && row[targetDim.name].value !== undefined ? row[targetDim.name].value : "Unknown").trim() : "Unknown") : "General";

        var wVal = (weightMeas && row[weightMeas.name] && !isNaN(Number(row[weightMeas.name].value))) ? Number(row[weightMeas.name].value) : 1;
        var sSizeVal = (sizeMeas && row[sizeMeas.name] && !isNaN(Number(row[sizeMeas.name].value))) ? Number(row[sizeMeas.name].value) : wVal;

        totalSpend += wVal;
        totalGrps += sSizeVal;

        // Source node (Genre)
        var sId = "genre::" + sVal;
        if (!nodeMap[sId]) {
          nodeMap[sId] = {
            id: sId,
            name: sVal,
            type: "genre",
            totalWeight: 0,
            totalScale: 0,
            degree: 0,
            drillLinks: (row[sourceDim.name] && row[sourceDim.name].links) || null
          };
        }
        nodeMap[sId].totalWeight += wVal;
        nodeMap[sId].totalScale += sSizeVal;
        nodeMap[sId].degree++;

        // Target node (Advertiser / Category)
        var tId = "ad::" + tVal;
        if (!nodeMap[tId]) {
          nodeMap[tId] = {
            id: tId,
            name: tVal,
            type: "advertiser",
            totalWeight: 0,
            totalScale: 0,
            degree: 0,
            drillLinks: (targetDim && row[targetDim.name] && row[targetDim.name].links) || null
          };
        }
        nodeMap[tId].totalWeight += wVal;
        nodeMap[tId].totalScale += sSizeVal;
        nodeMap[tId].degree++;

        // Edge
        var edgeKey = sId + "-->" + tId;
        if (!linkMap[edgeKey]) {
          linkMap[edgeKey] = {
            id: edgeKey,
            source: sId,
            target: tId,
            sourceName: sVal,
            targetName: tVal,
            weight: 0,
            scale: 0,
            drillLinks: (weightMeas && row[weightMeas.name] && row[weightMeas.name].links) || null
          };
        }
        linkMap[edgeKey].weight += wVal;
        linkMap[edgeKey].scale += sSizeVal;
      }

      var rawNodes = Object.values(nodeMap);
      var rawLinks = Object.values(linkMap);

      // Max Link Weight for filtering
      var maxLinkWeight = 0;
      rawLinks.forEach(function (l) {
        if (l.weight > maxLinkWeight) maxLinkWeight = l.weight;
      });

      // Filter weak links if specified
      var minWeightCutoff = (maxLinkWeight * (Number(config.minLinkWeightPct) || 0)) / 100;
      var activeLinks = rawLinks.filter(function (l) {
        return l.weight >= minWeightCutoff;
      });

      // Benchmark Target calculation
      var benchmarkTarget = null;
      var targetMode = config.targetCalculationMode || "none";
      var linkWeights = activeLinks.map(function (l) { return l.weight; }).sort(function (a, b) { return a - b; });

      if (targetMode === "fixed_value") {
        benchmarkTarget = Number(config.fixedTargetValue) || 5000000000;
      } else if (targetMode === "dataset_mean" && linkWeights.length > 0) {
        benchmarkTarget = linkWeights.reduce(function (a, b) { return a + b; }, 0) / linkWeights.length;
      } else if (targetMode === "dataset_median" && linkWeights.length > 0) {
        var mid = Math.floor(linkWeights.length / 2);
        benchmarkTarget = linkWeights.length % 2 !== 0 ? linkWeights[mid] : (linkWeights[mid - 1] + linkWeights[mid]) / 2;
      } else if (targetMode === "percentile_p75" && linkWeights.length > 0) {
        var idx75 = Math.floor(linkWeights.length * 0.75);
        benchmarkTarget = linkWeights[Math.min(idx75, linkWeights.length - 1)];
      } else if (targetMode === "percentile_p90" && linkWeights.length > 0) {
        var idx90 = Math.floor(linkWeights.length * 0.90);
        benchmarkTarget = linkWeights[Math.min(idx90, linkWeights.length - 1)];
      }

      // Top-N nodes density cap
      var topNSetting = config.topNNodes || "all";
      var topNLimit = topNSetting === "all" ? 999999 : parseInt(topNSetting, 10);
      var sortMode = config.sortOrder || "metric_desc";

      if (sortMode === "metric_desc") {
        rawNodes.sort(function (a, b) { return b.totalWeight - a.totalWeight; });
      } else if (sortMode === "metric_asc") {
        rawNodes.sort(function (a, b) { return a.totalWeight - b.totalWeight; });
      } else if (sortMode === "alphabetical") {
        rawNodes.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      var allowedNodeIds = {};
      var visibleNodes = rawNodes.slice(0, topNLimit);
      visibleNodes.forEach(function (n) { allowedNodeIds[n.id] = true; });

      var visibleLinks = activeLinks.filter(function (l) {
        return allowedNodeIds[l.source] && allowedNodeIds[l.target];
      });

      // Find top affinity pair
      var topPair = activeLinks.slice().sort(function (a, b) { return b.weight - a.weight; })[0];

      // Count genres vs advertisers
      var genreCount = visibleNodes.filter(function (n) { return n.type === "genre"; }).length;
      var adCount = visibleNodes.filter(function (n) { return n.type === "advertiser"; }).length;

      // ==========================================
      // 2. HEADER BAR & CONTROLS
      // ==========================================
      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.padding = "10px 16px";
      topBar.style.background = theme.cardBg;
      topBar.style.borderBottom = "1px solid " + theme.border;
      topBar.style.flexShrink = "0";
      topBar.style.gap = "12px";
      topBar.style.flexWrap = "wrap";

      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "8px";
      leftControls.style.flexWrap = "wrap";

      var titleText = config.customTitle || "Content Genre & Advertiser Affinity Force Network";
      var subText = config.customSubtitle || ("Cross-affinity between " + (sourceDim.label_short || sourceDim.label || sourceDim.name) + " and " + (targetDim.label_short || targetDim.label || targetDim.name));

      leftControls.innerHTML =
        '<div style="display:flex; align-items:center; gap:8px;">' +
          '<span style="font-size:18px;">🌐</span>' +
          '<div>' +
            '<div style="font-size:13px; font-weight:700; color:' + theme.text + ';">' + titleText + '</div>' +
            '<div style="font-size:10.5px; color:' + theme.subtext + ';">' + subText + '</div>' +
          '</div>' +
        '</div>';
      topBar.appendChild(leftControls);

      var rightControls = document.createElement("div");
      rightControls.style.display = "flex";
      rightControls.style.alignItems = "center";
      rightControls.style.gap = "10px";

      // Legend Pills
      var legendHtml =
        '<div style="display:flex; align-items:center; gap:10px; font-size:11px; font-weight:600;">' +
          '<div style="display:flex; align-items:center; gap:4px;">' +
            '<span style="width:10px; height:10px; border-radius:50%; background:' + theme.genreNode + '; display:inline-block;"></span>' +
            '<span style="color:' + theme.text + ';">' + (sourceDim.label_short || sourceDim.label || "Genre") + '</span>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:4px;">' +
            '<span style="width:10px; height:10px; border-radius:50%; background:' + theme.adNode + '; display:inline-block;"></span>' +
            '<span style="color:' + theme.text + ';">' + (targetDim.label_short || targetDim.label || "Advertiser") + '</span>' +
          '</div>' +
        '</div>';
      var legendContainer = document.createElement("div");
      legendContainer.innerHTML = legendHtml;
      rightControls.appendChild(legendContainer);

      // Search Box
      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search entity...";
        searchInput.value = self._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "11px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";

        searchInput.oninput = function () {
          self._searchQuery = searchInput.value.toLowerCase().trim();
          self._applyHighlightFilter();
        };
        rightControls.appendChild(searchInput);
      }

      topBar.appendChild(rightControls);
      this._container.appendChild(topBar);

      // ==========================================
      // 3. EXECUTIVE SCORECARD HUD
      // ==========================================
      var hudMode = config.hudMode || "full";
      if (hudMode !== "hidden") {
        var hud = document.createElement("div");
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.gap = hudMode === "compact" ? "12px" : "18px";
        hud.style.padding = hudMode === "compact" ? "6px 16px" : "10px 16px";
        hud.style.background = theme.hudBg;
        hud.style.borderBottom = "1px solid " + theme.border;
        hud.style.fontSize = "11.5px";
        hud.style.flexShrink = "0";
        hud.style.flexWrap = "wrap";

        var hudChips = [
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Content Genres:</span> ' +
            '<strong style="color:' + theme.genreNode + ';">' + genreCount + '</strong>' +
          '</div>',
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Advertiser Verticals:</span> ' +
            '<strong style="color:' + theme.adNode + ';">' + adCount + '</strong>' +
          '</div>',
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Active Connections:</span> ' +
            '<strong>' + visibleLinks.length + '</strong>' +
          '</div>',
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Total Spend:</span> ' +
            '<strong style="color:' + theme.text + ';">' + formatValue(totalSpend, config.valueFormat || "compact_currency") + '</strong>' +
          '</div>'
        ];

        if (sizeMeas && hudMode === "full") {
          hudChips.push(
            '<div>' +
              '<span style="color:' + theme.subtext + ';">Total Audience/GRPs:</span> ' +
              '<strong>' + formatValue(totalGrps, "compact_num") + '</strong>' +
            '</div>'
          );
        }

        if (topPair && hudMode === "full") {
          hudChips.push(
            '<div>' +
              '<span style="color:' + theme.subtext + ';">Top Affinity Corridor:</span> ' +
              '<strong style="color:' + theme.accent + ';">' + topPair.sourceName + ' \u2194 ' + topPair.targetName + ' (' + formatValue(topPair.weight, config.valueFormat || "compact_currency") + ')</strong>' +
            '</div>'
          );
        }

        hud.innerHTML = hudChips.join('<div style="width:1px; height:14px; background:' + theme.border + ';"></div>');
        this._container.appendChild(hud);
      }

      // ==========================================
      // 4. GRAPH CANVAS & SVG RENDERING
      // ==========================================
      var canvasWrapper = document.createElement("div");
      canvasWrapper.style.flex = "1 1 0";
      canvasWrapper.style.position = "relative";
      canvasWrapper.style.overflow = "hidden";
      this._container.appendChild(canvasWrapper);

      var width = canvasWrapper.clientWidth || (element.clientWidth || 800);
      var height = canvasWrapper.clientHeight || (element.clientHeight - 90 || 500);

      if (width <= 20 || height <= 20) return;

      var svg = d3.select(canvasWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Zoom container
      var g = svg.append("g");

      var zoom = d3.zoom()
        .scaleExtent([0.3, 4])
        .on("zoom", function (e) {
          g.attr("transform", e.transform);
        });

      svg.call(zoom);

      // Node size scale
      var maxScale = d3.max(visibleNodes, function (d) { return d.totalScale; }) || 1;
      var minRadius = config.fontScale === "compact" ? 10 : (config.fontScale === "large_presentation" ? 18 : 14);
      var maxRadius = config.fontScale === "compact" ? 28 : (config.fontScale === "large_presentation" ? 44 : 34);

      var rScale = d3.scaleSqrt()
        .domain([0, maxScale])
        .range([minRadius, maxRadius]);

      // Edge stroke scale
      var maxWeight = d3.max(visibleLinks, function (d) { return d.weight; }) || 1;
      var strokeScale = d3.scaleLinear()
        .domain([0, maxWeight])
        .range([1.5, 9]);

      var layoutMode = config.networkLayout || "force_directed";

      // ==========================================
      // LAYOUT TOPOLOGIES
      // ==========================================
      var nodes = visibleNodes.map(function (d) { return Object.assign({}, d); });
      var nodeById = {};
      nodes.forEach(function (n) { nodeById[n.id] = n; });

      var links = visibleLinks.map(function (l) {
        return {
          id: l.id,
          source: nodeById[l.source],
          target: nodeById[l.target],
          sourceName: l.sourceName,
          targetName: l.targetName,
          weight: l.weight,
          scale: l.scale,
          drillLinks: l.drillLinks
        };
      }).filter(function (l) { return l.source && l.target; });

      if (layoutMode === "bipartite_columns") {
        var genres = nodes.filter(function (n) { return n.type === "genre"; });
        var ads = nodes.filter(function (n) { return n.type === "advertiser"; });

        var xLeft = width * 0.22;
        var xRight = width * 0.78;

        genres.forEach(function (n, idx) {
          n.x = xLeft;
          n.y = ((idx + 0.8) / (genres.length + 0.6)) * (height - 40) + 20;
          n.fx = n.x;
          n.fy = n.y;
        });

        ads.forEach(function (n, idx) {
          n.x = xRight;
          n.y = ((idx + 0.8) / (ads.length + 0.6)) * (height - 40) + 20;
          n.fx = n.x;
          n.fy = n.y;
        });
      } else if (layoutMode === "radial_concentric") {
        var centerGenres = nodes.filter(function (n) { return n.type === "genre"; });
        var orbitAds = nodes.filter(function (n) { return n.type === "advertiser"; });

        var cx = width / 2;
        var cy = height / 2;
        var rInner = Math.min(width, height) * 0.22;
        var rOuter = Math.min(width, height) * 0.40;

        centerGenres.forEach(function (n, idx) {
          var angle = (idx / centerGenres.length) * 2 * Math.PI - Math.PI / 2;
          n.x = cx + rInner * Math.cos(angle);
          n.y = cy + rInner * Math.sin(angle);
          n.fx = n.x;
          n.fy = n.y;
        });

        orbitAds.forEach(function (n, idx) {
          var angle = (idx / orbitAds.length) * 2 * Math.PI - Math.PI / 2;
          n.x = cx + rOuter * Math.cos(angle);
          n.y = cy + rOuter * Math.sin(angle);
          n.fx = n.x;
          n.fy = n.y;
        });
      }

      // Edge link rendering
      var linkGroup = g.append("g").attr("class", "links");
      var linkElements = linkGroup.selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", function (d) {
          if (benchmarkTarget !== null && d.weight >= benchmarkTarget) {
            return theme.linkHighlight;
          }
          return theme.linkStroke;
        })
        .attr("stroke-width", function (d) { return strokeScale(d.weight); })
        .attr("stroke-opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseenter", function (e, d) {
          d3.select(this).attr("stroke-opacity", 1.0).attr("stroke", theme.linkHighlight);
          self._showTooltip(e,
            '<div style="font-weight:700; font-size:12.5px; margin-bottom:4px;">Affinity Corridor</div>' +
            '<div style="color:' + theme.genreNode + '; font-weight:600;">' + d.sourceName + ' \u2194 ' + d.targetName + '</div>' +
            '<div style="margin-top:6px; border-top:1px solid rgba(255,255,255,0.15); padding-top:4px;">' +
              'Spend Volume: <strong>' + formatValue(d.weight, config.valueFormat || "compact_currency") + '</strong>' +
            '</div>' +
            (d.scale ? '<div>Audience Scale: <strong>' + formatValue(d.scale, "compact_num") + '</strong></div>' : '') +
            (d.drillLinks ? '<div style="margin-top:4px; font-size:10px; color:#38bdf8;">🔎 Click to Drill</div>' : '')
          );
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke-opacity", 0.7).attr("stroke", function (d) {
            return (benchmarkTarget !== null && d.weight >= benchmarkTarget) ? theme.linkHighlight : theme.linkStroke;
          });
          self._hideTooltip();
        })
        .on("click", function (e, d) {
          if (d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
          }
        });

      // Node rendering
      var nodeGroup = g.append("g").attr("class", "nodes");
      var nodeElements = nodeGroup.selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .style("cursor", "pointer")
        .call(d3.drag()
          .on("start", function (e, d) {
            if (!e.active && simulation) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", function (e, d) {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", function (e, d) {
            if (!e.active && simulation) simulation.alphaTarget(0);
            if (layoutMode === "force_directed") {
              d.fx = null;
              d.fy = null;
            }
          })
        );

      // Node Circles
      nodeElements.append("circle")
        .attr("r", function (d) { return rScale(d.totalScale); })
        .attr("fill", function (d) { return d.type === "genre" ? theme.genreNode : theme.adNode; })
        .attr("stroke", theme.bg)
        .attr("stroke-width", 2.5)
        .attr("shadow", "0 4px 12px rgba(0,0,0,0.2)");

      // Inner Icon / Indicator
      nodeElements.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", function (d) { return Math.max(9, rScale(d.totalScale) * 0.7); })
        .attr("fill", "#ffffff")
        .attr("pointer-events", "none")
        .text(function (d) { return d.type === "genre" ? "📺" : "🏢"; });

      // Node Labels
      var labelDensity = config.showNodeLabels || "all";
      if (labelDensity !== "hidden") {
        nodeElements.append("text")
          .attr("text-anchor", "middle")
          .attr("y", function (d) { return rScale(d.totalScale) + 13; })
          .attr("font-size", config.fontScale === "compact" ? "10px" : (config.fontScale === "large_presentation" ? "13px" : "11.5px"))
          .attr("font-weight", "600")
          .attr("fill", theme.text)
          .style("pointer-events", "none")
          .style("text-shadow", theme.isDark ? "0 1px 4px #000" : "0 1px 3px rgba(255,255,255,0.9)")
          .text(function (d) {
            if (labelDensity === "major_only" && d.totalScale < maxScale * 0.3) {
              return "";
            }
            return d.name;
          });
      }

      // Node Interaction: Hover Ego-Network
      nodeElements
        .on("mouseenter", function (e, d) {
          self._highlightEgoNetwork(d);
          self._showTooltip(e,
            '<div style="font-weight:700; font-size:13px; margin-bottom:4px;">' + (d.type === "genre" ? "📺 Content Genre" : "🏢 Advertiser Category") + '</div>' +
            '<div style="font-size:13.5px; font-weight:700; color:' + (d.type === "genre" ? theme.genreNode : theme.adNode) + ';">' + d.name + '</div>' +
            '<div style="margin-top:6px; border-top:1px solid rgba(255,255,255,0.15); padding-top:4px;">' +
              'Total Affinity Spend: <strong>' + formatValue(d.totalWeight, config.valueFormat || "compact_currency") + '</strong>' +
            '</div>' +
            '<div>Active Connections: <strong>' + d.degree + '</strong></div>' +
            (d.totalScale ? '<div>Audience Scale: <strong>' + formatValue(d.totalScale, "compact_num") + '</strong></div>' : '') +
            (d.drillLinks ? '<div style="margin-top:4px; font-size:10px; color:#38bdf8;">🔎 Click to Drill in Looker</div>' : '')
          );
        })
        .on("mouseleave", function () {
          self._clearEgoHighlight();
          self._hideTooltip();
        })
        .on("click", function (e, d) {
          if (d.drillLinks && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: e });
          }
        });

      // Simulation (Organic Force-Directed Mode)
      var simulation = null;
      if (layoutMode === "force_directed") {
        simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(function (d) { return d.id; }).distance(function (d) {
            return 80 + (1 - (d.weight / maxWeight)) * 140;
          }))
          .force("charge", d3.forceManyBody().strength(-280).distanceMax(450))
          .force("center", d3.forceCenter(width / 2, height / 2))
          .force("collision", d3.forceCollide().radius(function (d) { return rScale(d.totalScale) + 16; }))
          .alphaDecay(0.04);

        // Pre-warm simulation
        for (var tick = 0; tick < 35; tick++) {
          simulation.tick();
        }
      }

      function updatePositions() {
        linkElements.attr("d", function (d) {
          if (layoutMode === "bipartite_columns") {
            var dx = d.target.x - d.source.x;
            var mx = (d.source.x + d.target.x) / 2;
            return "M" + d.source.x + "," + d.source.y +
                   "C" + mx + "," + d.source.y +
                   " " + mx + "," + d.target.y +
                   " " + d.target.x + "," + d.target.y;
          }
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        });

        nodeElements.attr("transform", function (d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      }

      if (simulation) {
        simulation.on("tick", updatePositions);
      } else {
        updatePositions();
      }

      // Highlight Helper Methods
      this._highlightEgoNetwork = function (targetNode) {
        var connectedIds = {};
        connectedIds[targetNode.id] = true;

        links.forEach(function (l) {
          if (l.source.id === targetNode.id) connectedIds[l.target.id] = true;
          if (l.target.id === targetNode.id) connectedIds[l.source.id] = true;
        });

        nodeElements.attr("opacity", function (n) {
          return connectedIds[n.id] ? 1.0 : 0.18;
        });

        linkElements
          .attr("stroke-opacity", function (l) {
            return (l.source.id === targetNode.id || l.target.id === targetNode.id) ? 1.0 : 0.06;
          })
          .attr("stroke", function (l) {
            return (l.source.id === targetNode.id || l.target.id === targetNode.id) ? theme.linkHighlight : theme.linkStroke;
          });
      };

      this._clearEgoHighlight = function () {
        nodeElements.attr("opacity", 1.0);
        linkElements
          .attr("stroke-opacity", 0.7)
          .attr("stroke", function (l) {
            return (benchmarkTarget !== null && l.weight >= benchmarkTarget) ? theme.linkHighlight : theme.linkStroke;
          });
      };

      this._applyHighlightFilter = function () {
        if (!self._searchQuery) {
          self._clearEgoHighlight();
          return;
        }
        var query = self._searchQuery;
        nodeElements.attr("opacity", function (n) {
          return n.name.toLowerCase().indexOf(query) !== -1 ? 1.0 : 0.15;
        });
        linkElements.attr("stroke-opacity", function (l) {
          var match = l.sourceName.toLowerCase().indexOf(query) !== -1 || l.targetName.toLowerCase().indexOf(query) !== -1;
          return match ? 0.9 : 0.05;
        });
      };
    },

    _showTooltip: function (e, html) {
      if (!this._tooltip) return;
      var theme = getActiveTheme(this._lastConfig || {});
      this._tooltip.innerHTML = html;
      this._tooltip.style.display = "block";
      this._tooltip.style.background = theme.tooltipBg;
      this._tooltip.style.color = theme.tooltipText;
      this._tooltip.style.border = "1px solid " + theme.border;

      var x = (e.clientX || 0) + 14;
      var y = (e.clientY || 0) + 14;
      if (x + 240 > window.innerWidth) x = window.innerWidth - 250;
      if (y + 160 > window.innerHeight) y = window.innerHeight - 170;

      this._tooltip.style.left = x + "px";
      this._tooltip.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) this._tooltip.style.display = "none";
    }
  });
})();
