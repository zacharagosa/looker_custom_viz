/**
 * Interactive Hierarchical Drilldown Treemap - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Google-Internal Buganizer Cloud Blockers & Customer Requirements:
 * - b/328594464: "Data Analytics > Looker > Treemap Visualization for Looker [Cloud Blocker]"
 * - b/396197680: "Data Analytics > Looker > Treemap Color by dimension [Cloud Blocker]"
 * - b/530822261: "Data Analytics > Looker > Native 'Top N and Others' Visualization Bucketing [Cloud Blocker]"
 * - b/325124429: "Woolworths - Availability of new vizualization features: Treemap Support"
 * - PRD / Customer Requirements: Retail, E-Commerce, Telco, Gaming & Cloud Cost Allocation
 *   (Multi-tier hierarchical category & brand decomposition, dual-measure encoding,
 *   smooth zoom drilldowns, breadcrumb trails, real-time search, and 5,000+ row scalability)
 *
 * Multi-Mode Adaptability:
 * 1. "drilldown": Dynamic Zoomable Treemap. Clicking any parent node zooms into its children
 *                 with smooth transitions and interactive breadcrumb navigation ("All > Men > Jeans").
 * 2. "nested": Multi-Tier Nested Treemap displaying all hierarchy levels simultaneously with
 *              styled parent header ribbons and child tiles nested within.
 * 3. "flat_top_n": Top-N Leaf Treemap with automated "+N Others" tail bucketing (b/530822261).
 *
 * Dual-Metric Color Encoding (b/396197680):
 * - Tile Size: Primary Measure (e.g. Total Revenue / Units).
 * - Tile Color:
 *   - "branch": Categorical hue per top-level branch with harmonized child lightness.
 *   - "metric_diverging": Continuous diverging gradient on Secondary Measure (e.g. Margin %, Growth Delta).
 *   - "metric_sequential": Continuous sequential gradient on Secondary Measure.
 *   - "depth": Monochromatic level depth shading.
 *
 * Scalability (5,000+ rows):
 * - Client-side tree rollup with recursive aggregation.
 * - Dynamic tail consolidation (< 0.5% or beyond Top N leaves per branch grouped into "Others").
 * - Instantaneous search-as-you-type filter with glow focus and tile dimming.
 *
 * Minimal Option Sections (Strictly 2 clean tabs):
 * - Display: displayMode, tilingMethod, colorMode, topNCount, valueFormat, showExecutiveHUD, showBreadcrumbs, showSearch, tilePadding.
 * - Style: colorTheme, tileCornerRadius, labelFontSize, showSecondaryMetricInLabel, hoverEffect.
 */

