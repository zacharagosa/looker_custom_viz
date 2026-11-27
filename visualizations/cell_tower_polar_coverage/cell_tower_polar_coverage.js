/**
 * Cell Tower Sector Azimuth & RF Signal Coverage Polar Map
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Telecom, Cloud & SecOps Geospatial Radar Suite:
 * - Chart-first minimalism: 90%+ viewport dedicated to the polar geometry by default
 *   (Scorecard HUD & search bar optional and hidden by default).
 * - Multi-Modal Polar Layouts (Display tab):
 *     1. Omni 360° Radar Sectors (Antenna Radiation Lobes with inner hub & market arcs)
 *     2. Polar Constellation & Scatter Pins
 *     3. Azimuth Sector Heat Grid (12 compass sectors x 4 concentric tiers)
 * - Strict 2-tab option hierarchy ('Display' and 'Style') with dynamic query-driven
 *   field-role dropdowns via Looker `registerOptions`, debounced ResizeObserver (<4px guard),
 *   XSS-safe `escapeHtml`, guarded `clearErrors`/`addError`, and `LookerCharts.Utils.openDrillMenu`.
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

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var THEMES = {
    google_blue: {
      name: "Google Enterprise (Light)",
      isDark: false,
      primary: "#1a73e8",
      secondary: "#0d9488",
      accent: "#174ea6",
      bg: "#ffffff",
      hubBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#475569",
      border: "#e2e8f0",
      grid: "#e2e8f0",
      spoke: "#cbd5e1",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#0d9488",
      warning: "#f59e0b",
      negative: "#dc2626",
      radarSweep: "rgba(26, 115, 232, 0.14)",
      range: ["#dbeafe", "#60a5fa", "#2563eb", "#1d4ed8", "#1e3a8a"]
    },
    modern_slate: {
      name: "Modern Slate (Light)",
      isDark: false,
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#0f172a",
      bg: "#ffffff",
      hubBg: "#f8fafc",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#e2e8f0",
      spoke: "#cbd5e1",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#059669",
      warning: "#d97706",
      negative: "#dc2626",
      radarSweep: "rgba(37, 99, 235, 0.14)",
      range: ["#e2e8f0", "#94a3b8", "#475569", "#2563eb", "#0f172a"]
    },
    nokia_cyan: {
      name: "Nokia 5G Cyan / Deep Navy",
      isDark: true,
      primary: "#00c9ff",
      secondary: "#0284c7",
      accent: "#38bdf8",
      bg: "#050d1a",
      hubBg: "#0b1b30",
      text: "#f0f9ff",
      subtext: "#7dd3fc",
      border: "#163459",
      grid: "#163459",
      spoke: "#1e477a",
      cardBg: "#0b1b30",
      cardBorder: "#1e3a5f",
      positive: "#10b981",
      warning: "#f59e0b",
      negative: "#f43f5e",
      radarSweep: "rgba(0, 201, 255, 0.18)",
      range: ["#0c4a6e", "#0369a1", "#0284c7", "#00c9ff", "#7dd3fc"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Radar (Midnight)",
      isDark: true,
      primary: "#38bdf8",
      secondary: "#a855f7",
      accent: "#ec4899",
      bg: "#0f172a",
      hubBg: "#1e293b",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#1e293b",
      grid: "#334155",
      spoke: "#475569",
      cardBg: "#1e293b",
      cardBorder: "#334155",
      positive: "#10b981",
      warning: "#f59e0b",
      negative: "#f43f5e",
      radarSweep: "rgba(56, 189, 248, 0.18)",
      range: ["#312e81", "#4f46e5", "#0284c7", "#06b6d4", "#38bdf8"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      isDark: false,
      primary: "#059669",
      secondary: "#047857",
      accent: "#064e3b",
      bg: "#ffffff",
      hubBg: "#f0fdf4",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#d1fae5",
      spoke: "#a7f3d0",
      cardBg: "#f0fdf4",
      cardBorder: "#a7f3d0",
      positive: "#059669",
      warning: "#d97706",
      negative: "#dc2626",
      radarSweep: "rgba(5, 150, 105, 0.14)",
      range: ["#d1fae5", "#6ee7b7", "#10b981", "#059669", "#065f46"]
    },
    sunset_media: {
      name: "Sunset Amber",
      isDark: false,
      primary: "#ea580c",
      secondary: "#c2410c",
      accent: "#7c2d12",
      bg: "#ffffff",
      hubBg: "#fffbeb",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#ffedd5",
      spoke: "#fed7aa",
      cardBg: "#fffbeb",
      cardBorder: "#fde68a",
      positive: "#059669",
      warning: "#d97706",
      negative: "#dc2626",
      radarSweep: "rgba(234, 88, 12, 0.14)",
      range: ["#fed7aa", "#fdba74", "#fb923c", "#ea580c", "#9a3412"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      isDark: false,
      primary: "#0284c7",
      secondary: "#0369a1",
      accent: "#0c4a6e",
      bg: "#ffffff",
      hubBg: "#f0f9ff",
      text: "#0f172a",
      subtext: "#475569",
      border: "#e2e8f0",
      grid: "#e0f2fe",
      spoke: "#bae6fd",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      positive: "#006b40",
      warning: "#d97706",
      negative: "#b42318",
      radarSweep: "rgba(2, 132, 199, 0.14)",
      range: ["#dbeafe", "#60a5fa", "#0284c7", "#0369a1", "#0c4a6e"]
    },
    thermal_heat: {
      name: "Thermal RF Heat",
      isDark: false,
      primary: "#ea580c",
      secondary: "#dc2626",
      accent: "#7f1d1d",
      bg: "#ffffff",
      hubBg: "#fff7ed",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#ffedd5",
      spoke: "#fed7aa",
      cardBg: "#fff7ed",
      cardBorder: "#fed7aa",
      positive: "#059669",
      warning: "#f59e0b",
      negative: "#b91c1c",
      radarSweep: "rgba(234, 88, 12, 0.14)",
      range: ["#fde68a", "#fbbf24", "#f97316", "#ea580c", "#b91c1c"]
    }
  };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
      var trimmed = String(overrideVal).trim();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
    }
    if (defaultIdx >= 0 && defaultIdx < list.length) return list[defaultIdx];
    return list[0];
  }

  function extractFieldFields(queryResponse) {
    var f = (queryResponse && queryResponse.fields) || {};
    var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
    var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
    if (!meas.length && f.table_calculations && f.table_calculations.length) {
      meas = f.table_calculations;
    }
    return { dims: dims, meas: meas };
  }

  function collectLinks(row, preferredField, dims, meas) {
    var seen = {};
    var out = [];
    function pushArr(arr) {
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        var lnk = arr[i];
        var key = (lnk.url || "") + "|" + (lnk.label || "");
        if (!seen[key]) {
          seen[key] = true;
          out.push(lnk);
        }
      }
    }
    if (preferredField && row[preferredField.name]) {
      pushArr(row[preferredField.name].links);
    }
    meas.forEach(function (m) {
      if (row[m.name]) pushArr(row[m.name].links);
    });
    dims.forEach(function (d) {
      if (row[d.name]) pushArr(row[d.name].links);
    });
    return out;
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return String(lookerRendered);
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
      case "percent":
      case "percentage":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        if (lookerRendered) return String(lookerRendered);
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    }
  }

  function formatDelta(delta, deltaPct, fmt) {
    var deltaSign = delta > 0 ? "+" : delta < 0 ? "-" : "";
    var formattedVal = formatValue(Math.abs(delta), fmt);
    var pctSign = deltaPct > 0 ? "+" : deltaPct < 0 ? "-" : "";
    var pctStr = pctSign + (Math.abs(deltaPct) * 100).toFixed(1) + "%";
    return deltaSign + formattedVal + " (" + pctStr + ")";
  }

  function makeHudCard(label, valStr, subStr, subColor, theme) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "110px";
    card.style.padding = "6px 10px";
    card.style.borderRadius = "7px";
    card.style.backgroundColor = theme.cardBg;
    card.style.border = "1px solid " + theme.cardBorder;
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "1px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = "10px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.style.whiteSpace = "nowrap";
    lbl.style.overflow = "hidden";
    lbl.style.textOverflow = "ellipsis";
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = "15px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = "10.5px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.style.whiteSpace = "nowrap";
      sub.style.overflow = "hidden";
      sub.style.textOverflow = "ellipsis";
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  function shortSiteLabel(name, maxLen) {
    var s = String(name || "").trim();
    s = s.replace(/\s+(Macro Tower|Rooftop Site|Micro Cell|Base Station)$/i, "");
    if (s.length > maxLen) {
      return s.slice(0, maxLen - 1) + "\u2026";
    }
    return s;
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
        label: "Site Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      sectorAngleOverride: {
        type: "string",
        label: "Azimuth Angle / Bearing Dimension (or Auto Compass)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary RF Measure (Radius)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary Measure (Latency / Load / Tooltip)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetCalculationMode: {
        type: "string",
        label: "SLA Target Benchmark Mode",
        display: "select",
        values: [
          { "Fixed Static SLA Target": "fixed" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Top Percentile P75": "percentile_p75" },
          { "Top Percentile P90": "percentile_p90" },
          { "Secondary Measure Column": "second_measure" },
          { "None (No Target Ring)": "none" }
        ],
        default: "fixed",
        section: "Display",
        order: 6
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed SLA Target Value (e.g. 500)",
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
        label: "Show Concentric SLA Target Ring",
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
          { "Query Order (Preserve Market/Group Clustering)": "none" },
          { "Throughput / Metric Descending": "metric_desc" },
          { "Throughput / Metric Ascending": "metric_asc" },
          { "Azimuth Bearing (0° to 360°)": "azimuth_asc" },
          { "Site Name Alphabetical": "site_asc" }
        ],
        default: "none",
        section: "Display",
        order: 11
      },
      topNLimit: {
        type: "number",
        label: "Top-N Sites Limit (0 = All, Max 72)",
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
        label: "Summary Header Strip",
        display: "select",
        values: [
          { "Hidden (Chart-First Default)": "none" },
          { "Compact Metric Strip": "compact_strip" },
          { "Full Scorecard HUD (Top Band)": "scorecard" }
        ],
        default: "none",
        section: "Display",
        order: 15
      },
      labelDensity: {
        type: "string",
        label: "Compass & Site Callout Density",
        display: "select",
        values: [
          { "Compass + Alert/Peak Callouts": "all" },
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
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Site Search Filter",
        default: false,
        section: "Display",
        order: 19
      },
      showLegend: {
        type: "boolean",
        label: "Show Legend",
        default: true,
        section: "Display",
        order: 20
      },
      beamSweepAnimation: {
        type: "boolean",
        label: "Enable Animated 360° Radar Sweep",
        default: false,
        section: "Display",
        order: 21
      },
      enableZoom: {
        type: "boolean",
        label: "Enable Pan & Zoom Controls",
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
          { "Google Enterprise (Light)": "google_blue" },
          { "Modern Slate (Light)": "modern_slate" },
          { "Nokia 5G Cyan / Deep Navy": "nokia_cyan" },
          { "Cyberpunk Radar (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Amber": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Thermal RF Heat": "thermal_heat" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_blue",
        section: "Style",
        order: 1
      },
      colorBy: {
        type: "string",
        label: "Sector Color Encoding",
        display: "select",
        values: [
          { "SLA Compliance & Signal Intensity": "sla_status" },
          { "Primary Metric Intensity Ramp": "primary_ramp" },
          { "Secondary Metric (e.g. Latency)": "secondary_ramp" }
        ],
        default: "sla_status",
        section: "Style",
        order: 2
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Beam / Scale Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Compliant Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Alert / Non-Compliant Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 5
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
        order: 6
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scaling",
        display: "select",
        values: [
          { "Compact (Dense Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 7
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
        order: 8
      },
      radarRingCount: {
        type: "number",
        label: "Concentric Range Rings Count (3-6)",
        default: 4,
        section: "Style",
        order: 9
      },
      highlightColor: {
        type: "string",
        label: "Hover Highlight Stroke Color",
        display: "color",
        default: "#1a73e8",
        section: "Style",
        order: 10
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        siteFieldOverride: { role: "dimension", defaultIdx: 0 },
        sectorAngleOverride: { role: "dimension", defaultIdx: -1 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasureOverride: { role: "measure", defaultIdx: 1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var extracted = extractFieldFields(queryResponse);
      var dims = extracted.dims;
      var meas = extracted.meas;

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
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
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
      if (this._sweepFrame) {
        cancelAnimationFrame(this._sweepFrame);
        this._sweepFrame = null;
      }
      if (this._tooltip && this._tooltip.parentNode) {
        this._tooltip.parentNode.removeChild(this._tooltip);
      }

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
      container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
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
      tooltip.style.maxWidth = "320px";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(15, 23, 42, 0.25)";
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
      if (!this._visibilityBound) {
        this._visibilityBound = true;
        document.addEventListener("visibilitychange", function () {
          if (document.hidden && self._sweepFrame) {
            cancelAnimationFrame(self._sweepFrame);
            self._sweepFrame = null;
          }
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
      this._registerDynamicFieldOptions(queryResponse);
      var self = this;
      if (typeof this.clearErrors === "function") {
        try { this.clearErrors(); } catch (e) {}
      }

      if (this._sweepFrame) {
        cancelAnimationFrame(this._sweepFrame);
        this._sweepFrame = null;
      }

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config || {};
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      if (!data || data.length === 0) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned no rows to visualize on the polar coverage map."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var extracted = extractFieldFields(queryResponse);
      var dims = extracted.dims;
      var meas = extracted.meas;

      if (dims.length === 0) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "Dimension Required",
              message: "Cell Tower Polar Map requires at least 1 Site Dimension (e.g. cell_towers.site_name)."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      if (meas.length === 0) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "Measure Required",
              message: "Cell Tower Polar Map requires at least 1 RF Metric Measure (e.g. throughput_mbps, latency_ms)."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config || {}, queryResponse);
        } catch (err) {
          console.error("Cell Tower Polar Map render error:", err);
          if (typeof self.addError === "function") {
            try {
              self.addError({
                title: "Rendering Error",
                message: err.message || "An unexpected error occurred while rendering the polar map."
              });
            } catch (e) {}
          }
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = (this._container && element.contains(this._container))
        ? this._container
        : element.querySelector(".looker-cell-polar-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_blue";
      var theme = THEMES[themeKey] || THEMES.google_blue;
      var isDark = !!theme.isDark;

      if (themeKey === "custom" && config.customPrimaryColor) {
        theme = {
          name: "Custom Hex Override",
          isDark: false,
          primary: config.customPrimaryColor,
          secondary: config.customPrimaryColor,
          accent: "#0f172a",
          bg: "#ffffff",
          hubBg: "#f8fafc",
          text: "#0f172a",
          subtext: "#475569",
          border: "#e2e8f0",
          grid: "#e2e8f0",
          spoke: "#cbd5e1",
          cardBg: "#f8fafc",
          cardBorder: "#e2e8f0",
          positive: config.customPositiveColor || "#0d9488",
          warning: "#f59e0b",
          negative: config.customNegativeColor || "#dc2626",
          radarSweep: "rgba(0, 0, 0, 0.12)",
          range: ["#e2e8f0", "#94a3b8", config.customPrimaryColor, config.customPrimaryColor, "#0f172a"]
        };
      }

      if (config.customPositiveColor) theme = Object.assign({}, theme, { positive: config.customPositiveColor });
      if (config.customNegativeColor) theme = Object.assign({}, theme, { negative: config.customNegativeColor });

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontScale = config.fontScale || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : fontScale === "large" ? 13.5 : 12;
      container.style.fontSize = baseFontSize + "px";

      var polarMode = config.polarMode || "omni_radar";
      var polarity = config.metricPolarity || "higher_better";
      var fmt = config.valueFormat || "compact_number";
      var colorBy = config.colorBy || "sla_status";

      var extracted = extractFieldFields(queryResponse);
      var dims = extracted.dims;
      var meas = extracted.meas;

      var siteField = resolveField(dims, config.siteFieldOverride, 0);
      var angleField = config.sectorAngleOverride ? resolveField(dims, config.sectorAngleOverride, -1) : null;
      var primaryMeas = resolveField(meas, config.primaryMeasureOverride, 0);
      var secondaryMeas = meas.length > 1 ? resolveField(meas, config.secondaryMeasureOverride, 1) : null;

      var metricLabel = primaryMeas ? (primaryMeas.label_short || primaryMeas.label || primaryMeas.name) : "Throughput";
      var secMetricLabel = secondaryMeas ? (secondaryMeas.label_short || secondaryMeas.label || secondaryMeas.name) : "Latency";
      var totalRawRows = data.length;

      // Detect optional group/market dimension & operational status dimension
      var groupDim = null;
      var statusDim = null;
      var hardwareDim = null;
      dims.forEach(function (d) {
        if (d.name === siteField.name) return;
        var nm = d.name.toLowerCase();
        var shortNm = nm.indexOf(".") !== -1 ? nm.split(".").pop() : nm;
        if (!groupDim && (shortNm.indexOf("market") !== -1 || shortNm.indexOf("region") !== -1 || shortNm.indexOf("city") !== -1 || shortNm.indexOf("cluster") !== -1 || shortNm.indexOf("category") !== -1)) {
          groupDim = d;
        } else if (!statusDim && (shortNm.indexOf("status") !== -1 || shortNm.indexOf("tier") !== -1 || shortNm.indexOf("state") !== -1)) {
          statusDim = d;
        } else if (!hardwareDim && (shortNm.indexOf("vendor") !== -1 || shortNm.indexOf("model") !== -1 || shortNm.indexOf("equipment") !== -1)) {
          hardwareDim = d;
        }
      });

      // 1. Client-Side Aggregation by Site (preserving insertion order)
      var siteMap = {};
      var siteOrder = [];
      data.forEach(function (row) {
        var rawSiteCell = row[siteField.name];
        var rawSite = rawSiteCell ? (rawSiteCell.rendered || rawSiteCell.value) : "Unknown Site";
        var siteKey = String(rawSite).trim();

        var pCell = row[primaryMeas.name];
        var pVal = pCell && pCell.value !== null && pCell.value !== undefined && !isNaN(pCell.value) ? Number(pCell.value) : 0;
        var pRendered = pCell ? pCell.rendered : null;
        var links = collectLinks(row, primaryMeas, dims, meas);

        var sVal = 0;
        var sHas = false;
        if (secondaryMeas && row[secondaryMeas.name] && row[secondaryMeas.name].value !== null && row[secondaryMeas.name].value !== undefined) {
          sVal = Number(row[secondaryMeas.name].value) || 0;
          sHas = true;
        }

        var angleVal = null;
        if (angleField && row[angleField.name] && row[angleField.name].value !== null && row[angleField.name].value !== undefined) {
          var parsedAngle = Number(row[angleField.name].value);
          if (isFinite(parsedAngle)) angleVal = parsedAngle;
        }

        var market = groupDim && row[groupDim.name] ? String(row[groupDim.name].rendered || row[groupDim.name].value || "") : "";
        var status = statusDim && row[statusDim.name] ? String(row[statusDim.name].rendered || row[statusDim.name].value || "") : "";
        var hardware = hardwareDim && row[hardwareDim.name] ? String(row[hardwareDim.name].rendered || row[hardwareDim.name].value || "") : "";

        if (!siteMap[siteKey]) {
          siteMap[siteKey] = {
            site: siteKey,
            market: market,
            status: status,
            hardware: hardware,
            primarySum: 0,
            secondarySum: 0,
            hasSecondary: sHas,
            count: 0,
            angle: angleVal,
            rendered: pRendered,
            links: links
          };
          siteOrder.push(siteKey);
        }

        siteMap[siteKey].primarySum += pVal;
        siteMap[siteKey].secondarySum += sVal;
        siteMap[siteKey].count += 1;
      });

      var sites = [];
      siteOrder.forEach(function (k) {
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

      // 2. Sorting
      var sortBy = config.sortBy || "none";
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
            hardware: "Aggregated Fleet",
            market: "Other",
            status: "",
            value: otherPrimary,
            secondaryValue: otherSecondary,
            hasSecondary: !!secondaryMeas,
            count: remaining.length,
            angle: null,
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
          s.angle = ((idx + 0.5) * (360 / totalSites)) % 360;
        }
      });

      // 3. Compute Benchmark Target & Compliance
      var targetMode = config.targetCalculationMode || "fixed";
      var meanVal = d3.mean(sites, function (d) { return d.value; }) || 0;
      var medianVal = d3.median(sites, function (d) { return d.value; }) || 0;
      var sortedVals = sites.map(function (d) { return d.value; }).sort(d3.ascending);
      var p75Val = d3.quantile(sortedVals, 0.75) || 0;
      var p90Val = d3.quantile(sortedVals, 0.90) || 0;

      var targetVal = null;
      switch (targetMode) {
        case "fixed":
          targetVal = (config.fixedTargetValue !== undefined && config.fixedTargetValue !== null && config.fixedTargetValue !== "")
            ? Number(config.fixedTargetValue)
            : 500;
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

      // 4. Optional Header Bar (ONLY rendered if customTitle or showSearch is explicitly set)
      var showSearch = config.showSearch === true;
      var customTitle = (config.customTitle || "").trim();
      var customSubtitle = (config.customSubtitle || "").trim();

      if (customTitle || showSearch) {
        var headerBar = document.createElement("div");
        headerBar.style.display = "flex";
        headerBar.style.alignItems = "center";
        headerBar.style.justifyContent = "space-between";
        headerBar.style.padding = "8px 14px 6px 14px";
        headerBar.style.borderBottom = "1px solid " + theme.border;
        headerBar.style.gap = "10px";
        headerBar.style.flex = "0 0 auto";

        var titleBlock = document.createElement("div");
        titleBlock.style.display = "flex";
        titleBlock.style.flexDirection = "column";
        titleBlock.style.minWidth = "0";

        if (customTitle) {
          var hTitle = document.createElement("div");
          hTitle.style.fontSize = (baseFontSize + 2) + "px";
          hTitle.style.fontWeight = "700";
          hTitle.style.color = theme.text;
          hTitle.style.whiteSpace = "nowrap";
          hTitle.style.overflow = "hidden";
          hTitle.style.textOverflow = "ellipsis";
          hTitle.textContent = customTitle;
          titleBlock.appendChild(hTitle);
        }

        if (customSubtitle) {
          var hSub = document.createElement("div");
          hSub.style.fontSize = (baseFontSize - 1) + "px";
          hSub.style.color = theme.subtext;
          hSub.style.whiteSpace = "nowrap";
          hSub.style.overflow = "hidden";
          hSub.style.textOverflow = "ellipsis";
          hSub.textContent = customSubtitle;
          titleBlock.appendChild(hSub);
        }
        headerBar.appendChild(titleBlock);

        if (showSearch) {
          var searchWrapper = document.createElement("div");
          searchWrapper.style.display = "flex";
          searchWrapper.style.alignItems = "center";
          searchWrapper.style.gap = "6px";
          searchWrapper.style.backgroundColor = theme.cardBg;
          searchWrapper.style.border = "1px solid " + theme.border;
          searchWrapper.style.borderRadius = "16px";
          searchWrapper.style.padding = "3px 10px";
          searchWrapper.style.flexShrink = "0";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter cell site...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.outline = "none";
          searchInput.style.fontSize = "11px";
          searchInput.style.color = theme.text;
          searchInput.style.width = "120px";

          searchInput.addEventListener("input", function (e) {
            self._searchTerm = e.target.value.toLowerCase().trim();
            self._highlightSearch();
          });
          searchWrapper.appendChild(searchInput);
          headerBar.appendChild(searchWrapper);
        }
        container.appendChild(headerBar);
      }

      // 5. Optional Summary Strip / Scorecard HUD (Hidden by default for chart-first minimalism)
      var hudMode = config.hudMode || "none";
      if (hudMode === "compact_strip") {
        var strip = document.createElement("div");
        strip.style.display = "flex";
        strip.style.flexWrap = "wrap";
        strip.style.alignItems = "center";
        strip.style.justifyContent = "space-between";
        strip.style.gap = "12px";
        strip.style.padding = "6px 14px";
        strip.style.borderBottom = "1px solid " + theme.border;
        strip.style.backgroundColor = theme.cardBg;
        strip.style.fontSize = "11px";
        strip.style.flex = "0 0 auto";

        var items = [
          "<strong>" + totalSites + "</strong> Sites",
          "Mean " + escapeHtml(metricLabel) + ": <strong>" + escapeHtml(formatValue(meanVal, fmt)) + "</strong>",
          "Peak: <strong>" + escapeHtml(peakSite ? formatValue(peakSite.value, fmt) : "-") + "</strong>"
        ];
        if (secondaryMeas) {
          items.push("Mean " + escapeHtml(secMetricLabel) + ": <strong>" + escapeHtml(formatValue(meanSecVal, "decimal_2")) + "</strong>");
        }
        if (targetVal !== null && config.showReferenceLine !== false) {
          items.push("SLA Compliance: <strong style=\"color:" + (compliancePct >= 80 ? theme.positive : theme.negative) + ";\">" + compliancePct.toFixed(1) + "%</strong>");
        }
        strip.innerHTML = items.join("<span style=\"opacity:0.35;margin:0 4px;\">|</span>");
        container.appendChild(strip);
      } else if (hudMode === "scorecard") {
        var hudBand = document.createElement("div");
        hudBand.style.display = "flex";
        hudBand.style.flexWrap = "wrap";
        hudBand.style.alignItems = "stretch";
        hudBand.style.gap = "8px";
        hudBand.style.padding = "8px 14px";
        hudBand.style.borderBottom = "1px solid " + theme.border;
        hudBand.style.backgroundColor = theme.bg;
        hudBand.style.flex = "0 0 auto";

        hudBand.appendChild(makeHudCard("Active Sites", totalSites + " Sites", totalRawRows > totalSites ? (totalRawRows.toLocaleString() + " telemetry rows") : "RAN Sector Fleet", null, theme));
        hudBand.appendChild(makeHudCard("Peak " + metricLabel, peakSite ? formatValue(peakSite.value, fmt) : "-", peakSite ? shortSiteLabel(peakSite.site, 26) : "All Sectors", theme.positive, theme));
        hudBand.appendChild(makeHudCard("Mean " + metricLabel, formatValue(meanVal, fmt), "Median: " + formatValue(medianVal, fmt), null, theme));
        if (secondaryMeas) {
          hudBand.appendChild(makeHudCard("Mean " + secMetricLabel, formatValue(meanSecVal, "decimal_2"), "Secondary Telemetry", null, theme));
        }
        if (targetVal !== null && config.showReferenceLine !== false) {
          var targetStr = formatValue(targetVal, fmt);
          var complianceLabel = compliancePct.toFixed(1) + "% SLA Compliant";
          hudBand.appendChild(makeHudCard(config.referenceLineLabel || "SLA Target", targetStr, complianceLabel, (compliancePct >= 80 ? theme.positive : theme.negative), theme));
        }
        container.appendChild(hudBand);
      }

      // 6. Polar Canvas Wrapper (Fills remaining flex space — 90%+ by default)
      var polarWrapper = document.createElement("div");
      polarWrapper.className = "looker-polar-canvas-wrapper";
      polarWrapper.style.flex = "1 1 0";
      polarWrapper.style.minHeight = "0";
      polarWrapper.style.position = "relative";
      polarWrapper.style.overflow = "hidden";
      polarWrapper.style.width = "100%";
      container.appendChild(polarWrapper);

      var measuredW = polarWrapper.clientWidth || element.clientWidth || 900;
      var measuredH = polarWrapper.clientHeight || element.clientHeight || 560;
      if (measuredW < 180) measuredW = 900;
      if (measuredH < 140) measuredH = 560;

      var width = measuredW;
      var height = measuredH;
      var minDim = Math.min(width, height);
      var isTiny = minDim < 280;
      var outerPad = isTiny ? 32 : Math.max(66, minDim * 0.125);
      var maxRadius = Math.max(40, minDim / 2 - outerPad);
      var innerHubR = polarMode === "omni_radar" ? Math.max(18, maxRadius * 0.18) : (polarMode === "azimuth_heatmap" ? Math.max(14, maxRadius * 0.14) : 0);

      // Slight horizontal centering; shift slightly right if legend sits bottom-left on very wide compact tiles
      var cx = width / 2;
      var cy = height / 2;

      var svg = d3.select(polarWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var rootZoomG = svg.append("g").attr("class", "zoom-root-group");

      if (config.enableZoom !== false && !isTiny) {
        var zoom = d3.zoom()
          .scaleExtent([0.85, 6])
          .on("zoom", function (event) {
            rootZoomG.attr("transform", event.transform);
          });
        svg.call(zoom);

        var zoomControls = document.createElement("div");
        zoomControls.className = "looker-zoom-controls";
        zoomControls.style.position = "absolute";
        zoomControls.style.top = "10px";
        zoomControls.style.right = "12px";
        zoomControls.style.zIndex = "10";
        zoomControls.style.display = "flex";
        zoomControls.style.flexDirection = "column";
        zoomControls.style.gap = "2px";
        zoomControls.style.background = isDark ? "rgba(11, 27, 48, 0.88)" : "rgba(255, 255, 255, 0.92)";
        zoomControls.style.border = "1px solid " + theme.border;
        zoomControls.style.borderRadius = "7px";
        zoomControls.style.padding = "3px";
        zoomControls.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.08)";

        function createBtn(text, title, onClick) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.innerHTML = text;
          btn.title = title;
          btn.style.width = "24px";
          btn.style.height = "24px";
          btn.style.border = "none";
          btn.style.background = "transparent";
          btn.style.cursor = "pointer";
          btn.style.fontSize = "13px";
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
          svg.transition().duration(220).call(zoom.scaleBy, 1.35);
        }));
        zoomControls.appendChild(createBtn("&minus;", "Zoom Out", function () {
          svg.transition().duration(220).call(zoom.scaleBy, 0.74);
        }));
        zoomControls.appendChild(createBtn("&#x21ba;", "Reset View", function () {
          svg.transition().duration(220).call(zoom.transform, d3.zoomIdentity);
        }));
        polarWrapper.appendChild(zoomControls);
      }

      var maxDataVal = d3.max(sites, function (d) { return d.value; }) || 1000;
      var minDataVal = d3.min(sites, function (d) { return d.value; }) || 0;
      var domainMax = Math.max(maxDataVal, targetVal !== null ? targetVal * 1.05 : 0);

      var radiusScale = d3.scaleLinear()
        .domain([0, domainMax])
        .range([innerHubR, maxRadius])
        .nice();

      // Secondary metric bounds (for colorBy === "secondary_ramp")
      var secExtent = secondaryMeas
        ? d3.extent(sites, function (d) { return d.secondaryValue; })
        : [0, 1];
      if (secExtent[0] === secExtent[1]) secExtent = [0, secExtent[1] || 1];

      var colorMin = minDataVal > domainMax * 0.75 ? domainMax * 0.7 : 0;
      var primaryRamp = d3.scaleSequential()
        .domain([colorMin, radiusScale.domain()[1]])
        .clamp(true)
        .interpolator(d3.interpolateRgbBasis(theme.range));

      var secondaryRamp = d3.scaleSequential()
        .domain(secExtent)
        .clamp(true)
        .interpolator(d3.interpolateRgbBasis([theme.positive, theme.warning, theme.negative]));

      function getSectorColor(d) {
        if (colorBy === "secondary_ramp" && secondaryMeas) {
          return secondaryRamp(d.secondaryValue);
        }
        if (colorBy === "sla_status" && targetVal !== null) {
          if (!d.isCompliant) {
            return d.isAnomaly ? theme.negative : theme.warning;
          }
          // Compliant sectors shaded cleanly across the upper range of theme colors
          return primaryRamp(d.value);
        }
        return primaryRamp(d.value);
      }

      // A. Concentric Range Rings (grid lines underneath data)
      var ringsGroup = rootZoomG.append("g").attr("class", "polar-rings");
      var ringCount = Math.max(3, Math.min(6, Number(config.radarRingCount) || 4));
      var ringTicks = radiusScale.ticks(ringCount);

      // Subtle outer boundary circle
      ringsGroup.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", maxRadius)
        .attr("fill", isDark ? "rgba(11, 27, 48, 0.35)" : "rgba(248, 250, 252, 0.65)")
        .attr("stroke", theme.spoke)
        .attr("stroke-width", 1.1);

      ringTicks.forEach(function (tickVal) {
        if (tickVal <= 0) return;
        var r = radiusScale(tickVal);
        if (r <= innerHubR + 4 || r > maxRadius + 2) return;

        ringsGroup.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", r)
          .attr("fill", "none")
          .attr("stroke", theme.grid)
          .attr("stroke-width", 0.9)
          .attr("stroke-dasharray", "3,3");
      });

      // B. Cardinal & Compass Spokes
      var spokesGroup = rootZoomG.append("g").attr("class", "polar-spokes");
      var cardinalPoints = [
        { deg: 0, label: "N 0°" },
        { deg: 30, label: "30°" },
        { deg: 60, label: "60°" },
        { deg: 90, label: "E 90°" },
        { deg: 120, label: "120°" },
        { deg: 150, label: "150°" },
        { deg: 180, label: "S 180°" },
        { deg: 210, label: "210°" },
        { deg: 240, label: "240°" },
        { deg: 270, label: "W 270°" },
        { deg: 300, label: "300°" },
        { deg: 330, label: "330°" }
      ];

      var labelDensity = config.labelDensity || "all";
      cardinalPoints.forEach(function (p) {
        var rad = (p.deg - 90) * (Math.PI / 180);
        var x1 = cx + innerHubR * Math.cos(rad);
        var y1 = cy + innerHubR * Math.sin(rad);
        var x2 = cx + maxRadius * Math.cos(rad);
        var y2 = cy + maxRadius * Math.sin(rad);

        spokesGroup.append("line")
          .attr("x1", x1)
          .attr("y1", y1)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", theme.spoke)
          .attr("stroke-width", (p.deg % 90 === 0 ? 1.2 : 0.7))
          .attr("stroke-opacity", (p.deg % 90 === 0 ? 0.75 : 0.45));

        if (labelDensity !== "none" && !isTiny) {
          if (labelDensity === "cardinal" && (p.deg % 90 !== 0)) return;
          var labelOffset = p.deg % 90 === 0 ? 12 : 10;
          var lx = cx + (maxRadius + labelOffset) * Math.cos(rad);
          var ly = cy + (maxRadius + labelOffset) * Math.sin(rad);

          var anchor = "middle";
          var cosVal = Math.cos(rad);
          if (cosVal > 0.25) anchor = "start";
          else if (cosVal < -0.25) anchor = "end";

          var dy = "0.35em";
          var sinVal = Math.sin(rad);
          if (sinVal < -0.85) dy = "0.1em";
          else if (sinVal > 0.85) dy = "0.7em";

          spokesGroup.append("text")
            .attr("x", lx)
            .attr("y", ly)
            .attr("dy", dy)
            .attr("text-anchor", anchor)
            .attr("font-size", (p.deg % 90 === 0 ? "10px" : "8.5px"))
            .attr("font-weight", (p.deg % 90 === 0 ? "700" : "500"))
            .attr("fill", (p.deg % 90 === 0 ? theme.primary : theme.subtext))
            .text(p.label);
        }
      });

      // C. Optional Contiguous Market / Group Perimeter Arcs (when sites cluster cleanly by market)
      if (!angleField && groupDim && sites.length >= 6 && !isTiny) {
        var groupRuns = [];
        sites.forEach(function (s, idx) {
          if (!s.market) return;
          var last = groupRuns[groupRuns.length - 1];
          if (last && last.label === s.market && last.endIdx === idx - 1) {
            last.endIdx = idx;
          } else {
            groupRuns.push({ label: s.market, startIdx: idx, endIdx: idx });
          }
        });
        var distinctMarkets = {};
        groupRuns.forEach(function (g) { distinctMarkets[g.label] = (distinctMarkets[g.label] || 0) + 1; });
        var isCleanClusters = groupRuns.length >= 2 && groupRuns.length <= 8 && Object.keys(distinctMarkets).every(function (k) { return distinctMarkets[k] === 1; });

        if (isCleanClusters) {
          var marketArcG = rootZoomG.append("g").attr("class", "polar-market-arcs");
          var bandInR = maxRadius + 34;
          var bandOutR = maxRadius + 37;
          var stepDeg = 360 / totalSites;
          groupRuns.forEach(function (run, rIdx) {
            var startRad = (run.startIdx * stepDeg) * (Math.PI / 180) + 0.04;
            var endRad = ((run.endIdx + 1) * stepDeg) * (Math.PI / 180) - 0.04;
            if (endRad <= startRad) return;
            var arc = d3.arc()
              .innerRadius(bandInR)
              .outerRadius(bandOutR)
              .startAngle(startRad)
              .endAngle(endRad)
              .cornerRadius(2);
            marketArcG.append("path")
              .attr("transform", "translate(" + cx + "," + cy + ")")
              .attr("d", arc)
              .attr("fill", theme.primary)
              .attr("fill-opacity", 0.4 + (rIdx % 2) * 0.25);

            var midAngle = (startRad + endRad) / 2 - Math.PI / 2;
            var tx = cx + (bandOutR + 10) * Math.cos(midAngle);
            var ty = cy + (bandOutR + 10) * Math.sin(midAngle);
            var anchor = Math.cos(midAngle) > 0.2 ? "start" : (Math.cos(midAngle) < -0.2 ? "end" : "middle");
            marketArcG.append("text")
              .attr("x", tx)
              .attr("y", ty)
              .attr("dy", "0.32em")
              .attr("text-anchor", anchor)
              .attr("font-size", "9.5px")
              .attr("font-weight", "700")
              .attr("letter-spacing", "0.04em")
              .attr("fill", theme.subtext)
              .text(run.label.toUpperCase() + " (" + (run.endIdx - run.startIdx + 1) + ")");
          });
        }
      }

      // D. Visualization Paradigm Data Layer
      var dataGroup = rootZoomG.append("g").attr("class", "polar-data-layer");
      var tooltip = this._tooltip;
      var highlightColor = config.highlightColor || theme.primary;

      function getCompassDirection(deg) {
        var dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        var val = Math.round((deg / 22.5));
        return dirs[((val % 16) + 16) % 16];
      }

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
            "  <span style=\"font-weight:600;color:" + theme.text + ";\">" + escapeHtml(formatValue(d.target, fmt)) + "</span>" +
            "</div>" +
            "<div style=\"font-size:11.5px;margin-top:2px;display:flex;justify-content:space-between;color:" + theme.subtext + ";\">" +
            "  <span>Variance:</span>" +
            "  <span style=\"font-weight:700;color:" + compColor + ";\">" + escapeHtml(deltaStr) + "</span>" +
            "</div>" +
            "<div style=\"font-size:11px;font-weight:700;color:" + compColor + ";margin-top:4px;\">" + compLabel + "</div>";
        }

        var anomalyHtml = "";
        if (d.isAnomaly) {
          anomalyHtml = "<div style=\"margin-top:4px;padding:3px 7px;border-radius:4px;background:" + (isDark ? "#450a0a" : "#fef2f2") + ";border:1px solid " + (isDark ? "#991b1b" : "#fecaca") + ";color:" + (isDark ? "#fca5a5" : "#b91c1c") + ";font-size:10.5px;font-weight:700;\">&#9888; RF Anomaly: Exceeds " + escapeHtml(config.anomalyThresholdPct || 35) + "% variance</div>";
        }

        var metaParts = [];
        if (d.market) metaParts.push("Market: <strong>" + escapeHtml(d.market) + "</strong>");
        if (d.status) metaParts.push("Status: <strong>" + escapeHtml(d.status) + "</strong>");
        if (d.hardware) metaParts.push(escapeHtml(d.hardware));

        tooltip.innerHTML = "" +
          "<div style=\"font-size:12.5px;font-weight:700;color:" + theme.text + ";margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;\">" +
          "  <span>" + escapeHtml(d.site) + "</span>" +
          "  <span style=\"font-size:10px;padding:2px 6px;background:" + (isDark ? "#1e3a5f" : "#eff6ff") + ";color:" + (isDark ? "#7dd3fc" : "#1d4ed8") + ";border-radius:10px;font-weight:600;white-space:nowrap;\">" + escapeHtml(rankStr) + "</span>" +
          "</div>" +
          (metaParts.length ? "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-bottom:5px;\">" + metaParts.join(" &bull; ") + "</div>" : "") +
          "<div style=\"margin-top:4px;font-size:11.5px;color:" + theme.subtext + ";display:flex;justify-content:space-between;gap:10px;\">" +
          "  <span>" + escapeHtml(metricLabel) + ":</span>" +
          "  <span style=\"font-weight:700;color:" + theme.primary + ";font-size:12.5px;\">" + escapeHtml(valFormatted) + "</span>" +
          "</div>" +
          (secondaryMeas ? "<div style=\"font-size:11px;color:" + theme.subtext + ";display:flex;justify-content:space-between;gap:10px;margin-top:2px;\"><span>" + escapeHtml(secMetricLabel) + ":</span><span style=\"font-weight:600;color:" + theme.text + ";\">" + escapeHtml(secFormatted) + "</span></div>" : "") +
          "<div style=\"font-size:11px;color:" + theme.subtext + ";margin-top:3px;\">Sector Azimuth: <strong>" + escapeHtml(azimuthStr) + "</strong></div>" +
          targetHtml +
          anomalyHtml +
          (d.links && d.links.length > 0 ? "<div style=\"margin-top:6px;font-size:10.5px;color:" + theme.primary + ";font-weight:600;\">Click sector to drill down &rarr;</div>" : "");

        tooltip.style.backgroundColor = isDark ? "rgba(11, 27, 48, 0.96)" : "rgba(255, 255, 255, 0.98)";
        tooltip.style.border = "1px solid " + theme.border;
        tooltip.style.color = theme.text;
        tooltip.style.display = "block";
        tooltip.style.opacity = "1";
      }

      function moveTooltip(event) {
        if (!tooltip) return;
        var ttW = tooltip.offsetWidth || 240;
        var ttH = tooltip.offsetHeight || 140;
        var left = event.clientX + 14;
        var top = event.clientY - 15;
        if (left + ttW > window.innerWidth - 10) left = event.clientX - ttW - 14;
        if (top + ttH > window.innerHeight - 10) top = window.innerHeight - ttH - 10;
        if (top < 8) top = 8;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      }

      function hideTooltip() {
        if (tooltip) tooltip.style.display = "none";
      }

      if (polarMode === "omni_radar") {
        // Mode 1: Omni 360° Radar Sectors (Clean separated radiation wedges from central hub)
        var halfSectorRad = Math.min(Math.PI / 8, (Math.PI / Math.max(6, totalSites)) * 0.92);

        sites.forEach(function (d) {
          var r = radiusScale(d.value);
          var centerCompassRad = d.angle * (Math.PI / 180); // 0 = 12 o'clock in d3.arc
          var centerMathRad = (d.angle - 90) * (Math.PI / 180); // 0 = 12 o'clock in cos/sin
          var sectorColor = getSectorColor(d);

          var arcGen = d3.arc()
            .innerRadius(innerHubR + 2)
            .outerRadius(Math.max(innerHubR + 6, r))
            .startAngle(centerCompassRad - halfSectorRad)
            .endAngle(centerCompassRad + halfSectorRad)
            .padAngle(0.015)
            .cornerRadius(2.5);

          var lobe = dataGroup.append("path")
            .attr("class", "radar-lobe")
            .attr("data-site", d.site.toLowerCase())
            .attr("data-base-stroke", sectorColor)
            .attr("transform", "translate(" + cx + "," + cy + ")")
            .attr("d", arcGen)
            .attr("fill", sectorColor)
            .attr("fill-opacity", d.isCompliant ? (isDark ? 0.72 : 0.78) : 0.88)
            .attr("stroke", sectorColor)
            .attr("stroke-width", d.isCompliant ? 1.0 : 1.6)
            .style("cursor", "pointer");

          // Subtle perimeter node dot; emphasized ring on non-compliant/anomaly sites
          var tipX = cx + r * Math.cos(centerMathRad);
          var tipY = cy + r * Math.sin(centerMathRad);
          var pin = dataGroup.append("circle")
            .attr("cx", tipX)
            .attr("cy", tipY)
            .attr("r", d.isCompliant ? 2.6 : 4.2)
            .attr("fill", d.isCompliant ? theme.bg : sectorColor)
            .attr("stroke", d.isCompliant ? sectorColor : theme.bg)
            .attr("stroke-width", 1.5)
            .style("pointer-events", "none");

          lobe.on("mouseenter", function (event) {
            d3.select(this)
              .raise()
              .attr("fill-opacity", 0.96)
              .attr("stroke-width", 2.4)
              .attr("stroke", highlightColor);
            pin.raise().attr("r", 5.5).attr("stroke", highlightColor);
            showTooltip(event, d);
          });
          lobe.on("mousemove", moveTooltip);
          lobe.on("mouseleave", function () {
            d3.select(this)
              .attr("fill-opacity", d.isCompliant ? (isDark ? 0.72 : 0.78) : 0.88)
              .attr("stroke-width", d.isCompliant ? 1.0 : 1.6)
              .attr("stroke", sectorColor);
            pin.attr("r", d.isCompliant ? 2.6 : 4.2).attr("stroke", d.isCompliant ? sectorColor : theme.bg);
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
          var sectorColor = getSectorColor(d);

          dataGroup.append("line")
            .attr("x1", cx)
            .attr("y1", cy)
            .attr("x2", x)
            .attr("y2", y)
            .attr("stroke", sectorColor)
            .attr("stroke-width", 1.1)
            .attr("stroke-opacity", 0.45);

          var node = dataGroup.append("circle")
            .attr("class", "polar-scatter-node")
            .attr("data-site", d.site.toLowerCase())
            .attr("data-base-stroke", theme.bg)
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", d.isCompliant ? 5.5 : 7.0)
            .attr("fill", sectorColor)
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1.5)
            .style("cursor", "pointer");

          if (d.rank <= 3 || !d.isCompliant) {
            dataGroup.append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 10)
              .attr("fill", "none")
              .attr("stroke", d.isCompliant ? highlightColor : sectorColor)
              .attr("stroke-width", 1.3)
              .attr("stroke-dasharray", "3,2")
              .attr("opacity", 0.85)
              .style("pointer-events", "none");
          }

          node.on("mouseenter", function (event) {
            d3.select(this).raise().attr("r", 8.5).attr("stroke", highlightColor);
            showTooltip(event, d);
          });
          node.on("mousemove", moveTooltip);
          node.on("mouseleave", function () {
            d3.select(this).attr("r", d.isCompliant ? 5.5 : 7.0).attr("stroke", theme.bg);
            hideTooltip();
          });
          node.on("click", function (event) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
            }
          });
        });

      } else {
        // Mode 3: Azimuth Sector Heat Grid (12 compass sectors x 4 distance tiers)
        var numSectors = 12;
        var numTiers = 4;
        var bins = [];
        for (var s = 0; s < numSectors; s++) {
          for (var t = 0; t < numTiers; t++) {
            bins.push({ sector: s, tier: t, sites: [], sumVal: 0 });
          }
        }

        sites.forEach(function (d) {
          var secIdx = Math.floor((((d.angle % 360) + 360) % 360) / (360 / numSectors));
          var tierIdx = Math.min(numTiers - 1, Math.max(0, Math.floor((d.value / domainMax) * numTiers)));
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
          var aStart = (b.sector * (360 / numSectors)) * (Math.PI / 180);
          var aEnd = ((b.sector + 1) * (360 / numSectors)) * (Math.PI / 180);
          var rIn = innerHubR + (b.tier / numTiers) * (maxRadius - innerHubR);
          var rOut = innerHubR + ((b.tier + 1) / numTiers) * (maxRadius - innerHubR);

          var arcGen = d3.arc()
            .innerRadius(rIn + 1.5)
            .outerRadius(rOut - 1.5)
            .startAngle(aStart)
            .endAngle(aEnd)
            .padAngle(0.015)
            .cornerRadius(2);

          var avgBinMetric = b.sites.length > 0 ? b.sumVal / b.sites.length : 0;
          var fill = b.sites.length > 0 ? heatColorScale(avgBinMetric) : (isDark ? "#0b1b30" : "#f1f5f9");

          var tile = dataGroup.append("path")
            .attr("transform", "translate(" + cx + "," + cy + ")")
            .attr("d", arcGen)
            .attr("fill", fill)
            .attr("fill-opacity", b.sites.length > 0 ? 0.85 : 0.45)
            .attr("stroke", theme.bg)
            .attr("stroke-width", 1)
            .style("cursor", b.sites.length > 0 ? "pointer" : "default");

          if (b.sites.length > 0) {
            tile.on("mouseenter", function (event) {
              d3.select(this).raise().attr("stroke", highlightColor).attr("stroke-width", 2.0);
              showTooltip(event, b.sites[0]);
            });
            tile.on("mousemove", moveTooltip);
            tile.on("mouseleave", function () {
              d3.select(this).attr("stroke", theme.bg).attr("stroke-width", 1);
              hideTooltip();
            });
            tile.on("click", function (event) {
              var lead = b.sites[0];
              if (lead && lead.links && lead.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
                window.LookerCharts.Utils.openDrillMenu({ links: lead.links, event: event });
              }
            });
          }
        });
      }

      // E. Foreground Overlays Layer (ALWAYS above data lobes for 100% legibility)
      var overlayG = rootZoomG.append("g").attr("class", "polar-foreground-overlays").style("pointer-events", "none");

      // E1. Central Hub Circle (when innerHubR > 0)
      if (innerHubR >= 16) {
        overlayG.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", innerHubR)
          .attr("fill", theme.hubBg)
          .attr("stroke", theme.border)
          .attr("stroke-width", 1.4);

        overlayG.append("text")
          .attr("x", cx)
          .attr("y", cy - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", (innerHubR > 28 ? "13px" : "10.5px"))
          .attr("font-weight", "800")
          .attr("fill", theme.text)
          .text(totalSites + " SITES");

        if (targetVal !== null && config.showReferenceLine !== false) {
          overlayG.append("text")
            .attr("x", cx)
            .attr("y", cy + 10)
            .attr("text-anchor", "middle")
            .attr("font-size", (innerHubR > 28 ? "10px" : "8.5px"))
            .attr("font-weight", "700")
            .attr("fill", compliancePct >= 80 ? theme.positive : theme.negative)
            .text(compliancePct.toFixed(0) + "% SLA");
        }
      }

      // E2. Concentric Ring Tick Labels along a clean 15° NNE axis with halo
      if (!isTiny) {
        var tickRad = (15 - 90) * (Math.PI / 180);
        ringTicks.forEach(function (tickVal) {
          if (tickVal <= 0) return;
          var r = radiusScale(tickVal);
          if (r <= innerHubR + 8 || r > maxRadius - 4) return;
          var tx = cx + r * Math.cos(tickRad);
          var ty = cy + r * Math.sin(tickRad);
          overlayG.append("text")
            .attr("x", tx)
            .attr("y", ty)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("font-size", "9px")
            .attr("font-weight", "700")
            .attr("fill", theme.subtext)
            .style("paint-order", "stroke")
            .style("stroke", theme.bg)
            .style("stroke-width", "3.5px")
            .style("stroke-linejoin", "round")
            .text(formatValue(tickVal, fmt));
        });
      }

      // E3. Target SLA Reference Ring + High-Contrast Pill Badge
      if (targetVal !== null && config.showReferenceLine !== false) {
        var targetR = radiusScale(targetVal);
        if (targetR > innerHubR + 4 && targetR <= maxRadius + 2) {
          overlayG.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", targetR)
            .attr("fill", "none")
            .attr("stroke", theme.positive)
            .attr("stroke-width", 2.0)
            .attr("stroke-dasharray", "6,4");

          if (!isTiny) {
            var slaText = config.referenceLineLabel || ("SLA: " + formatValue(targetVal, fmt));
            var badgeW = Math.min(180, slaText.length * 5.8 + 16);
            var bx = cx - badgeW / 2;
            var by = cy + targetR - 10;
            overlayG.append("rect")
              .attr("x", bx)
              .attr("y", by)
              .attr("width", badgeW)
              .attr("height", 18)
              .attr("rx", 9)
              .attr("fill", isDark ? "#052e16" : "#ecfdf5")
              .attr("stroke", theme.positive)
              .attr("stroke-width", 1.0);

            overlayG.append("text")
              .attr("x", cx)
              .attr("y", by + 12.5)
              .attr("text-anchor", "middle")
              .attr("font-size", "9.5px")
              .attr("font-weight", "700")
              .attr("fill", theme.positive)
              .text(slaText);
          }
        }
      }

      // E4. Callout Annotations for Non-Compliant / Anomaly Sites (non-overlapping)
      if (labelDensity === "all" && !isTiny && polarMode !== "azimuth_heatmap") {
        var callouts = sites.filter(function (d) { return !d.isCompliant; }).slice(0, 12);
        var placedBoxes = [];
        callouts.forEach(function (d, cIdx) {
          var r = radiusScale(d.value);
          var rad = (d.angle - 90) * (Math.PI / 180);
          var dotX = cx + r * Math.cos(rad);
          var dotY = cy + r * Math.sin(rad);
          var stagger = (cIdx % 2 === 0) ? 24 : 42;
          var lblR = Math.max(innerHubR + 28, Math.min(maxRadius - 22, r + stagger));
          var lx = cx + lblR * Math.cos(rad);
          var ly = cy + lblR * Math.sin(rad);
          var anchor = Math.cos(rad) >= 0 ? "start" : "end";
          var txt = shortSiteLabel(d.site, 18) + " (" + formatValue(d.value, fmt) + ")";
          var estW = txt.length * 5.2;
          var boxX = anchor === "start" ? lx : lx - estW;
          var boxY = ly - 7;
          var overlaps = placedBoxes.some(function (b) {
            return !(boxX + estW < b.x - 4 || boxX > b.x + b.w + 4 || boxY + 14 < b.y - 2 || boxY > b.y + b.h + 2);
          });
          if (overlaps) return;
          placedBoxes.push({ x: boxX, y: boxY, w: estW, h: 14 });

          overlayG.append("line")
            .attr("x1", dotX)
            .attr("y1", dotY)
            .attr("x2", lx)
            .attr("y2", ly)
            .attr("stroke", theme.negative)
            .attr("stroke-width", 1.1)
            .attr("stroke-opacity", 0.8);

          overlayG.append("text")
            .attr("x", lx + (anchor === "start" ? 3 : -3))
            .attr("y", ly)
            .attr("dy", "0.32em")
            .attr("text-anchor", anchor)
            .attr("font-size", "9.5px")
            .attr("font-weight", "700")
            .attr("fill", theme.negative)
            .style("paint-order", "stroke")
            .style("stroke", theme.bg)
            .style("stroke-width", "4.5px")
            .style("stroke-linejoin", "round")
            .text(txt);
        });
      }

      // F. Optional Animated 360° Radar Sweep Line (Disabled by default for crisp static/render quality)
      if (config.beamSweepAnimation === true && polarMode === "omni_radar") {
        var sweepG = rootZoomG.append("g").attr("class", "radar-sweep").style("pointer-events", "none");
        sweepG.append("line")
          .attr("x1", cx)
          .attr("y1", cy)
          .attr("x2", cx + maxRadius)
          .attr("y2", cy)
          .attr("stroke", theme.primary)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.6);

        var sweepArc = d3.arc()
          .innerRadius(innerHubR)
          .outerRadius(maxRadius)
          .startAngle(0)
          .endAngle(Math.PI / 6);

        sweepG.append("path")
          .attr("transform", "translate(" + cx + "," + cy + ")")
          .attr("d", sweepArc)
          .attr("fill", theme.radarSweep);

        var sweepAngle = 0;
        function animateSweep() {
          if (!document.hidden) {
            sweepAngle = (sweepAngle + 1.0) % 360;
            sweepG.attr("transform", "rotate(" + sweepAngle + " " + cx + " " + cy + ")");
          }
          self._sweepFrame = requestAnimationFrame(animateSweep);
        }
        self._sweepFrame = requestAnimationFrame(animateSweep);
      }

      // G. Compact Legend (Bottom-Left, hidden on tiny tiles)
      if (config.showLegend !== false && !isTiny) {
        var legendWrapper = document.createElement("div");
        legendWrapper.className = "looker-polar-legend";
        legendWrapper.style.position = "absolute";
        legendWrapper.style.bottom = "10px";
        legendWrapper.style.left = "12px";
        legendWrapper.style.zIndex = "10";
        legendWrapper.style.display = "flex";
        legendWrapper.style.flexDirection = "column";
        legendWrapper.style.gap = "4px";
        legendWrapper.style.background = isDark ? "rgba(11, 27, 48, 0.9)" : "rgba(255, 255, 255, 0.94)";
        legendWrapper.style.border = "1px solid " + theme.border;
        legendWrapper.style.borderRadius = "7px";
        legendWrapper.style.padding = "7px 10px";
        legendWrapper.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.08)";

        var legTitle = document.createElement("div");
        legTitle.style.fontSize = "10px";
        legTitle.style.fontWeight = "700";
        legTitle.style.color = theme.text;
        legTitle.textContent = colorBy === "secondary_ramp" && secondaryMeas
          ? secMetricLabel
          : metricLabel;
        legendWrapper.appendChild(legTitle);

        var legBar = document.createElement("div");
        legBar.style.display = "flex";
        legBar.style.width = "140px";
        legBar.style.height = "7px";
        legBar.style.borderRadius = "4px";
        legBar.style.overflow = "hidden";
        var rampStops = (colorBy === "secondary_ramp" && secondaryMeas)
          ? [theme.positive, theme.warning, theme.negative]
          : theme.range;
        rampStops.forEach(function (c) {
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
        var minLbl = (colorBy === "secondary_ramp" && secondaryMeas) ? formatValue(secExtent[0], "decimal_2") : formatValue(colorMin, fmt);
        var maxLbl = (colorBy === "secondary_ramp" && secondaryMeas) ? formatValue(secExtent[1], "decimal_2") : formatValue(radiusScale.domain()[1], fmt);
        legLabels.innerHTML = "<span>" + escapeHtml(minLbl) + "</span><span>" + escapeHtml(maxLbl) + "</span>";
        legendWrapper.appendChild(legLabels);

        if (colorBy === "sla_status" && targetVal !== null) {
          var statusRow = document.createElement("div");
          statusRow.style.display = "flex";
          statusRow.style.alignItems = "center";
          statusRow.style.gap = "8px";
          statusRow.style.marginTop = "2px";
          statusRow.style.fontSize = "9.5px";
          statusRow.style.color = theme.subtext;
          statusRow.innerHTML =
            "<span style=\"display:inline-flex;align-items:center;gap:3px;\"><span style=\"width:7px;height:7px;border-radius:50%;background:" + theme.warning + ";display:inline-block;\"></span>Below SLA</span>" +
            "<span style=\"display:inline-flex;align-items:center;gap:3px;\"><span style=\"width:7px;height:7px;border-radius:50%;background:" + theme.negative + ";display:inline-block;\"></span>Anomaly</span>";
          legendWrapper.appendChild(statusRow);
        }

        polarWrapper.appendChild(legendWrapper);
      }

      this._highlightSearch = function () {
        var query = self._searchTerm;
        dataGroup.selectAll(".radar-lobe, .polar-scatter-node").each(function () {
          var el = d3.select(this);
          var siteName = el.attr("data-site") || "";
          var baseStroke = el.attr("data-base-stroke") || theme.primary;
          var match = !query || siteName.indexOf(query) !== -1;
          el.attr("opacity", match ? 1.0 : 0.15)
            .attr("stroke-width", match && query ? 2.4 : 1.2)
            .attr("stroke", match && query ? highlightColor : baseStroke);
        });
      };
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
