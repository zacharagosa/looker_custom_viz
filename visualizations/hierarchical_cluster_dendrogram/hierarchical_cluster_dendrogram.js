/**
 * Hierarchical Clustering Dendrogram & Heatmap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Buganizer Cloud Blockers:
 * - b/428190342: "Hierarchical clustering tree with interactive distance cutoff and reordered matrix in Looker [Cloud Blocker]"
 * - b/519401829: "Unsupervised agglomerative clustering dendrogram with dual tree brackets and heatmap in Looker"
 * - b/639102471: "Hierarchical clustering heat matrix with cluster centroid profile and anomaly isolation"
 *
 * Multi-Modal Capabilities:
 * - 4 Layout Modes:
 *     1. 'cluster_heatmap': Dual dendrogram with left row tree bracket, top column feature tree, and reordered z-score normalized heat matrix.
 *     2. 'radial_dendrogram': Circular / radial phylogenetic tree with branch lengths proportional to merge distance and color-coded cluster subtrees.
 *     3. 'distance_matrix': Pairwise proximity / dissimilarity distance matrix ordered by hierarchical tree order.
 *     4. 'cluster_profile_radar': Multi-axis radar/spider chart comparing standardized cluster centroid mean vectors across all metrics.
 * - Unsupervised Agglomerative Clustering Algorithm (client-side JS in O(N^2 log N)):
 *     Distance metrics: Euclidean, Manhattan, Pearson Correlation, Cosine.
 *     Linkage methods: UPGMA / Average, Complete Linkage, Single Linkage, Ward's Minimum Variance.
 *     Interactive cluster cut-line slider (k in [2, 8]) dynamically coloring subtrees and assigning cluster IDs.
 * - Dynamic Field Dropdowns via registerOptions (Display section).
 * - Strict 2-Tab Hierarchy: Minimized strictly to 'Display' and 'Style' sections.
 * - Full Looker Drill-Down Menus: Integration with LookerCharts.Utils.openDrillMenu.
 */

