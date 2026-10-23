/**
 * Executive Gantt & Milestones Schedule Timeline - Looker Custom Visualization
 * Built with D3.js v7
 *
 * Inspired by & Directly Solves:
 * - Buganizer Cloud Blocker b/449635128:
 *   "Data Analytics > Looker > Timeline Visualization and Color Formatting based on Measure [Cloud Blocker]"
 * - Buganizer Customer Requirement b/445748812 (Adani Enterprise):
 *   "[Adani] - Support conditional formatting in Timeline visualization"
 * - Internal YAQS & Community Blockers:
 *   go/yeng/1995018768622813184 (rigid date formatting, milestone pins, collapsible swimlanes, 5000+ row rendering)
 */

(function () {
  "use strict";

  function ensureD3(callback) {
    if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleTime === "function") {
      callback(window.d3);
      return;
    }
    var existing = document.querySelector('script[src*="d3.v7"]');
    if (existing) {
      var interval = setInterval(function () {
        if (window.d3 && typeof window.d3.scaleLinear === "function" && typeof window.d3.scaleTime === "function") {
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
      primary: "#1a73e8",
      secondary: "#1e8e3e",
      accent: "#f9ab00",
      danger: "#d93025",
      neutral: "#5f6368",
      milestone: "#9334e6",
      ramp: ["#e8f0fe", "#aecbfa", "#669df6", "#1a73e8", "#174ea6"],
      status: {
        complete: "#1e8e3e",
        completed: "#1e8e3e",
        done: "#1e8e3e",
        shipped: "#1a73e8",
        "in progress": "#1a73e8",
        active: "#1a73e8",
        processing: "#f9ab00",
        planned: "#5f6368",
        pending: "#5f6368",
        delayed: "#d93025",
        blocked: "#d93025",
        cancelled: "#d93025",
        milestone: "#9334e6"
      }
    },
    modern_slate: {
      name: "Modern Slate",
      primary: "#3b82f6",
      secondary: "#10b981",
      accent: "#f59e0b",
      danger: "#ef4444",
      neutral: "#64748b",
      milestone: "#8b5cf6",
      ramp: ["#f1f5f9", "#cbd5e1", "#94a3b8", "#475569", "#0f172a"],
      status: {
        complete: "#10b981",
        completed: "#10b981",
        done: "#10b981",
        shipped: "#3b82f6",
        "in progress": "#3b82f6",
        active: "#3b82f6",
        processing: "#f59e0b",
        planned: "#64748b",
        pending: "#64748b",
        delayed: "#ef4444",
        blocked: "#ef4444",
        cancelled: "#ef4444",
        milestone: "#8b5cf6"
      }
    },
    cyberpunk_dark: {
      name: "Cyberpunk Dark",
      primary: "#00f0ff",
      secondary: "#00ff66",
      accent: "#ffe600",
      danger: "#ff003c",
      neutral: "#7000ff",
      milestone: "#ff007f",
      ramp: ["#050515", "#003b5c", "#00a3cc", "#00f0ff", "#ffffff"],
      status: {
        complete: "#00ff66",
        completed: "#00ff66",
        done: "#00ff66",
        shipped: "#00f0ff",
        "in progress": "#00f0ff",
        active: "#00f0ff",
        processing: "#ffe600",
        planned: "#7000ff",
        pending: "#7000ff",
        delayed: "#ff003c",
        blocked: "#ff003c",
        cancelled: "#ff003c",
        milestone: "#ff007f"
      }
    },
    emerald_finops: {
      name: "Emerald FinOps",
      primary: "#059669",
      secondary: "#10b981",
      accent: "#f59e0b",
      danger: "#ef4444",
      neutral: "#64748b",
      milestone: "#7c3aed",
      ramp: ["#d1fae5", "#6ee7b7", "#10b981", "#059669", "#064e3b"],
      status: {
        complete: "#059669",
        completed: "#059669",
        done: "#059669",
        shipped: "#0284c7",
        "in progress": "#0284c7",
        active: "#0284c7",
        processing: "#f59e0b",
        planned: "#64748b",
        pending: "#64748b",
        delayed: "#ef4444",
        blocked: "#ef4444",
        cancelled: "#ef4444",
        milestone: "#7c3aed"
      }
    },
    sunset_media: {
      name: "Sunset Media",
      primary: "#ea580c",
      secondary: "#16a34a",
      accent: "#d97706",
      danger: "#dc2626",
      neutral: "#78716c",
      milestone: "#9333ea",
      ramp: ["#ffedd5", "#fed7aa", "#fb923c", "#f97316", "#c2410c"],
      status: {
        complete: "#16a34a",
        completed: "#16a34a",
        done: "#16a34a",
        shipped: "#ea580c",
        "in progress": "#ea580c",
        active: "#ea580c",
        processing: "#d97706",
        planned: "#78716c",
        pending: "#78716c",
        delayed: "#dc2626",
        blocked: "#dc2626",
        cancelled: "#dc2626",
        milestone: "#9333ea"
      }
    },
    wellverse_healthcare: {
      name: "Wellverse Healthcare",
      primary: "#0d9488",
      secondary: "#059669",
      accent: "#0284c7",
      danger: "#e11d48",
      neutral: "#475569",
      milestone: "#6366f1",
      ramp: ["#ccfbf1", "#5eead4", "#14b8a6", "#0d9488", "#115e59"],
      status: {
        complete: "#059669",
        completed: "#059669",
        done: "#059669",
        shipped: "#0d9488",
        "in progress": "#0d9488",
        active: "#0d9488",
        processing: "#0284c7",
        planned: "#475569",
        pending: "#475569",
        delayed: "#e11d48",
        blocked: "#e11d48",
        cancelled: "#e11d48",
        milestone: "#6366f1"
      }
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
        primary: prim,
        secondary: pos,
        accent: "#f9ab00",
        danger: neg,
        neutral: "#5f6368",
        milestone: "#9334e6",
        ramp: [pos, prim, neg],
        status: {
          complete: pos,
          completed: pos,
          done: pos,
          shipped: prim,
          "in progress": prim,
          active: prim,
          processing: "#f9ab00",
          planned: "#5f6368",
          pending: "#5f6368",
          delayed: neg,
          blocked: neg,
          cancelled: neg,
          milestone: "#9334e6"
        }
      };
    }
    return COLOR_PALETTES[pKey] || COLOR_PALETTES.google_enterprise;
  }

  function formatMetricValue(val, config, field) {
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
    return Math.abs(val) >= 1000 ? Math.round(val).toLocaleString() : Number(val).toFixed(1);
  }

  var vizConfig = {
    id: "gantt_milestones_timeline",
    label: "Executive Gantt & Milestones Schedule Timeline",
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
          { "Gantt with Progress Fills (%)": "gantt_progress" },
          { "Milestone Pin Roadmap": "milestone_pins" },
          { "Categorical Swimlanes (Phase/Owner)": "swimlane_phases" },
          { "Measure Heatmap / Budget Variance": "metric_heatmap" }
        ],
        default: "gantt_progress",
        order: 1
      },
      time_scale: {
        section: "Display",
        type: "string",
        label: "Time Scale Interval",
        display: "select",
        values: [
          { "Auto-Fit Window": "auto" },
          { "Day Granularity": "day" },
          { "Week Granularity": "week" },
          { "Month Granularity": "month" },
          { "Quarter Granularity": "quarter" }
        ],
        default: "auto",
        order: 2
      },
      group_by_swimlane: {
        section: "Display",
        type: "boolean",
        label: "Group Tasks by Swimlane",
        default: true,
        order: 3
      },
      dimTaskOverride: {
        section: "Display",
        type: "string",
        label: "Task / Deliverable Dimension",
        display: "select",
        values: [{ "Auto / Detect Task Name": "" }],
        default: "",
        order: 4
      },
      dimStartOverride: {
        section: "Display",
        type: "string",
        label: "Start Date Dimension",
        display: "select",
        values: [{ "Auto / Detect Start Date": "" }],
        default: "",
        order: 5
      },
      dimEndOverride: {
        section: "Display",
        type: "string",
        label: "End Date Dimension",
        display: "select",
        values: [{ "Auto / Detect End Date": "" }],
        default: "",
        order: 6
      },
      dimSwimlaneOverride: {
        section: "Display",
        type: "string",
        label: "Swimlane / Workstream Dimension",
        display: "select",
        values: [{ "Auto / Detect Swimlane": "" }],
        default: "",
        order: 7
      },
      dimStatusOverride: {
        section: "Display",
        type: "string",
        label: "Status Dimension",
        display: "select",
        values: [{ "Auto / Detect Status": "" }],
        default: "",
        order: 8
      },
      dimOwnerOverride: {
        section: "Display",
        type: "string",
        label: "Owner / Lead Dimension",
        display: "select",
        values: [{ "Auto / Detect Owner": "" }],
        default: "",
        order: 9
      },
      dimPriorityOverride: {
        section: "Display",
        type: "string",
        label: "Priority Tier Dimension",
        display: "select",
        values: [{ "Auto / Detect Priority": "" }],
        default: "",
        order: 10
      },
      measureProgressOverride: {
        section: "Display",
        type: "string",
        label: "Progress % Measure / Field",
        display: "select",
        values: [{ "Auto / Detect Completion %": "" }],
        default: "",
        order: 11
      },
      measureValueOverride: {
        section: "Display",
        type: "string",
        label: "Primary Budget / Cost Measure",
        display: "select",
        values: [{ "Auto / First Measure": "" }],
        default: "",
        order: 12
      },
      targetMeasureOverride: {
        section: "Display",
        type: "string",
        label: "Target / Comparison Measure",
        display: "select",
        values: [{ "None / Fixed Target": "" }],
        default: "",
        order: 13
      },
      target_mode: {
        section: "Display",
        type: "string",
        label: "Target Benchmark Mode",
        display: "select",
        values: [
          { "None / No Benchmark": "none" },
          { "Measure Column": "measure_col" },
          { "Fixed Custom Value": "fixed" },
          { "Dataset Mean": "mean" },
          { "Dataset Median": "median" },
          { "Percentile P75": "p75" },
          { "Percentile P90": "p90" }
        ],
        default: "none",
        order: 14
      },
      custom_target_value: {
        section: "Display",
        type: "number",
        label: "Custom Target Value",
        default: 0,
        order: 15
      },
      target_reference_label: {
        section: "Display",
        type: "string",
        label: "Target Reference Label",
        default: "Budget Target Cap",
        order: 16
      },
      highlight_anomalies: {
        section: "Display",
        type: "boolean",
        label: "Alert on Cost / Schedule Anomalies",
        default: true,
        order: 17
      },
      anomaly_threshold_stddev: {
        section: "Display",
        type: "string",
        label: "Anomaly Variance Sensitivity",
        display: "select",
        values: [
          { "1.0 Sigma (Top 16% Outliers)": "1.0" },
          { "1.5 Sigma (Top 7% Outliers)": "1.5" },
          { "2.0 Sigma (Top 2.5% Outliers)": "2.0" },
          { "2.5 Sigma (Top 0.6% Outliers)": "2.5" }
        ],
        default: "2.0",
        order: 18
      },
      sort_order: {
        section: "Display",
        type: "string",
        label: "Sort Tasks By",
        display: "select",
        values: [
          { "Start Date (Earliest First)": "start_asc" },
          { "Start Date (Latest First)": "start_desc" },
          { "Duration / Days (Longest First)": "duration_desc" },
          { "Task Name (A - Z)": "name_asc" },
          { "Progress % (Lowest First)": "progress_asc" },
          { "Metric / Value (Highest First)": "metric_desc" }
        ],
        default: "start_asc",
        order: 19
      },
      top_n_limit: {
        section: "Display",
        type: "string",
        label: "Top-N Tasks Filter",
        display: "select",
        values: [
          { "All Tasks (No Limit)": "all" },
          { "Top 10 Tasks": "10" },
          { "Top 25 Tasks": "25" },
          { "Top 50 Tasks": "50" },
          { "Top 100 Tasks": "100" }
        ],
        default: "all",
        order: 20
      },
      top_n_rollup_other: {
        section: "Display",
        type: "boolean",
        label: "Roll up Other Tasks into Aggregate",
        default: false,
        order: 21
      },
      suppress_null_dates: {
        section: "Display",
        type: "boolean",
        label: "Suppress Tasks with Missing Dates",
        default: true,
        order: 22
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
        order: 23
      },
      label_density: {
        section: "Display",
        type: "string",
        label: "Task Bar Label Density",
        display: "select",
        values: [
          { "All Task Labels": "all" },
          { "Min/Max & Key Milestones Only": "peaks" },
          { "Hidden (Tooltips Only)": "hidden" }
        ],
        default: "all",
        order: 24
      },
      custom_title_override: {
        section: "Display",
        type: "string",
        label: "Custom Chart Title Override",
        default: "",
        order: 25
      },
      custom_subtitle_override: {
        section: "Display",
        type: "string",
        label: "Custom Subtitle Override",
        default: "",
        order: 26
      },
      show_search_bar: {
        section: "Display",
        type: "boolean",
        label: "Show Live Search & Filter Bar",
        default: true,
        order: 27
      },
      show_today_line: {
        section: "Display",
        type: "boolean",
        label: "Show Current Date (Today) Line",
        default: true,
        order: 28
      },
      show_milestones: {
        section: "Display",
        type: "boolean",
        label: "Render Milestone Diamond Pins",
        default: true,
        order: 29
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
        label: "Custom Positive / Done Hex",
        display: "color",
        default: "#1e8e3e",
        order: 3
      },
      custom_negative_hex: {
        section: "Style",
        type: "string",
        label: "Custom Negative / Blocked Hex",
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
          { "Higher is Better (Completion, Budget Value)": "higher_is_better" },
          { "Lower is Better (Cost Overrun, Delay, Risk)": "lower_is_better" }
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
      heatmap_metric_mode: {
        section: "Style",
        type: "string",
        label: "Measure Heatmap Color Rule",
        display: "select",
        values: [
          { "Continuous Sequential Gradient": "gradient" },
          { "3-Tier Threshold (Green / Yellow / Red)": "threshold" },
          { "Diverging Variance (Blue to Red)": "diverging" }
        ],
        default: "gradient",
        order: 8
      },
      bar_corner_radius: {
        section: "Style",
        type: "number",
        label: "Bar Corner Radius (px)",
        display: "range",
        min: 0,
        max: 12,
        step: 1,
        default: 5,
        order: 9
      },
      bar_height: {
        section: "Style",
        type: "number",
        label: "Bar Thickness (px)",
        display: "range",
        min: 16,
        max: 36,
        step: 2,
        default: 22,
        order: 10
      },
      show_gridlines: {
        section: "Style",
        type: "boolean",
        label: "Show Vertical Date Gridlines",
        default: true,
        order: 11
      },
      theme_mode: {
        section: "Style",
        type: "string",
        label: "Theme & Surface",
        display: "select",
        values: [
          { "Crisp Clean Light": "light" },
          { "Subtle Glass / Slate": "glass" }
        ],
        default: "light",
        order: 12
      }
    },

    create: function (element, config) {
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      element.innerHTML = "";

      var container = document.createElement("div");
      container.className = "looker-gantt-root";
      container.style.cssText = "display: flex; flex-direction: column; width: 100%; height: 100%; background: #ffffff; color: #202124; position: relative; overflow: hidden;";
      element.appendChild(container);

      this._container = container;
      this._searchTerm = "";
      this._collapsedSwimlanes = {};

      var tooltip = document.createElement("div");
      tooltip.className = "gantt-tooltip";
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
          message: "Query returned no data to render the Executive Gantt Timeline."
        });
        done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      // Dynamic field registration
      if (this.trigger) {
        try {
          var dimOptions = [{ "Auto / Detect Task Name": "" }];
          var measOptions = [{ "Auto / First Measure": "" }];
          dims.forEach(function (d) {
            var opt = {};
            opt[d.label_short || d.label || d.name] = d.name;
            dimOptions.push(opt);
          });
          meas.forEach(function (m) {
            var opt = {};
            opt[m.label_short || m.label || m.name] = m.name;
            measOptions.push(opt);
          });

          this.trigger("registerOptions", {
            dimTaskOverride: { values: dimOptions },
            dimStartOverride: { values: [{ "Auto / Detect Start Date": "" }].concat(dimOptions.slice(1)) },
            dimEndOverride: { values: [{ "Auto / Detect End Date": "" }].concat(dimOptions.slice(1)) },
            dimSwimlaneOverride: { values: [{ "Auto / Detect Swimlane": "" }].concat(dimOptions.slice(1)) },
            dimStatusOverride: { values: [{ "Auto / Detect Status": "" }].concat(dimOptions.slice(1)) },
            dimOwnerOverride: { values: [{ "Auto / Detect Owner": "" }].concat(dimOptions.slice(1)) },
            dimPriorityOverride: { values: [{ "Auto / Detect Priority": "" }].concat(dimOptions.slice(1)) },
            measureProgressOverride: { values: [{ "Auto / Detect Completion %": "" }].concat(measOptions.slice(1)) },
            measureValueOverride: { values: measOptions },
            targetMeasureOverride: { values: [{ "None / Fixed Target": "" }].concat(measOptions.slice(1)) }
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
          console.error("Gantt Milestones Timeline Render Error:", err);
          self.addError({
            title: "Render Exception",
            message: err.message || "An error occurred while rendering the timeline visualization."
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
      var isGlass = config.theme_mode === "glass";
      var bgColor = isGlass ? "#f8fafc" : "#ffffff";
      container.style.background = bgColor;

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];

      var dateDims = [];
      var catDims = [];

      dims.forEach(function (d) {
        var nameLower = d.name.toLowerCase();
        var labelLower = (d.label || "").toLowerCase();
        var isDateLike = d.type === "date" || d.type === "date_date" || d.type === "date_time" ||
                         nameLower.indexOf("date") !== -1 || nameLower.indexOf("time") !== -1 ||
                         nameLower.indexOf("month") !== -1 || nameLower.indexOf("year") !== -1 ||
                         nameLower.indexOf("created") !== -1 || nameLower.indexOf("shipped") !== -1 ||
                         nameLower.indexOf("delivered") !== -1 || labelLower.indexOf("date") !== -1;

        if (isDateLike) {
          dateDims.push(d);
        } else {
          catDims.push(d);
        }
      });

      // Field mapping with user overrides
      var nameField = null;
      if (config.dimTaskOverride) {
        nameField = dims.find(function (d) { return d.name === config.dimTaskOverride; });
      }
      if (!nameField) {
        catDims.forEach(function (d) {
          var n = d.name.toLowerCase();
          if (!nameField && (n.indexOf("task_name") !== -1 || n.indexOf("event_name") !== -1 || n.indexOf("campaign_name") !== -1 || n.indexOf("title") !== -1 || n.indexOf("name") !== -1)) {
            nameField = d;
          }
        });
        if (!nameField) nameField = catDims.length > 0 ? catDims[0] : (dims.length > 0 ? dims[0] : null);
      }

      var startDateField = null;
      if (config.dimStartOverride) {
        startDateField = dims.find(function (d) { return d.name === config.dimStartOverride; });
      }
      if (!startDateField) {
        startDateField = dateDims.length > 0 ? dateDims[0] : null;
      }

      var endDateField = null;
      if (config.dimEndOverride) {
        endDateField = dims.find(function (d) { return d.name === config.dimEndOverride; });
      }
      if (!endDateField) {
        endDateField = dateDims.length > 1 ? dateDims[1] : null;
      }

      var groupField = null;
      if (config.dimSwimlaneOverride) {
        groupField = dims.find(function (d) { return d.name === config.dimSwimlaneOverride; });
      }
      if (!groupField) {
        catDims.forEach(function (d) {
          var n = d.name.toLowerCase();
          if (!groupField && d !== nameField && (n.indexOf("workstream") !== -1 || n.indexOf("swimlane") !== -1 || n.indexOf("category") !== -1 || n.indexOf("department") !== -1 || n.indexOf("phase") !== -1)) {
            groupField = d;
          }
        });
        if (!groupField && catDims.length > 1) {
          for (var c = 0; c < catDims.length; c++) {
            if (catDims[c] !== nameField) {
              groupField = catDims[c];
              break;
            }
          }
        }
      }

      var statusField = null;
      if (config.dimStatusOverride) {
        statusField = dims.find(function (d) { return d.name === config.dimStatusOverride; });
      }
      if (!statusField) {
        catDims.forEach(function (d) {
          var n = d.name.toLowerCase();
          if (!statusField && (n.indexOf("status") !== -1 || n.indexOf("state") !== -1 || n.indexOf("stage") !== -1)) {
            statusField = d;
          }
        });
        if (!statusField) statusField = groupField;
      }

      var ownerField = null;
      if (config.dimOwnerOverride) {
        ownerField = dims.find(function (d) { return d.name === config.dimOwnerOverride; });
      }
      if (!ownerField) {
        catDims.forEach(function (d) {
          var n = d.name.toLowerCase();
          if (!ownerField && (n.indexOf("owner") !== -1 || n.indexOf("lead") !== -1 || n.indexOf("rep") !== -1 || n.indexOf("assignee") !== -1)) {
            ownerField = d;
          }
        });
      }

      var priorityField = null;
      if (config.dimPriorityOverride) {
        priorityField = dims.find(function (d) { return d.name === config.dimPriorityOverride; });
      }
      if (!priorityField) {
        catDims.forEach(function (d) {
          var n = d.name.toLowerCase();
          if (!priorityField && (n.indexOf("priority") !== -1 || n.indexOf("tier") !== -1 || n.indexOf("severity") !== -1)) {
            priorityField = d;
          }
        });
      }

      var progressField = null;
      if (config.measureProgressOverride) {
        progressField = meas.find(function (m) { return m.name === config.measureProgressOverride; }) ||
                        dims.find(function (d) { return d.name === config.measureProgressOverride; });
      }
      if (!progressField) {
        meas.forEach(function (m) {
          var mn = m.name.toLowerCase();
          if (!progressField && (mn.indexOf("completion") !== -1 || mn.indexOf("progress") !== -1 || mn.indexOf("pct") !== -1 || mn.indexOf("rate") !== -1)) {
            progressField = m;
          }
        });
      }

      var metricField = null;
      if (config.measureValueOverride) {
        metricField = meas.find(function (m) { return m.name === config.measureValueOverride; });
      }
      if (!metricField) {
        meas.forEach(function (m) {
          if (!metricField && m !== progressField) {
            metricField = m;
          }
        });
        if (!metricField && meas.length > 0) metricField = meas[0];
      }

      var targetField = null;
      if (config.targetMeasureOverride) {
        targetField = meas.find(function (m) { return m.name === config.targetMeasureOverride; });
      }

      if (!startDateField && dims.length > 0) {
        for (var i = 0; i < dims.length; i++) {
          var sampleVal = data[0][dims[i].name] ? data[0][dims[i].name].value : null;
          if (sampleVal && !isNaN(Date.parse(sampleVal))) {
            startDateField = dims[i];
            break;
          }
        }
      }

      if (!nameField || !startDateField) {
        this.addError({
          title: "Required Fields Missing",
          message: "Include at least 1 Deliverable/Task Name dimension and 1 Start Date dimension."
        });
        return;
      }

      // Parse data rows
      var parsedTasks = [];
      var metricValues = [];
      var totalTasksCount = 0;
      var completedCount = 0;
      var activeCount = 0;
      var delayedCount = 0;
      var milestoneCount = 0;
      var totalDurationDays = 0;
      var totalMetricSum = 0;
      var longestTaskNameLen = 18;

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var taskNameCell = row[nameField.name];
        var taskName = (taskNameCell && taskNameCell.value != null) ? String(taskNameCell.value) : "Deliverable " + (r + 1);
        if (taskName.length > longestTaskNameLen) longestTaskNameLen = taskName.length;

        var groupVal = "General Roadmap";
        if (groupField && row[groupField.name] && row[groupField.name].value != null) {
          groupVal = String(row[groupField.name].value);
        }

        var statusVal = groupVal;
        if (statusField && row[statusField.name] && row[statusField.name].value != null) {
          statusVal = String(row[statusField.name].value);
        }

        var ownerVal = "";
        if (ownerField && row[ownerField.name] && row[ownerField.name].value != null) {
          ownerVal = String(row[ownerField.name].value);
        }

        var priorityVal = "";
        if (priorityField && row[priorityField.name] && row[priorityField.name].value != null) {
          priorityVal = String(row[priorityField.name].value);
        }

        var startRaw = row[startDateField.name] ? row[startDateField.name].value : null;
        var endRaw = endDateField && row[endDateField.name] ? row[endDateField.name].value : null;

        var startDate = startRaw ? new Date(String(startRaw).length === 10 ? startRaw + "T12:00:00" : startRaw) : null;
        if (!startDate || isNaN(startDate.getTime())) {
          if (config.suppress_null_dates) continue;
          startDate = new Date();
        }

        var endDate = endRaw ? new Date(String(endRaw).length === 10 ? endRaw + "T12:00:00" : endRaw) : null;
        var isMilestone = statusVal.toLowerCase().indexOf("milestone") !== -1 || taskName.toLowerCase().indexOf("[milestone]") !== -1;

        if (!endDate || isNaN(endDate.getTime())) {
          endDate = new Date(startDate.getTime() + (7 * 86400000));
          isMilestone = true;
        } else if (Math.abs(endDate.getTime() - startDate.getTime()) < 43200000) {
          isMilestone = true;
          endDate = new Date(startDate.getTime());
        }

        var durationDays = isMilestone ? 0 : Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
        totalDurationDays += durationDays;
        totalTasksCount++;

        var metricVal = 0;
        var metricRendered = "";
        if (metricField && row[metricField.name]) {
          metricVal = Number(row[metricField.name].value) || 0;
          metricRendered = formatMetricValue(metricVal, config, metricField);
          metricValues.push(metricVal);
          totalMetricSum += metricVal;
        }

        var progressPct = 0;
        var statusLower = statusVal.toLowerCase();
        if (progressField && row[progressField.name] && row[progressField.name].value != null && !isNaN(Number(row[progressField.name].value))) {
          var rawP = Number(row[progressField.name].value);
          progressPct = (rawP > 0 && rawP <= 1) ? Math.round(rawP * 100) : Math.min(100, Math.max(0, Math.round(rawP)));
        } else {
          if (statusLower.indexOf("complete") !== -1 || statusLower.indexOf("done") !== -1 || statusLower.indexOf("shipped") !== -1) {
            progressPct = 100;
          } else if (statusLower.indexOf("in progress") !== -1 || statusLower.indexOf("active") !== -1) {
            progressPct = 70;
          } else if (statusLower.indexOf("delay") !== -1 || statusLower.indexOf("block") !== -1) {
            progressPct = 40;
          } else {
            progressPct = 10;
          }
        }

        if (isMilestone) {
          milestoneCount++;
        } else if (progressPct >= 100 || statusLower.indexOf("complete") !== -1 || statusLower.indexOf("done") !== -1) {
          completedCount++;
        } else if (statusLower.indexOf("delay") !== -1 || statusLower.indexOf("blocked") !== -1) {
          delayedCount++;
        } else {
          activeCount++;
        }

        var drillLinks = [];
        if (taskNameCell && taskNameCell.links) drillLinks = drillLinks.concat(taskNameCell.links);
        if (row[startDateField.name] && row[startDateField.name].links) drillLinks = drillLinks.concat(row[startDateField.name].links);
        if (metricField && row[metricField.name] && row[metricField.name].links) drillLinks = drillLinks.concat(row[metricField.name].links);

        parsedTasks.push({
          id: "task-" + r,
          index: r,
          name: taskName,
          group: groupVal,
          status: statusVal,
          owner: ownerVal,
          priority: priorityVal,
          startDate: startDate,
          endDate: endDate,
          durationDays: durationDays,
          progress: progressPct,
          isMilestone: isMilestone,
          metricVal: metricVal,
          metricRendered: metricRendered,
          metricLabel: metricField ? (metricField.label_short || metricField.label || metricField.name) : "Value",
          drillLinks: drillLinks,
          rowRaw: row
        });
      }

      if (parsedTasks.length === 0) {
        this.addError({
          title: "No Valid Tasks",
          message: "All rows contained invalid or missing date parameters."
        });
        return;
      }

      // Statistical targets and anomaly alerts
      var targetValue = null;
      var targetMode = config.target_mode || "none";
      if (targetMode === "fixed") {
        targetValue = Number(config.custom_target_value) || 0;
      } else if (targetMode === "mean" && metricValues.length) {
        targetValue = d3.mean(metricValues);
      } else if (targetMode === "median" && metricValues.length) {
        targetValue = d3.median(metricValues);
      } else if (targetMode === "p75" && metricValues.length) {
        targetValue = d3.quantile(metricValues.slice().sort(d3.ascending), 0.75);
      } else if (targetMode === "p90" && metricValues.length) {
        targetValue = d3.quantile(metricValues.slice().sort(d3.ascending), 0.90);
      } else if (targetMode === "measure_col" && targetField) {
        var tVals = data.map(function(r) { return r[targetField.name] ? Number(r[targetField.name].value) : null; }).filter(function(v) { return v != null && !isNaN(v); });
        if (tVals.length) targetValue = d3.mean(tVals);
      }

      var metricMean = metricValues.length ? d3.mean(metricValues) : 0;
      var metricStd = metricValues.length ? d3.deviation(metricValues) || 0 : 0;
      var anomalyThresholdMultiplier = parseFloat(config.anomaly_threshold_stddev || "2.0");
      var anomalyCutoff = metricMean + (anomalyThresholdMultiplier * metricStd);

      parsedTasks.forEach(function (t) {
        t.isAnomaly = false;
        if (config.highlight_anomalies) {
          if (config.metric_polarity === "lower_is_better") {
            t.isAnomaly = t.metricVal > anomalyCutoff || t.status.toLowerCase().indexOf("delay") !== -1;
          } else {
            t.isAnomaly = (t.metricVal > anomalyCutoff) || (t.progress < 30 && t.durationDays > 30);
          }
        }
      });

      // Sorting
      var sortOrder = config.sort_order || "start_asc";
      if (sortOrder === "start_asc") {
        parsedTasks.sort(function (a, b) { return a.startDate - b.startDate; });
      } else if (sortOrder === "start_desc") {
        parsedTasks.sort(function (a, b) { return b.startDate - a.startDate; });
      } else if (sortOrder === "duration_desc") {
        parsedTasks.sort(function (a, b) { return b.durationDays - a.durationDays; });
      } else if (sortOrder === "name_asc") {
        parsedTasks.sort(function (a, b) { return a.name.localeCompare(b.name); });
      } else if (sortOrder === "progress_asc") {
        parsedTasks.sort(function (a, b) { return a.progress - b.progress; });
      } else if (sortOrder === "metric_desc") {
        parsedTasks.sort(function (a, b) { return b.metricVal - a.metricVal; });
      }

      // Top-N Filtering
      var topN = config.top_n_limit && config.top_n_limit !== "all" ? parseInt(config.top_n_limit, 10) : 0;
      if (topN > 0 && parsedTasks.length > topN) {
        if (config.top_n_rollup_other) {
          var kept = parsedTasks.slice(0, topN);
          var rest = parsedTasks.slice(topN);
          var oStart = d3.min(rest, function (t) { return t.startDate; });
          var oEnd = d3.max(rest, function (t) { return t.endDate; });
          var oMetric = d3.sum(rest, function (t) { return t.metricVal; });
          var oProgress = Math.round(d3.mean(rest, function (t) { return t.progress; }));
          kept.push({
            id: "task-other",
            index: 99999,
            name: "Other Tasks (" + rest.length + " aggregated)",
            group: "Other",
            status: "In Progress",
            owner: "Team Pool",
            priority: "Medium",
            startDate: oStart,
            endDate: oEnd,
            durationDays: Math.max(1, Math.round((oEnd - oStart) / 86400000)),
            progress: oProgress,
            isMilestone: false,
            metricVal: oMetric,
            metricRendered: formatMetricValue(oMetric, config, metricField),
            metricLabel: "Aggregated Metric",
            drillLinks: [],
            isOtherRollup: true,
            isAnomaly: false
          });
          parsedTasks = kept;
        } else {
          parsedTasks = parsedTasks.slice(0, topN);
        }
      }

      // Search Filtering
      var visibleTasks = parsedTasks;
      if (this._searchTerm && this._searchTerm.trim() !== "") {
        var st = this._searchTerm.toLowerCase().trim();
        visibleTasks = parsedTasks.filter(function (t) {
          return t.name.toLowerCase().indexOf(st) !== -1 ||
                 t.group.toLowerCase().indexOf(st) !== -1 ||
                 t.status.toLowerCase().indexOf(st) !== -1 ||
                 t.owner.toLowerCase().indexOf(st) !== -1;
        });
      }

      // Global Date Extents
      var globalMinDate = d3.min(visibleTasks, function (t) { return t.startDate.getTime(); });
      var globalMaxDate = d3.max(visibleTasks, function (t) { return t.endDate.getTime(); });
      var datePadding = Math.max(86400000 * 3, (globalMaxDate - globalMinDate) * 0.04);
      var domainStart = new Date(globalMinDate - datePadding);
      var domainEnd = new Date(globalMaxDate + datePadding);

      // Swimlane grouping
      var swimlanes = [];
      var swimlaneMap = {};
      var groupBySwimlane = config.group_by_swimlane !== false && config.layout_mode !== "milestone_pins";

      visibleTasks.forEach(function (t) {
        var sKey = groupBySwimlane ? t.group : "All Deliverables";
        if (!swimlaneMap[sKey]) {
          swimlaneMap[sKey] = {
            name: sKey,
            tasks: []
          };
          swimlanes.push(swimlaneMap[sKey]);
        }
        swimlaneMap[sKey].tasks.push(t);
      });

      // 1. HEADER / SEARCH BAR
      var headerBar = document.createElement("div");
      headerBar.className = "gantt-header-bar";
      headerBar.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 18px 8px 18px; border-bottom: 1px solid #e2e8f0; background: " + (isGlass ? "rgba(248,250,252,0.85)" : "#ffffff") + "; flex-shrink: 0; gap: 16px; flex-wrap: wrap;";

      var titleGroup = document.createElement("div");
      titleGroup.style.cssText = "display: flex; flex-direction: column; gap: 2px;";

      var titleElem = document.createElement("div");
      titleElem.style.cssText = "font-size: 15px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;";
      var customTitle = config.custom_title_override || "Executive Gantt & Milestones Schedule Timeline";
      titleElem.innerHTML = "<span>🗓️</span> <span>" + customTitle + "</span>";

      var subtitleElem = document.createElement("div");
      subtitleElem.style.cssText = "font-size: 11px; color: #64748b; font-weight: 500;";
      var customSubtitle = config.custom_subtitle_override || ("Tracking " + totalTasksCount + " deliverable initiatives across " + swimlanes.length + " program workstreams");
      subtitleElem.textContent = customSubtitle;

      titleGroup.appendChild(titleElem);
      titleGroup.appendChild(subtitleElem);
      headerBar.appendChild(titleGroup);

      if (config.show_search_bar !== false) {
        var searchGroup = document.createElement("div");
        searchGroup.style.cssText = "display: flex; align-items: center; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 20px; padding: 4px 12px; gap: 6px; width: 220px;";
        searchGroup.innerHTML = "<span style='color:#94a3b8; font-size:12px;'>🔍</span>";

        var searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "Search task, lead, status...";
        searchInput.value = this._searchTerm || "";
        searchInput.style.cssText = "border: none; background: transparent; outline: none; font-size: 11.5px; width: 100%; color: #1e293b;";
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
        hudBar.className = "gantt-hud-bar";

        var overallPct = Math.round(d3.mean(parsedTasks, function (t) { return t.progress; }) || 0);
        var totalBudgetStr = formatMetricValue(totalMetricSum, config, metricField);
        var avgDurationStr = Math.round(d3.mean(parsedTasks, function (t) { return t.durationDays; }) || 0) + "d";

        if (hudDensity === "compact") {
          hudBar.style.cssText = "display: flex; align-items: center; gap: 14px; padding: 6px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569; overflow-x: auto; flex-shrink: 0;";
          hudBar.innerHTML = 
            "<span><b>Total Deliverables:</b> " + totalTasksCount + "</span> • " +
            "<span><b>Active Sprints:</b> <span style='color:#1a73e8;font-weight:700;'>" + activeCount + "</span></span> • " +
            "<span><b>Completed:</b> <span style='color:#1e8e3e;font-weight:700;'>" + completedCount + "</span></span> • " +
            "<span><b>Delayed:</b> <span style='color:#d93025;font-weight:700;'>" + delayedCount + "</span></span> • " +
            "<span><b>Avg Progress:</b> <span style='color:#1e8e3e;font-weight:700;'>" + overallPct + "%</span></span> • " +
            "<span><b>Total Budget:</b> <span style='font-weight:700;color:#0f172a;'>" + totalBudgetStr + "</span></span>" +
            (targetValue ? " • <span><b>Target:</b> " + formatMetricValue(targetValue, config, metricField) + "</span>" : "");
        } else {
          hudBar.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; padding: 10px 18px; background: " + (isGlass ? "rgba(241,245,249,0.6)" : "#f8fafc") + "; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;";

          var kpis = [
            { label: "Total Initiatives", val: totalTasksCount, sub: swimlanes.length + " Workstreams", color: "#0f172a", icon: "📋" },
            { label: "Active In Flight", val: activeCount, sub: milestoneCount + " Milestones", color: palette.primary, icon: "⚡" },
            { label: "Completed / Shipped", val: completedCount, sub: overallPct + "% Avg Completion", color: palette.secondary, icon: "✅" },
            { label: "At Risk / Delayed", val: delayedCount, sub: "Requires SLA Attention", color: delayedCount > 0 ? palette.danger : "#64748b", icon: "⚠️" },
            { label: "Program Capital Budget", val: totalBudgetStr, sub: "Avg Task: " + avgDurationStr, color: "#1e293b", icon: "💵" }
          ];

          if (targetValue != null) {
            kpis.push({
              label: config.target_reference_label || "Budget Target",
              val: formatMetricValue(targetValue, config, metricField),
              sub: (totalMetricSum > targetValue ? "Over Budget Cap" : "Within Budget Cap"),
              color: totalMetricSum > targetValue ? palette.danger : palette.secondary,
              icon: "🎯"
            });
          }

          kpis.forEach(function (k) {
            var card = document.createElement("div");
            card.style.cssText = "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);";
            card.innerHTML = 
              "<div style='font-size: 10.5px; color: #64748b; font-weight: 600; display:flex; align-items:center; gap:4px;'><span>" + k.icon + "</span> " + k.label + "</div>" +
              "<div style='font-size: 17px; font-weight: 800; color: " + k.color + ";'>" + k.val + "</div>" +
              "<div style='font-size: 10px; color: #94a3b8; font-weight: 500;'>" + k.sub + "</div>";
            hudBar.appendChild(card);
          });
        }

        container.appendChild(hudBar);
      }

      // 3. MAIN TIMELINE SCROLL AREA
      var scrollWrapper = document.createElement("div");
      scrollWrapper.className = "gantt-scroll-wrapper";
      scrollWrapper.style.cssText = "flex: 1; width: 100%; overflow-y: auto; overflow-x: hidden; position: relative;";
      container.appendChild(scrollWrapper);

      var containerW = container.clientWidth || 900;
      var labelColumnWidth = Math.min(320, Math.max(220, longestTaskNameLen * 7.5 + 40));
      var timelineWidth = Math.max(500, containerW - labelColumnWidth - 24);
      var chartWidth = labelColumnWidth + timelineWidth;

      // Color scale for metric heatmap mode
      var metricColorScale = null;
      if (metricValues.length > 0) {
        var minMetric = d3.min(metricValues);
        var maxMetric = d3.max(metricValues);
        if (minMetric === maxMetric) maxMetric += 1;

        if (config.heatmap_metric_mode === "threshold") {
          var p33 = minMetric + (maxMetric - minMetric) * 0.33;
          var p66 = minMetric + (maxMetric - minMetric) * 0.66;
          metricColorScale = function (v) {
            if (config.metric_polarity === "lower_is_better") {
              return v <= p33 ? palette.secondary : (v <= p66 ? palette.accent : palette.danger);
            }
            return v <= p33 ? palette.danger : (v <= p66 ? palette.accent : palette.secondary);
          };
        } else if (config.heatmap_metric_mode === "diverging") {
          var mid = (minMetric + maxMetric) / 2;
          metricColorScale = d3.scaleDiverging(d3.interpolateRdYlBu).domain([maxMetric, mid, minMetric]);
        } else {
          metricColorScale = d3.scaleSequential(d3.interpolateBlues).domain([minMetric, maxMetric]);
        }
      }

      var timeScale = d3.scaleTime()
        .domain([domainStart, domainEnd])
        .range([0, timelineWidth]);

      // Calculate total rows and height
      var rowH = config.bar_height ? parseInt(config.bar_height, 10) + 12 : 34;
      var barH = config.bar_height ? parseInt(config.bar_height, 10) : 22;
      var swimlaneHeaderH = 30;
      var axisHeaderH = 34;

      var totalContentHeight = axisHeaderH;
      swimlanes.forEach(function (lane) {
        if (groupBySwimlane) totalContentHeight += swimlaneHeaderH;
        var isCollapsed = self._collapsedSwimlanes[lane.name];
        if (!isCollapsed) {
          totalContentHeight += lane.tasks.length * rowH;
        }
      });
      totalContentHeight += 30;

      // SVG Canvas
      var svg = d3.select(scrollWrapper)
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", Math.max(container.clientHeight - 80, totalContentHeight))
        .style("display", "block");

      // Defs (Gradients and Shadows)
      var defs = svg.append("defs");
      var filter = defs.append("filter")
        .attr("id", "gantt-shadow")
        .attr("height", "140%")
        .attr("width", "140%")
        .attr("x", "-20%")
        .attr("y", "-20%");
      filter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 2).attr("result", "blur");
      filter.append("feOffset").attr("in", "blur").attr("dx", 0).attr("dy", 1).attr("result", "offsetBlur");
      filter.append("feComponentTransfer").append("feFuncA").attr("type", "linear").attr("slope", 0.16);
      var feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      var gridLayer = svg.append("g").attr("class", "grid-layer").attr("transform", "translate(" + labelColumnWidth + ",0)");
      var rowsLayer = svg.append("g").attr("class", "rows-layer");
      var barsLayer = svg.append("g").attr("class", "bars-layer").attr("transform", "translate(" + labelColumnWidth + ",0)");
      var labelsLayer = svg.append("g").attr("class", "labels-layer");
      var axisLayer = svg.append("g").attr("class", "axis-layer").attr("transform", "translate(" + labelColumnWidth + "," + axisHeaderH + ")");
      var overlayLayer = svg.append("g").attr("class", "overlay-layer").attr("transform", "translate(" + labelColumnWidth + ",0)");

      // TIME AXIS HEADER
      var timeInterval = d3.timeMonth.every(1);
      var tickFormat = d3.timeFormat("%b %Y");
      var intervalSetting = config.time_scale || "auto";

      if (intervalSetting === "day") {
        timeInterval = d3.timeDay.every(1);
        tickFormat = d3.timeFormat("%b %d");
      } else if (intervalSetting === "week") {
        timeInterval = d3.timeWeek.every(1);
        tickFormat = d3.timeFormat("W%U • %b %d");
      } else if (intervalSetting === "quarter") {
        timeInterval = d3.timeMonth.every(3);
        tickFormat = d3.timeFormat("Q%q %Y");
      } else {
        var daysDiff = (domainEnd - domainStart) / 86400000;
        if (daysDiff <= 30) {
          timeInterval = d3.timeDay.every(2);
          tickFormat = d3.timeFormat("%b %d");
        } else if (daysDiff <= 90) {
          timeInterval = d3.timeWeek.every(1);
          tickFormat = d3.timeFormat("%b %d");
        } else if (daysDiff <= 365) {
          timeInterval = d3.timeMonth.every(1);
          tickFormat = d3.timeFormat("%b %Y");
        } else {
          timeInterval = d3.timeMonth.every(3);
          tickFormat = d3.timeFormat("Q%q %Y");
        }
      }

      var axis = d3.axisTop(timeScale)
        .ticks(timeInterval)
        .tickFormat(tickFormat)
        .tickSize(config.show_gridlines !== false ? -(totalContentHeight - axisHeaderH) : -6);

      axisLayer.call(axis);

      axisLayer.select(".domain").attr("stroke", "#cbd5e1").attr("stroke-width", 1.5);
      axisLayer.selectAll(".tick line")
        .attr("stroke", config.show_gridlines !== false ? "#f1f5f9" : "#cbd5e1")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", config.show_gridlines !== false ? "3,3" : "none");

      axisLayer.selectAll(".tick text")
        .attr("fill", "#475569")
        .attr("font-size", 10.5)
        .attr("font-weight", 600)
        .attr("dy", -8);

      // Label Column Header Background
      svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", labelColumnWidth)
        .attr("height", axisHeaderH)
        .attr("fill", isGlass ? "#f1f5f9" : "#f8fafc")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1);

      svg.append("text")
        .attr("x", 16)
        .attr("y", axisHeaderH / 2 + 4)
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .attr("fill", "#475569")
        .attr("letter-spacing", "0.5px")
        .text("DELIVERABLE / TASK");

      svg.append("text")
        .attr("x", labelColumnWidth - 14)
        .attr("y", axisHeaderH / 2 + 4)
        .attr("text-anchor", "end")
        .attr("font-size", 10.5)
        .attr("font-weight", 600)
        .attr("fill", "#64748b")
        .text("STATUS");

      // RENDER SWIMLANES AND TASKS
      var currentY = axisHeaderH;
      var cornerRadius = config.bar_corner_radius !== undefined ? parseInt(config.bar_corner_radius, 10) : 5;

      swimlanes.forEach(function (lane) {
        var isCollapsed = self._collapsedSwimlanes[lane.name];

        if (groupBySwimlane) {
          var laneHeaderG = rowsLayer.append("g")
            .attr("class", "swimlane-header")
            .style("cursor", "pointer")
            .on("click", function () {
              self._collapsedSwimlanes[lane.name] = !self._collapsedSwimlanes[lane.name];
              self.render(data, config, queryResponse);
            });

          laneHeaderG.append("rect")
            .attr("x", 0)
            .attr("y", currentY)
            .attr("width", chartWidth)
            .attr("height", swimlaneHeaderH)
            .attr("fill", isGlass ? "rgba(241,245,249,0.9)" : "#f1f5f9")
            .attr("stroke", "#e2e8f0");

          var toggleIcon = isCollapsed ? "▶" : "▼";
          var laneAvgProgress = Math.round(d3.mean(lane.tasks, function (t) { return t.progress; }) || 0);

          laneHeaderG.append("text")
            .attr("x", 12)
            .attr("y", currentY + swimlaneHeaderH / 2 + 4)
            .attr("font-size", 11.5)
            .attr("font-weight", 700)
            .attr("fill", "#0f172a")
            .text(toggleIcon + "  " + lane.name);

          laneHeaderG.append("text")
            .attr("x", labelColumnWidth - 12)
            .attr("y", currentY + swimlaneHeaderH / 2 + 4)
            .attr("text-anchor", "end")
            .attr("font-size", 10.5)
            .attr("font-weight", 700)
            .attr("fill", palette.primary)
            .text(lane.tasks.length + " items • " + laneAvgProgress + "%");

          currentY += swimlaneHeaderH;
        }

        if (isCollapsed) return;

        lane.tasks.forEach(function (task, taskIdx) {
          var rowY = currentY;
          var barY = rowY + (rowH - barH) / 2;

          rowsLayer.append("rect")
            .attr("x", 0)
            .attr("y", rowY)
            .attr("width", chartWidth)
            .attr("height", rowH)
            .attr("fill", taskIdx % 2 === 0 ? "#ffffff" : "#f8fafc")
            .attr("stroke", "#f1f5f9")
            .attr("stroke-width", 0.6);

          // Left Column Task Label + Status Pill
          var labelG = labelsLayer.append("g")
            .attr("class", "task-label-group")
            .style("cursor", task.drillLinks && task.drillLinks.length ? "pointer" : "default")
            .on("click", function (e) {
              if (task.drillLinks && task.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: task.drillLinks, event: e });
              }
            });

          var statusKey = task.status.toLowerCase();
          var badgeColor = palette.status[statusKey] || palette.primary;
          var maxChars = Math.max(18, Math.floor((labelColumnWidth - 88) / 6.3));
          var cleanTaskName = task.name.replace(" [Milestone]", "");
          var displayName = cleanTaskName.length > maxChars ? cleanTaskName.substring(0, maxChars - 1) + "…" : cleanTaskName;

          var labelText = labelG.append("text")
            .attr("x", 16)
            .attr("y", rowY + rowH / 2 + 4)
            .attr("font-size", config.font_scale === "compact" ? 10.5 : (config.font_scale === "large" ? 13 : 11.5))
            .attr("font-weight", task.isMilestone ? 700 : 600)
            .attr("fill", task.isMilestone ? palette.milestone : "#1e293b")
            .text((task.isMilestone ? "◆ " : "") + displayName);

          if (task.isAnomaly) {
            labelText.attr("fill", palette.danger);
            labelG.append("text")
              .attr("x", labelColumnWidth - 76)
              .attr("y", rowY + rowH / 2 + 4)
              .attr("font-size", 11)
              .text("⚠️");
          }

          var shortStatus = task.isMilestone ? "MILESTONE" :
                            (statusKey.indexOf("progress") !== -1 ? task.progress + "%" :
                            (statusKey.indexOf("complete") !== -1 ? "DONE" :
                            (statusKey.indexOf("delay") !== -1 ? "DELAYED" : "PLANNED")));

          labelG.append("rect")
            .attr("x", labelColumnWidth - 68)
            .attr("y", rowY + (rowH - 17) / 2)
            .attr("width", 58)
            .attr("height", 17)
            .attr("rx", 8.5)
            .attr("fill", badgeColor)
            .attr("opacity", 0.92);

          labelG.append("text")
            .attr("x", labelColumnWidth - 39)
            .attr("y", rowY + rowH / 2 + 3.5)
            .attr("text-anchor", "middle")
            .attr("font-size", 9)
            .attr("font-weight", 800)
            .attr("fill", "#ffffff")
            .text(shortStatus);

          // TIMELINE BAR RENDERING
          var barStartX = timeScale(task.startDate);
          var barEndX = timeScale(task.endDate);
          var barWidth = Math.max(3, barEndX - barStartX);

          var taskBarG = barsLayer.append("g")
            .attr("class", "task-bar-group")
            .style("cursor", "pointer")
            .on("mouseenter", function (e) { self.showTooltip(e, task); })
            .on("mousemove", function (e) { self.moveTooltip(e); })
            .on("mouseleave", function () { self.hideTooltip(); })
            .on("click", function (e) {
              if (task.drillLinks && task.drillLinks.length && window.LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({ links: task.drillLinks, event: e });
              }
            });

          // MODE A: MILESTONE PIN
          if (task.isMilestone && config.show_milestones !== false) {
            var pinX = barStartX;
            var pinY = rowY + rowH / 2;

            taskBarG.append("line")
              .attr("x1", pinX)
              .attr("x2", pinX)
              .attr("y1", rowY + 3)
              .attr("y2", rowY + rowH - 3)
              .attr("stroke", palette.milestone)
              .attr("stroke-width", 2)
              .attr("stroke-dasharray", "2,2");

            var diamondSize = 11;
            var dPath = "M " + pinX + " " + (pinY - diamondSize) +
                        " L " + (pinX + diamondSize) + " " + pinY +
                        " L " + pinX + " " + (pinY + diamondSize) +
                        " L " + (pinX - diamondSize) + " " + pinY + " Z";

            taskBarG.append("path")
              .attr("d", dPath)
              .attr("fill", palette.milestone)
              .attr("stroke", "#ffffff")
              .attr("stroke-width", 2)
              .attr("filter", "url(#gantt-shadow)");

            if (config.label_density !== "hidden") {
              taskBarG.append("text")
                .attr("x", pinX + diamondSize + 6)
                .attr("y", pinY + 3.5)
                .attr("font-size", 10.5)
                .attr("font-weight", 700)
                .attr("fill", palette.milestone)
                .text(cleanTaskName);
            }
          }
          // MODE B: GANTT DURATION BARS
          else {
            var barFillColor = palette.primary;
            if (config.layout_mode === "metric_heatmap" && metricColorScale) {
              barFillColor = metricColorScale(task.metricVal);
            } else if (config.layout_mode === "swimlane_phases") {
              var sIdx = Math.abs(task.group.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % palette.ramp.length;
              barFillColor = palette.ramp[sIdx];
            } else if (statusKey.indexOf("complete") !== -1 || task.progress >= 100) {
              barFillColor = palette.secondary;
            } else if (statusKey.indexOf("delay") !== -1 || statusKey.indexOf("block") !== -1) {
              barFillColor = palette.danger;
            }

            // Background Bar Track
            taskBarG.append("rect")
              .attr("x", barStartX)
              .attr("y", barY)
              .attr("width", barWidth)
              .attr("height", barH)
              .attr("rx", cornerRadius)
              .attr("fill", barFillColor)
              .attr("opacity", config.layout_mode === "gantt_progress" ? 0.28 : 0.92)
              .attr("stroke", barFillColor)
              .attr("stroke-width", 1)
              .attr("filter", "url(#gantt-shadow)");

            // Internal Progress Fill
            if (config.layout_mode === "gantt_progress" && task.progress > 0) {
              var progressWidth = Math.max(2, (barWidth * task.progress) / 100);
              taskBarG.append("rect")
                .attr("x", barStartX)
                .attr("y", barY)
                .attr("width", progressWidth)
                .attr("height", barH)
                .attr("rx", cornerRadius)
                .attr("fill", barFillColor)
                .attr("opacity", 0.95);
            }

            // Task Bar Inline Text
            if (config.label_density === "all" || (config.label_density === "peaks" && task.durationDays > 14)) {
              var barText = cleanTaskName + " (" + task.durationDays + "d)";
              if (barWidth > 75) {
                taskBarG.append("text")
                  .attr("x", barStartX + 8)
                  .attr("y", barY + barH / 2 + 3.5)
                  .attr("font-size", 10.5)
                  .attr("font-weight", 600)
                  .attr("fill", config.layout_mode === "gantt_progress" && task.progress < 40 ? "#0f172a" : "#ffffff")
                  .text(barText);
              } else {
                taskBarG.append("text")
                  .attr("x", barStartX + barWidth + 6)
                  .attr("y", barY + barH / 2 + 3.5)
                  .attr("font-size", 10)
                  .attr("font-weight", 600)
                  .attr("fill", "#475569")
                  .text(barText);
              }
            }
          }

          currentY += rowH;
        });
      });

      // TODAY LINE
      if (config.show_today_line !== false) {
        var today = new Date();
        var todayX = timeScale(today);
        if (todayX >= 0 && todayX <= timelineWidth) {
          overlayLayer.append("line")
            .attr("x1", todayX)
            .attr("x2", todayX)
            .attr("y1", axisHeaderH)
            .attr("y2", totalContentHeight)
            .attr("stroke", "#ea4335")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,3");

          overlayLayer.append("rect")
            .attr("x", todayX - 24)
            .attr("y", axisHeaderH - 18)
            .attr("width", 48)
            .attr("height", 16)
            .attr("rx", 4)
            .attr("fill", "#ea4335");

          overlayLayer.append("text")
            .attr("x", todayX)
            .attr("y", axisHeaderH - 6)
            .attr("text-anchor", "middle")
            .attr("font-size", 9.5)
            .attr("font-weight", 800)
            .attr("fill", "#ffffff")
            .text("TODAY");
        }
      }

      svg.attr("height", Math.max(container.clientHeight, currentY + 24));
    },

    showTooltip: function (e, task) {
      var tooltip = this._tooltip;
      var formatDate = d3.timeFormat("%b %d, %Y");

      var html =
        "<div style='font-size: 13px; font-weight: 700; margin-bottom: 6px; color: #93c5fd; display: flex; justify-content: space-between; align-items: center; gap: 8px;'>" +
          "<span>" + (task.isMilestone ? "◆ " : "") + task.name + "</span>" +
          "<span style='font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; background: rgba(255,255,255,0.16); color: #fff; flex-shrink:0;'>" + task.status + "</span>" +
        "</div>" +
        "<div style='font-size: 11px; color: #cbd5e1; margin-bottom: 6px; font-weight: 500;'>" + task.group + "</div>" +
        "<div style='display: grid; grid-template-columns: auto auto; gap: 4px 14px; margin-bottom: 6px; font-size: 11.5px;'>" +
          "<span style='color: #94a3b8;'>Schedule Window:</span><span style='font-weight: 600;'>" + formatDate(task.startDate) + (task.isMilestone ? " (Milestone)" : " → " + formatDate(task.endDate)) + "</span>" +
          "<span style='color: #94a3b8;'>Duration:</span><span style='font-weight: 600;'>" + (task.isMilestone ? "Zero-Duration Milestone Pin" : task.durationDays + " Calendar Days") + "</span>" +
          "<span style='color: #94a3b8;'>Completion:</span><span style='font-weight: 700; color: #4ade80;'>" + task.progress + "% Complete</span>";

      if (task.owner) {
        html += "<span style='color: #94a3b8;'>Program Owner:</span><span style='font-weight: 600;'>" + task.owner + (task.priority ? " (" + task.priority + ")" : "") + "</span>";
      }
      if (task.metricRendered) {
        html += "<span style='color: #94a3b8;'>" + task.metricLabel + ":</span><span style='font-weight: 700; color: #fde047;'>" + task.metricRendered + "</span>";
      }

      html += "</div>";

      if (task.isAnomaly) {
        html += "<div style='font-size: 10.5px; color: #f87171; background: rgba(239,68,68,0.15); border-left: 3px solid #ef4444; padding: 4px 8px; margin-top: 5px; font-weight: 600;'>" +
          "⚠️ High Anomaly Variance: Exceeds Statistical Threshold or Has Schedule Risk</div>";
      }

      if (task.drillLinks && task.drillLinks.length) {
        html += "<div style='font-size: 10.5px; color: #93c5fd; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 5px; margin-top: 4px; font-weight: 600;'>" +
          "🔎 Click bar to open Looker Drill Menu (" + task.drillLinks.length + " drill paths)</div>";
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
