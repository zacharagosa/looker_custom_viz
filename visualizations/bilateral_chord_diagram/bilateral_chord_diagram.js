/**
 * Bilateral Chord Diagram & Directed Flow Matrix
 * Google Cloud Looker Custom Visualization
 * Built with D3.js v7
 *
 * Designed for bilateral entity relationships, customer migrations, brand switching,
 * supply chain fulfillment corridors, telecom network peering, and market basket affinities.
 * Solves Looker Cloud Blockers b/314340020, b/213338627, b/184376439, b/171817900, b/171818436.
 */

looker.plugins.visualizations.add({
  id: "bilateral_chord_diagram",
  label: "Bilateral Chord & Directed Flow Matrix",
  options: {
    // SECTION: DISPLAY (Only 2 sections allowed: Display & Style)
    vizMode: {
      type: "string",
      label: "Visualization Layout Mode",
      display: "select",
      values: [
        { "Circular Directed Chord": "chord" },
        { "Bilateral Flow Matrix (Heatmap)": "matrix" },
        { "Bipartite Split Corridor": "bipartite" }
      ],
      default: "chord",
      order: 1,
      section: "Display"
    },
    topN: {
      type: "string",
      label: "Entity Capacity Limiter",
      display: "select",
      values: [
        { "Top 8 Entities": "8" },
        { "Top 10 Entities": "10" },
        { "Top 12 Entities": "12" },
        { "Top 16 Entities": "16" },
        { "Top 20 Entities": "20" },
        { "All Entities (No Cap)": "all" }
      ],
      default: "12",
      order: 2,
      section: "Display"
    },
    bundleOther: {
      type: "boolean",
      label: "Bundle Remainder into \"Other\"",
      default: true,
      order: 3,
      section: "Display"
    },
    showSelfFlow: {
      type: "boolean",
      label: "Show Self-Flow (Intra-Entity)",
      default: true,
      order: 4,
      section: "Display"
    },
    directedFlow: {
      type: "boolean",
      label: "Directional Ribbon Gradients",
      default: true,
      order: 5,
      section: "Display"
    },
    showExecutiveHUD: {
      type: "boolean",
      label: "Executive Flow KPI HUD",
      default: true,
      order: 6,
      section: "Display"
    },
    showSearch: {
      type: "boolean",
      label: "Entity Quick-Search Bar",
      default: true,
      order: 7,
      section: "Display"
    },
    metricFormat: {
      type: "string",
      label: "Value Formatting",
      display: "select",
      values: [
        { "Currency ($ USD)": "usd" },
        { "Compact Number (1.2M)": "compact" },
        { "Standard Number (1,234)": "num" },
        { "Percentage (%)": "pct" }
      ],
      default: "usd",
      order: 8,
      section: "Display"
    },

    // SECTION: STYLE
    colorPalette: {
      type: "string",
      label: "Visual Color Palette",
      display: "select",
      values: [
        { "Looker Modern (Blue / Teal / Coral)": "looker" },
        { "Tech Electric (Cyan / Purple / Azure)": "tech" },
        { "Sunset Flame (Amber / Coral / Violet)": "sunset" },
        { "Emerald Forest (Mint / Teal / Emerald)": "emerald" },
        { "Spectral Spectrum (Full Rainbow)": "spectral" }
      ],
      default: "looker",
      order: 1,
      section: "Style"
    },
    ribbonOpacity: {
      type: "number",
      label: "Ribbon Flow Opacity (0.2 - 0.9)",
      display: "text",
      default: 0.65,
      order: 2,
      section: "Style"
    },
    arcThickness: {
      type: "number",
      label: "Perimeter Arc Thickness (px)",
      display: "text",
      default: 18,
      order: 3,
      section: "Style"
    },
    padAngle: {
      type: "number",
      label: "Arc Gap Spacing (0.01 - 0.08)",
      display: "text",
      default: 0.03,
      order: 4,
      section: "Style"
    },
    labelStyle: {
      type: "string",
      label: "Entity Label Placement",
      display: "select",
      values: [
        { "Radial (Outward from Arc)": "radial" },
        { "Circumference (Along Arc)": "circumference" },
        { "Hidden": "none" }
      ],
      default: "radial",
      order: 5,
      section: "Style"
    },
    labelFontSize: {
      type: "number",
      label: "Label Font Size (px)",
      display: "text",
      default: 11,
      order: 6,
      section: "Style"
    }
  },

  create: function(element, config) {
    element.style.boxSizing = "border-box";
    element.style.padding = "0";
    element.style.overflow = "hidden";
    element.style.display = "flex";
    element.style.flexDirection = "column";
    element.style.fontFamily = "-apple-system, BlinkMacSystemFont, \"Google Sans\", \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif";
    element.style.background = "#ffffff";
    element.style.color = "#1e293b";

    // Inject styles
    var styleId = "looker-viz-bilateral-chord-styles";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .chord-tooltip {
          position: absolute;
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.94);
          color: #ffffff;
          font-size: 12px;
          line-height: 1.45;
          border-radius: 8px;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          backdrop-filter: blur(4px);
          max-width: 320px;
          transition: opacity 0.15s ease-out;
          font-family: inherit;
        }
        .chord-tooltip .tt-title {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding-bottom: 4px;
        }
        .chord-tooltip .tt-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 3px 0;
        }
        .chord-tooltip .tt-val {
          font-weight: 600;
        }
        .chord-tooltip .tt-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .chord-tooltip .tt-badge-pos {
          background: #10b981;
          color: #ffffff;
        }
        .chord-tooltip .tt-badge-neg {
          background: #ef4444;
          color: #ffffff;
        }
        .chord-tooltip .tt-badge-neutral {
          background: #64748b;
          color: #ffffff;
        }
        .chord-arc {
          cursor: pointer;
          transition: opacity 0.2s, stroke-width 0.2s;
        }
        .chord-arc:hover {
          filter: drop-shadow(0 0 4px rgba(0,0,0,0.25));
        }
        .chord-ribbon {
          cursor: pointer;
          transition: opacity 0.2s, stroke 0.2s;
        }
        .chord-ribbon:hover {
          stroke: #0f172a;
          stroke-width: 1.5px;
        }
        .chord-hud-chip {
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          min-width: 110px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .chord-hud-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-bottom: 2px;
        }
        .chord-hud-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .chord-hud-sub {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 1px;
        }
        .chord-search-input {
          padding: 6px 10px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background: #ffffff;
          color: #1e293b;
          min-width: 160px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .chord-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .chord-matrix-table {
          border-collapse: collapse;
          font-size: 11px;
          width: 100%;
          table-layout: fixed;
        }
        .chord-matrix-table th, .chord-matrix-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 4px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chord-matrix-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        .chord-matrix-cell {
          cursor: pointer;
          transition: transform 0.1s;
        }
        .chord-matrix-cell:hover {
          outline: 2px solid #2563eb;
          z-index: 10;
        }
      `;
      document.head.appendChild(style);
    }

    // Top control & HUD bar
    var topBar = document.createElement("div");
    topBar.className = "chord-top-bar";
    topBar.style.flex = "0 0 auto";
    topBar.style.padding = "8px 14px";
    topBar.style.borderBottom = "1px solid #e2e8f0";
    topBar.style.background = "#ffffff";
    topBar.style.display = "flex";
    topBar.style.flexWrap = "wrap";
    topBar.style.alignItems = "center";
    topBar.style.justifyContent = "space-between";
    topBar.style.gap = "10px";
    element.appendChild(topBar);

    // Main Chart Wrapper
    var chartWrapper = document.createElement("div");
    chartWrapper.className = "chord-chart-wrapper";
    chartWrapper.style.flex = "1 1 0";
    chartWrapper.style.minHeight = "0";
    chartWrapper.style.width = "100%";
    chartWrapper.style.position = "relative";
    chartWrapper.style.overflow = "hidden";
    chartWrapper.style.display = "flex";
    chartWrapper.style.alignItems = "center";
    chartWrapper.style.justifyContent = "center";
    element.appendChild(chartWrapper);

    // Floating Tooltip
    var tooltip = document.createElement("div");
    tooltip.className = "chord-tooltip";
    tooltip.style.display = "none";
    tooltip.style.opacity = "0";
    chartWrapper.appendChild(tooltip);

    this._container = element;
    this._topBar = topBar;
    this._chartWrapper = chartWrapper;
    this._tooltip = tooltip;
    this._searchQuery = "";
    this._pinnedEntity = null;

    // Debounced ResizeObserver
    var self = this;
    var resizeTimer = null;
    var lastW = 0;
    var lastH = 0;
    this._ro = new ResizeObserver(function(entries) {
      if (!entries || !entries.length) return;
      var cr = entries[0].contentRect;
      if (Math.abs(cr.width - lastW) < 4 && Math.abs(cr.height - lastH) < 4) return;
      lastW = cr.width;
      lastH = cr.height;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (self._lastArgs) {
          self.updateAsync.apply(self, self._lastArgs);
        }
      }, 150);
    });
    this._ro.observe(element);
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    this._lastArgs = [data, element, config, queryResponse, details, done];
    this.clearErrors();

    // 1. Validate Fields
    if (!data || !data.length) {
      this.addError({ title: "No Data", message: "This query returned 0 rows of data." });
      return;
    }

    var fields = queryResponse.fields;
    var dims = (fields.dimensions && fields.dimensions.length) ? fields.dimensions : (fields.dimension_like || []);
    var meas = (fields.measures && fields.measures.length) ? fields.measures : (fields.measure_like || []);

    // Check pivot support
    var pivots = queryResponse.pivots || [];
    var isPivoted = pivots.length > 0;

    if (dims.length < 2 && !isPivoted) {
      this.addError({
        title: "Insufficient Dimensions",
        message: "Bilateral Chord Diagram requires either 2 dimensions (Source entity and Target entity) or 1 dimension pivoted by a second dimension."
      });
      return;
    }

    if (meas.length < 1) {
      this.addError({
        title: "Missing Flow Measure",
        message: "Please include at least 1 measure representing flow volume, sales, migration count, or bandwidth."
      });
      return;
    }

    var dimSource = dims[0].name;
    var dimTarget = isPivoted ? null : dims[1].name;
    var measFlow = meas[0].name;
    var measSecondary = meas.length > 1 ? meas[1].name : null;

    // Check for drill links across any cell
    var hasDrillLinks = false;
    for (var i = 0; i < Math.min(data.length, 50); i++) {
      var r = data[i];
      if ((r[dimSource] && r[dimSource].links && r[dimSource].links.length) ||
          (dimTarget && r[dimTarget] && r[dimTarget].links && r[dimTarget].links.length) ||
          (r[measFlow] && r[measFlow].links && r[measFlow].links.length)) {
        hasDrillLinks = true;
        break;
      }
    }

    // Config options
    var vizMode = config.vizMode || "chord";
    var topNSetting = config.topN || "12";
    var bundleOther = config.bundleOther !== false;
    var showSelfFlow = config.showSelfFlow !== false;
    var directedFlow = config.directedFlow !== false;
    var showHUD = config.showExecutiveHUD !== false;
    var showSearch = config.showSearch !== false;
    var metricFormat = config.metricFormat || "usd";
    var colorPalette = config.colorPalette || "looker";
    var ribbonOpacity = parseFloat(config.ribbonOpacity) || 0.65;
    var arcThickness = parseFloat(config.arcThickness) || 18;
    var padAngle = parseFloat(config.padAngle) || 0.03;
    var labelStyle = config.labelStyle || "radial";
    var labelFontSize = parseFloat(config.labelFontSize) || 11;

    // Formatter helpers
    var formatVal = function(val) {
      if (val === null || val === undefined || isNaN(val)) return "0";
      if (metricFormat === "usd") {
        if (Math.abs(val) >= 1e9) return "$" + (val / 1e9).toFixed(2) + "B";
        if (Math.abs(val) >= 1e6) return "$" + (val / 1e6).toFixed(2) + "M";
        if (Math.abs(val) >= 1e3) return "$" + (val / 1e3).toFixed(1) + "k";
        return "$" + d3.format(",.0f")(val);
      } else if (metricFormat === "compact") {
        if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + "B";
        if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + "M";
        if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + "k";
        return d3.format(",.0f")(val);
      } else if (metricFormat === "pct") {
        return d3.format(".1%")(val);
      } else {
        return d3.format(",.0f")(val);
      }
    };

    // 2. Build Adjacency Flow Graph from Data
    // Aggregates any row limit (5,000+ rows) into entity-to-entity volume matrix
    var rawFlows = {}; // source -> { target -> volume }
    var entityTotals = {}; // entity -> total incoming + outgoing
    var entityOutbound = {}; // entity -> total outgoing
    var entityInbound = {}; // entity -> total incoming
    var drillLinksMap = {}; // "src::tgt" -> drill links array
    var totalFlowVolume = 0;
    var activeCorridors = 0;

    var registerFlow = function(src, tgt, val, links) {
      if (!src || !tgt || isNaN(val) || val <= 0) return;
      if (!showSelfFlow && src === tgt) return;

      if (!rawFlows[src]) rawFlows[src] = {};
      rawFlows[src][tgt] = (rawFlows[src][tgt] || 0) + val;

      entityTotals[src] = (entityTotals[src] || 0) + val;
      entityTotals[tgt] = (entityTotals[tgt] || 0) + val;
      entityOutbound[src] = (entityOutbound[src] || 0) + val;
      entityInbound[tgt] = (entityInbound[tgt] || 0) + val;

      totalFlowVolume += val;
      activeCorridors++;

      var pairKey = src + "::" + tgt;
      if (links && links.length) {
        drillLinksMap[pairKey] = (drillLinksMap[pairKey] || []).concat(links);
      }
    };

    if (isPivoted) {
      data.forEach(function(row) {
        var src = String(row[dimSource] && row[dimSource].value !== undefined ? row[dimSource].value : "Unknown");
        pivots.forEach(function(pivot) {
          var tgt = String(pivot.key !== undefined ? pivot.key : "Unknown");
          var cell = row[measFlow] && row[measFlow][pivot.key];
          var val = cell && cell.value !== undefined ? Number(cell.value) : 0;
          var links = cell && cell.links ? cell.links : (row[dimSource] ? row[dimSource].links : null);
          registerFlow(src, tgt, val, links);
        });
      });
    } else {
      data.forEach(function(row) {
        var src = String(row[dimSource] && row[dimSource].value !== undefined ? row[dimSource].value : "Unknown");
        var tgt = String(row[dimTarget] && row[dimTarget].value !== undefined ? row[dimTarget].value : "Unknown");
        var cell = row[measFlow];
        var val = cell && cell.value !== undefined ? Number(cell.value) : 0;
        var links = (cell && cell.links) || (row[dimSource] && row[dimSource].links) || (row[dimTarget] && row[dimTarget].links);
        registerFlow(src, tgt, val, links);
      });
    }

    // 3. Top-N Entity Selection & "Other" Bundling
    var sortedEntities = Object.keys(entityTotals).sort(function(a, b) {
      return entityTotals[b] - entityTotals[a];
    });

    var entityList = [];
    var otherEntities = [];
    var topNCap = topNSetting === "all" ? sortedEntities.length : parseInt(topNSetting, 10);

    if (sortedEntities.length <= topNCap || topNSetting === "all") {
      entityList = sortedEntities.slice();
    } else {
      entityList = sortedEntities.slice(0, topNCap);
      otherEntities = sortedEntities.slice(topNCap);
      if (bundleOther && otherEntities.length > 0) {
        entityList.push("Other Entities");
      }
    }

    var entityIndexMap = {};
    entityList.forEach(function(e, idx) {
      entityIndexMap[e] = idx;
    });

    var N = entityList.length;
    if (N < 2) {
      this.addError({
        title: "Insufficient Entities",
        message: "Query returned fewer than 2 distinct entities with non-zero flow volume."
      });
      return;
    }

    // Initialize square matrix N x N with 0
    var matrix = [];
    for (var i = 0; i < N; i++) {
      var rowArr = [];
      for (var j = 0; j < N; j++) {
        rowArr.push(0);
      }
      matrix.push(rowArr);
    }

    // Populate matrix with flows
    var dominantPair = { src: "", tgt: "", vol: 0 };
    var totalCorridorsCount = 0;
    var netFlowImbalanceTotal = 0;

    Object.keys(rawFlows).forEach(function(src) {
      var srcIdx = entityIndexMap[src];
      if (srcIdx === undefined) {
        if (bundleOther && entityIndexMap["Other Entities"] !== undefined) {
          srcIdx = entityIndexMap["Other Entities"];
        } else {
          return;
        }
      }

      Object.keys(rawFlows[src]).forEach(function(tgt) {
        var tgtIdx = entityIndexMap[tgt];
        if (tgtIdx === undefined) {
          if (bundleOther && entityIndexMap["Other Entities"] !== undefined) {
            tgtIdx = entityIndexMap["Other Entities"];
          } else {
            return;
          }
        }

        var vol = rawFlows[src][tgt];
        matrix[srcIdx][tgtIdx] += vol;
        totalCorridorsCount++;

        if (vol > dominantPair.vol) {
          dominantPair = { src: src, tgt: tgt, vol: vol };
        }
      });
    });

    // Compute Symmetry Index: measures how balanced bidirectional corridors are
    var bidirectionalSum = 0;
    var totalPairVol = 0;
    for (var r = 0; r < N; r++) {
      for (var c = r + 1; c < N; c++) {
        var fwd = matrix[r][c];
        var rev = matrix[c][r];
        var sum = fwd + rev;
        if (sum > 0) {
          totalPairVol += sum;
          var diff = Math.abs(fwd - rev);
          bidirectionalSum += diff;
        }
      }
    }
    // Asymmetry Ratio: 0% = perfectly reciprocal bilateral flow, 100% = strictly one-way
    var asymmetryRatio = totalPairVol > 0 ? (bidirectionalSum / totalPairVol) : 0;
    var symmetryIndex = Math.max(0, Math.min(100, Math.round((1 - asymmetryRatio) * 100)));

    // 4. Color Palettes
    var palettes = {
      looker: ["#1A73E8", "#12B5CB", "#E52592", "#F9AB00", "#7C3AED", "#10B981", "#EA4335", "#3B82F6", "#06B6D4", "#8B5CF6", "#F59E0B", "#14B8A6"],
      tech: ["#00F0FF", "#7928CA", "#FF0080", "#0070F3", "#50E3C2", "#F5A623", "#4B5563", "#6366F1", "#EC4899", "#10B981", "#8B5CF6", "#38BDF8"],
      sunset: ["#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77", "#4D96FF", "#9B51E0", "#F2994A", "#EB5757", "#27AE60", "#2F80ED", "#BB6BD9", "#F2C94C"],
      emerald: ["#059669", "#10B981", "#34D399", "#6EE7B7", "#0D9488", "#14B8A6", "#2DD4BF", "#0284C7", "#0369A1", "#047857", "#15803D", "#166534"],
      spectral: ["#9E0142", "#D53E4F", "#F46D43", "#FDAE61", "#FEE08B", "#FFFFBF", "#E6F598", "#ABDDA4", "#66C2A5", "#3288BD", "#5E4FA2", "#2B83BA"]
    };
    var selectedColors = palettes[colorPalette] || palettes.looker;
    var colorScale = d3.scaleOrdinal()
      .domain(entityList)
      .range(selectedColors);

    // 5. Render Top Control & Executive HUD Bar
    this._topBar.innerHTML = "";
    if (showHUD) {
      var hudContainer = document.createElement("div");
      hudContainer.style.display = "flex";
      hudContainer.style.alignItems = "center";
      hudContainer.style.gap = "8px";
      hudContainer.style.flexWrap = "wrap";

      // Chip 1: Total Bilateral Flow
      var chip1 = document.createElement("div");
      chip1.className = "chord-hud-chip";
      chip1.innerHTML = `
        <span class="chord-hud-label">Total Bilateral Flow</span>
        <span class="chord-hud-val">${formatVal(totalFlowVolume)}</span>
        <span class="chord-hud-sub">${data.length} records aggregated</span>
      `;
      hudContainer.appendChild(chip1);

      // Chip 2: Active Corridors & Entities
      var chip2 = document.createElement("div");
      chip2.className = "chord-hud-chip";
      chip2.innerHTML = `
        <span class="chord-hud-label">Active Corridors</span>
        <span class="chord-hud-val">${totalCorridorsCount}</span>
        <span class="chord-hud-sub">${entityList.length} Top Entities</span>
      `;
      hudContainer.appendChild(chip2);

      // Chip 3: Dominant Corridor
      var chip3 = document.createElement("div");
      chip3.className = "chord-hud-chip";
      var domPct = totalFlowVolume > 0 ? ((dominantPair.vol / totalFlowVolume) * 100).toFixed(1) : "0";
      chip3.innerHTML = `
        <span class="chord-hud-label">Dominant Corridor</span>
        <span class="chord-hud-val" style="font-size: 13px; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${dominantPair.src} ➔ ${dominantPair.tgt}">${dominantPair.src} ➔ ${dominantPair.tgt}</span>
        <span class="chord-hud-sub">${formatVal(dominantPair.vol)} (${domPct}%)</span>
      `;
      hudContainer.appendChild(chip3);

      // Chip 4: Flow Reciprocity Index
      var chip4 = document.createElement("div");
      chip4.className = "chord-hud-chip";
      var symLabel = symmetryIndex >= 70 ? "Reciprocal" : (symmetryIndex >= 40 ? "Asymmetric" : "Unidirectional");
      chip4.innerHTML = `
        <span class="chord-hud-label">Reciprocity Balance</span>
        <span class="chord-hud-val">${symmetryIndex}%</span>
        <span class="chord-hud-sub">${symLabel} Exchange</span>
      `;
      hudContainer.appendChild(chip4);

      // Drill Affordance Pill if drill links exist
      if (hasDrillLinks) {
        var drillPill = document.createElement("div");
        drillPill.style.padding = "4px 10px";
        drillPill.style.borderRadius = "12px";
        drillPill.style.background = "#eff6ff";
        drillPill.style.border = "1px solid #bfdbfe";
        drillPill.style.color = "#1d4ed8";
        drillPill.style.fontSize = "11px";
        drillPill.style.fontWeight = "600";
        drillPill.style.display = "flex";
        drillPill.style.alignItems = "center";
        drillPill.style.gap = "4px";
        drillPill.innerHTML = `<span>🔎</span> CLICK ANY ARC TO DRILL`;
        hudContainer.appendChild(drillPill);
      }

      this._topBar.appendChild(hudContainer);
    }

    // Right Controls: Search bar & Reset Button
    var rightControls = document.createElement("div");
    rightControls.style.display = "flex";
    rightControls.style.alignItems = "center";
    rightControls.style.gap = "8px";
    rightControls.style.marginLeft = "auto";

    if (showSearch) {
      var searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "chord-search-input";
      searchInput.placeholder = "🔍 Search entity...";
      searchInput.value = this._searchQuery || "";
      var self = this;
      searchInput.addEventListener("input", function(e) {
        self._searchQuery = e.target.value.toLowerCase().trim();
        self._applyFilterHighlights();
      });
      rightControls.appendChild(searchInput);
    }

    if (this._pinnedEntity) {
      var resetBtn = document.createElement("button");
      resetBtn.style.padding = "5px 10px";
      resetBtn.style.fontSize = "11px";
      resetBtn.style.fontWeight = "600";
      resetBtn.style.border = "1px solid #cbd5e1";
      resetBtn.style.borderRadius = "6px";
      resetBtn.style.background = "#ffffff";
      resetBtn.style.cursor = "pointer";
      resetBtn.textContent = "⟲ Unpin (" + this._pinnedEntity + ")";
      var self = this;
      resetBtn.addEventListener("click", function() {
        self._pinnedEntity = null;
        self.updateAsync.apply(self, self._lastArgs);
      });
      rightControls.appendChild(resetBtn);
    }

    this._topBar.appendChild(rightControls);

    // 6. Clear Previous Visuals in Chart Wrapper (keep tooltip)
    var oldSvgs = this._chartWrapper.querySelectorAll("svg, table");
    oldSvgs.forEach(function(el) { el.remove(); });

    var width = this._chartWrapper.clientWidth || element.clientWidth || 800;
    var height = this._chartWrapper.clientHeight || 500;
    if (height < 200) height = 400;

    var tooltip = this._tooltip;
    var self = this;

    // 7. RENDER BASED ON MODE
    if (vizMode === "matrix") {
      // -------------------------------------------------------------
      // MODE 2: BILATERAL FLOW MATRIX (HEATMAP GRID)
      // -------------------------------------------------------------
      var matrixContainer = document.createElement("div");
      matrixContainer.style.width = "100%";
      matrixContainer.style.height = "100%";
      matrixContainer.style.overflow = "auto";
      matrixContainer.style.padding = "10px";

      var table = document.createElement("table");
      table.className = "chord-matrix-table";

      var thead = document.createElement("thead");
      var headerRow = document.createElement("tr");
      var cornerTh = document.createElement("th");
      cornerTh.style.width = "140px";
      cornerTh.style.textAlign = "left";
      cornerTh.style.paddingLeft = "8px";
      cornerTh.innerHTML = "<strong>Source ➔ Target</strong>";
      headerRow.appendChild(cornerTh);

      entityList.forEach(function(tgt) {
        var th = document.createElement("th");
        th.title = tgt;
        th.textContent = tgt;
        headerRow.appendChild(th);
      });
      var totalTh = document.createElement("th");
      totalTh.style.background = "#e2e8f0";
      totalTh.textContent = "Total Out";
      headerRow.appendChild(totalTh);
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");
      var maxMatrixVal = d3.max(matrix.flatMap(function(d) { return d; })) || 1;
      var matrixColor = d3.scaleSequential(d3.interpolateBlues).domain([0, maxMatrixVal]);

      matrix.forEach(function(row, rIdx) {
        var srcName = entityList[rIdx];
        var tr = document.createElement("tr");

        var srcTh = document.createElement("th");
        srcTh.style.textAlign = "left";
        srcTh.style.paddingLeft = "8px";
        srcTh.title = srcName;
        srcTh.textContent = srcName;
        tr.appendChild(srcTh);

        var rowSum = 0;
        row.forEach(function(val, cIdx) {
          var tgtName = entityList[cIdx];
          rowSum += val;
          var td = document.createElement("td");
          td.className = "chord-matrix-cell";

          var isSelf = (rIdx === cIdx);
          if (val > 0) {
            var bg = matrixColor(val);
            td.style.background = bg;
            var lum = d3.hsl(bg).l;
            td.style.color = lum < 0.5 ? "#ffffff" : "#0f172a";
            td.textContent = formatVal(val);
          } else {
            td.style.background = isSelf ? "#f8fafc" : "#ffffff";
            td.style.color = "#cbd5e1";
            td.textContent = "-";
          }

          if (isSelf && val > 0) {
            td.style.fontWeight = "700";
            td.style.border = "2px dashed #94a3b8";
          }

          td.addEventListener("mouseenter", function(e) {
            var reverseVal = matrix[cIdx][rIdx];
            var net = val - reverseVal;
            tooltip.style.display = "block";
            tooltip.style.opacity = "1";
            var netBadge = net > 0 ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net Out</span>`
              : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net In</span>` : `<span class="tt-badge tt-badge-neutral">Balanced</span>`);
            tooltip.innerHTML = `
              <div class="tt-title">
                <span>🔄</span> <strong>${srcName}</strong> ➔ <strong>${tgtName}</strong>
              </div>
              <div class="tt-row"><span>Forward Flow:</span> <span class="tt-val">${formatVal(val)}</span></div>
              <div class="tt-row"><span>Reverse Flow:</span> <span class="tt-val">${formatVal(reverseVal)}</span></div>
              <div class="tt-row"><span>Net Balance:</span> ${netBadge}</div>
              <div class="tt-row"><span>Share of Outbound:</span> <span class="tt-val">${rowSum > 0 ? ((val / rowSum) * 100).toFixed(1) : 0}%</span></div>
            `;
          });
          td.addEventListener("mousemove", function(e) {
            var rect = self._chartWrapper.getBoundingClientRect();
            var x = e.clientX - rect.left + 15;
            var y = e.clientY - rect.top + 15;
            tooltip.style.left = Math.min(x, rect.width - 260) + "px";
            tooltip.style.top = Math.min(y, rect.height - 120) + "px";
          });
          td.addEventListener("mouseleave", function() {
            tooltip.style.display = "none";
            tooltip.style.opacity = "0";
          });

          // Drill on cell click
          td.addEventListener("click", function(e) {
            var key = srcName + "::" + tgtName;
            var links = drillLinksMap[key];
            if (links && links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: links, event: e });
            }
          });

          tr.appendChild(td);
        });

        var sumTd = document.createElement("td");
        sumTd.style.background = "#f1f5f9";
        sumTd.style.fontWeight = "700";
        sumTd.textContent = formatVal(rowSum);
        tr.appendChild(sumTd);
        tbody.appendChild(tr);
      });

      // Bottom Row: Total In
      var tfoot = document.createElement("tfoot");
      var footRow = document.createElement("tr");
      var footTh = document.createElement("th");
      footTh.style.background = "#e2e8f0";
      footTh.style.textAlign = "left";
      footTh.style.paddingLeft = "8px";
      footTh.textContent = "Total In";
      footRow.appendChild(footTh);

      for (var c = 0; c < N; c++) {
        var colSum = 0;
        for (var r = 0; r < N; r++) colSum += matrix[r][c];
        var colTd = document.createElement("td");
        colTd.style.background = "#f1f5f9";
        colTd.style.fontWeight = "700";
        colTd.textContent = formatVal(colSum);
        footRow.appendChild(colTd);
      }
      var grandTd = document.createElement("td");
      grandTd.style.background = "#cbd5e1";
      grandTd.style.fontWeight = "800";
      grandTd.textContent = formatVal(totalFlowVolume);
      footRow.appendChild(grandTd);
      tfoot.appendChild(footRow);

      table.appendChild(tbody);
      table.appendChild(tfoot);
      matrixContainer.appendChild(table);
      this._chartWrapper.appendChild(matrixContainer);

    } else {
      // -------------------------------------------------------------
      // MODE 1 & 3: CIRCULAR CHORD DIAGRAM / BIPARTITE CORRIDOR
      // -------------------------------------------------------------
      var svg = d3.select(this._chartWrapper).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "width: 100%; height: 100%; font: 10px sans-serif;");

      var defs = svg.append("defs");

      // Outer radius based on available viewport
      var margin = labelStyle === "radial" ? 85 : 45;
      var outerRadius = Math.max(80, Math.min(width, height) * 0.5 - margin);
      var innerRadius = Math.max(60, outerRadius - arcThickness);

      var chordLayout = d3.chord()
        .padAngle(padAngle)
        .sortSubgroups(d3.descending);

      var chords = chordLayout(matrix);

      var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      var ribbon = d3.ribbon()
        .radius(innerRadius);

      // Setup Linear Gradients for Directed Ribbons
      if (directedFlow) {
        chords.forEach(function(d, i) {
          var gradId = "chord-grad-" + d.source.index + "-" + d.target.index;
          var grad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("gradientUnits", "userSpaceOnUse");

          var sa = (d.source.startAngle + d.source.endAngle) / 2 - Math.PI / 2;
          var ta = (d.target.startAngle + d.target.endAngle) / 2 - Math.PI / 2;

          grad.attr("x1", innerRadius * Math.cos(sa))
            .attr("y1", innerRadius * Math.sin(sa))
            .attr("x2", innerRadius * Math.cos(ta))
            .attr("y2", innerRadius * Math.sin(ta));

          grad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(entityList[d.source.index]));

          grad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(entityList[d.target.index]));
        });
      }

      // Group Container
      var g = svg.append("g");

      // Outer Perimeter Arc Groups
      var group = g.append("g")
        .attr("class", "chord-groups")
        .selectAll("g")
        .data(chords.groups)
        .join("g")
        .attr("class", function(d) { return "entity-group group-" + d.index; });

      // Arc Path
      group.append("path")
        .attr("class", "chord-arc")
        .attr("fill", function(d) { return colorScale(entityList[d.index]); })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5)
        .attr("d", arc)
        .on("mouseenter", function(event, d) {
          if (self._pinnedEntity) return;
          var entName = entityList[d.index];
          self._highlightEntity(d.index);

          // Arc Hover Tooltip
          var totalIn = 0;
          var totalOut = 0;
          for (var j = 0; j < N; j++) {
            totalOut += matrix[d.index][j];
            totalIn += matrix[j][d.index];
          }
          var net = totalOut - totalIn;
          var netBadge = net > 0 ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net Out</span>`
            : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net In</span>` : `<span class="tt-badge tt-badge-neutral">Balanced</span>`);

          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          tooltip.innerHTML = `
            <div class="tt-title">
              <span style="color: ${colorScale(entName)}; font-size: 14px;">●</span> <strong>${entName}</strong>
            </div>
            <div class="tt-row"><span>Total Outbound:</span> <span class="tt-val">${formatVal(totalOut)}</span></div>
            <div class="tt-row"><span>Total Inbound:</span> <span class="tt-val">${formatVal(totalIn)}</span></div>
            <div class="tt-row"><span>Net Balance:</span> ${netBadge}</div>
            <div class="tt-row"><span>Total Entity Flow:</span> <span class="tt-val">${formatVal(d.value)}</span></div>
            <div class="tt-row"><span>Global Share:</span> <span class="tt-val">${totalFlowVolume > 0 ? ((d.value / (totalFlowVolume * 2)) * 100).toFixed(1) : 0}%</span></div>
            ${hasDrillLinks ? `<div style="margin-top: 6px; font-size: 10.5px; color: #93c5fd; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px;">🔎 Click arc to open Looker drill menu</div>` : ""}
          `;
        })
        .on("mousemove", function(event) {
          var rect = self._chartWrapper.getBoundingClientRect();
          var x = event.clientX - rect.left + 15;
          var y = event.clientY - rect.top + 15;
          tooltip.style.left = Math.min(x, rect.width - 260) + "px";
          tooltip.style.top = Math.min(y, rect.height - 140) + "px";
        })
        .on("mouseleave", function() {
          if (self._pinnedEntity) return;
          self._resetHighlights();
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        })
        .on("click", function(event, d) {
          var entName = entityList[d.index];
          if (self._pinnedEntity === entName) {
            self._pinnedEntity = null;
          } else {
            self._pinnedEntity = entName;
          }

          // Trigger native Looker drill-down if available
          var pairKey = entName + "::" + entName;
          var links = drillLinksMap[pairKey] || [];
          if (!links.length) {
            // Find any link with this entity
            Object.keys(drillLinksMap).forEach(function(k) {
              if (k.startsWith(entName + "::") || k.endsWith("::" + entName)) {
                links = links.concat(drillLinksMap[k]);
              }
            });
          }
          if (links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: links, event: event });
          }

          self.updateAsync.apply(self, self._lastArgs);
        });

      // Arc Labels
      if (labelStyle === "radial") {
        group.append("text")
          .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
          .attr("dy", "0.35em")
          .attr("transform", function(d) {
            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
              + "translate(" + (outerRadius + 8) + ")"
              + (d.angle > Math.PI ? "rotate(180)" : "");
          })
          .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : "start"; })
          .attr("font-size", labelFontSize + "px")
          .attr("font-weight", "600")
          .attr("fill", "#334155")
          .attr("class", "chord-label")
          .text(function(d) { return entityList[d.index]; });
      } else if (labelStyle === "circumference") {
        // Along the arc text path
        group.append("path")
          .attr("id", function(d) { return "arc-label-path-" + d.index; })
          .attr("d", d3.arc().innerRadius((innerRadius + outerRadius) / 2).outerRadius((innerRadius + outerRadius) / 2))
          .style("fill", "none");

        group.append("text")
          .attr("font-size", Math.max(9, labelFontSize - 2) + "px")
          .attr("font-weight", "700")
          .attr("fill", "#ffffff")
          .append("textPath")
          .attr("xlink:href", function(d) { return "#arc-label-path-" + d.index; })
          .attr("startOffset", "25%")
          .attr("text-anchor", "middle")
          .text(function(d) {
            var span = d.endAngle - d.startAngle;
            return span > 0.15 ? entityList[d.index] : "";
          });
      }

      // Inner Ribbons (Chords)
      var ribbons = g.append("g")
        .attr("class", "chord-ribbons")
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("class", function(d) {
          return "chord-ribbon ribbon-" + d.source.index + " ribbon-" + d.target.index;
        })
        .attr("d", ribbon)
        .attr("fill", function(d) {
          if (directedFlow) {
            return "url(#chord-grad-" + d.source.index + "-" + d.target.index + ")";
          }
          return colorScale(entityList[d.source.index]);
        })
        .attr("opacity", ribbonOpacity)
        .attr("stroke", "rgba(255,255,255,0.4)")
        .attr("stroke-width", 0.5)
        .on("mouseenter", function(event, d) {
          if (self._pinnedEntity) return;
          d3.select(this)
            .attr("opacity", 0.95)
            .attr("stroke", "#0f172a")
            .attr("stroke-width", 1.5)
            .raise();

          var srcName = entityList[d.source.index];
          var tgtName = entityList[d.target.index];
          var fwd = d.source.value;
          var rev = d.target.value;
          var net = fwd - rev;

          var netBadge = net > 0
            ? `<span class="tt-badge tt-badge-pos">+${formatVal(net)} Net to ${tgtName}</span>`
            : (net < 0 ? `<span class="tt-badge tt-badge-neg">-${formatVal(Math.abs(net))} Net to ${srcName}</span>` : `<span class="tt-badge tt-badge-neutral">Balanced Flow</span>`);

          tooltip.style.display = "block";
          tooltip.style.opacity = "1";
          tooltip.innerHTML = `
            <div class="tt-title">
              <span>🔀</span> <strong>${srcName}</strong> ⟷ <strong>${tgtName}</strong>
            </div>
            <div class="tt-row"><span>${srcName} ➔ ${tgtName}:</span> <span class="tt-val">${formatVal(fwd)}</span></div>
            <div class="tt-row"><span>${tgtName} ➔ ${srcName}:</span> <span class="tt-val">${formatVal(rev)}</span></div>
            <div class="tt-row"><span>Net Asymmetry:</span> ${netBadge}</div>
            <div class="tt-row"><span>Total Bilateral:</span> <span class="tt-val">${formatVal(fwd + rev)}</span></div>
            <div class="tt-row"><span>Share of Network:</span> <span class="tt-val">${totalFlowVolume > 0 ? (((fwd + rev) / totalFlowVolume) * 100).toFixed(1) : 0}%</span></div>
            ${hasDrillLinks ? `<div style="margin-top: 6px; font-size: 10.5px; color: #93c5fd; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px;">🔎 Click ribbon to open Looker drill menu</div>` : ""}
          `;
        })
        .on("mousemove", function(event) {
          var rect = self._chartWrapper.getBoundingClientRect();
          var x = event.clientX - rect.left + 15;
          var y = event.clientY - rect.top + 15;
          tooltip.style.left = Math.min(x, rect.width - 270) + "px";
          tooltip.style.top = Math.min(y, rect.height - 140) + "px";
        })
        .on("mouseleave", function(event, d) {
          if (self._pinnedEntity) return;
          d3.select(this)
            .attr("opacity", ribbonOpacity)
            .attr("stroke", "rgba(255,255,255,0.4)")
            .attr("stroke-width", 0.5);
          tooltip.style.display = "none";
          tooltip.style.opacity = "0";
        })
        .on("click", function(event, d) {
          var srcName = entityList[d.source.index];
          var tgtName = entityList[d.target.index];
          var pairKey = srcName + "::" + tgtName;
          var revKey = tgtName + "::" + srcName;
          var links = (drillLinksMap[pairKey] || []).concat(drillLinksMap[revKey] || []);
          if (links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: links, event: event });
          }
        });

      // Save references for filter/highlight methods
      this._svg = svg;
      this._ribbons = ribbons;
      this._groups = group;
      this._entityList = entityList;
      this._ribbonOpacity = ribbonOpacity;

      // If entity is pinned, immediately highlight it
      if (this._pinnedEntity) {
        var pinnedIdx = entityIndexMap[this._pinnedEntity];
        if (pinnedIdx !== undefined) {
          this._highlightEntity(pinnedIdx);
        }
      }

      // Apply search query if active
      if (this._searchQuery) {
        this._applyFilterHighlights();
      }
    }

    done();
  },

  _highlightEntity: function(entityIndex) {
    if (!this._ribbons || !this._groups) return;
    var baseOpacity = this._ribbonOpacity || 0.65;

    // Highlight connected ribbons, dim others
    this._ribbons
      .transition().duration(150)
      .attr("opacity", function(d) {
        if (d.source.index === entityIndex || d.target.index === entityIndex) {
          return 0.95;
        }
        return 0.05;
      });

    // Dim unconnected arcs
    this._groups
      .transition().duration(150)
      .style("opacity", function(d) {
        return d.index === entityIndex ? 1 : 0.45;
      });
  },

  _resetHighlights: function() {
    if (!this._ribbons || !this._groups) return;
    var baseOpacity = this._ribbonOpacity || 0.65;
    this._ribbons
      .transition().duration(150)
      .attr("opacity", baseOpacity)
      .attr("stroke", "rgba(255,255,255,0.4)")
      .attr("stroke-width", 0.5);

    this._groups
      .transition().duration(150)
      .style("opacity", 1);
  },

  _applyFilterHighlights: function() {
    if (!this._ribbons || !this._groups || !this._entityList) return;
    var q = this._searchQuery;
    var baseOpacity = this._ribbonOpacity || 0.65;
    var entityList = this._entityList;

    if (!q) {
      this._resetHighlights();
      return;
    }

    var matchIndices = {};
    entityList.forEach(function(name, idx) {
      if (name.toLowerCase().indexOf(q) !== -1) {
        matchIndices[idx] = true;
      }
    });

    this._ribbons
      .transition().duration(150)
      .attr("opacity", function(d) {
        if (matchIndices[d.source.index] || matchIndices[d.target.index]) {
          return 0.95;
        }
        return 0.04;
      });

    this._groups
      .transition().duration(150)
      .style("opacity", function(d) {
        return matchIndices[d.index] ? 1 : 0.3;
      });
  }
});
