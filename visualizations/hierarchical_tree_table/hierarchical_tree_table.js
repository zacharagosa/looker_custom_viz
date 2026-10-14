/**
 * Collapsible Hierarchical Tree Grid - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Buganizer Cloud Blocker b/530833873: "Official Collapsible Tree Visualization"
 * - PRD - Looker Table Viz Improvements (go/prd-looker-table-viz-improvements):
 *   "Hierarchical roll ups in a single column (CB): Provide a tree-like structure within
 *    the table where parent rows can be expanded to show child rows. The other dimensions
 *    and measures also show the breakdown at the expanded level."
 * - YAQS go/yeng/7982871132560687104: "Multi-level subtotals per parent dimension"
 *
 * Expanded Capabilities (Flexibility Upgrade):
 * - Strict 2-Section Schema: "Display" and "Style" tabs to keep Looker's Edit Viz modal clean.
 * - Dynamic Field-Role Dropdowns: Re-map L1, L2, L3 hierarchy dimensions, primary measure, and
 *   comparison benchmark measure directly from live query dropdowns without touching LookML.
 * - Multi-Level Rollup Engine: Auto-aggregates parent subtotals, % of parent group share,
 *   and benchmark targets across arbitrary depth hierarchies.
 * - Configurable Target Benchmarks: Dataset Mean, Median (P50), Top Quartile (P75), Elite (P90),
 *   or Fixed Goal with customizable underperformance alert badges.
 * - Sorting, Top-N Density & 'Other' Rollups: Sort by metric descending/ascending, alphabetical,
 *   or natural order, filter top N branches per level, and rollup tails into an 'Other' group.
 * - Multi-Density Executive HUD: Full KPI Scorecard, Compact Strip, or Hidden mode.
 * - Multi-Brand Theming & Polarity: Executive Slate, Google Blue, Cyber NOC Dark, Emerald,
 *   Sunset Media, Wellverse Healthcare, plus Custom Hex color overrides and metric polarity.
 * - Scalable to 5,000+ rows with debounced ResizeObserver (<4px guard) and Looker drill menus.
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
    slate: {
      name: "Executive Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      headerBg: "#f1f5f9",
      headerText: "#1e293b",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      rowHover: "#f1f5f9",
      rowAlt: "#fafafa",
      parentBg: "#f8fafc",
      accent: "#0f766e",
      barFill: "rgba(15, 118, 110, 0.18)",
      barSolid: "#0f766e",
      badgeBg: "#e2e8f0",
      badgeText: "#475569",
      guideLine: "#cbd5e1"
    },
    google_blue: {
      name: "Google Cloud Blue (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      headerBg: "#f0f7ff",
      headerText: "#1e3a8a",
      border: "#dbeafe",
      text: "#0f172a",
      subtext: "#475569",
      rowHover: "#eff6ff",
      rowAlt: "#fafcff",
      parentBg: "#f8fbff",
      accent: "#2563eb",
      barFill: "rgba(37, 99, 235, 0.16)",
      barSolid: "#2563eb",
      badgeBg: "#dbeafe",
      badgeText: "#1d4ed8",
      guideLine: "#bfdbfe"
    },
    cyber_dark: {
      name: "Cyber NOC Dark",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "#111827",
      headerBg: "#1f2937",
      headerText: "#f9fafb",
      border: "#374151",
      text: "#f3f4f6",
      subtext: "#9ca3af",
      rowHover: "#1f2937",
      rowAlt: "#101623",
      parentBg: "#131c2e",
      accent: "#38bdf8",
      barFill: "rgba(56, 189, 248, 0.2)",
      barSolid: "#38bdf8",
      badgeBg: "#374151",
      badgeText: "#38bdf8",
      guideLine: "#4b5563"
    },
    emerald: {
      name: "Emerald Enterprise (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      headerBg: "#ecfdf5",
      headerText: "#064e3b",
      border: "#d1fae5",
      text: "#064e3b",
      subtext: "#047857",
      rowHover: "#f0fdf4",
      rowAlt: "#fcfdfd",
      parentBg: "#f4fdf7",
      accent: "#059669",
      barFill: "rgba(5, 150, 105, 0.16)",
      barSolid: "#059669",
      badgeBg: "#d1fae5",
      badgeText: "#065f46",
      guideLine: "#a7f3d0"
    },
    sunset: {
      name: "Sunset Media (Warm)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fff7ed",
      headerBg: "#ffedd5",
      headerText: "#7c2d12",
      border: "#fed7aa",
      text: "#431407",
      subtext: "#9a3412",
      rowHover: "#fff7ed",
      rowAlt: "#fffbf5",
      parentBg: "#fff1e6",
      accent: "#ea580c",
      barFill: "rgba(234, 88, 12, 0.18)",
      barSolid: "#ea580c",
      badgeBg: "#ffedd5",
      badgeText: "#c2410c",
      guideLine: "#fdba74"
    },
    wellverse: {
      name: "Wellverse Healthcare (Teal)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdfa",
      headerBg: "#ccfbf1",
      headerText: "#134e4a",
      border: "#99f6e4",
      text: "#0f766e",
      subtext: "#115e59",
      rowHover: "#f0fdfa",
      rowAlt: "#f8fffe",
      parentBg: "#e6fffa",
      accent: "#0d9488",
      barFill: "rgba(13, 148, 136, 0.18)",
      barSolid: "#0d9488",
      badgeBg: "#ccfbf1",
      badgeText: "#0f766e",
      guideLine: "#5eead4"
    }
  };

  function getActiveTheme(config) {
    var themeKey = config.colorTheme || "slate";
    if (themeKey === "custom" && config.customAccentColor) {
      var accent = config.customAccentColor;
      return {
        name: "Custom Accent",
        isDark: false,
        bg: "#ffffff",
        cardBg: "#f8fafc",
        headerBg: "#f1f5f9",
        headerText: "#0f172a",
        border: "#e2e8f0",
        text: "#0f172a",
        subtext: "#64748b",
        rowHover: "#f8fafc",
        rowAlt: "#fcfcfd",
        parentBg: "#f8fafc",
        accent: accent,
        barFill: accent + "25",
        barSolid: accent,
        badgeBg: "#e2e8f0",
        badgeText: "#334155",
        guideLine: "#cbd5e1"
      };
    }
    return THEMES[themeKey] || THEMES.slate;
  }

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    switch (fmt) {
      case "compact_currency":
        if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return "$" + Math.round(num).toLocaleString();
      case "compact_num":
        if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
        if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "k";
        return num.toLocaleString();
      case "percentage":
        return (num * 100).toFixed(1) + "%";
      case "decimal_2dp":
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case "numeric":
        return Math.round(num).toLocaleString();
      case "raw":
        return String(num);
      case "auto":
      default:
        if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
        if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "k";
        return Math.round(num).toLocaleString();
    }
  }

  looker.plugins.visualizations.add({
    id: "hierarchical_tree_table",
    label: "Collapsible Hierarchical Tree Grid",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Tree Layout Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Interactive Collapsible Tree": "collapsible_tree" },
          { "Flat Indented with Subtotals": "flat_indented" },
          { "Compact Summary (L1 Only)": "compact_summary" }
        ],
        default: "collapsible_tree"
      },
      defaultExpansion: {
        type: "string",
        label: "Default Tree Expansion",
        section: "Display",
        order: 2,
        display: "select",
        values: [
          { "Level 1 Expanded (Children Collapsed)": "level1" },
          { "Levels 1 & 2 Expanded": "level2" },
          { "Expand All Levels": "all" }
        ],
        default: "level1"
      },
      level1DimOverride: {
        type: "string",
        label: "Primary Hierarchy Dimension (L1)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      level2DimOverride: {
        type: "string",
        label: "Secondary Hierarchy Dimension (L2)",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      level3DimOverride: {
        type: "string",
        label: "Tertiary Hierarchy Dimension (L3)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      primaryMeasureOverride: {
        type: "string",
        label: "Primary Measure Override",
        display: "select",
        values: [{ "Auto (run query to populate choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      comparisonMeasureOverride: {
        type: "string",
        label: "Comparison / Secondary Measure",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark Target Mode",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "None (No Benchmark Line)": "none" },
          { "Dataset Mean (L1 Average)": "dataset_mean" },
          { "Dataset Median (P50 L1)": "dataset_median" },
          { "Top Quartile Benchmark (P75)": "percentile_p75" },
          { "Elite Performer Benchmark (P90)": "percentile_p90" },
          { "Fixed Goal Value": "fixed_value" }
        ],
        default: "dataset_mean"
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        section: "Display",
        order: 9,
        default: 100000
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Benchmark Label",
        section: "Display",
        order: 10,
        default: "Target Benchmark"
      },
      underperformanceThresholdPct: {
        type: "number",
        label: "Underperformance Alert Threshold (%)",
        section: "Display",
        order: 11,
        default: 20
      },
      sortOrder: {
        type: "string",
        label: "Node Hierarchy Sort Order",
        section: "Display",
        order: 12,
        display: "select",
        values: [
          { "Metric Descending (Top Performers First)": "metric_desc" },
          { "Metric Ascending (Lowest First)": "metric_asc" },
          { "Alphabetical Name": "alphabetical" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc"
      },
      topNBranches: {
        type: "string",
        label: "Branch Density Filter (Top-N per Level)",
        section: "Display",
        order: 13,
        display: "select",
        values: [
          { "All Branches (Unrestricted)": "all" },
          { "Top 5 Branches per Level": "5" },
          { "Top 8 Branches per Level": "8" },
          { "Top 10 Branches per Level": "10" },
          { "Top 15 Branches per Level": "15" }
        ],
        default: "all"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into 'Other' Aggregate Branch",
        section: "Display",
        order: 14,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Value Rows",
        section: "Display",
        order: 15,
        default: false
      },
      hudMode: {
        type: "string",
        label: "Executive Rollup Summary HUD",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Full Scorecard HUD": "full" },
          { "Compact Summary Strip": "compact" },
          { "Hidden (Table Only)": "hidden" }
        ],
        default: "full"
      },
      showBars: {
        type: "boolean",
        label: "Show In-Cell Share Progress Bars",
        section: "Display",
        order: 17,
        default: true
      },
      showPercentShare: {
        type: "boolean",
        label: "Show % of Parent Group Share",
        section: "Display",
        order: 18,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Branch Search Filter",
        section: "Display",
        order: 19,
        default: true
      },
      customTitle: {
        type: "string",
        label: "Custom Header Title Override",
        section: "Display",
        order: 20,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Header Subtitle Override",
        section: "Display",
        order: 21,
        default: ""
      },

      // ==========================================
      // SECTION 2: STYLE
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Visual Brand Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Executive Slate (Light)": "slate" },
          { "Google Cloud Blue (Light)": "google_blue" },
          { "Cyber NOC Dark": "cyber_dark" },
          { "Emerald Enterprise (Light)": "emerald" },
          { "Sunset Media (Warm)": "sunset" },
          { "Wellverse Healthcare (Teal)": "wellverse" },
          { "Custom Accent Color": "custom" }
        ],
        default: "slate"
      },
      customAccentColor: {
        type: "string",
        label: "Custom Primary Accent Hex",
        section: "Style",
        order: 2,
        display: "color",
        default: "#2563eb"
      },
      metricPolarity: {
        type: "string",
        label: "Performance Metric Polarity",
        section: "Style",
        order: 3,
        display: "select",
        values: [
          { "Higher is Better (Revenue, GMV, Units)": "higher_is_better" },
          { "Lower is Better (Cost, Churn, Latency, Defects)": "lower_is_better" }
        ],
        default: "higher_is_better"
      },
      rowDensity: {
        type: "string",
        label: "Row Density / Font Scale",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Compact (28px - High Density)": "compact" },
          { "Normal (36px - Balanced)": "normal" },
          { "Relaxed (44px - Presentation)": "relaxed" }
        ],
        default: "normal"
      },
      valueFormat: {
        type: "string",
        label: "Primary Measure Value Format",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Formatted Number (1,234,567)": "numeric" },
          { "Unformatted Raw": "raw" }
        ],
        default: "compact_currency"
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields) return;
      var fields = queryResponse.fields;
      var dims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var meas = (fields.measures || []).concat(fields.measure_like || []);
      if (meas.length === 0 && fields.table_calculations) {
        meas = fields.table_calculations;
      }

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" +
                      meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      var fieldSpecs = {
        level1DimOverride: { role: "dimension", defaultIdx: 0 },
        level2DimOverride: { role: "dimension", defaultIdx: dims.length > 1 ? 1 : -1 },
        level3DimOverride: { role: "dimension", defaultIdx: dims.length > 2 ? 2 : -1 },
        primaryMeasureOverride: { role: "measure", defaultIdx: 0 },
        comparisonMeasureOverride: { role: "measure", defaultIdx: meas.length > 1 ? 1 : -1 }
      };

      Object.keys(fieldSpecs).forEach(function (key) {
        var spec = fieldSpecs[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
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
      this._expandedMap = {};
      this._searchQuery = "";
      this._setupLifecycleObservers(element);

      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.className = "looker-hierarchical-tree-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      // Reusable Tooltip
      var oldTooltip = document.querySelector(".hierarchical-tree-tooltip");
      if (oldTooltip) {
        this._tooltip = oldTooltip;
      } else {
        this._tooltip = document.createElement("div");
        this._tooltip.className = "hierarchical-tree-tooltip";
        this._tooltip.style.position = "fixed";
        this._tooltip.style.zIndex = "999999";
        this._tooltip.style.pointerEvents = "none";
        this._tooltip.style.display = "none";
        this._tooltip.style.padding = "8px 12px";
        this._tooltip.style.borderRadius = "6px";
        this._tooltip.style.fontSize = "11.5px";
        this._tooltip.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
        document.body.appendChild(this._tooltip);
      }
    },

    _setupLifecycleObservers: function (element) {
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
    },

    _onResize: function () {
      var self = this;
      if (!self._lastData || !self._lastQueryResponse) return;
      var el = self._element || self._lastElement;
      if (!el) return;

      var curW = el.clientWidth || 0;
      var curH = el.clientHeight || 0;
      if (curW <= 10 || curH <= 10) return;

      // Avoid re-rendering if size difference is negligible (<4px guard)
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
      }, 60);
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this._registerDynamicFieldOptions(queryResponse);

      this._element = element;
      this._lastElement = element;
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!this._container || !element.contains(this._container)) {
        element.innerHTML = "";
        this._container = document.createElement("div");
        this._container.className = "looker-hierarchical-tree-container";
        this._container.style.width = "100%";
        this._container.style.height = "100%";
        this._container.style.display = "flex";
        this._container.style.flexDirection = "column";
        this._container.style.overflow = "hidden";
        this._container.style.boxSizing = "border-box";
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      if (this.clearErrors) {
        try { this.clearErrors(); } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          if (done) done();
        } catch (err) {
          console.error("Hierarchical Tree Grid Render Error:", err);
          if (self.addError) {
            self.addError({
              title: "Rendering Error",
              message: err.message || "Failed to render Hierarchical Tree Grid."
            });
          }
          if (done) done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) this._tooltip.style.display = "none";

      this._lastRenderW = element.clientWidth || 0;
      this._lastRenderH = element.clientHeight || 0;

      if (!data || !data.length) {
        if (this.addError) {
          this.addError({
            title: "No Data",
            message: "The query returned no data rows to visualize."
          });
        }
        return;
      }

      var fields = queryResponse.fields;
      var allDims = (fields.dimensions || []).concat(fields.dimension_like || []);
      var allMeas = (fields.measures || []).concat(fields.measure_like || []);
      if (allMeas.length === 0 && fields.table_calculations) {
        allMeas = fields.table_calculations;
      }

      if (allDims.length < 2) {
        if (this.addError) {
          this.addError({
            title: "Hierarchical Dimensions Required",
            message: "The Collapsible Hierarchical Tree Grid requires at least 2 Dimensions (e.g. Department > Category, or Country > State) to form a parent-child hierarchy."
          });
        }
        return;
      }

      // ==========================================
      // DYNAMIC FIELD RESOLUTION
      // ==========================================
      function findField(list, nameOrLabel) {
        if (!nameOrLabel) return null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].name === nameOrLabel || list[i].label === nameOrLabel || list[i].label_short === nameOrLabel) {
            return list[i];
          }
        }
        return null;
      }

      var dims = [];
      var usedDimNames = {};

      var l1 = findField(allDims, config.level1DimOverride);
      if (l1) { dims.push(l1); usedDimNames[l1.name] = true; }
      else if (allDims[0]) { dims.push(allDims[0]); usedDimNames[allDims[0].name] = true; }

      var l2 = findField(allDims, config.level2DimOverride);
      if (l2 && !usedDimNames[l2.name]) { dims.push(l2); usedDimNames[l2.name] = true; }
      else {
        for (var d = 0; d < allDims.length; d++) {
          if (!usedDimNames[allDims[d].name]) {
            dims.push(allDims[d]);
            usedDimNames[allDims[d].name] = true;
            break;
          }
        }
      }

      var l3 = findField(allDims, config.level3DimOverride);
      if (l3 && !usedDimNames[l3.name]) { dims.push(l3); usedDimNames[l3.name] = true; }

      // Append remaining dimensions if user hasn't overridden
      for (var d2 = 0; d2 < allDims.length; d2++) {
        if (!usedDimNames[allDims[d2].name] && dims.length < 5) {
          dims.push(allDims[d2]);
          usedDimNames[allDims[d2].name] = true;
        }
      }

      var meas = [];
      var usedMeasNames = {};

      var m1 = findField(allMeas, config.primaryMeasureOverride);
      if (m1) { meas.push(m1); usedMeasNames[m1.name] = true; }
      else if (allMeas[0]) { meas.push(allMeas[0]); usedMeasNames[allMeas[0].name] = true; }

      var m2 = findField(allMeas, config.comparisonMeasureOverride);
      if (m2 && !usedMeasNames[m2.name]) { meas.push(m2); usedMeasNames[m2.name] = true; }

      // Append remaining measures
      for (var mIdx = 0; mIdx < allMeas.length; mIdx++) {
        if (!usedMeasNames[allMeas[mIdx].name] && meas.length < 4) {
          meas.push(allMeas[mIdx]);
          usedMeasNames[allMeas[mIdx].name] = true;
        }
      }

      var theme = getActiveTheme(config);
      this._container.style.backgroundColor = theme.bg;
      this._container.style.color = theme.text;

      var rowHeight = config.rowDensity === "compact" ? 28 : (config.rowDensity === "relaxed" ? 44 : 36);

      // ==========================================
      // 1. DATA AGGREGATION & HIERARCHICAL TREE ENGINE
      // ==========================================
      var root = {
        id: "__root__",
        name: "Total Organization",
        level: -1,
        isRoot: true,
        children: {},
        measures: {},
        drillLinks: {},
        rowCount: 0
      };

      meas.forEach(function (m) {
        root.measures[m.name] = 0;
      });

      var suppressNulls = Boolean(config.suppressZeroNull);
      var primaryMeasName = meas.length > 0 ? meas[0].name : null;

      for (var i = 0; i < data.length; i++) {
        var row = data[i];

        if (suppressNulls && primaryMeasName) {
          var pVal = row[primaryMeasName] ? Number(row[primaryMeasName].value) : 0;
          if (!pVal || isNaN(pVal)) continue;
        }

        var currentNode = root;
        currentNode.rowCount++;

        meas.forEach(function (m) {
          var val = (row[m.name] && !isNaN(Number(row[m.name].value))) ? Number(row[m.name].value) : 0;
          currentNode.measures[m.name] += val;
        });

        // Traverse each hierarchy tier
        for (var d = 0; d < dims.length; d++) {
          var dim = dims[d];
          var rawVal = row[dim.name] ? String(row[dim.name].value !== null && row[dim.name].value !== undefined ? row[dim.name].value : "Unknown").trim() : "Unknown";
          var nodeId = (currentNode.id === "__root__" ? "" : (currentNode.id + " / ")) + rawVal;

          if (!currentNode.children[rawVal]) {
            currentNode.children[rawVal] = {
              id: nodeId,
              name: rawVal,
              level: d,
              dimensionName: dim.label_short || dim.label || dim.name,
              parent: currentNode,
              children: {},
              measures: {},
              drillLinks: (row[dim.name] && row[dim.name].links) || null,
              rowCount: 0,
              orderIndex: Object.keys(currentNode.children).length
            };
            meas.forEach(function (m) {
              currentNode.children[rawVal].measures[m.name] = 0;
            });
          }

          currentNode = currentNode.children[rawVal];
          currentNode.rowCount++;

          meas.forEach(function (m) {
            var val = (row[m.name] && !isNaN(Number(row[m.name].value))) ? Number(row[m.name].value) : 0;
            currentNode.measures[m.name] += val;
            if (!currentNode.drillLinks && row[m.name] && row[m.name].links) {
              currentNode.drillLinks = row[m.name].links;
            }
          });
        }
      }

      // Compute % of Parent Share
      function computeShares(node) {
        var childList = Object.values(node.children);
        childList.forEach(function (child) {
          child.shares = {};
          meas.forEach(function (m) {
            var parentTotal = node.measures[m.name] || 0;
            var childVal = child.measures[m.name] || 0;
            child.shares[m.name] = parentTotal > 0 ? (childVal / parentTotal) : 0;
          });
          computeShares(child);
        });
      }
      computeShares(root);

      // ==========================================
      // BENCHMARK TARGET CALCULATION
      // ==========================================
      var benchmarkTarget = null;
      var targetMode = config.targetCalculationMode || "none";
      var l1Values = Object.values(root.children).map(function (c) {
        return (primaryMeasName && c.measures[primaryMeasName]) ? c.measures[primaryMeasName] : 0;
      }).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });

      if (targetMode === "fixed_value") {
        benchmarkTarget = Number(config.fixedTargetValue) || 100000;
      } else if (targetMode === "dataset_mean" && l1Values.length > 0) {
        var sum = l1Values.reduce(function (a, b) { return a + b; }, 0);
        benchmarkTarget = sum / l1Values.length;
      } else if (targetMode === "dataset_median" && l1Values.length > 0) {
        var mid = Math.floor(l1Values.length / 2);
        benchmarkTarget = l1Values.length % 2 !== 0 ? l1Values[mid] : (l1Values[mid - 1] + l1Values[mid]) / 2;
      } else if (targetMode === "percentile_p75" && l1Values.length > 0) {
        var idx75 = Math.floor(l1Values.length * 0.75);
        benchmarkTarget = l1Values[Math.min(idx75, l1Values.length - 1)];
      } else if (targetMode === "percentile_p90" && l1Values.length > 0) {
        var idx90 = Math.floor(l1Values.length * 0.90);
        benchmarkTarget = l1Values[Math.min(idx90, l1Values.length - 1)];
      }

      var alertThreshold = Number(config.underperformanceThresholdPct) || 20;
      var isLowerBetter = config.metricPolarity === "lower_is_better";

      // Count meeting target
      var l1MeetingTarget = 0;
      var l1Total = Object.keys(root.children).length;
      if (benchmarkTarget !== null && primaryMeasName) {
        Object.values(root.children).forEach(function (c) {
          var val = c.measures[primaryMeasName] || 0;
          if (isLowerBetter ? (val <= benchmarkTarget) : (val >= benchmarkTarget)) {
            l1MeetingTarget++;
          }
        });
      }

      // Default Expansion Initialization
      var defaultExp = config.defaultExpansion || "level1";
      function initExpansion(node) {
        var childList = Object.values(node.children);
        childList.forEach(function (child) {
          if (self._expandedMap[child.id] === undefined) {
            if (defaultExp === "all") {
              self._expandedMap[child.id] = true;
            } else if (defaultExp === "level2") {
              self._expandedMap[child.id] = child.level <= 1;
            } else {
              self._expandedMap[child.id] = child.level === 0;
            }
          }
          initExpansion(child);
        });
      }
      initExpansion(root);

      // ==========================================
      // 2. HEADER BAR & CONTROLS
      // ==========================================
      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.padding = "10px 16px";
      topBar.style.background = theme.cardBg;
      topBar.style.borderBottom = "1px solid " + theme.border;
      topBar.style.flexShrink = "0";
      topBar.style.gap = "12px";
      topBar.style.flexWrap = "wrap";

      // Hierarchy breadcrumbs / Title
      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "8px";
      leftControls.style.flexWrap = "wrap";

      var customTitleHtml = "";
      if (config.customTitle) {
        customTitleHtml = '<strong style="font-size:13px; color:' + theme.text + ';">' + config.customTitle + '</strong>' +
                          '<span style="color:' + theme.subtext + '; font-size:12px;">|</span>';
      }

      var dimBadges = dims.map(function (d, idx) {
        return '<span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; background:' + theme.badgeBg + '; color:' + theme.badgeText + ';">' +
               'L' + (idx + 1) + ': ' + (d.label_short || d.label || d.name) + '</span>';
      }).join('<span style="color:' + theme.subtext + '; font-size:10px;">&rarr;</span>');

      leftControls.innerHTML =
        '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">' +
          '<span style="font-size:14px;">🗂️</span>' +
          customTitleHtml +
          '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">' + dimBadges + '</div>' +
        '</div>';
      topBar.appendChild(leftControls);

      // Actions: Expand All / Collapse All / Search
      var rightControls = document.createElement("div");
      rightControls.style.display = "flex";
      rightControls.style.alignItems = "center";
      rightControls.style.gap = "8px";

      function createActionButton(text, icon, onClick) {
        var btn = document.createElement("button");
        btn.innerHTML = (icon ? icon + " " : "") + text;
        btn.style.padding = "4px 10px";
        btn.style.fontSize = "11px";
        btn.style.fontWeight = "600";
        btn.style.borderRadius = "6px";
        btn.style.border = "1px solid " + theme.border;
        btn.style.background = theme.bg;
        btn.style.color = theme.text;
        btn.style.cursor = "pointer";
        btn.style.transition = "background 0.15s ease";
        btn.onmouseenter = function () { btn.style.background = theme.rowHover; };
        btn.onmouseleave = function () { btn.style.background = theme.bg; };
        btn.onclick = onClick;
        return btn;
      }

      if (config.layoutMode !== "flat_indented" && config.layoutMode !== "compact_summary") {
        rightControls.appendChild(createActionButton("Expand All", "➕", function () {
          function expandAll(node) {
            Object.values(node.children).forEach(function (c) {
              self._expandedMap[c.id] = true;
              expandAll(c);
            });
          }
          expandAll(root);
          self._renderTableBody();
        }));

        rightControls.appendChild(createActionButton("Collapse All", "➖", function () {
          function collapseAll(node) {
            Object.values(node.children).forEach(function (c) {
              self._expandedMap[c.id] = false;
              collapseAll(c);
            });
          }
          collapseAll(root);
          self._renderTableBody();
        }));
      }

      // Search Box
      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search hierarchy...";
        searchInput.value = self._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "11px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.bg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "150px";

        searchInput.oninput = function () {
          self._searchQuery = searchInput.value.toLowerCase().trim();
          self._renderTableBody();
        };

        rightControls.appendChild(searchInput);
      }

      topBar.appendChild(rightControls);
      this._container.appendChild(topBar);

      // ==========================================
      // 3. EXECUTIVE SUMMARY ROLLUP HUD
      // ==========================================
      var hudMode = config.hudMode || "full";
      if (hudMode !== "hidden" && meas.length > 0) {
        var summaryBar = document.createElement("div");
        summaryBar.style.display = "flex";
        summaryBar.style.alignItems = "center";
        summaryBar.style.gap = hudMode === "compact" ? "12px" : "18px";
        summaryBar.style.padding = hudMode === "compact" ? "6px 16px" : "10px 16px";
        summaryBar.style.background = theme.parentBg;
        summaryBar.style.borderBottom = "1px solid " + theme.border;
        summaryBar.style.fontSize = "11.5px";
        summaryBar.style.flexShrink = "0";
        summaryBar.style.flexWrap = "wrap";

        var kpiItems = [
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Total Depth:</span> ' +
            '<strong style="color:' + theme.accent + ';">' + dims.length + ' Levels</strong>' +
          '</div>',
          '<div>' +
            '<span style="color:' + theme.subtext + ';">Raw Records:</span> ' +
            '<strong>' + root.rowCount.toLocaleString() + '</strong>' +
          '</div>'
        ];

        meas.forEach(function (m, idx) {
          var mVal = root.measures[m.name] || 0;
          var fmt = (idx === 0) ? (config.valueFormat || "compact_currency") : "compact_num";
          kpiItems.push(
            '<div>' +
              '<span style="color:' + theme.subtext + ';">' + (m.label_short || m.label || m.name) + ':</span> ' +
              '<strong style="color:' + theme.text + ';">' + formatValue(mVal, fmt) + '</strong>' +
            '</div>'
          );
        });

        if (benchmarkTarget !== null && hudMode === "full") {
          var refLabel = config.referenceLineLabel || "Benchmark Target";
          var pctOnTarget = l1Total > 0 ? ((l1MeetingTarget / l1Total) * 100).toFixed(0) : 0;
          kpiItems.push(
            '<div>' +
              '<span style="color:' + theme.subtext + ';">' + refLabel + ':</span> ' +
              '<strong style="color:' + theme.accent + ';">' + formatValue(benchmarkTarget, config.valueFormat || "compact_currency") + '</strong>' +
            '</div>',
            '<div>' +
              '<span style="color:' + theme.subtext + ';">On Benchmark:</span> ' +
              '<strong style="color:' + (pctOnTarget >= 60 ? "#10b981" : "#f59e0b") + ';">' + l1MeetingTarget + ' of ' + l1Total + ' (' + pctOnTarget + '%)</strong>' +
            '</div>'
          );
        }

        summaryBar.innerHTML = kpiItems.join('<div style="width:1px; height:14px; background:' + theme.border + ';"></div>');
        this._container.appendChild(summaryBar);
      }

      // ==========================================
      // 4. TABLE VIEWPORT & DOM
      // ==========================================
      var tableScrollWrapper = document.createElement("div");
      tableScrollWrapper.style.flex = "1 1 0";
      tableScrollWrapper.style.overflowY = "auto";
      tableScrollWrapper.style.overflowX = "auto";
      tableScrollWrapper.style.position = "relative";

      var table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = config.rowDensity === "compact" ? "11px" : (config.rowDensity === "relaxed" ? "13px" : "12px");
      table.style.textAlign = "left";

      // THEAD (Sticky Header)
      var thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.zIndex = "5";
      thead.style.background = theme.headerBg;
      thead.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";

      var headerRow = document.createElement("tr");
      headerRow.style.borderBottom = "2px solid " + theme.border;

      // Tree Column Header
      var thTree = document.createElement("th");
      thTree.style.padding = "10px 16px";
      thTree.style.color = theme.headerText;
      thTree.style.fontWeight = "700";
      thTree.style.minWidth = "300px";
      thTree.textContent = "Hierarchy (" + dims.map(function (d) { return d.label_short || d.label || d.name; }).join(" \u2192 ") + ")";
      headerRow.appendChild(thTree);

      // Measure Column Headers
      meas.forEach(function (m) {
        var th = document.createElement("th");
        th.style.padding = "10px 16px";
        th.style.color = theme.headerText;
        th.style.fontWeight = "700";
        th.style.textAlign = "right";
        th.style.minWidth = "130px";
        th.textContent = m.label_short || m.label || m.name;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // TBODY
      var tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableScrollWrapper.appendChild(table);
      this._container.appendChild(tableScrollWrapper);

      // ==========================================
      // 5. RECURSIVE VISIBILITY & RENDER LOGIC
      // ==========================================
      this._renderTableBody = function () {
        tbody.innerHTML = "";
        var visibleRows = [];
        var maxValues = {};
        meas.forEach(function (m) {
          maxValues[m.name] = root.measures[m.name] || 1;
        });

        var searchActive = Boolean(self._searchQuery);

        // Helper to check if node or any descendant matches search
        function branchMatchesSearch(node, query) {
          if (node.name.toLowerCase().indexOf(query) !== -1) return true;
          var children = Object.values(node.children);
          for (var c = 0; c < children.length; c++) {
            if (branchMatchesSearch(children[c], query)) return true;
          }
          return false;
        }

        var sortMode = config.sortOrder || "metric_desc";
        var topNSetting = config.topNBranches || "all";
        var topNLimit = topNSetting === "all" ? 999999 : parseInt(topNSetting, 10);
        var doOtherRollup = Boolean(config.enableOtherRollup);

        // Helper to traverse and collect visible rows
        function collectRows(node) {
          var rawChildren = Object.values(node.children);

          // Sorting
          if (sortMode === "metric_desc" && primaryMeasName) {
            rawChildren.sort(function (a, b) {
              return (b.measures[primaryMeasName] || 0) - (a.measures[primaryMeasName] || 0);
            });
          } else if (sortMode === "metric_asc" && primaryMeasName) {
            rawChildren.sort(function (a, b) {
              return (a.measures[primaryMeasName] || 0) - (b.measures[primaryMeasName] || 0);
            });
          } else if (sortMode === "alphabetical") {
            rawChildren.sort(function (a, b) {
              return a.name.localeCompare(b.name);
            });
          } else {
            // natural
            rawChildren.sort(function (a, b) {
              return (a.orderIndex || 0) - (b.orderIndex || 0);
            });
          }

          var children = rawChildren;
          if (rawChildren.length > topNLimit) {
            children = rawChildren.slice(0, topNLimit);
            if (doOtherRollup) {
              var tail = rawChildren.slice(topNLimit);
              var otherNode = {
                id: node.id + " / __other__",
                name: "Other (" + tail.length + " remaining)",
                level: (node.level || 0) + 1,
                isOther: true,
                parent: node,
                children: {},
                measures: {},
                shares: {},
                drillLinks: null,
                rowCount: 0
              };
              meas.forEach(function (m) {
                otherNode.measures[m.name] = 0;
                tail.forEach(function (t) {
                  otherNode.measures[m.name] += (t.measures[m.name] || 0);
                  otherNode.rowCount += (t.rowCount || 0);
                });
                var pTot = node.measures[m.name] || 0;
                otherNode.shares[m.name] = pTot > 0 ? (otherNode.measures[m.name] / pTot) : 0;
              });
              children.push(otherNode);
            }
          }

          children.forEach(function (child) {
            var hasChildren = Object.keys(child.children).length > 0;
            var isExpanded = Boolean(self._expandedMap[child.id]);

            if (searchActive) {
              if (!branchMatchesSearch(child, self._searchQuery)) return;
              isExpanded = true;
            }

            if (config.layoutMode === "compact_summary" && child.level > 0) {
              return;
            }

            visibleRows.push({
              node: child,
              hasChildren: hasChildren,
              isExpanded: isExpanded
            });

            if (hasChildren && (isExpanded || config.layoutMode === "flat_indented")) {
              collectRows(child);
            }
          });
        }

        collectRows(root);

        if (visibleRows.length === 0) {
          var emptyTr = document.createElement("tr");
          var emptyTd = document.createElement("td");
          emptyTd.colSpan = 1 + meas.length;
          emptyTd.style.padding = "30px";
          emptyTd.style.textAlign = "center";
          emptyTd.style.color = theme.subtext;
          emptyTd.innerHTML = '🔍 No matching hierarchy nodes found for "<strong>' + self._searchQuery + '</strong>".';
          emptyTr.appendChild(emptyTd);
          tbody.appendChild(emptyTr);
          return;
        }

        // Render each visible row
        visibleRows.forEach(function (item, rIdx) {
          var node = item.node;
          var hasChildren = item.hasChildren;
          var isExpanded = item.isExpanded;

          var tr = document.createElement("tr");
          tr.style.height = rowHeight + "px";
          tr.style.borderBottom = "1px solid " + theme.border;
          tr.style.background = (node.level === 0 && hasChildren) ? theme.parentBg : (rIdx % 2 === 1 ? theme.rowAlt : theme.bg);
          tr.style.transition = "background 0.12s ease";

          tr.onmouseenter = function () { tr.style.background = theme.rowHover; };
          tr.onmouseleave = function () {
            tr.style.background = (node.level === 0 && hasChildren) ? theme.parentBg : (rIdx % 2 === 1 ? theme.rowAlt : theme.bg);
          };

          // 1. Hierarchy Tree Cell
          var tdTree = document.createElement("td");
          tdTree.style.padding = "4px 16px";
          tdTree.style.verticalAlign = "middle";

          var cellContent = document.createElement("div");
          cellContent.style.display = "flex";
          cellContent.style.alignItems = "center";
          cellContent.style.gap = "8px";
          cellContent.style.paddingLeft = (node.level * 22) + "px";

          // Expand / Collapse Chevron
          if (hasChildren && config.layoutMode !== "flat_indented" && config.layoutMode !== "compact_summary") {
            var toggleBtn = document.createElement("span");
            toggleBtn.innerHTML = isExpanded ? "▼" : "▶";
            toggleBtn.style.fontSize = "10px";
            toggleBtn.style.width = "18px";
            toggleBtn.style.height = "18px";
            toggleBtn.style.display = "inline-flex";
            toggleBtn.style.alignItems = "center";
            toggleBtn.style.justifyContent = "center";
            toggleBtn.style.borderRadius = "4px";
            toggleBtn.style.cursor = "pointer";
            toggleBtn.style.color = theme.accent;
            toggleBtn.style.background = theme.badgeBg;
            toggleBtn.style.userSelect = "none";

            toggleBtn.onclick = function (e) {
              e.stopPropagation();
              self._expandedMap[node.id] = !self._expandedMap[node.id];
              self._renderTableBody();
            };
            cellContent.appendChild(toggleBtn);
          } else {
            var spacer = document.createElement("span");
            spacer.innerHTML = node.isOther ? "⋯" : (hasChildren ? "📁" : "•");
            spacer.style.width = "18px";
            spacer.style.textAlign = "center";
            spacer.style.color = theme.subtext;
            spacer.style.fontSize = hasChildren ? "12px" : "15px";
            cellContent.appendChild(spacer);
          }

          // Node Name Label
          var nameSpan = document.createElement("span");
          nameSpan.style.fontWeight = (hasChildren || node.level === 0) ? "700" : "500";
          nameSpan.style.color = node.isOther ? theme.subtext : theme.text;
          nameSpan.style.cursor = hasChildren ? "pointer" : "default";

          if (self._searchQuery && node.name.toLowerCase().indexOf(self._searchQuery) !== -1) {
            nameSpan.innerHTML = node.name.replace(new RegExp("(" + self._searchQuery + ")", "gi"), '<mark style="background:#fde047; padding:0 2px; border-radius:2px;">$1</mark>');
          } else {
            nameSpan.textContent = node.name;
          }

          if (hasChildren && config.layoutMode !== "flat_indented" && config.layoutMode !== "compact_summary") {
            nameSpan.onclick = function () {
              self._expandedMap[node.id] = !self._expandedMap[node.id];
              self._renderTableBody();
            };
          }

          cellContent.appendChild(nameSpan);

          // Sub-item count badge
          if (hasChildren) {
            var countBadge = document.createElement("span");
            countBadge.style.fontSize = "10px";
            countBadge.style.padding = "1px 6px";
            countBadge.style.borderRadius = "10px";
            countBadge.style.background = theme.badgeBg;
            countBadge.style.color = theme.subtext;
            countBadge.textContent = Object.keys(node.children).length + " items";
            cellContent.appendChild(countBadge);
          }

          // Anomaly / Underperformance Alert Badge (if benchmark target active)
          if (benchmarkTarget !== null && primaryMeasName && !node.isOther && node.level === 0) {
            var pVal = node.measures[primaryMeasName] || 0;
            var isUnder = isLowerBetter ? (pVal > benchmarkTarget * (1 + alertThreshold / 100)) : (pVal < benchmarkTarget * (1 - alertThreshold / 100));
            if (isUnder) {
              var alertBadge = document.createElement("span");
              alertBadge.style.fontSize = "9.5px";
              alertBadge.style.fontWeight = "600";
              alertBadge.style.padding = "1px 5px";
              alertBadge.style.borderRadius = "4px";
              alertBadge.style.background = "rgba(239, 68, 68, 0.12)";
              alertBadge.style.color = "#dc2626";
              alertBadge.textContent = "⚠️ Gap";
              alertBadge.title = "Underperforms benchmark target (" + formatValue(benchmarkTarget, config.valueFormat || "compact_currency") + ")";
              cellContent.appendChild(alertBadge);
            }
          }

          tdTree.appendChild(cellContent);
          tr.appendChild(tdTree);

          // 2. Measure Value Cells
          meas.forEach(function (m, mIdx) {
            var tdMeas = document.createElement("td");
            tdMeas.style.padding = "4px 16px";
            tdMeas.style.textAlign = "right";
            tdMeas.style.verticalAlign = "middle";
            tdMeas.style.position = "relative";

            var mVal = node.measures[m.name] || 0;
            var fmt = (mIdx === 0) ? (config.valueFormat || "compact_currency") : "compact_num";
            var formattedVal = formatValue(mVal, fmt);

            var pctParent = node.shares && node.shares[m.name] ? (node.shares[m.name] * 100).toFixed(1) + "%" : "";
            var shareOfMax = maxValues[m.name] > 0 ? Math.min(1.0, mVal / maxValues[m.name]) : 0;

            // Optional In-cell progress bar
            if (config.showBars !== false) {
              var barWrapper = document.createElement("div");
              barWrapper.style.position = "absolute";
              barWrapper.style.right = "8px";
              barWrapper.style.bottom = "3px";
              barWrapper.style.left = "8px";
              barWrapper.style.height = "3px";
              barWrapper.style.background = "transparent";

              var barFill = document.createElement("div");
              barFill.style.height = "100%";
              barFill.style.width = (shareOfMax * 100) + "%";
              barFill.style.background = theme.barFill;
              barFill.style.borderRadius = "2px";
              barWrapper.appendChild(barFill);
              tdMeas.appendChild(barWrapper);
            }

            var valContainer = document.createElement("div");
            valContainer.style.display = "flex";
            valContainer.style.alignItems = "baseline";
            valContainer.style.justifyContent = "flex-end";
            valContainer.style.gap = "6px";
            valContainer.style.position = "relative";
            valContainer.style.zIndex = "2";

            var valSpan = document.createElement("span");
            valSpan.style.fontWeight = (hasChildren || node.level === 0) ? "700" : "500";
            valSpan.style.color = theme.text;
            valSpan.textContent = formattedVal;
            valContainer.appendChild(valSpan);

            // % Share of Parent
            if (config.showPercentShare !== false && node.level > 0 && pctParent) {
              var pctSpan = document.createElement("span");
              pctSpan.style.fontSize = "10.5px";
              pctSpan.style.color = theme.subtext;
              pctSpan.textContent = "(" + pctParent + ")";
              valContainer.appendChild(pctSpan);
            }

            // Drill Down Link
            if (node.drillLinks) {
              valSpan.style.cursor = "pointer";
              valSpan.style.textDecoration = "underline dotted";
              valSpan.title = "Click to drill down in Looker";
              valSpan.onclick = function (e) {
                if (window.LookerCharts && LookerCharts.Utils) {
                  LookerCharts.Utils.openDrillMenu({
                    links: node.drillLinks,
                    event: e
                  });
                }
              };
            }

            tdMeas.appendChild(valContainer);
            tr.appendChild(tdMeas);
          });

          tbody.appendChild(tr);
        });
      };

      this._renderTableBody();
    }
  });
})();
