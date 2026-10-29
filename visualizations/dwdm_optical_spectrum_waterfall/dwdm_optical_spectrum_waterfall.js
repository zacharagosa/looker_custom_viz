/**
 * DWDM Optical Spectrum & Span Attenuation Waterfall
 * Enterprise-grade Dense Wavelength Division Multiplexing (DWDM) optical power spectrum,
 * ITU-T C-Band channel waterfall, optical attenuation (dB/km) envelope, and OSNR Q-Factor constellation.
 * Built with D3.js v7 for Looker Custom Visualizations v2 API.
 *
 * Resolves Buganizer Cloud Blockers b/482019481, b/394109282, and b/520193847 for optical transport networks,
 * hyperscale DCIs, and carrier fiber backbones (Zayo, Google Cloud Interconnect, Lumen, Nokia, Ciena).
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
      waterfallFill: "rgba(245, 131, 31, 0.18)",
      waterfallStroke: "#f5831f",
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
      text: "#1e293b",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#1e293b",
      hudSubtext: "#64748b",
      primary: "#1a73e8",
      nominal: "#188038",
      warning: "#f29900",
      critical: "#d93025",
      waterfallFill: "rgba(26, 115, 232, 0.15)",
      waterfallStroke: "#1a73e8",
      grid: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    optical_laser: {
      name: "Coherent Laser Optics (Dark Cyan & Emerald)",
      isDark: true,
      bg: "#060913",
      cardBg: "#0c1322",
      border: "#18233c",
      text: "#f0fdfa",
      subtext: "#5eead4",
      hudBg: "rgba(12, 19, 34, 0.95)",
      hudBorder: "#134e4a",
      hudText: "#f0fdfa",
      hudSubtext: "#5eead4",
      primary: "#06b6d4",
      nominal: "#10b981",
      warning: "#eab308",
      critical: "#f43f5e",
      waterfallFill: "rgba(6, 182, 212, 0.20)",
      waterfallStroke: "#06b6d4",
      grid: "#132337",
      tooltipBg: "rgba(12, 19, 34, 0.98)",
      tooltipBorder: "#06b6d4"
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
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      primary: "#2563eb",
      nominal: "#10b981",
      warning: "#f59e0b",
      critical: "#ef4444",
      waterfallFill: "rgba(37, 99, 235, 0.16)",
      waterfallStroke: "#2563eb",
      grid: "#f1f5f9",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Neon Green & Crimson)",
      isDark: true,
      bg: "#090d16",
      cardBg: "#111827",
      border: "#1f293d",
      text: "#f9fafb",
      subtext: "#9ca3af",
      hudBg: "rgba(17, 24, 39, 0.95)",
      hudBorder: "#374151",
      hudText: "#ffffff",
      hudSubtext: "#9ca3af",
      primary: "#00ffcc",
      nominal: "#00ffcc",
      warning: "#ffaa00",
      critical: "#ff0055",
      waterfallFill: "rgba(0, 255, 204, 0.18)",
      waterfallStroke: "#00ffcc",
      grid: "#1f293d",
      tooltipBg: "rgba(15, 23, 42, 0.98)",
      tooltipBorder: "#00ffcc"
    },
    wellverse_healthcare: {
      name: "Wellverse Telecom (Light Teal & Navy)",
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
      primary: "#059669",
      nominal: "#059669",
      warning: "#ea580c",
      critical: "#dc2626",
      waterfallFill: "rgba(5, 150, 105, 0.18)",
      waterfallStroke: "#059669",
      grid: "#f0fdf4",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "decimal_3") return num.toFixed(3);
    if (fmt === "decimal_2") return num.toFixed(2);
    if (fmt === "raw") return String(num);
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "dwdm_optical_spectrum_waterfall",
    label: "DWDM Optical Spectrum & Span Attenuation Waterfall",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Optical Analysis Mode",
        display: "select",
        values: [
          { "DWDM C-Band Channel Power Spectrum (Waterfall 3D)": "spectral_waterfall" },
          { "Span Distance vs Attenuation Loss Envelope (dB/km)": "span_attenuation_envelope" },
          { "OSNR (dB) vs Q-Factor & BER Constellation Matrix": "osnr_qfactor_constellation" },
          { "Optical Route Health & Telemetry Scorecard Matrix": "optical_health_matrix" }
        ],
        default: "spectral_waterfall",
        section: "Display",
        order: 1
      },
      corridorDimOverride: {
        type: "string",
        label: "Corridor / Route Dimension",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      fiberTypeDimOverride: {
        type: "string",
        label: "Fiber Type Dimension",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      distanceDimOverride: {
        type: "string",
        label: "Route Distance Dimension / Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      attenuationMeasOverride: {
        type: "string",
        label: "Attenuation Loss (dB/km) Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      osnrMeasOverride: {
        type: "string",
        label: "OSNR (dB) Measure",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      anomalyCountMeasOverride: {
        type: "string",
        label: "Optical Anomaly Count Measure",
        display: "select",
        values: [{ "Auto / None (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      targetGoalMode: {
        type: "string",
        label: "Attenuation Benchmark Target Mode",
        display: "select",
        values: [
          { "ITU-T G.652.D Spec (0.20 dB/km)": "g652d_standard" },
          { "ITU-T G.654.E Ultra-Low Loss (0.17 dB/km)": "g654e_ull" },
          { "Dataset Mean Attenuation": "dataset_mean" },
          { "Dataset Median Attenuation": "dataset_median" },
          { "P90 Loss Anomaly Threshold": "percentile_p90" },
          { "Fixed Custom Threshold": "fixed_threshold" },
          { "None / Hide Target Line": "none" }
        ],
        default: "g652d_standard",
        section: "Display",
        order: 8
      },
      fixedAttenuationThreshold: {
        type: "number",
        label: "Fixed Attenuation Threshold (dB/km)",
        default: 0.22,
        section: "Display",
        order: 9
      },
      osnrCriticalThreshold: {
        type: "number",
        label: "Critical OSNR Threshold (dB)",
        default: 20.0,
        section: "Display",
        order: 10
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "ITU-T G.652.D Spec (0.20 dB/km)",
        section: "Display",
        order: 11
      },
      sortOrder: {
        type: "string",
        label: "Route Sort Order",
        display: "select",
        values: [
          { "Highest Attenuation Loss First": "attenuation_desc" },
          { "Lowest Attenuation Loss First (Healthiest)": "attenuation_asc" },
          { "Lowest OSNR Margin First (Highest Risk)": "osnr_asc" },
          { "Highest Anomalies Detected First": "anomalies_desc" },
          { "Alphabetical by Corridor Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "attenuation_desc",
        section: "Display",
        order: 12
      },
      topNLimit: {
        type: "string",
        label: "Top-N Corridor Entity Limit",
        display: "select",
        values: [
          { "All Corridors": "all" },
          { "Top 5 Corridors": "5" },
          { "Top 8 Corridors": "8" },
          { "Top 10 Corridors": "10" },
          { "Top 12 Corridors": "12" },
          { "Top 16 Corridors": "16" }
        ],
        default: "all",
        section: "Display",
        order: 13
      },
      rollupOthers: {
        type: "boolean",
        label: "Rollup Remaining Corridors as 'Other'",
        default: true,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero & Null Attenuation Rows",
        default: true,
        section: "Display",
        order: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD",
        display: "select",
        values: [
          { "Full Scorecard (5 Cards)": "scorecard" },
          { "Compact Metric Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 16
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "All Corridor Labels": "all" },
          { "Critical Loss Peaks Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 17
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
        default: "",
        section: "Display",
        order: 18
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Enable Corridor Search Bar",
        default: true,
        section: "Display",
        order: 20
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Zayo Telecom (Dark Slate & Orange)": "zayo_telecom" },
          { "Google Enterprise (Light)": "google_enterprise" },
          { "Coherent Laser Optics (Dark Cyan)": "optical_laser" },
          { "Modern Studio Slate (Light)": "modern_slate" },
          { "Cyberpunk Dark (Neon Green & Crimson)": "cyberpunk_dark" },
          { "Wellverse Telecom (Light Teal & Navy)": "wellverse_healthcare" },
          { "Custom Hex Colors": "custom" }
        ],
        default: "zayo_telecom",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Carrier Hex",
        display: "color",
        default: "#f5831f",
        section: "Style",
        order: 2
      },
      customNominalColor: {
        type: "string",
        label: "Custom Nominal / Pass Hex",
        display: "color",
        default: "#10b981",
        section: "Style",
        order: 3
      },
      customWarningColor: {
        type: "string",
        label: "Custom Warning / Alert Hex",
        display: "color",
        default: "#f59e0b",
        section: "Style",
        order: 4
      },
      customCriticalColor: {
        type: "string",
        label: "Custom Critical Loss Hex",
        display: "color",
        default: "#ef4444",
        section: "Style",
        order: 5
      },
      metricPolarity: {
        type: "string",
        label: "Attenuation Metric Polarity",
        display: "select",
        values: [
          { "Lower Attenuation Loss is Better": "lower_is_better" },
          { "Higher is Better": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 6
      },
      fontScale: {
        type: "string",
        label: "Typography Scale",
        display: "select",
        values: [
          { "Compact (85%)": "compact" },
          { "Standard (100%)": "standard" },
          { "Large Presentation (120%)": "large_presentation" }
        ],
        default: "standard",
        section: "Style",
        order: 7
      },
      valueFormat: {
        type: "string",
        label: "Attenuation Formatting",
        display: "select",
        values: [
          { "High Precision 3 Decimals (0.198 dB/km)": "decimal_3" },
          { "2 Decimals (0.20 dB/km)": "decimal_2" },
          { "Compact Numbers (1.2K)": "compact_num" },
          { "Raw Unformatted": "raw" }
        ],
        default: "decimal_3",
        section: "Style",
        order: 8
      },
      showWaterfallRibbons: {
        type: "boolean",
        label: "Show 3D Isometric Elevation Shading",
        default: true,
        section: "Style",
        order: 9
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
      container.className = "looker-dwdm-optical-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "looker-dwdm-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "320px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._lastWidth = 0;
      this._lastHeight = 0;

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

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        corridorDimOverride: { role: "dimension", defaultIdx: 0 },
        fiberTypeDimOverride: { role: "dimension", defaultIdx: 1 },
        distanceDimOverride: { role: "any", defaultIdx: 2 },
        attenuationMeasOverride: { role: "measure", defaultIdx: 0 },
        osnrMeasOverride: { role: "measure", defaultIdx: 1 },
        anomalyCountMeasOverride: { role: "measure", defaultIdx: 2 }
      };

      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;
      var anyFields = dims.concat(meas);

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
        var pool = spec.role === "dimension" ? dims : (spec.role === "measure" ? meas : anyFields);
        var optList = [];

        var autoResolved = null;
        if (spec.defaultIdx >= 0 && pool[spec.defaultIdx]) {
          autoResolved = pool[spec.defaultIdx];
        }
        var autoLabel = autoResolved
          ? "Auto \u2192 " + fieldLabel(autoResolved)
          : (spec.defaultIdx < 0 ? "Auto / None" : "Auto (first available)");
        var firstChoice = {};
        firstChoice[autoLabel] = "";
        optList.push(firstChoice);

        pool.forEach(function (fld) {
          var choice = {};
          choice[fieldLabel(fld) + " (" + fld.name + ")"] = fld.name;
          optList.push(choice);
        });

        newOptions[key] = Object.assign({}, newOptions[key], {
          values: optList,
          default: ""
        });
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      var container = this._container;
      var tooltip = this._tooltip;
      var self = this;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No optical DWDM telemetry data returned.</span></div>";
        done();
        return;
      }

      var f = queryResponse.fields;
      var rawDims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var rawMeas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!rawMeas.length && f.table_calculations && f.table_calculations.length) rawMeas = f.table_calculations;
      var anyFields = rawDims.concat(rawMeas);

      function resolveField(list, overrideVal, defaultIdx) {
        if (!list || !list.length) return null;
        if (overrideVal && typeof overrideVal === "string" && overrideVal.trim() !== "") {
          var trimmed = overrideVal.trim();
          var match = list.find(function (item) {
            return item.name === trimmed || item.label === trimmed || item.label_short === trimmed;
          });
          if (match) return match.name;
          var num = parseInt(trimmed, 10);
          if (!isNaN(num)) {
            var idx = num > 0 ? num - 1 : 0;
            if (list[idx]) return list[idx].name;
          }
        }
        if (defaultIdx !== undefined && defaultIdx >= 0 && list[defaultIdx]) {
          return list[defaultIdx].name;
        }
        return null;
      }

      var corridorDim = resolveField(rawDims, config.corridorDimOverride, 0);
      var fiberTypeDim = resolveField(rawDims, config.fiberTypeDimOverride, 1);
      var distanceField = resolveField(anyFields, config.distanceDimOverride, 2);
      var attenuationMeas = resolveField(rawMeas, config.attenuationMeasOverride, 0);
      var osnrMeas = resolveField(rawMeas, config.osnrMeasOverride, 1);
      var anomalyMeas = resolveField(rawMeas, config.anomalyCountMeasOverride, 2);

      if (!corridorDim || !attenuationMeas) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;padding:20px;text-align:center;'>" +
          "<span>⚠️ <strong>Configuration Required:</strong> DWDM Optical Spectrum Analyzer requires at least 1 Route Corridor Dimension and 1 Attenuation Loss Measure.</span></div>";
        done();
        return;
      }

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "zayo_telecom";
        var baseTheme = THEMES[themeKey] || THEMES.zayo_telecom;
        var theme = Object.assign({}, baseTheme);

        if (themeKey === "custom" || config.customPrimaryColor) {
          if (config.customPrimaryColor) {
            theme.primary = config.customPrimaryColor;
            theme.waterfallStroke = config.customPrimaryColor;
            theme.waterfallFill = config.customPrimaryColor + "33";
          }
          if (config.customNominalColor) theme.nominal = config.customNominalColor;
          if (config.customWarningColor) theme.warning = config.customWarningColor;
          if (config.customCriticalColor) theme.critical = config.customCriticalColor;
        }

        var fontScale = config.fontScale === "compact" ? 0.88 : (config.fontScale === "large_presentation" ? 1.18 : 1.0);
        var layoutMode = config.layoutMode || "spectral_waterfall";
        var osnrCritical = Number(config.osnrCriticalThreshold) || 20.0;
        var isLowerBetter = config.metricPolarity !== "higher_is_better";

        container.style.backgroundColor = theme.bg;
        container.style.color = theme.text;
        container.style.fontSize = Math.round(12 * fontScale) + "px";
        tooltip.style.backgroundColor = theme.tooltipBg;
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;

        // 1. Process & Aggregate Rows
        var parsedCorridors = [];
        var totalAnomalies = 0;
        var sumAttenuation = 0;
        var sumOsnr = 0;
        var totalMiles = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var corridorName = row[corridorDim] ? String(row[corridorDim].value) : "Corridor " + (i + 1);
          var fiberType = fiberTypeDim && row[fiberTypeDim] ? String(row[fiberTypeDim].value) : "G.652D Standard";
          var dist = distanceField && row[distanceField] && row[distanceField].value !== null ? Number(row[distanceField].value) : 500;
          var atten = row[attenuationMeas] && row[attenuationMeas].value !== null ? Number(row[attenuationMeas].value) : 0;
          var osnr = osnrMeas && row[osnrMeas] && row[osnrMeas].value !== null ? Number(row[osnrMeas].value) : 28.5;
          var anomalies = anomalyMeas && row[anomalyMeas] && row[anomalyMeas].value !== null ? Number(row[anomalyMeas].value) : 0;

          if (config.suppressZeroNull !== false && atten === 0) continue;

          var isG654E = fiberType.indexOf("654") >= 0;
          var specLoss = isG654E ? 0.17 : 0.20;
          var isElevated = atten > specLoss * 1.05;
          var isCritical = atten > 0.210 || osnr < osnrCritical;

          parsedCorridors.push({
            id: i,
            corridor: corridorName,
            fiberType: fiberType,
            isG654E: isG654E,
            specLoss: specLoss,
            distance: dist,
            attenuation: atten,
            osnr: osnr,
            anomalies: anomalies,
            isElevated: isElevated,
            isCritical: isCritical,
            rowRef: row
          });

          sumAttenuation += atten;
          sumOsnr += osnr;
          totalAnomalies += anomalies;
          totalMiles += dist;
        }

        if (parsedCorridors.length === 0) {
          container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>No valid optical telemetry rows found.</div>";
          done();
          return;
        }

        var avgAttenuation = sumAttenuation / parsedCorridors.length;
        var avgOsnr = sumOsnr / parsedCorridors.length;

        // Determine benchmark target value
        var benchmarkTarget = 0.20;
        var targetMode = config.targetGoalMode || "g652d_standard";
        if (targetMode === "g654e_ull") benchmarkTarget = 0.17;
        else if (targetMode === "dataset_mean") benchmarkTarget = avgAttenuation;
        else if (targetMode === "dataset_median") {
          var sortedAtten = parsedCorridors.map(function (d) { return d.attenuation; }).sort(d3.ascending);
          benchmarkTarget = d3.quantile(sortedAtten, 0.5) || 0.20;
        } else if (targetMode === "percentile_p90") {
          var sortedAtten90 = parsedCorridors.map(function (d) { return d.attenuation; }).sort(d3.ascending);
          benchmarkTarget = d3.quantile(sortedAtten90, 0.9) || 0.21;
        } else if (targetMode === "fixed_threshold") {
          benchmarkTarget = Number(config.fixedAttenuationThreshold) || 0.22;
        }

        // Apply Sorting
        var sortOrder = config.sortOrder || "attenuation_desc";
        if (sortOrder === "attenuation_desc") {
          parsedCorridors.sort(function (a, b) { return b.attenuation - a.attenuation; });
        } else if (sortOrder === "attenuation_asc") {
          parsedCorridors.sort(function (a, b) { return a.attenuation - b.attenuation; });
        } else if (sortOrder === "osnr_asc") {
          parsedCorridors.sort(function (a, b) { return a.osnr - b.osnr; });
        } else if (sortOrder === "anomalies_desc") {
          parsedCorridors.sort(function (a, b) { return b.anomalies - a.anomalies; });
        } else if (sortOrder === "alphabetical") {
          parsedCorridors.sort(function (a, b) { return a.corridor.localeCompare(b.corridor); });
        }

        // Apply Top-N
        var topN = config.topNLimit;
        var topNNum = (topN && topN !== "all") ? parseInt(topN, 10) : 0;
        var displayCorridors = parsedCorridors;
        if (topNNum > 0 && parsedCorridors.length > topNNum) {
          var topItems = parsedCorridors.slice(0, topNNum);
          if (config.rollupOthers !== false) {
            var others = parsedCorridors.slice(topNNum);
            var oAtten = d3.mean(others, function (d) { return d.attenuation; });
            var oOsnr = d3.mean(others, function (d) { return d.osnr; });
            var oAnom = d3.sum(others, function (d) { return d.anomalies; });
            var oDist = d3.sum(others, function (d) { return d.distance; });
            topItems.push({
              id: 999999,
              corridor: "Other Corridors (" + others.length + ")",
              fiberType: "Mixed Spans",
              isG654E: false,
              specLoss: 0.20,
              distance: oDist,
              attenuation: oAtten,
              osnr: oOsnr,
              anomalies: oAnom,
              isElevated: oAtten > 0.205,
              isCritical: oAtten > 0.215,
              rowRef: others[0] ? others[0].rowRef : null
            });
          }
          displayCorridors = topItems;
        }

        // Search Filter
        if (self._searchTerm) {
          displayCorridors = displayCorridors.filter(function (d) {
            return d.corridor.toLowerCase().indexOf(self._searchTerm.toLowerCase()) >= 0;
          });
        }

        // 3. Render UI Shell
        container.innerHTML = "";

        // TOP HEADER: Title + HUD + Controls Bar
        var topControls = document.createElement("div");
        topControls.style.padding = "8px 12px";
        topControls.style.borderBottom = "1px solid " + theme.border;
        topControls.style.display = "flex";
        topControls.style.flexDirection = "column";
        topControls.style.gap = "6px";
        topControls.style.flexShrink = "0";

        if (config.customTitle) {
          var titleBlock = document.createElement("div");
          titleBlock.style.display = "flex";
          titleBlock.style.flexDirection = "column";
          titleBlock.style.gap = "2px";
          var tSpan = document.createElement("div");
          tSpan.style.fontSize = Math.round(14 * fontScale) + "px";
          tSpan.style.fontWeight = "700";
          tSpan.style.color = theme.text;
          tSpan.textContent = config.customTitle;
          titleBlock.appendChild(tSpan);
          if (config.customSubtitle) {
            var stSpan = document.createElement("div");
            stSpan.style.fontSize = Math.round(11 * fontScale) + "px";
            stSpan.style.color = theme.subtext;
            stSpan.textContent = config.customSubtitle;
            titleBlock.appendChild(stSpan);
          }
          topControls.appendChild(titleBlock);
        }

        var hudMode = config.hudMode || "scorecard";
        var degradedCount = parsedCorridors.filter(function (d) { return d.isCritical || d.isElevated; }).length;
        var fleetHealth = degradedCount === 0 ? "🟢 All Routes Nominal" : (degradedCount <= 2 ? "🟡 " + degradedCount + " Corridors Degraded" : "🔴 " + degradedCount + " Critical Losses");

        if (hudMode === "scorecard") {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = "6px";

          var hudCards = [
            { label: "Fleet Avg Attenuation", val: avgAttenuation.toFixed(3) + " dB/km", sub: "Spec: 0.17-0.20 dB/km", color: avgAttenuation <= 0.20 ? theme.nominal : theme.warning },
            { label: "Fleet Avg OSNR", val: avgOsnr.toFixed(1) + " dB", sub: "Min FEC Limit: 15.0 dB", color: avgOsnr >= 24 ? theme.nominal : theme.critical },
            { label: "Monitored Route Miles", val: formatValue(totalMiles, "compact_num") + " mi", sub: parsedCorridors.length + " fiber corridors", color: theme.primary },
            { label: "Optical Anomalies", val: formatValue(totalAnomalies, "compact_num"), sub: "60-day telemetry alerts", color: totalAnomalies > 5000 ? theme.critical : theme.warning },
            { label: "Optical Health Posture", val: fleetHealth, sub: targetMode !== "none" ? "Target: " + benchmarkTarget.toFixed(3) + " dB/km" : "ITU-T Standard", color: degradedCount === 0 ? theme.nominal : theme.critical }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 8px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "2px";

            var l = document.createElement("span");
            l.style.fontSize = Math.round(10 * fontScale) + "px";
            l.style.color = theme.subtext;
            l.style.fontWeight = "600";
            l.textContent = c.label;

            var v = document.createElement("span");
            v.style.fontSize = Math.round(14 * fontScale) + "px";
            v.style.color = c.color;
            v.style.fontWeight = "700";
            v.style.whiteSpace = "nowrap";
            v.style.overflow = "hidden";
            v.style.textOverflow = "ellipsis";
            v.textContent = c.val;

            var s = document.createElement("span");
            s.style.fontSize = Math.round(9 * fontScale) + "px";
            s.style.color = theme.subtext;
            s.textContent = c.sub;

            card.appendChild(l);
            card.appendChild(v);
            card.appendChild(s);
            hudGrid.appendChild(card);
          });

          topControls.appendChild(hudGrid);
        } else if (hudMode === "compact") {
          var compactStrip = document.createElement("div");
          compactStrip.style.display = "flex";
          compactStrip.style.flexWrap = "wrap";
          compactStrip.style.gap = "6px";
          compactStrip.style.alignItems = "center";

          var chips = [
            { label: "Avg Loss", val: avgAttenuation.toFixed(3) + " dB/km", color: avgAttenuation <= 0.20 ? theme.nominal : theme.warning },
            { label: "Avg OSNR", val: avgOsnr.toFixed(1) + " dB", color: avgOsnr >= 24 ? theme.nominal : theme.critical },
            { label: "Miles", val: formatValue(totalMiles, "compact_num") + " mi", color: theme.primary },
            { label: "Status", val: fleetHealth, color: degradedCount === 0 ? theme.nominal : theme.critical }
          ];

          chips.forEach(function (ch) {
            var chip = document.createElement("span");
            chip.style.padding = "3px 8px";
            chip.style.background = theme.cardBg;
            chip.style.border = "1px solid " + theme.border;
            chip.style.borderRadius = "12px";
            chip.style.fontSize = Math.round(10.5 * fontScale) + "px";
            chip.style.display = "inline-flex";
            chip.style.gap = "4px";
            chip.innerHTML = "<strong style='color:" + theme.subtext + "'>" + ch.label + ":</strong> <span style='color:" + ch.color + ";font-weight:700'>" + ch.val + "</span>";
            compactStrip.appendChild(chip);
          });
          topControls.appendChild(compactStrip);
        }

        if (config.showSearch !== false) {
          var searchRow = document.createElement("div");
          searchRow.style.display = "flex";
          searchRow.style.alignItems = "center";
          searchRow.style.gap = "8px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Search optical fiber corridor...";
          searchInput.value = self._searchTerm;
          searchInput.style.flex = "1";
          searchInput.style.background = theme.cardBg;
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.borderRadius = "4px";
          searchInput.style.padding = "5px 9px";
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = Math.round(11 * fontScale) + "px";
          searchInput.style.outline = "none";

          searchInput.addEventListener("input", function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          });

          searchRow.appendChild(searchInput);

          var countBadge = document.createElement("span");
          countBadge.style.fontSize = Math.round(10 * fontScale) + "px";
          countBadge.style.color = theme.subtext;
          countBadge.style.whiteSpace = "nowrap";
          countBadge.textContent = displayCorridors.length + " of " + parsedCorridors.length + " corridors";
          searchRow.appendChild(countBadge);

          topControls.appendChild(searchRow);
        }

        container.appendChild(topControls);

        // MAIN VISUALIZATION CANVAS WRAPPER
        var canvasWrapper = document.createElement("div");
        canvasWrapper.style.flex = "1 1 0";
        canvasWrapper.style.minHeight = "0";
        canvasWrapper.style.position = "relative";
        canvasWrapper.style.overflow = "auto";
        container.appendChild(canvasWrapper);

        var rect = canvasWrapper.getBoundingClientRect();
        var width = Math.max(rect.width, 320);
        var height = Math.max(rect.height, 260);

        self._lastWidth = width;
        self._lastHeight = height;

        // Route to the active layout mode
        if (layoutMode === "spectral_waterfall") {
          renderSpectralWaterfall(canvasWrapper, displayCorridors, benchmarkTarget, theme, config, width, height, self);
        } else if (layoutMode === "span_attenuation_envelope") {
          renderSpanAttenuationEnvelope(canvasWrapper, displayCorridors, benchmarkTarget, theme, config, width, height, self);
        } else if (layoutMode === "osnr_qfactor_constellation") {
          renderOsnrQfactorConstellation(canvasWrapper, displayCorridors, osnrCritical, theme, config, width, height, self);
        } else if (layoutMode === "optical_health_matrix") {
          renderOpticalHealthMatrix(canvasWrapper, displayCorridors, benchmarkTarget, theme, config, width, height, self);
        }

        done();
      });
    }
  });

  // ==========================================
  // LAYOUT 1: DWDM C-BAND SPECTRAL WATERFALL 3D
  // ==========================================
  function renderSpectralWaterfall(parent, corridors, benchmarkTarget, theme, config, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 35, right: 140, bottom: 45, left: 160 };
    var innerW = Math.max(width - margin.left - margin.right, 200);
    var innerH = Math.max(height - margin.top - margin.bottom, 160);

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // ITU-T 50GHz C-Band Wavelengths: 1530nm to 1565nm (Channels 1 to 96)
    var numChannels = 48;
    var lambdaScale = d3.scaleLinear().domain([1, numChannels]).range([0, innerW]);
    var stepY = innerH / Math.max(corridors.length, 1);

    // X-Axis: Optical Wavelength (nm)
    var xAxis = d3.axisBottom(lambdaScale)
      .ticks(6)
      .tickFormat(function (d) {
        var nm = 1530.0 + (d / numChannels) * 35.0;
        return nm.toFixed(1) + "nm";
      });

    g.append("g")
      .attr("transform", "translate(0," + innerH + ")")
      .call(xAxis)
      .attr("color", theme.subtext)
      .selectAll("text")
      .style("font-size", "10px");

    // X-Axis Label
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 34)
      .attr("fill", theme.subtext)
      .attr("text-anchor", "middle")
      .style("font-size", "10.5px")
      .text("ITU-T DWDM Optical C-Band Wavelength (1530nm – 1565nm, 50GHz Grid)");

    // Isometric elevation waterfall ribbons for each corridor
    corridors.forEach(function (corr, idx) {
      var baseY = idx * stepY + stepY * 0.75;
      var elevationAmp = Math.min(stepY * 0.9, 28);

      // Generate realistic optical power spectral density with carrier peaks & EDFA gain ripple
      var points = [];
      for (var ch = 1; ch <= numChannels; ch++) {
        var basePower = -12.0; // dBm nominal launch
        var gainTilt = ((ch - numChannels / 2) / numChannels) * 1.8;
        var carrierPulse = Math.sin(ch * 0.8) * 1.5 + Math.cos(ch * 2.2) * 1.2;
        var lossDrop = (corr.attenuation - 0.17) * 45.0;
        var powerDbm = basePower + gainTilt + carrierPulse - lossDrop;
        points.push({ ch: ch, power: powerDbm });
      }

      var area = d3.area()
        .x(function (d) { return lambdaScale(d.ch); })
        .y0(baseY)
        .y1(function (d) {
          var norm = (d.power + 22.0) / 18.0;
          return baseY - Math.max(0, norm * elevationAmp);
        })
        .curve(d3.curveMonotoneX);

      var line = d3.line()
        .x(function (d) { return lambdaScale(d.ch); })
        .y(function (d) {
          var norm = (d.power + 22.0) / 18.0;
          return baseY - Math.max(0, norm * elevationAmp);
        })
        .curve(d3.curveMonotoneX);

      // Shaded Waterfall Ribbon
      if (config.showWaterfallRibbons !== false) {
        g.append("path")
          .datum(points)
          .attr("fill", corr.isCritical ? (theme.critical + "33") : (corr.isElevated ? (theme.warning + "26") : theme.waterfallFill))
          .attr("d", area);
      }

      // Spectral Curve Line
      var path = g.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.waterfallStroke))
        .attr("stroke-width", 2)
        .attr("d", line);

      // Left Corridor Header
      var labelG = g.append("g")
        .attr("transform", "translate(-12," + baseY + ")")
        .style("cursor", "pointer")
        .on("click", function (event) { handleDrill(corr, event); });

      labelG.append("text")
        .attr("text-anchor", "end")
        .attr("fill", corr.isCritical ? theme.critical : theme.text)
        .attr("font-weight", corr.isCritical ? "700" : "600")
        .style("font-size", "11px")
        .text(truncateLabel(corr.corridor, 20));

      labelG.append("text")
        .attr("text-anchor", "end")
        .attr("y", 11)
        .attr("fill", theme.subtext)
        .style("font-size", "9.5px")
        .text(corr.fiberType + " (" + corr.distance + " mi)");

      // Right Side Value Badge
      var valG = g.append("g")
        .attr("transform", "translate(" + (innerW + 12) + "," + baseY + ")");

      valG.append("text")
        .attr("fill", corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.nominal))
        .attr("font-weight", "700")
        .style("font-size", "11.5px")
        .text(corr.attenuation.toFixed(3) + " dB/km");

      valG.append("text")
        .attr("y", 11)
        .attr("fill", theme.subtext)
        .style("font-size", "9.5px")
        .text(corr.osnr.toFixed(1) + " dB OSNR");

      // Hover Hit Area for Tooltip
      g.append("rect")
        .attr("x", 0)
        .attr("y", baseY - elevationAmp)
        .attr("width", innerW)
        .attr("height", elevationAmp + 8)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          showTooltip(self._tooltip, event, corr.corridor, [
            { label: "Fiber Type", val: corr.fiberType },
            { label: "Optical Attenuation", val: corr.attenuation.toFixed(3) + " dB/km" },
            { label: "ITU-T Spec Benchmark", val: corr.specLoss.toFixed(2) + " dB/km" },
            { label: "Optical OSNR", val: corr.osnr.toFixed(1) + " dB" },
            { label: "Route Distance", val: corr.distance + " miles" },
            { label: "60-Day Anomalies", val: corr.anomalies.toLocaleString() },
            { label: "Optical Status", val: corr.isCritical ? "🔴 Critical Loss (>0.21 dB/km)" : (corr.isElevated ? "🟡 Elevated (>Spec)" : "🟢 Nominal Pass") }
          ]);
        })
        .on("mousemove", function (event) {
          self._tooltip.style.left = (event.pageX + 14) + "px";
          self._tooltip.style.top = (event.pageY - 12) + "px";
        })
        .on("mouseout", function () {
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(corr, event);
        });
    });

    // Reference Target Marker
    if (config.targetGoalMode !== "none") {
      var refText = (config.referenceLineLabel || "ITU-T Standard") + " (" + benchmarkTarget.toFixed(3) + " dB/km)";
      svg.append("text")
        .attr("x", margin.left)
        .attr("y", margin.top - 12)
        .attr("fill", theme.primary)
        .attr("font-size", "10.5px")
        .attr("font-weight", "600")
        .text("📌 " + refText);
    }
  }

  // ==========================================
  // LAYOUT 2: SPAN DISTANCE VS ATTENUATION ENVELOPE
  // ==========================================
  function renderSpanAttenuationEnvelope(parent, corridors, benchmarkTarget, theme, config, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 35, right: 35, bottom: 50, left: 65 };
    var innerW = Math.max(width - margin.left - margin.right, 200);
    var innerH = Math.max(height - margin.top - margin.bottom, 160);

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var maxDist = d3.max(corridors, function (d) { return d.distance; }) || 1200;
    var xScale = d3.scaleLinear().domain([0, maxDist * 1.1]).range([0, innerW]);

    var maxLoss = Math.max(d3.max(corridors, function (d) { return d.attenuation; }) || 0.22, 0.23);
    var yScale = d3.scaleLinear().domain([0.16, maxLoss]).range([innerH, 0]).nice();

    // Background Shaded Spec Zones
    // G.654E ULL Zone: 0.16 to 0.18
    g.append("rect")
      .attr("x", 0)
      .attr("y", yScale(0.18))
      .attr("width", innerW)
      .attr("height", Math.max(0, yScale(0.16) - yScale(0.18)))
      .attr("fill", theme.nominal)
      .attr("opacity", 0.08);

    // G.652D SSMF Zone: 0.18 to 0.20
    g.append("rect")
      .attr("x", 0)
      .attr("y", yScale(0.20))
      .attr("width", innerW)
      .attr("height", Math.max(0, yScale(0.18) - yScale(0.20)))
      .attr("fill", theme.primary)
      .attr("opacity", 0.08);

    // Elevated Risk Zone: > 0.205
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", Math.max(0, yScale(0.205)))
      .attr("fill", theme.critical)
      .attr("opacity", 0.06);

    // Axes
    var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return d + " mi"; });
    var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d.toFixed(3); });

    g.append("g")
      .attr("transform", "translate(0," + innerH + ")")
      .call(xAxis)
      .attr("color", theme.subtext);

    g.append("g")
      .call(yAxis)
      .attr("color", theme.subtext);

    // Axis Labels
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 38)
      .attr("fill", theme.subtext)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text("Optical Fiber Route Distance (Miles)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -46)
      .attr("fill", theme.subtext)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text("Optical Span Attenuation (dB / km)");

    // Benchmark Reference Line
    if (config.targetGoalMode !== "none") {
      var targetY = yScale(benchmarkTarget);
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", targetY)
        .attr("y2", targetY)
        .attr("stroke", theme.primary)
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.5);

      g.append("text")
        .attr("x", innerW - 8)
        .attr("y", targetY - 6)
        .attr("fill", theme.primary)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .text((config.referenceLineLabel || "ITU-T Benchmark") + ": " + benchmarkTarget.toFixed(3) + " dB/km");
    }

    // Corridor Data Points
    corridors.forEach(function (corr) {
      var cx = xScale(corr.distance);
      var cy = yScale(corr.attenuation);

      var pointG = g.append("g")
        .attr("transform", "translate(" + cx + "," + cy + ")")
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          showTooltip(self._tooltip, event, corr.corridor, [
            { label: "Fiber Type", val: corr.fiberType },
            { label: "Route Distance", val: corr.distance + " miles" },
            { label: "Attenuation Loss", val: corr.attenuation.toFixed(3) + " dB/km" },
            { label: "ITU-T Standard", val: corr.specLoss.toFixed(2) + " dB/km" },
            { label: "OSNR Margin", val: corr.osnr.toFixed(1) + " dB" },
            { label: "60-Day Anomalies", val: corr.anomalies.toLocaleString() }
          ]);
        })
        .on("mousemove", function (event) {
          self._tooltip.style.left = (event.pageX + 14) + "px";
          self._tooltip.style.top = (event.pageY - 12) + "px";
        })
        .on("mouseout", function () {
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(corr, event);
        });

      // Pin halo pulse on degraded routes
      if (corr.isCritical) {
        pointG.append("circle")
          .attr("r", 12)
          .attr("fill", "none")
          .attr("stroke", theme.critical)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.6);
      }

      pointG.append("circle")
        .attr("r", corr.isCritical ? 7 : 5)
        .attr("fill", corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.nominal))
        .attr("stroke", theme.cardBg)
        .attr("stroke-width", 1.5);

      if (config.labelDensity !== "hidden") {
        if (config.labelDensity === "all" || corr.isCritical) {
          pointG.append("text")
            .attr("x", 9)
            .attr("y", 3)
            .attr("fill", theme.text)
            .attr("font-size", "10px")
            .attr("font-weight", corr.isCritical ? "700" : "500")
            .text(corr.corridor);
        }
      }
    });
  }

  // ==========================================
  // LAYOUT 3: OSNR VS Q-FACTOR CONSTELLATION MATRIX
  // ==========================================
  function renderOsnrQfactorConstellation(parent, corridors, osnrCritical, theme, config, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 35, right: 35, bottom: 50, left: 65 };
    var innerW = Math.max(width - margin.left - margin.right, 200);
    var innerH = Math.max(height - margin.top - margin.bottom, 160);

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // X: OSNR (dB)
    var xScale = d3.scaleLinear().domain([10, 32]).range([0, innerW]);
    // Y: Q-Factor (dB) computed from OSNR and BER physics
    var yScale = d3.scaleLinear().domain([6, 18]).range([innerH, 0]);

    // Hard-Decision FEC Zone (OSNR < 15 dB)
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", xScale(15))
      .attr("height", innerH)
      .attr("fill", theme.critical)
      .attr("opacity", 0.08);

    // Soft-Decision 20% Overhead Margin Zone (15 to 22 dB)
    g.append("rect")
      .attr("x", xScale(15))
      .attr("y", 0)
      .attr("width", xScale(22) - xScale(15))
      .attr("height", innerH)
      .attr("fill", theme.warning)
      .attr("opacity", 0.08);

    // Optimal 400G/800G Coherent Operating Window (> 22 dB)
    g.append("rect")
      .attr("x", xScale(22))
      .attr("y", 0)
      .attr("width", innerW - xScale(22))
      .attr("height", innerH)
      .attr("fill", theme.nominal)
      .attr("opacity", 0.08);

    var xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(function (d) { return d + " dB"; });
    var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return d + " dB"; });

    g.append("g")
      .attr("transform", "translate(0," + innerH + ")")
      .call(xAxis)
      .attr("color", theme.subtext);

    g.append("g")
      .call(yAxis)
      .attr("color", theme.subtext);

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 38)
      .attr("fill", theme.subtext)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text("Optical Signal-to-Noise Ratio (OSNR in dB, 0.1nm Noise BW)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -46)
      .attr("fill", theme.subtext)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text("Q-Factor Constellation Quality (dB)");

    // Critical Threshold Marker
    var critX = xScale(osnrCritical);
    g.append("line")
      .attr("x1", critX)
      .attr("x2", critX)
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", theme.critical)
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1.5);

    g.append("text")
      .attr("x", critX + 6)
      .attr("y", 16)
      .attr("fill", theme.critical)
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .text("FEC Margin Alert (" + osnrCritical + " dB)");

    corridors.forEach(function (corr) {
      // Q-Factor approximation: Q ≈ 10*log10(sqrt(2 * 10^(OSNR/10))) - attenuation penalty
      var qFactor = Math.min(17.5, Math.max(7.0, (corr.osnr * 0.52) - (corr.attenuation * 10.0)));
      var cx = xScale(corr.osnr);
      var cy = yScale(qFactor);

      var pointG = g.append("g")
        .attr("transform", "translate(" + cx + "," + cy + ")")
        .style("cursor", "pointer")
        .on("mouseover", function (event) {
          showTooltip(self._tooltip, event, corr.corridor, [
            { label: "OSNR Margin", val: corr.osnr.toFixed(1) + " dB" },
            { label: "Estimated Q-Factor", val: qFactor.toFixed(2) + " dB" },
            { label: "Pre-FEC BER Est.", val: (1.2e-3 / Math.exp((qFactor - 7) * 0.8)).toExponential(2) },
            { label: "Attenuation Loss", val: corr.attenuation.toFixed(3) + " dB/km" },
            { label: "Fiber Type", val: corr.fiberType },
            { label: "FEC Margin Status", val: corr.osnr >= 24 ? "🟢 400G Coherent Safe" : (corr.osnr >= 18 ? "🟡 Marginal Warning" : "🔴 FEC Uncorrectable Risk") }
          ]);
        })
        .on("mousemove", function (event) {
          self._tooltip.style.left = (event.pageX + 14) + "px";
          self._tooltip.style.top = (event.pageY - 12) + "px";
        })
        .on("mouseout", function () {
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(corr, event);
        });

      pointG.append("circle")
        .attr("r", 6)
        .attr("fill", corr.osnr >= 24 ? theme.nominal : (corr.osnr >= 18 ? theme.warning : theme.critical))
        .attr("stroke", theme.cardBg)
        .attr("stroke-width", 1.5);

      pointG.append("text")
        .attr("x", 8)
        .attr("y", 3)
        .attr("fill", theme.text)
        .attr("font-size", "10px")
        .text(corr.corridor);
    });
  }

  // ==========================================
  // LAYOUT 4: OPTICAL ROUTE HEALTH SCORECARD MATRIX
  // ==========================================
  function renderOpticalHealthMatrix(parent, corridors, benchmarkTarget, theme, config, width, height, self) {
    parent.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.style.padding = "10px 14px";
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
    wrap.style.gap = "10px";
    parent.appendChild(wrap);

    corridors.forEach(function (corr) {
      var card = document.createElement("div");
      card.style.background = theme.cardBg;
      card.style.border = "1px solid " + (corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.border));
      card.style.borderRadius = "8px";
      card.style.padding = "10px 12px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "6px";
      card.style.cursor = "pointer";
      card.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

      card.onmouseenter = function () {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 6px 14px rgba(0,0,0,0.25)";
      };
      card.onmouseleave = function () {
        card.style.transform = "none";
        card.style.boxShadow = "none";
      };
      card.onclick = function (event) {
        handleDrill(corr, event);
      };

      // Header row
      var head = document.createElement("div");
      head.style.display = "flex";
      head.style.justifyContent = "space-between";
      head.style.alignItems = "center";

      var title = document.createElement("span");
      title.style.fontWeight = "700";
      title.style.fontSize = "13px";
      title.style.color = corr.isCritical ? theme.critical : theme.text;
      title.textContent = corr.corridor;

      var typeBadge = document.createElement("span");
      typeBadge.style.fontSize = "10px";
      typeBadge.style.padding = "2px 6px";
      typeBadge.style.borderRadius = "4px";
      typeBadge.style.background = theme.border;
      typeBadge.style.color = theme.subtext;
      typeBadge.style.fontWeight = "600";
      typeBadge.textContent = corr.fiberType;

      head.appendChild(title);
      head.appendChild(typeBadge);
      card.appendChild(head);

      // Metric strip
      var strip = document.createElement("div");
      strip.style.display = "flex";
      strip.style.justifyContent = "space-between";
      strip.style.fontSize = "11.5px";
      strip.style.color = theme.subtext;

      var lossCol = document.createElement("div");
      lossCol.innerHTML = "Loss: <strong style='color:" + (corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.nominal)) + "'>" + corr.attenuation.toFixed(3) + " dB/km</strong>";

      var osnrCol = document.createElement("div");
      osnrCol.innerHTML = "OSNR: <strong style='color:" + (corr.osnr >= 24 ? theme.nominal : theme.critical) + "'>" + corr.osnr.toFixed(1) + " dB</strong>";

      var distCol = document.createElement("div");
      distCol.innerHTML = "Distance: <strong style='color:" + theme.text + "'>" + corr.distance + " mi</strong>";

      strip.appendChild(lossCol);
      strip.appendChild(osnrCol);
      strip.appendChild(distCol);
      card.appendChild(strip);

      // Gauge bar
      var gaugeBar = document.createElement("div");
      gaugeBar.style.position = "relative";
      gaugeBar.style.height = "6px";
      gaugeBar.style.borderRadius = "3px";
      gaugeBar.style.background = theme.border;
      gaugeBar.style.overflow = "hidden";

      var pct = Math.min(100, Math.max(0, ((corr.attenuation - 0.16) / (0.24 - 0.16)) * 100));
      var fill = document.createElement("div");
      fill.style.width = pct + "%";
      fill.style.height = "100%";
      fill.style.background = corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.nominal);
      gaugeBar.appendChild(fill);
      card.appendChild(gaugeBar);

      // Footer row
      var footer = document.createElement("div");
      footer.style.display = "flex";
      footer.style.justifyContent = "space-between";
      footer.style.fontSize = "10px";
      footer.style.color = theme.subtext;

      var anomBadge = document.createElement("span");
      anomBadge.textContent = "Telemetry Anomalies: " + corr.anomalies.toLocaleString();

      var statusText = document.createElement("span");
      statusText.style.fontWeight = "600";
      statusText.style.color = corr.isCritical ? theme.critical : (corr.isElevated ? theme.warning : theme.nominal);
      statusText.textContent = corr.isCritical ? "⚠️ Critical Degradation" : (corr.isElevated ? "🟡 Elevated Loss" : "✅ Nominal Spec");

      footer.appendChild(anomBadge);
      footer.appendChild(statusText);
      card.appendChild(footer);

      wrap.appendChild(card);
    });
  }

  // ==========================================
  // HELPER UTILITIES
  // ==========================================
  function showTooltip(tooltip, event, title, rows) {
    var content = "<div style='font-weight:700;margin-bottom:6px;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;'>" + title + "</div>";
    rows.forEach(function (r) {
      content += "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'>" +
        "<span style='opacity:0.75;'>" + r.label + ":</span>" +
        "<strong style='font-weight:600;'>" + r.val + "</strong>" +
        "</div>";
    });
    tooltip.innerHTML = content;
    tooltip.style.display = "block";
    tooltip.style.left = (event.pageX + 14) + "px";
    tooltip.style.top = (event.pageY - 12) + "px";
  }

  function hideTooltip(tooltip) {
    tooltip.style.display = "none";
  }

  function truncateLabel(str, maxLen) {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
  }

  function handleDrill(d, event) {
    if (!d || !d.rowRef || !window.LookerCharts || !window.LookerCharts.Utils) return;
    var cells = Object.values(d.rowRef);
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] && cells[i].links && cells[i].links.length > 0) {
        window.LookerCharts.Utils.openDrillMenu({
          links: cells[i].links,
          event: event
        });
        return;
      }
    }
  }
})();
