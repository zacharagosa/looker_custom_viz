/**
 * BCG Growth-Share & Strategic Portfolio Opportunity Matrix - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Buganizer Cloud Blockers & Customer Requirements:
 * - b/491028341: Looker Feature Request: Growth-Share & Strategic Portfolio Matrix (BCG Matrix with Quadrant Partitioning)
 * - b/530918239: Support Strategic 4-Quadrant Bubble Matrix with dynamic X/Y threshold lines (Cash Cows, Stars, Question Marks, Dogs)
 * - b/341928091: Executive Portfolio Opportunity Scoring & Strategic Rebalancing Visualization
 * - PRD: go/prd-strategic-portfolio-quadrants
 * - YAQS: go/yaqs/growth-share-matrix, go/yaqs/bcg-portfolio-looker
 *
 * Capabilities:
 * - 3 Multi-Modal Layout Views:
 *     1. "quadrant_matrix": Classic 2x2 BCG Matrix with shaded quadrant cards (Stars, Cash Cows, Question Marks, Dogs).
 *     2. "bubble_scatter": Continuous scatter plot with dynamic X/Y threshold crosshairs.
 *     3. "strategic_leaderboard": Ranked strategic allocation scorecard with portfolio weights and investment actions.
 * - Dynamic Field-Role Mapping via Looker's registerOptions trigger:
 *     Maps Entity Dimension, Group Dimension, X-Axis Metric, Y-Axis Metric, and Bubble Size Metric.
 * - Dynamic Quadrant Thresholds:
 *     Calculates X and Y boundaries using Median, Mean, Percentile P75, or Fixed benchmarks.
 * - Executive Spatial / Strategic KPI HUD:
 *     Shows Total Portfolio Bookings, % Revenue in Cash Engines (Stars + Cows), Weighted Average Monetization,
 *     and interactive Quadrant Filter Chips.
 * - Real-Time Search & Interactive Tooltips with native Looker drill-downs.
 * - 2-Tab Options Architecture: Strictly organized into Display and Style tabs.
 */

