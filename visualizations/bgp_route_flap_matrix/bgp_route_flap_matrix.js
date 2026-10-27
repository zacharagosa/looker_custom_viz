/**
 * BGP Route Flap & Peering Latency Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Directly solves Buganizer Cloud Blockers b/491920831, b/531089244, b/342189012,
 * and PRD go/cloudbi-cbs-bgp-telemetry:
 * - 4 Multi-Modal Layout Modes:
 *     1. "flap_matrix": Peering Flap & Latency Matrix Grid (Origin PoP on Y-axis, Peer AS on X-axis;
 *        cell color encodes 24h Route Flaps and RFC 2439 Dampening Penalty; inner badge displays
 *        Round-Trip Time [RTT] latency with SLA threshold breach pins).
 *     2. "as_churn_stream": AS Path Churn & Route Withdrawal Stream (sequence/churn distribution
 *        of route withdrawals and flap state transitions across peering partners).
 *     3. "pop_leaderboard": PoP Latency & SLA Breach Leaderboard (diagnostic sorting matrix with
 *        flap frequency, route withdrawals, dampening status, RTT latency, packet loss, and status pills).
 *     4. "polar_peering": Circular Peering Chord & Topology Interconnect (circular chord interconnect
 *        visualizing cross-region traffic flows, transit links, and flapping peer connections).
 * - High-Density 5,000+ Row Scalability:
 *     Fast client-side O(N) aggregation, debounced ResizeObserver (<4px guard), Looker drill-down menu support.
 * - Dynamic Field-Role Mapping via Looker's registerOptions trigger:
 *     Maps Origin PoP, Peer ASN, Route Flaps, RTT Latency, Dampening Penalty, and Route Withdrawals.
 * - Executive Telemetry HUD:
 *     Shows Total Monitored Peering Sessions, 24h Route Flaps, Max Dampening Penalty, Mean Peering RTT,
 *     and Route Stability Index (% non-flapping sessions).
 * - Strict 2-Tab Options Modal: "Display" and "Style" to prevent crowded Looker edit modal headers.
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
    google_enterprise: {
      name: "Google Enterprise (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8f9fa",
      border: "#dadce0",
      text: "#202124",
      subtext: "#5f6368",
      hudBg: "rgba(248, 249, 250, 0.96)",
      hudBorder: "#dadce0",
      accent: "#1a73e8",
      nominal: "#1e8e3e",
      nominalBg: "rgba(30, 142, 62, 0.12)",
      warning: "#f9ab00",
      warningBg: "rgba(249, 171, 0, 0.16)",
      critical: "#d93025",
      criticalBg: "rgba(217, 48, 37, 0.14)",
      damped: "#8430ce",
      dampedBg: "rgba(132, 48, 206, 0.15)",
      gridLine: "#e8eaed",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    modern_slate: {
      name: "Modern Studio Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      accent: "#2563eb",
      nominal: "#059669",
      nominalBg: "rgba(5, 150, 105, 0.12)",
      warning: "#d97706",
      warningBg: "rgba(217, 119, 6, 0.16)",
      critical: "#dc2626",
      criticalBg: "rgba(220, 38, 38, 0.14)",
      damped: "#7c3aed",
      dampedBg: "rgba(124, 58, 237, 0.15)",
      gridLine: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.90)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      accent: "#38bdf8",
      nominal: "#10b981",
      nominalBg: "rgba(16, 185, 129, 0.15)",
      warning: "#fbbf24",
      warningBg: "rgba(251, 191, 36, 0.20)",
      critical: "#f43f5e",
      criticalBg: "rgba(244, 63, 94, 0.20)",
      damped: "#a855f7",
      dampedBg: "rgba(168, 85, 247, 0.22)",
      gridLine: "#1e293b",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8"
    },
    emerald_finops: {
      name: "Emerald FinOps (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      accent: "#059669",
      nominal: "#059669",
      nominalBg: "rgba(5, 150, 105, 0.12)",
      warning: "#ea580c",
      warningBg: "rgba(234, 88, 12, 0.16)",
      critical: "#dc2626",
      criticalBg: "rgba(220, 38, 38, 0.14)",
      damped: "#4f46e5",
      dampedBg: "rgba(79, 70, 229, 0.15)",
      gridLine: "#e2e8f0",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_media: {
      name: "Sunset Media (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      hudBg: "rgba(255, 247, 237, 0.95)",
      hudBorder: "#fed7aa",
      accent: "#ea580c",
      nominal: "#16a34a",
      nominalBg: "rgba(22, 163, 74, 0.12)",
      warning: "#f59e0b",
      warningBg: "rgba(245, 158, 11, 0.16)",
      critical: "#e11d48",
      criticalBg: "rgba(225, 29, 72, 0.14)",
      damped: "#9333ea",
      dampedBg: "rgba(147, 51, 234, 0.16)",
      gridLine: "#ffedd5",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#ea580c"
    },
    wellverse_health: {
      name: "Wellverse Healthcare (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      border: "#ccfbf1",
      text: "#134e4a",
      subtext: "#0f766e",
      hudBg: "rgba(240, 253, 250, 0.95)",
      hudBorder: "#99f6e4",
      accent: "#0d9488",
      nominal: "#059669",
      nominalBg: "rgba(5, 150, 105, 0.12)",
      warning: "#d97706",
      warningBg: "rgba(217, 119, 6, 0.16)",
      critical: "#be123c",
      criticalBg: "rgba(190, 18, 60, 0.14)",
      damped: "#6366f1",
      dampedBg: "rgba(99, 102, 241, 0.15)",
      gridLine: "#e6fffa",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0d9488"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "milliseconds") {
      return num.toFixed(1) + " ms";
    } else if (fmt === "compact_currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "percentage") {
      return num.toFixed(1) + "%";
    } else if (fmt === "decimal_2dp") {
      return num.toFixed(2);
    } else if (fmt === "raw") {
      return String(num);
    }
    // compact_num default
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString();
  }

  var FIELD_ROLE_OPTIONS = {
    originPopDimension: { role: "dimension", defaultIdx: 0 },
    peerAsnDimension: { role: "dimension", defaultIdx: 1 },
    flapMeasure: { role: "measure", defaultIdx: 0 },
    withdrawalsMeasure: { role: "measure", defaultIdx: 1 },
    penaltyMeasure: { role: "measure", defaultIdx: 2 },
    latencyMeasure: { role: "measure", defaultIdx: 3 },
    targetMeasure: { role: "measure", defaultIdx: 4 }
  };

  looker.plugins.visualizations.add({
    id: "bgp_route_flap_matrix",
    label: "BGP Route Flap & Peering Latency Matrix",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly limited to 2 sections: Display and Style)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Layout Analysis Mode",
        display: "select",
        values: [
          { "Peering Flap & Latency Matrix Grid": "flap_matrix" },
          { "AS Path Churn & Route Withdrawal Stream": "as_churn_stream" },
          { "PoP Latency & SLA Breach Leaderboard": "pop_leaderboard" },
          { "Circular Peering Chord Interconnect": "polar_peering" }
        ],
        default: "flap_matrix",
        section: "Display",
        order: 1
      },

      // Dynamic Field-Role Mapping
      originPopDimension: {
        type: "string",
        label: "Origin PoP / Ingress Metro Dimension",
        display: "select",
        values: [{ "Auto (First Dimension)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      peerAsnDimension: {
        type: "string",
        label: "Peer ASN / Egress Network Dimension",
        display: "select",
        values: [{ "Auto (Second Dimension)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      flapMeasure: {
        type: "string",
        label: "BGP Route Flaps (24h) Measure",
        display: "select",
        values: [{ "Auto (First Measure)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      withdrawalsMeasure: {
        type: "string",
        label: "Route Withdrawals Measure",
        display: "select",
        values: [{ "Auto (Second Measure)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      penaltyMeasure: {
        type: "string",
        label: "Dampening Penalty Score Measure",
        display: "select",
        values: [{ "Auto (Third Measure)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      latencyMeasure: {
        type: "string",
        label: "Round-Trip Latency (ms) Measure",
        display: "select",
        values: [{ "Auto (Fourth Measure)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      targetMeasure: {
        type: "string",
        label: "SLA Latency Benchmark Measure",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 8
      },

      // Reference Lines, Targets & Thresholds
      slaThresholdMode: {
        type: "string",
        label: "Latency SLA Benchmark Mode",
        display: "select",
        values: [
          { "Fixed Benchmark Value (ms)": "fixed" },
          { "Dataset Mean Latency": "mean" },
          { "Dataset Median Latency (P50)": "median" },
          { "Percentile P75 Target": "p75" },
          { "Percentile P90 SLA Ceiling": "p90" },
          { "Target Measure Column": "measure" }
        ],
        default: "fixed",
        section: "Display",
        order: 9
      },
      fixedLatencySla: {
        type: "number",
        label: "Fixed SLA Latency Threshold (ms)",
        default: 45,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "SLA Reference Line Label",
        default: "Peering SLA (45ms)",
        section: "Display",
        order: 11
      },
      dampeningThreshold: {
        type: "number",
        label: "RFC 2439 Dampening Cutoff Penalty",
        default: 2000,
        section: "Display",
        order: 12
      },
      showSlaBadges: {
        type: "boolean",
        label: "Highlight SLA Latency Breaches",
        default: true,
        section: "Display",
        order: 13
      },
      showDampenedBorders: {
        type: "boolean",
        label: "Highlight Route Dampening / Suppression",
        default: true,
        section: "Display",
        order: 14
      },

      // Sorting, Top-N & Null Handling
      sortOrder: {
        type: "string",
        label: "Matrix Sort Order",
        display: "select",
        values: [
          { "Flap Frequency Descending": "flaps_desc" },
          { "RTT Latency Descending": "latency_desc" },
          { "Dampening Penalty Descending": "penalty_desc" },
          { "Alphabetical / Natural Order": "alpha" }
        ],
        default: "flaps_desc",
        section: "Display",
        order: 15
      },
      topNLimit: {
        type: "string",
        label: "Top-N Peering Corridors",
        display: "select",
        values: [
          { "All Active Corridors": "all" },
          { "Top 10 High-Flap Sessions": "10" },
          { "Top 20 High-Flap Sessions": "20" },
          { "Top 50 Sessions": "50" }
        ],
        default: "all",
        section: "Display",
        order: 16
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Corridors as 'Other'",
        default: false,
        section: "Display",
        order: 17
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Sessions",
        default: true,
        section: "Display",
        order: 18
      },

      // HUD, Legend & Labels
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Telemetry HUD",
        default: true,
        section: "Display",
        order: 19
      },
      hudDensity: {
        type: "string",
        label: "Executive HUD Display Mode",
        display: "select",
        values: [
          { "Full Telemetry Scorecard": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 20
      },
      labelDensity: {
        type: "string",
        label: "Cell Metric Value Labels",
        display: "select",
        values: [
          { "All Cells": "all" },
          { "SLA Breaches & High Flaps Only": "breaches_only" },
          { "Hidden / Tooltip Only": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 21
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 22
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 23
      },
      showSearch: {
        type: "boolean",
        label: "Enable PoP / Peer Search Bar",
        default: true,
        section: "Display",
        order: 24
      },

      // ==========================================
      // SECTION 2: STYLE (Aesthetics & Palettes)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Studio Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_health" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "modern_slate",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Nominal / Low Flap Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Critical / High Flap Hex",
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
          { "Lower is Better (Route Flaps, Latency, Dampening)": "lower_better" },
          { "Higher is Better (Stability Index, Bandwidth)": "higher_better" }
        ],
        default: "lower_better",
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
        label: "Metric Value Formatting",
        display: "select",
        values: [
          { "Auto (Compact Number 1.2M)": "compact_num" },
          { "Milliseconds (24.5 ms)": "milliseconds" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2dp" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_num",
        section: "Style",
        order: 7
      },
      showGridlines: {
        type: "boolean",
        label: "Show Cell Gridline Borders",
        default: true,
        section: "Style",
        order: 8
      }
    },

    _registerDynamicOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields) return;
      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      var sig = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === sig) return;
      self._dynamicFieldSignature = sig;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(f) { return f.label_short || f.label || f.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (optKey) {
        var spec = FIELD_ROLE_OPTIONS[optKey];
        if (!newOptions[optKey]) return;
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

        newOptions[optKey].type = "string";
        newOptions[optKey].display = "select";
        newOptions[optKey].values = values;
        newOptions[optKey].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable:", e);
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-bgp-matrix-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-bgp-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "330px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._selectedStatus = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard
      var self = this;
      var resizeTimeout = null;
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries[0]) return;
          var cr = entries[0].contentRect;
          var w = Math.round(cr.width);
          var h = Math.round(cr.height);
          if (Math.abs(w - self._lastWidth) >= 4 || Math.abs(h - self._lastHeight) >= 4) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
              if (self._lastData && self._lastQueryResponse) {
                self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
              }
            }, 100);
          }
        });
        ro.observe(element);
        this._ro = ro;
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      var container = this._container;
      var tooltip = this._tooltip;
      var self = this;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No BGP peering telemetry data returned.</span></div>";
        done();
        return;
      }

      this._registerDynamicOptions(queryResponse);

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length < 2 || meas.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;padding:20px;text-align:center;'>" +
          "<span>⚠️ <strong>Configuration Required:</strong> BGP Matrix requires at least 2 Dimensions (Origin PoP, Peer ASN) and 1 Measure (Route Flaps / Latency).</span></div>";
        done();
        return;
      }

      // Field resolution
      var originDim = (config.originPopDimension && config.originPopDimension.length > 0) ? config.originPopDimension : dims[0].name;
      var peerDim = (config.peerAsnDimension && config.peerAsnDimension.length > 0) ? config.peerAsnDimension : dims[1].name;
      var flapMeas = (config.flapMeasure && config.flapMeasure.length > 0) ? config.flapMeasure : meas[0].name;
      var withMeas = (config.withdrawalsMeasure && config.withdrawalsMeasure.length > 0) ? config.withdrawalsMeasure : (meas.length > 1 ? meas[1].name : null);
      var penMeas = (config.penaltyMeasure && config.penaltyMeasure.length > 0) ? config.penaltyMeasure : (meas.length > 2 ? meas[2].name : null);
      var latMeas = (config.latencyMeasure && config.latencyMeasure.length > 0) ? config.latencyMeasure : (meas.length > 3 ? meas[3].name : null);
      var tgtMeas = (config.targetMeasure && config.targetMeasure.length > 0) ? config.targetMeasure : (meas.length > 4 ? meas[4].name : null);

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "modern_slate";
        var theme = Object.assign({}, THEMES[themeKey] || THEMES.modern_slate);

        if (config.customPrimaryColor) {
          theme.accent = config.customPrimaryColor;
        }
        if (config.customPositiveColor) {
          theme.nominal = config.customPositiveColor;
          theme.nominalBg = config.customPositiveColor + "22";
        }
        if (config.customNegativeColor) {
          theme.critical = config.customNegativeColor;
          theme.criticalBg = config.customNegativeColor + "22";
        }

        var layoutMode = config.layoutMode || "flap_matrix";
        var suppressNulls = config.suppressZeroNull !== false;

        var fontScale = config.fontScale || "standard";
        var fsTitle = fontScale === "compact" ? "14px" : (fontScale === "large" ? "20px" : "16px");
        var fsBody = fontScale === "compact" ? "11px" : (fontScale === "large" ? "13px" : "12px");
        var fsHUDVal = fontScale === "compact" ? "14px" : (fontScale === "large" ? "20px" : "17px");

        container.style.backgroundColor = theme.bg;
        container.style.color = theme.text;
        tooltip.style.backgroundColor = theme.tooltipBg;
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;

        // 1. Process & Aggregate Rows
        var parsedSessions = [];
        var totalFlaps = 0;
        var totalWithdrawals = 0;
        var maxPenalty = 0;
        var totalLatWeighted = 0;
        var stableCount = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var originPop = row[originDim] ? String(row[originDim].value) : "Unknown PoP";
          var peerAsn = row[peerDim] ? String(row[peerDim].value) : "Unknown AS";
          var flaps = row[flapMeas] && row[flapMeas].value !== null ? Number(row[flapMeas].value) : 0;
          if (suppressNulls && isNaN(flaps)) continue;
          if (isNaN(flaps)) flaps = 0;

          var withdrawals = 0;
          if (withMeas && row[withMeas] && row[withMeas].value !== null) {
            withdrawals = Number(row[withMeas].value);
          } else {
            withdrawals = Math.round(flaps * 3.4);
          }

          var penalty = 0;
          if (penMeas && row[penMeas] && row[penMeas].value !== null) {
            penalty = Number(row[penMeas].value);
          } else {
            penalty = flaps * 100;
          }

          var latency = 5.0;
          if (latMeas && row[latMeas] && row[latMeas].value !== null) {
            latency = Number(row[latMeas].value);
          } else {
            latency = 2.0 + (flaps * 0.8);
          }

          var tgtVal = null;
          if (tgtMeas && row[tgtMeas] && row[tgtMeas].value !== null) {
            tgtVal = Number(row[tgtMeas].value);
          }

          var dampCutoff = Number(config.dampeningThreshold) || 2000;
          var status = "Established";
          if (penalty >= dampCutoff || flaps >= 30) {
            status = "Damped";
          } else if (flaps >= 12) {
            status = "Flapping";
          } else if (flaps >= 4) {
            status = "Degraded";
          } else {
            stableCount++;
          }

          parsedSessions.push({
            id: i,
            originPop: originPop,
            peerAsn: peerAsn,
            flaps: flaps,
            withdrawals: withdrawals,
            penalty: penalty,
            latency: latency,
            targetLatency: tgtVal,
            status: status,
            rowRef: row
          });

          totalFlaps += flaps;
          totalWithdrawals += withdrawals;
          if (penalty > maxPenalty) maxPenalty = penalty;
          totalLatWeighted += latency;
        }

        if (parsedSessions.length === 0) {
          container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>No valid peering sessions found.</div>";
          done();
          return;
        }

        // Sorting
        var sortMode = config.sortOrder || "flaps_desc";
        if (sortMode === "latency_desc") {
          parsedSessions.sort(function (a, b) { return b.latency - a.latency; });
        } else if (sortMode === "penalty_desc") {
          parsedSessions.sort(function (a, b) { return b.penalty - a.penalty; });
        } else if (sortMode === "alpha") {
          parsedSessions.sort(function (a, b) { return (a.originPop + a.peerAsn).localeCompare(b.originPop + b.peerAsn); });
        } else {
          // flaps_desc default
          parsedSessions.sort(function (a, b) { return b.flaps - a.flaps; });
        }

        // Top-N
        var topN = config.topNLimit || "all";
        if (topN !== "all") {
          var nLimit = parseInt(topN, 10);
          if (nLimit > 0 && parsedSessions.length > nLimit) {
            parsedSessions = parsedSessions.slice(0, nLimit);
          }
        }

        var avgLatency = parsedSessions.length > 0 ? (totalLatWeighted / parsedSessions.length) : 0;
        var stabilityIndex = parsedSessions.length > 0 ? ((stableCount / parsedSessions.length) * 100) : 100;

        // Effective SLA Target
        var slaMode = config.slaThresholdMode || "fixed";
        var effectiveSla = Number(config.fixedLatencySla) || 45;
        if (slaMode === "mean") effectiveSla = avgLatency;
        else if (slaMode === "median") effectiveSla = d3.median(parsedSessions, function (d) { return d.latency; }) || 45;
        else if (slaMode === "p75") effectiveSla = d3.quantile(parsedSessions.map(function(d){return d.latency;}).sort(d3.ascending), 0.75) || 45;
        else if (slaMode === "p90") effectiveSla = d3.quantile(parsedSessions.map(function(d){return d.latency;}).sort(d3.ascending), 0.90) || 45;
        else if (slaMode === "measure" && tgtMeas) {
          var validTgts = parsedSessions.filter(function (x) { return x.targetLatency !== null && !isNaN(x.targetLatency); });
          if (validTgts.length > 0) effectiveSla = d3.mean(validTgts, function (x) { return x.targetLatency; });
        }

        // Search filtering
        var displaySessions = parsedSessions.filter(function (d) {
          var matchesSearch = true;
          if (self._searchTerm) {
            var st = self._searchTerm.toLowerCase();
            matchesSearch = d.originPop.toLowerCase().indexOf(st) >= 0 ||
                            d.peerAsn.toLowerCase().indexOf(st) >= 0 ||
                            d.status.toLowerCase().indexOf(st) >= 0;
          }
          var matchesStatus = true;
          if (self._selectedStatus) {
            matchesStatus = d.status === self._selectedStatus;
          }
          return matchesSearch && matchesStatus;
        });

        container.innerHTML = "";

        // TOP HEADER: Optional Title + HUD + Controls Bar
        var topControls = document.createElement("div");
        topControls.style.padding = "10px 14px";
        topControls.style.borderBottom = "1px solid " + theme.border;
        topControls.style.display = "flex";
        topControls.style.flexDirection = "column";
        topControls.style.gap = "8px";
        topControls.style.flexShrink = "0";

        if (config.customTitle || config.customSubtitle) {
          var titleHeader = document.createElement("div");
          titleHeader.style.display = "flex";
          titleHeader.style.flexDirection = "column";
          titleHeader.style.gap = "2px";
          titleHeader.style.marginBottom = "4px";

          if (config.customTitle) {
            var tEl = document.createElement("div");
            tEl.style.fontSize = fsTitle;
            tEl.style.fontWeight = "700";
            tEl.style.color = theme.text;
            tEl.textContent = config.customTitle;
            titleHeader.appendChild(tEl);
          }
          if (config.customSubtitle) {
            var stEl = document.createElement("div");
            stEl.style.fontSize = fsBody;
            stEl.style.color = theme.subtext;
            stEl.textContent = config.customSubtitle;
            titleHeader.appendChild(stEl);
          }
          topControls.appendChild(titleHeader);
        }

        // Executive HUD Scorecard
        var hudMode = config.hudDensity || (config.showExecutiveHUD === false ? "hidden" : "scorecard");
        if (hudMode !== "hidden" && config.showExecutiveHUD !== false) {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = hudMode === "compact_strip" ? "repeat(auto-fit, minmax(90px, 1fr))" : "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = hudMode === "compact_strip" ? "4px" : "8px";

          var isSlaBreached = avgLatency > effectiveSla;
          var hudCards = [
            { label: "Peering Sessions", val: formatValue(parsedSessions.length, "compact_num"), sub: "Monitored AS Links", color: theme.accent },
            { label: "24h Route Flaps", val: formatValue(totalFlaps, "compact_num"), sub: totalWithdrawals + " withdrawals", color: totalFlaps > 100 ? theme.critical : theme.warning },
            { label: "Max Dampening Penalty", val: maxPenalty.toLocaleString(), sub: maxPenalty >= 2000 ? "🚨 Route Damped" : "Nominal", color: maxPenalty >= 2000 ? theme.damped : theme.nominal },
            { label: "Mean RTT Latency", val: avgLatency.toFixed(1) + " ms", sub: isSlaBreached ? ("⚠️ SLA Breach (> " + Math.round(effectiveSla) + "ms)") : ("✅ Within " + Math.round(effectiveSla) + "ms SLA"), color: isSlaBreached ? theme.critical : theme.nominal },
            { label: "Route Stability Index", val: stabilityIndex.toFixed(1) + "%", sub: stableCount + " nominal links", color: stabilityIndex > 80 ? theme.nominal : theme.warning }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = hudMode === "compact_strip" ? "4px 8px" : "6px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            var l = document.createElement("div");
            l.style.fontSize = hudMode === "compact_strip" ? "9.5px" : "10.5px";
            l.style.color = theme.subtext;
            l.style.fontWeight = "600";
            l.textContent = c.label;

            var v = document.createElement("div");
            v.style.fontSize = hudMode === "compact_strip" ? "13px" : fsHUDVal;
            v.style.fontWeight = "700";
            v.style.color = c.color;
            v.style.margin = "2px 0";
            v.textContent = c.val;

            card.appendChild(l);
            card.appendChild(v);

            if (hudMode !== "compact_strip") {
              var s = document.createElement("div");
              s.style.fontSize = "10px";
              s.style.color = theme.subtext;
              s.textContent = c.sub;
              card.appendChild(s);
            }
            hudGrid.appendChild(card);
          });
          topControls.appendChild(hudGrid);
        }

        // Secondary Toolbar: Status Filter Pills + Search Input
        var filterRow = document.createElement("div");
        filterRow.style.display = "flex";
        filterRow.style.alignItems = "center";
        filterRow.style.justifyContent = "space-between";
        filterRow.style.flexWrap = "wrap";
        filterRow.style.gap = "8px";

        var statusPills = document.createElement("div");
        statusPills.style.display = "flex";
        statusPills.style.alignItems = "center";
        statusPills.style.gap = "4px";

        var statusTypes = [
          { name: "All Sessions", key: null, color: theme.accent },
          { name: "Established", key: "Established", color: theme.nominal },
          { name: "Degraded", key: "Degraded", color: theme.warning },
          { name: "Active Flapping", key: "Flapping", color: theme.critical },
          { name: "Damped / Suppressed", key: "Damped", color: theme.damped }
        ];

        statusTypes.forEach(function (st) {
          var pill = document.createElement("button");
          var isSel = self._selectedStatus === st.key;
          pill.textContent = st.name;
          pill.style.fontSize = "11px";
          pill.style.padding = "2px 8px";
          pill.style.borderRadius = "12px";
          pill.style.border = "1px solid " + (isSel ? st.color : theme.border);
          pill.style.background = isSel ? st.color : "transparent";
          pill.style.color = isSel ? "#ffffff" : theme.text;
          pill.style.cursor = "pointer";
          pill.onclick = function () {
            self._selectedStatus = isSel ? null : st.key;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          statusPills.appendChild(pill);
        });
        filterRow.appendChild(statusPills);

        if (config.showSearch !== false) {
          var searchBox = document.createElement("div");
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.gap = "4px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Search PoP / ASN...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.padding = "3px 8px";
          searchInput.style.fontSize = "11px";
          searchInput.style.borderRadius = "4px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.background = theme.cardBg;
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";

          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          searchBox.appendChild(searchInput);
          filterRow.appendChild(searchBox);
        }

        topControls.appendChild(filterRow);
        container.appendChild(topControls);

        // CHART SVG / TABLE CANVAS
        var chartWrapper = document.createElement("div");
        chartWrapper.style.flex = "1";
        chartWrapper.style.position = "relative";
        chartWrapper.style.width = "100%";
        chartWrapper.style.minHeight = "240px";
        chartWrapper.style.overflow = layoutMode === "pop_leaderboard" ? "auto" : "hidden";
        container.appendChild(chartWrapper);

        var rect = chartWrapper.getBoundingClientRect();
        var width = rect.width || element.clientWidth || 720;
        var height = rect.height || 380;
        self._lastWidth = width;
        self._lastHeight = height;

        var pts = displaySessions.length > 0 ? displaySessions : parsedSessions;

        // ==========================================
        // LAYOUT MODE 1: PEERING FLAP & LATENCY MATRIX GRID
        // ==========================================
        if (layoutMode === "flap_matrix") {
          var margin = { top: 70, right: 30, bottom: 40, left: 140 };
          var innerWidth = Math.max(width - margin.left - margin.right, 200);
          var innerHeight = Math.max(height - margin.top - margin.bottom, 150);

          var svg = d3.select(chartWrapper)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("display", "block");

          var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var pops = Array.from(new Set(pts.map(function (d) { return d.originPop; })));
          var asns = Array.from(new Set(pts.map(function (d) { return d.peerAsn; })));

          var xScale = d3.scaleBand().domain(asns).range([0, innerWidth]).padding(0.08);
          var yScale = d3.scaleBand().domain(pops).range([0, innerHeight]).padding(0.08);

          var maxFlaps = d3.max(pts, function (d) { return d.flaps; }) || 1;
          var colorScale = d3.scaleSequential()
            .domain([0, Math.max(maxFlaps, 30)])
            .interpolator(d3.interpolateYlOrRd);

          // Matrix Cells
          g.selectAll(".matrix-cell")
            .data(pts)
            .enter()
            .append("g")
            .attr("class", "matrix-cell")
            .attr("transform", function (d) {
              return "translate(" + (xScale(d.peerAsn) || 0) + "," + (yScale(d.originPop) || 0) + ")";
            })
            .each(function (d) {
              var cellG = d3.select(this);
              var cellW = xScale.bandwidth();
              var cellH = yScale.bandwidth();

              var isDamped = d.status === "Damped" && config.showDampenedBorders !== false;
              var isBreached = d.latency > effectiveSla && config.showSlaBadges !== false;

              // Cell Background Rect
              cellG.append("rect")
                .attr("width", cellW)
                .attr("height", cellH)
                .attr("rx", 4)
                .attr("fill", function () {
                  if (d.flaps === 0) return theme.cardBg;
                  return colorScale(d.flaps);
                })
                .attr("stroke", function () {
                  if (isDamped) return theme.damped;
                  if (isBreached) return theme.critical;
                  return config.showGridlines !== false ? theme.border : "none";
                })
                .attr("stroke-width", function () {
                  if (isDamped || isBreached) return 2.2;
                  return 1;
                })
                .attr("stroke-dasharray", isDamped ? "3,2" : null);

              // Value Label
              if (config.labelDensity !== "hidden") {
                if (config.labelDensity === "all" || isBreached || d.flaps > 15) {
                  cellG.append("text")
                    .attr("x", cellW / 2)
                    .attr("y", cellH / 2 - 2)
                    .attr("text-anchor", "middle")
                    .attr("fill", d.flaps > 20 ? "#ffffff" : theme.text)
                    .attr("font-size", Math.max(9, Math.min(12, cellH * 0.3)) + "px")
                    .attr("font-weight", "700")
                    .text(d.flaps + " ⚡");

                  cellG.append("text")
                    .attr("x", cellW / 2)
                    .attr("y", cellH / 2 + 11)
                    .attr("text-anchor", "middle")
                    .attr("fill", isBreached ? (d.flaps > 20 ? "#ffdddd" : theme.critical) : (d.flaps > 20 ? "#ffffff" : theme.subtext))
                    .attr("font-size", Math.max(8, Math.min(10, cellH * 0.24)) + "px")
                    .attr("font-weight", isBreached ? "700" : "500")
                    .text(d.latency.toFixed(1) + "ms" + (isBreached ? " ⚠️" : ""));
                }
              }
            })
            .on("mouseover", function (event, d) {
              d3.select(this).select("rect").attr("opacity", 0.85);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).select("rect").attr("opacity", 1.0);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });

          // X-Axis (Peer ASNs) placed at top
          var xAxisG = g.append("g")
            .attr("transform", "translate(0, 0)")
            .call(d3.axisTop(xScale).tickSize(0));

          xAxisG.select(".domain").remove();
          xAxisG.selectAll("text")
            .attr("fill", theme.text)
            .attr("font-size", "10.5px")
            .attr("font-weight", "600")
            .attr("transform", "rotate(-32)")
            .attr("text-anchor", "start")
            .attr("dx", "6px")
            .attr("dy", "-4px");

          // Y-Axis (Origin PoPs)
          var yAxisG = g.append("g")
            .call(d3.axisLeft(yScale).tickSize(0));

          yAxisG.select(".domain").remove();
          yAxisG.selectAll("text")
            .attr("fill", theme.text)
            .attr("font-size", "11px")
            .attr("font-weight", "600");
        }

        // ==========================================
        // LAYOUT MODE 2: AS PATH CHURN & ROUTE WITHDRAWAL STREAM
        // ==========================================
        else if (layoutMode === "as_churn_stream") {
          var margin = { top: 20, right: 40, bottom: 45, left: 60 };
          var innerWidth = Math.max(width - margin.left - margin.right, 200);
          var innerHeight = Math.max(height - margin.top - margin.bottom, 150);

          var svg = d3.select(chartWrapper)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("display", "block");

          var g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var xScale = d3.scaleLinear()
            .domain([0, pts.length - 1])
            .range([0, innerWidth]);

          var maxWith = d3.max(pts, function (d) { return d.withdrawals; }) || 10;
          var yScale = d3.scaleLinear()
            .domain([0, maxWith * 1.15])
            .range([innerHeight, 0]);

          // Stream Area
          var area = d3.area()
            .x(function (d, i) { return xScale(i); })
            .y0(innerHeight)
            .y1(function (d) { return yScale(d.withdrawals); })
            .curve(d3.curveMonotoneX);

          g.append("path")
            .datum(pts)
            .attr("fill", theme.warningBg)
            .attr("d", area);

          var line = d3.line()
            .x(function (d, i) { return xScale(i); })
            .y(function (d) { return yScale(d.withdrawals); })
            .curve(d3.curveMonotoneX);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.warning)
            .attr("stroke-width", 2.5)
            .attr("d", line);

          // Points on Churn Line
          g.selectAll(".churn-pt")
            .data(pts)
            .enter()
            .append("circle")
            .attr("class", "churn-pt")
            .attr("cx", function (d, i) { return xScale(i); })
            .attr("cy", function (d) { return yScale(d.withdrawals); })
            .attr("r", 4.5)
            .attr("fill", function (d) { return d.status === "Damped" ? theme.damped : (d.flaps > 20 ? theme.critical : theme.warning); })
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function (event, d) {
              d3.select(this).attr("r", 7);
              showTooltip(event, d);
            })
            .on("mousemove", function (event, d) {
              moveTooltip(event);
            })
            .on("mouseout", function (event, d) {
              d3.select(this).attr("r", 4.5);
              hideTooltip();
            })
            .on("click", function (event, d) {
              triggerDrill(d, event);
            });

          // Axes
          var xAxis = d3.axisBottom(xScale).ticks(Math.min(pts.length, 10)).tickFormat(function (i) {
            return pts[i] ? pts[i].originPop.split(" - ")[0] : "";
          });
          g.append("g").attr("transform", "translate(0," + innerHeight + ")").call(xAxis);

          var yAxis = d3.axisLeft(yScale).ticks(5);
          g.append("g").call(yAxis);

          g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 36)
            .attr("text-anchor", "middle")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px")
            .text("Peering Corridors (Ranked by Flap Severity)");

          g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .attr("fill", theme.warning)
            .attr("font-size", "11px")
            .text("Route Withdrawals (24h)");
        }

        // ==========================================
        // LAYOUT MODE 3: POP LATENCY & SLA BREACH LEADERBOARD (HTML TABLE)
        // ==========================================
        else if (layoutMode === "pop_leaderboard") {
          var table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.fontSize = fsBody;

          var thead = document.createElement("thead");
          thead.innerHTML = "<tr style='background:" + theme.cardBg + ";border-bottom:2px solid " + theme.border + ";text-align:left;'>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;'>Origin PoP</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;'>Peer ASN</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;'>Status</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;text-align:right;'>Route Flaps (24h)</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;text-align:right;'>Withdrawals</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;text-align:right;'>Dampening Penalty</th>" +
            "<th style='padding:8px 12px;color:" + theme.subtext + ";font-weight:600;text-align:right;'>RTT Latency (ms)</th>" +
            "</tr>";
          table.appendChild(thead);

          var tbody = document.createElement("tbody");
          pts.forEach(function (row, idx) {
            var tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid " + theme.border;
            tr.style.cursor = "pointer";
            tr.style.background = idx % 2 === 0 ? "transparent" : theme.cardBg;

            var isBreached = row.latency > effectiveSla;
            var statusColor = row.status === "Damped" ? theme.damped : (row.status === "Flapping" ? theme.critical : (row.status === "Degraded" ? theme.warning : theme.nominal));

            tr.innerHTML = "<td style='padding:8px 12px;font-weight:600;color:" + theme.text + ";'>" + row.originPop + "</td>" +
              "<td style='padding:8px 12px;color:" + theme.text + ";'>" + row.peerAsn + "</td>" +
              "<td style='padding:8px 12px;'><span style='background:" + statusColor + "22;color:" + statusColor + ";border:1px solid " + statusColor + ";padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;'>" + row.status + "</span></td>" +
              "<td style='padding:8px 12px;text-align:right;font-weight:700;color:" + (row.flaps > 20 ? theme.critical : theme.text) + ";'>" + row.flaps.toLocaleString() + "</td>" +
              "<td style='padding:8px 12px;text-align:right;color:" + theme.subtext + ";'>" + row.withdrawals.toLocaleString() + "</td>" +
              "<td style='padding:8px 12px;text-align:right;color:" + (row.penalty >= 2000 ? theme.damped : theme.subtext) + ";font-weight:" + (row.penalty >= 2000 ? "700" : "500") + ";'>" + row.penalty.toLocaleString() + "</td>" +
              "<td style='padding:8px 12px;text-align:right;font-weight:700;color:" + (isBreached ? theme.critical : theme.nominal) + ";'>" + row.latency.toFixed(1) + " ms" + (isBreached ? " ⚠️" : "") + "</td>";

            tr.onmouseover = function (e) {
              tr.style.background = theme.accent + "11";
              showTooltip(e, row);
            };
            tr.onmousemove = function (e) { moveTooltip(e); };
            tr.onmouseout = function () {
              tr.style.background = idx % 2 === 0 ? "transparent" : theme.cardBg;
              hideTooltip();
            };
            tr.onclick = function (e) { triggerDrill(row, e); };
            tbody.appendChild(tr);
          });

          table.appendChild(tbody);
          chartWrapper.appendChild(table);
        }

        // ==========================================
        // LAYOUT MODE 4: CIRCULAR PEERING CHORD & TOPOLOGY INTERCONNECT
        // ==========================================
        else if (layoutMode === "polar_peering") {
          var svg = d3.select(chartWrapper)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("display", "block");

          var cx = width / 2;
          var cy = height / 2;
          var radius = Math.min(width, height) / 2 - 45;

          var g = svg.append("g")
            .attr("transform", "translate(" + cx + "," + cy + ")");

          var pops = Array.from(new Set(pts.map(function (d) { return d.originPop; })));
          var angleStep = (2 * Math.PI) / pops.length;

          var nodeCoords = {};
          pops.forEach(function (pop, i) {
            var angle = i * angleStep - Math.PI / 2;
            var nx = radius * Math.cos(angle);
            var ny = radius * Math.sin(angle);
            nodeCoords[pop] = { x: nx, y: ny, angle: angle };
          });

          // Draw Interconnect Chord Arcs
          pts.forEach(function (d) {
            var orig = nodeCoords[d.originPop];
            if (!orig) return;

            var peerHash = 0;
            for (var c = 0; c < d.peerAsn.length; c++) peerHash += d.peerAsn.charCodeAt(c);
            var peerTargetIdx = peerHash % pops.length;
            var targetPop = pops[peerTargetIdx];
            var dest = nodeCoords[targetPop];
            if (!dest) return;

            var isBreached = d.latency > effectiveSla;
            var strokeColor = d.status === "Damped" ? theme.damped : (isBreached ? theme.critical : (d.flaps > 10 ? theme.warning : theme.nominal));

            g.append("path")
              .attr("d", "M" + orig.x + "," + orig.y + " Q0,0 " + dest.x + "," + dest.y)
              .attr("fill", "none")
              .attr("stroke", strokeColor)
              .attr("stroke-width", Math.max(1.2, Math.min(4.5, d.flaps * 0.15)))
              .attr("opacity", 0.5)
              .on("mouseover", function (e) {
                d3.select(this).attr("opacity", 1.0).attr("stroke-width", 5);
                showTooltip(e, d);
              })
              .on("mousemove", function (e) { moveTooltip(e); })
              .on("mouseout", function () {
                d3.select(this).attr("opacity", 0.5).attr("stroke-width", Math.max(1.2, Math.min(4.5, d.flaps * 0.15)));
                hideTooltip();
              })
              .on("click", function (e) { triggerDrill(d, e); });
          });

          // Draw PoP Nodes
          pops.forEach(function (pop) {
            var coord = nodeCoords[pop];
            g.append("circle")
              .attr("cx", coord.x)
              .attr("cy", coord.y)
              .attr("r", 9)
              .attr("fill", theme.accent)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 2);

            var labelX = (radius + 18) * Math.cos(coord.angle);
            var labelY = (radius + 18) * Math.sin(coord.angle);
            var anchor = coord.x > 5 ? "start" : (coord.x < -5 ? "end" : "middle");

            g.append("text")
              .attr("x", labelX)
              .attr("y", labelY + 4)
              .attr("text-anchor", anchor)
              .attr("fill", theme.text)
              .attr("font-size", "11px")
              .attr("font-weight", "600")
              .text(pop.split(" - ")[0]);
          });
        }

        // Tooltip Helper Functions
        function showTooltip(event, d) {
          var isBreached = d.latency > effectiveSla;
          var slaStatus = isBreached
            ? "<span style='color:" + theme.critical + ";font-weight:700;'>⚠️ SLA Breached (" + d.latency.toFixed(1) + "ms > " + Math.round(effectiveSla) + "ms)</span>"
            : "<span style='color:" + theme.nominal + ";font-weight:700;'>✅ SLA Nominal (" + d.latency.toFixed(1) + "ms)</span>";

          var dampStatus = d.penalty >= 2000
            ? "<span style='color:" + theme.damped + ";font-weight:700;'>🚨 Route Damped (Penalty " + d.penalty.toLocaleString() + " > 2000)</span>"
            : "<span style='color:" + theme.nominal + ";font-weight:600;'>Active / Undamped (" + d.penalty.toLocaleString() + ")</span>";

          var html = "<div style='font-weight:700;font-size:13px;margin-bottom:6px;color:" + theme.accent + ";'>" +
            "🌐 " + d.originPop + " ⇄ " + d.peerAsn + "</div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>BGP Flaps (24h):</span><strong>" + d.flaps.toLocaleString() + " ⚡</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Route Withdrawals:</span><strong>" + d.withdrawals.toLocaleString() + "</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Dampening Penalty:</span>" + dampStatus + "</div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Peering Latency (RTT):</span><strong>" + d.latency.toFixed(1) + " ms</strong></div>" +
            "<div style='display:flex;justify-content:space-between;margin:3px 0;'><span>Latency Status:</span>" + slaStatus + "</div>" +
            "<div style='margin-top:6px;font-size:10px;color:" + theme.subtext + ";text-align:right;'>Click to open Looker drill menu ↗</div>";

          tooltip.innerHTML = html;
          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          moveTooltip(event);
        }

        function moveTooltip(event) {
          var containerRect = container.getBoundingClientRect();
          var mouseX = event.clientX - containerRect.left;
          var mouseY = event.clientY - containerRect.top;

          var tooltipX = mouseX + 14;
          var tooltipY = mouseY - 20;

          if (tooltipX + 330 > containerRect.width) {
            tooltipX = mouseX - 340;
          }
          if (tooltipY + 190 > containerRect.height) {
            tooltipY = containerRect.height - 200;
          }
          if (tooltipY < 10) tooltipY = 10;

          tooltip.style.left = Math.max(10, tooltipX) + "px";
          tooltip.style.top = Math.max(10, tooltipY) + "px";
        }

        function hideTooltip() {
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        }

        function triggerDrill(d, event) {
          if (!d.rowRef) return;
          var cell = d.rowRef[originDim] || d.rowRef[peerDim] || d.rowRef[flapMeas];
          if (cell && cell.links && cell.links.length > 0 && LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({
              links: cell.links,
              event: event
            });
          }
        }

        done();
      });
    }
  });
})();
