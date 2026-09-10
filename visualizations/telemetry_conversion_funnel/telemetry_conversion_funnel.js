/**
 * Telemetry & Conversion Funnel - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Multi-Mode Conversion, Drop-off & Telemetry Pipeline Architecture:
 * - 4 Interactive Layout Modes:
 *     1. "curved_pipeline": Smooth continuous Bézier stream funnel connecting stages with fluid flow contours
 *     2. "stepped_funnel": Classic isometric trapezoidal stage blocks with highlighted neck drop-offs
 *     3. "waterfall_dropoff": Retained volume bars paired with downward red drop-off delta columns
 *     4. "segmented_stacked": Multi-cohort / multi-channel stage breakdown with stacked categorical bands
 * - Dual-Metric Telemetry: Primary throughput volume (e.g. users, events, sessions) and optional secondary conversion metric (e.g. revenue, latency, GMV)
 * - Flexible Data Shapes:
 *     - Single Dimension (Stages) + 1-2 Measures (Volume, Secondary)
 *     - 2 Dimensions (Segment/Channel + Stage) + 1-2 Measures for multi-cohort funnel slicing
 *     - 0 Dimensions + 2-8 Sequential Stage Measures (Multi-Measure Funnel)
 * - Client-Side Interactive Controls:
 *     - Real-time stage/segment search filter
 *     - Segment channel dropdown filter (when 2 dimensions are present)
 *     - Interactive hover focus isolating stage path, drop-off delta, and retention rates
 *     - Glassmorphism hover cards with step-to-step conversion, top-of-funnel conversion, and drop-off counts
 *     - Executive HUD metrics bar summarizing Top-of-Funnel, Bottom-of-Funnel, Overall Conversion %, and Biggest Drop-off Bottleneck
 *     - Looker Drill-Down menu integration on clicks
 * - Scalability: High-density data aggregation supporting 5,000+ rows smoothly
 * - Strict 2-Section Options Modal: "Display" and "Style" to keep the Looker UI clean and uncluttered.
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
    cyber_teal: {
      name: "Cyber Teal (Dark)",
      isDark: true,
      bg: "#0b0f19",
      cardBg: "rgba(17, 24, 39, 0.85)",
      border: "#1f2937",
      text: "#f8fafc",
      subtext: "#94a3b8",
      hudBg: "rgba(15, 23, 42, 0.9)",
      hudBorder: "rgba(51, 65, 85, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#94a3b8",
      accent: "#06b6d4",
      stageColors: ["#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e"],
      dropoffFill: "rgba(239, 68, 68, 0.25)",
      dropoffStroke: "#ef4444",
      dropoffText: "#fca5a5",
      retainedFill: "#06b6d4",
      connector: "rgba(6, 182, 212, 0.3)",
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
      hudBg: "rgba(19, 11, 36, 0.9)",
      hudBorder: "rgba(91, 33, 182, 0.8)",
      hudText: "#f8fafc",
      hudSubtext: "#c4b5fd",
      accent: "#a855f7",
      stageColors: ["#c084fc", "#a855f7", "#9333ea", "#7e22ce", "#6b21a8", "#581c87", "#4c1d95", "#3b0764"],
      dropoffFill: "rgba(244, 63, 94, 0.25)",
      dropoffStroke: "#f43f5e",
      dropoffText: "#fda4af",
      retainedFill: "#a855f7",
      connector: "rgba(168, 85, 247, 0.3)",
      tooltipBg: "rgba(19, 11, 36, 0.96)",
      tooltipBorder: "#a855f7"
    },
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
      stageColors: ["#2563eb", "#3b82f6", "#60a5fa", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#84cc16"],
      dropoffFill: "rgba(220, 38, 38, 0.12)",
      dropoffStroke: "#dc2626",
      dropoffText: "#b91c1c",
      retainedFill: "#2563eb",
      connector: "rgba(37, 99, 235, 0.25)",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    emerald_growth: {
      name: "Emerald Growth (Light)",
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
      stageColors: ["#059669", "#10b981", "#34d399", "#2dd4bf", "#0d9488", "#0284c7", "#4f46e5", "#7c3aed"],
      dropoffFill: "rgba(234, 88, 12, 0.12)",
      dropoffStroke: "#ea580c",
      dropoffText: "#c2410c",
      retainedFill: "#059669",
      connector: "rgba(5, 150, 105, 0.25)",
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
      stageColors: ["#d97706", "#f59e0b", "#fbbf24", "#ea580c", "#f97316", "#e11d48", "#be123c", "#9f1239"],
      dropoffFill: "rgba(225, 29, 72, 0.12)",
      dropoffStroke: "#e11d48",
      dropoffText: "#9f1239",
      retainedFill: "#d97706",
      connector: "rgba(217, 119, 6, 0.25)",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#d97706"
    }
  };

  function formatMetricValue(val, fmt) {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    var num = Number(val);
    if (fmt === "compact_currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else if (fmt === "full_currency") {
      return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (fmt === "compact_num") {
      if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
      return num.toLocaleString();
    } else if (fmt === "percent") {
      return (num * 100).toFixed(1) + "%";
    }
    return Math.round(num).toLocaleString();
  }

  looker.plugins.visualizations.add({
    id: "telemetry_conversion_funnel",
    label: "Telemetry & Conversion Funnel",
    options: {
      // SECTION 1: DISPLAY
      funnelLayout: {
        type: "string",
        label: "Funnel Pipeline Layout",
        values: [
          { "Curved Stream Pipeline": "curved_pipeline" },
          { "Stepped Isometric Funnel": "stepped_funnel" },
          { "Waterfall Drop-off Stack": "waterfall_dropoff" },
          { "Segmented Stacked Stream": "segmented_stacked" }
        ],
        default: "curved_pipeline",
        section: "Display",
        order: 1
      },
      metricMode: {
        type: "string",
        label: "Metric Display Mode",
        values: [
          { "Primary Volume Only": "primary_only" },
          { "Primary Volume + Secondary Metric": "dual_metric" },
          { "Conversion Percentage Only": "pct_only" }
        ],
        default: "primary_only",
        section: "Display",
        order: 2
      },
      pctBaseline: {
        type: "string",
        label: "Conversion % Reference",
        values: [
          { "Step-to-Step Conversion": "step_to_step" },
          { "Top of Funnel Overall": "top_of_funnel" },
          { "Both Metrics": "both" }
        ],
        default: "step_to_step",
        section: "Display",
        order: 3
      },
      funnelOrientation: {
        type: "string",
        label: "Pipeline Orientation",
        values: [
          { "Horizontal Flow (Left to Right)": "horizontal" },
          { "Vertical Pipeline (Top to Bottom)": "vertical" }
        ],
        default: "horizontal",
        section: "Display",
        order: 4
      },
      showDropoffBadges: {
        type: "boolean",
        label: "Show Drop-off Badges & Leakage %",
        default: true,
        section: "Display",
        order: 5
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive KPI HUD Bar",
        default: true,
        section: "Display",
        order: 6
      },
      showStepValues: {
        type: "boolean",
        label: "Show In-Stage Value Labels",
        default: true,
        section: "Display",
        order: 7
      },
      showStepLabels: {
        type: "boolean",
        label: "Show Stage Titles",
        default: true,
        section: "Display",
        order: 8
      },
      showSearch: {
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        default: true,
        section: "Display",
        order: 9
      },
      valueFormat: {
        type: "string",
        label: "Primary Value Formatting",
        values: [
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Full Currency ($1,234,567.89)": "full_currency" },
          { "Raw Integer": "raw_num" }
        ],
        default: "compact_num",
        section: "Display",
        order: 10
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Palette & Theme",
        values: [
          { "Cyber Teal (Dark)": "cyber_teal" },
          { "Neon Violet (Dark)": "neon_violet" },
          { "Executive Slate (Light)": "executive_slate" },
          { "Emerald Growth (Light)": "emerald_growth" },
          { "Sunset Amber (Light)": "sunset_amber" }
        ],
        default: "cyber_teal",
        section: "Style",
        order: 1
      },
      funnelGradient: {
        type: "string",
        label: "Surface Styling",
        values: [
          { "Smooth Gradient Blend": "smooth" },
          { "Solid Color Stages": "solid" },
          { "Glass Translucent Fill": "glass" }
        ],
        default: "smooth",
        section: "Style",
        order: 2
      },
      curvatureIntensity: {
        type: "string",
        label: "Curvature & Neck Shaping",
        values: [
          { "High Flow Bézier Curves": "curved" },
          { "Subtle Dynamic Arcs": "subtle" },
          { "Linear Sharp Edges": "linear" }
        ],
        default: "curved",
        section: "Style",
        order: 3
      },
      stagePadding: {
        type: "number",
        label: "Stage Gap Padding (px)",
        default: 16,
        section: "Style",
        order: 4
      },
      minNeckWidth: {
        type: "number",
        label: "Minimum Neck Thickness (px)",
        default: 28,
        section: "Style",
        order: 5
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      this._container = document.createElement("div");
      this._container.setAttribute("class", "conversion-funnel-root");
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      this._selectedSegment = "ALL";
      this._searchFilter = "";
    },

    updateAsync: function (data, element, config, queryResponse, details, onComplete) {
      this.clearErrors();

      if (!data || data.length === 0) {
        this.addError({
          title: "No Data",
          message: "The query returned no results to render."
        });
        if (onComplete) onComplete();
        return;
      }

      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      if (dims.length === 0 && meas.length < 2) {
        this.addError({
          title: "Insufficient Fields",
          message: "Telemetry & Conversion Funnel requires either: (1) 1 Dimension for Stage and 1-2 Measures, or (2) 2 Dimensions (Segment + Stage) and 1 Measure, or (3) 2 or more Measures representing sequential stages."
        });
        if (onComplete) onComplete();
        return;
      }

      var self = this;
      ensureD3(function (d3) {
        try {
          self._render(d3, data, config, queryResponse);
        } catch (e) {
          console.error("Conversion Funnel render error:", e);
          self.addError({
            title: "Rendering Exception",
            message: e.message || "An unexpected error occurred during rendering."
          });
        }
        if (onComplete) onComplete();
      });
    },

    _parseData: function (data, queryResponse, config) {
      var fields = queryResponse.fields;
      var dims = fields.dimensions || [];
      var meas = fields.measures || [];

      var stages = [];
      var segments = [];
      var isMultiSegment = false;
      var hasSecondaryMetric = meas.length >= 2;

      // Mode A: Multi-Measure Funnel (0 dimensions, 2+ measures)
      if (dims.length === 0 && meas.length >= 2) {
        var row = data[0];
        meas.forEach(function (m, idx) {
          var cell = row[m.name];
          var rawVal = cell ? (cell.value !== undefined ? cell.value : cell) : 0;
          var numVal = Number(rawVal) || 0;
          stages.push({
            id: m.name,
            name: m.label_short || m.label || m.name,
            value: numVal,
            secondaryValue: 0,
            drillData: cell,
            order: idx
          });
        });
      }
      // Mode B: 2 Dimensions (Segment / Channel + Stage) + 1-2 Measures
      else if (dims.length >= 2) {
        isMultiSegment = true;
        var segDim = dims[0];
        var stageDim = dims[1];
        var primMeas = meas[0];
        var secMeas = meas.length > 1 ? meas[1] : null;

        var segMap = {};
        var stageSet = {};
        var stageOrderMap = {};

        data.forEach(function (row) {
          var segCell = row[segDim.name];
          var segVal = segCell ? String(segCell.value !== undefined ? segCell.value : segCell) : "Unknown";
          var stCell = row[stageDim.name];
          var stVal = stCell ? String(stCell.value !== undefined ? stCell.value : stCell) : "Stage";

          var primCell = primMeas ? row[primMeas.name] : null;
          var primVal = primCell ? Number(primCell.value !== undefined ? primCell.value : primCell) || 0 : 1;

          var secVal = 0;
          if (secMeas) {
            var secCell = row[secMeas.name];
            secVal = secCell ? Number(secCell.value !== undefined ? secCell.value : secCell) || 0 : 0;
          }

          if (!segMap[segVal]) {
            segMap[segVal] = { id: segVal, name: segVal, stages: {}, totalVolume: 0 };
            segments.push(segVal);
          }
          segMap[segVal].totalVolume += primVal;

          if (!segMap[segVal].stages[stVal]) {
            segMap[segVal].stages[stVal] = {
              id: stVal,
              name: stVal,
              value: 0,
              secondaryValue: 0,
              drillData: primCell || stCell
            };
          }
          segMap[segVal].stages[stVal].value += primVal;
          segMap[segVal].stages[stVal].secondaryValue += secVal;

          if (!stageSet[stVal]) {
            stageSet[stVal] = true;
            stageOrderMap[stVal] = Object.keys(stageOrderMap).length;
          }
        });

        // Filter by selected segment
        var targetSeg = this._selectedSegment || "ALL";
        var aggStages = {};
        Object.keys(stageSet).forEach(function (stName) {
          aggStages[stName] = { id: stName, name: stName, value: 0, secondaryValue: 0, drillData: null, segmentBreakdown: {} };
        });

        Object.keys(segMap).forEach(function (segKey) {
          if (targetSeg === "ALL" || targetSeg === segKey) {
            var sData = segMap[segKey];
            Object.keys(sData.stages).forEach(function (stKey) {
              var stObj = sData.stages[stKey];
              aggStages[stKey].value += stObj.value;
              aggStages[stKey].secondaryValue += stObj.secondaryValue;
              if (!aggStages[stKey].drillData) aggStages[stKey].drillData = stObj.drillData;
            });
          }
          // Record segment contribution for segmented layout
          Object.keys(sData.stages).forEach(function (stKey) {
            var stObj = sData.stages[stKey];
            if (!aggStages[stKey].segmentBreakdown[segKey]) {
              aggStages[stKey].segmentBreakdown[segKey] = 0;
            }
            aggStages[stKey].segmentBreakdown[segKey] += stObj.value;
          });
        });

        Object.keys(aggStages).forEach(function (stKey) {
          stages.push(aggStages[stKey]);
        });

        // Natural sort by stage volume descending to reflect funnel flow
        stages.sort(function (a, b) {
          return b.value - a.value;
        });
      }
      // Mode C: 1 Dimension (Stage) + 1-2 Measures
      else {
        var stageDim1 = dims[0];
        var primMeas1 = meas[0];
        var secMeas1 = meas.length > 1 ? meas[1] : null;

        var stageAgg = {};
        data.forEach(function (row) {
          var cell = row[stageDim1.name];
          var name = cell ? String(cell.value !== undefined ? cell.value : cell) : "Unknown";
          var primCell = primMeas1 ? row[primMeas1.name] : null;
          var val = primCell ? Number(primCell.value !== undefined ? primCell.value : primCell) || 0 : 1;

          var secVal = 0;
          if (secMeas1) {
            var secCell = row[secMeas1.name];
            secVal = secCell ? Number(secCell.value !== undefined ? secCell.value : secCell) || 0 : 0;
          }

          if (!stageAgg[name]) {
            stageAgg[name] = { id: name, name: name, value: 0, secondaryValue: 0, drillData: primCell || cell };
          }
          stageAgg[name].value += val;
          stageAgg[name].secondaryValue += secVal;
        });

        Object.keys(stageAgg).forEach(function (k) {
          stages.push(stageAgg[k]);
        });

        // Sort descending by primary volume to form a true funnel pipeline
        stages.sort(function (a, b) {
          return b.value - a.value;
        });
      }

      // Filter by search text if applicable
      if (this._searchFilter && this._searchFilter.trim() !== "") {
        var q = this._searchFilter.trim().toLowerCase();
        stages = stages.filter(function (s) {
          return s.name.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Compute conversion metrics (step-to-step and top-of-funnel)
      var maxVal = stages.length > 0 ? stages[0].value : 1;
      var topVal = maxVal > 0 ? maxVal : 1;

      stages.forEach(function (st, i) {
        st.index = i;
        st.topPct = topVal > 0 ? (st.value / topVal) : 0;
        if (i === 0) {
          st.stepPct = 1.0;
          st.dropoffVal = 0;
          st.dropoffPct = 0;
        } else {
          var prevVal = stages[i - 1].value;
          st.stepPct = prevVal > 0 ? (st.value / prevVal) : 0;
          st.dropoffVal = Math.max(0, prevVal - st.value);
          st.dropoffPct = prevVal > 0 ? (st.dropoffVal / prevVal) : 0;
        }
      });

      return {
        stages: stages,
        segments: segments,
        isMultiSegment: isMultiSegment,
        hasSecondaryMetric: hasSecondaryMetric,
        primaryLabel: meas.length > 0 ? (meas[0].label_short || meas[0].label || meas[0].name) : "Volume",
        secondaryLabel: meas.length > 1 ? (meas[1].label_short || meas[1].label || meas[1].name) : "Secondary Metric",
        topVal: topVal,
        bottomVal: stages.length > 0 ? stages[stages.length - 1].value : 0,
        overallConversion: stages.length > 0 && topVal > 0 ? (stages[stages.length - 1].value / topVal) : 0
      };
    },

    _render: function (d3, data, config, queryResponse) {
      var self = this;
      var container = this._container;
      container.innerHTML = ""; // Purge stale DOM

      var themeKey = config.colorTheme || "cyber_teal";
      var theme = THEMES[themeKey] || THEMES.cyber_teal;
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var parsed = this._parseData(data, queryResponse, config);
      var stages = parsed.stages;

      if (stages.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:' + theme.subtext + ';">No matching funnel stages found for current filters.</div>';
        return;
      }

      // 1. Create Top Header & HUD Bar
      var topControls = document.createElement("div");
      topControls.setAttribute("class", "funnel-top-bar");
      topControls.style.display = "flex";
      topControls.style.flexWrap = "wrap";
      topControls.style.alignItems = "center";
      topControls.style.justifyContent = "space-between";
      topControls.style.padding = "10px 16px";
      topControls.style.gap = "10px";
      topControls.style.borderBottom = "1px solid " + theme.border;
      topControls.style.background = theme.hudBg;
      topControls.style.boxSizing = "border-box";
      topControls.style.backdropFilter = "blur(8px)";
      topControls.style.zIndex = "10";
      container.appendChild(topControls);

      // HUD Metrics Cards
      if (config.showExecutiveHUD !== false) {
        var hudGroup = document.createElement("div");
        hudGroup.style.display = "flex";
        hudGroup.style.alignItems = "center";
        hudGroup.style.gap = "14px";
        hudGroup.style.flexWrap = "wrap";

        // Find biggest drop-off bottleneck
        var biggestDrop = { name: "None", val: 0, pct: 0 };
        for (var b = 1; b < stages.length; b++) {
          if (stages[b].dropoffVal > biggestDrop.val) {
            biggestDrop = {
              name: stages[b - 1].name + " \u2192 " + stages[b].name,
              val: stages[b].dropoffVal,
              pct: stages[b].dropoffPct
            };
          }
        }

        var hudItems = [
          { label: "TOP OF FUNNEL", value: formatMetricValue(parsed.topVal, config.valueFormat || "compact_num"), sub: stages[0].name },
          { label: "BOTTOM CONVERSION", value: formatMetricValue(parsed.bottomVal, config.valueFormat || "compact_num"), sub: (parsed.overallConversion * 100).toFixed(1) + "% Net Conversion" },
          { label: "PIPELINE STAGES", value: String(stages.length) + " Steps", sub: (parsed.isMultiSegment ? (self._selectedSegment || "All Segments") : "Aggregate") },
          { label: "PRIMARY BOTTLENECK", value: (biggestDrop.pct * 100).toFixed(1) + "% Drop", sub: biggestDrop.name, alert: true }
        ];

        hudItems.forEach(function (item) {
          var card = document.createElement("div");
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.padding = "4px 10px";
          card.style.background = item.alert ? "rgba(239, 68, 68, 0.12)" : "rgba(255, 255, 255, 0.05)";
          card.style.border = "1px solid " + (item.alert ? "rgba(239, 68, 68, 0.4)" : theme.hudBorder);
          card.style.borderRadius = "6px";

          var lbl = document.createElement("span");
          lbl.style.fontSize = "9.5px";
          lbl.style.fontWeight = "700";
          lbl.style.letterSpacing = "0.5px";
          lbl.style.color = item.alert ? "#f87171" : theme.hudSubtext;
          lbl.innerText = item.label;

          var val = document.createElement("span");
          val.style.fontSize = "13.5px";
          val.style.fontWeight = "800";
          val.style.color = item.alert ? "#fca5a5" : theme.hudText;
          val.innerText = item.value;

          var sub = document.createElement("span");
          sub.style.fontSize = "10px";
          sub.style.color = theme.subtext;
          sub.style.whiteSpace = "nowrap";
          sub.style.overflow = "hidden";
          sub.style.textOverflow = "ellipsis";
          sub.style.maxWidth = "160px";
          sub.innerText = item.sub;

          card.appendChild(lbl);
          card.appendChild(val);
          card.appendChild(sub);
          hudGroup.appendChild(card);
        });
        topControls.appendChild(hudGroup);
      }

      // Interactive Filter Controls (Segment dropdown + Search input)
      var filterGroup = document.createElement("div");
      filterGroup.style.display = "flex";
      filterGroup.style.alignItems = "center";
      filterGroup.style.gap = "8px";

      if (parsed.isMultiSegment && parsed.segments.length > 1) {
        var segSelect = document.createElement("select");
        segSelect.style.background = theme.cardBg;
        segSelect.style.color = theme.text;
        segSelect.style.border = "1px solid " + theme.border;
        segSelect.style.borderRadius = "5px";
        segSelect.style.padding = "4px 8px";
        segSelect.style.fontSize = "11.5px";
        segSelect.style.outline = "none";
        segSelect.style.cursor = "pointer";

        var allOpt = document.createElement("option");
        allOpt.value = "ALL";
        allOpt.innerText = "All Segments / Channels";
        segSelect.appendChild(allOpt);

        parsed.segments.forEach(function (sg) {
          var opt = document.createElement("option");
          opt.value = sg;
          opt.innerText = sg;
          if (self._selectedSegment === sg) opt.selected = true;
          segSelect.appendChild(opt);
        });

        segSelect.addEventListener("change", function () {
          self._selectedSegment = segSelect.value;
          self._render(d3, data, config, queryResponse);
        });
        filterGroup.appendChild(segSelect);
      }

      if (config.showSearch !== false) {
        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Filter stages...";
        searchInput.value = self._searchFilter || "";
        searchInput.style.background = theme.cardBg;
        searchInput.style.color = theme.text;
        searchInput.style.border = "1px solid " + theme.border;
        searchInput.style.borderRadius = "5px";
        searchInput.style.padding = "4px 8px";
        searchInput.style.fontSize = "11.5px";
        searchInput.style.width = "110px";
        searchInput.style.outline = "none";

        searchInput.addEventListener("input", function (e) {
          self._searchFilter = e.target.value;
          self._render(d3, data, config, queryResponse);
        });
        filterGroup.appendChild(searchInput);
      }
      topControls.appendChild(filterGroup);

      // 2. Viewport & Canvas Calculation
      var topHeight = topControls.offsetHeight || 50;
      var totalWidth = container.clientWidth || 800;
      var totalHeight = Math.max(260, (container.clientHeight || 500) - topHeight);

      var chartWrapper = document.createElement("div");
      chartWrapper.style.width = "100%";
      chartWrapper.style.height = totalHeight + "px";
      chartWrapper.style.position = "relative";
      chartWrapper.style.overflow = "hidden";
      container.appendChild(chartWrapper);

      // Create Floating Tooltip
      var tooltip = document.createElement("div");
      tooltip.setAttribute("class", "funnel-tooltip");
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.pointerEvents = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.background = theme.tooltipBg;
      tooltip.style.border = "1px solid " + theme.tooltipBorder;
      tooltip.style.borderRadius = "8px";
      tooltip.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
      tooltip.style.color = theme.text;
      tooltip.style.fontSize = "12px";
      tooltip.style.zIndex = "100";
      tooltip.style.backdropFilter = "blur(8px)";
      chartWrapper.appendChild(tooltip);

      var svg = d3.select(chartWrapper)
        .append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight)
        .style("display", "block");

      // Defs: Gradients and glow filters
      var defs = svg.append("defs");

      // Drop-off hatch pattern
      var pattern = defs.append("pattern")
        .attr("id", "dropoff-hatch")
        .attr("width", 8)
        .attr("height", 8)
        .attr("patternTransform", "rotate(45 0 0)")
        .attr("patternUnits", "userSpaceOnUse");
      pattern.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", 8)
        .attr("stroke", theme.dropoffStroke)
        .attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.45);

      // Dispatch Layout
      var layoutMode = config.funnelLayout || "curved_pipeline";
      var orientation = config.funnelOrientation || "horizontal";

      if (layoutMode === "stepped_funnel") {
        this._renderSteppedFunnel(d3, svg, defs, stages, totalWidth, totalHeight, theme, config, tooltip, parsed);
      } else if (layoutMode === "waterfall_dropoff") {
        this._renderWaterfallDropoff(d3, svg, defs, stages, totalWidth, totalHeight, theme, config, tooltip, parsed);
      } else if (layoutMode === "segmented_stacked") {
        this._renderSegmentedStacked(d3, svg, defs, stages, totalWidth, totalHeight, theme, config, tooltip, parsed);
      } else {
        // Default: Curved Continuous Stream Pipeline
        this._renderCurvedPipeline(d3, svg, defs, stages, totalWidth, totalHeight, theme, config, tooltip, parsed);
      }
    },

    // =========================================================================
    // LAYOUT 1: CURVED STREAM PIPELINE (Bézier Flow Ribbon)
    // =========================================================================
    _renderCurvedPipeline: function (d3, svg, defs, stages, width, height, theme, config, tooltip, parsed) {
      var self = this;
      var orientation = config.funnelOrientation || "horizontal";
      var isHorizontal = orientation === "horizontal";
      var n = stages.length;

      var margin = isHorizontal ? { top: 40, right: 50, bottom: 65, left: 50 } : { top: 50, right: 60, bottom: 40, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var maxVal = d3.max(stages, function (d) { return d.value; }) || 1;
      var minNeck = Math.max(10, Number(config.minNeckWidth) || 28);

      if (isHorizontal) {
        var stepWidth = innerW / Math.max(1, n);
        var halfH = innerH / 2;
        var rScale = d3.scaleLinear()
          .domain([0, maxVal])
          .range([minNeck / 2, halfH * 0.92]);

        // Calculate top and bottom Y coordinates for each stage
        var stageGeom = stages.map(function (st, i) {
          var cx = (i + 0.5) * stepWidth;
          var r = rScale(st.value);
          return {
            x: cx,
            leftX: i * stepWidth + 6,
            rightX: (i + 1) * stepWidth - 6,
            topY: halfH - r,
            botY: halfH + r,
            radius: r,
            stage: st,
            index: i
          };
        });

        // 1. Draw connecting Bézier transition surfaces between stages
        var connectorsGroup = g.append("g").attr("class", "connectors");
        for (var c = 0; c < n - 1; c++) {
          var curr = stageGeom[c];
          var next = stageGeom[c + 1];
          var colorA = theme.stageColors[c % theme.stageColors.length];
          var colorB = theme.stageColors[(c + 1) % theme.stageColors.length];

          // Create linear gradient for connector
          var gradId = "funnel-conn-grad-" + c;
          var connGrad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "100%").attr("y2", "0%");
          connGrad.append("stop").attr("offset", "0%").attr("stop-color", colorA).attr("stop-opacity", 0.75);
          connGrad.append("stop").attr("offset", "100%").attr("stop-color", colorB).attr("stop-opacity", 0.75);

          var midX = (curr.rightX + next.leftX) / 2;

          // Upper curve path & Lower curve path
          var pathStr = "M " + curr.rightX + " " + curr.topY + " " +
            "C " + midX + " " + curr.topY + ", " + midX + " " + next.topY + ", " + next.leftX + " " + next.topY + " " +
            "L " + next.leftX + " " + next.botY + " " +
            "C " + midX + " " + next.botY + ", " + midX + " " + curr.botY + ", " + curr.rightX + " " + curr.botY + " Z";

          connectorsGroup.append("path")
            .attr("d", pathStr)
            .attr("fill", "url(#" + gradId + ")")
            .attr("opacity", 0.7)
            .attr("class", "connector-ribbon");

          // Drop-off wedge representation (lost volume above/below the neck)
          if (config.showDropoffBadges !== false && next.radius < curr.radius) {
            var dropH = curr.radius - next.radius;
            // Draw top drop-off wedge
            var dropPathTop = "M " + curr.rightX + " " + curr.topY + " " +
              "C " + midX + " " + curr.topY + ", " + midX + " " + next.topY + ", " + next.leftX + " " + next.topY + " " +
              "L " + next.leftX + " " + (halfH - curr.radius) + " Z";
            connectorsGroup.append("path")
              .attr("d", dropPathTop)
              .attr("fill", "url(#dropoff-hatch)")
              .attr("opacity", 0.4);

            // Center Drop-off Badge
            var badgeG = connectorsGroup.append("g")
              .attr("transform", "translate(" + midX + "," + (curr.topY - 14) + ")");
            badgeG.append("rect")
              .attr("x", -24)
              .attr("y", -11)
              .attr("width", 48)
              .attr("height", 17)
              .attr("rx", 4)
              .attr("fill", theme.isDark ? "#450a0a" : "#fee2e2")
              .attr("stroke", theme.dropoffStroke)
              .attr("stroke-width", 1);
            badgeG.append("text")
              .attr("text-anchor", "middle")
              .attr("y", 2)
              .attr("fill", theme.dropoffText)
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .text("-" + (next.stage.dropoffPct * 100).toFixed(0) + "%");
          }
        }

        // 2. Draw Stage Pillar Blocks
        var pillarsGroup = g.append("g").attr("class", "stage-pillars");
        stageGeom.forEach(function (sg, idx) {
          var col = theme.stageColors[idx % theme.stageColors.length];
          var stageG = pillarsGroup.append("g")
            .attr("class", "stage-node")
            .style("cursor", "pointer");

          var pWidth = Math.max(12, stepWidth * 0.45);
          var px = sg.x - pWidth / 2;
          var py = sg.topY;
          var pHeight = Math.max(6, sg.botY - sg.topY);

          // Pillar Rounded Column
          stageG.append("rect")
            .attr("x", px)
            .attr("y", py)
            .attr("width", pWidth)
            .attr("height", pHeight)
            .attr("rx", 6)
            .attr("fill", col)
            .attr("stroke", d3.rgb(col).brighter(0.5))
            .attr("stroke-width", 1.5)
            .attr("filter", "drop-shadow(0 4px 10px rgba(0,0,0,0.3))");

          // Inner Center Spine Glow
          stageG.append("line")
            .attr("x1", sg.x)
            .attr("y1", py + 6)
            .attr("x2", sg.x)
            .attr("y2", py + pHeight - 6)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.45);

          // Step Value Text inside/above
          if (config.showStepValues !== false) {
            stageG.append("text")
              .attr("x", sg.x)
              .attr("y", halfH + 4)
              .attr("text-anchor", "middle")
              .attr("fill", "#ffffff")
              .attr("font-size", pHeight < 40 ? "10px" : "12px")
              .attr("font-weight", "800")
              .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)")
              .text(formatMetricValue(sg.stage.value, config.valueFormat || "compact_num"));
          }

          // Top Conversion % Badge
          var badgeText = config.pctBaseline === "step_to_step"
            ? (sg.stage.stepPct * 100).toFixed(1) + "%"
            : (sg.stage.topPct * 100).toFixed(1) + "%";

          stageG.append("text")
            .attr("x", sg.x)
            .attr("y", sg.topY - 8)
            .attr("text-anchor", "middle")
            .attr("fill", theme.accent)
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .text(badgeText);

          // Bottom Stage Name & Sub-metric
          if (config.showStepLabels !== false) {
            var labelG = stageG.append("g")
              .attr("transform", "translate(" + sg.x + "," + (innerH + 18) + ")");

            labelG.append("text")
              .attr("text-anchor", "middle")
              .attr("fill", theme.text)
              .attr("font-size", "11.5px")
              .attr("font-weight", "700")
              .text(sg.stage.name.length > 16 ? sg.stage.name.substring(0, 14) + "..." : sg.stage.name);

            if (parsed.hasSecondaryMetric && config.metricMode === "dual_metric") {
              labelG.append("text")
                .attr("y", 15)
                .attr("text-anchor", "middle")
                .attr("fill", theme.subtext)
                .attr("font-size", "10px")
                .text(parsed.secondaryLabel + ": " + formatMetricValue(sg.stage.secondaryValue, "compact_currency"));
            } else {
              labelG.append("text")
                .attr("y", 15)
                .attr("text-anchor", "middle")
                .attr("fill", theme.subtext)
                .attr("font-size", "10px")
                .text(sg.stage.dropoffVal > 0 ? "Lost: " + formatMetricValue(sg.stage.dropoffVal, config.valueFormat || "compact_num") : "Entry Stage");
            }
          }

          // Hover Interactivity
          stageG.on("mouseenter", function (evt) {
            d3.select(this).select("rect").attr("stroke-width", 3).attr("stroke", "#ffffff");
            self._showTooltip(tooltip, sg.stage, parsed, config, theme, evt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(tooltip, evt);
          })
          .on("mouseleave", function () {
            d3.select(this).select("rect").attr("stroke-width", 1.5).attr("stroke", d3.rgb(col).brighter(0.5));
            tooltip.style.display = "none";
          })
          .on("click", function (evt) {
            if (LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({
                links: sg.stage.drillData ? sg.stage.drillData.links : [],
                event: evt
              });
            }
          });
        });
      }
      // VERTICAL ORIENTATION
      else {
        var stepHeight = innerH / Math.max(1, n);
        var halfW = innerW / 2;
        var rScaleV = d3.scaleLinear()
          .domain([0, maxVal])
          .range([minNeck / 2, halfW * 0.9]);

        var stageGeomV = stages.map(function (st, i) {
          var cy = (i + 0.5) * stepHeight;
          var r = rScaleV(st.value);
          return {
            y: cy,
            topY: i * stepHeight + 6,
            botY: (i + 1) * stepHeight - 6,
            leftX: halfW - r,
            rightX: halfW + r,
            radius: r,
            stage: st,
            index: i
          };
        });

        // Vertical connectors
        for (var cv = 0; cv < n - 1; cv++) {
          var cCurr = stageGeomV[cv];
          var cNext = stageGeomV[cv + 1];
          var cMidY = (cCurr.botY + cNext.topY) / 2;

          var vColorA = theme.stageColors[cv % theme.stageColors.length];
          var vColorB = theme.stageColors[(cv + 1) % theme.stageColors.length];

          var vGradId = "funnel-vgrad-" + cv;
          var vGrad = defs.append("linearGradient")
            .attr("id", vGradId)
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
          vGrad.append("stop").attr("offset", "0%").attr("stop-color", vColorA).attr("stop-opacity", 0.75);
          vGrad.append("stop").attr("offset", "100%").attr("stop-color", vColorB).attr("stop-opacity", 0.75);

          var vPath = "M " + cCurr.leftX + " " + cCurr.botY + " " +
            "C " + cCurr.leftX + " " + cMidY + ", " + cNext.leftX + " " + cMidY + ", " + cNext.leftX + " " + cNext.topY + " " +
            "L " + cNext.rightX + " " + cNext.topY + " " +
            "C " + cNext.rightX + " " + cMidY + ", " + cCurr.rightX + " " + cMidY + ", " + cCurr.rightX + " " + cCurr.botY + " Z";

          g.append("path")
            .attr("d", vPath)
            .attr("fill", "url(#" + vGradId + ")")
            .attr("opacity", 0.7);

          // Vertical Dropoff Badge
          if (config.showDropoffBadges !== false && cNext.radius < cCurr.radius) {
            var vBadge = g.append("g")
              .attr("transform", "translate(" + (cCurr.rightX + 24) + "," + cMidY + ")");
            vBadge.append("rect")
              .attr("x", -20)
              .attr("y", -9)
              .attr("width", 40)
              .attr("height", 18)
              .attr("rx", 4)
              .attr("fill", theme.isDark ? "#450a0a" : "#fee2e2")
              .attr("stroke", theme.dropoffStroke);
            vBadge.append("text")
              .attr("text-anchor", "middle")
              .attr("y", 3.5)
              .attr("fill", theme.dropoffText)
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .text("-" + (cNext.stage.dropoffPct * 100).toFixed(0) + "%");
          }
        }

        // Vertical Pillars
        stageGeomV.forEach(function (sg, idx) {
          var colV = theme.stageColors[idx % theme.stageColors.length];
          var stgGV = g.append("g").style("cursor", "pointer");

          var pHeightV = Math.max(12, stepHeight * 0.5);
          var pyV = sg.y - pHeightV / 2;
          var pxV = sg.leftX;
          var pWidthV = Math.max(6, sg.rightX - sg.leftX);

          stgGV.append("rect")
            .attr("x", pxV)
            .attr("y", pyV)
            .attr("width", pWidthV)
            .attr("height", pHeightV)
            .attr("rx", 6)
            .attr("fill", colV)
            .attr("stroke", d3.rgb(colV).brighter(0.5))
            .attr("stroke-width", 1.5);

          // Center text
          stgGV.append("text")
            .attr("x", halfW)
            .attr("y", sg.y + 4)
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff")
            .attr("font-size", "12px")
            .attr("font-weight", "800")
            .text(formatMetricValue(sg.stage.value, config.valueFormat || "compact_num"));

          // Stage Title Left
          stgGV.append("text")
            .attr("x", sg.leftX - 12)
            .attr("y", sg.y + 4)
            .attr("text-anchor", "end")
            .attr("fill", theme.text)
            .attr("font-size", "11.5px")
            .attr("font-weight", "700")
            .text(sg.stage.name);

          // Conversion Rate Right
          var bText = (sg.stage.stepPct * 100).toFixed(1) + "%";
          stgGV.append("text")
            .attr("x", sg.rightX + 12)
            .attr("y", sg.y + 4)
            .attr("text-anchor", "start")
            .attr("fill", theme.accent)
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .text(bText);

          stgGV.on("mouseenter", function (evt) {
            self._showTooltip(tooltip, sg.stage, parsed, config, theme, evt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(tooltip, evt);
          })
          .on("mouseleave", function () {
            tooltip.style.display = "none";
          });
        });
      }
    },

    // =========================================================================
    // LAYOUT 2: STEPPED ISOMETRIC FUNNEL (Classic Trapezoids)
    // =========================================================================
    _renderSteppedFunnel: function (d3, svg, defs, stages, width, height, theme, config, tooltip, parsed) {
      var self = this;
      var n = stages.length;
      var margin = { top: 40, right: 60, bottom: 50, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var stepH = innerH / Math.max(1, n);
      var halfW = innerW / 2;
      var maxVal = d3.max(stages, function (d) { return d.value; }) || 1;
      var minWidth = Math.max(30, Number(config.minNeckWidth) || 35);

      var wScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([minWidth, innerW * 0.95]);

      stages.forEach(function (st, i) {
        var topWidth = wScale(st.value);
        var nextVal = i < n - 1 ? stages[i + 1].value : st.value * 0.8;
        var botWidth = wScale(nextVal);

        var y0 = i * stepH;
        var y1 = (i + 1) * stepH - (Number(config.stagePadding) || 8);

        var x0_l = halfW - topWidth / 2;
        var x0_r = halfW + topWidth / 2;
        var x1_l = halfW - botWidth / 2;
        var x1_r = halfW + botWidth / 2;

        var trapPath = "M " + x0_l + " " + y0 + " " +
          "L " + x0_r + " " + y0 + " " +
          "L " + x1_r + " " + y1 + " " +
          "L " + x1_l + " " + y1 + " Z";

        var col = theme.stageColors[i % theme.stageColors.length];
        var stageG = g.append("g").style("cursor", "pointer");

        stageG.append("path")
          .attr("d", trapPath)
          .attr("fill", col)
          .attr("opacity", 0.85)
          .attr("stroke", d3.rgb(col).brighter(0.4))
          .attr("stroke-width", 1.5)
          .attr("filter", "drop-shadow(0 3px 6px rgba(0,0,0,0.25))");

        // Stage Title & Value text
        var cy = (y0 + y1) / 2;
        stageG.append("text")
          .attr("x", halfW)
          .attr("y", cy - 2)
          .attr("text-anchor", "middle")
          .attr("fill", "#ffffff")
          .attr("font-size", "12.5px")
          .attr("font-weight", "800")
          .text(st.name + " (" + formatMetricValue(st.value, config.valueFormat || "compact_num") + ")");

        stageG.append("text")
          .attr("x", halfW)
          .attr("y", cy + 13)
          .attr("text-anchor", "middle")
          .attr("fill", "rgba(255,255,255,0.85)")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .text((st.stepPct * 100).toFixed(1) + "% Step Conv | " + (st.topPct * 100).toFixed(1) + "% Overall");

        // Drop-off lateral indicators
        if (i < n - 1 && config.showDropoffBadges !== false) {
          var dropG = g.append("g")
            .attr("transform", "translate(" + (x0_r + 20) + "," + y1 + ")");
          dropG.append("rect")
            .attr("x", -20)
            .attr("y", -8)
            .attr("width", 42)
            .attr("height", 16)
            .attr("rx", 3)
            .attr("fill", theme.isDark ? "#450a0a" : "#fee2e2")
            .attr("stroke", theme.dropoffStroke);
          dropG.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 3.5)
            .attr("fill", theme.dropoffText)
            .attr("font-size", "9.5px")
            .attr("font-weight", "700")
            .text("-" + (stages[i + 1].dropoffPct * 100).toFixed(0) + "%");
        }

        stageG.on("mouseenter", function (evt) {
          d3.select(this).select("path").attr("opacity", 1.0).attr("stroke-width", 2.5);
          self._showTooltip(tooltip, st, parsed, config, theme, evt);
        })
        .on("mousemove", function (evt) {
          self._moveTooltip(tooltip, evt);
        })
        .on("mouseleave", function () {
          d3.select(this).select("path").attr("opacity", 0.85).attr("stroke-width", 1.5);
          tooltip.style.display = "none";
        });
      });
    },

    // =========================================================================
    // LAYOUT 3: WATERFALL DROP-OFF STACK (Retained vs Churned Columns)
    // =========================================================================
    _renderWaterfallDropoff: function (d3, svg, defs, stages, width, height, theme, config, tooltip, parsed) {
      var self = this;
      var n = stages.length;
      var margin = { top: 40, right: 40, bottom: 65, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var maxVal = d3.max(stages, function (d) { return d.value; }) || 1;

      var xScale = d3.scaleBand()
        .domain(stages.map(function (d) { return d.name; }))
        .range([0, innerW])
        .padding(0.3);

      var yScale = d3.scaleLinear()
        .domain([0, maxVal * 1.1])
        .range([innerH, 0]);

      // Draw Gridlines
      var yTicks = yScale.ticks(5);
      yTicks.forEach(function (t) {
        g.append("line")
          .attr("x1", 0).attr("x2", innerW)
          .attr("y1", yScale(t)).attr("y2", yScale(t))
          .attr("stroke", theme.border)
          .attr("stroke-dasharray", "3,3");

        g.append("text")
          .attr("x", -8)
          .attr("y", yScale(t) + 3)
          .attr("text-anchor", "end")
          .attr("fill", theme.subtext)
          .attr("font-size", "10px")
          .text(formatMetricValue(t, "compact_num"));
      });

      stages.forEach(function (st, idx) {
        var col = theme.stageColors[idx % theme.stageColors.length];
        var barW = xScale.bandwidth();
        var bx = xScale(st.name);
        var by = yScale(st.value);
        var bH = innerH - by;

        var barG = g.append("g").style("cursor", "pointer");

        // Main Retained Volume Bar
        barG.append("rect")
          .attr("x", bx)
          .attr("y", by)
          .attr("width", barW)
          .attr("height", Math.max(2, bH))
          .attr("rx", 4)
          .attr("fill", col)
          .attr("stroke", d3.rgb(col).brighter(0.4));

        // Value text on bar
        barG.append("text")
          .attr("x", bx + barW / 2)
          .attr("y", by - 6)
          .attr("text-anchor", "middle")
          .attr("fill", theme.text)
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .text(formatMetricValue(st.value, config.valueFormat || "compact_num"));

        // Stage label
        barG.append("text")
          .attr("x", bx + barW / 2)
          .attr("y", innerH + 18)
          .attr("text-anchor", "middle")
          .attr("fill", theme.text)
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .text(st.name.length > 14 ? st.name.substring(0, 12) + "..." : st.name);

        // Conversion % under stage
        barG.append("text")
          .attr("x", bx + barW / 2)
          .attr("y", innerH + 32)
          .attr("text-anchor", "middle")
          .attr("fill", theme.accent)
          .attr("font-size", "10px")
          .attr("font-weight", "700")
          .text((st.topPct * 100).toFixed(1) + "% Top");

        // Drop-off Bridge connecting to next bar
        if (idx < n - 1) {
          var nextSt = stages[idx + 1];
          var nextBx = xScale(nextSt.name);
          var nextBy = yScale(nextSt.value);

          // Red Churn Drop-off Connector Bar
          var dropH = Math.max(2, nextBy - by);
          var dropW = barW * 0.45;
          var dropX = bx + barW + (nextBx - (bx + barW) - dropW) / 2;

          g.append("rect")
            .attr("x", dropX)
            .attr("y", by)
            .attr("width", dropW)
            .attr("height", dropH)
            .attr("rx", 3)
            .attr("fill", theme.isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.2)")
            .attr("stroke", theme.dropoffStroke)
            .attr("stroke-width", 1);

          // Dropoff Badge
          if (config.showDropoffBadges !== false) {
            g.append("text")
              .attr("x", dropX + dropW / 2)
              .attr("y", by + dropH / 2 + 3.5)
              .attr("text-anchor", "middle")
              .attr("fill", theme.dropoffText)
              .attr("font-size", "9px")
              .attr("font-weight", "800")
              .text("-" + (nextSt.dropoffPct * 100).toFixed(0) + "%");
          }
        }

        barG.on("mouseenter", function (evt) {
          self._showTooltip(tooltip, st, parsed, config, theme, evt);
        })
        .on("mousemove", function (evt) {
          self._moveTooltip(tooltip, evt);
        })
        .on("mouseleave", function () {
          tooltip.style.display = "none";
        });
      });
    },

    // =========================================================================
    // LAYOUT 4: SEGMENTED STACKED STREAM (Categorical Slices)
    // =========================================================================
    _renderSegmentedStacked: function (d3, svg, defs, stages, width, height, theme, config, tooltip, parsed) {
      var self = this;
      var n = stages.length;
      var margin = { top: 40, right: 40, bottom: 60, left: 60 };
      var innerW = Math.max(100, width - margin.left - margin.right);
      var innerH = Math.max(100, height - margin.top - margin.bottom);

      var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      var maxVal = d3.max(stages, function (d) { return d.value; }) || 1;

      var segList = parsed.segments.length > 0 ? parsed.segments : ["Primary"];
      var segColorScale = d3.scaleOrdinal()
        .domain(segList)
        .range(theme.stageColors);

      var stepW = innerW / Math.max(1, n);

      stages.forEach(function (st, sIdx) {
        var cx = (sIdx + 0.5) * stepW;
        var bWidth = Math.max(16, stepW * 0.55);
        var bx = cx - bWidth / 2;

        var totalStVal = st.value || 1;
        var curY = innerH;

        var segmentsToRender = Object.keys(st.segmentBreakdown || {});
        if (segmentsToRender.length === 0) {
          segmentsToRender = ["Primary"];
        }

        segmentsToRender.forEach(function (segKey) {
          var segVal = st.segmentBreakdown ? (st.segmentBreakdown[segKey] || 0) : totalStVal;
          var segH = (segVal / maxVal) * (innerH * 0.9);
          var segY = curY - segH;

          var segG = g.append("g").style("cursor", "pointer");

          segG.append("rect")
            .attr("x", bx)
            .attr("y", segY)
            .attr("width", bWidth)
            .attr("height", Math.max(1, segH))
            .attr("fill", segColorScale(segKey))
            .attr("stroke", theme.bg)
            .attr("stroke-width", 0.5);

          segG.on("mouseenter", function (evt) {
            tooltip.style.display = "block";
            tooltip.innerHTML = '<div style="font-weight:700;margin-bottom:3px;color:' + theme.accent + ';">' + st.name + ' &bull; ' + segKey + '</div>' +
              '<div>Segment Volume: <b>' + formatMetricValue(segVal, config.valueFormat || "compact_num") + '</b></div>' +
              '<div>Stage Share: <b>' + (totalStVal > 0 ? (segVal / totalStVal * 100).toFixed(1) : 0) + '%</b></div>';
            self._moveTooltip(tooltip, evt);
          })
          .on("mousemove", function (evt) {
            self._moveTooltip(tooltip, evt);
          })
          .on("mouseleave", function () {
            tooltip.style.display = "none";
          });

          curY = segY;
        });

        // Stage bottom label
        g.append("text")
          .attr("x", cx)
          .attr("y", innerH + 18)
          .attr("text-anchor", "middle")
          .attr("fill", theme.text)
          .attr("font-size", "11px")
          .attr("font-weight", "600")
          .text(st.name.length > 14 ? st.name.substring(0, 12) + "..." : st.name);

        g.append("text")
          .attr("x", cx)
          .attr("y", curY - 6)
          .attr("text-anchor", "middle")
          .attr("fill", theme.accent)
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .text(formatMetricValue(st.value, config.valueFormat || "compact_num"));
      });
    },

    // =========================================================================
    // TOOLTIP HELPERS
    // =========================================================================
    _showTooltip: function (tooltip, stage, parsed, config, theme, evt) {
      tooltip.style.display = "block";
      var fmt = config.valueFormat || "compact_num";

      var html = '<div style="font-size:13px;font-weight:800;color:' + theme.accent + ';margin-bottom:6px;">' + stage.name + ' (Stage #' + (stage.index + 1) + ')</div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">' +
        '<span style="color:' + theme.subtext + ';">Throughput Volume:</span>' +
        '<span style="font-weight:700;">' + formatMetricValue(stage.value, fmt) + '</span>' +
        '</div>';

      if (parsed.hasSecondaryMetric && stage.secondaryValue > 0) {
        html += '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">' +
          '<span style="color:' + theme.subtext + ';">' + parsed.secondaryLabel + ':</span>' +
          '<span style="font-weight:700;">' + formatMetricValue(stage.secondaryValue, "compact_currency") + '</span>' +
          '</div>';
      }

      html += '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">' +
        '<span style="color:' + theme.subtext + ';">Step-to-Step Conversion:</span>' +
        '<span style="font-weight:700;color:' + (stage.stepPct >= 0.7 ? "#34d399" : "#f87171") + ';">' + (stage.stepPct * 100).toFixed(1) + '%</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px;">' +
        '<span style="color:' + theme.subtext + ';">Top-of-Funnel Conversion:</span>' +
        '<span style="font-weight:700;">' + (stage.topPct * 100).toFixed(1) + '%</span>' +
        '</div>';

      if (stage.dropoffVal > 0) {
        html += '<div style="margin-top:6px;padding-top:6px;border-top:1px solid ' + theme.border + ';display:flex;justify-content:space-between;gap:16px;">' +
          '<span style="color:' + theme.dropoffText + ';font-weight:600;">Lost at this Step:</span>' +
          '<span style="font-weight:700;color:' + theme.dropoffText + ';">-' + formatMetricValue(stage.dropoffVal, fmt) + ' (-' + (stage.dropoffPct * 100).toFixed(1) + '%)</span>' +
          '</div>';
      }

      tooltip.innerHTML = html;
      this._moveTooltip(tooltip, evt);
    },

    _moveTooltip: function (tooltip, evt) {
      var mouseX = evt.offsetX || evt.layerX || 0;
      var mouseY = evt.offsetY || evt.layerY || 0;
      var tipW = tooltip.offsetWidth || 200;
      var tipH = tooltip.offsetHeight || 120;

      var left = mouseX + 16;
      var top = mouseY - tipH / 2;

      if (left + tipW > (this._container.clientWidth - 10)) {
        left = mouseX - tipW - 16;
      }
      if (top < 10) top = 10;
      if (top + tipH > (this._container.clientHeight - 10)) {
        top = this._container.clientHeight - tipH - 10;
      }

      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }
  });
})();
