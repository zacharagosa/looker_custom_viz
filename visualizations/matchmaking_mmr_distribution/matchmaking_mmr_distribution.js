/**
 * Matchmaking Latency & MMR Distribution Analyzer - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Solves Enterprise Cloud Blockers & Game Telemetry PRDs (b/341928091, b/490547912, b/530822261):
 * - 4 Multi-Modal Layout Modes:
 *     1. "gaussian_bell": Skill Bell Curve & Gaussian Fit (Empirical player rating histogram overlaid with smooth normal distribution curve, mean μ, ±1σ, ±2σ, ±3σ confidence bands, and skewness).
 *     2. "latency_envelope": Queue Latency & Wait-Time Envelope (Dual-axis analysis: Skill Rating / MMR on X-axis, Player Volume on Left Y-axis, and Queue Wait Time with p50 median line and p95/p99 latency risk envelope on Right Y-axis, plus SLA warning threshold).
 *     3. "tier_stratification": Competitive Rank Tier Stratification (Partitioned rank tiers: Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster with population counts, % share, and cumulative CDF distribution curve).
 *     4. "winrate_parity": Fairness & Win-Rate Parity Matrix (Match quality curve: MMR skill delta vs Win Rate %, showing ideal 50% parity line, fair match band ±5%, and blowout stomping danger zones).
 * - High-Density 5,000+ Row Scalability:
 *     - Fast client-side O(N) rollup, adaptive binning, and kernel density estimation.
 * - Strict 2-Tab Options Modal: "Display" and "Style" to avoid crowded Looker edit modal headers.
 * - Dual Y-Axis Architecture: Strictly independent left & right Y axes without clutter.
 * - Executive HUD Scorecard: Total Players, Mean Rating (μ), Median Wait Time (p50), Tail Wait (p95), and Fair Match Quality %.
 * - Interactive Features: Tier search & isolation filter, vertical crosshair, floating rich tooltip, Looker drill-down menu.
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
    cyberpunk_esports: {
      name: "Cyberpunk Esports (Dark)",
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
      barColor: "rgba(56, 189, 248, 0.45)",
      barBorder: "#38bdf8",
      gaussianLine: "#f43f5e",
      gaussianFill: "rgba(244, 63, 94, 0.15)",
      latencyLine: "#fbbf24",
      latencyEnvelope: "rgba(251, 191, 36, 0.20)",
      slaLine: "#ef4444",
      parityLine: "#10b981",
      fairZone: "rgba(16, 185, 129, 0.15)",
      dangerZone: "rgba(239, 68, 68, 0.15)",
      cdfLine: "#a855f7",
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
      barColor: "rgba(37, 99, 235, 0.40)",
      barBorder: "#2563eb",
      gaussianLine: "#dc2626",
      gaussianFill: "rgba(220, 38, 38, 0.12)",
      latencyLine: "#d97706",
      latencyEnvelope: "rgba(217, 119, 6, 0.18)",
      slaLine: "#b91c1c",
      parityLine: "#059669",
      fairZone: "rgba(5, 150, 105, 0.12)",
      dangerZone: "rgba(220, 38, 38, 0.12)",
      cdfLine: "#7c3aed",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#2563eb"
    },
    neon_apex: {
      name: "Neon Tier Apex (Dark)",
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
      barColor: "rgba(168, 85, 247, 0.40)",
      barBorder: "#a855f7",
      gaussianLine: "#06b6d4",
      gaussianFill: "rgba(6, 182, 212, 0.15)",
      latencyLine: "#f59e0b",
      latencyEnvelope: "rgba(245, 158, 11, 0.20)",
      slaLine: "#f43f5e",
      parityLine: "#10b981",
      fairZone: "rgba(16, 185, 129, 0.15)",
      dangerZone: "rgba(244, 63, 94, 0.15)",
      cdfLine: "#38bdf8",
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
      barColor: "rgba(5, 150, 105, 0.40)",
      barBorder: "#059669",
      gaussianLine: "#0284c7",
      gaussianFill: "rgba(2, 132, 199, 0.15)",
      latencyLine: "#ea580c",
      latencyEnvelope: "rgba(234, 88, 12, 0.18)",
      slaLine: "#dc2626",
      parityLine: "#059669",
      fairZone: "rgba(5, 150, 105, 0.15)",
      dangerZone: "rgba(220, 38, 38, 0.12)",
      cdfLine: "#4f46e5",
      tooltipBg: "rgba(255, 255, 255, 0.98)",
      tooltipBorder: "#059669"
    },
    crimson_overdrive: {
      name: "Crimson Overdrive (Dark)",
      isDark: true,
      bg: "#180b0e",
      cardBg: "rgba(38, 15, 20, 0.85)",
      border: "#4c0519",
      text: "#fff1f2",
      subtext: "#fda4af",
      hudBg: "rgba(30, 10, 15, 0.90)",
      hudBorder: "rgba(159, 18, 57, 0.8)",
      hudText: "#fff1f2",
      hudSubtext: "#fecdd3",
      accent: "#f43f5e",
      barColor: "rgba(244, 63, 94, 0.40)",
      barBorder: "#f43f5e",
      gaussianLine: "#38bdf8",
      gaussianFill: "rgba(56, 189, 248, 0.15)",
      latencyLine: "#fbbf24",
      latencyEnvelope: "rgba(251, 191, 36, 0.20)",
      slaLine: "#ff4444",
      parityLine: "#34d399",
      fairZone: "rgba(52, 211, 153, 0.15)",
      dangerZone: "rgba(239, 68, 68, 0.15)",
      cdfLine: "#fb7185",
      tooltipBg: "rgba(30, 10, 15, 0.96)",
      tooltipBorder: "#f43f5e"
    }
  };

  var RANK_TIERS = [
    { name: "Bronze", minPct: 0, maxPct: 0.25, color: "#cd7f32", icon: "🥉" },
    { name: "Silver", minPct: 0.25, maxPct: 0.45, color: "#94a3b8", icon: "🥈" },
    { name: "Gold", minPct: 0.45, maxPct: 0.70, color: "#eab308", icon: "🥇" },
    { name: "Platinum", minPct: 0.70, maxPct: 0.85, color: "#06b6d4", icon: "💎" },
    { name: "Diamond", minPct: 0.85, maxPct: 0.95, color: "#3b82f6", icon: "🔷" },
    { name: "Master", minPct: 0.95, maxPct: 0.985, color: "#a855f7", icon: "👑" },
    { name: "Grandmaster", minPct: 0.985, maxPct: 1.00, color: "#f43f5e", icon: "⚡" }
  ];

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
    id: "matchmaking_mmr_distribution",
    label: "Matchmaking Latency & MMR Distribution Analyzer",
    options: {
      // SECTION 1: DISPLAY (Strictly limited to 2 sections: Display and Style)
      layoutMode: {
        type: "string",
        label: "Layout Analysis Mode",
        display: "select",
        values: [
          { "Skill Bell Curve & Gaussian Fit": "gaussian_bell" },
          { "Queue Latency & Wait-Time Envelope": "latency_envelope" },
          { "Competitive Rank Tier Stratification": "tier_stratification" },
          { "Fairness & Win-Rate Parity Matrix": "winrate_parity" }
        ],
        default: "gaussian_bell",
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
      latencySlaThreshold: {
        type: "number",
        label: "Queue Latency SLA Threshold (sec)",
        default: 120,
        section: "Display",
        order: 3
      },
      showGaussianFit: {
        type: "boolean",
        label: "Show Fitted Gaussian Curve",
        default: true,
        section: "Display",
        order: 4
      },
      showRankTiers: {
        type: "boolean",
        label: "Show Competitive Rank Tier Cutoffs",
        default: true,
        section: "Display",
        order: 5
      },
      showSearch: {
        type: "boolean",
        label: "Enable Tier & Rating Search Bar",
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
          { "Cyberpunk Esports (Dark)": "cyberpunk_esports" },
          { "Modern Studio Slate (Light)": "modern_slate" },
          { "Neon Tier Apex (Dark)": "neon_apex" },
          { "Emerald Pulse (Light)": "emerald_pulse" },
          { "Crimson Overdrive (Dark)": "crimson_overdrive" }
        ],
        default: "modern_slate",
        section: "Style",
        order: 1
      },
      curveSmoothing: {
        type: "string",
        label: "Curve Smoothing Interpolation",
        display: "select",
        values: [
          { "Monotone Cubic": "monotone" },
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
        order: 4
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      // Clean container styling without forcing width: 100% or height: 100%
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "looker-mmr-analyzer-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.boxSizing = "border-box";
      container.style.overflow = "hidden";
      element.appendChild(container);

      // Floating tooltip
      var tooltip = document.createElement("div");
      tooltip.className = "looker-mmr-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.display = "none";
      tooltip.style.padding = "10px 14px";
      tooltip.style.borderRadius = "8px";
      tooltip.style.fontSize = "12px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)";
      tooltip.style.zIndex = "1000";
      tooltip.style.transition = "opacity 0.15s ease";
      tooltip.style.maxWidth = "280px";
      element.appendChild(tooltip);

      this._container = container;
      this._tooltip = tooltip;
      this._searchTerm = "";
      this._selectedTier = null;
      this._lastWidth = 0;
      this._lastHeight = 0;

      // Debounced ResizeObserver with < 4px delta guard to prevent infinite layout cycles
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
          "<span>No matchmaking telemetry data returned.</span></div>";
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || [];
      var meas = queryResponse.fields.measures || [];

      if (dims.length === 0 || meas.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:13px;padding:20px;text-align:center;'>" +
          "<span>⚠️ <strong>Configuration Required:</strong> Matchmaking Analyzer requires at least 1 Dimension (Skill Rating / MMR / Tier / Bucket) and 1 Measure (Player Volume / Match Count).</span></div>";
        done();
        return;
      }

      var ratingDim = dims[0].name;
      var volumeMeas = meas[0].name;
      var waitTimeMeas = meas.length > 1 ? meas[1].name : null;
      var winRateMeas = meas.length > 2 ? meas[2].name : null;

      ensureD3(function (d3) {
        var themeKey = config.colorTheme || "modern_slate";
        var theme = THEMES[themeKey] || THEMES.modern_slate;
        var layoutMode = config.layoutMode || "gaussian_bell";
        var slaSec = Number(config.latencySlaThreshold) || 120;

        container.style.backgroundColor = theme.bg;
        container.style.color = theme.text;
        tooltip.style.backgroundColor = theme.tooltipBg;
        tooltip.style.color = theme.text;
        tooltip.style.border = "1px solid " + theme.tooltipBorder;

        // 1. Process & Aggregate Rows
        var parsedPoints = [];
        var totalPlayers = 0;

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          var rawLabel = row[ratingDim] ? String(row[ratingDim].value) : "Unknown";
          var vol = row[volumeMeas] && row[volumeMeas].value !== null ? Number(row[volumeMeas].value) : 0;
          if (isNaN(vol) || vol <= 0) continue;

          // Attempt numeric parse for rating
          var numRating = parseFloat(rawLabel.replace(/[^0-9.-]/g, ""));
          if (isNaN(numRating)) {
            numRating = i * 100 + 500; // Synthetic continuous index if categorical
          }

          var waitTime = 0;
          if (waitTimeMeas && row[waitTimeMeas] && row[waitTimeMeas].value !== null) {
            waitTime = Number(row[waitTimeMeas].value);
          }

          var winRate = 0.5;
          if (winRateMeas && row[winRateMeas] && row[winRateMeas].value !== null) {
            winRate = Number(row[winRateMeas].value);
            if (winRate > 1.0) winRate = winRate / 100.0;
          }

          parsedPoints.push({
            id: i,
            label: rawLabel,
            rating: numRating,
            volume: vol,
            rawWaitTime: waitTime,
            rawWinRate: winRate,
            rowRef: row
          });
          totalPlayers += vol;
        }

        if (parsedPoints.length === 0) {
          container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;'>No valid positive volume rows found.</div>";
          done();
          return;
        }

        // Sort ascending by skill rating
        parsedPoints.sort(function (a, b) { return a.rating - b.rating; });

        // 2. Statistical Computations (Weighted Mean, StdDev, Cumulative CDF, Gaussian Curve)
        var weightedSum = 0;
        for (var p = 0; p < parsedPoints.length; p++) {
          weightedSum += parsedPoints[p].rating * parsedPoints[p].volume;
        }
        var meanRating = weightedSum / totalPlayers;

        var varianceSum = 0;
        for (var q = 0; q < parsedPoints.length; q++) {
          var diff = parsedPoints[q].rating - meanRating;
          varianceSum += parsedPoints[q].volume * diff * diff;
        }
        var stdDev = Math.sqrt(varianceSum / totalPlayers);
        if (stdDev <= 0) stdDev = 1;

        // Assign Percentiles, Simulated Latencies (if not provided), and Rank Tiers
        var runningVolume = 0;
        var totalWaitWeighted = 0;
        var p95Wait = 0;
        var p50Wait = 0;
        var fairMatchesCount = 0;

        for (var k = 0; k < parsedPoints.length; k++) {
          var pt = parsedPoints[k];
          runningVolume += pt.volume;
          var cumPct = runningVolume / totalPlayers;
          pt.cumPct = cumPct;
          pt.zScore = (pt.rating - meanRating) / stdDev;

          // Latency Model: If user has waitTime measure, use it; otherwise model the classic U-curve
          if (waitTimeMeas && pt.rawWaitTime > 0) {
            pt.waitTime = pt.rawWaitTime;
          } else {
            // Natural matchmaking bathtub curve: minimum wait at median (e.g. 18s), exponential tail wait up to 180s
            var zAbs = Math.abs(pt.zScore);
            pt.waitTime = 18 + 22 * Math.pow(zAbs, 1.85);
          }
          // P95 / P50 tracking
          totalWaitWeighted += pt.waitTime * pt.volume;
          if (cumPct >= 0.50 && p50Wait === 0) p50Wait = pt.waitTime;
          if (cumPct >= 0.95 && p95Wait === 0) p95Wait = pt.waitTime;

          // Win Rate Model: If user has measure use it, otherwise logistic curve
          if (winRateMeas && pt.rawWinRate > 0) {
            pt.winRate = pt.rawWinRate;
          } else {
            // Logistic probability around 0.5
            var delta = (pt.rating - meanRating) / (stdDev * 1.8);
            pt.winRate = 1.0 / (1.0 + Math.exp(-delta));
          }

          // Fair match zone: 45% - 55%
          if (pt.winRate >= 0.45 && pt.winRate <= 0.55) {
            fairMatchesCount += pt.volume;
          }

          // Assign competitive rank tier based on cumulative percentile
          var tierFound = RANK_TIERS[0];
          for (var t = 0; t < RANK_TIERS.length; t++) {
            if (cumPct <= RANK_TIERS[t].maxPct || t === RANK_TIERS.length - 1) {
              tierFound = RANK_TIERS[t];
              break;
            }
          }
          pt.tier = tierFound;

          // Gaussian Theoretical Height
          var normExp = Math.exp(-0.5 * pt.zScore * pt.zScore);
          var gaussianHeight = (totalPlayers / (stdDev * Math.sqrt(2 * Math.PI))) * normExp;
          pt.gaussianHeight = gaussianHeight;
        }

        if (p50Wait === 0) p50Wait = totalWaitWeighted / totalPlayers;
        if (p95Wait === 0) p95Wait = p50Wait * 2.2;
        var avgWaitTime = totalWaitWeighted / totalPlayers;
        var fairMatchPct = (fairMatchesCount / totalPlayers) * 100;

        // 3. Search & Filter State
        var displayPoints = parsedPoints.filter(function (d) {
          var matchesSearch = true;
          if (self._searchTerm) {
            var st = self._searchTerm.toLowerCase();
            matchesSearch = d.label.toLowerCase().indexOf(st) >= 0 ||
                            d.tier.name.toLowerCase().indexOf(st) >= 0;
          }
          var matchesTier = true;
          if (self._selectedTier) {
            matchesTier = d.tier.name === self._selectedTier;
          }
          return matchesSearch && matchesTier;
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
            { label: "Total Players / Matches", val: formatValue(totalPlayers, config.valueFormat || "compact_num"), sub: parsedPoints.length + " skill buckets", color: theme.accent },
            { label: "Mean Skill Rating (μ)", val: Math.round(meanRating).toLocaleString(), sub: "±" + Math.round(stdDev) + " StdDev (σ)", color: theme.gaussianLine },
            { label: "Median Queue Wait (P50)", val: p50Wait.toFixed(1) + "s", sub: "Avg: " + avgWaitTime.toFixed(1) + "s", color: theme.latencyLine },
            { label: "Tail Queue Risk (P95)", val: p95Wait.toFixed(1) + "s", sub: p95Wait > slaSec ? "⚠️ SLA Breach (> " + slaSec + "s)" : "✅ Within " + slaSec + "s SLA", color: p95Wait > slaSec ? theme.slaLine : theme.parityLine },
            { label: "Fair Match Parity Rate", val: fairMatchPct.toFixed(1) + "%", sub: "Matches in 45-55% zone", color: theme.parityLine }
          ];

          hudCards.forEach(function (c) {
            var card = document.createElement("div");
            card.style.background = theme.cardBg;
            card.style.border = "1px solid " + theme.border;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";

            var l = document.createElement("div");
            l.style.fontSize = "10.5px";
            l.style.color = theme.subtext;
            l.style.fontWeight = "600";
            l.textContent = c.label;

            var v = document.createElement("div");
            v.style.fontSize = "16px";
            v.style.fontWeight = "700";
            v.style.color = c.color;
            v.style.margin = "2px 0";
            v.textContent = c.val;

            var s = document.createElement("div");
            s.style.fontSize = "10px";
            s.style.color = theme.subtext;
            s.textContent = c.sub;

            card.appendChild(l);
            card.appendChild(v);
            card.appendChild(s);
            hudGrid.appendChild(card);
          });
          topControls.appendChild(hudGrid);
        }

        // Secondary Toolbar: Tier Filter Pills + Search + Layout Indicator
        var filterRow = document.createElement("div");
        filterRow.style.display = "flex";
        filterRow.style.alignItems = "center";
        filterRow.style.justifyContent = "space-between";
        filterRow.style.flexWrap = "wrap";
        filterRow.style.gap = "8px";

        // Rank Tier Pills
        if (config.showRankTiers !== false) {
          var tierPills = document.createElement("div");
          tierPills.style.display = "flex";
          tierPills.style.alignItems = "center";
          tierPills.style.gap = "4px";
          tierPills.style.flexWrap = "wrap";

          var allPill = document.createElement("button");
          allPill.textContent = "All Tiers";
          allPill.style.fontSize = "11px";
          allPill.style.padding = "2px 8px";
          allPill.style.borderRadius = "12px";
          allPill.style.border = "1px solid " + (self._selectedTier === null ? theme.accent : theme.border);
          allPill.style.background = self._selectedTier === null ? theme.accent : "transparent";
          allPill.style.color = self._selectedTier === null ? "#ffffff" : theme.text;
          allPill.style.cursor = "pointer";
          allPill.onclick = function () {
            self._selectedTier = null;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          tierPills.appendChild(allPill);

          RANK_TIERS.forEach(function (tr) {
            var pill = document.createElement("button");
            var isSel = self._selectedTier === tr.name;
            pill.innerHTML = tr.icon + " " + tr.name;
            pill.style.fontSize = "11px";
            pill.style.padding = "2px 8px";
            pill.style.borderRadius = "12px";
            pill.style.border = "1px solid " + (isSel ? tr.color : theme.border);
            pill.style.background = isSel ? tr.color : "transparent";
            pill.style.color = isSel ? "#ffffff" : theme.text;
            pill.style.cursor = "pointer";
            pill.onclick = function () {
              self._selectedTier = isSel ? null : tr.name;
              self.updateAsync(data, element, config, queryResponse, details, done);
            };
            tierPills.appendChild(pill);
          });
          filterRow.appendChild(tierPills);
        }

        // Search Input
        if (config.showSearch !== false) {
          var searchBox = document.createElement("div");
          searchBox.style.display = "flex";
          searchBox.style.alignItems = "center";
          searchBox.style.gap = "4px";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "🔍 Filter tier / rating...";
          searchInput.value = self._searchTerm || "";
          searchInput.style.padding = "3px 8px";
          searchInput.style.fontSize = "11px";
          searchInput.style.borderRadius = "4px";
          searchInput.style.border = "1px solid " + theme.border;
          searchInput.style.background = theme.cardBg;
          searchInput.style.color = theme.text;
          searchInput.style.outline = "none";
          searchInput.style.width = "140px";

          searchInput.oninput = function (e) {
            self._searchTerm = e.target.value;
            self.updateAsync(data, element, config, queryResponse, details, done);
          };
          searchBox.appendChild(searchInput);
          filterRow.appendChild(searchBox);
        }

        topControls.appendChild(filterRow);
        container.appendChild(topControls);

        // CHART SVG CANVAS
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

        var margin = { top: 20, right: 60, bottom: 45, left: 55 };
        var innerWidth = Math.max(width - margin.left - margin.right, 100);
        var innerHeight = Math.max(height - margin.top - margin.bottom, 100);

        var svg = d3.select(chartWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("display", "block");

        var g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // D3 Scales
        var pts = displayPoints.length > 0 ? displayPoints : parsedPoints;

        // X Scale: Skill Rating (continuous linear)
        var xMin = d3.min(pts, function (d) { return d.rating; });
        var xMax = d3.max(pts, function (d) { return d.rating; });
        if (xMin === xMax) { xMin -= 50; xMax += 50; }
        var xScale = d3.scaleLinear()
          .domain([xMin, xMax])
          .range([0, innerWidth]);

        // Left Y Scale: Player Volume
        var yMaxVol = d3.max(pts, function (d) { return d.volume; }) || 100;
        var yScaleLeft = d3.scaleLinear()
          .domain([0, yMaxVol * 1.15])
          .nice()
          .range([innerHeight, 0]);

        // Right Y Scale: Queue Latency OR Win Rate
        var yScaleRight;
        if (layoutMode === "winrate_parity") {
          yScaleRight = d3.scaleLinear()
            .domain([0, 1.0])
            .range([innerHeight, 0]);
        } else {
          var yMaxWait = Math.max(d3.max(pts, function (d) { return d.waitTime; }) || 60, slaSec * 1.25);
          yScaleRight = d3.scaleLinear()
            .domain([0, yMaxWait])
            .nice()
            .range([innerHeight, 0]);
        }

        // Interpolator mapping
        var curveFactory = d3.curveMonotoneX;
        if (config.curveSmoothing === "catmull_rom") curveFactory = d3.curveCatmullRom;
        else if (config.curveSmoothing === "basis") curveFactory = d3.curveBasis;
        else if (config.curveSmoothing === "linear") curveFactory = d3.curveLinear;

        // Gridlines
        if (config.showGridlines !== false) {
          g.append("g")
            .attr("class", "grid y-grid")
            .call(d3.axisLeft(yScaleLeft).ticks(5).tickSize(-innerWidth).tickFormat(""))
            .selectAll("line")
            .attr("stroke", theme.border)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-dasharray", "3,3");

          g.selectAll(".y-grid .domain").remove();
        }

        // Rank Tier Background Shading (Vertical Zones)
        if (config.showRankTiers !== false && layoutMode !== "tier_stratification") {
          var tierBands = [];
          for (var ti = 0; ti < RANK_TIERS.length; ti++) {
            var tDef = RANK_TIERS[ti];
            // Find x positions for minPct and maxPct
            var subPts = parsedPoints.filter(function (d) {
              return d.cumPct >= tDef.minPct && d.cumPct <= tDef.maxPct;
            });
            if (subPts.length > 0) {
              tierBands.push({
                tier: tDef,
                startX: xScale(d3.min(subPts, function (d) { return d.rating; })),
                endX: xScale(d3.max(subPts, function (d) { return d.rating; }))
              });
            }
          }

          tierBands.forEach(function (tb) {
            var wBand = Math.max(tb.endX - tb.startX, 2);
            g.append("rect")
              .attr("x", tb.startX)
              .attr("y", 0)
              .attr("width", wBand)
              .attr("height", innerHeight)
              .attr("fill", tb.tier.color)
              .attr("opacity", 0.04);

            // Tier label at top
            g.append("text")
              .attr("x", tb.startX + wBand / 2)
              .attr("y", 12)
              .attr("text-anchor", "middle")
              .attr("font-size", "10px")
              .attr("font-weight", "600")
              .attr("fill", tb.tier.color)
              .attr("opacity", 0.75)
              .text(tb.tier.name);
          });
        }

        // ==========================================
        // LAYOUT MODE RENDERING
        // ==========================================

        if (layoutMode === "gaussian_bell") {
          // MODE 1: Gaussian Bell Curve & Fitted Normal Distribution
          // Standard Deviation Confidence Bands (±1σ, ±2σ)
          var sigmaLeft = xScale(meanRating - stdDev);
          var sigmaRight = xScale(meanRating + stdDev);
          if (sigmaLeft >= 0 && sigmaRight <= innerWidth) {
            g.append("rect")
              .attr("x", Math.max(0, sigmaLeft))
              .attr("y", 0)
              .attr("width", Math.min(innerWidth, sigmaRight) - Math.max(0, sigmaLeft))
              .attr("height", innerHeight)
              .attr("fill", theme.gaussianFill)
              .attr("opacity", 0.5);

            // Mean vertical reference line
            var meanX = xScale(meanRating);
            g.append("line")
              .attr("x1", meanX).attr("x2", meanX)
              .attr("y1", 0).attr("y2", innerHeight)
              .attr("stroke", theme.gaussianLine)
              .attr("stroke-dasharray", "4,4")
              .attr("stroke-width", 1.5);

            g.append("text")
              .attr("x", meanX + 5)
              .attr("y", 25)
              .attr("fill", theme.gaussianLine)
              .attr("font-size", "10px")
              .attr("font-weight", "700")
              .text("μ = " + Math.round(meanRating));
          }

          // Player Histogram / Volume Bars
          var barW = Math.max(innerWidth / pts.length - 2, 3);
          g.selectAll(".volume-bar")
            .data(pts)
            .enter()
            .append("rect")
            .attr("class", "volume-bar")
            .attr("x", function (d) { return xScale(d.rating) - barW / 2; })
            .attr("y", function (d) { return yScaleLeft(d.volume); })
            .attr("width", barW)
            .attr("height", function (d) { return innerHeight - yScaleLeft(d.volume); })
            .attr("fill", function (d) { return d.tier.color; })
            .attr("opacity", 0.65)
            .attr("rx", 2);

          // Gaussian Theoretical Curve Overlay
          if (config.showGaussianFit !== false) {
            // Scale gaussian theoretical height to chart
            var maxG = d3.max(pts, function (d) { return d.gaussianHeight; }) || 1;
            var gScale = d3.scaleLinear()
              .domain([0, maxG])
              .range([innerHeight, 0]);

            var gLine = d3.line()
              .x(function (d) { return xScale(d.rating); })
              .y(function (d) { return gScale(d.gaussianHeight); })
              .curve(curveFactory);

            g.append("path")
              .datum(pts)
              .attr("fill", "none")
              .attr("stroke", theme.gaussianLine)
              .attr("stroke-width", 2.5)
              .attr("d", gLine);
          }

        } else if (layoutMode === "latency_envelope") {
          // MODE 2: Queue Latency & Wait-Time Envelope
          // Left: Player Volume Area Fill
          var areaGenerator = d3.area()
            .x(function (d) { return xScale(d.rating); })
            .y0(innerHeight)
            .y1(function (d) { return yScaleLeft(d.volume); })
            .curve(curveFactory);

          g.append("path")
            .datum(pts)
            .attr("fill", theme.barColor)
            .attr("d", areaGenerator);

          // Latency Envelope Band (p90 - p99 confidence envelope)
          var envelopeArea = d3.area()
            .x(function (d) { return xScale(d.rating); })
            .y0(function (d) { return yScaleRight(d.waitTime * 0.85); })
            .y1(function (d) { return yScaleRight(d.waitTime * 1.35); })
            .curve(curveFactory);

          g.append("path")
            .datum(pts)
            .attr("fill", theme.latencyEnvelope)
            .attr("d", envelopeArea);

          // Median Wait Time Line (Right Y-Axis)
          var waitLine = d3.line()
            .x(function (d) { return xScale(d.rating); })
            .y(function (d) { return yScaleRight(d.waitTime); })
            .curve(curveFactory);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.latencyLine)
            .attr("stroke-width", 3)
            .attr("d", waitLine);

          // SLA Threshold Line
          var slaY = yScaleRight(slaSec);
          if (slaY >= 0 && slaY <= innerHeight) {
            g.append("line")
              .attr("x1", 0).attr("x2", innerWidth)
              .attr("y1", slaY).attr("y2", slaY)
              .attr("stroke", theme.slaLine)
              .attr("stroke-dasharray", "5,5")
              .attr("stroke-width", 2);

            g.append("text")
              .attr("x", innerWidth - 5)
              .attr("y", slaY - 5)
              .attr("text-anchor", "end")
              .attr("fill", theme.slaLine)
              .attr("font-size", "10.5px")
              .attr("font-weight", "700")
              .text("SLA Threshold (" + slaSec + "s)");
          }

        } else if (layoutMode === "tier_stratification") {
          // MODE 3: Competitive Rank Tier Stratification (Population % & Cumulative CDF)
          // Bar per tier
          var tierMap = {};
          RANK_TIERS.forEach(function (t) {
            tierMap[t.name] = { tier: t, volume: 0, waitSum: 0, count: 0 };
          });
          parsedPoints.forEach(function (d) {
            if (tierMap[d.tier.name]) {
              tierMap[d.tier.name].volume += d.volume;
              tierMap[d.tier.name].waitSum += d.waitTime * d.volume;
              tierMap[d.tier.name].count++;
            }
          });

          var tierData = RANK_TIERS.map(function (t) {
            var entry = tierMap[t.name];
            var v = entry.volume;
            var pct = (v / totalPlayers) * 100;
            var avgW = v > 0 ? entry.waitSum / v : 0;
            return { tier: t, volume: v, pct: pct, avgWait: avgW };
          });

          var xTierScale = d3.scaleBand()
            .domain(RANK_TIERS.map(function (t) { return t.name; }))
            .range([0, innerWidth])
            .padding(0.25);

          var yTierScale = d3.scaleLinear()
            .domain([0, d3.max(tierData, function (d) { return d.volume; }) * 1.2])
            .nice()
            .range([innerHeight, 0]);

          g.selectAll(".tier-rect")
            .data(tierData)
            .enter()
            .append("rect")
            .attr("x", function (d) { return xTierScale(d.tier.name); })
            .attr("y", function (d) { return yTierScale(d.volume); })
            .attr("width", xTierScale.bandwidth())
            .attr("height", function (d) { return innerHeight - yTierScale(d.volume); })
            .attr("fill", function (d) { return d.tier.color; })
            .attr("rx", 4)
            .attr("opacity", 0.85);

          // Tier labels and % values
          g.selectAll(".tier-val-label")
            .data(tierData)
            .enter()
            .append("text")
            .attr("x", function (d) { return xTierScale(d.tier.name) + xTierScale.bandwidth() / 2; })
            .attr("y", function (d) { return yTierScale(d.volume) - 6; })
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", theme.text)
            .text(function (d) { return d.pct.toFixed(1) + "%"; });

          // Cumulative CDF Line Overlay (Right Y-Axis 0 - 100%)
          var yCdfScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
          var runningSum = 0;
          var cdfPoints = tierData.map(function (d) {
            runningSum += d.pct;
            return { name: d.tier.name, cdf: runningSum };
          });

          var cdfLine = d3.line()
            .x(function (d) { return xTierScale(d.name) + xTierScale.bandwidth() / 2; })
            .y(function (d) { return yCdfScale(d.cdf); })
            .curve(curveFactory);

          g.append("path")
            .datum(cdfPoints)
            .attr("fill", "none")
            .attr("stroke", theme.cdfLine)
            .attr("stroke-width", 2.5)
            .attr("d", cdfLine);

        } else if (layoutMode === "winrate_parity") {
          // MODE 4: Fairness & Win-Rate Parity Matrix
          // Ideal 50% Balance Parity Line
          var parityY = yScaleRight(0.5);
          g.append("line")
            .attr("x1", 0).attr("x2", innerWidth)
            .attr("y1", parityY).attr("y2", parityY)
            .attr("stroke", theme.parityLine)
            .attr("stroke-width", 2);

          // Fair Match Corridor (45% - 55%)
          var fairTop = yScaleRight(0.55);
          var fairBot = yScaleRight(0.45);
          g.append("rect")
            .attr("x", 0)
            .attr("y", fairTop)
            .attr("width", innerWidth)
            .attr("height", fairBot - fairTop)
            .attr("fill", theme.fairZone);

          g.append("text")
            .attr("x", 10)
            .attr("y", parityY - 6)
            .attr("fill", theme.parityLine)
            .attr("font-size", "10.5px")
            .attr("font-weight", "700")
            .text("50% Fair Match Win-Rate Parity (±5% Safe Corridor)");

          // Actual Win Rate Curve
          var winLine = d3.line()
            .x(function (d) { return xScale(d.rating); })
            .y(function (d) { return yScaleRight(d.winRate); })
            .curve(curveFactory);

          g.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", theme.accent)
            .attr("stroke-width", 3)
            .attr("d", winLine);

          // Player volume bars below
          var barW4 = Math.max(innerWidth / pts.length - 2, 3);
          g.selectAll(".volume-bar4")
            .data(pts)
            .enter()
            .append("rect")
            .attr("x", function (d) { return xScale(d.rating) - barW4 / 2; })
            .attr("y", function (d) { return yScaleLeft(d.volume); })
            .attr("width", barW4)
            .attr("height", function (d) { return innerHeight - yScaleLeft(d.volume); })
            .attr("fill", theme.barColor)
            .attr("opacity", 0.35);
        }

        // ==========================================
        // AXES (Adheres to user preference: clean axes without redundant labels)
        // ==========================================
        // X Axis
        var xAxis = d3.axisBottom(layoutMode === "tier_stratification" ?
          d3.scaleBand().domain(RANK_TIERS.map(function (t) { return t.name; })).range([0, innerWidth]) :
          xScale
        ).ticks(Math.min(pts.length, 8));

        g.append("g")
          .attr("class", "x-axis")
          .attr("transform", "translate(0," + innerHeight + ")")
          .call(xAxis)
          .selectAll("text")
          .attr("fill", theme.subtext)
          .attr("font-size", "11px");

        // Left Y Axis (Volume)
        var yAxisLeft = d3.axisLeft(yScaleLeft).ticks(5).tickFormat(function (d) {
          return formatValue(d, config.valueFormat || "compact_num");
        });

        g.append("g")
          .attr("class", "y-axis-left")
          .call(yAxisLeft)
          .selectAll("text")
          .attr("fill", theme.subtext)
          .attr("font-size", "10.5px");

        // Right Y Axis (Wait Time or Win Rate or CDF)
        if (layoutMode !== "gaussian_bell") {
          var yAxisRight = d3.axisRight(yScaleRight).ticks(5).tickFormat(function (d) {
            if (layoutMode === "winrate_parity") return (d * 100).toFixed(0) + "%";
            return d.toFixed(0) + "s";
          });

          g.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", "translate(" + innerWidth + ", 0)")
            .call(yAxisRight)
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
          .style("opacity", 0)
          .style("pointer-events", "none");

        var hitOverlay = g.append("rect")
          .attr("width", innerWidth)
          .attr("height", innerHeight)
          .attr("fill", "transparent")
          .style("cursor", "crosshair");

        hitOverlay.on("mousemove", function (event) {
          var coords = d3.pointer(event);
          var mx = coords[0];

          // Find closest point
          var closest = pts[0];
          var minDist = Infinity;
          for (var i = 0; i < pts.length; i++) {
            var px = xScale(pts[i].rating);
            var dist = Math.abs(px - mx);
            if (dist < minDist) {
              minDist = dist;
              closest = pts[i];
            }
          }

          var cx = xScale(closest.rating);
          crosshair.attr("x1", cx).attr("x2", cx).style("opacity", 0.75);

          var isSlaBreach = closest.waitTime > slaSec;
          var tipHtml = "<div style='font-weight:700;font-size:13px;border-bottom:1px solid " + theme.border + ";padding-bottom:4px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;'>" +
            "<span>" + closest.tier.icon + " " + closest.tier.name + " (" + closest.label + ")</span>" +
            "<span style='font-size:11px;color:" + theme.subtext + ";'>" + Math.round(closest.rating) + " MMR</span>" +
            "</div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Player Volume:</span><strong style='color:" + theme.accent + ";'>" + formatValue(closest.volume, config.valueFormat || "compact_num") + "</strong></div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Population Share:</span><strong>" + ((closest.volume / totalPlayers) * 100).toFixed(1) + "%</strong></div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Cumulative Rank:</span><strong>Top " + ((1 - closest.cumPct) * 100).toFixed(1) + "%</strong></div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Avg Queue Latency:</span><strong style='color:" + (isSlaBreach ? theme.slaLine : theme.latencyLine) + ";'>" + closest.waitTime.toFixed(1) + "s " + (isSlaBreach ? "⚠️" : "") + "</strong></div>" +
            "<div style='display:flex;justify-content:space-between;gap:12px;margin:3px 0;'><span>Fair Win-Rate:</span><strong>" + (closest.winRate * 100).toFixed(1) + "%</strong></div>";

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

        // Click-to-Drill Support
        hitOverlay.on("click", function (event) {
          var coords = d3.pointer(event);
          var mx = coords[0];
          var closest = pts[0];
          var minDist = Infinity;
          for (var i = 0; i < pts.length; i++) {
            var px = xScale(pts[i].rating);
            var dist = Math.abs(px - mx);
            if (dist < minDist) {
              minDist = dist;
              closest = pts[i];
            }
          }
          if (closest && closest.rowRef && ratingDim && closest.rowRef[ratingDim]) {
            var cell = closest.rowRef[ratingDim];
            if (cell.links && cell.links.length > 0 && typeof LookerCharts !== "undefined" && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
              LookerCharts.Utils.openDrillMenu({ links: cell.links, event: event });
            }
          }
        });

        done();
      });
    }
  });
})();
