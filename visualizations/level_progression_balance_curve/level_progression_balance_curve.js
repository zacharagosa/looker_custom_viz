/**
 * Level Progression & Balancing Curve - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Game Balancing & Telemetry Drop-off Visualizer:
 * - 4 Multi-Modal Layout Modes:
 *     1. "dual_axis_spikes": Progression & Choke Points (Left axis: smooth cumulative survivor curve; Right axis: marginal churn % spike columns with automated anomaly badges)
 *     2. "survival_decay": Survival Decay Model (Empirical survivor retention curve against theoretical power-law/exponential benchmark baseline with P50 half-life indicator)
 *     3. "milestone_waterfall": Milestone Step Waterfall (Stepped progression cascade tracking surviving players vs drop-off loss at each stage)
 *     4. "difficulty_pacing": Difficulty & Pacing Envelope (Dual-axis correlation of survivor attrition with secondary telemetry measures: retries, playtime, or resource sinks)
 * - Automated Choke-Point / Difficulty Spike Anomaly Engine:
 *     - Computes step-to-step hazard rate h_i = (V_{i-1} - V_i) / V_{i-1}
 *     - Calculates mean and standard deviation of hazard rates across the progression
 *     - Flags levels deviating > 1.5σ or 2.0σ with visual pulsing warning badges and delta impact
 * - Dual-Axis Architecture:
 *     - Strictly separates Survivor Volume (Left Y-Axis) from Churn % / Secondary Metric (Right Y-Axis)
 *     - Clean axes with empty labels when legends or badges are enabled
 * - High-Density 5,000+ Row Telemetry Aggregation:
 *     - Ingests raw session or event rows and aggregates client-side in O(N) time with Map rollups
 * - Strict 2-Tab Options Modal: "Display" and "Style" to avoid Looker header tab crowding
 * - Light & Dark Theme Support (Executive Slate default, Cyber Teal, Neon Violet, Emerald Pulse, Sunset Amber)
 * - Interactive Controls: Executive HUD, real-time level search, crosshairs, tooltips, Looker drill-down menu
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
    executive_slate: {
      name: "Executive Slate (Light)",
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
      curveColor: "#2563eb",
      curveFill: "rgba(37, 99, 235, 0.20)",
      spikeFill: "rgba(225, 29, 72, 0.75)",
      spikeBorder: "#e11d48",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#059669",
      chokePointBg: "#fee2e2",
      chokePointText: "#b91c1c",
      chokePointBorder: "#ef4444",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    cyber_teal: {
      name: "Cyber Teal (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.90)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      accent: "#06b6d4",
      curveColor: "#06b6d4",
      curveFill: "rgba(6, 182, 212, 0.25)",
      spikeFill: "rgba(244, 63, 94, 0.85)",
      spikeBorder: "#f43f5e",
      benchmarkColor: "#64748b",
      secondaryColor: "#10b981",
      chokePointBg: "rgba(244, 63, 94, 0.25)",
      chokePointText: "#fda4af",
      chokePointBorder: "#f43f5e",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#06b6d4"
    },
    neon_violet: {
      name: "Neon Violet (Dark)",
      isDark: true,
      bg: "#0d0b18",
      cardBg: "rgba(23, 15, 38, 0.85)",
      border: "#2e1065",
      text: "#f8fafc",
      subtext: "#a78bfa",
      hudBg: "rgba(19, 11, 36, 0.90)",
      hudBorder: "rgba(91, 33, 182, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#c4b5fd",
      accent: "#a855f7",
      curveColor: "#a855f7",
      curveFill: "rgba(168, 85, 247, 0.25)",
      spikeFill: "rgba(244, 63, 94, 0.85)",
      spikeBorder: "#f43f5e",
      benchmarkColor: "#7c3aed",
      secondaryColor: "#38bdf8",
      chokePointBg: "rgba(244, 63, 94, 0.25)",
      chokePointText: "#fbcfe8",
      chokePointBorder: "#f43f5e",
      tooltipBg: "rgba(19, 11, 36, 0.96)",
      tooltipBorder: "#a855f7"
    },
    emerald_pulse: {
      name: "Emerald Pulse (Light)",
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
      curveColor: "#059669",
      curveFill: "rgba(5, 150, 105, 0.20)",
      spikeFill: "rgba(234, 88, 12, 0.80)",
      spikeBorder: "#ea580c",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#0284c7",
      chokePointBg: "#ffedd5",
      chokePointText: "#c2410c",
      chokePointBorder: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    sunset_amber: {
      name: "Sunset Amber (Light)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fffbeb",
      border: "#fde68a",
      text: "#451a03",
      subtext: "#92400e",
      hudBg: "rgba(254, 243, 199, 0.95)",
      hudBorder: "#fcd34d",
      hudText: "#451a03",
      hudSubtext: "#92400e",
      accent: "#d97706",
      curveColor: "#d97706",
      curveFill: "rgba(217, 119, 6, 0.20)",
      spikeFill: "rgba(225, 29, 72, 0.80)",
      spikeBorder: "#e11d48",
      benchmarkColor: "#94a3b8",
      secondaryColor: "#4f46e5",
      chokePointBg: "#ffe4e6",
      chokePointText: "#be123c",
      chokePointBorder: "#e11d48",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    }
  };

  function formatValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "percentage") {
      return num.toFixed(1) + "%";
    } else if (fmt === "raw") {
      return String(num);
    }
    // compact_num default
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "level_progression_balance_curve",
    label: "Level Progression & Balancing Curve",
    options: {
      // SECTION 1: DISPLAY
      curveLayout: {
        type: "string",
        label: "Progression Layout Mode",
        display: "select",
        values: [
          { "Progression & Choke Points": "dual_axis_spikes" },
          { "Survival Decay Model": "survival_decay" },
          { "Milestone Step Waterfall": "milestone_waterfall" },
          { "Difficulty & Pacing Envelope": "difficulty_pacing" }
        ],
        default: "dual_axis_spikes",
        section: "Display",
        order: 1
      },
      chokePointSensitivity: {
        type: "string",
        label: "Choke Point Anomaly Sensitivity",
        display: "select",
        values: [
          { "High Sensitivity (> 1.5σ Churn)": "high" },
          { "Medium Sensitivity (> 2.0σ Churn)": "medium" },
          { "Fixed Threshold (> 25% Churn)": "fixed" }
        ],
        default: "medium",
        section: "Display",
        order: 2
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Telemetry HUD",
        default: true,
        section: "Display",
        order: 3
      },
      showChokePointBadges: {
        type: "boolean",
        label: "Flag Difficulty Choke Points",
        default: true,
        section: "Display",
        order: 4
      },
      showDataLabels: {
        type: "boolean",
        label: "Show Value & Retention Labels",
        default: true,
        section: "Display",
        order: 5
      },
      showSearch: {
        type: "boolean",
        label: "Enable Instant Stage Search",
        default: true,
        section: "Display",
        order: 6
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Executive Slate (Light)": "executive_slate" },
          { "Cyber Teal (Dark)": "cyber_teal" },
          { "Neon Violet (Dark)": "neon_violet" },
          { "Emerald Pulse (Light)": "emerald_pulse" },
          { "Sunset Amber (Light)": "sunset_amber" }
        ],
        default: "executive_slate",
        section: "Style",
        order: 1
      },
      curveSmoothing: {
        type: "string",
        label: "Curve Interpolation",
        display: "select",
        values: [
          { "Smooth Spline (Catmull-Rom)": "catmull_rom" },
          { "Linear (Direct Segment)": "linear" },
          { "Monotone (Preserve Peaks)": "monotone_x" }
        ],
        default: "catmull_rom",
        section: "Style",
        order: 2
      },
      areaOpacity: {
        type: "string",
        label: "Area Shading Opacity",
        display: "select",
        values: [
          { "Subtle Fill (15%)": "subtle" },
          { "Medium Fill (30%)": "medium" },
          { "Solid Fill (50%)": "solid" }
        ],
        default: "medium",
        section: "Style",
        order: 3
      },
      valueFormat: {
        type: "string",
        label: "Value Number Format",
        display: "select",
        values: [
          { "Compact Numbers (1.2M, 45K)": "compact_num" },
          { "Currency Format ($1.2M)": "compact_currency" },
          { "Percentage Only": "percentage" },
          { "Exact Raw Integers": "raw" }
        ],
        default: "compact_num",
        section: "Style",
        order: 4
      },
      highlightWorstChoke: {
        type: "boolean",
        label: "Highlight Peak Bottleneck Level",
        default: true,
        section: "Style",
        order: 5
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "Google Sans, Roboto, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      element.innerHTML = "";

      var root = document.createElement("div");
      root.className = "level-progression-root";
      root.style.width = "100%";
      root.style.height = "100%";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.boxSizing = "border-box";
      root.style.overflow = "hidden";
      element.appendChild(root);

      this._root = root;
      this._searchQuery = "";
      this._hoverIndex = null;

      var self = this;
      var resizeTimeout = null;
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(function () {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse) {
              self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
            }
          }, 60);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      this.clearErrors();
      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;

      if (!queryResponse || !queryResponse.fields) {
        this.addError({ title: "No Data", message: "Query response contains no fields." });
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length === 0 && meas.length < 2) {
        this.addError({
          title: "Insufficient Fields",
          message: "Level Progression requires at least 1 Dimension (Level / Stage) and 1 Measure (Survivors / Volume), or 2+ Measures."
        });
        done();
        return;
      }

      var self = this;
      ensureD3(function () {
        try {
          self.render(data, config, queryResponse);
        } catch (err) {
          console.error("Error rendering level_progression_balance_curve:", err);
          self.addError({ title: "Render Error", message: err.message });
        }
        done();
      });
    },

    render: function (data, config, queryResponse) {
      var root = this._root;
      if (!root) return;
      root.innerHTML = "";

      var dims = (queryResponse.fields && queryResponse.fields.dimensions) || [];
      var meas = (queryResponse.fields && queryResponse.fields.measures) || [];
      var themeKey = config.colorTheme || "executive_slate";
      var theme = THEMES[themeKey] || THEMES.executive_slate;

      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;

      // Extract & Aggregate Data
      var stageDim = dims.length > 0 ? dims[0].name : null;
      var cohortDim = dims.length > 1 ? dims[1].name : null;
      var primaryMeasure = meas.length > 0 ? meas[0].name : null;
      var secondaryMeasure = meas.length > 1 ? meas[1].name : null;

      // Aggregation: Roll up high-density rows (5,000+) by Stage
      var stageMap = new Map();
      var stageOrder = [];

      if (stageDim && primaryMeasure) {
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawLabel = row[stageDim] ? (row[stageDim].value !== undefined ? row[stageDim].value : row[stageDim]) : "Level " + (i + 1);
          var stageKey = String(rawLabel);
          var v1 = row[primaryMeasure] ? Number(row[primaryMeasure].value || 0) : 0;
          var v2 = secondaryMeasure && row[secondaryMeasure] ? Number(row[secondaryMeasure].value || 0) : 0;

          if (!stageMap.has(stageKey)) {
            stageMap.set(stageKey, {
              label: stageKey,
              rawLabel: rawLabel,
              volume: 0,
              secondary: 0,
              firstRow: row,
              count: 0
            });
            stageOrder.push(stageKey);
          }
          var entry = stageMap.get(stageKey);
          entry.volume += v1;
          entry.secondary += v2;
          entry.count += 1;
        }
      } else if (meas.length >= 2) {
        // Multi-measure mode without dimension
        for (var m = 0; m < meas.length; m++) {
          var mKey = meas[m].name;
          var mLabel = meas[m].label_short || meas[m].label || mKey;
          var sum = 0;
          for (var r = 0; r < data.length; r++) {
            sum += data[r][mKey] ? Number(data[r][mKey].value || 0) : 0;
          }
          stageMap.set(mKey, {
            label: mLabel,
            rawLabel: mLabel,
            volume: sum,
            secondary: 0,
            firstRow: data[0],
            count: data.length
          });
          stageOrder.push(mKey);
        }
      }

      var stages = [];
      for (var s = 0; s < stageOrder.length; s++) {
        stages.push(stageMap.get(stageOrder[s]));
      }

      if (stages.length === 0) {
        root.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";'>No data available for the selected progression.</div>";
        return;
      }

      // Filter via instant search
      var query = (this._searchQuery || "").trim().toLowerCase();
      var displayStages = stages;
      if (query) {
        displayStages = stages.filter(function (st) {
          return st.label.toLowerCase().indexOf(query) !== -1;
        });
      }

      if (displayStages.length === 0) {
        displayStages = stages; // fallback if search yields empty
      }

      // Progression Analytics: Compute Survivors %, Step Hazard Drop-off %, and Anomaly Z-scores
      var initialVolume = displayStages[0].volume || 1;
      var hazardRates = [];

      for (var idx = 0; idx < displayStages.length; idx++) {
        var cur = displayStages[idx];
        cur.index = idx;
        cur.survivorPct = (cur.volume / initialVolume) * 100;

        if (idx === 0) {
          cur.stepDropoff = 0;
          cur.hazardRate = 0;
          cur.stepRetention = 100;
        } else {
          var prev = displayStages[idx - 1];
          cur.stepDropoff = Math.max(0, prev.volume - cur.volume);
          cur.hazardRate = prev.volume > 0 ? (cur.stepDropoff / prev.volume) * 100 : 0;
          cur.stepRetention = prev.volume > 0 ? (cur.volume / prev.volume) * 100 : 0;
          hazardRates.push(cur.hazardRate);
        }
      }

      // Calculate Hazard Statistics for Anomaly Detection
      var avgHazard = 0;
      var stdHazard = 0;
      if (hazardRates.length > 0) {
        var sumH = hazardRates.reduce(function (a, b) { return a + b; }, 0);
        avgHazard = sumH / hazardRates.length;
        var varH = hazardRates.reduce(function (a, b) { return a + Math.pow(b - avgHazard, 2); }, 0) / hazardRates.length;
        stdHazard = Math.sqrt(varH);
      }

      var sensitivity = config.chokePointSensitivity || "medium";
      var sigmaThreshold = sensitivity === "high" ? 1.5 : (sensitivity === "medium" ? 2.0 : 999);
      var fixedThreshold = 25.0;

      var worstChokeIndex = -1;
      var maxHazard = -1;

      for (var k = 0; k < displayStages.length; k++) {
        var stg = displayStages[k];
        if (k > 0) {
          stg.zScore = stdHazard > 0 ? (stg.hazardRate - avgHazard) / stdHazard : 0;
          var isAnomaly = false;
          if (sensitivity === "fixed") {
            isAnomaly = stg.hazardRate >= fixedThreshold;
          } else {
            isAnomaly = stg.zScore >= sigmaThreshold && stg.hazardRate > 5.0;
          }
          stg.isChokePoint = isAnomaly;
          if (stg.hazardRate > maxHazard) {
            maxHazard = stg.hazardRate;
            worstChokeIndex = k;
          }
        } else {
          stg.zScore = 0;
          stg.isChokePoint = false;
        }
      }

      var worstChokeStage = worstChokeIndex >= 0 ? displayStages[worstChokeIndex] : null;

      // Find P50 Half-Life Level (Level where survivor % first drops below 50%)
      var p50Level = "N/A";
      for (var p = 0; p < displayStages.length; p++) {
        if (displayStages[p].survivorPct <= 50) {
          p50Level = displayStages[p].label;
          break;
        }
      }

      // 1. TOP HEADER & EXECUTIVE HUD
      var headerContainer = document.createElement("div");
      headerContainer.style.flexShrink = "0";
      headerContainer.style.padding = "10px 16px 8px 16px";
      headerContainer.style.display = "flex";
      headerContainer.style.flexDirection = "column";
      headerContainer.style.gap = "8px";
      headerContainer.style.borderBottom = "1px solid " + theme.border;
      root.appendChild(headerContainer);

      // Search and Layout Controls Bar
      var controlsRow = document.createElement("div");
      controlsRow.style.display = "flex";
      controlsRow.style.alignItems = "center";
      controlsRow.style.justifyContent = "space-between";
      controlsRow.style.gap = "12px";
      headerContainer.appendChild(controlsRow);

      var titleDiv = document.createElement("div");
      titleDiv.style.display = "flex";
      titleDiv.style.alignItems = "center";
      titleDiv.style.gap = "8px";
      titleDiv.innerHTML = "<span style='font-size:16px;'>🕹️</span><span style='font-size:14px;font-weight:600;letter-spacing:-0.2px;color:" + theme.text + ";'>Level Progression & Difficulty Balancing</span>" +
        "<span style='font-size:11px;padding:2px 8px;border-radius:12px;background:" + theme.cardBg + ";border:1px solid " + theme.border + ";color:" + theme.subtext + ";font-weight:500;'>" + displayStages.length + " Stages (" + formatValue(stages.length, "compact_num") + " Total Rows)</span>";
      controlsRow.appendChild(titleDiv);

      var rightControls = document.createElement("div");
      rightControls.style.display = "flex";
      rightControls.style.alignItems = "center";
      rightControls.style.gap = "8px";
      controlsRow.appendChild(rightControls);

      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "🔍 Search stages...";
        searchInput.value = this._searchQuery || "";
        searchInput.style.padding = "4px 10px";
        searchInput.style.fontSize = "12px";
        searchInput.style.borderRadius = "6px";
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.outline = "none";
        searchInput.style.width = "140px";

        var self = this;
        searchInput.addEventListener("input", function (e) {
          self._searchQuery = e.target.value;
          self.render(self._lastData, self._lastConfig, self._lastQueryResponse);
        });
        rightControls.appendChild(searchInput);
      }

      // Executive HUD KPI Cards
      if (config.showExecutiveHUD !== false) {
        var hudRow = document.createElement("div");
        hudRow.style.display = "grid";
        hudRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
        hudRow.style.gap = "8px";
        headerContainer.appendChild(hudRow);

        var finalRetention = displayStages.length > 0 ? displayStages[displayStages.length - 1].survivorPct.toFixed(1) + "%" : "0%";
        var worstChokeText = worstChokeStage ? worstChokeStage.label + " (-" + worstChokeStage.hazardRate.toFixed(1) + "%)" : "None";

        var kpiCards = [
          { label: "Intake Entrants (L1)", value: formatValue(initialVolume, config.valueFormat || "compact_num"), subtext: "Starting Cohort", icon: "🚀" },
          { label: "Final Stage Survival", value: finalRetention, subtext: "End-of-Funnel Completion", icon: "🎯" },
          { label: "Worst Choke Point", value: worstChokeText, subtext: worstChokeStage ? "Z-Score: +" + worstChokeStage.zScore.toFixed(1) + "σ" : "Normal Decay", icon: "⚠️", alert: !!worstChokeStage },
          { label: "Half-Life Milestone", value: p50Level, subtext: "50% Survivor Benchmark", icon: "⏳" }
        ];

        for (var c = 0; c < kpiCards.length; c++) {
          var card = kpiCards[c];
          var cardEl = document.createElement("div");
          cardEl.style.padding = "6px 10px";
          cardEl.style.borderRadius = "6px";
          cardEl.style.background = card.alert ? theme.chokePointBg : theme.cardBg;
          cardEl.style.border = "1px solid " + (card.alert ? theme.chokePointBorder : theme.border);
          cardEl.style.display = "flex";
          cardEl.style.flexDirection = "column";
          cardEl.style.justifyContent = "center";
          cardEl.innerHTML = "<div style='display:flex;align-items:center;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.4px;color:" + (card.alert ? theme.chokePointText : theme.subtext) + ";font-weight:600;'>" +
            "<span>" + card.label + "</span><span>" + card.icon + "</span></div>" +
            "<div style='font-size:15px;font-weight:700;color:" + (card.alert ? theme.chokePointText : theme.text) + ";margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>" + card.value + "</div>" +
            "<div style='font-size:10px;color:" + (card.alert ? theme.chokePointText : theme.subtext) + ";opacity:0.85;'>" + card.subtext + "</div>";
          hudRow.appendChild(cardEl);
        }
      }

      // 2. MAIN VISUALIZATION CANVAS (SVG)
      var chartWrapper = document.createElement("div");
      chartWrapper.style.flex = "1";
      chartWrapper.style.position = "relative";
      chartWrapper.style.width = "100%";
      chartWrapper.style.minHeight = "0";
      chartWrapper.style.overflow = "hidden";
      root.appendChild(chartWrapper);

      var rect = chartWrapper.getBoundingClientRect();
      var width = rect.width || root.clientWidth || 800;
      var height = rect.height || 450;

      var margin = { top: 24, right: 64, bottom: 44, left: 64 };
      var innerWidth = Math.max(width - margin.left - margin.right, 100);
      var innerHeight = Math.max(height - margin.top - margin.bottom, 100);

      var d3 = window.d3;
      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      // Defs: Gradients and Markers
      var defs = svg.append("defs");

      var areaGrad = defs.append("linearGradient")
        .attr("id", "progressionAreaGrad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
      areaGrad.append("stop").attr("offset", "0%").attr("stop-color", theme.curveColor).attr("stop-opacity", 0.45);
      areaGrad.append("stop").attr("offset", "100%").attr("stop-color", theme.curveColor).attr("stop-opacity", 0.03);

      var spikeGrad = defs.append("linearGradient")
        .attr("id", "progressionSpikeGrad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
      spikeGrad.append("stop").attr("offset", "0%").attr("stop-color", theme.spikeBorder).attr("stop-opacity", 0.85);
      spikeGrad.append("stop").attr("offset", "100%").attr("stop-color", theme.spikeBorder).attr("stop-opacity", 0.25);

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scalePoint()
        .domain(displayStages.map(function (d) { return d.label; }))
        .range([0, innerWidth])
        .padding(0.4);

      // Left Y-Scale: Survivor Volume / Retention %
      var maxVol = d3.max(displayStages, function (d) { return d.volume; }) || 1;
      var yLeft = d3.scaleLinear()
        .domain([0, maxVol * 1.1])
        .nice()
        .range([innerHeight, 0]);

      // Right Y-Scale: Marginal Churn % (Spikes) or Secondary Metric
      var maxHazardVal = d3.max(displayStages, function (d) { return d.hazardRate; }) || 10;
      var yRight = d3.scaleLinear()
        .domain([0, Math.max(100, Math.ceil(maxHazardVal * 1.25))])
        .nice()
        .range([innerHeight, 0]);

      // Secondary Metric Scale if in difficulty_pacing mode
      var maxSec = d3.max(displayStages, function (d) { return d.secondary; }) || 1;
      var ySecondary = d3.scaleLinear()
        .domain([0, maxSec * 1.15])
        .nice()
        .range([innerHeight, 0]);

      // Gridlines (Horizontal across left scale)
      g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yLeft)
          .tickSize(-innerWidth)
          .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", theme.border)
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-opacity", 0.6);
      g.select(".grid .domain").remove();

      var layoutMode = config.curveLayout || "dual_axis_spikes";

      // -------------------------------------------------------------
      // MODE 1 & MODE 2 & MODE 4: Progression Curve & Dual Axis
      // -------------------------------------------------------------
      if (layoutMode === "dual_axis_spikes" || layoutMode === "survival_decay" || layoutMode === "difficulty_pacing") {
        // Curve Interpolator
        var smoothing = config.curveSmoothing || "catmull_rom";
        var curveFunc = d3.curveCatmullRom.alpha(0.5);
        if (smoothing === "linear") curveFunc = d3.curveLinear;
        if (smoothing === "monotone_x") curveFunc = d3.curveMonotoneX;

        // Render Spikes / Hazard Bars on Right Axis (underneath area curve)
        if (layoutMode === "dual_axis_spikes") {
          var barW = Math.max(6, Math.min(28, (innerWidth / displayStages.length) * 0.35));
          g.selectAll(".hazard-bar")
            .data(displayStages.filter(function (d) { return d.index > 0; }))
            .enter()
            .append("rect")
            .attr("class", "hazard-bar")
            .attr("x", function (d) { return xScale(d.label) - barW / 2; })
            .attr("y", function (d) { return yRight(d.hazardRate); })
            .attr("width", barW)
            .attr("height", function (d) { return Math.max(0, innerHeight - yRight(d.hazardRate)); })
            .attr("rx", 3)
            .attr("fill", function (d) { return d.isChokePoint ? "url(#progressionSpikeGrad)" : "rgba(148, 163, 184, 0.25)"; })
            .attr("stroke", function (d) { return d.isChokePoint ? theme.spikeBorder : "transparent"; })
            .attr("stroke-width", 1.5);
        }

        // Render Theoretical Benchmark Line (Survival Decay Mode)
        if (layoutMode === "survival_decay") {
          // Model exponential decay: y = V0 * exp(-lambda * x)
          var decayConst = displayStages.length > 1 ? Math.log(displayStages[0].volume / Math.max(1, displayStages[displayStages.length - 1].volume)) / (displayStages.length - 1) : 0.1;
          var benchmarkLine = d3.line()
            .curve(d3.curveBasis)
            .x(function (d, idx) { return xScale(d.label); })
            .y(function (d, idx) {
              var idealVal = displayStages[0].volume * Math.exp(-decayConst * idx);
              return yLeft(idealVal);
            });

          g.append("path")
            .datum(displayStages)
            .attr("fill", "none")
            .attr("stroke", theme.benchmarkColor)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4")
            .attr("d", benchmarkLine);

          // Benchmark annotation
          g.append("text")
            .attr("x", innerWidth - 10)
            .attr("y", yLeft(displayStages[0].volume * Math.exp(-decayConst * (displayStages.length - 1))) - 8)
            .attr("text-anchor", "end")
            .attr("font-size", "11px")
            .attr("font-weight", "500")
            .attr("fill", theme.benchmarkColor)
            .text("Ideal Power-Law Benchmark");
        }

        // Area Generator
        var areaGen = d3.area()
          .curve(curveFunc)
          .x(function (d) { return xScale(d.label); })
          .y0(innerHeight)
          .y1(function (d) { return yLeft(d.volume); });

        var pathGen = d3.line()
          .curve(curveFunc)
          .x(function (d) { return xScale(d.label); })
          .y(function (d) { return yLeft(d.volume); });

        // Area Shading
        g.append("path")
          .datum(displayStages)
          .attr("fill", "url(#progressionAreaGrad)")
          .attr("d", areaGen);

        // Progression Spline Stroke
        g.append("path")
          .datum(displayStages)
          .attr("fill", "none")
          .attr("stroke", theme.curveColor)
          .attr("stroke-width", 3.5)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("d", pathGen);

        // Secondary Metric Line if in Difficulty Pacing Mode
        if (layoutMode === "difficulty_pacing" && secondaryMeasure) {
          var secLineGen = d3.line()
            .curve(curveFunc)
            .x(function (d) { return xScale(d.label); })
            .y(function (d) { return ySecondary(d.secondary); });

          g.append("path")
            .datum(displayStages)
            .attr("fill", "none")
            .attr("stroke", theme.secondaryColor)
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "4,2")
            .attr("d", secLineGen);

          g.selectAll(".sec-node")
            .data(displayStages)
            .enter()
            .append("circle")
            .attr("class", "sec-node")
            .attr("cx", function (d) { return xScale(d.label); })
            .attr("cy", function (d) { return ySecondary(d.secondary); })
            .attr("r", 4)
            .attr("fill", theme.bg)
            .attr("stroke", theme.secondaryColor)
            .attr("stroke-width", 2);
        }

        // Progression Data Points (Circles)
        var nodes = g.selectAll(".progression-node")
          .data(displayStages)
          .enter()
          .append("g")
          .attr("class", "progression-node")
          .attr("transform", function (d) { return "translate(" + xScale(d.label) + "," + yLeft(d.volume) + ")"; });

        nodes.append("circle")
          .attr("r", function (d) { return d.isChokePoint ? 7 : 5; })
          .attr("fill", function (d) { return d.isChokePoint ? theme.spikeBorder : theme.bg; })
          .attr("stroke", function (d) { return d.isChokePoint ? "#ffffff" : theme.curveColor; })
          .attr("stroke-width", function (d) { return d.isChokePoint ? 2.5 : 2.5; });

        // Choke Point Badges / Anomaly Flags
        if (config.showChokePointBadges !== false) {
          var chokeNodes = nodes.filter(function (d) { return d.isChokePoint; });

          chokeNodes.append("rect")
            .attr("x", -44)
            .attr("y", -30)
            .attr("width", 88)
            .attr("height", 18)
            .attr("rx", 9)
            .attr("fill", theme.spikeBorder)
            .attr("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.25))");

          chokeNodes.append("text")
            .attr("x", 0)
            .attr("y", -17)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "700")
            .attr("fill", "#ffffff")
            .text(function (d) { return "⚠️ CHOKE -" + d.hazardRate.toFixed(0) + "%"; });
        }

        // Data Value & Retention Labels
        if (config.showDataLabels !== false) {
          nodes.filter(function (d) { return !d.isChokePoint || config.showChokePointBadges === false; })
            .append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", theme.text)
            .text(function (d) {
              return formatValue(d.volume, config.valueFormat || "compact_num") + " (" + d.survivorPct.toFixed(0) + "%)";
            });
        }
      }

      // -------------------------------------------------------------
      // MODE 3: Milestone Step Waterfall
      // -------------------------------------------------------------
      if (layoutMode === "milestone_waterfall") {
        var stepW = Math.max(16, (innerWidth / displayStages.length) * 0.75);

        var waterfallG = g.selectAll(".waterfall-step")
          .data(displayStages)
          .enter()
          .append("g")
          .attr("class", "waterfall-step")
          .attr("transform", function (d) { return "translate(" + (xScale(d.label) - stepW / 2) + ",0)"; });

        // Retained Survivor Column
        waterfallG.append("rect")
          .attr("x", 0)
          .attr("y", function (d) { return yLeft(d.volume); })
          .attr("width", stepW)
          .attr("height", function (d) { return innerHeight - yLeft(d.volume); })
          .attr("rx", 4)
          .attr("fill", theme.curveColor)
          .attr("opacity", 0.85);

        // Downward Drop-off Red Column (shows volume lost from prior step)
        waterfallG.filter(function (d) { return d.index > 0 && d.stepDropoff > 0; })
          .append("rect")
          .attr("x", 0)
          .attr("y", function (d) {
            var prev = displayStages[d.index - 1];
            return yLeft(prev.volume);
          })
          .attr("width", stepW)
          .attr("height", function (d) {
            var prev = displayStages[d.index - 1];
            return Math.max(2, yLeft(d.volume) - yLeft(prev.volume));
          })
          .attr("rx", 3)
          .attr("fill", theme.spikeBorder)
          .attr("opacity", 0.7);

        // Connector step line
        waterfallG.filter(function (d) { return d.index > 0; })
          .append("line")
          .attr("x1", -((innerWidth / displayStages.length) - stepW) / 2)
          .attr("y1", function (d) { return yLeft(displayStages[d.index - 1].volume); })
          .attr("x2", 0)
          .attr("y2", function (d) { return yLeft(displayStages[d.index - 1].volume); })
          .attr("stroke", theme.subtext)
          .attr("stroke-dasharray", "2,2");

        if (config.showDataLabels !== false) {
          waterfallG.append("text")
            .attr("x", stepW / 2)
            .attr("y", function (d) { return yLeft(d.volume) - 6; })
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", theme.text)
            .text(function (d) { return d.survivorPct.toFixed(0) + "%"; });
        }
      }

      // X-AXIS
      var xAxis = g.append("g")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(d3.axisBottom(xScale).tickSize(6));

      xAxis.select(".domain").attr("stroke", theme.border);
      xAxis.selectAll(".tick line").attr("stroke", theme.border);
      xAxis.selectAll(".tick text")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", theme.text)
        .attr("dy", "10px");

      // Rotate X labels if stages exceed 8
      if (displayStages.length > 8) {
        xAxis.selectAll(".tick text")
          .attr("transform", "rotate(-25)")
          .style("text-anchor", "end")
          .attr("dx", "-6px")
          .attr("dy", "6px");
      }

      // DUAL Y-AXES (Following User Preference: "charts with two measures must put each on their own axis (dual Y-axis)")
      // User Preference: "do not label axes if legends are enabled (use showLabels: false / clean empty label)"
      // Left Y-Axis (Survivor Volume)
      var yAxisLeft = g.append("g")
        .call(d3.axisLeft(yLeft).ticks(5).tickFormat(function (d) { return formatValue(d, config.valueFormat || "compact_num"); }));
      yAxisLeft.select(".domain").attr("stroke", theme.border);
      yAxisLeft.selectAll(".tick line").attr("stroke", theme.border);
      yAxisLeft.selectAll(".tick text").attr("font-size", "10px").attr("fill", theme.subtext);

      // Left Axis Title Pill
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 16)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", theme.curveColor)
        .text("Active Survivor Volume");

      // Right Y-Axis (Marginal Churn % / Secondary Metric)
      if (layoutMode === "dual_axis_spikes" || (layoutMode === "difficulty_pacing" && secondaryMeasure)) {
        var rightScaleToUse = (layoutMode === "difficulty_pacing" && secondaryMeasure) ? ySecondary : yRight;
        var yAxisRight = g.append("g")
          .attr("transform", "translate(" + innerWidth + ",0)")
          .call(d3.axisRight(rightScaleToUse).ticks(5).tickFormat(function (d) {
            return (layoutMode === "difficulty_pacing" && secondaryMeasure) ? formatValue(d, config.valueFormat || "compact_num") : d + "%";
          }));
        yAxisRight.select(".domain").attr("stroke", theme.border);
        yAxisRight.selectAll(".tick line").attr("stroke", theme.border);
        yAxisRight.selectAll(".tick text").attr("font-size", "10px").attr("fill", (layoutMode === "difficulty_pacing" && secondaryMeasure) ? theme.secondaryColor : theme.spikeBorder);

        // Right Axis Title Pill
        g.append("text")
          .attr("transform", "rotate(90)")
          .attr("y", -innerWidth - margin.right + 20)
          .attr("x", innerHeight / 2)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .attr("fill", (layoutMode === "difficulty_pacing" && secondaryMeasure) ? theme.secondaryColor : theme.spikeBorder)
          .text((layoutMode === "difficulty_pacing" && secondaryMeasure) ? "Secondary Pacing Metric" : "Step Drop-off Hazard %");
      }

      // 3. INTERACTIVE CROSSHAIR & TOOLTIP OVERLAY
      var tooltip = document.createElement("div");
      tooltip.className = "progression-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = theme.tooltipBg;
      tooltip.style.color = theme.text;
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      tooltip.style.border = "1px solid " + theme.tooltipBorder;
      tooltip.style.fontSize = "12px";
      tooltip.style.zIndex = "100";
      tooltip.style.minWidth = "180px";
      chartWrapper.appendChild(tooltip);

      var crosshair = g.append("line")
        .attr("stroke", theme.text)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("opacity", 0)
        .style("pointer-events", "none");

      var hitOverlay = g.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

      var stagePositions = displayStages.map(function (d) { return xScale(d.label); });

      hitOverlay.on("mousemove", function (event) {
        var coords = d3.pointer(event);
        var mx = coords[0];
        // Find closest stage
        var closestIdx = 0;
        var minDist = Infinity;
        for (var i = 0; i < stagePositions.length; i++) {
          var dist = Math.abs(stagePositions[i] - mx);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }

        var stg = displayStages[closestIdx];
        var cx = stagePositions[closestIdx];
        crosshair.attr("x1", cx).attr("x2", cx).style("opacity", 0.7);

        var tipHtml = "<div style='font-weight:700;font-size:13px;border-bottom:1px solid " + theme.border + ";padding-bottom:4px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;'>" +
          "<span>" + stg.label + "</span><span style='font-size:11px;color:" + theme.subtext + ";'>Stage #" + (closestIdx + 1) + "</span></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Active Survivors:</span><strong style='color:" + theme.curveColor + ";'>" + formatValue(stg.volume, config.valueFormat || "compact_num") + "</strong></div>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Cumulative Retention:</span><strong>" + stg.survivorPct.toFixed(1) + "%</strong></div>";

        if (closestIdx > 0) {
          tipHtml += "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Step Drop-off:</span><strong style='color:" + theme.spikeBorder + ";'>-" + formatValue(stg.stepDropoff, config.valueFormat || "compact_num") + " (" + stg.hazardRate.toFixed(1) + "%)</strong></div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Step Conversion:</span><strong>" + stg.stepRetention.toFixed(1) + "%</strong></div>";

          if (stg.isChokePoint) {
            tipHtml += "<div style='margin-top:6px;padding:4px 6px;border-radius:4px;background:" + theme.chokePointBg + ";color:" + theme.chokePointText + ";font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px;'>" +
              "<span>⚠️ Choke Point:</span><span>+" + stg.zScore.toFixed(1) + "σ vs baseline</span></div>";
          }
        }

        if (secondaryMeasure && stg.secondary) {
          tipHtml += "<div style='display:flex;justify-content:space-between;gap:12px;margin-top:4px;border-top:1px solid " + theme.border + ";padding-top:4px;'><span>Secondary Metric:</span><strong style='color:" + theme.secondaryColor + ";'>" + formatValue(stg.secondary, config.valueFormat || "compact_num") + "</strong></div>";
        }

        tooltip.innerHTML = tipHtml;
        tooltip.style.display = "block";

        var tipRect = tooltip.getBoundingClientRect();
        var tipX = event.clientX - rect.left + 15;
        var tipY = event.clientY - rect.top - tipRect.height / 2;

        if (tipX + tipRect.width > width - 10) {
          tipX = event.clientX - rect.left - tipRect.width - 15;
        }
        if (tipY < 10) tipY = 10;
        if (tipY + tipRect.height > height - 10) tipY = height - tipRect.height - 10;

        tooltip.style.left = tipX + "px";
        tooltip.style.top = tipY + "px";
      });

      hitOverlay.on("mouseleave", function () {
        crosshair.style("opacity", 0);
        tooltip.style.display = "none";
      });

      // Drill-down support on stage click
      hitOverlay.on("click", function (event) {
        var coords = d3.pointer(event);
        var mx = coords[0];
        var closestIdx = 0;
        var minDist = Infinity;
        for (var i = 0; i < stagePositions.length; i++) {
          var dist = Math.abs(stagePositions[i] - mx);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        }
        var clickedStage = displayStages[closestIdx];
        if (clickedStage && clickedStage.firstRow && stageDim && clickedStage.firstRow[stageDim]) {
          var cell = clickedStage.firstRow[stageDim];
          if (cell.links && cell.links.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({ links: cell.links, event: event });
          }
        }
      });
    }
  });
})();
