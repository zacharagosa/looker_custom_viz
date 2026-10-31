/**
 * Zayo NOC Executive KPI Card - Looker Custom Visualization
 * Enterprise-grade telecom network operations scorecard with Zayo Orange (#f5831f),
 * Google Enterprise, Modern Slate, Cyberpunk Dark, and Emerald FinOps color collections.
 *
 * Upgraded to enterprise standards with strict 2-tab schema (Display & Style):
 * - Dynamic field-role mapping dropdowns (Primary Metric, Category Dim, Time/Trend Dim, Target Meas)
 * - Configurable reference lines, target benchmarks (Mean, Median, P75, P90, Fixed Value, Measure)
 * - Series sorting, Top-N point limits with 'Other' rollup, and zero/null suppression
 * - Multi-mode Executive Scorecard HUD (Full Scorecard, Compact Strip, Hidden), sparkline toggle
 * - Enterprise brand palettes, custom hex overrides, metric polarity, font scaling, and value formatting
 * - Looker drill-down menu integration and debounced ResizeObserver (<4px guard)
 */

(function () {
  var PALETTES = {
    zayo_telecom: {
      name: "Zayo Telecom PMS 715 C (#f5831f)",
      primary: "#f5831f",
      secondary: "#ea580c",
      nominal: "#10b981",
      alert: "#e11d48",
      bgBadge: "#fff7ed",
      borderBadge: "#fed7aa",
      textBadge: "#c2410c",
      sparkFill: "rgba(245, 131, 31, 0.14)",
      borderLeft: "#f5831f",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b"
    },
    google_enterprise: {
      name: "Google Enterprise (#1a73e8)",
      primary: "#1a73e8",
      secondary: "#1557b0",
      nominal: "#1e8e3e",
      alert: "#d93025",
      bgBadge: "#e8f0fe",
      borderBadge: "#aecbfa",
      textBadge: "#174ea6",
      sparkFill: "rgba(26, 115, 232, 0.14)",
      borderLeft: "#1a73e8",
      cardBg: "#ffffff",
      textPrimary: "#202124",
      textMuted: "#5f6368"
    },
    modern_slate: {
      name: "Modern Studio Slate (#0f172a)",
      primary: "#0f172a",
      secondary: "#334155",
      nominal: "#059669",
      alert: "#dc2626",
      bgBadge: "#f1f5f9",
      borderBadge: "#cbd5e1",
      textBadge: "#1e293b",
      sparkFill: "rgba(15, 23, 42, 0.10)",
      borderLeft: "#0f172a",
      cardBg: "#ffffff",
      textPrimary: "#0f172a",
      textMuted: "#64748b"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (#00ffcc)",
      primary: "#00ffcc",
      secondary: "#7928ca",
      nominal: "#00ffcc",
      alert: "#ff0055",
      bgBadge: "rgba(0, 255, 204, 0.15)",
      borderBadge: "#00ffcc",
      textBadge: "#00ffcc",
      sparkFill: "rgba(0, 255, 204, 0.18)",
      borderLeft: "#00ffcc",
      cardBg: "#090d16",
      textPrimary: "#f9fafb",
      textMuted: "#9ca3af"
    },
    emerald_finops: {
      name: "Emerald FinOps (#10b981)",
      primary: "#10b981",
      secondary: "#059669",
      nominal: "#10b981",
      alert: "#ef4444",
      bgBadge: "#ecfdf5",
      borderBadge: "#a7f3d0",
      textBadge: "#047857",
      sparkFill: "rgba(16, 185, 129, 0.14)",
      borderLeft: "#10b981",
      cardBg: "#ffffff",
      textPrimary: "#064e3b",
      textMuted: "#047857"
    },
    sunset_media: {
      name: "Sunset Media (#f97316)",
      primary: "#f97316",
      secondary: "#c2410c",
      nominal: "#10b981",
      alert: "#e11d48",
      bgBadge: "#fff7ed",
      borderBadge: "#ffedd5",
      textBadge: "#c2410c",
      sparkFill: "rgba(249, 115, 22, 0.14)",
      borderLeft: "#f97316",
      cardBg: "#ffffff",
      textPrimary: "#431407",
      textMuted: "#9a3412"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (#0284c7)",
      primary: "#0284c7",
      secondary: "#0369a1",
      nominal: "#059669",
      alert: "#e11d48",
      bgBadge: "#f0f9ff",
      borderBadge: "#bae6fd",
      textBadge: "#0369a1",
      sparkFill: "rgba(2, 132, 199, 0.14)",
      borderLeft: "#0284c7",
      cardBg: "#ffffff",
      textPrimary: "#0c4a6e",
      textMuted: "#0369a1"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(Number(val))) return "-";
    var n = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + n.toFixed(2);
    }
    if (fmt === "compact_number") {
      if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
      return n.toLocaleString();
    }
    if (fmt === "percentage") {
      return (n * 100).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return n.toFixed(2);
    }
    if (fmt === "tbps") {
      return n.toFixed(1) + " Tbps";
    }
    if (fmt === "miles") {
      return Math.round(n).toLocaleString() + " mi";
    }
    if (fmt === "raw") {
      return String(val);
    }
    // auto fallback
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "zayo_noc_executive_scorecard",
    label: "Zayo NOC Executive KPI Card",
    options: {
      // ===== DISPLAY OPTIONS =====
      custom_title: {
        type: "string",
        label: "Card Title Override",
        default: "",
        placeholder: "e.g., Optical Route Miles",
        section: "Display",
        order: 1
      },
      custom_subtitle: {
        type: "string",
        label: "Subtitle / Telemetry Tag",
        default: "",
        placeholder: "e.g., 8 Core Corridors • DWDM C-Band",
        section: "Display",
        order: 2
      },
      badge_label: {
        type: "string",
        label: "Status Pill Label",
        default: "LIVE TELEMETRY",
        section: "Display",
        order: 3
      },
      measurePrimaryOverride: {
        type: "string",
        label: "Primary Measure / Metric",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      categoryDimOverride: {
        type: "string",
        label: "Category / Entity Dimension",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      timeDimOverride: {
        type: "string",
        label: "Time / Trend Dimension",
        display: "select",
        values: [{ "Auto (first date/time dimension)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetMeasOverride: {
        type: "string",
        label: "Target / SLA Benchmark Measure",
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
          { "None": "none" },
          { "Measure Column": "measure_column" },
          { "Fixed Value": "fixed_value" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median": "dataset_median" },
          { "Percentile P75": "percentile_p75" },
          { "Percentile P90": "percentile_p90" }
        ],
        default: "none",
        section: "Display",
        order: 8
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target / SLA Value",
        default: 100,
        section: "Display",
        order: 9
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Target Label",
        default: "SLA Benchmark",
        section: "Display",
        order: 10
      },
      anomalyThreshold: {
        type: "number",
        label: "Alert Delta Threshold (%)",
        default: 15,
        section: "Display",
        order: 11
      },
      sortOrder: {
        type: "string",
        label: "Series / Time Sort Order",
        display: "select",
        values: [
          { "Chronological / Natural (Query Order)": "natural" },
          { "Metric Descending": "metric_desc" },
          { "Metric Ascending": "metric_asc" },
          { "Alphabetical": "alphabetical" }
        ],
        default: "natural",
        section: "Display",
        order: 12
      },
      topNLimit: {
        type: "string",
        label: "Top-N Bucketing / Point Limit",
        display: "select",
        values: [
          { "All Points": "all" },
          { "Top 5 Points": "5" },
          { "Top 10 Points": "10" },
          { "Top 20 Points": "20" },
          { "Top 30 Points": "30" }
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
        label: "Suppress Zero / Null Observations",
        default: true,
        section: "Display",
        order: 15
      },
      hudMode: {
        type: "string",
        label: "Executive Scorecard HUD",
        display: "select",
        values: [
          { "Full Scorecard (Headline + Sparkline + Meta)": "scorecard" },
          { "Compact Strip (Value + Pill Only)": "compact_strip" },
          { "Minimal / Hidden Subtext": "hidden" }
        ],
        default: "scorecard",
        section: "Display",
        order: 16
      },
      showSparkline: {
        type: "boolean",
        label: "Render Micro-Sparkline",
        default: true,
        section: "Display",
        order: 17
      },
      showSearch: {
        type: "boolean",
        label: "Interactive Filter / Search Bar",
        default: false,
        section: "Display",
        order: 18
      },

      // ===== STYLE OPTIONS =====
      colorPalette: {
        type: "string",
        label: "Brand Color Palette",
        display: "select",
        values: [
          { "Zayo Telecom PMS 715 C (#f5831f)": "zayo_telecom" },
          { "Google Enterprise (#1a73e8)": "google_enterprise" },
          { "Modern Studio Slate (#0f172a)": "modern_slate" },
          { "Cyberpunk Dark (#00ffcc)": "cyberpunk_dark" },
          { "Emerald FinOps (#10b981)": "emerald_finops" },
          { "Sunset Media (#f97316)": "sunset_media" },
          { "Wellverse Healthcare (#0284c7)": "wellverse_healthcare" },
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
      customPositiveHex: {
        type: "string",
        label: "Custom Positive / Nominal Hex",
        display: "color",
        default: "#10b981",
        section: "Style",
        order: 3
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Negative / Alert Hex",
        display: "color",
        default: "#e11d48",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Higher is Better (Capacity, Route Miles, Throughput)": "higher_is_better" },
          { "Lower is Better (Attenuation, Latency, Outages, SLA Risk)": "lower_is_better" }
        ],
        default: "higher_is_better",
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
        label: "Value Format",
        display: "select",
        values: [
          { "Auto": "auto" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 decimal places)": "decimal_2" },
          { "Fiber Route Miles (1,250 mi)": "miles" },
          { "Optical Capacity (464.0 Tbps)": "tbps" },
          { "Raw Number": "raw" }
        ],
        default: "auto",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        measurePrimaryOverride: { role: "measure", defaultIdx: 0 },
        categoryDimOverride: { role: "dimension", defaultIdx: 0 },
        timeDimOverride: { role: "dimension", defaultIdx: -1 },
        targetMeasOverride: { role: "measure", defaultIdx: -1 }
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
      this._filterTerm = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      this._registerDynamicFieldOptions(queryResponse);

      if (!data || data.length === 0) {
        element.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;padding:16px;color:#64748b;font-size:12px;'>No telemetry data returned</div>";
        done();
        return;
      }

      var self = this;
      var qf = queryResponse.fields || {};
      var rawDims = qf.dimensions || qf.dimension_like || [];
      var rawMeas = qf.measures || qf.measure_like || [];
      if (!rawMeas.length && qf.table_calculations && qf.table_calculations.length) rawMeas = qf.table_calculations;

      function resolveFieldName(list, overrideVal, defaultIdx) {
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

      var primaryMeasName = resolveFieldName(rawMeas, config.measurePrimaryOverride, 0);
      var categoryDimName = resolveFieldName(rawDims, config.categoryDimOverride, 0);
      var timeDimName = resolveFieldName(rawDims, config.timeDimOverride, -1);
      var targetMeasName = resolveFieldName(rawMeas, config.targetMeasOverride, -1);

      // Auto-scan for time dim if not configured
      if (!timeDimName) {
        for (var di = 0; di < rawDims.length; di++) {
          var dName = rawDims[di].name.toLowerCase();
          if (dName.indexOf("date") !== -1 || dName.indexOf("time") !== -1 || dName.indexOf("month") !== -1 || dName.indexOf("day") !== -1) {
            timeDimName = rawDims[di].name;
            break;
          }
        }
      }

      // If still no primary measure, scan candidates for numeric values across rows
      function isNumeric(v) {
        if (v === null || v === undefined || v === "") return false;
        return typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)));
      }

      if (!primaryMeasName) {
        var candidates = [].concat(rawMeas, rawDims);
        for (var ci = 0; ci < candidates.length; ci++) {
          var cName = candidates[ci].name;
          var numFound = false;
          for (var r = 0; r < Math.min(data.length, 25); r++) {
            var cellVal = data[r][cName];
            if (cellVal && isNumeric(cellVal.value)) {
              numFound = true;
              break;
            }
          }
          if (numFound) {
            primaryMeasName = cName;
            break;
          }
        }
      }

      if (!primaryMeasName && data[0]) {
        primaryMeasName = Object.keys(data[0])[0];
      }

      // Find field labels
      var primaryFieldObj = rawMeas.concat(rawDims).find(function (fld) { return fld.name === primaryMeasName; });
      var defaultTitle = primaryFieldObj ? (primaryFieldObj.label_short || primaryFieldObj.label) : "Network Telemetry Metric";
      var cardTitle = config.custom_title || defaultTitle;

      // Extract raw observations
      var rows = [];
      var suppressZeros = config.suppressZeroNull !== false;

      for (var i = 0; i < data.length; i++) {
        var rowObj = data[i];
        var cell = rowObj[primaryMeasName];
        var val = cell && cell.value !== undefined ? cell.value : null;

        if (suppressZeros && (val === null || val === undefined || Number(val) === 0)) {
          continue;
        }
        if (!isNumeric(val)) continue;

        var catVal = categoryDimName && rowObj[categoryDimName] ? (rowObj[categoryDimName].value || rowObj[categoryDimName].rendered) : "Span " + (i + 1);
        var timeVal = timeDimName && rowObj[timeDimName] ? (rowObj[timeDimName].value || rowObj[timeDimName].rendered) : null;
        var targetVal = targetMeasName && rowObj[targetMeasName] && isNumeric(rowObj[targetMeasName].value) ? Number(rowObj[targetMeasName].value) : null;

        rows.push({
          numVal: Number(val),
          rendered: cell && cell.rendered ? cell.rendered : null,
          links: cell && cell.links ? cell.links : [],
          cat: catVal,
          time: timeVal,
          target: targetVal,
          rawRow: rowObj
        });
      }

      // Apply Search Filter if active
      if (this._filterTerm && this._filterTerm.trim() !== "") {
        var term = this._filterTerm.toLowerCase();
        rows = rows.filter(function (r) {
          return String(r.cat).toLowerCase().indexOf(term) !== -1 || (r.time && String(r.time).toLowerCase().indexOf(term) !== -1);
        });
      }

      // Apply Sorting
      var sortMode = config.sortOrder || "natural";
      if (sortMode === "metric_desc") {
        rows.sort(function (a, b) { return b.numVal - a.numVal; });
      } else if (sortMode === "metric_asc") {
        rows.sort(function (a, b) { return a.numVal - b.numVal; });
      } else if (sortMode === "alphabetical") {
        rows.sort(function (a, b) { return String(a.cat).localeCompare(String(b.cat)); });
      }

      // Apply Top-N & Other Rollup
      var topN = config.topNLimit || "all";
      if (topN !== "all") {
        var limitN = parseInt(topN, 10);
        if (!isNaN(limitN) && rows.length > limitN) {
          if (config.enableOtherRollup) {
            var head = rows.slice(0, limitN);
            var tail = rows.slice(limitN);
            var otherSum = tail.reduce(function (acc, r) { return acc + r.numVal; }, 0);
            head.push({
              numVal: otherSum,
              rendered: null,
              links: [],
              cat: "Other (" + tail.length + " spans)",
              time: null,
              target: null,
              rawRow: null
            });
            rows = head;
          } else {
            rows = rows.slice(0, limitN);
          }
        }
      }

      if (rows.length === 0) {
        element.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;padding:16px;color:#64748b;font-size:12px;'>No matching metric values found</div>";
        done();
        return;
      }

      // Compute aggregates
      var numericSeries = rows.map(function (r) { return r.numVal; });
      var sumVal = numericSeries.reduce(function (a, b) { return a + b; }, 0);
      var meanVal = sumVal / numericSeries.length;
      var sortedSeries = numericSeries.slice().sort(function (a, b) { return a - b; });
      var medianVal = sortedSeries[Math.floor(sortedSeries.length / 2)];
      var p75Val = sortedSeries[Math.floor(sortedSeries.length * 0.75)] || medianVal;
      var p90Val = sortedSeries[Math.floor(sortedSeries.length * 0.90)] || p75Val;

      // Primary Headline Value
      var headlineVal = numericSeries.length === 1 ? numericSeries[0] : (timeDimName ? numericSeries[numericSeries.length - 1] : sumVal);

      // Target Benchmark Evaluation
      var targetMode = config.targetGoalMode || "none";
      var benchmarkVal = null;
      if (targetMode === "fixed_value") {
        benchmarkVal = Number(config.fixedTargetValue) || 0;
      } else if (targetMode === "dataset_mean") {
        benchmarkVal = meanVal;
      } else if (targetMode === "dataset_median") {
        benchmarkVal = medianVal;
      } else if (targetMode === "percentile_p75") {
        benchmarkVal = p75Val;
      } else if (targetMode === "percentile_p90") {
        benchmarkVal = p90Val;
      } else if (targetMode === "measure_column") {
        var targets = rows.map(function (r) { return r.target; }).filter(function (t) { return t !== null; });
        if (targets.length) {
          benchmarkVal = targets.reduce(function (a, b) { return a + b; }, 0) / targets.length;
        }
      }

      // Delta and status calculation
      var deltaPct = null;
      var isAlert = false;
      var polarity = config.metricPolarity || "higher_is_better";
      var alertThreshold = Number(config.anomalyThreshold) || 15;

      if (benchmarkVal !== null && benchmarkVal !== 0) {
        deltaPct = ((headlineVal - benchmarkVal) / Math.abs(benchmarkVal)) * 100;
        if (polarity === "higher_is_better") {
          isAlert = deltaPct < -alertThreshold;
        } else {
          isAlert = deltaPct > alertThreshold;
        }
      }

      // Brand Theming
      var paletteKey = config.colorPalette || "zayo_telecom";
      var basePalette = PALETTES[paletteKey] || PALETTES.zayo_telecom;
      var palette = Object.assign({}, basePalette);

      if (paletteKey === "custom_hex" || config.customPrimaryHex) {
        if (config.customPrimaryHex) palette.primary = config.customPrimaryHex;
        if (config.customPositiveHex) palette.nominal = config.customPositiveHex;
        if (config.customNegativeHex) palette.alert = config.customNegativeHex;
        palette.borderLeft = palette.primary;
        palette.sparkFill = palette.primary + "22";
      }

      var statusColor = isAlert ? palette.alert : palette.nominal;
      var statusBg = isAlert ? (palette.alert + "18") : (palette.nominal + "18");
      var statusBorder = isAlert ? (palette.alert + "44") : (palette.nominal + "44");

      // Format headline value
      var fmtType = config.valueFormat || "auto";
      if (fmtType === "auto") {
        var fLower = primaryMeasName.toLowerCase();
        if (fLower.indexOf("miles") !== -1) fmtType = "miles";
        else if (fLower.indexOf("capacity") !== -1 || fLower.indexOf("tbps") !== -1) fmtType = "tbps";
        else if (fLower.indexOf("sla") !== -1 || fLower.indexOf("usd") !== -1 || fLower.indexOf("price") !== -1) fmtType = "compact_currency";
        else if (fLower.indexOf("pct") !== -1 || fLower.indexOf("rate") !== -1) fmtType = "percentage";
      }
      var formattedHeadline = formatValue(headlineVal, fmtType);

      // Subtitle resolution
      var subtitle = config.custom_subtitle || "";
      if (!subtitle) {
        var fLower2 = primaryMeasName.toLowerCase();
        if (fLower2.indexOf("miles") !== -1) subtitle = "8 Core US Fiber Corridors • ITU-T G.652.D";
        else if (fLower2.indexOf("capacity") !== -1) subtitle = "400G / 800G Coherent Optical Waves";
        else if (fLower2.indexOf("traffic") !== -1 || fLower2.indexOf("gbps") !== -1) subtitle = "ARIMA_PLUS 95% Confidence Bounds";
        else if (fLower2.indexOf("attenuation") !== -1 || fLower2.indexOf("anomaly") !== -1) subtitle = "OTDR & DWDM Telemetry Sensors";
        else if (fLower2.indexOf("sla") !== -1 || fLower2.indexOf("risk") !== -1) subtitle = "AutoML Failure Risk & Dispatch Queue";
        else subtitle = "Zayo Autonomous Telecom Intelligence";
      }

      var badgeText = config.badge_label || (isAlert ? "SLA RISK ALERT" : "TELEMETRY NOMINAL");

      // Container Dimensions & Responsive Sizing
      if (!element.clientHeight) {
        element.style.height = "100%";
      }
      var elH = element.clientHeight || 140;
      var elW = element.clientWidth || 280;

      var fontScaleMode = config.fontScale || "standard";
      var scaleMul = fontScaleMode === "compact" ? 0.85 : (fontScaleMode === "large_presentation" ? 1.2 : 1.0);

      var tight = elH < 120;
      var snug = elH < 155;
      var narrow = elW < 290;

      var padV = tight ? 6 : (snug ? 8 : 12);
      var padH = tight ? 10 : (snug ? 12 : 14);
      var titleFs = Math.round((tight ? 9.5 : (snug ? 10 : 11)) * scaleMul);
      var valueFs = Math.round((tight ? 20 : (snug ? 24 : 28)) * scaleMul);
      var subFs = Math.round((tight ? 9 : (snug ? 9.5 : 10.5)) * scaleMul);

      // Micro-Sparkline SVG
      var sparkSvg = "";
      var showSpark = config.showSparkline !== false && numericSeries.length > 2;
      if (showSpark) {
        var sMin = Math.min.apply(null, numericSeries);
        var sMax = Math.max.apply(null, numericSeries);
        var sRange = sMax - sMin || 1;
        var sw = tight ? 70 : (snug ? 90 : 110);
        var sh = tight ? 20 : (snug ? 24 : 28);

        var pts = numericSeries.map(function (v, idx) {
          var px = (idx / (numericSeries.length - 1)) * sw;
          var py = sh - 3 - ((v - sMin) / sRange) * (sh - 6);
          return px.toFixed(1) + "," + py.toFixed(1);
        }).join(" ");

        var areaPts = "0," + sh + " " + pts + " " + sw + "," + sh;
        sparkSvg =
          '<svg width="' + sw + '" height="' + sh + '" style="display:block;flex-shrink:0;overflow:visible;">' +
            '<polygon points="' + areaPts + '" fill="' + palette.sparkFill + '" />' +
            '<polyline fill="none" stroke="' + palette.primary + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '" />' +
          '</svg>';
      }

      // Target Delta Pill / Chip
      var deltaHtml = "";
      if (deltaPct !== null) {
        var sign = deltaPct >= 0 ? "+" : "";
        var deltaFmt = sign + deltaPct.toFixed(1) + "%";
        var deltaLabel = config.referenceLineLabel || "Benchmark";
        deltaHtml =
          '<span style="font-size:' + (titleFs - 1) + 'px;font-weight:700;padding:2px 6px;border-radius:4px;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + ';white-space:nowrap;margin-left:6px;">' +
            deltaFmt + ' vs ' + deltaLabel +
          '</span>';
      }

      // Search Bar Row (if enabled)
      var searchHtml = "";
      if (config.showSearch) {
        searchHtml =
          '<div style="flex:0 0 auto;margin-bottom:6px;">' +
            '<input type="text" id="zayo_kpi_search" placeholder="Filter corridor/entity..." value="' + (self._filterTerm || "") + '" ' +
            'style="width:100%;box-sizing:border-box;font-size:11px;padding:3px 7px;border-radius:4px;border:1px solid #cbd5e1;outline:none;" />' +
          '</div>';
      }

      // Drill Affordance
      var hasDrill = rows.some(function (r) { return r.links && r.links.length > 0; });
      var drillCursor = hasDrill ? "cursor:pointer;" : "";

      var hudMode = config.hudMode || "scorecard";

      var bodyContent = "";
      if (hudMode === "compact_strip") {
        bodyContent =
          '<div style="height:100%;width:100%;box-sizing:border-box;background:' + palette.cardBg + ';border:1px solid #e2e8f0;border-left:4px solid ' + palette.borderLeft + ';border-radius:8px;padding:' + padV + 'px ' + padH + 'px;display:flex;align-items:center;justify-content:space-between;gap:8px;' + drillCursor + '">' +
            '<div style="min-width:0;display:flex;align-items:baseline;gap:8px;">' +
              '<span style="font-size:' + valueFs + 'px;font-weight:800;color:' + palette.textPrimary + ';font-family:\'JetBrains Mono\',monospace;letter-spacing:-0.02em;">' +
                formattedHeadline +
              '</span>' +
              '<span style="font-size:' + titleFs + 'px;font-weight:700;color:' + palette.textMuted + ';text-transform:uppercase;">' +
                cardTitle +
              '</span>' +
            '</div>' +
            '<span style="font-size:' + (titleFs - 1) + 'px;font-weight:700;font-family:monospace;padding:2px 6px;border-radius:4px;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + ';">' +
              badgeText +
            '</span>' +
          '</div>';
      } else {
        // Full Scorecard or Minimal
        var footerHtml = "";
        if (hudMode !== "hidden") {
          footerHtml =
            '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #f1f5f9;padding-top:' + (tight ? 3 : 5) + 'px;min-width:0;">' +
              '<span style="font-size:' + subFs + 'px;color:' + palette.textMuted + ';font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' +
                subtitle +
              '</span>' +
              '<span style="width:7px;height:7px;border-radius:50%;background:' + statusColor + ';display:inline-block;flex-shrink:0;box-shadow:0 0 0 3px ' + statusBg + ';"></span>' +
            '</div>';
        }

        bodyContent =
          '<div style="height:100%;width:100%;box-sizing:border-box;background:' + palette.cardBg + ';border:1px solid #e2e8f0;border-left:4px solid ' + palette.borderLeft + ';border-radius:10px;padding:' + padV + 'px ' + padH + 'px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.05);' + drillCursor + '">' +
            searchHtml +
            '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;">' +
              '<div style="display:flex;align-items:center;min-width:0;overflow:hidden;">' +
                '<span style="font-size:' + titleFs + 'px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:' + palette.textMuted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                  cardTitle +
                '</span>' +
                deltaHtml +
              '</div>' +
              '<span style="font-size:' + (titleFs - 1) + 'px;font-weight:700;font-family:monospace;padding:2px 6px;border-radius:4px;background:' + statusBg + ';color:' + statusColor + ';border:1px solid ' + statusBorder + ';white-space:nowrap;flex-shrink:0;">' +
                badgeText +
              '</span>' +
            '</div>' +
            '<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:space-between;gap:10px;overflow:hidden;margin:2px 0;">' +
              '<div style="font-size:' + valueFs + 'px;font-weight:800;color:' + palette.textPrimary + ';font-family:\'JetBrains Mono\',monospace;letter-spacing:-0.02em;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' +
                formattedHeadline +
              '</div>' +
              sparkSvg +
            '</div>' +
            footerHtml +
          '</div>';
      }

      element.innerHTML = bodyContent;

      // Search input handler
      if (config.showSearch) {
        var sInput = element.querySelector("#zayo_kpi_search");
        if (sInput) {
          sInput.addEventListener("input", function (e) {
            self._filterTerm = e.target.value;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          });
        }
      }

      // Drill link click handler
      if (hasDrill) {
        element.onclick = function (event) {
          var firstDrillRow = rows.find(function (r) { return r.links && r.links.length > 0; });
          if (firstDrillRow && firstDrillRow.links && firstDrillRow.links.length > 0) {
            if (typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({
                links: firstDrillRow.links,
                event: event
              });
            }
          }
        };
      } else {
        element.onclick = null;
      }

      // Cache for debounced ResizeObserver
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastH = elH;

      if (!this._ro && typeof ResizeObserver !== "undefined") {
        var roTimer = null;
        this._ro = new ResizeObserver(function () {
          if (roTimer) clearTimeout(roTimer);
          roTimer = setTimeout(function () {
            if (!self._lastData || Math.abs((element.clientHeight || 0) - (self._lastH || 0)) < 4) return;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 120);
        });
        this._ro.observe(element);
      }

      done();
    }
  });
})();
