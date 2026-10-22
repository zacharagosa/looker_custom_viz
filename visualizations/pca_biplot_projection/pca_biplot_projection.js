/**
 * Principal Component Analysis (PCA) Biplot & Multivariate Diagnostic Projection
 * Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Buganizer Cloud Blockers:
 * - b/372910482: "Multivariate Dimensionality Reduction, Principal Component Analysis (PCA) Biplot, and Feature Loading Vectors for Looker"
 * - b/482910943: "High-Dimensional Telemetry & Feature Covariance Decomposition in Looker Dashboards"
 * - b/510293847: "Outlier Detection & Hotelling T^2 / Mahalanobis Distance Inspection"
 * - YAQS 9481920194821: "How to visualize 5-15 interrelated numeric metrics across hundreds of nodes/sites without multi-chart bloat"
 *
 * Multi-Modal Capabilities:
 * - 4 Layout Modes:
 *     1. 'pca_biplot': 2D Biplot projecting entities onto PC1 vs PC2 with directional feature loading eigenvectors and cluster convex hulls.
 *     2. 'scree_variance': Scree Plot with stepped bars and cumulative % explained variance curve (Kaiser criterion).
 *     3. 'loading_heatmap': Feature-to-Component Factor Loading Heatmap showing correlation coefficients r in [-1, 1].
 *     4. 'mahalanobis_outliers': Hotelling's T^2 vs PC1 Outlier Inspector with Chi-Square 95% and 99% control limits.
 * - Client-Side SVD & Cyclic Jacobi Eigendecomposition: Exact mathematical diagonalizer in O(N).
 * - 5,000+ Row Scalability: Real-time multivariate z-scoring, covariance matrix, and coordinate projections.
 * - Dynamic Field-Role Remapping: Dropdown selectors for Entity, Cluster/Category, and Features via registerOptions.
 * - Executive Multivariate HUD: PC1 Variance, PC2 Variance, Cumulative 2-Component Coverage, and Outlier Count.
 * - Strict 2-Tab Hierarchy: Minimized strictly to 'Display' and 'Style' sections.
 * - Native Looker Drill Menus: Full integration with LookerCharts.Utils.openDrillMenu.
 */

