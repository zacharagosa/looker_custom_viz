/**
 * Compliance & SLA Aging Ridgeline Joyplot Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Cloud Governance & Security Compliance Suite:
 * - 4 Multi-Modal Visual Paradigms:
 *     1. "ridgeline_joyplot": Overlapping Kernel Density Estimation (KDE) ridgeline waves with
 *        dual-zone SLA Breach Tail highlighting (compliant vs >SLA breach tail), median & P90 markers,
 *        and quantile rug ticks underneath each baseline.
 *     2. "sla_ecdf_curve": Empirical Cumulative Distribution Function (ECDF) step-curves showing
 *        % of findings remediated/contained within N days against the vertical CISO SLA target line.
 *     3. "quantile_beeswarm_strip": Horizontal IQR quantile strips (P25-P75 box, P10-P90 whiskers, P50 diamond)
 *        with jittered severity-encoded finding beads & SLA breach rings.
 *     4. "breach_horizon_matrix": Framework x Secondary Group (Cloud Provider / Severity) SLA breach rate
 *        & median aging heatmap matrix with inline proportional SLA compliance bars.
 * - Dynamic Field-Role Mapping via _registerDynamicFieldOptions (Group, Sub-Group, Severity, Numeric Aging Value, Target Measure)
 * - Configurable CISO SLA Target & Anomaly Alert Thresholds (Fixed, Mean, Median, P75, P90, Measure Column, None)
 * - Sorting, Top-N Bucketing with automatic 'Other Groups' Rollup, and Zero/Null Suppression
 * - Executive GRC Scorecard HUD (Full Scorecard / Compact Strip / Hidden), Label Density, Legend & Search Filter
 * - Enterprise Palettes + Custom Hex Overrides (display: 'color'), Polarity, Font Scale & Value Formats
 * - 5,000+ Row Client-Side O(N) Bucketing, Debounced ResizeObserver (<4px guard) & Looker Drill-Down Support
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
      name: "Google Enterprise",
      primary: "#1a73e8",
      secondary: "#174ea6",
      accent: "#0d9488",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      positive: "#137333",
      negative: "#d93025",
      warning: "#f29900",
      series: ["#1a73e8", "#0d9488", "#9334e6", "#e37400", "#0284c7", "#1e8e3e"],
      breachFill: "rgba(217, 48, 37, 0.34)",
      breachStroke: "#d93025"
    },
    modern_slate: {
      name: "Modern Slate",
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#6366f1",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      positive: "#059669",
      negative: "#e11d48",
      warning: "#d97706",
      series: ["#2563eb", "#4f46e5", "#0891b2", "#0f766e", "#64748b", "#3b82f6"],
      breachFill: "rgba(225, 29, 72, 0.32)",
      breachStroke: "#e11d48"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      primary: "#38bdf8",
      secondary: "#a855f7",
      accent: "#22d3ee",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#334155",
      grid: "#1e293b",
      cardBg: "#1e293b",
      positive: "#34d399",
      negative: "#f43f5e",
      warning: "#fbbf24",
      series: ["#38bdf8", "#a855f7", "#2dd4bf", "#f59e0b", "#818cf8", "#34d399"],
      breachFill: "rgba(244, 63, 94, 0.40)",
      breachStroke: "#f43f5e"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#059669",
      secondary: "#047857",
      accent: "#0d9488",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#ecfdf5",
      cardBg: "#f0fdf4",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706",
      series: ["#059669", "#0d9488", "#10b981", "#0284c7", "#65a30d", "#047857"],
      breachFill: "rgba(220, 38, 38, 0.32)",
      breachStroke: "#dc2626"
    },
    sunset_media: {
      name: "Sunset Media",
      primary: "#ea580c",
      secondary: "#c2410c",
      accent: "#d97706",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#fff7ed",
      cardBg: "#fffbeb",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#ea580c",
      series: ["#ea580c", "#d97706", "#db2777", "#9333ea", "#0284c7", "#059669"],
      breachFill: "rgba(220, 38, 38, 0.34)",
      breachStroke: "#dc2626"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      primary: "#00AF68",
      secondary: "#143359",
      accent: "#0284c7",
      bg: "#ffffff",
      text: "#0F172A",
      subtext: "#64748B",
      border: "#E2E8F0",
      grid: "#F8FAFC",
      cardBg: "#F8FAFC",
      positive: "#006B40",
      negative: "#B42318",
      warning: "#ea580c",
      series: ["#00AF68", "#143359", "#0284c7", "#0d9488", "#6366f1", "#475569"],
      breachFill: "rgba(180, 35, 24, 0.32)",
      breachStroke: "#B42318"
    }
  };

  var SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFORMATIONAL: 0 };

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
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
    if (defaultIdx === -1) return null;
    return list[defaultIdx] || list[0];
  }

  function shortFieldKey(field) {
    if (!field || !field.name) return "";
    var parts = String(field.name).split(".");
    return parts[parts.length - 1].toLowerCase();
  }

  function findNumericObservationField(dims, meas, data) {
    var candidates = [];
    // Prefer explicit continuous numeric dimensions (e.g. days_open, mttd_minutes, mttr_minutes, score, latency)
    for (var i = 0; i < dims.length; i++) {
      var sk = shortFieldKey(dims[i]);
      if (/(_id|^id$)/.test(sk)) continue;
      if (/(days|age|open|duration|mttr|mttd|latency|score|price|cost|time|minutes|hours)/.test(sk)) {
        candidates.push(dims[i]);
      }
    }
    for (var m = 0; m < meas.length; m++) {
      candidates.push(meas[m]);
    }
    for (var d = 0; d < dims.length; d++) {
      var sk2 = shortFieldKey(dims[d]);
      if (!/(_id|^id$)/.test(sk2) && candidates.indexOf(dims[d]) === -1) {
        candidates.push(dims[d]);
      }
    }
    for (var c = 0; c < candidates.length; c++) {
      var fld = candidates[c];
      var numCount = 0;
      for (var r = 0; r < Math.min(data.length, 40); r++) {
        var cell = data[r][fld.name];
        if (cell && cell.value !== null && cell.value !== undefined && cell.value !== "" && !isNaN(Number(cell.value))) {
          numCount++;
        }
      }
      if (numCount > 0) return fld;
    }
    return meas[0] || dims[dims.length - 1] || dims[0];
  }

  function findGroupField(dims, excludeNames) {
    var preferred = /(framework|compliance|policy|category|tactic|provider|cloud|department|region|resource_type|rule)/;
    for (var i = 0; i < dims.length; i++) {
      if (excludeNames.indexOf(dims[i].name) !== -1) continue;
      if (preferred.test(shortFieldKey(dims[i]))) return dims[i];
    }
    for (var j = 0; j < dims.length; j++) {
      if (excludeNames.indexOf(dims[j].name) !== -1) continue;
      if (!/(_id|^id$)/.test(shortFieldKey(dims[j]))) return dims[j];
    }
    return dims[0] || null;
  }

  function findSubGroupField(dims, excludeNames) {
    var preferred = /(provider|cloud|resource_type|environment|tier|team|region|status)/;
    for (var i = 0; i < dims.length; i++) {
      if (excludeNames.indexOf(dims[i].name) !== -1) continue;
      if (preferred.test(shortFieldKey(dims[i]))) return dims[i];
    }
    for (var j = 0; j < dims.length; j++) {
      if (excludeNames.indexOf(dims[j].name) !== -1) continue;
      if (!/(_id|^id$)/.test(shortFieldKey(dims[j]))) return dims[j];
    }
    return null;
  }

  function findSeverityField(dims, excludeNames) {
    var preferred = /(severity|priority|risk|tier|status)/;
    for (var i = 0; i < dims.length; i++) {
      if (excludeNames.indexOf(dims[i].name) !== -1) continue;
      if (preferred.test(shortFieldKey(dims[i]))) return dims[i];
    }
    return null;
  }

  function extractDrillLinks(row, preferredFields) {
    if (!row) return [];
    for (var i = 0; i < preferredFields.length; i++) {
      var f = preferredFields[i];
      if (f && row[f.name] && row[f.name].links && row[f.name].links.length > 0) {
        return row[f.name].links;
      }
    }
    var keys = Object.keys(row);
    for (var j = 0; j < keys.length; j++) {
      var cell = row[keys[j]];
      if (cell && cell.links && cell.links.length > 0) return cell.links;
    }
    return [];
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";
    switch (fmt) {
      case "days_1dp":
        return sign + abs.toFixed(abs % 1 === 0 ? 0 : 1) + "d";
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percentage":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "auto":
      default:
        return sign + (abs >= 1000 ? (abs / 1000).toFixed(1) + "K" : (abs % 1 === 0 ? String(abs) : abs.toFixed(1))) + "d";
    }
  }

  function gaussianKDE(values, gridPoints, bandwidth) {
    var invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);
    var n = values.length;
    if (n === 0) return gridPoints.map(function (x) { return [x, 0]; });
    var h = bandwidth > 0 ? bandwidth : 4;
    return gridPoints.map(function (x) {
      var sum = 0;
      for (var i = 0; i < n; i++) {
        var u = (x - values[i]) / h;
        sum += invSqrt2Pi * Math.exp(-0.5 * u * u);
      }
      return [x, sum / (n * h)];
    });
  }

  function silvermanBandwidth(sortedVals, span) {
    var n = sortedVals.length;
    if (n < 2) return Math.max(span * 0.08, 1);
    var mean = d3.mean(sortedVals) || 0;
    var variance = d3.mean(sortedVals, function (v) { return (v - mean) * (v - mean); }) || 0;
    var sd = Math.sqrt(variance);
    var q1 = d3.quantile(sortedVals, 0.25) || sd;
    var q3 = d3.quantile(sortedVals, 0.75) || sd;
    var iqr = q3 - q1;
    var sigma = iqr > 0 ? Math.min(sd, iqr / 1.34) : sd;
    if (!sigma || sigma <= 0) sigma = Math.max(span * 0.1, 1);
    var h = 0.9 * sigma * Math.pow(n, -0.2);
    return Math.max(h, span * 0.035, 0.5);
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark, scaleFactor) {
    var card = document.createElement("div");
    card.style.flex = "1 1 130px";
    card.style.minWidth = "120px";
    card.style.padding = Math.round(7 * scaleFactor) + "px " + Math.round(11 * scaleFactor) + "px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.88)" : theme.cardBg;
    card.style.border = "1px solid " + theme.border;
    card.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = Math.round(10 * scaleFactor) + "px";
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
    val.style.fontSize = Math.round(16 * scaleFactor) + "px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = Math.round(10.5 * scaleFactor) + "px";
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

  var visObject = {
    id: "compliance_sla_ridgeline_analyzer",
    label: "Compliance & SLA Aging Ridgeline Joyplot",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm Mode",
        display: "select",
        values: [
          { "Overlapping KDE Ridgeline Joyplot (SLA Tail Fill)": "ridgeline_joyplot" },
          { "Empirical SLA Remediation ECDF Curve": "sla_ecdf_curve" },
          { "Quantile IQR Strip & Severity Beeswarm": "quantile_beeswarm_strip" },
          { "Framework x Cloud SLA Breach Matrix": "breach_horizon_matrix" }
        ],
        default: "ridgeline_joyplot",
        section: "Display",
        order: 1
      },
      groupDimOverride: {
        type: "string",
        label: "Primary Ridgeline Group Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      subGroupDimOverride: {
        type: "string",
        label: "Secondary Slice / Matrix Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      severityDimOverride: {
        type: "string",
        label: "Severity / Risk Tier Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      valueFieldOverride: {
        type: "string",
        label: "Continuous Aging / Latency Value Field",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      targetMeasureOverride: {
        type: "string",
        label: "SLA Target Measure Column (Optional)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetMode: {
        type: "string",
        label: "SLA Remediation Benchmark Mode",
        display: "select",
        values: [
          { "Fixed SLA Threshold (e.g. 30 Days)": "fixed" },
          { "Dataset Mean": "dataset_mean" },
          { "Dataset Median (P50)": "dataset_median" },
          { "Percentile P75": "percentile_p75" },
          { "Percentile P90": "percentile_p90" },
          { "Target Measure Column": "measure_column" },
          { "None (Hide SLA Target)": "none" }
        ],
        default: "fixed",
        section: "Display",
        order: 7
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed SLA Target Value (Days)",
        default: 30,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference SLA Line Label",
        default: "CISO 30-Day Remediation SLA",
        section: "Display",
        order: 9
      },
      anomalyThresholdPct: {
        type: "number",
        label: "SLA Breach Alert Threshold (% Over SLA)",
        default: 40,
        section: "Display",
        order: 10
      },
      ridgeOverlap: {
        type: "number",
        label: "Ridgeline Wave Overlap Factor (1.0 - 2.4)",
        default: 1.45,
        section: "Display",
        order: 11
      },
      kdeBandwidth: {
        type: "number",
        label: "KDE Smoothing Bandwidth (0 = Auto Silverman)",
        default: 0,
        section: "Display",
        order: 12
      },
      sortBy: {
        type: "string",
        label: "Sort Groups By",
        display: "select",
        values: [
          { "SLA Breach Rate Descending (Highest Risk First)": "breach_desc" },
          { "Median Aging Descending (Longest Dwell First)": "median_desc" },
          { "Median Aging Ascending (Fastest First)": "median_asc" },
          { "Finding Volume Descending": "count_desc" },
          { "Group Name Alphabetical (A-Z)": "alpha_asc" }
        ],
        default: "breach_desc",
        section: "Display",
        order: 13
      },
      topNLimit: {
        type: "number",
        label: "Top-N Groups Limit (0 = All)",
        default: 0,
        section: "Display",
        order: 14
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Up Remaining Groups into 'Other'",
        default: true,
        section: "Display",
        order: 15
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Observations",
        default: true,
        section: "Display",
        order: 16
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
        order: 17
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "Median & Breach Peaks Only": "peaks_only" },
          { "All Labels (Median, P90 & Breach %)": "all" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only",
        section: "Display",
        order: 18
      },
      showLegend: {
        type: "boolean",
        label: "Show SLA Tail & Marker Legend",
        default: true,
        section: "Display",
        order: 19
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Filter & Search Bar",
        default: true,
        section: "Display",
        order: 20
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 21
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
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
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Custom Hex Override": "custom" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary Compliant Wave Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Compliant / Healthy Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom SLA Breach Tail Hex",
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
          { "Lower is Better (Days Open / Dwell / MTTR)": "lower_is_better" },
          { "Higher is Better (Compliance Score / Attainment)": "higher_is_better" }
        ],
        default: "lower_is_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scaling",
        display: "select",
        values: [
          { "Compact (Dense Dashboard Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Wallboard)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value & Axis Display Format",
        display: "select",
        values: [
          { "Days (e.g. 34d / 42.5d)": "days_1dp" },
          { "Auto (Smart Units)": "auto" },
          { "Compact Number (1.2K / 45)": "compact_number" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "days_1dp",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        groupDimOverride: { role: "dimension", defaultIdx: 0 },
        subGroupDimOverride: { role: "dimension", defaultIdx: 1 },
        severityDimOverride: { role: "dimension", defaultIdx: -1 },
        valueFieldOverride: { role: "any", defaultIdx: -1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
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
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / Smart Detect";
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
        console.warn("registerOptions unavailable:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._setupResizeObserver(element);

      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      var container = document.createElement("div");
      container.className = "compliance-ridgeline-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "compliance-ridgeline-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.maxWidth = "300px";
      document.body.appendChild(tooltip);
      this._tooltip = tooltip;
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
      }, 50);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);
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

      var self = this;
      if (this.clearErrors) try { this.clearErrors(); } catch (e) {}

      if (!data || data.length === 0) {
        if (this.addError) {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned no findings or observations to plot."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var fields = (queryResponse && queryResponse.fields) || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) {
        meas = fields.table_calculations;
      }

      if (dims.length === 0 && meas.length === 0) {
        if (this.addError) {
          try {
            this.addError({
              title: "Fields Required",
              message: "Select at least 1 Group Dimension (e.g. Compliance Framework) and 1 Numeric Field (e.g. Days Open)."
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
          console.error("Compliance Ridgeline render error:", err);
          if (self.addError) {
            try {
              self.addError({
                title: "Rendering Error",
                message: err.message || "An error occurred rendering Compliance & SLA Ridgeline Analyzer."
              });
            } catch (e) {}
          }
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".compliance-ridgeline-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_enterprise";
      var rawTheme = THEMES[themeKey] || THEMES.google_enterprise;
      var isDark = themeKey === "cyberpunk_dark";

      var theme = Object.assign({}, rawTheme);
      if (config.customPrimaryColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customPrimaryColor.trim())) {
        theme.primary = config.customPrimaryColor.trim();
        theme.series = [theme.primary].concat(theme.series.slice(1));
      }
      if (config.customPositiveColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customPositiveColor.trim())) {
        theme.positive = config.customPositiveColor.trim();
      }
      if (config.customNegativeColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customNegativeColor.trim())) {
        theme.negative = config.customNegativeColor.trim();
        theme.breachStroke = config.customNegativeColor.trim();
        theme.breachFill = config.customNegativeColor.trim() + "55";
      }

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var fontScale = config.fontScale || "standard";
      var scaleFactor = fontScale === "compact" ? 0.88 : fontScale === "large" ? 1.15 : 1.0;
      container.style.fontSize = Math.round(12.5 * scaleFactor) + "px";

      var fields = queryResponse.fields || {};
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      var allNumericCandidates = dims.concat(meas);
      var valueField = config.valueFieldOverride
        ? resolveField(allNumericCandidates, config.valueFieldOverride, 0)
        : findNumericObservationField(dims, meas, data);

      var exclude = valueField ? [valueField.name] : [];
      var groupField = config.groupDimOverride
        ? resolveField(dims, config.groupDimOverride, 0)
        : findGroupField(dims, exclude);
      if (groupField) exclude.push(groupField.name);

      var subGroupField = config.subGroupDimOverride
        ? resolveField(dims, config.subGroupDimOverride, -1)
        : findSubGroupField(dims, exclude);
      if (subGroupField) exclude.push(subGroupField.name);

      var severityField = config.severityDimOverride
        ? resolveField(dims, config.severityDimOverride, -1)
        : findSeverityField(dims, exclude);

      var targetColField = resolveField(meas, config.targetMeasureOverride, -1);

      var layoutMode = config.layoutMode || "ridgeline_joyplot";
      var fmt = config.valueFormat || "days_1dp";
      var polarity = config.metricPolarity || "lower_is_better";
      var suppressZeroNull = config.suppressZeroNull !== false;
      var enableOtherRollup = config.enableOtherRollup !== false;
      var labelDensity = config.labelDensity || "peaks_only";

      // O(N) Observation Ingestion across 5,000+ rows
      var obs = [];
      var allVals = [];
      var colTargetVals = [];
      var hasDrill = false;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var vCell = valueField && row[valueField.name];
        if (!vCell || vCell.value === null || vCell.value === undefined || vCell.value === "") continue;
        var val = Number(vCell.value);
        if (isNaN(val)) continue;
        if (suppressZeroNull && val === 0) continue;

        var gCell = groupField && row[groupField.name];
        var gName = gCell ? String(gCell.rendered || gCell.value || "Unclassified") : "All Findings";

        var sgCell = subGroupField && row[subGroupField.name];
        var sgName = sgCell ? String(sgCell.rendered || sgCell.value || "All") : "All";

        var sevCell = severityField && row[severityField.name];
        var sevName = sevCell ? String(sevCell.rendered || sevCell.value || "MEDIUM").toUpperCase() : "MEDIUM";

        if (targetColField && row[targetColField.name] && row[targetColField.name].value !== null) {
          var tv = Number(row[targetColField.name].value);
          if (!isNaN(tv)) colTargetVals.push(tv);
        }

        var links = extractDrillLinks(row, [groupField, severityField, subGroupField, valueField]);
        if (links.length > 0) hasDrill = true;

        obs.push({
          group: gName,
          subGroup: sgName,
          severity: sevName,
          val: val,
          links: links
        });
        allVals.push(val);
      }

      if (obs.length === 0) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:' + theme.subtext + '">No valid numeric observations found. Ensure a numeric aging/metric field is selected.</div>';
        return;
      }

      // Compute SLA Benchmark Target
      var sortedAll = allVals.slice().sort(function (a, b) { return a - b; });
      var globalMin = sortedAll[0];
      var globalMax = sortedAll[sortedAll.length - 1];
      var globalMean = d3.mean(sortedAll) || 0;
      var globalMedian = d3.median(sortedAll) || 0;
      var globalP75 = d3.quantile(sortedAll, 0.75) || globalMax;
      var globalP90 = d3.quantile(sortedAll, 0.90) || globalMax;

      var targetMode = config.targetMode || "fixed";
      var slaTarget = null;
      if (targetMode === "fixed") slaTarget = Number(config.fixedTargetValue) > 0 ? Number(config.fixedTargetValue) : 30;
      else if (targetMode === "dataset_mean") slaTarget = globalMean;
      else if (targetMode === "dataset_median") slaTarget = globalMedian;
      else if (targetMode === "percentile_p75") slaTarget = globalP75;
      else if (targetMode === "percentile_p90") slaTarget = globalP90;
      else if (targetMode === "measure_column" && colTargetVals.length > 0) slaTarget = d3.mean(colTargetVals);

      var anomalyThresholdPct = Number(config.anomalyThresholdPct);
      if (isNaN(anomalyThresholdPct) || anomalyThresholdPct <= 0) anomalyThresholdPct = 40;

      function isBreach(v) {
        if (slaTarget === null) return false;
        return polarity === "lower_is_better" ? v > slaTarget : v < slaTarget;
      }

      // Group Observations
      function buildGroups(observations) {
        var map = new Map();
        observations.forEach(function (o) {
          var g = map.get(o.group);
          if (!g) {
            g = { name: o.group, items: [], values: [], links: o.links };
            map.set(o.group, g);
          }
          g.items.push(o);
          g.values.push(o.val);
          if (!g.links.length && o.links.length) g.links = o.links;
        });

        var list = [];
        map.forEach(function (g) {
          var sv = g.values.slice().sort(function (a, b) { return a - b; });
          var breaches = g.values.filter(isBreach).length;
          var critCount = g.items.filter(function (it) { return it.severity === "CRITICAL" || it.severity === "HIGH"; }).length;
          list.push({
            name: g.name,
            items: g.items,
            values: sv,
            count: sv.length,
            min: sv[0],
            p10: d3.quantile(sv, 0.10) || sv[0],
            p25: d3.quantile(sv, 0.25) || sv[0],
            median: d3.median(sv) || sv[0],
            mean: d3.mean(sv) || sv[0],
            p75: d3.quantile(sv, 0.75) || sv[sv.length - 1],
            p90: d3.quantile(sv, 0.90) || sv[sv.length - 1],
            max: sv[sv.length - 1],
            breachCount: breaches,
            breachRate: sv.length > 0 ? (breaches / sv.length) * 100 : 0,
            critCount: critCount,
            links: g.links
          });
        });

        var sortBy = config.sortBy || "breach_desc";
        if (sortBy === "breach_desc") list.sort(function (a, b) { return b.breachRate - a.breachRate || b.median - a.median; });
        else if (sortBy === "median_desc") list.sort(function (a, b) { return b.median - a.median; });
        else if (sortBy === "median_asc") list.sort(function (a, b) { return a.median - b.median; });
        else if (sortBy === "count_desc") list.sort(function (a, b) { return b.count - a.count; });
        else if (sortBy === "alpha_asc") list.sort(function (a, b) { return a.name.localeCompare(b.name); });

        var topN = parseInt(config.topNLimit, 10);
        if (!isNaN(topN) && topN > 0 && list.length > topN) {
          var kept = list.slice(0, topN);
          var rest = list.slice(topN);
          if (enableOtherRollup && rest.length > 0) {
            var rItems = [];
            var rVals = [];
            rest.forEach(function (rg) {
              rItems = rItems.concat(rg.items);
              rVals = rVals.concat(rg.values);
            });
            rVals.sort(function (a, b) { return a - b; });
            var rBreaches = rVals.filter(isBreach).length;
            kept.push({
              name: "Other (" + rest.length + " groups)",
              items: rItems,
              values: rVals,
              count: rVals.length,
              min: rVals[0],
              p10: d3.quantile(rVals, 0.10) || rVals[0],
              p25: d3.quantile(rVals, 0.25) || rVals[0],
              median: d3.median(rVals) || 0,
              mean: d3.mean(rVals) || 0,
              p75: d3.quantile(rVals, 0.75) || 0,
              p90: d3.quantile(rVals, 0.90) || 0,
              max: rVals[rVals.length - 1],
              breachCount: rBreaches,
              breachRate: rVals.length > 0 ? (rBreaches / rVals.length) * 100 : 0,
              critCount: rItems.filter(function (it) { return it.severity === "CRITICAL" || it.severity === "HIGH"; }).length,
              links: rest[0].links || []
            });
          }
          list = kept;
        }
        return list;
      }

      var initialGroups = buildGroups(obs);
      var totalBreaches = obs.filter(function (o) { return isBreach(o.val); }).length;
      var overallBreachPct = (totalBreaches / obs.length) * 100;
      var worstGroup = initialGroups.slice().sort(function (a, b) { return b.breachRate - a.breachRate; })[0];

      // Custom Title / Subtitle
      if (config.customTitle || config.customSubtitle) {
        var titleCard = document.createElement("div");
        titleCard.style.flex = "0 0 auto";
        titleCard.style.padding = "8px 16px 4px 16px";
        if (config.customTitle) {
          var tEl = document.createElement("div");
          tEl.style.fontSize = Math.round(15 * scaleFactor) + "px";
          tEl.style.fontWeight = "700";
          tEl.style.color = theme.text;
          tEl.textContent = config.customTitle;
          titleCard.appendChild(tEl);
        }
        if (config.customSubtitle) {
          var sEl = document.createElement("div");
          sEl.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          sEl.style.color = theme.subtext;
          sEl.textContent = config.customSubtitle;
          titleCard.appendChild(sEl);
        }
        container.appendChild(titleCard);
      }

      // Executive GRC Scorecard HUD (normal flex flow)
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hud = document.createElement("div");
        hud.style.flex = "0 0 auto";
        hud.style.padding = "8px 16px";
        hud.style.display = "flex";
        hud.style.gap = "8px";
        hud.style.flexWrap = "wrap";
        hud.style.borderBottom = "1px solid " + theme.border;

        if (hudMode === "scorecard") {
          hud.appendChild(makeHudCard(
            "Active Findings",
            obs.length.toLocaleString(),
            initialGroups.length + " frameworks / groups",
            theme.subtext,
            theme,
            isDark,
            scaleFactor
          ));
          hud.appendChild(makeHudCard(
            "Median Aging (P50)",
            formatValue(globalMedian, fmt),
            "Mean: " + formatValue(globalMean, fmt),
            theme.primary,
            theme,
            isDark,
            scaleFactor
          ));
          hud.appendChild(makeHudCard(
            "P90 Tail Latency",
            formatValue(globalP90, fmt),
            "Max Observed: " + formatValue(globalMax, fmt),
            globalP90 > (slaTarget || 9999) ? theme.negative : theme.positive,
            theme,
            isDark,
            scaleFactor
          ));
          hud.appendChild(makeHudCard(
            slaTarget !== null ? (config.referenceLineLabel || "SLA Breach Rate") : "Peak Group",
            slaTarget !== null ? overallBreachPct.toFixed(1) + "%" : (worstGroup ? worstGroup.name : "-"),
            slaTarget !== null ? (totalBreaches + " findings > " + formatValue(slaTarget, fmt)) : "No SLA line active",
            overallBreachPct > anomalyThresholdPct ? theme.negative : theme.positive,
            theme,
            isDark,
            scaleFactor
          ));
          hud.appendChild(makeHudCard(
            "Highest Risk Group",
            worstGroup ? worstGroup.name : "-",
            worstGroup ? (worstGroup.breachRate.toFixed(1) + "% SLA breach \u2022 P50 " + formatValue(worstGroup.median, fmt)) : "",
            theme.negative,
            theme,
            isDark,
            scaleFactor
          ));
        } else {
          hud.style.alignItems = "center";
          hud.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          hud.style.fontWeight = "600";
          hud.style.color = theme.subtext;
          hud.innerHTML =
            '<span>Findings: <strong style="color:' + theme.text + '">' + obs.length.toLocaleString() + '</strong></span> &bull; ' +
            '<span>Median: <strong style="color:' + theme.text + '">' + formatValue(globalMedian, fmt) + '</strong></span> &bull; ' +
            '<span>P90: <strong style="color:' + theme.text + '">' + formatValue(globalP90, fmt) + '</strong></span>' +
            (slaTarget !== null ? ' &bull; <span style="color:' + (overallBreachPct > anomalyThresholdPct ? theme.negative : theme.positive) + ';font-weight:700">' + overallBreachPct.toFixed(1) + '% SLA Breach (&gt;' + formatValue(slaTarget, fmt) + ')</span>' : '');
        }
        container.appendChild(hud);
      }

      // Search + Legend + Mode Toolbar
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;
      var searchInput = null;
      var subFilterSelect = null;

      if (showSearch || showLegend || hasDrill) {
        var toolbar = document.createElement("div");
        toolbar.style.flex = "0 0 auto";
        toolbar.style.display = "flex";
        toolbar.style.flexWrap = "wrap";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "8px";
        toolbar.style.padding = "6px 16px";
        toolbar.style.borderBottom = "1px solid " + theme.border;
        toolbar.style.backgroundColor = isDark ? "#1e293b" : "#f8fafc";

        var leftGrp = document.createElement("div");
        leftGrp.style.display = "flex";
        leftGrp.style.alignItems = "center";
        leftGrp.style.gap = "8px";
        leftGrp.style.flexWrap = "wrap";

        if (showSearch) {
          searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "\uD83D\uDD0D Filter framework or slice...";
          searchInput.style.padding = "4px 10px";
          searchInput.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          searchInput.style.borderRadius = "5px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.style.width = "195px";
          leftGrp.appendChild(searchInput);

          var subVals = Array.from(new Set(obs.map(function (o) { return o.subGroup; }))).sort();
          if (subVals.length > 1 && subVals.length <= 12) {
            subFilterSelect = document.createElement("select");
            subFilterSelect.style.padding = "4px 8px";
            subFilterSelect.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
            subFilterSelect.style.borderRadius = "5px";
            subFilterSelect.style.border = "1px solid " + theme.border;
            subFilterSelect.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
            subFilterSelect.style.color = theme.text;
            var allOpt = document.createElement("option");
            allOpt.value = "ALL";
            allOpt.textContent = "All Slices (" + subVals.length + ")";
            subFilterSelect.appendChild(allOpt);
            subVals.forEach(function (sv) {
              var opt = document.createElement("option");
              opt.value = sv;
              opt.textContent = sv;
              subFilterSelect.appendChild(opt);
            });
            leftGrp.appendChild(subFilterSelect);
          }
        }

        if (showLegend) {
          var leg = document.createElement("div");
          leg.style.display = "flex";
          leg.style.alignItems = "center";
          leg.style.gap = "10px";
          leg.style.fontSize = Math.round(10.5 * scaleFactor) + "px";
          leg.style.color = theme.subtext;
          leg.innerHTML =
            '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:' + theme.primary + ';display:inline-block;"></span>Within SLA</span>' +
            '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:' + theme.breachStroke + ';display:inline-block;"></span>SLA Breach Tail</span>' +
            '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:2px;height:10px;background:' + theme.text + ';display:inline-block;"></span>Median P50</span>';
          leftGrp.appendChild(leg);
        }
        toolbar.appendChild(leftGrp);

        var rightGrp = document.createElement("div");
        rightGrp.style.display = "flex";
        rightGrp.style.alignItems = "center";
        rightGrp.style.gap = "6px";
        if (hasDrill) {
          var drillPill = document.createElement("span");
          drillPill.style.fontSize = Math.round(10 * scaleFactor) + "px";
          drillPill.style.fontWeight = "600";
          drillPill.style.padding = "2px 8px";
          drillPill.style.borderRadius = "10px";
          drillPill.style.backgroundColor = isDark ? "rgba(56,189,248,0.16)" : "#eff6ff";
          drillPill.style.color = theme.primary;
          drillPill.textContent = "\uD83D\uDD0E CLICK TO DRILL";
          rightGrp.appendChild(drillPill);
        }
        var modePill = document.createElement("span");
        modePill.style.fontSize = Math.round(10.5 * scaleFactor) + "px";
        modePill.style.fontWeight = "700";
        modePill.style.padding = "2px 8px";
        modePill.style.borderRadius = "10px";
        modePill.style.backgroundColor = isDark ? "#334155" : "#e2e8f0";
        modePill.style.color = theme.subtext;
        modePill.textContent = layoutMode.replace(/_/g, " ").toUpperCase();
        rightGrp.appendChild(modePill);
        toolbar.appendChild(rightGrp);

        container.appendChild(toolbar);
      }

      // Chart Wrapper
      var chartWrap = document.createElement("div");
      chartWrap.style.flex = "1 1 0";
      chartWrap.style.minHeight = "0";
      chartWrap.style.width = "100%";
      chartWrap.style.position = "relative";
      chartWrap.style.overflow = "hidden";
      container.appendChild(chartWrap);

      var tooltip = this._tooltip;

      function showTooltip(event, html) {
        if (!tooltip) return;
        tooltip.innerHTML = html;
        tooltip.style.backgroundColor = isDark ? "#1e293b" : "#ffffff";
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.border;
        tooltip.style.display = "block";
        tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 310) + "px";
        tooltip.style.top = Math.max(8, event.clientY - 12) + "px";
      }

      function hideTooltip() {
        if (tooltip) tooltip.style.display = "none";
      }

      function groupTooltipHtml(g) {
        return (
          '<div style="font-weight:700;font-size:12.5px;color:' + theme.text + ';margin-bottom:4px;">' + g.name + '</div>' +
          '<div>Findings: <strong>' + g.count + '</strong> (' + g.critCount + ' Critical/High)</div>' +
          '<div>Median (P50): <strong>' + formatValue(g.median, fmt) + '</strong> &bull; Mean: <strong>' + formatValue(g.mean, fmt) + '</strong></div>' +
          '<div>IQR (P25–P75): <strong>' + formatValue(g.p25, fmt) + ' – ' + formatValue(g.p75, fmt) + '</strong></div>' +
          '<div>P90 / Max: <strong>' + formatValue(g.p90, fmt) + ' / ' + formatValue(g.max, fmt) + '</strong></div>' +
          (slaTarget !== null ? '<div>SLA Breach (&gt;' + formatValue(slaTarget, fmt) + '): <strong style="color:' + (g.breachRate > anomalyThresholdPct ? theme.negative : theme.positive) + '">' + g.breachRate.toFixed(1) + '% (' + g.breachCount + ')</strong></div>' : '') +
          (g.links && g.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.primary + ';font-weight:700;">\uD83D\uDD0E Click to drill in Looker</div>' : '')
        );
      }

      function attachDrill(sel, links) {
        if (!links || !links.length) return;
        sel.style("cursor", "pointer").on("click", function (event) {
          if (window.LookerCharts && window.LookerCharts.Utils) {
            window.LookerCharts.Utils.openDrillMenu({ links: links, event: event });
          }
        });
      }

      function draw(filteredObs) {
        chartWrap.innerHTML = "";
        var width = chartWrap.clientWidth || element.clientWidth || 640;
        var height = chartWrap.clientHeight || Math.max(200, (element.clientHeight || 420) - 140);
        if (width <= 30 || height <= 30) return;

        var groups = buildGroups(filteredObs);
        if (groups.length === 0) {
          chartWrap.innerHTML = '<div style="padding:24px;text-align:center;color:' + theme.subtext + '">No matching findings for current filter.</div>';
          return;
        }

        // Compute dynamic left margin based on longest group label (clamped <= 36% of width)
        var longestLabel = d3.max(groups, function (g) { return g.name.length; }) || 10;
        var dynamicLeft = Math.min(Math.round(width * 0.36), Math.max(96, Math.round(longestLabel * 6.5 * scaleFactor + 20)));
        var rightMargin = layoutMode === "ridgeline_joyplot" ? 122 : 44;
        var topMargin = layoutMode === "ridgeline_joyplot" ? Math.max(54, Math.round(height * 0.20)) : 28;
        var bottomMargin = 38;

        var innerW = Math.max(80, width - dynamicLeft - rightMargin);
        var innerH = Math.max(80, height - topMargin - bottomMargin);

        var svg = d3.select(chartWrap).append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var gRoot = svg.append("g")
          .attr("transform", "translate(" + dynamicLeft + "," + topMargin + ")");

        var xMin = Math.min(0, d3.min(filteredObs, function (o) { return o.val; }) || 0);
        var xMax = Math.max(d3.max(filteredObs, function (o) { return o.val; }) || 75, slaTarget || 0) * 1.06;
        var xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]).nice();

        var axisFont = Math.round(10.5 * scaleFactor) + "px";

        function truncLabel(str, maxPx) {
          var maxChars = Math.max(8, Math.floor(maxPx / (6.3 * scaleFactor)));
          return str.length > maxChars ? str.slice(0, maxChars - 1) + "\u2026" : str;
        }

        // ========================================================
        // MODE 1: OVERLAPPING KDE RIDGELINE JOYPLOT (SLA TAIL FILL)
        // ========================================================
        if (layoutMode === "ridgeline_joyplot") {
          var yBand = d3.scaleBand()
            .domain(groups.map(function (g) { return g.name; }))
            .range([0, innerH])
            .paddingInner(0.08);

          var bandH = yBand.bandwidth();
          var overlap = Math.max(0.8, Math.min(2.4, Number(config.ridgeOverlap) || 1.45));
          var ridgeMaxH = bandH * overlap;

          // Subtle vertical grid lines
          gRoot.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + innerH + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickSize(-innerH).tickFormat(""))
            .selectAll("line")
            .attr("stroke", theme.grid);
          gRoot.selectAll(".grid path.domain").remove();

          var gridPts = xScale.ticks(70);
          if (gridPts[0] > xScale.domain()[0]) gridPts.unshift(xScale.domain()[0]);
          if (gridPts[gridPts.length - 1] < xScale.domain()[1]) gridPts.push(xScale.domain()[1]);
          if (slaTarget !== null && gridPts.indexOf(slaTarget) === -1) {
            gridPts.push(slaTarget);
            gridPts.sort(function (a, b) { return a - b; });
          }

          var manualBw = Number(config.kdeBandwidth) || 0;
          var span = xScale.domain()[1] - xScale.domain()[0];

          // Precompute KDE per group to find global max density for consistent amplitude
          var globalMaxDensity = 0.0001;
          groups.forEach(function (gr) {
            var bw = manualBw > 0 ? manualBw : silvermanBandwidth(gr.values, span);
            gr.kde = gaussianKDE(gr.values, gridPts, bw);
            var localMax = d3.max(gr.kde, function (pt) { return pt[1]; }) || 0;
            if (localMax > globalMaxDensity) globalMaxDensity = localMax;
          });

          var densityScale = d3.scaleLinear().domain([0, globalMaxDensity]).range([0, ridgeMaxH]);

          // Clip paths for compliant vs SLA breach tail
          var defs = svg.append("defs");
          var clipOkId = "clip-sla-ok-" + Math.random().toString(36).slice(2, 8);
          var clipBreachId = "clip-sla-breach-" + Math.random().toString(36).slice(2, 8);
          if (slaTarget !== null) {
            var slaX = xScale(slaTarget);
            defs.append("clipPath").attr("id", clipOkId)
              .append("rect")
              .attr("x", -10)
              .attr("y", -topMargin)
              .attr("width", Math.max(0, slaX + 10))
              .attr("height", innerH + topMargin + 20);
            defs.append("clipPath").attr("id", clipBreachId)
              .append("rect")
              .attr("x", slaX)
              .attr("y", -topMargin)
              .attr("width", Math.max(0, innerW - slaX + 20))
              .attr("height", innerH + topMargin + 20);
          }

          // Render ridges from top to bottom so front ridges overlap behind ones cleanly
          groups.forEach(function (gr, idx) {
            var baseColor = theme.series[idx % theme.series.length];
            var baseY = yBand(gr.name) + bandH;
            var ridgeG = gRoot.append("g").attr("class", "ridge-row");

            var areaGen = d3.area()
              .x(function (pt) { return xScale(pt[0]); })
              .y0(baseY)
              .y1(function (pt) { return baseY - densityScale(pt[1]); })
              .curve(d3.curveMonotoneX);

            var lineGen = d3.line()
              .x(function (pt) { return xScale(pt[0]); })
              .y(function (pt) { return baseY - densityScale(pt[1]); })
              .curve(d3.curveMonotoneX);

            // Baseline rule
            ridgeG.append("line")
              .attr("x1", 0).attr("x2", innerW)
              .attr("y1", baseY).attr("y2", baseY)
              .attr("stroke", theme.border)
              .attr("stroke-width", 1);

            if (slaTarget !== null) {
              var okZone = polarity === "lower_is_better" ? clipOkId : clipBreachId;
              var badZone = polarity === "lower_is_better" ? clipBreachId : clipOkId;

              ridgeG.append("path")
                .datum(gr.kde)
                .attr("d", areaGen)
                .attr("clip-path", "url(#" + okZone + ")")
                .attr("fill", baseColor)
                .attr("fill-opacity", isDark ? 0.58 : 0.45);

              ridgeG.append("path")
                .datum(gr.kde)
                .attr("d", areaGen)
                .attr("clip-path", "url(#" + badZone + ")")
                .attr("fill", theme.breachFill);
            } else {
              ridgeG.append("path")
                .datum(gr.kde)
                .attr("d", areaGen)
                .attr("fill", baseColor)
                .attr("fill-opacity", 0.48);
            }

            // Ridge outline stroke
            var ridgeStroke = ridgeG.append("path")
              .datum(gr.kde)
              .attr("d", lineGen)
              .attr("fill", "none")
              .attr("stroke", gr.breachRate > anomalyThresholdPct ? theme.breachStroke : baseColor)
              .attr("stroke-width", 2);

            // Quantile rug ticks (sampled up to 45 for crispness)
            var rugStep = Math.max(1, Math.floor(gr.values.length / 45));
            for (var r = 0; r < gr.values.length; r += rugStep) {
              var rx = xScale(gr.values[r]);
              ridgeG.append("line")
                .attr("x1", rx).attr("x2", rx)
                .attr("y1", baseY).attr("y2", baseY + 3.5)
                .attr("stroke", isBreach(gr.values[r]) ? theme.breachStroke : baseColor)
                .attr("stroke-opacity", 0.55)
                .attr("stroke-width", 1);
            }

            // Median P50 vertical stem inside the ridge
            var medX = xScale(gr.median);
            var nearestPt = gr.kde.reduce(function (best, pt) {
              return Math.abs(pt[0] - gr.median) < Math.abs(best[0] - gr.median) ? pt : best;
            }, gr.kde[0]);
            var medTopY = baseY - densityScale(nearestPt[1]);

            ridgeG.append("line")
              .attr("x1", medX).attr("x2", medX)
              .attr("y1", baseY).attr("y2", medTopY)
              .attr("stroke", theme.text)
              .attr("stroke-width", 1.8)
              .attr("stroke-dasharray", "2,2");

            ridgeG.append("circle")
              .attr("cx", medX).attr("cy", medTopY)
              .attr("r", 3.2)
              .attr("fill", theme.text)
              .attr("stroke", theme.bg)
              .attr("stroke-width", 1.2);

            // Left Group Label
            var lbl = gRoot.append("text")
              .attr("x", -10)
              .attr("y", baseY - 3)
              .attr("text-anchor", "end")
              .attr("font-size", Math.round(11.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.text)
              .text(truncLabel(gr.name, dynamicLeft - 14));
            lbl.append("title").text(gr.name);

            // Right Breach / Median Callout Badges
            if (labelDensity !== "hidden") {
              var badgeText = labelDensity === "all"
                ? ("P50 " + formatValue(gr.median, fmt) + " \u2022 P90 " + formatValue(gr.p90, fmt) + " (" + gr.breachRate.toFixed(0) + "%)")
                : ("P50 " + formatValue(gr.median, fmt) + " \u2022 " + gr.breachRate.toFixed(0) + "% >SLA");

              gRoot.append("text")
                .attr("x", innerW + 8)
                .attr("y", baseY - 3)
                .attr("text-anchor", "start")
                .attr("font-size", Math.round(10 * scaleFactor) + "px")
                .attr("font-weight", gr.breachRate > anomalyThresholdPct ? "700" : "600")
                .attr("fill", gr.breachRate > anomalyThresholdPct ? theme.negative : theme.subtext)
                .text(badgeText);
            }

            // Interactive hover hitbox
            var hitRect = ridgeG.append("rect")
              .attr("x", 0).attr("y", baseY - bandH)
              .attr("width", innerW).attr("height", bandH)
              .attr("fill", "transparent");

            hitRect.on("mouseenter", function (event) {
              ridgeStroke.attr("stroke-width", 3.2);
              showTooltip(event, groupTooltipHtml(gr));
            }).on("mousemove", function (event) {
              if (tooltip && tooltip.style.display === "block") {
                tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 310) + "px";
                tooltip.style.top = Math.max(8, event.clientY - 12) + "px";
              }
            }).on("mouseleave", function () {
              ridgeStroke.attr("stroke-width", 2);
              hideTooltip();
            });
            attachDrill(hitRect, gr.links);
          });

          // Vertical CISO SLA Reference Line across all ridges
          if (slaTarget !== null) {
            var slaLineX = xScale(slaTarget);
            gRoot.append("line")
              .attr("x1", slaLineX).attr("x2", slaLineX)
              .attr("y1", -topMargin + 22).attr("y2", innerH)
              .attr("stroke", theme.breachStroke)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5,4");

            gRoot.append("text")
              .attr("x", slaLineX)
              .attr("y", -topMargin + 14)
              .attr("text-anchor", slaLineX > innerW * 0.72 ? "end" : "middle")
              .attr("font-size", Math.round(10.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.breachStroke)
              .text((config.referenceLineLabel || "SLA Target") + " (" + formatValue(slaTarget, fmt) + ")");
          }

          gRoot.append("g")
            .attr("transform", "translate(0," + innerH + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFont);

        // ========================================================
        // MODE 2: EMPIRICAL SLA REMEDIATION ECDF CURVE
        // ========================================================
        } else if (layoutMode === "sla_ecdf_curve") {
          var yPct = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

          gRoot.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yPct).ticks(5).tickSize(-innerW).tickFormat(""))
            .selectAll("line")
            .attr("stroke", theme.grid);
          gRoot.selectAll(".grid path.domain").remove();

          groups.forEach(function (gr, idx) {
            var col = theme.series[idx % theme.series.length];
            var n = gr.values.length;
            var pts = [{ x: xScale.domain()[0], y: 0 }];
            for (var p = 0; p < n; p++) {
              pts.push({ x: gr.values[p], y: ((p + 1) / n) * 100 });
            }
            pts.push({ x: xScale.domain()[1], y: 100 });

            var stepGen = d3.line()
              .x(function (pt) { return xScale(pt.x); })
              .y(function (pt) { return yPct(pt.y); })
              .curve(d3.curveStepAfter);

            var path = gRoot.append("path")
              .datum(pts)
              .attr("fill", "none")
              .attr("stroke", col)
              .attr("stroke-width", 2.5)
              .attr("d", stepGen);

            path.on("mouseenter", function (event) {
              d3.select(this).attr("stroke-width", 4);
              showTooltip(event, groupTooltipHtml(gr));
            }).on("mouseleave", function () {
              d3.select(this).attr("stroke-width", 2.5);
              hideTooltip();
            });
            attachDrill(path, gr.links);

            // End label at SLA intersection or P50
            if (labelDensity !== "hidden") {
              var atSla = slaTarget !== null ? (100 - gr.breachRate) : 50;
              var lx = slaTarget !== null ? xScale(slaTarget) + 6 : xScale(gr.median) + 6;
              gRoot.append("text")
                .attr("x", Math.min(innerW + 4, lx))
                .attr("y", yPct(atSla) + 3)
                .attr("font-size", Math.round(9.5 * scaleFactor) + "px")
                .attr("font-weight", "700")
                .attr("fill", col)
                .text(truncLabel(gr.name, 95) + " (" + atSla.toFixed(0) + "%)");
            }
          });

          if (slaTarget !== null) {
            var sx = xScale(slaTarget);
            gRoot.append("line")
              .attr("x1", sx).attr("x2", sx)
              .attr("y1", 0).attr("y2", innerH)
              .attr("stroke", theme.breachStroke)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "5,4");
            gRoot.append("text")
              .attr("x", sx)
              .attr("y", -8)
              .attr("text-anchor", "middle")
              .attr("font-size", Math.round(10.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.breachStroke)
              .text((config.referenceLineLabel || "SLA") + " (" + formatValue(slaTarget, fmt) + ")");
          }

          gRoot.append("g")
            .attr("transform", "translate(0," + innerH + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text").attr("fill", theme.subtext).style("font-size", axisFont);

          gRoot.append("g")
            .call(d3.axisLeft(yPct).ticks(5).tickFormat(function (v) { return v + "%"; }))
            .selectAll("text").attr("fill", theme.subtext).style("font-size", axisFont);

        // ========================================================
        // MODE 3: QUANTILE IQR STRIP & SEVERITY BEESWARM
        // ========================================================
        } else if (layoutMode === "quantile_beeswarm_strip") {
          var yStrip = d3.scaleBand()
            .domain(groups.map(function (g) { return g.name; }))
            .range([0, innerH])
            .padding(0.24);

          if (slaTarget !== null) {
            var slaX3 = xScale(slaTarget);
            gRoot.append("rect")
              .attr("x", polarity === "lower_is_better" ? slaX3 : 0)
              .attr("y", 0)
              .attr("width", polarity === "lower_is_better" ? Math.max(0, innerW - slaX3) : Math.max(0, slaX3))
              .attr("height", innerH)
              .attr("fill", theme.breachFill)
              .attr("fill-opacity", 0.25);
          }

          groups.forEach(function (gr, idx) {
            var cy = yStrip(gr.name) + yStrip.bandwidth() / 2;
            var bh = Math.min(26, yStrip.bandwidth() * 0.55);
            var col = theme.series[idx % theme.series.length];

            // Whisker P10 - P90
            gRoot.append("line")
              .attr("x1", xScale(gr.p10)).attr("x2", xScale(gr.p90))
              .attr("y1", cy).attr("y2", cy)
              .attr("stroke", theme.subtext).attr("stroke-width", 1.5);

            // IQR Box P25 - P75
            gRoot.append("rect")
              .attr("x", xScale(gr.p25))
              .attr("y", cy - bh / 2)
              .attr("width", Math.max(3, xScale(gr.p75) - xScale(gr.p25)))
              .attr("height", bh)
              .attr("rx", 3)
              .attr("fill", col)
              .attr("fill-opacity", 0.22)
              .attr("stroke", col)
              .attr("stroke-width", 1.5);

            // Jittered observation beads (capped at 90 per row for fluid performance)
            var step = Math.max(1, Math.floor(gr.items.length / 90));
            for (var k = 0; k < gr.items.length; k += step) {
              var item = gr.items[k];
              var jitter = (((k * 37) % 100) / 100 - 0.5) * bh * 0.85;
              var dotColor = item.severity === "CRITICAL" ? theme.negative
                : item.severity === "HIGH" ? theme.warning
                : col;
              var dot = gRoot.append("circle")
                .attr("cx", xScale(item.val))
                .attr("cy", cy + jitter)
                .attr("r", item.severity === "CRITICAL" ? 3.5 : 2.6)
                .attr("fill", dotColor)
                .attr("fill-opacity", 0.78)
                .attr("stroke", isBreach(item.val) ? theme.breachStroke : "none")
                .attr("stroke-width", 0.9);
              attachDrill(dot, item.links);
            }

            // Median diamond
            gRoot.append("polygon")
              .attr("points",
                xScale(gr.median) + "," + (cy - bh * 0.45) + " " +
                (xScale(gr.median) + 5) + "," + cy + " " +
                xScale(gr.median) + "," + (cy + bh * 0.45) + " " +
                (xScale(gr.median) - 5) + "," + cy
              )
              .attr("fill", theme.text)
              .attr("stroke", theme.bg)
              .attr("stroke-width", 1.2);

            gRoot.append("text")
              .attr("x", -10)
              .attr("y", cy + 4)
              .attr("text-anchor", "end")
              .attr("font-size", Math.round(11.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.text)
              .text(truncLabel(gr.name, dynamicLeft - 14));
          });

          if (slaTarget !== null) {
            var sx3 = xScale(slaTarget);
            gRoot.append("line")
              .attr("x1", sx3).attr("x2", sx3).attr("y1", 0).attr("y2", innerH)
              .attr("stroke", theme.breachStroke).attr("stroke-width", 2).attr("stroke-dasharray", "5,4");
            gRoot.append("text")
              .attr("x", sx3).attr("y", -8).attr("text-anchor", "middle")
              .attr("font-size", Math.round(10.5 * scaleFactor) + "px")
              .attr("font-weight", "700").attr("fill", theme.breachStroke)
              .text((config.referenceLineLabel || "SLA") + " (" + formatValue(slaTarget, fmt) + ")");
          }

          gRoot.append("g")
            .attr("transform", "translate(0," + innerH + ")")
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text").attr("fill", theme.subtext).style("font-size", axisFont);

        // ========================================================
        // MODE 4: FRAMEWORK x CLOUD / SLICE SLA BREACH MATRIX
        // ========================================================
        } else {
          var subKeys = Array.from(new Set(filteredObs.map(function (o) { return o.subGroup; }))).sort();
          if (subKeys.length === 0) subKeys = ["All"];

          var xMat = d3.scaleBand().domain(subKeys).range([0, innerW]).padding(0.12);
          var yMat = d3.scaleBand().domain(groups.map(function (g) { return g.name; })).range([0, innerH]).padding(0.12);

          groups.forEach(function (gr) {
            gRoot.append("text")
              .attr("x", -10)
              .attr("y", yMat(gr.name) + yMat.bandwidth() / 2 + 4)
              .attr("text-anchor", "end")
              .attr("font-size", Math.round(11.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.text)
              .text(truncLabel(gr.name, dynamicLeft - 14));

            subKeys.forEach(function (sk) {
              var cellItems = gr.items.filter(function (it) { return it.subGroup === sk; });
              var cx = xMat(sk);
              var cy = yMat(gr.name);
              var cw = xMat.bandwidth();
              var ch = yMat.bandwidth();

              if (cellItems.length === 0) {
                gRoot.append("rect")
                  .attr("x", cx).attr("y", cy).attr("width", cw).attr("height", ch)
                  .attr("rx", 6).attr("fill", theme.grid).attr("opacity", 0.5);
                return;
              }
              var cVals = cellItems.map(function (it) { return it.val; }).sort(function (a, b) { return a - b; });
              var cMed = d3.median(cVals) || 0;
              var cBreach = (cVals.filter(isBreach).length / cVals.length) * 100;
              var isAlert = cBreach > anomalyThresholdPct;

              var cellRect = gRoot.append("rect")
                .attr("x", cx).attr("y", cy).attr("width", cw).attr("height", ch)
                .attr("rx", 6)
                .attr("fill", isAlert ? theme.breachFill : (isDark ? "rgba(56,189,248,0.18)" : "rgba(26,115,232,0.12)"))
                .attr("stroke", isAlert ? theme.breachStroke : theme.primary)
                .attr("stroke-width", isAlert ? 1.5 : 1);

              if (cw > 52 && ch > 28) {
                gRoot.append("text")
                  .attr("x", cx + cw / 2)
                  .attr("y", cy + ch / 2 - 2)
                  .attr("text-anchor", "middle")
                  .attr("font-size", Math.round(12 * scaleFactor) + "px")
                  .attr("font-weight", "700")
                  .attr("fill", isAlert ? theme.negative : theme.text)
                  .text(cBreach.toFixed(0) + "% >SLA");

                gRoot.append("text")
                  .attr("x", cx + cw / 2)
                  .attr("y", cy + ch / 2 + 13)
                  .attr("text-anchor", "middle")
                  .attr("font-size", Math.round(10 * scaleFactor) + "px")
                  .attr("fill", theme.subtext)
                  .text("P50 " + formatValue(cMed, fmt) + " \u2022 n=" + cVals.length);
              }

              cellRect.on("mouseenter", function (event) {
                showTooltip(event,
                  '<div style="font-weight:700;margin-bottom:4px;">' + gr.name + ' &bull; ' + sk + '</div>' +
                  '<div>Findings: <strong>' + cVals.length + '</strong></div>' +
                  '<div>Median Aging: <strong>' + formatValue(cMed, fmt) + '</strong></div>' +
                  '<div>SLA Breach Rate: <strong style="color:' + (isAlert ? theme.negative : theme.positive) + '">' + cBreach.toFixed(1) + '%</strong></div>'
                );
              }).on("mouseleave", hideTooltip);
              attachDrill(cellRect, cellItems[0].links);
            });
          });

          gRoot.append("g")
            .attr("transform", "translate(0,-6)")
            .call(d3.axisTop(xMat))
            .selectAll("text")
            .attr("fill", theme.text)
            .style("font-size", Math.round(11 * scaleFactor) + "px")
            .style("font-weight", "700");
          gRoot.selectAll(".domain, .tick line").attr("stroke", "none");
        }
      }

      function applyFilters() {
        var term = searchInput ? searchInput.value.toLowerCase().trim() : "";
        var subChoice = subFilterSelect ? subFilterSelect.value : "ALL";
        var filtered = obs.filter(function (o) {
          if (subChoice !== "ALL" && o.subGroup !== subChoice) return false;
          if (!term) return true;
          return o.group.toLowerCase().indexOf(term) !== -1 ||
            o.subGroup.toLowerCase().indexOf(term) !== -1 ||
            o.severity.toLowerCase().indexOf(term) !== -1;
        });
        draw(filtered);
      }

      draw(obs);

      if (searchInput) searchInput.addEventListener("input", applyFilters);
      if (subFilterSelect) subFilterSelect.addEventListener("change", applyFilters);
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
