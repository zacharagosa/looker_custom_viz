/**
 * Zayo DWDM Optical Attenuation & Telemetry Spectrum Analyzer
 * Enterprise Multi-Modal Looker Custom Visualization built with D3.js v7
 *
 * Upgraded with Multi-Modal Enterprise Flexibility:
 * - Dynamic Field-Role Mapping (Time Dim, Corridor Dim, Primary Metric, Secondary Metric, Target Metric)
 * - Configurable Reference Lines & Targets (ITU Standard, Measure Column, Fixed Value, Mean, Median, P75, P90)
 * - Interactive Sorting, Top-N Density with 'Other' Rollup, and Zero/Null suppression
 * - Multi-Density Executive KPI HUD (Full Scorecard Strip, Compact Strip, Hidden)
 * - Enterprise Brand Palettes (Zayo, Google, Slate, Cyberpunk, Emerald, Sunset, Wellverse, Custom Hex), Metric Polarity, Font Scaling, Value Formatting
 * - Strictly minimized to 2 configuration sections: "Display" and "Style"
 * - Full Looker drill-down menu support (LookerCharts.Utils.openDrillMenu)
 * - Debounced ResizeObserver with <4px delta guard and responsive layout scaling
 */

(function () {
  var PALETTES = {
    zayo_telecom: {
      name: "Zayo Telecom Corporate (#f5831f)",
      primary: "#f5831f",
      secondary: "#0f172a",
      nominal: "#10b981",
      warning: "#d97706",
      alert: "#e11d48",
      accent: "#ea580c",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    google_enterprise: {
      name: "Google Enterprise (#1a73e8)",
      primary: "#1a73e8",
      secondary: "#174ea6",
      nominal: "#1e8e3e",
      warning: "#f9ab00",
      alert: "#d93025",
      accent: "#4285f4",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368",
      surface: "#f8f9fa",
      border: "#dadce0"
    },
    modern_slate: {
      name: "Modern Studio Slate (#0f172a)",
      primary: "#0f172a",
      secondary: "#334155",
      nominal: "#059669",
      warning: "#d97706",
      alert: "#dc2626",
      accent: "#475569",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (#00ffcc)",
      primary: "#00ffcc",
      secondary: "#7928ca",
      nominal: "#00ffcc",
      warning: "#ffbe0b",
      alert: "#ff0055",
      accent: "#00b4d8",
      bgBadge: "rgba(0, 255, 204, 0.15)",
      borderBadge: "#00ffcc",
      textBadge: "#00ffcc",
      cardBg: "#0f172a",
      textPrimary: "#f8fafc",
      textMuted: "#94a3b8",
      surface: "#1e293b",
      border: "#334155"
    },
    emerald_finops: {
      name: "Emerald FinOps (#10b981)",
      primary: "#10b981",
      secondary: "#047857",
      nominal: "#059669",
      warning: "#f59e0b",
      alert: "#e11d48",
      accent: "#34d399",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#065f46",
      cardBg: "#ffffff",
      textPrimary: "#064e3b",
      textMuted: "#6ee7b7",
      surface: "#f0fdf4",
      border: "#bbf7d0"
    },
    sunset_media: {
      name: "Sunset Media (#ea580c)",
      primary: "#ea580c",
      secondary: "#c2410c",
      nominal: "#10b981",
      warning: "#f59e0b",
      alert: "#e11d48",
      accent: "#fb923c",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#9a3412",
      cardBg: "#ffffff",
      textPrimary: "#431407",
      textMuted: "#78716c",
      surface: "#fffbeb",
      border: "#fde68a"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (#0284c7)",
      primary: "#0284c7",
      secondary: "#0369a1",
      nominal: "#10b981",
      warning: "#f59e0b",
      alert: "#e11d48",
      accent: "#38bdf8",
      bgBadge: "#f0f9ff",
      borderBadge: "#bae6fd",
      textBadge: "#0369a1",
      cardBg: "#ffffff",
      textPrimary: "#0c4a6e",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    },
    custom_hex: {
      name: "Custom Hex Override",
      primary: "#f5831f",
      secondary: "#0f172a",
      nominal: "#10b981",
      warning: "#d97706",
      alert: "#e11d48",
      accent: "#ea580c",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b",
      surface: "#f8fafc",
      border: "#e2e8f0"
    }
  };

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

  function formatValue(val, fmt, isCurrencyHint) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var n = Number(val);
    if (fmt === "raw") return String(val);
    if (fmt === "percentage") return (n * 100).toFixed(1) + "%";
    if (fmt === "decimal_3") return n.toFixed(3);
    if (fmt === "decimal_2") return n.toFixed(2);
    if (fmt === "compact_currency" || isCurrencyHint) {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toLocaleString();
    }
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    // Auto
    if (Math.abs(n) < 1.0 && n !== 0) return n.toFixed(3);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "zayo_optical_spectrum_waterfall",
    label: "Zayo Optical Spectrum & SLA Analyzer",
    options: {
      // ===== DISPLAY OPTIONS =====
      custom_title: {
        type: "string",
        label: "Card Title Override",
        default: "",
        section: "Display",
        order: 1
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Telemetry Tag",
        default: "",
        section: "Display",
        order: 2
      },
      chart_mode: {
        type: "string",
        label: "Visualization Mode",
        display: "select",
        values: [
          { "Auto-Detect from Query": "auto" },
          { "Optical Attenuation Time-Series Envelope": "optical_threshold_envelope" },
          { "SLA Financial Risk & Incident Root-Cause Breakdown": "root_cause_lollipop" },
          { "Corridor Optical Attenuation Waterfall": "corridor_waterfall" }
        ],
        default: "auto",
        section: "Display",
        order: 3
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Mode",
        display: "select",
        values: [
          { "Full Scorecard Strip": "scorecard" },
          { "Compact Summary": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 4
      },
      targetGoalMode: {
        type: "string",
        label: "Benchmark Target Mode",
        display: "select",
        values: [
          { "ITU-T G.652.D Spec (0.20 dB/km)": "itu_standard" },
          { "Fixed Threshold Value": "fixed_value" },
          { "Measure Column Target": "measure_column" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Percentile P75": "percentile_p75" },
          { "Percentile P90": "percentile_p90" },
          { "None": "none" }
        ],
        default: "itu_standard",
        section: "Display",
        order: 5
      },
      fixedTargetValue: {
        type: "number",
        label: "Custom Target / Threshold Value",
        default: 0.25,
        section: "Display",
        order: 6
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        default: "ITU-T / SLA Anomaly Threshold",
        section: "Display",
        order: 7
      },
      alertThreshold: {
        type: "number",
        label: "Critical Anomaly Breach Threshold (dB/km)",
        default: 0.25,
        section: "Display",
        order: 8
      },
      sortOrder: {
        type: "string",
        label: "Entity Sort Order",
        display: "select",
        values: [
          { "Metric Descending": "metric_desc" },
          { "Metric Ascending": "metric_asc" },
          { "Alphabetical": "alphabetical" },
          { "Chronological / Query Natural": "natural" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 9
      },
      topNLimit: {
        type: "string",
        label: "Top-N Entity Limit",
        display: "select",
        values: [
          { "Top 5 Spans": "5" },
          { "Top 10 Spans": "10" },
          { "Top 15 Spans": "15" },
          { "Top 20 Spans": "20" },
          { "All Entities (No Limit)": "all" }
        ],
        default: "15",
        section: "Display",
        order: 10
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Excluded Entities into 'Other'",
        default: false,
        section: "Display",
        order: 11
      },
      suppressNulls: {
        type: "boolean",
        label: "Suppress Zero / Null Data Rows",
        default: true,
        section: "Display",
        order: 12
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "All Data Labels": "all" },
          { "Peaks / Outliers Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "all",
        section: "Display",
        order: 13
      },
      showSearchBar: {
        type: "boolean",
        label: "Show Interactive Search Filter Bar",
        default: true,
        section: "Display",
        order: 14
      },

      // Dynamic Field-Role Mapping (Populated via _registerDynamicFieldOptions)
      dimTimeOrCategoryOverride: {
        type: "string",
        label: "Time / Primary Dimension",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 20
      },
      dimCorridorOrRootCauseOverride: {
        type: "string",
        label: "Corridor / Root-Cause Dimension",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 21
      },
      measurePrimaryOverride: {
        type: "string",
        label: "Primary Metric (Attenuation / SLA Penalty)",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 22
      },
      measureSecondaryOverride: {
        type: "string",
        label: "Secondary Metric (OSNR / Incident Count)",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 23
      },
      measureTargetOverride: {
        type: "string",
        label: "Target / Benchmark Measure Column",
        display: "select",
        values: [{ "Auto-Detect from Query": "" }],
        default: "",
        section: "Display",
        order: 24
      },

      // ===== STYLE OPTIONS =====
      colorPalette: {
        type: "string",
        label: "Color Theme & Palette",
        display: "select",
        values: [
          { "Zayo Telecom Corporate (#f5831f)": "zayo_telecom" },
          { "Google Enterprise (#1a73e8)": "google_enterprise" },
          { "Modern Studio Slate (#0f172a)": "modern_slate" },
          { "Cyberpunk Dark (#00ffcc)": "cyberpunk_dark" },
          { "Emerald FinOps (#10b981)": "emerald_finops" },
          { "Sunset Media (#ea580c)": "sunset_media" },
          { "Wellverse Healthcare (#0284c7)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "zayo_telecom",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Nominal Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customAlertColor: {
        type: "string",
        label: "Custom Alert / Critical Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Lower is Better (Attenuation, SLA Risk, Loss)": "lower_is_better" },
          { "Higher is Better (Bandwidth, OSNR, Margin)": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Scaling",
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
        label: "Value Formatting Style",
        display: "select",
        values: [
          { "Auto-Detect": "auto" },
          { "Decimal (3 decimal places, e.g. 0.215 dB/km)": "decimal_3" },
          { "Decimal (2 decimal places, e.g. 28.50 dB)": "decimal_2" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_number" },
          { "Percentage (45.2%)": "percentage" },
          { "Raw Unformatted": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 7
      }
    },

    create: function (element, config) {
      element.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.innerHTML = "";

      this._container = document.createElement("div");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.boxSizing = "border-box";
      this._container.style.overflow = "hidden";
      element.appendChild(this._container);

      var self = this;
      var lastW = 0;
      var lastH = 0;
      var resizeTimeout = null;

      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var entry = entries[0];
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - lastW) < 4 && Math.abs(h - lastH) < 4) return;
          lastW = w;
          lastH = h;
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.updateAsync(
                self._lastData,
                element,
                self._lastConfig,
                self._lastQueryResponse,
                self._lastDetails,
                function () {}
              );
            }
          }, 150);
        });
        this._ro.observe(element);
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      if (!queryResponse || !queryResponse.fields) return;
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var meas = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        meas = meas.concat(queryResponse.fields.table_calculations);
      }

      var dimSig = dims.map(function (d) { return d.name; }).join(",");
      var measSig = meas.map(function (m) { return m.name; }).join(",");
      if (this._lastDimSig === dimSig && this._lastMeasSig === measSig) return;
      this._lastDimSig = dimSig;
      this._lastMeasSig = measSig;

      var dimValues = [{ "Auto-Detect from Query": "" }];
      dims.forEach(function (d) {
        var label = d.label_short || d.label || d.name;
        var opt = {};
        opt[label + " (" + d.name + ")"] = d.name;
        dimValues.push(opt);
      });

      var measValues = [{ "Auto-Detect from Query": "" }];
      meas.forEach(function (m) {
        var label = m.label_short || m.label || m.name;
        var opt = {};
        opt[label + " (" + m.name + ")"] = m.name;
        measValues.push(opt);
      });

      var newOptions = Object.assign({}, this.options);
      ["dimTimeOrCategoryOverride", "dimCorridorOrRootCauseOverride"].forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: dimValues });
        }
      });
      ["measurePrimaryOverride", "measureSecondaryOverride", "measureTargetOverride"].forEach(function (k) {
        if (newOptions[k]) {
          newOptions[k] = Object.assign({}, newOptions[k], { values: measValues });
        }
      });

      try {
        this.trigger("registerOptions", newOptions);
      } catch (e) {}
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastElement = element;

      this._registerDynamicFieldOptions(queryResponse);

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, data, element, config, queryResponse, details, done);
      });
    },

    _render: function (d3, data, element, config, queryResponse, details, done) {
      var container = this._container || element;
      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='padding:24px;color:#64748b;font-size:13px;text-align:center;'>No optical telemetry or root-cause data available.</div>";
        done();
        return;
      }

      // 1. Resolve Color Palette & Tokens
      var palKey = config.colorPalette || "zayo_telecom";
      var pal = Object.assign({}, PALETTES[palKey] || PALETTES.zayo_telecom);
      if (config.customPrimaryColor) pal.primary = config.customPrimaryColor;
      if (config.customPositiveColor) pal.nominal = config.customPositiveColor;
      if (config.customAlertColor) pal.alert = config.customAlertColor;

      // 2. Resolve Fields
      var dims = (queryResponse.fields.dimensions || []).concat(queryResponse.fields.dimension_like || []);
      var measures = (queryResponse.fields.measures || []).concat(queryResponse.fields.measure_like || []);
      if (queryResponse.fields.table_calculations) {
        measures = measures.concat(queryResponse.fields.table_calculations);
      }
      var pivots = queryResponse.pivots || [];

      function resolveField(list, overrideName, defaultIndex) {
        if (overrideName) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === overrideName) return list[i];
          }
        }
        if (defaultIndex !== undefined && defaultIndex < list.length) {
          return list[defaultIndex];
        }
        return null;
      }

      var dim1 = resolveField(dims, config.dimTimeOrCategoryOverride, 0);
      var dim2 = resolveField(dims, config.dimCorridorOrRootCauseOverride, 1) || dim1;
      var m1 = resolveField(measures, config.measurePrimaryOverride, 0);
      var m2 = resolveField(measures, config.measureSecondaryOverride, 1);
      var mTarget = resolveField(measures, config.measureTargetOverride, 2);

      var dim1Name = dim1 ? dim1.name : Object.keys(data[0])[0];
      var dim2Name = dim2 ? dim2.name : dim1Name;
      var m1Name = m1 ? m1.name : null;
      var m2Name = m2 ? m2.name : null;
      var mTargetName = mTarget ? mTarget.name : null;

      var isCurrencyHint = m1Name && (m1Name.indexOf("usd") !== -1 || m1Name.indexOf("penalty") !== -1 || m1Name.indexOf("sla") !== -1 || m1Name.indexOf("cost") !== -1);

      // Determine Mode
      var mode = config.chart_mode || "auto";
      if (mode === "auto") {
        var lowerDim = dim1Name.toLowerCase();
        if (lowerDim.indexOf("date") !== -1 || lowerDim.indexOf("time") !== -1 || lowerDim.indexOf("week") !== -1 || lowerDim.indexOf("month") !== -1) {
          mode = "optical_threshold_envelope";
        } else if (data.length <= 15 && m2Name) {
          mode = "root_cause_lollipop";
        } else if (dim1Name.indexOf("corridor") !== -1 || dim1Name.indexOf("route") !== -1) {
          mode = "corridor_waterfall";
        } else {
          mode = "root_cause_lollipop";
        }
      }

      // Filter nulls if requested
      var rawRows = data;
      if (config.suppressNulls) {
        rawRows = rawRows.filter(function (r) {
          var val = m1Name && r[m1Name] ? r[m1Name].value : null;
          return val !== null && val !== undefined && !isNaN(val) && val !== 0;
        });
        if (rawRows.length === 0) rawRows = data;
      }

      // Search filter support
      var currentSearch = this._searchQuery || "";
      if (currentSearch) {
        var q = currentSearch.toLowerCase();
        rawRows = rawRows.filter(function (r) {
          var dVal = r[dim1Name] ? (r[dim1Name].rendered || r[dim1Name].value || "") : "";
          return String(dVal).toLowerCase().indexOf(q) !== -1;
        });
      }

      // Parse and extract dataset
      var parsedRows = rawRows.map(function (d, i) {
        var d1Cell = d[dim1Name];
        var d2Cell = d[dim2Name];
        var label = d1Cell ? (d1Cell.rendered || d1Cell.value) : "Entity " + (i + 1);
        var sublabel = d2Cell ? (d2Cell.rendered || d2Cell.value) : "";
        var v1 = (m1Name && d[m1Name] && d[m1Name].value !== null) ? Number(d[m1Name].value) : 0;
        var v2 = (m2Name && d[m2Name] && d[m2Name].value !== null) ? Number(d[m2Name].value) : null;
        var vt = (mTargetName && d[mTargetName] && d[mTargetName].value !== null) ? Number(d[mTargetName].value) : null;

        var links = [];
        if (m1Name && d[m1Name] && d[m1Name].links) links = links.concat(d[m1Name].links);
        if (dim1Name && d[dim1Name] && d[dim1Name].links) links = links.concat(d[dim1Name].links);

        return {
          label: String(label),
          sublabel: String(sublabel),
          v1: v1,
          v2: v2,
          vt: vt,
          links: links,
          raw: d
        };
      });

      // Sorting
      var sortOrder = config.sortOrder || "metric_desc";
      if (mode === "optical_threshold_envelope" && sortOrder === "natural") {
        parsedRows.sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
      } else if (sortOrder === "metric_desc") {
        parsedRows.sort(function (a, b) { return b.v1 - a.v1; });
      } else if (sortOrder === "metric_asc") {
        parsedRows.sort(function (a, b) { return a.v1 - b.v1; });
      } else if (sortOrder === "alphabetical") {
        parsedRows.sort(function (a, b) { return a.label.localeCompare(b.label); });
      }

      // Top-N & Other Rollup
      var topN = config.topNLimit || "15";
      if (topN !== "all" && parsedRows.length > parseInt(topN, 10)) {
        var nLimit = parseInt(topN, 10);
        var retained = parsedRows.slice(0, nLimit);
        if (config.enableOtherRollup) {
          var otherRows = parsedRows.slice(nLimit);
          var otherV1 = d3.sum(otherRows, function (r) { return r.v1; });
          var otherV2 = d3.sum(otherRows, function (r) { return r.v2 || 0; });
          retained.push({
            label: "Other (" + otherRows.length + " spans)",
            sublabel: "Consolidated Rollup",
            v1: otherV1,
            v2: otherV2,
            vt: null,
            links: [],
            raw: {}
          });
        }
        parsedRows = retained;
      }

      // Benchmark Target Resolution
      var targetMode = config.targetGoalMode || "itu_standard";
      var benchmarkVal = 0.25;
      if (targetMode === "itu_standard") {
        benchmarkVal = 0.20; // ITU-T G.652.D standard fiber loss dB/km
      } else if (targetMode === "fixed_value") {
        benchmarkVal = Number(config.fixedTargetValue || 0.25);
      } else if (targetMode === "dataset_mean") {
        benchmarkVal = d3.mean(parsedRows, function (r) { return r.v1; }) || 0;
      } else if (targetMode === "dataset_median") {
        benchmarkVal = d3.median(parsedRows, function (r) { return r.v1; }) || 0;
      } else if (targetMode === "percentile_p75") {
        benchmarkVal = d3.quantile(parsedRows.map(function (r) { return r.v1; }).sort(d3.ascending), 0.75) || 0;
      } else if (targetMode === "percentile_p90") {
        benchmarkVal = d3.quantile(parsedRows.map(function (r) { return r.v1; }).sort(d3.ascending), 0.90) || 0;
      } else if (targetMode === "measure_column" && parsedRows.length && parsedRows[0].vt !== null) {
        benchmarkVal = parsedRows[0].vt;
      }

      var alertThreshold = Number(config.alertThreshold || 0.25);

      // Typography scaling
      var fScale = config.fontScale || "standard";
      var baseFontSize = fScale === "compact" ? 10 : (fScale === "large_presentation" ? 13 : 11);

      // ==========================================
      // RENDER HEADER & EXECUTIVE KPI HUD
      // ==========================================
      var headerDiv = document.createElement("div");
      headerDiv.style.cssText = "flex:0 0 auto;padding:10px 14px 6px 14px;border-bottom:1px solid " + pal.border + ";background:" + pal.surface + ";";

      var titleText = config.custom_title || (
        mode === "optical_threshold_envelope" ? "Optical Telemetry & ARIMA Anomaly Envelope" :
        (mode === "root_cause_lollipop" ? "DWDM SLA Exposure & Incident Root-Cause Breakdown" :
        "Fiber Corridor Attenuation & Optical Link Budget")
      );
      var subtitleText = config.custom_subtitle || (
        mode === "optical_threshold_envelope" ? "ITU-T G.652.D Standard vs 90% Anomaly Boundary" :
        "Proactive Telemetry & Autonomous SLA Protection"
      );

      var topBarHtml =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + pal.primary + ';display:inline-block;flex-shrink:0;"></span>' +
            '<div style="min-width:0;">' +
              '<div style="font-size:' + (baseFontSize + 2) + 'px;font-weight:700;color:' + pal.textPrimary + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + titleText + '</div>' +
              '<div style="font-size:' + (baseFontSize - 1) + 'px;color:' + pal.textMuted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + subtitleText + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">' +
            (config.showSearchBar ? '<input type="text" placeholder="Filter spans..." value="' + currentSearch + '" class="zayo-search-input" style="font-size:11px;padding:3px 8px;border:1px solid ' + pal.border + ';border-radius:4px;outline:none;width:120px;" />' : '') +
            '<span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;background:' + pal.bgBadge + ';border:1px solid ' + pal.borderBadge + ';color:' + pal.textBadge + ';">' + mode.replace(/_/g, ' ') + '</span>' +
          '</div>' +
        '</div>';

      // KPI HUD Card Strip
      var hudHtml = "";
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "hidden") {
        var meanVal = d3.mean(parsedRows, function (r) { return r.v1; }) || 0;
        var maxVal = d3.max(parsedRows, function (r) { return r.v1; }) || 0;
        var breachCount = parsedRows.filter(function (r) { return r.v1 >= alertThreshold; }).length;
        var totalSecondary = d3.sum(parsedRows, function (r) { return r.v2 || 0; });

        var valFmt = config.valueFormat || "auto";

        if (hudMode === "compact_strip") {
          hudHtml =
            '<div style="display:flex;align-items:center;gap:12px;font-size:11px;padding:4px 0;color:' + pal.textMuted + ';flex-wrap:wrap;">' +
              '<span><strong>Spans:</strong> ' + parsedRows.length + '</span>' +
              '<span>•</span>' +
              '<span><strong>Mean:</strong> ' + formatValue(meanVal, valFmt, isCurrencyHint) + '</span>' +
              '<span>•</span>' +
              '<span><strong>Peak:</strong> ' + formatValue(maxVal, valFmt, isCurrencyHint) + '</span>' +
              '<span>•</span>' +
              '<span style="color:' + (breachCount > 0 ? pal.alert : pal.nominal) + ';font-weight:700;">' +
                '<strong>Breaches (≥' + alertThreshold + '):</strong> ' + breachCount +
              '</span>' +
              (totalSecondary > 0 ? '<span>•</span><span><strong>Secondary Volume:</strong> ' + formatValue(totalSecondary, "compact_number") + '</span>' : '') +
            '</div>';
        } else {
          // Full Scorecard
          hudHtml =
            '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:8px;padding-top:4px;">' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Monitored Spans</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.textPrimary + ';">' + parsedRows.length + '</div>' +
              '</div>' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Mean Telemetry</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.primary + ';">' + formatValue(meanVal, valFmt, isCurrencyHint) + '</div>' +
              '</div>' +
              '<div style="background:' + pal.cardBg + ';border:1px solid ' + pal.border + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + pal.textMuted + ';font-weight:600;">Peak Value</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + pal.textPrimary + ';">' + formatValue(maxVal, valFmt, isCurrencyHint) + '</div>' +
              '</div>' +
              '<div style="background:' + (breachCount > 0 ? '#fef2f2' : '#f0fdf4') + ';border:1px solid ' + (breachCount > 0 ? '#fecaca' : '#bbf7d0') + ';border-radius:6px;padding:6px 10px;">' +
                '<div style="font-size:10px;text-transform:uppercase;color:' + (breachCount > 0 ? pal.alert : pal.nominal) + ';font-weight:600;">Breach Alerts</div>' +
                '<div style="font-size:14px;font-weight:700;color:' + (breachCount > 0 ? pal.alert : pal.nominal) + ';">' + breachCount + ' <span style="font-size:10px;font-weight:500;">(≥' + alertThreshold + ')</span></div>' +
              '</div>' +
            '</div>';
        }
      }

      headerDiv.innerHTML = topBarHtml + hudHtml;
      container.appendChild(headerDiv);

      // Search input handler
      var sInput = headerDiv.querySelector(".zayo-search-input");
      if (sInput) {
        var self = this;
        sInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self._render(d3, data, element, config, queryResponse, details, done);
        });
      }

      // Chart SVG Wrapper
      var chartWrapper = document.createElement("div");
      chartWrapper.style.cssText = "flex:1 1 0;min-height:0;width:100%;position:relative;background:" + pal.cardBg + ";";
      container.appendChild(chartWrapper);

      var rect = chartWrapper.getBoundingClientRect();
      var svgW = Math.max(300, rect.width || container.clientWidth || 600);
      var svgH = Math.max(160, rect.height || container.clientHeight - 80 || 320);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH);

      function openDrill(event, d) {
        if (d && d.links && d.links.length && typeof LookerCharts !== "undefined") {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      }

      // ==========================================
      // MODE 1: OPTICAL THRESHOLD ENVELOPE (TIME-SERIES)
      // ==========================================
      if (mode === "optical_threshold_envelope") {
        var margin = { top: 20, right: 36, bottom: 32, left: 54 };
        var innerW = Math.max(120, svgW - margin.left - margin.right);
        var innerH = Math.max(80, svgH - margin.top - margin.bottom);

        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xLabels = parsedRows.map(function (d) { return d.label; });
        var xScale = d3.scalePoint()
          .domain(xLabels)
          .range([0, innerW]);

        var allY = parsedRows.map(function (d) { return d.v1; });
        if (targetMode !== "none") allY.push(benchmarkVal);
        allY.push(alertThreshold);

        var minY = d3.min(allY) || 0;
        var maxY = d3.max(allY) || 1;
        var isAttenuation = (m1Name && m1Name.indexOf("attenuation") !== -1) || maxY < 2.0;

        var yMin = isAttenuation ? Math.min(0.14, minY * 0.9) : minY * 0.85;
        var yMax = isAttenuation ? Math.max(0.32, maxY * 1.15) : maxY * 1.15;

        var yScale = d3.scaleLinear()
          .domain([yMin, yMax])
          .range([innerH, 0]);

        // Gridlines
        g.append("g")
          .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW))
          .call(function (sel) {
            sel.select(".domain").remove();
            sel.selectAll("line").attr("stroke", "#f1f5f9");
            sel.selectAll("text").attr("fill", pal.textMuted).attr("font-size", "10px").attr("font-family", "monospace");
          });

        // Nominal Operating Shading Band (0 to 0.20 dB/km)
        if (isAttenuation) {
          var nomTop = yScale(0.20);
          var nomBot = yScale(yMin);
          g.append("rect")
            .attr("x", 0)
            .attr("y", nomTop)
            .attr("width", innerW)
            .attr("height", Math.max(0, nomBot - nomTop))
            .attr("fill", pal.nominal)
            .attr("opacity", 0.08);

          g.append("text")
            .attr("x", innerW - 6)
            .attr("y", nomTop + 12)
            .attr("text-anchor", "end")
            .attr("fill", pal.nominal)
            .attr("font-size", "9px")
            .attr("font-weight", "600")
            .text("ITU-T G.652.D Nominal Band (<0.20 dB/km)");
        }

        // Anomaly / Breach Reference Line
        if (targetMode !== "none") {
          g.append("line")
            .attr("x1", 0)
            .attr("x2", innerW)
            .attr("y1", yScale(benchmarkVal))
            .attr("y2", yScale(benchmarkVal))
            .attr("stroke", pal.alert)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,3");

          var refLabel = config.referenceLineLabel || "Threshold (" + benchmarkVal + ")";
          g.append("text")
            .attr("x", 8)
            .attr("y", yScale(benchmarkVal) - 4)
            .attr("fill", pal.alert)
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .text(refLabel + " (" + benchmarkVal + ")");
        }

        // Area under telemetry
        var area = d3.area()
          .x(function (d) { return xScale(d.label); })
          .y0(innerH)
          .y1(function (d) { return yScale(d.v1); })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(parsedRows)
          .attr("fill", pal.primary)
          .attr("opacity", 0.12)
          .attr("d", area);

        // Telemetry Line
        var line = d3.line()
          .x(function (d) { return xScale(d.label); })
          .y(function (d) { return yScale(d.v1); })
          .curve(d3.curveMonotoneX);

        g.append("path")
          .datum(parsedRows)
          .attr("fill", "none")
          .attr("stroke", pal.primary)
          .attr("stroke-width", 2.2)
          .attr("d", line);

        // Data Points & Anomaly Breach Pulses
        var pointsG = g.selectAll(".dot")
          .data(parsedRows)
          .enter()
          .append("g")
          .attr("transform", function (d) {
            return "translate(" + xScale(d.label) + "," + yScale(d.v1) + ")";
          });

        pointsG.append("circle")
          .attr("r", function (d) { return d.v1 >= alertThreshold ? 5.5 : 3.5; })
          .attr("fill", function (d) { return d.v1 >= alertThreshold ? pal.alert : pal.primary; })
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", function (d) { return d.links.length ? "pointer" : "default"; })
          .on("click", openDrill)
          .append("title")
          .text(function (d) {
            return d.label + "\nTelemetry: " + formatValue(d.v1, config.valueFormat || "auto", isCurrencyHint) +
              (d.v1 >= alertThreshold ? " [CRITICAL BREACH]" : "");
          });

        // Value Labels
        var labelDensity = config.labelDensity || "all";
        if (labelDensity !== "hidden") {
          pointsG.filter(function (d) {
            if (labelDensity === "peaks_only") return d.v1 >= alertThreshold || d.v1 === maxVal;
            return true;
          })
          .append("text")
          .attr("y", -8)
          .attr("text-anchor", "middle")
          .attr("fill", function (d) { return d.v1 >= alertThreshold ? pal.alert : pal.textPrimary; })
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(function (d) { return formatValue(d.v1, config.valueFormat || "auto", isCurrencyHint); });
        }

        // X-Axis
        var tickStep = Math.max(1, Math.floor(xLabels.length / 8));
        var tickVals = xLabels.filter(function (_, idx) { return idx % tickStep === 0; });

        g.append("g")
          .attr("transform", "translate(0," + innerH + ")")
          .call(d3.axisBottom(xScale).tickValues(tickVals))
          .call(function (sel) {
            sel.select(".domain").attr("stroke", pal.border);
            sel.selectAll("text").attr("fill", pal.textMuted).attr("font-size", "10px").attr("dy", "8px");
          });

        done();
        return;
      }

      // ==========================================
      // MODE 2 & 3: HORIZONTAL LOLLIPOP / WATERFALL
      // ==========================================
      var longestLabelLen = d3.max(parsedRows, function (r) { return r.label.length; }) || 10;
      var idealLeft = Math.ceil(longestLabelLen * 6.2) + 18;
      var maxLeft = Math.floor(svgW * 0.40);
      var leftMargin = Math.max(80, Math.min(idealLeft, maxLeft));
      var maxChars = Math.max(8, Math.floor((leftMargin - 18) / 6.2));

      function truncLabel(s) {
        if (s.length <= maxChars) return s;
        return s.slice(0, Math.max(3, maxChars - 1)) + "…";
      }

      var marginBar = { top: 16, right: 88, bottom: 26, left: leftMargin };
      var barW = Math.max(120, svgW - marginBar.left - marginBar.right);
      var barH = Math.max(80, svgH - marginBar.top - marginBar.bottom);

      var gBar = svg.append("g").attr("transform", "translate(" + marginBar.left + "," + marginBar.top + ")");

      var yBand = d3.scaleBand()
        .domain(parsedRows.map(function (r) { return r.label; }))
        .range([0, barH])
        .padding(0.28);

      var maxBarV1 = d3.max(parsedRows, function (r) { return r.v1; }) || 1;
      var xLinear = d3.scaleLinear()
        .domain([0, maxBarV1 * 1.14])
        .range([0, barW]);

      // Gridlines
      gBar.append("g")
        .attr("transform", "translate(0," + barH + ")")
        .call(d3.axisBottom(xLinear).ticks(5).tickSize(-barH))
        .call(function (sel) {
          sel.select(".domain").remove();
          sel.selectAll("line").attr("stroke", "#f1f5f9");
          sel.selectAll("text").attr("fill", pal.textMuted).attr("font-size", "10px").attr("font-family", "monospace");
        });

      // Target Reference Line
      if (targetMode !== "none" && benchmarkVal > 0) {
        gBar.append("line")
          .attr("x1", xLinear(benchmarkVal))
          .attr("x2", xLinear(benchmarkVal))
          .attr("y1", 0)
          .attr("y2", barH)
          .attr("stroke", pal.alert)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3,3");

        gBar.append("text")
          .attr("x", xLinear(benchmarkVal))
          .attr("y", -4)
          .attr("text-anchor", "middle")
          .attr("fill", pal.alert)
          .attr("font-size", "9px")
          .attr("font-weight", "700")
          .text("SLA Target (" + formatValue(benchmarkVal, config.valueFormat || "auto", isCurrencyHint) + ")");
      }

      // Left Labels with Tooltip
      gBar.append("g")
        .call(d3.axisLeft(yBand).tickSize(0).tickFormat(truncLabel))
        .call(function (sel) {
          sel.select(".domain").remove();
          sel.selectAll("text")
            .attr("fill", pal.textPrimary)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("dx", "-6px");
        });

      gBar.selectAll(".tick text")
        .append("title")
        .text(function (d) { return d; });

      // Render Bars / Lollipops
      parsedRows.forEach(function (d, idx) {
        var isBreach = d.v1 >= alertThreshold;
        var barColor = isBreach ? pal.alert : (idx === 0 ? pal.primary : pal.accent);

        if (mode === "corridor_waterfall") {
          // Stepped Waterfall bar
          gBar.append("rect")
            .attr("x", 0)
            .attr("y", yBand(d.label))
            .attr("width", Math.max(3, xLinear(d.v1)))
            .attr("height", yBand.bandwidth())
            .attr("rx", 3)
            .attr("fill", barColor)
            .style("cursor", d.links.length ? "pointer" : "default")
            .on("click", function (event) { openDrill(event, d); })
            .append("title")
            .text(d.label + ": " + formatValue(d.v1, config.valueFormat || "auto", isCurrencyHint));
        } else {
          // Lollipop Stem
          gBar.append("line")
            .attr("x1", 0)
            .attr("x2", xLinear(d.v1))
            .attr("y1", yBand(d.label) + yBand.bandwidth() / 2)
            .attr("y2", yBand(d.label) + yBand.bandwidth() / 2)
            .attr("stroke", barColor)
            .attr("stroke-width", 2.5);

          // Lollipop Head Circle
          gBar.append("circle")
            .attr("cx", xLinear(d.v1))
            .attr("cy", yBand(d.label) + yBand.bandwidth() / 2)
            .attr("r", Math.min(8, yBand.bandwidth() / 2))
            .attr("fill", barColor)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .style("cursor", d.links.length ? "pointer" : "default")
            .on("click", function (event) { openDrill(event, d); })
            .append("title")
            .text(d.label + ": " + formatValue(d.v1, config.valueFormat || "auto", isCurrencyHint));
        }

        // Value Label on Right
        if (config.labelDensity !== "hidden") {
          var valText = formatValue(d.v1, config.valueFormat || "auto", isCurrencyHint);
          if (d.v2 !== null && !isNaN(d.v2)) {
            valText += " (" + formatValue(d.v2, "compact_number") + ")";
          }
          gBar.append("text")
            .attr("x", xLinear(d.v1) + 8)
            .attr("y", yBand(d.label) + yBand.bandwidth() / 2 + 4)
            .attr("fill", isBreach ? pal.alert : pal.textPrimary)
            .attr("font-size", "10px")
            .attr("font-family", "monospace")
            .attr("font-weight", isBreach ? "700" : "600")
            .style("cursor", d.links.length ? "pointer" : "default")
            .on("click", function (event) { openDrill(event, d); })
            .text(valText);
        }
      });

      done();
    }
  });
})();