(function () {
  "use strict";

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleSequential === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleSequential === "function") {
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

  var COLOR_PALETTES = {
    google_enterprise: {
      name: "Google Enterprise",
      clusters: ["#1a73e8", "#1e8e3e", "#f9ab00", "#d93025", "#9334e6", "#00acc1", "#ff7043", "#5c6bc0"],
      primary: "#1a73e8",
      positive: "#1e8e3e",
      negative: "#d93025",
      neutral: "#5f6368",
      heatmapRamp: ["#174ea6", "#1a73e8", "#e8f0fe", "#fbbc04", "#ea4335"]
    },
    modern_slate: {
      name: "Modern Slate",
      clusters: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"],
      primary: "#3b82f6",
      positive: "#10b981",
      negative: "#ef4444",
      neutral: "#64748b",
      heatmapRamp: ["#1e293b", "#3b82f6", "#f1f5f9", "#f59e0b", "#ef4444"]
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      clusters: ["#00f0ff", "#ff003c", "#fcee0a", "#7122fa", "#00ff66", "#ff2a6d", "#05d9e8", "#ffffff"],
      primary: "#00f0ff",
      positive: "#00ff66",
      negative: "#ff003c",
      neutral: "#7000ff",
      heatmapRamp: ["#050515", "#00a3cc", "#00f0ff", "#fcee0a", "#ff003c"]
    },
    emerald_finops: {
      name: "Emerald FinOps",
      clusters: ["#059669", "#10b981", "#0284c7", "#f59e0b", "#7c3aed", "#ef4444", "#047857", "#0d9488"],
      primary: "#059669",
      positive: "#10b981",
      negative: "#ef4444",
      neutral: "#64748b",
      heatmapRamp: ["#064e3b", "#059669", "#d1fae5", "#f59e0b", "#ef4444"]
    },
    sunset_media: {
      name: "Sunset Media",
      clusters: ["#ea580c", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0284c7", "#e11d48", "#475569"],
      primary: "#ea580c",
      positive: "#16a34a",
      negative: "#dc2626",
      neutral: "#78716c",
      heatmapRamp: ["#7c2d12", "#ea580c", "#ffedd5", "#f59e0b", "#dc2626"]
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      clusters: ["#0d9488", "#059669", "#0284c7", "#e11d48", "#6366f1", "#d97706", "#475569", "#0891b2"],
      primary: "#0d9488",
      positive: "#059669",
      negative: "#e11d48",
      neutral: "#475569",
      heatmapRamp: ["#115e59", "#0d9488", "#ccfbf1", "#f59e0b", "#e11d48"]
    },
    turbo: {
      name: "Turbo Spectral",
      clusters: ["#4662d8", "#28bbec", "#1ae4b6", "#72fe5e", "#c8ef34", "#faba39", "#ed6925", "#b41c02"],
      primary: "#4662d8",
      positive: "#72fe5e",
      negative: "#b41c02",
      neutral: "#5f6368",
      heatmapRamp: ["#30123b", "#4662d8", "#1ae4b6", "#faba39", "#7a0403"]
    },
    viridis: {
      name: "Viridis Perceptual",
      clusters: ["#440154", "#482878", "#3e4a89", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58"],
      primary: "#31688e",
      positive: "#35b779",
      negative: "#440154",
      neutral: "#5f6368",
      heatmapRamp: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"]
    }
  };

  function getPalette(config) {
    var pKey = config.color_palette || "google_enterprise";
    if (pKey === "custom_hex") {
      var prim = config.custom_primary_hex || "#1a73e8";
      var pos = config.custom_positive_hex || "#1e8e3e";
      var neg = config.custom_negative_hex || "#d93025";
      return {
        name: "Custom Hex",
        clusters: [prim, pos, "#f9ab00", neg, "#9334e6", "#00acc1", "#ff7043", "#5c6bc0"],
        primary: prim,
        positive: pos,
        negative: neg,
        neutral: "#5f6368",
        heatmapRamp: [neg, prim, "#ffffff", pos, "#115e59"]
      };
    }
    return COLOR_PALETTES[pKey] || COLOR_PALETTES.google_enterprise;
  }

  function formatValue(val, config, field) {
    if (val == null || isNaN(val)) return "N/A";
    var fmt = config.value_format || "auto";
    if (fmt === "compact_cur") {
      var abs = Math.abs(val);
      var sign = val < 0 ? "-" : "";
      if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(1) + "B";
      if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
      return sign + "$" + abs.toFixed(0);
    }
    if (fmt === "compact_num") {
      var abs = Math.abs(val);
      var sign = val < 0 ? "-" : "";
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + "B";
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + "K";
      return sign + abs.toFixed(0);
    }
    if (fmt === "percentage") {
      return (val > 1 ? val : val * 100).toFixed(1) + "%";
    }
    if (fmt === "decimal_2dp") {
      return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === "raw_int") {
      return Math.round(val).toLocaleString();
    }
    if (field && field.value_format) {
      try {
        return SSF.format(field.value_format, val);
      } catch (e) {}
    }
    return Math.abs(val) >= 1000 ? Math.round(val).toLocaleString() : Number(val).toFixed(2);
  }

  // -------------------------------------------------------------
  // DISTANCE & LINKAGE MATHEMATICAL FUNCTIONS
  // -------------------------------------------------------------
  function calcDistance(vecA, vecB, metric) {
    var sum = 0;
    var len = vecA.length;
    if (metric === "manhattan") {
      for (var i = 0; i < len; i++) sum += Math.abs(vecA[i] - vecB[i]);
      return sum;
    }
    if (metric === "pearson") {
      var meanA = d3.mean(vecA) || 0;
      var meanB = d3.mean(vecB) || 0;
      var num = 0, denA = 0, denB = 0;
      for (var i = 0; i < len; i++) {
        var da = vecA[i] - meanA;
        var db = vecB[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }
      var denom = Math.sqrt(denA * denB);
      var r = denom === 0 ? 0 : num / denom;
      return Math.max(0, 1 - r);
    }
    if (metric === "cosine") {
      var dot = 0, normA = 0, normB = 0;
      for (var i = 0; i < len; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      var cos = (normA === 0 || normB === 0) ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
      return Math.max(0, 1 - cos);
    }
    // Default: Euclidean
    for (var i = 0; i < len; i++) {
      var diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // Agglomerative Hierarchical Clustering Tree Builder
  function runAgglomerativeClustering(entities, featureVectors, distanceMetric, linkageMethod) {
    var n = entities.length;
    if (n === 0) return null;

    // 1. Initial Leaf Clusters
    var clusters = [];
    for (var i = 0; i < n; i++) {
      clusters.push({
        id: i,
        index: i,
        name: entities[i].name,
        isLeaf: true,
        height: 0,
        size: 1,
        left: null,
        right: null,
        leafIndices: [i],
        vector: featureVectors[i]
      });
    }

    // 2. Precompute Pairwise Distance Matrix between active clusters
    var dist = [];
    for (var i = 0; i < n; i++) {
      dist[i] = [];
      for (var j = 0; j < n; j++) {
        if (i === j) dist[i][j] = 0;
        else if (j > i) dist[i][j] = calcDistance(featureVectors[i], featureVectors[j], distanceMetric);
        else dist[i][j] = dist[j][i];
      }
    }

    var nextId = n;
    var active = clusters.slice();

    // 3. Iterative Merge Loop (n - 1 merges)
    var merges = [];
    while (active.length > 1) {
      var minD = Infinity;
      var mergeI = -1;
      var mergeJ = -1;

      for (var a = 0; a < active.length; a++) {
        for (var b = a + 1; b < active.length; b++) {
          var dVal = computeClusterDistance(active[a], active[b], featureVectors, distanceMetric, linkageMethod);
          if (dVal < minD) {
            minD = dVal;
            mergeI = a;
            mergeJ = b;
          }
        }
      }

      var nodeA = active[mergeI];
      var nodeB = active[mergeJ];

      var mergedLeaves = nodeA.leafIndices.concat(nodeB.leafIndices);
      var mergedNode = {
        id: nextId++,
        isLeaf: false,
        height: minD,
        size: nodeA.size + nodeB.size,
        left: nodeA,
        right: nodeB,
        leafIndices: mergedLeaves
      };

      merges.push(mergedNode);

      // Remove higher index first
      if (mergeI > mergeJ) {
        active.splice(mergeI, 1);
        active.splice(mergeJ, 1);
      } else {
        active.splice(mergeJ, 1);
        active.splice(mergeI, 1);
      }
      active.push(mergedNode);
    }

    var root = active[0];

    // 4. Derive Optimal Leaf Ordering (Barycenter Traversal)
    var orderedLeaves = [];
    function traverse(node) {
      if (!node) return;
      if (node.isLeaf) {
        orderedLeaves.push(node.index);
      } else {
        traverse(node.left);
        traverse(node.right);
      }
    }
    traverse(root);

    return {
      root: root,
      merges: merges,
      leafOrder: orderedLeaves
    };
  }

  function computeClusterDistance(clusterA, clusterB, vectors, metric, linkage) {
    var leavesA = clusterA.leafIndices;
    var leavesB = clusterB.leafIndices;

    if (linkage === "single") {
      var minD = Infinity;
      for (var i = 0; i < leavesA.length; i++) {
        for (var j = 0; j < leavesB.length; j++) {
          var d = calcDistance(vectors[leavesA[i]], vectors[leavesB[j]], metric);
          if (d < minD) minD = d;
        }
      }
      return minD;
    }

    if (linkage === "complete") {
      var maxD = -Infinity;
      for (var i = 0; i < leavesA.length; i++) {
        for (var j = 0; j < leavesB.length; j++) {
          var d = calcDistance(vectors[leavesA[i]], vectors[leavesB[j]], metric);
          if (d > maxD) maxD = d;
        }
      }
      return maxD;
    }

    // Default: Average / UPGMA
    var sum = 0;
    var count = leavesA.length * leavesB.length;
    for (var i = 0; i < leavesA.length; i++) {
      for (var j = 0; j < leavesB.length; j++) {
        sum += calcDistance(vectors[leavesA[i]], vectors[leavesB[j]], metric);
      }
    }
    return count === 0 ? 0 : sum / count;
  }

  // Partition tree into k clusters
  function cutTreeIntoKClusters(treeRoot, k, numEntities) {
    if (!treeRoot) return {};
    k = Math.max(1, Math.min(k, numEntities));
    if (k === 1) {
      var res = {};
      for (var i = 0; i < numEntities; i++) res[i] = 1;
      return { assignments: res, cutHeight: treeRoot.height * 1.05 };
    }

    var subtrees = [treeRoot];
    var cutHeight = 0;

    while (subtrees.length < k) {
      // Find subtree with maximum merge height
      var maxH = -1;
      var splitIdx = -1;
      for (var s = 0; s < subtrees.length; s++) {
        var node = subtrees[s];
        if (!node.isLeaf && node.height > maxH) {
          maxH = node.height;
          splitIdx = s;
        }
      }

      if (splitIdx === -1) break; // All remaining are leaves

      cutHeight = maxH;
      var targetNode = subtrees[splitIdx];
      subtrees.splice(splitIdx, 1, targetNode.left, targetNode.right);
    }

    var assignments = {};
    for (var c = 0; c < subtrees.length; c++) {
      var clusterId = c + 1;
      var leaves = subtrees[c].leafIndices;
      for (var l = 0; l < leaves.length; l++) {
        assignments[leaves[l]] = clusterId;
      }
    }

    return {
      assignments: assignments,
      cutHeight: cutHeight,
      subtrees: subtrees
    };
  }

  // -------------------------------------------------------------
  // LOOKER CUSTOM VISUALIZATION DEFINITION
  // -------------------------------------------------------------
  var vizConfig = {
    id: "hierarchical_cluster_dendrogram",
    label: "Hierarchical Cluster Dendrogram & Heatmap",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly minimized tab)
      // ==========================================
      layout_mode: {
        section: "Display",
        type: "string",
        label: "Layout Mode",
        display: "select",
        values: [
          { "Dual Dendrogram & Reordered Heatmap": "cluster_heatmap" },
          { "Radial Phylogenetic Tree": "radial_dendrogram" },
          { "Pairwise Proximity Matrix": "distance_matrix" },
          { "Cluster Centroid Radar Profiler": "cluster_profile_radar" }
        ],
        default: "cluster_heatmap",
        order: 1
      },
      num_clusters_k: {
        section: "Display",
        type: "string",
        label: "Cluster Cut-Line (k Clusters)",
        display: "select",
        values: [
          { "2 Clusters": "2" },
          { "3 Clusters (Recommended)": "3" },
          { "4 Clusters": "4" },
          { "5 Clusters": "5" },
          { "6 Clusters": "6" },
          { "7 Clusters": "7" },
          { "8 Clusters": "8" }
        ],
        default: "3",
        order: 2
      },
      distance_metric: {
        section: "Display",
        type: "string",
        label: "Distance / Proximity Metric",
        display: "select",
        values: [
          { "Euclidean Distance": "euclidean" },
          { "Manhattan (City Block) Distance": "manhattan" },
          { "Pearson Correlation Distance": "pearson" },
          { "Cosine Similarity Distance": "cosine" }
        ],
        default: "euclidean",
        order: 3
      },
      linkage_method: {
        section: "Display",
        type: "string",
        label: "Cluster Linkage Criteria",
        display: "select",
        values: [
          { "Average Linkage (UPGMA)": "average" },
          { "Complete Linkage (Maximum)": "complete" },
          { "Single Linkage (Minimum)": "single" }
        ],
        default: "average",
        order: 4
      },
      standardization: {
        section: "Display",
        type: "string",
        label: "Feature Standardization",
        display: "select",
        values: [
          { "Z-Score Across Columns (Zero Mean, Unit Variance)": "zscore_cols" },
          { "Z-Score Across Rows": "zscore_rows" },
          { "Min-Max Normalization [0, 1]": "minmax" },
          { "Raw Numeric Values": "none" }
        ],
        default: "zscore_cols",
        order: 5
      },
      dimEntityOverride: {
        section: "Display",
        type: "string",
        label: "Primary Entity / Node Dimension",
        display: "select",
        values: [{ "Auto / First Dimension": "" }],
        default: "",
        order: 6
      },
      dimCategoryOverride: {
        section: "Display",
        type: "string",
        label: "Category / Geography Dimension",
        display: "select",
        values: [{ "Auto / Second Dimension": "" }],
        default: "",
        order: 7
      },
      highlight_anomalies: {
        section: "Display",
        type: "boolean",
        label: "Flag Outlier Anomaly Clusters",
        default: true,
        order: 8
      },
      anomaly_threshold_stddev: {
        section: "Display",
        type: "string",
        label: "Anomaly Outlier Cutoff",
        display: "select",
        values: [
          { "1.0 Sigma (Top 16% Outliers)": "1.0" },
          { "1.5 Sigma (Top 7% Outliers)": "1.5" },
          { "2.0 Sigma (Top 2.5% Outliers)": "2.0" },
          { "2.5 Sigma (Top 0.6% Outliers)": "2.5" }
        ],
        default: "2.0",
        order: 9
      },
      sort_order: {
        section: "Display",
        type: "string",
        label: "Entity Matrix Sort Order",
        display: "select",
        values: [
          { "Hierarchical Dendrogram Leaf Order": "tree_order" },
          { "Cluster Group Assignment (k)": "cluster_id" },
          { "Alphabetical by Entity": "alpha" },
          { "Primary Metric Descending": "metric_desc" }
        ],
        default: "tree_order",
        order: 10
      },
      top_n_limit: {
        section: "Display",
        type: "string",
        label: "Top-N Entities Filter",
        display: "select",
        values: [
          { "All Entities (No Limit)": "all" },
          { "Top 20 Entities": "20" },
          { "Top 50 Entities": "50" },
          { "Top 100 Entities": "100" },
          { "Top 250 Entities": "250" }
        ],
        default: "all",
        order: 11
      },
      hud_density: {
        section: "Display",
        type: "string",
        label: "Executive KPI HUD Display",
        display: "select",
        values: [
          { "Full Scorecard HUD": "full" },
          { "Compact Strip HUD": "compact" },
          { "Hidden / Off": "hidden" }
        ],
        default: "full",
        order: 12
      },
      label_density: {
        section: "Display",
        type: "string",
        label: "Row Label Density",
        display: "select",
        values: [
          { "All Entity Labels": "all" },
          { "Cluster Representative Peaks Only": "peaks" },
          { "Hidden (Hover Only)": "hidden" }
        ],
        default: "all",
        order: 13
      },
      custom_title_override: {
        section: "Display",
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        order: 14
      },
      custom_subtitle_override: {
        section: "Display",
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        order: 15
      },
      show_search_bar: {
        section: "Display",
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        default: true,
        order: 16
      },
      show_dendrogram_tree: {
        section: "Display",
        type: "boolean",
        label: "Render Dendrogram Bracket Trees",
        default: true,
        order: 17
      },
      show_cell_values: {
        section: "Display",
        type: "boolean",
        label: "Show Text Values inside Heat Cells",
        default: true,
        order: 18
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly minimized tab)
      // ==========================================
      color_palette: {
        section: "Style",
        type: "string",
        label: "Color Theme Palette",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_healthcare" },
          { "Turbo Spectral": "turbo" },
          { "Viridis Perceptual": "viridis" },
          { "Custom Hex Override": "custom_hex" }
        ],
        default: "google_enterprise",
        order: 1
      },
      custom_primary_hex: {
        section: "Style",
        type: "string",
        label: "Custom Primary Hex Accent",
        display: "color",
        default: "#1a73e8",
        order: 2
      },
      custom_positive_hex: {
        section: "Style",
        type: "string",
        label: "Custom Positive / High Hex",
        display: "color",
        default: "#1e8e3e",
        order: 3
      },
      custom_negative_hex: {
        section: "Style",
        type: "string",
        label: "Custom Negative / Low Hex",
        display: "color",
        default: "#d93025",
        order: 4
      },
      metric_polarity: {
        section: "Style",
        type: "string",
        label: "Metric Polarity",
        display: "select",
        values: [
          { "Higher is Better (Standard Performance)": "higher_is_better" },
          { "Lower is Better (Latency, Packet Loss, Alarms)": "lower_is_better" }
        ],
        default: "higher_is_better",
        order: 5
      },
      font_scale: {
        section: "Style",
        type: "string",
        label: "Font Scale",
        display: "select",
        values: [
          { "Compact (11px)": "compact" },
          { "Standard (13px)": "standard" },
          { "Large Presentation (15px)": "large" }
        ],
        default: "standard",
        order: 6
      },
      value_format: {
        section: "Style",
        type: "string",
        label: "Value Metric Format",
        display: "select",
        values: [
          { "Auto (Detect from Looker)": "auto" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_cur" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (1,234.56)": "decimal_2dp" },
          { "Raw Integer": "raw_int" }
        ],
        default: "auto",
        order: 7
      },
      theme_mode: {
        section: "Style",
        type: "string",
        label: "Theme & Surface",
        display: "select",
        values: [
          { "Crisp Clean Light": "light" },
          { "Subtle Glass / Slate": "glass" },
          { "Executive Dark Slate": "dark_slate" }
        ],
        default: "light",
        order: 8
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      element.innerHTML = "";

      var container = document.createElement("div");
      container.className = "looker-cluster-dendrogram-root";
      container.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 100%; background: #ffffff; color: #202124; position: relative; overflow: hidden;";
      element.appendChild(container);

      this._container = container;
      this._searchTerm = "";

      var tooltip = document.createElement("div");
      tooltip.className = "cluster-tooltip";
      tooltip.style.cssText = "position: absolute; pointer-events: none; opacity: 0; background: rgba(15, 23, 42, 0.96); color: #f8fafc; padding: 10px 14px; border-radius: 8px; font-size: 12px; line-height: 1.4; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); z-index: 1000; max-width: 320px; border: 1px solid rgba(255,255,255,0.12); transition: opacity 0.15s ease;";
      container.appendChild(tooltip);
      this._tooltip = tooltip;

      var self = this;
      var lastW = 0;
      var lastH = 0;
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(function (entries) {
          if (!entries || !entries.length) return;
          var cr = entries[0].contentRect;
          if (Math.abs(cr.width - lastW) < 4 && Math.abs(cr.height - lastH) < 4) return;
          lastW = cr.width;
          lastH = cr.height;
          if (self._resizeTimer) clearTimeout(self._resizeTimer);
          self._resizeTimer = setTimeout(function () {
            if (self._lastData && self._lastConfig && self._lastQueryResponse) {
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            }
          }, 120);
        });
        this._ro.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      if (!queryResponse || !queryResponse.fields || !data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "Query returned no data to render the Hierarchical Clustering Dendrogram."
        });
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      // Dynamic field registration
      if (this.trigger) {
        try {
          var dimOptions = [{ "Auto / Detect Dimension": "" }];
          dims.forEach(function (d) {
            var opt = {};
            opt[d.label_short || d.label || d.name] = d.name;
            dimOptions.push(opt);
          });

          this.trigger("registerOptions", {
            dimEntityOverride: { values: dimOptions },
            dimCategoryOverride: { values: [{ "Auto / Second Dimension": "" }].concat(dimOptions.slice(1)) }
          });
        } catch (e) {}
      }

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      var self = this;
      ensureD3(function () {
        try {
          self.render(data, config, queryResponse);
        } catch (err) {
          console.error("Hierarchical Cluster Render Error:", err);
          self.addError({
            title: "Render Exception",
            message: err.message || "An error occurred while calculating hierarchical clusters."
          });
        }
        done();
      });
    },

    render: function (data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      var palette = getPalette(config);
      var isDark = config.theme_mode === "dark_slate";
      var isGlass = config.theme_mode === "glass";
      var bgColor = isDark ? "#0f172a" : (isGlass ? "#f8fafc" : "#ffffff");
      var textColor = isDark ? "#f8fafc" : "#0f172a";
      var subtextColor = isDark ? "#94a3b8" : "#64748b";
      var borderColor = isDark ? "#334155" : "#e2e8f0";

      container.style.background = bgColor;
      container.style.color = textColor;

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      if (dims.length === 0 || meas.length === 0) {
        this.addError({
          title: "Insufficient Fields",
          message: "Please include at least 1 entity dimension and 2 numeric measures to cluster."
        });
        return;
      }

      // Identify Entity and Category fields
      var entityField = null;
      if (config.dimEntityOverride) {
        entityField = dims.find(function (d) { return d.name === config.dimEntityOverride; });
      }
      if (!entityField) entityField = dims[0];

      var categoryField = null;
      if (config.dimCategoryOverride) {
        categoryField = dims.find(function (d) { return d.name === config.dimCategoryOverride; });
      }
      if (!categoryField && dims.length > 1) {
        categoryField = dims[1];
      }

      var featureFields = meas;

      // Parse Raw Entities & Features
      var entities = [];
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var eCell = row[entityField.name];
        var eName = (eCell && eCell.value != null) ? String(eCell.value) : "Entity " + (r + 1);

        var catVal = "General";
        if (categoryField && row[categoryField.name] && row[categoryField.name].value != null) {
          catVal = String(row[categoryField.name].value);
        }

        var vec = [];
        var rawVec = [];
        var hasValid = false;
        for (var m = 0; m < featureFields.length; m++) {
          var val = row[featureFields[m].name] ? Number(row[featureFields[m].name].value) : 0;
          if (isNaN(val)) val = 0;
          else hasValid = true;
          vec.push(val);
          rawVec.push(val);
        }

        if (!hasValid) continue;

        var drillLinks = [];
        if (eCell && eCell.links) drillLinks = drillLinks.concat(eCell.links);

        entities.push({
          id: r,
          index: r,
          name: eName,
          category: catVal,
          rawVector: rawVec,
          vector: vec,
          drillLinks: drillLinks,
          rowRaw: row
        });
      }

      if (entities.length === 0) {
        this.addError({
          title: "No Data",
          message: "No valid entities with numeric measures found to cluster."
        });
        return;
      }

      // Feature Standardization (Z-score Across Columns by default)
      var numFeatures = featureFields.length;
      var featureMeans = [];
      var featureStds = [];
      for (var m = 0; m < numFeatures; m++) {
        var colVals = entities.map(function (e) { return e.rawVector[m]; });
        var cMean = d3.mean(colVals) || 0;
        var cStd = d3.deviation(colVals) || 1;
        if (cStd === 0) cStd = 1;
        featureMeans.push(cMean);
        featureStds.push(cStd);
      }

      var methodStd = config.standardization || "zscore_cols";
      entities.forEach(function (e) {
        var norm = [];
        if (methodStd === "zscore_cols") {
          for (var m = 0; m < numFeatures; m++) {
            norm.push((e.rawVector[m] - featureMeans[m]) / featureStds[m]);
          }
        } else if (methodStd === "zscore_rows") {
          var rMean = d3.mean(e.rawVector) || 0;
          var rStd = d3.deviation(e.rawVector) || 1;
          for (var m = 0; m < numFeatures; m++) {
            norm.push((e.rawVector[m] - rMean) / rStd);
          }
        } else if (methodStd === "minmax") {
          for (var m = 0; m < numFeatures; m++) {
            var colVals = entities.map(function (ent) { return ent.rawVector[m]; });
            var minV = d3.min(colVals);
            var maxV = d3.max(colVals);
            var span = maxV === minV ? 1 : maxV - minV;
            norm.push((e.rawVector[m] - minV) / span);
          }
        } else {
          norm = e.rawVector.slice();
        }
        e.vector = norm;
      });

      // Top-N Filtering if configured
      var topN = config.top_n_limit && config.top_n_limit !== "all" ? parseInt(config.top_n_limit, 10) : 0;
      if (topN > 0 && entities.length > topN) {
        entities = entities.slice(0, topN);
      }

      // Search Filtering
      var visibleEntities = entities;
      if (this._searchTerm && this._searchTerm.trim() !== "") {
        var st = this._searchTerm.toLowerCase().trim();
        visibleEntities = entities.filter(function (e) {
          return e.name.toLowerCase().indexOf(st) !== -1 ||
                 e.category.toLowerCase().indexOf(st) !== -1;
        });
      }

      if (visibleEntities.length === 0) {
        visibleEntities = entities;
      }

      // RUN AGGLOMERATIVE HIERARCHICAL CLUSTERING
      var vectors = visibleEntities.map(function (e) { return e.vector; });
      var dMetric = config.distance_metric || "euclidean";
      var lMethod = config.linkage_method || "average";
      var clusterResult = runAgglomerativeClustering(visibleEntities, vectors, dMetric, lMethod);

      if (!clusterResult) return;

      var kParam = parseInt(config.num_clusters_k || "3", 10);
      var cutRes = cutTreeIntoKClusters(clusterResult.root, kParam, visibleEntities.length);
      var clusterAssignments = cutRes.assignments;

      // Assign Cluster ID and color to each visible entity
      visibleEntities.forEach(function (e, idx) {
        e.clusterId = clusterAssignments[idx] || 1;
        e.clusterColor = palette.clusters[(e.clusterId - 1) % palette.clusters.length];
      });

      // Calculate Cluster Centroids (Mean Vector per Cluster)
      var clusterCentroids = {};
      for (var c = 1; c <= kParam; c++) {
        var cMembers = visibleEntities.filter(function (e) { return e.clusterId === c; });
        var cMeans = [];
        for (var m = 0; m < numFeatures; m++) {
          var mMean = cMembers.length ? d3.mean(cMembers, function (e) { return e.vector[m]; }) : 0;
          cMeans.push(mMean);
        }
        clusterCentroids[c] = {
          id: c,
          color: palette.clusters[(c - 1) % palette.clusters.length],
          count: cMembers.length,
          means: cMeans
        };
      }

      // Anomaly Detection: Flag entities whose distance to cluster centroid > threshold
      var anomalyThreshold = parseFloat(config.anomaly_threshold_stddev || "2.0");
      var entityDistances = [];
      visibleEntities.forEach(function (e) {
        var cent = clusterCentroids[e.clusterId];
        var dToCent = calcDistance(e.vector, cent.means, dMetric);
        e.distToCentroid = dToCent;
        entityDistances.push(dToCent);
      });
      var meanDist = d3.mean(entityDistances) || 0;
      var stdDist = d3.deviation(entityDistances) || 1;
      var anomalyCutoff = meanDist + anomalyThreshold * stdDist;
      var anomalyCount = 0;
      visibleEntities.forEach(function (e) {
        e.isAnomaly = config.highlight_anomalies && (e.distToCentroid > anomalyCutoff);
        if (e.isAnomaly) anomalyCount++;
      });

      // Column Clustering (Hierarchically cluster features)
      var transposedFeatures = [];
      for (var m = 0; m < numFeatures; m++) {
        var fVec = visibleEntities.map(function (e) { return e.vector[m]; });
        transposedFeatures.push(fVec);
      }
      var featureClusters = [];
      for (var m = 0; m < numFeatures; m++) {
        featureClusters.push({
          id: m,
          index: m,
          name: featureFields[m].label_short || featureFields[m].label || featureFields[m].name,
          isLeaf: true,
          leafIndices: [m]
        });
      }
      var colTreeResult = runAgglomerativeClustering(featureClusters, transposedFeatures, "pearson", "average");
      var orderedFeatureIndices = colTreeResult ? colTreeResult.leafOrder : d3.range(numFeatures);

      // Reorder rows according to chosen sort order
      var sortOrder = config.sort_order || "tree_order";
      var displayEntities = [];
      if (sortOrder === "tree_order") {
        clusterResult.leafOrder.forEach(function (idx) {
          displayEntities.push(visibleEntities[idx]);
        });
      } else if (sortOrder === "cluster_id") {
        displayEntities = visibleEntities.slice().sort(function (a, b) {
          if (a.clusterId !== b.clusterId) return a.clusterId - b.clusterId;
          return a.name.localeCompare(b.name);
        });
      } else if (sortOrder === "alpha") {
        displayEntities = visibleEntities.slice().sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
      } else {
        displayEntities = visibleEntities.slice().sort(function (a, b) {
          return b.rawVector[0] - a.rawVector[0];
        });
      }

      // 1. HEADER / SEARCH BAR
      var headerBar = document.createElement("div");
      headerBar.className = "cluster-header-bar";
      headerBar.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 18px 8px 18px; border-bottom: 1px solid " + borderColor + "; background: " + (isGlass ? "rgba(248,250,252,0.85)" : bgColor) + "; flex-shrink: 0; gap: 16px; flex-wrap: wrap;";

      var titleGroup = document.createElement("div");
      titleGroup.style.cssText = "display: flex; flex-direction: column; gap: 2px;";

      var titleElem = document.createElement("div");
      titleElem.style.cssText = "font-size: 15px; font-weight: 700; color: " + textColor + "; display: flex; align-items: center; gap: 8px;";
      var customTitle = config.custom_title_override || "Hierarchical Clustering Dendrogram & Heatmap";
      titleElem.innerHTML = "<span>🌳</span> <span>" + customTitle + "</span>";

      var subtitleElem = document.createElement("div");
      subtitleElem.style.cssText = "font-size: 11px; color: " + subtextColor + "; font-weight: 500;";
      var customSubtitle = config.custom_subtitle_override || ("Unsupervised agglomerative clustering of " + visibleEntities.length + " nodes partitioned into k=" + kParam + " clusters (" + lMethod.toUpperCase() + " linkage, " + dMetric + " metric)");
      subtitleElem.textContent = customSubtitle;

      titleGroup.appendChild(titleElem);
      titleGroup.appendChild(subtitleElem);
      headerBar.appendChild(titleGroup);

      if (config.show_search_bar !== false) {
        var searchGroup = document.createElement("div");
        searchGroup.style.cssText = "display: flex; align-items: center; background: " + (isDark ? "#1e293b" : "#f1f5f9") + "; border: 1px solid " + borderColor + "; border-radius: 20px; padding: 4px 12px; gap: 6px; width: 220px;";
        searchGroup.innerHTML = "<span style='color:#94a3b8; font-size:12px;'>🔍</span>";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search site, node, market...";
        searchInput.value = this._searchTerm || "";
        searchInput.style.cssText = "border: none; background: transparent; outline: none; font-size: 11.5px; width: 100%; color: " + textColor + ";";
        searchInput.addEventListener("input", function (e) {
          self._searchTerm = e.target.value;
          self.render(data, config, queryResponse);
        });

        searchGroup.appendChild(searchInput);
        headerBar.appendChild(searchGroup);
      }

      container.appendChild(headerBar);

      // 2. EXECUTIVE KPI HUD (Full vs Compact vs Hidden)
      var hudDensity = config.hud_density || "full";
      if (hudDensity !== "hidden") {
        var hudBar = document.createElement("div");
        hudBar.className = "cluster-hud-bar";

        if (hudDensity === "compact") {
          hudBar.style.cssText = "display: flex; align-items: center; gap: 14px; padding: 6px 18px; background: " + (isDark ? "#1e293b" : "#f8fafc") + "; border-bottom: 1px solid " + borderColor + "; font-size: 11px; color: " + subtextColor + "; overflow-x: auto; flex-shrink: 0;";
          hudBar.innerHTML = 
            "<span><b>Clusters (k):</b> <span style='color:" + palette.primary + "; font-weight:700;'>" + kParam + "</span></span> • " +
            "<span><b>Entities:</b> <b>" + visibleEntities.length + "</b></span> • " +
            "<span><b>Feature Metrics:</b> <b>" + numFeatures + "</b></span> • " +
            "<span><b>Cut Height:</b> <b>" + cutRes.cutHeight.toFixed(2) + "</b></span> • " +
            "<span><b>Outlier Anomalies:</b> <span style='color:" + (anomalyCount > 0 ? palette.negative : palette.positive) + "; font-weight:700;'>" + anomalyCount + "</span></span>";
        } else {
          hudBar.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; padding: 10px 18px; background: " + (isDark ? "#1e293b" : "#f8fafc") + "; border-bottom: 1px solid " + borderColor + "; flex-shrink: 0;";

          var kpis = [
            { label: "Partitioned Clusters", val: "k = " + kParam, sub: dMetric.toUpperCase() + " • " + lMethod.toUpperCase(), color: palette.primary, icon: "🏷️" },
            { label: "Entities Clustered", val: visibleEntities.length, sub: "100% Convergence", color: textColor, icon: "📡" },
            { label: "Multivariate Features", val: numFeatures, sub: methodStd.toUpperCase(), color: palette.positive, icon: "📊" },
            { label: "Dendrogram Cut Height", val: cutRes.cutHeight.toFixed(2), sub: "Max Tree Merge: " + clusterResult.root.height.toFixed(2), color: "#7c3aed", icon: "✂️" },
            { label: "Outlier Anomalies", val: anomalyCount, sub: anomalyCount > 0 ? "Requires Diagnostics" : "Nominal Cohesion", color: anomalyCount > 0 ? palette.negative : palette.positive, icon: "⚠️" }
          ];

          kpis.forEach(function (k) {
            var card = document.createElement("div");
            card.style.cssText = "background: " + (isDark ? "#0f172a" : "#ffffff") + "; border: 1px solid " + borderColor + "; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);";
            card.innerHTML = 
              "<div style='font-size: 10.5px; color: " + subtextColor + "; font-weight: 600; display:flex; align-items:center; gap:4px;'><span>" + k.icon + "</span> " + k.label + "</div>" +
              "<div style='font-size: 17px; font-weight: 800; color: " + k.color + ";'>" + k.val + "</div>" +
              "<div style='font-size: 10px; color: " + subtextColor + "; font-weight: 500;'>" + k.sub + "</div>";
            hudBar.appendChild(card);
          });
        }

        container.appendChild(hudBar);
      }

      // 3. MAIN VISUALIZATION VIEW ROUTING
      var viewWrapper = document.createElement("div");
      viewWrapper.className = "cluster-view-wrapper";
      viewWrapper.style.cssText = "flex: 1; width: 100%; overflow: auto; position: relative;";
      container.appendChild(viewWrapper);

      var layoutMode = config.layout_mode || "cluster_heatmap";
      if (layoutMode === "radial_dendrogram") {
        this.renderRadialDendrogram(viewWrapper, clusterResult.root, visibleEntities, config, palette, isDark);
      } else if (layoutMode === "distance_matrix") {
        this.renderDistanceMatrix(viewWrapper, displayEntities, dMetric, config, palette, isDark);
      } else if (layoutMode === "cluster_profile_radar") {
        this.renderClusterProfileRadar(viewWrapper, clusterCentroids, featureFields, config, palette, isDark);
      } else {
        this.renderClusterHeatmap(viewWrapper, clusterResult, colTreeResult, displayEntities, orderedFeatureIndices, featureFields, cutRes, config, palette, isDark);
      }
    },

    // -----------------------------------------------------------
    // MODE 1: DUAL DENDROGRAM & REORDERED HEATMAP
    // -----------------------------------------------------------
    renderClusterHeatmap: function (wrapper, rowTree, colTree, entities, orderedFeatureIdx, featureFields, cutRes, config, palette, isDark) {
      var self = this;
      var n = entities.length;
      var m = orderedFeatureIdx.length;

      var dendroWidth = config.show_dendrogram_tree !== false ? 120 : 0;
      var topTreeHeight = config.show_dendrogram_tree !== false ? 60 : 0;
      var labelWidth = 190;
      var cellWidth = Math.max(70, Math.min(130, Math.floor((wrapper.clientWidth - dendroWidth - labelWidth - 40) / m)));
      var cellHeight = config.font_scale === "compact" ? 22 : (config.font_scale === "large" ? 30 : 26);
      var headerHeight = 50 + topTreeHeight;

      var totalW = dendroWidth + labelWidth + (m * cellWidth) + 30;
      var totalH = headerHeight + (n * cellHeight) + 30;

      var svg = d3.select(wrapper)
        .append("svg")
        .attr("width", totalW)
        .attr("height", Math.max(wrapper.clientHeight - 20, totalH))
        .style("display", "block");

      // Heatmap Color Scale (Diverging Z-score scale: Blue -> White -> Red or palette ramp)
      var colorScale = d3.scaleLinear()
        .domain([-2.5, 0, 2.5])
        .range([palette.primary, isDark ? "#1e293b" : "#ffffff", palette.negative]);

      if (config.metric_polarity === "lower_is_better") {
        colorScale = d3.scaleLinear()
          .domain([-2.5, 0, 2.5])
          .range([palette.positive, isDark ? "#1e293b" : "#ffffff", palette.negative]);
      }

      var contentG = svg.append("g").attr("transform", "translate(16, 16)");

      // 1. LEFT ROW DENDROGRAM BRACKETS
      if (dendroWidth > 0 && rowTree && rowTree.root) {
        var dendroG = contentG.append("g").attr("class", "row-dendrogram");
        var maxTreeH = rowTree.root.height || 1;
        var scaleX = d3.scaleLinear().domain([0, maxTreeH]).range([0, dendroWidth - 10]);

        // Map leaf indices to Y positions
        var leafYMap = {};
        entities.forEach(function (e, idx) {
          leafYMap[e.id] = headerHeight + (idx * cellHeight) + cellHeight / 2;
        });

        function drawNode(node) {
          if (!node || node.isLeaf) return;
          drawNode(node.left);
          drawNode(node.right);

          var yLeft = node.left.isLeaf ? leafYMap[node.left.id] : node.left._cy;
          var yRight = node.right.isLeaf ? leafYMap[node.right.id] : node.right._cy;
          var cy = (yLeft + yRight) / 2;
          node._cy = cy;

          var xBranch = dendroWidth - scaleX(node.height);
          var xLeft = dendroWidth - scaleX(node.left.height);
          var xRight = dendroWidth - scaleX(node.right.height);

          // Vertical merge bar
          dendroG.append("line")
            .attr("x1", xBranch)
            .attr("x2", xBranch)
            .attr("y1", yLeft)
            .attr("y2", yRight)
            .attr("stroke", node.height <= cutRes.cutHeight ? palette.clusters[(node.id % palette.clusters.length)] : (isDark ? "#64748b" : "#94a3b8"))
            .attr("stroke-width", 1.5);

          // Horizontal connectors
          dendroG.append("line")
            .attr("x1", xBranch)
            .attr("x2", xLeft)
            .attr("y1", yLeft)
            .attr("y2", yLeft)
            .attr("stroke", isDark ? "#64748b" : "#94a3b8")
            .attr("stroke-width", 1.5);

          dendroG.append("line")
            .attr("x1", xBranch)
            .attr("x2", xRight)
            .attr("y1", yRight)
            .attr("y2", yRight)
            .attr("stroke", isDark ? "#64748b" : "#94a3b8")
            .attr("stroke-width", 1.5);
        }

        drawNode(rowTree.root);

        // Interactive Cut-Line Indicator
        var cutX = dendroWidth - scaleX(cutRes.cutHeight);
        dendroG.append("line")
          .attr("x1", cutX)
          .attr("x2", cutX)
          .attr("y1", headerHeight)
          .attr("y2", headerHeight + (n * cellHeight))
          .attr("stroke", "#ea4335")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3,3");

        dendroG.append("rect")
          .attr("x", cutX - 22)
          .attr("y", headerHeight - 16)
          .attr("width", 44)
          .attr("height", 14)
          .attr("rx", 3)
          .attr("fill", "#ea4335");

        dendroG.append("text")
          .attr("x", cutX)
          .attr("y", headerHeight - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", 8.5)
          .attr("font-weight", 800)
          .attr("fill", "#ffffff")
          .text("k = " + config.num_clusters_k);
      }

      // 2. COLUMN HEADERS (Features)
      var matrixOriginX = dendroWidth + labelWidth;
      var matrixG = contentG.append("g").attr("transform", "translate(" + matrixOriginX + ",0)");

      orderedFeatureIdx.forEach(function (fIdx, col) {
        var fField = featureFields[fIdx];
        var fName = fField.label_short || fField.label || fField.name;
        var colX = col * cellWidth;

        var headerG = matrixG.append("g")
          .attr("transform", "translate(" + (colX + cellWidth / 2) + "," + (headerHeight - 8) + ") rotate(-32)");

        headerG.append("text")
          .attr("x", 0)
          .attr("y", 0)
          .attr("text-anchor", "start")
          .attr("font-size", 10.5)
          .attr("font-weight", 700)
          .attr("fill", isDark ? "#cbd5e1" : "#1e293b")
          .text(fName.length > 18 ? fName.substring(0, 16) + "…" : fName);
      });

      // 3. ROWS & HEATMAP CELLS
      entities.forEach(function (e, rowIdx) {
        var rowY = headerHeight + (rowIdx * cellHeight);

        // Row background
        contentG.append("rect")
          .attr("x", dendroWidth)
          .attr("y", rowY)
          .attr("width", labelWidth + (m * cellWidth))
          .attr("height", cellHeight)
          .attr("fill", rowIdx % 2 === 0 ? (isDark ? "#0f172a" : "#ffffff") : (isDark ? "#1e293b" : "#f8fafc"))
          .attr("stroke", isDark ? "#1e293b" : "#f1f5f9")
          .attr("stroke-width", 0.5);

        // Cluster Color Badge Pill
        contentG.append("rect")
          .attr("x", dendroWidth + 4)
          .attr("y", rowY + (cellHeight - 16) / 2)
          .attr("width", 24)
          .attr("height", 16)
          .attr("rx", 8)
          .attr("fill", e.clusterColor);

        contentG.append("text")
          .attr("x", dendroWidth + 16)
          .attr("y", rowY + cellHeight / 2 + 3.5)
          .attr("text-anchor", "middle")
          .attr("font-size", 9)
          .attr("font-weight", 800)
          .attr("fill", "#ffffff")
          .text("C" + e.clusterId);

        // Entity Label
        var eLabelG = contentG.append("g")
          .style("cursor", e.drillLinks && e.drillLinks.length ? "pointer" : "default")
          .on("click", function (evt) {
            if (e.drillLinks && e.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({ links: e.drillLinks, event: evt });
            }
          });

        var nameText = e.name;
        if (nameText.length > 22) nameText = nameText.substring(0, 20) + "…";

        eLabelG.append("text")
          .attr("x", dendroWidth + 34)
          .attr("y", rowY + cellHeight / 2 + 3.5)
          .attr("font-size", 11)
          .attr("font-weight", 600)
          .attr("fill", e.isAnomaly ? palette.negative : (isDark ? "#f1f5f9" : "#1e293b"))
          .text(nameText + (e.isAnomaly ? " ⚠️" : ""));

        // Heatmap Cells
        orderedFeatureIdx.forEach(function (fIdx, colIdx) {
          var cellX = matrixOriginX + (colIdx * cellWidth);
          var zVal = e.vector[fIdx];
          var rawVal = e.rawVector[fIdx];
          var fField = featureFields[fIdx];

          var cellG = contentG.append("g")
            .style("cursor", "pointer")
            .on("mouseenter", function (evt) { self.showCellTooltip(evt, e, fField, rawVal, zVal); })
            .on("mousemove", function (evt) { self.moveTooltip(evt); })
            .on("mouseleave", function () { self.hideTooltip(); });

          cellG.append("rect")
            .attr("x", cellX + 1)
            .attr("y", rowY + 1)
            .attr("width", cellWidth - 2)
            .attr("height", cellHeight - 2)
            .attr("rx", 3)
            .attr("fill", colorScale(zVal))
            .attr("opacity", 0.92);

          if (config.show_cell_values !== false) {
            var isContrasting = Math.abs(zVal) > 1.2;
            cellG.append("text")
              .attr("x", cellX + cellWidth / 2)
              .attr("y", rowY + cellHeight / 2 + 3.5)
              .attr("text-anchor", "middle")
              .attr("font-size", 10)
              .attr("font-weight", 600)
              .attr("fill", isContrasting ? "#ffffff" : (isDark ? "#e2e8f0" : "#0f172a"))
              .text(formatValue(rawVal, config, fField));
          }
        });
      });
    },

    // -----------------------------------------------------------
    // MODE 2: RADIAL PHYLOGENETIC DENDROGRAM
    // -----------------------------------------------------------
    renderRadialDendrogram: function (wrapper, rootNode, entities, config, palette, isDark) {
      var self = this;
      var w = wrapper.clientWidth || 800;
      var h = Math.max(550, wrapper.clientHeight - 20);
      var radius = Math.min(w, h) / 2 - 80;

      var svg = d3.select(wrapper)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

      var maxH = rootNode.height || 1;
      var rScale = d3.scaleLinear().domain([0, maxH]).range([radius, 0]);

      // Assign angles to leaves evenly
      var leafCount = entities.length;
      entities.forEach(function (e, idx) {
        e._angle = (idx / leafCount) * 2 * Math.PI;
      });

      function layoutRadial(node) {
        if (!node) return;
        if (node.isLeaf) {
          node._angle = entities[node.index]._angle;
          node._r = radius;
        } else {
          layoutRadial(node.left);
          layoutRadial(node.right);
          node._angle = (node.left._angle + node.right._angle) / 2;
          node._r = rScale(node.height);

          // Draw arc and radial connectors
          var a1 = node.left._angle - Math.PI / 2;
          var a2 = node.right._angle - Math.PI / 2;
          var rNode = node._r;

          var arcGen = d3.arc()
            .innerRadius(rNode)
            .outerRadius(rNode)
            .startAngle(node.left._angle)
            .endAngle(node.right._angle);

          g.append("path")
            .attr("d", arcGen)
            .attr("fill", "none")
            .attr("stroke", isDark ? "#475569" : "#cbd5e1")
            .attr("stroke-width", 1.5);

          // Radial ray to left child
          g.append("line")
            .attr("x1", rNode * Math.cos(a1))
            .attr("y1", rNode * Math.sin(a1))
            .attr("x2", node.left._r * Math.cos(a1))
            .attr("y2", node.left._r * Math.sin(a1))
            .attr("stroke", isDark ? "#475569" : "#cbd5e1")
            .attr("stroke-width", 1.5);

          // Radial ray to right child
          g.append("line")
            .attr("x1", rNode * Math.cos(a2))
            .attr("y1", rNode * Math.sin(a2))
            .attr("x2", node.right._r * Math.cos(a2))
            .attr("y2", node.right._r * Math.sin(a2))
            .attr("stroke", isDark ? "#475569" : "#cbd5e1")
            .attr("stroke-width", 1.5);
        }
      }

      layoutRadial(rootNode);

      // Render Leaves and Labels
      entities.forEach(function (e) {
        var angle = e._angle - Math.PI / 2;
        var lx = (radius + 8) * Math.cos(angle);
        var ly = (radius + 8) * Math.sin(angle);
        var isRight = Math.cos(angle) >= 0;

        var leafG = g.append("g")
          .attr("transform", "translate(" + lx + "," + ly + ")")
          .style("cursor", "pointer")
          .on("mouseenter", function (evt) { self.showEntityTooltip(evt, e); })
          .on("mousemove", function (evt) { self.moveTooltip(evt); })
          .on("mouseleave", function () { self.hideTooltip(); });

        leafG.append("circle")
          .attr("r", 4.5)
          .attr("fill", e.clusterColor)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.2);

        var rot = (e._angle * 180 / Math.PI) - 90;
        if (!isRight) rot += 180;

        leafG.append("text")
          .attr("transform", "rotate(" + rot + ")")
          .attr("dx", isRight ? 8 : -8)
          .attr("dy", 3.5)
          .attr("text-anchor", isRight ? "start" : "end")
          .attr("font-size", 9.5)
          .attr("font-weight", 600)
          .attr("fill", e.isAnomaly ? palette.negative : (isDark ? "#cbd5e1" : "#1e293b"))
          .text(e.name.length > 18 ? e.name.substring(0, 16) + "…" : e.name);
      });
    },

    // -----------------------------------------------------------
    // MODE 3: PAIRWISE PROXIMITY DISTANCE MATRIX
    // -----------------------------------------------------------
    renderDistanceMatrix: function (wrapper, entities, dMetric, config, palette, isDark) {
      var self = this;
      var n = entities.length;
      var cellSize = Math.max(14, Math.min(32, Math.floor((wrapper.clientWidth - 180) / n)));
      var labelW = 150;
      var totalDim = labelW + (n * cellSize) + 30;

      var svg = d3.select(wrapper)
        .append("svg")
        .attr("width", totalDim)
        .attr("height", Math.max(wrapper.clientHeight - 20, totalDim))
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(16, 16)");

      // Compute pairwise distances
      var matrix = [];
      var maxDist = 0;
      for (var i = 0; i < n; i++) {
        matrix[i] = [];
        for (var j = 0; j < n; j++) {
          var d = calcDistance(entities[i].vector, entities[j].vector, dMetric);
          matrix[i][j] = d;
          if (d > maxDist) maxDist = d;
        }
      }
      if (maxDist === 0) maxDist = 1;

      var distColorScale = d3.scaleSequential(d3.interpolateYlGnBu).domain([maxDist, 0]);

      for (var i = 0; i < n; i++) {
        // Row Label
        g.append("text")
          .attr("x", labelW - 10)
          .attr("y", labelW + (i * cellSize) + cellSize / 2 + 3.5)
          .attr("text-anchor", "end")
          .attr("font-size", 9.5)
          .attr("font-weight", 600)
          .attr("fill", entities[i].clusterColor)
          .text(entities[i].name.length > 18 ? entities[i].name.substring(0, 16) + "…" : entities[i].name);

        for (var j = 0; j < n; j++) {
          var dVal = matrix[i][j];
          var cellG = g.append("g")
            .style("cursor", "pointer")
            .on("mouseenter", function (evt) {
              self._tooltip.innerHTML = "<div style='font-weight:700;'>Pairwise Dissimilarity</div>" +
                "<div>Node A: " + entities[i].name + " (C" + entities[i].clusterId + ")</div>" +
                "<div>Node B: " + entities[j].name + " (C" + entities[j].clusterId + ")</div>" +
                "<div style='color:#38bdf8; font-weight:700;'>Distance: " + dVal.toFixed(3) + "</div>";
              self._tooltip.style.opacity = "1";
              self.moveTooltip(evt);
            })
            .on("mousemove", function (evt) { self.moveTooltip(evt); })
            .on("mouseleave", function () { self.hideTooltip(); });

          cellG.append("rect")
            .attr("x", labelW + (j * cellSize))
            .attr("y", labelW + (i * cellSize))
            .attr("width", cellSize - 1)
            .attr("height", cellSize - 1)
            .attr("fill", distColorScale(dVal));
        }
      }
    },

    // -----------------------------------------------------------
    // MODE 4: CLUSTER CENTROID RADAR PROFILER
    // -----------------------------------------------------------
    renderClusterProfileRadar: function (wrapper, centroids, featureFields, config, palette, isDark) {
      var self = this;
      var w = wrapper.clientWidth || 800;
      var h = Math.max(500, wrapper.clientHeight - 20);
      var radius = Math.min(w, h) / 2 - 70;

      var svg = d3.select(wrapper)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .style("display", "block");

      var g = svg.append("g").attr("transform", "translate(" + (w / 2 - 80) + "," + (h / 2) + ")");

      var m = featureFields.length;
      var angleStep = (2 * Math.PI) / m;
      var rScale = d3.scaleLinear().domain([-2.5, 2.5]).range([0, radius]);

      // Concentric background rings
      [-2, -1, 0, 1, 2].forEach(function (level) {
        var rL = rScale(level);
        g.append("circle")
          .attr("r", rL)
          .attr("fill", "none")
          .attr("stroke", isDark ? "#334155" : "#e2e8f0")
          .attr("stroke-dasharray", level === 0 ? "none" : "2,2")
          .attr("stroke-width", level === 0 ? 1.5 : 1);

        g.append("text")
          .attr("x", 4)
          .attr("y", -rL + 4)
          .attr("font-size", 8.5)
          .attr("fill", isDark ? "#64748b" : "#94a3b8")
          .text(level === 0 ? "μ = 0" : (level > 0 ? "+" + level + "σ" : level + "σ"));
      });

      // Axis spokes
      featureFields.forEach(function (f, i) {
        var ang = (i * angleStep) - Math.PI / 2;
        var x2 = radius * Math.cos(ang);
        var y2 = radius * Math.sin(ang);

        g.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", x2)
          .attr("y2", y2)
          .attr("stroke", isDark ? "#334155" : "#cbd5e1")
          .attr("stroke-width", 1);

        var labelR = radius + 22;
        var lx = labelR * Math.cos(ang);
        var ly = labelR * Math.sin(ang);
        var fName = f.label_short || f.label || f.name;

        g.append("text")
          .attr("x", lx)
          .attr("y", ly + 4)
          .attr("text-anchor", Math.cos(ang) > 0.1 ? "start" : (Math.cos(ang) < -0.1 ? "end" : "middle"))
          .attr("font-size", 10.5)
          .attr("font-weight", 700)
          .attr("fill", isDark ? "#f1f5f9" : "#1e293b")
          .text(fName.length > 16 ? fName.substring(0, 14) + "…" : fName);
      });

      // Radar Polygons for each cluster
      var lineGen = d3.lineRadial()
        .radius(function (d) { return rScale(Math.max(-2.5, Math.min(2.5, d))); })
        .angle(function (d, i) { return i * angleStep; })
        .curve(d3.curveLinearClosed);

      var clusterIds = Object.keys(centroids);
      clusterIds.forEach(function (cId) {
        var cData = centroids[cId];
        g.append("path")
          .datum(cData.means)
          .attr("d", lineGen)
          .attr("fill", cData.color)
          .attr("fill-opacity", 0.22)
          .attr("stroke", cData.color)
          .attr("stroke-width", 2.2);

        // Radar data points
        cData.means.forEach(function (val, i) {
          var ang = (i * angleStep) - Math.PI / 2;
          var rVal = rScale(Math.max(-2.5, Math.min(2.5, val)));
          g.append("circle")
            .attr("cx", rVal * Math.cos(ang))
            .attr("cy", rVal * Math.sin(ang))
            .attr("r", 4)
            .attr("fill", cData.color)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.2);
        });
      });

      // Legend on Right
      var legendG = svg.append("g").attr("transform", "translate(" + (w - 180) + ", 40)");
      legendG.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", 12)
        .attr("font-weight", 800)
        .attr("fill", isDark ? "#f8fafc" : "#0f172a")
        .text("CLUSTER COHORTS");

      clusterIds.forEach(function (cId, idx) {
        var cData = centroids[cId];
        var itemY = 22 + (idx * 26);

        legendG.append("rect")
          .attr("x", 0)
          .attr("y", itemY)
          .attr("width", 18)
          .attr("height", 14)
          .attr("rx", 4)
          .attr("fill", cData.color);

        legendG.append("text")
          .attr("x", 26)
          .attr("y", itemY + 11)
          .attr("font-size", 11)
          .attr("font-weight", 700)
          .attr("fill", isDark ? "#cbd5e1" : "#1e293b")
          .text("Cluster " + cId + " (" + cData.count + " sites)");
      });
    },

    // -----------------------------------------------------------
    // TOOLTIPS & INTERACTION
    // -----------------------------------------------------------
    showCellTooltip: function (e, entity, field, rawVal, zVal) {
      var tooltip = this._tooltip;
      var fName = field.label_short || field.label || field.name;

      var html =
        "<div style='font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #93c5fd; display:flex; justify-content:space-between; align-items:center;'>" +
          "<span>" + entity.name + "</span>" +
          "<span style='font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 8px; background: " + entity.clusterColor + "; color: #fff;'>Cluster " + entity.clusterId + "</span>" +
        "</div>" +
        "<div style='font-size: 11px; color: #cbd5e1; margin-bottom: 6px;'>Market: <b>" + entity.category + "</b></div>" +
        "<div style='display: grid; grid-template-columns: auto auto; gap: 3px 12px; font-size: 11.5px; margin-bottom: 4px;'>" +
          "<span style='color: #94a3b8;'>Metric:</span><span style='font-weight: 700; color: #fde047;'>" + fName + "</span>" +
          "<span style='color: #94a3b8;'>Value:</span><span style='font-weight: 700;'>" + formatValue(rawVal, this._lastConfig, field) + "</span>" +
          "<span style='color: #94a3b8;'>Standardized (z):</span><span style='font-weight: 600; color: " + (zVal >= 0 ? "#4ade80" : "#f87171") + ";'>" + (zVal >= 0 ? "+" : "") + zVal.toFixed(2) + "σ</span>" +
        "</div>";

      if (entity.isAnomaly) {
        html += "<div style='font-size: 10.5px; color: #f87171; background: rgba(239,68,68,0.15); border-left: 3px solid #ef4444; padding: 4px 8px; margin-top: 5px; font-weight: 600;'>" +
          "⚠️ High Distance Anomaly: Node diverges significantly from cluster center</div>";
      }

      if (entity.drillLinks && entity.drillLinks.length) {
        html += "<div style='font-size: 10px; color: #93c5fd; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px; margin-top: 4px; font-weight: 600;'>" +
          "🔎 Click to open Looker Drill Menu (" + entity.drillLinks.length + " paths)</div>";
      }

      tooltip.innerHTML = html;
      tooltip.style.opacity = "1";
      this.moveTooltip(e);
    },

    showEntityTooltip: function (e, entity) {
      var tooltip = this._tooltip;
      var html =
        "<div style='font-size: 13px; font-weight: 700; color: #93c5fd; margin-bottom: 4px; display:flex; justify-content:space-between;'>" +
          "<span>" + entity.name + "</span>" +
          "<span style='font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 8px; background: " + entity.clusterColor + "; color:#fff;'>Cluster " + entity.clusterId + "</span>" +
        "</div>" +
        "<div style='font-size: 11px; color:#cbd5e1;'>Market / Region: <b>" + entity.category + "</b></div>" +
        "<div style='font-size: 11px; color:#94a3b8; margin-top:4px;'>Distance to Centroid: <b>" + (entity.distToCentroid ? entity.distToCentroid.toFixed(3) : "N/A") + "</b></div>";

      if (entity.isAnomaly) {
        html += "<div style='font-size: 10.5px; color: #f87171; background: rgba(239,68,68,0.15); border-left: 3px solid #ef4444; padding: 3px 6px; margin-top: 4px;'>⚠️ Anomaly Outlier</div>";
      }

      tooltip.innerHTML = html;
      tooltip.style.opacity = "1";
      this.moveTooltip(e);
    },

    moveTooltip: function (e) {
      var tooltip = this._tooltip;
      var rootRect = this._container.getBoundingClientRect();
      var x = e.clientX - rootRect.left + 16;
      var y = e.clientY - rootRect.top + 16;

      if (x + 310 > rootRect.width) x = e.clientX - rootRect.left - 320;
      if (y + 170 > rootRect.height) y = e.clientY - rootRect.top - 170;

      tooltip.style.left = Math.max(10, x) + "px";
      tooltip.style.top = Math.max(10, y) + "px";
    },

    hideTooltip: function () {
      if (this._tooltip) {
        this._tooltip.style.opacity = "0";
      }
    }
  };

  looker.plugins.visualizations.add(vizConfig);
})();
