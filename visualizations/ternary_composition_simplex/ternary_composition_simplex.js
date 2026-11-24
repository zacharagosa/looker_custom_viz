/**
 * Ternary 3-Component Composition Simplex Plot
 * Looker Custom Visualization
 * Built with D3.js v7 (Barycentric Equilateral Simplex + Clipped 2D KDE Contours)
 *
 * Visual Paradigm:
 * - True equilateral triangle barycentric coordinate system plotting 3-part
 *   compositions summing to 100% (pA + pB + pC = 1.0).
 * - Supports both:
 *     (A) 3 separate numeric measures (e.g. PvE, PvP, Social playtime share)
 *     (B) 1 numeric measure pivoted across a 3-category dimension (e.g. GCP, AWS, Microsoft)
 * - 4 Display Modes:
 *     1. 'scatter_contours' : Barycentric scatter + clipped 2D KDE density contours (default)
 *     2. 'scatter_only'     : Clean barycentric scatter / bubble plot (+ optional convex hulls)
 *     3. 'density_heatmap'  : Filled topographic KDE density bands + cluster centroids
 *     4. 'centroids_hulls'  : Category mean centroids + convex hull envelopes
 * - Chart-first minimalism: 90%+ viewport dedicated to the simplex geometry by default
 *   (optional compact summary strip hidden by default).
 * - Strict 2-tab option hierarchy ('Display' and 'Style') with dynamic query-driven
 *   field-role dropdowns via Looker `registerOptions`, debounced ResizeObserver (<4px guard),
 *   XSS-safe `escapeHtml`, guarded `clearErrors`/`addError`, and `LookerCharts.Utils.openDrillMenu`.
 */

