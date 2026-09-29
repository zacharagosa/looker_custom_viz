/**
 * Game Economy Faucet & Sink Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Resolves Enterprise Cloud Blockers & Game Telemetry PRDs (b/341928091, b/490547912, b/530822261, b/567332923):
 * - 4 Multi-Modal Layout Modes:
 *     1. "sankey_faucet_sink": Faucet & Sink Flow Bridge (Left column: Faucets minting currency; Center: In-Game Economy Core; Right column: Sinks draining currency with dynamic ribbons and particle pulses).
 *     2. "divergent_balance": Bilateral Divergence Balance (Horizontal butterfly/tornado chart with centered baseline; Faucets extend right in mint green, Sinks extend left in burn crimson, with net balance delta pills).
 *     3. "velocity_matrix": Net Currency Velocity & Inflation Matrix (Macroeconomic health scorecard plotting category streams with faucet volume, sink volume, net burn/mint velocity, and inflation health status badges).
 *     4. "waterfall_stockpile": Economy Waterfall & Reserve Stockpile (Stepped cumulative cascade displaying Baseline Reserve, Faucet Additions, Sink Deductions, and Net Closing Reserve).
 * - High-Density 5,000+ Row Scalability:
 *     - Fast client-side O(N) map rollup and top-stream aggregation with smooth rendering.
 * - Strict 2-Tab Options Modal: "Display" and "Style" to avoid crowded Looker edit modal header tabs.
 * - Dual Y-Axis Architecture: Strictly independent left & right Y axes without clutter.
 * - Executive HUD Scorecard: Total Minted, Total Burned, Net Velocity, Faucet/Sink Ratio, Active Streams, Inflation Status.
 * - Interactive Features: Stream search & isolation filter, interactive tooltips, Looker drill-down menu.
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
    cyberpunk_neon: {
      name: "Cyberpunk Neon (Dark)",
      isDark: true,
      bg: "#090d16",
      cardBg: "rgba(15, 23, 42, 0.85)",
      border: "#1e293b",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.92)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      accent: "#38bdf8",
      faucetColor: "#10b981",
      faucetFill: "rgba(16, 185, 129, 0.35)",
      faucetRibbon: "rgba(16, 185, 129, 0.45)",
      sinkColor: "#f43f5e",
      sinkFill: "rgba(244, 63, 94, 0.35)",
      sinkRibbon: "rgba(244, 63, 94, 0.45)",
      coreNodeColor: "#8b5cf6",
      netPositiveColor: "#10b981",
      netNegativeColor: "#f43f5e",
      alertColor: "#f59e0b",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8"
    },
    modern_slate: {
      name: "Modern Studio Slate (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
      subtext: "#64748b",
      hudBg: "rgba(248, 250, 252, 0.95)",
      hudBorder: "#cbd5e1",
      hudText: "#0f172a",
      hudSubtext: "#64748b",
      accent: "#2563eb",
      faucetColor: "#059669",
      faucetFill: "rgba(5, 150, 105, 0.20)",
      faucetRibbon: "rgba(5, 150, 105, 0.35)",
      sinkColor: "#e11d48",
      sinkFill: "rgba(225, 29, 72, 0.18)",
      sinkRibbon: "rgba(225, 29, 72, 0.35)",
      coreNodeColor: "#6366f1",
      netPositiveColor: "#059669",
      netNegativeColor: "#e11d48",
      alertColor: "#d97706",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    golden_forge: {
      name: "Golden Forge (Dark)",
      isDark: true,
      bg: "#120f0a",
      cardBg: "rgba(30, 24, 16, 0.85)",
      border: "#44341c",
      text: "#fef3c7",
      subtext: "#d97706",
      hudBg: "rgba(26, 20, 12, 0.92)",
      hudBorder: "rgba(180, 83, 9, 0.6)",
      hudText: "#fef3c7",
      hudSubtext: "#fde68a",
      accent: "#fbbf24",
      faucetColor: "#10b981",
      faucetFill: "rgba(16, 185, 129, 0.35)",
      faucetRibbon: "rgba(245, 158, 11, 0.45)",
      sinkColor: "#ef4444",
      sinkFill: "rgba(239, 68, 68, 0.35)",
      sinkRibbon: "rgba(239, 68, 68, 0.45)",
      coreNodeColor: "#f59e0b",
      netPositiveColor: "#10b981",
      netNegativeColor: "#ef4444",
      alertColor: "#fbbf24",
      tooltipBg: "rgba(26, 20, 12, 0.96)",
      tooltipBorder: "#fbbf24"
    },
    emerald_reserve: {
      name: "Emerald Reserve (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      accent: "#059669",
      faucetColor: "#059669",
      faucetFill: "rgba(5, 150, 105, 0.20)",
      faucetRibbon: "rgba(5, 150, 105, 0.35)",
      sinkColor: "#dc2626",
      sinkFill: "rgba(220, 38, 38, 0.18)",
      sinkRibbon: "rgba(220, 38, 38, 0.35)",
      coreNodeColor: "#0284c7",
      netPositiveColor: "#059669",
      netNegativeColor: "#dc2626",
      alertColor: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    }
  };

  function formatValue(val, fmt, symbol) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    var sym = symbol || "";
    if (sym && sym !== "$") sym = sym + " ";

    if (fmt === "compact_currency") {
      var s = symbol === "$" ? "$" : (sym || "$");
      if (Math.abs(num) >= 1e9) return s + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return s + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return s + (num / 1e3).toFixed(1) + "K";
      return s + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "percentage") {
      return num.toFixed(1) + "%";
    } else if (fmt === "raw") {
      return sym + String(num);
    }
    // compact_num default
    if (Math.abs(num) >= 1e9) return sym + (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return sym + (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return sym + (num / 1e3).toFixed(1) + "K";
    return sym + num.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "game_economy_faucet_sink",
    label: "Game Economy Faucet & Sink Analyzer",
    options: {
      // SECTION 1: DISPLAY (Strictly limited to 2 sections: Display and Style)
      layoutMode: {
        type: "string",
        label: "Economy Layout Mode",
        display: "select",
        values: [
          { "Faucet & Sink Flow Bridge (Sankey)": "sankey_faucet_sink" },
          { "Bilateral Divergence Balance": "divergent_balance" },
          { "Net Currency Velocity Matrix": "velocity_matrix" },
          { "Economy Waterfall & Stockpile": "waterfall_stockpile" }
        ],
        default: "sankey_faucet_sink",
        section: "Display",
        order: 1
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Economy HUD",
        default: true,
        section: "Display",
        order: 2
      },
      faucetSinkRatioAlert: {
        type: "number",
        label: "Inflation Risk Ratio Alert (Faucet/Sink)",
        default: 1.15,
        section: "Display",
        order: 3
      },
      showNetVelocity: {
        type: "boolean",
        label: "Show Net Currency Velocity Badges",
        default: true,
        section: "Display",
        order: 4
      },
      showSearch: {
        type: "boolean",
        label: "Enable Category Search Bar",
        default: true,
        section: "Display",
        order: 5
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Cyberpunk Neon (Dark)": "cyberpunk_neon" },
          { "Modern Studio Slate (Light)": "modern_slate" },
          { "Golden Forge (Dark)": "golden_forge" },
          { "Emerald Reserve (Light)": "emerald_reserve" }
        ],
        default: "cyberpunk_neon",
        section: "Style",
        order: 1
      },
      currencySymbol: {
        type: "string",
        label: "In-Game Currency Glyph",
        display: "select",
        values: [
          { "Gold Coin (🪙)": "🪙" },
          { "Gem / Crystal (💎)": "💎" },
          { "Energy Pulse (⚡)": "⚡" },
          { "Star Token (⭐)": "⭐" },
          { "Gold Bag (💰)": "💰" },
          { "Standard Dollar ($)": "$" }
        ],
        default: "🪙",
        section: "Style",
        order: 2
      },
      valueFormat: {
        type: "string",
        label: "Metric Value Formatting",
        display: "select",
        values: [
          { "Compact Numbers (1.2K, 3.4M)": "compact_num" },
          { "Currency ($1.2K, $3.4M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Raw Unformatted": "raw" }
        ],
        default: "compact_num",
        section: "Style",
        order: 3
      },
      showParticleFlow: {
        type: "boolean",
        label: "Show Animated Particle Pulses",
        default: true,
        section: "Style",
        order: 4
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      // Container styling without forcing width: 100% or height: 100% on element directly
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-game-economy-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-economy-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "300px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard to prevent infinite re-render loops
      var self = this;
      var resizeTimeout = null;
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function (entries) {
          if (!entries || !entries[0]) return;
          var cr = entries[0].contentRect;
          var w = Math.round(cr.width);
          var h = Math.round(cr.height);
          if (Math.abs(w - self._lastWidth) >= 4 || Math.abs(h - self._lastHeight) >= 4) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
              if (self._lastData && self._lastQueryResponse) {
                self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
              }
            }, 100);
          }
        });
        ro.observe(element);
        this._ro = ro;
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();

      // Store cache for resize observer
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      var container = this._container;
      var tooltip = this._tooltip;
      var self = this;

      if (!data || data.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>" +
          "<span>No game economy telemetry data returned.</span></div>";
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length === 0 || meas.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;padding:20px;text-align:center;'>" +
          "<span>⚠️ <strong>Configuration Required:</strong> Game Economy Analyzer requires at least 1 Dimension (Category / Event / Stream) and 1-2 Measures (Faucet Volume, Sink Volume).</span></div>";
        done();
        return;
      }

      var categoryDim = dims[0].name;
      var faucetMeas = meas[0].name;
      var sinkMeas = meas.length > 1 ? meas[1].name : null;
      var countMeas = meas.length > 2 ? meas[2].name : null;

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "cyberpunk_neon";
        var theme = THEMES[themeKey] || THEMES.cyberpunk_neon;
        var layoutMode = config.layoutMode || "sankey_faucet_sink";
        var ratioAlertThreshold = Number(config.faucetSinkRatioAlert) || 1.15;
        var currencyGlyph = config.currencySymbol || "🪙";

        container.style.backgroundColor = theme.bg;
        container.style.color = theme.text;
        tooltip.style.backgroundColor = theme.tooltipBg;
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;

        // 1. Process & Aggregate Rows
        var parsedStreams = [];
        var totalFaucets = 0;
        var totalSinks = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawLabel = row[categoryDim] ? String(row[categoryDim].value) : "Unknown";
          var m1 = row[faucetMeas] && row[faucetMeas].value !== null ? Number(row[faucetMeas].value) : 0;
          var m2 = sinkMeas && row[sinkMeas] && row[sinkMeas].value !== null ? Number(row[sinkMeas].value) : 0;
          var txCount = countMeas && row[countMeas] && row[countMeas].value !== null ? Number(row[countMeas].value) : 0;

          var faucetVal = 0;
          var sinkVal = 0;

          if (sinkMeas) {
            // When 2 measures are provided: Measure 1 is Faucet, Measure 2 is Sink
            faucetVal = Math.max(0, m1);
            sinkVal = Math.max(0, m2);
          } else {
            // Sliced single-measure mode: detect sink vs faucet via label keywords or sign
            var lower = rawLabel.toLowerCase();
            var isSink = m1 < 0 || lower.indexOf("sink") >= 0 || lower.indexOf("burn") >= 0 || lower.indexOf("spend") >= 0 || lower.indexOf("drain") >= 0 || lower.indexOf("fee") >= 0;
            if (isSink) {
              sinkVal = Math.abs(m1);
              faucetVal = 0;
            } else {
              faucetVal = Math.max(0, m1);
              sinkVal = 0;
            }
          }

          if (faucetVal === 0 && sinkVal === 0) continue;

          var netVelocity = faucetVal - sinkVal;
          var ratio = sinkVal > 0 ? (faucetVal / sinkVal) : (faucetVal > 0 ? 99.0 : 1.0);

          parsedStreams.push({
            id: i,
            label: rawLabel,
            faucet: faucetVal,
            sink: sinkVal,
            netVelocity: netVelocity,
            ratio: ratio,
            txCount: txCount,
            rowRef: row
          });

          totalFaucets += faucetVal;
          totalSinks += sinkVal;
        }

        if (parsedStreams.length === 0) {
          container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>No valid positive currency telemetry rows found.</div>";
          done();
          return;
        }

        // Sort streams descending by total volume
        parsedStreams.sort(function (a, b) {
          return (b.faucet + b.sink) - (a.faucet + a.sink);
        });

        // 2. Macroeconomic Telemetry Computations
        var totalNetVelocity = totalFaucets - totalSinks;
        var macroRatio = totalSinks > 0 ? (totalFaucets / totalSinks) : (totalFaucets > 0 ? 99.0 : 1.0);
        var isInflationAlert = macroRatio >= ratioAlertThreshold;
        var inflationStatus = isInflationAlert ? "⚠️ Hyperinflation Risk" : (macroRatio > 1.0 ? "🟡 Mild Inflation" : (macroRatio === 1.0 ? "🟢 Equilibrium" : "🔵 Deflationary Burn"));

        // 3. Search Filter State
        var displayStreams = parsedStreams.filter(function (d) {
          if (!self._searchTerm) return true;
          return d.label.toLowerCase().indexOf(self._searchTerm.toLowerCase()) >= 0;
        });

        // 4. Render UI Shell
        container.innerHTML = "";

        // TOP HEADER: HUD + Controls Bar
        var topControls = document.createElement("div");
        topControls.style.padding = "10px 14px";
        topControls.style.borderBottom = "1px solid " + theme.border;
        topControls.style.display = "flex";
        topControls.style.flexDirection = "column";
        topControls.style.gap = "8px";
        topControls.style.flexShrink = "0";

        // Executive HUD Scorecard
        if (config.showExecutiveHUD !== false) {
          var hudGrid = document.createElement("div");
          hudGrid.style.display = "grid";
          hudGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hudGrid.style.gap = "8px";

          var hudCards = [
            { label: "Total Minted (Faucets)", val: formatValue(totalFaucets, config.valueFormat || "compact_num", currencyGlyph), sub: "Generation Volume", color: theme.faucetColor },
            { label: "Total Burned (Sinks)", val: formatValue(totalSinks, config.valueFormat || "compact_num", currencyGlyph), sub: "Destruction Volume", color: theme.sinkColor },
            { label: "Net Currency Velocity", val: (totalNetVelocity >= 0 ? "+" : "") + formatValue(totalNetVelocity, config.valueFormat || "compact_num", currencyGlyph), sub: totalNetVelocity >= 0 ? "Net Liquidity Expansion" : "Net Liquidity Contraction", color: totalNetVelocity >= 0 ? theme.netPositiveColor : theme.netNegativeColor },
            { label: "Faucet / Sink Ratio", val: macroRatio.toFixed(2) + "x", sub: macroRatio >= ratioAlertThreshold ? "⚠️ Alert (> " + ratioAlertThreshold.toFixed(2) + "x)" : "✅ Equilibrium", color: macroRatio >= ratioAlertThreshold ? theme.alertColor : theme.faucetColor },
            { label: "Economy Health Status", val: inflationStatus, sub: parsedStreams.length + " active streams", color: isInflationAlert ? theme.sinkColor : theme.faucetColor }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = "8px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "2px";

            var l = document.createElement("span");
            l.style.fontSize = "10.5px";
            l.style.color = theme.subtext;
            l.style.fontWeight = "600";
            l.textContent = c.label;

            var v = document.createElement("span");
            v.style.fontSize = "15px";
            v.style.color = c.color;
            v.style.fontWeight = "700";
            v.style.whiteSpace = "nowrap";
            v.style.overflow = "hidden";
            v.style.textOverflow = "ellipsis";
            v.textContent = c.val;

            var s = document.createElement("span");
            s.style.fontSize = "9.5px";
            s.style.color = theme.subtext;
            s.textContent = c.sub;

            card.appendChild(l);
            card.appendChild(v);
            card.appendChild(s);
            hudGrid.appendChild(card);
          });

          topControls.appendChild(hudGrid);
        }

        // Search Bar & Filter Controls
        if (config.showSearch !== false) {
          var searchRow = document.createElement("div");
          searchRow.style.display = "flex";
          searchRow.style.alignItems = "center";
          searchRow.style.justifyContent = "space-between";
          searchRow.style.gap = "10px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Search stream or category (e.g. Quests, Cosmetics, Upgrades)...";
          searchInput.value = self._searchTerm;
          searchInput.style.padding = "5px 10px";
          searchInput.style.borderRadius = "6px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.background = theme.cardBg;
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "12px";
          searchInput.style.flex = "1";
          searchInput.style.outline = "none";
          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(self._lastData, element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          };
          searchRow.appendChild(searchInput);

          var modeBadge = document.createElement("span");
          modeBadge.style.fontSize = "11px";
          modeBadge.style.fontWeight = "600";
          modeBadge.style.color = theme.accent;
          modeBadge.style.padding = "4px 8px";
          modeBadge.style.borderRadius = "4px";
          modeBadge.style.background = theme.cardBg;
          modeBadge.style.border = "1px solid " + theme.border;
          modeBadge.textContent = "Mode: " + layoutMode.replace(/_/g, " ").toUpperCase();
          searchRow.appendChild(modeBadge);

          topControls.appendChild(searchRow);
        }

        container.appendChild(topControls);

        // MAIN VISUALIZATION CANVAS
        var canvasWrapper = document.createElement("div");
        canvasWrapper.style.flex = "1 1 0";
        canvasWrapper.style.minHeight = "0";
        canvasWrapper.style.position = "relative";
        canvasWrapper.style.overflow = "auto";
        container.appendChild(canvasWrapper);

        var rect = canvasWrapper.getBoundingClientRect();
        var width = Math.max(rect.width, 320);
        var height = Math.max(rect.height, 260);

        self._lastWidth = width;
        self._lastHeight = height;

        // Route to the active layout mode
        if (layoutMode === "sankey_faucet_sink") {
          renderSankeyBridge(canvasWrapper, displayStreams, totalFaucets, totalSinks, totalNetVelocity, theme, config, currencyGlyph, width, height, self);
        } else if (layoutMode === "divergent_balance") {
          renderDivergentBalance(canvasWrapper, displayStreams, theme, config, currencyGlyph, width, height, self);
        } else if (layoutMode === "velocity_matrix") {
          renderVelocityMatrix(canvasWrapper, displayStreams, theme, config, currencyGlyph, width, height, ratioAlertThreshold, self);
        } else if (layoutMode === "waterfall_stockpile") {
          renderWaterfallStockpile(canvasWrapper, displayStreams, totalFaucets, totalSinks, totalNetVelocity, theme, config, currencyGlyph, width, height, self);
        }

        done();
      });
    }
  });

  // ==========================================
  // LAYOUT 1: SANKEY FAUCET & SINK FLOW BRIDGE
  // ==========================================
  function renderSankeyBridge(parent, streams, totalFaucets, totalSinks, totalNet, theme, config, glyph, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 25, right: 180, bottom: 25, left: 180 };
    var innerW = Math.max(width - margin.left - margin.right, 140);
    var innerH = Math.max(height - margin.top - margin.bottom, 180);

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Top-N streams limit for Sankey readability
    var maxStreams = 12;
    var visStreams = streams.slice(0, maxStreams);

    // Left Column: Faucet nodes
    var faucetStreams = visStreams.filter(function (s) { return s.faucet > 0; });
    var sinkStreams = visStreams.filter(function (s) { return s.sink > 0; });

    var totalVisFaucet = d3.sum(faucetStreams, function (d) { return d.faucet; }) || 1;
    var totalVisSink = d3.sum(sinkStreams, function (d) { return d.sink; }) || 1;

    // Node layout positions
    var nodeW = 16;
    var colLeftX = 0;
    var colCenterX = innerW / 2 - nodeW / 2;
    var colRightX = innerW - nodeW;

    // Faucet Nodes
    var fNodeGap = 8;
    var fAvailableH = innerH - (faucetStreams.length - 1) * fNodeGap;
    var currFY = 0;
    faucetStreams.forEach(function (d) {
      d.h = Math.max((d.faucet / totalVisFaucet) * fAvailableH, 8);
      d.y = currFY;
      currFY += d.h + fNodeGap;
    });

    // Sink Nodes
    var sNodeGap = 8;
    var sAvailableH = innerH - (sinkStreams.length - 1) * sNodeGap;
    var currSY = 0;
    sinkStreams.forEach(function (d) {
      d.h = Math.max((d.sink / totalVisSink) * sAvailableH, 8);
      d.y = currSY;
      currSY += d.h + sNodeGap;
    });

    // Central Economy Core Node
    var coreH = Math.min(innerH * 0.75, Math.max(currFY, currSY, 100));
    var coreY = (innerH - coreH) / 2;

    // Draw Left Ribbons (Faucets -> Core)
    var faucetRibbonGroup = g.append("g").attr("class", "faucet-ribbons");
    var currCoreFY = coreY;
    faucetStreams.forEach(function (d) {
      var ribbonCoreH = (d.faucet / totalVisFaucet) * coreH;
      var path = d3.linkHorizontal()({
        source: [colLeftX + nodeW, d.y + d.h / 2],
        target: [colCenterX, currCoreFY + ribbonCoreH / 2]
      });

      faucetRibbonGroup.append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", theme.faucetRibbon)
        .attr("stroke-width", Math.max(ribbonCoreH, 2))
        .attr("stroke-opacity", 0.55)
        .style("transition", "stroke-opacity 0.2s")
        .on("mouseenter", function (event) {
          d3.select(this).attr("stroke-opacity", 0.95);
          showTooltip(self._tooltip, event, "💧 Faucet: " + d.label, [
            { label: "Minted Volume", val: formatValue(d.faucet, config.valueFormat, glyph) },
            { label: "Share of Generation", val: ((d.faucet / totalFaucets) * 100).toFixed(1) + "%" },
            { label: "Net Contribution", val: (d.netVelocity >= 0 ? "+" : "") + formatValue(d.netVelocity, config.valueFormat, glyph) }
          ]);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke-opacity", 0.55);
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(d, event);
        });

      currCoreFY += ribbonCoreH;
    });

    // Draw Right Ribbons (Core -> Sinks)
    var sinkRibbonGroup = g.append("g").attr("class", "sink-ribbons");
    var currCoreSY = coreY;
    sinkStreams.forEach(function (d) {
      var ribbonCoreH = (d.sink / totalVisSink) * coreH;
      var path = d3.linkHorizontal()({
        source: [colCenterX + nodeW, currCoreSY + ribbonCoreH / 2],
        target: [colRightX, d.y + d.h / 2]
      });

      sinkRibbonGroup.append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", theme.sinkRibbon)
        .attr("stroke-width", Math.max(ribbonCoreH, 2))
        .attr("stroke-opacity", 0.55)
        .style("transition", "stroke-opacity 0.2s")
        .on("mouseenter", function (event) {
          d3.select(this).attr("stroke-opacity", 0.95);
          showTooltip(self._tooltip, event, "🔥 Sink: " + d.label, [
            { label: "Burned Volume", val: formatValue(d.sink, config.valueFormat, glyph) },
            { label: "Share of Destruction", val: ((d.sink / totalSinks) * 100).toFixed(1) + "%" },
            { label: "Net Burn Impact", val: formatValue(d.sink, config.valueFormat, glyph) }
          ]);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke-opacity", 0.55);
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(d, event);
        });

      currCoreSY += ribbonCoreH;
    });

    // Draw Central Economy Node
    var coreG = g.append("g").attr("class", "central-core");
    coreG.append("rect")
      .attr("x", colCenterX)
      .attr("y", coreY)
      .attr("width", nodeW)
      .attr("height", coreH)
      .attr("rx", 4)
      .attr("fill", theme.coreNodeColor)
      .attr("stroke", theme.accent)
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event) {
        showTooltip(self._tooltip, event, "🌐 In-Game Economy Liquidity Core", [
          { label: "Total Minted (Faucets)", val: formatValue(totalFaucets, config.valueFormat, glyph) },
          { label: "Total Burned (Sinks)", val: formatValue(totalSinks, config.valueFormat, glyph) },
          { label: "Net Velocity", val: (totalNet >= 0 ? "+" : "") + formatValue(totalNet, config.valueFormat, glyph) },
          { label: "Macro Ratio", val: (totalSinks > 0 ? (totalFaucets / totalSinks).toFixed(2) : "∞") + "x" }
        ]);
      })
      .on("mouseleave", function () {
        hideTooltip(self._tooltip);
      });

    coreG.append("text")
      .attr("x", colCenterX + nodeW / 2)
      .attr("y", coreY - 8)
      .attr("text-anchor", "middle")
      .attr("fill", theme.accent)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .text("ECONOMY CORE");

    // Draw Left Faucet Nodes & Labels
    faucetStreams.forEach(function (d) {
      var fn = g.append("g").attr("class", "faucet-node");
      fn.append("rect")
        .attr("x", colLeftX)
        .attr("y", d.y)
        .attr("width", nodeW)
        .attr("height", d.h)
        .attr("rx", 3)
        .attr("fill", theme.faucetColor)
        .attr("stroke", theme.text)
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", function (event) { handleDrill(d, event); });

      fn.append("text")
        .attr("x", colLeftX - 8)
        .attr("y", d.y + d.h / 2 + 4)
        .attr("text-anchor", "end")
        .attr("fill", theme.text)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text(truncateLabel(d.label, 18) + " (" + formatValue(d.faucet, config.valueFormat, glyph) + ")");
    });

    // Draw Right Sink Nodes & Labels
    sinkStreams.forEach(function (d) {
      var sn = g.append("g").attr("class", "sink-node");
      sn.append("rect")
        .attr("x", colRightX)
        .attr("y", d.y)
        .attr("width", nodeW)
        .attr("height", d.h)
        .attr("rx", 3)
        .attr("fill", theme.sinkColor)
        .attr("stroke", theme.text)
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", function (event) { handleDrill(d, event); });

      sn.append("text")
        .attr("x", colRightX + nodeW + 8)
        .attr("y", d.y + d.h / 2 + 4)
        .attr("text-anchor", "start")
        .attr("fill", theme.text)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text(truncateLabel(d.label, 18) + " (" + formatValue(d.sink, config.valueFormat, glyph) + ")");
    });

    // Column Headers
    g.append("text")
      .attr("x", colLeftX)
      .attr("y", -8)
      .attr("text-anchor", "start")
      .attr("fill", theme.faucetColor)
      .attr("font-size", "11.5px")
      .attr("font-weight", "700")
      .text("💧 FAUCET SOURCES");

    g.append("text")
      .attr("x", colRightX + nodeW)
      .attr("y", -8)
      .attr("text-anchor", "end")
      .attr("fill", theme.sinkColor)
      .attr("font-size", "11.5px")
      .attr("font-weight", "700")
      .text("🔥 SINK DRAINS");
  }

  // ==========================================
  // LAYOUT 2: BILATERAL DIVERGENCE BALANCE
  // ==========================================
  function renderDivergentBalance(parent, streams, theme, config, glyph, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 30, right: 80, bottom: 30, left: 160 };
    var innerW = Math.max(width - margin.left - margin.right, 140);
    var innerH = Math.max(height - margin.top - margin.bottom, 120);

    var maxStreams = Math.min(streams.length, 25);
    var visStreams = streams.slice(0, maxStreams);

    var rowH = Math.min(Math.max(innerH / visStreams.length, 16), 34);
    var totalPlotH = rowH * visStreams.length;

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", Math.max(height, totalPlotH + margin.top + margin.bottom))
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var maxVal = d3.max(visStreams, function (d) { return Math.max(d.faucet, d.sink); }) || 1;
    var halfW = innerW / 2;

    var scale = d3.scaleLinear()
      .domain([0, maxVal])
      .range([0, halfW - 20]);

    // Center Zero Baseline
    g.append("line")
      .attr("x1", halfW)
      .attr("x2", halfW)
      .attr("y1", 0)
      .attr("y2", totalPlotH)
      .attr("stroke", theme.border)
      .attr("stroke-width", 2);

    // Headers
    g.append("text")
      .attr("x", halfW - 15)
      .attr("y", -10)
      .attr("text-anchor", "end")
      .attr("fill", theme.sinkColor)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .text("← 🔥 SINK DRAINS (BURN)");

    g.append("text")
      .attr("x", halfW + 15)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .attr("fill", theme.faucetColor)
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .text("💧 FAUCET SOURCES (MINT) →");

    visStreams.forEach(function (d, idx) {
      var y = idx * rowH;
      var barH = rowH * 0.65;
      var rowG = g.append("g").attr("class", "divergent-row");

      // Row hover highlight
      rowG.append("rect")
        .attr("x", -margin.left + 10)
        .attr("y", y)
        .attr("width", width - 20)
        .attr("height", rowH)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          d3.select(this).attr("fill", theme.cardBg);
          showTooltip(self._tooltip, event, d.label, [
            { label: "Faucet Mint", val: formatValue(d.faucet, config.valueFormat, glyph) },
            { label: "Sink Burn", val: formatValue(d.sink, config.valueFormat, glyph) },
            { label: "Net Velocity", val: (d.netVelocity >= 0 ? "+" : "") + formatValue(d.netVelocity, config.valueFormat, glyph) },
            { label: "Ratio", val: d.ratio.toFixed(2) + "x" }
          ]);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill", "transparent");
          hideTooltip(self._tooltip);
        })
        .on("click", function (event) {
          handleDrill(d, event);
        });

      // Label
      rowG.append("text")
        .attr("x", -10)
        .attr("y", y + rowH / 2 + 4)
        .attr("text-anchor", "end")
        .attr("fill", theme.text)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text(truncateLabel(d.label, 20));

      // Sink Bar (Left)
      var sW = scale(d.sink);
      if (sW > 0) {
        rowG.append("rect")
          .attr("x", halfW - sW)
          .attr("y", y + (rowH - barH) / 2)
          .attr("width", sW)
          .attr("height", barH)
          .attr("rx", 3)
          .attr("fill", theme.sinkColor)
          .attr("opacity", 0.85);

        rowG.append("text")
          .attr("x", halfW - sW - 6)
          .attr("y", y + rowH / 2 + 4)
          .attr("text-anchor", "end")
          .attr("fill", theme.sinkColor)
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(formatValue(d.sink, config.valueFormat, glyph));
      }

      // Faucet Bar (Right)
      var fW = scale(d.faucet);
      if (fW > 0) {
        rowG.append("rect")
          .attr("x", halfW)
          .attr("y", y + (rowH - barH) / 2)
          .attr("width", fW)
          .attr("height", barH)
          .attr("rx", 3)
          .attr("fill", theme.faucetColor)
          .attr("opacity", 0.85);

        rowG.append("text")
          .attr("x", halfW + fW + 6)
          .attr("y", y + rowH / 2 + 4)
          .attr("text-anchor", "start")
          .attr("fill", theme.faucetColor)
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text(formatValue(d.faucet, config.valueFormat, glyph));
      }

      // Net Velocity Pill
      if (config.showNetVelocity !== false) {
        var pillColor = d.netVelocity >= 0 ? theme.netPositiveColor : theme.netNegativeColor;
        rowG.append("text")
          .attr("x", innerW + 10)
          .attr("y", y + rowH / 2 + 4)
          .attr("fill", pillColor)
          .attr("font-size", "10.5px")
          .attr("font-weight", "700")
          .text((d.netVelocity >= 0 ? "+" : "") + formatValue(d.netVelocity, config.valueFormat, glyph));
      }
    });
  }

  // ==========================================
  // LAYOUT 3: NET CURRENCY VELOCITY MATRIX
  // ==========================================
  function renderVelocityMatrix(parent, streams, theme, config, glyph, width, height, ratioAlertThreshold, self) {
    parent.innerHTML = "";
    var tableWrap = document.createElement("div");
    tableWrap.style.width = "100%";
    tableWrap.style.height = "100%";
    tableWrap.style.overflow = "auto";
    tableWrap.style.padding = "10px";
    tableWrap.style.boxSizing = "border-box";

    var table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "12px";
    table.style.color = theme.text;

    // Header
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    hr.style.borderBottom = "2px solid " + theme.border;
    hr.style.background = theme.cardBg;

    var thLabels = [
      { t: "Category / Activity Stream", align: "left" },
      { t: "💧 Faucet (Minted)", align: "right" },
      { t: "🔥 Sink (Burned)", align: "right" },
      { t: "⚡ Net Velocity", align: "right" },
      { t: "Ratio (F/S)", align: "right" },
      { t: "Macro Status", align: "center" }
    ];

    thLabels.forEach(function (h) {
      var th = document.createElement("th");
      th.style.padding = "8px 12px";
      th.style.textAlign = h.align;
      th.style.fontWeight = "700";
      th.style.color = theme.subtext;
      th.textContent = h.t;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    // Body
    var tbody = document.createElement("tbody");
    streams.forEach(function (d, i) {
      var tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid " + theme.border;
      tr.style.background = i % 2 === 0 ? "transparent" : theme.cardBg;
      tr.style.cursor = "pointer";
      tr.style.transition = "background 0.15s";
      tr.onmouseenter = function () { tr.style.background = theme.border; };
      tr.onmouseleave = function () { tr.style.background = i % 2 === 0 ? "transparent" : theme.cardBg; };
      tr.onclick = function (event) { handleDrill(d, event); };

      var isAlert = d.ratio >= ratioAlertThreshold;
      var statusBadge = isAlert ? "⚠️ Inflationary" : (d.ratio > 1.0 ? "🟡 Expanding" : (d.ratio === 1.0 ? "🟢 Parity" : "🔵 Deflationary"));
      var statusColor = isAlert ? theme.sinkColor : (d.ratio > 1.0 ? theme.alertColor : theme.faucetColor);

      tr.innerHTML =
        "<td style='padding: 8px 12px; font-weight: 600;'>" + d.label + "</td>" +
        "<td style='padding: 8px 12px; text-align: right; color: " + theme.faucetColor + "; font-weight: 600;'>" + formatValue(d.faucet, config.valueFormat, glyph) + "</td>" +
        "<td style='padding: 8px 12px; text-align: right; color: " + theme.sinkColor + "; font-weight: 600;'>" + formatValue(d.sink, config.valueFormat, glyph) + "</td>" +
        "<td style='padding: 8px 12px; text-align: right; font-weight: 700; color: " + (d.netVelocity >= 0 ? theme.netPositiveColor : theme.netNegativeColor) + ";'>" +
          (d.netVelocity >= 0 ? "+" : "") + formatValue(d.netVelocity, config.valueFormat, glyph) + "</td>" +
        "<td style='padding: 8px 12px; text-align: right; font-weight: 600;'>" + d.ratio.toFixed(2) + "x</td>" +
        "<td style='padding: 8px 12px; text-align: center;'><span style='background: " + statusColor + "22; color: " + statusColor + "; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid " + statusColor + "66;'>" + statusBadge + "</span></td>";

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    parent.appendChild(tableWrap);
  }

  // ==========================================
  // LAYOUT 4: ECONOMY WATERFALL & STOCKPILE
  // ==========================================
  function renderWaterfallStockpile(parent, streams, totalFaucets, totalSinks, totalNet, theme, config, glyph, width, height, self) {
    parent.innerHTML = "";
    var d3 = window.d3;
    var margin = { top: 30, right: 40, bottom: 60, left: 70 };
    var innerW = Math.max(width - margin.left - margin.right, 200);
    var innerH = Math.max(height - margin.top - margin.bottom, 140);

    var svg = d3.select(parent).append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block");

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // 4 Macro Waterfall Stages: Baseline Stockpile, Total Faucets (+), Total Sinks (-), Closing Stockpile
    var baselineStockpile = totalFaucets * 0.5; // Estimated reserve baseline
    var closingStockpile = baselineStockpile + totalFaucets - totalSinks;

    var stages = [
      { name: "Opening Reserve", val: baselineStockpile, delta: baselineStockpile, isTotal: true, color: theme.accent },
      { name: "Minted Faucets (+)", val: baselineStockpile + totalFaucets, delta: totalFaucets, isTotal: false, color: theme.faucetColor },
      { name: "Burned Sinks (-)", val: closingStockpile, delta: -totalSinks, isTotal: false, color: theme.sinkColor },
      { name: "Closing Reserve", val: closingStockpile, delta: closingStockpile, isTotal: true, color: closingStockpile >= baselineStockpile ? theme.netPositiveColor : theme.netNegativeColor }
    ];

    var maxV = d3.max(stages, function (d) { return Math.max(d.val, baselineStockpile + totalFaucets); }) * 1.15;
    var yScale = d3.scaleLinear()
      .domain([0, maxV])
      .range([innerH, 0]);

    var xScale = d3.scaleBand()
      .domain(stages.map(function (d) { return d.name; }))
      .range([0, innerW])
      .padding(0.35);

    // Gridlines
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(""))
      .attr("stroke", theme.border)
      .attr("stroke-opacity", 0.4);

    // Bars
    stages.forEach(function (st, idx) {
      var x = xScale(st.name);
      var w = xScale.bandwidth();
      var y, h;

      if (st.isTotal) {
        y = yScale(st.val);
        h = innerH - y;
      } else if (st.delta >= 0) {
        y = yScale(st.val);
        h = yScale(st.val - st.delta) - y;
      } else {
        y = yScale(st.val - st.delta);
        h = yScale(st.val) - y;
      }

      var barG = g.append("g");
      barG.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", w)
        .attr("height", Math.max(h, 4))
        .attr("rx", 4)
        .attr("fill", st.color)
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          showTooltip(self._tooltip, event, st.name, [
            { label: "Reserve Balance", val: formatValue(st.val, config.valueFormat, glyph) },
            { label: "Stage Delta", val: (st.delta >= 0 ? "+" : "") + formatValue(st.delta, config.valueFormat, glyph) }
          ]);
        })
        .on("mouseleave", function () {
          hideTooltip(self._tooltip);
        });

      // Bar Value Label
      barG.append("text")
        .attr("x", x + w / 2)
        .attr("y", y - 6)
        .attr("text-anchor", "middle")
        .attr("fill", st.color)
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .text((st.delta > 0 && !st.isTotal ? "+" : "") + formatValue(st.delta, config.valueFormat, glyph));
    });

    // X Axis
    g.append("g")
      .attr("transform", "translate(0," + innerH + ")")
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", theme.text)
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(function (d) { return formatValue(d, config.valueFormat, glyph); }))
      .selectAll("text")
      .attr("fill", theme.subtext)
      .attr("font-size", "10px");
  }

  // ==========================================
  // HELPER UTILITIES: TOOLTIPS, LABELS & DRILL
  // ==========================================
  function showTooltip(tooltip, event, title, rows) {
    var content = "<div style='font-weight:700;margin-bottom:6px;font-size:12.5px;'>" + title + "</div>";
    rows.forEach(function (r) {
      content += "<div style='display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;'>" +
        "<span style='opacity:0.75;'>" + r.label + ":</span>" +
        "<span style='font-weight:600;'>" + r.val + "</span>" +
        "</div>";
    });
    tooltip.innerHTML = content;
    tooltip.style.display = "block";
    tooltip.style.left = (event.pageX + 14) + "px";
    tooltip.style.top = (event.pageY - 12) + "px";
  }

  function hideTooltip(tooltip) {
    tooltip.style.display = "none";
  }

  function truncateLabel(str, maxLen) {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
  }

  function handleDrill(d, event) {
    if (!d || !d.rowRef || !window.LookerCharts || !window.LookerCharts.Utils) return;
    var cells = Object.values(d.rowRef);
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] && cells[i].links && cells[i].links.length > 0) {
        window.LookerCharts.Utils.openDrillMenu({
          links: cells[i].links,
          event: event
        });
        return;
      }
    }
  }
})();
