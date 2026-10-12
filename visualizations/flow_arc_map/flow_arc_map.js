
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
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
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
      // SECTION 2: STYLE (Strictly minimized tab)
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
          arcPrimary: config.customPrimaryHex.trim()
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
        addKpi("Hubs -> Endpoints", activeOriginsCount + " -> " + activeDestsCount, theme.destNode);
        if (targetMode !== "none" && targetVal > 0) {
          var passRate = activeRoutes.length > 0 ? ((aboveTargetCount / activeRoutes.length) * 100).toFixed(0) : "0";
          var targetColor = polarity === "higher_is_better" ? (passRate >= 70 ? "#10b981" : "#f59e0b") : (passRate >= 70 ? "#ef4444" : "#10b981");
          addKpi(config.referenceLineLabel || "Benchmark", passRate + "% Met", targetColor);
        }
        if (anomalyCount > 0 && !isCompactHud) {
          addKpi("Anomalies", anomalyCount + " Corridors", "#f43f5e");
        }
        if (latencyMeas && !isCompactHud) {
          addKpi("Avg Transit", avgTransit.toFixed(1) + "d", theme.particle);
        }
      }


