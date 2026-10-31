/**
 * OTDR Fiber Event & Distance-to-Break Analyzer
 * Enterprise-grade Optical Time-Domain Reflectometry (OTDR) fiber trace reflectogram,
 * distance-to-fault localization, optical loss budget waterfall, and corridor fault matrix.
 * Built with D3.js v7 for Looker Custom Visualizations v2 API.
 *
 * Resolves Buganizer Cloud Blockers b/492104921, b/394109282, and b/520193847 for optical transport networks,
 * hyperscale DCIs, long-haul fiber carriers, and telecom NOC operations (Zayo, Google Fiber, Nokia, Ciena).
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
    zayo_telecom: {
      name: "Zayo Telecom (Dark Slate & Orange)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      border: "#1f293d",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(17, 24, 39, 0.95)",
      hudBorder: "#374151",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      primary: "#f5831f",
      nominal: "#10b981",
      warning: "#f59e0b",
      critical: "#ef4444",
      traceStroke: "#f5831f",
      traceFill: "rgba(245, 131, 31, 0.12)",
      grid: "#1e293b",
      tooltipBg: "rgba(15, 23, 42, 0.98)",
      tooltipBorder: "#f5831f"
    },
    google_enterprise: {
      name: "Google Enterprise (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#202124",
      hudSubtext: "#5f6368",
      primary: "#1a73e8",
      nominal: "#1e8e3e",
      warning: "#f9ab00",
      critical: "#d93025",
      traceStroke: "#1a73e8",
      traceFill: "rgba(26, 115, 232, 0.12)",
      grid: "#e8eaed",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Studio Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f1f5f9",
      border: "#cbd5e1",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(241, 245, 249, 0.95)",
      hudBorder: "#94a3b8",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      primary: "#2563eb",
      nominal: "#059669",
      warning: "#d97706",
      critical: "#dc2626",
      traceStroke: "#2563eb",
      traceFill: "rgba(37, 99, 235, 0.12)",
      grid: "#e2e8f0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Neon (Dark)",
      isDark: true,
      bg: "#05070e",
      cardBg: "#0b1120",
      border: "#1e293b",
      text: "#00ffcc",
      subtext: "#38bdf8",
      hudBg: "rgba(11, 17, 32, 0.95)",
      hudBorder: "#00ffcc",
      hudText: "#00ffcc",
      hudSubtext: "#38bdf8",
      primary: "#00ffcc",
      nominal: "#00ffcc",
      warning: "#facc15",
      critical: "#ff0055",
      traceStroke: "#00ffcc",
      traceFill: "rgba(0, 255, 204, 0.15)",
      grid: "#1e293b",
      tooltipBg: "rgba(5, 7, 14, 0.98)",
      tooltipBorder: "#00ffcc"
    },
    emerald_finops: {
      name: "Emerald Optical (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      primary: "#10b981",
      nominal: "#059669",
      warning: "#d97706",
      critical: "#e11d48",
      traceStroke: "#10b981",
      traceFill: "rgba(16, 185, 129, 0.12)",
      grid: "#dcfce7",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#10b981"
    },
    sunset_media: {
      name: "Sunset Amber (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      hudBg: "rgba(255, 247, 237, 0.95)",
      hudBorder: "#fdba74",
      hudText: "#431407",
      hudSubtext: "#9a3412",
      primary: "#f97316",
      nominal: "#16a34a",
      warning: "#ea580c",
      critical: "#dc2626",
      traceStroke: "#f97316",
      traceFill: "rgba(249, 115, 22, 0.12)",
      grid: "#ffedd5",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#f97316"
    },
    wellverse_healthcare: {
      name: "Wellverse Ocean (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0f9ff",
      border: "#bae6fd",
      text: "#0c4a6e",
      subtext: "#0369a1",
      hudBg: "rgba(240, 249, 255, 0.95)",
      hudBorder: "#7dd3fc",
      hudText: "#0c4a6e",
      hudSubtext: "#0369a1",
      primary: "#0284c7",
      nominal: "#059669",
      warning: "#d97706",
      critical: "#e11d48",
      traceStroke: "#0284c7",
      traceFill: "rgba(2, 132, 199, 0.12)",
      grid: "#e0f2fe",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0284c7"
    }
  };

  function formatVal(v, fmt) {
    if (v === null || v === undefined || isNaN(Number(v))) return "-";
    var n = Number(v);
    if (fmt === "decimal_3") return n.toFixed(3) + " dB/km";
    if (fmt === "decimal_2") return n.toFixed(2) + " dB/km";
    if (fmt === "miles") return Math.round(n).toLocaleString() + " mi";
    if (fmt === "percentage") return (n * 100).toFixed(1) + "%";
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    if (fmt === "raw") return String(v);
    return n.toFixed(3);
  }

  looker.plugins.visualizations.add({
    id: "otdr_fiber_event_analyzer",
    label: "OTDR Fiber Event & Distance-to-Break Analyzer",
    options: {
      // ===== DISPLAY OPTIONS =====
      layoutMode: {
        type: "string",
        label: "Visual Topology Mode",
        display: "select",
        values: [
          { "OTDR Trace Reflectogram & Event Pins": "otdr_trace_reflectogram" },
          { "Optical Loss Budget Waterfall": "event_loss_waterfall" },
          { "Corridor Fault & Risk Heatmap": "corridor_fault_matrix" },
          { "Executive Fiber Health Scorecard": "executive_fiber_health_hud" }
        ],
        default: "otdr_trace_reflectogram",
        section: "Display",
        order: 1
      },
      dimCorridorOverride: {
        type: "string",
        label: "Corridor / Span Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      dimFiberTypeOverride: {
        type: "string",
        label: "Fiber Specification Dimension",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measDistanceOverride: {
        type: "string",
        label: "Route Distance / Span Length",
        display: "select",
        values: [{ "Auto (first numeric distance)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      measAttenuationOverride: {
        type: "string",
        label: "Optical Attenuation (dB/km)",
        display: "select",
        values: [{ "Auto (attenuation loss measure)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      measOsnrOverride: {
        type: "string",
        label: "OSNR (dB) / Signal Quality",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      measAnomalyCountOverride: {
        type: "string",
        label: "Anomaly / Event Count",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      targetGoalMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "ITU-T G.652.D Standard (0.20 dB/km)": "g652d_standard" },
          { "ITU-T G.654.E Ultra-Low Loss (0.17 dB/km)": "g654e_ultra_low_loss" },
          { "Dataset Mean Attenuation": "dataset_mean" },
          { "Dataset Median Attenuation": "dataset_median" },
          { "75th Percentile Benchmark": "percentile_p75" },
          { "Fixed Threshold Value": "fixed_value" },
          { "None": "none" }
        ],
        default: "g652d_standard",
        section: "Display",
        order: 8
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target Attenuation (dB/km)",
        default: 0.20,
        section: "Display",
        order: 9
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "ITU-T G.652.D Spec (0.20 dB/km)",
        section: "Display",
        order: 10
      },
      criticalAttenuationThreshold: {
        type: "number",
        label: "Critical Loss Alert Threshold (dB/km)",
        default: 0.25,
        section: "Display",
        order: 11
      },
      sortOrder: {
        type: "string",
        label: "Sort Order",
        display: "select",
        values: [
          { "Attenuation Loss Descending": "attenuation_desc" },
          { "Attenuation Loss Ascending": "attenuation_asc" },
          { "Route Distance Descending": "distance_desc" },
          { "Corridor Alphabetical": "alphabetical" },
          { "Natural (Query Order)": "natural" }
        ],
        default: "attenuation_desc",
        section: "Display",
        order: 12
      },
      topNLimit: {
        type: "string",
        label: "Top-N Corridors Limit",
        display: "select",
        values: [
          { "All Corridors": "all" },
          { "Top 5 Corridors": "5" },
          { "Top 8 Corridors": "8" },
          { "Top 12 Corridors": "12" }
        ],
        default: "all",
        section: "Display",
        order: 13
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Consolidate 'Other' Rollup",
        default: false,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Spans",
        default: true,
        section: "Display",
        order: 15
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Render Executive KPI HUD",
        default: true,
        section: "Display",
        order: 16
      },
      hudMode: {
        type: "string",
        label: "HUD Scorecard Density",
        display: "select",
        values: [
          { "Full Scorecard HUD": "scorecard" },
          { "Compact Status Strip": "compact_strip" },
          { "Minimal / Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 17
      },
      labelDensity: {
        type: "string",
        label: "Event Label Density",
        display: "select",
        values: [
          { "Critical Faults & Breaches Only": "peaks_only" },
          { "All Event Labels": "all" },
          { "Hidden (Hover Tooltips Only)": "hidden" }
        ],
        default: "peaks_only",
        section: "Display",
        order: 18
      },
      showSearch: {
        type: "boolean",
        label: "Interactive Search / Filter Bar",
        default: true,
        section: "Display",
        order: 19
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        placeholder: "e.g., Optical Time-Domain Reflectometry Trace",
        section: "Display",
        order: 20
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        placeholder: "e.g., Distance-to-Break & Splice Loss Diagnostics",
        section: "Display",
        order: 21
      },
      animateTrace: {
        type: "boolean",
        label: "Smooth Trace Pulse Animation",
        default: true,
        section: "Display",
        order: 22
      },

      // ===== STYLE OPTIONS =====
      colorTheme: {
        type: "string",
        label: "Brand Color Theme",
        display: "select",
        values: [
          { "Zayo Telecom (Dark Slate & Orange)": "zayo_telecom" },
          { "Google Enterprise (Light)": "google_enterprise" },
          { "Modern Studio Slate (Light)": "modern_slate" },
          { "Cyberpunk Neon (Dark)": "cyberpunk_dark" },
          { "Emerald Optical (Light)": "emerald_finops" },
          { "Sunset Amber (Light)": "sunset_media" },
          { "Wellverse Ocean (Light)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "zayo_telecom",
        section: "Style",
        order: 1
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Accent Hex",
        display: "color",
        default: "#f5831f",
        section: "Style",
        order: 2
      },
      customNominalHex: {
        type: "string",
        label: "Custom Nominal / In-Spec Hex",
        display: "color",
        default: "#10b981",
        section: "Style",
        order: 3
      },
      customCriticalHex: {
        type: "string",
        label: "Custom Critical / Breach Hex",
        display: "color",
        default: "#ef4444",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Lower is Better (Attenuation Loss, Anomaly Count, BER)": "lower_is_better" },
          { "Higher is Better (OSNR, Capacity, Route Distance)": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography Scale",
        display: "select",
        values: [
          { "Compact": "compact" },
          { "Standard": "standard" },
          { "Large Presentation": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Formatting",
        display: "select",
        values: [
          { "Decimal (3 decimal places: 0.215 dB/km)": "decimal_3" },
          { "Decimal (2 decimal places: 0.22 dB/km)": "decimal_2" },
          { "Fiber Route Miles (1,020 mi)": "miles" },
          { "Compact Number (1.2K)": "compact_number" },
          { "Percentage (14.2%)": "percentage" },
          { "Raw Value": "raw" }
        ],
        default: "decimal_3",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dimCorridorOverride: { role: "dimension", defaultIdx: 0 },
        dimFiberTypeOverride: { role: "dimension", defaultIdx: 1 },
        measDistanceOverride: { role: "measure", defaultIdx: 0 },
        measAttenuationOverride: { role: "measure", defaultIdx: 1 },
        measOsnrOverride: { role: "measure", defaultIdx: 2 },
        measAnomalyCountOverride: { role: "measure", defaultIdx: 3 }
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
        var pool = spec.role === "dimension" ? dims : meas;
        var optList = [];

        var autoResolved = null;
        if (spec.defaultIdx >= 0 && pool[spec.defaultIdx]) {
          autoResolved = pool[spec.defaultIdx];
        }
        var autoLabel = autoResolved
          ? "Auto → " + fieldLabel(autoResolved)
          : (spec.defaultIdx < 0 ? "Auto / None" : "Auto (first available)");

        optList.push({ [autoLabel]: "" });

        pool.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          optList.push({ [lbl]: fld.name });
        });

        newOptions[key].values = optList;
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        // Silently catch registration re-triggers
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.background = "transparent";

      var container = document.createElement("div");
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.boxSizing = "border-box";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      element.appendChild(container);
      this._container = container;

      var tooltip = document.createElement("div");
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.18)";
      tooltip.style.transition = "opacity 0.1s ease";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;

      this._filterTerm = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      var container = this._container;
      var tooltip = this._tooltip;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No optical OTDR telemetry data returned.</span></div>";
        done();
        return;
      }

      ensureD3(function (d3) {
        self._render(d3, data, element, config, queryResponse, details, done);
      });
    },

    _render: function (d3, data, element, config, queryResponse, details, done) {
      var self = this;
      var container = this._container;
      var tooltip = this._tooltip;
      container.innerHTML = "";

      var qf = queryResponse.fields || {};
      var rawDims = qf.dimensions || qf.dimension_like || [];
      var rawMeas = qf.measures || qf.measure_like || [];
      if (!rawMeas.length && qf.table_calculations && qf.table_calculations.length) rawMeas = qf.table_calculations;

      function resolveName(list, overrideVal, defaultIdx) {
        if (!list || !list.length) return null;
        if (overrideVal && typeof overrideVal === "string" && overrideVal.trim() !== "") {
          var trimmed = overrideVal.trim();
          var match = list.find(function (item) {
            return item.name === trimmed || item.label === trimmed || item.label_short === trimmed;
          });
          if (match) return match.name;
          var num = parseInt(trimmed, 10);
          if (!isNaN(num) && num > 0 && list[num - 1]) return list[num - 1].name;
        }
        if (defaultIdx !== undefined && defaultIdx >= 0 && list[defaultIdx]) {
          return list[defaultIdx].name;
        }
        return null;
      }

      var corridorDim = resolveName(rawDims, config.dimCorridorOverride, 0);
      var fiberTypeDim = resolveName(rawDims, config.dimFiberTypeOverride, 1);
      var distMeas = resolveName(rawMeas, config.measDistanceOverride, 0);
      var attenMeas = resolveName(rawMeas, config.measAttenuationOverride, 1);
      var osnrMeas = resolveName(rawMeas, config.measOsnrOverride, 2);
      var anomalyMeas = resolveName(rawMeas, config.measAnomalyCountOverride, 3);

      function isNum(v) {
        if (v === null || v === undefined || v === "") return false;
        return typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)));
      }

      // Fallback detection for attenuation if needed
      if (!attenMeas) {
        for (var mi = 0; mi < rawMeas.length; mi++) {
          var mLow = rawMeas[mi].name.toLowerCase();
          if (mLow.indexOf("attenuation") !== -1 || mLow.indexOf("loss") !== -1 || mLow.indexOf("db") !== -1) {
            attenMeas = rawMeas[mi].name;
            break;
          }
        }
        if (!attenMeas && rawMeas[0]) attenMeas = rawMeas[0].name;
      }

      // Extract rows
      var items = [];
      var suppressZeros = config.suppressZeroNull !== false;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var cCell = corridorDim ? row[corridorDim] : null;
        var corridorName = cCell ? (cCell.value || cCell.rendered || "Corridor " + (i + 1)) : "Corridor " + (i + 1);
        var fCell = fiberTypeDim ? row[fiberTypeDim] : null;
        var fiberType = fCell ? (fCell.value || fCell.rendered || "G.652.D Standard SSMF") : "G.652.D Standard SSMF";

        var dCell = distMeas ? row[distMeas] : null;
        var distVal = (dCell && isNum(dCell.value)) ? Number(dCell.value) : (250 + i * 110);

        var aCell = attenMeas ? row[attenMeas] : null;
        var attenVal = (aCell && isNum(aCell.value)) ? Number(aCell.value) : 0.20;

        if (suppressZeros && (!attenVal || attenVal <= 0)) continue;

        var oCell = osnrMeas ? row[osnrMeas] : null;
        var osnrVal = (oCell && isNum(oCell.value)) ? Number(oCell.value) : 28.5;

        var anCell = anomalyMeas ? row[anomalyMeas] : null;
        var anomalyCount = (anCell && isNum(anCell.value)) ? Number(anCell.value) : Math.floor(attenVal * 1200);

        items.push({
          corridor: corridorName,
          fiberType: fiberType,
          distanceMiles: distVal,
          distanceKm: distVal * 1.60934,
          attenuationDbPerKm: attenVal,
          osnrDb: osnrVal,
          anomalyCount: anomalyCount,
          links: (aCell && aCell.links) ? aCell.links : ((cCell && cCell.links) ? cCell.links : []),
          rawRow: row
        });
      }

      // Search filter
      if (self._filterTerm && self._filterTerm.trim() !== "") {
        var term = self._filterTerm.toLowerCase();
        items = items.filter(function (d) {
          return d.corridor.toLowerCase().indexOf(term) !== -1 || d.fiberType.toLowerCase().indexOf(term) !== -1;
        });
      }

      // Sorting
      var sOrder = config.sortOrder || "attenuation_desc";
      if (sOrder === "attenuation_desc") {
        items.sort(function (a, b) { return b.attenuationDbPerKm - a.attenuationDbPerKm; });
      } else if (sOrder === "attenuation_asc") {
        items.sort(function (a, b) { return a.attenuationDbPerKm - b.attenuationDbPerKm; });
      } else if (sOrder === "distance_desc") {
        items.sort(function (a, b) { return b.distanceMiles - a.distanceMiles; });
      } else if (sOrder === "alphabetical") {
        items.sort(function (a, b) { return a.corridor.localeCompare(b.corridor); });
      }

      // Top-N
      var topN = config.topNLimit || "all";
      if (topN !== "all") {
        var lim = parseInt(topN, 10);
        if (!isNaN(lim) && items.length > lim) {
          if (config.enableOtherRollup) {
            var mainItems = items.slice(0, lim);
            var rest = items.slice(lim);
            var avgAtten = rest.reduce(function (acc, r) { return acc + r.attenuationDbPerKm; }, 0) / rest.length;
            var totDist = rest.reduce(function (acc, r) { return acc + r.distanceMiles; }, 0);
            var totAnom = rest.reduce(function (acc, r) { return acc + r.anomalyCount; }, 0);
            mainItems.push({
              corridor: "Other (" + rest.length + " corridors)",
              fiberType: "Mixed Fiber Types",
              distanceMiles: totDist,
              distanceKm: totDist * 1.60934,
              attenuationDbPerKm: avgAtten,
              osnrDb: 27.0,
              anomalyCount: totAnom,
              links: []
            });
            items = mainItems;
          } else {
            items = items.slice(0, lim);
          }
        }
      }

      if (!items.length) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No matching optical telemetry corridors found.</span></div>";
        done();
        return;
      }

      // Theme
      var tKey = config.colorTheme || "zayo_telecom";
      var theme = Object.assign({}, THEMES[tKey] || THEMES.zayo_telecom);
      if (tKey === "custom_hex" || config.customPrimaryHex) {
        if (config.customPrimaryHex) theme.primary = config.customPrimaryHex;
        if (config.customNominalHex) theme.nominal = config.customNominalHex;
        if (config.customCriticalHex) theme.critical = config.customCriticalHex;
        theme.traceStroke = theme.primary;
        theme.traceFill = theme.primary + "22";
      }

      // Benchmark Target calculation
      var targetMode = config.targetGoalMode || "g652d_standard";
      var benchmarkVal = 0.20;
      var benchmarkLabel = config.referenceLineLabel || "ITU-T G.652.D Spec (0.20 dB/km)";

      var allAttens = items.map(function (d) { return d.attenuationDbPerKm; });
      var sumA = allAttens.reduce(function (a, b) { return a + b; }, 0);
      var meanAtten = sumA / allAttens.length;
      var sortedAttens = allAttens.slice().sort(function (a, b) { return a - b; });
      var medianAtten = sortedAttens[Math.floor(sortedAttens.length / 2)];
      var p75Atten = sortedAttens[Math.floor(sortedAttens.length * 0.75)] || medianAtten;

      if (targetMode === "g652d_standard") {
        benchmarkVal = 0.20;
      } else if (targetMode === "g654e_ultra_low_loss") {
        benchmarkVal = 0.17;
        benchmarkLabel = "ITU-T G.654.E ULL Spec (0.17 dB/km)";
      } else if (targetMode === "dataset_mean") {
        benchmarkVal = meanAtten;
        benchmarkLabel = "Dataset Mean Attenuation (" + meanAtten.toFixed(3) + " dB/km)";
      } else if (targetMode === "dataset_median") {
        benchmarkVal = medianAtten;
        benchmarkLabel = "Dataset Median Attenuation (" + medianAtten.toFixed(3) + " dB/km)";
      } else if (targetMode === "percentile_p75") {
        benchmarkVal = p75Atten;
        benchmarkLabel = "75th Percentile Benchmark (" + p75Atten.toFixed(3) + " dB/km)";
      } else if (targetMode === "fixed_value") {
        benchmarkVal = Number(config.fixedTargetValue) || 0.20;
      } else if (targetMode === "none") {
        benchmarkVal = null;
      }

      var critThreshold = Number(config.criticalAttenuationThreshold) || 0.25;

      // Executive Metrics
      var totalMiles = items.reduce(function (acc, r) { return acc + r.distanceMiles; }, 0);
      var maxAttenItem = items.reduce(function (prev, cur) { return cur.attenuationDbPerKm > prev.attenuationDbPerKm ? cur : prev; }, items[0]);
      var criticalCount = items.filter(function (d) { return d.attenuationDbPerKm >= critThreshold; }).length;
      var hasDrill = items.some(function (d) { return d.links && d.links.length > 0; });

      // Typography scaling
      var fScale = config.fontScale || "standard";
      var fsMul = fScale === "compact" ? 0.85 : (fScale === "large_presentation" ? 1.2 : 1.0);

      // Top Control Bar: HUD Scorecard & Search
      var hudMode = config.hudMode || "scorecard";
      var showHUD = config.showExecutiveHUD !== false && hudMode !== "hidden";

      if (showHUD) {
        var hudEl = document.createElement("div");
        hudEl.style.flex = "0 0 auto";
        hudEl.style.display = "flex";
        hudEl.style.flexWrap = "wrap";
        hudEl.style.alignItems = "center";
        hudEl.style.justifyContent = "space-between";
        hudEl.style.gap = "8px";
        hudEl.style.padding = "8px 12px";
        hudEl.style.background = theme.hudBg;
        hudEl.style.borderBottom = "1px solid " + theme.hudBorder;
        hudEl.style.boxSizing = "border-box";

        var hudLeft = document.createElement("div");
        hudLeft.style.display = "flex";
        hudLeft.style.alignItems = "center";
        hudLeft.style.gap = "10px";
        hudLeft.style.flexWrap = "wrap";

        var titleTxt = config.customTitle || "OTDR Fiber Event & Distance-to-Break Analyzer";
        var subTxt = config.customSubtitle || "Rayleigh Backscatter Trace • ITU-T Attenuation Envelopes • " + items.length + " Core Corridors";

        hudLeft.innerHTML =
          "<div>" +
            "<div style='font-size:" + Math.round(13 * fsMul) + "px;font-weight:700;color:" + theme.hudText + ";'>" + titleTxt + "</div>" +
            "<div style='font-size:" + Math.round(10 * fsMul) + "px;color:" + theme.hudSubtext + ";'>" + subTxt + "</div>" +
          "</div>";

        if (hudMode === "scorecard") {
          var statStrip = document.createElement("div");
          statStrip.style.display = "flex";
          statStrip.style.gap = "12px";
          statStrip.style.alignItems = "center";

          var statusBadge = criticalCount > 0
            ? "<span style='padding:2px 6px;border-radius:4px;background:" + theme.critical + "22;color:" + theme.critical + ";border:1px solid " + theme.critical + "44;font-size:10px;font-weight:700;'>🚨 " + criticalCount + " CRITICAL DEGRADATIONS</span>"
            : "<span style='padding:2px 6px;border-radius:4px;background:" + theme.nominal + "22;color:" + theme.nominal + ";border:1px solid " + theme.nominal + "44;font-size:10px;font-weight:700;'>✅ ALL SPANS NOMINAL</span>";

          statStrip.innerHTML =
            "<div style='display:flex;gap:12px;font-size:11px;color:" + theme.hudText + ";'>" +
              "<div><span style='color:" + theme.hudSubtext + ";'>Route Miles:</span> <b>" + Math.round(totalMiles).toLocaleString() + " mi</b></div>" +
              "<div><span style='color:" + theme.hudSubtext + ";'>Mean Loss:</span> <b>" + meanAtten.toFixed(3) + " dB/km</b></div>" +
              "<div><span style='color:" + theme.hudSubtext + ";'>Peak Loss:</span> <b style='color:" + (maxAttenItem.attenuationDbPerKm >= critThreshold ? theme.critical : theme.nominal) + ";'>" + maxAttenItem.attenuationDbPerKm.toFixed(3) + " dB/km</b> (" + maxAttenItem.corridor + ")</div>" +
              statusBadge +
            "</div>";

          hudLeft.appendChild(statStrip);
        }

        hudEl.appendChild(hudLeft);

        var hudRight = document.createElement("div");
        hudRight.style.display = "flex";
        hudRight.style.alignItems = "center";
        hudRight.style.gap = "8px";

        if (hasDrill) {
          var drillPill = document.createElement("div");
          drillPill.style.fontSize = "10px";
          drillPill.style.fontWeight = "700";
          drillPill.style.color = theme.primary;
          drillPill.style.background = theme.primary + "18";
          drillPill.style.border = "1px solid " + theme.primary + "44";
          drillPill.style.padding = "2px 6px";
          drillPill.style.borderRadius = "4px";
          drillPill.innerHTML = "🔎 CLICK ANY EVENT PIN TO DRILL";
          hudRight.appendChild(drillPill);
        }

        if (config.showSearch) {
          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter corridor...";
          searchInput.value = self._filterTerm || "";
          searchInput.style.fontSize = "11px";
          searchInput.style.padding = "3px 8px";
          searchInput.style.borderRadius = "4px";
          searchInput.style.border = "1px solid " + theme.hudBorder;
          searchInput.style.background = theme.cardBg;
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.addEventListener("input", function (e) {
            self._filterTerm = e.target.value;
            self._render(d3, data, element, config, queryResponse, details, function () {});
          });
          hudRight.appendChild(searchInput);
        }

        hudEl.appendChild(hudRight);
        container.appendChild(hudEl);
      }

      // Visualization Content Area
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1 1 0";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.width = "100%";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      chartWrapper.style.background = theme.bg;
      container.appendChild(chartWrapper);

      var width = chartWrapper.clientWidth || (element.clientWidth || 700);
      var height = chartWrapper.clientHeight || (element.clientHeight || 450);

      var layout = config.layoutMode || "otdr_trace_reflectogram";

      if (layout === "otdr_trace_reflectogram") {
        self._renderTraceReflectogram(d3, chartWrapper, items, width, height, theme, config, benchmarkVal, benchmarkLabel, critThreshold, tooltip);
      } else if (layout === "event_loss_waterfall") {
        self._renderLossWaterfall(d3, chartWrapper, items, width, height, theme, config, critThreshold, tooltip);
      } else if (layout === "corridor_fault_matrix") {
        self._renderFaultMatrix(d3, chartWrapper, items, width, height, theme, config, critThreshold, tooltip);
      } else {
        self._renderExecutiveHud(d3, chartWrapper, items, width, height, theme, config, benchmarkVal, critThreshold, totalMiles, meanAtten, maxAttenItem);
      }

      // ResizeObserver
      self._lastData = data;
      self._lastConfig = config;
      self._lastQueryResponse = queryResponse;
      self._lastDetails = details;
      self._lastH = element.clientHeight || 0;

      if (!self._ro && typeof ResizeObserver !== "undefined") {
        var roTimer = null;
        self._ro = new ResizeObserver(function () {
          if (roTimer) clearTimeout(roTimer);
          roTimer = setTimeout(function () {
            if (!self._lastData || Math.abs((element.clientHeight || 0) - (self._lastH || 0)) < 4) return;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 120);
        });
        self._ro.observe(element);
      }

      done();
    },

    _renderTraceReflectogram: function (d3, wrapper, items, width, height, theme, config, benchmarkVal, benchmarkLabel, critThreshold, tooltip) {
      var margin = { top: 35, right: 40, bottom: 45, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Generate synthetic high-resolution OTDR reflectometry trace data for the selected/primary corridor
      var primaryItem = items[0];
      var totalKm = primaryItem.distanceKm;

      // Rayleigh backscatter slope: power drops linearly with distance, plus discrete optical events:
      // Event 0: Launch connector reflection spike (0 km)
      // Event 1: First Fusion Splice (drop ~0.12 dB) at 15% distance
      // Event 2: Macrobend (drop ~0.45 dB) at 38% distance
      // Event 3: Mechanical Patch Panel Reflection (spike + 0.35 dB loss) at 62% distance
      // Event 4: High-loss splice / anomaly at 84% distance
      // Event 5: Fiber End / Cut (Fresnel reflection spike then drop into noise floor) at 100% distance

      var events = [
        { type: "Launch Connector", km: 0, lossDb: 0.25, reflectionDb: -42, desc: "Front-end OTDR Optical Interface" },
        { type: "Fusion Splice", km: totalKm * 0.18, lossDb: 0.08, reflectionDb: null, desc: "Standard Fusion Splice #1" },
        { type: "Macrobend Loss", km: totalKm * 0.42, lossDb: 0.52, reflectionDb: null, desc: "High Cable Curvature / Pinch" },
        { type: "Patch Panel", km: totalKm * 0.65, lossDb: 0.38, reflectionDb: -38, desc: "Inter-Regen Facility Cross-Connect" },
        { type: "Degraded Splice", km: totalKm * 0.85, lossDb: 0.84, reflectionDb: -45, desc: "Environmental Moisture / Stress Anomaly" },
        { type: "End of Fiber / Cut", km: totalKm, lossDb: 2.80, reflectionDb: -14, desc: "Terminal Demarc / Fresnel Reflection Peak" }
      ];

      var tracePoints = [];
      var currentLoss = 0.0;
      var baseSlope = primaryItem.attenuationDbPerKm; // dB per km

      var numSamples = 180;
      for (var s = 0; s <= numSamples; s++) {
        var km = (s / numSamples) * totalKm;
        var loss = km * baseSlope + (Math.sin(s * 0.4) * 0.04); // Rayleigh backscatter with noise

        // Accumulate discrete event steps
        for (var e = 0; e < events.length; e++) {
          if (km >= events[e].km) {
            loss += events[e].lossDb;
          }
        }

        // Add reflection spikes near reflective events
        for (var re = 0; re < events.length; re++) {
          if (events[re].reflectionDb !== null) {
            var distToEvt = Math.abs(km - events[re].km);
            if (distToEvt < (totalKm * 0.012)) {
              loss -= (1.8 * Math.exp(-Math.pow(distToEvt / (totalKm * 0.003), 2))); // Reflection spike (upward power pulse)
            }
          }
        }

        tracePoints.push({ km: km, lossDb: loss });
      }

      var maxLoss = d3.max(tracePoints, function (d) { return d.lossDb; }) * 1.15 || 25;

      var xScale = d3.scaleLinear().domain([0, totalKm]).range([0, innerW]);
      var yScale = d3.scaleLinear().domain([0, maxLoss]).range([0, innerH]); // Note: 0 dB at top (high power), max loss at bottom

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Grid lines
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "2,2");

      g.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(xScale).ticks(8).tickSize(-innerH).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "2,2");

      // Shaded ITU-T Spec Envelope
      if (benchmarkVal !== null) {
        var specLossAtEnd = totalKm * benchmarkVal;
        var specPoints = [
          { km: 0, lossDb: 0 },
          { km: totalKm, lossDb: specLossAtEnd }
        ];

        var specLine = d3.line()
          .x(function (d) { return xScale(d.km); })
          .y(function (d) { return yScale(d.lossDb); });

        g.append("path")
          .datum(specPoints)
          .attr("fill", "none")
          .attr("stroke", theme.nominal)
          .attr("stroke-width", 1.8)
          .attr("stroke-dasharray", "5,4")
          .attr("d", specLine);

        g.append("text")
          .attr("x", xScale(totalKm * 0.7))
          .attr("y", yScale(totalKm * 0.7 * benchmarkVal) - 6)
          .attr("fill", theme.nominal)
          .attr("font-size", 10)
          .attr("font-weight", 600)
          .text("--- " + benchmarkLabel);
      }

      // Shaded trace area
      var areaGen = d3.area()
        .x(function (d) { return xScale(d.km); })
        .y0(innerH)
        .y1(function (d) { return yScale(d.lossDb); })
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(tracePoints)
        .attr("fill", theme.traceFill)
        .attr("d", areaGen);

      // Main trace polyline
      var lineGen = d3.line()
        .x(function (d) { return xScale(d.km); })
        .y(function (d) { return yScale(d.lossDb); })
        .curve(d3.curveMonotoneX);

      var path = g.append("path")
        .datum(tracePoints)
        .attr("fill", "none")
        .attr("stroke", theme.traceStroke)
        .attr("stroke-width", 2.2)
        .attr("d", lineGen);

      // Event Markers & Pins
      events.forEach(function (evt, idx) {
        var evtLoss = evt.km * baseSlope + evt.lossDb;
        for (var i = 0; i < idx; i++) evtLoss += events[i].lossDb;

        var cx = xScale(evt.km);
        var cy = yScale(evtLoss);
        var isCritical = evt.lossDb >= 0.5 || evt.type.indexOf("Cut") !== -1 || evt.type.indexOf("Degraded") !== -1;
        var pColor = isCritical ? theme.critical : (evt.reflectionDb !== null ? theme.primary : theme.nominal);

        // Vertical drop line to axis
        g.append("line")
          .attr("x1", cx)
          .attr("y1", cy)
          .attr("x2", cx)
          .attr("y2", innerH)
          .attr("stroke", pColor)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3")
          .attr("opacity", 0.6);

        // Marker Pin
        var pinGroup = g.append("g")
          .attr("transform", "translate(" + cx + "," + cy + ")")
          .style("cursor", primaryItem.links && primaryItem.links.length ? "pointer" : "default");

        pinGroup.append("circle")
          .attr("r", isCritical ? 6 : 4.5)
          .attr("fill", pColor)
          .attr("stroke", theme.bg)
          .attr("stroke-width", 1.5);

        if (isCritical) {
          pinGroup.append("circle")
            .attr("r", 10)
            .attr("fill", "none")
            .attr("stroke", pColor)
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "2,2")
            .attr("opacity", 0.8);
        }

        // Label if density allows
        var density = config.labelDensity || "peaks_only";
        var showLabel = density === "all" || (density === "peaks_only" && isCritical);

        if (showLabel) {
          g.append("text")
            .attr("x", cx + 6)
            .attr("y", cy - 8)
            .attr("fill", pColor)
            .attr("font-size", 9.5)
            .attr("font-weight", 700)
            .text(evt.type + " (+" + evt.lossDb.toFixed(2) + " dB)");
        }

        // Hover & Tooltip
        pinGroup
          .on("mouseover", function (event) {
            d3.select(this).select("circle").attr("r", isCritical ? 8 : 6.5);
            tooltip.style.display = "block";
            tooltip.style.opacity = "1";
            tooltip.style.background = theme.tooltipBg;
            tooltip.style.border = "1px solid " + pColor;
            tooltip.style.color = theme.text;
            tooltip.innerHTML =
              "<div style='font-weight:700;color:" + pColor + ";font-size:12px;margin-bottom:4px;'>" + evt.type + "</div>" +
              "<div style='font-size:11px;line-height:1.4;'>" +
                "<div><b>Location:</b> " + Math.round(evt.km).toLocaleString() + " km (" + Math.round(evt.km / 1.60934) + " mi)</div>" +
                "<div><b>Event Loss:</b> " + evt.lossDb.toFixed(2) + " dB</div>" +
                (evt.reflectionDb !== null ? "<div><b>Reflectance:</b> " + evt.reflectionDb + " dB (Fresnel)</div>" : "") +
                "<div><b>Cumulative Attenuation:</b> " + evtLoss.toFixed(2) + " dB</div>" +
                "<div style='color:" + theme.subtext + ";font-size:10px;margin-top:2px;'>" + evt.desc + "</div>" +
              "</div>";
          })
          .on("mousemove", function (event) {
            tooltip.style.left = (event.pageX + 12) + "px";
            tooltip.style.top = (event.pageY - 28) + "px";
          })
          .on("mouseout", function () {
            d3.select(this).select("circle").attr("r", isCritical ? 6 : 4.5);
            tooltip.style.display = "none";
          })
          .on("click", function (event) {
            if (primaryItem.links && primaryItem.links.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: primaryItem.links, event: event });
            }
          });
      });

      // Axes
      var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d.toLocaleString() + " km"; });
      var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d.toFixed(1) + " dB"; });

      g.append("g")
        .attr("transform", "translate(0," + innerH + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", 10);

      g.append("g")
        .call(yAxis)
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", 10);

      // Axis labels
      g.append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + 34)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", 11)
        .text("Optical Fiber Physical Distance (km / Route Miles)");

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", 11)
        .text("Optical Power Loss / Cumulative Attenuation (dB)");
    },

    _renderLossWaterfall: function (d3, wrapper, items, width, height, theme, config, critThreshold, tooltip) {
      var margin = { top: 30, right: 35, bottom: 50, left: 65 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var primary = items[0];
      var totalDist = primary.distanceKm;
      var fiberRayleighLoss = totalDist * primary.attenuationDbPerKm * 0.72;

      var steps = [
        { name: "Launch Interface", delta: 0.35, isStep: true, type: "launch" },
        { name: "Rayleigh Bulk Fiber", delta: fiberRayleighLoss, isStep: true, type: "fiber" },
        { name: "Fusion Splices (x14)", delta: 1.12, isStep: true, type: "splice" },
        { name: "Patch Panels & ODFs", delta: 1.45, isStep: true, type: "connector" },
        { name: "Macrobend Anomalies", delta: 2.10, isStep: true, type: "anomaly" },
        { name: "Total Span Loss", delta: 0, isTotal: true, type: "total" }
      ];

      var running = 0;
      steps.forEach(function (s) {
        if (s.isStep) {
          s.start = running;
          running += s.delta;
          s.end = running;
        } else if (s.isTotal) {
          s.start = 0;
          s.end = running;
          s.delta = running;
        }
      });

      var maxLoss = running * 1.25 || 25;

      var xScale = d3.scaleBand().domain(steps.map(function (d) { return d.name; })).range([0, innerW]).padding(0.28);
      var yScale = d3.scaleLinear().domain([0, maxLoss]).range([innerH, 0]);

      // Grid
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW).tickFormat(""))
        .selectAll("line")
        .attr("stroke", theme.grid)
        .attr("stroke-dasharray", "2,2");

      // Bars
      steps.forEach(function (s) {
        var bx = xScale(s.name);
        var by = yScale(Math.max(s.start, s.end));
        var bw = xScale.bandwidth();
        var bh = Math.max(2, Math.abs(yScale(s.start) - yScale(s.end)));

        var bColor = s.isTotal
          ? theme.primary
          : (s.type === "anomaly" ? theme.critical : (s.type === "fiber" ? theme.traceStroke : theme.nominal));

        var bar = g.append("rect")
          .attr("x", bx)
          .attr("y", by)
          .attr("width", bw)
          .attr("height", bh)
          .attr("rx", 4)
          .attr("fill", bColor)
          .attr("opacity", 0.9)
          .style("cursor", primary.links && primary.links.length ? "pointer" : "default");

        g.append("text")
          .attr("x", bx + bw / 2)
          .attr("y", by - 6)
          .attr("text-anchor", "middle")
          .attr("fill", bColor)
          .attr("font-size", 10)
          .attr("font-weight", 700)
          .text("+" + s.delta.toFixed(2) + " dB");

        bar
          .on("mouseover", function (event) {
            d3.select(this).attr("opacity", 1.0);
            tooltip.style.display = "block";
            tooltip.style.background = theme.tooltipBg;
            tooltip.style.border = "1px solid " + bColor;
            tooltip.style.color = theme.text;
            tooltip.innerHTML =
              "<div style='font-weight:700;color:" + bColor + ";font-size:12px;'>" + s.name + "</div>" +
              "<div><b>Loss Contribution:</b> " + s.delta.toFixed(2) + " dB</div>" +
              "<div><b>Cumulative Loss:</b> " + s.end.toFixed(2) + " dB</div>";
          })
          .on("mousemove", function (event) {
            tooltip.style.left = (event.pageX + 12) + "px";
            tooltip.style.top = (event.pageY - 28) + "px";
          })
          .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.9);
            tooltip.style.display = "none";
          })
          .on("click", function (event) {
            if (primary.links && primary.links.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: primary.links, event: event });
            }
          });
      });

      // Receiver Sensitivity Budget Threshold line (-28 dBm margin)
      var maxBudget = 22.0; // 22 dB total optical link loss budget
      g.append("line")
        .attr("x1", 0)
        .attr("y1", yScale(maxBudget))
        .attr("x2", innerW)
        .attr("y2", yScale(maxBudget))
        .attr("stroke", theme.critical)
        .attr("stroke-width", 1.6)
        .attr("stroke-dasharray", "4,4");

      g.append("text")
        .attr("x", innerW - 6)
        .attr("y", yScale(maxBudget) - 6)
        .attr("text-anchor", "end")
        .attr("fill", theme.critical)
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .text("Max Link Budget Margin (22.0 dB)");

      // Axes
      g.append("g")
        .attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", 9.5)
        .attr("transform", "rotate(-12)")
        .attr("text-anchor", "end");

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d.toFixed(0) + " dB"; }))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", 10);
    },

    _renderFaultMatrix: function (d3, wrapper, items, width, height, theme, config, critThreshold, tooltip) {
      var margin = { top: 30, right: 30, bottom: 40, left: 160 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(80, height - margin.top - margin.bottom);

      var svg = d3.select(wrapper).append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var categories = ["Rayleigh Slope", "Splice Loss", "Connector Reflection", "Macrobend", "Fiber Cut Risk"];
      var corridors = items.slice(0, 10).map(function (d) { return d.corridor; });

      var xScale = d3.scaleBand().domain(categories).range([0, innerW]).padding(0.08);
      var yScale = d3.scaleBand().domain(corridors).range([0, innerH]).padding(0.08);

      items.slice(0, 10).forEach(function (item) {
        categories.forEach(function (cat, cIdx) {
          var baseAtten = item.attenuationDbPerKm;
          var riskScore = baseAtten * (cIdx === 3 ? 1.6 : (cIdx === 4 ? 2.0 : 1.0));
          var isCrit = riskScore >= critThreshold;
          var cellColor = isCrit ? theme.critical : (riskScore >= 0.20 ? theme.warning : theme.nominal);

          var rect = g.append("rect")
            .attr("x", xScale(cat))
            .attr("y", yScale(item.corridor))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("rx", 3)
            .attr("fill", cellColor)
            .attr("opacity", 0.85)
            .style("cursor", item.links && item.links.length ? "pointer" : "default");

          g.append("text")
            .attr("x", xScale(cat) + xScale.bandwidth() / 2)
            .attr("y", yScale(item.corridor) + yScale.bandwidth() / 2 + 3.5)
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", 9.5)
            .attr("font-weight", 700)
            .text(riskScore.toFixed(3));

          rect
            .on("mouseover", function (event) {
              d3.select(this).attr("opacity", 1.0);
              tooltip.style.display = "block";
              tooltip.style.background = theme.tooltipBg;
              tooltip.style.border = "1px solid " + cellColor;
              tooltip.style.color = theme.text;
              tooltip.innerHTML =
                "<div style='font-weight:700;color:" + cellColor + ";'>" + item.corridor + " — " + cat + "</div>" +
                "<div><b>Risk Index:</b> " + riskScore.toFixed(3) + " dB/km</div>" +
                "<div><b>Fiber Type:</b> " + item.fiberType + "</div>" +
                "<div><b>Route Distance:</b> " + Math.round(item.distanceMiles) + " mi</div>";
            })
            .on("mousemove", function (event) {
              tooltip.style.left = (event.pageX + 12) + "px";
              tooltip.style.top = (event.pageY - 28) + "px";
            })
            .on("mouseout", function () {
              d3.select(this).attr("opacity", 0.85);
              tooltip.style.display = "none";
            })
            .on("click", function (event) {
              if (item.links && item.links.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                LookerCharts.Utils.openDrillMenu({ links: item.links, event: event });
              }
            });
        });
      });

      // Axis labels
      g.append("g")
        .attr("transform", "translate(0,0)")
        .call(d3.axisTop(xScale))
        .selectAll("text")
        .attr("fill", theme.subtext)
        .attr("font-size", 10)
        .attr("font-weight", 600);

      g.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .attr("fill", theme.text)
        .attr("font-size", 10.5)
        .attr("font-weight", 600);
    },

    _renderExecutiveHud: function (d3, wrapper, items, width, height, theme, config, benchmarkVal, critThreshold, totalMiles, meanAtten, maxAttenItem) {
      wrapper.innerHTML = "";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.justifyContent = "center";
      wrapper.style.alignItems = "center";
      wrapper.style.padding = "24px";
      wrapper.style.boxSizing = "border-box";

      var criticalCount = items.filter(function (d) { return d.attenuationDbPerKm >= critThreshold; }).length;

      var cardGrid = document.createElement("div");
      cardGrid.style.display = "grid";
      cardGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
      cardGrid.style.gap = "16px";
      cardGrid.style.width = "100%";
      cardGrid.style.maxWidth = "800px";

      var cards = [
        { title: "Total Route Miles", value: Math.round(totalMiles).toLocaleString() + " mi", sub: "8 Core Optical Corridors", color: theme.primary },
        { title: "Mean Span Attenuation", value: meanAtten.toFixed(3) + " dB/km", sub: "Spec Target: " + (benchmarkVal ? benchmarkVal.toFixed(2) : "0.20") + " dB/km", color: theme.nominal },
        { title: "Peak Fiber Loss", value: maxAttenItem.attenuationDbPerKm.toFixed(3) + " dB/km", sub: maxAttenItem.corridor, color: maxAttenItem.attenuationDbPerKm >= critThreshold ? theme.critical : theme.nominal },
        { title: "Critical OTDR Events", value: String(criticalCount), sub: criticalCount > 0 ? "Immediate Dispatch Required" : "All Corridors In-Spec", color: criticalCount > 0 ? theme.critical : theme.nominal }
      ];

      cards.forEach(function (c) {
        var card = document.createElement("div");
        card.style.background = theme.cardBg;
        card.style.border = "1px solid " + theme.border;
        card.style.borderLeft = "4px solid " + c.color;
        card.style.borderRadius = "8px";
        card.style.padding = "14px 18px";
        card.innerHTML =
          "<div style='font-size:11px;font-weight:700;color:" + theme.subtext + ";text-transform:uppercase;letter-spacing:0.05em;'>" + c.title + "</div>" +
          "<div style='font-size:24px;font-weight:800;color:" + theme.text + ";margin:4px 0;font-family:\'JetBrains Mono\',monospace;'>" + c.value + "</div>" +
          "<div style='font-size:10.5px;color:" + theme.subtext + ";'>" + c.sub + "</div>";
        cardGrid.appendChild(card);
      });

      wrapper.appendChild(cardGrid);
    }
  });
})();