(function () {
  var PALETTES = {
    google_enterprise: ["#1a73e8", "#0d9488", "#ea8600", "#d93025", "#8e24aa", "#65a30d", "#0284c7", "#475569"],
    nature_scientific: ["#3b4992", "#ee0000", "#008b45", "#631879", "#008280", "#bb0021", "#5f559b", "#a20056"],
    okabe_ito: ["#0072b2", "#e69f00", "#009e73", "#d55e00", "#cc79a7", "#56b4e9", "#f0e442", "#333333"],
    modern_slate: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"],
    sunset_media: ["#f97316", "#e11d48", "#7c3aed", "#0284c7", "#059669", "#d97706", "#db2777", "#4f46e5"],
    viridis: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725", "#355f8d", "#482475"]
  };

  var THEMES = {
    publication_light: {
      isDark: false,
      bg: "#ffffff",
      simplexFill: "#fafbfc",
      edgeStroke: "#334155",
      gridStroke: "#e2e8f0",
      gridMinor: "#f1f5f9",
      text: "#0f172a",
      subtext: "#64748b",
      axisLabel: "#1e293b",
      contourBase: "#2563eb",
      contourStroke: "rgba(30, 64, 175, 0.28)",
      guideStroke: "#475569",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      pointStroke: "#ffffff"
    },
    warm_ivory: {
      isDark: false,
      bg: "#fcfbf7",
      simplexFill: "#f7f4ec",
      edgeStroke: "#292524",
      gridStroke: "#e7e5e4",
      gridMinor: "#f5f5f4",
      text: "#1c1917",
      subtext: "#78716c",
      axisLabel: "#292524",
      contourBase: "#0f766e",
      contourStroke: "rgba(15, 118, 110, 0.30)",
      guideStroke: "#57534e",
      cardBg: "#f5f5f4",
      border: "#d6d3d1",
      pointStroke: "#fcfbf7"
    },
    slate_dark: {
      isDark: true,
      bg: "#0b1120",
      simplexFill: "#111827",
      edgeStroke: "#94a3b8",
      gridStroke: "#1e293b",
      gridMinor: "#172033",
      text: "#f8fafc",
      subtext: "#94a3b8",
      axisLabel: "#e2e8f0",
      contourBase: "#38bdf8",
      contourStroke: "rgba(56, 189, 248, 0.36)",
      guideStroke: "#cbd5e1",
      cardBg: "#1e293b",
      border: "#334155",
      pointStroke: "#0b1120"
    }
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCompact(val, fmt) {
    if (val === null || val === undefined || !isFinite(val)) return "—";
    if (fmt === "percent") return (val * 100).toFixed(1) + "%";
    var abs = Math.abs(val);
    var prefix = fmt === "currency" ? "$" : "";
    if (abs >= 1e9) return prefix + (val / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return prefix + (val / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return prefix + (val / 1e3).toFixed(1) + "K";
    if (abs === 0) return prefix + "0";
    if (abs < 10) return prefix + val.toFixed(2);
    return prefix + Math.round(val).toLocaleString();
  }

  function resolveField(list, overrideVal, fallbackIdx) {
    if (!list || !list.length) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
      var target = String(overrideVal).trim();
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (f.name === target || f.label === target || f.label_short === target) return f;
      }
      var idx = parseInt(target, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= list.length) return list[idx - 1];
    }
    if (fallbackIdx >= 0 && fallbackIdx < list.length) return list[fallbackIdx];
    return null;
  }

  function extractScalar(row, fieldName, pivots) {
    if (!row || !fieldName || !row[fieldName]) return { value: null, rendered: null, links: [] };
    var cell = row[fieldName];
    if (typeof cell === "number") return { value: cell, rendered: String(cell), links: [] };
    if (cell && typeof cell === "object" && "value" in cell) {
      var v = cell.value;
      var num = (v === null || v === undefined || v === "") ? null : Number(v);
      return {
        value: isFinite(num) ? num : null,
        rendered: cell.rendered || null,
        links: Array.isArray(cell.links) ? cell.links : []
      };
    }
    // Pivoted measure used as scalar (e.g. bubble size): sum across pivots
    if (cell && typeof cell === "object" && pivots && pivots.length) {
      var sum = 0;
      var hasAny = false;
      var allLinks = [];
      for (var i = 0; i < pivots.length; i++) {
        var pk = pivots[i].key;
        var pCell = resolvePivotCell(cell, pk, pivots[i]);
        if (pCell && pCell.value !== null && pCell.value !== undefined && pCell.value !== "") {
          var pv = Number(pCell.value);
          if (isFinite(pv)) {
            sum += pv;
            hasAny = true;
          }
        }
        if (pCell && Array.isArray(pCell.links)) {
          allLinks = allLinks.concat(pCell.links);
        }
      }
      return { value: hasAny ? sum : null, rendered: null, links: allLinks };
    }
    return { value: null, rendered: null, links: [] };
  }

  function resolvePivotCell(measureObj, pivotKey, pivotObj) {
    if (!measureObj || typeof measureObj !== "object") return null;
    if (pivotKey in measureObj) {
      var direct = measureObj[pivotKey];
      if (direct && typeof direct === "object" && ("value" in direct)) return direct;
      if (typeof direct === "number" || direct === null) return { value: direct };
    }
    // Fallback for nested json_detail shape: row[measure][pivot_dim][pivot_key]
    var keys = Object.keys(measureObj);
    for (var i = 0; i < keys.length; i++) {
      var inner = measureObj[keys[i]];
      if (inner && typeof inner === "object" && (pivotKey in inner)) {
        var nested = inner[pivotKey];
        if (nested && typeof nested === "object" && ("value" in nested)) return nested;
        if (typeof nested === "number" || nested === null) return { value: nested };
      }
    }
    return null;
  }

  function collectRowLinks(row, fields, pivots) {
    var seen = {};
    var out = [];
    function pushLinks(arr) {
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        var lnk = arr[i];
        var key = (lnk.url || "") + "|" + (lnk.label || "");
        if (!seen[key]) {
          seen[key] = true;
          out.push(lnk);
        }
      }
    }
    var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
    var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);
    dims.forEach(function (d) {
      var c = row[d.name];
      if (c && Array.isArray(c.links)) pushLinks(c.links);
    });
    meas.forEach(function (m) {
      var c = row[m.name];
      if (!c) return;
      if (Array.isArray(c.links)) pushLinks(c.links);
      if (pivots && pivots.length) {
        pivots.forEach(function (p) {
          var pc = resolvePivotCell(c, p.key, p);
          if (pc && Array.isArray(pc.links)) pushLinks(pc.links);
        });
      }
    });
    return out;
  }

  function shortLabel(fld) {
    if (!fld) return "";
    return fld.label_short || fld.label || fld.name || "";
  }

  looker.plugins.visualizations.add({
    id: "ternary_composition_simplex",
    label: "Ternary 3-Component Composition Simplex Plot",
    options: {
      // ================================================================
      // TAB 1: DISPLAY (Data mapping, geometry mode, contours & labels)
      // ================================================================
      displayMode: {
        type: "string",
        label: "Display Mode",
        display: "select",
        values: [
          { "Scatter + KDE Contours": "scatter_contours" },
          { "Scatter / Bubble Simplex": "scatter_only" },
          { "KDE Density Topography": "density_heatmap" },
          { "Cluster Centroids & Hulls": "centroids_hulls" }
        ],
        default: "scatter_contours",
        section: "Display",
        order: 1
      },
      dimLabelOverride: {
        type: "string",
        label: "Observation Label Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      dimGroupOverride: {
        type: "string",
        label: "Color Group / Cluster Dimension",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      measureAOverride: {
        type: "string",
        label: "Top Apex Measure (or Pivoted Metric)",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      measureBOverride: {
        type: "string",
        label: "Bottom-Left Apex Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      measureCOverride: {
        type: "string",
        label: "Bottom-Right Apex Measure",
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      sizeMeasureOverride: {
        type: "string",
        label: "Point Size Measure (Optional)",
        display: "select",
        values: [{ "Auto / Uniform Size": "" }],
        default: "",
        section: "Display",
        order: 7
      },
      showDensityContours: {
        type: "boolean",
        label: "Show 2D KDE Density Contours",
        default: true,
        section: "Display",
        order: 8
      },
      contourBandwidth: {
        type: "string",
        label: "KDE Smoothing Bandwidth",
        display: "select",
        values: [
          { "Tight (Fine Clusters)": "tight" },
          { "Balanced (Default)": "medium" },
          { "Smooth (Broad Density)": "broad" }
        ],
        default: "medium",
        section: "Display",
        order: 9
      },
      showClusterHulls: {
        type: "boolean",
        label: "Show Group Convex Hulls & Centroids",
        default: false,
        section: "Display",
        order: 10
      },
      showCentroidGuide: {
        type: "boolean",
        label: "Show 33.3% Parity Crosshair",
        default: true,
        section: "Display",
        order: 11
      },
      gridStep: {
        type: "string",
        label: "Grid & Tick Interval",
        display: "select",
        values: [
          { "20% Increments (Clean)": "20" },
          { "10% Increments (Detailed)": "10" },
          { "25% Quarters": "25" }
        ],
        default: "20",
        section: "Display",
        order: 12
      },
      labelDensity: {
        type: "string",
        label: "Point & Centroid Labels",
        display: "select",
        values: [
          { "Group Centroids Only": "centroids" },
          { "Extreme / Apex Outliers": "extremes" },
          { "None (Hover Tooltip Only)": "none" }
        ],
        default: "centroids",
        section: "Display",
        order: 13
      },
      showLegend: {
        type: "boolean",
        label: "Show Interactive Group Legend",
        default: true,
        section: "Display",
        order: 14
      },
      hudMode: {
        type: "string",
        label: "Summary Strip (Chart-First Default Hidden)",
        display: "select",
        values: [
          { "Hidden (90%+ Pure Chart Canvas)": "hidden" },
          { "Compact Inline Footer": "compact" }
        ],
        default: "hidden",
        section: "Display",
        order: 15
      },

      // ================================================================
      // TAB 2: STYLE (Theme, palette, point geometry & typography)
      // ================================================================
      colorTheme: {
        type: "string",
        label: "Canvas Theme",
        display: "select",
        values: [
          { "Publication Light": "publication_light" },
          { "Warm Ivory Paper": "warm_ivory" },
          { "Slate Dark": "slate_dark" }
        ],
        default: "publication_light",
        section: "Style",
        order: 1
      },
      colorPalette: {
        type: "string",
        label: "Categorical Palette",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Nature Scientific": "nature_scientific" },
          { "Okabe-Ito Colorblind Safe": "okabe_ito" },
          { "Modern Slate": "modern_slate" },
          { "Sunset Media": "sunset_media" },
          { "Viridis": "viridis" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 2
      },
      pointRadius: {
        type: "number",
        label: "Base Point Radius (px)",
        default: 5,
        min: 2,
        max: 14,
        section: "Style",
        order: 3
      },
      pointOpacity: {
        type: "number",
        label: "Point Fill Opacity (0.1 - 1.0)",
        default: 0.78,
        min: 0.1,
        max: 1.0,
        step: 0.05,
        section: "Style",
        order: 4
      },
      valueFormat: {
        type: "string",
        label: "Raw Value Format (Tooltips)",
        display: "select",
        values: [
          { "Auto / Compact Number": "compact" },
          { "Currency ($)": "currency" },
          { "Percentage": "percent" }
        ],
        default: "compact",
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
          { "Large": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      customChartTitle: {
        type: "string",
        label: "Optional Minimal Caption (Top-Left)",
        default: "",
        section: "Style",
        order: 7
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;
      var pivots = queryResponse.pivots || [];

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" +
        meas.map(function (m) { return m.name; }).join("|") + "::" +
        pivots.map(function (p) { return p.key; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      var isPivoted3 = pivots.length >= 3 && meas.length >= 1;
      var ROLE_SPECS = {
        dimLabelOverride: { role: "dimension", defaultIdx: 0 },
        dimGroupOverride: { role: "dimension", defaultIdx: dims.length > 1 ? 1 : -1 },
        measureAOverride: { role: "measure", defaultIdx: 0 },
        measureBOverride: { role: "measure", defaultIdx: isPivoted3 ? -1 : 1 },
        measureCOverride: { role: "measure", defaultIdx: isPivoted3 ? -1 : 2 },
        sizeMeasureOverride: { role: "measure", defaultIdx: -1 }
      };

      Object.keys(ROLE_SPECS).forEach(function (key) {
        var spec = ROLE_SPECS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : dims;
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel;
        if (isPivoted3 && (key === "measureBOverride" || key === "measureCOverride")) {
          var pIdx = key === "measureBOverride" ? 1 : 2;
          autoLabel = "Auto (Pivot: " + (pivots[pIdx] ? pivots[pIdx].key : "Series") + ")";
        } else if (key === "sizeMeasureOverride") {
          autoLabel = "Uniform Size (None)";
        } else {
          autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
        }
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
      var self = this;
      // Never set element.style.width/height to "100%" — Looker manages explicit pixel dimensions + 10px margins
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Helvetica, Arial, sans-serif";
      element.innerHTML = "";

      var root = document.createElement("div");
      root.className = "tcs-root";
      root.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;box-sizing:border-box;";
      element.appendChild(root);

      var canvasWrap = document.createElement("div");
      canvasWrap.className = "tcs-canvas-wrap";
      canvasWrap.style.cssText = "flex:1 1 0;min-height:0;min-width:0;position:relative;overflow:hidden;";
      root.appendChild(canvasWrap);

      var footerEl = document.createElement("div");
      footerEl.className = "tcs-footer";
      footerEl.style.cssText = "flex:0 0 auto;display:none;";
      root.appendChild(footerEl);

      var tooltip = document.createElement("div");
      tooltip.className = "tcs-tooltip";
      tooltip.style.cssText = "position:fixed;pointer-events:none;opacity:0;z-index:9999;transition:opacity 0.1s ease;" +
        "border-radius:8px;padding:9px 11px;font-size:12px;line-height:1.42;max-width:290px;" +
        "box-shadow:0 10px 26px rgba(15,23,42,0.18);";
      document.body.appendChild(tooltip);

      self._root = root;
      self._canvasWrap = canvasWrap;
      self._footerEl = footerEl;
      self._tooltip = tooltip;
      self._isolatedGroup = null;
      self._uid = "tcs_" + Math.random().toString(36).slice(2, 9);

      self._lastSize = { w: 0, h: 0 };
      if (typeof ResizeObserver !== "undefined") {
        self._ro = new ResizeObserver(function () {
          var w = element.clientWidth;
          var h = element.clientHeight;
          if (Math.abs(w - self._lastSize.w) < 4 && Math.abs(h - self._lastSize.h) < 4) return;
          if (self._resizeTimer) clearTimeout(self._resizeTimer);
          self._resizeTimer = setTimeout(function () {
            if (self._lastData && self._lastConfig && self._lastQueryResponse) {
              self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
            }
          }, 80);
        });
        self._ro.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      self._registerDynamicFieldOptions(queryResponse);
      self._lastData = data;
      self._lastConfig = config;
      self._lastQueryResponse = queryResponse;
      self._lastDetails = details;

      if (self.clearErrors) try { self.clearErrors(); } catch (e) {}

      function finish() {
        if (typeof done === "function") done();
      }

      if (typeof d3 === "undefined") {
        if (self.addError) try { self.addError({ title: "Missing D3.js", message: "D3.js v7 library failed to load." }); } catch (e) {}
        finish();
        return;
      }

      var wrap = self._canvasWrap;
      var root = self._root;
      var footerEl = self._footerEl;
      var tooltip = self._tooltip;
      var themeKey = config.colorTheme || "publication_light";
      var theme = THEMES[themeKey] || THEMES.publication_light;
      var palette = PALETTES[config.colorPalette || "google_enterprise"] || PALETTES.google_enterprise;

      root.style.background = theme.bg;
      root.style.color = theme.text;
      tooltip.style.background = theme.isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.97)";
      tooltip.style.color = theme.text;
      tooltip.style.border = "1px solid " + theme.border;

      var f = (queryResponse && queryResponse.fields) || {};
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;
      var pivots = (queryResponse && queryResponse.pivots) ? queryResponse.pivots : [];

      if (!data || !data.length) {
        wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:' + theme.subtext + ';font-size:13px;">No rows returned for this query.</div>';
        footerEl.style.display = "none";
        finish();
        return;
      }

      // Resolve field roles: supports either (A) 3 distinct measures OR (B) 1 measure pivoted across >=3 pivot values
      var labelField = resolveField(dims, config.dimLabelOverride, 0);
      var groupField = dims.length > 1
        ? resolveField(dims, config.dimGroupOverride, 1)
        : (config.dimGroupOverride ? resolveField(dims, config.dimGroupOverride, -1) : null);

      var mA = resolveField(meas, config.measureAOverride, 0);
      var mB = resolveField(meas, config.measureBOverride, -1);
      var mC = resolveField(meas, config.measureCOverride, -1);
      var sizeField = config.sizeMeasureOverride ? resolveField(meas, config.sizeMeasureOverride, -1) : null;

      var usePivotedMode = false;
      var compNames = ["Component A", "Component B", "Component C"];
      var pivotKeys = [];

      if (pivots.length >= 3 && mA && (!mB || !mC)) {
        usePivotedMode = true;
        pivotKeys = [pivots[0].key, pivots[1].key, pivots[2].key];
        compNames = [
          pivots[0].key,
          pivots[1].key,
          pivots[2].key
        ];
      } else {
        mB = mB || resolveField(meas, "", 1);
        mC = mC || resolveField(meas, "", 2);
        if (!mA || !mB || !mC) {
          if (self.addError) {
            try {
              self.addError({
                title: "3-Component Composition Required",
                message: "Select either 3 numeric measures or 1 numeric measure pivoted by a dimension with at least 3 categories."
              });
            } catch (e) {}
          }
          wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;text-align:center;color:' + theme.subtext + ';font-size:13px;">Ternary Simplex requires 3 numeric measures (or 1 measure pivoted across 3 categories).</div>';
          footerEl.style.display = "none";
          finish();
          return;
        }
        compNames = [shortLabel(mA), shortLabel(mB), shortLabel(mC)];
      }

      // Parse & normalize rows onto simplex S^2: pA + pB + pC = 1
      var points = [];
      var valFmt = config.valueFormat || "compact";
      data.forEach(function (row, idx) {
        var rawA, rawB, rawC;
        if (usePivotedMode) {
          var mObj = row[mA.name];
          var c0 = resolvePivotCell(mObj, pivotKeys[0], pivots[0]);
          var c1 = resolvePivotCell(mObj, pivotKeys[1], pivots[1]);
          var c2 = resolvePivotCell(mObj, pivotKeys[2], pivots[2]);
          rawA = c0 && c0.value !== null && c0.value !== undefined ? Number(c0.value) : 0;
          rawB = c1 && c1.value !== null && c1.value !== undefined ? Number(c1.value) : 0;
          rawC = c2 && c2.value !== null && c2.value !== undefined ? Number(c2.value) : 0;
        } else {
          var sA = extractScalar(row, mA.name, pivots);
          var sB = extractScalar(row, mB.name, pivots);
          var sC = extractScalar(row, mC.name, pivots);
          rawA = sA.value !== null ? sA.value : 0;
          rawB = sB.value !== null ? sB.value : 0;
          rawC = sC.value !== null ? sC.value : 0;
        }
        if (!isFinite(rawA) || rawA < 0) rawA = 0;
        if (!isFinite(rawB) || rawB < 0) rawB = 0;
        if (!isFinite(rawC) || rawC < 0) rawC = 0;
        var total = rawA + rawB + rawC;
        if (total <= 0) return;

        var lblCell = labelField ? row[labelField.name] : null;
        var label = lblCell ? (lblCell.rendered || String(lblCell.value || ("Row " + (idx + 1)))) : ("Obs " + (idx + 1));
        var grpCell = groupField ? row[groupField.name] : null;
        var group = grpCell ? (grpCell.rendered || String(grpCell.value || "Unassigned")) : "All Observations";
        var sizeVal = sizeField ? extractScalar(row, sizeField.name, pivots).value : null;
        var links = collectRowLinks(row, f, pivots);

        points.push({
          idx: idx,
          label: label,
          group: group,
          rawA: rawA,
          rawB: rawB,
          rawC: rawC,
          total: total,
          pA: rawA / total,
          pB: rawB / total,
          pC: rawC / total,
          sizeVal: (sizeVal !== null && isFinite(sizeVal) && sizeVal > 0) ? sizeVal : null,
          links: links
        });
      });

      if (!points.length) {
        wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:' + theme.subtext + ';font-size:13px;">All rows have zero or negative total across the 3 components.</div>';
        footerEl.style.display = "none";
        finish();
        return;
      }

      // Color scale by group
      var groups = Array.from(new Set(points.map(function (p) { return p.group; })));
      if (self._isolatedGroup && groups.indexOf(self._isolatedGroup) === -1) {
        self._isolatedGroup = null;
      }
      var groupColor = {};
      groups.forEach(function (g, i) {
        groupColor[g] = palette[i % palette.length];
      });

      // Compute mean share per vertex across dataset
      var meanA = d3.mean(points, function (d) { return d.pA; }) || 0;
      var meanB = d3.mean(points, function (d) { return d.pB; }) || 0;
      var meanC = d3.mean(points, function (d) { return d.pC; }) || 0;

      // Measure container cleanly (after optional footer)
      var hudMode = config.hudMode || "hidden";
      if (hudMode === "compact") {
        footerEl.style.display = "flex";
        footerEl.style.cssText = "flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;" +
          "padding:5px 14px;border-top:1px solid " + theme.border + ";background:" + theme.cardBg + ";font-size:11px;color:" + theme.subtext + ";";
        footerEl.innerHTML =
          '<span><strong style="color:' + theme.text + ';">' + points.length + '</strong> simplex observations</span>' +
          '<span>Mean Mix: <strong style="color:' + theme.text + ';">' + escapeHtml(compNames[0]) + ' ' + (meanA * 100).toFixed(1) + '%</strong> · ' +
          '<strong style="color:' + theme.text + ';">' + escapeHtml(compNames[1]) + ' ' + (meanB * 100).toFixed(1) + '%</strong> · ' +
          '<strong style="color:' + theme.text + ';">' + escapeHtml(compNames[2]) + ' ' + (meanC * 100).toFixed(1) + '%</strong></span>';
      } else {
        footerEl.style.display = "none";
      }

      var W = wrap.clientWidth || element.clientWidth || 720;
      var H = wrap.clientHeight || element.clientHeight || 480;
      self._lastSize = { w: element.clientWidth, h: element.clientHeight };

      var fontScale = config.fontScale || "standard";
      var baseFs = fontScale === "compact" ? 10.5 : (fontScale === "large" ? 13.5 : 12);

      // Compute largest equilateral triangle inside (W, H) with clean margin for vertex labels & ticks
      var padTop = 46 + (config.customChartTitle ? 18 : 0);
      var padBottom = 62;
      var padSide = Math.max(68, Math.min(124, W * 0.12));

      var availW = Math.max(140, W - padSide * 2);
      var availH = Math.max(120, H - padTop - padBottom);
      var SQRT3_2 = Math.sqrt(3) / 2;
      // Height of equilateral triangle with side L is L * SQRT3_2
      var sideL = Math.min(availW, availH / SQRT3_2);
      var triH = sideL * SQRT3_2;

      var cx = W / 2;
      // Slight shift if legend sits on right on wide screens? Keep centered so symmetry is pristine.
      var topY = padTop + (availH - triH) / 2;
      var baseY = topY + triH;

      var vA = { x: cx, y: topY };                     // Top (100% A)
      var vB = { x: cx - sideL / 2, y: baseY };        // Bottom-Left (100% B)
      var vC = { x: cx + sideL / 2, y: baseY };        // Bottom-Right (100% C)

      function baryToXY(pA, pB, pC) {
        return [
          pA * vA.x + pB * vB.x + pC * vC.x,
          pA * vA.y + pB * vB.y + pC * vC.y
        ];
      }

      points.forEach(function (pt) {
        var xy = baryToXY(pt.pA, pt.pB, pt.pC);
        pt.x = xy[0];
        pt.y = xy[1];
      });

      // Clear & render SVG
      wrap.innerHTML = "";
      var svg = d3.select(wrap)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .style("display", "block")
        .style("user-select", "none");

      var defs = svg.append("defs");
      var clipId = self._uid + "_simplex_clip";
      defs.append("clipPath")
        .attr("id", clipId)
        .append("polygon")
        .attr("points", [
          [vA.x, vA.y].join(","),
          [vB.x, vB.y].join(","),
          [vC.x, vC.y].join(",")
        ].join(" "));

      // Optional subtle minimal caption in top-left corner
      if (config.customChartTitle && String(config.customChartTitle).trim()) {
        svg.append("text")
          .attr("x", 16)
          .attr("y", 22)
          .attr("fill", theme.text)
          .attr("font-size", (baseFs + 2) + "px")
          .attr("font-weight", "700")
          .text(String(config.customChartTitle).trim());
      }

      // Base triangle backdrop
      svg.append("polygon")
        .attr("points", [
          [vA.x, vA.y].join(","),
          [vB.x, vB.y].join(","),
          [vC.x, vC.y].join(",")
        ].join(" "))
        .attr("fill", theme.simplexFill)
        .attr("stroke", "none");

      // Clipped interior group (gridlines, KDE contours, hulls, points, guides)
      var interior = svg.append("g").attr("clip-path", "url(#" + clipId + ")");

      // 1. Ternary Iso-Gridlines
      var step = parseInt(config.gridStep || "20", 10);
      var gridLayer = interior.append("g").attr("class", "tcs-grid");
      for (var pct = step; pct < 100; pct += step) {
        var fPct = pct / 100;
        // Iso-A (horizontal): from (fPct, 1-fPct, 0) to (fPct, 0, 1-fPct)
        var a1 = baryToXY(fPct, 1 - fPct, 0);
        var a2 = baryToXY(fPct, 0, 1 - fPct);
        gridLayer.append("line")
          .attr("x1", a1[0]).attr("y1", a1[1]).attr("x2", a2[0]).attr("y2", a2[1])
          .attr("stroke", theme.gridStroke).attr("stroke-width", 1);

        // Iso-B (parallel to A-C): from (0, fPct, 1-fPct) to (1-fPct, fPct, 0)
        var b1 = baryToXY(0, fPct, 1 - fPct);
        var b2 = baryToXY(1 - fPct, fPct, 0);
        gridLayer.append("line")
          .attr("x1", b1[0]).attr("y1", b1[1]).attr("x2", b2[0]).attr("y2", b2[1])
          .attr("stroke", theme.gridStroke).attr("stroke-width", 1);

        // Iso-C (parallel to A-B): from (1-fPct, 0, fPct) to (0, 1-fPct, fPct)
        var c1 = baryToXY(1 - fPct, 0, fPct);
        var c2 = baryToXY(0, 1 - fPct, fPct);
        gridLayer.append("line")
          .attr("x1", c1[0]).attr("y1", c1[1]).attr("x2", c2[0]).attr("y2", c2[1])
          .attr("stroke", theme.gridStroke).attr("stroke-width", 1);
      }

      // 2. 2D KDE Density Contours (clipped strictly inside the triangle)
      var displayMode = config.displayMode || "scatter_contours";
      var activePoints = self._isolatedGroup
        ? points.filter(function (p) { return p.group === self._isolatedGroup; })
        : points;

      var wantContours = (displayMode === "scatter_contours" || displayMode === "density_heatmap") &&
        (config.showDensityContours !== false || displayMode === "density_heatmap");

      if (wantContours && typeof d3.contourDensity === "function" && activePoints.length >= 4) {
        var bwChoice = config.contourBandwidth || "medium";
        var bw = bwChoice === "tight" ? Math.max(10, sideL * 0.045) : (bwChoice === "broad" ? Math.max(22, sideL * 0.11) : Math.max(15, sideL * 0.072));
        var thresholds = displayMode === "density_heatmap" ? 11 : 7;

        var densityData = d3.contourDensity()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
          .size([W, H])
          .bandwidth(bw)
          .thresholds(thresholds)(activePoints);

        if (densityData && densityData.length) {
          var maxDens = d3.max(densityData, function (d) { return d.value; }) || 1;
          var baseCol = d3.color(self._isolatedGroup ? (groupColor[self._isolatedGroup] || theme.contourBase) : theme.contourBase);
          var maxAlpha = displayMode === "density_heatmap" ? 0.58 : 0.24;

          interior.append("g")
            .attr("class", "tcs-contours")
            .selectAll("path")
            .data(densityData)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .attr("fill", function (d) {
              var t = Math.pow(d.value / maxDens, 0.85);
              var c = baseCol.copy();
              c.opacity = 0.04 + t * maxAlpha;
              return c.formatRgb();
            })
            .attr("stroke", theme.contourStroke)
            .attr("stroke-width", displayMode === "density_heatmap" ? 1.0 : 0.85)
            .attr("pointer-events", "none");
        }
      }

      // 3. Parity 33.3% Centroid Crosshair
      if (config.showCentroidGuide !== false) {
        var c33 = baryToXY(1 / 3, 1 / 3, 1 / 3);
        var cg = interior.append("g").attr("pointer-events", "none").attr("opacity", 0.55);
        cg.append("circle")
          .attr("cx", c33[0]).attr("cy", c33[1]).attr("r", 3.2)
          .attr("fill", "none").attr("stroke", theme.guideStroke).attr("stroke-width", 1.2);
        cg.append("line")
          .attr("x1", c33[0] - 8).attr("y1", c33[1]).attr("x2", c33[0] + 8).attr("y2", c33[1])
          .attr("stroke", theme.guideStroke).attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
        cg.append("line")
          .attr("x1", c33[0]).attr("y1", c33[1] - 8).attr("x2", c33[0]).attr("y2", c33[1] + 8)
          .attr("stroke", theme.guideStroke).attr("stroke-width", 1).attr("stroke-dasharray", "2,2");
      }

      // 4. Optional Convex Hulls & Group Centroids
      var groupStats = [];
      groups.forEach(function (gName) {
        var gPts = points.filter(function (p) { return p.group === gName; });
        if (!gPts.length) return;
        var gX = d3.mean(gPts, function (d) { return d.x; });
        var gY = d3.mean(gPts, function (d) { return d.y; });
        var gpA = d3.mean(gPts, function (d) { return d.pA; });
        var gpB = d3.mean(gPts, function (d) { return d.pB; });
        var gpC = d3.mean(gPts, function (d) { return d.pC; });
        var hull = gPts.length >= 3 ? d3.polygonHull(gPts.map(function (p) { return [p.x, p.y]; })) : null;
        groupStats.push({
          group: gName,
          color: groupColor[gName],
          count: gPts.length,
          x: gX,
          y: gY,
          pA: gpA,
          pB: gpB,
          pC: gpC,
          hull: hull
        });
      });

      var showHulls = config.showClusterHulls === true || displayMode === "centroids_hulls";
      if (showHulls) {
        var hullLayer = interior.append("g").attr("class", "tcs-hulls");
        groupStats.forEach(function (gs) {
          var isMuted = self._isolatedGroup && self._isolatedGroup !== gs.group;
          if (gs.hull && gs.hull.length >= 3) {
            hullLayer.append("path")
              .attr("d", "M" + gs.hull.map(function (pt) { return pt[0] + "," + pt[1]; }).join("L") + "Z")
              .attr("fill", gs.color)
              .attr("fill-opacity", isMuted ? 0.02 : 0.11)
              .attr("stroke", gs.color)
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", isMuted ? 0.12 : 0.65)
              .attr("stroke-dasharray", "4,3")
              .attr("pointer-events", "none");
          }
        });
      }

      // 5. Hover Barycentric Projection Guides (hidden until hover)
      var hoverGuides = interior.append("g").attr("class", "tcs-hover-guides").style("display", "none").attr("pointer-events", "none");
      var guideA = hoverGuides.append("line").attr("stroke", theme.guideStroke).attr("stroke-width", 1.25).attr("stroke-dasharray", "3,3");
      var guideB = hoverGuides.append("line").attr("stroke", theme.guideStroke).attr("stroke-width", 1.25).attr("stroke-dasharray", "3,3");
      var guideC = hoverGuides.append("line").attr("stroke", theme.guideStroke).attr("stroke-width", 1.25).attr("stroke-dasharray", "3,3");
      var hoverRing = hoverGuides.append("circle").attr("fill", "none").attr("stroke", theme.text).attr("stroke-width", 2);

      // 6. Scatter / Bubble Points
      var baseR = Math.max(2, Math.min(14, Number(config.pointRadius) || 5));
      var baseOp = Math.max(0.1, Math.min(1.0, Number(config.pointOpacity) || 0.78));
      var sizeExtent = d3.extent(points, function (d) { return d.sizeVal; });
      var rScale = (sizeField && sizeExtent[0] !== undefined && sizeExtent[1] > sizeExtent[0])
        ? d3.scaleSqrt().domain(sizeExtent).range([Math.max(2.5, baseR * 0.65), Math.min(18, baseR * 2.2)])
        : null;

      function pointR(d) {
        var r = rScale && d.sizeVal !== null ? rScale(d.sizeVal) : baseR;
        if (displayMode === "density_heatmap") r = Math.max(2.2, r * 0.62);
        if (displayMode === "centroids_hulls") r = Math.max(2.2, r * 0.58);
        return r;
      }

      var ptsLayer = interior.append("g").attr("class", "tcs-points");
      ptsLayer.selectAll("circle")
        .data(points)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return d.x; })
        .attr("cy", function (d) { return d.y; })
        .attr("r", pointR)
        .attr("fill", function (d) { return groupColor[d.group]; })
        .attr("fill-opacity", function (d) {
          if (self._isolatedGroup && d.group !== self._isolatedGroup) return 0.08;
          if (displayMode === "centroids_hulls") return 0.34;
          if (displayMode === "density_heatmap") return 0.48;
          return baseOp;
        })
        .attr("stroke", theme.pointStroke)
        .attr("stroke-width", function (d) {
          return (self._isolatedGroup && d.group !== self._isolatedGroup) ? 0.4 : 1.1;
        })
        .attr("stroke-opacity", function (d) {
          if (self._isolatedGroup && d.group !== self._isolatedGroup) return 0.15;
          return 0.9;
        })
        .style("cursor", function (d) { return (d.links && d.links.length) ? "pointer" : "default"; })
        .on("mousemove", function (event, d) {
          var pEdgeA = baryToXY(d.pA, 1 - d.pA, 0);
          var pEdgeB = baryToXY(0, d.pB, 1 - d.pB);
          var pEdgeC = baryToXY(1 - d.pC, 0, d.pC);
          guideA.attr("x1", d.x).attr("y1", d.y).attr("x2", pEdgeA[0]).attr("y2", pEdgeA[1]);
          guideB.attr("x1", d.x).attr("y1", d.y).attr("x2", pEdgeB[0]).attr("y2", pEdgeB[1]);
          guideC.attr("x1", d.x).attr("y1", d.y).attr("x2", pEdgeC[0]).attr("y2", pEdgeC[1]);
          hoverRing.attr("cx", d.x).attr("cy", d.y).attr("r", pointR(d) + 3.5);
          hoverGuides.style("display", null);

          var col = groupColor[d.group];
          var html =
            '<div style="font-weight:700;font-size:12.5px;margin-bottom:3px;color:' + theme.text + ';">' + escapeHtml(d.label) + '</div>' +
            (groupField ? '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px;color:' + theme.subtext + ';">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + col + ';"></span>' +
              '<span>' + escapeHtml(d.group) + '</span></div>' : '') +
            '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums;">' +
              '<tr><td style="padding:2px 6px 2px 0;color:' + theme.subtext + ';">' + escapeHtml(compNames[0]) + '</td>' +
                  '<td style="text-align:right;font-weight:700;padding:2px 6px;">' + (d.pA * 100).toFixed(1) + '%</td>' +
                  '<td style="text-align:right;color:' + theme.subtext + ';">(' + escapeHtml(formatCompact(d.rawA, valFmt)) + ')</td></tr>' +
              '<tr><td style="padding:2px 6px 2px 0;color:' + theme.subtext + ';">' + escapeHtml(compNames[1]) + '</td>' +
                  '<td style="text-align:right;font-weight:700;padding:2px 6px;">' + (d.pB * 100).toFixed(1) + '%</td>' +
                  '<td style="text-align:right;color:' + theme.subtext + ';">(' + escapeHtml(formatCompact(d.rawB, valFmt)) + ')</td></tr>' +
              '<tr><td style="padding:2px 6px 2px 0;color:' + theme.subtext + ';">' + escapeHtml(compNames[2]) + '</td>' +
                  '<td style="text-align:right;font-weight:700;padding:2px 6px;">' + (d.pC * 100).toFixed(1) + '%</td>' +
                  '<td style="text-align:right;color:' + theme.subtext + ';">(' + escapeHtml(formatCompact(d.rawC, valFmt)) + ')</td></tr>' +
            '</table>' +
            '<div style="margin-top:5px;padding-top:4px;border-top:1px solid ' + theme.border + ';display:flex;justify-content:space-between;font-size:11px;color:' + theme.subtext + ';">' +
              '<span>Total Mix</span><strong style="color:' + theme.text + ';">' + escapeHtml(formatCompact(d.total, valFmt)) + '</strong>' +
            '</div>' +
            (d.links && d.links.length ? '<div style="margin-top:4px;font-size:10px;color:' + col + ';font-weight:600;">Click point to drill</div>' : '');

          tooltip.innerHTML = html;
          var tx = event.clientX + 14;
          var ty = event.clientY - 12;
          if (tx + 290 > window.innerWidth) tx = event.clientX - 300;
          if (ty + 180 > window.innerHeight) ty = window.innerHeight - 190;
          tooltip.style.left = Math.max(8, tx) + "px";
          tooltip.style.top = Math.max(8, ty) + "px";
          tooltip.style.opacity = "1";
        })
        .on("mouseleave", function () {
          hoverGuides.style("display", "none");
          tooltip.style.opacity = "0";
        })
        .on("click", function (event, d) {
          if (d.links && d.links.length && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
          }
        });

      // 7. Cluster Centroid Markers & Collision-Free Pill Labels
      var labelDens = config.labelDensity || "centroids";
      var showCentroids = displayMode === "centroids_hulls" || displayMode === "density_heatmap" || showHulls || (labelDens === "centroids" && groupField);
      if (showCentroids && groupField && groupStats.length > 1) {
        var centLayer = svg.append("g").attr("class", "tcs-centroids");
        var dSize = displayMode === "centroids_hulls" ? 8 : 5.5;
        var pillFontSize = Math.max(9.5, baseFs - 2);

        // Prepare pill boxes with initial anchor (flip below diamond if near top apex)
        var pillBoxes = [];
        groupStats.forEach(function (gs) {
          var isMuted = self._isolatedGroup && self._isolatedGroup !== gs.group;
          var gEl = centLayer.append("g")
            .attr("transform", "translate(" + gs.x + "," + gs.y + ")")
            .attr("opacity", isMuted ? 0.18 : 1)
            .attr("pointer-events", "none");

          gEl.append("path")
            .attr("d", "M0," + (-dSize) + " L" + dSize + ",0 L0," + dSize + " L" + (-dSize) + ",0 Z")
            .attr("fill", gs.color)
            .attr("stroke", theme.pointStroke)
            .attr("stroke-width", 1.6);

          if (labelDens === "centroids" && !isMuted) {
            var lblText = gs.group.length > 26 ? gs.group.slice(0, 25) + "…" : gs.group;
            var pillW = Math.round(lblText.length * (pillFontSize * 0.64) + 18);
            var pillH = 17;
            // Near top apex -> place label below diamond so it never overlaps top vertex title
            var initDy = (gs.pA > 0.85 || gs.y - topY < 32) ? (dSize + 18) : (-dSize - 13);
            pillBoxes.push({
              gs: gs,
              lblText: lblText,
              w: pillW,
              h: pillH,
              cx: gs.x,
              cy: gs.y + initDy,
              ax: gs.x,
              ay: gs.y
            });
          }
        });

        // Iterative collision relaxation between centroid pills + keep clear of apexes
        if (pillBoxes.length) {
          for (var iter = 0; iter < 35; iter++) {
            for (var i = 0; i < pillBoxes.length; i++) {
              for (var j = i + 1; j < pillBoxes.length; j++) {
                var a = pillBoxes[i];
                var b = pillBoxes[j];
                var overlapX = (a.w + b.w) / 2 + 6 - Math.abs(a.cx - b.cx);
                var overlapY = (a.h + b.h) / 2 + 4 - Math.abs(a.cy - b.cy);
                if (overlapX > 0 && overlapY > 0) {
                  if (overlapY <= overlapX * 0.7) {
                    var pushY = overlapY / 2 + 0.5;
                    if (a.cy <= b.cy) { a.cy -= pushY; b.cy += pushY; }
                    else { a.cy += pushY; b.cy -= pushY; }
                  } else {
                    var pushX = overlapX / 2 + 0.5;
                    if (a.cx <= b.cx) { a.cx -= pushX; b.cx += pushX; }
                    else { a.cx += pushX; b.cx -= pushX; }
                  }
                }
              }
              // Clamp inside SVG canvas and away from top/bottom vertex titles
              var pb = pillBoxes[i];
              pb.cx = Math.max(pb.w / 2 + 8, Math.min(W - pb.w / 2 - 8, pb.cx));
              pb.cy = Math.max(vA.y + 22, Math.min(vB.y - 12, pb.cy));
            }
          }

          pillBoxes.forEach(function (pb) {
            var dist = Math.hypot(pb.cx - pb.ax, pb.cy - pb.ay);
            if (dist > 16) {
              centLayer.append("line")
                .attr("x1", pb.ax).attr("y1", pb.ay)
                .attr("x2", pb.cx).attr("y2", pb.cy)
                .attr("stroke", pb.gs.color)
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.65)
                .attr("pointer-events", "none");
            }
            var pg = centLayer.append("g")
              .attr("transform", "translate(" + pb.cx + "," + pb.cy + ")")
              .attr("pointer-events", "none");
            pg.append("rect")
              .attr("x", -pb.w / 2)
              .attr("y", -pb.h / 2)
              .attr("width", pb.w)
              .attr("height", pb.h)
              .attr("rx", 4)
              .attr("fill", theme.isDark ? "rgba(15,23,42,0.90)" : "rgba(255,255,255,0.92)")
              .attr("stroke", pb.gs.color)
              .attr("stroke-width", 1);
            pg.append("text")
              .attr("y", 3.5)
              .attr("text-anchor", "middle")
              .attr("fill", theme.text)
              .attr("font-size", pillFontSize + "px")
              .attr("font-weight", "600")
              .text(pb.lblText);
          });
        }
      }

      // Extreme / Apex Outlier Labels
      if (labelDens === "extremes") {
        var extremePts = [];
        ["pA", "pB", "pC"].forEach(function (k) {
          var best = d3.greatest(activePoints, function (d) { return d[k]; });
          if (best && extremePts.indexOf(best) === -1) extremePts.push(best);
        });
        var extLayer = svg.append("g").attr("pointer-events", "none");
        extremePts.forEach(function (pt) {
          extLayer.append("text")
            .attr("x", pt.x)
            .attr("y", pt.y - pointR(pt) - 5)
            .attr("text-anchor", "middle")
            .attr("fill", theme.text)
            .attr("font-size", Math.max(9.5, baseFs - 2) + "px")
            .attr("font-weight", "600")
            .text(pt.label.length > 18 ? pt.label.slice(0, 17) + "…" : pt.label);
        });
      }

      // 8. Outer Triangle Border (drawn crisp over clipped interior)
      svg.append("polygon")
        .attr("points", [
          [vA.x, vA.y].join(","),
          [vB.x, vB.y].join(","),
          [vC.x, vC.y].join(",")
        ].join(" "))
        .attr("fill", "none")
        .attr("stroke", theme.edgeStroke)
        .attr("stroke-width", 1.8)
        .attr("stroke-linejoin", "round");

      // 9. Scientific Directional Edge Ticks & Percentage Labels
      var tickLayer = svg.append("g").attr("class", "tcs-ticks").attr("pointer-events", "none");
      var tickFs = Math.max(9, baseFs - 2.5);
      // Unit outward tick vectors aligned with iso-lines
      var dirA = [-1, 0]; // Horizontal left along iso-A from edge A-B
      var uCA = [vC.x - vA.x, vC.y - vA.y];
      var lenCA = Math.hypot(uCA[0], uCA[1]) || 1;
      var dirB = [uCA[0] / lenCA, uCA[1] / lenCA]; // Down-right parallel to A-C below baseY
      var uAB = [vB.x - vA.x, vB.y - vA.y];
      var lenAB = Math.hypot(uAB[0], uAB[1]) || 1;
      var dirC = [-uAB[0] / lenAB, -uAB[1] / lenAB]; // Up-right parallel to B->A from edge A-C

      for (var pct = step; pct < 100; pct += step) {
        var fPct = pct / 100;
        // Left edge (B->A): pA value
        var tA = baryToXY(fPct, 1 - fPct, 0);
        tickLayer.append("line")
          .attr("x1", tA[0]).attr("y1", tA[1])
          .attr("x2", tA[0] + dirA[0] * 6).attr("y2", tA[1] + dirA[1] * 6)
          .attr("stroke", theme.edgeStroke).attr("stroke-width", 1.2);
        tickLayer.append("text")
          .attr("x", tA[0] + dirA[0] * 10).attr("y", tA[1] + 3.5)
          .attr("text-anchor", "end")
          .attr("fill", theme.subtext)
          .attr("font-size", tickFs + "px")
          .text(pct + "%");

        // Bottom edge (C->B): pB value
        var tB = baryToXY(0, fPct, 1 - fPct);
        tickLayer.append("line")
          .attr("x1", tB[0]).attr("y1", tB[1])
          .attr("x2", tB[0] + dirB[0] * 6).attr("y2", tB[1] + dirB[1] * 6)
          .attr("stroke", theme.edgeStroke).attr("stroke-width", 1.2);
        tickLayer.append("text")
          .attr("x", tB[0] + dirB[0] * 12).attr("y", tB[1] + dirB[1] * 12 + 4)
          .attr("text-anchor", "middle")
          .attr("fill", theme.subtext)
          .attr("font-size", tickFs + "px")
          .text(pct + "%");

        // Right edge (A->C): pC value
        var tC = baryToXY(1 - fPct, 0, fPct);
        tickLayer.append("line")
          .attr("x1", tC[0]).attr("y1", tC[1])
          .attr("x2", tC[0] + dirC[0] * 6).attr("y2", tC[1] + dirC[1] * 6)
          .attr("stroke", theme.edgeStroke).attr("stroke-width", 1.2);
        tickLayer.append("text")
          .attr("x", tC[0] + dirC[0] * 10).attr("y", tC[1] + dirC[1] * 10 + 2)
          .attr("text-anchor", "start")
          .attr("fill", theme.subtext)
          .attr("font-size", tickFs + "px")
          .text(pct + "%");
      }

      // 10. Vertex Titles with Component Name & Mean Share
      var vertexLayer = svg.append("g").attr("class", "tcs-vertex-labels").attr("pointer-events", "none");
      // Top Apex (A)
      vertexLayer.append("text")
        .attr("x", vA.x)
        .attr("y", vA.y - 22)
        .attr("text-anchor", "middle")
        .attr("fill", theme.axisLabel)
        .attr("font-size", (baseFs + 1) + "px")
        .attr("font-weight", "700")
        .text(compNames[0]);
      vertexLayer.append("text")
        .attr("x", vA.x)
        .attr("y", vA.y - 9)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", Math.max(9.5, baseFs - 2) + "px")
        .text("100%  ·  avg " + (meanA * 100).toFixed(1) + "%");

      // Bottom-Left Apex (B) — centered below vertex B, clamped away from left edge
      var vBx = Math.max(58, vB.x);
      vertexLayer.append("text")
        .attr("x", vBx)
        .attr("y", vB.y + 34)
        .attr("text-anchor", "middle")
        .attr("fill", theme.axisLabel)
        .attr("font-size", (baseFs + 1) + "px")
        .attr("font-weight", "700")
        .text(compNames[1]);
      vertexLayer.append("text")
        .attr("x", vBx)
        .attr("y", vB.y + 48)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", Math.max(9.5, baseFs - 2) + "px")
        .text("100%  ·  avg " + (meanB * 100).toFixed(1) + "%");

      // Bottom-Right Apex (C) — centered below vertex C, clamped away from right edge
      var vCx = Math.min(W - 58, vC.x);
      vertexLayer.append("text")
        .attr("x", vCx)
        .attr("y", vC.y + 34)
        .attr("text-anchor", "middle")
        .attr("fill", theme.axisLabel)
        .attr("font-size", (baseFs + 1) + "px")
        .attr("font-weight", "700")
        .text(compNames[2]);
      vertexLayer.append("text")
        .attr("x", vCx)
        .attr("y", vC.y + 48)
        .attr("text-anchor", "middle")
        .attr("fill", theme.subtext)
        .attr("font-size", Math.max(9.5, baseFs - 2) + "px")
        .text("100%  ·  avg " + (meanC * 100).toFixed(1) + "%");

      // 11. Floating Minimal Interactive Legend (top-right corner, away from triangle apex)
      if (config.showLegend !== false && groupField && groupStats.length > 1) {
        var legendDiv = document.createElement("div");
        legendDiv.style.cssText = "position:absolute;top:10px;right:12px;max-width:" + Math.min(220, Math.round(W * 0.28)) + "px;" +
          "max-height:" + Math.max(100, H - 80) + "px;overflow-y:auto;padding:7px 9px;border-radius:8px;" +
          "background:" + (theme.isDark ? "rgba(15,23,42,0.82)" : "rgba(255,255,255,0.86)") + ";" +
          "border:1px solid " + theme.border + ";font-size:" + Math.max(10, baseFs - 1.5) + "px;";

        groupStats.forEach(function (gs) {
          var item = document.createElement("div");
          var isSelected = self._isolatedGroup === gs.group;
          var isMuted = self._isolatedGroup && !isSelected;
          item.style.cssText = "display:flex;align-items:center;gap:6px;padding:2.5px 4px;border-radius:4px;cursor:pointer;" +
            "opacity:" + (isMuted ? "0.4" : "1") + ";" +
            "background:" + (isSelected ? (theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)") : "transparent") + ";";
          item.innerHTML =
            '<span style="flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:' + gs.color + ';"></span>' +
            '<span style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:' + theme.text + ';font-weight:' + (isSelected ? "700" : "500") + ';">' + escapeHtml(gs.group) + '</span>' +
            '<span style="flex:0 0 auto;color:' + theme.subtext + ';font-size:10px;font-variant-numeric:tabular-nums;">' + gs.count + '</span>';
          item.title = gs.group + " (Click to isolate)";
          item.onclick = function () {
            self._isolatedGroup = (self._isolatedGroup === gs.group) ? null : gs.group;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          };
          legendDiv.appendChild(item);
        });
        wrap.appendChild(legendDiv);
      }

      finish();
    }
  });
})();
