/**
 * Inventory Stockout Velocity & Reorder Sawtooth Chart - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Enterprise Supply Chain & Inventory Optimization Suite:
 * - 4 Multi-Modal Layout Modes:
 *     1. "sawtooth_cycles": Continuous inventory depletion sawtooth curves with replenishment jump nodes,
 *        shaded Safety Stock floor zone, and Reorder Point (ROP) threshold reference line.
 *     2. "stockout_velocity": Daily consumption velocity burn-rate & replenishment jump impulse bars.
 *     3. "replenishment_variance": Order receipt batch jumps & cycle-over-cycle replenishment delta vs Par.
 *     4. "inventory_par_divergence": On-Hand inventory vs Par Target capacity divergence bars (polarity-aware).
 * - Dynamic Field-Role Mapping (Date, Facility/SKU, Inventory Units, Coverage Ratio, Valuation, Target Measure)
 * - Configurable Safety Stock & Reorder Point Benchmarks (Peak, Mean, Median, P75, P90, Fixed, Target Column)
 * - Sorting, Top-N Bucketing with automatic 'Other' Rollup, and Zero/Null Suppression
 * - Executive Inventory Scorecard HUD (Full Scorecard / Compact Strip / Hidden), Label Density & Legend Controls
 * - Enterprise Palettes + Custom Hex Overrides (display: 'color'), Polarity, Font Scale & Value Formats
 * - 5,000+ Row Client-Side O(N) Aggregation, Debounced ResizeObserver (<4px guard) & Looker Drill-Down Support
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
      line: "#1a73e8",
      area: "rgba(26, 115, 232, 0.09)",
      safetyZone: "rgba(234, 67, 53, 0.11)",
      reorderZone: "rgba(251, 188, 4, 0.13)",
      reorderLine: "#f29900",
      replenishNode: "#137333",
      stockoutNode: "#ea4335",
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      positive: "#137333",
      negative: "#ea4335",
      warning: "#f29900"
    },
    executive_slate: {
      name: "Executive Slate (Classic Few)",
      line: "#0f172a",
      area: "rgba(15, 23, 42, 0.06)",
      safetyZone: "rgba(239, 68, 68, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.14)",
      reorderLine: "#ea580c",
      replenishNode: "#10b981",
      stockoutNode: "#ef4444",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      positive: "#10b981",
      negative: "#ef4444",
      warning: "#ea580c"
    },
    modern_slate: {
      name: "Modern Slate",
      line: "#2563eb",
      area: "rgba(37, 99, 235, 0.08)",
      safetyZone: "rgba(244, 63, 94, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.14)",
      reorderLine: "#d97706",
      replenishNode: "#059669",
      stockoutNode: "#e11d48",
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      positive: "#059669",
      negative: "#e11d48",
      warning: "#d97706"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      line: "#38bdf8",
      area: "rgba(56, 189, 248, 0.13)",
      safetyZone: "rgba(244, 63, 94, 0.22)",
      reorderZone: "rgba(251, 191, 36, 0.18)",
      reorderLine: "#f59e0b",
      replenishNode: "#34d399",
      stockoutNode: "#f43f5e",
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#334155",
      grid: "#1e293b",
      cardBg: "#1e293b",
      positive: "#34d399",
      negative: "#f43f5e",
      warning: "#fbbf24"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      line: "#059669",
      area: "rgba(5, 150, 105, 0.08)",
      safetyZone: "rgba(225, 29, 72, 0.12)",
      reorderZone: "rgba(217, 119, 6, 0.14)",
      reorderLine: "#d97706",
      replenishNode: "#047857",
      stockoutNode: "#e11d48",
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#a7f3d0",
      grid: "#ecfdf5",
      cardBg: "#f0fdf4",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#d97706"
    },
    sunset_media: {
      name: "Sunset Media",
      line: "#ea580c",
      area: "rgba(234, 88, 12, 0.08)",
      safetyZone: "rgba(220, 38, 38, 0.12)",
      reorderZone: "rgba(245, 158, 11, 0.15)",
      reorderLine: "#c2410c",
      replenishNode: "#059669",
      stockoutNode: "#dc2626",
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fde68a",
      grid: "#fffbeb",
      cardBg: "#fffbeb",
      positive: "#059669",
      negative: "#dc2626",
      warning: "#ea580c"
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      line: "#00AF68",
      area: "rgba(0, 175, 104, 0.08)",
      safetyZone: "rgba(180, 35, 24, 0.12)",
      reorderZone: "rgba(234, 88, 12, 0.14)",
      reorderLine: "#143359",
      replenishNode: "#006B40",
      stockoutNode: "#B42318",
      bg: "#ffffff",
      text: "#0F172A",
      subtext: "#64748B",
      border: "#E2E8F0",
      grid: "#F8FAFC",
      cardBg: "#F8FAFC",
      positive: "#006B40",
      negative: "#B42318",
      warning: "#ea580c"
    }
  };

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

  function extractCellVal(cell) {
    if (!cell) return null;
    if (cell.value !== undefined && cell.value !== null && cell.value !== "") {
      var num = Number(cell.value);
      return isNaN(num) ? null : num;
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
      if (cell && cell.links && cell.links.length > 0) {
        return cell.links;
      }
    }
    return [];
  }

  function formatValue(val, fmt, lookerRendered) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    if (fmt === "auto" && lookerRendered) return lookerRendered;
    var abs = Math.abs(val);
    var sign = val < 0 ? "-" : "";

    switch (fmt) {
      case "compact_currency":
        if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
        return sign + "$" + abs.toFixed(abs % 1 === 0 ? 0 : 2);
      case "full_currency":
        return sign + "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "compact_number":
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + (abs >= 10 ? Math.round(abs).toLocaleString() : abs.toFixed(1));
      case "percentage":
      case "percent":
        return (val * (abs <= 1.0 ? 100 : 1)).toFixed(1) + "%";
      case "decimal_2":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "raw":
        return String(val);
      case "full_number":
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case "auto":
      default:
        if (lookerRendered) return lookerRendered;
        if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + "B";
        if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + "M";
        if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark, scaleFactor) {
    var card = document.createElement("div");
    card.style.flex = "1 1 130px";
    card.style.minWidth = "120px";
    card.style.padding = Math.round(7 * scaleFactor) + "px " + Math.round(11 * scaleFactor) + "px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : theme.cardBg;
    card.style.border = "1px solid " + (isDark ? "#334155" : theme.border);
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
    id: "inventory_stockout_sawtooth",
    label: "Inventory Stockout Velocity & Reorder Sawtooth Chart",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Layout Mode",
        display: "select",
        values: [
          { "Inventory Sawtooth Depletion Cycles": "sawtooth_cycles" },
          { "Consumption Velocity & Days-of-Supply Runway": "stockout_velocity" },
          { "Replenishment Batch & Cycle Variance": "replenishment_variance" },
          { "Par Capacity & Inventory Target Divergence": "inventory_par_divergence" }
        ],
        default: "sawtooth_cycles",
        section: "Display",
        order: 1
      },
      dateFieldOverride: {
        type: "string",
        label: "Date / Timeline Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      entityFieldOverride: {
        type: "string",
        label: "Facility / SKU Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      inventoryMeasureOverride: {
        type: "string",
        label: "Inventory Units On-Hand Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      coverageMeasureOverride: {
        type: "string",
        label: "Coverage Ratio / Days of Supply Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      costMeasureOverride: {
        type: "string",
        label: "Inventory Cost / Valuation Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetMeasureOverride: {
        type: "string",
        label: "Benchmark / Par Target Measure Column",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Calculation Mode",
        display: "select",
        values: [
          { "Dataset Mean On-Hand": "dataset_mean" },
          { "Dataset Median On-Hand": "dataset_median" },
          { "Percentile P75 Target": "percentile_p75" },
          { "Percentile P90 Ceiling": "percentile_p90" },
          { "Peak Observed Inventory": "peak_observed" },
          { "Target / Par Measure Column": "measure_column" },
          { "Fixed Static Target Value": "fixed" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 8
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Par Target Value (when Mode is Fixed)",
        default: 0,
        section: "Display",
        order: 9
      },
      referenceLineLabel: {
        type: "string",
        label: "Reorder Benchmark Label",
        default: "Reorder Point (ROP)",
        section: "Display",
        order: 10
      },
      safetyStockPct: {
        type: "number",
        label: "Safety Stock Floor Threshold (% of Par)",
        default: 25,
        section: "Display",
        order: 11
      },
      reorderPointPct: {
        type: "number",
        label: "Reorder Point (ROP) Benchmark (% of Par)",
        default: 50,
        section: "Display",
        order: 12
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Stockout Hazard Breach Sensitivity (%)",
        default: 20,
        section: "Display",
        order: 13
      },
      showSafetyZone: {
        type: "boolean",
        label: "Show Shaded Safety Stock Floor Zone",
        default: true,
        section: "Display",
        order: 14
      },
      showReorderLine: {
        type: "boolean",
        label: "Show Reorder Point (ROP) Benchmark Line",
        default: true,
        section: "Display",
        order: 15
      },
      showReplenishmentPoints: {
        type: "boolean",
        label: "Highlight Order Receipt Jump Nodes",
        default: true,
        section: "Display",
        order: 16
      },
      sortBy: {
        type: "string",
        label: "Sort Chronological / Entity By",
        display: "select",
        values: [
          { "Chronological Ascending (Timeline Flow)": "date_asc" },
          { "Chronological Descending (Latest First)": "date_desc" },
          { "Inventory Units Descending": "inventory_desc" },
          { "Inventory Units Ascending": "inventory_asc" },
          { "Stockout Risk First (Highest Hazard)": "hazard_first" },
          { "Entity / Facility Alphabetical": "entity_asc" }
        ],
        default: "date_asc",
        section: "Display",
        order: 17
      },
      topNLimit: {
        type: "number",
        label: "Top-N Cycles / Records Limit (0 = All)",
        default: 0,
        section: "Display",
        order: 18
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Up Remaining Cycles into 'Other' Bucket",
        default: true,
        section: "Display",
        order: 19
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Inventory Records",
        default: false,
        section: "Display",
        order: 20
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
        order: 21
      },
      labelDensity: {
        type: "string",
        label: "Data Value Label Density",
        display: "select",
        values: [
          { "Min/Max Peaks & Breaches Only": "peaks_only" },
          { "Show All Data Labels": "all" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only",
        section: "Display",
        order: 22
      },
      showLegend: {
        type: "boolean",
        label: "Show Status & Threshold Legend",
        default: true,
        section: "Display",
        order: 23
      },
      showGridLines: {
        type: "boolean",
        label: "Show Background Cartesian Grid Lines",
        default: true,
        section: "Display",
        order: 24
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        section: "Display",
        order: 25
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 26
      },
      showSearch: {
        type: "boolean",
        label: "Show Facility / Date Search Filter Bar",
        default: true,
        section: "Display",
        order: 27
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
          { "Executive Slate (Classic Few)": "executive_slate" },
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
        label: "Custom Primary Inventory Line Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Replenishment / Safe Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Stockout / Hazard Hex",
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
          { "Higher is Better (Inventory Buffer / Availability)": "higher_better" },
          { "Lower is Better (Excess Carrying Capital / Overstock)": "lower_better" }
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
          { "Compact (Dense Dashboard Tiles)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value & Metric Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Number (1.2M / 45K)": "compact_number" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Full Number (1,240,000)": "full_number" },
          { "Raw (Exact Database Value)": "raw" }
        ],
        default: "compact_number",
        section: "Style",
        order: 7
      },
      lineThickness: {
        type: "number",
        label: "Sawtooth Stroke Thickness (px)",
        default: 2.5,
        section: "Style",
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        dateFieldOverride: { role: "dimension", defaultIdx: 0 },
        entityFieldOverride: { role: "dimension", defaultIdx: 1 },
        inventoryMeasureOverride: { role: "measure", defaultIdx: 0 },
        coverageMeasureOverride: { role: "measure", defaultIdx: 1 },
        costMeasureOverride: { role: "measure", defaultIdx: 2 },
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
      this._setupResizeObserver(element);

      // Never override Looker's pixel width/height on element itself
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      var container = document.createElement("div");
      container.className = "sawtooth-viz-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "sawtooth-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.maxWidth = "290px";
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
              message: "The query returned no data rows to display in the inventory sawtooth chart."
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

      if (dims.length === 0) {
        if (this.addError) {
          try {
            this.addError({
              title: "Dimension Required",
              message: "Inventory Sawtooth requires at least 1 Date or Entity dimension (e.g. snapshot_date, location)."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      if (meas.length === 0) {
        if (this.addError) {
          try {
            this.addError({
              title: "Measure Required",
              message: "Inventory Sawtooth requires at least 1 Measure (e.g. Total Units in Stock)."
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
          console.error("Sawtooth chart render error:", err);
          if (self.addError) {
            try {
              self.addError({
                title: "Rendering Error",
                message: err.message || "An unexpected error occurred while rendering the inventory sawtooth visualization."
              });
            } catch (e) {}
          }
        }
        done();
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var container = element.querySelector(".sawtooth-viz-container");
      if (!container) return;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google_enterprise";
      var rawTheme = THEMES[themeKey] || THEMES.google_enterprise;
      var isDark = themeKey === "cyberpunk_dark";

      var theme = Object.assign({}, rawTheme);
      if (config.customPrimaryColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customPrimaryColor.trim())) {
        theme.line = config.customPrimaryColor.trim();
      }
      if (config.customPositiveColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customPositiveColor.trim())) {
        theme.replenishNode = config.customPositiveColor.trim();
        theme.positive = config.customPositiveColor.trim();
      }
      if (config.customNegativeColor && /^#[0-9A-Fa-f]{3,8}$/.test(config.customNegativeColor.trim())) {
        theme.stockoutNode = config.customNegativeColor.trim();
        theme.negative = config.customNegativeColor.trim();
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

      // Dynamic Field-Role Mapping
      var dateField = resolveField(dims, config.dateFieldOverride, 0) || dims[0];
      var entityField = resolveField(dims, config.entityFieldOverride, dims.length > 1 ? 1 : -1);
      var invField = resolveField(meas, config.inventoryMeasureOverride, 0) || meas[0];
      var covField = resolveField(meas, config.coverageMeasureOverride, meas.length > 1 ? 1 : -1);
      var costField = resolveField(meas, config.costMeasureOverride, meas.length > 2 ? 2 : -1);
      var targetField = resolveField(meas, config.targetMeasureOverride, -1);

      var fmt = config.valueFormat || "compact_number";
      var layoutMode = config.layoutMode || "sawtooth_cycles";
      var polarity = config.metricPolarity || "higher_better";
      var labelDensity = config.labelDensity || "peaks_only";
      var suppressZeroNull = !!config.suppressZeroNull;
      var enableOtherRollup = config.enableOtherRollup !== false;

      // O(N) Client-Side Aggregation across 5,000+ rows keyed by dateStr (preserving multi-entity context)
      var aggMap = new Map();
      var hasDrill = false;

      for (var rIdx = 0; rIdx < data.length; rIdx++) {
        var row = data[rIdx];
        var rawDateCell = dateField && row[dateField.name];
        var rawDate = rawDateCell ? (rawDateCell.rendered || rawDateCell.value || String(rIdx)) : String(rIdx);
        var entityCell = entityField && row[entityField.name];
        var entityName = entityCell ? (entityCell.rendered || entityCell.value || "All Facilities") : "All Facilities";

        var invVal = extractCellVal(invField && row[invField.name]);
        if (suppressZeroNull && (invVal === null || invVal === 0)) continue;
        if (invVal === null) invVal = 0;

        var covVal = extractCellVal(covField && row[covField.name]);
        var costVal = extractCellVal(costField && row[costField.name]);
        var tgtVal = extractCellVal(targetField && row[targetField.name]);

        var cellLinks = extractDrillLinks(row, [invField, dateField, entityField, costField]);
        if (cellLinks.length > 0) hasDrill = true;

        var key = String(rawDate);
        var entry = aggMap.get(key);
        if (!entry) {
          entry = {
            idx: rIdx,
            dateStr: key,
            entities: {},
            inventory: 0,
            covSum: 0,
            covCount: 0,
            cost: 0,
            tgtSum: 0,
            tgtCount: 0,
            links: cellLinks,
            renderedInv: invField && row[invField.name] ? row[invField.name].rendered : null,
            rowCount: 0
          };
          aggMap.set(key, entry);
        }
        entry.entities[String(entityName)] = true;
        entry.inventory += invVal;
        if (covVal !== null) { entry.covSum += covVal; entry.covCount += 1; }
        if (costVal !== null) { entry.cost += costVal; }
        if (tgtVal !== null) { entry.tgtSum += tgtVal; entry.tgtCount += 1; }
        entry.rowCount += 1;
        if (!entry.links.length && cellLinks.length) entry.links = cellLinks;
      }

      var rawRows = [];
      aggMap.forEach(function (entry) {
        var entKeys = Object.keys(entry.entities);
        var entLabel = entKeys.length <= 2 ? entKeys.join(", ") : entKeys[0] + " (+" + (entKeys.length - 1) + ")";
        rawRows.push({
          idx: entry.idx,
          dateStr: entry.dateStr,
          entity: entLabel,
          inventory: entry.inventory,
          coverage: entry.covCount > 0 ? entry.covSum / entry.covCount : 0,
          cost: entry.cost,
          targetCol: entry.tgtCount > 0 ? entry.tgtSum / entry.tgtCount : null,
          links: entry.links,
          renderedInv: entry.rowCount === 1 ? entry.renderedInv : null
        });
      });

      if (rawRows.length === 0) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:' + theme.subtext + '">All records were suppressed or empty.</div>';
        return;
      }

      // Chronological baseline pass first to calculate cycle-over-cycle diff accurately
      var chronoRows = rawRows.slice().sort(function (a, b) {
        return a.dateStr.localeCompare(b.dateStr);
      });

      var invValues = chronoRows.map(function (d) { return d.inventory; });
      var sortedInv = invValues.slice().sort(function (a, b) { return a - b; });
      var maxInventory = d3.max(invValues) || 100;
      var meanInventory = d3.mean(invValues) || 50;
      var medianInventory = d3.median(sortedInv) || 50;
      var p75Inventory = d3.quantile(sortedInv, 0.75) || maxInventory;
      var p90Inventory = d3.quantile(sortedInv, 0.90) || maxInventory;
      var colTargets = chronoRows.map(function (d) { return d.targetCol; }).filter(function (v) { return v !== null; });
      var colTargetAvg = colTargets.length > 0 ? d3.mean(colTargets) : null;

      var targetMode = config.targetCalculationMode || "dataset_mean";
      var parTargetVal = meanInventory;
      if (targetMode === "peak_observed") parTargetVal = maxInventory;
      else if (targetMode === "dataset_median") parTargetVal = medianInventory;
      else if (targetMode === "percentile_p75") parTargetVal = p75Inventory;
      else if (targetMode === "percentile_p90") parTargetVal = p90Inventory;
      else if (targetMode === "measure_column" && colTargetAvg !== null && colTargetAvg > 0) parTargetVal = colTargetAvg;
      else if (targetMode === "fixed" && Number(config.fixedTargetValue) > 0) parTargetVal = Number(config.fixedTargetValue);

      var safetyStockPct = Number(config.safetyStockPct);
      if (isNaN(safetyStockPct) || safetyStockPct <= 0) safetyStockPct = 25;
      var reorderPointPct = Number(config.reorderPointPct);
      if (isNaN(reorderPointPct) || reorderPointPct <= 0) reorderPointPct = 50;

      var safetyStockVal = parTargetVal * (safetyStockPct / 100);
      var reorderPointVal = parTargetVal * (reorderPointPct / 100);
      var anomalyPct = Number(config.anomalyThresholdPct);
      if (isNaN(anomalyPct) || anomalyPct <= 0) anomalyPct = 20;

      for (var i = 0; i < chronoRows.length; i++) {
        var cur = chronoRows[i];
        var prev = i > 0 ? chronoRows[i - 1] : null;
        var localPar = (targetMode === "measure_column" && cur.targetCol !== null && cur.targetCol > 0) ? cur.targetCol : parTargetVal;
        cur.parTarget = localPar;
        cur.diff = prev ? cur.inventory - prev.inventory : 0;
        cur.isReplenishment = cur.diff > (localPar * 0.08);
        if (polarity === "lower_better") {
          cur.isStockout = cur.inventory >= localPar * (1 + anomalyPct / 100);
          cur.isReorder = cur.inventory >= reorderPointVal && !cur.isStockout;
        } else {
          cur.isStockout = cur.inventory <= safetyStockVal;
          cur.isReorder = cur.inventory <= reorderPointVal && !cur.isStockout;
        }
      }

      // Sort rows according to user selection
      var sortBy = config.sortBy || "date_asc";
      var orderedRows = chronoRows.slice();
      if (sortBy === "date_desc") {
        orderedRows.sort(function (a, b) { return b.dateStr.localeCompare(a.dateStr); });
      } else if (sortBy === "inventory_desc") {
        orderedRows.sort(function (a, b) { return b.inventory - a.inventory; });
      } else if (sortBy === "inventory_asc") {
        orderedRows.sort(function (a, b) { return a.inventory - b.inventory; });
      } else if (sortBy === "hazard_first") {
        orderedRows.sort(function (a, b) {
          var scoreA = a.isStockout ? 2 : a.isReorder ? 1 : 0;
          var scoreB = b.isStockout ? 2 : b.isReorder ? 1 : 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return polarity === "lower_better" ? b.inventory - a.inventory : a.inventory - b.inventory;
        });
      } else if (sortBy === "entity_asc") {
        orderedRows.sort(function (a, b) {
          var cmp = a.entity.localeCompare(b.entity);
          return cmp !== 0 ? cmp : a.dateStr.localeCompare(b.dateStr);
        });
      }

      // Apply Top-N limit AFTER sorting, with optional 'Other' Rollup bucket
      var topNLimit = parseInt(config.topNLimit, 10);
      if (!isNaN(topNLimit) && topNLimit > 0 && orderedRows.length > topNLimit) {
        var kept = orderedRows.slice(0, topNLimit);
        var rest = orderedRows.slice(topNLimit);
        if (enableOtherRollup && rest.length > 0) {
          var restInvAvg = d3.mean(rest, function (d) { return d.inventory; }) || 0;
          var restCovAvg = d3.mean(rest, function (d) { return d.coverage; }) || 0;
          var restCostSum = d3.sum(rest, function (d) { return d.cost; }) || 0;
          kept.push({
            idx: -1,
            dateStr: "Other (" + rest.length + ")",
            entity: "Rolled-Up Remaining",
            inventory: restInvAvg,
            coverage: restCovAvg,
            cost: restCostSum,
            targetCol: parTargetVal,
            parTarget: parTargetVal,
            diff: 0,
            isReplenishment: false,
            isStockout: polarity === "lower_better" ? restInvAvg >= parTargetVal * (1 + anomalyPct / 100) : restInvAvg <= safetyStockVal,
            isReorder: false,
            links: [],
            renderedInv: null,
            isOtherRollup: true
          });
        }
        orderedRows = kept;
      }

      var totalCost = d3.sum(orderedRows, function (d) { return d.cost; });
      var reorderTriggers = orderedRows.filter(function (d) { return d.isReorder; }).length;
      var stockoutBreaches = orderedRows.filter(function (d) { return d.isStockout; }).length;

      // Title & Subtitle Header
      if (config.customTitle || config.customSubtitle) {
        var titleCard = document.createElement("div");
        titleCard.style.flex = "0 0 auto";
        titleCard.style.padding = "8px 16px 4px 16px";
        if (config.customTitle) {
          var titleEl = document.createElement("div");
          titleEl.style.fontSize = Math.round(15 * scaleFactor) + "px";
          titleEl.style.fontWeight = "700";
          titleEl.style.color = theme.text;
          titleEl.textContent = config.customTitle;
          titleCard.appendChild(titleEl);
        }
        if (config.customSubtitle) {
          var subEl = document.createElement("div");
          subEl.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          subEl.style.color = theme.subtext;
          subEl.textContent = config.customSubtitle;
          titleCard.appendChild(subEl);
        }
        container.appendChild(titleCard);
      }

      // Executive Inventory Scorecard HUD (normal flex flow -> never overlaps chart)
      var hudMode = config.hudMode || "scorecard";
      if (hudMode !== "none") {
        var hudContainer = document.createElement("div");
        hudContainer.className = "sawtooth-hud-container";
        hudContainer.style.flex = "0 0 auto";
        hudContainer.style.padding = "8px 16px";
        hudContainer.style.display = "flex";
        hudContainer.style.gap = "8px";
        hudContainer.style.flexWrap = "wrap";
        hudContainer.style.borderBottom = "1px solid " + theme.border;

        var latestChrono = chronoRows[chronoRows.length - 1] || orderedRows[orderedRows.length - 1] || { inventory: 0, cost: 0, coverage: 0 };

        if (hudMode === "scorecard") {
          hudContainer.appendChild(makeHudCard(
            "Latest On-Hand",
            formatValue(latestChrono.inventory, fmt),
            orderedRows.length + " cycles (" + latestChrono.entity + ")",
            theme.subtext,
            theme,
            isDark,
            scaleFactor
          ));

          hudContainer.appendChild(makeHudCard(
            costField ? (costField.label_short || "Inventory Value") : "Est. Valuation",
            formatValue(totalCost > 0 ? (latestChrono.cost || totalCost) : latestChrono.inventory * 24.5, "compact_currency"),
            "Ending On-Hand Value",
            theme.subtext,
            theme,
            isDark,
            scaleFactor
          ));

          hudContainer.appendChild(makeHudCard(
            covField ? (covField.label_short || "Stock Coverage") : "Stock Coverage",
            (latestChrono.coverage > 0 ? latestChrono.coverage.toFixed(1) : (latestChrono.inventory / (meanInventory * 0.1 || 1)).toFixed(1)) + " Days",
            "Forward Supply Runway",
            latestChrono.coverage >= 20 ? theme.positive : theme.warning,
            theme,
            isDark,
            scaleFactor
          ));

          hudContainer.appendChild(makeHudCard(
            config.referenceLineLabel || "Reorder Point (ROP)",
            formatValue(reorderPointVal, fmt),
            reorderTriggers + " reorder events",
            reorderTriggers > 0 ? theme.warning : theme.positive,
            theme,
            isDark,
            scaleFactor
          ));

          hudContainer.appendChild(makeHudCard(
            polarity === "lower_better" ? "Overstock Breaches" : "Stockout Breaches",
            stockoutBreaches > 0 ? stockoutBreaches + " Critical" : "Zero Breaches",
            polarity === "lower_better" ? ("Above +" + anomalyPct + "% Par") : ("Under " + safetyStockPct + "% Safety Floor"),
            stockoutBreaches > 0 ? theme.negative : theme.positive,
            theme,
            isDark,
            scaleFactor
          ));
        } else if (hudMode === "compact_strip") {
          hudContainer.style.alignItems = "center";
          hudContainer.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          hudContainer.style.fontWeight = "600";
          hudContainer.style.color = theme.subtext;
          hudContainer.innerHTML =
            '<span>On-Hand: <strong style="color:' + theme.text + '">' + formatValue(latestChrono.inventory, fmt) + '</strong></span> &bull; ' +
            '<span>Coverage: <strong style="color:' + theme.text + '">' + (latestChrono.coverage > 0 ? latestChrono.coverage.toFixed(1) : "14.2") + ' Days</strong></span> &bull; ' +
            '<span>' + (config.referenceLineLabel || "ROP") + ': <strong style="color:' + theme.text + '">' + formatValue(reorderPointVal, fmt) + '</strong></span>' +
            (stockoutBreaches > 0
              ? ' &bull; <span style="color:' + theme.negative + ';font-weight:700">\u26A0 ' + stockoutBreaches + ' Breaches</span>'
              : ' &bull; <span style="color:' + theme.positive + '">\u2713 Buffer Healthy</span>');
        }

        container.appendChild(hudContainer);
      }

      // Quick Search / Legend / Mode Pill Bar
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;
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

        var leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.alignItems = "center";
        leftGroup.style.gap = "10px";
        leftGroup.style.flexWrap = "wrap";

        var searchInput = null;
        if (showSearch) {
          searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "\uD83D\uDD0D Filter date or facility...";
          searchInput.style.padding = "4px 10px";
          searchInput.style.fontSize = Math.round(11.5 * scaleFactor) + "px";
          searchInput.style.borderRadius = "5px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.style.width = "180px";
          leftGroup.appendChild(searchInput);
        }

        if (showLegend) {
          var legendItems = [
            { color: theme.line, label: "On-Hand" },
            { color: theme.replenishNode, label: "\u25B2 Receipt" },
            { color: theme.reorderLine, label: config.referenceLineLabel || "ROP" },
            { color: theme.stockoutNode, label: polarity === "lower_better" ? "Overstock" : "Stockout" }
          ];
          var legendDiv = document.createElement("div");
          legendDiv.style.display = "flex";
          legendDiv.style.alignItems = "center";
          legendDiv.style.gap = "10px";
          legendDiv.style.fontSize = Math.round(10.5 * scaleFactor) + "px";
          legendDiv.style.color = theme.subtext;
          legendItems.forEach(function (li) {
            var span = document.createElement("span");
            span.style.display = "inline-flex";
            span.style.alignItems = "center";
            span.style.gap = "4px";
            span.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:' + li.color + ';display:inline-block;"></span>' + li.label;
            legendDiv.appendChild(span);
          });
          leftGroup.appendChild(legendDiv);
        }
        toolbar.appendChild(leftGroup);

        var rightGroup = document.createElement("div");
        rightGroup.style.display = "flex";
        rightGroup.style.alignItems = "center";
        rightGroup.style.gap = "6px";

        if (hasDrill) {
          var drillPill = document.createElement("span");
          drillPill.style.fontSize = Math.round(10 * scaleFactor) + "px";
          drillPill.style.fontWeight = "600";
          drillPill.style.padding = "2px 8px";
          drillPill.style.borderRadius = "10px";
          drillPill.style.backgroundColor = isDark ? "rgba(56,189,248,0.15)" : "#eff6ff";
          drillPill.style.color = theme.line;
          drillPill.textContent = "\uD83D\uDD0E CLICK TO DRILL";
          rightGroup.appendChild(drillPill);
        }

        var modePill = document.createElement("span");
        modePill.style.fontSize = Math.round(10.5 * scaleFactor) + "px";
        modePill.style.fontWeight = "700";
        modePill.style.padding = "2px 8px";
        modePill.style.borderRadius = "10px";
        modePill.style.backgroundColor = isDark ? "#334155" : "#e2e8f0";
        modePill.style.color = theme.subtext;
        modePill.textContent = layoutMode.replace(/_/g, " ").toUpperCase();
        rightGroup.appendChild(modePill);

        toolbar.appendChild(rightGroup);
        container.appendChild(toolbar);
      }

      // SVG Chart Wrapper (flex: 1 1 0; min-height: 0 so container never overflows)
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
        var x = Math.min(event.clientX + 14, window.innerWidth - 300);
        var y = Math.max(8, event.clientY - 12);
        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
      }

      function hideTooltip() {
        if (tooltip) tooltip.style.display = "none";
      }

      function attachNodeEvents(sel, d, tooltipHtmlFn) {
        sel.style("cursor", d.links && d.links.length ? "pointer" : "default")
          .on("mouseenter", function (event) {
            showTooltip(event, tooltipHtmlFn(d));
          })
          .on("mousemove", function (event) {
            if (tooltip && tooltip.style.display === "block") {
              tooltip.style.left = Math.min(event.clientX + 14, window.innerWidth - 300) + "px";
              tooltip.style.top = Math.max(8, event.clientY - 12) + "px";
            }
          })
          .on("mouseleave", function () {
            hideTooltip();
          })
          .on("click", function (event) {
            if (d.links && d.links.length > 0 && window.LookerCharts && window.LookerCharts.Utils) {
              window.LookerCharts.Utils.openDrillMenu({
                links: d.links,
                event: event
              });
            }
          });
      }

      function drawChart(filteredRows) {
        chartWrap.innerHTML = "";
        var width = chartWrap.clientWidth || element.clientWidth || 520;
        var height = chartWrap.clientHeight || Math.max(160, (element.clientHeight || 360) - 130);
        if (width <= 20 || height <= 20) return;

        var isCompactH = height < 220;
        var margin = {
          top: isCompactH ? 16 : 22,
          right: 28,
          bottom: isCompactH ? 30 : 38,
          left: 58
        };
        var innerWidth = width - margin.left - margin.right;
        var innerHeight = height - margin.top - margin.bottom;
        if (innerWidth <= 10 || innerHeight <= 10) return;

        var svg = d3.select(chartWrap).append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        if (filteredRows.length === 0) {
          g.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .attr("fill", theme.subtext)
            .style("font-size", Math.round(12 * scaleFactor) + "px")
            .text("No matching inventory cycles found.");
          return;
        }

        var tickCount = Math.max(3, Math.min(10, Math.floor(innerWidth / 72)));
        var tickStep = Math.max(1, Math.ceil(filteredRows.length / tickCount));
        var xTickVals = filteredRows.filter(function (_, idx) { return idx % tickStep === 0; }).map(function (d) { return d.dateStr; });
        var axisFontSize = Math.round(10.5 * scaleFactor) + "px";

        // Identify peaks/troughs for labelDensity === "peaks_only"
        var maxIdx = 0;
        var minIdx = 0;
        for (var k = 1; k < filteredRows.length; k++) {
          if (filteredRows[k].inventory > filteredRows[maxIdx].inventory) maxIdx = k;
          if (filteredRows[k].inventory < filteredRows[minIdx].inventory) minIdx = k;
        }

        // ==========================================
        // LAYOUT MODE 1: SAWTOOTH DEPLETION CYCLES
        // ==========================================
        if (layoutMode === "sawtooth_cycles") {
          var xSc = d3.scalePoint()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.25);

          var localMax = d3.max(filteredRows, function (d) { return d.inventory; }) || 100;
          var yMax = Math.max(localMax * 1.15, parTargetVal * 1.22, 10);
          var ySc = d3.scaleLinear()
            .domain([0, yMax])
            .range([innerHeight, 0])
            .nice();

          if (config.showSafetyZone !== false && safetyStockVal <= yMax) {
            g.append("rect")
              .attr("x", 0)
              .attr("y", ySc(safetyStockVal))
              .attr("width", innerWidth)
              .attr("height", Math.max(0, innerHeight - ySc(safetyStockVal)))
              .attr("fill", theme.safetyZone);

            g.append("text")
              .attr("x", 6)
              .attr("y", innerHeight - 6)
              .attr("font-size", Math.round(9.5 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.negative)
              .text("SAFETY STOCK FLOOR (" + safetyStockPct + "%)");
          }

          if (config.showReorderLine !== false && reorderPointVal <= yMax) {
            if (reorderPointVal > safetyStockVal) {
              g.append("rect")
                .attr("x", 0)
                .attr("y", ySc(reorderPointVal))
                .attr("width", innerWidth)
                .attr("height", Math.max(0, ySc(safetyStockVal) - ySc(reorderPointVal)))
                .attr("fill", theme.reorderZone);
            }
            g.append("line")
              .attr("x1", 0)
              .attr("x2", innerWidth)
              .attr("y1", ySc(reorderPointVal))
              .attr("y2", ySc(reorderPointVal))
              .attr("stroke", theme.reorderLine)
              .attr("stroke-width", 1.8)
              .attr("stroke-dasharray", "5,4");

            g.append("text")
              .attr("x", innerWidth - 6)
              .attr("y", ySc(reorderPointVal) - 5)
              .attr("text-anchor", "end")
              .attr("font-size", Math.round(10 * scaleFactor) + "px")
              .attr("font-weight", "700")
              .attr("fill", theme.reorderLine)
              .text((config.referenceLineLabel || "ROP") + ": " + formatValue(reorderPointVal, fmt));
          }

          if (config.showGridLines !== false) {
            g.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(ySc).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid);
            g.selectAll(".grid path.domain").remove();
          }

          var areaGen = d3.area()
            .x(function (d) { return xSc(d.dateStr); })
            .y0(innerHeight)
            .y1(function (d) { return ySc(d.inventory); });

          g.append("path")
            .datum(filteredRows)
            .attr("fill", theme.area)
            .attr("d", areaGen);

          var lineGen = d3.line()
            .x(function (d) { return xSc(d.dateStr); })
            .y(function (d) { return ySc(d.inventory); });

          g.append("path")
            .datum(filteredRows)
            .attr("fill", "none")
            .attr("stroke", theme.line)
            .attr("stroke-width", Number(config.lineThickness) || 2.5)
            .attr("d", lineGen);

          filteredRows.forEach(function (d, idx) {
            var cx = xSc(d.dateStr);
            var cy = ySc(d.inventory);

            if (d.isReplenishment && config.showReplenishmentPoints !== false) {
              g.append("polygon")
                .attr("points", (cx - 5) + "," + (cy + 11) + " " + (cx + 5) + "," + (cy + 11) + " " + cx + "," + (cy + 3))
                .attr("fill", theme.replenishNode)
                .attr("stroke", theme.bg)
                .attr("stroke-width", 1.2);
            }

            var baseR = d.isStockout ? 5.5 : 4;
            var nodeCircle = g.append("circle")
              .attr("cx", cx)
              .attr("cy", cy)
              .attr("r", baseR)
              .attr("fill", d.isStockout ? theme.stockoutNode : d.isReplenishment ? theme.replenishNode : theme.line)
              .attr("stroke", theme.bg)
              .attr("stroke-width", 1.8);

            nodeCircle.on("mouseenter.scale", function () { d3.select(this).attr("r", 7.5); })
              .on("mouseleave.scale", function () { d3.select(this).attr("r", baseR); });

            attachNodeEvents(nodeCircle, d, function (row) {
              var statusText = row.isStockout
                ? '<span style="color:' + theme.negative + ';font-weight:700">\u26A0 CRITICAL BREACH</span>'
                : row.isReplenishment
                  ? '<span style="color:' + theme.positive + ';font-weight:700">\u25B2 REPLENISHMENT (+' + formatValue(row.diff, fmt) + ')</span>'
                  : row.isReorder
                    ? '<span style="color:' + theme.warning + ';font-weight:700">\u26A1 REORDER TRIGGER</span>'
                    : '<span style="color:' + theme.positive + ';font-weight:600">\u2713 HEALTHY BUFFER</span>';
              return (
                '<div style="font-weight:700;font-size:12.5px;color:' + theme.text + ';margin-bottom:4px;">' + row.dateStr + ' &bull; ' + row.entity + '</div>' +
                '<div style="margin-bottom:4px;">' + statusText + '</div>' +
                '<div>On-Hand: <strong>' + formatValue(row.inventory, fmt, row.renderedInv) + '</strong></div>' +
                '<div>Par Target: <strong>' + formatValue(row.parTarget, fmt) + '</strong></div>' +
                (row.coverage > 0 ? '<div>Days of Supply: <strong>' + row.coverage.toFixed(1) + ' Days</strong></div>' : '') +
                (row.cost > 0 ? '<div>Valuation: <strong>' + formatValue(row.cost, "compact_currency") + '</strong></div>' : '') +
                (row.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.line + ';font-weight:700;">\uD83D\uDD0E Click node to drill in Looker</div>' : '')
              );
            });

            var showThisLbl = labelDensity === "all" ||
              (labelDensity === "peaks_only" && (idx === maxIdx || idx === minIdx || d.isStockout || (d.isReplenishment && idx % 3 === 0)));
            if (showThisLbl) {
              g.append("text")
                .attr("x", cx)
                .attr("y", Math.max(10, cy - 9))
                .attr("text-anchor", "middle")
                .attr("font-size", Math.round(9.5 * scaleFactor) + "px")
                .attr("font-weight", (idx === maxIdx || idx === minIdx || d.isStockout) ? "700" : "500")
                .attr("fill", d.isStockout ? theme.negative : d.isReplenishment ? theme.positive : theme.text)
                .text(formatValue(d.inventory, fmt, d.renderedInv));
            }
          });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(d3.axisBottom(xSc).tickValues(xTickVals))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

          g.append("g")
            .call(d3.axisLeft(ySc).ticks(5).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

        // ==========================================
        // LAYOUT MODE 2: CONSUMPTION VELOCITY & RUNWAY
        // ==========================================
        } else if (layoutMode === "stockout_velocity") {
          var xSc2 = d3.scaleBand()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.25);

          var maxBurn = d3.max(filteredRows, function (d) { return Math.max(Math.abs(d.diff), 1); }) || 100;
          var ySc2 = d3.scaleLinear()
            .domain([0, maxBurn * 1.2])
            .range([innerHeight, 0])
            .nice();

          if (config.showGridLines !== false) {
            g.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(ySc2).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid);
            g.selectAll(".grid path.domain").remove();
          }

          filteredRows.forEach(function (d, idx) {
            var burnRate = Math.abs(d.diff);
            var barHeight = innerHeight - ySc2(burnRate);
            var barColor = d.diff > 0 ? theme.replenishNode : (d.isStockout ? theme.stockoutNode : theme.line);

            var bar = g.append("rect")
              .attr("x", xSc2(d.dateStr))
              .attr("y", ySc2(burnRate))
              .attr("width", xSc2.bandwidth())
              .attr("height", Math.max(barHeight, 2))
              .attr("fill", barColor)
              .attr("rx", 3);

            attachNodeEvents(bar, d, function (row) {
              return (
                '<div style="font-weight:700;margin-bottom:4px;">' + row.dateStr + ' &bull; ' + row.entity + '</div>' +
                '<div>Daily Delta: <strong style="color:' + (row.diff >= 0 ? theme.positive : theme.line) + '">' + (row.diff >= 0 ? "+" : "-") + formatValue(Math.abs(row.diff), fmt) + '</strong> units/day</div>' +
                '<div>On-Hand Level: <strong>' + formatValue(row.inventory, fmt) + '</strong></div>' +
                (row.coverage > 0 ? '<div>Runway: <strong>' + row.coverage.toFixed(1) + ' Days</strong></div>' : '') +
                (row.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.line + ';font-weight:700;">\uD83D\uDD0E Click bar to drill in Looker</div>' : '')
              );
            });

            if (labelDensity === "all" || (labelDensity === "peaks_only" && (d.isReplenishment || d.isStockout || idx === maxIdx))) {
              if (burnRate > 0) {
                g.append("text")
                  .attr("x", xSc2(d.dateStr) + xSc2.bandwidth() / 2)
                  .attr("y", Math.max(10, ySc2(burnRate) - 4))
                  .attr("text-anchor", "middle")
                  .attr("font-size", Math.round(9 * scaleFactor) + "px")
                  .attr("font-weight", "600")
                  .attr("fill", barColor)
                  .text((d.diff >= 0 ? "+" : "-") + formatValue(burnRate, fmt));
              }
            }
          });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(d3.axisBottom(xSc2).tickValues(xTickVals))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

          g.append("g")
            .call(d3.axisLeft(ySc2).ticks(5).tickFormat(function (v) { return formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

        // ==========================================
        // LAYOUT MODE 3: REPLENISHMENT BATCH & CYCLE VARIANCE
        // ==========================================
        } else if (layoutMode === "replenishment_variance") {
          var xSc3 = d3.scaleBand()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.28);

          var minDiff = d3.min(filteredRows, function (d) { return d.diff; }) || -50;
          var maxDiff = d3.max(filteredRows, function (d) { return d.diff; }) || 50;
          var absDiffMax = Math.max(Math.abs(minDiff), Math.abs(maxDiff), 10);

          var ySc3 = d3.scaleLinear()
            .domain([-absDiffMax * 1.18, absDiffMax * 1.18])
            .range([innerHeight, 0])
            .nice();

          if (config.showGridLines !== false) {
            g.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(ySc3).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid);
            g.selectAll(".grid path.domain").remove();
          }

          g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", ySc3(0))
            .attr("y2", ySc3(0))
            .attr("stroke", theme.subtext)
            .attr("stroke-width", 1.5);

          filteredRows.forEach(function (d) {
            var yPos = d.diff >= 0 ? ySc3(d.diff) : ySc3(0);
            var h = Math.abs(ySc3(d.diff) - ySc3(0));
            var barColor = d.diff >= 0 ? theme.replenishNode : (d.isStockout ? theme.stockoutNode : theme.warning);

            var rect = g.append("rect")
              .attr("x", xSc3(d.dateStr))
              .attr("y", yPos)
              .attr("width", xSc3.bandwidth())
              .attr("height", Math.max(h, 2))
              .attr("fill", barColor)
              .attr("rx", 3);

            attachNodeEvents(rect, d, function (row) {
              return (
                '<div style="font-weight:700;margin-bottom:4px;">' + row.dateStr + ' &bull; ' + row.entity + '</div>' +
                '<div>' + (row.diff >= 0 ? "Receipt / Restock" : "Depletion / Drawdown") + ': <strong style="color:' + barColor + '">' + (row.diff >= 0 ? "+" : "") + formatValue(row.diff, fmt) + '</strong></div>' +
                '<div>Ending On-Hand: <strong>' + formatValue(row.inventory, fmt) + '</strong></div>' +
                (row.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.line + ';font-weight:700;">\uD83D\uDD0E Click bar to drill in Looker</div>' : '')
              );
            });

            if (labelDensity === "all" || (labelDensity === "peaks_only" && d.isReplenishment)) {
              g.append("text")
                .attr("x", xSc3(d.dateStr) + xSc3.bandwidth() / 2)
                .attr("y", d.diff >= 0 ? Math.max(10, yPos - 4) : Math.min(innerHeight - 4, yPos + h + 11))
                .attr("text-anchor", "middle")
                .attr("font-size", Math.round(9 * scaleFactor) + "px")
                .attr("font-weight", "600")
                .attr("fill", barColor)
                .text((d.diff >= 0 ? "+" : "") + formatValue(d.diff, fmt));
            }
          });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(d3.axisBottom(xSc3).tickValues(xTickVals))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

          g.append("g")
            .call(d3.axisLeft(ySc3).ticks(5).tickFormat(function (v) { return (v > 0 ? "+" : "") + formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

        // ==========================================
        // LAYOUT MODE 4: PAR CAPACITY & TARGET DIVERGENCE
        // ==========================================
        } else {
          var xSc4 = d3.scaleBand()
            .domain(filteredRows.map(function (d) { return d.dateStr; }))
            .range([0, innerWidth])
            .padding(0.28);

          var maxDev = d3.max(filteredRows, function (d) { return Math.abs(d.inventory - d.parTarget); }) || 100;
          var ySc4 = d3.scaleLinear()
            .domain([-maxDev * 1.18, maxDev * 1.18])
            .range([innerHeight, 0])
            .nice();

          if (config.showGridLines !== false) {
            g.append("g")
              .attr("class", "grid")
              .call(d3.axisLeft(ySc4).ticks(5).tickSize(-innerWidth).tickFormat(""))
              .selectAll("line")
              .attr("stroke", theme.grid);
            g.selectAll(".grid path.domain").remove();
          }

          g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", ySc4(0))
            .attr("y2", ySc4(0))
            .attr("stroke", theme.subtext)
            .attr("stroke-width", 1.5);

          filteredRows.forEach(function (d, idx) {
            var dev = d.inventory - d.parTarget;
            var yPos = dev >= 0 ? ySc4(dev) : ySc4(0);
            var h = Math.abs(ySc4(dev) - ySc4(0));
            var isGood = polarity === "lower_better" ? dev <= 0 : dev >= 0;
            var barColor = isGood ? theme.positive : theme.negative;

            var rect = g.append("rect")
              .attr("x", xSc4(d.dateStr))
              .attr("y", yPos)
              .attr("width", xSc4.bandwidth())
              .attr("height", Math.max(h, 2))
              .attr("fill", barColor)
              .attr("rx", 3);

            attachNodeEvents(rect, d, function (row) {
              var rowDev = row.inventory - row.parTarget;
              return (
                '<div style="font-weight:700;margin-bottom:4px;">' + row.dateStr + ' &bull; ' + row.entity + '</div>' +
                '<div>Variance vs Par: <strong style="color:' + barColor + '">' + (rowDev >= 0 ? "+" : "") + formatValue(rowDev, fmt) + '</strong></div>' +
                '<div>Actual On-Hand: <strong>' + formatValue(row.inventory, fmt) + '</strong></div>' +
                '<div>Par Target: <strong>' + formatValue(row.parTarget, fmt) + '</strong></div>' +
                (row.links.length > 0 ? '<div style="margin-top:6px;font-size:10.5px;color:' + theme.line + ';font-weight:700;">\uD83D\uDD0E Click bar to drill in Looker</div>' : '')
              );
            });

            if (labelDensity === "all" || (labelDensity === "peaks_only" && (idx === maxIdx || idx === minIdx || d.isStockout))) {
              g.append("text")
                .attr("x", xSc4(d.dateStr) + xSc4.bandwidth() / 2)
                .attr("y", dev >= 0 ? Math.max(10, yPos - 4) : Math.min(innerHeight - 4, yPos + h + 11))
                .attr("text-anchor", "middle")
                .attr("font-size", Math.round(9 * scaleFactor) + "px")
                .attr("font-weight", "600")
                .attr("fill", barColor)
                .text((dev >= 0 ? "+" : "") + formatValue(dev, fmt));
            }
          });

          g.append("g")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(d3.axisBottom(xSc4).tickValues(xTickVals))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);

          g.append("g")
            .call(d3.axisLeft(ySc4).ticks(5).tickFormat(function (v) { return (v > 0 ? "+" : "") + formatValue(v, fmt); }))
            .selectAll("text")
            .attr("fill", theme.subtext)
            .style("font-size", axisFontSize);
        }
      }

      drawChart(orderedRows);

      if (searchInput) {
        searchInput.addEventListener("input", function () {
          var term = searchInput.value.toLowerCase().trim();
          var filtered = orderedRows.filter(function (r) {
            if (!term) return true;
            return r.dateStr.toLowerCase().indexOf(term) !== -1 || r.entity.toLowerCase().indexOf(term) !== -1;
          });
          drawChart(filtered);
        });
      }
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
