/**
 * Cell Tower Sector Azimuth & RF Signal Coverage Polar Map
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Telecom, Cloud & SecOps Geospatial Radar Suite:
 * - Multi-Modal Polar Layouts: Omni 360° Radar Sectors, Polar Constellation & Scatter Pins, Azimuth Sector Heat Grid
 * - Polar Coordinates: Azimuth compass bearings (0° to 360°), radial distance/throughput (r), antenna beamwidth radiation lobes
 * - High-Density 5,000+ Row Aggregation across 5G RAN cell sites and antenna hardware
 * - Dynamic Field-Role Mapping (Display tab): 1-based index or name overrides for site dimension and measures
 * - Reference Targets, Concentric SLA Rings & Anomaly Alerts (Display tab): Mean, P75/P90, Fixed Goal, or Secondary Measure
 * - Sorting, Top-N Bucketing & Null Suppression (Display tab): Metric Desc/Asc, Azimuth Bearing, Alphabetical
 * - Executive Scorecard HUD & Search Filter (Display tab): Active Sites, Peak Throughput, Mean Latency, Packet Loss, 5G SLA Compliance
 * - Signature Telecom Palettes (Style tab): Nokia 5G Cyan/Navy, Google Enterprise, Cyberpunk Radar, Emerald FinOps, etc.
 * - Debounced ResizeObserver (<4px guard), proper container bounds, Looker drill-down menu support
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

  var THEMES = {
    nokia_cyan: {
      name: "Nokia 5G Cyan / Deep Navy",
      primary: "#00c9ff",
      secondary: "#0064d2",
      accent: "#001135",
      bg: "#050d1a",
      text: "#f0f9ff",
      subtext: "#7dd3fc",
      border: "#0e2340",
      grid: "#163459",
      spoke: "#1e477a",
      cardBg: "#0b1b30",
      cardBorder: "#1e3a5f",
      positive: "#10b981",
      negative: "#f43f5e",
      radarSweep: "rgba(0, 201, 255, 0.25)",
      range: ["#082f49", "#0284c7", "#00c9ff", "#7dd3fc", "#e0f2fe"]
    },
    google_blue: {
      name: "Google Enterprise",
      primary: "#1a73e8",
      secondary: "#174ea6",
      accent: "#4285f4",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      spoke: "#dadce0",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      positive: "#34a853",
      negative: "#ea4335",
      radarSweep: "rgba(26, 115, 232, 0.18)",
      range: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Radar (Midnight)",
      primary: "#38bdf8",
      secondary: "#a855f7",
      accent: "#ec4899",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#334155",
      spoke: "#475569",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      positive: "#10b981",
      negative: "#f43f5e",
      radarSweep: "rgba(56, 189, 248, 0.25)",
      range: ["#1e293b", "#0369a1", "#0284c7", "#38bdf8", "#7dd3fc"]
    },
    modern_slate: {
      name: "Modern Slate",
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#0f172a",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      spoke: "#cbd5e1",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#10b981",
      negative: "#ef4444",
      radarSweep: "rgba(37, 99, 235, 0.18)",
      range: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#475569", "#0f172a"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#059669",
      secondary: "#047857",
      accent: "#064e3b",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#d1fae5",
      spoke: "#a7f3d0",
      cardBg: "#f0fdf4",
      cardBorder: "#a7f3d0",
      positive: "#059669",
      negative: "#dc2626",
      radarSweep: "rgba(5, 150, 105, 0.18)",
      range: ["#e6f4ea", "#a8dab5", "#5bb974", "#1e8e3e", "#0d652d"]
    },
    sunset_media: {
      name: "Sunset Amber",
      primary: "#ea580c",
      secondary: "#c2410c",
      accent: "#431407",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#ffedd5",
      spoke: "#fed7aa",
      cardBg: "#fffbeb",
      cardBorder: "#fde68a",
      positive: "#059669",
      negative: "#dc2626",
      radarSweep: "rgba(234, 88, 12, 0.18)",
      range: ["#ffedd5", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      primary: "#0284c7",
      secondary: "#0369a1",
      accent: "#0c4a6e",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f0f9ff",
      spoke: "#bae6fd",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#006B40",
      negative: "#B42318",
      radarSweep: "rgba(2, 132, 199, 0.18)",
      range: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"]
    },
    thermal_heat: {
      name: "Thermal RF Heat",
      primary: "#ea580c",
      secondary: "#dc2626",
      accent: "#7f1d1d",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#ffedd5",
      spoke: "#fed7aa",
      cardBg: "#fff7ed",
      cardBorder: "#fed7aa",
      positive: "#10b981",
      negative: "#b91c1c",
      radarSweep: "rgba(234, 88, 12, 0.18)",
      range: ["#fff7bc", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"]
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
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "percentage":
      case "percent":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
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

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "120px";
    card.style.padding = "8px 12px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = theme.cardBg;
    card.style.border = "1px solid " + theme.cardBorder;
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
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
    id: "cell_tower_polar_coverage",
    label: "Cell Tower Sector Azimuth & RF Polar Map",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      polarMode: {
        type: "string",
        label: "Polar Visual Paradigm Mode",
        display: "select",
        values: [
          { "Omni 360° Radar Sectors (Radiation Lobes)": "omni_radar" },
          { "Polar Constellation & Scatter Pins": "polar_scatter" },
          { "Azimuth Sector Heat Grid": "azimuth_heatmap" }
        ],
        default: "omni_radar",
        section: "Display",
        order: 1
      },
      siteFieldOverride: {
        type: "string",
        label: "Site Dimension Index or Name (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 2
      },
      sectorAngleOverride: {
        type: "string",
        label: "Azimuth Angle / Bearing Dimension (or Auto Compass)",
        default: "",
        section: "Display",
        order: 3
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary RF Measure (Throughput / Distance) (1 = Col 1)",
        default: "1",
        section: "Display",
        order: 4
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary Measure (Latency / Load / Color) (2 = Col 2)",
        default: "2",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "5G SLA Target Benchmark Mode",
        display: "select",
        values: [
          { "None (No Target Ring)": "none" },
          { "Secondary Measure Column": "second_measure" },
          { "Fixed Static SLA Target": "fixed" },
          { "Dataset Mean (Average of Sites)": "dataset_mean" },
          { "Dataset Median (P50 Median)": "dataset_median" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" }
        ],
        default: "fixed",
        section: "Display",
        order: 6
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed SLA Target Value (e.g. 500 Mbps)",
        default: 500,
        section: "Display",
        order: 7
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark / SLA Target Label",
        default: "5G SLA Target (500 Mbps)",
        section: "Display",
        order: 8
      },
      showReferenceLine: {
        type: "boolean",
        label: "Show Concentric Benchmark SLA Target Ring",
        default: true,
        section: "Display",
        order: 9
      },
      anomalyThresholdPct: {
        type: "number",
        label: "RF Deviation Anomaly Alert Threshold (%)",
        default: 35,
        section: "Display",
        order: 10
      },
      sortBy: {
        type: "string",
        label: "Sort Sector Sites By",
        display: "select",
        values: [
          { "Default (Looker Query Order)": "none" },
          { "Throughput / Metric Descending": "metric_desc" },
          { "Throughput / Metric Ascending": "metric_asc" },
          { "Azimuth Bearing (0° to 360° Compass)": "azimuth_asc" },
          { "Site Name Alphabetical": "site_asc" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 11
      },
      topNLimit: {
        type: "number",
        label: "Top-N Sites Limit (0 = All, Max 60)",
        default: 0,
        section: "Display",
        order: 12
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into Other Rollup Sector",
        default: false,
        section: "Display",
        order: 13
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Telemetry Sites",
        default: false,
        section: "Display",
        order: 14
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
        order: 15
      },
      labelDensity: {
        type: "string",
        label: "Compass & Sector Label Density",
        display: "select",
        values: [
          { "All Compass Points & Top Sites": "all" },
          { "Cardinal Spoke Labels Only (N, E, S, W)": "cardinal" },
          { "Clean Minimalist (No Spoke Text)": "none" }
        ],
        default: "all",
        section: "Display",
        order: 16
      },
      customTitle: {
        type: "string",
        label: "Custom Map Title Override",
        default: "",
        section: "Display",
        order: 17
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Cell Site Search Bar",
        default: true,
        section: "Display",
        order: 19
      },
      showLegend: {
        type: "boolean",
        label: "Show Concentric Range Ring Legend",
        default: true,
        section: "Display",
        order: 20
      },
      beamSweepAnimation: {
        type: "boolean",
        label: "Enable Animated 360° Radar Sweep Line",
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
          { "Nokia 5G Cyan / Deep Navy": "nokia_cyan" },
          { "Google Enterprise": "google_blue" },
          { "Cyberpunk Radar (Midnight)": "cyberpunk_dark" },
          { "Modern Slate": "modern_slate" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Amber": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Thermal RF Heat": "thermal_heat" },
          { "Custom Hex Override": "custom" }
        ],
        default: "nokia_cyan",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Beam / Scale Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Compliant Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Alert / Non-Compliant Hex",
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
          { "Higher is Better (Throughput, Coverage, Users)": "higher_better" },
          { "Lower is Better (Latency ms, Packet Loss %, Alarms)": "lower_better" }
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
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Percentage (12.4%)": "percent" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw (Unformatted)": "raw" }
        ],
        default: "compact_number",
        section: "Style",
        order: 7
      },
      radarRingCount: {
        type: "number",
        label: "Concentric Polar Range Rings Count (3-6)",
        default: 4,
        section: "Style",
        order: 8
      },
      highlightColor: {
        type: "string",
        label: "Hover Highlight Stroke Color",
        display: "color",
        default: "#00c9ff",
        section: "Style",
        order: 9
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";

      var container = document.createElement("div");
      container.className = "looker-cell-polar-container";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "looker-polar-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "99999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.lineHeight = "1.4";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.4)";
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
          message: "The query returned no rows to visualize on the polar coverage map."
        });
        done();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      if (dims.length === 0) {
        this.addError({
          title: "Dimension Required",
          message: "Cell Tower Polar Map requires at least 1 Site Dimension (e.g. cell_towers.site_name)."
        });
        done();
        return;
      }

      if (meas.length === 0) {
        this.addError({
          title: "Measure Required",
          message: "Cell Tower Polar Map requires at least 1 RF Metric Measure (e.g. throughput_mbps, latency_ms)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
        } catch (err) {
          console.error("Cell Tower Polar Map render error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "An unexpected error occurred while rendering the polar map."
          });
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector(".looker-cell-polar-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "nokia_cyan";
      var theme = THEMES[themeKey] || THEMES.nokia_cyan;
      var isDark = themeKey === "nokia_cyan" || themeKey === "cyberpunk_dark";

      if (themeKey === "custom" && config.customPrimaryColor) {
        theme = {
          name: "Custom Hex Override",
          primary: config.customPrimaryColor,
          secondary: config.customPrimaryColor,
          accent: "#0f172a",
          bg: "#ffffff",
          text: "#0f172a",
          subtext: "#64748b",
          border: "#e2e8f0",
          grid: "#f1f5f9",
          spoke: "#cbd5e1",
          cardBg: "#f8fafc",
          cardBorder: "#e2e8f0",
          positive: config.customPositiveColor || "#10b981",
          negative: config.customNegativeColor || "#ef4444",
          radarSweep: "rgba(0, 0, 0, 0.15)",
          range: ["#f1f5f9", "#cbd5e1", config.customPrimaryColor, config.customPrimaryColor, "#0f172a"]
        };
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontScale = config.fontScale || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : fontScale === "large" ? 14 : 12;
      container.style.fontSize = baseFontSize + "px";

      var polarMode = config.polarMode || "omni_radar";
      var polarity = config.metricPolarity || "higher_better";
      var fmt = config.valueFormat || "compact_number";

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      var siteField = resolveField(dims, config.siteFieldOverride, 0);
      var angleField = config.sectorAngleOverride ? resolveField(dims, config.sectorAngleOverride, 1) : null;
      var primaryMeas = resolveField(meas, config.primaryMeasureOverride, 0);
      var secondaryMeas = meas.length > 1 ? resolveField(meas, config.secondaryMeasureOverride, 1) : null;

      var metricLabel = primaryMeas ? (primaryMeas.label_short || primaryMeas.label || primaryMeas.name) : "Throughput (Mbps)";
      var secMetricLabel = secondaryMeas ? (secondaryMeas.label_short || secondaryMeas.label || secondaryMeas.name) : "Latency (ms)";
      var totalRawRows = data.length;

      // 1. Client-Side Aggregation by Site
      var siteMap = {};
      data.forEach(function (row) {
        var rawSite = row[siteField.name] ? (row[siteField.name].value || row[siteField.name].rendered) : "Unknown Site";
        var siteKey = String(rawSite).trim();

        var pCell = row[primaryMeas.name];
        var pVal = pCell && pCell.value !== null && !isNaN(pCell.value) ? Number(pCell.value) : 0;
        var pRendered = pCell ? pCell.rendered : null;
        var links = (pCell && pCell.links) || (row[siteField.name] && row[siteField.name].links) || [];

        var sVal = 0;
        if (secondaryMeas && row[secondaryMeas.name] && row[secondaryMeas.name].value !== null) {
          sVal = Number(row[secondaryMeas.name].value) || 0;
        }

        var angleVal = null;
        if (angleField && row[angleField.name] && row[angleField.name].value !== null) {
          angleVal = Number(row[angleField.name].value);
        }

        // Additional dimensions for telecom context (hardware, market, status)
        var hardware = "5G RAN AirScale";
        var market = "National Network";
        dims.forEach(function (d) {
          if (d.name.indexOf("vendor") !== -1 || d.name.indexOf("model") !== -1 || d.name.indexOf("equipment") !== -1) {
            hardware = row[d.name] ? (row[d.name].rendered || row[d.name].value) : hardware;
          }
          if (d.name.indexOf("market") !== -1 || d.name.indexOf("city") !== -1 || d.name.indexOf("region") !== -1) {
            market = row[d.name] ? (row[d.name].rendered || row[d.name].value) : market;
          }
        });

        if (!siteMap[siteKey]) {
          siteMap[siteKey] = {
            site: siteKey,
            hardware: hardware,
            market: market,
            primarySum: 0,
            secondarySum: 0,
            count: 0,
            angle: angleVal,
            rendered: pRendered,
            links: links
          };
        }

        siteMap[siteKey].primarySum += pVal;
        siteMap[siteKey].secondarySum += sVal;
        siteMap[siteKey].count += 1;
      });

      var sites = [];
      Object.keys(siteMap).forEach(function (k) {
        var s = siteMap[k];
        var avgPrimary = s.count > 0 ? s.primarySum / s.count : 0;
        var avgSecondary = s.count > 0 ? s.secondarySum / s.count : 0;

        if (config.suppressZeroNull && (!avgPrimary || avgPrimary === 0)) {
          return;
        }

        s.value = avgPrimary;
        s.secondaryValue = avgSecondary;
        sites.push(s);
      });

      if (sites.length === 0) {
        container.innerHTML = "<div style=\"padding:40px;text-align:center;color:" + theme.subtext + ";\">All sites suppressed by zero/null filter.</div>";
        return;
      }

      // 2. Sorting & Angle Distribution
      var sortBy = config.sortBy || "metric_desc";
      if (sortBy === "metric_desc") {
        sites.sort(function (a, b) { return b.value - a.value; });
      } else if (sortBy === "metric_asc") {
        sites.sort(function (a, b) { return a.value - b.value; });
      } else if (sortBy === "site_asc") {
        sites.sort(function (a, b) { return a.site.localeCompare(b.site); });
      } else if (sortBy === "azimuth_asc") {
        sites.sort(function (a, b) { return (a.angle || 0) - (b.angle || 0); });
      }

      var topN = Number(config.topNLimit) || 0;
      if (topN > 0 && topN < sites.length) {
        var topSites = sites.slice(0, topN);
        var remaining = sites.slice(topN);
        if (config.enableOtherRollup && remaining.length > 0) {
          var otherPrimary = d3.mean(remaining, function (d) { return d.value; }) || 0;
          var otherSecondary = d3.mean(remaining, function (d) { return d.secondaryValue; }) || 0;
          topSites.push({
            site: "Other (" + remaining.length + " Sites)",
            hardware: "Aggregated RAN Fleet",
            market: "Multi-Market",
            value: otherPrimary,
            secondaryValue: otherSecondary,
            count: remaining.length,
            angle: 350,
            rendered: null,
            links: []
          });
        }
        sites = topSites;
      }

      // Assign Compass Bearings (0° to 360°)
      var totalSites = sites.length;
      sites.forEach(function (s, idx) {
        s.rank = idx + 1;
        if (s.angle === null || s.angle === undefined || isNaN(s.angle)) {
          // Equispaced azimuth beam angles around the compass
          s.angle = (idx * (360 / totalSites)) % 360;
        }
      });

      // 3. Compute Benchmark Target & Compliance
      var targetMode = config.targetCalculationMode || "fixed";
      var meanVal = d3.mean(sites, function (d) { return d.value; }) || 0;
      var medianVal = d3.median(sites, function (d) { return d.value; }) || 0;
      var p75Val = d3.quantile(sites.map(function (d) { return d.value; }).sort(d3.ascending), 0.75) || 0;
      var p90Val = d3.quantile(sites.map(function (d) { return d.value; }).sort(d3.ascending), 0.90) || 0;

      var targetVal = null;
      switch (targetMode) {
        case "fixed":
          targetVal = Number(config.fixedTargetValue) || 500;
          break;
        case "dataset_mean":
          targetVal = meanVal;
          break;
        case "dataset_median":
          targetVal = medianVal;
          break;
        case "percentile_p75":
          targetVal = p75Val;
          break;
        case "percentile_p90":
          targetVal = p90Val;
          break;
        case "second_measure":
          targetVal = d3.mean(sites, function (d) { return d.secondaryValue; }) || meanVal;
          break;
        case "none":
        default:
          targetVal = null;
          break;
      }

      var compliantCount = 0;
      sites.forEach(function (d) {
        if (targetVal !== null) {
          d.target = targetVal;
          d.delta = d.value - targetVal;
          d.deltaPct = targetVal !== 0 ? (d.delta / targetVal) : 0;
          d.isCompliant = polarity === "higher_better" ? (d.value >= targetVal) : (d.value <= targetVal);
          d.isAnomaly = Math.abs(d.deltaPct * 100) >= (Number(config.anomalyThresholdPct) || 35);
          if (d.isCompliant) compliantCount++;
        } else {
          d.target = null;
          d.delta = null;
          d.deltaPct = null;
          d.isCompliant = true;
          d.isAnomaly = false;
        }
      });

      var compliancePct = totalSites > 0 ? (compliantCount / totalSites) * 100 : 100;
      var peakSite = sites.reduce(function (max, s) { return s.value > (max ? max.value : -Infinity) ? s : max; }, null);
      var meanSecVal = d3.mean(sites, function (d) { return d.secondaryValue; }) || 0;

      // 4. Header Bar (Custom Title & Search)
      var showSearch = config.showSearch !== false;
      var customTitle = (config.customTitle || "").trim();
      var customSubtitle = (config.customSubtitle || "").trim();

      if (customTitle || showSearch) {
        var headerBar = document.createElement("div");
        headerBar.style.display = "flex";
        headerBar.style.alignItems = "center";
        headerBar.style.justifyContent = "space-between";
        headerBar.style.padding = "10px 16px 6px 16px";
        headerBar.style.borderBottom = "1px solid " + theme.border;
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
          searchWrapper.style.backgroundColor = isDark ? "#0b1b30" : "#f1f5f9";
          searchWrapper.style.border = "1px solid " + (isDark ? "#1e3a5f" : "#cbd5e1");
          searchWrapper.style.borderRadius = "20px";
          searchWrapper.style.padding = "4px 10px";

          var searchIcon = document.createElement("span");
          searchIcon.innerHTML = "&#128269;";
          searchIcon.style.fontSize = "11px";
          searchWrapper.appendChild(searchIcon);

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Find cell site...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.outline = "none";
          searchInput.style.fontSize = "11px";
          searchInput.style.color = theme.text;
          searchInput.style.width = "110px";

          searchInput.addEventListener("input", function (e) {
            self._searchTerm = e.target.value.toLowerCase().trim();
            self._highlightSearch();
          });
          searchWrapper.appendChild(searchInput);
          headerBar.appendChild(searchWrapper);
        }
        container.appendChild(headerBar);
      }

      // 5. Executive Scorecard HUD (Top Band)
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hudBand = document.createElement("div");
        hudBand.style.display = "flex";
        hudBand.style.alignItems = "stretch";
        hudBand.style.gap = "10px";
        hudBand.style.padding = "8px 16px";
        hudBand.style.borderBottom = "1px solid " + theme.border;
        hudBand.style.backgroundColor = theme.cardBg;
        hudBand.style.flexShrink = "0";

        var hud1 = makeHudCard("Active 5G Sites", totalSites + " Sites", totalRawRows > 50 ? (totalRawRows.toLocaleString() + " rows telemetry") : "Nokia RAN Fleet", null, theme, isDark);
        var hud2 = makeHudCard("Peak Throughput", peakSite ? formatValue(peakSite.value, fmt) : "-", peakSite ? (peakSite.site.slice(0, 24) + "...") : "All Sectors", theme.positive, theme, isDark);
        var hud3 = makeHudCard("Mean " + metricLabel, formatValue(meanVal, fmt), "P50 Median: " + formatValue(medianVal, fmt), null, theme, isDark);
        var hud4 = makeHudCard("Mean " + secMetricLabel, formatValue(meanSecVal, "decimal_2") + (secondaryMeas && secondaryMeas.name.indexOf("loss") !== -1 ? "%" : " ms"), "Latency Quality", null, theme, isDark);

        hudBand.appendChild(hud1);
        hudBand.appendChild(hud2);
        hudBand.appendChild(hud3);
        hudBand.appendChild(hud4);

        if (targetVal !== null && config.showReferenceLine) {
          var targetStr = formatValue(targetVal, fmt);
          var complianceLabel = compliancePct.toFixed(1) + "% SLA Compliant";
          var hud5 = makeHudCard(config.referenceLineLabel || "5G SLA Target", targetStr, complianceLabel, (compliancePct >= 80 ? theme.positive : theme.negative), theme, isDark);
          hudBand.appendChild(hud5);
        }

        container.appendChild(hudBand);
      }

      // 6. Setup Canvas / SVG Polar Graph Area
      var polarWrapper = document.createElement("div");
      polarWrapper.className = "looker-polar-canvas-wrapper";
      polarWrapper.style.flex = "1 1 0";
      polarWrapper.style.minHeight = "0";
      polarWrapper.style.position = "relative";
      polarWrapper.style.overflow = "hidden";
      polarWrapper.style.width = "100%";
      container.appendChild(polarWrapper);

      var width = 900;
      var height = 540;
      var cx = width / 2;
      var cy = height / 2;
      var maxRadius = Math.min(width, height) / 2 - 40;

      var svg = d3.select(polarWrapper)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block");

      var rootZoomG = svg.append("g").attr("class", "zoom-root-group");

      if (config.enableZoom !== false) {
        var zoom = d3.zoom()
          .scaleExtent([0.85, 6])
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
        zoomControls.style.background = isDark ? "rgba(11, 27, 48, 0.9)" : "rgba(255, 255, 255, 0.95)";
        zoomControls.style.border = "1px solid " + theme.border;
        zoomControls.style.borderRadius = "8px";
        zoomControls.style.padding = "4px";
        zoomControls.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

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
            btn.style.backgroundColor = isDark ? "#1e3a5f" : "#f1f5f9";
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
        polarWrapper.appendChild(zoomControls);
      }

      var maxMetric = d3.max(sites, function (d) { return d.value; }) || 1000;
      var radiusScale = d3.scaleLinear()
        .domain([0, maxMetric])
        .range([10, maxRadius])
        .nice();

      var colorScale = d3.scaleSequential()
        .domain([0, maxMetric])
        .interpolator(d3.interpolateRgbBasis(theme.range));

      // Concentric Range Rings
      var ringsGroup = rootZoomG.append("g").attr("class", "polar-rings");
      var ringCount = Math.max(3, Math.min(6, Number(config.radarRingCount) || 4));
      var ringTicks = radiusScale.ticks(ringCount);

      ringTicks.forEach(function (tickVal) {
        if (tickVal === 0) return;
        var r = radiusScale(tickVal);

        ringsGroup.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r)
          .attr("fill", "none")
          .attr("stroke", theme.grid)
          .attr("stroke-width", 1.0)
          .attr("stroke-dasharray", "4,4");

        ringsGroup.append("text")
          .attr("x", cx + 4)
          .attr("y", cy - r - 3)
          .attr("font-size", "9.5px")
          .attr("font-weight", "600")
          .attr("fill", theme.subtext)
          .text(formatValue(tickVal, fmt));
      });

      // Cardinal & Compass Spokes (12 Azimuth sectors)
      var spokesGroup = rootZoomG.append("g").attr("class", "polar-spokes");
      var cardinalPoints = [
        { deg: 0, label: "0° N (North)" },
        { deg: 30, label: "30°" },
        { deg: 60, label: "60°" },
        { deg: 90, label: "90° E (East)" },
        { deg: 120, label: "120°" },
        { deg: 150, label: "150°" },
        { deg: 180, label: "180° S (South)" },
        { deg: 210, label: "210°" },
        { deg: 240, label: "240°" },
        { deg: 270, label: "270° W (West)" },
        { deg: 300, label: "300°" },
        { deg: 330, label: "330°" }
      ];

      var labelDensity = config.labelDensity || "all";
      cardinalPoints.forEach(function (p) {
        var rad = (p.deg - 90) * (Math.PI / 180);
        var x2 = cx + maxRadius * Math.cos(rad);
        var y2 = cy + maxRadius * Math.sin(rad);

        spokesGroup.append("line")
          .attr("x1", cx)
          .attr("y1", cy)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", theme.spoke)
          .attr("stroke-width", (p.deg % 90 === 0 ? 1.4 : 0.8))
          .attr("stroke-opacity", (p.deg % 90 === 0 ? 0.8 : 0.4));

        if (labelDensity !== "none") {
          if (labelDensity === "cardinal" && (p.deg % 90 !== 0)) return;
          var lx = cx + (maxRadius + 18) * Math.cos(rad);
          var ly = cy + (maxRadius + 18) * Math.sin(rad) + 4;
          spokesGroup.append("text")
            .attr("x", lx)
            .attr("y", ly)
            .attr("text-anchor", "middle")
            .attr("font-size", (p.deg % 90 === 0 ? "11px" : "9.5px"))
            .attr("font-weight", (p.deg % 90 === 0 ? "700" : "500"))
            .attr("fill", (p.deg % 90 === 0 ? theme.primary : theme.subtext))
            .text(p.label);
        }
      });

      // Target SLA Reference Ring
      if (targetVal !== null && config.showReferenceLine) {
        var targetR = radiusScale(targetVal);
        var targetRingG = rootZoomG.append("g").attr("class", "polar-target-ring");

        targetRingG.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", targetR)
          .attr("fill", "none")
          .attr("stroke", theme.positive)
          .attr("stroke-width", 2.0)
          .attr("stroke-dasharray", "6,4");

        targetRingG.append("text")
          .attr("x", cx + 6)
          .attr("y", cy - targetR + 13)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .attr("fill", theme.positive)
          .text("★ " + (config.referenceLineLabel || "5G SLA Target"));
      }

      // Visualization Paradigm Group
      var dataGroup = rootZoomG.append("g").attr("class", "polar-data-layer");
      var tooltip = this._tooltip;
      var highlightColor = config.highlightColor || theme.primary;

      function showTooltip(event, d) {
        if (!tooltip) return;
        var valFormatted = formatValue(d.value, fmt, d.rendered);
        var secFormatted = formatValue(d.secondaryValue, "decimal_2");
        var rankStr = "#" + d.rank + " of " + sites.length;
        var azimuthStr = Math.round(d.angle) + "° (" + getCompassDirection(d.angle) + ")";

        var targetHtml = "";
        if (d.target !== null) {
          var deltaStr = formatDelta(d.delta, d.deltaPct, fmt);
          var compColor = d.isCompliant ? theme.positive : theme.negative;
          var compLabel = d.isCompliant ? "&#10003; SLA Compliant" : "&#9888; Below SLA Goal";
          targetHtml = "" +
            "<div style=\"font-size:11.5px;margin-top:4px;display:flex;justify-content:space-between;color:" + theme.subtext + ";\">" +
            "  <span>SLA Target:</span>" +
            "  <span style=\"font-weight:600;color:" + theme.text + ";\">" + formatValue(d.target, fmt) + "</span>" +
            "</div>" +
            "<div style=\"font-size:11.5px;margin-top:2px;display:flex;justify-content:space-between;color:" + theme.subtext + ";\">" +
            "  <span>Variance:</span>" +
            "  <span style=\"font-weight:700;color:" + compColor + ";\">" + deltaStr + "</span>" +
            "</div>" +
            "<div style=\"font-size:11px;font-weight:700;color:" + compColor + ";margin-top:4px;\">" + compLabel + "</div>";
        }

        var anomalyHtml = "";
        if (d.isAnomaly) {
          anomalyHtml = "<div style=\"margin-top:4px;padding:2px 6px;border-radius:4px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:10.5px;font-weight:700;\">&#9888; RF Anomaly: Exceeds " + (config.anomalyThresholdPct || 35) + "% variance</div>";
        }

        tooltip.innerHTML = "" +
          "<div style=\"font-size:13px;font-weight:700;color:" + theme.text + ";margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;\">" +
          "  <span>" + d.site + "</span>" +
          "  <span style=\"font-size:10.5px;padding:2px 7px;background:" + (isDark ? "#1e3a5f" : "#e0f2fe") + ";color:" + (isDark ? "#7dd3fc" : "#0369a1") + ";border-radius:10px;font-weight:600;\">" + rankStr + "</span>" +
          "</div>" +
          "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-bottom:4px;\">Market: <strong>" + d.market + "</strong> | Hardware: <strong>" + d.hardware + "</strong></div>" +
          "<div style=\"margin-top:4px;font-size:12px;color:" + theme.subtext + ";display:flex;justify-content:space-between;gap:8px;\">" +
          "  <span>" + metricLabel + ": </span>" +
          "  <span style=\"font-weight:700;color:" + theme.primary + ";font-size:13px;\">" + valFormatted + "</span>" +
          "</div>" +
          (secondaryMeas ? "<div style=\"font-size:11.5px;color:" + theme.subtext + ";display:flex;justify-content:space-between;gap:8px;margin-top:2px;\"><span>" + secMetricLabel + ": </span><span style=\"font-weight:600;color:" + theme.text + ";\">" + secFormatted + "</span></div>" : "") +
          "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-top:3px;\">Sector Azimuth: <strong>" + azimuthStr + "</strong></div>" +
          targetHtml +
          anomalyHtml +
          (d.links && d.links.length > 0 ? "<div style=\"margin-top:6px;font-size:10.5px;color:#38bdf8;font-weight:600;\">Click cell site to explore drill-down &rarr;</div>" : "");

        tooltip.style.backgroundColor = isDark ? "rgba(11, 27, 48, 0.96)" : "rgba(255, 255, 255, 0.97)";
        tooltip.style.border = "1px solid " + (isDark ? "#1e3a5f" : "#e2e8f0");
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

      function getCompassDirection(deg) {
        var dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        var val = Math.round((deg / 22.5));
        return dirs[val % 16];
      }

      // RENDERING PARADIGMS:
      if (polarMode === "omni_radar") {
        // Mode 1: Omni 360° Radar Sectors (Antenna Radiation Lobes)
        var halfBeam = Math.PI / Math.max(8, totalSites * 0.7); // beamwidth spread

        sites.forEach(function (d) {
          var r = radiusScale(d.value);
          var centerAngleRad = (d.angle - 90) * (Math.PI / 180);
          var aStart = centerAngleRad - halfBeam;
          var aEnd = centerAngleRad + halfBeam;

          // Draw radiation lobe wedge with curve
          var arcGen = d3.arc()
            .innerRadius(0)
            .outerRadius(r)
            .startAngle(centerAngleRad - halfBeam + Math.PI / 2)
            .endAngle(centerAngleRad + halfBeam + Math.PI / 2);

          var lobe = dataGroup.append("path")
            .attr("class", "radar-lobe")
            .attr("data-site", d.site.toLowerCase())
            .attr("transform", "translate(" + cx + "," + cy + ")")
            .attr("d", arcGen)
            .attr("fill", colorScale(d.value))
            .attr("fill-opacity", isDark ? 0.65 : 0.7)
            .attr("stroke", colorScale(d.value))
            .attr("stroke-width", 1.5)
            .style("cursor", "pointer")
            .style("transition", "fill-opacity 0.2s, stroke-width 0.2s");

          // Lobe tip pin
          var tipX = cx + r * Math.cos(centerAngleRad);
          var tipY = cy + r * Math.sin(centerAngleRad);
          var pin = dataGroup.append("circle")
            .attr("cx", tipX)
            .attr("cy", tipY)
            .attr("r", 4.0)
            .attr("fill", theme.bg)
            .attr("stroke", colorScale(d.value))
            .attr("stroke-width", 2.0);

          lobe.on("mouseenter", function (event) {
            d3.select(this)
              .raise()
              .attr("fill-opacity", 0.95)
              .attr("stroke-width", 2.5)
              .attr("stroke", highlightColor);
            pin.raise().attr("r", 6.5).attr("stroke", highlightColor);
            showTooltip(event, d);
          });
          lobe.on("mousemove", moveTooltip);
          lobe.on("mouseleave", function () {
            d3.select(this)
              .attr("fill-opacity", isDark ? 0.65 : 0.7)
              .attr("stroke-width", 1.5)
              .attr("stroke", colorScale(d.value));
            pin.attr("r", 4.0).attr("stroke", colorScale(d.value));
            hideTooltip();
          });
          lobe.on("click", function (event) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
            }
          });
        });

      } else if (polarMode === "polar_scatter") {
        // Mode 2: Polar Constellation & Scatter Pins
        sites.forEach(function (d) {
          var r = radiusScale(d.value);
          var rad = (d.angle - 90) * (Math.PI / 180);
          var x = cx + r * Math.cos(rad);
          var y = cy + r * Math.sin(rad);

          // Guide radius ray
          dataGroup.append("line")
            .attr("x1", cx)
            .attr("y1", cy)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", colorScale(d.value))
            .attr("stroke-width", 1.0)
            .attr("stroke-opacity", 0.35);

          var node = dataGroup.append("circle")
            .attr("class", "polar-scatter-node")
            .attr("data-site", d.site.toLowerCase())
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 6.5)
            .attr("fill", colorScale(d.value))
            .attr("stroke", isDark ? "#ffffff" : "#0f172a")
            .attr("stroke-width", 1.5)
            .style("cursor", "pointer")
            .style("transition", "transform 0.15s, r 0.15s");

          // Pulsing halo for top 3 peak sites
          if (d.rank <= 3) {
            dataGroup.append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 10.5)
              .attr("fill", "none")
              .attr("stroke", highlightColor)
              .attr("stroke-width", 1.5)
              .attr("stroke-dasharray", "3,3")
              .attr("opacity", 0.85);
          }

          node.on("mouseenter", function (event) {
            d3.select(this).raise().attr("r", 9.5).attr("stroke", highlightColor);
            showTooltip(event, d);
          });
          node.on("mousemove", moveTooltip);
          node.on("mouseleave", function () {
            d3.select(this).attr("r", 6.5).attr("stroke", isDark ? "#ffffff" : "#0f172a");
            hideTooltip();
          });
          node.on("click", function (event) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
            }
          });
        });

      } else {
        // Mode 3: Azimuth Sector Heat Grid
        // 12 compass sectors x 4 distance rings = 48 polar bins
        var numSectors = 12;
        var numTiers = 4;
        var bins = [];
        for (var s = 0; s < numSectors; s++) {
          for (var t = 0; t < numTiers; t++) {
            bins.push({ sector: s, tier: t, sites: [], sumVal: 0 });
          }
        }

        sites.forEach(function (d) {
          var secIdx = Math.floor((d.angle % 360) / (360 / numSectors));
          var tierIdx = Math.min(numTiers - 1, Math.floor((d.value / maxMetric) * numTiers));
          var bin = bins.find(function (b) { return b.sector === secIdx && b.tier === tierIdx; });
          if (bin) {
            bin.sites.push(d);
            bin.sumVal += d.value;
          }
        });

        var maxBinVal = d3.max(bins, function (b) { return b.sites.length > 0 ? b.sumVal / b.sites.length : 0; }) || 1;
        var heatColorScale = d3.scaleSequential()
          .domain([0, maxBinVal])
          .interpolator(d3.interpolateRgbBasis(theme.range));

        bins.forEach(function (b) {
          var aStart = (b.sector * (360 / numSectors) - 90) * (Math.PI / 180);
          var aEnd = ((b.sector + 1) * (360 / numSectors) - 90) * (Math.PI / 180);
          var rIn = (b.tier / numTiers) * maxRadius;
          var rOut = ((b.tier + 1) / numTiers) * maxRadius;

          var arcGen = d3.arc()
            .innerRadius(rIn + 1.5)
            .outerRadius(rOut - 1.5)
            .startAngle(aStart + Math.PI / 2)
            .endAngle(aEnd + Math.PI / 2);

          var avgBinMetric = b.sites.length > 0 ? b.sumVal / b.sites.length : 0;
          var fill = b.sites.length > 0 ? heatColorScale(avgBinMetric) : (isDark ? "#0b1b30" : "#f8fafc");

          var tile = dataGroup.append("path")
            .attr("transform", "translate(" + cx + "," + cy + ")")
            .attr("d", arcGen)
            .attr("fill", fill)
            .attr("fill-opacity", b.sites.length > 0 ? 0.8 : 0.25)
            .attr("stroke", theme.border)
            .attr("stroke-width", 0.5)
            .style("cursor", b.sites.length > 0 ? "pointer" : "default");

          if (b.sites.length > 0) {
            tile.on("mouseenter", function (event) {
              d3.select(this).raise().attr("stroke", highlightColor).attr("stroke-width", 2.0);
              var leadSite = b.sites[0];
              showTooltip(event, leadSite);
            });
            tile.on("mousemove", moveTooltip);
            tile.on("mouseleave", function () {
              d3.select(this).attr("stroke", theme.border).attr("stroke-width", 0.5);
              hideTooltip();
            });
          }
        });
      }

      // Animated 360° Radar Sweep Line (Optional)
      if (config.beamSweepAnimation !== false && polarMode === "omni_radar") {
        var sweepG = rootZoomG.append("g").attr("class", "radar-sweep");
        var sweepLine = sweepG.append("line")
          .attr("x1", cx)
          .attr("y1", cy)
          .attr("x2", cx + maxRadius)
          .attr("y2", cy)
          .attr("stroke", theme.primary)
          .attr("stroke-width", 1.8)
          .attr("stroke-opacity", 0.65);

        var sweepArc = d3.arc()
          .innerRadius(0)
          .outerRadius(maxRadius)
          .startAngle(0)
          .endAngle(Math.PI / 5);

        var sweepCone = sweepG.append("path")
          .attr("transform", "translate(" + cx + "," + cy + ")")
          .attr("d", sweepArc)
          .attr("fill", theme.radarSweep);

        var sweepAngle = 0;
        function animateSweep() {
          sweepAngle = (sweepAngle + 1.2) % 360;
          sweepG.attr("transform", "rotate(" + sweepAngle + " " + cx + " " + cy + ")");
          self._sweepFrame = requestAnimationFrame(animateSweep);
        }
        if (self._sweepFrame) cancelAnimationFrame(self._sweepFrame);
        self._sweepFrame = requestAnimationFrame(animateSweep);
      }

      // Legend & Scale (Bottom Left)
      if (config.showLegend !== false) {
        var legendWrapper = document.createElement("div");
        legendWrapper.className = "looker-polar-legend";
        legendWrapper.style.position = "absolute";
        legendWrapper.style.bottom = "14px";
        legendWrapper.style.left = "16px";
        legendWrapper.style.zIndex = "10";
        legendWrapper.style.display = "flex";
        legendWrapper.style.flexDirection = "column";
        legendWrapper.style.gap = "4px";
        legendWrapper.style.background = isDark ? "rgba(11, 27, 48, 0.9)" : "rgba(255, 255, 255, 0.95)";
        legendWrapper.style.border = "1px solid " + theme.border;
        legendWrapper.style.borderRadius = "8px";
        legendWrapper.style.padding = "8px 12px";
        legendWrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

        var legTitle = document.createElement("div");
        legTitle.style.fontSize = "10px";
        legTitle.style.fontWeight = "700";
        legTitle.style.color = theme.text;
        legTitle.textContent = metricLabel + " (Radar Intensity)";
        legendWrapper.appendChild(legTitle);

        var legBar = document.createElement("div");
        legBar.style.display = "flex";
        legBar.style.width = "150px";
        legBar.style.height = "8px";
        legBar.style.borderRadius = "4px";
        legBar.style.overflow = "hidden";
        theme.range.forEach(function (c) {
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
        legLabels.innerHTML = "<span>0</span><span>" + formatValue(maxMetric, fmt) + "</span>";
        legendWrapper.appendChild(legLabels);

        polarWrapper.appendChild(legendWrapper);
      }

      this._highlightSearch = function () {
        var query = self._searchTerm;
        dataGroup.selectAll(".radar-lobe, .polar-scatter-node").each(function () {
          var el = d3.select(this);
          var siteName = el.attr("data-site") || "";
          var match = !query || siteName.indexOf(query) !== -1;
          el.attr("opacity", match ? 1.0 : 0.15)
            .attr("stroke-width", match && query ? 2.5 : 1.5)
            .attr("stroke", match && query ? highlightColor : (el.attr("stroke") || theme.primary));
        });
      };
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