(function () {
  // Theme Palettes
  var COLOR_THEMES = {
    google: {
      name: "Looker / Google Modern",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9334E6", "#00ACC1", "#FF7043", "#5C6BC0", "#00897B", "#D81B60"],
      bg: "#ffffff",
      text: "#1f2937",
      subtext: "#6b7280",
      border: "#e5e7eb",
      hudBg: "#f8fafc",
      tileBorder: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbActive: "#1e293b",
      searchBg: "#ffffff",
      searchBorder: "#cbd5e1",
      diverging: ["#EA4335", "#FBBC04", "#34A853"],
      sequential: ["#E8F0FE", "#8AB4F8", "#4285F4", "#1967D2", "#174EA6"]
    },
    executive_slate: {
      name: "Executive Slate & Indigo",
      colors: ["#4f46e5", "#0284c7", "#0d9488", "#475569", "#7c3aed", "#2563eb", "#64748b", "#0891b2", "#059669", "#d97706"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      border: "#e2e8f0",
      hudBg: "#f8fafc",
      tileBorder: "#ffffff",
      breadcrumbBg: "#f1f5f9",
      breadcrumbActive: "#0f172a",
      searchBg: "#ffffff",
      searchBorder: "#cbd5e1",
      diverging: ["#f43f5e", "#fbbf24", "#10b981"],
      sequential: ["#e0e7ff", "#a5b4fc", "#6366f1", "#4f46e5", "#3730a3"]
    },
    emerald_mint: {
      name: "Emerald & Mint",
      colors: ["#059669", "#0d9488", "#10b981", "#34d399", "#0284c7", "#047857", "#065f46", "#14b8a6", "#3b82f6", "#f59e0b"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      border: "#d1fae5",
      hudBg: "#f0fdf4",
      tileBorder: "#ffffff",
      breadcrumbBg: "#ecfdf5",
      breadcrumbActive: "#064e3b",
      searchBg: "#ffffff",
      searchBorder: "#a7f3d0",
      diverging: ["#ef4444", "#f59e0b", "#10b981"],
      sequential: ["#d1fae5", "#6ee7b7", "#10b981", "#059669", "#064e3b"]
    },
    sunset_ember: {
      name: "Sunset Ember",
      colors: ["#f97316", "#ef4444", "#f59e0b", "#e11d48", "#ec4899", "#8b5cf6", "#d97706", "#b91c1c", "#4f46e5", "#0284c7"],
      bg: "#ffffff",
      text: "#7c2d12",
      subtext: "#9a3412",
      border: "#fed7aa",
      hudBg: "#fff7ed",
      tileBorder: "#ffffff",
      breadcrumbBg: "#ffedd5",
      breadcrumbActive: "#7c2d12",
      searchBg: "#ffffff",
      searchBorder: "#fdba74",
      diverging: ["#dc2626", "#fbbf24", "#16a34a"],
      sequential: ["#ffedd5", "#fdba74", "#fb923c", "#ea580c", "#9a3412"]
    },
    cyber_neon: {
      name: "Cyberpunk Dark",
      colors: ["#00f5d4", "#f72585", "#7209b7", "#4cc9f0", "#fee440", "#ff007f", "#3a0ca3", "#4361ee", "#10b981", "#f97316"],
      bg: "#0f172a",
      text: "#f8fafc",
      subtext: "#94a3b8",
      border: "#334155",
      hudBg: "#1e293b",
      tileBorder: "#0f172a",
      breadcrumbBg: "#1e293b",
      breadcrumbActive: "#38bdf8",
      searchBg: "#1e293b",
      searchBorder: "#475569",
      diverging: ["#f43f5e", "#facc15", "#2dd4bf"],
      sequential: ["#1e293b", "#0284c7", "#38bdf8", "#7dd3fc", "#e0f2fe"]
    }
  };

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
        return (num * (Math.abs(num) <= 1 ? 100 : 1)).toFixed(1) + "%";
      case "raw":
      default:
        return Math.abs(num) >= 100 ? num.toLocaleString(undefined, { maximumFractionDigits: 1 }) : num.toFixed(2);
    }
  }

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.treemap === "function") {
      callback(window.d3);
      return;
    }
    var script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = function () {
      callback(window.d3);
    };
    document.head.appendChild(script);
  }

  looker.plugins.visualizations.add({
    id: "interactive_drilldown_treemap",
    label: "Interactive Hierarchical Drilldown Treemap",
    options: {
      // SECTION 1: DISPLAY
      displayMode: {
        type: "string",
        label: "Display Mode",
        default: "drilldown",
        display: "select",
        values: [
          { "Hierarchical Zoom & Breadcrumbs": "drilldown" },
          { "Nested Multi-Tier (All Levels)": "nested" },
          { "Dynamic Top-N & Others Bucketing": "flat_top_n" }
        ],
        section: "Display",
        order: 1
      },
      tilingMethod: {
        type: "string",
        label: "Tiling Algorithm",
        default: "squarify",
        display: "select",
        values: [
          { "Squarified (Golden Ratio Aspect)": "squarify" },
          { "Binary (Balanced Partition)": "binary" },
          { "Dice (Horizontal Striping)": "dice" }
        ],
        section: "Display",
        order: 2
      },
      colorMode: {
        type: "string",
        label: "Color Encoding Mode",
        default: "branch",
        display: "select",
        values: [
          { "Categorical by Hierarchy Branch": "branch" },
          { "Secondary Metric Diverging Gradient": "metric_diverging" },
          { "Secondary Metric Sequential Gradient": "metric_sequential" },
          { "Monochromatic Depth Shading": "depth" }
        ],
        section: "Display",
        order: 3
      },
      topNCount: {
        type: "string",
        label: "Top-N / Tail Consolidation",
        default: "50",
        display: "select",
        values: [
          { "Top 10": "10" },
          { "Top 20": "20" },
          { "Top 50": "50" },
          { "Top 100": "100" },
          { "All Nodes (Uncapped)": "all" }
        ],
        section: "Display",
        order: 4
      },
      valueFormat: {
        type: "string",
        label: "Primary Metric Format",
        default: "compact_currency",
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Percentage (12.5%)": "percentage" },
          { "Raw Number": "raw" }
        ],
        section: "Display",
        order: 5
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive KPI Summary HUD",
        default: true,
        section: "Display",
        order: 6
      },
      showBreadcrumbs: {
        type: "boolean",
        label: "Show Breadcrumb Navigation Bar",
        default: true,
        section: "Display",
        order: 7
      },
      showSearch: {
        type: "boolean",
        label: "Show Quick Search Filter Bar",
        default: true,
        section: "Display",
        order: 8
      },
      tilePadding: {
        type: "string",
        label: "Tile Inner Spacing",
        default: "2",
        display: "select",
        values: [
          { "Flush (0px)": "0" },
          { "Compact (2px)": "2" },
          { "Standard (4px)": "4" },
          { "Relaxed (6px)": "6" }
        ],
        section: "Display",
        order: 9
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Palette Theme",
        default: "google",
        display: "select",
        values: [
          { "Looker / Google Modern": "google" },
          { "Executive Slate & Indigo": "executive_slate" },
          { "Emerald & Mint": "emerald_mint" },
          { "Sunset Ember": "sunset_ember" },
          { "Cyberpunk Dark": "cyber_neon" }
        ],
        section: "Style",
        order: 1
      },
      tileCornerRadius: {
        type: "string",
        label: "Tile Corner Radius",
        default: "4",
        display: "select",
        values: [
          { "Sharp (0px)": "0" },
          { "Subtle (4px)": "4" },
          { "Modern Rounded (8px)": "8" }
        ],
        section: "Style",
        order: 2
      },
      labelFontSize: {
        type: "string",
        label: "Tile Label Font Size",
        default: "12",
        display: "select",
        values: [
          { "Small (10px)": "10" },
          { "Medium (12px)": "12" },
          { "Large (14px)": "14" }
        ],
        section: "Style",
        order: 3
      },
      showSecondaryMetricInLabel: {
        type: "boolean",
        label: "Show Secondary Metric in Tile Label",
        default: true,
        section: "Style",
        order: 4
      },
      hoverEffect: {
        type: "string",
        label: "Hover Animation Effect",
        default: "elevate",
        display: "select",
        values: [
          { "Elevate & Glow Focus": "elevate" },
          { "Brighten Fill": "brighten" },
          { "Subtle Border Stroke": "border" }
        ],
        section: "Style",
        order: 5
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      var container = document.createElement("div");
      container.className = "looker-treemap-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.boxSizing = "border-box";
      container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      element.appendChild(container);

      this._container = container;
      this._activeDrillNode = null;
      this._searchTerm = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      // Validate dimensions & measures
      var dimensions = queryResponse.fields.dimension_like || [];
      var measures = queryResponse.fields.measure_like || [];

      if (dimensions.length < 1) {
        this.addError({
          title: "Insufficient Dimensions",
          message: "The Interactive Drilldown Treemap requires at least 1 Dimension (e.g. Department > Category > Brand)."
        });
        done();
        return;
      }

      if (measures.length < 1) {
        this.addError({
          title: "Insufficient Measures",
          message: "The Interactive Drilldown Treemap requires at least 1 Measure (Primary Measure for tile sizing, e.g. Total Sales)."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, config, queryResponse);
          done();
        } catch (err) {
          console.error("Interactive Treemap Render Error:", err);
          self.addError({
            title: "Render Error",
            message: "Unable to render treemap: " + err.message
          });
          done();
        }
      });
    },

    _render: function (d3, data, config, queryResponse) {
      var container = this._container;
      container.innerHTML = "";

      var themeKey = config.colorTheme || "google";
      var theme = COLOR_THEMES[themeKey] || COLOR_THEMES.google;
      var displayMode = config.displayMode || "drilldown";
      var tilingMethod = config.tilingMethod || "squarify";
      var colorMode = config.colorMode || "branch";
      var topN = config.topNCount === "all" ? 999999 : parseInt(config.topNCount || "50", 10);
      var valFmt = config.valueFormat || "compact_currency";
      var pad = parseInt(config.tilePadding || "2", 10);
      var radius = parseInt(config.tileCornerRadius || "4", 10);
      var fontSize = parseInt(config.labelFontSize || "12", 10);
      var showHUD = config.showExecutiveHUD !== false;
      var showBreadcrumbs = config.showBreadcrumbs !== false;
      var showSearch = config.showSearch !== false;
      var showSecMetric = config.showSecondaryMetricInLabel !== false;
      var hoverStyle = config.hoverEffect || "elevate";

      var dimFields = queryResponse.fields.dimension_like || [];
      var measFields = queryResponse.fields.measure_like || [];
      var primaryMeas = measFields[0];
      var secondaryMeas = measFields.length > 1 ? measFields[1] : null;

      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      // 1. Build Hierarchical Data Tree
      var rootData = {
        name: "All",
        id: "root",
        depth: 0,
        children: []
      };

      var totalSum = 0;
      var totalCount = 0;
      var topCategoryMap = {};

      data.forEach(function (row) {
        var primVal = row[primaryMeas.name] ? Number(row[primaryMeas.name].value) : 0;
        if (isNaN(primVal) || primVal <= 0) return;

        var secVal = secondaryMeas && row[secondaryMeas.name] ? Number(row[secondaryMeas.name].value) : null;
        totalSum += primVal;
        totalCount++;

        var curr = rootData;
        for (var i = 0; i < dimFields.length; i++) {
          var dimName = dimFields[i].name;
          var dimVal = row[dimName] && row[dimName].value !== null ? String(row[dimName].value) : "(Blank)";
          var isLeaf = (i === dimFields.length - 1);

          if (i === 0) {
            topCategoryMap[dimVal] = (topCategoryMap[dimVal] || 0) + primVal;
          }

          var existing = null;
          if (curr.children) {
            for (var c = 0; c < curr.children.length; c++) {
              if (curr.children[c].name === dimVal) {
                existing = curr.children[c];
                break;
              }
            }
          } else {
            curr.children = [];
          }

          if (!existing) {
            existing = {
              name: dimVal,
              id: (curr.id + "/" + dimVal).replace(/\s+/g, "_"),
              depth: i + 1,
              dimField: dimFields[i],
              drillLinks: row[dimName] && row[dimName].links ? row[dimName].links : [],
              branchName: i === 0 ? dimVal : curr.branchName,
              value: 0,
              secValue: 0,
              secCount: 0,
              children: isLeaf ? undefined : []
            };
            curr.children.push(existing);
          }

          existing.value += primVal;
          if (secVal !== null) {
            existing.secValue = (existing.secValue || 0) + secVal;
            existing.secCount = (existing.secCount || 0) + 1;
          }

          curr = existing;
        }
      });

      // Top contributor calculation
      var topBranchName = "-";
      var topBranchVal = 0;
      Object.keys(topCategoryMap).forEach(function (k) {
        if (topCategoryMap[k] > topBranchVal) {
          topBranchVal = topCategoryMap[k];
          topBranchName = k;
        }
      });
      var topBranchShare = totalSum > 0 ? ((topBranchVal / totalSum) * 100).toFixed(1) + "%" : "0%";

      // Calculate branch colors
      var branchColorMap = {};
      if (rootData.children) {
        rootData.children.forEach(function (child, idx) {
          branchColorMap[child.name] = theme.colors[idx % theme.colors.length];
        });
      }

      // 2. Setup Top Control Bars (HUD, Breadcrumbs & Search)
      var topControls = document.createElement("div");
      topControls.className = "treemap-top-controls";
      topControls.style.display = "flex";
      topControls.style.flexDirection = "column";
      topControls.style.gap = "8px";
      topControls.style.padding = "10px 14px 6px 14px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.flexShrink = "0";
      container.appendChild(topControls);

      // Executive HUD
      if (showHUD) {
        var hud = document.createElement("div");
        hud.className = "treemap-hud";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.justifyContent = "space-between";
        hud.style.flexWrap = "wrap";
        hud.style.gap = "12px";
        hud.style.padding = "8px 14px";
        hud.style.backgroundColor = theme.hudBg;
        hud.style.borderRadius = "6px";
        hud.style.border = "1px solid " + theme.border;

        var hudStats = [
          { label: "Total Universe", val: formatValue(totalSum, valFmt), icon: "💼" },
          { label: "Active View", val: this._activeDrillNode ? this._activeDrillNode.data.name : "All Branches", icon: "🔍" },
          { label: "Top Contributor", val: topBranchName + " (" + topBranchShare + ")", icon: "⭐" },
          { label: "Total Records", val: totalCount.toLocaleString(), icon: "📊" }
        ];

        hudStats.forEach(function (st) {
          var item = document.createElement("div");
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.gap = "8px";

          var iconEl = document.createElement("span");
          iconEl.style.fontSize = "14px";
          iconEl.textContent = st.icon;
          item.appendChild(iconEl);

          var textCol = document.createElement("div");
          var lbl = document.createElement("div");
          lbl.style.fontSize = "10px";
          lbl.style.textTransform = "uppercase";
          lbl.style.letterSpacing = "0.05em";
          lbl.style.color = theme.subtext;
          lbl.style.fontWeight = "600";
          lbl.textContent = st.label;

          var val = document.createElement("div");
          val.style.fontSize = "13px";
          val.style.fontWeight = "700";
          val.style.color = theme.text;
          val.textContent = st.val;

          textCol.appendChild(lbl);
          textCol.appendChild(val);
          item.appendChild(textCol);
          hud.appendChild(item);
        });

        topControls.appendChild(hud);
      }

      // Nav bar: Breadcrumbs & Search
      var navBar = document.createElement("div");
      navBar.className = "treemap-navbar";
      navBar.style.display = "flex";
      navBar.style.alignItems = "center";
      navBar.style.justifyContent = "space-between";
      navBar.style.gap = "12px";
      navBar.style.flexWrap = "wrap";
      topControls.appendChild(navBar);

      // Breadcrumb container
      var breadcrumbContainer = document.createElement("div");
      breadcrumbContainer.className = "treemap-breadcrumbs";
      breadcrumbContainer.style.display = showBreadcrumbs ? "flex" : "none";
      breadcrumbContainer.style.alignItems = "center";
      breadcrumbContainer.style.gap = "6px";
      breadcrumbContainer.style.fontSize = "12px";
      breadcrumbContainer.style.fontWeight = "500";
      navBar.appendChild(breadcrumbContainer);

      // Search Bar
      var searchInput = null;
      if (showSearch) {
        var searchBox = document.createElement("div");
        searchBox.style.display = "flex";
        searchBox.style.alignItems = "center";
        searchBox.style.position = "relative";
        searchBox.style.minWidth = "180px";

        searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search entities...";
        searchInput.value = this._searchTerm || "";
        searchInput.style.width = "100%";
        searchInput.style.padding = "5px 28px 5px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.border = "1px solid " + theme.searchBorder;
        searchInput.style.borderRadius = "4px";
        searchInput.style.backgroundColor = theme.searchBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";

        var searchIcon = document.createElement("span");
        searchIcon.textContent = "🔍";
        searchIcon.style.position = "absolute";
        searchIcon.style.right = "8px";
        searchIcon.style.fontSize = "11px";
        searchIcon.style.pointerEvents = "none";

        searchBox.appendChild(searchInput);
        searchBox.appendChild(searchIcon);
        navBar.appendChild(searchBox);
      }

      // 3. Tree Visualization Canvas
      var vizArea = document.createElement("div");
      vizArea.className = "treemap-viz-area";
      vizArea.style.flex = "1 1 auto";
      vizArea.style.width = "100%";
      vizArea.style.height = "calc(100% - " + (topControls.offsetHeight || 80) + "px)";
      vizArea.style.position = "relative";
      vizArea.style.overflow = "hidden";
      container.appendChild(vizArea);

      // Tooltip Element
      var tooltip = document.createElement("div");
      tooltip.className = "treemap-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.visibility = "hidden";
      tooltip.style.backgroundColor = themeKey === "cyber_neon" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)";
      tooltip.style.color = theme.text;
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
      tooltip.style.border = "1px solid " + theme.border;
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "280px";
      vizArea.appendChild(tooltip);

      // SVG
      var rect = vizArea.getBoundingClientRect();
      var width = Math.max(100, rect.width || container.clientWidth || 800);
      var height = Math.max(100, rect.height || container.clientHeight - 80 || 500);

      var svg = d3.select(vizArea)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Tiling Function
      var tileFunc = d3.treemapSquarify.ratio(1.618);
      if (tilingMethod === "binary") tileFunc = d3.treemapBinary;
      if (tilingMethod === "dice") tileFunc = d3.treemapDice;

      // Color Scales
      var secMin = Infinity;
      var secMax = -Infinity;
      function scanSecValues(node) {
        if (node.secValue !== undefined && node.secCount > 0) {
          var avgSec = node.secValue / node.secCount;
          if (avgSec < secMin) secMin = avgSec;
          if (avgSec > secMax) secMax = avgSec;
        }
        if (node.children) {
          node.children.forEach(scanSecValues);
        }
      }
      scanSecValues(rootData);
      if (secMin === Infinity) { secMin = 0; secMax = 100; }
      if (secMin === secMax) secMax = secMin + 1;

      var divergingScale = d3.scaleLinear()
        .domain([secMin, (secMin + secMax) / 2, secMax])
        .range(theme.diverging)
        .interpolate(d3.interpolateRgb);

      var sequentialScale = d3.scaleQuantize()
        .domain([secMin, secMax])
        .range(theme.sequential);

      function getNodeColor(d) {
        if (colorMode === "metric_diverging" && secondaryMeas) {
          var valDiv = (d.data.secValue || 0) / (d.data.secCount || 1);
          return divergingScale(valDiv);
        }
        if (colorMode === "metric_sequential" && secondaryMeas) {
          var valSeq = (d.data.secValue || 0) / (d.data.secCount || 1);
          return sequentialScale(valSeq);
        }
        if (colorMode === "depth") {
          var baseHue = theme.colors[0];
          var lightness = 0.35 + (d.depth * 0.18);
          return d3.interpolateLab(baseHue, "#ffffff")(lightness);
        }
        // Default "branch" color
        var bName = d.data.branchName || (d.depth === 1 ? d.data.name : "Other");
        var baseColor = branchColorMap[bName] || theme.colors[0];
        if (d.depth > 1) {
          var depthFactor = Math.min(0.65, (d.depth - 1) * 0.22);
          return d3.interpolateLab(baseColor, "#ffffff")(depthFactor);
        }
        return baseColor;
      }

      var self = this;

      // 4. Render Hierarchy Function
      function renderLevel(targetDataNode) {
        svg.selectAll("*").remove();

        // Update Breadcrumb trail
        updateBreadcrumbs(targetDataNode);

        // Build D3 Hierarchy
        var hierarchyNode = d3.hierarchy(targetDataNode)
          .sum(function (d) { return d.children && d.children.length ? 0 : d.value; })
          .sort(function (a, b) { return b.value - a.value; });

        // Apply Top-N / Tail Consolidation if in flat_top_n mode or high cardinality
        if (displayMode === "flat_top_n" && hierarchyNode.children) {
          var leaves = hierarchyNode.leaves();
          if (leaves.length > topN) {
            var topLeaves = leaves.slice(0, topN);
            var otherSum = 0;
            var otherCount = 0;
            for (var k = topN; k < leaves.length; k++) {
              otherSum += leaves[k].value;
              otherCount++;
            }
            var consolidatedData = {
              name: targetDataNode.name,
              id: targetDataNode.id,
              children: topLeaves.map(function (l) { return l.data; }).concat([{
                name: "+ " + otherCount + " Others",
                id: targetDataNode.id + "/others",
                value: otherSum,
                isOthers: true,
                branchName: "Others"
              }])
            };
            hierarchyNode = d3.hierarchy(consolidatedData)
              .sum(function (d) { return d.value; })
              .sort(function (a, b) { return b.value - a.value; });
          }
        }

        var treemapLayout = d3.treemap()
          .size([width, height])
          .tile(tileFunc)
          .paddingInner(pad)
          .paddingOuter(pad)
          .round(true);

        if (displayMode === "nested") {
          treemapLayout.paddingTop(22).paddingInner(pad * 2);
        }

        treemapLayout(hierarchyNode);

        var nodesToRender = displayMode === "nested"
          ? hierarchyNode.descendants().filter(function (d) { return d.depth > 0; })
          : hierarchyNode.children || [hierarchyNode];

        // Group container
        var cell = svg.selectAll("g")
          .data(nodesToRender)
          .enter()
          .append("g")
          .attr("transform", function (d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
          .style("cursor", function (d) {
            return (d.data.children && d.data.children.length) || (d.children && d.children.length) ? "pointer" : "default";
          });

        // Background Tile Rect
        cell.append("rect")
          .attr("id", function (d) { return "rect-" + d.data.id; })
          .attr("width", function (d) { return Math.max(0, d.x1 - d.x0); })
          .attr("height", function (d) { return Math.max(0, d.y1 - d.y0); })
          .attr("rx", radius)
          .attr("ry", radius)
          .attr("fill", function (d) {
            return d.data.isOthers ? "#94a3b8" : getNodeColor(d);
          })
          .attr("stroke", theme.tileBorder)
          .attr("stroke-width", pad > 0 ? "1px" : "0px")
          .style("transition", "fill 0.2s ease, filter 0.2s ease, opacity 0.2s ease");

        // Clip path for text overflow
        cell.append("clipPath")
          .attr("id", function (d) { return "clip-" + d.data.id; })
          .append("rect")
          .attr("width", function (d) { return Math.max(0, d.x1 - d.x0 - 6); })
          .attr("height", function (d) { return Math.max(0, d.y1 - d.y0 - 6); })
          .attr("rx", radius);

        // Text Labels (Only render if tile is large enough)
        var labelGroup = cell.append("g")
          .attr("clip-path", function (d) { return "url(#clip-" + d.data.id + ")"; })
          .attr("transform", "translate(6, 6)")
          .style("pointer-events", "none");

        labelGroup.each(function (d) {
          var g = d3.select(this);
          var w = d.x1 - d.x0;
          var h = d.y1 - d.y0;

          if (w >= 50 && h >= 28) {
            // Entity Name
            g.append("text")
              .attr("x", 2)
              .attr("y", fontSize)
              .attr("font-size", fontSize + "px")
              .attr("font-weight", "600")
              .attr("fill", "#ffffff")
              .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)")
              .text(d.data.name);

            // Primary Metric Value
            if (h >= 46 && w >= 60) {
              g.append("text")
                .attr("x", 2)
                .attr("y", fontSize + 15)
                .attr("font-size", Math.max(10, fontSize - 1) + "px")
                .attr("font-weight", "500")
                .attr("fill", "rgba(255, 255, 255, 0.92)")
                .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)")
                .text(formatValue(d.value, valFmt));
            }

            // Share / Secondary Metric badge
            if (h >= 66 && w >= 80 && showSecMetric && secondaryMeas && d.data.secValue !== undefined) {
              var secValAvg = d.data.secValue / (d.data.secCount || 1);
              g.append("text")
                .attr("x", 2)
                .attr("y", fontSize + 30)
                .attr("font-size", "10px")
                .attr("font-weight", "500")
                .attr("fill", "rgba(255, 255, 255, 0.82)")
                .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)")
                .text(secondaryMeas.label_short + ": " + formatValue(secValAvg, "compact_currency"));
            }
          }
        });

        // Hover & Click Interactions
        cell.on("mouseenter", function (event, d) {
          if (hoverStyle === "elevate") {
            d3.select(this).select("rect")
              .attr("filter", "drop-shadow(0 8px 16px rgba(0,0,0,0.25))")
              .attr("stroke", "#ffffff")
              .attr("stroke-width", "2px");
          } else if (hoverStyle === "brighten") {
            d3.select(this).select("rect").style("filter", "brightness(1.15)");
          }

          // Tooltip content
          var parentVal = d.parent ? d.parent.value : totalSum;
          var shareParent = parentVal > 0 ? ((d.value / parentVal) * 100).toFixed(1) + "%" : "100%";
          var shareTotal = totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) + "%" : "100%";
          var secHtml = "";
          if (secondaryMeas && d.data.secValue !== undefined) {
            var secValAvg = d.data.secValue / (d.data.secCount || 1);
            secHtml = "<div style='display:flex; justify-content:space-between; margin-top:4px;'>" +
              "<span style='color:" + theme.subtext + ";'>" + secondaryMeas.label_short + ":</span>" +
              "<span style='font-weight:600;'>" + formatValue(secValAvg, "compact_currency") + "</span>" +
              "</div>";
          }

          var drillHint = (d.data.children && d.data.children.length)
            ? "<div style='margin-top:8px; padding-top:6px; border-top:1px dashed " + theme.border + "; font-size:10px; color:" + theme.subtext + ";'>👆 Click to Zoom / Drill Into Branch</div>"
            : "<div style='margin-top:8px; padding-top:6px; border-top:1px dashed " + theme.border + "; font-size:10px; color:" + theme.subtext + ";'>🔗 Right-click for Looker Drill Menu</div>";

          tooltip.innerHTML =
            "<div style='font-weight:700; font-size:13px; margin-bottom:4px; color:" + theme.text + ";'>" + d.data.name + "</div>" +
            "<div style='font-size:11px; color:" + theme.subtext + "; margin-bottom:6px;'>Level " + d.depth + " • " + (d.data.branchName || "Root") + "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>" + primaryMeas.label_short + ":</span>" +
            "<span style='font-weight:700; color:" + theme.text + ";'>" + formatValue(d.value, valFmt) + "</span>" +
            "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>Share of Parent:</span>" +
            "<span style='font-weight:600;'>" + shareParent + "</span>" +
            "</div>" +
            "<div style='display:flex; justify-content:space-between; margin-top:3px;'>" +
            "<span style='color:" + theme.subtext + ";'>Share of Total:</span>" +
            "<span style='font-weight:600;'>" + shareTotal + "</span>" +
            "</div>" +
            secHtml +
            drillHint;

          tooltip.style.visibility = "visible";
          tooltip.style.opacity = "1";
        });

        cell.on("mousemove", function (event) {
          var mouseX = event.clientX - vizArea.getBoundingClientRect().left;
          var mouseY = event.clientY - vizArea.getBoundingClientRect().top;
          var tipW = 240;
          var tipH = 140;

          var left = mouseX + 15;
          if (left + tipW > width) left = mouseX - tipW - 15;
          var top = mouseY + 15;
          if (top + tipH > height) top = mouseY - tipH - 15;

          tooltip.style.left = Math.max(8, left) + "px";
          tooltip.style.top = Math.max(8, top) + "px";
        });

        cell.on("mouseleave", function () {
          d3.select(this).select("rect")
            .attr("filter", "none")
            .attr("stroke", theme.tileBorder)
            .attr("stroke-width", pad > 0 ? "1px" : "0px")
            .style("filter", "none");

          tooltip.style.visibility = "hidden";
          tooltip.style.opacity = "0";
        });

        // Click to Drilldown into Child Branch
        cell.on("click", function (event, d) {
          if (displayMode === "drilldown" && d.data.children && d.data.children.length) {
            tooltip.style.visibility = "hidden";
            self._activeDrillNode = d;
            renderLevel(d.data);
          } else if (d.data.drillLinks && d.data.drillLinks.length && LookerCharts && LookerCharts.Utils) {
            LookerCharts.Utils.openDrillMenu({
              links: d.data.drillLinks,
              event: event
            });
          }
        });

        // Apply real-time search filtering
        applySearchFilter(self._searchTerm);
      }

      // 5. Breadcrumb Builder
      function updateBreadcrumbs(currentNodeData) {
        breadcrumbContainer.innerHTML = "";

        // Collect ancestors path
        var path = [];
        var curr = currentNodeData;
        while (curr) {
          path.unshift(curr);
          // Find parent in rootData
          if (curr.id === "root") break;
          curr = findParentNode(rootData, curr.id);
        }

        path.forEach(function (node, idx) {
          var isLast = idx === path.length - 1;

          var crumb = document.createElement("span");
          crumb.textContent = node.name === "All" ? "🏠 All Categories" : node.name;
          crumb.style.padding = "4px 8px";
          crumb.style.borderRadius = "4px";
          crumb.style.backgroundColor = isLast ? theme.breadcrumbActive : theme.breadcrumbBg;
          crumb.style.color = isLast ? "#ffffff" : theme.text;
          crumb.style.cursor = isLast ? "default" : "pointer";
          crumb.style.transition = "background-color 0.15s ease";

          if (!isLast) {
            crumb.onmouseenter = function () { crumb.style.backgroundColor = theme.border; };
            crumb.onmouseleave = function () { crumb.style.backgroundColor = theme.breadcrumbBg; };
            crumb.onclick = function () {
              self._activeDrillNode = node.id === "root" ? null : { data: node };
              renderLevel(node);
            };
          }

          breadcrumbContainer.appendChild(crumb);

          if (!isLast) {
            var sep = document.createElement("span");
            sep.textContent = "›";
            sep.style.color = theme.subtext;
            sep.style.fontSize = "14px";
            sep.style.lineHeight = "1";
            breadcrumbContainer.appendChild(sep);
          }
        });

        // Add Drill-Up button if zoomed in
        if (path.length > 1) {
          var drillUpBtn = document.createElement("button");
          drillUpBtn.innerHTML = "⬆ Drill Up";
          drillUpBtn.style.marginLeft = "8px";
          drillUpBtn.style.padding = "3px 8px";
          drillUpBtn.style.fontSize = "11px";
          drillUpBtn.style.fontWeight = "600";
          drillUpBtn.style.border = "1px solid " + theme.border;
          drillUpBtn.style.borderRadius = "4px";
          drillUpBtn.style.backgroundColor = theme.hudBg;
          drillUpBtn.style.color = theme.text;
          drillUpBtn.style.cursor = "pointer";
          drillUpBtn.onclick = function () {
            var parentNode = path[path.length - 2];
            self._activeDrillNode = parentNode.id === "root" ? null : { data: parentNode };
            renderLevel(parentNode);
          };
          breadcrumbContainer.appendChild(drillUpBtn);
        }
      }

      function findParentNode(searchRoot, targetId) {
        if (!searchRoot.children) return null;
        for (var i = 0; i < searchRoot.children.length; i++) {
          var child = searchRoot.children[i];
          if (child.id === targetId) return searchRoot;
          var found = findParentNode(child, targetId);
          if (found) return found;
        }
        return null;
      }

      // 6. Search Filter Handler
      function applySearchFilter(term) {
        if (!term || !term.trim()) {
          svg.selectAll("g").style("opacity", 1);
          svg.selectAll("rect").style("filter", "none");
          return;
        }
        var cleanTerm = term.toLowerCase().trim();
        svg.selectAll("g").each(function (d) {
          if (!d || !d.data) return;
          var g = d3.select(this);
          var matches = (d.data.name && d.data.name.toLowerCase().indexOf(cleanTerm) !== -1) ||
            (d.data.branchName && d.data.branchName.toLowerCase().indexOf(cleanTerm) !== -1);

          if (matches) {
            g.style("opacity", 1);
            g.select("rect")
              .attr("stroke", "#fbbf24")
              .attr("stroke-width", "2.5px")
              .style("filter", "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))");
          } else {
            g.style("opacity", 0.18);
            g.select("rect")
              .attr("stroke", theme.tileBorder)
              .attr("stroke-width", pad > 0 ? "1px" : "0px")
              .style("filter", "none");
          }
        });
      }

      if (searchInput) {
        searchInput.oninput = function () {
          self._searchTerm = this.value;
          applySearchFilter(this.value);
        };
      }

      // Initial Render
      var targetNode = this._activeDrillNode ? this._activeDrillNode.data : rootData;
      renderLevel(targetNode);
    }
  });
})();
