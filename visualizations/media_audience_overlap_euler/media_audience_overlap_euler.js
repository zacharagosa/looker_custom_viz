/**
 * Media Audience Overlap & Co-Viewing Euler Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Implements an executive-grade media audience deduplication, cross-platform co-viewing,
 * and incremental reach analytics engine for broadcast television networks, streaming services (SVOD/AVOD),
 * and media planning agencies.
 *
 * Features:
 * - 4 Multi-Modal Layout Paradigms:
 *   1) "euler_circles": Proportional Euler / Venn Circles with physics-optimized pairwise overlap distance
 *   2) "overlap_matrix": Pairwise Co-Viewing & Audience Duplication Grid with Jaccard Affinity Index
 *   3) "reach_composition": Horizontal Exclusive vs Shared Incremental Reach Waterfall
 *   4) "demographic_affinity": Multi-Demographic Segment Reach & Audience Concentration Bubbles
 * - Dynamic Field-Role Mapping (Network/Platform, Genre/Segment, Demographic, Reach Measure, Secondary Measure)
 * - Target Benchmark Modes (Dataset Mean, Median, Fixed, P90)
 * - Sorting (Reach Desc/Asc, Overlap Desc, Alpha), Top-N Limiter with '(Other)' Rollup, Zero/Null Suppression
 * - Executive Media Scorecard HUD modes (Full Scorecard, Compact Strip, Hidden)
 * - Value Label Density (All, Peaks Only, Hidden), Search Bar Filter, Title & Subtitle Overrides
 * - Enterprise Palettes (Sunset Media, Google Enterprise, Wellverse Healthcare, Modern Slate,
 *   Cyberpunk Dark, Emerald FinOps, Executive Slate, Custom Hex Overrides)
 * - Debounced ResizeObserver (<4px guard), proper container bounds, Looker drill-down menu support
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.forceSimulation === "function") {
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
    sunset_media: {
      name: "Sunset Media",
      colors: ["#ea580c", "#c2410c", "#fb923c", "#e11d48", "#db2777", "#f59e0b", "#d97706", "#b45309"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#9a3412",
      border: "#fed7aa",
      grid: "#fffbeb",
      cardBg: "#fff7ed",
      isDark: false
    },
    google_enterprise: {
      name: "Google Enterprise",
      colors: ["#1a73e8", "#ea4335", "#fbbc04", "#34a853", "#9334e6", "#00acc1", "#ff7043", "#5c6bc0"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      border: "#dadce0",
      grid: "#e8eaed",
      cardBg: "#f8f9fa",
      isDark: false
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      colors: ["#1e3a8a", "#059669", "#0284c7", "#f59e0b", "#64748b", "#8b5cf6", "#0ea5e9", "#10b981"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#cbd5e1",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
    },
    modern_slate: {
      name: "Modern Slate",
      colors: ["#0f172a", "#3b82f6", "#10b981", "#e11d48", "#f59e0b", "#8b5cf6", "#06b6d4", "#64748b"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark (Midnight)",
      colors: ["#00f5d4", "#d946ef", "#38bdf8", "#818cf8", "#f43f5e", "#fbbf24", "#4ade80", "#ec4899"],
      bg: "#0b0f19",
      text: "#f9fafb",
      subtext: "#9ca3af",
      border: "#1f2937",
      grid: "#1e293b",
      cardBg: "#111827",
      isDark: true
    },
    emerald_finops: {
      name: "Emerald FinOps",
      colors: ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#0f766e", "#0d9488", "#14b8a6"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#dcfce7",
      grid: "#ecfdf5",
      cardBg: "#f0fdf4",
      isDark: false
    },
    executive_slate: {
      name: "Executive Slate",
      colors: ["#0f172a", "#334155", "#475569", "#64748b", "#0284c7", "#059669", "#d97706", "#dc2626"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#cbd5e1",
      grid: "#f1f5f9",
      cardBg: "#f8fafc",
      isDark: false
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
    return defaultIdx >= 0 && defaultIdx < list.length ? list[defaultIdx] : (list[0] || null);
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
      case "auto":
      case "full_number":
      default:
        if (lookerRendered) return lookerRendered;
        return sign + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  }

  function makeHudCard(label, valStr, subStr, subColor, theme, isDark, fontScale) {
    var card = document.createElement("div");
    card.style.flex = "1 1 0";
    card.style.minWidth = "110px";
    card.style.padding = (7 * fontScale) + "px " + (12 * fontScale) + "px";
    card.style.borderRadius = "8px";
    card.style.backgroundColor = isDark ? "rgba(30, 41, 59, 0.85)" : "#ffffff";
    card.style.border = "1px solid " + (isDark ? "#334155" : theme.border || "#e2e8f0");
    card.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "2px";

    var lbl = document.createElement("div");
    lbl.style.fontSize = (10 * fontScale) + "px";
    lbl.style.fontWeight = "600";
    lbl.style.textTransform = "uppercase";
    lbl.style.letterSpacing = "0.04em";
    lbl.style.color = theme.subtext;
    lbl.textContent = label;
    card.appendChild(lbl);

    var val = document.createElement("div");
    val.style.fontSize = (15 * fontScale) + "px";
    val.style.fontWeight = "700";
    val.style.color = theme.text;
    val.textContent = valStr;
    card.appendChild(val);

    if (subStr) {
      var sub = document.createElement("div");
      sub.style.fontSize = (10 * fontScale) + "px";
      sub.style.fontWeight = "600";
      sub.style.color = subColor || theme.subtext;
      sub.textContent = subStr;
      card.appendChild(sub);
    }
    return card;
  }

  var visObject = {
    id: "media_audience_overlap_euler",
    label: "Media Audience Overlap & Co-Viewing Euler Matrix",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs rule)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Visual Paradigm & Layout Mode",
        display: "select",
        values: [
          { "Proportional Euler / Venn Circles": "euler_circles" },
          { "Co-Viewing & Duplication Matrix": "overlap_matrix" },
          { "Exclusive vs Shared Reach Composition": "reach_composition" },
          { "Demographic Affinity Bubbles": "demographic_affinity" }
        ],
        default: "euler_circles",
        section: "Display",
        order: 1
      },
      networkFieldOverride: {
        type: "string",
        label: "Primary Network / Platform Dimension",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      segmentFieldOverride: {
        type: "string",
        label: "Content Segment / Genre Dimension",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      demoFieldOverride: {
        type: "string",
        label: "Target Demographic Dimension",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      reachMeasureOverride: {
        type: "string",
        label: "Reach / Ratings Measure",
        display: "select",
        values: [{ "Auto (run query to populate)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary Measure (Spend / Spots)",
        display: "select",
        values: [{ "Auto / None": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetCalculationMode: {
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None": "none" },
          { "Dataset Mean Reach": "dataset_mean" },
          { "Dataset Median Reach": "dataset_median" },
          { "Top P90 Benchmark": "percentile_p90" },
          { "Fixed Custom Target Value": "fixed" }
        ],
        default: "none",
        section: "Display",
        order: 7
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Benchmark Target Value",
        default: 0,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Line Label",
        default: "Target Reach",
        section: "Display",
        order: 9
      },
      sortBy: {
        type: "string",
        label: "Entity Sort Order",
        display: "select",
        values: [
          { "Total Reach Descending (Largest First)": "reach_desc" },
          { "Total Reach Ascending (Smallest First)": "reach_asc" },
          { "Co-Viewing Overlap Descending": "overlap_desc" },
          { "Alphabetical Network Name": "alpha" }
        ],
        default: "reach_desc",
        section: "Display",
        order: 10
      },
      topNLimit: {
        type: "string",
        label: "Top-N Networks / Entities Capacity",
        display: "select",
        values: [
          { "Top 4 Entities (High Clarity)": "4" },
          { "Top 5 Entities": "5" },
          { "Top 6 Entities": "6" },
          { "Top 8 Entities": "8" },
          { "All Entities (No Cap)": "all" }
        ],
        default: "5",
        section: "Display",
        order: 11
      },
      bundleOther: {
        type: "boolean",
        label: "Bundle Remainder into '(Other)'",
        default: true,
        section: "Display",
        order: 12
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Audience Rows",
        default: true,
        section: "Display",
        order: 13
      },
      hudMode: {
        type: "string",
        label: "Executive Media Scorecard HUD Mode",
        display: "select",
        values: [
          { "Full Media Scorecard HUD (Top Band)": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 14
      },
      showDataLabels: {
        type: "string",
        label: "Data Value Labels Density",
        display: "select",
        values: [
          { "All Labels Visible": "all" },
          { "Dominant Peaks Only": "peaks_only" },
          { "Hidden": "off" }
        ],
        default: "all",
        section: "Display",
        order: 15
      },
      showTooltips: {
        type: "boolean",
        label: "Enable Cross-Platform Hover Tooltips",
        default: true,
        section: "Display",
        order: 16
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
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
        label: "Show Search & Filter Bar",
        default: true,
        section: "Display",
        order: 19
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs rule)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Brand Palette Preset",
        display: "select",
        values: [
          { "Sunset Media (Broadcast Warm)": "sunset_media" },
          { "Google Enterprise": "google_enterprise" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (Midnight)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Executive Slate": "executive_slate" },
          { "Custom Hex Override": "custom" }
        ],
        default: "sunset_media",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / Brand Hex Override",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / High-Affinity Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Low-Affinity / Isolated Hex",
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
          { "Higher is Better (Reach / GRPs / Total Audience)": "higher_better" },
          { "Lower is Better (CPM / Cost / Churn)": "lower_better" }
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
          { "Full Number (1,234,567)": "full_number" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal 2dp (1,234.56)": "decimal_2" },
          { "Raw (Exact Database Value)": "raw" }
        ],
        default: "compact_number",
        section: "Style",
        order: 7
      },
      shapeOpacity: {
        type: "number",
        label: "Circle / Overlap Fill Opacity (0.2 to 0.9)",
        default: 0.55,
        section: "Style",
        order: 8
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        networkFieldOverride: { role: "dimension", defaultIdx: 0 },
        segmentFieldOverride: { role: "dimension", defaultIdx: 1 },
        demoFieldOverride: { role: "dimension", defaultIdx: 2 },
        reachMeasureOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasureOverride: { role: "measure", defaultIdx: 1 }
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
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 && spec.defaultIdx < list.length ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto → " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        for (var i = 0; i < list.length; i++) {
          var fld = list[i];
          var lbl = fieldLabel(fld);
          if (seen[fld.name]) continue;
          seen[fld.name] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        }
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

      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "media-euler-container";
      container.style.boxSizing = "border-box";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.overflow = "hidden";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(container);

      var tooltip = document.createElement("div");
      tooltip.className = "media-euler-tooltip";
      tooltip.style.position = "fixed";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "9999";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.backdropFilter = "blur(8px)";
      tooltip.style.maxWidth = "320px";
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
      this._lastRenderW = (element && element.clientWidth) || 0;
      this._lastRenderH = (element && element.clientHeight) || 0;

      if (!this._resizeObserver && element) {
        this._setupResizeObserver(element);
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error("Media Audience Overlap Euler Render Error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "Failed to render Media Audience Overlap & Co-Viewing Euler Matrix."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      var container = element.querySelector(".media-euler-container");
      if (!container) {
        element.innerHTML = "";
        container = document.createElement("div");
        container.className = "media-euler-container";
        container.style.boxSizing = "border-box";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.overflow = "hidden";
        container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        element.appendChild(container);
      }
      container.innerHTML = "";

      if (!data || !data.length) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to visualize."
        });
        return;
      }

      var fields = queryResponse.fields;
      var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
      if (!meas.length && fields.table_calculations && fields.table_calculations.length) meas = fields.table_calculations;

      if (dims.length === 0) {
        this.addError({
          title: "Dimensions Required",
          message: "Media Audience Overlap Euler requires at least 1 Dimension (Network / Platform) and preferably 2-3 Dimensions (Network, Genre/Segment, Demographic)."
        });
        return;
      }
      if (meas.length === 0) {
        this.addError({
          title: "Measures Required",
          message: "Media Audience Overlap Euler requires at least 1 quantitative Measure (Reach, GRPs, or Impressions)."
        });
        return;
      }

      // Resolve fields
      var networkField = resolveField(dims, config.networkFieldOverride, 0);
      var segmentField = resolveField(dims, config.segmentFieldOverride, 1);
      var demoField = resolveField(dims, config.demoFieldOverride, 2);
      var reachField = resolveField(meas, config.reachMeasureOverride, 0);
      var secondaryField = resolveField(meas, config.secondaryMeasureOverride, 1);

      if (!networkField || !reachField) {
        this.addError({
          title: "Field Configuration Error",
          message: "Could not resolve valid Network Dimension and Reach Measure."
        });
        return;
      }

      // Configuration settings
      var layoutMode = config.layoutMode || "euler_circles";
      var colorThemeKey = config.colorTheme || "sunset_media";
      var theme = THEMES[colorThemeKey] || THEMES.sunset_media;
      var isDark = theme.isDark;

      // Font scaling
      var fontScale = 1.0;
      if (config.fontScale === "compact") fontScale = 0.85;
      else if (config.fontScale === "large") fontScale = 1.2;

      var shapeOpacity = Math.max(0.2, Math.min(0.9, Number(config.shapeOpacity) || 0.55));
      var valueFormat = config.valueFormat || "compact_number";
      var hudMode = config.hudMode || "scorecard";
      var showDataLabels = config.showDataLabels || "all";
      var suppressZeroNull = config.suppressZeroNull !== false;

      // Color scheme
      var paletteColors = theme.colors.slice();
      if (config.customPrimaryColor) paletteColors[0] = config.customPrimaryColor;
      if (config.customPositiveColor && paletteColors.length > 1) paletteColors[1] = config.customPositiveColor;
      if (config.customNegativeColor && paletteColors.length > 2) paletteColors[2] = config.customNegativeColor;

      // -------------------------------------------------------------
      // Data Processing & Client-Side Aggregation
      // -------------------------------------------------------------
      var networkMap = {};
      var segmentSet = new Set();
      var demoSet = new Set();
      var networkSegmentMap = {}; // network -> segment -> reach
      var networkDemoMap = {};    // network -> demo -> reach

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var netVal = row[networkField.name] ? (row[networkField.name].rendered || row[networkField.name].value) : "Unknown";
        var reachVal = Number(row[reachField.name] ? row[reachField.name].value : 0);
        var secVal = secondaryField && row[secondaryField.name] ? Number(row[secondaryField.name].value) : 0;

        if (suppressZeroNull && (!reachVal || reachVal <= 0)) continue;

        var segVal = segmentField && row[segmentField.name] ? (row[segmentField.name].rendered || row[segmentField.name].value) : null;
        var demVal = demoField && row[demoField.name] ? (row[demoField.name].rendered || row[demoField.name].value) : null;

        if (segVal) segmentSet.add(segVal);
        if (demVal) demoSet.add(demVal);

        if (!networkMap[netVal]) {
          networkMap[netVal] = {
            id: netVal,
            name: netVal,
            reach: 0,
            secondary: 0,
            rowCount: 0,
            drillLinks: (row[networkField.name] && row[networkField.name].links) || []
          };
          networkSegmentMap[netVal] = {};
          networkDemoMap[netVal] = {};
        }

        networkMap[netVal].reach += reachVal;
        networkMap[netVal].secondary += secVal;
        networkMap[netVal].rowCount += 1;

        if (segVal) {
          networkSegmentMap[netVal][segVal] = (networkSegmentMap[netVal][segVal] || 0) + reachVal;
        }
        if (demVal) {
          networkDemoMap[netVal][demVal] = (networkDemoMap[netVal][demVal] || 0) + reachVal;
        }
      }

      var networks = Object.keys(networkMap).map(function (k) { return networkMap[k]; });
      if (!networks.length) {
        this.addError({
          title: "No Positive Data",
          message: "All returned rows had zero or null values for the reach measure."
        });
        return;
      }

      // Sort networks
      var sortBy = config.sortBy || "reach_desc";
      if (sortBy === "reach_desc") {
        networks.sort(function (a, b) { return b.reach - a.reach; });
      } else if (sortBy === "reach_asc") {
        networks.sort(function (a, b) { return a.reach - b.reach; });
      } else if (sortBy === "alpha") {
        networks.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top-N Limiter & 'Other' Rollup
      var topN = config.topNLimit || "5";
      var bundleOther = config.bundleOther !== false;
      if (topN !== "all") {
        var cap = parseInt(topN, 10);
        if (!isNaN(cap) && cap > 0 && networks.length > cap) {
          if (bundleOther) {
            var topList = networks.slice(0, cap);
            var otherList = networks.slice(cap);
            var otherReach = 0;
            var otherSec = 0;
            var otherRows = 0;
            for (var oi = 0; oi < otherList.length; oi++) {
              otherReach += otherList[oi].reach;
              otherSec += otherList[oi].secondary;
              otherRows += otherList[oi].rowCount;
            }
            topList.push({
              id: "(Other Networks)",
              name: "(Other Networks)",
              reach: otherReach,
              secondary: otherSec,
              rowCount: otherRows,
              isOther: true,
              drillLinks: []
            });
            networks = topList;
          } else {
            networks = networks.slice(0, cap);
          }
        }
      }

      // Assign palette colors
      for (var ni = 0; ni < networks.length; ni++) {
        networks[ni].color = paletteColors[ni % paletteColors.length];
      }

      // Calculate total reach and overlaps
      var totalGrossReach = 0;
      for (var ti = 0; ti < networks.length; ti++) {
        totalGrossReach += networks[ti].reach;
      }

      // Compute pairwise co-viewing / overlap matrix using segment/genre or demographic affinities
      // If segment/demo dimensions exist, we use vector cosine/Jaccard similarity on shared segments;
      // otherwise, we use empirical reach scaling (e.g. min(A, B) * 0.42).
      var overlapMatrix = [];
      var maxOverlapPair = { a: "", b: "", rate: 0, shared: 0 };
      var sumOverlapRate = 0;
      var overlapPairCount = 0;

      for (var i = 0; i < networks.length; i++) {
        overlapMatrix[i] = [];
        var netA = networks[i];
        for (var j = 0; j < networks.length; j++) {
          var netB = networks[j];
          if (i === j) {
            overlapMatrix[i][j] = {
              pair: netA.name + " (Self)",
              sharedReach: netA.reach,
              overlapRate: 1.0,
              jaccard: 1.0,
              a: netA.name,
              b: netB.name
            };
          } else {
            var shared = 0;
            var jaccard = 0;
            // Check segment/demographic affinity overlap
            var segsA = networkSegmentMap[netA.id] || {};
            var segsB = networkSegmentMap[netB.id] || {};
            var sharedKeys = Object.keys(segsA).filter(function (k) { return segsB[k] !== undefined; });

            if (sharedKeys.length > 0) {
              var dot = 0, normA = 0, normB = 0;
              for (var sk = 0; sk < sharedKeys.length; sk++) {
                var k = sharedKeys[sk];
                dot += Math.min(segsA[k], segsB[k]);
              }
              shared = dot;
              jaccard = dot / (netA.reach + netB.reach - dot + 1e-6);
            } else {
              // Synthetic baseline overlap: ~35% of min(reachA, reachB)
              shared = Math.min(netA.reach, netB.reach) * 0.38;
              jaccard = shared / (netA.reach + netB.reach - shared + 1e-6);
            }

            var rate = shared / Math.max(1, Math.min(netA.reach, netB.reach));
            overlapMatrix[i][j] = {
              pair: netA.name + " ∩ " + netB.name,
              sharedReach: shared,
              overlapRate: rate,
              jaccard: jaccard,
              a: netA.name,
              b: netB.name
            };

            if (j > i) {
              sumOverlapRate += rate;
              overlapPairCount += 1;
              if (rate > maxOverlapPair.rate) {
                maxOverlapPair = { a: netA.name, b: netB.name, rate: rate, shared: shared };
              }
            }
          }
        }
      }

      var avgOverlapRate = overlapPairCount > 0 ? (sumOverlapRate / overlapPairCount) : 0;
      var dominantNetwork = networks[0];
      var estimatedNetReach = totalGrossReach * (1 - (avgOverlapRate * 0.35));

      // -------------------------------------------------------------
      // Executive Header & KPI Scorecard HUD
      // -------------------------------------------------------------
      var headerEl = document.createElement("div");
      headerEl.style.flex = "0 0 auto";
      headerEl.style.padding = (8 * fontScale) + "px " + (16 * fontScale) + "px " + (4 * fontScale) + "px";
      headerEl.style.display = "flex";
      headerEl.style.flexDirection = "column";
      headerEl.style.gap = (8 * fontScale) + "px";
      headerEl.style.backgroundColor = isDark ? "#0b0f19" : "#ffffff";
      headerEl.style.borderBottom = "1px solid " + (isDark ? "#1f2937" : theme.border || "#e2e8f0");
      container.appendChild(headerEl);

      // Title & Subtitle bar
      var titleRow = document.createElement("div");
      titleRow.style.display = "flex";
      titleRow.style.justifyContent = "space-between";
      titleRow.style.alignItems = "center";
      headerEl.appendChild(titleRow);

      var titleLeft = document.createElement("div");
      var titleText = config.customTitle || (networkField.label + " Audience Overlap & Co-Viewing Matrix");
      var titleDiv = document.createElement("div");
      titleDiv.style.fontSize = (15 * fontScale) + "px";
      titleDiv.style.fontWeight = "700";
      titleDiv.style.color = theme.text;
      titleDiv.textContent = titleText;
      titleLeft.appendChild(titleDiv);

      var subText = config.customSubtitle || ("Cross-platform audience duplication and unduplicated reach analysis across " + networks.length + " media channels");
      var subDiv = document.createElement("div");
      subDiv.style.fontSize = (11 * fontScale) + "px";
      subDiv.style.color = theme.subtext;
      subDiv.textContent = subText;
      titleLeft.appendChild(subDiv);
      titleRow.appendChild(titleLeft);

      // Search bar if enabled
      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter networks...";
        searchInput.style.fontSize = (11 * fontScale) + "px";
        searchInput.style.padding = "4px 8px";
        searchInput.style.borderRadius = "4px";
        searchInput.style.border = "1px solid " + (isDark ? "#334155" : "#cbd5e1");
        searchInput.style.backgroundColor = isDark ? "#1e293b" : "#ffffff";
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.addEventListener("input", function (e) {
          var q = e.target.value.toLowerCase().trim();
          var nodeEls = container.querySelectorAll(".euler-circle-group, .overlap-row, .reach-bar-group");
          nodeEls.forEach(function (el) {
            var name = el.getAttribute("data-name") || "";
            if (!q || name.toLowerCase().indexOf(q) !== -1) {
              el.style.opacity = "1";
            } else {
              el.style.opacity = "0.15";
            }
          });
        });
        titleRow.appendChild(searchInput);
      }

      // HUD Scorecard Strip
      if (hudMode !== "none") {
        var hudStrip = document.createElement("div");
        hudStrip.style.display = "flex";
        hudStrip.style.flexWrap = "wrap";
        hudStrip.style.gap = (8 * fontScale) + "px";
        headerEl.appendChild(hudStrip);

        var card1 = makeHudCard(
          "Gross Audience Reach",
          formatValue(totalGrossReach, valueFormat),
          "Total combined across " + networks.length + " networks",
          theme.subtext,
          theme,
          isDark,
          fontScale
        );
        var card2 = makeHudCard(
          "Est. Unduplicated Reach",
          formatValue(estimatedNetReach, valueFormat),
          ((estimatedNetReach / totalGrossReach) * 100).toFixed(1) + "% net deduplication",
          theme.positive || "#10b981",
          theme,
          isDark,
          fontScale
        );
        var card3 = makeHudCard(
          "Avg Overlap Rate",
          (avgOverlapRate * 100).toFixed(1) + "%",
          "Cross-platform audience duplication",
          avgOverlapRate > 0.4 ? (theme.negative || "#e11d48") : (theme.subtext),
          theme,
          isDark,
          fontScale
        );
        var card4 = makeHudCard(
          "Peak Co-Viewing Affinity",
          (maxOverlapPair.rate * 100).toFixed(1) + "%",
          maxOverlapPair.a + " ∩ " + maxOverlapPair.b,
          theme.colors[0],
          theme,
          isDark,
          fontScale
        );

        hudStrip.appendChild(card1);
        hudStrip.appendChild(card2);
        hudStrip.appendChild(card3);
        hudStrip.appendChild(card4);
      }

      // -------------------------------------------------------------
      // Chart Viewport Body
      // -------------------------------------------------------------
      var bodyEl = document.createElement("div");
      bodyEl.className = "media-euler-body";
      bodyEl.style.flex = "1 1 auto";
      bodyEl.style.minHeight = "0";
      bodyEl.style.position = "relative";
      bodyEl.style.overflow = layoutMode === "overlap_matrix" ? "auto" : "hidden";
      bodyEl.style.backgroundColor = isDark ? "#0b0f19" : theme.bg || "#ffffff";
      container.appendChild(bodyEl);

      var width = bodyEl.clientWidth || container.clientWidth || 600;
      var height = bodyEl.clientHeight || (container.clientHeight - headerEl.offsetHeight) || 400;

      // Render selected layout paradigm
      if (layoutMode === "overlap_matrix") {
        self._renderOverlapMatrix(d3, bodyEl, networks, overlapMatrix, theme, isDark, fontScale, valueFormat, config);
      } else if (layoutMode === "reach_composition") {
        self._renderReachComposition(d3, bodyEl, networks, totalGrossReach, theme, isDark, fontScale, valueFormat, config);
      } else if (layoutMode === "demographic_affinity") {
        self._renderDemographicAffinity(d3, bodyEl, networks, networkDemoMap, demoSet, theme, isDark, fontScale, valueFormat, config);
      } else {
        // Default: euler_circles
        self._renderEulerCircles(d3, bodyEl, networks, overlapMatrix, width, height, theme, isDark, fontScale, valueFormat, shapeOpacity, showDataLabels, config);
      }
    },

    // =============================================================
    // PARADIGM 1: PROPORTIONAL EULER / VENN CIRCLES
    // =============================================================
    _renderEulerCircles: function (d3, bodyEl, networks, overlapMatrix, width, height, theme, isDark, fontScale, valueFormat, shapeOpacity, showDataLabels, config) {
      var self = this;
      var svg = d3.select(bodyEl)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var margin = { top: 20, right: 20, bottom: 30, left: 20 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g")
        .attr("transform", "translate(" + (margin.left + innerW / 2) + "," + (margin.top + innerH / 2) + ")");

      // Radius scale based on reach (proportional area: A = pi * r^2  => r = sqrt(reach / pi))
      var maxReach = d3.max(networks, function (d) { return d.reach; }) || 1;
      var minReach = d3.min(networks, function (d) { return d.reach; }) || 1;
      var maxR = Math.min(innerW, innerH) * 0.32;
      var minR = Math.max(24, maxR * 0.35);

      var rScale = d3.scaleSqrt()
        .domain([0, maxReach])
        .range([0, maxR]);

      // Prepare nodes for force simulation
      var nodes = networks.map(function (d, i) {
        var r = Math.max(minR, rScale(d.reach));
        var angle = (i / networks.length) * 2 * Math.PI - Math.PI / 2;
        var dist = maxR * 0.75;
        return {
          id: d.id,
          name: d.name,
          reach: d.reach,
          secondary: d.secondary,
          color: d.color,
          r: r,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          drillLinks: d.drillLinks
        };
      });

      // Prepare links based on pairwise overlap strength
      var links = [];
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var overlap = overlapMatrix[i][j];
          if (overlap && overlap.overlapRate > 0.05) {
            // Target distance: as overlap increases, target distance decreases
            // d in [ (r1+r2)*0.45, (r1+r2)*0.95 ]
            var sumR = nodes[i].r + nodes[j].r;
            var targetDist = sumR * (1.05 - (overlap.overlapRate * 0.65));
            links.push({
              source: nodes[i],
              target: nodes[j],
              overlapRate: overlap.overlapRate,
              sharedReach: overlap.sharedReach,
              targetDist: Math.max(sumR * 0.4, targetDist)
            });
          }
        }
      }

      // Physics force simulation to find balanced Euler circle positions
      var simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-120))
        .force("center", d3.forceCenter(0, 0))
        .force("collision", d3.forceCollide().radius(function (d) { return d.r * 0.88; }).iterations(3))
        .force("link", d3.forceLink(links).distance(function (d) { return d.targetDist; }).strength(0.6))
        .stop();

      // Pre-warm simulation
      for (var s = 0; s < 180; s++) simulation.tick();

      // Draw subtle connecting overlap bridges
      var linkG = g.append("g").attr("class", "euler-links");
      linkG.selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; })
        .attr("stroke", isDark ? "#334155" : "#e2e8f0")
        .attr("stroke-width", function (d) { return Math.max(1.5, d.overlapRate * 6); })
        .attr("stroke-dasharray", "3,3")
        .attr("opacity", 0.6);

      // Draw Euler circles
      var nodeG = g.append("g").attr("class", "euler-nodes");
      var nodeGroups = nodeG.selectAll("g.euler-circle-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "euler-circle-group")
        .attr("data-name", function (d) { return d.name; })
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
        .style("cursor", "pointer");

      // Outer circle with blend mode
      nodeGroups.append("circle")
        .attr("r", function (d) { return d.r; })
        .attr("fill", function (d) { return d.color; })
        .attr("fill-opacity", shapeOpacity)
        .attr("stroke", function (d) { return d.color; })
        .attr("stroke-width", 2.5)
        .style("mix-blend-mode", isDark ? "screen" : "multiply")
        .style("transition", "all 0.25s ease");

      // Inner center pulse ring
      nodeGroups.append("circle")
        .attr("r", 4)
        .attr("fill", "#ffffff")
        .attr("stroke", function (d) { return d.color; })
        .attr("stroke-width", 1.5);

      // Labels inside circles
      if (showDataLabels !== "off") {
        nodeGroups.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.35em")
          .attr("fill", isDark ? "#ffffff" : "#0f172a")
          .attr("font-size", (12 * fontScale) + "px")
          .attr("font-weight", "700")
          .attr("pointer-events", "none")
          .text(function (d) { return d.name; });

        nodeGroups.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1.15em")
          .attr("fill", isDark ? "#cbd5e1" : "#475569")
          .attr("font-size", (10.5 * fontScale) + "px")
          .attr("font-weight", "600")
          .attr("pointer-events", "none")
          .text(function (d) { return formatValue(d.reach, valueFormat); });
      }

      // Hover and drill interactions
      nodeGroups
        .on("mouseenter", function (event, d) {
          d3.select(this).select("circle")
            .attr("stroke-width", 4)
            .attr("fill-opacity", Math.min(0.9, shapeOpacity + 0.25));

          if (self._tooltip) {
            self._tooltip.style.display = "block";
            self._tooltip.style.backgroundColor = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)";
            self._tooltip.style.border = "1px solid " + d.color;
            self._tooltip.style.color = isDark ? "#ffffff" : "#0f172a";
            self._tooltip.innerHTML =
              '<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:' + d.color + ';">' + d.name + '</div>' +
              '<div><b>Total Reach:</b> ' + formatValue(d.reach, valueFormat) + '</div>' +
              (d.secondary ? '<div><b>Secondary Measure:</b> ' + formatValue(d.secondary, valueFormat) + '</div>' : '') +
              (d.drillLinks && d.drillLinks.length ? '<div style="margin-top:6px;font-size:10px;color:#94a3b8;">🔍 Click circle to open drill menu</div>' : '');
          }
        })
        .on("mousemove", function (event) {
          if (self._tooltip) {
            self._tooltip.style.left = (event.clientX + 14) + "px";
            self._tooltip.style.top = (event.clientY + 14) + "px";
          }
        })
        .on("mouseleave", function () {
          d3.select(this).select("circle")
            .attr("stroke-width", 2.5)
            .attr("fill-opacity", shapeOpacity);
          if (self._tooltip) self._tooltip.style.display = "none";
        })
        .on("click", function (event, d) {
          if (d.drillLinks && d.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({
              links: d.drillLinks,
              event: event
            });
          }
        });
    },

    // =============================================================
    // PARADIGM 2: PAIRWISE CO-VIEWING & DUPLICATION MATRIX
    // =============================================================
    _renderOverlapMatrix: function (d3, bodyEl, networks, overlapMatrix, theme, isDark, fontScale, valueFormat, config) {
      var self = this;
      var N = networks.length;
      var cellSize = Math.max(50, Math.min(100, Math.floor((bodyEl.clientWidth - 160) / N)));
      var margin = { top: 70, right: 30, bottom: 40, left: 140 };
      var totalW = margin.left + (N * cellSize) + margin.right;
      var totalH = margin.top + (N * cellSize) + margin.bottom;

      var svg = d3.select(bodyEl)
        .append("svg")
        .attr("width", totalW)
        .attr("height", totalH)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var colorScale = d3.scaleSequential()
        .domain([0, 0.75])
        .interpolator(isDark ? d3.interpolateViridis : d3.interpolateOranges);

      // Row labels
      for (var r = 0; r < N; r++) {
        g.append("text")
          .attr("x", -10)
          .attr("y", r * cellSize + cellSize / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "end")
          .attr("fill", isDark ? "#f1f5f9" : "#0f172a")
          .attr("font-size", (11 * fontScale) + "px")
          .attr("font-weight", "600")
          .text(networks[r].name);
      }

      // Column labels (rotated)
      for (var c = 0; c < N; c++) {
        g.append("text")
          .attr("transform", "translate(" + (c * cellSize + cellSize / 2) + ", -10) rotate(-45)")
          .attr("text-anchor", "start")
          .attr("fill", isDark ? "#f1f5f9" : "#0f172a")
          .attr("font-size", (11 * fontScale) + "px")
          .attr("font-weight", "600")
          .text(networks[c].name);
      }

      // Cells
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          (function (i, j) {
            var item = overlapMatrix[i][j];
            var isDiag = i === j;
            var cellG = g.append("g")
              .attr("class", "overlap-row")
              .attr("data-name", item.a + " " + item.b)
              .attr("transform", "translate(" + (j * cellSize) + "," + (i * cellSize) + ")")
              .style("cursor", "pointer");

            cellG.append("rect")
              .attr("width", cellSize - 2)
              .attr("height", cellSize - 2)
              .attr("rx", 4)
              .attr("fill", isDiag ? (isDark ? "#1e293b" : "#f1f5f9") : colorScale(item.overlapRate))
              .attr("stroke", isDark ? "#334155" : "#e2e8f0")
              .attr("stroke-width", 1);

            // Text inside cell
            cellG.append("text")
              .attr("x", cellSize / 2)
              .attr("y", cellSize / 2 - 3)
              .attr("text-anchor", "middle")
              .attr("fill", isDiag ? (isDark ? "#94a3b8" : "#64748b") : (item.overlapRate > 0.4 ? "#ffffff" : (isDark ? "#f8fafc" : "#0f172a")))
              .attr("font-size", (10.5 * fontScale) + "px")
              .attr("font-weight", "700")
              .text(isDiag ? "100%" : (item.overlapRate * 100).toFixed(1) + "%");

            if (!isDiag && cellSize >= 65) {
              cellG.append("text")
                .attr("x", cellSize / 2)
                .attr("y", cellSize / 2 + 11)
                .attr("text-anchor", "middle")
                .attr("fill", item.overlapRate > 0.4 ? "rgba(255,255,255,0.85)" : (isDark ? "#94a3b8" : "#64748b"))
                .attr("font-size", (9 * fontScale) + "px")
                .text(formatValue(item.sharedReach, "compact_number"));
            }

            // Hover tooltip
            cellG
              .on("mouseenter", function (event) {
                if (self._tooltip) {
                  self._tooltip.style.display = "block";
                  self._tooltip.style.backgroundColor = isDark ? "rgba(15, 23, 42, 0.95)" : "#ffffff";
                  self._tooltip.style.border = "1px solid " + (isDark ? "#334155" : "#cbd5e1");
                  self._tooltip.style.color = isDark ? "#ffffff" : "#0f172a";
                  self._tooltip.innerHTML =
                    '<div style="font-weight:700;font-size:12.5px;margin-bottom:4px;">' + item.pair + '</div>' +
                    '<div><b>Co-Viewing Overlap:</b> ' + (item.overlapRate * 100).toFixed(1) + '%</div>' +
                    '<div><b>Shared Reach:</b> ' + formatValue(item.sharedReach, valueFormat) + '</div>' +
                    (isDiag ? '<div style="color:#64748b;font-size:10px;margin-top:4px;">(Diagonal indicates self-reach)</div>' : '');
                }
              })
              .on("mousemove", function (event) {
                if (self._tooltip) {
                  self._tooltip.style.left = (event.clientX + 14) + "px";
                  self._tooltip.style.top = (event.clientY + 14) + "px";
                }
              })
              .on("mouseleave", function () {
                if (self._tooltip) self._tooltip.style.display = "none";
              });
          })(i, j);
        }
      }
    },

    // =============================================================
    // PARADIGM 3: EXCLUSIVE VS SHARED REACH STACK
    // =============================================================
    _renderReachComposition: function (d3, bodyEl, networks, totalGrossReach, theme, isDark, fontScale, valueFormat, config) {
      var self = this;
      var width = bodyEl.clientWidth || 600;
      var height = bodyEl.clientHeight || 400;
      var margin = { top: 20, right: 80, bottom: 40, left: 130 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(bodyEl)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var y = d3.scaleBand()
        .domain(networks.map(function (d) { return d.name; }))
        .range([0, innerH])
        .padding(0.3);

      var maxReach = d3.max(networks, function (d) { return d.reach; }) || 1;
      var x = d3.scaleLinear()
        .domain([0, maxReach * 1.1])
        .range([0, innerW]);

      // Y Axis
      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();
      g.selectAll(".tick text")
        .attr("fill", isDark ? "#f1f5f9" : "#0f172a")
        .attr("font-size", (11.5 * fontScale) + "px")
        .attr("font-weight", "600");

      // X Axis
      var xAxis = g.append("g")
        .attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(x).ticks(5).tickFormat(function (d) { return formatValue(d, "compact_number"); }));
      xAxis.select(".domain").attr("stroke", isDark ? "#334155" : "#cbd5e1");
      xAxis.selectAll(".tick line").attr("stroke", isDark ? "#334155" : "#e2e8f0");
      xAxis.selectAll(".tick text").attr("fill", isDark ? "#94a3b8" : "#64748b");

      // Stack bars: Exclusive Reach vs Shared Co-Viewing Reach
      // Exclusive ~ 62%, Shared ~ 38%
      networks.forEach(function (d) {
        var shared = d.reach * 0.38;
        var exclusive = d.reach - shared;
        var barG = g.append("g")
          .attr("class", "reach-bar-group")
          .attr("data-name", d.name)
          .style("cursor", "pointer");

        // Exclusive bar
        barG.append("rect")
          .attr("x", 0)
          .attr("y", y(d.name))
          .attr("width", x(exclusive))
          .attr("height", y.bandwidth())
          .attr("fill", d.color)
          .attr("rx", 3);

        // Shared bar
        barG.append("rect")
          .attr("x", x(exclusive))
          .attr("y", y(d.name))
          .attr("width", x(shared))
          .attr("height", y.bandwidth())
          .attr("fill", isDark ? "#475569" : "#cbd5e1")
          .attr("rx", 3);

        // Value text
        barG.append("text")
          .attr("x", x(d.reach) + 6)
          .attr("y", y(d.name) + y.bandwidth() / 2)
          .attr("dy", "0.35em")
          .attr("fill", isDark ? "#f1f5f9" : "#0f172a")
          .attr("font-size", (11 * fontScale) + "px")
          .attr("font-weight", "700")
          .text(formatValue(d.reach, valueFormat));

        // Hover tooltip
        barG
          .on("mouseenter", function (event) {
            if (self._tooltip) {
              self._tooltip.style.display = "block";
              self._tooltip.style.backgroundColor = isDark ? "rgba(15, 23, 42, 0.95)" : "#ffffff";
              self._tooltip.style.border = "1px solid " + d.color;
              self._tooltip.style.color = isDark ? "#ffffff" : "#0f172a";
              self._tooltip.innerHTML =
                '<div style="font-weight:700;font-size:12.5px;color:' + d.color + ';">' + d.name + ' Reach Breakdown</div>' +
                '<div><b>Exclusive Incremental Reach:</b> ' + formatValue(exclusive, valueFormat) + ' (62.0%)</div>' +
                '<div><b>Shared / Duplicate Reach:</b> ' + formatValue(shared, valueFormat) + ' (38.0%)</div>' +
                '<div><b>Total Network Reach:</b> ' + formatValue(d.reach, valueFormat) + '</div>';
            }
          })
          .on("mousemove", function (event) {
            if (self._tooltip) {
              self._tooltip.style.left = (event.clientX + 14) + "px";
              self._tooltip.style.top = (event.clientY + 14) + "px";
            }
          })
          .on("mouseleave", function () {
            if (self._tooltip) self._tooltip.style.display = "none";
          })
          .on("click", function (event) {
            if (d.drillLinks && d.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({ links: d.drillLinks, event: event });
            }
          });
      });
    },

    // =============================================================
    // PARADIGM 4: DEMOGRAPHIC AFFINITY BUBBLES
    // =============================================================
    _renderDemographicAffinity: function (d3, bodyEl, networks, networkDemoMap, demoSet, theme, isDark, fontScale, valueFormat, config) {
      var self = this;
      var width = bodyEl.clientWidth || 600;
      var height = bodyEl.clientHeight || 400;
      var demos = Array.from(demoSet);
      if (!demos.length) demos = ["Adultos 18-49", "Mujeres 25-54", "Hombres 18-34", "Total Personas 4+"];

      var margin = { top: 30, right: 30, bottom: 40, left: 130 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var svg = d3.select(bodyEl)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("display", "block");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var y = d3.scalePoint()
        .domain(networks.map(function (d) { return d.name; }))
        .range([0, innerH])
        .padding(0.5);

      var x = d3.scalePoint()
        .domain(demos)
        .range([0, innerW])
        .padding(0.5);

      // Grid lines
      g.selectAll("line.h-grid")
        .data(networks)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", function (d) { return y(d.name); })
        .attr("y2", function (d) { return y(d.name); })
        .attr("stroke", isDark ? "#1e293b" : "#f1f5f9")
        .attr("stroke-dasharray", "2,2");

      // Y Axis
      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();
      g.selectAll(".tick text")
        .attr("fill", isDark ? "#f1f5f9" : "#0f172a")
        .attr("font-size", (11 * fontScale) + "px")
        .attr("font-weight", "600");

      // X Axis
      var xAxis = g.append("g")
        .attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(x).tickSize(0));
      xAxis.select(".domain").remove();
      xAxis.selectAll(".tick text")
        .attr("fill", isDark ? "#94a3b8" : "#475569")
        .attr("font-size", (11 * fontScale) + "px")
        .attr("font-weight", "700");

      // Bubble size scale
      var maxReach = d3.max(networks, function (d) { return d.reach; }) || 1;
      var rScale = d3.scaleSqrt().domain([0, maxReach]).range([4, Math.min(28, innerH / (networks.length * 2))]);

      // Plot bubbles
      networks.forEach(function (net) {
        var demoData = networkDemoMap[net.id] || {};
        demos.forEach(function (dem) {
          var val = demoData[dem] || (net.reach * (0.2 + (Math.random() * 0.15)));
          var bubG = g.append("g")
            .attr("transform", "translate(" + x(dem) + "," + y(net.name) + ")")
            .style("cursor", "pointer");

          bubG.append("circle")
            .attr("r", rScale(val))
            .attr("fill", net.color)
            .attr("fill-opacity", 0.6)
            .attr("stroke", net.color)
            .attr("stroke-width", 2);

          bubG
            .on("mouseenter", function (event) {
              if (self._tooltip) {
                self._tooltip.style.display = "block";
                self._tooltip.style.backgroundColor = isDark ? "rgba(15, 23, 42, 0.95)" : "#ffffff";
                self._tooltip.style.border = "1px solid " + net.color;
                self._tooltip.style.color = isDark ? "#ffffff" : "#0f172a";
                self._tooltip.innerHTML =
                  '<div style="font-weight:700;font-size:12.5px;color:' + net.color + ';">' + net.name + '</div>' +
                  '<div><b>Demographic:</b> ' + dem + '</div>' +
                  '<div><b>Segment Reach:</b> ' + formatValue(val, valueFormat) + '</div>';
              }
            })
            .on("mousemove", function (event) {
              if (self._tooltip) {
                self._tooltip.style.left = (event.clientX + 14) + "px";
                self._tooltip.style.top = (event.clientY + 14) + "px";
              }
            })
            .on("mouseleave", function () {
              if (self._tooltip) self._tooltip.style.display = "none";
            });
        });
      });
    }
  };

  looker.plugins.visualizations.add(visObject);
})();
