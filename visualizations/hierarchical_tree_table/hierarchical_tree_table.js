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
 * Capabilities:
 * - Single-Column Indented Hierarchy: Consolidates 2 to 6 nested dimensions into one clean
 *   tree column with expandable/collapsible branch chevrons, depth guides, and level tags.
 * - Dynamic Multi-Level Subtotals: Parent rows automatically calculate exact rollups of their children.
 * - In-Cell Visual Bars & % Share: Subtle horizontal progress bars and share-of-parent percentages.
 * - Branch Search & Quick Actions: Instant filtering that automatically auto-expands matching branches.
 * - Scalable to 5,000+ rows with minimal memory retention and Looker drill-down integration.
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
      name: "Executive Slate",
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
      name: "Google Cloud Blue",
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
      name: "Emerald Enterprise",
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
      case "numeric":
      default:
        return Math.round(num).toLocaleString();
    }
  }

  looker.plugins.visualizations.add({
    id: "hierarchical_tree_table",
    label: "Collapsible Hierarchical Tree Grid",
    options: {
      // SECTION 1: DISPLAY
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
      showBars: {
        type: "boolean",
        label: "Show In-Cell Share Progress Bars",
        section: "Display",
        order: 3,
        default: true
      },
      showPercentShare: {
        type: "boolean",
        label: "Show % of Parent Group Share",
        section: "Display",
        order: 4,
        default: true
      },
      showSearch: {
        type: "boolean",
        label: "Show Branch Search Filter",
        section: "Display",
        order: 5,
        default: true
      },
      showSummaryBar: {
        type: "boolean",
        label: "Show Executive Rollup Summary Bar",
        section: "Display",
        order: 6,
        default: true
      },
      valueFormat: {
        type: "string",
        label: "Primary Measure Value Format",
        section: "Display",
        order: 7,
        display: "select",
        values: [
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Compact Number (1.2M)": "compact_num" },
          { "Raw Formatted Number (1,234,567)": "numeric" }
        ],
        default: "compact_currency"
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Visual Theme",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Executive Slate": "slate" },
          { "Google Cloud Blue": "google_blue" },
          { "Cyber NOC Dark": "cyber_dark" },
          { "Emerald Enterprise": "emerald" }
        ],
        default: "slate"
      },
      rowDensity: {
        type: "string",
        label: "Row Density / Padding",
        section: "Style",
        order: 2,
        display: "select",
        values: [
          { "Compact (28px)": "compact" },
          { "Normal (36px)": "normal" },
          { "Relaxed (44px)": "relaxed" }
        ],
        default: "normal"
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
        this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        element.appendChild(this._container);
      }

      this.clearErrors();

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, element, config, queryResponse);
          done();
        } catch (err) {
          console.error("Hierarchical Tree Grid Render Error:", err);
          self.addError({
            title: "Rendering Error",
            message: err.message || "Failed to render Hierarchical Tree Grid."
          });
          done();
        }
      });
    },

    _render: function (d3, data, element, config, queryResponse) {
      var self = this;
      this._container.innerHTML = "";
      if (this._tooltip) this._tooltip.style.display = "none";

      if (!data || !data.length) {
        this.addError({
          title: "No Data",
          message: "The query returned no data rows to visualize."
        });
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || fields.dimension_like || [];
      var meas = fields.measures || fields.measure_like || [];

      if (dims.length < 2) {
        this.addError({
          title: "Hierarchical Dimensions Required",
          message: "The Collapsible Hierarchical Tree Grid requires at least 2 Dimensions (e.g. Department > Category, or Country > State) to form a parent-child hierarchy."
        });
        return;
      }

      var theme = THEMES[config.colorTheme] || THEMES.slate;
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

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var currentNode = root;
        currentNode.rowCount++;

        meas.forEach(function (m) {
          var val = (row[m.name] && !isNaN(Number(row[m.name].value))) ? Number(row[m.name].value) : 0;
          currentNode.measures[m.name] += val;
        });

        // Traverse each hierarchy tier
        for (var d = 0; d < dims.length; d++) {
          var dim = dims[d];
          var rawVal = row[dim.name] ? String(row[dim.name].value || "Unknown").trim() : "Unknown";
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
              rowCount: 0
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

      // Default Expansion Initialization (only set if not previously tracked)
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
              // level1: level 0 expanded, deeper levels collapsed
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

      // Hierarchy breadcrumbs / Title
      var leftControls = document.createElement("div");
      leftControls.style.display = "flex";
      leftControls.style.alignItems = "center";
      leftControls.style.gap = "8px";

      var dimBadges = dims.map(function (d, idx) {
        return '<span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; background:' + theme.badgeBg + '; color:' + theme.badgeText + ';">' +
               'L' + (idx + 1) + ': ' + (d.label_short || d.label || d.name) + '</span>';
      }).join('<span style="color:' + theme.subtext + '; font-size:10px;">&rarr;</span>');

      leftControls.innerHTML =
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span style="font-size:14px;">🗂️</span>' +
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
      // 3. EXECUTIVE SUMMARY ROLLUP BAR
      // ==========================================
      if (config.showSummaryBar !== false && meas.length > 0) {
        var summaryBar = document.createElement("div");
        summaryBar.style.display = "flex";
        summaryBar.style.alignItems = "center";
        summaryBar.style.gap = "20px";
        summaryBar.style.padding = "8px 16px";
        summaryBar.style.background = theme.parentBg;
        summaryBar.style.borderBottom = "1px solid " + theme.border;
        summaryBar.style.fontSize = "11.5px";
        summaryBar.style.flexShrink = "0";

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
      table.style.fontSize = "12px";
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
      thTree.style.minWidth = "320px";
      thTree.textContent = "Hierarchical Structure (" + dims.map(function (d) { return d.label_short || d.label || d.name; }).join(" / ") + ")";
      headerRow.appendChild(thTree);

      // Measure Column Headers
      meas.forEach(function (m) {
        var th = document.createElement("th");
        th.style.padding = "10px 16px";
        th.style.color = theme.headerText;
        th.style.fontWeight = "700";
        th.style.textAlign = "right";
        th.style.minWidth = "140px";
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

        // Helper to traverse and collect visible rows
        function collectRows(node) {
          var children = Object.values(node.children);
          // Sort children by primary measure descending
          if (meas.length > 0) {
            var m0 = meas[0].name;
            children.sort(function (a, b) {
              return (b.measures[m0] || 0) - (a.measures[m0] || 0);
            });
          }

          children.forEach(function (child) {
            var hasChildren = Object.keys(child.children).length > 0;
            var isExpanded = Boolean(self._expandedMap[child.id]);

            if (searchActive) {
              if (!branchMatchesSearch(child, self._searchQuery)) return;
              // If searching, auto-expand so matching leaves are seen
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

          // Expand / Collapse Chevron (if has children)
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
            toggleBtn.style.transition = "transform 0.1s ease";

            toggleBtn.onclick = function (e) {
              e.stopPropagation();
              self._expandedMap[node.id] = !self._expandedMap[node.id];
              self._renderTableBody();
            };
            cellContent.appendChild(toggleBtn);
          } else {
            // Leaf dot or indent spacer
            var spacer = document.createElement("span");
            spacer.innerHTML = hasChildren ? "📁" : "•";
            spacer.style.width = "18px";
            spacer.style.textAlign = "center";
            spacer.style.color = theme.subtext;
            spacer.style.fontSize = hasChildren ? "12px" : "16px";
            cellContent.appendChild(spacer);
          }

          // Node Name Label
          var nameSpan = document.createElement("span");
          nameSpan.style.fontWeight = (hasChildren || node.level === 0) ? "700" : "500";
          nameSpan.style.color = theme.text;
          nameSpan.style.cursor = "pointer";

          // Highlight search matches
          if (self._searchQuery && node.name.toLowerCase().indexOf(self._searchQuery) !== -1) {
            nameSpan.innerHTML = node.name.replace(new RegExp("(" + self._searchQuery + ")", "gi"), '<mark style="background:#fde047; padding:0 2px; border-radius:2px;">$1</mark>');
          } else {
            nameSpan.textContent = node.name;
          }

          // Clicking row name also toggles expand
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