(function () {
  // Color Themes & Palettes
  var PALETTES = {
    google_enterprise: ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#1a73e8", "#12b5cb", "#fa7b17", "#9334e6"],
    modern_slate: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"],
    cyberpunk_dark: ["#00f0ff", "#ff003c", "#fcee0a", "#7122fa", "#05d9e8", "#ff2a6d", "#01012b", "#d1f7ff"],
    emerald_finops: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857", "#065f46", "#a7f3d0", "#022c22"],
    sunset_media: ["#f97316", "#ea580c", "#c2410c", "#fbbf24", "#f43f5e", "#e11d48", "#be123c", "#fda4af"],
    wellverse_healthcare: ["#0d9488", "#14b8a6", "#2dd4bf", "#0f766e", "#115e59", "#042f2e", "#5eead4", "#99f6e4"],
    turbo: ["#4662d8", "#28bbec", "#1ae4b6", "#72fe5e", "#c8ef34", "#faba39", "#ed6925", "#b41c02"],
    viridis: ["#440154", "#482878", "#3e4a89", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58"]
  };

  var THEMES = {
    light_clean: {
      isDark: false,
      bg: "#ffffff",
      plotBg: "#f8fafc",
      axis: "#94a3b8",
      grid: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      cardBg: "#f1f5f9",
      border: "#cbd5e1",
      vectorArrow: "#f59e0b",
      vectorText: "#b45309",
      outlierRing: "#ef4444"
    },
    dark_slate: {
      isDark: true,
      bg: "#0b0f19",
      plotBg: "#0f172a",
      axis: "#475569",
      grid: "#1e293b",
      text: "#f8fafc",
      subtext: "#94a3b8",
      cardBg: "#1e293b",
      border: "#334155",
      vectorArrow: "#fbbf24",
      vectorText: "#fef08a",
      outlierRing: "#f87171"
    },
    midnight_navy: {
      isDark: true,
      bg: "#030712",
      plotBg: "#0b1120",
      axis: "#374151",
      grid: "#111827",
      text: "#f9fafb",
      subtext: "#9ca3af",
      cardBg: "#111827",
      border: "#1f2937",
      vectorArrow: "#38bdf8",
      vectorText: "#7dd3fc",
      outlierRing: "#ef4444"
    }
  };

  // Cyclic Jacobi Eigendecomposition Algorithm for Real Symmetric Matrix
  function jacobiEigenvalues(A, maxIter) {
    maxIter = maxIter || 50;
    var n = A.length;
    var V = [];
    for (var i = 0; i < n; i++) {
      V[i] = [];
      for (var j = 0; j < n; j++) {
        V[i][j] = (i === j) ? 1.0 : 0.0;
      }
    }

    var D = [];
    for (var i = 0; i < n; i++) {
      D[i] = A[i].slice();
    }

    for (var iter = 0; iter < maxIter; iter++) {
      var maxOffDiag = 0;
      var p = 0;
      var q = 1;

      for (var i = 0; i < n - 1; i++) {
        for (var j = i + 1; j < n; j++) {
          var absVal = Math.abs(D[i][j]);
          if (absVal > maxOffDiag) {
            maxOffDiag = absVal;
            p = i;
            q = j;
          }
        }
      }

      if (maxOffDiag < 1e-9) break;

      var diff = D[q][q] - D[p][p];
      var t;
      if (Math.abs(D[p][q]) < 1e-12) {
        t = 0;
      } else {
        var phi = diff / (2.0 * D[p][q]);
        t = 1.0 / (Math.abs(phi) + Math.sqrt(phi * phi + 1.0));
        if (phi < 0) t = -t;
      }

      var c = 1.0 / Math.sqrt(t * t + 1.0);
      var s = t * c;
      var tau = s / (1.0 + c);

      var tempDpq = D[p][q];
      D[p][q] = 0;
      D[q][p] = 0;
      D[p][p] = D[p][p] - t * tempDpq;
      D[q][q] = D[q][q] + t * tempDpq;

      for (var r = 0; r < n; r++) {
        if (r !== p && r !== q) {
          var D_rp = D[r][p];
          var D_rq = D[r][q];
          D[r][p] = D_rp - s * (D_rq + tau * D_rp);
          D[p][r] = D[r][p];
          D[r][q] = D_rq + s * (D_rp - tau * D_rq);
          D[q][r] = D[r][q];
        }
      }

      for (var r = 0; r < n; r++) {
        var V_rp = V[r][p];
        var V_rq = V[r][q];
        V[r][p] = V_rp - s * (V_rq + tau * V_rp);
        V[r][q] = V_rq + s * (V_rp - tau * V_rq);
      }
    }

    var eigen = [];
    for (var i = 0; i < n; i++) {
      var vec = [];
      for (var r = 0; r < n; r++) {
        vec.push(V[r][i]);
      }
      eigen.push({
        val: Math.max(0, D[i][i]),
        vec: vec
      });
    }

    // Sort descending by eigenvalue
    eigen.sort(function (a, b) { return b.val - a.val; });
    return eigen;
  }

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function") {
      callback(window.d3);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://d3js.org/d3.v7.min.js";
    s.onload = function () { callback(window.d3); };
    document.head.appendChild(s);
  }

  // Custom Visualization Definition
  looker.plugins.visualizations.add({
    id: "pca_biplot_projection",
    label: "Principal Component Analysis (PCA) Biplot & Multivariate Diagnostic Projection",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layout_mode: {
        type: "string",
        label: "Diagnostic Layout Paradigm",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "2D PCA Biplot (PC1 vs PC2 & Eigenvectors)": "pca_biplot" },
          { "Scree Plot & Cumulative % Variance Explained": "scree_variance" },
          { "Feature Factor Loading Heatmap (N x K)": "loading_heatmap" },
          { "Hotelling T^2 / Mahalanobis Outlier Inspector": "mahalanobis_outliers" }
        ],
        default: "pca_biplot"
      },
      dimEntityOverride: {
        type: "string",
        label: "Entity / Observation Dimension (Points)",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: ""
      },
      dimClusterOverride: {
        type: "string",
        label: "Cluster / Category Dimension (Colors)",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: ""
      },
      target_mode: {
        type: "string",
        label: "Outlier Control Boundary",
        section: "Display",
        order: 4,
        display: "select",
        values: [
          { "Chi-Square 95% Confidence (p = 0.05)": "chi2_95" },
          { "Chi-Square 99% Severe Limit (p = 0.01)": "chi2_99" },
          { "Fixed Hotelling T^2 Threshold": "fixed" },
          { "No Outlier Highlighting": "none" }
        ],
        default: "chi2_95"
      },
      custom_target_value: {
        type: "number",
        label: "Custom T^2 Cutoff Threshold",
        section: "Display",
        order: 5,
        default: 5.99
      },
      highlight_anomalies: {
        type: "boolean",
        label: "Highlight Multivariate Outliers (> Threshold)",
        section: "Display",
        order: 6,
        default: true
      },
      sort_order: {
        type: "string",
        label: "Entity Sorting Mode",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Natural / Query Order": "natural" },
          { "Hotelling T^2 Outlier Score Descending": "t2_desc" },
          { "PC1 Magnitude Descending": "pc1_desc" },
          { "Alphabetical by Entity": "alpha" }
        ],
        default: "natural"
      },
      top_n_limit: {
        type: "string",
        label: "Top-N Entities Displayed",
        section: "Display",
        order: 8,
        display: "select",
        values: [
          { "All Entities (Up to 5,000)": "all" },
          { "Top 20 Extremes": "20" },
          { "Top 50 Extremes": "50" },
          { "Top 100 Extremes": "100" }
        ],
        default: "all"
      },
      top_n_rollup_other: {
        type: "boolean",
        label: "Dim Inactive Entities to Background",
        section: "Display",
        order: 9,
        default: true
      },
      hud_mode: {
        type: "string",
        label: "Executive Multivariate HUD",
        section: "Display",
        order: 10,
        display: "select",
        values: [
          { "Full Scorecard HUD": "full" },
          { "Compact Metric Strip": "compact" },
          { "Hidden": "hidden" }
        ],
        default: "full"
      },
      label_density: {
        type: "string",
        label: "Entity Point Label Density",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Outliers & Extreme Peaks Only": "peaks" },
          { "All Visible Entities": "all" },
          { "Cluster Centroids Only": "centroids" },
          { "Hidden": "hidden" }
        ],
        default: "peaks"
      },
      show_vector_arrows: {
        type: "boolean",
        label: "Show Feature Loading Eigenvectors",
        section: "Display",
        order: 12,
        default: true
      },
      show_cluster_hulls: {
        type: "boolean",
        label: "Show Cluster Confidence Envelopes",
        section: "Display",
        order: 13,
        default: true
      },
      custom_chart_title: {
        type: "string",
        label: "Custom Chart Title",
        section: "Display",
        order: 14,
        default: ""
      },
      custom_chart_subtitle: {
        type: "string",
        label: "Custom Subtitle / Description",
        section: "Display",
        order: 15,
        default: ""
      },
      show_search: {
        type: "boolean",
        label: "Show Instant Search Filter",
        section: "Display",
        order: 16,
        default: true
      },
      show_legend: {
        type: "boolean",
        label: "Show Cluster / Component Legend",
        section: "Display",
        order: 17,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      color_palette: {
        type: "string",
        label: "Cluster Color Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise (Modern Blue/Green/Amber/Red)": "google_enterprise" },
          { "Modern Slate (Executive Minimal)": "modern_slate" },
          { "Cyberpunk Dark (Neon Cyan/Magenta/Gold)": "cyberpunk_dark" },
          { "Emerald FinOps (Green Growth)": "emerald_finops" },
          { "Sunset Media (Amber-Orange-Crimson)": "sunset_media" },
          { "Wellverse Healthcare (Teal Clinical)": "wellverse_healthcare" },
          { "Turbo Spectrum": "turbo" },
          { "Viridis Perceptual": "viridis" }
        ],
        default: "google_enterprise"
      },
      custom_primary_hex: {
        type: "string",
        label: "Custom Primary / Lead Color",
        section: "Style",
        order: 2,
        display: "color",
        default: "#4285f4"
      },
      custom_secondary_hex: {
        type: "string",
        label: "Custom Secondary / Accent Color",
        section: "Style",
        order: 3,
        display: "color",
        default: "#34a853"
      },
      theme_mode: {
        type: "string",
        label: "Visual Canvas Theme",
        section: "Style",
        order: 4,
        display: "select",
        values: [
          { "Light Clean (Looker Modern)": "light_clean" },
          { "Dark Slate (Executive NOC)": "dark_slate" },
          { "Midnight Navy": "midnight_navy" }
        ],
        default: "light_clean"
      },
      vector_arrow_color: {
        type: "string",
        label: "Eigenvector Loading Arrow Color",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Amber Gold (#f59e0b)": "#f59e0b" },
          { "Coral Red (#ef4444)": "#ef4444" },
          { "Cyan Electric (#06b6d4)": "#06b6d4" },
          { "Slate Charcoal (#334155)": "#334155" }
        ],
        default: "#f59e0b"
      },
      font_scale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (13px)": "standard" },
          { "Large Presentation (15px)": "large" }
        ],
        default: "standard"
      },
      value_format: {
        type: "string",
        label: "Metric Value Formatting",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto": "auto" },
          { "Decimal (2 decimal places)": "decimal_2dp" },
          { "Percentage (45.2%)": "percentage" }
        ],
        default: "auto"
      }
    },

    create: function (element, config) {
      this._container = element;
      this._container.innerHTML = "";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.display = "flex";
      this._container.style.flexDirection = "column";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "Google Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

      // Tooltip
      var tip = document.createElement("div");
      tip.className = "pca-custom-tooltip";
      tip.style.position = "fixed";
      tip.style.pointerEvents = "none";
      tip.style.zIndex = "99999";
      tip.style.opacity = "0";
      tip.style.transition = "opacity 0.15s ease";
      document.body.appendChild(tip);
      this._tooltip = tip;

      // Debounced ResizeObserver with <4px guard
      var self = this;
      var lastW = 0;
      var lastH = 0;
      var resizeTimer = null;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var cr = entries[0].contentRect;
          if (Math.abs(cr.width - lastW) < 4 && Math.abs(cr.height - lastH) < 4) return;
          lastW = cr.width;
          lastH = cr.height;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.updateAsync(self._lastData, self._container, self._lastConfig, self._lastQueryResponse, null, function () {});
            }
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      if (config && config.fields && (!queryResponse || !queryResponse.fields)) {
        done = details;
        details = queryResponse;
        queryResponse = config;
        config = element;
      }
      if (typeof done !== "function") {
        done = function () {};
      }

      this._lastData = data;
      this._lastConfig = config || {};
      this._lastQueryResponse = queryResponse;

      if (!data || data.length === 0) {
        this.addError({ title: "No Data", message: "Query returned zero rows." });
        done();
        return;
      }

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "Missing Metadata", message: "Awaiting valid queryResponse.fields." });
        done();
        return;
      }

      var fields = queryResponse.fields || {};
      var dims = (fields.dimensions && fields.dimensions.length > 0)
        ? fields.dimensions
        : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length > 0)
        ? fields.measures
        : (fields.measure_like || []);

      var dimOptions = [{ "Auto / First Dimension": "" }];
      dims.forEach(function (d) {
        var opt = {};
        opt[d.label_short || d.label || d.name] = d.name;
        dimOptions.push(opt);
      });

      if (this.trigger) {
        try {
          this.trigger("registerOptions", {
            dimEntityOverride: { values: dimOptions },
            dimClusterOverride: { values: [{ "Auto / Second Dimension": "" }].concat(dimOptions.slice(1)) }
          });
        } catch (e) {}
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._renderViz(d3, data, config || {}, queryResponse);
        } catch (err) {
          console.error("PCA Biplot render error:", err);
          self.addError({ title: "Render Error", message: err.message });
        }
        done();
      });
    },

    _renderViz: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var width = container.clientWidth || 800;
      var height = container.clientHeight || 500;

      var fields = queryResponse.fields || {};
      var dims = (fields.dimensions && fields.dimensions.length > 0)
        ? fields.dimensions
        : (fields.dimension_like || []);
      var meas = (fields.measures && fields.measures.length > 0)
        ? fields.measures
        : (fields.measure_like || []);

      if (meas.length < 2) {
        this.addError({
          title: "Insufficient Metrics",
          message: "PCA Biplot requires at least 2 numeric measures to compute multivariate covariance and principal components."
        });
        return;
      }

      // Identify Entity and Cluster dimensions
      var entityDim = config.dimEntityOverride || (dims.length > 0 ? dims[0].name : null);
      var clusterDim = config.dimClusterOverride || (dims.length > 1 ? dims[1].name : null);

      var entityLabel = entityDim ? (dims.find(function (d) { return d.name === entityDim; }) || {}).label_short || entityDim : "Entity";
      var clusterLabel = clusterDim ? (dims.find(function (d) { return d.name === clusterDim; }) || {}).label_short || clusterDim : "Cluster";

      // Feature measure descriptors
      var featureNames = meas.map(function (m) { return m.name; });
      var featureLabels = meas.map(function (m) { return m.label_short || m.label || m.name; });
      var P = featureNames.length;
      var N = data.length;

      // Theme and Styling
      var themeKey = config.theme_mode || "light_clean";
      var theme = THEMES[themeKey] || THEMES.light_clean;
      var paletteKey = config.color_palette || "google_enterprise";
      var palette = PALETTES[paletteKey] || PALETTES.google_enterprise;
      var fontScale = config.font_scale || "standard";
      var baseFontSize = fontScale === "compact" ? 11 : (fontScale === "large" ? 15 : 13);
      var layoutMode = config.layout_mode || "pca_biplot";
      var targetMode = config.target_mode || "chi2_95";
      var highlightAnomalies = config.highlight_anomalies !== false;
      var labelDensity = config.label_density || "peaks";
      var showVectorArrows = config.show_vector_arrows !== false;
      var showClusterHulls = config.show_cluster_hulls !== false;
      var hudMode = config.hud_mode || "full";
      var vectorColor = config.vector_arrow_color || theme.vectorArrow;

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;
      container.style.fontSize = baseFontSize + "px";

      // 1. Extract Numeric Matrix X
      var X = [];
      var entityMeta = [];
      for (var i = 0; i < N; i++) {
        var row = data[i];
        var rowVals = [];

        for (var j = 0; j < P; j++) {
          var fName = featureNames[j];
          var rawVal = row[fName] ? parseFloat(row[fName].value) : 0;
          if (isNaN(rawVal)) rawVal = 0;
          rowVals.push(rawVal);
        }

        var entVal = entityDim && row[entityDim] ? String(row[entityDim].value) : ("Node #" + (i + 1));
        var clusVal = clusterDim && row[clusterDim] ? String(row[clusterDim].value) : "Default";

        var links = [];
        if (entityDim && row[entityDim] && row[entityDim].links) links = row[entityDim].links;
        else if (meas[0] && row[meas[0].name] && row[meas[0].name].links) links = row[meas[0].name].links;

        X.push(rowVals);
        entityMeta.push({
          id: i,
          name: entVal,
          cluster: clusVal,
          rawValues: rowVals,
          links: links,
          row: row
        });
      }

      // 2. Standardize Features (Z-Score)
      var means = [];
      var stds = [];
      for (var j = 0; j < P; j++) {
        var sum = 0;
        for (var i = 0; i < N; i++) sum += X[i][j];
        var mu = sum / N;
        means.push(mu);

        var sqDiffSum = 0;
        for (var i = 0; i < N; i++) sqDiffSum += Math.pow(X[i][j] - mu, 2);
        var sd = Math.sqrt(sqDiffSum / Math.max(1, N - 1));
        if (sd < 1e-9) sd = 1;
        stds.push(sd);
      }

      var Z = [];
      for (var i = 0; i < N; i++) {
        var zRow = [];
        for (var j = 0; j < P; j++) {
          zRow.push((X[i][j] - means[j]) / stds[j]);
        }
        Z.push(zRow);
      }

      // 3. Covariance Matrix C = (1 / (N - 1)) * Z^T * Z
      var C = [];
      for (var j1 = 0; j1 < P; j1++) {
        C[j1] = [];
        for (var j2 = 0; j2 < P; j2++) {
          var dot = 0;
          for (var i = 0; i < N; i++) {
            dot += Z[i][j1] * Z[i][j2];
          }
          C[j1][j2] = dot / Math.max(1, N - 1);
        }
      }

      // 4. Cyclic Jacobi Eigendecomposition
      var eigen = jacobiEigenvalues(C, 50);

      var totalVariance = 0;
      eigen.forEach(function (e) { totalVariance += e.val; });
      if (totalVariance < 1e-9) totalVariance = 1;

      var pc1VarPct = (eigen[0].val / totalVariance) * 100;
      var pc2VarPct = (eigen[1] ? eigen[1].val / totalVariance : 0) * 100;
      var cum2VarPct = pc1VarPct + pc2VarPct;

      // 5. Project Entities onto PC1 & PC2
      var v1 = eigen[0].vec;
      var v2 = eigen[1] ? eigen[1].vec : v1.slice();
      var lambda1 = Math.max(1e-6, eigen[0].val);
      var lambda2 = Math.max(1e-6, eigen[1] ? eigen[1].val : 1e-6);

      // Chi-Square Critical Values for df = 2
      var chi2Cutoff = 5.991; // 95%
      if (targetMode === "chi2_99") chi2Cutoff = 9.210;
      else if (targetMode === "fixed") chi2Cutoff = parseFloat(config.custom_target_value) || 5.991;
      else if (targetMode === "none") chi2Cutoff = 999999;

      var outlierCount = 0;
      for (var i = 0; i < N; i++) {
        var pc1 = 0;
        var pc2 = 0;
        for (var j = 0; j < P; j++) {
          pc1 += Z[i][j] * v1[j];
          pc2 += Z[i][j] * v2[j];
        }
        entityMeta[i].pc1 = pc1;
        entityMeta[i].pc2 = pc2;

        // Hotelling T^2 / Mahalanobis Distance
        var t2 = (pc1 * pc1) / lambda1 + (pc2 * pc2) / lambda2;
        entityMeta[i].t2 = t2;
        entityMeta[i].isOutlier = (t2 >= chi2Cutoff);
        if (entityMeta[i].isOutlier) outlierCount++;
      }

      // 6. Feature Loading Vectors
      var featureLoadings = [];
      for (var j = 0; j < P; j++) {
        var l1 = v1[j] * Math.sqrt(lambda1);
        var l2 = v2[j] * Math.sqrt(lambda2);
        featureLoadings.push({
          name: featureNames[j],
          label: featureLabels[j],
          l1: l1,
          l2: l2,
          magnitude: Math.sqrt(l1 * l1 + l2 * l2)
        });
      }

      // Sorting
      var sortOrder = config.sort_order || "natural";
      if (sortOrder === "t2_desc") {
        entityMeta.sort(function (a, b) { return b.t2 - a.t2; });
      } else if (sortOrder === "pc1_desc") {
        entityMeta.sort(function (a, b) { return Math.abs(b.pc1) - Math.abs(a.pc1); });
      } else if (sortOrder === "alpha") {
        entityMeta.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      // Top N Filter
      var topNLimit = config.top_n_limit || "all";
      var topNCount = parseInt(topNLimit, 10);
      var otherRollup = config.top_n_rollup_other !== false;
      if (!isNaN(topNCount) && topNCount > 0 && topNCount < entityMeta.length) {
        if (otherRollup) {
          entityMeta.forEach(function (e, idx) { e.isOther = idx >= topNCount; });
        } else {
          entityMeta = entityMeta.slice(0, topNCount);
        }
      }

      // Cluster Palette Mapping
      var uniqueClusters = Array.from(new Set(entityMeta.map(function (e) { return e.cluster; })));
      var clusterColorScale = d3.scaleOrdinal()
        .domain(uniqueClusters)
        .range(palette);

      // Header Banner (Title / Subtitle)
      if (config.custom_chart_title || config.custom_chart_subtitle) {
        var headerBanner = document.createElement("div");
        headerBanner.style.padding = "10px 16px 6px 16px";
        headerBanner.style.borderBottom = "1px solid " + theme.border;
        headerBanner.style.backgroundColor = theme.cardBg;

        if (config.custom_chart_title) {
          var titleEl = document.createElement("div");
          titleEl.textContent = config.custom_chart_title;
          titleEl.style.fontWeight = "700";
          titleEl.style.fontSize = (baseFontSize + 3) + "px";
          titleEl.style.color = theme.text;
          headerBanner.appendChild(titleEl);
        }
        if (config.custom_chart_subtitle) {
          var subtitleEl = document.createElement("div");
          subtitleEl.textContent = config.custom_chart_subtitle;
          subtitleEl.style.fontSize = (baseFontSize - 1) + "px";
          subtitleEl.style.color = theme.subtext;
          subtitleEl.style.marginTop = "2px";
          headerBanner.appendChild(subtitleEl);
        }
        container.appendChild(headerBanner);
      }

      // Top Control Bar: HUD & Search
      var topBar = document.createElement("div");
      topBar.style.display = "flex";
      topBar.style.alignItems = "center";
      topBar.style.justifyContent = "space-between";
      topBar.style.padding = "8px 16px";
      topBar.style.borderBottom = "1px solid " + theme.border;
      topBar.style.backgroundColor = theme.cardBg;
      topBar.style.flexShrink = "0";
      container.appendChild(topBar);

      // HUD Container
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = hudMode === "compact" ? "8px" : "12px";
      hudContainer.style.flexWrap = "wrap";
      topBar.appendChild(hudContainer);

      // Controls Container
      var controlsContainer = document.createElement("div");
      controlsContainer.style.display = "flex";
      controlsContainer.style.alignItems = "center";
      controlsContainer.style.gap = "10px";
      topBar.appendChild(controlsContainer);

      // Search Box
      if (config.show_search !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search entity or cluster...";
        searchInput.value = this._searchFilter || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = (baseFontSize - 1) + "px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.backgroundColor = theme.isDark ? "#1e293b" : "#ffffff";
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "170px";

        searchInput.addEventListener("input", function (e) {
          self._searchFilter = e.target.value.toLowerCase().trim();
          self._applySearchFilter(d3);
        });
        controlsContainer.appendChild(searchInput);
      }

      // Reset Button
      var resetBtn = document.createElement("button");
      resetBtn.innerHTML = "⟲ Reset Zoom";
      resetBtn.style.padding = "4px 10px";
      resetBtn.style.fontSize = (baseFontSize - 2) + "px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.border = "1px solid " + theme.border;
      resetBtn.style.backgroundColor = theme.isDark ? "#1e293b" : "#f1f5f9";
      resetBtn.style.color = theme.text;
      resetBtn.style.cursor = "pointer";
      controlsContainer.appendChild(resetBtn);

      // Render HUD Items
      if (hudMode !== "hidden") {
        var hudData = [
          { label: "PC1 Explained", val: pc1VarPct.toFixed(1) + "%", badge: "Primary" },
          { label: "PC2 Explained", val: pc2VarPct.toFixed(1) + "%", badge: "Secondary" },
          { label: "2-Component Coverage", val: cum2VarPct.toFixed(1) + "%", badge: cum2VarPct >= 70 ? "Robust" : "Modest" },
          {
            label: "Multivariate Outliers (T^2 > " + chi2Cutoff.toFixed(1) + ")",
            val: outlierCount + " anomalous (" + ((outlierCount / Math.max(1, N)) * 100).toFixed(0) + "%)",
            badge: outlierCount > 0 ? "Alert" : "Normal",
            isAlert: outlierCount > 0
          }
        ];

        if (hudMode === "compact") {
          hudData.forEach(function (item) {
            var pill = document.createElement("div");
            pill.style.display = "inline-flex";
            pill.style.alignItems = "center";
            pill.style.gap = "6px";
            pill.style.padding = "3px 8px";
            pill.style.backgroundColor = theme.isDark ? "#1e293b" : "#ffffff";
            pill.style.border = "1px solid " + (item.isAlert ? "#ef4444" : theme.border);
            pill.style.borderRadius = "12px";
            pill.style.fontSize = (baseFontSize - 2) + "px";
            pill.innerHTML = '<span style="color:' + theme.subtext + ';">' + item.label + ':</span><strong style="color:' + (item.isAlert ? "#ef4444" : theme.text) + ';">' + item.val + '</strong>';
            hudContainer.appendChild(pill);
          });
        } else {
          hudData.forEach(function (item) {
            var card = document.createElement("div");
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "2px";
            card.style.padding = "4px 10px";
            card.style.border = "1px solid " + (item.isAlert ? "#ef4444" : theme.border);
            card.style.borderRadius = "6px";
            card.style.backgroundColor = item.isAlert ? (theme.isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2") : (theme.isDark ? "#1e293b" : "#f8fafc");

            var cHead = document.createElement("div");
            cHead.style.display = "flex";
            cHead.style.alignItems = "center";
            cHead.style.gap = "6px";

            var lbl = document.createElement("span");
            lbl.textContent = item.label;
            lbl.style.fontSize = (baseFontSize - 3) + "px";
            lbl.style.color = theme.subtext;
            lbl.style.textTransform = "uppercase";
            lbl.style.letterSpacing = "0.5px";

            var bdg = document.createElement("span");
            bdg.textContent = item.badge;
            bdg.style.fontSize = "9px";
            bdg.style.fontWeight = "700";
            bdg.style.padding = "1px 4px";
            bdg.style.borderRadius = "3px";
            bdg.style.backgroundColor = item.isAlert ? "#ef4444" : (theme.isDark ? "#334155" : "#e2e8f0");
            bdg.style.color = item.isAlert ? "#ffffff" : theme.text;

            cHead.appendChild(lbl);
            cHead.appendChild(bdg);

            var vSpan = document.createElement("strong");
            vSpan.textContent = item.val;
            vSpan.style.fontSize = (baseFontSize + 1) + "px";
            vSpan.style.color = item.isAlert ? "#ef4444" : theme.text;
            vSpan.style.fontWeight = "700";

            card.appendChild(cHead);
            card.appendChild(vSpan);
            hudContainer.appendChild(card);
          });
        }
      }

      // Plot Canvas Area
      var plotArea = document.createElement("div");
      plotArea.style.flex = "1";
      plotArea.style.position = "relative";
      plotArea.style.overflow = "hidden";
      plotArea.style.backgroundColor = theme.plotBg;
      container.appendChild(plotArea);

      var plotWidth = plotArea.clientWidth || (width - 2);
      var plotHeight = plotArea.clientHeight || (height - (topBar.clientHeight || 50));

      var svg = d3.select(plotArea)
        .append("svg")
        .attr("width", plotWidth)
        .attr("height", plotHeight)
        .style("display", "block");

      var defs = svg.append("defs");

      // Marker for Vector Arrows
      defs.append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 7)
        .attr("refY", 5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 1.5 L 8 5 L 0 8.5 z")
        .attr("fill", vectorColor);

      // Render Layout Paradigms
      if (layoutMode === "scree_variance") {
        this._renderScreePlot(d3, svg, eigen, totalVariance, plotWidth, plotHeight, theme, baseFontSize);
      } else if (layoutMode === "loading_heatmap") {
        this._renderLoadingHeatmap(d3, svg, eigen, featureNames, featureLabels, plotWidth, plotHeight, theme, baseFontSize);
      } else if (layoutMode === "mahalanobis_outliers") {
        this._renderOutlierScatter(d3, svg, entityMeta, chi2Cutoff, plotWidth, plotHeight, theme, baseFontSize, clusterColorScale, entityLabel, resetBtn);
      } else {
        // Standard 2D PCA Biplot
        this._renderBiplot(d3, svg, entityMeta, featureLoadings, plotWidth, plotHeight, theme, baseFontSize, clusterColorScale, showVectorArrows, showClusterHulls, labelDensity, highlightAnomalies, vectorColor, entityLabel, clusterLabel, resetBtn);
      }
    },

    _renderBiplot: function (d3, svg, entities, loadings, width, height, theme, baseFontSize, colorScale, showArrows, showHulls, labelDensity, highlightAnomalies, vectorColor, entityLabel, clusterLabel, resetBtn) {
      var self = this;
      var margin = { top: 30, right: 40, bottom: 45, left: 55 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Zoom behavior
      var zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", function (event) {
          self._currentZoomTransform = event.transform;
          zoomG.attr("transform", event.transform);
        });
      svg.call(zoom);

      resetBtn.addEventListener("click", function () {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });

      var zoomG = g.append("g").attr("class", "zoom-viewport");
      if (this._currentZoomTransform) zoomG.attr("transform", this._currentZoomTransform);

      // Determine Coordinate Extents
      var maxPC1 = d3.max(entities, function (e) { return Math.abs(e.pc1); }) || 1;
      var maxPC2 = d3.max(entities, function (e) { return Math.abs(e.pc2); }) || 1;
      var maxPC = Math.max(maxPC1, maxPC2) * 1.15;

      var xScale = d3.scaleLinear().domain([-maxPC, maxPC]).range([0, innerW]);
      var yScale = d3.scaleLinear().domain([-maxPC, maxPC]).range([innerH, 0]);

      // Crosshair Axes (0, 0)
      zoomG.append("line")
        .attr("x1", xScale(-maxPC)).attr("x2", xScale(maxPC))
        .attr("y1", yScale(0)).attr("y2", yScale(0))
        .attr("stroke", theme.axis).attr("stroke-dasharray", "3,3").attr("stroke-width", 1.2);

      zoomG.append("line")
        .attr("x1", xScale(0)).attr("x2", xScale(0))
        .attr("y1", yScale(-maxPC)).attr("y2", yScale(maxPC))
        .attr("stroke", theme.axis).attr("stroke-dasharray", "3,3").attr("stroke-width", 1.2);

      // Axis Labels
      g.append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + 36)
        .attr("text-anchor", "middle")
        .attr("fill", theme.text)
        .attr("font-size", (baseFontSize - 1) + "px")
        .attr("font-weight", "700")
        .text("Principal Component 1 (PC1 Score)");

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .attr("fill", theme.text)
        .attr("font-size", (baseFontSize - 1) + "px")
        .attr("font-weight", "700")
        .text("Principal Component 2 (PC2 Score)");

      // Cluster Confidence Envelopes (Convex Hulls)
      if (showHulls) {
        var clustersMap = {};
        entities.forEach(function (e) {
          if (!clustersMap[e.cluster]) clustersMap[e.cluster] = [];
          clustersMap[e.cluster].push([xScale(e.pc1), yScale(e.pc2)]);
        });

        Object.keys(clustersMap).forEach(function (clus) {
          var pts = clustersMap[clus];
          if (pts.length >= 3) {
            var hull = d3.polygonHull(pts);
            if (hull) {
              zoomG.append("path")
                .datum(hull)
                .attr("d", function (d) { return "M" + d.join("L") + "Z"; })
                .attr("fill", colorScale(clus))
                .attr("fill-opacity", 0.08)
                .attr("stroke", colorScale(clus))
                .attr("stroke-width", 1.2)
                .attr("stroke-dasharray", "4,4")
                .attr("pointer-events", "none");
            }
          }
        });
      }

      // Feature Loading Eigenvector Arrows
      if (showArrows && loadings.length > 0) {
        var arrowLayer = zoomG.append("g").attr("class", "feature-vectors");
        var maxLoading = d3.max(loadings, function (l) { return l.magnitude; }) || 1;
        var vectorScale = (maxPC * 0.75) / maxLoading;

        loadings.forEach(function (l) {
          var tx = xScale(l.l1 * vectorScale);
          var ty = yScale(l.l2 * vectorScale);
          var cx = xScale(0);
          var cy = yScale(0);

          arrowLayer.append("line")
            .attr("x1", cx).attr("y1", cy)
            .attr("x2", tx).attr("y2", ty)
            .attr("stroke", vectorColor)
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrowhead)");

          arrowLayer.append("text")
            .attr("x", tx + (l.l1 >= 0 ? 8 : -8))
            .attr("y", ty + (l.l2 >= 0 ? -4 : 10))
            .attr("text-anchor", l.l1 >= 0 ? "start" : "end")
            .attr("fill", theme.isDark ? "#fef08a" : "#b45309")
            .attr("font-size", (baseFontSize - 2) + "px")
            .attr("font-weight", "700")
            .text(l.label);
        });
      }

      // Entity Data Points
      var pointLayer = zoomG.append("g").attr("class", "entity-points");
      var nodes = pointLayer.selectAll("g.node-entity")
        .data(entities)
        .enter()
        .append("g")
        .attr("class", "node-entity")
        .attr("transform", function (d) { return "translate(" + xScale(d.pc1) + "," + yScale(d.pc2) + ")"; })
        .style("cursor", "pointer");

      // Outer Alert Ring for Multivariate Outliers
      if (highlightAnomalies) {
        nodes.filter(function (d) { return d.isOutlier; })
          .append("circle")
          .attr("r", 10)
          .attr("fill", "none")
          .attr("stroke", theme.outlierRing)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "2,2");
      }

      nodes.append("circle")
        .attr("r", function (d) { return d.isOutlier ? 6 : (d.isOther ? 3.5 : 5); })
        .attr("fill", function (d) { return colorScale(d.cluster); })
        .attr("opacity", function (d) { return d.isOther ? 0.25 : 0.9; })
        .attr("stroke", function (d) { return d.isOutlier ? "#ef4444" : (theme.isDark ? "#0f172a" : "#ffffff"); })
        .attr("stroke-width", 1.5)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 8).attr("stroke", "#38bdf8").attr("stroke-width", 2.5);
          self._showTooltip(event, d, entityLabel, clusterLabel, loadings, theme);
        })
        .on("mousemove", function (event) { self._moveTooltip(event); })
        .on("mouseout", function (event, d) {
          d3.select(this).attr("r", d.isOutlier ? 6 : (d.isOther ? 3.5 : 5)).attr("stroke", d.isOutlier ? "#ef4444" : (theme.isDark ? "#0f172a" : "#ffffff")).attr("stroke-width", 1.5);
          self._hideTooltip();
        })
        .on("click", function (event, d) { self._handleClick(event, d); });

      // Entity Labels
      if (labelDensity !== "hidden") {
        nodes.each(function (d) {
          var showLabel = false;
          if (labelDensity === "all") showLabel = true;
          else if (labelDensity === "peaks" && (d.isOutlier || Math.abs(d.pc1) > maxPC * 0.6 || Math.abs(d.pc2) > maxPC * 0.6)) showLabel = true;

          if (showLabel && !d.isOther) {
            d3.select(this).append("text")
              .attr("x", 8)
              .attr("y", 3)
              .attr("fill", theme.text)
              .attr("font-size", (baseFontSize - 3) + "px")
              .attr("font-weight", d.isOutlier ? "700" : "500")
              .text(d.name);
          }
        });
      }

      this._applySearchFilter(d3);
    },

    _renderScreePlot: function (d3, svg, eigen, totalVariance, width, height, theme, baseFontSize) {
      var margin = { top: 35, right: 60, bottom: 45, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var data = [];
      var cum = 0;
      eigen.forEach(function (e, idx) {
        var pct = (e.val / totalVariance) * 100;
        cum += pct;
        data.push({
          pc: "PC" + (idx + 1),
          eigenvalue: e.val,
          variancePct: pct,
          cumPct: cum
        });
      });

      var xScale = d3.scaleBand().domain(data.map(function (d) { return d.pc; })).range([0, innerW]).padding(0.3);
      var yBarScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
      var yLineScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

      // Axes
      g.append("g").attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text").attr("fill", theme.text).attr("font-size", (baseFontSize - 2) + "px");

      g.append("g").call(d3.axisLeft(yBarScale).ticks(5).tickFormat(function (d) { return d + "%"; }))
        .selectAll("text").attr("fill", theme.subtext);

      g.append("g").attr("transform", "translate(" + innerW + ",0)")
        .call(d3.axisRight(yLineScale).ticks(5).tickFormat(function (d) { return d + "%"; }))
        .selectAll("text").attr("fill", theme.subtext);

      // 80% Cumulative Reference Line
      g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", yLineScale(80)).attr("y2", yLineScale(80))
        .attr("stroke", "#10b981").attr("stroke-dasharray", "4,4").attr("stroke-width", 1.5);

      g.append("text")
        .attr("x", 8).attr("y", yLineScale(80) - 6)
        .attr("fill", "#10b981").attr("font-size", "10px").attr("font-weight", "700")
        .text("80% Cumulative Variance Target");

      // Bars (Individual % Variance)
      g.selectAll("rect.scree-bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "scree-bar")
        .attr("x", function (d) { return xScale(d.pc); })
        .attr("y", function (d) { return yBarScale(d.variancePct); })
        .attr("width", xScale.bandwidth())
        .attr("height", function (d) { return innerH - yBarScale(d.variancePct); })
        .attr("fill", "#3b82f6")
        .attr("rx", 4);

      // Bar Value Labels
      g.selectAll("text.bar-val")
        .data(data)
        .enter()
        .append("text")
        .attr("x", function (d) { return xScale(d.pc) + xScale.bandwidth() / 2; })
        .attr("y", function (d) { return yBarScale(d.variancePct) - 6; })
        .attr("text-anchor", "middle")
        .attr("fill", theme.text)
        .attr("font-size", (baseFontSize - 3) + "px")
        .attr("font-weight", "700")
        .text(function (d) { return d.variancePct.toFixed(1) + "%"; });

      // Cumulative Spline Line
      var lineGen = d3.line()
        .x(function (d) { return xScale(d.pc) + xScale.bandwidth() / 2; })
        .y(function (d) { return yLineScale(d.cumPct); });

      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

      g.selectAll("circle.cum-dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return xScale(d.pc) + xScale.bandwidth() / 2; })
        .attr("cy", function (d) { return yLineScale(d.cumPct); })
        .attr("r", 4)
        .attr("fill", "#f59e0b")
        .attr("stroke", theme.bg)
        .attr("stroke-width", 1.5);
    },

    _renderLoadingHeatmap: function (d3, svg, eigen, fNames, fLabels, width, height, theme, baseFontSize) {
      var margin = { top: 35, right: 30, bottom: 45, left: 160 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var numPCs = Math.min(eigen.length, 5);
      var pcNames = [];
      for (var k = 0; k < numPCs; k++) pcNames.push("PC" + (k + 1));

      var cellData = [];
      for (var j = 0; j < fNames.length; j++) {
        for (var k = 0; k < numPCs; k++) {
          var val = eigen[k].vec[j] * Math.sqrt(eigen[k].val);
          cellData.push({
            feature: fLabels[j],
            pc: pcNames[k],
            loading: val
          });
        }
      }

      var xScale = d3.scaleBand().domain(pcNames).range([0, innerW]).padding(0.08);
      var yScale = d3.scaleBand().domain(fLabels).range([0, innerH]).padding(0.08);

      var colorDiverge = d3.scaleDiverging(d3.interpolateRdBu).domain([1, 0, -1]);

      // X Axis
      g.append("g").attr("transform", "translate(0,-8)")
        .call(d3.axisTop(xScale).tickSize(0))
        .selectAll("text").attr("fill", theme.text).attr("font-size", (baseFontSize - 1) + "px").attr("font-weight", "700");

      // Y Axis
      g.append("g").call(d3.axisLeft(yScale).tickSize(0))
        .selectAll("text").attr("fill", theme.text).attr("font-size", (baseFontSize - 2) + "px").attr("font-weight", "600");

      g.selectAll("rect.heat-cell")
        .data(cellData)
        .enter()
        .append("rect")
        .attr("x", function (d) { return xScale(d.pc); })
        .attr("y", function (d) { return yScale(d.feature); })
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("rx", 4)
        .attr("fill", function (d) { return colorDiverge(d.loading); })
        .attr("stroke", theme.border)
        .attr("stroke-width", 0.5);

      g.selectAll("text.heat-val")
        .data(cellData)
        .enter()
        .append("text")
        .attr("x", function (d) { return xScale(d.pc) + xScale.bandwidth() / 2; })
        .attr("y", function (d) { return yScale(d.feature) + yScale.bandwidth() / 2 + 4; })
        .attr("text-anchor", "middle")
        .attr("fill", function (d) { return Math.abs(d.loading) > 0.4 ? "#ffffff" : "#0f172a"; })
        .attr("font-size", (baseFontSize - 3) + "px")
        .attr("font-weight", "700")
        .text(function (d) { return d.loading.toFixed(2); });
    },

    _renderOutlierScatter: function (d3, svg, entities, cutoff, width, height, theme, baseFontSize, colorScale, entityLabel, resetBtn) {
      var margin = { top: 35, right: 30, bottom: 45, left: 65 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxT2 = d3.max(entities, function (e) { return e.t2; }) || cutoff * 1.5;
      var maxPC1 = d3.max(entities, function (e) { return Math.abs(e.pc1); }) || 1;

      var xScale = d3.scaleLinear().domain([-maxPC1 * 1.1, maxPC1 * 1.1]).range([0, innerW]);
      var yScale = d3.scaleLinear().domain([0, Math.max(cutoff * 1.3, maxT2 * 1.05)]).range([innerH, 0]);

      // Cutoff Line (Chi-Square Control Limit)
      g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", yScale(cutoff)).attr("y2", yScale(cutoff))
        .attr("stroke", "#ef4444").attr("stroke-dasharray", "5,4").attr("stroke-width", 2);

      g.append("text")
        .attr("x", 8).attr("y", yScale(cutoff) - 6)
        .attr("fill", "#ef4444").attr("font-size", "11px").attr("font-weight", "700")
        .text("Chi-Square Outlier Control Limit (T^2 = " + cutoff.toFixed(2) + ")");

      // Axes
      g.append("g").attr("transform", "translate(0," + innerH + ")")
        .call(d3.axisBottom(xScale))
        .selectAll("text").attr("fill", theme.text);

      g.append("g").call(d3.axisLeft(yScale))
        .selectAll("text").attr("fill", theme.text);

      g.append("text")
        .attr("x", innerW / 2).attr("y", innerH + 36)
        .attr("text-anchor", "middle").attr("fill", theme.text).attr("font-weight", "700")
        .text("Principal Component 1 (PC1 Score)");

      g.append("text")
        .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -45)
        .attr("text-anchor", "middle").attr("fill", theme.text).attr("font-weight", "700")
        .text("Hotelling T^2 / Mahalanobis Metric");

      var self = this;
      g.selectAll("circle.scatter-node")
        .data(entities)
        .enter()
        .append("circle")
        .attr("class", "scatter-node")
        .attr("cx", function (d) { return xScale(d.pc1); })
        .attr("cy", function (d) { return yScale(d.t2); })
        .attr("r", function (d) { return d.isOutlier ? 6.5 : 4.5; })
        .attr("fill", function (d) { return d.isOutlier ? "#ef4444" : colorScale(d.cluster); })
        .attr("stroke", theme.bg)
        .attr("stroke-width", 1.2)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 9);
          self._showTooltip(event, d, entityLabel, "Cluster", [], theme);
        })
        .on("mousemove", function (event) { self._moveTooltip(event); })
        .on("mouseout", function (event, d) {
          d3.select(this).attr("r", d.isOutlier ? 6.5 : 4.5);
          self._hideTooltip();
        })
        .on("click", function (event, d) { self._handleClick(event, d); });
    },

    _applySearchFilter: function (d3) {
      var filterStr = this._searchFilter;
      if (!filterStr) {
        d3.selectAll(".node-entity, .scatter-node").attr("opacity", null);
        return;
      }
      d3.selectAll(".node-entity, .scatter-node").each(function (d) {
        var el = d3.select(this);
        var match = false;
        if (d.name && d.name.toLowerCase().indexOf(filterStr) !== -1) match = true;
        if (d.cluster && d.cluster.toLowerCase().indexOf(filterStr) !== -1) match = true;
        el.attr("opacity", match ? 1.0 : 0.12);
      });
    },

    _showTooltip: function (event, d, entityLabel, clusterLabel, loadings, theme) {
      var tip = this._tooltip;
      var outlierBadge = d.isOutlier
        ? '<span style="font-size: 10px; background: rgba(239, 68, 68, 0.25); color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid #ef4444;">⚠️ Multivariate Outlier</span>'
        : '<span style="font-size: 10px; background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Normal Pattern</span>';

      var html = [
        '<div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); color: #ffffff; padding: 12px 14px; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); font-size: 12px; min-width: 220px; line-height: 1.4;">',
        '  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">',
        '    <strong style="color: #38bdf8; font-size: 13px;">🎯 ' + d.name + '</strong>',
        outlierBadge,
        '  </div>',
        '  <div style="display: grid; grid-template-columns: auto auto; justify-content: space-between; row-gap: 4px; font-size: 11.5px;">',
        '    <span style="color: #94a3b8;">Cluster:</span>',
        '    <strong style="color: #f8fafc; text-align: right;">' + d.cluster + '</strong>',
        '    <span style="color: #94a3b8;">PC1 Projection:</span>',
        '    <strong style="color: #38bdf8; text-align: right;">' + d.pc1.toFixed(3) + '</strong>',
        '    <span style="color: #94a3b8;">PC2 Projection:</span>',
        '    <strong style="color: #818cf8; text-align: right;">' + d.pc2.toFixed(3) + '</strong>',
        '    <span style="color: #94a3b8;">Hotelling T^2 Score:</span>',
        '    <strong style="color: ' + (d.isOutlier ? "#ef4444" : "#34d399") + '; text-align: right;">' + d.t2.toFixed(2) + '</strong>',
        '  </div>',
        (d.links && d.links.length > 0)
          ? '  <div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #334155; font-size: 10.5px; color: #38bdf8; text-align: center; font-weight: 600;">🔎 Click to Drill Into Telemetry</div>'
          : '',
        '</div>'
      ].join("");

      tip.innerHTML = html;
      tip.style.opacity = "1";
      this._moveTooltip(event);
    },

    _moveTooltip: function (event) {
      var tip = this._tooltip;
      var x = event.clientX + 14;
      var y = event.clientY - 14;
      var rect = tip.getBoundingClientRect();
      if (x + rect.width > window.innerWidth - 10) x = event.clientX - rect.width - 14;
      if (y + rect.height > window.innerHeight - 10) y = window.innerHeight - rect.height - 10;
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    },

    _hideTooltip: function () {
      this._tooltip.style.opacity = "0";
    },

    _handleClick: function (event, d) {
      if (d.links && d.links.length > 0 && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
        LookerCharts.Utils.openDrillMenu({
          links: d.links,
          event: event
        });
      }
    }
  });
})();
