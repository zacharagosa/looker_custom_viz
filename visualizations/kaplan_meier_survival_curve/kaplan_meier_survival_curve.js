/**
 * Kaplan-Meier Survival & Hazard Curve - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by:
 * - Looker Cloud Blocker b/312984102: "Kaplan-Meier Survival Analysis & Attrition Curve in Looker"
 * - Looker Cloud Blocker b/289410591: "Time-to-Event and Attrition Survival Curves with Risk Tables"
 * - Internal YAQS: "Survival Analysis & Customer Attrition with Censoring in Looker"
 *
 * Multi-Modal Functional Capabilities:
 * 1. "survival": Non-parametric Kaplan-Meier step-down probability curve S(t) from 100% to 0% with right-censored markers.
 * 2. "inverted_churn": Cumulative event incidence (1 - S(t)), stepping from 0% to 100% (MTTR resolution / churn attrition).
 * 3. "cumulative_hazard": Nelson-Aalen cumulative hazard curve H(t) = -ln(S(t)) tracking accumulated event intensity.
 * 4. "hazard_rate": Kernel-smoothed instantaneous hazard rate lambda(t) over adaptive time intervals.
 *
 * Configuration Options: Strictly 2 clean tabs (Display and Style).
 */

(function () {
  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.select === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector("script[src*='d3.v7']");
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

  var PALETTES = {
    cyberpunk_dark: {
      name: "Cyberpunk Dark (NOC / SecOps)",
      colors: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#4ade80", "#fbbf24", "#fb7185", "#2dd4bf"],
      bg: "#0b1120",
      text: "#f8fafc",
      subtext: "#94a3b8",
      grid: "#1e293b",
      gridText: "#64748b",
      cardBg: "#111827",
      cardBorder: "#1e293b",
      hudBg: "rgba(17, 24, 39, 0.96)",
      posBadge: "#4ade80",
      negBadge: "#fb7185",
      medianLine: "#fbbf24",
      targetLine: "#f43f5e",
      dark: true
    },
    google_enterprise: {
      name: "Google Enterprise",
      colors: ["#4285F4", "#34A853", "#FBBC04", "#EA4335", "#9C27B0", "#00ACC1", "#FF7043", "#1A73E8"],
      bg: "#ffffff",
      text: "#202124",
      subtext: "#5f6368",
      grid: "#e8eaed",
      gridText: "#80868b",
      cardBg: "#f8f9fa",
      cardBorder: "#dadce0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#137333",
      negBadge: "#c5221f",
      medianLine: "#fbbc04",
      targetLine: "#ea4335",
      dark: false
    },
    modern_slate: {
      name: "Modern Slate",
      colors: ["#2563eb", "#0284c7", "#0d9488", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#6366f1"],
      bg: "#ffffff",
      text: "#0f172a",
      subtext: "#64748b",
      grid: "#f1f5f9",
      gridText: "#94a3b8",
      cardBg: "#f8fafc",
      cardBorder: "#e2e8f0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#b91c1c",
      medianLine: "#f59e0b",
      targetLine: "#2563eb",
      dark: false
    },
    emerald_finops: {
      name: "Emerald FinOps",
      colors: ["#059669", "#10b981", "#047857", "#0d9488", "#14b8a6", "#0f766e", "#34d399", "#6ee7b7"],
      bg: "#ffffff",
      text: "#064e3b",
      subtext: "#047857",
      grid: "#d1fae5",
      gridText: "#6ee7b7",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#047857",
      negBadge: "#dc2626",
      medianLine: "#0d9488",
      targetLine: "#059669",
      dark: false
    },
    sunset_media: {
      name: "Sunset Media & Coral",
      colors: ["#f97316", "#ef4444", "#e11d48", "#be123c", "#fb923c", "#f59e0b", "#d97706", "#b45309"],
      bg: "#ffffff",
      text: "#431407",
      subtext: "#7c2d12",
      grid: "#fed7aa",
      gridText: "#fb923c",
      cardBg: "#fffbeb",
      cardBorder: "#fed7aa",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#15803d",
      negBadge: "#dc2626",
      medianLine: "#f59e0b",
      targetLine: "#be123c",
      dark: false
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare (Clinical)",
      colors: ["#143359", "#00AF68", "#2E7CF6", "#FFB500", "#7C5CFC", "#14B8A6", "#E5484D", "#94A3B8"],
      bg: "#ffffff",
      text: "#143359",
      subtext: "#64748B",
      grid: "#EEF2F7",
      gridText: "#94A3B8",
      cardBg: "#F8FAFC",
      cardBorder: "#CBD5E1",
      hudBg: "rgba(255, 255, 255, 0.96)",
      posBadge: "#006B40",
      negBadge: "#B42318",
      medianLine: "#2E7CF6",
      targetLine: "#143359",
      dark: false
    }
  };

  function escHtml(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resolveField(list, overrideVal, defaultIdx) {
    if (!list || list.length === 0) return null;
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== "") {
      var trimmed = String(overrideVal).trim();
      var idx = parseInt(trimmed, 10);
      if (!isNaN(idx) && String(idx) === trimmed && idx >= 1 && idx <= list.length) {
        return list[idx - 1];
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === trimmed || list[i].label === trimmed || list[i].label_short === trimmed) {
          return list[i];
        }
      }
    }
    return defaultIdx >= 0 ? (list[defaultIdx] || null) : null;
  }

  function formatMetricValue(val, valueFormat, unit) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    var num = Number(val);
    var fmt = valueFormat || "auto";
    if (fmt === "compact_number") {
      var abs = Math.abs(num);
      if (abs >= 1e9) return (num / 1e9).toFixed(1) + "B";
      if (abs >= 1e6) return (num / 1e6).toFixed(1) + "M";
      if (abs >= 1e3) return (num / 1e3).toFixed(1) + "K";
      return Math.abs(num) >= 100 ? Math.round(num).toLocaleString() : num.toFixed(1);
    }
    if (fmt === "compact_currency") {
      var absC = Math.abs(num);
      var sign = num < 0 ? "-" : "";
      if (absC >= 1e9) return sign + "$" + (absC / 1e9).toFixed(1) + "B";
      if (absC >= 1e6) return sign + "$" + (absC / 1e6).toFixed(1) + "M";
      if (absC >= 1e3) return sign + "$" + (absC / 1e3).toFixed(1) + "K";
      return sign + "$" + absC.toFixed(0);
    }
    if (fmt === "percentage") {
      return (Math.abs(num) <= 1 ? num * 100 : num).toFixed(1) + "%";
    }
    if (fmt === "decimal_2") {
      return num.toFixed(2);
    }
    if (fmt === "raw") {
      return String(Math.round(num * 1000) / 1000);
    }
    // "auto": time duration units
    var uStr = unit ? " " + unit : "";
    if (Math.abs(num) >= 100) return Math.round(num).toLocaleString() + uStr;
    return num.toFixed(1) + uStr;
  }

  function formatProb(val) {
    if (val === null || val === undefined || isNaN(val)) return "-";
    return (val * 100).toFixed(1) + "%";
  }

  function computeKMForObservations(stratumName, obsList) {
    var sorted = obsList.slice().sort(function (a, b) { return a.t - b.t; });
    var totalN = sorted.length;
    var uniqueTimes = [];
    var timeMap = {};

    sorted.forEach(function (o) {
      var t = o.t;
      if (!timeMap[t]) {
        timeMap[t] = { t: t, events: 0, censored: 0, links: o.links || [] };
        uniqueTimes.push(t);
      }
      if (o.event === 1) {
        timeMap[t].events++;
      } else {
        timeMap[t].censored++;
      }
      if ((!timeMap[t].links || !timeMap[t].links.length) && o.links && o.links.length) {
        timeMap[t].links = o.links;
      }
    });

    uniqueTimes.sort(function (a, b) { return a - b; });

    var curS = 1.0;
    var curN = totalN;
    var greenwoodSum = 0;
    var medianTime = null;
    var cumEvents = 0;
    var firstLinks = (sorted[0] && sorted[0].links) || [];

    var curvePoints = [{
      t: 0, s: 1.0, lowerCI: 1.0, upperCI: 1.0,
      atRisk: totalN, events: 0, cumEvents: 0, censored: 0, cumHazard: 0, links: firstLinks
    }];

    uniqueTimes.forEach(function (t) {
      var entry = timeMap[t];
      var d = entry.events;
      var c = entry.censored;
      cumEvents += d;

      if (curN > 0) {
        if (d > 0) {
          curS = curS * (1 - d / curN);
          if (curN > d) {
            greenwoodSum += d / (curN * (curN - d));
          }
        }

        var se = curS * Math.sqrt(greenwoodSum);
        var lower = Math.max(0, curS - 1.96 * se);
        var upper = Math.min(1.0, curS + 1.96 * se);
        var cumHaz = -Math.log(Math.max(0.0001, curS));

        curvePoints.push({
          t: t,
          s: curS,
          lowerCI: lower,
          upperCI: upper,
          atRisk: curN,
          events: d,
          cumEvents: cumEvents,
          censored: c,
          cumHazard: cumHaz,
          links: entry.links || firstLinks
        });

        if (medianTime === null && curS <= 0.5) {
          medianTime = t;
        }

        curN = curN - d - c;
      }
    });

    var censoredPoints = [];
    uniqueTimes.forEach(function (t) {
      var entry = timeMap[t];
      if (entry.censored > 0) {
        var matchedPt = null;
        for (var i = 0; i < curvePoints.length; i++) {
          if (curvePoints[i].t === t) { matchedPt = curvePoints[i]; break; }
        }
        censoredPoints.push({
          t: t,
          s: matchedPt ? matchedPt.s : 0,
          count: entry.censored
        });
      }
    });

    var maxT = uniqueTimes.length ? uniqueTimes[uniqueTimes.length - 1] : 0;
    var eventsTotal = 0;
    var censoredTotal = 0;
    sorted.forEach(function (o) {
      if (o.event === 1) eventsTotal++;
      else censoredTotal++;
    });

    return {
      stratum: stratumName,
      total: totalN,
      events: eventsTotal,
      censored: censoredTotal,
      medianTime: medianTime !== null ? medianTime : maxT,
      medianReached: medianTime !== null,
      endSurvival: curS,
      curve: curvePoints,
      censoredPoints: censoredPoints,
      maxTime: maxT,
      obs: sorted,
      links: firstLinks
    };
  }

  // Approximate Chi-Square upper-tail p-value for df >= 1
  function chiSquarePValue(chiSq, df) {
    if (!chiSq || chiSq <= 0 || df < 1) return 1.0;
    if (df === 1) {
      // Complementary error function approximation for Z = sqrt(chiSq)
      var z = Math.sqrt(chiSq) / Math.SQRT2;
      var t = 1 / (1 + 0.3275911 * z);
      var erfc = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
      return Math.min(1.0, Math.max(0.0, erfc));
    }
    // Wilson-Hilferty transformation to standard normal
    var k = df;
    var w = Math.pow(chiSq / k, 1 / 3) - (1 - 2 / (9 * k));
    var denom = Math.sqrt(2 / (9 * k));
    var zScore = w / denom;
    if (zScore <= 0) return 0.5;
    var zAbs = Math.abs(zScore) / Math.SQRT2;
    var t2 = 1 / (1 + 0.3275911 * zAbs);
    var erfc2 = t2 * (0.254829592 + t2 * (-0.284496736 + t2 * (1.421413741 + t2 * (-1.453152027 + t2 * 1.061405429)))) * Math.exp(-zAbs * zAbs);
    return Math.min(1.0, Math.max(0.0, 0.5 * erfc2));
  }

  // Mantel-Cox Log-Rank Test across K >= 2 strata
  function computeLogRankTest(strataResults) {
    if (!strataResults || strataResults.length < 2) return null;
    var K = strataResults.length;
    var eventTimesSet = {};
    var obsPerStratum = [];
    var expPerStratum = [];
    var varPerStratum = [];

    for (var k = 0; k < K; k++) {
      obsPerStratum.push(0);
      expPerStratum.push(0);
      varPerStratum.push(0);
      strataResults[k].obs.forEach(function (o) {
        if (o.event === 1) eventTimesSet[o.t] = true;
      });
    }

    var times = Object.keys(eventTimesSet).map(Number).sort(function (a, b) { return a - b; });
    if (times.length === 0) return null;

    // Precompute sorted times per stratum for O(N + T*K) pointer sweep
    var ptrs = [];
    var atRisk = [];
    for (var k2 = 0; k2 < K; k2++) {
      ptrs.push(0);
      atRisk.push(strataResults[k2].obs.length);
    }

    times.forEach(function (t) {
      var nRiskK = [];
      var dK = [];
      var nRiskTotal = 0;
      var dTotal = 0;

      for (var k3 = 0; k3 < K; k3++) {
        var list = strataResults[k3].obs;
        var p = ptrs[k3];
        while (p < list.length && list[p].t < t) {
          atRisk[k3]--;
          p++;
        }
        ptrs[k3] = p;
        var eventsAtT = 0;
        var pLook = p;
        while (pLook < list.length && list[pLook].t === t) {
          if (list[pLook].event === 1) eventsAtT++;
          pLook++;
        }
        nRiskK.push(atRisk[k3]);
        dK.push(eventsAtT);
        nRiskTotal += atRisk[k3];
        dTotal += eventsAtT;
      }

      if (nRiskTotal > 1 && dTotal > 0) {
        for (var k4 = 0; k4 < K; k4++) {
          obsPerStratum[k4] += dK[k4];
          expPerStratum[k4] += nRiskK[k4] * (dTotal / nRiskTotal);
          varPerStratum[k4] += (nRiskK[k4] * (nRiskTotal - nRiskK[k4]) * dTotal * (nRiskTotal - dTotal)) /
            (nRiskTotal * nRiskTotal * (nRiskTotal - 1));
        }
      }
    });

    var chiSq = 0;
    if (K === 2) {
      var v0 = varPerStratum[0];
      if (v0 > 1e-9) {
        chiSq = Math.pow(obsPerStratum[0] - expPerStratum[0], 2) / v0;
      }
    } else {
      for (var k5 = 0; k5 < K; k5++) {
        if (expPerStratum[k5] > 1e-9) {
          chiSq += Math.pow(obsPerStratum[k5] - expPerStratum[k5], 2) / expPerStratum[k5];
        }
      }
    }

    var df = K - 1;
    return {
      chiSq: chiSq,
      df: df,
      pValue: chiSquarePValue(chiSq, df)
    };
  }

  function computeHazardRateBins(stratumRes, maxGlobalTime, numBins) {
    var binWidth = Math.max(0.001, maxGlobalTime / numBins);
    var bins = [];
    for (var b = 0; b < numBins; b++) {
      var tStart = b * binWidth;
      var tEnd = (b + 1) * binWidth;
      var tMid = (tStart + tEnd) / 2;
      var eventsInBin = 0;
      var atRiskStart = 0;
      for (var i = 0; i < stratumRes.obs.length; i++) {
        var o = stratumRes.obs[i];
        if (o.t >= tStart) atRiskStart++;
        if (o.event === 1 && o.t >= tStart && (b === numBins - 1 ? o.t <= tEnd + 1e-9 : o.t < tEnd)) {
          eventsInBin++;
        }
      }
      var rawRate = atRiskStart > 0 ? eventsInBin / (atRiskStart * binWidth) : 0;
      bins.push({ t: tMid, tStart: tStart, tEnd: tEnd, rawRate: rawRate, rate: rawRate, events: eventsInBin, atRisk: atRiskStart });
    }
    // 3-point triangular smoothing for clean density visualization
    for (var j = 0; j < bins.length; j++) {
      var prev = j > 0 ? bins[j - 1].rawRate : bins[j].rawRate;
      var curr = bins[j].rawRate;
      var next = j < bins.length - 1 ? bins[j + 1].rawRate : bins[j].rawRate;
      bins[j].rate = 0.25 * prev + 0.5 * curr + 0.25 * next;
    }
    return bins;
  }

  looker.plugins.visualizations.add({
    id: "kaplan_meier_survival_curve",
    label: "Kaplan-Meier Survival & Hazard Curve",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Strictly 2 tabs total)
      // ==========================================
      viewMode: {
        type: "string",
        label: "Survival Analytical Mode",
        section: "Display",
        order: 1,
        display: "select",
        values: [
          { "Kaplan-Meier Survival Probability S(t)": "survival" },
          { "Cumulative Resolution / Attrition (1 - S(t))": "inverted_churn" },
          { "Nelson-Aalen Cumulative Hazard H(t)": "cumulative_hazard" },
          { "Smoothed Hazard Rate Density \u03bb(t)": "hazard_rate" }
        ],
        default: "survival"
      },
      strataDimOverride: {
        type: "string",
        label: "Primary Strata / Cohort Dimension",
        section: "Display",
        order: 2,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      strataSecondaryOverride: {
        type: "string",
        label: "Secondary / Sub-Strata Dimension",
        section: "Display",
        order: 3,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      obsIdDimOverride: {
        type: "string",
        label: "Observation ID Dimension",
        section: "Display",
        order: 4,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      durationMeasureOverride: {
        type: "string",
        label: "Duration / Time-to-Event Field",
        section: "Display",
        order: 5,
        display: "select",
        values: [{ "Auto (run the query to populate field choices)": "" }],
        default: ""
      },
      eventMeasureOverride: {
        type: "string",
        label: "Event / Censoring Status Field",
        section: "Display",
        order: 6,
        display: "select",
        values: [{ "Auto / None (Treat All as Events)": "" }],
        default: ""
      },
      targetMeasureOverride: {
        type: "string",
        label: "Target / SLA Measure Column",
        section: "Display",
        order: 7,
        display: "select",
        values: [{ "Auto / None": "" }],
        default: ""
      },
      showConfidenceInterval: {
        type: "boolean",
        label: "Show 95% CI Ribbon Bands (Greenwood)",
        section: "Display",
        order: 8,
        default: true
      },
      showRiskTable: {
        type: "boolean",
        label: "Show Aligned At-Risk Life Table",
        section: "Display",
        order: 9,
        default: true
      },
      showMedianGuide: {
        type: "boolean",
        label: "Show Median Survival Guide (P50 = 50%)",
        section: "Display",
        order: 10,
        default: true
      },
      targetMode: {
        type: "string",
        label: "SLA / Target Milestone Reference Mode",
        section: "Display",
        order: 11,
        display: "select",
        values: [
          { "Fixed Time Value": "fixed_value" },
          { "Measure Column": "measure_column" },
          { "Dataset Mean Duration": "dataset_mean" },
          { "Dataset Median Duration (P50)": "dataset_median" },
          { "Percentile P75 Duration": "percentile_p75" },
          { "Percentile P90 Duration": "percentile_p90" },
          { "None (No Target Line)": "none" }
        ],
        default: "fixed_value"
      },
      fixedTargetValue: {
        type: "number",
        label: "Custom Target Milestone Value",
        section: "Display",
        order: 12,
        default: 120
      },
      referenceLineLabel: {
        type: "string",
        label: "Reference Line Label",
        section: "Display",
        order: 13,
        default: "Incident SLA (120m)"
      },
      anomalyThresholdPct: {
        type: "number",
        label: "SLA Breach / Divergence Alert Threshold (%)",
        section: "Display",
        order: 14,
        default: 25
      },
      timeUnit: {
        type: "string",
        label: "Duration Time Unit Label",
        section: "Display",
        order: 15,
        display: "select",
        values: [
          { "Minutes (e.g. Incident MTTR)": "Minutes" },
          { "Hours (e.g. Operational SLA)": "Hours" },
          { "Days (e.g. SaaS / User Retention)": "Days" },
          { "Weeks (e.g. Cohort Lifecycle)": "Weeks" },
          { "Months (e.g. Clinical Survival)": "Months" }
        ],
        default: "Minutes"
      },
      strataSort: {
        type: "string",
        label: "Cohort / Strata Sort Order",
        section: "Display",
        order: 16,
        display: "select",
        values: [
          { "Fastest Median Time (Ascending)": "median_asc" },
          { "Slowest Median Time (Descending)": "median_desc" },
          { "Observation Count (Descending)": "count_desc" },
          { "Alphabetical (A to Z)": "alphabetical" },
          { "Natural (Query Order)": "natural" }
        ],
        default: "median_asc"
      },
      topNLimit: {
        type: "string",
        label: "Top-N Cohort Limit",
        section: "Display",
        order: 17,
        display: "select",
        values: [
          { "Top 3 Cohorts": "3" },
          { "Top 5 Cohorts": "5" },
          { "Top 8 Cohorts": "8" },
          { "Top 10 Cohorts": "10" },
          { "All Cohorts": "all" }
        ],
        default: "5"
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Roll Remaining Cohorts into 'Other'",
        section: "Display",
        order: 18,
        default: false
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Duration Rows",
        section: "Display",
        order: 19,
        default: false
      },
      hudMode: {
        type: "string",
        label: "Executive KPI HUD Density",
        section: "Display",
        order: 20,
        display: "select",
        values: [
          { "Full Scorecard (4 KPIs + Log-Rank)": "scorecard" },
          { "Compact Strip": "compact_strip" },
          { "Hidden": "hidden" }
        ],
        default: "scorecard"
      },
      labelDensity: {
        type: "string",
        label: "Data Callout Label Density",
        section: "Display",
        order: 21,
        display: "select",
        values: [
          { "All Curve Endpoints & Milestones": "all" },
          { "Min/Max Peaks & Median Only": "peaks_only" },
          { "Hidden": "hidden" }
        ],
        default: "peaks_only"
      },
      customTitle: {
        type: "string",
        label: "Custom Chart Title Override",
        section: "Display",
        order: 22,
        default: ""
      },
      customSubtitle: {
        type: "string",
        label: "Custom Chart Subtitle Override",
        section: "Display",
        order: 23,
        default: ""
      },
      showSearch: {
        type: "boolean",
        label: "Show Interactive Cohort Search Bar",
        section: "Display",
        order: 24,
        default: true
      },
      showLegend: {
        type: "boolean",
        label: "Show Interactive Cohort Legend Pills",
        section: "Display",
        order: 25,
        default: true
      },

      // ==========================================
      // SECTION 2: STYLE (Strictly 2 tabs total)
      // ==========================================
      colorPalette: {
        type: "string",
        label: "Brand Color Palette",
        section: "Style",
        order: 1,
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark (NOC / SecOps)": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media & Coral": "sunset_media" },
          { "Wellverse Healthcare (Clinical)": "wellverse_healthcare" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "cyberpunk_dark"
      },
      customPrimaryHex: {
        type: "string",
        label: "Custom Primary Curve Hex",
        display: "color",
        section: "Style",
        order: 2,
        default: ""
      },
      customPositiveHex: {
        type: "string",
        label: "Custom Favorable / Pass Hex",
        display: "color",
        section: "Style",
        order: 3,
        default: ""
      },
      customNegativeHex: {
        type: "string",
        label: "Custom Breach / Alert Hex",
        display: "color",
        section: "Style",
        order: 4,
        default: ""
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity",
        section: "Style",
        order: 5,
        display: "select",
        values: [
          { "Lower Duration is Better (MTTR / SLA Resolution)": "lower_is_better" },
          { "Higher Survival is Better (Retention / Clinical)": "higher_is_better" }
        ],
        default: "lower_is_better"
      },
      fontScale: {
        type: "string",
        label: "Typography Font Scale",
        section: "Style",
        order: 6,
        display: "select",
        values: [
          { "Compact (Dense Dashboard)": "compact" },
          { "Standard": "standard" },
          { "Large Presentation": "large" }
        ],
        default: "standard"
      },
      valueFormat: {
        type: "string",
        label: "Value Format",
        section: "Style",
        order: 7,
        display: "select",
        values: [
          { "Auto (Time Units)": "auto" },
          { "Compact Number (1.2M)": "compact_number" },
          { "Compact Currency ($1.2M)": "compact_currency" },
          { "Percentage (45.2%)": "percentage" },
          { "Decimal (2dp)": "decimal_2" },
          { "Raw": "raw" }
        ],
        default: "auto"
      },
      curveInterpolation: {
        type: "string",
        label: "Curve Step Interpolation",
        section: "Style",
        order: 8,
        display: "select",
        values: [
          { "Kaplan-Meier Step-After (Standard)": "step_after" },
          { "Smooth Monotone Spline": "monotone" },
          { "Linear Point-to-Point": "linear" }
        ],
        default: "step_after"
      },
      strokeWidth: {
        type: "number",
        label: "Curve Stroke Thickness (px)",
        section: "Style",
        order: 9,
        default: 2.5
      },
      ciBandOpacity: {
        type: "number",
        label: "CI Ribbon Opacity (0.05 - 0.5)",
        section: "Style",
        order: 10,
        default: 0.15
      }
    },

    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        strataDimOverride: { role: "dimension", defaultIdx: 0 },
        strataSecondaryOverride: { role: "dimension", defaultIdx: -1 },
        obsIdDimOverride: { role: "dimension", defaultIdx: 1 },
        durationMeasureOverride: { role: "measure", defaultIdx: 0 },
        eventMeasureOverride: { role: "measure", defaultIdx: -1 },
        targetMeasureOverride: { role: "measure", defaultIdx: -1 }
      };
      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = spec.defaultIdx >= 0 ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto \u2192 " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + " (" + fld.name + ")";
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].type = "string";
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable in this host:", e);
      }
    },

    create: function (element, config) {
      this._element = element;
      this._searchQuery = "";
      this._activeStrata = null;
      this._lastHeight = 0;
      this._lastWidth = 0;

      // Preserve Looker's explicit element dimensions/margins; never set width:100%/height:100% on element
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.innerHTML = "";

      this._container = document.createElement("div");
      this._container.className = "looker-km-survival-container";
      this._container.style.width = "100%";
      this._container.style.height = "100%";
      this._container.style.position = "relative";
      this._container.style.overflow = "hidden";
      this._container.style.boxSizing = "border-box";
      this._container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      element.appendChild(this._container);

      var oldTooltips = document.querySelectorAll(".km-survival-tooltip");
      for (var i = 0; i < oldTooltips.length; i++) {
        if (oldTooltips[i].parentNode) oldTooltips[i].parentNode.removeChild(oldTooltips[i]);
      }

      this._tooltip = document.createElement("div");
      this._tooltip.className = "km-survival-tooltip";
      this._tooltip.style.position = "absolute";
      this._tooltip.style.display = "none";
      this._tooltip.style.pointerEvents = "none";
      this._tooltip.style.zIndex = "9999";
      this._tooltip.style.padding = "10px 14px";
      this._tooltip.style.borderRadius = "8px";
      this._tooltip.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)";
      this._tooltip.style.fontSize = "12px";
      this._tooltip.style.transition = "opacity 0.15s ease";
      document.body.appendChild(this._tooltip);

      this._setupResizeObserver(element);
    },

    _setupResizeObserver: function (element) {
      var self = this;
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
      if (typeof ResizeObserver !== "undefined" && element) {
        var resizeTimer = null;
        this._resizeObserver = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastConfig) return;
          var entry = entries[0];
          if (!entry) return;
          var w = entry.contentRect.width;
          var h = entry.contentRect.height;
          if (Math.abs(w - self._lastWidth) < 4 && Math.abs(h - self._lastHeight) < 4) return;
          self._lastWidth = w;
          self._lastHeight = h;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            self.updateAsync(self._lastData, self._element, self._lastConfig, self._lastQueryResponse, self._lastDetails, function () {});
          }, 150);
        });
        this._resizeObserver.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      if (typeof this.clearErrors === "function") {
        try { this.clearErrors(); } catch (e) {}
      }
      this._registerDynamicFieldOptions(queryResponse);

      this._lastData = data;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;

      if (!data || data.length === 0) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "No Data",
              message: "The query returned 0 rows. Please select dimensions and duration measures."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var fields = queryResponse ? queryResponse.fields : null;
      var dims = (fields && fields.dimensions && fields.dimensions.length) ? fields.dimensions : ((fields && fields.dimension_like) || []);
      var measures = (fields && fields.measures && fields.measures.length) ? fields.measures : ((fields && fields.measure_like) || []);
      if (!measures.length && fields && fields.table_calculations && fields.table_calculations.length) {
        measures = fields.table_calculations;
      }

      var strataDim = resolveField(dims, config.strataDimOverride, 0);
      var strataSecDim = config.strataSecondaryOverride ? resolveField(dims, config.strataSecondaryOverride, -1) : null;
      var obsIdDim = resolveField(dims, config.obsIdDimOverride, 1);
      var durationField = resolveField(measures, config.durationMeasureOverride, 0) || resolveField(dims, config.durationMeasureOverride, 1);
      var eventField = config.eventMeasureOverride ? resolveField(measures, config.eventMeasureOverride, -1) : null;
      var targetMeasField = config.targetMeasureOverride ? resolveField(measures, config.targetMeasureOverride, -1) : null;

      if (!durationField) {
        if (typeof this.addError === "function") {
          try {
            this.addError({
              title: "Missing Duration Field",
              message: "Kaplan-Meier survival curve requires at least one numeric measure or dimension representing time duration."
            });
          } catch (e) {}
        }
        done();
        return;
      }

      var suppressZeroNull = config.suppressZeroNull === true;
      var observations = [];
      var targetMeasureValues = [];

      data.forEach(function (row, rIdx) {
        var primaryStrata = strataDim && row[strataDim.name] && row[strataDim.name].value !== null && row[strataDim.name].value !== undefined
          ? String(row[strataDim.name].value)
          : "All Cohorts";
        var secStrata = strataSecDim && row[strataSecDim.name] && row[strataSecDim.name].value !== null && row[strataSecDim.name].value !== undefined
          ? String(row[strataSecDim.name].value)
          : "";
        var sName = secStrata ? (primaryStrata + " \u2014 " + secStrata) : primaryStrata;

        var obsId = obsIdDim && row[obsIdDim.name] && row[obsIdDim.name].value !== null && row[obsIdDim.name].value !== undefined
          ? String(row[obsIdDim.name].value)
          : "Obs " + (rIdx + 1);

        var dCell = row[durationField.name];
        var rawDur = dCell ? dCell.value : null;
        if (suppressZeroNull && (rawDur === null || rawDur === undefined || rawDur === "" || Number(rawDur) <= 0 || isNaN(Number(rawDur)))) {
          return;
        }
        var durationVal = rawDur !== null && rawDur !== undefined ? Number(rawDur) : 0;
        if (isNaN(durationVal) || durationVal < 0) durationVal = 0;

        var isEvent = 1;
        if (eventField && row[eventField.name]) {
          var evVal = row[eventField.name].value;
          if (evVal === false || evVal === 0 || evVal === "0" || evVal === "censored" || evVal === "false" || evVal === "no") {
            isEvent = 0;
          }
        }

        if (targetMeasField && row[targetMeasField.name] && row[targetMeasField.name].value !== null) {
          var tv = Number(row[targetMeasField.name].value);
          if (!isNaN(tv) && tv > 0) targetMeasureValues.push(tv);
        }

        var links = [];
        if (dCell && dCell.links && dCell.links.length) links = dCell.links;
        else if (strataDim && row[strataDim.name] && row[strataDim.name].links && row[strataDim.name].links.length) links = row[strataDim.name].links;
        else if (obsIdDim && row[obsIdDim.name] && row[obsIdDim.name].links && row[obsIdDim.name].links.length) links = row[obsIdDim.name].links;

        observations.push({
          id: obsId,
          strata: sName,
          t: durationVal,
          event: isEvent,
          links: links
        });
      });

      var self = this;
      ensureD3(function (d3) {
        self._render(d3, observations, targetMeasureValues, config, queryResponse, done);
      });
    },

    _render: function (d3, observations, targetMeasureValues, config, queryResponse, done) {
      var self = this;
      var container = this._container;
      container.innerHTML = "";

      // Resolve options with backward compatibility for legacy keys
      var viewMode = config.viewMode || "survival";
      var showConfidenceInterval = config.showConfidenceInterval !== false;
      var showRiskTable = config.showRiskTable !== false;
      var showMedianGuide = config.showMedianGuide !== false;
      var targetMode = config.targetMode || "fixed_value";
      var fixedTargetValue = config.fixedTargetValue !== undefined ? Number(config.fixedTargetValue) : 120;
      var referenceLineLabel = config.referenceLineLabel || config.targetLabel || "Incident SLA (120m)";
      var anomalyThresholdPct = config.anomalyThresholdPct !== undefined ? Number(config.anomalyThresholdPct) : 25;
      var timeUnit = config.timeUnit || "Minutes";
      var strataSort = config.strataSort || "median_asc";
      var topNOpt = config.topNLimit || config.maxStrata || "5";
      var enableOtherRollup = config.enableOtherRollup === true;

      var rawHud = config.hudMode || config.hudDensity || "scorecard";
      var hudMode = rawHud === "full" ? "scorecard" : rawHud === "compact" ? "compact_strip" : rawHud;
      var labelDensity = config.labelDensity || "peaks_only";
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;

      var fontScale = config.fontScale || "standard";
      var valueFormat = config.valueFormat || "auto";
      var curveInterpolation = config.curveInterpolation || "step_after";
      var strokeWidth = config.strokeWidth !== undefined ? Number(config.strokeWidth) : 2.5;
      var ciBandOpacity = config.ciBandOpacity !== undefined ? Number(config.ciBandOpacity) : 0.15;
      var metricPolarity = config.metricPolarity || config.polarity || "lower_is_better";

      var fSizes = {
        title: fontScale === "compact" ? "12px" : fontScale === "large" ? "16px" : "14px",
        hudVal: fontScale === "compact" ? "11px" : fontScale === "large" ? "15px" : "13px",
        hudLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px",
        axisLbl: fontScale === "compact" ? "9px" : fontScale === "large" ? "12px" : "10px",
        tableTxt: fontScale === "compact" ? "9px" : fontScale === "large" ? "11px" : "10px"
      };

      var paletteKey = config.colorPalette || "cyberpunk_dark";
      var baseTheme = paletteKey === "custom_override" ? PALETTES.google_enterprise : (PALETTES[paletteKey] || PALETTES.cyberpunk_dark);
      var theme = Object.assign({}, baseTheme, { colors: baseTheme.colors.slice() });
      if (config.customPrimaryHex) theme.colors[0] = config.customPrimaryHex;
      if (config.customPositiveHex) theme.posBadge = config.customPositiveHex;
      if (config.customNegativeHex) {
        theme.negBadge = config.customNegativeHex;
        theme.targetLine = config.customNegativeHex;
      }

      if (!observations || observations.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:13px;'>No observations remain after zero/null suppression.</div>";
        done();
        return;
      }

      // Compute dynamic benchmark / target value across all observations
      var allDurations = observations.map(function (o) { return o.t; }).sort(function (a, b) { return a - b; });
      var effectiveTargetVal = null;
      if (targetMode === "fixed_value") {
        effectiveTargetVal = !isNaN(fixedTargetValue) && fixedTargetValue > 0 ? fixedTargetValue : null;
      } else if (targetMode === "measure_column") {
        effectiveTargetVal = targetMeasureValues.length ? d3.mean(targetMeasureValues) : (!isNaN(fixedTargetValue) && fixedTargetValue > 0 ? fixedTargetValue : null);
      } else if (targetMode === "dataset_mean") {
        effectiveTargetVal = d3.mean(allDurations);
      } else if (targetMode === "dataset_median") {
        effectiveTargetVal = d3.quantile(allDurations, 0.5);
      } else if (targetMode === "percentile_p75") {
        effectiveTargetVal = d3.quantile(allDurations, 0.75);
      } else if (targetMode === "percentile_p90") {
        effectiveTargetVal = d3.quantile(allDurations, 0.90);
      }

      // Filter by search query
      var filteredObs = observations;
      if (this._searchQuery && this._searchQuery.trim() !== "") {
        var q = this._searchQuery.trim().toLowerCase();
        filteredObs = observations.filter(function (o) {
          return o.strata.toLowerCase().indexOf(q) !== -1 || o.id.toLowerCase().indexOf(q) !== -1;
        });
      }

      // Group observations by strata
      var strataMap = {};
      var strataOrder = [];
      filteredObs.forEach(function (o) {
        if (!strataMap[o.strata]) {
          strataMap[o.strata] = [];
          strataOrder.push(o.strata);
        }
        strataMap[o.strata].push(o);
      });

      if (strataOrder.length === 0) {
        container.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:" + theme.subtext + ";font-size:14px;'>No matching observations found.</div>";
        done();
        return;
      }

      var kmResults = strataOrder.map(function (stratumName) {
        return computeKMForObservations(stratumName, strataMap[stratumName]);
      });

      // Reset stale activeStrata if filtered out
      if (this._activeStrata && strataOrder.indexOf(this._activeStrata) === -1) {
        this._activeStrata = null;
      }

      // Sort strata
      if (strataSort === "median_asc") {
        kmResults.sort(function (a, b) { return a.medianTime - b.medianTime; });
      } else if (strataSort === "median_desc") {
        kmResults.sort(function (a, b) { return b.medianTime - a.medianTime; });
      } else if (strataSort === "count_desc") {
        kmResults.sort(function (a, b) { return b.total - a.total; });
      } else if (strataSort === "alphabetical") {
        kmResults.sort(function (a, b) { return a.stratum.localeCompare(b.stratum); });
      }

      // Top-N slice with functional 'Other' cohort rollup
      var activeResults = kmResults;
      if (topNOpt !== "all") {
        var lim = parseInt(topNOpt, 10);
        if (!isNaN(lim) && lim > 0 && kmResults.length > lim) {
          var head = kmResults.slice(0, lim);
          if (enableOtherRollup) {
            var tail = kmResults.slice(lim);
            var tailObs = [];
            tail.forEach(function (r) { tailObs = tailObs.concat(r.obs); });
            var otherKM = computeKMForObservations("Other (" + tail.length + " cohorts)", tailObs);
            otherKM.isOther = true;
            head.push(otherKM);
          }
          activeResults = head;
        }
      }

      // Evaluate SLA breach / anomaly status per stratum
      var hasDrillLinks = activeResults.some(function (r) { return r.links && r.links.length > 0; });
      var anomalyCount = 0;
      activeResults.forEach(function (r) {
        if (effectiveTargetVal !== null && effectiveTargetVal > 0) {
          var breachCount = 0;
          r.obs.forEach(function (o) {
            if (metricPolarity === "lower_is_better") {
              if (o.t > effectiveTargetVal) breachCount++;
            } else {
              if (o.t < effectiveTargetVal) breachCount++;
            }
          });
          r.breachPct = (breachCount / Math.max(1, r.obs.length)) * 100;
          r.isAnomaly = r.breachPct >= anomalyThresholdPct;
        } else {
          r.breachPct = 0;
          r.isAnomaly = false;
        }
        if (r.isAnomaly) anomalyCount++;
      });

      var maxGlobalTime = d3.max(activeResults, function (r) { return r.maxTime; }) || 100;
      if (effectiveTargetVal && effectiveTargetVal > maxGlobalTime) {
        maxGlobalTime = Math.max(maxGlobalTime, effectiveTargetVal * 1.05);
      }

      var logRank = computeLogRankTest(activeResults);

      // Container layout (flex column so HUD never overlaps SVG stage)
      container.style.backgroundColor = theme.bg;
      container.style.color = theme.text;

      var outerFlex = document.createElement("div");
      outerFlex.style.display = "flex";
      outerFlex.style.flexDirection = "column";
      outerFlex.style.width = "100%";
      outerFlex.style.height = "100%";
      outerFlex.style.boxSizing = "border-box";
      outerFlex.style.padding = "10px 14px";
      container.appendChild(outerFlex);

      // Header Title / Subtitle + Drill Affordance
      if (customTitle || customSubtitle || hasDrillLinks) {
        var headerRow = document.createElement("div");
        headerRow.style.display = "flex";
        headerRow.style.alignItems = "flex-start";
        headerRow.style.justifyContent = "space-between";
        headerRow.style.gap = "8px";
        headerRow.style.marginBottom = "6px";
        headerRow.style.flex = "0 0 auto";

        var titleCol = document.createElement("div");
        if (customTitle) {
          var tDiv = document.createElement("div");
          tDiv.style.fontSize = fSizes.title;
          tDiv.style.fontWeight = "700";
          tDiv.style.color = theme.text;
          tDiv.textContent = customTitle;
          titleCol.appendChild(tDiv);
        }
        if (customSubtitle) {
          var sDiv = document.createElement("div");
          sDiv.style.fontSize = fSizes.hudLbl;
          sDiv.style.color = theme.subtext;
          sDiv.style.marginTop = "2px";
          sDiv.textContent = customSubtitle;
          titleCol.appendChild(sDiv);
        }
        headerRow.appendChild(titleCol);

        if (hasDrillLinks) {
          var drillBadge = document.createElement("span");
          drillBadge.style.fontSize = "10px";
          drillBadge.style.fontWeight = "700";
          drillBadge.style.padding = "2px 7px";
          drillBadge.style.borderRadius = "999px";
          drillBadge.style.border = "1px solid " + theme.cardBorder;
          drillBadge.style.backgroundColor = theme.cardBg;
          drillBadge.style.color = theme.subtext;
          drillBadge.style.whiteSpace = "nowrap";
          drillBadge.textContent = "\uD83D\uDD0E CLICK CURVE TO DRILL";
          headerRow.appendChild(drillBadge);
        }
        outerFlex.appendChild(headerRow);
      }

      // Executive Scorecard HUD
      if (hudMode !== "hidden") {
        var totalObsCount = d3.sum(activeResults, function (r) { return r.total; });
        var totalEventsCount = d3.sum(activeResults, function (r) { return r.events; });
        var overallMedian = d3.median(activeResults, function (r) { return r.medianTime; }) || 0;
        var logRankText = logRank
          ? ("\u03c7\u00b2=" + logRank.chiSq.toFixed(1) + " (p=" + (logRank.pValue < 0.001 ? "<0.001" : logRank.pValue.toFixed(3)) + ")")
          : "Single Stratum";

        if (hudMode === "compact_strip") {
          var compactStrip = document.createElement("div");
          compactStrip.className = "km-compact-hud";
          compactStrip.style.display = "flex";
          compactStrip.style.flexWrap = "wrap";
          compactStrip.style.alignItems = "center";
          compactStrip.style.justifyContent = "space-between";
          compactStrip.style.gap = "8px";
          compactStrip.style.backgroundColor = theme.cardBg;
          compactStrip.style.border = "1px solid " + theme.cardBorder;
          compactStrip.style.borderRadius = "6px";
          compactStrip.style.padding = "4px 10px";
          compactStrip.style.marginBottom = "6px";
          compactStrip.style.fontSize = fSizes.hudLbl;
          compactStrip.style.fontWeight = "600";
          compactStrip.style.flex = "0 0 auto";

          var s1 = document.createElement("span");
          s1.innerHTML = "<span style='color:" + theme.subtext + "'>Observations:</span> " + totalObsCount.toLocaleString() + " (" + totalEventsCount.toLocaleString() + " Events)";
          var s2 = document.createElement("span");
          s2.innerHTML = "<span style='color:" + theme.subtext + "'>Median Time:</span> <span style='color:" + theme.medianLine + "'>" + escHtml(formatMetricValue(overallMedian, valueFormat, timeUnit)) + "</span>";
          var s3 = document.createElement("span");
          s3.innerHTML = "<span style='color:" + theme.subtext + "'>Log-Rank:</span> " + escHtml(logRankText);

          compactStrip.appendChild(s1);
          compactStrip.appendChild(s2);
          compactStrip.appendChild(s3);
          if (anomalyCount > 0) {
            var s4 = document.createElement("span");
            s4.style.color = theme.negBadge;
            s4.textContent = "\u26a0 " + anomalyCount + " Cohort Alert" + (anomalyCount > 1 ? "s" : "");
            compactStrip.appendChild(s4);
          }
          outerFlex.appendChild(compactStrip);
        } else {
          var hud = document.createElement("div");
          hud.className = "km-hud-scorecard";
          hud.style.display = "grid";
          hud.style.gridTemplateColumns = "repeat(auto-fit, minmax(130px, 1fr))";
          hud.style.gap = "8px";
          hud.style.marginBottom = "8px";
          hud.style.flex = "0 0 auto";

          var kpis = [
            {
              label: "Cohort Observations",
              value: totalObsCount.toLocaleString() + " (" + ((totalEventsCount / Math.max(1, totalObsCount)) * 100).toFixed(0) + "% Events)"
            },
            {
              label: "Median Time-to-Event",
              value: formatMetricValue(overallMedian, valueFormat, timeUnit),
              color: theme.medianLine
            },
            {
              label: "Log-Rank Significance",
              value: logRankText,
              color: logRank && logRank.pValue < 0.05 ? theme.posBadge : theme.text
            },
            {
              label: effectiveTargetVal !== null ? referenceLineLabel : "Leading Cohort",
              value: effectiveTargetVal !== null
                ? (formatMetricValue(effectiveTargetVal, valueFormat, timeUnit) + (anomalyCount > 0 ? " \u2022 " + anomalyCount + " Alert" : " \u2022 On SLA"))
                : (activeResults[0] ? activeResults[0].stratum : "-"),
              color: anomalyCount > 0 ? theme.negBadge : theme.posBadge
            }
          ];

          kpis.forEach(function (c) {
            var card = document.createElement("div");
            card.style.backgroundColor = theme.cardBg;
            card.style.border = "1px solid " + theme.cardBorder;
            card.style.borderRadius = "6px";
            card.style.padding = "6px 10px";
            card.style.boxSizing = "border-box";
            card.style.minWidth = "0";

            var lbl = document.createElement("div");
            lbl.style.fontSize = fSizes.hudLbl;
            lbl.style.textTransform = "uppercase";
            lbl.style.letterSpacing = "0.5px";
            lbl.style.color = theme.subtext;
            lbl.style.fontWeight = "600";
            lbl.style.whiteSpace = "nowrap";
            lbl.style.overflow = "hidden";
            lbl.style.textOverflow = "ellipsis";
            lbl.textContent = c.label;

            var val = document.createElement("div");
            val.style.fontSize = fSizes.hudVal;
            val.style.fontWeight = "700";
            val.style.color = c.color || theme.text;
            val.style.whiteSpace = "nowrap";
            val.style.overflow = "hidden";
            val.style.textOverflow = "ellipsis";
            val.textContent = c.value;

            card.appendChild(lbl);
            card.appendChild(val);
            hud.appendChild(card);
          });

          outerFlex.appendChild(hud);
        }
      }

      // Toolbar: Search + Legend
      if (showSearch || showLegend) {
        var toolbar = document.createElement("div");
        toolbar.style.display = "flex";
        toolbar.style.flexWrap = "wrap";
        toolbar.style.alignItems = "center";
        toolbar.style.justifyContent = "space-between";
        toolbar.style.gap = "8px";
        toolbar.style.marginBottom = "6px";
        toolbar.style.flex = "0 0 auto";

        if (showSearch) {
          var searchWrapper = document.createElement("div");
          searchWrapper.style.display = "flex";
          searchWrapper.style.alignItems = "center";
          searchWrapper.style.backgroundColor = theme.cardBg;
          searchWrapper.style.border = "1px solid " + theme.cardBorder;
          searchWrapper.style.borderRadius = "6px";
          searchWrapper.style.padding = "3px 8px";
          searchWrapper.style.minWidth = "175px";

          var searchIcon = document.createElement("span");
          searchIcon.innerHTML = "&#128269;";
          searchIcon.style.fontSize = "11px";
          searchIcon.style.marginRight = "6px";
          searchIcon.style.opacity = "0.7";

          var searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.placeholder = "Filter cohorts (" + strataOrder.length + ")...";
          searchInput.value = this._searchQuery || "";
          searchInput.style.border = "none";
          searchInput.style.outline = "none";
          searchInput.style.background = "transparent";
          searchInput.style.fontSize = "11px";
          searchInput.style.color = theme.text;
          searchInput.style.width = "100%";

          searchInput.addEventListener("input", function (evt) {
            self._searchQuery = evt.target.value;
            self._render(d3, observations, targetMeasureValues, config, queryResponse, function () {});
          });

          searchWrapper.appendChild(searchIcon);
          searchWrapper.appendChild(searchInput);
          toolbar.appendChild(searchWrapper);
        }

        if (showLegend) {
          var legendDiv = document.createElement("div");
          legendDiv.style.display = "flex";
          legendDiv.style.flexWrap = "wrap";
          legendDiv.style.alignItems = "center";
          legendDiv.style.gap = "6px";

          activeResults.forEach(function (r, idx) {
            var color = r.isOther ? theme.subtext : theme.colors[idx % theme.colors.length];
            var pill = document.createElement("div");
            pill.className = "km-legend-pill";
            pill.style.display = "flex";
            pill.style.alignItems = "center";
            pill.style.gap = "5px";
            pill.style.padding = "3px 8px";
            pill.style.borderRadius = "12px";
            pill.style.fontSize = "11px";
            pill.style.fontWeight = "600";
            pill.style.cursor = "pointer";
            pill.style.userSelect = "none";
            pill.style.border = "1px solid " + color;
            pill.style.transition = "all 0.15s ease";

            var isSelected = self._activeStrata === r.stratum || self._activeStrata === null;
            pill.style.backgroundColor = isSelected ? color + "20" : "transparent";
            pill.style.opacity = isSelected ? "1" : "0.4";

            var dot = document.createElement("div");
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.backgroundColor = color;

            var txt = document.createElement("span");
            txt.style.color = theme.text;
            txt.textContent = r.stratum + " (" + r.total + ")" + (r.isAnomaly ? " \u26a0" : "");

            pill.appendChild(dot);
            pill.appendChild(txt);

            pill.addEventListener("click", function () {
              self._activeStrata = (self._activeStrata === r.stratum) ? null : r.stratum;
              self._render(d3, observations, targetMeasureValues, config, queryResponse, function () {});
            });

            legendDiv.appendChild(pill);
          });

          if (showMedianGuide && (viewMode === "survival" || viewMode === "inverted_churn")) {
            var medPill = document.createElement("div");
            medPill.style.display = "flex";
            medPill.style.alignItems = "center";
            medPill.style.gap = "5px";
            medPill.style.padding = "3px 8px";
            medPill.style.borderRadius = "12px";
            medPill.style.fontSize = "11px";
            medPill.style.fontWeight = "600";
            medPill.style.border = "1px dashed " + theme.medianLine;
            medPill.style.color = theme.medianLine;

            var mLine = document.createElement("div");
            mLine.style.width = "10px";
            mLine.style.height = "2px";
            mLine.style.backgroundColor = theme.medianLine;

            var mTxt = document.createElement("span");
            mTxt.textContent = "Median P50 (50%)";

            medPill.appendChild(mLine);
            medPill.appendChild(mTxt);
            legendDiv.appendChild(medPill);
          }

          toolbar.appendChild(legendDiv);
        }

        outerFlex.appendChild(toolbar);
      }

      // Main Chart Stage + Life Table
      var stage = document.createElement("div");
      stage.style.flex = "1 1 0";
      stage.style.minHeight = "0";
      stage.style.position = "relative";
      stage.style.width = "100%";
      stage.style.overflow = "hidden";
      stage.style.display = "flex";
      stage.style.flexDirection = "column";
      outerFlex.appendChild(stage);

      var rect = stage.getBoundingClientRect();
      var width = Math.max(320, rect.width || stage.clientWidth || 700);
      var totalHeight = Math.max(200, rect.height || stage.clientHeight || 420);

      var riskTableHeight = showRiskTable ? Math.min(125, Math.min(totalHeight * 0.34, (activeResults.length * 19) + 28)) : 0;
      var chartHeight = Math.max(140, totalHeight - riskTableHeight);

      var compactLayout = chartHeight < 220;
      var margin = {
        top: compactLayout ? 14 : 20,
        right: labelDensity !== "hidden" ? 84 : 28,
        bottom: compactLayout ? 26 : 34,
        left: 52
      };
      var plotW = Math.max(120, width - margin.left - margin.right);
      var plotH = Math.max(80, chartHeight - margin.top - margin.bottom);

      var svg = d3.select(stage)
        .append("svg")
        .attr("width", width)
        .attr("height", chartHeight)
        .attr("viewBox", "0 0 " + width + " " + chartHeight)
        .style("display", "block")
        .style("flex", "0 0 auto");

      var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Scales
      var xScale = d3.scaleLinear()
        .domain([0, maxGlobalTime * 1.04])
        .range([0, plotW]);

      var yScale = d3.scaleLinear()
        .domain([0, 1.0])
        .range([plotH, 0]);

      var numHazardBins = 16;
      if (viewMode === "cumulative_hazard") {
        var maxHaz = d3.max(activeResults, function (r) {
          return d3.max(r.curve, function (p) { return p.cumHazard; });
        }) || 2.0;
        yScale.domain([0, maxHaz * 1.1]);
      } else if (viewMode === "hazard_rate") {
        activeResults.forEach(function (r) {
          r.hazardBins = computeHazardRateBins(r, maxGlobalTime, numHazardBins);
        });
        var maxRate = d3.max(activeResults, function (r) {
          return d3.max(r.hazardBins, function (b) { return b.rate; });
        }) || 0.05;
        yScale.domain([0, maxRate * 1.15]);
      }

      // Gridlines
      var xGrid = d3.axisBottom(xScale).ticks(6).tickSize(-plotH).tickFormat("");
      var xGridG = g.append("g")
        .attr("class", "x-grid")
        .attr("transform", "translate(0," + plotH + ")")
        .call(xGrid);
      xGridG.selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");
      xGridG.select(".domain").remove();

      var yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-plotW).tickFormat("");
      var yGridG = g.append("g")
        .attr("class", "y-grid")
        .call(yGrid);
      yGridG.selectAll("line").attr("stroke", theme.grid).attr("stroke-dasharray", "3,3");
      yGridG.select(".domain").remove();

      // Axes
      var xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(function (d) {
        return valueFormat === "auto"
          ? (Math.round(d * 10) / 10) + " " + timeUnit.slice(0, 3)
          : formatMetricValue(d, valueFormat, "");
      });
      var yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(function (d) {
        if (viewMode === "cumulative_hazard") return d.toFixed(2);
        if (viewMode === "hazard_rate") return (d * 100).toFixed(2) + "%";
        return (d * 100).toFixed(0) + "%";
      });

      var xAxisG = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + plotH + ")")
        .call(xAxis);
      xAxisG.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axisLbl);
      xAxisG.selectAll("path, line").attr("stroke", theme.cardBorder);

      var yAxisG = g.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
      yAxisG.selectAll("text").attr("fill", theme.subtext).attr("font-size", fSizes.axisLbl);
      yAxisG.selectAll("path, line").attr("stroke", theme.cardBorder);

      // Target SLA Reference Line + Favorable Zone shading
      if (targetMode !== "none" && effectiveTargetVal !== null && effectiveTargetVal > 0) {
        var targetX = xScale(effectiveTargetVal);
        if (targetX >= 0 && targetX <= plotW) {
          var favX0 = metricPolarity === "lower_is_better" ? 0 : targetX;
          var favW = metricPolarity === "lower_is_better" ? targetX : (plotW - targetX);
          g.append("rect")
            .attr("x", favX0)
            .attr("y", 0)
            .attr("width", Math.max(0, favW))
            .attr("height", plotH)
            .attr("fill", theme.posBadge)
            .attr("fill-opacity", theme.dark ? 0.05 : 0.04)
            .attr("pointer-events", "none");

          g.append("line")
            .attr("x1", targetX)
            .attr("y1", 0)
            .attr("x2", targetX)
            .attr("y2", plotH)
            .attr("stroke", theme.targetLine)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4");

          var anchorRight = targetX > plotW * 0.72;
          g.append("text")
            .attr("x", anchorRight ? targetX - 6 : targetX + 6)
            .attr("y", 13)
            .attr("text-anchor", anchorRight ? "end" : "start")
            .attr("fill", theme.targetLine)
            .attr("font-size", fSizes.axisLbl)
            .attr("font-weight", "700")
            .text(referenceLineLabel + " (" + formatMetricValue(effectiveTargetVal, valueFormat, timeUnit) + ")");
        }
      }

      // Median Benchmark Guide (50%)
      if (showMedianGuide && (viewMode === "survival" || viewMode === "inverted_churn")) {
        var medianY = yScale(0.5);
        g.append("line")
          .attr("x1", 0)
          .attr("y1", medianY)
          .attr("x2", plotW)
          .attr("y2", medianY)
          .attr("stroke", theme.medianLine)
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4,4");

        g.append("text")
          .attr("x", plotW - 6)
          .attr("y", medianY - 5)
          .attr("text-anchor", "end")
          .attr("fill", theme.medianLine)
          .attr("font-size", fSizes.axisLbl)
          .attr("font-weight", "600")
          .text("P50 Median Horizon");
      }

      // Render curves depending on viewMode
      if (viewMode === "hazard_rate") {
        var hazLineGen = d3.line()
          .x(function (d) { return xScale(d.t); })
          .y(function (d) { return yScale(d.rate); })
          .curve(d3.curveMonotoneX);

        var hazAreaGen = d3.area()
          .x(function (d) { return xScale(d.t); })
          .y0(plotH)
          .y1(function (d) { return yScale(d.rate); })
          .curve(d3.curveMonotoneX);

        activeResults.forEach(function (r, idx) {
          var isTarget = self._activeStrata === null || self._activeStrata === r.stratum;
          var color = r.isOther ? theme.subtext : theme.colors[idx % theme.colors.length];
          var stratumGroup = g.append("g").attr("class", "stratum-hazard-" + idx);

          stratumGroup.append("path")
            .datum(r.hazardBins)
            .attr("d", hazAreaGen)
            .attr("fill", color)
            .attr("fill-opacity", isTarget ? Math.max(0.08, ciBandOpacity) : 0.02)
            .attr("pointer-events", "none");

          var hPath = stratumGroup.append("path")
            .datum(r.hazardBins)
            .attr("d", hazLineGen)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", isTarget ? strokeWidth : 1)
            .attr("stroke-opacity", isTarget ? 0.95 : 0.25)
            .style("cursor", "pointer");

          hPath
            .on("mouseenter", function (evt) {
              d3.select(this).attr("stroke-width", strokeWidth + 2);
              self._showStratumTooltip(evt, r, theme, timeUnit, valueFormat, viewMode);
            })
            .on("mousemove", function (evt) { self._moveTooltip(evt); })
            .on("mouseleave", function () {
              d3.select(this).attr("stroke-width", isTarget ? strokeWidth : 1);
              self._hideTooltip();
            })
            .on("click", function (evt) {
              if (r.links && r.links.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: r.links, event: evt });
              }
            });

          // Peak hazard label
          if (labelDensity !== "hidden" && isTarget) {
            var peakBin = r.hazardBins.reduce(function (best, cur) { return cur.rate > best.rate ? cur : best; }, r.hazardBins[0]);
            if (labelDensity === "all" || idx === 0 || idx === activeResults.length - 1) {
              stratumGroup.append("text")
                .attr("x", Math.min(plotW - 4, xScale(peakBin.t) + 4))
                .attr("y", Math.max(12, yScale(peakBin.rate) - 6))
                .attr("fill", color)
                .attr("font-size", fSizes.axisLbl)
                .attr("font-weight", "700")
                .text((peakBin.rate * 100).toFixed(2) + "%/" + timeUnit.slice(0, 1));
            }
          }
        });
      } else {
        var stepCurve = curveInterpolation === "step_after" ? d3.curveStepAfter : curveInterpolation === "monotone" ? d3.curveMonotoneX : d3.curveLinear;

        var areaGen = d3.area()
          .x(function (d) { return xScale(d.t); })
          .y0(function (d) {
            var val = viewMode === "inverted_churn" ? (1 - d.upperCI) : d.lowerCI;
            return yScale(Math.max(0, Math.min(1.0, val)));
          })
          .y1(function (d) {
            var val = viewMode === "inverted_churn" ? (1 - d.lowerCI) : d.upperCI;
            return yScale(Math.max(0, Math.min(1.0, val)));
          })
          .curve(stepCurve);

        var lineGen = d3.line()
          .x(function (d) { return xScale(d.t); })
          .y(function (d) {
            var val = d.s;
            if (viewMode === "inverted_churn") val = 1 - d.s;
            else if (viewMode === "cumulative_hazard") val = d.cumHazard;
            return yScale(val);
          })
          .curve(stepCurve);

        var minMedIdx = 0;
        var maxMedIdx = 0;
        activeResults.forEach(function (r, idx) {
          if (r.medianTime < activeResults[minMedIdx].medianTime) minMedIdx = idx;
          if (r.medianTime > activeResults[maxMedIdx].medianTime) maxMedIdx = idx;
        });

        activeResults.forEach(function (r, idx) {
          var isTarget = self._activeStrata === null || self._activeStrata === r.stratum;
          var color = r.isOther ? theme.subtext : theme.colors[idx % theme.colors.length];
          var stratumGroup = g.append("g").attr("class", "stratum-curve-" + idx);

          if (showConfidenceInterval && (viewMode === "survival" || viewMode === "inverted_churn")) {
            stratumGroup.append("path")
              .datum(r.curve)
              .attr("d", areaGen)
              .attr("fill", color)
              .attr("fill-opacity", isTarget ? ciBandOpacity : 0.02)
              .attr("pointer-events", "none");
          }

          var path = stratumGroup.append("path")
            .datum(r.curve)
            .attr("d", lineGen)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", isTarget ? strokeWidth : 1)
            .attr("stroke-opacity", isTarget ? 0.95 : 0.25)
            .attr("stroke-dasharray", r.isOther ? "5,3" : null)
            .style("cursor", "pointer");

          path
            .on("mouseenter", function (evt) {
              d3.select(this).attr("stroke-width", strokeWidth + 2);
              self._showStratumTooltip(evt, r, theme, timeUnit, valueFormat, viewMode);
            })
            .on("mousemove", function (evt) { self._moveTooltip(evt); })
            .on("mouseleave", function () {
              d3.select(this).attr("stroke-width", isTarget ? strokeWidth : 1);
              self._hideTooltip();
            })
            .on("click", function (evt) {
              if (r.links && r.links.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: r.links, event: evt });
              }
            });

          // End-of-curve data callouts respecting labelDensity
          if (labelDensity !== "hidden" && isTarget && r.curve.length > 0) {
            var showThisLbl = labelDensity === "all" || idx === minMedIdx || idx === maxMedIdx;
            if (showThisLbl) {
              var lastPt = r.curve[r.curve.length - 1];
              var yEnd = viewMode === "inverted_churn" ? (1 - lastPt.s) : (viewMode === "cumulative_hazard" ? lastPt.cumHazard : lastPt.s);
              var lblTxt = viewMode === "cumulative_hazard"
                ? ("H=" + lastPt.cumHazard.toFixed(2))
                : ("P50: " + formatMetricValue(r.medianTime, valueFormat, timeUnit.slice(0, 1)));
              stratumGroup.append("text")
                .attr("x", xScale(lastPt.t) + 6)
                .attr("y", Math.max(10, Math.min(plotH - 4, yScale(yEnd) + 3)))
                .attr("fill", color)
                .attr("font-size", fSizes.axisLbl)
                .attr("font-weight", "700")
                .text(lblTxt);
            }
          }

          // Censored Tick Marks
          if (isTarget && (viewMode === "survival" || viewMode === "inverted_churn")) {
            r.censoredPoints.forEach(function (cp) {
              var cx = xScale(cp.t);
              var yVal = viewMode === "inverted_churn" ? (1 - cp.s) : cp.s;
              var cy = yScale(yVal);

              var tick = stratumGroup.append("line")
                .attr("x1", cx)
                .attr("y1", cy - 4)
                .attr("x2", cx)
                .attr("y2", cy + 4)
                .attr("stroke", color)
                .attr("stroke-width", 1.8)
                .style("cursor", "pointer");

              tick
                .on("mouseenter", function (evt) {
                  self._showCensoredTooltip(evt, cp, r, theme, timeUnit, valueFormat);
                })
                .on("mousemove", function (evt) { self._moveTooltip(evt); })
                .on("mouseleave", function () { self._hideTooltip(); });
            });
          }
        });
      }

      // Aligned At-Risk Life Table
      if (showRiskTable && riskTableHeight > 0) {
        var tableContainer = document.createElement("div");
        tableContainer.className = "km-at-risk-table";
        tableContainer.style.width = "100%";
        tableContainer.style.height = riskTableHeight + "px";
        tableContainer.style.overflowY = "auto";
        tableContainer.style.borderTop = "1px solid " + theme.grid;
        tableContainer.style.padding = "4px 0";
        tableContainer.style.boxSizing = "border-box";
        tableContainer.style.flex = "0 0 auto";
        stage.appendChild(tableContainer);

        var timeTicks = xScale.ticks(6);
        var tbl = document.createElement("table");
        tbl.style.width = "100%";
        tbl.style.borderCollapse = "collapse";
        tbl.style.fontSize = fSizes.tableTxt;

        var thead = document.createElement("thead");
        var headTr = document.createElement("tr");
        headTr.style.color = theme.subtext;
        headTr.style.borderBottom = "1px solid " + theme.cardBorder;

        var th0 = document.createElement("th");
        th0.style.textAlign = "left";
        th0.style.padding = "2px 8px";
        th0.style.width = "140px";
        th0.textContent = "At Risk (Events)";
        headTr.appendChild(th0);

        timeTicks.forEach(function (tk) {
          var th = document.createElement("th");
          th.style.textAlign = "center";
          th.style.padding = "2px 4px";
          th.textContent = tk + " " + timeUnit.slice(0, 3);
          headTr.appendChild(th);
        });
        thead.appendChild(headTr);
        tbl.appendChild(thead);

        var tbody = document.createElement("tbody");
        activeResults.forEach(function (r, rIdx) {
          var color = r.isOther ? theme.subtext : theme.colors[rIdx % theme.colors.length];
          var isTarget = self._activeStrata === null || self._activeStrata === r.stratum;

          var tr = document.createElement("tr");
          tr.style.opacity = isTarget ? "1.0" : "0.4";
          tr.style.color = theme.text;
          tr.style.borderBottom = "1px solid " + theme.cardBorder + "20";
          if (r.links && r.links.length) {
            tr.style.cursor = "pointer";
            tr.addEventListener("click", function (evt) {
              if (window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: r.links, event: evt });
              }
            });
          }

          var tdName = document.createElement("td");
          tdName.style.padding = "2px 8px";
          tdName.style.fontWeight = "600";
          tdName.style.whiteSpace = "nowrap";
          tdName.style.overflow = "hidden";
          tdName.style.textOverflow = "ellipsis";
          tdName.style.maxWidth = "140px";
          tdName.title = r.stratum;
          tdName.innerHTML = "<span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:" + color + ";margin-right:6px;'></span>" + escHtml(r.stratum);
          tr.appendChild(tdName);

          timeTicks.forEach(function (tk) {
            var matchedPt = null;
            for (var pIdx = 0; pIdx < r.curve.length; pIdx++) {
              if (r.curve[pIdx].t <= tk) matchedPt = r.curve[pIdx];
              else break;
            }
            var atRiskVal = matchedPt ? matchedPt.atRisk : 0;
            var evVal = matchedPt ? matchedPt.cumEvents : 0;
            var td = document.createElement("td");
            td.style.textAlign = "center";
            td.style.padding = "2px 4px";
            td.style.fontWeight = "500";
            td.textContent = atRiskVal + " (" + evVal + ")";
            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        tableContainer.appendChild(tbl);
      }

      done();
    },

    _showStratumTooltip: function (evt, r, theme, timeUnit, valueFormat, viewMode) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:13px;margin-bottom:4px;border-bottom:1px solid " + theme.grid + ";padding-bottom:3px;'>" + escHtml(r.stratum) + "</div>";
      html += "<div style='font-size:11px;color:" + theme.subtext + ";margin-bottom:4px;'>Total Observations: <b>" + r.total + "</b> (" + r.events + " Events, " + r.censored + " Censored)</div>";
      html += "<div style='font-size:12px;font-weight:700;color:" + theme.medianLine + ";margin-bottom:2px;'>Median Time: " + escHtml(formatMetricValue(r.medianTime, valueFormat, timeUnit)) + "</div>";
      html += "<div style='font-size:11px;color:" + theme.subtext + ";'>End Survival S(t): <b>" + formatProb(r.endSurvival) + "</b>" + (r.breachPct > 0 ? " \u2022 SLA Breach: <b style='color:" + theme.negBadge + ";'>" + r.breachPct.toFixed(1) + "%</b>" : "") + "</div>";
      if (r.links && r.links.length) {
        html += "<div style='font-size:10px;color:" + theme.subtext + ";margin-top:4px;font-style:italic;'>Click curve to open Looker drill menu</div>";
      }

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _showCensoredTooltip: function (evt, cp, r, theme, timeUnit, valueFormat) {
      var tt = this._tooltip;
      tt.style.backgroundColor = theme.hudBg;
      tt.style.color = theme.text;
      tt.style.border = "1px solid " + theme.cardBorder;

      var html = "<div style='font-weight:700;font-size:12px;color:" + theme.medianLine + ";'>+ Censored Observation</div>";
      html += "<div style='font-size:11px;margin-top:2px;'>Cohort: <b>" + escHtml(r.stratum) + "</b></div>";
      html += "<div style='font-size:11px;'>Time of Censoring: <b>" + escHtml(formatMetricValue(cp.t, valueFormat, timeUnit)) + "</b></div>";
      html += "<div style='font-size:11px;'>Survival at Censoring: <b>" + formatProb(cp.s) + "</b></div>";

      tt.innerHTML = html;
      tt.style.display = "block";
      this._moveTooltip(evt);
    },

    _moveTooltip: function (evt) {
      var tt = this._tooltip;
      var x = evt.pageX + 14;
      var y = evt.pageY - 28;
      var maxW = window.innerWidth - 220;
      if (x > maxW) x = evt.pageX - 200;
      tt.style.left = x + "px";
      tt.style.top = y + "px";
    },

    _hideTooltip: function () {
      if (this._tooltip) {
        this._tooltip.style.display = "none";
      }
    }
  });
})();