(function () {
  var QUADRANT_DEFS = {
    stars: {
      id: "stars",
      name: "Stars",
      emoji: "\u2B50",
      label: "Stars (High Growth, High Share)",
      action: "Invest for Leadership",
      color: "#1e8e3e",
      bgLight: "rgba(230, 244, 234, 0.55)",
      borderLight: "#ceead6"
    },
    cash_cows: {
      id: "cash_cows",
      name: "Cash Cows",
      emoji: "\ud83d\udc04",
      label: "Cash Cows (Low Growth, High Share)",
      action: "Harvest & Reinvest",
      color: "#1a73e8",
      bgLight: "rgba(232, 240, 254, 0.55)",
      borderLight: "#c2e7ff"
    },
    question_marks: {
      id: "question_marks",
      name: "Question Marks",
      emoji: "\u2753",
      label: "Question Marks (High Growth, Low Share)",
      action: "Selective Expansion",
      color: "#f2994a",
      bgLight: "rgba(254, 247, 224, 0.55)",
      borderLight: "#feefc3"
    },
    dogs: {
      id: "dogs",
      name: "Dogs",
      emoji: "\ud83d\udc36",
      label: "Dogs (Low Growth, Low Share)",
      action: "Reposition / Rationalize",
      color: "#d93025",
      bgLight: "rgba(252, 232, 230, 0.55)",
      borderLight: "#fad2cf"
    }
  };

  var THEMES = {
    google_enterprise: {
      name: "Google Enterprise",
      accent: "#1a73e8",
      stars: "#1e8e3e",
      cash_cows: "#1a73e8",
      question_marks: "#f2994a",
      dogs: "#d93025",
      bg: "#ffffff",
      text: "#1f2328"
    },
    modern_slate: {
      name: "Modern Slate",
      accent: "#2563eb",
      stars: "#10b981",
      cash_cows: "#3b82f6",
      question_marks: "#f59e0b",
      dogs: "#ef4444",
      bg: "#ffffff",
      text: "#0f172a"
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      accent: "#06b6d4",
      stars: "#10b981",
      cash_cows: "#38bdf8",
      question_marks: "#f43f5e",
      dogs: "#94a3b8",
      bg: "#0b0f19",
      text: "#f8fafc"
    },
    emerald_finops: {
      name: "Emerald FinOps",
      accent: "#059669",
      stars: "#059669",
      cash_cows: "#0284c7",
      question_marks: "#d97706",
      dogs: "#dc2626",
      bg: "#ffffff",
      text: "#064e3b"
    },
    sunset_media: {
      name: "Sunset Media",
      accent: "#ea580c",
      stars: "#16a34a",
      cash_cows: "#0284c7",
      question_marks: "#ea580c",
      dogs: "#64748b",
      bg: "#ffffff",
      text: "#1e293b"
    },
    wellverse_health: {
      name: "Wellverse Healthcare",
      accent: "#0f766e",
      stars: "#0d9488",
      cash_cows: "#0284c7",
      question_marks: "#f59e0b",
      dogs: "#e11d48",
      bg: "#ffffff",
      text: "#134e4a"
    }
  };

  looker.plugins.visualizations.add({
    id: "bcg_growth_share_matrix",
    label: "BCG Growth-Share & Strategic Portfolio Matrix",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Functional & Layout)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Matrix View Mode",
        display: "select",
        values: [
          { "Classic 2x2 BCG Matrix Grid": "quadrant_matrix" },
          { "Continuous Scatter Plot": "bubble_scatter" },
          { "Strategic Leaderboard Table": "strategic_leaderboard" }
        ],
        default: "quadrant_matrix",
        section: "Display",
        order: 1
      },
      entityDimension: {
        type: "string",
        label: "Entity Dimension (Title / Product / Brand)",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 2
      },
      groupDimension: {
        type: "string",
        label: "Secondary Group (Genre / Sector / Platform)",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      xMeasure: {
        type: "string",
        label: "X-Axis Metric (Relative Share / DAU / Footprint)",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      yMeasure: {
        type: "string",
        label: "Y-Axis Metric (Growth Rate / ARPDAU / Monetization)",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      sizeMeasure: {
        type: "string",
        label: "Bubble Sizing Metric (Total Bookings / Revenue)",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      xThresholdMode: {
        type: "string",
        label: "X-Axis Quadrant Boundary (Relative Share)",
        display: "select",
        values: [
          { "Dataset Median": "median" },
          { "Dataset Mean": "mean" },
          { "Percentile P75 Benchmark": "p75" },
          { "Fixed Target Value": "fixed" }
        ],
        default: "median",
        section: "Display",
        order: 7
      },
      fixedXThreshold: {
        type: "number",
        label: "Fixed X Boundary (when Mode is Fixed)",
        default: 0,
        section: "Display",
        order: 8
      },
      yThresholdMode: {
        type: "string",
        label: "Y-Axis Quadrant Boundary (Market Growth / ARPDAU)",
        display: "select",
        values: [
          { "Dataset Median": "median" },
          { "Dataset Mean": "mean" },
          { "Percentile P75 Benchmark": "p75" },
          { "Fixed Target Value": "fixed" }
        ],
        default: "median",
        section: "Display",
        order: 9
      },
      fixedYThreshold: {
        type: "number",
        label: "Fixed Y Boundary (when Mode is Fixed)",
        default: 0,
        section: "Display",
        order: 10
      },
      customXLabel: {
        type: "string",
        label: "X-Axis Title Override",
        default: "",
        section: "Display",
        order: 11
      },
      customYLabel: {
        type: "string",
        label: "Y-Axis Title Override",
        default: "",
        section: "Display",
        order: 12
      },
      showThresholdLines: {
        type: "boolean",
        label: "Show Quadrant Boundary Crosshairs",
        default: true,
        section: "Display",
        order: 13
      },
      sortBy: {
        type: "string",
        label: "Sort Entities By",
        display: "select",
        values: [
          { "Portfolio Size Descending": "size_desc" },
          { "Portfolio Size Ascending": "size_asc" },
          { "X-Axis Metric Descending": "x_desc" },
          { "Y-Axis Metric Descending": "y_desc" },
          { "Entity Name Alphabetical": "name_asc" },
          { "Quadrant Priority (Stars \u2192 Cows \u2192 ?)": "quadrant" }
        ],
        default: "size_desc",
        section: "Display",
        order: 14
      },
      topNLimit: {
        type: "number",
        label: "Top-N Entities Limit (0 = All Entities)",
        default: 0,
        section: "Display",
        order: 15
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Group Remaining into Other Rollup Summary",
        default: false,
        section: "Display",
        order: 16
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Entities",
        default: false,
        section: "Display",
        order: 17
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Executive Strategic KPI HUD",
        default: true,
        section: "Display",
        order: 18
      },
      hudDensity: {
        type: "string",
        label: "Executive HUD Display Mode",
        display: "select",
        values: [
          { "Full Strategic Scorecard": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 19
      },
      labelDensity: {
        type: "string",
        label: "Entity Bubble Data Labels",
        display: "select",
        values: [
          { "Top 10 Leaders Only": "leaders_only" },
          { "All Active Entities": "all" },
          { "Hidden / Tooltip Only": "hidden" }
        ],
        default: "leaders_only",
        section: "Display",
        order: 20
      },
      customTitle: {
        type: "string",
        label: "Custom Title Override",
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
      showSearch: {
        type: "boolean",
        label: "Interactive Entity Search Bar",
        default: true,
        section: "Display",
        order: 23
      },
      showQuadrantBadges: {
        type: "boolean",
        label: "Show Quadrant Legend Badges",
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
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_health" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise",
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
        label: "Custom Stars Accent Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Dogs Accent Hex",
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
          { "Higher is Better (Growth, ARPDAU, Share)": "higher_better" },
          { "Lower is Better (Churn, CAC, Latency)": "lower_better" }
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
        label: "Metric Display Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Currency ($1.2M / $45K)": "compact_currency" },
          { "Compact Number (1.2M / 45K)": "compact_num" },
          { "Standard Currency ($1,234,567)": "currency" },
          { "Formatted Number (1,234,567)": "number" },
          { "Percentage (12.4%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2dp" },
          { "Raw (Unformatted)": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      bubbleMinRadius: {
        type: "number",
        label: "Minimum Bubble Radius (px)",
        default: 8,
        section: "Style",
        order: 8
      },
      bubbleMaxRadius: {
        type: "number",
        label: "Maximum Bubble Radius (px)",
        default: 36,
        section: "Style",
        order: 9
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        entityDimension: { role: "dimension", defaultIdx: 0 },
        groupDimension: { role: "dimension", defaultIdx: 1 },
        xMeasure: { role: "measure", defaultIdx: 0 },
        yMeasure: { role: "measure", defaultIdx: 1 },
        sizeMeasure: { role: "measure", defaultIdx: 2 }
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
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
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
        console.warn("registerOptions unavailable in host:", e);
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "bcg-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.background = "#ffffff";

      // 0. Header Banner
      var headerDiv = document.createElement("div");
      headerDiv.className = "bcg-header-banner";
      headerDiv.style.display = "none";
      headerDiv.style.padding = "10px 16px 4px 16px";
      headerDiv.style.flexShrink = "0";
      container.appendChild(headerDiv);

      // 1. Executive Strategic KPI HUD
      var hudDiv = document.createElement("div");
      hudDiv.className = "bcg-hud-container";
      hudDiv.style.flexShrink = "0";
      hudDiv.style.padding = "8px 16px";
      hudDiv.style.background = "linear-gradient(180deg, #ffffff 0%, #f8fafd 100%)";
      hudDiv.style.borderBottom = "1px solid #e1e4e8";
      hudDiv.style.display = "flex";
      hudDiv.style.alignItems = "center";
      hudDiv.style.justifyContent = "space-between";
      hudDiv.style.gap = "12px";
      hudDiv.style.minHeight = "44px";
      container.appendChild(hudDiv);

      // 2. Search & Filter Bar
      var searchDiv = document.createElement("div");
      searchDiv.className = "bcg-search-bar";
      searchDiv.style.flexShrink = "0";
      searchDiv.style.padding = "6px 16px";
      searchDiv.style.background = "#ffffff";
      searchDiv.style.borderBottom = "1px solid #f0f2f5";
      searchDiv.style.display = "flex";
      searchDiv.style.alignItems = "center";
      searchDiv.style.justifyContent = "space-between";
      searchDiv.style.gap = "12px";
      container.appendChild(searchDiv);

      // 3. Matrix Viewport Container
      var matrixWrapper = document.createElement("div");
      matrixWrapper.className = "bcg-matrix-wrapper";
      matrixWrapper.style.flex = "1";
      matrixWrapper.style.position = "relative";
      matrixWrapper.style.overflow = "hidden";
      matrixWrapper.style.width = "100%";
      matrixWrapper.style.height = "100%";
      matrixWrapper.style.minHeight = "280px";
      container.appendChild(matrixWrapper);

      element.appendChild(container);

      // Debounced ResizeObserver
      var self = this;
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastElement) return;
          var entry = entries[0];
          if (!entry) return;
          var cr = entry.contentRect;
          if (!self._lastW || !self._lastH || Math.abs(cr.width - self._lastW) > 4 || Math.abs(cr.height - self._lastH) > 4) {
            self._lastW = cr.width;
            self._lastH = cr.height;
            clearTimeout(self._resizeTimeout);
            self._resizeTimeout = setTimeout(function () {
              self.updateAsync(
                self._lastData,
                self._lastElement,
                self._lastConfig,
                self._lastQueryResponse,
                self._lastDetails,
                self._lastDone
              );
            }, 120);
          }
        });
        ro.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this._lastData = data;
      this._lastElement = element;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastDone = done;

      this._registerDynamicFieldOptions(queryResponse);

      if (!data || !data.length || !queryResponse || !queryResponse.fields) {
        if (typeof done === "function") done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];
      var calcs = queryResponse.fields.table_calculations || [];
      var allMeasures = meas.concat(calcs);

      if (!dims.length || !allMeasures.length) {
        element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#57606a;font-size:13px;">Please select at least 1 Entity Dimension and 1-2 Measures.</div>';
        if (typeof done === "function") done();
        return;
      }

      // 1. Resolve Fields
      var entityDim = dims[0];
      if (config.entityDimension) {
        var ed = dims.find(function (d) { return d.name === config.entityDimension; });
        if (ed) entityDim = ed;
      }

      var groupDim = dims.length > 1 ? dims[1] : null;
      if (config.groupDimension) {
        var gd = dims.find(function (d) { return d.name === config.groupDimension; });
        if (gd) groupDim = gd;
      }

      var xMeas = allMeasures[0];
      if (config.xMeasure) {
        var xm = allMeasures.find(function (m) { return m.name === config.xMeasure; });
        if (xm) xMeas = xm;
      }

      var yMeas = allMeasures.length > 1 ? allMeasures[1] : allMeasures[0];
      if (config.yMeasure) {
        var ym = allMeasures.find(function (m) { return m.name === config.yMeasure; });
        if (ym) yMeas = ym;
      }

      var sizeMeas = allMeasures.length > 2 ? allMeasures[2] : (allMeasures.length > 1 ? allMeasures[0] : allMeasures[0]);
      if (config.sizeMeasure) {
        var sm = allMeasures.find(function (m) { return m.name === config.sizeMeasure; });
        if (sm) sizeMeas = sm;
      }

      // 2. Extract Options
      var layoutMode = config.layoutMode || "quadrant_matrix";
      var xThresholdMode = config.xThresholdMode || "median";
      var fixedX = parseFloat(config.fixedXThreshold) || 0;
      var yThresholdMode = config.yThresholdMode || "median";
      var fixedY = parseFloat(config.fixedYThreshold) || 0;
      var customXLabel = config.customXLabel || (xMeas.label || xMeas.name);
      var customYLabel = config.customYLabel || (yMeas.label || yMeas.name);
      var showThresholdLines = config.showThresholdLines !== false;
      var sortBy = config.sortBy || "size_desc";
      var topN = parseInt(config.topNLimit, 10) || 0;
      var enableOtherRollup = config.enableOtherRollup === true;
      var suppressZeroNull = config.suppressZeroNull === true;
      var showExecutiveHUD = config.showExecutiveHUD !== false;
      var hudDensity = config.hudDensity || "scorecard";
      var labelDensity = config.labelDensity || "leaders_only";
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";
      var showSearch = config.showSearch !== false;
      var showQuadrantBadges = config.showQuadrantBadges !== false;
      var colorThemeKey = config.colorTheme || "google_enterprise";
      var metricPolarity = config.metricPolarity || "higher_better";
      var fontScale = config.fontScale || "standard";
      var valueFormat = config.valueFormat || "compact_currency";
      var minR = parseFloat(config.bubbleMinRadius) || 8;
      var maxR = parseFloat(config.bubbleMaxRadius) || 36;

      var fontMultiplier = fontScale === "compact" ? 0.88 : (fontScale === "large" ? 1.2 : 1.0);
      var theme = THEMES[colorThemeKey] || THEMES.google_enterprise;

      // 3. Client-Side Aggregation across 5,000+ rows
      var entityMap = {};
      var totalSizeVolume = 0;
      var totalXVolume = 0;
      var totalYVolume = 0;

      data.forEach(function (row) {
        var entityKey = row[entityDim.name] ? String(row[entityDim.name].value) : "Unknown";
        var groupKey = groupDim && row[groupDim.name] ? String(row[groupDim.name].value) : "General";

        var xVal = row[xMeas.name] ? parseFloat(row[xMeas.name].value) : 0;
        if (isNaN(xVal)) xVal = 0;

        var yVal = row[yMeas.name] ? parseFloat(row[yMeas.name].value) : 0;
        if (isNaN(yVal)) yVal = 0;

        var sVal = row[sizeMeas.name] ? parseFloat(row[sizeMeas.name].value) : 0;
        if (isNaN(sVal)) sVal = (xVal + yVal) / 2;

        if (suppressZeroNull && sVal === 0 && xVal === 0 && yVal === 0) return;

        if (!entityMap[entityKey]) {
          var links = [];
          if (row[entityDim.name] && row[entityDim.name].links) links = row[entityDim.name].links;
          else if (row[sizeMeas.name] && row[sizeMeas.name].links) links = row[sizeMeas.name].links;

          entityMap[entityKey] = {
            id: entityKey,
            name: entityKey,
            group: groupKey,
            x: 0,
            y: 0,
            size: 0,
            count: 0,
            links: links,
            rendered: row[sizeMeas.name] ? row[sizeMeas.name].rendered : null
          };
        }

        entityMap[entityKey].x += xVal;
        entityMap[entityKey].y += yVal;
        entityMap[entityKey].size += sVal;
        entityMap[entityKey].count += 1;
        totalSizeVolume += sVal;
        totalXVolume += xVal;
        totalYVolume += yVal;
      });

      var entityList = Object.keys(entityMap).map(function (k) {
        var it = entityMap[k];
        if (it.count > 1) {
          // If aggregated, take average for rate metrics
          it.x = it.x / it.count;
          it.y = it.y / it.count;
        }
        return it;
      });

      if (!entityList.length) {
        element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#57606a;">No active entities found.</div>';
        if (typeof done === "function") done();
        return;
      }

      // 4. Calculate Dynamic Boundaries (X and Y thresholds)
      var xVals = entityList.map(function (d) { return d.x; }).sort(function (a, b) { return a - b; });
      var yVals = entityList.map(function (d) { return d.y; }).sort(function (a, b) { return a - b; });

      var xBoundary = 0;
      if (xThresholdMode === "fixed") xBoundary = fixedX;
      else if (xThresholdMode === "mean") xBoundary = d3.mean(xVals) || 0;
      else if (xThresholdMode === "p75") xBoundary = d3.quantile(xVals, 0.75) || 0;
      else xBoundary = d3.median(xVals) || 0;

      var yBoundary = 0;
      if (yThresholdMode === "fixed") yBoundary = fixedY;
      else if (yThresholdMode === "mean") yBoundary = d3.mean(yVals) || 0;
      else if (yThresholdMode === "p75") yBoundary = d3.quantile(yVals, 0.75) || 0;
      else yBoundary = d3.median(yVals) || 0;

      // 5. Categorize each entity into 4 BCG Quadrants
      entityList.forEach(function (d) {
        d.sharePct = totalSizeVolume > 0 ? (d.size / totalSizeVolume) * 100 : 0;
        var isHighX = metricPolarity === "higher_better" ? (d.x >= xBoundary) : (d.x <= xBoundary);
        var isHighY = metricPolarity === "higher_better" ? (d.y >= yBoundary) : (d.y <= yBoundary);

        if (isHighX && isHighY) {
          d.quadrant = "stars";
          d.color = theme.stars || QUADRANT_DEFS.stars.color;
        } else if (isHighX && !isHighY) {
          d.quadrant = "cash_cows";
          d.color = theme.cash_cows || QUADRANT_DEFS.cash_cows.color;
        } else if (!isHighX && isHighY) {
          d.quadrant = "question_marks";
          d.color = theme.question_marks || QUADRANT_DEFS.question_marks.color;
        } else {
          d.quadrant = "dogs";
          d.color = theme.dogs || QUADRANT_DEFS.dogs.color;
        }
      });

      // 6. Apply Sorting
      if (sortBy === "size_desc") entityList.sort(function (a, b) { return b.size - a.size; });
      else if (sortBy === "size_asc") entityList.sort(function (a, b) { return a.size - b.size; });
      else if (sortBy === "x_desc") entityList.sort(function (a, b) { return b.x - a.x; });
      else if (sortBy === "y_desc") entityList.sort(function (a, b) { return b.y - a.y; });
      else if (sortBy === "name_asc") entityList.sort(function (a, b) { return a.name.localeCompare(b.name); });
      else if (sortBy === "quadrant") {
        var qOrder = { stars: 1, cash_cows: 2, question_marks: 3, dogs: 4 };
        entityList.sort(function (a, b) { return qOrder[a.quadrant] - qOrder[b.quadrant] || (b.size - a.size); });
      }

      entityList.forEach(function (d, idx) { d.rank = idx + 1; });

      // Top-N handling
      var displayEntities = entityList;
      var otherSummary = null;
      if (topN > 0 && entityList.length > topN) {
        displayEntities = entityList.slice(0, topN);
        if (enableOtherRollup) {
          var rem = entityList.slice(topN);
          var otherSize = rem.reduce(function (a, c) { return a + c.size; }, 0);
          otherSummary = {
            count: rem.length,
            size: otherSize,
            sharePct: totalSizeVolume > 0 ? (otherSize / totalSizeVolume) * 100 : 0
          };
        }
      }

      // Formatting helper
      function formatVal(v, fmt) {
        if (v === null || v === undefined || isNaN(v)) return "0";
        var f = fmt || valueFormat;
        if (f === "compact_currency") return "$" + d3.format(".3~s")(v).replace(/G$/, "B");
        if (f === "compact_num") return d3.format(".3~s")(v).replace(/G$/, "B");
        if (f === "currency") return "$" + d3.format(",.0f")(v);
        if (f === "number") return d3.format(",.0f")(v);
        if (f === "percentage") return d3.format(".1f")(v) + "%";
        if (f === "decimal_2dp") return d3.format(",.2f")(v);
        return String(v);
      }

      // 7. Render UI Components
      var root = element.querySelector(".bcg-root");
      var headerDiv = root.querySelector(".bcg-header-banner");
      var hud = root.querySelector(".bcg-hud-container");
      var searchBar = root.querySelector(".bcg-search-bar");
      var matrixWrapper = root.querySelector(".bcg-matrix-wrapper");

      // Custom Title / Subtitle
      if (customTitle || customSubtitle) {
        headerDiv.style.display = "block";
        headerDiv.innerHTML =
          (customTitle ? '<div style="font-size:' + (15 * fontMultiplier) + 'px;font-weight:700;color:' + theme.text + ';">' + customTitle + '</div>' : '') +
          (customSubtitle ? '<div style="font-size:' + (11.5 * fontMultiplier) + 'px;color:#57606a;margin-top:2px;">' + customSubtitle + '</div>' : '');
      } else {
        headerDiv.style.display = "none";
      }

      // Executive Strategic KPI HUD
      if (showExecutiveHUD && hudDensity !== "none") {
        hud.style.display = "flex";
        var starsRevenue = entityList.filter(function (d) { return d.quadrant === "stars"; }).reduce(function (a, c) { return a + c.size; }, 0);
        var cowsRevenue = entityList.filter(function (d) { return d.quadrant === "cash_cows"; }).reduce(function (a, c) { return a + c.size; }, 0);
        var coreRevenuePct = totalSizeVolume > 0 ? ((starsRevenue + cowsRevenue) / totalSizeVolume) * 100 : 0;
        var topLeader = entityList[0];

        if (hudDensity === "compact_strip") {
          hud.style.padding = "4px 16px";
          hud.style.minHeight = "32px";
          hud.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;font-size:' + (11 * fontMultiplier) + 'px;">' +
              '<div style="display:flex;align-items:center;gap:16px;">' +
                '<span><strong>Portfolio Total:</strong> ' + formatVal(totalSizeVolume) + '</span>' +
                '<span><strong>Core Engines (Stars+Cows):</strong> ' + coreRevenuePct.toFixed(1) + '%</span>' +
                '<span><strong>Leader (#1):</strong> ' + topLeader.name + ' (' + topLeader.sharePct.toFixed(1) + '%)</span>' +
                '<span><strong>Entities:</strong> ' + entityList.length + '</span>' +
              '</div>' +
              (otherSummary ? '<span style="color:#57606a;">Other (' + otherSummary.count + '): ' + formatVal(otherSummary.size) + ' (' + otherSummary.sharePct.toFixed(1) + '%)</span>' : '') +
            '</div>';
        } else {
          // Full Scorecard HUD with Interactive Quadrant Filter Chips
          hud.style.padding = "8px 16px";
          hud.style.minHeight = "44px";

          var qCounts = {
            stars: entityList.filter(function (d) { return d.quadrant === "stars"; }).length,
            cash_cows: entityList.filter(function (d) { return d.quadrant === "cash_cows"; }).length,
            question_marks: entityList.filter(function (d) { return d.quadrant === "question_marks"; }).length,
            dogs: entityList.filter(function (d) { return d.quadrant === "dogs"; }).length
          };

          var chipsHtml = [
            '<span class="bcg-chip active" data-q="all" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #1a73e8;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:#1a73e8;cursor:pointer;">All (' + entityList.length + ')</span>',
            '<span class="bcg-chip" data-q="stars" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:' + QUADRANT_DEFS.stars.color + ';cursor:pointer;">' + QUADRANT_DEFS.stars.emoji + ' Stars (' + qCounts.stars + ')</span>',
            '<span class="bcg-chip" data-q="cash_cows" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:' + QUADRANT_DEFS.cash_cows.color + ';cursor:pointer;">' + QUADRANT_DEFS.cash_cows.emoji + ' Cows (' + qCounts.cash_cows + ')</span>',
            '<span class="bcg-chip" data-q="question_marks" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:' + QUADRANT_DEFS.question_marks.color + ';cursor:pointer;">' + QUADRANT_DEFS.question_marks.emoji + ' ? (' + qCounts.question_marks + ')</span>',
            '<span class="bcg-chip" data-q="dogs" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:' + QUADRANT_DEFS.dogs.color + ';cursor:pointer;">' + QUADRANT_DEFS.dogs.emoji + ' Dogs (' + qCounts.dogs + ')</span>'
          ].join("");

          hud.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;flex-wrap:wrap;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:14px;">' +
                '<div>' +
                  '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Portfolio Value</div>' +
                  '<div style="font-size:' + (17 * fontMultiplier) + 'px;font-weight:700;color:#1f2328;letter-spacing:-0.02em;">' + formatVal(totalSizeVolume) + '</div>' +
                '</div>' +
                '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                '<div>' +
                  '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Core Cash Engines</div>' +
                  '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:600;color:' + theme.stars + ';">' + coreRevenuePct.toFixed(1) + '% <span style="font-size:10.5px;color:#57606a;font-weight:400;">(Stars + Cows)</span></div>' +
                '</div>' +
                '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                '<div>' +
                  '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Leading Portfolio Title (#1)</div>' +
                  '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:600;color:#24292f;">' + topLeader.name + ' <span style="font-size:10.5px;color:#57606a;font-weight:400;">(' + topLeader.sharePct.toFixed(1) + '%)</span></div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chipsHtml + '</div>' +
            '</div>';

          // Chip click handler for quadrant filtering
          hud.querySelectorAll(".bcg-chip").forEach(function (chip) {
            chip.addEventListener("click", function () {
              hud.querySelectorAll(".bcg-chip").forEach(function (c) {
                c.style.borderColor = "#d0d7de";
                c.classList.remove("active");
              });
              this.style.borderColor = "#1a73e8";
              this.classList.add("active");
              self._selectedQuadrant = this.getAttribute("data-q");
              applyQuadrantFilter();
            });
          });
        }
      } else {
        hud.style.display = "none";
      }

      // Search Bar
      if (showSearch) {
        searchBar.style.display = "flex";
        searchBar.innerHTML =
          '<div style="display:flex;align-items:center;gap:8px;width:100%;max-width:320px;">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" fill="#57606a"><path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 0-1.06 1.06l3.65 3.65a.75.75 0 1 0 1.06-1.06l-3.65-3.65Z"></path></svg>' +
            '<input type="text" class="bcg-search-input" placeholder="Search entity, genre, or quadrant..." value="' + (self._searchFilter || "") + '" style="width:100%;border:none;outline:none;font-size:' + (11.5 * fontMultiplier) + 'px;color:#24292f;background:transparent;" />' +
          '</div>' +
          '<div style="font-size:' + (11 * fontMultiplier) + 'px;color:#57606a;">' +
            '<span style="display:inline-flex;align-items:center;gap:4px;">' +
              'X Threshold: <strong>' + formatVal(xBoundary, "compact_num") + '</strong> &bull; Y Threshold: <strong>' + formatVal(yBoundary, "compact_num") + '</strong>' +
            '</span>' +
          '</div>';

        var sInput = searchBar.querySelector(".bcg-search-input");
        sInput.addEventListener("input", function (e) {
          self._searchFilter = e.target.value.toLowerCase().trim();
          applyQuadrantFilter();
        });
      } else {
        searchBar.style.display = "none";
      }

      // Clean matrix wrapper
      matrixWrapper.innerHTML = "";
      var width = matrixWrapper.clientWidth || 800;
      var height = matrixWrapper.clientHeight || 500;

      // Tooltip Element
      var tooltip = d3.select("body").select(".bcg-tooltip");
      if (tooltip.empty()) {
        tooltip = d3.select("body")
          .append("div")
          .attr("class", "bcg-tooltip")
          .style("position", "absolute")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("background", "rgba(255, 255, 255, 0.98)")
          .style("border", "1px solid #d0d7de")
          .style("border-radius", "8px")
          .style("padding", "10px 14px")
          .style("box-shadow", "0 8px 24px rgba(140, 149, 159, 0.28)")
          .style("font-family", "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif")
          .style("display", "none")
          .style("min-width", "200px");
      }

      function showTooltip(event, d) {
        var qDef = QUADRANT_DEFS[d.quadrant];
        tooltip.style("display", "block")
          .html(
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;">' +
              '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:700;color:#1f2328;">' + d.name + '</div>' +
              '<div style="font-size:' + (10 * fontMultiplier) + 'px;font-weight:700;color:' + qDef.color + ';background:' + qDef.bgLight + ';border:1px solid ' + qDef.borderLight + ';padding:2px 6px;border-radius:10px;">' + qDef.emoji + ' ' + qDef.name + '</div>' +
            '</div>' +
            (d.group ? '<div style="font-size:' + (10.5 * fontMultiplier) + 'px;color:#57606a;margin-bottom:6px;">' + d.group + '</div>' : '') +
            '<div style="display:flex;justify-content:space-between;gap:12px;font-size:' + (11 * fontMultiplier) + 'px;margin-bottom:3px;">' +
              '<span style="color:#57606a;">' + customXLabel + ':</span>' +
              '<span style="font-weight:600;">' + formatVal(d.x, "compact_num") + ' <span style="font-size:9.5px;color:#57606a;">(Thresh: ' + formatVal(xBoundary, "compact_num") + ')</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;gap:12px;font-size:' + (11 * fontMultiplier) + 'px;margin-bottom:3px;">' +
              '<span style="color:#57606a;">' + customYLabel + ':</span>' +
              '<span style="font-weight:600;">' + formatVal(d.y, "compact_num") + ' <span style="font-size:9.5px;color:#57606a;">(Thresh: ' + formatVal(yBoundary, "compact_num") + ')</span></span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;gap:12px;font-size:' + (11 * fontMultiplier) + 'px;padding-top:4px;border-top:1px dashed #e1e4e8;">' +
              '<span style="color:#57606a;">' + (sizeMeas.label || sizeMeas.name) + ':</span>' +
              '<span style="font-weight:700;color:#1f2328;">' + formatVal(d.size) + ' (' + d.sharePct.toFixed(1) + '%)</span>' +
            '</div>' +
            '<div style="font-size:' + (10 * fontMultiplier) + 'px;color:' + qDef.color + ';font-weight:600;margin-top:5px;">Strategy: ' + qDef.action + '</div>' +
            (d.links && d.links.length ? '<div style="font-size:' + (10 * fontMultiplier) + 'px;color:#0969da;margin-top:6px;padding-top:4px;border-top:1px solid #f0f2f5;">Click to drill \u2192</div>' : '')
          );
        posTooltip(event);
      }

      function posTooltip(event) {
        var pad = 14;
        var x = event.pageX + pad;
        var y = event.pageY + pad;
        var node = tooltip.node();
        if (node) {
          var w = node.offsetWidth || 200;
          var h = node.offsetHeight || 120;
          if (x + w > window.innerWidth - 10) x = event.pageX - w - pad;
          if (y + h > window.innerHeight - 10) y = event.pageY - h - pad;
        }
        tooltip.style("left", x + "px").style("top", y + "px");
      }

      function hideTooltip() { tooltip.style("display", "none"); }

      function openDrill(event, d) {
        if (!d || !d.links || !d.links.length) return;
        if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
          LookerCharts.Utils.openDrillMenu({ links: d.links, event: event });
        }
      }

      // ==========================================
      // VIEW MODE 1 & 2: D3 SVG Matrix / Scatter
      // ==========================================
      if (layoutMode === "quadrant_matrix" || layoutMode === "bubble_scatter") {
        var margin = { top: 40, right: 36, bottom: 48, left: 64 };
        var innerW = Math.max(200, width - margin.left - margin.right);
        var innerH = Math.max(160, height - margin.top - margin.bottom);

        var svg = d3.select(matrixWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .style("display", "block");

        // Scales
        var minX = d3.min(xVals) || 0;
        var maxX = d3.max(xVals) || 10;
        var xDomainMin = Math.min(minX * 0.85, xBoundary * 0.7);
        var xDomainMax = Math.max(maxX * 1.15, xBoundary * 1.3);

        var minY = d3.min(yVals) || 0;
        var maxY = d3.max(yVals) || 10;
        var yDomainMin = Math.min(minY * 0.85, yBoundary * 0.7);
        var yDomainMax = Math.max(maxY * 1.15, yBoundary * 1.3);

        var xScale = d3.scaleLinear().domain([xDomainMin, xDomainMax]).range([0, innerW]);
        var yScale = d3.scaleLinear().domain([yDomainMin, yDomainMax]).range([innerH, 0]);

        var maxSizeVal = d3.max(entityList, function (d) { return d.size; }) || 1;
        var rScale = d3.scaleSqrt().domain([0, maxSizeVal]).range([minR, maxR]);

        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xSplit = Math.max(0, Math.min(innerW, xScale(xBoundary)));
        var ySplit = Math.max(0, Math.min(innerH, yScale(yBoundary)));

        // 1. Shaded Quadrant Background Cards (in quadrant_matrix mode)
        if (layoutMode === "quadrant_matrix") {
          var quadBgG = g.append("g").attr("class", "bcg-quad-bgs");

          // Top-Right: Stars (High X, High Y)
          quadBgG.append("rect")
            .attr("x", xSplit)
            .attr("y", 0)
            .attr("width", innerW - xSplit)
            .attr("height", ySplit)
            .attr("fill", QUADRANT_DEFS.stars.bgLight);

          // Top-Left: Question Marks (Low X, High Y)
          quadBgG.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", xSplit)
            .attr("height", ySplit)
            .attr("fill", QUADRANT_DEFS.question_marks.bgLight);

          // Bottom-Right: Cash Cows (High X, Low Y)
          quadBgG.append("rect")
            .attr("x", xSplit)
            .attr("y", ySplit)
            .attr("width", innerW - xSplit)
            .attr("height", innerH - ySplit)
            .attr("fill", QUADRANT_DEFS.cash_cows.bgLight);

          // Bottom-Left: Dogs (Low X, Low Y)
          quadBgG.append("rect")
            .attr("x", 0)
            .attr("y", ySplit)
            .attr("width", xSplit)
            .attr("height", innerH - ySplit)
            .attr("fill", QUADRANT_DEFS.dogs.bgLight);

          // Quadrant Header Watermarks
          var wm = [
            { x: xSplit + 12, y: 22, text: "\u2B50 STARS", color: QUADRANT_DEFS.stars.color },
            { x: 12, y: 22, text: "\u2753 QUESTION MARKS", color: QUADRANT_DEFS.question_marks.color },
            { x: xSplit + 12, y: ySplit + 22, text: "\ud83d\udc04 CASH COWS", color: QUADRANT_DEFS.cash_cows.color },
            { x: 12, y: ySplit + 22, text: "\ud83d\udc36 DOGS", color: QUADRANT_DEFS.dogs.color }
          ];

          wm.forEach(function (w) {
            quadBgG.append("text")
              .attr("x", w.x)
              .attr("y", w.y)
              .attr("fill", w.color)
              .attr("font-size", (11 * fontMultiplier) + "px")
              .attr("font-weight", "800")
              .attr("letter-spacing", "0.06em")
              .attr("opacity", 0.75)
              .text(w.text);
          });
        }

        // 2. Axes Gridlines
        var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) { return formatVal(d, "compact_num"); });
        var yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(function (d) { return formatVal(d, "compact_num"); });

        g.append("g")
          .attr("class", "bcg-axis bcg-x-axis")
          .attr("transform", "translate(0," + innerH + ")")
          .call(xAxis)
          .call(function (axis) {
            axis.select(".domain").attr("stroke", "#d0d7de");
            axis.selectAll(".tick line").attr("stroke", "#e1e4e8");
            axis.selectAll(".tick text").attr("fill", "#57606a").attr("font-size", (10 * fontMultiplier) + "px");
          });

        g.append("g")
          .attr("class", "bcg-axis bcg-y-axis")
          .call(yAxis)
          .call(function (axis) {
            axis.select(".domain").attr("stroke", "#d0d7de");
            axis.selectAll(".tick line").attr("stroke", "#e1e4e8");
            axis.selectAll(".tick text").attr("fill", "#57606a").attr("font-size", (10 * fontMultiplier) + "px");
          });

        // Axis Titles
        g.append("text")
          .attr("x", innerW / 2)
          .attr("y", innerH + 36)
          .attr("text-anchor", "middle")
          .attr("fill", "#24292f")
          .attr("font-size", (11.5 * fontMultiplier) + "px")
          .attr("font-weight", "600")
          .text(customXLabel + " \u2192");

        g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -innerH / 2)
          .attr("y", -46)
          .attr("text-anchor", "middle")
          .attr("fill", "#24292f")
          .attr("font-size", (11.5 * fontMultiplier) + "px")
          .attr("font-weight", "600")
          .text(customYLabel + " \u2192");

        // 3. Boundary Crosshair Lines
        if (showThresholdLines) {
          var threshG = g.append("g").attr("class", "bcg-thresholds");

          // Vertical Threshold Line
          threshG.append("line")
            .attr("x1", xSplit)
            .attr("x2", xSplit)
            .attr("y1", 0)
            .attr("y2", innerH)
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 1.4)
            .attr("stroke-dasharray", "4,3")
            .attr("opacity", 0.65);

          // Horizontal Threshold Line
          threshG.append("line")
            .attr("x1", 0)
            .attr("x2", innerW)
            .attr("y1", ySplit)
            .attr("y2", ySplit)
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 1.4)
            .attr("stroke-dasharray", "4,3")
            .attr("opacity", 0.65);
        }

        // 4. Bubbles Rendering
        var bubbleG = g.append("g").attr("class", "bcg-bubbles");

        var bubbles = bubbleG.selectAll("circle")
          .data(displayEntities)
          .enter()
          .append("circle")
          .attr("class", function (d) { return "bcg-bubble bcg-q-" + d.quadrant; })
          .attr("cx", function (d) { return xScale(d.x); })
          .attr("cy", function (d) { return yScale(d.y); })
          .attr("r", function (d) { return rScale(d.size); })
          .attr("fill", function (d) { return d.color; })
          .attr("fill-opacity", 0.76)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseenter", function (event, d) {
            d3.select(this).attr("fill-opacity", 1.0).attr("stroke", "#1f2328").attr("stroke-width", 2.2);
            showTooltip(event, d);
          })
          .on("mousemove", function (event) { posTooltip(event); })
          .on("mouseleave", function () {
            d3.select(this).attr("fill-opacity", 0.76).attr("stroke", "#ffffff").attr("stroke-width", 1.5);
            hideTooltip();
          })
          .on("click", function (event, d) { openDrill(event, d); });

        // 5. Data Labels (Leader names or all)
        if (labelDensity !== "hidden") {
          var labelsG = g.append("g").attr("class", "bcg-labels").style("pointer-events", "none");
          var labelCandidates = labelDensity === "leaders_only" ? displayEntities.slice(0, 10) : displayEntities;

          labelsG.selectAll("text")
            .data(labelCandidates)
            .enter()
            .append("text")
            .attr("class", function (d) { return "bcg-lbl bcg-lbl-q-" + d.quadrant; })
            .attr("x", function (d) { return xScale(d.x); })
            .attr("y", function (d) { return yScale(d.y) - rScale(d.size) - 4; })
            .attr("text-anchor", "middle")
            .attr("font-size", (10 * fontMultiplier) + "px")
            .attr("font-weight", "700")
            .attr("fill", "#1f2328")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2.5)
            .attr("paint-order", "stroke")
            .text(function (d) { return d.name; });
        }

      } else {
        // ==========================================
        // VIEW MODE 3: Strategic Leaderboard Table
        // ==========================================
        var tblContainer = document.createElement("div");
        tblContainer.className = "bcg-table-container";
        tblContainer.style.width = "100%";
        tblContainer.style.height = "100%";
        tblContainer.style.overflow = "auto";
        tblContainer.style.padding = "12px 16px";

        var rowsHtml = displayEntities.map(function (d) {
          var qDef = QUADRANT_DEFS[d.quadrant];
          return (
            '<tr class="bcg-tbl-row" data-q="' + d.quadrant + '" style="border-bottom:1px solid #f0f2f5;font-size:' + (12 * fontMultiplier) + 'px;">' +
              '<td style="padding:8px 12px;font-weight:700;color:#57606a;width:32px;">#' + d.rank + '</td>' +
              '<td style="padding:8px 12px;font-weight:600;color:#1f2328;">' +
                '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + d.color + ';margin-right:6px;"></span>' +
                d.name +
              '</td>' +
              '<td style="padding:8px 12px;color:#57606a;">' + (d.group || "") + '</td>' +
              '<td style="padding:8px 12px;">' +
                '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-weight:700;font-size:' + (10.5 * fontMultiplier) + 'px;color:' + qDef.color + ';background:' + qDef.bgLight + ';border:1px solid ' + qDef.borderLight + ';">' +
                  qDef.emoji + ' ' + qDef.name +
                '</span>' +
              '</td>' +
              '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + formatVal(d.x, "compact_num") + '</td>' +
              '<td style="padding:8px 12px;text-align:right;font-weight:600;">' + formatVal(d.y, "compact_num") + '</td>' +
              '<td style="padding:8px 12px;text-align:right;font-weight:700;color:#1f2328;">' + formatVal(d.size) + '</td>' +
              '<td style="padding:8px 12px;text-align:right;color:#57606a;">' + d.sharePct.toFixed(1) + '%</td>' +
              '<td style="padding:8px 12px;font-weight:600;color:' + qDef.color + ';">' + qDef.action + '</td>' +
            '</tr>'
          );
        }).join("");

        tblContainer.innerHTML =
          '<table style="width:100%;border-collapse:collapse;text-align:left;font-family:inherit;">' +
            '<thead>' +
              '<tr style="border-bottom:2px solid #e1e4e8;font-size:' + (11 * fontMultiplier) + 'px;color:#57606a;text-transform:uppercase;letter-spacing:0.04em;">' +
                '<th style="padding:8px 12px;">#</th>' +
                '<th style="padding:8px 12px;">Portfolio Entity</th>' +
                '<th style="padding:8px 12px;">Category / Genre</th>' +
                '<th style="padding:8px 12px;">Quadrant Classification</th>' +
                '<th style="padding:8px 12px;text-align:right;">' + customXLabel + '</th>' +
                '<th style="padding:8px 12px;text-align:right;">' + customYLabel + '</th>' +
                '<th style="padding:8px 12px;text-align:right;">' + (sizeMeas.label || sizeMeas.name) + '</th>' +
                '<th style="padding:8px 12px;text-align:right;">Share %</th>' +
                '<th style="padding:8px 12px;">Strategic Action</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>';

        matrixWrapper.appendChild(tblContainer);
      }

      // Filter and search application
      function applyQuadrantFilter() {
        var q = self._selectedQuadrant || "all";
        var s = (self._searchFilter || "").toLowerCase();

        if (layoutMode === "quadrant_matrix" || layoutMode === "bubble_scatter") {
          var svgEl = d3.select(matrixWrapper).select("svg");
          svgEl.selectAll(".bcg-bubble")
            .attr("opacity", function (d) {
              var matchQ = (q === "all" || d.quadrant === q);
              var matchS = (!s || d.name.toLowerCase().indexOf(s) !== -1 || (d.group && d.group.toLowerCase().indexOf(s) !== -1));
              return (matchQ && matchS) ? 1.0 : 0.12;
            })
            .style("pointer-events", function (d) {
              var matchQ = (q === "all" || d.quadrant === q);
              var matchS = (!s || d.name.toLowerCase().indexOf(s) !== -1 || (d.group && d.group.toLowerCase().indexOf(s) !== -1));
              return (matchQ && matchS) ? "auto" : "none";
            });

          svgEl.selectAll(".bcg-labels text")
            .attr("opacity", function (d) {
              var matchQ = (q === "all" || d.quadrant === q);
              var matchS = (!s || d.name.toLowerCase().indexOf(s) !== -1 || (d.group && d.group.toLowerCase().indexOf(s) !== -1));
              return (matchQ && matchS) ? 1.0 : 0.0;
            });
        } else {
          // Table filter
          var rows = matrixWrapper.querySelectorAll(".bcg-tbl-row");
          rows.forEach(function (row) {
            var rowQ = row.getAttribute("data-q");
            var rowText = row.innerText.toLowerCase();
            var matchQ = (q === "all" || rowQ === q);
            var matchS = (!s || rowText.indexOf(s) !== -1);
            row.style.display = (matchQ && matchS) ? "" : "none";
          });
        }
      }

      if (self._selectedQuadrant || self._searchFilter) {
        applyQuadrantFilter();
      }

      if (typeof done === "function") done();
    }
  });
})();
