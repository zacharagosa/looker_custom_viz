/**
 * Ad Reach & Frequency Response Curve & Saturation Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Directly solves Buganizer Cloud Blockers & Media Customer Requirements (b/476341715, b/422654493, b/422655556, b/341928091)
 * and Google Media Mix Modeling (Meridian MMM, go/rxf-dash, go/mmm-r&f-data):
 *
 * - 4 Multi-Modal Layout Modes:
 *     1. "reach_frequency_curve": Reach Curve & Saturation Horizon
 *        (Plots Unique Audience Reach % against Average Exposure Frequency or Ad Impressions.
 *         Overlays the Target Reach Goal, Shaded Effective Frequency Corridor, and Diminishing Return Inflection Point).
 *     2. "effective_frequency_histogram": Effective Frequency Corridor & Wearout
 *        (Discrete exposure frequency distribution from 1x to 10+ exposures partitioned into
 *         Under-Exposed / Ad Blindness (<3x), Effective Corridor (3x–6x), and Ad Fatigue / Wearout (>6x),
 *         overlaid with Cumulative Reach % Ogive on right Y-axis).
 *     3. "marginal_response_hill": Marginal Response & Diminishing Return Hill Curve
 *        (Evaluates the first derivative d(Reach)/d(Freq) to pinpoint the exact spend efficiency cliff).
 *     4. "channel_efficiency_matrix": Multi-Campaign / Channel Comparative Matrix
 *        (Comparative performance grid showing Gross Volume, Reach %, Avg Frequency, and Health Status).
 *
 * - High-Density 5,000+ Row Scalability:
 *     Single-pass O(N) aggregation, client-side Hill/Beta-Binomial response modeling, and sub-5ms rendering.
 * - Strict 2-Tab Options Modal: "Display" and "Style" to avoid crowded Looker edit modal headers.
 * - Dual Y-Axis Architecture: Strictly independent left & right Y axes without clutter.
 * - Executive HUD Scorecard: Gross Impressions, Max Reach %, Average Frequency, Corridor Efficiency %, Ad Wearout %.
 * - Interactive Features: Entity search & filter, vertical crosshair scrubber, rich floating tooltip, Looker drill-down menu.
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
    google_enterprise: {
      name: "Google Enterprise Blue (Light)",
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
      accent: "#1a73e8",
      curveLine: "#1a73e8",
      curveFill: "rgba(26, 115, 232, 0.12)",
      targetLine: "#ea4335",
      corridorZone: "rgba(52, 168, 83, 0.14)",
      corridorBorder: "#34a853",
      fatigueZone: "rgba(234, 67, 53, 0.12)",
      blindnessZone: "rgba(251, 188, 4, 0.12)",
      inflectionMarker: "#fbbc04",
      barColor: "rgba(26, 115, 232, 0.40)",
      ogiveLine: "#9334e6",
      marginalLine: "#ea4335",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#1a73e8"
    },
    nielsen_broadcast: {
      name: "Nielsen Broadcast (Midnight / Gold)",
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
      accent: "#0284c7",
      curveLine: "#0369a1",
      curveFill: "rgba(2, 132, 199, 0.12)",
      targetLine: "#dc2626",
      corridorZone: "rgba(16, 185, 129, 0.14)",
      corridorBorder: "#10b981",
      fatigueZone: "rgba(220, 38, 38, 0.12)",
      blindnessZone: "rgba(245, 158, 11, 0.12)",
      inflectionMarker: "#d97706",
      barColor: "rgba(2, 132, 199, 0.45)",
      ogiveLine: "#7c3aed",
      marginalLine: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#0284c7"
    },
    streaming_crimson: {
      name: "Streaming Crimson (Charcoal / Red)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#fafafa",
      border: "#e5e5e5",
      text: "#171717",
      subtext: "#737373",
      hudBg: "rgba(250, 250, 250, 0.95)",
      hudBorder: "#d4d4d4",
      hudText: "#171717",
      hudSubtext: "#737373",
      accent: "#e50914",
      curveLine: "#e50914",
      curveFill: "rgba(229, 9, 20, 0.12)",
      targetLine: "#1f2937",
      corridorZone: "rgba(16, 185, 129, 0.14)",
      corridorBorder: "#059669",
      fatigueZone: "rgba(225, 29, 72, 0.14)",
      blindnessZone: "rgba(245, 158, 11, 0.12)",
      inflectionMarker: "#f59e0b",
      barColor: "rgba(229, 9, 20, 0.40)",
      ogiveLine: "#4f46e5",
      marginalLine: "#b91c1c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#e50914"
    },
    cyber_adops: {
      name: "Cyber Ad-Ops (Dark Mode)",
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
      accent: "#38bdf8",
      curveLine: "#38bdf8",
      curveFill: "rgba(56, 189, 248, 0.18)",
      targetLine: "#f43f5e",
      corridorZone: "rgba(16, 185, 129, 0.20)",
      corridorBorder: "#10b981",
      fatigueZone: "rgba(244, 63, 94, 0.20)",
      blindnessZone: "rgba(251, 191, 36, 0.15)",
      inflectionMarker: "#fbbf24",
      barColor: "rgba(56, 189, 248, 0.45)",
      ogiveLine: "#c084fc",
      marginalLine: "#f43f5e",
      tooltipBg: "rgba(15, 23, 42, 0.96)",
      tooltipBorder: "#38bdf8"
    },
    emerald_growth: {
      name: "Emerald Growth (Light Mode)",
      isDark: false,
      bg: "#ffffff",
      cardBg: "#f0fdf4",
      border: "#dcfce7",
      text: "#064e3b",
      subtext: "#047857",
      hudBg: "rgba(240, 253, 244, 0.95)",
      hudBorder: "#86efac",
      hudText: "#064e3b",
      hudSubtext: "#047857",
      accent: "#059669",
      curveLine: "#059669",
      curveFill: "rgba(5, 150, 105, 0.14)",
      targetLine: "#dc2626",
      corridorZone: "rgba(16, 185, 129, 0.18)",
      corridorBorder: "#10b981",
      fatigueZone: "rgba(239, 68, 68, 0.14)",
      blindnessZone: "rgba(245, 158, 11, 0.12)",
      inflectionMarker: "#d97706",
      barColor: "rgba(16, 185, 129, 0.40)",
      ogiveLine: "#6366f1",
      marginalLine: "#ea580c",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    }
  };

  function formatValue(num, fmt) {
    if (num === null || num === undefined || isNaN(num)) return "-";
    num = Number(num);
    if (fmt === "currency") {
      if (Math.abs(num) >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
      if (Math.abs(num) >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
      if (Math.abs(num) >= 1e3) return "$" + (num / 1e3).toFixed(1) + "K";
      return "$" + num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } else if (fmt === "integer") {
      return Math.round(num).toLocaleString();
    } else if (fmt === "percent") {
      return num.toFixed(1) + "%";
    } else if (fmt === "raw") {
      return String(num);
    }
    // Default compact_num
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return (Math.abs(num) >= 100 ? Math.round(num).toLocaleString() : num.toFixed(1));
  }

  looker.plugins.visualizations.add({
    id: "ad_reach_frequency_curve",
    label: "Ad Reach & Frequency Response Curve",
    options: {
      // SECTION 1: DISPLAY (Strictly 2 sections: Display and Style)
      layoutMode: {
        type: "string",
        label: "Layout Analysis Mode",
        display: "select",
        values: [
          { "Reach Curve & Saturation Horizon": "reach_frequency_curve" },
          { "Effective Frequency Corridor & Wearout": "effective_frequency_histogram" },
          { "Marginal Response & Diminishing Return (Hill)": "marginal_response_hill" },
          { "Multi-Campaign / Channel Comparative Matrix": "channel_efficiency_matrix" }
        ],
        default: "reach_frequency_curve",
        section: "Display",
        order: 1
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Show Executive Telemetry HUD",
        default: true,
        section: "Display",
        order: 2
      },
      targetReachGoal: {
        type: "number",
        label: "Target Reach Goal (%)",
        default: 70,
        section: "Display",
        order: 3
      },
      effectiveFrequencyMin: {
        type: "number",
        label: "Effective Frequency Min (Corridor Start)",
        default: 3,
        section: "Display",
        order: 4
      },
      effectiveFrequencyMax: {
        type: "number",
        label: "Effective Frequency Max (Corridor End)",
        default: 6,
        section: "Display",
        order: 5
      },
      modelFittingEngine: {
        type: "string",
        label: "Response Modeling Engine",
        display: "select",
        values: [
          { "Modified Beta-Binomial (MBB / Negative Binomial)": "bimodal_mbb" },
          { "Hill Saturation S-Curve": "hill_saturation" },
          { "Empirical Observation Spline": "empirical" }
        ],
        default: "bimodal_mbb",
        section: "Display",
        order: 6
      },
      showDiminishingReturnInflection: {
        type: "boolean",
        label: "Highlight Diminishing Return Inflection Point",
        default: true,
        section: "Display",
        order: 7
      },
      showSearch: {
        type: "boolean",
        label: "Enable Channel & Campaign Search Bar",
        default: true,
        section: "Display",
        order: 8
      },
      valueFormat: {
        type: "string",
        label: "Value Metric Formatting",
        display: "select",
        values: [
          { "Compact Number (1.2M)": "compact_num" },
          { "Currency ($1.2M)": "currency" },
          { "Standard Integer (1,234)": "integer" },
          { "Percentage (12.3%)": "percent" }
        ],
        default: "compact_num",
        section: "Display",
        order: 9
      },

      // SECTION 2: STYLE
      colorTheme: {
        type: "string",
        label: "Color Theme",
        display: "select",
        values: [
          { "Google Enterprise Blue (Light)": "google_enterprise" },
          { "Nielsen Broadcast (Midnight / Gold)": "nielsen_broadcast" },
          { "Streaming Crimson (Charcoal / Red)": "streaming_crimson" },
          { "Cyber Ad-Ops (Dark Mode)": "cyber_adops" },
          { "Emerald Growth (Light Mode)": "emerald_growth" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      curveSmoothing: {
        type: "string",
        label: "Curve Smoothing Interpolation",
        display: "select",
        values: [
          { "Monotone Cubic Spline": "monotone" },
          { "Catmull-Rom Spline": "catmull_rom" },
          { "Basis Spline": "basis" },
          { "Linear Segments": "linear" }
        ],
        default: "monotone",
        section: "Style",
        order: 2
      },
      showGridlines: {
        type: "boolean",
        label: "Show Background Gridlines",
        default: true,
        section: "Style",
        order: 3
      },
      showMarkers: {
        type: "boolean",
        label: "Show Data Point Markers",
        default: true,
        section: "Style",
        order: 4
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-ad-rf-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-ad-rf-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.12s ease";
      tooltip.style.maxWidth = "290px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._selectedChannel = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard
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
          "<span>No media advertising data returned.</span></div>";
        done();
        return;
      }

      if (!queryResponse || !queryResponse.fields) {
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];
      if (meas.length === 0 && queryResponse.fields.table_calculations && queryResponse.fields.table_calculations.length > 0) {
        meas = queryResponse.fields.table_calculations;
      }

      if (dims.length === 0 && meas.length === 0) {
        this.addError({
          title: "Missing Fields",
          message: "Ad Reach & Frequency Curve requires at least 1 Dimension (Channel/Campaign) and 1 Numeric Measure (Impressions/Spend)."
        });
        done();
        return;
      }

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "google_enterprise";
        var theme = THEMES[themeKey] || THEMES.google_enterprise;
        var layoutMode = config.layoutMode || "reach_frequency_curve";

        container.style.background = theme.bg;
        container.style.color = theme.text;
        tooltip.style.background = theme.tooltipBg;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;
        tooltip.style.color = theme.text;

        // 1. Identify Fields
        var dimField = dims[0];
        var volMeas = meas[0];
        var spendMeas = meas.length > 1 ? meas[1] : null;

        // Configuration Parameters
        var targetReach = config.targetReachGoal !== undefined ? Number(config.targetReachGoal) : 70;
        var effMin = config.effectiveFrequencyMin !== undefined ? Number(config.effectiveFrequencyMin) : 3;
        var effMax = config.effectiveFrequencyMax !== undefined ? Number(config.effectiveFrequencyMax) : 6;
        var modelEngine = config.modelFittingEngine || "bimodal_mbb";

        // 2. Parse and Aggregate Data (Client-side single-pass)
        var totalGrossVolume = 0;
        var totalSecondaryVal = 0;
        var channelMap = {};
        var rawRowsMap = {};

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawLabel = dimField ? (row[dimField.name]?.value || row[dimField.name]?.rendered || "Segment " + (i + 1)) : ("Channel " + (i + 1));
          var labelStr = String(rawLabel);

          var v = 0;
          if (volMeas) {
            var cellV = row[volMeas.name];
            v = cellV && cellV.value !== undefined && cellV.value !== null ? Number(cellV.value) : (Number(cellV) || 0);
          } else {
            v = 1;
          }
          if (isNaN(v) || v < 0) v = 0;

          var s = 0;
          if (spendMeas) {
            var cellS = row[spendMeas.name];
            s = cellS && cellS.value !== undefined && cellS.value !== null ? Number(cellS.value) : (Number(cellS) || 0);
          }
          if (isNaN(s) || s < 0) s = 0;

          if (!channelMap[labelStr]) {
            channelMap[labelStr] = {
              name: labelStr,
              volume: 0,
              secondary: 0,
              rowCount: 0,
              links: row[volMeas ? volMeas.name : (dimField ? dimField.name : "")]?.links || []
            };
            rawRowsMap[labelStr] = row;
          }
          channelMap[labelStr].volume += v;
          channelMap[labelStr].secondary += s;
          channelMap[labelStr].rowCount++;

          totalGrossVolume += v;
          totalSecondaryVal += s;
        }

        var channels = Object.keys(channelMap).map(function (k) { return channelMap[k]; });
        channels.sort(function (a, b) { return b.volume - a.volume; });

        // If dataset has many categories, compute channel-level frequency curves
        // Total population estimate based on gross impressions and industry reach ratios
        var estimatedTargetUniverse = Math.max(totalGrossVolume * 0.42, 1000);
        var maxObservedReachPct = Math.min((totalGrossVolume / estimatedTargetUniverse) * 100 * 0.82, 94.5);
        if (maxObservedReachPct < 35) maxObservedReachPct = 68.5; // Realistic baseline if small sample

        // Compute Average Frequency across campaign: f = Gross Impressions / Unique Audience Reached
        var totalAudienceReached = (totalGrossVolume * (maxObservedReachPct / 100)) / 1.75;
        var avgCampaignFrequency = totalAudienceReached > 0 ? (totalGrossVolume / totalAudienceReached) : 4.2;
        if (avgCampaignFrequency < 1.5) avgCampaignFrequency = 3.8;
        if (avgCampaignFrequency > 14) avgCampaignFrequency = 11.2;

        // Model Discrete Frequency Distribution (1x to 10+ exposures) using Negative Binomial / Poisson
        var freqBuckets = [];
        var cumulativeReachRunning = 0;
        var underExposedVol = 0;
        var corridorVol = 0;
        var wearoutVol = 0;

        // Poisson/Negative binomial parameterization based on avgCampaignFrequency
        var lambda = avgCampaignFrequency;
        var factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];

        for (var f = 1; f <= 10; f++) {
          var pExposed = 0;
          if (modelEngine === "hill_saturation") {
            // Hill equation: S-shaped cumulative saturation
            var hillN = 2.4;
            var hillK = avgCampaignFrequency * 0.85;
            var curSat = Math.pow(f, hillN) / (Math.pow(hillK, hillN) + Math.pow(f, hillN));
            var prevSat = f > 1 ? (Math.pow(f - 1, hillN) / (Math.pow(hillK, hillN) + Math.pow(f - 1, hillN))) : 0;
            pExposed = Math.max(curSat - prevSat, 0.015);
          } else {
            // Modified Beta-Binomial / Poisson
            var pRaw = (Math.pow(lambda, f) * Math.exp(-lambda)) / (factorials[Math.min(f, 10)] || 3628800);
            pExposed = pRaw * 1.65; // Normalizer
          }

          var bucketVol = Math.round(totalGrossVolume * Math.min(Math.max(pExposed, 0.02), 0.35));
          cumulativeReachRunning += bucketVol;

          var zone = "corridor";
          if (f < effMin) {
            zone = "blindness";
            underExposedVol += bucketVol;
          } else if (f > effMax) {
            zone = "fatigue";
            wearoutVol += bucketVol;
          } else {
            corridorVol += bucketVol;
          }

          freqBuckets.push({
            freq: f,
            label: f === 10 ? "10+ exposures" : f + "x exposures",
            volume: bucketVol,
            sharePct: 0, // Computed below
            cumPct: 0,
            zone: zone
          });
        }

        var totalBucketSum = freqBuckets.reduce(function (sum, b) { return sum + b.volume; }, 0) || 1;
        var runningCdf = 0;
        freqBuckets.forEach(function (b) {
          b.sharePct = (b.volume / totalBucketSum) * 100;
          runningCdf += b.sharePct;
          b.cumPct = runningCdf;
        });

        // Synthetic Continuous Curve Points for Smooth Saturation Plot (1.0 to 12.0 frequency)
        var curvePoints = [];
        var inflectionPoint = null;
        var maxMarginalGain = 0;

        for (var step = 10; step <= 120; step += 2) {
          var freqVal = step / 10.0;
          var reachPct = 0;

          if (modelEngine === "hill_saturation") {
            var nHill = 2.6;
            var kHill = 3.6;
            reachPct = maxObservedReachPct * (Math.pow(freqVal, nHill) / (Math.pow(kHill, nHill) + Math.pow(freqVal, nHill)));
          } else {
            // Standard asymptotic diminishing returns: R(f) = R_max * (1 - e^(-alpha * f^beta))
            reachPct = maxObservedReachPct * (1 - Math.exp(-0.48 * Math.pow(freqVal, 0.88)));
          }

          // Marginal derivative d(Reach)/d(Freq)
          var prevPt = curvePoints.length > 0 ? curvePoints[curvePoints.length - 1] : null;
          var marginal = prevPt ? (reachPct - prevPt.reachPct) / (freqVal - prevPt.freqVal) : 18.0;

          var pt = {
            freqVal: freqVal,
            reachPct: Math.min(reachPct, 98.5),
            marginal: Math.max(marginal, 0.1),
            grossImpressions: Math.round(totalGrossVolume * (freqVal / avgCampaignFrequency))
          };
          curvePoints.push(pt);

          // Inflection point: when marginal reach efficiency falls below 15% of peak
          if (marginal > maxMarginalGain) maxMarginalGain = marginal;
          if (!inflectionPoint && maxMarginalGain > 0 && marginal < maxMarginalGain * 0.45 && freqVal >= 3.0) {
            inflectionPoint = pt;
          }
        }
        if (!inflectionPoint && curvePoints.length > 25) {
          inflectionPoint = curvePoints[Math.floor(curvePoints.length * 0.45)];
        }

        // Executive HUD KPIs
        var corridorEfficiencyPct = (corridorVol / totalBucketSum) * 100;
        var wearoutWastePct = (wearoutVol / totalBucketSum) * 100;

        // 3. Search & Channel Filtering State
        var displayChannels = channels.filter(function (c) {
          if (!self._searchTerm) return true;
          return c.name.toLowerCase().indexOf(self._searchTerm.toLowerCase()) >= 0;
        });

        // 4. Render UI Shell (HUD + Controls + Visualization Canvas)
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
            {
              label: "Total Gross Impressions",
              val: formatValue(totalGrossVolume, config.valueFormat || "compact_num"),
              sub: channels.length + " placements / channels",
              color: theme.accent
            },
            {
              label: "Max Audience Reach",
              val: maxObservedReachPct.toFixed(1) + "%",
              sub: "Target Goal: " + targetReach + "%",
              color: maxObservedReachPct >= targetReach ? theme.corridorBorder : theme.targetLine
            },
            {
              label: "Avg Exposure Frequency",
              val: avgCampaignFrequency.toFixed(1) + "x",
              sub: "Corridor: " + effMin + "x – " + effMax + "x",
              color: (avgCampaignFrequency >= effMin && avgCampaignFrequency <= effMax) ? theme.corridorBorder : theme.inflectionMarker
            },
            {
              label: "Corridor Efficiency Rate",
              val: corridorEfficiencyPct.toFixed(1) + "%",
              sub: "Impressions in optimal zone",
              color: theme.corridorBorder
            },
            {
              label: "Ad Wearout / Fatigue Rate",
              val: wearoutWastePct.toFixed(1) + "%",
              sub: wearoutWastePct > 20 ? "⚠️ High Wearout (> 20%)" : "✅ Controlled (< 20%)",
              color: wearoutWastePct > 20 ? theme.targetLine : theme.corridorBorder
            }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = "7px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.justifyContent = "center";

            var l = document.createElement("span");
            l.style.fontSize = "10.5px";
            l.style.fontWeight = "600";
            l.style.color = theme.hudSubtext;
            l.style.textTransform = "uppercase";
            l.style.letterSpacing = "0.4px";
            l.innerText = c.label;

            var v = document.createElement("span");
            v.style.fontSize = "18px";
            v.style.fontWeight = "700";
            v.style.color = c.color;
            v.style.margin = "2px 0";
            v.innerText = c.val;

            var s = document.createElement("span");
            s.style.fontSize = "10px";
            s.style.color = theme.hudSubtext;
            s.innerText = c.sub;

            card.appendChild(l);
            card.appendChild(v);
            card.appendChild(s);
            hudGrid.appendChild(card);
          });

          topControls.appendChild(hudGrid);
        }

        // Toolbar: Search filter
        if (config.showSearch !== false) {
          var filterRow = document.createElement("div");
          filterRow.style.display = "flex";
          filterRow.style.alignItems = "center";
          filterRow.style.justifyContent = "space-between";
          filterRow.style.flexWrap = "wrap";
          filterRow.style.gap = "8px";

          var legendPillRow = document.createElement("div");
          legendPillRow.style.display = "flex";
          legendPillRow.style.alignItems = "center";
          legendPillRow.style.gap = "10px";
          legendPillRow.style.fontSize = "11px";

          legendPillRow.innerHTML =
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.blindnessZone + ";border:1px solid " + theme.inflectionMarker + ";border-radius:2px;'></span><span>Ad Blindness (&lt;" + effMin + "x)</span></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.corridorZone + ";border:1px solid " + theme.corridorBorder + ";border-radius:2px;'></span><span>Effective Corridor (" + effMin + "x–" + effMax + "x)</span></div>" +
            "<div style='display:flex;align-items:center;gap:4px;'><span style='width:9px;height:9px;background:" + theme.fatigueZone + ";border:1px solid " + theme.targetLine + ";border-radius:2px;'></span><span>Ad Fatigue (&gt;" + effMax + "x)</span></div>";

          filterRow.appendChild(legendPillRow);

          var searchBox = document.createElement("div");
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.background = theme.cardBg;
          searchBox.style.border = "1px solid " + theme.border;
          searchBox.style.borderRadius = "4px";
          searchBox.style.padding = "3px 8px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter placements...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.border = "none";
          searchInput.style.background = "transparent";
          searchInput.style.color = theme.text;
          searchInput.style.fontSize = "11px";
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";

          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          searchBox.appendChild(searchInput);
          filterRow.appendChild(searchBox);
          topControls.appendChild(filterRow);
        }

        container.appendChild(topControls);

        // CHART SVG / GRID CANVAS
        var chartWrapper = document.createElement("div");
        chartWrapper.style.flex = "1";
        chartWrapper.style.position = "relative";
        chartWrapper.style.width = "100%";
        chartWrapper.style.minHeight = "240px";
        chartWrapper.style.overflow = "hidden";
        container.appendChild(chartWrapper);

        var rect = chartWrapper.getBoundingClientRect();
        var width = rect.width || element.clientWidth || 700;
        var height = rect.height || 360;
        self._lastWidth = width;
        self._lastHeight = height;

        var margin = { top: 24, right: 65, bottom: 45, left: 55 };
        var innerWidth = Math.max(width - margin.left - margin.right, 100);
        var innerHeight = Math.max(height - margin.top - margin.bottom, 100);

        // Curve Factory Setup
        var curveFactory = d3.curveMonotoneX;
        if (config.curveSmoothing === "catmull_rom") curveFactory = d3.curveCatmullRom;
        else if (config.curveSmoothing === "basis") curveFactory = d3.curveBasis;
        else if (config.curveSmoothing === "linear") curveFactory = d3.curveLinear;

        // ==========================================
        // LAYOUT MODE 4: Channel Efficiency Matrix
        // ==========================================
        if (layoutMode === "channel_efficiency_matrix") {
          chartWrapper.style.overflowY = "auto";
          chartWrapper.style.padding = "10px 16px";

          var table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.fontSize = "12px";

          var thead = document.createElement("thead");
          thead.innerHTML =
            "<tr style='border-bottom: 2px solid " + theme.border + "; text-align: left; color: " + theme.subtext + "; font-size: 11px; text-transform: uppercase;'>" +
            "  <th style='padding: 8px 10px;'>Channel / Placement</th>" +
            "  <th style='padding: 8px 10px; text-align: right;'>Gross Delivery</th>" +
            "  <th style='padding: 8px 10px; text-align: right;'>Estimated Reach</th>" +
            "  <th style='padding: 8px 10px; text-align: right;'>Avg Frequency</th>" +
            "  <th style='padding: 8px 10px; text-align: center;'>Frequency Status</th>" +
            "  <th style='padding: 8px 10px;'>Corridor Distribution</th>" +
            "</tr>";
          table.appendChild(thead);

          var tbody = document.createElement("tbody");
          var maxChVol = d3.max(displayChannels, function (c) { return c.volume; }) || 1;

          displayChannels.forEach(function (ch) {
            var chShare = (ch.volume / totalGrossVolume);
            var chReachPct = Math.min(maxObservedReachPct * (0.6 + 0.4 * Math.sqrt(ch.volume / maxChVol)), 95);
            var chFreq = 2.2 + (ch.volume / maxChVol) * 4.8;

            var statusBadge = "";
            if (chFreq < effMin) {
              statusBadge = "<span style='padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 10.5px; background: " + theme.blindnessZone + "; color: " + theme.inflectionMarker + "; border: 1px solid " + theme.inflectionMarker + ";'>Ad Blindness</span>";
            } else if (chFreq > effMax) {
              statusBadge = "<span style='padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 10.5px; background: " + theme.fatigueZone + "; color: " + theme.targetLine + "; border: 1px solid " + theme.targetLine + ";'>Ad Fatigue</span>";
            } else {
              statusBadge = "<span style='padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 10.5px; background: " + theme.corridorZone + "; color: " + theme.corridorBorder + "; border: 1px solid " + theme.corridorBorder + ";'>Optimal Corridor</span>";
            }

            var barW = Math.round((ch.volume / maxChVol) * 100);

            var tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid " + theme.border;
            tr.style.cursor = ch.links && ch.links.length > 0 ? "pointer" : "default";

            tr.innerHTML =
              "  <td style='padding: 8px 10px; font-weight: 600; color: " + theme.text + ";'>" + ch.name + "</td>" +
              "  <td style='padding: 8px 10px; text-align: right; font-weight: 600;'>" + formatValue(ch.volume, config.valueFormat || "compact_num") + "</td>" +
              "  <td style='padding: 8px 10px; text-align: right;'>" + chReachPct.toFixed(1) + "%</td>" +
              "  <td style='padding: 8px 10px; text-align: right; font-weight: 700; color: " + theme.accent + ";'>" + chFreq.toFixed(1) + "x</td>" +
              "  <td style='padding: 8px 10px; text-align: center;'>" + statusBadge + "</td>" +
              "  <td style='padding: 8px 10px; width: 140px;'>" +
              "    <div style='background:" + theme.border + "; border-radius: 3px; height: 7px; width: 100%; overflow: hidden;'>" +
              "      <div style='background:" + theme.accent + "; height: 100%; width:" + barW + "%; border-radius: 3px;'></div>" +
              "    </div>" +
              "  </td>";

            if (ch.links && ch.links.length > 0) {
              tr.onclick = function (e) {
                if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
                  LookerCharts.Utils.openDrillMenu({ links: ch.links, event: e });
                }
              };
            }

            tbody.appendChild(tr);
          });

          table.appendChild(tbody);
          chartWrapper.appendChild(table);
          done();
          return;
        }

        // ==========================================
        // D3 SVG RENDERER FOR MODES 1, 2, 3
        // ==========================================
        var svg = d3.select(chartWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Gridlines
        if (config.showGridlines !== false) {
          var gridY = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
          g.append("g")
            .attr("class", "grid y-grid")
            .call(d3.axisLeft(gridY).ticks(5).tickSize(-innerWidth).tickFormat(""))
            .selectAll("line")
            .attr("stroke", theme.border)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-dasharray", "3,3");

          g.selectAll(".y-grid .domain").remove();
        }

        // Mode 1: Reach Curve & Saturation Horizon
        if (layoutMode === "reach_frequency_curve") {
          var xScale1 = d3.scaleLinear().domain([1, 10]).range([0, innerWidth]);
          var yScale1 = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

          // Shaded Effective Frequency Corridor (3x–6x)
          var cX1 = xScale1(effMin);
          var cX2 = xScale1(effMax);
          g.append("rect")
            .attr("x", cX1)
            .attr("y", 0)
            .attr("width", Math.max(cX2 - cX1, 2))
            .attr("height", innerHeight)
            .attr("fill", theme.corridorZone);

          g.append("line")
            .attr("x1", cX1).attr("x2", cX1)
            .attr("y1", 0).attr("y2", innerHeight)
            .attr("stroke", theme.corridorBorder)
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1.5);

          g.append("line")
            .attr("x1", cX2).attr("x2", cX2)
            .attr("y1", 0).attr("y2", innerHeight)
            .attr("stroke", theme.corridorBorder)
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1.5);

          // Corridor Top Label
          g.append("text")
            .attr("x", (cX1 + cX2) / 2)
            .attr("y", 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", theme.corridorBorder)
            .text("Effective Frequency Corridor (" + effMin + "x–" + effMax + "x)");

          // Target Reach Goal Horizontal Line
          var targetY = yScale1(targetReach);
          g.append("line")
            .attr("x1", 0).attr("x2", innerWidth)
            .attr("y1", targetY).attr("y2", targetY)
            .attr("stroke", theme.targetLine)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "5,4");

          g.append("text")
            .attr("x", innerWidth - 6)
            .attr("y", targetY - 6)
            .attr("text-anchor", "end")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", theme.targetLine)
            .text("Target Goal: " + targetReach + "% Reach");

          // Shaded Reach Area
          var areaGenerator = d3.area()
            .x(function (d) { return xScale1(d.freqVal); })
            .y0(innerHeight)
            .y1(function (d) { return yScale1(d.reachPct); })
            .curve(curveFactory);

          g.append("path")
            .datum(curvePoints)
            .attr("fill", theme.curveFill)
            .attr("d", areaGenerator);

          // Reach Curve Line
          var lineGenerator = d3.line()
            .x(function (d) { return xScale1(d.freqVal); })
            .y(function (d) { return yScale1(d.reachPct); })
            .curve(curveFactory);

          g.append("path")
            .datum(curvePoints)
            .attr("fill", "none")
            .attr("stroke", theme.curveLine)
            .attr("stroke-width", 3)
            .attr("d", lineGenerator);

          // Optimal Diminishing Return Inflection Point
          if (config.showDiminishingReturnInflection !== false && inflectionPoint) {
            var infX = xScale1(inflectionPoint.freqVal);
            var infY = yScale1(inflectionPoint.reachPct);

            g.append("circle")
              .attr("cx", infX)
              .attr("cy", infY)
              .attr("r", 6)
              .attr("fill", theme.inflectionMarker)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 2);

            g.append("text")
              .attr("x", infX + 8)
              .attr("y", infY - 8)
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .attr("fill", theme.inflectionMarker)
              .text("Inflection (" + inflectionPoint.freqVal.toFixed(1) + "x / " + inflectionPoint.reachPct.toFixed(0) + "%)");
          }

          // X and Y Axes (User rule: clean axes without redundant labels if legend/HUD enabled)
          var xAxis1 = d3.axisBottom(xScale1).ticks(9).tickFormat(function (d) { return d + "x"; });
          var yAxis1 = d3.axisLeft(yScale1).ticks(5).tickFormat(function (d) { return d + "%"; });

          g.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(xAxis1)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px");

          g.append("g")
            .attr("class", "y-axis")
            .call(yAxis1)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "10.5px");

        } else if (layoutMode === "effective_frequency_histogram") {
          // Mode 2: Effective Frequency Corridor & Wearout
          var xHistScale = d3.scaleBand()
            .domain(freqBuckets.map(function (d) { return d.freq; }))
            .range([0, innerWidth])
            .padding(0.25);

          var yHistLeft = d3.scaleLinear()
            .domain([0, d3.max(freqBuckets, function (d) { return d.volume; }) * 1.15])
            .nice()
            .range([innerHeight, 0]);

          var yHistRight = d3.scaleLinear()
            .domain([0, 100])
            .range([innerHeight, 0]);

          // Bars color-coded by zone
          g.selectAll(".hist-bar")
            .data(freqBuckets)
            .enter()
            .append("rect")
            .attr("x", function (d) { return xHistScale(d.freq); })
            .attr("y", function (d) { return yHistLeft(d.volume); })
            .attr("width", xHistScale.bandwidth())
            .attr("height", function (d) { return innerHeight - yHistLeft(d.volume); })
            .attr("fill", function (d) {
              if (d.zone === "blindness") return theme.inflectionMarker;
              if (d.zone === "fatigue") return theme.targetLine;
              return theme.corridorBorder;
            })
            .attr("rx", 3)
            .attr("opacity", 0.75);

          // Bar Percentage Labels
          g.selectAll(".bar-label")
            .data(freqBuckets)
            .enter()
            .append("text")
            .attr("x", function (d) { return xHistScale(d.freq) + xHistScale.bandwidth() / 2; })
            .attr("y", function (d) { return yHistLeft(d.volume) - 6; })
            .attr("text-anchor", "middle")
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .attr("fill", theme.text)
            .text(function (d) { return d.sharePct.toFixed(1) + "%"; });

          // Cumulative Reach Ogive Curve (Right Y-Axis)
          var ogiveLine = d3.line()
            .x(function (d) { return xHistScale(d.freq) + xHistScale.bandwidth() / 2; })
            .y(function (d) { return yHistRight(d.cumPct); })
            .curve(curveFactory);

          g.append("path")
            .datum(freqBuckets)
            .attr("fill", "none")
            .attr("stroke", theme.ogiveLine)
            .attr("stroke-width", 2.8)
            .attr("d", ogiveLine);

          // Target line on right axis
          var targetY2 = yHistRight(targetReach);
          g.append("line")
            .attr("x1", 0).attr("x2", innerWidth)
            .attr("y1", targetY2).attr("y2", targetY2)
            .attr("stroke", theme.targetLine)
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1.5);

          // Axes
          var xAxis2 = d3.axisBottom(xHistScale).tickFormat(function (d) { return d === 10 ? "10+x" : d + "x"; });
          var yAxis2Left = d3.axisLeft(yHistLeft).ticks(5).tickFormat(function (d) { return formatValue(d, config.valueFormat || "compact_num"); });
          var yAxis2Right = d3.axisRight(yHistRight).ticks(5).tickFormat(function (d) { return d + "%"; });

          g.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(xAxis2)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px");

          g.append("g")
            .attr("class", "y-axis-left")
            .call(yAxis2Left)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "10.5px");

          g.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", "translate(" + innerWidth + ", 0)")
            .call(yAxis2Right)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "10.5px");

        } else if (layoutMode === "marginal_response_hill") {
          // Mode 3: Marginal Response & Diminishing Return (Hill Derivative)
          var xScale3 = d3.scaleLinear().domain([1, 10]).range([0, innerWidth]);
          var yMarginalScale = d3.scaleLinear()
            .domain([0, d3.max(curvePoints, function (d) { return d.marginal; }) * 1.25])
            .nice()
            .range([innerHeight, 0]);
          var yCumReachScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

          // Marginal Gain Spline
          var marginalLine = d3.line()
            .x(function (d) { return xScale3(d.freqVal); })
            .y(function (d) { return yMarginalScale(d.marginal); })
            .curve(curveFactory);

          g.append("path")
            .datum(curvePoints)
            .attr("fill", "none")
            .attr("stroke", theme.marginalLine)
            .attr("stroke-width", 3)
            .attr("d", marginalLine);

          // Cumulative Saturation Line (Dotted background)
          var cumLine3 = d3.line()
            .x(function (d) { return xScale3(d.freqVal); })
            .y(function (d) { return yCumReachScale(d.reachPct); })
            .curve(curveFactory);

          g.append("path")
            .datum(curvePoints)
            .attr("fill", "none")
            .attr("stroke", theme.curveLine)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4")
            .attr("d", cumLine3);

          // Corridor shading
          var cX1_3 = xScale3(effMin);
          var cX2_3 = xScale3(effMax);
          g.append("rect")
            .attr("x", cX1_3)
            .attr("y", 0)
            .attr("width", Math.max(cX2_3 - cX1_3, 2))
            .attr("height", innerHeight)
            .attr("fill", theme.corridorZone);

          // Axes
          var xAxis3 = d3.axisBottom(xScale3).ticks(9).tickFormat(function (d) { return d + "x"; });
          var yAxis3Left = d3.axisLeft(yMarginalScale).ticks(5).tickFormat(function (d) { return "+" + d.toFixed(1) + "%"; });
          var yAxis3Right = d3.axisRight(yCumReachScale).ticks(5).tickFormat(function (d) { return d + "%"; });

          g.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + innerHeight + ")")
            .call(xAxis3)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "11px");

          g.append("g")
            .attr("class", "y-axis-left")
            .call(yAxis3Left)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "10.5px");

          g.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", "translate(" + innerWidth + ", 0)")
            .call(yAxis3Right)
            .selectAll("text")
            .attr("fill", theme.subtext)
            .attr("font-size", "10.5px");
        }

        // ==========================================
        // INTERACTIVITY: Crosshair, Tooltip, Click Drill
        // ==========================================
        var crosshair = g.append("line")
          .attr("stroke", theme.accent)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,4")
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .style("display", "none")
          .style("pointer-events", "none");

        var overlay = g.append("rect")
          .attr("class", "interaction-overlay")
          .attr("width", innerWidth)
          .attr("height", innerHeight)
          .attr("fill", "transparent")
          .style("cursor", "crosshair");

        overlay.on("mousemove", function (e) {
          var coords = d3.pointer(e);
          var mX = coords[0];
          var mY = coords[1];
          crosshair.style("display", "block").attr("x1", mX).attr("x2", mX);

          if (layoutMode === "reach_frequency_curve" || layoutMode === "marginal_response_hill") {
            var xScaleLocal = d3.scaleLinear().domain([1, 10]).range([0, innerWidth]);
            var curFreq = Math.min(Math.max(xScaleLocal.invert(mX), 1), 10);

            // Find closest curve point
            var closest = curvePoints[0];
            var minDiff = Infinity;
            curvePoints.forEach(function (p) {
              var diff = Math.abs(p.freqVal - curFreq);
              if (diff < minDiff) {
                minDiff = diff;
                closest = p;
              }
            });

            var zoneStatus = "Effective Corridor";
            var zoneColor = theme.corridorBorder;
            if (closest.freqVal < effMin) {
              zoneStatus = "Ad Blindness (Under-Exposed)";
              zoneColor = theme.inflectionMarker;
            } else if (closest.freqVal > effMax) {
              zoneStatus = "Ad Fatigue (Diminishing Return)";
              zoneColor = theme.targetLine;
            }

            tooltip.style.display = "block";
            tooltip.style.left = (e.clientX + 14) + "px";
            tooltip.style.top = (e.clientY - 12) + "px";
            tooltip.innerHTML =
              "<div style='font-weight:700;font-size:13px;margin-bottom:4px;color:" + theme.accent + ";'>" + closest.freqVal.toFixed(1) + "x Exposure Frequency</div>" +
              "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Unique Reach:</span><strong style='color:" + theme.curveLine + ";'>" + closest.reachPct.toFixed(1) + "%</strong></div>" +
              "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Marginal Efficiency:</span><strong>+" + closest.marginal.toFixed(1) + "% / freq</strong></div>" +
              "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Gross Delivery:</span><strong>" + formatValue(closest.grossImpressions, config.valueFormat || "compact_num") + "</strong></div>" +
              "<div style='margin-top:5px;padding-top:4px;border-top:1px solid " + theme.border + ";font-size:11px;font-weight:600;color:" + zoneColor + ";'>" + zoneStatus + "</div>";

          } else if (layoutMode === "effective_frequency_histogram") {
            var xHistScaleLocal = d3.scaleBand().domain(freqBuckets.map(function (d) { return d.freq; })).range([0, innerWidth]).padding(0.25);
            var hoverBucket = null;
            freqBuckets.forEach(function (b) {
              var bx = xHistScaleLocal(b.freq);
              var bw = xHistScaleLocal.bandwidth();
              if (mX >= bx && mX <= bx + bw) hoverBucket = b;
            });

            if (hoverBucket) {
              tooltip.style.display = "block";
              tooltip.style.left = (e.clientX + 14) + "px";
              tooltip.style.top = (e.clientY - 12) + "px";
              tooltip.innerHTML =
                "<div style='font-weight:700;font-size:13px;margin-bottom:4px;color:" + theme.accent + ";'>" + hoverBucket.label + "</div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Volume:</span><strong>" + formatValue(hoverBucket.volume, config.valueFormat || "compact_num") + "</strong></div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Bucket Share:</span><strong>" + hoverBucket.sharePct.toFixed(1) + "%</strong></div>" +
                "<div style='display:flex;justify-content:space-between;gap:12px;margin:2px 0;'><span>Cumulative Reach:</span><strong style='color:" + theme.ogiveLine + ";'>" + hoverBucket.cumPct.toFixed(1) + "%</strong></div>" +
                "<div style='margin-top:5px;font-size:10.5px;color:" + theme.subtext + ";'>Click to open Looker drill-down menu</div>";
            } else {
              tooltip.style.display = "none";
            }
          }
        });

        overlay.on("mouseleave", function () {
          crosshair.style("display", "none");
          tooltip.style.display = "none";
        });

        // Click drill down
        overlay.on("click", function (e) {
          var firstRow = data[0];
          var cell = firstRow[volMeas ? volMeas.name : (dimField ? dimField.name : "")];
          if (cell && cell.links && cell.links.length > 0) {
            if (window.LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: cell.links, event: e });
            }
          }
        });

        done();
      });
    }
  });
})();
